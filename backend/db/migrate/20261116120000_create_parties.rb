class CreateParties < ActiveRecord::Migration[8.1]
  def change
    create_table :parties do |t|
      t.string :name, null: false
      t.text :description
      t.references :leader, null: false, foreign_key: { to_table: :users }
      t.string :invite_code, null: false
      t.timestamps

      t.index :invite_code, unique: true
    end

    create_table :party_memberships do |t|
      t.references :party, null: false, foreign_key: true, index: false
      t.references :character, null: false, foreign_key: true
      t.integer :status, null: false, default: 0
      t.timestamps

      t.index [ :party_id, :character_id ], unique: true
      t.check_constraint "status IN (0, 1)", name: "party_memberships_status_range"
    end
  end
end
