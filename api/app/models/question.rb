class Question < ApplicationRecord
  STATUSES = %w[draft published retired].freeze

  has_many :question_categories, dependent: :destroy
  has_many :categories, through: :question_categories
  has_many :question_exposures, dependent: :restrict_with_exception

  validates :prompt, :explanation, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :correct_index, inclusion: { in: 0..3 }
  validates :difficulty, inclusion: { in: 1..5 }, allow_nil: true
  validate :exactly_four_filled_options
  validate :at_least_one_category

  scope :published, -> { where(status: "published") }
  scope :in_category, ->(slug) { where(id: QuestionCategory.joins(:category).where(categories: { slug: slug }).select(:question_id)) }
  scope :unseen_by, ->(user) { where.not(id: QuestionExposure.where(user_id: user.id).select(:question_id)) }

  private

  def exactly_four_filled_options
    return if options.is_a?(Array) && options.size == 4 && options.all?(&:present?)

    errors.add(:options, "deve ter exatamente quatro alternativas preenchidas")
  end

  def at_least_one_category
    errors.add(:categories, "deve ter ao menos uma categoria") if question_categories.empty?
  end
end
