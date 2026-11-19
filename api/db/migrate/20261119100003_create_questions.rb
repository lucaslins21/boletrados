class CreateQuestions < ActiveRecord::Migration[8.1]
  def change
    create_table :questions do |t|
      t.text :prompt, null: false
      t.string :options, array: true, null: false
      t.integer :correct_index, limit: 2, null: false
      t.text :explanation, null: false
      t.string :image_url
      t.string :status, null: false, default: "draft"
      t.integer :difficulty, limit: 2
      t.string :source_url
      # Referência estável para conteúdo importado (ex.: "demo-001"), permite seeds idempotentes.
      t.string :external_ref, index: { unique: true }
      t.timestamps

      t.check_constraint "cardinality(options) = 4", name: "questions_four_options"
      t.check_constraint "correct_index BETWEEN 0 AND 3", name: "questions_correct_index_range"
      t.check_constraint "status IN ('draft', 'published', 'retired')", name: "questions_status_values"
      t.check_constraint "difficulty IS NULL OR difficulty BETWEEN 1 AND 5", name: "questions_difficulty_range"
    end
    add_index :questions, :status
  end
end
