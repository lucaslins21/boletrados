require "rails_helper"

RSpec.describe "Perfil e estatísticas", type: :request do
  before { Rails.application.load_seed }

  let(:alice) { User.create!(display_name: "Alice", email: "alice@example.com") }
  let(:bob) { User.create!(display_name: "Bob") }
  let(:carol) { User.create!(display_name: "Carol") }

  def start_match(creator, opponent)
    match, _token = InviteService.create!(creator)
    InviteService.accept!(match.invite_code, opponent)
  end

  # Abre e responde uma pergunta normal para o jogador da vez.
  def answer(match, user, correct: nil, timeout: false)
    play = MatchPlay.new(match.reload)
    play.draw!(user)
    play.open_question!(user, context: :normal)
    q = match.reload.match_questions.last
    if timeout
      MatchPlay.new(match.reload, now: q.deadline_at + 5).settle!
    else
      MatchPlay.new(match.reload).answer!(user, correct ? q.question.correct_index : (q.question.correct_index + 1) % 4)
    end
    q.reload
  end

  it "mostra o próprio perfil com resumo, categorias (tempo esgotado conta como erro) e rivais" do
    match = start_match(alice, bob)
    q1 = answer(match, alice, correct: true)
    q2 = answer(match, alice, timeout: true)
    MatchPlay.new(match.reload).resign!(bob) # Alice vence

    sign_in(alice)
    get "/profiles/me"
    profile = json["profile"]
    expect(profile).to include("is_me" => true, "head_to_head" => nil)
    expect(profile["summary"]).to include("played" => 1, "wins" => 1, "losses" => 0, "in_progress" => 0)
    expect(profile.to_json).not_to include("alice@example.com")

    by_cat = profile["categories"].index_by { |c| c["category"] }
    expect(profile["categories"].sum { |c| c["answered"] }).to eq(2)
    expect(profile["categories"].sum { |c| c["correct"] }).to eq(1)
    expect(by_cat[q1.category_slug]["correct"]).to be >= 1
    expect(by_cat[q2.category_slug]["answered"]).to be >= 1
    expect(profile["rivals"]).to contain_exactly(include("user" => include("display_name" => "Bob"), "played" => 1, "wins" => 1, "losses" => 0))
  end

  it "mostra o perfil de um adversário com o confronto do ponto de vista de quem vê" do
    match = start_match(alice, bob)
    MatchPlay.new(match.reload).resign!(alice) # Bob vence
    start_match(bob, alice) # outra em andamento

    sign_in(alice)
    get "/profiles/#{bob.id}"
    profile = json["profile"]
    expect(profile).to include("is_me" => false, "rivals" => nil)
    expect(profile["summary"]).to include("wins" => 1, "in_progress" => 1)
    expect(profile["head_to_head"]).to include("played" => 1, "wins" => 0, "losses" => 1, "in_progress" => 1)
    expect(profile.dig("head_to_head", "recent").size).to eq(2)
  end

  it "conta troféus por categoria" do
    match = start_match(alice, bob)
    Trophy.create!(match: match, user: alice, category: Category.find_by!(slug: "estadios"), won_at: Time.current)
    sign_in(alice)
    get "/profiles/me"
    expect(json.dig("profile", "summary", "trophies")).to eq(1)
    expect(json["profile"]["categories"].find { |c| c["category"] == "estadios" }["trophies"]).to eq(1)
  end

  it "não mostra o perfil de quem nunca foi enfrentado (nem convites pendentes ou cancelados contam)" do
    InviteService.create!(carol)
    sign_in(alice)
    get "/profiles/#{carol.id}"
    expect(response).to have_http_status(:not_found)
    get "/profiles/999999"
    expect(response).to have_http_status(:not_found)
  end

  it "exige login" do
    get "/profiles/me"
    expect(response).to have_http_status(:unauthorized)
  end
end
