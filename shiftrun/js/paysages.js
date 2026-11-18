/* Shiftrun — paysages peints derrière les niveaux : un vrai panorama par région (canyon au couchant, vallée de
   l'aqueduc sous la lune, forges sous un ciel de braise, plateau d'orage, récif englouti, complexe industriel au
   crépuscule, cimes sous les aurores, cœur cristallin). Chaque panorama est peint une seule fois en plusieurs plans
   (ciel, lointain, milieu, proche), qui défilent à des vitesses différentes ; de petites animations vivent entre
   les plans (nuages, éclairs, aurores, poissons, fumées…). Les plans se raccordent sur les bords : ils se répètent. */
(function (racine) {
'use strict';
const WV = 2400, HV = 900;                 // taille d'un plan (unités du panorama)

/* ---------- Outils : bruit périodique (raccord des bords), couleurs ---------- */
const TAB = new Float32Array(1024 * 256);
{ let s = 1234567; for (let i = 0; i < TAB.length; i++) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; TAB[i] = (s >>> 8) / 16777216; } }
function v2(x, y, P, o) {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const I = ((i % P) + P) % P, I1 = (I + 1) % P, k = o * 37;
  const r0 = ((j + o * 11) & 255) * 1024, r1 = ((j + 1 + o * 11) & 255) * 1024;
  const a = TAB[r0 + ((I + k) & 1023)], b = TAB[r0 + ((I1 + k) & 1023)], c = TAB[r1 + ((I + k) & 1023)], d = TAB[r1 + ((I1 + k) & 1023)];
  return (a + (b - a) * su) * (1 - sv) + (c + (d - c) * su) * sv;
}
function fbm(x, y, P, o, oct, r) { let v = 0, a = 1, t = 0, k = 1; for (let q = 0; q < oct; q++) { v += a * v2(x * k, y * k, P * k, o + q); t += a; a *= r || 0.5; k *= 2; } return v / t; }
function rngDe(seed) { let s = (Math.imul(seed + 1, 2654435761) >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const rgb = (h) => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c, al) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al == null ? 1 : al})`;
const cl = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
function toile(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// ce qui est dessiné près d'un bord est aussi dessiné de l'autre côté : le plan se répète sans couture
function trois(g, x, larg, f) { for (const d of [-WV, 0, WV]) { if (x + d + larg < -10 || x + d - larg > WV + 10) continue; g.save(); g.translate(d, 0); f(); g.restore(); } }

/* ---------- Pinceaux ---------- */
function degrade(g, stops, y0, y1) { const gr = g.createLinearGradient(0, y0 || 0, 0, y1 || HV); stops.forEach(([p, c]) => gr.addColorStop(p, c)); g.fillStyle = gr; g.fillRect(0, 0, WV, HV); }
function halo(g, x, y, r, c, a) {
  trois(g, x, r, () => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, css(c, a)); gr.addColorStop(0.25, css(c, a * 0.45)); gr.addColorStop(1, css(c, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); });
}
function etoiles(g, r, n, yMax, c) {
  for (let i = 0; i < n; i++) {
    const x = r() * WV, y = Math.pow(r(), 1.4) * yMax, t = r(), a = 0.25 + r() * 0.75;
    g.fillStyle = css(c || [255, 255, 255], a);
    const s = t > 0.97 ? 2.4 : t > 0.85 ? 1.6 : 1;
    g.fillRect(x, y, s, s);
    if (t > 0.985) { g.fillStyle = css(c || [255, 255, 255], 0.25); g.fillRect(x - 4, y + 0.7, 9, 1); g.fillRect(x + 0.7, y - 4, 1, 9); }
  }
}
// nuage gonflé : une ombre, puis des boules éclairées par-dessus (la lumière vient de « dir »)
function nuage(g, r, x, y, w, h, lum, ombre, al, dirY) {
  dirY = dirY == null ? -1 : dirY;
  trois(g, x, w, () => {
    const n = Math.round(10 + w / 18);
    const B = [];
    for (let k = 0; k < n; k++) {
      const u = r() - 0.5, bx = x + u * w, prof = 1 - Math.abs(u) * 1.6;
      B.push([bx, y - prof * h * (0.25 + r() * 0.5) * (dirY < 0 ? 1 : -1) * 0.7, h * (0.25 + r() * 0.35) * (0.5 + prof * 0.7)]);
    }
    for (const [bx, by, br] of B) { const gr = g.createRadialGradient(bx, by, 0, bx, by, br); gr.addColorStop(0, css(ombre, al)); gr.addColorStop(0.7, css(ombre, al * 0.8)); gr.addColorStop(1, css(ombre, 0)); g.fillStyle = gr; g.fillRect(bx - br, by - br, br * 2, br * 2); }
    for (const [bx, by, br] of B) { const ly = by + dirY * br * 0.35, gr = g.createRadialGradient(bx, ly, 0, bx, ly, br * 0.75); gr.addColorStop(0, css(lum, al * 0.85)); gr.addColorStop(1, css(lum, 0)); g.fillStyle = gr; g.fillRect(bx - br, ly - br, br * 2, br * 2); }
  });
}
// longue traînée de nuage (stratus) éclairée par en dessous
function traine(g, x, y, w, h, c, a) {
  trois(g, x, w, () => { g.save(); g.translate(x, y); g.scale(w / h, 1); const gr = g.createRadialGradient(0, 0, 0, 0, 0, h); gr.addColorStop(0, css(c, a)); gr.addColorStop(1, css(c, 0)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, h, 0, 7); g.fill(); g.restore(); });
}
/* Relief peint pixel par pixel (à mi-résolution puis agrandi en douceur) : crête fractale, ravines, faces au soleil
   et à l'ombre, strates, neige, liseré lumineux, brume de distance. */
function relief(g, o) {
  const w = WV >> 1, h = HV >> 1, c = toile(w, h), cg = c.getContext('2d'), id = cg.createImageData(w, h), d = id.data;
  const haut = rgb(o.haut), bas = rgb(o.bas), brume = rgb(o.brume || o.bas), bord = o.bord ? rgb(o.bord) : null;
  const nL = rgb(o.neigeL || '#f2f7ff'), nO = rgb(o.neigeO || '#7f9cc4'), stC = o.strateC ? rgb(o.strateC) : null;
  const P = o.per, sd = o.seed || 1, sun = o.soleil || 1, top = new Float32Array(w + 2);
  for (let x = -1; x <= w; x++) {
    const u = x / w * P;
    let v = 0, a = 1, t = 0, k = 1;
    for (let q = 0; q < 6; q++) { let nn = v2(u * k, q * 9 + sd, P * k, sd + q); if (o.crete === 'ride') { nn = 1 - Math.abs(2 * nn - 1); nn *= nn; } v += a * nn; t += a; a *= o.rugo || 0.5; k *= 2; }
    v /= t;
    if (o.crete === 'plateau') { const s0 = cl((v - 0.42) * 6); v = 0.12 * v + 0.88 * s0 * s0 * (3 - 2 * s0); }
    if (o.crete === 'doux') v = v * v * (3 - 2 * v);
    top[x + 1] = (o.base - v * o.amp) / 2;
  }
  // pente de la crête, lissée : chaque versant forme une grande face éclairée ou à l'ombre qui descend
  const sm = o.lisse || 12, face = new Float32Array(w);
  for (let x = 0; x < w; x++) { const xa = (x - sm + w) % w, xb = (x + sm) % w; face[x] = Math.max(-1, Math.min(1, (top[xa + 1] - top[xb + 1]) / (2 * sm) * 2.2)) * sun; }
  const GX = o.gx || 40, PN = Math.max(1, Math.round(GX * 0.12)), gy = o.gy || 0.05, rav = o.ravine == null ? 0.2 : o.ravine, nb = o.brumeBas || 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tp = top[x + 1], dp = y - tp, i = (y * w + x) * 4;
      if (dp < -1) { d[i + 3] = 0; continue; }
      // les faces descendent en biais et se divisent en arêtes secondaires (pas de coupure verticale sous les sommets)
      const wv = (v2(x / w * PN * 4, y * 0.03 + sd, PN * 4, sd + 11) - 0.5) * 1.7, xe = Math.round(x + wv * dp * 0.8), fx = face[((xe % w) + w) % w];
      const prof = cl(dp / Math.max(30, h - tp)), u = (x - dp * 0.7 * fx) / w * GX;
      let e = fbm(u, y * gy + sd * 3.1, GX, sd + 20, 4);
      e = 1 - Math.abs(2 * e - 1);                                   // ravines : fines lignes qui descendent les versants
      const grain = TAB[(y * 613 + x * 7) & 262143] - 0.5;
      let L = 0.5 + fx * 0.42 * (1 - prof * 0.5) + (e - 0.6) * rav * (0.4 + v2(u * 0.15, 7, GX, sd + 9)) + (1 - cl(dp / 14)) * 0.12 - prof * 0.28 + grain * 0.035;
      let col = mix(bas, haut, cl(L));
      if (stC) { const sb = Math.sin((y + (e - 0.5) * 9 + v2(u * 0.2, 2, GX, sd) * 14) * (o.strateF || 0.8)); col = mix(col, stC, 0.12 + 0.14 * sb); }
      if (o.neige) {
        const lim = o.neige * (14 + 34 * v2(x / w * PN, 4, PN, sd + 3)) * (0.8 + 0.4 * Math.max(0, fx)) - (1 - e) * 16 * o.neige;   // la neige descend dans les ravines
        if (dp < lim) { const f = cl((lim - dp) / 5); col = mix(col, mix(nO, nL, cl(0.5 + fx * 0.55 + (e - 0.5) * 0.3)), f); }
      }
      if (bord && dp < 2.2) col = mix(col, bord, 0.75 * cl((2.2 - dp) / 2.2) * cl(0.35 + fx));
      col = mix(col, brume, cl((o.brumeF || 0) + nb * (y / h)));
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = dp < 0 ? 255 * (1 + dp) : 255;
    }
  }
  cg.putImageData(id, 0, 0);
  g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, WV, HV);
  const T = []; for (let x = 0; x < w; x++) T.push(top[x + 1] * 2); return (px) => T[((Math.floor(px / 2) % w) + w) % w];   // hauteur de la crête en un point
}
// brume douce en bas d'un plan
function brumeBas(g, y0, c, a) { const gr = g.createLinearGradient(0, y0, 0, HV); gr.addColorStop(0, css(c, 0)); gr.addColorStop(1, css(c, a)); g.fillStyle = gr; g.fillRect(0, y0, WV, HV - y0); }
// conifère : étages de branches, neige possible, liseré
function sapin(g, x, y, h, c, neige, bord) {
  const w = h * 0.36;
  g.fillStyle = c; g.fillRect(x - h * 0.02, y - h * 0.12, h * 0.04, h * 0.14);
  for (let k = 0; k < 5; k++) {
    const yy = y - h * 0.1 - k * h * 0.18, ww = w * (1 - k * 0.17);
    g.fillStyle = c; g.beginPath(); g.moveTo(x - ww, yy); g.quadraticCurveTo(x - ww * 0.3, yy - h * 0.12, x, yy - h * 0.3); g.quadraticCurveTo(x + ww * 0.3, yy - h * 0.12, x + ww, yy); g.closePath(); g.fill();
    if (neige) { g.fillStyle = neige; g.beginPath(); g.moveTo(x - ww * 0.95, yy - h * 0.005); g.quadraticCurveTo(x - ww * 0.35, yy - h * 0.1, x - ww * 0.05, yy - h * 0.26); g.quadraticCurveTo(x - ww * 0.3, yy - h * 0.12, x - ww * 0.95, yy - h * 0.005); g.fill(); }
  }
  if (bord) { g.strokeStyle = bord; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y - h * 0.82); g.lineTo(x + w * 0.5, y - h * 0.55); g.stroke(); }
}
function cypres(g, x, y, h, c, bord) {
  const w = h * 0.13;
  g.fillStyle = c; g.beginPath(); g.moveTo(x, y - h);
  g.bezierCurveTo(x + w * 1.1, y - h * 0.7, x + w * 1.2, y - h * 0.25, x + w * 0.4, y); g.lineTo(x - w * 0.4, y);
  g.bezierCurveTo(x - w * 1.2, y - h * 0.25, x - w * 1.1, y - h * 0.7, x, y - h); g.fill();
  if (bord) { g.strokeStyle = bord; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y - h); g.bezierCurveTo(x - w * 1.1, y - h * 0.7, x - w * 1.2, y - h * 0.3, x - w * 0.6, y - h * 0.05); g.stroke(); }
}
function cristal(g, x, y, h, w, a, c1, c2, lueur) {
  g.save(); g.translate(x, y); g.rotate(a);
  if (lueur) { const gr = g.createRadialGradient(0, -h * 0.5, 0, 0, -h * 0.5, h * 0.9); gr.addColorStop(0, css(lueur, 0.35)); gr.addColorStop(1, css(lueur, 0)); g.fillStyle = gr; g.fillRect(-h, -h * 1.4, h * 2, h * 1.8); }
  g.fillStyle = css(c2); g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w, -h * 0.75); g.lineTo(0, -h); g.lineTo(0, 0); g.fill();
  g.fillStyle = css(c1); g.beginPath(); g.moveTo(w, 0); g.lineTo(w, -h * 0.75); g.lineTo(0, -h); g.lineTo(0, 0); g.fill();
  g.strokeStyle = css(mix(c1, [255, 255, 255], 0.6), 0.8); g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -h); g.lineTo(w, -h * 0.75); g.stroke();
  g.restore();
}

/* ---------- Les huit panoramas ---------- */
// chaque panorama : liste de plans { cv (toile), f (parallaxe), v (part du défilement vertical), res } et d'animations { anim, f }
const PEINTRES = {
  // Carrière : canyon de grès au soleil couchant
  carriere(r) {
    const ciel = plan(0.015, 0.15, (g) => {
      degrade(g, [[0, '#1f0f2e'], [0.3, '#5a2140'], [0.55, '#b84a3c'], [0.72, '#f08a48'], [0.86, '#ffc070'], [1, '#ffe2b0']]);
      halo(g, WV * 0.63, HV * 0.56, 560, [255, 190, 110], 0.55);
      halo(g, WV * 0.63, HV * 0.56, 120, [255, 230, 180], 0.9);
      trois(g, WV * 0.63, 60, () => { g.fillStyle = '#fff2d0'; g.beginPath(); g.arc(WV * 0.63, HV * 0.56, 34, 0, 7); g.fill(); });
      for (let k = 0; k < 14; k++) traine(g, r() * WV, HV * (0.25 + r() * 0.35), 160 + r() * 260, 8 + r() * 10, [255, 150 + r() * 60, 120], 0.35 + r() * 0.3);
      etoiles(g, r, 60, HV * 0.25, [255, 230, 220]);
    }, 2);
    const loin = plan(0.035, 0.3, (g) => { relief(g, { base: HV * 0.72, amp: HV * 0.2, per: 7, seed: 3, crete: 'plateau', rugo: 0.4, haut: '#f0a07a', bas: '#8a4450', brume: '#f4ac80', brumeF: 0.42, strateC: '#ffd8b0', strateF: 0.5, soleil: 1, bord: '#ffe0b0' }); });
    const milieu = plan(0.09, 0.6, (g) => {
      const hR = relief(g, { base: HV * 0.9, amp: HV * 0.28, per: 5, seed: 8, crete: 'plateau', rugo: 0.38, haut: '#e2884a', bas: '#4a1c16', brume: '#e08a5a', brumeF: 0.12, brumeBas: 0.3, strateC: '#ffb878', strateF: 0.35, bord: '#ffd8a0', soleil: 1 });
      for (let k = 0; k < 9; k++) {                                       // cheminées de fée
        const x = r() * WV, y = hR(x) + 20, hh = 60 + r() * 90, ww = 10 + r() * 10;
        trois(g, x, 60, () => {
          const gr = g.createLinearGradient(x - ww, 0, x + ww, 0); gr.addColorStop(0, '#5a2418'); gr.addColorStop(0.6, '#c0602e'); gr.addColorStop(1, '#f0a060');
          g.fillStyle = gr; g.beginPath(); g.moveTo(x - ww, y); g.quadraticCurveTo(x - ww * 0.6, y - hh * 0.5, x - ww * 0.4, y - hh); g.lineTo(x + ww * 0.4, y - hh); g.quadraticCurveTo(x + ww * 0.7, y - hh * 0.5, x + ww, y); g.fill();
          g.fillStyle = '#4a1c12'; g.beginPath(); g.ellipse(x, y - hh - 4, ww * 1.2, 7, 0, 0, 7); g.fill(); g.fillStyle = '#ffb070'; g.fillRect(x, y - hh - 8, ww * 1.1, 2);
        });
      }
    });
    const proche = plan(0.22, 1, (g) => {
      const hR = relief(g, { base: HV * 1.02, amp: HV * 0.3, per: 3, seed: 13, crete: 'ride', haut: '#5a2a1a', bas: '#1a0905', bord: '#ff9a50', soleil: 1, relief: 18, strateC: '#3a1408', strateF: 0.5 });
      // grue de carrière et échafaudage en bois
      for (const x0 of [WV * 0.18, WV * 0.68]) {
        const y = hR(x0);
        trois(g, x0, 300, () => {
          g.strokeStyle = '#140604'; g.lineWidth = 6; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0, y - 260); g.lineTo(x0 + 220, y - 250); g.moveTo(x0 - 40, y - 250); g.lineTo(x0, y - 260); g.stroke();
          g.lineWidth = 2; for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(x0 + k * 26, y - 252 + k * 1.2); g.lineTo(x0 + (k + 1) * 26, y - 260 + (k + 1) * 1.2); g.stroke(); }
          g.beginPath(); g.moveTo(x0 + 190, y - 251); g.lineTo(x0 + 190, y - 150); g.stroke(); g.fillStyle = '#140604'; g.fillRect(x0 + 178, y - 152, 24, 18);
          g.strokeStyle = 'rgba(255,170,90,.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0 + 3, y - 258); g.lineTo(x0 + 3, y - 20); g.stroke();
          g.strokeStyle = '#1e0a06'; g.lineWidth = 4;
          for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x0 - 120 + k * 30, y + 10); g.lineTo(x0 - 120 + k * 30, y - 90); g.stroke(); }
          g.beginPath(); g.moveTo(x0 - 125, y - 90); g.lineTo(x0 - 25, y - 90); g.moveTo(x0 - 125, y - 45); g.lineTo(x0 - 25, y - 45); g.moveTo(x0 - 120, y - 90); g.lineTo(x0 - 30, y - 45); g.stroke();
        });
      }
    });
    return [ciel, anim(0.015, oiseaux), loin, milieu, anim(0.09, poussiereChaude), proche];
  },
  // Aqueduc : vallée sous la lune, aqueduc de pierre à deux étages, rivière qui reflète
  aqueduc(r) {
    const lune = [WV * 0.27, HV * 0.2];
    const ciel = plan(0.012, 0.15, (g) => {
      degrade(g, [[0, '#020611'], [0.4, '#0a1a3c'], [0.75, '#1b416e'], [1, '#33618e']]);
      etoiles(g, r, 700, HV * 0.75, [220, 235, 255]);
      halo(g, lune[0], lune[1], 380, [170, 210, 255], 0.35);
      trois(g, lune[0], 60, () => {
        const gr = g.createRadialGradient(lune[0] - 12, lune[1] - 12, 4, lune[0], lune[1], 42); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#c8dcf0');
        g.fillStyle = gr; g.beginPath(); g.arc(lune[0], lune[1], 42, 0, 7); g.fill();
        g.fillStyle = 'rgba(120,150,190,.35)'; for (const [a, b, c] of [[-14, -6, 9], [10, 12, 7], [14, -14, 5], [-6, 18, 4]]) { g.beginPath(); g.arc(lune[0] + a, lune[1] + b, c, 0, 7); g.fill(); }
      });
      for (let k = 0; k < 7; k++) nuage(g, r, r() * WV, HV * (0.3 + r() * 0.25), 260 + r() * 300, 50 + r() * 30, [150, 185, 230], [30, 50, 90], 0.55);
    }, 2);
    const loin = plan(0.03, 0.3, (g) => {
      const hR = relief(g, { base: HV * 0.72, amp: HV * 0.16, per: 6, seed: 4, crete: 'doux', haut: '#3a6a9a', bas: '#16304e', brume: '#2c5684', brumeF: 0.35, bord: '#9ac4f0', soleil: -1 });
      for (let k = 0; k < 6; k++) {                                       // villages : lumières chaudes et clochers
        const x = r() * WV, y = hR(x) + 14;
        trois(g, x, 80, () => {
          g.fillStyle = '#10223a'; g.fillRect(x - 3, y - 26, 6, 26); g.beginPath(); g.moveTo(x - 5, y - 26); g.lineTo(x, y - 40); g.lineTo(x + 5, y - 26); g.fill();
          for (let j = 0; j < 14; j++) { g.fillStyle = `rgba(255,${190 + r() * 50},${110 + r() * 40},${0.5 + r() * 0.5})`; g.fillRect(x - 50 + r() * 100, y + r() * 20, 2, 2); }
        });
      }
    });
    const milieu = plan(0.08, 0.6, (g) => {
      // rivière : reflets de la lune, berges
      const ry = HV * 0.86;
      const gr = g.createLinearGradient(0, ry, 0, HV); gr.addColorStop(0, '#1a3a62'); gr.addColorStop(1, '#06121f'); g.fillStyle = gr; g.fillRect(0, ry, WV, HV - ry);
      for (let k = 0; k < 140; k++) { g.fillStyle = `rgba(170,210,255,${0.08 + r() * 0.15})`; g.fillRect(r() * WV, ry + 4 + r() * (HV - ry - 8), 20 + r() * 60, 1.5); }
      // l'aqueduc : 20 piles, deux étages d'arches, pierre éclairée par la lune sur le haut
      const pas = WV / 20, yT = HV * 0.46, yM = HV * 0.66;
      const pierre = g.createLinearGradient(0, yT, 0, HV); pierre.addColorStop(0, '#5a7aa6'); pierre.addColorStop(0.5, '#2e4a72'); pierre.addColorStop(1, '#16283f');
      g.fillStyle = pierre;
      g.fillRect(0, yT, WV, 22); g.fillRect(0, yM - 14, WV, 16);
      for (let k = 0; k < 20; k++) {
        const x = k * pas;
        g.fillStyle = pierre; g.fillRect(x - 13, yT, 26, ry - yT + 6);
        g.fillRect(x + pas / 2 - 6, yT, 12, yM - yT);                       // petites piles de l'étage du haut
        g.fillStyle = 'rgba(10,20,40,.5)'; g.fillRect(x + 8, yT + 22, 5, ry - yT - 16);
      }
      // creux des arches (ciel qui passe) : on les découpe
      g.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 20; k++) {
        const x = k * pas;
        for (const [xa, xb, y0, y1] of [[x + 13, x + pas / 2 - 6, yT + 22, yM - 14], [x + pas / 2 + 6, x + pas - 13, yT + 22, yM - 14], [x + 13, x + pas - 13, yM + 2, ry - 4]]) {
          const rr = (xb - xa) / 2; g.beginPath(); g.moveTo(xa, y1); g.lineTo(xa, y0 + rr); g.arc(xa + rr, y0 + rr, rr, Math.PI, 0); g.lineTo(xb, y1); g.closePath(); g.fill();
        }
      }
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(200,225,255,.55)'; g.fillRect(0, yT, WV, 2.5); g.fillRect(0, yM - 14, WV, 1.5);
      g.strokeStyle = 'rgba(10,20,40,.35)'; g.lineWidth = 1;                  // joints des pierres
      for (let y = yT + 6; y < yT + 22; y += 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(WV, y); g.stroke(); }
      for (let x = 0; x < WV; x += 14) { g.beginPath(); g.moveTo(x, yT + 2); g.lineTo(x, yT + 20); g.stroke(); }
      // reflet de l'aqueduc dans l'eau
      g.save(); g.globalAlpha = 0.18; g.translate(0, ry * 2); g.scale(1, -1); g.fillStyle = '#5a7aa6';
      for (let k = 0; k < 20; k++) g.fillRect(k * pas - 13, ry - 60, 26, 60);
      g.restore();
    });
    const proche = plan(0.2, 1, (g) => {
      const hR = relief(g, { base: HV * 1.0, amp: HV * 0.14, per: 4, seed: 9, crete: 'doux', haut: '#0e1e34', bas: '#040a14', bord: '#7aa6d8', soleil: -1, relief: 10 });
      for (let k = 0; k < 16; k++) { const x = r() * WV; trois(g, x, 60, () => cypres(g, x, hR(x) + 18, 150 + r() * 160, '#050c18', 'rgba(140,180,230,.55)')); }
      for (let k = 0; k < 3; k++) {                                       // colonnes brisées
        const x = r() * WV, y = hR(x) + 10, hh = 70 + r() * 80;
        trois(g, x, 40, () => { g.fillStyle = '#081426'; g.fillRect(x - 12, y - hh, 24, hh); g.fillRect(x - 17, y - 8, 34, 8); g.beginPath(); g.moveTo(x - 12, y - hh); g.lineTo(x - 2, y - hh - 12); g.lineTo(x + 6, y - hh - 4); g.lineTo(x + 12, y - hh); g.fill(); g.fillStyle = 'rgba(140,180,230,.4)'; g.fillRect(x - 12, y - hh, 2, hh); });
      }
    });
    return [ciel, loin, milieu, anim(0.08, refletLune(lune)), proche, anim(0.2, lucioles)];
  },
  // Chaufferie : forges sous un ciel de braise, volcan au loin
  chaufferie(r) {
    const ciel = plan(0.015, 0.15, (g) => {
      degrade(g, [[0, '#070102'], [0.45, '#2e0605'], [0.75, '#7a1a08'], [1, '#c8460e']]);
      for (let k = 0; k < 10; k++) nuage(g, r, r() * WV, HV * (0.2 + r() * 0.4), 300 + r() * 300, 60 + r() * 40, [255, 110, 40], [30, 6, 4], 0.7, 1);
      etoiles(g, r, 40, HV * 0.2, [255, 180, 140]);
    }, 2);
    const volcans = [];
    const loin = plan(0.03, 0.3, (g) => {
      const hR = relief(g, { base: HV * 0.78, amp: HV * 0.42, per: 3, seed: 21, crete: 'ride', haut: '#4a1a12', bas: '#1a0605', brume: '#6a1a0a', brumeF: 0.35, bord: '#ff6a20', soleil: 1, relief: 16 });
      for (let k = 0; k < 3; k++) {                                       // coulées de lave
        let x = WV * (0.15 + k * 0.33), best = x; for (let s = -80; s <= 80; s += 4) if (hR(x + s) < hR(best)) best = x + s;
        x = best; let y = hR(x); volcans.push([x, y]);
        trois(g, x, 300, () => {
          halo(g, x, y, 160, [255, 120, 30], 0.45);
          g.strokeStyle = 'rgba(255,150,50,.9)'; g.lineWidth = 3; g.shadowColor = '#ff6a10'; g.shadowBlur = 12;
          for (let c = 0; c < 3; c++) { g.beginPath(); let lx = x, ly = y; g.moveTo(lx, ly); for (let s = 0; s < 14; s++) { lx += (c - 1) * 9 + (r() - 0.5) * 12; ly += 14; g.lineTo(lx, ly); } g.stroke(); }
          g.shadowBlur = 0;
        });
      }
    });
    const cheminees = [];
    const milieu = plan(0.09, 0.6, (g) => {
      const sol = HV * 0.8;
      g.fillStyle = '#1c0705'; g.fillRect(0, sol, WV, HV - sol);
      let x = 0;
      while (x < WV - 60) {
        const t = r(), w = 60 + r() * 120, hh = 80 + r() * 160;
        g.fillStyle = '#230907';
        if (t < 0.35) {                                                   // halle à toit en dents de scie
          g.beginPath(); g.moveTo(x, sol); g.lineTo(x, sol - hh * 0.6); for (let k = 0; k < w; k += 24) { g.lineTo(x + k, sol - hh * 0.6 - 18); g.lineTo(x + k + 24, sol - hh * 0.6); } g.lineTo(x + w, sol); g.fill();
          for (let k = 0; k < w - 10; k += 14) for (let j = 0; j < 3; j++) if (r() < 0.6) { g.fillStyle = `rgba(255,${120 + r() * 80},40,${0.5 + r() * 0.5})`; g.fillRect(x + 6 + k, sol - hh * 0.5 + j * 18, 6, 9); }
        } else if (t < 0.6) {                                              // tour de refroidissement
          g.beginPath(); g.moveTo(x, sol); g.quadraticCurveTo(x + w * 0.3, sol - hh * 0.6, x + w * 0.15, sol - hh * 1.1); g.lineTo(x + w * 0.85, sol - hh * 1.1); g.quadraticCurveTo(x + w * 0.7, sol - hh * 0.6, x + w, sol); g.fill();
          g.fillStyle = 'rgba(255,110,40,.45)'; g.fillRect(x + w * 0.15, sol - hh * 1.1, w * 0.7, 3);
          cheminees.push([x + w / 2, sol - hh * 1.1, w * 0.3]);
        } else {                                                          // hautes cheminées
          for (let k = 0; k < 2; k++) { const cx = x + 20 + k * 40, ch = hh * 1.4 + r() * 80; g.fillStyle = '#1e0806'; g.fillRect(cx, sol - ch, 16, ch); g.fillStyle = '#ff7a2a'; g.fillRect(cx, sol - ch + 12, 16, 3); cheminees.push([cx + 8, sol - ch, 10]); }
          g.fillStyle = '#230907'; g.fillRect(x, sol - hh * 0.4, w, hh * 0.4);
        }
        g.fillStyle = 'rgba(255,120,40,.55)'; g.fillRect(x, sol - 2, w, 2);
        x += w + 10 + r() * 30;
      }
      brumeBas(g, HV * 0.6, [255, 90, 20], 0.25);
    });
    const proche = plan(0.22, 1, (g) => {
      const y = HV * 0.9;
      g.fillStyle = '#0c0302'; g.fillRect(0, y, WV, HV - y);
      g.strokeStyle = '#0c0302'; g.lineWidth = 26;                         // gros tuyaux
      for (let k = 0; k < 5; k++) { const x0 = r() * WV, x1 = x0 + 200 + r() * 300, yy = y - 30 - r() * 120; trois(g, x0, 600, () => { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0, yy); g.quadraticCurveTo(x0, yy - 30, x0 + 30, yy - 30); g.lineTo(x1, yy - 30); g.lineTo(x1, y); g.stroke(); g.strokeStyle = 'rgba(255,120,40,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + 30, yy - 43); g.lineTo(x1, yy - 43); g.stroke(); g.strokeStyle = '#0c0302'; g.lineWidth = 26; }); }
      g.strokeStyle = '#0c0302'; g.lineWidth = 4;                          // passerelle en treillis
      const py = y - 200; g.beginPath(); g.moveTo(0, py); g.lineTo(WV, py); g.moveTo(0, py + 24); g.lineTo(WV, py + 24); g.stroke();
      g.lineWidth = 2; g.beginPath(); for (let x = 0; x < WV; x += 24) { g.moveTo(x, py); g.lineTo(x + 24, py + 24); g.moveTo(x + 24, py); g.lineTo(x, py + 24); } g.stroke();
      g.strokeStyle = 'rgba(255,130,50,.45)'; g.beginPath(); g.moveTo(0, py - 1); g.lineTo(WV, py - 1); g.stroke();
    });
    return [ciel, loin, anim(0.03, (g, A) => lueurs(g, A, volcans, [255, 110, 30])), milieu, anim(0.09, (g, A) => fumees(g, A, cheminees)), proche, anim(0.22, braises)];
  },
  // Orage : plateau battu par un orage violet, aiguilles d'améthyste
  orage(r) {
    const ciel = plan(0.015, 0.15, (g) => {
      degrade(g, [[0, '#04020c'], [0.4, '#1a1038'], [0.75, '#34205f'], [1, '#56388a']]);
      for (let k = 0; k < 6; k++) nuage(g, r, r() * WV, HV * (0.18 + r() * 0.2), 500 + r() * 400, 120 + r() * 60, [150, 120, 220], [14, 8, 34], 0.85);
      for (let k = 0; k < 14; k++) traine(g, r() * WV, HV * (0.42 + r() * 0.2), 260 + r() * 300, 16 + r() * 14, [70, 50, 130], 0.5);
    }, 2);
    const loin = plan(0.035, 0.3, (g) => { relief(g, { base: HV * 0.76, amp: HV * 0.18, per: 6, seed: 31, crete: 'plateau', haut: '#4a3a8a', bas: '#1e1640', brume: '#46347c', brumeF: 0.45, soleil: -1 }); });
    const milieu = plan(0.09, 0.6, (g) => {
      const hR = relief(g, { base: HV * 0.88, amp: HV * 0.38, per: 4, seed: 35, crete: 'ride', haut: '#4a3c80', bas: '#120c28', brume: '#2a1e52', brumeF: 0.15, bord: '#cdb0ff', soleil: -1, relief: 26 });
      for (let k = 0; k < 14; k++) {                                      // grappes d'améthyste
        const x = r() * WV, y = hR(x) + 6, n = 3 + Math.floor(r() * 4);
        trois(g, x, 80, () => { for (let j = 0; j < n; j++) cristal(g, x + (j - n / 2) * 9, y + 4, 30 + r() * 60, 6 + r() * 6, (r() - 0.5) * 0.9, [210, 150, 255], [110, 60, 190], j === 0 ? [190, 120, 255] : null); });
      }
    });
    const proche = plan(0.22, 1, (g) => {
      const hR = relief(g, { base: HV * 1.02, amp: HV * 0.26, per: 3, seed: 39, crete: 'ride', haut: '#1e1640', bas: '#06040e', bord: '#a890ff', soleil: -1, relief: 14 });
      for (let k = 0; k < 5; k++) {                                       // arbres morts tordus
        const x = r() * WV, y = hR(x) + 10;
        trois(g, x, 120, () => {
          g.strokeStyle = '#05030c'; g.lineCap = 'round';
          const branche = (bx, by, a, l, w) => { if (l < 8) return; const ex = bx + Math.cos(a) * l, ey = by + Math.sin(a) * l; g.lineWidth = w; g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke(); branche(ex, ey, a - 0.4 - r() * 0.3, l * 0.7, w * 0.65); branche(ex, ey, a + 0.3 + r() * 0.3, l * 0.68, w * 0.65); };
          branche(x, y, -Math.PI / 2 + (r() - 0.5) * 0.3, 60 + r() * 30, 9);
        });
      }
    });
    return [ciel, anim(0.015, eclairs), loin, milieu, proche, anim(0.22, pluie)];
  },
  // Abysses : récif englouti, rayons de surface, temple en ruine
  abysses(r) {
    const ciel = plan(0.012, 0.15, (g) => {
      degrade(g, [[0, '#6fd8dc'], [0.12, '#1f9aa8'], [0.45, '#0b5466'], [0.8, '#042430'], [1, '#020d14']]);
      for (let k = 0; k < 60; k++) traine(g, r() * WV, HV * (0.02 + r() * 0.06), 60 + r() * 120, 3 + r() * 3, [220, 255, 255], 0.25);   // vaguelettes de la surface
    }, 2);
    const loin = plan(0.035, 0.3, (g) => {
      const hR = relief(g, { base: HV * 0.8, amp: HV * 0.12, per: 5, seed: 41, crete: 'doux', haut: '#16707a', bas: '#0a3a46', brume: '#0f5866', brumeF: 0.55 });
      for (let k = 0; k < 3; k++) {                                       // temple englouti
        const x = WV * (0.12 + k * 0.33) + r() * 120, y = hR(x) + 20, w = 200 + r() * 140;
        trois(g, x, w + 40, () => {
          g.fillStyle = 'rgba(16,80,92,.85)';
          g.beginPath(); g.moveTo(x - 20, y - 150); g.lineTo(x + w / 2, y - 200); g.lineTo(x + w + 20, y - 150); g.fill();
          g.fillRect(x - 20, y - 152, w + 40, 12);
          for (let c = 0; c <= 5; c++) if (r() < 0.8) { const cx = x + c * w / 5, ch = 140 * (r() < 0.25 ? 0.5 : 1); g.fillRect(cx - 8, y - ch, 16, ch); }
          g.fillStyle = 'rgba(120,230,230,.18)'; g.fillRect(x - 20, y - 152, w + 40, 2);
        });
      }
    });
    const milieu = plan(0.09, 0.6, (g) => {
      const hR = relief(g, { base: HV * 0.9, amp: HV * 0.22, per: 4, seed: 45, crete: 'doux', haut: '#1f7c78', bas: '#06262c', brume: '#0c4652', brumeF: 0.2, bord: '#7af0e0', relief: 22 });
      for (let k = 0; k < 40; k++) {                                      // coraux, gorgones, anémones
        const x = r() * WV, y = hR(x) + 8, t = r(), c = [[255, 120, 150], [255, 170, 80], [190, 120, 255], [120, 230, 200]][Math.floor(r() * 4)], cc = mix(c, [10, 60, 70], 0.45);
        trois(g, x, 60, () => {
          if (t < 0.4) { g.strokeStyle = css(cc, 0.9); g.lineCap = 'round'; const br = (bx, by, a, l, w) => { if (l < 5) return; const ex = bx + Math.cos(a) * l, ey = by + Math.sin(a) * l; g.lineWidth = w; g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke(); br(ex, ey, a - 0.45, l * 0.72, w * 0.7); br(ex, ey, a + 0.45, l * 0.72, w * 0.7); }; br(x, y, -Math.PI / 2, 22 + r() * 16, 4); }
          else if (t < 0.7) { const gr = g.createRadialGradient(x, y - 10, 2, x, y - 6, 22); gr.addColorStop(0, css(mix(cc, [255, 255, 255], 0.25))); gr.addColorStop(1, css(cc)); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y - 6, 22, 15, 0, Math.PI, 0); g.fill(); g.strokeStyle = 'rgba(0,30,40,.35)'; g.lineWidth = 1; for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(x, y - 6, 18 - j * 4, 12 - j * 3, 0, Math.PI, 0); g.stroke(); } }
          else { g.strokeStyle = css(cc, 0.85); g.lineWidth = 2; for (let j = -4; j <= 4; j++) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + j * 3, y - 14, x + j * 4.5, y - 22 - r() * 6); g.stroke(); } }
        });
      }
    });
    const proche = plan(0.22, 1, (g) => {
      const hR = relief(g, { base: HV * 1.02, amp: HV * 0.2, per: 3, seed: 49, crete: 'ride', haut: '#0c3a40', bas: '#020d10', bord: '#5ae0d0', relief: 14 });
      for (let k = 0; k < 2; k++) {                                       // arche rocheuse
        const x = r() * WV, y = hR(x) + 30;
        trois(g, x, 300, () => { g.fillStyle = '#031418'; g.beginPath(); g.moveTo(x - 140, y); g.quadraticCurveTo(x - 150, y - 300, x, y - 320); g.quadraticCurveTo(x + 160, y - 300, x + 150, y); g.lineTo(x + 100, y); g.quadraticCurveTo(x + 90, y - 230, x, y - 240); g.quadraticCurveTo(x - 90, y - 230, x - 95, y); g.fill(); g.strokeStyle = 'rgba(90,224,208,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 150, y - 200); g.quadraticCurveTo(x - 140, y - 300, x, y - 320); g.stroke(); });
      }
    });
    return [ciel, anim(0.012, rayonsSurface), loin, anim(0.035, (g, A) => poissons(g, A, 0.45)), milieu, anim(0.09, algues), proche, anim(0.22, (g, A) => { bulles(g, A); meduses(g, A); })];
  },
  // Usine : complexe industriel au crépuscule, ville au loin
  usine(r) {
    const ciel = plan(0.015, 0.15, (g) => {
      degrade(g, [[0, '#0f141e'], [0.45, '#2c3242'], [0.7, '#5a4a4c'], [0.86, '#a8683e'], [1, '#e09a50']]);
      halo(g, WV * 0.4, HV * 0.78, 400, [255, 160, 80], 0.4); halo(g, WV * 0.4, HV * 0.78, 50, [255, 210, 150], 0.9);
      for (let k = 0; k < 16; k++) traine(g, r() * WV, HV * (0.5 + r() * 0.3), 300 + r() * 400, 10 + r() * 14, [120, 100, 100], 0.35);   // smog
    }, 2);
    const feux = [];
    const loin = plan(0.035, 0.3, (g) => {
      let x = 0; const sol = HV * 0.8;
      while (x < WV) {                                                    // gratte-ciel et tours, fenêtres allumées
        const w = 30 + r() * 60, hh = 60 + r() * 220;
        g.fillStyle = css(mix([40, 46, 60], [90, 80, 80], r() * 0.3)); g.fillRect(x, sol - hh, w, hh + 200);
        if (r() < 0.3) { g.fillRect(x + w / 2 - 1, sol - hh - 40, 2, 40); feux.push([x + w / 2, sol - hh - 40]); }
        for (let a = 4; a < w - 4; a += 7) for (let b = 8; b < hh; b += 9) if (r() < 0.22) { g.fillStyle = r() < 0.7 ? `rgba(255,${190 + r() * 50},120,.8)` : 'rgba(170,210,255,.7)'; g.fillRect(x + a, sol - hh + b, 3, 4); }
        x += w + r() * 10;
      }
      brumeBas(g, HV * 0.5, [190, 130, 90], 0.45);
    });
    const vapeurs = [];
    const milieu = plan(0.09, 0.6, (g) => {
      const sol = HV * 0.86; g.fillStyle = '#16191f'; g.fillRect(0, sol, WV, HV - sol);
      let x = 20;
      while (x < WV - 200) {
        const t = r();
        const acier = g.createLinearGradient(x, 0, x + 80, 0); acier.addColorStop(0, '#1a1d24'); acier.addColorStop(0.7, '#2c313b'); acier.addColorStop(1, '#5a4a3e');
        g.fillStyle = acier;
        if (t < 0.35) {                                                    // colonne de distillation
          const hh = 220 + r() * 150, w = 34; g.fillRect(x, sol - hh, w, hh);
          for (let k = 40; k < hh; k += 50) { g.fillRect(x - 8, sol - hh + k, w + 16, 3); g.strokeStyle = '#1a1d24'; g.lineWidth = 1; g.strokeRect(x - 8, sol - hh + k - 12, w + 16, 12); }
          g.fillStyle = 'rgba(255,170,90,.6)'; g.fillRect(x + w - 2, sol - hh, 2, hh);
          feux.push([x + w / 2, sol - hh - 4]); vapeurs.push([x + w / 2, sol - hh, 12]); x += w + 40;
        } else if (t < 0.6) {                                              // réservoirs sphériques
          const R = 40 + r() * 20, cy = sol - R - 30;
          g.fillRect(x + 10, cy, 4, sol - cy); g.fillRect(x + 2 * R - 14, cy, 4, sol - cy);
          const sp = g.createRadialGradient(x + R * 1.4, cy - R * 0.4, 4, x + R, cy, R); sp.addColorStop(0, '#6a5a50'); sp.addColorStop(1, '#1e2128'); g.fillStyle = sp; g.beginPath(); g.arc(x + R, cy, R, 0, 7); g.fill();
          x += 2 * R + 30;
        } else {                                                          // portique roulant et racks de tuyaux
          const hh = 160 + r() * 60, w = 160;
          g.fillRect(x, sol - hh, 10, hh); g.fillRect(x + w, sol - hh, 10, hh); g.fillRect(x - 20, sol - hh, w + 60, 14);
          g.strokeStyle = '#2c313b'; g.lineWidth = 2; g.beginPath(); for (let k = 0; k < w + 40; k += 14) { g.moveTo(x - 20 + k, sol - hh); g.lineTo(x - 6 + k, sol - hh + 14); } g.stroke();
          g.fillStyle = '#ffb040'; g.fillRect(x + 60, sol - hh + 14, 30, 16);
          for (let k = 0; k < 4; k++) { g.fillStyle = '#20242c'; g.fillRect(x - 30, sol - 30 - k * 12, w + 70, 6); }
          x += w + 60;
        }
      }
      brumeBas(g, HV * 0.7, [120, 90, 70], 0.35);
    });
    const proche = plan(0.22, 1, (g) => {
      g.fillStyle = '#07080b'; g.fillRect(0, HV * 0.94, WV, HV * 0.06);
      g.strokeStyle = '#07080b';                                          // poutres en treillis qui encadrent
      for (const y0 of [HV * 0.03, HV * 0.9]) { g.lineWidth = 8; g.beginPath(); g.moveTo(0, y0); g.lineTo(WV, y0); g.moveTo(0, y0 + 40); g.lineTo(WV, y0 + 40); g.stroke(); g.lineWidth = 4; g.beginPath(); for (let x = 0; x < WV; x += 40) { g.moveTo(x, y0); g.lineTo(x + 40, y0 + 40); g.moveTo(x + 40, y0); g.lineTo(x, y0 + 40); } g.stroke(); }
      for (let k = 0; k < 4; k++) { const x = r() * WV; trois(g, x, 30, () => { g.lineWidth = 14; g.beginPath(); g.moveTo(x, HV * 0.03); g.lineTo(x, HV); g.stroke(); g.strokeStyle = 'rgba(255,170,90,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 7, HV * 0.07); g.lineTo(x + 7, HV * 0.9); g.stroke(); g.strokeStyle = '#07080b'; }); }
      g.strokeStyle = '#07080b'; g.lineWidth = 2; for (let k = 0; k < 6; k++) { const x0 = r() * WV; g.beginPath(); g.moveTo(x0, HV * 0.07); g.quadraticCurveTo(x0 + 100, HV * 0.25, x0 + 200, HV * 0.07); g.stroke(); }   // câbles
    });
    return [ciel, anim(0.015, projecteurs), loin, anim(0.035, (g, A) => balises(g, A, feux.slice(0, 40))), milieu, anim(0.09, (g, A) => { fumees(g, A, vapeurs, true); balises(g, A, feux.slice(40)); }), proche];
  },
  // Glacier : cimes enneigées sous les aurores, forêt de sapins, lac gelé
  glacier(r) {
    const ciel = plan(0.01, 0.15, (g) => {
      degrade(g, [[0, '#01030b'], [0.45, '#08183a'], [0.85, '#1c4676'], [1, '#356696']]);
      etoiles(g, r, 1100, HV * 0.8, [225, 240, 255]);
      g.save(); g.globalCompositeOperation = 'lighter';                   // voie lactée
      for (let k = 0; k < 40; k++) { const u = k / 40, x = u * WV, y = HV * (0.05 + u * 0.35); halo(g, x, y, 90 + r() * 60, [120, 140, 200], 0.05); }
      for (let k = 0; k < 600; k++) { const u = r(), x = u * WV + (r() - 0.5) * 120, y = HV * (0.05 + u * 0.35) + (r() - 0.5) * 100; g.fillStyle = `rgba(220,230,255,${r() * 0.6})`; g.fillRect(x, y, 1, 1); }
      g.restore();
    }, 2);
    const loin = plan(0.03, 0.3, (g) => { relief(g, { base: HV * 0.66, amp: HV * 0.42, per: 5, seed: 51, crete: 'ride', haut: '#9fbbdd', bas: '#253f62', brume: '#3a6494', brumeF: 0.3, neige: 1.6, neigeL: '#eef6ff', neigeO: '#7b98c4', soleil: -1, relief: 34, bord: '#ffffff' }); });
    const milieu = plan(0.085, 0.6, (g) => {
      const hR = relief(g, { base: HV * 0.82, amp: HV * 0.3, per: 4, seed: 57, crete: 'ride', haut: '#6a8cb4', bas: '#152a46', brume: '#2a4a74', brumeF: 0.12, neige: 1.2, soleil: -1, relief: 30, bord: '#e8f4ff' });
      const ly = HV * 0.9;                                                // lac gelé
      const gr = g.createLinearGradient(0, ly, 0, HV); gr.addColorStop(0, '#5a86b8'); gr.addColorStop(1, '#1a3456'); g.fillStyle = gr; g.fillRect(0, ly, WV, HV - ly);
      for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(230,245,255,${0.1 + r() * 0.2})`; g.fillRect(r() * WV, ly + 3 + r() * (HV - ly), 30 + r() * 80, 1); }
      for (let k = 0; k < 320; k++) { const x = r() * WV, y = Math.min(ly, hR(x) + 60 + r() * 120); if (y > ly - 4 || y < hR(x) + 20) continue; trois(g, x, 20, () => sapin(g, x, y, 22 + r() * 22, '#0c1c30', 'rgba(220,235,255,.8)')); }
    });
    const proche = plan(0.2, 1, (g) => {
      const hR = relief(g, { base: HV * 1.02, amp: HV * 0.14, per: 3, seed: 59, crete: 'doux', haut: '#dbe8f8', bas: '#6f8db4', bord: '#ffffff', soleil: -1, relief: 8 });
      for (let k = 0; k < 18; k++) { const x = r() * WV; trois(g, x, 80, () => sapin(g, x, hR(x) + 14, 120 + r() * 170, '#06101e', '#e6f1ff', 'rgba(170,200,240,.6)')); }
    });
    return [ciel, anim(0.01, aurore), loin, milieu, proche, anim(0.2, neigeTombe)];
  },
  // Cœur : nébuleuse, îles flottantes, cristaux géants qui battent comme un cœur
  coeur(r) {
    const ciel = plan(0.01, 0.15, (g) => {
      degrade(g, [[0, '#05010a'], [0.6, '#1a0420'], [1, '#3a0838']]);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 70; k++) { const c = [[255, 80, 200], [140, 60, 255], [60, 180, 255], [255, 120, 160]][Math.floor(r() * 4)]; halo(g, r() * WV, HV * (0.1 + r() * 0.6), 80 + r() * 220, c, 0.07 + r() * 0.07); }
      g.restore();
      etoiles(g, r, 800, HV * 0.9, [255, 230, 255]);
      const px = WV * 0.7, py = HV * 0.26, R = 110;                       // planète à anneaux
      trois(g, px, 260, () => {
        g.save(); g.translate(px, py); g.rotate(-0.35);
        g.strokeStyle = 'rgba(255,190,240,.5)'; g.lineWidth = 6; g.beginPath(); g.ellipse(0, 0, R * 2, R * 0.45, 0, Math.PI, 0); g.stroke();
        const sp = g.createRadialGradient(-R * 0.4, -R * 0.4, 10, 0, 0, R); sp.addColorStop(0, '#ff9ad8'); sp.addColorStop(0.6, '#7a2a8a'); sp.addColorStop(1, '#1a0420'); g.fillStyle = sp; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,190,240,.6)'; g.lineWidth = 6; g.beginPath(); g.ellipse(0, 0, R * 2, R * 0.45, 0, 0, Math.PI); g.stroke();
        g.restore();
      });
    }, 2);
    const loin = plan(0.03, 0.3, (g) => {
      for (let k = 0; k < 7; k++) {                                       // îles flottantes
        const x = r() * WV, y = HV * (0.35 + r() * 0.3), w = 60 + r() * 120;
        trois(g, x, w + 40, () => {
          const gr = g.createLinearGradient(0, y, 0, y + w); gr.addColorStop(0, '#5a1a5a'); gr.addColorStop(1, '#14041a'); g.fillStyle = gr;
          g.beginPath(); g.moveTo(x - w, y); for (let j = 0; j <= 10; j++) g.lineTo(x - w + j * w / 5, y + (j % 2 ? 0.25 : 0.5) * w * Math.sin(j / 10 * Math.PI) + w * 0.4 * Math.sin(j / 10 * Math.PI)); g.lineTo(x + w, y); g.closePath(); g.fill();
          g.fillStyle = '#ff7ae0'; g.fillRect(x - w, y - 2, w * 2, 3);
          halo(g, x, y + w * 0.5, w, [255, 90, 220], 0.15);
          for (let j = 0; j < 3; j++) cristal(g, x + (j - 1) * w * 0.4, y, 20 + r() * 30, 5, (r() - 0.5) * 0.6, [255, 170, 240], [170, 60, 190], [255, 120, 230]);
        });
      }
    });
    const milieu = plan(0.09, 0.6, (g) => {
      const hR = relief(g, { base: HV * 0.92, amp: HV * 0.2, per: 4, seed: 61, crete: 'doux', haut: '#5a1a50', bas: '#12030f', brume: '#3a0a34', brumeF: 0.15, bord: '#ff7ae0', relief: 22 });
      for (let k = 0; k < 10; k++) {                                      // cristaux géants
        const x = r() * WV, y = hR(x) + 10, n = 2 + Math.floor(r() * 4);
        trois(g, x, 200, () => { for (let j = 0; j < n; j++) cristal(g, x + (j - n / 2) * 30, y + 6, 80 + r() * 170, 14 + r() * 14, (r() - 0.5) * 0.8, [255, 150, 230], [130, 40, 150], [255, 100, 220]); });
      }
    });
    const proche = plan(0.22, 1, (g) => {
      g.strokeStyle = '#12020f'; g.lineCap = 'round';                     // racines organiques et veines lumineuses
      for (let k = 0; k < 12; k++) {
        const x = r() * WV, w0 = 18 + r() * 20, up = r() < 0.5;
        trois(g, x, 300, () => {
          const y0 = up ? HV : 0, y1 = up ? HV * (0.55 + r() * 0.25) : HV * (0.12 + r() * 0.2), x1 = x + (r() - 0.5) * 300;
          g.lineWidth = w0; g.beginPath(); g.moveTo(x, y0); g.bezierCurveTo(x, (y0 + y1) / 2, x1, (y0 + y1) / 2, x1, y1); g.stroke();
          g.strokeStyle = 'rgba(255,90,210,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 3, y0); g.bezierCurveTo(x + 3, (y0 + y1) / 2, x1 + 3, (y0 + y1) / 2, x1 + 1, y1); g.stroke(); g.strokeStyle = '#12020f';
        });
      }
      g.fillStyle = '#12020f'; g.fillRect(0, HV * 0.96, WV, HV * 0.04);
    });
    return [ciel, loin, anim(0.03, battement), milieu, proche, anim(0.22, etincelles)];
  }
};
let PLANS = null;
function plan(f, v, peindre, res) { return { f, v, peindre, res: res || 1 }; }
function anim(f, fn) { return { f, anim: fn }; }

