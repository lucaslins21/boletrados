import { MotionConfig } from 'framer-motion';
import { Home, LogOut, PenLine, ShieldCheck, UserRound } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { Brand } from '../components/Brand';
import { Pill } from '../components/ui';
import { useSession } from './session';
import './online.css';
import './curation/curation.css';

export function OnlineLayout() {
  const { status, user, signOut, retry } = useSession();
  return <MotionConfig reducedMotion="user"><div className="app-shell">
    <header className="site-header"><div className="site-header-inner">
      <Link to="/" className="brand-link" aria-label="Boletrados — início"><Brand small/></Link>
      <div className="header-right">
        <Link to="/" className="online-nav-link" aria-label="Início"><Home size={16}/><span>Início</span></Link>
        {user && <>
          <Link to="/perguntas" className="online-nav-link" aria-label="Perguntas"><PenLine size={16}/><span>Perguntas</span></Link>
          <Link to="/perfil" className="online-nav-link" aria-label="Perfil"><UserRound size={16}/><span>Perfil</span></Link>
          {user.admin && <Link to="/admin" className="online-nav-link" aria-label="Moderação"><ShieldCheck size={16}/><span>Moderação</span></Link>}
          <span className="online-user"><Pill tone="lime">{user.display_name}</Pill></span>
          <button className="online-nav-link" aria-label="Sair" onClick={() => void signOut()}><LogOut size={16}/><span>Sair</span></button>
        </>}
      </div>
    </div></header>
    <div className="bg-spark bg-spark--one"/><div className="bg-spark bg-spark--two"/>
    <div className="main-container online-container">
      {status === 'loading' && <p className="online-loading" role="status">Carregando…</p>}
      {status === 'offline' && <div className="main-card online-narrow"><h1 className="screen-title">Sem conexão com o servidor.</h1>
        <p className="screen-subtitle">Verifique se a API está rodando e tente de novo.</p>
        <button className="button button--primary" onClick={retry}>Tentar de novo</button></div>}
      {(status === 'anonymous' || status === 'authenticated') && <Outlet/>}
    </div>
    <footer className="footer"><div><Brand small/><span>Quem entende de bola, joga.</span></div><p>X1 online · versão de desenvolvimento</p></footer>
  </div></MotionConfig>;
}
