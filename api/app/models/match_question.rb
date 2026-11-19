class MatchQuestion < ApplicationRecord
  belongs_to :match
  belongs_to :user
  belongs_to :question

  scope :answered, -> { where.not(answered_at: nil) }
end
