# Boletrados — definição de produto (v1.0, 2026-11-19)

> **Este documento é a referência de produto.** As decisões aqui estão fechadas: não reabrir sem uma necessidade nova e relevante. Decisões técnicas estão em `docs/ARQUITETURA.md`; o deploy, em `docs/DEPLOY.md`. A seção 21 mostra o que já está implementado.

## 1. Visão geral

Jogo social de perguntas e respostas sobre futebol, com a dinâmica do Perguntados, mas identidade visual própria, temática de futebol e sorteio de categorias com bolinhas. Ele deve ser:

- simples de entender, divertido e competitivo;
- com identidade forte e polimento de jogo casual (não visual de formulário nem de dashboard);
- **mobile-first**, mas usável no computador;
- com partidas entre amigos, estatísticas individuais e histórico de confrontos;
- com um banco de perguntas que **cresce por contribuições dos próprios usuários**.

## 2. Modo de jogo (MVP)

O único modo é o **X1 por turnos entre amigos**. Não há matchmaking público, torneio nem duelo simultâneo.

1. O jogador faz login e cria um desafio.
2. Recebe um link e um código para mandar ao amigo (WhatsApp, Instagram, Discord…).
3. O amigo abre o convite e entra na partida. **Se não estiver logado, o convite é preservado durante o login.**
4. Os dois jogam por turnos, sem precisar estar online ao mesmo tempo. Quando alguém perde a vez, o outro é avisado.

Limites: até **3 partidas em andamento** por jogador; convites pendentes não contam nesse limite e têm limite próprio de 5.

**Login:** o produto prevê Google e Facebook. No MVP, **só Google**; o Facebook vem depois. Cada jogador tem um perfil interno independente do provedor, e provedores não são vinculados automaticamente pelo e-mail.

## 3. As seis categorias

| Categoria | Abrangência |
|---|---|
| **Futebol Brasileiro** | Brasileirão (todas as divisões), Copa do Brasil, Supercopa, estaduais, Copa do Nordeste, Copa Verde e regionais, competições extintas, clubes de todas as regiões, jogadores, técnicos, rivalidades, títulos e história. |
| **Futebol Europeu** | Ligas nacionais (Premier, La Liga, Serie A, Bundesliga, Ligue 1, Portugal e demais), copas nacionais, Champions, Europa League, Conference League, Supercopa da UEFA, competições extintas; clubes, jogadores, transferências, rivalidades e história. |
| **Futebol Sul-Americano** | Libertadores, Sul-Americana, Recopa, Mercosul, Supercopa Libertadores, Copa CONMEBOL e outras continentais, atuais ou extintas; clubes e campeonatos nacionais dos **outros** países sul-americanos. |
| **Seleções** | Seleções do mundo todo: Copas do Mundo masculina e feminina, Copa América, Eurocopa, CAN, Copa Asiática, Copa Ouro, Nations League, Confederações, eliminatórias, base, futebol olímpico, recordes e partidas históricas, atuais ou extintas. |
| **Escudos** | Abrangência mundial e categoria **mista** (texto ou imagem): identificação, escudos antigos ou parciais, evolução, símbolos, cores e significados, de clubes e seleções. |
| **Estádios** | Abrangência mundial e categoria **mista**: identificação visual, localização, capacidade, mandantes, apelidos, história e partidas marcantes. |

**Regra:** competição **só nacional brasileira** fica em Futebol Brasileiro, nunca em Sul-Americano. Ex.: o Brasileirão de 2008 é Brasileiro; a Libertadores de 2019 é Sul-Americano, mesmo que o campeão seja brasileiro.

## 4. Uma pergunta, várias categorias

- Cada pergunta existe **uma única vez** no banco, com uma ou mais categorias. Exemplos:
  - final da Copa de 1950 → Seleções + Estádios;
  - Santiago Bernabéu → Europeu + Estádios;
  - Copa América de 2015 → Seleções + Sul-Americano;
  - escudo do Barcelona → Escudos + Europeu.
- Só entram categorias de **relação direta**, e a categoria **não pode entregar a resposta**. Limite técnico: **até 3 categorias** por pergunta.

## 5. Formatos

1. **Texto**: enunciado, quatro alternativas e uma correta.
2. **Texto + imagem**: o mesmo formato, com uma imagem complementar.

Não existe pergunta só de imagem: o enunciado é sempre obrigatório. A imagem pode aparecer em qualquer categoria.

