import { Goal } from 'lucide-react';

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? 'brand--small' : ''}`}>
      <div className="brand-icon"><Goal strokeWidth={2.5} size={small ? 21 : 27} /></div>
      <span>bole<span className="brand-accent">trados</span><b className="brand-period">.</b></span>
    </div>
  );
}
