# DELETE /session — sair.
class SessionsController < ApplicationController
  def destroy
    end_session
    head :no_content
  end
end
