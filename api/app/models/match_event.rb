class MatchEvent < ApplicationRecord
  belongs_to :match
  belongs_to :actor, class_name: "User", optional: true
end
