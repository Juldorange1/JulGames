'use strict';
/* Colosses — la salle des trophées : un musée qu'on parcourt (molette, glisser, flèches) où chaque exploit est un
   objet posé sur son socle et éclairé. Elle remplace les hauts faits, les titres, la maîtrise et les statistiques :
   ailes Exploits, Colosses (statues des boss, en bronze, argent ou or selon tes étoiles), Titres (clique pour en porter
   un), Maîtrise des armes, Saisons d'Affrontement, et un mur de Statistiques (efficacité au fil des combats,
   courbe de classement, armes les plus efficaces). */

// ---------- historique pour les statistiques ----------
function histoSave() { return Save.d.histoCombats = Save.d.histoCombats || []; }
function noterCombat(v) {
  try {
    if (!G.def || !G.ars || G.mode === 'entrainement' || !(G.chrono > 3)) return;
    const h = histoSave();
    h.push({ t: Date.now(), v: v ? 1 : 0, eff: G.effFin === undefined ? null : G.effFin, dps: Math.round((G.degatsCombat || 0) / G.chrono), d: Math.round(G.chrono), esp: G.def.esp, a: G.ars.p, m: G.mode === 'normal' ? Save.d.diff : G.mode });
    if (h.length > 400) h.splice(0, h.length - 400);
  } catch (e) { }
}
const _bossTroph = G.bossMort;
G.bossMort = function () { const vivant = this.boss && !this.boss.mort; const r = _bossTroph.apply(this, arguments); if (vivant && this.boss && this.boss.mort) noterCombat(true); return r; };
const _mortTroph = G.mortJoueur;
G.mortJoueur = function () { const r = _mortTroph.apply(this, arguments); if (this.etat === 'mort') noterCombat(false); return r; };
// la courbe du classement : un point chaque fois que tes points changent
function noterClassement() { try { const P = profilAff(), l = P.courbe = P.courbe || []; if (!l.length || l[l.length - 1].p !== P.pts) { l.push({ t: Date.now(), p: P.pts }); if (l.length > 300) l.shift(); } } catch (e) { } }

// ---------- le contenu du musée ----------
const nomArmeT = (c, id) => { const a = trouveArme(c, id); return a ? sansIco(a.nom) : id; };
function ailesTrophees() {
  const d = Save.d, fait = d.succes || {}, T = typeof titresSave === 'function' ? titresSave() : {}, M = typeof maitriseSave === 'function' ? maitriseSave() : {};
  const ailes = [];
  ailes.push({ id: 'exploits', nom: T2('Exploits'), items: Object.entries(SUCCES).map(([id, x], i) => ({ type: i % 3 === 2 ? 'medaille' : 'coupe', nom: x.nom, desc: x.desc, ok: !!fait[id], date: fait[id], ico: x.ico, col: '#ffcf5a' })) });
  ailes.push({ id: 'colosses', nom: T2('Colosses'), items: ESP_TOUTES().map(e => {
    const E = ESPECES[e], m = M[e] || {}, n = typeof etoiles === 'function' ? etoiles(e) : 0, vu = d.codex.especes[e];
    return { type: 'statue', esp: e, nom: nomMaj(E.nom), ok: !!(vu && (m.v || vu.tues)), metal: m.parfait ? 'or' : n >= 4 ? 'or' : n >= 3 ? 'argent' : 'bronze', etoiles: n, parfait: !!m.parfait,
      desc: (typeof DEFIS_M !== 'undefined' ? DEFIS_M.map(D => (m[D.k] ? '✔ ' : '· ') + D.nom + ' — ' + D.desc).join('\n') : '') + (m.best ? '\n' + T2('Meilleur temps') + ' : ' + fmtTemps(m.best) : '') + (m.tues ? ' · ' + m.tues + ' ' + T2('victoires') : '') };
  }) });
  if (typeof TITRES !== 'undefined') ailes.push({ id: 'titres', nom: T2('Titres'), items: TITRES.filter(t => !t.esp || d.codex.especes[t.esp]).map(t => ({ type: 'blason', id: t.id, nom: t.nom, desc: t.desc, ok: !!T[t.id], date: T[t.id], porte: d.titre === t.id, col: '#c9a865' })) });
  const MA = typeof maitriseArmesSave === 'function' ? maitriseArmesSave() : { t: {} };
  const armes = Object.entries(MA.t || {}).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([k, s]) => { const [c, id] = k.split(':'), a = trouveArme(c, id), i = infoMaitrise(k); return { type: 'arme', cle: k, ico: a ? a.ico : '?', nom: nomArmeT(c, id), ok: i.n > 0, niv: i.n, desc: (i.n ? T2('Niv.') + ' ' + i.n + ' · ' + i.nom : T2('Pas encore de niveau')) + ' · ' + Math.floor(s / 60) + ' min ' + T2('de combat') + (i.reste ? ' · ' + T2('niveau suivant dans') + ' ' + Math.ceil(i.reste / 60) + ' min' : '') }; });
  ailes.push({ id: 'armes', nom: T2('Maîtrise des armes'), items: armes.length ? armes : [{ type: 'arme', ico: '?', nom: T2('Joue pour commencer'), ok: false, niv: 0, desc: T2('Plus tu combats avec une arme, plus sa maîtrise monte.') }] });
  const P = typeof profilAff === 'function' ? profilAff() : null;
  if (P) {
    const s = (P.palmares || []).map(x => ({ type: 'ecusson', nom: x.rang, desc: T2('Saison') + ' ' + x.s + ' · ' + x.pts + ' pts', ok: true, col: (RANGS.find(r => x.cle.startsWith(r.cle)) || RANGS[0]).col }));
    const r = rangAff(P.pts); s.push({ type: 'ecusson', nom: r.nom, desc: saisonAff().nom + ' (' + T2('en cours') + ') · ' + P.pts + ' pts · ' + P.v + ' V · ' + P.dft + ' D', ok: (P.v + P.dft) > 0, col: r.col, encours: true });
    ailes.push({ id: 'saisons', nom: T2('Saisons d\'Affrontement'), items: s });
  }
  ailes.push({ id: 'stats', nom: T2('Statistiques'), mur: true, items: [] });
  return ailes;
}

