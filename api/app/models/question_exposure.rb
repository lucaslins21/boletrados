class QuestionExposure < ApplicationRecord
  SOURCES = %w[play authored reviewed].freeze

  belongs_to :user
  belongs_to :question

  validates :source, inclusion: { in: SOURCES }
  validates :shown_at, presence: true

  # Registra que o usuário viu a pergunta (autoria ou revisão), sem duplicar. A regra de nunca repetir
  # depende só de existir uma linha (user, question), qualquer que seja a origem.
  def self.record!(user, question, source)
    now = Time.current
    insert_all([ { user_id: user.id, question_id: question.id, source: source, shown_at: now, created_at: now } ],
               unique_by: %i[user_id question_id])
  end
end
