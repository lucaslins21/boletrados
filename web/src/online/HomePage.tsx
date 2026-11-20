import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Copy, KeyRound, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router';
import { Banner, Modal } from '../components/ui';
import { ApiError, api, inviteUrl, type ApiMatch } from './api';
import { LoginButtons } from './LoginCard';
import { me, opponent, timeLeft } from './format';
import { pendingInvite, useSession } from './session';
import { HeroArt, Loading } from '../game/Decor';
import { Mascot } from '../game/Mascot';
import { Wordmark } from '../game/Logo';
import { Avatar } from '../game/Avatar';

export function HomePage() {
  const { status } = useSession();
  const navigate = useNavigate();
  // Voltou do login com um convite pendente: retoma o fluxo do convite.
  useEffect(() => {
    const key = status === 'authenticated' ? pendingInvite.get() : null;
    if (key) navigate(`/convite/${encodeURIComponent(key)}`, { replace: true });
  }, [status, navigate]);
  return status === 'authenticated' ? <MatchesHome/> : <Welcome/>;
}

function Welcome() {
  return <section className="welcome">
    <div className="welcome-brand">
      <Wordmark height={58} arc/>
      <p>Quem sabe de bola, joga</p>
    </div>
    <div className="welcome-art"><HeroArt shelf={false}/></div>
    <LoginButtons/>
  </section>;
}

/** Ordem da fileira: sua vez, vez do adversário, convites e encerradas (as mais recentes). */
function sortMatches(list: ApiMatch[]) {
  const rank = (m: ApiMatch) => m.status === 'active' ? (m.turn?.my_turn ? 0 : 1) : m.status === 'waiting_opponent' ? 2 : 3;
  let finished = 0;
  return [...list].sort((a, b) => rank(a) - rank(b) || b.id - a.id).filter(m => m.status !== 'finished' || ++finished <= 6);
}

function MatchesHome() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<ApiMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [shared, setShared] = useState<{ token: string; code: string } | null>(null);
  const [askCode, setAskCode] = useState(false);

  const load = useCallback(() => {
    api.matches().then(({ matches }) => { setMatches(matches); setError(null); })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Não foi possível carregar suas partidas.'));
  }, []);
  useEffect(() => {
    load();
    const timer = window.setInterval(load, 20_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const createInvite = () => {
    setCreating(true);
    api.createInvite()
      .then(({ match, invite_token }) => { setShared({ token: invite_token, code: match.invite!.code }); load(); })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Não foi possível criar o convite.'))
      .finally(() => setCreating(false));
  };

  const list = sortMatches(matches ?? []);
  const myTurn = list.filter(m => m.status === 'active' && m.turn?.my_turn).length;
  const bubble = matches === null ? null : myTurn ? `É a sua vez em ${myTurn === 1 ? '1 partida' : `${myTurn} partidas`}!` : list.length ? 'Bora mais um X1?' : 'Desafia um amigo aí!';

  return <div className="home">
    <div className="home-stage">
      {bubble && <motion.p key={bubble} className="home-bubble" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{bubble}</motion.p>}
      <Mascot mood="happy" size={118}/>
    </div>
    <button className="home-play" onClick={createInvite} disabled={creating}>{creating ? 'Criando…' : 'Desafiar amigo'}</button>
    {error && <p className="form-error home-error" role="alert">{error}</p>}
    <section className="home-matches" aria-label="Suas partidas">
      <div className="home-matches-head"><h2>Suas partidas</h2>{myTurn > 0 && <span className="home-badge">{myTurn} sua vez</span>}</div>
      <div className="match-strip">
        <button className="match-card match-card--code" onClick={() => setAskCode(true)}><KeyRound size={30}/><span>Tenho um código</span></button>
        {matches === null && !error && <div className="match-card match-card--loading"><Loading label=""/></div>}
        {list.map(m => <MatchCard key={m.id} match={m}/>)}
      </div>
    </section>
    {shared && <InviteShareModal token={shared.token} code={shared.code} onClose={() => setShared(null)}/>}
    {askCode && <CodeModal onClose={() => setAskCode(false)} onSubmit={code => navigate(`/convite/${encodeURIComponent(code)}`)}/>}
  </div>;
}

function CodeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean) onSubmit(clean.startsWith('BOLA-') ? clean : `BOLA-${clean}`);
  };
  return <Modal label="Entrar com código" onClose={onClose} className="modal-card--sheet">
    <h2>Código do convite</h2>
    <form className="code-form" onSubmit={submit}>
      <label htmlFor="invite-code" className="sr-only">Código do convite</label>
      <input id="invite-code" className="text-input" value={code} onChange={e => setCode(e.target.value)} placeholder="BOLA-XXXXXX" autoComplete="off" autoCapitalize="characters" autoFocus/>
      <button className="button button--primary" disabled={!code.trim()}>Entrar</button>
    </form>
  </Modal>;
}

