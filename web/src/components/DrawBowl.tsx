import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { CATEGORIES, type CategoryId } from '../data/questions';

export function DrawBowl({ isSpinning, revealed, compact = false }: { isSpinning: boolean; revealed: CategoryId | null; compact?: boolean }) {
  const positions = [[18, 34], [42, 22], [68, 34], [25, 66], [52, 61], [75, 69]];
  const chosen = CATEGORIES.find(category => category.id === revealed);
  return (
    <div className={`draw-visual ${compact ? 'draw-visual--compact' : ''}`} role="img" aria-label="Globo com seis bolinhas de sorteio">
      <div className="draw-halo" />
      <motion.div className="bowl-shell"
        animate={isSpinning ? { rotate: [0, -6, 5, -4, 0] } : { rotate: 0 }}
        transition={isSpinning ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.5 }}>
        <div className="bowl-shine" />
        {CATEGORIES.map((category, index) => (
          <motion.div key={category.id} className="draw-ball"
            style={{ '--ball-color': category.color, left: `${positions[index][0]}%`, top: `${positions[index][1]}%` } as CSSProperties}
            animate={isSpinning ? { x: [0, 14, -12, 8, 0], y: [0, -24, 12, -8, 0], rotate: [0, 28, -18, 12, 0] } : { y: [0, -4, 0] }}
            transition={{ duration: isSpinning ? 0.62 : 2.5 + index * 0.18, repeat: Infinity, ease: 'easeInOut', delay: isSpinning ? 0 : index * 0.12 }}>
            <span>{category.icon}</span>
          </motion.div>
        ))}
        <div className="bowl-glass" />
      </motion.div>
      <div className="bowl-pedestal"><span>BOLETRADOS • SORTEIO</span></div>
      {chosen && <motion.div initial={{ opacity: 0, y: 25, scale: 0.84 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="draw-reveal" key={chosen.id}>
        <span>{chosen.icon}</span><span>{chosen.short}</span>
      </motion.div>}
      <div className="draw-floor" />
    </div>
  );
}
