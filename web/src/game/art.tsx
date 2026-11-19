/**
 * Ilustrações próprias em SVG (identidade "Dia de jogo"): ícones das categorias, taça, bolinha de sorteio
 * e cenário de estádio. Vetores simples, chapados e animáveis — nada de imagens de terceiros.
 */
import { useId } from 'react';
import type { CategoryId } from '../data/questions';
import { CATEGORY_THEME } from './theme';

function star(cx: number, cy: number, r: number) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  });
  return points.join(' ');
}

/** Ícone da categoria desenhado num quadro 48×48 (preenchimento = currentColor). */
export function GlyphPaths({ id }: { id: CategoryId }) {
  switch (id) {
    case 'brasileiro': // losango com círculo vazado
      return <path fillRule="evenodd" d="M24 6 43 24 24 42 5 24Z M24 16a8 8 0 1 0 0 16a8 8 0 1 0 0-16Z"/>;
    case 'europeu': // arco de estrelas
      return <g>{[[10, 26], [17, 16], [24, 12], [31, 16], [38, 26]].map(([x, y]) => <polygon key={`${x}-${y}`} points={star(x, y, 5.6)}/>)}<rect x="9" y="33" width="30" height="5" rx="2.5"/></g>;
    case 'sulamericano': // cordilheira e sol
      return <g><circle cx="35" cy="13" r="5"/><path d="M3 40 17 15l8 13 5-7 15 19Z"/></g>;
    case 'selecoes': // camisa
      return <path d="M17 7 9 11 3 20l6 5 3-3v19h24V22l3 3 6-5-6-9-8-4c-1.5 3.6-4 5.5-7 5.5S18.5 10.6 17 7Z"/>;
    case 'escudos': // escudo com faixa
      return <path fillRule="evenodd" d="M24 5 41 10v13c0 10.5-7 17.5-17 20.5C14 40.5 7 33.5 7 23V10Z M21 10v29h6V10Z"/>;
    case 'estadios': // estádio visto de cima: arquibancada oval e gramado com meio-campo
      return <g><path fillRule="evenodd" d="M24 7c11.6 0 21 7.6 21 17s-9.4 17-21 17S3 33.4 3 24 12.4 7 24 7Z M14 17h20v14H14Z"/><rect x="23" y="17" width="2" height="14"/><circle cx="24" cy="24" r="3"/></g>;
  }
}

export function CategoryGlyph({ id, size = 24, color = 'currentColor', title }: { id: CategoryId; size?: number; color?: string; title?: string }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill={color} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
    <GlyphPaths id={id}/>
  </svg>;
}

/** Selo redondo da categoria (fundo colorido + ícone branco). */
export function CategoryBadge({ id, size = 40 }: { id: CategoryId; size?: number }) {
  const theme = CATEGORY_THEME[id];
  return <span className="gd-badge" style={{ width: size, height: size, background: theme.color, boxShadow: `0 ${Math.max(2, size / 14)}px 0 ${theme.dark}` }} aria-hidden="true">
    <CategoryGlyph id={id} size={size * 0.58} color="#fff"/>
  </span>;
}

/** Taça da coleção. Cinza (silhueta) enquanto não conquistada; dourada com a cor da categoria quando conquistada. */
export function Trophy({ id, won, size = 56 }: { id: CategoryId; won: boolean; size?: number }) {
  const uid = useId().replace(/:/g, '');
  const theme = CATEGORY_THEME[id];
  const gold = `url(#gold-${uid})`;
  const body = won ? gold : '#C5D2E3';
  const edge = won ? '#C98A00' : '#AEBDD1';
  return <svg width={size} height={size * 1.12} viewBox="0 0 64 72" aria-hidden="true" className={won ? 'gd-trophy gd-trophy--won' : 'gd-trophy'}>
    <defs>
      <linearGradient id={`gold-${uid}`} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#FFE47A"/><stop offset=".55" stopColor="#FFC531"/><stop offset="1" stopColor="#F2A100"/>
      </linearGradient>
    </defs>
    <path d="M17 13H9.5C7 13 5.6 15.4 6.3 19c1.2 6 5.4 10 11 11" fill="none" stroke={edge} strokeWidth="4" strokeLinecap="round"/>
    <path d="M47 13h7.5c2.5 0 3.9 2.4 3.2 6-1.2 6-5.4 10-11 11" fill="none" stroke={edge} strokeWidth="4" strokeLinecap="round"/>
    <path d="M15 6h34v16c0 11.6-7.6 20-17 20S15 33.6 15 22Z" fill={body} stroke={edge} strokeWidth="2"/>
    {won && <path d="M21 9h4v13c0 6 2 10.5 5 13-5.5-1-9-6.2-9-13Z" fill="#fff" opacity=".45"/>}
    <rect x="28" y="41" width="8" height="8" fill={body} stroke={edge} strokeWidth="2"/>
    <path d="M19 49h26l2.5 8h-31Z" fill={body} stroke={edge} strokeWidth="2" strokeLinejoin="round"/>
    <rect x="12" y="57" width="40" height="11" rx="3" fill={won ? theme.color : '#B7C5D8'} stroke={won ? theme.dark : '#A3B3C9'} strokeWidth="2"/>
    <circle cx="32" cy="21" r="10" fill={won ? theme.color : '#B4C2D5'} stroke={won ? theme.dark : '#A3B3C9'} strokeWidth="2"/>
    <svg x="24" y="13" width="16" height="16" viewBox="0 0 48 48" fill={won ? '#fff' : '#D9E2EE'}><GlyphPaths id={id}/></svg>
  </svg>;
}

