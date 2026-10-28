module Edges
  class RequirementsText
    def initialize(edge, locale: :en)
      @edge = edge
      @locale = ReferenceData::Translations.normalize_locale(locale)
    end

    def to_s
      rank = ReferenceData::Translations.label(
        :ranks,
        @edge.minimum_rank,
        @edge.minimum_rank.to_s.titleize,
        locale: @locale
      )
      Requirements::Text.new(@edge.requirements, prefix: rank, locale: @locale).to_s
    end
  end
end