## 6. Cronômetro

- **Todas as perguntas têm 15 segundos**: texto, imagem, normal ou de troféu. O tempo começa quando a pergunta aparece.
- Tempo esgotado conta como erro e o jogador perde a vez. A pergunta não pode ser pausada e a resposta confirmada não muda.
- **A validação é no backend.** Há uma tolerância de rede de 1 s, e a tela continua mostrando 15 s.
- Para caber em 15 s, há limites de texto: **enunciado ≤ 180**, **alternativa ≤ 60** e **explicação ≤ 500** caracteres.

## 7. Mecânica

- **Pergunta normal** (categoria sorteada):
  - acerto soma 1 à sequência, e o jogador continua;
  - erro ou tempo esgotado zera a sequência e passa a vez.
- **Três acertos normais seguidos** dão o direito de tentar um troféu: o jogador **escolhe** um troféu que ainda não tem e recebe a **pergunta decisiva** daquela categoria.
- **Pergunta decisiva**:
  - **acerto** conquista o troféu, zera a sequência, **mantém a vez** e volta ao sorteio. **Acertar o troféu não encerra a vez**: dá para ganhar vários troféus numa mesma vez. A regra é configurável (`keepPossessionAfterTrophy`), mas esta é a regra atual;
  - **erro**: não ganha o troféu, zera a sequência e perde a vez.
- **Vitória**: cada jogador tem a própria coleção de 6 troféus, e os dois podem ter troféus das mesmas categorias. **Vence na hora quem completar os 6.** Não há rodadas fixas nem pontos ou gols como critério.

## 8. Sorteio com bolinhas

- Não é roleta: é um **sorteio com bolinhas**, inspirado nas cerimônias da Libertadores e da Champions. A sequência é:
  1. o globo aparece;
  2. as bolinhas se movem;
  3. uma bolinha é escolhida;
  4. ela abre;
  5. a categoria é revelada;
  6. vem a pergunta.
- As seis categorias **continuam no sorteio** mesmo depois de conquistado o troféu delas.
- Pergunta normal: a categoria vem do sorteio. Tentativa de troféu: o jogador escolhe a categoria, sem sorteio.
- O **resultado é definido pelo backend**; a animação só o representa.
- Categoria **sem perguntas inéditas** para aquele jogador é **re-sorteada automaticamente** entre as disponíveis, e a interface mostra quais estão esgotadas. Se todas esgotarem, aparece "acabaram as inéditas".

## 9. Experiência visual

- **Referências**: Perguntados (simplicidade, polimento, personalidade), sorteios de futebol, transmissões esportivas e jogos casuais mobile.
- **Tom**: divertido, moderno, colorido e muito bem acabado, **sem ficar infantil** nem parecer dashboard corporativo.
- **Ferramentas**: React + TypeScript + Vite; CSS com design tokens; Motion para as transições. Rive ou Lottie só se uma animação justificar; SVGs e ilustrações próprios. Sem engine de jogo.
- **Animações a caprichar**:
  - sorteio de bolinhas e abertura/revelação da categoria;
  - acerto e erro;
  - progresso dos três acertos e chance de troféu;
  - conquista de troféu e vitória final.

  As animações recorrentes devem ser curtas, com opção de pular e de movimento reduzido.
- **Evoluir o que já existe**, sem refazer a identidade visual sem necessidade.
- **Marca**: *Boletrados* é provisória e não usa símbolos registrados de ligas ou clubes. Logo, mascote e verificação de marca ainda estão pendentes.

## 10. Nunca repetir perguntas (regra central)

**Uma pergunta nunca é mostrada duas vezes ao mesmo usuário.** Não importa a categoria, a partida, o adversário, o modo, se ele acertou ou errou, nem se viu a pergunta numa revisão.

- O histórico de exposição por usuário é **global e permanente** (`question_exposures`, único por usuário e pergunta).
- **O autor** nunca recebe a própria pergunta.
- **Quem revisa** também não. Abrir a pergunta completa no painel conta como "vista"; a lista do painel mostra só o começo do enunciado.
- Editar uma pergunta **não a torna inédita**: as exposições valem pelo id.
- Perguntas quase idênticas devem ser detectadas na curadoria (seção 13).
- A garantia está **no banco e no backend**. A regra **nunca é quebrada** para completar uma partida quando o estoque acaba.

