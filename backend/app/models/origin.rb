class Origin < ApplicationRecord
  has_many :characters, dependent: :nullify

  normalizes :name, with: ->(name) { name.strip }

  before_validation :assign_slug, if: -> { slug.blank? && name.present? }

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true
  validates :description, presence: true

  private

  def assign_slug
    self.slug = name.parameterize
  end
end
