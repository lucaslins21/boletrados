# Visão da partida para um participante. Regras de sigilo:
# - a alternativa correta da pergunta aberta nunca é enviada;
# - a pergunta aberta só aparece para quem está respondendo.
module MatchSerializer
  module_function

  def call(match, viewer:)
    state = match.engine_state
    my_seat = match.seat_of(viewer)
    {
      id: match.id,
      status: match.status,
      my_seat: my_seat,
      created_by_me: match.created_by_id == viewer.id,
      invite: invite(match, viewer),
      players: match.match_players.map { |mp| player(mp, state) },
      turn: state && match.status == "active" ? turn(state, my_seat) : nil,
      question: open_question(match, state, my_seat),
      last_result: last_result(match, viewer),
      winner_seat: state&.winner,
      finished_reason: match.finished_reason,
      started_at: match.started_at,
      finished_at: match.finished_at,
      # Para o cliente calcular o tempo restante sem depender do relógio do aparelho.
      server_time: Time.current
    }
  end

  def invite(match, viewer)
    return nil unless match.status == "waiting_opponent" && match.created_by_id == viewer.id

    { code: match.invite_code, expires_at: match.invite_expires_at }
  end

  def player(match_player, state)
    seat = match_player.seat
    {
      seat: seat,
      user: UserSerializer.call(match_player.user),
      trophies: state ? state.trophies[seat] : [],
      attempts: state ? state.attempts[seat] : 0,
      correct_answers: state ? state.correct_answers[seat] : 0,
      streak: state ? MatchEngine.streak_of(state, seat) : 0
    }
  end

  def turn(state, my_seat)
    {
      active_seat: state.active_seat,
      my_turn: state.active_seat == my_seat,
      phase: state.phase,
      streak: state.streak,
      number: state.turn_number,
      deadline_at: state.turn_deadline,
      drawn_category: state.drawn_category
    }
  end

  def open_question(match, state, my_seat)
    return nil unless state&.phase == :question && state.active_seat == my_seat

    mq = match.match_questions.includes(:question).find(state.question.id)
    q = mq.question
    { id: mq.id, prompt: q.prompt, options: q.options, image_url: q.image&.path || q.image_url,
      category: mq.category_slug, context: mq.context, deadline_at: mq.deadline_at }
  end

  # Resultado da última pergunta respondida (ou esgotada) pelo usuário nesta partida, com a explicação.
  def last_result(match, viewer)
    mq = match.match_questions.includes(:question).where(user: viewer).where.not(correct: nil).order(:id).last
    mq && result(mq)
  end

  def result(match_question)
    q = match_question.question
    {
      match_question_id: match_question.id, category: match_question.category_slug, context: match_question.context,
      correct: match_question.correct, timed_out: match_question.timed_out, trophy_won: match_question.trophy_won,
      selected_index: match_question.selected_index, correct_index: q.correct_index,
      selected_option: match_question.selected_index && q.options[match_question.selected_index],
      correct_option: q.options[q.correct_index], explanation: q.explanation
    }
  end
end