// ---------- dessin des trophées (faux relief : dégradés, reflets, rotation lente) ----------
const METAUX = { or: ['#fff3b8', '#e7b53c', '#8a5a12'], argent: ['#ffffff', '#b9c3cf', '#5d6672'], bronze: ['#ffd9b0', '#c27a3e', '#5e3214'] };
const _statues = {};
function statueDe(esp, metal) {
  const k = esp + metal; if (_statues[k]) return _statues[k];
  const cv2 = document.createElement('canvas'); cv2.width = cv2.height = 220; const c = cv2.getContext('2d');
  try {
    let def; ESP_FORCE = esp; try { def = genBoss(10, hashStr('statue-' + esp), false, []); } finally { ESP_FORCE = null; }
    const b = creerBoss(def); b.intro = 0; b.x = 0; b.y = 0; b.facing = Math.PI / 2; b.eyesA = b.facing; b.armure = 0;
    if (b.esp && b.esp.init) { try { b.esp.init(b); } catch (e) { } }
    if (esp === 'serpent' && b.s) { const tr = []; let th = 0; for (let i = 0; i < 200; i++) { const rr = Math.max(26, 60 - i * .2); th += 4 / rr; tr.push({ x: Math.sin(th) * rr, y: 60 - Math.cos(th) * rr }); } b.s.trace = tr; b.s.dir = Math.PI; try { b.esp.maj(b); } catch (e) { } }
    const g0 = G.t; c.translate(110, esp === 'serpent' ? 80 : 110); const k2 = 70 / Math.max(40, b.r * 1.9); c.scale(k2, k2);
    try { dessinerBoss(c, b); } catch (e) { }
    G.t = g0;
  } catch (e) { }
  // la statue : la silhouette du colosse coulée dans le métal
  const M = METAUX[metal]; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-atop';
  const g = c.createLinearGradient(40, 20, 180, 200); g.addColorStop(0, M[0]); g.addColorStop(.45, M[1]); g.addColorStop(1, M[2]);
  c.globalAlpha = .86; c.fillStyle = g; c.fillRect(0, 0, 220, 220); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  return (_statues[k] = cv2);
}
function dessinerTrophee(c, it, x, y, t, survol) {
  const M = METAUX[it.metal] || METAUX.or, tourne = Math.cos(t * .9 + x * .01), sx = .35 + .65 * Math.abs(tourne);
  c.save(); c.translate(x, y);
  if (!it.ok) { c.globalAlpha = .55; }
  const metal = (x0, y0, x1, y1, m) => { const g = c.createLinearGradient(x0, y0, x1, y1); const mm = it.ok ? (m || M) : ['#55505e', '#2c2833', '#141118']; g.addColorStop(0, mm[0]); g.addColorStop(.5, mm[1]); g.addColorStop(1, mm[2]); return g; };
  if (it.type === 'coupe') {
    c.scale(sx, 1);
    const m = METAUX.or;
    c.fillStyle = metal(-40, -90, 40, 0, m);
    c.beginPath(); c.moveTo(-34, -88); c.quadraticCurveTo(-36, -40, -8, -30); c.lineTo(-6, -12); c.lineTo(-20, -4); c.lineTo(20, -4); c.lineTo(6, -12); c.lineTo(8, -30); c.quadraticCurveTo(36, -40, 34, -88); c.closePath(); c.fill();
    c.strokeStyle = it.ok ? '#8a5a12' : '#222'; c.lineWidth = 3; c.beginPath(); c.arc(-36, -68, 12, Math.PI * .5, Math.PI * 1.5); c.stroke(); c.beginPath(); c.arc(36, -68, 12, -Math.PI * .5, Math.PI * .5); c.stroke();
    c.fillStyle = metal(-22, -6, 22, 4, m); c.fillRect(-22, -6, 44, 7);
    if (it.ok) { c.globalAlpha = .55; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-16 * tourne, -66, 5, 16, 0, 0, TAU); c.fill(); c.globalAlpha = 1; }
    c.scale(1 / sx, 1); c.font = '22px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; if (it.ok) c.fillText(it.ico || '★', 0, -62);
  } else if (it.type === 'medaille') {
    c.fillStyle = it.ok ? '#b8323f' : '#333'; c.beginPath(); c.moveTo(-14, -100); c.lineTo(-4, -60); c.lineTo(4, -60); c.lineTo(14, -100); c.closePath(); c.fill();
    c.scale(sx, 1); c.fillStyle = metal(-28, -70, 28, -14); c.beginPath(); c.arc(0, -42, 28, 0, TAU); c.fill();
    c.strokeStyle = it.ok ? '#fff3b8' : '#444'; c.lineWidth = 2; c.beginPath(); c.arc(0, -42, 22, 0, TAU); c.stroke();
    c.scale(1 / sx, 1); c.font = '22px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; if (it.ok) c.fillText(it.ico || '★', 0, -42);
  } else if (it.type === 'statue') {
    const im = it.ok ? statueDe(it.esp, it.metal) : null;
    if (im) { const b2 = Math.sin(t * 1.2 + x * .02) * 2; c.drawImage(im, -55, -112 + b2, 110, 110); if (it.parfait) { c.globalCompositeOperation = 'lighter'; c.drawImage(glow('rgba(255,220,120,.35)', 70), -70, -128, 140, 140); c.globalCompositeOperation = 'source-over'; } }
    else { c.fillStyle = '#211d28'; c.beginPath(); c.ellipse(0, -55, 34, 40, 0, 0, TAU); c.fill(); c.fillStyle = '#6d6578'; c.font = `900 34px ${POLICE}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, -55); }
  } else if (it.type === 'blason') {
    c.scale(sx, 1); c.fillStyle = metal(-30, -100, 30, 0, it.porte ? METAUX.or : METAUX.argent);
    c.beginPath(); c.moveTo(-30, -96); c.lineTo(30, -96); c.lineTo(30, -52); c.quadraticCurveTo(30, -18, 0, -4); c.quadraticCurveTo(-30, -18, -30, -52); c.closePath(); c.fill();
    c.strokeStyle = it.ok ? '#5d4a26' : '#222'; c.lineWidth = 3; c.stroke();
    c.scale(1 / sx, 1); c.fillStyle = it.ok ? '#3a2a10' : '#555'; c.font = `900 26px ${POLICE_ER}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(it.ok ? (it.nom[0] || '?').toUpperCase() : '?', 0, -55);
  } else if (it.type === 'arme') {
    const cols = ['#555', '#c27a3e', '#c27a3e', '#b9c3cf', '#b9c3cf', '#e7b53c', '#e7b53c', '#7fe3d4', '#8ac6ff', '#d08bff', '#ff8a5c'], col = cols[Math.min(10, it.niv || 0)];
    c.fillStyle = '#1b1622'; c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.roundRect ? c.roundRect(-34, -96, 68, 80, 8) : c.rect(-34, -96, 68, 80); c.fill(); c.stroke();
    try { if (!icoDessin(c, it.ico, 0, -64, 40, col)) { c.font = '30px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sansIco(it.ico), 0, -64); } } catch (e) { }
    c.fillStyle = col; c.font = `900 15px ${POLICE}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(it.niv ? T2('Niv.') + ' ' + it.niv : '—', 0, -30);
  } else if (it.type === 'ecusson') {
    c.scale(sx, 1); const col = it.ok ? it.col : '#444';
    c.fillStyle = col; c.beginPath(); c.moveTo(0, -104); c.lineTo(32, -60); c.lineTo(0, -10); c.lineTo(-32, -60); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(0, -104); c.lineTo(32, -60); c.lineTo(0, -60); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.moveTo(0, -10); c.lineTo(-32, -60); c.lineTo(0, -60); c.closePath(); c.fill();
  }
  c.restore();
  if (survol) { c.save(); c.globalCompositeOperation = 'lighter'; c.drawImage(glow('rgba(255,230,160,.25)', 90), x - 90, y - 150, 180, 180); c.restore(); }
}
// les graphiques du mur des statistiques
function cadreGraphe(c, x, y, w, h, titre, points, opts) {
  c.save();
  c.fillStyle = '#3b2a16'; c.fillRect(x - 10, y - 10, w + 20, h + 20); c.fillStyle = '#efe6d2'; c.fillRect(x, y, w, h);
  c.fillStyle = '#3a2a16'; c.font = `800 15px ${POLICE_ER}`; c.textAlign = 'center'; c.fillText(titre, x + w / 2, y + 20);
  const gx = x + 40, gy = y + 34, gw = w - 56, gh = h - 60;
  c.strokeStyle = 'rgba(60,40,20,.25)'; c.lineWidth = 1; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(gx, gy + gh * i / 4); c.lineTo(gx + gw, gy + gh * i / 4); c.stroke(); }
  if (!points.length) { c.fillStyle = '#8a7a60'; c.font = `14px ${POLICE}`; c.fillText(T2('Pas encore de données'), x + w / 2, y + h / 2 + 10); c.restore(); return; }
  if (opts.barres) {
    const max = Math.max(...points.map(p => p.v)), bw = gw / points.length;
    points.forEach((p, i) => { const hh = gh * p.v / max; c.fillStyle = i ? '#b8873a' : '#d4a23c'; c.fillRect(gx + i * bw + 6, gy + gh - hh, bw - 12, hh); c.fillStyle = '#3a2a16'; c.font = `700 11px ${POLICE}`; c.fillText(p.l.slice(0, 12), gx + i * bw + bw / 2, gy + gh + 14); c.fillText(Math.round(p.v), gx + i * bw + bw / 2, gy + gh - hh - 6); });
  } else {
    const vs = points.map(p => p.v), lo = opts.min !== undefined ? opts.min : Math.min(...vs), hi = opts.max !== undefined ? opts.max : Math.max(...vs), dv = Math.max(1, hi - lo);
    c.fillStyle = '#6b5638'; c.font = `11px ${POLICE}`; c.textAlign = 'right'; c.fillText(Math.round(hi), gx - 6, gy + 4); c.fillText(Math.round(lo), gx - 6, gy + gh);
    c.strokeStyle = opts.col || '#b8323f'; c.lineWidth = 2.5; c.beginPath();
    points.forEach((p, i) => { const px = gx + (points.length === 1 ? gw / 2 : gw * i / (points.length - 1)), py = gy + gh - gh * (p.v - lo) / dv; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
    c.stroke();
  }
  c.restore();
}
function dessinerMurStats(c, x0, y0, t) {
  const h = histoSave(), P = profilAff();
  const eff = h.filter(e => e.eff !== null).slice(-40).map(e => ({ v: e.eff }));
  const rang = (P.courbe || []).slice(-60).map(e => ({ v: e.p }));
  const parArme = {}; for (const e of h) { if (!e.a) continue; const o = parArme[e.a] = parArme[e.a] || { n: 0, s: 0 }; o.n++; o.s += e.dps; }
  const meilleures = Object.entries(parArme).filter(([, o]) => o.n >= 2).map(([a, o]) => ({ l: nomArmeT('p', a), v: o.s / o.n })).sort((a, b) => b.v - a.v).slice(0, 6);
  cadreGraphe(c, x0, y0 - 300, 420, 240, T2('Efficacité au fil des combats (%)'), eff, { min: 0, max: 100, col: '#2f7d4f' });
  cadreGraphe(c, x0 + 480, y0 - 300, 420, 240, T2('Classement d\'Affrontement'), rang, { col: '#2a5d9c' });
  cadreGraphe(c, x0 + 960, y0 - 300, 420, 240, T2('Armes les plus efficaces (dégâts/s)'), meilleures, { barres: true });
  const s = Save.d.stats, vict = h.filter(e => e.v).length;
  const chiffres = [[s.boss || 0, T2('boss vaincus')], [Math.max(s.parfaits || 0, s.sansCoup || 0), T2('sans être touché')], [s.serieMax || 0, T2('meilleure série')], [h.length ? Math.round(100 * vict / h.length) + ' %' : '—', T2('combats gagnés')], [eff.length ? Math.round(eff.reduce((a, b) => a + b.v, 0) / eff.length) + ' %' : '—', T2('efficacité moyenne')]];
  chiffres.forEach(([v, l], i) => { const x = x0 + 60 + i * 270, y = y0 - 20; c.save(); c.textAlign = 'center'; texteOmbre(c, String(v), x, y - 6, '#ffe7a6', `900 34px ${POLICE}`, 4); c.font = `600 14px ${POLICE}`; c.fillStyle = '#d8ccb4'; c.fillText(l, x, y + 22); c.restore(); });
}

// ---------- la visite ----------
const Musee = {
  cam: 0, vise: 0, ailes: null, places: [], survol: -1, choix: -1, cv: null, boucle: null, glisse: null,
  ouvrir(aile) {
    noterClassement();
    if (typeof verifierTitres === 'function') verifierTitres();
    this.ailes = ailesTrophees(); this.places = [];
    let x = 160;
    for (const a of this.ailes) {
      a.x0 = x; x += 120;
      if (a.mur) { a.x1 = x + 1400; x += 1500; continue; }
      a.items.forEach((it, i) => { this.places.push({ it, x, aile: a }); x += 170; });
      a.x1 = x; x += 160;
    }
    this.largeur = x;
    const cible = aile ? this.ailes.find(a => a.id === aile) : null;
    this.cam = this.vise = cible ? Math.max(0, cible.x0 - 60) : 0;
    this.choix = -1;
  },
  dessiner() {
    const cv2 = this.cv; if (!cv2 || !cv2.isConnected) { cancelAnimationFrame(this.boucle); this.boucle = null; return; }
    const r = cv2.getBoundingClientRect(), dpr2 = window.devicePixelRatio || 1;
    if (cv2.width !== Math.round(r.width * dpr2) || cv2.height !== Math.round(r.height * dpr2)) { cv2.width = Math.round(r.width * dpr2); cv2.height = Math.round(r.height * dpr2); }
    const c = cv2.getContext('2d'), Hh = 520, k = cv2.height / Hh, Ww = cv2.width / k, t = performance.now() / 1000;
    this.cam += (this.vise - this.cam) * .14; this.vise = clamp(this.vise, 0, Math.max(0, this.largeur - Ww));
    c.setTransform(k, 0, 0, k, 0, 0);
    // murs et sol du musée
    const gm = c.createLinearGradient(0, 0, 0, 360); gm.addColorStop(0, '#1a1320'); gm.addColorStop(1, '#2e2230'); c.fillStyle = gm; c.fillRect(0, 0, Ww, 360);
    const gs = c.createLinearGradient(0, 360, 0, Hh); gs.addColorStop(0, '#3a2a1c'); gs.addColorStop(1, '#170f0a'); c.fillStyle = gs; c.fillRect(0, 360, Ww, Hh - 360);
    c.save(); c.translate(-this.cam, 0);
    // lattes du parquet et colonnes
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; for (let x = Math.floor(this.cam / 80) * 80; x < this.cam + Ww + 80; x += 80) { c.beginPath(); c.moveTo(x, 360); c.lineTo(x + (x - this.cam - Ww / 2) * .25, Hh); c.stroke(); }
    for (let x = Math.floor(this.cam / 340) * 340; x < this.cam + Ww + 340; x += 340) { const g = c.createLinearGradient(x - 18, 0, x + 18, 0); g.addColorStop(0, '#24192a'); g.addColorStop(.5, '#3a2c3e'); g.addColorStop(1, '#1c1420'); c.fillStyle = g; c.fillRect(x - 18, 0, 36, 360); }
    // bannières des ailes
    for (const a of this.ailes) {
      if (a.x1 < this.cam - 50 || a.x0 > this.cam + Ww + 50) continue;
      c.fillStyle = '#5a1e2a'; c.fillRect(a.x0, 34, 220, 46); c.fillStyle = '#c9a865'; c.fillRect(a.x0, 80, 220, 3);
      c.fillStyle = '#ffe7a6'; c.font = `800 18px ${POLICE_ER}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(a.nom, a.x0 + 14, 57);
      if (!a.mur) { const n = a.items.filter(i => i.ok).length; c.fillStyle = '#d8ccb4'; c.font = `600 13px ${POLICE}`; c.fillText(n + ' / ' + a.items.length, a.x0 + 14, 98); }
      if (a.mur) dessinerMurStats(c, a.x0 + 40, 420, t);
    }
    // socles, lumières et trophées
    this.places.forEach((pl, i) => {
      const x = pl.x; if (x < this.cam - 120 || x > this.cam + Ww + 120) return;
      c.save(); c.globalCompositeOperation = 'lighter'; const lg = c.createRadialGradient(x, 210, 10, x, 260, 150); lg.addColorStop(0, pl.it.ok ? 'rgba(255,225,160,.22)' : 'rgba(150,140,170,.08)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = lg; c.fillRect(x - 150, 110, 300, 300); c.restore();
      const g = c.createLinearGradient(x - 40, 0, x + 40, 0); g.addColorStop(0, '#3c3442'); g.addColorStop(.5, '#6c6274'); g.addColorStop(1, '#2a242f');
      c.fillStyle = g; c.fillRect(x - 38, 290, 76, 90); c.fillStyle = '#7c7284'; c.beginPath(); c.ellipse(x, 290, 44, 10, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(x, 382, 50, 9, 0, 0, TAU); c.fill();
      dessinerTrophee(c, pl.it, x, 286, t, i === this.survol || i === this.choix);
      c.fillStyle = pl.it.ok ? '#efe2c0' : '#7a7088'; c.font = `700 12px ${POLICE}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const nom = pl.it.ok || pl.it.type === 'statue' && pl.it.ok ? pl.it.nom : (pl.it.type === 'statue' ? '???' : pl.it.nom); c.fillText(String(nom).slice(0, 22), x, 400);
      if (pl.it.porte) { c.fillStyle = '#ffd86b'; c.fillText('« ' + T2('porté') + ' »', x, 416); }
      if (pl.it.type === 'statue' && pl.it.ok) { c.fillStyle = '#ffd86b'; c.fillText('★'.repeat(pl.it.etoiles) + '☆'.repeat(Math.max(0, 4 - pl.it.etoiles)), x, 416); }
    });
    c.restore();
    // ombre douce sur les bords (profondeur)
    const v = c.createLinearGradient(0, 0, Ww, 0); v.addColorStop(0, 'rgba(0,0,0,.55)'); v.addColorStop(.08, 'rgba(0,0,0,0)'); v.addColorStop(.92, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); c.fillStyle = v; c.fillRect(0, 0, Ww, Hh);
    this.k = k; this.Ww = Ww;
    this.boucle = requestAnimationFrame(() => this.dessiner());
  },
  pointe(ev) {
    const r = this.cv.getBoundingClientRect(), k = this.cv.height / 520 / (window.devicePixelRatio || 1), x = (ev.clientX - r.left) / k + this.cam, y = (ev.clientY - r.top) / k;
    return this.places.findIndex(pl => Math.abs(pl.x - x) < 60 && y > 150 && y < 420);
  },
  detail() {
    const d = document.getElementById('musee-detail'); if (!d) return;
    const pl = this.places[this.choix]; if (!pl) { d.innerHTML = `<p class="mini">${T2('Clique sur un trophée pour le voir de près. Molette, glisser ou flèches pour te déplacer.')}</p>`; return; }
    const it = pl.it;
    d.innerHTML = `<b>${it.ok || it.type !== 'statue' ? it.nom : '???'}</b> <small>${pl.aile.nom}</small><p>${String(it.desc || '').replace(/\n/g, '<br>')}</p>${it.date ? `<p class="mini">${T2('Obtenu le')} ${new Date(it.date).toLocaleDateString('fr-FR')}</p>` : ''}${it.type === 'blason' && it.ok && !it.porte ? `<button data-a="tropheeTitre" data-k="${it.id}">${T2('Porter ce titre')}</button>` : ''}`;
    d.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); UI.action(b.dataset.a, b); }));
  }
};
UI.trophees = function (aile) {
  Musee.ouvrir(aile);
  const nav = Musee.ailes.map(a => `<button data-a="tropheeAile" data-o="${a.id}">${a.nom}</button>`).join('');
  this.ecran('🏆 ' + T2('Salle des trophées'), `<div class="onglets musee-nav">${nav}</div><canvas id="musee" class="musee"></canvas><div id="musee-detail" class="musee-detail"></div>`, 'large musee-p');
  const cv2 = Musee.cv = this.el.querySelector('#musee');
  cv2.addEventListener('wheel', ev => { ev.preventDefault(); Musee.vise += (ev.deltaY + ev.deltaX) * 1.2; }, { passive: false });
  cv2.addEventListener('pointerdown', ev => { Musee.glisse = { x: ev.clientX, cam: Musee.vise, bouge: 0 }; cv2.setPointerCapture(ev.pointerId); });
  cv2.addEventListener('pointermove', ev => { if (Musee.glisse) { const dx = ev.clientX - Musee.glisse.x; Musee.glisse.bouge = Math.max(Musee.glisse.bouge, Math.abs(dx)); Musee.vise = Musee.glisse.cam - dx / ((Musee.k || 1) / (window.devicePixelRatio || 1)); } else Musee.survol = Musee.pointe(ev); });
  cv2.addEventListener('pointerup', ev => { const g = Musee.glisse; Musee.glisse = null; if (g && g.bouge < 6) { Musee.choix = Musee.pointe(ev); Musee.detail(); if (Musee.choix >= 0) Son.play('clic'); } });
  cv2.addEventListener('pointerleave', () => { Musee.survol = -1; });
  Musee.detail();
  if (!Musee.boucle) Musee.dessiner();
};
// les flèches du clavier pour marcher dans le musée
addEventListener('keydown', ev => { if (!Musee.cv || !Musee.cv.isConnected) return; if (ev.key === 'ArrowRight') Musee.vise += 170; if (ev.key === 'ArrowLeft') Musee.vise -= 170; });
// la salle des trophées remplace les hauts faits, la maîtrise et les statistiques (sans journal ni « entre amis »)
UI.hautsFaits = function (o) { return UI.trophees(o === 'titres' ? 'titres' : o === 'maitrise' ? 'colosses' : null); };
UI.stats = function () { return UI.trophees('stats'); };
UI.maitrise = function () { return UI.trophees('armes'); };
const _actTroph = UI.action;
UI.action = function (a, btn) {
  if (a === 'trophees') return this.trophees();
  if (a === 'tropheeAile') { const x = Musee.ailes && Musee.ailes.find(w => w.id === btn.dataset.o); if (x) Musee.vise = Math.max(0, x.x0 - 60); return; }
  if (a === 'tropheeTitre') { Save.d.titre = btn.dataset.k; Save.write(); const c = Musee.choix, cam = Musee.vise; this.trophees(); Musee.vise = Musee.cam = cam; Musee.choix = c; Musee.detail(); return; }
  return _actTroph.call(this, a, btn);
};
const _menuTroph = UI.menu;
UI.menu = function () {
  const r = _menuTroph.apply(this, arguments);
  try {
    noterClassement();
    const g = this.el.querySelector('.accueil .tuiles');
    if (g) {
      for (const k of ['hauts', 'stats', 'maitrise']) { const b = g.querySelector(`[data-a=${k}]`); if (b) b.remove(); }
      if (!g.querySelector('[data-a=trophees]')) {
        const b = document.createElement('button'); b.className = 'tuile'; b.dataset.a = 'trophees';
        const n = Object.keys(Save.d.succes || {}).length + Object.keys(typeof titresSave === 'function' ? titresSave() : {}).length;
        b.innerHTML = `<span>🏆</span>${T2('Trophées')}<small>${n}</small>`;
        b.addEventListener('click', ev => { ev.stopPropagation(); Son.init(); Son.play('clic'); UI.trophees(); });
        g.insertBefore(b, g.children[2] || null);
      }
      if (typeof ajusterAccueil === 'function') ajusterAccueil();
    }
  } catch (e) { console.warn('trophées', e); }
  return r;
};
