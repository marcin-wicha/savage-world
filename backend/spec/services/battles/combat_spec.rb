require "rails_helper"

RSpec.describe Battles::Combat do
  let(:attacker) { battle_definition("attacker") }
  let(:defender) { battle_definition("defender", side: "enemies", wild_card: true) }
  let(:engine) { build_engine([ attacker, defender ]) }
  let(:hero) { engine.combatants.first }
  let(:foe) { engine.combatants.last }

  before do
    hero.position = 0
    foe.position = 1
    engine.instance_variable_set(:@gm_bennies, 0)
  end

  describe "#apply_damage" do
    it "has no effect below Toughness" do
      expect(engine.combat.apply_damage(foe, 4, 5)).to eq(result: "no_effect", wounds: 0)
      expect(foe.shaken).to be(false)
    end

    it "shakes on a success and wounds when already Shaken" do
      expect(engine.combat.apply_damage(foe, 5, 5)).to eq(result: "shaken", wounds: 0)
      expect(engine.combat.apply_damage(foe, 6, 5)).to eq(result: "wounded", wounds: 1)
      expect(foe.wounds).to eq(1)
    end

    it "lets Hardy creatures ignore a second Shaken" do
      hardy = build_engine([ attacker, battle_definition("troll", side: "enemies", abilities: [ "hardy" ]) ])
      troll = hardy.combatants.last
      troll.shaken = true

      expect(hardy.combat.apply_damage(troll, 5, 5)).to eq(result: "shaken", wounds: 0)
    end

    it "inflicts a wound per raise" do
      expect(engine.combat.apply_damage(foe, 13, 5)).to eq(result: "wounded", wounds: 2)
      expect(foe.shaken).to be(true)
    end

    it "takes Extras out with any wound" do
      extras = build_engine([ attacker, battle_definition("goblin", side: "enemies", wild_card: false) ])
      extras.instance_variable_set(:@gm_bennies, 0)
      goblin = extras.combatants.last

      expect(extras.combat.apply_damage(goblin, 9, 5)).to eq(result: "incapacitated", wounds: 1)
      expect(goblin.incapacitated).to be(true)
    end

    it "incapacitates Wild Cards past three wounds and rolls for injury" do
      foe.wounds = 3
      script_dice(engine, 6, 1, 2, 3, 4, 1)

      expect(engine.combat.apply_damage(foe, 9, 5)).to eq(result: "incapacitated", wounds: 1)
      expect(foe.incapacitated).to be(true)
      expect(foe.bleeding_out).to be(false)
      expect(foe.injuries).to eq([ "guts_broken" ])
    end

    it "starts bleeding out on a failed incapacitation roll" do
      foe.wounds = 3
      script_dice(engine, 2, 3, 6, 6, 3)

      engine.combat.apply_damage(foe, 9, 5)

      expect(foe.bleeding_out).to be(true)
      expect(foe.injuries).to eq([ "head_blinded" ])
    end

    it "dies on a critical failure unless Harder to Kill succeeds" do
      foe.wounds = 3
      script_dice(engine, 1, 1)
      engine.combat.apply_damage(foe, 9, 5)
      expect(foe.dead).to be(true)
    end

    it "spends a Benny to soak wounds" do
      foe.bennies = 1
      script_dice(engine, 5, 2)

      expect(engine.combat.apply_damage(foe, 9, 5)).to eq(result: "soaked", wounds: 0)
      expect(foe.bennies).to eq(0)
      expect(foe.wounds).to eq(0)
    end
  end

  describe "#attack" do
    it "hits against Parry in melee and adds a raise die to damage" do
      script_dice(engine, 4, 5, 3, 2)

      engine.combat.attack(hero, foe, hero.weapons.first, mode: :melee)

      attack = engine.instance_variable_get(:@log).find { |event| event[:type] == "attack" }
      damage = engine.instance_variable_get(:@log).find { |event| event[:type] == "damage" }
      expect(attack).to include(target_number: 5, outcome: "hit")
      expect(damage[:roll][:rolls].length).to eq(2)
      expect(damage[:raise_bonus]).to be(false)
    end

    it "applies Wild Attack bonuses and Vulnerable targets" do
      foe.vulnerable = 1
      script_dice(engine, 2, 1, 1, 1)

      engine.combat.attack(hero, foe, hero.weapons.first, mode: :melee, wild_attack: true)

      log = engine.instance_variable_get(:@log)
      attack = log.find { |event| event[:type] == "attack" }
      damage = log.find { |event| event[:type] == "damage" }
      expect(attack[:modifiers]).to include({ label: "wild_attack", value: 2 }, { label: "vulnerable_target", value: 2 })
      expect(attack).to include(outcome: "hit", target_number: 5)
      expect(damage[:roll]).to include(modifier: 2, total: 4)
    end

    it "uses range penalties, cover, and a TN of 4 for ranged attacks" do
      bow = { "name" => "Bow", "damage" => "2d6", "range" => "12/24/48" }
      ranged = build_engine([ battle_definition("archer", weapons: [ bow ], skills: { "shooting" => "d8" }), defender ], cover: "medium")
      archer, target = ranged.combatants
      target.position = 30
      script_dice(ranged, 3, 2)

      ranged.combat.attack(archer, target, archer.weapons.first, mode: :ranged)

      attack = ranged.instance_variable_get(:@log).find { |event| event[:type] == "attack" }
      expect(attack[:target_number]).to eq(4)
      expect(attack[:modifiers]).to include({ label: "range", value: -4 }, { label: "cover", value: -4 })
    end

    it "does not reroll critical failures" do
      hero.bennies = 3
      script_dice(engine, 1, 1)

      engine.combat.attack(hero, foe, hero.weapons.first, mode: :melee)

      attack = engine.instance_variable_get(:@log).find { |event| event[:type] == "attack" }
      expect(attack).to include(outcome: "critical_failure", rerolled: false)
      expect(hero.bennies).to eq(3)
    end

    it "ignores called shot damage against undead" do
      undead = build_engine([ attacker, battle_definition("skeleton", side: "enemies", abilities: [ "undead" ]) ])
      skeleton = undead.combatants.last
      skeleton.position = 1

      expect(skeleton.ignores_called_shots?).to be(true)
    end
  end

  describe "#test" do
    it "makes the target Vulnerable on a success and Shaken on a raise" do
      bully = build_engine([ battle_definition("bully", skills: { "intimidation" => "d8" }), defender ])
      actor, target = bully.combatants
      script_dice(bully, 8, 4, 2, 2, 1)

      bully.combat.test(actor, target, "intimidation")

      expect(target).to be_vulnerable
      expect(target.shaken).to be(true)
    end

    it "does not affect fearless targets" do
      bully = build_engine([ battle_definition("bully", skills: { "intimidation" => "d8" }), battle_definition("golem", side: "enemies", abilities: [ "fearless" ]) ])
      actor, target = bully.combatants

      bully.combat.test(actor, target, "intimidation")

      expect(target).not_to be_vulnerable
    end
  end

  describe "#bleed" do
    it "stabilizes on a raise and dies on a failure" do
      foe.incapacitated = true
      foe.bleeding_out = true
      script_dice(engine, 6, 2, 1)
      engine.combat.bleed(foe)
      expect(foe.bleeding_out).to be(false)

      foe.bleeding_out = true
      script_dice(engine, 2, 3)
      engine.combat.bleed(foe)
      expect(foe.dead).to be(true)
    end
  end
end
