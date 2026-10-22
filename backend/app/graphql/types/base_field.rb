module Types
  class BaseField < GraphQL::Schema::Field
    def initialize(*args, **kwargs, &block)
      kwargs[:camelize] = false
      super
    end
  end
end
