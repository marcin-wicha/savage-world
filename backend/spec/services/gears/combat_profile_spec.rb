require "rails_helper"

RSpec.describe Gears::CombatProfile do
  describe ".parse_damage" do
    it "parses strength-based damage" do
      expect(described_class.parse_damage("Str+d6")).to eq(strength: true, dice: [ { count: 1, sides: 6 } ], modifier: 0)
    end

    it "parses fixed dice with a modifier" do
      expect(described_class.parse_damage("2d6 + 1")).to eq(strength: false, dice: [ { count: 2, sides: 6 } ], modifier: 1)
    end

    it "parses strength with multiple dice and a penalty" do
      expect(described_class.parse_damage("Str+d4+d6-1")).to eq(
        strength: true,
        dice: [ { count: 1, sides: 4 }, { count: 1, sides: 6 } ],
        modifier: -1
      )
    end

    it "rejects invalid expressions" do
      [ nil, "", "Str+d7", "lots", "-d6", "3", "Str+Str", "11d6" ].each do |value|
        expect(described_class.parse_damage(value)).to be_nil, "expected #{value.inspect} to be rejected"
      end
    end
  end

  describe ".parse_range" do
    it "parses short, medium, and long range" do
      expect(described_class.parse_range("12/24/48")).to eq([ 12, 24, 48 ])
    end

    it "rejects malformed ranges" do
      expect(described_class.parse_range("12/24")).to be_nil
      expect(described_class.parse_range("24/12/48")).to be_nil
      expect(described_class.parse_range("a/b/c")).to be_nil
    end
  end

  it "builds a melee weapon from gear" do
    gear = build(:gear, name: "Long Sword", category: "melee_weapon", effects: { "damage" => "Str+d8", "parry" => "+1" })
    profile = described_class.new(gear)

    expect(profile).to be_weapon
    expect(profile).to be_melee
    expect(profile).not_to be_ranged
    expect(profile.parry).to eq(1)
    expect(profile.attack_skill).to eq("fighting")
  end

  it "builds a ranged weapon with rate of fire and armor piercing" do
    gear = build(:gear, category: "ranged_weapon", effects: { "damage" => "2d6", "range" => "12/24/48", "ap" => 2, "rof" => 1, "shots" => 1 })
    profile = described_class.new(gear)

    expect(profile).to be_ranged
    expect(profile).not_to be_melee
    expect(profile.ap).to eq(2)
    expect(profile.shots).to eq(1)
    expect(profile.attack_skill).to eq("shooting")
  end

  it "treats ranged melee weapons as thrown" do
    profile = described_class.new(build(:gear, category: "melee_weapon", effects: { "damage" => "Str+d4", "range" => "3/6/12" }))

    expect(profile).to be_thrown
    expect(profile).to be_melee
    expect(profile).to be_ranged
    expect(profile.attack_skill).to eq("fighting")
  end

  it "recognizes armor and shields" do
    armor = described_class.new(build(:gear, category: "armor", effects: { "armor" => 2 }))
    shield = described_class.new(build(:gear, category: "shield", effects: { "parry" => 1, "cover" => 2 }))

    expect(armor).to be_armor
    expect(armor).not_to be_weapon
    expect(shield).to be_shield
    expect(shield.cover).to eq(2)
  end

  it "ignores unknown or invalid values" do
    profile = described_class.new(build(:gear, effects: { "damage" => "lots", "ap" => "many", "weight" => 4 }))

    expect(profile).not_to be_combat
    expect(profile.ap).to eq(0)
    expect(profile.rof).to eq(1)
  end

  it "builds a profile from a plain weapon hash" do
    profile = described_class.new("name" => "Claws", "damage" => "Str+d6", "ap" => 1, "skill" => "fighting")

    expect(profile.name).to eq("Claws")
    expect(profile.slug).to eq("claws")
    expect(profile.as_json).to include(name: "Claws", ap: 1, skill: "fighting")
  end
end
