require "rails_helper"

RSpec.describe "Avisos (Web Push e e-mail)", type: :request do
  let(:alice) { User.create!(display_name: "Alice", email: "alice@example.com") }
  let(:bob) { User.create!(display_name: "Bob") }
  let(:vapid) { WebPush.generate_key }
  let(:subscription_params) { { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "p256", auth: "auth" } } }

  around do |example|
    original = Rails.configuration.x.vapid
    Rails.configuration.x.vapid = { public_key: vapid.public_key, private_key: vapid.private_key, subject: "mailto:t@example.com" }
    example.run
  ensure
    Rails.configuration.x.vapid = original
  end

  describe "inscrições" do
    it "expõe a chave pública VAPID" do
      get "/push/public_key"
      expect(json["public_key"]).to eq(vapid.public_key)
    end

    it "responde 404 quando os avisos não estão configurados" do
      Rails.configuration.x.vapid = { public_key: nil, private_key: nil }
      get "/push/public_key"
      expect(response).to have_http_status(:not_found)
    end

    it "salva a inscrição do navegador do usuário logado" do
      sign_in(alice)
      api_post "/push/subscriptions", subscription_params
      expect(response).to have_http_status(:no_content)
      expect(alice.push_subscriptions.sole).to have_attributes(endpoint: "https://fcm.googleapis.com/fcm/send/abc", p256dh: "p256")
    end

    it "o mesmo navegador passa para a conta que está logada" do
      sign_in(alice)
      api_post "/push/subscriptions", subscription_params
      sign_in(bob)
      api_post "/push/subscriptions", subscription_params
      expect(PushSubscription.sole.user).to eq(bob)
    end

    it "só aceita endpoints https de serviços de push conhecidos (evita SSRF)" do
      sign_in(alice)
      [
        "http://fcm.googleapis.com/fcm/send/x",          # não é https
        "https://10.0.0.5/admin",                        # rede interna
        "https://evil.example.com/fcm.googleapis.com",   # host errado
        "https://fcm.googleapis.com.evil.com/x",         # sufixo enganoso
        "https://user@fcm.googleapis.com/x",             # credenciais na URL
        "https://fcm.googleapis.com:8443/x"              # porta diferente
      ].each do |endpoint|
        api_post "/push/subscriptions", subscription_params.merge(endpoint: endpoint)
        expect(response).to have_http_status(:unprocessable_content), endpoint
      end
      %w[https://fcm.googleapis.com/fcm/send/ok https://updates.push.services.mozilla.com/wpush/v2/ok
         https://web.push.apple.com/ok https://wns2-by3p.notify.windows.com/w/?token=ok].each do |endpoint|
        api_post "/push/subscriptions", subscription_params.merge(endpoint: endpoint)
        expect(response).to have_http_status(:no_content), endpoint
      end
    end

    it "exige login e remove a inscrição ao desativar" do
      api_post "/push/subscriptions", subscription_params
      expect(response).to have_http_status(:unauthorized)

      sign_in(alice)
      api_post "/push/subscriptions", subscription_params
      delete "/push/subscriptions", params: { endpoint: subscription_params[:endpoint] }, headers: { "Origin" => AuthHelper::ORIGIN }, as: :json
      expect(PushSubscription.count).to eq(0)
    end
  end

  describe WebPushSender do
    before { alice.push_subscriptions.create!(endpoint: "https://fcm.googleapis.com/fcm/send/1", p256dh: "a", auth: "b") }

    it "envia o aviso com título, texto e link" do
      allow(WebPush).to receive(:payload_send)
      expect(described_class.deliver(alice, title: "T", body: "B", url: "http://x/partidas/1", tag: "t")).to eq(1)
      expect(WebPush).to have_received(:payload_send).with(hash_including(endpoint: "https://fcm.googleapis.com/fcm/send/1", message: include('"title":"T"')))
    end

    it "remove inscrições expiradas" do
      response = instance_double(Net::HTTPGone, body: "", code: "410")
      allow(WebPush).to receive(:payload_send).and_raise(WebPush::ExpiredSubscription.new(response, "push.example.com"))
      expect(described_class.deliver(alice, title: "T", body: "B", url: "u", tag: "t")).to eq(0)
      expect(alice.push_subscriptions.count).to eq(0)
    end

    it "não envia nada sem chaves VAPID" do
      Rails.configuration.x.vapid = { public_key: nil, private_key: nil }
      allow(WebPush).to receive(:payload_send)
      expect(described_class.deliver(alice, title: "T", body: "B", url: "u", tag: "t")).to eq(0)
      expect(WebPush).not_to have_received(:payload_send)
    end
  end

  describe "gatilhos na partida" do
    before { Rails.application.load_seed }

    def start_match
      sign_in(alice)
      api_post "/matches"
      code = json.dig("match", "invite", "code")
      sign_in(bob)
      api_post "/invites/#{code}/accept"
      Match.last
    end

    it "convite aceito avisa quem convidou e agenda o lembrete para 4 h antes do prazo" do
      freeze_time do
        expect { start_match }
          .to have_enqueued_job(MatchNotificationJob).with("invite_accepted", anything, alice.id)
          .and have_enqueued_job(TurnReminderJob).at(20.hours.from_now)
      end
    end

    it "errar avisa o adversário de que a vez é dele" do
      match = start_match
      sign_in(alice)
      api_post "/matches/#{match.id}/draw"
      api_post "/matches/#{match.id}/question", { context: "normal" }
      q = match.reload.match_questions.last.question
      expect { api_post "/matches/#{match.id}/answer", { selected_index: (q.correct_index + 1) % 4 } }
        .to have_enqueued_job(MatchNotificationJob).with("your_turn", match.id, bob.id)
    end

    it "acertar não avisa ninguém (a vez continua)" do
      match = start_match
      sign_in(alice)
      api_post "/matches/#{match.id}/draw"
      api_post "/matches/#{match.id}/question", { context: "normal" }
      q = match.reload.match_questions.last.question
      expect { api_post "/matches/#{match.id}/answer", { selected_index: q.correct_index } }.not_to have_enqueued_job(MatchNotificationJob)
    end

    it "desistência avisa só o adversário" do
      match = start_match
      expect { api_post "/matches/#{match.id}/resign" } # Bob desiste
        .to have_enqueued_job(MatchNotificationJob).with("match_finished", match.id, alice.id).exactly(:once)
    end

    it "o lembrete só sai se a vez ainda não começou, com push e e-mail" do
      match = start_match
      allow(WebPushSender).to receive(:deliver).and_return(1)
      expect { TurnReminderJob.perform_now(match.id, 1) }.to have_enqueued_mail(TurnMailer, :reminder)
      expect(WebPushSender).to have_received(:deliver).with(alice, hash_including(title: "Faltam 4 h para sua vez expirar"))

      sign_in(alice)
      api_post "/matches/#{match.id}/draw" # Alice começou a vez
      expect { TurnReminderJob.perform_now(match.id, 1) }.not_to have_enqueued_mail(TurnMailer, :reminder)
    end

    it "o lembrete não sai se a vez já é outra" do
      match = start_match
      expect { TurnReminderJob.perform_now(match.id, 2) }.not_to have_enqueued_mail(TurnMailer, :reminder)
    end

    it "o e-mail de lembrete traz o adversário e o link da partida" do
      match = start_match
      mail = TurnMailer.reminder(alice, match)
      expect(mail.to).to eq([ "alice@example.com" ])
      expect(mail.subject).to include("Bob")
      expect(mail.text_part.body.to_s).to include("http://localhost:5173/partidas/#{match.id}")
    end
  end
end
