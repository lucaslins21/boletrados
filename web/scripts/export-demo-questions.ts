/**
 * Exporta as categorias e as perguntas DEMONSTRATIVAS para o seed da API.
 * Uso: npm run export:questions  (gera api/db/seeds/demo_questions.json)
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, QUESTIONS } from '../src/data/questions';

const target = fileURLToPath(new URL('../../api/db/seeds/demo_questions.json', import.meta.url));
const data = {
  _aviso: 'Gerado por web/scripts/export-demo-questions.ts. Conteúdo demonstrativo: validar fatos e fontes antes de produção.',
  categories: CATEGORIES.map((c, i) => ({ slug: c.id, label: c.label, short_label: c.short, color: c.color, icon: c.icon, position: i + 1 })),
  questions: QUESTIONS.map(q => ({
    external_ref: q.id, categories: q.categoryIds, prompt: q.prompt, options: q.options,
    correct_index: q.correctIndex, explanation: q.explanation,
  })),
};
writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
console.log(`${data.questions.length} perguntas e ${data.categories.length} categorias -> ${target}`);
