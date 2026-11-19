import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, CircleHelp, Clock3, Flag, Hourglass, RotateCcw, Share2, Sparkles, Trophy, X } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { DrawBowl } from '../components/DrawBowl';
import { Banner, FeedbackCard, Modal, Pill, QuestionCard, TrophyGrid } from '../components/ui';
import { getCategory, type CategoryId } from '../data/questions';
import { ApiError, api, type ApiMatch, type MatchPlayer, type QuestionResult } from './api';
import { InviteShareModal } from './HomePage';
import { finishedText, initials, me, opponent, opponentName, timeLeft } from './format';
import { useSession } from './session';

const DRAW_ANIMATION_MS = 1450;
const REDUCED_DRAW_ANIMATION_MS = 300;
const POLL_MS = 8_000;
const SERVER_TOLERANCE_MS = 1_300; // o servidor aceita até 1 s após o prazo; esperamos um pouco mais antes de recarregar

export function MatchPage() {
  const { id = '' } = useParams();
  const reduceMotion = useReducedMotion();
  const [match, setMatch] = useState<ApiMatch | null>(null);
  const [offset, setOffset] = useState(0); // relógio do servidor − relógio do cliente
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [sharing, setSharing] = useState(false);
  const spinTimer = useRef<number | undefined>(undefined);

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
  useEffect(() => () => window.clearTimeout(spinTimer.current), []);

  // Atualiza sozinho enquanto espera o adversário, e ao voltar para a aba.
  const waiting = !!match && (match.status === 'waiting_opponent' || (match.status === 'active' && !match.turn?.my_turn));
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => { void load(); }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [waiting, load]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

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

  // Mostra o resultado da pergunta se o servidor já a encerrou (ex.: tempo esgotado).
  const showResultFor = useCallback(async (questionId: number) => {
    const next = await load();
    if (next?.last_result?.match_question_id === questionId) setResult(next.last_result);
  }, [load]);

  if (missing) return <Centered title="Partida não encontrada." text="Ela não existe ou você não participa dela."/>;
  if (!match) return error ? <Centered title="Não foi possível carregar a partida." text={error}/> : <p className="online-loading" role="status">Carregando partida…</p>;

  const mine = me(match);
  const other = opponent(match);
  const turn = match.turn;

  const draw = async () => {
    if (spinning || busy) return;
    setSpinning(true);
    const started = Date.now();
    await act(() => api.draw(match.id));
    const minimum = reduceMotion ? REDUCED_DRAW_ANIMATION_MS : DRAW_ANIMATION_MS;
    spinTimer.current = window.setTimeout(() => setSpinning(false), Math.max(0, minimum - (Date.now() - started)));
  };
  const skipSpin = () => { window.clearTimeout(spinTimer.current); setSpinning(false); };
  const answer = async (index: number) => {
    if (busy || !match.question) return;
    const questionId = match.question.id;
    const response = await act(() => api.answer(match.id, index));
    if (response) setResult(response.result);
    else void showResultFor(questionId); // provavelmente o prazo acabou no servidor
  };
  const resign = async () => { setConfirmResign(false); await act(() => api.resign(match.id)); };

  const content = (() => {
    if (result) {
      const winning = result.trophy_won && match.status === 'finished' && match.winner_seat === match.my_seat;
      return <FeedbackCard correct={result.correct} timedOut={result.timed_out} trophyWon={result.trophy_won} winning={winning}
        categoryId={result.category} selectedOption={result.selected_option}
        correctOption={result.correct_option} explanation={result.explanation} opponentName={opponentName(match)}
        onContinue={() => setResult(null)}/>;
    }
    if (match.status === 'waiting_opponent') return <WaitingInvite match={match} onShare={() => setSharing(true)} onCancel={async () => {
      setBusy(true);
      try { await api.cancelInvite(match.id); await load(); } catch (e) { setError(e instanceof ApiError ? e.message : 'Não foi possível cancelar.'); } finally { setBusy(false); }
    }} busy={busy}/>;
    if (match.status === 'cancelled') return <Centered title="Convite cancelado." text="Crie um novo desafio na tela inicial."/>;
    if (match.status === 'finished') return <Finished match={match}/>;
    if (!turn || !mine || !other) return null;
    if (!turn.my_turn) return <OpponentTurn match={match} mine={mine} other={other}/>;
    switch (turn.phase) {
      case 'question': {
        const q = match.question;
        if (!q) return null;
        return <QuestionCard questionKey={String(q.id)} prompt={q.prompt} options={q.options} image={q.image_url}
          categoryId={q.category} isTrophy={q.context === 'trophy'} progressLabel={`ACERTO ${turn.streak + 1} DE 3`}
          deadline={Date.parse(q.deadline_at) - offset} onAnswer={i => void answer(i)} disabled={busy}
          onExpire={() => { window.setTimeout(() => void showResultFor(q.id), SERVER_TOLERANCE_MS); }}/>;
      }
      case 'trophy':
        return <TrophyChoice match={match} mine={mine} busy={busy} onPick={category => void act(() => api.openQuestion(match.id, { context: 'trophy', category }))}/>;
      case 'empty':
        return <Centered title="Acabaram as inéditas." text="Você já viu todas as perguntas disponíveis. Novas perguntas entram com a curadoria; enquanto isso, você pode desistir desta partida."/>;
      default:
        return <DrawPanel match={match} spinning={spinning} busy={busy} onDraw={() => void draw()} onSkip={skipSpin}
          onProceed={() => void act(() => api.openQuestion(match.id, { context: 'normal' }))}/>;
    }
  })();

  const inQuestion = !result && match.status === 'active' && turn?.my_turn && turn.phase === 'question';
  return <>
    {(error || notice) && <div className="online-alert" role="alert">{error ?? notice}<button className="icon-button" aria-label="Fechar aviso" onClick={() => { setError(null); setNotice(null); }}><X size={16}/></button></div>}
    {content}
    {match.status === 'active' && !inQuestion && !result &&
      <p className="center-hint"><button className="text-action" onClick={() => setConfirmResign(true)}><Flag size={15}/> Desistir da partida</button></p>}
    {confirmResign && <Modal label="Desistir da partida" onClose={() => setConfirmResign(false)}>
      <Pill tone="orange">DESISTIR?</Pill><h2>Entregar a partida?</h2>
      <p>{opponentName(match)} vence imediatamente. Não dá para desfazer.</p>
      <button className="button button--primary button--full" onClick={() => void resign()}>Desistir</button>
      <button className="button button--ghost button--full" onClick={() => setConfirmResign(false)}>Continuar jogando</button>
    </Modal>}
    {sharing && match.invite && <InviteShareModal token={null} code={match.invite.code} onClose={() => setSharing(false)}/>}
  </>;
}

