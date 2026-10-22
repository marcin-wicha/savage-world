require "rails_helper"

RSpec.describe CharacterSkill, type: :model do
  subject(:character_skill) { build(:character_skill) }

  it { is_expected.to be_valid }

  it { is_expected.to belong_to(:character) }
  it { is_expected.to belong_to(:skill) }

  it "allows each skill only once per character" do
    character = create(:character)
    skill = create(:skill)
    create(:character_skill, character: character, skill: skill)

    duplicate = build(:character_skill, character: character, skill: skill)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:skill_id]).to be_present
  end
end
