require "rails_helper"

RSpec.describe CharacterEdge, type: :model do
  subject(:character_edge) { build(:character_edge) }

  it { is_expected.to be_valid }

  it { is_expected.to belong_to(:character) }
  it { is_expected.to belong_to(:edge) }

  it "allows each edge only once per character" do
    character = create(:character)
    edge = create(:edge)
    create(:character_edge, character: character, edge: edge)

    duplicate = build(:character_edge, character: character, edge: edge)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:edge_id]).to be_present
  end
end
