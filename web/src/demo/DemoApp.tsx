import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, BarChart3, BookOpen, Check, CheckCircle2, CircleHelp,
  Clock3, Goal, Home, Info, LockKeyhole, Play, RotateCcw,
  Sparkles, Swords, Target, Trophy, Users, Zap,
} from 'lucide-react';
import { Brand } from '../components/Brand';
import { DrawBowl } from '../components/DrawBowl';
import { Banner, CategoryIcon, FeedbackCard, Modal, Pill, QuestionCard, TrophyGrid } from '../components/ui';
import { CATEGORIES, QUESTIONS, getCategory, type CategoryId } from '../data/questions';
import {
  answerQuestion, continueAfterFeedback, createGame, drawCategory, drawableCategories,
  enterDraw, exhaustedCategories, getCurrentQuestion, hasMatchInProgress, initialGame, isWinningFeedback,
  leaveToHome, otherPlayer, recoverFromEmpty, restoreGame, resumeGame, startDrawnQuestion, startTrophyQuestion,
  type Game, type PlayerIndex,
} from '../lib/game';

const GAME_STORAGE = 'boletrados:demo:game:v1';
const GLOBAL_SEEN_STORAGE = 'boletrados:demo:seen:v1';
const ANIMATION_DURATION = 1450;
const REDUCED_ANIMATION_DURATION = 300;

function readGame(): Game {
  try {
    const raw = localStorage.getItem(GAME_STORAGE);
    if (raw) return restoreGame(JSON.parse(raw)) ?? initialGame;
  } catch { /* corrupted browser storage starts clean */ }
  return initialGame;
}

function readSeen(): [string[], string[]] {
  try {
    const raw = localStorage.getItem(GLOBAL_SEEN_STORAGE);
    if (raw) {
      const data: unknown = JSON.parse(raw);
      if (Array.isArray(data) && data.length === 2 && data.every(Array.isArray)) return data as [string[], string[]];
    }
  } catch { /* no prior history */ }
  return [[], []];
}

function startDemo(): Game {
  return createGame(readSeen());
}

function getPlayerInitials(name: string) { return name === 'Você' ? 'VC' : 'AM'; }




function PlayerChip({ game, player, isActive = false }: { game: Game; player: PlayerIndex; isActive?: boolean }) {
  return <div className={`player-chip ${isActive ? 'player-chip--active' : ''}`}>
    <div className={`player-avatar player-avatar--${player}`}>{getPlayerInitials(game.names[player])}</div>
    <div className="player-chip-info"><strong>{game.names[player]}</strong><span>{game.trophies[player].length}/6 troféus</span></div>
    {isActive && <span className="playing-dot" title="Jogador da vez" />}
  </div>;
}

function GameStats({ game }: { game: Game }) {
  return <div className="stats-row">
    <div><b>{game.turnNumber}</b><span>Posse atual</span></div>
    <div><b>{game.correctAnswers[0] + game.correctAnswers[1]}</b><span>Acertos</span></div>
    <div><b>{game.trophies[0].length + game.trophies[1].length}</b><span>Troféus</span></div>
  </div>;
}

function Header({ phase, onHome }: { phase: Game['phase']; onHome: () => void }) {
  return <header className="site-header"><div className="site-header-inner">
    <Brand small />
    <nav className="desktop-nav" aria-label="Navegação principal">
      <span className="nav-active"><Home size={16} /> Início</span>
      <span><Swords size={16} /> X1 com amigos</span>
      <span><BarChart3 size={16} /> Estatísticas <span className="soon-dot" /></span>
    </nav>
    <div className="header-right">
      {phase !== 'home' && <button className="header-home" onClick={onHome}><Home size={16}/> Início</button>}
      <a href="/" className="header-home"><Swords size={16}/> X1 online</a><Pill tone="lime">DEMO INTERATIVA</Pill>
    </div>
  </div></header>;
}


