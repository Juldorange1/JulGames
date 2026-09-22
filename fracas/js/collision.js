// Resolution des collisions entre les differentes familles d'entites

function resolveCollisions(world, dt, realDt) {
  resolveShieldBlocking(world);
  resolveProjectileVsPlayer(world);
  resolveProjectileVsEnemies(world);
  resolveMines(world, dt);
  resolveWinds(world, dt, realDt);
  resolveEnemyContactWithPlayer(world);
  resolveEnemyObstacles(world);
}

// Aucun ennemi ne doit jamais rester a l'interieur d'un mur/obstacle, quelle que soit la cause
// (deplacement normal, poussee, teleportation) : on le repousse hors du rectangle le plus proche.
function resolveEnemyObstacles(world) {
  if (!world.room || world.room.obstacles.length === 0) return;
  for (const e of world.enemies) {
    if (e.dead) continue;
    const r = e.radius || 16;
    for (const ob of world.room.obstacles) {
      if (!circleRect(e.x, e.y, r, ob.x, ob.y, ob.w, ob.h)) continue;
      const cx = clamp(e.x, ob.x, ob.x + ob.w);
      const cy = clamp(e.y, ob.y, ob.y + ob.h);
      const dx = e.x - cx, dy = e.y - cy;
      const d = Math.hypot(dx, dy);
      if (d > 0.001) {
        const push = r - d + 0.5;
        e.x += (dx / d) * push;
        e.y += (dy / d) * push;
      } else {
        const left = e.x - ob.x, right = (ob.x + ob.w) - e.x;
        const top = e.y - ob.y, bottom = (ob.y + ob.h) - e.y;
        const min = Math.min(left, right, top, bottom);
        if (min === left) e.x = ob.x - r;
        else if (min === right) e.x = ob.x + ob.w + r;
        else if (min === top) e.y = ob.y - r;
        else e.y = ob.y + ob.h + r;
      }
    }
  }
}

function resolveShieldBlocking(world) {
  if (world.shields.length === 0) return;
  for (let i = world.projectiles.length - 1; i >= 0; i--) {
    const pr = world.projectiles[i];
    for (const s of world.shields) {
      if (s.blocksTeam !== pr.team) continue;
      if (circleCircle(pr.x, pr.y, pr.radius, s.x, s.y, s.radius)) {
        Particles.burst(pr.x, pr.y, 8, s.color, { maxSpeed: 100, life: 0.2 });
        pr.dead = true;
        world.projectiles.splice(i, 1);
        break;
      }
    }
  }
}

function resolveProjectileVsPlayer(world) {
  const player = world.player;
  if (!player) return;
  for (let i = world.projectiles.length - 1; i >= 0; i--) {
    const pr = world.projectiles[i];
    if (pr.team !== TEAM.ENEMY) continue;
    if (!circleCircle(pr.x, pr.y, pr.radius, player.x, player.y, player.radius)) continue;
    if (pr.onHitPlayer) pr.onHitPlayer(pr, world, player);
    else playerApplyDamage(player, pr.dmgPercent || 0);
    Audio2.impact();
    if (!pr.pierce) { world.projectiles.splice(i, 1); }
  }
}

function resolveProjectileVsEnemies(world) {
  for (let i = world.projectiles.length - 1; i >= 0; i--) {
    const pr = world.projectiles[i];
    if (pr.team !== TEAM.PLAYER) continue;
    let consumed = false;
    for (const e of world.enemies) {
      if (e.dead) continue;
      if (pr._hitIds && pr._hitIds.has(e.id)) continue;
      if (pr._bounceEnemyId === e.id && pr._bounceGrace > 0) continue;
      if (!circleCircle(pr.x, pr.y, pr.radius, e.x, e.y, e.radius || 16)) continue;
      const dmg = pr.dmgValue || 0;
      damageEnemy(world, e, dmg, pr);
      if (pr.onHitEnemy) pr.onHitEnemy(pr, world, e);
      if (pr._hitIds) pr._hitIds.add(e.id);
      if (pr.maxBounces > 0 && pr.bounces < pr.maxBounces) {
        // Rebondit exactement a la surface de l'ennemi (pas a l'interieur) : on retrouve le point
        // d'entree du trajet de cette frame sur le cercle combine, puis on reflechit la vitesse
        // selon la normale a CE point precis.
        const combinedR = pr.radius + (e.radius || 16);
        const px0 = pr.prevX != null ? pr.prevX : pr.x - pr.vx * 0.016;
        const py0 = pr.prevY != null ? pr.prevY : pr.y - pr.vy * 0.016;
        const segDx = pr.x - px0, segDy = pr.y - py0;
        const tHit = segmentCircleEntry(px0, py0, segDx, segDy, e.x, e.y, combinedR);
        const contactX = tHit != null ? px0 + segDx * tHit : pr.x;
        const contactY = tHit != null ? py0 + segDy * tHit : pr.y;
        const n = normalize(contactX - e.x, contactY - e.y);
        const nx = n.x || 1, ny = n.y || 0;
        const dot = pr.vx * nx + pr.vy * ny;
        pr.vx = pr.vx - 2 * dot * nx;
        pr.vy = pr.vy - 2 * dot * ny;
        pr.x = e.x + nx * (combinedR + 0.5); pr.y = e.y + ny * (combinedR + 0.5);
        pr.bounces++;
        if (pr.bounceGrowth) pr.dmgValue *= (1 + pr.bounceGrowth);
        pr._bounceEnemyId = e.id; pr._bounceGrace = 0.12;
        Particles.burst(pr.x, pr.y, 6, pr.color, { maxSpeed: 90 });
        if (pr.onBounce) pr.onBounce(pr, world);
        break;
      }
      if (!pr.pierce) { consumed = true; break; }
    }
    if (consumed) { world.projectiles.splice(i, 1); }
  }
}

