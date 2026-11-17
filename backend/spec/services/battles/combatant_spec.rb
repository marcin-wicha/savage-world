require "rails_helper"

RSpec.describe Battles::Combatant do
  def combatant(**overrides)
    described_class.new(battle_definition("hero", **overrides))
  end

  it "applies wound penalties up to -3 and lets Nerves of Steel ignore them" do
    hero = combatant
    hero.wounds = 3
    expect(hero.wound_penalty).to eq(-3)

    steady = combatant(edges: [ "nerves-of-steel", "improved-nerves-of-steel" ])
    steady.wounds = 3
    expect(steady.wound_penalty).to eq(-1)
  end

  it "gives Wild Cards three wounds and Extras none, plus resilience" do
    expect(combatant.max_wounds).to eq(3)
    expect(combatant(wild_card: false).max_wounds).to eq(0)
    expect(combatant(wild_card: false, abilities: [ "resilient" ]).max_wounds).to eq(1)
    expect(combatant(abilities: [ "very_resilient" ]).max_wounds).to eq(5)
  end

  it "reduces armor by armor piercing but never below base toughness" do
    hero = combatant(toughness: 5, armor: 2)

    expect(hero.toughness).to eq(7)
    expect(hero.toughness(1)).to eq(6)
    expect(hero.toughness(4)).to eq(5)
  end

  it "adds +4 Parry while defending" do
    hero = combatant(parry: 6)
    hero.defending = true

    expect(hero.parry).to eq(10)
  end

  it "maps Size to Scale" do
    expect(combatant(size: -4).scale).to eq(-6)
    expect(combatant(size: 0).scale).to eq(0)
    expect(combatant(size: 5).scale).to eq(2)
    expect(combatant(size: 12).scale).to eq(6)
  end

  it "falls back to an unarmed attack that improves with Brawler" do
    hero = combatant(weapons: [])

    expect(hero.melee_weapons.map(&:name)).to eq([ "Unarmed" ])
    expect(hero).not_to be_armed
    expect(combatant(weapons: [], edges: [ "brawler" ]).unarmed.damage[:dice]).to eq([ { count: 1, sides: 4 } ])
  end

  it "rolls unskilled traits at d4-2" do
    expect(combatant.skill_or_unskilled("shooting").to_s).to eq("d4-2")
  end

  it "tracks weapon attack and damage modifiers" do
    hero = combatant(weapons: [ { "name" => "Sword", "damage" => "Str+d8", "attack_modifier" => 1, "damage_modifier" => 2 } ])

    expect(hero.weapon_modifiers(hero.weapons.first)).to eq("attack" => 1, "damage" => 2)
  end
end
