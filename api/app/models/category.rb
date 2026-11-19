class Category < ApplicationRecord
  SLUGS = %w[brasileiro europeu sulamericano selecoes escudos estadios].freeze

  has_many :question_categories, dependent: :restrict_with_exception
  has_many :questions, through: :question_categories

  validates :slug, presence: true, uniqueness: true, inclusion: { in: SLUGS }
  validates :label, :short_label, :color, :icon, :position, presence: true

  scope :ordered, -> { order(:position) }
end
