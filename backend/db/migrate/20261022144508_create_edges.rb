class CreateEdges < ActiveRecord::Migration[8.1]
  def change
    create_table :edges do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.string :category, null: false
      t.integer :minimum_rank, null: false, default: 0
      t.jsonb :requirements, null: false, default: []
      t.string :source_book, null: false
      t.integer :source_page, null: false
      t.boolean :repeatable, null: false, default: false
      t.timestamps
    end

    add_index :edges, :slug, unique: true
    add_index :edges, [ :category, :minimum_rank ]
    add_index :edges, :source_book
    add_check_constraint :edges, "minimum_rank BETWEEN 0 AND 4", name: "edges_minimum_rank_range"
    add_check_constraint :edges, "jsonb_typeof(requirements) = 'array'", name: "edges_requirements_array"
  end
end
