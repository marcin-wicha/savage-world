class Power < ApplicationRecord
  SOURCE_BOOKS = [ "SWADE", "Fantasy Companion" ].freeze

  enum :rank, { novice: 0, seasoned: 1, veteran: 2, heroic: 3, legendary: 4 }, validate: true

  normalizes :name, with: ->(name) { name.strip }

  before_validation :assign_slug, if: -> { slug.blank? && name.present? }

  validates :name, :slug, :power_points, :duration, :range, :summary, presence: true
  validates :slug, uniqueness: true
  validates :source_book, presence: true, inclusion: { in: SOURCE_BOOKS }
  validates :source_page, numericality: { only_integer: true, greater_than: 0 }

  private

  def assign_slug
    self.slug = name.parameterize
  end
end
