import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { disablePush, enablePush, getPushState, type PushState } from './push';

const TEXT: Record<PushState, string> = {
  loading: 'Verificando…',
  unsupported: 'Este navegador não suporta avisos.',
  'needs-install': 'No iPhone, adicione o Boletrados à tela de início (Compartilhar → Adicionar à Tela de Início) para receber avisos.',
  unconfigured: 'Os avisos ainda não estão configurados neste servidor.',
  denied: 'As notificações estão bloqueadas. Libere nas configurações do site no navegador.',
  disabled: 'Receba um aviso quando for a sua vez e um lembrete antes do prazo de 24 h acabar.',
  enabled: 'Avisos ativados neste aparelho.',
};

export function NotificationsCard() {
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getPushState().then(setState).catch(() => setState('unsupported')); }, []);

  const run = (action: () => Promise<PushState>) => {
    setBusy(true); setError(null);
    action().then(setState).catch(() => setError('Não foi possível alterar os avisos.')).finally(() => setBusy(false));
  };

  return <div className="notifications-card">
    <p className="hint-label">AVISOS DE VEZ</p>
    <p className="notifications-text" aria-live="polite">{busy ? 'Aguarde… a primeira ativação pode levar alguns segundos.' : TEXT[state]}</p>
    {state === 'disabled' && <button className="button button--primary button--full" disabled={busy} onClick={() => run(enablePush)}><Bell size={17}/> Ativar avisos</button>}
    {state === 'enabled' && <button className="button button--ghost button--full" disabled={busy} onClick={() => run(disablePush)}><BellOff size={17}/> Desativar</button>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
