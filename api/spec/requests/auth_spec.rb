require "rails_helper"

RSpec.describe "Login com Google e sessões", type: :request do
  let(:origin) { "http://localhost:5173" }
  let(:headers) { { "Origin" => origin } }

  def login(token = google_token, headers: self.headers)
    post "/auth/google", params: { credential: token }, headers: headers, as: :json
  end

  def session_cookie = response.headers["set-cookie"].to_s

  describe "POST /auth/google" do
    it "cria usuário + identidade, abre sessão e devolve o usuário sem e-mail" do
      expect { login }.to change(User, :count).by(1).and change(Identity, :count).by(1).and change(Session, :count).by(1)
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["user"]).to include("display_name" => "Boleira")
      expect(response.parsed_body["user"]).not_to have_key("email")
      expect(Identity.last).to have_attributes(provider: "google", uid: "google-sub-1")
    end

    it "define o cookie de sessão httpOnly e SameSite=Lax, guardando só o hash do token" do
      login
      expect(session_cookie).to match(/boletrados_session=/).and match(/httponly/i).and match(/samesite=lax/i)
      token = session_cookie[/boletrados_session=([^;]+)/, 1]
      expect(Session.last.token_digest).to eq(Digest::SHA256.hexdigest(CGI.unescape(token)))
    end

    it "reaproveita a conta no segundo login com o mesmo sub" do
      login
      expect { login }.not_to change(User, :count)
    end

    it "atualiza a foto a cada login e mantém a anterior se o Google não mandar foto" do
      login
      expect(response.parsed_body["user"]["avatar_url"]).to eq("https://example.com/a.png")
      login(google_token(picture: "https://example.com/nova.png"))
      expect(User.sole.avatar_url).to eq("https://example.com/nova.png")
      login(google_token(picture: nil))
      expect(User.sole.avatar_url).to eq("https://example.com/nova.png")
    end

    it "não vincula contas pelo e-mail: outro sub com o mesmo e-mail é outra conta" do
      login(google_token(sub: "a", email: "x@example.com"))
      expect { login(google_token(sub: "b", email: "x@example.com")) }.to change(User, :count).by(1)
    end

    it "não guarda e-mail não verificado como contato" do
      login(google_token(email_verified: false))
      expect(User.last.email).to be_nil
    end

    {
      "audiência de outro app" => { aud: "outro-app" },
      "emissor que não é o Google" => { iss: "https://evil.example.com" },
      "token expirado" => { exp: 2.hours.ago }
    }.each do |caso, overrides|
      it "rejeita #{caso}" do
        expect { login(google_token(**overrides)) }.not_to change(User, :count)
        expect(response).to have_http_status(:unauthorized)
      end
    end

    it "rejeita token assinado por outra chave" do
      intruder = JWT::JWK.new(OpenSSL::PKey::RSA.generate(2048), { use: "sig", alg: "RS256" })
      login(google_token(key: intruder))
      expect(response).to have_http_status(:unauthorized)
    end

    it "rejeita quando o GOOGLE_CLIENT_ID não está configurado" do
      Rails.configuration.x.google_client_id = nil
      login
      expect(response).to have_http_status(:unauthorized)
    end

    it "exige o parâmetro credential" do
      post "/auth/google", params: {}, headers: headers, as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "bloqueia origem não autorizada (CSRF)" do
      login(headers: { "Origin" => "https://evil.example.com" })
      expect(response).to have_http_status(:forbidden)
    end

    it "troca a sessão a cada login (sem fixação de sessão)" do
      login
      first = Session.last
      login
      expect(Session.exists?(first.id)).to be(false)
      expect(Session.count).to eq(1)
    end
  end

  describe "GET /me" do
    it "devolve o usuário logado" do
      login
      get "/me"
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.dig("user", "display_name")).to eq("Boleira")
    end

    it "responde 401 sem sessão" do
      get "/me"
      expect(response).to have_http_status(:unauthorized)
    end

    it "responde 401 com sessão expirada" do
      login
      Session.last.update!(expires_at: 1.minute.ago)
      get "/me"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "DELETE /session" do
    it "encerra a sessão e apaga o cookie" do
      login
      expect { delete "/session", headers: headers }.to change(Session, :count).by(-1)
      expect(response).to have_http_status(:no_content)
      get "/me"
      expect(response).to have_http_status(:unauthorized)
    end

    it "com cookie de sessão, exige Origin autorizada" do
      login
      expect { delete "/session" }.not_to change(Session, :count)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "CORS" do
    it "permite o frontend com credenciais" do
      options "/me", headers: { "Origin" => origin, "Access-Control-Request-Method" => "GET" }
      expect(response.headers["access-control-allow-origin"]).to eq(origin)
      expect(response.headers["access-control-allow-credentials"]).to eq("true")
    end

    it "não libera outras origens" do
      options "/me", headers: { "Origin" => "https://evil.example.com", "Access-Control-Request-Method" => "GET" }
      expect(response.headers["access-control-allow-origin"]).to be_nil
    end
  end
end
