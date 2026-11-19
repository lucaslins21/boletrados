# Dados públicos do usuário enviados ao frontend. E-mail não é exposto.
module UserSerializer
  def self.call(user)
    { id: user.id, display_name: user.display_name, avatar_url: user.avatar_url }
  end
end
