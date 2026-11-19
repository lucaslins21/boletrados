# Estatísticas do perfil de um jogador. Tempo esgotado conta como erro (decisão de produto).
class ProfileStats
  def initialize(user)
    @user = user
  end

  def summary
    finished = matches.where(status: "finished")
    wins = finished.where(winner_id: @user.id).count
    played = finished.count
    {
      played: played, wins: wins, losses: played - wins,
      in_progress: matches.where(status: "active").count,
      trophies: Trophy.where(user: @user).count
    }
  end

  # Por categoria: perguntas respondidas (inclui tempo esgotado), acertos e troféus conquistados.
  def categories
    answered = MatchQuestion.where(user: @user).where.not(correct: nil)
    totals = answered.group(:category_slug).count
    correct = answered.where(correct: true).group(:category_slug).count
    trophies = Trophy.where(user: @user).joins(:category).group("categories.slug").count
    Category::SLUGS.map do |slug|
      { category: slug, answered: totals.fetch(slug, 0), correct: correct.fetch(slug, 0), trophies: trophies.fetch(slug, 0) }
    end
  end

  # Confrontos contra um adversário específico, do ponto de vista de @user.
  def head_to_head(other)
    shared = matches.where(id: MatchPlayer.where(user: other).select(:match_id)).where(status: %w[active finished])
    finished = shared.where(status: "finished")
    wins = finished.where(winner_id: @user.id).count
    {
      played: finished.count, wins: wins, losses: finished.count - wins,
      in_progress: shared.where(status: "active").count,
      recent: shared.order(Arel.sql("COALESCE(finished_at, started_at) DESC")).limit(10).map do |m|
        { match_id: m.id, status: m.status, won: m.status == "finished" ? m.winner_id == @user.id : nil,
          finished_reason: m.finished_reason, finished_at: m.finished_at, started_at: m.started_at }
      end
    }
  end

  # Adversários mais frequentes, com o placar de partidas encerradas.
  def rivals(limit: 10)
    rows = MatchPlayer.joins(:match)
                      .where(match_id: matches.where(status: %w[active finished]).select(:id))
                      .where.not(user_id: @user.id)
                      .group(:user_id)
                      .select(:user_id,
                              "COUNT(*) FILTER (WHERE matches.status = 'finished') AS played",
                              ActiveRecord::Base.sanitize_sql([ "COUNT(*) FILTER (WHERE matches.status = 'finished' AND matches.winner_id = ?) AS wins", @user.id ]),
                              "COUNT(*) AS total")
                      .order("total DESC").limit(limit)
    users = User.where(id: rows.map(&:user_id)).index_by(&:id)
    rows.map do |row|
      { user: UserSerializer.call(users[row.user_id]), played: row.played, wins: row.wins, losses: row.played - row.wins }
    end
  end

  private

  def matches = Match.involving(@user)
end
