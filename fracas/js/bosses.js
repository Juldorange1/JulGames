// Les 6 boss (2 par partie), avec phases basees sur les PV restants.
// Chacun a une silhouette distincte (creature ou machine) qui montre sa dangerosite, et dispose
// d'au moins une mecanique "dure" (salves massives, cases dangereuses, destruction du decor,
// poussee, ou invocation de renforts). Certaines salles de boss peuvent en faire apparaitre deux
// a la fois (voir rooms.js) : les PV individuels sont alors reduits pour rester equitable.

// PV -30% supplementaires (compense par davantage de projectiles dans chaque pattern de tir).
const BOSS_DEFS = {
  B1: { name: 'Le Noeud', hp: 1250 * 0.7, contact: 10, color: '#8ad9ff', radius: 38 },
  B2: { name: 'Le Jardin', hp: 1550 * 0.7, contact: 12, color: '#5dff9d', radius: 36 },
  B3: { name: 'La Mitraille', hp: 1350 * 0.7, contact: 0, color: '#ffb85d', radius: 30 },
  B4: { name: 'Le Rail', hp: 1700 * 0.7, contact: 10, color: '#c74dff', radius: 32 },
  B5: { name: 'Le Colosse', hp: 2550 * 0.7, contact: 20, color: '#8a6a55', radius: 48 },
  B6: { name: 'Le Centre', hp: 3000 * 0.7, contact: 18, color: '#ff5d5d', radius: 40 },
};

function createBoss(type, room, opts) {
  const def = BOSS_DEFS[type];
  const o = opts || {};
  const weakenMult = o.weakened ? 0.68 : 1; // combat a deux boss simultanes : chacun est plus fragile
  const hp = def.hp * ENEMY_HP_MULT * weakenMult;
  const b = {
    id: uid(), kind: 'boss', type, name: def.name,
    x: o.x != null ? o.x : room.bounds.x + room.bounds.w / 2,
    y: o.y != null ? o.y : room.bounds.y + room.bounds.h / 2 - 80,
    radius: def.radius || 34, hp, maxHp: hp, dead: false,
    contactDmgPercent: def.contact, phase: 1, timer: 0, color: def.color, state: {},
  };
  if (type === 'B4') b.state.rails = buildBossRails(room);
  return b;
}

function bossPhaseFromHp(b) {
  const r = b.hp / b.maxHp;
  if (r > 0.7) return 1;
  if (r > 0.35) return 2;
  return 3;
}

function bossRadialBurst(world, b, count, speed) {
  for (let i = 0; i < count; i++) {
    fireAt(world, b, (Math.PI * 2 * i) / count, { speed: speed || 160, dmgPercent: 8, radius: 8, color: COLORS.projEnemy });
  }
  Audio2.attack();
}

function bossLineToward(world, b, count, spacing) {
  if (!world.player) return;
  const angle = angleTo(b.x, b.y, world.player.x, world.player.y);
  const dir = vecFromAngle(angle);
  const perp = { x: -dir.y, y: dir.x };
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * spacing;
    spawnEnemyProjectile(world, {
      x: b.x + perp.x * off, y: b.y + perp.y * off, vx: dir.x * 200, vy: dir.y * 200,
      radius: 7, dmgPercent: 9, life: 5,
    });
  }
}

function bossZoneStrike(world, x, y, radius, dmgPercent, telegraph) {
  world.zones.push(makeZone({
    x, y, radius, telegraph: telegraph != null ? telegraph : 0.9, duration: 0.2, tickInterval: 999,
    color: COLORS.danger, edgeColor: COLORS.dangerEdge, team: TEAM.ENEMY,
    onActivate(z) {
      if (world.player && zoneContainsPoint(z, world.player.x, world.player.y)) playerApplyDamage(world.player, dmgPercent);
      Particles.burst(x, y, 16, COLORS.dangerEdge, { maxSpeed: 160 });
    },
  }));
}

function bossCharge(b, interval, window) {
  b.charging = b.timer >= interval - window && b.timer < interval;
}

