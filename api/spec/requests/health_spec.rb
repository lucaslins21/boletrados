require "rails_helper"

RSpec.describe "Health check", type: :request do
  it "responde 200 em /up quando a aplicação sobe sem erros" do
    get "/up"
    expect(response).to have_http_status(:ok)
  end
end
