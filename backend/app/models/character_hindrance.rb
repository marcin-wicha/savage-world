class CharacterHindrance < ApplicationRecord
  belongs_to :character
  belongs_to :hindrance

  validates :hindrance_id, uniqueness: { scope: :character_id }
end
