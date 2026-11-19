namespace :admin do
  desc "Concede acesso de administrador: bin/rails \"admin:grant[EMAIL_OU_ID]\""
  task :grant, [ :ref ] => :environment do |_t, args|
    user = find_user!(args[:ref])
    user.update!(admin: true)
    puts "Administrador: #{user.display_name} (id #{user.id})"
  end

  desc "Remove acesso de administrador: bin/rails \"admin:revoke[EMAIL_OU_ID]\""
  task :revoke, [ :ref ] => :environment do |_t, args|
    user = find_user!(args[:ref])
    user.update!(admin: false)
    puts "Acesso removido: #{user.display_name} (id #{user.id})"
  end

  desc "Lista os administradores"
  task list: :environment do
    User.where(admin: true).find_each { |u| puts "#{u.id}\t#{u.display_name}\t#{u.email}" }
  end

  def find_user!(ref)
    abort "Informe o e-mail ou o id do usuário." if ref.blank?
    user = ref.to_s.include?("@") ? User.find_by(email: ref.strip.downcase) || User.find_by(email: ref.strip) : User.find_by(id: ref)
    user || abort("Usuário não encontrado: #{ref}")
  end
end
