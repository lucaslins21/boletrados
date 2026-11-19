class User < ApplicationRecord
  has_many :identities, dependent: :destroy
  has_many :sessions, dependent: :destroy
  has_many :question_exposures, dependent: :destroy

  validates :display_name, presence: true, length: { maximum: 60 }

  # Encontra o usuário pela identidade Google (sub) ou cria conta nova.
  # Nunca vincula por e-mail: dois "sub" diferentes com o mesmo e-mail são contas diferentes.
  def self.from_google!(claims)
    identity = Identity.find_by(provider: "google", uid: claims.sub)
    return identity.user if identity

    transaction do
      user = create!(display_name: display_name_from(claims), avatar_url: claims.picture,
                     email: claims.email_verified ? claims.email : nil)
      user.identities.create!(provider: "google", uid: claims.sub, email: claims.email)
      user
    end
  rescue ActiveRecord::RecordNotUnique
    # Primeiro login simultâneo com a mesma conta Google: a outra requisição criou a identidade.
    Identity.find_by!(provider: "google", uid: claims.sub).user
  end

  def self.display_name_from(claims)
    name = claims.name.presence || claims.email.to_s.split("@").first.presence || "Boleiro"
    name.truncate(60, omission: "")
  end
  private_class_method :display_name_from
end
