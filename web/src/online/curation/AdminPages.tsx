import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Archive, ArrowLeft, ArrowRight, Check, CornerUpLeft, ExternalLink, Eye, ImageIcon, PenLine, Plus, RotateCcw, ShieldAlert, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { Banner, Modal, Pill } from '../../components/ui';
import { CATEGORIES, getCategory, type CategoryId } from '../../game/categories';
import { ApiError, api, apiUrl, type AdminAction, type AdminQuestion, type QuestionPreview, type QuestionStatus } from '../api';
import { useSession } from '../session';
import { QuestionForm } from './QuestionForm';
import { StatusPill } from './StatusPill';
import { CategoryBadge } from '../../game/art';
import { Loading } from '../../game/Decor';

const TABS: { id: string; label: string; statuses: QuestionStatus[] }[] = [
  { id: 'queue', label: 'Fila', statuses: ['submitted', 'in_review'] },
  { id: 'changes_requested', label: 'Devolvidas', statuses: ['changes_requested'] },
  { id: 'published', label: 'Publicadas', statuses: ['published'] },
  { id: 'archived', label: 'Arquivadas', statuses: ['archived'] },
  { id: 'rejected', label: 'Rejeitadas', statuses: ['rejected'] },
];
const DIFFICULTY_LABEL = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' } as const;
const STATUS_LABEL: Record<QuestionStatus, string> = {
  submitted: 'Enviada', in_review: 'Em análise', changes_requested: 'Devolvida', rejected: 'Rejeitada', published: 'Publicada', archived: 'Arquivada',
};

function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useSession();
  if (!user?.admin) return <div className="main-card online-narrow"><h1 className="screen-title">Página não encontrada.</h1><Link to="/" className="button button--primary">Início</Link></div>;
  return <>{children}</>;
}

/** /admin — fila de moderação e estoque por categoria. */
export function AdminQueuePage() {
  return <AdminOnly><AdminQueue/></AdminOnly>;
}

function AdminQueue() {
  const [tab, setTab] = useState('queue');
  const [category, setCategory] = useState<CategoryId | ''>('');
  const [data, setData] = useState<Awaited<ReturnType<typeof api.adminQuestions>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    api.adminQuestions({ status: tab, category }).then(setData)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Não foi possível carregar a fila.'));
  }, [tab, category]);

  const count = (statuses: QuestionStatus[]) => statuses.reduce((sum, s) => sum + (data?.counts[s] ?? 0), 0);
  return <div className="content-layout">
    <main className="main-card">
      <div className="eyebrow eyebrow--green"><ShieldAlert size={14}/> MODERAÇÃO</div>
      <h1 className="screen-title">Curadoria de perguntas</h1>
      <Banner icon={<Eye size={17}/>}>Abrir uma pergunta conta como “vista”: você nunca a receberá numa partida. A lista mostra só o começo do enunciado.</Banner>
      <div className="admin-toolbar">
        <div className="tabs" role="tablist">{TABS.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'tab tab--on' : 'tab'} onClick={() => setTab(t.id)}>
          {t.label}{data && <span>{count(t.statuses)}</span>}</button>)}</div>
        <label className="sr-only" htmlFor="admin-category">Categoria</label>
        <select id="admin-category" className="text-input select" value={category} onChange={e => setCategory(e.target.value as CategoryId | '')}>
          <option value="">Todas as categorias</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!data && !error && <Loading label="Carregando…"/>}
      {data?.questions.length === 0 && <Banner>Nada por aqui.</Banner>}
      <ul className="match-list">{data?.questions.map(q => <li key={q.id}><QueueRow q={q}/></li>)}</ul>
    </main>
    <aside className="aside-panel">
      <Link to="/admin/perguntas/nova" className="button button--primary button--full"><Plus size={18}/> Cadastrar pergunta</Link>
      <div className="divider"/>
      <p className="eyebrow">ESTOQUE PUBLICADO</p>
      <ul className="stock-list">{CATEGORIES.map(c => <li key={c.id}><CategoryBadge id={c.id} size={26}/><span className="stock-name">{c.short}</span><b>{data?.published_by_category[c.id] ?? '—'}</b></li>)}</ul>
      <p className="kpi-note">Uma pergunta conta em cada uma das suas categorias.</p>
    </aside>
  </div>;
}

