require "rails_helper"

RSpec.describe CharacterDraftPolicy do
  subject(:policy) { described_class.new(user, draft) }

  let(:owner) { create(:user) }
  let(:draft) { create(:character_draft, user: owner) }

  context "when the user owns the draft" do
    let(:user) { owner }

    it { is_expected.to be_index }
    it { is_expected.to be_create }
    it { is_expected.to be_show }
    it { is_expected.to be_update }
    it { is_expected.to be_destroy }
  end

  context "when the user does not own the draft" do
    let(:user) { create(:user) }

    it { is_expected.not_to be_show }
    it { is_expected.not_to be_update }
    it { is_expected.not_to be_destroy }
  end

  context "without a user" do
    let(:user) { nil }

    it { is_expected.not_to be_index }
    it { is_expected.not_to be_create }
    it { is_expected.not_to be_show }
  end

  describe "scope" do
    it "returns only the user's drafts" do
      mine = create(:character_draft, user: owner)
      create(:character_draft)

      expect(described_class::Scope.new(owner, CharacterDraft).resolve).to contain_exactly(mine)
      expect(described_class::Scope.new(nil, CharacterDraft).resolve).to be_empty
    end
  end
end
