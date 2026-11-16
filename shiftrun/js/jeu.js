/* Phase — boucle de jeu, commandes, sauvegarde, menus, chrono, records et fantômes. */
(function () {
'use strict';
const M = window.Moteur, NIV = window.Niveaux, R = window.Rendu, SON = window.Son, Gen = window.Gen, tr = window.Langue.t;
const PARF = window.PARFAITS || {};
const MUET = /[?&]muet\b/.test(location.search);

/* ---------- Liste des niveaux ---------- */
const LISTE = [];
NIV.ZONES.forEach((z, zi) => z.niveaux.forEach((nv, k) => LISTE.push({ def: nv, zone: z, zi, k, id: nv.id })));
const parId = {};
LISTE.forEach((l, i) => { parId[l.id] = i; });

/* ---------- Sauvegarde ---------- */
const CLE = 'phase_v2';
const TOUCHES_DEF = {
  gauche: ['KeyA', 'ArrowLeft'], droite: ['KeyD', 'ArrowRight'], haut: ['KeyW', 'ArrowUp'], bas: ['KeyS', 'ArrowDown'],
  saut: ['Space', 'KeyC'], solide: ['KeyJ', 'KeyV'], liquide: ['KeyK', 'KeyB'], gaz: ['KeyL', 'KeyN'], plasma: ['Semicolon', 'Comma'],
  recommencer: ['KeyR'], pause: ['Escape', 'KeyP']
};
const NOMS_ACTIONS = { gauche: 'Gauche', droite: 'Droite', haut: 'Haut', bas: 'Bas (fracas)', saut: 'Saut / giclée / jet', solide: 'État 1 (selon le niveau)', /* traduits à l'affichage */
  liquide: 'État 2 (selon le niveau)', gaz: 'État 3 (selon le niveau)', plasma: 'État 4 (selon le niveau)', recommencer: 'Recommencer', pause: 'Pause' };
let S = { il: {}, course: {}, infini: {}, reglages: { sons: 0.5, musique: 0.5, fantome: 'record', entrees: false, tremble: true }, touches: null, essais: 0, morts: 0 };
try { const d = JSON.parse(localStorage.getItem(CLE)); if (d) S = Object.assign(S, d); } catch (err) { /* pas de stockage */ }
if (!S.infini) S.infini = {};
if (!S.defis) S.defis = {};
if (!S.succes) S.succes = {};
S.reglages = Object.assign({ sons: 0.5, musique: 0.5, fantome: 'record', entrees: false, tremble: true, langue: window.Langue.detecter(), tactile: 'auto' }, S.reglages);
window.Langue.choisir(S.reglages.langue);
if (!S.touches) S.touches = JSON.parse(JSON.stringify(TOUCHES_DEF));
for (const k in TOUCHES_DEF) if (!S.touches[k]) S.touches[k] = TOUCHES_DEF[k].slice();
/* ---------- Éclats ◆ : monnaie de la boutique ---------- */
if (!S.bonus) S.bonus = { eclats: 0, jours: {}, infini: {} };
if (!S.skins) S.skins = { achats: ['base', 'rien'], corps: 'base', accessoire: 'rien', depense: 0 };
// Apparences : 6 catégories équipées en même temps ; la forme et la couleur de l'état restent toujours reconnaissables.
// Prix croissants : tout posséder demande environ 30 000 éclats, soit plus de 500 heures de jeu.
const PRIX = [0, 25, 45, 70, 100, 140, 190, 250, 330, 430, 560, 720, 920, 1180];
const CATS = {
  contour: { nom: 'Contour', icone: '◻', liste: [['base', 'Normal'], ['blanc', 'Blanc'], ['noir', 'Noir'], ['rose', 'Rose'], ['cyan', 'Cyan'], ['vert', 'Vert'], ['rouge', 'Rouge'], ['violet', 'Violet'], ['argent', 'Argent'], ['or', 'Or'], ['neon', 'Néon pulsant'], ['feu', 'Feu'], ['galaxie', 'Galaxie'], ['arcenciel', 'Arc-en-ciel']] },
  motif: { nom: 'Motif', icone: '▦', liste: [['rien', 'Aucun'], ['rayures', 'Rayures'], ['points', 'Points'], ['damier', 'Damier'], ['zigzag', 'Zigzag'], ['ecailles', 'Écailles'], ['coeurs', 'Cœurs'], ['etoiles', 'Étoiles'], ['facettes', 'Facettes'], ['circuit', 'Circuit'], ['lave', 'Lave'], ['brillant', 'Brillant'], ['nebuleuse', 'Nébuleuse'], ['arcenciel', 'Arc-en-ciel']] },
  yeux: { nom: 'Yeux', icone: '👀', liste: [['base', 'Normaux'], ['ronds', 'Ronds'], ['fache', 'Fâché'], ['endormi', 'Endormi'], ['surpris', 'Surpris'], ['mignon', 'Mignon'], ['cyclope', 'Cyclope'], ['croix', 'Croix'], ['lunettes', 'Lunettes'], ['masque', 'Masque'], ['coeur', 'Cœurs'], ['etoile', 'Étoiles'], ['robot', 'Robot'], ['flamme', 'Flammes']] },
  tete: { nom: 'Coiffe', icone: '🎩', liste: [['rien', 'Aucune'], ['noeud', 'Nœud'], ['bandeau', 'Bandeau'], ['casquette', 'Casquette'], ['bonnet', 'Bonnet'], ['oreilles', 'Oreilles'], ['antenne', 'Antenne'], ['chapeau', 'Chapeau'], ['crete', 'Crête'], ['plume', 'Plume'], ['cornes', 'Cornes'], ['aureole', 'Auréole'], ['diademe', 'Diadème'], ['couronne', 'Couronne']] },
  trainee: { nom: 'Traînée', icone: '✨', liste: [['rien', 'Aucune'], ['poussiere', 'Poussière'], ['bulles', 'Bulles'], ['feuilles', 'Feuilles'], ['neige', 'Neige'], ['notes', 'Notes'], ['pixels', 'Pixels'], ['etincelles', 'Étincelles'], ['coeurs', 'Cœurs'], ['etoiles', 'Étoiles'], ['eclairs', 'Éclairs'], ['flammes', 'Flammes'], ['ombre', 'Ombre'], ['arcenciel', 'Arc-en-ciel']] },
  aura: { nom: 'Aura', icone: '◎', liste: [['rien', 'Aucune'], ['douce', 'Douce'], ['glace', 'Glacée'], ['rose', 'Rose'], ['toxique', 'Toxique'], ['feu', 'Brûlante'], ['ombre', 'Sombre'], ['doree', 'Dorée'], ['electrique', 'Électrique'], ['pulsar', 'Pulsar'], ['etoilee', 'Étoilée'], ['divine', 'Divine'], ['neant', 'Néant'], ['arcenciel', 'Arc-en-ciel']] }
};
// ancienne boutique : on rend tous les éclats dépensés (les objets ont changé)
if (!S.app) S.app = { achats: {}, equipe: { contour: 'base', motif: 'rien', yeux: 'base', tete: 'rien', trainee: 'rien', aura: 'rien' }, depense: 0 };
function prixDe(cat, id) { const k = CATS[cat].liste.findIndex(x => x[0] === id); return k < 0 ? 0 : PRIX[k]; }
function possede(cat, id) { return prixDe(cat, id) === 0 || !!S.app.achats[cat + ':' + id]; }
// Barème (environ un éclat toutes les une à deux minutes de jeu, quel que soit le mode) :
// niveau fini +1, chaque médaille obtenue +1 (jusqu'à 4), éclat ◆ du niveau +3 ; défi du jour +3, de la semaine +8, du mois +20 ;
// Infini, Infini à drapeaux et Survivant : +1 par minute et demie de partie.
function eclatsGagnes() {
  let n = S.bonus.eclats;
  for (const id in S.il) { const r = S.il[id]; if (!r) continue; if (r.t != null) n += 1; if (r.eclat) n += 3; n += r.mMax || 0; }
  return n;
}
function gainTemps(frames) { return Math.floor(frames / (90 * 60)); }
function eclatsDispo() { return eclatsGagnes() - S.app.depense; }
function appliquerApparence() { R.choisirApparence(Object.assign({}, S.app.equipe)); }
function gagnerBonus(n) { S.bonus.eclats += n; return n; }
// raccourcis de la manette (numéros de boutons, réglables)
const MANETTE_DEF = { saut: 0, solide: 2, liquide: 3, gaz: 1, recommencer: 8, pause: 9 };
const NOMS_BOUTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Select', 'Start', 'L3', 'R3', '↑', '↓', '←', '→', 'Home'];
if (!S.manette) S.manette = Object.assign({}, MANETTE_DEF);
let attenteManette = null;
function sauver() { try { localStorage.setItem(CLE, JSON.stringify(S)); } catch (err) { /* plein ou bloqué */ } }

/* ---------- Noms des touches (disposition du clavier) ---------- */
const AZERTY = { KeyA: 'Q', KeyQ: 'A', KeyW: 'Z', KeyZ: 'W', Semicolon: 'M', KeyM: ',', Comma: ';', Period: ':', Slash: '!' };
function nomTouche(code) {
  if (!code) return '—';
  const sp = { Space: 'Espace', Escape: 'Échap', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', ShiftLeft: 'Maj', ShiftRight: 'Maj d.',
    ControlLeft: 'Ctrl', Enter: 'Entrée', Tab: 'Tab', Backspace: 'Retour' };
  if (sp[code]) return tr(sp[code]);
  if (AZERTY[code] && window.Langue.langue === 'fr') return AZERTY[code];
  return code.replace(/^Key|^Digit/, '');
}
function touchePhase(p) { return nomTouche(S.touches[['solide', 'liquide', 'gaz', 'plasma'][p]][0]); }

/* ---------- Entrées ---------- */
const tenues = new Set();
let manettePrec = 0, manetteNav = 0, dernierePad = null;
// petite vibration de la manette (chute, explosion)
function vibrer(force, duree) {
  try { const a = dernierePad && dernierePad.vibrationActuator; if (a && a.playEffect) a.playEffect('dual-rumble', { duration: duree, strongMagnitude: force, weakMagnitude: force * 0.6 }); } catch (err) { /* manette sans vibration */ }
}
const BITS = { gauche: M.E.G, droite: M.E.D, haut: M.E.H, bas: M.E.B, saut: M.E.SAUT, solide: M.E.S, liquide: M.E.L, gaz: M.E.Z, plasma: M.E.P };
const tactile = { bits: 0 };
function lireEntrees() {
  let b = 0;
  for (const a in BITS) for (const c of S.touches[a]) if (tenues.has(c)) { b |= BITS[a]; break; }
  b |= manette() | tactile.bits;
  if ((b & M.E.G) && (b & M.E.D)) b &= ~(M.E.G | M.E.D);
  return b;
}
function manette() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let b = 0, sp = 0;
  for (const p of pads) {
    if (!p) continue;
    dernierePad = p;
    const bt = (i) => p.buttons[i] && p.buttons[i].pressed;
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    if (ax < -0.4 || bt(14)) b |= M.E.G;
    if (ax > 0.4 || bt(15)) b |= M.E.D;
    if (ay < -0.5 || bt(12)) b |= M.E.H;
    if (ay > 0.5 || bt(13)) b |= M.E.B;
    const mn = S.manette;
    if (bt(mn.saut)) b |= M.E.SAUT;
    if (bt(mn.solide)) b |= M.E.S;
    if (bt(mn.liquide)) b |= M.E.L;
    if (bt(mn.gaz)) b |= M.E.Z;
    if (bt(mn.recommencer)) sp |= 1;
    if (bt(mn.pause)) sp |= 2;
  }
  const presse = sp & ~manettePrec; manettePrec = sp;
  if (presse & 1) action('recommencer');
  if (presse & 2) action('pause');
  return b;
}

/* ---------- Partie en cours ---------- */
let J = null;          // { mode, cat, idx, n, e, entrees[], fantome, course }
let ecran = 'menu';
let echec = 0, messageT = 0, message = '', recadrer = true;

function charger(idx, opts) {
  const L = LISTE[idx];
  const n = M.charger(L.def);
  const e = M.nouvelEtat(n);
  if (opts && opts.demarre) e.demarre = true;
  R.preparer(n, L.zone.theme);
  recadrer = true;
  return { L, n, e, entrees: [] };
}
function fantomePour(id) {
  const choix = S.reglages.fantome;
  let s = null;
  if (choix === 'record' && S.il[id] && S.il[id].f) s = S.il[id].f;
  else if (choix === 'parfait' && PARF[id]) s = PARF[id].f;
  if (!s) return null;
  const ent = M.decompresser(s);
  while (ent.length && !ent[0]) ent.shift();
  const n = M.charger(LISTE[parId[id]].def);
  return { n, e: M.nouvelEtat(n), ent, i: 0 };
}
function lancerNiveau(idx) {
  const c = charger(idx);
  J = Object.assign(c, { mode: 'niveau', idx, fantome: fantomePour(LISTE[idx].id) });
  S.essais++;
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique(LISTE[idx].zi + 1);
  S.cumul.rejeux++;
}
function regarder(idx, cle) {
  const id = LISTE[idx].id, p = cle === 'record' ? S.il[id] : PARF[id];
  const fz = cle === 'parfait-eclat' ? (p && p.fe) : (p && p.f);
  if (!fz) return;
  const c = charger(idx);
  const ent = M.decompresser(fz);
  while (ent.length && !ent[0]) ent.shift();
  J = Object.assign(c, { mode: 'fantome', vitesse: 1, pauseRejeu: false, idx, rejeu: ent, ri: 0, quoi: cle === 'record' ? 'ton record' : cle === 'parfait-eclat' ? 'le Parfait avec l’éclat ◆' : 'le Parfait' });
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique(LISTE[idx].zi + 1);
}
function lancerCourse(cat) {
  const c = charger(0);
  J = Object.assign(c, { mode: 'course', cat, idx: 0, fantome: null, course: { splits: [], total: 0 } });
  S.essais++;
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique(1);
}
/* ---------- Modes infinis ---------- */
const TOUTES = [0, 1, 2, 3];
function lancerInfini(mode) {
  const graine = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const monde = new Gen.Infini(graine, mode, mode === 3 ? { drapeaux: true, rampe: [0.1, 0.02] } : undefined);
  if (mode === 3) monde.opts.drapeaux = true;
  const def = { id: 'inf' + mode, nom: 'Infini', phases: monde.etats.slice(), etats: monde.etats, carte: monde.ajouter(6), panneaux: [] };
  const n = M.charger(def);
  const e = M.nouvelEtat(n);
  R.preparer(n, (x) => monde.theme(x));
  recadrer = true;
  J = { mode: 'infini', imode: mode, monde, n, e, entrees: [], L: { id: 'inf' + mode, def, zi: 0 }, salle: 0, finT: 0 };
  S.essais++;
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique('infini');
}
/* ---------- Éditeur de niveaux (entièrement au clavier, souris possible) et partage par code ---------- */
const PALETTE = [
  ['#', 'Mur'], ['.', 'Vide'], ['^', 'Pics'], ['-', 'Plateforme fine'], ['@', 'Départ'], ['G', 'Arrivée'], ['!', 'Drapeau'], ['e', 'Éclat ◆'],
  ['x', 'Bloc fêlé'], ['c', 'Sol cassant'], ['b', 'Sol rebondissant'], ['s', 'Ressort'], ['i', 'Glace'], ['w', 'Eau'], ['f', 'Feu'],
  ['*', 'Cristal'], ['O', 'Orbe'], ['U', 'Champignon'], ['(', 'Tremplin ←'], [')', 'Tremplin →'], ['[', 'Tapis ←'], [']', 'Tapis →'],
  ['>', 'Vent →'], ['<', 'Vent ←'], ['A', 'Vent ↑'], ['F', 'Arbalète'], ['L', 'Laser'], ['Z', 'Scie ↔'], ['z', 'Scie ↕'], ['M', 'Plateforme ↔'], ['N', 'Plateforme ↕'],
  ['E', 'Ennemi ↔'], ['Y', 'Ennemi ↕'], ['o', 'Bouton'], ['D', 'Porte'], ['k', 'Interrupteur'], ['R', 'Bloc rouge'], ['B', 'Bloc bleu'],
  ['{', 'Haut bouclé'], ['}', 'Bas bouclé'], ['W', 'Bord gauche bouclé'], ['X', 'Bord droit bouclé'], ['H', 'Saut +'], ['h', 'Saut −'],
  ['a', 'Barrière Solide'], ['=', 'Barrière Liquide'], ['~', 'Barrière Gaz'], ['r', 'Barrière Plasma'], ['l', 'Barrière Plume'], ['n', 'Barrière Caoutchouc'],
  ['m', 'Barrière Métal'], ['%', 'Barrière Ombre'], ['j', 'Barrière Glace'], ['v', 'Barrière Magma'], ['P', 'Téléporteur 1'], ['p', 'Sortie 1'], ['Q', 'Téléporteur 2'], ['q', 'Sortie 2']
];
if (!S.persos) S.persos = [];
let ED = null;
function nouvelleCarte() {
  const l = [];
  for (let y = 0; y < 26; y++) l.push(new Array(90).fill('#'));
  for (let y = 13; y <= 19; y++) for (let x = 1; x < 89; x++) l[y][x] = '.';
  l[19][3] = '@'; l[19][85] = 'G';
  return l;
}
function codeNiveau(nom, etats, l) {               // nom|états|lignes compressées (répétitions), en base 64
  const rle = l.map(r => { let o = '', i = 0; while (i < r.length) { let j = i; while (j < r.length && r[j] === r[i]) j++; o += (j - i > 1 ? (j - i) : '') + r[i]; i = j; } return o; }).join('/');
  return 'SR1:' + btoa(unescape(encodeURIComponent(nom + '|' + etats.join(',') + '|' + rle)));
}
function lireCode(code) {
  try {
    const t = decodeURIComponent(escape(atob(code.trim().replace(/^SR1:/, ''))));
    const [nom, et, rle] = t.split('|');
    const l = rle.split('/').map(r => { const o = []; const re = /(\d*)(\D)/g; let m; while ((m = re.exec(r))) for (let k = 0; k < (m[1] ? +m[1] : 1); k++) o.push(m[2]); return o; });
    const etats = et.split(',').map(Number).filter(x => x >= 0 && x < 10);
    if (!l.length || !etats.length) return null;
    return { nom, etats, l };
  } catch (err) { return null; }
}
function editeurMenu() {
  J = null; ecran = 'menu';
  let h = `<h2>🛠 ${tr('Éditeur de niveaux')}</h2><p class="note">${tr('Crée tes propres niveaux, teste-les, puis partage leur code : un ami le colle ici pour y jouer.')}</p>
    <div class="grille"><button class="btn carte" data-a="ed-nouveau" autofocus><b>＋ ${tr('Nouveau niveau')}</b><small>${tr('une carte vide avec un départ et une arrivée')}</small></button>
    <button class="btn carte" data-a="ed-importer"><b>📥 ${tr('Jouer un code')}</b><small>${tr('colle le code d’un niveau partagé')}</small></button>`;
  S.persos.forEach((p, i) => { h += `<button class="btn carte" data-a="ed-ouvrir" data-i="${i}"><b>✏ ${p.nom}</b><small>${p.etats.map(e => tr(M.NOMS_PHASES[e])).join(' · ')}</small></button>`; });
  h += `</div><div class="menu ligne"><button class="btn" data-a="accueil">${tr('Retour')}</button></div>`;
  montrer(h, 'large');
}
function ouvrirEditeur(i) {
  const p = i == null ? { nom: tr('Mon niveau') + ' ' + (S.persos.length + 1), etats: [0, 1, 2], l: nouvelleCarte() } : { nom: S.persos[i].nom, etats: S.persos[i].etats.slice(), l: S.persos[i].carte.map(r => r.split('')) };
  ED = { idx: i, nom: p.nom, etats: p.etats, l: p.l, cx: 3, cy: 18, pal: 0 };
  majEditeur();
  ecran = 'editeur'; cacherUI();
}
function majEditeur() {
  const carte = ED.l.map(r => r.join(''));
  const def = { id: 'perso', nom: ED.nom, etats: ED.etats, phases: ED.etats.slice(), carte, panneaux: [] };
  let n;
  try { n = M.charger(def); } catch (err) { const c2 = carte.slice(); c2[19] = c2[19].slice(0, 3) + '@' + c2[19].slice(4); def.carte = c2; n = M.charger(def); }
  const e = M.nouvelEtat(n); e.mortT = 1;
  R.preparer(n, 'carriere');
  J = { mode: 'editeur', n, e, entrees: [], L: { id: 'perso', def, zi: 0 }, salle: 0, finT: 0 };
}
function sauverPerso() {
  const p = { nom: ED.nom, etats: ED.etats.slice(), carte: ED.l.map(r => r.join('')) };
  if (ED.idx == null) { S.persos.push(p); ED.idx = S.persos.length - 1; } else S.persos[ED.idx] = p;
  sauver(); message = '💾 ' + tr('Niveau enregistré'); messageT = 80;
}
function testerPerso() {
  sauverPerso();
  const def = { id: 'perso', nom: ED.nom, etats: ED.etats, phases: ED.etats.slice(), carte: ED.l.map(r => r.join('')), panneaux: [] };
  lancerPerso(def, true);
}
function lancerPerso(def, depuisEditeur) {
  let n;
  try { n = M.charger(def); } catch (err) { message = tr('Il manque le départ @'); messageT = 90; return; }
  const e = M.nouvelEtat(n);
  R.preparer(n, 'carriere');
  recadrer = true;
  J = { mode: 'perso', depuisEditeur, n, e, entrees: [], L: { id: 'perso', def, zi: 0 }, salle: 0, finT: 0 };
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique(2);
}
function finPerso() {
  ecran = 'fin'; SON.attenuer(true);
  const def = J.L.def, code = codeNiveau(def.nom, def.etats, def.carte.map(r => r.split('')));
  montrer(`<div class="fin"><div class="nomniv">🛠 ${def.nom}</div><div class="temps">${R.chrono(J.e.temps)}</div>${statsHTML()}
    <div class="lignes"><div>${tr('Code à partager :')}</div><textarea class="code" readonly>${code}</textarea></div>
    <div class="menu ligne">${J.depuisEditeur ? `<button class="btn" data-a="ed-retour" autofocus>${tr('Retour à l’éditeur')}</button>` : ''}<button class="btn" data-a="ed-copier">📋 ${tr('Copier le code')}</button><button class="btn" data-a="perso-rejouer" ${J.depuisEditeur ? '' : 'autofocus'}>${tr('Recommencer')}</button><button class="btn" data-a="editeur">${tr('Éditeur')}</button></div></div>`, 'fin');
}
function importerCode() {
  J = null; ecran = 'menu';
  montrer(`<h2>📥 ${tr('Jouer un code')}</h2><p class="note">${tr('Colle ici le code d’un niveau (Ctrl + V), puis Entrée.')}</p>
    <textarea class="code" id="codeIn" placeholder="SR1:..."></textarea>
    <div class="menu ligne"><button class="btn" data-a="ed-jouer-code">▶ ${tr('Jouer')}</button><button class="btn" data-a="ed-garder-code">💾 ${tr('Garder dans mes niveaux')}</button><button class="btn" data-a="editeur">${tr('Retour')}</button></div>`, 'large');
  const ta = document.getElementById('codeIn'); if (ta) ta.focus();
}
// commandes de l'éditeur au clavier
function toucheEditeur(ev) {
  const l = ED.l, h = l.length, w = l[0].length, c = ev.code;
  const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1] }[c];
  if (mv) { ED.cx = Math.max(1, Math.min(w - 2, ED.cx + mv[0] * (ev.shiftKey ? 5 : 1))); ED.cy = Math.max(1, Math.min(h - 2, ED.cy + mv[1] * (ev.shiftKey ? 5 : 1))); if (ED.peint) poser(); return; }
  if (c === 'Space' || c === 'Enter') { ED.peint = true; poser(); return; }
  if (c === 'Backspace' || c === 'Delete') { const g = ED.pal; ED.pal = 1; poser(); ED.pal = g; return; }
  if (c === 'KeyQ' || c === 'PageUp') { ED.pal = (ED.pal - 1 + PALETTE.length) % PALETTE.length; return; }
  if (c === 'KeyE' || c === 'PageDown') { ED.pal = (ED.pal + 1) % PALETTE.length; return; }
  if (c === 'Digit1' || c === 'Digit2' || c === 'Digit3') { const k = +c.slice(-1) - 1; ED.etats[k] = (ED.etats[k] + 1) % 10; while (ED.etats.filter(x => x === ED.etats[k]).length > 1) ED.etats[k] = (ED.etats[k] + 1) % 10; majEditeur(); return; }
  if (c === 'KeyX') { if (w < 400) { for (const r of l) r.splice(w - 1, 0, ...new Array(20).fill('#')); majEditeur(); } return; }      // agrandir vers la droite
  if (c === 'KeyT') { testerPerso(); return; }
  if (c === 'KeyF') { sauverPerso(); return; }
  if (c === 'KeyC') { copierCode(codeNiveau(ED.nom, ED.etats, l)); return; }
  if (c === 'Escape') { sauverPerso(); editeurMenu(); return; }
}
function poser() {
  const ch = PALETTE[ED.pal][0];
  if (ch === '@' || ch === 'G') for (const r of ED.l) for (let x = 0; x < r.length; x++) if (r[x] === ch) r[x] = '.';     // un seul départ et une seule arrivée
  ED.l[ED.cy][ED.cx] = ch;
  majEditeur();
}
addEventListener('keyup', ev => { if (ev.code === 'Space' || ev.code === 'Enter') { if (ED) ED.peint = false; } });
function copierCode(code) {
  try { navigator.clipboard.writeText(code); message = '📋 ' + tr('Code copié'); messageT = 80; } catch (err) { message = code; messageT = 200; }
}
/* ---------- Didacticiel ---------- */
function lancerTuto() {
  const n = M.charger(NIV.TUTO), e = M.nouvelEtat(n);
  R.preparer(n, 'carriere');
  recadrer = true;
  J = { mode: 'tuto', n, e, entrees: [], L: { id: 'tuto', def: NIV.TUTO, zi: 0 }, salle: 0, finT: 0 };
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique(1);
}
function finTuto() {
  const premiere = !S.tutoVu;
  S.tutoVu = true;
  const gain = premiere ? gagnerBonus(5) : 0;
  sauver();
  ecran = 'fin'; SON.attenuer(true);
  montrer(`<div class="fin"><div class="nomniv">🎓 ${tr('Didacticiel')}</div><div class="temps">${tr('Bravo !')}</div>
    <div class="lignes"><div>${tr('Tu connais l’essentiel. Chaque niveau te donne ses propres transformations : lis les panneaux du début.')}</div>${gain ? `<div class="rose">+${gain} ◆ ${tr('pour la boutique')}</div>` : ''}</div>${statsHTML()}
    <div class="menu ligne"><button class="btn" data-a="jouer" data-i="0" autofocus>▶ ${tr('Premier niveau')}</button><button class="btn" data-a="tuto">${tr('Recommencer')}</button><button class="btn" data-a="accueil">${tr('Menu')}</button></div></div>`, 'fin');
}
/* ---------- Défis spéciaux : descendre ou monter très loin ---------- */
const SPECIAUX = [
  { id: 'd100', nom: 'Descente de 100 m', but: 'Descends au fond d’un puits de 100 mètres.', sens: 'bas', m: 100, graine: 11, gain: 3 },
  { id: 'a100', nom: 'Ascension de 100 m', but: 'Grimpe tout en haut d’un puits de 100 mètres.', sens: 'haut', m: 100, graine: 23, gain: 3 },
  { id: 'd250', nom: 'Abîme de 250 m', but: 'Une descente vertigineuse de 250 mètres.', sens: 'bas', m: 250, graine: 37, gain: 6 }
];
if (!S.speciaux) S.speciaux = {};
function lancerSpecial(id) {
  const sp = SPECIAUX.find(x => x.id === id); if (!sp) return;
  const r = Gen.vertical(sp.graine, sp.sens, sp.m);
  const def = { id: 'sp-' + id, nom: sp.nom, phases: r.etats.slice(), etats: r.etats, carte: r.carte, panneaux: [] };
  const n = M.charger(def), e = M.nouvelEtat(n);
  R.preparer(n, () => sp.sens === 'bas' ? 'abysses' : 'orage');
  recadrer = true;
  J = { mode: 'special', sp, n, e, entrees: [], L: { id: def.id, def, zi: 0 }, salle: 0, finT: 0, y0: e.y };
  S.essais++;
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique('defi');
}
function finSpecial() {
  const sp = J.sp, t = J.e.temps, ancien = S.speciaux[sp.id];
  const record = !ancien || t < ancien.t;
  const gain = !ancien ? gagnerBonus(sp.gain) : 0;
  if (record && !assiste()) S.speciaux[sp.id] = { t };
  sauver();
  ecran = 'fin'; SON.attenuer(true);
  montrer(`<div class="fin"><div class="nomniv">${tr(sp.nom)}</div><div class="temps">${R.chrono(t)}</div>
    <div class="lignes">${record ? '<div class="vert">' + tr(ancien ? 'Nouveau record !' : 'Premier temps enregistré') + '</div>' : `<div>${tr('Record : {0}', '<b>' + R.chrono(ancien.t) + '</b>')}</div>`}
    ${gain ? `<div class="rose">+${gain} ◆ ${tr('pour la boutique')}</div>` : ''}${verifierSucces({ mode: 'special' })}</div>${statsHTML()}
    <div class="menu ligne"><button class="btn" data-a="special" data-s="${sp.id}" autofocus>${tr('Recommencer')}</button><button class="btn" data-a="accueil">${tr('Menu')}</button></div></div>`, 'fin');
}
/* ---------- Survivant : une arène, des ennemis de plus en plus nombreux ; on les écrase en leur sautant dessus ---------- */
// 4 arènes ; leurs bords se renvoient (tomber en bas ramène en haut, sortir à droite ramène à gauche)
const ARENES = [
  { id: 'fosse', nom: 'La fosse', theme: 'orage' },
  { id: 'tours', nom: 'Les deux tours', theme: 'chaufferie' },
  { id: 'cage', nom: 'La cage', theme: 'usine' },
  { id: 'ciel', nom: 'Le ciel ouvert', theme: 'glacier' }
];
// arène générée : plateformes, trous qui renvoient en haut, bords qui renvoient de l'autre côté
function areneHasard(graine) {
  const rng = Gen.hasard(graine), Wd = 46, l = [];
  for (let y = 0; y < Gen.HAUT; y++) l.push(new Array(Wd).fill('#'));
  const c = (xa, ya, xb, yb, ch) => { for (let y = ya; y <= yb; y++) for (let x = Math.max(1, xa); x <= Math.min(Wd - 2, xb); x++) l[y][x] = ch; };
  c(1, 6, Wd - 2, 19, '.');
  const sol = rng() < 0.5 ? 0 : 2;                    // le plus souvent un vrai sol ; au plus un petit trou qui renvoie en haut
  if (sol === 2) { const a = 15 + Math.floor(rng() * 12); c(a, 20, a + 2, 20, '}'); c(a, 5, a + 2, 5, '{'); }
  // étages de plateformes, jamais trop haut pour être atteints
  for (const y of [16, 13, 10]) {
    let x = 2 + Math.floor(rng() * 4);
    while (x < Wd - 6) { const lg = 4 + Math.floor(rng() * 6); if (rng() < 0.7) c(x, y, x + lg, y, '#'); x += lg + 3 + Math.floor(rng() * 5); }
  }
  if (rng() < 0.4) { const a = 10 + Math.floor(rng() * 24); c(a, 11, a + 1, 19, '#'); }      // un pilier
  const ya = 6 + Math.floor(rng() * 6); c(0, ya, 0, 19, 'W'); c(Wd - 1, ya, Wd - 1, 19, 'X');
  const x0 = 20 + Math.floor(rng() * 6); c(x0 - 1, sol === 1 ? 18 : 19, x0 + 1, sol === 1 ? 18 : 19, '.'); l[sol === 1 ? 17 : 19][x0] = '@';
  if (sol === 1) c(x0 - 2, 18, x0 + 2, 18, '#');
  return l.map(r => r.join(''));
}
function areneSurvie(id) {
  const Wd = 46, l = [];
  for (let y = 0; y < Gen.HAUT; y++) l.push(new Array(Wd).fill('#'));
  const c = (xa, ya, xb, yb, ch) => { for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) l[y][x] = ch; };
  c(1, 6, Wd - 2, 19, '.');
  const plates = (lst) => { for (const [a, b, y] of lst) c(a, y, b, y, '#'); };
  const trouBas = (a, b) => { c(a, 20, b, 20, '}'); c(a, 5, b, 5, '{'); };
  const cotes = (ya, yb) => { c(0, ya, 0, yb, 'W'); c(Wd - 1, ya, Wd - 1, yb, 'X'); };
  if (id === 'tours') {
    plates([[8, 12, 16], [33, 37, 16], [19, 26, 12], [8, 12, 9], [33, 37, 9]]);
    c(14, 10, 15, 19, '#'); c(30, 10, 31, 19, '#');                 // deux tours
    trouBas(19, 26); cotes(6, 19);
  } else if (id === 'cage') {
    c(1, 6, Wd - 2, 19, '.');
    for (let y = 9; y <= 17; y += 4) for (let x = 4; x < Wd - 6; x += 9) c(x + (y % 8 ? 4 : 0), y, x + (y % 8 ? 7 : 3), y, '#');
    trouBas(20, 25); cotes(6, 19);
  } else if (id === 'ciel') {
    plates([[4, 9, 15], [16, 22, 12], [24, 30, 16], [34, 41, 11], [10, 14, 9], [28, 31, 8]]);
    trouBas(21, 23); cotes(6, 19);
  } else {
    plates([[5, 12, 16], [33, 40, 16], [17, 28, 13], [3, 9, 10], [36, 42, 10], [19, 26, 9]]);
    trouBas(22, 24); cotes(14, 19);
  }
  l[19][id === 'ciel' || id === 'fosse' ? 19 : 22] = '@';
  return l.map(r => r.join(''));
}
function choixSurvie() {
  J = null; ecran = 'menu';
  S.survieCartes = S.survieCartes || {};
  montrer(`<h2>⚔ ${tr('Survivant')}</h2><p class="note">${tr('Des ennemis de plus en plus nombreux et de plus en plus variés. Saute-leur sur la tête (sauf les hérissés !). Les bords bleus te renvoient de l’autre côté.')}</p>
    <div class="grille">${ARENES.map((a, k) => `<button class="btn carte" data-a="survie" data-i="${k}" ${k === 0 ? 'autofocus' : ''}><b>${tr(a.nom)}</b><small>${S.survieCartes[a.id] ? tr('record : {0}', R.chrono(S.survieCartes[a.id].t) + ' · ' + S.survieCartes[a.id].kills + ' ✖') : '—'}</small></button>`).join('')}</div>
    <div class="menu ligne"><button class="btn" data-a="accueil">${tr('Retour')}</button></div>`, 'large');
}
function lancerSurvie() {
  // une arène au hasard à chaque partie : une des 4 dessinées, ou une arène générée (des milliers possibles)
  const graine = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, k = graine % 7;
  const THM = ['orage', 'chaufferie', 'usine', 'glacier', 'abysses', 'coeur', 'carriere', 'aqueduc'];
  const A = k < 4 ? ARENES[k] : { id: 'hasard', nom: 'Arène inconnue', theme: THM[graine % THM.length] };
  const def = { id: 'survie', nom: 'Survivant', phases: [0, 5, 4], etats: [0, 5, 4], carte: k < 4 ? areneSurvie(A.id) : areneHasard(graine), panneaux: [] };
  const n = M.charger(def), e = M.nouvelEtat(n);
  R.preparer(n, () => A.theme);
  recadrer = true;
  J = { mode: 'survie', arene: A, n, e, entrees: [], L: { id: 'survie', def, zi: 0 }, salle: 0, finT: 0, monstres: [], balles: [], kills: 0, maxEnnemis: 0, spawnT: 180, vague: 0, alea: (Date.now() % 100000) + 1 };
  S.essais++;
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique('infini');
}
const FAUX = { phase: 0, bascule: 0, casses: [], boutons: [], craque: [], glaces: [] };
function hasardJ() { J.alea = (J.alea * 16807) % 2147483647; return J.alea / 2147483647; }
// les sortes d'ennemis (débloquées au fil des vagues) ; le rayon r est aussi celui du dessin et de la hitbox
const ENNEMIS = {
  marcheur: { r: 6.5, vague: 0 }, sauteur: { r: 6.5, vague: 2 }, volant: { r: 6, vague: 5 }, herisse: { r: 6.5, vague: 8 },
  tireur: { r: 6.5, vague: 10 }, rebond: { r: 5.5, vague: 12 }, fonceur: { r: 6, vague: 14 }, archer: { r: 6.5, vague: 16 }, lourd: { r: 8.5, vague: 18 },
  diviseur: { r: 7, vague: 20 }, invocateur: { r: 7.5, vague: 24 }, petit: { r: 4.5, vague: 999 }, fantome: { r: 6.5, vague: 22 }, bombe: { r: 6, vague: 27 }
};
function nouveauMonstre(type, x, y) {
  return { type, r: ENNEMIS[type].r, x, y, vx: 0, vy: 0, dir: hasardJ() < 0.5 ? -1 : 1, sol: false, t: 0, pv: type === 'lourd' ? 2 : 1,
    vit: Math.min(1.7, 0.62 + J.vague * 0.02) * (type === 'petit' ? 1.4 : type === 'lourd' ? 0.6 : 1), charge: 0, meche: 0, invisible: false, garde: 0,
    elite: J.vague >= 12 && hasardJ() < 0.2 && type !== 'petit' };
}
function majSurvie() {
  const e = J.e, n = J.n, T2 = M.T;
  if (!e.demarre || J.finT > 0) return;
  if (!J.prochain && J.spawnT <= 72) {                       // on annonce l'apparition à l'avance
    const types = Object.keys(ENNEMIS).filter(t => ENNEMIS[t].vague <= J.vague + 1);
    const xs = [4, 13, 22, 31, 40];
    J.prochain = { type: types[Math.floor(hasardJ() * types.length)], x: xs[Math.floor(hasardJ() * xs.length)] * T2 + 2, y: 6 * T2 + 2 };
  }
  if (--J.spawnT <= 0) {
    J.vague++;
    const pr2 = J.prochain || { type: 'marcheur', x: 22 * T2, y: 6 * T2 }; J.prochain = null;
    const nm = nouveauMonstre(pr2.type, pr2.x, pr2.y);
    if (nm.elite) { nm.pv++; nm.vit *= 1.15; }                   // élite : plus résistant, un peu plus vif
    J.monstres.push(nm);
    J.spawnT = Math.max(30, Math.round(170 * Math.pow(0.95, J.vague)));
  }
  J.maxEnnemis = Math.max(J.maxEnnemis, J.monstres.length);
  const dur = (px, py) => M.plein(n, FAUX, Math.floor(px / T2), Math.floor(py / T2));
  const pcx = e.x + 6, pcy = e.y + 6;
  const boucler = (m) => {
    const cx = m.x + m.r, cy = m.y + m.r, tx = Math.floor(cx / T2), ty = Math.floor(cy / T2), i = ty * n.w + tx, tt = M.tuile(n, tx, ty), j = n.boucle.get(i);
    if (j === undefined) return;
    if (tt === M.BOUCLE_B && m.vy > 0) m.y = Math.floor(j / n.w) * T2 + 1;
    else if (tt === M.BOUCLE_D && m.vx > 0) m.x = (j % n.w) * T2 + 1;
    else if (tt === M.BOUCLE_G && m.vx < 0) m.x = (j % n.w + 1) * T2 - m.r * 2 - 1;
  };
  for (const m of J.monstres) {
    m.t++;
    const d2 = m.r * 2, cx = m.x + m.r, cy = m.y + m.r;
    if (m.type === 'volant' || m.type === 'fantome') {             // volent droit vers le joueur, à travers les murs
      const dx = pcx - cx, dy = pcy - cy, dd = Math.hypot(dx, dy) || 1, v = m.type === 'fantome' ? 0.45 : 0.7;
      m.vx = dx / dd * v; m.vy = dy / dd * v + Math.sin(m.t * 0.08) * 0.4;
      m.x += m.vx; m.y += m.vy; m.dir = Math.sign(m.vx) || m.dir;
      if (m.type === 'fantome') m.invisible = Math.floor(m.t / 90) % 2 === 1;
      continue;
    }
    // direction : le plus court chemin (en comptant les bords qui se renvoient) ; on ne change d'avis que si l'écart est net
    if (m.garde > 0) m.garde--;
    else if (m.t % 30 === 0 && m.type !== 'tireur') {
      const dx = pcx - cx, lw = n.w * T2, viaBord = J.n.boucle.size ? (dx > 0 ? dx - lw : dx + lw) : Infinity;
      const best = Math.abs(viaBord) + 4 * T2 < Math.abs(dx) ? viaBord : dx;
      const voulu = m.type === 'archer' && Math.abs(best) < 7 * T2 ? -Math.sign(best) : Math.sign(best);   // l'archer garde ses distances
      if (voulu && voulu !== m.dir && Math.abs(best) > 2 * T2) { m.dir = voulu; m.garde = 70; }
    }
    if (m.type === 'fonceur') {                                      // fonce quand il est à la hauteur du joueur
      if (m.charge > 0) m.charge--;
      else if (Math.abs(pcy - cy) < 18 && Math.abs(pcx - cx) < 200 && m.sol) { m.charge = 40; m.dir = Math.sign(pcx - cx) || m.dir; }
    }
    m.vx = m.type === 'tireur' && m.sol ? 0 : m.dir * m.vit * (m.charge > 0 ? 2.6 : 1);
    m.vy = Math.min(8, m.vy + 0.45);
    if (m.type === 'sauteur' && m.sol && m.t % 70 === 0) m.vy = -6.6;
    if (m.type === 'rebond' && m.sol) m.vy = -5.8;                 // rebondit sans arrêt
    if (m.type === 'invocateur' && m.t % 240 === 120 && J.monstres.length < 40) { const p2 = nouveauMonstre('petit', m.x, m.y - 6); p2.vy = -3; J.monstres.push(p2); }
    if (m.type === 'archer' && m.sol && m.t % 130 === 0) {         // tir en cloche vers le joueur
      const dx = pcx - cx; J.balles.push([cx, cy - 4, Math.max(-3, Math.min(3, dx / 60)), -4.2, 260, 1]);
    }
    m.x += m.vx;
    if (dur(m.vx > 0 ? m.x + d2 : m.x, m.y + 1) || dur(m.vx > 0 ? m.x + d2 : m.x, m.y + d2 - 1)) { m.x -= m.vx; m.dir *= -1; m.charge = 0; if (m.sol && hasardJ() < 0.4) m.vy = -6; }
    m.y += m.vy; m.sol = false;
    if (m.vy > 0 && (dur(m.x + 1, m.y + d2) || dur(m.x + d2 - 1, m.y + d2))) { m.y = Math.floor((m.y + d2) / T2) * T2 - d2; m.vy = 0; m.sol = true; }
    else if (m.vy < 0 && (dur(m.x + 1, m.y) || dur(m.x + d2 - 1, m.y))) { m.y = (Math.floor(m.y / T2) + 1) * T2; m.vy = 0; }
    boucler(m);
    if (m.type === 'tireur' && m.sol && m.t % 110 === 0) {          // tire vers le joueur
      const dx = pcx - cx, dy = pcy - cy, dd = Math.hypot(dx, dy) || 1;
      J.balles.push([cx, cy, dx / dd * 2.0, dy / dd * 2.0, 240, 0]);
    }
    if (m.type === 'bombe') {                                        // mèche qui s'allume près du joueur, puis boum
      if (!m.meche && Math.hypot(pcx - cx, pcy - cy) < 3 * T2) m.meche = 90;
      if (m.meche && --m.meche === 0) { m.explose = true; if (Math.hypot(pcx - cx, pcy - cy) < 3 * T2 && !(e.invT > 0) && e.mortT === 0) { e.mortT = 20; e.morts++; e.ev |= M.EV.MORT; e.evX = pcx; e.evY = pcy; } }
    }
  }
  J.monstres = J.monstres.filter(m => !m.explose);
  // balles des tireurs
  J.balles = J.balles.filter(b => { b[0] += b[2]; b[1] += b[3]; if (b[5]) b[3] += 0.12; b[4]--; return b[4] > 0 && !dur(b[0], b[1]); });
  if (e.mortT === 0) for (const b of J.balles) if (M.polyCercle(M.formeJoueur(e), b[0], b[1], 2.5) && !(e.invT > 0)) { e.mortT = 20; e.morts++; e.ev |= M.EV.MORT; e.evX = pcx; e.evY = pcy; break; }
  // contact : par-dessus on écrase (sauf les hérissés), sinon on meurt
  if (e.mortT === 0) for (let k = J.monstres.length - 1; k >= 0; k--) {
    const m = J.monstres[k], cx = m.x + m.r, cy = m.y + m.r;
    if (m.invisible) continue;
    if (Math.abs(cx - pcx) > 20 || Math.abs(cy - pcy) > 20) continue;
    if (!M.polyCercle(M.formeJoueur(e), cx, cy, m.r)) continue;
    if (e.vy > 0.5 && e.y + 12 <= cy + 1 && m.type !== 'herisse') {
      e.vy = -6.6; e.sol = false; e.charges = M.K.charges; e.ev |= M.EV.BOND; e.evX = cx; e.evY = cy;
      if (--m.pv <= 0) {
        J.monstres.splice(k, 1); J.kills++; S.cumul.kills++;
        if (m.type === 'diviseur') for (const s2 of [-1, 1]) { const p2 = nouveauMonstre('petit', m.x + s2 * 6, m.y); p2.dir = s2; p2.vy = -4; J.monstres.push(p2); }
      }
    } else if (!(e.invT > 0)) { e.mortT = 20; e.morts++; e.ev |= M.EV.MORT; e.evX = pcx; e.evY = pcy; break; }
  }
}
function finSurvie() {
  const t = J.e.temps, k = J.kills, ancien = S.survie;
  const record = !ancien || k > (ancien.kills || 0) || (k === ancien.kills && t > ancien.t);   // le score : les ennemis écrasés
  if (record && !assiste()) S.survie = Object.assign(S.survie || {}, { t, kills: k });
  S.survie.killsMax = Math.max(S.survie.killsMax || 0, k);
  const gain = gagnerBonus(gainTemps(t));
  sauver();
  ecran = 'fin';
  SON.attenuer(true);
  montrer(`<div class="fin"><div class="nomniv">${tr('Survivant')} · ${tr(J.arene.nom)}</div><div class="temps">${k} ✖</div>
    <div class="lignes"><div>${tr('Ennemis écrasés : {0}', k)} · ${R.chrono(t)}</div>${record ? '<div class="vert">' + tr('Nouveau record !') + '</div>' : `<div>${tr('Record : {0}', '<b>' + ancien.kills + ' ✖</b>')}</div>`}
    ${gain ? `<div class="rose">+${gain} ◆ ${tr('pour la boutique')}</div>` : ''}<div class="gris">${tr('Un éclat ◆ par minute et demie de partie')}</div>${verifierSucces({ mode: 'survie' })}</div>${statsHTML()}
    <div class="menu ligne"><button class="btn" data-a="survie" autofocus>${tr('Rejouer (nouvelle arène)')}</button><button class="btn" data-a="accueil">${tr('Menu')}</button></div></div>`, 'fin');
}
/* ---------- Défi du jour : un objectif différent chaque jour ---------- */
const DEFIS = [
  { id: 'chrono', nom: 'Contre-la-montre', but: 'Finis cette longue suite de salles le plus vite possible.', score: 'temps' },
  { id: 'minute', nom: 'Une minute', but: 'Franchis le plus de salles possible en 1 minute.', score: 'salles', limite: 60 },
  { id: 'survie', nom: 'Survie', but: 'Une seule vie, des salles de plus en plus dures : va le plus loin possible.', score: 'salles' },
  { id: 'pieces', nom: 'Chasse aux pièces', but: 'Ramasse le plus de pièces possible en 1 min 30.', score: 'pieces', limite: 90 },
  { id: 'sansfaute', nom: 'Sans faute', but: 'Finis sans tomber une seule fois : à la moindre chute, tout recommence.', score: 'temps' },
  { id: 'solide', nom: 'Pierre', but: 'Uniquement l’état solide. Finis le plus vite possible.', score: 'temps' }
];
function cleJour() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function dateDefi(cle) { return String(cle % 100).padStart(2, '0') + '/' + String(Math.floor(cle / 100) % 100).padStart(2, '0'); }
function defiDuJour(cle) {
  const j = Math.floor(Date.UTC(Math.floor(cle / 10000), Math.floor(cle / 100) % 100 - 1, cle % 100) / 86400000);
  return DEFIS[j % DEFIS.length];
}
function texteScore(type, r) {
  if (!r) return '—';
  if (type.score === 'temps') return R.chrono(r.t);
  if (type.score === 'salles') return tr('Salles : {0}', r.score);
  return tr('Pièces : {0}', r.score);
}
function meilleurQue(type, a, b) {          // a meilleur que b ?
  if (!b) return true;
  if (type.score === 'temps') return a.t < b.t;
  return a.score > b.score || (a.score === b.score && a.t < b.t);
}
// semaine et mois : un très long parcours contre la montre, le même pour tout le monde
function cleSemaine() { const d = new Date(); const j = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); return 'S' + Math.floor((j + 3) / 7); }
function cleMois() { const d = new Date(); return 'M' + (d.getFullYear() * 100 + d.getMonth() + 1); }
const PERIODES = {
  semaine: { nom: 'Défi de la semaine', but: 'Un très long parcours, le même toute la semaine : fais le meilleur temps.', gain: 8, nb: 40, d: 0.9 },
  mois: { nom: 'Défi du mois', but: 'Un parcours immense et dur, le même tout le mois : fais le meilleur temps.', gain: 20, nb: 60, d: 1.0 }
};
// certaines semaines et certains mois, le défi est vertical (descente, ascension, abîme)
function varianteDefi(per) {
  const cle = per === 'semaine' ? cleSemaine() : cleMois(), k = parseInt(cle.slice(1), 10);
  const P = PERIODES[per];
  if (per === 'semaine') {
    if (k % 4 === 1) return { type: 'bas', m: 100, nom: 'Descente de 100 m', but: 'Descends au fond d’un puits de 100 mètres.' };
    if (k % 4 === 2) return { type: 'haut', m: 100, nom: 'Ascension de 100 m', but: 'Grimpe tout en haut d’un puits de 100 mètres.' };
    return { type: 'course', nom: 'Parcours', but: P.but };
  }
  if (k % 3 === 1) return { type: 'bas', m: 250, nom: 'Abîme de 250 m', but: 'Une descente vertigineuse de 250 mètres.' };
  return { type: 'course', nom: 'Parcours', but: P.but };
}
function lancerDefiLong(per, msg) {
  const P = PERIODES[per], cle = per === 'semaine' ? cleSemaine() : cleMois();
  const graine = [...cle].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const va = varianteDefi(per);
  const r = va.type === 'course' ? Gen.defi(graine, { nb: P.nb, d: P.d }) : Gen.vertical(graine % 100000, va.type, va.m);
  const def = { id: 'defi', nom: P.nom, phases: r.etats.slice(), etats: r.etats, carte: r.carte, panneaux: [] };
  const n = M.charger(def), e = M.nouvelEtat(n);
  R.preparer(n, (x) => Gen.THEMES_INF[(graine + Math.floor(x / 90)) % 8]);
  recadrer = true;
  const type = { id: per, nom: P.nom, but: P.but, score: 'temps' };
  J = { mode: 'defi', periode: per, vert: va.type !== 'course' ? va : null, y0: e.y, type, cle, n, e, monde: null, entrees: [], fantome: null, L: { id: 'defi', def, zi: 0 }, salle: 0, finT: 0, pieces: 0, limite: 0 };
  S.essais++;
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique('defi');
  if (msg) { message = msg; messageT = 90; }
}
function lancerDefi(msg) {
  const force = new URLSearchParams(location.search).get('defi');           // ?defi=pieces : pour tester un type
  const cle = cleJour(), type = DEFIS.find(d => d.id === force) || defiDuJour(cle);
  let r = null, monde = null, phases = TOUTES;
  if (type.id === 'minute') monde = new Gen.Infini(cle, 1, { drapeaux: true, rampe: [0.3, 0.03] });
  else if (type.id === 'survie') monde = new Gen.Infini(cle, 2, { rampe: [0.2, 0.045] });
  else if (type.id === 'pieces') r = Gen.defi(cle, { pieces: true, nb: 30, d: 0.55 });
  else if (type.id === 'sansfaute') r = Gen.defi(cle, { drapeaux: false, nb: 16 });
  else if (type.id === 'solide') { r = Gen.defi(cle, { types: Gen.TOUS.filter(t => Gen.compatible(t, [0])), d: 0.7, etats: [0, 1, 2, 3] }); phases = [0]; }
  else r = Gen.defi(cle);
  const etats = monde ? monde.etats : r.etats;
  if (phases === TOUTES) phases = etats.slice();
  const def = { id: 'defi', nom: 'Défi du jour', phases, etats, carte: monde ? monde.ajouter(6) : r.carte, panneaux: [] };
  const n = M.charger(def);
  const e = M.nouvelEtat(n);
  R.preparer(n, monde ? (x) => monde.theme(x) : (x) => Gen.THEMES_INF[(cle + Math.floor(x / 90)) % 8]);
  recadrer = true;
  const fantome = null;                // aucun fantôme ni robot dans les défis
  J = { mode: 'defi', periode: 'jour', type, cle, n, e, monde, entrees: [], fantome, L: { id: 'defi', def, zi: 0 }, salle: 0, finT: 0,
    pieces: r ? r.pieces || 0 : 0, limite: type.limite ? type.limite * 60 : 0 };
  S.essais++;
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique('defi');
  if (msg) { message = msg; messageT = 90; }
}
function finDefi() {
  const cle = J.cle, type = J.type, t = J.e.temps, ancien = S.defis[cle] && S.defis[cle].type === type.id ? S.defis[cle] : null;
  const score = type.score === 'salles' ? J.salle : type.score === 'pieces' ? J.e.pieces.length : t;
  const res = { type: type.id, score, t };
  const record = meilleurQue(type, res, ancien);
  if (record && !assiste()) S.defis[cle] = res;
  const gainD = !S.bonus.jours[cle] && (type.score !== 'salles' || score >= 3) ? gagnerBonus(J.periode === 'jour' ? 3 : PERIODES[J.periode].gain) : 0;
  if (gainD) S.bonus.jours[cle] = 1;
  sauver();
  ecran = 'fin';
  SON.attenuer(true);
  const jours = Object.keys(S.defis).length;
  const titreD = J.periode === 'jour' ? tr('Défi du jour · {0}', tr(type.nom)) + ' · ' + dateDefi(cle) : tr(type.nom);
  montrer(`<div class="fin"><div class="nomniv">${titreD}</div><div class="temps">${texteScore(type, res)}</div>
    <div class="lignes">${record ? '<div class="vert">' + tr(ancien ? 'Meilleur résultat du jour !' : 'Premier résultat du jour') + '</div>' : `<div>${tr('Ton meilleur du jour : {0}', '<b>' + texteScore(type, ancien) + '</b>')}</div>`}
    <div class="gris">${type.score !== 'temps' ? R.chrono(t) + ' · ' : ''}${tr('Chutes : {0}', J.e.morts)} · ${tr('Défis relevés : {0} · un nouveau défi demain', jours)}</div>${gainD ? `<div class="rose">+${gainD} ◆ ${tr('pour la boutique')}</div>` : ''}${verifierSucces({ mode: 'defi' })}</div>${statsHTML()}
    <div class="menu ligne"><button class="btn" data-a="${J.periode === 'jour' ? 'defi' : 'defi-' + J.periode}" autofocus>${tr('Recommencer')} <small>${nomTouche(S.touches.recommencer[0])}</small></button>
    <button class="btn" data-a="accueil">${tr('Menu')}</button></div></div>`, 'fin');
}
function avancerMonde() {
  const e = J.e, m = J.monde, cx = (e.x + M.W / 2) / M.T;
  // on prépare toujours plusieurs salles d'avance
  if (cx > J.n.w - 90) {
    const ancien = J.n.w;
    M.recharger(J.n, m.ajouter(3));
    R.etendre(J.n, ancien);
  }
  let k = 0;
  while (k < m.bornes.length && m.bornes[k] <= cx) k++;
  const salle = Math.max(0, k - 1);
  if (salle > J.salle) J.salle = salle;
}
function finInfini() {
  const mode = J.imode, n = J.salle, t = J.e.temps, ancien = S.infini[mode];
  ecran = 'fin';
  const record = !ancien || n > ancien.salles || (n === ancien.salles && t < ancien.t);
  if (record && !assiste()) S.infini[mode] = { salles: n, t };
  const gainI = gagnerBonus(gainTemps(t));
  sauver();
  ecran = 'fin';
  SON.attenuer(true);
  montrer(`<div class="fin"><div class="nomniv">${tr('Infini')}</div><div class="temps">${tr('Salles franchies : {0}', n)}</div>
    <div class="lignes">${record ? '<div class="vert">' + tr('Nouveau record !') + '</div>' : `<div>${tr('Record : {0}', '<b>' + tr('Salles : {0}', ancien.salles) + '</b>')}</div>`}
    <div class="gris">${R.chrono(t)} · ${tr('Difficulté atteinte : {0} %', Math.round(J.monde.difficulte(n) / 1.2 * 100))}</div>${gainI ? `<div class="rose">+${gainI} ◆ ${tr('pour la boutique')}</div>` : ''}<div class="gris">${tr('Un éclat ◆ par minute et demie de partie')}</div></div>
    ${verifierSucces({ mode: 'infini' })}${statsHTML()}
    <div class="menu ligne"><button class="btn" data-a="infini" autofocus>${tr('Recommencer')} <small>${nomTouche(S.touches.recommencer[0])}</small></button>
    <button class="btn" data-a="accueil">${tr('Menu')}</button></div></div>`, 'fin');
}

