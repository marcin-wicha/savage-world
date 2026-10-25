class Character < ApplicationRecord
  enum :rank, { novice: 0, seasoned: 1, veteran: 2, heroic: 3, legendary: 4 }, validate: true

  belongs_to :user
  belongs_to :origin, optional: true

  has_many :character_edges, dependent: :destroy
  has_many :edges, through: :character_edges

  has_many :character_hindrances, dependent: :destroy
  has_many :hindrances, through: :character_hindrances

  has_many :character_skills, dependent: :destroy
  has_many :skills, through: :character_skills

  normalizes :name, with: ->(name) { name.strip }

  validates :name, presence: true
end
