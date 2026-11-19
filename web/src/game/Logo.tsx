/**
 * Marca do Boletrados (v2).
 * Emblema: aro dourado com uma bolinha de sorteio aberta revelando a taça — o caminho do jogo (sorteio → troféu).
 * Nome: letras de jogo com contorno, profundidade 3D e brilho; "BOLE" branco, "TRADOS" dourado.
 * Desenho próprio, sem símbolos de terceiros.
 */
import { useId } from 'react';

export function LogoMark({ size = 44 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  const id = (name: string) => `${name}-${uid}`;
  return <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden="true" className="gd-logo-mark">
    <defs>
      <linearGradient id={id('ring')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFE98A"/><stop offset=".5" stopColor="#FFC531"/><stop offset="1" stopColor="#E99A00"/>
      </linearGradient>
      <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5BB8F7"/><stop offset=".62" stopColor="#2F6FED"/><stop offset=".63" stopColor="#2AAE53"/><stop offset="1" stopColor="#168A41"/>
      </linearGradient>
      <radialGradient id={id('ball')} gradientUnits="userSpaceOnUse" cx="26" cy="20" r="34">
        <stop offset="0" stopColor="#8FEBA6"/><stop offset=".4" stopColor="#22B357"/><stop offset="1" stopColor="#11793A"/>
      </radialGradient>
      <linearGradient id={id('cup')} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#FFE47A"/><stop offset=".55" stopColor="#FFC531"/><stop offset="1" stopColor="#F2A100"/>
      </linearGradient>
      <clipPath id={id('inner')}><circle cx="40" cy="40" r="29"/></clipPath>
    </defs>
    {/* profundidade + aro dourado */}
    <circle cx="40" cy="43" r="37" fill="#13213D"/>
    <circle cx="40" cy="40" r="37" fill={`url(#${id('ring')})`} stroke="#13213D" strokeWidth="3"/>
    <circle cx="40" cy="40" r="30.5" fill="#13213D"/>
    {/* céu e gramado dentro do emblema */}
    <g clipPath={`url(#${id('inner')})`}>
      <rect x="0" y="0" width="80" height="80" fill={`url(#${id('sky')})`}/>
      {[18, 30, 42, 54, 66].map(x => <rect key={x} x={x} y="50" width="6" height="30" fill="#ffffff14"/>)}
      <ellipse cx="40" cy="50.5" rx="34" ry="2" fill="#ffffff55"/>
      {/* raios atrás da taça */}
      {Array.from({ length: 8 }, (_, i) => <path key={i} d="M40 34 L36.5 4 L43.5 4Z" fill="#fff" opacity=".16" transform={`rotate(${i * 45 - 90 + 22.5} 40 34)`}/>)}
    </g>
    {/* metade de baixo da bolinha (berço da taça) */}
    <path d="M24 53a16 16 0 0 0 32 0Z" fill={`url(#${id('ball')})`} stroke="#13213D" strokeWidth="2.4" strokeLinejoin="round"/>
    <ellipse cx="40" cy="53" rx="16" ry="3.4" fill="#0F6B33" stroke="#13213D" strokeWidth="2.4"/>
    {/* taça saindo da bolinha (maior que o berço: a taça é o protagonista) */}
    <g transform="translate(40 50) scale(1.22) translate(-40 -47)">
    <path d="M30.5 26h19v8.5c0 6.5-4.2 11-9.5 11s-9.5-4.5-9.5-11Z" fill={`url(#${id('cup')})`} stroke="#13213D" strokeWidth="2.2" strokeLinejoin="round"/>
    <path d="M30.5 28.5h-3.4c-1.6 0-2.3 1.4-1.8 3.3.7 2.9 2.9 4.9 5.8 5.4M49.5 28.5h3.4c1.6 0 2.3 1.4 1.8 3.3-.7 2.9-2.9 4.9-5.8 5.4" fill="none" stroke="#13213D" strokeWidth="2.2" strokeLinecap="round"/>
    <rect x="37.5" y="45" width="5" height="4" fill={`url(#${id('cup')})`} stroke="#13213D" strokeWidth="1.8"/>
    <path d="M34 28.5h3v6.5c0 3 .9 5.5 2.6 7.1-3.3-.7-5.6-3.6-5.6-7.3Z" fill="#fff" opacity=".6"/>
    </g>
    {/* metade de cima da bolinha, aberta */}
    <g transform="rotate(-32 21 23)">
      <path d="M8 23a14 14 0 0 1 28 0Z" fill={`url(#${id('ball')})`} stroke="#13213D" strokeWidth="2.4" strokeLinejoin="round"/>
      <ellipse cx="17" cy="16" rx="4.5" ry="2.2" fill="#fff" opacity=".55" transform="rotate(-20 17 16)"/>
    </g>
    {/* brilhos */}
    <path d="M61 15l1.5 3.3 3.6.4-2.7 2.5.8 3.6-3.2-1.8-3.2 1.8.8-3.6-2.7-2.5 3.6-.4Z" fill="#FFF3B0" stroke="#13213D" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M57 32l.8 1.7 1.8.2-1.4 1.3.4 1.8-1.6-.9-1.6.9.4-1.8-1.4-1.3 1.8-.2Z" fill="#fff"/>
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