function recommencer() {
  if (!J) return;
  if (J.mode === 'infini') { lancerInfini(J.imode); return; }
  if (J.mode === 'defi') { lancerDefiLong(J.periode); return; }
  if (J.mode === 'survie') { lancerSurvie(); return; }
  if (J.mode === 'special') { lancerSpecial(J.sp.id); return; }
  if (J.mode === 'tuto') { lancerTuto(); return; }
  if (J.mode === 'perso') { lancerPerso(J.L.def, J.depuisEditeur); return; }
  if (J.mode === 'niveau' && J.entrainement) { allerDrapeau(J.drapeauDepart || 0); return; }
  if (J.mode === 'niveau') lancerNiveau(J.idx);
  else if (J.mode === 'fantome') regarder(J.idx, J.quoi === 'ton record' ? 'record' : J.quoi === 'le Parfait' ? 'parfait' : 'parfait-eclat');
  else if (J.mode === 'course') {
    // en course, R ramène au dernier drapeau (le chrono continue)
    if (J.e.mortT === 0 && J.e.demarre) { J.e.mortT = 1; J.e.morts++; }
  }
}

/* ---------- Statistiques de la partie ---------- */
function nouvellesStats() { return { sauts: 0, murs: 0, chg: 0, parEtat: new Array(16).fill(0), dist: 0, vmax: 0, air: 0, haut: Infinity, bas: -Infinity, fracas: 0, cristaux: 0, orbes: 0, rebonds: 0, immobile: 0, drapeaux: 0 }; }
function compterStats(e, x0, y0) {
  const st = J.stats || (J.stats = nouvellesStats());
  const cum = J.mode === 'fantome' ? {} : S.cumul;              // les rejeux ne comptent pas dans tes totaux
  if (!e.demarre || e.mortT) return;
  const ev = e.ev;
  if (ev & M.EV.SAUT) { st.sauts++; cum.sauts = (cum.sauts || 0) + 1; }
  if (ev & M.EV.MUR) st.murs++;
  if (ev & M.EV.CHANGE) { st.chg++; cum.chg = (cum.chg || 0) + 1; }
  if (ev & M.EV.CAPA) { st.capas = (st.capas || 0) + 1; cum.capas = (cum.capas || 0) + 1; }
  if (ev & M.EV.FRACAS) st.fracas++;
  if (ev & M.EV.CRISTAL) st.cristaux++;
  if (ev & M.EV.ORBE) st.orbes++;
  if (ev & (M.EV.REBOND | M.EV.BOND | M.EV.RESSORT)) st.rebonds++;
  if (ev & M.EV.DRAPEAU) st.drapeaux++;
  st.parEtat[e.phase]++;
  const d = Math.hypot(e.x - x0, e.y - y0);
  if (d < 40) { st.dist += d; cum.dist = (cum.dist || 0) + d; st.vmax = Math.max(st.vmax, d); if (d < 0.05) st.immobile++; }
  if (!e.sol) st.air++;
  st.haut = Math.min(st.haut, e.y); st.bas = Math.max(st.bas, e.y);
}
function statsHTML() {
  const st = J && J.stats; if (!st) return '';
  const e = J.e, sec = Math.max(1, e.temps / 60), tot = Math.max(1, st.parEtat.reduce((a, b) => a + b, 0));
  const m = (px) => (px / M.T).toFixed(0) + ' m';
  const V = {
    chutes: [tr('Chutes'), e.morts], vmoy: [tr('Vitesse moyenne'), (st.dist / M.T / sec).toFixed(1) + ' m/s'], vmax: [tr('Vitesse max.'), (st.vmax * 60 / M.T).toFixed(1) + ' m/s'],
    dist: [tr('Distance'), m(st.dist)], deniv: [tr('Dénivelé'), m(Math.max(0, st.bas - st.haut))], sauts: [tr('Sauts'), st.sauts], murs: [tr('Sauts muraux'), st.murs],
    chg: [tr('Changements d’état'), st.chg], capas: [tr('Compétences'), st.capas || 0], reb: [tr('Rebonds et ressorts'), st.rebonds], air: [tr('Temps en l’air'), Math.round(st.air / tot * 100) + ' %'],
    immo: [tr('Temps immobile'), (st.immobile / 60).toFixed(1) + ' s'], drap: [tr('Drapeaux'), st.drapeaux], fracas: [tr('Fracas'), st.fracas], orbes: [tr('Cristaux et orbes'), st.cristaux + st.orbes],
    eclat: [tr('Éclat ◆'), e.eclat ? '✔' : '✘'], kills: [tr('Ennemis écrasés'), J.kills || 0], kpm: [tr('Ennemis par minute'), ((J.kills || 0) / (sec / 60)).toFixed(1)],
    max: [tr('Le plus d’ennemis à la fois'), J.maxEnnemis || 0], salles: [tr('Salles'), J.salle || 0], vvert: [tr('Vitesse verticale'), (Math.max(0, st.bas - st.haut) / M.T / sec).toFixed(1) + ' m/s']
  };
  const plan = {
    fantome: [['vmoy', 'vmax', 'chg', 'capas'], ['dist', 'sauts', 'murs', 'air', 'immo', 'drap', 'reb', 'orbes', 'eclat']],
    niveau: [['chutes', 'vmoy', 'eclat', 'chg'], ['vmax', 'dist', 'sauts', 'murs', 'capas', 'air', 'immo', 'drap', 'reb', 'orbes']],
    defi: [['chutes', 'vmoy', 'dist', 'drap'], ['vmax', 'sauts', 'murs', 'chg', 'capas', 'air', 'immo', 'reb', 'orbes']],
    infini: [['salles', 'dist', 'vmoy', 'chg'], ['vmax', 'sauts', 'murs', 'capas', 'air', 'immo', 'reb', 'orbes']],
    survie: [['kills', 'kpm', 'max', 'sauts'], ['dist', 'vmoy', 'vmax', 'chg', 'capas', 'air', 'immo', 'reb']],
    special: [['deniv', 'vvert', 'chutes', 'vmoy'], ['dist', 'vmax', 'sauts', 'murs', 'chg', 'capas', 'air', 'immo', 'reb']]
  }[J.mode] || [['chutes', 'vmoy', 'dist', 'chg'], ['vmax', 'sauts', 'murs', 'capas', 'air', 'immo']];
  const pref = st.parEtat.map((v, i) => [v, i]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]);
  return `<div class="stats grandes">${plan[0].map(k => `<div><small>${V[k][0]}</small><b>${V[k][1]}</b></div>`).join('')}</div>
    <div class="parts">${pref.map(([v, i]) => `<span style="--c:${R.COUL_PHASE[i]};flex:${v}">${tr(M.NOMS_PHASES[i])} ${Math.round(v / tot * 100)} %</span>`).join('')}</div>
    <div class="stats petites">${plan[1].map(k => `<div><small>${V[k][0]}</small><b>${V[k][1]}</b></div>`).join('')}</div>`;
}
/* ---------- Entraînement : repartir d'un drapeau ---------- */
let nivEntrainement = false;
function drapeauxNiveau() {
  const n = J.n, out = [];
  for (let x = 0; x < n.w; x++) for (let y = 0; y < n.h; y++) if (n.g[y * n.w + x] === M.DRAPEAU) out.push([x, y]);
  return out;
}
function allerDrapeau(k) {
  const fl = drapeauxNiveau();
  const e = M.nouvelEtat(J.n);
  if (k > 0 && fl[k - 1]) { const [tx, ty] = fl[k - 1]; e.cp = { x: tx * M.T + (M.T - M.W) / 2, y: (ty + 1) * M.T - M.H, tx, ty }; e.x = e.cp.x; e.y = e.cp.y; }
  J.e = e; J.drapeauDepart = k; J.segT = 0; J.stats = null; recadrer = true;
}
/* ---------- Temps à chaque drapeau, comparés au record ---------- */
function noterDrapeau() {
  const e = J.e;
  if (!(e.ev & M.EV.DRAPEAU) || J.entrainement || (J.mode !== 'niveau' && J.mode !== 'course')) return;
  const k = drapeauxNiveau().findIndex(([x, y]) => x === e.cp.tx && y === e.cp.ty);
  if (k < 0) return;
  J.splits = J.splits || [];
  if (J.splits[k] != null) return;
  J.splits[k] = e.temps;
  const rec = S.il[J.L.id] && S.il[J.L.id].splits;
  if (rec && rec[k] != null) {
    const d = e.temps - rec[k];
    message = '⚑ ' + (k + 1) + '   ' + R.chrono(e.temps) + '   ' + R.ecart(d); messageT = 110; J.couleurMsg = d <= 0 ? '#7dff9a' : '#ff8a8a';
  } else { message = '⚑ ' + (k + 1) + '   ' + R.chrono(e.temps); messageT = 90; J.couleurMsg = '#ffffff'; }
}
function splitsHTML(id) {
  const fl = J.splits; if (!fl || !fl.length) return '';
  const rec = S.il[id] && S.il[id].splitsPrec, best = (S.il[id] && S.il[id].segs) || [];
  const pts = fl.concat([J.e.temps]);
  let h = '<details class="plier"><summary class="btn mini">⚑ ' + tr('Temps à chaque drapeau') + '</summary><div class="segs">', prec = 0;
  pts.forEach((t, k) => {
    if (t == null) return;
    const seg = t - prec, or = best[k] != null && seg <= best[k];
    const d = rec && rec[k] != null ? t - rec[k] : null;
    h += `<div class="${or ? 'or' : ''}"><small>${k < fl.length ? '⚑ ' + (k + 1) : '🏁'}</small><b>${R.chrono(seg)}</b>${d != null ? `<i class="${d <= 0 ? 'vert' : 'rouge'}">${R.ecart(d)}</i>` : ''}</div>`;
    prec = t;
  });
  return h + '</div></details>';
}
function majSegments(id, record) {
  const r = S.il[id]; if (!r || !J.splits) return;
  const pts = J.splits.concat([J.e.temps]);
  r.segs = r.segs || [];
  let prec = 0;
  pts.forEach((t, k) => { if (t == null) return; const seg = t - prec; if (r.segs[k] == null || seg < r.segs[k]) r.segs[k] = seg; prec = t; });
  r.splitsPrec = r.splits || null;
  if (record) r.splits = J.splits.slice();
}
/* ---------- Succès : 20 familles × 5 rangs (Bronze → Diamant), chaque rang rapporte des éclats ◆ ---------- */
const RANGS = [{ nom: 'Bronze', c: '#d08a4a', g: 1 }, { nom: 'Argent', c: '#c9d3df', g: 3 }, { nom: 'Or', c: '#ffd34d', g: 8 }, { nom: 'Platine', c: '#7de8ff', g: 20 }, { nom: 'Diamant', c: '#ff8ae0', g: 50 }];
if (!S.cumul) S.cumul = { sauts: 0, chg: 0, capas: 0, dist: 0, kills: 0, entr: 0, rejeux: 0 };
const nbIl = (f) => LISTE.filter(l => S.il[l.id] && f(S.il[l.id])).length;
const SUCCES = [
  { id: 'niveaux', nom: 'Explorateur', but: 'Niveaux finis', p: [1, 10, 24, 36, 48], v: () => nbIl(r => r.t != null) },
  { id: 'zones', nom: 'Conquérant', but: 'Zones entièrement finies', p: [1, 2, 4, 6, 8], v: () => NIV.ZONES.filter(z => z.niveaux.every(v => S.il[v.id] && S.il[v.id].t != null)).length },
  { id: 'or', nom: 'Doré', but: 'Médailles d’or (ou mieux)', p: [1, 5, 15, 30, 48], v: () => nbIl(r => (r.mMax || 0) >= 3) },
  { id: 'parfaits', nom: 'Robot humain', but: 'Temps Parfaits égalés', p: [1, 3, 10, 24, 48], v: () => nbIl(r => (r.mMax || 0) >= 4) },
  { id: 'eclats', nom: 'Chasseur d’éclats', but: 'Éclats ◆ trouvés dans les niveaux', p: [1, 10, 24, 36, 48], v: () => nbIl(r => r.eclat) },
  { id: 'propre', nom: 'Sans une égratignure', but: 'Niveaux finis sans tomber', p: [1, 5, 15, 30, 48], v: () => nbIl(r => r.sansChute) },
  { id: 'survie', nom: 'Survivant', but: 'Ennemis écrasés en une partie (record)', p: [10, 25, 50, 100, 200], v: () => (S.survie && (S.survie.killsMax || S.survie.kills)) || 0 },
  { id: 'massacre', nom: 'Écraseur', but: 'Ennemis écrasés en tout', p: [50, 250, 1000, 5000, 20000], v: () => S.cumul.kills },
  { id: 'infini', nom: 'Sans fin', but: 'Salles franchies en Infini (record)', p: [10, 20, 40, 70, 100], v: () => (S.infini[2] && S.infini[2].salles) || 0 },
  { id: 'semaine', nom: 'Régulier', but: 'Défis de la semaine finis', p: [1, 4, 12, 26, 52], v: () => Object.keys(S.defis).filter(k => String(k).startsWith('S')).length },
  { id: 'mois', nom: 'Fidèle', but: 'Défis du mois finis', p: [1, 3, 6, 12, 24], v: () => Object.keys(S.defis).filter(k => String(k).startsWith('M')).length },
  { id: 'temps', nom: 'Passionné', but: 'Heures de jeu', p: [1, 5, 20, 50, 100], v: () => Math.floor((S.tempsJeu || 0) / 216000) },
  { id: 'chutes', nom: 'Persévérant', but: 'Chutes', p: [100, 1000, 5000, 20000, 50000], v: () => S.morts },
  { id: 'sauts', nom: 'Bondissant', but: 'Sauts', p: [1000, 10000, 50000, 200000, 1000000], v: () => S.cumul.sauts },
  { id: 'formes', nom: 'Métamorphe', but: 'Changements de transformation', p: [500, 5000, 25000, 100000, 500000], v: () => S.cumul.chg },
  { id: 'capas', nom: 'Virtuose', but: 'Compétences utilisées', p: [50, 500, 5000, 25000, 100000], v: () => S.cumul.capas },
  { id: 'km', nom: 'Marathonien', but: 'Kilomètres parcourus', p: [1, 10, 50, 200, 1000], v: () => Math.floor(S.cumul.dist / M.T / 1000) },
  { id: 'look', nom: 'Coquet', but: 'Apparences possédées', p: [1, 10, 25, 50, 84], v: () => Object.keys(S.app.achats).length },
  { id: 'entr', nom: 'Travailleur', but: 'Parties d’entraînement finies', p: [1, 10, 50, 200, 500], v: () => S.cumul.entr },
  { id: 'rejeux', nom: 'Élève', but: 'Rejeux regardés', p: [1, 10, 50, 100, 300], v: () => S.cumul.rejeux }
];
function rangDe(x) { const v = x.v(); let r = 0; while (r < x.p.length && v >= x.p[r]) r++; return r; }
function nbFaits() { return LISTE.filter(l => S.il[l.id] && S.il[l.id].t != null).length; }
function nbRangs() { return SUCCES.reduce((t, x) => t + (S.succes[x.id] || 0), 0); }
function verifierSucces() {
  if (!S.succes || typeof Object.values(S.succes)[0] === 'number' && Object.values(S.succes)[0] > 10) S.succes = {};   // anciens succès : remplacés par les rangs
  const neufs = [];
  for (const x of SUCCES) {
    const r = rangDe(x), avant = S.succes[x.id] || 0;
    for (let k = avant; k < r; k++) { gagnerBonus(RANGS[k].g); neufs.push([x, k]); }
    if (r > avant) S.succes[x.id] = r;
  }
  if (neufs.length) sauver();
  return neufs.map(([x, k]) => `<div class="succes-neuf">🏆 ${tr(x.nom)} · <span style="color:${RANGS[k].c}">${tr(RANGS[k].nom)}</span> <span class="rose">+${RANGS[k].g} ◆</span></div>`).join('');
}
function succesEcran() {
  verifierSucces();
  const enCours = SUCCES.filter(x => (S.succes[x.id] || 0) < 5), finis = [];
  for (const x of SUCCES) for (let k = 0; k < (S.succes[x.id] || 0); k++) finis.push([x, k]);
  const carteS = (x) => {
    const r = S.succes[x.id] || 0, v = x.v(), vise = x.p[Math.min(4, r)], avant = r ? x.p[r - 1] : 0;
    const pc = r >= 5 ? 100 : Math.max(0, Math.min(100, (v - avant) / (vise - avant) * 100));
    return `<div class="sc-carte"><div class="sc-tete"><b>${tr(x.nom)}</b><span class="rangs">${RANGS.map((R2, k) => `<i style="background:${k < r ? R2.c : 'rgba(255,255,255,.12)'}"></i>`).join('')}</span></div>
      <div class="sc-but">${tr(x.but)} : <b>${v.toLocaleString()}</b> / ${vise.toLocaleString()}</div>
      <div class="barre"><div style="width:${pc}%;background:${RANGS[Math.min(4, r)].c}"></div></div>
      <div class="sc-but">${r < 5 ? tr('Prochain rang : {0}', tr(RANGS[r].nom)) + ' · +' + RANGS[r].g + ' ◆' : tr('Tous les rangs obtenus !')}</div></div>`;
  };
  montrer(`<h2>🏆 ${tr('Succès')} <span class="rose">${nbRangs()} / ${SUCCES.length * 5}</span></h2>
    <div class="sc-cols"><div><h3>${tr('En cours')}</h3><div class="sc-liste">${enCours.map(carteS).join('')}</div></div>
    <div class="sc-finis"><h3>✔ ${tr('Réussis')}</h3>${finis.length ? finis.map(([x, k]) => `<div class="sc-ok"><span style="color:${RANGS[k].c}">● ${tr(RANGS[k].nom)}</span> ${tr(x.nom)}</div>`).join('') : `<div class="note">${tr('Rien pour l’instant : à toi de jouer !')}</div>`}</div></div>
    <div class="menu ligne"><button class="btn" data-a="accueil" autofocus>${tr('Retour')}</button></div>`, 'large');
}
/* ---------- Pas de simulation ---------- */
function pas() {
  if (ecran !== 'jeu' || !J) return;
  let inp;
  if (J.mode === 'fantome') { inp = J.rejeu[J.ri++] || 0; if (J.ri > J.rejeu.length + 90) { finFantome(); return; } }
  else inp = lireEntrees();
  J.inp = inp;
  const avant = J.e.demarre, x0 = J.e.x, y0 = J.e.y;
  if (J.mode !== 'fantome') { if (S.reglages.invincible && J.e.mortT === 0) J.e.invT = Math.max(J.e.invT, 2); if (S.reglages.chargesInf) J.e.charges = M.K.charges; }
  M.pas(J.n, J.e, inp);
  compterStats(J.e, x0, y0);
  if (J.mode !== 'fantome') noterDrapeau();
  if (J.mode === 'editeur') return;
  if (J.mode === 'survie') majSurvie();
  const unevie = J.mode === 'infini' || J.mode === 'survie';
  if (unevie) {
    if (J.e.ev & M.EV.MORT) J.finT = 50;                      // une seule vie : la course s'arrête
    if (J.finT > 0) { J.e.mortT = Math.max(J.e.mortT, 2); if (--J.finT === 0) { if (J.mode === 'infini') finInfini(); else if (J.mode === 'survie') finSurvie(); else finDefi(); return; } }
  }
  if (J.monde) avancerMonde();
  if (J.mode === 'defi' && J.limite && J.e.temps >= J.limite) { finDefi(); return; }
  if (J.e.demarre && J.mode !== 'fantome' && J.mode !== 'infini') J.entrees.push(inp);
  if (J.e.demarre && J.mode !== 'fantome' && !J.e.fini) S.tempsJeu = (S.tempsJeu || 0) + 1;
  if (J.fantome && J.e.demarre) { const f = J.fantome; M.pas(f.n, f.e, f.ent[f.i++] || 0); }
  if (!avant && J.e.demarre) recadrer = false;
  const ev = J.e.ev;
  if (ev) { R.evenements(J.e, J.n); SON.evenements(ev, J.e.phase); if (ev & M.EV.ECHEC) echec = 20; if (ev & M.EV.MORT) { S.morts++; vibrer(0.6, 160); } if (ev & M.EV.BOUM) vibrer(0.8, 120); if (ev & (M.EV.REBOND | M.EV.BOND)) vibrer(0.25, 60); }
  if (echec > 0) echec--;
  if (messageT > 0) messageT--;
  // mort avant le premier drapeau : on repart vraiment de zéro, chrono compris
  if (J.e.mortT === 1 && !unevie) {
    if (!J.e.cp && J.mode === 'niveau' && !J.entrainement) { lancerNiveau(J.idx); message = 'Retour au départ : chrono remis à zéro'; messageT = 80; return; }
    if (!J.e.cp && J.mode === 'defi') { lancerDefiLong(J.periode, 'Retour au départ : chrono remis à zéro'); return; }
    if (J.entrainement) J.segT = J.e.temps + 20;
  }
  if (J.e.fini) {
    if (J.mode === 'course' && J.cat === 'cent' && J.n.aEclat && !J.e.eclat) {
      J.e.fini = false; message = 'Il te manque l’éclat ◆ de ce niveau !'; messageT = 60;
    } else terminer();
  }
}