/** Cartão de partida na fileira: adversário, placar de troféus e situação. */
function MatchCard({ match }: { match: ApiMatch }) {
  const mine = me(match);
  const other = opponent(match);
  const myTurn = match.status === 'active' && !!match.turn?.my_turn;
  const iWon = match.status === 'finished' && match.winner_seat === match.my_seat;
  const foot = match.status === 'waiting_opponent' ? { text: match.invite?.code ?? 'Convite', tone: 'wait' }
    : match.status === 'finished' ? { text: iWon ? 'Vitória' : 'Derrota', tone: iWon ? 'win' : 'loss' }
    : myTurn ? { text: 'Sua vez', tone: 'go' }
    : { text: match.turn ? `Rival · ${timeLeft(match.turn.deadline_at).replace('em ', '')}` : 'Vez do rival', tone: 'wait' };
  const label = other ? `Partida contra ${other.user.display_name}: ${foot.text}` : `Convite ${match.invite?.code ?? ''}`;
  return <Link to={`/partidas/${match.id}`} className={`match-card ${myTurn ? 'match-card--go' : ''}`} aria-label={label}>
    <span className="match-card-avatar">
      <Avatar user={other?.user ?? { display_name: '?' }} className="player-avatar"/>
      {other && <span className="match-card-score">{mine?.trophies.length ?? 0}-{other.trophies.length}</span>}
    </span>
    <span className="match-card-name">{other?.user.display_name ?? 'Aguardando'}</span>
    <span className={`match-card-foot match-card-foot--${foot.tone}`}>{foot.text}</span>
  </Link>;
}

export function InviteShareModal({ token, code, onClose }: { token: string | null; code: string; onClose: () => void }) {
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const link = token ? inviteUrl(token) : null;
  const message = `Bora um X1 no Boletrados? ${link ?? ''} (código ${code})`.replace('  ', ' ');
  const copy = (text: string, what: 'link' | 'code') => {
    void navigator.clipboard?.writeText(text).then(() => { setCopied(what); window.setTimeout(() => setCopied(null), 1800); });
  };
  const share = () => { void navigator.share?.({ title: 'Boletrados', text: message, url: link ?? undefined }).catch(() => undefined); };
  return <Modal label="Convite criado" onClose={onClose}>
    <h2>Chame seu amigo</h2>
    <p>O convite vale por 7 dias.</p>
    <div className="invite-preview"><span>CÓDIGO</span><strong>{code}</strong>
      <button className="icon-button" onClick={() => copy(code, 'code')} aria-label="Copiar código">{copied === 'code' ? <Check size={18}/> : <Copy size={18}/>}</button></div>
    {link && <div className="share-buttons">
      <button className="button button--primary button--full" onClick={() => copy(link, 'link')}>{copied === 'link' ? <><Check size={18}/> Link copiado</> : <><Copy size={18}/> Copiar link</>}</button>
      <a className="button button--ghost button--full" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Enviar no WhatsApp</a>
      {'share' in navigator && <button className="button button--ghost button--full" onClick={share}><Share2 size={18}/> Compartilhar</button>}
    </div>}
    {!link && <Banner>O link só aparece logo após criar o convite. Use o código, que continua válido.</Banner>}
  </Modal>;
}
