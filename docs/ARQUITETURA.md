# Boletrados — arquitetura do backend (rascunho v0.1, 2026-11-19)

> Estado: **proposta para revisão**. Nada do backend foi implementado. Os itens marcados como **decidido** foram escolhidos pelo responsável pelo produto; o resto é proposta e pode mudar.

## Decisões

| Tema | Decisão |
|---|---|
| Stack | **Rails API + PostgreSQL** (decidido) |
| Login no MVP | **Só Google**; Facebook depois. Modelo `users` + `identities` desde o início (decidido) |
| Prazo por vez | **24 horas** (decidido) |
| Estouro do prazo | **Passa a vez** (conta como erro). **3 estouros seguidos** do mesmo jogador = **W.O.** (decidido) |
| Avisos de vez | **Web Push + e-mail** (decidido) |
| Repositório | **Monorepo**: `web/` (frontend atual) e `api/` (Rails) (decidido) |
| Hospedagem | **Decidir depois**; desenvolvimento local com Docker Compose (decidido) |
| Categoria esgotada | Re-sorteio automático entre as categorias com inéditas (decidido; ver PRODUCT.md) |
| Sair com pergunta aberta | Conta como timeout (decidido; ver PRODUCT.md) |
| Tolerância de rede no prazo de 15s | **1 segundo** no servidor; o cliente mostra 15s (decidido) |
| Modo demo local | **Removido** quando o X1 online for lançado (decidido) |
| Partidas simultâneas | **Até 3** partidas em andamento por jogador (decidido) |

## Princípio central

O **servidor é a fonte da verdade**. O cliente nunca decide sorteio, pergunta, correção, prazo ou troféu, e nunca recebe a alternativa correta antes de responder. O servidor terá uma implementação em Ruby das regras, com testes que espelham `game.test.ts`. O motor `web/src/lib/game.ts` serve à demo até o lançamento do online; depois, **o modo demo é removido** e as regras ficam só no servidor.

## Componentes

```text
web/  (Vite + React)  ── HTTPS + cookie de sessão ──►  api/ (Rails 8 API)
                                                         ├─ PostgreSQL 16
                                                         ├─ Solid Queue (jobs no Postgres, sem Redis)
                                                         │    ├─ prazo de 15s da pergunta
                                                         │    ├─ prazo de 24h da vez / W.O.
                                                         │    └─ envio de push e e-mail
                                                         ├─ Web Push (VAPID)
                                                         └─ Action Mailer (provedor SMTP a definir)
```

- **Rails 8 API-only** + **Solid Queue** para jobs agendados (os prazos dependem disso) sem adicionar Redis.
- **Docker Compose** local: `db` (postgres:16) + `api`. O frontend continua com `npm run dev`, apontando para `VITE_API_BASE_URL`.

## Autenticação (Google)

1. O frontend usa **Google Identity Services** e recebe um *ID token*.
2. `POST /auth/google { id_token }`: a API valida assinatura, `aud` (client ID), `iss` e expiração.
3. Busca `identities(provider='google', uid=sub)`; se não existir, cria `users` + `identities`. **Sem vínculo automático por e-mail** (vínculo de provedores será explícito, como pede o PRODUCT.md).
4. Cria uma sessão no servidor (`sessions`) e devolve um **cookie httpOnly, Secure, SameSite=Lax**. Nada de token em `localStorage`.
5. Proteção CSRF para requisições que alteram estado (token em cabeçalho). Frontend e API no mesmo site (ex.: `app.` e `api.` do mesmo domínio).

## Convites

- `POST /matches` cria uma partida `waiting_opponent` com:
  - **token longo** (32 bytes aleatórios; o banco guarda só o hash) para o link `/convite/<token>`;
  - **código curto** (ex.: `BOLA-7K2Q`, alfabeto sem caracteres ambíguos) para digitar;
  - expiração de 7 dias.
- O convite sobrevive ao login: o frontend guarda o código em `sessionStorage`, faz o login e depois chama `POST /invites/:code/accept`.
- Aceitar o próprio convite é proibido; convite aceito ou expirado não pode ser reutilizado.
- **Limite de 3 partidas em andamento** por jogador: criar ou aceitar convite além disso retorna erro. A aplicação confere o limite dentro da transação, com lock no usuário. Proposta (a confirmar): convites ainda não aceitos também contam para quem os criou.

## Modelo de dados (MVP)

