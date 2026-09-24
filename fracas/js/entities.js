// Entites partagees : projectiles, zones, murs, boucliers, mines, vents, meteores
// Toutes vivent dans les tableaux de World (voir game.js) et sont mises a jour/dessinees ici.

function makeProjectile(p) {
  return Object.assign({
    id: uid(), kind: 'projectile', team: TEAM.ENEMY,
    x: 0, y: 0, vx: 0, vy: 0, radius: 6,
    dmgPercent: 10, dmgValue: 0,
    life: 3, age: 0,
    bounces: 0, maxBounces: 0, bounceGrowth: 0,
    color: COLORS.projEnemy, shape: 'circle',
    homing: 0, dead: false, pierce: false, hitOnce: true, _hitIds: null,
    onBounce: null, onExpire: null, onHitPlayer: null, onHitEnemy: null,
    ignoreWalls: false,
  }, p);
}

// Reflechit un projectile sur un rectangle (normale = point le plus proche, donc faces ET coins).
// Renvoie true s'il y a eu contact. killIfNoBounce : un projectile non rebondissant meurt au contact.
function reflectProjectileOnRect(world, pr, rx, ry, rw, rh, killIfNoBounce) {
  if (!circleRect(pr.x, pr.y, pr.radius, rx, ry, rw, rh)) return false;
  const cx = clamp(pr.x, rx, rx + rw);
  const cy = clamp(pr.y, ry, ry + rh);
  const ddx = pr.x - cx, ddy = pr.y - cy;
  const dd = Math.hypot(ddx, ddy);
  let nx, ny;
  if (dd > 0.001) { nx = ddx / dd; ny = ddy / dd; }
  else {
    // Centre deja a l'interieur : on ressort par la face la plus proche de la position precedente.
    const px = pr.prevX != null ? pr.prevX : pr.x, py = pr.prevY != null ? pr.prevY : pr.y;
    const dl = px - rx, dr = rx + rw - px, dt2 = py - ry, db = ry + rh - py;
    const m = Math.min(dl, dr, dt2, db);
    if (m === dl) { nx = -1; ny = 0; } else if (m === dr) { nx = 1; ny = 0; }
    else if (m === dt2) { nx = 0; ny = -1; } else { nx = 0; ny = 1; }
  }
  if (dd > 0.001) { pr.x = cx + nx * (pr.radius + 0.5); pr.y = cy + ny * (pr.radius + 0.5); }
  else if (nx !== 0) { pr.x = (nx < 0 ? rx : rx + rw) + nx * (pr.radius + 0.5); }
  else { pr.y = (ny < 0 ? ry : ry + rh) + ny * (pr.radius + 0.5); }
  const dot = pr.vx * nx + pr.vy * ny;
  if (dot < 0) { pr.vx -= 2 * dot * nx; pr.vy -= 2 * dot * ny; }
  if (pr.maxBounces > 0) {
    pr.bounces++;
    if (pr.bounceGrowth) pr.dmgValue *= (1 + pr.bounceGrowth);
    if (pr.dmgCap) pr.dmgValue = Math.min(pr.dmgValue, pr.dmgCap);
    Particles.burst(pr.x, pr.y, 6, pr.color, { maxSpeed: 90 });
    if (pr.onBounce) pr.onBounce(pr, world);
    if (pr.bounces > pr.maxBounces) { pr.dead = true; if (pr.onExpire) pr.onExpire(pr, world); }
  } else if (killIfNoBounce) {
    pr.dead = true;
  }
  return true;
}

