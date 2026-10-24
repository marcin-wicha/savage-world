class AddDescriptionsToEdgesAndSkills < ActiveRecord::Migration[8.1]
  def change
    add_column :edges, :description, :text
    add_column :skills, :description, :text
  end
end
