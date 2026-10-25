require "rails_helper"
require "yaml"

RSpec.describe "origin seed data" do
  let(:path) { Rails.root.join("db/data/origins/cultures.yml") }
  let(:document) { YAML.safe_load_file(path, permitted_classes: [], aliases: false) }
  let(:origins) { document.fetch("origins") }

  it "contains the nine cultures from the worldbuilding source" do
    expect(origins.size).to eq(9)
    expect(origins.map { |origin| origin["slug"] }).to contain_exactly(
      "dunestriders",
      "greenbloods",
      "stepperiders",
      "the-darkfolk",
      "the-emberborn",
      "the-leagueborn",
      "the-mirrorfolk",
      "the-shieldborn",
      "wind-wall-barbarians"
    )
  end

  it "contains valid origin records" do
    origins.each do |attributes|
      origin = Origin.new(attributes)
      expect(origin).to be_valid, "#{attributes['name']}: #{origin.errors.full_messages.to_sentence}"
    end
  end
end
