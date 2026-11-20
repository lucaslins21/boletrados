/** Telas da partida na identidade "Dia de jogo". Componentes só visuais: a lógica fica em online/MatchPage. */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Clock3, Flag, Share2, Volume2, VolumeX, X } from 'lucide-react';
import { Link } from 'react-router';
import type { CategoryId } from './categories';
import { useCountdown, QUESTION_SECONDS } from '../components/ui';
import type { ApiMatch, MatchPlayer, OpenQuestion, QuestionResult } from '../online/api';
import { timeLeft } from '../online/format';
import { CategoryBadge, DrawBall, Rays, StadiumScene, Trophy } from './art';
import { CATEGORY_ORDER, CATEGORY_THEME } from './theme';
import { onSoundChange, setSoundEnabled, sfx, soundEnabled } from './sound';
import { Mascot } from './Mascot';
import './tokens.css';
import './game.css';
import { Avatar } from './Avatar';

const AVATAR_COLORS = ['#2F6FED', '#FF8A1F'];
const RING = 2 * Math.PI * 27; // circunferência do anel do cronômetro

/** Raiz da tela imersiva: cenário + coluna central. */
export function GameFrame({ title, subtitle, calm = false, children }: { title: string; subtitle?: string; calm?: boolean; children: ReactNode }) {
  // calm: durante a pergunta o estádio se apaga, para o enunciado e o cronômetro serem o foco
  return <div className={`gd ${calm ? 'gd--calm' : ''}`}><StadiumScene/>
    <div className="gd-frame">
      <header className="gd-topbar">
        <Link to="/" className="gd-icon-btn" aria-label="Voltar para minhas partidas"><ArrowLeft size={22}/></Link>
        <div><h1>{title}</h1>{subtitle && <small>{subtitle}</small>}</div>
        <SoundToggle/>
      </header>
      {children}
    </div>
  </div>;
}

/** Liga/desliga os efeitos sonoros (preferência salva no aparelho). */
export function SoundToggle() {
  const [on, setOn] = useState(soundEnabled);
  useEffect(() => onSoundChange(setOn), []);
  return <button className="gd-icon-btn" onClick={() => setSoundEnabled(!on)} aria-pressed={on} aria-label={on ? 'Desligar sons' : 'Ligar sons'} title={on ? 'Sons ligados' : 'Sons desligados'}>
    {on ? <Volume2 size={21}/> : <VolumeX size={21}/>}
  </button>;
}

function PlayerCard({ player, active, side }: { player: MatchPlayer; active: boolean; side: 'left' | 'right' }) {
  return <div className={`gd-player gd-player--${side} ${active ? 'gd-player--active' : ''}`}>
    <div className="gd-player-top">
      <Avatar user={player.user} className="gd-avatar" style={{ background: AVATAR_COLORS[side === 'left' ? 0 : 1] }}/>
      <div style={{ minWidth: 0 }}>
        <Link to={`/jogadores/${player.user.id}`} className="gd-player-name">{player.user.display_name}</Link>
        {active && <div className="gd-player-turn">NA VEZ</div>}
      </div>
    </div>
    <div className="gd-shelf" aria-label={`${player.trophies.length} de 6 troféus`}>
      {CATEGORY_ORDER.map(id => <Trophy key={id} id={id} won={player.trophies.includes(id)} size={22}/>)}
    </div>
  </div>;
}

/** Placar: você à esquerda, adversário à direita, com a coleção de troféus de cada um. */
export function Scoreboard({ match }: { match: ApiMatch }) {
  const mine = match.players.find(p => p.seat === match.my_seat);
  const other = match.players.find(p => p.seat !== match.my_seat);
  if (!mine || !other) return null;
  const active = match.status === 'active' ? match.turn?.active_seat : null;
  return <div className="gd-score">
    <PlayerCard player={mine} active={active === mine.seat} side="left"/>
    <span className="gd-vs" aria-hidden="true">VS</span>
    <PlayerCard player={other} active={active === other.seat} side="right"/>
  </div>;
}

/** Sequência de acertos (três bolinhas) e botão de desistir. */
export function BottomBar({ streak, showStreak, onResign }: { streak: number; showStreak: boolean; onResign?: () => void }) {
  return <div className="gd-bottom">
    {showStreak ? <div className="gd-streak" aria-label={`Sequência: ${streak} de 3 acertos`}>
      {[0, 1, 2].map(i => <span key={i} className={`gd-streak-ball ${i < streak ? 'gd-streak-ball--on' : ''}`}/>)}
      <span>{streak}/3</span>
    </div> : <span/>}
    <span/>
    {onResign ? <button className="gd-icon-btn gd-flag" onClick={onResign} aria-label="Desistir da partida" title="Desistir"><Flag size={20}/></button> : <span/>}
  </div>;
}