function terminer() {
  if (J.mode === 'fantome') { finFantome(); return; }
  if (J.mode === 'defi') { finDefi(); return; }
  if (J.mode === 'special') { finSpecial(); return; }
  if (J.mode === 'tuto') { finTuto(); return; }
  if (J.mode === 'perso') { finPerso(); return; }
  const id = J.L.id, t = J.e.temps;
  if (J.mode === 'niveau' && J.entrainement) {
    ecran = 'fin'; SON.attenuer(true);
    S.cumul.entr++;
    const neufs = verifierSucces();
    montrer(`<div class="fin"><div class="nomniv">🎯 ${tr('Entraînement')} · ${id} ${tr(J.L.def.nom)}</div><div class="temps">${R.chrono(t - (J.segT || 0))}</div>
      <div class="lignes"><div class="gris">${tr('Depuis le drapeau {0} · pas de record en entraînement', J.drapeauDepart || 0)}</div>${neufs}</div>${statsHTML()}
      <div class="menu ligne"><button class="btn" data-a="recommencer" autofocus>${tr('Recommencer')}</button><button class="btn" data-a="jouer" data-i="${J.idx}">${tr('Jouer pour de vrai')}</button><button class="btn" data-a="niveaux">${tr('Niveaux')}</button></div></div>`, 'fin');
    return;
  }
  if (J.mode === 'niveau' && assiste()) {                     // assistance : on montre le temps, sans rien enregistrer
    ecran = 'fin'; SON.attenuer(true);
    montrer(`<div class="fin"><div class="nomniv">♿ ${tr('Assistance')} · ${id} ${tr(J.L.def.nom)}</div><div class="temps">${R.chrono(t)}</div>
      <div class="lignes"><div class="gris">${tr('Avec une assistance ou une vitesse réduite, tes temps ne comptent pas pour les records, les médailles ni les succès.')}</div></div>${statsHTML()}
      <div class="menu ligne"><button class="btn" data-a="rejouer" autofocus>${tr('Recommencer')}</button>${J.idx + 1 < LISTE.length ? `<button class="btn" data-a="jouer" data-i="${J.idx + 1}">${tr('Suivant')}</button>` : ''}<button class="btn" data-a="niveaux">${tr('Niveaux')}</button></div></div>`, 'fin');
    return;
  }
  if (J.mode === 'niveau') {
    const ancien = S.il[id] || {};
    const record = ancien.t == null || t < ancien.t;
    const avant = ancien.t;
    if (record) S.il[id] = Object.assign(ancien, { t, f: M.compresser(J.entrees), morts: J.e.morts });
    const avantE = eclatsGagnes();
    if (J.e.eclat) S.il[id].eclat = true;
    S.il[id].mMax = Math.max(S.il[id].mMax || 0, medaille(id, t));
    S.il[id].fois = (S.il[id].fois || 0) + 1;
    J.gainE = eclatsGagnes() - avantE;
    majSegments(id, record);
    if (J.e.morts === 0) S.il[id].sansChute = true;
    J.succesNeufs = verifierSucces();
    sauver();
    ecran = 'fin';
    SON.attenuer(true);
    finNiveau(t, avant, record);
  } else {
    J.course.splits.push(t);
    J.course.total += t;
    const suivant = J.idx + 1;
    if (suivant >= LISTE.length) { finCourse(); return; }
    const eclats = J.course.eclats || 0;
    J.course.eclats = eclats + (J.e.eclat ? 1 : 0);
    const c = charger(suivant, { demarre: true });
    Object.assign(J, c, { idx: suivant });
    SON.jouerMusique(LISTE[suivant].zi + 1);
  }
}

