module Types
  class EdgeRequirementKindEnum < Types::BaseEnum
    graphql_name "EdgeRequirementKind"

    value "any"
    value "arcane_background"
    value "attribute"
    value "edge"
    value "hindrance"
    value "skill"
    value "special"
    value "wild_card"
  end
end