function buildBossRails(room) {
  const b = room.bounds;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  return [
    [{ x: b.x + 60, y: cy - 100 }, { x: b.x + b.w - 60, y: cy - 100 }],
    [{ x: b.x + 60, y: cy + 100 }, { x: b.x + b.w - 60, y: cy + 100 }],
    [{ x: cx - 140, y: b.y + 70 }, { x: cx - 140, y: b.y + b.h - 70 }],
    [{ x: cx + 140, y: b.y + 70 }, { x: cx + 140, y: b.y + b.h - 70 }],
  ];
}

// ---------- Aggravations partagees : poussee, destruction du decor, invocation de renforts ----------

// Ejecte le joueur loin du boss (souffle, coup de masse...) s'il est a portee.
function bossKnockbackPlayer(world, b, radius, force, dmgPercent) {
  const player = world.player;
  if (!player) return false;
  const d = dist(b.x, b.y, player.x, player.y);
  if (d > radius) return false;
  const dir = normalize(player.x - b.x, player.y - b.y) || { x: 1, y: 0 };
  pushPlayer(world, player, dir.x * force, dir.y * force);
  if (dmgPercent) playerApplyDamage(player, dmgPercent);
  Audio2.impact();
  if (Game.shakeCamera) Game.shakeCamera(9, 0.22);
  return true;
}

// Detruit un obstacle du decor et laisse un cratere dangereux a sa place (la salle change vraiment).
function bossDestroyObstacle(world, ob) {
  if (!world.room) return;
  const idx = world.room.obstacles.indexOf(ob);
  if (idx === -1) return;
  world.room.obstacles.splice(idx, 1);
  const cx = ob.x + ob.w / 2, cy = ob.y + ob.h / 2;
  Particles.burst(cx, cy, 30, '#ffb85d', { maxSpeed: 260, life: 0.6, gravity: 50 });
  Particles.ring(cx, cy, Math.max(ob.w, ob.h) * 0.9, '#ff7a3d', 0.5);
  Audio2.boom2();
  if (Game.shakeCamera) Game.shakeCamera(8, 0.28);
  world.zones.push(makeZone({
    x: cx, y: cy, radius: Math.max(ob.w, ob.h) * 0.55, telegraph: 0, duration: 9999, persistent: true,
    tickInterval: 999, color: 'rgba(255,122,61,0.28)', edgeColor: COLORS.dmgZone, terrainType: 'damage',
  }));
}

function bossDestroyNearestObstacle(world, b) {
  if (!world.room || !world.room.obstacles.length) return;
  let best = null, bestD = Infinity;
  for (const ob of world.room.obstacles) {
    const cx = ob.x + ob.w / 2, cy = ob.y + ob.h / 2;
    const d = dist2(b.x, b.y, cx, cy);
    if (d < bestD) { bestD = d; best = ob; }
  }
  if (best) bossDestroyObstacle(world, best);
}

// Invoque des renforts (tourelles) autour du boss, plafonnes pour ne pas devenir ingerable.
function bossSummonAdds(world, type, count, cap) {
  const alive = world.enemies.filter((e) => e._bossAdd && !e.dead).length;
  const toSpawn = Math.max(0, Math.min(count, (cap != null ? cap : 3) - alive));
  for (let i = 0; i < toSpawn; i++) {
    const p = randomValidPointInRoom(world, { margin: 55, avoidPlayerRadius: 110 });
    const t = createTurret(type, p.x, p.y);
    t._bossAdd = true;
    world.enemies.push(t);
    Particles.burst(p.x, p.y, 18, '#8dff9c', { maxSpeed: 150, life: 0.4 });
  }
  if (toSpawn > 0) Audio2.ability();
  return toSpawn;
}

function updateBoss(world, b, dt) {
  if (b.dead) return;
  if (enemyIsDisabled(b)) return;
  const newPhase = bossPhaseFromHp(b);
  if (newPhase !== b.phase) {
    b.phase = newPhase;
    b.state.phaseChangeFx = 0.6;
    Particles.burst(b.x, b.y, 40, b.color, { maxSpeed: 260 });
    Audio2.boss();
  }
  if (b.state.phaseChangeFx > 0) b.state.phaseChangeFx -= dt;
  b.timer += dt * ENEMY_FIRE_RATE_MULT;
  switch (b.type) {
    case 'B1': updateBoss1(world, b, dt); break;
    case 'B2': updateBoss2(world, b, dt); break;
    case 'B3': updateBoss3(world, b, dt); break;
    case 'B4': updateBoss4(world, b, dt); break;
    case 'B5': updateBoss5(world, b, dt); break;
    case 'B6': updateBoss6(world, b, dt); break;
  }
  clampToRoom(world, b);
}

