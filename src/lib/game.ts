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
  selectedCategory: CategoryId | null;
  questionId: string | null;
  context: QuestionContext;
  deadline: number | null;
  feedback: Feedback | null;
  turnNumber: number;
  winner: PlayerIndex | null;
};

export function createGame(): Game {
  return {
    phase: 'lobby', activePlayer: 0, names: ['Você', 'Amigo (demo)'],
    trophies: [[], []], streak: 0, seenIds: [[], []],
    attempts: [0, 0], correctAnswers: [0, 0],
    selectedCategory: null, questionId: null, context: 'normal',
    deadline: null, feedback: null, turnNumber: 1, winner: null,
  };
}

export const initialGame: Game = { ...createGame(), phase: 'home' };
export const QUESTION_DURATION_MS = 15_000;

export function randomlyDrawCategory(): CategoryId {
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)].id;
}

export function chooseQuestion(game: Game, category: CategoryId, context: QuestionContext): Game {
  const available = QUESTIONS.filter(question =>
    question.categoryIds.includes(category) && !game.seenIds[game.activePlayer].includes(question.id),
  );
  if (!available.length) {
    return { ...game, phase: 'empty', selectedCategory: category, context, questionId: null, deadline: null };
  }
  const question = available[Math.floor(Math.random() * available.length)];
  const seenIds: [string[], string[]] = [game.seenIds[0].slice(), game.seenIds[1].slice()];
  // Registrar a exposição no momento em que a pergunta é exibida, mesmo que o jogador saia.
  seenIds[game.activePlayer].push(question.id);
  return {
    ...game, phase: 'question', selectedCategory: category, context,
    questionId: question.id, deadline: Date.now() + QUESTION_DURATION_MS,
    seenIds, feedback: null,
  };
}

export function getCurrentQuestion(game: Game): Question | undefined {
  return QUESTIONS.find(question => question.id === game.questionId);
}

export function answerQuestion(game: Game, selectedIndex: number | null): Game {
  if (game.phase !== 'question') return game;
  const question = getCurrentQuestion(game);
  if (!question || !game.selectedCategory || game.deadline === null) return game;
  const timedOut = Date.now() >= game.deadline;
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

export function continueAfterFeedback(game: Game): Game {
  if (game.phase !== 'feedback' || !game.feedback) return game;
  const fb = game.feedback;
  if (!fb.correct) {
    return {
      ...game, phase: 'lobby', activePlayer: game.activePlayer === 0 ? 1 : 0,
      streak: 0, turnNumber: game.turnNumber + 1, questionId: null, selectedCategory: null,
      feedback: null,
    };
  }
  if (fb.trophyWon) {
    if (game.trophies[game.activePlayer].length === 6) {
      return { ...game, phase: 'finished', winner: game.activePlayer, streak: 0, questionId: null, feedback: null };
    }
    return { ...game, phase: 'draw', streak: 0, questionId: null, feedback: null };
  }
  const nextStreak = game.streak + 1;
  return {
    ...game, streak: nextStreak, questionId: null, feedback: null,
    phase: nextStreak === 3 ? 'trophy' : 'draw',
  };
}

export function isGame(value: unknown): value is Game {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<Game>;
  return typeof data.phase === 'string' && Array.isArray(data.trophies) &&
    Array.isArray(data.seenIds) && typeof data.activePlayer === 'number';
}
