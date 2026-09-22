// Fonctions de combat partagees entre personnages, tourelles et boss

function enemiesInRadius(world, x, y, radius) {
  const out = [];
  for (const e of world.enemies) {
    if (e.dead) continue;
    if (dist2(e.x, e.y, x, y) <= (radius + (e.radius || 0)) * (radius + (e.radius || 0))) out.push(e);
  }
  return out;
}

function nearestEnemy(world, x, y, maxRadius) {
  let best = null, bestD = maxRadius ? maxRadius * maxRadius : Infinity;
  for (const e of world.enemies) {
    if (e.dead) continue;
    const d = dist2(e.x, e.y, x, y);
    if (d <= bestD) { bestD = d; best = e; }
  }
  return best;
}

function nearestTurret(world, x, y, maxRadius) {
  let best = null, bestD = maxRadius ? maxRadius * maxRadius : Infinity;
  for (const e of world.enemies) {
    if (e.dead || e.kind !== 'turret') continue;
    const d = dist2(e.x, e.y, x, y);
    if (d <= bestD) { bestD = d; best = e; }
  }
  return best;
}

function damageEnemy(world, enemy, amount, source) {
  if (!enemy || enemy.dead || amount <= 0) return;
  // Tous les degats infliges par le joueur (attaques, projectiles, mines, vent...) passent par ici :
  // le pourcentage affiche dans le HUD ("DEGATS : X%") doit reellement les mettre a l'echelle.
  const mult = world.player ? world.player.damageMultiplier : 1;
  amount *= mult;
  if (amount <= 0) return;
  enemy.hp -= amount;
  Particles.text(enemy.x, enemy.y - (enemy.radius || 16) - 6, `-${Math.round(amount)}`, '#ffd23d');
  Particles.burst(enemy.x, enemy.y, 5, '#ffd23d', { maxSpeed: 90, life: 0.25 });
  if (enemy.hp <= 0 && !enemy.dead) {
    enemy.dead = true;
    // La salle de test ne compte jamais rien (ni kills du repertoire, ni argent) : c'est un bac a sable.
    if (enemy.type !== 'DUMMY' && Game.state !== STATE.TEST_ROOM) Save.recordKill(enemy.type);
    const isBoss = enemy.kind === 'boss';
    Particles.burst(enemy.x, enemy.y, isBoss ? 46 : 22, isBoss ? '#ff3d5a' : '#ff9d5d', { maxSpeed: isBoss ? 320 : 220, life: isBoss ? 0.7 : 0.5, gravity: 60 });
    Particles.ring(enemy.x, enemy.y, (enemy.radius || 16) * (isBoss ? 3.5 : 2.2), isBoss ? '#ff3d5a' : '#ff9d5d', isBoss ? 0.55 : 0.35);
    if (isBoss) { Audio2.boss(); if (Game.shakeCamera) Game.shakeCamera(10, 0.3); } else Audio2.turretDown();
    if (world.onEnemyKilled) world.onEnemyKilled(enemy);
  }
}

function spawnPlayerProjectile(world, player, opts) {
  const pr = makeProjectile(Object.assign({ team: TEAM.PLAYER, color: COLORS.projPlayer }, opts));
  world.projectiles.push(pr);
  return pr;
}

function spawnEnemyProjectile(world, opts) {
  const pr = makeProjectile(Object.assign({ team: TEAM.ENEMY, color: COLORS.projEnemy }, opts));
  pr.vx *= ENEMY_PROJECTILE_SPEED_MULT;
  pr.vy *= ENEMY_PROJECTILE_SPEED_MULT;
  world.projectiles.push(pr);
  return pr;
}

function randomValidPointInRoom(world, opts) {
  const o = opts || {};
  const margin = o.margin != null ? o.margin : 30;
  const avoidPlayerRadius = o.avoidPlayerRadius != null ? o.avoidPlayerRadius : 60;
  const b = world.room.bounds;
  for (let tries = 0; tries < 40; tries++) {
    const x = randRange(b.x + margin, b.x + b.w - margin);
    const y = randRange(b.y + margin, b.y + b.h - margin);
    if (world.player && dist(x, y, world.player.x, world.player.y) < avoidPlayerRadius) continue;
    let blocked = false;
    for (const ob of world.room.obstacles) {
      if (circleRect(x, y, margin * 0.6, ob.x, ob.y, ob.w, ob.h)) { blocked = true; break; }
    }
    if (blocked) continue;
    return { x, y };
  }
  return { x: (b.x + b.w) / 2, y: (b.y + b.h) / 2 };
}

function pushEnemy(enemy, dx, dy) {
  if (!enemy._pushX) { enemy._pushX = 0; enemy._pushY = 0; }
  enemy._pushX = (enemy._pushX || 0) + dx;
  enemy._pushY = (enemy._pushY || 0) + dy;
}

function enemyIsDisabled(e) {
  if (e.frozen && e.frozen > 0) return true;
  if (e.frozenUntilTouched) return true;
  return false;
}

function updateFrozenTimers(world, dt) {
  for (const e of world.enemies) {
    if (e.dead) continue;
    if (e.frozen && e.frozen > 0) { e.frozen -= dt; if (e.frozen < 0) e.frozen = 0; }
    if (e.frozenUntilTouched && world.player && circleCircle(e.x, e.y, (e.radius || 16) + 4, world.player.x, world.player.y, world.player.radius)) {
      e.frozenUntilTouched = false;
    }
  }
}