function clampToRoom(world, b) {
  if (!world.room) return;
  const bd = world.room.bounds;
  b.x = clamp(b.x, bd.x + b.radius, bd.x + bd.w - b.radius);
  b.y = clamp(b.y, bd.y + b.radius, bd.y + bd.h - b.radius);
}

function homeToward(world, b, speed, dt) {
  if (!world.player) return;
  const dir = normalize(world.player.x - b.x, world.player.y - b.y);
  b.x += dir.x * speed * dt; b.y += dir.y * speed * dt;
}

// ---------- BOSS 1 — LE NOEUD (creature de glace, tentacules noueux) ----------
function updateBoss1(world, b, dt) {
  const s = b.state;
  if (s.iceInit !== b.phase) {
    s.iceInit = b.phase;
    for (const z of world.zones) if (z._boss1ice) z.dead = true;
    const iceCount = b.phase === 1 ? 4 : (b.phase === 3 ? 3 : 0);
    for (let i = 0; i < iceCount; i++) {
      const p = randomValidPointInRoom(world, { margin: 50 });
      world.zones.push(makeZone({ x: p.x, y: p.y, radius: 55, duration: 9999, persistent: true, tickInterval: 999, color: 'rgba(157,232,255,0.25)', edgeColor: COLORS.ice, terrainType: 'ice' }));
      world.zones[world.zones.length - 1]._boss1ice = true;
    }
    if (b.phase === 2) {
      for (let i = 0; i < 2; i++) {
        const p = randomValidPointInRoom(world, { margin: 50 });
        world.zones.push(makeZone({ x: p.x, y: p.y, radius: 55, duration: 9999, persistent: true, tickInterval: 999, color: 'rgba(180,124,255,0.25)', edgeColor: COLORS.slow, terrainType: 'slow' }));
        world.zones[world.zones.length - 1]._boss1ice = true;
      }
    }
    // Le noeud se resserre : a chaque changement de phase il ecrase un obstacle du decor.
    if (b.phase >= 2) bossDestroyNearestObstacle(world, b);
  }
  homeToward(world, b, b.phase === 1 ? 32 : (b.phase === 2 ? 55 : 80), dt);
  const interval = b.phase === 1 ? 2.1 : (b.phase === 2 ? 1.45 : 0.9);
  bossCharge(b, interval, 0.3);
  if (b.timer >= interval) {
    b.timer = 0; b.charging = false;
    const count = b.phase === 1 ? 7 : (b.phase === 2 ? 11 : 15);
    bossRadialBurst(world, b, count, 150);
    // Fouet noueux : si le joueur est proche au moment de la salve, il est repousse.
    bossKnockbackPlayer(world, b, 90, 150, 6);
  }
}

