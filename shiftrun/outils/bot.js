/* Phase — robot de recherche (Node) : trouve un parcours très rapide de chaque niveau par recherche en faisceau
   sur le vrai moteur. Sert à vérifier que chaque niveau est faisable et à fixer le temps « Parfait ».
   Usage : node outils/bot.js [id du niveau ...] [--faisceau=900] [--eclat] [--ecrire]
   --ecrire met à jour js/parfaits.js (temps + fantôme). */
'use strict';
const path = require('path');
const fs = require('fs');
const M = require('../js/moteur.js');
const NIV = require('../js/niveaux.js');
const T = M.T;

const args = process.argv.slice(2);
const opt = { faisceau: 900, pasK: 4, eclat: false, ecrire: false, max: 15000, parCase: 3, danger: 96, affiner: 20000, verbeux: !!require.main && require.main.filename === __filename };
const ids = [];
for (const a of args) {
  if (a.startsWith('--faisceau=')) opt.faisceau = +a.split('=')[1];
  else if (a.startsWith('--k=')) opt.pasK = +a.split('=')[1];
  else if (a.startsWith('--case=')) opt.parCase = +a.split('=')[1];
  else if (a === '--eclat') opt.eclat = true;
  else if (a === '--ecrire') opt.ecrire = true;
  else if (a === '--trace') opt.trace = true;
  else if (a === '--remplacer') opt.remplacer = true;
  else if (a === '--fusion') {}
  else if (a.startsWith('--affiner=')) opt.affiner = +a.split('=')[1];
  else if (a.startsWith('--danger=')) opt.danger = +a.split('=')[1];
  else ids.push(a);
}

function champ(n, cibles) {
  const d = new Float64Array(n.w * n.h).fill(Infinity);
  const passe = (x, y) => {
    if (x < 0 || y < 0 || x >= n.w || y >= n.h) return false;
    const t = n.g[y * n.w + x];
    return !(t === M.MUR || t === M.GLACE || t === M.TAPIS_G || t === M.TAPIS_D || t === M.PICS || t === M.FEU || t === M.ARBALETE || t === M.REBONDI);
  };
  const entrees = {};
  for (let i = 0; i < n.w * n.h; i++) {
    const t = n.g[i];
    if (t === M.TP1 || t === M.TP2) { const so = n.tp.get(i); if (so) (entrees[so.y * n.w + so.x] = entrees[so.y * n.w + so.x] || []).push(i); }
    if (t === M.BOUCLE_B || t === M.BOUCLE_H || t === M.BOUCLE_G || t === M.BOUCLE_D) { const j = n.boucle.get(i); if (j !== undefined) (entrees[j] = entrees[j] || []).push(i); }
  }
  // Dijkstra simple (8 voisins)
  const tas = [];
  const pousser = (it) => { tas.push(it); let i = tas.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (tas[p][0] <= tas[i][0]) break; [tas[p], tas[i]] = [tas[i], tas[p]]; i = p; } };
  const tirer = () => { const h = tas[0], z = tas.pop(); if (tas.length) { tas[0] = z; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let m = i; if (a < tas.length && tas[a][0] < tas[m][0]) m = a; if (b < tas.length && tas[b][0] < tas[m][0]) m = b; if (m === i) break; [tas[m], tas[i]] = [tas[i], tas[m]]; i = m; } } return h; };
  for (const [x, y] of cibles) { d[y * n.w + x] = 0; pousser([0, x, y]); }
  const vois = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (tas.length) {
    const [dd, x, y] = tirer();
    if (dd > d[y * n.w + x]) continue;
    for (const en of (entrees[y * n.w + x] || [])) {
      if (dd < d[en]) { d[en] = dd; pousser([dd, en % n.w, Math.floor(en / n.w)]); }
    }
    for (const [ax, ay, c] of vois) {
      const nx = x + ax, ny = y + ay;
      if (!passe(nx, ny)) continue;
      if (ax && ay && (!passe(x + ax, y) || !passe(x, y + ay))) continue;
      const cout = n.g[ny * n.w + nx] === M.FRAGILE ? c * 1.5 : c;
      if (dd + cout < d[ny * n.w + nx]) { d[ny * n.w + nx] = dd + cout; pousser([dd + cout, nx, ny]); }
    }
  }
  return d;
}
function lire(n, d, e) {
  const px = e.x + M.W / 2, py = e.y + M.H / 2;
  const tx = Math.floor(px / T), ty = Math.floor(py / T);
  let best = Infinity;
  for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
    if (x < 0 || y < 0 || x >= n.w || y >= n.h) continue;
    const v = d[y * n.w + x];
    if (v === Infinity) continue;
    const s = v * T + Math.hypot(px - (x + 0.5) * T, py - (y + 0.5) * T);
    if (s < best) best = s;
  }
  if (best === Infinity) best = 1e6 + Math.max(0, py - n.h * T) * 10;
  return best;
}

