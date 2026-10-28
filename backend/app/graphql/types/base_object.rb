module Types
  class BaseObject < GraphQL::Schema::Object
    field_class Types::BaseField

    private

    def translated(field)
      ReferenceData::Translations.for(object, field, locale: context[:locale] || :en)
    end
  end
end
