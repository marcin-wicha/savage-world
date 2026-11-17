module Battles
  class Combatant
    UNSKILLED = TraitDie.new(4, -2)
    UNARMED = { "name" => "Unarmed", "slug" => "unarmed", "damage" => "Str", "skill" => "fighting" }.freeze
    CALLED_SHOT_IMMUNE = %w[undead construct elemental].freeze

    attr_reader :id, :name, :side, :group, :definition, :weapons, :edges, :hindrances, :abilities, :size,
      :pace, :base_parry, :base_toughness, :armor, :cover
    attr_accessor :position, :wounds, :fatigue, :shaken, :stunned, :distracted, :vulnerable, :defending,
      :incapacitated, :dead, :bleeding_out, :fled, :bennies, :card, :moved, :injuries, :first_strike_used,
      :counterattack_used, :bennies_spent, :thrown_weapons

    def initialize(definition)
      @definition = definition.deep_stringify_keys
      @id = @definition.fetch("id")
      @name = @definition.fetch("name")
      @side = @definition.fetch("side")
      @group = @definition["group"] || @id
      @wild_card = @definition["wild_card"] == true
      @attributes = @definition.fetch("attributes").transform_values { |die| TraitDie.parse(die) }
      @skills = @definition.fetch("skills", {}).transform_values { |die| TraitDie.parse(die) }.compact
      @pace = @definition.fetch("pace", 6).to_i
      @base_parry = @definition.fetch("parry", 2).to_i
      @base_toughness = @definition.fetch("toughness", 4).to_i
      @armor = @definition.fetch("armor", 0).to_i
      @cover = @definition.fetch("cover", 0).to_i
      @size = @definition.fetch("size", 0).to_i
      @edges = Set.new(@definition.fetch("edges", []))
      @hindrances = Set.new(@definition.fetch("hindrances", []))
      @abilities = Set.new(@definition.fetch("abilities", []))
      @weapons = build_weapons(@definition.fetch("weapons", []))
      @bennies = @definition.fetch("bennies", @wild_card ? 3 : 0).to_i
      reset_state
    end

    def reset_state
      @position = 0
      @wounds = 0
      @fatigue = 0
      @shaken = false
      @stunned = false
      @distracted = 0
      @vulnerable = 0
      @defending = false
      @incapacitated = false
      @dead = false
      @bleeding_out = false
      @fled = false
      @card = nil
      @moved = false
      @injuries = []
      @first_strike_used = false
      @counterattack_used = false
      @bennies_spent = 0
      @thrown_weapons = Set.new
    end

    def wild_card?
      @wild_card
    end

    def edge?(slug)
      @edges.include?(slug)
    end

    def ability?(key)
      @abilities.include?(key)
    end

    def hindrance?(slug)
      @hindrances.include?(slug)
    end

    def active?
      !out?
    end

    def out?
      incapacitated || fled
    end

    def can_act?
      active? && !stunned
    end

    def threatens?
      active? && !stunned && !shaken
    end

    def distracted?
      distracted.positive?
    end

    def vulnerable?
      vulnerable.positive?
    end

    def attribute(name)
      @attributes.fetch(name.to_s)
    end

    def skill(slug)
      @skills[slug.to_s]
    end

    def skill_or_unskilled(slug)
      skill(slug) || UNSKILLED
    end

    def strength
      attribute("strength")
    end

    def max_wounds
      base = wild_card? ? 3 : 0
      base + (ability?("resilient") ? 1 : 0) + (ability?("very_resilient") ? 2 : 0)
    end

    def wound_penalty
      ignored = 0
      ignored += 1 if edge?("nerves-of-steel")
      ignored += 1 if edge?("improved-nerves-of-steel")
      ignored += 1 if ability?("undead") || ability?("construct")
      -[ [ wounds, 3 ].min - ignored, 0 ].max
    end

    def fatigue_penalty
      -fatigue
    end

    def trait_penalty
      wound_penalty + fatigue_penalty + (distracted? ? -2 : 0)
    end

    def parry
      base_parry + (defending ? 4 : 0)
    end

    def toughness(armor_piercing = 0)
      base_toughness + [ armor - armor_piercing, 0 ].max
    end

    def scale
      case size
      when ..-4 then -6
      when -3 then -4
      when -2 then -2
      when -1..3 then 0
      when 4..7 then 2
      when 8..11 then 4
      else 6
      end
    end

    def ignores_called_shots?
      CALLED_SHOT_IMMUNE.any? { |key| ability?(key) }
    end

    def melee_weapons
      usable_weapons.select(&:melee?).presence || [ unarmed ]
    end

    def ranged_weapons
      usable_weapons.select { |weapon| weapon.ranged? && !(weapon.thrown? && thrown_weapons.include?(weapon.slug)) }
    end

    def armed?
      usable_weapons.any?(&:melee?) || edge?("martial-artist") || edge?("martial-warrior")
    end

    def unarmed
      @unarmed ||= Gears::CombatProfile.new(
        UNARMED.merge("damage" => edge?("bruiser") ? "Str+d6" : edge?("brawler") ? "Str+d4" : "Str")
      )
    end

    def weapon_modifiers(weapon)
      @weapon_modifiers.fetch(weapon.slug, { "attack" => 0, "damage" => 0 })
    end

    def summary
      {
        id: id,
        name: name,
        side: side,
        wild_card: wild_card?,
        wounds: wounds,
        shaken: shaken,
        stunned: stunned,
        incapacitated: incapacitated,
        dead: dead,
        bleeding_out: bleeding_out,
        fled: fled,
        injuries: injuries,
        bennies: bennies,
        bennies_spent: bennies_spent
      }
    end

    private

    def usable_weapons
      @weapons
    end

    def build_weapons(definitions)
      @weapon_modifiers = {}
      definitions.map do |weapon|
        profile = Gears::CombatProfile.new(weapon)
        @weapon_modifiers[profile.slug] = {
          "attack" => weapon["attack_modifier"].to_i,
          "damage" => weapon["damage_modifier"].to_i
        }
        profile
      end.select(&:weapon?)
    end
  end
end
