# Inscrições Web Push do navegador do usuário.
class PushSubscriptionsController < ApplicationController
  before_action :authenticate!, except: :public_key

  # GET /push/public_key — chave pública VAPID para o navegador assinar (404 se os avisos estiverem desligados).
  def public_key
    return render_error(:not_found, "Avisos push não configurados.") unless WebPushSender.configured?

    render json: { public_key: Rails.configuration.x.vapid[:public_key] }
  end

  # POST /push/subscriptions { endpoint, keys: { p256dh, auth } }
  def create
    attrs = params.require(:keys).permit(:p256dh, :auth)
    subscription = PushSubscription.find_or_initialize_by(endpoint: params.require(:endpoint))
    # O mesmo navegador pode passar para outra conta: a inscrição segue o usuário logado.
    subscription.assign_attributes(user: current_user, p256dh: attrs[:p256dh], auth: attrs[:auth], user_agent: request.user_agent&.truncate(255))
    if subscription.save
      head :no_content
    else
      render_error(:unprocessable_content, subscription.errors.full_messages.to_sentence)
    end
  end

  # DELETE /push/subscriptions { endpoint }
  def destroy
    current_user.push_subscriptions.where(endpoint: params.require(:endpoint)).destroy_all
    head :no_content
  end
end
