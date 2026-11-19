import { describe, expect, it } from 'vitest';
import { CATEGORIES, QUESTIONS, type CategoryId } from '../data/questions';
import {
  RULES, answerQuestion, availableQuestions, chooseQuestion, continueAfterFeedback, createGame,
  drawCategory, drawableCategories, enterDraw, exhaustedCategories, getCurrentQuestion, hasMatchInProgress,
  leaveToHome, recoverFromEmpty, restoreGame, resumeGame, startDrawnQuestion, startTrophyQuestion, type Game,
} from './game';

const idsOf = (category: CategoryId) => QUESTIONS.filter(q => q.categoryIds.includes(category)).map(q => q.id);

const NOW = 1_000_000;
const first = () => 0; // rng determinístico: sempre o primeiro item

function inDraw(game: Game = createGame()): Game {
  return enterDraw(game);
}

/** Exibe uma pergunta normal da categoria e responde (certo ou errado) dentro do prazo. */
function playNormal(game: Game, category: CategoryId, correct: boolean): Game {
  const drawn = { ...game, phase: 'draw' as const, drawnCategory: category };
  const asked = startDrawnQuestion(drawn, first, NOW);
  expect(asked.phase).toBe('question');
  const q = getCurrentQuestion(asked)!;
  const answer = correct ? q.correctIndex : (q.correctIndex + 1) % 4;
  return answerQuestion(asked, answer, NOW + 1_000);
}

function playTrophy(game: Game, category: CategoryId, correct: boolean): Game {
  const asked = startTrophyQuestion(game, category, first, NOW);
  expect(asked.phase).toBe('question');
  const q = getCurrentQuestion(asked)!;
  return answerQuestion(asked, correct ? q.correctIndex : (q.correctIndex + 1) % 4, NOW + 1_000);
}

/** Três acertos normais seguidos → fase de escolha de troféu. */
function reachTrophyChoice(game: Game): Game {
  let g = game;
  for (let i = 0; i < RULES.streakForTrophy; i++) {
    g = continueAfterFeedback(playNormal(g, 'brasileiro', true));
  }
  return g;
}

describe('sorteio', () => {
  it('só sorteia na fase de sorteio e não refaz o sorteio', () => {
    expect(drawCategory(createGame(), first).drawnCategory).toBeNull();
    const drawn = drawCategory(inDraw(), () => 0.99);
    expect(drawn.drawnCategory).toBe(CATEGORIES[CATEGORIES.length - 1].id);
    expect(drawCategory(drawn, first).drawnCategory).toBe(drawn.drawnCategory);
  });

  it('cobre as seis categorias', () => {
    const ids = new Set(CATEGORIES.map((_, i) => drawCategory(inDraw(), () => i / CATEGORIES.length).drawnCategory));
    expect(ids.size).toBe(6);
  });

  it('não inicia pergunta sem categoria sorteada', () => {
    const g = inDraw();
    expect(startDrawnQuestion(g, first, NOW)).toBe(g);
  });

  it('limpa a categoria sorteada ao exibir a pergunta', () => {
    const asked = startDrawnQuestion(drawCategory(inDraw(), first), first, NOW);
    expect(asked.phase).toBe('question');
    expect(asked.drawnCategory).toBeNull();
  });
});

describe('categoria esgotada', () => {
  it('re-sorteia automaticamente: categorias sem inéditas nunca saem', () => {
    const game: Game = { ...inDraw(), seenIds: [idsOf('escudos'), []] };
    expect(exhaustedCategories(game)).toEqual(['escudos']);
    const drawn = CATEGORIES.map((_, i) => drawCategory(game, () => i / CATEGORIES.length).drawnCategory);
    expect(drawn).not.toContain('escudos');
    expect(new Set(drawn).size).toBe(5);
  });

  it('o esgotamento é por jogador', () => {
    const game: Game = { ...inDraw(), activePlayer: 1, seenIds: [idsOf('escudos'), []] };
    expect(drawableCategories(game)).toHaveLength(6);
  });

  it('sem nenhuma inédita, vai para "empty" e não volta ao sorteio', () => {
    const game: Game = { ...inDraw(), seenIds: [QUESTIONS.map(q => q.id), []] };
    const empty = drawCategory(game, first);
    expect(empty).toMatchObject({ phase: 'empty', context: 'normal', selectedCategory: null });
    expect(recoverFromEmpty(empty)).toBe(empty);
  });
});

