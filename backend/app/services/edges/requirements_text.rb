module Edges
  class RequirementsText
    def initialize(edge)
      @edge = edge
    end

    def to_s
      Requirements::Text.new(@edge.requirements, prefix: @edge.minimum_rank.to_s.titleize).to_s
    end
  end
end
