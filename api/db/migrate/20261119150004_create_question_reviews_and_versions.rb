class CreateQuestionReviewsAndVersions < ActiveRecord::Migration[8.1]
  def change
    # Decisões de moderação. Hoje só administradores (reviewer_kind = admin); a revisão comunitária futura
    # (3 aprovações independentes de revisores confiáveis) usará a mesma tabela com reviewer_kind = community.
    create_table :question_reviews do |t|
      t.references :question, null: false, foreign_key: { on_delete: :cascade }
      t.references :reviewer, null: false, foreign_key: { to_table: :users }
      t.string :reviewer_kind, null: false, default: "admin"
      t.string :decision, null: false
      t.text :notes
      t.datetime :created_at, null: false

      t.check_constraint "reviewer_kind IN ('admin', 'community')", name: "question_reviews_kind_values"
      t.check_constraint "decision IN ('approve', 'reject', 'request_changes', 'archive', 'restore', 'edit')", name: "question_reviews_decision_values"
    end

    # Histórico de edições (auditoria). Editar não torna a pergunta inédita: as exposições continuam pelo id.
    create_table :question_versions do |t|
      t.references :question, null: false, foreign_key: { on_delete: :cascade }
      t.references :editor, null: false, foreign_key: { to_table: :users }
      t.jsonb :snapshot, null: false
      t.datetime :created_at, null: false
    end
  end
end
