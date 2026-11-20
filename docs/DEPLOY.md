# Deploy gratuito (Vercel + Render + Neon)

Passo a passo para colocar o Boletrados no ar **sem custo**, com os limites dos planos grátis conferidos em novembro de 2026. Planos grátis mudam: confira as páginas oficiais antes.

```text
navegador ──► Vercel (frontend estático)
                 └─ /api/*  ──rewrite──►  Render (API Rails, plano free)  ──►  Neon (Postgres free)
GitHub Actions (de hora em hora) ──► POST /internal/tick     cron-job.org (a cada 10 min) ──► GET /up
```

## Por que esse desenho

| Decisão | Motivo |
|---|---|
| Frontend na **Vercel** | Grátis, e o proxy `/api` sai só com configuração (`web/vercel.json`). O plano Hobby é para uso **não comercial**: se o Boletrados passar a ganhar dinheiro, migre para o Pro ou para o Cloudflare Pages. |
| **Proxy `/api`** em vez de chamar o Render direto | Sem domínio próprio, `*.vercel.app` e `*.onrender.com` são sites diferentes, e o navegador (principalmente o Safari) bloquearia o cookie de sessão. Com o proxy, o cookie é do próprio site. |
| API no **Render free** | 750 h/mês por workspace: um serviço fica ligado o mês todo. O serviço dorme após cerca de 15 min sem tráfego (acordar leva de 30 a 60 s), e o ping no `/up` evita isso. |
| Banco no **Neon free** | O Postgres grátis do Render **expira em 30 dias**. O Neon dá 1 GB e 100 CU-h/mês por projeto, e o banco suspende após 5 min parado. |
| **Sem worker de jobs** | Um worker consultando o banco o tempo todo impediria o Neon de suspender e estouraria as 100 CU-h. Os jobs rodam no próprio processo, e o **tick** de hora em hora cobre o que se perder se a instância dormir ou reiniciar (prazos de partidas paradas, W.O. e lembretes). O `/up` não consulta o banco, então o ping não gasta horas do Neon. |
| **E-mail desligado** | Sem domínio, o e-mail cairia no spam. O lembrete continua chegando por push. Para ligar: domínio próprio + `SMTP_*` (ver abaixo). |

## 1. Banco (Neon)

1. Crie uma conta em <https://neon.com> e um projeto `boletrados` na região **AWS US East (N. Virginia)**, perto do Render.
2. Em **Connect**, copie a connection string **direta**, ou seja, **sem** `-pooler` no host, com `?sslmode=require`. Ela é o `DATABASE_URL`.

## 2. API (Render)

1. Crie uma conta em <https://render.com> e conecte o GitHub.
2. **New → Blueprint**, escolha este repositório. O Render lê o `render.yaml` da raiz e cria o serviço `boletrados-api` (plano free, Virginia).
3. Preencha as variáveis pedidas:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | connection string direta do Neon |
| `ALLOWED_ORIGINS` e `FRONTEND_URL` | URL da Vercel, ex.: `https://boletrados.vercel.app` (preencha depois do passo 3 e faça **Manual Deploy**) |
| `GOOGLE_CLIENT_ID` | do passo 5 (pode ficar vazio no começo, mas sem ele não há login em produção) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | gere localmente com `docker compose run --rm api bin/rails push:vapid_keys`. **A privada é segredo.** |

`SECRET_KEY_BASE` e `TICK_TOKEN` são gerados pelo Render. A cada deploy, `bin/rails content:import` adiciona as perguntas novas da curadoria (`api/db/curated/perguntas.yml`) sem alterar as que já existem.

4. Depois do deploy, `https://boletrados-api.onrender.com/up` deve responder 200. Se o Render der outro nome ao serviço, use esse nome nos passos seguintes.

## 3. Frontend (Vercel)

1. Crie uma conta em <https://vercel.com> e importe este repositório.
2. **Root Directory: `web`**. O framework (Vite) e o build vêm do `web/vercel.json`.
3. Variáveis de ambiente (Production):
   - `VITE_API_BASE_URL` = `/api`
   - `VITE_GOOGLE_CLIENT_ID` = o mesmo Client ID do passo 5
4. Se a URL da API não for `https://boletrados-api.onrender.com`, edite o `destination` do rewrite em `web/vercel.json`.
5. Faça o deploy e volte ao Render para preencher `ALLOWED_ORIGINS` e `FRONTEND_URL` com a URL final da Vercel.

## 4. Agendamentos

- **Tick (obrigatório)**: no GitHub, em **Settings → Secrets and variables → Actions**:
  - variável `API_URL` = `https://boletrados-api.onrender.com`;
  - secret `TICK_TOKEN` = o valor gerado no Render (aba Environment).

  O workflow `.github/workflows/tick.yml` roda de hora em hora; teste em **Actions → Tick → Run workflow**. O GitHub pausa workflows agendados de repositórios sem atividade por 60 dias; se isso acontecer, reative ou use também o cron-job.org.
- **Manter a API acordada (recomendado)**: em <https://cron-job.org>, que é grátis, crie um job `GET https://boletrados-api.onrender.com/up` a cada **10 minutos**. Sem ele, o primeiro acesso depois de 15 min parado demora de 30 a 60 s.

