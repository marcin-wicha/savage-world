class CharacterDraft < ApplicationRecord
  MAX_PER_USER = 20
  MAX_DATA_BYTES = 100.kilobytes
  MAX_STEP = 20

  belongs_to :user

  validates :step, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: MAX_STEP }
  validate :data_is_bounded_object
  validate :within_user_limit, on: :create

  def name
    concept = data.is_a?(Hash) ? data["concept"] : nil
    concept.is_a?(Hash) && concept["name"].is_a?(String) ? concept["name"].strip.first(60) : ""
  end

  private

  def data_is_bounded_object
    if !data.is_a?(Hash)
      errors.add(:data, "must be an object")
    elsif data.to_json.bytesize > MAX_DATA_BYTES
      errors.add(:data, "is too large")
    end
  end

  def within_user_limit
    return if user.nil? || user.character_drafts.count < MAX_PER_USER

    errors.add(:base, "You can keep at most #{MAX_PER_USER} drafts. Finish or discard one first.")
  end
end