function Centered({ title, text }: { title: string; text: string }) {
  return <div className="feedback-shell"><main className="main-card feedback-card">
    <div className="feedback-burst feedback-burst--wrong" aria-hidden="true"><CircleHelp size={46}/></div>
    <h1 className="screen-title">{title}</h1><p className="screen-subtitle">{text}</p>
    <Link to="/" className="button button--primary button--full">Minhas partidas <ArrowRight size={17}/></Link>
  </main></div>;
}

function PlayerChip({ player, active }: { player: MatchPlayer; active: boolean }) {
  return <div className={`player-chip ${active ? 'player-chip--active' : ''}`}>
    <div className={`player-avatar player-avatar--${player.seat}`} aria-hidden="true">{initials(player.user.display_name)}</div>
    <div className="player-chip-info"><Link to={`/jogadores/${player.user.id}`} className="player-link"><strong>{player.user.display_name}</strong></Link><span>{player.trophies.length}/6 troféus</span></div>
    {active && <span className="playing-dot" title="Jogador da vez"/>}
  </div>;
}

function Scoreboard({ match }: { match: ApiMatch }) {
  const [a, b] = [0, 1].map(seat => match.players.find(p => p.seat === seat));
  if (!a || !b) return null;
  return <div className="match-scoreboard">
    <PlayerChip player={a} active={match.turn?.active_seat === 0}/>
    <div className="versus">VS<span>X1</span></div>
    <PlayerChip player={b} active={match.turn?.active_seat === 1}/>
  </div>;
}

