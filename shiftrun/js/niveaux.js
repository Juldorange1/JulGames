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
  [L]: ['Torrent', 'jaillis comme un jet d’eau dans la direction tenue : éteint le feu, actionne boutons et interrupteurs'],
  [Z]: ['Souffle', 'grosse poussée à l’opposé de la direction tenue'],
  [P]: ['Éclair enchaîné', 'un nouvel éclair dans une autre direction'],
  [PL]: ['Envol', 'grand battement d’ailes vers le haut (deux avant de toucher le sol), te rend une charge'],
  [CA]: ['Dash', 'élan horizontal qui rebondit sur les murs'],
  [ME]: ['Marteau', 'écrasement immédiat qui brise les blocs fêlés'],
  [OM]: ['Perle', 'lance une perle, tu te téléportes où elle s’arrête'],
  [GL]: ['Bloc de glace', 'pose un bloc de glace sous tes pieds pour un moment'],
  [MA]: ['Explosion', 'brise les blocs fêlés tout autour et te propulse fort dans la direction tenue']
};
// chaque zone met un état en vedette ; les 4 états de chaque niveau sont tirés avec une graine fixe
function etatsDuNiveau(zi, k) {
  if (zi === 0 && k === 0) return [S, L];
  // la première zone : seulement 2 transformations (plus simple, mais toujours dur à speedrunner)
  return Gen.etatsAuHasard(Gen.hasard(5000 + zi * 31 + k * 7), SIGNATURE[zi], zi === 0 ? 2 : 3);
}
// niveaux dont la graine a été décalée (si le robot n'y trouvait pas de chemin)
const DECALE = { '1-3': 2, '7-2': 2, '1-1': 1, '6-4': 3, '2-2': 1, '5-1': 1, '5-3': 1, '2-3': 3, '4-4': 3, '6-2': 3, '7-6': 3 };
// effets amusants : environ un niveau sur deux à partir de la fin de la zone 1, chacun à son tour (jamais deux fois le même d'affilée)
const EFFETS_NIV = ['nuit', 'grandsSauts', 'rapide', 'acceleration', 'brouillard', 'pulsation', 'unecharge', 'nuit', 'grandsSauts', 'acceleration', 'pulsation', 'rapide'];
const AVEC_EFFET = [];
for (let zi = 0; zi < 8; zi++) for (let k = 0; k < 6; k++) if ((zi > 0 || k >= 4) && ((zi * 6 + k) * 37 + 11) % 100 < 55) AVEC_EFFET.push(zi * 6 + k);
function effetDe(zi, k) { const i = AVEC_EFFET.indexOf(zi * 6 + k); return i < 0 ? undefined : EFFETS_NIV[i % EFFETS_NIV.length]; }
// effets spectaculaires, seulement visuels (orage, neige, feux d'artifice) : sur la plupart des niveaux qui n'ont pas d'autre effet
const METEOS = ['orage', 'neige', 'feux'];
function meteoDe(zi, k) { const i = zi * 6 + k; if (i < 2 || AVEC_EFFET.includes(i) || (i * 29 + 5) % 100 >= 75) return undefined; return METEOS[(i * 7) % 3]; }
// vue : certains niveaux sont vus de plus près, d'autres d'un peu plus loin
function zoomDe(zi, k) { if (zi === 0 && k < 3) return 1; const v = ((zi * 6 + k) * 53 + 7) % 3; return v === 0 ? 1.2 : v === 1 ? 0.86 : 1; }
// panneaux d'aide des premiers niveaux : chaque obstacle est expliqué juste avant sa première salle (dans deux niveaux au plus)
const AIDES = [
  ['x', 'Sol fêlé : en solide, en l’air, appuie sur Bas pour le briser (fracas). Saute juste après pour rebondir.'],
  ['s', 'Ressort : marche dessus, il te lance très haut.'],
  ['c', 'Sol cassant : il cède peu après ton passage. Ne t’arrête pas dessus.'],
  ['b', 'Sol rebondissant : il te relance. Lâche Espace pour rebondir moins haut.'],
  ['F', 'Arbalète : elle tire à intervalles réguliers. Passe juste après une flèche.'],
  ['O', 'Orbe jaune : appuie sur saut en la touchant pour sauter en plein air.'],
  ['()', 'Tremplin vert : il te projette loin sur le côté.'],
  ['kRB', 'Interrupteur : touche-le pour échanger les blocs rouges et bleus.'],
  ['Hh', 'Flèche verte : sauts plus hauts un moment. Flèche orange : sauts plus courts.'],
  ['EY', 'Ennemi : il fait des allers-retours. Évite-le ou passe au bon moment.'],
  ['S', 'Sauteur : il bondit sur place. Passe quand il est en l’air.'],
  ['L12345', 'Laser : il s’allume par moments. Un clignotement prévient juste avant.'],
  ['K', 'Pilon : un bloc d’acier tombe du plafond. Passe juste après sa chute.'],
  ['zZ', 'Scie : elle balaie le passage. Passe juste derrière elle.'],
  ['C', 'Orbite : des scies tournent autour d’un pivot. Passe quand elles sont de l’autre côté.'],
  ['t', 'Brûleur : il crache des flammes par moments. Attends qu’il s’éteigne.'],
  ['f', 'Feu : il tue le solide. Le liquide qui le touche devient gaz.'],
  ['g', 'Geyser : une colonne d’eau jaillit par moments et projette tout en haut.'],
  ['U', 'Champignon : il te renvoie au loin.'],
  ['MN', 'Plateforme mobile : saute dessus, elle te porte.'],
  ['|', 'Plateformes en rythme : elles apparaissent et disparaissent en cadence.'],
  ['wuy', 'Eau : on y nage. Le courant pousse dans un sens.'],
  ['[]', 'Tapis roulant : il t’emporte. Saute depuis le tapis pour garder l’élan.'],
  ['i', 'Glace : on y glisse. Freine tôt.'],
  ['=~%arlnmjv', 'Barrière de couleur : seul l’état de sa couleur la traverse. Change d’état juste avant.'],
  ['789', 'Cristal barré : cet état est interdit quelques secondes. Passe autrement.'],
  [':;&', 'Plaque : elle te transforme tout de suite, sans dépenser de charge.'],
  ['PQ', 'Téléporteur : il t’envoie à la sortie de même couleur, en gardant ta vitesse.'],
  ['><AV', 'Vent : il te pousse dans le sens des flèches.'],
  ['{}WX', 'Bord bouclé : sortir d’un côté fait revenir de l’autre.'],
  ['oD', 'Bouton : il ouvre la porte qui le suit.'],
  ['+d', 'Clé : ramasse-la et amène-la devant la grande porte dorée, plus loin : la porte s’ouvre.'],
  ['JT', 'Levier : il ouvre et ferme les grilles.'],
  ['/"', 'Minuteur : il ouvre la porte un court moment. Dépêche-toi.'],
  [',', 'Zone sans pesanteur : tu flottes, chaque saut te pousse.'],
  ['_', 'Broyeur : un mur de scies te poursuit. Ne ralentis pas.'],
  ['!', 'Drapeau : point de sauvegarde. Si tu tombes, tu repars du dernier drapeau touché.'],
  ['^', 'Pics : le moindre contact est mortel. Prends ton élan avant de sauter.']];
