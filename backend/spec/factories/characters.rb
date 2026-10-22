FactoryBot.define do
  factory :character do
    association :user
    sequence(:name) { |n| "Character #{n}" }
    rank { "novice" }
  end
end
