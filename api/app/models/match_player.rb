class MatchPlayer < ApplicationRecord
  belongs_to :match
  belongs_to :user

  validates :seat, inclusion: { in: [ 0, 1 ] }
end
