require "rails_helper"

RSpec.describe "Curadoria de perguntas", type: :request do
  before { Rails.application.load_seed }

  let(:author) { User.create!(display_name: "Autora") }
  let(:admin) { User.create!(display_name: "Admin", admin: true) }
  let(:player) { User.create!(display_name: "Jogador") }

  let(:valid) do
    { prompt: "Qual clube venceu a Copa Libertadores de 1981?", options: [ "Flamengo", "Cobreloa", "Peñarol", "Nacional" ],
      correct_index: 0, categories: %w[sulamericano], initial_difficulty: "medium",
      source_url: "https://pt.wikipedia.org/wiki/Copa_Libertadores_da_Am%C3%A9rica_de_1981",
      explanation: "O Flamengo venceu o Cobreloa na final de 1981." }
  end

  def submit(params = valid)
    sign_in(author)
    api_post "/submissions", params
  end

  def admin_post(path, params = {})
    sign_in(admin)
    api_post path, params
  end

  describe "envio pelo usuário" do
    it "cria a pergunta como enviada, fora do jogo, e registra a autoria como exposição" do
      submit
      expect(response).to have_http_status(:created)
      q = Question.find(json.dig("submission", "id"))
      expect(q).to have_attributes(status: "submitted", author: author, initial_difficulty: "medium", difficulty: "medium")
      expect(QuestionExposure.find_by(user: author, question: q).source).to eq("authored")
      expect(Question.published).not_to include(q)
      expect(json["submission"]).to include("status_label" => "Enviada", "editable" => true, "categories" => %w[sulamericano])
    end

    it "valida os campos com mensagens em português" do
      submit(valid.merge(prompt: "x" * 181, options: %w[A A B C], categories: [], source_url: "", explanation: ""))
      expect(response).to have_http_status(:unprocessable_content)
      details = json["details"].join(" | ")
      expect(details).to include("Enunciado deve ter no máximo 180 caracteres")
      expect(details).to include("Alternativas não pode ter alternativas repetidas")
      expect(details).to include("Categorias deve ter ao menos uma categoria")
      expect(details).to include("Fonte é obrigatória")
      expect(details).to include("Explicação não pode ficar em branco")
    end

    it "limita alternativas longas, fonte inválida e mais de 3 categorias" do
      submit(valid.merge(options: [ "a" * 61, "B", "C", "D" ], source_url: "javascript:alert(1)", categories: %w[brasileiro europeu selecoes estadios]))
      details = json["details"].join(" | ")
      expect(details).to include("no máximo 60 caracteres", "Fonte deve ser um link http(s)", "no máximo 3 categorias")
    end

    it "avisa quantas perguntas parecidas existem, sem mostrar quais (não expõe o banco ao autor)" do
      submit(valid.merge(prompt: "Quem conquistou a Copa do Mundo de 2010?", options: %w[Espanha Holanda Alemanha Brasil], categories: %w[selecoes]))
      expect(json["possible_duplicates"]).to be >= 1
      expect(response.body).not_to include("Quem venceu a Copa do Mundo de 2014")
    end

    it "limita envios por dia" do
      sign_in(author)
      stub_const("SubmissionsController::DAILY_LIMIT", 1)
      api_post "/submissions", valid
      api_post "/submissions", valid.merge(prompt: "Outra pergunta sobre a Libertadores de 1981?")
      expect(response).to have_http_status(:too_many_requests)
    end

    it "lista só as próprias perguntas" do
      submit
      sign_in(player)
      get "/submissions"
      expect(json["submissions"]).to eq([])
    end
  end

  describe "moderação" do
    let!(:question) { submit && Question.find(json.dig("submission", "id")) }

    it "o painel não existe para quem não é admin" do
      sign_in(player)
      get "/admin/questions"
      expect(response).to have_http_status(:not_found)
    end

    it "a fila mostra só o começo do enunciado, sem alternativas nem resposta" do
      sign_in(admin)
      get "/admin/questions", params: { status: "queue" }
      item = json["questions"].find { |q| q["id"] == question.id }
      expect(item.keys).not_to include("options", "correct_index", "explanation")
      expect(item["prompt_preview"].length).to be <= 43
      expect(json["published_by_category"]["sulamericano"]).to be > 0
    end

    it "abrir para revisar registra exposição do revisor e move para em análise" do
      sign_in(admin)
      get "/admin/questions/#{question.id}"
      expect(json.dig("question", "options")).to eq(valid[:options])
      expect(question.reload.status).to eq("in_review")
      expect(QuestionExposure.find_by(user: admin, question: question).source).to eq("reviewed")
    end

    it "aprovar publica; nem o autor nem o revisor recebem a pergunta no jogo" do
      admin_post "/admin/questions/#{question.id}/approve"
      expect(question.reload).to have_attributes(status: "published", published_at: be_present)
      ids = ->(user) { QuestionPicker.new(user).available("sulamericano").pluck(:id) }
      expect(ids.call(player)).to include(question.id)
      expect(ids.call(author)).not_to include(question.id)
      expect(ids.call(admin)).not_to include(question.id)
    end

    it "devolver exige motivo; o autor vê o retorno, corrige e reenvia" do
      admin_post "/admin/questions/#{question.id}/request_changes", { notes: "" }
      expect(response).to have_http_status(:unprocessable_content)
      admin_post "/admin/questions/#{question.id}/request_changes", { notes: "Inclua o placar na explicação." }
      expect(question.reload.status).to eq("changes_requested")

      sign_in(author)
      get "/submissions/#{question.id}"
      expect(json["submission"]).to include("feedback" => "Inclua o placar na explicação.", "editable" => true)
      patch "/submissions/#{question.id}", params: { explanation: "Flamengo 2 x 0 Cobreloa no jogo-desempate." }, headers: { "Origin" => AuthHelper::ORIGIN }, as: :json
      expect(question.reload).to have_attributes(status: "submitted", explanation: start_with("Flamengo 2 x 0"))
      expect(question.versions.count).to eq(1)
    end

    it "o autor não edita depois que a análise começou" do
      sign_in(admin)
      get "/admin/questions/#{question.id}"
      sign_in(author)
      patch "/submissions/#{question.id}", params: { prompt: "Mudou?" }, headers: { "Origin" => AuthHelper::ORIGIN }, as: :json
      expect(response).to have_http_status(:conflict)
    end

    it "rejeitar exige motivo e tira a pergunta do fluxo" do
      admin_post "/admin/questions/#{question.id}/reject", { notes: "Pergunta ambígua." }
      expect(question.reload.status).to eq("rejected")
      admin_post "/admin/questions/#{question.id}/approve"
      expect(response).to have_http_status(:conflict)
    end

    it "arquivar tira do jogo e restaurar devolve" do
      admin_post "/admin/questions/#{question.id}/approve"
      admin_post "/admin/questions/#{question.id}/archive"
      expect(Question.published).not_to include(question.reload)
      admin_post "/admin/questions/#{question.id}/restore"
      expect(question.reload.status).to eq("published")
      expect(question.reviews.pluck(:decision)).to eq(%w[approve archive restore])
    end

    it "editar guarda versão e não torna a pergunta inédita para quem já a viu" do
      admin_post "/admin/questions/#{question.id}/approve"
      QuestionExposure.record!(player, question, "play")
      sign_in(admin)
      patch "/admin/questions/#{question.id}", params: { prompt: "Quem foi campeão da Libertadores de 1981?" }, headers: { "Origin" => AuthHelper::ORIGIN }, as: :json
      expect(response).to have_http_status(:ok)
      expect(question.reload.versions.last.snapshot["prompt"]).to eq(valid[:prompt])
      expect(QuestionPicker.new(player).available("sulamericano")).not_to include(question)
    end

    it "mostra possíveis duplicatas ao admin e registra que ele as viu" do
      sign_in(author)
      api_post "/submissions", valid.merge(prompt: "Qual seleção ganhou a Copa de 2010 na África do Sul?", options: %w[Espanha Holanda Alemanha Brasil], categories: %w[selecoes])
      dup = Question.find(json.dig("submission", "id"))
      sign_in(admin)
      get "/admin/questions/#{dup.id}"
      original = Question.find_by!(prompt: "Quem conquistou a Copa do Mundo de 2010?")
      expect(json["duplicates"].first).to include("id" => original.id, "same_answer" => true)
      expect(QuestionExposure.exists?(user: admin, question: original)).to be(true)
    end
  end

  describe "cadastro direto pelo admin" do
    it "publica na hora e registra a autoria" do
      admin_post "/admin/questions", valid
      expect(response).to have_http_status(:created)
      q = Question.find(json.dig("question", "id"))
      expect(q).to have_attributes(status: "published", author: admin)
      expect(QuestionExposure.find_by(user: admin, question: q).source).to eq("authored")
    end

    it "pode só salvar, sem publicar (entra na fila)" do
      admin_post "/admin/questions", valid.merge(publish: false)
      expect(Question.find(json.dig("question", "id")).status).to eq("submitted")
    end
  end

  describe "imagens" do
    let(:png) { "\x89PNG\r\n\x1A\n".b + ("\x00".b * 64) }

    def upload(bytes, filename: "img.png", type: "image/png", user: author)
      sign_in(user)
      file = Rack::Test::UploadedFile.new(StringIO.new(bytes), type, true, original_filename: filename)
      post "/question_images", params: { file: file }, headers: { "Origin" => AuthHelper::ORIGIN }
    end

    it "aceita PNG/JPEG/WebP pelo conteúdo e rejeita SVG e arquivos grandes" do
      upload(png)
      expect(response).to have_http_status(:created)
      upload("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>", filename: "x.png")
      expect(json["error"]).to include("Formato não suportado")
      upload("\xFF\xD8\xFF".b + ("a" * QuestionImage::MAX_BYTES))
      expect(json["error"]).to include("512 KB")
    end

    it "só quem enviou, admins ou quem já recebeu a pergunta podem ver a imagem" do
      upload(png)
      key = json.dig("image", "key")
      api_post "/submissions", valid.merge(image_key: key)
      question = Question.find(json.dig("submission", "id"))

      get "/question_images/#{key}"
      expect(response).to have_http_status(:ok)
      expect(response.media_type).to eq("image/png")

      sign_in(player)
      get "/question_images/#{key}"
      expect(response).to have_http_status(:not_found)
      QuestionExposure.record!(player, question, "play")
      get "/question_images/#{key}"
      expect(response).to have_http_status(:ok)
    end

    it "não deixa usar a imagem enviada por outra pessoa" do
      upload(png, user: player)
      key = json.dig("image", "key")
      submit(valid.merge(image_key: key))
      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  describe "dificuldade dinâmica" do
    let(:q) { Question.published.first.tap { |x| x.update_columns(initial_difficulty: "easy", difficulty: "easy") } }

    def answers(correct:, wrong:, timeouts: 0)
      correct.times { q.record_answer!(correct: true, timed_out: false) }
      wrong.times { q.record_answer!(correct: false, timed_out: false) }
      timeouts.times { q.record_answer!(correct: false, timed_out: true) }
    end

    it "não reclassifica com menos de 50 respostas válidas" do
      answers(correct: 0, wrong: 49)
      expect(q.reload.difficulty).to eq("easy")
    end

    it "reclassifica pelas faixas (>= 70% fácil, 40–70% médio, < 40% difícil)" do
      answers(correct: 15, wrong: 35)
      expect(q.reload.difficulty).to eq("hard")
      answers(correct: 25, wrong: 0) # 40/75 = 53%
      expect(q.reload.difficulty).to eq("medium")
      answers(correct: 60, wrong: 0) # 100/135 = 74%
      expect(q.reload.difficulty).to eq("easy")
    end

    it "timeouts ficam fora da taxa e são contados à parte" do
      answers(correct: 40, wrong: 10, timeouts: 100)
      expect(q.reload).to have_attributes(difficulty: "easy", timeouts_count: 100, answers_count: 150)
    end
  end

  describe "contribuições no perfil" do
    it "conta perguntas aprovadas do jogador" do
      submit
      admin_post "/admin/questions/#{json.dig('submission', 'id')}/approve"
      sign_in(author)
      get "/profiles/me"
      expect(json.dig("profile", "summary", "contributions")).to eq(1)
    end
  end

  describe "admin:grant" do
    it "concede acesso por e-mail ou id" do
      require "rake"
      Rails.application.load_tasks unless Rake::Task.task_defined?("admin:grant")
      user = User.create!(display_name: "Nova", email: "nova@example.com")
      expect { Rake::Task["admin:grant"].execute(Rake::TaskArguments.new([ :ref ], [ "nova@example.com" ])) }.to output(/Administrador: Nova/).to_stdout
      expect(user.reload.admin).to be(true)
    end
  end
end
