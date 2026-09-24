// Chaque carte est une ILE SUSPENDUE, vue exactement du dessus : tout autour, loin en contrebas,
// un vide ou flottent des nuages et d'autres ilots (teinte accordee au decor de la carte).
// Le bord de l'ile est dechiquete : des eclats de roche et de terre depassent tout autour, et de
// temps en temps un morceau se detache et tombe dans le vide (il retrecit en s'eloignant).

const ISLAND_STYLES = {
  prairie: { abyss: ['#16303a', '#0b1c22', '#050d10'], cloud: [150, 190, 180], soil: ['#6b5234', '#4a3822', '#2e2214'], rock: ['#6d6f63', '#4a4c43'], edge: '#7fae5a' },
  usine: { abyss: ['#1e2530', '#10151c', '#07090d'], cloud: [150, 160, 175], soil: ['#55585f', '#3a3c42', '#232428'], rock: ['#6a7078', '#454a52'], edge: '#8a97a6' },
  ruines: { abyss: ['#33160f', '#1c0a07', '#0c0403'], cloud: [190, 120, 95], soil: ['#6a3522', '#4a2316', '#2a120b'], rock: ['#5e4038', '#3e2a24'], edge: '#c86a3a' },
  neutre: { abyss: ['#1c1d2b', '#10111a', '#07070c'], cloud: [150, 150, 175], soil: ['#55504a', '#3a3632', '#24211e'], rock: ['#62605c', '#44423f'], edge: '#9a968e' },
  hub: { abyss: ['#1d1c30', '#11101e', '#08070f'], cloud: [165, 160, 195], soil: ['#6b5e4c', '#4b4134', '#2c261e'], rock: ['#7a746a', '#55504a'], edge: '#b8ad98' },
};

function islandStyle(world) {
  if (world.hubDoors) return ISLAND_STYLES.hub;
  const n = world.theme && world.theme.name;
  return ISLAND_STYLES[n] || ISLAND_STYLES.neutre;
}

// Surfaces de terre de la carte (rectangles).
function islandLandRects(world) {
  const room = world.room;
  if (world.hubDoors && Save.data && Save.data.hub) {
    return Save.data.hub.cells.map((c) => ({ x: (c.gx - 0.5) * HUB_CELL, y: (c.gy - 0.5) * HUB_CELL, w: HUB_CELL, h: HUB_CELL }));
  }
  if (room.floorRects) return room.floorRects.map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h }));
  return [Object.assign({}, room._landBounds || (room._landBounds = Object.assign({}, room.bounds)))];
}

function islandSubtract(a, b, covers) {
  let segs = [[a, b]];
  for (const [c0, c1] of covers) {
    const next = [];
    for (const [s0, s1] of segs) {
      if (c1 <= s0 || c0 >= s1) { next.push([s0, s1]); continue; }
      if (c0 > s0) next.push([s0, c0]);
      if (c1 < s1) next.push([c1, s1]);
    }
    segs = next;
  }
  return segs.filter(([s0, s1]) => s1 - s0 > 2);
}

