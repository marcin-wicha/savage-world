class SavageWorldsSchema < GraphQL::Schema
  query Types::QueryType

  use GraphQL::Dataloader

  max_depth 12
  max_complexity 300
end
