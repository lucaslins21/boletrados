# Corrige as categorias de perguntas da curadoria já importadas (o content:import só adiciona perguntas novas).
# Regras (docs/PRODUCT.md §3): Futebol Brasileiro é só competição/clube nacional — Seleção Brasileira, Libertadores,
# Sul-Americana, Mundial e brasileiros no exterior saem dela; nome antigo e apelido de clube não são Escudos.
class RecategorizeCuratedQuestions < ActiveRecord::Migration[8.1]
  CHANGES = {
    "cur-br-003" => %w[sulamericano],
    "cur-br-004" => %w[sulamericano],
    "cur-br-005" => %w[sulamericano],
    "cur-br-013" => %w[sulamericano],
    "cur-br-014" => %w[sulamericano],
    "cur-br-034" => %w[sulamericano],
    "cur-es-006" => %w[brasileiro],
    "cur-es-007" => %w[brasileiro],
    "cur-es-013" => %w[brasileiro],
    "cur-es-014" => %w[brasileiro],
    "cur-es-015" => %w[brasileiro],
    "cur-es-016" => %w[brasileiro],
    "cur-es-017" => %w[brasileiro],
    "cur-et-024" => %w[estadios selecoes],
    "cur-et-029" => %w[estadios selecoes],
    "cur-et-030" => %w[estadios selecoes],
    "cur-eu-026" => %w[europeu],
    "cur-eu-041" => %w[europeu],
    "cur-sa-001" => %w[sulamericano],
    "cur-sa-002" => %w[sulamericano],
    "cur-sa-003" => %w[sulamericano],
    "cur-sa-004" => %w[sulamericano],
    "cur-sa-005" => %w[sulamericano],
    "cur-sa-006" => %w[sulamericano],
    "cur-sa-007" => %w[sulamericano],
    "cur-sa-008" => %w[sulamericano],
    "cur-sa-009" => %w[sulamericano],
    "cur-sa-010" => %w[sulamericano],
    "cur-sa-011" => %w[sulamericano],
    "cur-sa-012" => %w[sulamericano],
    "cur-sa-013" => %w[sulamericano],
    "cur-sa-014" => %w[sulamericano],
    "cur-sa-027" => %w[sulamericano],
    "cur-sa-028" => %w[sulamericano],
    "cur-sa-029" => %w[sulamericano],
    "cur-sa-035" => %w[sulamericano],
    "cur-se-006" => %w[selecoes],
    "cur-se-007" => %w[selecoes],
    "cur-se-008" => %w[selecoes],
    "cur-se-009" => %w[selecoes],
    "cur-se-022" => %w[selecoes],
    "cur-se-027" => %w[selecoes],
    "cur-se-028" => %w[selecoes],
    "cur-se-029" => %w[selecoes],
    "cur-se-030" => %w[selecoes],
    "cur-se-032" => %w[selecoes]
  }.freeze

  def up
    categories = select_rows("SELECT slug, id FROM categories").to_h
    return if categories.empty? # banco novo: o seed/import já cria com as categorias certas

    CHANGES.each do |ref, slugs|
      question_id = select_value("SELECT id FROM questions WHERE external_ref = #{quote(ref)}")
      next unless question_id

      execute("DELETE FROM question_categories WHERE question_id = #{question_id.to_i}")
      slugs.each do |slug|
        execute(<<~SQL.squish)
          INSERT INTO question_categories (question_id, category_id, created_at, updated_at)
          VALUES (#{question_id.to_i}, #{categories.fetch(slug).to_i}, NOW(), NOW())
        SQL
      end
    end
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
