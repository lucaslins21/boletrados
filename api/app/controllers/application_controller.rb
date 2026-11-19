class ApplicationController < ActionController::API
  include ActionController::Cookies

  SESSION_COOKIE = :boletrados_session
  SAFE_METHODS = %w[GET HEAD OPTIONS].freeze

  before_action :verify_request_origin

  private

  def current_session
    return @current_session if defined?(@current_session)

    @current_session = Session.find_by_token(cookies[SESSION_COOKIE])
  end

  def current_user = current_session&.user

  def authenticate!
    render_error(:unauthorized, "Faça login para continuar.") unless current_user
  end

  def start_session_for(user)
    session, token = Session.start!(user, user_agent: request.user_agent, ip_address: request.remote_ip)
    cookies[SESSION_COOKIE] = {
      value: token, expires: session.expires_at, httponly: true,
      secure: Rails.env.production?, same_site: :lax
    }
    @current_session = session
  end

  def end_session
    current_session&.destroy
    cookies.delete(SESSION_COOKIE)
    @current_session = nil
  end

  # Proteção CSRF para autenticação por cookie: requisições que alteram estado precisam vir de uma origem
  # autorizada. Navegadores sempre enviam Origin nesses casos; sem Origin, só aceitamos se não houver cookie
  # de sessão (ex.: chamadas de servidor/CLI, que não carregam a sessão de uma vítima).
  def verify_request_origin
    return if SAFE_METHODS.include?(request.method)

    origin = request.origin
    allowed = Rails.configuration.x.allowed_origins.include?(origin)
    return if allowed || (origin.nil? && cookies[SESSION_COOKIE].blank?)

    render_error(:forbidden, "Origem não autorizada.")
  end

  def render_error(status, message)
    render json: { error: message }, status: status
  end
end