## 11. Dificuldade dinâmica

- Três níveis: **fácil, médio e difícil**. Quem cria a pergunta informa a dificuldade **inicial** estimada.
- A dificuldade **atual** é recalculada pelo desempenho real:
  - **≥ 70%** de acerto: fácil;
  - **de 40% a menos de 70%**: médio;
  - **< 40%**: difícil.

  As faixas são parâmetros iniciais.
- Só reclassifica com **≥ 50 respostas válidas**. **Timeouts ficam separados** dos erros de conhecimento e não entram na taxa. Como ninguém vê a mesma pergunta duas vezes, toda resposta já é a primeira exposição daquele usuário.
- **Futuro**: considerar a habilidade dos jogadores, proteger contra quem erra de propósito e evoluir para Teoria de Resposta ao Item.
- **Ainda não decidido**: o peso da dificuldade na seleção das perguntas. Hoje é uniforme entre as inéditas; não inventar uma distribuição.

## 12. Perguntas enviadas pelos usuários (escopo desde o início)

- Qualquer usuário logado pode enviar perguntas. A pergunta enviada tem:
  - enunciado;
  - quatro alternativas, com a correta indicada;
  - uma a três categorias;
  - dificuldade inicial;
  - **fonte verificável**;
  - **explicação**;
  - imagem opcional.
- O autor acompanha o andamento em **"Minhas perguntas"**. Os estados implementados são:
  - **rascunho**, que fica só no navegador até o envio;
  - **enviada**;
  - **em análise**;
  - **devolvida para correção**: o autor corrige e reenvia;
  - **rejeitada**;
  - **publicada**;
  - **arquivada**.
- O autor pode editar enquanto a pergunta está *enviada* (antes da análise) ou *devolvida*.
- **Limites anti-spam**: 20 envios e 30 imagens por dia por usuário.

## 13. Moderação no MVP: admin + envio pelos usuários

1. O usuário envia a pergunta.
2. O sistema valida os campos obrigatórios.
3. O sistema procura **possíveis duplicatas**: similaridade do enunciado, mesma resposta correta e mesmos números. O autor vê só *quantas* perguntas parecidas existem; mostrar quais exporia perguntas do banco.
4. A pergunta entra na **fila de moderação**.
5. O administrador analisa, corrige quando cabe, **aprova, rejeita ou devolve** com um motivo, que o autor vê.
6. **Só perguntas aprovadas (publicadas) entram nas partidas.**

- O admin também **cadastra perguntas direto**, **edita** (cada edição gera uma versão de auditoria), **arquiva e restaura**.
- **Fonte e explicação são obrigatórias** para publicar.
- Para virar admin, alguém roda um comando no servidor (`bin/rails "admin:grant[EMAIL_OU_ID]"`). Não há tela para isso, e o painel responde 404 para quem não é admin.
- A IA poderá ajudar no futuro (duplicidade, ambiguidade, resposta possivelmente errada, alternativas, categoria, fontes), **mas nunca como única fonte da verdade**. Na v1, **a aprovação final é do administrador**.
- **Imagens**: JPEG, PNG ou WebP de até 512 KB, conferidas pelo conteúdo do arquivo; SVG não é aceito. Ficam guardadas no Postgres e são servidas só para quem enviou, para os admins e para quem já recebeu a pergunta. Quem envia deve ter direito de uso.

## 14. Revisão comunitária (futuro, já previsto na arquitetura)

- **Três avaliações positivas independentes** de revisores confiáveis publicam automaticamente. Contestação fundamentada ou conflito vai para um moderador.
- Os revisores não veem os votos dos outros antes de avaliar. O autor não revisa a própria pergunta. Revisar conta como exposição.
- **Para virar revisor confiável** (exige não ter punição grave recente), há dois caminhos:
  - **por reputação**: conta com 7 dias ou mais, 100 avaliações de treino e precisão de 95% ou mais;
  - **por convite**: convite administrativo, 40 avaliações de treino e precisão de 95% ou mais.

  As avaliações de treino têm referência verificada.
- **Manutenção do status**:
  - precisão auditada de 95% ou mais: mantém;
  - de 90% a menos de 95%: observação, com suspensão temporária da aprovação automática;
  - abaixo de 90%: suspensão e nova qualificação;
  - fraude: revogação e possível banimento.

  Tudo isso depende de amostra suficiente e revisão justa. A confiabilidade **não é medida só pela concordância com a maioria**, e sim por auditorias e perguntas de referência.
