require_relative "boot"

require "rails"
# Pick the frameworks you want:
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
# require "active_storage/engine"
require "action_controller/railtie"
require "action_mailer/railtie"
# require "action_mailbox/engine"
# require "action_text/engine"
require "action_view/railtie"
require "action_cable/engine"
# require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Api
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # Only loads a smaller set of middleware suitable for API only apps.
    # Middleware like session, flash, cookies can be added back manually.
    # Skip views, helpers and assets when generating a new resource.
    config.api_only = true
    config.time_zone = "America/Sao_Paulo"
    config.i18n.default_locale = :"pt-BR"
    config.i18n.available_locales = [ :"pt-BR", :en ]

    # Sessão por cookie próprio (httpOnly). Em modo API o middleware de cookies precisa ser adicionado.
    config.middleware.use ActionDispatch::Cookies

    # Atrás do proxy da Vercel chegam Client-IP e X-Forwarded-For com valores diferentes, e a checagem de
    # "IP spoofing" do Rails responderia 500 em todas as requisições. O IP nunca é usado para autorização,
    # só para limitar tentativas e registro (ver ApplicationController#client_ip).
    config.action_dispatch.ip_spoofing_check = false

    # Client ID OAuth do Google (público). Sem ele, POST /auth/google responde 401.
    config.x.google_client_id = ENV["GOOGLE_CLIENT_ID"]&.strip.presence
    # App do Facebook Login. O App ID é público; o App Secret é segredo. Sem eles, POST /auth/facebook responde 401.
    config.x.facebook_app_id = ENV["FACEBOOK_APP_ID"]&.strip.presence # strip: espaço/quebra de linha colados junto invalidam a chave
    config.x.facebook_app_secret = ENV["FACEBOOK_APP_SECRET"]&.strip.presence
    config.x.facebook_graph_version = ENV.fetch("FACEBOOK_GRAPH_VERSION", "v26.0")
    # Origens do frontend autorizadas para CORS e para requisições que alteram estado (proteção CSRF).
    config.x.allowed_origins = ENV.fetch("ALLOWED_ORIGINS", "http://localhost:5173").split(",").map(&:strip)
    # Endereço do frontend, usado nos links de avisos (push e e-mail).
    config.x.frontend_url = ENV.fetch("FRONTEND_URL", "http://localhost:5173").chomp("/")
    # Chaves VAPID do Web Push (gerar com `bin/rails push:vapid_keys`). Sem elas, os avisos push ficam desligados.
    config.x.vapid = {
      public_key: ENV["VAPID_PUBLIC_KEY"], private_key: ENV["VAPID_PRIVATE_KEY"],
      subject: ENV.fetch("VAPID_SUBJECT", "mailto:avisos@boletrados.invalid")
    }
    config.x.mail_from = ENV.fetch("MAIL_FROM", "Boletrados <avisos@boletrados.invalid>")
    # Token do POST /internal/tick (cron de hora em hora). Sem ele, o endpoint fica desligado.
    config.x.tick_token = ENV["TICK_TOKEN"]
  end
end
