class QuestionCategory < ApplicationRecord
  belongs_to :question
  belongs_to :category

  validates :category_id, uniqueness: { scope: :question_id }
end
