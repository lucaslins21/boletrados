/** /_arte — galeria das ilustrações (só em desenvolvimento) para revisar o visual. */
import type { ReactNode } from 'react';
import { CategoryBadge, DrawBall, Trophy } from './art';
import { Mascot, type MascotMood } from './Mascot';
import { CATEGORY_ORDER, CATEGORY_THEME } from './theme';
import './tokens.css';
import './game.css';

function Row({ title, children }: { title: string; children: ReactNode }) {
  return <section style={{ width: '100%', display: 'grid', gap: 8 }}>
    <span className="gd-kicker">{title}</span>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end' }}>{children}</div>
  </section>;
}

export default function ArtGallery({ extra }: { extra?: ReactNode }) {
  return <div className="gd" style={{ background: 'linear-gradient(#3FA6F2,#BDE6FF)' }}>
    <div className="gd-frame" style={{ maxWidth: 760 }}>
      <div className="gd-panel">
        <h2>Galeria de arte</h2>
        <Row title="ÍCONES DAS CATEGORIAS — COLORIDO">
          {CATEGORY_ORDER.map(id => <div key={id} style={{ display: 'grid', justifyItems: 'center', gap: 4 }}><CategoryBadge id={id} size={52}/><small>{CATEGORY_THEME[id].short}</small></div>)}
        </Row>
        <Row title="ÍCONES — MONOCROMÁTICO E PEQUENO (20 PX)">
          {CATEGORY_ORDER.map(id => <span key={id} style={{ color: 'var(--bt-ink)' }}><CategoryBadge id={id} size={40} variant="mono"/></span>)}
          {CATEGORY_ORDER.map(id => <CategoryBadge key={`s-${id}`} id={id} size={20}/>)}
        </Row>
        <Row title="TROFÉUS — CONQUISTADOS">{CATEGORY_ORDER.map(id => <Trophy key={id} id={id} won size={72}/>)}</Row>
        <Row title="TROFÉUS — BLOQUEADOS">{CATEGORY_ORDER.map(id => <Trophy key={id} id={id} won={false} size={72}/>)}</Row>
        <Row title="TROFÉUS NO PLACAR (18 PX)">
          {CATEGORY_ORDER.map((id, i) => <Trophy key={id} id={id} won={i % 2 === 0} size={18}/>)}
        </Row>
        <Row title="MASCOTE — 5 ESTADOS">
          {(['happy', 'correct', 'wrong', 'victory', 'thinking'] as MascotMood[]).map(m => <div key={m} style={{ display: 'grid', justifyItems: 'center', gap: 2 }}><Mascot mood={m} size={104}/><small>{m}</small></div>)}
        </Row>
        <Row title="MASCOTE PEQUENO (48 PX)">{(['happy', 'correct', 'wrong', 'victory', 'thinking'] as MascotMood[]).map(m => <Mascot key={m} mood={m} size={48}/>)}</Row>
        <Row title="BOLINHAS DE SORTEIO">{CATEGORY_ORDER.map((id, i) => <DrawBall key={id} id={id} size={56} open={i === 5}/>)}</Row>
        {extra}
      </div>
    </div>
  </div>;
}