function actions(n) {
  const A = [];
  const E = M.E;
  const hs = [0, E.G, E.D];
  for (const h of hs) for (const vv of [0, E.H, E.B]) for (const j of [0, E.SAUT]) A.push({ base: h | vv | j, sw: 0 });
  const ph = n.phases;
  // touches 3 et 4 : les deux états propres au niveau
  const em = n.emplacements;
  for (const [bit, p] of [[E.S, em[0]], [E.L, em[1]], [E.Z, em[2]], [E.P, em[3]]]) if (p !== undefined) if (ph & (1 << p)) for (const h of hs) for (const vv of [0, E.H, E.B]) A.push({ base: h | vv, sw: bit, etat: p });
  return A;
}

// Affinage : mutations locales de la suite d'entrées, gardées seulement si l'arrivée est plus rapide.
function affiner(n, entrees, A, avecEclat) {
  let graine = 12345;
  const alea = () => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine / 0x7fffffff; };
  const instantanes = (ent) => {
    const etats = [];
    const e = M.nouvelEtat(n);
    for (let i = 0; i < ent.length; i++) { etats.push(M.cloner(e)); M.pas(n, e, ent[i]); if (e.fini && avecEclat && !e.eclat) e.fini = false; }
    return etats;
  };
  const memes = (a, b) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) { const x = a[i], y = b[i]; if (x === y) continue; if (typeof x !== 'object' || x[0] !== y[0] || x[1] !== y[1]) return false; }
    return true;
  };
  const pareil = (a, b) => a.x === b.x && a.y === b.y && a.vx === b.vx && a.vy === b.vy && a.phase === b.phase && a.charges === b.charges &&
    a.dash === b.dash && a.gaz === b.gaz && a.att === b.att && a.slam === b.slam && a.slamAt === b.slamAt && a.sol === b.sol && a.coyote === b.coyote &&
    a.tampon === b.tampon && a.verrou === b.verrou && a.jetCd === b.jetCd && a.jetSide === b.jetSide && a.tpCd === b.tpCd && a.immun === b.immun &&
    a.cdP === b.cdP && a.face === b.face && a.mortT === b.mortT && a.invT === b.invT && (a.cp ? a.cp.tx : -1) === (b.cp ? b.cp.tx : -1) &&
    a.ban === b.ban && a.banT === b.banT && a.bonus === b.bonus && a.bonusT === b.bonusT && a.bascule === b.bascule && a.surInter === b.surInter &&
    a.eclat === b.eclat && a.torrent === b.torrent && a.tdx === b.tdx && a.tdy === b.tdy && memes(a.eteints, b.eteints) && memes(a.cles, b.cles) && memes(a.clesCp, b.clesCp) && a.minut === b.minut && a.broy === b.broy && a.broyX === b.broyX && a.plat === b.plat && a.champCd === b.champCd && a.tremCd === b.tremCd && a.inpPrev === b.inpPrev && a.demarre === b.demarre &&
    a.dansEau === b.dansEau && a.morts === b.morts && memes(a.casses, b.casses) && memes(a.boutons, b.boutons) && memes(a.craque, b.craque) &&
    memes(a.cristaux, b.cristaux) && memes(a.orbes, b.orbes) && a.pieces.length === b.pieces.length;
  let sigs = null, tpsRef = Infinity;
  const finir = (depart, ent, i0, limite, rejoint) => {
    const e = M.cloner(depart);
    for (let i = i0; i < ent.length; i++) {
      // même longueur : passé la fenêtre modifiée, si l'état redevient celui de la trajectoire actuelle, la fin sera identique
      if (rejoint !== undefined && i >= rejoint && sigs && i < sigs.length && (i - rejoint) % 4 === 0 && pareil(e, sigs[i])) return tpsRef;
      M.pas(n, e, ent[i]);
      if (e.fini) { if (!avecEclat || e.eclat) return e.temps; e.fini = false; }
      if (e.temps >= limite) return Infinity;
    }
    return Infinity;
  };
  let meilleur = entrees.slice();
  let tps = finir(M.nouvelEtat(n), meilleur, 0, Infinity);
  let etats = instantanes(meilleur);
  sigs = etats; tpsRef = tps;
  const debut = tps;
  for (let it = 0; it < opt.affiner; it++) {
    const len = meilleur.length;
    const i = Math.floor(alea() * len);
    const cand = meilleur.slice(0, i);
    const m = alea();
    if (m < 0.45) {
      const Lg = 1 + Math.floor(alea() * 14), a = A[Math.floor(alea() * A.length)];
      for (let k = 0; k < Lg; k++) cand.push(a.base | (k === 0 ? a.sw : 0));
      for (let k = i + Lg; k < len; k++) cand.push(meilleur[k]);
      if (cand.length === len) cand.fenetre = i + Lg;
    } else if (m < 0.65) {
      const Lg = 1 + Math.floor(alea() * 6);
      for (let k = i + Lg; k < len; k++) cand.push(meilleur[k]);
    } else if (m < 0.85) {
      const Lg = 1 + Math.floor(alea() * 10), bit = [M.E.SAUT, M.E.G, M.E.D, M.E.H, M.E.B][Math.floor(alea() * 5)];
      for (let k = i; k < len; k++) cand.push(k < i + Lg ? (meilleur[k] ^ bit) : meilleur[k]);
      cand.fenetre = i + Lg;
    } else {
      const Lg = 1 + Math.floor(alea() * 4);
      for (let k = 0; k < Lg; k++) cand.push(meilleur[i]);
      for (let k = i; k < len; k++) cand.push(meilleur[k]);
    }
    for (let k = 0; k < cand.length; k++) if ((cand[k] & M.E.G) && (cand[k] & M.E.D)) cand[k] &= ~M.E.G;
    const t = finir(etats[i] || M.nouvelEtat(n), cand, i, tps, cand.fenetre !== undefined ? cand.fenetre + 1 : undefined);
    if (t < tps) {
      tps = t; meilleur = cand;
      // couper ce qui suit l'arrivée
      const e = M.nouvelEtat(n); let k = 0;
      for (; k < meilleur.length; k++) { M.pas(n, e, meilleur[k]); if (e.fini) { if (!avecEclat || e.eclat) break; e.fini = false; } }
      meilleur = meilleur.slice(0, k + 1);
      etats = instantanes(meilleur);
      sigs = etats; tpsRef = tps;
    }
  }
  if (opt.verbeux) console.log('   affinage : ' + (debut / 60).toFixed(3) + ' → ' + (tps / 60).toFixed(3) + ' s');
  return { entrees: meilleur, temps: tps };
}

