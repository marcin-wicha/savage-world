class AddDescriptionToHindrances < ActiveRecord::Migration[8.1]
  def change
    add_column :hindrances, :description, :text
  end
end
