import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { Check, ImagePlus, Send, Trash2 } from 'lucide-react';
import { CATEGORIES, type CategoryId } from '../../data/questions';
import { ApiError, api, apiUrl, type Difficulty, type QuestionInput } from '../api';
import { CategoryBadge } from '../../game/art';

// Mesmos limites da API (legível em 15 segundos).
export const LIMITS = { prompt: 180, option: 60, explanation: 500, categories: 3 };

const CATEGORY_HINTS: Record<CategoryId, string> = {
  brasileiro: 'Brasileirão, Copa do Brasil, estaduais e regionais. Competição só nacional brasileira fica aqui.',
  europeu: 'Ligas e copas europeias, Champions, Europa e Conference League.',
  sulamericano: 'Libertadores, Sul-Americana, Recopa e torneios CONMEBOL; clubes e ligas dos outros países sul-americanos.',
  selecoes: 'Copas do Mundo, Copa América, Eurocopa e demais torneios de seleções.',
  escudos: 'Escudos de clubes e seleções do mundo todo, com ou sem imagem.',
  estadios: 'Estádios do mundo todo: local, capacidade, mandantes e história.',
};

const LEVELS: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Fácil' }, { id: 'medium', label: 'Médio' }, { id: 'hard', label: 'Difícil' },
];

export const emptyInput = (): QuestionInput => ({
  prompt: '', options: ['', '', '', ''], correct_index: 0, categories: [], initial_difficulty: 'medium',
  source_url: '', explanation: '', image_key: null,
});

/** Reduz a imagem (lado maior ≤ 1280 px) antes do envio. WebP preserva transparência (escudos). */
async function prepareImage(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Use uma imagem JPEG, PNG ou WebP.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 450 * 1024) return file;
  const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const encode = (type: string, quality: number) => new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality));
  const blob = (await encode('image/webp', 0.85)) ?? (await encode('image/jpeg', 0.85));
  if (!blob || blob.size > 512 * 1024) throw new Error('A imagem continua grande demais (máximo 512 KB).');
  return blob;
}

type Props = {
  initial?: QuestionInput;
  initialImagePath?: string | null;
  /** Chave do rascunho no navegador (só para perguntas novas). */
  draftKey?: string;
  submitLabel: string;
  extra?: ReactNode;
  onSubmit: (input: QuestionInput) => Promise<void>;
};

