/* Phase — boucle de jeu, commandes, sauvegarde, menus, chrono, records et fantômes. */
(function () {
'use strict';
const M = window.Moteur, NIV = window.Niveaux, R = window.Rendu, SON = window.Son, Gen = window.Gen;
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
const NOMS_ACTIONS = { gauche: 'Gauche', droite: 'Droite', haut: 'Haut', bas: 'Bas (fracas)', saut: 'Saut / giclée / jet', solide: 'Solide',
  liquide: 'Liquide', gaz: 'Gaz', plasma: 'Plasma (éclair)', recommencer: 'Recommencer', pause: 'Pause' };
let S = { il: {}, course: {}, infini: {}, reglages: { sons: 0.6, musique: 0.35, fantome: 'record', entrees: false, tremble: true }, touches: null, essais: 0, morts: 0 };
try { const d = JSON.parse(localStorage.getItem(CLE)); if (d) S = Object.assign(S, d); } catch (err) { /* pas de stockage */ }
if (!S.infini) S.infini = {};
S.reglages = Object.assign({ sons: 0.6, musique: 0.35, fantome: 'record', entrees: false, tremble: true }, S.reglages);
if (!S.touches) S.touches = JSON.parse(JSON.stringify(TOUCHES_DEF));
for (const k in TOUCHES_DEF) if (!S.touches[k]) S.touches[k] = TOUCHES_DEF[k].slice();
function sauver() { try { localStorage.setItem(CLE, JSON.stringify(S)); } catch (err) { /* plein ou bloqué */ } }

/* ---------- Noms des touches (disposition du clavier) ---------- */
const AZERTY = { KeyA: 'Q', KeyQ: 'A', KeyW: 'Z', KeyZ: 'W', Semicolon: 'M', KeyM: ',', Comma: ';', Period: ':', Slash: '!' };
function nomTouche(code) {
  if (!code) return '—';
  const sp = { Space: 'Espace', Escape: 'Échap', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', ShiftLeft: 'Maj', ShiftRight: 'Maj d.',
    ControlLeft: 'Ctrl', Enter: 'Entrée', Tab: 'Tab', Backspace: 'Retour' };
  if (sp[code]) return sp[code];
  if (AZERTY[code]) return AZERTY[code];
  return code.replace(/^Key|^Digit/, '');
}
function touchePhase(p) { return nomTouche(S.touches[['solide', 'liquide', 'gaz', 'plasma'][p]][0]); }

/* ---------- Entrées ---------- */
const tenues = new Set();
let manettePrec = 0, manetteNav = 0;
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
  SON.jouerMusique(1);
}
function avancerInfini() {
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
  if (salle > J.salle) { J.salle = salle; const z = Math.floor(salle / 6) + 1; SON.jouerMusique(((z - 1) % 8) + 1); }
}
function finInfini() {
  const mode = J.imode, n = J.salle, t = J.e.temps, ancien = S.infini[mode];
  const record = !ancien || n > ancien.salles || (n === ancien.salles && t < ancien.t);
  if (record) S.infini[mode] = { salles: n, t };
  sauver();
  ecran = 'fin';
  montrer(`<div class="fin"><div class="nomniv">Infini · difficulté ${mode}</div><div class="temps">${n} salle${n > 1 ? 's' : ''} franchie${n > 1 ? 's' : ''}</div>
    <div class="lignes">${record ? '<div class="vert">Nouveau record !</div>' : `<div>Record : <b>${ancien.salles} salles</b></div>`}
    <div class="gris">${R.chrono(t)} · difficulté atteinte ${Math.round(J.monde.difficulte(n) / 1.2 * 100)} %</div></div>
    <div class="menu ligne"><button class="btn" data-a="infini${mode}" autofocus>Recommencer <small>${nomTouche(S.touches.recommencer[0])}</small></button>
    <button class="btn" data-a="accueil">Menu</button></div></div>`, 'fin');
}

function recommencer() {
  if (!J) return;
  if (J.mode === 'infini') { lancerInfini(J.imode); return; }
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
  if (J.mode === 'infini') {
    if (J.e.ev & M.EV.MORT) J.finT = 50;                      // une seule vie : la course s'arrête
    if (J.finT > 0) { J.e.mortT = Math.max(J.e.mortT, 2); if (--J.finT === 0) { finInfini(); return; } }
    avancerInfini();
  }
  if (J.e.demarre && J.mode !== 'fantome' && J.mode !== 'infini') J.entrees.push(inp);
  if (J.fantome && J.e.demarre) { const f = J.fantome; M.pas(f.n, f.e, f.ent[f.i++] || 0); }
  if (!avant && J.e.demarre) recadrer = false;
  const ev = J.e.ev;
  if (ev) { R.evenements(J.e, J.n); SON.evenements(ev, J.e.phase); if (ev & M.EV.ECHEC) echec = 20; if (ev & M.EV.MORT) S.morts++; }
  if (echec > 0) echec--;
  if (messageT > 0) messageT--;
  if (J.e.fini) {
    if (J.mode === 'course' && J.cat === 'cent' && J.n.aEclat && !J.e.eclat) {
      J.e.fini = false; message = 'Il te manque l\'éclat ◆ de ce niveau !'; messageT = 60;
    } else terminer();
  }
}

function terminer() {
  if (J.mode === 'fantome') { finFantome(); return; }
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
function badge(m) { return m ? `<span class="med" style="--c:${MEDAILLES[m].c}">${MEDAILLES[m].nom}</span>` : ''; }

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
  const hud = { titre: J.L.id + '  ' + J.L.def.nom, touches: [0, 1, 2, 3].map(touchePhase), echec, recadrer, tremble: S.reglages.tremble, lignes: [], droite: [] };
  if (J.mode === 'infini') {
    const rec = S.infini[J.imode];
    hud.chrono = e.temps;
    hud.titre = 'Infini · difficulté ' + J.imode;
    hud.sousChrono = 'Salle ' + (J.salle + 1) + (rec ? '   ·   record : ' + rec.salles + ' franchie' + (rec.salles > 1 ? 's' : '') : '');
    hud.sousCouleur = rec && J.salle > rec.salles ? '#7dff9a' : '#ddd';
    hud.lignes.push({ t: 'Difficulté ' + Math.round(J.monde.difficulte(J.salle) / 1.2 * 100) + ' %', c: '#aaa' });
    hud.lignes.push({ t: 'Une seule vie', c: '#ff8a8a' });
    if (J.finT > 0) { hud.message = 'Fin de la course : ' + J.salle + ' salle' + (J.salle > 1 ? 's' : '') + ' franchie' + (J.salle > 1 ? 's' : ''); hud.messageC = '#ff9ae6'; }
  } else if (J.mode === 'course') {
    hud.chrono = J.course.total + e.temps;
    hud.titre = (J.cat === 'cent' ? 'Course 100 %' : 'Course complète') + '  ·  ' + hud.titre;
    const pb = S.course[J.cat];
    if (pb && pb.splits) {
      let cumul = 0; for (let i = 0; i < J.idx; i++) cumul += pb.splits[i];
      const ec = J.course.total - cumul;
      if (J.idx > 0) { hud.sousChrono = R.ecart(ec) + ' sur ton record'; hud.sousCouleur = ec <= 0 ? '#7dff9a' : '#ff7a7a'; }
    }
    for (let i = Math.max(0, J.idx - 2); i <= Math.min(LISTE.length - 1, J.idx + 3); i++) {
      const fait = i < J.idx;
      const tps = fait ? J.course.splits[i] : (i === J.idx ? e.temps : null);
      hud.droite.push({ t: LISTE[i].id + '  ' + (tps != null ? R.chrono(tps) : '—'), c: i === J.idx ? '#fff' : (fait ? '#9a9' : '#666'), gras: i === J.idx });
    }
    hud.lignes.push({ t: 'Niveau ' + (J.idx + 1) + ' / ' + LISTE.length });
  } else if (J.mode === 'fantome') {
    hud.chrono = e.temps;
    hud.lignes.push({ t: '▶ Rejeu : ' + J.quoi, c: '#ff6ad5' });
    hud.attente = 'Échap pour quitter';
    hud.entrees = J.inp || 0;
  } else {
    hud.chrono = e.temps;
    if (il && il.t != null) hud.lignes.push({ t: 'Record  ' + R.chrono(il.t) });
    if (p && p.t) hud.lignes.push({ t: 'Parfait  ' + R.chrono(p.t), c: MEDAILLES[4].c });
    if (p && p.t) {
      const m = medaille(id, il && il.t);
      const vise = Math.min(4, m + 1);
      if (m < 4) hud.lignes.push({ t: MEDAILLES[vise].nom + '  ' + R.chrono(seuil(id, vise)), c: MEDAILLES[vise].c });
      else hud.lignes.push({ t: 'Parfait atteint !', c: '#7dff9a' });
      if (il && il.t != null && e.temps > il.t) hud.couleurChrono = '#ffb0b0';
    }
    if (J.fantome) hud.lignes.push({ t: 'Fantôme : ' + (S.reglages.fantome === 'parfait' ? 'Parfait' : 'record'), c: '#888' });
  }
  if (!e.demarre) hud.attente = 'Bouge pour lancer le chrono';
  if (S.reglages.entrees && J.mode !== 'fantome') hud.entrees = J.inp || 0;
  // panneau proche
  const cxp = (e.x + M.W / 2) / M.T, cyp = (e.y + M.H / 2) / M.T;
  for (const pn of J.n.panneaux) if (Math.abs(pn.x + 0.5 - cxp) < 3 && Math.abs(pn.y + 0.5 - cyp) < 2.5) { hud.panneau = pn.texte; break; }
  if (messageT > 0) { hud.message = message; hud.messageC = '#ff9ae6'; }
  R.dessiner(e, J.fantome ? J.fantome.e : null, hud, dt);
}

/* ---------- Fond animé des menus ---------- */
let menuNiv = null, menuE = null, menuT = 0;
function fondMenu(dt) {
  menuT += dt;
  if (!menuNiv) {
    const L = LISTE[Math.floor(Math.random() * LISTE.length)];
    const id = L.id;
    menuNiv = { L, n: M.charger(L.def) };
    menuE = M.nouvelEtat(menuNiv.n);
    menuNiv.ent = PARF[id] ? M.decompresser(PARF[id].f) : [];
    menuNiv.i = 0;
    R.preparer(menuNiv.n, L.zone.theme);
  }
  if (menuNiv.ent.length) {
    const k = Math.round(menuT * 60); menuT -= k / 60;
    for (let i = 0; i < k; i++) {
      M.pas(menuNiv.n, menuE, menuNiv.ent[menuNiv.i++] || 0);
      R.evenements(menuE, menuNiv.n);
      if (menuE.fini || menuNiv.i > menuNiv.ent.length + 60) { menuNiv = null; return; }
    }
  } else menuT = 0;
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
function cacherUI() { ui.className = ''; ui.innerHTML = ''; }

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
  <div class="titre"><h1>PHASE</h1><p>Un jeu fait pour le speedrun. Solide, liquide, gaz, plasma : change d'état pour aller plus vite.</p></div>
  <div class="menu">
    <button class="btn gros" data-a="niveaux" autofocus>Jouer</button>
    <button class="btn" data-a="course-any" ${tousFaits() ? '' : 'disabled'}>Course complète <small>${tousFaits() ? (S.course.any ? 'record ' + R.chrono(S.course.any.t) : 'les 24 niveaux d\'un trait') : 'finis les 24 niveaux pour la débloquer'}</small></button>
    <button class="btn" data-a="course-cent" ${tousFaits() ? '' : 'disabled'}>Course 100 % <small>${S.course.cent ? 'record ' + R.chrono(S.course.cent.t) : 'avec tous les éclats ◆'}</small></button>
    <button class="btn" data-a="infini1">Infini · difficulté 1 <small>${S.infini[1] ? 'record ' + S.infini[1].salles + ' salles' : 'salles générées sans fin, de plus en plus dures, une seule vie'}</small></button>
    <button class="btn" data-a="infini2">Infini · difficulté 2 <small>${S.infini[2] ? 'record ' + S.infini[2].salles + ' salles' : 'commence déjà dur et monte plus vite'}</small></button>
    <button class="btn" data-a="records">Records</button>
    <button class="btn" data-a="aide">Comment jouer</button>
    <button class="btn" data-a="reglages">Réglages</button>
  </div>
  <div class="pied">${faits} / ${LISTE.length} niveaux finis · ${parfaits} Parfait${parfaits > 1 ? 's' : ''} · ${S.morts} chutes</div>`, 'accueil');
}

function niveaux() {
  let h = '<h2>Niveaux</h2><div class="zones">';
  NIV.ZONES.forEach((z, zi) => {
    const ok = zoneDebloquee(zi), th = R.THEMES[z.theme];
    h += `<div class="zone ${ok ? '' : 'ferme'}" style="--a:${th.accent};--f:${th.ciel[0]}"><div class="znom">${zi + 1}. ${z.nom}<span>${z.phases.map(p => M.NOMS_PHASES[p]).join(' · ')}</span></div>`;
    z.niveaux.forEach(nv => {
      const r = S.il[nv.id], m = medaille(nv.id, r && r.t), aE = M.charger(nv).aEclat;
      h += `<button class="btn niv" data-a="jouer" data-i="${parId[nv.id]}" ${ok ? '' : 'disabled'}>
        <b>${nv.id}</b> ${nv.nom}<small>${r && r.t != null ? R.chrono(r.t) : '—'} ${badge(m)} <span class="parf">Parfait ${PARF[nv.id] ? R.chrono(PARF[nv.id].t) : '—'}</span> ${aE ? `<span class="ecl ${r && r.eclat ? 'oui' : ''}">◆</span>` : ''}</small></button>`;
    });
    if (!ok) h += '<div class="verrou">Finis la zone précédente</div>';
    h += '</div>';
  });
  h += '</div><div class="menu ligne"><button class="btn" data-a="accueil">Retour</button></div>';
  montrer(h, 'large');
}

function records() {
  let h = '<h2>Records</h2><table class="rec"><tr><th>Niveau</th><th>Record</th><th>Médaille</th><th>Parfait</th><th></th></tr>';
  for (const l of LISTE) {
    const r = S.il[l.id], p = PARF[l.id];
    h += `<tr><td><b>${l.id}</b> ${l.def.nom}</td><td>${r && r.t != null ? R.chrono(r.t) : '—'}</td><td>${badge(medaille(l.id, r && r.t))}</td>
      <td>${p ? R.chrono(p.t) : '—'}</td><td>${p ? `<button class="btn mini" data-a="voir-parfait" data-i="${parId[l.id]}">▶ Parfait</button>` : ''}
      ${r && r.f ? `<button class="btn mini" data-a="voir-record" data-i="${parId[l.id]}">▶ Mien</button>` : ''}</td></tr>`;
  }
  const sb = sommeMeilleurs(), sp = sommeParfaits();
  h += `</table><div class="totaux"><div>Somme de tes records <b>${sb != null ? R.chrono(sb) : '—'}</b></div><div>Somme des Parfaits <b>${sp != null ? R.chrono(sp) : '—'}</b></div>
    <div>Infini · difficulté 1 <b>${S.infini[1] ? S.infini[1].salles + ' salles' : '—'}</b></div><div>Infini · difficulté 2 <b>${S.infini[2] ? S.infini[2].salles + ' salles' : '—'}</b></div>
    <div>Course complète <b>${S.course.any ? R.chrono(S.course.any.t) : '—'}</b></div><div>Course 100 % <b>${S.course.cent ? R.chrono(S.course.cent.t) : '—'}</b></div></div>
    <p class="note">Le temps « Parfait » est celui d'un robot qui a cherché le parcours le plus rapide sur le vrai moteur du jeu. Bronze : ×2,2 · Argent : ×1,5 · Or : ×1,2 · Parfait : l'égaler.</p>
    <div class="menu ligne"><button class="btn" data-a="accueil">Retour</button></div>`;
  montrer(h, 'large');
}

function aide() {
  const k = (a) => S.touches[a].map(nomTouche).join(' / ');
  montrer(`<h2>Comment jouer</h2><div class="aide">
  <p>Va le plus vite possible jusqu'au portail. Le chrono démarre au premier geste, se compte à l'image près (60 par seconde) et ne s'arrête jamais : tomber ou toucher des pics te renvoie au dernier drapeau.</p>
  <div class="etats">
   <div style="--c:${R.COUL_PHASE[0]}"><b>${k('solide')} · Solide</b>Court, saute (${k('saut')}), saut mural, <i>fracas</i> en l'air (${k('bas')}) qui brise les blocs fêlés. Saute juste après un fracas : <i>rebond</i>.</div>
   <div style="--c:${R.COUL_PHASE[1]}"><b>${k('liquide')} · Liquide</b>Colle aux murs et aux plafonds, passe à travers les grilles, glisse vite. Sa vitesse se <i>convertit</i> : contre un mur elle devient montée, une chute devient élan. Jet depuis un mur.</div>
   <div style="--c:${R.COUL_PHASE[2]}"><b>${k('gaz')} · Gaz</b>Monte tout seul, traverse les tamis, porté par le vent. Se condense en solide au bout d'un moment. Touche le feu : explosion qui propulse.</div>
   <div style="--c:${R.COUL_PHASE[3]}"><b>${k('plasma')} · Plasma</b>Éclair dans les 8 directions qui brise les blocs fêlés. Éclair vers le sol puis saut : <i>super saut</i>.</div>
  </div>
  <p>Changer d'état coûte une <b>charge</b> (2 au maximum, ◆ bleus en bas). Elles reviennent en touchant le sol (solide ou liquide) ou un <b>cristal</b>.</p>
  <p>${k('recommencer')} : recommencer le niveau tout de suite. ${k('pause')} : pause. Manette : A saut, X solide, Y liquide, B gaz, gâchettes plasma.</p>
  <p>Chaque niveau cache un éclat ◆ (pour la course 100 %).</p></div>
  <div class="menu ligne"><button class="btn" data-a="accueil">Retour</button></div>`, 'large');
}

let attenteTouche = null;
function reglages() {
  const r = S.reglages;
  let h = `<h2>Réglages</h2><div class="regl">
   <label>Bruitages <input type="range" min="0" max="1" step="0.05" value="${r.sons}" data-r="sons"></label>
   <label>Musique <input type="range" min="0" max="1" step="0.05" value="${r.musique}" data-r="musique"></label>
   <label>Fantôme en jeu <select data-r="fantome"><option value="aucun">Aucun</option><option value="record">Mon record</option><option value="parfait">Le Parfait</option></select></label>
   <label>Afficher les entrées <input type="checkbox" data-r="entrees" ${r.entrees ? 'checked' : ''}></label>
   <label>Tremblements de l'écran <input type="checkbox" data-r="tremble" ${r.tremble ? 'checked' : ''}></label>
  </div><h3>Touches <small>(clique puis appuie sur la nouvelle touche)</small></h3><div class="touches">`;
  for (const a in TOUCHES_DEF) {
    h += `<div><span>${NOMS_ACTIONS[a]}</span><button class="btn mini" data-a="touche" data-t="${a}" data-k="0">${nomTouche(S.touches[a][0])}</button>
      <button class="btn mini" data-a="touche" data-t="${a}" data-k="1">${nomTouche(S.touches[a][1])}</button></div>`;
  }
  h += `</div><div class="menu ligne"><button class="btn" data-a="touches-defaut">Touches par défaut</button><button class="btn danger" data-a="effacer">Tout effacer</button><button class="btn" data-a="accueil">Retour</button></div>`;
  montrer(h, 'large');
  ui.querySelector('select').value = r.fantome;
}

function finNiveau(t, avant, record) {
  const id = J.L.id, m = medaille(id, S.il[id].t), p = PARF[id];
  const mCe = medaille(id, t);
  let lignes = '';
  if (record && avant != null) lignes += `<div class="vert">Nouveau record ! ${R.ecart(t - avant)}</div>`;
  else if (record) lignes += '<div class="vert">Premier temps enregistré</div>';
  else lignes += `<div class="rouge">${R.ecart(t - avant)} sur ton record (${R.chrono(avant)})</div>`;
  if (p) {
    const vise = Math.min(4, m + 1);
    lignes += `<div>Parfait : <b>${R.chrono(p.t)}</b> ${t <= p.t ? '— <b class="rose">ÉGALÉ !</b>' : '(' + R.ecart(t - p.t) + ')'}</div>`;
    if (m < 4) lignes += `<div>Prochaine médaille : ${badge(vise)} en ${R.chrono(seuil(id, vise))}</div>`;
  }
  lignes += `<div class="gris">${J.e.morts} chute${J.e.morts > 1 ? 's' : ''}${J.n.aEclat ? ' · éclat ' + (J.e.eclat ? '◆ pris' : 'pas pris') : ''}</div>`;
  const suiv = J.idx + 1 < LISTE.length && zoneDebloquee(LISTE[J.idx + 1].zi);
  montrer(`<div class="fin"><div class="nomniv">${id} ${J.L.def.nom}</div><div class="temps">${R.chrono(t)}</div>${badge(mCe)}
    <div class="lignes">${lignes}</div>
    <div class="menu ligne">
      <button class="btn" data-a="rejouer" ${suiv ? '' : 'autofocus'}>Recommencer <small>${nomTouche(S.touches.recommencer[0])}</small></button>
      ${suiv ? `<button class="btn" data-a="jouer" data-i="${J.idx + 1}" autofocus>Suivant <small>Entrée</small></button>` : ''}
      ${p ? `<button class="btn" data-a="voir-parfait" data-i="${J.idx}">▶ Voir le Parfait</button>` : ''}
      <button class="btn" data-a="niveaux">Niveaux</button>
    </div></div>`, 'fin');
}
function finFantome() {
  const idx = J.idx;
  ecran = 'fin';
  montrer(`<div class="fin"><div class="nomniv">${LISTE[idx].id} ${LISTE[idx].def.nom}</div><div class="temps">${R.chrono(J.e.temps)}</div>
    <div class="lignes"><div>Rejeu : ${J.quoi}</div></div>
    <div class="menu ligne"><button class="btn" data-a="jouer" data-i="${idx}" autofocus>Jouer ce niveau</button><button class="btn" data-a="niveaux">Niveaux</button><button class="btn" data-a="records">Records</button></div></div>`, 'fin');
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
    tab += `<tr><td>${LISTE[i].id} ${LISTE[i].def.nom}</td><td>${R.chrono(s)}</td><td class="${d != null && d <= 0 ? 'vert' : 'rouge'}">${d != null ? R.ecart(d) : ''}</td></tr>`;
  });
  tab += '</table>';
  montrer(`<div class="fin"><div class="nomniv">${cat === 'cent' ? 'Course 100 %' : 'Course complète'}</div><div class="temps">${R.chrono(tot)}</div>
    <div class="lignes">${record ? '<div class="vert">Nouveau record de course !</div>' : `<div class="rouge">${R.ecart(tot - pb.t)} sur ton record</div>`}</div>
    <div class="splits">${tab}</div>
    <div class="menu ligne"><button class="btn" data-a="course-${cat}" autofocus>Recommencer la course</button><button class="btn" data-a="accueil">Menu</button></div></div>`, 'fin large');
}
function pause() {
  if (ecran !== 'jeu') return;
  ecran = 'pause';
  montrer(`<div class="fin"><div class="nomniv">Pause</div>
    <div class="menu"><button class="btn" data-a="reprendre" autofocus>Reprendre</button>
    <button class="btn" data-a="rejouer">${J.mode === 'niveau' ? 'Recommencer le niveau' : 'Recommencer la course'}</button>
    <button class="btn" data-a="${J.mode === 'niveau' ? 'niveaux' : 'accueil'}">Quitter</button></div></div>`, 'fin');
}

function action(a, el) {
  SON.demarrer();
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
    case 'reprendre': ecran = 'jeu'; cacherUI(); break;
    case 'rejouer': if (J && J.mode === 'infini') lancerInfini(J.imode); else if (J && J.mode === 'course') lancerCourse(J.cat); else if (J) { if (J.mode === 'fantome') lancerNiveau(J.idx); else lancerNiveau(J.idx); } break;
    case 'recommencer':
      if (ecran === 'jeu') recommencer();
      else if (ecran === 'fin' && J && J.mode === 'niveau') lancerNiveau(J.idx);
      else if (ecran === 'fin' && J && J.mode === 'infini') lancerInfini(J.imode);
      break;
    case 'pause':
      if (ecran === 'jeu') { if (J.mode === 'fantome') { if (J.L) niveauxOuRecords(); } else pause(); }
      else if (ecran === 'pause') { ecran = 'jeu'; cacherUI(); }
      break;
    case 'touche': attenteTouche = { a: el.dataset.t, k: +el.dataset.k, el }; el.textContent = '…'; break;
    case 'touches-defaut': S.touches = JSON.parse(JSON.stringify(TOUCHES_DEF)); sauver(); reglages(); break;
    case 'effacer':
      if (confirm('Effacer tous tes temps, records et réglages ?')) { localStorage.removeItem(CLE); location.reload(); }
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
  if (ecran === 'fin' && S.touches.recommencer.includes(ev.code) && J && (J.mode === 'niveau' || J.mode === 'infini') && !ev.repeat) { action('recommencer'); return; }
  const btns = [...ui.querySelectorAll('.btn:not([disabled])')];
  if (!btns.length) return;
  const i = btns.indexOf(document.activeElement);
  if (['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD'].includes(ev.code)) { ev.preventDefault(); btns[(i + 1) % btns.length].focus(); }
  else if (['ArrowUp', 'ArrowLeft', 'KeyW', 'KeyA'].includes(ev.code)) { ev.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); }
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

/* ---------- Commandes tactiles ---------- */
function tactiles() {
  if (!('ontouchstart' in window)) return;
  const zone = document.getElementById('tactile');
  zone.classList.add('actif');
  const maj = () => {
    let b = 0;
    zone.querySelectorAll('[data-b].on').forEach(el => { b |= +el.dataset.b; });
    tactile.bits = b;
  };
  zone.querySelectorAll('[data-b]').forEach(el => {
    el.addEventListener('touchstart', ev => { ev.preventDefault(); SON.demarrer(); el.classList.add('on'); maj(); }, { passive: false });
    el.addEventListener('touchend', ev => { ev.preventDefault(); el.classList.remove('on'); maj(); }, { passive: false });
    el.addEventListener('touchcancel', () => { el.classList.remove('on'); maj(); });
  });
  zone.querySelector('[data-p]').addEventListener('touchstart', ev => { ev.preventDefault(); action('pause'); }, { passive: false });
}

/* ---------- Démarrage ---------- */
R.init(document.getElementById('jeu'));
SON.volumes(S.reglages.sons, S.reglages.musique);
tactiles();
accueil();
requestAnimationFrame(boucle);
window.Jeu = { LISTE, S, get J() { return J; }, lancerNiveau, regarder, lancerCourse, pas, action };
if (MUET) console.log('Phase : son coupé (?muet)');
})();
