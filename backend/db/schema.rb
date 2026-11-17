# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_11_17_200000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "battles", force: :cascade do |t|
    t.bigint "party_id", null: false
    t.bigint "user_id", null: false
    t.bigint "seed", null: false
    t.integer "runs", null: false
    t.jsonb "settings", default: {}, null: false
    t.jsonb "roster", default: [], null: false
    t.jsonb "summary", default: {}, null: false
    t.jsonb "log", default: [], null: false
    t.jsonb "final_state", default: [], null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["party_id", "created_at"], name: "index_battles_on_party_id_and_created_at"
    t.index ["user_id"], name: "index_battles_on_user_id"
    t.check_constraint "jsonb_typeof(log) = 'array'::text", name: "battles_log_array"
    t.check_constraint "jsonb_typeof(roster) = 'array'::text", name: "battles_roster_array"
    t.check_constraint "runs >= 1 AND runs <= 200", name: "battles_runs_range"
  end

  create_table "character_drafts", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.jsonb "data", default: {}, null: false
    t.integer "step", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "updated_at"], name: "index_character_drafts_on_user_id_and_updated_at"
    t.check_constraint "jsonb_typeof(data) = 'object'::text", name: "character_drafts_data_object"
    t.check_constraint "step >= 0", name: "character_drafts_step_non_negative"
  end

  create_table "character_edges", force: :cascade do |t|
    t.bigint "character_id", null: false
    t.bigint "edge_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["character_id", "edge_id"], name: "index_character_edges_on_character_id_and_edge_id", unique: true
    t.index ["character_id"], name: "index_character_edges_on_character_id"
    t.index ["edge_id"], name: "index_character_edges_on_edge_id"
  end

  create_table "character_gears", force: :cascade do |t|
    t.bigint "character_id", null: false
    t.bigint "gear_id", null: false
    t.integer "quantity", default: 1, null: false
    t.boolean "equipped", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["character_id", "gear_id"], name: "index_character_gears_on_character_id_and_gear_id", unique: true
    t.index ["gear_id"], name: "index_character_gears_on_gear_id"
    t.check_constraint "quantity >= 1 AND quantity <= 99", name: "character_gears_quantity_range"
  end

  create_table "character_hindrances", force: :cascade do |t|
    t.bigint "character_id", null: false
    t.bigint "hindrance_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["character_id", "hindrance_id"], name: "index_character_hindrances_on_character_id_and_hindrance_id", unique: true
    t.index ["character_id"], name: "index_character_hindrances_on_character_id"
    t.index ["hindrance_id"], name: "index_character_hindrances_on_hindrance_id"
  end

  create_table "character_skills", force: :cascade do |t|
    t.bigint "character_id", null: false
    t.bigint "skill_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "die", default: "d4", null: false
    t.index ["character_id", "skill_id"], name: "index_character_skills_on_character_id_and_skill_id", unique: true
    t.index ["character_id"], name: "index_character_skills_on_character_id"
    t.index ["skill_id"], name: "index_character_skills_on_skill_id"
  end

  create_table "characters", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", null: false
    t.integer "rank", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "origin_id"
    t.jsonb "attribute_dice", default: {"vigor" => "d4", "smarts" => "d4", "spirit" => "d4", "agility" => "d4", "strength" => "d4"}, null: false
    t.string "avatar_filename"
    t.index ["origin_id"], name: "index_characters_on_origin_id"
    t.index ["user_id"], name: "index_characters_on_user_id"
    t.check_constraint "rank >= 0 AND rank <= 4", name: "characters_rank_range"
  end

  create_table "edges", force: :cascade do |t|
    t.string "name", null: false
    t.string "slug", null: false
    t.string "category", null: false
    t.integer "minimum_rank", default: 0, null: false
    t.jsonb "requirements", default: [], null: false
    t.string "source_book", null: false
    t.integer "source_page", null: false
    t.boolean "repeatable", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "description"
    t.jsonb "effects", default: [], null: false
    t.string "artwork_url"
    t.boolean "hidden", default: false, null: false
    t.index ["category", "minimum_rank"], name: "index_edges_on_category_and_minimum_rank"
    t.index ["slug"], name: "index_edges_on_slug", unique: true
    t.index ["source_book"], name: "index_edges_on_source_book"
    t.check_constraint "jsonb_typeof(effects) = 'array'::text", name: "edges_effects_array"
    t.check_constraint "jsonb_typeof(requirements) = 'array'::text", name: "edges_requirements_array"
    t.check_constraint "minimum_rank >= 0 AND minimum_rank <= 4", name: "edges_minimum_rank_range"
  end

  create_table "enemy_templates", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", null: false
    t.text "description"
    t.boolean "wild_card", default: false, null: false
    t.jsonb "attribute_dice", default: {"vigor" => "d4", "smarts" => "d4", "spirit" => "d4", "agility" => "d4", "strength" => "d4"}, null: false
    t.jsonb "skills", default: {}, null: false
    t.integer "pace", default: 6, null: false
    t.integer "parry", default: 2, null: false
    t.integer "toughness", default: 5, null: false
    t.integer "armor", default: 0, null: false
    t.integer "size", default: 0, null: false
    t.integer "bennies", default: 0, null: false
    t.jsonb "weapons", default: [], null: false
    t.jsonb "edge_slugs", default: [], null: false
    t.jsonb "abilities", default: [], null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_enemy_templates_on_user_id"
    t.check_constraint "jsonb_typeof(abilities) = 'array'::text", name: "enemy_templates_abilities_array"
    t.check_constraint "jsonb_typeof(attribute_dice) = 'object'::text", name: "enemy_templates_attribute_dice_object"
    t.check_constraint "jsonb_typeof(edge_slugs) = 'array'::text", name: "enemy_templates_edge_slugs_array"
    t.check_constraint "jsonb_typeof(skills) = 'object'::text", name: "enemy_templates_skills_object"
    t.check_constraint "jsonb_typeof(weapons) = 'array'::text", name: "enemy_templates_weapons_array"
  end

  create_table "gears", force: :cascade do |t|
    t.string "name", null: false
    t.string "slug", null: false
    t.string "category", null: false
    t.decimal "cost", precision: 12, scale: 2
    t.string "cost_text", null: false
    t.jsonb "requirements", default: [], null: false
    t.jsonb "effects", default: {}, null: false
    t.text "description"
    t.string "artwork_url"
    t.string "source_book", null: false
    t.integer "source_page", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "hidden", default: false, null: false
    t.index ["category", "name"], name: "index_gears_on_category_and_name"
    t.index ["slug"], name: "index_gears_on_slug", unique: true
    t.index ["source_book"], name: "index_gears_on_source_book"
    t.check_constraint "cost IS NULL OR cost >= 0::numeric", name: "gears_cost_nonnegative"
    t.check_constraint "jsonb_typeof(effects) = 'object'::text", name: "gears_effects_object"
    t.check_constraint "jsonb_typeof(requirements) = 'array'::text", name: "gears_requirements_array"
  end

  create_table "hindrances", force: :cascade do |t|
    t.string "name", null: false
    t.string "slug", null: false
    t.integer "severity", default: 0, null: false
    t.jsonb "requirements", default: [], null: false
    t.string "source_book", null: false
    t.integer "source_page", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "description"
    t.string "artwork_url"
    t.boolean "hidden", default: false, null: false
    t.index ["severity", "source_book"], name: "index_hindrances_on_severity_and_source_book"
    t.index ["slug"], name: "index_hindrances_on_slug", unique: true
    t.index ["source_book"], name: "index_hindrances_on_source_book"
    t.check_constraint "jsonb_typeof(requirements) = 'array'::text", name: "hindrances_requirements_array"
    t.check_constraint "severity >= 0 AND severity <= 2", name: "hindrances_severity_range"
  end

  create_table "origins", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "name", null: false
    t.string "slug", null: false
    t.text "description", null: false
    t.string "artwork_url"
    t.boolean "hidden", default: false, null: false
    t.index ["slug"], name: "index_origins_on_slug", unique: true
  end

  create_table "parties", force: :cascade do |t|
    t.string "name", null: false
    t.text "description"
    t.bigint "leader_id", null: false
    t.string "invite_code", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["invite_code"], name: "index_parties_on_invite_code", unique: true
    t.index ["leader_id"], name: "index_parties_on_leader_id"
  end

  create_table "party_memberships", force: :cascade do |t|
    t.bigint "party_id", null: false
    t.bigint "character_id", null: false
    t.integer "status", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["character_id"], name: "index_party_memberships_on_character_id"
    t.index ["party_id", "character_id"], name: "index_party_memberships_on_party_id_and_character_id", unique: true
    t.check_constraint "status = ANY (ARRAY[0, 1])", name: "party_memberships_status_range"
  end

  create_table "powers", force: :cascade do |t|
    t.string "name", null: false
    t.string "slug", null: false
    t.integer "rank", null: false
    t.string "power_points", null: false
    t.string "duration", null: false
    t.string "range", null: false
    t.text "summary", null: false
    t.string "source_book", null: false
    t.integer "source_page", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["rank", "name"], name: "index_powers_on_rank_and_name"
    t.index ["slug"], name: "index_powers_on_slug", unique: true
    t.index ["source_book"], name: "index_powers_on_source_book"
    t.check_constraint "rank >= 0 AND rank <= 4", name: "powers_rank_range"
  end

  create_table "sessions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "ip_address"
    t.string "user_agent"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "skills", force: :cascade do |t|
    t.string "name", null: false
    t.string "slug", null: false
    t.string "linked_attribute", null: false
    t.boolean "core", default: false, null: false
    t.string "source_book", null: false
    t.integer "source_page", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "description"
    t.string "artwork_url"
    t.boolean "hidden", default: false, null: false
    t.index ["linked_attribute"], name: "index_skills_on_linked_attribute"
    t.index ["slug"], name: "index_skills_on_slug", unique: true
    t.index ["source_book"], name: "index_skills_on_source_book"
    t.check_constraint "linked_attribute::text = ANY (ARRAY['agility'::character varying::text, 'smarts'::character varying::text, 'spirit'::character varying::text, 'strength'::character varying::text, 'vigor'::character varying::text])", name: "skills_linked_attribute_valid"
  end

  create_table "users", force: :cascade do |t|
    t.string "email_address", null: false
    t.string "password_digest", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "role", default: 0, null: false
    t.boolean "approved", default: false, null: false
    t.index ["email_address"], name: "index_users_on_email_address", unique: true
    t.check_constraint "role >= 0 AND role <= 1", name: "users_role_range"
  end

  add_foreign_key "battles", "parties", on_delete: :cascade
  add_foreign_key "battles", "users", on_delete: :cascade
  add_foreign_key "character_drafts", "users", on_delete: :cascade
  add_foreign_key "character_edges", "characters"
  add_foreign_key "character_edges", "edges"
  add_foreign_key "character_gears", "characters", on_delete: :cascade
  add_foreign_key "character_gears", "gears"
  add_foreign_key "character_hindrances", "characters"
  add_foreign_key "character_hindrances", "hindrances"
  add_foreign_key "character_skills", "characters"
  add_foreign_key "character_skills", "skills"
  add_foreign_key "characters", "origins"
  add_foreign_key "characters", "users"
  add_foreign_key "enemy_templates", "users", on_delete: :cascade
  add_foreign_key "parties", "users", column: "leader_id"
  add_foreign_key "party_memberships", "characters"
  add_foreign_key "party_memberships", "parties"
  add_foreign_key "sessions", "users"
end