function resolveMines(world, dt) {
  for (let i = world.mines.length - 1; i >= 0; i--) {
    const m = world.mines[i];
    if (m.dead) { world.mines.splice(i, 1); continue; }
    if (!m.armed) continue;
    const player = world.player;
    if (player && circleCircle(m.x, m.y, m.triggerRadius, player.x, player.y, player.radius)) {
      playerApplyDamage(player, m.dmgPercent || 10);
      Particles.burst(m.x, m.y, 18, '#ffd23d', { maxSpeed: 200 });
      Audio2.impact();
      m.dead = true;
      world.mines.splice(i, 1);
      continue;
    }
    for (const e of world.enemies) {
      if (e.dead) continue;
      if (circleCircle(m.x, m.y, m.triggerRadius, e.x, e.y, e.radius || 16)) {
        damageEnemy(world, e, 25, m);
        Particles.burst(m.x, m.y, 18, '#ffd23d', { maxSpeed: 200 });
        m.dead = true;
        world.mines.splice(i, 1);
        break;
      }
    }
  }
}

function resolveWinds(world, dt, realDt) {
  if (world.winds.length === 0) return;
  const tickDt = realDt != null ? realDt : dt;
  const touchedThisFrame = new Set();
  for (const w of world.winds) {
    const rx = w.x - w.w / 2, ry = w.y - w.h / 2;
    // Projectiles : le vent vertical propulse tout projectile qui le touche
    if (w.vertical) {
      for (let i = world.projectiles.length - 1; i >= 0; i--) {
        const pr = world.projectiles[i];
        if (pointInRect(pr.x, pr.y, rx, ry, w.w, w.h)) {
          Particles.burst(pr.x, pr.y, 10, COLORS.wind, { maxSpeed: 140, life: 0.3 });
          world.projectiles.splice(i, 1);
        }
      }
      continue;
    }
    const force = (w.strong ? w.force * 3 : w.force);
    for (const e of world.enemies) {
      if (e.dead) continue;
      if (!pointInRect(e.x, e.y, rx, ry, w.w, w.h)) continue;
      e.x += w.dirX * force * dt;
      e.y += w.dirY * force * dt;
      touchedThisFrame.add(e);
      if (world.room) {
        const b = world.room.bounds;
        const hitBound = e.x - (e.radius || 16) < b.x || e.x + (e.radius || 16) > b.x + b.w ||
          e.y - (e.radius || 16) < b.y || e.y + (e.radius || 16) > b.y + b.h;
        e.x = clamp(e.x, b.x + (e.radius || 16), b.x + b.w - (e.radius || 16));
        e.y = clamp(e.y, b.y + (e.radius || 16), b.y + b.h - (e.radius || 16));
        if (w.strong && hitBound && !e._wallSlamHit) {
          e._wallSlamHit = true;
          damageEnemy(world, e, 40, w);
        }
      }
      let obstacleHit = false;
      if (world.room) {
        for (const ob of world.room.obstacles) {
          if (circleRect(e.x, e.y, e.radius || 16, ob.x, ob.y, ob.w, ob.h)) { obstacleHit = true; break; }
        }
      }
      if (w.strong && obstacleHit && !e._wallSlamHit) {
        e._wallSlamHit = true;
        damageEnemy(world, e, 40, w);
      }
      if (!obstacleHit) e._wallSlamHit = false;
    }
    // pousse legerement les objets interactifs (tourelles deplacables ne sont pas concernees ici)
  }
  // Cadence de degats en vrai temps ecoule, appliquee une seule fois par ennemi et par frame meme
  // s'il est touche par plusieurs zones de vent simultanement : jamais plus d'une fois toutes les
  // 0,5s reelles, quel que soit le multiplicateur de vitesse du jeu ou le nombre de zones superposees.
  for (const e of touchedThisFrame) {
    e._windTick = (e._windTick || 0) + tickDt;
    if (e._windTick >= 0.5) { e._windTick = 0; damageEnemy(world, e, 6, world); }
  }
}

function resolveEnemyContactWithPlayer(world) {
  const player = world.player;
  if (!player) return;
  for (const e of world.enemies) {
    if (e.dead || !e.contactDmgPercent) continue;
    if (circleCircle(e.x, e.y, e.radius || 16, player.x, player.y, player.radius)) {
      e._contactTick = (e._contactTick || 0) + (1 / 60);
      if (e._contactTick >= 0.6) { e._contactTick = 0; playerApplyDamage(player, e.contactDmgPercent); }
    } else e._contactTick = 0;
  }
}
