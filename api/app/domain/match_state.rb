# Serialização do MatchEngine::State para a coluna jsonb `matches.state` (e de volta).
module MatchState
  SYMBOL_FIELDS = %i[phase context finished_reason].freeze
  TIME_FIELDS = %i[deadline turn_deadline].freeze

  module_function

  def dump(state)
    hash = state.to_h
    hash[:question] = state.question&.to_h
    hash[:feedback] = state.feedback&.to_h&.then { |fb| fb.merge(context: fb[:context]&.to_s) }
    SYMBOL_FIELDS.each { |field| hash[field] = hash[field]&.to_s }
    TIME_FIELDS.each { |field| hash[field] = hash[field]&.utc&.iso8601(3) }
    hash.deep_stringify_keys
  end

  def load(json)
    data = json.deep_symbolize_keys
    SYMBOL_FIELDS.each { |field| data[field] = data[field]&.to_sym }
    TIME_FIELDS.each { |field| data[field] = data[field] && Time.iso8601(data[field]) }
    data[:question] = data[:question] && MatchEngine::QuestionRef.new(**data[:question])
    data[:feedback] = data[:feedback] && MatchEngine::Feedback.new(**data[:feedback].merge(context: data[:feedback][:context]&.to_sym))
    data[:saved_streaks] ||= [ 0, 0 ] # partidas criadas antes da sequência por jogador
    %i[trophies attempts saved_streaks correct_answers consecutive_timeouts].each { |field| data[field] = data[field].map { |v| v.is_a?(Array) ? v.freeze : v }.freeze }
    MatchEngine::State.new(**data)
  end
end
