require "rails_helper"

RSpec.describe GoogleIdToken do
  it "extrai as claims de um token válido" do
    claims = described_class.verify(google_token(sub: "123", email: "a@b.com", name: "Ana"))
    expect(claims).to have_attributes(sub: "123", email: "a@b.com", email_verified: true, name: "Ana")
  end

  it "busca as chaves de novo quando o Google rotaciona a chave (kid desconhecido)" do
    old_key = JWT::JWK.new(OpenSSL::PKey::RSA.generate(2048), { use: "sig", alg: "RS256" })
    current = [ old_key ]
    fetches = 0
    described_class.jwks_fetcher = -> { fetches += 1; JWT::JWK::Set.new(current.first).export }

    described_class.verify(google_token(key: old_key))
    current[0] = GoogleTokenHelper.key # rotação
    travel 6.minutes do
      expect(described_class.verify(google_token)).to have_attributes(sub: "google-sub-1")
    end
    expect(fetches).to eq(2)
  end

  it "não busca as chaves de novo em menos de 5 minutos (evita abuso com kid inventado)" do
    fetches = 0
    described_class.jwks_fetcher = -> { fetches += 1; JWT::JWK::Set.new(GoogleTokenHelper.key).export }
    described_class.verify(google_token)
    intruder = JWT::JWK.new(OpenSSL::PKey::RSA.generate(2048), { use: "sig", alg: "RS256" })
    expect { described_class.verify(google_token(key: intruder)) }.to raise_error(described_class::InvalidToken)
    expect(fetches).to eq(1)
  end
end
