class AddDetailsToOriginsAndOriginToCharacters < ActiveRecord::Migration[8.1]
  def change
    add_column :origins, :name, :string, null: false
    add_column :origins, :slug, :string, null: false
    add_column :origins, :description, :text, null: false
    add_index :origins, :slug, unique: true

    add_reference :characters, :origin, foreign_key: true, null: true
  end
end