/* ---------- Médailles ---------- */
const MEDAILLES = [null, { nom: 'Bronze', c: '#d08a4a', k: 2.2 }, { nom: 'Argent', c: '#c9d3df', k: 1.5 }, { nom: 'Or', c: '#ffd34d', k: 1.2 }, { nom: 'Parfait', c: '#ff6ad5', k: 1 }];
function seuil(id, m) { const p = PARF[id]; return p && p.t ? Math.floor(p.t * MEDAILLES[m].k) : null; }
function medaille(id, t) {
  if (t == null || !PARF[id]) return 0;
  for (let m = 4; m >= 1; m--) if (t <= seuil(id, m)) return m;
  return 0;
}
function badge(m) { return m ? `<span class="med" style="--c:${MEDAILLES[m].c}">${tr(MEDAILLES[m].nom)}</span>` : ''; }

/* ---------- Boucle ---------- */
let derniere = 0, acc = 0;
// le jeu tourne 21 % plus lentement que le temps réel (les chronos comptent le temps du jeu)
const VITESSE_JEU = 0.79;
function boucle(t) {
  requestAnimationFrame(boucle);
  const dt = Math.min(0.1, (t - (derniere || t)) / 1000);
  derniere = t;
  acc += dt * VITESSE_JEU * (+S.reglages.vitesse || 1) * (J && J.mode === 'fantome' ? (J.pauseRejeu ? 0 : J.vitesse || 1) : 1);
  barreRejeu();
  let k = 0;
  while (acc >= 1 / 60 && k < 6) { if (J) J.ePrec = M.cloner(J.e); pas(); acc -= 1 / 60; k++; }
  if (k === 6) acc = 0;
  dessiner(dt);
}
function dessiner(dt) {
  if (!J) { fondMenu(dt); return; }
  if (J.mode === 'editeur' && ED) {
    const pal = PALETTE[ED.pal];
    J.e.x = ED.cx * M.T; J.e.y = ED.cy * M.T;
    R.dessiner(J.e, null, { recadrer: false, curseur: [ED.cx, ED.cy, pal[0]], texteCentre: '🛠 ' + pal[1], sousChrono: (ED.pal + 1) + ' / ' + PALETTE.length,
      titre: ED.nom, lignes: [{ t: tr('Flèches : bouger (Maj : ×5)') }, { t: tr('Espace : poser · Retour : effacer') }, { t: tr('Q / E : choisir la case') }, { t: tr('1 2 3 : transformations · X : agrandir') }, { t: tr('T : tester · F : enregistrer') }, { t: tr('C : copier le code · Échap : quitter') },
        { t: ED.etats.map((p, k) => (k + 1) + ' ' + tr(M.NOMS_PHASES[p])).join('   '), c: '#ffe94a' }], droite: [], touches: [], message: messageT > 0 ? message : null }, dt);
    if (messageT > 0) messageT--;
    return;
  }
  // au ralenti, on dessine entre deux images du moteur : le mouvement reste fluide (pas de saccade ni de tremblement)
  let e = J.e;
  if (J.ePrec && J.e.mortT === 0 && J.ePrec.mortT === 0) {                 // toujours interpolé : fluide malgré le ralenti
    const a = Math.max(0, Math.min(1, acc * 60)), p = J.ePrec;
    if (Math.abs(p.x - e.x) < 40 && Math.abs(p.y - e.y) < 40) { e = M.cloner(J.e); e.x = p.x + (J.e.x - p.x) * a; e.y = p.y + (J.e.y - p.y) * a; }
  }
  const eVrai = J.e, id = J.L.id, il = S.il[id], p = PARF[id];
  const hud = { nomSaut: tr('saut'), tactile: tactileVoulu(), titre: J.L.id + '  ' + tr(J.L.def.nom), nomsPhases: M.NOMS_PHASES.map(n => tr(n)), touches: [0, 1, 2].map(touchePhase), nomsCapas: J.n && J.n.capacites ? M.NOMS_PHASES.map((_, p) => NIV.CAPA[p] ? tr(NIV.CAPA[p][0]) : '') : null, echec, recadrer, tremble: S.reglages.tremble, lignes: [], droite: [] };
  if (J.mode === 'defi') {
    const ty = J.type, b = S.defis[J.cle] && S.defis[J.cle].type === ty.id ? S.defis[J.cle] : null;
    hud.titre = J.periode && J.periode !== 'jour' ? tr(ty.nom) : tr('Défi du jour · {0}', tr(ty.nom));
    if (J.vert) { const fait = Math.max(0, Math.round((J.vert.type === 'bas' ? e.y - J.y0 : J.y0 - e.y) / M.T)); hud.sousChrono = Math.min(J.vert.m, fait) + ' m / ' + J.vert.m + ' m'; hud.titre += ' · ' + tr(J.vert.nom); }
    if (J.limite) { hud.chrono = Math.max(0, J.limite - e.temps); if (hud.chrono < 600) hud.couleurChrono = '#ff9a7a'; }
    else hud.chrono = e.temps;
    if (ty.score === 'salles') hud.sousChrono = tr('Salle {0}', J.salle + 1);
    if (ty.score === 'pieces') hud.sousChrono = tr('Pièces {0} / {1}', e.pieces.length, J.pieces);
    if (b) { hud.lignes.push({ t: tr(J.periode === 'jour' ? 'Meilleur du jour  {0}' : 'Ton meilleur  {0}', texteScore(ty, b)), c: '#ff9ae6' }); if (ty.score === 'temps' && e.temps > b.t) hud.couleurChrono = '#ffb0b0'; }
    hud.lignes.push({ t: tr(ty.but), c: '#bbb' });
    if (J.finT > 0) { hud.message = tr('Fin : {0}', tr('Salles : {0}', J.salle)); hud.messageC = '#ff9ae6'; }
  } else if (J.mode === 'infini') {
    const rec = S.infini[J.imode];
    hud.chrono = e.temps;
    hud.titre = tr('Infini');
    hud.sousChrono = tr('Salle {0}', J.salle + 1) + (rec ? '   ·   ' + tr('record : {0} salles', rec.salles) : '');
    hud.sousCouleur = rec && J.salle > rec.salles ? '#7dff9a' : '#ddd';
    hud.lignes.push({ t: tr('Difficulté {0} %', Math.round(J.monde.difficulte(J.salle) / 1.2 * 100)), c: '#aaa' });
    hud.lignes.push({ t: tr('Une seule vie'), c: '#ff8a8a' });
    if (J.finT > 0) { hud.message = tr('Salles franchies : {0}', J.salle); hud.messageC = '#ff9ae6'; }
  } else if (J.mode === 'niveau' && J.entrainement) {
    hud.chrono = Math.max(0, e.temps - (J.segT || 0));
    hud.titre = '🎯 ' + tr('Entraînement') + '  ·  ' + hud.titre;
    hud.lignes.push({ t: tr('Pause : choisir un drapeau · Page préc. / suiv. : drapeau précédent / suivant'), c: '#ffd84a' });
  } else if (J.mode === 'special') {
    hud.chrono = e.temps;
    hud.titre = tr(J.sp.nom);
    const fait = Math.max(0, Math.round((J.sp.sens === 'bas' ? e.y - J.y0 : J.y0 - e.y) / M.T));
    hud.sousChrono = Math.min(J.sp.m, fait) + ' m / ' + J.sp.m + ' m';
    if (S.speciaux[J.sp.id]) hud.lignes.push({ t: tr('Ton meilleur  {0}', R.chrono(S.speciaux[J.sp.id].t)), c: '#ff9ae6' });
  } else if (J.mode === 'survie') {
    hud.chrono = e.temps;
    hud.texteCentre = J.kills + ' ✖';                              // le score : les ennemis écrasés
    hud.titre = tr('Survivant') + ' · ' + tr(J.arene.nom);
    hud.sousChrono = S.survie ? tr('record : {0}', S.survie.kills + ' ✖') : tr('Ennemis écrasés');
    hud.prochain = J.prochain && { x: J.prochain.x, y: J.prochain.y, r: ENNEMIS[J.prochain.type].r, t: J.spawnT };
    hud.lignes.push({ t: tr('Saute-leur sur la tête !'), c: '#ffd84a' });
    hud.monstres = J.monstres; hud.balles = J.balles;
    if (J.finT > 0) { hud.message = tr('Ennemis écrasés : {0}', J.kills); hud.messageC = '#ff9ae6'; }
  } else if (J.mode === 'course') {
    hud.chrono = J.course.total + e.temps;
    hud.titre = tr(J.cat === 'cent' ? 'Course 100 %' : 'Course complète') + '  ·  ' + hud.titre;
    const pb = S.course[J.cat];
    if (pb && pb.splits) {
      let cumul = 0; for (let i = 0; i < J.idx; i++) cumul += pb.splits[i];
      const ec = J.course.total - cumul;
      if (J.idx > 0) { hud.sousChrono = tr('{0} sur ton record', R.ecart(ec)); hud.sousCouleur = ec <= 0 ? '#7dff9a' : '#ff7a7a'; }
    }
    for (let i = Math.max(0, J.idx - 2); i <= Math.min(LISTE.length - 1, J.idx + 3); i++) {
      const fait = i < J.idx;
      const tps = fait ? J.course.splits[i] : (i === J.idx ? e.temps : null);
      hud.droite.push({ t: LISTE[i].id + '  ' + (tps != null ? R.chrono(tps) : '—'), c: i === J.idx ? '#fff' : (fait ? '#9a9' : '#666'), gras: i === J.idx });
    }
    hud.lignes.push({ t: tr('Niveau {0} / {1}', J.idx + 1, LISTE.length) });
  } else if (J.mode === 'fantome') {
    hud.chrono = e.temps;
    hud.lignes.push({ t: tr('▶ Rejeu : {0}', tr(J.quoi)), c: '#ff6ad5' });
    hud.attente = tr('Échap pour quitter');
    hud.entrees = J.inp || 0;
  } else {
    hud.chrono = e.temps;
    if (il && il.t != null) hud.lignes.push({ t: tr('Record  {0}', R.chrono(il.t)) });
    if (p && p.t) hud.lignes.push({ t: tr('Parfait  {0}', R.chrono(p.t)), c: MEDAILLES[4].c });
    if (p && p.t) {
      const m = medaille(id, il && il.t);
      const vise = Math.min(4, m + 1);
      if (m < 4) hud.lignes.push({ t: tr(MEDAILLES[vise].nom) + '  ' + R.chrono(seuil(id, vise)), c: MEDAILLES[vise].c });
      else hud.lignes.push({ t: tr('Parfait atteint !'), c: '#7dff9a' });
      if (il && il.t != null && e.temps > il.t) hud.couleurChrono = '#ffb0b0';
    }
    if (J.fantome) hud.lignes.push({ t: tr('Fantôme : {0}', tr(S.reglages.fantome === 'parfait' ? 'Parfait' : 'record')), c: '#888' });
  }
  if (!e.demarre) hud.attente = tr('Bouge pour lancer le chrono');
  if (S.reglages.entrees && J.mode !== 'fantome') hud.entrees = J.inp || 0;
  // panneau proche
  const cxp = (e.x + M.W / 2) / M.T, cyp = (e.y + M.H / 2) / M.T;
  for (const pn of J.n.panneaux) if (Math.abs(pn.x + 0.5 - cxp) < 3 && Math.abs(pn.y + 0.5 - cyp) < 2.5) { { const m = /^\[([1-4])\] (.*)$/.exec(pn.texte); const pe = m ? J.n.emplacements[+m[1] - 1] : -1; hud.panneau = m ? touchePhase(+m[1] - 1) + ' · ' + tr(m[2]) + (NIV.CAPA[pe] && J.n.capacites ? '   ↻ ' + tr(NIV.CAPA[pe][0]) + ' : ' + tr(NIV.CAPA[pe][1]) : '') : tr(pn.texte); } break; }
  if (assiste() && J.mode !== 'fantome') hud.lignes.push({ t: '♿ ' + tr('Assistance'), c: '#7dd3ff' });
  if (messageT > 0) { hud.message = tr(message); hud.messageC = J.couleurMsg || '#ff9ae6'; if (messageT === 1) J.couleurMsg = null; }
  R.dessiner(e, J.fantome ? J.fantome.e : null, hud, dt);
}

