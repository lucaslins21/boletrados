import { CATEGORIES, QUESTIONS, type CategoryId, type Question } from '../data/questions';

export type PlayerIndex = 0 | 1;
export type Phase = 'home' | 'lobby' | 'draw' | 'question' | 'trophy' | 'feedback' | 'finished' | 'empty';
export type QuestionContext = 'normal' | 'trophy';
export type Feedback = {
  correct: boolean;
  selectedIndex: number | null;
  correctIndex: number;
  explanation: string;
  context: QuestionContext;
  categoryId: CategoryId;
  trophyWon: boolean;
  timedOut: boolean;
};

export type Game = {
  phase: Phase;
  activePlayer: PlayerIndex;
  names: [string, string];
  trophies: [CategoryId[], CategoryId[]];
  streak: number;
  seenIds: [string[], string[]];
  attempts: [number, number];
  correctAnswers: [number, number];
  /** Categoria sorteada e ainda não usada. Persistida para que recarregar a página não refaça o sorteio. */
  drawnCategory: CategoryId | null;
  selectedCategory: CategoryId | null;
  questionId: string | null;
  context: QuestionContext;
  deadline: number | null;
  feedback: Feedback | null;
  turnNumber: number;
  winner: PlayerIndex | null;
};

/** Regras configuráveis da v1 (ver docs/PRODUCT.md). */
export const RULES = {
  questionDurationMs: 15_000,
  streakForTrophy: 3,
  trophiesToWin: CATEGORIES.length,
  /** v1: acertar a pergunta decisiva mantém a posse. */
  keepPossessionAfterTrophy: true,
} as const;

export const QUESTION_DURATION_MS = RULES.questionDurationMs;

type Rng = () => number;

const CATEGORY_IDS = CATEGORIES.map(category => category.id) as CategoryId[];
const PHASES: Phase[] = ['home', 'lobby', 'draw', 'question', 'trophy', 'feedback', 'finished', 'empty'];

export function createGame(seenIds: [string[], string[]] = [[], []]): Game {
  return {
    phase: 'lobby', activePlayer: 0, names: ['Você', 'Amigo (demo)'],
    trophies: [[], []], streak: 0, seenIds: [seenIds[0].slice(), seenIds[1].slice()],
    attempts: [0, 0], correctAnswers: [0, 0], drawnCategory: null,
    selectedCategory: null, questionId: null, context: 'normal',
    deadline: null, feedback: null, turnNumber: 1, winner: null,
  };
}

export const initialGame: Game = { ...createGame(), phase: 'home' };

export function otherPlayer(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}

export function randomlyDrawCategory(rng: Rng = Math.random): CategoryId {
  return CATEGORY_IDS[Math.floor(rng() * CATEGORY_IDS.length)];
}

/** Lobby → sorteio. */
export function enterDraw(game: Game): Game {
  if (game.phase !== 'lobby') return game;
  return { ...game, phase: 'draw', drawnCategory: null };
}

/** Sorteia a categoria uma única vez por pergunta normal. Chamadas repetidas não trocam o resultado. */
export function drawCategory(game: Game, rng: Rng = Math.random): Game {
  if (game.phase !== 'draw' || game.drawnCategory) return game;
  return { ...game, drawnCategory: randomlyDrawCategory(rng) };
}

export function availableQuestions(game: Game, category: CategoryId, pool: readonly Question[] = QUESTIONS): Question[] {
  const seen = new Set(game.seenIds[game.activePlayer]);
  return pool.filter(question => question.categoryIds.includes(category) && !seen.has(question.id));
}

export function chooseQuestion(
  game: Game, category: CategoryId, context: QuestionContext,
  rng: Rng = Math.random, now: number = Date.now(),
): Game {
  const available = availableQuestions(game, category);
  if (!available.length) {
    return { ...game, phase: 'empty', selectedCategory: category, context, questionId: null, deadline: null, drawnCategory: null };
  }
  const question = available[Math.floor(rng() * available.length)];
  const seenIds: [string[], string[]] = [game.seenIds[0].slice(), game.seenIds[1].slice()];
  // Registrar a exposição no momento em que a pergunta é exibida, mesmo que o jogador saia.
  seenIds[game.activePlayer].push(question.id);
  return {
    ...game, phase: 'question', selectedCategory: category, context,
    questionId: question.id, deadline: now + RULES.questionDurationMs,
    seenIds, feedback: null, drawnCategory: null,
  };
}

/** Sorteio concluído → pergunta normal da categoria sorteada. */
export function startDrawnQuestion(game: Game, rng: Rng = Math.random, now: number = Date.now()): Game {
  if (game.phase !== 'draw' || !game.drawnCategory) return game;
  return chooseQuestion(game, game.drawnCategory, 'normal', rng, now);
}

/** Escolha do troféu → pergunta decisiva. Só aceita categorias que o jogador ainda não conquistou. */
export function startTrophyQuestion(game: Game, category: CategoryId, rng: Rng = Math.random, now: number = Date.now()): Game {
  if (game.phase !== 'trophy' || game.trophies[game.activePlayer].includes(category)) return game;
  return chooseQuestion(game, category, 'trophy', rng, now);
}

