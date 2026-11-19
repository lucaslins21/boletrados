class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :display_name, null: false
      t.string :avatar_url
      # Apenas para contato (avisos). Não é usado para vincular provedores automaticamente.
      t.string :email
      t.timestamps
    end
  end
end
