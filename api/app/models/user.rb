class User < ApplicationRecord
  has_many :question_exposures, dependent: :destroy

  validates :display_name, presence: true, length: { maximum: 60 }
end
