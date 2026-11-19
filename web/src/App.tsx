import { lazy, Suspense } from 'react';
import type React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { HomePage } from './online/HomePage';
import { InvitePage } from './online/InvitePage';
import { MatchPage } from './online/MatchPage';
import { Loading } from './game/Decor';
import { OnlineLayout } from './online/OnlineLayout';
import { SessionProvider } from './online/session';

/**
 * Rotas:
 *  /              X1 online (login ou lista de partidas)
 *  /convite/:key  prévia e aceite de convite (código BOLA-XXXXXX ou token do link)
 *  /partidas/:id  partida
 *  /perfil        seu perfil e estatísticas;  /jogadores/:id  perfil de quem você já enfrentou
 *  /perguntas     suas perguntas enviadas (nova, editar quando devolvida)
 *  /admin         moderação (só administradores)
 *  /privacidade, /termos  política de privacidade (LGPD) e termos de uso (públicas)
 *  /demo          demo local (dois jogadores no mesmo aparelho) — será removida no lançamento do online
 */
// Páginas carregadas sob demanda: deixam a primeira abertura (home e partida) mais leve no celular.
const DemoApp = lazy(() => import('./demo/DemoApp'));
const ProfilePage = lazy(() => import('./online/ProfilePage').then(m => ({ default: m.ProfilePage })));
const MySubmissionsPage = lazy(() => import('./online/curation/SubmissionPages').then(m => ({ default: m.MySubmissionsPage })));
const SubmissionFormPage = lazy(() => import('./online/curation/SubmissionPages').then(m => ({ default: m.SubmissionFormPage })));
const AdminQueuePage = lazy(() => import('./online/curation/AdminPages').then(m => ({ default: m.AdminQueuePage })));
const AdminQuestionPage = lazy(() => import('./online/curation/AdminPages').then(m => ({ default: m.AdminQuestionPage })));
const AdminNewQuestionPage = lazy(() => import('./online/curation/AdminPages').then(m => ({ default: m.AdminNewQuestionPage })));
const PrivacyPage = lazy(() => import('./online/LegalPages').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./online/LegalPages').then(m => ({ default: m.TermsPage })));
const page = (node: React.ReactNode) => <Suspense fallback={<Loading/>}>{node}</Suspense>;

// Galeria das ilustrações: só em desenvolvimento (não entra no build de produção).
const ArtGallery = import.meta.env.DEV ? lazy(() => import('./game/ArtGallery')) : null;

export default function App() {
  return <BrowserRouter>
    <Routes>
      <Route path="/demo" element={page(<DemoApp/>)}/>
      {ArtGallery && <Route path="/_arte" element={<Suspense fallback={null}><ArtGallery/></Suspense>}/>}
      <Route element={<SessionProvider><OnlineLayout/></SessionProvider>}>
        <Route index element={<HomePage/>}/>
        <Route path="convite/:key" element={<InvitePage/>}/>
        <Route path="partidas/:id" element={<MatchPage/>}/>
        <Route path="perfil" element={page(<ProfilePage/>)}/>
        <Route path="jogadores/:id" element={page(<ProfilePage/>)}/>
        <Route path="perguntas" element={page(<MySubmissionsPage/>)}/>
        <Route path="perguntas/nova" element={page(<SubmissionFormPage/>)}/>
        <Route path="perguntas/:id/editar" element={page(<SubmissionFormPage/>)}/>
        <Route path="admin" element={page(<AdminQueuePage/>)}/>
        <Route path="admin/perguntas/nova" element={page(<AdminNewQuestionPage/>)}/>
        <Route path="admin/perguntas/:id" element={page(<AdminQuestionPage/>)}/>
        <Route path="privacidade" element={page(<PrivacyPage/>)}/>
        <Route path="termos" element={page(<TermsPage/>)}/>
        <Route path="*" element={<HomePage/>}/>
      </Route>
    </Routes>
  </BrowserRouter>;
}
