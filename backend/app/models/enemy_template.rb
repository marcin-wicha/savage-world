class EnemyTemplate < ApplicationRecord
  ATTRIBUTES = %w[agility smarts spirit strength vigor].freeze
  ABILITIES = %w[fearless undead construct hardy elemental resilient very_resilient].freeze

  belongs_to :user

  normalizes :name, with: ->(name) { name.strip }
  normalizes :description, with: ->(description) { description.strip.presence }

  validates :name, presence: true, length: { maximum: 100 }
  validates :description, length: { maximum: 5000 }
  validates :pace, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 48 }
  validates :parry, :toughness, numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 40 }
  validates :armor, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 30 }
  validates :size, numericality: { only_integer: true, greater_than_or_equal_to: -4, less_than_or_equal_to: 20 }
  validates :bennies, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 10 }
  validate :armor_within_toughness
  validate :stat_block_is_valid

  def weapon_profiles
    Array(weapons).map { |weapon| Gears::CombatProfile.new(weapon) }
  end

  private

  def armor_within_toughness
    errors.add(:armor, "cannot exceed Toughness") if armor.to_i >= toughness.to_i && toughness.present?
  end

  def stat_block_is_valid
    EnemyTemplates::Validator.new(self).errors.each do |attribute, messages|
      messages.each { |message| errors.add(attribute, message) }
    end
  end
end
