// Murs mobiles : obstacles de salle (room.obstacles, donc bloquent joueur, ennemis et tirs comme
// les autres) qui suivent en boucle une trajectoire. ob.mover decrit le trace (liste de points),
// le mode (boucle a vitesse constante, ou aller-retour qui ralentit aux extremites) et la position.

const MOVER_TYPES = ['line', 'zigzag', 'wave', 'pendulum', 'circle', 'ellipse', 'rect', 'triangle', 'diamond', 'eight'];

// Trace brut (points) autour de (cx, cy) ; closed = boucle, sinon aller-retour.
function moverPath(type, cx, cy) {
  const pts = [];
  const rot = (x, y, a) => ({ x: cx + x * Math.cos(a) - y * Math.sin(a), y: cy + x * Math.sin(a) + y * Math.cos(a) });
  const axis = choice([0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]);
  switch (type) {
    case 'line': { const L = randRange(90, 200); pts.push(rot(-L, 0, axis), rot(L, 0, axis)); return { pts, closed: false }; }
    case 'zigzag': {
      const L = randRange(120, 210), A = randRange(35, 60), n = 5;
      for (let i = 0; i < n; i++) pts.push(rot(-L + (2 * L * i) / (n - 1), i % 2 ? A : -A, axis));
      return { pts, closed: false };
    }
    case 'wave': {
      const L = randRange(130, 220), A = randRange(35, 60);
      for (let i = 0; i <= 24; i++) { const f = i / 24; pts.push(rot(-L + 2 * L * f, Math.sin(f * Math.PI * 2) * A, axis)); }
      return { pts, closed: false };
    }
    case 'pendulum': {
      const R = randRange(120, 180), a0 = choice([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
      // pivot decale pour que l'arc reste centre sur (cx, cy)
      const px = cx - Math.cos(a0) * R, py = cy - Math.sin(a0) * R;
      for (let i = 0; i <= 20; i++) { const a = a0 - 0.8 + 1.6 * (i / 20); pts.push({ x: px + Math.cos(a) * R, y: py + Math.sin(a) * R }); }
      return { pts, closed: false };
    }
    case 'circle': { const R = randRange(70, 140); for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; pts.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }); } return { pts, closed: true }; }
    case 'ellipse': {
      const rx = randRange(100, 190), ry = randRange(50, 100), a0 = choice([0, Math.PI / 2]);
      for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; pts.push(rot(Math.cos(a) * rx, Math.sin(a) * ry, a0)); }
      return { pts, closed: true };
    }
    case 'rect': { const w = randRange(140, 300) / 2, h = randRange(100, 200) / 2; pts.push({ x: cx - w, y: cy - h }, { x: cx + w, y: cy - h }, { x: cx + w, y: cy + h }, { x: cx - w, y: cy + h }); return { pts, closed: true }; }
    case 'triangle': { const R = randRange(90, 150), a0 = randRange(0, Math.PI * 2); for (let i = 0; i < 3; i++) { const a = a0 + (i / 3) * Math.PI * 2; pts.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }); } return { pts, closed: true }; }
    case 'diamond': { const rx = randRange(100, 170), ry = randRange(70, 130); pts.push({ x: cx, y: cy - ry }, { x: cx + rx, y: cy }, { x: cx, y: cy + ry }, { x: cx - rx, y: cy }); return { pts, closed: true }; }
    case 'eight': default: {
      const a = randRange(120, 200), b = randRange(60, 110), a0 = choice([0, Math.PI / 2]);
      for (let i = 0; i < 48; i++) { const t = (i / 48) * Math.PI * 2; pts.push(rot(a * Math.sin(t), b * Math.sin(t) * Math.cos(t), a0)); }
      return { pts, closed: true };
    }
  }
}

function makeMover(type, cx, cy, w, h, speedMult) {
  const { pts, closed } = moverPath(type, cx, cy);
  if (Math.random() < 0.5) pts.reverse();
  const seq = closed ? pts.concat([pts[0]]) : pts;
  const cum = [0];
  for (let i = 1; i < seq.length; i++) cum.push(cum[i - 1] + dist(seq[i - 1].x, seq[i - 1].y, seq[i].x, seq[i].y));
  const total = cum[cum.length - 1] || 1;
  return {
    type, pts, seq, cum, total, closed, w, h,
    speed: (closed ? randRange(70, 115) : randRange(80, 120)) * (speedMult || 1),
    s: randRange(0, total), ph: randRange(0, Math.PI * 2),
    seed: randRange(0, 1000),
  };
}

