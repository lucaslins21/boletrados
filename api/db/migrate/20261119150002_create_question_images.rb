class CreateQuestionImages < ActiveRecord::Migration[8.1]
  def change
    # Imagens das perguntas guardadas no próprio Postgres: o disco do Render grátis é apagado a cada deploy.
    # Tamanho limitado (512 KB) e só JPEG/PNG/WebP. Servidas por chave aleatória e só para quem pode vê-las.
    create_table :question_images do |t|
      t.references :uploader, null: false, foreign_key: { to_table: :users }
      t.string :key, null: false, index: { unique: true }
      t.string :content_type, null: false
      t.integer :byte_size, null: false
      t.string :checksum, null: false
      t.binary :data, null: false
      t.datetime :created_at, null: false

      t.check_constraint "content_type IN ('image/jpeg', 'image/png', 'image/webp')", name: "question_images_content_type_values"
      t.check_constraint "byte_size > 0 AND byte_size <= 524288", name: "question_images_byte_size_range"
    end
  end
end
