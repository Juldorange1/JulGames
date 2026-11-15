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
const NOMS_ACTIONS = { gauche: 'Gauche', droite: 'Droite', haut: 'Haut', bas: 'Bas (fracas)', saut: 'Saut / giclée / jet', solide: 'Solide', /* traduits à l'affichage */
  liquide: 'Liquide', gaz: 'Gaz', plasma: 'Plasma (éclair)', recommencer: 'Recommencer', pause: 'Pause' };
let S = { il: {}, course: {}, infini: {}, reglages: { sons: 0.5, musique: 0.5, fantome: 'record', entrees: false, tremble: true }, touches: null, essais: 0, morts: 0 };
try { const d = JSON.parse(localStorage.getItem(CLE)); if (d) S = Object.assign(S, d); } catch (err) { /* pas de stockage */ }
if (!S.infini) S.infini = {};
if (!S.defis) S.defis = {};
S.reglages = Object.assign({ sons: 0.5, musique: 0.5, fantome: 'record', entrees: false, tremble: true, langue: window.Langue.detecter(), tactile: 'auto' }, S.reglages);
window.Langue.choisir(S.reglages.langue);
if (!S.touches) S.touches = JSON.parse(JSON.stringify(TOUCHES_DEF));
for (const k in TOUCHES_DEF) if (!S.touches[k]) S.touches[k] = TOUCHES_DEF[k].slice();
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
    if (bt(0)) b |= M.E.SAUT;
    if (bt(2)) b |= M.E.S;
    if (bt(3)) b |= M.E.L;
    if (bt(1)) b |= M.E.Z;
    if (bt(5) || bt(7) || bt(4) || bt(6)) b |= M.E.P;
    if (bt(8)) sp |= 1;
    if (bt(9)) sp |= 2;
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
}
function regarder(idx, cle) {
  const id = LISTE[idx].id, p = cle === 'record' ? S.il[id] : PARF[id];
  if (!p || !p.f) return;
  const c = charger(idx);
  const ent = M.decompresser(p.f);
  while (ent.length && !ent[0]) ent.shift();
  J = Object.assign(c, { mode: 'fantome', idx, rejeu: ent, ri: 0, quoi: cle === 'record' ? 'ton record' : 'le Parfait' });
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
  const monde = new Gen.Infini(graine, mode);
  const def = { id: 'inf' + mode, nom: 'Infini · difficulté ' + mode, phases: TOUTES, carte: monde.ajouter(6), panneaux: [] };
  const n = M.charger(def);
  const e = M.nouvelEtat(n);
  R.preparer(n, (x) => monde.theme(x));
  recadrer = true;
  J = { mode: 'infini', imode: mode, monde, n, e, entrees: [], L: { id: 'inf' + mode, def, zi: 0 }, salle: 0, finT: 0 };
  S.essais++;
  ecran = 'jeu'; cacherUI();
  SON.jouerMusique('infini');
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
function lancerDefi(msg) {
  const force = new URLSearchParams(location.search).get('defi');           // ?defi=pieces : pour tester un type
  const cle = cleJour(), type = DEFIS.find(d => d.id === force) || defiDuJour(cle);
  let r = null, monde = null, phases = TOUTES;
  if (type.id === 'minute') monde = new Gen.Infini(cle, 1, { drapeaux: true, rampe: [0.3, 0.03] });
  else if (type.id === 'survie') monde = new Gen.Infini(cle, 2, { rampe: [0.2, 0.045] });
  else if (type.id === 'pieces') r = Gen.defi(cle, { pieces: true, nb: 30, d: 0.55 });
  else if (type.id === 'sansfaute') r = Gen.defi(cle, { drapeaux: false, nb: 16 });
  else if (type.id === 'solide') { r = Gen.defi(cle, { types: Gen.TOUS.filter(t => Gen.SALLES[t].phases.length === 1), d: 0.7 }); phases = [0]; }
  else r = Gen.defi(cle);
  const def = { id: 'defi', nom: 'Défi du jour', phases, carte: monde ? monde.ajouter(6) : r.carte, panneaux: [] };
  const n = M.charger(def);
  const e = M.nouvelEtat(n);
  R.preparer(n, monde ? (x) => monde.theme(x) : (x) => Gen.THEMES_INF[(cle + Math.floor(x / 90)) % 8]);
  recadrer = true;
  let fantome = null;
  const best = S.defis[cle];
  if (type.score === 'temps' && S.reglages.fantome !== 'aucun' && best && best.f) {
    const ent = M.decompresser(best.f); while (ent.length && !ent[0]) ent.shift();
    const n2 = M.charger(def); fantome = { n: n2, e: M.nouvelEtat(n2), ent, i: 0 };
  }
  J = { mode: 'defi', type, cle, n, e, monde, entrees: [], fantome, L: { id: 'defi', def, zi: 0 }, salle: 0, finT: 0,
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
  if (record) { if (type.score === 'temps') res.f = M.compresser(J.entrees); S.defis[cle] = res; }
  sauver();
  ecran = 'fin';
  SON.attenuer(true);
  const jours = Object.keys(S.defis).length;
  montrer(`<div class="fin"><div class="nomniv">${tr('Défi du jour · {0}', tr(type.nom))} · ${dateDefi(cle)}</div><div class="temps">${texteScore(type, res)}</div>
    <div class="lignes">${record ? '<div class="vert">' + tr(ancien ? 'Meilleur résultat du jour !' : 'Premier résultat du jour') + '</div>' : `<div>${tr('Ton meilleur du jour : {0}', '<b>' + texteScore(type, ancien) + '</b>')}</div>`}
    <div class="gris">${type.score !== 'temps' ? R.chrono(t) + ' · ' : ''}${tr('Chutes : {0}', J.e.morts)} · ${tr('Défis relevés : {0} · un nouveau défi demain', jours)}</div></div>
    <div class="menu ligne"><button class="btn" data-a="defi" autofocus>${tr('Recommencer')} <small>${nomTouche(S.touches.recommencer[0])}</small></button>
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
  const record = !ancien || n > ancien.salles || (n === ancien.salles && t < ancien.t);
  if (record) S.infini[mode] = { salles: n, t };
  sauver();
  ecran = 'fin';
  SON.attenuer(true);
  montrer(`<div class="fin"><div class="nomniv">${tr('Infini · difficulté {0}', mode)}</div><div class="temps">${tr('Salles franchies : {0}', n)}</div>
    <div class="lignes">${record ? '<div class="vert">' + tr('Nouveau record !') + '</div>' : `<div>${tr('Record : {0}', '<b>' + tr('Salles : {0}', ancien.salles) + '</b>')}</div>`}
    <div class="gris">${R.chrono(t)} · ${tr('Difficulté atteinte : {0} %', Math.round(J.monde.difficulte(n) / 1.2 * 100))}</div></div>
    <div class="menu ligne"><button class="btn" data-a="infini${mode}" autofocus>${tr('Recommencer')} <small>${nomTouche(S.touches.recommencer[0])}</small></button>
    <button class="btn" data-a="accueil">${tr('Menu')}</button></div></div>`, 'fin');
}

function recommencer() {
  if (!J) return;
  if (J.mode === 'infini') { lancerInfini(J.imode); return; }
  if (J.mode === 'defi') { lancerDefi(); return; }
  if (J.mode === 'niveau') lancerNiveau(J.idx);
  else if (J.mode === 'fantome') regarder(J.idx, J.quoi === 'ton record' ? 'record' : 'parfait');
  else if (J.mode === 'course') {
    // en course, R ramène au dernier drapeau (le chrono continue)
    if (J.e.mortT === 0 && J.e.demarre) { J.e.mortT = 1; J.e.morts++; }
  }
}

/* ---------- Pas de simulation ---------- */
function pas() {
  if (ecran !== 'jeu' || !J) return;
  let inp;
  if (J.mode === 'fantome') { inp = J.rejeu[J.ri++] || 0; if (J.ri > J.rejeu.length + 90) { finFantome(); return; } }
  else inp = lireEntrees();
  J.inp = inp;
  const avant = J.e.demarre;
  M.pas(J.n, J.e, inp);
  const unevie = J.mode === 'infini' || (J.mode === 'defi' && J.type.id === 'survie');
  if (unevie) {
    if (J.e.ev & M.EV.MORT) J.finT = 50;                      // une seule vie : la course s'arrête
    if (J.finT > 0) { J.e.mortT = Math.max(J.e.mortT, 2); if (--J.finT === 0) { if (J.mode === 'infini') finInfini(); else finDefi(); return; } }
  }
  if (J.monde) avancerMonde();
  if (J.mode === 'defi' && J.limite && J.e.temps >= J.limite) { finDefi(); return; }
  if (J.e.demarre && J.mode !== 'fantome' && J.mode !== 'infini') J.entrees.push(inp);
  if (J.fantome && J.e.demarre) { const f = J.fantome; M.pas(f.n, f.e, f.ent[f.i++] || 0); }
  if (!avant && J.e.demarre) recadrer = false;
  const ev = J.e.ev;
  if (ev) { R.evenements(J.e, J.n); SON.evenements(ev, J.e.phase); if (ev & M.EV.ECHEC) echec = 20; if (ev & M.EV.MORT) { S.morts++; vibrer(0.6, 160); } if (ev & M.EV.BOUM) vibrer(0.8, 120); if (ev & (M.EV.REBOND | M.EV.BOND)) vibrer(0.25, 60); }
  if (echec > 0) echec--;
  if (messageT > 0) messageT--;
  // mort avant le premier drapeau : on repart vraiment de zéro, chrono compris
  if (J.e.mortT === 1 && !unevie) {
    if (J.mode === 'defi' && J.type.id === 'sansfaute') { lancerDefi('Chute ! Tout recommence.'); return; }
    if (!J.e.cp && J.mode === 'niveau') { lancerNiveau(J.idx); message = 'Retour au départ : chrono remis à zéro'; messageT = 80; return; }
    if (!J.e.cp && J.mode === 'defi' && J.type.score === 'temps') { lancerDefi('Retour au départ : chrono remis à zéro'); return; }
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
  const id = J.L.id, t = J.e.temps;
  if (J.mode === 'niveau') {
    const ancien = S.il[id] || {};
    const record = ancien.t == null || t < ancien.t;
    const avant = ancien.t;
    if (record) S.il[id] = Object.assign(ancien, { t, f: M.compresser(J.entrees), morts: J.e.morts });
    if (J.e.eclat) S.il[id].eclat = true;
    S.il[id].fois = (S.il[id].fois || 0) + 1;
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
function boucle(t) {
  requestAnimationFrame(boucle);
  const dt = Math.min(0.1, (t - (derniere || t)) / 1000);
  derniere = t;
  acc += dt;
  let k = 0;
  while (acc >= 1 / 60 && k < 6) { pas(); acc -= 1 / 60; k++; }
  if (k === 6) acc = 0;
  dessiner(dt);
}
function dessiner(dt) {
  if (!J) { fondMenu(dt); return; }
  const e = J.e, id = J.L.id, il = S.il[id], p = PARF[id];
  const hud = { tactile: tactileVoulu(), titre: J.L.id + '  ' + tr(J.L.def.nom), nomsPhases: M.NOMS_PHASES.map(n => tr(n)), touches: [0, 1, 2, 3].map(touchePhase), echec, recadrer, tremble: S.reglages.tremble, lignes: [], droite: [] };
  if (J.mode === 'defi') {
    const ty = J.type, b = S.defis[J.cle] && S.defis[J.cle].type === ty.id ? S.defis[J.cle] : null;
    hud.titre = tr('Défi du jour · {0}', tr(ty.nom));
    if (J.limite) { hud.chrono = Math.max(0, J.limite - e.temps); if (hud.chrono < 600) hud.couleurChrono = '#ff9a7a'; }
    else hud.chrono = e.temps;
    if (ty.score === 'salles') hud.sousChrono = tr('Salle {0}', J.salle + 1);
    if (ty.score === 'pieces') hud.sousChrono = tr('Pièces {0} / {1}', e.pieces.length, J.pieces);
    if (b) { hud.lignes.push({ t: tr('Meilleur du jour  {0}', texteScore(ty, b)), c: '#ff9ae6' }); if (ty.score === 'temps' && e.temps > b.t) hud.couleurChrono = '#ffb0b0'; }
    hud.lignes.push({ t: tr(ty.but), c: '#bbb' });
    if (J.finT > 0) { hud.message = tr('Fin : {0}', tr('Salles : {0}', J.salle)); hud.messageC = '#ff9ae6'; }
  } else if (J.mode === 'infini') {
    const rec = S.infini[J.imode];
    hud.chrono = e.temps;
    hud.titre = tr('Infini · difficulté {0}', J.imode);
    hud.sousChrono = tr('Salle {0}', J.salle + 1) + (rec ? '   ·   ' + tr('record : {0} salles', rec.salles) : '');
    hud.sousCouleur = rec && J.salle > rec.salles ? '#7dff9a' : '#ddd';
    hud.lignes.push({ t: tr('Difficulté {0} %', Math.round(J.monde.difficulte(J.salle) / 1.2 * 100)), c: '#aaa' });
    hud.lignes.push({ t: tr('Une seule vie'), c: '#ff8a8a' });
    if (J.finT > 0) { hud.message = tr('Salles franchies : {0}', J.salle); hud.messageC = '#ff9ae6'; }
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
  for (const pn of J.n.panneaux) if (Math.abs(pn.x + 0.5 - cxp) < 3 && Math.abs(pn.y + 0.5 - cyp) < 2.5) { hud.panneau = tr(pn.texte); break; }
  if (messageT > 0) { hud.message = tr(message); hud.messageC = '#ff9ae6'; }
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
  ui.innerHTML = html;
  const b = ui.querySelector('[autofocus]') || ui.querySelector('.btn:not([disabled])');
  if (b) b.focus();
}
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
  montrer(`
  <div class="titre"><h1>PHASE</h1><p>${tr('Un jeu fait pour le speedrun. Solide, liquide, gaz, plasma : change d’état pour aller plus vite.')}</p></div>
  <div class="menu">
    <button class="btn gros" data-a="niveaux" autofocus>${tr('Jouer')}</button>
    <button class="btn" data-a="course-any" ${tousFaits() ? '' : 'disabled'}>${tr('Course complète')} <small>${tousFaits() ? (S.course.any ? tr('record {0}', R.chrono(S.course.any.t)) : tr('tous les niveaux d’un trait')) : tr('finis tous les niveaux pour la débloquer')}</small></button>
    <button class="btn" data-a="course-cent" ${tousFaits() ? '' : 'disabled'}>${tr('Course 100 %')} <small>${S.course.cent ? tr('record {0}', R.chrono(S.course.cent.t)) : tr('avec tous les éclats ◆')}</small></button>
    <button class="btn" data-a="defi">${tr('Défi du jour · {0}', tr(defiDuJour(cleJour()).nom))} <small>${tr(defiDuJour(cleJour()).but)}${S.defis[cleJour()] ? ' — ' + tr('ton meilleur : {0}', texteScore(defiDuJour(cleJour()), S.defis[cleJour()])) : ''}</small></button>
    <button class="btn" data-a="infini1">${tr('Infini · difficulté {0}', 1)} <small>${S.infini[1] ? tr('record : {0} salles', S.infini[1].salles) : tr('salles générées sans fin, de plus en plus dures, une seule vie')}</small></button>
    <button class="btn" data-a="infini2">${tr('Infini · difficulté {0}', 2)} <small>${S.infini[2] ? tr('record : {0} salles', S.infini[2].salles) : tr('commence déjà dur et monte plus vite')}</small></button>
    <button class="btn" data-a="records">${tr('Records')}</button>
    <button class="btn" data-a="aide">${tr('Comment jouer')}</button>
    <button class="btn" data-a="reglages">${tr('Réglages')}</button>
  </div>
  <div class="pied">${tr('Niveaux finis : {0} / {1} · Parfaits : {2} · Chutes : {3}', faits, LISTE.length, parfaits, S.morts)}</div>`, 'accueil');
}

function niveaux() {
  let h = '<h2>' + tr('Niveaux') + '</h2><div class="zones">';
  NIV.ZONES.forEach((z, zi) => {
    const ok = zoneDebloquee(zi), th = R.THEMES[z.theme];
    h += `<div class="zone ${ok ? '' : 'ferme'}" style="--a:${th.accent};--f:${th.ciel[0]}"><div class="znom">${zi + 1}. ${tr(z.nom)}<span>${z.phases.map(p => tr(M.NOMS_PHASES[p])).join(' · ')}</span></div>`;
    z.niveaux.forEach(nv => {
      const r = S.il[nv.id], m = medaille(nv.id, r && r.t), aE = M.charger(nv).aEclat;
      h += `<button class="btn niv" data-a="jouer" data-i="${parId[nv.id]}" ${ok ? '' : 'disabled'}>
        <b>${nv.id}</b> ${tr(nv.nom)}<small>${r && r.t != null ? R.chrono(r.t) : '—'} ${badge(m)} <span class="parf">${tr('Parfait')} ${PARF[nv.id] ? R.chrono(PARF[nv.id].t) : '—'}</span> ${aE ? `<span class="ecl ${r && r.eclat ? 'oui' : ''}">◆</span>` : ''}</small></button>`;
    });
    if (!ok) h += '<div class="verrou">' + tr('Finis la zone précédente') + '</div>';
    h += '</div>';
  });
  h += '</div><div class="menu ligne"><button class="btn" data-a="accueil">' + tr('Retour') + '</button></div>';
  montrer(h, 'large');
}

function records() {
  let h = '<h2>' + tr('Records') + '</h2><table class="rec"><tr><th>' + tr('Niveau') + '</th><th>' + tr('Record') + '</th><th>' + tr('Médaille') + '</th><th>' + tr('Parfait') + '</th><th></th></tr>';
  for (const l of LISTE) {
    const r = S.il[l.id], p = PARF[l.id];
    h += `<tr><td><b>${l.id}</b> ${tr(l.def.nom)}</td><td>${r && r.t != null ? R.chrono(r.t) : '—'}</td><td>${badge(medaille(l.id, r && r.t))}</td>
      <td>${p ? R.chrono(p.t) : '—'}</td><td>${p ? `<button class="btn mini" data-a="voir-parfait" data-i="${parId[l.id]}">${tr('▶ Parfait')}</button>` : ''}
      ${r && r.f ? `<button class="btn mini" data-a="voir-record" data-i="${parId[l.id]}">${tr('▶ Mien')}</button>` : ''}</td></tr>`;
  }
  const sb = sommeMeilleurs(), sp = sommeParfaits();
  h += `</table><div class="totaux"><div>${tr('Somme de tes records')} <b>${sb != null ? R.chrono(sb) : '—'}</b></div><div>${tr('Somme des Parfaits')} <b>${sp != null ? R.chrono(sp) : '—'}</b></div>
    <div>${tr('Infini · difficulté {0}', 1)} <b>${S.infini[1] ? tr('Salles : {0}', S.infini[1].salles) : '—'}</b></div><div>${tr('Infini · difficulté {0}', 2)} <b>${S.infini[2] ? tr('Salles : {0}', S.infini[2].salles) : '—'}</b></div>
    <div>${tr('Course complète')} <b>${S.course.any ? R.chrono(S.course.any.t) : '—'}</b></div><div>${tr('Course 100 %')} <b>${S.course.cent ? R.chrono(S.course.cent.t) : '—'}</b></div></div>
    <p class="note">${tr('Le temps « Parfait » est celui d’un robot qui a cherché le parcours le plus rapide sur le vrai moteur du jeu. Bronze : ×2,2 · Argent : ×1,5 · Or : ×1,2 · Parfait : l’égaler.')}</p>
    <div class="menu ligne"><button class="btn" data-a="accueil">${tr('Retour')}</button></div>`;
  montrer(h, 'large');
}

function aide() {
  const k = (a) => S.touches[a].map(nomTouche).join(' / ');
  montrer(`<h2>${tr('Comment jouer')}</h2><div class="aide">
  <p>${tr('Va le plus vite possible jusqu’au portail. Le chrono démarre au premier geste et se compte à l’image près. Tomber ou toucher des pics te renvoie au dernier drapeau ; avant le premier drapeau, tout recommence à zéro.')}</p>
  <div class="etats">
   <div style="--c:${R.COUL_PHASE[0]}"><b>${k('solide')} · ${tr('Solide')}</b>${tr('Court, saute, fait des sauts muraux. En l’air, Bas : fracas qui brise les blocs fêlés. Saute juste après : rebond.')}</div>
   <div style="--c:${R.COUL_PHASE[1]}"><b>${k('liquide')} · ${tr('Liquide')}</b>${tr('Colle aux murs et aux plafonds, passe les grilles, glisse vite. Sa vitesse se convertit : contre un mur elle devient montée, une chute devient élan.')}</div>
   <div style="--c:${R.COUL_PHASE[2]}"><b>${k('gaz')} · ${tr('Gaz')}</b>${tr('Monte tout seul, traverse les tamis, porté par le vent. Redevient solide au bout d’un moment. Touche le feu : explosion qui propulse.')}</div>
   <div style="--c:${R.COUL_PHASE[3]}"><b>${k('plasma')} · ${tr('Plasma')}</b>${tr('Éclair dans les 8 directions qui brise les blocs fêlés. Éclair vers le sol puis saut : super saut.')}</div>
  </div>
  <p>${tr('Changer d’état coûte une charge (2 au maximum, ◆ bleus en bas). Elles reviennent en touchant le sol ou un cristal.')}</p>
  <p>${tr('Pièges : flèches tirées à intervalles réguliers, sols cassants, sols rebondissants, boutons qui ouvrent des portes. Chaque niveau cache un éclat ◆ très difficile à atteindre.')}</p>
  <p>${tr('Clavier : {0} recommencer, {1} pause. Manette : A saut, X solide, Y liquide, B gaz, gâchettes plasma, Start pause, Select recommencer. Écran tactile : croix à gauche, saut et états à droite.', k('recommencer'), k('pause'))}</p></div>
  <div class="menu ligne"><button class="btn" data-a="accueil">${tr('Retour')}</button></div>`, 'large');
}

let attenteTouche = null;
function reglages() {
  const r = S.reglages;
  let h = `<h2>${tr('Réglages')}</h2><div class="regl">
   <label>${tr('Langue')} <select data-r="langue">${Object.entries(window.Langue.LANGUES).map(([c, n]) => `<option value="${c}">${n}</option>`).join('')}</select></label>
   <label>${tr('Bruitages')} <input type="range" min="0" max="1" step="0.05" value="${r.sons}" data-r="sons"></label>
   <label>${tr('Musique')} <input type="range" min="0" max="1" step="0.05" value="${r.musique}" data-r="musique"></label>
   <label>${tr('Fantôme en jeu')} <select data-r="fantome"><option value="aucun">${tr('Aucun')}</option><option value="record">${tr('Mon record')}</option><option value="parfait">${tr('Le Parfait')}</option></select></label>
   <label>${tr('Commandes tactiles')} <select data-r="tactile"><option value="auto">${tr('Auto')}</option><option value="oui">${tr('Toujours')}</option><option value="non">${tr('Jamais')}</option></select></label>
   <label>${tr('Afficher les entrées')} <input type="checkbox" data-r="entrees" ${r.entrees ? 'checked' : ''}></label>
   <label>${tr('Tremblements de l’écran')} <input type="checkbox" data-r="tremble" ${r.tremble ? 'checked' : ''}></label>
  </div><h3>${tr('Touches')} <small>${tr('(clique puis appuie sur la nouvelle touche)')}</small></h3><div class="touches">`;
  for (const a in TOUCHES_DEF) {
    h += `<div><span>${tr(NOMS_ACTIONS[a])}</span><button class="btn mini" data-a="touche" data-t="${a}" data-k="0">${nomTouche(S.touches[a][0])}</button>
      <button class="btn mini" data-a="touche" data-t="${a}" data-k="1">${nomTouche(S.touches[a][1])}</button></div>`;
  }
  h += `</div><div class="menu ligne"><button class="btn" data-a="touches-defaut">${tr('Touches par défaut')}</button><button class="btn danger" data-a="effacer">${tr('Tout effacer')}</button><button class="btn" data-a="accueil">${tr('Retour')}</button></div>`;
  montrer(h, 'large');
  ui.querySelector('[data-r="fantome"]').value = r.fantome;
  ui.querySelector('[data-r="langue"]').value = r.langue;
  ui.querySelector('[data-r="tactile"]').value = r.tactile || 'auto';
}

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
  const suiv = J.idx + 1 < LISTE.length && zoneDebloquee(LISTE[J.idx + 1].zi);
  montrer(`<div class="fin"><div class="nomniv">${id} ${tr(J.L.def.nom)}</div><div class="temps">${R.chrono(t)}</div>${badge(mCe)}
    <div class="lignes">${lignes}</div>
    <div class="menu ligne">
      <button class="btn" data-a="rejouer" ${suiv ? '' : 'autofocus'}>${tr('Recommencer')} <small>${nomTouche(S.touches.recommencer[0])}</small></button>
      ${suiv ? `<button class="btn" data-a="jouer" data-i="${J.idx + 1}" autofocus>${tr('Suivant')} <small>${tr('Entrée')}</small></button>` : ''}
      ${p ? `<button class="btn" data-a="voir-parfait" data-i="${J.idx}">${tr('▶ Voir le Parfait')}</button>` : ''}
      <button class="btn" data-a="niveaux">${tr('Niveaux')}</button>
    </div></div>`, 'fin');
}
function finFantome() {
  const idx = J.idx;
  ecran = 'fin';
  montrer(`<div class="fin"><div class="nomniv">${LISTE[idx].id} ${tr(LISTE[idx].def.nom)}</div><div class="temps">${R.chrono(J.e.temps)}</div>
    <div class="lignes"><div>${tr('Rejeu : {0}', tr(J.quoi))}</div></div>
    <div class="menu ligne"><button class="btn" data-a="jouer" data-i="${idx}" autofocus>${tr('Jouer ce niveau')}</button><button class="btn" data-a="niveaux">${tr('Niveaux')}</button><button class="btn" data-a="records">${tr('Records')}</button></div></div>`, 'fin');
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
    <button class="btn" data-a="rejouer">${tr(J.mode === 'niveau' ? 'Recommencer le niveau' : 'Recommencer la course')}</button>
    <button class="btn" data-a="${J.mode === 'niveau' ? 'niveaux' : 'accueil'}">${tr('Quitter')}</button></div></div>`, 'fin');
}

function action(a, el) {
  SON.demarrer();
  SON.bruitMenu('valider');
  const i = el && el.dataset.i != null ? +el.dataset.i : null;
  switch (a) {
    case 'accueil': accueil(); break;
    case 'niveaux': J = null; ecran = 'menu'; niveaux(); break;
    case 'records': J = null; ecran = 'menu'; records(); break;
    case 'aide': aide(); break;
    case 'reglages': reglages(); break;
    case 'jouer': lancerNiveau(i); break;
    case 'voir-parfait': regarder(i, 'parfait'); break;
    case 'voir-record': regarder(i, 'record'); break;
    case 'course-any': lancerCourse('any'); break;
    case 'course-cent': lancerCourse('cent'); break;
    case 'infini1': lancerInfini(1); break;
    case 'infini2': lancerInfini(2); break;
    case 'defi': lancerDefi(); break;
    case 'reprendre': ecran = 'jeu'; cacherUI(); break;
    case 'rejouer': if (J && J.mode === 'defi') lancerDefi(); else if (J && J.mode === 'infini') lancerInfini(J.imode); else if (J && J.mode === 'course') lancerCourse(J.cat); else if (J) { if (J.mode === 'fantome') lancerNiveau(J.idx); else lancerNiveau(J.idx); } break;
    case 'recommencer':
      if (ecran === 'jeu') recommencer();
      else if (ecran === 'fin' && J && J.mode === 'niveau') lancerNiveau(J.idx);
      else if (ecran === 'fin' && J && J.mode === 'infini') lancerInfini(J.imode);
      else if (ecran === 'fin' && J && J.mode === 'defi') lancerDefi();
      break;
    case 'pause':
      if (ecran === 'jeu') { if (J.mode === 'fantome') { if (J.L) niveauxOuRecords(); } else pause(); }
      else if (ecran === 'pause') { ecran = 'jeu'; cacherUI(); }
      break;
    case 'touche': attenteTouche = { a: el.dataset.t, k: +el.dataset.k, el }; el.textContent = '…'; break;
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
  const btns = [...ui.querySelectorAll('.btn:not([disabled])')];
  if (!btns.length) return;
  const i = btns.indexOf(document.activeElement);
  if (['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD'].includes(ev.code)) { ev.preventDefault(); btns[(i + 1) % btns.length].focus(); SON.bruitMenu('menu'); }
  else if (['ArrowUp', 'ArrowLeft', 'KeyW', 'KeyA'].includes(ev.code)) { ev.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); SON.bruitMenu('menu'); }
  else if ((ev.code === 'Enter' || ev.code === 'Space') && document.activeElement && document.activeElement.classList.contains('btn')) {
    ev.preventDefault(); document.activeElement.click();
  }
});
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
  const pr = b & ~manetteNav; manetteNav = b;
  const btns = [...ui.querySelectorAll('.btn:not([disabled])')];
  const i = btns.indexOf(document.activeElement);
  if (pr & 1 && btns.length) btns[(i + 1) % btns.length].focus();
  if (pr & 2 && btns.length) btns[(i - 1 + btns.length) % btns.length].focus();
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
  const ph = J && J.n ? J.n.phases : 15;
  zoneT.querySelectorAll('.t-etat').forEach((el, i) => { el.style.display = (ph & (1 << i)) ? '' : 'none'; });
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
SON.volumes(S.reglages.sons, S.reglages.musique);
tactiles();
accueil();
requestAnimationFrame(boucle);
window.Jeu = { LISTE, S, DEFIS, defiDuJour, cleJour, get J() { return J; }, lancerNiveau, regarder, lancerCourse, pas, action };
if (MUET) console.log('Phase : son coupé (?muet)');
})();
