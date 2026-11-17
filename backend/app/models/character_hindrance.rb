class CharacterHindrance < ApplicationRecord
  enum :severity, { minor: 0, major: 1 }, validate: true

  belongs_to :character
  belongs_to :hindrance

  validates :hindrance_id, uniqueness: { scope: :character_id }

  def points
    major? ? 2 : 1
  end
end
