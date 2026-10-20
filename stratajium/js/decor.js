/* Stratajium — décors vus du dessus, dessinés en canvas (rien ne ressemble à une pièce du jeu).
   5 décors : été, automne, hiver, désert, marais. Le plateau est une clairière ; les trous de la carte
   deviennent buissons, rochers ou mares. Un canvas fixe + un canvas animé (lucioles, feuilles, neige, poussière, brume).
   Changer de décor se fait en fondu. */
const Decor = (function () {
  'use strict';
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rng(seed) { let v = (seed >>> 0) % 2147483647 || 1; return () => { v = (v * 16807) % 2147483647; return (v - 1) / 2147483646; }; }
  const pick = (R, a) => a[Math.floor(R() * a.length)];

  // ----- palettes -----
  const THEMES = {
    ete: {
      name: 'Forêt d’été', ground: ['#1b2e1c', '#122214'], blot: ['#2a4a2a', '#0b160c'], dirt: '#3a3020', under: '#4a3a24',
      blades: ['#3a6038', '#26442a'], tufts: ['#2f5634', '#386640', '#437548', '#2a4c2f', '#4d7f4c'],
      bush: [['#1d3a1f', '#2e5a2e', '#4b8a43'], ['#1f3b26', '#2f6038', '#58955a'], ['#24381a', '#3d5f26', '#6e9a3e']],
      tree: [['#16301a', '#25502a', '#3f7a3c'], ['#1a2f14', '#2f5224', '#5a8a36'], ['#13281e', '#1f4a36', '#3a7a5a']],
      flowers: ['#e8d27a', '#c9a6e8', '#e8a6a6', '#a6c8e8', '#f4f0e8'], stone: ['#8a8a80', '#3c3d38'], moss: '#4f7a3a',
      water: ['#2d6a7a', '#0e2e3a'], berries: '#b8323a', particles: 'fly', bladeDensity: 90,
    },
    automne: {
      name: 'Forêt d’automne', ground: ['#2a2416', '#1c180e'], blot: ['#4a3a1e', '#120e08'], dirt: '#3a2a18', under: '#4a3420',
      blades: ['#6a5a2a', '#4a3e1e'], tufts: ['#7a6a2a', '#8a5a22', '#6a4a1a', '#9a7a32', '#5a4a22'],
      bush: [['#4a2a12', '#8a4a1a', '#c8742a'], ['#3a2a12', '#7a5a1a', '#c89a32'], ['#4a1a12', '#8a2a1a', '#c84a2a']],
      tree: [['#4a1e0e', '#8a3a14', '#d0682a'], ['#4a3a0e', '#9a7a1a', '#e0b23a'], ['#3a120e', '#7a1e18', '#c03a2a']],
      flowers: ['#e0a040', '#c86a3a', '#e8d27a'], stone: ['#8a8278', '#3c3a36'], moss: '#7a6a32',
      water: ['#3a5a6a', '#122a34'], berries: '#8a1a2a', particles: 'leaf', bladeDensity: 140,
    },
    hiver: {
      name: 'Forêt d’hiver', ground: ['#c8d4de', '#a6b6c4'], blot: ['#e8f0f6', '#8698a8'], dirt: '#7a8a98', under: '#6a7682',
      blades: ['#6a7a6a', '#4a5a4a'], tufts: ['#5a6a5a', '#6a7a6a', '#7a8a7a'],
      bush: [['#2a3a32', '#4a5e52', '#e8f0f4'], ['#26362e', '#42564a', '#f0f6fa']],
      tree: [['#0e2418', '#1e3e2a', '#f2f8fc'], ['#12281c', '#24462e', '#e6eef4']],
      flowers: ['#d8e6f0'], stone: ['#9aa6b0', '#4a545e'], moss: '#e8f0f6',
      water: ['#cfe6f2', '#8ab4cc'], berries: '#c8323a', particles: 'snow', bladeDensity: 600, snowy: true, ice: true,
    },
    desert: {
      name: 'Désert', ground: ['#c9a96a', '#a8864a'], blot: ['#dcc08a', '#8a6a3a'], dirt: '#9a7a46', under: '#8a6a3a',
      blades: ['#8a7a3a', '#6a5a2a'], tufts: ['#8a8a3a', '#7a6a2a', '#9a8a42'],
      bush: [['#5a5a22', '#7a7a32', '#a8a44a'], ['#4a5a2a', '#6a7a3a', '#9aa85a']],
      tree: [['#2e4a1a', '#4a6a24', '#7a9a3a']], palm: true,
      flowers: ['#e86a4a', '#f0c040'], stone: ['#b08a5a', '#5a4026'], moss: '#a08a4a',
      water: ['#3aa6b4', '#145a6a'], berries: '#d04a3a', particles: 'dust', bladeDensity: 900,
    },
    marais: {
      name: 'Marais', ground: ['#1a2418', '#0e1610'], blot: ['#2a3a24', '#060a06'], dirt: '#22281a', under: '#2a2a1a',
      blades: ['#3a5030', '#22341e'], tufts: ['#3a5a30', '#4a6a3a', '#2a4426'],
      bush: [['#1a2a18', '#2a3e24', '#4a6236'], ['#162418', '#24382a', '#3e5a42']],
      tree: [['#101c12', '#1c3020', '#36523a'], ['#141a10', '#26301c', '#46563a']],
      flowers: ['#c8c8e8', '#e8e0a0'], stone: ['#6a6e64', '#2a2e28'], moss: '#4a6a3a',
      water: ['#2a4a3a', '#0a1a14'], berries: '#a83a5a', particles: 'mist', bladeDensity: 110, pools: true,
    },
  };
  const THEME_IDS = Object.keys(THEMES);

  function blotch(ctx, x, y, r, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function tuft(ctx, R, P, x, y, size, alpha) {
    ctx.save(); ctx.lineCap = 'round';
    ctx.globalAlpha = alpha * .35; ctx.fillStyle = '#050a06';
    ctx.beginPath(); ctx.ellipse(x, y + 1, size * .9, size * .3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha;
    const n = 5 + Math.floor(R() * 6);
    for (let i = 0; i < n; i++) {
      const bx = x + (R() - .5) * size * 1.2, h = size * (.7 + R() * .8), lean = (R() - .5) * size;
      ctx.strokeStyle = pick(R, P.tufts); ctx.lineWidth = .9 + R() * .9;
      ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx + lean * .3, y - h * .6, bx + lean, y - h); ctx.stroke();
    }
    ctx.restore();
  }
  function stone(ctx, R, P, x, y, r) {
    ctx.save();
    ctx.globalAlpha = .45; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x + r * .25, y + r * .35, r, r * .75, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, P.stone[0]); g.addColorStop(1, P.stone[1]);
    ctx.fillStyle = g; ctx.beginPath();
    const n = 7, rot = R() * 6;
    for (let i = 0; i < n; i++) { const a = rot + i * Math.PI * 2 / n, rr = r * (.75 + R() * .3); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * .8; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = .25; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x - r * .3, y - r * .3, r * .35, r * .18, -.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = P.snowy ? .85 : .55; ctx.fillStyle = P.moss; ctx.beginPath(); ctx.ellipse(x + r * .1, y - r * .25, r * .45, r * .25, .3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function flowers(ctx, R, P, x, y) {
    const col = pick(R, P.flowers);
    for (let i = 0; i < 3 + R() * 5; i++) {
      const fx = x + (R() - .5) * 26, fy = y + (R() - .5) * 18, s = 1.4 + R() * .8;
      ctx.save(); ctx.globalAlpha = .85; ctx.fillStyle = col;
      for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * s, fy + Math.sin(a) * s, s * .85, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#7a5a1a'; ctx.beginPath(); ctx.arc(fx, fy, s * .6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  function bush(ctx, R, P, x, y, r) {
    const tones = pick(R, P.bush);
    blotch(ctx, x + r * .25, y + r * .35, r * 1.3, '#000', .5);
    const blobs = 5 + Math.floor(R() * 5);
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < blobs; i++) {
        const a = R() * Math.PI * 2, d = R() * r * .6 * (1 - pass * .25);
        const bx = x + Math.cos(a) * d - pass * r * .08, by = y + Math.sin(a) * d - pass * r * .1, br = r * (.38 + R() * .3) * (1 - pass * .2);
        const g = ctx.createRadialGradient(bx - br * .35, by - br * .35, br * .1, bx, by, br);
        g.addColorStop(0, tones[Math.min(2, pass + 1)]); g.addColorStop(1, tones[pass === 0 ? 0 : 1]);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.save(); ctx.globalAlpha = .55;
    for (let i = 0; i < r * 1.2; i++) {
      const a = R() * Math.PI * 2, d = R() * r * .95;
      ctx.fillStyle = R() < .5 ? tones[2] : tones[1];
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.4, 1.1, R() * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (R() < .3) for (let i = 0; i < 4; i++) { ctx.fillStyle = P.berries; ctx.beginPath(); ctx.arc(x + (R() - .5) * r, y + (R() - .5) * r, 1.6, 0, Math.PI * 2); ctx.fill(); }
  }
  // houppier vu du dessus (palmier dans le désert, branches enneigées en hiver)
  function tree(ctx, R, P, x, y, r) {
    blotch(ctx, x + r * .35, y + r * .45, r * 1.35, '#000', .55);
    const base = pick(R, P.tree);
    if (P.palm) {
      ctx.save(); ctx.lineCap = 'round';
      const n = 7 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + R() * .3, L = r * (.8 + R() * .3);
        const g = ctx.createLinearGradient(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L);
        g.addColorStop(0, base[2]); g.addColorStop(1, base[0]);
        ctx.strokeStyle = g; ctx.lineWidth = r * .22;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a + .3) * L * .6, y + Math.sin(a + .3) * L * .6, x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.stroke();
      }
      ctx.fillStyle = '#6a4a22'; ctx.beginPath(); ctx.arc(x, y, r * .14, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }
    const n = 7 + Math.floor(R() * 4);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + R() * .4, d = r * (.45 + R() * .15);
      const bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d, br = r * (.42 + R() * .12);
      const g = ctx.createRadialGradient(bx - br * .3, by - br * .3, br * .1, bx, by, br);
      g.addColorStop(0, base[1]); g.addColorStop(1, base[0]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    }
    const g = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r * .75);
    g.addColorStop(0, P.snowy ? base[1] : base[2]); g.addColorStop(1, base[1]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * .7, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.globalAlpha = P.snowy ? .8 : .35;
    for (let i = 0; i < r * 2; i++) { const a = R() * Math.PI * 2, d = R() * r; ctx.fillStyle = R() < .5 ? base[2] : '#0c1a0e'; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, P.snowy ? 4 : 3, P.snowy ? 2.4 : 1.4, R() * 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function pond(ctx, R, P, x, y, w, h) {
    ctx.save();
    blotch(ctx, x, y, Math.max(w, h) * .75, '#000', .45);
    ctx.fillStyle = P.dirt; ctx.beginPath(); ctx.ellipse(x, y, w * .52, h * .52, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x - w * .15, y - h * .15, 2, x, y, Math.max(w, h) * .5);
    g.addColorStop(0, P.water[0]); g.addColorStop(1, P.water[1]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, w * .45, h * .45, 0, 0, Math.PI * 2); ctx.fill();
    if (P.ice) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + (R() - .5) * w * .5, y + (R() - .5) * h * .5); ctx.lineTo(x + (R() - .5) * w * .7, y + (R() - .5) * h * .7); ctx.stroke(); } }
    else for (let i = 0; i < 2; i++) { ctx.fillStyle = '#3f7a3a'; const lx = x + (R() - .5) * w * .5, ly = y + (R() - .5) * h * .4; ctx.beginPath(); ctx.arc(lx, ly, 3.5, .3, Math.PI * 2 - .3); ctx.lineTo(lx, ly); ctx.fill(); }
    ctx.restore();
  }
  function ground(ctx, R, P, CW, CH) {
    const g = ctx.createLinearGradient(0, 0, CW * .3, CH);
    g.addColorStop(0, P.ground[0]); g.addColorStop(1, P.ground[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
    const area = CW * CH;
    for (let i = 0; i < area / 7000; i++) blotch(ctx, R() * CW, R() * CH, 30 + R() * 80, R() < .55 ? P.blot[0] : P.blot[1], .35);
    for (let i = 0; i < area / 30000; i++) blotch(ctx, R() * CW, R() * CH, 18 + R() * 30, P.dirt, .35);
    if (P.pools) for (let i = 0; i < area / 60000; i++) pond(ctx, R, P, R() * CW, R() * CH, 30 + R() * 50, 20 + R() * 30);
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < area / P.bladeDensity; i++) {
      const x = R() * CW, y = R() * CH, h = 2 + R() * 4;
      ctx.globalAlpha = .2 + R() * .25; ctx.strokeStyle = R() < .5 ? P.blades[0] : P.blades[1]; ctx.lineWidth = .9;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (R() - .5) * 2.5, y - h); ctx.stroke();
    }
    ctx.restore();
    if (P.particles === 'dust') for (let i = 0; i < area / 4000; i++) { ctx.fillStyle = 'rgba(90,60,30,.25)'; ctx.beginPath(); ctx.arc(R() * CW, R() * CH, .8 + R() * 1.6, 0, Math.PI * 2); ctx.fill(); }
  }

  // ----- forêt pleine (fond des menus) -----
  function drawForest(ctx, P, CW, CH, seed) {
    const R = rng(seed);
    ground(ctx, R, P, CW, CH);
    const area = CW * CH;
    for (let i = 0; i < area / 1800; i++) tuft(ctx, R, P, R() * CW, R() * CH, 5 + R() * 6, .8);
    for (let i = 0; i < area / 26000; i++) flowers(ctx, R, P, R() * CW, R() * CH);
    for (let i = 0; i < area / 40000; i++) stone(ctx, R, P, R() * CW, R() * CH, 4 + R() * 8);
    for (let i = 0; i < area / 16000; i++) bush(ctx, R, P, R() * CW, R() * CH, 18 + R() * 26);
    for (let i = 0; i < area / 42000; i++) tree(ctx, R, P, R() * CW, R() * CH, 50 + R() * 50);
  }

  // ----- clairière autour du plateau -----
  function drawBack(ctx, P, geo, sq, m, seed) {
    const R = rng(seed);
    const BW = geo.W * sq, BH = geo.H * sq, CW = BW + 2 * m, CH = BH + 2 * m, area = CW * CH;
    ground(ctx, R, P, CW, CH);
    const cellAt = (x, y) => { const c = Math.floor((x - m) / sq), r = Math.floor((y - m) / sq); return r >= 0 && r < geo.H && c >= 0 && c < geo.W && geo.ex[r * geo.W + c]; };
    for (let q = 0; q < geo.N; q++) {
      if (!geo.ex[q]) continue;
      const r = q / geo.W | 0, c = q % geo.W, x = m + c * sq, y = m + r * sq;
      blotch(ctx, x + sq * .55, y + sq * .6, sq * .95, '#000', .4);
      blotch(ctx, x + sq / 2, y + sq / 2, sq * .85, P.under, .5);
    }
    const seen = new Uint8Array(geo.N);
    for (let q = 0; q < geo.N; q++) {
      if (geo.ex[q] || seen[q]) continue;
      const grp = [], st = [q]; seen[q] = 1;
      while (st.length) { const x = st.pop(); grp.push(x); const r = x / geo.W | 0, c = x % geo.W; for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + dr, cc = c + dc; if (rr < 0 || rr >= geo.H || cc < 0 || cc >= geo.W) continue; const y = rr * geo.W + cc; if (!geo.ex[y] && !seen[y]) { seen[y] = 1; st.push(y); } } }
      const inner = grp.every(x => { const r = x / geo.W | 0, c = x % geo.W; return r > 0 && r < geo.H - 1 && c > 0 && c < geo.W - 1; });
      const kind = inner && grp.length <= 4 && R() < (P.pools ? .8 : .5) ? 'pond' : (R() < .25 ? 'rocks' : 'bush');
      if (kind === 'pond') {
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const x of grp) { const r = x / geo.W | 0, c = x % geo.W; x0 = Math.min(x0, c); x1 = Math.max(x1, c); y0 = Math.min(y0, r); y1 = Math.max(y1, r); }
        pond(ctx, R, P, m + (x0 + x1 + 1) / 2 * sq, m + (y0 + y1 + 1) / 2 * sq, (x1 - x0 + 1) * sq * 1.05, (y1 - y0 + 1) * sq * 1.05);
      } else for (const x of grp) {
        const r = x / geo.W | 0, c = x % geo.W, cx = m + c * sq + sq / 2, cy = m + r * sq + sq / 2;
        if (kind === 'rocks') { stone(ctx, R, P, cx - sq * .15, cy, sq * .3); stone(ctx, R, P, cx + sq * .2, cy + sq * .15, sq * .2); tuft(ctx, R, P, cx + sq * .25, cy - sq * .2, sq * .15, .9); }
        else bush(ctx, R, P, cx, cy, sq * .52);
      }
    }
    const outside = (x, y, pad) => !cellAt(x, y) && !cellAt(x - pad, y) && !cellAt(x + pad, y) && !cellAt(x, y - pad) && !cellAt(x, y + pad);
    for (let i = 0; i < area / 1500; i++) { const x = R() * CW, y = R() * CH; if (outside(x, y, 6)) tuft(ctx, R, P, x, y, 5 + R() * 6, .85); }
    for (let i = 0; i < area / 22000; i++) { const x = R() * CW, y = R() * CH; if (outside(x, y, 14)) flowers(ctx, R, P, x, y); }
    for (let i = 0; i < area / 30000; i++) { const x = R() * CW, y = R() * CH; if (outside(x, y, 12)) stone(ctx, R, P, x, y, 4 + R() * 7); }
    const ring = (n, fn, dist, sz) => {
      for (let i = 0; i < n; i++) {
        let x, y, tries = 0;
        do {
          const side = Math.floor(R() * 4);
          if (side === 0) { x = R() * CW; y = R() * m * dist; }
          else if (side === 1) { x = R() * CW; y = CH - R() * m * dist; }
          else if (side === 2) { x = R() * m * dist; y = R() * CH; }
          else { x = CW - R() * m * dist; y = R() * CH; }
        } while (!outside(x, y, sz) && ++tries < 20);
        if (tries < 20) fn(x, y);
      }
    };
    ring(Math.round((CW + CH) / 26), (x, y) => bush(ctx, R, P, x, y, m * (.22 + R() * .18)), 1, m * .3);
    ring(Math.round((CW + CH) / 60), (x, y) => tree(ctx, R, P, x, y, m * (.5 + R() * .3)), .55, m * .55);
  }

  // ----- une instance de décor (le fond des menus et la clairière du plateau en sont deux) -----
  function create() {
    let host = null, cvBack = null, cvAnim = null, raf = 0, info = null, t0 = 0, parts = [], P = THEMES.ete, last = null;
    function initAnim(CW, CH, seed) {
      const R = rng(seed + 7);
      parts = [];
      const k = P.particles;
      if (k === 'fly' || k === 'mist') for (let i = 0; i < Math.round((CW + CH) / 40); i++) parts.push({ k: 'fly', x: R() * CW, y: R() * CH, ph: R() * 6.3, sp: .3 + R() * .5, r: 1.2 + R() * 1.4 });
      if (k === 'fly') for (let i = 0; i < 9; i++) parts.push({ k: 'leaf', x: R() * CW, y: R() * CH, ph: R() * 6.3, sp: 8 + R() * 10, rot: R() * 6, col: pick(R, ['#7a9a3a', '#b8902e', '#5a8a3a']) });
      if (k === 'leaf') for (let i = 0; i < 26; i++) parts.push({ k: 'leaf', x: R() * CW, y: R() * CH, ph: R() * 6.3, sp: 10 + R() * 14, rot: R() * 6, col: pick(R, ['#d0682a', '#e0b23a', '#c03a2a', '#b8902e', '#8a4a1a']) });
      if (k === 'snow') for (let i = 0; i < Math.round((CW + CH) / 6); i++) parts.push({ k: 'snow', x: R() * CW, y: R() * CH, ph: R() * 6.3, sp: 14 + R() * 26, r: .8 + R() * 2 });
      if (k === 'dust') for (let i = 0; i < Math.round((CW + CH) / 14); i++) parts.push({ k: 'dust', x: R() * CW, y: R() * CH, ph: R() * 6.3, sp: 10 + R() * 20, r: .6 + R() * 1.4 });
      if (k === 'mist') for (let i = 0; i < 7; i++) parts.push({ k: 'mist', x: R() * CW, y: R() * CH, r: 90 + R() * 120, ph: R() * 6.3 });
      for (let i = 0; i < 5; i++) parts.push({ k: 'shade', x: R() * CW, y: R() * CH, r: 60 + R() * 90, ph: R() * 6.3 });
    }
    function frame(now) {
      raf = 0;
      if (!cvAnim || !info) return;
      const ctx = cvAnim.getContext('2d'), dpr = info.dpr, CW = info.CW, CH = info.CH;
      const t = (now - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, CW, CH);
      for (const p of parts) {
        if (p.k === 'shade') blotch(ctx, p.x + Math.sin(t * .15 + p.ph) * 30, p.y + Math.cos(t * .11 + p.ph) * 20, p.r, '#000', .08);
        else if (p.k === 'mist') blotch(ctx, (p.x + t * 8) % (CW + 200) - 100, p.y + Math.sin(t * .2 + p.ph) * 20, p.r, '#c8d8c8', .12);
        else if (p.k === 'fly') {
          const x = p.x + Math.sin(t * p.sp + p.ph) * 22, y = p.y + Math.cos(t * p.sp * .8 + p.ph * 1.3) * 16;
          const a = .25 + .55 * Math.max(0, Math.sin(t * 1.7 + p.ph * 3));
          blotch(ctx, x, y, p.r * 5, '#e8f08a', a * .35);
          ctx.globalAlpha = a; ctx.fillStyle = '#f6ffc0'; ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        } else if (p.k === 'snow' || p.k === 'dust') {
          p.y += p.sp / 60 * (p.k === 'dust' ? .2 : 1); p.x += (p.k === 'dust' ? p.sp / 60 : Math.sin(t + p.ph) * .3);
          if (p.y > CH + 5) { p.y = -5; p.x = Math.random() * CW; }
          if (p.x > CW + 5) { p.x = -5; p.y = Math.random() * CH; }
          ctx.globalAlpha = p.k === 'snow' ? .85 : .5; ctx.fillStyle = p.k === 'snow' ? '#fff' : '#e8d0a0';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        } else {
          p.y += p.sp / 60; p.x += Math.sin(t * .9 + p.ph) * .35; p.rot += .01;
          if (p.y > CH + 10) { p.y = -10; p.x = Math.random() * CW; }
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + Math.sin(t * 2 + p.ph) * .6);
          ctx.globalAlpha = .85; ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.stroke();
          ctx.restore();
        }
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    }
    // prépare les canvas ; si un fond existait déjà, le nouveau apparaît en fondu par-dessus
    function canvases(container, CW, CH, fade) {
      host = container;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const old = cvBack;
      cvBack = document.createElement('canvas'); cvBack.className = 'decor-back';
      if (!cvAnim) { cvAnim = document.createElement('canvas'); cvAnim.className = 'decor-anim'; }
      for (const c of [cvBack, cvAnim]) { c.width = CW * dpr; c.height = CH * dpr; c.style.width = CW + 'px'; c.style.height = CH + 'px'; }
      if (old && old.parentNode === host && fade) {
        cvBack.style.opacity = 0; cvBack.style.transition = 'opacity 2.2s ease';
        old.after(cvBack);
        requestAnimationFrame(() => requestAnimationFrame(() => { cvBack.style.opacity = 1; }));
        setTimeout(() => old.remove(), 2400);
      } else { if (old) old.remove(); host.insertBefore(cvBack, host.firstChild); }
      cvBack.after(cvAnim);
      const ctx = cvBack.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      info = { dpr, CW, CH };
      return ctx;
    }
    function startAnim(CW, CH, seed) {
      initAnim(CW, CH, seed);
      t0 = performance.now();
      if (!reduce && !raf) raf = requestAnimationFrame(frame);
      if (reduce) frame(performance.now());
    }
    function scene(container, seed, theme, fade) {
      if (theme) P = THEMES[theme] || P;
      const CW = Math.max(200, container.clientWidth), CH = Math.max(200, container.clientHeight);
      drawForest(canvases(container, CW, CH, fade), P, CW, CH, seed);
      startAnim(CW, CH, seed);
      last = { kind: 'scene', container, seed };
    }
    function build(container, geo, sq, m, seed, theme, fade) {
      if (theme) P = THEMES[theme] || P;
      const CW = Math.round(geo.W * sq + 2 * m), CH = Math.round(geo.H * sq + 2 * m);
      drawBack(canvases(container, CW, CH, fade), P, geo, sq, m, seed);
      startAnim(CW, CH, seed);
      last = { kind: 'build', container, geo, sq, m, seed };
    }
    // change de décor en fondu (redessine le même endroit)
    function setTheme(theme) {
      if (!THEMES[theme]) return;
      P = THEMES[theme];
      if (!last) return;
      if (last.kind === 'scene') scene(last.container, last.seed, null, true);
      else build(last.container, last.geo, last.sq, last.m, last.seed, null, true);
    }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    return { build, scene, setTheme, stop };
  }
  return { create, THEMES, THEME_IDS };
})();
