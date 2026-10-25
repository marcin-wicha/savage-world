class AddRoleToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :role, :integer, null: false, default: 0
    add_check_constraint :users, "role >= 0 AND role <= 1", name: "users_role_range"
  end
end
