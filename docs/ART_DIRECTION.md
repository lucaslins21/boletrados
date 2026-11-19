# Boletrados — direção de arte e design system

> Referência visual do jogo. As decisões de produto estão em `docs/PRODUCT.md` (§9). Este documento consolida a direção de arte aprovada, o inventário de assets e as regras para manter a identidade consistente.

## 1. Direção aprovada

- **Estilo**: cartoon e jogo casual premium, moderno e vibrante, com tema de futebol. Estética **2.5D**: formas arredondadas, sombras sólidas embaixo ("profundidade de botão"), luz suave e cores fortes. É divertido sem ser infantil.
- **Não é**: dashboard ou SaaS, realismo fotográfico, neon nem efeitos exagerados.
- **Ambientação "Dia de jogo"**:
  - **estádio** (céu, arquibancada com torcida, refletores e gramado) na home, no sorteio, na conquista e na vitória;
  - **fundo limpo durante as perguntas**: o estádio fica desfocado e esmaecido, para o enunciado e o cronômetro serem o foco absoluto nos 15 s.
- **Inspiração**: a *qualidade* dos jogos casuais mobile, sem copiar arte, personagens, roleta ou layout de nenhum jogo existente. Sem logotipos ou símbolos de FIFA, UEFA, CONMEBOL, clubes ou competições.

## 2. Tokens

Fonte única: `web/src/game/tokens.css` (variáveis CSS `--bt-*`) e `web/src/game/theme.ts` (cores das categorias em TypeScript, para os SVGs).

| Papel | Token | Valor |
|---|---|---|
| Verde principal (ação, acerto) | `--bt-green` / `--bt-green-dark` | `#22B357` / `#168A41` |
| Azul (ação secundária, links) | `--bt-blue` / `--bt-blue-dark` | `#2F6FED` / `#1F52BD` |
| Dourado (troféus, destaque) | `--bt-gold` / `--bt-gold-dark` | `#FFC531` / `#D99100` |
| Vermelho (erro) | `--bt-red` / `--bt-red-dark` | `#F0484E` / `#C42B30` |
| Tinta (texto principal) | `--bt-ink` | `#13213D` |
| Texto secundário / apagado | `--bt-ink-2` / `--bt-muted` | `#40506F` / `#7A88A3` |
| Cartão / borda-sombra / linha | `--bt-card` / `--bt-edge` / `--bt-line` | `#FFFFFF` / `#CBD8EA` / `#E3EAF4` |
| Superfície suave (campos, poços) | `--bt-soft` | `#F3F7FC` |
| Céu (cenário) | `--bt-sky` / `--bt-sky-deep` | `#7CC8FA` / `#1F5FAF` |

**Categorias** (validadas para daltonismo com o script da skill de dataviz; sempre com ícone e nome, nunca só a cor):

| Categoria | Cor | Escura |
|---|---|---|
| Brasileiro | `#22B357` | `#178A41` |
| Europeu | `#2F6FED` | `#1F52BD` |
| Sul-Americano | `#FF8A1F` | `#D96A06` |
| Seleções | `#8B5CF6` | `#6B3BD8` |
| Escudos | `#EF4444` | `#C42B2B` |
| Estádios | `#0EA5A4` | `#0A7F7E` |

- **Tipografia**:
  - **Outfit 800/900** em títulos, botões, números e placar: arredondada, forte e expressiva;
  - **DM Sans 500–800** em textos, perguntas e alternativas: muito legível em telas pequenas.

  Fonte decorativa nunca vai em texto longo.
- **Raios**: 12 px (pequeno), 16 px (botão e campo), 24 px (cartão), 50% (avatar, bolinha).
- **Sombras**: profundidade sólida embaixo, `0 5–7px 0 <tom escuro>` (botões e cartões). No clique, o elemento desce 3–4 px e a sombra diminui.
- **Espaçamento**: base de 4 px (8, 12, 16, 20, 24…).

### Tipografia e espaçamento

Outfit para títulos, números e botões; DM Sans para textos. Tokens em `tokens.css`:

| Token | Tamanho | Uso |
|---|---|---|
| `--bt-text-xs` | 12px | Rótulos em maiúsculas, pílulas, metadados. **Mínimo absoluto** |
| `--bt-text-sm` | 14px | Texto secundário, dicas, links de apoio, avisos |
| `--bt-text-md` | 16px | Corpo, campos, alternativas |
| `--bt-h3` / `--bt-h2` / `--bt-h1` | 20 / 24 / 30–42px | Títulos de painel, modal e tela |