function QueueRow({ q }: { q: QuestionPreview }) {
  return <Link to={`/admin/perguntas/${q.id}`} className="match-row">
    <span className="queue-cats">{q.categories.map(c => <CategoryBadge key={c} id={c} size={26}/>)}</span>
    <span className="match-row-main">
      <strong>{q.prompt_preview}{q.has_image && <ImageIcon size={14} aria-label="com imagem" className="inline-icon"/>}</strong>
      <small>#{q.id} · {q.author ?? 'importada'} · {DIFFICULTY_LABEL[q.difficulty]}{q.submitted_at ? ` · enviada em ${new Date(q.submitted_at).toLocaleDateString('pt-BR')}` : ''}</small>
    </span>
    <StatusPill status={q.status} label={q.status_label}/>
    <ArrowRight size={18} aria-hidden="true"/>
  </Link>;
}

/** /admin/perguntas/:id — revisão completa, duplicatas e ações. */
export function AdminQuestionPage() {
  return <AdminOnly><AdminQuestionDetail/></AdminOnly>;
}

function AdminQuestionDetail() {
  const { id = '' } = useParams();
  const [data, setData] = useState<AdminQuestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState<null | 'reject' | 'request_changes' | 'archive'>(null);
  const [notes, setNotes] = useState('');

  const load = useCallback(() => {
    api.adminQuestion(id).then(setData).catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Não foi possível carregar.'));
  }, [id]);
  useEffect(load, [load]);

  const act = async (action: AdminAction, withNotes?: string) => {
    setBusy(true); setError(null);
    try { setData(await api.adminAction(Number(id), action, withNotes)); setAsking(null); setNotes(''); }
    catch (e) { setError(e instanceof ApiError ? ((e.body as { details?: string[] })?.details?.join(' ') || e.message) : 'Falhou.'); }
    finally { setBusy(false); }
  };

  if (error && !data) return <div className="main-card online-narrow"><p className="form-error">{error}</p><Link to="/admin" className="button button--primary">Voltar</Link></div>;
  if (!data) return <Loading label="Carregando…"/>;
  const q = data.question;
  const canDecide = ['submitted', 'in_review', 'changes_requested'].includes(q.status);

  return <div className="content-layout">
    <main className="main-card">
      <Link to="/admin" className="text-action"><ArrowLeft size={15}/> Fila</Link>
      <div className="review-head"><StatusPill status={q.status} label={q.status_label}/><span className="kpi-note">#{q.id} · por {q.author?.display_name ?? 'conteúdo importado'}</span></div>
      {editing
        ? <QuestionForm submitLabel="Salvar edição" initialImagePath={q.image?.path ?? null}
            initial={{ prompt: q.prompt, options: q.options, correct_index: q.correct_index, categories: q.categories, initial_difficulty: q.initial_difficulty, source_url: q.source_url ?? '', explanation: q.explanation, image_key: q.image?.key ?? null }}
            onSubmit={async input => { setData(await api.adminUpdate(q.id, input)); setEditing(false); }}/>
        : <>
          <h1 className="review-prompt">{q.prompt}</h1>
          {q.image && <img className="question-image review-image" src={apiUrl(q.image.path)} alt="Imagem da pergunta"/>}
          <ol className="review-options">{q.options.map((o, i) => <li key={i} className={i === q.correct_index ? 'review-option--correct' : ''}>
            <span aria-hidden="true">{String.fromCharCode(65 + i)}</span>{o}{i === q.correct_index && <><Check size={15} aria-hidden="true"/><span className="sr-only"> (correta)</span></>}</li>)}</ol>
          <dl className="review-meta">
            <div><dt>Categorias</dt><dd>{q.categories.map(c => <span key={c} className="meta-cat"><CategoryBadge id={c} size={26}/>{getCategory(c).short}</span>)}</dd></div>
            <div><dt>Dificuldade</dt><dd>{DIFFICULTY_LABEL[q.difficulty]} <small>(estimada: {DIFFICULTY_LABEL[q.initial_difficulty]})</small></dd></div>
            <div><dt>Fonte</dt><dd>{q.source_url ? <a href={q.source_url} target="_blank" rel="noreferrer noopener">{new URL(q.source_url).hostname} <ExternalLink size={13}/></a> : <em>sem fonte</em>}</dd></div>
            <div><dt>Explicação</dt><dd>{q.explanation}</dd></div>
            {q.stats && q.stats.answers > 0 && <div><dt>Desempenho</dt><dd>{q.stats.correct} acertos em {q.stats.answers} respostas ({q.stats.timeouts} por tempo esgotado)</dd></div>}
          </dl>
        </>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!editing && <div className="review-actions">
        {canDecide && <button className="button button--primary" disabled={busy} onClick={() => void act('approve')}><Check size={17}/> Aprovar e publicar</button>}
        {(q.status === 'submitted' || q.status === 'in_review') && <button className="button button--ghost" disabled={busy} onClick={() => setAsking('request_changes')}><CornerUpLeft size={17}/> Devolver ao autor</button>}
        {canDecide && <button className="button button--ghost" disabled={busy} onClick={() => setAsking('reject')}><X size={17}/> Rejeitar</button>}
        <button className="button button--ghost" disabled={busy} onClick={() => setEditing(true)}><PenLine size={17}/> Editar</button>
        {q.status === 'published' && <button className="button button--ghost" disabled={busy} onClick={() => setAsking('archive')}><Archive size={17}/> Arquivar</button>}
        {q.status === 'archived' && <button className="button button--ghost" disabled={busy} onClick={() => void act('restore')}><RotateCcw size={17}/> Restaurar</button>}
      </div>}
    </main>
    <aside className="aside-panel">
      <p className="eyebrow">POSSÍVEIS DUPLICATAS</p>
      {data.duplicates.length === 0 && <p className="kpi-note">Nenhuma pergunta parecida encontrada.</p>}
      <ul className="dup-list">{data.duplicates.map(d => <li key={d.id}><Link to={`/admin/perguntas/${d.id}`} className="dup-row">
        <strong>{d.prompt}</strong><small>Resposta: {d.correct_option}</small>
        <span className="dup-tags">{d.same_answer && <Pill tone="orange">MESMA RESPOSTA</Pill>}{d.same_numbers && <Pill tone="orange">MESMOS NÚMEROS</Pill>}<Pill>{STATUS_LABEL[d.status].toUpperCase()}</Pill></span>
      </Link></li>)}</ul>
      {q.reviews && q.reviews.length > 0 && <>
        <div className="divider"/><p className="eyebrow">HISTÓRICO</p>
        <ul className="history-list">{q.reviews.map((r, i) => <li key={i}><b>{DECISION_LABEL[r.decision] ?? r.decision}</b> · {r.reviewer} · {new Date(r.at).toLocaleDateString('pt-BR')}{r.notes && <p>{r.notes}</p>}</li>)}</ul>
      </>}
    </aside>
    {asking && <Modal label={asking === 'reject' ? 'Rejeitar pergunta' : asking === 'archive' ? 'Arquivar pergunta' : 'Devolver ao autor'} onClose={() => setAsking(null)}>
      <Pill tone="orange">{asking === 'reject' ? 'REJEITAR' : asking === 'archive' ? 'ARQUIVAR' : 'DEVOLVER AO AUTOR'}</Pill>
      <h2>{asking === 'archive' ? 'Por que arquivar?' : 'Explique para o autor'}</h2>
      <label className="sr-only" htmlFor="review-notes">Motivo</label>
      <textarea id="review-notes" className="text-input text-area" rows={4} value={notes} onChange={e => setNotes(e.target.value)}
        placeholder={asking === 'request_changes' ? 'Ex.: a fonte não confirma o placar; inclua um link oficial.' : 'Motivo'}/>
      <button className="button button--primary button--full" disabled={busy || (asking !== 'archive' && !notes.trim())} onClick={() => void act(asking, notes.trim() || undefined)}>Confirmar</button>
    </Modal>}
  </div>;
}

const DECISION_LABEL: Record<string, string> = {
  approve: 'Aprovada', reject: 'Rejeitada', request_changes: 'Devolvida', archive: 'Arquivada', restore: 'Restaurada', edit: 'Editada',
};

/** /admin/perguntas/nova — cadastro direto pelo admin. */
export function AdminNewQuestionPage() {
  return <AdminOnly><AdminNewQuestion/></AdminOnly>;
}

function AdminNewQuestion() {
  const navigate = useNavigate();
  const [publish, setPublish] = useState(true);
  return <div className="content-layout content-layout--form"><main className="main-card">
    <Link to="/admin" className="text-action"><ArrowLeft size={15}/> Fila</Link>
    <h1 className="screen-title">Cadastrar pergunta</h1>
    <QuestionForm submitLabel={publish ? 'Cadastrar e publicar' : 'Cadastrar na fila'} draftKey="boletrados:draft:admin-question"
      extra={<label className="check-row"><input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)}/> Publicar agora (já revisada por você)</label>}
      onSubmit={async input => { const result = await api.adminCreate({ ...input, publish }); navigate(`/admin/perguntas/${result.question.id}`); }}/>
  </main></div>;
}
