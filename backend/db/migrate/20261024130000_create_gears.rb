class CreateGears < ActiveRecord::Migration[8.1]
  def change
    create_table :gears do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.string :category, null: false
      t.decimal :cost, precision: 12, scale: 2
      t.string :cost_text, null: false
      t.jsonb :requirements, null: false, default: []
      t.jsonb :effects, null: false, default: {}
      t.text :description
      t.string :artwork_url
      t.string :source_book, null: false
      t.integer :source_page, null: false
      t.timestamps
    end

    add_index :gears, :slug, unique: true
    add_index :gears, [ :category, :name ]
    add_index :gears, :source_book
    add_check_constraint :gears, "cost IS NULL OR cost >= 0", name: "gears_cost_nonnegative"
    add_check_constraint :gears, "jsonb_typeof(requirements) = 'array'", name: "gears_requirements_array"
    add_check_constraint :gears, "jsonb_typeof(effects) = 'object'", name: "gears_effects_object"
  end
end
