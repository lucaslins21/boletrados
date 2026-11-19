import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, api, type ApiUser } from './api';

type Session = {
  status: 'loading' | 'anonymous' | 'authenticated' | 'offline';
  user: ApiUser | null;
  signedIn: (user: ApiUser) => void;
  signOut: () => Promise<void>;
  retry: () => void;
};

const SessionContext = createContext<Session | null>(null);

const PENDING_INVITE = 'boletrados:pending-invite';

/** Guarda o convite que trouxe o usuário, para continuar o fluxo depois do login. */
export const pendingInvite = {
  get: () => { try { return sessionStorage.getItem(PENDING_INVITE); } catch { return null; } },
  set: (key: string) => { try { sessionStorage.setItem(PENDING_INVITE, key); } catch { /* armazenamento indisponível */ } },
  clear: () => { try { sessionStorage.removeItem(PENDING_INVITE); } catch { /* armazenamento indisponível */ } },
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Session['status']>('loading');
  const [user, setUser] = useState<ApiUser | null>(null);

  const load = useCallback(() => {
    setStatus('loading');
    api.me()
      .then(({ user }) => { setUser(user); setStatus('authenticated'); })
      .catch((error: unknown) => {
        setUser(null);
        setStatus(error instanceof ApiError && error.status === 401 ? 'anonymous' : 'offline');
      });
  }, []);

  useEffect(load, [load]);

  const value = useMemo<Session>(() => ({
    status, user,
    signedIn: (next) => { setUser(next); setStatus('authenticated'); },
    signOut: async () => {
      try { await api.logout(); } finally { setUser(null); setStatus('anonymous'); }
    },
    retry: load,
  }), [status, user, load]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession fora do SessionProvider');
  return session;
}
