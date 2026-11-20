import { useCallback, useState } from 'react';
import { Check } from 'lucide-react';
import { ApiError, api, type ApiUser, type LoginProvider } from './api';
import { FACEBOOK_APP_ID, FacebookButton, GOOGLE_CLIENT_ID, GoogleButton } from './LoginCard';
import { useSession } from './session';

const LABEL: Record<LoginProvider, string> = { google: 'Google', facebook: 'Facebook' };

/** Contas conectadas: entrar pelo Google ou pelo Facebook abre a mesma conta do jogo. */
export function ConnectedAccounts() {
  const { user, signedIn } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const providers = user?.providers ?? [];
  const run = useCallback((promise: Promise<{ user: ApiUser }>, success: string) => {
    setError(null); setDone(null);
    promise.then(({ user: next }) => { signedIn(next); setDone(success); })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Não foi possível concluir.'));
  }, [signedIn]);
  const available: LoginProvider[] = (['google', 'facebook'] as const).filter(p => (p === 'google' ? GOOGLE_CLIENT_ID : FACEBOOK_APP_ID) || providers.includes(p));
  if (!user || !available.length) return null;

  return <section className="accounts" aria-labelledby="accounts-title">
    <h2 id="accounts-title" className="match-group-title">Contas conectadas</h2>
    <ul className="accounts-list">{available.map(provider => {
      const linked = providers.includes(provider);
      return <li key={provider} className="accounts-row">
        <span className="accounts-name">{LABEL[provider]}</span>
        {linked
          ? <>
            <span className="accounts-on"><Check size={16}/> Conectado</span>
            {providers.length > 1 && <button className="text-action" onClick={() => run(api.unlinkProvider(provider), `${LABEL[provider]} desconectado.`)}>Desconectar</button>}
          </>
          : provider === 'google'
            ? <GoogleButton onCredential={credential => run(api.linkGoogle(credential), 'Google conectado.')} onError={setError}/>
            : <FacebookButton label="Conectar Facebook" onToken={token => run(api.linkFacebook(token), 'Facebook conectado.')} onError={setError}/>}
      </li>;
    })}</ul>
    <p className="accounts-hint">Com as duas conectadas, entrar por qualquer uma abre esta mesma conta.</p>
    {done && <p className="accounts-done" role="status">{done}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
