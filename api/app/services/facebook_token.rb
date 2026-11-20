require "net/http"

# Valida o access token entregue pelo SDK de JavaScript do Facebook (FB.login) no frontend.
#
# 1. `debug_token` (com o token do app: APP_ID|APP_SECRET) confirma que o token é válido e foi emitido
#    para o NOSSO app — impede reaproveitar um token obtido por outro site.
# 2. `/me` busca id, nome, e-mail e foto, com `appsecret_proof` (HMAC do token com o segredo do app).
class FacebookToken
  GRAPH_HOST = "graph.facebook.com"
  class InvalidToken < StandardError; end

  # Mesmo formato das claims do Google, para o login seguir o mesmo caminho em User.from_provider!.
  Claims = Data.define(:sub, :email, :email_verified, :name, :picture)

  class << self
    # Em testes, troca as chamadas HTTP: ->(path, params) { hash }.
    attr_writer :http

    def verify(token, app_id: Rails.configuration.x.facebook_app_id, app_secret: Rails.configuration.x.facebook_app_secret,
               version: Rails.configuration.x.facebook_graph_version)
      raise InvalidToken, "FACEBOOK_APP_ID/FACEBOOK_APP_SECRET não configurados" if app_id.blank? || app_secret.blank?
      raise InvalidToken, "token ausente" if token.blank?

      debug = http.call("/#{version}/debug_token", input_token: token, access_token: "#{app_id}|#{app_secret}").fetch("data", {})
      raise InvalidToken, "token inválido" unless debug["is_valid"] == true
      raise InvalidToken, "token de outro app" unless debug["app_id"].to_s == app_id.to_s

      proof = OpenSSL::HMAC.hexdigest("SHA256", app_secret, token)
      me = http.call("/#{version}/me", fields: "id,name,email,picture.width(256).height(256)", access_token: token, appsecret_proof: proof)
      raise InvalidToken, "usuário diferente do token" unless me["id"].present? && me["id"].to_s == debug["user_id"].to_s

      picture = me.dig("picture", "data")
      Claims.new(sub: me["id"].to_s, email: me["email"], email_verified: me["email"].present?, # o Facebook só devolve e-mail confirmado
                 name: me["name"], picture: picture && !picture["is_silhouette"] ? picture["url"] : nil)
    end

    private

    def http
      @http ||= lambda do |path, params|
        uri = URI::HTTPS.build(host: GRAPH_HOST, path: path, query: URI.encode_www_form(params))
        response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 5) { |h| h.get(uri.request_uri) }
        body = JSON.parse(response.body) rescue {}
        raise InvalidToken, "Facebook respondeu HTTP #{response.code}: #{body.dig('error', 'message')}" unless response.is_a?(Net::HTTPSuccess)

        body
      end
    end
  end
end