// Position du centre selon l'avancement courant.
function moverCenter(m) {
  let s;
  if (m.closed) s = ((m.s % m.total) + m.total) % m.total;
  else s = m.total * (1 - Math.cos(m.ph)) / 2; // aller-retour : ralentit aux extremites
  let i = 1;
  while (i < m.cum.length - 1 && m.cum[i] < s) i++;
  const a = m.seq[i - 1], b = m.seq[i];
  const seg = m.cum[i] - m.cum[i - 1] || 1;
  const f = clamp((s - m.cum[i - 1]) / seg, 0, 1);
  return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) };
}

function moverAdvance(m, dt) {
  if (m.closed) m.s += m.speed * dt;
  else m.ph += dt * m.speed * Math.PI / m.total; // vitesse moyenne ~ m.speed
}

function placeMover(ob) {
  const c = moverCenter(ob.mover);
  ob.x = c.x - ob.w / 2; ob.y = c.y - ob.h / 2;
}

// Genere jusqu'a `count` murs mobiles dont TOUT le trajet reste dans la salle, ne touche aucun
// obstacle ni autre mur mobile, et evite les points reserves (spawn, tourelles...). Le trajet est
// ensuite ajoute a `avoid` pour que rien ne soit pose dessus.
function makeMovingWalls(bounds, obstacles, avoid, count) {
  const out = [];
  const swept = []; // rectangles balayes par les murs deja crees
  for (let k = 0; k < count; k++) {
    for (let tries = 0; tries < 40; tries++) {
      const shape = Math.random();
      const w = shape < 0.4 ? randRange(44, 60) : (shape < 0.7 ? randRange(80, 110) : randRange(26, 32));
      const h = shape < 0.4 ? w : (shape < 0.7 ? randRange(26, 32) : randRange(80, 110));
      const cx = randRange(bounds.x + bounds.w * 0.25, bounds.x + bounds.w * 0.8);
      const cy = randRange(bounds.y + bounds.h * 0.25, bounds.y + bounds.h * 0.75);
      const m = makeMover(choice(MOVER_TYPES), cx, cy, w, h);
      const samples = [];
      const probe = Object.assign({}, m);
      const steps = Math.max(24, Math.ceil(m.total / 14));
      for (let i = 0; i <= steps; i++) {
        if (m.closed) probe.s = (i / steps) * m.total; else probe.ph = (i / steps) * Math.PI;
        samples.push(moverCenter(probe));
      }
      const hw = w / 2, hh = h / 2, reach = Math.hypot(hw, hh);
      const ok = samples.every((p) => {
        const x = p.x - hw, y = p.y - hh;
        if (x < bounds.x + 24 || y < bounds.y + 24 || x + w > bounds.x + bounds.w - 24 || y + h > bounds.y + bounds.h - 24) return false;
        if (obstacles.some((o) => rectsOverlap(x - 16, y - 16, w + 32, h + 32, o.x, o.y, o.w, o.h))) return false;
        if (swept.some((r) => rectsOverlap(x - 16, y - 16, w + 32, h + 32, r.x, r.y, r.w, r.h))) return false;
        return !avoid.some((a) => dist(p.x, p.y, a.x, a.y) < (a.r || 60) * 0.7 + reach);
      });
      if (!ok) continue;
      for (const p of samples) swept.push({ x: p.x - hw, y: p.y - hh, w, h });
      for (let i = 0; i < samples.length; i += 2) avoid.push({ x: samples[i].x, y: samples[i].y, r: reach + 26 });
      const ob = { x: 0, y: 0, w, h, mover: m };
      placeMover(ob);
      out.push(ob);
      break;
    }
  }
  return out;
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// Copie independante (une salle rejouee repart d'un etat propre).
function cloneMovingWall(ob) {
  const m = Object.assign({}, ob.mover);
  const c = { x: ob.x, y: ob.y, w: ob.w, h: ob.h, mover: m };
  placeMover(c);
  return c;
}

// Zone de terrain mobile : suit une trajectoire (lente) qui la garde entierement dans la salle.
// Renvoie true si une trajectoire valide a ete trouvee.
function attachZoneMover(zone, bounds, speedMult) {
  const r = zone.radius || 50;
  for (let tries = 0; tries < 30; tries++) {
    const m = makeMover(choice(MOVER_TYPES), zone.x, zone.y, 0, 0, speedMult || 0.55);
    const probe = Object.assign({}, m);
    let ok = true;
    for (let i = 0; i <= 32 && ok; i++) {
      if (m.closed) probe.s = (i / 32) * m.total; else probe.ph = (i / 32) * Math.PI;
      const p = moverCenter(probe);
      if (p.x - r < bounds.x + 10 || p.y - r < bounds.y + 10 || p.x + r > bounds.x + bounds.w - 10 || p.y + r > bounds.y + bounds.h - 10) ok = false;
    }
    if (!ok) continue;
    zone.mover = m;
    const c = moverCenter(m); zone.x = c.x; zone.y = c.y;
    return true;
  }
  return false;
}

function updateMovingZones(world, dt) {
  const room = world.room;
  if (!room || !room.terrainZones) return;
  for (const z of room.terrainZones) {
    if (!z.mover) continue;
    moverAdvance(z.mover, dt);
    const c = moverCenter(z.mover);
    z.x = c.x; z.y = c.y;
  }
}

// Deplace les murs puis entraine ce qu'ils poussent (joueur au sol, ennemis) : l'entite est
// deplacee du meme vecteur que le mur, puis recalee hors de tout obstacle.
function updateMovingWalls(world, dt) {
  updateMovingZones(world, dt);
  const room = world.room;
  if (!room || !room.obstacles) return;
  for (const ob of room.obstacles) {
    if (!ob.mover) continue;
    const ox = ob.x, oy = ob.y;
    moverAdvance(ob.mover, dt);
    placeMover(ob);
    const dx = ob.x - ox, dy = ob.y - oy;
    ob.vx = dt > 0 ? dx / dt : 0; ob.vy = dt > 0 ? dy / dt : 0;
    for (const p of worldPlayers(world)) {
      if (p.airborne || !circleRect(p.x, p.y, p.radius, ob.x, ob.y, ob.w, ob.h)) continue;
      const r = resolvePlayerPosition(world, p, p.x + dx, p.y + dy, p.x + dx, p.y + dy);
      p.x = r.x; p.y = r.y;
    }
    for (const e of world.enemies) {
      if (e.dead) continue;
      const er = e.radius || 16;
      if (!circleRect(e.x, e.y, er, ob.x, ob.y, ob.w, ob.h)) continue;
      e.x += dx; e.y += dy;
      const b = room.bounds;
      e.x = clamp(e.x, b.x + er, b.x + b.w - er);
      e.y = clamp(e.y, b.y + er, b.y + b.h - er);
    }
  }
}

// Les trajectoires des murs (et des zones) mobiles ne sont JAMAIS indiquees au joueur : ni rails,
// ni fleche de direction. (Fonction gardee pour un eventuel mode debug.)
function renderMovingWallRails(ctx, camera, room) {
  if (!room || !room.obstacles || !room.debugRails) return;
  for (const ob of room.obstacles) {
    const m = ob.mover;
    if (!m) continue;
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    ctx.beginPath();
    m.seq.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = Math.min(ob.w, ob.h) * 0.55;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,190,110,0.35)'; ctx.lineWidth = 2;
    ctx.setLineDash([7, 9]);
    ctx.lineDashOffset = -performance.now() / 60;
    ctx.stroke();
    ctx.setLineDash([]);
    if (!m.closed) {
      ctx.fillStyle = 'rgba(255,190,110,0.5)';
      for (const p of [m.seq[0], m.seq[m.seq.length - 1]]) { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
}

function drawMovingWall(ctx, sx, sy, ob, themeName) {
  const m = ob.mover;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(sx, sy, ob.w, ob.h);
  ctx.restore();
  const seed = m ? m.seed : (ob.seed || 0); // en ligne : seule la graine de texture est connue
  drawTexturedObstacle(ctx, sx, sy, ob.w, ob.h, themeName, seed, seed * 1.7);
  ctx.save();
  // bandes de danger aux extremites + liseré lumineux
  ctx.beginPath(); ctx.rect(sx, sy, ob.w, ob.h); ctx.clip();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffb14d';
  for (let k = -ob.h; k < ob.w + ob.h; k += 14) {
    ctx.beginPath();
    ctx.moveTo(sx + k, sy); ctx.lineTo(sx + k + 6, sy); ctx.lineTo(sx + k + 6 - ob.h, sy + ob.h); ctx.lineTo(sx + k - ob.h, sy + ob.h);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = '#ffb14d'; ctx.lineWidth = 2;
  ctx.shadowColor = '#ff9d3d'; ctx.shadowBlur = 8;
  ctx.strokeRect(sx + 1, sy + 1, ob.w - 2, ob.h - 2);
  const sp = Math.hypot(ob.vx || 0, ob.vy || 0);
  if (sp > 5 && ob.debugArrow) {
    const a = Math.atan2(ob.vy, ob.vx);
    ctx.translate(sx + ob.w / 2, sy + ob.h / 2); ctx.rotate(a);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,240,200,0.9)';
    const s = Math.min(ob.w, ob.h) * 0.28;
    ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.6, -s * 0.7); ctx.lineTo(-s * 0.2, 0); ctx.lineTo(-s * 0.6, s * 0.7); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
