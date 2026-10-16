// Objets de salle : trampolines, teleporteurs (salles du Monde, Infini, base) et boosts de
// vitesse (achetes au marche de la base). room.props = { time, trampolines, teleporters, boosts }.

const JUMP_TIME = 0.6;          // duree d'un saut de trampoline
const BOOST_MULT = 1.6;         // boost de vitesse ramasse : +60%...
const BOOST_TIME = 3;           // ...pendant 3 s
const HUB_BOOST_RESPAWN = 10;   // boost de la base : reapparait 10 s apres avoir ete ramasse

function makeRoomProps(o) {
  return Object.assign({ time: 0, trampolines: [], teleporters: [], boosts: [] }, o || {});
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

// Point libre le plus proche (jamais dans un mur ni hors de la salle) pour les teleportations.
function roomSafeSpot(world, x, y, r) {
  const b = world.room.bounds;
  const ok = (px, py) => px > b.x + r && px < b.x + b.w - r && py > b.y + r && py < b.y + b.h - r
    && !world.room.obstacles.some((o) => circleRect(px, py, r, o.x, o.y, o.w, o.h));
  x = clamp(x, b.x + r + 1, b.x + b.w - r - 1);
  y = clamp(y, b.y + r + 1, b.y + b.h - r - 1);
  if (ok(x, y)) return { x, y };
  for (let d = 8; d <= 240; d += 8) {
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      if (ok(px, py)) return { x: px, y: py };
    }
  }
  return null;
}

function updateRoomObjects(world, dt) {
  const P = world.room && world.room.props;
  const players = worldPlayers(world);
  if (!P || !players.length) return;
  P.time += dt;
  for (const t of P.trampolines) if (t.bounce > 0) t.bounce -= dt;
  for (const p of players) updateRoomObjectsFor(world, P, p, dt);
}

function updateRoomObjectsFor(world, P, p, dt) {
  if (p.boostTimer > 0) p.boostTimer -= dt;
  if (p._tpCd > 0) p._tpCd -= dt;
  // Saut de trampoline : trajectoire imposee, au-dessus des murs, zones et tirs.
  if (p.jump) {
    const j = p.jump;
    j.t += dt;
    const f = clamp(j.t / j.dur, 0, 1);
    p.x = lerp(j.x0, j.x1, f); p.y = lerp(j.y0, j.y1, f);
    p.airScale = 1 + 0.6 * Math.sin(Math.PI * f);
    p.airborne = true;
    if (f >= 1) {
      p.jump = null; p.airborne = false; p.airScale = 1;
      if (p.character && p.character.onTrampolineLand) p.character.onTrampolineLand(world, p); // ex. Nyx : 4 projectiles
      Particles.ring(p.x, p.y, 26, '#ffd23d', 0.25);
      Particles.burst(p.x, p.y, 10, '#ffe08a', { maxSpeed: 120 });
      Audio2.land();
    }
    return;
  }
  for (const b of P.boosts) {
    if (b.taken && b.respawnAt != null && P.time >= b.respawnAt) { b.taken = false; b.respawnAt = null; Particles.ring(b.x, b.y, 16, '#ffd23d', 0.3); }
    if (b.taken) continue;
    if (Math.hypot(b.x - p.x, b.y - p.y) < p.radius + 14) {
      b.taken = true;
      if (b.respawn) b.respawnAt = P.time + HUB_BOOST_RESPAWN;
      p.boostTimer = BOOST_TIME;
      Particles.text(p.x, p.y - 26, 'BOOST', '#ffd23d');
      Particles.burst(b.x, b.y, 16, '#ffd23d', { maxSpeed: 160 });
      Audio2.pickup();
    }
  }
  if (!(p._tpCd > 0)) {
    for (const t of P.teleporters) {
      if (Math.hypot(t.ax - p.x, t.ay - p.y) < 20) {
        Particles.burst(p.x, p.y, 18, '#7fd8ff', { maxSpeed: 160 });
        p.x = t.bx; p.y = t.by;
        p._tpCd = 0.5;
        Particles.ring(t.bx, t.by, 30, '#7fd8ff', 0.3);
        Audio2.teleport();
        break;
      }
    }
  }
  for (const t of P.trampolines) {
    if (Math.hypot(t.x - p.x, t.y - p.y) < 20) {
      p.jump = { x0: p.x, y0: p.y, x1: t.lx, y1: t.ly, t: 0, dur: JUMP_TIME };
      p.airborne = true;
      t.bounce = 0.3;
      Audio2.bounce();
      break;
    }
  }
}

