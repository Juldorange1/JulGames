'use strict';
/* =========================================================
   TRIADE — rendu du plateau (canvas 2D)
   Tout ce qui concerne une case reste DANS la case (PV, %, badges) :
   rien ne déborde du plateau.
   ========================================================= */
const Render = (() => {
  let cv, ctx, W = 0, H = 0, dpr = 1, ts = 64, ox = 0, oy = 0, last = 0, running = false;
  let parts = [], ambient = [], ambientEra = -1;

  function init(canvas) { cv = canvas; ctx = cv.getContext('2d'); window.addEventListener('resize', resize); resize(); }
  function resize() {
    if (!cv) return;
    const r = cv.parentElement.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(100, r.width); H = Math.max(100, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ts = Math.floor(Math.min((W - 20) / GRID_W, (H - 20) / GRID_H));
    ox = Math.round((W - ts * GRID_W) / 2); oy = Math.round((H - ts * GRID_H) / 2);
    ambientEra = -1;
  }
  function tileAt(cx, cy) {
    const r = cv.getBoundingClientRect();
    const x = Math.floor((cx - r.left - ox) / ts), y = Math.floor((cy - r.top - oy) / ts);
    return inB(x, y) ? [x, y] : null;
  }
  function tileCenterPx(x, y) { const r = cv.getBoundingClientRect(); return [r.left + ox + (x + 0.5) * ts, r.top + oy + (y + 0.5) * ts]; }
  const px = x => ox + (x + 0.5) * ts, py = y => oy + (y + 0.5) * ts;
  function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + (s || 0) * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  const font = (w, k) => `${w} ${Math.max(11, Math.round(ts * k))}px system-ui, "Segoe UI", sans-serif`;

  function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
  function stop() { running = false; }
  function loop(t) { if (!running) return; frame(t); requestAnimationFrame(loop); }

  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!C) return;
    step(dt);
    draw(t, dt);
  }
  function step(dt) {
    for (const u of C.units) {
      const k = Math.min(1, dt * 16);
      const vx = u.x - u.rx, vy = u.y - u.ry;
      u.rx += vx * k; u.ry += vy * k;
      u.spd = Math.min(1, Math.hypot(vx, vy));
      u.ox *= Math.pow(0.0005, dt); u.oy *= Math.pow(0.0005, dt);
      if (u.flash > 0) u.flash = Math.max(0, u.flash - dt * 4);
    }
    C.shake *= Math.pow(0.002, dt);
    if (C.flash > 0) C.flash = Math.max(0, C.flash - dt * 2.5);
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; p.life -= dt; }
    parts = parts.filter(p => p.life > 0);
  }
  /* dessine une scène de démonstration dans un autre canvas (Codex) : on échange
     temporairement l'état du rendu et du jeu, puis on remet tout en place */
  function drawDemo(canvas, dC, dS, t, dt, before) {
    const sv = { cv, ctx, W, H, dpr, ts, ox, oy, parts, gw: GRID_W, gh: GRID_H, C, S };
    try {
      cv = canvas; ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(50, rect.width); H = Math.max(50, rect.height);
      if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      GRID_W = dC.W; GRID_H = dC.H; C = dC; S = dS; parts = dC._parts || (dC._parts = []);
      ts = Math.floor(Math.min((W - 24) / GRID_W, (H - 24) / GRID_H));
      ox = Math.round((W - ts * GRID_W) / 2); oy = Math.round((H - ts * GRID_H) / 2);
      if (before) before();
      step(dt);
      draw(t, dt);
      dC._parts = parts;
    } finally {
      cv = sv.cv; ctx = sv.ctx; W = sv.W; H = sv.H; dpr = sv.dpr; ts = sv.ts; ox = sv.ox; oy = sv.oy; parts = sv.parts;
      GRID_W = sv.gw; GRID_H = sv.gh; C = sv.C; S = sv.S;
    }
  }

  /* ---------- particules ---------- */
  function emit(x, y, n, color, o) {
    o = o || {};
    if (parts.length > 500) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (o.speed || 2) * ts * (0.4 + Math.random() * 0.8);
      parts.push({ x: px(x) + (Math.random() - 0.5) * ts * 0.2, y: py(y) + (Math.random() - 0.5) * ts * 0.2, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 0) * ts,
        g: (o.grav == null ? 3 : o.grav) * ts, life: (o.life || 0.6) * (0.6 + Math.random() * 0.6), max: o.life || 0.6, color, size: (o.size || 0.06) * ts * (0.6 + Math.random() * 0.8), glow: !!o.glow });
    }
  }
  function drawParts() {
    for (const p of parts) {
      const k = Math.max(0, p.life / p.max);
      ctx.globalAlpha = Math.min(1, k * 1.5);
      if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 8; }
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * k), 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }
  /* particules d'ambiance selon l'ère */
  function drawAmbient(t, dt, eraIdx, era) {
    if (ambientEra !== eraIdx) {
      ambientEra = eraIdx; ambient = [];
      for (let i = 0; i < 38; i++) ambient.push({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random(), p: Math.random() * 7 });
    }
    const kind = eraIdx % ERAS.length;
    for (const a of ambient) {
      if (kind === 2) { a.y -= dt * 22 * a.s; a.x += Math.sin(t / 900 + a.p) * dt * 10; }       // braises
      else if (kind === 3) { a.y -= dt * 14 * a.s; a.x += Math.sin(t / 700 + a.p) * dt * 8; }   // bulles
      else if (kind === 1) { a.y += dt * 9 * a.s; a.x += Math.sin(t / 1200 + a.p) * dt * 14; }  // lucioles / feuilles
      else { a.x += dt * 6 * a.s; a.y += Math.sin(t / 1500 + a.p) * dt * 4; }                    // poussière / étoiles
      if (a.y < -10) a.y = H + 10; if (a.y > H + 10) a.y = -10; if (a.x > W + 10) a.x = -10; if (a.x < -10) a.x = W + 10;
      const tw = 0.5 + 0.5 * Math.sin(t / 600 + a.p * 3);
      ctx.globalAlpha = (kind === 4 ? 0.25 + 0.5 * tw : 0.2 + 0.25 * tw);
      ctx.fillStyle = kind === 2 ? '#ff9a4a' : kind === 1 ? '#c8ff8a' : kind === 3 ? '#8fdcff' : era.accent;
      if (kind === 3) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(a.x, a.y, 2.5 * a.s, 0, 7); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(a.x, a.y, (kind === 1 || kind === 2 ? 1.8 : 1.2) * a.s, 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }

  function draw(t, dt) {
    const eraIdx = eraOf(S.depth), era = eraData(S.depth);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.75);
    bg.addColorStop(0, shade(era.bg, 0.12)); bg.addColorStop(1, shade(era.bg, -0.4));
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    if (!C.demo) drawAmbient(t, dt, eraIdx, era);
    const sh = C.shake > 0.3 ? C.shake : 0;
    ctx.save();
    if (sh && !UI.reduceMotion) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    drawTiles(t, era);
    drawOverlays(t);
    drawUnits(t);
    drawPreview(t);
    for (const tl of C.telegraphs) {
      const c = tl.center || tl.tiles[Math.floor(tl.tiles.length / 2)];
      if (c) warnLabel(c[0], c[1], `−${Math.round(tl.pct * G().taken)}%`, tl.color || '#ff5a5a');
    }
    drawFx(t);
    drawParts();
    drawTexts(t);
    ctx.restore();
    // vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (C.flash > 0) { ctx.fillStyle = `rgba(255,240,220,${C.flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
    drawPhaseBanner(t);
    drawTurnBanner(t);
    drawBanner(t);
  }

  /* ---------- cases ---------- */
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawTiles(t, era) {
    // socle de l'île : une bordure sous chaque case réelle
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
    ctx.fillStyle = shade(era.floor[0], -0.4);
    for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (C.grid[y][x].t !== 'void') { rr(ox + x * ts - 6, oy + y * ts - 6, ts + 12, ts + 12, 10); ctx.fill(); }
    ctx.restore();
    drawCliffs(era);
    for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
      const T = C.grid[y][x], X = ox + x * ts, Y = oy + y * ts;
      if (T.t === 'void') continue;
      const n = hash(x, y, 1);
      ctx.fillStyle = shade(era.floor[(x + y) & 1], (n - 0.5) * 0.12); ctx.fillRect(X, Y, ts, ts);
      // biseau
      ctx.fillStyle = 'rgba(255,255,255,0.045)'; ctx.fillRect(X, Y, ts, 2); ctx.fillRect(X, Y, 2, ts);
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(X, Y + ts - 2, ts, 2); ctx.fillRect(X + ts - 2, Y, 2, ts);
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let i = 0; i < 3; i++) { const a = hash(x, y, i + 3), b = hash(y, x, i + 9); ctx.fillRect(X + a * ts * 0.85, Y + b * ts * 0.85, ts * 0.07, ts * 0.04); }
      if (T.t === 'floor' && !T.z) floorDecor(X, Y, x, y, t);
      if (T.t === 'pit') {
        const g = ctx.createRadialGradient(X + ts / 2, Y + ts * 0.42, ts * 0.05, X + ts / 2, Y + ts / 2, ts * 0.62);
        g.addColorStop(0, '#000'); g.addColorStop(0.65, '#04050a'); g.addColorStop(1, '#141826');
        ctx.fillStyle = g; rr(X + 3, Y + 3, ts - 6, ts - 6, ts * 0.2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 6, Y + 5); ctx.lineTo(X + ts - 6, Y + 5); ctx.stroke();
        ctx.strokeStyle = 'rgba(160,140,255,0.08)'; ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.ellipse(X + ts / 2, Y + ts / 2, ts * 0.32 / i, ts * 0.22 / i, 0, 0, 7); ctx.stroke(); }
      } else if (T.t === 'lava') {
        const p = 0.5 + 0.5 * Math.sin(t / 400 + x * 1.7 + y);
        ctx.save(); ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = 18 * p;
        const g = ctx.createLinearGradient(X, Y + (t / 30 % ts), X + ts, Y + ts);
        g.addColorStop(0, `rgb(${215 + 40 * p | 0},${85 + 40 * p | 0},20)`); g.addColorStop(0.5, '#e0420f'); g.addColorStop(1, '#8f1f0a');
        ctx.fillStyle = g; rr(X + 2, Y + 2, ts - 4, ts - 4, ts * 0.16); ctx.fill(); ctx.restore();
        ctx.fillStyle = `rgba(255,230,140,${0.3 + 0.3 * p})`;
        for (let i = 0; i < 3; i++) { const bx = X + ts * (0.2 + 0.3 * i + 0.05 * Math.sin(t / 300 + i)), by = Y + ts * (0.3 + 0.2 * ((i * 7 + x) % 3)); ctx.beginPath(); ctx.arc(bx, by, ts * (0.04 + 0.03 * Math.sin(t / 200 + i * 2 + x)), 0, 7); ctx.fill(); }
      } else if (T.t === 'rock') drawRock(X, Y, T, era, x, y);
      if (T.z) drawZone(T, X, Y, t, x, y);
      if (T.fire > 0) drawFire(X, Y, t, x, y);
      if (T.trap) drawTrap(X, Y);
    }
    for (const b of C.bombs) drawBomb(b, t);
  }
  function floorDecor(X, Y, x, y, t) {
    const e = eraOf(S.depth) % ERAS.length, h = hash(x, y, 31);
    if (h > 0.34) return;
    const a = X + ts * (0.2 + 0.6 * hash(x, y, 32)), b = Y + ts * (0.2 + 0.6 * hash(x, y, 33));
    ctx.save();
    if (e === 0) { ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a - ts * 0.15, b); ctx.lineTo(a, b + ts * 0.06); ctx.lineTo(a + ts * 0.12, b - ts * 0.04); ctx.lineTo(a + ts * 0.2, b + ts * 0.03); ctx.stroke(); }
    else if (e === 1) { ctx.strokeStyle = 'rgba(120,200,110,0.35)'; ctx.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(a + i * ts * 0.04, b); ctx.quadraticCurveTo(a + i * ts * 0.07, b - ts * 0.08, a + i * ts * 0.1, b - ts * 0.13); ctx.stroke(); } }
    else if (e === 2) { const p = 0.5 + 0.5 * Math.sin(t / 500 + h * 40); ctx.fillStyle = `rgba(255,120,40,${0.12 + 0.18 * p})`; ctx.fillRect(a - ts * 0.12, b, ts * 0.24, 1.5); ctx.fillRect(a, b - ts * 0.08, 1.5, ts * 0.16); }
    else if (e === 3) { const p = 0.5 + 0.5 * Math.sin(t / 900 + h * 30); ctx.strokeStyle = `rgba(120,210,255,${0.06 + 0.1 * p})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(a, b, ts * 0.16, ts * 0.06, 0, 0, 7); ctx.stroke(); }
    else { const p = 0.5 + 0.5 * Math.sin(t / 700 + h * 50); ctx.fillStyle = `rgba(207,155,255,${0.15 + 0.35 * p})`; star(a, b, ts * 0.035, ctx.fillStyle); }
    ctx.restore();
  }
  function drawCliffs(era) {
    // tranche de l'île sous les cases qui donnent sur le vide (effet de relief)
    const solid = (x, y) => inB(x, y) && C.grid[y][x].t !== 'void';
    for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
      if (!solid(x, y) || solid(x, y + 1)) continue;
      const X = ox + x * ts, Y = oy + (y + 1) * ts, d = ts * 0.22;
      const g = ctx.createLinearGradient(0, Y, 0, Y + d); g.addColorStop(0, shade(era.rock, -0.2)); g.addColorStop(1, shade(era.rock, -0.65));
      ctx.fillStyle = g; ctx.fillRect(X - (solid(x - 1, y) ? 0 : 4), Y, ts + (solid(x + 1, y) ? 0 : 4), d);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 1; i < 4; i++) ctx.fillRect(X + ts * (i / 4 + 0.05 * hash(x, y, 40 + i)), Y + 2, 1.5, d - 4);
    }
  }
  function drawRock(X, Y, T, era, x, y) {
    const tmp = T.ttl > 0;
    const base = tmp ? '#7b7466' : era.rock, top = tmp ? '#a39c8c' : era.rockTop;
    // contour irrégulier (toujours le même pour une case donnée)
    const pts = []; const N = 9, cx = X + ts / 2, cy = Y + ts * 0.54;
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2 - Math.PI / 2, rad = ts * (0.4 + 0.07 * hash(x, y, 20 + i)); pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.86]); }
    const poly = (dx, dy, k) => { ctx.beginPath(); pts.forEach(([a, b], i) => { const X2 = cx + (a - cx) * k + dx, Y2 = cy + (b - cy) * k + dy; i ? ctx.lineTo(X2, Y2) : ctx.moveTo(X2, Y2); }); ctx.closePath(); };
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; poly(2, ts * 0.08, 1); ctx.fill();
    const g = ctx.createLinearGradient(X, Y, X, Y + ts);
    g.addColorStop(0, shade(base, 0.12)); g.addColorStop(1, shade(base, -0.4));
    ctx.fillStyle = g; poly(0, 0, 1); ctx.fill();
    const g2 = ctx.createLinearGradient(X, Y, X + ts, Y + ts * 0.7);
    g2.addColorStop(0, shade(top, 0.3)); g2.addColorStop(1, shade(top, -0.05));
    ctx.fillStyle = g2; poly(-ts * 0.03, -ts * 0.07, 0.72); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5; poly(-ts * 0.03, -ts * 0.07, 0.72); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X + ts * (0.3 + hash(x, y, 3) * 0.2), Y + ts * 0.24); ctx.lineTo(X + ts * 0.5, Y + ts * 0.46); ctx.lineTo(X + ts * (0.6 + hash(x, y, 4) * 0.1), Y + ts * 0.4); ctx.stroke();
    if (hash(x, y, 5) > 0.5) { ctx.fillStyle = shade(base, -0.15); ctx.beginPath(); ctx.arc(X + ts * 0.18, Y + ts * 0.86, ts * 0.06, 0, 7); ctx.arc(X + ts * 0.84, Y + ts * 0.82, ts * 0.045, 0, 7); ctx.fill(); }
    if (eraOf(S.depth) % ERAS.length === 1 && !tmp) { ctx.fillStyle = 'rgba(120,200,110,0.55)'; ctx.beginPath(); ctx.ellipse(X + ts * 0.3, Y + ts * 0.14, ts * 0.16, ts * 0.06, 0, 0, 7); ctx.fill(); }
    if (tmp) badgeNum(X + ts - 4, Y + ts - 4, T.ttl, '#d8cfb8', 'br');
  }
  function drawZone(T, X, Y, t, x, y) {
    const cx = X + ts / 2, cy = Y + ts / 2;
    ctx.save();
    switch (T.z) {
      case 'piques': {
        ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(X + 3, Y + 3, ts - 6, ts - 6);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
          const sx = X + ts * (0.2 + 0.3 * i), sy = Y + ts * (0.3 + 0.3 * j), w = ts * 0.1;
          ctx.fillStyle = '#e4e8f2'; ctx.beginPath(); ctx.moveTo(sx - w, sy + w * 0.9); ctx.lineTo(sx, sy - w * 1.5); ctx.lineTo(sx + w, sy + w * 0.9); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#7b8090'; ctx.beginPath(); ctx.moveTo(sx, sy - w * 1.5); ctx.lineTo(sx + w, sy + w * 0.9); ctx.lineTo(sx, sy + w * 0.9); ctx.closePath(); ctx.fill();
        }
        break;
      }
      case 'courant': {
        ctx.fillStyle = 'rgba(50,130,255,0.28)'; ctx.fillRect(X + 1, Y + 1, ts - 2, ts - 2);
        const [dx, dy] = T.zd; const off = ((t / 800) % 1);
        ctx.strokeStyle = 'rgba(160,215,255,0.95)'; ctx.lineWidth = Math.max(3, ts * 0.07); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let k = 0; k < 2; k++) {
          const q = ((k / 2 + off) % 1) - 0.5, ax = cx + dx * q * ts * 0.8, ay = cy + dy * q * ts * 0.8, s = ts * 0.17;
          ctx.globalAlpha = 1 - Math.abs(q) * 1.4;
          ctx.beginPath(); ctx.moveTo(ax - dx * s - dy * s, ay - dy * s - dx * s); ctx.lineTo(ax, ay); ctx.lineTo(ax - dx * s + dy * s, ay - dy * s + dx * s); ctx.stroke();
        }
        break;
      }
      case 'autel': {
        const p = 0.5 + 0.5 * Math.sin(t / 500);
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, ts * 0.5); g.addColorStop(0, `rgba(109,255,174,${0.4 + 0.2 * p})`); g.addColorStop(1, 'rgba(109,255,174,0)');
        ctx.fillStyle = g; ctx.fillRect(X, Y, ts, ts);
        ctx.strokeStyle = 'rgba(109,255,174,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, ts * 0.32, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(160,255,200,0.95)'; const w = ts * 0.07; ctx.fillRect(cx - w, cy - ts * 0.19, w * 2, ts * 0.38); ctx.fillRect(cx - ts * 0.19, cy - w, ts * 0.38, w * 2);
        break;
      }
      case 'glace': {
        const g = ctx.createLinearGradient(X, Y, X + ts, Y + ts); g.addColorStop(0, 'rgba(225,245,255,0.75)'); g.addColorStop(1, 'rgba(120,195,240,0.55)');
        ctx.fillStyle = g; ctx.fillRect(X + 1, Y + 1, ts - 2, ts - 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(X + ts * 0.15, Y + ts * 0.55); ctx.lineTo(X + ts * 0.45, Y + ts * 0.2); ctx.moveTo(X + ts * 0.5, Y + ts * 0.85); ctx.lineTo(X + ts * 0.85, Y + ts * 0.45); ctx.stroke();
        const sh = ((t / 1800 + hash(x, y, 4)) % 1) * ts * 1.6 - ts * 0.3;
        ctx.save(); ctx.beginPath(); ctx.rect(X, Y, ts, ts); ctx.clip();
        ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(X + sh, Y); ctx.lineTo(X + sh + ts * 0.12, Y); ctx.lineTo(X + sh - ts * 0.3, Y + ts); ctx.lineTo(X + sh - ts * 0.42, Y + ts); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }
      case 'rune': {
        const p = 0.5 + 0.5 * Math.sin(t / 350 + x);
        ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 14 * p;
        ctx.strokeStyle = `rgba(255,209,102,${0.65 + 0.35 * p})`; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx, cy, ts * 0.34, 0, 7); ctx.stroke();
        ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + t / 3000 + i * 4 * Math.PI / 5; const X2 = cx + Math.cos(a) * ts * 0.27, Y2 = cy + Math.sin(a) * ts * 0.27; i ? ctx.lineTo(X2, Y2) : ctx.moveTo(X2, Y2); } ctx.closePath(); ctx.stroke();
        break;
      }
      case 'portail': {
        const cols = ['#d68bff', '#5ee7ff', '#ffb36b', '#9dff6b'], col = cols[T.zp % cols.length];
        const a0 = t / 400;
        ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.lineWidth = Math.max(2.5, ts * 0.06);
        for (let i = 0; i < 3; i++) { ctx.strokeStyle = hexA(col, 0.95 - i * 0.25); ctx.beginPath(); ctx.arc(cx, cy, ts * (0.37 - i * 0.09), a0 * (i % 2 ? -1 : 1) + i, a0 * (i % 2 ? -1 : 1) + i + 4.2); ctx.stroke(); }
        ctx.shadowBlur = 0;
        ctx.fillStyle = hexA(col, 0.2); ctx.beginPath(); ctx.arc(cx, cy, ts * 0.37, 0, 7); ctx.fill();
        badgeText(X + ts - 4, Y + 4, String.fromCharCode(65 + T.zp), col, 'tr');
        break;
      }
      case 'buisson': {
        for (let i = 0; i < 6; i++) {
          const bx = X + ts * (0.18 + 0.32 * (i % 3)) + hash(x, y, i) * ts * 0.1, by = Y + ts * (0.3 + 0.38 * Math.floor(i / 3)), r = ts * (0.17 + hash(y, x, i) * 0.06);
          const g = ctx.createRadialGradient(bx - r * 0.3, by - r * 0.4, 1, bx, by, r);
          g.addColorStop(0, '#7fd06e'); g.addColorStop(1, '#2c6a32');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by + Math.sin(t / 900 + i) * 1.2, r, 0, 7); ctx.fill();
        }
        break;
      }
      case 'soin': {
        const p = 0.5 + 0.5 * Math.sin(t / 400 + x);
        ctx.shadowColor = '#6dffae'; ctx.shadowBlur = 10 * p;
        ctx.fillStyle = 'rgba(109,255,174,0.9)';
        ctx.beginPath(); const hy = cy - ts * 0.02 - p * ts * 0.04;
        ctx.moveTo(cx, hy + ts * 0.2); ctx.bezierCurveTo(cx - ts * 0.3, hy, cx - ts * 0.2, hy - ts * 0.24, cx, hy - ts * 0.08); ctx.bezierCurveTo(cx + ts * 0.2, hy - ts * 0.24, cx + ts * 0.3, hy, cx, hy + ts * 0.2); ctx.fill();
        break;
      }
      case 'foyer': drawFire(X, Y, t, x, y); ctx.fillStyle = 'rgba(80,30,10,0.45)'; ctx.beginPath(); ctx.ellipse(cx, Y + ts * 0.82, ts * 0.32, ts * 0.08, 0, 0, 7); ctx.fill(); break;
      case 'trampoline': {
        const p = Math.abs(Math.sin(t / 300 + x));
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx, cy + ts * 0.18, ts * 0.36, ts * 0.12, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#ff9ad5'; ctx.lineWidth = 3;
        ctx.beginPath(); for (let i = 0; i <= 6; i++) { const yy = cy + ts * 0.15 - i * ts * 0.045 * (0.7 + 0.3 * p); ctx.lineTo(cx + (i % 2 ? 1 : -1) * ts * 0.1, yy); } ctx.stroke();
        ctx.fillStyle = '#ff9ad5'; ctx.beginPath(); ctx.ellipse(cx, cy - ts * 0.16 - p * ts * 0.04, ts * 0.3, ts * 0.09, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
        break;
      }
      case 'machoire': {
        ctx.strokeStyle = '#d9b55a'; ctx.fillStyle = 'rgba(217,181,90,0.25)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx, cy, ts * 0.3, 0, 7); ctx.fill(); ctx.stroke();
        ctx.beginPath(); for (let i = 0; i < 6; i++) { const xx = cx - ts * 0.25 + i * ts * 0.1; ctx.moveTo(xx, cy - ts * 0.04); ctx.lineTo(xx + ts * 0.05, cy - ts * 0.14); ctx.lineTo(xx + ts * 0.1, cy - ts * 0.04); }
        for (let i = 0; i < 6; i++) { const xx = cx - ts * 0.25 + i * ts * 0.1; ctx.moveTo(xx, cy + ts * 0.04); ctx.lineTo(xx + ts * 0.05, cy + ts * 0.14); ctx.lineTo(xx + ts * 0.1, cy + ts * 0.04); }
        ctx.stroke();
        break;
      }
      case 'cercle': {
        const p = 0.5 + 0.5 * Math.sin(t / 300);
        ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 16 * p;
        ctx.strokeStyle = 'rgba(255,209,102,0.95)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, ts * 0.38, 0, 7); ctx.stroke();
        ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(cx, cy, ts * 0.28, t / 600, t / 600 + 6.28); ctx.stroke(); ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        for (let i = 0; i < 2; i++) { ctx.fillStyle = i < (T.prog || 0) ? '#ffd166' : 'rgba(255,209,102,0.25)'; ctx.beginPath(); ctx.arc(cx - ts * 0.1 + i * ts * 0.2, Y + ts * 0.86, ts * 0.06, 0, 7); ctx.fill(); }
        break;
      }
      case 'boue': {
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, ts * 0.55); g.addColorStop(0, '#7a5a3a'); g.addColorStop(1, '#4a3420');
        ctx.fillStyle = g; rr(X + 3, Y + 3, ts - 6, ts - 6, ts * 0.25); ctx.fill();
        ctx.fillStyle = 'rgba(30,18,8,0.55)';
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(X + ts * (0.25 + 0.5 * hash(x, y, i + 1)), Y + ts * (0.25 + 0.5 * hash(y, x, i + 2)), ts * 0.08, ts * 0.05, 0, 0, 7); ctx.fill(); }
        ctx.fillStyle = 'rgba(200,170,120,0.25)'; ctx.beginPath(); ctx.arc(cx + Math.sin(t / 700 + x) * ts * 0.15, cy, ts * 0.05 * (0.5 + 0.5 * Math.sin(t / 300 + y)), 0, 7); ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
  function drawFire(X, Y, t, x, y) {
    for (let i = 0; i < 3; i++) {
      const fx2 = X + ts * (0.25 + 0.25 * i), fl = 0.6 + 0.4 * Math.sin(t / 110 + i * 2 + x * 3 + y);
      const g = ctx.createRadialGradient(fx2, Y + ts * 0.75, 1, fx2, Y + ts * 0.6, ts * 0.34 * fl);
      g.addColorStop(0, 'rgba(255,245,170,0.95)'); g.addColorStop(0.5, 'rgba(255,120,30,0.7)'); g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(fx2, Y + ts * 0.62, ts * 0.17, ts * 0.32 * fl, 0, 0, 7); ctx.fill();
    }
  }
  function drawTrap(X, Y) {
    const cx = X + ts / 2, cy = Y + ts / 2, r = ts * 0.27;
    ctx.strokeStyle = 'rgba(255,209,102,0.9)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5); }
    ctx.stroke();
  }
  function drawBomb(b, t) {
    const cx = px(b.x), cy = py(b.y), r = ts * 0.22;
    ctx.fillStyle = '#1b1b22'; ctx.beginPath(); ctx.arc(cx, cy + 3, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#666'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#c9a26b'; ctx.beginPath(); ctx.moveTo(cx + r * 0.5, cy - r * 0.6); ctx.quadraticCurveTo(cx + r, cy - r * 1.4, cx + r * 1.2, cy - r * 1.2); ctx.stroke();
    ctx.fillStyle = Math.sin(t / 80) > 0 ? '#ffd166' : '#ff5a3a'; ctx.beginPath(); ctx.arc(cx + r * 1.2, cy - r * 1.2, 3.5, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,179,71,0.55)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2;
    const X = Math.max(ox, ox + (b.x - 1) * ts) + 3, Y = Math.max(oy, oy + (b.y - 1) * ts) + 3;
    const X2 = Math.min(ox + GRID_W * ts, ox + (b.x + 2) * ts) - 3, Y2 = Math.min(oy + GRID_H * ts, oy + (b.y + 2) * ts) - 3;
    ctx.strokeRect(X, Y, X2 - X, Y2 - Y); ctx.setLineDash([]);
  }

  /* ---------- petites étiquettes DANS les cases ---------- */
  function badgeNum(X, Y, n, color, corner) { badgeText(X, Y, String(n), color, corner); }
  function badgeText(X, Y, txt, color, corner) {
    txt = tr(txt);
    ctx.font = font('900', 0.2); ctx.textAlign = 'center';
    const w = Math.max(ts * 0.26, ctx.measureText(txt).width + 8), h = ts * 0.26;
    const bx = corner && corner[1] === 'r' ? X - w : X, by = corner && corner[0] === 'b' ? Y - h : Y;
    ctx.fillStyle = 'rgba(8,8,14,0.88)'; rr(bx, by, w, h, h / 2); ctx.fill();
    ctx.fillStyle = color; ctx.fillText(txt, bx + w / 2, by + h * 0.76);
  }
  /* étiquette centrée sur une case, toujours gardée dans le plateau */
  function label(x, y, txt, color, big) {
    txt = tr(txt);
    ctx.font = font('900', big ? 0.26 : 0.22); ctx.textAlign = 'center';
    const w = ctx.measureText(txt).width + 12, h = ts * (big ? 0.34 : 0.3);
    let X = px(x), Y = py(y);
    X = Math.max(ox + w / 2 + 2, Math.min(ox + GRID_W * ts - w / 2 - 2, X));
    Y = Math.max(oy + h / 2 + 2, Math.min(oy + GRID_H * ts - h / 2 - 2, Y));
    ctx.fillStyle = 'rgba(8,8,14,0.9)'; rr(X - w / 2, Y - h / 2, w, h, 7); ctx.fill();
    ctx.strokeStyle = hexA(color.length === 7 ? color : '#ffffff', 0.6); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = color; ctx.fillText(txt, X, Y + h * 0.3);
  }
  /* avertissement (attaque annoncée) : triangle + dégâts, dans le coin de la case */
  function warnLabel(x, y, txt, color) {
    txt = tr(txt);
    ctx.font = font('900', 0.2); ctx.textAlign = 'left';
    const w = ctx.measureText(txt).width + ts * 0.32, h = ts * 0.27;
    const X = Math.min(ox + x * ts + 3, ox + GRID_W * ts - w - 2), Y = oy + y * ts + 3;
    ctx.fillStyle = 'rgba(30,6,8,0.92)'; rr(X, Y, w, h, 6); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); const s = h * 0.62, tx = X + h * 0.18, tyy = Y + h * 0.82;
    ctx.moveTo(tx, tyy); ctx.lineTo(tx + s / 2, tyy - s); ctx.lineTo(tx + s, tyy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, X + ts * 0.26, Y + h * 0.76);
  }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; } return `rgb(${r | 0},${g | 0},${b | 0})`; }

  /* ---------- surbrillances ---------- */
  function fillTile(x, y, color, inset) { const i = inset || 0; ctx.fillStyle = color; ctx.fillRect(ox + x * ts + i, oy + y * ts + i, ts - 2 * i, ts - 2 * i); }
  function strokeTile(x, y, color, w, inset) { const i = inset || 2; ctx.strokeStyle = color; ctx.lineWidth = w || 2; ctx.strokeRect(ox + x * ts + i, oy + y * ts + i, ts - 2 * i, ts - 2 * i); }
  function hatch(x, y, color, t) {
    const X = ox + x * ts, Y = oy + y * ts;
    ctx.save(); ctx.beginPath(); ctx.rect(X, Y, ts, ts); ctx.clip();
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    const off = (t / 40) % 14;
    for (let k = -ts; k < ts * 2; k += 14) { ctx.beginPath(); ctx.moveTo(X + k + off, Y); ctx.lineTo(X + k + off - ts, Y + ts); ctx.stroke(); }
    ctx.restore();
  }
  function drawOverlays(t) {
    const pulse = 0.5 + 0.5 * Math.sin(t / 220);
    if (C.phase === 'hero') {
      let dz = null;
      if (C.danger) dz = dangerTiles();
      else if (C.hover && C.mode !== 'skill') { const o = unitAt(C.hover[0], C.hover[1]); if (o && o.team === 'enemy') dz = dangerTiles(o); }
      if (dz) for (const k of dz) { const x = k % GRID_W, y = Math.floor(k / GRID_W); fillTile(x, y, 'rgba(255,70,70,0.14)'); hatch(x, y, 'rgba(255,90,90,0.2)', 0); }
    }
    for (const tl of C.telegraphs) for (const [x, y] of tl.tiles) {
      const c = tl.color || '#ff5a5a';
      fillTile(x, y, hexA(c, 0.2 + 0.18 * pulse)); hatch(x, y, hexA(c, 0.5), t); strokeTile(x, y, hexA(c, 0.9), 2.5, 3);
    }
    for (const e of enemies()) if (e.armed) for (const [x, y] of areaTiles(e.x, e.y, 'ring8')) { fillTile(x, y, `rgba(255,93,143,${0.16 + 0.22 * pulse})`); hatch(x, y, 'rgba(255,93,143,0.45)', t); }
    // renforts annoncés
    for (const s of C.incoming || []) {
      const X = px(s.x), Y = py(s.y), D = ENEMIES[s.kind];
      ctx.save(); ctx.strokeStyle = `rgba(255,90,90,${0.6 + 0.4 * pulse})`; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(X, Y, ts * 0.36, t / 500, t / 500 + 6.28); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 0.45; if (D) { ctx.fillStyle = D.color; shapePath(D.shape, X, Y, ts * 0.2); ctx.fill(); }
      ctx.restore();
      badgeText(ox + s.x * ts + 3, oy + s.y * ts + 3, '!', '#ff8080');
    }
    // rituel : liens des cristaux
    if (ritualOn()) {
      const crys = C.units.filter(u => !u.dead && u.kind === 'cristal');
      ctx.strokeStyle = `rgba(214,139,255,${0.15 + 0.15 * pulse})`; ctx.lineWidth = 2;
      for (const c of crys) for (const e of enemies()) { ctx.beginPath(); ctx.moveTo(px(c.rx), py(c.ry)); ctx.lineTo(px(e.rx), py(e.ry)); ctx.stroke(); }
    }
    if (C.phase !== 'hero' || C.busy) return;
    const hu = heroUnit(C.sel); if (!hu) return;
    if (C.mode === 'skill') {
      const s = skillStats(hu.hero, C.slot); if (!s) return;
      const targets = skillTargets(hu, s);
      for (const [x, y] of targets) { fillTile(x, y, 'rgba(255,170,60,0.18)'); strokeTile(x, y, 'rgba(255,170,60,0.45)', 1.5, 2); }
      if (C.hover) {
        const p = planSkill(hu, s, C.hover[0], C.hover[1]);
        if (p) {
          for (const [x, y] of p.tiles) fillTile(x, y, 'rgba(255,90,60,0.4)');
          if (p.land) strokeTile(p.land[0], p.land[1], '#9fe0ff', 3, 4);
          strokeTile(C.hover[0], C.hover[1], '#ffd166', 3, 2);
          const dm = displayDmg(hu.hero, s);
          if (dm > 0) for (const o of p.hits) {
            let d = dm; if (o.team === 'hero') d = Math.round(s.dmg * 0.5);
            else { if (s.exec && o.hp < o.maxHp * 0.5) d = d * (1 + s.exec); d = o.team === 'enemy' ? realDmg(o, d, true) : Math.round(d); }
            const lethal = o.team !== 'hero' && d >= o.hp;
            label(o.x, o.y, o.team === 'hero' ? `−${d}%` : (lethal ? `−${d} ✝` : `−${d}`), lethal ? '#ffd166' : '#ff8a8a', true);
          }
        }
      }
    } else if (hu.hasMove) {
      const m = heroMoveTiles(hu);
      for (const n of m.values()) { if (n.d === 0) continue; fillTile(n.x, n.y, 'rgba(90,170,255,0.22)'); strokeTile(n.x, n.y, 'rgba(130,195,255,0.55)', 1.5, 3); }
      if (C.hover) {
        const n = m.get(key(C.hover[0], C.hover[1]));
        if (n && n.d > 0) {
          const path = pathTo(m, n.x, n.y);
          ctx.strokeStyle = 'rgba(170,220,255,0.95)'; ctx.lineWidth = 4; ctx.setLineDash([7, 6]); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(px(hu.x), py(hu.y)); for (const [x, y] of path) ctx.lineTo(px(x), py(y)); ctx.stroke(); ctx.setLineDash([]);
          strokeTile(n.x, n.y, '#9fe0ff', 3, 3);
        }
      }
    }
    if (C.hover && C.mode !== 'skill') strokeTile(C.hover[0], C.hover[1], 'rgba(255,255,255,0.45)', 2, 1);
  }

  /* ---------- icônes vectorielles (badges) ---------- */
  const BADGE_PATHS = {
    shield: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z', arrow: 'M4 20L20 4 M20 4h-7 M20 4v7', spear: 'M3 21L21 3 M21 3l-6 1 M21 3l-1 6',
    target: 'M12 3v5 M12 16v5 M3 12h5 M16 12h5 M12 8a4 4 0 1 0 0.01 0', bomb: 'M11 9a6 6 0 1 0 0.01 0 M15 8l3-3', plus: 'M12 5v14 M5 12h14',
    ghost: 'M5 20V10a7 7 0 0 1 14 0v10l-3-2-2 2-2-2-2 2-2-2z', split: 'M6 6l12 12 M18 6L6 18', link: 'M9 12h6 M8 8a4 4 0 0 0 0 8 M16 8a4 4 0 0 1 0 8',
    wind: 'M3 8h12a3 3 0 1 0-3-3 M3 16h15a3 3 0 1 1-3 3', hook: 'M12 3v10a4 4 0 1 1-4-4', wall: 'M3 6h18v12H3z M3 12h18 M9 6v6 M15 12v6',
    skull: 'M12 3a7 7 0 0 0-5 12v4h10v-4a7 7 0 0 0-5-12z M9 11h.01 M15 11h.01', coin: 'M12 3a9 9 0 1 0 0.01 0 M12 7v10 M9 9h5a2 2 0 0 1 0 4h-4a2 2 0 0 0 0 4h5',
    swap: 'M4 8h15l-4-4 M20 16H5l4 4', push: 'M4 12h14 M13 6l6 6-6 6', anchor: 'M12 4v16 M5 13a7 7 0 0 0 14 0 M8 7h8', revive: 'M20 12a8 8 0 1 1-3-6.2 M20 4v5h-5',
    gem: 'M12 3l7 7-7 11-7-11z', up: 'M12 20V5 M6 11l6-6 6 6', snow: 'M12 2v20 M3 7l18 10 M21 7L3 17', fire: 'M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 3-7 1 2 2 3 3 3 0-3-1-5 0-7z',
    bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', pick: 'M4 20L14 10 M9 5c4-2 8-1 11 2-3-1-6-1-8 1z', flag: 'M5 21V3 M5 4h12l-3 4 3 4H5', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 10a2 2 0 1 0 0.01 0', drop: 'M12 3c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z', crown: 'M3 18h18 M4 18l-1-10 5 4 4-7 4 7 5-4-1 10', spikes: 'M3 20l3-8 3 8 3-8 3 8 3-8 3 8', sprout: 'M3 20l3-8 3 8 3-8 3 8 3-8 3 8', mirror: 'M12 3v18 M5 8l4 4-4 4 M19 8l-4 4 4 4', run: 'M4 6l6 6-6 6 M12 6l6 6-6 6', star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  };
  const P2D = {};
  function badge(name, X, Y, s, color, bg) {
    const d = BADGE_PATHS[name]; if (!d) return;
    const p = P2D[name] || (P2D[name] = new Path2D(d));
    ctx.save();
    ctx.fillStyle = bg || 'rgba(8,8,14,0.9)'; ctx.beginPath(); ctx.arc(X, Y, s * 0.62, 0, 7); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.translate(X - s * 0.38, Y - s * 0.38); ctx.scale(s * 0.76 / 24, s * 0.76 / 24);
    ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(p);
    ctx.restore();
  }
  const KIND_BADGE = {
    archer: 'arrow', reine: 'arrow', hydre: 'arrow', reflet: 'swap', lancier: 'spear', artilleur: 'target', kamikaze: 'bomb',
    chaman: 'plus', invocateur: 'plus', miroitier: 'swap', spectre: 'ghost', golem: 'anchor', totem: 'shield', carapace: 'shield',
    scissipare: 'split', jumeau: 'link', souffleur: 'wind', grappineur: 'hook', tisseur: 'wall', charognard: 'skull', voleur: 'coin',
    sapeur: 'pick', etendard: 'flag', sentinelle: 'eye', geolier: 'link',
    brute: 'push', ombre: 'swap', eveille: 'up', enrage: 'bolt', gardien: 'snow', semeur: 'sprout', pyromane: 'fire', martyr: 'plus', miroir: 'mirror', coureur: 'run', oracle: 'target', colosse: 'anchor', forgeron: 'bomb',
  };

  /* ---------- unités ---------- */
  function drawUnits(t) {
    for (const u of C.units) {
      if (u.dead || u.kind !== 'jumeau' || !u.twin) continue;
      const o = C.units.find(x => x.uid === u.twin && !x.dead); if (!o || o.uid < u.uid) continue;
      ctx.strokeStyle = 'rgba(255,154,213,0.6)'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(px(u.rx), py(u.ry)); ctx.lineTo(px(o.rx), py(o.ry)); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const u of C.units) {
      if (u.dead || u.kind !== 'totem') continue;
      ctx.strokeStyle = 'rgba(217,181,90,0.6)'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]);
      const X = Math.max(ox, ox + (u.x - 1) * ts) + 3, Y = Math.max(oy, oy + (u.y - 1) * ts) + 3;
      const X2 = Math.min(ox + GRID_W * ts, ox + (u.x + 2) * ts) - 3, Y2 = Math.min(oy + GRID_H * ts, oy + (u.y + 2) * ts) - 3;
      ctx.strokeRect(X, Y, X2 - X, Y2 - Y); ctx.setLineDash([]);
    }
    for (const u of C.units) {
      if (u.dead || u.kind !== 'gardien') continue;
      const X = Math.max(ox, ox + (u.x - 2) * ts) + 3, Y = Math.max(oy, oy + (u.y - 2) * ts) + 3;
      const X2 = Math.min(ox + GRID_W * ts, ox + (u.x + 3) * ts) - 3, Y2 = Math.min(oy + GRID_H * ts, oy + (u.y + 3) * ts) - 3;
      ctx.fillStyle = 'rgba(159,224,255,0.07)'; ctx.fillRect(X, Y, X2 - X, Y2 - Y);
      ctx.strokeStyle = 'rgba(159,224,255,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.strokeRect(X, Y, X2 - X, Y2 - Y); ctx.setLineDash([]);
    }
    for (const u of C.units) { // porte-étendard : zone de +30 %
      if (u.dead || u.kind !== 'etendard') continue;
      const X = Math.max(ox, ox + (u.x - 2) * ts) + 3, Y = Math.max(oy, oy + (u.y - 2) * ts) + 3;
      const X2 = Math.min(ox + GRID_W * ts, ox + (u.x + 3) * ts) - 3, Y2 = Math.min(oy + GRID_H * ts, oy + (u.y + 3) * ts) - 3;
      ctx.fillStyle = 'rgba(224,184,74,0.06)'; ctx.fillRect(X, Y, X2 - X, Y2 - Y);
      ctx.strokeStyle = 'rgba(224,184,74,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([8, 5]); ctx.strokeRect(X, Y, X2 - X, Y2 - Y); ctx.setLineDash([]);
    }
    for (const u of C.units) { // sentinelle : lignes de guet
      if (u.dead || u.kind !== 'sentinelle' || C.demo && !C.units.length) continue;
      const p = 0.5 + 0.5 * Math.sin(t / 300);
      for (const [x, y] of watchTiles(u)) { ctx.fillStyle = `rgba(255,143,107,${0.06 + 0.05 * p})`; ctx.fillRect(ox + x * ts + 2, oy + y * ts + 2, ts - 4, ts - 4); }
      ctx.strokeStyle = `rgba(255,143,107,${0.35 + 0.25 * p})`; ctx.lineWidth = 2; ctx.setLineDash([3, 6]);
      for (const [dx, dy] of DIR4) { const ws = watchTiles(u).filter(([x, y]) => Math.sign(x - u.x) === dx && Math.sign(y - u.y) === dy); if (!ws.length) continue; const [ex, ey] = ws[ws.length - 1]; ctx.beginPath(); ctx.moveTo(px(u.x), py(u.y)); ctx.lineTo(px(ex), py(ey)); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    for (const u of C.units) { // chaînes du Geôlier
      if (u.dead || u.team !== 'hero' || !(u.chain > 0)) continue;
      const b = C.units.find(o => o.uid === u.chainBy && !o.dead) || C.units.find(o => !o.dead && o.kind === 'geolier');
      if (!b) continue;
      const x1 = px(b.rx), y1 = py(b.ry), x2 = px(u.rx), y2 = py(u.ry), n = Math.max(4, Math.round(Math.hypot(x2 - x1, y2 - y1) / (ts * 0.22)));
      ctx.strokeStyle = 'rgba(207,214,234,0.85)'; ctx.lineWidth = 2.5;
      for (let i = 0; i < n; i++) { const k = (i + 0.5) / n, cx = x1 + (x2 - x1) * k, cy = y1 + (y2 - y1) * k + Math.sin(k * Math.PI) * ts * 0.25; ctx.beginPath(); ctx.ellipse(cx, cy, ts * 0.07, ts * 0.045, Math.atan2(y2 - y1, x2 - x1) + (i % 2 ? 1.57 : 0), 0, 7); ctx.stroke(); }
    }
    const list = C.units.filter(u => !u.dead || (u.falling && t - u.falling < 400)).sort((a, b) => a.ry - b.ry);
    for (const u of list) drawUnit(u, t);
    // barres de PV et pastilles : par-dessus tout, dans la case
    for (const u of list) if (!u.dead) drawUnitHud(u, t);
  }
  function shapePath(shape, cx, cy, r) {
    ctx.beginPath();
    switch (shape) {
      case 'square': rr(cx - r, cy - r, r * 2, r * 2, r * 0.3); break;
      case 'triangle': ctx.moveTo(cx, cy - r * 1.1); ctx.lineTo(cx + r * 1.05, cy + r * 0.8); ctx.lineTo(cx - r * 1.05, cy + r * 0.8); ctx.closePath(); break;
      case 'diamond': ctx.moveTo(cx, cy - r * 1.15); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r * 1.15); ctx.lineTo(cx - r, cy); ctx.closePath(); break;
      case 'spear': ctx.moveTo(cx, cy - r * 1.2); ctx.lineTo(cx + r * 0.75, cy - r * 0.1); ctx.lineTo(cx + r * 0.75, cy + r * 0.9); ctx.lineTo(cx - r * 0.75, cy + r * 0.9); ctx.lineTo(cx - r * 0.75, cy - r * 0.1); ctx.closePath(); break;
      case 'hex': for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const X = cx + Math.cos(a) * r * 1.05, Y = cy + Math.sin(a) * r * 1.05; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.closePath(); break;
      case 'blob': for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2, rad = r * (1 + 0.12 * Math.sin(a * 5 + performance.now() / 200)); const X = cx + Math.cos(a) * rad, Y = cy + Math.sin(a) * rad; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.closePath(); break;
      case 'ghost': ctx.arc(cx, cy - r * 0.15, r, Math.PI, 0); ctx.lineTo(cx + r, cy + r * 0.85); for (let i = 0; i < 4; i++) ctx.lineTo(cx + r - (i + 0.5) * r / 2, cy + r * (i % 2 ? 0.85 : 0.55)); ctx.lineTo(cx - r, cy + r * 0.85); ctx.closePath(); break;
      case 'totem': rr(cx - r * 0.75, cy - r * 1.1, r * 1.5, r * 2.2, r * 0.3); break;
      case 'shell': ctx.moveTo(cx - r * 1.1, cy + r * 0.55); ctx.quadraticCurveTo(cx - r * 1.1, cy - r * 1.2, cx, cy - r * 1.05); ctx.quadraticCurveTo(cx + r * 1.1, cy - r * 1.2, cx + r * 1.1, cy + r * 0.55); ctx.closePath(); break;
      case 'gem': ctx.moveTo(cx, cy - r * 1.15); ctx.lineTo(cx + r * 0.8, cy - r * 0.2); ctx.lineTo(cx, cy + r * 1.1); ctx.lineTo(cx - r * 0.8, cy - r * 0.2); ctx.closePath(); break;
      default: ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
  }
  function unitShape(u) { return u.team === 'hero' ? 'circle' : u.kind === 'cristal' ? 'gem' : u.kind === 'orbe' ? 'circle' : u.team === 'obj' ? 'square' : (u.boss ? BOSSES[u.kind].shape : ENEMIES[u.kind].shape); }
  function drawUnit(u, t) {
    let cx = px(u.rx + u.ox), cy = py(u.ry + u.oy);
    let sc = u.scale || 1;
    if (u.falling) { const k = Math.min(1, (t - u.falling) / 400); sc *= 1 - k; }
    let jump = 0;
    if (u.jump && t - u.jump < 280) { const k = (t - u.jump) / 280; jump = Math.sin(k * Math.PI) * ts * 0.5; }
    if (u.alpha < 1) { u.alpha = Math.min(1, u.alpha + 0.04); }
    ctx.save(); ctx.globalAlpha = Math.max(0, u.alpha);
    const big = u.boss ? 1.22 : (u.piece ? 0.78 : 1);
    const r = ts * 0.3 * sc * big;
    // ombre portée
    ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(px(u.rx + u.ox), py(u.ry + u.oy) + ts * 0.27, r * (0.95 - jump / ts * 0.3), r * 0.33, 0, 0, 7); ctx.fill();
    const bob = Math.sin(t / 350 + u.uid) * ts * 0.02;
    cy += bob - ts * 0.05 - jump;
    // écrasement / étirement au mouvement et aux coups
    const sq = 1 + (u.spd || 0) * 0.12 + u.flash * 0.12;
    ctx.translate(cx, cy); ctx.scale(1 / Math.sqrt(sq), sq); ctx.translate(-cx, -cy);
    if (u.team === 'hero') drawHero(u, cx, cy, r, t);
    else if (u.kind === 'cristal') drawCrystal(u, cx, cy, r, t);
    else if (u.kind === 'coffre') drawChest(cx, cy, r, t);
    else if (u.kind === 'orbe') drawOrb(u, cx, cy, r, t);
    else if (u.team === 'obj') drawBarrel(cx, cy, r);
    else drawEnemy(u, cx, cy, r, t);
    if (u.flash > 0) { ctx.globalAlpha = u.flash * 0.75; ctx.fillStyle = '#fff'; shapePath(unitShape(u), cx, cy, r); ctx.fill(); ctx.globalAlpha = Math.max(0, u.alpha); }
    if (u.shield > 0) { ctx.strokeStyle = 'rgba(160,225,255,0.95)'; ctx.lineWidth = 3; ctx.shadowColor = '#9fe0ff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(cx, cy, r * 1.3, 0, 7); ctx.stroke(); if (u.shield > 1) { ctx.beginPath(); ctx.arc(cx, cy, r * 1.45, 0, 7); ctx.stroke(); } ctx.shadowBlur = 0; }
    if (u.stun > 0) { for (let i = 0; i < 3; i++) { const a = t / 300 + i * 2.1; star(cx + Math.cos(a) * r * 0.9, cy - r * 1.05 + Math.sin(a) * r * 0.22, ts * 0.065, '#9fe0ff'); } }
    if (C.acting === u.uid) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(cx, cy, r * 1.4, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
  }
  /* PV, %, badges : dans la case de l'unité, jamais au-dessus du plateau */
  function drawUnitHud(u, t) {
    const X = ox + u.rx * ts, Y = oy + u.ry * ts;
    if (u.team === 'hero') {
      const h = S.heroes[u.hero], pct = Math.round(h.pct);
      const col = pct <= FLOOR_PCT ? '#ff5a5a' : pct < 60 ? '#ffb347' : '#ffffff';
      ctx.font = font('900', 0.24); ctx.textAlign = 'center';
      const w = ctx.measureText(pct + '%').width + 10, hh = ts * 0.28;
      const bx = X + ts / 2 - w / 2, by = Y + ts - hh - 2;
      ctx.fillStyle = 'rgba(8,8,14,0.9)'; rr(bx, by, w, hh, hh / 2); ctx.fill();
      ctx.strokeStyle = hexA(HEROES[h.key].color, 0.9); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = col; ctx.fillText(pct + '%', X + ts / 2, by + hh * 0.78);
      if (C.phase === 'hero' && !C.busy) {
        for (let i = 0; i < Math.max(0, u.actions); i++) badge('star', X + ts * 0.15 + i * ts * 0.22, Y + ts * 0.15, ts * 0.22, '#ffd166');
        if (u.hasMove) badge('push', X + ts * 0.85, Y + ts * 0.15, ts * 0.22, '#7cc4ff');
      }
      if (u.chain > 0) badge('link', X + ts * 0.85, Y + ts * 0.42, ts * 0.24, '#cfd6ea');
      return;
    }
    if (u.team === 'obj' && !['cristal', 'coffre', 'orbe'].includes(u.kind)) return;
    // barre de PV en haut de la case
    const bw = ts - 10, bh = Math.max(5, ts * 0.085), bx = X + 5, by = Y + 4;
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; rr(bx - 1, by - 1, bw + 2, bh + 2, 3); ctx.fill();
    const k = Math.max(0, u.hp / u.maxHp);
    ctx.fillStyle = u.boss || u.kind === 'coffre' ? '#ffd166' : u.kind === 'cristal' ? '#d68bff' : u.kind === 'orbe' ? ORBS[u.orb].color : k < 0.34 ? '#ff7a3a' : '#ff4d5a';
    rr(bx, by, bw * k, bh, 2); ctx.fill();
    // nombre de PV dans une pastille (coin haut-droit)
    badgeText(X + ts - 3, by + bh + 2, String(Math.max(0, Math.ceil(u.hp))), u.boss ? '#ffd166' : '#ffffff', 'tr');
    // capacité spéciale (coin bas-droit)
    const b = KIND_BADGE[u.kind];
    if (b) badge(b, X + ts * 0.84, Y + ts * 0.82, ts * 0.26, u.boss ? '#ffd166' : '#e8ecf6');
    const mods = u.mods || [];
    if (mods.length) mods.forEach((m, i) => badge(MODS[m].icon, X + ts * (0.16 + i * 0.23), Y + ts * 0.84, ts * 0.22, MODS[m].color, 'rgba(40,30,8,0.92)'));
    else if (u.elite) badge('star', X + ts * 0.16, Y + ts * 0.82, ts * 0.24, '#ffd166');
    if (u.reviving) badge('revive', X + ts * 0.16, Y + ts * 0.32, ts * 0.26, '#ff9ad5');
    if (u.poison) badge('plus', X + ts * 0.16, Y + ts * 0.58, ts * 0.2, '#9dff6b', 'rgba(20,40,10,0.9)');
  }
  function star(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rad = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } ctx.closePath(); ctx.fill(); }
  function eyes(cx, cy, r, look, angry) {
    const ex = r * 0.32, ey = -r * 0.1, er = r * 0.18;
    const blink = Math.sin(performance.now() / 1700 + cx) > 0.985 ? 0.15 : 1;
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx + s * ex, cy + ey, er, er * 1.15 * blink, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx + s * ex + look[0] * er * 0.45, cy + ey + look[1] * er * 0.45, er * 0.55 * Math.max(0.3, blink), 0, 7); ctx.fill();
      if (angry) { ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.beginPath(); ctx.moveTo(cx + s * ex - er * 1.1, cy + ey - er * 1.6); ctx.lineTo(cx + s * ex + er * 1.1, cy + ey - er * 1.6 + s * er * 0.6); ctx.stroke(); }
    }
  }
  function lookDir(u) {
    let best = null, bd = 99;
    const pool = u.team === 'hero' ? enemies() : heroUnits();
    for (const o of pool) { const d = man(o.x, o.y, u.x, u.y); if (d < bd) { bd = d; best = o; } }
    if (!best) return [0, 0];
    const dx = best.rx - u.rx, dy = best.ry - u.ry, l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l];
  }
  function drawHero(u, cx, cy, r, t) {
    const h = S.heroes[u.hero], H = HEROES[h.key];
    const sel = C.sel === u.hero && C.phase === 'hero';
    if (sel) {
      ctx.save(); ctx.shadowColor = H.color; ctx.shadowBlur = 14;
      ctx.strokeStyle = hexA(H.color, 0.6 + 0.35 * Math.sin(t / 200)); ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.ellipse(cx, py(u.ry + u.oy) + ts * 0.27, r * 1.25, r * 0.45, 0, 0, 7); ctx.stroke(); ctx.restore();
    }
    ctx.save(); ctx.shadowColor = H.color; ctx.shadowBlur = sel ? 16 : 6;
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
    g.addColorStop(0, shade(H.color, 0.5)); g.addColorStop(0.6, H.color); g.addColorStop(1, shade(H.color, -0.4));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy - r * 0.5, r * 0.32, r * 0.16, -0.5, 0, 7); ctx.fill();
    heroEmblem(h.key, cx, cy + r * 0.4, r * 0.42);
    eyes(cx, cy - r * 0.12, r * 0.85, lookDir(u), false);
    if (C.phase === 'hero' && u.actions <= 0 && !u.hasMove) { ctx.fillStyle = 'rgba(10,10,20,0.5)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); }
  }
  function heroEmblem(k, cx, cy, s) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(1.5, s * 0.24); ctx.lineCap = 'round';
    ctx.beginPath();
    if (k === 'brann') { ctx.moveTo(cx - s, cy - s * 0.3); ctx.lineTo(cx, cy + s * 0.5); ctx.lineTo(cx + s, cy - s * 0.3); }
    else if (k === 'lyse') { ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy); ctx.moveTo(cx + s * 0.5, cy - s * 0.4); ctx.lineTo(cx + s, cy); ctx.lineTo(cx + s * 0.5, cy + s * 0.4); }
    else if (k === 'kael') { ctx.moveTo(cx - s, cy + s * 0.4); ctx.lineTo(cx + s, cy - s * 0.4); }
    else { ctx.moveTo(cx, cy - s * 0.5); ctx.lineTo(cx, cy + s * 0.5); ctx.moveTo(cx - s * 0.5, cy); ctx.lineTo(cx + s * 0.5, cy); }
    ctx.stroke(); ctx.lineCap = 'butt';
  }
  function drawBarrel(cx, cy, r) {
    const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0); g.addColorStop(0, '#5a3418'); g.addColorStop(0.5, '#9a5e2c'); g.addColorStop(1, '#5a3418');
    ctx.fillStyle = g; rr(cx - r * 0.75, cy - r * 0.9, r * 1.5, r * 1.8, r * 0.35); ctx.fill();
    ctx.fillStyle = '#c0392b'; ctx.fillRect(cx - r * 0.75, cy - r * 0.15, r * 1.5, r * 0.3);
    ctx.strokeStyle = '#2d1a0b'; ctx.lineWidth = 2; rr(cx - r * 0.75, cy - r * 0.9, r * 1.5, r * 1.8, r * 0.35); ctx.stroke();
    badge('bomb', cx, cy - r * 0.45, r * 0.75, '#ffd166', 'rgba(0,0,0,0)');
  }
  function drawChest(cx, cy, r, t) {
    const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r); g.addColorStop(0, '#c98a3a'); g.addColorStop(1, '#6a3e14');
    ctx.fillStyle = g; rr(cx - r, cy - r * 0.55, r * 2, r * 1.4, r * 0.25); ctx.fill();
    ctx.fillStyle = '#e0a84a'; rr(cx - r, cy - r * 0.85, r * 2, r * 0.5, r * 0.25); ctx.fill();
    ctx.strokeStyle = '#3a2008'; ctx.lineWidth = 2; rr(cx - r, cy - r * 0.85, r * 2, r * 1.7, r * 0.25); ctx.stroke();
    ctx.fillStyle = '#ffd166'; ctx.fillRect(cx - r * 0.18, cy - r * 0.45, r * 0.36, r * 0.4);
    const p = 0.5 + 0.5 * Math.sin(t / 250);
    ctx.fillStyle = `rgba(255,230,120,${0.5 + 0.5 * p})`; star(cx + r * 0.75, cy - r * 0.95, r * 0.22, ctx.fillStyle);
  }
  function drawOrb(u, cx, cy, r, t) {
    const O = ORBS[u.orb] || ORBS.fureur, p = 0.5 + 0.5 * Math.sin(t / 220 + u.uid);
    ctx.save(); ctx.shadowColor = O.color; ctx.shadowBlur = 18 + 10 * p;
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 1.05);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, O.color); g.addColorStop(1, shade(O.color, -0.55));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 0.9, 0, 7); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r * (1 + 0.15 * p), 0, 7); ctx.stroke();
    const ic = { fureur: 'bolt', portee: 'target', soin: 'plus', egide: 'shield' }[u.orb] || 'star';
    badge(ic, cx, cy, r * 0.9, '#ffffff', 'rgba(0,0,0,0.25)');
  }
  function drawCrystal(u, cx, cy, r, t) {
    const p = 0.5 + 0.5 * Math.sin(t / 300 + u.uid);
    ctx.save(); ctx.shadowColor = '#d68bff'; ctx.shadowBlur = 16 + 10 * p;
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, '#f3dcff'); g.addColorStop(0.5, '#b56cff'); g.addColorStop(1, '#5a2a9a');
    ctx.fillStyle = g; shapePath('gem', cx, cy, r * 1.05); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; shapePath('gem', cx, cy, r * 1.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.8, cy - r * 0.2); ctx.lineTo(cx + r * 0.8, cy - r * 0.2); ctx.moveTo(cx, cy - r * 1.15); ctx.lineTo(cx, cy + r * 1.1); ctx.stroke();
  }
  function drawEnemy(u, cx, cy, r, t) {
    const D = u.boss ? BOSSES[u.kind] : ENEMIES[u.kind];
    const col = u.kind === 'ombre' ? HEROES[S.heroes[u.mirror].key].color : D.color;
    if (u.boss) { // aura de phase
      const ph = u.phase || 0, p = 0.5 + 0.5 * Math.sin(t / (260 - ph * 60));
      const ga = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * (1.8 + ph * 0.3));
      ga.addColorStop(0, hexA(ph >= 2 ? '#ff4040' : ph >= 1 ? '#ff9a3a' : '#ffd166', 0.35 + 0.2 * p)); ga.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ga; ctx.beginPath(); ctx.arc(cx, cy, r * (1.8 + ph * 0.3), 0, 7); ctx.fill();
    }
    if (ritualOn() && u.team === 'enemy') { ctx.strokeStyle = hexA('#d68bff', 0.5 + 0.3 * Math.sin(t / 250)); ctx.lineWidth = 2; shapePath(D.shape, cx, cy, r * 1.25); ctx.stroke(); }
    if (u.elite || u.boss) { ctx.strokeStyle = u.boss ? '#ffd166' : 'rgba(255,209,102,0.9)'; ctx.lineWidth = 3; shapePath(D.shape, cx, cy, r * 1.16); ctx.stroke(); }
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r * 1.2);
    if (u.kind === 'ombre') { g.addColorStop(0, shade(col, 0.05)); g.addColorStop(1, shade(col, -0.75)); ctx.shadowColor = col; ctx.shadowBlur = 10; }
    else { g.addColorStop(0, shade(col, 0.4)); g.addColorStop(0.6, col); g.addColorStop(1, shade(col, -0.5)); }
    ctx.fillStyle = g; shapePath(D.shape, cx, cy, r); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.3, cy - r * 0.5, r * 0.3, r * 0.14, -0.5, 0, 7); ctx.fill();
    eyes(cx, cy, r * 0.9, lookDir(u), true);
    accessory(u, cx, cy, r, t);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = Math.max(1.5, r * 0.08);
    if (u.kind === 'kamikaze') { ctx.strokeStyle = '#ffd166'; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.3, cy - r * 1.35); ctx.stroke(); if (u.armed && Math.sin(t / 70) > 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + r * 0.3, cy - r * 1.35, r * 0.2, 0, 7); ctx.fill(); } }
    if (u.kind === 'ombre') { ctx.strokeStyle = shade(col, 0.5); ctx.lineWidth = 2.5; shapePath('ghost', cx, cy, r); ctx.stroke(); }
    if (u.kind === 'totem') { ctx.beginPath(); ctx.moveTo(cx - r * 0.75, cy + r * 0.35); ctx.lineTo(cx + r * 0.75, cy + r * 0.35); ctx.moveTo(cx - r * 0.75, cy - r * 0.45); ctx.lineTo(cx + r * 0.75, cy - r * 0.45); ctx.stroke(); }
    if (u.kind === 'carapace') { ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.9); ctx.lineTo(cx - r * 0.3, cy + r * 0.5); ctx.moveTo(cx + r * 0.5, cy - r * 0.9); ctx.lineTo(cx + r * 0.3, cy + r * 0.5); ctx.stroke(); }
    if (u.boss) {
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); const Y = cy - r * 1.0;
      ctx.moveTo(cx - r * 0.5, Y); ctx.lineTo(cx - r * 0.5, Y - r * 0.38); ctx.lineTo(cx - r * 0.25, Y - r * 0.16); ctx.lineTo(cx, Y - r * 0.48); ctx.lineTo(cx + r * 0.25, Y - r * 0.16); ctx.lineTo(cx + r * 0.5, Y - r * 0.38); ctx.lineTo(cx + r * 0.5, Y); ctx.closePath(); ctx.fill();
    }
  }

  /* détails propres à chaque ennemi et boss, dessinés par-dessus le corps */
  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function accessory(u, cx, cy, r, t) {
    const k = u.kind, lw = Math.max(1.5, r * 0.11);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (k) {
      case 'rodeur': ctx.fillStyle = '#f2f2f2'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * r * 0.18, cy + r * 0.42); ctx.lineTo(cx + s * r * 0.08, cy + r * 0.62); ctx.lineTo(cx + s * r * 0.3, cy + r * 0.45); ctx.fill(); } break;
      case 'archer': ctx.strokeStyle = '#d29a5a'; ctx.lineWidth = lw * 1.5; ctx.beginPath(); ctx.arc(cx + r * 0.75, cy + r * 0.1, r * 0.62, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; line(cx + r * 0.75 + Math.cos(-1.2) * r * 0.62, cy + r * 0.1 + Math.sin(-1.2) * r * 0.62, cx + r * 0.75 + Math.cos(1.2) * r * 0.62, cy + r * 0.1 + Math.sin(1.2) * r * 0.62); break;
      case 'brute': ctx.fillStyle = '#efe3c8'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * r * 0.55, cy - r * 0.75); ctx.quadraticCurveTo(cx + s * r * 1.2, cy - r * 0.7, cx + s * r * 1.35, cy - r * 1.05); ctx.quadraticCurveTo(cx + s * r * 0.95, cy - r * 0.95, cx + s * r * 0.35, cy - r * 0.95); ctx.fill(); } break;
      case 'artilleur': ctx.fillStyle = '#3a3f4f'; ctx.save(); ctx.translate(cx, cy - r * 0.8); ctx.rotate(-0.5); ctx.fillRect(-r * 0.16, -r * 0.6, r * 0.32, r * 0.7); ctx.fillStyle = '#ff7a4a'; ctx.fillRect(-r * 0.16, -r * 0.62, r * 0.32, r * 0.12); ctx.restore(); break;
      case 'chaman': ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = lw; line(cx - r * 1.0, cy + r * 0.9, cx - r * 0.85, cy - r * 1.0); ctx.fillStyle = '#6dffae'; ctx.shadowColor = '#6dffae'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(cx - r * 0.85, cy - r * 1.05, r * 0.17 * (1 + 0.15 * Math.sin(t / 200)), 0, 7); ctx.fill(); break;
      case 'spectre': ctx.globalAlpha *= 0.55; ctx.fillStyle = '#c9d6ff'; for (let i = 0; i < 3; i++) { const a = t / 500 + i * 2.1; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 1.1, cy + r * 0.5 + Math.sin(a * 1.3) * r * 0.2, r * 0.1, 0, 7); ctx.fill(); } break;
      case 'golem': ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = lw * 0.8; line(cx - r * 0.7, cy - r * 0.3, cx - r * 0.3, cy + r * 0.2); line(cx - r * 0.3, cy + r * 0.2, cx - r * 0.45, cy + r * 0.7); line(cx + r * 0.6, cy - r * 0.8, cx + r * 0.35, cy - r * 0.35); ctx.fillStyle = '#6fbf6a'; ctx.beginPath(); ctx.ellipse(cx - r * 0.4, cy - r * 0.95, r * 0.4, r * 0.13, 0, 0, 7); ctx.fill(); break;
      case 'invocateur': ctx.fillStyle = 'rgba(40,10,60,0.7)'; ctx.beginPath(); ctx.moveTo(cx - r * 0.95, cy - r * 0.05); ctx.quadraticCurveTo(cx, cy - r * 1.75, cx + r * 0.95, cy - r * 0.05); ctx.quadraticCurveTo(cx, cy - r * 1.05, cx - r * 0.95, cy - r * 0.05); ctx.fill(); ctx.fillStyle = '#d6a8ff'; for (let i = 0; i < 3; i++) { const a = t / 600 + i * 2.1; star(cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 0.45, r * 0.13, '#d6a8ff'); } break;
      case 'lancier': ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = lw; line(cx + r * 1.05, cy + r * 0.9, cx + r * 1.05, cy - r * 0.8); ctx.fillStyle = '#e8ecf6'; ctx.beginPath(); ctx.moveTo(cx + r * 1.05, cy - r * 1.2); ctx.lineTo(cx + r * 1.25, cy - r * 0.78); ctx.lineTo(cx + r * 0.85, cy - r * 0.78); ctx.fill(); break;
      case 'souffleur': ctx.fillStyle = shade(ENEMIES.souffleur.color, 0.3); for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * r * 0.55, cy + r * 0.25, r * 0.22, 0, 7); ctx.fill(); } ctx.strokeStyle = 'rgba(220,245,255,0.7)'; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const o = ((t / 300 + i / 3) % 1) * r * 0.6; line(cx + r * 1.1 + o, cy - r * 0.3 + i * r * 0.3, cx + r * 1.45 + o, cy - r * 0.3 + i * r * 0.3); } break;
      case 'grappineur': ctx.strokeStyle = '#cfd6ea'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(cx + r * 0.9, cy + r * 0.4); ctx.lineTo(cx + r * 0.9, cy - r * 0.5); ctx.arc(cx + r * 0.62, cy - r * 0.5, r * 0.28, 0, Math.PI, true); ctx.stroke(); break;
      case 'tisseur': ctx.strokeStyle = 'rgba(30,40,30,0.85)'; ctx.lineWidth = lw * 0.8; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const a = -0.5 + i * 0.5; ctx.beginPath(); ctx.moveTo(cx + s * r * 0.7, cy + r * 0.1 * i); ctx.quadraticCurveTo(cx + s * r * 1.25, cy - r * 0.4 + a * r, cx + s * r * 1.35, cy + r * (0.3 + a)); ctx.stroke(); } break;
      case 'charognard': ctx.fillStyle = '#efe3c8'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * r * 0.35, cy + r * 0.35); ctx.lineTo(cx + s * r * 0.55, cy + r * 0.05); ctx.lineTo(cx + s * r * 0.5, cy + r * 0.5); ctx.fill(); } if (u.dmg > ENEMIES.charognard.dmg * 1.3) { ctx.strokeStyle = 'rgba(255,90,90,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r * 1.25, 0, 7); ctx.stroke(); } break;
      case 'eveille': { const g = Math.min(1, (u.bt || 0) / 6); ctx.strokeStyle = `rgba(255,170,90,${0.25 + 0.5 * g})`; ctx.lineWidth = 2 + 3 * g; ctx.beginPath(); ctx.arc(cx, cy, r * (1.2 + 0.1 * Math.sin(t / 150)), 0, 7); ctx.stroke(); break; }
      case 'enrage': ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 2; i++) { const o = ((t / 700 + i * 0.5) % 1); ctx.globalAlpha = 0.6 * (1 - o); ctx.beginPath(); ctx.arc(cx + (i ? r * 0.6 : -r * 0.6), cy - r * (1.0 + o * 0.8), r * (0.15 + o * 0.15), 0, 7); ctx.fill(); } break;
      case 'gardien': ctx.fillStyle = '#e6f8ff'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t / 1200; ctx.save(); ctx.translate(cx + Math.cos(a) * r * 1.2, cy + Math.sin(a) * r * 1.2); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(r * 0.08, 0); ctx.lineTo(0, r * 0.2); ctx.lineTo(-r * 0.08, 0); ctx.fill(); ctx.restore(); } break;
      case 'semeur': ctx.fillStyle = '#7fd05a'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * r * 0.3, cy - r * 0.98, r * 0.3, r * 0.12, s * 0.6, 0, 7); ctx.fill(); } ctx.strokeStyle = '#4f8a3a'; ctx.lineWidth = 2; line(cx, cy - r * 0.8, cx, cy - r * 1.02); break;
      case 'pyromane': { const f = 0.8 + 0.2 * Math.sin(t / 90); ctx.fillStyle = '#ffb347'; ctx.shadowColor = '#ff7a2a'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r * 0.9); ctx.quadraticCurveTo(cx - r * 0.2, cy - r * 1.15 * f, cx, cy - r * 1.3 * f); ctx.quadraticCurveTo(cx + r * 0.2, cy - r * 1.05 * f, cx + r * 0.3, cy - r * 0.9); ctx.fill(); break; }
      case 'martyr': ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 2.5; ctx.shadowColor = '#ffe9a0'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.ellipse(cx, cy - r * 1.05, r * 0.55, r * 0.15, 0, 0, 7); ctx.stroke(); break;
      case 'miroir': { const o = ((t / 1400) % 1); ctx.save(); shapePath('diamond', cx, cy, r); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = r * 0.25; line(cx - r * 1.5 + o * r * 3, cy - r * 1.2, cx - r * 0.9 + o * r * 3, cy + r * 1.2); ctx.restore(); break; }
      case 'coureur': ctx.strokeStyle = 'rgba(255,230,140,0.6)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) line(cx - r * (1.2 + i * 0.12), cy - r * 0.4 + i * r * 0.4, cx - r * (1.65 + i * 0.12), cy - r * 0.4 + i * r * 0.4); break;
      case 'voleur': ctx.fillStyle = 'rgba(20,20,30,0.85)'; ctx.fillRect(cx - r * 0.85, cy - r * 0.32, r * 1.7, r * 0.3); ctx.fillStyle = '#c99a4a'; ctx.beginPath(); ctx.arc(cx + r * 0.85, cy + r * 0.6, r * 0.32, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd166'; ctx.font = `900 ${Math.round(r * 0.4)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('$', cx + r * 0.85, cy + r * 0.74); break;
      case 'scissipare': ctx.fillStyle = 'rgba(60,90,20,0.5)'; ctx.beginPath(); ctx.arc(cx - r * 0.25, cy + r * 0.35, r * 0.18, 0, 7); ctx.arc(cx + r * 0.3, cy + r * 0.3, r * 0.14, 0, 7); ctx.fill(); break;
      case 'jumeau': ctx.fillStyle = '#ff6fb8'; ctx.beginPath(); ctx.moveTo(cx, cy - r * 1.0); ctx.lineTo(cx - r * 0.4, cy - r * 1.25); ctx.lineTo(cx - r * 0.4, cy - r * 0.8); ctx.closePath(); ctx.moveTo(cx, cy - r * 1.0); ctx.lineTo(cx + r * 0.4, cy - r * 1.25); ctx.lineTo(cx + r * 0.4, cy - r * 0.8); ctx.closePath(); ctx.fill(); break;
      case 'miroitier': ctx.fillStyle = 'rgba(220,230,255,0.85)'; ctx.save(); ctx.translate(cx + r * 1.0, cy - r * 0.6); ctx.rotate(Math.sin(t / 400) * 0.3); ctx.beginPath(); ctx.moveTo(0, -r * 0.35); ctx.lineTo(r * 0.2, 0); ctx.lineTo(0, r * 0.35); ctx.lineTo(-r * 0.2, 0); ctx.fill(); ctx.restore(); break;
      case 'kamikaze': break;
      case 'sapeur': ctx.fillStyle = '#e8c45a'; ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.95, r * 0.75, r * 0.3, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(cx, cy - r * 1.05, r * 0.12, 0, 7); ctx.fill(); ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = lw; line(cx + r * 0.8, cy + r * 0.8, cx + r * 1.2, cy - r * 0.3); ctx.strokeStyle = '#cfd6ea'; line(cx + r * 0.95, cy - r * 0.45, cx + r * 1.45, cy - r * 0.15); break;
      case 'etendard': { const w = Math.sin(t / 220) * r * 0.12; ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = lw; line(cx - r * 1.1, cy + r * 0.9, cx - r * 1.1, cy - r * 1.15); ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.moveTo(cx - r * 1.1, cy - r * 1.15); ctx.quadraticCurveTo(cx - r * 0.5, cy - r * 1.1 + w, cx - r * 0.05, cy - r * 0.95); ctx.quadraticCurveTo(cx - r * 0.5, cy - r * 0.7 - w, cx - r * 1.1, cy - r * 0.5); ctx.fill(); break; }
      case 'sentinelle': ctx.fillStyle = '#2a2f40'; ctx.beginPath(); ctx.arc(cx, cy - r * 0.15, r * 0.42, 0, 7); ctx.fill(); ctx.fillStyle = `rgba(255,${120 + 60 * Math.sin(t / 200) | 0},90,1)`; ctx.shadowColor = '#ff8f6b'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(cx, cy - r * 0.15, r * 0.2, 0, 7); ctx.fill(); break;
      // boss
      case 'colosse': ctx.fillStyle = 'rgba(80,60,20,0.55)'; for (const s of [-1, 1]) { rr(cx + s * r * 0.95 - r * 0.32, cy - r * 0.55, r * 0.64, r * 0.5, r * 0.15); ctx.fill(); } break;
      case 'reine': ctx.globalAlpha *= 0.7; ctx.fillStyle = 'rgba(255,190,230,0.55)'; for (const s of [-1, 1]) { const f = Math.sin(t / 80) * 0.25; ctx.beginPath(); ctx.ellipse(cx + s * r * 1.1, cy - r * 0.35, r * 0.6, r * 0.28, s * (0.6 + f), 0, 7); ctx.fill(); } break;
      case 'oracle': ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.62, r * 0.22, r * 0.14, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#2aa7ff'; ctx.beginPath(); ctx.arc(cx, cy - r * 0.62, r * 0.09, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(127,214,255,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r * 1.35, t / 700, t / 700 + 4); ctx.stroke(); break;
      case 'forgeron': ctx.save(); ctx.translate(cx + r * 1.05, cy - r * 0.2); ctx.rotate(-0.6 + Math.sin(t / 400) * 0.15); ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-r * 0.08, -r * 0.2, r * 0.16, r * 1.1); ctx.fillStyle = '#5a5f70'; rr(-r * 0.4, -r * 0.55, r * 0.8, r * 0.4, r * 0.08); ctx.fill(); ctx.restore(); break;
      case 'hydre': ctx.fillStyle = '#f2f2f2'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * r * 0.25, cy + r * 0.35); ctx.lineTo(cx + s * r * 0.15, cy + r * 0.7); ctx.lineTo(cx + s * r * 0.4, cy + r * 0.4); ctx.fill(); } break;
      case 'reflet': ctx.fillStyle = 'rgba(220,226,255,0.7)'; for (let i = 0; i < 4; i++) { const a = t / 900 + i * Math.PI / 2; ctx.save(); ctx.translate(cx + Math.cos(a) * r * 1.4, cy + Math.sin(a) * r * 1.0); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(r * 0.1, 0); ctx.lineTo(0, r * 0.2); ctx.lineTo(-r * 0.1, 0); ctx.fill(); ctx.restore(); } break;
      case 'geolier': ctx.strokeStyle = '#cfd6ea'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx + r * 1.05, cy + r * 0.3, r * 0.3, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + r * 1.05, cy + r * 0.3, r * 0.14, 0, 7); ctx.stroke(); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(cx + r * (0.95 - i * 0.05), cy + r * (0.65 + i * 0.22), r * 0.09, r * 0.06, 1.57 * (i % 2), 0, 7); ctx.stroke(); } break;
    }
    ctx.restore();
  }

  /* ---------- prévision du tour ennemi ---------- */
  function drawPreview(t) {
    const pv = C.preview;
    if (!pv || pv.ver !== C.ver || !C.showPreview || C.phase !== 'hero' || C.busy) return;
    const order = enemyOrder();
    ctx.save();
    for (const e of order) {
      const q = pv.pos[e.uid]; if (!q) continue;
      if (q.dead) {
        const X = px(e.rx), Y = py(e.ry), s = ts * 0.2;
        ctx.strokeStyle = 'rgba(255,209,102,0.95)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(X - s, Y - s); ctx.lineTo(X + s, Y + s); ctx.moveTo(X + s, Y - s); ctx.lineTo(X - s, Y + s); ctx.stroke();
        continue;
      }
      if (q.x !== e.x || q.y !== e.y) {
        const D = e.boss ? BOSSES[e.kind] : ENEMIES[e.kind];
        ctx.strokeStyle = hexA(D.color, 0.6); ctx.lineWidth = 2.5; ctx.setLineDash([5, 6]);
        ctx.beginPath(); ctx.moveTo(px(e.rx), py(e.ry)); ctx.lineTo(px(q.x), py(q.y)); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 0.5; ctx.fillStyle = hexA(D.color, 0.4);
        shapePath(D.shape, px(q.x), py(q.y), ts * 0.22); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    for (const s of pv.spawned || []) { ctx.strokeStyle = 'rgba(255,107,107,0.65)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(px(s.x), py(s.y), ts * 0.22, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    for (const a of pv.atks) {
      const X1 = px(a.x), Y1 = py(a.y), X2 = px(a.tx), Y2 = py(a.ty);
      const ang = Math.atan2(Y2 - Y1, X2 - X1), L = Math.hypot(X2 - X1, Y2 - Y1);
      if (L < 1) continue;
      const ex = X1 + Math.cos(ang) * (L - ts * 0.3), ey = Y1 + Math.sin(ang) * (L - ts * 0.3);
      ctx.strokeStyle = 'rgba(255,70,70,0.92)'; ctx.fillStyle = 'rgba(255,70,70,0.92)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.shadowColor = '#ff3030'; ctx.shadowBlur = 6;
      if (a.ranged) ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(X1 + Math.cos(ang) * ts * 0.25, Y1 + Math.sin(ang) * ts * 0.25); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      const h = ts * 0.17; ctx.beginPath(); ctx.moveTo(ex + Math.cos(ang) * h, ey + Math.sin(ang) * h); ctx.lineTo(ex + Math.cos(ang + 2.5) * h, ey + Math.sin(ang + 2.5) * h); ctx.lineTo(ex + Math.cos(ang - 2.5) * h, ey + Math.sin(ang - 2.5) * h); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
    }
    order.forEach((e, i) => {
      const X = ox + e.rx * ts + ts * 0.16, Y = oy + e.ry * ts + ts * 0.36, r2 = Math.max(8, ts * 0.12);
      ctx.fillStyle = 'rgba(10,10,18,0.92)'; ctx.beginPath(); ctx.arc(X, Y, r2, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(r2 * 1.25)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(i + 1, X, Y + r2 * 0.45);
    });
    ctx.restore();
  }

  /* ---------- effets ---------- */
  function drawFx(t) {
    C.fx = C.fx.filter(f => t - f.t0 < f.dur);
    for (const f of C.fx) {
      if (!f.emitted) {
        f.emitted = true;
        if (f.type === 'burst') emit(f.x, f.y, 18, f.color, { speed: 2.4, life: 0.7, size: 0.07, up: 1 });
        else if (f.type === 'boom') { emit(f.x, f.y, 26, f.color, { speed: 3, life: 0.8, size: 0.08, up: 1.5, glow: true }); emit(f.x, f.y, 10, '#555', { speed: 1.2, life: 1, size: 0.1, grav: -0.5 }); C.flash = Math.max(C.flash || 0, 0.35); }
        else if (f.type === 'spark') emit(f.x, f.y, 8, f.color, { speed: 2.5, life: 0.35, size: 0.04, glow: true });
        else if (f.type === 'slash') emit(f.x, f.y, 6, f.color, { speed: 1.8, life: 0.3, size: 0.04 });
      }
      const k = (t - f.t0) / f.dur, X = px(f.x), Y = py(f.y);
      ctx.save();
      switch (f.type) {
        case 'proj': {
          const X2 = px(f.x2), Y2 = py(f.y2);
          const xx = X + (X2 - X) * k, yy = Y + (Y2 - Y) * k - (f.arc ? Math.sin(k * Math.PI) * ts * 0.8 : 0);
          const kb = Math.max(0, k - 0.3);
          const xb = X + (X2 - X) * kb, yb = Y + (Y2 - Y) * kb - (f.arc ? Math.sin(kb * Math.PI) * ts * 0.8 : 0);
          ctx.shadowColor = f.color; ctx.shadowBlur = 12;
          ctx.strokeStyle = f.color; ctx.lineWidth = 4; ctx.globalAlpha = 0.6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(xb, yb); ctx.lineTo(xx, yy); ctx.stroke();
          ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(xx, yy, ts * 0.075, 0, 7); ctx.fill();
          if (Math.random() < 0.6) parts.push({ x: xx, y: yy, vx: 0, vy: 0, g: 0, life: 0.25, max: 0.25, color: f.color, size: ts * 0.05, glow: true });
          break;
        }
        case 'slash': {
          ctx.shadowColor = f.color; ctx.shadowBlur = 10;
          ctx.strokeStyle = f.color; ctx.lineWidth = 6 * (1 - k) + 1.5; ctx.globalAlpha = 1 - k; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(X, Y, ts * (0.26 + 0.22 * k), -2.4 + k, -0.2 + k); ctx.stroke();
          break;
        }
        case 'ring': {
          ctx.shadowColor = f.color; ctx.shadowBlur = 10;
          ctx.strokeStyle = f.color; ctx.lineWidth = 4 * (1 - k) + 1; ctx.globalAlpha = 1 - k;
          ctx.beginPath(); ctx.arc(X, Y, ts * (0.3 + (f.r || 0.8) * k), 0, 7); ctx.stroke();
          break;
        }
        case 'boom': {
          const rad = ts * (0.3 + (f.r || 1) * 1.15 * k);
          const g = ctx.createRadialGradient(X, Y, 0, X, Y, rad);
          g.addColorStop(0, `rgba(255,255,230,${1 - k})`); g.addColorStop(0.35, hexA(f.color, 0.85 * (1 - k))); g.addColorStop(1, hexA(f.color, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, rad, 0, 7); ctx.fill();
          ctx.strokeStyle = hexA('#ffffff', 0.5 * (1 - k)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, rad * 1.05, 0, 7); ctx.stroke();
          break;
        }
        case 'burst': break;
        case 'spark': break;
        case 'bolt': {
          const X2 = px(f.x2), Y2 = py(f.y2);
          ctx.strokeStyle = f.color; ctx.lineWidth = 3.5; ctx.globalAlpha = 1 - k * 0.8; ctx.shadowColor = f.color; ctx.shadowBlur = 16;
          ctx.beginPath(); ctx.moveTo(X, Y);
          for (let i = 1; i < 6; i++) { const q = i / 6; ctx.lineTo(X + (X2 - X) * q + (Math.random() - 0.5) * ts * 0.3, Y + (Y2 - Y) * q + (Math.random() - 0.5) * ts * 0.3); }
          ctx.lineTo(X2, Y2); ctx.stroke();
          break;
        }
        case 'laser': {
          const X2 = px(f.x2), Y2 = py(f.y2);
          ctx.strokeStyle = f.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = ts * 0.45 * (1 - k); ctx.shadowColor = f.color; ctx.shadowBlur = 24;
          ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X2, Y2); ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = ts * 0.14 * (1 - k); ctx.stroke();
          break;
        }
        case 'vortex': {
          ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.globalAlpha = 1 - k; ctx.shadowColor = f.color; ctx.shadowBlur = 10;
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(X, Y, ts * (1.8 - 1.5 * k) * (1 - i * 0.25), k * 8 + i, k * 8 + i + 3.5); ctx.stroke(); }
          break;
        }
      }
      ctx.restore();
    }
  }
  function drawTexts(t) {
    C.texts = C.texts.filter(x => t - x.t0 < 1100);
    const per = {};
    for (const x of C.texts) {
      const k = (t - x.t0) / 1100, kk = x.x + ',' + x.y; const idx = per[kk] = (per[kk] || 0) + 1;
      const pop = k < 0.12 ? 1 + (0.12 - k) * 4 : 1;
      let X = px(x.x), Y = py(x.y) - ts * 0.3 - k * ts * 0.45 - (idx - 1) * ts * 0.26;
      Y = Math.max(oy + ts * 0.25, Y);
      ctx.globalAlpha = 1 - Math.max(0, k - 0.65) / 0.35;
      ctx.font = font('900', (x.big ? 0.36 : 0.27) * pop); ctx.textAlign = 'center';
      const w = ctx.measureText(x.txt).width;
      X = Math.max(ox + w / 2 + 4, Math.min(ox + GRID_W * ts - w / 2 - 4, X));
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(x.txt, X, Y);
      ctx.fillStyle = x.color; ctx.fillText(x.txt, X, Y);
      ctx.globalAlpha = 1;
    }
  }
  function drawPhaseBanner(t) {
    const b = C.pbanner; if (!b) return;
    const age = t - b.t0; if (age > 2200) { C.pbanner = null; return; }
    const k = Math.min(1, age / 250), out = age > 1800 ? 1 - (age - 1800) / 400 : 1;
    ctx.save(); ctx.globalAlpha = k * out;
    const g = ctx.createLinearGradient(0, H / 2 - 70, 0, H / 2 + 70); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, H / 2 - 70, W, 140);
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.min(64, W / 10) * (1 + (1 - k) * 0.4)}px Cinzel, serif`; ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 20;
    ctx.fillText(tr(b.txt), W / 2, H / 2 + 4);
    ctx.shadowBlur = 0; ctx.font = `800 ${Math.min(26, W / 22)}px system-ui`; ctx.fillStyle = '#fff';
    ctx.fillText(`${tr(b.sub)}${b.tip ? ' — ' + tr(b.tip) : ''}`, W / 2, H / 2 + 42);
    ctx.restore();
  }
  /* bandeau discret de début de tour (glisse depuis le haut puis disparaît) */
  function drawTurnBanner(t) {
    const b = C.tban; if (!b || C.banner || C.demo) return;
    const a = (t - b.t0) / 1100; if (a >= 1) return;
    const k = a < 0.2 ? a / 0.2 : a > 0.75 ? (1 - a) / 0.25 : 1, e = 1 - Math.pow(1 - Math.min(1, a / 0.2), 3);
    ctx.save(); ctx.globalAlpha = k;
    ctx.font = `900 ${Math.max(16, Math.min(28, W / 40))}px Cinzel, serif`; ctx.textAlign = 'center';
    const txt = tr(b.txt), w = ctx.measureText(txt).width + 60, h = Math.max(34, Math.min(48, W / 28)), y = 10 + e * 14 - 14;
    const g = ctx.createLinearGradient(W / 2 - w / 2, 0, W / 2 + w / 2, 0);
    g.addColorStop(0, 'rgba(10,12,20,0)'); g.addColorStop(0.2, 'rgba(10,12,20,0.88)'); g.addColorStop(0.8, 'rgba(10,12,20,0.88)'); g.addColorStop(1, 'rgba(10,12,20,0)');
    ctx.fillStyle = g; ctx.fillRect(W / 2 - w / 2, y + 14, w, h);
    ctx.fillStyle = b.color; ctx.fillRect(W / 2 - w * 0.3, y + 14 + h - 2, w * 0.6, 2);
    ctx.shadowColor = b.color; ctx.shadowBlur = 14; ctx.fillStyle = b.color; ctx.fillText(txt, W / 2, y + 14 + h * 0.68);
    ctx.restore();
  }
  function drawBanner(t) {
    if (!C.banner) return;
    const a = (t - C.banner.t0) / 1000, k = Math.min(1, a / 0.3), e = 1 - Math.pow(1 - k, 3);
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.62 * k})`; ctx.fillRect(0, H / 2 - 70 * e, W, 140 * e);
    ctx.fillStyle = hexA(C.banner.color, 0.8 * k); ctx.fillRect(W / 2 - W * 0.35 * e, H / 2 - 70 * e, W * 0.7 * e, 2); ctx.fillRect(W / 2 - W * 0.35 * e, H / 2 + 70 * e - 2, W * 0.7 * e, 2);
    // reflet qui balaie le texte
    ctx.font = `900 ${Math.min(64, W / 12)}px Cinzel, serif`; ctx.textAlign = 'center';
    const sc = 0.85 + 0.15 * e;
    ctx.translate(W / 2, H / 2 + 20); ctx.scale(sc, sc);
    ctx.globalAlpha = k; ctx.fillStyle = C.banner.color; ctx.shadowColor = C.banner.color; ctx.shadowBlur = 28; ctx.fillText(tr(C.banner.txt), 0, 0);
    ctx.shadowBlur = 0;
    const sw = ((a * 0.8) % 1.4 - 0.2) * W * 0.8;
    const gl = ctx.createLinearGradient(sw - 60, 0, sw + 60, 0); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, 'rgba(255,255,255,0.55)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = gl; ctx.fillText(tr(C.banner.txt), 0, 0);
    ctx.restore();
    if (C.banner.color === '#6dffae' || C.banner.color === '#ffd166') { if (!C.banner.conf) { C.banner.conf = 1; for (let i = 0; i < 4; i++) emit(GRID_W / 2 + (i - 1.5) * 1.5, GRID_H / 2, 14, i % 2 ? C.banner.color : '#ffffff', { up: 1 }); } }
  }

  const PORTRAITS = {};
  function portrait(k) {
    if (PORTRAITS[k]) return PORTRAITS[k];
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
    const save = ctx; ctx = c.getContext('2d');
    try {
      const H = HEROES[k], cx = N / 2, cy = N / 2, r = N * 0.38;
      ctx.save(); ctx.shadowColor = H.color; ctx.shadowBlur = N * 0.08;
      const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
      g.addColorStop(0, shade(H.color, 0.5)); g.addColorStop(0.6, H.color); g.addColorStop(1, shade(H.color, -0.4));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = N * 0.035; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy - r * 0.5, r * 0.32, r * 0.16, -0.5, 0, 7); ctx.fill();
      heroEmblem(k, cx, cy + r * 0.4, r * 0.42);
      const ex = r * 0.85 * 0.32, ey = cy - r * 0.12 - r * 0.085, er = r * 0.85 * 0.18;
      for (const s of [-1, 1]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx + s * ex, ey, er, er * 1.15, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx + s * ex + er * 0.2, ey + er * 0.1, er * 0.55, 0, 7); ctx.fill(); }
    } finally { ctx = save; }
    return (PORTRAITS[k] = c.toDataURL());
  }

  return { init, resize, tileAt, tileCenterPx, start, stop, drawDemo, portrait, get ts() { return ts; } };
})();
