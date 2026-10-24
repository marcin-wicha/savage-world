class Gear < ApplicationRecord
  CATEGORIES = %w[
    general animal food clothing pack lifestyle hireling lodging travel
    material poison armor shield barding melee_weapon ammunition ranged_weapon
    black_powder_weapon cannon siege_engine alchemical_item
  ].freeze
  SOURCE_BOOKS = [ "Fantasy Companion" ].freeze

  normalizes :name, with: ->(name) { name.strip }

  before_validation :assign_slug, if: -> { slug.blank? && name.present? }
  before_validation :assign_cost_text, if: -> { cost_text.blank? }

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true
  validates :category, presence: true, inclusion: { in: CATEGORIES }
  validates :cost, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :cost_text, presence: true
  validates :source_book, presence: true, inclusion: { in: SOURCE_BOOKS }
  validates :source_page, numericality: { only_integer: true, greater_than: 0 }
  validate :requirements_are_an_array
  validate :effects_are_a_hash

  private

  def assign_slug
    self.slug = name.parameterize
  end

  def assign_cost_text
    self.cost_text = cost.present? ? cost.to_s : "—"
  end

  def requirements_are_an_array
    errors.add(:requirements, "must be an array") unless requirements.is_a?(Array)
  end

  def effects_are_a_hash
    errors.add(:effects, "must be an object") unless effects.is_a?(Hash)
  end
end
