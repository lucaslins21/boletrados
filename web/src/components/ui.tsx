/** Componentes visuais compartilhados entre a demo local e o modo online. */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, ChevronRight, Clock3, Info, ShieldCheck, Trophy, X } from 'lucide-react';
import { CATEGORIES, getCategory, type CategoryId } from '../data/questions';

export const QUESTION_SECONDS = 15;

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'lime' | 'purple' | 'orange' }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

export function CategoryIcon({ id, size = 'md' }: { id: CategoryId; size?: 'sm' | 'md' | 'lg' }) {
  const cat = getCategory(id);
  return <span aria-hidden="true" className={`category-icon category-icon--${size}`} style={{ backgroundColor: `${cat.color}22`, borderColor: `${cat.color}55` }}>{cat.icon}</span>;
}

export function TrophyGrid({ trophies, interactive = false, onSelect }: { trophies: readonly CategoryId[]; interactive?: boolean; onSelect?: (id: CategoryId) => void }) {
  return <div className={`trophy-grid ${interactive ? 'trophy-grid--interactive' : ''}`}>
    {CATEGORIES.map(cat => {
      const won = trophies.includes(cat.id);
      const content = <><CategoryIcon id={cat.id} size="lg"/><span className="trophy-name">{cat.short}</span><span className={`trophy-state ${won ? 'trophy-state--won' : ''}`}>{won ? <><Check size={12} /> Conquistado</> : interactive ? 'Selecionar' : 'A conquistar'}</span></>;
      return interactive && !won ? (
        <button className="trophy-tile trophy-tile--pick" key={cat.id} onClick={() => onSelect?.(cat.id)} style={{ '--category-color': cat.color } as CSSProperties}>{content}</button>
      ) : <div key={cat.id} className={`trophy-tile ${won ? 'trophy-tile--won' : ''}`} style={{ '--category-color': cat.color } as CSSProperties}>{content}</div>;
    })}
  </div>;
}

export function Banner({ children, icon = <Info size={17}/> }: { children: ReactNode; icon?: ReactNode }) {
  return <div className="notice-banner">{icon}<span>{children}</span></div>;
}

/** Modal acessível: Esc fecha, foco inicial no diálogo, Tab preso dentro dele e foco restaurado ao fechar. */
export function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const card = cardRef.current;
    card?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== 'Tab' || !card) return;
      const focusable = card.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const firstEl = focusable[0], lastEl = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === firstEl || document.activeElement === card)) { event.preventDefault(); lastEl.focus(); }
      else if (!event.shiftKey && document.activeElement === lastEl) { event.preventDefault(); firstEl.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={onClose} role="presentation"><motion.div ref={cardRef} tabIndex={-1} className="modal-card" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onMouseDown={event=>event.stopPropagation()} role="dialog" aria-modal="true" aria-label={label}><button className="modal-close" aria-label="Fechar" onClick={onClose}><X size={20}/></button>{children}</motion.div></div>;
}

/** Milissegundos restantes até `deadline` (relógio do cliente), atualizado ~13x por segundo. */
export function useCountdown(deadline: number | null, onExpire?: () => void) {
  const [remaining, setRemaining] = useState(() => Math.max(0, (deadline ?? 0) - Date.now()));
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;
  useEffect(() => {
    let fired = false;
    const sync = () => {
      const left = Math.max(0, (deadline ?? 0) - Date.now());
      setRemaining(left);
      if (left === 0 && !fired) { fired = true; expireRef.current?.(); }
    };
    sync();
    const handle = window.setInterval(sync, 75);
    return () => window.clearInterval(handle);
  }, [deadline]);
  return remaining;
}

type QuestionCardProps = {
  questionKey: string;
  prompt: string;
  options: readonly string[];
  image?: string | null;
  categoryId: CategoryId;
  isTrophy: boolean;
  /** Ex.: "ACERTO 2 DE 3". Ignorado em pergunta de troféu. */
  progressLabel: string;
  /** Prazo no relógio do cliente (ms). */
  deadline: number;
  onAnswer: (index: number) => void;
  onExpire?: () => void;
  disabled?: boolean;
};

