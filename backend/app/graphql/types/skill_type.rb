module Types
  class SkillType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :slug, String, null: false
    field :attribute, String, null: false
    field :core, Boolean, null: false
    field :description, String, null: true
    field :source_book, String, null: false
    field :source_page, Integer, null: false

    def attribute
      object.linked_attribute
    end

    def name
      translated(:name)
    end

    def description
      translated(:description)
    end
  end
end
