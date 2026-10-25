require "rails_helper"

RSpec.describe Origin, type: :model do
  subject(:origin) { build(:origin) }

  it { is_expected.to be_valid }
  it { is_expected.to validate_presence_of(:name) }
  it { is_expected.to validate_uniqueness_of(:slug) }
  it { is_expected.to validate_presence_of(:description) }
  it { is_expected.to have_many(:characters).dependent(:nullify) }

  it "generates a slug from the name" do
    origin = build(:origin, name: "The Mirrorfolk", slug: nil)

    origin.validate

    expect(origin.slug).to eq("the-mirrorfolk")
  end
end
