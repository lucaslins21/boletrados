class CreateIdempotencyKeys < ActiveRecord::Migration[8.1]
  def change
    # Respostas guardadas por (usuário, Idempotency-Key): repetir a requisição devolve a mesma resposta.
    create_table :idempotency_keys do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.string :key, null: false
      t.string :request_method, null: false
      t.string :request_path, null: false
      t.integer :response_status
      t.jsonb :response_body
      t.datetime :created_at, null: false
    end
    add_index :idempotency_keys, [ :user_id, :key ], unique: true
    add_index :idempotency_keys, :created_at
  end
end
