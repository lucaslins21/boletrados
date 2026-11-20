import { useEffect, useState } from 'react';
import { ArrowRight, MessageSquareWarning, PenLine, Plus } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { Banner } from '../../components/ui';
import { ApiError, api, type QuestionFull, type QuestionInput } from '../api';
import { QuestionForm } from './QuestionForm';
import { StatusPill } from './StatusPill';
import { CategoryBadge } from '../../game/art';
import { Loading } from '../../game/Decor';
import { Mascot } from '../../game/Mascot';

const NOTICE_KEY = 'boletrados:submission-notice';

/** /perguntas — contribuições do usuário e o andamento da moderação. */
export function MySubmissionsPage() {
  const [items, setItems] = useState<QuestionFull[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice] = useState(() => { try { const n = sessionStorage.getItem(NOTICE_KEY); sessionStorage.removeItem(NOTICE_KEY); return n; } catch { return null; } });

  useEffect(() => {
    api.submissions().then(({ submissions }) => setItems(submissions))
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Não foi possível carregar suas perguntas.'));
  }, []);

  return <div className="content-layout">
    <main className="main-card">
      <h1 className="screen-title">Suas perguntas</h1>
      <Link to="/perguntas/nova" className="button button--primary button--lg inline-button"><Plus size={19}/> Nova pergunta</Link>
      {notice && <Banner>{notice}</Banner>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {items === null && !error && <Loading label="Carregando…"/>}
      {items?.length === 0 && <div className="home-empty"><Mascot mood="thinking" size={72}/><p>Aprovada pela moderação, sua pergunta entra no jogo de todo mundo (menos no seu).</p></div>}
      <ul className="submission-list">{items?.map(q => <li key={q.id} className="submission-item">
        <div className="submission-top"><StatusPill status={q.status} label={q.status_label}/>
          <span className="submission-cats">{q.categories.map(c => <CategoryBadge key={c} id={c} size={26}/>)}</span></div>
        <strong className="submission-prompt">{q.prompt}</strong>
        <small className="submission-answer">Resposta: {q.options[q.correct_index]}</small>
        {q.feedback && (q.status === 'changes_requested' || q.status === 'rejected') &&
          <p className="submission-feedback"><MessageSquareWarning size={15}/> {q.feedback}</p>}
        {q.editable && <Link to={`/perguntas/${q.id}/editar`} className="text-action"><PenLine size={14}/> {q.status === 'changes_requested' ? 'Corrigir e reenviar' : 'Editar'} <ArrowRight size={14}/></Link>}
      </li>)}</ul>
    </main>
  </div>;
}

const toInput = (q: QuestionFull): QuestionInput => ({
  prompt: q.prompt, options: q.options, correct_index: q.correct_index, categories: q.categories,
  initial_difficulty: q.initial_difficulty, source_url: q.source_url ?? '', explanation: q.explanation, image_key: q.image?.key ?? null,
});

/** /perguntas/nova e /perguntas/:id/editar */
export function SubmissionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [existing, setExisting] = useState<QuestionFull | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.submission(id).then(({ submission }) => setExisting(submission))
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Pergunta não encontrada.'));
  }, [id]);

  const done = (duplicates: number) => {
    const message = duplicates > 0
      ? `Pergunta enviada! Encontramos ${duplicates} pergunta(s) parecida(s) no banco; a moderação vai conferir se não é repetida.`
      : 'Pergunta enviada para a moderação. Acompanhe o andamento aqui.';
    try { sessionStorage.setItem(NOTICE_KEY, message); } catch { /* ok */ }
    navigate('/perguntas');
  };

  if (id && error) return <div className="main-card online-narrow"><p className="form-error">{error}</p><Link to="/perguntas" className="button button--primary">Voltar</Link></div>;
  if (id && !existing) return <Loading label="Carregando…"/>;
  if (existing && !existing.editable) return <div className="main-card online-narrow"><h1 className="screen-title">Em análise.</h1>
    <p>Já está com a moderação e não pode ser editada agora.</p><Link to="/perguntas" className="button button--primary">Voltar</Link></div>;

  return <div className="content-layout content-layout--form">
    <main className="main-card">
      <h1 className="screen-title">{existing ? 'Corrigir pergunta' : 'Nova pergunta'}</h1>
      {existing?.feedback && <Banner icon={<MessageSquareWarning size={17}/>}>Moderação: {existing.feedback}</Banner>}
      <QuestionForm
        initial={existing ? toInput(existing) : undefined}
        initialImagePath={existing?.image?.path ?? null}
        draftKey={existing ? undefined : 'boletrados:draft:new-question'}
        submitLabel={existing ? 'Reenviar para moderação' : 'Enviar para moderação'}
        onSubmit={async input => {
          const result = existing ? await api.updateSubmission(existing.id, input) : await api.createSubmission(input);
          done(result.possible_duplicates);
        }}/>
    </main>
  </div>;
}
