require "rails_helper"

RSpec.describe Session, type: :model do
  subject(:session) { build(:session) }

  it { is_expected.to belong_to(:user) }
  it { is_expected.to be_valid }
end
