module Internal
  # POST /internal/tick — chamado por cron (GitHub Actions / cron-job.org) com "Authorization: Bearer <TICK_TOKEN>".
  class TicksController < ApplicationController
    skip_before_action :verify_request_origin

    def create
      expected = Rails.configuration.x.tick_token.to_s
      provided = request.authorization.to_s.delete_prefix("Bearer ").strip
      unless expected.present? && ActiveSupport::SecurityUtils.secure_compare(provided, expected)
        return head :not_found # não revela a existência do endpoint
      end

      render json: MatchTick.run
    end
  end
end
