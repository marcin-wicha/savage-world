require "rails_helper"

RSpec.describe PartyPolicy do
  subject(:policy) { described_class.new(user, party) }

  let(:party) { create(:party) }
  let(:participant) { create(:user) }
  let(:requester) { create(:user) }

  before do
    create(:party_membership, party: party, character: create(:character, user: participant))
    create(:party_membership, :pending, party: party, character: create(:character, user: requester))
  end

  context "when the user leads the party" do
    let(:user) { party.leader }

    it { is_expected.to be_show }
    it { is_expected.to be_update }
    it { is_expected.to be_destroy }
    it { is_expected.to be_regenerate_invite_code }
    it { is_expected.to be_manage_members }
  end

  context "when the user is a participant" do
    let(:user) { participant }

    it { is_expected.to be_show }
    it { is_expected.not_to be_update }
    it { is_expected.not_to be_destroy }
    it { is_expected.not_to be_regenerate_invite_code }
    it { is_expected.not_to be_manage_members }
  end

  context "when the user only has a pending request" do
    let(:user) { requester }

    it { is_expected.not_to be_show }
    it { is_expected.not_to be_update }
  end

  context "when the user is unrelated" do
    let(:user) { create(:user) }

    it { is_expected.to be_create }
    it { is_expected.not_to be_show }
    it { is_expected.not_to be_destroy }
  end

  context "without a user" do
    let(:user) { nil }

    it { is_expected.not_to be_create }
    it { is_expected.not_to be_show }
    it { is_expected.not_to be_update }
  end

  describe "Scope" do
    it "returns led parties and parties with the user's characters" do
      led = create(:party, leader: participant)
      create(:party)

      expect(described_class::Scope.new(participant, Party).resolve).to contain_exactly(party, led)
      expect(described_class::Scope.new(requester, Party).resolve).to contain_exactly(party)
      expect(described_class::Scope.new(nil, Party).resolve).to be_empty
    end
  end
end