/** Pergunta com cronômetro, alternativas e atalhos A–D / 1–4. */
export function QuestionCard({ questionKey, prompt, options, image, categoryId, isTrophy, progressLabel, deadline, onAnswer, onExpire, disabled = false }: QuestionCardProps) {
  const category = getCategory(categoryId);
  const remaining = useCountdown(deadline, onExpire);
  const locked = remaining === 0 || disabled;
  const answerRef = useRef(onAnswer);
  answerRef.current = onAnswer;
  useEffect(() => {
    if (locked) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const key = event.key.toLowerCase();
      if (key.length !== 1) return;
      const index = 'abcd'.indexOf(key) >= 0 ? 'abcd'.indexOf(key) : '1234'.indexOf(key);
      if (index >= 0) { event.preventDefault(); answerRef.current(index); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked]);
  const sec = Math.max(0, Math.ceil(remaining / 1000));
  const pct = Math.max(0, Math.min(100, (remaining / (QUESTION_SECONDS * 1000)) * 100));
  // Leitores de tela: anunciar só marcos, não cada segundo.
  const announcement = sec <= 5 ? 'Restam 5 segundos' : sec <= 10 ? 'Restam 10 segundos' : '';
  // Dificulta copiar o enunciado para buscar fora (não impede screenshots nem outro aparelho).
  const block = (event: { preventDefault: () => void }) => event.preventDefault();
  return <div className="question-wrap"><main className="main-card question-card no-copy" onCopy={block} onCut={block} onContextMenu={block} onDragStart={block} style={{ '--category-color': category.color } as CSSProperties}>
    <div className="question-top"><span className="question-category"><CategoryIcon id={category.id} size="sm"/>{category.label}</span><span className="question-label">{isTrophy ? <><Trophy size={15}/> PERGUNTA DO TROFÉU</> : progressLabel}</span></div>
    <div className="timer-track" role="progressbar" aria-label="Tempo restante" aria-valuemin={0} aria-valuemax={QUESTION_SECONDS} aria-valuenow={sec} aria-valuetext={`${sec} segundos`}><motion.div className={`timer-fill ${sec <= 5 ? 'timer-fill--danger' : ''}`} animate={{ width: `${pct}%` }} transition={{ duration: 0.075, ease: 'linear' }}/></div>
    <div className="question-meta"><Pill tone={isTrophy ? 'orange' : 'purple'}>{isTrophy ? '🏆 Vale um troféu!' : '⚽ Valendo a posse'}</Pill><div className={`countdown ${sec <= 5 ? 'countdown--danger' : ''}`} aria-hidden="true"><Clock3 size={18}/><b>{sec.toString().padStart(2, '0')}s</b></div></div>
    <p className="sr-only" aria-live="assertive">{announcement}</p>
    <h1 className="question-prompt">{prompt}</h1>
    {image && <img className="question-image" src={image} alt="Ilustração complementar para esta pergunta"/>}
    <div className="answer-grid" role="group" aria-label="Alternativas">{options.map((option,i)=><button key={`${questionKey}-${i}`} className="answer-option" onClick={()=>onAnswer(i)} disabled={locked} aria-keyshortcuts={`${String.fromCharCode(65+i)} ${i+1}`}><span className="answer-letter" aria-hidden="true">{String.fromCharCode(65+i)}</span><span>{option}</span><ChevronRight size={18} aria-hidden="true"/></button>)}</div>
    <p className="center-hint"><ShieldCheck size={15}/> Uma resposta. Sem voltar atrás. {QUESTION_SECONDS} segundos.<span className="keyboard-hint"> Teclado: A–D ou 1–4.</span></p>
  </main></div>;
}

type FeedbackCardProps = {
  correct: boolean;
  timedOut: boolean;
  trophyWon: boolean;
  winning: boolean;
  categoryId: CategoryId;
  selectedOption: string | null;
  correctOption: string;
  explanation: string;
  opponentName: string;
  onContinue: () => void;
};

export function FeedbackCard({ correct, timedOut, trophyWon, winning, categoryId, selectedOption, correctOption, explanation, opponentName, onContinue }: FeedbackCardProps) {
  const subtitle = winning ? 'Você completou a coleção dos seis troféus!'
    : trophyWon ? `O troféu de ${getCategory(categoryId).short} é seu. A posse continua!`
    : correct ? 'Você continua com a posse de bola.'
    : `A sequência foi zerada. Agora a bola é de ${opponentName}.`;
  return <div className="feedback-shell"><main className="main-card feedback-card">
    <motion.div className={`feedback-burst ${correct ? 'feedback-burst--correct' : 'feedback-burst--wrong'}`} initial={{ scale: 0.35, opacity: 0, rotate: -20 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }} aria-hidden="true">
      {trophyWon ? <Trophy size={50}/> : correct ? <Check size={56}/> : <X size={56}/>}
    </motion.div>
    <p className="eyebrow">{trophyWon ? 'TROFÉU CONQUISTADO!' : correct ? 'NA MOSCA!' : 'QUE PENA!'}</p>
    <h1 className="screen-title">{trophyWon ? 'É campeão dessa categoria!' : correct ? 'Boa! Você acertou.' : timedOut ? 'O tempo acabou!' : 'Essa passou raspando.'}</h1>
    <p className="screen-subtitle">{subtitle}</p>
    <div className="feedback-explanation">
      {!correct && selectedOption !== null && <><span>SUA RESPOSTA</span><strong className="feedback-wrong-answer">{selectedOption}</strong></>}
      <span>RESPOSTA CORRETA</span><strong>{correctOption}</strong><p>{explanation}</p>
    </div>
    <button className="button button--primary button--lg button--full" onClick={onContinue} autoFocus>{winning ? 'Ver resultado' : correct ? 'Continuar jogando' : 'Passar a vez'} <ArrowRight size={19}/></button>
  </main></div>;
}
