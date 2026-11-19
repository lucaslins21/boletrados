Rails.application.routes.draw do
  # 200 se a aplicação sobe sem erros (load balancers / monitoramento).
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :auth do
    post "google", to: "google#create"
  end
  resource :session, only: :destroy
  get "me", to: "me#show"
end
