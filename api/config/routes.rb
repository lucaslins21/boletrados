Rails.application.routes.draw do
  # 200 se a aplicação sobe sem erros (load balancers / monitoramento).
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :auth do
    post "google", to: "google#create"
    post "facebook", to: "facebook#create"
    # Login de desenvolvimento: a rota só existe em development/test.
    post "dev", to: "dev#create" if Rails.env.local?
  end
  resource :session, only: :destroy
  get "me", to: "me#show"
  post "identities/:provider", to: "identities#create", constraints: { provider: /google|facebook/ }
  delete "identities/:provider", to: "identities#destroy", constraints: { provider: /google|facebook/ }
  resources :profiles, only: :show

  # Curadoria: envio de perguntas pelos usuários e moderação pelos administradores.
  resources :submissions, only: %i[index show create update]
  resources :question_images, only: %i[create show], param: :key
  namespace :admin do
    resources :questions, only: %i[index show create update] do
      member do
        post :approve
        post :reject
        post :request_changes
        post :archive
        post :restore
      end
    end
  end

  resources :matches, only: %i[index show create destroy] do
    member do
      post :draw, to: "match_actions#draw"
      post :question, to: "match_actions#question"
      post :answer, to: "match_actions#answer"
      post :resign, to: "match_actions#resign"
    end
  end
  post "internal/tick", to: "internal/ticks#create"

  get "push/public_key", to: "push_subscriptions#public_key"
  post "push/subscriptions", to: "push_subscriptions#create"
  delete "push/subscriptions", to: "push_subscriptions#destroy"

  resources :invites, only: :show, param: :key do
    post :accept, on: :member
  end
end
