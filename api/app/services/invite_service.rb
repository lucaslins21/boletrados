# Criação e aceite de convites para X1.
module InviteService
  module_function

  # Devolve [partida, token]. O token só existe aqui e no link compartilhado.
  def create!(user, now: Time.current)
    User.transaction do
      user.lock! # serializa criações do mesmo usuário (limite de convites pendentes)
      if user.pending_invites_count >= Match::MAX_PENDING_INVITES_PER_USER
        raise MatchError, "Você já tem #{Match::MAX_PENDING_INVITES_PER_USER} convites aguardando resposta."
      end

      token = SecureRandom.urlsafe_base64(32)
      match = create_with_unique_code(user, token, now)
      [ match, token ]
    end
  end

  def accept!(key, user, now: Time.current)
    Match.transaction do
      match = Match.find_invite(key) or raise MatchError.new("Convite não encontrado.", status: :not_found)
      match.lock!
      validate_acceptance!(match, user, now)

      # Trava os dois usuários em ordem de id (evita deadlock) e confere o limite de partidas em andamento.
      User.where(id: [ match.created_by_id, user.id ]).order(:id).lock.load
      if user.active_matches_count >= Match::MAX_ACTIVE_PER_USER
        raise MatchError, "Você já tem #{Match::MAX_ACTIVE_PER_USER} partidas em andamento. Termine uma antes de aceitar outra."
      end
      if match.created_by.active_matches_count >= Match::MAX_ACTIVE_PER_USER
        raise MatchError, "#{match.created_by.display_name} já tem #{Match::MAX_ACTIVE_PER_USER} partidas em andamento."
      end

      match.match_players.create!(user: user, seat: 1)
      match.update!(status: "active", started_at: now)
      MatchEvents.record!(match, :invite_accepted, actor: user, at: now)
      MatchPlay.new(match.reload, now: now).start!
      match
    end
  end

  def cancel!(match, user)
    Match.transaction do
      match.lock!
      raise MatchError.new("Só quem criou o convite pode cancelá-lo.", status: :forbidden) unless match.created_by_id == user.id
      raise MatchError.new("Este convite não está mais aberto.", status: :conflict) unless match.status == "waiting_opponent"

      match.update!(status: "cancelled")
      MatchEvents.record!(match, :invite_cancelled, actor: user)
    end
  end

  def validate_acceptance!(match, user, now)
    case match.status
    when "cancelled" then raise MatchError.new("Este convite foi cancelado.", status: :gone)
    when "active", "finished" then raise MatchError.new("Este convite já foi aceito.", status: :conflict)
    end
    raise MatchError.new("Este convite expirou.", status: :gone) if match.invite_expired?(now)
    raise MatchError, "Você não pode aceitar o próprio convite." if match.created_by_id == user.id
  end

  def create_with_unique_code(user, token, now)
    3.times do
      return Match.transaction(requires_new: true) do
        match = Match.create!(created_by: user, invite_token_digest: Match.token_digest(token),
                              invite_code: Match.generate_code, invite_expires_at: now + Match::INVITE_TTL)
        match.match_players.create!(user: user, seat: 0)
        MatchEvents.record!(match, :invite_created, actor: user, at: now)
        match
      end
    rescue ActiveRecord::RecordNotUnique
      next # colisão de código curto; tenta outro
    end
    raise MatchError.new("Não foi possível gerar o convite. Tente de novo.", status: :service_unavailable)
  end
  private_class_method :validate_acceptance!, :create_with_unique_code
end
