require "net/http"

# Valida o ID token emitido pelo Google Identity Services no frontend.
# Confere assinatura (chaves públicas do Google via JWKS), emissor, audiência (nosso Client ID) e expiração.
class GoogleIdToken
  ISSUERS = %w[accounts.google.com https://accounts.google.com].freeze
  CERTS_URL = URI("https://www.googleapis.com/oauth2/v3/certs")
  REFETCH_AFTER = 5.minutes # mínimo entre buscas extras de chaves quando aparece um "kid" desconhecido
  LEEWAY = 30 # segundos de tolerância de relógio

  class InvalidToken < StandardError; end

  Claims = Data.define(:sub, :email, :email_verified, :name, :picture)

  @mutex = Mutex.new

  class << self
    # Em testes, troca a origem das chaves (sem rede).
    attr_writer :jwks_fetcher

    def verify(token, client_id: Rails.configuration.x.google_client_id)
      raise InvalidToken, "GOOGLE_CLIENT_ID não configurado" if client_id.blank?
      raise InvalidToken, "token ausente" if token.blank?

      payload, = JWT.decode(token, nil, true,
                            algorithms: [ "RS256" ], jwks: method(:load_jwks),
                            iss: ISSUERS, verify_iss: true, aud: client_id, verify_aud: true,
                            required_claims: %w[sub exp iat], leeway: LEEWAY)
      Claims.new(sub: payload.fetch("sub"), email: payload["email"], email_verified: payload["email_verified"] == true,
                 name: payload["name"], picture: payload["picture"])
    rescue JWT::DecodeError => e
      raise InvalidToken, e.message
    end

    def reset_cache!
      @mutex.synchronize { @jwks = nil; @fetched_at = nil }
    end

    private

    def load_jwks(options)
      @mutex.synchronize do
        stale = options[:kid_not_found] && @fetched_at && @fetched_at < REFETCH_AFTER.ago
        @jwks = nil if stale
        @jwks ||= begin
          @fetched_at = Time.current
          JWT::JWK::Set.new(jwks_fetcher.call)
        end
      end
    end

    def jwks_fetcher
      @jwks_fetcher ||= lambda do
        response = Net::HTTP.start(CERTS_URL.host, CERTS_URL.port, use_ssl: true, open_timeout: 5, read_timeout: 5) do |http|
          http.get(CERTS_URL.request_uri)
        end
        raise InvalidToken, "não foi possível obter as chaves do Google (HTTP #{response.code})" unless response.is_a?(Net::HTTPSuccess)

        JSON.parse(response.body)
      end
    end
  end
end
