module Admin
  # Painel de moderação: fila de perguntas, revisão, cadastro direto e manutenção do banco publicado.
  class QuestionsController < BaseController
    include QuestionParams

    before_action :load_question, except: %i[index create]

    # GET /admin/questions?status=submitted&category=escudos
    def index
      scope = Question.includes(:author, question_categories: :category)
      status = params[:status].presence || "submitted"
      scope = status == "queue" ? scope.where(status: %w[submitted in_review]) : scope.where(status: status)
      scope = scope.in_category(params[:category]) if params[:category].present?
      order = %w[submitted in_review changes_requested queue].include?(status) ? { submitted_at: :asc } : { updated_at: :desc }
      render json: {
        questions: scope.order(order).limit(200).map { |q| QuestionSerializer.preview(q) },
        counts: Question.group(:status).count,
        # Estoque publicado por categoria (uma pergunta conta em cada categoria dela).
        published_by_category: QuestionCategory.joins(:question, :category).where(questions: { status: "published" }).group("categories.slug").count
      }
    end

    # GET /admin/questions/:id — abrir conta como exposição do revisor (nunca a receberá no jogo).
    def show
      curation.open(@question)
      render json: question_payload(@question.reload)
    end

    # POST /admin/questions { ..., publish: true } — cadastro direto pelo admin.
    def create
      question = curation.create(question_params, publish: ActiveModel::Type::Boolean.new.cast(params.fetch(:publish, true)))
      render json: question_payload(question.reload), status: :created
    end

    def update
      curation.edit(@question, question_params)
      render json: question_payload(@question.reload)
    end

    def approve = act { curation.approve(@question) }
    def reject = act { curation.reject(@question, params[:notes]) }
    def request_changes = act { curation.request_changes(@question, params[:notes]) }
    def archive = act { curation.archive(@question, params[:notes]) }
    def restore = act { curation.restore(@question) }

    private

    def act
      yield
      render json: question_payload(@question.reload)
    end

    def load_question
      @question = Question.includes(:author, :image, reviews: :reviewer, question_categories: :category).find_by(id: params[:id])
      render_error(:not_found, "Pergunta não encontrada.") unless @question
    end

    def question_payload(question)
      { question: QuestionSerializer.full(question, admin: true),
        duplicates: curation.duplicates(question).map { |d| QuestionSerializer.duplicate(d) } }
    end
  end
end