describe('sair da partida', () => {
  it('sair com pergunta aberta conta como tempo esgotado e passa a vez ao continuar', () => {
    const asked = chooseQuestion({ ...inDraw(), streak: 2 }, 'europeu', 'normal', first, NOW);
    const home = leaveToHome(asked);
    expect(home.phase).toBe('home');
    expect(hasMatchInProgress(home)).toBe(true);
    const resumed = resumeGame(home);
    expect(resumed.phase).toBe('feedback');
    expect(resumed.feedback).toMatchObject({ correct: false, timedOut: true, selectedIndex: null });
    expect(continueAfterFeedback(resumed)).toMatchObject({ phase: 'lobby', activePlayer: 1, streak: 0 });
  });

  it('sair em outras fases apenas pausa a partida', () => {
    const drawn = drawCategory(inDraw(), first);
    const resumed = resumeGame(leaveToHome(drawn));
    expect(resumed).toMatchObject({ phase: 'draw', drawnCategory: drawn.drawnCategory, resumePhase: null });
  });

  it('partida encerrada não pode ser continuada', () => {
    const home = leaveToHome({ ...createGame(), phase: 'finished', winner: 0 });
    expect(hasMatchInProgress(home)).toBe(false);
    expect(resumeGame(home)).toBe(home);
  });
});

describe('perguntas e exposição', () => {
  it('registra a pergunta como vista para o jogador ativo ao exibi-la', () => {
    const asked = chooseQuestion(inDraw(), 'europeu', 'normal', first, NOW);
    expect(asked.seenIds[0]).toEqual([asked.questionId]);
    expect(asked.seenIds[1]).toEqual([]);
    expect(asked.deadline).toBe(NOW + 15_000);
  });

  it('nunca repete uma pergunta para o mesmo jogador, inclusive vista em outra categoria', () => {
    const multi = QUESTIONS.find(q => q.categoryIds.includes('selecoes') && q.categoryIds.includes('sulamericano'))!;
    const game: Game = { ...inDraw(), seenIds: [[multi.id], []] };
    expect(availableQuestions(game, 'sulamericano').map(q => q.id)).not.toContain(multi.id);
    expect(availableQuestions(game, 'selecoes').map(q => q.id)).not.toContain(multi.id);
  });

  it('o histórico de um jogador não afeta o outro', () => {
    const all = QUESTIONS.filter(q => q.categoryIds.includes('estadios')).map(q => q.id);
    const game: Game = { ...inDraw(), activePlayer: 1, seenIds: [all, []] };
    expect(availableQuestions(game, 'estadios')).toHaveLength(all.length);
  });

  it('vai para "empty" quando acabam as inéditas e volta sem perder a vez', () => {
    const all = QUESTIONS.filter(q => q.categoryIds.includes('escudos')).map(q => q.id);
    const game: Game = { ...inDraw(), seenIds: [all, []], drawnCategory: 'escudos', streak: 2 };
    const empty = startDrawnQuestion(game, first, NOW);
    expect(empty.phase).toBe('empty');
    const back = recoverFromEmpty(empty);
    expect(back).toMatchObject({ phase: 'draw', activePlayer: 0, streak: 2, drawnCategory: null });
  });

  it('em pergunta de troféu sem inéditas, volta para a escolha de troféu', () => {
    const all = QUESTIONS.filter(q => q.categoryIds.includes('escudos')).map(q => q.id);
    const game: Game = { ...createGame(), phase: 'trophy', streak: 3, seenIds: [all, []] };
    expect(recoverFromEmpty(startTrophyQuestion(game, 'escudos', first, NOW)).phase).toBe('trophy');
  });
});

describe('cronômetro', () => {
  it('aceita resposta antes do prazo', () => {
    const asked = chooseQuestion(inDraw(), 'europeu', 'normal', first, NOW);
    const q = getCurrentQuestion(asked)!;
    const fb = answerQuestion(asked, q.correctIndex, NOW + 14_999).feedback!;
    expect(fb).toMatchObject({ correct: true, timedOut: false });
  });

  it('trata resposta no prazo ou depois dele como tempo esgotado, mesmo se correta', () => {
    const asked = chooseQuestion(inDraw(), 'europeu', 'normal', first, NOW);
    const q = getCurrentQuestion(asked)!;
    const fb = answerQuestion(asked, q.correctIndex, NOW + 15_000).feedback!;
    expect(fb).toMatchObject({ correct: false, timedOut: true, selectedIndex: null });
  });

  it('ignora uma segunda resposta para a mesma pergunta', () => {
    const asked = chooseQuestion(inDraw(), 'europeu', 'normal', first, NOW);
    const answered = answerQuestion(asked, 0, NOW + 1);
    expect(answerQuestion(answered, 1, NOW + 2)).toBe(answered);
  });
});

