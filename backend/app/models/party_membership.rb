class PartyMembership < ApplicationRecord
  enum :status, { pending: 0, accepted: 1 }, validate: true

  belongs_to :party
  belongs_to :character

  validates :character_id, uniqueness: { scope: :party_id }
  validate :character_can_join, on: :create

  def self.join_error_for(character)
    if character.draft?
      "must be finished before joining a party"
    elsif character.dead?
      "cannot join a party while dead"
    end
  end

  private

  def character_can_join
    message = character && self.class.join_error_for(character)
    errors.add(:character_id, message) if message
  end
end
