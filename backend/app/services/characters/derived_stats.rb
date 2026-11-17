module Characters
  class DerivedStats
    BASE_PACE = 6
    TRADEMARK_EDGES = %w[trademark-weapon improved-trademark-weapon].freeze
    EDGE_MODIFIERS = {
      "fleet-footed" => { pace: 2 },
      "block" => { parry: 1 },
      "improved-block" => { parry: 1 },
      "brawler" => { toughness: 1 },
      "brawny" => { toughness: 1 }
    }.freeze
    HINDRANCE_MODIFIERS = {
      "slow" => { pace: -1 },
      "obese" => { pace: -1, toughness: 1 },
      "small" => { toughness: -1 },
      "elderly" => { pace: -1 }
    }.freeze

    def initialize(character, effective_traits: nil)
      @character = character
      @traits = effective_traits || EffectiveTraits.new(character).as_json
    end

    def as_json(*)
      { pace: pace, parry: parry, toughness: toughness }
    end

    def pace
      statistic(:pace, [ { label: "Base Pace", value: BASE_PACE } ])
    end

    def parry
      fighting = @traits[:skills]["fighting"]
      contributions = [ { label: "Base Parry", value: 2 } ]
      if fighting
        contributions << { label: "Half Fighting (#{fighting[:die]})", value: half_die(fighting[:die], fighting[:modifier]) }
      end
      equipped_profiles.each do |profile|
        contributions << { label: profile.name, value: profile.parry } if profile.parry.nonzero?
      end
      if equipped_profiles.any?(&:melee?)
        @character.edges.select { |edge| TRADEMARK_EDGES.include?(edge.slug) }.each do |edge|
          contributions << { label: edge.name, value: 1 }
        end
      end
      statistic(:parry, contributions)
    end

    def toughness
      vigor = @traits[:attributes]["vigor"]
      armor = worn_armor
      contributions = [
        { label: "Base Toughness", value: 2 },
        { label: "Half Vigor (#{vigor[:die]})", value: half_die(vigor[:die], vigor[:modifier]) }
      ]
      result = statistic(:toughness, contributions)
      result[:value] += armor
      result[:armor] = armor
      result[:contributions] << { label: "Armor", value: armor }
      result
    end

    def equipped_profiles
      @equipped_profiles ||= @character.character_gears.select(&:equipped).map(&:combat_profile)
    end

    def worn_armor
      equipped_profiles.reject(&:shield?).map(&:armor).max || 0
    end

    private

    def statistic(key, contributions)
      contributions += modifier_contributions(key)
      { value: [ contributions.sum { |contribution| contribution[:value] }, 1 ].max, contributions: contributions }
    end

    def modifier_contributions(key)
      edges = @character.edges.filter_map do |edge|
        value = EDGE_MODIFIERS.dig(edge.slug, key)
        { label: edge.name, value: value } if value
      end
      hindrances = @character.hindrances.filter_map do |hindrance|
        value = HINDRANCE_MODIFIERS.dig(hindrance.slug, key)
        { label: hindrance.name, value: value } if value
      end
      edges + hindrances
    end

    def half_die(die, modifier)
      (die.delete_prefix("d").to_i + [ modifier.to_i, 0 ].max) / 2
    end
  end
end
