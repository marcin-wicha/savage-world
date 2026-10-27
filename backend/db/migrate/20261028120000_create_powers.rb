class CreatePowers < ActiveRecord::Migration[8.1]
  def change
    create_table :powers do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.integer :rank, null: false
      t.string :power_points, null: false
      t.string :duration, null: false
      t.string :range, null: false
      t.text :summary, null: false
      t.string :source_book, null: false
      t.integer :source_page, null: false
      t.timestamps

      t.index :slug, unique: true
      t.index [ :rank, :name ]
      t.index :source_book
      t.check_constraint "rank >= 0 AND rank <= 4", name: "powers_rank_range"
    end
  end
end
