module Edges
  class EffectsValidator
    KINDS = %w[trait_die_step trait_modifier].freeze
    TARGETS = %w[attribute skill damage].freeze
    ATTRIBUTES = %w[agility smarts spirit strength vigor].freeze

    def initialize(effects)
      @effects = effects
    end

    def errors
      return [ "must be an array" ] unless @effects.is_a?(Array)

      @effects.each_with_index.flat_map do |effect, index|
        validate_effect(effect).map { |message| "effect #{index + 1} #{message}" }
      end
    end

    private

    def slug?(value)
      value.is_a?(String) && value.match?(/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/)
    end

    def validate_effect(effect)
      return [ "must be an object" ] unless effect.is_a?(Hash)

      errors = []
      kind = effect["kind"]
      target = effect["target"]
      errors << "has an unsupported kind" unless KINDS.include?(kind)
      errors << "has an unsupported target" unless TARGETS.include?(target)

      trait = effect["trait"]
      if target == "attribute"
        errors << "must target a valid attribute" unless ATTRIBUTES.include?(trait)
      elsif target == "skill"
        errors << "must target a skill slug" unless slug?(trait)
      elsif target == "damage"
        errors << "must target all damage or a weapon slug" unless trait == "all" || slug?(trait)
        errors << "cannot use die steps" if kind == "trait_die_step"
      end

      amount_key = kind == "trait_die_step" ? "steps" : "modifier"
      amount = effect[amount_key]
      unless amount.is_a?(Integer) && amount.between?(-4, 4) && amount != 0
        errors << "must include a non-zero #{amount_key} between -4 and 4"
      end

      errors
    end
  end
end
