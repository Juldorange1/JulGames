// Etat et mise a jour du joueur : deplacement, multiplicateur de degats, historique de position

function createPlayer(character, x, y) {
  return {
    x, y, radius: PLAYER_RADIUS, vx: 0, vy: 0,
    character,
    damageMultiplier: 1.0,
    invincible: false, invincibleTimer: 0,
    speedMult: 1,
    controlInvertH: false, controlInvertV: false,
    onIce: false,
    history: [{ t: 0, x, y }],
    totalTime: 0,
    cooldowns: { a1: 0, a2: 0, a3: 0 },
    attackCooldown: 0,
    facing: 0,
    aim: { x, y },
    state: {}, // etat propre a chaque personnage (initialise par character.init)
    healFx: 0,
  };
}

const PLAYER_DAMAGE_TAKEN_MULT = 0.6 * 0.5; // resistance globale -40%, PUIS tous les ennemis infligent 2x moins de degats

function playerApplyDamage(player, percent) {
  if (player.invincible || percent <= 0) return;
  const applied = percent * PLAYER_DAMAGE_TAKEN_MULT;
  player.damageMultiplier = clamp(player.damageMultiplier - applied / 100, DMG_MIN, DMG_MAX);
  Particles.text(player.x, player.y - 24, `-${Math.round(applied)}%`, '#ff5d5d');
  Particles.burst(player.x, player.y, 10, '#ff5d5d', { maxSpeed: 140 });
  Audio2.hurt();
  if (Game.shakeCamera) Game.shakeCamera(4, 0.15);
}

function playerHeal(player, percent) {
  if (percent <= 0) return;
  player.damageMultiplier = clamp(player.damageMultiplier + percent / 100, DMG_MIN, DMG_MAX);
  Particles.text(player.x, player.y - 24, `+${Math.round(percent)}%`, '#7fff9c');
  player.healFx = 0.4;
}

// Poussee instantanee (boss de melee, souffle...) : deplace le joueur puis le recale dans la salle.
function pushPlayer(world, player, dx, dy) {
  if (!player) return;
  player.x += dx; player.y += dy;
  if (world.room) {
    const b = world.room.bounds;
    player.x = clamp(player.x, b.x + player.radius, b.x + b.w - player.radius);
    player.y = clamp(player.y, b.y + player.radius, b.y + b.h - player.radius);
  }
  Particles.burst(player.x, player.y, 10, '#ffffff', { maxSpeed: 120, life: 0.25 });
}

function playerSetInvincible(player, duration) {
  player.invincible = true;
  player.invincibleTimer = Math.max(player.invincibleTimer, duration);
}

function playerSampleHistory(player, secondsAgo) {
  const target = player.totalTime - secondsAgo;
  const h = player.history;
  if (h.length === 0) return { x: player.x, y: player.y };
  if (target <= h[0].t) return { x: h[0].x, y: h[0].y };
  for (let i = 1; i < h.length; i++) {
    if (h[i].t >= target) {
      const a = h[i - 1], b = h[i];
      const span = b.t - a.t || 1;
      const t = (target - a.t) / span;
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    }
  }
  return { x: player.x, y: player.y };
}

