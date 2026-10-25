class CharacterSkill < ApplicationRecord
  belongs_to :character
  belongs_to :skill

  DICE = %w[d4 d6 d8 d10 d12].freeze

  validates :skill_id, uniqueness: { scope: :character_id }
  validates :die, inclusion: { in: DICE }
end
