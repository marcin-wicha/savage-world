module Types
  class PowerType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :slug, String, null: false
    field :rank, Types::RankEnum, null: false
    field :power_points, String, null: false
    field :duration, String, null: false
    field :range, String, null: false
    field :summary, String, null: false
    field :source_book, String, null: false
    field :source_page, Integer, null: false

    def name
      translated(:name)
    end

    def duration
      translated(:duration)
    end

    def range
      translated(:range)
    end

    def summary
      translated(:summary)
    end
  end
end
