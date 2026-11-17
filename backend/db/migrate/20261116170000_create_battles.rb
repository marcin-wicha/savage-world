class CreateBattles < ActiveRecord::Migration[8.1]
  def change
    create_table :battles do |t|
      t.references :party, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.references :user, null: false, foreign_key: { on_delete: :cascade }
      t.bigint :seed, null: false
      t.integer :runs, null: false
      t.jsonb :settings, null: false, default: {}
      t.jsonb :roster, null: false, default: []
      t.jsonb :summary, null: false, default: {}
      t.jsonb :log, null: false, default: []
      t.jsonb :final_state, null: false, default: []
      t.timestamps

      t.index [ :party_id, :created_at ]
      t.check_constraint "runs BETWEEN 1 AND 200", name: "battles_runs_range"
      t.check_constraint "jsonb_typeof(roster) = 'array'", name: "battles_roster_array"
      t.check_constraint "jsonb_typeof(log) = 'array'", name: "battles_log_array"
    end
  end
end
