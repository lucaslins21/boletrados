/** Componentes de interface compartilhados pelo site. */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Info, X } from 'lucide-react';

export const QUESTION_SECONDS = 15;

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'lime' | 'purple' | 'orange' }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

export function Banner({ children, icon = <Info size={17}/> }: { children: ReactNode; icon?: ReactNode }) {
  return <div className="notice-banner">{icon}<span>{children}</span></div>;
}

/** Modal acessível: Esc fecha, foco inicial no diálogo, Tab preso dentro dele e foco restaurado ao fechar. */
export function Modal({ label, onClose, children, className = '' }: { label: string; onClose: () => void; children: ReactNode; className?: string }) {
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
  return <div className="modal-backdrop" onMouseDown={onClose} role="presentation"><motion.div ref={cardRef} tabIndex={-1} className={`modal-card ${className}`} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onMouseDown={event=>event.stopPropagation()} role="dialog" aria-modal="true" aria-label={label}><button className="modal-close" aria-label="Fechar" onClick={onClose}><X size={20}/></button>{children}</motion.div></div>;
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
