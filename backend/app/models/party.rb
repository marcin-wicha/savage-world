class Party < ApplicationRecord
  belongs_to :leader, class_name: "User"

  has_many :party_memberships, dependent: :destroy
  has_many :characters, through: :party_memberships

  has_secure_token :invite_code

  normalizes :name, with: ->(name) { name.strip }
  normalizes :description, with: ->(description) { description.strip.presence }

  validates :name, presence: true, length: { maximum: 100 }
  validates :description, length: { maximum: 2000 }

  def leader?(user)
    user.present? && leader_id == user.id
  end

  def participant?(user)
    user.present? && party_memberships.accepted.joins(:character).exists?(characters: { user_id: user.id })
  end

  def member_owner?(user_id)
    party_memberships.accepted.joins(:character).exists?(characters: { user_id: user_id })
  end
end
