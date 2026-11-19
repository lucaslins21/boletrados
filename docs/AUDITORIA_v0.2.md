# Auditoria de qualidade da demo — v0.2 (2026-11-19)

Escopo: bugs de fluxo, regras, temporizador, acessibilidade e responsividade da demo local. Nenhuma mudança de identidade visual nem de backend.

Verificação: `npm run typecheck`, `npm test` (30 testes), `npm run build` e smoke test em Chrome headless (390×844 e 1366×860) sem erros de console.

## Bugs corrigidos

| # | Problema | Correção |
|---|---|---|
| 1 | `npm run typecheck` falhava: faltava a declaração de tipos do Vite para importar `.svg`. | `src/vite-env.d.ts`. |
| 2 | **Dock mobile sem ação:** "Início" e "Jogar" retornavam a função em vez de chamá-la; na home, "Início" abria as regras. | Handlers corrigidos. "Jogar" inicia a demo (home) ou vai ao sorteio (lobby); nas outras fases vira "Regras". O dock some durante a pergunta para não cobrir as alternativas. |
| 3 | **Re-sorteio por recarga:** a categoria sorteada ficava só no estado do React; recarregar a página permitia sortear de novo. | `drawnCategory` faz parte do `Game` e é salvo; o sorteio é decidido no clique e a animação só o revela (mesmo modelo que o servidor autoritativo vai usar). |
| 4 | Dados salvos incompatíveis ou corrompidos podiam travar a tela (`isGame` só checava 4 campos; pergunta inexistente em andamento ficava presa em "Pergunta indisponível"). | `restoreGame()` valida todos os campos, migra jogos v0.1 sem `drawnCategory` e descarta estados inconsistentes. |
| 5 | A troca de foco ou o `scrollIntoView` deslocava a página para o lado no mobile: os `.bg-spark` deixavam o `.app-shell` com 1120px de largura rolável. | `.app-shell{overflow:clip}`. |
| 6 | Ao ganhar o 6º troféu, o feedback dizia "A posse continua!" e "Continuar jogando". | Texto de vitória e botão "Ver resultado". |
| 7 | O `setTimeout` da animação do sorteio não era cancelado ao sair da tela. | Timer em `ref`, limpo ao trocar de fase ou desmontar. |
| 8 | Hack em `questions.ts` reescrevia `seeds[36]` depois de declarado. | A pergunta do Botafogo foi corrigida direto na origem (o ID `demo-037` continua o mesmo). |

## Melhorias

- **Motor (`src/lib/game.ts`)**: transições explícitas (`enterDraw`, `drawCategory`, `startDrawnQuestion`, `startTrophyQuestion`, `recoverFromEmpty`) com guardas de fase; `startTrophyQuestion` rejeita troféu já conquistado; `rng` e `now` injetáveis para testes; regras em `RULES`, incluindo `keepPossessionAfterTrophy` (a configuração pedida no PRODUCT.md).
- **Testes (`src/lib/game.test.ts`, Vitest)**: sorteio, exposição única por jogador (inclusive entre categorias), limite de 15s, posse/sequência, troféu (acerto, erro, já conquistado, coleção individual), vitória com 6 e restauração de dados salvos.
- **Movimento reduzido**: `MotionConfig reducedMotion="user"`; o sorteio dura 300ms com `prefers-reduced-motion`; botão "Pular animação" durante o sorteio.
- **Acessibilidade**:
  - Modais com Esc, foco inicial, Tab preso dentro e foco devolvido ao fechar.
  - Cronômetro como `progressbar` e região `aria-live` que anuncia só os marcos de 10s e 5s.
  - Atalhos A–D / 1–4 nas alternativas.
  - Emojis decorativos com `aria-hidden`, ilustrações com `role="img"` e resultado do sorteio anunciado.
- **Feedback**: mostra a resposta marcada (riscada) além da correta e usa o nome do adversário ("a bola é de …").

## Decisões tomadas (2026-11-19)

1. **`demo-019` / `demo-027`** (ambas sobre a Libertadores 2016): **manter as duas** na demo. Fica para a curadoria real.
2. **Categoria esgotada**: **re-sorteio automático**. `drawCategory` sorteia só entre as categorias com inéditas para o jogador ativo, e a tela de sorteio avisa quais estão fora. Se todas esgotarem, vai para "Acabaram as inéditas" e só oferece nova demo.
3. **Sair com pergunta aberta**: **conta como timeout**. "Início" não descarta mais a partida: `leaveToHome` encerra a pergunta como tempo esgotado e pausa a partida, e a home mostra "Continuar partida" / "Nova partida". No mobile, a pergunta não tem botão de saída (o dock fica oculto e o "Início" do cabeçalho só aparece no desktop); fechar a aba também resulta em timeout, porque o prazo salvo não pausa.

## Pendências

1. **Bundle**: o JS tem ~409 kB (128 kB gzip), principalmente Motion + React. Dá para avaliar `LazyMotion` quando houver mais telas.
2. **Testes de UX dos 15s** (item 2 do handoff) ainda precisam de jogadores reais.
