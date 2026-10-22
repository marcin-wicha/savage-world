module Types
  class RequirementKindEnum < Types::BaseEnum
    graphql_name "RequirementKind"

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
