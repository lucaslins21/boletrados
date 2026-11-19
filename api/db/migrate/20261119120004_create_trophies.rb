class CreateTrophies < ActiveRecord::Migration[8.1]
  def change
    create_table :trophies do |t|
      t.references :match, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.references :user, null: false, foreign_key: true
      t.references :category, null: false, foreign_key: true
      t.datetime :won_at, null: false
      t.timestamps
    end
    add_index :trophies, [ :match_id, :user_id, :category_id ], unique: true
  end
end
