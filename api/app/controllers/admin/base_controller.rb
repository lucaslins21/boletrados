module Admin
  class BaseController < ApplicationController
    before_action :authenticate!
    before_action :require_admin!

    private

    # 404 (e não 403) para não revelar a existência do painel.
    def require_admin!
      head :not_found unless current_user&.admin?
    end

    def curation = @curation ||= Curation.new(current_user)
  end
end
