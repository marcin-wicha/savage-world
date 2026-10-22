module Types
  class RequirementType < Types::BaseObject
    field :kind, Types::RequirementKindEnum, null: false
    field :attribute, String, null: true
    field :die, Integer, null: true
    field :skill, String, null: true
    field :slug, String, null: true
    field :name, String, null: true
    field :detail, String, null: true
    field :value, String, null: true
    field :text, String, null: true
    field :clauses, [ Types::RequirementType ], null: true

    def kind
      object["kind"]
    end

    def attribute
      object["attribute"]
    end

    def die
      object["die"]
    end

    def skill
      object["skill"]
    end

    def slug
      object["slug"]
    end

    def name
      object["name"]
    end

    def detail
      object["detail"]
    end

    def value
      object["value"]
    end

    def text
      object["text"]
    end

    def clauses
      object["clauses"]
    end
  end
end