function chercher(def, avecEclat, cfg) {
  cfg = cfg || {};
  const n = M.charger(def);
  const buts = [], eclats = [];
  for (let y = 0; y < n.h; y++) for (let x = 0; x < n.w; x++) {
    if (n.g[y * n.w + x] === M.BUT) buts.push([x, y]);
    if (n.g[y * n.w + x] === M.ECLAT) eclats.push([x, y]);
  }
  const dBut = champ(n, buts);
  const dEcl = avecEclat && eclats.length ? champ(n, eclats) : null;
  let eclatVersBut = 0;
  if (dEcl) eclatVersBut = Math.min(...eclats.map(([x, y]) => dBut[y * n.w + x])) * T;
  const eclatX = eclats.length ? eclats[0][0] : 1e9;
  // danger : rien de sûr sous le joueur (vide ou pics) alors qu'il tombe
  const danger = (e) => {
    if (e.sol || e.att || e.phase === M.Z || e.dansEau) return 0;
    const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + M.W - 0.001) / T);
    let pire = 0;
    for (let tx = x0; tx <= x1; tx++) {
      let ty = Math.floor((e.y + M.H) / T), bon = false;
      for (; ty < n.h; ty++) {
        const t = n.g[ty * n.w + tx];
        if (t === M.PICS || (t === M.FEU && e.phase === M.S)) break;
        if (t === M.EAU || t === M.RESSORT || t === M.PLATE || t === M.BOUCLE_B || M.plein(n, e, tx, ty)) { bon = true; break; }
      }
      if (!bon) pire++;
    }
    return pire === x1 - x0 + 1 ? opt.danger : 0;
  };
  // boutons : tant que la porte qui suit est fermée, on vise d'abord son bouton
  const boutons = [];
  for (const [porte, b] of n.porteDe) {
    let bt = boutons.find(o => o.k === b);
    if (!bt) {
      const bx = Math.floor(b / 1024), by = b % 1024;
      bt = { k: b, x: bx, porteX: 0, d: champ(n, [[bx, by]]), versBut: dBut[by * n.w + bx] * T };
      boutons.push(bt);
    }
    bt.porteX = Math.max(bt.porteX, Math.floor(porte / 1024));
  }
  if (n.leviersDe) for (const [grille, ls] of n.leviersDe) for (const b of ls) {      // leviers : tous, avant leur grille
    let bt = boutons.find(o => o.k === b);
    if (!bt) { const bx = Math.floor(b / 1024), by = b % 1024; bt = { k: b, x: bx, porteX: 0, d: champ(n, [[bx, by]]), versBut: dBut[by * n.w + bx] * T }; boutons.push(bt); }
    bt.porteX = Math.max(bt.porteX, Math.floor(grille / 1024));
  }
  if (n.porteCle) for (const [porte, b] of n.porteCle) {                       // clés : avant leur porte dorée
    let bt = boutons.find(o => o.k === b && o.cle);
    if (!bt) { const bx = Math.floor(b / 1024), by = b % 1024; bt = { k: b, cle: true, x: bx, porteX: 0, d: champ(n, [[bx, by]]), versBut: dBut[by * n.w + bx] * T }; boutons.push(bt); }
    bt.porteX = Math.max(bt.porteX, Math.floor(porte / 1024));
  }
  boutons.sort((a, b) => a.x - b.x);
  const score = (e) => {
    if (boutons.length) {
      const px = (e.x + M.W / 2) / T;
      for (const bt of boutons) if (px < bt.porteX && (bt.cle ? e.cles : e.boutons).indexOf(bt.k) < 0 && Math.abs(bt.x - px) < 60 && (!dEcl || e.eclat || bt.porteX < eclatX)) return lire(n, bt.d, e) + bt.versBut + danger(e) - 24 * e.boutons.length;
    }
    if (dEcl && !e.eclat) return lire(n, dEcl, e) + eclatVersBut + danger(e) - 24 * e.boutons.length;
    return lire(n, dBut, e) + danger(e) - 24 * e.boutons.length;
  };
  const A = actions(n);
  const Kp = opt.pasK;
  let faisceau = [{ e: cfg.depart ? M.cloner(cfg.depart.etat) : M.nouvelEtat(n), p: null, a: -1, s: 0 }];
  let fin = null;
  let meilleur = Infinity, meilleurE = null;
  const fins = [];
  let etapeFin = -1;
  for (let etape = 0; etape * Kp < (cfg.max || opt.max) && (!fin || (opt.collecter && fins.length < opt.collecter && etape < etapeFin + 45)); etape++) {
    const enfants = [];
    for (const nd of faisceau) {
      const precJ = nd.a >= 0 ? (A[nd.a].base & M.E.SAUT) : 0;
      for (let ai = 0; ai < A.length; ai++) {
        const a = A[ai];
        if (a.sw) {
          const ee = nd.e;
          if (a.etat === ee.phase) {                     // même état : sa compétence
            if (ee.capCd > 0 || !n.capacites) continue;
            if (ee.phase === M.PL) { if (ee.sol || ee.hoverUse) continue; }
            else if (ee.charges <= 0) continue;
          } else if (ee.charges <= 0 || (a.etat === ee.ban && ee.temps < ee.banT)) continue;
        }
        const c = M.cloner(nd.e);
        let mort = false, fini = false;
        for (let k = 0; k < Kp; k++) {
          const inp = a.base | (k === 0 ? a.sw : 0);
          M.pas(n, c, inp);
          if (c.mortT > 0) { mort = true; break; }
          if (c.fini) { if (!dEcl || c.eclat) fini = true; else c.fini = false; break; }
          if (cfg.finX && c.x >= cfg.finX * T && (!dEcl || c.eclat)) { fini = true; break; }
        }
        if (mort) continue;
        if (c.fini && dEcl && !c.eclat) continue;
        const nn = { e: c, p: nd, a: ai, s: fini ? -1 : score(c) };
        if (fini) { if (!fin || c.temps < fin.e.temps) fin = nn; if (opt.collecter) fins.push(nn); continue; }
        enfants.push(nn);
      }
    }
    if (fin && etapeFin < 0) etapeFin = etape;
    if (fin && !opt.collecter) break;
    enfants.sort((a, b) => a.s - b.s);
    const vus = new Map();
    const suivant = [];
    const parCase = new Map();
    const reste = [];
    // 1er passage : au plus 2 états par case (diversité), 2e passage : on complète
    for (const nd of enfants) {
      const e = nd.e;
      // clé numérique (bien plus rapide qu'un texte) : position et vitesse arrondies + tout ce qui change la suite
      const k1 = (Math.round(e.x / 3) + 2048) + 4096 * (Math.round(e.y / 3) + 512) + 4194304 * ((Math.round(e.vx * 1.5) + 64) + 128 * (Math.round(e.vy * 1.5) + 64));
      const k3 = (e.grap ? 1 : 0) + 2 * Math.min(7, e.tirs.length) + 16 * (e.perle ? 1 : 0) + 32 * Math.min(7, Math.ceil(e.hover / 8)) + 256 * Math.min(15, e.dashCA) + 4096 * Math.min(7, e.glaces.length) + 32768 * (e.hoverUse ? 1 : 0) + 65536 * Math.min(15, e.capCd) + 1048576 * Math.min(15, e.torrent) + 16777216 * Math.min(7, e.eteints.length) + 134217728 * Math.min(3, e.cles.length) + 536870912 * (e.minut > e.temps ? 1 + Math.min(6, (e.minut - e.temps) >> 5) : 0) + 4294967296 * (e.broy + 1);
      const k2 = (e.phase % 8) + 8 * e.charges + 32 * e.att + 128 * (e.phase >= 8 ? 1 : 0) + 256 * (e.gaz > 0 ? Math.round(e.gaz / 15) + 1 : 0) + 4096 * (e.eclat ? 1 : 0) +
        8192 * (e.slam ? 1 : 0) + 16384 * e.bascule + 32768 * Math.min(63, e.casses.length) + 2097152 * Math.min(15, e.boutons.length) +
        33554432 * Math.min(63, e.craque.length) + 2147483648 * ((e.temps < e.banT ? e.ban + 1 : 0) + 16 * (e.temps < e.bonusT ? (e.bonus > 1 ? 1 : 2) : 0) + 64 * (e.plat + 1));
      let m3 = vus.get(k1);                       // trois niveaux : chaque clé reste un entier exact
      if (m3 === undefined) { m3 = new Map(); vus.set(k1, m3); }
      let v2 = m3.get(k3);
      if (v2 === undefined) { v2 = new Set(); m3.set(k3, v2); }
      else if (v2.has(k2)) continue;
      v2.add(k2);
      const cc = ((e.x / 16) | 0) + 1024 * (((e.y / 16) | 0) + 64) + 262144 * (e.phase + 8 * (e.eclat ? 1 : 0) + 16 * e.bascule + 32 * Math.min(15, e.boutons.length));
      const k = parCase.get(cc) || 0;
      if (k < opt.parCase) { parCase.set(cc, k + 1); suivant.push(nd); if (suivant.length >= opt.faisceau) break; }
      else reste.push(nd);
    }
    for (let i = 0; i < reste.length && suivant.length < opt.faisceau; i++) suivant.push(reste[i]);
    if (!suivant.length) break;
    faisceau = suivant;
    if (faisceau[0].s < meilleur) { meilleur = faisceau[0].s; meilleurE = faisceau[0].e; }
  }
  if (!fin) return { ok: false, meilleur: Math.round(meilleur / T) + (meilleurE ? ' ; meilleur point (' + (meilleurE.x / T).toFixed(1) + ',' + (meilleurE.y / T).toFixed(1) + ')' : '') };
  // plusieurs chemins différents (pour le robot de difficulté)
  if (opt.collecter) {
    const chemins = [];
    for (const f of fins.slice(0, opt.collecter * 3)) {
      const ch = []; for (let nd = f; nd && nd.a >= 0; nd = nd.p) ch.push(nd.a); ch.reverse();
      const ent = []; for (const ai of ch) for (let k = 0; k < Kp; k++) ent.push(A[ai].base | (k === 0 ? A[ai].sw : 0));
      chemins.push(ent);
    }
    return { ok: true, temps: fin.e.temps, chemins };
  }
  // reconstruction des entrées image par image (rejoue pour s'arrêter pile à l'arrivée)
  const chaine = [];
  for (let nd = fin; nd && nd.a >= 0; nd = nd.p) chaine.push(nd.a);
  chaine.reverse();
  const entrees = [];
  for (const ai of chaine) for (let k = 0; k < Kp; k++) entrees.push(A[ai].base | (k === 0 ? A[ai].sw : 0));
  const e = cfg.depart ? M.cloner(cfg.depart.etat) : M.nouvelEtat(n);
  const ok = [];
  let atteint = false;
  for (const inp of entrees) {
    M.pas(n, e, inp); ok.push(inp);
    if (e.fini && (!dEcl || e.eclat)) { atteint = true; break; }
    if (e.fini) e.fini = false;
    if (cfg.finX && e.x >= cfg.finX * T && (!dEcl || e.eclat)) { atteint = true; break; }
  }
  if (cfg.depart || cfg.finX) return { ok: atteint, temps: e.temps, entrees: ok, etat: e };
  if (e.fini && opt.affiner > 0) {
    const r = affiner(n, ok, A, dEcl ? true : false);
    ok.length = 0; ok.push(...r.entrees);
    e.temps = r.temps;
  }
  if (opt.trace) {
    const e2 = M.nouvelEtat(n); let l = '';
    ok.forEach((inp, i) => { M.pas(n, e2, inp); if (i % 20 === 0) l += '(' + (e2.x / T).toFixed(0) + ',' + (e2.y / T).toFixed(0) + 'SLZP'[e2.phase] + ') '; });
    console.log(l);
  }
  return { ok: e.fini, temps: e.temps, entrees: ok, morts: e.morts };
}

