class InvitesController < ApplicationController
  include Idempotent

  before_action :authenticate!, only: :accept
  around_action :with_idempotency, only: :accept
  rate_limit to: 20, within: 1.minute, by: -> { client_ip }, with: -> { render_error(:too_many_requests, "Muitas tentativas. Aguarde um minuto.") }
  rescue_from MatchError, with: ->(e) { render_error(e.status, e.message) }

  # GET /invites/:key — prévia pública do convite (código BOLA-XXXXXX ou token do link).
  def show
    match = Match.find_invite(params[:key])
    return render_error(:not_found, "Convite não encontrado.") unless match

    render json: { invite: { from: UserSerializer.call(match.created_by), status: invite_status(match), expires_at: match.invite_expires_at } }
  end

  # POST /invites/:key/accept
  def accept
    match = InviteService.accept!(params[:key], current_user)
    render json: { match: MatchSerializer.call(match.reload, viewer: current_user) }, status: :created
  end

  private

  def invite_status(match)
    return "expired" if match.status == "waiting_opponent" && match.invite_expired?

    { "waiting_opponent" => "open", "cancelled" => "cancelled" }.fetch(match.status, "accepted")
  end
end
