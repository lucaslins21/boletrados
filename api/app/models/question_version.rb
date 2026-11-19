class QuestionVersion < ApplicationRecord
  belongs_to :question
  belongs_to :editor, class_name: "User"
end