/* ---------- Fond animé des menus ---------- */
let menuNiv = null, menuE = null, menuT = 0;
// fond du menu : un lent travelling sur un niveau tranquille, sans personnage, sans secousse ni éclair
function fondMenu(dt) {
  menuT += dt;
  if (!menuNiv) {
    const L = LISTE[Math.floor(Math.random() * 18)];
    menuNiv = { L, n: M.charger(L.def) };
    menuE = M.nouvelEtat(menuNiv.n);
    menuE.mortT = 1;                                   // le personnage n'est pas dessiné
    menuE.x = 20 * M.T; menuE.y = 15 * M.T;
    R.preparer(menuNiv.n, L.zone.theme);
  }
  menuE.x += 22 * dt;                                  // environ une case et demie par seconde
  menuE.vx = 0; menuE.vy = 0;
  if (menuE.x > (menuNiv.n.w - 30) * M.T) { menuNiv = null; return; }
  R.dessiner(menuE, null, null, dt);
}

/* ---------- Interface (menus en HTML) ---------- */
const ui = document.getElementById('ui');
function montrer(html, classe) {
  ui.className = 'visible ' + (classe || '');
  ui.innerHTML = '<div class="cadre">' + html + '</div>';
  ajuster();
  const b = ui.querySelector('[autofocus]') || ui.querySelector('.btn:not([disabled])');
  if (b) b.focus();
}
// l'écran tient toujours dans la fenêtre (aucune barre de défilement) : on le réduit si besoin
function ajuster() {
  const c = ui.querySelector('.cadre');
  if (!c) return;
  c.style.transform = ''; c.style.marginBottom = '';
  const dispoH = ui.clientHeight - 32, dispoW = ui.clientWidth - 24;
  const h = c.scrollHeight, w = c.scrollWidth;
  const k = Math.min(1, dispoH / h, dispoW / w);
  if (k < 1) { c.style.transform = `scale(${k})`; c.style.marginBottom = (-(1 - k) * h) + 'px'; }
}
addEventListener('resize', ajuster);
function cacherUI() { ui.className = ''; ui.innerHTML = ''; SON.attenuer(false); }

