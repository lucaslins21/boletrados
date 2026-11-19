class CreateQuestionCategories < ActiveRecord::Migration[8.1]
  def change
    # Uma pergunta pode ter várias categorias sem duplicação física da questão.
    create_table :question_categories do |t|
      t.references :question, null: false, foreign_key: { on_delete: :cascade }, index: false
      t.references :category, null: false, foreign_key: true
      t.timestamps
    end
    add_index :question_categories, [ :question_id, :category_id ], unique: true
  end
end