function updatePlayer(world, player, dt, realDt) {
  player.totalTime += realDt;

  if (player.invincibleTimer > 0) {
    player.invincibleTimer -= realDt;
    if (player.invincibleTimer <= 0) { player.invincibleTimer = 0; player.invincible = false; }
  }
  if (player.healFx > 0) player.healFx -= realDt;

  // Terrain sous le joueur (partie 1)
  player.speedMult = 1;
  player.controlInvertH = false;
  player.controlInvertV = false;
  player.onIce = false;
  let inDamageZone = null;
  if (world.room && world.room.terrainZones) {
    for (const tz of world.room.terrainZones) {
      if (zoneContainsPoint(tz, player.x, player.y)) {
        applyTerrainEffect(tz.terrainType, player, world, dt);
        if (tz.terrainType === 'damage') inDamageZone = tz;
      }
    }
  }
  for (const z of world.zones) {
    if (z.terrainType && TERRAIN_TYPES.includes(z.terrainType) && z.telegraphAge >= z.telegraph && zoneContainsPoint(z, player.x, player.y)) {
      applyTerrainEffect(z.terrainType, player, world, dt);
      if (z.terrainType === 'damage') inDamageZone = z;
    }
  }
  if (inDamageZone) {
    player._dmgZoneTimer = (player._dmgZoneTimer || 0) + dt;
    if (player._dmgZoneTimer >= 0.5) { player._dmgZoneTimer = 0; playerApplyDamage(player, 4); }
  } else player._dmgZoneTimer = 0;

  // Deplacement
  let mv = Input.moveVector();
  if (player.controlInvertH) mv = { x: -mv.x, y: mv.y };
  if (player.controlInvertV) mv = { x: mv.x, y: -mv.y };

  const dashOverride = player.state.movementOverride;
  let speed = BASE_SPEED * (player.character.speedPercent / 100) * player.speedMult;
  let vx = mv.x * speed, vy = mv.y * speed;
  if (dashOverride) { vx = dashOverride.vx; vy = dashOverride.vy; }

  player.vx = vx; player.vy = vy;
  let nx = player.x + vx * dt;
  let ny = player.y + vy * dt;

  if (world.room) {
    const b = world.room.bounds;
    nx = clamp(nx, b.x + player.radius, b.x + b.w - player.radius);
    ny = clamp(ny, b.y + player.radius, b.y + b.h - player.radius);
    // Repousse hors de l'obstacle le long du vecteur point-le-plus-proche -> joueur (meme methode
    // robuste que resolveEnemyObstacles) : une approche parfaitement rectiligne (axe X ou Y pur,
    // frequente dans une salle en grille comme le hub) ne doit jamais traverser l'obstacle.
    for (const ob of world.room.obstacles) {
      if (!circleRect(nx, ny, player.radius, ob.x, ob.y, ob.w, ob.h)) continue;
      const cx = clamp(nx, ob.x, ob.x + ob.w);
      const cy = clamp(ny, ob.y, ob.y + ob.h);
      const dx = nx - cx, dy = ny - cy;
      const d = Math.hypot(dx, dy);
      if (d > 0.001) {
        const push = player.radius - d;
        nx += (dx / d) * push;
        ny += (dy / d) * push;
      } else {
        const left = nx - ob.x, right = (ob.x + ob.w) - nx;
        const top = ny - ob.y, bottom = (ob.y + ob.h) - ny;
        const min = Math.min(left, right, top, bottom);
        if (min === left) nx = ob.x - player.radius;
        else if (min === right) nx = ob.x + ob.w + player.radius;
        else if (min === top) ny = ob.y - player.radius;
        else ny = ob.y + ob.h + player.radius;
      }
    }
    for (const w of world.walls) {
      if (circleRect(nx, ny, player.radius, w.x - w.w / 2, w.y - w.h / 2, w.w, w.h)) {
        nx = player.x; ny = player.y;
      }
    }
  }
  player.x = nx; player.y = ny;

  // Visee (la souris est en pixels ecran, la camera/le monde en unites pre-zoom)
  const zoom = world.zoom || 1;
  player.aim.x = Input.mouse.x / zoom + world.camera.x;
  player.aim.y = Input.mouse.y / zoom + world.camera.y;
  if (dist2(player.aim.x, player.aim.y, player.x, player.y) > 4) {
    player.facing = angleTo(player.x, player.y, player.aim.x, player.aim.y);
  }

  // Historique de position (12s glissantes)
  const h = player.history;
  h.push({ t: player.totalTime, x: player.x, y: player.y });
  while (h.length > 2 && player.totalTime - h[0].t > 12) h.shift();

  // Cooldowns (non affectes par l'echelle de simulation, bases sur dt reel)
  if (player.cooldowns.a1 > 0) player.cooldowns.a1 = Math.max(0, player.cooldowns.a1 - realDt);
  if (player.cooldowns.a2 > 0) player.cooldowns.a2 = Math.max(0, player.cooldowns.a2 - realDt);
  if (player.cooldowns.a3 > 0) player.cooldowns.a3 = Math.max(0, player.cooldowns.a3 - realDt);
  if (player.attackCooldown > 0) player.attackCooldown = Math.max(0, player.attackCooldown - realDt);

  if (player.character.update) player.character.update(world, player, dt, realDt);

  // Entrees d'attaque / competences.
  // Maintenir le clic equivaut a cliquer en continu : les attaques a declenchement "press"
  // sont retentees chaque frame tant que le bouton est enfonce (chaque personnage se limite
  // deja lui-meme via son propre cooldown/ressource interne).
  // L'attaque est rebindable (clavier ou bouton de souris) ; maintenir equivaut a cliquer en continu.
  const wantAttackDown = Input.isDown(Keybinds.attack);
  const wantAttackReleased = Input.wasReleased(Keybinds.attack);
  if (player.character.onAttackHeld) player.character.onAttackHeld(world, player, dt, wantAttackDown);
  if (wantAttackDown && player.character.onAttackPress) player.character.onAttackPress(world, player);
  if (wantAttackReleased && player.character.onAttackRelease) player.character.onAttackRelease(world, player);

  // Verrouillage de competence par partie d'expedition : une seule touche unifiee active
  // celle qui est disponible (peu importe son numero). Hors expedition (salle de test, defis),
  // chaque competence garde sa propre touche (Shift/Espace/E).
  const gate = world.abilityGate;
  const a1Allowed = !gate || gate === 1;
  const a2Allowed = !gate || gate === 2;
  const a3Allowed = !gate || gate === 3;

  const abilityPressed = (slot) => {
    if (gate) return slot === gate && Input.wasPressed(Keybinds.ability);
    if (slot === 1) return Input.ability1Pressed();
    if (slot === 2) return Input.wasPressed(Keybinds.ability2);
    return Input.wasPressed(Keybinds.ability3);
  };
  const abilityDown = (slot) => {
    if (gate) return slot === gate && Input.isDown(Keybinds.ability);
    if (slot === 1) return Input.ability1Down();
    if (slot === 2) return Input.isDown(Keybinds.ability2);
    return Input.isDown(Keybinds.ability3);
  };

  if (a1Allowed && abilityPressed(1) && player.cooldowns.a1 <= 0 && player.character.ability1) {
    player.character.ability1(world, player);
  }
  if (player.character.ability1Held) player.character.ability1Held(world, player, dt, a1Allowed && abilityDown(1), realDt);

  if (a2Allowed && abilityPressed(2) && player.cooldowns.a2 <= 0 && player.character.ability2) {
    player.character.ability2(world, player);
  }
  if (player.character.ability2Held) player.character.ability2Held(world, player, dt, a2Allowed && abilityDown(2), realDt);

  if (a3Allowed && abilityPressed(3) && player.cooldowns.a3 <= 0 && player.character.ability3) {
    player.character.ability3(world, player);
  }
  if (player.character.ability3Held) player.character.ability3Held(world, player, dt, a3Allowed && abilityDown(3));
}

