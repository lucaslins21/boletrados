class CreateMatchEvents < ActiveRecord::Migration[8.1]
  def change
    # Log append-only da partida: auditoria, histórico de confronto e depuração.
    create_table :match_events do |t|
      t.references :match, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.integer :seq, null: false
      t.string :kind, null: false
      t.jsonb :payload, null: false, default: {}
      t.references :actor, foreign_key: { to_table: :users }
      t.datetime :created_at, null: false
    end
    add_index :match_events, [ :match_id, :seq ], unique: true
  end
end
