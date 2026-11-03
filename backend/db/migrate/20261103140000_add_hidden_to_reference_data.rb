class AddHiddenToReferenceData < ActiveRecord::Migration[8.1]
  def change
    %i[origins edges hindrances skills gears].each do |table|
      add_column table, :hidden, :boolean, default: false, null: false
    end
  end
end
