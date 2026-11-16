class PartyMembership < ApplicationRecord
  enum :status, { pending: 0, accepted: 1 }, validate: true

  belongs_to :party
  belongs_to :character

  validates :character_id, uniqueness: { scope: :party_id }
end
