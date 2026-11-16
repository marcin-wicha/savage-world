FactoryBot.define do
  factory :party do
    association :leader, factory: :user
    sequence(:name) { |n| "Party #{n}" }
  end
end
