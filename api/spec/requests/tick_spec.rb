require "rails_helper"

RSpec.describe "POST /internal/tick", type: :request do
  before { Rails.application.load_seed }

  let(:token) { "segredo-do-tick" }
  let(:alice) { User.create!(display_name: "Alice", email: "alice@example.com") }
  let(:bob) { User.create!(display_name: "Bob") }

  around do |example|
    original = Rails.configuration.x.tick_token
    Rails.configuration.x.tick_token = token
    example.run
  ensure
    Rails.configuration.x.tick_token = original
  end

  def tick(auth = "Bearer #{token}")
    post "/internal/tick", headers: { "Authorization" => auth }
  end

  def start_match
    match, _token = InviteService.create!(alice)
    InviteService.accept!(match.invite_code, bob)
  end

  it "responde 404 sem o token certo (ou sem token configurado)" do
    tick("Bearer errado")
    expect(response).to have_http_status(:not_found)
    Rails.configuration.x.tick_token = nil
    tick("Bearer ")
    expect(response).to have_http_status(:not_found)
  end

  it "aplica o estouro de 24 h em partidas que ninguém abriu e avisa o próximo jogador" do
    match = start_match
    travel_to(match.turn_deadline_at + 1.minute) do
      expect { tick }.to have_enqueued_job(MatchNotificationJob).with("your_turn", match.id, bob.id)
      expect(json).to include("settled" => 1)
      expect(match.reload.current_user).to eq(bob)
    end
  end

  it "encerra pergunta abandonada (15 s) mesmo sem ninguém acessar a partida" do
    match = start_match
    play = MatchPlay.new(match)
    play.draw!(alice)
    play.open_question!(alice, context: :normal)
    travel 30.seconds do
      tick
      expect(match.reload.engine_state).to have_attributes(phase: :lobby, active_seat: 1)
      expect(match.match_questions.sole.timed_out).to be(true)
    end
  end

  it "envia o lembrete das 4 h uma única vez" do
    match = start_match
    allow(WebPushSender).to receive(:deliver).and_return(1)
    travel_to(match.turn_deadline_at - 2.hours) do
      expect { tick }.to have_enqueued_mail(TurnMailer, :reminder)
      expect(json).to include("reminded" => 1)
      expect { tick }.not_to have_enqueued_mail(TurnMailer, :reminder)
    end
  end

  it "não faz nada quando não há prazos vencidos" do
    start_match
    tick
    expect(json).to eq("settled" => 0, "reminded" => 0)
  end
end

RSpec.describe "IP do cliente atrás de proxy", type: :request do
  it "usa o primeiro X-Forwarded-For para registrar a sessão (Vercel → Render)" do
    post "/auth/dev", params: { display_name: "Ana" }, headers: { "Origin" => AuthHelper::ORIGIN, "X-Forwarded-For" => "200.1.2.3, 76.76.21.21" }, as: :json
    expect(Session.last.ip_address).to eq("200.1.2.3")
  end
end
