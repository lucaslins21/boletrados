/**
 * Mascote oficial: uma bola de futebol clássica com olhos grandes, luvas e chuteiras.
 * Um único desenho; os estados mudam só olhos, sobrancelhas, boca, braços e movimento — as proporções
 * são idênticas em todos. Regras de uso em docs/ART_DIRECTION.md §5 (nunca durante os 15 s da pergunta).
 */
import { useId } from 'react';
import { motion, type TargetAndTransition, type Transition } from 'framer-motion';

export type MascotMood = 'happy' | 'correct' | 'wrong' | 'victory' | 'thinking';

const INK = '#13213D';
const PATCH = '#1B2640';
const BOOT = '#22B357';
const BOOT_DARK = '#168A41';
const SHOULDER_L: [number, number] = [25, 74];
const SHOULDER_R: [number, number] = [95, 74];

// Posição das mãos por estado (coordenadas do quadro 120×150).
const HANDS: Record<MascotMood, { l: [number, number]; r: [number, number] }> = {
  happy: { l: [13, 96], r: [108, 40] },
  correct: { l: [12, 32], r: [108, 32] },
  wrong: { l: [33, 24], r: [87, 24] },
  victory: { l: [14, 96], r: [104, 18] },
  thinking: { l: [13, 98], r: [74, 97] },
};

