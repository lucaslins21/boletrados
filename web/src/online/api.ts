/** Cliente da API do Boletrados (api/). Sessão por cookie httpOnly: todas as chamadas usam credentials: 'include'. */
import type { CategoryId } from '../game/categories';

const BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export type Seat = 0 | 1;
export type ApiUser = { id: number; display_name: string; avatar_url: string | null; admin?: boolean };
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
export type CategoryStat = { category: CategoryId; answered: number; correct: number; trophies: number };
export type HeadToHead = {
  played: number; wins: number; losses: number; in_progress: number;
  recent: { match_id: number; status: MatchStatus; won: boolean | null; finished_reason: FinishedReason | null; finished_at: string | null; started_at: string | null }[];
};
export type Profile = {
  user: ApiUser; is_me: boolean;
  summary: { played: number; wins: number; losses: number; in_progress: number; trophies: number; contributions: number };
  categories: CategoryStat[];
  head_to_head: HeadToHead | null;
  rivals: { user: ApiUser; played: number; wins: number; losses: number }[] | null;
};
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'submitted' | 'in_review' | 'changes_requested' | 'rejected' | 'published' | 'archived';
/** Pergunta completa (com a resposta): só para o autor ou para administradores. */
export type QuestionFull = {
  id: number; status: QuestionStatus; status_label: string;
  prompt: string; options: string[]; correct_index: number; categories: CategoryId[];
  initial_difficulty: Difficulty; difficulty: Difficulty; source_url: string | null; explanation: string;
  image: { key: string; path: string } | null;
  submitted_at: string | null; published_at: string | null; updated_at: string;
  editable: boolean; feedback: string | null;
  // só para administradores:
  author?: ApiUser | null; external_ref?: string | null;
  stats?: { answers: number; correct: number; timeouts: number };
  reviews?: { decision: string; notes: string | null; reviewer: string; at: string }[];
  versions_count?: number;
};
export type QuestionInput = {
  prompt: string; options: string[]; correct_index: number; categories: CategoryId[];
  initial_difficulty: Difficulty; source_url: string; explanation: string; image_key: string | null;
};
export type QuestionPreview = {
  id: number; status: QuestionStatus; status_label: string; categories: CategoryId[]; prompt_preview: string;
  has_image: boolean; difficulty: Difficulty; author: string | null; submitted_at: string | null; published_at: string | null;
};
export type DuplicateCandidate = { id: number; status: QuestionStatus; prompt: string; correct_option: string; score: number; same_answer: boolean; same_numbers: boolean };
export type AdminQuestion = { question: QuestionFull; duplicates: DuplicateCandidate[] };
export type AdminAction = 'approve' | 'reject' | 'request_changes' | 'archive' | 'restore';

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
  facebookLogin: (accessToken: string) => request<{ user: ApiUser }>('POST', '/auth/facebook', { access_token: accessToken }),
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

  profile: (id: 'me' | number | string) => request<{ profile: Profile }>('GET', `/profiles/${id}`),

  submissions: () => request<{ submissions: QuestionFull[] }>('GET', '/submissions'),
  submission: (id: number | string) => request<{ submission: QuestionFull }>('GET', `/submissions/${id}`),
  createSubmission: (input: QuestionInput) => request<{ submission: QuestionFull; possible_duplicates: number }>('POST', '/submissions', input, { idempotent: true }),
  updateSubmission: (id: number, input: QuestionInput) => request<{ submission: QuestionFull; possible_duplicates: number }>('PATCH', `/submissions/${id}`, input),
  uploadImage,

  adminQuestions: (params: { status: string; category?: string }) =>
    request<{ questions: QuestionPreview[]; counts: Partial<Record<QuestionStatus, number>>; published_by_category: Partial<Record<CategoryId, number>> }>(
      'GET', `/admin/questions?${new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][])}`),
  adminQuestion: (id: number | string) => request<AdminQuestion>('GET', `/admin/questions/${id}`),
  adminCreate: (input: QuestionInput & { publish: boolean }) => request<AdminQuestion>('POST', '/admin/questions', input, { idempotent: true }),
  adminUpdate: (id: number, input: QuestionInput) => request<AdminQuestion>('PATCH', `/admin/questions/${id}`, input),
  adminAction: (id: number, action: AdminAction, notes?: string) => request<AdminQuestion>('POST', `/admin/questions/${id}/${action}`, notes ? { notes } : {}),

  pushPublicKey: () => request<{ public_key: string }>('GET', '/push/public_key'),
  savePushSubscription: (subscription: PushSubscriptionJSON) => request<null>('POST', '/push/subscriptions', subscription),
  deletePushSubscription: (endpoint: string) => request<null>('DELETE', '/push/subscriptions', { endpoint }),
};

/** URL absoluta de um recurso da API (ex.: imagem de pergunta "/question_images/…"), respeitando o proxy /api. */
export const apiUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${BASE}${path}`);

async function uploadImage(file: Blob, filename = 'imagem.jpg') {
  const form = new FormData();
  form.append('file', file, filename);
  let response: Response;
  try {
    response = await fetch(`${BASE}/question_images`, { method: 'POST', body: form, credentials: 'include', headers: { Accept: 'application/json' } });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor.');
  }
  const data = await response.json().catch(() => null) as { image?: { key: string; path: string }; error?: string } | null;
  if (!response.ok || !data?.image) throw new ApiError(response.status, data?.error ?? `Erro ${response.status}`, data);
  return data.image;
}

/** Link de convite para compartilhar (o token só é conhecido logo após criar o convite). */
export const inviteUrl = (token: string) => `${window.location.origin}/convite/${token}`;
