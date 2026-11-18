FactoryBot.define do
  factory :character do
    association :user
    sequence(:name) { |n| "Character #{n}" }
    rank { "novice" }
    status { "alive" }

    trait :draft do
      status { "draft" }
      name { nil }
    end
  end
end
