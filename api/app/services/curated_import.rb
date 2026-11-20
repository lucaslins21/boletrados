# Importa o banco de perguntas da curadoria (db/curated/perguntas.yml + imagens em db/curated/escudos).
#
# - Idempotente e só ADICIONA: pergunta cujo `ref` já existe não é tocada (edições feitas pela moderação
#   no painel são preservadas). Para corrigir uma pergunta já importada, use o painel /admin.
# - Entram publicadas e sem autor: ninguém fica impedido de recebê-las numa partida.
# - A alternativa correta é escrita primeiro no arquivo; a posição final é sorteada de forma
#   determinística pelo `ref` (estável entre importações e espalhada entre A, B, C e D).
# - Na primeira importação que adiciona perguntas, as demonstrativas (demo-*) são arquivadas.
class CuratedImport
  LEVELS = { "facil" => "easy", "medio" => "medium", "dificil" => "hard" }.freeze
  Result = Data.define(:created, :skipped, :archived_demo)

  def self.call(path: Rails.root.join("db/curated/perguntas.yml"), images_dir: Rails.root.join("db/curated/escudos"))
    new(path, images_dir).call
  end

  def self.correct_position(ref) = Digest::SHA256.hexdigest(ref.to_s).to_i(16) % 4

  def initialize(path, images_dir)
    @entries = YAML.safe_load_file(path)
    @images_dir = Pathname(images_dir)
  end

  def call
    categories = Category.all.index_by(&:slug)
    created = 0
    skipped = 0
    Question.transaction do
      @entries.each do |entry|
        if Question.exists?(external_ref: entry.fetch("ref"))
          skipped += 1
          next
        end
        build(entry, categories).save!
        created += 1
      end
    end
    archived = created.positive? ? archive_demo! : 0
    Result.new(created:, skipped:, archived_demo: archived)
  end

  private

  def build(entry, categories)
    ref = entry.fetch("ref")
    position = self.class.correct_position(ref)
    options = entry.fetch("erradas").dup
    raise ArgumentError, "#{ref}: são exatamente 3 alternativas erradas" unless options.size == 3

    options.insert(position, entry.fetch("correta"))
    level = LEVELS.fetch(entry.fetch("dificuldade"))
    question = Question.new(
      external_ref: ref, prompt: entry.fetch("pergunta"), options:, correct_index: position,
      explanation: entry.fetch("explicacao"), source_url: entry["fonte"].presence,
      initial_difficulty: level, difficulty: level, status: "published", published_at: Time.current
    )
    question.image = QuestionImage.curated!(@images_dir.join(entry["imagem"]).binread) if entry["imagem"].present?
    entry.fetch("categorias").each { |slug| question.question_categories.build(category: categories.fetch(slug)) }
    question
  end

  def archive_demo!
    Question.published.where("external_ref LIKE 'demo-%'").update_all(status: "archived", updated_at: Time.current)
  end
end
