module Battles
  class Tactics
    TEST_SKILLS = %w[intimidation taunt].freeze
    TEST_RANGE = 12

    def initialize(engine)
      @engine = engine
    end

    def act(combatant)
      foes = @engine.foes_of(combatant).select(&:active?)
      return if foes.empty?

      adjacent = foes.select { |foe| @engine.adjacent?(combatant, foe, reach(combatant)) }
      return defend(combatant) if defend?(combatant, adjacent)
      return melee(combatant, adjacent) if adjacent.any?
      ranged = loaded_weapons(combatant)
      return ranged_turn(combatant, foes, ranged) if ranged.any?
      return if reload(combatant)

      advance(combatant, foes)
    end

    def reroll_attack?(attacker, target)
      return false unless @engine.bennies_available(attacker).positive?
      return true if attacker.card&.joker?
      return true if target.wild_card? && target.wounds >= target.max_wounds - 1

      @engine.bennies_available(attacker) >= 3
    end

    def soak?(target, wounds)
      return false unless @engine.bennies_available(target).positive?
      return true if target.wild_card?

      @engine.enemy_wild_cards_active.zero? && target.wounds + wounds > target.max_wounds
    end

    def unshake?(combatant)
      return false unless @engine.bennies_available(combatant).positive?

      combatant.wild_card? || @engine.gm_bennies > @engine.enemy_wild_cards_active
    end

    private

    def reach(combatant)
      combatant.melee_weapons.map(&:reach).max || 0
    end

    def defend?(combatant, adjacent)
      combatant.wild_card? && combatant.wounds >= 2 && adjacent.length >= 2 &&
        @engine.bennies_available(combatant).zero? && @engine.allies_of(combatant).none?(&:active?)
    end

    def defend(combatant)
      combatant.defending = true
      @engine.emit(:defend, actor: combatant.id)
    end

    def melee(combatant, adjacent, penalty: 0)
      weapons = combatant.melee_weapons.sort_by { |weapon| -average_damage(combatant, weapon) }
      weapon = weapons.first

      if adjacent.length >= 2 && (combatant.edge?("sweep") || combatant.edge?("improved-sweep")) && penalty.zero?
        @engine.combat.sweep(combatant, adjacent, weapon)
        return
      end

      target = choose_melee_target(adjacent)
      off_hand = weapons.find { |candidate| candidate != weapon && candidate.slug != "unarmed" && !candidate.two_handed? }
      if off_hand && !weapon.two_handed? && penalty.zero?
        two_weapon_attack(combatant, target, weapon, off_hand, adjacent)
        return
      end

      wild_attack = penalty.zero? && wild_attack?(combatant, adjacent)
      called_head = !wild_attack && called_shot?(combatant, target, weapon)
      @engine.combat.attack(combatant, target, weapon, mode: :melee, penalty: penalty, wild_attack: wild_attack, called_head: called_head)
      @engine.apply_condition(combatant, :vulnerable) if wild_attack
    end

    def two_weapon_attack(combatant, target, weapon, off_hand, adjacent)
      penalty = combatant.edge?("two-fisted") ? 0 : -2
      off_hand_penalty = penalty + (combatant.edge?("ambidextrous") ? 0 : -2)
      @engine.combat.attack(combatant, target, weapon, mode: :melee, penalty: penalty)
      second_target = target.active? ? target : choose_melee_target(adjacent.select(&:active?))
      return unless second_target

      @engine.combat.attack(combatant, second_target, off_hand, mode: :melee, penalty: off_hand_penalty)
    end

    def ranged_turn(combatant, foes, weapons)
      weapon = weapons.max_by { |candidate| [ candidate.range.last, average_damage(combatant, candidate) ] }
      in_range = foes.select { |foe| @engine.distance(combatant, foe) <= weapon.range.last }
      if in_range.empty?
        nearest = nearest_foe(combatant, foes)
        @engine.move_toward(combatant, nearest, combatant.pace, weapon.range.last)
        in_range = foes.select { |foe| foe.active? && @engine.distance(combatant, foe) <= weapon.range.last }
        return if in_range.empty?
      end

      target = choose_ranged_target(combatant, in_range)
      called_head = called_shot?(combatant, target, weapon) && weapon.rof == 1 && !weapon.blast
      @engine.combat.attack(combatant, target, weapon, mode: :ranged, called_head: called_head)
      consume_ammo(combatant, weapon)
    end

    def advance(combatant, foes)
      target = nearest_foe(combatant, foes)
      @engine.move_toward(combatant, target, combatant.pace, 1)
      return unless combatant.active?

      penalty = 0
      unless @engine.adjacent?(combatant, target) || !target.active?
        running = @engine.run_die(combatant)
        @engine.move_toward(combatant, target, running, 1, running: true)
        penalty = -2
      end
      return unless combatant.active?

      adjacent = @engine.foes_of(combatant).select { |foe| foe.active? && @engine.adjacent?(combatant, foe, reach(combatant)) }
      if adjacent.any?
        melee(combatant, adjacent, penalty: penalty)
      else
        test_from_range(combatant, foes, penalty)
      end
    end

    def test_from_range(combatant, foes, penalty)
      return unless penalty.zero?

      skill = TEST_SKILLS.select { |slug| combatant.skill(slug) }.max_by { |slug| combatant.skill(slug).sides }
      return unless skill && combatant.skill(skill).sides >= 6

      targets = foes.select { |foe| foe.active? && @engine.distance(combatant, foe) <= TEST_RANGE }
      targets.reject! { |foe| skill == "intimidation" && foe.ability?("fearless") }
      return if targets.empty?

      @engine.combat.test(combatant, targets.min_by { |foe| [ @engine.distance(combatant, foe), foe.id ] }, skill)
    end

    def loaded_weapons(combatant)
      combatant.ranged_weapons.reject { |weapon| @engine.ammo(combatant, weapon)&.zero? }
    end

    def reload(combatant)
      weapon = combatant.ranged_weapons.find { |candidate| @engine.ammo(combatant, candidate)&.zero? }
      return false unless weapon

      @engine.reload(combatant, weapon)
      true
    end

    def consume_ammo(combatant, weapon)
      combatant.thrown_weapons << weapon.slug if weapon.thrown?
      @engine.use_ammo(combatant, weapon)
    end

    def wild_attack?(combatant, adjacent)
      adjacent.length == 1 && combatant.wounds < 2 && !combatant.vulnerable?
    end

    def called_shot?(combatant, target, weapon)
      return false if target.ignores_called_shots?
      return false unless combatant.skill_or_unskilled(weapon.melee? ? "fighting" : "shooting").sides >= 10

      average_damage(combatant, weapon) + 4 <= target.toughness(weapon.ap) + 2 &&
        average_damage(combatant, weapon) < target.toughness(weapon.ap)
    end

    def average_damage(combatant, weapon)
      damage = weapon.damage
      dice = damage[:dice].sum { |die| die[:count] * ((die[:sides] / 2.0) + 0.5) }
      strength = damage[:strength] ? (combatant.strength.sides / 2.0) + 0.5 + combatant.strength.modifier : 0
      dice + strength + damage[:modifier] + combatant.weapon_modifiers(weapon)["damage"]
    end

    def choose_melee_target(foes)
      foes.min_by do |foe|
        [ foe.shaken || foe.vulnerable? ? 0 : 1, -foe.wounds, foe.parry, foe.toughness, foe.id ]
      end
    end

    def choose_ranged_target(combatant, foes)
      foes.min_by do |foe|
        [ foe.shaken || foe.vulnerable? ? 0 : 1, foe.toughness, @engine.distance(combatant, foe), foe.id ]
      end
    end

    def nearest_foe(combatant, foes)
      foes.min_by { |foe| [ @engine.distance(combatant, foe), -foe.wounds, foe.id ] }
    end
  end
end