function pentagon(cx: number, cy: number, r: number, rotate = -90) {
  return Array.from({ length: 5 }, (_, i) => {
    const a = ((rotate + i * 72) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

/** Braço curvo do ombro até a mão, dobrando para fora do corpo, com luva. */
function Arm({ from, to, side }: { from: [number, number]; to: [number, number]; side: -1 | 1 }) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const cx = (x1 + x2) / 2 + side * 12;
  const cy = (y1 + y2) / 2 + 4;
  return <g>
    <path d={`M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}`} fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round"/>
    <circle cx={x2} cy={y2} r="9.5" fill="#fff" stroke={INK} strokeWidth="2.6"/>
    <circle cx={x2 - side * 7} cy={y2 + 2} r="4" fill="#fff" stroke={INK} strokeWidth="2.4"/>
    <path d={`M${x2 - 4} ${y2 + 5}h8`} stroke="#D3DCE8" strokeWidth="2" strokeLinecap="round"/>
  </g>;
}

function Eyes({ mood }: { mood: MascotMood }) {
  if (mood === 'correct') { // olhos fechados de alegria (^ ^)
    return <g fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round">
      <path d="M39 60q8-10 16 0"/><path d="M65 60q8-10 16 0"/>
    </g>;
  }
  const pupil: Record<MascotMood, [number, number]> = { happy: [0, 1], wrong: [0, 4], victory: [0, -2], thinking: [3, -4], correct: [0, 0] };
  const [dx, dy] = pupil[mood];
  return <g>
    {[47, 73].map(x => <g key={x}>
      <ellipse cx={x} cy="58" rx="9.5" ry="11.5" fill="#fff" stroke={INK} strokeWidth="2.6"/>
      <circle cx={x + dx} cy={58 + dy} r="5.4" fill={INK}/>
      <circle cx={x + dx - 1.8} cy={58 + dy - 2} r="1.9" fill="#fff"/>
    </g>)}
  </g>;
}

function Brows({ mood }: { mood: MascotMood }) {
  const paths: Record<MascotMood, string[]> = {
    happy: ['M39 44q8-5 15-1', 'M66 43q7-4 15 1'],
    correct: ['M39 45q8-5 15-1', 'M66 44q7-4 15 1'],
    wrong: ['M39 47l14-6', 'M81 47l-14-6'], // pontas internas para cima: tristeza
    victory: ['M38 43q8-8 16-2', 'M66 41q8-6 16 2'], // levantadas: alegria de campeão
    thinking: ['M39 45q8-3 15 0', 'M66 41q8-7 15-2'], // uma sobrancelha levantada
  };
  return <g fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round">{paths[mood].map(d => <path key={d} d={d}/>)}</g>;
}

function Mouth({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'happy':
      return <g><path d="M48 77q12 15 24 0Z" fill={INK} stroke={INK} strokeWidth="2.5" strokeLinejoin="round"/><ellipse cx="60" cy="84" rx="5" ry="2.6" fill="#F26B7A"/></g>;
    case 'correct':
      return <g><path d="M45 75h30q-1.5 17-15 17T45 75Z" fill={INK} stroke={INK} strokeWidth="2.5" strokeLinejoin="round"/><ellipse cx="60" cy="87" rx="7" ry="3.4" fill="#F26B7A"/><path d="M48 76h24v3H48Z" fill="#fff"/></g>;
    case 'wrong':
      return <path d="M48 87q4-5 8 0t8 0 8 0" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>;
    case 'victory': // sorrisão aberto (maior que o do acerto)
      return <g><path d="M43 74h34q-1 20-17 20T43 74Z" fill={INK} stroke={INK} strokeWidth="2.5" strokeLinejoin="round"/><ellipse cx="60" cy="88" rx="8" ry="4" fill="#F26B7A"/><path d="M46 75h28v3.4H46Z" fill="#fff"/></g>;
    case 'thinking':
      return <ellipse cx="65" cy="84" rx="3.4" ry="3.8" fill={INK}/>;
  }
}

/** Animação de cada estado (desligada com movimento reduzido via MotionConfig). */
const BODY_MOTION: Record<MascotMood, { animate: TargetAndTransition; transition: Transition }> = {
  happy: { animate: { y: [0, -4, 0] }, transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
  correct: { animate: { y: [0, -18, 0, -10, 0] }, transition: { duration: 0.9, repeat: Infinity, repeatDelay: 0.8, ease: 'easeOut' } },
  wrong: { animate: { x: [0, -4, 4, -3, 3, 0], rotate: [0, -3, 3, 0] }, transition: { duration: 0.6 } },
  victory: { animate: { y: [0, -12, 0] }, transition: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' } },
  thinking: { animate: { rotate: [-3, 3, -3] }, transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
};

export function Mascot({ mood = 'happy', size = 120, title }: { mood?: MascotMood; size?: number; title?: string }) {
  const uid = useId().replace(/:/g, '');
  const hands = HANDS[mood];
  const motionProps = BODY_MOTION[mood];
  const waving = mood === 'happy' || mood === 'victory';
  return <svg width={size} height={size * 1.25} viewBox="0 0 120 150" className="gd-mascot" role={title ? 'img' : undefined}
    aria-label={title} aria-hidden={title ? undefined : true} style={{ overflow: 'visible' }}>
    <defs>
      <radialGradient id={`ball-${uid}`} gradientUnits="userSpaceOnUse" cx="46" cy="40" r="62">
        <stop offset="0" stopColor="#fff"/><stop offset=".65" stopColor="#F4F7FB"/><stop offset="1" stopColor="#D5DEEA"/>
      </radialGradient>
      <clipPath id={`clip-${uid}`}><circle cx="60" cy="64" r="40"/></clipPath>
    </defs>
    {/* sombra no chão (fica parada enquanto o corpo pula) */}
    <ellipse cx="60" cy="144" rx="27" ry="5" fill="#0E2A5A" opacity=".22"/>
    <motion.g animate={motionProps.animate} transition={motionProps.transition} style={{ transformBox: 'view-box', transformOrigin: '60px 130px' }}>
      {/* pernas e chuteiras */}
      <path d="M51 100 47 126M69 100 73 126" stroke={INK} strokeWidth="6" strokeLinecap="round"/>
      {[-1, 1].map(side => {
        const x = side < 0 ? 46 : 74;
        return <g key={side} transform={side > 0 ? `translate(${x * 2} 0) scale(-1 1)` : undefined}>
          <path d={`M${x - 13} 129c0-3 2.4-5 5.5-5H${x + 4}c3 0 5.5 2.2 5.5 5.3v1.4c0 2-1.6 3.3-3.6 3.3H${x - 10}c-2 0-3-1.8-3-5Z`} fill={BOOT} stroke={INK} strokeWidth="2.5" strokeLinejoin="round"/>
          <path d={`M${x - 8} 128h9`} stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          <path d={`M${x - 10} 134h16`} stroke={BOOT_DARK} strokeWidth="2" strokeLinecap="round"/>
        </g>;
      })}
      {/* braço esquerdo (atrás) */}
      <Arm from={SHOULDER_L} to={hands.l} side={-1}/>
      {/* corpo: bola clássica */}
      <circle cx="60" cy="64" r="40" fill={`url(#ball-${uid})`}/>
      <g clipPath={`url(#clip-${uid})`}>
        <polygon points={pentagon(60, 29, 10.5)} fill={PATCH}/>
        <polygon points={pentagon(19, 60, 12, -18)} fill={PATCH}/>
        <polygon points={pentagon(101, 60, 12, -162)} fill={PATCH}/>
        <polygon points={pentagon(34, 101, 12, 54)} fill={PATCH}/>
        <polygon points={pentagon(86, 101, 12, 126)} fill={PATCH}/>
        <g stroke="#C3CDDA" strokeWidth="1.6" fill="none" strokeLinecap="round">
          <path d="M51 32 30 52M69 32 90 52M28 68 36 90M92 68 84 90M46 104h28"/>
        </g>
      </g>
      <circle cx="60" cy="64" r="40" fill="none" stroke={INK} strokeWidth="3"/>
      <ellipse cx="44" cy="37" rx="10" ry="5" fill="#fff" opacity=".8" transform="rotate(-28 44 37)"/>
      {/* rosto */}
      {(mood === 'happy' || mood === 'correct' || mood === 'victory') && <g fill="#FF8FA0" opacity=".45"><ellipse cx="36" cy="73" rx="5.5" ry="3.5"/><ellipse cx="84" cy="73" rx="5.5" ry="3.5"/></g>}
      <Brows mood={mood}/>
      <Eyes mood={mood}/>
      <Mouth mood={mood}/>
      {mood === 'wrong' && <path d="M88 40c3 5 4.5 8 4.5 10a4.5 4.5 0 0 1-9 0c0-2 1.5-5 4.5-10Z" fill="#7CC8FA" stroke={INK} strokeWidth="2"/>}
      {/* braço direito (na frente) — acena no feliz e no vitorioso */}
      <motion.g animate={waving ? { rotate: mood === 'victory' ? [0, -10, 0] : [0, 14, -6, 14, 0] } : { rotate: 0 }}
        transition={waving ? { duration: mood === 'victory' ? 0.7 : 1.6, repeat: Infinity, ease: 'easeInOut' } : {}}
        style={{ transformBox: 'view-box', transformOrigin: `${SHOULDER_R[0]}px ${SHOULDER_R[1]}px` }}>
        <Arm from={SHOULDER_R} to={hands.r} side={1}/>
      </motion.g>
      {mood === 'victory' && <g fill="#FFC531" stroke={INK} strokeWidth="1.5" strokeLinejoin="round">
        <path d="M18 14l2 4 4 .5-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.5Z"/>
        <path d="M112 54l2 4 4 .5-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.5Z"/>
      </g>}
    </motion.g>
  </svg>;
}
