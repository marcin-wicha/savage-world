require "rails_helper"

RSpec.describe CharacterGear do
  subject { build(:character_gear) }

  it { is_expected.to belong_to(:character) }
  it { is_expected.to belong_to(:gear) }
  it { is_expected.to validate_uniqueness_of(:gear_id).scoped_to(:character_id) }
  it { is_expected.to validate_numericality_of(:quantity).only_integer.is_greater_than_or_equal_to(1).is_less_than_or_equal_to(99) }

  it "is removed with its character" do
    selection = create(:character_gear)

    expect { selection.character.destroy }.to change(described_class, :count).by(-1)
  end

  it "exposes the gear combat profile" do
    gear = create(:gear, name: "Long Sword", category: "melee_weapon", effects: { "damage" => "Str+d8" })

    expect(build(:character_gear, gear: gear).combat_profile.damage).to eq(strength: true, dice: [ { count: 1, sides: 8 } ], modifier: 0)
  end
end
