/** Conteúdo DEMONSTRATIVO. Antes de produção, validar fatos, fontes e direitos de imagens. */
import stadiumIllustration from '../assets/stadium.svg';

export const CATEGORIES = [
  { id: 'brasileiro', label: 'Futebol Brasileiro', short: 'Brasileiro', icon: '🇧🇷', color: '#64de8b', description: 'Brasileirão, copas, estaduais e rivalidades' },
  { id: 'europeu', label: 'Futebol Europeu', short: 'Europeu', icon: '🇪🇺', color: '#83a7ff', description: 'Ligas, clubes e competições da UEFA' },
  { id: 'sulamericano', label: 'Futebol Sul-Americano', short: 'Sul-Americano', icon: '🌎', color: '#ffb36c', description: 'Libertadores, Sul-Americana e CONMEBOL' },
  { id: 'selecoes', label: 'Seleções', short: 'Seleções', icon: '🌍', color: '#db9dfb', description: 'Copas, torneios continentais e seleções' },
  { id: 'escudos', label: 'Escudos', short: 'Escudos', icon: '🛡️', color: '#ffc96d', description: 'Símbolos, histórias e identidades dos clubes' },
  { id: 'estadios', label: 'Estádios', short: 'Estádios', icon: '🏟️', color: '#7fe1dc', description: 'Arquibancadas, cidades e arenas lendárias' },
] as const;

export type CategoryId = typeof CATEGORIES[number]['id'];
export type Question = {
  id: string;
  categoryIds: CategoryId[];
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  image?: string;
};

