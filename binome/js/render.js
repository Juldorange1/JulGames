'use strict';
/* =========================================================
   BINÔME — rendu du plateau (canvas 2D)
   ========================================================= */
const Render = (() => {
  let cv, ctx, W = 0, H = 0, dpr = 1, ts = 64, ox = 0, oy = 0, last = 0, running = false;

  function init(canvas) { cv = canvas; ctx = cv.getContext('2d'); window.addEventListener('resize', resize); resize(); }
  function resize() {
    if (!cv) return;
    const r = cv.parentElement.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(100, r.width); H = Math.max(100, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ts = Math.floor(Math.min((W - 16) / GRID_W, (H - 16) / GRID_H));
    ox = Math.round((W - ts * GRID_W) / 2); oy = Math.round((H - ts * GRID_H) / 2);
  }
  function tileAt(cx, cy) {
    const r = cv.getBoundingClientRect();
    const x = Math.floor((cx - r.left - ox) / ts), y = Math.floor((cy - r.top - oy) / ts);
    return inB(x, y) ? [x, y] : null;
  }
  function tileCenterPx(x, y) { const r = cv.getBoundingClientRect(); return [r.left + ox + (x + 0.5) * ts, r.top + oy + (y + 0.5) * ts]; }
  const px = x => ox + (x + 0.5) * ts, py = y => oy + (y + 0.5) * ts;
  function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + (s || 0) * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
  function stop() { running = false; }
  function loop(t) { if (!running) return; frame(t); requestAnimationFrame(loop); }

  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!C) return;
    // interpolation des positions
    for (const u of C.units) {
      const k = Math.min(1, dt * 16);
      u.rx += (u.x - u.rx) * k; u.ry += (u.y - u.ry) * k;
      u.ox *= Math.pow(0.0005, dt); u.oy *= Math.pow(0.0005, dt);
      if (u.flash > 0) u.flash = Math.max(0, u.flash - dt * 4);
    }
    C.shake *= Math.pow(0.002, dt);
    draw(t);
  }

  function draw(t) {
    const era = eraData(S.depth);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = era.bg; ctx.fillRect(0, 0, W, H);
    const sh = C.shake > 0.3 ? C.shake : 0;
    ctx.save();
    if (sh && !UI.reduceMotion) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    drawTiles(t, era);
    drawOverlays(t);
    drawUnits(t);
    for (const tl of C.telegraphs) {
      const c = tl.center || tl.tiles[Math.floor(tl.tiles.length / 2)];
      if (c) label(c[0], c[1] + 0.72, `${tl.label} −${Math.round(tl.pct * G().taken)}%`, tl.color || '#ff5a5a');
    }
    drawFx(t);
    drawTexts(t);
    ctx.restore();
    drawBanner(t);
  }

  /* ---------- cases ---------- */
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawTiles(t, era) {
    // cadre
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ox - 6, oy - 6, ts * GRID_W + 12, ts * GRID_H + 12, 10); ctx.fill();
    for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
      const T = C.grid[y][x], X = ox + x * ts, Y = oy + y * ts;
      ctx.fillStyle = era.floor[(x + y) & 1]; ctx.fillRect(X, Y, ts, ts);
      // grain
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      for (let i = 0; i < 3; i++) { const a = hash(x, y, i), b = hash(y, x, i + 7); ctx.fillRect(X + a * ts * 0.9, Y + b * ts * 0.9, ts * 0.06, ts * 0.06); }
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(X + 0.5, Y + 0.5, ts - 1, ts - 1);
      if (T.t === 'pit') {
        const g = ctx.createRadialGradient(X + ts / 2, Y + ts / 2, ts * 0.05, X + ts / 2, Y + ts / 2, ts * 0.6);
        g.addColorStop(0, '#000'); g.addColorStop(0.7, '#05060a'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = g; rr(X + 3, Y + 3, ts - 6, ts - 6, ts * 0.18); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2; rr(X + 3, Y + 3, ts - 6, ts - 6, ts * 0.18); ctx.stroke();
      } else if (T.t === 'lava') {
        const p = 0.5 + 0.5 * Math.sin(t / 400 + x * 1.7 + y);
        const g = ctx.createLinearGradient(X, Y, X + ts, Y + ts);
        g.addColorStop(0, `rgb(${200 + 40 * p | 0},${70 + 30 * p | 0},20)`); g.addColorStop(1, '#a3260f');
        ctx.fillStyle = g; rr(X + 2, Y + 2, ts - 4, ts - 4, ts * 0.15); ctx.fill();
        ctx.fillStyle = `rgba(255,220,120,${0.25 + 0.25 * p})`;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(X + ts * (0.2 + 0.3 * i + 0.05 * Math.sin(t / 300 + i)), Y + ts * (0.3 + 0.2 * ((i * 7 + x) % 3)), ts * 0.06, 0, 7); ctx.fill(); }
      } else if (T.t === 'rock') {
        const tmp = T.ttl > 0;
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; rr(X + 4, Y + 8, ts - 8, ts - 8, ts * 0.14); ctx.fill();
        ctx.fillStyle = tmp ? '#6f6a5e' : era.rock; rr(X + 4, Y + 4, ts - 8, ts - 8, ts * 0.14); ctx.fill();
        ctx.fillStyle = tmp ? '#8d877a' : era.rockTop; rr(X + 6, Y + 5, ts - 12, ts * 0.55, ts * 0.12); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(X + ts * (0.3 + hash(x, y, 3) * 0.2), Y + ts * 0.2); ctx.lineTo(X + ts * 0.5, Y + ts * 0.45); ctx.lineTo(X + ts * 0.62, Y + ts * 0.38); ctx.stroke();
        if (tmp) { ctx.fillStyle = '#fff'; ctx.font = `bold ${ts * 0.22}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(T.ttl, X + ts * 0.82, Y + ts * 0.9); }
      }
      if (T.fire > 0) drawFire(X, Y, t, x, y);
      if (T.trap) drawTrap(X, Y);
    }
    for (const b of C.bombs) drawBomb(b, t);
  }
  function drawFire(X, Y, t, x, y) {
    for (let i = 0; i < 3; i++) {
      const fx = X + ts * (0.25 + 0.25 * i), fl = 0.6 + 0.4 * Math.sin(t / 120 + i * 2 + x * 3 + y);
      const g = ctx.createRadialGradient(fx, Y + ts * 0.75, 1, fx, Y + ts * 0.6, ts * 0.32 * fl);
      g.addColorStop(0, 'rgba(255,240,150,0.9)'); g.addColorStop(0.5, 'rgba(255,120,30,0.6)'); g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(fx, Y + ts * 0.65, ts * 0.16, ts * 0.3 * fl, 0, 0, 7); ctx.fill();
    }
  }
  function drawTrap(X, Y) {
    const cx = X + ts / 2, cy = Y + ts / 2, r = ts * 0.26;
    ctx.strokeStyle = 'rgba(255,209,102,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55); }
    ctx.stroke();
  }
  function drawBomb(b, t) {
    const cx = px(b.x), cy = py(b.y), r = ts * 0.22;
    ctx.fillStyle = '#1b1b22'; ctx.beginPath(); ctx.arc(cx, cy + 3, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#c9a26b'; ctx.beginPath(); ctx.moveTo(cx + r * 0.5, cy - r * 0.6); ctx.quadraticCurveTo(cx + r, cy - r * 1.4, cx + r * 1.2, cy - r * 1.2); ctx.stroke();
    ctx.fillStyle = Math.sin(t / 80) > 0 ? '#ffd166' : '#ff5a3a'; ctx.beginPath(); ctx.arc(cx + r * 1.2, cy - r * 1.2, 3, 0, 7); ctx.fill();
    // zone
    ctx.strokeStyle = 'rgba(255,179,71,0.5)'; ctx.setLineDash([4, 4]); ctx.strokeRect(ox + (b.x - 1) * ts + 3, oy + (b.y - 1) * ts + 3, ts * 3 - 6, ts * 3 - 6); ctx.setLineDash([]);
  }

  /* ---------- surbrillances ---------- */
  function fillTile(x, y, color, inset) { const i = inset || 0; ctx.fillStyle = color; ctx.fillRect(ox + x * ts + i, oy + y * ts + i, ts - 2 * i, ts - 2 * i); }
  function strokeTile(x, y, color, w, inset) { const i = inset || 2; ctx.strokeStyle = color; ctx.lineWidth = w || 2; ctx.strokeRect(ox + x * ts + i, oy + y * ts + i, ts - 2 * i, ts - 2 * i); }
  function hatch(x, y, color, t) {
    const X = ox + x * ts, Y = oy + y * ts;
    ctx.save(); ctx.beginPath(); ctx.rect(X, Y, ts, ts); ctx.clip();
    ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    const off = (t / 40) % 12;
    for (let k = -ts; k < ts * 2; k += 12) { ctx.beginPath(); ctx.moveTo(X + k + off, Y); ctx.lineTo(X + k + off - ts, Y + ts); ctx.stroke(); }
    ctx.restore();
  }
  function drawOverlays(t) {
    const pulse = 0.5 + 0.5 * Math.sin(t / 220);
    // zone de danger
    if (C.phase === 'hero') {
      let dz = null;
      if (C.danger) dz = dangerTiles();
      else if (C.hover && C.mode !== 'skill') { const o = unitAt(C.hover[0], C.hover[1]); if (o && o.team === 'enemy') dz = dangerTiles(o); }
      if (dz) for (const k of dz) { const x = k % GRID_W, y = Math.floor(k / GRID_W); fillTile(x, y, 'rgba(255,70,70,0.13)'); hatch(x, y, 'rgba(255,90,90,0.18)', 0); }
    }
    // attaques annoncées
    for (const tl of C.telegraphs) for (const [x, y] of tl.tiles) {
      fillTile(x, y, hexA(tl.color || '#ff5a5a', 0.18 + 0.17 * pulse)); hatch(x, y, hexA(tl.color || '#ff5a5a', 0.45), t); strokeTile(x, y, hexA(tl.color || '#ff5a5a', 0.8), 2, 3);
    }
    // bombes rampantes armées
    for (const e of enemies()) if (e.armed) for (const [x, y] of areaTiles(e.x, e.y, 'ring8')) { fillTile(x, y, `rgba(255,93,143,${0.15 + 0.2 * pulse})`); hatch(x, y, 'rgba(255,93,143,0.4)', t); }
    if (C.phase !== 'hero' || C.busy) return;
    const hu = heroUnit(C.sel); if (!hu) return;
    if (C.mode === 'skill') {
      const s = skillStats(hu.hero, C.slot); if (!s) return;
      const targets = skillTargets(hu, s);
      for (const [x, y] of targets) { fillTile(x, y, 'rgba(255,170,60,0.16)'); strokeTile(x, y, 'rgba(255,170,60,0.35)', 1, 2); }
      if (C.hover) {
        const p = planSkill(hu, s, C.hover[0], C.hover[1]);
        if (p) {
          for (const [x, y] of p.tiles) fillTile(x, y, 'rgba(255,90,60,0.38)');
          if (p.land) strokeTile(p.land[0], p.land[1], '#9fe0ff', 3, 4);
          strokeTile(C.hover[0], C.hover[1], '#ffd166', 3, 2);
          const dm = displayDmg(hu.hero, s);
          if (dm > 0) for (const o of p.hits) {
            let d = dm; if (o.team === 'hero') d = Math.round(s.dmg * 0.5);
            else if (s.exec && o.hp < o.maxHp * 0.5) d = Math.round(d * (1 + s.exec));
            const lethal = o.team !== 'hero' && d >= o.hp;
            label(o.x, o.y + 0.08, o.team === 'hero' ? `−${d}%` : (lethal ? `−${d} ☠` : `−${d}`), lethal ? '#ffd166' : '#ff8080');
          }
        }
      }
    } else if (hu.hasMove) {
      const m = heroMoveTiles(hu);
      for (const n of m.values()) { if (n.d === 0) continue; fillTile(n.x, n.y, 'rgba(90,170,255,0.2)'); strokeTile(n.x, n.y, 'rgba(120,190,255,0.45)', 1, 3); }
      if (C.hover) {
        const n = m.get(key(C.hover[0], C.hover[1]));
        if (n && n.d > 0) {
          const path = pathTo(m, n.x, n.y);
          ctx.strokeStyle = 'rgba(160,215,255,0.9)'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
          ctx.beginPath(); ctx.moveTo(px(hu.x), py(hu.y)); for (const [x, y] of path) ctx.lineTo(px(x), py(y)); ctx.stroke(); ctx.setLineDash([]);
          strokeTile(n.x, n.y, '#9fe0ff', 3, 3);
        }
      }
    }
    if (C.hover && C.mode !== 'skill') strokeTile(C.hover[0], C.hover[1], 'rgba(255,255,255,0.35)', 2, 1);
  }
  function label(x, y, txt, color) {
    ctx.font = `bold ${Math.max(11, ts * 0.19)}px system-ui, sans-serif`; ctx.textAlign = 'center';
    const w = ctx.measureText(txt).width + 10, X = px(x), Y = py(y) - ts * 0.08;
    ctx.fillStyle = 'rgba(10,10,16,0.85)'; rr(X - w / 2, Y - ts * 0.15, w, ts * 0.27, 5); ctx.fill();
    ctx.fillStyle = color; ctx.fillText(txt, X, Y + ts * 0.05);
  }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }

  /* ---------- unités ---------- */
  function drawUnits(t) {
    const list = C.units.filter(u => !u.dead || (u.falling && t - u.falling < 400)).sort((a, b) => a.ry - b.ry);
    for (const u of list) drawUnit(u, t);
  }
  function shapePath(shape, cx, cy, r) {
    ctx.beginPath();
    switch (shape) {
      case 'square': rr(cx - r, cy - r, r * 2, r * 2, r * 0.3); break;
      case 'triangle': ctx.moveTo(cx, cy - r * 1.1); ctx.lineTo(cx + r * 1.05, cy + r * 0.8); ctx.lineTo(cx - r * 1.05, cy + r * 0.8); ctx.closePath(); break;
      case 'diamond': ctx.moveTo(cx, cy - r * 1.15); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r * 1.15); ctx.lineTo(cx - r, cy); ctx.closePath(); break;
      case 'hex': for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const X = cx + Math.cos(a) * r * 1.05, Y = cy + Math.sin(a) * r * 1.05; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.closePath(); break;
      case 'blob': for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2, rad = r * (1 + 0.12 * Math.sin(a * 5 + performance.now() / 200)); const X = cx + Math.cos(a) * rad, Y = cy + Math.sin(a) * rad; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.closePath(); break;
      case 'ghost': ctx.arc(cx, cy - r * 0.15, r, Math.PI, 0); ctx.lineTo(cx + r, cy + r * 0.85); for (let i = 0; i < 4; i++) ctx.lineTo(cx + r - (i + 0.5) * r / 2, cy + r * (i % 2 ? 0.85 : 0.55)); ctx.lineTo(cx - r, cy + r * 0.85); ctx.closePath(); break;
      default: ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
  }
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; } return `rgb(${r | 0},${g | 0},${b | 0})`; }
  function drawUnit(u, t) {
    let cx = px(u.rx + u.ox), cy = py(u.ry + u.oy);
    let sc = u.scale || 1;
    if (u.falling) { const k = Math.min(1, (t - u.falling) / 400); sc *= 1 - k; }
    if (u.jump && t - u.jump < 280) { const k = (t - u.jump) / 280; cy -= Math.sin(k * Math.PI) * ts * 0.5; }
    if (u.alpha < 1) { u.alpha = Math.min(1, u.alpha + 0.04); }
    ctx.save(); ctx.globalAlpha = Math.max(0, u.alpha);
    const big = u.boss ? 1.25 : 1;
    const r = ts * 0.3 * sc * big;
    // ombre
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(px(u.rx + u.ox), py(u.ry + u.oy) + ts * 0.28, r * 0.95, r * 0.35, 0, 0, 7); ctx.fill();
    const bob = Math.sin(t / 350 + u.uid) * ts * 0.02;
    cy += bob - ts * 0.04;
    if (u.team === 'hero') drawHero(u, cx, cy, r, t);
    else if (u.team === 'obj') drawBarrel(cx, cy, r);
    else drawEnemy(u, cx, cy, r, t);
    // flash de dégâts
    if (u.flash > 0) { ctx.globalAlpha = u.flash * 0.7; ctx.fillStyle = '#fff'; shapePath(u.team === 'enemy' ? (u.boss ? BOSSES[u.kind].shape : ENEMIES[u.kind].shape) : 'circle', cx, cy, r); ctx.fill(); ctx.globalAlpha = Math.max(0, u.alpha); }
    // statuts
    if (u.shield > 0) { ctx.strokeStyle = 'rgba(160,225,255,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r * 1.32, 0, 7); ctx.stroke(); if (u.shield > 1) { ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, 7); ctx.stroke(); } }
    if (u.stun > 0) { for (let i = 0; i < 3; i++) { const a = t / 300 + i * 2.1; star(cx + Math.cos(a) * r * 0.9, cy - r * 1.15 + Math.sin(a) * r * 0.25, ts * 0.06, '#9fe0ff'); } }
    if (u.poison) { ctx.fillStyle = '#9dff6b'; ctx.beginPath(); const X = cx + r * 0.9, Y = cy - r * 0.6; ctx.moveTo(X, Y - ts * 0.08); ctx.quadraticCurveTo(X + ts * 0.06, Y, X, Y + ts * 0.05); ctx.quadraticCurveTo(X - ts * 0.06, Y, X, Y - ts * 0.08); ctx.fill(); }
    if (u.taunt) { ctx.fillStyle = '#ff6b6b'; ctx.font = `900 ${ts * 0.24}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('!', cx - r * 0.95, cy - r * 0.6); }
    if (C.acting === u.uid) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(cx, cy, r * 1.4, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
  }
  function star(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rad = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } ctx.closePath(); ctx.fill(); }
  function eyes(cx, cy, r, look, angry) {
    const ex = r * 0.32, ey = -r * 0.1, er = r * 0.17;
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx + s * ex, cy + ey, er, er * 1.15, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx + s * ex + look[0] * er * 0.45, cy + ey + look[1] * er * 0.45, er * 0.55, 0, 7); ctx.fill();
      if (angry) { ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.beginPath(); ctx.moveTo(cx + s * ex - er * 1.1, cy + ey - er * 1.6 + (s > 0 ? er * 0.5 : 0) * 0); ctx.lineTo(cx + s * ex + er * 1.1, cy + ey - er * 1.6 + s * er * 0.6); ctx.stroke(); }
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
    if (sel) { ctx.strokeStyle = hexA(H.color, 0.5 + 0.4 * Math.sin(t / 200)); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, py(u.ry + u.oy) + ts * 0.28, r * 1.2, r * 0.45, 0, 0, 7); ctx.stroke(); }
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
    g.addColorStop(0, shade(H.color, 0.45)); g.addColorStop(1, shade(H.color, -0.35));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.stroke();
    // emblème
    heroEmblem(h.key, cx, cy + r * 0.38, r * 0.42);
    eyes(cx, cy - r * 0.12, r * 0.85, lookDir(u), false);
    // actions restantes
    const done = u.actions <= 0 && !u.hasMove;
    if (C.phase === 'hero' && done) { ctx.fillStyle = 'rgba(10,10,20,0.45)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); }
    // pourcentage
    const pct = Math.round(h.pct);
    const col = pct <= FLOOR_PCT ? '#ff5a5a' : pct < 60 ? '#ffb347' : '#e8f6ff';
    ctx.font = `800 ${Math.max(11, ts * 0.2)}px system-ui, sans-serif`; ctx.textAlign = 'center';
    const w = ctx.measureText(pct + '%').width + 8;
    ctx.fillStyle = 'rgba(8,8,14,0.85)'; rr(cx - w / 2, cy + r * 1.02, w, ts * 0.23, 5); ctx.fill();
    ctx.fillStyle = col; ctx.fillText(pct + '%', cx, cy + r * 1.02 + ts * 0.18);
    if (C.phase === 'hero') {
      // pastilles action / déplacement
      for (let i = 0; i < Math.max(0, u.actions); i++) { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(cx - r * 0.9 + i * ts * 0.1, cy - r * 1.05, ts * 0.045, 0, 7); ctx.fill(); }
      if (u.hasMove) { ctx.fillStyle = '#7cc4ff'; ctx.beginPath(); ctx.arc(cx + r * 0.9, cy - r * 1.05, ts * 0.045, 0, 7); ctx.fill(); }
    }
  }
  function heroEmblem(k, cx, cy, s) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1.5, s * 0.22); ctx.lineCap = 'round';
    ctx.beginPath();
    if (k === 'brann') { ctx.moveTo(cx - s, cy - s * 0.3); ctx.lineTo(cx, cy + s * 0.5); ctx.lineTo(cx + s, cy - s * 0.3); }
    else if (k === 'lyse') { ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy); ctx.moveTo(cx + s * 0.5, cy - s * 0.4); ctx.lineTo(cx + s, cy); ctx.lineTo(cx + s * 0.5, cy + s * 0.4); }
    else if (k === 'kael') { ctx.moveTo(cx - s, cy + s * 0.4); ctx.lineTo(cx + s, cy - s * 0.4); }
    else { ctx.moveTo(cx, cy - s * 0.5); ctx.lineTo(cx, cy + s * 0.5); ctx.moveTo(cx - s * 0.5, cy); ctx.lineTo(cx + s * 0.5, cy); }
    ctx.stroke(); ctx.lineCap = 'butt';
  }
  function drawBarrel(cx, cy, r) {
    ctx.fillStyle = '#7a4a24'; rr(cx - r * 0.75, cy - r * 0.9, r * 1.5, r * 1.8, r * 0.35); ctx.fill();
    ctx.fillStyle = '#c0392b'; ctx.fillRect(cx - r * 0.75, cy - r * 0.15, r * 1.5, r * 0.3);
    ctx.strokeStyle = '#3d2412'; ctx.lineWidth = 2; rr(cx - r * 0.75, cy - r * 0.9, r * 1.5, r * 1.8, r * 0.35); ctx.stroke();
    ctx.fillStyle = '#ffd166'; ctx.font = `900 ${r * 0.8}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('!', cx, cy - r * 0.25);
  }
  function drawEnemy(u, cx, cy, r, t) {
    const D = u.boss ? BOSSES[u.kind] : ENEMIES[u.kind];
    if (u.elite || u.boss) { ctx.strokeStyle = u.boss ? '#ffd166' : 'rgba(255,209,102,0.85)'; ctx.lineWidth = 3; shapePath(D.shape, cx, cy, r * 1.18); ctx.stroke(); }
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r * 1.2);
    g.addColorStop(0, shade(D.color, 0.35)); g.addColorStop(1, shade(D.color, -0.45));
    ctx.fillStyle = g; shapePath(D.shape, cx, cy, r); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    eyes(cx, cy, r * 0.9, lookDir(u), true);
    // détails par type
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = Math.max(1.5, r * 0.08);
    if (u.kind === 'archer' || u.kind === 'reine' || u.kind === 'hydre') { ctx.beginPath(); ctx.arc(cx + r * 0.95, cy + r * 0.1, r * 0.45, -1.2, 1.2); ctx.stroke(); }
    if (u.kind === 'brute' || u.kind === 'golem' || u.kind === 'colosse') { ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy + r * 0.45); ctx.lineTo(cx + r * 0.4, cy + r * 0.45); ctx.stroke(); }
    if (u.kind === 'kamikaze') { ctx.strokeStyle = '#ffd166'; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.3, cy - r * 1.4); ctx.stroke(); if (u.armed && Math.sin(t / 70) > 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + r * 0.3, cy - r * 1.4, r * 0.18, 0, 7); ctx.fill(); } }
    if (u.kind === 'chaman' || u.kind === 'invocateur') { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(cx, cy - r * 1.25, r * 0.16, 0, 7); ctx.fill(); }
    if (u.boss) { // couronne
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); const Y = cy - r * 1.05;
      ctx.moveTo(cx - r * 0.5, Y); ctx.lineTo(cx - r * 0.5, Y - r * 0.4); ctx.lineTo(cx - r * 0.25, Y - r * 0.18); ctx.lineTo(cx, Y - r * 0.5); ctx.lineTo(cx + r * 0.25, Y - r * 0.18); ctx.lineTo(cx + r * 0.5, Y - r * 0.4); ctx.lineTo(cx + r * 0.5, Y); ctx.closePath(); ctx.fill();
    }
    // barre de PV
    const bw = ts * 0.7 * (u.boss ? 1.1 : 1), bh = Math.max(4, ts * 0.07), bx = cx - bw / 2, by = cy - r * (u.boss ? 1.75 : 1.45) - bh;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = u.boss ? '#ffd166' : '#ff5a5a'; ctx.fillRect(bx, by, bw * Math.max(0, u.hp / u.maxHp), bh);
    if (ts > 50) { ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.max(9, ts * 0.15)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(Math.max(0, Math.ceil(u.hp)), cx, by - 3); }
  }

  /* ---------- effets ---------- */
  function drawFx(t) {
    C.fx = C.fx.filter(f => t - f.t0 < f.dur);
    for (const f of C.fx) {
      const k = (t - f.t0) / f.dur, X = px(f.x), Y = py(f.y);
      ctx.save();
      switch (f.type) {
        case 'proj': {
          const X2 = px(f.x2), Y2 = py(f.y2);
          const xx = X + (X2 - X) * k, yy = Y + (Y2 - Y) * k - (f.arc ? Math.sin(k * Math.PI) * ts * 0.8 : 0);
          ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.globalAlpha = 0.5;
          const kb = Math.max(0, k - 0.25);
          const xb = X + (X2 - X) * kb, yb = Y + (Y2 - Y) * kb - (f.arc ? Math.sin(kb * Math.PI) * ts * 0.8 : 0);
          ctx.beginPath(); ctx.moveTo(xb, yb); ctx.lineTo(xx, yy); ctx.stroke();
          ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(xx, yy, ts * 0.07, 0, 7); ctx.fill();
          ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(xx, yy, ts * 0.11, 0, 7); ctx.globalAlpha = 0.5; ctx.fill();
          break;
        }
        case 'slash': {
          ctx.strokeStyle = f.color; ctx.lineWidth = 4 * (1 - k) + 1; ctx.globalAlpha = 1 - k;
          ctx.beginPath(); ctx.arc(X, Y, ts * (0.25 + 0.2 * k), -2.4 + k, -0.2 + k); ctx.stroke();
          break;
        }
        case 'ring': {
          ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.globalAlpha = 1 - k;
          ctx.beginPath(); ctx.arc(X, Y, ts * (0.3 + (f.r || 0.8) * k), 0, 7); ctx.stroke();
          break;
        }
        case 'boom': {
          const rad = ts * (0.3 + (f.r || 1) * 1.1 * k);
          const g = ctx.createRadialGradient(X, Y, 0, X, Y, rad);
          g.addColorStop(0, `rgba(255,255,220,${1 - k})`); g.addColorStop(0.4, hexA(f.color, 0.8 * (1 - k))); g.addColorStop(1, hexA(f.color, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, rad, 0, 7); ctx.fill();
          break;
        }
        case 'burst': {
          ctx.fillStyle = f.color; ctx.globalAlpha = 1 - k;
          for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + f.t0, d = ts * 0.55 * k; ctx.beginPath(); ctx.arc(X + Math.cos(a) * d, Y + Math.sin(a) * d, ts * 0.06 * (1 - k) + 1, 0, 7); ctx.fill(); }
          break;
        }
        case 'spark': {
          ctx.strokeStyle = f.color; ctx.lineWidth = 2; ctx.globalAlpha = 1 - k;
          for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.4, d1 = ts * 0.1, d2 = ts * (0.15 + 0.25 * k); ctx.beginPath(); ctx.moveTo(X + Math.cos(a) * d1, Y + Math.sin(a) * d1); ctx.lineTo(X + Math.cos(a) * d2, Y + Math.sin(a) * d2); ctx.stroke(); }
          break;
        }
        case 'bolt': {
          const X2 = px(f.x2), Y2 = py(f.y2);
          ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.globalAlpha = 1 - k * 0.8; ctx.shadowColor = f.color; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.moveTo(X, Y);
          for (let i = 1; i < 6; i++) { const q = i / 6; ctx.lineTo(X + (X2 - X) * q + (Math.random() - 0.5) * ts * 0.3, Y + (Y2 - Y) * q + (Math.random() - 0.5) * ts * 0.3); }
          ctx.lineTo(X2, Y2); ctx.stroke();
          break;
        }
        case 'laser': {
          const X2 = px(f.x2), Y2 = py(f.y2);
          ctx.strokeStyle = f.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = ts * 0.4 * (1 - k); ctx.shadowColor = f.color; ctx.shadowBlur = 20;
          ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X2, Y2); ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = ts * 0.12 * (1 - k); ctx.stroke();
          break;
        }
        case 'vortex': {
          ctx.strokeStyle = f.color; ctx.lineWidth = 2.5; ctx.globalAlpha = 1 - k;
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(X, Y, ts * (1.8 - 1.5 * k) * (1 - i * 0.25), k * 8 + i, k * 8 + i + 3.5); ctx.stroke(); }
          break;
        }
      }
      ctx.restore();
    }
  }
  function drawTexts(t) {
    C.texts = C.texts.filter(x => t - x.t0 < 1000);
    // éviter les chevauchements : décaler les textes d'une même case
    const per = {};
    for (const x of C.texts) {
      const k = (t - x.t0) / 1000, kk = x.x + ',' + x.y; const idx = per[kk] = (per[kk] || 0) + 1;
      const X = px(x.x), Y = py(x.y) - ts * 0.45 - k * ts * 0.5 - (idx - 1) * ts * 0.22;
      ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
      ctx.font = `900 ${Math.max(12, ts * (x.big ? 0.3 : 0.22))}px system-ui, sans-serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(x.txt, X, Y);
      ctx.fillStyle = x.color; ctx.fillText(x.txt, X, Y);
      ctx.globalAlpha = 1;
    }
  }
  function drawBanner(t) {
    if (!C.banner) return;
    const k = Math.min(1, (t - C.banner.t0) / 300);
    ctx.fillStyle = `rgba(0,0,0,${0.5 * k})`; ctx.fillRect(0, H / 2 - 50, W, 100);
    ctx.font = `900 ${Math.min(52, W / 14)}px system-ui, sans-serif`; ctx.textAlign = 'center';
    ctx.globalAlpha = k; ctx.fillStyle = C.banner.color; ctx.fillText(C.banner.txt, W / 2, H / 2 + 16); ctx.globalAlpha = 1;
  }

  return { init, resize, tileAt, tileCenterPx, start, stop, get ts() { return ts; } };
})();
