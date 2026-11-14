/* Phase — les niveaux. Chaque niveau est construit par coordonnées (x vers la droite, y vers le bas)
   puis converti en carte texte. Légende : # mur  = grille  ~ tamis  x fragile  ^ pics  f feu  w eau  i glace
   s ressort  * cristal  G arrivée  ! drapeau  - plateforme  [ ] tapis  > < A V vent  P→p Q→q téléporteurs
   e éclat  ? panneau  @ départ. */
(function (racine) {
'use strict';
const S = 0, L = 1, Z = 2, P = 3;

function N(w, h, f) {
  const g = [];
  for (let y = 0; y < h; y++) g.push(new Array(w).fill('.'));
  for (let x = 0; x < w; x++) g[0][x] = '#';
  for (let y = 0; y < h; y++) { g[y][0] = '#'; g[y][w - 1] = '#'; }
  const ok = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const api = {
    r(x0, y0, x1, y1, c = '#') { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (ok(x, y)) g[y][x] = c; },
    p(x, y, c) { if (ok(x, y)) g[y][x] = c; },
    t(x, y, s) { for (let i = 0; i < s.length; i++) if (ok(x + i, y)) g[y][x + i] = s[i]; },
    n(x, y, k, c) { for (let i = 0; i < k; i++) if (ok(x + i, y)) g[y][x + i] = c; },          // k cases vers la droite
    col(x, y0, y1, c) { for (let y = y0; y <= y1; y++) if (ok(x, y)) g[y][x] = c; },
    vide(x0, y0, x1, y1) { api.r(x0, y0, x1, y1, '.'); },
    bloc(c = '#') { api.r(1, 1, w - 2, h - 1, c); },                 // tout remplir, puis creuser le parcours
    c(x0, y0, x1, y1) { api.r(x0, y0, x1, y1, '.'); },
    w, h
  };
  f(api);
  return g.map(l => l.join(''));
}

const ZONES = [
/* ================= 1. Carrière : le solide ================= */
{ id: 1, nom: 'Carrière', theme: 'carriere', phases: [S], niveaux: [
  { id: '1-1', nom: 'Premiers pas', phases: [S], panneaux: [
      'Courir : Q D ou ← →. Sauter : Espace (garde-le appuyé pour sauter plus haut).',
      'Trou ou pics : tu repars du dernier drapeau, le chrono continue. R : recommencer le niveau.',
      'Contre un mur, en l\'air : Espace = saut mural. Rebondis d\'un mur à l\'autre pour monter.'],
    carte: N(100, 18, g => {
      g.r(0, 15, 99, 17);
      g.p(2, 14, '@'); g.p(4, 14, '?');
      g.r(12, 13, 14, 14);
      g.p(17, 14, '?'); g.vide(19, 15, 22, 17);
      g.r(26, 13, 27, 14); g.r(28, 11, 31, 14);
      g.p(35, 14, '?'); g.p(36, 14, '!');
      g.r(39, 1, 39, 11); g.r(43, 4, 43, 14); g.r(44, 4, 52, 4);
      g.n(45, 14, 14, '^');
      g.r(60, 13, 62, 14); g.n(63, 14, 4, '^'); g.r(67, 11, 69, 14); g.n(70, 14, 5, '^');
      g.r(75, 12, 77, 14); g.n(78, 14, 3, '^'); g.r(81, 13, 99, 14);
      g.p(96, 12, 'G'); g.p(40, 1, 'e');
    }) },
  { id: '1-2', nom: 'Fracas', phases: [S], panneaux: [
      'En l\'air, Bas (S ou ↓) : fracas. Tu tombes comme une pierre et tu brises les blocs fêlés.',
      'Saute juste après l\'atterrissage d\'un fracas : rebond, bien plus haut qu\'un saut.',
      'Ressort : saute dessus. Un fracas sur le ressort propulse beaucoup plus haut.'],
    carte: N(110, 24, g => {
      g.r(0, 21, 109, 23);
      g.r(0, 10, 37, 12); g.r(26, 10, 29, 12, 'x'); g.r(38, 1, 40, 12);
      g.p(2, 9, '@'); g.p(5, 9, '?');
      g.p(31, 20, '?'); g.r(44, 17, 52, 20);
      g.p(56, 20, '?'); g.p(54, 20, '!'); g.p(58, 20, 's');
      g.r(61, 11, 63, 20); g.col(60, 12, 17, '^');
      g.r(64, 11, 75, 12);
      g.n(76, 20, 21, '^');
      g.r(80, 9, 82, 9); g.r(86, 11, 88, 11); g.r(92, 10, 96, 12);
      g.r(97, 14, 108, 14); g.r(102, 14, 104, 14, 'x'); g.r(97, 15, 97, 20);
      g.p(107, 20, 'G'); g.p(14, 20, 'e');
    }) },
  { id: '1-3', nom: 'Carrière profonde', phases: [S], panneaux: ['Les pics du plafond aussi. Un petit saut (appui bref) passe dessous.'],
    carte: N(120, 30, g => {
      g.r(0, 28, 119, 29);
      g.r(0, 5, 19, 6); g.p(2, 4, '@');
      g.r(20, 7, 20, 27); g.r(26, 1, 26, 24);
      g.n(21, 11, 2, '^'); g.n(24, 15, 2, '^'); g.n(21, 19, 2, '^'); g.n(24, 23, 2, '^');
      g.r(27, 1, 59, 22); g.p(29, 27, '?'); g.p(30, 27, '!');
      g.n(33, 27, 2, '^'); g.n(44, 27, 2, '^'); g.n(43, 23, 4, '^'); g.n(52, 27, 2, '^'); g.n(51, 23, 4, '^');
      g.r(59, 23, 60, 26); g.r(64, 12, 64, 27); g.p(63, 19, '^');
      g.r(65, 12, 78, 13); g.p(70, 11, '!');
      g.n(79, 27, 25, '^'); g.r(88, 22, 89, 27); g.p(88, 21, 's'); g.p(89, 21, 's');
      g.r(94, 12, 119, 13); g.r(108, 12, 110, 13, 'x'); g.r(105, 14, 105, 27);
      g.p(117, 27, 'G'); g.p(101, 8, 'e');
    }) }
] },

/* ================= 2. Aqueduc : le liquide ================= */
{ id: 2, nom: 'Aqueduc', theme: 'aqueduc', phases: [S, L], niveaux: [
  { id: '2-1', nom: 'Goutte', phases: [S, L], panneaux: [
      'K : devenir liquide. Liquide, tu colles aux murs et aux plafonds : avance avec les flèches.',
      'J : redevenir solide. Changer d\'état coûte une charge (2 au plus) ; elles reviennent quand tu touches le sol.',
      'Espace en liquide : petite giclée (pour attraper un plafond). Collé à un mur : jet.',
      'Les grilles ne retiennent pas le liquide.'],
    carte: N(100, 22, g => {
      g.r(0, 19, 99, 21);
      g.p(2, 18, '@'); g.p(4, 18, '?'); g.p(8, 18, '?');
      g.r(12, 9, 14, 18); g.r(12, 8, 16, 8); g.p(13, 7, '?');
      g.r(15, 1, 40, 6); g.n(17, 18, 24, '^');
      g.r(41, 12, 48, 18);
      g.r(50, 10, 60, 10, '='); g.r(49, 11, 49, 18); g.r(61, 1, 61, 15); g.p(51, 9, '?'); g.p(52, 9, '!');
      g.r(70, 6, 72, 18); g.r(73, 6, 92, 6); g.n(78, 5, 2, '^'); g.n(84, 5, 2, '^');
      g.p(91, 5, 'G'); g.p(44, 8, 'e');
    }) },
  { id: '2-2', nom: 'Conversion', phases: [S, L], panneaux: [
      'Liquide lancé contre un mur : ta vitesse devient de la montée. Contre un plafond : de l\'avancée.',
      'Atterris en liquide en tenant une direction : la chute devient de la vitesse.'],
    carte: N(110, 30, g => {
      g.r(0, 27, 109, 29);
      g.p(2, 26, '@'); g.p(4, 26, '?');
      g.r(25, 6, 27, 26); g.r(28, 6, 44, 7);
      g.p(46, 26, '?');
      g.r(48, 1, 76, 22); g.n(60, 26, 2, '^'); g.n(68, 26, 3, '^'); g.p(56, 26, '!');
      g.r(81, 9, 82, 26); g.r(83, 9, 86, 9); g.r(83, 1, 109, 7);
      g.n(83, 26, 27, '^');
      g.p(108, 8, 'G'); g.p(30, 26, 'e');
    }) },
  { id: '2-3', nom: 'Égouts', phases: [S, L], panneaux: [
      'Solide, tu tiens sur les grilles. Liquide, tu passes au travers. Change au bon moment !',
      'En l\'air, change d\'état pour traverser une grille puis redeviens solide avant de tomber.'],
    carte: N(100, 26, g => {
      g.r(0, 24, 99, 25); g.n(9, 23, 80, '^');
      g.r(0, 11, 8, 23); g.p(2, 10, '@'); g.p(4, 10, '?');
      g.r(9, 11, 18, 11, '='); g.r(19, 11, 22, 11); g.col(21, 1, 10, '=');
      g.r(23, 11, 32, 11, '='); g.r(33, 11, 36, 11); g.col(35, 1, 10, '=');
      g.r(37, 11, 44, 11, '='); g.r(45, 1, 45, 15); g.r(37, 17, 62, 17); g.p(40, 16, '!');
      g.r(63, 5, 64, 22);
      g.r(65, 5, 80, 5, '='); g.col(70, 1, 4, '='); g.col(76, 1, 4, '='); g.p(66, 4, '?');
      g.r(81, 5, 99, 5); g.p(95, 4, 'G'); g.p(64, 1, 'e');
    }) }
] },

/* ================= 3. Chaufferie : le gaz ================= */
{ id: 3, nom: 'Chaufferie', theme: 'chaufferie', phases: [S, L, Z], niveaux: [
  { id: '3-1', nom: 'Vapeur', phases: [S, L, Z], panneaux: [
      'L : devenir gaz. Le gaz monte tout seul (Haut : plus vite, Bas : descendre) puis redevient solide.',
      'Le tamis ne laisse passer que le gaz. Le solide tient debout dessus.',
      'Redevenir gaz quand on l\'est déjà relance la vapeur (une charge).',
      'Les courants d\'air emportent surtout le gaz.'],
    carte: N(100, 32, g => {
      g.r(0, 29, 99, 31);
      g.p(2, 28, '@'); g.p(4, 28, '?');
      g.col(9, 1, 28, '~'); g.p(12, 28, '?');
      g.r(16, 1, 16, 26); g.r(22, 6, 22, 28);
      g.col(17, 9, 24, '^'); g.col(21, 9, 24, '^');
      g.r(18, 20, 20, 20, '-'); g.r(18, 13, 20, 13, '-');
      g.r(23, 6, 30, 6); g.p(24, 5, '?'); g.p(25, 5, '!');
      g.r(31, 6, 45, 6, '~'); g.r(38, 1, 38, 5); g.n(23, 28, 77, '^');
      g.p(46, 9, '?');
      g.r(46, 10, 55, 27, 'A');
      g.r(56, 7, 92, 7, '^'); g.r(56, 8, 92, 10, '>'); g.r(56, 11, 92, 11, '^');
      g.r(56, 1, 92, 6); g.r(56, 12, 92, 27);
      g.p(74, 9, '*');
      g.r(93, 10, 99, 10); g.p(97, 9, 'G'); g.p(34, 2, 'e');
    }) },
  { id: '3-2', nom: 'Explosions', phases: [S, L, Z], panneaux: [
      'Le feu tue le solide. Le liquide qui le touche s\'évapore en gaz. Le gaz qui le touche explose : propulsion !',
      'Liquide sur le feu : il devient gaz sans coûter de charge. Le gaz passe le tamis.'],
    carte: N(96, 30, g => {
      g.bloc();
      g.c(1, 20, 12, 26); g.p(2, 26, '@'); g.p(4, 26, '?'); g.p(10, 26, 'f');
      g.c(8, 11, 12, 19); g.c(8, 11, 30, 13); g.p(27, 13, 'f');
      g.c(31, 6, 49, 23); g.n(31, 23, 19, '^'); g.p(40, 15, 'f');
      g.c(50, 10, 70, 14); g.p(52, 14, '!'); g.p(54, 14, '?');
      g.r(62, 9, 69, 9, '~'); g.n(63, 14, 6, 'f');
      g.c(55, 3, 94, 8); g.n(76, 8, 3, '^'); g.n(84, 8, 3, '^');
      g.p(93, 8, 'G'); g.p(40, 7, 'e');
    }) },
  { id: '3-3', nom: 'Soufflerie', phases: [S, L, Z], panneaux: ['Un courant vers le bas plaque tout au sol. Contourne-le ou traverse vite.'],
    carte: N(70, 36, g => {
      g.r(0, 33, 69, 35);
      g.p(2, 32, '@'); g.p(4, 32, '?');
      g.r(7, 26, 60, 26, '^'); g.r(7, 27, 60, 29, '>'); g.r(7, 30, 60, 30, '^'); g.r(7, 31, 60, 32);
      g.p(30, 28, '*');
      g.r(61, 8, 64, 32, 'A'); g.r(65, 1, 68, 32);
      g.r(8, 10, 60, 25); g.r(5, 7, 60, 7, '^'); g.r(5, 4, 60, 6, '<'); g.r(5, 8, 60, 9);
      g.p(35, 5, '*'); g.p(20, 5, '*');
      g.r(1, 8, 4, 18, 'V'); g.r(1, 19, 4, 19, '-');
      g.r(5, 20, 7, 20); g.p(6, 19, 'G');
      g.r(1, 21, 6, 22); g.p(3, 20, '!'); g.p(62, 2, 'e');
    }) }
] },

/* ================= 4. Orage : le plasma ================= */
{ id: 4, nom: 'Orage', theme: 'orage', phases: [S, L, Z, P], niveaux: [
  { id: '4-1', nom: 'Éclair', phases: [S, L, Z, P], panneaux: [
      'M : éclair (plasma). Tu fonces dans la direction tenue (8 directions) et tu brises les blocs fêlés.',
      'Cristal : recharge tes charges en plein vol.',
      'Éclair en diagonale vers le sol puis saut : super saut, très rapide.'],
    carte: N(110, 24, g => {
      g.bloc();
      g.c(1, 14, 21, 20); g.p(2, 20, '@'); g.p(4, 20, '?');
      g.c(10, 21, 17, 23);
      g.r(22, 14, 23, 20, 'x');
      g.c(24, 14, 27, 20); g.p(25, 20, '?'); g.p(27, 20, '!');
      g.c(28, 4, 61, 20); g.n(28, 20, 34, '^'); g.p(35, 15, '*'); g.p(44, 13, '*'); g.p(53, 15, '*');
      g.c(62, 4, 70, 11); g.p(64, 11, '?');
      g.c(69, 12, 70, 15); g.c(69, 16, 108, 20); g.n(80, 20, 2, '^'); g.n(90, 20, 2, '^'); g.n(98, 20, 2, '^');
      g.p(107, 20, 'G'); g.p(66, 5, 'e');
    }) },
  { id: '4-2', nom: 'Super saut', phases: [S, L, Z, P], panneaux: ['Les éclairs gardent ta vitesse : enchaîne saut, éclair, cristal sans toucher le sol.'],
    carte: N(130, 26, g => {
      g.bloc();
      g.c(1, 16, 9, 21); g.p(2, 21, '@'); g.p(4, 21, '?');
      g.c(10, 16, 29, 22); g.n(10, 22, 20, '^'); g.p(20, 19, '*');
      g.c(30, 16, 34, 21); g.p(32, 21, '!');
      g.c(35, 6, 64, 22); g.n(35, 22, 30, '^'); g.p(42, 15, '*'); g.p(52, 11, '*'); g.p(60, 15, '*');
      g.n(45, 17, 3, '^'); g.r(55, 6, 57, 9);
      g.c(65, 16, 70, 21);
      g.r(71, 16, 71, 21, 'x');
      g.c(72, 16, 100, 21); g.n(76, 21, 3, '^'); g.n(84, 21, 3, '^'); g.n(92, 21, 3, '^');
      g.c(101, 14, 104, 21); g.p(102, 21, '!');
      g.c(105, 4, 121, 22); g.n(105, 22, 17, '^'); g.p(110, 16, '*'); g.p(117, 11, '*');
      g.c(122, 4, 128, 7); g.p(127, 7, 'G'); g.p(86, 17, 'e');
    }) },
  { id: '4-3', nom: 'Tempête', phases: [S, L, Z, P], panneaux: ['Tout ce que tu sais, en même temps.'],
    carte: N(120, 34, g => {
      g.bloc();
      g.c(1, 22, 7, 30); g.p(2, 30, '@'); g.p(4, 30, '?');
      g.r(8, 22, 9, 30, 'x');
      g.c(10, 8, 29, 30); g.n(10, 30, 20, '^'); g.r(13, 14, 26, 29, 'A');
      g.c(30, 6, 60, 9); g.p(32, 9, '!');
      g.r(35, 10, 60, 10, '='); g.c(35, 11, 60, 14); g.n(35, 14, 26, '^'); g.col(45, 6, 9, '=');
      g.c(61, 6, 62, 9); g.r(61, 10, 80, 20, 'w'); g.p(66, 14, '^'); g.p(72, 17, '^'); g.p(77, 12, '^'); g.p(70, 10, '^');
      g.c(79, 2, 80, 9);
      g.c(79, 2, 118, 5); g.n(88, 5, 3, '^'); g.n(98, 5, 3, '^'); g.p(104, 3, '*'); g.n(106, 5, 6, 'f');
      g.p(117, 5, 'G'); g.p(70, 19, 'e');
    }) }
] },

/* ================= 5. Abysses : l'eau ================= */
{ id: 5, nom: 'Abysses', theme: 'abysses', phases: [S, L, Z, P], niveaux: [
  { id: '5-1', nom: 'Plongée', phases: [S, L, Z, P], panneaux: [
      'Dans l\'eau : le solide coule et nage lentement, le liquide file dans toutes les directions.',
      'Gaz sous l\'eau : une bulle qui remonte comme une fusée.'],
    carte: N(100, 30, g => {
      g.bloc();
      g.c(1, 5, 11, 8); g.p(2, 8, '@'); g.p(4, 8, '?');
      g.r(10, 9, 89, 26, 'w'); g.c(10, 5, 11, 8);
      g.r(18, 9, 20, 21); g.r(30, 14, 32, 26); g.r(42, 9, 44, 21); g.p(25, 26, '^'); g.p(36, 9, '^');
      g.r(54, 13, 56, 26); g.r(66, 9, 68, 19); g.n(60, 17, 2, '^'); g.n(62, 24, 2, '^'); g.p(64, 26, '!'); g.p(47, 12, '?');
      g.r(73, 15, 75, 26); g.p(80, 20, '^'); g.p(84, 14, '^');
      g.c(86, 2, 89, 8); g.c(86, 2, 98, 3); g.p(97, 3, 'G'); g.p(36, 24, 'e');
    }) },
  { id: '5-2', nom: 'Geyser', phases: [S, L, Z, P], panneaux: ['Bulle de gaz au fond d\'un puits plein d\'eau : tu sors comme un geyser.'],
    carte: N(90, 40, g => {
      g.bloc();
      g.c(1, 3, 9, 5); g.p(2, 5, '@'); g.p(4, 5, '?');
      g.r(8, 6, 31, 36, 'w');
      g.r(9, 14, 26, 14); g.r(13, 22, 31, 22); g.r(8, 30, 26, 30); g.p(20, 18, '^'); g.p(15, 26, '^'); g.p(22, 34, '^');
      g.r(32, 33, 44, 36, 'w'); g.p(38, 36, '^');
      g.r(41, 8, 44, 32, 'w'); g.p(41, 20, '^'); g.p(44, 14, '^');
      g.c(41, 2, 44, 7); g.c(45, 2, 88, 5); g.p(42, 30, '!');
      g.n(55, 5, 3, '^'); g.n(66, 5, 3, '^'); g.n(76, 5, 3, '^'); g.p(70, 2, '*');
      g.p(87, 5, 'G'); g.p(20, 24, 'e');
    }) },
  { id: '5-3', nom: 'Fosse', phases: [S, L, Z, P], panneaux: ['Tout au fond, puis tout en haut.'],
    carte: N(70, 50, g => {
      g.bloc();
      g.c(1, 2, 10, 4); g.p(2, 4, '@'); g.p(4, 4, '?');
      g.c(11, 2, 16, 39); g.col(11, 12, 14, '^'); g.col(16, 20, 22, '^'); g.col(11, 28, 30, '^'); g.col(16, 34, 36, '^');
      g.c(11, 39, 55, 46); g.r(11, 40, 50, 46, 'w'); g.p(24, 43, '^'); g.p(32, 40, '^'); g.p(40, 45, '^'); g.p(46, 41, '^');
      g.p(53, 46, 's'); g.p(52, 39, '!');
      g.c(51, 8, 55, 46); g.col(51, 30, 32, '^'); g.col(55, 22, 24, '^'); g.col(51, 14, 16, '^');
      g.c(51, 6, 68, 8); g.p(66, 8, 'G'); g.p(36, 41, 'e');
    }) }
] },

/* ================= 6. Usine : tapis et téléporteurs ================= */
{ id: 6, nom: 'Usine', theme: 'usine', phases: [S, L, Z, P], niveaux: [
  { id: '6-1', nom: 'Tapis roulants', phases: [S, L, Z, P], panneaux: [
      'Les tapis roulants poussent. Saute depuis un tapis : tu gardes son élan.'],
    carte: N(120, 24, g => {
      g.bloc();
      g.c(1, 14, 30, 20); g.r(8, 21, 30, 21, ']'); g.p(2, 20, '@'); g.p(4, 20, '?');
      g.c(31, 14, 38, 23);
      g.c(39, 14, 50, 20); g.r(39, 21, 50, 21, '['); g.r(44, 14, 45, 20, 'x');
      g.c(51, 8, 70, 20); g.n(51, 20, 20, '^'); g.r(54, 14, 68, 14, ']');
      g.c(71, 13, 74, 20); g.p(72, 20, '!');
      g.c(75, 13, 100, 16); g.r(75, 17, 100, 17, '['); g.p(82, 16, '^'); g.p(90, 16, '^'); g.p(96, 16, '^');
      g.c(101, 8, 118, 20); g.n(101, 20, 18, '^'); g.r(104, 17, 106, 17, ']'); g.r(110, 14, 112, 14, ']'); g.r(115, 12, 118, 12);
      g.p(117, 11, 'G'); g.p(60, 9, 'e');
    }) },
  { id: '6-2', nom: 'Téléporteurs', phases: [S, L, Z, P], panneaux: ['Un téléporteur garde ta vitesse et ta direction. Entre vite, ressors vite.'],
    carte: N(100, 30, g => {
      g.bloc();
      g.c(1, 20, 13, 26); g.p(2, 26, '@'); g.p(4, 26, '?'); g.p(12, 26, 'P');
      g.c(14, 4, 40, 8); g.p(15, 7, 'p'); g.r(19, 9, 40, 9, 'i'); g.n(25, 8, 2, '^'); g.n(33, 8, 2, '^'); g.p(40, 7, 'Q');
      g.c(42, 12, 98, 26); g.n(42, 26, 40, '^'); g.p(43, 14, 'q'); g.r(65, 12, 66, 18);
      g.p(58, 18, '*'); g.p(73, 16, '*'); g.r(52, 22, 54, 22);
      g.p(97, 26, 'G'); g.p(30, 4, 'e');
    }) },
  { id: '6-3', nom: 'Chaîne de montage', phases: [S, L, Z, P], panneaux: [
      'Téléporteur + chute : tu ressors avec toute ta vitesse. Atterris en liquide pour la transformer en élan.'],
    carte: N(110, 32, g => {
      g.bloc();
      g.c(1, 3, 9, 5); g.p(2, 5, '@'); g.p(4, 5, '?');
      g.c(10, 3, 12, 28); g.p(11, 28, 'P'); g.p(10, 14, '^'); g.p(12, 20, '^');
      g.c(14, 22, 60, 25); g.p(15, 22, 'p'); g.r(14, 26, 60, 26, ']'); g.p(30, 22, '^'); g.p(45, 22, '^'); g.p(20, 25, '!');
      g.c(57, 6, 60, 21); g.c(57, 6, 75, 8); g.p(74, 7, 'Q');
      g.c(78, 2, 108, 20); g.n(78, 20, 31, '^'); g.p(80, 4, 'q');
      g.r(92, 2, 93, 14, 'x'); g.p(88, 9, '*'); g.p(98, 7, '*'); g.r(103, 9, 108, 9);
      g.p(106, 8, 'G'); g.p(86, 3, 'e');
    }) }
] },

/* ================= 7. Glacier : la glace ================= */
{ id: 7, nom: 'Glacier', theme: 'glacier', phases: [S, L, Z, P], niveaux: [
  { id: '7-1', nom: 'Banquise', phases: [S, L, Z, P], panneaux: [
      'La glace glisse. Le liquide n\'y colle pas, mais on peut encore y faire un saut mural.'],
    carte: N(110, 26, g => {
      g.bloc('i');
      g.c(1, 18, 13, 22); g.p(2, 22, '@'); g.p(4, 22, '?');
      g.c(14, 18, 19, 25);
      g.c(20, 18, 23, 22);
      g.c(24, 3, 27, 22); g.p(24, 11, '^'); g.p(27, 16, '^');
      g.c(28, 3, 50, 6); g.p(30, 6, '!'); g.n(36, 6, 2, '^'); g.n(44, 6, 2, '^');
      g.c(51, 3, 70, 20); g.n(51, 20, 20, '^'); g.r(56, 12, 58, 12, 'i'); g.r(63, 9, 65, 9, 'i');
      g.c(71, 3, 80, 14); g.p(76, 6, '*');
      g.c(81, 11, 108, 14); g.n(90, 11, 3, '^'); g.n(95, 14, 2, '^'); g.n(101, 11, 2, '^');
      g.p(107, 14, 'G'); g.p(75, 4, 'e');
    }) },
  { id: '7-2', nom: 'Crevasses', phases: [S, L, Z, P], panneaux: ['Sur la glace, le liquide glisse sans fin : une rampe naturelle.'],
    carte: N(120, 30, g => {
      g.bloc('i');
      g.c(1, 2, 40, 5); g.p(2, 5, '@'); g.p(4, 5, '?'); g.p(12, 5, '^'); g.p(24, 5, '^'); g.p(34, 5, '^');
      g.c(41, 2, 44, 25); g.c(41, 22, 62, 25); g.n(46, 25, 2, '^'); g.n(54, 25, 2, '^'); g.p(52, 25, '!');
      g.c(60, 8, 63, 21);
      g.c(60, 8, 80, 10);
      g.c(81, 8, 90, 28); g.n(81, 28, 10, '^'); g.r(84, 18, 86, 18, 'i');
      g.c(91, 8, 94, 15); g.r(91, 16, 118, 26, 'w'); g.r(100, 16, 102, 22, 'i'); g.r(108, 20, 110, 26, 'i'); g.p(105, 17, '^');
      g.c(115, 8, 118, 15); g.p(117, 9, 'G'); g.p(105, 24, 'e');
    }) },
  { id: '7-3', nom: 'Avalanche', phases: [S, L, Z, P], panneaux: ['Le dernier glacier. Pas de pitié.'],
    carte: N(130, 30, g => {
      g.bloc('i');
      g.c(1, 2, 10, 3); g.p(2, 3, '@'); g.p(4, 3, '?');
      g.c(11, 2, 14, 25); g.c(11, 22, 40, 25); g.p(13, 25, '^'); g.n(24, 25, 2, '^'); g.n(33, 25, 2, '^');
      g.c(41, 4, 44, 25); g.p(41, 15, '^'); g.p(44, 10, '^');
      g.c(45, 4, 70, 7); g.p(50, 7, '^'); g.p(62, 7, '^'); g.p(66, 7, '!');
      g.r(71, 4, 71, 7, 'x');
      g.c(72, 4, 73, 7); g.r(72, 8, 90, 20, 'w'); g.r(78, 8, 79, 14, 'i'); g.r(84, 14, 85, 20, 'i'); g.p(75, 17, '^'); g.p(88, 11, '^');
      g.c(89, 3, 110, 7); g.n(97, 7, 2, '^'); g.n(104, 3, 2, '^');
      g.c(111, 3, 123, 26); g.n(111, 26, 13, '^'); g.p(116, 9, '*');
      g.c(124, 3, 128, 7); g.p(127, 7, 'G'); g.p(80, 18, 'e');
    }) }
] },

/* ================= 8. Cœur : tout à la fois ================= */
{ id: 8, nom: 'Cœur', theme: 'coeur', phases: [S, L, Z, P], niveaux: [
  { id: '8-1', nom: 'Fusion', phases: [S, L, Z, P], panneaux: ['Le cœur de la matière. Chaque état, chaque seconde.'],
    carte: N(120, 30, g => {
      g.bloc();
      g.c(1, 8, 12, 12); g.p(2, 12, '@'); g.p(4, 12, '?');
      g.r(7, 13, 9, 14, 'x'); g.c(1, 15, 20, 20);
      g.col(21, 15, 20, '='); g.c(22, 15, 30, 20);
      g.r(22, 14, 30, 14, '~'); g.c(22, 6, 40, 13); g.p(35, 13, 'f'); g.c(38, 5, 40, 5);
      g.c(38, 1, 60, 4); g.r(41, 5, 60, 5, ']'); g.p(48, 4, '^'); g.p(55, 4, '^'); g.p(40, 4, '!');
      g.r(61, 1, 62, 4, 'x'); g.c(63, 1, 70, 7);
      g.r(63, 8, 85, 16, 'w'); g.p(68, 12, '^'); g.p(74, 15, '^'); g.p(80, 10, '^'); g.p(77, 8, '^');
      g.r(86, 14, 89, 16, 'w'); g.c(86, 2, 89, 13); g.r(85, 2, 85, 13, 'i'); g.r(90, 5, 90, 13, 'i');
      g.c(90, 2, 100, 4);
      g.c(101, 2, 118, 26); g.n(101, 26, 18, '^'); g.r(101, 10, 106, 25, 'A'); g.p(108, 6, '*'); g.r(115, 7, 118, 7);
      g.p(117, 6, 'G'); g.p(60, 2, 'e');
    }) },
  { id: '8-2', nom: 'Transmutation', phases: [S, L, Z, P], panneaux: ['Deux charges ne suffisent jamais. Les cristaux, si.'],
    carte: N(60, 60, g => {
      g.bloc();
      g.c(1, 52, 10, 56); g.p(2, 56, '@'); g.p(4, 56, '?');
      g.c(11, 6, 48, 56); g.n(11, 56, 38, '^');
      g.p(16, 50, '*'); g.p(24, 46, '*'); g.p(32, 42, '*'); g.p(40, 38, '*'); g.p(32, 32, '*'); g.p(22, 28, '*'); g.p(14, 22, '*'); g.p(24, 16, '*'); g.p(36, 12, '*');
      g.col(11, 30, 40, '^'); g.col(48, 20, 34, '^');
      g.r(30, 47, 33, 47, 'i'); g.r(18, 33, 20, 33, '~'); g.r(40, 24, 42, 24, '='); g.p(31, 46, '!');
      g.r(26, 20, 30, 21, 'x'); g.n(26, 19, 5, '^');
      g.c(44, 2, 58, 5); g.p(57, 5, 'G'); g.p(46, 30, 'e');
    }) },
  { id: '8-3', nom: 'Phase finale', phases: [S, L, Z, P], panneaux: ['Le dernier écran. Le temps parfait existe. Presque personne ne l\'atteindra.'],
    carte: N(140, 30, g => {
      g.bloc();
      g.c(1, 20, 7, 26); g.p(2, 26, '@'); g.p(4, 26, '?');
      g.r(8, 20, 8, 26, 'x');
      g.c(9, 14, 20, 26); g.n(9, 26, 12, '^'); g.p(14, 19, '*');
      g.c(21, 14, 24, 25);
      g.c(25, 10, 40, 17); g.r(25, 18, 40, 18, '='); g.r(25, 19, 40, 25, 'w'); g.p(30, 22, '^'); g.p(36, 24, '^'); g.p(32, 17, '!');
      g.r(41, 22, 42, 25, 'w');
      g.c(43, 10, 46, 25); g.n(43, 25, 4, 'f');
      g.c(43, 6, 60, 9); g.r(47, 10, 60, 10, 'i'); g.p(52, 9, '^');
      g.c(61, 4, 80, 25); g.n(61, 25, 20, '^'); g.r(66, 4, 72, 24, 'V'); g.p(64, 8, '*'); g.p(76, 12, '*');
      g.c(81, 6, 100, 9); g.r(81, 10, 100, 10, ']'); g.p(88, 9, '^'); g.p(99, 9, 'P'); g.p(82, 9, '!');
      g.c(101, 20, 120, 24); g.r(101, 25, 120, 25, 'i'); g.p(102, 21, 'p'); g.p(108, 24, '^'); g.p(115, 24, '^');
      g.r(121, 12, 121, 24, 'x');
      g.c(122, 4, 138, 24); g.n(122, 24, 17, '^'); g.p(126, 18, '*'); g.p(130, 12, '*'); g.r(134, 7, 138, 7);
      g.p(137, 6, 'G'); g.p(110, 21, 'e');
    }) }
] }
];

const Niveaux = { ZONES, S, L, Z, P };
if (typeof module !== 'undefined' && module.exports) module.exports = Niveaux;
else racine.Niveaux = Niveaux;
})(typeof window !== 'undefined' ? window : globalThis);
