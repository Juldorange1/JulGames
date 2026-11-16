/* Phase — les 24 niveaux de la campagne, construits par le générateur de salles (js/gen.js) avec une graine fixe.
   Dans un niveau, toutes les salles ont la même difficulté : le niveau est aussi dur du début à la fin.
   Légende des cartes : # mur  = grille  ~ tamis  x fragile  ^ pics  f feu  w eau  i glace  s ressort  * cristal
   G arrivée  ! drapeau  - plateforme  [ ] tapis  > < A V vent  P→p Q→q téléporteurs  e éclat  ? panneau  @ départ. */
(function (racine) {
'use strict';
const Gen = (typeof module !== 'undefined' && module.exports) ? require('./gen.js') : racine.Gen;
const S = 0, L = 1, Z = 2, P = 3;

const DEF = [
  { nom: 'Carrière', theme: 'carriere', phases: [S],
    niveaux: ['Premiers pas', 'Éboulis', 'Fracas', 'Galerie', 'Carrière profonde', 'Front de taille'],
    intro: { 3: ['Nouveau : réappuie sur la transformation où tu es pour utiliser sa compétence (elle coûte une charge).'], 0: ['Courir : Q D ou ← →. Sauter : Espace (garde-le appuyé). Change de transformation avec J et K : les panneaux disent lesquelles.',
      'Une barrière de couleur ne laisse passer que l’état de sa couleur. Changer d’état coûte une charge (2 au plus), rendue au sol.'],
      1: ['Sol cassant : il cède peu après ton passage. Sol rebondissant : il te relance (lâche Espace pour rebondir moins haut).',
        'Les arbalètes tirent à intervalles réguliers. Un bouton ouvre la porte qui le suit.'],
      2: ['Orbe jaune : appuie sur saut en la touchant pour sauter en plein air. Tremplin vert : il te projette sur le côté.',
        'Interrupteur : les blocs rouges et bleus s’échangent. Flèche verte : sauts plus hauts un moment, flèche orange : sauts plus courts. Évite les ennemis hérissés.'] },
    imposees: { 0: ['trous', 'cheminee', 'fracas', 'ressort'], 1: ['cassant', 'rebond', 'fleches', 'bouton'], 2: ['orbes', 'tremplins', 'bascule', 'supersaut', 'ennemis'] } },
  { nom: 'Aqueduc', theme: 'aqueduc', phases: [S, L],
    niveaux: ['Goutte', 'Ruissellement', 'Conversion', 'Siphon', 'Égouts', 'Grand canal'],
    intro: { 1: ['Cristal barré : cet état est interdit pendant quelques secondes. Il faut passer autrement.'], 0: ['Plateformes mobiles : saute dessus, elles te portent. Champignon : il te renvoie au loin.'] },
    imposees: { 0: ['murLiquide', 'grilles'], 1: ['banni'] } },
  { nom: 'Chaufferie', theme: 'chaufferie', phases: [S, L, Z],
    niveaux: ['Vapeur', 'Chaudière', 'Explosions', 'Ventilation', 'Soufflerie', 'Haut fourneau'],
    intro: { 0: ['Gaz + feu : explosion qui propulse. Liquide + feu : il devient gaz gratuitement. Le feu tue le solide.'] },
    imposees: { 0: ['tamis', 'feu', 'vent'] } },
  { nom: 'Orage', theme: 'orage', phases: [S, L, Z, P],
    niveaux: ['Éclair', 'Décharge', 'Super saut', 'Foudre', 'Tempête', 'Œil du cyclone'],
    intro: { 0: ['Lasers : ils s’allument par moments, un clignotement prévient juste avant. Scies : elles balaient le passage.'] },
    imposees: { 0: ['eclair'] } },
  { nom: 'Abysses', theme: 'abysses', phases: [S, L, Z, P],
    niveaux: ['Plongée', 'Récif', 'Geyser', 'Courant froid', 'Fosse', 'Abîme'],
    intro: { 0: ['Dans l’eau, le liquide file partout, le gaz remonte comme une bulle, le métal coule.'] },
    imposees: { 0: ['eau'] } },
  { nom: 'Usine', theme: 'usine', phases: [S, L, Z, P],
    niveaux: ['Tapis roulants', 'Engrenages', 'Téléporteurs', 'Presse', 'Chaîne de montage', 'Salle des machines'],
    intro: { 0: ['Tapis roulants : saute depuis un tapis pour garder son élan. Les téléporteurs gardent ta vitesse.'] },
    imposees: { 0: ['tapis', 'teleport'] } },
  { nom: 'Glacier', theme: 'glacier', phases: [S, L, Z, P],
    niveaux: ['Banquise', 'Givre', 'Crevasses', 'Séracs', 'Avalanche', 'Blizzard'],
    intro: { 0: ['La glace glisse et le liquide n’y colle pas. Le saut mural marche encore.'] },
    imposees: { 0: ['glace', 'cheminee*'] } },
  { nom: 'Cœur', theme: 'coeur', phases: [S, L, Z, P],
    niveaux: ['Fusion', 'Noyau', 'Transmutation', 'Singularité', 'Rupture', 'Phase finale'],
    intro: { 0: ['Le cœur de la matière : tout, tout le temps.'] }, imposees: {} }
];

// Solide et Liquide sont toujours là ; chaque niveau a en plus deux états : celui de sa zone et un autre au hasard
const PL = 4, CA = 5, ME = 6, OM = 7, GL = 8, MA = 9;
const SIGNATURE = [S, L, MA, P, GL, CA, PL, OM];
const DESC = {
  [S]: 'Solide : course, saut, saut mural ; en l’air, Bas = fracas qui brise les blocs fêlés (saute juste après : rebond).',
  [L]: 'Liquide : tu colles aux murs et aux plafonds, tu passes les grilles ; lancé contre un mur, ta vitesse devient montée.',
  [Z]: 'Gaz : tu montes, tu traverses les tamis, le vent te porte ; touche le feu pour exploser vers le haut.',
  [P]: 'Plasma : éclair dans la direction tenue, il brise les blocs fêlés ; éclair vers le sol puis saut = super saut.',
  [PL]: 'Plume : tu planes lentement (Bas pour descendre vite) ; idéal pour les longues fosses.',
  [CA]: 'Caoutchouc : tu rebondis sur le sol et les murs ; saute à l’impact pour rebondir plus haut.',
  [ME]: 'Métal : lourd, tu coules, et ni les flèches, ni le feu, ni le vent ne t’arrêtent.',
  [OM]: 'Ombre : tu voles librement un court moment et tu traverses les parois violettes.',
  [GL]: 'Glace : tu glisses très vite et tu marches sur l’eau.',
  [MA]: 'Magma : le feu ne te fait rien ; tu es un peu lent.'
};
// compétence de chaque état : on l'utilise en réappuyant sur la touche de l'état où l'on est déjà
const CAPA = {
  [S]: ['Grappin', 'grappin vers la direction tenue, il te tire jusqu’au mur'],
  [L]: ['Rafale', 'trois jets qui actionnent boutons et interrupteurs à distance'],
  [Z]: ['Souffle', 'grosse poussée à l’opposé de la direction tenue'],
  [P]: ['Éclair enchaîné', 'un nouvel éclair dans une autre direction'],
  [PL]: ['Suspension', 'immobile en l’air un moment, te rend une charge'],
  [CA]: ['Dash', 'élan horizontal qui rebondit sur les murs'],
  [ME]: ['Marteau', 'écrasement immédiat qui brise les blocs fêlés'],
  [OM]: ['Perle', 'lance une perle, tu te téléportes où elle s’arrête'],
  [GL]: ['Bloc de glace', 'pose un bloc de glace sous tes pieds pour un moment'],
  [MA]: ['Explosion', 'brise les blocs fêlés autour de toi et te soulève']
};
// chaque zone met un état en vedette ; les 4 états de chaque niveau sont tirés avec une graine fixe
function etatsDuNiveau(zi, k) {
  if (zi === 0 && k === 0) return [S, L];
  // la première zone : seulement 2 transformations (plus simple, mais toujours dur à speedrunner)
  return Gen.etatsAuHasard(Gen.hasard(5000 + zi * 31 + k * 7), SIGNATURE[zi], zi === 0 ? 2 : 3);
}
// niveaux dont la graine a été décalée (si le robot n'y trouvait pas de chemin)
const DECALE = { '2-2': 1, '5-1': 1, '5-3': 1, '2-3': 3, '4-4': 3, '6-2': 3, '7-6': 3 };
const ZONES = DEF.map((z, zi) => ({
  id: zi + 1, nom: z.nom, theme: z.theme, phases: [S, L, Z, P],
  niveaux: z.niveaux.map((nom, k) => {
    const d = 0.1 + zi * 0.12 + k * 0.035;
    const nb = Math.min(18 + k * 3, 10 + zi * 3 + k * 3);   // les premières zones sont un peu plus courtes
    const etats = etatsDuNiveau(zi, k);
    const pan = etats.map((p, i) => '[' + (i + 1) + '] ' + DESC[p]).concat(z.intro[k] || []);
    const imp = (z.imposees[k] || []).filter(t => Gen.compatible(t, etats));
    const r = Gen.niveau(zi + 1, 1000 + zi * 97 + k * 13 + (DECALE[(zi + 1) + '-' + (k + 1)] || 0), d, nb, pan, imp.length ? imp : null, etats);
    return { id: (zi + 1) + '-' + (k + 1), nom, phases: etats.slice(), etats, capacites: !(zi === 0 && k < 3), panneaux: pan, carte: r.carte, suite: r.suite, d };
  })
}));

// Didacticiel : une seule idée par passage, avec un panneau qui l'explique
function didacticiel() {
  const W2 = 128, H2 = 26, l = [];
  for (let y = 0; y < H2; y++) l.push(new Array(W2).fill('#'));
  const c = (xa, ya, xb, yb, ch = '.') => { for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) l[y][x] = ch; };
  const p = (x, y, ch) => { l[y][x] = ch; };
  c(1, 13, 126, 19);                                  // le couloir
  p(2, 19, '@'); p(4, 19, '?');
  // A : sauter un trou
  c(9, 20, 11, 23); c(9, 23, 11, 23, '^'); p(13, 19, '?');
  // B : monter une cheminée par sauts muraux, puis redescendre
  c(17, 14, 22, 19, '#'); c(17, 5, 19, 13); c(17, 5, 26, 7); c(23, 8, 26, 19); p(15, 19, '?');
  // C : grille, seul le liquide passe
  p(29, 19, '?'); c(33, 13, 34, 19, '=');
  // D : le liquide colle aux murs et grimpe
  p(37, 19, '?'); c(40, 13, 44, 19, '#'); c(36, 4, 39, 12); c(36, 4, 49, 7); c(40, 8, 44, 12, '#'); c(45, 4, 49, 19);
  // E : grappin au-dessus d'une fosse trop large
  p(51, 19, '?'); c(54, 20, 66, 23); c(54, 23, 66, 23, '^');
  // F : la plume plane au-dessus d'une très longue fosse ; on atterrit plus bas
  p(70, 19, '?'); c(74, 20, 87, 23); c(74, 23, 87, 23, '^'); c(88, 20, 126, 22);
  // G : arrivée
  p(96, 22, '!'); p(106, 22, '?'); p(122, 22, 'G');
  return l.map(r => r.join(''));
}
const TUTO = {
  id: 'tuto', nom: 'Didacticiel', etats: [S, L, PL], phases: [S, L, PL], capacites: true, carte: didacticiel(),
  panneaux: ['Avance avec Q D ou ← →. Saute avec Espace : garde-le appuyé pour sauter plus haut.',
    'Saute par-dessus le trou : les pics sont mortels, tu repartirais du dernier drapeau.',
    'Monte dans la cheminée : contre un mur en l’air, saute encore. C’est le saut mural.',
    'Touche K : tu deviens Liquide. Le liquide passe à travers les grilles.',
    'En Liquide, tu colles aux murs : tiens ↑ contre le mur pour grimper.',
    'Repasse en Solide avec J, puis réappuie sur J en tenant ↗ : grappin ! Il te tire au plafond.',
    'Touche L : Plume. Elle plane lentement au-dessus des longues fosses.',
    'Bravo ! Chaque niveau te donne ses propres transformations : lis les panneaux du début. Bonne course !']
};

const Niveaux = { TUTO, ZONES, S, L, Z, P, DESC, CAPA, VARIABLES: Gen.VARIABLES };
if (typeof module !== 'undefined' && module.exports) module.exports = Niveaux;
else racine.Niveaux = Niveaux;
})(typeof window !== 'undefined' ? window : globalThis);
