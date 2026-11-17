FactoryBot.define do
  factory :enemy_template do
    association :user
    sequence(:name) { |n| "Goblin #{n}" }
    wild_card { false }
    attribute_dice { { "agility" => "d8", "smarts" => "d6", "spirit" => "d6", "strength" => "d6", "vigor" => "d6" } }
    skills { { "fighting" => "d6", "notice" => "d6" } }
    pace { 6 }
    parry { 5 }
    toughness { 5 }
    armor { 0 }
    weapons { [ { "name" => "Short Sword", "damage" => "Str+d6" } ] }
    edge_slugs { [] }
    abilities { [] }

    trait :wild_card do
      wild_card { true }
      bennies { 2 }
    end
  end
end
