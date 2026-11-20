class User < ApplicationRecord
  has_many :identities, dependent: :destroy
  has_many :sessions, dependent: :destroy
  has_many :question_exposures, dependent: :destroy
  has_many :push_subscriptions, dependent: :destroy
  has_many :authored_questions, class_name: "Question", foreign_key: :author_id, dependent: :nullify, inverse_of: :author
  has_many :match_players, dependent: :restrict_with_exception
  has_many :matches, through: :match_players

  # Partidas em andamento (convites pendentes não contam; ver docs/ARQUITETURA.md).
  def active_matches_count = matches.where(status: "active").count
  def pending_invites_count = Match.open_invites.where(created_by_id: id).count

  validates :display_name, presence: true, length: { maximum: 60 }

  def self.from_google!(claims) = from_provider!("google", claims)

  # Encontra o usuário pela identidade (provedor + id da conta) ou cria conta nova.
  # Nunca vincula por e-mail: contas Google e Facebook com o mesmo e-mail são contas diferentes no jogo.
  def self.from_provider!(provider, claims)
    raise ArgumentError, "provedor desconhecido: #{provider}" unless Identity::PROVIDERS.include?(provider)

    identity = Identity.find_by(provider: provider, uid: claims.sub)
    return identity.user.tap { |user| user.refresh_avatar!(claims.picture) } if identity

    transaction do
      user = create!(display_name: display_name_from(claims), avatar_url: claims.picture,
                     email: claims.email_verified ? claims.email : nil)
      user.identities.create!(provider: provider, uid: claims.sub, email: claims.email)
      user
    end
  rescue ActiveRecord::RecordNotUnique
    # Primeiro login simultâneo com a mesma conta: a outra requisição criou a identidade.
    Identity.find_by!(provider: provider, uid: claims.sub).user
  end

  class LinkError < StandardError; end

  # Conecta mais um login (Google ou Facebook) a esta conta, já com as claims verificadas do provedor.
  # - Se esse login já é desta conta, nada muda.
  # - Se pertence a outra conta VAZIA (sem partidas, perguntas ou histórico), a conta vazia é absorvida.
  # - Se pertence a uma conta com histórico, recusa: não misturamos dados de duas contas.
  def link_identity!(provider, claims)
    raise ArgumentError, "provedor desconhecido: #{provider}" unless Identity::PROVIDERS.include?(provider)

    transaction do
      existing = Identity.lock.find_by(provider: provider, uid: claims.sub)
      next :already_linked if existing&.user_id == id
      raise LinkError, "Sua conta já tem um #{provider_label(provider)} conectado." if identities.exists?(provider: provider)

      if existing
        other = existing.user
        raise LinkError, "Esse #{provider_label(provider)} já tem uma conta no jogo com partidas ou perguntas." unless other.absorbable?

        existing.update!(user: self)
        other.reload.destroy!
      else
        identities.create!(provider: provider, uid: claims.sub, email: claims.email)
      end
      update!(avatar_url: claims.picture) if avatar_url.blank? && claims.picture.present?
      :linked
    end
  end

  # Remove um login, desde que sobre outro para entrar.
  def unlink_identity!(provider)
    transaction do
      lock! # serializa desconexões simultâneas da mesma conta
      raise LinkError, "Mantenha pelo menos uma forma de entrar." if identities.count <= 1

      identities.find_by(provider: provider)&.destroy!
    end
  end

  # Conta sem nada ligado a ela, que pode ser apagada ao conectar o mesmo login a outra conta.
  def absorbable?
    !admin? && identities.count <= 1 &&
      !MatchPlayer.exists?(user_id: id) && !Match.exists?(created_by_id: id) &&
      !QuestionExposure.exists?(user_id: id) && !Question.exists?(author_id: id) &&
      !QuestionImage.exists?(uploader_id: id) && !QuestionReview.exists?(reviewer_id: id) &&
      !QuestionVersion.exists?(editor_id: id)
  end

  def providers = identities.pluck(:provider).sort

  # A foto acompanha a conta de login: atualiza a cada login (o nome de exibição não muda sozinho).
  def refresh_avatar!(url)
    update!(avatar_url: url) if url.present? && url != avatar_url
  end

  def provider_label(provider) = provider == "google" ? "Google" : "Facebook"
  private :provider_label

  def self.display_name_from(claims)
    name = claims.name.presence || claims.email.to_s.split("@").first.presence || "Boleiro"
    name.truncate(60, omission: "")
  end
  private_class_method :display_name_from
end
