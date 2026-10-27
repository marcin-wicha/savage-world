FactoryBot.define do
  factory :power do
    sequence(:name) { |n| "Power #{n}" }
    sequence(:slug) { |n| "power-#{n}" }
    rank { :novice }
    power_points { "2" }
    duration { "3 rounds" }
    range { "Smarts" }
    summary { "A concise power summary." }
    source_book { "Fantasy Companion" }
    source_page { 146 }
  end
end
