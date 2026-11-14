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
const opt = { faisceau: 900, pasK: 4, eclat: false, ecrire: false, max: 7200, parCase: 3, danger: 96, affiner: 20000, verbeux: true };
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
    return !(t === M.MUR || t === M.GLACE || t === M.TAPIS_G || t === M.TAPIS_D || t === M.PICS || t === M.FEU);
  };
  const entrees = {};
  for (let i = 0; i < n.w * n.h; i++) {
    const t = n.g[i];
    if (t === M.TP1 || t === M.TP2) { const so = n.sorties[t]; if (so) (entrees[so.y * n.w + so.x] = entrees[so.y * n.w + so.x] || []).push(i); }
  }
  // Dijkstra simple (8 voisins)
  const file = [];
  for (const [x, y] of cibles) { d[y * n.w + x] = 0; file.push([0, x, y]); }
  const vois = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (file.length) {
    let bi = 0; for (let i = 1; i < file.length; i++) if (file[i][0] < file[bi][0]) bi = i;
    const [dd, x, y] = file[bi]; file[bi] = file[file.length - 1]; file.pop();
    if (dd > d[y * n.w + x]) continue;
    for (const ent of (entrees[y * n.w + x] || [])) {           // téléporteur : l'entrée vaut la sortie
      if (dd < d[ent]) { d[ent] = dd; file.push([dd, ent % n.w, Math.floor(ent / n.w)]); }
    }
    for (const [ax, ay, c] of vois) {
      const nx = x + ax, ny = y + ay;
      if (!passe(nx, ny)) continue;
      if (ax && ay && (!passe(x + ax, y) || !passe(x, y + ay))) continue;
      const cout = n.g[ny * n.w + nx] === M.FRAGILE ? c * 1.5 : c;
      if (dd + cout < d[ny * n.w + nx]) { d[ny * n.w + nx] = dd + cout; file.push([dd + cout, nx, ny]); }
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
  for (const [bit, p] of [[E.S, M.S], [E.L, M.L], [E.Z, M.Z]]) if (ph & (1 << p)) for (const h of hs) for (const vv of [0, E.H, E.B]) A.push({ base: h | vv, sw: bit });
  if (ph & (1 << M.P)) for (const h of hs) for (const vv of [0, E.H, E.B]) A.push({ base: h | vv, sw: E.P });
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
  const finir = (depart, ent, i0, limite) => {
    const e = M.cloner(depart);
    for (let i = i0; i < ent.length; i++) {
      M.pas(n, e, ent[i]);
      if (e.fini) { if (!avecEclat || e.eclat) return e.temps; e.fini = false; }
      if (e.temps >= limite) return Infinity;
    }
    return Infinity;
  };
  let meilleur = entrees.slice();
  let tps = finir(M.nouvelEtat(n), meilleur, 0, Infinity);
  let etats = instantanes(meilleur);
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
    } else if (m < 0.65) {
      const Lg = 1 + Math.floor(alea() * 6);
      for (let k = i + Lg; k < len; k++) cand.push(meilleur[k]);
    } else if (m < 0.85) {
      const Lg = 1 + Math.floor(alea() * 10), bit = [M.E.SAUT, M.E.G, M.E.D, M.E.H, M.E.B][Math.floor(alea() * 5)];
      for (let k = i; k < len; k++) cand.push(k < i + Lg ? (meilleur[k] ^ bit) : meilleur[k]);
    } else {
      const Lg = 1 + Math.floor(alea() * 4);
      for (let k = 0; k < Lg; k++) cand.push(meilleur[i]);
      for (let k = i; k < len; k++) cand.push(meilleur[k]);
    }
    for (let k = 0; k < cand.length; k++) if ((cand[k] & M.E.G) && (cand[k] & M.E.D)) cand[k] &= ~M.E.G;
    const t = finir(etats[i] || M.nouvelEtat(n), cand, i, tps);
    if (t < tps) {
      tps = t; meilleur = cand;
      // couper ce qui suit l'arrivée
      const e = M.nouvelEtat(n); let k = 0;
      for (; k < meilleur.length; k++) { M.pas(n, e, meilleur[k]); if (e.fini) { if (!avecEclat || e.eclat) break; e.fini = false; } }
      meilleur = meilleur.slice(0, k + 1);
      etats = instantanes(meilleur);
    }
  }
  if (opt.verbeux) console.log('   affinage : ' + (debut / 60).toFixed(3) + ' → ' + (tps / 60).toFixed(3) + ' s');
  return { entrees: meilleur, temps: tps };
}

