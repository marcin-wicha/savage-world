class Edge < ApplicationRecord
  CATEGORIES = %w[background combat leadership legendary power professional social weird].freeze
  SOURCE_BOOKS = [ "SWADE", "Fantasy Companion" ].freeze

  enum :minimum_rank, { novice: 0, seasoned: 1, veteran: 2, heroic: 3, legendary: 4 }, validate: true

  normalizes :name, with: ->(name) { name.strip }

  before_validation :assign_slug, if: -> { slug.blank? && name.present? }

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true
  validates :category, presence: true, inclusion: { in: CATEGORIES }
  validates :source_book, presence: true, inclusion: { in: SOURCE_BOOKS }
  validates :source_page, numericality: { only_integer: true, greater_than: 0 }
  validate :requirements_are_valid
  validate :effects_are_valid

  def requirements_text
    Edges::RequirementsText.new(self).to_s
  end

  private

  def assign_slug
    self.slug = name.parameterize
  end

  def requirements_are_valid
    Edges::RequirementsValidator.new(requirements).errors.each do |message|
      errors.add(:requirements, message)
    end
  end

  def effects_are_valid
    Edges::EffectsValidator.new(effects).errors.each do |message|
      errors.add(:effects, message)
    end
  end
end
