'use strict';
/* Forge PvP — socle commun : réglages, sauvegarde, touches, sons, modes, utilitaires. */
(function () {
const FP = window.FP = {};
FP.$ = s => document.querySelector(s);
FP.DEG = Math.PI / 180;
FP.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
FP.lerp = (a, b, t) => a + (b - a) * t;
FP.rand = (a, b) => a + Math.random() * (b - a);
FP.ARENA = 118; // demi-largeur de l'arène (bord invisible, bien au-delà des derniers obstacles)
FP.wrap = a => ((a + 180) % 360 + 360) % 360 - 180;
// rotation fluide de la caméra (mode regarder) : la vitesse angulaire accélère puis freine à temps (profil le plus
// rapide possible avec une accélération limitée), sans jamais dépasser la cible. v, d, maxV, acc en degrés par tick.
FP.camStep = function (v, d, maxV, acc) {
  if (Math.abs(d) < 1e-4) return 0;
  const want = Math.sign(d) * Math.min(maxV, Math.sqrt(2 * acc * Math.abs(d)));
  let nv = v + FP.clamp(want - v, -acc, acc);
  if (nv * d < 0) nv = 0;
  if (Math.abs(nv) > Math.abs(d)) nv = d;
  return nv;
};
FP.rng = function (seed) { // générateur déterministe (parcours de parkour reproductibles)
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};

// ---------------------------------------------------------------- sauvegarde
const DEF = FP.DEF = {
  sens: 100, dpi: 800, calib: 1, fov: 70, fovEffects: 0, invertY: false, raw: true, toggleSprint: true,
  showHitbox: false, hitbox18: true, sons: true, volume: 0.7, ombres: true, qualite: 'haute', bobbing: false,
  keys: { fwd: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', sneak: 'ShiftLeft', sprint: 'ControlLeft', swap: 'KeyF', inv: 'KeyE' }
};
const KEY = 'forgepvp_v3';
function loadStore() {
  let d = {};
  try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { d = {}; }
  const s = Object.assign({}, DEF, d.settings || {});
  s.keys = Object.assign({}, DEF.keys, (d.settings && d.settings.keys) || {});
  return { settings: s, history: Array.isArray(d.history) ? d.history : [], configs: d.configs || {}, presets: d.presets || {} };
}
const store = FP.store = loadStore();
const S = FP.S = store.settings;
FP.save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* stockage indisponible */ } };

// ---------------------------------------------------------------- touches (libellés selon la disposition réelle du clavier)
let layoutMap = null;
const AZERTY = { KeyQ: 'A', KeyW: 'Z', KeyA: 'Q', KeyZ: 'W', KeyM: ',', Semicolon: 'M' };
const SPECIAL = { Space: 'Espace', ControlLeft: 'Ctrl G', ControlRight: 'Ctrl D', ShiftLeft: 'Maj G', ShiftRight: 'Maj D',
  AltLeft: 'Alt', Tab: 'Tab', CapsLock: 'Verr. Maj', Backquote: '²' };
FP.keyLabel = function (code) {
  if (!code) return '—';
  if (SPECIAL[code]) return SPECIAL[code];
  if (layoutMap && layoutMap.get(code)) return layoutMap.get(code).toUpperCase();
  if (!layoutMap && /^fr/i.test(navigator.language || '') && AZERTY[code]) return AZERTY[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
};
FP.moveKeys = () => { const k = S.keys, L = FP.keyLabel; return L(k.fwd) + L(k.left) + L(k.back) + L(k.right); };
if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
  navigator.keyboard.getLayoutMap().then(m => { layoutMap = m; if (FP.onKeysReady) FP.onKeysReady(); }).catch(() => {});
}

// ---------------------------------------------------------------- sensibilité (formule de Minecraft)
FP.degPerCount = () => { const f = (S.sens / 200) * 0.6 + 0.2; return f * f * f * 1.2 * S.calib; };
FP.cm360 = () => 360 / FP.degPerCount() / Math.max(50, S.dpi) * 2.54;

// ---------------------------------------------------------------- difficulté libre (0 = extrêmement facile, 100 = presque impossible)
FP.diffParams = function (v) {
  const d = FP.clamp(v == null ? 50 : v, 0, 100) / 100, L = (a, b) => a + (b - a) * d;
  return {
    d, turn: L(3, 50), noise: L(16, 0.4), acc: L(0.3, 0.98), cps: L(0.08, 0.72), wtap: L(0, 1), jreset: L(0, 0.9),
    react: Math.round(L(12, 0)), cdMin: L(0.35, 0.99), crit: L(0, 0.85),
    strafe: [Math.max(2, Math.round(L(30, 2))), Math.max(4, Math.round(L(75, 9)))], stop: L(0.4, 0.02), jump: L(0, 0.07),
    flick: [L(5, 60), L(35, 180)], spread: L(10, 150), relocate: Math.max(1, Math.round(L(8, 1))), pkMargin: L(1.3, 0.02)
  };
};
FP.diffLabel = v => v <= 5 ? 'Extrêmement facile' : v <= 20 ? 'Très facile' : v <= 40 ? 'Facile' : v <= 60 ? 'Normal' : v <= 75 ? 'Difficile' : v <= 90 ? 'Très difficile' : v <= 97 ? 'Extrême' : 'Presque impossible';

// ---------------------------------------------------------------- modes (uniquement de l'entraînement)
FP.MODES = [
  { id: 'duel18', nom: 'Boxing & ciblage', ico: 'sword', cat: 'Combat', comp: 'W-tap · combos · visée',
    desc: 'Combat 1.8 contre autant de cibles que tu veux : elles t’attaquent, t’ignorent ou gardent leurs distances. Le recul max demande un vrai sprint reset.' },
  { id: 'flick', nom: 'Réflexes & flicks', ico: 'flick', cat: 'Visée', comp: 'Réaction · précision',
    desc: 'Des joueurs apparaissent autour de toi, parfois sur un bloc ou en mouvement. Tourne-toi et frappe le plus vite possible.' },
  { id: 'dodge', nom: 'Esquive de flèches', ico: 'dodge', cat: 'Mouvement', comp: 'Lecture des tirs · strafe · couverture',
    desc: 'Des archers et arbalétriers te tirent dessus de tous les côtés : bouge, change de direction, cache-toi derrière les arbres.' },
  { id: 'targets', nom: 'Cibles : épée, arc, arbalète', ico: 'target', cat: 'Combat', comp: 'Changement d’arme · visée · vitesse',
    desc: 'Touche toutes les cibles le plus vite possible. Tu as l’épée, l’arc et l’arbalète en même temps : choisis la bonne arme.' },
  { id: 'build', nom: 'Construction rapide', ico: 'build', cat: 'Construction', comp: 'Placer · casser · lire un plan',
    desc: 'Reproduis à l’identique la maquette posée devant toi, le plus vite possible.' },
  { id: 'bridge', nom: 'Bridge', ico: 'wool', cat: 'Mouvement', comp: 'Speed bridge · ninja · god bridge',
    desc: 'Traverse le vide en posant des blocs. Arrivée placée où tu veux, même en hauteur.' },
  { id: 'course', nom: 'Course libre', ico: 'course', cat: 'Mouvement', comp: 'Trajectoire · blocs à poser · head hitter',
    desc: 'Rejoins l’arrivée le plus vite possible, par où tu veux : îles flottantes, murs, et des blocs à poser partout (ponts, marches, plafond pour sprint-jumper dessous).' },
  { id: 'foret', nom: 'Course en forêt', ico: 'tree', cat: 'Mouvement', comp: 'Trajectoire · sprint-jump · head hitter sous les feuilles',
    desc: 'Traverse une forêt jusqu’à l’arrivée le plus vite possible : trouve le meilleur chemin entre les arbres.' },
  { id: 'vent', nom: 'Pont sous les coups', ico: 'punch', cat: 'Mouvement', comp: 'Équilibre · clutch · pose de blocs',
    desc: 'Avance le plus loin possible sur un pont d’un bloc de large. Des coups te frappent de côté (recul de Minecraft), de plus en plus fort : rattrape-toi en posant des blocs.' },
  { id: 'bateau', nom: 'Course de bateau', ico: 'boat', cat: 'Mouvement', comp: 'Glisse · contre-braquage · trajectoire',
    desc: 'Course en bateau sur une piste de glace bordée de murs, avec la physique exacte du bateau de Minecraft (≈ 40 blocs/s sur glace compactée, 72 sur glace bleue).' },
  { id: 'parkour', nom: 'Parkour', ico: 'boots', cat: 'Mouvement', comp: 'Sprint-jump · obstacles · précision',
    desc: 'Plus c’est dur : plus petites plateformes, obstacles, sauts très espacés. Parcours numérotés ou infinis.' },
  { id: 'clutch', nom: 'Clutch', ico: 'clutch', cat: 'Survie', comp: 'Seau d’eau · bateau · échafaudage · TNT · masse…',
    desc: 'Saute du haut d’un pilier et rattrape-toi avant le sol. L’objet change avec la difficulté : seau d’eau, foin, toile, slime, lit, bateau, échafaudage, échelle, charge de vent, masse, TNT.' },
  { id: 'minage', nom: 'Minage rapide', ico: 'mine', cat: 'Survie', comp: 'Bon outil · temps de casse exacts',
    desc: 'Détruis toute la structure le plus vite possible avec la pioche, la hache et la pelle : les temps de casse sont ceux de Minecraft.' },
  { id: 'craft', nom: 'Artisanat', ico: 'craft', cat: 'Inventaire', comp: 'Recettes · clics · glisser-déposer',
    desc: 'Fabrique à l’établi l’objet demandé le plus vite possible : place les bons objets de ton inventaire aux bons endroits, puis récupère le résultat.' },
  { id: 'cps', nom: 'Test de CPS', ico: 'mouse', cat: 'Clic', comp: 'Vitesse · régularité',
    desc: 'Clics par seconde et régularité : normal, jitter, butterfly ou drag click.' }
];
FP.modeById = id => FP.MODES.find(m => m.id === id);

// ---------------------------------------------------------------- configuration des parties
const dur = def => ({ k: 'duree', type: 'dur', label: 'Durée de la partie', def });
const diff = (def = 50) => ({ k: 'diff', type: 'diff', label: 'Difficulté', def });
const allure = def => [
  { k: 'allure', type: 'select', label: 'Allure des bots', def, options: { immobile: 'Immobiles', accroupi: 'Accroupis (1,3 bloc/s)', marche: 'Marche (4,3 blocs/s)', sprint: 'Sprint (5,6 blocs/s)', sautant: 'Sprint + sauts (≈ 7 blocs/s)' } },
  { k: 'vitesse', type: 'int', label: 'Effet Vitesse (potion)', def: 0, min: 0, max: 5, help: '+20 % de vitesse au sol par niveau, exactement comme la potion de Vitesse.' }];
const COLORS = { blue: 'Bleu', red: 'Rouge', white: 'Blanc', yellow: 'Jaune', lime: 'Vert clair', orange: 'Orange', purple: 'Violet', cyan: 'Cyan' };
const watch = { k: 'regarder', type: 'bool', label: 'Mode regarder : l’ordinateur joue à ta place', def: false, help: 'Il joue parfaitement, mais il ne connaît pas les déplacements futurs des cibles : il les anticipe.' };
FP.SCHEMA = {
  flick: [watch, dur(0), { k: 'cibles', type: 'count', label: 'Nombre de cibles', def: 30, max: 9999 }, diff(50),
    { k: 'distMin', type: 'num', label: 'Distance minimum', def: 2.6, min: 1.5, max: 40, step: 0.5, unit: 'blocs' },
    { k: 'distMax', type: 'num', label: 'Distance maximum', def: 5.5, min: 1.5, max: 40, step: 0.5, unit: 'blocs' },
    { k: 'mobiles', type: 'bool', label: 'Cibles qui se déplacent', def: false }],
  duel18: [watch, dur(0), { k: 'combat', type: 'select', label: 'Version du combat', def: 'moderne', options: { moderne: 'Minecraft actuel (1.9+) : recharge de l’épée 0,625 s', v18: '1.8 (Hypixel, Minemen…) : sans recharge' } },
    { k: 'but', type: 'select', label: 'Ce que je travaille', def: 'recul', options: { recul: 'Repousser l’ennemi le plus loin possible', degats: 'Infliger le plus de dégâts possible' }, help: 'Recul : coups en sprint (W-tap) pour l’envoyer loin, distance mesurée à chaque coup. Dégâts : coups chargés et critiques (en retombant d’un saut), dégâts de Minecraft comptés à chaque coup.' },
    { k: 'objectif', type: 'count', label: 'Premier à (coups chargés)', def: 0, max: 9999 }, diff(50),
    { k: 'cibles', type: 'int', label: 'Nombre de cibles', def: 1, min: 1, max: 20 },
    { k: 'comport', type: 'select', label: 'Comportement des cibles', def: 'attaque', options: { attaque: 'Elles viennent m’attaquer', espace: 'Elles m’ignorent mais gardent leurs distances', ignore: 'Elles m’ignorent et vont où elles veulent' } },
    { k: 'distMin', type: 'num', label: 'Distance minimum', def: 2.5, min: 1, max: 30, step: 0.25, unit: 'blocs', show: c => c.comport === 'espace' },
    { k: 'distMax', type: 'num', label: 'Distance maximum', def: 3.5, min: 1, max: 30, step: 0.25, unit: 'blocs', show: c => c.comport === 'espace' },
    { k: 'zone', type: 'num', label: 'Zone de déplacement (rayon)', def: 12, min: 3, max: 40, step: 1, unit: 'blocs', show: c => c.comport === 'ignore' },
    ...allure('sprint')],
  dodge: [watch, dur(60), diff(50), { k: 'tireurs', type: 'int', label: 'Nombre de tireurs', def: 3, min: 1, max: 16 },
    { k: 'arme', type: 'select', label: 'Armes des tireurs', def: 'mix', options: { arc: 'Arcs', arbalete: 'Arbalètes (3,15 blocs/tick)', mix: 'Mélange arcs + arbalètes' } },
    { k: 'place', type: 'select', label: 'Position des tireurs', def: 'autour', options: { autour: 'Tout autour de moi', devant: 'Devant moi (120°)' } },
    { k: 'distMin', type: 'num', label: 'Distance minimum', def: 14, min: 4, max: 60, step: 1, unit: 'blocs' },
    { k: 'distMax', type: 'num', label: 'Distance maximum', def: 26, min: 4, max: 60, step: 1, unit: 'blocs' },
    { k: 'vies', type: 'count', label: 'Fin après (flèches reçues)', def: 0, max: 999 },
    { k: 'allure', type: 'select', label: 'Allure des tireurs', def: 'marche', options: { immobile: 'Immobiles', accroupi: 'Accroupis (1,3 bloc/s)', marche: 'Marche (4,3 blocs/s)', sprint: 'Sprint (5,6 blocs/s)' } },
    { k: 'indic', type: 'bool', label: 'Indicateurs des tireurs hors écran', def: true, help: 'Une flèche rouge au bord du viseur montre les tireurs qui visent depuis l’extérieur de ton champ de vision. À désactiver pour s’entraîner à les repérer au son et en tournant la tête.' }],
  targets: [watch, dur(0), diff(50), { k: 'cibles', type: 'int', label: 'Cibles par manche', def: 12, min: 1, max: 60 },
    { k: 'manches', type: 'count', label: 'Nombre de manches', def: 5, max: 999 },
    { k: 'distMin', type: 'num', label: 'Distance minimum', def: 2, min: 1.5, max: 70, step: 0.5, unit: 'blocs' },
    { k: 'distMax', type: 'num', label: 'Distance maximum', def: 32, min: 1.5, max: 70, step: 0.5, unit: 'blocs' },
    { k: 'hauteur', type: 'int', label: 'Hauteur maximum des cibles', def: 4, min: 0, max: 20, unit: 'blocs', help: 'Certaines cibles sont posées sur des piliers, jusqu’à cette hauteur.' },
    { k: 'mobiles', type: 'select', label: 'Cibles qui bougent', def: 'certaines', options: { aucune: 'Aucune', certaines: 'Certaines (selon la difficulté)', toutes: 'Toutes' } },
    { k: 'recharge', type: 'int', label: 'Arbalète : Charge rapide', def: 0, min: 0, max: 3, help: 'Enchantement Charge rapide : 1,25 s de chargement, −0,25 s par niveau (comme dans Minecraft).' },
    { k: 'precharge', type: 'bool', label: 'Arbalète déjà chargée au départ', def: true, help: 'Une arbalète chargée le reste même quand tu changes d’arme : prépare-la entre deux manches.' }],
  build: [watch, dur(0), { k: 'manches', type: 'count', label: 'Nombre de constructions', def: 5, max: 999 },
    { k: 'remplissage', type: 'int', label: 'Remplissage de la maquette', def: 50, min: 5, max: 100, unit: '%', help: 'Proportion de la maquette occupée par des blocs (et part de blocs posés en l’air, accrochés à d’autres).' },
    { k: 'largeur', type: 'int', label: 'Largeur / profondeur', def: 4, min: 2, max: 8, unit: 'blocs' },
    { k: 'hauteur', type: 'int', label: 'Hauteur maximum', def: 3, min: 1, max: 8, unit: 'blocs' },
    { k: 'couleurs', type: 'int', label: 'Types de blocs différents', def: 4, min: 1, max: 9 }],
  bridge: [watch, dur(0),
    { k: 'gz', type: 'int', label: 'Arrivée : distance devant', def: 30, min: 2, max: 200, unit: 'blocs' },
    { k: 'gx', type: 'int', label: 'Arrivée : à gauche (−) ou à droite (+)', def: 0, min: -150, max: 150, unit: 'blocs' },
    { k: 'gy', type: 'int', label: 'Arrivée : hauteur (− plus bas, + plus haut)', def: 0, min: -40, max: 60, unit: 'blocs' },
    { k: 'taille', type: 'int', label: 'Taille de la plateforme d’arrivée', def: 3, min: 1, max: 9, unit: 'blocs' },
    { k: 'essais', type: 'count', label: 'Traversées à faire', def: 0, max: 999 },
    { k: 'garder', type: 'bool', label: 'Garder mes blocs après une chute', def: false },
    { k: 'couleur', type: 'select', label: 'Couleur des blocs', def: 'blue', options: COLORS }],
  parkour: [watch, dur(0), diff(50), { k: 'sauts', type: 'count', label: 'Longueur du parcours (sauts)', def: 25, max: 2000, help: '∞ = parcours infini, généré au fur et à mesure.' },
    { k: 'seed', type: 'int', label: 'Numéro du parcours', def: 1, min: 1, max: 99999, help: 'Même numéro + même difficulté = exactement le même parcours.' },
    { k: 'cp', type: 'int', label: 'Checkpoint tous les', def: 6, min: 1, max: 100, unit: 'sauts' }],
  course: [watch, dur(0), diff(50), { k: 'iles', type: 'int', label: 'Nombre d’îles', def: 15, min: 3, max: 200 },
    { k: 'seed', type: 'int', label: 'Numéro du parcours', def: 1, min: 1, max: 99999, help: 'Même numéro + même difficulté = exactement le même parcours.' },
    { k: 'cp', type: 'int', label: 'Checkpoint toutes les', def: 5, min: 1, max: 100, unit: 'îles' },
    { k: 'couleur', type: 'select', label: 'Couleur de mes blocs', def: 'blue', options: COLORS }],
  foret: [watch, { k: 'dist', type: 'int', label: 'Distance jusqu’au demi-tour', def: 120, min: 30, max: 220, unit: 'blocs', help: 'Course aller-retour : jusqu’à l’arche dorée, puis retour au départ.' },
    { k: 'obstacles', type: 'int', label: 'Buissons, troncs couchés, rochers', def: 50, min: 0, max: 100, unit: '%' },
    { k: 'densite', type: 'int', label: 'Densité de la forêt', def: 50, min: 5, max: 100, unit: '%' },
    { k: 'seed', type: 'int', label: 'Numéro de la forêt', def: 1, min: 1, max: 99999, help: 'Même numéro + mêmes réglages = exactement la même forêt.' },
    { k: 'couleur', type: 'select', label: 'Couleur de mes blocs', def: 'blue', options: COLORS }],
  vent: [watch, dur(0), diff(50), { k: 'essais', type: 'count', label: 'Nombre d’essais', def: 3, max: 999 },
    { k: 'montee', type: 'int', label: 'Recul +1 niveau tous les', def: 40, min: 5, max: 400, unit: 'blocs', help: 'Plus tu avances, plus les coups portent loin (enchantement Recul I, II, III…) et plus ils sont fréquents.' },
    { k: 'couleur', type: 'select', label: 'Couleur de mes blocs', def: 'blue', options: COLORS }],
  bateau: [watch, { k: 'tours', type: 'int', label: 'Nombre de tours', def: 3, min: 1, max: 20 },
    { k: 'glace', type: 'select', label: 'Glace', def: 'packed_ice', options: { packed_ice: 'Glace compactée (≈ 40 blocs/s)', blue_ice: 'Glace bleue (≈ 72 blocs/s)' } },
    { k: 'diff', type: 'diff', label: 'Difficulté (largeur de la piste)', def: 50, help: '0 % = piste de 16 blocs de large, 100 % = 4 blocs (le bateau en fait 1,4).' },
    { k: 'taille', type: 'select', label: 'Taille du circuit', def: 'moyen', options: { petit: 'Petit (≈ 350 blocs)', moyen: 'Moyen (≈ 600 blocs)', grand: 'Grand (≈ 950 blocs)' } },
    { k: 'virages', type: 'int', label: 'Virages', def: 50, min: 0, max: 100, unit: '%', help: '0 % = ovale, 100 % = circuit très sinueux.' },
    { k: 'seed', type: 'int', label: 'Numéro du circuit', def: 1, min: 1, max: 99999 }],
  clutch: [watch, diff(50), { k: 'manches', type: 'count', label: 'Nombre de chutes', def: 10, max: 999 },
    { k: 'objet', type: 'select', label: 'Objet', def: 'auto', options: { auto: 'Selon la difficulté (mélange)', water: 'Seau d’eau', hay: 'Botte de foin (coussin)', cobweb: 'Toile d’araignée', slime: 'Bloc de slime', bed: 'Lit', boat: 'Bateau', scaffolding: 'Échafaudage', ladder: 'Échelle (mur d’un bloc)', wind: 'Charge de vent', mace: 'Masse (frapper un zombie)', tnt: 'TNT + briquet' }, help: 'Selon la difficulté : seau d’eau et foin (0 %), + toile, slime, lit (25 %), + bateau, échafaudage, échelle (45 %), + charge de vent (65 %), + masse et TNT (85 %). Le pilier est aussi plus haut.' }],
  minage: [watch, dur(0), diff(50), { k: 'manches', type: 'count', label: 'Nombre de structures', def: 3, max: 999 },
    { k: 'outils', type: 'select', label: 'Outils', def: 'iron', options: { wood: 'En bois', stone: 'En pierre', iron: 'En fer', gold: 'En or', diamond: 'En diamant' } },
    { k: 'efficacite', type: 'int', label: 'Enchantement Efficacité', def: 0, min: 0, max: 5, help: 'Comme dans Minecraft : + (niveau² + 1) de vitesse avec le bon outil.' }],
  craft: [watch, { k: 'crafts', type: 'count', label: 'Nombre d’objets à fabriquer', def: 10, max: 999 },
    { k: 'diff', type: 'diff', label: 'Difficulté', def: 50, help: 'Recettes plus complexes, plus d’objets inutiles dans l’inventaire, et au-delà de 55 % il faut parfois fabriquer d’abord les planches (depuis des bûches) et les bâtons.' },
    { k: 'aide', type: 'select', label: 'Montrer la recette', def: 'apres', options: { toujours: 'Toujours', apres: 'Après 5 secondes', jamais: 'Jamais (de mémoire)' } }],
  cps: [watch, { k: 'tech', type: 'select', label: 'Technique', def: 'normal', options: { normal: 'Normal', jitter: 'Jitter click', butterfly: 'Butterfly', drag: 'Drag click' } },
    { k: 'duree', type: 'int', label: 'Durée du test', def: 10, min: 1, max: 600, unit: 's' }]
};
// sets prêts à l'emploi (l'utilisateur peut enregistrer les siens)
FP.PRESETS = {
  duel18: [
    { nom: 'Duel classique', cfg: { cibles: 1, comport: 'attaque', allure: 'sprint', diff: 50 } },
    { nom: 'Mêlée — 3 attaquants', cfg: { cibles: 3, comport: 'attaque', allure: 'sprint', diff: 45 } },
    { nom: 'Ciblage — strafe à 3 blocs', cfg: { cibles: 1, comport: 'espace', distMin: 2.5, distMax: 3.2, allure: 'sprint', diff: 70 } },
    { nom: 'Chasse — 5 cibles libres', cfg: { cibles: 5, comport: 'ignore', zone: 12, allure: 'sautant', diff: 55 } },
    { nom: 'Cible rapide (Vitesse II)', cfg: { cibles: 1, comport: 'espace', distMin: 2.5, distMax: 4, allure: 'sautant', vitesse: 2, diff: 80 } }],
  bridge: [
    { nom: 'Ligne droite 30', cfg: { gz: 30, gx: 0, gy: 0 } },
    { nom: 'Diagonale 30', cfg: { gz: 21, gx: 21, gy: 0 } },
    { nom: 'Montée +6', cfg: { gz: 20, gx: 0, gy: 6 } },
    { nom: 'Descente −10', cfg: { gz: 25, gx: 0, gy: -10 } },
    { nom: 'Bed Wars (entre îles)', cfg: { gz: 45, gx: 0, gy: 0, taille: 5 } },
    { nom: 'Longue distance 100', cfg: { gz: 100, gx: 0, gy: 0 } }],
  parkour: [{ nom: 'Infini — normal', cfg: { sauts: 0, diff: 50 } }, { nom: 'Très difficile n°7', cfg: { diff: 85, seed: 7, sauts: 30 } }]
};
FP.defaults = id => { const c = {}; (FP.SCHEMA[id] || []).forEach(f => { c[f.k] = f.def; }); return c; };
// seuls les réglages qui existent encore dans le schéma sont repris (les anciens, supprimés, sont ignorés)
FP.getCfg = id => { const d = FP.defaults(id), s = (store.configs && store.configs[id]) || {}; for (const k in d) if (k in s) d[k] = s[k]; return d; };
FP.setCfg = (id, cfg) => { (store.configs || (store.configs = {}))[id] = cfg; FP.save(); };
FP.userPresets = id => ((store.presets || (store.presets = {}))[id] || (store.presets[id] = []));
FP.fmtDur = s => !s ? '∞' : s < 60 ? s + ' s' : Math.floor(s / 60) + ' min' + (s % 60 ? ' ' + (s % 60) + ' s' : '');

// ---------------------------------------------------------------- historique des sessions (pas de records : c'est de l'entraînement)
FP.logSession = function (id, summary) {
  store.history.push({ d: Date.now(), m: id, s: summary });
  if (store.history.length > 400) store.history.splice(0, store.history.length - 400);
  FP.save();
};

// ---------------------------------------------------------------- sons synthétisés
let actx = null, noiseBuf = null, master = null;
function ac() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain(); master.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  master.gain.value = S.volume;
  return actx;
}
function tone(f0, f1, dur, type, vol, delay) {
  const a = ac(), t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, freq, q, vol, type, delay, f1) {
  const a = ac(), t = a.currentTime + (delay || 0), src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noiseBuf; fl.type = type || 'lowpass'; fl.frequency.setValueAtTime(freq, t); fl.Q.value = q || 1;
  if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(fl); fl.connect(g); g.connect(master); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
}
FP.sfx = function (type) {
  if (!S.sons) return;
  try {
    switch (type) {
      case 'hit': noise(0.09, 1400, 1.2, 0.5, 'bandpass'); tone(160, 70, 0.08, 'square', 0.12); break;
      case 'weak': noise(0.06, 900, 1, 0.25, 'bandpass'); break;
      case 'crit': noise(0.12, 2600, 2, 0.45, 'bandpass'); tone(700, 300, 0.12, 'square', 0.1); tone(1100, 600, 0.1, 'triangle', 0.08, 0.03); break;
      case 'hurt': noise(0.14, 700, 1, 0.5, 'lowpass'); tone(140, 80, 0.16, 'sawtooth', 0.12); break;
      case 'swing': noise(0.08, 2200, 0.7, 0.12, 'highpass', 0, 600); break;
      case 'boom': noise(0.7, 900, 0.7, 0.9, 'lowpass', 0, 60); tone(70, 30, 0.5, 'sine', 0.4); break;
      case 'pop': tone(500, 1400, 0.25, 'triangle', 0.18); tone(900, 2000, 0.3, 'sine', 0.1, 0.05); noise(0.3, 3000, 1, 0.2, 'highpass'); break;
      case 'ok': tone(880, 1320, 0.12, 'sine', 0.14); break;
      case 'bad': tone(220, 150, 0.15, 'square', 0.08); break;
      case 'tick': tone(1200, 1200, 0.04, 'sine', 0.08); break;
      case 'go': tone(660, 660, 0.08, 'square', 0.1); tone(990, 990, 0.18, 'square', 0.1, 0.09); break;
      case 'place': noise(0.07, 500, 1, 0.5, 'lowpass'); tone(110, 80, 0.06, 'sine', 0.2); break;
      case 'step': noise(0.04, 600, 1, 0.12, 'lowpass'); break;
      case 'land': noise(0.08, 400, 1, 0.3, 'lowpass'); break;
      case 'bowdraw': noise(0.35, 1800, 4, 0.06, 'bandpass', 0, 3600); break;
      case 'bowshoot': noise(0.22, 3000, 0.8, 0.3, 'highpass', 0, 800); tone(300, 120, 0.12, 'triangle', 0.08); break;
      case 'ding': tone(1975, 1975, 0.5, 'sine', 0.16); tone(2637, 2637, 0.35, 'sine', 0.08, 0.01); break;
      case 'arrowground': noise(0.06, 2500, 2, 0.15, 'bandpass'); break;
      case 'checkpoint': tone(784, 784, 0.1, 'triangle', 0.14); tone(1175, 1175, 0.2, 'triangle', 0.14, 0.08); break;
      case 'finish': [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.25, 'triangle', 0.14, i * 0.09)); break;
      case 'record': [784, 988, 1175, 1568].forEach((f, i) => tone(f, f * 1.01, 0.3, 'sine', 0.12, i * 0.07)); break;
      case 'fall': tone(400, 90, 0.4, 'sawtooth', 0.08); break;
      case 'death': noise(0.5, 500, 1, 0.4, 'lowpass', 0, 100); tone(200, 60, 0.5, 'sawtooth', 0.1); break;
      case 'xload': noise(0.12, 900, 2, 0.12, 'bandpass', 0, 1800); tone(240, 330, 0.08, 'square', 0.05); break;
      case 'xloaded': noise(0.05, 2400, 3, 0.25, 'bandpass'); tone(520, 520, 0.05, 'square', 0.08); tone(780, 780, 0.06, 'square', 0.06, 0.05); break;
      case 'xshoot': noise(0.18, 3600, 0.8, 0.35, 'highpass', 0, 1200); tone(420, 160, 0.09, 'square', 0.09); break;
      case 'equip': noise(0.05, 1500, 1, 0.12, 'bandpass'); break;
      case 'click': tone(1800, 1400, 0.02, 'square', 0.04); break;
    }
  } catch (e) { /* audio indisponible */ }
};
})();
