class AddSourceKeyToEnemyTemplates < ActiveRecord::Migration[8.1]
  def change
    add_column :enemy_templates, :source_key, :string
    add_index :enemy_templates, [ :user_id, :source_key ], unique: true, where: "source_key IS NOT NULL"
  end
end
