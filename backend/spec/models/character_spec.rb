require "rails_helper"

RSpec.describe Character, type: :model do
  subject(:character) { build(:character) }

  it { is_expected.to be_valid }

  it { is_expected.to belong_to(:user) }
  it { is_expected.to belong_to(:origin).optional }
  it { is_expected.to validate_presence_of(:name) }
  it { is_expected.to have_many(:character_edges).dependent(:destroy) }
  it { is_expected.to have_many(:edges).through(:character_edges) }
  it { is_expected.to have_many(:character_hindrances).dependent(:destroy) }
  it { is_expected.to have_many(:hindrances).through(:character_hindrances) }
  it { is_expected.to have_many(:character_skills).dependent(:destroy) }
  it { is_expected.to have_many(:skills).through(:character_skills) }

  it "defaults rank to novice" do
    expect(described_class.new.rank).to eq("novice")
  end

  it "requires a known rank" do
    character.rank = "unknown"

    expect(character).not_to be_valid
    expect(character.errors[:rank]).to be_present
  end

  it "normalizes the name" do
    character = build(:character, name: "  Nathan Drake  ")

    character.validate

    expect(character.name).to eq("Nathan Drake")
  end

  it "exposes selected edges, hindrances, and skills" do
    character = create(:character)
    edge = create(:edge)
    hindrance = create(:hindrance)
    skill = create(:skill)

    character.edges << edge
    character.hindrances << hindrance
    character.skills << skill

    expect(character.reload.edges).to contain_exactly(edge)
    expect(character.hindrances).to contain_exactly(hindrance)
    expect(character.skills).to contain_exactly(skill)
  end
end
