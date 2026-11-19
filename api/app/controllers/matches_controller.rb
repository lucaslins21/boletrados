class MatchesController < ApplicationController
  include Idempotent

  before_action :authenticate!
  before_action :load_match, only: %i[show destroy]
  around_action :with_idempotency, only: :create
  rescue_from MatchError, with: ->(e) { render_error(e.status, e.message) }

  # GET /matches — partidas do usuário (aguardando, em andamento, encerradas).
  def index
    matches = Match.involving(current_user).where.not(status: "cancelled")
                   .includes(match_players: :user).order(updated_at: :desc).limit(50)
    matches.each { |m| MatchPlay.settle(m) }
    render json: { matches: matches.map { |m| MatchSerializer.call(m, viewer: current_user).except(:question, :last_result) } }
  end

  # POST /matches — cria um convite. O token do link só é devolvido aqui.
  def create
    match, token = InviteService.create!(current_user)
    render json: { match: MatchSerializer.call(match, viewer: current_user), invite_token: token }, status: :created
  end

  def show
    @match = MatchPlay.settle(@match)
    render json: { match: MatchSerializer.call(@match, viewer: current_user) }
  end

  # DELETE /matches/:id — cancela um convite ainda não aceito.
  def destroy
    InviteService.cancel!(@match, current_user)
    head :no_content
  end

  private

  def load_match
    @match = Match.involving(current_user).find_by(id: params[:id]) or render_error(:not_found, "Partida não encontrada.")
  end
end
