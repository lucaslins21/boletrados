module Auth
  # POST /auth/facebook { access_token: "<token do FB.login>" }
  class FacebookController < ApplicationController
    rate_limit to: 10, within: 1.minute, by: -> { client_ip }, with: -> { render_error(:too_many_requests, "Muitas tentativas. Aguarde um minuto.") }

    def create
      claims = FacebookToken.verify(params.require(:access_token))
      user = User.from_provider!("facebook", claims)
      end_session if current_session # troca de sessão no login (evita fixação de sessão)
      start_session_for(user)
      render json: { user: UserSerializer.me(user) }
    rescue FacebookToken::InvalidToken => e
      Rails.logger.info("[auth] token Facebook rejeitado: #{e.message}")
      render_error(:unauthorized, "Não foi possível validar o login com o Facebook.")
    end
  end
end
