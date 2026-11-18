require "rails_helper"

RSpec.describe PartyMembershipPolicy do
  subject(:policy) { described_class.new(user, membership) }

  let(:owner) { create(:user) }
  let(:party) { create(:party) }
  let(:membership) { create(:party_membership, :pending, party: party, character: create(:character, user: owner)) }

  context "when the user leads the party" do
    let(:user) { party.leader }

    it { is_expected.to be_accept }
    it { is_expected.to be_destroy }
    it { is_expected.not_to be_create }
    it { is_expected.not_to be_add }

    context "with their own character" do
      let(:membership) { PartyMembership.new(party: party, character: create(:character, user: party.leader)) }

      it { is_expected.to be_add }
    end
  end

  context "when the user owns the character" do
    let(:user) { owner }

    it { is_expected.to be_create }
    it { is_expected.to be_destroy }
    it { is_expected.not_to be_accept }
    it { is_expected.not_to be_add }
  end

  context "when the user is another participant" do
    let(:user) do
      create(:user).tap { |other| create(:party_membership, party: party, character: create(:character, user: other)) }
    end

    it { is_expected.not_to be_create }
    it { is_expected.not_to be_accept }
    it { is_expected.not_to be_destroy }
  end

  context "without a user" do
    let(:user) { nil }

    it { is_expected.not_to be_create }
    it { is_expected.not_to be_accept }
    it { is_expected.not_to be_destroy }
    it { is_expected.not_to be_add }
  end
end
