class CreateOrigins < ActiveRecord::Migration[8.1]
  def change
    create_table :origins do |t|
      t.timestamps
    end
  end
end
