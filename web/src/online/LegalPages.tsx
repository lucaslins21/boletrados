import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import type React from 'react';

/** Contato do responsável pelo tratamento dos dados (LGPD, art. 41). */
export const CONTACT_EMAIL = 'lucas.lemos61@gmail.com';
const UPDATED = '19 de novembro de 2026';

function LegalShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <div className="legal-wrap">
    <main className="main-card legal-page">
      <Link to="/" className="subtle-link"><ArrowLeft size={16} aria-hidden="true"/> Início</Link>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="screen-title">{title}</h1>
      <p className="legal-updated">Última atualização: {UPDATED}</p>
      <div className="legal-body">{children}</div>
    </main>
  </div>;
}

const Mail = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export function PrivacyPage() {
  return <LegalShell eyebrow="PRIVACIDADE" title="Política de Privacidade">
    <p>O Boletrados é um jogo casual de perguntas sobre futebol, mantido por um desenvolvedor independente como projeto pessoal e sem fins comerciais. Esta política explica, em linguagem simples, quais dados usamos, para quê e como você controla isso, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>

    <h2>Quem cuida dos seus dados</h2>
    <p>O responsável (controlador) é o mantenedor do Boletrados. Para qualquer pedido ou dúvida sobre privacidade, escreva para <Mail/>.</p>

    <h2>O que coletamos</h2>
    <ul>
      <li><strong>Da sua conta Google</strong>, quando você entra: nome, e-mail, foto de perfil e um identificador da conta. Não recebemos sua senha nem acesso a outros dados do Google.</li>
      <li><strong>Do jogo</strong>: partidas, respostas, acertos, troféus, convites e as perguntas que você já viu, para que elas não se repitam.</li>
      <li><strong>Perguntas que você envia</strong>: enunciado, alternativas, fonte, explicação e o histórico da moderação.</li>
      <li><strong>Sessão</strong>: um cookie de login (httpOnly, válido por até 30 dias), o endereço IP e o navegador usados para entrar. Servem para manter você conectado e evitar abuso, como excesso de tentativas.</li>
      <li><strong>Avisos de vez</strong>, se você ativar: o endereço de notificação gerado pelo seu navegador.</li>
      <li><strong>No seu navegador</strong> (não chegam ao servidor): a preferência de som e o rascunho de uma pergunta ainda não enviada.</li>
    </ul>
    <p>Não usamos cookies de publicidade, ferramentas de rastreamento nem análise de comportamento.</p>

    <h2>Para que usamos</h2>
    <ul>
      <li>Criar e manter sua conta e permitir partidas entre amigos (execução do serviço que você pediu).</li>
      <li>Mostrar seu nome e foto para os seus adversários e no placar das partidas.</li>
      <li>Avisar quando for a sua vez, se você ativar os avisos.</li>
      <li>Moderar perguntas enviadas e manter o jogo justo e seguro (legítimo interesse).</li>
    </ul>
    <p>Seu e-mail não aparece para outros jogadores. <strong>Não vendemos, alugamos nem compartilhamos seus dados para publicidade.</strong></p>

    <h2>Com quem os dados ficam</h2>
    <p>Usamos serviços de terceiros para funcionar, que tratam os dados apenas para isso:</p>
    <ul>
      <li><strong>Google</strong>: login, fontes do site e exibição da sua foto de perfil.</li>
      <li><strong>Vercel</strong>: hospedagem do site.</li>
      <li><strong>Render</strong>: servidor do jogo.</li>
      <li><strong>Neon</strong>: banco de dados.</li>
      <li><strong>Serviço de notificação do seu navegador</strong> (Google, Mozilla ou Apple), se você ativar os avisos.</li>
    </ul>
    <p>Esses serviços ficam nos Estados Unidos, o que configura transferência internacional de dados, feita para executar o serviço que você usa.</p>

    <h2>Por quanto tempo</h2>
    <p>Mantemos os dados enquanto sua conta existir. Sessões expiram em até 30 dias. Ao excluir a conta, apagamos seus dados pessoais. Partidas já jogadas podem continuar no histórico do adversário, mas sem o seu nome, e perguntas aprovadas podem continuar no jogo sem identificar o autor.</p>

    <h2>Seus direitos</h2>
    <p>Você pode pedir a qualquer momento: confirmação e acesso aos seus dados, correção, exclusão da conta e dos dados, portabilidade, informações sobre compartilhamento e revogação do consentimento. Basta escrever para <Mail/> a partir do e-mail da sua conta. Respondemos em até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>

    <h2>Segurança</h2>
    <p>As conexões usam HTTPS, o cookie de sessão não pode ser lido por scripts e guardamos apenas um resumo criptográfico do token de login. Nenhum sistema é infalível: se houver um incidente que possa trazer risco a você, avisaremos.</p>

    <h2>Crianças e adolescentes</h2>
    <p>O Boletrados não é direcionado a menores de 13 anos. Entre 13 e 18 anos, o uso deve ter o conhecimento dos responsáveis.</p>

    <h2>Mudanças</h2>
    <p>Se esta política mudar, a data no topo será atualizada. Mudanças importantes serão avisadas no próprio site.</p>
    <p>Veja também os <Link to="/termos">Termos de Uso</Link>.</p>
  </LegalShell>;
}

export function TermsPage() {
  return <LegalShell eyebrow="TERMOS" title="Termos de Uso">
    <p>Ao usar o Boletrados, você concorda com estes termos. Eles são curtos de propósito.</p>

    <h2>O serviço</h2>
    <p>O Boletrados é um jogo casual e gratuito de perguntas sobre futebol, com partidas entre amigos. Ele é oferecido como está, por um desenvolvedor independente, e pode mudar, ficar fora do ar ou ser encerrado. Partidas, troféus e estatísticas não têm valor em dinheiro.</p>

    <h2>Sua conta</h2>
    <p>Você entra com a sua conta Google e é responsável pelo que acontece nela. Use um nome que não ofenda ninguém e não se passe por outra pessoa.</p>

    <h2>Jogo limpo</h2>
    <ul>
      <li>Não use programas, bots ou falhas para obter vantagem.</li>
      <li>Não tente atrapalhar o funcionamento do site nem acessar dados de outros jogadores.</li>
      <li>Respeite os prazos: quem não joga no tempo perde a vez e, depois de repetidas ausências, a partida.</li>
    </ul>

    <h2>Perguntas enviadas</h2>
    <p>Ao enviar uma pergunta, você garante que ela é sua ou que pode usá-la, que as informações conferem com a fonte indicada e que imagens enviadas não violam direitos de terceiros. Você autoriza o Boletrados a revisar, editar, publicar e usar a pergunta no jogo, sem pagamento. A moderação pode recusar ou arquivar qualquer pergunta.</p>

    <h2>Marcas e nomes</h2>
    <p>Nomes de clubes, seleções, competições e estádios aparecem só como referência factual. Escudos de clubes aparecem apenas em perguntas de identificação, com finalidade informativa e sem fins comerciais, e pertencem aos seus titulares. O Boletrados não tem relação com essas entidades. Se você representa um clube e quer a remoção de um escudo, escreva para <Mail/>.</p>

    <h2>Suspensão</h2>
    <p>Contas que desrespeitarem estes termos podem ser suspensas ou excluídas. Você pode encerrar a sua quando quiser, pedindo pelo e-mail abaixo.</p>

    <h2>Contato</h2>
    <p>Dúvidas, pedidos ou problemas: <Mail/>. Para saber como tratamos seus dados, leia a <Link to="/privacidade">Política de Privacidade</Link>. Estes termos seguem as leis brasileiras.</p>
  </LegalShell>;
}
