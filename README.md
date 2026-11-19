# Boletrados ⚽🏆

**Quem sabe de futebol merece um troféu.**

Protótipo interativo, mobile-first, do **Boletrados**: quiz de futebol com partidas X1 assíncronas, sorteio de categorias com bolinhas e seis troféus para conquistar.

> **Estado atual:** o **X1 online funciona localmente** de ponta a ponta:
> - login (Google quando houver `GOOGLE_CLIENT_ID`, ou login de desenvolvimento);
> - convite por link ou código;
> - partida entre dois navegadores, com sorteio, perguntas e prazos aplicados pela API.
>
> A demo local continua em `/demo` até o lançamento. Ainda faltam os avisos (Web Push e e-mail), a hospedagem e a curadoria das perguntas, que hoje são demonstrativas. A arquitetura planejada está em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md). As perguntas são demonstrativas e precisam de curadoria antes de publicação.

Monorepo:

| Pasta | O quê |
|---|---|
| `web/` | Frontend Vite + React + TypeScript (demo jogável) |
| `api/` | Backend Rails 8.1 API + PostgreSQL (esqueleto) |
| `docs/` | Produto, arquitetura, auditoria e handoff |
| `docker-compose.yml` | PostgreSQL + API para desenvolvimento |

## Deploy

Plano gratuito (Vercel + Render + Neon) com passo a passo em [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Rodar o X1 online localmente

```bash
HOST_UID=$(id -u) HOST_GID=$(id -g) docker compose up -d   # API em http://localhost:3000 + Postgres
docker compose run --rm api bin/rails db:seed               # categorias e perguntas demo (uma vez)
cd web && npm install && npm run dev                        # http://localhost:5173
```

Abra duas janelas (uma anônima), entre com nomes diferentes no **login de desenvolvimento**, crie um desafio em uma e aceite com o código na outra.

Rotas do frontend: `/` (login e partidas), `/convite/:código-ou-token`, `/partidas/:id` e `/demo`.

Se as portas 3000 ou 5173 estiverem ocupadas:

```bash
API_PORT=3001 ALLOWED_ORIGINS=http://localhost:5174 docker compose up -d
VITE_API_BASE_URL=http://localhost:3001 npx vite --port 5174
```

## Frontend (`web/`)

Requer **Node.js 20+**.

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm test           # testes do motor de partidas (Vitest)
npm run build
```

## API (`api/`)

Requer **Docker** com Compose; Ruby e Postgres não precisam estar instalados na máquina.

```bash
HOST_UID=$(id -u) HOST_GID=$(id -g) docker compose up    # API em http://localhost:3000 (health: /up)
```

- Portas configuráveis: `API_PORT` (padrão 3000) e `POSTGRES_PORT` (padrão 5433 no host).
- `GOOGLE_CLIENT_ID`: Client ID OAuth do Google (tipo Web). Sem ele, `POST /auth/google` responde 401.
- `ALLOWED_ORIGINS`: origens do frontend aceitas (CORS + CSRF), separadas por vírgula. Padrão: `http://localhost:5173`.
- `FRONTEND_URL`: endereço do frontend usado nos links dos avisos. Padrão: `http://localhost:5173`.
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`: chaves do Web Push (gere com `docker compose run --rm api bin/rails push:vapid_keys`). Sem elas, os avisos push ficam desligados. **A chave privada é segredo.**
- `MAIL_FROM`: remetente dos e-mails. Em desenvolvimento, os e-mails vão para `api/tmp/mails`.
- Endpoints atuais:

| Método e rota | O quê |
|---|---|
| `GET /up` | Health check |
| `POST /auth/google` · `GET /me` · `DELETE /session` | Login Google, usuário atual, sair |
| `POST /auth/dev` | Login só com nome — **existe apenas em development/test** |
| `GET /matches` · `POST /matches` · `GET /matches/:id` · `DELETE /matches/:id` | Listar, criar convite, ver partida, cancelar convite |
| `GET /invites/:key` · `POST /invites/:key/accept` | Prévia pública e aceite (código `BOLA-XXXXXX` ou token do link) |
| `POST /matches/:id/draw` · `question` · `answer` · `resign` | Ações da vez (aceitam `Idempotency-Key`) |
| `GET /push/public_key` · `POST /push/subscriptions` · `DELETE /push/subscriptions` | Avisos Web Push do navegador |
- Testes e verificações:

```bash
docker compose run --rm -e RAILS_ENV=test api bundle exec rspec
docker compose run --rm api bin/rubocop
docker compose run --rm api bin/brakeman --no-pager
docker compose run --rm api bin/bundler-audit
```

A CI (`.github/workflows/ci.yml`) roda tudo isso, mais typecheck/testes/build do `web/`, em cada push e PR.

## Tecnologias do frontend

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
web/src/
  App.tsx                # Rotas (online em /, demo em /demo)
  online/                # X1 online: cliente da API, sessão, telas de partidas/convite
  demo/DemoApp.tsx       # Demo local (removida no lançamento)
  components/ui.tsx      # Componentes visuais compartilhados (pergunta, feedback, troféus, modal)
  styles.css             # Identidade visual responsiva
  components/
    Brand.tsx            # Marca provisória
    DrawBowl.tsx         # Globo de sorteio animado
  data/questions.ts      # Questões demonstrativas e categorias
  lib/game.ts            # Máquina de estados e regras locais (funções puras)
  lib/game.test.ts       # Testes das regras (Vitest)
  assets/stadium.svg     # Ilustração original simplificada
web/public/favicon.svg
web/scripts/export-demo-questions.ts  # Gera o seed da API a partir das perguntas demo
api/
  app/domain/match_engine.rb      # Regras do X1 em Ruby (puras, espelham game.ts)
  app/services/question_picker.rb # Pergunta inédita + exposição na mesma transação
  db/seeds/demo_questions.json    # Seed gerado (não editar à mão)
  spec/                           # RSpec
docs/
  PRODUCT.md             # Regras fechadas, detalhes e próximos passos
  CLAUDE_HANDOFF.md      # Guia para continuar no Claude CLI
  AUDITORIA_v0.2.md      # Auditoria da demo: correções e pendências
  ARQUITETURA.md         # Proposta do backend (Rails + PostgreSQL)
  DEPLOY.md              # Deploy gratuito: Vercel + Render + Neon + cron
```

## Limitações da demo

- `localStorage` não substitui histórico de servidor: exclusão de dados/uso de outro navegador zera a proteção local. O backend deve impor unicidade de exposição por usuário e sorteio seguro.
- O cronômetro é checado no navegador na demo. O backend deverá gerar/validar deadlines e rejeitar respostas fora do tempo.
- O sorteio é feito localmente e poderá ser manipulado; o backend deverá gerar sorteios autoritativos.
- Não é possível impedir completamente screenshots ou cópia de perguntas em aplicações web.
- Os conteúdos e as imagens devem ser licenciados/verificados antes de publicar.

Leia [`docs/CLAUDE_HANDOFF.md`](docs/CLAUDE_HANDOFF.md) para a próxima etapa no Claude CLI.
