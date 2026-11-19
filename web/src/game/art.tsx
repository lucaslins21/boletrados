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
    case 'escudos': // brasão: chevron com estrela (a moldura de todos os ícones já é um escudo)
      return <g><polygon points={star(24, 11, 6.5)}/><path d="M5 40 24 21l19 19-6 4-13-13-13 13Z"/></g>;
    case 'estadios': // estádio visto de cima: arquibancada oval e gramado com meio-campo
      return <g><path fillRule="evenodd" d="M24 7c11.6 0 21 7.6 21 17s-9.4 17-21 17S3 33.4 3 24 12.4 7 24 7Z M14 17h20v14H14Z"/><rect x="23" y="17" width="2" height="14"/><circle cx="24" cy="24" r="3"/></g>;
  }
}

export function CategoryGlyph({ id, size = 24, color = 'currentColor', title }: { id: CategoryId; size?: number; color?: string; title?: string }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill={color} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
    <GlyphPaths id={id}/>
  </svg>;
}

const SHIELD = 'M24 2 44 7.5V25c0 14.5-9.5 23.5-20 27C13.5 48.5 4 39.5 4 25V7.5Z';

/**
 * Ícone da categoria: símbolo dentro de uma moldura de escudo (estrutura uniforme para as seis).
 * `variant="mono"` desenha só contorno e símbolo em currentColor (textos, estados desabilitados, impressão).
 */
export function CategoryBadge({ id, size = 40, variant = 'color', title }: { id: CategoryId; size?: number; variant?: 'color' | 'mono'; title?: string }) {
  const theme = CATEGORY_THEME[id];
  const mono = variant === 'mono';
  return <svg className="gd-badge" width={size} height={size * 1.12} viewBox="0 0 48 56" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
    {!mono && <path d={SHIELD} transform="translate(0 3)" fill={theme.dark}/>}
    <path d={SHIELD} fill={mono ? 'none' : theme.color} stroke={mono ? 'currentColor' : '#fff'} strokeWidth={mono ? 3 : 2.5} strokeLinejoin="round"/>
    {!mono && <path d="M24 5.5 40.5 10v6C33 13 22 12.5 7.5 16v-6Z" fill="#fff" opacity=".18"/>}
    <svg x="11" y="12" width="26" height="26" viewBox="0 0 48 48" fill={mono ? 'currentColor' : '#fff'}><GlyphPaths id={id}/></svg>
  </svg>;
}

/**
 * Troféu da categoria. Seis formatos próprios (uma família: mesma base, dourado e emblema na cor da categoria),
 * para serem reconhecíveis até no placar em tamanho pequeno. Cinza (silhueta) enquanto não conquistado.
 * Formatos originais — não reproduzem troféus de competições reais.
 */