function zoneDebloquee(zi) {
  if (zi === 0) return true;
  return NIV.ZONES[zi - 1].niveaux.every(nv => S.il[nv.id] && S.il[nv.id].t != null);
}
function tousFaits() { return LISTE.every(l => S.il[l.id] && S.il[l.id].t != null); }
function sommeMeilleurs() {
  let s = 0; for (const l of LISTE) { const r = S.il[l.id]; if (!r || r.t == null) return null; s += r.t; }
  return s;
}
function sommeParfaits() { let s = 0; for (const l of LISTE) { if (!PARF[l.id]) return null; s += PARF[l.id].t; } return s; }

function accueil() {
  J = null; ecran = 'menu'; SON.jouerMusique(0);
  const faits = LISTE.filter(l => S.il[l.id] && S.il[l.id].t != null).length;
  const parfaits = LISTE.filter(l => medaille(l.id, S.il[l.id] && S.il[l.id].t) === 4).length;
  const nbSucces = nbRangs();
  const carte = (a, titre, sous, attr) => `<button class="btn carte" data-a="${a}" ${attr || ''}><b>${titre}</b><small>${sous}</small></button>`;
  montrer(`
  <div class="titre"><h1>SHIFTRUN</h1><p>${tr('Un jeu fait pour le speedrun : change de forme pour aller plus vite.')}</p></div>
  <div class="grille">
    ${S.tutoVu ? '' : carte('tuto', '🎓 ' + tr('Didacticiel'), tr('5 minutes pour apprendre à jouer, une idée à la fois'), 'autofocus')}
    ${carte('niveaux', '▶ ' + tr('Niveaux'), tr('Niveaux finis : {0} / {1}', faits, LISTE.length) + ' · ' + tr('Parfaits : {0}', parfaits) + ' · ' + tr('entraînement'), 'autofocus')}
    ${carte('infini', '∞ ' + tr('Infini'), S.infini[2] ? tr('record : {0} salles', S.infini[2].salles) : tr('salles générées sans fin, de plus en plus dures, une seule vie'))}
    ${carte('survie', '⚔ ' + tr('Survivant'), S.survie ? tr('record : {0}', S.survie.kills + ' ✖ ' + tr('ennemis écrasés')) : tr('des ennemis de plus en plus nombreux : saute-leur sur la tête'))}
    ${carte('defi-semaine', '📅 ' + tr('Défi de la semaine') + ' · ' + tr(varianteDefi('semaine').nom), S.defis[cleSemaine()] ? tr('ton meilleur : {0}', R.chrono(S.defis[cleSemaine()].t)) : tr(varianteDefi('semaine').but))}
    ${carte('defi-mois', '🗓 ' + tr('Défi du mois') + ' · ' + tr(varianteDefi('mois').nom), S.defis[cleMois()] ? tr('ton meilleur : {0}', R.chrono(S.defis[cleMois()].t)) : tr(varianteDefi('mois').but))}
    ${carte('editeur', '🛠 ' + tr('Éditeur de niveaux'), tr('crée, teste et partage tes niveaux par un code'))}
    ${carte('succes', '🏆 ' + tr('Succès'), tr('{0} / {1} rangs', nbSucces, SUCCES.length * 5))}
    ${carte('boutique', '🛍 ' + tr('Boutique'), '<span class="rose">' + eclatsDispo() + ' ◆</span>')}
    ${carte('aide', '❓ ' + tr('Comment jouer'), tr('les états, les pièges, les touches'))}
    ${carte('reglages', '⚙ ' + tr('Réglages'), tr('langue, son, touches'))}
  </div>
`, 'accueil');
}

let boutiqueCat = 'contour';
function boutique() {
  J = null; ecran = 'menu';
  const total = Object.values(CATS).reduce((t, c) => t + c.liste.length, 0);
  const eus = Object.keys(CATS).reduce((t, k) => t + CATS[k].liste.filter(x => possede(k, x[0])).length, 0);
  const C = CATS[boutiqueCat];
  let h = `<h2>🛍 ${tr('Boutique')} <span class="rose">${eclatsDispo()} ◆</span></h2>
  <p class="note">${tr('Une apparence par catégorie, toutes portées en même temps. Possédées : {0} / {1}. Les éclats ◆ se gagnent dans tous les modes.', eus, total)}</p>
  <div class="onglets">${Object.keys(CATS).map(k => `<button class="btn mini ${k === boutiqueCat ? 'choisi' : ''}" data-a="cat" data-c="${k}">${CATS[k].icone} ${tr(CATS[k].nom)}</button>`).join('')}</div>
  <div class="skins">`;
  C.liste.forEach(([id, nom], k) => {
    const a = possede(boutiqueCat, id), porte = S.app.equipe[boutiqueCat] === id, prix = PRIX[k];
    h += `<button class="btn skin ${porte ? 'porte' : ''}" data-a="app" data-c="${boutiqueCat}" data-s="${id}" ${!a && eclatsDispo() < prix ? 'disabled' : ''}>
      <canvas class="apercu" width="64" height="64" data-c="${boutiqueCat}" data-s="${id}"></canvas>
      <b>${tr(nom)}</b><small>${porte ? tr(k === 0 ? 'porté' : 'porté · cliquer pour enlever') : a ? tr('à toi') : prix + ' ◆'}</small></button>`;
  });
  h += `</div><div class="menu ligne"><button class="btn" data-a="accueil" autofocus>${tr('Retour')}</button></div>`;
  montrer(h, 'large');
  // aperçus : le personnage dessiné avec cet objet (et le reste de ce qui est porté)
  ui.querySelectorAll('canvas.apercu').forEach(cv => {
    const eq = Object.assign({}, S.app.equipe); eq[cv.dataset.c] = cv.dataset.s;
    R.apercu(cv, eq);
  });
}
function choisirApp(cat, id) {
  const k = CATS[cat].liste.findIndex(x => x[0] === id); if (k < 0) return;
  if (!possede(cat, id)) {
    if (eclatsDispo() < PRIX[k]) return;
    S.app.depense += PRIX[k]; S.app.achats[cat + ':' + id] = 1;
  }
  S.app.equipe[cat] = S.app.equipe[cat] === id ? CATS[cat].liste[0][0] : id;      // re-cliquer : on l'enlève
  appliquerApparence(); sauver(); boutique();
}
let nivZone = -1;
function niveaux() {
  if (nivZone < 0) { nivZone = 0; NIV.ZONES.forEach((z, zi) => { if (zoneDebloquee(zi) && z.niveaux.some(v => !(S.il[v.id] && S.il[v.id].t != null)) && nivZone === 0 && zi > 0) nivZone = zi; }); }
  let h = '<h2>' + tr('Niveaux') + '</h2><div class="onglets"><button class="btn mini ' + (nivEntrainement ? '' : 'choisi') + '" data-a="mode-normal">▶ ' + tr('Partie classique') + '</button><button class="btn mini ' + (nivEntrainement ? 'choisi' : '') + '" data-a="mode-entrainement">🎯 ' + tr('Entraînement') + '</button><button class="btn mini" data-a="tuto">🎓 ' + tr('Didacticiel') + '</button></div>'
    + (nivEntrainement ? '<p class="note">' + tr('Choisis un niveau, puis en pause choisis le drapeau d’où repartir. Rien n’est compté.') + '</p>' : '') + '<div class="onglets">' + NIV.ZONES.map((z, i) => {
    const nF = z.niveaux.filter(v => S.il[v.id] && S.il[v.id].t != null).length;
    return `<button class="btn mini ${i === nivZone ? 'choisi' : ''}" data-a="niv-zone" data-i="${i}">${zoneDebloquee(i) ? '' : '🔒 '}${i + 1}. ${tr(z.nom)} <small>${nF}/${z.niveaux.length}</small></button>`;
  }).join('') + '</div><div class="zones une">';
  NIV.ZONES.forEach((z, zi) => {
    if (zi !== nivZone) return;
    const ok = zoneDebloquee(zi), th = R.THEMES[z.theme];
    const nFaits = z.niveaux.filter(v => S.il[v.id] && S.il[v.id].t != null).length;
    h += `<div class="zone ${ok ? '' : 'ferme'} ${nFaits === z.niveaux.length ? 'complete' : ''}" style="--a:${th.accent};--f:${th.ciel[0]}"><div class="znom">${zi + 1}. ${tr(z.nom)} <em>${nFaits} / ${z.niveaux.length} ✓</em></div>`;
    z.niveaux.forEach(nv => {
      const r = S.il[nv.id], m = medaille(nv.id, r && r.t), aE = M.charger(nv).aEclat;
      const fait = r && r.t != null;
      h += `<div class="nivw"><button class="btn niv ${fait ? 'fait' : 'afaire'}" data-a="${nivEntrainement ? 'entrainer' : 'jouer'}" data-i="${parId[nv.id]}" ${ok ? '' : 'disabled'}>
        <span class="etat">${fait ? '✓' : (ok ? '●' : '🔒')}</span><b>${nv.id}</b> ${tr(nv.nom)}<small>${r && r.t != null ? R.chrono(r.t) : '—'} ${badge(m)} <span class="parf">${tr('Parfait')} ${PARF[nv.id] ? R.chrono(PARF[nv.id].t) : '—'}</span> <span class="etn">${nv.etats.map(p => `<i style="color:${R.COUL_PHASE[p]}">${tr(M.NOMS_PHASES[p])}</i>`).join(' ')}</span> ${aE ? `<span class="ecl ${r && r.eclat ? 'oui' : ''}">◆</span>` : ''}</small></button>${PARF[nv.id] ? `<button class="btn mini voirp" data-a="voir-parfait" data-i="${parId[nv.id]}" title="${tr('▶ Voir le Parfait')}">▶</button>` : ''}</div>`;
    });
    if (!ok) h += '<div class="verrou">' + tr('Finis la zone précédente') + '</div>';
    h += '</div>';
  });
  h += '</div><div class="menu ligne"><button class="btn" data-a="accueil">' + tr('Retour') + '</button></div>';
  montrer(h, 'large');
}

let recZone = 0;
function records() {
  const zr = recZone;
  let h = '<h2>' + tr('Records') + '</h2><div class="onglets">' + NIV.ZONES.map((z, i) => `<button class="btn mini ${i === zr ? 'choisi' : ''}" data-a="rec-zone" data-i="${i}">${i + 1}. ${tr(z.nom)}</button>`).join('') + '</div>' +
    '<table class="rec"><tr><th>' + tr('Niveau') + '</th><th>' + tr('Record') + '</th><th>' + tr('Médaille') + '</th><th>' + tr('Parfait') + '</th><th></th></tr>';
  for (const l of LISTE.filter(v => v.zi === zr)) {
    const r = S.il[l.id], p = PARF[l.id];
    h += `<tr><td><b>${l.id}</b> ${tr(l.def.nom)}</td><td>${r && r.t != null ? R.chrono(r.t) : '—'}</td><td>${badge(medaille(l.id, r && r.t))}</td>
      <td>${p ? R.chrono(p.t) : '—'}</td><td>${p ? `<button class="btn mini" data-a="voir-parfait" data-i="${parId[l.id]}">${tr('▶ Parfait')}</button>` : ''}
      ${p && p.fe ? `<button class="btn mini" data-a="voir-parfait-eclat" data-i="${parId[l.id]}">▶ ◆</button>` : ''}
      ${r && r.f ? `<button class="btn mini" data-a="voir-record" data-i="${parId[l.id]}">${tr('▶ Mien')}</button>` : ''}</td></tr>`;
  }
  const sb = sommeMeilleurs(), sp = sommeParfaits();
  h += `</table><div class="totaux"><div>${tr('Somme de tes records')} <b>${sb != null ? R.chrono(sb) : '—'}</b></div><div>${tr('Somme des Parfaits')} <b>${sp != null ? R.chrono(sp) : '—'}</b></div>
    <div>${tr('Infini')} <b>${S.infini[2] ? tr('Salles : {0}', S.infini[2].salles) : '—'}</b></div><div>${tr('Survivant')} <b>${S.survie ? R.chrono(S.survie.t) : '—'}</b></div>
</div>
    <p class="note">${tr('Le temps « Parfait » est celui d’un robot qui a cherché le parcours le plus rapide sur le vrai moteur du jeu. Bronze : ×2,2 · Argent : ×1,5 · Or : ×1,2 · Parfait : l’égaler.')}</p>
    <div class="menu ligne"><button class="btn" data-a="accueil">${tr('Retour')}</button></div>`;
  montrer(h, 'large');
}

