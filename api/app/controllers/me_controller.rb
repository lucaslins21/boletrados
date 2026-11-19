# GET /me — usuário logado (ou 401).
class MeController < ApplicationController
  before_action :authenticate!

  def show
    render json: { user: UserSerializer.call(current_user) }
  end
end
