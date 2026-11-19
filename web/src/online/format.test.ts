import { describe, expect, it } from 'vitest';
import { finishedText, initials, me, opponent, opponentName, timeLeft } from './format';
import type { ApiMatch, ApiUser, MatchPlayer } from './api';
import { CATEGORIES, getCategory } from '../game/categories';

const ana: ApiUser = { id: 1, display_name: 'Ana Souza', avatar_url: null };
const bia: ApiUser = { id: 2, display_name: 'Bia', avatar_url: 'https://example.com/b.png' };
const player = (seat: 0 | 1, user: ApiUser): MatchPlayer => ({ seat, user, trophies: [], attempts: 0, correct_answers: 0 });

function match(overrides: Partial<ApiMatch> = {}): ApiMatch {
  return {
    id: 7, status: 'finished', my_seat: 0, created_by_me: true, invite: null,
    players: [player(0, ana), player(1, bia)], turn: null, question: null, last_result: null,
    winner_seat: 0, finished_reason: 'six_trophies', started_at: null, finished_at: null, server_time: '2026-11-19T12:00:00Z',
    ...overrides,
  };
}

describe('initials', () => {
  it('usa as iniciais das duas primeiras palavras', () => {
    expect(initials('Lucas Lins')).toBe('LL');
    expect(initials('ana maria souza')).toBe('AM');
  });
  it('tolera espaços extras e nome vazio', () => {
    expect(initials('  Rui  ')).toBe('R');
    expect(initials('   ')).toBe('?');
  });
});

describe('timeLeft', () => {
  const now = Date.parse('2026-11-19T12:00:00Z');
  const at = (ms: number) => new Date(now + ms).toISOString();
  it('diz "agora" quando o prazo já passou', () => expect(timeLeft(at(-1000), now)).toBe('agora'));
  it('mostra minutos, com mínimo de 1', () => {
    expect(timeLeft(at(10_000), now)).toBe('em 1 min');
    expect(timeLeft(at(12 * 60_000), now)).toBe('em 12 min');
  });
  it('mostra horas até 48 h e dias depois disso', () => {
    expect(timeLeft(at(23 * 3_600_000), now)).toBe('em 23 h');
    expect(timeLeft(at(72 * 3_600_000), now)).toBe('em 3 dias');
  });
});

describe('jogadores da partida', () => {
  it('separa você e o adversário pelo assento', () => {
    expect(me(match())?.user.id).toBe(1);
    expect(opponent(match())?.user.id).toBe(2);
    expect(opponentName(match({ my_seat: 1 }))).toBe('Ana Souza');
  });
  it('usa o texto reserva enquanto ninguém aceitou o convite', () => {
    expect(opponentName(match({ players: [player(0, ana)] }))).toBe('seu amigo');
  });
});

describe('finishedText', () => {
  it('fala com o vencedor e com o perdedor', () => {
    expect(finishedText(match(), ana)).toBe('Você conquistou os seis troféus!');
    expect(finishedText(match(), bia)).toBe('Ana Souza conquistou os seis troféus.');
  });
  it('explica W.O. e desistência', () => {
    expect(finishedText(match({ finished_reason: 'walkover' }), ana)).toMatch(/^Vitória por W\.O\./);
    expect(finishedText(match({ finished_reason: 'walkover' }), bia)).toMatch(/^Derrota por W\.O\./);
    expect(finishedText(match({ finished_reason: 'resigned', winner_seat: 1 }), ana)).toBe('Você desistiu desta partida.');
  });
});

describe('categorias', () => {
  it('são seis, com os mesmos slugs da API', () => {
    expect(CATEGORIES.map(c => c.id)).toEqual(['brasileiro', 'europeu', 'sulamericano', 'selecoes', 'escudos', 'estadios']);
    expect(getCategory('estadios').short).toBe('Estádios');
  });
});
