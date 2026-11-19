# Escolhe perguntas inéditas para um usuário e registra a exposição na mesma transação.
# A unicidade (user_id, question_id) no banco é a garantia final contra repetição, inclusive
# com duas partidas do mesmo usuário pedindo pergunta ao mesmo tempo.
class QuestionPicker
  MAX_ATTEMPTS = 3

  def initialize(user, rng: Random.new)
    @user = user
    @rng = rng
  end

  def available(category_slug)
    Question.published.in_category(category_slug).unseen_by(@user)
  end

  # Categorias que ainda têm ao menos uma pergunta inédita para o usuário (elegíveis no sorteio).
  def eligible_categories
    Category.ordered.pluck(:slug).select { |slug| available(slug).exists? }
  end

  # Retorna a pergunta exposta ou nil se a categoria não tiver inéditas.
  def pick!(category_slug, source: "play", match_id: nil, now: Time.current)
    MAX_ATTEMPTS.times do
      ids = available(category_slug).order(:id).pluck(:id)
      return nil if ids.empty?

      question_id = ids[@rng.rand(ids.size)]
      begin
        QuestionExposure.transaction(requires_new: true) do
          QuestionExposure.create!(user: @user, question_id: question_id, source: source, match_id: match_id, shown_at: now, created_at: now)
        end
        return Question.find(question_id)
      rescue ActiveRecord::RecordNotUnique
        next # outra requisição expôs a mesma pergunta; tenta de novo com a lista atualizada
      end
    end
    nil
  end
end
