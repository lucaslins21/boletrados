require "rails_helper"

RSpec.describe Question do
  # find_or_create: o banco de teste pode ter sido semeado (db:prepare roda os seeds ao criar o banco).
  let(:category) do
    Category.find_or_create_by!(slug: "europeu") do |c|
      c.assign_attributes(label: "Futebol Europeu", short_label: "Europeu", color: "#83a7ff", icon: "🇪🇺", position: 2)
    end
  end

  def build_question(**attrs)
    described_class.new(prompt: "P?", options: %w[A B C D], correct_index: 0, explanation: "E", **attrs).tap do |q|
      q.question_categories.build(category: category)
    end
  end

  it "é válida com quatro alternativas e uma categoria" do
    expect(build_question).to be_valid
  end

  it "exige exatamente quatro alternativas preenchidas" do
    expect(build_question(options: %w[A B C])).not_to be_valid
    expect(build_question(options: [ "A", "B", "C", "" ])).not_to be_valid
  end

  it "exige ao menos uma categoria" do
    question = described_class.new(prompt: "P?", options: %w[A B C D], correct_index: 0, explanation: "E")
    expect(question).not_to be_valid
    expect(question.errors[:categories]).to be_present
  end

  it "o banco rejeita alternativa correta fora de 0..3" do
    question = build_question.tap(&:save!)
    expect { question.update_column(:correct_index, 4) }.to raise_error(ActiveRecord::StatementInvalid, /questions_correct_index_range/)
  end

  it "o banco rejeita número de alternativas diferente de quatro" do
    question = build_question.tap(&:save!)
    expect { question.update_column(:options, %w[A B]) }.to raise_error(ActiveRecord::StatementInvalid, /questions_four_options/)
  end
end
