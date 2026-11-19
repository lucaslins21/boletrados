import type { ApiMatch, ApiUser, MatchPlayer } from './api';

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]!.toUpperCase()).join('') || '?';

export function me(match: ApiMatch): MatchPlayer | undefined {
  return match.players.find(p => p.seat === match.my_seat);
}

export function opponent(match: ApiMatch): MatchPlayer | undefined {
  return match.players.find(p => p.seat !== match.my_seat);
}

export const opponentName = (match: ApiMatch, fallback = 'seu amigo') => opponent(match)?.user.display_name ?? fallback;

/** "em 23 h", "em 12 min", "agora". */
export function timeLeft(iso: string, now = Date.now()) {
  const ms = Date.parse(iso) - now;
  if (ms <= 0) return 'agora';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `em ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `em ${hours} h` : `em ${Math.round(hours / 24)} dias`;
}

export const finishedText = (match: ApiMatch, viewer: ApiUser | null) => {
  const winner = match.players.find(p => p.seat === match.winner_seat);
  const iWon = winner && viewer && winner.user.id === viewer.id;
  switch (match.finished_reason) {
    case 'six_trophies': return iWon ? 'Você conquistou os seis troféus!' : `${winner?.user.display_name} conquistou os seis troféus.`;
    case 'walkover': return iWon ? 'Vitória por W.O.: o adversário estourou o prazo três vezes seguidas.' : 'Derrota por W.O.: três prazos de 24 h estourados seguidos.';
    case 'resigned': return iWon ? 'Vitória: o adversário desistiu.' : 'Você desistiu desta partida.';
    default: return 'Partida encerrada.';
  }
};
