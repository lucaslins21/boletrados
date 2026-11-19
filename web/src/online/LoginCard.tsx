import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import { Banner } from '../components/ui';
import { ApiError, api } from './api';
import { useSession } from './session';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GIS_SRC = 'https://accounts.google.com/gsi/client';

type GoogleId = {
  initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; ux_mode?: 'popup' }) => void;
  renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
};
declare global {
  interface Window { google?: { accounts: { id: GoogleId } } }
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    const script = existing ?? Object.assign(document.createElement('script'), { src: GIS_SRC, async: true, defer: true });
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Falha ao carregar o login do Google.')), { once: true });
    if (!existing) document.head.appendChild(script);
  });
}

function GoogleButton({ onError }: { onError: (message: string) => void }) {
  const { signedIn } = useSession();
  const target = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    loadGoogleScript().then(() => {
      if (cancelled || !target.current || !window.google || !GOOGLE_CLIENT_ID) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        ux_mode: 'popup',
        callback: ({ credential }) => {
          api.googleLogin(credential).then(({ user }) => signedIn(user)).catch((e: unknown) => onError(e instanceof ApiError ? e.message : 'Não foi possível entrar.'));
        },
      });
      window.google.accounts.id.renderButton(target.current, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', locale: 'pt-BR' });
    }).catch((e: Error) => onError(e.message));
    return () => { cancelled = true; };
  }, [signedIn, onError]);
  return <div ref={target} className="google-button-slot"/>;
}

/** Formulário de login só para desenvolvimento local (a rota /auth/dev não existe em produção). */
function DevLogin({ onError }: { onError: (message: string) => void }) {
  const { signedIn } = useSession();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    api.devLogin(name.trim()).then(({ user }) => signedIn(user))
      .catch((e: unknown) => onError(e instanceof ApiError ? e.message : 'Não foi possível entrar.'))
      .finally(() => setBusy(false));
  };
  return <form className="dev-login" onSubmit={submit}>
    <label htmlFor="dev-name">Login de desenvolvimento</label>
    <div className="dev-login-row">
      <input id="dev-name" className="text-input" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome (ex.: Alice)" maxLength={60} autoComplete="nickname"/>
      <button className="button button--primary" disabled={busy || !name.trim()}><LogIn size={17}/> Entrar</button>
    </div>
  </form>;
}

export function LoginCard({ title = 'Entre para jogar', subtitle }: { title?: string; subtitle?: string }) {
  const [error, setError] = useState<string | null>(null);
  return <div className="login-card">
    <h2>{title}</h2>
    {subtitle && <p className="screen-subtitle">{subtitle}</p>}
    {GOOGLE_CLIENT_ID ? <GoogleButton onError={setError}/> : !import.meta.env.DEV && <Banner>Login com Google ainda não configurado neste ambiente.</Banner>}
    {import.meta.env.DEV && <DevLogin onError={setError}/>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
