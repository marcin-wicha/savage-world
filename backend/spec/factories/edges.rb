FactoryBot.define do
  factory :edge do
    sequence(:name) { |n| "Edge #{n}" }
    sequence(:slug) { |n| "edge-#{n}" }
    category { "combat" }
    minimum_rank { "novice" }
    requirements { [] }
    source_book { "SWADE" }
    source_page { 1 }
    repeatable { false }
  end
end
