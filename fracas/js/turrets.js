// Les 12 types de tourelles (T1 a T12)

const TURRET_HP = {
  T1: 80, T2: 70, T3: 90, T4: 75, T5: 100, T6: 100,
  T7: 60, T8: 80, T9: 110, T10: 90, T11: 80, T12: 120,
};
const TURRET_LOSS = {
  T1: 8, T2: 3, T3: 15, T4: 4, T5: 5, T6: 7,
  T7: 12, T8: 4, T9: 6, T10: 5, T11: 10, T12: 15,
};
const TURRET_COLOR = {
  T1: '#ff5d5d', T2: '#ff8a5d', T3: '#ff3d9a', T4: '#ffb85d', T5: '#ff5dcc',
  T6: '#c74dff', T7: '#ff4d4d', T8: '#ff9d3d', T9: '#4dd0ff', T10: '#ff5d8a',
  T11: '#c73dff', T12: '#ff2d2d',
};

function createTurret(type, x, y, extra) {
  const baseHp = TURRET_HP[type] * ENEMY_HP_MULT;
  const t = Object.assign({
    id: uid(), kind: 'turret', type, x, y, radius: 18,
    spawnX: x, spawnY: y,
    hp: baseHp, maxHp: baseHp, dead: false,
    contactDmgPercent: 0, timer: 0, phase: 0, state: {},
  }, extra || {});
  return t;
}

// Deplacement erratique en laisse autour du point d'apparition (suspendu pendant la charge/tir)
function turretWander(world, t, dt, speed, leash) {
  const s = t.state;
  if (s._wPause > 0) { s._wPause -= dt; return; }
  if (!s._wTarget || dist(t.x, t.y, s._wTarget.x, s._wTarget.y) < 8) {
    let found = null;
    for (let i = 0; i < 8; i++) {
      const a = randRange(0, Math.PI * 2), r = randRange(leash * 0.35, leash);
      let nx = t.spawnX + Math.cos(a) * r, ny = t.spawnY + Math.sin(a) * r;
      if (world.room) {
        const b = world.room.bounds;
        nx = clamp(nx, b.x + 30, b.x + b.w - 30);
        ny = clamp(ny, b.y + 30, b.y + b.h - 30);
      }
      let blocked = false;
      if (world.room) for (const ob of world.room.obstacles) if (circleRect(nx, ny, t.radius + 8, ob.x, ob.y, ob.w, ob.h)) { blocked = true; break; }
      if (!blocked) { found = { x: nx, y: ny }; break; }
    }
    s._wTarget = found || { x: t.spawnX, y: t.spawnY };
    s._wPause = randRange(0.5, 1.3);
    return;
  }
  const dir = normalize(s._wTarget.x - t.x, s._wTarget.y - t.y);
  t.x += dir.x * speed * dt; t.y += dir.y * speed * dt;
  t.facing = Math.atan2(dir.y, dir.x);
}

function turretAimAtPlayer(t, world) {
  if (!world.player) return 0;
  return angleTo(t.x, t.y, world.player.x, world.player.y);
}

function updateTurret(world, t, dt) {
  if (t.type === 'DUMMY') { updateDummy(world, t, dt); return; }
  if (t.dead) {
    // Certaines tourelles (ex : la cible fixe de la salle de test) reapparaissent au meme endroit.
    if (t.respawnDelay != null) {
      t._respawnTimer = (t._respawnTimer || 0) + dt;
      if (t._respawnTimer >= t.respawnDelay) {
        t._respawnTimer = 0; t.dead = false; t.hp = t.maxHp;
        t.x = t.spawnX; t.y = t.spawnY; t.timer = 0; t.charging = false;
        Particles.burst(t.x, t.y, 16, TURRET_COLOR[t.type] || COLORS.enemy, { maxSpeed: 150 });
      }
    }
    return;
  }
  if (enemyIsDisabled(t)) return;
  if (t.type !== 'T4' && t.type !== 'T10' && !t.fixedAim && world.player) {
    const target = turretAimAtPlayer(t, world);
    t.aimAngle = lerpAngle(t.aimAngle == null ? target : t.aimAngle, target, clamp(dt * 6, 0, 1));
  }
  t.timer += dt * (t.fireRateMult || 1) * ENEMY_FIRE_RATE_MULT;
  switch (t.type) {
    case 'T1': updateT1(world, t, dt); break;
    case 'T2': updateT2(world, t, dt); break;
    case 'T3': updateT3(world, t, dt); break;
    case 'T4': updateT4(world, t, dt); break;
    case 'T5': updateT5(world, t, dt); break;
    case 'T6': updateT6(world, t, dt); break;
    case 'T7': updateT7(world, t, dt); break;
    case 'T8': updateT8(world, t, dt); break;
    case 'T9': updateT9(world, t, dt); break;
    case 'T10': updateT10(world, t, dt); break;
    case 'T11': updateT11(world, t, dt); break;
    case 'T12': updateT12(world, t, dt); break;
  }
}

