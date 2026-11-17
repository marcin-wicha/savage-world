class AddSeverityToCharacterHindrances < ActiveRecord::Migration[8.1]
  def up
    add_column :character_hindrances, :severity, :integer, null: false, default: 0
    add_check_constraint :character_hindrances, "severity IN (0, 1)", name: "character_hindrances_severity_range"

    execute <<~SQL.squish
      UPDATE character_hindrances
      SET severity = 1
      FROM hindrances
      WHERE hindrances.id = character_hindrances.hindrance_id AND hindrances.severity = 1
    SQL
  end

  def down
    remove_check_constraint :character_hindrances, name: "character_hindrances_severity_range"
    remove_column :character_hindrances, :severity
  end
end
