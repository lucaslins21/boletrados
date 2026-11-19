class CreateSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :sessions do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }
      # Só o hash SHA-256 do token; o token em si vive apenas no cookie do navegador.
      t.string :token_digest, null: false, index: { unique: true }
      t.datetime :expires_at, null: false
      t.string :user_agent
      t.string :ip_address
      t.timestamps
    end
  end
end
