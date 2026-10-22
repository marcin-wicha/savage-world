module Types
  class RankEnum < Types::BaseEnum
    graphql_name "Rank"

    value "novice"
    value "seasoned"
    value "veteran"
    value "heroic"
    value "legendary"
  end
end
