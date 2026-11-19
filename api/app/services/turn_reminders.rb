# Lembrete "faltam 4 h": enviado uma única vez por vez, só se ela ainda não começou (fase lobby).
# Chamado pelo TurnReminderJob (agendado) e pelo tick de hora em hora (rede de segurança no plano grátis).
module TurnReminders
  module_function

  def deliver_if_due(match_id, turn_number: nil, now: Time.current)
    Match.find_by(id: match_id)&.then { |m| MatchPlay.settle(m, now: now) }
    user = nil
    match = nil
    Match.transaction do
      match = Match.lock.find_by(id: match_id)
      return false unless match&.status == "active"

      state = match.engine_state
      return false if turn_number && state.turn_number != turn_number
      return false unless state.phase == :lobby
      return false if match.reminded_turn_number == state.turn_number
      return false if match.turn_deadline_at - MatchNotifier::REMINDER_BEFORE > now # ainda é cedo

      match.update_columns(reminded_turn_number: state.turn_number)
      user = match.current_user
    end
    MatchNotifier.turn_reminder(match, user)
    true
  end

  # Partidas cuja vez vence nas próximas 4 h e ainda não foram lembradas.
  def due_match_ids(now: Time.current)
    Match.where(status: "active", turn_deadline_at: now..(now + MatchNotifier::REMINDER_BEFORE))
         .where("reminded_turn_number IS NULL OR reminded_turn_number <> (state->>'turn_number')::int")
         .pluck(:id)
  end
end
