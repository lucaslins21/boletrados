# Seeds idempotentes: podem rodar várias vezes (bin/rails db:seed).
data = JSON.parse(Rails.root.join("db/seeds/demo_questions.json").read)

data.fetch("categories").each do |attrs|
  Category.find_or_initialize_by(slug: attrs.fetch("slug")).update!(attrs.slice("label", "short_label", "color", "icon", "position"))
end

# Perguntas demonstrativas: fora de produção, ou em produção com SEED_DEMO_QUESTIONS=1 (fase de testes,
# enquanto não houver perguntas curadas). Elas precisam de curadoria antes de um lançamento público.
if !Rails.env.production? || ENV["SEED_DEMO_QUESTIONS"] == "1"
  categories = Category.all.index_by(&:slug)
  data.fetch("questions").each do |attrs|
    Question.transaction do
      question = Question.find_or_initialize_by(external_ref: attrs.fetch("external_ref"))
      question.assign_attributes(attrs.slice("prompt", "options", "correct_index", "explanation").merge("status" => "published"))
      question.published_at ||= Time.current
      wanted = attrs.fetch("categories").map { |slug| categories.fetch(slug) }
      question.question_categories.reject { |qc| wanted.include?(qc.category) }.each(&:mark_for_destruction)
      (wanted - question.question_categories.map(&:category)).each { |category| question.question_categories.build(category: category) }
      question.save!
    end
  end
  puts "Seeds: #{Category.count} categorias, #{Question.published.count} perguntas publicadas (demo)." unless Rails.env.test?
end
