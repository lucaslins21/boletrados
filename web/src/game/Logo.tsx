/**
 * Marca do Boletrados (v3).
 * Emblema: o rosto do mascote (a bola de futebol com olhos grandes e sorrisão), em estilo cartoon, com uma luva
 * acenando e um brilho dourado. Nome: letras de jogo com contorno, profundidade 3D e brilho; "BOLE" branco,
 * "TRADOS" dourado. Desenho próprio, sem símbolos de terceiros.
 */
import { useId } from 'react';

const INK = '#13213D';

function pentagon(cx: number, cy: number, r: number, rotate = -90) {
  return Array.from({ length: 5 }, (_, i) => {
    const a = ((rotate + i * 72) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

export function LogoMark({ size = 44 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  return <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden="true" className="gd-logo-mark" style={{ overflow: 'visible' }}>
    <defs>
      <radialGradient id={`face-${uid}`} gradientUnits="userSpaceOnUse" cx="30" cy="24" r="52">
        <stop offset="0" stopColor="#fff"/><stop offset=".62" stopColor="#F3F7FC"/><stop offset="1" stopColor="#CBD7E6"/>
      </radialGradient>
      <clipPath id={`clip-${uid}`}><circle cx="38" cy="42" r="33"/></clipPath>
    </defs>
    {/* profundidade */}
    <circle cx="38" cy="45.5" r="33" fill={INK}/>
    {/* bola (rosto) */}
    <circle cx="38" cy="42" r="33" fill={`url(#face-${uid})`}/>
    <g clipPath={`url(#clip-${uid})`} fill="#1B2640">
      <polygon points={pentagon(38, 12, 9)}/>
      <polygon points={pentagon(4, 38, 10, -18)}/>
      <polygon points={pentagon(72, 38, 10, -162)}/>
      <polygon points={pentagon(16, 76, 10, 54)}/>
      <polygon points={pentagon(60, 76, 10, 126)}/>
    </g>
    <circle cx="38" cy="42" r="33" fill="none" stroke={INK} strokeWidth="3.6"/>
    <ellipse cx="22" cy="20" rx="8" ry="4" fill="#fff" transform="rotate(-30 22 20)"/>
    {/* bochechas */}
    <g fill="#FF8FA0" opacity=".5"><ellipse cx="18" cy="50" rx="5" ry="3.2"/><ellipse cx="58" cy="50" rx="5" ry="3.2"/></g>
    {/* sobrancelhas e olhos */}
    <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round"><path d="M19 26q6.5-4.5 12.5-1"/><path d="M45 25q6.5-3.5 12.5 1"/></g>
    {[27, 49].map(x => <g key={x}>
      <ellipse cx={x} cy="38" rx="8" ry="9.6" fill="#fff" stroke={INK} strokeWidth="2.6"/>
      <circle cx={x + 1} cy="38.5" r="4.6" fill={INK}/>
      <circle cx={x - 0.6} cy="36.6" r="1.7" fill="#fff"/>
    </g>)}
    {/* sorrisão */}
    <path d="M25 52h26q-1.3 14-13 14T25 52Z" fill={INK} stroke={INK} strokeWidth="2.4" strokeLinejoin="round"/>
    <path d="M28 53h20v2.8H28Z" fill="#fff"/>
    <ellipse cx="38" cy="62.2" rx="6" ry="3" fill="#F26B7A"/>
    {/* luva acenando */}
    <g transform="rotate(-18 70 62)">
      <circle cx="70" cy="62" r="8.5" fill="#fff" stroke={INK} strokeWidth="2.6"/>
      <circle cx="63.5" cy="64" r="3.6" fill="#fff" stroke={INK} strokeWidth="2.3"/>
      <path d="M66.5 67h7" stroke="#C3CDDA" strokeWidth="2" strokeLinecap="round"/>
    </g>
    {/* brilho dourado */}
    <path d="M70 6l1.9 4.2 4.6.5-3.4 3.1 1 4.5-4.1-2.3-4.1 2.3 1-4.5-3.4-3.1 4.6-.5Z" fill="#FFC531" stroke={INK} strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>;
}

/** Nome em letras de jogo. `arc` curva levemente o nome (versão de destaque). */
export function Wordmark({ height = 32, arc = false }: { height?: number; arc?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const width = height * 6.4;
  const path = `M8 ${arc ? 66 : 54} Q160 ${arc ? 30 : 54} 312 ${arc ? 66 : 54}`;
  const layers = (dy: number, fillWhite: string, fillGold: string, extra: object = {}) =>
    <text fontFamily="Outfit, sans-serif" fontWeight="900" fontSize="48" textAnchor="middle" {...extra}>
      {/* textLength: o nome sempre cabe no caminho, reto ou em arco */}
      <textPath href={`#wm-${uid}`} startOffset="50%" dy={dy} textLength="292" lengthAdjust="spacingAndGlyphs">
        <tspan fill={fillWhite}>BOLE</tspan><tspan fill={fillGold}>TRADOS</tspan>
      </textPath>
    </text>;
  return <svg width={width} height={height * (arc ? 1.45 : 1.15)} viewBox={`0 ${arc ? 0 : 8} 320 ${arc ? 92 : 64}`} aria-hidden="true" className="gd-wordmark">
    <defs>
      <path id={`wm-${uid}`} d={path}/>
      <linearGradient id={`wg-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff"/><stop offset="1" stopColor="#D6E6FF"/></linearGradient>
      <linearGradient id={`gg-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE98A"/><stop offset=".55" stopColor="#FFC531"/><stop offset="1" stopColor="#F2A100"/></linearGradient>
    </defs>
    {/* profundidade 3D */}
    <g transform="translate(0 5)">{layers(0, '#13213D', '#13213D', { stroke: '#13213D', strokeWidth: 10, strokeLinejoin: 'round' })}</g>
    {/* contorno */}
    {layers(0, '#13213D', '#13213D', { stroke: '#13213D', strokeWidth: 10, strokeLinejoin: 'round' })}
    {/* preenchimento com brilho */}
    {layers(0, `url(#wg-${uid})`, `url(#gg-${uid})`)}
  </svg>;
}

/** Marca completa (emblema + nome). */
export function Logo({ size = 40, tagline = false, arc = false }: { size?: number; tagline?: boolean; arc?: boolean }) {
  return <span className={`gd-logo ${arc ? 'gd-logo--hero' : ''}`} aria-label="Boletrados" role="img">
    <LogoMark size={size}/>
    <span className="gd-logo-text">
      <Wordmark height={size * 0.62} arc={arc}/>
      {tagline && <small>Quem sabe de bola, joga.</small>}
    </span>
  </span>;
}
