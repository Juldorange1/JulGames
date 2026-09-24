// Scenes animees des fiches (liste des personnages, repertoire) : chaque personnage montre son
// attaque en boucle (Colt : pistolet qui tourne et tire, Ferro : couteaux qui rebondissent a
// l'infini dans le cadre...), chaque ennemi montre son comportement et ses tirs.
// Tout est local a la scene (pas de World, pas de sons, pas de particules globales).

const SHOWCASE_W = 240;
const SHOWCASE_H = 150;

// ---------- Mini-effets locaux ----------
function scFx() { return { bullets: [], sparks: [], rings: [], bolts: [] }; }

function scBullet(fx, o) {
  fx.bullets.push(Object.assign({ r: 3, life: 1.2, age: 0, color: '#ff3d5a', shape: 'circle', bounces: 0 }, o));
}
function scBurst(fx, x, y, n, color, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = (speed || 60) * (0.4 + Math.random() * 0.8);
    fx.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, age: 0, life: 0.25 + Math.random() * 0.3, color, r: 1 + Math.random() * 1.6 });
  }
}
function scRing(fx, x, y, r0, r1, dur, color, width) {
  fx.rings.push({ x, y, r0, r1, age: 0, life: dur, color, width: width || 2 });
}
function scBolt(fx, x1, y1, x2, y2, color, dur) {
  const pts = [{ x: x1, y: y1 }];
  const n = 6;
  for (let i = 1; i < n; i++) {
    const f = i / n;
    pts.push({ x: x1 + (x2 - x1) * f + (Math.random() - 0.5) * 8, y: y1 + (y2 - y1) * f + (Math.random() - 0.5) * 8 });
  }
  pts.push({ x: x2, y: y2 });
  fx.bolts.push({ pts, age: 0, life: dur || 0.18, color });
}

