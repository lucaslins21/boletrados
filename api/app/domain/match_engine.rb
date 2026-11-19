# Motor de regras do X1, em funções puras: recebe um estado e devolve um novo estado, sem banco nem relógio.
# Espelha web/src/lib/game.ts (modo demo) e acrescenta as regras do servidor (docs/ARQUITETURA.md):
# tolerância de rede no prazo da pergunta, prazo de 24h por vez e W.O. após 3 estouros seguidos.
#
# Quem chama (serviços/controllers) é responsável por: escolher a pergunta (QuestionPicker), informar as
# categorias elegíveis, persistir o estado e agendar os jobs de prazo.
module MatchEngine
  QUESTION_DURATION = 15 # segundos
  NETWORK_TOLERANCE = 1  # segundos aceitos após o prazo, por latência
  STREAK_FOR_TROPHY = 3
  TROPHIES_TO_WIN = Category::SLUGS.size
  TURN_DURATION = 24 * 60 * 60 # segundos
  TIMEOUTS_FOR_WALKOVER = 3
  KEEP_POSSESSION_AFTER_TROPHY = true

  PHASES = %i[lobby draw question trophy feedback empty finished].freeze

  QuestionRef = Data.define(:id, :correct_index)
  Feedback = Data.define(:correct, :selected_index, :correct_index, :context, :category, :trophy_won, :timed_out)

  State = Data.define(
    :phase, :active_seat, :trophies, :streak, :attempts, :correct_answers, :consecutive_timeouts,
    :drawn_category, :selected_category, :context, :question, :deadline, :feedback,
    :turn_number, :turn_deadline, :winner, :finished_reason
  )

  module_function

  def new_match(now:)
    State.new(
      phase: :lobby, active_seat: 0, trophies: [ [], [] ], streak: 0, attempts: [ 0, 0 ], correct_answers: [ 0, 0 ],
      consecutive_timeouts: [ 0, 0 ], drawn_category: nil, selected_category: nil, context: :normal, question: nil,
      deadline: nil, feedback: nil, turn_number: 1, turn_deadline: now + TURN_DURATION, winner: nil, finished_reason: nil
    )
  end

  def other_seat(seat) = 1 - seat

  # Lobby → sorteio.
  def enter_draw(state)
    return state unless state.phase == :lobby

    state.with(phase: :draw, drawn_category: nil)
  end

  # Sorteia uma única vez por pergunta normal, só entre as categorias com inéditas para o jogador (`eligible`).
  # Sem nenhuma elegível, vai para :empty.
  def draw_category(state, eligible:, rng: Random)
    return state unless state.phase == :draw && state.drawn_category.nil?
    return state.with(phase: :empty, context: :normal, selected_category: nil, deadline: nil) if eligible.empty?

    state.with(drawn_category: eligible[rng.rand(eligible.size)])
  end

  # Sorteio concluído → pergunta normal. `question` nil significa que a categoria não tem inéditas.
  def start_normal_question(state, question:, now:)
    return state unless state.phase == :draw && state.drawn_category

    open_question(state, category: state.drawn_category, context: :normal, question: question, now: now)
  end

  # Escolha do troféu → pergunta decisiva. Rejeita troféu já conquistado.
  def start_trophy_question(state, category:, question:, now:)
    return state unless state.phase == :trophy
    return state if state.trophies[state.active_seat].include?(category)

    open_question(state, category: category, context: :trophy, question: question, now: now)
  end

  # Resposta do jogador (nil = sem resposta). Fora do prazo + tolerância conta como tempo esgotado.
  def answer(state, selected_index, now:)
    return state unless state.phase == :question && state.question && state.deadline

    timed_out = now > state.deadline + NETWORK_TOLERANCE
    resolve_question(state, timed_out ? nil : selected_index, timed_out: timed_out)
  end

  # Sair com a pergunta aberta (ou o job de 15s disparar) equivale a tempo esgotado.
  def forfeit_question(state)
    return state unless state.phase == :question && state.question

    resolve_question(state, nil, timed_out: true)
  end

  def winning_feedback?(state)
    !!state.feedback&.trophy_won && state.trophies[state.active_seat].size >= TROPHIES_TO_WIN
  end

  def continue_after_feedback(state, now:)
    return state unless state.phase == :feedback && state.feedback

    feedback = state.feedback
    return pass_turn(state, now: now) unless feedback.correct

    if feedback.trophy_won
      return state.with(phase: :finished, winner: state.active_seat, finished_reason: :six_trophies, streak: 0, question: nil, feedback: nil) if winning_feedback?(state)
      return pass_turn(state, now: now) unless KEEP_POSSESSION_AFTER_TROPHY

      return state.with(phase: :draw, streak: 0, question: nil, feedback: nil, drawn_category: nil)
    end

    streak = state.streak + 1
    state.with(streak: streak, question: nil, feedback: nil, drawn_category: nil, phase: streak >= STREAK_FOR_TROPHY ? :trophy : :draw)
  end

  # Sem inéditas: volta ao sorteio (normal) ou à escolha do troféu, sem perder a vez.
  def recover_from_empty(state, eligible_count:)
    return state unless state.phase == :empty
    return state if state.context == :normal && eligible_count.zero?

    state.with(phase: state.context == :trophy ? :trophy : :draw, selected_category: nil, deadline: nil, drawn_category: nil)
  end

  # Prazo de 24h da vez estourado: conta como erro e passa a vez; 3 estouros seguidos do mesmo jogador = W.O.
  # Pergunta aberta é resolvida antes pelo prazo de 15s, então aqui ela é ignorada.
  def expire_turn(state, now:)
    return state if %i[finished question].include?(state.phase) || now < state.turn_deadline

    seat = state.active_seat
    timeouts = replace(state.consecutive_timeouts, seat, state.consecutive_timeouts[seat] + 1)
    if timeouts[seat] >= TIMEOUTS_FOR_WALKOVER
      return state.with(phase: :finished, winner: other_seat(seat), finished_reason: :walkover, consecutive_timeouts: timeouts,
                        streak: 0, question: nil, feedback: nil, drawn_category: nil)
    end

    pass_turn(state.with(consecutive_timeouts: timeouts), now: now)
  end

  # --- internos ---

  def open_question(state, category:, context:, question:, now:)
    if question.nil?
      return state.with(phase: :empty, selected_category: category, context: context, question: nil, deadline: nil, drawn_category: nil)
    end

    state.with(
      phase: :question, selected_category: category, context: context, question: question,
      deadline: now + QUESTION_DURATION, feedback: nil, drawn_category: nil,
      # Abrir uma pergunta é "jogar a vez": zera a contagem de estouros de 24h do jogador.
      consecutive_timeouts: replace(state.consecutive_timeouts, state.active_seat, 0)
    )
  end

  def resolve_question(state, selected_index, timed_out:)
    seat = state.active_seat
    correct = !selected_index.nil? && selected_index == state.question.correct_index
    trophy_won = correct && state.context == :trophy
    trophies = state.trophies
    if trophy_won && !trophies[seat].include?(state.selected_category)
      trophies = replace(trophies, seat, (trophies[seat] + [ state.selected_category ]).freeze)
    end

    state.with(
      phase: :feedback, deadline: nil, trophies: trophies,
      attempts: replace(state.attempts, seat, state.attempts[seat] + 1),
      correct_answers: replace(state.correct_answers, seat, state.correct_answers[seat] + (correct ? 1 : 0)),
      feedback: Feedback.new(
        correct: correct, selected_index: selected_index, correct_index: state.question.correct_index,
        context: state.context, category: state.selected_category, trophy_won: trophy_won, timed_out: timed_out
      )
    )
  end

  def pass_turn(state, now:)
    state.with(
      phase: :lobby, active_seat: other_seat(state.active_seat), streak: 0, turn_number: state.turn_number + 1,
      turn_deadline: now + TURN_DURATION, question: nil, selected_category: nil, feedback: nil, drawn_category: nil
    )
  end

  def replace(pair, index, value)
    copy = pair.dup
    copy[index] = value
    copy.freeze
  end
end
