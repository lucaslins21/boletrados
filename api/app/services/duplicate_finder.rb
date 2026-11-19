# Possíveis duplicatas para a curadoria. Similaridade de texto sozinha falha nos dois sentidos:
# "Copa de 2014" parece com "Copa de 2010" (não é duplicata) e uma reformulação pode ter pouco texto em comum.
# Por isso combinamos: similaridade do enunciado (pg_trgm) + mesma resposta correta + mesmos números (anos, placares).
module DuplicateFinder
  SAME_ANSWER_BONUS = 0.35
  SAME_NUMBERS_BONUS = 0.25
  MIN_SCORE = 0.6

  module_function

  def call(prompt:, correct_option:, excluding: nil, limit: 5)
    prompt = prompt.to_s
    answer = normalize(correct_option)
    by_text = Question.where("similarity(prompt, ?) >= 0.25", prompt)
    by_answer = Question.where("lower(trim(options[correct_index + 1])) = ?", answer)
    candidates = Question.where(id: by_text.select(:id)).or(Question.where(id: by_answer.select(:id)))
                         .where.not(status: "rejected").where.not(id: excluding)
                         .select("questions.*", Question.sanitize_sql([ "similarity(prompt, ?) AS text_similarity", prompt ]))
                         .limit(40)

    numbers = numbers_in(prompt)
    candidates.filter_map { |q|
      same_answer = normalize(q.options[q.correct_index]) == answer
      same_numbers = numbers.any? && numbers_in(q.prompt) == numbers
      score = q.text_similarity.to_f + (same_answer ? SAME_ANSWER_BONUS : 0) + (same_numbers ? SAME_NUMBERS_BONUS : 0)
      next if score < MIN_SCORE

      { question: q, score: score.round(2), same_answer: same_answer, same_numbers: same_numbers }
    }.sort_by { |c| -c[:score] }.first(limit)
  end

  def normalize(text) = text.to_s.strip.downcase
  def numbers_in(text) = text.to_s.scan(/\d+/).to_set
end
