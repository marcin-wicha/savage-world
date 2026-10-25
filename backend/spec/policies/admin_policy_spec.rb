require "rails_helper"

RSpec.describe AdminPolicy do
  subject(:policy) { described_class.new(user, :admin) }

  context "with an admin user" do
    let(:user) { build(:user, role: :admin) }

    it { is_expected.to be_manage }
  end

  context "with a regular user" do
    let(:user) { build(:user, role: :user) }

    it { is_expected.not_to be_manage }
  end

  context "without a user" do
    let(:user) { nil }

    it { is_expected.not_to be_manage }
  end
end
