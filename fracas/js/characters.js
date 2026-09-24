// Les 11 personnages jouables : attaque + 3 competences chacun.
// CHARACTERS[id] expose : nom, vitesse, libelles HUD/selection, init(player), update(world,player,dt,realDt),
// onAttackPress/onAttackHeld/onAttackRelease, ability1/2/3 (+ *Held variantes), draw(ctx,player,world).

const CHARACTERS = {};

// ---------- Aides de rendu partagees (ombre au sol, degrades, respiration idle) ----------
function drawGroundShadow(ctx, ry, rx) {
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(0, ry, rx || 15, (rx || 15) * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function radialBodyGradient(ctx, r, light, mid, dark) {
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.15);
  g.addColorStop(0, light);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, dark);
  return g;
}
function idleBob(amp) { return Math.sin(performance.now() / 480) * (amp == null ? 2 : amp); }
function glowOutline(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur == null ? 10 : blur;
}

// ============================================================
// PERSONNAGE 1 — LE PISTOLET VIVANT
// ============================================================
const COLT_FIRE_INTERVAL = 0.25, COLT_FOCUS_INTERVAL = 0.15; // cadence doublee
CHARACTERS[1] = {
  id: 1, name: 'Colt', epithet: 'Le Pistolet Vivant', speedPercent: 42, color: '#ffd23d', // vitesse +20%
  attackLabel: 'Echange de position avec le pistolet (tir 360 automatique)', attackCd: 0.2,
  a1Label: 'Chaos mobile', a1Cd: 14,
  a2Label: 'Salve autour du pistolet', a2Cd: 6,
  a3Label: 'Concentration (maintenir)', a3Cd: 0,

  init(player) {
    player.state = { gunAngle: 0, gunOrbitRadius: 95, fireTimer: 0, concentrating: false };
  },

  update(world, player, dt) {
    const st = player.state;
    st.gunX = player.x + Math.cos(st.gunAngle) * st.gunOrbitRadius;
    st.gunY = player.y + Math.sin(st.gunAngle) * st.gunOrbitRadius;
    if (!st.concentrating) {
      st.gunAngle += 1.6 * dt;
      st.fireTimer += dt;
      if (st.fireTimer >= COLT_FIRE_INTERVAL) { // cadence x2
        st.fireTimer = 0;
        const dir = vecFromAngle(st.gunAngle);
        spawnPlayerProjectile(world, player, {
          x: st.gunX, y: st.gunY, vx: dir.x * 360, vy: dir.y * 360,
          radius: 7, dmgValue: 20 * 1.33, life: 1.4, // +33% degats
        });
        Audio2.gunshot(0.45);
      }
    } else {
      st.fireTimer += dt;
      if (st.fireTimer >= COLT_FOCUS_INTERVAL) {
        st.fireTimer = 0;
        const ang = angleTo(st.gunX, st.gunY, player.aim.x, player.aim.y);
        const dir = vecFromAngle(ang);
        spawnPlayerProjectile(world, player, {
          x: st.gunX, y: st.gunY, vx: dir.x * 460, vy: dir.y * 460,
          radius: 7, dmgValue: 36 * 1.33, life: 1.4, color: '#ff9d3d', // +33% degats
        });
        Audio2.gunshot(0.6);
      }
    }
  },

  onAttackPress(world, player) {
    if (player.attackCooldown > 0) return;
    const st = player.state;
    const gx = st.gunX, gy = st.gunY, px = player.x, py = player.y;
    player.x = gx; player.y = gy;
    st.gunAngle = Math.atan2(py - player.y, px - player.x);
    Particles.burst(px, py, 10, '#ffd23d', { maxSpeed: 140 });
    Particles.burst(gx, gy, 10, '#7fd8ff', { maxSpeed: 140 });
    Particles.lightning(px, py, gx, gy, '#ffe98a');
    Audio2.zap();
    player.attackCooldown = 0.2;
  },

  ability1(world, player) {
    for (const e of world.enemies) {
      if (e.dead || e.kind === 'boss') continue;
      const p = randomValidPointInRoom(world, { margin: 40, avoidPlayerRadius: 50 });
      const from = { x: e.x, y: e.y };
      e.x = p.x; e.y = p.y;
      Particles.lightning(from.x, from.y, p.x, p.y, '#ffd23d');
    }
    Particles.burst(player.x, player.y, 20, '#ffd23d', { maxSpeed: 200 });
    Audio2.teleport();
    player.cooldowns.a1 = 14;
  },

  ability2(world, player) {
    const st = player.state;
    for (const e of enemiesInRadius(world, st.gunX, st.gunY, 110)) damageEnemy(world, e, 30 * 1.33, player); // +33% degats
    Particles.ring(st.gunX, st.gunY, 110, '#ff9d3d', 0.35);
    Particles.burst(st.gunX, st.gunY, 26, '#ff9d3d', { maxSpeed: 220 });
    Audio2.boom2();
    player.cooldowns.a2 = 6;
  },

  ability3Held(world, player, dt, held) {
    player.state.concentrating = held;
  },

  draw(ctx, player) {
    const st = player.state;
    const bob = idleBob(1.5);
    drawGroundShadow(ctx, 13, 15);
    ctx.save();
    ctx.translate(0, bob);
    ctx.fillStyle = radialBodyGradient(ctx, 15, '#fff3b0', '#ffd23d', '#c99400');
    ctx.strokeStyle = '#4a3600';
    ctx.lineWidth = 2;
    glowOutline(ctx, 'rgba(255,210,61,0.5)', 8);
    ctx.beginPath();
    ctx.ellipse(0, 4, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(-2, -1, 8, 4, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
    ctx.beginPath(); ctx.arc(-6, -2, 3.2, 0, Math.PI * 2); ctx.arc(6, -2, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1500'; ctx.fill();
    ctx.beginPath(); ctx.arc(-6.8, -2.8, 1, 0, Math.PI * 2); ctx.arc(5.2, -2.8, 1, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();

    // Repli si le pistolet n'a pas encore de position calculee (ex : apercu de la fiche personnage,
    // qui dessine sans jamais appeler update()) : evite qu'il se superpose a la tete a (0,0).
    const gunX = st.gunX != null ? st.gunX : player.x + 24;
    const gunY = st.gunY != null ? st.gunY : player.y;
    const gx = gunX - player.x, gy = gunY - player.y;
    const ang = player.state.concentrating ? angleTo(gunX, gunY, player.aim.x, player.aim.y) : (st.gunAngle || 0);
    ctx.save();
    ctx.translate(gx, gy + bob * 0.4);
    ctx.rotate(ang);
    const gunColor = player.state.concentrating ? '#ff9d3d' : '#7fd8ff';
    glowOutline(ctx, gunColor, player.state.concentrating ? 14 : 8);
    const gg = ctx.createLinearGradient(0, -5, 0, 5);
    gg.addColorStop(0, player.state.concentrating ? '#ffd7a8' : '#d8f4ff');
    gg.addColorStop(1, gunColor);
    ctx.fillStyle = gg;
    ctx.strokeStyle = '#0c2430';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-8, -3); ctx.lineTo(-8, 3); ctx.lineTo(-4, 5); ctx.lineTo(16, 5); ctx.lineTo(18, 2); ctx.lineTo(18, -2); ctx.lineTo(16, -5); ctx.lineTo(-4, -5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0c2430';
    ctx.fillRect(-9, -2.5, 5, 5);
    ctx.restore();
  },
};

// ============================================================
// PERSONNAGE 2 — LE SAUTEUR
// ============================================================
// Nyx pose des trampolines : l'atterrissage est oriente dans le sens ou il a ete pose par rapport
// a lui. 3 trampolines max par salle (le 4e en fait disparaitre un au hasard). Quand Nyx en prend
// un, il saute et, en retombant, projette 4 projectiles (haut, bas, gauche, droite).
const NYX_DMG = 0.7;
const NYX_TRAMP_RANGE = 80, NYX_JUMP_DIST = 240, NYX_TRAMP_MAX = 3, NYX_ATTACK_CD = 0.7;
const NYX_JUMP_TIME = 0.55, NYX_SHOT_DMG = 22, NYX_SHOT_SPEED = 400;
CHARACTERS[2] = {
  id: 2, name: 'Nyx', epithet: 'Le Sauteur', speedPercent: 60, color: '#c77aff',
  attackLabel: 'Pose un trampoline (3 max) · atterrissage = 4 projectiles', attackCd: NYX_ATTACK_CD,
  a1Label: 'Echange avec tourelle', a1Cd: 8,
  a2Label: 'Trainee de feu', a2Cd: 10,
  a3Label: 'Retour en arriere (1s)', a3Cd: 7,

  init(player) { player.state = { dashTimer: 0, trail: [], tramps: [], jump: null, room: null }; },

  update(world, player, dt, realDt) {
    const st = player.state;
    // les trampolines appartiennent a la salle : nouvelle salle = plus de trampolines
    if (st.room !== world.room) { st.room = world.room; st.tramps = []; st.jump = null; player.airborne = false; player.airScale = 1; }
    if (st.dashTimer > 0) {
      st.dashTimer -= dt;
      st.trailTimer = (st.trailTimer || 0) + dt;
      if (st.trailTimer > 0.04) {
        st.trailTimer = 0;
        world.zones.push(makeZone({
          x: player.x, y: player.y, radius: 22, duration: 3, tickInterval: 0.4,
          color: 'rgba(255,120,40,0.35)', edgeColor: '#ff7a28', team: TEAM.PLAYER,
          onTick(z) { for (const e of enemiesInRadius(world, z.x, z.y, z.radius)) damageEnemy(world, e, 3 * NYX_DMG, player); },
        }));
      }
      if (st.dashTimer <= 0) player.state.movementOverride = null;
    }
    for (const t of st.tramps) if (t.bounce > 0) t.bounce -= dt;
    // saut en cours : trajectoire imposee au-dessus de tout
    if (st.jump) {
      const j = st.jump;
      j.t += dt;
      const f = clamp(j.t / j.dur, 0, 1);
      player.x = lerp(j.x0, j.x1, f); player.y = lerp(j.y0, j.y1, f);
      player.airScale = 1 + 0.6 * Math.sin(Math.PI * f);
      player.airborne = true;
      if (f >= 1) {
        st.jump = null; player.airborne = false; player.airScale = 1;
        this.onTrampolineLand(world, player);
      }
      return;
    }
    // marcher sur un de ses trampolines = saut
    for (const t of st.tramps) {
      if (Math.hypot(t.x - player.x, t.y - player.y) < 18) {
        st.jump = { x0: player.x, y0: player.y, x1: t.lx, y1: t.ly, t: 0, dur: NYX_JUMP_TIME };
        player.airborne = true;
        t.bounce = 0.3;
        Audio2.whoosh();
        break;
      }
    }
  },

  // Atterrissage de N'IMPORTE QUEL trampoline (les siens, ceux des salles, des parcours, de la
  // base...) : 4 projectiles en croix.
  onTrampolineLand(world, player) {
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      spawnPlayerProjectile(world, player, {
        x: player.x + dx * 16, y: player.y + dy * 16, vx: dx * NYX_SHOT_SPEED, vy: dy * NYX_SHOT_SPEED,
        radius: 7, dmgValue: NYX_SHOT_DMG, life: 1.1, color: '#e0b3ff',
      });
    }
    Particles.ring(player.x, player.y, 34, '#c77aff', 0.3);
    Particles.burst(player.x, player.y, 18, '#e0c8ff', { maxSpeed: 200 });
    if (Game.shakeCamera) Game.shakeCamera(3, 0.12);
    Audio2.explosion(0.5);
  },

  // Pose un trampoline au curseur (a portee) ; il fait atterrir plus loin dans la meme direction.
  onAttackPress(world, player) {
    const st = player.state;
    if (player.attackCooldown > 0 || st.jump) return;
    const d0 = normalize(player.aim.x - player.x, player.aim.y - player.y);
    const dir = (d0.x || d0.y) ? d0 : vecFromAngle(player.facing);
    const dist = clamp(Math.hypot(player.aim.x - player.x, player.aim.y - player.y), 36, NYX_TRAMP_RANGE); // pose tout pres de Nyx
    const spot = parkourSafeSpot(world, player.x + dir.x * dist, player.y + dir.y * dist, 18);
    if (!spot) return;
    const land = parkourSafeSpot(world, spot.x + dir.x * NYX_JUMP_DIST, spot.y + dir.y * NYX_JUMP_DIST, player.radius + 2) || { x: spot.x, y: spot.y };
    if (st.tramps.length >= NYX_TRAMP_MAX) st.tramps.splice(Math.floor(Math.random() * st.tramps.length), 1); // le 4e en remplace un au hasard
    st.tramps.push({ x: spot.x, y: spot.y, lx: land.x, ly: land.y, bounce: 0 });
    Particles.ring(spot.x, spot.y, 22, '#c77aff', 0.25);
    Audio2.spark();
    player.attackCooldown = NYX_ATTACK_CD;
  },

  ability1(world, player) {
    const t = nearestTurret(world, player.x, player.y);
    if (!t) return;
    const px = player.x, py = player.y;
    player.x = t.x; player.y = t.y;
    t.x = px; t.y = py;
    damageEnemy(world, t, 30 * NYX_DMG, player);
    Particles.burst(player.x, player.y, 14, '#c77aff', { maxSpeed: 160 });
    Particles.burst(px, py, 14, '#c77aff', { maxSpeed: 160 });
    Audio2.zap();
    player.cooldowns.a1 = 8;
  },

  ability2(world, player) {
    player.state.dashTimer = 1.4;
    const mv = Input.moveVector();
    const dir = (mv.x || mv.y) ? mv : vecFromAngle(player.facing);
    player.state.movementOverride = { vx: dir.x * BASE_SPEED * 0.35, vy: dir.y * BASE_SPEED * 0.35 };
    Audio2.whoosh();
    player.cooldowns.a2 = 10;
  },

  ability3(world, player) {
    const from = { x: player.x, y: player.y };
    const p = playerSampleHistory(player, 1);
    player.x = p.x; player.y = p.y;
    Particles.burst(player.x, player.y, 16, '#c77aff', { maxSpeed: 160 });
    Particles.ring(from.x, from.y, 40, '#c77aff', 0.3);
    Audio2.teleport();
    player.cooldowns.a3 = 7;
  },

  draw(ctx, player) {
    const st = player.state;
    const k = player.airScale || 1;
    if (st.tramps && st.tramps.length) {
      // dessines dans le repere du joueur (deja zoome si Nyx est en l'air) : on annule ce zoom
      ctx.save(); ctx.scale(1 / k, 1 / k);
      const t = performance.now() / 1000;
      for (const tr of st.tramps) drawTrampoline(ctx, tr, { x: player.x, y: player.y }, t);
      ctx.restore();
    }
    if (st.jump) {
      ctx.save(); ctx.scale(1 / k, 1 / k);
      ctx.globalAlpha = 0.35 / k; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(0, 12, 16 / k, 7 / k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    drawGroundShadow(ctx, 12, 14);
    for (let i = 1; i <= 2; i++) {
      const p = playerSampleHistory(player, i * 0.1);
      ctx.save();
      ctx.globalAlpha = 0.12 / i;
      ctx.fillStyle = '#c77aff';
      ctx.beginPath();
      ctx.translate(p.x - player.x, p.y - player.y);
      ctx.moveTo(-16, 6); ctx.quadraticCurveTo(0, -18, 16, 6); ctx.quadraticCurveTo(0, 14, -16, 6);
      ctx.fill();
      ctx.restore();
    }
    const bob = idleBob(1.5);
    ctx.save();
    ctx.translate(0, bob);
    glowOutline(ctx, 'rgba(199,122,255,0.55)', 12);
    ctx.fillStyle = radialBodyGradient(ctx, 17, '#ecd6ff', '#a05dff', '#5a1fa8');
    ctx.strokeStyle = '#2b0c4d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, 6); ctx.quadraticCurveTo(0, -18, 16, 6); ctx.quadraticCurveTo(0, 14, -16, 6);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-2, 4); ctx.moveTo(5, -8); ctx.lineTo(9, -1); ctx.stroke();
    ctx.fillStyle = '#160531';
    ctx.beginPath(); ctx.arc(-5, -1, 2.4, 0, Math.PI * 2); ctx.arc(5, -1, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8d5ff';
    ctx.beginPath(); ctx.arc(-5.6, -1.6, 0.8, 0, Math.PI * 2); ctx.arc(4.4, -1.6, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
};

// ============================================================
// PERSONNAGE 3 — LE BOOMERANG
// ============================================================
const KIP_BOOM_SPEED = 520 * 0.7; // -30% vitesse
const KIP_CATCH_CD = 0.5;
CHARACTERS[3] = {
  id: 3, name: 'Kip', epithet: 'Le Boomerang', speedPercent: 75, color: '#5dff9d',
  attackLabel: 'Lance le boomerang', attackCd: KIP_CATCH_CD,
  a1Label: 'Surcharge (+dmg / -vitesse)', a1Cd: 3,
  a2Label: 'Boomerang curseur', a2Cd: 0,
  a3Label: 'Zones de glace x5', a3Cd: 12,

  init(player) {
    player.state = { boom: null, dmgMult: 1, speedMult: 1, cursorBoom: false, ice: [] };
  },

  update(world, player, dt) {
    const st = player.state;
    const b = st.boom;
    if (b) {
      let onIce = false;
      for (const z of world.zones) {
        if (z.terrainType === 'boomIce' && zoneContainsPoint(z, b.x, b.y)) onIce = true;
      }
      const speedMult = onIce ? 1.3 : 1;
      if (b.state === 'out') {
        b.x += b.vx * speedMult * dt; b.y += b.vy * speedMult * dt;
        let hit = false;
        for (const e of world.enemies) {
          if (e.dead) continue;
          if (circleCircle(b.x, b.y, 10, e.x, e.y, e.radius || 16)) {
            damageEnemy(world, e, 25 * st.dmgMult, player);
            hit = true; break;
          }
        }
        const room = world.room;
        let wallHit = false;
        if (room) {
          const bb = room.bounds;
          if (b.x < bb.x || b.x > bb.x + bb.w || b.y < bb.y || b.y > bb.y + bb.h) wallHit = true;
          for (const ob of room.obstacles) if (circleRect(b.x, b.y, 10, ob.x, ob.y, ob.w, ob.h)) wallHit = true;
        }
        if (hit || wallHit || dist(b.x, b.y, player.x, player.y) > 620) {
          b.state = 'back';
          if (b.double) b.b2.state = 'back';
        }
        if (b.double && b.b2.state === 'out') {
          b.b2.x += b.b2.vx * speedMult * dt; b.b2.y += b.b2.vy * speedMult * dt;
          for (const e of world.enemies) {
            if (e.dead) continue;
            if (circleCircle(b.b2.x, b.b2.y, 10, e.x, e.y, e.radius || 16)) { damageEnemy(world, e, 25 * st.dmgMult, player); b.b2.state = 'back'; break; }
          }
        }
      } else {
        const ang = angleTo(b.x, b.y, player.x, player.y);
        const dir = vecFromAngle(ang);
        const spd = KIP_BOOM_SPEED * st.speedMult * speedMult;
        b.x += dir.x * spd * dt; b.y += dir.y * spd * dt;
        if (!b.hitReturnIds) b.hitReturnIds = new Set();
        for (const e of world.enemies) {
          if (e.dead || b.hitReturnIds.has(e.id)) continue;
          if (circleCircle(b.x, b.y, 10, e.x, e.y, e.radius || 16)) {
            damageEnemy(world, e, 25 * st.dmgMult, player);
            b.hitReturnIds.add(e.id);
          }
        }
        if (b.double && b.b2.state === 'back') {
          const ang2 = angleTo(b.b2.x, b.b2.y, player.x, player.y);
          const dir2 = vecFromAngle(ang2);
          b.b2.x += dir2.x * spd * dt; b.b2.y += dir2.y * spd * dt;
          if (!b.b2.hitReturnIds) b.b2.hitReturnIds = new Set();
          for (const e of world.enemies) {
            if (e.dead || b.b2.hitReturnIds.has(e.id)) continue;
            if (circleCircle(b.b2.x, b.b2.y, 10, e.x, e.y, e.radius || 16)) {
              damageEnemy(world, e, 25 * st.dmgMult, player);
              b.b2.hitReturnIds.add(e.id);
            }
          }
        }
        if (dist(b.x, b.y, player.x, player.y) < 20) {
          st.boom = null;
          player.attackCooldown = KIP_CATCH_CD; // 0,5 s avant de pouvoir le relancer
        }
      }
    }
    if (st.cursorBoom) { st.cursorX = player.aim.x; st.cursorY = player.aim.y; }
  },

  onAttackPress(world, player) {
    const st = player.state;
    if (st.boom || player.attackCooldown > 0) return;
    const dir = vecFromAngle(player.facing);
    st.boom = {
      x: player.x, y: player.y, vx: dir.x * KIP_BOOM_SPEED * st.speedMult, vy: dir.y * KIP_BOOM_SPEED * st.speedMult,
      state: 'out', double: false,
    };
    if (player.state.pendingDouble) {
      const perp = { x: -dir.y, y: dir.x };
      st.boom.x -= perp.x * 12; st.boom.y -= perp.y * 12;
      st.boom.double = true;
      st.boom.b2 = { x: player.x + perp.x * 24, y: player.y + perp.y * 24, vx: dir.x * KIP_BOOM_SPEED * st.speedMult, vy: dir.y * KIP_BOOM_SPEED * st.speedMult, state: 'out' };
      player.state.pendingDouble = false;
    }
    Audio2.boomerang();
  },

  ability1(world, player) {
    const st = player.state;
    st.dmgMult += 0.2;
    st.speedMult = Math.max(0.05, st.speedMult - 0.1);
    Particles.text(player.x, player.y - 30, 'SURCHARGE', '#5dff9d');
    Particles.spawn(player.x, player.y - 10, { r: 4, life: 0.4, color: '#5dff9d', vy: -30 });
    Audio2.charge(0.25);
    player.cooldowns.a1 = 3;
  },

  ability2(world, player) {
    player.state.cursorBoom = !player.state.cursorBoom;
    Audio2.spark();
  },

  ability3(world, player) {
    for (let i = 0; i < 5; i++) {
      const p = randomValidPointInRoom(world, { margin: 40, avoidPlayerRadius: 20 });
      world.zones.push(makeZone({
        x: p.x, y: p.y, radius: 50, duration: 8, tickInterval: 999,
        color: 'rgba(157,232,255,0.3)', edgeColor: COLORS.ice, terrainType: 'boomIce',
      }));
      Particles.ring(p.x, p.y, 50, COLORS.ice, 0.35);
    }
    Audio2.freeze();
    player.cooldowns.a3 = 12;
  },

  draw(ctx, player) {
    const bob = idleBob(1.5);
    drawGroundShadow(ctx, 13, 14);
    ctx.save();
    ctx.translate(0, bob);
    glowOutline(ctx, 'rgba(93,255,157,0.5)', 8);
    ctx.fillStyle = radialBodyGradient(ctx, 14, '#c8ffdf', '#3dbd6f', '#0f5a2c');
    ctx.strokeStyle = '#0c3018';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 4, 14, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    const earGrad = ctx.createLinearGradient(0, -22, 0, -6);
    earGrad.addColorStop(0, '#9dffc4'); earGrad.addColorStop(1, '#5dff9d');
    ctx.fillStyle = earGrad;
    ctx.strokeStyle = '#0c3018'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(6, -6); ctx.lineTo(-6, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#062b14';
    ctx.beginPath(); ctx.arc(-5, 2, 2.2, 0, Math.PI * 2); ctx.arc(5, 2, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-5.6, 1.4, 0.7, 0, Math.PI * 2); ctx.arc(4.4, 1.4, 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const st = player.state;
    if (st.boom) {
      const bx = st.boom.x - player.x, by = st.boom.y - player.y;
      drawBoomShape(ctx, bx, by);
      if (st.boom.double) drawBoomShape(ctx, st.boom.b2.x - player.x, st.boom.b2.y - player.y);
    }
    if (st.cursorBoom && st.cursorX != null) {
      ctx.save(); ctx.globalAlpha = 0.6;
      drawBoomShape(ctx, st.cursorX - player.x, st.cursorY - player.y);
      ctx.restore();
    }
  },
};
function drawBoomShape(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(performance.now() / 100);
  ctx.shadowColor = '#5dff9d';
  ctx.shadowBlur = 10;
  const g = ctx.createLinearGradient(-9, -9, 9, 6);
  g.addColorStop(0, '#c8ffdf'); g.addColorStop(1, '#3dbd6f');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#0c3018';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -9); ctx.lineTo(3, 0); ctx.lineTo(9, 6); ctx.lineTo(0, 3); ctx.lineTo(-9, 6); ctx.lineTo(-3, 0); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ============================================================
// PERSONNAGE 4 — LES QUATRE ORBES
// ============================================================
const BRAISE_ORB_DMG = 7 * 2; // degats x2
CHARACTERS[4] = {
  id: 4, name: 'Braise', epithet: 'Les Quatre Orbes', speedPercent: 85, color: '#ff7a3d',
  attackLabel: 'Contact des orbes (automatique)',
  a1Label: 'Bouclier alea.', a1Cd: 14,
  a2Label: 'Ecartement (maintenir)', a2Cd: 0,
  a3Label: 'Reduction de zone', a3Cd: 16,

  init(player) {
    player.state = {
      offsets: [0, Math.PI / 2, Math.PI, Math.PI * 1.5],
      dist: 84, targetDist: 84, reshuffleTimer: 0, tickTimer: 0, // ecart +20% (70 -> 84)
    };
  },

  update(world, player, dt) {
    const st = player.state;
    st.reshuffleTimer += dt;
    if (st.reshuffleTimer >= 20) {
      st.reshuffleTimer = 0;
      st.offsets = shuffle([0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a) => a + randRange(-0.4, 0.4)));
      Particles.burst(player.x, player.y, 16, '#ff7a3d', { maxSpeed: 120 });
    }
    st.orbitAngle = (st.orbitAngle || 0) + 0.9 * dt;
    st.dist = lerp(st.dist, st.targetDist, clamp(dt * 4, 0, 1));
    st.orbs = st.offsets.map((a) => ({ x: player.x + Math.cos(a + st.orbitAngle) * st.dist, y: player.y + Math.sin(a + st.orbitAngle) * st.dist }));
    st.tickTimer += dt;
    if (st.tickTimer >= 0.35) {
      st.tickTimer = 0;
      let burned = false;
      for (const o of st.orbs) for (const e of enemiesInRadius(world, o.x, o.y, 16)) { damageEnemy(world, e, BRAISE_ORB_DMG, player); burned = true; }
      if (burned) Audio2.fire(0.5);
    }
  },

  ability1(world, player) {
    const p = randomValidPointInRoom(world, { margin: 50, avoidPlayerRadius: 0 });
    world.shields.push(makeShield({ x: p.x, y: p.y, radius: 46, duration: 6, color: '#ff7a3d' }));
    Particles.ring(p.x, p.y, 46, '#ff7a3d', 0.4);
    Audio2.shield();
    player.cooldowns.a1 = 14;
  },

  ability2Held(world, player, dt, held) {
    player.state.targetDist = held ? 216 : 84; // ecart +20%
  },

  ability3(world, player) {
    const room = world.room;
    if (!room) return;
    const b = room.bounds;
    const shrinkW = b.w * 0.15, shrinkH = b.h * 0.15;
    const nx = b.x + shrinkW / 2, ny = b.y + shrinkH / 2, nw = b.w - shrinkW, nh = b.h - shrinkH;
    for (const e of world.enemies) {
      if (e.dead) continue;
      if (!pointInRect(e.x, e.y, nx, ny, nw, nh)) {
        damageEnemy(world, e, 40 * 2, player); // degats x2
        e.x = clamp(e.x, nx + (e.radius || 16), nx + nw - (e.radius || 16));
        e.y = clamp(e.y, ny + (e.radius || 16), ny + nh - (e.radius || 16));
      }
    }
    room.bounds = { x: nx, y: ny, w: nw, h: nh };
    player.x = clamp(player.x, nx + player.radius, nx + nw - player.radius);
    player.y = clamp(player.y, ny + player.radius, ny + nh - player.radius);
    Particles.burst(player.x, player.y, 30, '#ff3d1a', { maxSpeed: 260, life: 0.5 });
    Audio2.boom2();
    player.cooldowns.a3 = 16;
  },

  draw(ctx, player, world) {
    const bob = idleBob(1.5);
    drawGroundShadow(ctx, 12, 13);
    ctx.save();
    ctx.translate(0, bob);
    glowOutline(ctx, 'rgba(255,122,61,0.55)', 10);
    ctx.fillStyle = radialBodyGradient(ctx, 13, '#ffd8a8', '#e05a1e', '#7a2600');
    ctx.strokeStyle = '#4a1a05';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1f0800';
    ctx.beginPath(); ctx.arc(-4.5, -1, 2, 0, Math.PI * 2); ctx.arc(4.5, -1, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const st = player.state;
    if (st.orbs) {
      for (const o of st.orbs) {
        ctx.save();
        ctx.translate(o.x - player.x, o.y - player.y);
        const flick = 1 + Math.sin(performance.now() / 90 + o.x) * 0.08;
        ctx.scale(flick, flick);
        const og = ctx.createRadialGradient(0, 0, 0, 0, 0, 9);
        og.addColorStop(0, '#fff3c8'); og.addColorStop(0.5, '#ffb14d'); og.addColorStop(1, '#ff3d1a');
        ctx.fillStyle = og;
        ctx.shadowColor = '#ff7a3d'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  },
};

// ============================================================
// PERSONNAGE 5 — LE REBOND
// ============================================================
const FERRO_KNIFE_DMG = 27 * 0.7 * 1.4; // -30% puis +40% de degats
const FERRO_ATTACK_CD = 0.35 * 3 * 2;  // delai d'attaque x3 puis encore x2
const FERRO_KNIFE_LIFE = 6 * 0.65; // portee -35% (vitesse constante => duree de vie -35%)
CHARACTERS[5] = {
  id: 5, name: 'Ferro', epithet: 'Le Rebond', speedPercent: 100, color: '#7fd8ff',
  attackLabel: 'Deux projectiles rebondissants', attackCd: FERRO_ATTACK_CD,
  a1Label: 'Poussee', a1Cd: 9 * 1.4,
  a2Label: 'Mur 1x1', a2Cd: 10 * 1.4,
  a3Label: 'Rebonds prolonges (+0.3s/rebond)', a3Cd: 8 * 1.4,

  init(player) { player.state = { extendLifeQueued: false }; },
  update() {},

  onAttackPress(world, player) {
    if (player.attackCooldown > 0) return;
    const extend = player.state.extendLifeQueued;
    player.state.extendLifeQueued = false;
    const fire = (offsetAngle) => {
      const d = vecFromAngle(player.facing + offsetAngle);
      spawnPlayerProjectile(world, player, {
        x: player.x + d.x * 20, y: player.y + d.y * 20, vx: d.x * 380, vy: d.y * 380,
        // Rebondit sur TOUT contact avec un mur (bords, obstacles, murs poses) : aucune limite de
        // rebonds, seule la duree de vie (portee) arrete le couteau.
        radius: 7, dmgValue: FERRO_KNIFE_DMG, life: FERRO_KNIFE_LIFE, maxBounces: 999, bounceGrowth: 0.5,
        shape: 'knife', color: '#7fd8ff',
        dmgCap: FERRO_KNIFE_DMG * Math.pow(1.5, 6), // meme plafond de degats qu'avec l'ancienne limite de 6 rebonds
        onBounce: extend ? (pr) => { pr.life += 0.3; } : null,
      });
    };
    fire(-0.12); fire(0.12);
    Audio2.knifeThrow();
    player.attackCooldown = FERRO_ATTACK_CD;
  },

  ability1(world, player) {
    const dir = vecFromAngle(player.facing);
    for (const e of enemiesInRadius(world, player.x, player.y, 220)) {
      e.x += dir.x * 60; e.y += dir.y * 60;
      damageEnemy(world, e, 15 * 0.7, player); // -30% degats
    }
    Particles.ring(player.x, player.y, 220, '#7fd8ff', 0.35);
    Particles.burst(player.x, player.y, 20, '#7fd8ff', { maxSpeed: 200 });
    Audio2.gust();
    player.cooldowns.a1 = 9 * 1.4; // +40% recharge
  },

  ability2(world, player) {
    const dir = vecFromAngle(player.facing);
    world.walls.push(makeWall({ x: player.x + dir.x * 55, y: player.y + dir.y * 55, w: 48, h: 48, duration: 8 }));
    Audio2.impact();
    player.cooldowns.a2 = 10 * 1.4; // +40% recharge
  },

  ability3(world, player) {
    player.state.extendLifeQueued = true;
    Particles.text(player.x, player.y - 28, '+0.3s/REBOND', '#7fd8ff');
    Audio2.charge(0.3);
    player.cooldowns.a3 = 8 * 1.4; // +40% recharge
  },

  draw(ctx) {
    drawGroundShadow(ctx, 12, 13);
    const t = performance.now() / 1000;
    for (let i = 0; i < 3; i++) {
      const a = t * 1.6 + (i * Math.PI * 2) / 3;
      const r = 19;
      ctx.save();
      ctx.translate(Math.cos(a) * r, Math.sin(a) * r * 0.6);
      ctx.rotate(a * 2);
      ctx.fillStyle = '#8fd6ef';
      ctx.strokeStyle = '#0c2c3a';
      ctx.lineWidth = 1;
      ctx.fillRect(-3, -3, 6, 6);
      ctx.strokeRect(-3, -3, 6, 6);
      ctx.restore();
    }
    glowOutline(ctx, 'rgba(127,216,255,0.55)', 10);
    ctx.fillStyle = radialBodyGradient(ctx, 13, '#eafcff', '#5bb8e0', '#1a5578');
    ctx.strokeStyle = '#0c2c3a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(-3, -4, 5, 3, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    ctx.fillStyle = '#0c2c3a';
    ctx.beginPath(); ctx.arc(-4, 1, 2, 0, Math.PI * 2); ctx.arc(4, 1, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eafcff';
    ctx.beginPath(); ctx.arc(-4.6, 0.4, 0.7, 0, Math.PI * 2); ctx.arc(3.4, 0.4, 0.7, 0, Math.PI * 2); ctx.fill();
  },
};

// ============================================================
// PERSONNAGE 6 — LE METEORE
// ============================================================
const METEOR_MAX_DMG = 70 * 0.65; // -35% degats
CHARACTERS[6] = {
  id: 6, name: 'Cendre', epithet: 'Le Meteore', speedPercent: 100, color: '#ff7a3d',
  attackLabel: 'Charger puis lacher une meteorite',
  a1Label: 'Quatre meteorites', a1Cd: 9,
  a2Label: 'Invincibilite (0.5s)', a2Cd: 6,
  a3Label: 'Zone de charge (15/s)', a3Cd: 10,

  init(player) { player.state = { charging: false, chargeTime: 0, quadNext: false, zoneDmgArmed: false }; },

  update(world, player, dt) {
    const st = player.state;
    if (st.charging) {
      st.chargeTime = Math.min(3, st.chargeTime + dt);
      player.state.movementOverride = { vx: 0, vy: 0 };
      if (st.zoneDmgArmed) {
        st.chargeZoneTimer = (st.chargeZoneTimer || 0) + dt;
        if (st.chargeZoneTimer >= 0.2) {
          st.chargeZoneTimer = 0;
          for (const e of enemiesInRadius(world, player.aim.x, player.aim.y, 60)) damageEnemy(world, e, 3 * 0.65, player); // -35% degats
        }
      }
    }
  },

  onAttackHeld(world, player, dt, down) {
    const st = player.state;
    if (down && !st.charging) { st.charging = true; st.chargeTime = 0; }
  },

  onAttackRelease(world, player) {
    const st = player.state;
    if (!st.charging) return;
    st.charging = false;
    player.state.movementOverride = null;
    const frac = clamp(st.chargeTime / 3, 0, 1);
    const dmg = METEOR_MAX_DMG * frac;
    const onImpact = (m) => {
      for (const e of enemiesInRadius(world, m.x, m.y, m.radius)) damageEnemy(world, e, m.dmgPercent, player);
      Particles.ring(m.x, m.y, m.radius, '#ff7a3d', 0.4);
      Audio2.boom2();
    };
    if (st.quadNext) {
      st.quadNext = false;
      const offsets = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
      for (const o of offsets) {
        world.meteors.push(makeMeteorMarker({
          x: player.x + o.x * 90, y: player.y + o.y * 90, radius: 55, fallDelay: 1, dmgPercent: METEOR_MAX_DMG * 0.6,
          onImpact,
        }));
      }
    } else {
      world.meteors.push(makeMeteorMarker({
        x: player.aim.x, y: player.aim.y, radius: 60, fallDelay: 1, dmgPercent: dmg,
        onImpact,
      }));
    }
    Audio2.whoosh();
    st.zoneDmgArmed = false;
  },

  ability1(world, player) {
    player.state.quadNext = true;
    Particles.text(player.x, player.y - 28, 'x4', '#ff7a3d');
    Audio2.charge(0.2);
    player.cooldowns.a1 = 9;
  },

  ability2(world, player) {
    playerSetInvincible(player, 0.5);
    Particles.ring(player.x, player.y, 24, '#ffe08a', 0.5);
    Audio2.shield();
    player.cooldowns.a2 = 6;
  },

  ability3(world, player) {
    player.state.zoneDmgArmed = true;
    Audio2.ability();
    player.cooldowns.a3 = 10;
  },

  draw(ctx, player) {
    const bob = idleBob(1);
    drawGroundShadow(ctx, 14, 15);
    ctx.save();
    ctx.translate(0, bob);
    ctx.fillStyle = radialBodyGradient(ctx, 15, '#c8ac93', '#8a6a55', '#3a271a');
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 6, 15, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,150,80,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-7, 3); ctx.lineTo(-2, 8); ctx.moveTo(4, 2); ctx.lineTo(9, 9); ctx.stroke();
    ctx.fillStyle = '#1a0f08';
    ctx.beginPath(); ctx.arc(-5, 4, 2, 0, Math.PI * 2); ctx.arc(5, 4, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb14d';
    ctx.beginPath(); ctx.arc(-5.5, 3.4, 0.7, 0, Math.PI * 2); ctx.arc(4.5, 3.4, 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const st = player.state;
    const r = st.charging ? 6 + 6 * (st.chargeTime / 3) : 6;
    const mg = ctx.createRadialGradient(0, -14, 0, 0, -14, r);
    mg.addColorStop(0, '#fff3c8'); mg.addColorStop(0.5, '#ff9d3d'); mg.addColorStop(1, '#c73d00');
    ctx.fillStyle = mg;
    ctx.shadowColor = '#ff7a3d'; ctx.shadowBlur = st.charging ? 18 : 6;
    ctx.beginPath(); ctx.arc(0, -14 + bob, r, 0, Math.PI * 2); ctx.fill();
  },
};

// ============================================================
// PERSONNAGE 7 — LE RETARDÉ
// ============================================================
CHARACTERS[7] = {
  id: 7, name: 'Echo', epithet: 'Le Retarde', speedPercent: 115, color: '#c77aff', autoAttack: true,
  attackLabel: 'Frappe retardee automatique (position d\'il y a 3s)', attackCd: 0.5,
  a1Label: 'Frappe retardee (10s)', a1Cd: 7,
  a2Label: 'Acceleration (maintenir)', a2Cd: 0,
  a3Label: 'Marque + soin a la mort', a3Cd: 12,

  init(player) { player.state = { simBonus: 0, healZones: [] }; },

  update(world, player, dt, realDt) {
    const st = player.state;
    world.simSpeedBonus = st.simBonus;
    if (st.markedTarget && st.markedTarget.dead && !st.markedHandled) {
      st.markedHandled = true;
      world.zones.push(makeZone({
        x: st.markedTarget.x, y: st.markedTarget.y, radius: 40, duration: 0.6, tickInterval: 999,
        color: 'rgba(127,255,156,0.3)', edgeColor: '#7fff9c', team: TEAM.PLAYER,
        onExpire: null,
      }));
      st.healZonePos = { x: st.markedTarget.x, y: st.markedTarget.y, t: 0.6 };
    }
    if (st.healZonePos) {
      st.healZonePos.t -= dt;
      if (dist(player.x, player.y, st.healZonePos.x, st.healZonePos.y) < 40) {
        playerHeal(player, 15);
        Audio2.heal();
        st.healZonePos = null;
      } else if (st.healZonePos.t <= 0) st.healZonePos = null;
    }
  },

  // Doit etre maintenue pour activer la vitesse superieure : ce n'est pas automatique.
  ability2Held(world, player, dt, held, realDt) {
    const st = player.state;
    const rdt = realDt != null ? realDt : dt;
    if (held) {
      st.simBonus = Math.min(0.5, st.simBonus + 0.2 * rdt);
    } else {
      st.simBonus = Math.max(0, st.simBonus - 0.6 * rdt);
    }
  },

  onAttackPress(world, player) {
    if (player.attackCooldown > 0) return;
    const p = playerSampleHistory(player, 3);
    for (const e of enemiesInRadius(world, p.x, p.y, 90)) damageEnemy(world, e, 30, player);
    Particles.ring(p.x, p.y, 90, '#c77aff', 0.3);
    Particles.burst(p.x, p.y, 18, '#c77aff', { maxSpeed: 160 });
    Audio2.teleport();
    player.attackCooldown = 0.5;
  },

  ability1(world, player) {
    const p = playerSampleHistory(player, 10);
    for (const e of enemiesInRadius(world, p.x, p.y, 110)) damageEnemy(world, e, 45, player);
    Particles.ring(p.x, p.y, 110, '#e0c8ff', 0.35);
    Particles.burst(p.x, p.y, 22, '#c77aff', { maxSpeed: 200 });
    Audio2.boom2();
    player.cooldowns.a1 = 7;
  },

  ability3(world, player) {
    const t = nearestEnemy(world, player.x, player.y, 500);
    if (!t) return;
    player.state.markedTarget = t;
    player.state.markedHandled = false;
    t._markedByPlayer = true;
    Particles.lightning(player.x, player.y, t.x, t.y, '#7fff9c');
    Audio2.lockOn();
    player.cooldowns.a3 = 12;
  },

  draw(ctx, player) {
    drawGroundShadow(ctx, 12, 14);
    for (let i = 1; i <= 3; i++) {
      const p = playerSampleHistory(player, i * 0.15);
      ctx.save();
      ctx.globalAlpha = 0.16 / i;
      ctx.fillStyle = '#c77aff';
      ctx.beginPath(); ctx.arc(p.x - player.x, p.y - player.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#e0c8ff';
    ctx.lineWidth = 1;
    const t = performance.now() / 700;
    ctx.beginPath(); ctx.arc(0, 0, 18 + Math.sin(t) * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    glowOutline(ctx, 'rgba(199,122,255,0.5)', 9);
    ctx.fillStyle = radialBodyGradient(ctx, 14, '#e6d2ff', '#8a5dc7', '#3a1a6b');
    ctx.strokeStyle = '#20123a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#160531';
    ctx.beginPath(); ctx.arc(-5, -2, 2.3, 0, Math.PI * 2); ctx.arc(5, -2, 2.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-5.6, -2.6, 0.8, 0, Math.PI * 2); ctx.arc(4.4, -2.6, 0.8, 0, Math.PI * 2); ctx.fill();
  },
};

// ============================================================
// PERSONNAGE 8 — LE GRAVITATEUR
// ============================================================
const VEX_DMG = 1.3 * 0.6; // +30% puis -40% de degats
CHARACTERS[8] = {
  id: 8, name: 'Vex', epithet: 'Le Gravitateur', speedPercent: 120, color: '#7a7aff',
  attackLabel: 'Attraction gravitationnelle (automatique)',
  a1Label: 'Mine', a1Cd: 7,
  a2Label: 'Repulsion', a2Cd: 8,
  a3Label: 'Pulsation centrale (auto 15s)', a3Cd: 0,

  init(player) { player.state = { tick: 0, autoTimer: 0 }; },

  update(world, player, dt) {
    const st = player.state;
    const RADIUS = 260;
    st.tick += dt;
    const doTick = st.tick >= 0.4;
    if (doTick) st.tick = 0;
    for (const e of world.enemies) {
      if (e.dead) continue;
      if (e.spawnX == null) { e.spawnX = e.x; e.spawnY = e.y; }
      const d = dist(e.x, e.y, player.x, player.y);
      if (d < RADIUS && d > 4) {
        const dir = normalize(player.x - e.x, player.y - e.y);
        const pull = 90 * (1 - d / RADIUS);
        e.x += dir.x * pull * dt; e.y += dir.y * pull * dt;
        if (doTick) {
          const disp = dist(e.x, e.y, e.spawnX, e.spawnY);
          if (disp > 4) damageEnemy(world, e, clamp(disp * 0.08, 1, 18) * VEX_DMG, player);
        }
      }
    }
    // Pulsation centrale (competence 3) : seulement si cette competence est disponible
    // (partie 3 d'expedition, ou hors expedition quand toutes les competences sont actives).
    const pulseAllowed = !world.abilityGate || world.abilityGate === 3;
    if (pulseAllowed) st.autoTimer += dt; else st.autoTimer = 0;
    if (st.autoTimer >= 15) {
      st.autoTimer = 0;
      for (const e of enemiesInRadius(world, player.x, player.y, 150)) damageEnemy(world, e, 40 * VEX_DMG, player);
      Particles.ring(player.x, player.y, 150, '#7a7aff', 0.5);
      Particles.burst(player.x, player.y, 30, '#7a7aff', { maxSpeed: 260 });
      Audio2.gravity();
      if (world.room) {
        const b = world.room.bounds;
        player.x = b.x + b.w / 2; player.y = b.y + b.h / 2;
      }
    }
  },

  ability1(world, player) {
    world.mines.push(makeMine({ x: player.aim.x, y: player.aim.y, triggerRadius: 24, dmgPercent: 10 * VEX_DMG }));
    Particles.burst(player.aim.x, player.aim.y, 8, '#7a7aff', { maxSpeed: 80, life: 0.3 });
    Audio2.spark();
    player.cooldowns.a1 = 7;
  },

  ability2(world, player) {
    for (const e of enemiesInRadius(world, player.x, player.y, 140)) {
      const dir = normalize(e.x - player.x, e.y - player.y);
      const prevX = e.x, prevY = e.y;
      e.x += dir.x * 70; e.y += dir.y * 70;
      let hitObstacle = false;
      if (world.room) {
        const b = world.room.bounds;
        if (e.x - (e.radius || 16) < b.x || e.x + (e.radius || 16) > b.x + b.w || e.y - (e.radius || 16) < b.y || e.y + (e.radius || 16) > b.y + b.h) hitObstacle = true;
        e.x = clamp(e.x, b.x + (e.radius || 16), b.x + b.w - (e.radius || 16));
        e.y = clamp(e.y, b.y + (e.radius || 16), b.y + b.h - (e.radius || 16));
        for (const ob of world.room.obstacles) if (circleRect(e.x, e.y, e.radius || 16, ob.x, ob.y, ob.w, ob.h)) hitObstacle = true;
      }
      if (hitObstacle) damageEnemy(world, e, 35 * VEX_DMG, player);
    }
    Particles.ring(player.x, player.y, 140, '#7a7aff', 0.3);
    Particles.burst(player.x, player.y, 26, '#7a7aff', { maxSpeed: 220 });
    Audio2.whoosh();
    player.cooldowns.a2 = 8;
  },

  draw(ctx) {
    drawGroundShadow(ctx, 12, 13);
    const t = performance.now() / 1000;
    ctx.save();
    ctx.strokeStyle = '#7a7aff';
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const a = t * (i % 2 ? -1.4 : 1.4) + (i * Math.PI * 2) / 3;
      const r = 20;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#b8b8ff';
      ctx.shadowColor = '#7a7aff'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r * 0.55, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    glowOutline(ctx, 'rgba(122,122,255,0.6)', 12);
    ctx.fillStyle = radialBodyGradient(ctx, 13, '#c8c8ff', '#4a4ad0', '#161650');
    ctx.strokeStyle = '#12123a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0a2a';
    ctx.beginPath(); ctx.arc(-4, -1, 3, 0, Math.PI * 2); ctx.arc(4, -1, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8e8ff';
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.beginPath(); ctx.arc(-4, -1, 1.1, 0, Math.PI * 2); ctx.arc(4, -1, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  },
};

// ============================================================
// PERSONNAGE 9 — LE PRÉDATEUR
// ============================================================
const PREDATOR_AURA_RADIUS = 250;
CHARACTERS[9] = {
  id: 9, name: 'Croc', epithet: 'Le Predateur', speedPercent: 135, color: '#ff5d5d',
  attackLabel: 'Vague de flamme toutes les 1,2s reelles (non activable, degats proportionnels a la proximite)',
  a1Label: 'Bouclier (1s d\'invincibilite)', a1Cd: 8,
  a2Label: 'Petit dash', a2Cd: 2.5,
  a3Label: 'Arret global', a3Cd: 25,

  init(player) { player.state = { tick: 0, waveFx: 0, waveActive: false }; },

  update(world, player, dt, realDt) {
    const st = player.state;
    // Cadence en VRAI temps ecoule : ne doit jamais etre affectee par l'acceleration globale du jeu.
    st.tick += realDt;
    if (st.tick >= 1.2) {
      st.tick = 0;
      for (const e of enemiesInRadius(world, player.x, player.y, PREDATOR_AURA_RADIUS)) {
        const d = dist(player.x, player.y, e.x, e.y);
        damageEnemy(world, e, 30 * (1 - d / PREDATOR_AURA_RADIUS), player);
      }
      const emberCount = 26;
      for (let i = 0; i < emberCount; i++) {
        const a = (i / emberCount) * Math.PI * 2 + randRange(-0.06, 0.06);
        const r = PREDATOR_AURA_RADIUS * randRange(0.85, 1);
        Particles.spawn(player.x + Math.cos(a) * r, player.y + Math.sin(a) * r, {
          vx: Math.cos(a) * randRange(10, 30), vy: Math.sin(a) * randRange(10, 30) - 30,
          life: randRange(0.4, 0.7), r: randRange(2, 4.5),
          color: choice(['#ff3d1a', '#ff9d3d', '#ffd23d']), gravity: -20,
        });
      }
      st.waveFx = 0;
      st.waveActive = true;
      Audio2.fire(1.2);
    }
    if (st.waveActive) {
      st.waveFx += dt;
      if (st.waveFx >= 0.5) st.waveActive = false;
    }
  },

  // Le bouclier n'est plus automatique : il faut l'activer soi-meme (touche a1).
  ability1(world, player) {
    playerSetInvincible(player, 1);
    Particles.burst(player.x, player.y, 20, '#ffe08a', { maxSpeed: 200 });
    Audio2.shield();
    player.cooldowns.a1 = 8;
  },

  ability2(world, player) {
    const mv = Input.moveVector();
    const dir = (mv.x || mv.y) ? mv : vecFromAngle(player.facing);
    let nx = player.x + dir.x * 120, ny = player.y + dir.y * 120;
    if (world.room) {
      const b = world.room.bounds;
      nx = clamp(nx, b.x + player.radius, b.x + b.w - player.radius);
      ny = clamp(ny, b.y + player.radius, b.y + b.h - player.radius);
    }
    player.x = nx; player.y = ny;
    Particles.burst(player.x, player.y, 10, '#ff5d5d', { maxSpeed: 140 });
    Audio2.ability();
    player.cooldowns.a2 = 2.5;
  },

  ability3(world, player) {
    for (const e of world.enemies) if (!e.dead) e.frozen = 1;
    Particles.ring(player.x, player.y, 260, '#ffffff', 0.45);
    Particles.burst(player.x, player.y, 30, '#ffffff', { maxSpeed: 240 });
    Audio2.freeze();
    player.cooldowns.a3 = 25;
  },

  draw(ctx, player) {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 500);
    ctx.save();
    const auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, PREDATOR_AURA_RADIUS);
    auraGrad.addColorStop(0, `rgba(255,61,61,${0.16 + 0.05 * pulse})`);
    auraGrad.addColorStop(0.55, 'rgba(255,61,61,0.05)');
    auraGrad.addColorStop(1, 'rgba(255,61,61,0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath(); ctx.arc(0, 0, PREDATOR_AURA_RADIUS, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,93,93,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.arc(0, 0, PREDATOR_AURA_RADIUS, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    if (player.state.waveActive) {
      const wt = clamp(player.state.waveFx / 0.5, 0, 1);
      const radius = PREDATOR_AURA_RADIUS * wt;
      const spikes = 32;
      const time = performance.now() / 60;
      ctx.save();
      ctx.globalAlpha = 0.75 * (1 - wt);
      ctx.shadowColor = '#ff3d1a'; ctx.shadowBlur = 18;
      // bande de flamme : deux traces jointives (crete + base) avec un bord irregulier/vacillant
      ctx.beginPath();
      for (let i = 0; i <= spikes; i++) {
        const a = (i / spikes) * Math.PI * 2;
        const jag = Math.sin(a * 7 + time) * 10 + Math.sin(a * 13 - time * 1.7) * 5;
        const r = radius + jag;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      const grad = ctx.createRadialGradient(0, 0, Math.max(0, radius - 22), 0, 0, radius + 12);
      grad.addColorStop(0, 'rgba(255,61,26,0)');
      grad.addColorStop(0.55, 'rgba(255,122,61,0.55)');
      grad.addColorStop(0.85, 'rgba(255,210,61,0.65)');
      grad.addColorStop(1, 'rgba(255,210,61,0)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#ffd23d';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    drawGroundShadow(ctx, 8, 14);
    // Le corps (tete/yeux) suit toujours precisement le curseur de la souris.
    const faceAngle = Math.atan2(player.aim.y - player.y, player.aim.x - player.x);
    ctx.save();
    ctx.rotate(faceAngle);
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ff8a8a';
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(-24, -6); ctx.lineTo(-20, 0); ctx.lineTo(-24, 6); ctx.closePath();
    ctx.fill();
    ctx.restore();
    glowOutline(ctx, 'rgba(255,93,93,0.55)', 9);
    ctx.fillStyle = radialBodyGradient(ctx, 16, '#ffb0b0', '#c73d3d', '#5c0f0f');
    ctx.strokeStyle = '#3a0c0c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(-10, -11); ctx.lineTo(-4, 0); ctx.lineTo(-10, 11); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    // Yeux (lueur ambree, pupilles noires) pres de la pointe/museau
    ctx.fillStyle = '#ffe08a';
    ctx.shadowColor = '#ffe08a'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(7, -4.5, 1.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, 4.5, 1.9, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2a0808';
    ctx.beginPath(); ctx.arc(7, -4.5, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, 4.5, 0.9, 0, Math.PI * 2); ctx.fill();
    // Gueule entrouverte au bout du museau
    ctx.strokeStyle = '#2a0808';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(15, -2.2); ctx.lineTo(10.5, 0); ctx.lineTo(15, 2.2); ctx.stroke();
    ctx.restore();
  },
};

// ============================================================
// PERSONNAGE 10 — LES DEUX ORBES
// ============================================================
const GEMINI_THIRD_ORB_RADIUS = 155;
const GEMINI_THIRD_ORB_SPIN = 2.2; // rad/s (avant 5.5)
CHARACTERS[10] = {
  id: 10, name: 'Gemini', epithet: 'Les Deux Orbes', speedPercent: 100, color: '#ffd23d',
  attackLabel: 'Frappe des deux orbes (charges)',
  a1Label: 'Melange les orbes', a1Cd: 5,
  a2Label: 'Troisieme orbe (bloque tout, 6s)', a2Cd: 12,
  a3Label: 'Gel des deux plus proches', a3Cd: 16,

  init(player) {
    player.state = {
      phase1: 0, phase2: Math.PI, radius: 100, charge1: true, charge2: true, regen1: 0, regen2: 0,
      thirdOrbAngle: 0, thirdOrbShield: null,
    };
  },

  update(world, player, dt) {
    const st = player.state;
    const speed = 1.4;
    st.phase1 += speed * dt; st.phase2 += speed * dt;
    st.orb1 = squarePoint(player.x, player.y, st.radius, st.phase1);
    st.orb2 = squarePoint(player.x, player.y, st.radius, st.phase2);
    if (!st.charge1) { st.regen1 += dt; if (st.regen1 >= 1.5) { st.charge1 = true; st.regen1 = 0; } }
    if (!st.charge2) { st.regen2 += dt; if (st.regen2 >= 1.5) { st.charge2 = true; st.regen2 = 0; } }
    if (st.thirdOrbShield) {
      if (!world.shields.includes(st.thirdOrbShield)) {
        st.thirdOrbShield = null;
      } else {
        st.thirdOrbAngle += GEMINI_THIRD_ORB_SPIN * dt;
      }
    }
  },

  onAttackPress(world, player) {
    const st = player.state;
    if (!st.charge1 || !st.charge2) return;
    st.charge1 = false; st.charge2 = false; st.regen1 = 0; st.regen2 = 0;
    for (const e of enemiesInRadius(world, st.orb1.x, st.orb1.y, 48)) damageEnemy(world, e, 20, player); // zone +20%
    for (const e of enemiesInRadius(world, st.orb2.x, st.orb2.y, 48)) damageEnemy(world, e, 20, player); // zone +20%
    for (const o of [st.orb1, st.orb2]) {
      Particles.burst(o.x, o.y, 14, '#fff3c8', { maxSpeed: 200, life: 0.3 });
      for (let i = 0; i < 3; i++) {
        const a = randRange(0, Math.PI * 2), len = randRange(18, 34);
        Particles.lightning(o.x, o.y, o.x + Math.cos(a) * len, o.y + Math.sin(a) * len, '#ffe98a');
      }
    }
    Audio2.zap();
  },

  ability1(world, player) {
    const st = player.state;
    st.phase1 = randRange(0, Math.PI * 2);
    st.phase2 = randRange(0, Math.PI * 2);
    Audio2.spark();
    player.cooldowns.a1 = 5;
  },

  ability2(world, player) {
    const st = player.state;
    // Tourne 2x plus longtemps (6s), plus lentement, et sur une orbite qui englobe celle des
    // deux autres orbes (le carre de demi-cote 100 a ses coins a ~141).
    const shield = makeShield({ x: player.x, y: player.y, radius: GEMINI_THIRD_ORB_RADIUS, duration: 6, color: '#8ff0ff', follow: player });
    world.shields.push(shield);
    st.thirdOrbShield = shield;
    st.thirdOrbAngle = 0;
    Particles.burst(player.x, player.y, 22, '#8ff0ff', { maxSpeed: 220, life: 0.4 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      Particles.lightning(player.x, player.y, player.x + Math.cos(a) * GEMINI_THIRD_ORB_RADIUS, player.y + Math.sin(a) * GEMINI_THIRD_ORB_RADIUS, '#c8faff');
    }
    Audio2.shield();
    player.cooldowns.a2 = 12;
  },

  ability3(world, player) {
    const enemies = world.enemies.filter((e) => !e.dead).sort((a, b) => dist2(player.x, player.y, a.x, a.y) - dist2(player.x, player.y, b.x, b.y));
    for (let i = 0; i < Math.min(2, enemies.length); i++) {
      enemies[i].frozenUntilTouched = true;
      Particles.ring(enemies[i].x, enemies[i].y, 26, '#8ff0ff', 0.3);
    }
    Audio2.freeze();
    player.cooldowns.a3 = 16;
  },

  draw(ctx, player) {
    const bob = idleBob(1.5);
    drawGroundShadow(ctx, 11, 12);
    ctx.save();
    ctx.translate(0, bob);
    glowOutline(ctx, 'rgba(255,210,61,0.5)', 9);
    ctx.fillStyle = radialBodyGradient(ctx, 12, '#fff0b0', '#c79a1e', '#5c3e00');
    ctx.strokeStyle = '#3a2c00';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2a1c00';
    ctx.beginPath(); ctx.arc(-4, -1, 1.8, 0, Math.PI * 2); ctx.arc(4, -1, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const st = player.state;
    if (st.orb1) {
      for (const o of [st.orb1, st.orb2]) {
        ctx.save();
        ctx.translate(o.x - player.x, o.y - player.y);
        const og = ctx.createRadialGradient(-3, -3, 0, 0, 0, 10);
        og.addColorStop(0, 'rgba(255,251,224,0.75)'); og.addColorStop(0.6, 'rgba(255,210,61,0.45)'); og.addColorStop(1, 'rgba(168,110,0,0.15)');
        ctx.fillStyle = og;
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = 'rgba(92,62,0,0.5)'; ctx.lineWidth = 1;
        ctx.shadowColor = '#ffd23d'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
    if (st.thirdOrbShield) {
      const shieldRadius = st.thirdOrbShield.radius;
      ctx.save();
      ctx.strokeStyle = 'rgba(143,240,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      const ox = Math.cos(st.thirdOrbAngle) * shieldRadius, oy = Math.sin(st.thirdOrbAngle) * shieldRadius;
      const og = ctx.createRadialGradient(0, 0, 0, 0, 0, 9);
      og.addColorStop(0, '#ffffff'); og.addColorStop(0.5, '#8ff0ff'); og.addColorStop(1, 'rgba(143,240,255,0.2)');
      ctx.translate(ox, oy);
      ctx.fillStyle = og;
      ctx.shadowColor = '#8ff0ff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  },
};
function squarePoint(cx, cy, r, phase) {
  const t = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * 4;
  const side = Math.floor(t);
  const f = t - side;
  const corners = [[-r, -r], [r, -r], [r, r], [-r, r]];
  const a = corners[side], b = corners[(side + 1) % 4];
  return { x: cx + lerp(a[0], b[0], f), y: cy + lerp(a[1], b[1], f) };
}

// ============================================================
// PERSONNAGE 11 — LE VENT
// ============================================================
CHARACTERS[11] = {
  id: 11, name: 'Zephyr', epithet: 'Le Vent', speedPercent: 80, color: '#bfe8ff',
  attackLabel: 'Pose un bloc de vent chaud', attackCd: 0.4,
  a1Label: 'Vent vertical (anti-projectiles)', a1Cd: 10,
  a2Label: 'Vent puissant (3x)', a2Cd: 11,
  a3Label: 'Inversion des vents', a3Cd: 6,

  init(player) { player.state = {}; },
  update() {},

  onAttackPress(world, player) {
    if (player.attackCooldown > 0) return;
    const dir = normalize(player.aim.x - player.x, player.aim.y - player.y);
    const mine = world.winds.filter((w) => w.owner === player);
    if (mine.length >= 3) {
      const oldest = mine.sort((a, b) => b.age - a.age)[0];
      world.winds.splice(world.winds.indexOf(oldest), 1);
    }
    world.winds.push(makeWind({
      x: player.x + dir.x * 90, y: player.y + dir.y * 90, w: 140, h: 140,
      dirX: dir.x, dirY: dir.y, duration: 8, force: 55, owner: player,
    }));
    Audio2.gust();
    player.attackCooldown = 0.4;
  },

  ability1(world, player) {
    const dir = normalize(player.aim.x - player.x, player.aim.y - player.y);
    world.winds.push(makeWind({
      x: player.x + dir.x * 90, y: player.y + dir.y * 90, w: 120, h: 160,
      dirX: dir.x, dirY: dir.y, duration: 5, force: 40, vertical: true, owner: player, color: '#eaf7ff',
    }));
    Audio2.whoosh();
    player.cooldowns.a1 = 10;
  },

  ability2(world, player) {
    const dir = normalize(player.aim.x - player.x, player.aim.y - player.y);
    world.winds.push(makeWind({
      x: player.x + dir.x * 100, y: player.y + dir.y * 100, w: 150, h: 150,
      dirX: dir.x, dirY: dir.y, duration: 8, force: 55, strong: true, owner: player, color: '#7ac7ff',
    }));
    Audio2.gust();
    player.cooldowns.a2 = 11;
  },

  ability3(world, player) {
    for (const w of world.winds) if (w.owner === player) { w.dirX *= -1; w.dirY *= -1; Particles.ring(w.x, w.y, Math.max(w.w, w.h) / 2, '#bfe8ff', 0.3); }
    Audio2.zap();
    player.cooldowns.a3 = 6;
  },

  draw(ctx) {
    drawGroundShadow(ctx, 11, 13);
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#bfe8ff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const r = 9 + i * 6;
      ctx.beginPath();
      ctx.arc(0, 0, r, performance.now() / 300 + i, performance.now() / 300 + i + 3.6);
      ctx.stroke();
    }
    ctx.restore();
    glowOutline(ctx, 'rgba(191,232,255,0.6)', 12);
    const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 12);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#d8f4ff'); g.addColorStop(1, 'rgba(191,232,255,0.55)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(120,190,230,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#1a3a4a';
    ctx.beginPath(); ctx.arc(-3.6, -0.5, 1.6, 0, Math.PI * 2); ctx.arc(3.6, -0.5, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-4.1, -1.1, 0.6, 0, Math.PI * 2); ctx.arc(3.1, -1.1, 0.6, 0, Math.PI * 2); ctx.fill();
  },
};

function getCharacter(id) { return CHARACTERS[id]; }
// Persos "normaux" (expedition, defis, salle de test) ; les persos de parcours sont a part.
function allCharacterIds() { return Object.keys(CHARACTERS).map(Number).filter((id) => !CHARACTERS[id].parkourOnly).sort((a, b) => a - b); }
function parkourCharacterIds() { return Object.keys(CHARACTERS).map(Number).filter((id) => CHARACTERS[id].parkourOnly).sort((a, b) => a - b); }
