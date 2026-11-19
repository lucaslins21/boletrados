import { useEffect, useState } from 'react';
import { ArrowRight, Swords } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { Banner, Pill } from '../components/ui';
import { ApiError, api, type InvitePreview } from './api';
import { LoginCard } from './LoginCard';
import { initials } from './format';
import { pendingInvite, useSession } from './session';
import { Loading } from '../game/Decor';

const STATUS_TEXT: Record<Exclude<InvitePreview['status'], 'open'>, string> = {
  expired: 'Este convite expirou. Peça um novo ao seu amigo.',
  cancelled: 'Este convite foi cancelado.',
  accepted: 'Este convite já foi aceito.',
};

export function InvitePage() {
  const { key = '' } = useParams();
  const { status, user } = useSession();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.invite(key).then(({ invite }) => setInvite(invite))
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Não foi possível carregar o convite.'));
  }, [key]);

  // Sem login: guarda o convite para continuar depois de entrar.
  // Já logado aqui: o fluxo foi retomado, então o convite pendente não deve mais redirecionar a home.
  useEffect(() => {
    if (status === 'anonymous') pendingInvite.set(key);
    if (status === 'authenticated') pendingInvite.clear();
  }, [status, key]);

  const accept = () => {
    setBusy(true);
    api.acceptInvite(key)
      .then(({ match }) => { pendingInvite.clear(); navigate(`/partidas/${match.id}`); })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Não foi possível aceitar o convite.'))
      .finally(() => setBusy(false));
  };

  const own = invite && user && invite.from.id === user.id;
  return <div className="feedback-shell"><main className="main-card feedback-card">
    <div className="feedback-burst feedback-burst--correct" aria-hidden="true"><Swords size={46}/></div>
    <Pill tone="purple">CONVITE PARA X1</Pill>
    {!invite && !error && <Loading label="Carregando convite…"/>}
    {invite && <>
      <div className="invite-from"><span className="player-avatar player-avatar--0" aria-hidden="true">{initials(invite.from.display_name)}</span>
        <h1 className="screen-title"><b>{invite.from.display_name}</b> te desafiou!</h1></div>
      {invite.status !== 'open' && <Banner>{STATUS_TEXT[invite.status]}</Banner>}
      {invite.status === 'open' && own && <Banner>Este é o seu próprio convite. Mande o link ou o código para um amigo.</Banner>}
      {invite.status === 'open' && !own && status === 'authenticated' &&
        <button className="button button--primary button--lg button--full" onClick={accept} disabled={busy}>Aceitar desafio <ArrowRight size={19}/></button>}
      {invite.status === 'open' && status === 'anonymous' &&
        <LoginCard title="Entre para aceitar" subtitle="Depois do login, é só confirmar o desafio."/>}
    </>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <Link to="/" className="subtle-link">Ir para minhas partidas <ArrowRight size={16}/></Link>
  </main></div>;
}
