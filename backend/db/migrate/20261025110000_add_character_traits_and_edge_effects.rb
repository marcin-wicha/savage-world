class AddCharacterTraitsAndEdgeEffects < ActiveRecord::Migration[8.1]
  def change
    add_column :characters, :attributes, :jsonb, null: false, default: {
      agility: "d4",
      smarts: "d4",
      spirit: "d4",
      strength: "d4",
      vigor: "d4"
    }
    add_column :edges, :effects, :jsonb, null: false, default: []
    add_column :character_skills, :die, :string, null: false, default: "d4"
    execute <<~SQL
      UPDATE character_skills
      SET die = 'd6'
      FROM skills
      WHERE skills.id = character_skills.skill_id AND skills.core = TRUE
    SQL

    add_check_constraint :edges, "jsonb_typeof(effects) = 'array'", name: "edges_effects_array"
  end
end
