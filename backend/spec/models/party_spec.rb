require "rails_helper"

RSpec.describe Party do
  subject(:party) { build(:party) }

  it { is_expected.to belong_to(:leader).class_name("User") }
  it { is_expected.to have_many(:party_memberships).dependent(:destroy) }
  it { is_expected.to have_many(:characters).through(:party_memberships) }
  it { is_expected.to validate_presence_of(:name) }
  it { is_expected.to validate_length_of(:name).is_at_most(100) }
  it { is_expected.to validate_length_of(:description).is_at_most(2000) }

  it "strips the name and blanks an empty description" do
    party = create(:party, name: "  The Crew  ", description: "   ")

    expect(party.name).to eq("The Crew")
    expect(party.description).to be_nil
  end

  it "generates a unique invite code that can be regenerated" do
    party = create(:party)
    original = party.invite_code

    party.regenerate_invite_code

    expect(original).to be_present
    expect(party.reload.invite_code).not_to eq(original)
  end

  describe "#leader? and #participant?" do
    let(:party) { create(:party) }
    let(:member) { create(:user) }
    let(:requester) { create(:user) }

    before do
      create(:party_membership, party: party, character: create(:character, user: member))
      create(:party_membership, :pending, party: party, character: create(:character, user: requester))
    end

    it "identifies the leader" do
      expect(party.leader?(party.leader)).to be(true)
      expect(party.leader?(member)).to be(false)
      expect(party.leader?(nil)).to be(false)
    end

    it "counts only owners of accepted characters as participants" do
      expect(party.participant?(member)).to be(true)
      expect(party.participant?(requester)).to be(false)
      expect(party.participant?(party.leader)).to be(false)
      expect(party.participant?(nil)).to be(false)
    end
  end

  it "is destroyed with its leader" do
    party = create(:party)
    create(:party_membership, party: party)

    expect { party.leader.destroy! }.to change(described_class, :count).by(-1).and change(PartyMembership, :count).by(-1)
  end
end
