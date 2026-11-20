import { useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { BookOpen, ChevronRight, FileText, LogOut, Menu, PenLine, ShieldCheck, UserRound } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Modal } from '../components/ui';
import { StadiumScene } from '../game/art';
import { Logo, LogoMark } from '../game/Logo';
import { Mascot } from '../game/Mascot';
import { Avatar } from '../game/Avatar';
import { NotificationsCard } from './NotificationsCard';
import { useSession } from './session';
import '../game/tokens.css';
import '../game/game.css';
import './online.css';
import './curation/curation.css';
import '../game/site.css';
import '../game/app.css';
import { Loading } from '../game/Decor';

/**
 * Casca do site em formato de app: uma coluna do tamanho de um celular (centralizada no desktop),
 * barra superior com o jogador e barra de abas embaixo. A entrada (sem login) ocupa a tela inteira, sem barras.
 * A partida é imersiva (MatchPage desenha a própria tela).
 */
export function OnlineLayout() {
  const { status, user, retry } = useSession();
  const { pathname } = useLocation();
  const [sheet, setSheet] = useState<'rules' | 'more' | null>(null);
  const ready = status === 'anonymous' || status === 'authenticated';
  if (pathname.startsWith('/partidas/') && ready) return <MotionConfig reducedMotion="user"><Outlet/></MotionConfig>;

  const welcome = status === 'anonymous' && pathname === '/';
  const wide = pathname.startsWith('/admin');
  return <MotionConfig reducedMotion="user"><div className={`gd gd-site app ${welcome ? 'app--welcome' : ''}`}><StadiumScene/>
    {!welcome && <header className="app-top">
      {user
        ? <Link to="/perfil" className="app-me" aria-label="Seu perfil"><Avatar user={user} className="player-avatar app-me-avatar"/><span>{user.display_name}</span></Link>
        : <Link to="/" aria-label="Boletrados — início"><Logo size={34}/></Link>}
      {user && <Link to="/" className="app-top-logo" aria-label="Início"><LogoMark size={38}/></Link>}
    </header>}

    <main className={`app-main ${wide ? 'app-main--wide' : ''} ${pathname === '/' ? 'app-main--fill' : ''}`}>
      {status === 'loading' && <Loading label="Carregando…"/>}
      {status === 'offline' && <div className="main-card online-narrow"><Mascot mood="thinking" size={84}/>
        <h1 className="screen-title">Sem conexão</h1>
        <button className="button button--primary" onClick={retry}>Tentar de novo</button></div>}
      {ready && <AnimatePresence mode="wait" initial={false}>
        <motion.div key={pathname} className="app-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
          <Outlet/>
        </motion.div>
      </AnimatePresence>}
    </main>

    {user && <nav className="app-tabs" aria-label="Navegação">
      <NavLink to="/perguntas" className="app-tab"><PenLine size={22}/><span>Perguntas</span></NavLink>
      <NavLink to="/perfil" className="app-tab"><UserRound size={22}/><span>Perfil</span></NavLink>
      <NavLink to="/" end className="app-tab app-tab--home" aria-label="Início"><span className="app-tab-ball"><LogoMark size={52}/></span></NavLink>
      <button className="app-tab" onClick={() => setSheet('rules')}><BookOpen size={22}/><span>Regras</span></button>
      <button className="app-tab" onClick={() => setSheet('more')}><Menu size={22}/><span>Mais</span></button>
    </nav>}

    {sheet === 'rules' && <RulesSheet onClose={() => setSheet(null)}/>}
    {sheet === 'more' && <MoreSheet onClose={() => setSheet(null)}/>}
  </div></MotionConfig>;
}

const RULES = [
  'Sorteie uma categoria e responda em 15 segundos.',
  'Acertou, continua jogando. Errou, a vez passa.',
  'Três acertos seguidos: escolha um troféu e responda a pergunta decisiva.',
  'Quem juntar os 6 troféus primeiro vence. Cada vez tem 24 horas.',
];

function RulesSheet({ onClose }: { onClose: () => void }) {
  return <Modal label="Como jogar" onClose={onClose} className="modal-card--sheet">
    <div className="sheet-head"><Mascot mood="happy" size={56}/><h2>Como jogar</h2></div>
    <ol className="rules">{RULES.map((rule, i) => <li key={rule}><b>{i + 1}</b><span>{rule}</span></li>)}</ol>
  </Modal>;
}

function MoreSheet({ onClose }: { onClose: () => void }) {
  const { user, signOut } = useSession();
  return <Modal label="Mais opções" onClose={onClose} className="modal-card--sheet">
    <h2>Mais</h2>
    <NotificationsCard/>
    <nav className="sheet-links" onClick={onClose}>
      {user?.admin && <Link to="/admin"><ShieldCheck size={20}/> Moderação <ChevronRight size={18}/></Link>}
      <Link to="/privacidade"><FileText size={20}/> Privacidade <ChevronRight size={18}/></Link>
      <Link to="/termos"><FileText size={20}/> Termos de uso <ChevronRight size={18}/></Link>
      <button onClick={() => void signOut()}><LogOut size={20}/> Sair</button>
    </nav>
  </Modal>;
}