function chercher(def, avecEclat) {
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
        if (t === M.EAU || t === M.RESSORT || t === M.PLATE || M.plein(n, e, tx, ty)) { bon = true; break; }
      }
      if (!bon) pire++;
    }
    return pire === x1 - x0 + 1 ? opt.danger : 0;
  };
  const score = (e) => {
    if (dEcl && !e.eclat) return lire(n, dEcl, e) + eclatVersBut + danger(e);
    return lire(n, dBut, e) + danger(e);
  };
  const A = actions(n);
  const Kp = opt.pasK;
  let faisceau = [{ e: M.nouvelEtat(n), p: null, a: -1, s: 0 }];
  let fin = null;
  let meilleur = Infinity, meilleurE = null;
  for (let etape = 0; etape * Kp < opt.max && !fin; etape++) {
    const enfants = [];
    for (const nd of faisceau) {
      const precJ = nd.a >= 0 ? (A[nd.a].base & M.E.SAUT) : 0;
      for (let ai = 0; ai < A.length; ai++) {
        const a = A[ai];
        if (a.sw && nd.e.charges <= 0) continue;
        const c = M.cloner(nd.e);
        let mort = false, fini = false;
        for (let k = 0; k < Kp; k++) {
          const inp = a.base | (k === 0 ? a.sw : 0);
          M.pas(n, c, inp);
          if (c.mortT > 0) { mort = true; break; }
          if (c.fini) { if (!dEcl || c.eclat) fini = true; else c.fini = false; break; }
        }
        if (mort) continue;
        if (c.fini && dEcl && !c.eclat) continue;
        const nn = { e: c, p: nd, a: ai, s: fini ? -1 : score(c) };
        if (fini) { if (!fin || c.temps < fin.e.temps) fin = nn; continue; }
        enfants.push(nn);
      }
    }
    if (fin) break;
    enfants.sort((a, b) => a.s - b.s);
    const vus = new Set();
    const suivant = [];
    const parCase = new Map();
    const reste = [];
    // 1er passage : au plus 2 états par case (diversité), 2e passage : on complète
    for (const nd of enfants) {
      const e = nd.e;
      const cle = Math.round(e.x / 3) + ',' + Math.round(e.y / 3) + ',' + Math.round(e.vx * 1.5) + ',' + Math.round(e.vy * 1.5) + ',' +
        e.phase + e.charges + e.att + (e.dash > 0 ? 1 : 0) + (e.eclat ? 1 : 0) + ',' + e.casses.length + (e.slam ? 's' : '');
      if (vus.has(cle)) continue;
      vus.add(cle);
      const cc = ((e.x / 16) | 0) + ',' + ((e.y / 16) | 0) + ',' + e.phase + (e.eclat ? 1 : 0);
      const k = parCase.get(cc) || 0;
      if (k < opt.parCase) { parCase.set(cc, k + 1); suivant.push(nd); if (suivant.length >= opt.faisceau) break; }
      else reste.push(nd);
    }
    for (let i = 0; i < reste.length && suivant.length < opt.faisceau; i++) suivant.push(reste[i]);
    if (!suivant.length) break;
    faisceau = suivant;
    if (faisceau[0].s < meilleur) { meilleur = faisceau[0].s; meilleurE = faisceau[0].e; }
  }
  if (!fin) return { ok: false, meilleur: Math.round(meilleur / T) + ' ; meilleur point (' + (meilleurE.x / T).toFixed(1) + ',' + (meilleurE.y / T).toFixed(1) + ')' };
  // reconstruction des entrées image par image (rejoue pour s'arrêter pile à l'arrivée)
  const chaine = [];
  for (let nd = fin; nd && nd.a >= 0; nd = nd.p) chaine.push(nd.a);
  chaine.reverse();
  const entrees = [];
  for (const ai of chaine) for (let k = 0; k < Kp; k++) entrees.push(A[ai].base | (k === 0 ? A[ai].sw : 0));
  const e = M.nouvelEtat(n);
  const ok = [];
  for (const inp of entrees) {
    M.pas(n, e, inp); ok.push(inp);
    if (e.fini && (!dEcl || e.eclat)) break;
    if (e.fini) e.fini = false;
  }
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

const fichier = path.join(__dirname, '..', 'js', 'parfaits.js');
const dossier = path.join(__dirname, 'parfaits');
if (!fs.existsSync(dossier)) fs.mkdirSync(dossier);
function fusionner() {
  const PARFAITS = {};
  for (const f of fs.readdirSync(dossier).sort()) if (f.endsWith('.json')) {
    const d = JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8'));
    if (d.te !== undefined && (d.t === undefined || d.te < d.t)) { d.t = d.te; d.f = d.fe; }   // le parcours avec l'éclat peut être le plus rapide
    PARFAITS[f.slice(0, -5)] = { t: d.t, f: d.f };
  }
  const corps = '/* Généré par outils/bot.js : temps « Parfait » (en images à 60 par seconde) et fantôme du robot. */\n' +
    '(function (r) {\nconst PARFAITS = ' + JSON.stringify(PARFAITS, null, 0).replace(/\},"/g, '},\n"') + ';\n' +
    "if (typeof module !== 'undefined' && module.exports) module.exports = PARFAITS; else r.PARFAITS = PARFAITS;\n" +
    "})(typeof window !== 'undefined' ? window : globalThis);\n";
  fs.writeFileSync(fichier, corps);
}
function enregistrer(id, champs) {
  const f = path.join(dossier, id + '.json');
  let d = {}; try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (err) { d = {}; }
  // on ne garde un nouveau temps que s'il est meilleur (ou si --remplacer, après une modif du niveau/moteur)
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
  const r = chercher(def, false);
  let ligne = def.id.padEnd(5) + ' ' + (def.nom || '').padEnd(26);
  if (!r.ok) { echecs++; ligne += ' ÉCHEC (bloqué à ~' + r.meilleur + ' cases du but)'; }
  else {
    ligne += ' ' + (r.temps / 60).toFixed(3) + ' s';
    if (opt.ecrire) enregistrer(def.id, { t: r.temps, f: M.compresser(r.entrees) });
  }
  if (opt.eclat && M.charger(def).aEclat) {
    const r2 = chercher(def, true);
    if (!r2.ok) { echecs++; ligne += ' | éclat : ÉCHEC'; }
    else {
      ligne += ' | éclat ' + (r2.temps / 60).toFixed(3) + ' s';
      if (opt.ecrire) enregistrer(def.id, { te: r2.temps, fe: M.compresser(r2.entrees) });
    }
  }
  console.log(ligne + '  (' + ((Date.now() - d0) / 1000).toFixed(1) + ' s de calcul)');
}
console.log('Total : ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s, ' + echecs + ' échec(s)');
if (opt.ecrire) { fusionner(); console.log('js/parfaits.js mis à jour'); }
process.exitCode = echecs ? 1 : 0;
