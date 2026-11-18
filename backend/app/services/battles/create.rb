module Battles
  class Create
    MAX_COMBATANTS = 30
    MAX_PER_TEMPLATE = 20
    DEFAULT_RUNS = 50

    attr_reader :battle, :errors

    def initialize(user:, party:, params:)
      @user = user
      @party = party
      @params = params.to_h.deep_stringify_keys
      @errors = {}
    end

    def call
      settings = Settings.new(@params["settings"])
      errors[:settings] = settings.errors unless settings.valid?
      runs = parse_runs
      seed = parse_seed
      enemies = parse_enemies
      characters = party_characters
      errors[:party] = [ "has no accepted living characters" ] if characters.empty?
      return false if errors.any?

      definitions = characters.map { |character| CombatantBuilder.from_character(character) } + enemy_definitions(enemies)
      if definitions.length > MAX_COMBATANTS
        errors[:enemies] = [ "cannot bring the battle above #{MAX_COMBATANTS} combatants" ]
        return false
      end

      result = Simulator.new(definitions: definitions, settings: settings, seed: seed, runs: runs).call
      @battle = Battle.create!(
        party: @party,
        user: @user,
        seed: seed,
        runs: runs,
        settings: settings.to_h,
        roster: definitions,
        summary: result[:summary],
        log: result[:log],
        final_state: result[:final_state]
      )
      true
    end

    def forbidden?
      @forbidden == true
    end

    private

    def parse_runs
      return DEFAULT_RUNS unless @params.key?("runs")

      runs = Integer(@params["runs"].to_s, 10, exception: false)
      return runs if runs&.between?(1, Simulator::MAX_RUNS)

      errors[:runs] = [ "must be between 1 and #{Simulator::MAX_RUNS}" ]
      nil
    end

    def parse_seed
      return Random.new_seed % (2**31) if @params["seed"].blank?

      seed = Integer(@params["seed"].to_s, 10, exception: false)
      return seed if seed&.between?(0, (2**31) - 1)

      errors[:seed] = [ "must be an integer between 0 and #{(2**31) - 1}" ]
      nil
    end

    def parse_enemies
      entries = @params["enemies"]
      unless entries.is_a?(Array) && entries.any?
        errors[:enemies] = [ "must include at least one enemy" ]
        return []
      end

      counts = Hash.new(0)
      entries.each do |entry|
        id = Integer(entry.is_a?(Hash) ? entry["enemy_template_id"].to_s : "", 10, exception: false)
        count = Integer(entry.is_a?(Hash) ? entry.fetch("count", 1).to_s : "", 10, exception: false)
        unless id && count&.between?(1, MAX_PER_TEMPLATE)
          errors[:enemies] = [ "must list enemy_template_id with a count between 1 and #{MAX_PER_TEMPLATE}" ]
          return []
        end

        counts[id] += count
      end

      templates = EnemyTemplate.where(id: counts.keys).index_by(&:id)
      missing = counts.keys - templates.keys
      if missing.any?
        errors[:enemies] = [ "contains unknown enemy templates: #{missing.join(', ')}" ]
        return []
      end

      if templates.values.any? { |template| template.user_id != @user.id }
        @forbidden = true
        errors[:enemies] = [ "may only use your own enemy templates" ]
        return []
      end

      counts.map { |id, count| [ templates.fetch(id), count ] }
    end

    def enemy_definitions(enemies)
      enemies.flat_map do |template, count|
        if count == 1
          [ CombatantBuilder.from_enemy_template(template, 0) ]
        else
          (1..count).map { |index| CombatantBuilder.from_enemy_template(template, index) }
        end
      end
    end

    def party_characters
      @party.party_memberships.accepted
        .joins(:character).where(characters: { status: :alive })
        .includes(character: [ :edges, :hindrances, { character_skills: :skill }, { character_gears: :gear } ])
        .order(:id)
        .map(&:character)
    end
  end
end
