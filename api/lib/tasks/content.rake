namespace :content do
  desc "Importa as perguntas da curadoria (db/curated/perguntas.yml). Só adiciona; roda a cada deploy."
  task import: :environment do
    result = CuratedImport.call
    puts "Curadoria: #{result.created} novas, #{result.skipped} já existentes, #{result.archived_demo} demo arquivadas."
  end
end
