require "rails_helper"

RSpec.describe Characters::DerivedStats do
  let(:character) do
    create(:character, attribute_dice: { "agility" => "d6", "smarts" => "d4", "spirit" => "d4", "strength" => "d6", "vigor" => "d8" })
  end

  it "derives base pace, parry, and toughness" do
    stats = described_class.new(character).as_json

    expect(stats[:pace][:value]).to eq(6)
    expect(stats[:parry][:value]).to eq(2)
    expect(stats[:toughness]).to include(value: 6, armor: 0)
  end

  it "adds half of the effective fighting die to parry" do
    fighting = create(:skill, slug: "fighting", name: "Fighting")
    create(:character_skill, character: character, skill: fighting, die: "d8")
    create(:edge, slug: "trademark", effects: [ { "kind" => "trait_die_step", "target" => "skill", "trait" => "fighting", "steps" => 1 } ]).tap do |edge|
      character.edges << edge
    end

    expect(described_class.new(character.reload).parry[:value]).to eq(7)
  end

  it "applies equipped armor and shields only" do
    armor = create(:gear, name: "Chain Hauberk", category: "armor", effects: { "armor" => 3 })
    helmet = create(:gear, name: "Cap", category: "armor", effects: { "armor" => 1 })
    shield = create(:gear, name: "Medium Shield", category: "shield", effects: { "parry" => 2, "cover" => 2 })
    spare = create(:gear, name: "Plate", category: "armor", effects: { "armor" => 4 })
    create(:character_gear, character: character, gear: armor, equipped: true)
    create(:character_gear, character: character, gear: helmet, equipped: true)
    create(:character_gear, character: character, gear: shield, equipped: true)
    create(:character_gear, character: character, gear: spare, equipped: false)

    stats = described_class.new(character.reload)

    expect(stats.toughness).to include(value: 9, armor: 3)
    expect(stats.parry[:value]).to eq(4)
    expect(stats.parry[:contributions]).to include({ label: "Medium Shield", value: 2 })
  end

  it "applies edge and hindrance modifiers" do
    character.edges << create(:edge, slug: "fleet-footed", name: "Fleet-Footed")
    character.edges << create(:edge, slug: "brawler", name: "Brawler")
    character.hindrances << create(:hindrance, slug: "small", name: "Small")
    character.hindrances << create(:hindrance, slug: "slow", name: "Slow")

    stats = described_class.new(character.reload).as_json

    expect(stats[:pace][:value]).to eq(7)
    expect(stats[:toughness][:value]).to eq(6)
    expect(stats[:toughness][:contributions]).to include({ label: "Brawler", value: 1 }, { label: "Small", value: -1 })
  end

  it "adds Trademark Weapon parry only while a melee weapon is equipped" do
    character.edges << create(:edge, slug: "trademark-weapon", name: "Trademark Weapon")
    sword = create(:gear, category: "melee_weapon", effects: { "damage" => "Str+d8" })
    selection = create(:character_gear, character: character, gear: sword, equipped: false)

    expect(described_class.new(character.reload).parry[:value]).to eq(2)

    selection.update!(equipped: true)
    expect(described_class.new(character.reload).parry[:value]).to eq(3)
  end
end
