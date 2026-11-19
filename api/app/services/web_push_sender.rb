# Envia notificações Web Push para todas as inscrições de um usuário.
# Inscrições que o navegador invalidou (HTTP 404/410) são removidas.
module WebPushSender
  module_function

  def configured?
    vapid = Rails.configuration.x.vapid
    vapid[:public_key].present? && vapid[:private_key].present?
  end

  # Retorna quantas notificações foram entregues ao serviço de push.
  def deliver(user, title:, body:, url:, tag:)
    return 0 unless configured?

    payload = { title: title, body: body, url: url, tag: tag }.to_json
    user.push_subscriptions.to_a.count do |subscription|
      send_one(subscription, payload)
    end
  end

  def send_one(subscription, payload)
    WebPush.payload_send(
      message: payload, endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth: subscription.auth,
      vapid: Rails.configuration.x.vapid, ttl: 24 * 3600, urgency: "high"
    )
    subscription.update_column(:last_sent_at, Time.current)
    true
  rescue WebPush::ExpiredSubscription, WebPush::InvalidSubscription
    subscription.destroy
    false
  rescue WebPush::ResponseError, SocketError, Timeout::Error, Errno::ECONNREFUSED => e
    Rails.logger.warn("[push] falha ao enviar para inscrição #{subscription.id}: #{e.class}: #{e.message}")
    false
  end
  private_class_method :send_one
end
