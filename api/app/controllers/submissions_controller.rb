# Perguntas enviadas pelo usuário logado (contribuições). Ficam pendentes até a moderação aprovar.
class SubmissionsController < ApplicationController
  include QuestionParams

  DAILY_LIMIT = 20

  before_action :authenticate!
  before_action :load_question, only: %i[show update]

  def index
    questions = current_user.authored_questions.includes(:reviews, question_categories: :category, image: []).order(created_at: :desc).limit(100)
    render json: { submissions: questions.map { |q| QuestionSerializer.full(q) } }
  end

  def show
    render json: { submission: QuestionSerializer.full(@question) }
  end

  # POST /submissions — valida, guarda como "enviada" e registra a autoria como exposição.
  def create
    if current_user.authored_questions.where(created_at: 24.hours.ago..).count >= DAILY_LIMIT
      return render_error(:too_many_requests, "Limite de #{DAILY_LIMIT} perguntas por dia. Volte amanhã!")
    end

    question = Question.new(author: current_user, status: "submitted", submitted_at: Time.current)
    Question.transaction do
      QuestionEditor.new(question, current_user).apply(question_params).save!
      QuestionExposure.record!(current_user, question, "authored")
    end
    render json: { submission: QuestionSerializer.full(question), possible_duplicates: duplicates_count(question) }, status: :created
  end

  # PATCH /submissions/:id — só enquanto enviada (antes da análise) ou devolvida para correção; reenvia.
  def update
    unless Question::AUTHOR_EDITABLE.include?(@question.status)
      return render_error(:conflict, "Esta pergunta não pode mais ser editada.")
    end

    @question.assign_attributes(status: "submitted", submitted_at: Time.current)
    QuestionEditor.new(@question, current_user).apply(question_params).save!
    render json: { submission: QuestionSerializer.full(@question.reload), possible_duplicates: duplicates_count(@question) }
  end

  private

  def load_question
    @question = current_user.authored_questions.find_by(id: params[:id]) or render_error(:not_found, "Pergunta não encontrada.")
  end

  # Só a quantidade: mostrar as parecidas exporia perguntas do banco ao autor.
  def duplicates_count(question)
    DuplicateFinder.call(prompt: question.prompt, correct_option: question.options[question.correct_index], excluding: question.id).size
  end
end
