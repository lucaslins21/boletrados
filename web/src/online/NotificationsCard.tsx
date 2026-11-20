import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { disablePush, enablePush, getPushState, type PushState } from './push';

/** Texto curto só quando o aviso não pode ser ligado direto por aqui. */
const HINT: Partial<Record<PushState, string>> = {
  unsupported: 'Este navegador não suporta avisos.',
  'needs-install': 'No iPhone, adicione o Boletrados à tela de início para receber avisos.',
  unconfigured: 'Avisos indisponíveis no momento.',
  denied: 'Notificações bloqueadas nas configurações do navegador.',
};

/** Linha de liga/desliga dos avisos de vez (aparece no menu "Mais"). */
export function NotificationsCard() {
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getPushState().then(setState).catch(() => setState('unsupported')); }, []);

  const run = (action: () => Promise<PushState>) => {
    setBusy(true); setError(null);
    action().then(setState).catch(() => setError('Não foi possível alterar os avisos.')).finally(() => setBusy(false));
  };
  const on = state === 'enabled';
  const toggleable = state === 'enabled' || state === 'disabled';

  return <div className="notify-row">
    <span className="notify-icon">{on ? <Bell size={20}/> : <BellOff size={20}/>}</span>
    <span className="notify-text"><b>Avisos de vez</b>{HINT[state] && <small>{HINT[state]}</small>}{error && <small className="form-error" role="alert">{error}</small>}</span>
    {toggleable && <button role="switch" aria-checked={on} aria-label="Avisos de vez" className={`switch ${on ? 'switch--on' : ''}`} disabled={busy}
      onClick={() => run(on ? disablePush : enablePush)}><span/></button>}
  </div>;
}
