# Lembrete 4 h antes do prazo da vez — só se a vez ainda não começou (fase lobby) e continua a mesma.
class TurnReminderJob < ApplicationJob
  queue_as :default

  def perform(match_id, turn_number)
    match = Match.find_by(id: match_id)
    return unless match

    match = MatchPlay.settle(match)
    state = match.engine_state
    return unless match.status == "active" && state.turn_number == turn_number && state.phase == :lobby

    MatchNotifier.turn_reminder(match, match.current_user)
  end
end
