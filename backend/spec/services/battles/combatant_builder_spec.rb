require "rails_helper"

RSpec.describe Battles::CombatantBuilder do
  describe ".from_character" do
    it "snapshots effective traits, derived stats, equipped weapons, and edges" do
      character = create(:character, name: "Valeria", attribute_dice: { "agility" => "d8", "smarts" => "d6", "spirit" => "d6", "strength" => "d8", "vigor" => "d8" })
      fighting = create(:skill, slug: "fighting", name: "Fighting")
      create(:character_skill, character: character, skill: fighting, die: "d10")
      character.edges << create(:edge, slug: "trademark-weapon", name: "Trademark Weapon")
      character.edges << create(:edge, slug: "luck", name: "Luck")
      character.edges << create(:edge, slug: "brute", effects: [ { "kind" => "trait_modifier", "target" => "damage", "trait" => "all", "modifier" => 1 } ])
      sword = create(:gear, name: "Long Sword", slug: "long-sword", category: "melee_weapon", effects: { "damage" => "Str+d8" })
      armor = create(:gear, name: "Chain", category: "armor", effects: { "armor" => 3 })
      spare = create(:gear, name: "Bow", category: "ranged_weapon", effects: { "damage" => "2d6", "range" => "12/24/48" })
      create(:character_gear, character: character, gear: sword, equipped: true)
      create(:character_gear, character: character, gear: armor, equipped: true)
      create(:character_gear, character: character, gear: spare, equipped: false)

      definition = described_class.from_character(character.reload)

      expect(definition).to include(
        "id" => "character-#{character.id}",
        "side" => "party",
        "wild_card" => true,
        "toughness" => 6,
        "armor" => 3,
        "parry" => 8,
        "bennies" => 4
      )
      expect(definition["skills"]).to eq("fighting" => "d10")
      expect(definition["edges"]).to include("trademark-weapon", "luck")
      expect(definition["weapons"]).to contain_exactly(
        hash_including("name" => "Long Sword", "damage" => "Str+d8", "attack_modifier" => 1, "damage_modifier" => 1)
      )
    end
  end

  describe ".from_enemy_template" do
    it "builds numbered Extras that share an initiative group" do
      template = create(:enemy_template, name: "Goblin", toughness: 6, armor: 1)

      first = described_class.from_enemy_template(template, 1)
      second = described_class.from_enemy_template(template, 2)

      expect(first).to include("name" => "Goblin 1", "side" => "enemies", "toughness" => 5, "armor" => 1, "wild_card" => false)
      expect(first["group"]).to eq(second["group"])
      expect(first["id"]).not_to eq(second["id"])
    end

    it "gives Wild Cards their own card" do
      template = create(:enemy_template, :wild_card, name: "Chieftain")

      expect(described_class.from_enemy_template(template, 0)).to include("name" => "Chieftain", "group" => "enemy-#{template.id}-0", "bennies" => 2)
    end
  end
end
