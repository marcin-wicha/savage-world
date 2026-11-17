class CharacterGear < ApplicationRecord
  belongs_to :character
  belongs_to :gear

  validates :gear_id, uniqueness: { scope: :character_id }
  validates :quantity, numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 99 }

  def combat_profile
    Gears::CombatProfile.new(gear)
  end
end
