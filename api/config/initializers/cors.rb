# CORS para o frontend (web/). As origens vêm de ALLOWED_ORIGINS (ver config/application.rb).
# `credentials: true` permite o envio do cookie de sessão nas requisições do frontend.
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*Rails.application.config.x.allowed_origins)
    resource "*",
      headers: :any,
      methods: %i[get post put patch delete options head],
      credentials: true
  end
end
