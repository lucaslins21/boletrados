/** Peças decorativas do site: carregando, ilustração da entrada. */
import { motion } from 'framer-motion';
import { DrawBall, SoccerBall, Trophy } from './art';
import { Mascot } from './Mascot';
import { CATEGORY_ORDER } from './theme';

/** "Carregando…" com uma bola de futebol quicando e girando. */
export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return <div className="gd-loader" role="status" aria-live="polite">
    <motion.div animate={{ y: [0, -28, 0], scaleY: [0.9, 1, 0.9] }} transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
        <SoccerBall size={46}/>
      </motion.div>
    </motion.div>
    <motion.span className="gd-loader-shadow" animate={{ scaleX: [1, 0.6, 1], opacity: [0.35, 0.18, 0.35] }} transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut' }}/>
    <p>{label}</p>
  </div>;
}

const SPOTS: [number, number][] = [[16, 52], [40, 60], [64, 52], [28, 30], [54, 28], [76, 36]];

/** Ilustração da tela de entrada: globo do sorteio com as bolinhas e a coleção de taças. */
export function HeroArt({ shelf = true }: { shelf?: boolean }) {
  return <div className="gd-hero-art" aria-hidden="true">
    <div className="gd-globe-wrap gd-hero-globe">
      <div className="gd-globe">
        <div className="gd-globe-balls">
          {CATEGORY_ORDER.map((id, i) => <motion.div key={id} style={{ left: `${SPOTS[i][0] - 10}%`, top: `${SPOTS[i][1] - 10}%`, width: '22%' }}
            animate={{ y: [0, -8, 0], rotate: [0, i % 2 ? 8 : -8, 0] }} transition={{ duration: 2.2 + i * 0.25, repeat: Infinity, ease: 'easeInOut' }}>
            <DrawBall id={id} size={1000}/>
          </motion.div>)}
        </div>
        <div className="gd-globe-shine"/>
      </div>
      <div className="gd-globe-base">SORTEIO</div>
      <motion.div className="gd-hero-mascot" initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 180, damping: 15 }}>
        <Mascot mood="happy" size={96}/>
      </motion.div>
    </div>
    {shelf && <div className="gd-hero-shelf">
      {CATEGORY_ORDER.map((id, i) => <motion.div key={id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 220, damping: 16 }}>
        <Trophy id={id} won={i < 4} size={40}/>
      </motion.div>)}
    </div>}
  </div>;
}