## 5. Login com Google

1. Em <https://console.cloud.google.com>: crie um projeto, configure a **tela de consentimento OAuth** (tipo externo) e crie **Credenciais → ID do cliente OAuth → Aplicativo da Web**.
2. Em **Origens JavaScript autorizadas**, adicione a URL da Vercel (e `http://localhost:5173` para testes). Não é preciso URI de redirecionamento: o login usa popup.
3. Copie o **Client ID**, que é público, para `GOOGLE_CLIENT_ID` (Render) e `VITE_GOOGLE_CLIENT_ID` (Vercel). O *client secret* não é usado.

## 5b. Login com Facebook

1. Em <https://developers.facebook.com/apps>, **Criar app** → caso de uso **"Autenticar e solicitar dados de usuários com o Login do Facebook"** → tipo **Consumidor**. Nome: `Boletrados`.
2. Em **Configurações do app › Básico**: preencha e-mail de contato, ícone (1024×1024), categoria (Jogos), e os links:
   - Política de Privacidade: `https://boletrados.vercel.app/privacidade`
   - Termos de Serviço: `https://boletrados.vercel.app/termos`
   - Instruções de exclusão de dados: `https://boletrados.vercel.app/privacidade#exclusao`
   - **Domínios do app**: `boletrados.vercel.app`
   - Em **+ Adicionar plataforma › Site**, URL do site: `https://boletrados.vercel.app/`
3. Em **Login do Facebook › Configurações**: ligue **Login com o SDK do JavaScript** e adicione `boletrados.vercel.app` em **Domínios permitidos para o SDK do JavaScript**. Permissão usada: só `public_profile` (nome e foto). O e-mail não é pedido: exigiria avaliação da Meta e o jogo não precisa dele.
4. Copie o **ID do app** (público) e a **Chave secreta do app** (**segredo**):
   - Render: `FACEBOOK_APP_ID` e `FACEBOOK_APP_SECRET`;
   - Vercel: `VITE_FACEBOOK_APP_ID` (tipo Configuração) e **Redeploy**.
5. Mude o app de **Desenvolvimento** para **Ao vivo** (no topo do painel). Em desenvolvimento, só quem tem função no app consegue entrar.

O login nunca vincula contas por e-mail. Para usar Google e Facebook na mesma conta, o jogador conecta o segundo login em **Perfil › Contas conectadas** (uma conta vazia daquele login é absorvida; uma conta com histórico não é misturada).

## 6. Tornar-se administrador (moderação)

1. Entre no site com a sua conta Google pelo menos uma vez.
2. O plano grátis do Render não tem Shell, então rode o comando **na sua máquina**, apontando para o banco do Neon. Use a mesma connection string direta, sem salvá-la em arquivo:

```bash
docker compose run --rm -e RAILS_ENV=production -e SECRET_KEY_BASE_DUMMY=1 \
  -e DATABASE_URL='<connection string do Neon>' api bin/rails "admin:grant[seu-email@gmail.com]"
```

3. Recarregue o site: o link **Moderação** aparece no cabeçalho. Para listar ou remover admins, use `admin:list` e `admin:revoke[...]`.
4. As perguntas demo foram arquivadas automaticamente na primeira importação da curadoria. Se `SEED_DEMO_QUESTIONS` ainda existir no Render, pode removê-la.

## 7. Conferência

- [ ] `https://<vercel>/` abre a home e o botão do Google aparece.
- [ ] Login com Google funciona e `GET /api/me` responde 200.
- [ ] Criar desafio, abrir o link em outro navegador ou conta e aceitar.
- [ ] Ativar avisos e receber o push quando a vez mudar.
- [ ] **Actions → Tick** roda com sucesso.
- [ ] Enviar uma pergunta em **Perguntas** e aprová-la em **Moderação**.

## Quando gastar o mínimo

| Situação | Custo aproximado |
|---|---|
| E-mail que não cai no spam | Domínio `.com.br` (cerca de R$ 40/ano) + SMTP grátis (ex.: Brevo, Resend) configurado em `SMTP_ADDRESS`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` e `MAIL_FROM` |
| Uso comercial | Vercel Pro ou mover o frontend para o Cloudflare Pages (grátis para uso comercial, mas o proxy `/api` exige uma Pages Function) |
| Mais de cerca de 400 h/mês de banco ativo ou mais de 1 GB | Neon Launch (pago pelo uso) |
| API sem dormir e sem limite de 512 MB | Render Starter ou uma VPS (por volta de € 4/mês) com `docker compose` |

## Limitações conhecidas no plano grátis

- Jobs agendados (relógio de 15 s, lembretes) ficam em memória e se perdem se a instância reiniciar. O tick e o acerto de prazos a cada acesso garantem as regras, mas um aviso pode chegar com até 1 h de atraso.
- O disco do Render é efêmero, mas o app não grava arquivos.
- O IP do cliente vem do primeiro `X-Forwarded-For`, que pode ser forjado. Ele é usado só para limitar tentativas e para registro, nunca para autorização.
