module Battles
  class Engine
    SIDES = %w[party enemies].freeze

    Result = Struct.new(:winner, :rounds, :combatants, :log, keyword_init: true)

    attr_reader :combatants, :dice, :rng, :settings, :round, :combat, :tactics, :gm_bennies

    def initialize(definitions:, settings:, seed:, record: true)
      @rng = Random.new(seed)
      @dice = Dice.new(@rng)
      @deck = ActionDeck.new(@rng)
      @settings = settings.is_a?(Settings) ? settings : Settings.new(settings)
      @combatants = definitions.map { |definition| Combatant.new(definition) }
      @log = record ? [] : nil
      @gm_bennies = party.count(&:wild_card?)
      @combat = Combat.new(self)
      @tactics = Tactics.new(self)
      @ammo = {}
      @morale_checked = false
      @round = 0
      place_combatants
    end

    def run
      emit(:battle_start, positions: combatants.to_h { |combatant| [ combatant.id, combatant.position ] }, gm_bennies: gm_bennies)
      winner = nil

      (1..settings["max_rounds"]).each do |round|
        @round = round
        emit(:round_start)
        combatants.each do |combatant|
          combatant.first_strike_used = false
          combatant.counterattack_used = false
        end
        combatants.select { |combatant| combatant.bleeding_out && !combatant.dead }.each { |combatant| combat.bleed(combatant) }

        deal_initiative.each do |members|
          members.each do |combatant|
            take_turn(combatant) if combatant.active?
            winner = decide_winner
            break if winner
          end
          break if winner
        end

        @deck.end_round
        break if winner
      end

      winner ||= "draw"
      emit(:battle_end, winner: winner)
      Result.new(winner: winner, rounds: @round, combatants: combatants.map(&:summary), log: @log)
    end

    def emit(type, **data)
      return unless @log

      event = { type: type.to_s, round: @round }.merge(data)
      @log << event
      event
    end

    def party
      combatants.select { |combatant| combatant.side == "party" }
    end

    def foes_of(combatant)
      combatants.reject { |other| other.side == combatant.side }
    end

    def allies_of(combatant)
      combatants.select { |other| other.side == combatant.side && other != combatant }
    end

    def distance(first, second)
      (first.position - second.position).abs
    end

    def adjacent?(first, second, reach = 0)
      distance(first, second) <= 1 + reach
    end

    def gang_up(attacker, target)
      attackers = allies_of(attacker).count { |ally| ally.active? && !ally.stunned && adjacent?(ally, target) }
      defenders = allies_of(target).count { |ally| ally.active? && !ally.stunned && adjacent?(ally, attacker) }
      reduction = target.edge?("improved-block") ? 2 : target.edge?("block") ? 1 : 0
      ([ attackers, 4 ].min - defenders - reduction).clamp(0, 4)
    end

    def toughness_aura(target)
      return 0 if target.wild_card?

      allies_of(target).any? { |ally| ally.active? && ally.edge?("hold-the-line") } ? 1 : 0
    end

    def apply_condition(target, condition)
      duration = @current_actor == target ? 2 : 1
      target.public_send(:"#{condition}=", [ target.public_send(condition), duration ].max)
    end

    def bennies_available(combatant)
      combatant.bennies + (combatant.side == "enemies" ? gm_bennies : 0)
    end

    def spend_benny(combatant)
      if combatant.bennies.positive?
        combatant.bennies -= 1
      elsif combatant.side == "enemies" && gm_bennies.positive?
        @gm_bennies -= 1
      else
        return false
      end

      combatant.bennies_spent += 1
      emit(:benny, actor: combatant.id)
      true
    end

    def enemy_wild_cards_active
      combatants.count { |combatant| combatant.side == "enemies" && combatant.wild_card? && combatant.active? }
    end

    def counterattack(defender, attacker)
      return unless defender.threatens? && defender.edge?("counterattack") && !defender.counterattack_used

      defender.counterattack_used = true
      combat.attack(defender, attacker, defender.melee_weapons.first, mode: :melee, free: true)
    end

    def after_incapacitation(_combatant)
      check_morale if settings["morale"]
    end

    def run_die(combatant)
      sides = combatant.edge?("fleet-footed") ? 8 : 6
      sides = 4 if combatant.hindrance?("obese") || combatant.hindrance?("slow")
      roll = dice.roll(sides)
      emit(:run, actor: combatant.id, die: "d#{sides}", roll: roll)
      roll
    end

    def move_toward(combatant, target, budget, gap, running: false)
      needed = distance(combatant, target) - gap
      return 0 if needed <= 0 || budget <= 0

      step = [ needed, budget ].min
      direction = target.position > combatant.position ? 1 : -1
      engaged = foes_of(combatant).select { |foe| foe.threatens? && adjacent?(combatant, foe) }
      from = combatant.position
      combatant.position += step * direction
      combatant.moved = true
      emit(:move, actor: combatant.id, from: from, to: combatant.position, running: running)

      engaged.reject { |foe| adjacent?(combatant, foe) }.each do |foe|
        emit(:withdraw, actor: combatant.id, target: foe.id)
        combat.attack(foe, combatant, foe.melee_weapons.first, mode: :melee, free: true)
      end
      first_strike(combatant, engaged)
      step
    end

    def ammo(combatant, weapon)
      return nil unless weapon.shots

      @ammo.dig(combatant.id, weapon.slug) || weapon.shots
    end

    def use_ammo(combatant, weapon)
      return unless weapon.shots

      (@ammo[combatant.id] ||= {})[weapon.slug] = [ ammo(combatant, weapon) - weapon.rof, 0 ].max
    end

    def reload(combatant, weapon)
      (@ammo[combatant.id] ||= {})[weapon.slug] = weapon.shots
      emit(:reload, actor: combatant.id, weapon: weapon.name)
    end

    private

    def place_combatants
      combatants.each do |combatant|
        combatant.position = combatant.side == "party" ? 0 : settings["starting_distance"]
      end
    end

    def deal_initiative
      groups = combatants.select(&:active?).group_by(&:group).values
      dealt = groups.map do |members|
        card = draw_card(members.first)
        card = benny_redraw(members.first, card) if members.length == 1
        members.each { |member| member.card = card }
        award_joker_bennies(members.first) if card.joker?
        [ card, members ]
      end.sort_by { |card, _| -card.value }

      emit(:initiative, cards: dealt.map { |card, members| { card: card.as_json, combatants: members.map(&:id) } })
      dealt.map(&:last)
    end

    def draw_card(combatant)
      draws = 1
      draws = 2 if combatant.edge?("level-headed") || combatant.ability?("level_headed")
      draws = 3 if combatant.edge?("improved-level-headed")
      cards = Array.new(draws) { quick_draw(combatant) }
      if combatant.hindrance?("hesitant") && draws == 1
        cards << quick_draw(combatant)
        return cards.find(&:joker?) || cards.min
      end

      cards.max
    end

    def benny_redraw(combatant, card)
      return card unless tactics.redraw_initiative?(combatant, card) && spend_benny(combatant)

      new_card = @deck.deal
      emit(:initiative_redraw, actor: combatant.id, from: card.as_json, to: new_card.as_json)
      [ card, new_card ].max
    end

    def quick_draw(combatant)
      card = @deck.deal
      while combatant.edge?("quick") && !card.joker? && card.rank <= 5
        emit(:quick_redraw, actor: combatant.id, card: card.as_json)
        card = @deck.deal
      end
      card
    end

    def award_joker_bennies(combatant)
      if combatant.side == "party"
        party.select { |member| member.wild_card? && member.active? }.each { |member| member.bennies += 1 }
      else
        @gm_bennies += 1
      end
      emit(:joker, actor: combatant.id, side: combatant.side)
    end

    def take_turn(combatant)
      @current_actor = combatant
      combatant.defending = false
      combatant.moved = false
      emit(:turn_start, actor: combatant.id, card: combatant.card&.label)

      if recover(combatant)
        tactics.act(combatant) if combatant.active?
      end

      combatant.distracted -= 1 if combatant.distracted.positive?
      combatant.vulnerable -= 1 if combatant.vulnerable.positive?
      @current_actor = nil
    end

    def recover(combatant)
      if combatant.stunned
        roll_vigor = -> { dice.trait(combatant.attribute("vigor"), wild_card: combatant.wild_card?, modifier: recovery_bonus(combatant) + combatant.trait_penalty) }
        roll = roll_vigor.call
        roll, rerolled = combat.reroll_if(combatant, roll, roll.best < 4 && tactics.reroll_recovery?(combatant)) { roll_vigor.call }
        if roll.best >= 4 && !roll.critical_failure
          combatant.stunned = false
          if roll.best >= 8
            combatant.distracted = 0
            combatant.vulnerable = 0
          end
        end
        emit(:recover, actor: combatant.id, condition: "stunned", roll: roll.as_json, recovered: !combatant.stunned, rerolled: rerolled)
        return false if combatant.stunned
      end

      return true unless combatant.shaken

      roll = dice.trait(combatant.attribute("spirit"), wild_card: combatant.wild_card?, modifier: recovery_bonus(combatant) + combatant.trait_penalty)
      if roll.best >= 4 && !roll.critical_failure
        combatant.shaken = false
        emit(:recover, actor: combatant.id, condition: "shaken", roll: roll.as_json, recovered: true)
        return true
      end

      if tactics.unshake?(combatant) && spend_benny(combatant)
        combatant.shaken = false
        emit(:recover, actor: combatant.id, condition: "shaken", roll: roll.as_json, recovered: true, benny: true)
        return true
      end

      emit(:recover, actor: combatant.id, condition: "shaken", roll: roll.as_json, recovered: false)
      false
    end

    def recovery_bonus(combatant)
      bonus = 0
      bonus += 2 if combatant.edge?("combat-reflexes")
      bonus += 2 if combatant.ability?("undead") || combatant.ability?("construct")
      if !combatant.wild_card? && allies_of(combatant).any? { |ally| ally.active? && ally.edge?("command") }
        bonus += 1
      end
      bonus
    end

    def first_strike(mover, previously_engaged)
      foes_of(mover).each do |foe|
        next if previously_engaged.include?(foe) || !adjacent?(mover, foe)
        next unless foe.threatens? && foe.edge?("first-strike") && !foe.first_strike_used
        next unless mover.active?

        foe.first_strike_used = true
        emit(:first_strike, actor: foe.id, target: mover.id)
        combat.attack(foe, mover, foe.melee_weapons.first, mode: :melee, free: true)
      end
    end

    def check_morale
      return if @morale_checked

      extras = combatants.select { |combatant| combatant.side == "enemies" && !combatant.wild_card? }
      return if extras.empty?
      return if extras.count(&:incapacitated) * 2 < extras.length

      @morale_checked = true
      extras.select(&:active?).each do |extra|
        if extra.ability?("fearless")
          emit(:morale, actor: extra.id, outcome: "fearless")
          next
        end

        roll = dice.trait(extra.attribute("spirit"), wild_card: false, modifier: recovery_bonus(extra) + extra.trait_penalty)
        held = roll.best >= 4 && !roll.critical_failure
        extra.fled = true unless held
        emit(:morale, actor: extra.id, roll: roll.as_json, outcome: held ? "held" : "fled")
      end
    end

    def decide_winner
      standing = SIDES.select { |side| combatants.any? { |combatant| combatant.side == side && combatant.active? } }
      return nil if standing.length == 2

      standing.first || "draw"
    end
  end
end
