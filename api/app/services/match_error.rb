# Erro de regra de negócio da partida/convite, com o status HTTP a devolver.
class MatchError < StandardError
  attr_reader :status

  def initialize(message, status: :unprocessable_content)
    super(message)
    @status = status
  end
end
