module Battles
  # Every run is seeded with battle.seed + index, so any run's full log can be
  # replayed exactly from the stored roster and settings instead of storing it.
  class Runs
    def self.result_for(result, index)
      { index: index, winner: result.winner, rounds: result.rounds }
    end

    def initialize(battle)
      @battle = battle
    end

    def results
      stored = @battle.summary.with_indifferent_access[:run_results]
      return stored if stored.is_a?(Array)

      Array.new(@battle.runs) { |index| self.class.result_for(engine(index, record: false).run, index) }
    end

    def replay(index)
      raise ActiveRecord::RecordNotFound unless index.between?(0, @battle.runs - 1)

      result = engine(index, record: true).run
      self.class.result_for(result, index).merge(log: result.log)
    end

    private

    def engine(index, record:)
      Engine.new(definitions: @battle.roster, settings: @battle.settings, seed: @battle.seed + index, record: record)
    end
  end
end
