module Characters
  # Mirrors the creation wizard's point-buy: 5 attribute steps and 12 skill
  # points are free, Hindrance points (max 4) cover anything beyond them, and
  # each Edge costs 2 Hindrance points.
  class CreationPoints
    FREE_ATTRIBUTE_STEPS = 5
    FREE_SKILL_POINTS = 12
    EDGE_COST = 2
    MAX_HINDRANCE_POINTS = 4
    DIE_STEPS = { "d4" => 0, "d6" => 1, "d8" => 2, "d10" => 3, "d12" => 4 }.freeze

    def initialize(character)
      @character = character
    end

    def earned
      @character.character_hindrances.includes(:hindrance).sum(&:points)
    end

    def spent
      {
        attributes: [ attribute_steps - FREE_ATTRIBUTE_STEPS, 0 ].max,
        skills: [ skill_points - FREE_SKILL_POINTS, 0 ].max,
        edges: @character.character_edges.size * EDGE_COST
      }
    end

    def total_spent
      spent.values.sum
    end

    def errors
      messages = {}
      earned_points = earned
      if earned_points > MAX_HINDRANCE_POINTS
        messages[:hindrance_points_earned] = [ "cannot exceed #{MAX_HINDRANCE_POINTS}" ]
      elsif total_spent > earned_points
        messages[:hindrance_points_spent] = [ "exceed the #{earned_points} earned hindrance points" ]
      elsif total_spent < earned_points
        messages[:hindrance_points_spent] = [ "must spend all earned hindrance points before saving" ]
      end
      messages
    end

    def as_json(*)
      { earned: earned, spent: spent }
    end

    private

    def attribute_steps
      @character.attribute_dice.values.sum { |die| DIE_STEPS.fetch(die, 0) }
    end

    def skill_points
      @character.character_skills.includes(:skill).sum do |selection|
        DIE_STEPS.fetch(selection.die, 0) + (selection.skill.core? ? 0 : 1)
      end
    end
  end
end
