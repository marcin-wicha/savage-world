FactoryBot.define do
  factory :skill do
    sequence(:name) { |n| "Skill #{n}" }
    sequence(:slug) { |n| "skill-#{n}" }
    linked_attribute { "agility" }
    core { false }
    source_book { "SWADE" }
    source_page { 29 }
  end
end
