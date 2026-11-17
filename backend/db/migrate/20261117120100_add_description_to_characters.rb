class AddDescriptionToCharacters < ActiveRecord::Migration[8.1]
  def change
    add_column :characters, :description, :text, null: false, default: ""
  end
end
