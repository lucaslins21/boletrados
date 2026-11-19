/** Identidade "Dia de jogo": cores das categorias (validadas para daltonismo) e rótulos. */
import type { CategoryId } from './categories';

export const CATEGORY_THEME: Record<CategoryId, { color: string; dark: string; label: string; short: string }> = {
  brasileiro: { color: '#22B357', dark: '#178A41', label: 'Futebol Brasileiro', short: 'Brasileiro' },
  europeu: { color: '#2F6FED', dark: '#1F52BD', label: 'Futebol Europeu', short: 'Europeu' },
  sulamericano: { color: '#FF8A1F', dark: '#D96A06', label: 'Futebol Sul-Americano', short: 'Sul-Americano' },
  selecoes: { color: '#8B5CF6', dark: '#6B3BD8', label: 'Seleções', short: 'Seleções' },
  escudos: { color: '#EF4444', dark: '#C42B2B', label: 'Escudos', short: 'Escudos' },
  estadios: { color: '#0EA5A4', dark: '#0A7F7E', label: 'Estádios', short: 'Estádios' },
};

export const CATEGORY_ORDER: CategoryId[] = ['brasileiro', 'europeu', 'sulamericano', 'selecoes', 'escudos', 'estadios'];
