module Types
  class HindranceType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :slug, String, null: false
    field :severity, Types::HindranceSeverityEnum, null: false
    field :requirements, [ Types::RequirementType ], null: false
    field :requirements_text, String, null: false
    field :description, String, null: true
    field :source_book, String, null: false
    field :source_page, Integer, null: false

    def name
      translated(:name)
    end

    def requirements_text
      Requirements::Text.new(object.requirements, locale: context[:locale] || :en).to_s
    end

    def description
      translated(:description)
    end
  end
end
