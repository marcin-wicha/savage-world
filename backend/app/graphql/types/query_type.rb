module Types
  class QueryType < Types::BaseObject
    field :origins, Types::OriginType.connection_type, null: false, max_page_size: 100, default_page_size: 25
    field :viewer, Types::UserType, null: true

    def origins
      Origin.order(:id)
    end

    def viewer
      context[:current_user]
    end
  end
end
