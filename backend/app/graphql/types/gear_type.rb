module Types
  class GearType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :slug, String, null: false
    field :category, Types::GearCategoryEnum, null: false
    field :cost, Float, null: true
    field :cost_text, String, null: false
    field :requirements, GraphQL::Types::JSON, null: false
    field :effects, GraphQL::Types::JSON, null: false
    field :description, String, null: true
    field :artwork_url, String, null: true
    field :source_book, String, null: false
    field :source_page, Integer, null: false

    def name
      translated(:name)
    end

    def cost_text
      translated(:cost_text)
    end

    def description
      translated(:description)
    end
  end
end
