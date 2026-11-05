'use strict';
/* Colosses — régions : tous les 5 salles (un palier) on change de lieu. Chaque région a son décor, ses musiques et son
   piège, toujours annoncé et esquivable (dégâts plus faibles qu'une attaque de boss). Après la 6e région on recommence
   le tour, avec des pièges un peu plus fréquents. Rien ne rend plus fort : c'est du décor et du danger, pas un bonus. */

const REGIONS = [
  { id: 'temple', nom: 'Temple oublié', theme: 'temple', piege: 'dalles', pnom: 'Dalles piégées', pdesc: 'Des dalles s\'illuminent puis s\'effondrent : quitte la case qui brille.' },
  { id: 'forge', nom: 'Forge des titans', theme: 'metal', piege: 'vapeur', pnom: 'Jets de vapeur', pdesc: 'Les grilles des murs crachent de la vapeur brûlante : écarte-toi de la bande annoncée.' },
  { id: 'marais', nom: 'Marais des noyés', theme: 'marais', piege: 'vase', pnom: 'Bulles de gaz', pdesc: 'La vase ralentit tes pas, et des bulles de gaz éclatent sous tes pieds : ne reste pas immobile.' },
  { id: 'volcan', nom: 'Cœur du volcan', theme: 'volcan', piege: 'eruption', pnom: 'Éruptions', pdesc: 'Le sol se fend et projette de la lave : trois cercles, dont un sous toi.' },
  { id: 'cathedrale', nom: 'Cathédrale engloutie', theme: 'cathedrale', piege: 'vitrail', pnom: 'Lumière des vitraux', pdesc: 'Un rayon de lumière traverse l\'arène depuis les vitraux : sors de sa ligne.' },
  { id: 'celeste', nom: 'Ruines célestes', theme: 'celeste', piege: 'bourrasque', pnom: 'Bourrasques', pdesc: 'Une bourrasque annoncée par des traînées blanches te pousse : marche contre le vent.' }
];
const CHIFFRES_ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
function romain(n) { return CHIFFRES_ROMAINS[n - 1] || String(n); }
function regionDe(salle) {
  const i = Math.floor((Math.max(1, salle || 1) - 1) / 5), R0 = REGIONS[i % REGIONS.length];
  return Object.assign({ idx: i % REGIONS.length, num: i + 1, tour: Math.floor(i / REGIONS.length) }, R0);
}
function regionActive() { return G.mode !== 'entrainement' && G.def ? regionDe(G.salle) : null; }

// ---------- nouveaux thèmes de décor ----------
Object.assign(THEMES, {
  marais: { nom: 'Marais', sol: [95, 22, 12], joint: 'rgba(0,0,0,.5)', mur: '#26301e', murH: '#4f5e3a', brume: 'rgba(150,200,120,', feu: false },
  cathedrale: { nom: 'Cathédrale', sol: [220, 12, 22], joint: 'rgba(0,0,0,.55)', mur: '#2a2c3a', murH: '#5e6280', brume: 'rgba(150,180,255,', feu: true },
  celeste: { nom: 'Ciel', sol: [42, 18, 30], joint: 'rgba(0,0,0,.4)', mur: '#5a5240', murH: '#c9b98a', brume: 'rgba(255,245,220,', feu: false }
});
Object.assign(AMB, {
  marais: { n: 34, col: '#b8ff7a', vy: [-12, 12], vx: [-12, 12], taille: [1.3, 2.4], glow: true, luciole: true },
  cathedrale: { n: 50, col: '#cfe0ff', vy: [-5, 5], vx: [-5, 5], taille: [.8, 1.8], rayons: true },
  celeste: { n: 40, col: '#fffaf0', vy: [-6, 6], vx: [18, 40], taille: [1, 2.4] }
});

