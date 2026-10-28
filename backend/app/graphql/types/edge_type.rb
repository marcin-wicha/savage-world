module Types
  class EdgeType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :slug, String, null: false
    field :category, Types::EdgeCategoryEnum, null: false
    field :minimum_rank, Types::RankEnum, null: false
    field :requirements, [ Types::RequirementType ], null: false
    field :effects, GraphQL::Types::JSON, null: false
    field :requirements_text, String, null: false
    field :description, String, null: true
    field :source_book, String, null: false
    field :source_page, Integer, null: false
    field :repeatable, Boolean, null: false

    def name
      translated(:name)
    end

    def requirements_text
      locale = context[:locale] || :en
      default_text = Edges::RequirementsText.new(object, locale: locale).to_s

      ReferenceData::Translations.translate(
        :edge,
        object.slug,
        :requirements_text,
        default_text,
        locale: locale
      )
    end

    def description
      translated(:description)
    end
  end
end
