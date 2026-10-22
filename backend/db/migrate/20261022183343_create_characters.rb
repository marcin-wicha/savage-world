class CreateCharacters < ActiveRecord::Migration[8.1]
  def change
    create_table :characters do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.integer :rank, null: false, default: 0
      t.timestamps
    end

    add_check_constraint :characters, "rank BETWEEN 0 AND 4", name: "characters_rank_range"

    create_table :character_edges do |t|
      t.references :character, null: false, foreign_key: true
      t.references :edge, null: false, foreign_key: true
      t.timestamps
    end

    add_index :character_edges, [ :character_id, :edge_id ], unique: true

    create_table :character_hindrances do |t|
      t.references :character, null: false, foreign_key: true
      t.references :hindrance, null: false, foreign_key: true
      t.timestamps
    end

    add_index :character_hindrances, [ :character_id, :hindrance_id ], unique: true

    create_table :character_skills do |t|
      t.references :character, null: false, foreign_key: true
      t.references :skill, null: false, foreign_key: true
      t.timestamps
    end

    add_index :character_skills, [ :character_id, :skill_id ], unique: true
  end
end