// « Comment jouer » en sous-pages : jamais de texte trop petit, une idée par page
let aidePage = 0;
function aide() {
  const k = (a) => S.touches[a].map(nomTouche).join(' / ');
  const PAGES = [
    ['🏁 ' + tr('Le but'), `<p>${tr('Va le plus vite possible jusqu’au portail. Le chrono démarre au premier geste et se compte à l’image près. Tomber ou toucher des pics te renvoie au dernier drapeau ; avant le premier drapeau, tout recommence à zéro.')}</p>
      <p>${tr('Chaque niveau cache un éclat ◆ très difficile à atteindre. Les éclats achètent des apparences dans la boutique.')}</p>`],
    ['🔄 ' + tr('Transformations'), `<p>${tr('Chaque niveau te donne 3 états parmi ces 10, sur les touches {0} : les panneaux du début disent lesquels. Réappuie sur la touche de l’état où tu es pour utiliser sa compétence (elle coûte une charge). Une barrière de couleur ne laisse passer que l’état de sa couleur.', [k('solide'), k('liquide'), k('gaz')].map(x => x.split(' / ')[0]).join(' '))}</p>
      <p>${tr('Changer d’état coûte une charge (2 au maximum, ◆ bleus en bas). Elles reviennent en touchant le sol ou un cristal.')}</p>`],
    ['① ' + tr('États 1 à 5'), `<div class="etats">${[0, 1, 2, 3, 4].map(p => etatAide(p)).join('')}</div>`],
    ['② ' + tr('États 6 à 10'), `<div class="etats">${[5, 6, 7, 8, 9].map(p => etatAide(p)).join('')}</div>`],
    ['⚠ ' + tr('Pièges et objets'), `<p>${tr('Pièges : flèches tirées à intervalles réguliers, sols cassants, sols rebondissants, boutons qui ouvrent des portes. Chaque niveau cache un éclat ◆ très difficile à atteindre.')}</p>
      <p>${tr('Orbe jaune : appuie sur saut en la touchant pour sauter en plein air. Tremplin vert : il te projette sur le côté.')}</p>
      <p>${tr('Interrupteur : les blocs rouges et bleus s’échangent. Flèche verte : sauts plus hauts un moment, flèche orange : sauts plus courts. Évite les ennemis hérissés.')}</p>
      <p>${tr('Cristal barré : cet état est interdit pendant quelques secondes. Il faut passer autrement.')}</p>
      <p>${tr('Plateformes mobiles : saute dessus, elles te portent. Champignon : il te renvoie au loin.')} ${tr('Lasers : ils s’allument par moments, un clignotement prévient juste avant. Scies : elles balaient le passage.')}</p>`],
    ['🎮 ' + tr('Touches'), `<p>${tr('Clavier : {0} recommencer, {1} pause.', k('recommencer'), k('pause'))}</p>
      <p>${tr('Manette')} : ${['saut', 'solide', 'liquide', 'gaz', 'recommencer', 'pause'].map(a => tr(NOMS_ACTIONS[a]) + ' = ' + (NOMS_BOUTONS[S.manette[a]] || '#' + S.manette[a])).join(' · ')}</p>
      <p>${tr('Tout se règle dans les Réglages. Le jeu se joue entièrement au clavier : flèches pour choisir, Entrée pour valider, Échap pour revenir.')}</p>`]
  ];
  aidePage = Math.max(0, Math.min(PAGES.length - 1, aidePage));
  montrer(`<h2>❓ ${tr('Comment jouer')}</h2>
    <div class="onglets">${PAGES.map((p, i) => `<button class="btn mini ${i === aidePage ? 'choisi' : ''}" data-a="aide-page" data-i="${i}" ${i === aidePage ? 'autofocus' : ''}>${p[0]}</button>`).join('')}</div>
    <div class="aide">${PAGES[aidePage][1]}</div>
    <div class="menu ligne">${aidePage > 0 ? `<button class="btn" data-a="aide-page" data-i="${aidePage - 1}">← ${tr('Précédent')}</button>` : ''}${aidePage < PAGES.length - 1 ? `<button class="btn" data-a="aide-page" data-i="${aidePage + 1}">${tr('Suivant')} →</button>` : ''}<button class="btn" data-a="accueil">${tr('Retour')}</button></div>`, 'large');
}
function etatAide(p) {
  return `<div style="--c:${R.COUL_PHASE[p]}"><b>${tr(M.NOMS_PHASES[p])}</b>${tr(NIV.DESC[p]).replace(/^[^:]*: /, '')}<br><i>↻ ${tr(NIV.CAPA[p][0])} : ${tr(NIV.CAPA[p][1])}</i></div>`;
}

let attenteTouche = null;
let reglPage = 0;
function reglages() {
  const r = S.reglages;
  const PAGES = ['⚙ ' + tr('Général'), '♿ ' + tr('Accessibilité'), '⌨ ' + tr('Clavier'), '🎮 ' + tr('Manette')];
  let h = `<h2>${tr('Réglages')}</h2><div class="onglets">${PAGES.map((p, i) => `<button class="btn mini ${i === reglPage ? 'choisi' : ''}" data-a="regl-page" data-i="${i}" ${i === reglPage ? 'autofocus' : ''}>${p}</button>`).join('')}</div>`;
  if (reglPage === 0) h += `<div class="regl">
   <label>${tr('Langue')} <select data-r="langue">${Object.entries(window.Langue.LANGUES).map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}</select></label>
   <label>${tr('Bruitages')} <input type="range" min="0" max="1" step="0.05" value="${r.sons}" data-r="sons"></label>
   <label>${tr('Musique')} <input type="range" min="0" max="1" step="0.05" value="${r.musique}" data-r="musique"></label>
   <label>${tr('Fantôme en jeu')} <select data-r="fantome"><option value="aucun">${tr('Aucun')}</option><option value="record">${tr('Mon record')}</option><option value="parfait">${tr('Le Parfait')}</option></select></label>
   <label>${tr('Commandes tactiles')} <select data-r="tactile"><option value="auto">${tr('Auto')}</option><option value="oui">${tr('Toujours')}</option><option value="non">${tr('Jamais')}</option></select></label>
   <label>${tr('Afficher les entrées')} <input type="checkbox" data-r="entrees" ${r.entrees ? 'checked' : ''}></label>
   <label>${tr('Plein écran')} <input type="checkbox" data-r="pleinEcran" ${document.fullscreenElement ? 'checked' : ''}></label></div>`;
  else if (reglPage === 1) h += `<div class="regl">
   <label>${tr('Vitesse du jeu')} <select data-r="vitesse"><option value="1">100 %</option><option value="0.85">85 %</option><option value="0.7">70 %</option><option value="0.55">55 %</option></select></label>
   <label>${tr('Assistance : invincible')} <input type="checkbox" data-r="invincible" ${r.invincible ? 'checked' : ''}></label>
   <label>${tr('Assistance : charges infinies')} <input type="checkbox" data-r="chargesInf" ${r.chargesInf ? 'checked' : ''}></label>
   <label>${tr('Mode daltonien (symboles sur les barrières)')} <input type="checkbox" data-r="daltonien" ${r.daltonien ? 'checked' : ''}></label>
   <label>${tr('Tremblements de l’écran')} <input type="checkbox" data-r="tremble" ${r.tremble ? 'checked' : ''}></label>
   <label>${tr('Réduire les flashs')} <input type="checkbox" data-r="sansFlash" ${r.sansFlash ? 'checked' : ''}></label></div>
   <p class="note">${tr('Avec une assistance ou une vitesse réduite, tes temps ne comptent pas pour les records, les médailles ni les succès.')}</p>`;
  else if (reglPage === 2) {
    h += `<h3>${tr('Touches')} <small>${tr('(clique puis appuie sur la nouvelle touche)')}</small></h3><div class="touches">`;
    for (const a in TOUCHES_DEF) {
      if (a === 'plasma') continue;
      h += `<div><span>${tr(NOMS_ACTIONS[a])}</span><button class="btn mini" data-a="touche" data-t="${a}" data-k="0">${nomTouche(S.touches[a][0])}</button>
        <button class="btn mini" data-a="touche" data-t="${a}" data-k="1">${nomTouche(S.touches[a][1])}</button></div>`;
    }
    h += `</div><div class="menu ligne"><button class="btn" data-a="touches-defaut">${tr('Touches par défaut')}</button></div>`;
  } else {
    h += `<h3>🎮 ${tr('Manette')} <small>${tr('(choisis une action puis appuie sur un bouton de la manette)')}</small></h3><div class="touches">`;
    for (const a of ['saut', 'solide', 'liquide', 'gaz', 'recommencer', 'pause'])
      h += `<div><span>${tr(NOMS_ACTIONS[a])}</span><button class="btn mini" data-a="bouton-manette" data-t="${a}">${attenteManette === a ? '…' : (NOMS_BOUTONS[S.manette[a]] || '#' + S.manette[a])}</button></div>`;
    h += `</div><div class="menu ligne"><button class="btn" data-a="manette-defaut">${tr('Manette par défaut')}</button></div>`;
  }
  h += `<div class="menu ligne">${reglPage === 0 ? `<button class="btn danger" data-a="effacer">${tr('Tout effacer')}</button>` : ''}<button class="btn" data-a="accueil">${tr('Retour')}</button></div>`;
  montrer(h, 'large');
  const v = (k, val) => { const el = ui.querySelector(`[data-r="${k}"]`); if (el) el.value = val; };
  v('fantome', r.fantome); v('langue', r.langue); v('tactile', r.tactile || 'auto'); v('vitesse', String(r.vitesse || 1));
}
// assistance active ou vitesse réduite : la partie ne compte pas pour les records
function assiste() { const r = S.reglages; return !!(r.invincible || r.chargesInf || (r.vitesse && +r.vitesse < 1)); }

function finNiveau(t, avant, record) {
  const id = J.L.id, m = medaille(id, S.il[id].t), p = PARF[id];
  const mCe = medaille(id, t);
  let lignes = '';
  if (record && avant != null) lignes += `<div class="vert">${tr('Nouveau record ! {0}', R.ecart(t - avant))}</div>`;
  else if (record) lignes += '<div class="vert">' + tr('Premier temps enregistré') + '</div>';
  else lignes += `<div class="rouge">${tr('{0} sur ton record ({1})', R.ecart(t - avant), R.chrono(avant))}</div>`;
  if (p) {
    const vise = Math.min(4, m + 1);
    lignes += `<div>${tr('Parfait : {0}', '<b>' + R.chrono(p.t) + '</b>')} ${t <= p.t ? '— <b class="rose">' + tr('ÉGALÉ !') + '</b>' : '(' + R.ecart(t - p.t) + ')'}</div>`;
    if (m < 4) lignes += `<div>${tr('Prochaine médaille : {0} en {1}', badge(vise), R.chrono(seuil(id, vise)))}</div>`;
  }
  lignes += `<div class="gris">${tr('Chutes : {0}', J.e.morts)}${J.n.aEclat ? ' · ' + (J.e.eclat ? tr('éclat ◆ pris') : tr('éclat pas pris')) : ''}</div>`;
  if (J.gainE > 0) lignes += `<div class="rose">+${J.gainE} ◆ ${tr('pour la boutique')}</div>`;
  lignes += J.succesNeufs || '';
  const suiv = J.idx + 1 < LISTE.length && zoneDebloquee(LISTE[J.idx + 1].zi);
  montrer(`<div class="fin"><div class="nomniv">${id} ${tr(J.L.def.nom)}</div><div class="temps">${R.chrono(t)}</div>${badge(mCe)}
    <div class="lignes">${lignes}</div>${splitsHTML(id)}${statsHTML()}
    <div class="menu ligne">
      <button class="btn" data-a="rejouer" ${suiv ? '' : 'autofocus'}>${tr('Recommencer')} <small>${nomTouche(S.touches.recommencer[0])}</small></button>
      ${suiv ? `<button class="btn" data-a="jouer" data-i="${J.idx + 1}" autofocus>${tr('Suivant')} <small>${tr('Entrée')}</small></button>` : ''}
      ${p ? `<button class="btn" data-a="voir-parfait" data-i="${J.idx}">${tr('▶ Voir le Parfait')}</button>` : ''}
      ${p && p.fe ? `<button class="btn" data-a="voir-parfait-eclat" data-i="${J.idx}">${tr('▶ Parfait avec l’éclat ◆')}</button>` : ''}
      <button class="btn" data-a="niveaux">${tr('Niveaux')}</button>
    </div></div>`, 'fin');
}
// barre du rejeu : pause, image par image, ralenti
const VITESSES = [0.1, 0.25, 0.5, 1, 2];
const barre = document.createElement('div');
barre.id = 'rejeu';
document.body.appendChild(barre);
let barreEtat = '';
function barreRejeu() {
  const on = J && J.mode === 'fantome' && ecran === 'jeu';
  const etat = on ? (J.pauseRejeu ? 'p' : '') + J.vitesse : '';
  if (etat === barreEtat) return;
  barreEtat = etat;
  if (!on) { barre.className = ''; barre.innerHTML = ''; return; }
  barre.className = 'visible';
  barre.innerHTML = `<button class="btn mini" data-r="arriere5">⏪ 5 s</button><button class="btn mini" data-r="pause">${J.pauseRejeu ? '▶' : '⏸'}</button><button class="btn mini" data-r="avant5">5 s ⏩</button><button class="btn mini" data-r="image" ${J.pauseRejeu ? '' : 'disabled'}>⏭ ${tr('image')}</button>` +
    VITESSES.map(v => `<button class="btn mini ${v === J.vitesse ? 'choisi' : ''}" data-r="v" data-v="${v}">×${String(v).replace('.', ',')}</button>`).join('') +
    `<button class="btn mini" data-r="quitter">✕</button><span>${tr('Espace : pause · ← → : 5 s · ↑ ↓ : vitesse · . : image suivante')}</span>`;
}
// aller à une image précise du rejeu (on resimule depuis le début : c'est instantané)
function allerA(cible) {
  cible = Math.max(0, Math.min(J.rejeu.length, cible));
  J.e = M.nouvelEtat(J.n);
  for (let i = 0; i < cible; i++) M.pas(J.n, J.e, J.rejeu[i]);
  J.ri = cible; J.ePrec = null;
}
function rejeu(a, v) {
  if (!J || J.mode !== 'fantome') return;
  if (a === 'avant5' || a === 'arriere5') { allerA(J.ri + (a === 'avant5' ? 300 : -300)); barreRejeu(); return; }
  if (a === 'pause') J.pauseRejeu = !J.pauseRejeu;
  else if (a === 'image' && J.pauseRejeu) pas();
  else if (a === 'v') J.vitesse = v;
  else if (a === 'plus' || a === 'moins') { const i = VITESSES.indexOf(J.vitesse); J.vitesse = VITESSES[Math.max(0, Math.min(VITESSES.length - 1, i + (a === 'plus' ? 1 : -1)))]; }
  else if (a === 'quitter') { finFantome(); }
  barreRejeu();
}
barre.addEventListener('click', ev => { const b = ev.target.closest('[data-r]'); if (b && !b.disabled) rejeu(b.dataset.r, +b.dataset.v); });
function finFantome() {
  const idx = J.idx;
  ecran = 'fin';
  montrer(`<div class="fin"><div class="nomniv">${LISTE[idx].id} ${tr(LISTE[idx].def.nom)}</div><div class="temps">${R.chrono(J.e.temps)}</div>
    <div class="lignes"><div>${tr('Rejeu : {0}', tr(J.quoi))}</div></div>${statsHTML()}
    <div class="menu ligne"><button class="btn" data-a="jouer" data-i="${idx}" autofocus>${tr('Jouer ce niveau')}</button><button class="btn" data-a="niveaux">${tr('Niveaux')}</button></div></div>`, 'fin');
}
function finCourse() {
  const cat = J.cat, tot = J.course.total, pb = S.course[cat];
  const record = !pb || tot < pb.t;
  if (record) S.course[cat] = { t: tot, splits: J.course.splits.slice() };
  sauver();
  ecran = 'fin';
  let tab = '<table class="rec">';
  J.course.splits.forEach((s, i) => {
    const d = pb && pb.splits ? s - pb.splits[i] : null;
    tab += `<tr><td>${LISTE[i].id} ${tr(LISTE[i].def.nom)}</td><td>${R.chrono(s)}</td><td class="${d != null && d <= 0 ? 'vert' : 'rouge'}">${d != null ? R.ecart(d) : ''}</td></tr>`;
  });
  tab += '</table>';
  montrer(`<div class="fin"><div class="nomniv">${tr(cat === 'cent' ? 'Course 100 %' : 'Course complète')}</div><div class="temps">${R.chrono(tot)}</div>
    <div class="lignes">${record ? '<div class="vert">' + tr('Nouveau record de course !') + '</div>' : `<div class="rouge">${tr('{0} sur ton record', R.ecart(tot - pb.t))}</div>`}</div>
    <div class="splits">${tab}</div>
    <div class="menu ligne"><button class="btn" data-a="course-${cat}" autofocus>${tr('Recommencer la course')}</button><button class="btn" data-a="accueil">${tr('Menu')}</button></div></div>`, 'fin large');
}
function pause() {
  if (ecran !== 'jeu') return;
  ecran = 'pause';
  SON.attenuer(true);
  montrer(`<div class="fin"><div class="nomniv">${tr('Pause')}</div>
    <div class="menu"><button class="btn" data-a="reprendre" autofocus>${tr('Reprendre')}</button>
    <button class="btn" data-a="rejouer">${tr(J.mode === 'niveau' ? 'Recommencer le niveau' : 'Recommencer')}</button>
    ${J.mode === 'niveau' && PARF[J.L.id] ? `<button class="btn" data-a="voir-parfait" data-i="${J.idx}">${tr('▶ Voir le Parfait')} <small>${R.chrono(PARF[J.L.id].t)}</small></button>` : ''}
    ${J.mode === 'niveau' && PARF[J.L.id] && PARF[J.L.id].fe ? `<button class="btn" data-a="voir-parfait-eclat" data-i="${J.idx}">${tr('▶ Parfait avec l’éclat ◆')} <small>${R.chrono(PARF[J.L.id].te)}</small></button>` : ''}
    ${J.entrainement ? `<div class="sous">${tr('Repartir du drapeau :')}</div><div class="drapeaux"><button class="btn mini" data-a="drapeau" data-i="0">${tr('Départ')}</button>${drapeauxNiveau().map((f, k) => `<button class="btn mini" data-a="drapeau" data-i="${k + 1}">⚑ ${k + 1}</button>`).join('')}</div>` : ''}
    <button class="btn" data-a="${J.mode === 'niveau' ? 'niveaux' : 'accueil'}">${tr('Quitter')}</button></div></div>`, 'fin');
}

