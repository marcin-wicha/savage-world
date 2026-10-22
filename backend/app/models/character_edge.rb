class CharacterEdge < ApplicationRecord
  belongs_to :character
  belongs_to :edge

  validates :edge_id, uniqueness: { scope: :character_id }
end
