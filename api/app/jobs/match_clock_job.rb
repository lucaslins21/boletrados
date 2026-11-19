# Aplica prazos vencidos (pergunta de 15s, vez de 24h, W.O.). Idempotente: rodar a mais não muda nada.
class MatchClockJob < ApplicationJob
  queue_as :default

  def perform(match_id)
    MatchPlay.locked(match_id) { |play| play.settle! }
  rescue ActiveRecord::RecordNotFound
    nil # partida removida
  end
end
