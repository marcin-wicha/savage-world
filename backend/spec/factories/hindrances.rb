FactoryBot.define do
  factory :hindrance do
    sequence(:name) { |n| "Hindrance #{n}" }
    sequence(:slug) { |n| "hindrance-#{n}" }
    severity { "minor" }
    requirements { [] }
    source_book { "SWADE" }
    source_page { 22 }
  end
end
