'use strict';
/* Colosses — apparences de saison et légendes des colosses.
   • Selon la date, quelques apparences de saison apparaissent dans la garde-robe pendant un temps (Halloween, hiver,
     printemps, été) et s'achètent avec des cristaux. Une fois achetées, elles restent à toi.
   • Légendes : chaque espèce a une courte histoire, débloquée dans le Codex après 3 victoires contre elle. */

// ---------- saisons ----------
const SAISONS = [
  { id: 'halloween', nom: 'Nuit des citrouilles', ico: '🎃', de: [10, 15], a: [11, 10], col: '#ff8a1a', part: 'feuilles' },
  { id: 'hiver', nom: 'Fêtes du givre', ico: '❄', de: [12, 1], a: [1, 10], col: '#9fe4ff', part: 'neige' },
  { id: 'printemps', nom: 'Éveil des fleurs', ico: '🌸', de: [3, 20], a: [4, 30], col: '#ff9ad8', part: 'petales' },
  { id: 'ete', nom: 'Feux de l\'été', ico: '☀', de: [7, 1], a: [8, 31], col: '#ffd24d', part: 'lucioles' }
];
const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
function periodeSaison(s) { return s.de[1] + ' ' + MOIS_C[s.de[0] - 1] + ' – ' + s.a[1] + ' ' + MOIS_C[s.a[0] - 1]; }
let _saisonForcee;
function saisonActive(d) {
  if (_saisonForcee === undefined) { const m = /[?&]saison=(\w+)/.exec(location.search); _saisonForcee = m ? m[1] : null; }
  if (_saisonForcee) return SAISONS.find(s => s.id === _saisonForcee) || null;
  d = d || new Date();
  const v = (d.getMonth() + 1) * 100 + d.getDate();
  return SAISONS.find(s => { const a = s.de[0] * 100 + s.de[1], b = s.a[0] * 100 + s.a[1]; return a <= b ? v >= a && v <= b : v >= a || v <= b; }) || null;
}
function saisonOk(id) { const s = saisonActive(); return !!s && s.id === id; }
function nomSaison(id) { const s = SAISONS.find(x => x.id === id); return s ? s.ico + ' ' + s.nom + ' (' + periodeSaison(s) + ')' : ''; }

// apparences de saison : achetées d'un coup (1 « fragment »), seulement pendant leur saison
RARETES.saison = { nom: 'Saison', col: '#ff9a3c', frags: 1, poids: 0 };
PRIX_FRAG.saison = 25;
SKINS.push(
  { id: 'a_citrouille', slot: 'armure', nom: 'Citrouille', rar: 'saison', saison: 'halloween', c: ['#ffe0a8', '#ff7a1a', '#2a0c00'] },
  { id: 'c_sorciere', slot: 'cape', nom: 'Cape de sorcière', rar: 'saison', saison: 'halloween', c: ['#6a1aa0', '#0c0018'], motif: 'etoiles' },
  { id: 't_chauvesouris', slot: 'trainee', nom: 'Nuée de chauves-souris', rar: 'saison', saison: 'halloween', col: '#ff8a1a', add: true, gros: true },
  { id: 'r_lanterne', slot: 'aura', nom: 'Lanterne hantée', rar: 'saison', saison: 'halloween', col: 'rgba(255,140,30,.42)' },
  { id: 'a_givrefete', slot: 'armure', nom: 'Givre de fête', rar: 'saison', saison: 'hiver', c: ['#ffffff', '#b8e8ff', '#1a3a5a'] },
  { id: 'c_flocons', slot: 'cape', nom: 'Cape de flocons', rar: 'saison', saison: 'hiver', c: ['#e8f6ff', '#1e4a8a'], motif: 'etoiles' },
  { id: 't_neige', slot: 'trainee', nom: 'Neige', rar: 'saison', saison: 'hiver', col: '#ffffff', add: true, gros: true },
  { id: 'r_boreale', slot: 'aura', nom: 'Aurore boréale', rar: 'saison', saison: 'hiver', col: 'rgba(120,255,200,.38)' },
  { id: 'a_sakura', slot: 'armure', nom: 'Cerisier', rar: 'saison', saison: 'printemps', c: ['#fff0f6', '#ff9ad0', '#5a1a3a'] },
  { id: 'c_floraison', slot: 'cape', nom: 'Floraison', rar: 'saison', saison: 'printemps', c: ['#ffb0d8', '#2a7a3a'], motif: 'liseré' },
  { id: 't_pollen', slot: 'trainee', nom: 'Pollen', rar: 'saison', saison: 'printemps', col: '#fff6a0', add: true },
  { id: 'r_eclosion', slot: 'aura', nom: 'Éclosion', rar: 'saison', saison: 'printemps', col: 'rgba(255,170,220,.38)' },
  { id: 'a_soleilete', slot: 'armure', nom: 'Soleil d\'été', rar: 'saison', saison: 'ete', c: ['#fff8d0', '#ffb030', '#5a2a00'] },
  { id: 'c_lagon', slot: 'cape', nom: 'Lagon', rar: 'saison', saison: 'ete', c: ['#3ad0ff', '#0a3a6a'], motif: 'etoiles' },
  { id: 't_lucioles', slot: 'trainee', nom: 'Lucioles', rar: 'saison', saison: 'ete', col: '#d8ff6a', add: true, gros: true },
  { id: 'r_canicule', slot: 'aura', nom: 'Canicule', rar: 'saison', saison: 'ete', col: 'rgba(255,200,60,.38)' }
);

