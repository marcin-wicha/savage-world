module Battles
  class TraitDie
    SIDES = [ 4, 6, 8, 10, 12 ].freeze
    PATTERN = /\Ad(4|6|8|10|12)(?:([+-])(\d{1,2}))?\z/

    attr_reader :sides, :modifier

    def self.parse(value)
      match = PATTERN.match(value.to_s.strip.downcase.delete(" "))
      return nil unless match

      modifier = match[3].to_i * (match[2] == "-" ? -1 : 1)
      new(match[1].to_i, modifier)
    end

    def self.valid?(value)
      parse(value).present?
    end

    def initialize(sides, modifier = 0)
      @sides = sides
      @modifier = modifier
    end

    def step(steps)
      index = SIDES.index(sides) + steps
      if index >= SIDES.length
        self.class.new(SIDES.last, modifier + (index - SIDES.length + 1))
      else
        self.class.new(SIDES[index.clamp(0, SIDES.length - 1)], modifier)
      end
    end

    def ==(other)
      other.is_a?(TraitDie) && other.sides == sides && other.modifier == modifier
    end

    def to_s
      return "d#{sides}" if modifier.zero?

      "d#{sides}#{modifier.positive? ? '+' : '-'}#{modifier.abs}"
    end
  end
end
