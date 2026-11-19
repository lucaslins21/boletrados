# Aplica os campos editáveis de uma pergunta (envio do usuário, edição do autor ou do admin).
# Guarda uma versão (auditoria) quando a pergunta já existia. Editar não a torna inédita para ninguém.
class QuestionEditor
  FIELDS = %w[prompt correct_index initial_difficulty source_url explanation].freeze

  def initialize(question, editor)
    @question = question
    @editor = editor
  end

  def apply(params)
    snapshot = @question.persisted? ? snapshot_of(@question) : nil
    attrs = params.slice(*FIELDS).to_h
    attrs["prompt"] = attrs["prompt"].to_s.squish if attrs.key?("prompt")
    attrs["explanation"] = attrs["explanation"].to_s.strip if attrs.key?("explanation")
    attrs["source_url"] = attrs["source_url"].to_s.strip.presence if attrs.key?("source_url")
    attrs["correct_index"] = Integer(attrs["correct_index"].to_s, exception: false) if attrs.key?("correct_index")
    @question.assign_attributes(attrs)
    @question.options = Array(params["options"]).map { |o| o.to_s.squish } if params.key?("options")
    @question.difficulty = @question.initial_difficulty if @question.new_record?
    assign_categories(params["categories"]) if params.key?("categories")
    assign_image(params["image_key"]) if params.key?("image_key")
    @snapshot = snapshot
    self
  end

  def save!
    Question.transaction do
      changed = @question.changed? || @question.question_categories.any? { |qc| qc.new_record? || qc.marked_for_destruction? }
      @question.save!
      @question.versions.create!(editor: @editor, snapshot: @snapshot, created_at: Time.current) if @snapshot && changed
    end
    @question
  end

  def snapshot_of(question)
    question.slice("prompt", "options", "correct_index", "initial_difficulty", "source_url", "explanation", "image_id")
            .merge("categories" => question.category_slugs)
  end

  private

  def assign_categories(slugs)
    wanted = Category.where(slug: Array(slugs).map(&:to_s).uniq).to_a
    @question.question_categories.each { |qc| qc.mark_for_destruction unless wanted.include?(qc.category) }
    (wanted - @question.question_categories.map(&:category)).each { |c| @question.question_categories.build(category: c) }
  end

  def assign_image(key)
    return @question.image = nil if key.blank?

    image = QuestionImage.find_by(key: key.to_s)
    unless image && (image.uploader_id == @editor.id || @editor.admin?)
      @question.errors.add(:image, "inválida") # validação abaixo impede salvar
      raise ActiveRecord::RecordInvalid, @question
    end
    @question.image = image
  end
end