Ritmo vertical: dentro de `.main-card`, `.aside-panel`, `.modal-card` e `.login-card`, cada filho direto recebe `--bt-space-4` (16px) acima. Rótulo → título fica com 10px, título → subtítulo com 8px e listas/blocos com 24px. Margens herdadas são zeradas: o espaço vem do contêiner, não do elemento.
Caixa alta só nas ações principais da partida (SORTEAR, RESPONDER, CONTINUAR). A navegação usa caixa normal.
No desktop (≥ 1024px), a coluna da partida tem 680px, o enunciado 26px e as alternativas 18px.

## 3. Componentes do jogo (React)

| Componente | Arquivo | Uso |
|---|---|---|
| `GameFrame`, `Scoreboard`, `BottomBar`, `SoundToggle` | `game/MatchScreens.tsx` | Moldura, placar e controles da partida |
| `DrawStage` | `game/MatchScreens.tsx` | Globo + bolinha que sai, abre e revela |
| `QuestionStage`, `ResultSheet` | `game/MatchScreens.tsx` | Pergunta (cronômetro em anel, resultado nas alternativas) |
| `TrophyPick`, `TrophyCelebration`, `MatchEnd` | `game/MatchScreens.tsx` | Escolha, conquista e fim de jogo |
| `CategoryBadge`, `CategoryGlyph`, `Trophy`, `DrawBall`, `SoccerBall`, `StadiumScene`, `Rays` | `game/art.tsx` | Ilustrações SVG |
| `Mascot` | `game/Mascot.tsx` | Mascote (5 estados) |
| `Logo`, `LogoMark`, `Wordmark` | `game/Logo.tsx` | Marca (v3, rosto do mascote). `arc` curva o nome na versão de destaque da entrada |
| `Loading`, `HeroArt` | `game/Decor.tsx` | Carregamento e ilustração da entrada |
| botões `.gd-btn` (`--gold`, `--blue`, `--white`, `--sm`, `--wide`) | `game/game.css` | Ações do jogo |

### Estilo cartoon (regra comum das ilustrações)

Contorno de tinta `#13213D` (a mesma do mascote), cor chapada, profundidade sólida embaixo (cópia deslocada na cor escura) e um brilho branco no alto. Símbolos sobre cor são brancos com contorno de tinta (`paint-order: stroke`). O cinza dos estados bloqueados usa contorno `#8D9BB4`, mais claro, para não competir com o que já foi conquistado.

## 4. Inventário de assets

| Asset | Situação | Observação |
|---|---|---|
| Logo e favicon | ✅ SVG (v3) | Emblema: o rosto do mascote (bola com olhos grandes e sorrisão, luva acenando, estrela dourada). Nome com contorno, profundidade e brilho (BOLE branco, TRADOS dourado). O favicon é o rosto simplificado. Falta a verificação de marca |
| Ícones das 6 categorias | ✅ SVG, moldura de escudo | Símbolo branco com contorno de tinta. Escudos = silhueta de escudo de clube com estrela; Estádios = estádio de frente com refletores. Versões colorida e monocromática |
| 6 troféus | ✅ SVG, um formato por categoria | Emblema = o mesmo escudo da categoria. Estados bloqueado (cinza) e conquistado |
| Bolinhas de sorteio | ✅ SVG | Contorno de tinta, abrem em duas metades |
| Bola de futebol (carregando) | ✅ SVG (`SoccerBall`) | Quica e gira |
| Globo do sorteio | ✅ CSS + SVG | |
| Cenário de estádio | ✅ SVG + CSS | Durante as perguntas a arquibancada e o gramado se apagam (`GameFrame calm`), sem blur, para não pesar no celular |
| Mascote (5 estados) | ✅ SVG animado (`game/Mascot.tsx`) | Entrada, home vazia, resultado, espera, conquista, fim de jogo e mensagens. Ver §5; a versão ilustrada "premium" é opcional (briefing em §6) |
| Efeitos: raios, confete | ✅ SVG + CSS | |
| Sons | ✅ Web Audio | Sintetizados, sem arquivos |

## 5. Mascote

- **Quem é**: uma bola de futebol clássica (gomos brancos e pretos) com olhos grandes, boca expressiva, braços com luvas brancas e pernas com chuteiras. Corpo compacto; a própria bola é o corpo. Sem coroa, capa, boné ou fone fixos.
- **Construção**: um único desenho SVG em que só mudam os olhos, a boca, os braços e o movimento. Assim as proporções são idênticas em todos os estados.

