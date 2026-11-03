class AddApprovalToUsers < ActiveRecord::Migration[8.1]
  def up
    add_column :users, :approved, :boolean, null: false, default: true
    change_column_default :users, :approved, from: true, to: false
  end

  def down
    remove_column :users, :approved
  end
end
