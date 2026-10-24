require "rails_helper"
require "yaml"

RSpec.describe "Fantasy Companion gear data" do
  let(:path) { Rails.root.join("db/data/gear/private/fantasy_companion.yml") }
  let(:document) { YAML.safe_load_file(path, permitted_classes: [], aliases: false) }
  let(:gears) { document.fetch("gears") }

  before do
    skip "Fantasy Companion gear data is kept in the local private data directory" unless File.file?(path)
  end

  it "contains no weight or encumbrance fields" do
    expect(gears.flat_map(&:keys)).not_to include("weight", "encumbrance")
  end

  it "contains unique slugs and valid records" do
    slugs = gears.map { |gear| gear["slug"] || gear.fetch("name").parameterize }
    expect(slugs.uniq.size).to eq(gears.size)

    gears.each do |attributes|
      gear = Gear.new(attributes.merge("source_book" => document.fetch("book")))
      expect(gear).to be_valid, "#{attributes['name']}: #{gear.errors.full_messages.to_sentence}"
    end
  end

  it "includes the major gear sections from the chapter" do
    expect(gears.map { |gear| gear.fetch("category") }).to include(
      "general", "armor", "shield", "melee_weapon", "ranged_weapon",
      "poison", "alchemical_item", "siege_engine"
    )
  end
end
