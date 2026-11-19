class CreateQuestionExposures < ActiveRecord::Migration[8.1]
  def change
    # Registro de toda pergunta que um usuário já viu (jogando, escrevendo ou revisando).
    # A unicidade (user_id, question_id) é a garantia, no banco, de que nenhuma pergunta se repete.
    create_table :question_exposures do |t|
      t.references :user, null: false, foreign_key: true, index: false
      t.references :question, null: false, foreign_key: true
      t.string :source, null: false
      # Partida em que a exposição ocorreu (FK adicionada quando a tabela matches existir).
      t.bigint :match_id
      t.datetime :shown_at, null: false
      t.datetime :created_at, null: false

      t.check_constraint "source IN ('play', 'authored', 'reviewed')", name: "question_exposures_source_values"
    end
    add_index :question_exposures, [ :user_id, :question_id ], unique: true
  end
end