// ---------- Rendu (au sol : trampolines, teleporteurs, boosts, ombre des joueurs en l'air) ----------
function renderRoomObjects(ctx, camera, world) {
  const P = world.room && world.room.props;
  if (!P) return;
  const t = performance.now() / 1000;
  for (const tr of P.trampolines) drawTrampoline(ctx, tr, camera, t);
  for (const tp of P.teleporters) {
    drawTeleporterPad(ctx, tp.ax - camera.x, tp.ay - camera.y, t, true);
    drawTeleporterPad(ctx, tp.bx - camera.x, tp.by - camera.y, t, false);
  }
  for (const bo of P.boosts) if (!bo.taken) drawBoostPickup(ctx, bo.x - camera.x, bo.y - camera.y, t, bo.x);
  for (const p of (world.players || [world.player])) {
    if (!p || !p.jump) continue;
    const k = p.airScale || 1;
    ctx.save();
    ctx.globalAlpha = 0.35 / k;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(p.x - camera.x, p.y - camera.y + 10, 14 / k, 6 / k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawTrampoline(ctx, tr, camera, t) {
  const sx = tr.x - camera.x, sy = tr.y - camera.y;
  const lx = tr.lx - camera.x, ly = tr.ly - camera.y;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,210,61,0.22)'; ctx.lineWidth = 2; ctx.setLineDash([4, 7]);
  ctx.beginPath(); ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo((sx + lx) / 2, (sy + ly) / 2 - 50, lx, ly); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(lx, ly, 10, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  const squash = tr.bounce > 0 ? 1 - tr.bounce : 1;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(2, 4, 20, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2a34'; ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, 0, 19, 19 * (0.75 + 0.25 * squash), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 14);
  g.addColorStop(0, '#4a4a5a'); g.addColorStop(1, '#16161e');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 14 * (0.75 + 0.25 * squash), 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(Math.atan2(tr.ly - tr.y, tr.lx - tr.x));
  ctx.fillStyle = `rgba(255,210,61,${0.6 + 0.3 * Math.sin(t * 6)})`;
  ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-3, -6); ctx.lineTo(-3, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawTeleporterPad(ctx, sx, sy, t, isEntry) {
  ctx.save();
  ctx.translate(sx, sy);
  const col = isEntry ? '#7fd8ff' : '#b47cff';
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
  g.addColorStop(0, isEntry ? 'rgba(200,245,255,0.7)' : 'rgba(220,190,255,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.shadowColor = col; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0; ctx.lineWidth = 2;
  const spin = t * (isEntry ? 3 : -1.5);
  for (let i = 0; i < 3; i++) {
    const a = spin + i * Math.PI * 2 / 3;
    ctx.beginPath(); ctx.arc(0, 0, 12, a, a + 1.2); ctx.stroke();
  }
  if (!isEntry) { ctx.fillStyle = col; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function drawBoostPickup(ctx, sx, sy, t, seed) {
  const bob = Math.sin(t * 3 + seed) * 3;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 10, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(sx, sy - 4 + bob);
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
  g.addColorStop(0, '#fff6c8'); g.addColorStop(0.6, '#ffd23d'); g.addColorStop(1, 'rgba(255,160,40,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a4a00';
  for (const off of [-4, 2]) {
    ctx.beginPath();
    ctx.moveTo(off - 2, -5); ctx.lineTo(off + 3, 0); ctx.lineTo(off - 2, 5); ctx.lineTo(off + 1, 5); ctx.lineTo(off + 6, 0); ctx.lineTo(off + 1, -5);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
