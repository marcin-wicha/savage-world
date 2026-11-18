require "rails_helper"

RSpec.describe EnemyTemplatePolicy do
  subject(:policy) { described_class.new(user, template) }

  let(:owner) { create(:user) }
  let(:template) { create(:enemy_template, user: owner) }

  context "when the user owns the template" do
    let(:user) { owner }

    it { is_expected.to be_show }
    it { is_expected.to be_update }
    it { is_expected.to be_destroy }
  end

  context "when the template is seeded reference data" do
    let(:user) { create(:user) }
    let(:template) { create(:enemy_template, user: owner, source_key: "goblin") }

    it { is_expected.to be_show }
    it { is_expected.not_to be_update }
    it { is_expected.not_to be_destroy }

    it "cannot be modified by its owner either" do
      owner_policy = described_class.new(owner, template)
      expect(owner_policy).not_to be_update
      expect(owner_policy).not_to be_destroy
    end
  end

  context "when the user does not own the template" do
    let(:user) { create(:user) }

    it { is_expected.not_to be_show }
    it { is_expected.not_to be_update }
    it { is_expected.not_to be_destroy }
  end

  context "without a user" do
    let(:user) { nil }

    it { is_expected.not_to be_show }
    it { is_expected.not_to be_create }
    it { is_expected.not_to be_index }
  end

  describe "scope" do
    it "returns the user's templates and shared reference data, but not other users' custom templates" do
      mine = create(:enemy_template, user: owner)
      shared = create(:enemy_template, source_key: "goblin")
      create(:enemy_template)

      expect(described_class::Scope.new(owner, EnemyTemplate).resolve).to contain_exactly(mine, shared)
      expect(described_class::Scope.new(nil, EnemyTemplate).resolve).to be_empty
    end
  end
end
