require "rails_helper"

# Espelha os testes de "perguntas e exposição" de web/src/lib/game.test.ts, agora com o banco como garantia.
RSpec.describe QuestionPicker do
  before { Rails.application.load_seed }

  let(:user) { User.create!(display_name: "Jogadora") }
  let(:friend) { User.create!(display_name: "Amigo") }
  let(:now) { Time.utc(2026, 11, 19, 12) }

  def ids_in(slug) = Question.published.in_category(slug).order(:id).pluck(:id)

  it "registra a exposição ao escolher a pergunta" do
    question = described_class.new(user).pick!("europeu", now: now)
    expect(question.categories.map(&:slug)).to include("europeu")
    expect(user.question_exposures.sole).to have_attributes(question_id: question.id, source: "play", shown_at: now)
  end

  it "nunca repete uma pergunta para o mesmo jogador até esgotar a categoria" do
    picker = described_class.new(user)
    picked = ids_in("estadios").size.times.map { picker.pick!("estadios").id }
    expect(picked).to match_array(ids_in("estadios"))
    expect(picker.pick!("estadios")).to be_nil
  end

  it "pergunta vista em uma categoria não reaparece em outra" do
    multi = Question.joins(:categories).where(categories: { slug: %w[selecoes sulamericano] })
                    .group(:id).having("COUNT(*) = 2").first
    QuestionExposure.create!(user: user, question: multi, source: "play", shown_at: now, created_at: now)
    picker = described_class.new(user)
    expect(picker.available("selecoes")).not_to include(multi)
    expect(picker.available("sulamericano")).not_to include(multi)
  end

  it "perguntas escritas ou revisadas pelo usuário também contam como vistas" do
    reviewed = Question.find(ids_in("escudos").first)
    QuestionExposure.create!(user: user, question: reviewed, source: "reviewed", shown_at: now, created_at: now)
    expect(described_class.new(user).available("escudos")).not_to include(reviewed)
  end

  it "o histórico de um jogador não afeta o outro" do
    picker = described_class.new(user)
    ids_in("estadios").size.times { picker.pick!("estadios") }
    expect(described_class.new(friend).available("estadios").count).to eq(ids_in("estadios").size)
  end

  it "categorias elegíveis excluem as esgotadas para o jogador" do
    picker = described_class.new(user)
    ids_in("escudos").size.times { picker.pick!("escudos") }
    expect(picker.eligible_categories).to eq(%w[brasileiro europeu sulamericano selecoes estadios])
  end

  it "só oferece perguntas publicadas" do
    Question.where(id: ids_in("europeu")).update_all(status: "draft")
    expect(described_class.new(user).pick!("europeu")).to be_nil
  end

  it "o banco impede exposição duplicada mesmo burlando a aplicação" do
    question = Question.published.first
    QuestionExposure.create!(user: user, question: question, source: "play", shown_at: now, created_at: now)
    expect {
      QuestionExposure.create!(user: user, question: question, source: "play", shown_at: now, created_at: now)
    }.to raise_error(ActiveRecord::RecordNotUnique)
  end

  it "tenta outra pergunta se uma corrida já expôs a escolhida" do
    first_choice, second_choice = ids_in("europeu").first(2)
    picker = described_class.new(user, rng: Class.new { def rand(_n) = 0 }.new)
    # Simula outra requisição gravando a exposição entre a leitura e a escrita.
    allow(picker).to receive(:available).and_wrap_original do |original, slug|
      relation = original.call(slug)
      unless @raced
        @raced = true
        QuestionExposure.create!(user: user, question_id: first_choice, source: "play", shown_at: now, created_at: now)
        next Question.where(id: [ first_choice, second_choice ])
      end
      relation
    end
    expect(picker.pick!("europeu").id).to eq(second_choice)
  end
end
