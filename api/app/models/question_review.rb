class QuestionReview < ApplicationRecord
  DECISIONS = %w[approve reject request_changes archive restore edit].freeze

  belongs_to :question
  belongs_to :reviewer, class_name: "User"

  validates :decision, inclusion: { in: DECISIONS }
  validates :reviewer_kind, inclusion: { in: %w[admin community] }
end
