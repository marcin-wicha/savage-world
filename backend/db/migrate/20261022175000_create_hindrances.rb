class CreateHindrances < ActiveRecord::Migration[8.1]
  def change
    create_table :hindrances do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.integer :severity, default: 0, null: false
      t.jsonb :requirements, default: [], null: false
      t.string :source_book, null: false
      t.integer :source_page, null: false
      t.timestamps
    end

    add_index :hindrances, :slug, unique: true
    add_index :hindrances, [ :severity, :source_book ]
    add_index :hindrances, :source_book
    add_check_constraint :hindrances, "severity >= 0 AND severity <= 2", name: "hindrances_severity_range"
    add_check_constraint :hindrances, "jsonb_typeof(requirements) = 'array'", name: "hindrances_requirements_array"
  end
end
