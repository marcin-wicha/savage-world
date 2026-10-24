require "rails_helper"

RSpec.describe Gear, type: :model do
  subject(:gear) { build(:gear) }

  it { is_expected.to be_valid }

  it { is_expected.to validate_presence_of(:name) }
  it { is_expected.to validate_uniqueness_of(:slug) }

  it { is_expected.to validate_numericality_of(:source_page).only_integer.is_greater_than(0) }

  it "requires a known category" do
    gear.category = "unknown"

    expect(gear).not_to be_valid
    expect(gear.errors[:category]).to be_present
  end

  it "derives a display cost when the source has no fixed price" do
    gear.cost = nil
    gear.cost_text = nil

    expect(gear).to be_valid
    expect(gear.cost_text).to eq("—")
  end

  it "generates a slug from the name" do
    gear = build(:gear, name: "Healing Kit", slug: nil)

    gear.validate

    expect(gear.slug).to eq("healing-kit")
  end

  it "rejects weights from the persisted attributes" do
    expect(Gear.column_names).not_to include("weight", "encumbrance")
  end

  it "requires structured requirements and effects" do
    gear.requirements = {}
    gear.effects = []

    expect(gear).not_to be_valid
    expect(gear.errors[:requirements]).to include("must be an array")
    expect(gear.errors[:effects]).to include("must be an object")
  end
end
