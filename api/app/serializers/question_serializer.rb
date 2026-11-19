module QuestionSerializer
  STATUS_LABELS = {
    "submitted" => "Enviada", "in_review" => "Em análise", "changes_requested" => "Devolvida para correção",
    "rejected" => "Rejeitada", "published" => "Publicada", "archived" => "Arquivada"
  }.freeze

  module_function

  # Pergunta completa (inclui a resposta): só para o autor ou para administradores.
  def full(q, admin: false)
    data = {
      id: q.id, status: q.status, status_label: STATUS_LABELS[q.status],
      prompt: q.prompt, options: q.options, correct_index: q.correct_index, categories: q.category_slugs,
      initial_difficulty: q.initial_difficulty, difficulty: q.difficulty, source_url: q.source_url, explanation: q.explanation,
      image: q.image && { key: q.image.key, path: q.image.path },
      submitted_at: q.submitted_at, published_at: q.published_at, updated_at: q.updated_at,
      editable: Question::AUTHOR_EDITABLE.include?(q.status),
      # Para o autor: só o último retorno da moderação (motivo de devolução ou rejeição).
      feedback: q.reviews.select { |r| %w[reject request_changes].include?(r.decision) }.last&.notes
    }
    return data unless admin

    data.merge(
      author: q.author && UserSerializer.call(q.author), external_ref: q.external_ref,
      stats: { answers: q.answers_count, correct: q.correct_count, timeouts: q.timeouts_count },
      reviews: q.reviews.map { |r| { decision: r.decision, notes: r.notes, reviewer: r.reviewer.display_name, at: r.created_at } },
      versions_count: q.versions.size
    )
  end

  # Item da fila do admin: só metadados e o começo do enunciado (sem alternativas nem resposta).
  # Abrir a pergunta completa é o que conta como exposição do revisor.
  def preview(q)
    {
      id: q.id, status: q.status, status_label: STATUS_LABELS[q.status], categories: q.category_slugs,
      prompt_preview: q.prompt.truncate(40, separator: " "), has_image: q.image_id.present?,
      difficulty: q.difficulty, author: q.author&.display_name, submitted_at: q.submitted_at, published_at: q.published_at
    }
  end

  def duplicate(d)
    q = d[:question]
    { id: q.id, status: q.status, prompt: q.prompt, correct_option: q.options[q.correct_index],
      score: d[:score], same_answer: d[:same_answer], same_numbers: d[:same_numbers] }
  end
end
