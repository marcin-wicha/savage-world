module Battles
  class CombatantBuilder
    def self.from_character(character)
      traits = Characters::EffectiveTraits.new(character).as_json
      derived = Characters::DerivedStats.new(character, effective_traits: traits)
      equipped = derived.equipped_profiles
      damage = traits[:damage]

      {
        "id" => "character-#{character.id}",
        "name" => character.name,
        "side" => "party",
        "wild_card" => true,
        "source" => { "type" => "character", "id" => character.id },
        "attributes" => traits[:attributes].transform_values { |trait| die_string(trait) },
        "skills" => traits[:skills].transform_values { |trait| die_string(trait) },
        "pace" => derived.pace[:value],
        "parry" => derived.parry[:value],
        "toughness" => derived.toughness[:value] - derived.worn_armor,
        "armor" => derived.worn_armor,
        "cover" => equipped.select(&:shield?).map(&:cover).max || 0,
        "size" => 0,
        "bennies" => 3 + (character.edges.count { |edge| %w[luck great-luck].include?(edge.slug) }),
        "edges" => character.edges.map(&:slug),
        "hindrances" => character.hindrances.map(&:slug),
        "abilities" => [],
        "weapons" => equipped.select(&:weapon?).map do |profile|
          weapon_definition(profile, character, damage)
        end
      }
    end

    def self.from_enemy_template(template, index)
      {
        "id" => "enemy-#{template.id}-#{index}",
        "name" => index.positive? ? "#{template.name} #{index}" : template.name,
        "side" => "enemies",
        "group" => template.wild_card ? "enemy-#{template.id}-#{index}" : "enemy-#{template.id}",
        "wild_card" => template.wild_card,
        "source" => { "type" => "enemy_template", "id" => template.id },
        "attributes" => template.attribute_dice,
        "skills" => template.skills,
        "pace" => template.pace,
        "parry" => template.parry,
        "toughness" => template.toughness - template.armor,
        "armor" => template.armor,
        "cover" => 0,
        "size" => template.size,
        "bennies" => template.bennies,
        "edges" => template.edge_slugs,
        "hindrances" => [],
        "abilities" => template.abilities,
        "weapons" => template.weapons
      }
    end

    def self.die_string(trait)
      TraitDie.parse(trait[:die]).then { |die| TraitDie.new(die.sides, trait[:modifier].to_i).to_s }
    end

    def self.weapon_definition(profile, character, damage)
      trademark = character.edges.find { |edge| %w[trademark-weapon improved-trademark-weapon].include?(edge.slug) }
      weapon_damage = damage.fetch("all", {})[:modifier].to_i + damage.fetch(profile.slug, {})[:modifier].to_i
      character_gear = character.character_gears.find { |selection| selection.gear.slug == profile.slug }

      character_gear.gear.effects.to_h.stringify_keys.merge(
        "name" => profile.name,
        "slug" => profile.slug,
        "category" => profile.category,
        "attack_modifier" => trademark ? trademark_bonus(character) : 0,
        "damage_modifier" => weapon_damage
      )
    end

    def self.trademark_bonus(character)
      slugs = character.edges.map(&:slug)
      (slugs.include?("trademark-weapon") ? 1 : 0) + (slugs.include?("improved-trademark-weapon") ? 1 : 0)
    end
  end
end