function HomeScreen({ inProgress, onStart, onResume, onRules, onInvite }: { inProgress: boolean; onStart: () => void; onResume: () => void; onRules: () => void; onInvite: () => void }) {
  return <>
    <section className="hero">
      <div className="hero-copy">
        <Pill tone="lime"><span className="tiny-pulse"/> UM JOGO PARA QUEM VIVE FUTEBOL</Pill>
        <h1>Quem sabe de <em>futebol</em> merece um troféu.</h1>
        <p>Tá na hora de descobrir quem entende mais de bola. Acerte perguntas, dispute categorias e conquiste os 6 troféus antes do seu amigo.</p>
        <div className="hero-buttons">
          {inProgress
            ? <><button className="button button--primary button--lg" onClick={onResume}><Play size={19} fill="currentColor" /> Continuar partida <ArrowRight size={20}/></button>
                <button className="button button--ghost button--lg" onClick={onStart}><RotateCcw size={18}/> Nova partida</button></>
            : <button className="button button--primary button--lg" onClick={onStart}><Play size={19} fill="currentColor" /> Testar uma partida <ArrowRight size={20}/></button>}
          <button className="button button--ghost button--lg" onClick={onRules}><BookOpen size={18}/> Como jogar</button>
        </div>
        <div className="hero-tags"><span><CheckCircle2 size={16}/> 6 categorias</span><span><Clock3 size={16}/> 15s por pergunta</span><span><Users size={16}/> X1 entre amigos</span></div>
      </div>
      <div className="hero-art" role="img" aria-label="Ilustração de troféu e estádio de futebol">
        <div className="hero-orbit hero-orbit--one"/><div className="hero-orbit hero-orbit--two"/>
        <div className="hero-glow"/><div className="hero-stadium"/>
        <motion.div className="hero-main-trophy" animate={{ y: [-7, 5, -7], rotate: [-2, 2, -2] }} transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}><span>🏆</span></motion.div>
        <motion.div className="float-badge float-badge--top" animate={{ y: [0, -7, 0] }} transition={{ duration: 3.2, repeat: Infinity }}><span>🇧🇷</span> Brasileiro <Check size={14}/></motion.div>
        <motion.div className="float-badge float-badge--bottom" animate={{ y: [0, 8, 0] }} transition={{ duration: 3.8, repeat: Infinity }}><span>⚽</span> Sua vez!</motion.div>
        <span className="hero-small-star hero-small-star--one">✦</span><span className="hero-small-star hero-small-star--two">✳</span>
      </div>
    </section>
    <section className="home-bottom">
      <div className="home-bottom-heading"><div><p className="eyebrow">A JOGADA É SUA</p><h2>Um desafio. Seis troféus.</h2></div><span className="section-counter">01 — 06</span></div>
      <div className="category-strip">{CATEGORIES.map(cat => <div key={cat.id} className="category-strip-item"><CategoryIcon id={cat.id} size="lg"/><span>{cat.short}</span></div>)}</div>
      <div className="feature-grid">
        <div className="feature-card"><div className="feature-icon feature-icon--lime"><Target size={22}/></div><strong>3 acertos. 1 chance.</strong><span>Responda três perguntas consecutivas para disputar um troféu.</span></div>
        <div className="feature-card"><div className="feature-icon feature-icon--blue"><Goal size={22}/></div><strong>Errou? Perdeu a vez.</strong><span>Seu amigo continua quando puder. Nada de combinar horário.</span></div>
        <div className="feature-card"><div className="feature-icon feature-icon--pink"><Trophy size={22}/></div><strong>Quem chegar a 6 vence.</strong><span>Conquiste um troféu de cada categoria para levar a taça.</span></div>
      </div>
      <button className="subtle-link" onClick={onInvite}>Como vão funcionar os convites? <ArrowRight size={16}/></button>
    </section>
  </>;
}

