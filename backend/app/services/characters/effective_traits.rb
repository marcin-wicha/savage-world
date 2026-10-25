module Characters
  class EffectiveTraits
    DICE = CharacterSkill::DICE.freeze

    def initialize(character)
      @character = character
      @effects = character.edges.flat_map do |edge|
        Array(edge.effects).map { |effect| effect.merge("edge_name" => edge.name) }
      end
    end

    def as_json
      {
        attributes: traits_for_attributes,
        skills: traits_for_skills,
        damage: traits_for_damage
      }
    end

    private

    def traits_for_attributes
      @character.attribute_dice.each_with_object({}) do |(attribute, base_die), traits|
        traits[attribute] = calculate_trait("attribute", attribute, base_die)
      end
    end

    def traits_for_skills
      @character.character_skills.includes(:skill).each_with_object({}) do |selection, traits|
        traits[selection.skill.slug] = calculate_trait("skill", selection.skill.slug, selection.die)
      end
    end

    def traits_for_damage
      @effects.select { |effect| effect["target"] == "damage" }
        .group_by { |effect| effect["trait"] }
        .transform_values do |effects|
          {
            modifier: effects.sum { |effect| effect.fetch("modifier", 0) },
            effects: effects.map do |effect|
              { edge_name: effect["edge_name"], kind: effect["kind"], amount: effect["modifier"] }
            end
          }
        end
    end

    def calculate_trait(target, slug, base_die)
      matching = @effects.select { |effect| effect["target"] == target && effect["trait"] == slug }
      steps = matching.sum { |effect| effect["kind"] == "trait_die_step" ? effect.fetch("steps", 0) : 0 }
      modifier = matching.sum { |effect| effect["kind"] == "trait_modifier" ? effect.fetch("modifier", 0) : 0 }
      die_index = DICE.index(base_die) || 0
      effective_die = DICE[(die_index + steps).clamp(0, DICE.length - 1)]

      {
        base_die: base_die,
        die: effective_die,
        modifier: modifier,
        effects: matching.map do |effect|
          {
            edge_name: effect["edge_name"],
            kind: effect["kind"],
            amount: effect[effect["kind"] == "trait_die_step" ? "steps" : "modifier"]
          }
        end
      }
    end
  end
end