// sur la carte de la garde-robe : jusqu'à quand on peut l'acheter
function finSaison(id) { const x = SAISONS.find(k => k.id === id); return x ? "Saison · jusqu'au " + x.a[1] + ' ' + MOIS_C[x.a[0] - 1] : 'Saison'; }

// ---------- légendes des colosses ----------
const LEGENDES_VICT = 3;
const LEGENDES = {
  bourreau: 'Avant les Colosses, il n\'était qu\'un geôlier armé d\'une seule hache. Les rois tombèrent et les prisons se vidèrent, mais personne ne vint lui dire que les exécutions avaient pris fin. Il frappe encore, par habitude, et compte chaque tête comme une prière.',
  metronome: 'Les bâtisseurs l\'avaient forgé pour donner la mesure aux chantiers des géants. Quand le dernier bâtisseur se tut, il continua de battre, seul, et le monde finit par danser à son rythme. Briser sa cadence, c\'est lui rappeler qu\'il existe d\'autres musiques.',
  sentinelle: 'Elle garde une porte que plus personne ne se souvient avoir ouverte. Ses boucliers ont arrêté mille armées, et une seule lassitude : la sienne. On dit qu\'elle s\'ouvre encore pour ceux qui savent attendre le bon instant.',
  forgeron: 'Il forgea les armes des premiers héros, puis celles de leurs ennemis, puis celles de tout le monde. Un jour il comprit qu\'aucune lame ne durait plus longtemps que la guerre, et il décida de devenir la guerre elle-même. Son enclume résonne encore sous chaque arène.',
  hydre: 'Née du marais où l\'on jetait les rois déchus, elle porte une tête pour chaque couronne engloutie. Ses têtes se disputent sans cesse, et c\'est dans leurs disputes que les héros trouvent une faille.',
  spectre: 'Il fut un duelliste si rapide que la mort elle-même le manqua. Depuis, il erre entre deux battements de cœur, ni vivant ni tout à fait parti. Il ne frappe que lorsqu\'il redevient réel : un instant, juste assez pour être touché.',
  juge: 'Il rendit la justice pendant mille ans sans jamais se tromper, disait-on, car nul n\'osait faire appel. Sa balance pèse désormais les héros qui entrent dans son arène. Ceux qu\'elle trouve trop légers ne ressortent pas.',
  tisseuse: 'Elle tissait les tapisseries qui racontaient l\'histoire du monde, fil après fil. Quand l\'histoire devint trop cruelle, elle se mit à tisser des pièges à la place. Chaque toile qu\'elle tend est un chapitre à traverser sans s\'y prendre.',
  horloger: 'Il construisit une horloge capable de compter le temps qu\'il restait à chaque chose. Quand il y lut sa propre heure, il démonta l\'horloge et s\'en fit une armure. Depuis, ses aiguilles tournent pour les autres.',
  serpent: 'Il s\'enroula autour d\'une montagne pour dormir, et la montagne s\'effondra. Il s\'enroula autour d\'une cité, et la cité oublia son nom. Il cherche encore quelque chose d\'assez solide pour l\'étreindre sans se briser.',
  reine: 'Chaque abeille de son essaim porte le souvenir d\'une fleur disparue. La Reine ne se bat pas pour elle, mais pour un jardin dont elle seule se souvient. Tant qu\'un seul de ses enfants vole, elle ne se rend pas.',
  nebuleuse: 'Elle naquit de la poussière d\'une étoile morte et garde la mémoire de toutes les lumières éteintes. Ses salves sont des constellations qu\'elle redessine sans fin. Pour la vaincre, il faut savoir lire le ciel qu\'elle porte.',
  phenix: 'Il mourut une première fois pour sauver une cité de l\'hiver éternel. Il renaquit, et la cité l\'avait déjà oublié. Depuis, chaque renaissance le rend un peu plus ardent, et un peu moins généreux.',
  mante: 'Elle prie avant chaque combat, et personne ne sait à qui. Les moines qui l\'ont suivie disent qu\'elle ne pardonne jamais deux fois la même erreur. Ceux qui esquivent toutes ses faux voient enfin sa garde s\'ouvrir, comme une réponse à sa prière.',
  titan: 'Les montagnes s\'agenouillèrent quand il se leva pour la première fois. Ses plaques d\'armure sont taillées dans les murailles des royaumes qu\'il a traversés. Chaque plaque brisée laisse voir le cœur d\'une forteresse disparue.',
  reflet: 'Un héros contempla si longtemps son reflet dans le grand miroir des Colosses qu\'il oublia lequel des deux était réel. Le reflet, lui, s\'en souvint : il sortit du miroir et laissa le héros derrière la vitre. Depuis, il imite chaque guerrier qu\'il croise, en cherchant le visage qui le délivrera.',
  inverseur: 'Il garde le sablier où s\'écoule le sens des choses : le haut, le bas, la gauche et la droite. Quand il le retourne, le monde se renverse un instant, et seuls les esprits patients gardent l\'équilibre. Il n\'a jamais été vaincu par la force, seulement par le calme.',
  chimere: 'Personne ne l\'a créée : elle s\'est assemblée seule, avec les morceaux que les autres Colosses laissaient derrière eux. Elle ne sait pas ce qu\'elle est, alors elle essaie d\'être tout à la fois. Mais même le chaos a ses habitudes, et elle répète toujours son cycle.'
};
function legendeTexte(id) { const L = typeof Langue !== 'undefined' && Langue.en && Langue.L.legendes; return (L && L[id]) || LEGENDES[id] || ''; }
function nbLegendes() { const cx = Save.d.codex.especes; return Object.keys(LEGENDES).filter(e => cx[e] && cx[e].tues >= LEGENDES_VICT).length; }
function blocLegende(id, v) {
  if (!LEGENDES[id]) return '';
  const n = v ? v.tues : 0;
  if (n >= LEGENDES_VICT) return `<div class="cx-legende"><b>📜 Légende</b><p>${legendeTexte(id)}</p></div>`;
  return `<div class="cx-legende verrou"><b>📜 Légende</b><p>Encore ${LEGENDES_VICT - n} victoire${LEGENDES_VICT - n > 1 ? 's' : ''} pour la découvrir.</p></div>`;
}
if (typeof TITRES !== 'undefined') TITRES.push({ id: 'conteur', nom: 'Conteur', desc: 'Découvrir 10 légendes dans le Codex.', ok: () => nbLegendes() >= 10 });
