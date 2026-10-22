module Types
  class HindranceType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :slug, String, null: false
    field :severity, Types::HindranceSeverityEnum, null: false
    field :requirements, [ Types::RequirementType ], null: false
    field :requirements_text, String, null: false
    field :source_book, String, null: false
    field :source_page, Integer, null: false
  end
end