function updateProjectiles(world, dt) {
  const arr = world.projectiles;
  for (let i = arr.length - 1; i >= 0; i--) {
    const pr = arr[i];
    pr.age += dt;
    if (pr._bounceGrace > 0) pr._bounceGrace -= dt;
    if (pr.homing && pr.target && !pr.target.dead) {
      const desired = normalize(pr.target.x - pr.x, pr.target.y - pr.y);
      const speed = Math.hypot(pr.vx, pr.vy) || 200;
      const cur = normalize(pr.vx, pr.vy);
      const nx = lerp(cur.x, desired.x, clamp(pr.homing * dt, 0, 1));
      const ny = lerp(cur.y, desired.y, clamp(pr.homing * dt, 0, 1));
      const n = normalize(nx, ny);
      pr.vx = n.x * speed; pr.vy = n.y * speed;
    }
    pr.prevX = pr.x; pr.prevY = pr.y;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;

    if (!pr.ignoreWalls && world.room) {
      const b = world.room.bounds;
      let bounced = false;
      if (pr.x - pr.radius < b.x) { pr.x = b.x + pr.radius; pr.vx = Math.abs(pr.vx); bounced = true; }
      if (pr.x + pr.radius > b.x + b.w) { pr.x = b.x + b.w - pr.radius; pr.vx = -Math.abs(pr.vx); bounced = true; }
      if (pr.y - pr.radius < b.y) { pr.y = b.y + pr.radius; pr.vy = Math.abs(pr.vy); bounced = true; }
      if (pr.y + pr.radius > b.y + b.h) { pr.y = b.y + b.h - pr.radius; pr.vy = -Math.abs(pr.vy); bounced = true; }
      if (bounced) {
        if (pr.maxBounces > 0) {
          pr.bounces++;
          if (pr.bounceGrowth) pr.dmgPercent *= (1 + pr.bounceGrowth);
          if (pr.dmgValue) pr.dmgValue *= (1 + pr.bounceGrowth);
          if (pr.dmgCap) pr.dmgValue = Math.min(pr.dmgValue, pr.dmgCap);
          Particles.burst(pr.x, pr.y, 6, pr.color, { maxSpeed: 90 });
          if (pr.onBounce) pr.onBounce(pr, world);
          if (pr.bounces > pr.maxBounces) { pr.dead = true; if (pr.onExpire) pr.onExpire(pr, world); }
        } else {
          pr.dead = true;
        }
      }
    }

    // Tirs des pieges de parcours : arretes par les obstacles de la salle.
    if (!pr.dead && pr.stopOnObstacles && world.room) {
      for (const ob of world.room.obstacles) {
        if (circleRect(pr.x, pr.y, pr.radius, ob.x, ob.y, ob.w, ob.h)) { pr.dead = true; Particles.burst(pr.x, pr.y, 5, pr.color, { maxSpeed: 70 }); break; }
      }
    }
    // Murs poses (ex : Ferro) : un projectile qui le touche rebondit dessus comme sur un ennemi.
    if (!pr.dead && !pr.ignoreWalls && world.walls && world.walls.length) {
      for (const w of world.walls) {
        if (reflectProjectileOnRect(world, pr, w.x - w.w / 2, w.y - w.h / 2, w.w, w.h, true)) break;
      }
    }
    // Obstacles de la salle : les projectiles rebondissants (ex : couteaux de Ferro) rebondissent
    // sur n'importe quelle face/coin ; les autres les traversent comme avant.
    if (!pr.dead && !pr.ignoreWalls && pr.maxBounces > 0 && world.room && world.room.obstacles) {
      for (const ob of world.room.obstacles) {
        if (reflectProjectileOnRect(world, pr, ob.x, ob.y, ob.w, ob.h, false)) break;
      }
    }

    if (pr.age >= pr.life) { pr.dead = true; if (pr.onExpire) pr.onExpire(pr, world); }
    if (pr.dead) arr.splice(i, 1);
  }
}

