module AuthHelper
  ORIGIN = "http://localhost:5173".freeze

  # Loga o usuário no "navegador" do teste (cookie de sessão). Trocar de usuário = chamar de novo.
  def sign_in(user)
    _session, token = Session.start!(user)
    cookies[ApplicationController::SESSION_COOKIE.to_s] = token
  end

  def api_post(path, params = {}, headers: {})
    post path, params: params, headers: { "Origin" => ORIGIN }.merge(headers), as: :json
  end

  def api_delete(path)
    delete path, headers: { "Origin" => ORIGIN }
  end

  def json = response.parsed_body
end

RSpec.configure do |config|
  config.include AuthHelper, type: :request
end
