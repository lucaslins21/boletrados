# Envia um aviso de partida (push) a um usuário. Ver MatchNotifier.
class MatchNotificationJob < ApplicationJob
  KINDS = %w[your_turn invite_accepted match_finished].freeze

  queue_as :default
  discard_on ActiveRecord::RecordNotFound

  def perform(kind, match_id, user_id)
    raise ArgumentError, "aviso desconhecido: #{kind}" unless KINDS.include?(kind)

    MatchNotifier.public_send(kind, Match.find(match_id), User.find(user_id))
  end
end
