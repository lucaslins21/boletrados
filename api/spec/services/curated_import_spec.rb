require "rails_helper"

RSpec.describe CuratedImport do
  before { Rails.application.load_seed } # categorias + perguntas demo

  let(:dir) { Pathname(Dir.mktmpdir) }
  let(:png) { "\x89PNG\r\n\x1A\n".b + ("x" * 64) }
  let(:entries) do
    [
      { "ref" => "cur-t-001", "categorias" => %w[europeu], "dificuldade" => "dificil",
        "pergunta" => "Quem marcou os gols do Liverpool na virada sobre o Barcelona em 2019?",
        "correta" => "Origi e Wijnaldum", "erradas" => [ "Salah e Mané", "Origi e Firmino", "Wijnaldum e Henderson" ],
        "explicacao" => "Origi e Wijnaldum marcaram dois gols cada no 4 a 0 em Anfield.",
        "fonte" => "https://en.wikipedia.org/wiki/2018%E2%80%9319_UEFA_Champions_League" },
      { "ref" => "cur-t-002", "categorias" => %w[escudos europeu], "dificuldade" => "medio",
        "pergunta" => "De qual clube é este escudo?", "imagem" => "standard.png",
        "correta" => "Standard Liège", "erradas" => %w[Anderlecht Genk Gent], "explicacao" => "Escudo do Standard." }
    ]
  end

  def import!(list = entries)
    dir.join("perguntas.yml").write(list.to_yaml)
    dir.join("standard.png").binwrite(png)
    described_class.call(path: dir.join("perguntas.yml"), images_dir: dir)
  end

  after { FileUtils.remove_entry(dir) }

  it "importa publicadas, sem autor, com a correta na posição sorteada pelo ref e a dificuldade inicial" do
    result = import!
    expect(result.created).to eq(2)
    q = Question.find_by!(external_ref: "cur-t-001")
    expect(q).to have_attributes(status: "published", author_id: nil, initial_difficulty: "hard", difficulty: "hard")
    expect(q.correct_index).to eq(described_class.correct_position("cur-t-001"))
    expect(q.options[q.correct_index]).to eq("Origi e Wijnaldum")
    expect(q.options).to match_array([ "Origi e Wijnaldum", "Salah e Mané", "Origi e Firmino", "Wijnaldum e Henderson" ])
    expect(q.category_slugs).to eq(%w[europeu])
  end

  it "guarda a imagem da curadoria sem dono, visível a admins mas não a jogadores que não a receberam" do
    import!
    q = Question.find_by!(external_ref: "cur-t-002")
    expect(q.image).to have_attributes(uploader_id: nil, content_type: "image/png")
    expect(q.image.visible_to?(User.create!(display_name: "Jogador"))).to be(false)
    expect(q.image.visible_to?(User.create!(display_name: "Admin", admin: true))).to be(true)
  end

  it "só adiciona: não altera perguntas já importadas e não duplica imagens" do
    import!
    Question.find_by!(external_ref: "cur-t-001").update!(prompt: "Editada pela moderação")
    result = import!
    expect(result).to have_attributes(created: 0, skipped: 2)
    expect(Question.find_by!(external_ref: "cur-t-001").prompt).to eq("Editada pela moderação")
    expect(QuestionImage.count).to eq(1)
  end

  it "arquiva as perguntas demo na primeira importação que adiciona perguntas" do
    demo = Question.where("external_ref LIKE 'demo-%'")
    expect(demo.published.count).to be > 0
    expect(import!.archived_demo).to eq(demo.count)
    expect(demo.published.count).to eq(0)
    demo.first.update!(status: "published") # restaurada pela moderação
    expect(import!.archived_demo).to eq(0) # sem perguntas novas, não mexe
  end

  it "espalha a resposta correta entre as quatro posições" do
    positions = (1..200).map { |i| described_class.correct_position(format("cur-%03d", i)) }
    expect(positions.tally.values.min).to be >= 35
  end
end
