# Parâmetros editáveis de uma pergunta e tratamento de erros comuns da curadoria.
module QuestionParams
  extend ActiveSupport::Concern

  included do
    rescue_from MatchError, with: ->(e) { render_error(e.status, e.message) }
    rescue_from ActiveRecord::RecordInvalid, with: ->(e) {
      render json: { error: "Confira os campos da pergunta.", details: e.record.errors.full_messages.uniq }, status: :unprocessable_content
    }
  end

  private

  def question_params
    params.permit(:prompt, :correct_index, :initial_difficulty, :source_url, :explanation, :image_key, options: [], categories: [])
  end
end
