# Ações de moderação (administradores). Toda pergunta aberta para revisão entra no histórico de exposição
# do revisor: ele nunca a receberá numa partida (regra de produto).
class Curation
  def initialize(admin)
    raise ArgumentError, "somente administradores" unless admin&.admin?

    @admin = admin
  end

  # Abrir para revisar: registra exposição e move "enviada" para "em análise".
  def open(question)
    QuestionExposure.record!(@admin, question, question.author_id == @admin.id ? "authored" : "reviewed")
    question.update!(status: "in_review") if question.status == "submitted"
    question
  end

  def duplicates(question)
    found = DuplicateFinder.call(prompt: question.prompt, correct_option: question.options[question.correct_index], excluding: question.id)
    found.each { |d| QuestionExposure.record!(@admin, d[:question], "reviewed") } # foram exibidas ao revisor
    found
  end

  def create(params, publish:)
    question = Question.new(author: @admin, status: "submitted", submitted_at: Time.current)
    editor = QuestionEditor.new(question, @admin).apply(params)
    Question.transaction do
      editor.save!
      QuestionExposure.record!(@admin, question, "authored")
      approve(question) if publish
    end
    question
  end

  def edit(question, params)
    open(question)
    QuestionEditor.new(question, @admin).apply(params).save!
    review!(question, "edit")
    question
  end

  def approve(question)
    transition(question, from: %w[submitted in_review changes_requested], to: "published", decision: "approve") do
      question.published_at ||= Time.current
      question.errors.add(:source_url, "é obrigatória para publicar") if question.source_url.blank? && question.author_id
    end
  end

  def reject(question, notes) = transition(question, from: %w[submitted in_review changes_requested], to: "rejected", decision: "reject", notes: required(notes))
  def request_changes(question, notes) = transition(question, from: %w[submitted in_review], to: "changes_requested", decision: "request_changes", notes: required(notes))
  def archive(question, notes = nil) = transition(question, from: %w[published], to: "archived", decision: "archive", notes: notes)
  def restore(question) = transition(question, from: %w[archived], to: "published", decision: "restore")

  private

  def transition(question, from:, to:, decision:, notes: nil)
    raise MatchError.new("Não é possível #{verb(decision)} uma pergunta com status \"#{question.status}\".", status: :conflict) unless from.include?(question.status)

    Question.transaction do
      open(question)
      question.status = to
      yield if block_given?
      raise ActiveRecord::RecordInvalid, question if question.errors.any?

      question.save!
      review!(question, decision, notes)
    end
    question
  end

  def review!(question, decision, notes = nil)
    question.reviews.create!(reviewer: @admin, reviewer_kind: "admin", decision: decision, notes: notes, created_at: Time.current)
  end

  def required(notes)
    notes.to_s.strip.presence or raise MatchError, "Explique o motivo para o autor."
  end

  def verb(decision)
    { "approve" => "aprovar", "reject" => "rejeitar", "request_changes" => "devolver", "archive" => "arquivar", "restore" => "restaurar" }.fetch(decision)
  end
end
