# Idempotência por cabeçalho Idempotency-Key (por usuário): repetir a mesma requisição devolve a resposta
# guardada em vez de executar a ação de novo (ex.: retry de rede ao responder uma pergunta).
module Idempotent
  extend ActiveSupport::Concern

  STALE_AFTER = 30.seconds # chave sem resposta há mais tempo que isso é considerada abandonada

  private

  def with_idempotency
    key = request.headers["Idempotency-Key"].to_s.strip.first(255)
    return yield if key.blank? || current_user.nil?

    stored = IdempotencyKey.find_by(user_id: current_user.id, key: key)
    if stored && stored.response_status.nil? && stored.created_at < STALE_AFTER.ago
      stored.destroy
      stored = nil
    end
    if stored
      return render_error(:unprocessable_content, "Idempotency-Key já usada em outra requisição.") if stored.request_path != request.path || stored.request_method != request.method
      return render_error(:conflict, "Requisição em processamento.") if stored.response_status.nil?

      return render(json: stored.response_body, status: stored.response_status)
    end

    record = IdempotencyKey.create!(user: current_user, key: key, request_method: request.method, request_path: request.path, created_at: Time.current)
    begin
      yield
    rescue StandardError
      record.destroy
      raise
    end
    if response.status >= 500
      record.destroy
    else
      record.update!(response_status: response.status, response_body: response.body.present? ? JSON.parse(response.body) : nil)
    end
  rescue ActiveRecord::RecordNotUnique
    render_error(:conflict, "Requisição em processamento.")
  end
end
