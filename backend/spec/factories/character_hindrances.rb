FactoryBot.define do
  factory :character_hindrance do
    association :character
    association :hindrance
  end
end
