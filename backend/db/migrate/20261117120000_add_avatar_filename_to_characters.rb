class AddAvatarFilenameToCharacters < ActiveRecord::Migration[8.1]
  def change
    add_column :characters, :avatar_filename, :string
  end
end