// Posições das bolinhas dentro do globo (% do diâmetro).
const BALL_SPOTS: [number, number][] = [[14, 52], [38, 60], [62, 54], [26, 30], [52, 30], [74, 34]];

export type DrawPhase = 'idle' | 'spinning' | 'revealing' | 'done';

/**
 * Sorteio: as bolinhas giram no globo; ao revelar, a bolinha da categoria sai, vem para frente,
 * abre e mostra a categoria. Chama onRevealed ao terminar a sequência.
 */
export function DrawStage({ phase, category, busy, onDraw, onSkip, onProceed, onRevealed }: {
  phase: DrawPhase; category: CategoryId | null; busy: boolean;
  onDraw: () => void; onSkip: () => void; onProceed: () => void; onRevealed: () => void;
}) {
  const reduce = useReducedMotion();
  const [opened, setOpened] = useState(phase === 'done');
  const revealedRef = useRef(onRevealed);
  revealedRef.current = onRevealed;

  useEffect(() => { if (phase === 'spinning') sfx.spin(1500); }, [phase]);
  useEffect(() => {
    if (phase === 'done') { setOpened(true); return; }
    if (phase !== 'revealing') { setOpened(false); return; }
    const open = window.setTimeout(() => { setOpened(true); sfx.reveal(); }, reduce ? 0 : 750);
    const finish = window.setTimeout(() => revealedRef.current(), reduce ? 50 : 1350);
    return () => { window.clearTimeout(open); window.clearTimeout(finish); };
  }, [phase, reduce]);

  const spinning = phase === 'spinning';
  const showWinner = (phase === 'revealing' || phase === 'done') && category;
  return <div className="gd-stage">
    <div className="gd-globe-wrap">
      <div className="gd-globe">
        <div className="gd-globe-balls">
          {CATEGORY_ORDER.map((id, i) => {
            const [x, y] = BALL_SPOTS[i];
            const away = showWinner && id === category; // a sorteada saiu do globo
            return <motion.div key={id} style={{ left: `${x - 10}%`, top: `${y - 10}%`, width: '22%' }}
              animate={spinning
                ? { x: [0, 30 - i * 9, -24 + i * 6, 12, 0], y: [0, -40 + i * 5, 20, -18 + i * 3, 0], rotate: [0, 120, -80, 200, 0] }
                : { x: 0, y: [0, -4, 0], rotate: 0 }}
              transition={spinning
                ? { duration: 0.7 + i * 0.05, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 2.4 + i * 0.2, repeat: Infinity, ease: 'easeInOut' }}>
              <DrawBall id={id} size={1000} hidden={!!away}/>
            </motion.div>;
          })}
        </div>
        <div className="gd-globe-shine"/>
      </div>
      <div className="gd-globe-base">SORTEIO</div>

      <AnimatePresence>
        {showWinner && <motion.div key="winner" className="gd-reveal"
          initial={reduce ? false : { y: 90, scale: 0.4, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 170, damping: 16 }}>
          <div style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
            <motion.div animate={opened ? { y: -6 } : { y: 0 }}><DrawBall id={category} size={92} open={opened}/></motion.div>
            <AnimatePresence>{opened && <motion.div className="gd-reveal-card" initial={reduce ? false : { y: -40, scale: 0.6, opacity: 0 }}
              animate={{ y: -34, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
              <CategoryBadge id={category} size={46}/>
              <small>CATEGORIA SORTEADA</small>
              <strong>{CATEGORY_THEME[category].label}</strong>
            </motion.div>}</AnimatePresence>
          </div>
        </motion.div>}
      </AnimatePresence>
    </div>

    <div aria-live="polite" className="sr-only">{phase === 'done' && category ? `Categoria sorteada: ${CATEGORY_THEME[category].label}` : ''}</div>
    {phase === 'idle' && <button className="gd-btn" onClick={onDraw} disabled={busy}>Sortear</button>}
    {(phase === 'spinning' || phase === 'revealing') && <button className="gd-link" onClick={onSkip}>Pular animação</button>}
    {phase === 'done' && <button className="gd-btn gd-btn--blue" onClick={onProceed} disabled={busy} autoFocus>Responder</button>}
    {phase === 'idle' && <p className="gd-hint"><Clock3 size={14} style={{ verticalAlign: '-2px' }}/> Os 15 segundos só começam quando a pergunta aparecer.</p>}
  </div>;
}

type QuestionStageProps = {
  question: OpenQuestion;
  imageUrl: string | null;
  streak: number;
  deadline: number;
  busy: boolean;
  result: QuestionResult | null;
  onAnswer: (index: number) => void;
  onExpire: () => void;
};

/** Pergunta: cabeçalho na cor da categoria, cronômetro, alternativas. Com `result`, mostra certo/errado nas alternativas. */
export function QuestionStage({ question, imageUrl, streak, deadline, busy, result, onAnswer, onExpire }: QuestionStageProps) {
  const theme = CATEGORY_THEME[question.category];
  const remaining = useCountdown(result ? null : deadline, result ? undefined : onExpire);
  const locked = !!result || busy || remaining === 0;
  const answerRef = useRef(onAnswer);
  answerRef.current = onAnswer;
  useEffect(() => {
    if (locked) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.key.length !== 1) return;
      const key = event.key.toLowerCase();
      const index = 'abcd'.includes(key) ? 'abcd'.indexOf(key) : '1234'.indexOf(key);
      if (index >= 0) { event.preventDefault(); answerRef.current(index); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked]);

  const seconds = result ? 0 : Math.ceil(remaining / 1000);
  useEffect(() => { if (!result && seconds > 0 && seconds <= 5) sfx.tick(seconds <= 3); }, [seconds, result]);
  useEffect(() => {
    if (!result || result.trophy_won) return; // a conquista de troféu tem a própria fanfarra
    if (result.correct) sfx.correct(); else sfx.wrong();
  }, [result]);
  const pct = result ? 0 : Math.max(0, Math.min(100, (remaining / (QUESTION_SECONDS * 1000)) * 100));
  const danger = !result && seconds <= 5;
  const block = (event: { preventDefault: () => void }) => event.preventDefault();
  const stateOf = (i: number) => {
    if (!result) return '';
    if (i === result.correct_index) return 'gd-option--correct';
    if (i === result.selected_index) return 'gd-option--wrong';
    return 'gd-option--dim';
  };

  return <motion.article className="gd-question" onCopy={block} onCut={block} onContextMenu={block}
    initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
    <div className="gd-q-head" style={{ background: theme.color }}>
      <CategoryBadge id={question.category} size={34}/>
      <strong title={theme.label}>{theme.short}</strong>
      <span className="gd-q-tag">{question.context === 'trophy' ? '🏆 VALE TROFÉU' : `ACERTO ${streak + 1}/3`}</span>
    </div>
    <div className="gd-q-body">
      {/* Cronômetro: anel que esvazia em volta dos segundos restantes */}
      <div className="gd-q-count" role="progressbar" aria-label="Tempo restante" aria-valuemin={0} aria-valuemax={QUESTION_SECONDS} aria-valuenow={seconds}
        style={{ color: result ? (result.correct ? 'var(--gd-go)' : 'var(--gd-bad)') : danger ? 'var(--gd-bad)' : theme.dark }}>
        <svg className="gd-ring" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="27" fill="none" stroke="#E8EEF6" strokeWidth="6"/>
          <circle cx="32" cy="32" r="27" fill="none" strokeWidth="6" strokeLinecap="round" stroke="currentColor"
            strokeDasharray={RING} strokeDashoffset={result ? 0 : RING * (1 - pct / 100)}/>
        </svg>
        <span aria-hidden="true">{result ? (result.correct ? <Check size={26}/> : <X size={26}/>) : seconds}</span>
      </div>
      <p className="sr-only" aria-live="assertive">{seconds === 10 ? 'Restam 10 segundos' : seconds === 5 ? 'Restam 5 segundos' : ''}</p>
      <h2 className="gd-q-prompt">{question.prompt}</h2>
      {imageUrl && <img className="gd-q-image" src={imageUrl} alt="Imagem da pergunta" draggable={false}/>}
      <div className="gd-options" role="group" aria-label="Alternativas">
        {question.options.map((option, i) => <motion.button key={`${question.id}-${i}`} className={`gd-option ${stateOf(i)}`}
          disabled={locked} onClick={() => onAnswer(i)} aria-keyshortcuts={`${String.fromCharCode(65 + i)} ${i + 1}`}
          animate={result && i === result.selected_index && !result.correct ? { x: [0, -8, 8, -5, 5, 0] } : result && i === result.correct_index ? { scale: [1, 1.04, 1] } : {}}
          transition={{ duration: 0.45 }}>
          <span className="gd-option-letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
          <span>{option}</span>
          {result && i === result.correct_index && <Check size={20} aria-label="correta"/>}
          {result && i === result.selected_index && !result.correct && <X size={20} aria-label="sua resposta"/>}
        </motion.button>)}
      </div>
    </div>
  </motion.article>;
}

/** Faixa abaixo da pergunta respondida: resultado, explicação e o próximo passo. */
export function ResultSheet({ result, opponentName, streakAfter, onContinue }: { result: QuestionResult; opponentName: string; streakAfter: number; onContinue: () => void }) {
  const good = result.correct;
  const title = result.trophy_won ? 'Troféu conquistado!' : good ? 'Boa! Acertou.' : result.timed_out ? 'Tempo esgotado!' : 'Errou!';
  const next = good
    ? (result.trophy_won ? 'Você continua com a vez.' : streakAfter >= 3 ? 'Três acertos! Hora de disputar um troféu.' : `Sequência: ${streakAfter}/3. Você continua.`)
    : result.context === 'trophy' ? `A sequência zerou e a vez passa para ${opponentName}.`
    : streakAfter > 0 ? `A vez passa para ${opponentName}. Seus ${streakAfter} ${streakAfter === 1 ? 'acerto fica guardado' : 'acertos ficam guardados'}.`
    : `A vez passa para ${opponentName}.`;
  return <motion.section className="gd-sheet" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }} aria-live="polite">
    <div className="gd-sheet-head">
      <Mascot mood={good ? 'correct' : 'wrong'} size={58}/>
      <div className={`gd-sheet-title ${good ? 'gd-sheet-title--good' : 'gd-sheet-title--bad'}`}>{good ? <Check size={26}/> : <X size={26}/>} {title}</div>
    </div>
    <p><b>Resposta: {result.correct_option}.</b> {result.explanation}</p>
    <p>{next}</p>
    <button className={`gd-btn gd-btn--wide ${good ? '' : 'gd-btn--blue'}`} onClick={onContinue} autoFocus>{good ? 'Continuar' : 'Passar a vez'}</button>
  </motion.section>;
}

