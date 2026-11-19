class CreatePushSubscriptions < ActiveRecord::Migration[8.1]
  def change
    # Inscrições Web Push (uma por navegador/aparelho do usuário).
    create_table :push_subscriptions do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }
      t.text :endpoint, null: false, index: { unique: true }
      t.string :p256dh, null: false
      t.string :auth, null: false
      t.string :user_agent
      t.datetime :last_sent_at
      t.timestamps
    end
  end
end