function LobbyScreen({ game, onPlay, onReset }: { game: Game; onPlay: () => void; onReset: () => void }) {
  return <div className="content-layout">
    <main className="main-card lobby-card">
      <div className="eyebrow eyebrow--green"><span className="tiny-pulse"/> PARTIDA X1 • DEMONSTRAÇÃO LOCAL</div>
      <h1 className="screen-title">O campo é seu.</h1>
      <p className="screen-subtitle">Quando estiver pronto, comece a sua posse. Você pode jogar no seu ritmo.</p>
      <div className="match-scoreboard">
        <PlayerChip game={game} player={0} isActive={game.activePlayer === 0}/>
        <div className="versus">VS<span>AMISTOSO</span></div>
        <PlayerChip game={game} player={1} isActive={game.activePlayer === 1}/>
      </div>
      <div className="your-turn-card"><div className="turn-symbol"><Zap size={24}/></div><div><span>É A VEZ DE</span><strong>{game.names[game.activePlayer]}</strong><small>Uma pergunta errada passa a vez.</small></div><span className="turn-number">POSSE {String(game.turnNumber).padStart(2, '0')}</span></div>
      <div className="lobby-trophies"><div className="section-heading"><strong>Troféus de {game.names[game.activePlayer]}</strong><Pill>{game.trophies[game.activePlayer].length}/6</Pill></div><TrophyGrid trophies={game.trophies[game.activePlayer]}/></div>
      <button className="button button--primary button--full button--lg" onClick={onPlay}><Play size={19} fill="currentColor"/> Começar minha vez <ArrowRight size={20}/></button>
      <p className="center-hint"><LockKeyhole size={14}/> Na demonstração, os dois jogadores usam este navegador.</p>
    </main>
    <aside className="aside-panel"><p className="eyebrow">RESUMO DO JOGO</p><h3>Quem domina a bola?</h3><GameStats game={game}/><div className="divider"/><div className="side-rule"><span className="rule-number">01</span><p>Acertou? Continue jogando.</p></div><div className="side-rule"><span className="rule-number">02</span><p>Três acertos liberam uma disputa de troféu.</p></div><div className="side-rule"><span className="rule-number">03</span><p>Errou? A vez passa pro amigo.</p></div><div className="divider"/><button className="text-action" onClick={onReset}><RotateCcw size={15}/> Reiniciar demonstração</button></aside>
  </div>;
}

function DrawScreen({ game, category, spinning, onDraw, onSkip, onProceed }: { game: Game; category: CategoryId | null; spinning: boolean; onDraw: () => void; onSkip: () => void; onProceed: () => void }) {
  const exhausted = exhaustedCategories(game);
  return <div className="content-layout"><main className="main-card draw-card">
    <div className="eyebrow eyebrow--green"><span className="tiny-pulse"/> SORTEIO DA CATEGORIA</div>
    <h1 className="screen-title">A sorte está lançada!</h1><p className="screen-subtitle">Uma bolinha, uma categoria. Qual vai ser a próxima pergunta?</p>
    <DrawBowl isSpinning={spinning} revealed={!spinning ? category : null}/>
    <div aria-live="polite" aria-atomic="true">{category && !spinning ? <div className="draw-picked"><span>SORTEADA</span><strong><span aria-hidden="true">{getCategory(category).icon}</span> {getCategory(category).label}</strong></div> : <p className="draw-helper">{spinning ? 'Misturando as bolinhas...' : 'Toque no botão para sortear uma categoria.'}</p>}</div>
    {spinning
      ? <button className="button button--ghost button--full button--lg" onClick={onSkip}>Pular animação <ArrowRight size={19}/></button>
      : <button className="button button--primary button--full button--lg" onClick={category ? onProceed : onDraw}>{category ? <><ArrowRight size={19}/> Ver pergunta</> : <><Sparkles size={19}/> Sortear bolinha</>}</button>}
    {exhausted.length > 0 && !category && <p className="center-hint draw-exhausted"><Info size={14}/> Sem perguntas inéditas em {exhausted.map(id => getCategory(id).short).join(', ')}: {exhausted.length > 1 ? 'essas bolas ficam' : 'essa bola fica'} fora do sorteio.</p>}
    <p className="center-hint"><Clock3 size={14}/> Os 15 segundos começam somente quando a pergunta aparecer.</p>
  </main><aside className="aside-panel"><p className="eyebrow">SEU PROGRESSO</p><h3>{game.names[game.activePlayer]}</h3><div className="streak-side"><span>Sequência atual</span><strong>{game.streak}/3</strong></div><div className="streak-pips">{[0,1,2].map(i=><span key={i} className={i<game.streak?'done':''}/>)}</div><div className="divider"/><p className="hint-label">CATEGORIAS POSSÍVEIS</p><div className="category-list">{CATEGORIES.map(cat=><div key={cat.id}><CategoryIcon id={cat.id} size="sm"/><span>{cat.short}</span></div>)}</div></aside></div>;
}

