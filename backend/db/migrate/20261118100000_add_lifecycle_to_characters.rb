class AddLifecycleToCharacters < ActiveRecord::Migration[8.1]
  def change
    add_column :characters, :status, :integer, null: false, default: 1
    change_column_default :characters, :status, from: 1, to: 0
    add_column :characters, :creation_step, :integer, null: false, default: 0
    add_column :characters, :concept, :text
    change_column_null :characters, :name, true
    add_index :characters, %i[user_id status]

    add_check_constraint :characters, "status BETWEEN 0 AND 2", name: "characters_status_range"
    add_check_constraint :characters, "creation_step BETWEEN 0 AND 20", name: "characters_creation_step_range"
    add_check_constraint :characters, "status = 0 OR (name IS NOT NULL AND btrim(name) <> '')",
      name: "characters_name_required_unless_draft"

    add_column :character_hindrances, :severity, :string
    add_check_constraint :character_hindrances, "severity IS NULL OR severity IN ('minor', 'major')",
      name: "character_hindrances_severity_values"

    drop_table :character_drafts do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.jsonb :data, null: false, default: {}
      t.integer :step, null: false, default: 0
      t.timestamps

      t.index %i[user_id updated_at]
      t.check_constraint "jsonb_typeof(data) = 'object'", name: "character_drafts_data_object"
      t.check_constraint "step >= 0", name: "character_drafts_step_non_negative"
    end
  end
end
