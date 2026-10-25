class User < ApplicationRecord
  has_secure_password

  enum :role, { user: 0, admin: 1 }, validate: true
  has_many :sessions, dependent: :destroy
  has_many :characters, dependent: :destroy

  normalizes :email_address, with: ->(e) { e.strip.downcase }

  validates :email_address, presence: true, uniqueness: { case_sensitive: false }
end
