module Types
  class GearCategoryEnum < Types::BaseEnum
    graphql_name "GearCategory"

    Gear::CATEGORIES.each do |category|
      value category
    end
  end
end