// ---------- BOSS 2 — LE JARDIN (creature vegetale, gousses de spores) ----------
function updateBoss2(world, b, dt) {
  const s = b.state;
  const targetCount = b.phase === 1 ? 4 : (b.phase === 2 ? 8 : 12);
  if (!s.gardenZones) s.gardenZones = [];
  s.gardenZones = s.gardenZones.filter((z) => !z.dead);
  s.gardenRefresh = (s.gardenRefresh || 0) + dt * ENEMY_FIRE_RATE_MULT;
  if (s.gardenZones.length < targetCount && s.gardenRefresh > 0.4) {
    s.gardenRefresh = 0;
    s.spawnCount = (s.spawnCount || 0) + 1;
    // A partir de la phase 3, une pousse sur trois se transforme en renfort hostile.
    if (b.phase === 3 && s.spawnCount % 3 === 0) {
      bossSummonAdds(world, 'T7', 1, 3);
    } else {
      const p = randomValidPointInRoom(world, { margin: 45 });
      const isIce = b.phase === 3 && s.gardenZones.length % 2 === 0;
      const z = makeZone({
        x: p.x, y: p.y, radius: 46, telegraph: 0.6, duration: 9999, persistent: true, tickInterval: 0.5,
        color: isIce ? 'rgba(157,232,255,0.25)' : 'rgba(255,122,61,0.3)',
        edgeColor: isIce ? COLORS.ice : COLORS.dmgZone, terrainType: isIce ? 'ice' : 'damage',
      });
      world.zones.push(z);
      s.gardenZones.push(z);
    }
  }
  homeToward(world, b, 18, dt);
  const rate = b.phase === 1 ? 0.46 : (b.phase === 2 ? 0.29 : 0.22);
  if (b.timer >= rate) {
    b.timer = 0;
    if (world.player) {
      const dir = normalize(world.player.x - b.x, world.player.y - b.y);
      const spreadAngles = b.phase === 1 ? [0, 0.28, -0.28] : (b.phase === 2 ? [0, 0.28, -0.28, 0.56, -0.56] : [0, 0.28, -0.28, 0.56, -0.56, 0.84, -0.84]);
      for (const spread of spreadAngles) {
        const vx = (dir.x * Math.cos(spread) - dir.y * Math.sin(spread)) * 200;
        const vy = (dir.x * Math.sin(spread) + dir.y * Math.cos(spread)) * 200;
        spawnEnemyProjectile(world, { x: b.x, y: b.y, vx, vy, radius: 7, dmgPercent: 8, life: 5 });
      }
    }
  }
}

// ---------- BOSS 3 — LA MITRAILLE (machine gatling erratique) ----------
function updateBoss3(world, b, dt) {
  const s = b.state;
  s.wanderTimer = (s.wanderTimer || 0) + dt;
  if (s.wanderTimer > 0.7 || !s.wanderDir) {
    s.wanderTimer = 0;
    const a = randRange(0, Math.PI * 2);
    s.wanderDir = vecFromAngle(a);
  }
  b.x += s.wanderDir.x * 220 * dt; b.y += s.wanderDir.y * 220 * dt;
  const interval = b.phase === 1 ? 1.7 : (b.phase === 2 ? 1.35 : 1.1);
  bossCharge(b, interval, 0.22);
  if (b.timer >= interval) {
    b.timer = 0; b.charging = false;
    const count = b.phase === 1 ? 6 : (b.phase === 2 ? 10 : 13);
    if (world.player) {
      const baseAngle = angleTo(b.x, b.y, world.player.x, world.player.y);
      for (let i = 0; i < count; i++) {
        const a = baseAngle + (i - (count - 1) / 2) * 0.14;
        const dir = vecFromAngle(a);
        spawnEnemyProjectile(world, { x: b.x, y: b.y, vx: dir.x * 260, vy: dir.y * 260, radius: 6, dmgPercent: 5, life: 4 });
      }
    }
    Audio2.attack();
  }
  // Charge blindee : a partir de la phase 2, la mitraille percute regulierement le decor et le detruit.
  if (b.phase >= 2) {
    s.ramTimer = (s.ramTimer || 0) + dt * ENEMY_FIRE_RATE_MULT;
    if (s.ramTimer >= 3.2) {
      s.ramTimer = 0;
      bossDestroyNearestObstacle(world, b);
      bossKnockbackPlayer(world, b, 70, 130, 8);
    }
  }
}

// ---------- BOSS 4 — LE RAIL (canon blinde monte sur rails) ----------
function updateBoss4(world, b, dt) {
  const s = b.state;
  if (s.railIdx == null) { s.railIdx = 0; s.railT = 0; s.railSwitch = 0; }
  const switchInterval = b.phase === 3 ? 1.7 : 2.6;
  s.railSwitch += dt * ENEMY_FIRE_RATE_MULT;
  bossCharge(b, switchInterval, 0.3);
  const rail = s.rails[s.railIdx];
  s.railT += dt * 0.6;
  const t = (Math.sin(s.railT) + 1) / 2;
  b.x = lerp(rail[0].x, rail[1].x, t);
  b.y = lerp(rail[0].y, rail[1].y, t);
  if (s.railSwitch >= switchInterval) {
    s.railSwitch = 0;
    b.charging = false;
    s.railIdx = (s.railIdx + 1) % s.rails.length;
    s.railT = 0;
    const dirCount = b.phase >= 2 ? 12 : 6;
    for (let i = 0; i < dirCount; i++) fireAt(world, b, (Math.PI * 2 * i) / dirCount, { speed: 180, dmgPercent: 10 });
    Particles.burst(b.x, b.y, 20, b.color, { maxSpeed: 200 });
    Audio2.attack();
    // Au coeur de la salve, le canon detruit tout obstacle proche du nouveau rail (voies degagees a la force).
    if (b.phase === 3) bossDestroyNearestObstacle(world, b);
  }
}

