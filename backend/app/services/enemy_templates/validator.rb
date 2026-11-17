module EnemyTemplates
  class Validator
    MAX_WEAPONS = 6
    SKILL_SLUG = /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/

    def initialize(template)
      @template = template
    end

    def errors
      @errors = Hash.new { |hash, key| hash[key] = [] }
      validate_attributes
      validate_skills
      validate_weapons
      validate_edges
      validate_abilities
      @errors
    end

    private

    def validate_attributes
      dice = @template.attribute_dice
      valid = dice.is_a?(Hash) &&
        dice.keys.map(&:to_s).sort == EnemyTemplate::ATTRIBUTES.sort &&
        dice.values.all? { |die| Battles::TraitDie.valid?(die) }
      @errors[:attribute_dice] << "must contain dice such as d6 or d12+2 for all five attributes" unless valid
    end

    def validate_skills
      skills = @template.skills
      unless skills.is_a?(Hash)
        @errors[:skills] << "must be an object keyed by skill slug"
        return
      end

      invalid = skills.reject { |slug, die| slug.to_s.match?(SKILL_SLUG) && Battles::TraitDie.valid?(die) }
      @errors[:skills] << "must map skill slugs to dice such as d6 or d10+1" if invalid.any?
    end

    def validate_weapons
      weapons = @template.weapons
      unless weapons.is_a?(Array) && weapons.all?(Hash)
        @errors[:weapons] << "must be an array of weapon objects"
        return
      end

      @errors[:weapons] << "cannot contain more than #{MAX_WEAPONS} weapons" if weapons.length > MAX_WEAPONS
      weapons.each_with_index do |weapon, index|
        profile = Gears::CombatProfile.new(weapon)
        @errors[:weapons] << "weapon #{index + 1} must have a name" if profile.name.blank?
        @errors[:weapons] << "weapon #{index + 1} must have a damage expression such as Str+d6 or 2d6" unless profile.weapon?
        if weapon["range"].present? && profile.range.nil?
          @errors[:weapons] << "weapon #{index + 1} range must look like 12/24/48"
        end
      end
    end

    def validate_edges
      slugs = @template.edge_slugs
      unless slugs.is_a?(Array) && slugs.all?(String)
        @errors[:edge_slugs] << "must be an array of edge slugs"
        return
      end

      unknown = slugs.uniq - Edge.where(slug: slugs).pluck(:slug)
      @errors[:edge_slugs] << "contains unknown edges: #{unknown.join(', ')}" if unknown.any?
    end

    def validate_abilities
      abilities = @template.abilities
      unless abilities.is_a?(Array) && abilities.all?(String)
        @errors[:abilities] << "must be an array of ability keys"
        return
      end

      unknown = abilities - EnemyTemplate::ABILITIES
      @errors[:abilities] << "contains unsupported abilities: #{unknown.join(', ')}" if unknown.any?
    end
  end
end