function QuestionScreen({ game, onAnswer }: { game: Game; onAnswer: (index: number | null) => void }) {
  const question = getCurrentQuestion(game);
  if (!question || !game.selectedCategory || game.deadline === null) return <div className="main-card"><h2>Pergunta indisponível</h2></div>;
  return <QuestionCard questionKey={question.id} prompt={question.prompt} options={question.options} image={question.image}
    categoryId={game.selectedCategory} isTrophy={game.context === 'trophy'} progressLabel={`ACERTO ${game.streak + 1} DE 3`}
    deadline={game.deadline} onAnswer={onAnswer}/>;
}

function TrophyScreen({ game, onSelect }: { game: Game; onSelect: (category: CategoryId) => void }) {
  return <div className="content-layout"><main className="main-card trophy-select-card"><div className="trophy-header-icon"><Trophy size={33}/></div>
    <div className="eyebrow eyebrow--green">TRÊS ACERTOS CONSECUTIVOS!</div><h1 className="screen-title">Hora de buscar a taça.</h1><p className="screen-subtitle">Você chegou à finalização! Escolha qual troféu ainda não conquistado quer disputar.</p>
    <TrophyGrid trophies={game.trophies[game.activePlayer]} interactive onSelect={onSelect}/>
    <Banner icon={<Clock3 size={17}/>}>A pergunta decisiva também tem 15 segundos. Se acertar, o troféu é seu e você continua jogando.</Banner>
  </main><aside className="aside-panel"><p className="eyebrow">SEU CAMINHO</p><h3>Três acertos. Uma chance.</h3><div className="milestone"><CheckCircle2 size={20}/>Primeira pergunta <b>✓</b></div><div className="milestone"><CheckCircle2 size={20}/>Segunda pergunta <b>✓</b></div><div className="milestone"><CheckCircle2 size={20}/>Terceira pergunta <b>✓</b></div><div className="divider"/><div className="trophy-info"><Trophy size={22}/><strong>{game.trophies[game.activePlayer].length} de 6 troféus</strong><span>Complete os seis para vencer!</span></div></aside></div>;
}

function FeedbackScreen({ game, onContinue }: { game: Game; onContinue: () => void }) {
  const fb = game.feedback;
  const q = getCurrentQuestion(game);
  if (!fb || !q) return null;
  return <FeedbackCard correct={fb.correct} timedOut={fb.timedOut} trophyWon={fb.trophyWon} winning={isWinningFeedback(game)}
    categoryId={fb.categoryId} selectedOption={fb.selectedIndex !== null ? q.options[fb.selectedIndex] : null}
    correctOption={q.options[fb.correctIndex]} explanation={fb.explanation}
    opponentName={game.names[otherPlayer(game.activePlayer)]} onContinue={onContinue}/>;
}

function FinishedScreen({ game, onRestart }: { game: Game; onRestart: () => void }) {
  const winner = game.winner ?? 0;
  return <div className="feedback-shell"><main className="main-card finished-card"><div className="champion-badge">🏆</div><div className="eyebrow eyebrow--green">OS SEIS TROFÉUS CONQUISTADOS</div><h1 className="screen-title">Temos um campeão!</h1><p className="screen-subtitle"><b>{game.names[winner]}</b> conquistou todas as categorias. Que venha a revanche!</p><TrophyGrid trophies={game.trophies[winner]}/><GameStats game={game}/><button className="button button--primary button--full button--lg" onClick={onRestart}><RotateCcw size={18}/> Nova demonstração</button></main></div>;
}

function EmptyScreen({ game, onRetry, onRestart }: { game: Game; onRetry: () => void; onRestart: () => void }) {
  const cat = game.selectedCategory ? getCategory(game.selectedCategory) : null;
  const allExhausted = game.context === 'normal' && drawableCategories(game).length === 0;
  return <div className="feedback-shell"><main className="main-card feedback-card"><div className="feedback-burst feedback-burst--wrong" aria-hidden="true"><CircleHelp size={50}/></div><h1 className="screen-title">Acabaram as inéditas.</h1>
    <p className="screen-subtitle">{allExhausted
      ? `${game.names[game.activePlayer]} já viu todas as perguntas desta demonstração. Na versão final, a comunidade ajudará a manter o banco abastecido.`
      : `Não temos mais perguntas novas de ${cat?.short ?? 'essa categoria'} para este jogador. Escolha outro troféu para disputar.`}</p>
    {!allExhausted && <button className="button button--primary button--full" onClick={onRetry}>Escolher outro troféu <ArrowRight size={17}/></button>}
    <button className={`button button--${allExhausted ? 'primary' : 'ghost'} button--full`} onClick={onRestart}>Iniciar nova demo</button></main></div>;
}


