/**
 * Ilustrações próprias em SVG (identidade "Dia de jogo", estilo cartoon): ícones das categorias, troféus,
 * bolinhas de sorteio, bola de futebol e cenário de estádio. Regra visual comum: contorno de tinta (INK),
 * cor chapada, profundidade sólida embaixo e um brilho no alto. Nada de imagens de terceiros.
 */
import { useId } from 'react';
import type { CategoryId } from './categories';
import { CATEGORY_THEME } from './theme';

/** Tinta dos contornos (mesma do mascote e do logo). */
export const INK = '#13213D';

function starPoints(cx: number, cy: number, r: number, inner = 0.45) {
  return Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? r : r * inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as const;
  });
}
const star = (cx: number, cy: number, r: number) => starPoints(cx, cy, r).map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
const starPath = (cx: number, cy: number, r: number) => `M${starPoints(cx, cy, r).map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`;

/** Silhueta de escudo de clube (topo com ressalto central), usada no ícone e no troféu de Escudos. */
const CREST = 'M7 8h9l4-4h8l4 4h9l2 3v11c0 11.5-7.6 18.5-18 22C13.6 40.5 6 33.5 6 22V11Z';

/** Ícone da categoria desenhado num quadro 48×48 (preenchimento = currentColor). */
export function GlyphPaths({ id }: { id: CategoryId }) {
  switch (id) {
    case 'brasileiro': // losango com círculo vazado
      return <path fillRule="evenodd" d="M24 5 43 24 24 43 5 24Z M24 16a8 8 0 1 0 0 16a8 8 0 1 0 0-16Z"/>;
    case 'europeu': // arco de estrelas sobre uma faixa
      return <g>{[[9, 27], [16.5, 16], [24, 11.5], [31.5, 16], [39, 27]].map(([x, y]) => <polygon key={`${x}-${y}`} points={star(x, y, 6.2)}/>)}<rect x="9" y="34" width="30" height="6" rx="3"/></g>;
    case 'sulamericano': // cordilheira e sol
      return <g><circle cx="35" cy="12" r="5.5"/><path d="M3 41 17 15l8 13 5-7 15 20Z"/></g>;
    case 'selecoes': // camisa
      return <path d="M17 6 9 10 3 19l6 6 3-3v20h24V22l3 3 6-6-6-9-8-4c-1.5 3.6-4 5.5-7 5.5S18.5 9.6 17 6Z"/>;
    case 'escudos': // silhueta de escudo de clube com estrela vazada
      return <path fillRule="evenodd" d={`${CREST} ${starPath(24, 21, 8.5)}`}/>;
    case 'estadios': // estádio de frente: arquibancada em arco, dois refletores e o portão de entrada
      return <g>
        <path fillRule="evenodd" d="M4 27c6-6 13-9 20-9s14 3 20 9v15H4Z M19 42v-6.5a5 5 0 0 1 10 0V42Z M9 29.5c4.5-3.8 9.5-5.6 15-5.6s10.5 1.8 15 5.6v2.6c-4.5-3.4-9.5-5-15-5s-10.5 1.6-15 5Z"/>
        <rect x="5" y="9" width="3.4" height="17"/><rect x="39.6" y="9" width="3.4" height="17"/>
        <rect x="2" y="5" width="9.4" height="6" rx="1.5"/><rect x="36.6" y="5" width="9.4" height="6" rx="1.5"/>
      </g>;
  }
}

export function CategoryGlyph({ id, size = 24, color = 'currentColor', title }: { id: CategoryId; size?: number; color?: string; title?: string }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill={color} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
    <GlyphPaths id={id}/>
  </svg>;
}

const SHIELD = 'M24 3 44 8.5V26c0 14-9.5 22.5-20 26C13.5 48.5 4 40 4 26V8.5Z';

/** Conteúdo do escudo da categoria no quadro 48×56 (reaproveitado no ícone e no emblema dos troféus). */
function BadgeArt({ id, fill, depth, glyph, ink, outline = 3 }: { id: CategoryId; fill: string; depth: string; glyph: string; ink: string; outline?: number }) {
  return <>
    <path d={SHIELD} transform="translate(0 3.5)" fill={depth} stroke={ink} strokeWidth={outline} strokeLinejoin="round"/>
    <path d={SHIELD} fill={fill} stroke={ink} strokeWidth={outline} strokeLinejoin="round"/>
    <path d="M24 7 40.5 11.5v5C33 13.5 21 13 7.5 16.5v-5Z" fill="#fff" opacity=".28"/>
    <svg x="10" y="12" width="28" height="28" viewBox="0 0 48 48">
      <g fill={glyph} stroke={ink} strokeWidth="5" strokeLinejoin="round" paintOrder="stroke"><GlyphPaths id={id}/></g>
    </svg>
  </>;
}

