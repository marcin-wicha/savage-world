require "rails_helper"

RSpec.describe Skill, type: :model do
  subject(:skill) { build(:skill) }

  it { is_expected.to be_valid }

  it { is_expected.to validate_presence_of(:name) }
  it { is_expected.to validate_uniqueness_of(:slug) }
  it { is_expected.to validate_numericality_of(:source_page).only_integer.is_greater_than(0) }

  it "requires a known linked attribute" do
    skill.linked_attribute = "luck"

    expect(skill).not_to be_valid
    expect(skill.errors[:linked_attribute]).to be_present
  end

  it "requires a known source book" do
    skill.source_book = "Unknown Book"

    expect(skill).not_to be_valid
    expect(skill.errors[:source_book]).to be_present
  end

  it "requires core to be a boolean" do
    skill.core = nil

    expect(skill).not_to be_valid
    expect(skill.errors[:core]).to be_present
  end

  it "generates a slug from the name" do
    skill = build(:skill, name: "Common Knowledge", slug: nil)

    skill.validate

    expect(skill.slug).to eq("common-knowledge")
  end

  it "normalizes the name" do
    skill = build(:skill, name: "  Notice  ")

    skill.validate

    expect(skill.name).to eq("Notice")
  end

  it "defaults core to false" do
    expect(described_class.new.core).to be(false)
  end
end
