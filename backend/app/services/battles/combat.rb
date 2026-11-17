module Battles
  class Combat
    BLAST_RADIUS = { "small" => 1, "medium" => 2, "large" => 3, "cone" => 2 }.freeze
    CONE_LENGTH = 9
    INJURIES = {
      2 => "unmentionables",
      3 => "arm", 4 => "arm",
      5 => "guts", 6 => "guts", 7 => "guts", 8 => "guts", 9 => "guts",
      10 => "leg",
      11 => "head", 12 => "head"
    }.freeze
    GUTS = { 1 => "broken", 2 => "broken", 3 => "battered", 4 => "battered", 5 => "busted", 6 => "busted" }.freeze
    HEAD = { 1 => "hideous_scar", 2 => "hideous_scar", 3 => "blinded", 4 => "blinded", 5 => "brain_damage", 6 => "brain_damage" }.freeze

    def initialize(engine)
      @engine = engine
    end

    def dice
      @engine.dice
    end

    def attack(attacker, target, weapon, mode:, penalty: 0, wild_attack: false, called_head: false, free: false)
      return unless attacker.active? && target.active?

      skill = attack_skill(weapon, mode)
      die = attacker.skill_or_unskilled(skill)
      modifiers = base_modifiers(attacker, penalty)
      modifiers << [ "trademark_weapon", attacker.weapon_modifiers(weapon)["attack"] ]
      target_number, situational = mode == :melee ? melee_target(attacker, target, weapon, wild_attack) : ranged_target(attacker, target, weapon)
      modifiers.concat(situational)
      modifiers << [ "called_shot_head", -4 ] if called_head
      modifiers << [ "vulnerable_target", 2 ] if target.vulnerable?
      modifiers << [ "scale", target.scale - attacker.scale ]
      modifiers.reject! { |(_, value)| value.zero? }

      count = attack_dice(attacker, weapon, mode, free)
      modifiers << [ "recoil", -2 ] if mode == :ranged && count > 1
      total_modifier = modifiers.sum(&:last)

      roll = dice.trait(die, wild_card: attacker.wild_card?, modifier: total_modifier, count: count)
      wanted = roll.best < target_number && @engine.tactics.reroll_attack?(attacker, target)
      roll, rerolled = reroll_if(attacker, roll, wanted) do
        dice.trait(die, wild_card: attacker.wild_card?, modifier: total_modifier + elan_bonus(attacker), count: count)
      end

      hits = roll.critical_failure ? [] : roll.totals.select { |total| total >= target_number }
      @engine.emit(
        :attack,
        actor: attacker.id,
        target: target.id,
        weapon: weapon.name,
        skill: skill,
        mode: mode,
        free: free,
        wild_attack: wild_attack,
        roll: roll.as_json,
        modifiers: modifiers.map { |(label, value)| { label: label, value: value } },
        target_number: target_number,
        rerolled: rerolled,
        outcome: roll.critical_failure ? "critical_failure" : hits.empty? ? "miss" : hits.any? { |hit| hit >= target_number + 4 } ? "raise" : "hit",
        hits: hits.length
      )

      if hits.empty?
        handle_miss(attacker, target, weapon, mode, roll)
        return
      end

      if weapon.blast && mode == :ranged
        area_damage(attacker, target, weapon, raise: hits.max >= target_number + 4)
        return
      end

      hits.each do |total|
        victim = target.active? ? target : next_target(attacker, target, mode)
        break unless victim

        damage(attacker, victim, weapon, raise: total >= target_number + 4, wild_attack: wild_attack, called_head: called_head)
      end
    end

    def sweep(attacker, targets, weapon)
      improved = attacker.edge?("improved-sweep")
      modifiers = base_modifiers(attacker, 0)
      modifiers << [ "sweep", -2 ] unless improved
      modifiers << [ "trademark_weapon", attacker.weapon_modifiers(weapon)["attack"] ]
      modifiers.reject! { |(_, value)| value.zero? }
      roll = dice.trait(attacker.skill_or_unskilled("fighting"), wild_card: attacker.wild_card?, modifier: modifiers.sum(&:last))

      @engine.emit(
        :sweep,
        actor: attacker.id,
        targets: targets.map(&:id),
        weapon: weapon.name,
        roll: roll.as_json,
        modifiers: modifiers.map { |(label, value)| { label: label, value: value } }
      )
      return if roll.critical_failure

      targets.each do |target|
        next unless target.active?

        target_number = target.parry
        next if roll.best < target_number

        damage(attacker, target, weapon, raise: roll.best >= target_number + 4, wild_attack: false, called_head: false)
      end
    end

    def test(attacker, target, skill)
      attribute = skill == "intimidation" ? "spirit" : "smarts"
      if skill == "intimidation" && target.ability?("fearless")
        @engine.emit(:test, actor: attacker.id, target: target.id, skill: skill, outcome: "immune")
        return
      end

      skill_die = attacker.skill_or_unskilled(skill)
      modifier = base_modifiers(attacker, 0).sum(&:last)
      roll = dice.trait(skill_die, wild_card: attacker.wild_card?, modifier: modifier)
      resist = dice.trait(target.attribute(attribute), wild_card: target.wild_card?, modifier: target.trait_penalty)
      wanted = (roll.best < 4 || roll.best <= resist.best) && @engine.tactics.reroll_test?(attacker)
      roll, rerolled = reroll_if(attacker, roll, wanted) do
        dice.trait(skill_die, wild_card: attacker.wild_card?, modifier: modifier + elan_bonus(attacker))
      end
      outcome =
        if roll.critical_failure || roll.best < 4 || roll.best <= resist.best
          "failure"
        elsif roll.best >= resist.best + 4
          "raise"
        else
          "success"
        end

      if outcome != "failure"
        @engine.apply_condition(target, :vulnerable)
        target.shaken = true if outcome == "raise"
      end

      @engine.emit(:test, actor: attacker.id, target: target.id, skill: skill, roll: roll.as_json, resist: resist.as_json, outcome: outcome, rerolled: rerolled)
    end

    def damage(attacker, target, weapon, raise:, wild_attack:, called_head:, label: nil)
      sides, modifier = damage_dice(attacker, weapon)
      sides << 6 if raise
      modifier += 2 if attacker.card&.joker?
      modifier += 2 if wild_attack
      modifier += 4 if called_head && !target.ignores_called_shots?
      modifier += attacker.weapon_modifiers(weapon)["damage"]
      roll = dice.damage(sides, modifier: modifier)
      toughness = target.toughness(weapon.ap) + @engine.toughness_aura(target)
      rerolled = false
      if roll.total < toughness + 4 && @engine.tactics.reroll_damage?(attacker, target) && @engine.spend_benny(attacker)
        rerolled = true
        reroll = dice.damage(sides, modifier: modifier + (attacker.edge?("no-mercy") ? 2 : 0))
        roll = reroll if reroll.total > roll.total
      end
      event = @engine.emit(
        :damage,
        actor: attacker&.id,
        target: target.id,
        weapon: label || weapon.name,
        roll: roll.as_json,
        raise_bonus: raise,
        armor_piercing: weapon.ap,
        toughness: toughness,
        rerolled: rerolled
      )
      outcome = apply_damage(target, roll.total, toughness)
      event&.merge!(
        outcome: outcome[:result],
        wounds: outcome[:wounds],
        target_wounds: target.wounds,
        incapacitated: target.incapacitated
      )
      outcome
    end

    def apply_damage(target, total, toughness)
      return { result: "no_effect", wounds: 0 } if total < toughness

      wounds = (total - toughness) / 4
      if wounds.zero?
        if !target.shaken || target.ability?("hardy")
          target.shaken = true
          return { result: "shaken", wounds: 0 }
        end

        wounds = 1
      end

      remaining = soak(target, wounds)
      return { result: "soaked", wounds: 0 } if remaining.zero?

      target.shaken = true
      inflict_wounds(target, remaining)
      { result: target.incapacitated ? "incapacitated" : "wounded", wounds: remaining }
    end

    def reroll_if(combatant, roll, wanted)
      return [ roll, false ] if roll.critical_failure || !wanted || !@engine.spend_benny(combatant)

      reroll = yield
      [ reroll.best > roll.best && !reroll.critical_failure ? reroll : roll, true ]
    end

    def bleed(combatant)
      roll, rerolled = survival_roll(combatant)
      outcome =
        if roll.critical_failure || roll.best < 4
          die_or_survive(combatant) ? "dead" : "survived"
        elsif roll.best >= 8
          combatant.bleeding_out = false
          "stabilized"
        else
          "bleeding"
        end
      @engine.emit(:bleeding_out, actor: combatant.id, roll: roll.as_json, outcome: outcome, rerolled: rerolled)
    end

    private

    def survival_roll(combatant)
      roll_vigor = -> { dice.trait(combatant.attribute("vigor"), wild_card: combatant.wild_card?, modifier: survival_modifier(combatant)) }
      roll = roll_vigor.call
      wanted = roll.best < 4 && @engine.tactics.reroll_survival?(combatant)
      reroll_if(combatant, roll, wanted) { roll_vigor.call }
    end

    def elan_bonus(combatant)
      combatant.edge?("elan") ? 2 : 0
    end

    def attack_skill(weapon, mode)
      return "fighting" if mode == :melee
      return "athletics" if weapon.thrown?

      weapon.attack_skill == "fighting" ? "shooting" : weapon.attack_skill
    end

    def base_modifiers(attacker, penalty)
      [
        [ "wounds", attacker.wound_penalty ],
        [ "fatigue", attacker.fatigue_penalty ],
        [ "distracted", attacker.distracted? ? -2 : 0 ],
        [ "joker", attacker.card&.joker? ? 2 : 0 ],
        [ "multi_action", penalty ],
        [ "illumination", @engine.settings.illumination_modifier ]
      ]
    end

    def melee_target(attacker, target, weapon, wild_attack)
      modifiers = []
      modifiers << [ "wild_attack", 2 ] if wild_attack
      modifiers << [ "gang_up", @engine.gang_up(attacker, target) ]
      modifiers << [ "unarmed_defender", 2 ] if weapon.slug != "unarmed" && !target.armed?
      [ target.parry, modifiers ]
    end

    def ranged_target(attacker, target, weapon)
      distance = @engine.distance(attacker, target)
      return [ target.parry, [] ] if distance <= 1 && !weapon.thrown?

      modifiers = [ [ "range", range_modifier(weapon, distance) ] ]
      modifiers << [ "cover", @engine.settings.cover_modifier ]
      modifiers << [ "shield", -target.cover ]
      modifiers << [ "dodge", -2 ] if target.edge?("dodge")
      modifiers << [ "aim", 2 ] if attacker.edge?("marksman") && !attacker.moved && weapon.rof == 1
      modifiers << [ "minimum_strength", strength_shortfall(attacker, weapon) ]
      [ 4, modifiers ]
    end

    def range_modifier(weapon, distance)
      short, medium, = weapon.range || [ 1, 1, 1 ]
      return 0 if distance <= short
      return -2 if distance <= medium

      -4
    end

    def strength_shortfall(attacker, weapon)
      return 0 unless weapon.min_str

      required = TraitDie.parse(weapon.min_str).sides
      -[ (TraitDie::SIDES.index(required) - TraitDie::SIDES.index(attacker.strength.sides)), 0 ].max
    end

    def attack_dice(attacker, weapon, mode, free)
      return 1 if free
      return weapon.rof if mode == :ranged

      extra = 0
      extra += 1 if attacker.edge?("frenzy") || attacker.ability?("frenzy")
      extra += 1 if attacker.edge?("improved-frenzy")
      1 + extra
    end

    def handle_miss(attacker, target, weapon, mode, roll)
      if mode == :melee
        @engine.counterattack(target, attacker)
      elsif weapon.rof == 1 && roll.trait_rolls.first.first == 1
        bystanders = @engine.allies_of(attacker).select { |ally| ally.active? && @engine.adjacent?(ally, target) }
        return if bystanders.empty?

        bystander = bystanders.sample(random: @engine.rng)
        @engine.emit(:innocent_bystander, actor: attacker.id, target: bystander.id)
        damage(attacker, bystander, weapon, raise: false, wild_attack: false, called_head: false)
      end
    end

    def area_damage(attacker, target, weapon, raise:)
      radius = BLAST_RADIUS.fetch(weapon.blast)
      victims = @engine.combatants.select do |combatant|
        combatant.active? && (combatant.position - target.position).abs <= radius &&
          (weapon.blast != "cone" || @engine.distance(attacker, combatant) <= CONE_LENGTH)
      end
      @engine.emit(:area_effect, actor: attacker.id, template: weapon.blast, targets: victims.map(&:id))
      victims.each { |victim| damage(attacker, victim, weapon, raise: raise, wild_attack: false, called_head: false) }
    end

    def next_target(attacker, original, mode)
      candidates = @engine.foes_of(attacker).select(&:active?)
      if mode == :melee
        candidates.select! { |foe| @engine.adjacent?(attacker, foe) }
      else
        candidates.select! { |foe| (foe.position - original.position).abs <= 1 }
      end
      candidates.min_by { |foe| [ foe.parry, foe.id ] }
    end

    def damage_dice(attacker, weapon)
      expression = weapon.damage
      strength = attacker.strength
      cap = expression[:strength] ? strength.sides : nil
      if weapon.min_str && weapon.melee? && strength.sides < TraitDie.parse(weapon.min_str).sides
        cap = strength.sides
      end

      sides = expression[:dice].flat_map do |die|
        Array.new(die[:count], cap ? [ die[:sides], cap ].min : die[:sides])
      end
      modifier = expression[:modifier]
      if expression[:strength]
        sides.unshift(strength.sides)
        modifier += strength.modifier
      end
      [ sides, modifier ]
    end

    def soak(target, wounds)
      best_removed = 0
      attempts = 0
      while attempts < 2 && best_removed < wounds && @engine.tactics.soak?(target, wounds - best_removed) && @engine.spend_benny(target)
        attempts += 1
        modifier = target.wound_penalty + target.fatigue_penalty + (target.edge?("iron-jaw") ? 2 : 0)
        roll = dice.trait(target.attribute("vigor"), wild_card: target.wild_card?, modifier: modifier)
        removed = roll.critical_failure || roll.best < 4 ? 0 : 1 + ((roll.best - 4) / 4)
        best_removed = [ best_removed, removed ].max
        @engine.emit(:soak, actor: target.id, roll: roll.as_json, wounds: wounds, removed: [ best_removed, wounds ].min)
      end
      [ wounds - best_removed, 0 ].max
    end

    def inflict_wounds(target, wounds)
      target.wounds += wounds
      return if target.wounds <= target.max_wounds

      target.wounds = target.max_wounds
      incapacitate(target)
    end

    def incapacitate(target)
      target.incapacitated = true
      target.shaken = false
      target.stunned = false
      unless target.wild_card?
        @engine.emit(:incapacitated, actor: target.id, outcome: "out")
        @engine.after_incapacitation(target)
        return
      end

      roll, rerolled = survival_roll(target)
      outcome =
        if roll.critical_failure
          die_or_survive(target) ? "dead" : "bleeding_out"
        elsif roll.best < 4
          "bleeding_out"
        else
          "injured"
        end
      target.bleeding_out = true if outcome == "bleeding_out"
      injury = outcome == "dead" ? nil : roll_injury
      target.injuries << injury if injury
      @engine.emit(:incapacitated, actor: target.id, roll: roll.as_json, outcome: outcome, injury: injury, rerolled: rerolled)
      @engine.after_incapacitation(target)
    end

    def survival_modifier(combatant)
      combatant.edge?("hard-to-kill") ? combatant.fatigue_penalty : combatant.wound_penalty + combatant.fatigue_penalty
    end

    def die_or_survive(combatant)
      if combatant.edge?("harder-to-kill") && dice.roll(2) == 2
        combatant.bleeding_out = true
        return false
      end

      combatant.dead = true
      combatant.bleeding_out = false
      true
    end

    def roll_injury
      location = INJURIES.fetch(dice.roll(6) + dice.roll(6))
      case location
      when "guts" then "guts_#{GUTS.fetch(dice.roll(6))}"
      when "head" then "head_#{HEAD.fetch(dice.roll(6))}"
      else location
      end
    end
  end
end
