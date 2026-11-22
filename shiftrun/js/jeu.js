/* Phase — boucle de jeu, commandes, sauvegarde, menus, chrono, records et fantômes. */
(function () {
'use strict';
const M = window.Moteur, NIV = window.Niveaux, R = window.Rendu, SON = window.Son, Gen = window.Gen, tr = window.Langue.t;
const PARF = window.PARFAITS || {};
const HUM = window.HUMAINS || {};                 // bot « humain » : plus lent, mais reproductible (très dur pour un humain)
const FAC = window.FACILES || {};                 // bot « facile » : touches tenues longtemps, faisable par un humain
const BOTS = { facile: FAC, humain: HUM, parfait: PARF };
const botDe = (t) => BOTS[t] || PARF;
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
S.reglages = Object.assign({ sons: 0.5, musique: 0.5, fantome: 'record', entrees: true, tremble: true, langue: window.Langue.detecter(), tactile: 'auto' }, S.reglages);
if (!S.medV2) { for (const id in S.il) if (S.il[id] && S.il[id].mMax === 4) S.il[id].mMax = 6; S.medV2 = 1; }   // Platine et Diamant ajoutés : le Parfait passe de 4 à 6
// vitesse réduite, invincibilité et charges infinies n'existent plus (le mode Entraînement les remplace)
S.reglages.vitesse = 1; S.reglages.invincible = false; S.reglages.chargesInf = false;
if (!S.reglages.entreesV2) { S.reglages.entrees = true; S.reglages.entreesV2 = 1; }   // les touches affichées sont maintenant visibles par défaut (désactivables)
window.Langue.choisir(S.reglages.langue);
if (!S.touches) S.touches = JSON.parse(JSON.stringify(TOUCHES_DEF));
for (const k in TOUCHES_DEF) if (!S.touches[k]) S.touches[k] = TOUCHES_DEF[k].slice();
/* ---------- Éclats ◆ : monnaie de la boutique ---------- */
if (!S.bonus) S.bonus = { eclats: 0, jours: {}, infini: {} };
if (!S.skins) S.skins = { achats: ['base', 'rien'], corps: 'base', accessoire: 'rien', depense: 0 };
// Apparences : 6 catégories équipées en même temps ; la forme et la couleur de l'état restent toujours reconnaissables.
// Prix croissants : un peu plus chers depuis que chaque drapeau rapporte un cristal ◆ (environ 18 000 pour tout posséder).
const PRIX = [0, 15, 25, 40, 60, 80, 110, 150, 200, 260, 340, 440, 560, 720];
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
function sauver() {
  S.sauveT = Date.now();
  try { localStorage.setItem(CLE, JSON.stringify(S)); } catch (err) { /* plein ou bloqué */ }
  // programme Steam : la sauvegarde part aussi dans le cloud (quelques secondes après la dernière modification)
  if (STEAM) { clearTimeout(sauver.t); sauver.t = setTimeout(() => { try { STEAM.cloudEcrire(JSON.stringify(S)); } catch (err) { } }, 3000); }
}
const STEAM = window.shiftrunSteam || null;
let LB_PRET = false;
if (STEAM) {
  STEAM.classementPret().then(v => { LB_PRET = !!v; }).catch(() => {});
  // au lancement : si la sauvegarde du cloud est plus récente (autre ordinateur), on la reprend
  STEAM.cloudLire().then(txt => {
    if (!txt) return;
    try { const d = JSON.parse(txt); if ((d.sauveT || 0) > (S.sauveT || 0) + 1000) { localStorage.setItem(CLE, txt); location.reload(); } } catch (err) { }
  }).catch(() => {});
}

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
let manettePrec = 0, manetteNav = 0, dernierePad = null, sourceEntree = 'clavier';
addEventListener('keydown', ev => { if (ev.isTrusted) sourceEntree = 'clavier'; }, true);
// noms des touches d'état et de saut affichés : ceux de la manette si on joue à la manette
const nomsEtatsHUD = () => sourceEntree === 'pad' ? ['solide', 'liquide', 'gaz'].map(a => NOMS_BOUTONS[S.manette[a]] || '#' + S.manette[a]) : [0, 1, 2].map(touchePhase);
const nomSautHUD = () => sourceEntree === 'pad' ? (NOMS_BOUTONS[S.manette.saut] || 'A') : tr('saut');
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
    if (p.buttons.some(x => x && x.pressed) || Math.abs(p.axes[0] || 0) > 0.4 || Math.abs(p.axes[1] || 0) > 0.4) sourceEntree = 'pad';
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
  let s = null, ecl = false;
  if (choix === 'record' && S.il[id] && S.il[id].f) s = S.il[id].f;
  else if (BOTS[choix] && BOTS[choix][id]) { const p = BOTS[choix][id]; ecl = !!(S.reglages.fantEclat && p.fe); s = ecl ? p.fe : p.f; }
  if (!s) return null;
  const ent = M.decompresser(s);
  while (ent.length && !ent[0]) ent.shift();
  const n = M.charger(LISTE[parId[id]].def);
  return { n, e: M.nouvelEtat(n), ent, i: 0, eclat: ecl };
}
// chaque niveau a sa musique à lui (54 morceaux)
function musiqueNiveau(idx) {
  const cle = 'n' + (idx % 54 + 1), L = LISTE[idx], lg = L.def.carte[0].length;
  // rythme en accord avec le jeu : plus vite dans les zones dures, encore plus dans les niveaux courts
  const v = Math.min(1.28, 1.08 + (L.zi || 0) * 0.015 + (lg < 450 ? 0.08 : lg < 600 ? 0.04 : 0));
  SON.tempoMusique(cle, v);
  return cle;
}
function lancerNiveau(idx) {
  const c = charger(idx);
  J = Object.assign(c, { mode: 'niveau', idx, fantome: fantomePour(LISTE[idx].id) });
  S.essais++;
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique(musiqueNiveau(idx));
  S.cumul.rejeux++;
}
function regarder(idx, cle) {
  const id = LISTE[idx].id, p = cle === 'record' ? S.il[id] : cle.startsWith('humain') ? HUM[id] : cle.startsWith('facile') ? FAC[id] : PARF[id];
  const fz = cle.endsWith('-eclat') ? (p && p.fe) : (p && p.f);
  if (!fz) return;
  const c = charger(idx);
  const ent = M.decompresser(fz);
  while (ent.length && !ent[0]) ent.shift();
  J = Object.assign(c, { mode: 'fantome', cleRejeu: cle, vitesse: 1, pauseRejeu: false, idx, rejeu: ent, ri: 0, quoi: cle === 'record' ? 'ton record' : cle === 'facile' ? 'le robot Difficile' : cle === 'facile-eclat' ? 'le robot Difficile avec l’éclat ◆' : cle === 'humain' ? 'le robot Professionnel' : cle === 'humain-eclat' ? 'le robot Professionnel avec l’éclat ◆' : cle === 'parfait-eclat' ? 'le Parfait avec l’éclat ◆' : 'le Parfait' });
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique(musiqueNiveau(idx));
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
/* ---------- Classement mondial (programme Steam) : les meilleurs temps et leurs fantômes ---------- */
let CLASSEMENT = [];
function classementMondial(idx) {
  const id = LISTE[idx].id;
  montrer(`<h2>🌐 ${tr('Classement mondial')} · ${id}</h2><p class="note">${tr('Chargement…')}</p>`, 'large');
  STEAM.classementTop('niveau-' + id, 10).then(l => {
    CLASSEMENT = l || [];
    montrer(`<h2>🌐 ${tr('Classement mondial')} · ${id} ${tr(LISTE[idx].def.nom)}</h2>
      <table class="rec"><tr><th>#</th><th>${tr('Joueur')}</th><th>${tr('Temps')}</th><th></th></tr>
      ${CLASSEMENT.map((en, k) => `<tr><td>${k + 1}</td><td>${en.nom}</td><td>${R.chrono(en.temps)}</td><td>${en.fantome ? `<button class="btn mini" data-a="fantome-mondial" data-i="${idx}" data-k="${k}">▶ ${tr('fantôme')}</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="4">${tr('Personne pour l’instant : sois le premier !')}</td></tr>`}</table>
      <div class="menu ligne"><button class="btn" data-a="jouer" data-i="${idx}" autofocus>▶ ${tr('Jouer ce niveau')}</button><button class="btn" data-a="niveaux">${tr('Niveaux')}</button></div>`, 'large');
  }).catch(() => montrer(`<h2>🌐 ${tr('Classement mondial')}</h2><p class="note">${tr('Classement indisponible.')}</p><div class="menu ligne"><button class="btn" data-a="niveaux" autofocus>${tr('Niveaux')}</button></div>`, 'large'));
}
// rejouer les entrées d'un autre joueur (fantôme du classement)
function regarderEntrees(idx, ent, nom) {
  const c = charger(idx);
  while (ent.length && !ent[0]) ent.shift();
  J = Object.assign(c, { mode: 'fantome', vitesse: 1, pauseRejeu: false, idx, rejeu: ent, ri: 0, quoi: nom });
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique(musiqueNiveau(idx));
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
  { id: 'ciel', nom: 'Le ciel ouvert', theme: 'glacier' },
  { id: 'geysers', nom: 'Les geysers', theme: 'aqueduc' },
  { id: 'ressorts', nom: 'Les ressorts', theme: 'carriere' },
  { id: 'tremplins', nom: 'Les tremplins', theme: 'coeur' },
  { id: 'labo', nom: 'Le laboratoire', theme: 'abysses' },
  { id: 'escalier', nom: 'Le grand escalier', theme: 'carriere' },
  { id: 'pont', nom: 'Le pont suspendu', theme: 'orage' },
  { id: 'pyramide', nom: 'La pyramide', theme: 'chaufferie' },
  { id: 'puits', nom: 'Les deux puits', theme: 'abysses' },
  { id: 'colonnes', nom: 'Les colonnes', theme: 'usine' },
  { id: 'jardin', nom: 'Le jardin suspendu', theme: 'glacier' }
];
// toutes les arènes ont la même richesse : au moins 4 plateformes, des bords qui renvoient de l'autre côté,
// et au moins deux sortes d'objets (geysers g, ressorts s, tremplins ( ), plaques qui transforment : ; &)
// arène générée : plateformes, trous qui renvoient en haut, bords qui renvoient de l'autre côté
function areneHasard(graine) {
  const rng = Gen.hasard(graine), Wd = 46, l = [];
  for (let y = 0; y < Gen.HAUT; y++) l.push(new Array(Wd).fill('#'));
  const c = (xa, ya, xb, yb, ch) => { for (let y = ya; y <= yb; y++) for (let x = Math.max(1, xa); x <= Math.min(Wd - 2, xb); x++) l[y][x] = ch; };
  c(1, 6, Wd - 2, 19, '.');
  const sol = 2;                                      // toujours un petit trou qui renvoie en haut (comme les arènes dessinées)
  if (sol === 2) { const a = 15 + Math.floor(rng() * 12); c(a, 20, a + 2, 20, '}'); c(a, 5, a + 2, 5, '{'); }
  // étages de plateformes, jamais trop haut pour être atteints
  for (const y of [16, 13, 10]) {
    let x = 2 + Math.floor(rng() * 4);
    while (x < Wd - 6) { const lg = 4 + Math.floor(rng() * 6); if (rng() < 0.8) c(x, y, x + lg, y, '#'); x += lg + 3 + Math.floor(rng() * 5); }
  }
  { let a = 6 + Math.floor(rng() * 32); if (Math.abs(a - 22) < 4) a += 8; c(a, 14, a + 1, 19, '#'); }      // toujours un pilier
  // de temps en temps : geysers, ressorts, tremplins ou plaques qui transforment, posés sur le sol (jamais sous une plateforme)
  const libreHaut = (x) => { for (let y = 14; y <= 18; y++) if (l[y][x] !== '.') return false; return true; };
  const tous = ['g', 's', '()', ':;&'], objets = [];
  while (objets.length < 2) { const o = tous[Math.floor(rng() * 4)]; if (!objets.includes(o)) objets.push(o); }   // toujours deux sortes d'objets
  for (const o of objets) for (let k = 0, mis = 0; k < 80 && mis < 3; k++) {          // 3 de chaque sorte
    const x = 3 + Math.floor(rng() * (Wd - 6)), ch = o.length === 1 ? o : o[Math.floor(rng() * o.length)];
    if (l[19][x] === '.' && l[20][x] === '#' && l[19][x - 1] === '.' && l[19][x + 1] === '.' && (ch !== 'g' || libreHaut(x)) && Math.abs(x - 22) > 4) { l[19][x] = ch; mis++; }
  }
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
  const pose = (lst) => { for (const [x, y, ch] of lst) if (l[y][x] === '.' && l[y + 1][x] === '#') l[y][x] = ch; };   // un objet posé sur un sol
  if (id === 'tours') {
    plates([[8, 12, 16], [33, 37, 16], [19, 26, 12], [8, 12, 9], [33, 37, 9]]);
    c(14, 10, 15, 19, '#'); c(30, 10, 31, 19, '#');                 // deux tours
    trouBas(19, 26); cotes(6, 19);
    pose([[3, 19, ')'], [42, 19, '('], [10, 15, 's'], [35, 15, 's']]);
  } else if (id === 'cage') {
    c(1, 6, Wd - 2, 19, '.');
    for (let y = 9; y <= 17; y += 4) for (let x = 4; x < Wd - 6; x += 9) c(x + (y % 8 ? 4 : 0), y, x + (y % 8 ? 7 : 3), y, '#');
    trouBas(20, 25); cotes(6, 19);
    pose([[3, 19, ':'], [42, 19, ';'], [16, 19, 'g'], [31, 19, 'g']]);
  } else if (id === 'ciel') {
    plates([[4, 9, 15], [16, 22, 12], [24, 30, 16], [34, 41, 11], [10, 14, 9], [28, 31, 8]]);
    trouBas(21, 23); cotes(6, 19);
    pose([[12, 19, 's'], [32, 19, 's'], [2, 19, ')'], [43, 19, '(']]);
  } else if (id === 'escalier') {                      // marches de chaque côté qui montent vers le centre
    plates([[2, 6, 17], [7, 10, 15], [11, 14, 13], [15, 18, 11], [27, 30, 11], [31, 34, 13], [35, 38, 15], [39, 43, 17], [20, 25, 8]]);
    trouBas(21, 24); cotes(6, 19);
    pose([[17, 19, 'g'], [28, 19, 'g'], [8, 19, ')'], [37, 19, '(']]);
  } else if (id === 'pont') {                          // un long pont au milieu, un vide en dessous qui renvoie en haut
    plates([[6, 39, 13], [2, 5, 16], [40, 43, 16], [12, 17, 9], [28, 33, 9]]);
    for (const x of [10, 35]) l[13][x] = '.';
    trouBas(15, 30); cotes(6, 19);
    pose([[3, 19, 's'], [42, 19, 's'], [8, 12, ':'], [37, 12, '&']]);
  } else if (id === 'pyramide') {                      // une pyramide de blocs au centre
    c(14, 17, 31, 19, '#'); c(17, 15, 28, 16, '#'); c(20, 13, 25, 14, '#');
    plates([[3, 8, 14], [37, 42, 14], [8, 12, 10], [33, 37, 10]]);
    cotes(6, 19);
    pose([[6, 19, ')'], [39, 19, '('], [24, 12, 'g'], [11, 19, ';'], [34, 19, ':']]);
  } else if (id === 'puits') {                         // deux puits qui renvoient en haut, trois îlots
    trouBas(9, 12); trouBas(33, 36);
    plates([[14, 31, 15], [3, 8, 12], [37, 42, 12], [18, 27, 10]]);
    cotes(6, 19);
    pose([[4, 19, 'g'], [41, 19, 'g'], [16, 19, 's'], [29, 19, 's']]);
  } else if (id === 'colonnes') {                      // une forêt de colonnes basses, des geysers dessus
    for (const x of [6, 13, 31, 38]) c(x, 15, x + 1, 19, '#');
    plates([[2, 9, 11], [36, 43, 11], [15, 30, 12], [19, 26, 8]]);
    trouBas(20, 25); cotes(6, 19);
    pose([[6, 14, 'g'], [39, 14, 'g'], [10, 19, '&'], [35, 19, ':']]);
  } else if (id === 'jardin') {                        // plein de petites plateformes éparpillées
    plates([[3, 5, 16], [9, 12, 14], [16, 18, 17], [27, 29, 17], [33, 36, 14], [40, 42, 16], [6, 9, 10], [14, 17, 11], [28, 31, 11], [36, 39, 10], [20, 25, 13]]);
    trouBas(21, 24); cotes(6, 19);
    pose([[2, 19, 's'], [43, 19, 's'], [13, 19, ')'], [32, 19, '('], [10, 13, ';']]);
  } else if (id === 'geysers') {                       // des geysers qui projettent tout en haut, des plateformes hautes
    plates([[2, 7, 11], [13, 19, 9], [26, 32, 9], [38, 43, 11], [17, 28, 15]]);
    for (const x of [10, 35]) l[19][x] = 'g';
    l[14][22] = 'g';                                    // un geyser sur la plateforme du milieu
    cotes(6, 19);
  } else if (id === 'ressorts') {                      // des ressorts au sol, des étages à atteindre d'un bond
    plates([[3, 8, 14], [14, 20, 10], [25, 31, 10], [37, 42, 14], [18, 27, 15]]);
    for (const x of [2, 11, 34, 43]) l[19][x] = 's';
    trouBas(21, 23); cotes(8, 19);
  } else if (id === 'tremplins') {                     // des tremplins qui projettent d'un bout à l'autre, deux piliers
    plates([[4, 10, 13], [35, 41, 13], [17, 28, 11]]);
    c(14, 16, 15, 19, '#'); c(30, 16, 31, 19, '#');
    l[19][3] = ')'; l[19][12] = '('; l[19][33] = ')'; l[19][42] = '(';
    cotes(6, 19);
  } else if (id === 'labo') {                          // des plaques qui transforment en un autre état (sans charge)
    plates([[3, 9, 15], [36, 42, 15], [14, 20, 11], [25, 31, 11], [19, 26, 16]]);
    l[19][8] = ':'; l[19][37] = ';'; l[10][17] = '&'; l[10][28] = ':'; l[19][12] = 'g';
    trouBas(29, 31); cotes(6, 19);
  } else {
    plates([[5, 12, 16], [33, 40, 16], [17, 28, 13], [3, 9, 10], [36, 42, 10], [19, 26, 9]]);
    trouBas(22, 24); cotes(14, 19);
    pose([[14, 19, 'g'], [31, 19, 'g'], [3, 19, ')'], [42, 19, '(']]);
  }
  if (id === 'pyramide') l[12][22] = '@';                // départ au sommet de la pyramide
  else if (id === 'pont') l[12][22] = '@';               // départ sur le pont
  else l[19][id === 'ciel' || id === 'fosse' ? 19 : 22] = '@';
  return l.map(r => r.join(''));
}
function choixSurvie() {
  J = null; ecran = 'menu';
  S.survieCartes = S.survieCartes || {};
  montrer(`<h2>⚔ ${tr('Survivant')}</h2><p class="note">${tr('Des ennemis de plus en plus nombreux et de plus en plus variés. Pour les écraser, il suffit que le bas de ton corps touche leur tête (sauf les hérissés !). Foncer sur eux en plasma te tue. Les bords bleus te renvoient de l’autre côté.')}</p>
    <div class="grille">${ARENES.map((a, k) => `<button class="btn carte" data-a="survie" data-i="${k}" ${k === 0 ? 'autofocus' : ''}><b>${tr(a.nom)}</b><small>${S.survieCartes[a.id] ? tr('record : {0}', R.chrono(S.survieCartes[a.id].t) + ' · ' + S.survieCartes[a.id].kills + ' ✖') : '—'}</small></button>`).join('')}</div>
    <div class="menu ligne"><button class="btn" data-a="accueil">${tr('Retour')}</button></div>`, 'large');
}
function lancerSurvie() {
  // une arène au hasard à chaque partie : une des 4 dessinées, ou une arène générée (des milliers possibles)
  const graine = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, k = graine % (ARENES.length + 4);
  const THM = ['orage', 'chaufferie', 'usine', 'glacier', 'abysses', 'coeur', 'carriere', 'aqueduc'];
  const A = k < ARENES.length ? ARENES[k] : { id: 'hasard', nom: 'Arène inconnue', theme: THM[graine % THM.length] };
  const def = { id: 'survie', nom: 'Survivant', phases: [0, 3, 4], etats: [0, 3, 4], carte: k < ARENES.length ? areneSurvie(A.id) : areneHasard(graine), panneaux: [] };
  const n = M.charger(def), e = M.nouvelEtat(n);
  R.preparer(n, () => A.theme);
  recadrer = true;
  // on commence à son record moins 15 ennemis écrasés, avec la difficulté qui va avec (vague = ennemis déjà apparus)
  const depart = Math.max(0, ((S.survie && S.survie.kills) || 0) - 15);
  J = { mode: 'survie', arene: A, n, e, entrees: [], L: { id: 'survie', def, zi: 0 }, salle: 0, finT: 0, monstres: [], balles: [], kills: depart, depart, maxEnnemis: 0, spawnT: 180, vague: depart, alea: (Date.now() % 100000) + 1 };
  if (depart > 0) { message = tr('Départ à {0} ennemis écrasés (ton record − 15)', depart); messageT = 150; }
  S.essais++;
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique('survie');
}
const FAUX = { phase: 0, bascule: 0, casses: [], boutons: [], craque: [], glaces: [] };
function hasardJ() { J.alea = (J.alea * 16807) % 2147483647; return J.alea / 2147483647; }
// les sortes d'ennemis (débloquées au fil des vagues) ; le rayon r est aussi celui du dessin et de la hitbox
const ENNEMIS = {
  marcheur: { r: 6.5, vague: 0 }, sauteur: { r: 6.5, vague: 2 }, volant: { r: 6, vague: 5 }, herisse: { r: 6.5, vague: 8 },
  tireur: { r: 6.5, vague: 10 }, rebond: { r: 5.5, vague: 12 }, fonceur: { r: 6, vague: 14 }, archer: { r: 6.5, vague: 16 }, lourd: { r: 8.5, vague: 18 },
  diviseur: { r: 7, vague: 20 }, invocateur: { r: 7.5, vague: 24 }, petit: { r: 4.5, vague: 999 }, fantome: { r: 6.5, vague: 22 }, bombe: { r: 6, vague: 27 }
};
const SEUIL_SURVIE = 20;                                  // au-delà, la difficulté monte bien plus doucement
// temps entre deux ennemis (en images) : il raccourcit normalement jusqu'au 20e, puis environ quatre fois plus lentement
const rythmeSurvie = (v) => v <= SEUIL_SURVIE ? Math.round(210 - v * 1.6) : Math.max(70, Math.round(210 - SEUIL_SURVIE * 1.6 - (v - SEUIL_SURVIE) * 0.4));
function nouveauMonstre(type, x, y) {
  return { type, r: ENNEMIS[type].r, x, y, vx: 0, vy: 0, dir: hasardJ() < 0.5 ? -1 : 1, sol: false, t: 0, pv: type === 'lourd' ? 2 : 1,
    // la vitesse monte jusqu'au 20e ennemi, puis ne bouge plus (ensuite, seuls le rythme d'arrivée et les nouveaux types changent)
    vit: (0.55 + Math.min(J.vague, SEUIL_SURVIE) * 0.01) * (type === 'petit' ? 1.4 : type === 'lourd' ? 0.6 : 1), charge: 0, meche: 0, invisible: false, garde: 0,
    elite: false };
}
function majSurvie() {
  const e = J.e, n = J.n, T2 = M.T;
  if (!e.demarre || J.finT > 0) return;
  const dur = (px, py) => M.plein(n, FAUX, Math.floor(px / T2), Math.floor(py / T2));
  const pcx = e.x + 6, pcy = e.y + 6;
  if (!J.prochain && J.spawnT <= 72) {                       // on annonce l'apparition à l'avance
    const types = Object.keys(ENNEMIS).filter(t => ENNEMIS[t].vague * 1.5 <= J.vague + 1);   // nouveaux ennemis plus espacés
    const xs = [4, 13, 22, 31, 40], type = types[Math.floor(hasardJ() * types.length)], r = ENNEMIS[type].r;
    if (type === 'volant' || type === 'fantome') J.prochain = { type, x: xs[Math.floor(hasardJ() * xs.length)] * T2 + 2, y: 6 * T2 + 2 };
    else {
      if (!J.sols) {                                         // toutes les cases où un ennemi peut tenir debout
        J.sols = [];
        for (let ty = 7; ty < n.h - 1; ty++) for (let tx = 2; tx < n.w - 2; tx++)
          if (!dur(tx * T2 + 1, ty * T2 + 1) && !dur(tx * T2 + 1, (ty - 1) * T2 + 1) && !dur((tx + 1) * T2 + 1, ty * T2 + 1) && dur(tx * T2 + 1, (ty + 1) * T2 + 1) && dur((tx + 1) * T2 + 1, (ty + 1) * T2 + 1) && M.tuile(n, tx, ty) === M.VIDE) J.sols.push([tx, ty]);
      }
      const loin = J.sols.filter(([tx, ty]) => Math.hypot(tx * T2 - pcx, ty * T2 - pcy) > 9 * T2);
      const l2 = loin.length ? loin : J.sols, [tx, ty] = l2[Math.floor(hasardJ() * l2.length)] || [22, 18];
      J.prochain = { type, x: tx * T2 + T2 - r, y: (ty + 1) * T2 - 2 * r, sol: true };
    }
  }
  if (--J.spawnT <= 0) {
    J.vague++;
    const pr2 = J.prochain || { type: 'marcheur', x: 22 * T2, y: 6 * T2 }; J.prochain = null;
    const nm = nouveauMonstre(pr2.type, pr2.x, pr2.y); if (pr2.sol) nm.sol = true;
    if (nm.elite) { nm.pv++; nm.vit *= 1.15; }                   // élite : plus résistant, un peu plus vif
    J.monstres.push(nm);
    J.spawnT = rythmeSurvie(J.vague);
  }
  J.maxEnnemis = Math.max(J.maxEnnemis, J.monstres.length);

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
    if (m.type === 'fonceur') {                                      // fonce quand il voit le joueur à sa hauteur, après un préavis
      if (m.prep > 0) { if (--m.prep === 0) m.charge = 40; }
      else if (m.charge > 0) m.charge--;
      else if (Math.abs(pcy - cy) < 18 && Math.abs(pcx - cx) < 200 && m.sol) {
        const sens = Math.sign(pcx - cx) || m.dir; let libre = true;       // pas de mur entre lui et le joueur
        for (let xx = cx; Math.abs(xx - cx) < Math.abs(pcx - cx); xx += sens * 4) if (dur(xx, cy)) { libre = false; break; }
        if (libre) { m.prep = 24; m.dir = sens; }
      }
      if (m.charge > 0 && (dur(cx + m.dir * (m.r + 6), m.y + 1) || dur(cx + m.dir * (m.r + 6), m.y + d2 - 1))) m.charge = 0;   // il freine avant le mur
    }
    m.vx = (m.type === 'tireur' && m.sol) || m.prep > 0 ? 0 : m.dir * m.vit * (m.charge > 0 ? 2.6 : 1);
    m.vy = Math.min(8, m.vy + 0.45);
    if (m.type === 'sauteur' && m.sol && m.t % 70 === 0) m.vy = -6.6;
    if (m.type === 'rebond' && m.sol) m.vy = -5.8;                 // rebondit sans arrêt
    if (m.type === 'invocateur' && m.t % 240 === 120 && J.monstres.length < 40) { const p2 = nouveauMonstre('petit', m.x, m.y - 6); p2.vy = -3; J.monstres.push(p2); }
    if (m.type === 'archer' && m.sol && m.t % 130 === 0) {         // tir en cloche vers le joueur
      const dx = pcx - cx; J.balles.push([cx, cy - 4, Math.max(-3, Math.min(3, dx / 60)), -4.2, 260, 1]);
    }
    m.x += m.vx;
    if (dur(m.vx > 0 ? m.x + d2 : m.x, m.y + 1) || dur(m.vx > 0 ? m.x + d2 : m.x, m.y + d2 - 1)) { m.x -= m.vx; m.dir *= -1; m.charge = 0; m.garde = 40; }
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
    // écraser : il faut lui tomber dessus (en l'air, en descente, les pieds encore au-dessus de son centre juste avant)
    // écraser : il suffit que le bas de notre corps touche le haut de sa tête (pas besoin de lui tomber dessus)
    const pieds = (f) => Math.max(...M.formeJoueur(f).filter((_, i) => i % 2 === 1));
    const piedsAv = Math.min(pieds(e), J.ePrec ? pieds(J.ePrec) : Infinity);
    const foncePlasma = e.phase === M.P && e.dash > 0;               // foncer sur un ennemi en éclair de plasma : c'est nous qui y passons
    // l'ennemi a bougé cette image (en sautant, il monte vers nos pieds) : on compare aussi avec sa position d'avant ;
    // et si on est au-dessus de lui en descendant plus vite que lui, c'est nous qui l'écrasons
    const dessus = piedsAv <= cy - m.r * 0.35 + Math.abs(m.vy) + 1 || (pcy < cy - m.r * 0.4 && e.vy >= m.vy);
    if (!foncePlasma && dessus && m.type !== 'herisse') {
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
// ce qui rend les défis de la semaine et du mois différents des niveaux : des règles poussées à l'extrême
const TWISTS = {
  lasers: ['🔴', 'Lasers partout', 'des lasers balayeurs pivotent au-dessus de tout le parcours'],
  brouillardFort: ['🌫', 'Brouillard épais', 'on ne voit presque rien autour de soi'],
  quatre: ['4️⃣', 'Quatre transformations', 'une quatrième transformation, sur sa propre touche'],
  rebond: ['🏀', 'Rebonds ×2', 'ressorts, sols rebondissants, champignons et tremplins lancent deux fois plus haut'],
  sauts: ['🦘', 'Sauts ×1,7', 'chaque saut monte bien plus haut'],
  nuit: ['🌙', 'Nuit noire', 'presque rien n’est éclairé, des éclairs montrent le chemin'],
  rapide: ['⏩', 'Vitesse ×1,5', 'tout va une fois et demie plus vite'],
  unecharge: ['1️⃣', 'Une seule charge', 'une seule transformation entre deux recharges']
};
const ORDRE_TWISTS = ['lasers', 'quatre', 'rebond', 'brouillardFort', 'sauts', 'nuit', 'rapide', 'unecharge'];
function twistsDefi(per) {
  const cle = per === 'semaine' ? cleSemaine() : cleMois(), k = parseInt(cle.slice(1), 10), va = varianteDefi(per);
  const ok = ORDRE_TWISTS.filter(t => va.type === 'course' || t !== 'lasers');
  const a = ok[(k * 5 + (per === 'mois' ? 3 : 0)) % ok.length];
  if (per === 'semaine') return [a];
  const vision = ['brouillardFort', 'nuit'], vitesse = ['rapide'];
  const b = ok.filter(t => t !== a && !(vision.includes(a) && vision.includes(t)) && !(vitesse.includes(a) && vitesse.includes(t)))[(k * 3 + 1) % (ok.length - 2)];
  return [a, b];
}
function texteTwists(per) { return twistsDefi(per).map(t => TWISTS[t][0] + ' ' + tr(TWISTS[t][1])).join(' · '); }
// lasers partout : un balayeur au plafond du couloir partout où il y a la place (loin des autres pièges)
function ajouterLasers(carte) {
  const l = carte.map(r => r.split('')), W = l[0].length, mortel = new Set(['1', '2', '3', '4', '5', '^', 'f', 'L', 'F', 'E', 'Y', 'S', 'I', 'Z', 'z', 'C', 'K', 't', '_', '@', 'G', '!', 'e', '?']);
  let der = -99;
  for (let x = 10; x < W - 10; x++) {
    if (x - der < 6) continue;
    if (l[13][x] !== '#' || l[20][x] === '.') continue;
    let bon = true;
    for (let y = 14; y <= 19 && bon; y++) if (l[y][x] !== '.') bon = false;
    for (let xx = x - 2; xx <= x + 2 && bon; xx++) for (let y = 10; y <= 22; y++) if (mortel.has(l[y][xx])) { bon = false; break; }
    if (!bon) continue;
    l[13][x] = '5'; der = x;
  }
  return l.map(r => r.join(''));
}
function lancerDefiLong(per, msg) {
  const P = PERIODES[per], cle = per === 'semaine' ? cleSemaine() : cleMois();
  const graine = [...cle].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const va = varianteDefi(per), tw = twistsDefi(per);
  let etats4 = null;
  if (tw.includes('quatre')) {                         // quatre transformations : les salles s'en servent aussi
    etats4 = Gen.etatsAuHasard(Gen.hasard(graine * 3 + 1), undefined, 4);
  }
  const r = va.type === 'course' ? Gen.defi(graine, { nb: P.nb, d: P.d, etats: etats4 || undefined }) : Gen.vertical(graine % 100000, va.type, va.m);
  if (etats4 && r.etats.length < 4) { const reste = Gen.TOUS_ETATS.filter(x => !r.etats.includes(x)); r.etats = r.etats.concat([reste[graine % reste.length]]); }
  if (tw.includes('lasers')) r.carte = ajouterLasers(r.carte);
  const mods = { saut: tw.includes('sauts') ? 1.3 : 1, rebond: tw.includes('rebond') ? 1.41 : 1, uneCharge: tw.includes('unecharge') };
  for (const t of tw) mods[t] = true;
  const def = { id: 'defi', nom: P.nom, phases: r.etats.slice(), etats: r.etats, carte: r.carte, panneaux: [], mods };
  if (!msg) msg = texteTwists(per);
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
    <div class="menu ligne"><button class="btn" data-a="${J.periode === 'jour' ? 'defi' : 'defi-' + J.periode}" autofocus>${tr('Recommencer')} <small>${nomTouche(S.touches.recommencer[0])}</small></button>${J.periode !== 'jour' ? `<button class="btn" data-a="entr-defi" data-c="${J.periode}">🎯 ${tr('Entraînement')}</button>` : ''}
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
  if (salle > J.salle) {
    J.salle = salle;
    if (J.mode === 'expedition') {                   // on montre les fragments gagnés à chaque salle franchie
      const f = fragExpe(J.salle + (J.base || 0));
      if (f > (J.fragVu || 0)) { J.fragPlus = f - (J.fragVu || 0); J.fragVu = f; J.fragT = 120; }
    }
  }
}
function finInfini() {
  const mode = J.imode, n = J.salle, t = J.e.temps, ancien = S.infini[mode];
  ecran = 'fin';
  const record = !ancien || n > ancien.salles || (n === ancien.salles && t < ancien.t);
  if (record && !assiste()) S.infini[mode] = { salles: n, t };
  majSerie();
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
  if (J.mode === 'defi' && J.entrainement) { allerDrapeau(drapeauActif()); return; }
  if (J.mode === 'defi') { lancerDefiLong(J.periode); return; }
  if (J.mode === 'survie') { lancerSurvie(); return; }
  if (J.mode === 'special') { lancerSpecial(J.sp.id); return; }
  if (J.mode === 'tuto') { lancerTuto(); return; }
  if (J.mode === 'niveau' && J.entrainement) { allerDrapeau(drapeauActif()); return; }
  if (J.mode === 'niveau') lancerNiveau(J.idx);
  else if (J.mode === 'fantome') regarder(J.idx, J.cleRejeu || (J.quoi === 'ton record' ? 'record' : J.quoi === 'le Parfait' ? 'parfait' : 'parfait-eclat'));
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
let nivEntrainement = false, nivBot = false, botEclat = false, botType = 'parfait';      // onglets de l'écran des niveaux
// les trois robots : facile (faisable par un humain), humain (très dur), Parfait (le plus rapide possible, joué le plus simplement)
const NOMS_BOT = { facile: 'Difficile', humain: 'Professionnel', parfait: 'Parfait' };
const NOTES_BOT = {
  facile: 'Robot Difficile : chaque touche est tenue au moins une demi-seconde et il garde beaucoup de marge. Le plus simple à recopier.',
  humain: 'Robot Professionnel : le plus vite possible en restant reproductible, chaque touche tenue au moins 0,2 s, sans astuce à l’image près.',
  parfait: 'Robot Parfait : il joue parfaitement et finit dans le meilleur temps possible. Parmi les façons d’y arriver, il prend la plus simple.' };
function boutonsBot(action, choisi) { return ['facile', 'humain', 'parfait'].map(t => `<button class="btn mini ${choisi === t ? 'choisi' : ''}" data-a="${action}" data-v="${t}">${tr(NOMS_BOT[t])}</button>`).join(''); }
function drapeauxNiveau() {
  const n = J.n, out = [];
  for (let x = 0; x < n.w; x++) for (let y = 0; y < n.h; y++) if (n.g[y * n.w + x] === M.DRAPEAU) out.push([x, y]);
  // dans l'ordre du parcours : distance depuis le départ en passant par les cases libres (montées, descentes, détours)
  if (!n.ordreDrap) {
    const dist = new Int32Array(n.w * n.h).fill(-1), f = [], x0 = Math.floor((n.dep.x + M.W / 2) / M.T), y0 = Math.floor((n.dep.y + M.H / 2) / M.T);
    dist[y0 * n.w + x0] = 0; f.push(y0 * n.w + x0);
    for (let i = 0; i < f.length; i++) { const c = f[i], x = c % n.w, y = (c / n.w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= n.w || Y >= n.h) continue; const j = Y * n.w + X; if (dist[j] >= 0 || M.estDur(n.g[j])) continue; dist[j] = dist[c] + 1; f.push(j); } }
    n.ordreDrap = dist;
  }
  out.sort((a, b) => (n.ordreDrap[a[1] * n.w + a[0]] >>> 0) - (n.ordreDrap[b[1] * n.w + b[0]] >>> 0));
  return out;
}
// entraînement : deux fois plus de drapeaux. Un drapeau de plus au milieu de chaque tronçon, là où un robot
// s'est tenu debout (niveaux) ou, sans robot (défis), sur une case où l'on tient debout à mi-chemin.
function doublerDrapeaux() {
  const n = J.n, w = n.w, g = n.g;
  const debout = (tx, ty) => tx > 0 && ty > 1 && tx < w - 1 && ty < n.h - 1 && g[ty * w + tx] === M.VIDE && g[(ty - 1) * w + tx] === M.VIDE && g[(ty + 1) * w + tx] === M.MUR &&
    ![g[ty * w + tx - 1], g[ty * w + tx + 1], g[(ty - 1) * w + tx - 1], g[(ty - 1) * w + tx + 1]].some(k => k === M.PICS || k === M.FEU || k === M.EAU);
  const loinDe = (tx, ty, fl) => fl.every(([x, y]) => Math.abs(x - tx) + Math.abs(y - ty) > 4);
  const fl = drapeauxNiveau(), ajout = [];
  const src = J.mode === 'niveau' ? [HUM, PARF, FAC].map(b => b[J.L.id]).find(p => p && p.f) : null;
  if (src) {
    // on rejoue le robot sur le niveau d'origine et on note où il était à chaque image, et quand il a pris chaque drapeau
    const nn = M.charger(J.L.def), e = M.nouvelEtat(nn), ent = M.decompresser(src.f), pos = [], prises = [0];
    while (ent.length && !ent[0]) ent.shift();
    let cp = null;
    for (let i = 0; i < ent.length && !e.fini; i++) {
      M.pas(nn, e, ent[i]);
      pos.push(e.sol && e.vy >= 0 && e.mortT === 0 ? [Math.floor((e.x + M.W / 2) / M.T), Math.floor((e.y + M.H - 1) / M.T)] : null);
      if (e.cp && e.cp !== cp) { cp = e.cp; prises.push(i); }
    }
    prises.push(pos.length - 1);
    // autant de drapeaux en plus qu'il y en a déjà (au moins un) : chaque fois dans le tronçon le plus long à ce moment-là
    const seg = [];
    for (let k = 0; k + 1 < prises.length; k++) if (prises[k + 1] - prises[k] >= 80) seg.push({ a: prises[k], b: prises[k + 1], c: 0 });
    for (let r = 0; r < Math.max(1, fl.length) && seg.length; r++) seg.reduce((x, y) => (y.b - y.a) / (y.c + 1) > (x.b - x.a) / (x.c + 1) ? y : x).c++;
    for (const sg of seg) for (let j = 1; j <= sg.c; j++) {
      const m = Math.round(sg.a + (sg.b - sg.a) * j / (sg.c + 1)), lim = (sg.b - sg.a) / (sg.c + 1) / 2.2;
      for (let d = 0; d < lim; d++) {
        const c = [m + d, m - d].map(i => pos[i]).find(q => q && debout(q[0], q[1]) && loinDe(q[0], q[1], fl.concat(ajout)));
        if (c) { ajout.push(c); break; }
      }
    }
  } else {
    const dist = n.ordreDrap, cle = (x, y) => dist[y * w + x];
    let but = 0;
    for (let i = 0; i < w * n.h; i++) if (g[i] === M.BUT && dist[i] > but) but = dist[i];
    const bornes = [0].concat(fl.map(([x, y]) => cle(x, y)), [but]);
    for (let k = 0; k + 1 < bornes.length; k++) {
      const a = bornes[k], b = bornes[k + 1], m = (a + b) / 2;
      if (b - a < 40) continue;
      let best = null, bd = 1e9;
      for (let y = 1; y < n.h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const v = cle(x, y);
        if (v < 0 || Math.abs(v - m) > (b - a) / 4 || Math.abs(v - m) >= bd || !debout(x, y) || !loinDe(x, y, fl.concat(ajout))) continue;
        best = [x, y]; bd = Math.abs(v - m);
      }
      if (best) ajout.push(best);
    }
  }
  if (!ajout.length) return;
  for (const [x, y] of ajout) g[y * w + x] = M.DRAPEAU;
  n.ordreDrap = null; J.botDrap = null;
  R.etendre(n, 0);
}
// le drapeau où l'on réapparaîtrait (0 = départ)
function drapeauActif() { const e = J.e; if (!e || !e.cp) return J.drapeauDepart || 0; const k = drapeauxNiveau().findIndex(([x, y]) => x === e.cp.tx && y === e.cp.ty); return k < 0 ? (J.drapeauDepart || 0) : k + 1; }
function allerDrapeau(k) {
  const fl = drapeauxNiveau();
  const e = M.nouvelEtat(J.n);
  if (k > 0 && fl[k - 1]) { const [tx, ty] = fl[k - 1]; e.cp = { x: tx * M.T + (M.T - M.W) / 2, y: (ty + 1) * M.T - M.H, tx, ty }; e.x = e.cp.x; e.y = e.cp.y; }
  J.e = e; J.drapeauDepart = k; J.segT = 0; J.stats = null; recadrer = true;
  if (J.mode === 'niveau' && J.entrainement) { lancerFantomeEntr(k); calerSurFantome(); }
}
// entraînement : le fantôme du robot (son Parfait) repart du même drapeau que toi, où qu'il ait été à ce moment-là
function lancerFantomeEntr(k) {
  const p = botDe(S.fantEntr)[J.L.id];
  if (!p || !p.f) { J.fantome = null; return; }
  const eclE = !!(S.reglages.fantEclat && p.fe);
  const fl = drapeauxNiveau();
  if (!J.botDrap) {                                     // une seule fois : on rejoue le Parfait et on note chaque drapeau
    const ent = M.decompresser(eclE ? p.fe : p.f); while (ent.length && !ent[0]) ent.shift();
    const n = M.charger(LISTE[J.idx].def), e = M.nouvelEtat(n), pris = new Map(), pres = new Map();
    for (let i = 0; i < ent.length + 60 && !e.fini; i++) {
      M.pas(n, e, ent[i] || 0);
      if (eclE && e.fini && !e.eclat) e.fini = false;
      if (e.cp) { const c = e.cp.tx + ',' + e.cp.ty; if (!pris.has(c)) pris.set(c, i + 1); }
      fl.forEach(([fx, fy]) => { const c = fx + ',' + fy, d = Math.hypot(e.x - fx * M.T, e.y - fy * M.T); if (!pres.has(c) || d < pres.get(c)[0]) pres.set(c, [d, i + 1]); });
    }
    J.botDrap = { ent, n, pris, pres };
  }
  const B = J.botDrap, e = M.nouvelEtat(B.n);
  let i = 0;
  if (k > 0 && fl[k - 1]) {
    const [fx, fy] = fl[k - 1], c = fx + ',' + fy;
    i = B.pris.get(c) || (B.pres.get(c) || [0, 0])[1];
    for (let j = 0; j < i; j++) M.pas(B.n, e, B.ent[j] || 0);
    const x0 = fx * M.T + (M.T - M.W) / 2, y0 = (fy + 1) * M.T - M.H;
    if (Math.hypot(e.x - x0, e.y - y0) > 24) { e.x = x0; e.y = y0; e.vx = 0; e.vy = 0; }    // il n'était pas passé par là : on l'y place
    e.mortT = 0; e.fini = false;
  }
  J.fantome = { n: B.n, e, ent: B.ent, i, entr: true, eclat: eclE };
  J.attenteG = true;                                     // il ne repart qu'à notre prochaine touche
}
// on repart d'un drapeau : plateformes, scies, lasers… sont exactement là où le robot les a trouvés à ce drapeau,
// et on repart exactement comme lui : même transformation, même position, même élan (vitesse), mêmes charges
function calerSurFantome() {
  if (!J.fantome || !J.fantome.entr) return;
  const a = J.e, c = M.cloner(J.fantome.e);
  c.morts = a.morts; c.cp = a.cp || c.cp; c.cpN = a.cpN; c.demarre = a.demarre; c.mortT = 0; c.invT = 0; c.fini = false; c.ev = 0;
  c.inpPrev = J.inpAv || 0;                                      // les touches déjà tenues ne comptent pas comme de nouveaux appuis
  J.e = c; J.segT = c.temps; J.ePrec = null; recadrer = true;
}
/* ---------- Cristaux ◆ gagnés à chaque nouveau drapeau atteint (pas besoin de finir le niveau) ----------
   1 par drapeau ; en entraînement, 1 tous les 2 drapeaux. Chaque drapeau ne paie qu'une fois par essai. */
function cristalDrapeau() {
  const e = J.e;
  if (!(e.ev & M.EV.DRAPEAU) || !e.cp || J.mode === 'tuto') return;
  J.drPayes = J.drPayes || {};
  const c = e.cp.tx + ',' + e.cp.ty;
  if (J.drPayes[c]) return;
  J.drPayes[c] = 1;
  if (J.entrainement) { J.demiCristal = (J.demiCristal || 0) + 1; if (J.demiCristal < 2) return; J.demiCristal = 0; }
  gagnerBonus(1); J.cristalT = 90; J.cristalN = (J.cristalN || 0) + 1;
  if (!(J.drSauve > 0)) { J.drSauve = 1; setTimeout(() => { if (J) J.drSauve = 0; sauver(); }, 4000); }
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
  { id: 'parfaits', nom: 'Robot humain', but: 'Temps Parfaits égalés', p: [1, 3, 10, 24, 48], v: () => nbIl(r => (r.mMax || 0) >= MP) },
  { id: 'eclats', nom: 'Chasseur de robots', but: 'Robots Professionnels battus', p: [1, 10, 24, 36, 48], v: () => LISTE.filter(l => { const r = S.il[l.id]; return r && r.t != null && HUM[l.id] && r.t <= HUM[l.id].t; }).length },
  { id: 'propre', nom: 'Sans une égratignure', but: 'Niveaux finis sans tomber', p: [1, 5, 15, 30, 48], v: () => nbIl(r => r.sansChute) },
  { id: 'survie', nom: 'Survivant', but: 'Ennemis écrasés en une partie (record)', p: [10, 25, 50, 100, 200], v: () => (S.survie && (S.survie.killsMax || S.survie.kills)) || 0 },
  { id: 'massacre', nom: 'Écraseur', but: 'Ennemis écrasés en tout', p: [50, 250, 1000, 5000, 20000], v: () => S.cumul.kills },
  { id: 'infini', nom: 'Sans fin', but: 'Salles franchies en Expédition (record)', p: [10, 20, 40, 70, 100], v: () => Math.max((S.expedition && S.expedition.salles) || 0, (S.infini[2] && S.infini[2].salles) || 0) },
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
    for (let k = avant; k < r; k++) { gagnerBonus(RANGS[k].g); neufs.push([x, k]); if (STEAM) STEAM.succes(x.id + '_' + (k + 1)); }   // aussi en succès Steam
    if (r > avant) S.succes[x.id] = r;
  }
  if (neufs.length) sauver();
  return neufs.map(([x, k]) => `<div class="succes-neuf">🏆 ${tr(x.nom)} · <span style="color:${RANGS[k].c}">${tr(RANGS[k].nom)}</span> <span class="rose">+${RANGS[k].g} ◆</span></div>`).join('');
}
let scPage = 0;
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
  // 4 onglets de quelques grandes cartes : tout tient à l'écran sans rien réduire
  const GROUPES = [['🗺 ' + tr('Progression'), ['niveaux', 'zones', 'or', 'parfaits', 'eclats', 'propre']], ['⚔ ' + tr('Modes'), ['survie', 'massacre', 'infini', 'semaine', 'mois']],
    ['⏱ ' + tr('Endurance'), ['temps', 'chutes', 'sauts', 'formes', 'capas', 'km']], ['✨ ' + tr('Divers'), ['look', 'entr', 'rejeux']]];
  scPage = Math.max(0, Math.min(GROUPES.length - 1, scPage));
  const liste = GROUPES[scPage][1].map(id => SUCCES.find(x => x.id === id)).filter(Boolean);
  montrer(`<h2>🏆 ${tr('Succès')} <span class="rose">${nbRangs()} / ${SUCCES.length * 5}</span></h2>
    <div class="onglets">${GROUPES.map((g2, i) => `<button class="btn mini ${i === scPage ? 'choisi' : ''}" data-a="sc-page" data-i="${i}" ${i === scPage ? 'autofocus' : ''}>${g2[0]}</button>`).join('')}</div>
    <div class="sc-liste">${liste.map(carteS).join('')}</div>
    <div class="menu ligne"><button class="btn" data-a="accueil">${tr('Retour')}</button></div>`, 'large');
}
/* ---------- Pas de simulation ---------- */
function pas() {
  if (ecran !== 'jeu' || !J) return;
  let inp;
  if (J.mode === 'fantome') { inp = J.rejeu[J.ri++] || 0; if (J.ri > J.rejeu.length + 90) { finFantome(); return; } }
  else inp = lireEntrees();
  J.inp = inp;
  const avant = J.e.demarre, x0 = J.e.x, y0 = J.e.y;
  if (J.mode !== 'fantome') {
    if ((S.reglages.invincible || (J.bouclier && J.salle < J.bouclier)) && J.e.mortT === 0) J.e.invT = Math.max(J.e.invT, 2);
    if (S.reglages.chargesInf || (J.chargesJusque && J.salle < J.chargesJusque)) J.e.charges = M.K.charges;
    if (J.sautJusque && J.salle < J.sautJusque) J.e.bonus = Math.max(J.e.bonus, 1.2);
  }
  const fige = J.mode === 'niveau' && J.entrainement && J.attenteG && J.fantome && J.e.demarre && J.e.mortT === 0 && !(inp & ~(J.inpAv || 0));
  if (fige) { J.inpAv = inp; J.e.ev = 0; return; }
  M.pas(J.n, J.e, inp);
  if (J.entrainement && (J.e.ev & M.EV.INVINCIBLE)) J.e.invT = 0;   // entraînement : aucune invincibilité en réapparaissant
  compterStats(J.e, x0, y0);
  if (J.mode !== 'fantome') { noterDrapeau(); cristalDrapeau(); }
  if (J.mode === 'survie') majSurvie();
  if (J.mode === 'expedition' && (J.e.ev & M.EV.MORT) && --J.vies <= 0) J.finT = 50;
  if (J.mode === 'expedition' && J.finT > 0) { J.e.mortT = Math.max(J.e.mortT, 2); if (--J.finT === 0) { finExpedition(); return; } }
  if (J.mode === 'expedition' && J.salle >= J.prochainChoix && J.finT === 0) { choixBonus(); return; }
  const unevie = J.mode === 'infini' || J.mode === 'survie';
  if (unevie) {
    if (J.e.ev & M.EV.MORT) J.finT = 50;                      // une seule vie : la course s'arrête
    if (J.finT > 0) { J.e.mortT = Math.max(J.e.mortT, 2); if (--J.finT === 0) { if (J.mode === 'infini') finInfini(); else if (J.mode === 'survie') finSurvie(); else finDefi(); return; } }
  }
  if (J.monde) avancerMonde();
  if (J.mode === 'expedition' && J.e.ev & M.EV.MORT && J.vies > 0) { message = '❤ ' + tr('Plus que {0} vie(s)', J.vies); messageT = 90; }
  if (J.mode === 'defi' && J.limite && !J.entrainement && J.e.temps >= J.limite) { finDefi(); return; }
  if (J.e.demarre && J.mode !== 'fantome' && J.mode !== 'infini' && J.mode !== 'expedition') J.entrees.push(inp);
  if (J.e.demarre && J.mode !== 'fantome' && !J.e.fini) S.tempsJeu = (S.tempsJeu || 0) + 1;
  if (J.attenteG && (inp & ~(J.inpAv || 0))) J.attenteG = false;   // entraînement : une nouvelle touche relance le robot
  J.inpAv = inp;
  if (J.fantome && J.e.demarre && !J.attenteG) { const f = J.fantome; M.pas(f.n, f.e, f.ent[f.i++] || 0); if (f.eclat && f.e.fini && !f.e.eclat) f.e.fini = false; }
  if (!avant && J.e.demarre) recadrer = false;
  const ev = J.e.ev;
  if (J.mode === 'niveau' && J.entrainement && (ev & (M.EV.DRAPEAU | M.EV.INVINCIBLE))) {   // arrivé à un drapeau (ou reparti de lui) : le robot repart de là aussi
    const k = J.e.cp ? drapeauxNiveau().findIndex(([x, y]) => x === J.e.cp.tx && y === J.e.cp.ty) + 1 : 0;
    lancerFantomeEntr(Math.max(0, k));
    if (ev & M.EV.INVINCIBLE) calerSurFantome();               // réapparition : le monde repart du même instant que le robot
    else J.attenteG = false;              // simple passage d'un drapeau en courant : il part avec nous
  }
  if (ev & M.EV.CAPA) J.capas = (J.capas || 0) + 1;
  if (J.mode === 'niveau' && !(J.e.temps % 12)) aidePieges();
  if (J.mode === 'niveau' && !(J.e.temps % 30)) SON.intensite(J.n.w ? Math.max(0, (J.e.x / M.T / J.n.w - 0.7) / 0.3) : 0);
  if (ev) { R.evenements(J.e, J.n); SON.evenements(ev, J.e.phase); if (ev & M.EV.ECHEC) echec = 20; if (ev & M.EV.MORT) { S.morts++; vibrer(0.6, 160); } if (ev & M.EV.BOUM) vibrer(0.8, 120); if (ev & (M.EV.REBOND | M.EV.BOND)) vibrer(0.25, 60); }
  if (echec > 0) echec--;
  if (messageT > 0) messageT--;
  // mort avant le premier drapeau : on repart vraiment de zéro, chrono compris
  if (J.e.mortT === 1 && !unevie) {
    if (!J.e.cp && J.mode === 'niveau' && !J.entrainement) { lancerNiveau(J.idx); message = 'Retour au départ : chrono remis à zéro'; messageT = 80; return; }
    if (!J.e.cp && J.mode === 'defi' && !J.entrainement) { lancerDefiLong(J.periode, 'Retour au départ : chrono remis à zéro'); return; }
    if (J.entrainement) J.segT = J.e.temps + 20;
  }
  if (J.e.fini) {
    if (J.mode === 'course' && J.cat === 'cent' && J.n.aEclat && !J.e.eclat) {
      J.e.fini = false; message = 'Il te manque l’éclat ◆ de ce niveau !'; messageT = 60;
    } else terminer();
  }
}

function t0Entr() { return J.e.temps - (J.segT || 0); }
function terminer() {
  if (J.mode === 'fantome') { finFantome(); return; }
  if (J.mode === 'defi' && J.entrainement) {                 // entraînement sur un défi : rien n'est compté
    ecran = 'fin'; SON.attenuer(true);
    S.cumul.entr++;
    const neufs = verifierSucces();
    montrer(`<div class="fin"><div class="nomniv">🎯 ${tr('Entraînement')} · ${tr(J.type.nom)}</div><div class="temps">🏁 ${tr('Arrivée !')}</div>
      <div class="lignes"><div class="gris">${tr('Depuis le drapeau {0} · rien n’est compté en entraînement', J.drapeauDepart || 0)}</div>${neufs}</div>${statsHTML()}
      <div class="menu ligne"><button class="btn" data-a="recommencer" autofocus>${tr('Recommencer')}</button><button class="btn" data-a="defi-${J.periode}">${tr('Jouer pour de vrai')}</button><button class="btn" data-a="accueil">${tr('Menu')}</button></div></div>`, 'fin');
    return;
  }
  if (J.mode === 'defi') { finDefi(); return; }
  if (J.mode === 'special') { finSpecial(); return; }
  if (J.mode === 'tuto') { finTuto(); return; }
  const id = J.L.id, t = J.e.temps;
  if (J.mode === 'niveau' && J.entrainement) {
    ecran = 'fin'; SON.attenuer(true);
    S.cumul.entr++;
    const neufs = verifierSucces();
    montrer(`<div class="fin"><div class="nomniv">🎯 ${tr('Entraînement')} · ${id} ${tr(J.L.def.nom)}</div><div class="temps">🏁 ${tr('Arrivée !')}</div>
      <div class="lignes"><div class="gris">${tr('Depuis le drapeau {0} · rien n’est compté en entraînement', J.drapeauDepart || 0)}</div>${neufs}</div>${statsHTML()}
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
    S.il[id].obj = (S.il[id].obj || 0) | objectifsFaits(id, t);
    majSerie();
    if (STEAM && LB_PRET) STEAM.classementEnvoyer('niveau-' + id, t, M.compresser(J.entrees));
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
    SON.jouerMusique(musiqueNiveau(suivant));
  }
}

/* ---------- Médailles ---------- */
const MEDAILLES = [null, { nom: 'Bronze', c: '#d08a4a', k: 2.2 }, { nom: 'Argent', c: '#c9d3df', k: 1.5 }, { nom: 'Or', c: '#ffd34d', k: 1.2 }, { nom: 'Platine', c: '#9ff0e8', k: 1.1 }, { nom: 'Diamant', c: '#7ab8ff', k: 1.05 }, { nom: 'Parfait', c: '#ff6ad5', k: 1 }];
const MP = MEDAILLES.length - 1;              // indice du Parfait
function seuil(id, m) { const p = PARF[id]; return p && p.t ? Math.floor(p.t * MEDAILLES[m].k) : null; }
function medaille(id, t) {
  if (t == null || !PARF[id]) return 0;
  for (let m = MP; m >= 1; m--) if (t <= seuil(id, m)) return m;
  return 0;
}
function badge(m) { return m ? `<span class="med" style="--c:${MEDAILLES[m].c}">${tr(MEDAILLES[m].nom)}</span>` : ''; }

/* ---------- Son : un seul bouton coupe tout, et le rallumer rend les mêmes volumes ---------- */
function appliquerSon() {
  const c = !!S.reglages.coupe;
  SON.volumes(c ? 0 : S.reglages.sons, c ? 0 : S.reglages.musique);
  const b = document.getElementById('btnSon');
  if (b) { b.textContent = c ? '🔇' : '🔊'; b.classList.toggle('coupe', c); b.title = tr(c ? 'Remettre le son' : 'Couper le son'); }
}
function couperSon() { S.reglages.coupe = !S.reglages.coupe; appliquerSon(); sauver(); SON.demarrer(); }
/* ---------- Boucle ---------- */
let derniere = 0, acc = 0;
// le jeu tourne 21 % plus lentement que le temps réel (les chronos comptent le temps du jeu)
const VITESSE_JEU = 0.79;
function boucle(t) {
  requestAnimationFrame(boucle);
  const dt = Math.min(0.1, (t - (derniere || t)) / 1000);
  derniere = t;
  acc += dt * VITESSE_JEU * (+S.reglages.vitesse || 1) * vitEffet() * (J && J.entrainement && J.mode !== 'fantome' && !(J.e && J.e.mortT > 0) ? (+S.vitEntr || 1) : 1) * (J && J.ralenti && J.salle < J.ralenti ? 0.8 : 1) * (J && J.mode === 'fantome' ? (J.pauseRejeu ? 0 : J.vitesse || 1) : 1);
  barreRejeu();
  let k = 0;
  while (acc >= 1 / 60 && k < 6) { if (J) J.ePrec = M.cloner(J.e); pas(); acc -= 1 / 60; k++; }
  if (k === 6) acc = 0;
  dessiner(dt);
}
function dessiner(dt) {
  if (!J) { fondMenu(dt); return; }
  menuNiv = null;                                       // au retour au menu, un nouveau niveau en fond
  // au ralenti, on dessine entre deux images du moteur : le mouvement reste fluide (pas de saccade ni de tremblement)
  let e = J.e;
  if (J.ePrec && J.e.mortT === 0 && J.ePrec.mortT === 0) {                 // toujours interpolé : fluide malgré le ralenti
    const a = Math.max(0, Math.min(1, acc * 60)), p = J.ePrec;
    e = M.cloner(J.e);
    if (Math.abs(p.x - e.x) < 40 && Math.abs(p.y - e.y) < 40) { e.x = p.x + (J.e.x - p.x) * a; e.y = p.y + (J.e.y - p.y) * a; }
    if (J.e.temps - p.temps === 1) e.tR = p.temps + a;                                      // plateformes, scies, ennemis : à mi-chemin aussi
    if (p.broy >= 0 && J.e.broy >= 0 && Math.abs(J.e.broyX - p.broyX) < 40) e.broyX = p.broyX + (J.e.broyX - p.broyX) * a;
  }
  const eVrai = J.e, id = J.L.id, il = S.il[id], p = PARF[id];
  const hud = { meteo: J.L && J.L.def && J.L.def.meteo, brouillard: effet('brouillard') || effet('brouillardFort'), brouillardFort: effet('brouillardFort'), nuit: effet('nuit') ? J.e.temps : -1, zoomNiv: (J.L && J.L.def && J.L.def.zoom) || 1, nomSaut: nomSautHUD(), tactile: tactileVoulu(), titre: J.L.id + '  ' + tr(J.L.def.nom), nomsPhases: M.NOMS_PHASES.map(n => tr(n)), touches: nomsEtatsHUD(), nomsCapas: J.n && J.n.capacites ? M.NOMS_PHASES.map((_, p) => NIV.CAPA[p] ? tr(NIV.CAPA[p][0]) : '') : null, echec, recadrer, tremble: S.reglages.tremble, lignes: [], droite: [],
    mots: { charges: tr('CHARGES'), recharge: tr('reviennent au sol'), rechargeCristal: tr('reviennent : cristal, ressort') } };
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
    if (J.entrainement) {
      hud.texteCentre = '🎯 ' + tr('Entraînement'); hud.sousChrono = null; hud.couleurChrono = null;
      hud.titre = tr(ty.nom);
      hud.lignes = [{ t: tr('Pause : choisir un drapeau · Page préc. / suiv. : drapeau précédent / suivant'), c: '#ffd84a' }];
    }
  } else if (J.mode === 'expedition') {
    hud.chrono = e.temps; hud.titre = '🎲 ' + tr('Expédition');
    hud.texteCentre = tr('Salle {0}', J.salle + (J.base || 0) + 1);
    hud.sousChrono = '❤'.repeat(Math.max(0, J.vies)) + (S.expedition ? '   ·   ' + tr('record : {0} salles', S.expedition.salles) : '');
    const actifs = [[J.chargesJusque, '⚡'], [J.sautJusque, '🦘'], [J.ralenti, '🐢'], [J.bouclier, '🛡']].filter(b => b[0] && J.salle < b[0]).map(b => b[1] + ' ' + (b[0] - J.salle));
    if (actifs.length) hud.lignes.push({ t: actifs.join('   '), c: '#9ff' });
    // fragments gagnés pendant cette expédition ; « +N » bien visible juste après une salle franchie
    const fr = (J.fragVu || 0) + (J.fragBonus || 0);
    if (J.fragT > 0) J.fragT--;
    hud.lignes.push(J.fragT > 0 ? { t: tr('Fragments gagnés : {0}', fr) + '   +' + J.fragPlus, c: '#ff9ae6' } : { t: tr('Fragments gagnés : {0}', fr), c: '#e0b8ff' });
    hud.lignes.push({ t: tr('Prochain bonus : salle {0}', J.prochainChoix), c: '#aaa' });
    if (J.finT > 0) { hud.message = tr('Salles franchies : {0}', J.salle); hud.messageC = '#ff9ae6'; }
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
    hud.texteCentre = '🎯 ' + tr('Entraînement');                     // pas de chrono en entraînement
    if (J.attenteG && J.fantome && J.e.demarre) hud.attente = tr('Appuie sur une touche : le robot repart avec toi');
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
    hud.lignes.push({ t: tr('Touche leur tête avec le bas de ton corps !'), c: '#ffd84a' });
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
    if (!window.VITRINE) {
      hud.lignes.push({ t: tr('▶ Rejeu : {0}', tr(J.quoi)), c: '#ff6ad5' });
      hud.attente = tr('Échap pour quitter');
      hud.entrees = J.inp || 0;
    }
  } else {
    hud.chrono = e.temps;
    if (J.L.def.effet) hud.lignes.push({ t: EFFETS[J.L.def.effet][0] + ' ' + tr(EFFETS[J.L.def.effet][1]), c: '#9ff' });
    if (il && il.t != null) hud.lignes.push({ t: tr('Record  {0}', R.chrono(il.t)) });
    if (p && p.t) hud.lignes.push({ t: tr('Parfait  {0}', R.chrono(p.t)), c: MEDAILLES[MP].c });
    if (p && p.t) {
      const m = medaille(id, il && il.t);
      const vise = Math.min(MP, m + 1);
      if (m < MP) hud.lignes.push({ t: tr(MEDAILLES[vise].nom) + '  ' + R.chrono(seuil(id, vise)), c: MEDAILLES[vise].c });
      else hud.lignes.push({ t: tr('Parfait atteint !'), c: '#7dff9a' });
      if (il && il.t != null && e.temps > il.t) hud.couleurChrono = '#ffb0b0';
    }
    if (J.fantome) hud.lignes.push({ t: tr('Fantôme : {0}', BOTS[S.reglages.fantome] ? tr(NOMS_BOT[S.reglages.fantome]) + (J.fantome.eclat ? ' ◆' : '') : tr('record')), c: '#888' });
  }
  if (J.cristalT > 0) { J.cristalT--; hud.lignes.push({ t: '+1 ◆   ' + tr('Cristaux gagnés : {0}', J.cristalN), c: '#ff9ae6' }); }
  if (!e.demarre) hud.attente = J.entrainement ? tr('Bouge pour commencer : le robot part avec toi') : tr('Bouge pour lancer le chrono');
  if (S.reglages.entrees) { hud.entrees = J.inp || 0; hud.coulEtats = J.n.emplacements.map(p => R.COUL_PHASE[p]); }
  // panneau proche
  const cxp = (e.x + M.W / 2) / M.T, cyp = (e.y + M.H / 2) / M.T;
  for (const pn of J.n.panneaux) if (Math.abs(pn.x + 0.5 - cxp) < 3 && Math.abs(pn.y + 0.5 - cyp) < 2.5) { { const m = /^\[([1-4])\] (.*)$/.exec(pn.texte); const pe = m ? J.n.emplacements[+m[1] - 1] : -1; hud.panneau = m ? touchePhase(+m[1] - 1) + ' · ' + tr(m[2]) + (NIV.CAPA[pe] && J.n.capacites ? '   ↻ ' + tr(NIV.CAPA[pe][0]) + ' : ' + tr(NIV.CAPA[pe][1]) : '') : tr(pn.texte); } break; }
  if (assiste() && J.mode !== 'fantome') hud.lignes.push({ t: '♿ ' + tr('Assistance'), c: '#7dd3ff' });
  if (messageT > 0) { hud.message = tr(message); hud.messageC = J.couleurMsg || '#ff9ae6'; if (messageT === 1) J.couleurMsg = null; }
  if (J.fantome && J.fantome.entr) hud.fantomeFort = true;
  R.dessiner(e, J.fantome ? J.fantome.e : null, hud, dt);
  if (window.VITRINE_DESSUS) window.VITRINE_DESSUS();
}

/* ---------- Fond animé des menus ---------- */
let menuNiv = null, menuE = null, menuT = 0;
// fond du menu : un lent travelling sur un niveau tranquille, sans personnage, sans secousse ni éclair
// derrière le menu : le robot joue le Parfait d'un niveau au hasard, au ralenti (×0,1)
function fondMenu(dt) {
  menuT += dt;
  if (!menuNiv) {
    const ids = LISTE.map((l, i) => i).filter(i => PARF[LISTE[i].id] && PARF[LISTE[i].id].f);
    if (!ids.length) return;
    const L = LISTE[ids[Math.floor(Math.random() * ids.length)]], n = M.charger(L.def);
    const ent = M.decompresser(PARF[L.id].f); while (ent.length && !ent[0]) ent.shift();
    menuE = M.nouvelEtat(n);
    menuNiv = { L, n, ent, i: 0, acc: 0, prec: M.cloner(menuE) };
    R.preparer(n, L.zone.theme); R.recadrerMenu();
  }
  const mn = menuNiv;
  mn.acc += Math.min(dt, 0.1) * 60 * 0.1;
  while (mn.acc >= 1) {
    mn.acc -= 1; mn.prec = M.cloner(menuE);
    M.pas(mn.n, menuE, mn.ent[mn.i++] || 0); R.evenements(menuE, mn.n);
    if (menuE.fini || mn.i > mn.ent.length + 90) { menuNiv = null; return; }
  }
  let e = menuE;                                        // position adoucie entre deux images du moteur
  if (mn.prec && Math.abs(mn.prec.x - menuE.x) < 40 && Math.abs(mn.prec.y - menuE.y) < 40) { e = M.cloner(menuE); e.x = mn.prec.x + (menuE.x - mn.prec.x) * mn.acc; e.y = mn.prec.y + (menuE.y - mn.prec.y) * mn.acc; e.vx = mn.prec.vx + (menuE.vx - mn.prec.vx) * mn.acc; e.vy = mn.prec.vy + (menuE.vy - mn.prec.vy) * mn.acc; if (menuE.temps - mn.prec.temps === 1) e.tR = mn.prec.temps + mn.acc; }
  R.dessiner(e, null, null, dt);
}

/* ---------- Interface (menus en HTML) ---------- */
const ui = document.getElementById('ui');
function montrer(html, classe) {
  ui.className = 'visible ' + (classe || '');
  ui.innerHTML = '<div class="cadre">' + html + '</div>';
  // le symbole des éclats ◆ est toujours le même : rose
  const tw = document.createTreeWalker(ui, NodeFilter.SHOW_TEXT), lst = [];
  while (tw.nextNode()) if (tw.currentNode.nodeValue.includes('◆') && !(tw.currentNode.parentNode.classList && (tw.currentNode.parentNode.classList.contains('eclat-s') || tw.currentNode.parentNode.classList.contains('ecl')))) lst.push(tw.currentNode);
  for (const t of lst) { const f = document.createDocumentFragment(); t.nodeValue.split('◆').forEach((m, i) => { if (i) { const sp = document.createElement('span'); sp.className = 'eclat-s'; sp.textContent = '◆'; f.appendChild(sp); } if (m) f.appendChild(document.createTextNode(m)); }); t.parentNode.replaceChild(f, t); }
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
  const parfaits = LISTE.filter(l => medaille(l.id, S.il[l.id] && S.il[l.id].t) === MP).length;
  const nbSucces = nbRangs();
  const carte = (a, titre, sous, attr) => `<button class="btn carte" data-a="${a}" ${attr || ''}><b>${titre}</b><small>${sous}</small></button>`;
  montrer(`
  <div class="titre"><h1>SHIFTRUN</h1><p>${tr('Un jeu fait pour le speedrun : change de forme pour aller plus vite.')}</p>${serieActuelle() ? `<p class="serie">🔥 ${tr('Série : {0} jours de suite', serieActuelle())}</p>` : ''}</div>
  <div class="grille">
    ${S.tutoVu ? '' : carte('tuto', '🎓 ' + tr('Didacticiel'), tr('5 minutes pour apprendre à jouer, une idée à la fois'), 'autofocus')}
    ${carte('niveaux', '▶ ' + tr('Niveaux'), tr('Niveaux finis : {0} / {1}', faits, LISTE.length) + ' · ' + tr('Parfaits : {0}', parfaits) + ' · ' + tr('entraînement'), 'autofocus')}
    ${carte('expedition', '🎲 ' + tr('Expédition'), (S.expedition ? tr('record : {0} salles', S.expedition.salles) + ' · ' : '') + '🧩 ' + expe().frag + ' ' + tr('fragments'))}
    ${carte('survie', '⚔ ' + tr('Survivant'), S.survie ? tr('record : {0}', S.survie.kills + ' ✖ ' + tr('ennemis écrasés')) : tr('des ennemis de plus en plus nombreux : touche-leur la tête avec le bas de ton corps'))}
    ${carte('defi-semaine', '📅 ' + tr('Défi de la semaine') + ' · ' + tr(varianteDefi('semaine').nom) + ' · ' + texteTwists('semaine'), S.defis[cleSemaine()] ? tr('ton meilleur : {0}', R.chrono(S.defis[cleSemaine()].t)) : tr(varianteDefi('semaine').but))}
    ${carte('defi-mois', '🗓 ' + tr('Défi du mois') + ' · ' + tr(varianteDefi('mois').nom) + ' · ' + texteTwists('mois'), S.defis[cleMois()] ? tr('ton meilleur : {0}', R.chrono(S.defis[cleMois()].t)) : tr(varianteDefi('mois').but))}
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
      <canvas class="apercu ${boutiqueCat === 'trainee' || boutiqueCat === 'aura' ? 'large' : ''}" width="${boutiqueCat === 'trainee' || boutiqueCat === 'aura' ? 168 : 84}" height="84" data-c="${boutiqueCat}" data-s="${id}"></canvas>
      <b>${tr(nom)}</b><small>${porte ? tr(k === 0 ? 'porté' : 'porté · cliquer pour enlever') : a ? tr('à toi') : prix + ' ◆'}</small></button>`;
  });
  h += `</div><div class="menu ligne"><button class="btn" data-a="accueil" autofocus>${tr('Retour')}</button></div>`;
  montrer(h, 'large');
  // aperçus animés : le personnage avec cet objet (et le reste de ce qui est porté) ; il court pour montrer les traînées
  const cvs = [...ui.querySelectorAll('canvas.apercu')];
  let der = performance.now();
  const anime = (t) => {
    if (!cvs.length || !cvs[0].isConnected) return;
    const dt = Math.min(0.05, Math.max(0, (t - der) / 1000)); der = t;
    for (const cv of cvs) { const eq = Object.assign({}, S.app.equipe); eq[cv.dataset.c] = cv.dataset.s; R.apercuAnime(cv, eq, dt, cv.dataset.c === 'trainee' || cv.dataset.c === 'aura'); }
    requestAnimationFrame(anime);
  };
  requestAnimationFrame(anime);
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
  let h = '<h2>' + tr('Niveaux') + '</h2><div class="onglets"><button class="btn mini ' + (nivEntrainement || nivBot ? '' : 'choisi') + '" data-a="mode-normal">▶ ' + tr('Partie classique') + '</button><button class="btn mini ' + (nivEntrainement ? 'choisi' : '') + '" data-a="mode-entrainement">🎯 ' + tr('Entraînement') + '</button><button class="btn mini ' + (nivBot ? 'choisi' : '') + '" data-a="mode-bot">🤖 ' + tr('Regarder un robot') + '</button><button class="btn mini" data-a="tuto">🎓 ' + tr('Didacticiel') + '</button></div>'
    + (nivEntrainement ? '<p class="note">' + tr('Choisis un niveau, puis en pause choisis le drapeau d’où repartir. Rien n’est compté.') + '</p><div class="onglets"><button class="btn mini" data-a="entr-defi" data-c="semaine">🎯 📅 ' + tr('Défi de la semaine') + '</button><button class="btn mini" data-a="entr-defi" data-c="mois">🎯 🗓 ' + tr('Défi du mois') + '</button></div>' : '')
    + (nivBot ? '<div class="onglets">' + boutonsBot('bot-type', botType)  + '</div><p class="note">' + tr(NOTES_BOT[botType]) + '</p>' : '') + '<div class="onglets">' + NIV.ZONES.map((z, i) => {
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
      h += `<div class="nivw"><button class="btn niv ${fait ? 'fait' : 'afaire'}" data-a="${nivBot ? ('voir-' + botType + (botEclat && botDe(botType)[nv.id] && botDe(botType)[nv.id].fe ? '-eclat' : '')) : nivEntrainement ? 'entrainer' : 'jouer'}" data-i="${parId[nv.id]}" ${ok || (nivBot && botDe(botType)[nv.id]) ? '' : 'disabled'}>
        ${fait ? `<span class="etat">${tr('FINI')}</span>` : ''}<b>${nv.id}</b> ${tr(nv.nom)}<small>${r && r.t != null ? R.chrono(r.t) : '—'} ${badge(m)} <span class="parf">${tr('Parfait')} ${PARF[nv.id] ? R.chrono(PARF[nv.id].t) : '—'}</span> <span class="etoiles" title="${tr('Objectifs')}">${etoiles((r && r.obj) || 0)}</span>${nv.effet ? ` <span class="effet">${EFFETS[nv.effet][0]} ${tr(EFFETS[nv.effet][1])}</span>` : ''}${nv.meteo ? ` <span class="effet">${tr(METEO_NOMS[nv.meteo])}</span>` : ''} <span class="etn">${nv.etats.map(p => `<i style="color:${R.COUL_PHASE[p]}">${tr(M.NOMS_PHASES[p])}</i>`).join(' ')}</span> ${aE ? `<span class="ecl ${r && r.eclat ? 'oui' : ''}">◆</span>` : ''}</small></button></div>`;
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
      <p>${tr('Les éclats ◆ se gagnent dans tous les modes et achètent des apparences dans la boutique.')}</p>`],
    ['🔄 ' + tr('Transformations'), `<p>${tr('Chaque niveau te donne 3 états parmi ces 10, sur les touches {0} : les panneaux du début disent lesquels. Réappuie sur la touche de l’état où tu es pour utiliser sa compétence (elle coûte une charge). Une barrière de couleur ne laisse passer que l’état de sa couleur.', [k('solide'), k('liquide'), k('gaz')].map(x => x.split(' / ')[0]).join(' '))}</p>
      <p>${tr('Changer d’état coûte une charge (2 au maximum, ● bleus en bas). Elles reviennent en touchant le sol ou un cristal.')}</p>`],
    ['① ' + tr('États 1 à 5'), `<div class="etats">${[0, 1, 2, 3, 4].map(p => etatAide(p)).join('')}</div>`],
    ['② ' + tr('États 6 à 10'), `<div class="etats">${[5, 6, 7, 8, 9].map(p => etatAide(p)).join('')}</div>`],
    ['⚠ ' + tr('Pièges et objets'), `<p>${tr('Pièges : flèches tirées à intervalles réguliers, sols cassants, sols rebondissants, boutons qui ouvrent des portes.')}</p>
      <p>${tr('Orbe jaune : appuie sur saut en la touchant pour sauter en plein air. Tremplin vert : il te projette sur le côté.')}</p>
      <p>${tr('Interrupteur : les blocs rouges et bleus s’échangent. Flèche verte : sauts plus hauts un moment, flèche orange : sauts plus courts. Évite les ennemis hérissés.')}</p>
      <p>${tr('Cristal barré : cet état est interdit pendant quelques secondes. Il faut passer autrement.')}</p>
      <p>${tr('Plateformes mobiles : saute dessus, elles te portent. Champignon : il te renvoie au loin.')} ${tr('Lasers : ils s’allument par moments, un clignotement prévient juste avant. Scies : elles balaient le passage.')}</p>`],
    ['🔨 ' + tr('Machines'), `<p>${tr('Pilon : un bloc d’acier tremble puis tombe du plafond. Passe juste après sa chute.')}</p>
      <p>${tr('Scies en orbite : deux scies tournent autour d’un pivot.')} ${tr('Brûleur : il crache une flamme par moments ; le Torrent du Liquide l’éteint un moment.')}</p>
      <p>${tr('Geyser : quand il jaillit, il te projette tout en haut et recharge tes compétences.')} ${tr('Courant : sous l’eau, des traînées montrent le sens dans lequel il te pousse.')}</p>
      <p>${tr('Leviers : tire tous les leviers d’une zone pour ouvrir sa grille. Plaque colorée : elle te transforme sans dépenser de charge.')} ${tr('Bas : traverse les plateformes fines.')}</p>
      <p>${tr('Clé : elle ouvre la porte dorée (tu la perds si tu tombes avant un drapeau). Minuterie : la porte bleue s’ouvre quelques secondes. Plateformes violettes : elles vont et viennent en rythme. Zone inversée : on y tombe vers le haut. Broyeur : un mur de scies te poursuit, ne t’arrête pas !')}</p>`],
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
   <div class="son-bloc ${r.coupe ? 'coupe' : ''}"><div class="son-barres">
    <label>${tr('Bruitages')} <input type="range" min="0" max="1" step="0.05" value="${r.sons}" data-r="sons" ${r.coupe ? 'disabled' : ''}></label>
    <label>${tr('Musique')} <input type="range" min="0" max="1" step="0.05" value="${r.musique}" data-r="musique" ${r.coupe ? 'disabled' : ''}></label></div>
    <button class="btn mini son-btn" data-a="couper-son" title="${tr(r.coupe ? 'Remettre le son' : 'Couper le son')}" aria-label="${tr(r.coupe ? 'Remettre le son' : 'Couper le son')}">${r.coupe ? '🔇' : '🔊'}</button></div>
   <label>${tr('Langue')} <select data-r="langue">${Object.entries(window.Langue.LANGUES).map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}</select></label>
   <label>${tr('Fantôme en jeu')} <select data-r="fantome"><option value="aucun">${tr('Aucun')}</option><option value="record">${tr('Mon record')}</option>${['facile', 'humain', 'parfait'].map(t => `<option value="${t}">${tr(NOMS_BOT[t])}</option>`).join('')}</select></label>
   <label>${tr('Commandes tactiles')} <select data-r="tactile"><option value="auto">${tr('Auto')}</option><option value="oui">${tr('Toujours')}</option><option value="non">${tr('Jamais')}</option></select></label>
   <label>${tr('Afficher les touches à l’écran')} <input type="checkbox" data-r="entrees" ${r.entrees ? 'checked' : ''}></label>
   <label>${tr('Plein écran')} <input type="checkbox" data-r="pleinEcran" ${document.fullscreenElement ? 'checked' : ''}></label></div>`;
  else if (reglPage === 1) h += `<div class="regl">
   <label>${tr('Mode daltonien (symboles sur les barrières)')} <input type="checkbox" data-r="daltonien" ${r.daltonien ? 'checked' : ''}></label>
   <label>${tr('Tremblements de l’écran')} <input type="checkbox" data-r="tremble" ${r.tremble ? 'checked' : ''}></label>
   <label>${tr('Réduire les flashs')} <input type="checkbox" data-r="sansFlash" ${r.sansFlash ? 'checked' : ''}></label></div>
   <p class="note">${tr('Pour ralentir le jeu ou t’exercer sur un passage, utilise le mode Entraînement.')}</p>`;
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
// effets propres à certains niveaux (brouillard, une seule charge, vitesse ×1,5)
const EFFETS = { brouillard: ['🌫', 'Brouillard', 'on ne voit que tout près de soi'], unecharge: ['1️⃣', 'Une seule charge', 'une seule transformation entre deux recharges'], rapide: ['⏩', 'Vitesse ×1,5', 'tout va une fois et demie plus vite'],
  nuit: ['🌙', 'Nuit noire', 'presque rien n’est éclairé, des éclairs montrent le chemin'], grandsSauts: ['🦘', 'Sauts géants', 'tous les sauts vont plus haut'],
  acceleration: ['🚀', 'Accélération', 'le jeu va de plus en plus vite au fil du niveau'], pulsation: ['💓', 'Pulsation', 'le jeu accélère et ralentit en rythme'] };
// vitesse du jeu donnée par l'effet du niveau (le chrono compte les images : seul le temps réel change)
function vitEffet() {
  if (!J || !J.L || !J.L.def || !J.e) return 1;
  if (effet('rapide')) return 1.5;
  if (effet('acceleration')) return 1 + 0.6 * Math.max(0, Math.min(1, J.e.x / (J.n.w * M.T)));
  if (effet('pulsation')) return 1.1 + 0.25 * Math.sin(J.e.temps * Math.PI * 2 / 240);
  return 1;
}
const METEO_NOMS = { orage: 'Orage', neige: 'Neige', feux: 'Feux d’artifice' };
const effet = (nom) => !!(J && J.L && J.L.def && (J.L.def.effet === nom || (J.L.def.mods && J.L.def.mods[nom] === true)));

// 5 objectifs par niveau : finir, sans chute, médaille d'or, battre le robot Professionnel, sans aucune compétence
const OBJECTIFS = [['Finir le niveau', '🏁'], ['Sans aucune chute', '💚'], ['Médaille d’or ou mieux', '🥇'], ['Battre le robot Professionnel', '🧑'], ['Sans utiliser de compétence', '🚫']];
function objectifsFaits(id, t) {
  let b = 1;
  if (J.e.morts === 0) b |= 2;
  if (medaille(id, t) >= 3) b |= 4;
  if (!HUM[id] || t <= HUM[id].t) b |= 8;
  if (!J.capas) b |= 16;
  return b;
}
const etoiles = (o) => OBJECTIFS.map((_, k) => (o & (1 << k)) ? '★' : '☆').join('');
// série : au moins une partie finie chaque jour
function jourDe(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function majSerie() {
  const auj = jourDe(new Date()), hier = jourDe(new Date(Date.now() - 864e5));
  const se = S.serie || { der: '', n: 0 };
  if (se.der === auj) return;
  se.n = se.der === hier ? se.n + 1 : 1; se.der = auj; se.max = Math.max(se.max || 0, se.n);
  S.serie = se;
}
function serieActuelle() { const se = S.serie; if (!se) return 0; return (se.der === jourDe(new Date()) || se.der === jourDe(new Date(Date.now() - 864e5))) ? se.n : 0; }
// aide : la première fois qu'on croise une sorte de piège, une phrase s'affiche
const AIDE_PIEGES = () => ({ [M.PILON]: 'Pilon : il tremble puis tombe. Passe juste après sa chute.', [M.ORBITE]: 'Scies en orbite : regarde leur tour, passe quand elles sont loin.',
  [M.GEYSER]: 'Geyser : attends qu’il jaillisse, il te projette tout en haut.', [M.BRULEUR]: 'Brûleur : il crache des flammes par moments.', [M.LEVIER]: 'Levier : tire tous les leviers de la zone pour ouvrir la grille.',
  [M.PLAQUE0]: 'Plaque colorée : elle te transforme sans dépenser de charge.', [M.PLAQUE1]: 'Plaque colorée : elle te transforme sans dépenser de charge.', [M.PLAQUE2]: 'Plaque colorée : elle te transforme sans dépenser de charge.',
  [M.SAUTEUR]: 'Sauteur : il bondit sans arrêt, passe sous lui ou par-dessus.', [M.VOLANT]: 'Volant : il ondule dans les airs.', [M.LASER]: 'Laser : il clignote juste avant de s’allumer.',
  [M.ARBALETE]: 'Arbalète : elle tire à intervalles réguliers.', [M.CASSANT]: 'Sol cassant : il s’effondre juste après ton passage.', [M.BOUTON]: 'Bouton : il ouvre la porte qui suit.',
  [M.INTER]: 'Interrupteur : les blocs rouges et bleus s’échangent.', [M.ORBE]: 'Orbe : appuie sur saut en la touchant pour sauter en l’air.', [M.CHAMPI]: 'Champignon : il te renvoie au loin.',
  [M.CLE]: 'Clé : prends-la pour ouvrir la porte dorée. Tu la perds si tu tombes avant un drapeau.', [M.RYTHME]: 'Plateforme en rythme : elle apparaît et disparaît en cadence.',
  [M.MINUTEUR]: 'Minuterie : la porte bleue reste ouverte quelques secondes.', [M.APESANTEUR]: 'Zone inversée : tout y tombe vers le haut.' });
let aideCache = null;
function aidePieges() {
  if (!S.vus) S.vus = {};
  aideCache = aideCache || AIDE_PIEGES();
  const e = J.e, n = J.n, cx = Math.floor(e.x / M.T), cy = Math.floor(e.y / M.T);
  for (let x = cx; x < cx + 9; x++) for (let y = cy - 5; y < cy + 6; y++) {
    if (x < 0 || y < 0 || x >= n.w || y >= n.h) continue;
    const t = n.g[y * n.w + x], txt = aideCache[t];
    if (txt && !S.vus[t]) { S.vus[t] = 1; message = '💡 ' + tr(txt); messageT = 260; sauver(); return; }
  }
}
// mode Expédition : des salles sans fin, 3 vies, et toutes les 5 salles un bonus à choisir parmi 3
const BONUS = [['vie', '❤', 'Une vie de plus', 'Tu pourras tomber une fois de plus avant la fin de l’expédition.'],
  ['charges', '⚡', 'Charges infinies pendant 8 salles', 'Tu peux changer de transformation autant que tu veux, sans attendre de recharge.'],
  ['saut', '🦘', 'Sauts plus hauts pendant 8 salles', 'Chaque saut monte nettement plus haut, comme la flèche verte.'],
  ['ralenti', '🐢', 'Temps ralenti pendant 8 salles', 'Tout le jeu va un peu moins vite : plus de temps pour réagir.'],
  ['tresor', '🧩', 'Quelques fragments tout de suite', '5 fragments 🧩, plus un pour deux salles déjà franchies : peu au début, davantage quand on est loin.']];
// améliorations définitives de l'Expédition, payées en fragments (gagnés à chaque expédition, plus on va loin, plus il y en a)
const serieP = (b, k, n) => Array.from({ length: n }, (_, i) => Math.round(b * Math.pow(k, i) / 10) * 10);
const AMELIOS = [
  ['depart', '🚀', 'Partir plus loin : 10 salles de plus, plus dures mais qui rapportent plus', serieP(300, 1.8, 8)],
  ['profond', '💎', 'Les salles après la 30e rapportent 20 % de plus', serieP(500, 2, 6)],
  ['gain', '💰', 'Fragments : +15 %', serieP(100, 1.7, 10)],
  ['vie', '❤', 'Une vie de plus au départ', serieP(200, 3.5, 3)],
  ['choix', '🎲', 'Un bonus de plus à choisir', serieP(800, 6, 2)],
  ['souvent', '⏱', 'Un bonus toutes les 6 salles au lieu de 8', [3000]]];
function expe() {
  if (!S.exp) S.exp = { frag: 0, am: {} };
  if (S.exp.am.bouclier) {                       // l'invincibilité n'existe plus : on rend les fragments dépensés
    const P = [150, 450, 1350]; for (let i = 0; i < S.exp.am.bouclier; i++) S.exp.frag += P[i] || 0;
    delete S.exp.am.bouclier;
  }
  return S.exp;
}
const niv_am = (id) => expe().am[id] || 0;
function expeditionMenu() {
  J = null; ecran = 'menu';
  const x = expe(), rec = S.expedition;
  montrer(`<h2>🎲 ${tr('Expédition')}</h2><p class="note">${tr('Des salles sans fin, de plus en plus dures très lentement. Plus tu vas loin, plus tu gagnes de fragments 🧩, pour des améliorations définitives.')}</p>
    <div class="lignes"><div>🧩 <b>${x.frag}</b> ${tr('fragments')}${rec ? ' · ' + tr('record : {0} salles', rec.salles) : ''}</div></div>
    <div class="grille">${AMELIOS.map(([id, ic, nom, prix], k) => {
      const nv = niv_am(id), max = nv >= prix.length, c = prix[nv];
      return `<button class="btn carte" data-a="exp-ach" data-c="${id}" ${max || x.frag < c ? 'disabled' : ''}><b>${ic} ${tr(nom)}</b><small>${'●'.repeat(nv)}${'○'.repeat(prix.length - nv)} · ${max ? tr('au maximum') : '🧩 ' + c}</small></button>`;
    }).join('')}</div>
    <div class="menu ligne"><button class="btn" data-a="exp-partir" autofocus>▶ ${tr('Partir')}</button><button class="btn" data-a="accueil">${tr('Retour')}</button></div>`, 'large');
}
// assez de fragments pour au moins une amélioration ?
function peutAcheter() { const x = expe(); return AMELIOS.some(a => { const nv = niv_am(a[0]); return nv < a[3].length && x.frag >= a[3][nv]; }); }
function acheterAmelio(id) {
  const a = AMELIOS.find(x => x[0] === id), x = expe(), nv = niv_am(id);
  if (!a || nv >= a[3].length || x.frag < a[3][nv]) return;
  x.frag -= a[3][nv]; x.am[id] = nv + 1; sauver(); expeditionMenu();
  const b = ui.querySelector(`[data-a="exp-ach"][data-c="${id}"]:not([disabled])`); if (b) b.focus();   // on reste sur l'achat
}
function lancerExpedition() {
  const graine = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const base = niv_am('depart') * 10;                                                   // départ plus loin : plus dur, mais chaque salle rapporte plus
  const monde = new Gen.Infini(graine, 2, { drapeaux: true, rampe: [0.08, 0.008], depart: base });     // la difficulté monte très lentement
  const def = { id: 'exp', nom: 'Expédition', phases: monde.etats.slice(), etats: monde.etats, carte: monde.ajouter(6), panneaux: [] };
  const n = M.charger(def), e = M.nouvelEtat(n);
  R.preparer(n, (x) => monde.theme(x));
  recadrer = true;
  const pas5 = 8 - niv_am('souvent') * 2;                                            // un bonus toutes les 8 salles (6 avec l'amélioration)
  J = { mode: 'expedition', monde, n, e, entrees: [], L: { id: 'exp', def, zi: 0 }, salle: 0, base, finT: 0, vies: 3 + niv_am('vie'), prochainChoix: pas5, pasChoix: pas5, bonusPris: [],
    bouclier: undefined };
  S.essais++;
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique('infini');
}
function choixBonus() {
  ecran = 'choix'; SON.attenuer(true);
  const l = BONUS.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  montrer(`<div class="fin"><div class="nomniv">🎲 ${tr('Expédition')} · ${tr('Salle {0}', J.salle + (J.base || 0))}</div><div class="temps">${tr('Choisis un bonus')}</div>
    <div class="grille">${l.slice(0, 3 + niv_am('choix')).map((b, k) => `<button class="btn carte bonus-choix" data-a="bonus" data-c="${b[0]}" disabled ${k === 0 ? 'autofocus' : ''}><b>${b[1]} ${tr(b[2])}</b><small>${tr(b[3])}</small></button>`).join('')}</div>
    <div class="lignes"><div>${'❤'.repeat(Math.max(0, J.vies))} · ${tr('Bonus pris : {0}', J.bonusPris.length)}</div></div></div>`, 'fin');
  debloquerBonus();
}
function debloquerBonus() {
  setTimeout(() => { if (ecran !== 'choix') return; ui.querySelectorAll('.bonus-choix').forEach(b => { b.disabled = false; }); const p = ui.querySelector('.bonus-choix'); if (p) p.focus(); }, 450);
}
function prendreBonus(id) {
  if (ecran !== 'choix') return;
  if (id === 'vie') J.vies++;
  else if (id === 'charges') J.chargesJusque = J.salle + 8;            // 8 salles : ils aident à aller plus loin, donc à gagner plus
  else if (id === 'saut') J.sautJusque = J.salle + 8;
  else if (id === 'ralenti') J.ralenti = J.salle + 8;
  else if (id === 'bouclier') J.bouclier = J.salle + 2;
  else if (id === 'tresor') { const f = 5 + Math.floor((J.salle + (J.base || 0)) / 2); expe().frag += f; J.fragBonus = (J.fragBonus || 0) + f; J.fragPlus = f; J.fragT = 150; }   // peu au début : survivre rapporte autant
  J.bonusPris.push(id); J.prochainChoix += J.pasChoix || 8;
  J.e.invT = Math.max(J.e.invT, M.K.invincible);              // comme à une réapparition : un instant d'invincibilité
  ecran = 'jeu'; cacherUI();
}
// fragments gagnés en arrivant à la salle n (plus la salle est loin, plus elle rapporte)
function fragExpe(n) {
  const k = 1 + niv_am('gain') * 0.15;
  let frag = 0; for (let i = (J.base || 0) + 1; i <= n; i++) frag += (1 + Math.floor(i / 8)) * (i > 30 ? 1 + niv_am('profond') * 0.2 : 1);
  return Math.round(frag * k);
}
function finExpedition() {
  const n = J.salle + (J.base || 0), t = J.e.temps, ancien = S.expedition;
  const record = !ancien || n > ancien.salles;
  if (record && !assiste()) S.expedition = { salles: n, t };
  const k = 1 + niv_am('gain') * 0.15;
  const frag = fragExpe(n);
  expe().frag += frag;
  const gain = gagnerBonus(gainTemps(t));               // éclats ◆ : au même rythme que tous les modes (rien ne l'augmente)
  majSerie(); sauver();
  ecran = 'fin'; SON.attenuer(true);
  montrer(`<div class="fin"><div class="nomniv">🎲 ${tr('Expédition')}</div><div class="temps">${tr('Salles franchies : {0}', n)}</div>
    <div class="lignes">${record ? '<div class="vert">' + tr('Nouveau record !') + '</div>' : `<div>${tr('Record : {0}', '<b>' + tr('Salles : {0}', ancien.salles) + '</b>')}</div>`}
    <div class="gris">${R.chrono(t)} · ${tr('Bonus pris : {0}', J.bonusPris.length)}</div><div class="rose">+${frag} 🧩 ${tr('fragments')}</div>${gain ? `<div class="rose">+${gain} ◆ ${tr('pour la boutique')}</div>` : ''}</div>
    ${statsHTML()}<div class="menu ligne"><button class="btn" data-a="exp-partir" autofocus>${tr('Recommencer')}</button><button class="btn ${peutAcheter() ? '' : 'pauvre'}" data-a="expedition">🧩 ${tr('Améliorations')}</button><button class="btn" data-a="accueil">${tr('Menu')}</button></div></div>`, 'fin');
}
function finNiveau(t, avant, record) {
  const id = J.L.id, m = medaille(id, S.il[id].t), p = PARF[id];
  const mCe = medaille(id, t);
  let lignes = '';
  if (record && avant != null) lignes += `<div class="vert">${tr('Nouveau record ! {0}', R.ecart(t - avant))}</div>`;
  else if (record) lignes += '<div class="vert">' + tr('Premier temps enregistré') + '</div>';
  else lignes += `<div class="rouge">${tr('{0} sur ton record ({1})', R.ecart(t - avant), R.chrono(avant))}</div>`;
  if (p) {
    const vise = Math.min(MP, m + 1);
    lignes += `<div>${tr('Parfait : {0}', '<b>' + R.chrono(p.t) + '</b>')} ${t <= p.t ? '— <b class="rose">' + tr('ÉGALÉ !') + '</b>' : '(' + R.ecart(t - p.t) + ')'}</div>`;
    if (m < MP) lignes += `<div>${tr('Prochaine médaille : {0} en {1}', badge(vise), R.chrono(seuil(id, vise)))}</div>`;
  }
  const ob = S.il[id].obj || 0, obCe = objectifsFaits(id, t);
  lignes += `<div class="objectifs">${OBJECTIFS.map((o, k) => `<span class="${(obCe & (1 << k)) ? 'ok' : (ob & (1 << k)) ? 'deja' : ''}">${o[1]} ${tr(o[0])}</span>`).join('')}</div>`;
  lignes += `<div class="gris">${tr('Chutes : {0}', J.e.morts)}${J.n.aEclat ? ' · ' + (J.e.eclat ? tr('éclat ◆ pris') : tr('éclat pas pris')) : ''}</div>`;
  if (J.gainE > 0) lignes += `<div class="rose">+${J.gainE} ◆ ${tr('pour la boutique')}</div>`;
  lignes += J.succesNeufs || '';
  const suiv = J.idx + 1 < LISTE.length && zoneDebloquee(LISTE[J.idx + 1].zi);
  montrer(`<div class="fin"><div class="nomniv">${id} ${tr(J.L.def.nom)}</div><div class="temps">${R.chrono(t)}</div>${badge(mCe)}
    <div class="lignes">${lignes}</div>${splitsHTML(id)}${statsHTML()}
    <div class="menu ligne">
      <button class="btn" data-a="rejouer" ${suiv ? '' : 'autofocus'}>${tr('Recommencer')} <small>${nomTouche(S.touches.recommencer[0])}</small></button>
      ${suiv ? `<button class="btn" data-a="jouer" data-i="${J.idx + 1}" autofocus>${tr('Suivant')} <small>${tr('Entrée')}</small></button>` : ''}
      ${LB_PRET ? `<button class="btn" data-a="classement" data-i="${J.idx}">🌐 ${tr('Classement mondial')}</button>` : ''}
      <button class="btn" data-a="niveaux">${tr('Niveaux')}</button>
    </div></div>`, 'fin');
}
// barre du rejeu : pause, image par image, ralenti
const VITESSES = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
const barre = document.createElement('div');
barre.id = 'rejeu';
document.body.appendChild(barre);
let barreEtat = '';
function barreRejeu() {
  const on = J && J.mode === 'fantome' && ecran === 'jeu' && !window.VITRINE;
  const etat = on ? (J.pauseRejeu ? 'p' : '') + J.vitesse : '';
  if (etat === barreEtat) return;
  barreEtat = etat;
  if (!on) { barre.className = ''; barre.innerHTML = ''; return; }
  barre.className = 'visible';
  const foc = document.activeElement && barre.contains(document.activeElement) ? document.activeElement.dataset.r + (document.activeElement.dataset.v || '') : null;
  barre.innerHTML = `<button class="btn mini" data-r="arriere5">⏪ 3 s</button><button class="btn mini" data-r="pause">${J.pauseRejeu ? '▶' : '⏸'}</button><button class="btn mini" data-r="avant5">3 s ⏩</button><button class="btn mini" data-r="image" ${J.pauseRejeu ? '' : 'disabled'}>⏭ ${tr('image')}</button><button class="btn mini" data-r="quitter">✕ ${tr('Quitter')}</button><div class="rl"></div>` +
    VITESSES.map(v => `<button class="btn mini ${v === J.vitesse ? 'choisi' : ''}" data-r="v" data-v="${v}">×${String(v).replace('.', ',')}</button>`).join('') +
    `<div class="rl"></div><span>${tr('Flèches : choisir · Espace ou Entrée : valider')}</span>`;
  const b0 = foc ? [...barre.querySelectorAll('[data-r]')].find(x => x.dataset.r + (x.dataset.v || '') === foc) : null;
  (b0 || barre.querySelector('[data-r="pause"]')).focus();          // un bouton est toujours choisi
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
  if (a === 'avant5' || a === 'arriere5') { allerA(J.ri + (a === 'avant5' ? 180 : -180)); barreRejeu(); return; }
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
    <div class="menu ligne"><button class="btn" data-a="revoir" data-i="${idx}" autofocus>🔁 ${tr('Revoir')}</button><button class="btn" data-a="jouer" data-i="${idx}">${tr('Jouer ce niveau')}</button><button class="btn" data-a="niveaux" data-garde="1">${tr('Niveaux')}</button></div></div>`, 'fin');
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
    <button class="btn" data-a="rejouer">${tr(J.entrainement ? 'Repartir du point de sauvegarde' : J.mode === 'niveau' ? 'Recommencer le niveau' : 'Recommencer')}</button>
    ${J.entrainement ? `<div class="sous">${tr('Vitesse du jeu :')}</div><div class="drapeaux">${[0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(v => `<button class="btn mini ${(+S.vitEntr || 1) === v ? 'choisi' : ''}" data-a="vit-entr" data-v="${v}">×${String(v).replace('.', ',')}</button>`).join('')}</div>` : ''}
    ${J.entrainement && J.mode === 'niveau' ? `<div class="sous">${tr('Fantôme du robot :')}</div><div class="drapeaux">${boutonsBot('fant-entr', BOTS[S.fantEntr] ? S.fantEntr : 'parfait')}</div>` : ''}
    ${J.entrainement ? `<div class="sous">${tr('Repartir du drapeau :')}</div><div class="drapeaux"><button class="btn mini" data-a="drapeau" data-i="0">${tr('Départ')}</button>${drapeauxNiveau().map((f, k) => `<button class="btn mini" data-a="drapeau" data-i="${k + 1}">⚑ ${k + 1}</button>`).join('')}</div>` : ''}
    <button class="btn" data-a="${J.mode === 'niveau' ? 'niveaux' : 'accueil'}">${tr('Quitter')}</button></div>
    <div class="note">🎮 ${['saut', 'solide', 'liquide', 'gaz', 'recommencer', 'pause'].map(a => tr(NOMS_ACTIONS[a]) + ' = ' + (NOMS_BOUTONS[S.manette[a]] || '#' + S.manette[a])).join(' · ')} · ${tr('bas : traverser les plateformes fines')}</div></div>`, 'fin');
}

function action(a, el) {
  SON.demarrer();
  SON.bruitMenu('valider');
  const i = el && el.dataset.i != null ? +el.dataset.i : null;
  switch (a) {
    case 'accueil': accueil(); break;
    case 'expedition': expeditionMenu(); break;
    case 'exp-partir': lancerExpedition(); break;
    case 'exp-ach': acheterAmelio(el.dataset.c); break;
    case 'bonus': prendreBonus(el.dataset.c); break;
    case 'niveaux': if (!(J && J.entrainement) && !(el && el.dataset.garde)) nivEntrainement = false; J = null; ecran = 'menu'; niveaux(); break;
    case 'records': J = null; ecran = 'menu'; records(); break;
    case 'aide': aide(); break;
    case 'aide-page': aidePage = i; aide(); break;
    case 'regl-page': reglPage = i; reglages(); break;
    case 'sc-page': scPage = i; succesEcran(); break;
    case 'rec-zone': recZone = i; records(); break;
    case 'niv-zone': nivZone = i; niveaux(); break;
    case 'boutique': boutique(); break;
    case 'defi-semaine': lancerDefiLong('semaine'); break;
    case 'defi-mois': lancerDefiLong('mois'); break;
    case 'entrainement': case 'mode-entrainement': nivEntrainement = true; nivBot = false; J = null; ecran = 'menu'; niveaux(); break;
    case 'mode-normal': nivEntrainement = false; nivBot = false; niveaux(); break;
    case 'mode-bot': nivBot = true; nivEntrainement = false; niveaux(); break;
    case 'couper-son': { couperSon(); reglages(); const bs = ui.querySelector('[data-a=couper-son]'); if (bs) bs.focus(); break; }
    case 'bot-avec': botEclat = !botEclat; niveaux(); break;            // deux cases indépendantes : éclat et humain
    case 'bot-type': botType = el.dataset.v; niveaux(); break;
    case 'voir-facile': regarder(i, 'facile'); break;
    case 'voir-facile-eclat': regarder(i, 'facile-eclat'); break;
    case 'voir-humain': regarder(i, 'humain'); break;
    case 'voir-humain-eclat': regarder(i, 'humain-eclat'); break;
    case 'entrainer': lancerNiveau(i); J.entrainement = true; doublerDrapeaux(); lancerFantomeEntr(0); break;
    case 'entr-defi': lancerDefiLong(el.dataset.c); J.entrainement = true; drapeauxNiveau(); doublerDrapeaux(); J.drapeauDepart = 0; J.segT = 0; break;
    case 'drapeau': allerDrapeau(i); ecran = 'jeu'; cacherUI(); break;
    case 'fant-entr': S.fantEntr = el.dataset.v; sauver(); J.botDrap = null; allerDrapeau(drapeauActif()); ecran = 'jeu'; pause(); break;
    case 'fant-eclat': { S.reglages.fantEclat = !S.reglages.fantEclat; sauver(); J.botDrap = null; allerDrapeau(drapeauActif()); ecran = 'jeu'; pause(); const b = ui.querySelector('[data-a=fant-eclat]'); if (b) b.focus(); break; }
    case 'vit-entr': S.vitEntr = +el.dataset.v; sauver(); ecran = 'jeu'; pause(); break;
    case 'succes': succesEcran(); break;
    case 'survie': lancerSurvie(); break;
    case 'tuto': lancerTuto(); break;
    case 'classement': classementMondial(i); break;
    case 'fantome-mondial': { const en = CLASSEMENT[+el.dataset.k]; if (en && en.fantome) regarderEntrees(i, M.decompresser(en.fantome), en.nom); break; }
    case 'special': lancerSpecial(el.dataset.s); break;

    case 'app': choisirApp(el.dataset.c, el.dataset.s); break;
    case 'cat': boutiqueCat = el.dataset.c; boutique(); break;
    case 'reglages': reglages(); break;
    case 'jouer': lancerNiveau(i); break;
    case 'revoir': { const c = J && J.cleRejeu, v = J && J.vitesse; regarder(i, c || 'parfait'); if (J && v) J.vitesse = v; break; }
    case 'voir-parfait': regarder(i, 'parfait'); break;
    case 'voir-parfait-eclat': regarder(i, 'parfait-eclat'); break;
    case 'voir-record': regarder(i, 'record'); break;
    case 'course-any': lancerCourse('any'); break;
    case 'course-cent': lancerCourse('cent'); break;
    case 'reprendre': ecran = 'jeu'; cacherUI(); break;
    case 'rejouer': if (J && J.entrainement && (J.mode === 'niveau' || J.mode === 'defi')) { if (ecran === 'fin') allerDrapeau(J.drapeauDepart || 0); else allerDrapeau(drapeauActif()); ecran = 'jeu'; cacherUI(); } else if (J && J.mode === 'expedition') lancerExpedition(); else if (J && J.mode === 'survie') lancerSurvie(); else if (J && J.mode === 'defi' && J.periode !== 'jour') lancerDefiLong(J.periode); else if (J && J.mode === 'defi') lancerDefi(); else if (J && J.mode === 'infini') lancerInfini(J.imode); else if (J && J.mode === 'course') lancerCourse(J.cat); else if (J) { if (J.mode === 'fantome') lancerNiveau(J.idx); else lancerNiveau(J.idx); } break;
    case 'recommencer':
      if (ecran === 'jeu') recommencer();
      else if (ecran === 'fin' && J && J.entrainement && (J.mode === 'niveau' || J.mode === 'defi')) { allerDrapeau(J.drapeauDepart || 0); ecran = 'jeu'; cacherUI(); }
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
  if (k === 'sons' || k === 'musique') S.reglages.coupe = false;          // bouger un volume rallume le son
  appliquerSon();
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
  const enJeu = ecran === 'jeu';
  if (enJeu && J && J.mode === 'fantome') {
    // la barre du rejeu se pilote comme les menus : les touches de déplacement choisissent un bouton, Espace / Entrée l'activent
    const bs = [...barre.querySelectorAll('[data-r]:not([disabled])')];
    const dir = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 }[ev.code], vert = { ArrowUp: -1, KeyW: -1, ArrowDown: 1, KeyS: 1 }[ev.code];
    if (dir || vert || ev.code === 'Tab') {
      ev.preventDefault();
      const now = performance.now();
      if (ev.repeat && now - (barre.der || 0) < 190) return;
      barre.der = now;
      const k = bs.indexOf(document.activeElement);
      let b;
      if (vert) {                                     // haut / bas : le bouton de la rangée d'au-dessus / d'en dessous le plus proche
        const a = (bs[k] || bs[0]).getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
        const rangs = bs.map(x => { const r = x.getBoundingClientRect(); return { x, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }).filter(o => vert > 0 ? o.cy > ay + 4 : o.cy < ay - 4);
        if (rangs.length) { const ry = vert > 0 ? Math.min(...rangs.map(o => o.cy)) : Math.max(...rangs.map(o => o.cy)); b = rangs.filter(o => Math.abs(o.cy - ry) < 6).sort((p, q) => Math.abs(p.cx - ax) - Math.abs(q.cx - ax))[0].x; }
      } else { const d = ev.code === 'Tab' ? (ev.shiftKey ? -1 : 1) : dir; b = bs[k < 0 ? 0 : (k + d + bs.length) % bs.length]; }
      if (b) { b.focus(); SON.bruitMenu('menu'); } return;
    }
    if (ev.code === 'Space' || ev.code === 'Enter' || ev.code === 'NumpadEnter') {
      ev.preventDefault(); if (ev.repeat) return;
      if (barre.contains(document.activeElement)) document.activeElement.click(); else rejeu('pause');
      return;
    }
    if (ev.code === 'Escape' && !ev.repeat) { ev.preventDefault(); rejeu('quitter'); return; }
    return;
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
    if (ecran === 'fin') { action(J && (J.mode === 'niveau' || J.mode === 'fantome') ? 'niveaux' : 'accueil'); return; }
  }
  if (ecran === 'fin' && S.touches.recommencer.includes(ev.code) && J && (J.mode === 'niveau' || J.mode === 'infini' || J.mode === 'defi') && !ev.repeat) { action('recommencer'); return; }
  // une touche tenue dans un menu : on attend 0,4 s, puis on avance doucement (5 fois par seconde), jamais au rythme du clavier
  if (/^(Arrow|Key[WASD]$)/.test(ev.code)) {
    const now = performance.now();
    if (!ev.repeat) { menuRep.debut = now; menuRep.der = now; }
    else { if (now - menuRep.debut < 400 || now - menuRep.der < 190) { ev.preventDefault(); return; } menuRep.der = now; }
  }
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
const menuRep = { debut: 0, der: 0 };
// navigation dans l'espace : on va au bouton le plus proche dans la direction choisie (grilles, onglets, listes)
function focusables() { return [...ui.querySelectorAll('.btn:not([disabled]), select, input')].filter(x => x.offsetParent !== null); }
function naviguer([dx, dy]) {
  const liste = focusables();
  if (!liste.length) return;
  const cur = document.activeElement;
  if (!liste.includes(cur)) { liste[0].focus(); return; }
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bs = Infinity;
  for (let passe = 0; passe < 3 && !best; passe++) {            // 3e passage : n'importe quel bouton dans cette direction (rien d'inaccessible)
    for (const b of liste) {
      if (b === cur) continue;
      const r = b.getBoundingClientRect(), bx = r.left + r.width / 2, by = r.top + r.height / 2;
      // le bord de départ du voisin doit être au-delà du nôtre dans la direction voulue
      const prim = dx > 0 ? r.left - a.right : dx < 0 ? a.left - r.right : dy > 0 ? r.top - a.bottom : a.top - r.bottom;
      if (prim < -4 || (dx ? (bx - ax) * dx : (by - ay) * dy) <= 4) continue;
      // 1er passage : seulement ce qui chevauche notre rangée (ou colonne) ; 2e : le plus proche dans un cône de 45°
      const chev = dx ? Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top) : Math.min(a.right, r.right) - Math.max(a.left, r.left);
      const sec = dx ? Math.abs(by - ay) : Math.abs(bx - ax);
      if (passe === 0 && chev <= 2) continue;
      if (passe === 1 && sec > Math.max(prim, 0) + 40) continue;
      const sc = Math.max(prim, 0) + sec * (passe ? 1.5 : 0.3);
      if (sc < bs) { bs = sc; best = b; }
    }
  }
  if (!best) {                                           // au bord : on repart de l'autre côté, dans la même rangée (ou colonne)
    const meme = liste.filter(b => { const r = b.getBoundingClientRect(); return dx ? Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top) > 2 : Math.min(a.right, r.right) - Math.max(a.left, r.left) > 2; });
    const ord = (meme.length > 1 ? meme : liste).slice().sort((p, q) => { const r1 = p.getBoundingClientRect(), r2 = q.getBoundingClientRect(); return dy ? (r1.top - r2.top) * dy : (r1.left - r2.left) * dx; });
    best = ord[0] === cur ? null : ord[0];
  }
  if (best) { best.focus(); best.scrollIntoView && best.scrollIntoView({ block: 'nearest' }); SON.bruitMenu('menu'); }
}
addEventListener('keyup', ev => { tenues.delete(ev.code); });
addEventListener('blur', () => tenues.clear());

// le curseur de la souris disparaît après 2,5 s d'immobilité et revient dès qu'on la bouge
let curseurT = 0;
addEventListener('pointerdown', (ev) => { if (ev.pointerType !== 'mouse') { clearTimeout(curseurT); document.body.classList.remove('sanscurseur'); return; } if (document.body.classList.contains('sanscurseur')) { document.body.classList.remove('sanscurseur'); clearTimeout(curseurT); curseurT = setTimeout(() => document.body.classList.add('sanscurseur'), 2500); } }, true);
addEventListener('pointermove', (ev) => { if (ev.pointerType !== 'mouse') return; document.body.classList.remove('sanscurseur'); clearTimeout(curseurT); curseurT = setTimeout(() => document.body.classList.add('sanscurseur'), 2500); });
// la manette partout hors de la course : menus, réglages, rejeux, éditeur (elle « appuie » sur les touches du clavier)
function toucheVirtuelle(code, o) {
  o = o || {};
  const ev = new KeyboardEvent(o.haut ? 'keyup' : 'keydown', { code, key: code, shiftKey: !!o.maj, ctrlKey: !!o.ctrl, repeat: !!o.repet, bubbles: true, cancelable: true });
  window.dispatchEvent(ev);
}
let manetteRep = 0, manetteRepT = 0;
setInterval(() => {
  const rejeuEnCours = ecran === 'jeu' && J && J.mode === 'fantome';
  if (ecran === 'jeu' && !rejeuEnCours) { manetteNav = 0; return; }
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let b = 0;
  for (const p of pads) {
    if (!p) continue;
    const bt = (i) => p.buttons[i] && p.buttons[i].pressed;
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    if (bt(13) || ay > 0.5) b |= 1;
    if (bt(12) || ay < -0.5) b |= 2;
    if (bt(15) || ax > 0.5) b |= 16;
    if (bt(14) || ax < -0.5) b |= 32;
    for (const [k, bit] of [[0, 4], [1, 8], [2, 64], [3, 128], [4, 256], [5, 512], [6, 1024], [7, 2048], [8, 4096], [9, 8192]]) if (bt(k)) b |= bit;
  }
  if (attenteManette) {                                     // on attend le nouveau bouton pour une action
    for (const p of pads) if (p) for (let k = 0; k < p.buttons.length; k++) if (p.buttons[k] && p.buttons[k].pressed && !((manetteNav >> 4) & (1 << k))) {
      for (const a in S.manette) if (S.manette[a] === k) S.manette[a] = S.manette[attenteManette];
      S.manette[attenteManette] = k; attenteManette = null; sauver(); reglages(); manetteNav = 0xffff0; return;
    }
    let tous = 0; for (const p of pads) if (p) for (let k = 0; k < Math.min(16, p.buttons.length); k++) if (p.buttons[k] && p.buttons[k].pressed) tous |= 1 << k;
    manetteNav = tous << 4; return;
  }
  if (manetteNav >= 0xffff0) { manetteNav = b; return; }     // juste après un réglage de bouton : on attend qu'il soit relâché
  const pr = b & ~manetteNav, lache = manetteNav & ~b; manetteNav = b;
  // directions, avec répétition quand on les tient (curseur de l'éditeur, listes)
  const dir = b & 51;
  const fl = (bits) => { if (bits & 1) toucheVirtuelle('ArrowDown', { repet: bits === -1 }); if (bits & 2) toucheVirtuelle('ArrowUp'); if (bits & 16) toucheVirtuelle('ArrowRight'); if (bits & 32) toucheVirtuelle('ArrowLeft'); };
  if (pr & 51) { fl(pr & 51); manetteRep = dir; manetteRepT = Date.now() + 400; }
  else if (dir && dir === manetteRep && Date.now() > manetteRepT) { fl(dir); manetteRepT = Date.now() + 190; }
  else if (!dir) manetteRep = 0;
  if (rejeuEnCours) {                                     // rejeu : A pause, ↑ ↓ vitesse, ← → ±5 s, B quitter
    if (pr & 4) toucheVirtuelle('Space');
    if (pr & 8) toucheVirtuelle('Escape');
    return;
  }
  const el = document.activeElement;
  if (pr & 4) { if (el && (el.classList.contains('btn') || el.tagName === 'BUTTON')) el.click(); else if (el && el.type === 'checkbox') el.click(); else naviguer([0, 1]); }
  if (pr & 8) toucheVirtuelle('Escape');
  if (pr & 256) toucheVirtuelle('ArrowLeft');                 // LB / RB : onglet précédent / suivant (quand on est sur les onglets)
  if (pr & 512) toucheVirtuelle('ArrowRight');
}, 40);

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
appliquerSon();

tactiles();
accueil();
SON.demarrer();                                         // la musique du menu démarre tout de suite (sinon au premier geste)
requestAnimationFrame(boucle);
window.Jeu = { SUCCES, RANGS, LISTE, S, DEFIS, defiDuJour, cleJour, get J() { return J; }, lancerNiveau, regarder, lancerCourse, pas, action };
if (MUET) console.log('Phase : son coupé (?muet)');
})();
