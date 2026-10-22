require "rails_helper"
require "yaml"

RSpec.describe "SWADE hindrance seed data" do
  let(:path) { Rails.root.join("db/data/hindrances/swade.yml") }
  let(:document) { YAML.safe_load_file(path, permitted_classes: [], aliases: false) }
  let(:hindrances) { document.fetch("hindrances") }

  def find_hindrance(slug)
    hindrances.find { |hindrance| hindrance["slug"] == slug }
  end

  it "contains 57 unique hindrances" do
    expect(hindrances.size).to eq(57)
    expect(hindrances.map { |hindrance| hindrance["slug"] }.uniq.size).to eq(57)
  end

  it "contains only valid hindrances" do
    hindrances.each do |attributes|
      hindrance = Hindrance.new(attributes)
      expect(hindrance).to be_valid, "#{attributes['name']}: #{hindrance.errors.full_messages.to_sentence}"
    end
  end

  it "preserves the severity counts" do
    expect(hindrances.map { |hindrance| hindrance["severity"] }.tally).to eq(
      "minor" => 17,
      "major" => 17,
      "minor_or_major" => 23
    )
  end

  it "marks hindrances with both severities" do
    expect(find_hindrance("bad-eyes")["severity"]).to eq("minor_or_major")
    expect(find_hindrance("hard-of-hearing")["severity"]).to eq("minor_or_major")
    expect(find_hindrance("thin-skinned")["severity"]).to eq("minor_or_major")
  end

  it "does not commit rulebook prose" do
    expect(hindrances.flat_map(&:keys)).not_to include("description", "summary")
  end
end
