# A Copa de 2026 já aconteceu: corrige perguntas já importadas que falavam dela no futuro.
# (O content:import só adiciona perguntas novas; o texto do perguntas.yml foi corrigido junto.)
class FixWorldCup2026Tense < ActiveRecord::Migration[8.1]
  CHANGES = [
    [ "cur-et-014", "explanation", "O Azteca, na Cidade do México, viu Pelé em 1970 e Maradona em 1986, e também foi sede da Copa de 2026." ],
    [ "cur2-se-036", "prompt", "Quantas seleções disputaram a Copa do Mundo de 2026, a primeira nesse formato?" ],
    [ "cur2-se-036", "explanation", "A Copa de 2026, nos Estados Unidos, Canadá e México, foi a primeira com 48 seleções." ],
    [ "cur2-et-039", "prompt", "Qual estádio recebeu o jogo de abertura da Copa de 2026, sua terceira abertura de Copa?" ],
    [ "cur2-et-039", "explanation", "O Azteca também abriu as Copas de 1970 e 1986." ]
  ].freeze

  def up
    CHANGES.each do |ref, column, text|
      execute("UPDATE questions SET #{column} = #{quote(text)}, updated_at = NOW() WHERE external_ref = #{quote(ref)}")
    end
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
