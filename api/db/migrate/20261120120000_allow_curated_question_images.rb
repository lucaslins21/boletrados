# Imagens da curadoria (importadas de db/curated) não têm um usuário que as enviou.
class AllowCuratedQuestionImages < ActiveRecord::Migration[8.1]
  def change
    change_column_null :question_images, :uploader_id, true
  end
end