function action(a, el) {
  SON.demarrer();
  SON.bruitMenu('valider');
  const i = el && el.dataset.i != null ? +el.dataset.i : null;
  switch (a) {
    case 'accueil': accueil(); break;
    case 'niveaux': if (!(J && J.entrainement) && !(el && el.dataset.garde)) nivEntrainement = false; J = null; ecran = 'menu'; niveaux(); break;
    case 'records': J = null; ecran = 'menu'; records(); break;
    case 'aide': aide(); break;
    case 'aide-page': aidePage = i; aide(); break;
    case 'regl-page': reglPage = i; reglages(); break;
    case 'rec-zone': recZone = i; records(); break;
    case 'niv-zone': nivZone = i; niveaux(); break;
    case 'boutique': boutique(); break;
    case 'defi-semaine': lancerDefiLong('semaine'); break;
    case 'defi-mois': lancerDefiLong('mois'); break;
    case 'infini': lancerInfini(2); break;
    case 'entrainement': case 'mode-entrainement': nivEntrainement = true; J = null; ecran = 'menu'; niveaux(); break;
    case 'mode-normal': nivEntrainement = false; niveaux(); break;
    case 'entrainer': lancerNiveau(i); J.entrainement = true; break;
    case 'drapeau': allerDrapeau(i); ecran = 'jeu'; cacherUI(); break;
    case 'succes': succesEcran(); break;
    case 'survie': lancerSurvie(); break;
    case 'tuto': lancerTuto(); break;
    case 'editeur': editeurMenu(); break;
    case 'ed-nouveau': ouvrirEditeur(null); break;
    case 'ed-ouvrir': ouvrirEditeur(i); break;
    case 'ed-importer': importerCode(); break;
    case 'ed-retour': ecran = 'editeur'; cacherUI(); majEditeur(); break;
    case 'ed-copier': { const ta = ui.querySelector('textarea.code'); if (ta) copierCode(ta.value); if (ta) { ta.select(); } break; }
    case 'perso-rejouer': lancerPerso(J.L.def, J.depuisEditeur); break;
    case 'ed-jouer-code': case 'ed-garder-code': {
      const ta = document.getElementById('codeIn'), r = ta && lireCode(ta.value);
      if (!r) { ta && (ta.style.borderColor = '#ff5a6e'); break; }
      const def = { id: 'perso', nom: r.nom, etats: r.etats, phases: r.etats.slice(), carte: r.l.map(x => x.join('')), panneaux: [] };
      if (a === 'ed-garder-code') { S.persos.push({ nom: r.nom, etats: r.etats, carte: def.carte }); sauver(); editeurMenu(); }
      else lancerPerso(def, false);
      break;
    }
    case 'special': lancerSpecial(el.dataset.s); break;

    case 'app': choisirApp(el.dataset.c, el.dataset.s); break;
    case 'cat': boutiqueCat = el.dataset.c; boutique(); break;
    case 'reglages': reglages(); break;
    case 'jouer': lancerNiveau(i); break;
    case 'voir-parfait': regarder(i, 'parfait'); break;
    case 'voir-parfait-eclat': regarder(i, 'parfait-eclat'); break;
    case 'voir-record': regarder(i, 'record'); break;
    case 'course-any': lancerCourse('any'); break;
    case 'course-cent': lancerCourse('cent'); break;
    case 'reprendre': ecran = 'jeu'; cacherUI(); break;
    case 'rejouer': if (J && J.mode === 'survie') lancerSurvie(); else if (J && J.mode === 'defi' && J.periode !== 'jour') lancerDefiLong(J.periode); else if (J && J.mode === 'defi') lancerDefi(); else if (J && J.mode === 'infini') lancerInfini(J.imode); else if (J && J.mode === 'course') lancerCourse(J.cat); else if (J) { if (J.mode === 'fantome') lancerNiveau(J.idx); else lancerNiveau(J.idx); } break;
    case 'recommencer':
      if (ecran === 'jeu') recommencer();
      else if (ecran === 'fin' && J && J.mode === 'niveau') lancerNiveau(J.idx);
      else if (ecran === 'fin' && J && J.mode === 'infini') lancerInfini(J.imode);
      else if (ecran === 'fin' && J && J.mode === 'defi') lancerDefiLong(J.periode);
      else if (ecran === 'fin' && J && J.mode === 'survie') lancerSurvie();
      else if (ecran === 'fin' && J && J.mode === 'special') lancerSpecial(J.sp.id);
      break;
    case 'pause':
      if (ecran === 'jeu') { if (J.mode === 'fantome') { if (J.L) niveauxOuRecords(); } else pause(); }
      else if (ecran === 'pause') { ecran = 'jeu'; cacherUI(); }
      break;
    case 'touche': attenteTouche = { a: el.dataset.t, k: +el.dataset.k, el }; el.textContent = '…'; break;
    case 'bouton-manette': attenteManette = el.dataset.t; manetteNav = 0xffff0; reglages(); break;
    case 'manette-defaut': S.manette = Object.assign({}, MANETTE_DEF); sauver(); reglages(); break;
    case 'touches-defaut': S.touches = JSON.parse(JSON.stringify(TOUCHES_DEF)); sauver(); reglages(); break;
    case 'effacer':
      if (confirm(tr('Effacer tous tes temps, records et réglages ?'))) { localStorage.removeItem(CLE); location.reload(); }
      break;
  }
}
function niveauxOuRecords() { J = null; ecran = 'menu'; niveaux(); }

ui.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]');
  if (b && !b.disabled) action(b.dataset.a, b);
});
ui.addEventListener('input', ev => {
  const el = ev.target, k = el.dataset.r;
  if (!k) return;
  S.reglages[k] = el.type === 'checkbox' ? el.checked : (el.type === 'range' ? +el.value : el.value);
  SON.volumes(S.reglages.sons, S.reglages.musique);
  sauver();
  if (k === 'langue') { window.Langue.choisir(el.value); reglages(); }
  if (k === 'tactile') majTactile();
  if (k === 'pleinEcran') { try { if (el.checked) document.documentElement.requestFullscreen(); else document.exitFullscreen(); } catch (err) { /* refusé */ } }
  if (k === 'daltonien' || k === 'sansFlash') R.accessibilite(S.reglages);
});

addEventListener('keydown', ev => {
  if (attenteTouche) {
    ev.preventDefault();
    const { a, k } = attenteTouche;
    attenteTouche = null;
    if (ev.code !== 'Escape' || a === 'pause') {
      for (const x in S.touches) S.touches[x] = S.touches[x].map(c => c === ev.code ? '' : c);
      S.touches[a][k] = ev.code;
      sauver();
    }
    reglages();
    return;
  }
  SON.demarrer();
  if (ecran === 'editeur' && ED) { ev.preventDefault(); toucheEditeur(ev); return; }
  if (ev.target && ev.target.tagName === 'TEXTAREA') { if (ev.code === 'Enter') { ev.preventDefault(); action('ed-jouer-code'); } else if (ev.code === 'Escape') action('editeur'); return; }
  const enJeu = ecran === 'jeu';
  if (enJeu && J && J.mode === 'fantome') {
    if (ev.code === 'Space') { ev.preventDefault(); if (!ev.repeat) rejeu('pause'); return; }
    if (ev.code === 'ArrowUp') { ev.preventDefault(); rejeu('plus'); return; }
    if (ev.code === 'ArrowDown') { ev.preventDefault(); rejeu('moins'); return; }
    if (ev.code === 'ArrowRight') { ev.preventDefault(); rejeu('avant5'); return; }
    if (ev.code === 'ArrowLeft') { ev.preventDefault(); rejeu('arriere5'); return; }
    if (ev.code === 'Period' || ev.code === 'NumpadDecimal') { ev.preventDefault(); if (!J.pauseRejeu) rejeu('pause'); rejeu('image'); return; }
  }
  if (enJeu && J && J.entrainement && (ev.code === 'PageUp' || ev.code === 'PageDown')) {
    ev.preventDefault();
    const nb = drapeauxNiveau().length;
    allerDrapeau(Math.max(0, Math.min(nb, (J.drapeauDepart || 0) + (ev.code === 'PageDown' ? 1 : -1))));
    return;
  }
  if (enJeu) {
    if (!ev.repeat) {
      if (S.touches.recommencer.includes(ev.code)) action('recommencer');
      if (S.touches.pause.includes(ev.code)) action('pause');
    }
    tenues.add(ev.code);
    ev.preventDefault();
    return;
  }
  // navigation des menus
  if (ev.code === 'Escape' && !ev.repeat) {
    if (ecran === 'pause') { action('pause'); return; }
    if (ui.querySelector('[data-a="accueil"]') && ecran !== 'fin') { action('accueil'); return; }
    if (ecran === 'fin') { action('niveaux'); return; }
  }
  if (ecran === 'fin' && S.touches.recommencer.includes(ev.code) && J && (J.mode === 'niveau' || J.mode === 'infini' || J.mode === 'defi') && !ev.repeat) { action('recommencer'); return; }
  const dirs = { ArrowDown: [0, 1], KeyS: [0, 1], ArrowUp: [0, -1], KeyW: [0, -1], ArrowRight: [1, 0], KeyD: [1, 0], ArrowLeft: [-1, 0], KeyA: [-1, 0] };
  const el = document.activeElement;
  // curseurs et listes : gauche/droite changent la valeur, haut/bas changent de ligne
  if (el && (el.type === 'range' || el.tagName === 'SELECT') && (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight')) {
    ev.preventDefault();
    const d = ev.code === 'ArrowRight' ? 1 : -1;
    if (el.type === 'range') el.value = Math.max(+el.min, Math.min(+el.max, +el.value + d * (+el.step || 1)));
    else el.selectedIndex = (el.selectedIndex + d + el.options.length) % el.options.length;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  if (dirs[ev.code]) { ev.preventDefault(); naviguer(dirs[ev.code]); return; }
  if ((ev.code === 'Enter' || ev.code === 'Space') && el) {
    if (el.classList.contains('btn')) { ev.preventDefault(); el.click(); }
    else if (el.type === 'checkbox') { ev.preventDefault(); el.checked = !el.checked; el.dispatchEvent(new Event('input', { bubbles: true })); }
  }
});
// navigation dans l'espace : on va au bouton le plus proche dans la direction choisie (grilles, onglets, listes)
function focusables() { return [...ui.querySelectorAll('.btn:not([disabled]), select, input')].filter(x => x.offsetParent !== null); }
function naviguer([dx, dy]) {
  const liste = focusables();
  if (!liste.length) return;
  const cur = document.activeElement;
  if (!liste.includes(cur)) { liste[0].focus(); return; }
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bs = Infinity;
  for (const b of liste) {
    if (b === cur) continue;
    const r = b.getBoundingClientRect(), bx = r.left + r.width / 2, by = r.top + r.height / 2;
    const prim = dx ? (bx - ax) * dx : (by - ay) * dy;
    if (prim <= 4) continue;
    const sec = dx ? Math.abs(by - ay) : Math.abs(bx - ax);
    const sc = prim + sec * 2.2;
    if (sc < bs) { bs = sc; best = b; }
  }
  if (!best) {                                           // au bord : on repart de l'autre côté
    const ord = liste.slice().sort((p, q) => { const r1 = p.getBoundingClientRect(), r2 = q.getBoundingClientRect(); return dy ? (r1.top - r2.top) * dy : (r1.left - r2.left) * dx; });
    best = ord[0] === cur ? null : ord[0];
  }
  if (best) { best.focus(); best.scrollIntoView && best.scrollIntoView({ block: 'nearest' }); SON.bruitMenu('menu'); }
}
addEventListener('keyup', ev => { tenues.delete(ev.code); });
addEventListener('blur', () => tenues.clear());

// navigation des menus à la manette
setInterval(() => {
  if (ecran === 'jeu') return;
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let b = 0;
  for (const p of pads) {
    if (!p) continue;
    const bt = (i) => p.buttons[i] && p.buttons[i].pressed;
    if (bt(13) || (p.axes[1] || 0) > 0.5 || bt(15) || (p.axes[0] || 0) > 0.5) b |= 1;
    if (bt(12) || (p.axes[1] || 0) < -0.5 || bt(14) || (p.axes[0] || 0) < -0.5) b |= 2;
    if (bt(0)) b |= 4;
    if (bt(1)) b |= 8;
  }
  if (attenteManette) {                                     // on attend le nouveau bouton pour une action
    for (const p of pads) if (p) for (let k = 0; k < p.buttons.length; k++) if (p.buttons[k] && p.buttons[k].pressed && !((manetteNav >> 4) & (1 << k))) {
      for (const a in S.manette) if (S.manette[a] === k) S.manette[a] = S.manette[attenteManette];
      S.manette[attenteManette] = k; attenteManette = null; sauver(); reglages(); manetteNav = 0xffff0; return;
    }
    let tous = 0; for (const p of pads) if (p) for (let k = 0; k < Math.min(16, p.buttons.length); k++) if (p.buttons[k] && p.buttons[k].pressed) tous |= 1 << k;
    manetteNav = tous << 4; return;
  }
  const pr = b & ~manetteNav; manetteNav = b;
  if (pr & 1) naviguer([0, 1]);
  if (pr & 2) naviguer([0, -1]);
  if (pr & 4 && document.activeElement && document.activeElement.classList.contains('btn')) document.activeElement.click();
  if (pr & 8) { if (ecran === 'pause') action('pause'); else action('accueil'); }
}, 50);

/* ---------- Commandes tactiles : joystick à gauche (il apparaît sous le doigt), saut et états à droite ---------- */
const zoneT = document.getElementById('tactile');
function tactileVoulu() {
  const r = S.reglages.tactile || 'auto';
  if (r === 'oui') return true;
  if (r === 'non') return false;
  return ('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
}
function majTactile() {
  zoneT.classList.toggle('actif', tactileVoulu());
  zoneT.classList.toggle('cache-jeu', ecran !== 'jeu');
  // seuls les états permis dans ce niveau ont un bouton
  const em = J && J.n ? J.n.emplacements : [0, 1, 2];
  zoneT.querySelectorAll('.t-etat').forEach((el, i) => {
    const p = em[i];
    el.style.display = p !== undefined ? '' : 'none';
    if (p !== undefined) { el.style.setProperty('--c', R.COUL_PHASE[p]); el.textContent = tr(M.NOMS_PHASES[p]).slice(0, 2); }
  });
}
let joyBits = 0, boutonsBits = 0;
function tactiles() {
  const joy = document.getElementById('joyZone'), base = document.getElementById('joyBase'), bout = document.getElementById('joyBouton');
  let doigt = null, ox = 0, oy = 0;
  const maj = () => { tactile.bits = joyBits | boutonsBits; };
  const bouge = (x, y) => {
    const r = base.offsetWidth / 2, dx = x - ox, dy = y - oy, l = Math.hypot(dx, dy), k = l > r ? r / l : 1;
    bout.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    joyBits = 0;
    if (l > r * 0.28) {
      const nx = dx / l, ny = dy / l;
      if (nx < -0.38) joyBits |= M.E.G; if (nx > 0.38) joyBits |= M.E.D;
      if (ny < -0.45) joyBits |= M.E.H; if (ny > 0.45) joyBits |= M.E.B;
    }
    maj();
  };
  joy.addEventListener('pointerdown', ev => {
    ev.preventDefault(); SON.demarrer(); doigt = ev.pointerId; joy.setPointerCapture(doigt);
    const zr = joy.getBoundingClientRect();
    ox = ev.clientX; oy = ev.clientY;
    base.style.left = (ox - zr.left) + 'px'; base.style.top = (oy - zr.top) + 'px';
    bouge(ev.clientX, ev.clientY);
  });
  joy.addEventListener('pointermove', ev => { if (ev.pointerId === doigt) bouge(ev.clientX, ev.clientY); });
  const lache = ev => { if (ev.pointerId !== doigt) return; doigt = null; joyBits = 0; bout.style.transform = ''; maj(); };
  joy.addEventListener('pointerup', lache); joy.addEventListener('pointercancel', lache);
  zoneT.querySelectorAll('[data-b]').forEach(el => {
    const b = +el.dataset.b;
    el.addEventListener('pointerdown', ev => { ev.preventDefault(); SON.demarrer(); el.setPointerCapture(ev.pointerId); el.classList.add('on'); boutonsBits |= b; maj(); });
    const fin = () => { el.classList.remove('on'); boutonsBits &= ~b; maj(); };
    el.addEventListener('pointerup', fin); el.addEventListener('pointercancel', fin); el.addEventListener('lostpointercapture', fin);
  });
  zoneT.querySelectorAll('[data-p]').forEach(el => el.addEventListener('pointerdown', ev => { ev.preventDefault(); action(el.dataset.p); }));
  majTactile();
  setInterval(majTactile, 300);
}

/* ---------- Démarrage ---------- */
R.init(document.getElementById('jeu'));
R.accessibilite(S.reglages);
appliquerApparence();
SON.volumes(S.reglages.sons, S.reglages.musique);
tactiles();
accueil();
requestAnimationFrame(boucle);
window.Jeu = { LISTE, S, DEFIS, defiDuJour, cleJour, get J() { return J; }, lancerNiveau, regarder, lancerCourse, pas, action };
if (MUET) console.log('Phase : son coupé (?muet)');
})();
