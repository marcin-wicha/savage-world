module Types
  class HindranceSeverityEnum < Types::BaseEnum
    graphql_name "HindranceSeverity"

    value "minor"
    value "major"
    value "minor_or_major"
  end
end
