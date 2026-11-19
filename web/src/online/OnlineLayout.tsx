import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Home, LogOut, PenLine, ShieldCheck, UserRound } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Pill } from '../components/ui';
import { StadiumScene } from '../game/art';
import { Logo, LogoMark } from '../game/Logo';
import { useSession } from './session';
import '../game/tokens.css';
import '../game/game.css';
import './online.css';
import './curation/curation.css';
import '../game/site.css';
import { Loading } from '../game/Decor';

export function OnlineLayout() {
  const { status, user, signOut, retry } = useSession();
  // A partida é uma tela imersiva (cenário "Dia de jogo"), sem o cabeçalho e o rodapé do site.
  const { pathname } = useLocation();
  const immersive = pathname.startsWith('/partidas/');
  if (immersive && (status === 'anonymous' || status === 'authenticated')) return <MotionConfig reducedMotion="user"><Outlet/></MotionConfig>;
  return <MotionConfig reducedMotion="user"><div className="gd gd-site"><StadiumScene/>
    <header className="site-header"><div className="site-header-inner">
      <Link to="/" className="brand-link" aria-label="Boletrados — início">{status === 'anonymous' && pathname === '/' ? <LogoMark size={46}/> : <Logo size={42}/>}</Link>
      <div className="header-right">
        <NavLink to="/" end className="online-nav-link" aria-label="Início"><Home size={16}/><span>Início</span></NavLink>
        {user && <>
          <NavLink to="/perguntas" className="online-nav-link" aria-label="Perguntas"><PenLine size={16}/><span>Perguntas</span></NavLink>
          <NavLink to="/perfil" className="online-nav-link" aria-label="Perfil"><UserRound size={16}/><span>Perfil</span></NavLink>
          {user.admin && <NavLink to="/admin" className="online-nav-link" aria-label="Moderação"><ShieldCheck size={16}/><span>Moderação</span></NavLink>}
          <span className="online-user"><Pill tone="lime">{user.display_name}</Pill></span>
          <button className="online-nav-link" aria-label="Sair" onClick={() => void signOut()}><LogOut size={16}/><span>Sair</span></button>
        </>}
      </div>
    </div></header>
    <div className="main-container online-container">
      {status === 'loading' && <Loading label="Carregando…"/>}
      {status === 'offline' && <div className="main-card online-narrow"><h1 className="screen-title">Sem conexão com o servidor.</h1>
        <p className="screen-subtitle">Verifique se a API está rodando e tente de novo.</p>
        <button className="button button--primary" onClick={retry}>Tentar de novo</button></div>}
      {(status === 'anonymous' || status === 'authenticated') && <AnimatePresence mode="wait" initial={false}>
        <motion.div key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          <Outlet/>
        </motion.div>
      </AnimatePresence>}
    </div>
    <footer className="footer gd-footer"><Logo size={34} tagline/><p>X1 entre amigos · versão de desenvolvimento</p></footer>
  </div></MotionConfig>;
}
