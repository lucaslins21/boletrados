class QuestionImage < ApplicationRecord
  MAX_BYTES = 512 * 1024
  # Assinaturas (magic bytes): não confiamos no content-type enviado. SVG não é aceito (pode conter script).
  SIGNATURES = {
    "image/jpeg" => ->(b) { b.start_with?("\xFF\xD8\xFF".b) },
    "image/png" => ->(b) { b.start_with?("\x89PNG\r\n\x1A\n".b) },
    "image/webp" => ->(b) { b.byteslice(0, 4) == "RIFF".b && b.byteslice(8, 4) == "WEBP".b }
  }.freeze

  belongs_to :uploader, class_name: "User"
  has_many :questions, foreign_key: :image_id, dependent: :nullify, inverse_of: :image

  def self.detect_type(bytes) = SIGNATURES.find { |_type, check| check.call(bytes) }&.first

  def self.from_upload!(uploader, bytes)
    raise ArgumentError, "Imagem maior que 512 KB." if bytes.bytesize > MAX_BYTES
    raise ArgumentError, "Imagem vazia." if bytes.empty?

    type = detect_type(bytes) or raise ArgumentError, "Formato não suportado (use JPEG, PNG ou WebP)."
    create!(uploader: uploader, key: SecureRandom.urlsafe_base64(18), content_type: type, byte_size: bytes.bytesize,
            checksum: Digest::SHA256.hexdigest(bytes), data: bytes, created_at: Time.current)
  end

  def path = "/question_images/#{key}"

  # Quem pode ver: quem enviou, admins e quem já foi exposto a uma pergunta com esta imagem
  # (assim ninguém baixa as imagens antes de a pergunta aparecer).
  def visible_to?(user)
    return false unless user
    return true if uploader_id == user.id || user.admin?

    QuestionExposure.where(user: user, question_id: questions.select(:id)).exists?
  end
end
