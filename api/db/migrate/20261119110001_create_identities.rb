class CreateIdentities < ActiveRecord::Migration[8.1]
  def change
    # Uma conta interna (users) pode ter várias identidades de provedores. Vínculo sempre explícito.
    create_table :identities do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }
      t.string :provider, null: false
      t.string :uid, null: false
      t.string :email
      t.timestamps

      t.check_constraint "provider IN ('google', 'facebook')", name: "identities_provider_values"
    end
    add_index :identities, [ :provider, :uid ], unique: true
  end
end
