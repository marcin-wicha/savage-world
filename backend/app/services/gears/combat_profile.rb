module Gears
  class CombatProfile
    DIE_SIDES = [ 4, 6, 8, 10, 12 ].freeze
    BLAST_TEMPLATES = { "sbt" => "small", "mbt" => "medium", "lbt" => "large", "cone" => "cone" }.freeze
    WEAPON_CATEGORIES = %w[melee_weapon ranged_weapon black_powder_weapon cannon siege_engine].freeze

    attr_reader :name, :slug, :category, :damage, :ap, :range, :rof, :reach, :parry, :armor, :min_str,
      :shots, :cover, :blast, :skill

    def self.parse_damage(value)
      return nil unless value.is_a?(String) && value.present?

      expression = value.downcase.delete(" ")
      return nil unless expression.match?(/\A[+-]?(str|\d*d\d+|\d+)([+-](str|\d*d\d+|\d+))*\z/)

      damage = { strength: false, dice: [], modifier: 0 }
      expression.scan(/([+-]?)(str|\d*d\d+|\d+)/) do |sign, term|
        negative = sign == "-"
        if term == "str"
          return nil if negative || damage[:strength]

          damage[:strength] = true
        elsif term.include?("d")
          return nil if negative

          count, sides = term.split("d")
          count = count.empty? ? 1 : count.to_i
          sides = sides.to_i
          return nil unless DIE_SIDES.include?(sides) && count.between?(1, 10)

          damage[:dice] << { count: count, sides: sides }
        else
          damage[:modifier] += negative ? -term.to_i : term.to_i
        end
      end

      return nil if !damage[:strength] && damage[:dice].empty?

      damage
    end

    def self.parse_range(value)
      return nil if value.blank?

      parts = value.to_s.split("/").map { |part| Integer(part.strip, exception: false) }
      return nil unless parts.length == 3 && parts.all? { |part| part&.positive? }
      return nil unless parts.each_cons(2).all? { |short, long| short <= long }

      parts
    end

    def initialize(source)
      if source.is_a?(Gear)
        attributes = source.effects.is_a?(Hash) ? source.effects.stringify_keys : {}
        @name = source.name
        @slug = source.slug
        @category = source.category
      else
        attributes = source.to_h.stringify_keys
        @name = attributes["name"].to_s
        @slug = attributes["slug"].presence || @name.parameterize
        @category = attributes["category"]
      end

      parse(attributes)
    end

    def weapon?
      damage.present?
    end

    def ranged?
      weapon? && range.present?
    end

    def melee?
      weapon? && (range.blank? || thrown?)
    end

    def thrown?
      @thrown
    end

    def two_handed?
      @two_handed
    end

    def shield?
      category == "shield" || cover.positive?
    end

    def armor?
      armor.positive?
    end

    def combat?
      weapon? || armor? || shield? || parry.nonzero?
    end

    def attack_skill
      return skill if skill.present?
      return "athletics" if thrown? && range.present? && !melee_category?

      ranged? && !melee_category? ? "shooting" : "fighting"
    end

    def as_json(*)
      {
        name: name,
        slug: slug,
        category: category,
        damage: damage,
        ap: ap,
        range: range,
        rof: rof,
        reach: reach,
        parry: parry,
        armor: armor,
        min_str: min_str,
        shots: shots,
        cover: cover,
        blast: blast,
        thrown: thrown?,
        two_handed: two_handed?,
        skill: attack_skill
      }
    end

    private

    def melee_category?
      category == "melee_weapon"
    end

    def parse(attributes)
      @damage = self.class.parse_damage(attributes["damage"])
      @range = self.class.parse_range(attributes["range"])
      @ap = integer(attributes["ap"], 0, 0..50)
      @rof = integer(attributes["rof"], 1, 1..6)
      @reach = integer(attributes["reach"], 0, 0..10)
      @parry = integer(attributes["parry"], 0, -4..4)
      @armor = integer(attributes["armor"], 0, 0..20)
      @cover = integer(attributes["cover"], 0, 0..6)
      @shots = attributes["shots"].nil? ? nil : integer(attributes["shots"], nil, 1..500)
      @min_str = attributes["min_str"].to_s.downcase.presence if CharacterSkill::DICE.include?(attributes["min_str"].to_s.downcase)
      @blast = BLAST_TEMPLATES[attributes["blast"].to_s.downcase]
      @skill = attributes["skill"].to_s.presence if %w[fighting shooting athletics].include?(attributes["skill"].to_s)
      @thrown = truthy?(attributes["thrown"]) || (melee_category? && @range.present?)
      @two_handed = truthy?(attributes["two_handed"])
    end

    def integer(value, default, range)
      number = value.is_a?(Integer) ? value : Integer(value.to_s.strip.delete_prefix("+"), exception: false)
      number && range.cover?(number) ? number : default
    end

    def truthy?(value)
      value == true || value.to_s.downcase == "true"
    end
  end
end