function RulesModal({ onClose }: { onClose: () => void }) {
  return <Modal label="Como jogar Boletrados" onClose={onClose}><Pill tone="lime">MANUAL DO BOLEIRO</Pill><h2>É fácil entrar em campo.</h2><div className="rules-list"><div><span>01</span><p><b>Sorteie a categoria.</b> Uma bolinha define o tema da próxima pergunta.</p></div><div><span>02</span><p><b>Responda em 15 segundos.</b> Acertou? Sua posse continua. Errou? Passa a vez.</p></div><div><span>03</span><p><b>Faça três acertos seguidos.</b> Você escolhe um troféu e responde à pergunta decisiva.</p></div><div><span>04</span><p><b>Conquiste os seis troféus.</b> O primeiro a completar a coleção vence.</p></div></div><Banner>Esta é a demo local: os dois jogadores usam este aparelho. Para desafiar um amigo de verdade, use o X1 online.</Banner><button className="button button--primary button--full" onClick={onClose}>Entendi! <Check size={18}/></button></Modal>;
}

function InviteModal({ onClose }: { onClose: () => void }) {
  return <Modal label="Convites para amigos" onClose={onClose}><Pill tone="purple">X1 ONLINE</Pill><h2>Desafie aquele amigo que sabe tudo.</h2><p>No X1 online você cria um desafio e manda o link pelo WhatsApp ou o código do convite. Seu amigo joga quando puder.</p><a className="button button--primary button--full" href="/">Ir para o X1 online <Swords size={18}/></a><button className="button button--ghost button--full" onClick={onClose}>Continuar na demo <Check size={18}/></button></Modal>;
}

