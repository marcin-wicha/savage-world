module Requirements
  class Text
    def initialize(requirements, prefix: nil)
      @requirements = requirements
      @prefix = prefix
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
      when "arcane_background" then "Arcane Background (#{clause['value'].to_s.titleize})"
      when "attribute" then "#{clause['attribute'].to_s.titleize} d#{clause['die']}+"
      when "edge" then edge_text(clause)
      when "hindrance" then hindrance_text(clause)
      when "skill" then "#{clause['skill'].to_s.titleize} d#{clause['die']}+"
      when "special" then clause["text"].to_s
      when "wild_card" then "Wild Card"
      else ""
      end
    end

    def edge_text(clause)
      text = clause["name"].presence || clause["slug"].to_s.titleize
      detail = clause["detail"].to_s.strip
      detail.present? ? "#{text} #{detail}" : text
    end

    def hindrance_text(clause)
      text = clause["slug"].to_s.titleize
      detail = clause["detail"].to_s.strip
      detail.present? ? "#{text} (#{detail})" : text
    end

    def join_or(parts)
      case parts.length
      when 0 then ""
      when 1 then parts.first
      when 2 then parts.join(" or ")
      else "#{parts[0...-1].join(', ')}, or #{parts.last}"
      end
    end
  end
end