const _rgSolOrig = texteSol;
let _rgSol = null, _rgSolCle = '';
texteSol = function () {
  const th = Decor.themeActif();
  if (th !== 'marais' && th !== 'cathedrale' && th !== 'celeste') return _rgSolOrig();
  const hue = G.def ? G.def.hue : 260, cle = th + '|' + Arene.version + '|' + hue;
  if (_rgSol && cle === _rgSolCle) return _rgSol;
  _rgSolCle = cle;
  const c = _rgSol || document.createElement('canvas'); c.width = W; c.height = H; _rgSol = c;
  const x = c.getContext('2d'), r = RNG(hashNum(Arene.version * 17 + hue + th.length * 131));
  x.clearRect(0, 0, W, H);
  if (th === 'marais') {
    // vase sombre, flaques d'eau noire, pierres moussues, roseaux et nénuphars
    x.fillStyle = '#121a0c'; x.fillRect(0, 0, W, H);
    tachesDouces(x, r, 40, .75, [[40, 55, 22], [22, 30, 14], [60, 70, 30], [12, 16, 8]]);
    if (typeof fondPhoto === 'function') fondPhoto(x, 'marais');
    for (let i = 0; i < 26; i++) {
      const cx = AR.x + r() * AR.w, cy = AR.y + r() * AR.h, rx = r.range(40, 110), ry = rx * r.range(.45, .7);
      const g = x.createRadialGradient(cx, cy, 2, cx, cy, rx); g.addColorStop(0, 'rgba(10,22,18,.95)'); g.addColorStop(.8, 'rgba(14,26,18,.85)'); g.addColorStop(1, 'rgba(14,26,18,0)');
      x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rx, ry, r() * .4, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(190,230,200,.12)'; x.lineWidth = 2; x.beginPath(); x.ellipse(cx - rx * .2, cy - ry * .3, rx * .45, ry * .2, 0, Math.PI * 1.1, Math.PI * 1.8); x.stroke();
      if (r() < .6) for (let k = 0; k < r.int(1, 3); k++) { const lx = cx + r.range(-rx * .6, rx * .6), ly = cy + r.range(-ry * .5, ry * .5), lr = r.range(7, 13); x.fillStyle = hsl(110, 45, 26 + r() * 10); x.beginPath(); x.moveTo(lx, ly); x.arc(lx, ly, lr, r() * TAU, r() * TAU + 5.6); x.closePath(); x.fill(); x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 1; x.stroke(); }
    }
    for (let i = 0; i < 40; i++) { const cx = AR.x + r() * AR.w, cy = AR.y + r() * AR.h; x.save(); x.globalAlpha = .55; x.beginPath(); polyJitter(r, cx, cy, r.range(16, 34), 7, .3).forEach(([a2, b2], k2) => k2 ? x.lineTo(a2, b2) : x.moveTo(a2, b2)); x.closePath(); x.fillStyle = hsl(90, 12, 15); x.fill(); x.restore(); x.fillStyle = 'rgba(90,140,50,.35)'; x.beginPath(); x.ellipse(cx - 4, cy - 6, 10, 6, 0, 0, TAU); x.fill(); }
    for (let i = 0; i < 260; i++) { const px = AR.x + r() * AR.w, py = AR.y + r() * AR.h; x.strokeStyle = hsl(70 + r() * 40, 35, 18 + r() * 16, .85); x.lineWidth = 1.5; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + r.range(-6, 6), py - 8, px + r.range(-10, 10), py - r.range(10, 22)); x.stroke(); } }
  } else if (th === 'cathedrale') {
    // dallage en damier de marbre, rosace au centre, taches de lumière colorée des vitraux, eau qui affleure
    x.fillStyle = '#0d0f18'; x.fillRect(0, 0, W, H);
    const s = 64;
    for (const [gx, gy] of carreauxGrille(s, false)) {
      const clair = (((gx - AR.x) / s | 0) + ((gy - AR.y) / s | 0)) % 2 === 0;
      pierre(x, [[gx + 1, gy + 1], [gx + s - 1, gy + 1], [gx + s - 1, gy + s - 1], [gx + 1, gy + s - 1]], dl => clair ? hsl(222, 9, Math.max(8, 25 + dl)) : hsl(232, 16, Math.max(3, 12 + dl)), r, 3);
      if (clair && r() < .5) for (let k = 0; k < 3; k++) { x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 1; x.beginPath(); x.moveTo(gx + r() * s, gy); x.bezierCurveTo(gx + r() * s, gy + s * .3, gx + r() * s, gy + s * .7, gx + r() * s, gy + s); x.stroke(); }
    }
    x.save(); x.translate(CX, CY); x.globalAlpha = .35; // très discret : ne doit pas ressembler à une zone d'attaque
    for (const [rr, w] of [[230, 8], [200, 3], [120, 5], [60, 3]]) { x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = w + 2; x.beginPath(); x.arc(0, 0, rr, 0, TAU); x.stroke(); x.strokeStyle = 'rgba(200,210,255,.2)'; x.lineWidth = w; x.stroke(); }
    for (let i = 0; i < 12; i++) { x.rotate(TAU / 12); x.strokeStyle = 'rgba(200,210,255,.16)'; x.lineWidth = 3; x.beginPath(); x.moveTo(60, 0); x.quadraticCurveTo(140, 50, 200, 0); x.quadraticCurveTo(140, -50, 60, 0); x.stroke(); }
    x.restore();
    x.globalCompositeOperation = 'lighter';
    const vitraux = ['rgba(255,60,80,', 'rgba(70,120,255,', 'rgba(255,200,60,', 'rgba(120,255,160,', 'rgba(200,90,255,'];
    for (let i = 0; i < 9; i++) {
      const px = AR.x + r() * AR.w, py = AR.y + r() * AR.h, L = r.range(90, 170);
      for (let k = 0; k < 6; k++) { const col = vitraux[r.int(0, vitraux.length - 1)], ox = px + (k % 3) * L / 3, oy = py + (k / 3 | 0) * L / 3; x.fillStyle = col + '.10)'; x.beginPath(); x.moveTo(ox, oy); x.lineTo(ox + L / 3 - 4, oy + 10); x.lineTo(ox + L / 3 - 14, oy + L / 3); x.lineTo(ox - 8, oy + L / 3 - 8); x.closePath(); x.fill(); }
    }
    x.globalCompositeOperation = 'source-over';
    // eau qui affleure : voile bleuté et reflets
    tachesDouces(x, r, 70, .22, [[20, 50, 110], [0, 0, 0], [40, 90, 160]]);
    for (let i = 0; i < 60; i++) { const px = AR.x + r() * AR.w, py = AR.y + r() * AR.h; x.strokeStyle = 'rgba(170,210,255,.12)'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(px, py, r.range(10, 30), r.range(3, 7), 0, 0, TAU); x.stroke(); }
  } else {
    // ruines célestes : ciel doré sous des dalles flottantes, nuages entre les pierres
    const g = x.createLinearGradient(0, AR.y, 0, AR.y + AR.h); g.addColorStop(0, '#4d6f98'); g.addColorStop(.6, '#a88a64'); g.addColorStop(1, '#8a5a40');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { const cx = AR.x + r() * AR.w, cy = AR.y + r() * AR.h, rr = r.range(40, 110); const gg = x.createRadialGradient(cx, cy, 2, cx, cy, rr); gg.addColorStop(0, 'rgba(255,240,220,.3)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gg; x.beginPath(); x.ellipse(cx, cy, rr * 1.6, rr * .6, 0, 0, TAU); x.fill(); }
    const s = 86;
    for (const [gx, gy] of carreauxGrille(s, true)) {
      // (plus de dalles manquantes : on les prenait pour des trous dans lesquels on tombe)
      const j = 4, pts = [[gx + 4 + r.range(-j, j), gy + 4 + r.range(-j, j)], [gx + s - 4 + r.range(-j, j), gy + 4 + r.range(-j, j)], [gx + s - 4 + r.range(-j, j), gy + s - 4 + r.range(-j, j)], [gx + 4 + r.range(-j, j), gy + s - 4 + r.range(-j, j)]];
      x.fillStyle = 'rgba(60,40,30,.35)'; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a + 6, b + 9) : x.moveTo(a + 6, b + 9)); x.closePath(); x.fill();
      pierre(x, pts, dl => hsl(214, 8 + r() * 5, Math.max(8, 40 + dl)), r, 6);
      if (r() < .22) { x.strokeStyle = 'rgba(214,170,70,.55)'; x.lineWidth = 2; x.beginPath(); x.arc(gx + s / 2, gy + s / 2, s * .22, 0, TAU); x.moveTo(gx + s / 2, gy + s * .2); x.lineTo(gx + s / 2, gy + s * .8); x.stroke(); }
      if (r() < .3) fissure(x, r, gx + r() * s, gy + r() * s, r.int(3, 6), 'rgba(0,0,0,.35)', 1);
    }
  }
  // finitions communes : ombre des murs, vignette (pas de cercle au sol : il ressemblait à une zone d'attaque)
  const v = x.createRadialGradient(CX, CY, 260, CX, CY, 780); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, th === 'celeste' ? 'rgba(20,10,5,.45)' : 'rgba(0,0,0,.5)');
  x.fillStyle = v; x.fillRect(0, 0, W, H);
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, AR.y, 0, AR.y + 50, AR.x, AR.y, AR.w, 50], [0, AR.y + AR.h, 0, AR.y + AR.h - 30, AR.x, AR.y + AR.h - 30, AR.w, 30]]) {
    const gg = x.createLinearGradient(x0, y0, x1, y1); gg.addColorStop(0, 'rgba(0,0,0,.5)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gg; x.fillRect(rx, ry, rw, rh);
  }
  return c;
};
// arrière-plan des nouveaux thèmes : on peint par-dessus le fond générique (une seule fois par clé)
const _rgFondOrig = texteFond;
let _rgFondCle = '';
texteFond = function () {
  const avant = texFondCle, c = _rgFondOrig(), th = Decor.themeActif();
  if (texFondCle !== avant || _rgFondCle !== texFondCle) {
    _rgFondCle = texFondCle;
    if (th === 'marais' || th === 'cathedrale' || th === 'celeste') {
      const x = c.getContext('2d'), r = RNG(hashStr(texFondCle + 'rg'));
      x.save(); x.beginPath(); x.rect(0, 0, W, H);
      if (Arene.kind === 'cercle') x.arc(CX, CY, AR.h / 2 + 28, 0, TAU, true); else x.rect(AR.x - 28, AR.y + AR.h + 28, AR.w + 56, -(AR.h + 56));
      x.clip('evenodd');
      if (th === 'celeste') { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#6f9fd8'); g.addColorStop(1, '#f0c690'); x.globalAlpha = .9; x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalAlpha = 1; for (let i = 0; i < 60; i++) { const cx = r() * W, cy = r() * H, rr = r.range(30, 90); const gg = x.createRadialGradient(cx, cy, 2, cx, cy, rr); gg.addColorStop(0, 'rgba(255,255,255,.7)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gg; x.beginPath(); x.ellipse(cx, cy, rr * 1.8, rr * .6, 0, 0, TAU); x.fill(); } }
      if (th === 'marais') for (let i = 0; i < 120; i++) { const px = r() * W, py = r() * H; x.strokeStyle = hsl(80 + r() * 30, 30, 14 + r() * 12, .9); x.lineWidth = 2; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + r.range(-8, 8), py - 14, px + r.range(-12, 12), py - r.range(18, 34)); x.stroke(); }
      if (th === 'cathedrale') for (let i = 0; i < 14; i++) { const px = r() * W, py = r() < .5 ? r() * (AR.y - 20) : AR.y + AR.h + 30 + r() * 40, cols = ['#ff3c50', '#4678ff', '#ffc83c', '#78ffa0', '#c85aff']; x.globalAlpha = .35; for (let k = 0; k < 4; k++) { x.fillStyle = cols[(i + k) % cols.length]; x.fillRect(px + (k % 2) * 9, py + (k >> 1) * 9, 8, 8); } x.globalAlpha = 1; }
      x.restore();
    }
  }
  return c;
};