/* ---------- Animations (dessinées à chaque image, légères) ---------- */
// A : { x(u) : position à l'écran d'un point du plan (u en unités du panorama), y(v), s : échelle, t : temps, L, H }
function oiseaux(g, A) {
  g.strokeStyle = 'rgba(40,14,20,.7)'; g.lineWidth = 1.5;
  for (let k = 0; k < 2; k++) {
    const per = 70, u = ((A.t * 22 + k * 900) % (WV + 400)) - 200, y0 = HV * (0.32 + k * 0.1);
    for (let j = 0; j < 7; j++) {
      const ox = u - (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 14 - Math.ceil(j / 2) * 16 * 0, oy = y0 + Math.ceil(j / 2) * 9;
      const x = A.x(ox + Math.ceil(j / 2) * -18), y = A.y(oy), b = Math.sin(A.t * 7 + j) * 3 * A.s;
      g.beginPath(); g.moveTo(x - 6 * A.s, y - b); g.quadraticCurveTo(x - 2 * A.s, y - 3 * A.s, x, y); g.quadraticCurveTo(x + 2 * A.s, y - 3 * A.s, x + 6 * A.s, y - b); g.stroke();
    }
    if (per < 0) break;
  }
}
function poussiereChaude(g, A) {
  g.fillStyle = 'rgba(255,210,150,.35)';
  for (let k = 0; k < 40; k++) { const u = (k * 211 + A.t * (10 + k % 7)) % WV, v = HV * (0.5 + (k * 37 % 40) / 100) + Math.sin(A.t * 0.7 + k) * 10; g.fillRect(A.x(u), A.y(v), 2 * A.s, 2 * A.s); }
}
function refletLune(lune) {
  return (g, A) => {
    const x = A.x0(0.012, lune[0]), y0 = A.y(HV * 0.87), y1 = A.y(HV * 0.99);
    for (let k = 0; k < 18; k++) {
      const yy = y0 + (y1 - y0) * (k / 18), w = (14 + 30 * Math.abs(Math.sin(A.t * 1.3 + k * 1.7))) * A.s;
      g.fillStyle = `rgba(230,240,255,${0.25 + 0.2 * Math.sin(A.t * 2 + k)})`; g.fillRect(x - w / 2 + Math.sin(A.t + k) * 6 * A.s, yy, w, 1.5 * A.s);
    }
  };
}
function lucioles(g, A) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 24; k++) {
    const u = (k * 97.3) % WV + Math.sin(A.t * 0.4 + k) * 40, v = HV * (0.7 + (k * 13 % 25) / 100) + Math.sin(A.t * 0.9 + k * 2) * 20, a = 0.5 + 0.5 * Math.sin(A.t * 3 + k * 1.3);
    const x = A.x(u), y = A.y(v), R = 7 * A.s, gr = g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, `rgba(220,255,160,${0.6 * a})`); gr.addColorStop(1, 'rgba(220,255,160,0)'); g.fillStyle = gr; g.fillRect(x - R, y - R, R * 2, R * 2);
  }
  g.restore();
}
function lueurs(g, A, pts, c) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [u, v] of pts) { const a = 0.18 + 0.1 * Math.sin(A.t * 1.7 + u), x = A.x(u), y = A.y(v), R = 120 * A.s; const gr = g.createRadialGradient(x, y, 0, x, y, R); gr.addColorStop(0, css(c, a)); gr.addColorStop(1, css(c, 0)); g.fillStyle = gr; g.fillRect(x - R, y - R, R * 2, R * 2); }
  g.restore();
}
function fumees(g, A, pts, blanc) {
  for (let i = 0; i < pts.length; i++) {
    const [u, v, w] = pts[i];
    for (let k = 0; k < 7; k++) {
      const p = ((A.t * 0.12 + k / 7 + i * 0.13) % 1), x = A.x(u + p * 70 + Math.sin(A.t + k) * 6), y = A.y(v - p * 160), R = (w * 0.8 + p * 50) * A.s;
      const gr = g.createRadialGradient(x, y, 0, x, y, R);
      const c = blanc ? '210,215,225' : (p < 0.25 ? '255,150,70' : '60,30,30');
      gr.addColorStop(0, `rgba(${c},${0.35 * (1 - p)})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - R, y - R, R * 2, R * 2);
    }
  }
}
function braises(g, A) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 50; k++) {
    const p = (A.t * (0.06 + (k % 5) * 0.015) + k * 0.137) % 1, u = (k * 173) % WV + Math.sin(A.t * 2 + k) * 20, v = HV * (1 - p * 1.1);
    g.fillStyle = `rgba(255,${140 + (k % 4) * 25},50,${0.8 * (1 - p)})`; g.fillRect(A.x(u), A.y(v), 2.2 * A.s, 2.2 * A.s);
  }
  g.restore();
}
function eclairs(g, A) {
  const cyc = 5.3, ph = A.t % cyc, k = Math.floor(A.t / cyc);
  if (ph > 0.45) return;
  const a = ph < 0.08 || (ph > 0.16 && ph < 0.24) ? 1 : 0.25;
  const u = ((k * 977) % WV), x0 = A.x(u);
  g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x0, A.y(HV * 0.25), 0, x0, A.y(HV * 0.25), A.L * 0.6); gr.addColorStop(0, `rgba(200,180,255,${0.35 * a})`); gr.addColorStop(1, 'rgba(200,180,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, A.L, A.H);
  g.strokeStyle = `rgba(245,235,255,${a})`; g.lineWidth = 2.5 * A.s; g.shadowColor = '#cdb0ff'; g.shadowBlur = 18;
  let x = x0, y = A.y(HV * 0.2); g.beginPath(); g.moveTo(x, y);
  for (let s = 0; s < 9; s++) { x += (TAB[(k * 31 + s) & 1023] - 0.5) * 70 * A.s; y += HV * 0.06 * A.s; g.lineTo(x, y); }
  g.stroke(); g.restore();
}
function pluie(g, A) {
  g.strokeStyle = 'rgba(200,190,255,.25)'; g.lineWidth = 1; g.beginPath();
  for (let k = 0; k < 120; k++) { const x = ((k * 97.13 + A.t * 260) % (A.L + 200)) - 100, y = ((k * 53.7 + A.t * 900) % (A.H + 60)) - 30; g.moveTo(x, y); g.lineTo(x - 7, y + 22); }
  g.stroke();
}
function rayonsSurface(g, A) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 7; k++) {
    const u = (k * 360 + 120) % WV, x = A.x(u) + Math.sin(A.t * 0.4 + k) * 40 * A.s, w = (40 + (k % 3) * 30) * A.s, a = 0.08 + 0.05 * Math.sin(A.t * 0.7 + k * 2);
    const gr = g.createLinearGradient(0, A.y(0), 0, A.y(HV * 0.9)); gr.addColorStop(0, `rgba(200,255,250,${a})`); gr.addColorStop(1, 'rgba(200,255,250,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x, A.y(0)); g.lineTo(x + w, A.y(0)); g.lineTo(x + w * 3 + 120 * A.s, A.y(HV * 0.9)); g.lineTo(x + w * 1.4 + 120 * A.s, A.y(HV * 0.9)); g.fill();
  }
  g.restore();
}
function poissons(g, A, al) {
  for (let b = 0; b < 3; b++) {
    const dir = b % 2 ? -1 : 1, u0 = ((A.t * 30 * dir + b * 800) % WV + WV) % WV, v0 = HV * (0.35 + b * 0.12);
    g.fillStyle = `rgba(10,50,60,${al})`;
    for (let k = 0; k < 14; k++) {
      const u = u0 + (k % 5) * 18 + Math.sin(A.t * 2 + k) * 4, v = v0 + Math.floor(k / 5) * 12 + Math.sin(A.t * 1.5 + k * 3) * 5;
      const x = A.x(u), y = A.y(v), s = 6 * A.s;
      g.beginPath(); g.ellipse(x, y, s, s * 0.4, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - dir * s, y); g.lineTo(x - dir * s * 1.7, y - s * 0.5); g.lineTo(x - dir * s * 1.7, y + s * 0.5); g.fill();
    }
  }
}
function algues(g, A) {
  g.lineCap = 'round';
  for (let k = 0; k < 16; k++) {
    const u = (k * 151.7) % WV, h = 160 + (k * 37 % 120);
    g.strokeStyle = k % 3 ? 'rgba(20,90,70,.85)' : 'rgba(40,120,80,.85)'; g.lineWidth = 7 * A.s;
    g.beginPath(); let x = A.x(u), y = A.y(HV); g.moveTo(x, y);
    for (let j = 1; j <= 8; j++) { const v = HV - h * j / 8; g.lineTo(A.x(u + Math.sin(A.t * 1.1 + j * 0.5 + k) * j * 3), A.y(v)); }
    g.stroke();
  }
}
function bulles(g, A) {
  g.strokeStyle = 'rgba(200,255,255,.45)'; g.lineWidth = 1;
  for (let k = 0; k < 30; k++) { const p = (A.t * 0.08 * (1 + k % 3) + k * 0.31) % 1, x = A.x((k * 211) % WV + Math.sin(A.t * 2 + k) * 8), y = A.y(HV * (1 - p)), R = (2 + k % 4) * A.s; g.beginPath(); g.arc(x, y, R, 0, 7); g.stroke(); }
}
function meduses(g, A) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const u = (k * 830 + 300) % WV + Math.sin(A.t * 0.2 + k) * 60, v = HV * (0.3 + k * 0.15) + Math.sin(A.t * 0.6 + k) * 30, x = A.x(u), y = A.y(v), R = 16 * A.s, p = 1 + 0.12 * Math.sin(A.t * 2.5 + k);
    const gr = g.createRadialGradient(x, y, 0, x, y, R * 2.5); gr.addColorStop(0, 'rgba(255,140,230,.35)'); gr.addColorStop(1, 'rgba(255,140,230,0)'); g.fillStyle = gr; g.fillRect(x - R * 3, y - R * 3, R * 6, R * 6);
    g.fillStyle = 'rgba(255,190,240,.45)'; g.beginPath(); g.ellipse(x, y, R * p, R * 0.7 / p, 0, Math.PI, 0); g.fill();
    g.strokeStyle = 'rgba(255,190,240,.35)'; g.lineWidth = 1.2; for (let j = -2; j <= 2; j++) { g.beginPath(); g.moveTo(x + j * R * 0.35, y); g.quadraticCurveTo(x + j * R * 0.35 + Math.sin(A.t * 2 + j) * 5, y + R, x + j * R * 0.3, y + R * 2.2); g.stroke(); }
  }
  g.restore();
}
function projecteurs(g, A) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 2; k++) {
    const x = A.x(WV * (0.3 + k * 0.4)), y = A.y(HV * 0.85), a = -Math.PI / 2 + Math.sin(A.t * 0.3 + k * 2) * 0.5, l = A.H;
    const gr = g.createLinearGradient(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l); gr.addColorStop(0, 'rgba(255,230,180,.12)'); gr.addColorStop(1, 'rgba(255,230,180,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a - 0.06) * l, y + Math.sin(a - 0.06) * l); g.lineTo(x + Math.cos(a + 0.06) * l, y + Math.sin(a + 0.06) * l); g.fill();
  }
  g.restore();
}
function balises(g, A, pts) {
  for (let i = 0; i < pts.length; i++) {
    const on = Math.sin(A.t * 3 + i * 1.7) > 0.6; if (!on) continue;
    const x = A.x(pts[i][0]), y = A.y(pts[i][1]), R = 6 * A.s;
    const gr = g.createRadialGradient(x, y, 0, x, y, R * 2); gr.addColorStop(0, 'rgba(255,60,50,.95)'); gr.addColorStop(1, 'rgba(255,60,50,0)'); g.fillStyle = gr; g.fillRect(x - R * 2, y - R * 2, R * 4, R * 4);
  }
}
function aurore(g, A) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let c = 0; c < 3; c++) {
    const base = HV * (0.1 + c * 0.07), hh = HV * (0.22 - c * 0.03), col = [[90, 255, 170], [120, 220, 255], [200, 110, 255]][c];
    const pasU = 6;
    for (let u = 0; u < WV; u += pasU) {
      const x = A.x(u); if (x < -20 || x > A.L + 20) continue;
      const ond = Math.sin(u * 0.004 + A.t * 0.35 + c) * 50 + Math.sin(u * 0.011 - A.t * 0.6 + c * 2) * 22;
      const a = (0.09 + 0.04 * Math.sin(u * 0.013 + A.t * 1.4 + c)) * Math.max(0, Math.sin(u * 0.0026 + c * 1.3 + A.t * 0.1));
      if (a <= 0.01) continue;
      const y0 = A.y(base + ond), y1 = A.y(base + ond + hh);
      const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, css(col, 0)); gr.addColorStop(0.7, css(col, a)); gr.addColorStop(1, css(col, 0));
      g.fillStyle = gr; g.fillRect(x, y0, pasU * A.s + 1, y1 - y0);
    }
  }
  g.restore();
}
function neigeTombe(g, A) {
  g.fillStyle = 'rgba(255,255,255,.75)';
  for (let k = 0; k < 90; k++) { const x = ((k * 97.13 + A.t * 20 + Math.sin(A.t + k) * 20) % (A.L + 40)) - 20, y = ((k * 53.7 + A.t * (40 + k % 5 * 12)) % (A.H + 20)) - 10, R = 1 + (k % 3); g.fillRect(x, y, R, R); }
}
function battement(g, A) {
  const p = A.t % 1.2, b = Math.max(0, Math.sin(p / 1.2 * Math.PI * 2) ** 8) + 0.6 * Math.max(0, Math.sin((p - 0.22) / 1.2 * Math.PI * 2) ** 8);
  g.save(); g.globalCompositeOperation = 'lighter';
  const x = A.L / 2, y = A.y(HV * 0.8), R = A.L * 0.6, gr = g.createRadialGradient(x, y, 0, x, y, R);
  gr.addColorStop(0, `rgba(255,70,190,${0.06 + 0.12 * b})`); gr.addColorStop(1, 'rgba(255,70,190,0)'); g.fillStyle = gr; g.fillRect(0, 0, A.L, A.H);
  g.restore();
}
function etincelles(g, A) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 40; k++) { const p = (A.t * 0.05 + k * 0.173) % 1, x = A.x((k * 233) % WV + Math.sin(A.t * 0.8 + k) * 30), y = A.y(HV * (0.9 - p * 0.8)), a = Math.sin(p * Math.PI) * (0.5 + 0.5 * Math.sin(A.t * 5 + k)); g.fillStyle = `rgba(255,170,240,${a})`; g.fillRect(x, y, 2 * A.s, 2 * A.s); }
  g.restore();
}

/* ---------- Fabrication (une fois par région) et dessin ---------- */
const cache = new Map();
function obtenir(cle) {
  if (cache.has(cle)) { const v = cache.get(cle); cache.delete(cle); cache.set(cle, v); return v; }
  const P = PEINTRES[cle]; if (!P) return null;
  const r = rngDe(cle.length * 7919 + cle.charCodeAt(0) * 31);
  const liste = P(r).map(c => {
    if (c.anim) return c;
    const cv = toile(Math.round(WV / c.res), Math.round(HV / c.res)), g = cv.getContext('2d');
    if (c.res !== 1) g.scale(1 / c.res, 1 / c.res);
    c.peindre(g);
    return { f: c.f, v: c.v, cv };
  });
  cache.set(cle, liste);
  while (cache.size > 3) cache.delete(cache.keys().next().value);   // on garde les trois dernières régions
  return liste;
}
// px : défilement horizontal (pixels d'écran), fy : 0..1 (position verticale dans le niveau)
function dessiner(g, cle, px, fy, L, H, t) {
  const liste = obtenir(cle);
  if (!liste) return false;
  const s = H * 1.14 / HV, lw = WV * s, over = HV * s - H;
  let dernier = { f: 0, v: 0 };
  for (const c of liste) {
    const f = c.f, v = c.anim ? dernier.v : c.v;
    const dx = -((((px * f) % lw) + lw) % lw), dy = -over * (0.15 + 0.85 * v) * fy;
    if (c.anim) {
      const A = { s, t, L, H, x: (u) => { let x = dx + u * s; while (x < -lw * 0.5) x += lw; while (x > L + lw * 0.5) x -= lw; return x; }, y: (vv) => dy + vv * s,
        x0: (f2, u) => { const d2 = -((((px * f2) % lw) + lw) % lw); let x = d2 + u * s; while (x < -lw * 0.5) x += lw; while (x > L + lw * 0.5) x -= lw; return x; } };
      c.anim(g, A);
      continue;
    }
    dernier = c;
    for (let x = dx; x < L; x += lw) g.drawImage(c.cv, x, dy, lw + 1, HV * s);
  }
  return true;
}
racine.Paysages = { dessiner, obtenir, CLES: Object.keys(PEINTRES) };
})(typeof window !== 'undefined' ? window : globalThis);
