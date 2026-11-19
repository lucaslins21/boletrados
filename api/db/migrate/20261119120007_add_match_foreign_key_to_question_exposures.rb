class AddMatchForeignKeyToQuestionExposures < ActiveRecord::Migration[8.1]
  def change
    add_foreign_key :question_exposures, :matches, on_delete: :nullify
    add_index :question_exposures, :match_id
  end
end
