require "rails_helper"

RSpec.describe Battles::Engine do
  class FakeDeck
    attr_reader :joker_dealt

    def initialize(cards)
      @cards = cards
      @joker_dealt = false
    end

    def deal
      card = @cards.shift
      @joker_dealt ||= card.joker?
      card
    end

    def end_round; end
  end

  def card(rank, suit = "clubs")
    Battles::ActionDeck::Card.new(rank: rank, suit: suit)
  end

  def joker
    Battles::ActionDeck::Card.new(rank: 1, suit: "joker")
  end

  def with_deck(engine, *cards)
    engine.instance_variable_set(:@deck, FakeDeck.new(cards))
    engine
  end

  let(:hero) { battle_definition("hero") }
  let(:orc) { battle_definition("orc", side: "enemies") }

  describe "initiative" do
    it "lets Level Headed keep the better of two cards" do
      engine = with_deck(build_engine([ hero.merge("edges" => [ "level-headed" ]), orc ]), card(3), card(12), card(7))

      engine.send(:deal_initiative)

      expect(engine.combatants.first.card.rank).to eq(12)
    end

    it "lets Quick redraw cards of five or lower" do
      engine = with_deck(build_engine([ hero.merge("edges" => [ "quick" ]), orc ]), card(4), card(2), card(9), card(7))

      engine.send(:deal_initiative)

      expect(engine.combatants.first.card.rank).to eq(9)
    end

    it "makes Hesitant keep the lower card unless it drew a Joker" do
      engine = with_deck(build_engine([ hero.merge("hindrances" => [ "hesitant" ]), orc ]), card(11), card(4), card(7))
      engine.send(:deal_initiative)
      expect(engine.combatants.first.card.rank).to eq(4)

      engine = with_deck(build_engine([ hero.merge("hindrances" => [ "hesitant" ]), orc ]), card(11), joker, card(7))
      engine.send(:deal_initiative)
      expect(engine.combatants.first.card).to be_joker
    end

    it "deals Extras of the same group a single shared card" do
      goblins = (1..3).map { |index| battle_definition("goblin-#{index}", side: "enemies", wild_card: false, group: "goblins") }
      engine = with_deck(build_engine([ hero, *goblins ]), card(5), card(10))

      order = engine.send(:deal_initiative)

      expect(order.first.map(&:id)).to eq(%w[goblin-1 goblin-2 goblin-3])
      expect(engine.combatants.drop(1).map { |goblin| goblin.card.rank }.uniq).to eq([ 10 ])
    end

    it "awards a Benny to every party Wild Card when a hero draws a Joker" do
      engine = with_deck(build_engine([ hero, battle_definition("friend"), orc ]), joker, card(3), card(4))

      engine.send(:deal_initiative)

      expect(engine.party.map(&:bennies)).to eq([ 1, 1 ])
    end

    it "adds a Benny to the GM pool when an enemy draws a Joker" do
      engine = with_deck(build_engine([ hero, orc ]), card(3), joker)

      expect { engine.send(:deal_initiative) }.to change(engine, :gm_bennies).by(1)
    end
  end

  describe "turns" do
    it "does not act while Shaken and the Spirit roll fails" do
      engine = build_engine([ hero, orc ])
      actor = engine.combatants.first
      actor.shaken = true
      script_dice(engine, 2, 3)

      engine.send(:take_turn, actor)

      expect(actor.shaken).to be(true)
      expect(engine.instance_variable_get(:@log).pluck(:type)).not_to include("move", "attack")
    end

    it "spends a Benny to recover from Shaken" do
      engine = build_engine([ hero.merge("bennies" => 1, "position" => 0), orc ], starting_distance: 30)
      actor = engine.combatants.first
      actor.shaken = true
      script_dice(engine, 2, 3, 1)

      engine.send(:take_turn, actor)

      expect(actor.shaken).to be(false)
      expect(actor.bennies).to eq(0)
    end

    it "keeps conditions until the end of the target's next turn" do
      engine = build_engine([ hero, orc ], starting_distance: 30)
      target = engine.combatants.first
      engine.apply_condition(target, :vulnerable)
      script_dice(engine, 1)

      engine.send(:take_turn, target)

      expect(target).not_to be_vulnerable
    end

    it "keeps a self-inflicted condition through the actor's next turn" do
      engine = build_engine([ hero, orc ])
      actor = engine.combatants.first
      engine.instance_variable_set(:@current_actor, actor)
      engine.apply_condition(actor, :vulnerable)

      expect(actor.vulnerable).to eq(2)
    end
  end

  describe "movement" do
    it "lets First Strike attack a foe that moves adjacent" do
      engine = build_engine([ hero, orc.merge("edges" => [ "first-strike" ]) ], starting_distance: 5)
      mover, guard = engine.combatants

      engine.move_toward(mover, guard, 6, 1)

      log = engine.instance_variable_get(:@log)
      expect(log.pluck(:type)).to include("first_strike")
      expect(log.find { |event| event[:type] == "attack" }).to include(actor: "orc", free: true)
    end

    it "gives engaged foes a free attack when a combatant withdraws" do
      engine = build_engine([ hero, orc, battle_definition("archer", side: "enemies") ], starting_distance: 10)
      mover, guard, archer = engine.combatants
      guard.position = -1

      engine.move_toward(mover, archer, 6, 1)

      log = engine.instance_variable_get(:@log)
      expect(log).to include(hash_including(type: "withdraw", actor: "hero", target: "orc"))
      expect(log.find { |event| event[:type] == "attack" }).to include(actor: "orc", free: true)
    end

    it "computes Gang Up, capped at +4 and reduced by Block and defenders' allies" do
      attackers = (1..6).map { |index| battle_definition("orc-#{index}", side: "enemies", wild_card: false) }
      engine = build_engine([ hero.merge("edges" => [ "block" ]), *attackers ])
      target, first, = engine.combatants
      engine.combatants.each { |combatant| combatant.position = 0 }

      expect(engine.gang_up(first, target)).to eq(3)

      engine = build_engine([ hero, battle_definition("friend"), *attackers.first(3) ])
      target, _friend, first = engine.combatants
      engine.combatants.each { |combatant| combatant.position = 0 }
      expect(engine.gang_up(first, target)).to eq(1)
    end
  end

  describe "morale" do
    it "routs Extras when half their side is down, except the fearless" do
      goblins = (1..4).map { |index| battle_definition("goblin-#{index}", side: "enemies", wild_card: false) }
      goblins[3]["abilities"] = [ "fearless" ]
      engine = build_engine([ hero, *goblins ], morale: true)
      engine.combatants[1].incapacitated = true
      engine.combatants[2].incapacitated = true
      script_dice(engine, 2, 3)

      engine.after_incapacitation(engine.combatants[2])

      expect(engine.combatants[3].fled).to be(true)
      expect(engine.combatants[4].fled).to be(false)
    end

    it "ignores morale when the setting is off" do
      goblins = (1..2).map { |index| battle_definition("goblin-#{index}", side: "enemies", wild_card: false) }
      engine = build_engine([ hero, *goblins ])
      engine.combatants[1].incapacitated = true

      engine.after_incapacitation(engine.combatants[1])

      expect(engine.combatants[2].fled).to be(false)
    end
  end

  describe "#run" do
    let(:definitions) do
      [
        hero.merge("skills" => { "fighting" => "d10" }),
        battle_definition("ally", weapons: [ { "name" => "Bow", "damage" => "2d6", "range" => "12/24/48" } ], skills: { "shooting" => "d8" }),
        *(1..3).map { |index| battle_definition("bandit-#{index}", side: "enemies", wild_card: false, group: "bandits") }
      ]
    end

    it "is deterministic for a seed" do
      first = build_engine(definitions, seed: 7).run
      second = build_engine(definitions, seed: 7).run

      expect(first.log).to eq(second.log)
      expect(first.winner).to eq(second.winner)
    end

    it "ends when one side is out of the fight" do
      result = build_engine(definitions, seed: 11).run

      expect(%w[party enemies]).to include(result.winner)
      loser = result.winner == "party" ? "enemies" : "party"
      expect(result.combatants.select { |combatant| combatant[:side] == loser }).to all(include(incapacitated: true).or(include(fled: true)))
      expect(result.log.last).to include(type: "battle_end", winner: result.winner)
    end

    it "is a draw when the round limit is reached" do
      armored = battle_definition("tank", side: "enemies", toughness: 40, parry: 2)
      result = build_engine([ hero.merge("toughness" => 40), armored ], max_rounds: 3).run

      expect(result.winner).to eq("draw")
      expect(result.rounds).to eq(3)
    end

    it "does not record a log when recording is off" do
      result = described_class.new(definitions: definitions, settings: {}, seed: 3, record: false).run

      expect(result.log).to be_nil
    end
  end
end
