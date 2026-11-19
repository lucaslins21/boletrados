class Match < ApplicationRecord
  STATUSES = %w[waiting_opponent active finished cancelled].freeze
  INVITE_TTL = 7.days
  MAX_ACTIVE_PER_USER = 3
  MAX_PENDING_INVITES_PER_USER = 5
  # Código curto: alfabeto sem caracteres ambíguos (0/O, 1/I/L).
  CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789".chars.freeze
  CODE_LENGTH = 6
  CODE_FORMAT = /\ABOLA-[#{CODE_ALPHABET.join}]{#{CODE_LENGTH}}\z/

  belongs_to :created_by, class_name: "User"
  belongs_to :current_user, class_name: "User", optional: true
  belongs_to :winner, class_name: "User", optional: true
  has_many :match_players, -> { order(:seat) }, dependent: :destroy, inverse_of: :match
  has_many :players, through: :match_players, source: :user
  has_many :match_questions, dependent: :destroy
  has_many :trophies, dependent: :destroy
  has_many :match_events, -> { order(:seq) }, dependent: :destroy, inverse_of: :match

  validates :status, inclusion: { in: STATUSES }

  scope :involving, ->(user) { where(id: MatchPlayer.where(user_id: user.id).select(:match_id)) }
  scope :open_invites, -> { where(status: "waiting_opponent").where(invite_expires_at: Time.current..) }

  def self.generate_code = "BOLA-#{Array.new(CODE_LENGTH) { CODE_ALPHABET.sample(random: SecureRandom) }.join}"
  def self.token_digest(token) = Digest::SHA256.hexdigest(token)

  # Encontra o convite pelo código curto (BOLA-XXXXXX) ou pelo token do link.
  def self.find_invite(key)
    key = key.to_s.strip
    if key.upcase.match?(CODE_FORMAT)
      where(status: "waiting_opponent").find_by(invite_code: key.upcase)
    elsif key.length >= 32
      find_by(invite_token_digest: token_digest(key))
    end
  end

  def invite_expired?(now = Time.current) = invite_expires_at <= now
  def seat_of(user) = match_players.find { |mp| mp.user_id == user.id }&.seat
  def user_at(seat) = match_players.find { |mp| mp.seat == seat }&.user
  def engine_state = state && MatchState.load(state)
end
