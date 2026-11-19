# Rede de segurança para hospedagem sem worker permanente: aplica prazos vencidos de partidas que ninguém
# abriu (pergunta de 15 s, vez de 24 h, W.O.) e envia lembretes pendentes. Idempotente.
module MatchTick
  module_function

  def run(now: Time.current)
    overdue = Match.where(status: "active").where(
      "turn_deadline_at <= :now OR (state->>'phase' = 'question' AND (state->>'deadline')::timestamptz < :limit)",
      now: now, limit: now - MatchEngine::NETWORK_TOLERANCE
    ).pluck(:id)
    overdue.each { |id| MatchPlay.locked(id, now: now) { |play| play.settle! } }

    reminded = TurnReminders.due_match_ids(now: now).count { |id| TurnReminders.deliver_if_due(id, now: now) }
    { settled: overdue.size, reminded: reminded }
  end
end
