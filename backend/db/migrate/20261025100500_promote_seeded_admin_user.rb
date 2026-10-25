class PromoteSeededAdminUser < ActiveRecord::Migration[8.1]
  def up
    execute <<~SQL.squish
      UPDATE users
      SET role = 1
      WHERE email_address = 'admin'
    SQL
  end

  def down
    execute <<~SQL.squish
      UPDATE users
      SET role = 0
      WHERE email_address = 'admin'
    SQL
  end
end
