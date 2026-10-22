module Edges
  class RequirementsValidator
    ATTRIBUTES = %w[agility smarts spirit strength vigor].freeze
    DICE = [ 4, 6, 8, 10, 12 ].freeze
    KINDS = %w[any arcane_background attribute edge hindrance skill special wild_card].freeze
    SLUG_PATTERN = /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/

    ALLOWED_KEYS = {
      "any" => %w[kind clauses],
      "arcane_background" => %w[kind value],
      "attribute" => %w[kind attribute die],
      "edge" => %w[kind slug name detail],
      "hindrance" => %w[kind slug detail],
      "skill" => %w[kind skill die],
      "special" => %w[kind text],
      "wild_card" => %w[kind]
    }.freeze

    def initialize(requirements)
      @requirements = requirements
    end

    def errors
      return [ "must be an array" ] unless @requirements.is_a?(Array)

      @requirements.each_with_index.flat_map do |clause, index|
        validate_clause(clause, "clause #{index}")
      end
    end

    private

    def validate_clause(clause, path)
      return [ "#{path} must be an object" ] unless clause.is_a?(Hash)

      kind = clause["kind"]
      return [ "#{path} must have a valid kind" ] unless KINDS.include?(kind)

      allowed_keys = ALLOWED_KEYS.fetch(kind)
      unknown_keys = clause.keys - allowed_keys
      errors = []
      errors << "#{path} has unknown keys: #{unknown_keys.join(', ')}" if unknown_keys.any?
      errors.concat(validate_kind(kind, clause, path))
      errors
    end

    def validate_kind(kind, clause, path)
      case kind
      when "any" then validate_any(clause, path)
      when "arcane_background" then validate_present_string(clause, "value", path)
      when "attribute" then validate_attribute(clause, path)
      when "edge", "hindrance" then validate_slug_clause(clause, path)
      when "skill" then validate_skill(clause, path)
      when "special" then validate_present_string(clause, "text", path)
      when "wild_card" then []
      end
    end

    def validate_any(clause, path)
      clauses = clause["clauses"]
      return [ "#{path}.clauses must be a non-empty array" ] unless clauses.is_a?(Array) && clauses.any?

      clauses.each_with_index.flat_map do |nested_clause, index|
        validate_clause(nested_clause, "#{path}.clauses[#{index}]")
      end
    end

    def validate_attribute(clause, path)
      errors = []
      attribute = clause["attribute"]
      unless ATTRIBUTES.include?(attribute)
        errors << "#{path}.attribute must be one of: #{ATTRIBUTES.join(', ')}"
      end
      errors.concat(validate_die(clause, path))
      errors
    end

    def validate_skill(clause, path)
      errors = validate_present_string(clause, "skill", path)
      errors.concat(validate_die(clause, path))
      errors
    end

    def validate_slug_clause(clause, path)
      errors = []
      slug = clause["slug"]
      unless slug.is_a?(String) && SLUG_PATTERN.match?(slug)
        errors << "#{path}.slug must be a lowercase slug"
      end

      %w[name detail].each do |key|
        if clause.key?(key) && !present_string?(clause[key])
          errors << "#{path}.#{key} must be a non-empty string"
        end
      end

      errors
    end

    def validate_present_string(clause, key, path)
      return [] if present_string?(clause[key])

      [ "#{path}.#{key} must be a non-empty string" ]
    end

    def validate_die(clause, path)
      return [] if DICE.include?(clause["die"])

      [ "#{path}.die must be one of: #{DICE.join(', ')}" ]
    end

    def present_string?(value)
      value.is_a?(String) && value.strip.present?
    end
  end
end