function drawProjectiles(ctx, camera, world) {
  for (const pr of world.projectiles) {
    const sx = pr.x - camera.x, sy = pr.y - camera.y;
    if (pr.team === TEAM.ENEMY) { drawEnemyProjectile(ctx, pr, sx, sy); continue; }
    ctx.save();
    ctx.fillStyle = pr.color;
    ctx.shadowColor = pr.color;
    ctx.shadowBlur = 6;
    if (pr.shape === 'rect') {
      ctx.translate(sx, sy);
      if (pr.angle) ctx.rotate(pr.angle);
      ctx.fillRect(-pr.radius, -pr.radius * 0.4, pr.radius * 2, pr.radius * 0.8);
    } else if (pr.shape === 'knife') {
      const ang = Math.atan2(pr.vy, pr.vx);
      ctx.translate(sx, sy); ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(pr.radius * 1.4, 0);
      ctx.lineTo(-pr.radius, pr.radius * 0.5);
      ctx.lineTo(-pr.radius, -pr.radius * 0.5);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(sx, sy, pr.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---------- Zones (danger / terrain / effets ponctuels) ----------
function makeZone(z) {
  return Object.assign({
    id: uid(), kind: 'zone', shape: 'circle', x: 0, y: 0, radius: 60,
    w: 0, h: 0, duration: 1, age: 0, telegraph: 0, telegraphAge: 0,
    color: COLORS.danger, edgeColor: COLORS.dangerEdge,
    tickInterval: 0.5, tickTimer: 0, dmgPercent: 0, team: TEAM.ENEMY,
    dead: false, onTick: null, onExpire: null, terrainType: null, persistent: false,
  }, z);
}

function zoneContainsPoint(z, px, py) {
  if (z.shape === 'rect') return pointInRect(px, py, z.x - z.w / 2, z.y - z.h / 2, z.w, z.h);
  return dist2(z.x, z.y, px, py) <= z.radius * z.radius;
}

function updateZones(world, dt) {
  const arr = world.zones;
  for (let i = arr.length - 1; i >= 0; i--) {
    const z = arr[i];
    if (z.telegraphAge < z.telegraph) {
      z.telegraphAge += dt;
      if (z.telegraphAge >= z.telegraph && z.onActivate) z.onActivate(z, world);
      continue;
    }
    z.age += dt;
    z.tickTimer += dt;
    if (z.tickTimer >= z.tickInterval) {
      z.tickTimer = 0;
      if (z.onTick) z.onTick(z, world);
    }
    if (!z.persistent && z.age >= z.duration) {
      z.dead = true;
      if (z.onExpire) z.onExpire(z, world);
    }
    if (z.dead) arr.splice(i, 1);
  }
}

function drawZones(ctx, camera, world) {
  for (const z of world.zones) {
    const sx = z.x - camera.x, sy = z.y - camera.y;
    const active = z.telegraphAge >= z.telegraph;
    if (active && z.terrainType && TERRAIN_TYPES.includes(z.terrainType) && z.shape !== 'rect') {
      drawTerrainZone(ctx, sx, sy, z);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = active ? 0.85 : 0.4 + 0.3 * Math.sin(z.telegraphAge * 12);
    ctx.strokeStyle = z.edgeColor;
    ctx.fillStyle = z.color;
    ctx.lineWidth = 2;
    if (z.shape === 'rect') {
      ctx.beginPath();
      ctx.rect(sx - z.w / 2, sy - z.h / 2, z.w, z.h);
      ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(sx, sy, z.radius, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------- Murs ----------
function makeWall(w) {
  return Object.assign({ id: uid(), kind: 'wall', x: 0, y: 0, w: 48, h: 48, duration: 8, age: 0, dead: false, color: '#7a7a8a' }, w);
}
function updateWalls(world, dt) {
  const arr = world.walls;
  for (let i = arr.length - 1; i >= 0; i--) {
    const w = arr[i];
    w.age += dt;
    if (w.age >= w.duration) arr.splice(i, 1);
  }
}
function drawWalls(ctx, camera, world) {
  for (const w of world.walls) {
    const sx = w.x - camera.x - w.w / 2, sy = w.y - camera.y - w.h / 2;
    ctx.save();
    ctx.fillStyle = w.color;
    ctx.strokeStyle = '#dcdce6';
    ctx.lineWidth = 2;
    ctx.fillRect(sx, sy, w.w, w.h);
    ctx.strokeRect(sx, sy, w.w, w.h);
    ctx.restore();
  }
}

// ---------- Boucliers (bloquent les projectiles) ----------
function makeShield(s) {
  return Object.assign({ id: uid(), kind: 'shield', x: 0, y: 0, radius: 40, duration: 6, age: 0, color: '#7fd8ff', blocksTeam: TEAM.ENEMY, follow: null }, s);
}
function updateShields(world, dt) {
  const arr = world.shields;
  for (let i = arr.length - 1; i >= 0; i--) {
    const s = arr[i];
    s.age += dt;
    if (s.follow) { s.x = s.follow.x; s.y = s.follow.y; }
    if (s.age >= s.duration) arr.splice(i, 1);
  }
}
function drawShields(ctx, camera, world) {
  for (const s of world.shields) {
    const sx = s.x - camera.x, sy = s.y - camera.y;
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.2 * Math.sin(s.age * 8);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, s.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ---------- Mines ----------
function makeMine(m) {
  return Object.assign({ id: uid(), kind: 'mine', x: 0, y: 0, radius: 12, armed: true, triggerRadius: 22, dead: false, team: TEAM.PLAYER, dmgPercent: 10, color: '#ffd23d' }, m);
}
function drawMines(ctx, camera, world) {
  for (const m of world.mines) {
    const sx = m.x - camera.x, sy = m.y - camera.y;
    ctx.save();
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(sx, sy, m.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff3d5a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, m.radius + 3 + Math.sin(performance.now() / 150) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ---------- Vents ----------
function makeWind(w) {
  return Object.assign({
    id: uid(), kind: 'wind', x: 0, y: 0, w: 140, h: 140, dirX: 1, dirY: 0,
    duration: 8, age: 0, dead: false, force: 60, dmgPercent: 0, vertical: false,
    strong: false, color: COLORS.wind,
  }, w);
}
function updateWinds(world, dt) {
  const arr = world.winds;
  for (let i = arr.length - 1; i >= 0; i--) {
    const w = arr[i];
    w.age += dt;
    if (w.age >= w.duration) arr.splice(i, 1);
  }
}
function drawWinds(ctx, camera, world) {
  for (const w of world.winds) {
    const cx = w.x - camera.x, cy = w.y - camera.y;
    const ang = w.vertical ? -Math.PI / 2 : Math.atan2(w.dirY, w.dirX);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    const half = Math.max(w.w, w.h) / 2;

    const grad = ctx.createLinearGradient(-half, 0, half, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, w.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = w.strong ? 0.28 : 0.18;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(-half, -Math.min(w.w, w.h) / 2, half * 2, Math.min(w.w, w.h), 14);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([2, 6]);
    ctx.beginPath(); ctx.moveTo(-half, 0); ctx.lineTo(half, 0); ctx.stroke();
    ctx.setLineDash([]);

    const t = performance.now() / (w.strong ? 220 : 320);
    const streaks = w.strong ? 7 : 5;
    ctx.strokeStyle = w.color;
    ctx.lineWidth = w.strong ? 3 : 2;
    ctx.shadowColor = w.color; ctx.shadowBlur = 6;
    for (let i = 0; i < streaks; i++) {
      const off = ((t + i / streaks) % 1);
      const xx = -half + off * half * 2;
      const lane = ((i * 37) % (Math.min(w.w, w.h) - 16)) - (Math.min(w.w, w.h) - 16) / 2;
      ctx.globalAlpha = 0.75 * Math.sin(off * Math.PI);
      ctx.beginPath();
      ctx.moveTo(xx - 12, lane); ctx.lineTo(xx, lane); ctx.lineTo(xx - 6, lane - 5);
      ctx.moveTo(xx, lane); ctx.lineTo(xx - 6, lane + 5);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // fleche centrale : indique precisement la direction de poussee
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = w.color;
    ctx.beginPath();
    ctx.moveTo(half * 0.7, 0);
    ctx.lineTo(half * 0.45, -14);
    ctx.lineTo(half * 0.45, -5);
    ctx.lineTo(-half * 0.6, -5);
    ctx.lineTo(-half * 0.6, 5);
    ctx.lineTo(half * 0.45, 5);
    ctx.lineTo(half * 0.45, 14);
    ctx.closePath();
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.restore();
  }
}

// ---------- Meteores (charge + impact telegraphie) ----------
function makeMeteorMarker(m) {
  return Object.assign({ id: uid(), kind: 'meteor', x: 0, y: 0, radius: 50, fallDelay: 1, age: 0, dmgPercent: 20, dead: false, exploded: false }, m);
}
function updateMeteors(world, dt) {
  const arr = world.meteors;
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i];
    m.age += dt;
    if (!m.exploded && m.age >= m.fallDelay) {
      m.exploded = true;
      Particles.burst(m.x, m.y, 24, '#ff7a3d', { maxSpeed: 220, life: 0.5 });
      if (m.onImpact) m.onImpact(m, world);
      m.dead = true;
    }
    if (m.dead) arr.splice(i, 1);
  }
}
function drawMeteors(ctx, camera, world) {
  for (const m of world.meteors) {
    const sx = m.x - camera.x, sy = m.y - camera.y;
    const t = clamp(m.age / m.fallDelay, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.55 * t;
    ctx.strokeStyle = '#ff7a3d';
    ctx.fillStyle = 'rgba(255,122,61,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, m.radius, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
