Rails.application.routes.draw do
  # 200 se a aplicação sobe sem erros (load balancers / monitoramento).
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :auth do
    post "google", to: "google#create"
    # Login de desenvolvimento: a rota só existe em development/test.
    post "dev", to: "dev#create" if Rails.env.local?
  end
  resource :session, only: :destroy
  get "me", to: "me#show"

  resources :matches, only: %i[index show create destroy] do
    member do
      post :draw, to: "match_actions#draw"
      post :question, to: "match_actions#question"
      post :answer, to: "match_actions#answer"
      post :resign, to: "match_actions#resign"
    end
  end
  get "push/public_key", to: "push_subscriptions#public_key"
  post "push/subscriptions", to: "push_subscriptions#create"
  delete "push/subscriptions", to: "push_subscriptions#destroy"

  resources :invites, only: :show, param: :key do
    post :accept, on: :member
  end
end
