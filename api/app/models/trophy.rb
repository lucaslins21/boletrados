class Trophy < ApplicationRecord
  belongs_to :match
  belongs_to :user
  belongs_to :category
end
