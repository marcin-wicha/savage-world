require "rails_helper"
require "yaml"

RSpec.describe ReferenceData::Translations do
  it "has Polish names for every tracked core reference record" do
    {
      origin: [ "origins", "db/data/origins/cultures.yml" ],
      edge: [ "edges", "db/data/edges/swade.yml" ],
      hindrance: [ "hindrances", "db/data/hindrances/swade.yml" ],
      skill: [ "skills", "db/data/skills/swade.yml" ]
    }.each do |resource, (collection, path)|
      YAML.load_file(Rails.root.join(path)).fetch(collection).each do |record|
        expect(
          I18n.t(
            "reference_data.#{resource}.#{record.fetch('slug')}.name",
            locale: :pl,
            default: nil
          )
        ).to be_present, "missing Polish name for #{resource} #{record.fetch('slug')}"
      end
    end
  end

  it "has Polish descriptions for every tracked core edge and skill" do
    {
      edge: [ "edges", "db/data/edges/swade.yml" ],
      skill: [ "skills", "db/data/skills/swade.yml" ]
    }.each do |resource, (collection, path)|
      YAML.load_file(Rails.root.join(path)).fetch(collection).each do |record|
        expect(
          I18n.t(
            "reference_data.#{resource}.#{record.fetch('slug')}.description",
            locale: :pl,
            default: nil
          )
        ).to be_present, "missing Polish description for #{resource} #{record.fetch('slug')}"
      end
    end
  end

  it "has Polish descriptions for every tracked core hindrance" do
    records = YAML.load_file(Rails.root.join("db/data/hindrances/swade.yml")).fetch("hindrances")

    records.each do |record|
      expect(
        I18n.t(
          "reference_data.hindrance.#{record.fetch('slug')}.description",
          locale: :pl,
          default: nil
        )
      ).to be_present, "missing Polish description for hindrance #{record.fetch('slug')}"
    end
  end

  it "falls back to the canonical value for unknown and English records" do
    expect(described_class.translate(:edge, "unknown", :name, "Unknown Edge", locale: :pl))
      .to eq("Unknown Edge")
    expect(described_class.translate(:edge, "ace", :name, "Ace", locale: :en)).to eq("Ace")
    expect(described_class.normalize_locale("pl-PL")).to eq(:pl)
    expect(described_class.normalize_locale("de")).to eq(:en)
  end
end