function SideProgress({ match, mine }: { match: ApiMatch; mine: MatchPlayer }) {
  const streak = match.turn?.streak ?? 0;
  return <aside className="aside-panel"><p className="eyebrow">PLACAR</p><Scoreboard match={match}/>
    <div className="divider"/>
    <div className="streak-side"><span>Sua sequência</span><strong>{streak}/3</strong></div>
    <div className="streak-pips">{[0, 1, 2].map(i => <span key={i} className={i < streak ? 'done' : ''}/>)}</div>
    <div className="divider"/>
    <p className="hint-label">SEUS TROFÉUS · {mine.trophies.length}/6</p>
    <TrophyGrid trophies={mine.trophies}/>
  </aside>;
}

function DrawPanel({ match, spinning, busy, onDraw, onSkip, onProceed }: { match: ApiMatch; spinning: boolean; busy: boolean; onDraw: () => void; onSkip: () => void; onProceed: () => void }) {
  const turn = match.turn!;
  const category = turn.drawn_category;
  const mine = me(match)!;
  return <div className="content-layout"><main className="main-card draw-card">
    <div className="eyebrow eyebrow--green"><span className="tiny-pulse"/> SUA VEZ · POSSE {String(turn.number).padStart(2, '0')}</div>
    <h1 className="screen-title">A sorte está lançada!</h1><p className="screen-subtitle">Uma bolinha, uma categoria. O prazo da vez termina {timeLeft(turn.deadline_at)}.</p>
    <DrawBowl isSpinning={spinning} revealed={!spinning ? category : null}/>
    <div aria-live="polite" aria-atomic="true">{category && !spinning
      ? <div className="draw-picked"><span>SORTEADA</span><strong><span aria-hidden="true">{getCategory(category).icon}</span> {getCategory(category).label}</strong></div>
      : <p className="draw-helper">{spinning ? 'Misturando as bolinhas...' : 'Toque no botão para sortear uma categoria.'}</p>}</div>
    {spinning
      ? <button className="button button--ghost button--full button--lg" onClick={onSkip}>Pular animação <ArrowRight size={19}/></button>
      : <button className="button button--primary button--full button--lg" disabled={busy} onClick={category ? onProceed : onDraw}>{category ? <><ArrowRight size={19}/> Ver pergunta</> : <><Sparkles size={19}/> Sortear bolinha</>}</button>}
    <p className="center-hint"><Clock3 size={14}/> Os 15 segundos começam somente quando a pergunta aparecer.</p>
  </main><SideProgress match={match} mine={mine}/></div>;
}

function TrophyChoice({ match, mine, busy, onPick }: { match: ApiMatch; mine: MatchPlayer; busy: boolean; onPick: (category: CategoryId) => void }) {
  return <div className="content-layout"><main className="main-card trophy-select-card" aria-busy={busy}>
    <div className="trophy-header-icon"><Trophy size={33}/></div>
    <div className="eyebrow eyebrow--green">TRÊS ACERTOS CONSECUTIVOS!</div><h1 className="screen-title">Hora de buscar a taça.</h1>
    <p className="screen-subtitle">Escolha qual troféu ainda não conquistado quer disputar.</p>
    <TrophyGrid trophies={mine.trophies} interactive onSelect={category => { if (!busy) onPick(category); }}/>
    <Banner icon={<Clock3 size={17}/>}>A pergunta decisiva também tem 15 segundos. Se acertar, o troféu é seu e você continua jogando.</Banner>
  </main><SideProgress match={match} mine={mine}/></div>;
}

