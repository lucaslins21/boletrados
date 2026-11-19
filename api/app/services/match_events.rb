# Grava eventos no log append-only da partida. Chamar com a partida travada (seq sequencial).
module MatchEvents
  def self.record!(match, kind, actor: nil, at: Time.current, **payload)
    seq = match.match_events.maximum(:seq).to_i + 1
    match.match_events.create!(seq: seq, kind: kind.to_s, actor: actor, payload: payload, created_at: at)
  end
end
