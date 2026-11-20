require "rails_helper"

RSpec.describe MatchState do
  it "ida e volta pela coluna jsonb preserva a sequência guardada de cada jogador" do
    state = MatchEngine.new_match(now: Time.utc(2026, 11, 20, 12)).with(saved_streaks: [ 2, 1 ].freeze)
    expect(described_class.load(described_class.dump(state))).to eq(state)
  end

  it "carrega partidas salvas antes da sequência por jogador com as sequências guardadas zeradas" do
    json = described_class.dump(MatchEngine.new_match(now: Time.utc(2026, 11, 20, 12))).except("saved_streaks")
    expect(described_class.load(json).saved_streaks).to eq([ 0, 0 ])
  end
end
