# Aplica ações de uma partida usando o MatchEngine e persiste os efeitos (estado, perguntas, troféus,
# eventos e jobs de prazo). Use dentro de MatchPlay.locked para ter a partida travada (SELECT ... FOR UPDATE).
class MatchPlay
  Result = Data.define(:feedback, :match_question)

  attr_reader :match, :state

  def self.locked(match_id, now: Time.current)
    Match.transaction do
      yield new(Match.lock.find(match_id), now: now)
    end
  end

  # Aplica prazos vencidos numa transação própria (antes de qualquer ação), só se houver algo a fazer.
  def self.settle(match, now: Time.current)
    return match unless match.status == "active"
    return match if MatchEngine.settle(match.engine_state, now: now).last.empty?

    locked(match.id, now: now) { |play| play.settle! }
    match.reload
  end

  def initialize(match, now: Time.current)
    @match = match
    @now = now
    @state = match.engine_state
  end

  # Convite aceito: cria o estado inicial (vez do criador, prazo de 24h).
  def start!
    persist!(MatchEngine.new_match(now: @now))
  end

  def settle!
    return unless match.status == "active"

    previous = state
    settled, events = MatchEngine.settle(state, now: @now)
    return if events.empty?

    events.each do |kind, at|
      if kind == :question_timeout
        close_match_question!(previous.question.id, selected_index: nil, correct: false, timed_out: true, trophy_won: false, at: at)
      end
      MatchEvents.record!(match, kind, at: at, seat: previous.active_seat)
    end
    persist!(settled)
  end

  def draw!(user, rng: Random)
    require_turn!(user)
    current = state.phase == :lobby ? MatchEngine.enter_draw(state) : state
    raise MatchError.new("Agora não é hora de sortear.", status: :conflict) unless current.phase == :draw

    return state if current.drawn_category # já sorteado: devolve o mesmo resultado

    drawn = MatchEngine.draw_category(current, eligible: picker(user).eligible_categories, rng: rng)
    MatchEvents.record!(match, drawn.phase == :empty ? :no_questions_left : :category_drawn, actor: user, at: @now, category: drawn.drawn_category)
    persist!(drawn)
  end

  # Abre a pergunta normal (categoria sorteada) ou a decisiva (troféu escolhido).
  # Retorna :no_question se a categoria não tiver inéditas (o estado volta à escolha/sorteio).
  def open_question!(user, context:, category: nil)
    require_turn!(user)
    seat = state.active_seat
    if context == :trophy
      raise MatchError.new("Agora não é hora de escolher troféu.", status: :conflict) unless state.phase == :trophy
      raise MatchError, "Categoria inválida." unless Category::SLUGS.include?(category)
      raise MatchError, "Você já conquistou este troféu." if state.trophies[seat].include?(category)
    else
      raise MatchError.new("Sorteie a categoria primeiro.", status: :conflict) unless state.phase == :draw && state.drawn_category

      category = state.drawn_category
    end

    question = picker(user).pick!(category, match_id: match.id, now: @now)
    ref = question && begin
      mq = match.match_questions.create!(user: user, question: question, context: context.to_s, category_slug: category,
                                         shown_at: @now, deadline_at: @now + MatchEngine::QUESTION_DURATION)
      MatchEngine::QuestionRef.new(id: mq.id, correct_index: question.correct_index)
    end

    opened = if context == :trophy
      MatchEngine.start_trophy_question(state, category: category, question: ref, now: @now)
    else
      MatchEngine.start_normal_question(state, question: ref, now: @now)
    end

    if opened.phase == :empty
      persist!(MatchEngine.recover_from_empty(opened, eligible_count: picker(user).eligible_categories.size))
      return :no_question
    end

    MatchEvents.record!(match, :question_shown, actor: user, at: @now, match_question_id: ref.id, category: category, context: context)
    persist!(opened)
    schedule_clock(opened.deadline + MatchEngine::NETWORK_TOLERANCE)
    :ok
  end

  def answer!(user, selected_index)
    require_turn!(user)
    raise MatchError.new("Não há pergunta aberta.", status: :conflict) unless state.phase == :question
    raise MatchError, "Alternativa inválida." unless selected_index.is_a?(Integer) && selected_index.between?(0, 3)

    answered = MatchEngine.answer(state, selected_index, now: @now)
    fb = answered.feedback
    mq = close_match_question!(state.question.id, selected_index: fb.selected_index, correct: fb.correct,
                               timed_out: fb.timed_out, trophy_won: fb.trophy_won, at: @now)
    if fb.trophy_won
      match.trophies.create!(user: user, category: Category.find_by!(slug: fb.category), won_at: @now)
      MatchEvents.record!(match, :trophy_won, actor: user, at: @now, category: fb.category)
    end
    MatchEvents.record!(match, :answered, actor: user, at: @now, match_question_id: mq.id, correct: fb.correct, timed_out: fb.timed_out)

    persist!(MatchEngine.continue_after_feedback(answered, now: @now))
    Result.new(feedback: fb, match_question: mq)
  end

  def resign!(user)
    seat = match.seat_of(user)
    raise MatchError.new("Partida não está em andamento.", status: :conflict) unless match.status == "active"

    MatchEvents.record!(match, :resigned, actor: user, at: @now)
    persist!(MatchEngine.resign(state, seat))
  end

  private

  def require_turn!(user)
    raise MatchError.new("Partida não está em andamento.", status: :conflict) unless match.status == "active"
    raise MatchError.new("Não é a sua vez.", status: :conflict) unless match.current_user_id == user.id
  end

  def picker(user) = @picker ||= QuestionPicker.new(user)

  def close_match_question!(id, selected_index:, correct:, timed_out:, trophy_won:, at:)
    mq = match.match_questions.find(id)
    mq.update!(answered_at: timed_out ? nil : at, selected_index: selected_index, correct: correct, timed_out: timed_out, trophy_won: trophy_won)
    mq
  end

  def persist!(new_state)
    finished = new_state.phase == :finished
    turn_changed = @state.nil? || new_state.turn_deadline != @state.turn_deadline
    match.update!(
      state: MatchState.dump(new_state),
      status: finished ? "finished" : "active",
      current_user: finished ? nil : match.user_at(new_state.active_seat),
      turn_deadline_at: finished ? nil : new_state.turn_deadline,
      winner: finished && new_state.winner ? match.user_at(new_state.winner) : nil,
      finished_reason: new_state.finished_reason&.to_s,
      finished_at: finished ? (match.finished_at || @now) : nil
    )
    MatchEvents.record!(match, :finished, at: @now, reason: new_state.finished_reason, winner_seat: new_state.winner) if finished && !@state&.phase.eql?(:finished)
    schedule_clock(new_state.turn_deadline) if turn_changed && !finished
    @state = new_state
  end

  # Agenda o "relógio" da partida após o commit. O job só chama settle!, então é seguro rodar a mais.
  def schedule_clock(at)
    match_id = match.id
    ActiveRecord.after_all_transactions_commit { MatchClockJob.set(wait_until: at).perform_later(match_id) }
  end
end
