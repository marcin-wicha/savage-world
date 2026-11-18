module Battles
  class Simulator
    MAX_RUNS = 200

    def initialize(definitions:, settings:, seed:, runs: 1)
      @definitions = definitions
      @settings = settings.is_a?(Settings) ? settings : Settings.new(settings)
      @seed = seed
      @runs = runs.clamp(1, MAX_RUNS)
    end

    def call
      results = Array.new(@runs) do |index|
        Engine.new(definitions: @definitions, settings: @settings, seed: @seed + index, record: index.zero?).run
      end

      { summary: summarize(results), log: results.first.log, final_state: results.first.combatants }
    end

    private

    def summarize(results)
      rounds = results.map(&:rounds).sort
      {
        runs: results.length,
        wins: Engine::SIDES.index_with { |side| results.count { |result| result.winner == side } },
        draws: results.count { |result| result.winner == "draw" },
        party_win_rate: (results.count { |result| result.winner == "party" }.to_f / results.length).round(4),
        average_rounds: (rounds.sum.to_f / rounds.length).round(2),
        median_rounds: median(rounds),
        first_run: { winner: results.first.winner, rounds: results.first.rounds },
        run_results: results.each_with_index.map { |result, index| Runs.result_for(result, index) },
        combatants: combatant_statistics(results)
      }
    end

    def combatant_statistics(results)
      results.flat_map(&:combatants).group_by { |combatant| combatant[:id] }.map do |id, entries|
        count = entries.length.to_f
        {
          id: id,
          name: entries.first[:name],
          side: entries.first[:side],
          incapacitated_rate: (entries.count { |entry| entry[:incapacitated] } / count).round(4),
          death_rate: (entries.count { |entry| entry[:dead] } / count).round(4),
          fled_rate: (entries.count { |entry| entry[:fled] } / count).round(4),
          average_wounds: (entries.sum { |entry| entry[:wounds] } / count).round(2),
          average_bennies_spent: (entries.sum { |entry| entry[:bennies_spent] } / count).round(2)
        }
      end
    end

    def median(values)
      middle = values.length / 2
      values.length.odd? ? values[middle] : ((values[middle - 1] + values[middle]) / 2.0)
    end
  end
end
