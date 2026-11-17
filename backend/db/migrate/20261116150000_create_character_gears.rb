class CreateCharacterGears < ActiveRecord::Migration[8.1]
  def change
    create_table :character_gears do |t|
      t.references :character, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.references :gear, null: false, foreign_key: true
      t.integer :quantity, null: false, default: 1
      t.boolean :equipped, null: false, default: false
      t.timestamps

      t.index [ :character_id, :gear_id ], unique: true
      t.check_constraint "quantity BETWEEN 1 AND 99", name: "character_gears_quantity_range"
    end
  end
end
