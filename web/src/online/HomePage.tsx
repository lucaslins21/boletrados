import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Check, Copy, Dumbbell, KeyRound, Plus, Share2, Swords } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Banner, Modal, Pill } from '../components/ui';
import { ApiError, api, inviteUrl, type ApiMatch } from './api';
import { LoginCard } from './LoginCard';
import { finishedText, initials, me, opponent, timeLeft } from './format';
import { pendingInvite, useSession } from './session';

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
  return <section className="online-welcome">
    <div className="online-welcome-copy">
      <Pill tone="lime"><span className="tiny-pulse"/> X1 ONLINE ENTRE AMIGOS</Pill>
      <h1>Quem sabe de <em>futebol</em> merece um troféu.</h1>
      <p>Desafie um amigo por link ou código e jogue no seu tempo. Acerte perguntas, dispute categorias e conquiste os 6 troféus antes dele.</p>
      <Link to="/demo" className="subtle-link"><Dumbbell size={16}/> Treinar na demo, sem login <ArrowRight size={16}/></Link>
    </div>
    <div className="main-card"><LoginCard subtitle="Sua conta guarda suas partidas e as perguntas que você já viu."/></div>
  </section>;
}

function MatchesHome() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<ApiMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [shared, setShared] = useState<{ token: string; code: string } | null>(null);
  const [code, setCode] = useState('');

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
  const joinByCode = (event: FormEvent) => {
    event.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean) navigate(`/convite/${encodeURIComponent(clean.startsWith('BOLA-') ? clean : `BOLA-${clean}`)}`);
  };

  const list = matches ?? [];
  const groups = [
    { title: 'Sua vez', items: list.filter(m => m.status === 'active' && m.turn?.my_turn) },
    { title: 'Vez do adversário', items: list.filter(m => m.status === 'active' && !m.turn?.my_turn) },
    { title: 'Convites aguardando', items: list.filter(m => m.status === 'waiting_opponent') },
    { title: 'Encerradas', items: list.filter(m => m.status === 'finished') },
  ].filter(group => group.items.length);

  return <div className="content-layout">
    <main className="main-card">
      <div className="eyebrow eyebrow--green"><span className="tiny-pulse"/> SEUS X1</div>
      <h1 className="screen-title">Quem você vai desafiar hoje?</h1>
      <p className="screen-subtitle">Até 3 partidas em andamento. Cada vez tem 24 horas para ser jogada.</p>
      <div className="online-actions">
        <button className="button button--primary button--lg" onClick={createInvite} disabled={creating}><Plus size={19}/> Novo desafio</button>
        <form className="code-form" onSubmit={joinByCode}>
          <label htmlFor="invite-code" className="sr-only">Código do convite</label>
          <input id="invite-code" className="text-input" value={code} onChange={e => setCode(e.target.value)} placeholder="BOLA-XXXXXX" autoComplete="off" autoCapitalize="characters"/>
          <button className="button button--ghost" disabled={!code.trim()}><KeyRound size={17}/> Entrar</button>
        </form>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {matches === null && !error && <p className="online-loading" role="status">Carregando partidas…</p>}
      {matches !== null && !groups.length && <Banner icon={<Swords size={17}/>}>Nenhuma partida ainda. Crie um desafio e mande o link para um amigo.</Banner>}
      {groups.map(group => <section key={group.title} className="match-group" aria-label={group.title}>
        <h2 className="match-group-title">{group.title} <span>{group.items.length}</span></h2>
        <ul className="match-list">{group.items.map(m => <li key={m.id}><MatchRow match={m}/></li>)}</ul>
      </section>)}
    </main>
    <aside className="aside-panel"><p className="eyebrow">COMO FUNCIONA</p><h3>Um desafio. Seis troféus.</h3>
      <div className="side-rule"><span className="rule-number">01</span><p>Crie um desafio e mande o link ou o código.</p></div>
      <div className="side-rule"><span className="rule-number">02</span><p>Acertou? Continue. Errou? A vez passa.</p></div>
      <div className="side-rule"><span className="rule-number">03</span><p>Três acertos seguidos valem uma disputa de troféu.</p></div>
      <div className="divider"/>
      <Link to="/demo" className="text-action"><Dumbbell size={15}/> Treinar na demo</Link>
    </aside>
    {shared && <InviteShareModal token={shared.token} code={shared.code} onClose={() => setShared(null)}/>}
  </div>;
}

function MatchRow({ match }: { match: ApiMatch }) {
  const mine = me(match);
  const other = opponent(match);
  const { user } = useSession();
  const detail = match.status === 'waiting_opponent' ? `Código ${match.invite?.code ?? ''} · expira ${match.invite ? timeLeft(match.invite.expires_at) : ''}`
    : match.status === 'finished' ? finishedText(match, user)
    : match.turn?.my_turn ? `Sua vez · prazo ${timeLeft(match.turn.deadline_at)}`
    : `Vez de ${other?.user.display_name} · prazo ${match.turn ? timeLeft(match.turn.deadline_at) : ''}`;
  return <Link to={`/partidas/${match.id}`} className={`match-row ${match.turn?.my_turn && match.status === 'active' ? 'match-row--my-turn' : ''}`}>
    <span className="player-avatar player-avatar--1" aria-hidden="true">{initials(other?.user.display_name ?? '?')}</span>
    <span className="match-row-main">
      <strong>{other ? `vs ${other.user.display_name}` : 'Aguardando adversário'}</strong>
      <small>{detail}</small>
    </span>
    {match.status !== 'waiting_opponent' && <span className="match-row-score" aria-label={`Troféus: você ${mine?.trophies.length ?? 0}, adversário ${other?.trophies.length ?? 0}`}>
      {mine?.trophies.length ?? 0}<i>×</i>{other?.trophies.length ?? 0}
    </span>}
    <ArrowRight size={18} aria-hidden="true"/>
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
    <Pill tone="lime">DESAFIO CRIADO</Pill>
    <h2>Agora é só chamar o amigo.</h2>
    <p>Mande o link ou o código. O convite vale por 7 dias e a partida começa quando ele aceitar.</p>
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
