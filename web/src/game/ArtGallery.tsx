/** /_arte — galeria das ilustrações (só em desenvolvimento) para revisar o visual. */
import { CategoryBadge, CategoryGlyph, DrawBall, Rays, StadiumScene, Trophy } from './art';
import { CATEGORY_ORDER, CATEGORY_THEME } from './theme';
import './game.css';

export default function ArtGallery() {
  return <div className="gd"><StadiumScene/>
    <div className="gd-frame">
      <div className="gd-panel">
        <h2>Galeria</h2>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {CATEGORY_ORDER.map(id => <div key={id} style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
            <CategoryBadge id={id} size={48}/><CategoryGlyph id={id} size={28} color={CATEGORY_THEME[id].color}/><small>{CATEGORY_THEME[id].short}</small>
          </div>)}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {CATEGORY_ORDER.map(id => <Trophy key={id} id={id} won size={52}/>)}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {CATEGORY_ORDER.map(id => <Trophy key={id} id={id} won={false} size={52}/>)}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {CATEGORY_ORDER.map((id, i) => <DrawBall key={id} id={id} size={58} open={i === 5}/>)}
        </div>
        <div style={{ position: 'relative', width: 200, height: 160, overflow: 'hidden', background: '#0E2A5A', borderRadius: 16 }}>
          <div style={{ transform: 'scale(.5)', transformOrigin: 'top left', width: 400 }}><Rays/></div>
        </div>
        <button className="gd-btn">Sortear</button>
        <button className="gd-btn gd-btn--gold">Disputar troféu</button>
      </div>
    </div>
  </div>;
}