// ---------- BOSS 5 — LE COLOSSE (golem de pierre/fer) ----------
function updateBoss5(world, b, dt) {
  const s = b.state;
  homeToward(world, b, 22, dt);
  const interval = b.phase === 3 ? 1.4 : (b.phase === 2 ? 1.9 : 2.4);
  bossCharge(b, interval, 0.4);
  if (b.timer >= interval) {
    b.timer = 0; b.charging = false;
    const zoneCount = b.phase === 1 ? 2 : (b.phase === 2 ? 3 : 4);
    const projCount = b.phase === 1 ? 5 : (b.phase === 2 ? 8 : 11);
    for (let i = 0; i < zoneCount; i++) {
      const p = world.player ? { x: world.player.x + randRange(-70, 70), y: world.player.y + randRange(-70, 70) } : randomValidPointInRoom(world, {});
      bossZoneStrike(world, p.x, p.y, 70, 22, 0.9);
    }
    bossRadialBurst(world, b, projCount, 150);
    // Coup de poing au sol : quiconque est proche est projete en arriere.
    bossKnockbackPlayer(world, b, 110, 200, 10);
  }
  // Le colosse defonce le decor et se fait aider par des gravats vivants au fil du combat.
  if (s.lastPhase !== b.phase) {
    s.lastPhase = b.phase;
    if (b.phase >= 2) {
      bossDestroyNearestObstacle(world, b);
      bossSummonAdds(world, 'T1', b.phase === 3 ? 2 : 1, 3);
    }
  }
}

// ---------- BOSS 6 — LE CENTRE (noyau/oeil mecanique) ----------
function updateBoss6(world, b, dt) {
  const s = b.state;
  b.x = lerp(b.x, world.room.bounds.x + world.room.bounds.w / 2, dt * 0.5);
  b.y = lerp(b.y, world.room.bounds.y + world.room.bounds.h / 2, dt * 0.5);
  const interval = 2;
  bossCharge(b, interval, 0.35);
  if (b.timer >= interval) {
    b.timer = 0; b.charging = false;
    bossRadialBurst(world, b, 18, 150);
    if (b.phase >= 2) bossLineToward(world, b, 7, 26);
    if (b.phase >= 3) {
      for (let i = 0; i < 3; i++) {
        const p = randomValidPointInRoom(world, { margin: 60 });
        bossZoneStrike(world, p.x, p.y, 60, 18, 0.8);
      }
      // Pulsation du noyau : onde de choc qui repousse le joueur s'il est trop proche.
      bossKnockbackPlayer(world, b, 130, 220, 8);
    }
  }
}

// ============================================================
// APPARENCE : une silhouette distincte par boss (creature ou machine)
// ============================================================

