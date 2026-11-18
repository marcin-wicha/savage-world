require "rails_helper"

RSpec.describe Battles::Simulator do
  let(:definitions) do
    [
      battle_definition("hero", skills: { "fighting" => "d8" }),
      *(1..2).map { |index| battle_definition("bandit-#{index}", side: "enemies", wild_card: false, group: "bandits") }
    ]
  end

  it "aggregates outcomes across seeded runs and keeps the first run's log" do
    result = described_class.new(definitions: definitions, settings: {}, seed: 100, runs: 25).call
    summary = result[:summary]

    expect(summary[:runs]).to eq(25)
    expect(summary[:wins].values.sum + summary[:draws]).to eq(25)
    expect(summary[:party_win_rate]).to eq((summary[:wins]["party"] / 25.0).round(4))
    expect(summary[:combatants].pluck(:id)).to eq(%w[hero bandit-1 bandit-2])
    expect(summary[:combatants].first).to include(:incapacitated_rate, :death_rate, :average_wounds, :average_bennies_spent)
    expect(result[:log].first[:type]).to eq("battle_start")
    expect(result[:final_state].length).to eq(3)
    expect(summary[:run_results].length).to eq(25)
    expect(summary[:run_results].first).to eq(index: 0, winner: summary[:first_run][:winner], rounds: summary[:first_run][:rounds])
  end

  it "can replay any run's log from a stored battle" do
    result = described_class.new(definitions: definitions, settings: {}, seed: 100, runs: 6).call
    battle = build(:battle, seed: 100, runs: 6, roster: JSON.parse(definitions.to_json),
      settings: JSON.parse(Battles::Settings.new({}).to_h.to_json), summary: JSON.parse(result[:summary].to_json))
    runs = Battles::Runs.new(battle)

    expect(JSON.parse(runs.replay(0)[:log].to_json)).to eq(JSON.parse(result[:log].to_json))
    result[:summary][:run_results].each do |expected|
      expect(runs.replay(expected[:index]).slice(:index, :winner, :rounds)).to eq(expected)
    end
    expect { runs.replay(6) }.to raise_error(ActiveRecord::RecordNotFound)
  end

  it "is reproducible for the same seed" do
    first = described_class.new(definitions: definitions, settings: {}, seed: 5, runs: 10).call
    second = described_class.new(definitions: definitions, settings: {}, seed: 5, runs: 10).call

    expect(first).to eq(second)
  end

  it "clamps the number of runs" do
    result = described_class.new(definitions: definitions, settings: { max_rounds: 1 }, seed: 1, runs: 1000).call

    expect(result[:summary][:runs]).to eq(described_class::MAX_RUNS)
  end
end