// Bords exposes de l'ile + eclats de roche/terre qui depassent tout autour.
function buildIsland(rects, style) {
  const rnd = floorRng(Math.round(rects.reduce((a, r) => a + Math.abs(r.x * 3 + r.y * 7 + r.w), 0)) + 97);
  const eq = (p, q) => Math.abs(p - q) < 0.6;
  const edges = []; // { a0, a1 (le long du bord), c (coordonnee fixe), nx, ny (normale vers l'exterieur) }
  for (const r of rects) {
    const cover = (fn) => rects.filter((o) => o !== r && fn(o));
    for (const [x0, x1] of islandSubtract(r.x, r.x + r.w, cover((o) => eq(o.y + o.h, r.y)).map((o) => [o.x, o.x + o.w]))) edges.push({ a0: x0, a1: x1, c: r.y, nx: 0, ny: -1 });
    for (const [x0, x1] of islandSubtract(r.x, r.x + r.w, cover((o) => eq(o.y, r.y + r.h)).map((o) => [o.x, o.x + o.w]))) edges.push({ a0: x0, a1: x1, c: r.y + r.h, nx: 0, ny: 1 });
    for (const [y0, y1] of islandSubtract(r.y, r.y + r.h, cover((o) => eq(o.x + o.w, r.x)).map((o) => [o.y, o.y + o.h]))) edges.push({ a0: y0, a1: y1, c: r.x, nx: -1, ny: 0 });
    for (const [y0, y1] of islandSubtract(r.y, r.y + r.h, cover((o) => eq(o.x, r.x + r.w)).map((o) => [o.y, o.y + o.h]))) edges.push({ a0: y0, a1: y1, c: r.x + r.w, nx: 1, ny: 0 });
  }
  // point (le long du bord, distance vers l'exterieur) -> monde
  const P = (e, along, out) => (e.ny ? { x: along, y: e.c + e.ny * out } : { x: e.c + e.nx * out, y: along });
  const chunks = [];
  for (const e of edges) {
    const len = e.a1 - e.a0;
    let a = e.a0 - 6;
    while (a < e.a1 + 6) {
      const w = 12 + rnd() * 22;
      const depth = rnd() < 0.12 ? 26 + rnd() * 22 : 6 + rnd() * 18; // parfois un gros eperon
      const n = 5 + Math.floor(rnd() * 3);
      const pts = [P(e, a, -4)];
      for (let k = 1; k < n; k++) {
        const f = k / n;
        pts.push(P(e, a + f * w + (rnd() - 0.5) * 4, Math.sin(f * Math.PI) * depth * (0.7 + rnd() * 0.45)));
      }
      pts.push(P(e, a + w, -4));
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      chunks.push({ pts, isRock: rnd() < 0.45, cx, cy, depth, nx: e.nx, ny: e.ny,
        specks: Array.from({ length: 3 }, () => ({ u: rnd(), v: rnd(), r: 0.6 + rnd() * 1.4 })) });
      a += w * (0.55 + rnd() * 0.3); // chevauchement : bord continu
    }
    // petits eclats detaches qui flottent juste a cote de l'ile
    for (let k = 0; k < len / 70; k++) {
      const p = P(e, e.a0 + rnd() * len, 24 + rnd() * 26);
      chunks.push({ floating: true, x: p.x, y: p.y, r: 2 + rnd() * 5, isRock: rnd() < 0.6, nx: e.nx, ny: e.ny, phase: rnd() * 6 });
    }
  }
  return { edges, chunks, style, falling: [], fallTimer: 1 };
}

