class AddRemindedTurnNumberToMatches < ActiveRecord::Migration[8.1]
  def change
    # Última vez (turn_number) que já recebeu lembrete: evita lembrete duplicado (job + tick).
    add_column :matches, :reminded_turn_number, :integer
  end
end
