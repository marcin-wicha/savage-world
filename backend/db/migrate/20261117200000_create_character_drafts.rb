class CreateCharacterDrafts < ActiveRecord::Migration[8.1]
  def change
    create_table :character_drafts do |t|
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