function applyTerrainEffect(type, player, world, dt) {
  switch (type) {
    case 'ice': player.speedMult *= 1.35; player.onIce = true; break;
    case 'mud': player.speedMult *= 0.55; break;
    case 'accel': player.speedMult *= 1.5; break;
    case 'slow': player.speedMult *= 0.5; break;
    case 'invertH': player.controlInvertH = true; break;
    case 'invertV': player.controlInvertV = true; break;
    case 'wind': player.x += 26 * dt; break;
    default: break;
  }
}

function drawPlayer(ctx, camera, world, player) {
  const sx = player.x - camera.x, sy = player.y - camera.y;
  ctx.save();
  if (player.invincible) {
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(performance.now() / 60);
    ctx.strokeStyle = '#ffe08a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx, sy, player.radius + 8, 0, Math.PI * 2); ctx.stroke();
  }
  if (player.healFx > 0) {
    ctx.strokeStyle = '#7fff9c';
    ctx.globalAlpha = player.healFx / 0.4;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx, sy, player.radius + 10, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.translate(sx, sy);
  if (player.character.draw) {
    player.character.draw(ctx, player, world);
  } else {
    ctx.fillStyle = COLORS.player;
    ctx.strokeStyle = COLORS.playerOutline;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, player.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();

  drawCursor(ctx, world, player);
}

// Viseur personnalisable (couleur + style, reglables dans Parametres).
function drawCursor(ctx, world, player) {
  const camera = world.camera;
  const zoom = world.zoom || 1;
  const mx = player.aim.x - camera.x, my = player.aim.y - camera.y;
  const r = 8 / zoom, r2 = 10 / zoom;
  const color = (Save.data && Save.data.cursorColor) || '#ffffff';
  const style = (Save.data && Save.data.cursorStyle) || 'cross';
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 1.5 / zoom;
  if (style === 'dot') {
    ctx.beginPath(); ctx.arc(mx, my, 3 / zoom, 0, Math.PI * 2); ctx.fill();
  } else if (style === 'circle') {
    ctx.beginPath(); ctx.arc(mx, my, r2, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(mx - r, my); ctx.lineTo(mx + r, my); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx, my - r); ctx.lineTo(mx, my + r); ctx.stroke();
    ctx.beginPath(); ctx.arc(mx, my, r2, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