/**
 * Ícone da categoria: símbolo branco com contorno dentro de um escudo colorido (estrutura uniforme para as seis).
 * `variant="mono"` desenha só contorno e símbolo em currentColor (textos, estados desabilitados, impressão).
 */
export function CategoryBadge({ id, size = 40, variant = 'color', title }: { id: CategoryId; size?: number; variant?: 'color' | 'mono'; title?: string }) {
  const theme = CATEGORY_THEME[id];
  const a11y = { role: title ? 'img' : undefined, 'aria-label': title, 'aria-hidden': title ? undefined : true } as const;
  if (variant === 'mono') {
    return <svg className="gd-badge" width={size} height={size * 1.17} viewBox="-2 -2 52 60" {...a11y}>
      <path d={SHIELD} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
      <svg x="11" y="13" width="26" height="26" viewBox="0 0 48 48" fill="currentColor"><GlyphPaths id={id}/></svg>
    </svg>;
  }
  return <svg className="gd-badge" width={size} height={size * 1.17} viewBox="-2 -2 52 60" {...a11y}>
    <BadgeArt id={id} fill={theme.color} depth={theme.dark} glyph="#fff" ink={INK}/>
  </svg>;
}

/**
 * Troféu da categoria. Seis formatos próprios (uma família: contorno de tinta, ouro chapado com brilho,
 * a mesma base e o escudo da categoria como emblema), reconhecíveis até no placar em tamanho pequeno.
 * Bloqueado: silhueta cinza. Formatos originais — não reproduzem troféus de competições reais.
 */
