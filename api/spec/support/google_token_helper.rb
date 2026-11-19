# Gera ID tokens "do Google" assinados com uma chave RSA local e faz o GoogleIdToken usar essa chave (sem rede).
module GoogleTokenHelper
  CLIENT_ID = "test-client-id.apps.googleusercontent.com".freeze

  def self.key = @key ||= JWT::JWK.new(OpenSSL::PKey::RSA.generate(2048), { use: "sig", alg: "RS256" })

  def google_token(sub: "google-sub-1", aud: CLIENT_ID, iss: "https://accounts.google.com", exp: 1.hour.from_now,
                   email: "boleira@example.com", email_verified: true, name: "Boleira", key: GoogleTokenHelper.key, **extra)
    payload = { sub: sub, aud: aud, iss: iss, exp: exp.to_i, iat: Time.current.to_i, email: email,
                email_verified: email_verified, name: name, picture: "https://example.com/a.png", **extra }
    JWT.encode(payload, key.signing_key, "RS256", { kid: key.kid })
  end
end

RSpec.configure do |config|
  config.include GoogleTokenHelper

  config.before do
    Rails.configuration.x.google_client_id = GoogleTokenHelper::CLIENT_ID
    GoogleIdToken.reset_cache!
    GoogleIdToken.jwks_fetcher = -> { JWT::JWK::Set.new(GoogleTokenHelper.key).export }
  end
end
