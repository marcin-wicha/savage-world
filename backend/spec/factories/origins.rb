FactoryBot.define do
  factory :origin do
    sequence(:name) { |n| "Origin #{n}" }
    sequence(:slug) { |n| "origin-#{n}" }
    description { "A character origin." }
  end
end
