# Boletrados — definição de produto (v0.1)

## Objetivo

Quiz social de futebol para web mobile-first, visual divertido, polido e com identidade de futebol. O jogador desafia um amigo por link/código, e ambos jogam um X1 por turnos assíncronos em horários diferentes. Cada jogador tenta conquistar **seis troféus próprios**. O primeiro a completar todos vence.

## Categorias fixadas

| Categoria | Abrangência |
|---|---|
| Futebol Brasileiro | Clubes, campeonatos nacionais, regionais, estaduais, atuais e extintos, rivalidades, jogadores e história |
| Futebol Europeu | Clubes, ligas, copas e competições continentais da UEFA, atuais e extintas |
| Futebol Sul-Americano | Clubes e campeonatos domésticos dos outros países sul-americanos; Libertadores, Sul-Americana, Recopa, Mercosul e torneios CONMEBOL atuais/extintos; não classificar automaticamente competições domésticas brasileiras aqui |
| Seleções | Seleções nacionais do mundo inteiro; torneios atuais/extintos, Copas, eliminatórias, masculino/feminino e categorias de base |
| Escudos | Conteúdo visual ou textual de escudos de clubes e seleções do mundo inteiro |
| Estádios | Conteúdo visual ou textual de estádios do mundo inteiro |

Uma questão pode pertencer a múltiplas categorias, desde que o enquadramento seja direto e não revele a resposta pela categoria. Cada pergunta é entidade única no banco.

## Mecânica fechada

- Ao iniciar cada pergunta normal, o usuário vê um **sorteio com bolinhas** inspirado em cerimônias de futebol. Há seis bolas/categorias; todas permanecem elegíveis após conquistar troféus.
- A pergunta sorteada é inédita para aquele usuário, com texto obrigatório, imagem opcional e quatro alternativas (uma correta).
- Cronômetro de **15 segundos** para todas as perguntas, normais e decisivas.
- Acerto normal soma 1 à sequência e mantém a posse. Erro ou timeout zera a sequência e passa a vez ao outro jogador.
- Ao acumular **3 acertos normais consecutivos**, o jogador escolhe um troféu que ele ainda não possui. A pergunta decisiva vem daquela categoria, com 15s.
- Acerto decisivo: concede troféu, zera sequência normal e mantém a posse para sorteio da próxima pergunta. Erro decisivo: não concede troféu, zera a sequência, passa a vez.
- Vence imediatamente quem obtiver todos os **6 troféus**. O adversário pode possuir troféus das mesmas categorias.
- Uma pergunta já exposta a um usuário (inclusive em revisão, envio próprio, outra categoria ou outra partida) nunca mais deve ser mostrada em jogos a ele.
- A regra de continuação após ganhar troféu foi escolhida para a v1, mas deve ser fácil de configurar futuramente (`RULES.keepPossessionAfterTrophy`).
- **Categoria sem inéditas (decidido em 2026-11-19):** se o jogador já viu todas as perguntas de uma categoria, ela é re-sorteada automaticamente, ou seja, o sorteio considera só as categorias com inéditas para aquele jogador, e a tela avisa quais estão esgotadas. Se todas esgotarem, a partida mostra "acabaram as inéditas". Isso é independente dos troféus: categorias conquistadas continuam elegíveis.
- **Sair com pergunta aberta (decidido em 2026-11-19):** equivale a tempo esgotado: zera a sequência e passa a vez. O prazo não pausa; fechar a aba e voltar depois do prazo resulta em timeout. No servidor, a resposta só é aceita dentro do deadline.

## Login, convites, estatísticas (planejado)

- Login via Google e Facebook (identidade interna única por usuário, com vinculação explícita de provedores). **MVP: só Google**; Facebook depois.
- Avisos de vez por Web Push + e-mail (lembrete antes do prazo de 24h).
- Criar partida/convite com token aleatório, link compartilhável e código curto; preservar convite no fluxo de login.
- Tela de partidas em andamento, aguardando o outro jogador, completas; perfil com vitórias, derrotas, troféus e desempenho por categoria; histórico de confronto. **Implementado (2026-11-19)**:
  - o perfil é visível só para o próprio jogador e para quem já o enfrentou (partida ativa ou encerrada);
  - no acerto por categoria, **tempo esgotado conta como erro**;
  - o próprio perfil lista os rivais; o de um adversário mostra o confronto direto.
- Definir política de prazo para iniciar turnos, W.O., abandono e notificações antes de ligar o multiplayer.

## Banco de perguntas e moderação (planejado)

- Propostas feitas por usuários com enunciado, quatro alternativas, correta, categorias, nível inicial, fonte verificável, explicação e eventual imagem.
- Triagem por IA ajuda a detectar duplicatas, ambiguidades e problemas factuais, mas não deve ser autoridade única.
- MVP: moderação final feita por administrador; posterior comunidade: 3 votos independentes positivos de revisores confiáveis para publicar automaticamente, conflitos vão para moderador, amostras auditadas.
- Revisor confiável: modelo híbrido de convite e reputação. Qualificação com precisão mínima **95%** em avaliações de referência; também manter precisão alta em auditorias. Dados de treino propostos: 100 avaliações (reputação) ou 40 (convite). Regras para suspensão/recuperação deverão ser calibradas.
- Ações de autor/revisor contam como exposição, inclusive caso não cheguem a votar após ler.
- Dificuldade inicialmente estimada pelo autor e alterada ao longo do tempo conforme taxa de acertos, considerando tamanho de amostra e habilidade dos jogadores. Timeouts contados separadamente.

## Visual

- Marca provisória *Boletrados*: divertido, esportivo, sem usar símbolos registrados de ligas ou clubes na identidade principal.
- Fundo noturno estilo estúdio esportivo, verde-lima vibrante como destaque, cores distintas por categoria, cards arredondados e ícones expressivos.
- Animar microinterações (botões, feedback) e macrointerações importantes (sorteio, conquista de troféu), com opção de movimento reduzido.
- Responsivo e **mobile-first**: web hoje; PWA/experiências nativas possíveis no futuro.

## Arquitetura futura sugerida

- Frontend React/TypeScript, preferencialmente mantendo componentes visuais separados do estado de partidas.
- Backend Rails API + PostgreSQL (opção familiar ao projeto), responsável por autenticação, convites, sorteios, gerenciamento de turnos, pontuação, deadlines, histórico global de perguntas e revisões.
- Entidades prováveis: users, identities, categories, questions, question_categories, question_versions, question_exposures, matches, match_players, match_events, answers, trophies, submissions, reviews, moderation_actions.
- Regras concorrentes no banco: índices únicos para impedir exposição repetida por usuário, idempotência das respostas, locking transacional por partida/turno, tokens de convite aleatórios com expiração.

## Incertezas (não inventar)

- ~~Prazo máximo de cada turno e política de W.O.~~ **Decidido (2026-11-19):** 24h por vez; o estouro passa a vez e 3 estouros seguidos do mesmo jogador dão W.O. Ver `docs/ARQUITETURA.md`.
- Peso real de dificuldade no sorteio ainda não definido.
- Feedback após pergunta e duração dos efeitos visuais podem ser refinados em testes.
- Identidade final/logotipo/mascote ainda pendentes de design e verificação de marca.
