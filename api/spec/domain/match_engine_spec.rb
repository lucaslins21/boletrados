require "rails_helper"

# Espelha web/src/lib/game.test.ts e cobre as regras exclusivas do servidor (tolerância, 24h, W.O.).
RSpec.describe MatchEngine do
  let(:now) { Time.utc(2026, 11, 19, 12, 0, 0) }
  let(:all_categories) { Category::SLUGS }
  let(:first) { fixed_rng(0.0) }

  # rng determinístico: rand(n) devolve floor(valor * n)
  def fixed_rng(value) = Class.new { define_method(:rand) { |n| (value * n).floor } }.new

  def question(id = "q#{SecureRandom.hex(3)}", correct_index: 1) = MatchEngine::QuestionRef.new(id: id, correct_index: correct_index)
  def wrong(q) = (q.correct_index + 1) % 4

  def in_draw(state = described_class.new_match(now: now)) = described_class.enter_draw(state)

  def play_normal(state, category, correct:)
    drawn = state.with(phase: :draw, drawn_category: category)
    q = question
    asked = described_class.start_normal_question(drawn, question: q, now: now)
    expect(asked.phase).to eq(:question)
    described_class.answer(asked, correct ? q.correct_index : wrong(q), now: now + 1)
  end

  def play_trophy(state, category, correct:)
    q = question
    asked = described_class.start_trophy_question(state, category: category, question: q, now: now)
    expect(asked.phase).to eq(:question)
    described_class.answer(asked, correct ? q.correct_index : wrong(q), now: now + 1)
  end

  def reach_trophy_choice(state)
    MatchEngine::STREAK_FOR_TROPHY.times.reduce(state) do |s, _|
      described_class.continue_after_feedback(play_normal(s, "brasileiro", correct: true), now: now)
    end
  end

  describe "sorteio" do
    it "só sorteia na fase de sorteio e não refaz o sorteio" do
      expect(described_class.draw_category(described_class.new_match(now: now), eligible: all_categories, rng: first).drawn_category).to be_nil
      drawn = described_class.draw_category(in_draw, eligible: all_categories, rng: fixed_rng(0.99))
      expect(drawn.drawn_category).to eq("estadios")
      expect(described_class.draw_category(drawn, eligible: all_categories, rng: first)).to equal(drawn)
    end

    it "cobre as seis categorias" do
      drawn = 6.times.map { |i| described_class.draw_category(in_draw, eligible: all_categories, rng: fixed_rng(i / 6.0)).drawn_category }
      expect(drawn.uniq.size).to eq(6)
    end

    it "não inicia pergunta sem categoria sorteada" do
      state = in_draw
      expect(described_class.start_normal_question(state, question: question, now: now)).to equal(state)
    end

    it "limpa a categoria sorteada ao exibir a pergunta" do
      drawn = described_class.draw_category(in_draw, eligible: all_categories, rng: first)
      asked = described_class.start_normal_question(drawn, question: question, now: now)
      expect(asked).to have_attributes(phase: :question, drawn_category: nil, deadline: now + 15)
    end
  end

  describe "categoria esgotada" do
    it "re-sorteia automaticamente: só as categorias elegíveis podem sair" do
      eligible = all_categories - [ "escudos" ]
      drawn = 5.times.map { |i| described_class.draw_category(in_draw, eligible: eligible, rng: fixed_rng(i / 5.0)).drawn_category }
      expect(drawn).not_to include("escudos")
      expect(drawn.uniq.size).to eq(5)
    end

    it "sem nenhuma elegível, vai para :empty e não volta ao sorteio" do
      empty = described_class.draw_category(in_draw, eligible: [], rng: first)
      expect(empty).to have_attributes(phase: :empty, context: :normal, selected_category: nil)
      expect(described_class.recover_from_empty(empty, eligible_count: 0)).to equal(empty)
    end

    it "categoria sorteada sem pergunta disponível vai para :empty e volta sem perder a vez" do
      state = in_draw.with(drawn_category: "escudos", streak: 2)
      empty = described_class.start_normal_question(state, question: nil, now: now)
      expect(empty.phase).to eq(:empty)
      expect(described_class.recover_from_empty(empty, eligible_count: 5)).to have_attributes(phase: :draw, active_seat: 0, streak: 2, drawn_category: nil)
    end

    it "em pergunta de troféu sem inéditas, volta para a escolha de troféu" do
      state = described_class.new_match(now: now).with(phase: :trophy, streak: 3)
      empty = described_class.start_trophy_question(state, category: "escudos", question: nil, now: now)
      expect(described_class.recover_from_empty(empty, eligible_count: 6).phase).to eq(:trophy)
    end
  end

  describe "prazo de 15s" do
    let(:q) { question }
    let(:asked) { described_class.start_normal_question(in_draw.with(drawn_category: "europeu"), question: q, now: now) }

    it "aceita resposta dentro do prazo" do
      fb = described_class.answer(asked, q.correct_index, now: now + 14.999).feedback
      expect(fb).to have_attributes(correct: true, timed_out: false)
    end

    it "aceita resposta até 1s depois do prazo (tolerância de rede)" do
      fb = described_class.answer(asked, q.correct_index, now: now + 16).feedback
      expect(fb).to have_attributes(correct: true, timed_out: false)
    end

    it "depois da tolerância conta como tempo esgotado, mesmo se correta" do
      fb = described_class.answer(asked, q.correct_index, now: now + 16.001).feedback
      expect(fb).to have_attributes(correct: false, timed_out: true, selected_index: nil)
    end

    it "ignora uma segunda resposta para a mesma pergunta" do
      answered = described_class.answer(asked, 0, now: now + 1)
      expect(described_class.answer(answered, 1, now: now + 2)).to equal(answered)
    end
  end

  describe "sair com pergunta aberta" do
    it "conta como tempo esgotado e passa a vez, guardando os acertos do jogador" do
      asked = described_class.start_normal_question(in_draw.with(drawn_category: "europeu", streak: 2), question: question, now: now)
      forfeited = described_class.forfeit_question(asked)
      expect(forfeited.feedback).to have_attributes(correct: false, timed_out: true, selected_index: nil)
      expect(described_class.continue_after_feedback(forfeited, now: now)).to have_attributes(phase: :lobby, active_seat: 1, streak: 0, saved_streaks: [ 2, 0 ])
    end

    it "não faz nada fora de uma pergunta" do
      state = in_draw
      expect(described_class.forfeit_question(state)).to equal(state)
    end
  end

  describe "posse, sequência e troféus" do
    it "acerto normal soma sequência e mantém a posse" do
      state = described_class.continue_after_feedback(play_normal(in_draw, "brasileiro", correct: true), now: now)
      expect(state).to have_attributes(phase: :draw, streak: 1, active_seat: 0, turn_number: 1)
    end

    it "erro passa a vez e renova o prazo de 24h, mas o jogador guarda os acertos para a próxima vez" do
      state = described_class.continue_after_feedback(play_normal(in_draw, "brasileiro", correct: true), now: now)
      state = described_class.continue_after_feedback(play_normal(state, "sulamericano", correct: true), now: now)
      later = now + 3600
      state = described_class.continue_after_feedback(play_normal(state, "europeu", correct: false), now: later)
      expect(state).to have_attributes(phase: :lobby, streak: 0, active_seat: 1, turn_number: 2, turn_deadline: later + 24 * 3600, saved_streaks: [ 2, 0 ])
      expect(described_class.streak_of(state, 0)).to eq(2)

      # O adversário erra de primeira: a vez volta com os 2 acertos guardados, e mais um libera o troféu.
      back = described_class.continue_after_feedback(play_normal(described_class.enter_draw(state), "selecoes", correct: false), now: later)
      expect(back).to have_attributes(active_seat: 0, streak: 2, phase: :lobby)
      third = described_class.continue_after_feedback(play_normal(described_class.enter_draw(back), "escudos", correct: true), now: later)
      expect(third).to have_attributes(phase: :trophy, streak: 3, active_seat: 0)
    end

    it "tempo esgotado na pergunta normal também guarda os acertos" do
      asked = described_class.start_normal_question(in_draw.with(drawn_category: "europeu", streak: 1), question: question, now: now)
      timed_out = described_class.continue_after_feedback(described_class.answer(asked, nil, now: now + 30), now: now + 30)
      expect(timed_out.saved_streaks).to eq([ 1, 0 ])
    end

    it "três acertos seguidos liberam a escolha de troféu" do
      expect(reach_trophy_choice(in_draw)).to have_attributes(phase: :trophy, streak: 3)
    end

    it "não permite disputar um troféu já conquistado" do
      state = reach_trophy_choice(in_draw).with(trophies: [ [ "europeu" ], [] ])
      expect(described_class.start_trophy_question(state, category: "europeu", question: question, now: now)).to equal(state)
    end

    it "acerto decisivo concede o troféu, zera a sequência e mantém a vez" do
      fb = play_trophy(reach_trophy_choice(in_draw), "estadios", correct: true)
      expect(fb.trophies[0]).to eq([ "estadios" ])
      expect(fb.feedback.trophy_won).to be(true)
      expect(described_class.continue_after_feedback(fb, now: now)).to have_attributes(phase: :draw, streak: 0, active_seat: 0)
    end

    it "erro decisivo não concede troféu, zera a sequência e passa a vez" do
      fb = play_trophy(reach_trophy_choice(in_draw), "estadios", correct: false)
      expect(fb.trophies[0]).to eq([])
      expect(described_class.continue_after_feedback(fb, now: now)).to have_attributes(phase: :lobby, streak: 0, active_seat: 1, saved_streaks: [ 0, 0 ])
    end

    it "quem estoura as 24h na escolha do troféu volta direto para a escolha" do
      expired = described_class.expire_turn(reach_trophy_choice(in_draw), now: now + 24 * 3600)
      expect(expired).to have_attributes(active_seat: 1, saved_streaks: [ 3, 0 ])
      back = described_class.expire_turn(expired, now: expired.turn_deadline)
      expect(back).to have_attributes(active_seat: 0, phase: :trophy, streak: 3)
    end

    it "categorias conquistadas continuam no sorteio normal" do
      state = in_draw.with(trophies: [ [ "brasileiro" ], [] ], drawn_category: "brasileiro")
      asked = described_class.start_normal_question(state, question: question, now: now)
      expect(asked).to have_attributes(phase: :question, context: :normal, selected_category: "brasileiro")
    end

    it "cada jogador tem sua própria coleção" do
      state = reach_trophy_choice(in_draw.with(active_seat: 1)).with(trophies: [ [ "estadios" ], [] ])
      expect(play_trophy(state, "estadios", correct: true).trophies).to eq([ [ "estadios" ], [ "estadios" ] ])
    end

    it "o sexto troféu encerra a partida" do
      state = reach_trophy_choice(in_draw).with(trophies: [ all_categories.first(5), [] ])
      finished = described_class.continue_after_feedback(play_trophy(state, all_categories.last, correct: true), now: now)
      expect(finished).to have_attributes(phase: :finished, winner: 0, finished_reason: :six_trophies)
      expect(finished.trophies[0].size).to eq(6)
    end

    it "não altera o estado original (imutável)" do
      state = in_draw
      play_normal(state, "brasileiro", correct: true)
      expect(state).to have_attributes(phase: :draw, attempts: [ 0, 0 ])
    end
  end

  describe "prazo de 24h da vez" do
    let(:deadline) { now + 24 * 3600 }

    it "não faz nada antes do prazo" do
      state = described_class.new_match(now: now)
      expect(described_class.expire_turn(state, now: deadline - 1)).to equal(state)
    end

    it "estouro passa a vez e conta para o jogador" do
      expired = described_class.expire_turn(described_class.new_match(now: now).with(streak: 2), now: deadline)
      expect(expired).to have_attributes(phase: :lobby, active_seat: 1, streak: 0, saved_streaks: [ 2, 0 ], consecutive_timeouts: [ 1, 0 ], turn_deadline: deadline + 24 * 3600)
    end

    it "três estouros seguidos do mesmo jogador dão W.O. ao adversário" do
      state = described_class.new_match(now: now).with(consecutive_timeouts: [ 2, 0 ])
      expect(described_class.expire_turn(state, now: deadline)).to have_attributes(phase: :finished, winner: 1, finished_reason: :walkover)
    end

    it "abrir uma pergunta zera a contagem de estouros do jogador" do
      state = in_draw.with(consecutive_timeouts: [ 2, 1 ], drawn_category: "europeu")
      asked = described_class.start_normal_question(state, question: question, now: now)
      expect(asked.consecutive_timeouts).to eq([ 0, 1 ])
    end

    it "ignora pergunta aberta (resolvida pelo prazo de 15s) e partida encerrada" do
      asked = described_class.start_normal_question(in_draw.with(drawn_category: "europeu"), question: question, now: now)
      expect(described_class.expire_turn(asked, now: deadline)).to equal(asked)
      finished = asked.with(phase: :finished)
      expect(described_class.expire_turn(finished, now: deadline)).to equal(finished)
    end
  end
end
