# Lembrete 4 h antes do prazo da vez. Ver TurnReminders.
class TurnReminderJob < ApplicationJob
  queue_as :default

  def perform(match_id, turn_number)
    TurnReminders.deliver_if_due(match_id, turn_number: turn_number)
  end
end