function turretCharge(t, interval, window) {
  t.charging = t.timer >= interval - window && t.timer < interval;
}

function fireAt(world, t, angle, opts) {
  const dir = vecFromAngle(angle);
  const speed = (opts && opts.speed) || 170;
  const pr = spawnEnemyProjectile(world, Object.assign({
    x: t.x, y: t.y, vx: dir.x * speed, vy: dir.y * speed, radius: 6,
    dmgPercent: TURRET_LOSS[t.type], life: 5,
  }, opts));
  // apparence propre au tireur (roche, aiguille, bulle, eclat de glace...) : pas que des boules rouges
  const skin = PROJ_SKINS[t.type];
  if (skin && !(opts && opts.skin)) { pr.skin = skin[0]; if (!(opts && opts.color) || opts.color === COLORS.projEnemy) pr.color = skin[1]; }
  return pr;
}

const T1_INTERVAL = 1.45;
function updateT1(world, t, dt) {
  turretCharge(t, T1_INTERVAL, 0.3);
  if (t.timer >= T1_INTERVAL) { t.timer = 0; fireAt(world, t, t.aimAngle, { speed: 150 }); Audio2.enemyShot(); }
}
const T2_INTERVAL = 2.7;
function updateT2(world, t, dt) {
  if (!t.state.bursting) { turretCharge(t, T2_INTERVAL, 0.3); if (!t.charging) turretWander(world, t, dt, 75, 65); }
  if (!t.state.bursting && t.timer >= T2_INTERVAL) {
    t.timer = 0; t.charging = false; t.state.bursting = true; t.state.shotsLeft = 3; t.state.burstTimer = 0;
  }
  if (t.state.bursting) {
    t.state.burstTimer += dt * ENEMY_FIRE_RATE_MULT;
    if (t.state.burstTimer >= 0.1) {
      t.state.burstTimer = 0;
      fireAt(world, t, t.aimAngle, { speed: 230 });
      t.state.shotsLeft--;
      if (t.state.shotsLeft <= 0) t.state.bursting = false;
    }
  }
}
function updateT3(world, t, dt) {
  const s = t.state;
  if (s.phase == null) { s.phase = 'charge'; s.phaseTimer = 0; s.aimAngle = turretAimAtPlayer(t, world); t.charging = true; }
  s.phaseTimer += dt * ENEMY_FIRE_RATE_MULT;
  if (s.phase === 'idle') {
    if (s.phaseTimer >= 0.35) { s.phase = 'charge'; s.phaseTimer = 0; s.aimAngle = turretAimAtPlayer(t, world); t.charging = true; }
  } else if (s.phase === 'charge') {
    if (s.phaseTimer >= 0.8) { s.phase = 'laser'; s.phaseTimer = 0; t.charging = false; }
  } else if (s.phase === 'laser') {
    s.tick = (s.tick || 0) + dt * ENEMY_FIRE_RATE_MULT;
    if (s.tick >= 0.15) {
      s.tick = 0;
      const dir = vecFromAngle(s.aimAngle);
      for (let d = 20; d < 900; d += 20) {
        const px = t.x + dir.x * d, py = t.y + dir.y * d;
        if (world.player && dist(px, py, world.player.x, world.player.y) < 14) { playerApplyDamage(world.player, TURRET_LOSS.T3 * 0.25); break; }
      }
    }
    if (s.phaseTimer >= 0.7) { s.phase = 'idle'; s.phaseTimer = 0; }
  }
}
function updateT4(world, t, dt) {
  t.phase += 2.4 * dt;
  t.aimAngle = t.phase;
  turretWander(world, t, dt, 26, 55);
  if (t.timer >= 0.42) { t.timer = 0; fireAt(world, t, t.phase, { speed: 220 }); }
}
const T5_INTERVAL = 3.4;
function updateT5(world, t, dt) {
  turretCharge(t, T5_INTERVAL, 0.4);
  if (!t.charging) turretWander(world, t, dt, 32, 55);
  if (t.timer >= T5_INTERVAL) {
    t.timer = 0; t.charging = false;
    for (let i = 0; i < 8; i++) fireAt(world, t, (Math.PI * 2 * i) / 8, { speed: 180 });
    Audio2.enemyShot();
  }
}
const T6_INTERVAL = 1.25;
function updateT6(world, t, dt) {
  const s = t.state;
  if (!s.path) {
    s.path = (t.railPath && t.railPath.length >= 2) ? t.railPath : [{ x: t.x - 100, y: t.y }, { x: t.x + 100, y: t.y }];
    s.idx = 0; s.forward = true;
  }
  const target = s.path[s.idx];
  const d = dist(t.x, t.y, target.x, target.y);
  if (d < 4) {
    if (s.forward) { s.idx++; if (s.idx >= s.path.length) { s.idx = s.path.length - 2; s.forward = false; } }
    else { s.idx--; if (s.idx < 0) { s.idx = 1; s.forward = true; } }
  } else {
    const dir = normalize(target.x - t.x, target.y - t.y);
    t.x += dir.x * 170 * dt; t.y += dir.y * 170 * dt;
  }
  turretCharge(t, T6_INTERVAL, 0.25);
  if (t.timer >= T6_INTERVAL) { t.timer = 0; fireAt(world, t, t.aimAngle, { speed: 210 }); }
}
const T7_INTERVAL = 3;
function updateT7(world, t, dt) {
  turretWander(world, t, dt, 60, 75);
  if (t.timer >= T7_INTERVAL) {
    t.timer = 0;
    world.mines.push(makeMine({ x: t.x + randRange(-20, 20), y: t.y + randRange(-20, 20), triggerRadius: 26, dmgPercent: TURRET_LOSS.T7, team: TEAM.ENEMY, color: '#ff4d4d' }));
  }
}
const T8_INTERVAL = 3.8;
function updateT8(world, t, dt) {
  const s = t.state;
  if (!s.firing) turretCharge(t, T8_INTERVAL, 0.35);
  if (!s.firing && t.timer >= T8_INTERVAL) { t.timer = 0; t.charging = false; s.firing = true; s.shotsLeft = 5; s.fireTimer = 0; s.angle = t.aimAngle; }
  if (s.firing) {
    s.fireTimer += dt * ENEMY_FIRE_RATE_MULT;
    if (s.fireTimer >= 0.08) {
      s.fireTimer = 0;
      fireAt(world, t, s.angle, { speed: 260 });
      s.shotsLeft--;
      if (s.shotsLeft <= 0) s.firing = false;
    }
  }
}
const T9_INTERVAL = 2.6;
function updateT9(world, t, dt) {
  turretCharge(t, T9_INTERVAL, 0.3);
  if (!t.charging) turretWander(world, t, dt, 58, 65);
  if (t.timer >= T9_INTERVAL) {
    t.timer = 0; t.charging = false;
    const dir = vecFromAngle(t.aimAngle);
    spawnEnemyProjectile(world, {
      x: t.x, y: t.y, vx: dir.x * 270, vy: dir.y * 270, radius: 7,
      dmgPercent: TURRET_LOSS.T9, life: 6, maxBounces: 4,
    });
  }
}
const T10_INTERVAL = 2.6;
function updateT10(world, t, dt) {
  turretCharge(t, T10_INTERVAL, 0.3);
  if (t.timer >= T10_INTERVAL) {
    t.timer = 0; t.charging = false;
    fireAt(world, t, 0, { speed: 210 }); fireAt(world, t, Math.PI / 2, { speed: 210 });
    fireAt(world, t, Math.PI, { speed: 210 }); fireAt(world, t, -Math.PI / 2, { speed: 210 });
  }
}
const T11_INTERVAL = 3;
function updateT11(world, t, dt) {
  turretCharge(t, T11_INTERVAL, 0.3);
  if (!t.charging) turretWander(world, t, dt, 22, 60);
  if (t.timer >= T11_INTERVAL) {
    t.timer = 0; t.charging = false;
    const dir = vecFromAngle(t.aimAngle);
    const pr = spawnEnemyProjectile(world, { x: t.x, y: t.y, vx: dir.x * 110, vy: dir.y * 110, radius: 7, dmgPercent: TURRET_LOSS.T11, life: 6, homing: 0.7 });
    pr.target = world.player;
  }
}
const T12_INTERVAL = 2.3;
function updateT12(world, t, dt) {
  const s = t.state;
  if (!s.pending) turretCharge(t, T12_INTERVAL, 0.3);
  if (!s.pending && t.timer >= T12_INTERVAL) {
    t.timer = 0; t.charging = false; s.pending = true; s.telegraphTimer = 0;
    s.target = world.player ? { x: world.player.x, y: world.player.y } : { x: t.x, y: t.y };
    world.zones.push(makeZone({
      x: s.target.x, y: s.target.y, radius: 80, telegraph: 0.65, duration: 0.15, tickInterval: 999,
      color: COLORS.danger, edgeColor: COLORS.dangerEdge, team: TEAM.ENEMY,
      onActivate(z) {
        if (world.player && zoneContainsPoint(z, world.player.x, world.player.y)) playerApplyDamage(world.player, TURRET_LOSS.T12);
      },
      onExpire() { s.pending = false; },
    }));
  }
}

