require "rails_helper"

RSpec.describe "Contas conectadas (Google + Facebook na mesma conta)", type: :request do
  let(:debug) { { "data" => { "is_valid" => true, "app_id" => "123", "user_id" => "fb-1" } } }
  let(:profile) { { "id" => "fb-1", "name" => "Torcedor", "picture" => { "data" => { "url" => "https://example.com/fb.jpg", "is_silhouette" => false } } } }

  before do
    Rails.configuration.x.facebook_app_id = "123"
    Rails.configuration.x.facebook_app_secret = "segredo"
    FacebookToken.http = ->(path, _params) { path.end_with?("/debug_token") ? debug : profile }
  end

  after { FacebookToken.http = nil }

  def google_user
    User.from_google!(GoogleIdToken::Claims.new(sub: "g-1", email: "a@example.com", email_verified: true, name: "Ana", picture: nil))
  end

  it "conecta o Facebook à conta do Google: os dois logins passam a abrir a mesma conta" do
    user = google_user
    sign_in(user)
    api_post "/identities/facebook", { access_token: "tok" }
    expect(response).to have_http_status(:ok)
    expect(json.dig("user", "providers")).to eq(%w[facebook google])
    expect(user.reload.avatar_url).to eq("https://example.com/fb.jpg")

    api_post "/auth/facebook", { access_token: "tok" }
    expect(json.dig("user", "id")).to eq(user.id)
    expect(User.count).to eq(1)
  end

  it "absorve a conta vazia que já existia para aquele Facebook" do
    fb_only = User.from_provider!("facebook", FacebookToken::Claims.new(sub: "fb-1", email: nil, email_verified: false, name: "Torcedor", picture: nil))
    user = google_user
    sign_in(user)
    api_post "/identities/facebook", { access_token: "tok" }
    expect(response).to have_http_status(:ok)
    expect(User.exists?(fb_only.id)).to be(false)
    expect(Identity.find_by(provider: "facebook", uid: "fb-1").user).to eq(user)
  end

  it "recusa quando o Facebook já tem uma conta com histórico" do
    fb_user = User.from_provider!("facebook", FacebookToken::Claims.new(sub: "fb-1", email: nil, email_verified: false, name: "Torcedor", picture: nil))
    Rails.application.load_seed
    InviteService.create!(fb_user)
    sign_in(google_user)
    api_post "/identities/facebook", { access_token: "tok" }
    expect(response).to have_http_status(:conflict)
    expect(json["error"]).to include("já tem uma conta no jogo")
    expect(Identity.find_by(provider: "facebook", uid: "fb-1").user).to eq(fb_user)
  end

  it "não deixa conectar um segundo Facebook diferente" do
    user = google_user
    user.identities.create!(provider: "facebook", uid: "fb-outro")
    sign_in(user)
    api_post "/identities/facebook", { access_token: "tok" }
    expect(response).to have_http_status(:conflict)
  end

  it "exige login e token válido" do
    api_post "/identities/facebook", { access_token: "tok" }
    expect(response).to have_http_status(:unauthorized)
    sign_in(google_user)
    debug["data"]["is_valid"] = false
    api_post "/identities/facebook", { access_token: "tok" }
    expect(response).to have_http_status(:unauthorized)
  end

  it "desconecta um login, mas nunca o último" do
    user = google_user
    sign_in(user)
    api_post "/identities/facebook", { access_token: "tok" }
    api_delete "/identities/google"
    expect(json.dig("user", "providers")).to eq(%w[facebook])
    api_delete "/identities/facebook"
    expect(response).to have_http_status(:unprocessable_entity)
    expect(user.reload.providers).to eq(%w[facebook])
  end
end
