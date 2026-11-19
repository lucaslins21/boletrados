/** As seis categorias do jogo (mesmos slugs da API). Cores e ícones ficam em theme.ts e art.tsx. */
export const CATEGORIES = [
  { id: 'brasileiro', label: 'Futebol Brasileiro', short: 'Brasileiro', description: 'Brasileirão, copas, estaduais e rivalidades' },
  { id: 'europeu', label: 'Futebol Europeu', short: 'Europeu', description: 'Ligas, clubes e competições da UEFA' },
  { id: 'sulamericano', label: 'Futebol Sul-Americano', short: 'Sul-Americano', description: 'Libertadores, Sul-Americana e CONMEBOL' },
  { id: 'selecoes', label: 'Seleções', short: 'Seleções', description: 'Copas, torneios continentais e seleções' },
  { id: 'escudos', label: 'Escudos', short: 'Escudos', description: 'Símbolos, histórias e identidades dos clubes' },
  { id: 'estadios', label: 'Estádios', short: 'Estádios', description: 'Arquibancadas, cidades e arenas lendárias' },
] as const;

export type CategoryId = typeof CATEGORIES[number]['id'];

export function getCategory(id: CategoryId) {
  return CATEGORIES.find(category => category.id === id)!;
}
