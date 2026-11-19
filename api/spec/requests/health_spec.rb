require "rails_helper"

RSpec.describe "Health check", type: :request do
  it "responde 200 em /up quando a aplicação sobe sem erros" do
    get "/up"
    expect(response).to have_http_status(:ok)
  end
end

RSpec.describe "Atrás de proxy", type: :request do
  it "não responde 500 quando Client-IP e X-Forwarded-For divergem (proxy da Vercel)" do
    get "/me", headers: { "Client-IP" => "5.6.7.8", "X-Forwarded-For" => "1.2.3.4" }
    expect(response).to have_http_status(:unauthorized)
  end
end
