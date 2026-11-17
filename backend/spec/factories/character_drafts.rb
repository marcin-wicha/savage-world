FactoryBot.define do
  factory :character_draft do
    association :user
    data { { "concept" => { "name" => "Katarina Voss", "description" => "" }, "rank" => "novice" } }
    step { 1 }
  end
end
