class Hindrance < ApplicationRecord
  SOURCE_BOOKS = [ "SWADE", "Fantasy Companion" ].freeze

  enum :severity, { minor: 0, major: 1, minor_or_major: 2 }, validate: true

  normalizes :name, with: ->(name) { name.strip }

  before_validation :assign_slug, if: -> { slug.blank? && name.present? }

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true
  validates :source_book, presence: true, inclusion: { in: SOURCE_BOOKS }
  validates :source_page, numericality: { only_integer: true, greater_than: 0 }
  validate :requirements_are_valid

  def requirements_text(locale: :en)
    Requirements::Text.new(requirements, locale: locale).to_s
  end

  private

  def assign_slug
    self.slug = name.parameterize
  end

  def requirements_are_valid
    Requirements::Validator.new(requirements).errors.each do |message|
      errors.add(:requirements, message)
    end
  end
end
