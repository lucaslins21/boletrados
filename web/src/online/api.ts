/** Cliente da API do Boletrados (api/). Sessão por cookie httpOnly: todas as chamadas usam credentials: 'include'. */
import type { CategoryId } from '../data/questions';

const BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export type Seat = 0 | 1;
export type ApiUser = { id: number; display_name: string; avatar_url: string | null };
export type MatchPlayer = { seat: Seat; user: ApiUser; trophies: CategoryId[]; attempts: number; correct_answers: number };
export type TurnPhase = 'lobby' | 'draw' | 'question' | 'trophy' | 'empty' | 'finished';
export type MatchTurn = {
  active_seat: Seat; my_turn: boolean; phase: TurnPhase; streak: number; number: number;
  deadline_at: string; drawn_category: CategoryId | null;
};
export type OpenQuestion = {
  id: number; prompt: string; options: string[]; image_url: string | null;
  category: CategoryId; context: 'normal' | 'trophy'; deadline_at: string;
};
export type QuestionResult = {
  match_question_id: number; category: CategoryId; context: 'normal' | 'trophy';
  correct: boolean; timed_out: boolean; trophy_won: boolean;
  selected_index: number | null; selected_option: string | null; correct_index: number; correct_option: string; explanation: string;
};
export type MatchStatus = 'waiting_opponent' | 'active' | 'finished' | 'cancelled';
export type FinishedReason = 'six_trophies' | 'walkover' | 'resigned';
export type ApiMatch = {
  id: number; status: MatchStatus; my_seat: Seat | null; created_by_me: boolean;
  invite: { code: string; expires_at: string } | null;
  players: MatchPlayer[]; turn: MatchTurn | null; question: OpenQuestion | null; last_result: QuestionResult | null;
  winner_seat: Seat | null; finished_reason: FinishedReason | null;
  started_at: string | null; finished_at: string | null; server_time: string;
};
export type InvitePreview = { from: ApiUser; status: 'open' | 'expired' | 'cancelled' | 'accepted'; expires_at: string };

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

type Options = { idempotent?: boolean };

async function request<T>(method: string, path: string, body?: unknown, { idempotent = false }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  // Ações que alteram a partida levam Idempotency-Key: uma nova tentativa após falha de rede não repete a ação.
  if (idempotent) headers['Idempotency-Key'] = crypto.randomUUID();
  const send = () => fetch(`${BASE}${path}`, {
    method, headers, credentials: 'include', body: body === undefined ? undefined : JSON.stringify(body),
  });
  let response: Response;
  try {
    response = await send();
  } catch {
    if (!idempotent) throw new ApiError(0, 'Sem conexão com o servidor.');
    try { response = await send(); } catch { throw new ApiError(0, 'Sem conexão com o servidor.'); }
  }
  const text = await response.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* resposta não-JSON */ }
  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error ?? `Erro ${response.status}`;
    throw new ApiError(response.status, message, data);
  }
  return data as T;
}

type MatchResponse = { match: ApiMatch };

export const api = {
  me: () => request<{ user: ApiUser }>('GET', '/me'),
  devLogin: (displayName: string) => request<{ user: ApiUser }>('POST', '/auth/dev', { display_name: displayName }),
  googleLogin: (credential: string) => request<{ user: ApiUser }>('POST', '/auth/google', { credential }),
  logout: () => request<null>('DELETE', '/session'),

  matches: () => request<{ matches: ApiMatch[] }>('GET', '/matches'),
  match: (id: number | string) => request<MatchResponse>('GET', `/matches/${id}`),
  createInvite: () => request<MatchResponse & { invite_token: string }>('POST', '/matches', {}, { idempotent: true }),
  cancelInvite: (id: number) => request<null>('DELETE', `/matches/${id}`),
  invite: (key: string) => request<{ invite: InvitePreview }>('GET', `/invites/${encodeURIComponent(key)}`),
  acceptInvite: (key: string) => request<MatchResponse>('POST', `/invites/${encodeURIComponent(key)}/accept`, {}, { idempotent: true }),

  draw: (id: number) => request<MatchResponse>('POST', `/matches/${id}/draw`, {}, { idempotent: true }),
  openQuestion: (id: number, body: { context: 'normal' } | { context: 'trophy'; category: CategoryId }) =>
    request<MatchResponse>('POST', `/matches/${id}/question`, body, { idempotent: true }),
  answer: (id: number, selectedIndex: number) =>
    request<MatchResponse & { result: QuestionResult }>('POST', `/matches/${id}/answer`, { selected_index: selectedIndex }, { idempotent: true }),
  resign: (id: number) => request<MatchResponse>('POST', `/matches/${id}/resign`, {}, { idempotent: true }),
};

/** Link de convite para compartilhar (o token só é conhecido logo após criar o convite). */
export const inviteUrl = (token: string) => `${window.location.origin}/convite/${token}`;
