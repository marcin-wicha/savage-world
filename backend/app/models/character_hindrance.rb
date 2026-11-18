class CharacterHindrance < ApplicationRecord
  belongs_to :character
  belongs_to :hindrance

  SEVERITIES = %w[minor major].freeze

  validates :hindrance_id, uniqueness: { scope: :character_id }
  validates :severity, inclusion: { in: SEVERITIES }, allow_nil: true

  def points
    effective_severity == "major" ? 2 : 1
  end

  def effective_severity
    hindrance.severity == "minor_or_major" ? (severity || "minor") : hindrance.severity
  end
end