// ---------- Vide en contrebas (ecran) ----------
const IslandSky = {
  clouds: null, farIsles: null, sprites: null,
  init() {
    if (this.clouds) return;
    const rnd = floorRng(777);
    this.sprites = [];
    for (let s = 0; s < 6; s++) {
      const cv = document.createElement('canvas');
      cv.width = 320; cv.height = 220;
      const c = cv.getContext('2d');
      for (let k = 0; k < 18; k++) {
        const x = 60 + rnd() * 200, y = 50 + rnd() * 120, r = 20 + rnd() * 42;
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.6, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
      this.sprites.push(cv);
    }
    this.tinted = {};
    this.clouds = [];
    for (let k = 0; k < 14; k++) {
      const depth = rnd();
      this.clouds.push({ x: rnd(), y: rnd(), s: 0.45 + depth * 0.8, par: 0.03 + depth * 0.12, vx: 3 + depth * 8, vy: 1 + depth * 2, spr: Math.floor(rnd() * 6), a: 0.1 + depth * 0.18 });
    }
    this.clouds.sort((a, b) => a.s - b.s);
    this.farIsles = [];
    for (let k = 0; k < 6; k++) this.farIsles.push({ x: rnd(), y: rnd(), s: 0.25 + rnd() * 0.35, par: 0.015 + rnd() * 0.03, seed: rnd() });
  },

  // nuages teintes aux couleurs du decor (calcules une fois par decor)
  cloudSprite(i, st) {
    const key = st.cloud.join(',') + i;
    if (this.tinted[key]) return this.tinted[key];
    const src = this.sprites[i];
    const cv = document.createElement('canvas');
    cv.width = src.width; cv.height = src.height;
    const c = cv.getContext('2d');
    c.drawImage(src, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = `rgb(${st.cloud[0]},${st.cloud[1]},${st.cloud[2]})`;
    c.fillRect(0, 0, cv.width, cv.height);
    this.tinted[key] = cv;
    return cv;
  },

  // ilot lointain vu de dessus : tache de terre irreguliere avec un peu de vegetation
  drawFarIsle(ctx, x, y, s, st, seed) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = st.soil[2];
    ctx.beginPath();
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, r = 60 + ((seed * 131 + i * 17) % 11) * 4;
      const px = Math.cos(a) * r * 1.3, py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = st.soil[1];
    ctx.beginPath(); ctx.ellipse(-8, -6, 50, 34, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  render(ctx, world, cam) {
    this.init();
    const st = islandStyle(world);
    const W = CANVAS_W, H = CANVAS_H;
    const t = performance.now() / 1000;
    // fond aux couleurs du decor, plus sombre vers les bords de l'ecran (profondeur du vide)
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.1, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, st.abyss[0]); g.addColorStop(0.6, st.abyss[1]); g.addColorStop(1, st.abyss[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const fi of this.farIsles) {
      const x = ((fi.x * W - cam.x * fi.par) % W + W) % W;
      const y = ((fi.y * H - cam.y * fi.par) % H + H) % H;
      this.drawFarIsle(ctx, x, y, fi.s * (H / 700), st, fi.seed);
    }
    // nuages en contrebas qui derivent lentement (parallaxe : ils sont loin sous l'ile)
    for (const c of this.clouds) {
      const spr = this.cloudSprite(c.spr, st);
      const w = spr.width * c.s * (H / 700), h = spr.height * c.s * (H / 700);
      const spanX = W + w * 2, spanY = H + h * 2;
      const x = ((c.x * spanX + t * c.vx - cam.x * c.par) % spanX + spanX) % spanX - w;
      const y = ((c.y * spanY + t * c.vy - cam.y * c.par) % spanY + spanY) % spanY - h;
      ctx.globalAlpha = c.a;
      ctx.drawImage(spr, x, y, w, h);
    }
    ctx.globalAlpha = 1;
  },
};

function islandPoly(ctx, pts, camera) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x - camera.x, pts[0].y - camera.y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x - camera.x, pts[i].y - camera.y);
  ctx.closePath();
}

// ---------- Bord de l'ile (monde), dessine AVANT le sol ----------
function renderIslandUnderside(ctx, camera, world) {
  if (!world.room) return;
  const nowMs = performance.now();
  const dt = clamp((nowMs - (renderIslandUnderside._last || nowMs)) / 1000, 0, 0.05);
  renderIslandUnderside._last = nowMs;
  const key = world.hubDoors ? 'hub' + Save.data.hub.cells.map((c) => c.gx + ',' + c.gy).join(';') : 'r';
  let isl = world.room._island;
  if (!isl || isl.key !== key) {
    isl = buildIsland(islandLandRects(world), islandStyle(world));
    isl.key = key;
    world.room._island = isl;
  }
  const st = isl.style;
  const zoom = world.zoom || 1;
  const vx0 = camera.x - 80, vx1 = camera.x + CANVAS_W / zoom + 80, vy0 = camera.y - 80, vy1 = camera.y + CANVAS_H / zoom + 80;
  const t = nowMs / 1000;

  // ombre tres douce autour de l'ile : elle se detache nettement du vide
  ctx.save();
  for (const e of isl.edges) {
    const len = e.a1 - e.a0;
    const x = e.ny ? e.a0 : (e.nx > 0 ? e.c : e.c - 50), y = e.ny ? (e.ny > 0 ? e.c : e.c - 50) : e.a0;
    const w = e.ny ? len : 50, h = e.ny ? 50 : len;
    if (x > vx1 || x + w < vx0 || y > vy1 || y + h < vy0) continue;
    const g = e.ny
      ? ctx.createLinearGradient(0, e.c - camera.y, 0, e.c + e.ny * 50 - camera.y)
      : ctx.createLinearGradient(e.c - camera.x, 0, e.c + e.nx * 50 - camera.x, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - camera.x, y - camera.y, w, h);
  }
  ctx.restore();

  // eclats de roche / de terre
  for (const c of isl.chunks) {
    if (c.floating) {
      if (c.x < vx0 || c.x > vx1 || c.y < vy0 || c.y > vy1) continue;
      const dx = Math.sin(t * 0.6 + c.phase) * 1.5, dy = Math.cos(t * 0.5 + c.phase) * 1.5;
      ctx.save();
      ctx.translate(c.x - camera.x + dx, c.y - camera.y + dy);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.arc(2, 3, c.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.isRock ? st.rock[1] : st.soil[1];
      ctx.beginPath(); ctx.moveTo(-c.r, 0); ctx.lineTo(-c.r * 0.3, -c.r); ctx.lineTo(c.r, -c.r * 0.4); ctx.lineTo(c.r * 0.6, c.r); ctx.lineTo(-c.r * 0.5, c.r * 0.8); ctx.closePath(); ctx.fill();
      ctx.restore();
      continue;
    }
    if (c.cx < vx0 || c.cx > vx1 || c.cy < vy0 || c.cy > vy1) continue;
    const base = c.isRock ? st.rock : st.soil;
    ctx.save();
    islandPoly(ctx, c.pts, camera);
    const tip = { x: c.cx + c.nx * c.depth * 0.6, y: c.cy + c.ny * c.depth * 0.6 };
    const g = ctx.createLinearGradient(c.cx - c.nx * 6 - camera.x, c.cy - c.ny * 6 - camera.y, tip.x - camera.x, tip.y - camera.y);
    g.addColorStop(0, base[0]); g.addColorStop(1, base[1]);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1;
    ctx.stroke();
    for (const s of c.specks) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(c.cx + (s.u - 0.5) * 10 - camera.x, c.cy + (s.v - 0.5) * 8 - camera.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Un morceau se detache de temps en temps et tombe : il retrecit et s'assombrit en s'eloignant.
  isl.fallTimer -= dt;
  if (isl.fallTimer <= 0) {
    isl.fallTimer = 0.8 + Math.random() * 2.2;
    const vis = isl.chunks.filter((c) => !c.floating && c.cx > vx0 && c.cx < vx1 && c.cy > vy0 && c.cy < vy1);
    if (vis.length) {
      const c = vis[Math.floor(Math.random() * vis.length)];
      isl.falling.push({ pts: c.pts.map((p) => ({ x: p.x - c.cx, y: p.y - c.cy })), x: c.cx + c.nx * 8, y: c.cy + c.ny * 8, nx: c.nx, ny: c.ny,
        vr: (Math.random() - 0.5) * 2, age: 0, life: 1.8 + Math.random() * 0.8, isRock: c.isRock });
    }
  }
  for (let i = isl.falling.length - 1; i >= 0; i--) {
    const f = isl.falling[i];
    f.age += dt;
    if (f.age >= f.life) { isl.falling.splice(i, 1); continue; }
    const k = f.age / f.life;
    const sc = 1 - k * 0.85; // s'eloigne vers le bas : de plus en plus petit
    const ox = f.nx * (10 + k * 40), oy = f.ny * (10 + k * 40);
    ctx.save();
    ctx.translate(f.x + ox - camera.x, f.y + oy - camera.y);
    ctx.rotate(f.vr * f.age);
    ctx.scale(sc, sc);
    ctx.globalAlpha = 1 - k * 0.9;
    ctx.fillStyle = (f.isRock ? st.rock : st.soil)[k > 0.5 ? 1 : 0];
    ctx.beginPath(); ctx.moveTo(f.pts[0].x, f.pts[0].y);
    for (let j = 1; j < f.pts.length; j++) ctx.lineTo(f.pts[j].x, f.pts[j].y);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    if (Math.random() < 0.25) Particles.spawn(f.x + ox + (Math.random() - 0.5) * 8, f.y + oy + (Math.random() - 0.5) * 8, { vx: f.nx * 10, vy: f.ny * 10, life: 0.5, r: 1.5, color: st.soil[0] });
  }
}

// Liseré net au bord du sol (dessine apres le sol).
function renderIslandRims(ctx, camera, world) {
  const isl = world.room && world.room._island;
  if (!isl) return;
  const zoom = world.zoom || 1;
  const vx0 = camera.x - 40, vx1 = camera.x + CANVAS_W / zoom + 40, vy0 = camera.y - 40, vy1 = camera.y + CANVAS_H / zoom + 40;
  ctx.save();
  ctx.strokeStyle = isl.style.edge; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const e of isl.edges) {
    const p0 = e.ny ? { x: e.a0, y: e.c } : { x: e.c, y: e.a0 }, p1 = e.ny ? { x: e.a1, y: e.c } : { x: e.c, y: e.a1 };
    if (Math.max(p0.x, p1.x) < vx0 || Math.min(p0.x, p1.x) > vx1 || Math.max(p0.y, p1.y) < vy0 || Math.min(p0.y, p1.y) > vy1) continue;
    ctx.moveTo(p0.x - camera.x, p0.y - camera.y); ctx.lineTo(p1.x - camera.x, p1.y - camera.y);
  }
  ctx.stroke();
  ctx.restore();
}