// bounds : { hw, hh } demi-dimensions de la scene ; les balles "bounce" rebondissent sur ses bords.
function scUpdateFx(fx, dt, bounds) {
  for (let i = fx.bullets.length - 1; i >= 0; i--) {
    const b = fx.bullets[i];
    if (b.homing && b.target) {
      const tx = b.target.x - b.x, ty = b.target.y - b.y;
      const d = Math.hypot(tx, ty) || 1;
      const sp = Math.hypot(b.vx, b.vy);
      b.vx = lerp(b.vx, tx / d * sp, clamp(b.homing * dt, 0, 1));
      b.vy = lerp(b.vy, ty / d * sp, clamp(b.homing * dt, 0, 1));
    }
    b.x += b.vx * dt; b.y += b.vy * dt; b.age += dt;
    if (b.bounce && bounds) {
      const m = b.r + 3;
      let hit = false;
      if (b.x < -bounds.hw + m) { b.x = -bounds.hw + m; b.vx = Math.abs(b.vx); hit = true; }
      if (b.x > bounds.hw - m) { b.x = bounds.hw - m; b.vx = -Math.abs(b.vx); hit = true; }
      if (b.y < -bounds.hh + m) { b.y = -bounds.hh + m; b.vy = Math.abs(b.vy); hit = true; }
      if (b.y > bounds.hh - m) { b.y = bounds.hh - m; b.vy = -Math.abs(b.vy); hit = true; }
      if (hit) {
        b.bounces++;
        scBurst(fx, b.x, b.y, 5, b.color, 50);
        if (b.maxBounces != null && b.bounces > b.maxBounces) b.age = b.life;
      }
    }
    if (b.age >= b.life) fx.bullets.splice(i, 1);
  }
  for (let i = fx.sparks.length - 1; i >= 0; i--) {
    const s = fx.sparks[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.92; s.vy *= 0.92; s.age += dt;
    if (s.age >= s.life) fx.sparks.splice(i, 1);
  }
  for (let i = fx.rings.length - 1; i >= 0; i--) { fx.rings[i].age += dt; if (fx.rings[i].age >= fx.rings[i].life) fx.rings.splice(i, 1); }
  for (let i = fx.bolts.length - 1; i >= 0; i--) { fx.bolts[i].age += dt; if (fx.bolts[i].age >= fx.bolts[i].life) fx.bolts.splice(i, 1); }
}

function scDrawFx(ctx, fx) {
  for (const r of fx.rings) {
    const f = r.age / r.life;
    ctx.save();
    ctx.globalAlpha = 1 - f;
    ctx.strokeStyle = r.color; ctx.lineWidth = r.width;
    ctx.shadowColor = r.color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0.5, lerp(r.r0, r.r1, f)), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  for (const b of fx.bullets) {
    ctx.save();
    ctx.globalAlpha = b.life === Infinity ? 1 : clamp((b.life - b.age) / 0.2, 0, 1);
    ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 6;
    if (b.shape === 'knife') {
      ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.beginPath(); ctx.moveTo(b.r * 1.5, 0); ctx.lineTo(-b.r, b.r * 0.55); ctx.lineTo(-b.r * 0.6, 0); ctx.lineTo(-b.r, -b.r * 0.55); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  for (const bo of fx.bolts) {
    ctx.save();
    ctx.globalAlpha = 1 - bo.age / bo.life;
    ctx.strokeStyle = bo.color; ctx.lineWidth = 2; ctx.shadowColor = bo.color; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(bo.pts[0].x, bo.pts[0].y);
    for (const p of bo.pts) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
  }
  for (const s of fx.sparks) {
    ctx.save();
    ctx.globalAlpha = 1 - s.age / s.life;
    ctx.fillStyle = s.color;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// Cible d'entrainement qui clignote quand elle est touchee.
function scDummy(x, y) { return { x, y, flash: 0, ox: x, oy: y }; }
function scHit(d) { d.flash = 0.18; }
function scDrawDummy(ctx, d, dt) {
  if (d.flash > 0) d.flash -= dt;
  ctx.save();
  ctx.translate(d.x + (d.flash > 0 ? (Math.random() - 0.5) * 2 : 0), d.y);
  ctx.scale(0.8, 0.8);
  drawGroundShadow(ctx, 8, 12);
  bodyDummy(ctx, {}, '#5a5a66');
  if (d.flash > 0) {
    ctx.globalAlpha = clamp(d.flash / 0.18, 0, 1) * 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function scDrawTurretBody(ctx, t, x, y, scale) {
  const color = TURRET_COLOR[t.type] || '#ff5d5d';
  ctx.save();
  ctx.translate(x, y);
  if (scale) ctx.scale(scale, scale);
  drawGroundShadow(ctx, 8, 12);
  ctx.shadowColor = color; ctx.shadowBlur = t.charging ? 14 : 4;
  if (t.charging) ctx.globalAlpha = 0.65 + 0.35 * Math.sin(performance.now() / 55);
  try { (TURRET_BODY[t.type] || bodyT1)(ctx, t, color); } catch (e) { /* apercu indisponible */ }
  ctx.restore();
}

// Petit "joueur" cible des ennemis dans le repertoire.
function scDrawPlayerMarker(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = radialBodyGradient(ctx, 7, '#e8fbff', '#7fd8ff', '#1a4a60');
  ctx.strokeStyle = '#0c2430'; ctx.lineWidth = 1.2;
  ctx.shadowColor = '#7fd8ff'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ---------- Scenes des personnages ----------
function scDrawCharacter(ctx, c, fake, x, y, alpha) {
  fake.x = x; fake.y = y;
  ctx.save();
  ctx.translate(x, y);
  if (alpha != null) ctx.globalAlpha = alpha;
  try { c.draw(ctx, fake, null); } catch (e) { /* apercu indisponible */ }
  ctx.restore();
}

const CHARACTER_SHOWCASE = {
  // Colt : le pistolet tourne autour de lui et tire en continu vers l'exterieur.
  1: {
    init(s) { s.ang = 0; s.fire = 0; s.swap = 0; },
    update(s, dt, c, fake) {
      const st = fake.state;
      s.ang += 1.6 * dt;
      st.gunAngle = s.ang;
      st.gunX = Math.cos(s.ang) * 46; st.gunY = Math.sin(s.ang) * 46;
      fake.x = 0; fake.y = 0;
      s.fire += dt;
      if (s.fire >= 0.42) {
        s.fire = 0;
        const d = { x: Math.cos(s.ang), y: Math.sin(s.ang) };
        scBullet(s.fx, { x: st.gunX + d.x * 14, y: st.gunY + d.y * 14, vx: d.x * 170, vy: d.y * 170, life: 0.8, color: '#7fd8ff', r: 3 });
        scBurst(s.fx, st.gunX + d.x * 14, st.gunY + d.y * 14, 4, '#d8f4ff', 50);
      }
      s.swap += dt;
      if (s.swap >= 2.6) { s.swap = 0; scBolt(s.fx, 0, 0, st.gunX, st.gunY, '#ffe98a', 0.25); scBurst(s.fx, 0, 0, 8, '#ffd23d', 70); }
    },
    draw(ctx, s, c, fake) { scDrawCharacter(ctx, c, fake, 0, 0); scDrawFx(ctx, s.fx); },
  },

  // Nyx : pose un trampoline, saute dessus et retombe en projetant 4 projectiles en croix.
  2: {
    init(s) { s.t = 0; s.dummies = [scDummy(45, -45), scDummy(95, 15)]; },
    update(s, dt, c, fake) {
      s.t += dt;
      const st = fake.state;
      if (s.t < 0.2) { s.x = -75; s.y = 15; st.tramps = []; }
      else if (s.t < 0.35) { if (!st.tramps.length) { st.tramps = [{ x: -20, y: 15, lx: 45, ly: 15, bounce: 0 }]; scRing(s.fx, -20, 15, 4, 20, 0.3, '#c77aff', 2); } }
      else if (s.t < 0.9) { s.x = lerp(-75, -20, (s.t - 0.35) / 0.55); }
      else if (s.t < 1.45) { const f = (s.t - 0.9) / 0.55; s.x = lerp(-20, 45, f); s.air = 1 + 0.6 * Math.sin(Math.PI * f); st.tramps[0].bounce = s.t < 1.1 ? 0.3 : 0; }
      else if (s.air) {
        s.air = 0; s.x = 45;
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) scBullet(s.fx, { x: 45 + dx * 10, y: 15 + dy * 10, vx: dx * 170, vy: dy * 170, life: 0.5, color: '#e0b3ff', r: 3.5 });
        scRing(s.fx, 45, 15, 6, 26, 0.3, '#c77aff', 2);
        scHit(s.dummies[0]); scHit(s.dummies[1]);
      }
      if (s.t > 2.3) s.t = 0;
    },
    draw(ctx, s, c, fake, dt) {
      for (const d of s.dummies) scDrawDummy(ctx, d, dt);
      const k = s.air || 1;
      fake.state.jump = s.air ? {} : null;
      fake.airScale = k;
      ctx.save(); ctx.translate(s.x, s.y); ctx.scale(k, k);
      fake.x = s.x; fake.y = s.y;
      try { c.draw(ctx, fake, null); } catch (e) { /* apercu indisponible */ }
      ctx.restore();
      scDrawFx(ctx, s.fx);
    },
  },

  // Kip : le boomerang part, frappe la cible et revient.
  3: {
    init(s) { s.t = 0; s.hit = false; s.dummy = scDummy(74, 0); },
    update(s, dt, c, fake) {
      s.t = (s.t + dt) % 1.5;
      const a = (s.t / 1.5) * Math.PI * 2;
      fake.state.boom = { x: -40 + (1 - Math.cos(a)) / 2 * 112, y: Math.sin(a) * 26 };
      if (s.t > 0.7 && !s.hit) { s.hit = true; scHit(s.dummy); scBurst(s.fx, 70, 0, 10, '#5dff9d', 80); }
      if (s.t < 0.1) s.hit = false;
    },
    draw(ctx, s, c, fake, dt) { scDrawDummy(ctx, s.dummy, dt); scDrawCharacter(ctx, c, fake, -40, 0); scDrawFx(ctx, s.fx); },
  },

  // Braise : les quatre orbes de feu tournent, s'ecartent et brulent la cible au contact.
  4: {
    init(s) { s.t = 0; s.cd = 0; s.dummy = scDummy(58, 0); },
    update(s, dt, c, fake) {
      s.t += dt; s.cd -= dt;
      const dist = 34 + 22 * (0.5 + 0.5 * Math.sin(s.t * 0.9));
      const orbs = [];
      for (let i = 0; i < 4; i++) {
        const a = s.t * 1.3 + i * Math.PI / 2;
        orbs.push({ x: Math.cos(a) * dist, y: Math.sin(a) * dist });
      }
      fake.state.orbs = orbs;
      for (const o of orbs) {
        if (s.cd <= 0 && Math.hypot(o.x - s.dummy.x, o.y - s.dummy.y) < 16) {
          s.cd = 0.25; scHit(s.dummy); scBurst(s.fx, o.x, o.y, 10, '#ff9d3d', 90);
        }
      }
    },
    draw(ctx, s, c, fake, dt) { scDrawDummy(ctx, s.dummy, dt); scDrawCharacter(ctx, c, fake, 0, 0); scDrawFx(ctx, s.fx); },
  },

  // Ferro : deux couteaux qui rebondissent a l'infini dans le cadre.
  5: {
    init(s) {
      for (const a of [0.45, 2.55]) {
        scBullet(s.fx, { x: Math.cos(a) * 20, y: Math.sin(a) * 20, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: Infinity, bounce: true, shape: 'knife', color: '#7fd8ff', r: 6 });
      }
      s.trail = [];
    },
    update(s) {
      for (const b of s.fx.bullets) s.trail.push({ x: b.x, y: b.y, a: 0.5 });
      for (const tr of s.trail) tr.a -= 0.03;
      s.trail = s.trail.filter((tr) => tr.a > 0);
    },
    draw(ctx, s, c, fake) {
      const b = s.bounds;
      ctx.save();
      ctx.strokeStyle = 'rgba(127,216,255,0.35)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(-b.hw + 2, -b.hh + 2, b.hw * 2 - 4, b.hh * 2 - 4);
      for (const tr of s.trail) { ctx.globalAlpha = tr.a; ctx.fillStyle = '#7fd8ff'; ctx.beginPath(); ctx.arc(tr.x, tr.y, 1.8, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      scDrawCharacter(ctx, c, fake, 0, 0);
      scDrawFx(ctx, s.fx);
    },
  },

  // Cendre : charge sa meteorite puis la lache sur la cible.
  6: {
    init(s) { s.t = 0; s.dummy = scDummy(64, 4); s.meteor = null; },
    update(s, dt, c, fake) {
      s.t += dt;
      const st = fake.state;
      if (s.t < 1.6) { st.charging = true; st.chargeTime = (s.t / 1.6) * 3; if (Math.random() < 0.4) scBurst(s.fx, -40 + (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, 1, '#ff9d3d', 20); }
      else if (!s.meteor && s.t < 2) { st.charging = false; st.chargeTime = 0; s.meteor = { f: 0 }; }
      if (s.meteor) {
        s.meteor.f += dt / 0.35;
        if (s.meteor.f >= 1) {
          s.meteor = null;
          scHit(s.dummy);
          scRing(s.fx, s.dummy.x, s.dummy.y, 6, 44, 0.45, '#ff7a3d', 3);
          scBurst(s.fx, s.dummy.x, s.dummy.y, 22, '#ffb14d', 120);
        }
      }
      if (s.t >= 2.8) s.t = 0;
    },
    draw(ctx, s, c, fake, dt) {
      scDrawDummy(ctx, s.dummy, dt);
      scDrawCharacter(ctx, c, fake, -40, 0);
      if (s.meteor) {
        const f = s.meteor.f;
        const x = lerp(-40, s.dummy.x, f), y = lerp(-10, s.dummy.y, f) - Math.sin(f * Math.PI) * 30;
        ctx.save();
        const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, '#fff3c8'); g.addColorStop(0.5, '#ff9d3d'); g.addColorStop(1, 'rgba(255,61,26,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        scBurst(s.fx, x, y, 1, '#ff7a3d', 20);
      }
      scDrawFx(ctx, s.fx);
    },
  },

  // Echo : se deplace et frappe la position qu'il occupait un peu plus tot.
  7: {
    init(s) { s.t = 0; s.strike = 0; },
    pos(t) { return { x: Math.cos(t * 1.3) * 52, y: Math.sin(t * 2.6) * 22 }; },
    update(s, dt, c) {
      s.t += dt; s.strike += dt;
      if (s.strike >= 1.0) {
        s.strike = 0;
        const p = this.pos(s.t - 1.1);
        scRing(s.fx, p.x, p.y, 30, 4, 0.3, c.color || '#8ff0ff', 2.5);
        scRing(s.fx, p.x, p.y, 4, 24, 0.4, '#ffffff', 2);
        scBurst(s.fx, p.x, p.y, 14, c.color || '#8ff0ff', 90);
      }
    },
    draw(ctx, s, c, fake) {
      for (let k = 6; k >= 1; k--) {
        const p = this.pos(s.t - k * 0.18);
        ctx.save(); ctx.globalAlpha = 0.08 * (7 - k); ctx.fillStyle = c.color || '#8ff0ff';
        ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      const p = this.pos(s.t);
      scDrawCharacter(ctx, c, fake, p.x, p.y);
      scDrawFx(ctx, s.fx);
    },
  },

  // Vex : attire tout vers lui (debris en spirale, tourelle aspiree).
  8: {
    init(s) {
      s.debris = [];
      for (let i = 0; i < 16; i++) s.debris.push({ a: Math.random() * Math.PI * 2, r: 20 + Math.random() * 70 });
      s.ring = 0; s.tx = 80;
    },
    update(s, dt) {
      for (const d of s.debris) {
        d.a += dt * 90 / Math.max(d.r, 12);
        d.r -= 32 * dt;
        if (d.r < 12) { d.r = 80 + Math.random() * 20; d.a = Math.random() * Math.PI * 2; }
      }
      s.ring += dt;
      if (s.ring >= 0.8) { s.ring = 0; scRing(s.fx, 0, 0, 70, 12, 0.8, '#b47cff', 1.5); }
      s.tx -= 14 * dt;
      if (s.tx < 30) { scBurst(s.fx, s.tx, 0, 14, '#ff5d5d', 80); s.tx = 82; }
    },
    draw(ctx, s, c, fake) {
      ctx.save();
      for (const d of s.debris) {
        ctx.globalAlpha = clamp(d.r / 40, 0.2, 0.8);
        ctx.fillStyle = '#d8c0ff';
        ctx.beginPath(); ctx.arc(Math.cos(d.a) * d.r, Math.sin(d.a) * d.r * 0.7, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      scDrawFx(ctx, s.fx);
      scDrawTurretBody(ctx, { type: 'T1', aimAngle: Math.PI }, s.tx, 0, 0.9);
      scDrawCharacter(ctx, c, fake, 0, 0);
    },
  },

  // Croc : son aura relache une vague de flammes toutes les 1,2s sur les ennemis proches.
  9: {
    init(s) { s.t = 0; s.dummies = [scDummy(46, -18), scDummy(-44, 22)]; },
    update(s, dt, c, fake) {
      s.t += dt;
      const st = fake.state;
      if (s.t >= 1.2) {
        s.t = 0; st.waveActive = true; st.waveFx = 0;
        for (const d of s.dummies) { scHit(d); scBurst(s.fx, d.x, d.y, 10, '#ff9d3d', 70); }
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          s.fx.sparks.push({ x: Math.cos(a) * 66, y: Math.sin(a) * 66, vx: Math.cos(a) * 20, vy: Math.sin(a) * 20 - 20, age: 0, life: 0.5, color: choice(['#ff3d1a', '#ff9d3d', '#ffd23d']), r: 2 });
        }
      }
      if (st.waveActive) { st.waveFx += dt; if (st.waveFx >= 0.5) st.waveActive = false; }
    },
    draw(ctx, s, c, fake, dt) {
      for (const d of s.dummies) scDrawDummy(ctx, d, dt);
      // L'aura reelle (250 px) est dessinee reduite pour tenir dans le cadre, puis le corps a
      // taille normale par-dessus.
      fake.x = 0; fake.y = 0;
      ctx.save(); ctx.scale(0.27, 0.27);
      try { c.draw(ctx, fake, null); } catch (e) { /* apercu indisponible */ }
      ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.clip();
      const wave = fake.state.waveActive; fake.state.waveActive = false;
      try { c.draw(ctx, fake, null); } catch (e) { /* apercu indisponible */ }
      fake.state.waveActive = wave;
      ctx.restore();
      scDrawFx(ctx, s.fx);
    },
  },

  // Gemini : deux orbes sur un parcours carre qui frappent ensemble ; la troisieme orbe tourne
  // lentement autour des deux autres (bouclier).
  10: {
    init(s) { s.phase = 0; s.strike = 0; s.cycle = 0; },
    update(s, dt, c, fake) {
      const st = fake.state;
      s.phase += 1.4 * dt; s.strike += dt; s.cycle = (s.cycle + dt) % 7;
      st.orb1 = squarePoint(0, 0, 36, s.phase);
      st.orb2 = squarePoint(0, 0, 36, s.phase + Math.PI);
      if (s.strike >= 1.3) {
        s.strike = 0;
        for (const o of [st.orb1, st.orb2]) {
          scBurst(s.fx, o.x, o.y, 10, '#fff3c8', 80);
          scRing(s.fx, o.x, o.y, 4, 18, 0.3, '#ffe98a', 2);
          for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2; scBolt(s.fx, o.x, o.y, o.x + Math.cos(a) * 20, o.y + Math.sin(a) * 20, '#ffe98a', 0.2); }
        }
      }
      if (s.cycle < 4.5) { st.thirdOrbShield = { radius: 56 }; st.thirdOrbAngle = (st.thirdOrbAngle || 0) + GEMINI_THIRD_ORB_SPIN * dt; }
      else st.thirdOrbShield = null;
    },
    draw(ctx, s, c, fake) { scDrawCharacter(ctx, c, fake, 0, 0); scDrawFx(ctx, s.fx); },
  },

  // Zephyr : pose un bloc de vent chaud qui pousse la tourelle.
  11: {
    init(s) { s.t = 0; s.tx = 34; s.streaks = []; for (let i = 0; i < 9; i++) s.streaks.push({ x: Math.random() * 70, y: (Math.random() - 0.5) * 60, l: 8 + Math.random() * 10 }); },
    update(s, dt) {
      s.t += dt;
      if (s.t >= 3) { s.t = 0; s.tx = 34; scRing(s.fx, 55, 0, 10, 40, 0.3, '#bfe8ff', 2); }
      s.tx += 16 * dt;
      if (s.tx > 84) s.tx = 84;
      for (const st of s.streaks) { st.x += 70 * dt; if (st.x > 70) st.x -= 70; }
    },
    draw(ctx, s, c, fake) {
      const pop = clamp(s.t / 0.2, 0, 1);
      ctx.save();
      ctx.translate(55, 0); ctx.scale(pop, pop);
      ctx.fillStyle = 'rgba(255,190,120,0.14)'; ctx.strokeStyle = 'rgba(255,210,160,0.55)'; ctx.lineWidth = 1.5;
      ctx.fillRect(-35, -32, 70, 64); ctx.strokeRect(-35, -32, 70, 64);
      ctx.strokeStyle = 'rgba(255,230,200,0.6)'; ctx.lineCap = 'round';
      for (const st of s.streaks) { ctx.beginPath(); ctx.moveTo(st.x - 35, st.y); ctx.lineTo(Math.min(st.x - 35 + st.l, 35), st.y); ctx.stroke(); }
      ctx.restore();
      scDrawTurretBody(ctx, { type: 'T1', aimAngle: Math.PI }, s.tx, 0, 0.9);
      fake.aim = { x: 60, y: 0 };
      scDrawCharacter(ctx, c, fake, -45, 0);
      scDrawFx(ctx, s.fx);
    },
  },
};

// ---------- Persos de parcours (12 a 15) ----------
Object.assign(CHARACTER_SHOWCASE, {
  // Orbis : deux orbes en orbite ; teleportation alternee sur l'une puis l'autre.
  12: {
    init(s) { s.t = 0; s.which = 1; s.pos = { x: 0, y: 0 }; },
    update(s, dt, c, fake) {
      const st = fake.state;
      st.ang = (st.ang || 0) + ORBIS_SPIN * dt;
      s.t += dt;
      const k = 0.5;
      if (s.t > 1.2 && !st.cast) st.cast = { which: s.which, t: ORBIS_CAST };
      if (st.cast) {
        st.cast.t -= dt;
        if (st.cast.t <= 0) {
          const sign = st.cast.which === 1 ? 1 : -1;
          const to = { x: clamp(s.pos.x + sign * Math.cos(st.ang) * ORBIS_RADIUS * k, -70, 70), y: clamp(s.pos.y + sign * Math.sin(st.ang) * ORBIS_RADIUS * k, -30, 30) };
          scBolt(s.fx, s.pos.x, s.pos.y, to.x, to.y, sign > 0 ? '#8ff0ff' : '#ff8ad8', 0.25);
          scRing(s.fx, to.x, to.y, 4, 18, 0.3, sign > 0 ? '#8ff0ff' : '#ff8ad8', 2);
          s.pos = to; st.cast = null; s.t = 0; s.which = 3 - s.which;
        }
      }
    },
    draw(ctx, s, c, fake) {
      ctx.save(); ctx.translate(s.pos.x, s.pos.y); ctx.scale(0.5, 0.5);
      fake.x = s.pos.x; fake.y = s.pos.y;
      try { c.draw(ctx, fake, null); } catch (e) { /* apercu indisponible */ }
      ctx.restore();
      scDrawFx(ctx, s.fx);
    },
  },
  // Trait : charge immobile puis dash vers la droite.
  13: {
    init(s) { s.t = 0; s.x = -70; },
    update(s, dt, c, fake) {
      const st = fake.state;
      s.t += dt;
      if (s.t < 1.1) { st.charging = true; st.charge = (s.t / 1.1) * TRAIT_MAX_CHARGE; s.x = -70; }
      else if (s.t < 1.45) { if (st.charging) scBurst(s.fx, s.x, 0, 14, '#ff9d3d', 110); st.charging = false; s.x = lerp(-70, 70, (s.t - 1.1) / 0.35); scBurst(s.fx, s.x - 8, 0, 1, '#ffb14d', 30); }
      else if (s.t > 2.3) s.t = 0;
    },
    draw(ctx, s, c, fake) {
      fake.aim = { x: s.x + 200, y: 0 };
      ctx.save(); ctx.beginPath(); ctx.rect(-s.bounds.hw, -s.bounds.hh, s.bounds.hw * 2, s.bounds.hh * 2); ctx.clip();
      scDrawCharacter(ctx, c, fake, s.x, 0);
      ctx.restore();
      scDrawFx(ctx, s.fx);
    },
  },
  // Janus : entre dans un teleporteur et ressort par l'autre, un bloc de vent derriere.
  14: {
    init(s) { s.t = 0; },
    update(s, dt, c, fake) {
      s.t = (s.t + dt) % 2.4;
      const st = fake.state;
      st.winds = [{ x: -55, y: 0, size: 56, dx: 1, dy: 0, age: 1 }];
      s.x = s.t < 1.0 ? lerp(-80, -25, s.t / 1.0) : lerp(35, 80, (s.t - 1.0) / 1.4);
      if (s.t >= 1.0 && s.t - dt < 1.0) { scBurst(s.fx, -25, 0, 10, '#b47cff', 90); scRing(s.fx, 35, 0, 4, 20, 0.3, '#b47cff', 2); }
    },
    draw(ctx, s, c, fake) {
      fake.state.portals = [{ x: -25, y: 0 }, { x: 35, y: 0 }];
      scDrawCharacter(ctx, c, fake, s.x, 0);
      scDrawFx(ctx, s.fx);
    },
  },
  // Elan : maintient, bondit vers le haut, puis glisse.
  15: {
    init(s) { s.t = 0; s.x = -40; s.y = 30; },
    update(s, dt, c, fake) {
      const st = fake.state;
      s.t += dt;
      if (s.t < 1.3) { st.holding = true; st.hold = (s.t / 1.3) * ELAN_MAX_HOLD * 0.35; st.sliding = false; s.x = -40 + s.t * 10; s.y = 30; }
      else if (st.holding) { st.holding = false; scBolt(s.fx, s.x, s.y, s.x, -28, '#5dff9d', 0.25); scRing(s.fx, s.x, -28, 4, 18, 0.3, '#5dff9d', 2); s.y = -28; }
      else if (s.t < 2.8) { st.sliding = true; st.slideTime = (s.t - 1.3) * 1.2; s.x += 55 * dt; }
      else { st.sliding = false; s.t = 0; s.x = -40; }
    },
    draw(ctx, s, c, fake) {
      ctx.save(); ctx.beginPath(); ctx.rect(-s.bounds.hw, -s.bounds.hh, s.bounds.hw * 2, s.bounds.hh * 2); ctx.clip();
      scDrawCharacter(ctx, c, fake, s.x, s.y);
      ctx.restore();
      scDrawFx(ctx, s.fx);
    },
  },
});

// ---------- Scenes des tourelles ----------
function scAimAt(t, tx, ty, target) { t.aimAngle = Math.atan2(target.y - ty, target.x - tx); }

const TURRET_SHOWCASE = {
  T1: { update(s, dt) { const t = s.t; t.x = -50; t.y = 0; scAimAt(t, t.x, t.y, s.target); s.timer += dt; if (s.timer >= 1.1) { s.timer = 0; scShoot(s, t, 110); } } },
  T2: {
    update(s, dt) {
      const t = s.t; s.clock += dt;
      t.x = -45 + Math.sin(s.clock * 2.2) * 22; t.y = Math.cos(s.clock * 3.1) * 10;
      scAimAt(t, t.x, t.y, s.target);
      s.timer += dt;
      const c = s.timer % 1.6;
      if (c > 1.0 && c - dt <= 1.0) s.burst = 4;
      if (s.burst > 0) { s.bt = (s.bt || 0) + dt; if (s.bt >= 0.07) { s.bt = 0; s.burst--; scShoot(s, t, 150, 2.5); } }
    },
  },
  T3: {
    update(s, dt) {
      const t = s.t; t.x = -55; t.y = 0; s.timer = (s.timer + dt) % 2.8;
      const base = Math.atan2(s.target.y - t.y, s.target.x - t.x);
      t.charging = s.timer < 1.2;
      t.aimAngle = s.timer >= 1.2 && s.timer < 2.1 ? base - 0.35 + (s.timer - 1.2) / 0.9 * 0.7 : base;
      s.laser = s.timer >= 1.2 && s.timer < 2.1;
    },
    drawUnder(ctx, s) {
      const t = s.t, d = { x: Math.cos(t.aimAngle), y: Math.sin(t.aimAngle) };
      ctx.save();
      if (s.laser) {
        ctx.strokeStyle = '#ff3d9a'; ctx.lineWidth = 4; ctx.shadowColor = '#ff3d9a'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + d.x * 300, t.y + d.y * 300); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + d.x * 300, t.y + d.y * 300); ctx.stroke();
      } else if (t.charging) {
        ctx.strokeStyle = 'rgba(255,61,154,0.45)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + d.x * 300, t.y + d.y * 300); ctx.stroke();
      }
      ctx.restore();
    },
  },
  T4: {
    update(s, dt) {
      const t = s.t; s.clock += dt;
      t.x = -25 + Math.cos(s.clock * 0.8) * 26; t.y = Math.sin(s.clock * 0.8) * 20;
      t.phase = (t.phase || 0) + 2 * dt; t.aimAngle = t.phase;
      s.timer += dt;
      if (s.timer >= 0.16) { s.timer = 0; const d = { x: Math.cos(t.phase), y: Math.sin(t.phase) }; scBullet(s.fx, { x: t.x + d.x * 12, y: t.y + d.y * 12, vx: d.x * 100, vy: d.y * 100, life: 1, color: s.color, r: 2.5 }); }
    },
  },
  T5: {
    update(s, dt) {
      const t = s.t; s.clock += dt;
      t.x = -30 + Math.sin(s.clock * 0.9) * 30; t.y = Math.cos(s.clock * 0.7) * 14;
      s.timer = (s.timer + dt) % 2;
      t.charging = s.timer > 1.5;
      if (s.timer < dt) {
        for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; scBullet(s.fx, { x: t.x, y: t.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 1.1, color: s.color, r: 2.8 }); }
        scRing(s.fx, t.x, t.y, 6, 26, 0.3, s.color, 2);
      }
    },
  },
  T6: {
    update(s, dt) {
      const t = s.t; s.clock += dt;
      t.x = -30 + Math.sin(s.clock * 0.9) * 55; t.y = 30;
      scAimAt(t, t.x, t.y, s.target);
      s.timer += dt; if (s.timer >= 0.7) { s.timer = 0; scShoot(s, t, 130); }
    },
    drawUnder(ctx) {
      ctx.save(); ctx.strokeStyle = 'rgba(199,77,255,0.45)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-95, 36); ctx.lineTo(35, 36); ctx.stroke();
      ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.moveTo(-95, 40); ctx.lineTo(35, 40); ctx.stroke();
      ctx.restore();
    },
  },
  T7: {
    update(s, dt) {
      const t = s.t; s.clock += dt;
      t.x = -20 + Math.sin(s.clock * 0.7) * 50; t.y = Math.sin(s.clock * 1.3) * 22;
      s.timer += dt;
      if (s.timer >= 1.1) { s.timer = 0; s.mines.push({ x: t.x, y: t.y + 4, age: 0 }); scBurst(s.fx, t.x, t.y + 4, 6, '#8a6a45', 40); }
      for (const m of s.mines) m.age += dt;
      for (const m of s.mines) if (m.age >= 3.2 && !m.boom) { m.boom = true; scRing(s.fx, m.x, m.y, 4, 26, 0.35, '#ff4d4d', 2.5); scBurst(s.fx, m.x, m.y, 12, '#ff9d3d', 80); }
      s.mines = s.mines.filter((m) => m.age < 3.2);
    },
    drawUnder(ctx, s) {
      for (const m of s.mines) {
        const blink = Math.sin(m.age * (m.age > 2.2 ? 30 : 8)) > 0;
        ctx.save();
        ctx.fillStyle = '#3a1a10'; ctx.strokeStyle = '#1a0800'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = blink ? '#ff4d4d' : '#5a1a10'; ctx.shadowColor = '#ff4d4d'; ctx.shadowBlur = blink ? 8 : 0;
        ctx.beginPath(); ctx.arc(m.x, m.y, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    },
  },
  T8: {
    update(s, dt) {
      const t = s.t; t.x = -55; t.y = 0; scAimAt(t, t.x, t.y, s.target);
      s.clock = (s.clock + dt) % 2.2;
      if (s.clock < 1.1) {
        s.timer += dt;
        if (s.timer >= 0.08) {
          s.timer = 0; s.barrel = ((s.barrel || 0) + 1) % 3;
          const off = (s.barrel - 1) * 4.5, d = { x: Math.cos(t.aimAngle), y: Math.sin(t.aimAngle) };
          scBullet(s.fx, { x: t.x + d.x * 18 - d.y * off, y: t.y + d.y * 18 + d.x * off, vx: d.x * 180, vy: d.y * 180, life: 0.9, color: s.color, r: 2.2 });
        }
      }
    },
  },
  T9: {
    update(s, dt) {
      const t = s.t; s.clock = (s.clock + dt) % 1.6;
      const hop = s.clock < 0.5 ? Math.sin(s.clock / 0.5 * Math.PI) * 16 : 0;
      t.x = -50 + (s.dir || 0); t.y = 10 - hop;
      if (s.clock < dt) s.dir = s.dir ? 0 : 18;
      if (Math.abs(s.clock - 0.9) < dt / 2 + 0.0001 || (s.clock >= 0.9 && s.clock - dt < 0.9)) {
        const a = Math.atan2(s.target.y - t.y, s.target.x - t.x) - 0.5;
        scBullet(s.fx, { x: t.x, y: t.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 3, bounce: true, maxBounces: 4, color: s.color, r: 3.2 });
      }
    },
  },
  T10: {
    update(s, dt) {
      const t = s.t; t.x = -20; t.y = 0; s.timer = (s.timer + dt) % 1.5;
      t.charging = s.timer > 1.0;
      if (s.timer < dt) {
        const spin = performance.now() / 1000;
        for (let i = 0; i < 4; i++) { const a = spin + i * Math.PI / 2; scBullet(s.fx, { x: t.x + Math.cos(a) * 16, y: t.y + Math.sin(a) * 16, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, life: 1.2, color: s.color, r: 3 }); }
      }
    },
  },
  T11: {
    update(s, dt) {
      const t = s.t; s.clock += dt;
      t.x = -55; t.y = Math.sin(s.clock * 1.2) * 12;
      s.timer += dt;
      if (s.timer >= 1.8) { s.timer = 0; scBullet(s.fx, { x: t.x + 8, y: t.y, vx: 20, vy: -45, life: 3, color: s.color, r: 4, homing: 1.4, target: s.target }); }
      for (const b of s.fx.bullets) if (Math.hypot(b.x - s.target.x, b.y - s.target.y) < 9) { b.age = b.life; scBurst(s.fx, b.x, b.y, 10, s.color, 70); }
    },
  },
  T12: {
    update(s, dt) {
      const t = s.t; t.x = -55; t.y = 0; s.timer = (s.timer + dt) % 2.2;
      t.charging = s.timer < 1.1;
      if (s.timer < dt) s.zone = { x: s.target.x, y: s.target.y };
      if (s.zone && s.timer >= 1.1 && s.timer - dt < 1.1) {
        scRing(s.fx, s.zone.x, s.zone.y, 6, 30, 0.35, s.color, 3);
        scBurst(s.fx, s.zone.x, s.zone.y, 18, '#ff9d3d', 90);
      }
    },
    drawUnder(ctx, s) {
      if (!s.zone || s.timer >= 1.1) return;
      const f = s.timer / 1.1;
      ctx.save();
      ctx.strokeStyle = s.color; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(s.zone.x, s.zone.y, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = s.color; ctx.globalAlpha = 0.28;
      ctx.beginPath(); ctx.arc(s.zone.x, s.zone.y, 26 * f, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },
  },
};

function scShoot(s, t, speed, r) {
  const d = { x: Math.cos(t.aimAngle), y: Math.sin(t.aimAngle) };
  scBullet(s.fx, { x: t.x + d.x * 16, y: t.y + d.y * 16, vx: d.x * speed, vy: d.y * speed, life: 1.4, color: s.color, r: r || 3.2 });
  scBurst(s.fx, t.x + d.x * 16, t.y + d.y * 16, 4, s.color, 40);
}

// ---------- Scenes des boss ----------
const BOSS_SHOWCASE = {
  // Le Noeud : zones de glace et salves radiales de plus en plus denses.
  B1: {
    update(s, dt) {
      s.timer += dt;
      if (s.timer >= 1.4) {
        s.timer = 0; s.wave = ((s.wave || 0) + 1) % 3;
        const n = 8 + s.wave * 4;
        for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n + s.wave * 0.2; scBullet(s.fx, { x: Math.cos(a) * 30, y: Math.sin(a) * 30, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 1.2, color: '#9de8ff', r: 3 }); }
        s.zones.push({ x: (Math.random() - 0.5) * 180, y: (Math.random() - 0.5) * 100, age: 0, color: 'rgba(157,232,255,0.3)' });
      }
    },
  },
  // Le Jardin : fait pousser des zones de degats/glace et fait tourner des gousses.
  B2: {
    update(s, dt) {
      s.timer += dt; s.clock += dt;
      if (s.timer >= 0.9) {
        s.timer = 0;
        const ice = Math.random() < 0.4;
        s.zones.push({ x: (Math.random() - 0.5) * 190, y: (Math.random() - 0.5) * 110, age: 0, color: ice ? 'rgba(157,232,255,0.3)' : 'rgba(255,122,61,0.32)' });
      }
    },
    drawOver(ctx, s) {
      for (let i = 0; i < 3; i++) {
        const a = s.clock * 1.1 + i * Math.PI * 2 / 3;
        ctx.save(); ctx.translate(Math.cos(a) * 52, Math.sin(a) * 34);
        ctx.fillStyle = radialBodyGradient(ctx, 7, '#d0ffe0', '#5dff9d', '#1a5a30');
        ctx.strokeStyle = '#0c3018'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, a, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    },
  },
  // La Mitraille : balaie en rafale puis fonce.
  B3: {
    update(s, dt) {
      s.clock = (s.clock + dt) % 3.4;
      const b = s.boss;
      if (s.clock < 2.2) {
        b.charging = false; b.x = lerp(b.x, 0, dt * 4);
        s.timer += dt;
        if (s.timer >= 0.05) { s.timer = 0; const a = Math.sin(s.clock * 2.5) * 1.1; scBullet(s.fx, { x: b.x + Math.cos(a) * 26, y: b.y + Math.sin(a) * 26, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, life: 0.9, color: '#ffb85d', r: 2.4 }); }
      } else if (s.clock < 2.7) { b.charging = true; }
      else { b.charging = false; b.x = lerp(b.x, -70, dt * 7); if (Math.random() < 0.5) scBurst(s.fx, b.x + 25, b.y, 2, '#ffb85d', 60); }
    },
  },
  // Le Rail : se deplace sur un rail carre et tire dans 4 puis 8 directions a chaque coin.
  B4: {
    update(s, dt) {
      s.clock += dt;
      const corners = [{ x: -60, y: -30 }, { x: 60, y: -30 }, { x: 60, y: 30 }, { x: -60, y: 30 }];
      const seg = Math.floor(s.clock / 1.1) % 4, f = (s.clock / 1.1) % 1;
      const a = corners[seg], b = corners[(seg + 1) % 4];
      const e = f < 0.75 ? f / 0.75 : 1;
      s.boss.x = lerp(a.x, b.x, e); s.boss.y = lerp(a.y, b.y, e);
      if (f >= 0.75 && f - dt / 1.1 < 0.75) {
        s.shots = ((s.shots || 0) + 1) % 2;
        const n = s.shots ? 8 : 4;
        for (let i = 0; i < n; i++) { const an = i * Math.PI * 2 / n; scBullet(s.fx, { x: s.boss.x, y: s.boss.y, vx: Math.cos(an) * 120, vy: Math.sin(an) * 120, life: 1.2, color: '#c74dff', r: 3 }); }
      }
    },
    drawUnder(ctx) {
      ctx.save(); ctx.strokeStyle = 'rgba(199,77,255,0.4)'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
      ctx.strokeRect(-60, -30, 120, 60); ctx.restore();
    },
  },
  // Le Colosse : lent, coup de poing qui repousse (onde de choc) + gravats.
  B5: {
    update(s, dt) {
      s.clock = (s.clock + dt) % 2.6;
      s.boss.charging = s.clock > 1.8;
      if (s.clock < dt) {
        scRing(s.fx, 0, 0, 30, 110, 0.6, '#d8b890', 4);
        scBurst(s.fx, 0, 20, 20, '#8a6a55', 110);
        for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2; scBullet(s.fx, { x: Math.cos(a) * 30, y: Math.sin(a) * 30, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 1.4, color: '#b89070', r: 4 }); }
      }
    },
  },
  // Le Centre : spirale de projectiles puis onde de choc.
  B6: {
    update(s, dt) {
      s.clock = (s.clock + dt) % 3;
      if (s.clock < 2.2) {
        s.timer += dt;
        if (s.timer >= 0.09) { s.timer = 0; s.spin = (s.spin || 0) + 0.45; for (let k = 0; k < 2; k++) { const a = s.spin + k * Math.PI; scBullet(s.fx, { x: Math.cos(a) * 26, y: Math.sin(a) * 26, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, life: 1.3, color: '#ff5d5d', r: 3 }); } }
      } else if (s.clock - dt < 2.2) { scRing(s.fx, 0, 0, 30, 120, 0.6, '#ffffff', 3); }
    },
  },
};

// ---------- Fabrique ----------
// Renvoie { canvas, tick(dt) } ; la boucle d'animation est geree par l'UI.
function createShowcase(kind, id) {
  const canvas = document.createElement('canvas');
  canvas.width = SHOWCASE_W; canvas.height = SHOWCASE_H;
  canvas.className = 'showcase-canvas';
  const ctx = canvas.getContext('2d');
  const scale = kind === 'boss' ? 1.0 : (kind === 'turret' ? 1.45 : 1.25);
  const bounds = { hw: SHOWCASE_W / 2 / scale, hh: SHOWCASE_H / 2 / scale };
  const s = { fx: scFx(), bounds, timer: 0, clock: 0, zones: [], mines: [] };
  let draw;
  let update;

  if (kind === 'character') {
    const c = getCharacter(id);
    const spec = CHARACTER_SHOWCASE[id];
    const fake = { state: {}, x: 0, y: 0, aim: { x: 60, y: 0 }, facing: 0, radius: PLAYER_RADIUS, totalTime: 0, history: [{ t: 0, x: 0, y: 0 }], character: c };
    if (c.init) c.init(fake);
    if (spec && spec.init) spec.init(s, c, fake);
    update = (dt) => { if (spec) spec.update.call(spec, s, dt, c, fake); };
    draw = (dt) => { if (spec) spec.draw.call(spec, ctx, s, c, fake, dt); else scDrawCharacter(ctx, c, fake, 0, 0); };
  } else if (kind === 'turret') {
    const spec = TURRET_SHOWCASE[id];
    s.color = TURRET_COLOR[id] || '#ff5d5d';
    s.t = { type: id, x: -50, y: 0, aimAngle: 0, phase: 0, charging: false, radius: 14 };
    s.target = { x: 62, y: 0 };
    update = (dt) => {
      s.clock2 = (s.clock2 || 0) + dt;
      s.target.y = Math.sin(s.clock2 * 0.9) * 26;
      if (spec) spec.update(s, dt);
      // les projectiles s'arretent sur la cible
      for (const b of s.fx.bullets) if (!b.homing && Math.hypot(b.x - s.target.x, b.y - s.target.y) < 8) { b.age = b.life; scBurst(s.fx, b.x, b.y, 5, s.color, 50); }
    };
    draw = () => {
      if (spec && spec.drawUnder) spec.drawUnder(ctx, s);
      scDrawPlayerMarker(ctx, s.target);
      scDrawTurretBody(ctx, s.t, s.t.x, s.t.y, 1.1);
      scDrawFx(ctx, s.fx);
    };
  } else if (kind === 'element') {
    s.t = 0;
    update = (dt) => {
      s.t += dt;
      if (id === 'shooter' && s.t % 1.2 < dt) {
        for (const a of [-0.2, 0, 0.2]) scBullet(s.fx, { x: 0, y: -38, vx: Math.sin(a) * 120, vy: 120, life: 0.9, color: '#ff7a3d', r: 4 });
      }
      if (id === 'teleporter' && s.t % 1.6 < dt) { scBurst(s.fx, -45, 8, 10, '#7fd8ff', 80); scRing(s.fx, 45, 8, 4, 20, 0.3, '#b47cff', 2); }
    };
    draw = () => {
      const t = s.t;
      if (['ice', 'mud', 'accel', 'slow', 'damage', 'wind'].includes(id)) drawTerrainZone(ctx, 0, 0, { x: 0, y: 0, radius: 48, terrainType: id, windAngle: 0 });
      else if (id === 'spike') {
        const ph = t % 2.2;
        drawSpikePad(ctx, -34, -34, { w: 68, h: 68 }, ph > 1.4 ? 'out' : ph > 0.95 ? 'warn' : 'in', t);
      } else if (id === 'laser') {
        const ph = t % 2.4;
        const fake = { ax: 0, ay: -48, bx: 0, by: 48, period: 2.4, on: 0.8, warn: 0.55, offset: 0 };
        const P = { lasers: [fake], shooters: [], time: t };
        renderParkourLasers(ctx, { x: 0, y: 0 }, { room: { parkour: P }, zoom: 1 });
      } else if (id === 'shooter') drawShooterTrap(ctx, 0, -40, Math.PI / 2, (t % 1.2) > 0.9);
      else if (id === 'teleporter') { drawTeleporterPad(ctx, -45, 8, t, true); drawTeleporterPad(ctx, 45, 8, t, false); }
      else if (id === 'trampoline') {
        drawTrampoline(ctx, { x: -45, y: 18, lx: 45, ly: 18, bounce: (t % 1.4) < 0.3 ? 0.3 - (t % 1.4) : 0 }, { x: 0, y: 0 }, t);
        const f = (t % 1.4) / 1.4;
        ctx.save(); ctx.fillStyle = '#7fd8ff'; ctx.beginPath(); ctx.arc(lerp(-45, 45, f), 18 - Math.sin(Math.PI * f) * 45, 7 * (1 + 0.5 * Math.sin(Math.PI * f)), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      } else if (id === 'boost') drawBoostPickup(ctx, 0, 0, t, 0);
      scDrawFx(ctx, s.fx);
    };
  } else {
    const def = BOSS_DEFS[id];
    const spec = BOSS_SHOWCASE[id];
    s.boss = { type: id, x: 0, y: 0, radius: def.radius || 34, color: def.color, charging: false, state: {} };
    const k = 44 / Math.max(44, s.boss.radius);
    update = (dt) => {
      if (spec) spec.update(s, dt);
      for (const z of s.zones) z.age += dt;
      s.zones = s.zones.filter((z) => z.age < 2.6);
    };
    draw = () => {
      for (const z of s.zones) {
        const f = Math.min(1, z.age / 0.4), fade = z.age > 2 ? 1 - (z.age - 2) / 0.6 : 1;
        ctx.save(); ctx.globalAlpha = fade; ctx.fillStyle = z.color;
        ctx.beginPath(); ctx.arc(z.x, z.y, 22 * f, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      if (spec && spec.drawUnder) spec.drawUnder(ctx, s);
      ctx.save();
      ctx.translate(s.boss.x, s.boss.y + Math.sin(performance.now() / 420) * 2);
      ctx.scale(k, k);
      drawGroundShadow(ctx, s.boss.radius * 0.5, s.boss.radius * 0.9);
      try { (BOSS_BODY[id] || drawBossBody6)(ctx, s.boss); } catch (e) { /* apercu indisponible */ }
      ctx.restore();
      if (spec && spec.drawOver) spec.drawOver(ctx, s);
      scDrawFx(ctx, s.fx);
    };
  }

  const tick = (dt) => {
    update(dt);
    scUpdateFx(s.fx, dt, bounds);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, SHOWCASE_W, SHOWCASE_H);
    ctx.translate(SHOWCASE_W / 2, SHOWCASE_H / 2);
    ctx.scale(scale, scale);
    draw(dt);
  };
  return { canvas, tick };
}
