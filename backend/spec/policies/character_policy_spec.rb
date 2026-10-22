require "rails_helper"

RSpec.describe CharacterPolicy do
  subject(:policy) { described_class.new(user, character) }

  let(:owner) { create(:user) }
  let(:character) { build(:character, user: owner) }
  let(:user) { owner }

  it { is_expected.to be_upsert }
  it { is_expected.to be_create }
  it { is_expected.to be_update }

  context "when the user does not own the character" do
    let(:user) { create(:user) }

    it { is_expected.not_to be_upsert }
    it { is_expected.not_to be_create }
    it { is_expected.not_to be_update }
  end

  context "without a user" do
    let(:user) { nil }

    it { is_expected.not_to be_upsert }
  end
end