// le décor suit la région (les cartes de phase glace / lave / ténèbres restent prioritaires)
const _rgNouvelleSalle = Decor.nouvelleSalle;
Decor.nouvelleSalle = function () {
  _rgNouvelleSalle.apply(this, arguments);
  const rg = regionActive();
  if (rg) this.theme = rg.theme;
  Regions.entrer(rg);
};

// ---------- musiques : chaque région a ses propres morceaux ----------
const _rgCombat = Musique.combat;
Musique.combat = function (nouvelle) {
  const rg = typeof G !== 'undefined' && G.def ? regionActive() : null;
  if (!rg) return _rgCombat.apply(this, arguments);
  const pool = MUS.combat.filter((f, i) => i % REGIONS.length === rg.idx);
  if (!nouvelle && this.courant && pool.includes(this.courant.src)) { this.courant.cible = 1; return; }
  const libres = pool.filter(f => !this.derniers.includes(f)), f = (libres.length ? libres : pool)[Math.floor(Math.random() * (libres.length || pool.length))];
  this.derniers.push(f); if (this.derniers.length > 6) this.derniers.shift();
  this.jouer(f, 4);
};

// ---------- pièges ----------
// vase du marais : une zone de sol qui ralentit (jamais de dégâts)
HZ.vase = {
  up(h, dt) { h.t += dt; },
  hit() { return false; },
  draw(h, c) {
    const a = Math.min(1, h.t / .8);
    c.save(); c.globalAlpha = a;
    const g = c.createRadialGradient(h.x, h.y, 4, h.x, h.y, h.r); g.addColorStop(0, 'rgba(48,40,18,.85)'); g.addColorStop(.75, 'rgba(58,52,24,.7)'); g.addColorStop(1, 'rgba(58,52,24,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(h.x, h.y, h.r, h.r * .72, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(160,150,90,.35)'; c.lineWidth = 2; c.setLineDash([6, 8]); c.lineDashOffset = -G.t * 6; c.beginPath(); c.ellipse(h.x, h.y, h.r * .9, h.r * .65, 0, 0, TAU); c.stroke(); c.setLineDash([]);
    for (let i = 0; i < 3; i++) { const k = (G.t * .6 + i / 3 + h.x * .01) % 1, px = h.x + Math.cos(i * 2.1 + h.y) * h.r * .45, py = h.y + Math.sin(i * 2.1 + h.x) * h.r * .3; c.strokeStyle = `rgba(200,190,120,${.5 * (1 - k)})`; c.lineWidth = 1.5; c.beginPath(); c.arc(px, py, 3 + k * 9, 0, TAU); c.stroke(); }
    c.restore();
  }
};
SOL_HZ.add('vase');

const Regions = {
  rg: null, carteT: 99, nouvelle: false, T: 0, rafale: null, piegeVu: false,
  entrer(rg) {
    const avant = this.rg;
    this.rg = rg; this.T = 0; this.rafale = null; G.lenteur = 1;
    // grande carte de titre quand on arrive dans une nouvelle région (ou au début d'une partie)
    this.nouvelle = !!rg && (!avant || avant.num !== rg.num || (G.salle % 5) === 1);
    this.carteT = this.nouvelle ? 0 : 99;
    this.flaques = [];
    if (rg && rg.piege === 'vase') {
      const r = RNG(hashNum((G.def ? G.def.seed : 1) * 7 + G.salle));
      for (let i = 0, essais = 0; i < 4 && essais < 80; essais++) {
        const x = AR.x + 110 + r() * (AR.w - 220), y = AR.y + 90 + r() * (AR.h - 180), rr = r.range(80, 115);
        if (d2(x, y, CX, AR.y + AR.h * .82) < 190 * 190 || d2(x, y, CX, CY) < 150 * 150 || this.flaques.some(f => d2(f.x, f.y, x, y) < (f.r + rr + 40) ** 2)) continue;
        this.flaques.push({ x, y, r: rr }); i++;
      }
    }
  },
  intervalle() { return Math.max(6.5, 11 - this.rg.tour * 1.5); },
  lancer(rg) {
    const p = G.p, src0 = G.atkCourante; G.atkCourante = rg.pnom;
    const dg = { dmg: DMG(.7) };
    if (!this.piegeVu && typeof Conseils !== 'undefined') Conseils.dire('piege:' + rg.piege, rg.pnom, rg.pdesc, 'ui:idee');
    if (rg.piege === 'dalles') {
      const s = 92, cases = [];
      const gx = q => AR.x + Math.floor((q - AR.x) / s) * s, gy = q => AR.y + Math.floor((q - AR.y) / s) * s;
      cases.push([gx(p.x), gy(p.y)]);
      for (let i = 0; i < 2 + rg.tour; i++) cases.push([gx(AR.x + R() * AR.w), gy(AR.y + R() * AR.h)]);
      for (const [x, y] of cases) zoneR(x, y, s, s, 1.15, dg);
    } else if (rg.piege === 'vapeur') {
      const xs = [p.x + R.range(-30, 30), AR.x + 80 + R() * (AR.w - 160)];
      xs.forEach((x, i) => { const haut = i === 0 ? p.y < CY : R() < .5, L = AR.h * .58; zoneR(clamp(x, AR.x + 40, AR.x + AR.w - 40) - 38, haut ? AR.y : AR.y + AR.h - L, 76, L, 1.2, dg); });
    } else if (rg.piege === 'vase') {
      zoneC(p.x + R.range(-20, 20), p.y + R.range(-20, 20), 58, 1.1, dg);
      for (let i = 0; i < 1 + rg.tour; i++) zoneC(AR.x + 80 + R() * (AR.w - 160), AR.y + 80 + R() * (AR.h - 160), 58, 1.1, dg);
    } else if (rg.piege === 'eruption') {
      zoneC(p.x, p.y, 62, 1.2, dg);
      for (let i = 0; i < 2 + rg.tour; i++) zoneC(AR.x + 80 + R() * (AR.w - 160), AR.y + 80 + R() * (AR.h - 160), 62, 1.2, dg);
    } else if (rg.piege === 'vitrail') {
      const vertical = R() < .5;
      if (vertical) rayon(clamp(p.x + R.range(-25, 25), AR.x + 30, AR.x + AR.w - 30), AR.y + 2, Math.PI / 2, 1400, 46, 1.3, .45, dg);
      else rayon(AR.x + 2, clamp(p.y + R.range(-25, 25), AR.y + 30, AR.y + AR.h - 30), 0, 1600, 46, 1.3, .45, dg);
    } else if (rg.piege === 'bourrasque') {
      const a = R() * TAU;
      this.rafale = { a, t: 0, warn: 1.2, dur: 2.4, f: 150 + rg.tour * 20 };
      G.annonce('Bourrasque ' + ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][Math.round(((a % TAU) + TAU) % TAU / (TAU / 8)) % 8], '#e8f4ff', 1.1);
    }
    G.atkCourante = src0;
  },
  maj(dt) {
    const rg = this.rg, b = G.boss, p = G.p;
    G.lenteur = 1;
    if (!rg || !p) return;
    if (this.carteT < 99) this.carteT += dt;
    // la vase : on remet les flaques si une phase a vidé les dangers
    if (this.flaques && this.flaques.length && G.etat === 'combat') {
      if (!G.hz.some(h => h.kind === 'vase')) for (const f of this.flaques) G.hz.push({ kind: 'vase', x: f.x, y: f.y, r: f.r, t: 0, dmg: 0 });
      for (const f of this.flaques) { const dx = (p.x - f.x) / f.r, dy = (p.y - f.y) / (f.r * .72); if (dx * dx + dy * dy < 1 && p.saut <= 0) { G.lenteur = .62; break; } }
    }
    if (G.etat !== 'combat' || !b || b.mort || b.intro > 0 || b.trans > 0 || G.def.invincible) return;
    if (G.mode !== 'normal' && G.format && G.format() === 'danse') return;
    this.T += dt;
    if (this.T > this.intervalle()) { this.T = R.range(-1.5, 0); this.lancer(rg); }
    const rf = this.rafale;
    if (rf) {
      rf.t += dt;
      // traînées blanches qui montrent le sens du vent (avant et pendant)
      if (R() < dt * (rf.t < rf.warn ? 20 : 40)) { const bb = Arene.bb(); G.parts.push({ x: bb.x + R() * bb.w, y: bb.y + R() * bb.h, vx: Math.cos(rf.a) * 520, vy: Math.sin(rf.a) * 520, life: .45, max: .45, col: 'rgba(240,250,255,.8)', r: 1.4, trait: true }); }
      if (rf.t > rf.warn && p.saut <= 0) {
        const k = Math.min(1, (rf.t - rf.warn) * 3, (rf.warn + rf.dur - rf.t) * 3);
        p.x += Math.cos(rf.a) * rf.f * k * dt; p.y += Math.sin(rf.a) * rf.f * k * dt;
        Arene.contenir(p, p.r); Arene.sortirPiliers(p, p.r);
      }
      if (rf.t > rf.warn + rf.dur) this.rafale = null;
    }
  },
  dessinerCarte(c) {
    const rg = this.rg; if (!rg || this.carteT > 4.2) return;
    const t = this.carteT, k = Math.min(1, t * 1.6, (4.2 - t) * 1.5);
    if (k <= 0) return;
    c.save(); c.globalAlpha = k; c.textAlign = 'center'; c.textBaseline = 'middle';
    const y = H * .26;
    const g = c.createLinearGradient(W / 2 - 320, 0, W / 2 + 320, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(W / 2 - 320, y - 46, 640, 92);
    texteOmbre(c, 'RÉGION ' + romain(rg.num), W / 2, y - 22, '#c9a865', `600 15px ${POLICE_ER}`, 3);
    texteOmbre(c, rg.nom, W / 2, y + 8, '#fff1cf', `700 34px ${POLICE_ER}`, 5);
    c.strokeStyle = 'rgba(201,168,101,.7)'; c.lineWidth = 1.5; const L = 160 * Math.min(1, t * 1.2);
    c.beginPath(); c.moveTo(W / 2 - L, y + 34); c.lineTo(W / 2 + L, y + 34); c.stroke();
    c.font = `italic 13px ${POLICE}`; c.fillStyle = '#d8ccb0'; c.fillText('Piège : ' + rg.pnom.toLowerCase(), W / 2, y + 50);
    c.restore();
  }
};

// ---------- branchements ----------
const _rgMaj = majCombat;
majCombat = function (dt) {
  const t0 = G.t;
  _rgMaj.apply(this, arguments);
  try { Regions.maj(Math.max(0, G.t - t0)); } catch (e) { console.warn('regions', e); }
};
const _rgHud = dessinerHUD;
dessinerHUD = function (c) {
  _rgHud(c);
  const rg = Regions.rg;
  if (rg && (G.etat === 'combat' || G.etat === 'interlude')) {
    Regions.dessinerCarte(c);
  }
};
