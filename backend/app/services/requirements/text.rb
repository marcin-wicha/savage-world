module Requirements
  class Text
    def initialize(requirements, prefix: nil, locale: :en)
      @requirements = requirements
      @prefix = prefix
      @locale = ReferenceData::Translations.normalize_locale(locale)
    end

    def to_s
      parts = [ @prefix ]
      parts.concat(Array(@requirements).map { |clause| clause_text(clause) })
      parts.reject(&:blank?).join(", ")
    end

    private

    def clause_text(clause)
      case clause["kind"]
      when "any" then join_or(Array(clause["clauses"]).map { |nested| clause_text(nested) }.reject(&:blank?))
      when "arcane_background" then arcane_background_text(clause)
      when "attribute" then "#{localized_label(:attributes, clause['attribute'])} d#{clause['die']}+"
      when "edge" then edge_text(clause)
      when "hindrance" then hindrance_text(clause)
      when "skill" then "#{localized_record(:skill, clause['skill'], clause['skill'].to_s.titleize)} d#{clause['die']}+"
      when "special" then clause["text"].to_s
      when "wild_card" then localized_label(:requirements, :wild_card, "Wild Card")
      else ""
      end
    end

    def arcane_background_text(clause)
      name = localized_label(:requirements, :arcane_background, "Arcane Background")
      value = clause["value"].to_s.titleize
      value = localized_label(:arcane_backgrounds, clause["value"], value)
      "#{name} (#{value})"
    end

    def edge_text(clause)
      slug = clause["slug"]
      text = slug.present? ? localized_record(:edge, slug, clause["name"].presence || slug.titleize) : clause["name"].to_s
      detail = clause["detail"].to_s.strip
      detail.present? ? "#{text} #{detail}" : text
    end

    def hindrance_text(clause)
      slug = clause["slug"].to_s
      text = localized_record(:hindrance, slug, slug.titleize)
      detail = clause["detail"].to_s.strip
      detail.present? ? "#{text} (#{detail})" : text
    end

    def localized_record(resource, slug, value)
      ReferenceData::Translations.translate(resource, slug, :name, value, locale: @locale)
    end

    def localized_label(category, key, value = key.to_s.titleize)
      ReferenceData::Translations.label(category, key, value, locale: @locale)
    end

    def join_or(parts)
      case parts.length
      when 0 then ""
      when 1 then parts.first
      when 2 then parts.join(localized_label(:conjunctions, :or, " or "))
      else "#{parts[0...-1].join(', ')}#{localized_label(:conjunctions, :or, ", or ")} #{parts.last}"
      end
    end
  end
end
