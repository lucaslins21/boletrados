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

ActiveRecord::Schema[8.1].define(version: 2026_11_19_120007) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "categories", force: :cascade do |t|
    t.string "slug", null: false
    t.string "label", null: false
    t.string "short_label", null: false
    t.string "color", null: false
    t.string "icon", null: false
    t.integer "position", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_categories_on_slug", unique: true
  end

  create_table "idempotency_keys", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "key", null: false
    t.string "request_method", null: false
    t.string "request_path", null: false
    t.integer "response_status"
    t.jsonb "response_body"
    t.datetime "created_at", null: false
    t.index ["created_at"], name: "index_idempotency_keys_on_created_at"
    t.index ["user_id", "key"], name: "index_idempotency_keys_on_user_id_and_key", unique: true
  end

  create_table "identities", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "provider", null: false
    t.string "uid", null: false
    t.string "email"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["provider", "uid"], name: "index_identities_on_provider_and_uid", unique: true
    t.index ["user_id"], name: "index_identities_on_user_id"
    t.check_constraint "provider::text = ANY (ARRAY['google'::character varying::text, 'facebook'::character varying::text])", name: "identities_provider_values"
  end

  create_table "match_events", force: :cascade do |t|
    t.bigint "match_id", null: false
    t.integer "seq", null: false
    t.string "kind", null: false
    t.jsonb "payload", default: {}, null: false
    t.bigint "actor_id"
    t.datetime "created_at", null: false
    t.index ["actor_id"], name: "index_match_events_on_actor_id"
    t.index ["match_id", "seq"], name: "index_match_events_on_match_id_and_seq", unique: true
  end

  create_table "match_players", force: :cascade do |t|
    t.bigint "match_id", null: false
    t.bigint "user_id", null: false
    t.integer "seat", limit: 2, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["match_id", "seat"], name: "index_match_players_on_match_id_and_seat", unique: true
    t.index ["match_id", "user_id"], name: "index_match_players_on_match_id_and_user_id", unique: true
    t.index ["user_id"], name: "index_match_players_on_user_id"
    t.check_constraint "seat = ANY (ARRAY[0, 1])", name: "match_players_seat_values"
  end

  create_table "match_questions", force: :cascade do |t|
    t.bigint "match_id", null: false
    t.bigint "user_id", null: false
    t.bigint "question_id", null: false
    t.string "context", null: false
    t.string "category_slug", null: false
    t.datetime "shown_at", null: false
    t.datetime "deadline_at", null: false
    t.datetime "answered_at"
    t.integer "selected_index", limit: 2
    t.boolean "correct"
    t.boolean "timed_out"
    t.boolean "trophy_won", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["match_id"], name: "index_match_questions_on_match_id"
    t.index ["question_id"], name: "index_match_questions_on_question_id"
    t.index ["user_id"], name: "index_match_questions_on_user_id"
    t.check_constraint "context::text = ANY (ARRAY['normal'::character varying, 'trophy'::character varying]::text[])", name: "match_questions_context_values"
  end

  create_table "matches", force: :cascade do |t|
    t.string "status", default: "waiting_opponent", null: false
    t.bigint "created_by_id", null: false
    t.string "invite_token_digest", null: false
    t.string "invite_code", null: false
    t.datetime "invite_expires_at", null: false
    t.jsonb "state"
    t.bigint "current_user_id"
    t.datetime "turn_deadline_at"
    t.bigint "winner_id"
    t.string "finished_reason"
    t.datetime "started_at"
    t.datetime "finished_at"
    t.integer "lock_version", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_id"], name: "index_matches_on_created_by_id"
    t.index ["current_user_id"], name: "index_matches_on_current_user_id"
    t.index ["invite_code"], name: "index_matches_on_open_invite_code", unique: true, where: "((status)::text = 'waiting_opponent'::text)"
    t.index ["invite_token_digest"], name: "index_matches_on_invite_token_digest", unique: true
    t.index ["status"], name: "index_matches_on_status"
    t.index ["turn_deadline_at"], name: "index_matches_on_turn_deadline_at", where: "((status)::text = 'active'::text)"
    t.index ["winner_id"], name: "index_matches_on_winner_id"
    t.check_constraint "finished_reason IS NULL OR (finished_reason::text = ANY (ARRAY['six_trophies'::character varying, 'walkover'::character varying, 'resigned'::character varying]::text[]))", name: "matches_finished_reason_values"
    t.check_constraint "status::text = ANY (ARRAY['waiting_opponent'::character varying, 'active'::character varying, 'finished'::character varying, 'cancelled'::character varying]::text[])", name: "matches_status_values"
  end

  create_table "question_categories", force: :cascade do |t|
    t.bigint "question_id", null: false
    t.bigint "category_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["category_id"], name: "index_question_categories_on_category_id"
    t.index ["question_id", "category_id"], name: "index_question_categories_on_question_id_and_category_id", unique: true
  end

  create_table "question_exposures", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "question_id", null: false
    t.string "source", null: false
    t.bigint "match_id"
    t.datetime "shown_at", null: false
    t.datetime "created_at", null: false
    t.index ["match_id"], name: "index_question_exposures_on_match_id"
    t.index ["question_id"], name: "index_question_exposures_on_question_id"
    t.index ["user_id", "question_id"], name: "index_question_exposures_on_user_id_and_question_id", unique: true
    t.check_constraint "source::text = ANY (ARRAY['play'::character varying::text, 'authored'::character varying::text, 'reviewed'::character varying::text])", name: "question_exposures_source_values"
  end

  create_table "questions", force: :cascade do |t|
    t.text "prompt", null: false
    t.string "options", null: false, array: true
    t.integer "correct_index", limit: 2, null: false
    t.text "explanation", null: false
    t.string "image_url"
    t.string "status", default: "draft", null: false
    t.integer "difficulty", limit: 2
    t.string "source_url"
    t.string "external_ref"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["external_ref"], name: "index_questions_on_external_ref", unique: true
    t.index ["status"], name: "index_questions_on_status"
    t.check_constraint "cardinality(options) = 4", name: "questions_four_options"
    t.check_constraint "correct_index >= 0 AND correct_index <= 3", name: "questions_correct_index_range"
    t.check_constraint "difficulty IS NULL OR difficulty >= 1 AND difficulty <= 5", name: "questions_difficulty_range"
    t.check_constraint "status::text = ANY (ARRAY['draft'::character varying::text, 'published'::character varying::text, 'retired'::character varying::text])", name: "questions_status_values"
  end

  create_table "sessions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "token_digest", null: false
    t.datetime "expires_at", null: false
    t.string "user_agent"
    t.string "ip_address"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["token_digest"], name: "index_sessions_on_token_digest", unique: true
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "trophies", force: :cascade do |t|
    t.bigint "match_id", null: false
    t.bigint "user_id", null: false
    t.bigint "category_id", null: false
    t.datetime "won_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["category_id"], name: "index_trophies_on_category_id"
    t.index ["match_id", "user_id", "category_id"], name: "index_trophies_on_match_id_and_user_id_and_category_id", unique: true
    t.index ["user_id"], name: "index_trophies_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "display_name", null: false
    t.string "avatar_url"
    t.string "email"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_foreign_key "idempotency_keys", "users", on_delete: :cascade
  add_foreign_key "identities", "users", on_delete: :cascade
  add_foreign_key "match_events", "matches", on_delete: :cascade
  add_foreign_key "match_events", "users", column: "actor_id"
  add_foreign_key "match_players", "matches", on_delete: :cascade
  add_foreign_key "match_players", "users"
  add_foreign_key "match_questions", "matches", on_delete: :cascade
  add_foreign_key "match_questions", "questions"
  add_foreign_key "match_questions", "users"
  add_foreign_key "matches", "users", column: "created_by_id"
  add_foreign_key "matches", "users", column: "current_user_id"
  add_foreign_key "matches", "users", column: "winner_id"
  add_foreign_key "question_categories", "categories"
  add_foreign_key "question_categories", "questions", on_delete: :cascade
  add_foreign_key "question_exposures", "matches", on_delete: :nullify
  add_foreign_key "question_exposures", "questions"
  add_foreign_key "question_exposures", "users"
  add_foreign_key "sessions", "users", on_delete: :cascade
  add_foreign_key "trophies", "categories"
  add_foreign_key "trophies", "matches", on_delete: :cascade
  add_foreign_key "trophies", "users"
end