- A revisão é voluntária e **não dá vantagem nas partidas**.
- A tabela `question_reviews` já tem `reviewer_kind` (`admin` ou `community`) para receber isso.

## 15. Perfil e estatísticas

- O perfil mostra:
  - nome e avatar;
  - **time favorito** (preferência, sem vantagem no jogo; *pendente*);
  - partidas, vitórias, derrotas e aproveitamento;
  - troféus;
  - acerto por categoria (**tempo esgotado conta como erro**);
  - histórico de confrontos e números contra cada adversário;
  - **perguntas aprovadas** (contribuições).
- As estatísticas ficam no backend.
- **Privacidade**: o perfil é visível só para o próprio jogador e para quem já o enfrentou.

## 16. Prazos e abandono

- **24 h** para jogar cada vez. Esse prazo não se confunde com os 15 s de cada pergunta.
- Se o prazo estoura, a vez passa ao adversário. **Três estouros seguidos do mesmo jogador dão derrota por W.O.**
- Fechar a página com uma pergunta aberta não pausa o cronômetro: a pergunta expirada conta como erro. Sair com uma pergunta aberta equivale a tempo esgotado.
- **Avisos**: Web Push (é a sua vez, convite aceito, fim de jogo) e lembrete 4 h antes do prazo. O e-mail só sai se houver SMTP configurado.
- Partidas e prazos ficam guardados no backend.

## 17. Contra consulta externa e trapaça

- **Implementado**:
  - a resposta certa nunca vai ao frontend antes da resposta do jogador;
  - nenhum lote de perguntas é enviado antecipadamente;
  - tempo e correção são validados no backend;
  - sorteio e resultado são definidos pelo servidor;
  - a pergunta não pode ser pausada;
  - seleção e cópia do texto da pergunta são dificultadas;
  - a imagem da pergunta só é servida a quem já a recebeu.
- **Pendente**: registrar eventos suspeitos de forma proporcional.
- Uma aplicação web **não impede** screenshots, fotos ou consulta em outro aparelho. Nada de medidas agressivas que prejudiquem jogadores legítimos, nem de vender barreira de interface como segurança absoluta.

## 18. Arquitetura

O frontend é React + TypeScript + Vite (`web/`); o backend, Rails API + PostgreSQL (`api/`), com as regras da partida no servidor; a documentação fica em `docs/`. Detalhes em `docs/ARQUITETURA.md`.

## 19. Fora das prioridades agora

Matchmaking aleatório, duelo em tempo real, torneios, rankings globais complexos, divisões, monetização, poderes especiais, guerra de torcidas e o sistema completo de revisores comunitários.

## 20. Como trabalhar neste projeto

1. Antes de cada tarefa, inspecionar o que já existe.
2. Implementar só o necessário.
3. Rodar os testes.
4. Atualizar a documentação com as mudanças reais.

Não reabrir decisões fechadas. Preservar o histórico e o trabalho feito. Não declarar nada concluído sem verificar.

## 21. Estado de implementação (2026-11-19)

| Área | Situação |
|---|---|
| X1 por turnos, convites (link e código), login Google, limites de partidas | ✅ |
| Motor de regras no servidor (sorteio, 15 s + 1 s, sequência, troféus, vitória, re-sorteio de esgotadas) | ✅ |
| Prazos de 24 h, W.O., timeout ao sair, avisos push e lembrete | ✅ |
| Nunca repetir (exposição global por jogo, autoria e revisão) | ✅ |
| Perfil, estatísticas, rivais e confronto | ✅ — **falta o time favorito** |
| Envio de perguntas, fila de moderação, cadastro direto, edição com versões, arquivar | ✅ |
| Detecção de duplicatas | ✅ (heurística: texto + resposta + números; a IA fica para o futuro) |
| Dificuldade dinâmica (contadores, faixas, mínimo de 50, timeouts à parte) | ✅ — falta considerar habilidade e manipulação |
| Imagens nas perguntas | ✅ |
| Dificultar cópia do texto | ✅ — **falta registrar eventos suspeitos** |
| Animação de "bolinha que abre" e polimento das animações da seção 9 | Parcial (o globo e a revelação existem) |
| Login Facebook, revisão comunitária, peso da dificuldade no sorteio | Futuro ou indefinido |
