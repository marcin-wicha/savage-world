class CreateEnemyTemplates < ActiveRecord::Migration[8.1]
  def change
    create_table :enemy_templates do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }
      t.string :name, null: false
      t.text :description
      t.boolean :wild_card, null: false, default: false
      t.jsonb :attribute_dice, null: false, default: {}
      t.jsonb :skills, null: false, default: {}
      t.integer :pace, null: false, default: 6
      t.integer :parry, null: false, default: 2
      t.integer :toughness, null: false, default: 5
      t.integer :armor, null: false, default: 0
      t.integer :size, null: false, default: 0
      t.integer :bennies, null: false, default: 0
      t.jsonb :weapons, null: false, default: []
      t.jsonb :edge_slugs, null: false, default: []
      t.jsonb :abilities, null: false, default: []
      t.timestamps

      t.check_constraint "jsonb_typeof(attribute_dice) = 'object'", name: "enemy_templates_attribute_dice_object"
      t.check_constraint "jsonb_typeof(skills) = 'object'", name: "enemy_templates_skills_object"
      t.check_constraint "jsonb_typeof(weapons) = 'array'", name: "enemy_templates_weapons_array"
      t.check_constraint "jsonb_typeof(edge_slugs) = 'array'", name: "enemy_templates_edge_slugs_array"
      t.check_constraint "jsonb_typeof(abilities) = 'array'", name: "enemy_templates_abilities_array"
    end
  end
end
