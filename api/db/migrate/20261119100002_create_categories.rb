class CreateCategories < ActiveRecord::Migration[8.1]
  def change
    create_table :categories do |t|
      t.string :slug, null: false, index: { unique: true }
      t.string :label, null: false
      t.string :short_label, null: false
      t.string :color, null: false
      t.string :icon, null: false
      t.integer :position, null: false
      t.timestamps
    end
  end
end
