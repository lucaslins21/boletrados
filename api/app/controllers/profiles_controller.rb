# GET /profiles/me e GET /profiles/:id
# Visibilidade (decisão de produto): o próprio jogador e quem já o enfrentou. Para os demais, 404.
class ProfilesController < ApplicationController
  before_action :authenticate!

  def show
    user = params[:id] == "me" ? current_user : User.find_by(id: params[:id])
    return render_error(:not_found, "Jogador não encontrado.") unless user && visible?(user)

    stats = ProfileStats.new(user)
    me = user.id == current_user.id
    render json: {
      profile: {
        user: UserSerializer.call(user), is_me: me,
        summary: stats.summary, categories: stats.categories,
        # Confronto sempre do ponto de vista de quem está vendo.
        head_to_head: me ? nil : ProfileStats.new(current_user).head_to_head(user),
        rivals: me ? stats.rivals : nil
      }
    }
  end

  private

  def visible?(user)
    return true if user.id == current_user.id

    Match.involving(current_user).where(id: MatchPlayer.where(user: user).select(:match_id))
         .where(status: %w[active finished]).exists?
  end
end