const dejaAide = {};
// plus aucun éclat ◆ (cristal rose) dans les niveaux classiques
const sansEclat = (c) => c.map(r => r.replace(/e/g, '.'));
function aides(r, pan) {
  const l = r.carte.map(x => x.split('')), H = l.length, faits = new Set(), poses = [];
  // les panneaux du départ, dans l'ordre
  const dep = []; for (let y = 0; y < H; y++) for (let x = 0; x < 40 && x < l[y].length; x++) if (l[y][x] === '?') dep.push([x, y]);
  dep.sort((a, b) => a[0] - b[0]).forEach(([x, y], i) => poses.push({ x, y, t: pan[i] || '' }));
  const b = r.bornes || [];
  for (let i = 0; i < b.length; i++) {
    const [x0, dy] = b[i], x1 = i + 1 < b.length ? b[i + 1][0] : r.fin;
    const vus = new Set();
    for (let x = x0; x < x1; x++) for (let y = 0; y < H; y++) vus.add(l[y][x]);
    const a = AIDES.find(([cs]) => !faits.has(cs) && (dejaAide[cs] || 0) < 2 && [...cs].some(c => vus.has(c)));
    if (!a) continue;
    const y = 19 + dy;
    const cx = [x0 + 2, x0 + 3, x0 + 1, x0 + 4].find(x => l[y] && l[y][x] === '.' && l[y + 1] && l[y + 1][x] === '#' && l[y][x - 1] !== '?' && l[y][x + 1] !== '?');
    if (cx === undefined) continue;
    l[y][cx] = '?'; faits.add(a[0]); dejaAide[a[0]] = (dejaAide[a[0]] || 0) + 1; poses.push({ x: cx, y, t: a[1] });
  }
  // le moteur lit les panneaux rangée par rangée, de gauche à droite
  poses.sort((p, q) => p.y - q.y || p.x - q.x);
  r.carte = l.map(x => x.join(''));
  pan.length = 0; poses.forEach(p => pan.push(p.t));
}
const ZONES = DEF.map((z, zi) => ({
  id: zi + 1, nom: z.nom, theme: z.theme, phases: [S, L, Z, P],
  niveaux: z.niveaux.map((nom, k) => {
    const d = 0.1 + zi * 0.12 + k * 0.035;
    const nb = Math.min(18 + k * 3, 10 + zi * 3 + k * 3);   // les premières zones sont un peu plus courtes
    const etats = etatsDuNiveau(zi, k);
    const pan = etats.map((p, i) => '[' + (i + 1) + '] ' + DESC[p]).concat(z.intro[k] || []);
    const imp = (z.imposees[k] || []).filter(t => Gen.compatible(t, etats));
    if (k === 5 && Gen.compatible('broyeur', etats)) imp[nb - 1] = 'broyeur';        // le « boss » de la zone : le broyeur, juste avant l'arrivée
    const r = Gen.niveau(zi + 1, 1000 + zi * 97 + k * 13 + (DECALE[(zi + 1) + '-' + (k + 1)] || 0), d, nb, pan, imp.some(Boolean) ? imp : null, etats);
    if (zi <= 1) aides(r, pan);                                // premiers niveaux : un panneau avant chaque obstacle nouveau
    const effet = effetDe(zi, k), zoom = zoomDe(zi, k);
    return { id: (zi + 1) + '-' + (k + 1), nom, phases: etats.slice(), etats, capacites: !(zi === 0 && k < 3), panneaux: pan, carte: sansEclat(r.carte), suite: r.suite, d, effet, zoom, meteo: meteoDe(zi, k) };
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

// zone 9, le Sommet : de longs parcours qui enchaînent passages vers la droite, grandes montées et parfois des descentes
const SOMMET = ['Premier à-pic', 'Les lacets', 'Chute libre', 'Arête', 'Grand gouffre', 'Le Sommet'];
ZONES.push({ id: 9, nom: 'Le Sommet', theme: 'orage', phases: [S, L, Z, P], niveaux: SOMMET.map((nom, k) => {
  let g0 = 9100 + k * 17 + (DECALE['9-' + (k + 1)] || 0), etats = Gen.etatsAuHasard(Gen.hasard(g0), undefined, 3);
  while (etats.includes(8)) etats = Gen.etatsAuHasard(Gen.hasard(g0 += 1000), undefined, 3);   // pas de Glace au Sommet
  const v = Gen.sommet(7300 + k * 41 + (DECALE['9-' + (k + 1)] || 0), etats, k, 0.85 + k * 0.05);
  return { id: '9-' + (k + 1), nom, phases: etats.slice(), etats, capacites: true, panneaux: [], carte: sansEclat(v.carte), suite: ['sommet'], d: 0.85 + k * 0.05 };
}) });
const Niveaux = { TUTO, ZONES, S, L, Z, P, DESC, CAPA, VARIABLES: Gen.VARIABLES };
if (typeof module !== 'undefined' && module.exports) module.exports = Niveaux;
else racine.Niveaux = Niveaux;
})(typeof window !== 'undefined' ? window : globalThis);
