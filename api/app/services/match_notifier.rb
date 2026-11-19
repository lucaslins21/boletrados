# Textos e destinos dos avisos de partida (Web Push e, no lembrete, e-mail).
module MatchNotifier
  REMINDER_BEFORE = 4.hours

  module_function

  def match_url(match) = "#{Rails.configuration.x.frontend_url}/partidas/#{match.id}"

  def opponent_name(match, user)
    match.match_players.find { |mp| mp.user_id != user.id }&.user&.display_name || "seu adversário"
  end

  def your_turn(match, user)
    push(match, user, tag: "turn", title: "Sua vez no Boletrados!",
         body: "A bola é sua contra #{opponent_name(match, user)}. Você tem 24 h para jogar.")
  end

  def invite_accepted(match, user)
    push(match, user, tag: "turn", title: "#{opponent_name(match, user)} aceitou seu desafio!",
         body: "A partida começou e a primeira vez é sua.")
  end

  def match_finished(match, user)
    won = match.winner_id == user.id
    push(match, user, tag: "finished", title: won ? "Você venceu! 🏆" : "Fim de jogo",
         body: won ? "Você venceu #{opponent_name(match, user)}." : "#{opponent_name(match, user)} venceu desta vez. Que tal uma revanche?")
  end

  def turn_reminder(match, user)
    push(match, user, tag: "turn", title: "Faltam 4 h para sua vez expirar",
         body: "Jogue contra #{opponent_name(match, user)} antes que a vez passe.")
    TurnMailer.reminder(user, match).deliver_later if user.email.present?
  end

  def push(match, user, tag:, title:, body:)
    WebPushSender.deliver(user, title: title, body: body, url: match_url(match), tag: "match-#{match.id}-#{tag}")
  end
  private_class_method :push
end