function updateDummy(world, t, dt) {
  // La cible d'entrainement peut vraiment mourir (pour tester les effets "a la mort")
  // puis reapparait pleine vie apres un court delai.
  if (t.dead) {
    t._respawnTimer = (t._respawnTimer || 0) + dt;
    if (t._respawnTimer >= 2.2) {
      t._respawnTimer = 0; t.dead = false; t.hp = t.maxHp;
      Particles.burst(t.x, t.y, 16, '#7fd8ff', { maxSpeed: 150 });
    }
    return;
  }
  t._regenTimer = (t._regenTimer || 0) + dt;
  if (t._regenTimer >= 1 && t.hp < t.maxHp) { t._regenTimer = 0; t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.06); }
}

// ---------- Silhouettes distinctes par type : tourelle mecanique, monstre organique ou construct ----------
function bodyT1(ctx, t, color) {
  ctx.strokeStyle = '#2a1010'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 10 + 6); ctx.stroke(); }
  ctx.fillStyle = radialBodyGradient(ctx, 12, '#ffb0a8', color, '#3a0505');
  ctx.strokeStyle = '#2a0505'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.rotate(t.aimAngle || 0);
  ctx.fillStyle = '#3a0505'; ctx.fillRect(0, -3, 19, 6);
  ctx.restore();
}
function bodyT2(ctx, t, color) {
  const time = performance.now() / 110;
  ctx.strokeStyle = '#3a1500'; ctx.lineWidth = 1.6;
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1; const idx = i % 3;
    const baseA = side * (0.6 + idx * 0.55);
    const swing = Math.sin(time + i) * 0.35;
    const lx = Math.cos(baseA + swing) * 15, ly = Math.sin(baseA + swing) * 8 + 3;
    ctx.beginPath(); ctx.moveTo(side * 6, idx * 3 - 3); ctx.lineTo(lx, ly); ctx.stroke();
  }
  ctx.fillStyle = radialBodyGradient(ctx, 11, '#ffe0b0', color, '#5a2000');
  ctx.strokeStyle = '#3a1500'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1a0800';
  ctx.beginPath(); ctx.arc(-4, -2, 1.6, 0, Math.PI * 2); ctx.arc(4, -2, 1.6, 0, Math.PI * 2); ctx.fill();
}
function bodyT3(ctx, t, color) {
  ctx.fillStyle = radialBodyGradient(ctx, 13, '#ffb0d8', color, '#4a0026');
  ctx.strokeStyle = '#3a0020'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 - Math.PI / 2; const px = Math.cos(a) * 13, py = Math.sin(a) * 13; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  const lensR = t.charging ? 7 : 4.5;
  ctx.fillStyle = t.charging ? '#ffffff' : '#ff3d9a';
  ctx.shadowColor = '#ff3d9a'; ctx.shadowBlur = t.charging ? 14 : 4;
  ctx.beginPath(); ctx.arc(0, 0, lensR, 0, Math.PI * 2); ctx.fill();
}
function bodyT4(ctx, t, color) {
  ctx.save(); ctx.rotate(t.phase);
  ctx.strokeStyle = color; ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.moveTo(0, -15); ctx.lineTo(0, 15); ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.fillStyle = radialBodyGradient(ctx, 11, '#fff3d0', color, '#5a3a00');
  ctx.strokeStyle = '#3a2400'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.rotate(t.phase);
  ctx.fillStyle = '#1a1000'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(2, 0, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function bodyT5(ctx, t, color) {
  const puff = t.charging ? 1.35 : 1;
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI * 2) / 10; const len = 9 * puff;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); ctx.lineTo(Math.cos(a) * (7 + len), Math.sin(a) * (7 + len)); ctx.stroke();
  }
  ctx.fillStyle = radialBodyGradient(ctx, 9, '#ffd6f0', color, '#5a0038');
  ctx.strokeStyle = '#3a0026'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1a0010'; ctx.beginPath(); ctx.arc(-3, -1, 1.3, 0, Math.PI * 2); ctx.arc(3, -1, 1.3, 0, Math.PI * 2); ctx.fill();
}
function bodyT6(ctx, t, color) {
  ctx.fillStyle = '#241a30'; ctx.strokeStyle = '#120a18'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(-9, 9, 3, 0, Math.PI * 2); ctx.arc(9, 9, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = radialBodyGradient(ctx, 13, '#e8c8ff', color, '#3a1a5a');
  ctx.strokeStyle = '#2a0f45'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-13, -9, 26, 16, 4); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.rotate(t.aimAngle || 0);
  ctx.fillStyle = '#2a0f45'; ctx.fillRect(0, -3, 17, 6);
  ctx.restore();
}
function bodyT7(ctx, t, color) {
  ctx.fillStyle = radialBodyGradient(ctx, 12, '#ffb0a0', color, '#4a0f00');
  ctx.strokeStyle = '#2a0800'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 3, 12, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(-14, -4); ctx.moveTo(-10, 2); ctx.lineTo(-14, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, 2); ctx.lineTo(14, -4); ctx.moveTo(10, 2); ctx.lineTo(14, 4); ctx.stroke();
  ctx.fillStyle = '#1a0500'; ctx.beginPath(); ctx.arc(-4, -2, 1.5, 0, Math.PI * 2); ctx.arc(4, -2, 1.5, 0, Math.PI * 2); ctx.fill();
}
function bodyT8(ctx, t, color) {
  ctx.fillStyle = radialBodyGradient(ctx, 12, '#ffe0b0', color, '#5a2e00');
  ctx.strokeStyle = '#3a1c00'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-11, -9, 22, 18, 3); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.rotate(t.aimAngle || 0);
  ctx.fillStyle = '#3a1c00';
  ctx.fillRect(0, -6, 16, 3); ctx.fillRect(0, -1.5, 18, 3); ctx.fillRect(0, 3, 16, 3);
  ctx.restore();
}
function bodyT9(ctx, t, color) {
  ctx.fillStyle = radialBodyGradient(ctx, 12, '#c8f0ff', color, '#003a4a');
  ctx.strokeStyle = '#002a38'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 1, 11, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = radialBodyGradient(ctx, 3.4, '#c8f0ff', color, '#003a4a');
  ctx.beginPath(); ctx.arc(-6, -6, 3.4, 0, Math.PI * 2); ctx.arc(6, -6, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#001a22'; ctx.beginPath(); ctx.arc(-6, -6, 1.4, 0, Math.PI * 2); ctx.arc(6, -6, 1.4, 0, Math.PI * 2); ctx.fill();
}
function bodyT10(ctx, t, color) {
  const spin = performance.now() / 1000;
  ctx.save(); ctx.rotate(spin * 0.4);
  ctx.fillStyle = radialBodyGradient(ctx, 12, '#ffd6e0', color, '#4a0018');
  ctx.strokeStyle = '#3a0012'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(9, 0); ctx.lineTo(0, 12); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + spin;
    ctx.fillStyle = t.charging ? '#ffffff' : color;
    ctx.shadowColor = color; ctx.shadowBlur = t.charging ? 10 : 3;
    ctx.beginPath(); ctx.arc(Math.cos(a) * 16, Math.sin(a) * 16, 2.3, 0, Math.PI * 2); ctx.fill();
  }
}
function bodyT11(ctx, t, color) {
  const time = performance.now() / 500;
  ctx.strokeStyle = color; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.6;
  for (let i = -1; i <= 1; i++) {
    const sway = Math.sin(time + i) * 4;
    ctx.beginPath(); ctx.moveTo(i * 5, 4); ctx.quadraticCurveTo(i * 5 + sway, 12, i * 5 + sway * 1.4, 19); ctx.stroke();
  }
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = radialBodyGradient(ctx, 11, '#e8d0ff', color, '#3a1050');
  ctx.strokeStyle = '#2a0a40'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, -1, 10, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.globalAlpha = 1;
}
function bodyT12(ctx, t, color) {
  ctx.fillStyle = '#1a1015'; ctx.strokeStyle = '#0a0508'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-8, 14); ctx.lineTo(-6, -14); ctx.lineTo(6, -14); ctx.lineTo(8, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
  const pulse = t.charging ? (0.6 + 0.4 * Math.sin(performance.now() / 50)) : 0.5;
  ctx.fillStyle = color; ctx.globalAlpha = pulse;
  ctx.shadowColor = color; ctx.shadowBlur = t.charging ? 14 : 5;
  ctx.beginPath(); ctx.arc(0, -2, 4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}
function bodyDummy(ctx, t, color) {
  ctx.fillStyle = '#4a4a56'; ctx.strokeStyle = '#2a2a34'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#6a6a78'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(8, 8); ctx.moveTo(8, -8); ctx.lineTo(-8, 8); ctx.stroke();
}
const TURRET_BODY = {
  T1: bodyT1, T2: bodyT2, T3: bodyT3, T4: bodyT4, T5: bodyT5, T6: bodyT6,
  T7: bodyT7, T8: bodyT8, T9: bodyT9, T10: bodyT10, T11: bodyT11, T12: bodyT12, DUMMY: bodyDummy,
};

function drawTurret(ctx, camera, t) {
  const sx = t.x - camera.x, sy = t.y - camera.y;
  ctx.save();
  ctx.translate(sx, sy);
  const color = t.type === 'DUMMY' ? '#5a5a66' : (TURRET_COLOR[t.type] || COLORS.enemy);
  drawGroundShadow(ctx, t.radius * 0.55, t.radius * 0.85);
  ctx.shadowColor = color;
  ctx.shadowBlur = t.charging ? 14 : 4;
  if ((t.state && t.state.phase === 'charge') || t.charging) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(performance.now() / 55); }
  const bodyFn = TURRET_BODY[t.type] || bodyT1;
  bodyFn(ctx, t, color);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();

  if (t.state && t.state.phase === 'laser') {
    ctx.save();
    ctx.strokeStyle = '#ff3d9a';
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.8;
    const dir = vecFromAngle(t.state.aimAngle);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + dir.x * 900, sy + dir.y * 900);
    ctx.stroke();
    ctx.restore();
  } else if (t.state && t.state.phase === 'charge') {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,61,154,0.4)';
    ctx.lineWidth = 2;
    const dir = vecFromAngle(t.state.aimAngle);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + dir.x * 900, sy + dir.y * 900);
    ctx.stroke();
    ctx.restore();
  } else if (t.aimAngle != null && !['DUMMY', 'T7', 'T12'].includes(t.type)) {
    const dir = vecFromAngle(t.aimAngle);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = t.charging ? 0.85 : 0.3;
    ctx.lineWidth = t.charging ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(sx + dir.x * (t.radius + 2), sy + dir.y * (t.radius + 2));
    ctx.lineTo(sx + dir.x * (t.radius + (t.charging ? 38 : 20)), sy + dir.y * (t.radius + (t.charging ? 38 : 20)));
    ctx.stroke();
    ctx.restore();
  }
  if (t.charging) {
    ctx.save();
    const pulse = (performance.now() / 260) % 1;
    ctx.globalAlpha = 0.5 * (1 - pulse);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(sx, sy, t.radius + 6 + pulse * 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // barre de vie
  const w = 30;
  ctx.save();
  ctx.translate(sx - w / 2, sy - t.radius - 10);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, w, 4);
  ctx.fillStyle = t.type === 'DUMMY' ? '#7fd8ff' : '#ff5d5d';
  ctx.fillRect(0, 0, w * clamp(t.hp / t.maxHp, 0, 1), 4);
  ctx.restore();
}
