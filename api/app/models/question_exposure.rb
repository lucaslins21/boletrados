class QuestionExposure < ApplicationRecord
  SOURCES = %w[play authored reviewed].freeze

  belongs_to :user
  belongs_to :question

  validates :source, inclusion: { in: SOURCES }
  validates :shown_at, presence: true
end
