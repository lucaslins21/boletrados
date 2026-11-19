class PushSubscription < ApplicationRecord
  # O servidor faz POST para o endpoint informado pelo navegador. Para não virar SSRF (o cliente apontar o
  # servidor para uma URL arbitrária), só aceitamos os serviços de push dos navegadores.
  PUSH_SERVICE_HOSTS = %w[
    fcm.googleapis.com
    updates.push.services.mozilla.com
    push.services.mozilla.com
    push.apple.com
    notify.windows.com
  ].freeze

  belongs_to :user

  validates :endpoint, :p256dh, :auth, presence: true
  validate :endpoint_from_known_push_service

  def self.allowed_endpoint?(endpoint)
    uri = URI.parse(endpoint.to_s)
    uri.is_a?(URI::HTTPS) && uri.userinfo.nil? && uri.port == 443 &&
      PUSH_SERVICE_HOSTS.any? { |host| uri.host == host || uri.host.to_s.end_with?(".#{host}") }
  rescue URI::InvalidURIError
    false
  end

  private

  def endpoint_from_known_push_service
    errors.add(:endpoint, "não é de um serviço de push conhecido") unless self.class.allowed_endpoint?(endpoint)
  end
end