describe('posse, sequência e troféus', () => {
  it('acerto normal soma sequência e mantém a posse', () => {
    const g = continueAfterFeedback(playNormal(inDraw(), 'brasileiro', true));
    expect(g).toMatchObject({ phase: 'draw', streak: 1, activePlayer: 0, turnNumber: 1 });
  });

  it('erro zera a sequência e passa a vez', () => {
    let g = continueAfterFeedback(playNormal(inDraw(), 'brasileiro', true));
    g = continueAfterFeedback(playNormal(g, 'europeu', false));
    expect(g).toMatchObject({ phase: 'lobby', streak: 0, activePlayer: 1, turnNumber: 2 });
  });

  it('três acertos seguidos liberam a escolha de troféu', () => {
    expect(reachTrophyChoice(inDraw())).toMatchObject({ phase: 'trophy', streak: 3 });
  });

  it('não permite disputar um troféu já conquistado', () => {
    const g: Game = { ...reachTrophyChoice(inDraw()), trophies: [['europeu'], []] };
    expect(startTrophyQuestion(g, 'europeu', first, NOW)).toBe(g);
  });

  it('acerto decisivo concede o troféu, zera a sequência e mantém a vez', () => {
    const fb = playTrophy(reachTrophyChoice(inDraw()), 'estadios', true);
    expect(fb.trophies[0]).toEqual(['estadios']);
    expect(fb.feedback!.trophyWon).toBe(true);
    expect(continueAfterFeedback(fb)).toMatchObject({ phase: 'draw', streak: 0, activePlayer: 0 });
  });

  it('erro decisivo não concede troféu e passa a vez', () => {
    const fb = playTrophy(reachTrophyChoice(inDraw()), 'estadios', false);
    expect(fb.trophies[0]).toEqual([]);
    expect(continueAfterFeedback(fb)).toMatchObject({ phase: 'lobby', streak: 0, activePlayer: 1 });
  });

  it('categorias conquistadas continuam no sorteio normal', () => {
    const g: Game = { ...inDraw(), trophies: [['brasileiro'], []] };
    const asked = startDrawnQuestion({ ...g, drawnCategory: 'brasileiro' }, first, NOW);
    expect(asked).toMatchObject({ phase: 'question', context: 'normal', selectedCategory: 'brasileiro' });
  });

  it('cada jogador tem sua própria coleção', () => {
    const g: Game = { ...reachTrophyChoice({ ...inDraw(), activePlayer: 1 }), trophies: [['estadios'], []] };
    const fb = playTrophy(g, 'estadios', true);
    expect(fb.trophies).toEqual([['estadios'], ['estadios']]);
  });

  it('o sexto troféu encerra a partida', () => {
    const five = CATEGORIES.slice(0, 5).map(c => c.id);
    const last = CATEGORIES[5].id;
    const g: Game = { ...reachTrophyChoice(inDraw()), trophies: [five, []] };
    const end = continueAfterFeedback(playTrophy(g, last, true));
    expect(end).toMatchObject({ phase: 'finished', winner: 0 });
    expect(end.trophies[0]).toHaveLength(6);
  });
});

describe('restoreGame', () => {
  it('aceita um jogo válido e migra o campo drawnCategory ausente (v0.1)', () => {
    const { drawnCategory: _omit, ...legacy } = createGame();
    const restored = restoreGame(JSON.parse(JSON.stringify(legacy)));
    expect(restored).not.toBeNull();
    expect(restored!.drawnCategory).toBeNull();
  });

  it('rejeita dados corrompidos', () => {
    expect(restoreGame(null)).toBeNull();
    expect(restoreGame({ phase: 'lobby' })).toBeNull();
    expect(restoreGame({ ...createGame(), phase: 'qualquer' })).toBeNull();
    expect(restoreGame({ ...createGame(), trophies: [['inexistente'], []] })).toBeNull();
  });

  it('rejeita pergunta em andamento que não existe mais no banco', () => {
    expect(restoreGame({ ...createGame(), phase: 'question', questionId: 'removida', selectedCategory: 'europeu', deadline: NOW })).toBeNull();
  });
});
