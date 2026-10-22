class Skill < ApplicationRecord
  ATTRIBUTES = %w[agility smarts spirit strength vigor].freeze
  SOURCE_BOOKS = [ "SWADE", "Fantasy Companion" ].freeze

  normalizes :name, with: ->(name) { name.strip }

  before_validation :assign_slug, if: -> { slug.blank? && name.present? }

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true
  validates :linked_attribute, presence: true, inclusion: { in: ATTRIBUTES }
  validates :core, inclusion: { in: [ true, false ] }
  validates :source_book, presence: true, inclusion: { in: SOURCE_BOOKS }
  validates :source_page, numericality: { only_integer: true, greater_than: 0 }

  private

  def assign_slug
    self.slug = name.parameterize
  end
end
