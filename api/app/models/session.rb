class Session < ApplicationRecord
  DURATION = 30.days

  belongs_to :user

  scope :active, -> { where(expires_at: Time.current..) }

  def self.digest(token) = Digest::SHA256.hexdigest(token)

  # Cria a sessão e devolve [sessão, token]. O token só existe aqui e no cookie.
  def self.start!(user, user_agent: nil, ip_address: nil)
    token = SecureRandom.urlsafe_base64(32)
    session = create!(user: user, token_digest: digest(token), expires_at: DURATION.from_now,
                      user_agent: user_agent&.truncate(255), ip_address: ip_address)
    [ session, token ]
  end

  def self.find_by_token(token)
    return nil if token.blank?

    active.find_by(token_digest: digest(token))
  end
end