// Parfait avec l'éclat, en trois morceaux : le Parfait jusqu'à la niche, la niche (éclat), puis la suite jusqu'à l'arrivée
function chercherEclat(def, r0) {
  const n = M.charger(def);
  let ex = -1;
  for (let i = 0; i < n.w * n.h; i++) if (n.g[i] === M.ECLAT) { ex = i % n.w; break; }
  if (ex < 0 || !r0 || !r0.ok) return { ok: false };
  // on essaie de partir de plus en plus loin avant la niche (les cachettes ont plusieurs formes)
  let pre, a = { ok: false };
  for (const recul of [5, 9, 14, 20]) {
    const x0 = ex - recul;
    const e = M.nouvelEtat(n); pre = [];
    for (const inp of r0.entrees) { if (e.x >= (x0 - 2) * T) break; M.pas(n, e, inp); pre.push(inp); }
    if (e.mort || e.mortT > 0) continue;
    try { a = chercher(def, true, { depart: { etat: e }, finX: ex + 7, max: 2400 }); } catch (err) { a = { ok: false }; }
    if (a.ok) break;
  }
  // deux façons : (1) le Parfait jusqu'à la niche + la niche + la suite ; (2) tout le niveau en visant l'éclat.
  // On garde la plus rapide ; si l'une échoue, l'autre suffit (un éclat n'est jamais déclaré impossible à tort).
  const cands = [];
  if (a.ok) {
    let b;
    try { b = chercher(def, true, { depart: { etat: a.etat } }); } catch (err) { b = { ok: false }; }
    if (b.ok) cands.push({ entrees: pre.concat(a.entrees, b.entrees), temps: b.temps });
  }
  let r = { ok: false };
  if (!cands.length) {                                   // seulement si la recherche locale a échoué (gain de temps)
  const aff = opt.affiner; opt.affiner = 0;             // l'affinage se fait une seule fois, sur le meilleur
  try { r = chercher(def, true); } catch (err) { r = { ok: false }; }
  opt.affiner = aff;
  }
  if (r.ok) cands.push({ entrees: r.entrees, temps: r.temps });
  if (!cands.length) return { ok: false };
  cands.sort((x, y) => x.temps - y.temps);
  let tout = cands[0].entrees, temps = cands[0].temps;
  if (opt.affiner > 0) { const A = actions(n); const rr = affiner(n, tout, A, true); tout = rr.entrees; temps = rr.temps; }
  return { ok: true, temps, entrees: tout };
}
module.exports = { chercher, chercherEclat, opt, champ, lire };
if (require.main === module) {
const fichier = path.join(__dirname, '..', 'js', 'parfaits.js');
const dossier = path.join(__dirname, 'parfaits');
if (!fs.existsSync(dossier)) fs.mkdirSync(dossier);
function fusionner() {
  const PARFAITS = {};
  for (const f of fs.readdirSync(dossier).sort()) if (f.endsWith('.json')) {
    const d = JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8'));
    if (d.te !== undefined && (d.t === undefined || d.te < d.t)) { d.t = d.te; d.f = d.fe; }   // le parcours avec l'éclat peut être le plus rapide
    PARFAITS[f.slice(0, -5)] = d.te !== undefined ? { t: d.t, f: d.f, te: d.te, fe: d.fe } : { t: d.t, f: d.f };
  }
  const corps = '/* Généré par outils/bot.js : temps « Parfait » (en images à 60 par seconde) et fantôme du robot. */\n' +
    '(function (r) {\nconst PARFAITS = ' + JSON.stringify(PARFAITS, null, 0).replace(/\},"/g, '},\n"') + ';\n' +
    "if (typeof module !== 'undefined' && module.exports) module.exports = PARFAITS; else r.PARFAITS = PARFAITS;\n" +
    "})(typeof window !== 'undefined' ? window : globalThis);\n";
  fs.writeFileSync(fichier, corps);
}
const crypto = require('crypto');
const EMPREINTE_MOTEUR = crypto.createHash('md5').update(fs.readFileSync(path.join(__dirname, '..', 'js', 'moteur.js'))).digest('hex').slice(0, 10);
function empreinte(def) { return crypto.createHash('md5').update(EMPREINTE_MOTEUR + JSON.stringify(def.etats) + def.carte.join('\n')).digest('hex').slice(0, 12); }
function enregistrer(id, champs) {
  const f = path.join(dossier, id + '.json');
  let d = {}; try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (err) { d = {}; }
  // on ne garde un nouveau temps que s'il est meilleur (ou si --remplacer, après une modif du niveau/moteur)
  if (champs.h && d.h !== champs.h) d = { h: champs.h };          // le niveau ou le moteur a changé : on repart de zéro
  if (champs.h) d.h = champs.h;
  if (opt.remplacer || champs.t !== undefined && (d.t === undefined || champs.t < d.t)) Object.assign(d, champs.t !== undefined ? { t: champs.t, f: champs.f } : {});
  if (champs.te !== undefined && (opt.remplacer || d.te === undefined || champs.te < d.te)) Object.assign(d, { te: champs.te, fe: champs.fe });
  fs.writeFileSync(f, JSON.stringify(d));
}
if (args.includes('--fusion')) { fusionner(); console.log('js/parfaits.js reconstruit'); process.exit(0); }

const tous = [];
for (const z of NIV.ZONES) for (const nv of z.niveaux) tous.push(nv);
const cibles = ids.length ? tous.filter(nv => ids.includes(nv.id) || ids.includes(nv.id.split('-')[0])) : tous;
const t0 = Date.now();
let echecs = 0;
for (const def of cibles) {
  const d0 = Date.now();
  const h = empreinte(def);
  if (args.includes('--changes')) {                // seulement les niveaux qui ont changé depuis leur dernier calcul
    let d = null; try { d = JSON.parse(fs.readFileSync(path.join(dossier, def.id + '.json'), 'utf8')); } catch (err) { d = null; }
    if (d && d.h === h && d.t !== undefined && (!opt.eclat || !M.charger(def).aEclat || d.te !== undefined)) { console.log(def.id.padEnd(5) + ' inchangé'); continue; }
  }
  const r = chercher(def, false);
  let ligne = def.id.padEnd(5) + ' ' + (def.nom || '').padEnd(26);
  if (!r.ok) { echecs++; ligne += ' ÉCHEC (bloqué à ~' + r.meilleur + ' cases du but)'; }
  else {
    ligne += ' ' + (r.temps / 60).toFixed(3) + ' s';
    if (opt.ecrire) enregistrer(def.id, { h, t: r.temps, f: M.compresser(r.entrees) });
  }
  if (opt.eclat && M.charger(def).aEclat) {
    const r2 = chercherEclat(def, r);
    if (!r2.ok) { echecs++; ligne += ' | éclat : ÉCHEC'; }
    else {
      ligne += ' | éclat ' + (r2.temps / 60).toFixed(3) + ' s';
      if (opt.ecrire) enregistrer(def.id, { h, te: r2.temps, fe: M.compresser(r2.entrees) });
    }
  }
  console.log(ligne + '  (' + ((Date.now() - d0) / 1000).toFixed(1) + ' s de calcul)');
}
console.log('Total : ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s, ' + echecs + ' échec(s)');
if (opt.ecrire) { fusionner(); console.log('js/parfaits.js mis à jour'); }
process.exitCode = echecs ? 1 : 0;
}
