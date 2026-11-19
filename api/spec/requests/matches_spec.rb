require "rails_helper"

RSpec.describe "Partidas X1", type: :request do
  before { Rails.application.load_seed }

  let(:alice) { User.create!(display_name: "Alice") }
  let(:bob) { User.create!(display_name: "Bob") }
  let(:carol) { User.create!(display_name: "Carol") }

  def create_invite(user = alice)
    sign_in(user)
    api_post "/matches"
    expect(response).to have_http_status(:created)
    json
  end

  def start_match(creator: alice, opponent: bob)
    invite = create_invite(creator)
    sign_in(opponent)
    api_post "/invites/#{invite.dig('match', 'invite', 'code')}/accept"
    expect(response).to have_http_status(:created)
    sign_in(creator)
    Match.find(invite.dig("match", "id"))
  end

  def current_question(match) = match.reload.match_questions.order(:id).last.question
  def state_of(match) = match.reload.engine_state

  # Sorteia e abre a pergunta normal; devolve a pergunta (com a resposta certa, só para o teste).
  def open_normal(match)
    api_post "/matches/#{match.id}/draw"
    expect(response).to have_http_status(:ok)
    api_post "/matches/#{match.id}/question", { context: "normal" }
    expect(response).to have_http_status(:created)
    current_question(match)
  end

  def answer(match, correct:)
    q = current_question(match)
    api_post "/matches/#{match.id}/answer", { selected_index: correct ? q.correct_index : (q.correct_index + 1) % 4 }
  end

  # Coloca a partida direto na fase de escolha de troféu (atalho de teste).
  def force_state(match, **attrs)
    match.update!(state: MatchState.dump(state_of(match).with(**attrs)))
  end

  describe "convites" do
    it "cria convite com código curto e token do link (só na criação)" do
      body = create_invite
      expect(body.dig("match", "status")).to eq("waiting_opponent")
      expect(body.dig("match", "invite", "code")).to match(Match::CODE_FORMAT)
      expect(body["invite_token"].length).to be >= 40
      expect(Match.last.invite_token_digest).to eq(Match.token_digest(body["invite_token"]))
    end

    it "mostra prévia pública pelo código ou pelo token, sem login" do
      body = create_invite
      reset! # sem cookie
      get "/invites/#{body.dig('match', 'invite', 'code')}"
      expect(json["invite"]).to include("status" => "open", "from" => include("display_name" => "Alice"))
      get "/invites/#{body['invite_token']}"
      expect(response).to have_http_status(:ok)
    end

    it "limita a 5 convites pendentes por jogador" do
      5.times { create_invite }
      api_post "/matches"
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "aceitar pelo link (token) inicia a partida com a vez de quem convidou e prazo de 24h" do
      body = create_invite
      sign_in(bob)
      freeze_time do
        api_post "/invites/#{body['invite_token']}/accept"
        expect(response).to have_http_status(:created)
        expect(json["match"]).to include("status" => "active", "my_seat" => 1)
        expect(json.dig("match", "turn")).to include("active_seat" => 0, "my_turn" => false, "phase" => "lobby")
        match = Match.last
        expect(match).to have_attributes(current_user: alice, turn_deadline_at: 24.hours.from_now)
      end
    end

    it "não deixa aceitar o próprio convite, convite expirado ou já aceito" do
      body = create_invite
      api_post "/invites/#{body['invite_token']}/accept"
      expect(response).to have_http_status(:unprocessable_content)

      sign_in(bob)
      travel 8.days do
        api_post "/invites/#{body['invite_token']}/accept"
        expect(response).to have_http_status(:gone)
      end

      api_post "/invites/#{body['invite_token']}/accept"
      expect(response).to have_http_status(:created)
      sign_in(carol)
      api_post "/invites/#{body['invite_token']}/accept"
      expect(response).to have_http_status(:conflict)
    end

    it "limita a 3 partidas em andamento (convites pendentes não contam)" do
      3.times { start_match(creator: alice, opponent: User.create!(display_name: "Op")) }
      body = create_invite(alice) # criar convite continua permitido
      sign_in(bob)
      api_post "/invites/#{body['invite_token']}/accept"
      expect(response).to have_http_status(:unprocessable_content)
      expect(json["error"]).to include("Alice já tem 3 partidas")
    end

    it "quem criou pode cancelar o convite" do
      body = create_invite
      api_delete "/matches/#{body.dig('match', 'id')}"
      expect(response).to have_http_status(:no_content)
      expect(Match.last.status).to eq("cancelled")
    end
  end

  describe "fluxo da vez" do
    let!(:match) { start_match }

    it "só o jogador da vez pode agir" do
      sign_in(bob)
      api_post "/matches/#{match.id}/draw"
      expect(response).to have_http_status(:conflict)
      expect(json["error"]).to eq("Não é a sua vez.")
    end

    it "quem não participa não vê a partida" do
      sign_in(carol)
      get "/matches/#{match.id}"
      expect(response).to have_http_status(:not_found)
    end

    it "sorteio é feito pelo servidor e repetir não troca a categoria" do
      api_post "/matches/#{match.id}/draw"
      drawn = json.dig("match", "turn", "drawn_category")
      expect(Category::SLUGS).to include(drawn)
      api_post "/matches/#{match.id}/draw"
      expect(json.dig("match", "turn", "drawn_category")).to eq(drawn)
    end

    it "não abre pergunta sem sortear" do
      api_post "/matches/#{match.id}/question", { context: "normal" }
      expect(response).to have_http_status(:conflict)
    end

    it "envia a pergunta sem a resposta certa, só para quem está respondendo, e registra a exposição" do
      question = open_normal(match)
      payload = json.dig("match", "question")
      expect(payload).to include("prompt" => question.prompt, "options" => question.options)
      expect(response.body).not_to include("correct_index")
      expect(QuestionExposure.find_by(user: alice, question: question)).to have_attributes(match_id: match.id, source: "play")

      sign_in(bob)
      get "/matches/#{match.id}"
      expect(json.dig("match", "question")).to be_nil
    end

    it "acerto mantém a vez e soma sequência; o resultado traz a explicação" do
      open_normal(match)
      answer(match, correct: true)
      expect(json["result"]).to include("correct" => true, "timed_out" => false, "explanation" => be_present)
      expect(json.dig("result", "selected_option")).to eq(json.dig("result", "correct_option"))
      expect(json.dig("match", "turn")).to include("my_turn" => true, "streak" => 1, "phase" => "draw")
    end

    it "erro passa a vez para o adversário com novo prazo de 24h" do
      open_normal(match)
      freeze_time do
        answer(match, correct: false)
        expect(json.dig("match", "turn")).to include("active_seat" => 1, "my_turn" => false, "streak" => 0)
        expect(match.reload).to have_attributes(current_user: bob, turn_deadline_at: 24.hours.from_now)
      end
    end

    it "resposta depois de 15s + 1s de tolerância conta como tempo esgotado" do
      open_normal(match)
      q = current_question(match)
      travel 17.seconds do
        api_post "/matches/#{match.id}/answer", { selected_index: q.correct_index }
        expect(response).to have_http_status(:conflict) # a pergunta já foi encerrada pelo prazo
        get "/matches/#{match.id}"
        expect(json.dig("match", "last_result")).to include("correct" => false, "timed_out" => true)
        expect(json.dig("match", "turn", "active_seat")).to eq(1)
      end
    end

    it "rejeita alternativa inválida" do
      open_normal(match)
      api_post "/matches/#{match.id}/answer", { selected_index: 7 }
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "três acertos levam à escolha do troféu; troféu conquistado não pode ser disputado de novo" do
      3.times do
        open_normal(match)
        answer(match, correct: true)
      end
      expect(json.dig("match", "turn", "phase")).to eq("trophy")

      api_post "/matches/#{match.id}/question", { context: "trophy", category: "estadios" }
      expect(json.dig("match", "question")).to include("context" => "trophy", "category" => "estadios")
      answer(match, correct: true)
      expect(json["result"]).to include("trophy_won" => true)
      expect(match.trophies.sole).to have_attributes(user_id: alice.id)
      expect(json.dig("match", "turn")).to include("my_turn" => true, "phase" => "draw", "streak" => 0)

      force_state(match, phase: :trophy, streak: 3)
      api_post "/matches/#{match.id}/question", { context: "trophy", category: "estadios" }
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "o sexto troféu encerra a partida" do
      force_state(match, phase: :trophy, streak: 3, trophies: [ Category::SLUGS.first(5), [] ])
      api_post "/matches/#{match.id}/question", { context: "trophy", category: Category::SLUGS.last }
      answer(match, correct: true)
      expect(json["match"]).to include("status" => "finished", "winner_seat" => 0, "finished_reason" => "six_trophies")
      expect(match.reload.winner).to eq(alice)
    end

    it "troféu sem perguntas inéditas devolve 409 e volta para a escolha" do
      Question.in_category("escudos").find_each { |q| QuestionExposure.create!(user: alice, question: q, source: "play", shown_at: Time.current, created_at: Time.current) }
      force_state(match, phase: :trophy, streak: 3)
      api_post "/matches/#{match.id}/question", { context: "trophy", category: "escudos" }
      expect(response).to have_http_status(:conflict)
      expect(json.dig("match", "turn", "phase")).to eq("trophy")
    end

    it "desistir dá a vitória ao adversário" do
      sign_in(bob)
      api_post "/matches/#{match.id}/resign"
      expect(json["match"]).to include("status" => "finished", "winner_seat" => 0, "finished_reason" => "resigned")
    end

    it "lista as partidas do usuário" do
      get "/matches"
      expect(json["matches"].map { |m| m["id"] }).to eq([ match.id ])
    end
  end

  describe "prazos" do
    let!(:match) { start_match }

    it "pergunta abandonada vira timeout no próximo acesso, mesmo sem o job" do
      open_normal(match)
      travel 20.seconds do
        sign_in(bob)
        get "/matches/#{match.id}"
        expect(json.dig("match", "turn")).to include("active_seat" => 1, "my_turn" => true)
        expect(match.match_questions.sole).to have_attributes(timed_out: true, correct: false)
      end
    end

    it "o job do relógio aplica o timeout da pergunta" do
      open_normal(match)
      travel 20.seconds do
        MatchClockJob.perform_now(match.id)
        expect(state_of(match).active_seat).to eq(1)
      end
    end

    it "agenda o relógio para o prazo da pergunta e o da vez" do
      expect { open_normal(match) }.to have_enqueued_job(MatchClockJob).with(match.id)
    end

    it "três estouros de 24h seguidos do mesmo jogador dão W.O." do
      # Alice estoura (24h), Bob joga e erra, Alice estoura de novo... até 3 estouros dela.
      3.times do |i|
        travel_to(match.reload.turn_deadline_at + 1.second)
        MatchClockJob.perform_now(match.id)
        break if i == 2

        sign_in(bob)
        open_normal(match)
        answer(match, correct: false)
      end
      expect(match.reload).to have_attributes(status: "finished", winner: bob, finished_reason: "walkover")
    ensure
      travel_back
    end

    it "jogar a vez zera a contagem de estouros" do
      travel_to(match.reload.turn_deadline_at + 1.second) { MatchClockJob.perform_now(match.id) } # Alice estoura 1x
      travel_to(match.reload.turn_deadline_at + 1.second) { MatchClockJob.perform_now(match.id) } # Bob estoura 1x
      travel_to(match.reload.turn_deadline_at - 1.hour) do
        open_normal(match) # Alice joga
        expect(state_of(match).consecutive_timeouts).to eq([ 0, 1 ])
      end
    end
  end

  describe "idempotência" do
    let!(:match) { start_match }

    it "repetir a resposta com a mesma Idempotency-Key devolve o mesmo resultado sem reaplicar" do
      open_normal(match)
      q = current_question(match)
      headers = { "Idempotency-Key" => "resp-1" }
      api_post "/matches/#{match.id}/answer", { selected_index: q.correct_index }, headers: headers
      first = json
      api_post "/matches/#{match.id}/answer", { selected_index: q.correct_index }, headers: headers
      expect(json).to eq(first) # mesmo conteúdo (o jsonb pode reordenar as chaves)
      expect(state_of(match).streak).to eq(1)
    end

    it "a mesma chave em outra rota é rejeitada" do
      api_post "/matches/#{match.id}/draw", {}, headers: { "Idempotency-Key" => "k" }
      api_post "/matches/#{match.id}/resign", {}, headers: { "Idempotency-Key" => "k" }
      expect(response).to have_http_status(:unprocessable_content)
    end
  end
end
