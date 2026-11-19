# Ações do jogador da vez. Todas travam a partida e aceitam Idempotency-Key.
class MatchActionsController < ApplicationController
  include Idempotent

  before_action :authenticate!
  before_action :load_match
  around_action :with_idempotency
  rescue_from MatchError, with: ->(e) { render_error(e.status, e.message) }

  # POST /matches/:id/draw
  def draw
    play { |p| p.draw!(current_user) }
    render_match
  end

  # POST /matches/:id/question { context: "normal" } ou { context: "trophy", category: "estadios" }
  def question
    context = params[:context] == "trophy" ? :trophy : :normal
    outcome = play { |p| p.open_question!(current_user, context: context, category: params[:category].presence) }
    return render_match(:created) unless outcome == :no_question

    render json: { error: "Não há mais perguntas inéditas nessa categoria para você.", match: serialized }, status: :conflict
  end

  # POST /matches/:id/answer { selected_index: 0..3 }
  def answer
    index = Integer(params.require(:selected_index).to_s, exception: false)
    result = play { |p| p.answer!(current_user, index) }
    render json: { result: MatchSerializer.result(result.match_question.reload), match: serialized }
  end

  # POST /matches/:id/resign
  def resign
    play { |p| p.resign!(current_user) }
    render_match
  end

  private

  def load_match
    @match = Match.involving(current_user).find_by(id: params[:id]) or render_error(:not_found, "Partida não encontrada.")
  end

  def play(&block)
    MatchPlay.settle(@match) # prazos vencidos são aplicados e gravados antes da ação, mesmo que ela falhe
    MatchPlay.locked(@match.id, &block).tap { @match.reload }
  end

  def serialized = MatchSerializer.call(@match, viewer: current_user)
  def render_match(status = :ok) = render(json: { match: serialized }, status: status)
end
