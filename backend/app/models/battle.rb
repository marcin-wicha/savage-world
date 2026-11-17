class Battle < ApplicationRecord
  belongs_to :party
  belongs_to :user

  validates :seed, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :runs, numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: Battles::Simulator::MAX_RUNS }
end
