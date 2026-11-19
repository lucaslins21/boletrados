import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowRight, Swords, Trophy } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { CategoryIcon } from '../components/ui';
import { getCategory } from '../data/questions';
import { ApiError, api, type CategoryStat, type HeadToHead, type Profile } from './api';
import { initials } from './format';

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** /perfil (o próprio) e /jogadores/:id (alguém que você já enfrentou). */
export function ProfilePage() {
  const { id = 'me' } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(null); setError(null);
    api.profile(id).then(({ profile }) => setProfile(profile))
      .catch((e: unknown) => setError(e instanceof ApiError && e.status === 404
        ? 'Perfil não disponível. Você só vê o perfil de quem já enfrentou.'
        : 'Não foi possível carregar o perfil.'));
  }, [id]);

  if (error) return <div className="main-card online-narrow"><h1 className="screen-title">Ops.</h1><p className="screen-subtitle">{error}</p>
    <Link to="/" className="button button--primary">Minhas partidas <ArrowRight size={17}/></Link></div>;
  if (!profile) return <p className="online-loading" role="status">Carregando perfil…</p>;

  const { user, summary, is_me: isMe } = profile;
  return <div className="content-layout">
    <main className="main-card profile-card">
      <div className="profile-head">
        <span className="player-avatar player-avatar--0 profile-avatar" aria-hidden="true">{initials(user.display_name)}</span>
        <div><p className="eyebrow eyebrow--green">{isMe ? 'SEU PERFIL' : 'PERFIL DO ADVERSÁRIO'}</p><h1 className="screen-title">{user.display_name}</h1></div>
      </div>

      <dl className="kpi-row">
        <div className="kpi"><dt>Partidas</dt><dd>{summary.played}</dd></div>
        <div className="kpi"><dt>Vitórias</dt><dd>{summary.wins}</dd></div>
        <div className="kpi"><dt>Derrotas</dt><dd>{summary.losses}</dd></div>
        <div className="kpi"><dt>Troféus</dt><dd>{summary.trophies}</dd></div>
      </dl>
      <p className="kpi-note">{summary.played ? `${pct(summary.wins, summary.played)}% de aproveitamento` : 'Nenhuma partida encerrada ainda'}{summary.in_progress ? ` · ${summary.in_progress} em andamento` : ''}{summary.contributions ? ` · ${summary.contributions} pergunta${summary.contributions > 1 ? 's' : ''} aprovada${summary.contributions > 1 ? 's' : ''}` : ''}</p>

      <section aria-labelledby="by-category">
        <h2 id="by-category" className="match-group-title">Acerto por categoria</h2>
        <ul className="meter-list">{profile.categories.map(stat => <CategoryMeter key={stat.category} stat={stat}/>)}</ul>
        <p className="center-hint">Tempo esgotado conta como erro.</p>
      </section>
    </main>
    <aside className="aside-panel">
      {profile.head_to_head && <HeadToHeadCard h2h={profile.head_to_head} opponentName={user.display_name}/>}
      {profile.rivals && <Rivals rivals={profile.rivals}/>}
    </aside>
  </div>;
}

/** Linha de medidor: nome, barra (trilha no tom claro da mesma cor) e valor em texto. */
function CategoryMeter({ stat }: { stat: CategoryStat }) {
  const cat = getCategory(stat.category);
  const accuracy = pct(stat.correct, stat.answered);
  const valueText = stat.answered ? `${accuracy}% de acerto, ${stat.correct} de ${stat.answered} perguntas` : 'nenhuma pergunta ainda';
  return <li className="meter-row" title={`${cat.label}: ${valueText}`}>
    <span className="meter-name"><CategoryIcon id={stat.category} size="sm"/>{cat.short}</span>
    <span className="meter-track" style={{ '--meter-color': cat.color } as CSSProperties}
      role="meter" aria-label={cat.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={accuracy} aria-valuetext={valueText}>
      {stat.answered > 0 && <span className="meter-fill" style={{ width: `${Math.max(accuracy, 2)}%` }}/>}
    </span>
    <span className="meter-figure">{stat.answered ? <><b>{accuracy}%</b> <small>{stat.correct}/{stat.answered}</small></> : <small>—</small>}</span>
    {stat.trophies > 0 && <span className="meter-trophies" aria-label={`${stat.trophies} troféus`}><Trophy size={13} aria-hidden="true"/>{stat.trophies}</span>}
  </li>;
}

function HeadToHeadCard({ h2h, opponentName }: { h2h: HeadToHead; opponentName: string }) {
  return <section aria-labelledby="h2h">
    <p className="eyebrow" id="h2h">CONFRONTO DIRETO</p>
    <div className="h2h-score" aria-label={`Você ${h2h.wins}, ${opponentName} ${h2h.losses}`}>
      <span><b>{h2h.wins}</b><small>Você</small></span><i>×</i><span><b>{h2h.losses}</b><small>{opponentName}</small></span>
    </div>
    {h2h.in_progress > 0 && <p className="kpi-note">{h2h.in_progress} partida{h2h.in_progress > 1 ? 's' : ''} em andamento</p>}
    <div className="divider"/>
    <ul className="h2h-list">{h2h.recent.map(m => <li key={m.match_id}>
      <Link to={`/partidas/${m.match_id}`} className="text-action">
        <span className={`result-dot result-dot--${m.won === null ? 'live' : m.won ? 'win' : 'loss'}`} aria-hidden="true"/>
        {m.won === null ? 'Em andamento' : m.won ? 'Vitória' : 'Derrota'}
        {m.finished_at && <small>{new Date(m.finished_at).toLocaleDateString('pt-BR')}</small>}
        <ArrowRight size={14}/>
      </Link></li>)}</ul>
  </section>;
}

function Rivals({ rivals }: { rivals: NonNullable<Profile['rivals']> }) {
  return <section aria-labelledby="rivals">
    <p className="eyebrow" id="rivals">SEUS RIVAIS</p>
    {!rivals.length && <p className="kpi-note">Crie um desafio para começar a sua lista de rivais.</p>}
    <ul className="rival-list">{rivals.map(r => <li key={r.user.id}>
      <Link to={`/jogadores/${r.user.id}`} className="rival-row">
        <span className="player-avatar player-avatar--1" aria-hidden="true">{initials(r.user.display_name)}</span>
        <span className="rival-name">{r.user.display_name}</span>
        <span className="rival-score" aria-label={`${r.wins} vitórias e ${r.losses} derrotas`}>{r.wins}<i>×</i>{r.losses}</span>
      </Link></li>)}</ul>
    <div className="divider"/>
    <Link to="/" className="text-action"><Swords size={15}/> Novo desafio</Link>
  </section>;
}
