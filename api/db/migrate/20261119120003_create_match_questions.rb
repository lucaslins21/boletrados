class CreateMatchQuestions < ActiveRecord::Migration[8.1]
  def change
    # Cada pergunta exibida numa partida: prazo, resposta e resultado (histórico e estatísticas).
    create_table :match_questions do |t|
      t.references :match, null: false, foreign_key: { on_delete: :cascade }
      t.references :user, null: false, foreign_key: true
      t.references :question, null: false, foreign_key: true
      t.string :context, null: false
      t.string :category_slug, null: false
      t.datetime :shown_at, null: false
      t.datetime :deadline_at, null: false
      t.datetime :answered_at
      t.integer :selected_index, limit: 2
      t.boolean :correct
      t.boolean :timed_out
      t.boolean :trophy_won, null: false, default: false
      t.timestamps

      t.check_constraint "context IN ('normal', 'trophy')", name: "match_questions_context_values"
    end
  end
end
