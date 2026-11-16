class User < ApplicationRecord
  has_secure_password

  enum :role, { user: 0, admin: 1 }, validate: true
  has_many :sessions, dependent: :destroy
  has_many :characters, dependent: :destroy
  has_many :led_parties, class_name: "Party", foreign_key: :leader_id, inverse_of: :leader, dependent: :destroy

  scope :pending, -> { where(approved: false) }

  normalizes :email_address, with: ->(e) { e.strip.downcase }

  validates :email_address, presence: true, uniqueness: { case_sensitive: false }
end
