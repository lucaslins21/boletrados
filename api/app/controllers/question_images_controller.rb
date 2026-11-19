class QuestionImagesController < ApplicationController
  DAILY_LIMIT = 30

  before_action :authenticate!

  # POST /question_images (multipart, campo "file") — JPEG/PNG/WebP até 512 KB.
  def create
    file = params.require(:file)
    return render_error(:unprocessable_content, "Envie um arquivo de imagem.") unless file.respond_to?(:read)
    if QuestionImage.where(uploader: current_user, created_at: 24.hours.ago..).count >= DAILY_LIMIT
      return render_error(:too_many_requests, "Limite de imagens por dia atingido.")
    end

    image = QuestionImage.from_upload!(current_user, file.read(QuestionImage::MAX_BYTES + 1).to_s.b)
    render json: { image: { key: image.key, path: image.path } }, status: :created
  rescue ArgumentError => e
    render_error(:unprocessable_content, e.message)
  end

  # GET /question_images/:key — só para quem enviou, admins ou quem já recebeu a pergunta.
  def show
    image = QuestionImage.find_by(key: params[:key])
    return head :not_found unless image&.visible_to?(current_user)

    response.headers["Cache-Control"] = "private, max-age=3600"
    response.headers["X-Content-Type-Options"] = "nosniff"
    send_data image.data, type: image.content_type, disposition: "inline"
  end
end
