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

  # IP do cliente. Atrás de proxies (Vercel → Render), request.remote_ip devolveria o IP do proxy e
  # todos os usuários dividiriam o mesmo limite de tentativas. O primeiro X-Forwarded-For pode ser forjado,
  # então serve só para rate limit e registro, nunca para autorização.
  def client_ip
    request.headers["X-Forwarded-For"].to_s.split(",").first.to_s.strip.presence || request.remote_ip
  end

  def authenticate!
    render_error(:unauthorized, "Faça login para continuar.") unless current_user
  end

  def start_session_for(user)
    session, token = Session.start!(user, user_agent: request.user_agent, ip_address: client_ip)
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
