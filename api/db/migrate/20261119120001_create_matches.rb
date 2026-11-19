class CreateMatches < ActiveRecord::Migration[8.1]
  def change
    create_table :matches do |t|
      t.string :status, null: false, default: "waiting_opponent"
      t.references :created_by, null: false, foreign_key: { to_table: :users }
      # Convite: link com token longo (só o hash fica no banco) e código curto para digitar.
      t.string :invite_token_digest, null: false, index: { unique: true }
      t.string :invite_code, null: false
      t.datetime :invite_expires_at, null: false
      # Estado do MatchEngine (fonte da verdade da partida). Nulo até o convite ser aceito.
      t.jsonb :state
      # Colunas derivadas do estado, para consultas ("sua vez", prazos, histórico).
      t.references :current_user, foreign_key: { to_table: :users }
      t.datetime :turn_deadline_at
      t.references :winner, foreign_key: { to_table: :users }
      t.string :finished_reason
      t.datetime :started_at
      t.datetime :finished_at
      t.integer :lock_version, null: false, default: 0
      t.timestamps

      t.check_constraint "status IN ('waiting_opponent', 'active', 'finished', 'cancelled')", name: "matches_status_values"
      t.check_constraint "finished_reason IS NULL OR finished_reason IN ('six_trophies', 'walkover', 'resigned')", name: "matches_finished_reason_values"
    end
    add_index :matches, :invite_code, unique: true, where: "status = 'waiting_opponent'", name: "index_matches_on_open_invite_code"
    add_index :matches, :turn_deadline_at, where: "status = 'active'"
    add_index :matches, :status
  end
end
