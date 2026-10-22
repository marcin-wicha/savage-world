require "rails_helper"

RSpec.describe Edge, type: :model do
  subject(:edge) { build(:edge) }

  it { is_expected.to be_valid }

  it { is_expected.to validate_presence_of(:name) }
  it { is_expected.to validate_uniqueness_of(:slug) }
  it { is_expected.to validate_numericality_of(:source_page).only_integer.is_greater_than(0) }

  it "requires a known category" do
    edge.category = "unknown"

    expect(edge).not_to be_valid
    expect(edge.errors[:category]).to be_present
  end

  it "requires a known source book" do
    edge.source_book = "Unknown Book"

    expect(edge).not_to be_valid
    expect(edge.errors[:source_book]).to be_present
  end

  it "requires a known rank" do
    edge.minimum_rank = "unknown"

    expect(edge).not_to be_valid
    expect(edge.errors[:minimum_rank]).to be_present
  end

  it "generates a slug from the name" do
    edge = build(:edge, name: "Dead Shot", slug: nil)

    edge.validate

    expect(edge.slug).to eq("dead-shot")
  end

  it "requires a slug when there is no name to generate one from" do
    edge = build(:edge, name: nil, slug: nil)

    expect(edge).not_to be_valid
    expect(edge.errors[:slug]).to be_present
  end

  it "normalizes the name" do
    edge = build(:edge, name: "  Dead Shot  ")

    edge.validate

    expect(edge.name).to eq("Dead Shot")
  end

  it "defaults repeatable to false" do
    expect(described_class.new.repeatable).to be(false)
  end

  it "rejects malformed requirements" do
    edge.requirements = [ { "kind" => "attribute", "attribute" => "luck", "die" => 7 } ]

    expect(edge).not_to be_valid
    expect(edge.errors[:requirements]).to include(
      "clause 0.attribute must be one of: agility, smarts, spirit, strength, vigor",
      "clause 0.die must be one of: 4, 6, 8, 10, 12"
    )
  end

  describe "#requirements_text" do
    it "combines the rank, AND clauses, and OR clauses" do
      edge = build(
        :edge,
        minimum_rank: "novice",
        requirements: [
          { "kind" => "wild_card" },
          {
            "kind" => "any",
            "clauses" => [
              { "kind" => "skill", "skill" => "athletics", "die" => 8 },
              { "kind" => "skill", "skill" => "shooting", "die" => 8 }
            ]
          }
        ]
      )

      expect(edge.requirements_text).to eq("Novice, Wild Card, Athletics d8+ or Shooting d8+")
    end

    it "returns only the rank when there are no requirements" do
      edge = build(:edge, minimum_rank: "seasoned", requirements: [])

      expect(edge.requirements_text).to eq("Seasoned")
    end
  end
end
