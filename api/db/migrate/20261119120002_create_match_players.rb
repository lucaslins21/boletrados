class CreateMatchPlayers < ActiveRecord::Migration[8.1]
  def change
    create_table :match_players do |t|
      t.references :match, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.references :user, null: false, foreign_key: true
      t.integer :seat, limit: 2, null: false
      t.timestamps

      t.check_constraint "seat IN (0, 1)", name: "match_players_seat_values"
    end
    add_index :match_players, [ :match_id, :user_id ], unique: true
    add_index :match_players, [ :match_id, :seat ], unique: true
  end
end
