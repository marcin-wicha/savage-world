require "rails_helper"

RSpec.describe User, type: :model do
  subject(:user) { build(:user) }

  it { is_expected.to have_secure_password }
  it { is_expected.to have_many(:sessions).dependent(:destroy) }
  it { is_expected.to have_many(:characters).dependent(:destroy) }
  it { is_expected.to validate_presence_of(:email_address) }
  it { is_expected.to validate_uniqueness_of(:email_address).case_insensitive }

  it "normalizes email addresses" do
    user.email_address = "  Player@Example.COM "

    expect(user.email_address).to eq("player@example.com")
  end

  it "authenticates with the correct password" do
    user.save!

    expect(user.authenticate("password123")).to eq(user)
    expect(user.authenticate("wrong-password")).to be(false)
  end
end
