import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import DemoApp from './demo/DemoApp';
import { HomePage } from './online/HomePage';
import { InvitePage } from './online/InvitePage';
import { MatchPage } from './online/MatchPage';
import { ProfilePage } from './online/ProfilePage';
import { AdminNewQuestionPage, AdminQuestionPage, AdminQueuePage } from './online/curation/AdminPages';
import { MySubmissionsPage, SubmissionFormPage } from './online/curation/SubmissionPages';
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
 *  /demo          demo local (dois jogadores no mesmo aparelho) — será removida no lançamento do online
 */
// Galeria das ilustrações: só em desenvolvimento (não entra no build de produção).
const ArtGallery = import.meta.env.DEV ? lazy(() => import('./game/ArtGallery')) : null;

export default function App() {
  return <BrowserRouter>
    <Routes>
      <Route path="/demo" element={<DemoApp/>}/>
      {ArtGallery && <Route path="/_arte" element={<Suspense fallback={null}><ArtGallery/></Suspense>}/>}
      <Route element={<SessionProvider><OnlineLayout/></SessionProvider>}>
        <Route index element={<HomePage/>}/>
        <Route path="convite/:key" element={<InvitePage/>}/>
        <Route path="partidas/:id" element={<MatchPage/>}/>
        <Route path="perfil" element={<ProfilePage/>}/>
        <Route path="jogadores/:id" element={<ProfilePage/>}/>
        <Route path="perguntas" element={<MySubmissionsPage/>}/>
        <Route path="perguntas/nova" element={<SubmissionFormPage/>}/>
        <Route path="perguntas/:id/editar" element={<SubmissionFormPage/>}/>
        <Route path="admin" element={<AdminQueuePage/>}/>
        <Route path="admin/perguntas/nova" element={<AdminNewQuestionPage/>}/>
        <Route path="admin/perguntas/:id" element={<AdminQuestionPage/>}/>
        <Route path="*" element={<HomePage/>}/>
      </Route>
    </Routes>
  </BrowserRouter>;
}
