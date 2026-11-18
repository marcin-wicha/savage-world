require "rails_helper"

RSpec.describe PartyMembership do
  subject(:membership) { build(:party_membership) }

  it { is_expected.to belong_to(:party) }
  it { is_expected.to belong_to(:character) }
  it { is_expected.to define_enum_for(:status).with_values(pending: 0, accepted: 1).validating }

  it "only lets finished, living characters join" do
    expect(build(:party_membership, character: create(:character, :draft))).not_to be_valid
    expect(build(:party_membership, character: create(:character, status: :dead))).not_to be_valid
    expect(build(:party_membership, character: create(:character))).to be_valid
  end

  it "keeps a membership valid when its character later dies" do
    membership = create(:party_membership)
    membership.character.update!(status: :dead)

    expect(membership.reload).to be_valid
  end

  it "allows a character to join a party only once" do
    existing = create(:party_membership)
    duplicate = build(:party_membership, party: existing.party, character: existing.character)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:character_id]).to be_present
  end

  it "allows a character to belong to several parties" do
    character = create(:character)
    create(:party_membership, character: character)

    expect(build(:party_membership, character: character)).to be_valid
  end

  it "is removed when its character is deleted" do
    membership = create(:party_membership)

    expect { membership.character.destroy! }.to change(described_class, :count).by(-1)
    expect(Party.exists?(membership.party_id)).to be(true)
  end
end
