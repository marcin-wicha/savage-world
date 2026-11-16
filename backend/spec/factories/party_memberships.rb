FactoryBot.define do
  factory :party_membership do
    association :party
    association :character
    status { "accepted" }

    trait :pending do
      status { "pending" }
    end
  end
end
