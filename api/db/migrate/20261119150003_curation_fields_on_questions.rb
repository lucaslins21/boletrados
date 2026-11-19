class CurationFieldsOnQuestions < ActiveRecord::Migration[8.1]
  STATUSES = %w[submitted in_review changes_requested rejected published archived].freeze
  LEVELS = %w[easy medium hard].freeze

  def up
    enable_extension "pg_trgm" # detecção de perguntas parecidas (similaridade de trigramas)

    remove_check_constraint :questions, name: "questions_status_values"
    remove_check_constraint :questions, name: "questions_difficulty_range"
    execute "UPDATE questions SET status = 'archived' WHERE status = 'retired'"
    execute "UPDATE questions SET status = 'submitted' WHERE status = 'draft'"
    change_column_default :questions, :status, "submitted"
    add_check_constraint :questions, "status IN (#{STATUSES.map { |s| "'#{s}'" }.join(', ')})", name: "questions_status_values"

    remove_column :questions, :difficulty
    add_column :questions, :initial_difficulty, :string, null: false, default: "medium" # estimada por quem criou
    add_column :questions, :difficulty, :string, null: false, default: "medium"         # atual (recalculada)
    add_check_constraint :questions, "initial_difficulty IN ('easy', 'medium', 'hard')", name: "questions_initial_difficulty_values"
    add_check_constraint :questions, "difficulty IN ('easy', 'medium', 'hard')", name: "questions_difficulty_values"

    # Desempenho real (base da dificuldade dinâmica). Timeouts separados de erros de conhecimento.
    add_column :questions, :answers_count, :integer, null: false, default: 0
    add_column :questions, :correct_count, :integer, null: false, default: 0
    add_column :questions, :timeouts_count, :integer, null: false, default: 0

    add_reference :questions, :author, foreign_key: { to_table: :users }
    add_reference :questions, :image, foreign_key: { to_table: :question_images }
    add_column :questions, :submitted_at, :datetime
    add_column :questions, :published_at, :datetime
    execute "UPDATE questions SET published_at = created_at WHERE status = 'published'"

    add_index :questions, :prompt, using: :gin, opclass: :gin_trgm_ops, name: "index_questions_on_prompt_trgm"
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
