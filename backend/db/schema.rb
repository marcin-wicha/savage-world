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

ActiveRecord::Schema[8.1].define(version: 2026_10_22_180454) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

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
    t.index ["category", "minimum_rank"], name: "index_edges_on_category_and_minimum_rank"
    t.index ["slug"], name: "index_edges_on_slug", unique: true
    t.index ["source_book"], name: "index_edges_on_source_book"
    t.check_constraint "jsonb_typeof(requirements) = 'array'::text", name: "edges_requirements_array"
    t.check_constraint "minimum_rank >= 0 AND minimum_rank <= 4", name: "edges_minimum_rank_range"
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
    t.index ["severity", "source_book"], name: "index_hindrances_on_severity_and_source_book"
    t.index ["slug"], name: "index_hindrances_on_slug", unique: true
    t.index ["source_book"], name: "index_hindrances_on_source_book"
    t.check_constraint "jsonb_typeof(requirements) = 'array'::text", name: "hindrances_requirements_array"
    t.check_constraint "severity >= 0 AND severity <= 2", name: "hindrances_severity_range"
  end

  create_table "origins", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
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
    t.index ["linked_attribute"], name: "index_skills_on_linked_attribute"
    t.index ["slug"], name: "index_skills_on_slug", unique: true
    t.index ["source_book"], name: "index_skills_on_source_book"
    t.check_constraint "linked_attribute::text = ANY (ARRAY['agility'::character varying, 'smarts'::character varying, 'spirit'::character varying, 'strength'::character varying, 'vigor'::character varying]::text[])", name: "skills_linked_attribute_valid"
  end

  create_table "users", force: :cascade do |t|
    t.string "email_address", null: false
    t.string "password_digest", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email_address"], name: "index_users_on_email_address", unique: true
  end

  add_foreign_key "sessions", "users"
end
