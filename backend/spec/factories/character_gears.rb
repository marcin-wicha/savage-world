FactoryBot.define do
  factory :character_gear do
    association :character
    association :gear
    quantity { 1 }
    equipped { false }
  end
end
