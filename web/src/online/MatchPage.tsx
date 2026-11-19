import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useParams } from 'react-router';
import { Modal } from '../components/ui';
import type { CategoryId } from '../game/categories';
import {
  BottomBar, DrawStage, GameFrame, InviteWait, MatchEnd, OpponentWait, QuestionStage, ResultSheet, Scoreboard,
  StageMessage, TrophyCelebration, TrophyPick, type DrawPhase,
} from '../game/MatchScreens';
import { ApiError, api, apiUrl, type ApiMatch, type OpenQuestion, type QuestionResult } from './api';
import { InviteShareModal } from './HomePage';
import { finishedText, me, opponent, opponentName, timeLeft } from './format';
import { useSession } from './session';

const DRAW_SPIN_MS = 1400;
const REDUCED_DRAW_SPIN_MS = 250;
const POLL_MS = 8_000;
const SERVER_TOLERANCE_MS = 1_300; // o servidor aceita até 1 s após o prazo; esperamos um pouco mais antes de recarregar

/** Pergunta já respondida, mantida na tela com o resultado (o servidor já avançou o estado). */
type Answered = { question: OpenQuestion; result: QuestionResult; streakAfter: number };

export function MatchPage() {
  const { id = '' } = useParams();
  const { user } = useSession();
  const reduceMotion = useReducedMotion();
  const [match, setMatch] = useState<ApiMatch | null>(null);
  const [offset, setOffset] = useState(0); // relógio do servidor − relógio do cliente
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [celebrating, setCelebrating] = useState<CategoryId | null>(null);
  const [busy, setBusy] = useState(false);
  const [drawPhase, setDrawPhase] = useState<DrawPhase>('idle');
  const [confirmResign, setConfirmResign] = useState(false);
  const [sharing, setSharing] = useState(false);
  const skipRef = useRef(false);
  const timers = useRef<number[]>([]);

  const apply = useCallback((next: ApiMatch) => {
    setMatch(next);
    setOffset(Date.parse(next.server_time) - Date.now());
  }, []);

  const load = useCallback(async () => {
    try {
      const { match: next } = await api.match(id);
      apply(next);
      return next;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setMissing(true);
      else setError(e instanceof ApiError ? e.message : 'Não foi possível carregar a partida.');
      return null;
    }
  }, [id, apply]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => timers.current.forEach(t => window.clearTimeout(t)), []);

  // Sincroniza o sorteio com o estado do servidor (ex.: recarregar a página com a categoria já sorteada).
  const drawn = match?.turn?.drawn_category ?? null;
  useEffect(() => {
    if (drawn && drawPhase === 'idle') setDrawPhase('done');
    if (!drawn && drawPhase === 'done') setDrawPhase('idle');
  }, [drawn, drawPhase]);

  // Atualiza sozinho enquanto espera o adversário, e ao voltar para a aba.
  const waiting = !!match && !answered && (match.status === 'waiting_opponent' || (match.status === 'active' && !match.turn?.my_turn));
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => { void load(); }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [waiting, load]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible' && !answered) void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load, answered]);

  async function act<T extends { match: ApiMatch }>(call: () => Promise<T>): Promise<T | null> {
    setBusy(true); setError(null); setNotice(null);
    try {
      const response = await call();
      apply(response.match);
      return response;
    } catch (e) {
      const body = e instanceof ApiError ? (e.body as { match?: ApiMatch } | undefined) : undefined;
      if (body?.match) apply(body.match);
      const message = e instanceof ApiError ? e.message : 'Algo deu errado. Tente de novo.';
      if (e instanceof ApiError && e.status === 409) { setNotice(message); if (!body?.match) void load(); }
      else setError(message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  // Mostra o resultado se o servidor já encerrou a pergunta (ex.: tempo esgotado).
  const showResultFor = useCallback(async (question: OpenQuestion) => {
    const next = await load();
    const last = next?.last_result;
    if (last?.match_question_id === question.id) setAnswered({ question, result: last, streakAfter: next?.turn?.streak ?? 0 });
  }, [load]);

  if (missing) return <GameFrame title="PARTIDA"><StageMessage title="Partida não encontrada" text="Ela não existe ou você não participa dela."/></GameFrame>;
  if (!match) return <GameFrame title="PARTIDA">{error
    ? <StageMessage title="Não foi possível carregar" text={error}/>
    : <p className="gd-loading" role="status">Carregando partida…</p>}</GameFrame>;

  const mine = me(match);
  const other = opponent(match);
  const turn = match.turn;
  const myTurn = match.status === 'active' && !!turn?.my_turn;

  const draw = async () => {
    if (busy || drawPhase !== 'idle') return;
    skipRef.current = false;
    setDrawPhase('spinning');
    const started = Date.now();
    const response = await act(() => api.draw(match.id));
    if (!response?.match.turn?.drawn_category) { setDrawPhase('idle'); return; }
    if (skipRef.current) { setDrawPhase('done'); return; }
    const minimum = reduceMotion ? REDUCED_DRAW_SPIN_MS : DRAW_SPIN_MS;
    timers.current.push(window.setTimeout(() => setDrawPhase(p => (p === 'spinning' ? 'revealing' : p)), Math.max(0, minimum - (Date.now() - started))));
  };
  const skipDraw = () => {
    skipRef.current = true;
    if (drawn) setDrawPhase('done');
  };
  const answer = async (index: number) => {
    if (busy || !match.question) return;
    const question = match.question;
    const response = await act(() => api.answer(match.id, index));
    if (response) {
      setAnswered({ question, result: response.result, streakAfter: response.match.turn?.streak ?? 0 });
      if (response.result.trophy_won) setCelebrating(response.result.category);
    } else {
      void showResultFor(question); // provavelmente o prazo acabou no servidor
    }
  };
  const continueAfterResult = () => { setAnswered(null); setDrawPhase('idle'); void load(); };
  const resign = async () => { setConfirmResign(false); await act(() => api.resign(match.id)); };

  const content = (() => {
    if (answered) {
      return <>
        <QuestionStage question={answered.question} imageUrl={answered.question.image_url ? apiUrl(answered.question.image_url) : null}
          streak={turn?.streak ?? 0} deadline={0} busy result={answered.result} onAnswer={() => undefined} onExpire={() => undefined}/>
        {!celebrating && <ResultSheet result={answered.result} opponentName={opponentName(match)} streakAfter={answered.streakAfter} onContinue={continueAfterResult}/>}
      </>;
    }
    if (match.status === 'waiting_opponent') {
      return <InviteWait code={match.invite?.code} expiresAt={match.invite?.expires_at} canManage={match.created_by_me} busy={busy}
        onShare={() => setSharing(true)} onCancel={async () => {
          setBusy(true);
          try { await api.cancelInvite(match.id); await load(); } catch (e) { setError(e instanceof ApiError ? e.message : 'Não foi possível cancelar.'); } finally { setBusy(false); }
        }}/>;
    }
    if (match.status === 'cancelled') return <StageMessage title="Convite cancelado" text="Crie um novo desafio na tela inicial."/>;
    if (match.status === 'finished') {
      const iWon = match.winner_seat === match.my_seat;
      return <MatchEnd match={match} iWon={iWon} reason={finishedText(match, user)} opponentId={other?.user.id} opponentName={opponentName(match)}/>;
    }
    if (!turn || !mine || !other) return null;
    if (!turn.my_turn) return <OpponentWait opponent={other} deadline={turn.deadline_at}/>;
    switch (turn.phase) {
      case 'question': {
        const q = match.question;
        if (!q) return null;
        return <QuestionStage question={q} imageUrl={q.image_url ? apiUrl(q.image_url) : null} streak={turn.streak}
          deadline={Date.parse(q.deadline_at) - offset} busy={busy} result={null} onAnswer={i => void answer(i)}
          onExpire={() => { timers.current.push(window.setTimeout(() => void showResultFor(q), SERVER_TOLERANCE_MS)); }}/>;
      }
      case 'trophy':
        return <div className="gd-stage"><TrophyPick trophies={mine.trophies} busy={busy}
          onPick={category => void act(() => api.openQuestion(match.id, { context: 'trophy', category }))}/></div>;
      case 'empty':
        return <StageMessage title="Acabaram as inéditas" text="Você já viu todas as perguntas disponíveis. Novas perguntas entram com a curadoria; enquanto isso, você pode desistir desta partida."
          action={<button className="gd-btn gd-btn--white gd-btn--wide gd-btn--nav" onClick={() => setConfirmResign(true)}>Desistir</button>}/>;
      default:
        return <DrawStage phase={drawPhase} category={drawn} busy={busy} onDraw={() => void draw()} onSkip={skipDraw}
          onRevealed={() => setDrawPhase('done')} onProceed={() => void act(() => api.openQuestion(match.id, { context: 'normal' }))}/>;
    }
  })();

  const title = match.status === 'waiting_opponent' ? 'CONVITE' : match.status === 'finished' ? 'FIM DE JOGO' : `POSSE ${String(turn?.number ?? 1).padStart(2, '0')}`;
  const subtitle = match.status !== 'active' || !turn ? undefined
    : myTurn ? `SUA VEZ · PRAZO ${timeLeft(turn.deadline_at).toUpperCase()}` : `VEZ DE ${opponentName(match).toUpperCase()}`;
  const streak = answered ? answered.streakAfter : turn?.streak ?? 0;

  return <>
    <GameFrame title={title} subtitle={subtitle} calm={!!answered || (myTurn && turn?.phase === 'question')}>
      {(error || notice) && <div className="gd-alert" role="alert"><span>{error ?? notice}</span>
        <button aria-label="Fechar aviso" onClick={() => { setError(null); setNotice(null); }}><X size={16}/></button></div>}
      {match.status !== 'waiting_opponent' && <Scoreboard match={match}/>}
      {content}
      {match.status === 'active' && <BottomBar streak={Math.min(streak, 3)} showStreak={myTurn || !!answered}
        onResign={!answered && turn?.phase !== 'question' ? () => setConfirmResign(true) : undefined}/>}
    </GameFrame>
    {celebrating && <TrophyCelebration category={celebrating} onContinue={() => setCelebrating(null)}/>}
    {confirmResign && <Modal label="Desistir da partida" onClose={() => setConfirmResign(false)} className="gd-modal">
      <h2>Entregar a partida?</h2>
      <p>{opponentName(match)} vence imediatamente. Não dá para desfazer.</p>
      <button className="gd-btn gd-btn--wide" style={{ background: 'var(--gd-bad)', boxShadow: '0 6px 0 var(--gd-bad-dark)' }} onClick={() => void resign()}>Desistir</button>
      <button className="gd-btn gd-btn--white gd-btn--wide gd-btn--sm" onClick={() => setConfirmResign(false)}>Continuar jogando</button>
    </Modal>}
    {sharing && match.invite && <InviteShareModal token={null} code={match.invite.code} onClose={() => setSharing(false)}/>}
  </>;
}
