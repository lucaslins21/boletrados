class Question < ApplicationRecord
  STATUSES = %w[submitted in_review changes_requested rejected published archived].freeze
  # Estados em que o autor ainda pode editar e reenviar.
  AUTHOR_EDITABLE = %w[submitted changes_requested].freeze
  LEVELS = %w[easy medium hard].freeze

  # Legível em 15 segundos (decisão de produto).
  PROMPT_MAX = 180
  OPTION_MAX = 60
  EXPLANATION_MAX = 500
  MAX_CATEGORIES = 3 # relação direta com o assunto; evita classificar por relações indiretas

  # Dificuldade dinâmica: só reclassifica com amostra suficiente de respostas válidas (sem timeouts).
  MIN_VALID_ANSWERS = 50
  EASY_FROM = 0.70
  HARD_BELOW = 0.40

  belongs_to :author, class_name: "User", optional: true # nulo = conteúdo importado (demo)
  belongs_to :image, class_name: "QuestionImage", optional: true
  has_many :question_categories, dependent: :destroy
  has_many :categories, through: :question_categories
  has_many :question_exposures, dependent: :restrict_with_exception
  has_many :reviews, -> { order(:created_at) }, class_name: "QuestionReview", dependent: :destroy
  has_many :versions, -> { order(:created_at) }, class_name: "QuestionVersion", dependent: :destroy

  validates :prompt, presence: true, length: { maximum: PROMPT_MAX }
  validates :explanation, presence: true, length: { maximum: EXPLANATION_MAX }
  validates :status, inclusion: { in: STATUSES }
  validates :correct_index, inclusion: { in: 0..3 }
  validates :initial_difficulty, :difficulty, inclusion: { in: LEVELS }
  validates :source_url, length: { maximum: 500 }, format: { with: %r{\Ahttps?://\S+\z}, message: "deve ser um link http(s)" }, allow_blank: true
  validates :source_url, presence: { message: "é obrigatória (link para conferir a resposta)" }, if: :requires_source?
  validate :four_distinct_options
  validate :categories_count

  scope :published, -> { where(status: "published") }
  scope :in_category, ->(slug) { where(id: QuestionCategory.joins(:category).where(categories: { slug: slug }).select(:question_id)) }
  scope :unseen_by, ->(user) { where.not(id: QuestionExposure.where(user_id: user.id).select(:question_id)) }

  def category_slugs = question_categories.map { |qc| qc.category.slug }

  # Registra o resultado de uma resposta em partida e recalcula a dificuldade.
  # Cada jogador vê a pergunta uma única vez, então toda resposta já é a "primeira exposição".
  def record_answer!(correct:, timed_out:)
    self.class.where(id: id).update_all([
      "answers_count = answers_count + 1, correct_count = correct_count + ?, timeouts_count = timeouts_count + ?",
      correct ? 1 : 0, timed_out ? 1 : 0
    ])
    reload
    level = computed_difficulty
    update_columns(difficulty: level) if level != difficulty
  end

  # Taxa de acerto sobre respostas válidas (timeouts separados dos erros de conhecimento).
  def computed_difficulty
    valid = answers_count - timeouts_count
    return initial_difficulty if valid < MIN_VALID_ANSWERS

    rate = correct_count.to_f / valid
    return "easy" if rate >= EASY_FROM
    return "hard" if rate < HARD_BELOW

    "medium"
  end

  private

  def requires_source? = author_id.present? # conteúdo novo exige fonte; o demo importado é a exceção

  def four_distinct_options
    unless options.is_a?(Array) && options.size == 4 && options.all?(&:present?)
      return errors.add(:options, "deve ter exatamente quatro alternativas preenchidas")
    end
    errors.add(:options, "não pode ter alternativas repetidas") if options.map { |o| o.strip.downcase }.uniq.size < 4
    errors.add(:options, "cada alternativa deve ter no máximo #{OPTION_MAX} caracteres") if options.any? { |o| o.length > OPTION_MAX }
  end

  def categories_count
    count = question_categories.reject(&:marked_for_destruction?).size
    errors.add(:categories, "deve ter ao menos uma categoria") if count.zero?
    errors.add(:categories, "no máximo #{MAX_CATEGORIES} categorias, só as de relação direta") if count > MAX_CATEGORIES
  end
end