| Estado | Quando | Expressão e pose |
|---|---|---|
| `happy` | Boas-vindas, home | Sorriso aberto, aceno |
| `thinking` | Espera da vez do adversário, carregando | Olhar para o lado, mão no "queixo" |
| `correct` | Acerto | Olhos fechados de alegria, braços para cima, pulinho |
| `wrong` | Erro ou tempo esgotado | Sobrancelhas tristes, boca torta, mãos na cabeça |
| `victory` | Troféu e vitória | Boca aberta comemorando, punho erguido |

- **Regras**:
  - **nunca aparece durante os 15 s da pergunta**: o foco é o enunciado;
  - na faixa de resultado ele aparece pequeno, ao lado do título;
  - não compete com textos;
  - respeita o movimento reduzido;
  - não carrega texto dentro do desenho.

## 6. Briefing para uma versão ilustrada (opcional, externa)

Se no futuro quiser uma versão renderizada do mascote (ilustrador ou IA de imagem), use o SVG como referência de proporção:

- **Formato**: PNG ou WebP com fundo transparente, 1024×1024, personagem centralizado ocupando cerca de 80% da altura; uma imagem por estado, sempre com o mesmo enquadramento.
- **Prompt base (inglês, para ferramentas de imagem)**:
  > Cute cartoon mascot of a classic black-and-white soccer ball character, big expressive glossy eyes, small friendly mouth, short arms with white cartoon gloves, short legs with green football boots, compact round body (the ball is the body), soft 2.5D shading with gentle rim light, bold clean outlines, vibrant casual mobile game style, friendly not childish, transparent background, no text, no logos, centered, full body.
- **Variações por estado**, acrescentar ao prompt base:
  - `happy`: "waving with one hand, open happy smile";
  - `thinking`: "looking up to the side, one glove touching the chin, curious expression";
  - `correct`: "jumping with both arms up, eyes closed with joy, big smile";
  - `wrong`: "both gloves on the head, worried eyebrows, wobbly mouth";
  - `victory`: "raising a fist, mouth wide open cheering, tiny sparkles around".
- **Para manter a consistência**:
  - gerar todos os estados na mesma sessão;
  - usar a mesma semente quando a ferramenta permitir;
  - usar a imagem `happy` como referência de personagem para as demais;
  - conferir proporções (olhos, luvas, chuteiras) contra o SVG.

## 7. Animação

- **Durações**:
  - toque e hover: 100–200 ms;
  - mudança de estado: 200–350 ms;
  - sorteio: cerca de 2,7 s, com "Pular animação";
  - conquista de troféu: cerca de 1,5 s;
  - vitória: mais longa, com confete e fanfarra.
- **Ferramentas**: Motion (`framer-motion`), já instalado. Rive ou Lottie só se uma animação interativa externa trouxer vantagem real.
- **Movimento reduzido**: `MotionConfig reducedMotion="user"`. O sorteio encurta, e raios e confete desligam.
- **Leveza**: evitar animações contínuas desnecessárias. O que fica em loop (bolinhas no globo, mascote respirando) é leve e para com o movimento reduzido.

## 8. Checklist de revisão visual

**Última revisão (2026-11-19):**
- Entrada, home vazia, home com partidas, sorteio e pergunta conferidos em 360×800, 390×844, 768×1024 e 1440×900, com movimento reduzido.
- Resultado: nenhuma rolagem lateral, nenhum texto cortado, nenhum botão abaixo de 36 px e nenhum erro no console.
- O roteiro completo da partida (sorteio → pergunta → acerto e erro → troféu → vitória e derrota) também passou.

- [ ] 360×800, 390×844, 768×1024 e 1440×900 sem rolagem lateral nem texto cortado.
- [ ] Botões e alternativas com pelo menos 44 px de altura.
- [ ] Contraste do texto: tinta sobre branco; branco só sobre o céu ou fundos escuros, com sombra.
- [ ] Foco visível no teclado.
- [ ] Pergunta legível em 15 s: fundo limpo, sem mascote, cronômetro em destaque.
- [ ] Nenhum asset decorativo impede o jogo se falhar.

### Revisão de composição (nov/2026)
A auditoria automática (`audit.mjs`) fotografa as 13 telas a 390 e 1440 px e verifica dois pontos: texto visível abaixo de 12px e blocos vizinhos com menos de 8px de espaço dentro de cartões. A revisão terminou com zero ocorrências nos dois. Os viewports de 360, 390, 768 e 1440 px não têm rolagem lateral, texto cortado nem alvos de toque abaixo de 36px.