```text
users              id, display_name, avatar_url, email (contato), created_at
identities         user_id, provider, uid                    UNIQUE(provider, uid)
sessions           user_id, token_digest, expires_at, user_agent
push_subscriptions user_id, endpoint, p256dh, auth            UNIQUE(endpoint)

categories         id (slug: brasileiro…estadios), label, color, position
questions          id, prompt, options[4], correct_index, explanation, image_url,
                   status (draft|published|retired), difficulty, source_url
question_categories question_id, category_id                 PK(question_id, category_id)
question_exposures user_id, question_id, source (play|authored|reviewed),
                   match_id, shown_at                         UNIQUE(user_id, question_id)

matches            id, status (waiting_opponent|active|finished|abandoned),
                   invite_token_digest, invite_code, invite_expires_at,
                   current_player_id, turn_number, turn_deadline_at,
                   phase (lobby|drawn|question|trophy_choice|feedback), streak,
                   drawn_category_id, winner_id, finished_reason (six_trophies|walkover|forfeit),
                   lock_version
match_players      match_id, user_id, seat (0|1), consecutive_timeouts
                                                              UNIQUE(match_id, user_id), UNIQUE(match_id, seat)
match_questions    match_id, user_id, question_id, context (normal|trophy), category_id,
                   shown_at, deadline_at, answered_at, selected_index, correct, timed_out
trophies           match_id, user_id, category_id, won_at     UNIQUE(match_id, user_id, category_id)
match_events       match_id, seq, type, payload jsonb, actor_id, created_at   UNIQUE(match_id, seq)
idempotency_keys   user_id, key, response jsonb, created_at   UNIQUE(user_id, key)
```

Pontos importantes:

- **Uma pergunta nunca se repete para o usuário**: garantido por `UNIQUE(user_id, question_id)` em `question_exposures`, gravado **na mesma transação** em que a pergunta é servida. Autoria e revisão também gravam exposição (fase de moderação).
- **`match_events`** é um log append-only (auditoria, histórico de confronto e depuração). O estado "atual" fica em colunas de `matches` para leitura rápida.
- Moderação (`submissions`, `reviews`, `moderation_actions`, `question_versions`) fica para depois do X1 funcionar.

## Fluxo de uma vez (API)

Toda ação que altera estado:
- exige ser o `current_player_id`;
- roda em transação com `SELECT … FOR UPDATE` na partida;
- valida a fase;
- grava um evento;
- aceita cabeçalho `Idempotency-Key`, para que retries de rede não dupliquem ações.

| Passo | Endpoint | Servidor faz |
|---|---|---|
| Ver partida | `GET /matches/:id` | Estado visível ao usuário (sem a alternativa correta da pergunta aberta) |
| Sortear | `POST /matches/:id/draw` | Sorteia entre as categorias com inéditas para o jogador; grava `drawn_category_id`. Repetir a chamada devolve o mesmo resultado |
| Abrir pergunta | `POST /matches/:id/question` (`{ context: "normal" }` ou `{ context: "trophy", category }`) | Escolhe uma pergunta inédita, grava a exposição e `match_questions`, define `deadline_at = agora + 15s` e agenda o job de timeout |
| Responder | `POST /matches/:id/answer { selected_index }` | Aceita se `agora <= deadline_at + 1s`; aplica as regras (sequência, troféu, posse, vitória); devolve a correção e a explicação |
| Escolher troféu | (incluído em "Abrir pergunta" com `context: trophy`) | Rejeita uma categoria já conquistada |
| Desistir | `POST /matches/:id/forfeit` | Encerra com vitória do adversário |

### Prazos

- **15s da pergunta**: um job agendado para `deadline_at + 1s` resolve como timeout se ainda não houver resposta. Assim, fechar a aba ou sair resulta em timeout mesmo sem nova requisição (decisão "sair = timeout").
- **24h da vez**: ao passar a vez, grava `turn_deadline_at = agora + 24h` e agenda o job. Se o prazo estourar:
  - o estouro conta como erro e passa a vez;
  - `consecutive_timeouts` do jogador sobe em 1 e volta a 0 quando ele joga uma vez;
  - **ao chegar a 3, a partida termina por W.O.** (`finished_reason = walkover`).
- Os jobs são idempotentes: conferem `turn_number`/`match_question` antes de agir, para não punir uma vez que já terminou.

### Avisos

- Ao virar a vez: Web Push imediato ("Sua vez contra Fulano!") para as inscrições do usuário.
- Se a vez não começou faltando 4h para o prazo: e-mail de lembrete e push.
- Push inválido (HTTP 404/410) remove a inscrição. Preferências de aviso por usuário entram depois.

## Monorepo

```text
web/                 # frontend atual (movido da raiz), modo demo + modo online
api/                 # Rails 8 API
docker-compose.yml   # postgres + api para desenvolvimento
docs/
README.md            # como rodar tudo
```

## Pontos ainda abertos

1. **LGPD**: política de privacidade, exclusão de conta e retenção de `match_events`/exposições antes de abrir ao público.
2. **Provedor de e-mail** (Resend, Postmark, SES…) e **domínio**: dependem da hospedagem.
3. **Convites pendentes** contam no limite de 3? (proposta acima)
4. **Peso de dificuldade** no sorteio de perguntas: continua indefinido (PRODUCT.md); no MVP, aleatório uniforme entre as inéditas.

## Ordem de implementação sugerida

1. Monorepo: mover o frontend para `web/` e criar o esqueleto `api/` + Docker Compose + CI (typecheck, testes JS e RSpec).
2. Schema + seeds com as 54 perguntas demo; port das regras para Ruby com specs espelhando `game.test.ts`.
3. Login Google + sessões.
4. Partidas, convites e o fluxo de vez (draw → question → answer) com idempotência e locks.
5. Jobs de prazo (15s / 24h / W.O.).
6. Frontend online: telas de partidas (em andamento, aguardando, encerradas) consumindo a API.
7. Web Push + e-mail.