export function Trophy({ id, won, size = 56 }: { id: CategoryId; won: boolean; size?: number }) {
  const uid = useId().replace(/:/g, '');
  const theme = CATEGORY_THEME[id];
  const gold = won ? `url(#gold-${uid})` : '#C5D2E3';
  const edge = won ? '#C98A00' : '#AEBDD1';
  const accent = won ? theme.color : '#B4C2D5';
  const accentEdge = won ? theme.dark : '#A3B3C9';
  const stroke = { stroke: edge, strokeWidth: 2, strokeLinejoin: 'round' as const };
  const emblem = (cx: number, cy: number, r = 9) => <>
    <circle cx={cx} cy={cy} r={r} fill={accent} stroke={accentEdge} strokeWidth="2"/>
    <svg x={cx - r * 0.8} y={cy - r * 0.8} width={r * 1.6} height={r * 1.6} viewBox="0 0 48 48" fill={won ? '#fff' : '#D9E2EE'}><GlyphPaths id={id}/></svg>
  </>;
  const shine = (d: string) => (won ? <path d={d} fill="#fff" opacity=".45"/> : null);

  const top = (() => {
    switch (id) {
      case 'brasileiro': // taça clássica com alças
        return <>
          <path d="M17 13H9.5C7 13 5.6 15.4 6.3 19c1.2 6 5.4 10 11 11" fill="none" stroke={edge} strokeWidth="4" strokeLinecap="round"/>
          <path d="M47 13h7.5c2.5 0 3.9 2.4 3.2 6-1.2 6-5.4 10-11 11" fill="none" stroke={edge} strokeWidth="4" strokeLinecap="round"/>
          <path d="M15 6h34v16c0 11.6-7.6 20-17 20S15 33.6 15 22Z" fill={gold} {...stroke}/>
          {shine('M20 9h4v13c0 6 2 10.5 5 13-5.5-1-9-6.2-9-13Z')}
          <rect x="28" y="41" width="8" height="8" fill={gold} {...stroke}/>
          {emblem(32, 21)}
        </>;
      case 'europeu': // cálice alto, sem alças, com estrela no topo
        return <>
          <polygon points={star(32, 6.5, 5.5)} fill={gold} {...stroke}/>
          <path d="M17 12h30l-3.5 16c-1.6 7.2-5.8 11-11.5 11s-9.9-3.8-11.5-11Z" fill={gold} {...stroke}/>
          {shine('M22 15h4l2 12c.7 4.4 2.3 7.6 4.5 9.4-4.5-.6-7.6-4-8.8-9.4Z')}
          <path d="M29 38h6l1 11h-8Z" fill={gold} {...stroke}/>
          {emblem(32, 23, 8)}
        </>;
      case 'sulamericano': // bacia larga sobre pedestal
        return <>
          <path d="M6 15h52c0 12-11 21-26 21S6 27 6 15Z" fill={gold} {...stroke}/>
          <ellipse cx="32" cy="15" rx="26" ry="4.5" fill={won ? '#FFE47A' : '#D3DEEB'} {...stroke}/>
          {shine('M12 19h5c1.5 5 5 9 10 11.5C19.5 30 14 26 12 19Z')}
          <path d="M27 35h10l-2 14h-6Z" fill={gold} {...stroke}/>
          {emblem(32, 25, 7.5)}
        </>;
      case 'selecoes': // bola sobre três hastes (não reproduz o troféu da Copa)
        return <>
          <path d="M23 49c-5-8-3.5-15 4-19M41 49c5-8 3.5-15-4-19M32 49V33" fill="none" stroke={edge} strokeWidth="5" strokeLinecap="round"/>
          <path d="M23 49c-5-8-3.5-15 4-19M41 49c5-8 3.5-15-4-19M32 49V33" fill="none" stroke={won ? '#FFD54A' : '#C5D2E3'} strokeWidth="2.6" strokeLinecap="round"/>
          <circle cx="32" cy="19" r="15" fill={gold} {...stroke}/>
          {won && <ellipse cx="26" cy="10.5" rx="5" ry="2.8" fill="#fff" opacity=".5" transform="rotate(-25 26 10.5)"/>}
          {emblem(32, 20, 8.5)}
        </>;
      case 'escudos': // brasão sobre pedestal
        return <>
          <path d="M32 3 50 8.5V21c0 13-8 21.5-18 25C22 42.5 14 34 14 21V8.5Z" fill={gold} {...stroke}/>
          {shine('M19 12l5-1.6V22c0 7 2.4 12.4 6 15.8C23.6 35.4 19 29.6 19 21Z')}
          <rect x="28.5" y="44" width="7" height="5" fill={gold} {...stroke}/>
          {emblem(32, 22, 8.5)}
        </>;
      case 'estadios': // coroa de louros: dois ramos que sobem pelos lados, abertos no topo
        return <>
          {[-1, 1].map(side => <g key={side}>
            <path d={side < 0 ? 'M30 44C17 41 11 31 12.5 16' : 'M34 44C47 41 53 31 51.5 16'} fill="none" stroke={edge} strokeWidth="2.4" strokeLinecap="round"/>
            {Array.from({ length: 5 }, (_, i) => {
              const deg = 250 - i * 28; // de baixo (250°) até perto do topo (138°), sem fechar o círculo
              const rad = (deg * Math.PI) / 180;
              const x = (32 + (side < 0 ? 1 : -1) * 17 * Math.cos(rad)).toFixed(2);
              const y = (27 - 17 * Math.sin(rad)).toFixed(2);
              // folha tangente ao ramo, levemente inclinada para fora (cara de louro, não de pétala)
              const angle = side < 0 ? -deg + 20 : deg - 180 - 20;
              return <ellipse key={i} cx={x} cy={y} rx="3.2" ry="6.8" fill={gold} stroke={edge} strokeWidth="1.5" transform={`rotate(${angle.toFixed(1)} ${x} ${y})`}/>;
            })}
          </g>)}
          <rect x="28.5" y="40" width="7" height="9" fill={gold} {...stroke}/>
          {emblem(32, 25, 9)}
        </>;
    }
  })();

  return <svg width={size} height={size * 1.12} viewBox="0 0 64 72" aria-hidden="true" className={won ? 'gd-trophy gd-trophy--won' : 'gd-trophy'}>
    <defs>
      <linearGradient id={`gold-${uid}`} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#FFE47A"/><stop offset=".55" stopColor="#FFC531"/><stop offset="1" stopColor="#F2A100"/>
      </linearGradient>
    </defs>
    {top}
    <path d="M19 49h26l2.5 8h-31Z" fill={gold} {...stroke}/>
    <rect x="12" y="57" width="40" height="11" rx="3" fill={accent} stroke={accentEdge} strokeWidth="2"/>
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
