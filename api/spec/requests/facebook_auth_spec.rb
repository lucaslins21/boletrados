require "rails_helper"

RSpec.describe "Login com Facebook", type: :request do
  let(:headers) { { "Origin" => "http://localhost:5173" } }
  let(:calls) { [] }
  let(:debug) { { "data" => { "is_valid" => true, "app_id" => "123", "user_id" => "fb-1" } } }
  let(:profile) do
    { "id" => "fb-1", "name" => "Torcedora", "email" => "t@example.com",
      "picture" => { "data" => { "url" => "https://example.com/fb.jpg", "is_silhouette" => false } } }
  end

  before do
    Rails.configuration.x.facebook_app_id = "123"
    Rails.configuration.x.facebook_app_secret = "segredo"
    FacebookToken.http = lambda do |path, params|
      calls << [ path, params ]
      path.end_with?("/debug_token") ? debug : profile
    end
  end

  after { FacebookToken.http = nil }

  def login(token = "token-fb") = post("/auth/facebook", params: { access_token: token }, headers: headers, as: :json)

  it "cria a conta com nome e foto do Facebook, abre sessão e não expõe o e-mail" do
    expect { login }.to change(User, :count).by(1).and change(Session, :count).by(1)
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["user"]).to include("display_name" => "Torcedora", "avatar_url" => "https://example.com/fb.jpg")
    expect(response.parsed_body["user"]).not_to have_key("email")
    expect(Identity.last).to have_attributes(provider: "facebook", uid: "fb-1")
  end

  it "confere o token com o token do app e busca o perfil com appsecret_proof" do
    login
    debug_call, me_call = calls
    expect(debug_call).to eq([ "/v26.0/debug_token", { input_token: "token-fb", access_token: "123|segredo" } ])
    expect(me_call.last[:appsecret_proof]).to eq(OpenSSL::HMAC.hexdigest("SHA256", "segredo", "token-fb"))
  end

  it "reaproveita a conta no segundo login e não vincula com uma conta Google de mesmo e-mail" do
    login
    expect { login }.not_to change(User, :count)
    post "/auth/google", params: { credential: google_token(email: "t@example.com") }, headers: headers, as: :json
    expect(User.count).to eq(2)
  end

  it "rejeita token emitido para outro app" do
    debug["data"]["app_id"] = "999"
    login
    expect(response).to have_http_status(:unauthorized)
    expect(User.count).to eq(0)
  end

  it "rejeita token inválido ou expirado" do
    debug["data"]["is_valid"] = false
    login
    expect(response).to have_http_status(:unauthorized)
  end

  it "rejeita quando o perfil não é do usuário do token" do
    profile["id"] = "fb-2"
    login
    expect(response).to have_http_status(:unauthorized)
  end

  it "não guarda foto genérica (silhueta)" do
    profile["picture"]["data"]["is_silhouette"] = true
    login
    expect(User.last.avatar_url).to be_nil
  end

  it "responde 401 quando o app do Facebook não está configurado" do
    Rails.configuration.x.facebook_app_secret = nil
    login
    expect(response).to have_http_status(:unauthorized)
  end

  it "bloqueia origem não autorizada (CSRF)" do
    post "/auth/facebook", params: { access_token: "x" }, headers: { "Origin" => "https://malicioso.example" }, as: :json
    expect(response).to have_http_status(:forbidden)
  end
end
