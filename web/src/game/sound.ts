/**
 * Efeitos sonoros sintetizados com a Web Audio API — nenhum arquivo de áudio, nenhum direito de terceiros.
 * O áudio só começa depois de um toque do usuário (regra dos navegadores); a preferência fica no aparelho.
 */
const STORAGE_KEY = 'boletrados:sound';
type Ctx = AudioContext;
let ctx: Ctx | null = null;
const listeners = new Set<(on: boolean) => void>();

export function soundEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) !== 'off'; } catch { return true; }
}

export function setSoundEnabled(on: boolean) {
  try { localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off'); } catch { /* armazenamento indisponível */ }
  listeners.forEach(fn => fn(on));
  if (on) sfx.tap();
}

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// O mesmo efeito não toca duas vezes seguidas (ex.: efeitos do React rodando em dobro no modo de desenvolvimento).
const lastPlayed = new Map<string, number>();
function once(name: string, gapMs = 150) {
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? -Infinity) < gapMs) return false;
  lastPlayed.set(name, now);
  return true;
}

function audio(name?: string): Ctx | null {
  if (!soundEnabled() || typeof window === 'undefined') return null;
  if (name && !once(name)) return null;
  const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  try {
    ctx ??= new AudioCtor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type ToneOptions = { type?: OscillatorType; gain?: number; slideTo?: number; attack?: number };

/** Uma nota com envelope curto (ataque rápido, decaimento suave). `at` em segundos a partir de agora. */
function tone(a: Ctx, freq: number, at: number, duration: number, { type = 'sine', gain = 0.16, slideTo, attack = 0.008 }: ToneOptions = {}) {
  const start = a.currentTime + at;
  const osc = a.createOscillator();
  const env = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(env).connect(a.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Estalo curto de ruído (bolinhas de plástico batendo). */
function click(a: Ctx, at: number, { gain = 0.12, freq = 2400 } = {}) {
  const start = a.currentTime + at;
  const length = Math.floor(a.sampleRate * 0.03);
  const buffer = a.createBuffer(1, length, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  const source = a.createBufferSource();
  source.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 3;
  const env = a.createGain();
  env.gain.value = gain;
  source.connect(filter).connect(env).connect(a.destination);
  source.start(start);
}

// Notas (Hz)
const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G4 = 392, A5 = 880;

export const sfx = {
  /** Toque leve de botão. */
  tap() { const a = audio('tap'); if (a) tone(a, 660, 0, 0.06, { type: 'triangle', gain: 0.08 }); },

  /** Bolinhas chacoalhando no globo (duração em ms). */
  spin(durationMs = 1400) {
    const a = audio('spin'); if (!a) return;
    const count = Math.round(durationMs / 70);
    for (let i = 0; i < count; i++) click(a, i * 0.07 + Math.random() * 0.03, { gain: 0.06 + Math.random() * 0.07, freq: 1800 + Math.random() * 1600 });
  },

  /** A bolinha abre: "pop" + brilho subindo. */
  reveal() {
    const a = audio('reveal'); if (!a) return;
    tone(a, 220, 0, 0.12, { type: 'triangle', gain: 0.2, slideTo: 520 });
    [C5, E5, G5, C6].forEach((f, i) => tone(a, f, 0.1 + i * 0.06, 0.25, { type: 'sine', gain: 0.1 }));
  },

  /** Acerto: "plim" subindo. */
  correct() {
    const a = audio('correct'); if (!a) return;
    tone(a, E5, 0, 0.16, { type: 'triangle', gain: 0.18 });
    tone(a, A5, 0.1, 0.32, { type: 'triangle', gain: 0.18 });
  },

  /** Erro / tempo esgotado: som grave descendo. */
  wrong() {
    const a = audio('wrong'); if (!a) return;
    tone(a, 220, 0, 0.22, { type: 'square', gain: 0.07, slideTo: 150 });
    tone(a, 165, 0.18, 0.35, { type: 'square', gain: 0.06, slideTo: 110 });
  },

  /** Tique dos últimos segundos do cronômetro. */
  tick(urgent = false) { const a = audio('tick'); if (a) tone(a, urgent ? 1180 : 980, 0, 0.05, { type: 'square', gain: 0.045 }); },

  /** Conquista de troféu: fanfarra curta. */
  trophy() {
    const a = audio('trophy'); if (!a) return;
    [G4, C5, E5, G5].forEach((f, i) => tone(a, f, i * 0.09, 0.18, { type: 'triangle', gain: 0.16 }));
    [C6, E6].forEach((f, i) => tone(a, f, 0.4 + i * 0.02, 0.6, { type: 'triangle', gain: 0.12 }));
  },

  /** Vitória: fanfarra maior. */
  victory() {
    const a = audio('victory'); if (!a) return;
    const notes = [C5, C5, C5, E5, G5, E5, G5, C6];
    const times = [0, 0.14, 0.28, 0.42, 0.62, 0.82, 0.96, 1.12];
    notes.forEach((f, i) => tone(a, f, times[i], i === notes.length - 1 ? 0.9 : 0.16, { type: 'triangle', gain: 0.15 }));
    tone(a, G5, 1.12, 0.9, { type: 'sine', gain: 0.08 });
    tone(a, E6, 1.12, 0.9, { type: 'sine', gain: 0.05 });
  },
};
