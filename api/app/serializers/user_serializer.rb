# Dados públicos do usuário enviados ao frontend. E-mail não é exposto.
module UserSerializer
  def self.call(user)
    { id: user.id, display_name: user.display_name, avatar_url: user.avatar_url }
  end

  # O próprio usuário logado (inclui permissões).
  def self.me(user) = call(user).merge(admin: user.admin?, providers: user.providers)
end
