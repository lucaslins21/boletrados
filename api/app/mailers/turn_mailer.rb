class TurnMailer < ApplicationMailer
  def reminder(user, match)
    @user = user
    @opponent = MatchNotifier.opponent_name(match, user)
    @url = MatchNotifier.match_url(match)
    mail(to: user.email, subject: "Faltam 4 horas para sua vez contra #{@opponent} expirar")
  end
end