export default function DemoApp() {
  const [game, setGame] = useState<Game>(readGame);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const spinTimer = useRef<number | undefined>(undefined);
  const reduceMotion = useReducedMotion();
  const [showReset, setShowReset] = useState(false);
  const uniqueSeen = useMemo(() => [game.seenIds[0].length, game.seenIds[1].length], [game.seenIds]);

  useEffect(() => { try { localStorage.setItem(GAME_STORAGE, JSON.stringify(game)); } catch { /* storage disabled */ } }, [game]);
  useEffect(() => { try {
    const old = readSeen();
    const next: [string[], string[]] = [
      Array.from(new Set([...old[0], ...game.seenIds[0]])),
      Array.from(new Set([...old[1], ...game.seenIds[1]])),
    ];
    localStorage.setItem(GLOBAL_SEEN_STORAGE, JSON.stringify(next));
  } catch { /* storage disabled */ } }, [game.seenIds]);
  useEffect(() => {
    if (game.phase !== 'question' || game.deadline === null) return;
    const sync = () => { if (Date.now() >= game.deadline!) setGame(current => current.phase === 'question' && current.deadline !== null && Date.now() >= current.deadline ? answerQuestion(current, null) : current); };
    sync(); const timer = window.setInterval(sync, 100);
    return () => window.clearInterval(timer);
  }, [game.phase, game.deadline]);
  useEffect(() => { if (game.phase !== 'draw') { window.clearTimeout(spinTimer.current); setSpinning(false); } }, [game.phase]);
  useEffect(() => () => window.clearTimeout(spinTimer.current), []);

  const reset = () => { setGame(startDemo()); setShowReset(false); setSpinning(false); };
  const openHome = () => setShowReset(true);
  const begin = () => { setGame(current => current.phase === 'home' ? startDemo() : current); };
  const resume = () => setGame(resumeGame);
  const inProgress = hasMatchInProgress(game);
  const goToDraw = () => { setSpinning(false); setGame(enterDraw); };
  // O resultado é decidido (e salvo) no clique; a animação apenas o revela. Recarregar a página não refaz o sorteio.
  const spin = () => {
    if (spinning || game.drawnCategory) return;
    setGame(current => drawCategory(current));
    if (drawableCategories(game).length === 0) return; // vai direto para "acabaram as inéditas"
    setSpinning(true);
    spinTimer.current = window.setTimeout(() => setSpinning(false), reduceMotion ? REDUCED_ANIMATION_DURATION : ANIMATION_DURATION);
  };
  const skipSpin = () => { window.clearTimeout(spinTimer.current); setSpinning(false); };
  const startNormal = () => { if (spinning) return; setGame(current => startDrawnQuestion(current)); };
  const startTrophy = (id: CategoryId) => setGame(current => startTrophyQuestion(current, id));
  const chooseAnswer = (i: number | null) => setGame(current => answerQuestion(current, i));
  const afterFeedback = () => setGame(current => continueAfterFeedback(current));
  const recoverEmpty = () => setGame(recoverFromEmpty);
  const dockPlay = game.phase === 'home' ? (inProgress ? resume : begin) : game.phase === 'lobby' ? goToDraw : null;

  return <MotionConfig reducedMotion="user"><div className="app-shell"><Header phase={game.phase} onHome={openHome}/><div className="bg-spark bg-spark--one"/><div className="bg-spark bg-spark--two"/>
    <div className={`main-container main-container--${game.phase}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={game.phase} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
          {game.phase === 'home' && <HomeScreen inProgress={inProgress} onStart={begin} onResume={resume} onRules={()=>setRulesOpen(true)} onInvite={()=>setInviteOpen(true)}/>}
          {game.phase === 'lobby' && <LobbyScreen game={game} onPlay={goToDraw} onReset={openHome}/>}
          {game.phase === 'draw' && <DrawScreen game={game} category={game.drawnCategory} spinning={spinning} onDraw={spin} onSkip={skipSpin} onProceed={startNormal}/>}
          {game.phase === 'question' && <QuestionScreen key={game.questionId} game={game} onAnswer={chooseAnswer}/>}
          {game.phase === 'trophy' && <TrophyScreen game={game} onSelect={startTrophy}/>}
          {game.phase === 'feedback' && <FeedbackScreen game={game} onContinue={afterFeedback}/>}
          {game.phase === 'finished' && <FinishedScreen game={game} onRestart={reset}/>}
          {game.phase === 'empty' && <EmptyScreen game={game} onRetry={recoverEmpty} onRestart={reset}/>}
        </motion.div>
      </AnimatePresence>
    </div>
    <footer className="footer"><div><Brand small/><span>Quem entende de bola, joga.</span></div><p>Protótipo local · React + TypeScript · {QUESTIONS.length} perguntas demonstrativas · {uniqueSeen[0] + uniqueSeen[1]} exposições registradas</p></footer>
    {rulesOpen && <RulesModal onClose={()=>setRulesOpen(false)}/>}
    {inviteOpen && <InviteModal onClose={()=>setInviteOpen(false)}/>}
    {showReset && <Modal label="Sair da partida" onClose={()=>setShowReset(false)}><Pill tone="orange">SAIR DA PARTIDA?</Pill><h2>O jogo está pegando fogo!</h2><p>{game.phase === 'question' ? 'Sair agora conta como tempo esgotado: a sequência zera e a vez passa. ' : ''}A partida fica salva neste navegador e pode ser continuada pela tela inicial.</p><button className="button button--primary button--full" onClick={()=>{ setGame(leaveToHome);setShowReset(false); }}>Voltar ao início <Home size={18}/></button><button className="button button--ghost button--full" onClick={()=>setShowReset(false)}>Continuar jogando</button></Modal>}
    <nav className={`mobile-dock ${game.phase === 'question' ? 'mobile-dock--hidden' : ''}`} aria-label="Navegação rápida">
      <button className="mobile-dock-button" onClick={()=>game.phase==='home' ? window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }) : openHome()}><Home size={21}/><span>Início</span></button>
      {dockPlay
        ? <button className="mobile-dock-button mobile-dock-button--primary" onClick={dockPlay}><Swords size={21}/><span>Jogar</span></button>
        : <button className="mobile-dock-button mobile-dock-button--primary" onClick={()=>setRulesOpen(true)}><BookOpen size={21}/><span>Regras</span></button>}
      <button className="mobile-dock-button" onClick={()=>setInviteOpen(true)}><Users size={21}/><span>Amigos</span></button>
    </nav>
  </div></MotionConfig>;
}
