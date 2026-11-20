# Boletrados ⚽🏆

**Quem sabe de futebol merece um troféu.**

Quiz de futebol mobile-first com partidas X1 assíncronas entre amigos, sorteio de categorias com bolinhas e seis troféus para conquistar. No ar em <https://boletrados.vercel.app>.

> **Estado atual:** no ar (Vercel + Render + Neon), com:
> - login com Google (e login de desenvolvimento só na máquina local);
> - convite por link ou código e partida entre dois aparelhos, com sorteio, perguntas e prazos aplicados pela API;
> - avisos de vez por Web Push, perfil e estatísticas, envio de perguntas e moderação;
> - Política de Privacidade (`/privacidade`) e Termos de Uso (`/termos`).
>
> O banco começa com 237 perguntas curadas (`api/db/curated/perguntas.yml`, incluindo 25 escudos com imagem), importadas a cada deploy. Produto em [`docs/PRODUCT.md`](docs/PRODUCT.md), arquitetura em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) e identidade visual em [`docs/ART_DIRECTION.md`](docs/ART_DIRECTION.md).

Monorepo:

| Pasta | O quê |
|---|---|
| `web/` | Frontend Vite + React + TypeScript |
| `api/` | Backend Rails 8.1 API + PostgreSQL |
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

Rotas do frontend: `/` (login e partidas), `/convite/:código-ou-token`, `/partidas/:id`, `/perfil`, `/jogadores/:id`, `/perguntas` (enviar perguntas), `/admin` (moderação), `/privacidade` e `/termos`.

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
npm test           # testes dos utilitários do front (Vitest)
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
| `GET /profiles/me` · `GET /profiles/:id` | Perfil e estatísticas (só o próprio e de quem você já enfrentou) |
| `GET/POST /submissions` · `GET/PATCH /submissions/:id` · `POST /question_images` | Envio de perguntas pelos usuários |
| `/admin/questions` (+ `approve`, `reject`, `request_changes`, `archive`, `restore`) | Moderação (admins: `bin/rails "admin:grant[EMAIL_OU_ID]"`) |
| `POST /internal/tick` | Prazos e lembretes de hora em hora (token `TICK_TOKEN`; ver `docs/DEPLOY.md`) |
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
- Motion (`framer-motion`) nas transições, no sorteio e no mascote
- Ilustrações próprias em SVG (mascote, logo, ícones, troféus) e sons sintetizados com Web Audio
- Ícones Lucide
- Vitest para os testes

## Mecânica definida

1. Modo inicial: **X1 entre amigos por turnos**. Na versão final, os jogadores poderão participar em horários diferentes.
2. Antes de **cada pergunta normal**, sorteia-se uma das **seis categorias** com uma animação de bolinhas. Categorias já conquistadas continuam no sorteio.
3. Categorias: **Futebol Brasileiro**, **Futebol Europeu**, **Futebol Sul-Americano**, **Seleções**, **Escudos** e **Estádios**.
4. Perguntas com enunciado e **quatro alternativas**; formatos texto e texto + imagem.
5. **15 segundos** para qualquer pergunta. Erro ou tempo esgotado zera a sequência e passa a vez.
6. **Três respostas normais consecutivas corretas** liberam a escolha de um troféu ainda não conquistado.
7. Acertar a pergunta decisiva concede o troféu, zera a sequência e **mantém a vez**. Errar passa a vez.
8. Cada jogador coleciona seus próprios seis troféus; **vence quem conquistar os seis primeiro**.
9. Uma pergunta pode estar em mais de uma categoria, mas **não pode ser repetida para o mesmo jogador**.
10. Categoria sem perguntas inéditas para o jogador é **re-sorteada automaticamente**.
11. **Sair com uma pergunta aberta conta como tempo esgotado** (a vez passa). A partida fica salva e pode ser continuada pela tela inicial.

## Conteúdo e moderação

- Usuários logados enviam perguntas (categorias, dificuldade inicial, enunciado, quatro alternativas, fonte, explicação e imagem opcional) em `/perguntas`.
- Administradores aprovam, devolvem para ajustes, rejeitam ou arquivam em `/admin`, com busca de possíveis duplicatas.
- Quem escreveu ou revisou uma pergunta nunca a recebe numa partida.
- A dificuldade é recalibrada pelo desempenho real (com 50 ou mais respostas válidas; tempo esgotado não conta).
- Futuro: revisores confiáveis com aprovação por três votos (ver `docs/PRODUCT.md`).

## Estrutura

```text
web/src/
  App.tsx                # Rotas
  online/                # Telas do site: cliente da API, sessão, partidas, convite, perfil, legal
  online/curation/       # Envio de perguntas e moderação
  game/                  # Identidade visual: mascote, logo, arte (ícones, troféus, bolinhas), sons, tokens
  game/categories.ts     # As seis categorias (mesmos slugs da API)
  components/ui.tsx      # Pílula, aviso, modal e cronômetro
  styles.css             # Base de estilos (o visual vem de game/*.css)
web/public/favicon.svg   # Rosto do mascote
api/
  app/domain/match_engine.rb      # Regras do X1 (funções puras, servidor é a fonte da verdade)
  app/services/question_picker.rb # Pergunta inédita + exposição na mesma transação
  db/curated/perguntas.yml        # Banco curado (importado por bin/rails content:import a cada deploy)
  db/curated/escudos/             # Imagens dos escudos, com o nome do clube apagado
  db/seeds/demo_questions.json    # Perguntas demonstrativas antigas (arquivadas em produção)
  spec/                           # RSpec
docs/
  PRODUCT.md             # Regras fechadas, detalhes e próximos passos
  ART_DIRECTION.md       # Identidade visual, mascote e checklist
  ARQUITETURA.md         # Backend (Rails + PostgreSQL)
  DEPLOY.md              # Deploy gratuito: Vercel + Render + Neon + cron
  CLAUDE_HANDOFF.md      # Guia para continuar no Claude CLI
  AUDITORIA_v0.2.md      # Auditoria histórica do protótipo
```

## Limitações conhecidas

- Não é possível impedir completamente screenshots ou cópia de perguntas em aplicações web.
- Os conteúdos e as imagens devem ser licenciados/verificados antes de publicar.
- No plano grátis, os avisos agendados podem atrasar até 1 h se a instância reiniciar (ver `docs/DEPLOY.md`).

Leia [`docs/CLAUDE_HANDOFF.md`](docs/CLAUDE_HANDOFF.md) para a próxima etapa no Claude CLI.