export function Trophy({ id, won, size = 56 }: { id: CategoryId; won: boolean; size?: number }) {
  const theme = CATEGORY_THEME[id];
  const ink = won ? INK : '#8D9BB4';
  const gold = won ? '#FFC531' : '#D3DDEA';
  const goldDark = won ? '#E39B00' : '#BCC9DA';
  const shineColor = won ? '#FFF1B3' : '#E8EEF6';
  const line = { stroke: ink, strokeWidth: 2.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  /** Escudo da categoria como emblema (o mesmo ícone das categorias). */
  const emblem = (cx: number, cy: number, w = 17) => <svg x={cx - w / 2} y={cy - w * 0.6} width={w} height={w * 1.17} viewBox="-2 -2 52 60">
    <BadgeArt id={id} fill={won ? theme.color : '#C3CEDD'} depth={won ? theme.dark : '#A9B7CB'} glyph={won ? '#fff' : '#EEF2F8'} ink={ink} outline={4}/>
  </svg>;
  const shine = (d: string) => <path d={d} fill={shineColor} opacity={won ? 0.9 : 0.7}/>;

  const top = (() => {
    switch (id) {
      case 'brasileiro': // taça clássica com alças
        return <>
          <path d="M17 13H9.5C7 13 5.6 15.4 6.3 19c1.2 6 5.4 10 11 11M47 13h7.5c2.5 0 3.9 2.4 3.2 6-1.2 6-5.4 10-11 11" fill="none" stroke={ink} strokeWidth="7" strokeLinecap="round"/>
          <path d="M17 13H9.5C7 13 5.6 15.4 6.3 19c1.2 6 5.4 10 11 11M47 13h7.5c2.5 0 3.9 2.4 3.2 6-1.2 6-5.4 10-11 11" fill="none" stroke={gold} strokeWidth="2.6" strokeLinecap="round"/>
          <path d="M15 6h34v16c0 11.6-7.6 20-17 20S15 33.6 15 22Z" fill={gold} {...line}/>
          <path d="M49 6v16c0 11.6-7.6 20-17 20 6-3 9-10 9-20V6Z" fill={goldDark} opacity=".55"/>
          {shine('M20 9h4v13c0 6 2 10.5 5 13-5.5-1-9-6.2-9-13Z')}
          <rect x="28" y="41" width="8" height="8" fill={gold} {...line}/>
          {emblem(32, 21)}
        </>;
      case 'europeu': // cálice alto, sem alças, com estrela no topo
        return <>
          <polygon points={star(32, 7, 6.5)} fill={gold} {...line}/>
          <path d="M16 13h32l-3.6 15.5C42.7 36 38 40 32 40s-10.7-4-12.4-11.5Z" fill={gold} {...line}/>
          <path d="M48 13l-3.6 15.5C42.7 36 38 40 32 40c4.6-2.4 7.2-6.6 8.4-12.5L43 13Z" fill={goldDark} opacity=".55"/>
          {shine('M21 16h4l2 11.5c.7 4.4 2.3 7.4 4.5 9.4-4.5-.6-7.6-4-8.8-9.4Z')}
          <path d="M29 39h6l1 10h-8Z" fill={gold} {...line}/>
          {emblem(32, 25, 15)}
        </>;
      case 'sulamericano': // bacia larga sobre pedestal
        return <>
          <path d="M5 15h54c0 12.5-11.5 21.5-27 21.5S5 27.5 5 15Z" fill={gold} {...line}/>
          <path d="M59 15c0 12.5-11.5 21.5-27 21.5 13-2.5 20-10 21-21.5Z" fill={goldDark} opacity=".55"/>
          <ellipse cx="32" cy="15" rx="27" ry="5" fill={won ? '#FFE07A' : '#E1E8F1'} {...line}/>
          {shine('M11 20h5c1.5 5 5 9 10 11.5C18.5 30.5 13 26.5 11 20Z')}
          <path d="M27 35h10l-2 14h-6Z" fill={gold} {...line}/>
          {emblem(32, 26, 14)}
        </>;
      case 'selecoes': // bola dourada sobre três hastes (não reproduz o troféu da Copa)
        return <>
          <path d="M23 49c-5-8-3.5-15 4-19M41 49c5-8 3.5-15-4-19M32 49V33" fill="none" stroke={ink} strokeWidth="7.5" strokeLinecap="round"/>
          <path d="M23 49c-5-8-3.5-15 4-19M41 49c5-8 3.5-15-4-19M32 49V33" fill="none" stroke={gold} strokeWidth="3" strokeLinecap="round"/>
          <circle cx="32" cy="19" r="15.5" fill={gold} {...line}/>
          <path d="M45 11a15.5 15.5 0 0 1-20 22.6c9 0 16-6.5 16-15.6 0-2.6-.6-5-1.6-7.1Z" fill={goldDark} opacity=".55"/>
          <ellipse cx="25.5" cy="10.5" rx="5" ry="2.8" fill={shineColor} transform="rotate(-25 25.5 10.5)"/>
          {emblem(32, 20, 15)}
        </>;
      case 'escudos': // grande escudo de clube (mesma silhueta do ícone da categoria) sobre pedestal
        return <>
          <svg x="10" y="1" width="44" height="44" viewBox="0 0 48 48">
            <path d={CREST} fill={gold} stroke={ink} strokeWidth="2.6" strokeLinejoin="round"/>
            <path d="M42 11v11c0 11.5-7.6 18.5-18 22 7-4.5 11-11 11-22V8h5Z" fill={goldDark} opacity=".55"/>
            <path d="M10 11h5v11c0 6.5 2 12 5.5 16C14 34.5 10 29 10 22Z" fill={shineColor} opacity={won ? 0.9 : 0.7}/>
          </svg>
          <rect x="28.5" y="44" width="7" height="5" fill={gold} {...line}/>
          {emblem(32, 23, 15)}
        </>;
      case 'estadios': // coroa de louros: dois ramos que sobem pelos lados, abertos no topo
        return <>
          {[-1, 1].map(side => <g key={side}>
            <path d={side < 0 ? 'M30 44C17 41 11 31 12.5 16' : 'M34 44C47 41 53 31 51.5 16'} fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round"/>
            {Array.from({ length: 5 }, (_, i) => {
              const deg = 250 - i * 28; // de baixo (250°) até perto do topo (138°), sem fechar o círculo
              const rad = (deg * Math.PI) / 180;
              const x = (32 + (side < 0 ? 1 : -1) * 17 * Math.cos(rad)).toFixed(2);
              const y = (27 - 17 * Math.sin(rad)).toFixed(2);
              const angle = side < 0 ? -deg + 20 : deg - 180 - 20; // folha tangente ao ramo, inclinada para fora
              return <ellipse key={i} cx={x} cy={y} rx="3.4" ry="7" fill={gold} stroke={ink} strokeWidth="2" transform={`rotate(${angle.toFixed(1)} ${x} ${y})`}/>;
            })}
          </g>)}
          <rect x="28.5" y="40" width="7" height="9" fill={gold} {...line}/>
          {emblem(32, 26, 17)}
        </>;
    }
  })();

  return <svg width={size} height={size * 1.12} viewBox="0 0 64 72" aria-hidden="true" className={won ? 'gd-trophy gd-trophy--won' : 'gd-trophy'} style={{ overflow: 'visible' }}>
    {top}
    <path d="M18 49h28l2.5 8h-33Z" fill={gold} {...line}/>
    <rect x="11" y="60" width="42" height="10" rx="3" fill={ink}/>
    <rect x="11" y="57" width="42" height="10" rx="3" fill={won ? theme.color : '#C3CEDD'} {...line}/>
    <path d="M14 60h36" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

/**
 * Bolinha de sorteio (como as das cerimônias: esfera de plástico em duas metades), em estilo cartoon:
 * contorno de tinta, cor chapada com brilho e o ícone da categoria em branco. `open` levanta a metade de cima.
 */
export function DrawBall({ id, size = 64, open = false, hidden = false }: { id: CategoryId; size?: number; open?: boolean; hidden?: boolean }) {
  const theme = CATEGORY_THEME[id];
  const half = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const };
  return <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="gd-ball" style={{ overflow: 'visible', opacity: hidden ? 0 : 1 }}>
    {/* metade de baixo, com sombra própria no lado direito */}
    <path d="M6 50a44 44 0 0 0 88 0Z" fill={theme.color} {...half}/>
    <path d="M94 50a44 44 0 0 1-60 41c26 1 43-16 46-41Z" fill={theme.dark} opacity=".5"/>
    {open && <ellipse cx="50" cy="50" rx="44" ry="9" fill={theme.dark} {...half}/>}
    {/* metade de cima (abre) */}
    <g style={{ transform: open ? 'translate(-4px,-34px) rotate(-26deg)' : 'none', transformOrigin: '6px 50px', transition: 'transform .45s cubic-bezier(.3,1.6,.5,1)' }}>
      <path d="M6 50a44 44 0 0 1 88 0Z" fill={theme.color} {...half}/>
      <ellipse cx="32" cy="24" rx="13" ry="6.5" fill="#fff" opacity=".55" transform="rotate(-30 32 24)"/>
      {open && <ellipse cx="50" cy="50" rx="44" ry="7" fill={theme.dark} {...half}/>}
    </g>
    {!open && <path d="M6 50a44 9 0 0 0 88 0" fill="none" stroke={INK} strokeWidth="2.6" opacity=".55"/>}
    {!open && <svg x="27" y="27" width="46" height="46" viewBox="0 0 48 48">
      <g fill="#fff" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" paintOrder="stroke"><GlyphPaths id={id}/></g>
    </svg>}
  </svg>;
}

/** Bola de futebol clássica (gomos pretos e brancos) em estilo cartoon. Usada no "carregando". */
export function SoccerBall({ size = 48 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  const pent = (cx: number, cy: number, r: number, rot: number) => Array.from({ length: 5 }, (_, i) => {
    const a = ((rot + i * 72) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  // gomo central + cinco gomos que "saem" pela borda, ligados por costuras
  const outer = [-90, -18, 54, 126, 198].map(deg => {
    const a = (deg * Math.PI) / 180;
    return { x: 50 + 40 * Math.cos(a), y: 50 + 40 * Math.sin(a), rot: deg + 180 - 90 };
  });
  return <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="gd-soccer-ball">
    <defs><clipPath id={`sb-${uid}`}><circle cx="50" cy="50" r="44"/></clipPath></defs>
    <circle cx="50" cy="50" r="44" fill="#fff"/>
    <g clipPath={`url(#sb-${uid})`}>
      <path d="M94 50a44 44 0 0 1-70 35.5C55 92 86 76 90 40Z" fill="#D5DEEA"/>
      <g stroke={INK} strokeWidth="3" strokeLinecap="round">
        {outer.map((o, i) => <line key={i} x1={50 + 15 * Math.cos(((-90 + i * 72) * Math.PI) / 180)} y1={50 + 15 * Math.sin(((-90 + i * 72) * Math.PI) / 180)} x2={o.x} y2={o.y}/>)}
      </g>
      <polygon points={pent(50, 50, 15, -90)} fill={INK}/>
      {outer.map((o, i) => <polygon key={i} points={pent(o.x, o.y, 14, o.rot)} fill={INK}/>)}
    </g>
    <circle cx="50" cy="50" r="44" fill="none" stroke={INK} strokeWidth="5"/>
    <ellipse cx="33" cy="25" rx="10" ry="5" fill="#fff" opacity=".9" transform="rotate(-32 33 25)"/>
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
