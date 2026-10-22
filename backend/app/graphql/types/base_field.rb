module Types
  class BaseField < GraphQL::Schema::Field
    argument_class Types::BaseArgument

    def initialize(*args, **kwargs, &block)
      kwargs[:camelize] = false
      super
    end
  end
end
