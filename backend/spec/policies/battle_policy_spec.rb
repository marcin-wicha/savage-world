require "rails_helper"

RSpec.describe BattlePolicy do
  subject(:policy) { described_class.new(user, battle) }

  let(:party) { create(:party) }
  let(:participant) { create(:user) }
  let(:requester) { create(:user) }
  let(:battle) { create(:battle, party: party, user: participant) }

  before do
    create(:party_membership, party: party, character: create(:character, user: participant))
    create(:party_membership, :pending, party: party, character: create(:character, user: requester))
  end

  context "when the user leads the party" do
    let(:user) { party.leader }

    it { is_expected.to be_create }
    it { is_expected.to be_show }
    it { is_expected.to be_destroy }
  end

  context "when the user is an accepted participant who started the battle" do
    let(:user) { participant }

    it { is_expected.to be_create }
    it { is_expected.to be_show }
    it { is_expected.to be_destroy }
  end

  context "when the user is an accepted participant who did not start the battle" do
    let(:user) { participant }
    let(:battle) { create(:battle, party: party, user: party.leader) }

    it { is_expected.to be_show }
    it { is_expected.not_to be_destroy }
  end

  context "when the user only has a pending request" do
    let(:user) { requester }

    it { is_expected.not_to be_create }
    it { is_expected.not_to be_show }
    it { is_expected.not_to be_destroy }
  end

  context "when the user is a stranger" do
    let(:user) { create(:user) }

    it { is_expected.not_to be_show }
    it { is_expected.not_to be_destroy }
  end

  context "without a user" do
    let(:user) { nil }

    it { is_expected.not_to be_create }
    it { is_expected.not_to be_destroy }
  end
end
