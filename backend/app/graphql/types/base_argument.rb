module Types
  class BaseArgument < GraphQL::Schema::Argument
    def initialize(*args, **kwargs, &block)
      kwargs[:camelize] = false
      super
    end
  end
end
