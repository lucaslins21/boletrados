# Boletrados ⚽🏆

**Quem sabe de futebol merece um troféu.**

Protótipo interativo, mobile-first, do **Boletrados**: quiz de futebol com partidas X1 assíncronas, sorteio de categorias com bolinhas e seis troféus para conquistar.

> **Estado atual:** protótipo frontend local. O jogo roda com dois jogadores simulados no mesmo navegador. **Ainda não existem** login com Google/Facebook, convites reais, partidas entre aparelhos, banco de dados ou API. As perguntas são demonstrativas e precisam de curadoria antes de publicação.

## Rodar localmente

Requer **Node.js 20+**.

```bash
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite, normalmente `http://localhost:5173`.

```bash
npm run typecheck
npm test        # testes do motor de partidas (Vitest)
npm run build
```

## Tecnologias

- React 19 + TypeScript + Vite
- CSS responsivo com design tokens próprios (sem biblioteca de componentes)
- Motion (`framer-motion`) nas transições e no globo de sorteio
- Ícones Lucide
- Vitest para os testes do motor
- `localStorage` para manter a partida demonstrativa e histórico local de perguntas já vistas

## Mecânica definida

1. Modo inicial: **X1 entre amigos por turnos**. Na versão final, os jogadores poderão participar em horários diferentes.
2. Antes de **cada pergunta normal**, sorteia-se uma das **seis categorias** com uma animação de bolinhas. Categorias já conquistadas continuam no sorteio.
3. Categorias: **Futebol Brasileiro**, **Futebol Europeu**, **Futebol Sul-Americano**, **Seleções**, **Escudos** e **Estádios**.
4. Perguntas com enunciado e **quatro alternativas**; formatos texto e texto + imagem.
5. **15 segundos** para qualquer pergunta. Erro ou tempo esgotado zera a sequência e passa a vez.
6. **Três respostas normais consecutivas corretas** liberam a escolha de um troféu ainda não conquistado.
7. Acertar a pergunta decisiva concede o troféu, zera a sequência e **mantém a vez**. Errar passa a vez.
8. Cada jogador coleciona seus próprios seis troféus; **vence quem conquistar os seis primeiro**.
9. Uma pergunta pode estar em mais de uma categoria, mas **não pode ser repetida para o mesmo jogador**. Na demo, o histórico persiste por jogador fictício no navegador.
10. Categoria sem perguntas inéditas para o jogador é **re-sorteada automaticamente**.
11. **Sair com uma pergunta aberta conta como tempo esgotado** (a vez passa). A partida fica salva e pode ser continuada pela tela inicial.

## Conteúdo e moderação (planejamento, não implementado)

- Usuários autenticados poderão enviar perguntas com categoria(s), nível inicial de dificuldade, enunciado, alternativas, resposta correta, fonte e imagem opcional.
- As perguntas serão triadas por verificações automáticas e terão aprovação administrativa no início.
- Futuramente, três **revisores confiáveis** poderão aprovar automaticamente uma pergunta; sistema híbrido de convite e reputação, com precisão auditada mínima de **95%** para qualificação/manutenção.
- Autores e revisores não poderão receber no jogo perguntas às quais já tiveram acesso.
- Dificuldade inicial informada pelo autor será recalibrada usando desempenho real dos jogadores. Erros por timeout devem ser separados dos erros de conhecimento.

## Estrutura

```text
src/
  App.tsx                # Fluxos, telas e controles do protótipo
  styles.css             # Identidade visual responsiva
  components/
    Brand.tsx            # Marca provisória
    DrawBowl.tsx         # Globo de sorteio animado
  data/questions.ts      # Questões demonstrativas e categorias
  lib/game.ts            # Máquina de estados e regras locais (funções puras)
  lib/game.test.ts       # Testes das regras (Vitest)
  assets/stadium.svg     # Ilustração original simplificada
public/favicon.svg
docs/
  PRODUCT.md             # Regras fechadas, detalhes e próximos passos
  CLAUDE_HANDOFF.md      # Guia para continuar no Claude CLI
  AUDITORIA_v0.2.md      # Auditoria da demo: correções e pendências
```

## Limitações da demo

- `localStorage` não substitui histórico de servidor: exclusão de dados/uso de outro navegador zera a proteção local. O backend deve impor unicidade de exposição por usuário e sorteio seguro.
- O cronômetro é checado no navegador na demo. O backend deverá gerar/validar deadlines e rejeitar respostas fora do tempo.
- O sorteio é feito localmente e poderá ser manipulado; o backend deverá gerar sorteios autoritativos.
- Não é possível impedir completamente screenshots ou cópia de perguntas em aplicações web.
- Os conteúdos e as imagens devem ser licenciados/verificados antes de publicar.

Leia [`docs/CLAUDE_HANDOFF.md`](docs/CLAUDE_HANDOFF.md) para a próxima etapa no Claude CLI.
