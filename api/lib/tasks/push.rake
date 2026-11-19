namespace :push do
  desc "Gera um par de chaves VAPID para o Web Push (defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY)"
  task :vapid_keys do
    require "web-push"
    key = WebPush.generate_key
    puts "VAPID_PUBLIC_KEY=#{key.public_key}"
    puts "VAPID_PRIVATE_KEY=#{key.private_key}"
    puts "# A chave privada é segredo: nunca versione. A pública pode ir para o frontend."
  end
end
