module Types
  class QueryType < Types::BaseObject
    field :edges, Types::EdgeType.connection_type, null: false, max_page_size: 100, default_page_size: 25 do
      argument :category, Types::EdgeCategoryEnum, required: false
      argument :minimum_rank, Types::RankEnum, required: false
      argument :source_book, String, required: false
    end
    field :gear, Types::GearType.connection_type, null: false, max_page_size: 100, default_page_size: 25 do
      argument :category, Types::GearCategoryEnum, required: false
      argument :source_book, String, required: false
    end
    field :hindrances, Types::HindranceType.connection_type, null: false, max_page_size: 100, default_page_size: 25 do
      argument :severity, Types::HindranceSeverityEnum, required: false
      argument :source_book, String, required: false
    end
    field :origins, Types::OriginType.connection_type, null: false, max_page_size: 100, default_page_size: 25
    field :skills, Types::SkillType.connection_type, null: false, max_page_size: 100, default_page_size: 25 do
      argument :attribute, String, required: false
      argument :core, Boolean, required: false
      argument :source_book, String, required: false
    end
    field :viewer, Types::UserType, null: true

    def edges(category: nil, minimum_rank: nil, source_book: nil)
      scope = Edge.order(:name, :id)
      scope = scope.where(category: category) if category
      scope = scope.where(minimum_rank: minimum_rank) if minimum_rank
      scope = scope.where(source_book: source_book) if source_book
      scope
    end

    def gear(category: nil, source_book: nil)
      scope = Gear.order(:name, :id)
      scope = scope.where(category: category) if category
      scope = scope.where(source_book: source_book) if source_book
      scope
    end

    def hindrances(severity: nil, source_book: nil)
      scope = Hindrance.order(:name, :id)
      scope = scope.where(severity: severity) if severity
      scope = scope.where(source_book: source_book) if source_book
      scope
    end

    def origins
      Origin.order(:id)
    end

    def skills(attribute: nil, core: nil, source_book: nil)
      scope = Skill.order(:name, :id)
      scope = scope.where(linked_attribute: attribute) if attribute
      scope = scope.where(core: core) unless core.nil?
      scope = scope.where(source_book: source_book) if source_book
      scope
    end

    def viewer
      context[:current_user]
    end
  end
end
