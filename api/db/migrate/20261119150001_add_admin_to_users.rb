class AddAdminToUsers < ActiveRecord::Migration[8.1]
  def change
    # Concedido só por comando no servidor: bin/rails "admin:grant[EMAIL_OU_ID]".
    add_column :users, :admin, :boolean, null: false, default: false
  end
end
