import { Link } from 'react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, api } from './api';
import { useSession } from './session';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const FB_SRC = 'https://connect.facebook.net/pt_BR/sdk.js';
const FB_VERSION = 'v26.0';

type GoogleId = {
  initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; ux_mode?: 'popup' }) => void;
  renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
};
type FacebookSdk = {
  init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
  login: (callback: (response: { authResponse?: { accessToken: string } | null }) => void, options: { scope: string }) => void;
};
declare global {
  interface Window { google?: { accounts: { id: GoogleId } }; FB?: FacebookSdk; fbAsyncInit?: () => void }
}

// Sem crossOrigin: o script do Google não envia Access-Control-Allow-Origin e seria bloqueado.
function loadScript(src: string, ready: () => boolean, label: string): Promise<void> {
  if (ready()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const script = existing ?? Object.assign(document.createElement('script'), { src, async: true, defer: true });
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error(`Falha ao carregar o login ${label}.`)), { once: true });
    if (!existing) document.head.appendChild(script);
  });
}

function useLoginResult(onError: (message: string) => void) {
  const { signedIn } = useSession();
  return useCallback((promise: Promise<{ user: Parameters<typeof signedIn>[0] }>) => {
    promise.then(({ user }) => signedIn(user)).catch((e: unknown) => onError(e instanceof ApiError ? e.message : 'Não foi possível entrar.'));
  }, [signedIn, onError]);
}

/** Botão oficial do Google (renderizado pelo Google Identity Services), na largura do contêiner. */
function GoogleButton({ onError }: { onError: (message: string) => void }) {
  const finish = useLoginResult(onError);
  const target = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    loadScript(GIS_SRC, () => !!window.google?.accounts?.id, 'do Google').then(() => {
      if (cancelled || !target.current || !window.google || !GOOGLE_CLIENT_ID) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, ux_mode: 'popup', callback: ({ credential }) => finish(api.googleLogin(credential)) });
      const width = Math.min(400, Math.max(220, Math.round(target.current.getBoundingClientRect().width)));
      window.google.accounts.id.renderButton(target.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: 'pt-BR', width });
    }).catch((e: Error) => onError(e.message));
    return () => { cancelled = true; };
  }, [finish, onError]);
  return <div ref={target} className="login-google"/>;
}

/** Login com Facebook pelo SDK de JavaScript (popup). O FB.login precisa sair direto do clique para não ser bloqueado. */
function FacebookButton({ onError }: { onError: (message: string) => void }) {
  const finish = useLoginResult(onError);
  const [ready, setReady] = useState(() => !!window.FB);
  useEffect(() => {
    if (window.FB) return;
    window.fbAsyncInit = () => {
      window.FB?.init({ appId: FACEBOOK_APP_ID!, cookie: false, xfbml: false, version: FB_VERSION });
      setReady(true);
    };
    loadScript(FB_SRC, () => !!window.FB, 'do Facebook').catch((e: Error) => onError(e.message));
  }, [onError]);
  const login = () => {
    window.FB?.login(response => {
      const token = response.authResponse?.accessToken;
      if (token) finish(api.facebookLogin(token));
    }, { scope: 'public_profile,email' });
  };
  return <button type="button" className="login-btn login-btn--facebook" onClick={login} disabled={!ready}>
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#fff"/><path fill="#1877F2" d="M16.7 15.5 17.2 12h-3.4V9.8c0-1 .5-1.9 2-1.9h1.5v-3s-1.4-.2-2.7-.2c-2.8 0-4.6 1.7-4.6 4.7V12H7v3.5h3V24a12 12 0 0 0 3.8 0v-8.5Z"/></svg>
    Entrar com Facebook
  </button>;
}

/** Login só para desenvolvimento local (a rota /auth/dev não existe em produção). */
function DevLogin({ onError }: { onError: (message: string) => void }) {
  const finish = useLoginResult(onError);
  const [name, setName] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) finish(api.devLogin(name.trim()));
  };
  return <form className="dev-login" onSubmit={submit}>
    <label htmlFor="dev-name" className="sr-only">Login de desenvolvimento</label>
    <input id="dev-name" className="text-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome (login de teste)" maxLength={60} autoComplete="nickname"/>
    <button className="login-btn login-btn--dev" disabled={!name.trim()}>Entrar</button>
  </form>;
}

/** Botões de entrada (Facebook, Google e, no desenvolvimento, login de teste) com a linha dos termos. */
export function LoginButtons() {
  const [error, setError] = useState<string | null>(null);
  const none = !FACEBOOK_APP_ID && !GOOGLE_CLIENT_ID && !import.meta.env.DEV;
  return <div className="login-buttons">
    {FACEBOOK_APP_ID && <FacebookButton onError={setError}/>}
    {GOOGLE_CLIENT_ID && <GoogleButton onError={setError}/>}
    {import.meta.env.DEV && <DevLogin onError={setError}/>}
    {none && <p className="form-error">Login ainda não configurado neste ambiente.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <p className="login-legal">Ao entrar, você concorda com os <Link to="/termos">Termos</Link> e a <Link to="/privacidade">Política de Privacidade</Link>.</p>
  </div>;
}

export function LoginCard({ title = 'Entre para jogar' }: { title?: string }) {
  return <div className="login-card"><h2>{title}</h2><LoginButtons/></div>;
}
