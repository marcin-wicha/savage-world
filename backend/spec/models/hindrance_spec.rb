require "rails_helper"

RSpec.describe Hindrance, type: :model do
  subject(:hindrance) { build(:hindrance) }

  it { is_expected.to be_valid }

  it { is_expected.to validate_presence_of(:name) }
  it { is_expected.to validate_uniqueness_of(:slug) }
  it { is_expected.to validate_numericality_of(:source_page).only_integer.is_greater_than(0) }

  it "requires a known source book" do
    hindrance.source_book = "Unknown Book"

    expect(hindrance).not_to be_valid
    expect(hindrance.errors[:source_book]).to be_present
  end

  it "requires a known severity" do
    hindrance.severity = "unknown"

    expect(hindrance).not_to be_valid
    expect(hindrance.errors[:severity]).to be_present
  end

  it "generates a slug from the name" do
    hindrance = build(:hindrance, name: "Bad Eyes", slug: nil)

    hindrance.validate

    expect(hindrance.slug).to eq("bad-eyes")
  end

  it "normalizes the name" do
    hindrance = build(:hindrance, name: "  Bad Eyes  ")

    hindrance.validate

    expect(hindrance.name).to eq("Bad Eyes")
  end

  it "defaults severity to minor" do
    expect(described_class.new.severity).to eq("minor")
  end

  it "rejects malformed requirements" do
    hindrance.requirements = [ { "kind" => "arcane_background", "value" => "" } ]

    expect(hindrance).not_to be_valid
    expect(hindrance.errors[:requirements]).to include(
      "clause 0.value must be a non-empty string"
    )
  end

  describe "#requirements_text" do
    it "renders arcane background requirements" do
      hindrance.requirements = [ { "kind" => "arcane_background", "value" => "any" } ]

      expect(hindrance.requirements_text).to eq("Arcane Background (Any)")
    end

    it "returns an empty string when there are no requirements" do
      expect(hindrance.requirements_text).to eq("")
    end
  end
end
