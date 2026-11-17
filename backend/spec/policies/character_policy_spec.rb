require "rails_helper"

RSpec.describe CharacterPolicy do
  subject(:policy) { described_class.new(user, character) }

  let(:owner) { create(:user) }
  let(:character) { build(:character, user: owner) }
  let(:user) { owner }

  it { is_expected.to be_upsert }
  it { is_expected.to be_create }
  it { is_expected.to be_update }
  it { is_expected.to be_show }
  it { is_expected.to be_destroy }
  it { is_expected.to be_update_avatar }
  it { is_expected.to be_view_avatar }

  describe "#view_avatar?" do
    let(:character) { create(:character, user: owner) }
    let(:party) { create(:party) }

    context "when the user leads a party the character belongs to or requested" do
      let(:user) { party.leader }

      before { create(:party_membership, :pending, party: party, character: character) }

      it { is_expected.to be_view_avatar }
      it { is_expected.not_to be_update_avatar }
    end

    context "when the user has an accepted character in the same party" do
      let(:user) { create(:user) }

      before do
        create(:party_membership, party: party, character: character)
        create(:party_membership, party: party, character: create(:character, user: user))
      end

      it { is_expected.to be_view_avatar }
    end

    context "when the character's membership is still pending" do
      let(:user) { create(:user) }

      before do
        create(:party_membership, :pending, party: party, character: character)
        create(:party_membership, party: party, character: create(:character, user: user))
      end

      it { is_expected.not_to be_view_avatar }
    end

    context "when the user's own membership is pending" do
      let(:user) { create(:user) }

      before do
        create(:party_membership, party: party, character: character)
        create(:party_membership, :pending, party: party, character: create(:character, user: user))
      end

      it { is_expected.not_to be_view_avatar }
    end
  end

  context "when the user does not own the character" do
    let(:user) { create(:user) }

    it { is_expected.not_to be_upsert }
    it { is_expected.not_to be_create }
    it { is_expected.not_to be_update }
    it { is_expected.not_to be_show }
    it { is_expected.not_to be_destroy }
    it { is_expected.not_to be_update_avatar }
    it { is_expected.not_to be_view_avatar }
  end

  context "without a user" do
    let(:user) { nil }

    it { is_expected.not_to be_upsert }
    it { is_expected.not_to be_view_avatar }
  end
end
