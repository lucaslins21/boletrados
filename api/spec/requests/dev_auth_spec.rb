require "rails_helper"

RSpec.describe "Login de desenvolvimento", type: :request do
  it "entra só com um nome e reaproveita o mesmo usuário" do
    api_post "/auth/dev", { display_name: "Alice" }
    expect(response).to have_http_status(:ok)
    expect { api_post "/auth/dev", { display_name: "Alice" } }.not_to change(User, :count)
    get "/me"
    expect(json.dig("user", "display_name")).to eq("Alice")
  end

  it "não reaproveita contas reais (com identidade Google) de mesmo nome" do
    google_user = User.create!(display_name: "Alice")
    google_user.identities.create!(provider: "google", uid: "x")
    expect { api_post "/auth/dev", { display_name: "Alice" } }.to change(User, :count).by(1)
  end

  it "a rota não é declarada fora de development/test" do
    expect(Rails.root.join("config/routes.rb").read).to include('post "dev", to: "dev#create" if Rails.env.local?')
  end
end