export function QuestionForm({ initial, initialImagePath = null, draftKey, submitLabel, extra, onSubmit }: Props) {
  const [input, setInput] = useState<QuestionInput>(() => {
    if (draftKey) {
      try { const saved = localStorage.getItem(draftKey); if (saved) return { ...emptyInput(), ...JSON.parse(saved) as QuestionInput }; } catch { /* sem rascunho */ }
    }
    return initial ?? emptyInput();
  });
  const [imagePath, setImagePath] = useState<string | null>(initialImagePath);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Rascunho automático (fica só neste navegador até o envio).
  useEffect(() => {
    if (!draftKey) return;
    try { localStorage.setItem(draftKey, JSON.stringify(input)); } catch { /* armazenamento indisponível */ }
  }, [draftKey, input]);

  const set = <K extends keyof QuestionInput>(key: K, value: QuestionInput[K]) => setInput(current => ({ ...current, [key]: value }));
  const setOption = (index: number, value: string) => set('options', input.options.map((o, i) => (i === index ? value : o)));
  const toggleCategory = (id: CategoryId) => set('categories', input.categories.includes(id)
    ? input.categories.filter(c => c !== id)
    : input.categories.length < LIMITS.categories ? [...input.categories, id] : input.categories);

  const pickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true); setErrors([]);
    try {
      const blob = await prepareImage(file);
      const image = await api.uploadImage(blob, file.name);
      set('image_key', image.key);
      setImagePath(image.path);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'Não foi possível enviar a imagem.']);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setErrors([]);
    try {
      await onSubmit({ ...input, prompt: input.prompt.trim(), source_url: input.source_url.trim(), explanation: input.explanation.trim() });
      if (draftKey) { try { localStorage.removeItem(draftKey); } catch { /* ok */ } }
    } catch (e) {
      const details = e instanceof ApiError ? (e.body as { details?: string[] } | undefined)?.details : undefined;
      setErrors(details?.length ? details : [e instanceof Error ? e.message : 'Não foi possível salvar.']);
    } finally {
      setBusy(false);
    }
  };

  const counter = (value: string, max: number) => <span className={`char-count ${value.length > max ? 'char-count--over' : ''}`}>{value.length}/{max}</span>;

  return <form className="question-form" onSubmit={submit} noValidate>
    <div className="field">
      <label htmlFor="q-prompt">Enunciado {counter(input.prompt, LIMITS.prompt)}</label>
      <textarea id="q-prompt" className="text-input text-area" rows={3} value={input.prompt} onChange={e => set('prompt', e.target.value)}
        placeholder="Ex.: Qual clube venceu a Libertadores de 1981?" required/>
      <small className="field-hint">Curto e direto: o jogador tem 15 segundos para ler e responder.</small>
    </div>

    <div className="field">
      <span className="field-label">Imagem (opcional)</span>
      {imagePath
        ? <div className="image-preview"><img src={apiUrl(imagePath)} alt="Imagem da pergunta"/>
            <button type="button" className="button button--ghost" onClick={() => { set('image_key', null); setImagePath(null); }}><Trash2 size={16}/> Remover</button></div>
        : <button type="button" className="button button--ghost image-pick" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <ImagePlus size={17}/> {uploading ? 'Enviando…' : 'Adicionar imagem'}</button>}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => void pickImage(e)}/>
      <small className="field-hint">JPEG, PNG ou WebP. Use só imagens que você tem direito de usar.</small>
    </div>

    <fieldset className="field">
      <legend className="field-label">Alternativas: marque a correta</legend>
      {input.options.map((option, i) => <div key={i} className={`option-row ${input.correct_index === i ? 'option-row--correct' : ''}`}>
        <label className="option-correct">
          <input type="radio" name="correct" checked={input.correct_index === i} onChange={() => set('correct_index', i)}/>
          <span aria-hidden="true">{input.correct_index === i ? <Check size={15}/> : String.fromCharCode(65 + i)}</span>
          <span className="sr-only">Alternativa {String.fromCharCode(65 + i)} é a correta</span>
        </label>
        <input className="text-input" value={option} onChange={e => setOption(i, e.target.value)} aria-label={`Alternativa ${String.fromCharCode(65 + i)}`} placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}/>
        {counter(option, LIMITS.option)}
      </div>)}
    </fieldset>

    <fieldset className="field">
      <legend className="field-label">Categorias ({input.categories.length}/{LIMITS.categories})</legend>
      <div className="category-picker">{CATEGORIES.map(cat => {
        const on = input.categories.includes(cat.id);
        return <button key={cat.id} type="button" className={`category-chip ${on ? 'category-chip--on' : ''}`} aria-pressed={on}
          onClick={() => toggleCategory(cat.id)} disabled={!on && input.categories.length >= LIMITS.categories} title={CATEGORY_HINTS[cat.id]}>
          <CategoryBadge id={cat.id} size={26}/>{cat.short}</button>;
      })}</div>
      <small className="field-hint">Marque só as de relação direta com o assunto e que não entreguem a resposta.</small>
      {input.categories.length > 0 && <ul className="category-hints">{input.categories.map(id => <li key={id}><b>{CATEGORIES.find(c => c.id === id)!.short}:</b> {CATEGORY_HINTS[id]}</li>)}</ul>}
    </fieldset>

    <fieldset className="field">
      <legend className="field-label">Dificuldade estimada</legend>
      <div className="segmented">{LEVELS.map(level => <button key={level.id} type="button" aria-pressed={input.initial_difficulty === level.id}
        className={input.initial_difficulty === level.id ? 'segmented--on' : ''} onClick={() => set('initial_difficulty', level.id)}>{level.label}</button>)}</div>
      <small className="field-hint">É só o ponto de partida: a dificuldade se ajusta com o desempenho real dos jogadores.</small>
    </fieldset>

    <div className="field">
      <label htmlFor="q-source">Fonte</label>
      <input id="q-source" className="text-input" type="url" inputMode="url" value={input.source_url} onChange={e => set('source_url', e.target.value)} placeholder="https://… (onde conferir a resposta)"/>
    </div>

    <div className="field">
      <label htmlFor="q-explanation">Explicação da resposta {counter(input.explanation, LIMITS.explanation)}</label>
      <textarea id="q-explanation" className="text-input text-area" rows={3} value={input.explanation} onChange={e => set('explanation', e.target.value)}
        placeholder="Aparece para o jogador depois que ele responde."/>
    </div>

    {extra}
    {errors.length > 0 && <ul className="form-errors" role="alert">{errors.map(e => <li key={e}>{e}</li>)}</ul>}
    <button className="button button--primary button--lg" disabled={busy || uploading}><Send size={18}/> {busy ? 'Enviando…' : submitLabel}</button>
    {draftKey && <p className="center-hint">O rascunho fica salvo neste navegador até você enviar.</p>}
  </form>;
}
