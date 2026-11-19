import { BrowserRouter, Route, Routes } from 'react-router';
import DemoApp from './demo/DemoApp';
import { HomePage } from './online/HomePage';
import { InvitePage } from './online/InvitePage';
import { MatchPage } from './online/MatchPage';
import { OnlineLayout } from './online/OnlineLayout';
import { SessionProvider } from './online/session';

/**
 * Rotas:
 *  /              X1 online (login ou lista de partidas)
 *  /convite/:key  prévia e aceite de convite (código BOLA-XXXXXX ou token do link)
 *  /partidas/:id  partida
 *  /demo          demo local (dois jogadores no mesmo aparelho) — será removida no lançamento do online
 */
export default function App() {
  return <BrowserRouter>
    <Routes>
      <Route path="/demo" element={<DemoApp/>}/>
      <Route element={<SessionProvider><OnlineLayout/></SessionProvider>}>
        <Route index element={<HomePage/>}/>
        <Route path="convite/:key" element={<InvitePage/>}/>
        <Route path="partidas/:id" element={<MatchPage/>}/>
        <Route path="*" element={<HomePage/>}/>
      </Route>
    </Routes>
  </BrowserRouter>;
}
