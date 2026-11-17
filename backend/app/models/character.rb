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

  has_many :character_gears, dependent: :destroy
  has_many :gears, through: :character_gears

  has_many :party_memberships, dependent: :destroy
  has_many :parties, through: :party_memberships

  normalizes :name, with: ->(name) { name.strip }
  normalizes :description, with: ->(description) { description.strip }

  validates :name, presence: true
  validates :description, length: { maximum: 500 }
  validate :attributes_are_valid

  def hindrance_points_earned
    character_hindrances.sum(&:points)
  end

  private

  def attributes_are_valid
    expected = %w[agility smarts spirit strength vigor]
    valid_dice = CharacterSkill::DICE
    unless self[:attribute_dice].is_a?(Hash) && self[:attribute_dice].stringify_keys.keys.sort == expected.sort &&
        self[:attribute_dice].values.all? { |die| valid_dice.include?(die) }
      errors.add(:attributes, "must contain valid dice for all five attributes")
    end
  end
end
