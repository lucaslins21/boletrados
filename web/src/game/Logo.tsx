/** Marca do Boletrados: bolinha de sorteio com taça + nome em letras de jogo. Desenho próprio. */
import { useId } from 'react';

export function LogoMark({ size = 44 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="gd-logo-mark">
    <defs>
      <radialGradient id={`lm-${uid}`} gradientUnits="userSpaceOnUse" cx="22" cy="18" r="52">
        <stop offset="0" stopColor="#7BE495"/><stop offset=".35" stopColor="#22B357"/><stop offset="1" stopColor="#11793A"/>
      </radialGradient>
    </defs>
    {/* sombra no chão */}
    <ellipse cx="32" cy="60" rx="18" ry="3" fill="#0E2A5A" opacity=".25"/>
    {/* bolinha de sorteio */}
    <circle cx="32" cy="31" r="27" fill={`url(#lm-${uid})`} stroke="#fff" strokeWidth="3"/>
    <path d="M6 31a26 6 0 0 0 52 0" fill="none" stroke="#0F6B33" strokeWidth="2" opacity=".55"/>
    <ellipse cx="22" cy="16" rx="9" ry="4.5" fill="#fff" opacity=".45" transform="rotate(-24 22 16)"/>
    {/* taça */}
    <path d="M23.5 18h17v8c0 5.8-3.8 10-8.5 10s-8.5-4.2-8.5-10Z" fill="#FFC531" stroke="#D99100" strokeWidth="1.6" strokeLinejoin="round"/>
    <path d="M23.5 20.5h-3.2c-1.4 0-2 1.3-1.6 3 .6 2.6 2.6 4.4 5.2 4.8M40.5 20.5h3.2c1.4 0 2 1.3 1.6 3-.6 2.6-2.6 4.4-5.2 4.8" fill="none" stroke="#FFC531" strokeWidth="2.4" strokeLinecap="round"/>
    <rect x="30" y="35.5" width="4" height="4" fill="#FFC531"/>
    <rect x="25" y="39.5" width="14" height="5" rx="1.6" fill="#fff"/>
    <path d="M27 20.5h2.6v6c0 2.6.8 4.8 2.2 6.2-2.8-.6-4.8-3.2-4.8-6.4Z" fill="#fff" opacity=".55"/>
    {/* estrela */}
    <path d="M50 6.5l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5Z" fill="#FFD23F" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round"/>
  </svg>;
}

/** Marca completa. `size` controla a altura aproximada. */
export function Logo({ size = 40, tagline = false }: { size?: number; tagline?: boolean }) {
  return <span className="gd-logo" style={{ fontSize: size * 0.62 }} aria-label="Boletrados">
    <LogoMark size={size}/>
    <span className="gd-logo-text" aria-hidden="true">
      <span className="gd-logo-word">Bole<span className="gd-logo-gold">trados</span></span>
      {tagline && <small>Quem sabe de bola, joga.</small>}
    </span>
  </span>;
}
