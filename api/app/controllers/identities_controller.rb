# Contas conectadas do usuário logado: POST /identities/google { credential } ou /identities/facebook { access_token };
# DELETE /identities/:provider. Só quem está logado conecta, e o login conectado precisa ser verificado no provedor.
class IdentitiesController < ApplicationController
  before_action :authenticate!
  rate_limit to: 10, within: 1.minute, by: -> { client_ip }, only: :create,
             with: -> { render_error(:too_many_requests, "Muitas tentativas. Aguarde um minuto.") }

  def create
    claims = case params[:provider]
    when "google" then GoogleIdToken.verify(params.require(:credential))
    when "facebook" then FacebookToken.verify(params.require(:access_token))
    else return render_error(:not_found, "Provedor desconhecido.")
    end
    current_user.link_identity!(params[:provider], claims)
    render json: { user: UserSerializer.me(current_user.reload) }
  rescue GoogleIdToken::InvalidToken, FacebookToken::InvalidToken => e
    Rails.logger.info("[auth] conexão #{params[:provider]} rejeitada: #{e.message}")
    render_error(:unauthorized, "Não foi possível validar a conta.")
  rescue User::LinkError => e
    render_error(:conflict, e.message)
  end

  def destroy
    current_user.unlink_identity!(params[:provider])
    render json: { user: UserSerializer.me(current_user.reload) }
  rescue User::LinkError => e
    render_error(:unprocessable_entity, e.message)
  end
end