type Seed = [CategoryId[], string, [string, string, string, string], number, string, string?];
const seeds: Seed[] = [
  [['brasileiro'], 'Quem conquistou o Brasileirão de 2008?', ['Grêmio', 'São Paulo', 'Cruzeiro', 'Flamengo'], 1, 'O São Paulo conquistou seu terceiro título brasileiro consecutivo.'],
  [['brasileiro'], 'Qual clube é conhecido como Galo?', ['Atlético Mineiro', 'Santos', 'Sport', 'Botafogo'], 0, 'Galo é o apelido tradicional do Atlético-MG.'],
  [['brasileiro'], 'O clássico Gre-Nal envolve quais clubes?', ['Grêmio e Internacional', 'Grêmio e Juventude', 'Inter e Caxias', 'Athletico e Coritiba'], 0, 'Gre-Nal é a rivalidade entre Grêmio e Internacional.'],
  [['brasileiro'], 'Quem conquistou a Copa do Brasil de 2023?', ['Flamengo', 'Corinthians', 'São Paulo', 'Grêmio'], 2, 'O São Paulo conquistou sua primeira Copa do Brasil em 2023.'],
  [['brasileiro'], 'Qual clube é conhecido como Leão da Ilha?', ['Vitória', 'Sport', 'Avaí', 'Fortaleza'], 1, 'O Sport Club do Recife é conhecido como Leão da Ilha.'],
  [['brasileiro'], 'Qual competição reúne clubes do Nordeste brasileiro?', ['Copa Verde', 'Copa do Nordeste', 'Recopa Sul-Americana', 'Série B'], 1, 'A Copa do Nordeste é uma competição regional de clubes.'],
  [['brasileiro'], 'Qual foi o campeão brasileiro de 2009?', ['São Paulo', 'Internacional', 'Flamengo', 'Palmeiras'], 2, 'O Flamengo venceu o Campeonato Brasileiro de 2009.'],
  [['brasileiro'], 'O clássico Atletiba é disputado entre quais clubes?', ['Atlético-MG e Cruzeiro', 'Athletico-PR e Coritiba', 'Atlético-GO e Goiás', 'Avaí e Figueirense'], 1, 'Atletiba é o clássico de Athletico Paranaense e Coritiba.'],
  [['brasileiro'], 'Qual clube conquistou a Copa do Brasil de 2022?', ['Flamengo', 'Corinthians', 'Palmeiras', 'São Paulo'], 0, 'O Flamengo foi campeão da Copa do Brasil de 2022.'],

  [['europeu'], 'Quem venceu a Champions League de 2005?', ['Milan', 'Chelsea', 'Liverpool', 'Barcelona'], 2, 'O Liverpool venceu o Milan na final em Istambul.'],
  [['europeu'], 'Qual clube inglês é conhecido como The Gunners?', ['Arsenal', 'Chelsea', 'Tottenham', 'Everton'], 0, 'The Gunners é o apelido do Arsenal.'],
  [['europeu'], 'Quem venceu a Premier League na temporada 2015/16?', ['Manchester City', 'Chelsea', 'Leicester City', 'Liverpool'], 2, 'O Leicester surpreendeu ao conquistar o campeonato inglês.'],
  [['europeu'], 'Qual clube manda seus jogos no Camp Nou?', ['Real Madrid', 'Barcelona', 'Valencia', 'Atlético de Madrid'], 1, 'O Camp Nou é tradicionalmente a casa do Barcelona.'],
  [['europeu'], 'Qual foi o campeão da Champions League em 2022?', ['Liverpool', 'Chelsea', 'Real Madrid', 'Bayern'], 2, 'O Real Madrid venceu o Liverpool na final de 2022.'],
  [['europeu'], 'Em qual país é disputada a Bundesliga?', ['Espanha', 'Alemanha', 'Itália', 'França'], 1, 'Bundesliga é o principal campeonato de clubes da Alemanha.'],
  [['europeu'], 'A Copa del Rey é uma competição de qual país?', ['Portugal', 'Itália', 'Espanha', 'França'], 2, 'É a principal copa nacional da Espanha.'],
  [['europeu'], 'Quem venceu a Champions League de 2012?', ['Barcelona', 'Chelsea', 'Bayern', 'Juventus'], 1, 'O Chelsea venceu o Bayern nos pênaltis em Munique.'],
  [['europeu'], 'Qual clube italiano é apelidado de Vecchia Signora?', ['Roma', 'Napoli', 'Juventus', 'Lazio'], 2, 'Vecchia Signora é um apelido tradicional da Juventus.'],

  [['sulamericano'], 'Quem venceu a Libertadores de 2016?', ['River Plate', 'Atlético Nacional', 'Boca Juniors', 'San Lorenzo'], 1, 'O Atlético Nacional, da Colômbia, venceu a edição de 2016.'],
  [['sulamericano'], 'Qual clube conquistou a Copa Mercosul de 2000?', ['Palmeiras', 'Vasco da Gama', 'Flamengo', 'Cruzeiro'], 1, 'O Vasco venceu o Palmeiras na decisão de 2000.'],
  [['sulamericano'], 'Qual clube argentino é conhecido como Xeneize?', ['River Plate', 'Racing', 'Boca Juniors', 'Independiente'], 2, 'Xeneize é um dos apelidos do Boca Juniors.'],
  [['sulamericano'], 'Qual equipe venceu a Libertadores de 2019?', ['Flamengo', 'River Plate', 'Grêmio', 'Boca Juniors'], 0, 'O Flamengo venceu o River Plate por 2 a 1.'],
  [['sulamericano'], 'Em qual país joga o Peñarol?', ['Argentina', 'Uruguai', 'Chile', 'Paraguai'], 1, 'O Peñarol é um clube de Montevidéu, no Uruguai.'],
  [['sulamericano'], 'Qual clube venceu a Libertadores de 2018?', ['Boca Juniors', 'Palmeiras', 'River Plate', 'Grêmio'], 2, 'O River Plate venceu o Boca Juniors na final.'],
  [['sulamericano'], 'A Recopa Sul-Americana reúne tradicionalmente campeões de quais torneios?', ['Libertadores e Sul-Americana', 'Brasileirão e Libertadores', 'Copa América e Libertadores', 'Sul-Americana e Champions'], 0, 'A Recopa coloca frente a frente os campeões dos dois torneios continentais.'],
  [['sulamericano'], 'Qual clube do Equador venceu a Libertadores de 2008?', ['Barcelona SC', 'Emelec', 'LDU Quito', 'Independiente del Valle'], 2, 'A LDU Quito foi campeã em 2008.'],
  [['sulamericano'], 'Qual foi o país do campeão da Libertadores de 2016?', ['Colômbia', 'Brasil', 'Argentina', 'Uruguai'], 0, 'O Atlético Nacional é colombiano.'],

  [['selecoes'], 'Quem conquistou a Copa do Mundo de 2010?', ['Holanda', 'Espanha', 'Alemanha', 'Brasil'], 1, 'A Espanha conquistou seu primeiro título mundial na África do Sul.'],
  [['selecoes'], 'Quem venceu a Eurocopa de 2016?', ['França', 'Alemanha', 'Portugal', 'Itália'], 2, 'Portugal derrotou a França na decisão.'],
  [['selecoes'], 'Qual seleção venceu a Copa do Mundo de 2006?', ['França', 'Brasil', 'Alemanha', 'Itália'], 3, 'A Itália venceu a França nos pênaltis.'],
  [['selecoes', 'sulamericano'], 'Quem venceu a Copa América de 2015?', ['Argentina', 'Brasil', 'Chile', 'Uruguai'], 2, 'O Chile conquistou seu primeiro título da Copa América.'],
  [['selecoes'], 'Quem venceu a Copa do Mundo de 2014?', ['Argentina', 'Alemanha', 'Brasil', 'Holanda'], 1, 'A Alemanha venceu a Argentina por 1 a 0 na final.'],
  [['selecoes'], 'Em qual país aconteceu a Copa do Mundo de 2010?', ['África do Sul', 'Alemanha', 'Brasil', 'Rússia'], 0, 'Foi a primeira Copa do Mundo disputada no continente africano.'],
  [['selecoes'], 'Quem venceu a Copa do Mundo de 2022?', ['França', 'Croácia', 'Argentina', 'Marrocos'], 2, 'A Argentina conquistou seu terceiro título mundial.'],
  [['selecoes', 'sulamericano'], 'Qual seleção venceu a Copa América de 2011?', ['Argentina', 'Uruguai', 'Paraguai', 'Chile'], 1, 'O Uruguai conquistou a Copa América de 2011.'],
  [['selecoes'], 'A Copa Africana de Nações é disputada por equipes de qual confederação?', ['AFC', 'CONCACAF', 'CAF', 'UEFA'], 2, 'CAF é a confederação africana de futebol.'],

  [['escudos', 'brasileiro'], 'Qual clube brasileiro tem uma estrela vermelha no escudo e é conhecido como Estrela Solitária?', ['Botafogo', 'Vasco', 'Fluminense', 'Santos'], 0, 'O Botafogo utiliza uma estrela solitária branca sobre fundo preto; o enunciado deveria dizer estrela branca.', undefined],
  [['escudos'], 'Qual sigla aparece no escudo do FC Barcelona?', ['FCB', 'RMA', 'ACM', 'PSG'], 0, 'O escudo do Barcelona traz as letras FCB.'],
  [['escudos'], 'Qual clube é associado ao símbolo de um galo em sua identidade?', ['Tottenham', 'Chelsea', 'Arsenal', 'Fulham'], 0, 'O Tottenham usa um galo como elemento principal do emblema.'],
  [['escudos'], 'Qual clube tem uma águia em destaque no escudo?', ['Benfica', 'Porto', 'Sporting', 'Braga'], 0, 'O escudo do Benfica tem uma águia sobre o símbolo.'],
  [['escudos'], 'Qual clube tem um diabo vermelho no escudo?', ['Manchester United', 'Liverpool', 'West Ham', 'Newcastle'], 0, 'O escudo do Manchester United traz um diabo vermelho.'],
  [['escudos'], 'Qual animal aparece no escudo do Leicester City?', ['Leão', 'Raposa', 'Lobo', 'Águia'], 1, 'A raposa é o símbolo do Leicester City.'],
  [['escudos'], 'As letras CRF aparecem no monograma de qual clube?', ['Fluminense', 'Corinthians', 'Flamengo', 'Fortaleza'], 2, 'CRF corresponde a Clube de Regatas do Flamengo.'],
  [['escudos'], 'Qual clube alemão usa as iniciais BVB no escudo?', ['Bayern', 'Borussia Dortmund', 'Bayer Leverkusen', 'Werder Bremen'], 1, 'BVB é a sigla usada no escudo do Borussia Dortmund.'],
  [['escudos'], 'Qual seleção tem uma cruz branca em seu escudo nacional?', ['Suíça', 'Portugal', 'Japão', 'México'], 0, 'A cruz branca é um símbolo nacional suíço.'],

  [['estadios', 'selecoes'], 'Qual estádio recebeu a partida decisiva da Copa do Mundo de 1950?', ['Maracanã', 'Mineirão', 'Morumbi', 'Pacaembu'], 0, 'O Maracanã recebeu Brasil x Uruguai no Mundial de 1950.', stadiumIllustration],
  [['estadios', 'europeu'], 'Qual clube é tradicionalmente associado ao estádio Anfield?', ['Everton', 'Liverpool', 'Manchester United', 'Leeds'], 1, 'Anfield é a casa do Liverpool.'],
  [['estadios'], 'Em qual cidade fica o estádio La Bombonera?', ['Córdoba', 'Montevidéu', 'Buenos Aires', 'Rosário'], 2, 'A Bombonera é o estádio do Boca Juniors em Buenos Aires.'],
  [['estadios'], 'Qual estádio é a casa do Real Madrid?', ['San Siro', 'Santiago Bernabéu', 'Camp Nou', 'Metropolitano'], 1, 'O Real Madrid manda seus jogos no Santiago Bernabéu.'],
  [['estadios'], 'O estádio Wembley fica em qual cidade?', ['Manchester', 'Londres', 'Liverpool', 'Birmingham'], 1, 'Wembley está localizado em Londres.'],
  [['estadios'], 'Qual clube manda suas partidas no Allianz Parque?', ['São Paulo', 'Corinthians', 'Palmeiras', 'Santos'], 2, 'O Allianz Parque é o estádio do Palmeiras.'],
  [['estadios'], 'O estádio Signal Iduna Park é a casa de qual clube?', ['Bayern', 'Borussia Dortmund', 'Schalke', 'RB Leipzig'], 1, 'O Borussia Dortmund joga no Signal Iduna Park.'],
  [['estadios'], 'O estádio Azteca fica em qual cidade?', ['Monterrey', 'Guadalajara', 'Cidade do México', 'Cancún'], 2, 'O Estádio Azteca está localizado na Cidade do México.'],
  [['estadios'], 'O estádio San Siro é associado a quais clubes?', ['Milan e Inter', 'Roma e Lazio', 'Juventus e Torino', 'Real Madrid e Atlético'], 0, 'Milan e Inter historicamente compartilham o estádio de San Siro.'],
];

// Corrige um enunciado demonstrativo antes da exposição: a Estrela Solitária é branca.
seeds[36][1] = 'Qual clube brasileiro usa uma estrela solitária branca no escudo?';
seeds[36][4] = 'O Botafogo tem uma estrela solitária branca no escudo.';

export const QUESTIONS: Question[] = seeds.map(([categoryIds, prompt, options, correctIndex, explanation, image], index) => ({
  id: `demo-${String(index + 1).padStart(3, '0')}`,
  categoryIds,
  prompt,
  options,
  correctIndex,
  explanation,
  ...(image ? { image } : {}),
}));

export function getCategory(id: CategoryId) {
  return CATEGORIES.find(category => category.id === id)!;
}