function bossEyes(ctx, spread, size, glow) {
  ctx.save();
  ctx.fillStyle = glow || '#fff8e0';
  ctx.shadowColor = glow || '#fff8e0';
  ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(-spread, -2, size, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(spread, -2, size, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#1a0a08';
  ctx.beginPath(); ctx.arc(-spread, -2, size * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(spread, -2, size * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// B1 — creature de glace noueuse : coques tressees + coeur lumineux
function drawBossBody1(ctx, b) {
  const t = performance.now() / 500;
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const a = t * (i % 2 === 0 ? 1 : -1) + (i * Math.PI * 2) / 3;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(b.radius * 0.55, 0);
    const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, b.radius * 0.85);
    grad.addColorStop(0, '#eafcff');
    grad.addColorStop(0.5, b.color);
    grad.addColorStop(1, '#0c2733');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#0c2733';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, 0, b.radius * 0.62, b.radius * 0.36, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  const coreGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, b.radius * 0.55);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.5, b.color);
  coreGrad.addColorStop(1, '#123a4a');
  ctx.fillStyle = coreGrad;
  ctx.strokeStyle = '#0c2733';
  ctx.lineWidth = 3;
  ctx.shadowColor = b.color; ctx.shadowBlur = b.charging ? 28 : 14;
  ctx.beginPath(); ctx.arc(0, 0, b.radius * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  bossEyes(ctx, b.radius * 0.2, b.radius * 0.1, '#ff5d5d');
  ctx.restore();
}

// B2 — creature vegetale : bulbe central + tentacules-tiges avec gousses
function drawBossBody2(ctx, b) {
  const t = performance.now() / 700;
  ctx.save();
  const vines = 6;
  for (let i = 0; i < vines; i++) {
    const a = (i / vines) * Math.PI * 2 + Math.sin(t + i) * 0.15;
    const len = b.radius * (1.15 + 0.1 * Math.sin(t * 1.3 + i));
    const midx = Math.cos(a) * len * 0.55, midy = Math.sin(a) * len * 0.55;
    const endx = Math.cos(a + 0.3) * len, endy = Math.sin(a + 0.3) * len;
    ctx.strokeStyle = '#2f7a3f';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(midx, midy, endx, endy); ctx.stroke();
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(endx, endy, b.radius * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
  const bulbGrad = ctx.createRadialGradient(-b.radius * 0.2, -b.radius * 0.2, 1, 0, 0, b.radius * 0.7);
  bulbGrad.addColorStop(0, '#e9ffe0');
  bulbGrad.addColorStop(0.5, b.color);
  bulbGrad.addColorStop(1, '#123018');
  ctx.fillStyle = bulbGrad;
  ctx.strokeStyle = '#123018';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, b.radius * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  bossEyes(ctx, b.radius * 0.24, b.radius * 0.11, '#ffe08a');
  ctx.restore();
}

// B3 — machine gatling : chassis hexagonal + canons rotatifs
function drawBossBody3(ctx, b) {
  const spin = performance.now() / (b.charging ? 60 : 220);
  ctx.save();
  const bodyGrad = ctx.createRadialGradient(-b.radius * 0.2, -b.radius * 0.2, 1, 0, 0, b.radius);
  bodyGrad.addColorStop(0, '#fff2d9');
  bodyGrad.addColorStop(0.45, b.color);
  bodyGrad.addColorStop(1, '#3a2408');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#241705';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6 - Math.PI / 6;
    const px = Math.cos(a) * b.radius * 0.82, py = Math.sin(a) * b.radius * 0.82;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // canons rotatifs
  for (let i = 0; i < 4; i++) {
    const a = spin + (i * Math.PI) / 2;
    const bx = Math.cos(a) * b.radius * 0.5, by = Math.sin(a) * b.radius * 0.5;
    ctx.save();
    ctx.translate(bx, by); ctx.rotate(a);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(-3, -b.radius * 0.55, 6, b.radius * 0.55);
    ctx.restore();
  }
  ctx.fillStyle = '#ff5d5d';
  ctx.shadowColor = '#ff5d5d'; ctx.shadowBlur = b.charging ? 16 : 6;
  ctx.beginPath(); ctx.arc(0, 0, b.radius * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

// B4 — canon blinde sur rail : capsule allongee + tourelle
function drawBossBody4(ctx, b) {
  ctx.save();
  const bodyGrad = ctx.createLinearGradient(-b.radius, 0, b.radius, 0);
  bodyGrad.addColorStop(0, '#2a1338');
  bodyGrad.addColorStop(0.5, b.color);
  bodyGrad.addColorStop(1, '#2a1338');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#1a0d24';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, 0, b.radius * 1.15, b.radius * 0.62, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // rivets
  ctx.fillStyle = '#1a0d24';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.arc(i * b.radius * 0.38, -b.radius * 0.34, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(i * b.radius * 0.38, b.radius * 0.34, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  // tourelle centrale + canon
  ctx.fillStyle = '#3a2048';
  ctx.strokeStyle = '#1a0d24';
  ctx.beginPath(); ctx.arc(0, 0, b.radius * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#161016';
  ctx.fillRect(0, -5, b.radius * 0.85, 10);
  ctx.fillStyle = b.charging ? '#ffe08a' : '#ff5d5d';
  ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = b.charging ? 18 : 8;
  ctx.beginPath(); ctx.arc(0, 0, b.radius * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

// B5 — golem de pierre/fer : torse massif, fissures lumineuses, poings
function drawBossBody5(ctx, b) {
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 400);
  ctx.save();
  // poings
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * b.radius * 0.92, b.radius * 0.25);
    const fistGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, b.radius * 0.4);
    fistGrad.addColorStop(0, '#c9b79a'); fistGrad.addColorStop(1, '#4a3826');
    ctx.fillStyle = fistGrad;
    ctx.strokeStyle = '#241a10'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, b.radius * 0.38, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  const bodyGrad = ctx.createRadialGradient(-b.radius * 0.25, -b.radius * 0.3, 2, 0, 0, b.radius);
  bodyGrad.addColorStop(0, '#cbb491');
  bodyGrad.addColorStop(0.5, b.color);
  bodyGrad.addColorStop(1, '#241a10');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#1a1108';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  const spikes = 8;
  for (let i = 0; i < spikes; i++) {
    const a = (Math.PI * 2 * i) / spikes;
    const r = i % 2 === 0 ? b.radius : b.radius * 0.82;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // fissures d'energie
  ctx.strokeStyle = `rgba(255,140,60,${0.5 + 0.4 * pulse})`;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#ff8c3c'; ctx.shadowBlur = 10 * pulse;
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI * 2 * i) / 4 + 0.4;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * b.radius * 0.4, Math.sin(a) * b.radius * 0.4);
    ctx.lineTo(Math.cos(a + 0.3) * b.radius * 0.75, Math.sin(a + 0.3) * b.radius * 0.75);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  bossEyes(ctx, b.radius * 0.26, b.radius * 0.13, '#ff8c3c');
  ctx.restore();
}

// B6 — noyau mecanique : anneaux orbitaux + iris central
function drawBossBody6(ctx, b) {
  const t = performance.now() / 900;
  ctx.save();
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate(t * (i % 2 === 0 ? 1 : -1) + (i * Math.PI) / 3);
    ctx.strokeStyle = i === 0 ? b.color : 'rgba(255,93,93,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, b.radius * (0.95 - i * 0.16), b.radius * (0.32 - i * 0.05), 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  const irisGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, b.radius * 0.6);
  irisGrad.addColorStop(0, '#ffffff');
  irisGrad.addColorStop(0.35, b.color);
  irisGrad.addColorStop(1, '#2a0508');
  ctx.fillStyle = irisGrad;
  ctx.strokeStyle = '#1a0508';
  ctx.lineWidth = 3;
  ctx.shadowColor = b.color; ctx.shadowBlur = b.charging ? 30 : 14;
  ctx.beginPath(); ctx.arc(0, 0, b.radius * 0.58, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#1a0508';
  const pupil = b.radius * (0.16 + 0.05 * Math.sin(performance.now() / 260));
  ctx.beginPath(); ctx.arc(0, 0, pupil, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

const BOSS_BODY = {
  B1: drawBossBody1, B2: drawBossBody2, B3: drawBossBody3,
  B4: drawBossBody4, B5: drawBossBody5, B6: drawBossBody6,
};

function drawBoss(ctx, camera, b) {
  const sx = b.x - camera.x, sy = b.y - camera.y;
  ctx.save();
  ctx.translate(sx, sy);
  if (b.state.phaseChangeFx > 0) {
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = b.state.phaseChangeFx;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, b.radius + 14, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const bodyFn = BOSS_BODY[b.type] || drawBossBody6;
  try { bodyFn(ctx, b); } catch (e) { /* apercu indisponible */ }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText(`P${b.phase}`, 0, b.radius + 13);
  if (b.charging) {
    const pulse = (performance.now() / 300) % 1;
    ctx.globalAlpha = 0.55 * (1 - pulse);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, b.radius + 10 + pulse * 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  const w = 90;
  ctx.save();
  ctx.translate(sx - w / 2, sy - b.radius - 18);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, w, 8);
  ctx.fillStyle = b.color;
  ctx.fillRect(0, 0, w * clamp(b.hp / b.maxHp, 0, 1), 8);
  ctx.strokeStyle = '#000';
  ctx.strokeRect(0, 0, w, 8);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText(b.name, sx, sy - b.radius - 24);
  ctx.restore();
}