/** Escolha do troféu depois de três acertos (somados entre as vezes). */
export function TrophyPick({ trophies, busy, onPick }: { trophies: CategoryId[]; busy: boolean; onPick: (id: CategoryId) => void }) {
  return <motion.section className="gd-panel" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
    <span className="gd-kicker">TRÊS ACERTOS SEGUIDOS!</span>
    <h2>Escolha a taça que vai disputar</h2>
    <div className="gd-cabinet">
      {CATEGORY_ORDER.map(id => {
        const won = trophies.includes(id);
        return <button key={id} className="gd-cabinet-item" disabled={won || busy} onClick={() => onPick(id)}>
          <Trophy id={id} won={won} size={50}/>
          {CATEGORY_THEME[id].short}
          <small>{won ? 'CONQUISTADA' : 'DISPUTAR'}</small>
        </button>;
      })}
    </div>
    <p>A pergunta decisiva também tem 15 segundos. Acertou, a taça é sua e você continua jogando.</p>
  </motion.section>;
}

export function Confetti({ pieces = 70 }: { pieces?: number }) {
  const items = useMemo(() => Array.from({ length: pieces }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.8, duration: 2.2 + Math.random() * 1.8,
    color: ['#FFC531', '#22B357', '#2F6FED', '#EF4444', '#8B5CF6', '#FF8A1F', '#fff'][i % 7], rotate: Math.random() * 360,
  })), [pieces]);
  return <div className="gd-confetti" aria-hidden="true">{items.map((c, i) => <i key={i} style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s`, rotate: `${c.rotate}deg` }}/>)}</div>;
}

/** Comemoração da conquista de um troféu. */
export function TrophyCelebration({ category, onContinue }: { category: CategoryId; onContinue: () => void }) {
  useEffect(() => { sfx.trophy(); }, []);
  return <div className="gd gd-overlay" role="dialog" aria-modal="true" aria-label="Troféu conquistado">
    <Confetti/>
    <motion.div className="gd-celebrate" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 14 }}>
      <Rays/>
      <div className="gd-celebrate-hero">
        <motion.div initial={{ y: -40, rotate: -12 }} animate={{ y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 9, delay: 0.1 }}>
          <Trophy id={category} won size={150}/>
        </motion.div>
        <motion.div className="gd-celebrate-mascot" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 16 }}>
          <Mascot mood="victory" size={84}/>
        </motion.div>
      </div>
      <span className="gd-kicker" style={{ color: '#FFE47A' }}>TROFÉU CONQUISTADO</span>
      <h2>{CATEGORY_THEME[category].label}</h2>
      <p>A taça é sua, e a vez continua com você!</p>
      <button className="gd-btn gd-btn--gold" onClick={onContinue} autoFocus>Continuar</button>
    </motion.div>
  </div>;
}

/** Fim de jogo: vitória (com festa) ou derrota. */
export function MatchEnd({ match, iWon, reason, opponentId, opponentName }: { match: ApiMatch; iWon: boolean; reason: string; opponentId?: number; opponentName: string }) {
  const winner = match.players.find(p => p.seat === match.winner_seat);
  useEffect(() => { if (iWon) sfx.victory(); }, [iWon]);
  return <div className="gd-stage">
    {iWon && <Confetti pieces={90}/>}
    <motion.section className="gd-panel" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 170, damping: 14 }}>
      <Mascot mood={iWon ? 'victory' : 'wrong'} size={96}/>
      <span className="gd-kicker">{iWon ? 'É CAMPEÃO!' : 'FIM DE JOGO'}</span>
      <h2>{iWon ? 'Você levou as seis taças!' : `${opponentName} venceu desta vez.`}</h2>
      {!(iWon && match.finished_reason === 'six_trophies') && <p>{reason}</p>}
      {winner && <div className="gd-cabinet">{CATEGORY_ORDER.map(id => <div key={id} className="gd-cabinet-item">
        <Trophy id={id} won={winner.trophies.includes(id)} size={46}/>{CATEGORY_THEME[id].short}
      </div>)}</div>}
      <Link to="/" className="gd-btn gd-btn--wide">{iWon ? 'Jogar de novo' : 'Pedir revanche'}</Link>
      {opponentId && <Link to={`/jogadores/${opponentId}`} className="gd-btn gd-btn--white gd-btn--wide gd-btn--sm">Ver confronto com {opponentName}</Link>}
    </motion.section>
  </div>;
}

/** Vez do adversário: a tela atualiza sozinha. */
export function OpponentWait({ opponent, deadline }: { opponent: MatchPlayer; deadline: string | undefined }) {
  return <div className="gd-stage">
    <motion.section className="gd-panel" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <Mascot mood="thinking" size={100}/>
      <span className="gd-kicker">PARTIDA EM ANDAMENTO</span>
      <h2>Vez de {opponent.user.display_name}</h2>
      <p>A bola volta para você quando {opponent.user.display_name} errar. Prazo da vez: {deadline ? timeLeft(deadline) : '—'}.</p>
      <p style={{ fontSize: 12, color: 'var(--gd-muted)' }}>Esta tela atualiza sozinha.</p>
      <Link to="/" className="gd-btn gd-btn--white gd-btn--wide gd-btn--sm">Minhas partidas</Link>
    </motion.section>
  </div>;
}

/** Convite criado, esperando o amigo aceitar. */
export function InviteWait({ code, expiresAt, canManage, busy, onShare, onCancel }: { code?: string; expiresAt?: string; canManage: boolean; busy: boolean; onShare: () => void; onCancel: () => void }) {
  return <div className="gd-stage">
    <section className="gd-panel">
      <span className="gd-kicker">AGUARDANDO ADVERSÁRIO</span>
      <h2>Chame seu amigo pra esse X1</h2>
      <p>A partida começa quando ele aceitar. O convite expira {expiresAt ? timeLeft(expiresAt) : 'em breve'}.</p>
      {code && <span className="gd-code">{code}</span>}
      {canManage && <>
        <button className="gd-btn gd-btn--wide" onClick={onShare}><Share2 size={20}/> Compartilhar</button>
        <button className="gd-btn gd-btn--white gd-btn--wide gd-btn--sm" onClick={onCancel} disabled={busy}>Cancelar convite</button>
      </>}
    </section>
  </div>;
}

/** Mensagem simples no cenário (erros, partida inexistente, sem perguntas). */
export function StageMessage({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="gd-stage"><section className="gd-panel"><Mascot mood="thinking" size={88}/><h2>{title}</h2><p>{text}</p>
    {action ?? <Link to="/" className="gd-btn gd-btn--wide gd-btn--nav">Minhas partidas</Link>}</section></div>;
}
