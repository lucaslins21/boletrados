# Handoff para Claude CLI

Projeto **Boletrados** — quiz de futebol X1 por turnos.

## Estado atual

O repositório contém frontend Vite + React + TS jogável em modo **demo local**. Há uma home, sala da partida, sorteio de bolinhas com Motion, perguntas de 15s, 3 acertos para chance de troféu, feedback e conquista dos 6 troféus. Possui perguntas demonstrativas e registro local do histórico de exposições.

**v0.2 (2026-11-19):** auditoria de qualidade feita — ver `docs/AUDITORIA_v0.2.md`. O motor (`src/lib/game.ts`) tem transições puras e testadas com Vitest (`npm test`); o sorteio é persistido no estado do jogo; modais, cronômetro e dock mobile foram revisados para acessibilidade e movimento reduzido.

**Não afirmar** que login, convites, backend e multiplayer existem: estão planejados. Manter o visual polido/mobile-first e respeitar as decisões em `docs/PRODUCT.md`.

## Primeiros passos

Monorepo: frontend em `web/`, API Rails em `api/` (ver README).

```bash
cd web && npm install && npm run dev && npm run typecheck && npm test && npm run build
HOST_UID=$(id -u) HOST_GID=$(id -g) docker compose up                 # API + Postgres
docker compose run --rm -e RAILS_ENV=test api bundle exec rspec
```

## O que fazer em seguida

1. ~~Revisar acessibilidade e responsividade; testes de unidade do motor.~~ Feito na v0.2. Decidir as pendências listadas em `docs/AUDITORIA_v0.2.md`.
2. Refinar os assets do sorteio (pular/reduzir animação já implementados). Fazer testes de UX de 15 segundos.
3. Backend Rails API + PostgreSQL conforme `docs/ARQUITETURA.md`. **Etapa 1 (monorepo + esqueleto `api/` + Docker Compose + CI) concluída**; a próxima é a etapa 2 (schema, seeds das 54 perguntas e port das regras para Ruby).
4. Implementar Google/Facebook OAuth e convites por link/código, protegendo tokens e continuando o fluxo após login.
5. Mover para o servidor o relógio autoritativo, sorteios, reserva de perguntas inéditas, mudanças de posse e concessão de troféus. Preferir endpoints idempotentes e transações.
6. Criar um banco de perguntas curadas e painel de moderação. Não publicar fatos gerados por IA sem checagem.

## Cuidados de negócio

- Uma pergunta pode ter várias categorias, sem duplicação física da questão.
- Perguntas nunca repetidas para um usuário em nenhum modo ou categoria, incluindo perguntas que ele escreveu ou revisou.
- Manter seleção do troféu separada do sorteio normal; categorias conquistadas **não saem** do sorteio.
- Resposta errada/timeout perde a vez. Pergunta decisiva correta ganha troféu **e a vez continua**.
- 15 segundos qualquer formato.
- Cada jogador tem sua própria coleção de troféus.

## Prompt sugerido

> Estou no repositório Boletrados. Leia integralmente README.md e docs/PRODUCT.md e revise o estado atual. Continue o desenvolvimento sem refazer a identidade visual. Primeiro faça uma auditoria de qualidade da demo (bugs de fluxo, acessibilidade, responsividade, regras e temporizador) e proponha pequenas melhorias. Ainda não implemente o backend sem discutirmos arquitetura. Rode typecheck/build/testes e documente as alterações.