function OpponentTurn({ match, mine, other }: { match: ApiMatch; mine: MatchPlayer; other: MatchPlayer }) {
  return <div className="content-layout"><main className="main-card lobby-card">
    <div className="eyebrow eyebrow--green"><span className="tiny-pulse"/> PARTIDA X1</div>
    <h1 className="screen-title">Vez de {other.user.display_name}.</h1>
    <p className="screen-subtitle">A bola volta para você quando {other.user.display_name} errar. Esta tela atualiza sozinha.</p>
    <Scoreboard match={match}/>
    <div className="your-turn-card"><div className="turn-symbol"><Hourglass size={24}/></div><div><span>PRAZO DE {other.user.display_name.toUpperCase()}</span><strong>{match.turn ? timeLeft(match.turn.deadline_at) : '—'}</strong><small>Se o prazo de 24 h estourar, a vez passa para você.</small></div><span className="turn-number">POSSE {String(match.turn?.number ?? 0).padStart(2, '0')}</span></div>
    <div className="lobby-trophies"><div className="section-heading"><strong>Seus troféus</strong><Pill>{mine.trophies.length}/6</Pill></div><TrophyGrid trophies={mine.trophies}/></div>
  </main><aside className="aside-panel"><p className="eyebrow">ENQUANTO ISSO</p><h3>Vale treinar.</h3>
    <p className="screen-subtitle">A demo usa perguntas próprias e não conta para o seu histórico.</p>
    <Link to="/demo" className="text-action">Abrir a demo <ArrowRight size={15}/></Link></aside></div>;
}

function WaitingInvite({ match, onShare, onCancel, busy }: { match: ApiMatch; onShare: () => void; onCancel: () => void; busy: boolean }) {
  return <div className="feedback-shell"><main className="main-card feedback-card">
    <div className="feedback-burst feedback-burst--correct" aria-hidden="true"><Hourglass size={46}/></div>
    <Pill tone="purple">AGUARDANDO ADVERSÁRIO</Pill>
    <h1 className="screen-title">Convite enviado?</h1>
    <p className="screen-subtitle">A partida começa quando seu amigo aceitar. O convite expira {match.invite ? timeLeft(match.invite.expires_at) : 'em breve'}.</p>
    {match.invite && <div className="invite-preview"><span>CÓDIGO</span><strong>{match.invite.code}</strong></div>}
    {match.created_by_me && <>
      <button className="button button--primary button--full" onClick={onShare}><Share2 size={18}/> Compartilhar código</button>
      <button className="button button--ghost button--full" onClick={onCancel} disabled={busy}>Cancelar convite</button>
    </>}
  </main></div>;
}

function Finished({ match }: { match: ApiMatch }) {
  const { user } = useSession();
  const winner = match.players.find(p => p.seat === match.winner_seat);
  const iWon = !!winner && winner.user.id === user?.id;
  return <div className="feedback-shell"><main className="main-card finished-card">
    <div className="champion-badge" aria-hidden="true">{iWon ? '🏆' : '🥈'}</div>
    <div className="eyebrow eyebrow--green">FIM DE JOGO</div>
    <h1 className="screen-title">{iWon ? 'Você é o campeão!' : `${winner?.user.display_name ?? 'Seu adversário'} venceu.`}</h1>
    <p className="screen-subtitle">{finishedText(match, user)}</p>
    <Scoreboard match={match}/>
    {winner && <TrophyGrid trophies={winner.trophies}/>}
    <Link to="/" className="button button--primary button--full button--lg"><RotateCcw size={18}/> Nova partida</Link>
    {match.players.filter(p => p.user.id !== user?.id).map(p => <Link key={p.user.id} to={`/jogadores/${p.user.id}`} className="subtle-link">Ver confronto com {p.user.display_name} <ArrowRight size={16}/></Link>)}
  </main></div>;
}