/**
 * Bolinha de sorteio (como as das cerimônias: esfera de plástico em duas metades).
 * Esfera inteira na cor da categoria, ícone branco na frente e emenda discreta. `open` levanta a metade de cima.
 */
export function DrawBall({ id, size = 64, open = false, hidden = false }: { id: CategoryId; size?: number; open?: boolean; hidden?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const theme = CATEGORY_THEME[id];
  const fill = `url(#ball-${uid})`;
  return <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="gd-ball" style={{ overflow: 'visible', opacity: hidden ? 0 : 1 }}>
    <defs>
      <radialGradient id={`ball-${uid}`} gradientUnits="userSpaceOnUse" cx="36" cy="30" r="78">
        <stop offset="0" stopColor="#fff" stopOpacity=".55"/><stop offset=".25" stopColor={theme.color}/><stop offset="1" stopColor={theme.dark}/>
      </radialGradient>
    </defs>
    {/* metade de baixo */}
    <path d="M6 50a44 44 0 0 0 88 0Z" fill={fill}/>
    {open && <ellipse cx="50" cy="50" rx="44" ry="9" fill={theme.dark}/>}
    {/* metade de cima (abre) */}
    <g style={{ transform: open ? 'translate(-4px,-34px) rotate(-26deg)' : 'none', transformOrigin: '6px 50px', transition: 'transform .45s cubic-bezier(.3,1.6,.5,1)' }}>
      <path d="M6 50a44 44 0 0 1 88 0Z" fill={fill}/>
      {open && <ellipse cx="50" cy="50" rx="44" ry="7" fill={theme.dark}/>}
    </g>
    {!open && <path d="M6 50a44 9 0 0 0 88 0" fill="none" stroke={theme.dark} strokeWidth="2.2" opacity=".6"/>}
    {!open && <svg x="29" y="29" width="42" height="42" viewBox="0 0 48 48" fill="#fff" opacity=".96"><GlyphPaths id={id}/></svg>}
  </svg>;
}

/** Cenário: céu, arquibancada com torcida e gramado listrado. Fica fixo atrás do conteúdo. */
export function StadiumScene() {
  const uid = useId().replace(/:/g, '');
  const crowd = ['#F6C343', '#EF4444', '#ffffff', '#2F6FED', '#22B357', '#FF8A1F'];
  return <div className="gd-scene" aria-hidden="true">
    <div className="gd-sky"/>
    <svg className="gd-stands" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice">
      <defs>
        <pattern id={`crowd-${uid}`} width="36" height="16" patternUnits="userSpaceOnUse">
          {crowd.map((c, i) => <circle key={c} cx={3 + i * 6} cy={(i % 2) * 6 + 5} r="2.6" fill={c} opacity=".85"/>)}
        </pattern>
      </defs>
      <path d="M0 120 Q600 40 1200 120 V300 H0Z" fill="#1E3A6B"/>
      <path d="M0 130 Q600 52 1200 130 V300 H0Z" fill={`url(#crowd-${uid})`}/>
      <path d="M0 215 Q600 160 1200 215 V300 H0Z" fill="#183059"/>
      <path d="M0 222 Q600 168 1200 222 V300 H0Z" fill={`url(#crowd-${uid})`} opacity=".7"/>
      <rect x="0" y="282" width="1200" height="18" fill="#12264A"/>
      {[90, 330, 870, 1110].map(x => <g key={x}><rect x={x - 3} y="10" width="6" height="110" fill="#9FB3CF"/><rect x={x - 26} y="2" width="52" height="20" rx="4" fill="#E9F2FF"/><rect x={x - 20} y="6" width="40" height="12" rx="2" fill="#FFF8D6"/></g>)}
    </svg>
    <div className="gd-pitch"><div className="gd-pitch-line"/></div>
  </div>;
}

/** Raios girando atrás de troféus e conquistas. */
export function Rays({ color = '#FFE680' }: { color?: string }) {
  return <svg className="gd-rays" viewBox="-100 -100 200 200" aria-hidden="true">
    {Array.from({ length: 16 }, (_, i) => <path key={i} d="M0 0 L-9 -100 L9 -100Z" fill={color} opacity={i % 2 ? 0.25 : 0.45} transform={`rotate(${i * 22.5})`}/>)}
  </svg>;
}