export function getCurrentQuestion(game: Game): Question | undefined {
  return QUESTIONS.find(question => question.id === game.questionId);
}

export function answerQuestion(game: Game, selectedIndex: number | null, now: number = Date.now()): Game {
  if (game.phase !== 'question') return game;
  const question = getCurrentQuestion(game);
  if (!question || !game.selectedCategory || game.deadline === null) return game;
  const timedOut = now >= game.deadline;
  const chosen = timedOut ? null : selectedIndex;
  const correct = chosen !== null && chosen === question.correctIndex;
  const attempts: [number, number] = [...game.attempts];
  const correctAnswers: [number, number] = [...game.correctAnswers];
  attempts[game.activePlayer] += 1;
  if (correct) correctAnswers[game.activePlayer] += 1;
  const trophyWon = correct && game.context === 'trophy';
  const trophies: [CategoryId[], CategoryId[]] = [game.trophies[0].slice(), game.trophies[1].slice()];
  if (trophyWon && !trophies[game.activePlayer].includes(game.selectedCategory)) {
    trophies[game.activePlayer].push(game.selectedCategory);
  }
  return {
    ...game, phase: 'feedback', deadline: null, attempts, correctAnswers, trophies,
    feedback: {
      correct, selectedIndex: chosen, correctIndex: question.correctIndex,
      explanation: question.explanation, categoryId: game.selectedCategory,
      context: game.context, trophyWon, timedOut,
    },
  };
}

function passTurn(game: Game): Game {
  return {
    ...game, phase: 'lobby', activePlayer: otherPlayer(game.activePlayer),
    streak: 0, turnNumber: game.turnNumber + 1, questionId: null, selectedCategory: null,
    feedback: null, drawnCategory: null,
  };
}

/** Indica se, ao continuar, a partida termina (útil para textos de feedback). */
export function isWinningFeedback(game: Game): boolean {
  return !!game.feedback?.trophyWon && game.trophies[game.activePlayer].length >= RULES.trophiesToWin;
}

export function continueAfterFeedback(game: Game): Game {
  if (game.phase !== 'feedback' || !game.feedback) return game;
  const fb = game.feedback;
  if (!fb.correct) return passTurn(game);
  if (fb.trophyWon) {
    if (isWinningFeedback(game)) {
      return { ...game, phase: 'finished', winner: game.activePlayer, streak: 0, questionId: null, feedback: null, drawnCategory: null };
    }
    if (!RULES.keepPossessionAfterTrophy) return passTurn(game);
    return { ...game, phase: 'draw', streak: 0, questionId: null, feedback: null, drawnCategory: null };
  }
  const nextStreak = game.streak + 1;
  return {
    ...game, streak: nextStreak, questionId: null, feedback: null, drawnCategory: null,
    phase: nextStreak >= RULES.streakForTrophy ? 'trophy' : 'draw',
  };
}

/** Sem perguntas inéditas: volta ao sorteio (normal) ou à escolha do troféu, sem perder a vez. */
export function recoverFromEmpty(game: Game): Game {
  if (game.phase !== 'empty') return game;
  return { ...game, phase: game.context === 'trophy' ? 'trophy' : 'draw', selectedCategory: null, deadline: null, drawnCategory: null };
}

const isPair = (value: unknown, check: (item: unknown) => boolean) =>
  Array.isArray(value) && value.length === 2 && value.every(check);
const isStringArray = (value: unknown) => Array.isArray(value) && value.every(item => typeof item === 'string');
const isCategoryArray = (value: unknown) => Array.isArray(value) && value.every(item => CATEGORY_IDS.includes(item as CategoryId));

/**
 * Valida um jogo salvo no navegador e completa campos adicionados depois da v0.1.
 * Retorna null se o formato for irrecuperável ou inconsistente.
 */
export function restoreGame(value: unknown): Game | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const valid =
    PHASES.includes(data.phase as Phase) &&
    (data.activePlayer === 0 || data.activePlayer === 1) &&
    isPair(data.names, item => typeof item === 'string') &&
    isPair(data.trophies, isCategoryArray) &&
    isPair(data.seenIds, isStringArray) &&
    isPair(data.attempts, item => typeof item === 'number') &&
    isPair(data.correctAnswers, item => typeof item === 'number') &&
    typeof data.streak === 'number' && typeof data.turnNumber === 'number';
  if (!valid) return null;
  const game = { ...createGame(), ...data, drawnCategory: (data.drawnCategory ?? null) } as Game;
  if (game.drawnCategory !== null && !CATEGORY_IDS.includes(game.drawnCategory)) game.drawnCategory = null;
  // Uma pergunta em andamento que não existe mais no banco travaria a tela.
  if (game.phase === 'question' && (!getCurrentQuestion(game) || game.deadline === null)) return null;
  if (game.phase === 'feedback' && !game.feedback) return null;
  return game;
}

export function isGame(value: unknown): value is Game {
  return restoreGame(value) !== null;
}
