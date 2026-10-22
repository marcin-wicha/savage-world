class CreateSkills < ActiveRecord::Migration[8.1]
  def change
    create_table :skills do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.string :linked_attribute, null: false
      t.boolean :core, default: false, null: false
      t.string :source_book, null: false
      t.integer :source_page, null: false
      t.timestamps
    end

    add_index :skills, :slug, unique: true
    add_index :skills, :linked_attribute
    add_index :skills, :source_book
    add_check_constraint :skills, "linked_attribute IN ('agility', 'smarts', 'spirit', 'strength', 'vigor')", name: "skills_linked_attribute_valid"
  end
end
