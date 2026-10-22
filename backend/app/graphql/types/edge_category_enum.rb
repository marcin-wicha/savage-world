module Types
  class EdgeCategoryEnum < Types::BaseEnum
    graphql_name "EdgeCategory"

    value "background"
    value "combat"
    value "leadership"
    value "legendary"
    value "power"
    value "professional"
    value "social"
    value "weird"
  end
end
