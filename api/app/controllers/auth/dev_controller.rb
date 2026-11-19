module Auth
  # POST /auth/dev { display_name } — login sem Google, SÓ em development/test (a rota não existe em produção).
  # Permite testar um X1 real localmente com dois navegadores antes de configurar o GOOGLE_CLIENT_ID.
  class DevController < ApplicationController
    before_action { head :not_found unless Rails.env.local? }

    def create
      name = params.require(:display_name).to_s.strip.first(60)
      return render_error(:unprocessable_content, "Informe um nome.") if name.blank?

      user = User.where.missing(:identities).find_or_create_by!(display_name: name)
      end_session if current_session
      start_session_for(user)
      render json: { user: UserSerializer.call(user) }
    end
  end
end
