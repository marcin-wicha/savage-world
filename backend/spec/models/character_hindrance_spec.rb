require "rails_helper"

RSpec.describe CharacterHindrance, type: :model do
  subject(:character_hindrance) { build(:character_hindrance) }

  it { is_expected.to be_valid }

  it { is_expected.to belong_to(:character) }
  it { is_expected.to belong_to(:hindrance) }
  it { is_expected.to define_enum_for(:severity).with_values(minor: 0, major: 1).validating }

  it "is worth one hindrance point when minor and two when major" do
    expect(build(:character_hindrance, severity: :minor).points).to eq(1)
    expect(build(:character_hindrance, severity: :major).points).to eq(2)
  end

  it "allows each hindrance only once per character" do
    character = create(:character)
    hindrance = create(:hindrance)
    create(:character_hindrance, character: character, hindrance: hindrance)

    duplicate = build(:character_hindrance, character: character, hindrance: hindrance)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:hindrance_id]).to be_present
  end
end
