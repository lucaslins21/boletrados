module Auth
  # POST /auth/google { credential: "<ID token do Google Identity Services>" }
  class GoogleController < ApplicationController
    rate_limit to: 10, within: 1.minute, with: -> { render_error(:too_many_requests, "Muitas tentativas. Aguarde um minuto.") }

    def create
      claims = GoogleIdToken.verify(params.require(:credential))
      user = User.from_google!(claims)
      end_session if current_session # troca de sessão no login (evita fixação de sessão)
      start_session_for(user)
      render json: { user: UserSerializer.call(user) }
    rescue GoogleIdToken::InvalidToken => e
      Rails.logger.info("[auth] token Google rejeitado: #{e.message}")
      render_error(:unauthorized, "Não foi possível validar o login com o Google.")
    end
  end
end
