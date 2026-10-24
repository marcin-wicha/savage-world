FactoryBot.define do
  factory :gear do
    sequence(:name) { |n| "Gear #{n}" }
    sequence(:slug) { |n| "gear-#{n}" }
    category { "general" }
    cost { 10 }
    cost_text { "10" }
    requirements { [] }
    effects { {} }
    source_book { "Fantasy Companion" }
    source_page { 47 }
  end
end
