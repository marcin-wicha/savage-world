class RenameCharacterAttributesToAttributeDice < ActiveRecord::Migration[8.1]
  def change
    rename_column :characters, :attributes, :attribute_dice
  end
end
