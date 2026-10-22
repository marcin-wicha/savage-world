module Types
  class EdgeType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :slug, String, null: false
    field :category, Types::EdgeCategoryEnum, null: false
    field :minimum_rank, Types::RankEnum, null: false
    field :requirements, [ Types::RequirementType ], null: false
    field :requirements_text, String, null: false
    field :source_book, String, null: false
    field :source_page, Integer, null: false
    field :repeatable, Boolean, null: false
  end
end
