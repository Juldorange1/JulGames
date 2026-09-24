// Personnages exclusifs aux defis de parcours (ids 12 a 15). Deux competences chacun :
// la 1re sur la touche d'ATTAQUE, la 2e sur la touche de COMPETENCE UNIQUE (world.abilityGate = 1).
// Ils n'apparaissent pas dans la liste des personnages normaux (parkourOnly).

// Point libre le plus proche (jamais dans un mur ni hors de la salle) pour les teleportations.
function parkourSafeSpot(world, x, y, r) {
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

function parkourBlink(world, player, x, y, color) {
  const p = parkourSafeSpot(world, x, y, player.radius + 1);
  if (!p) return false;
  Particles.lightning(player.x, player.y, p.x, p.y, color);
  Particles.burst(player.x, player.y, 10, color, { maxSpeed: 140 });
  player.x = p.x; player.y = p.y;
  Particles.ring(p.x, p.y, 22, color, 0.25);
  Audio2.teleport();
  return true;
}

function drawParkourBody(ctx, r, light, mid, dark, eyeColor) {
  drawGroundShadow(ctx, r * 0.8, r);
  ctx.save();
  ctx.translate(0, idleBob(1.5));
  glowOutline(ctx, mid, 9);
  ctx.fillStyle = radialBodyGradient(ctx, r, light, mid, dark);
  ctx.strokeStyle = dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = eyeColor || '#10131a';
  ctx.beginPath(); ctx.arc(-4.5, -1.5, 2, 0, Math.PI * 2); ctx.arc(4.5, -1.5, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ============================================================
// 12 — ORBIS : deux orbes tournent en permanence ; se teleporte sur l'une ou l'autre apres une
// courte incantation (immobile), avec un vrai temps de recharge.
// ============================================================
const ORBIS_RADIUS = 80, ORBIS_SPIN = 1.7, ORBIS_CD = 2.6, ORBIS_CAST = 0.45; // nerf : portee, recharge, incantation
CHARACTERS[12] = {
  id: 12, parkourOnly: true, name: 'Orbis', epithet: 'Le Satellite', speedPercent: 100, color: '#8ff0ff',
  attackLabel: 'Teleportation sur l\'orbe 1', attackCd: ORBIS_CD,
  a1Label: 'Teleportation sur l\'orbe 2', a1Cd: ORBIS_CD,
  init(player) { player.state = { ang: 0, cast: null }; },
  update(world, player, dt) {
    const st = player.state;
    st.ang += ORBIS_SPIN * dt;
    st.o1 = { x: player.x + Math.cos(st.ang) * ORBIS_RADIUS, y: player.y + Math.sin(st.ang) * ORBIS_RADIUS };
    st.o2 = { x: player.x - Math.cos(st.ang) * ORBIS_RADIUS, y: player.y - Math.sin(st.ang) * ORBIS_RADIUS };
    if (st.cast) {
      st.cast.t -= dt;
      if (st.cast.t <= 0) {
        const o = st.cast.which === 1 ? st.o1 : st.o2;
        parkourBlink(world, player, o.x, o.y, st.cast.which === 1 ? '#8ff0ff' : '#ff8ad8');
        st.cast = null;
        st.movementOverride = null;
      }
    }
  },
  startCast(player, which) {
    player.state.cast = { which, t: ORBIS_CAST };
    player.state.movementOverride = { vx: 0, vy: 0 }; // immobile pendant l'incantation
    Audio2.charge(0.2);
  },
  onAttackPress(world, player) {
    if (player.attackCooldown > 0 || player.state.cast) return;
    this.startCast(player, 1);
    player.attackCooldown = ORBIS_CD;
  },
  ability1(world, player) {
    if (player.state.cast) return;
    this.startCast(player, 2);
    player.cooldowns.a1 = ORBIS_CD;
  },
  draw(ctx, player) {
    const st = player.state;
    ctx.save();
    ctx.strokeStyle = 'rgba(143,240,255,0.18)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(0, 0, ORBIS_RADIUS, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    drawParkourBody(ctx, 12, '#e8fcff', '#5ad0e8', '#0c3a48');
    const ang = st.ang || 0;
    const orbs = [[Math.cos(ang) * ORBIS_RADIUS, Math.sin(ang) * ORBIS_RADIUS, '#8ff0ff', 1], [-Math.cos(ang) * ORBIS_RADIUS, -Math.sin(ang) * ORBIS_RADIUS, '#ff8ad8', 2]];
    for (const [ox, oy, col, n] of orbs) {
      ctx.save();
      ctx.translate(ox, oy);
      if (st.cast && st.cast.which === n) {
        const f = 1 - st.cast.t / ORBIS_CAST;
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 22 - 12 * f, 0, Math.PI * 2); ctx.stroke();
      }
      const g = ctx.createRadialGradient(-2, -2, 0, 0, 0, 10);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.shadowColor = col; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#0a1a22'; ctx.font = 'bold 9px Segoe UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(n), 0, 0.5);
      ctx.restore();
    }
  },
};

// ============================================================
// 13 — TRAIT : charge un dash immobile (plus c'est long, plus c'est rapide et loin) vers le
// curseur ; invincibilite 0,5 s.
// ============================================================
const TRAIT_MAX_CHARGE = 1.0, TRAIT_CD = 0.6, TRAIT_INV_CD = 4;
// Buff : charge plus rapide, dash plus long et rapide, et invulnerable aux pieges pendant le dash.
function traitDash(f) { return { speed: 450 + 900 * f, dur: 0.12 + 0.3 * f }; }
CHARACTERS[13] = {
  id: 13, parkourOnly: true, name: 'Trait', epithet: 'La Fleche', speedPercent: 100, color: '#ff9d3d',
  attackLabel: 'Dash charge (maintenir, immobile)', attackCd: TRAIT_CD,
  a1Label: 'Invincibilite (0,5 s)', a1Cd: TRAIT_INV_CD,
  init(player) { player.state = { charge: 0, charging: false, dashTimer: 0 }; },
  update(world, player, dt) {
    const st = player.state;
    if (st.dashTimer > 0) {
      st.dashTimer -= dt;
      if (Math.random() < 0.7) Particles.burst(player.x, player.y, 1, '#ffb14d', { maxSpeed: 40, life: 0.3 });
      if (st.dashTimer <= 0) player.state.movementOverride = null;
    }
  },
  onAttackHeld(world, player, dt, down) {
    const st = player.state;
    if (down && st.dashTimer <= 0 && player.attackCooldown <= 0) {
      st.charging = true;
      st.charge = Math.min(TRAIT_MAX_CHARGE, st.charge + dt);
      st.movementOverride = { vx: 0, vy: 0 }; // immobile pendant la charge
    } else if (!down && st.charging) {
      const f = st.charge / TRAIT_MAX_CHARGE;
      const d = normalize(player.aim.x - player.x, player.aim.y - player.y);
      const dir = (d.x || d.y) ? d : vecFromAngle(player.facing);
      const { speed, dur } = traitDash(f);
      st.movementOverride = { vx: dir.x * speed, vy: dir.y * speed };
      st.dashTimer = dur;
      playerSetInvincible(player, dur + 0.05);
      st.charging = false; st.charge = 0;
      player.attackCooldown = TRAIT_CD;
      Particles.burst(player.x, player.y, 12 + Math.round(f * 12), '#ff9d3d', { maxSpeed: 180 });
      Audio2.whoosh();
    }
  },
  ability1(world, player) {
    playerSetInvincible(player, 0.5);
    Particles.ring(player.x, player.y, 26, '#ffe08a', 0.3);
    Audio2.shield();
    player.cooldowns.a1 = TRAIT_INV_CD;
  },
  draw(ctx, player) {
    const st = player.state;
    if (st.charging) {
      const f = st.charge / TRAIT_MAX_CHARGE;
      const { speed, dur } = traitDash(f);
      const len = speed * dur * PARKOUR_MOVE_BONUS * (player.parkourSpeed || 1);
      const a = Math.atan2(player.aim.y - player.y, player.aim.x - player.x);
      ctx.save();
      ctx.rotate(a);
      ctx.strokeStyle = `rgba(255,157,61,${0.35 + 0.4 * f})`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(len, 0); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = '#ff9d3d';
      ctx.beginPath(); ctx.moveTo(len + 8, 0); ctx.lineTo(len - 4, -6); ctx.lineTo(len - 4, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 3; ctx.shadowColor = '#ff9d3d'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, 0, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
      ctx.restore();
    }
    drawParkourBody(ctx, 12, '#fff0d8', '#ff9d3d', '#5a2a00');
    ctx.save();
    ctx.rotate(Math.atan2(player.aim.y - player.y, player.aim.x - player.x));
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath(); ctx.moveTo(19, 0); ctx.lineTo(12, -5); ctx.lineTo(12, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  },
};

// ============================================================
// 14 — JANUS : pose 2 teleporteurs relies et proches (lui au curseur) ; blocs de vent qui ne
// poussent que lui.
// ============================================================
// Nerf : portee plus courte, recharges longues, teleporteurs ephemeres, un seul bloc de vent plus faible.
const JANUS_PORTAL_RANGE = 120, JANUS_WIND_FORCE = 120, JANUS_PORTAL_CD = 3.5, JANUS_WIND_CD = 5, JANUS_WIND_LIFE = 4, JANUS_PORTAL_LIFE = 6;
CHARACTERS[14] = {
  id: 14, parkourOnly: true, name: 'Janus', epithet: 'Les Deux Portes', speedPercent: 100, color: '#b47cff',
  attackLabel: 'Paire de teleporteurs (6 s)', attackCd: JANUS_PORTAL_CD,
  a1Label: 'Bloc de vent (ne pousse que lui)', a1Cd: JANUS_WIND_CD,
  init(player) { player.state = { portals: null, winds: [] }; },
  update(world, player, dt) {
    const st = player.state;
    if (st.portals) {
      st.portalAge = (st.portalAge || 0) + dt;
      if (st.portalAge > JANUS_PORTAL_LIFE) st.portals = null;
    }
    if (st.portals) {
      for (let i = 0; i < 2; i++) {
        const p = st.portals[i], other = st.portals[1 - i];
        const d = Math.hypot(p.x - player.x, p.y - player.y);
        if (d > 28) p.armed = true;
        if (p.armed && d < 18) {
          Particles.burst(player.x, player.y, 12, '#b47cff', { maxSpeed: 140 });
          player.x = other.x; player.y = other.y;
          other.armed = false; p.armed = false;
          Particles.ring(other.x, other.y, 24, '#b47cff', 0.25);
          Audio2.teleport();
          break;
        }
      }
    }
    for (const w of st.winds) {
      w.age += dt;
      if (Math.abs(player.x - w.x) < w.size / 2 && Math.abs(player.y - w.y) < w.size / 2) {
        player.x += w.dx * JANUS_WIND_FORCE * dt;
        player.y += w.dy * JANUS_WIND_FORCE * dt;
      }
    }
    st.winds = st.winds.filter((w) => w.age < JANUS_WIND_LIFE);
  },
  onAttackPress(world, player) {
    if (player.attackCooldown > 0) return;
    const d = normalize(player.aim.x - player.x, player.aim.y - player.y);
    const dist = Math.min(JANUS_PORTAL_RANGE, Math.hypot(player.aim.x - player.x, player.aim.y - player.y));
    const target = parkourSafeSpot(world, player.x + d.x * dist, player.y + d.y * dist, player.radius + 1);
    if (!target) return;
    player.state.portals = [
      { x: player.x, y: player.y, armed: false },
      { x: target.x, y: target.y, armed: true },
    ];
    player.state.portalAge = 0;
    Particles.ring(player.x, player.y, 20, '#b47cff', 0.25);
    Particles.ring(target.x, target.y, 20, '#b47cff', 0.25);
    Audio2.spark();
    player.attackCooldown = JANUS_PORTAL_CD;
  },
  ability1(world, player) {
    const st = player.state;
    const d = normalize(player.aim.x - player.x, player.aim.y - player.y);
    const dir = (d.x || d.y) ? d : vecFromAngle(player.facing);
    if (st.winds.length >= 1) st.winds.shift();
    st.winds.push({ x: player.x + dir.x * 40, y: player.y + dir.y * 40, size: 130, dx: dir.x, dy: dir.y, age: 0 });
    Audio2.gust();
    player.cooldowns.a1 = JANUS_WIND_CD;
  },
  draw(ctx, player) {
    const st = player.state;
    const t = performance.now() / 1000;
    for (const w of st.winds) {
      ctx.save();
      ctx.translate(w.x - player.x, w.y - player.y);
      ctx.globalAlpha = w.age > JANUS_WIND_LIFE - 1 ? JANUS_WIND_LIFE - w.age : 1;
      ctx.fillStyle = 'rgba(191,232,255,0.1)'; ctx.strokeStyle = 'rgba(191,232,255,0.45)'; ctx.lineWidth = 1.5;
      ctx.fillRect(-w.size / 2, -w.size / 2, w.size, w.size); ctx.strokeRect(-w.size / 2, -w.size / 2, w.size, w.size);
      ctx.rotate(Math.atan2(w.dy, w.dx));
      ctx.strokeStyle = 'rgba(230,248,255,0.55)'; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const ly = -w.size / 2 + 12 + i * (w.size - 24) / 5;
        const lx = ((t * 90 + i * 37) % w.size) - w.size / 2;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(Math.min(lx + 18, w.size / 2), ly); ctx.stroke();
      }
      ctx.restore();
    }
    if (st.portals) {
      for (const p of st.portals) drawTeleporterPad(ctx, p.x - player.x, p.y - player.y, t, true);
      ctx.save();
      ctx.strokeStyle = 'rgba(180,124,255,0.25)'; ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.moveTo(st.portals[0].x - player.x, st.portals[0].y - player.y); ctx.lineTo(st.portals[1].x - player.x, st.portals[1].y - player.y); ctx.stroke();
      ctx.restore();
    }
    drawParkourBody(ctx, 12, '#f0e0ff', '#b47cff', '#2a1050');
  },
};

// ============================================================
// 15 — ELAN : maintenir l'attaque (en marchant) puis relacher = bond VERS LE HAUT de la carte,
// d'autant plus haut que la touche a ete maintenue ; maintenir la competence rend tout le sol
// glissant mais plus rapide (duree limitee, puis recharge).
// ============================================================
const ELAN_MAX_HOLD = 2.0, ELAN_MIN_DIST = 60, ELAN_MAX_DIST = 260, ELAN_CD = 1.8;
const ELAN_SLIDE_MAX = 2.5, ELAN_SLIDE_CD = 3, ELAN_SLIDE_CD_EARLY = 1.5;
const PARKOUR_SLIDE_SPEED = 1.35; // +35% de vitesse, inertie identique a la glace
function elanDist(hold) { return ELAN_MIN_DIST + (ELAN_MAX_DIST - ELAN_MIN_DIST) * clamp(hold / ELAN_MAX_HOLD, 0, 1); }
CHARACTERS[15] = {
  id: 15, parkourOnly: true, name: 'Elan', epithet: 'Le Bond', speedPercent: 100, color: '#5dff9d',
  attackLabel: 'Bond vers le haut (maintenir puis relacher)', attackCd: ELAN_CD,
  a1Label: 'Sol glissant et rapide (maintenir, 2,5 s max)', a1Cd: ELAN_SLIDE_CD,
  init(player) { player.state = { hold: 0, holding: false, sliding: false, slideTime: 0 }; },
  update() {},
  onAttackHeld(world, player, dt, down) {
    const st = player.state;
    if (down && player.attackCooldown <= 0) {
      st.holding = true;
      st.hold = Math.min(ELAN_MAX_HOLD, st.hold + dt);
    } else if (!down && st.holding) {
      parkourBlink(world, player, player.x, player.y - elanDist(st.hold), '#5dff9d');
      st.holding = false; st.hold = 0;
      player.attackCooldown = ELAN_CD;
    }
  },
  ability1Held(world, player, dt, held) {
    const st = player.state;
    if (held && player.cooldowns.a1 <= 0) {
      st.sliding = true;
      st.slideTime += dt;
      if (st.slideTime >= ELAN_SLIDE_MAX) { st.sliding = false; st.slideTime = 0; player.cooldowns.a1 = ELAN_SLIDE_CD; }
    } else {
      if (st.sliding) player.cooldowns.a1 = ELAN_SLIDE_CD_EARLY;
      st.sliding = false; st.slideTime = 0;
    }
  },
  draw(ctx, player) {
    const st = player.state;
    if (st.holding) {
      const dist = elanDist(st.hold);
      ctx.save();
      ctx.strokeStyle = 'rgba(93,255,157,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, -dist); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#5dff9d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -dist, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = '#b8ffd0'; ctx.lineWidth = 3; ctx.shadowColor = '#5dff9d'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, 0, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * st.hold / ELAN_MAX_HOLD); ctx.stroke();
      ctx.restore();
    }
    if (st.sliding) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = 'rgba(190,240,255,0.35)';
      ctx.beginPath(); ctx.ellipse(0, 6, 22, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(190,240,255,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - st.slideTime / ELAN_SLIDE_MAX)); ctx.stroke();
      ctx.restore();
    }
    drawParkourBody(ctx, 12, '#e0ffe8', '#5dff9d', '#0c4020');
  },
};
