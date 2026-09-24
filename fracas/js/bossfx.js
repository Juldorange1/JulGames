// Attaques speciales des boss (bien plus impressionnantes que de simples balles) et apparence
// variee des projectiles ennemis (roches, aiguilles, bulles, eclats de glace, plasma...).
// Les attaques speciales passent par des "dangers" (world.hazards) annonces a l'avance :
// grand laser qui balaie, pluie de meteorites, lignes de pics qui jaillissent du sol, murs de
// rochers avec une breche, croix de lasers — avec tremblements d'ecran.

// ---------- Apparence des projectiles ennemis ----------
const PROJ_SKINS = {
  T1: ['slug', '#b8c4d0'], T2: ['needle', '#ff9d3d'], T3: ['energy', '#ff3d9a'], T4: ['energy', '#ffd23d'],
  T5: ['thorn', '#ff5dcc'], T6: ['shell', '#c77aff'], T8: ['bullet', '#e0b060'], T9: ['bubble', '#6fd8ff'],
  T10: ['rune', '#ff5d8a'], T11: ['jelly', '#c73dff'],
  B1: ['shard', '#bfefff'], B2: ['seed', '#8fdc6a'], B3: ['bullet', '#ffb85d'], B4: ['plasma', '#c74dff'], B5: ['rock', '#9a7a5a'], B6: ['energy', '#ff5d5d'],
};

function drawEnemyProjectile(ctx, pr, sx, sy) {
  const ang = Math.atan2(pr.vy, pr.vx);
  const r = pr.radius;
  const c = pr.color;
  const t = performance.now() / 1000;
  ctx.save();
  ctx.translate(sx, sy);
  // petite trainee dans le sens inverse du mouvement
  if (pr.skin !== 'bubble' && pr.skin !== 'jelly') {
    ctx.save();
    ctx.rotate(ang);
    const g = ctx.createLinearGradient(-r * 4, 0, 0, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, c);
    ctx.globalAlpha = 0.35; ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(-r * 4, 0); ctx.lineTo(0, r * 0.6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  switch (pr.skin) {
    case 'slug': { // balle de metal allongee
      ctx.rotate(ang);
      const g = ctx.createLinearGradient(0, -r, 0, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, c); g.addColorStop(1, '#3a4450');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-r * 1.4, -r * 0.6, r * 2.6, r * 1.2, r * 0.6); ctx.fill();
      break;
    }
    case 'needle': {
      ctx.rotate(ang);
      ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(r * 2, 0); ctx.lineTo(-r * 1.6, -r * 0.35); ctx.lineTo(-r * 1.6, r * 0.35); ctx.closePath(); ctx.fill();
      break;
    }
    case 'thorn': { // epine qui tourne
      ctx.rotate(t * 8 + pr.x * 0.01);
      ctx.fillStyle = c; ctx.strokeStyle = '#3a0026'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const rr = i % 2 ? r * 0.5 : r * 1.3; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    }
    case 'shell': { // obus pointu
      ctx.rotate(ang);
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(r * 1.6, 0); ctx.quadraticCurveTo(r * 0.6, -r, -r, -r * 0.8); ctx.lineTo(-r, r * 0.8); ctx.quadraticCurveTo(r * 0.6, r, r * 1.6, 0); ctx.fill();
      ctx.fillStyle = '#2a0f45'; ctx.fillRect(-r * 1.1, -r * 0.8, r * 0.4, r * 1.6);
      break;
    }
    case 'bullet': { // douille de laiton
      ctx.rotate(ang);
      const g = ctx.createLinearGradient(0, -r, 0, r);
      g.addColorStop(0, '#fff2c0'); g.addColorStop(0.5, c); g.addColorStop(1, '#6a4a10');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-r, -r * 0.55, r * 2, r * 1.1, [r * 0.2, r * 0.6, r * 0.6, r * 0.2]); ctx.fill();
      break;
    }
    case 'bubble': { // bulle d'eau translucide
      ctx.fillStyle = 'rgba(111,216,255,0.28)'; ctx.strokeStyle = c; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-r * 0.4, -r * 0.4, r * 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'rune': { // losange runique qui tourne
      ctx.rotate(t * 5);
      ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(0, -r * 1.3); ctx.lineTo(r, 0); ctx.lineTo(0, r * 1.3); ctx.lineTo(-r, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'jelly': { // goutte gelatineuse qui ondule
      const w = 1 + Math.sin(t * 12 + pr.x) * 0.15;
      ctx.scale(w, 2 - w);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.3);
      g.addColorStop(0, '#f0c8ff'); g.addColorStop(1, 'rgba(199,61,255,0.2)');
      ctx.fillStyle = g; ctx.shadowColor = c; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'shard': { // eclat de glace
      ctx.rotate(ang);
      ctx.fillStyle = c; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.shadowColor = '#9de8ff'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(r * 1.9, 0); ctx.lineTo(0, -r * 0.6); ctx.lineTo(-r * 1.3, 0); ctx.lineTo(0, r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    }
    case 'seed': { // graine/cosse
      ctx.rotate(ang + t * 3);
      ctx.fillStyle = '#6a4a22'; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.2, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(r * 0.4, -r * 0.5, r * 0.7, r * 0.3, -0.6, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'plasma': { // boule de plasma qui crepite
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, c); g.addColorStop(1, 'rgba(199,77,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,255,0.8)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { const a = t * 20 + i * 2.1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5); ctx.stroke(); }
      break;
    }
    case 'rock': { // rocher irregulier qui roule
      ctx.rotate(t * 4 + pr.y * 0.01);
      const g = ctx.createLinearGradient(-r, -r, r, r);
      g.addColorStop(0, '#c9ab8a'); g.addColorStop(1, '#4a3526');
      ctx.fillStyle = g; ctx.strokeStyle = '#2a1c12'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const rr = r * (1 + ((i * 37) % 5) * 0.08); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    }
    default: { // orbe d'energie
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.4);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, c); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// ---------- Dangers des attaques speciales ----------
function addHazard(world, h) {
  if (!world.hazards) world.hazards = [];
  world.hazards.push(Object.assign({ t: 0, tele: 0.8, dur: 1, hitCd: 0 }, h));
}

function updateHazards(world, dt) {
  const list = world.hazards;
  if (!list || !list.length) return;
  const p = world.player;
  for (let i = list.length - 1; i >= 0; i--) {
    const h = list[i];
    h.t += dt;
    if (h.hitCd > 0) h.hitCd -= dt;
    const active = h.t >= h.tele && h.t < h.tele + h.dur;
    if (h.type === 'laser' && h.boss) { h.x = h.boss.x; h.y = h.boss.y; if (h.boss.dead) h.t = h.tele + h.dur; }
    if (h.type === 'meteor' && !h.impacted && h.t >= h.tele) {
      h.impacted = true;
      Particles.ring(h.x, h.y, h.r, '#ff9d3d', 0.4);
      Particles.burst(h.x, h.y, 26, '#c9a27a', { maxSpeed: 260, life: 0.6 });
      Particles.burst(h.x, h.y, 14, '#ff7a3d', { maxSpeed: 180, life: 0.4 });
      Audio2.explosion(1.1);
      if (Game.shakeCamera) Game.shakeCamera(9, 0.35);
      if (p && Math.hypot(p.x - h.x, p.y - h.y) < h.r + p.radius) playerApplyDamage(p, h.dmg);
    }
    if (h.type === 'spikes' && !h.erupted && h.t >= h.tele) {
      h.erupted = true;
      if (Game.shakeCamera) Game.shakeCamera(6, 0.25);
      Audio2.freeze();
    }
    if (active && p && !p.airborne && !(h.hitCd > 0) && (h.type === 'laser' || h.type === 'spikes')) {
      const a = h.angle + (h.rot || 0) * Math.max(0, h.t - h.tele) / h.dur;
      const x1 = h.x + Math.cos(a) * h.len, y1 = h.y + Math.sin(a) * h.len;
      if (distToSegment(p.x, p.y, h.x, h.y, x1, y1) < h.width / 2 + p.radius) { playerApplyDamage(p, h.dmg); h.hitCd = 0.6; }
    }
    if (h.type === 'laser' && active && Math.random() < 0.3 && Game.shakeCamera) Game.shakeCamera(2.5, 0.08);
    if (h.t >= h.tele + h.dur) list.splice(i, 1);
  }
}

// Au sol : annonces (lignes, cibles) et pics qui jaillissent.
function renderHazardsGround(ctx, camera, world) {
  const list = world.hazards;
  if (!list || !list.length) return;
  const t = performance.now() / 1000;
  for (const h of list) {
    const tele = h.t < h.tele;
    ctx.save();
    if (h.type === 'meteor') {
      const sx = h.x - camera.x, sy = h.y - camera.y;
      if (tele) {
        const f = h.t / h.tele;
        ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.35 * f})`;
        ctx.beginPath(); ctx.arc(sx, sy, h.r * (0.3 + 0.7 * f), 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,120,60,${0.5 + 0.5 * Math.sin(t * 20)})`; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.arc(sx, sy, h.r, 0, Math.PI * 2); ctx.stroke();
      } else {
        const f = (h.t - h.tele) / h.dur;
        ctx.globalAlpha = 1 - f;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, h.r * 1.2);
        g.addColorStop(0, 'rgba(255,240,180,0.9)'); g.addColorStop(0.5, 'rgba(255,120,40,0.6)'); g.addColorStop(1, 'rgba(60,20,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, h.r * 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(30,18,10,0.6)'; ctx.beginPath(); ctx.arc(sx, sy, h.r * 0.55, 0, Math.PI * 2); ctx.fill();
      }
    } else if (h.type === 'spikes') {
      const a = h.angle, cos = Math.cos(a), sin = Math.sin(a);
      if (tele) {
        ctx.strokeStyle = `rgba(190,240,255,${0.3 + 0.4 * Math.sin(t * 18)})`; ctx.lineWidth = 3; ctx.setLineDash([4, 8]);
        ctx.beginPath(); ctx.moveTo(h.x - camera.x, h.y - camera.y); ctx.lineTo(h.x + cos * h.len - camera.x, h.y + sin * h.len - camera.y); ctx.stroke();
      } else {
        const grow = Math.min(1, (h.t - h.tele) / 0.12), fade = Math.min(1, (h.tele + h.dur - h.t) / 0.25);
        ctx.globalAlpha = fade;
        const n = Math.floor(h.len / 22);
        for (let k = 1; k <= n; k++) {
          const px = h.x + cos * k * 22 - camera.x, py = h.y + sin * k * 22 - camera.y;
          const s = (10 + (k % 3) * 4) * grow;
          const g = ctx.createLinearGradient(px, py - s, px, py + s * 0.4);
          g.addColorStop(0, '#ffffff'); g.addColorStop(1, h.color || '#7fcfff');
          ctx.fillStyle = g; ctx.strokeStyle = 'rgba(20,40,60,0.6)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(px - s * 0.5, py + s * 0.35); ctx.lineTo(px, py - s); ctx.lineTo(px + s * 0.5, py + s * 0.35); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
    } else if (h.type === 'laser' && tele) {
      const a = h.angle;
      ctx.strokeStyle = `rgba(255,80,110,${0.35 + 0.35 * Math.sin(t * 25)})`; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.moveTo(h.x - camera.x, h.y - camera.y); ctx.lineTo(h.x + Math.cos(a) * h.len - camera.x, h.y + Math.sin(a) * h.len - camera.y); ctx.stroke();
      if (h.rot) {
        const a2 = a + h.rot;
        ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.moveTo(h.x - camera.x, h.y - camera.y); ctx.lineTo(h.x + Math.cos(a2) * h.len - camera.x, h.y + Math.sin(a2) * h.len - camera.y); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// Au-dessus de tout : grands lasers actifs et meteorites en chute.
function renderHazardsTop(ctx, camera, world) {
  const list = world.hazards;
  if (!list || !list.length) return;
  for (const h of list) {
    if (h.type === 'laser' && h.t >= h.tele) {
      const a = h.angle + (h.rot || 0) * (h.t - h.tele) / h.dur;
      const x0 = h.x - camera.x, y0 = h.y - camera.y, x1 = x0 + Math.cos(a) * h.len, y1 = y0 + Math.sin(a) * h.len;
      const fade = Math.min(1, (h.tele + h.dur - h.t) / 0.2, (h.t - h.tele) / 0.1);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,40,80,0.25)'; ctx.lineWidth = h.width * 2.2;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = h.color || '#ff3d5a'; ctx.lineWidth = h.width; ctx.shadowColor = h.color || '#ff3d5a'; ctx.shadowBlur = 24;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = '#fff0f4'; ctx.lineWidth = h.width * 0.35; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.restore();
    } else if (h.type === 'meteor' && h.t < h.tele) {
      // la meteorite tombe du ciel : grossit en approchant, avec une trainee de feu
      const f = h.t / h.tele;
      const sx = h.x - camera.x + (1 - f) * 120, sy = h.y - camera.y - (1 - f) * 260;
      const s = 6 + f * h.r * 0.45;
      ctx.save();
      const tg = ctx.createLinearGradient(sx, sy, sx + 60, sy - 130);
      tg.addColorStop(0, 'rgba(255,160,60,0.8)'); tg.addColorStop(1, 'rgba(255,160,60,0)');
      ctx.strokeStyle = tg; ctx.lineWidth = s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 60, sy - 130); ctx.stroke();
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s);
      g.addColorStop(0, '#fff3c0'); g.addColorStop(0.5, '#ff8a3d'); g.addColorStop(1, '#5a2a10');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, s, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

// ---------- Programme des attaques speciales ----------
function bossAim(world, b) { const p = world.player; return p ? Math.atan2(p.y - b.y, p.x - b.x) : 0; }

const BOSS_SPECIALS = {
  // Le Noeud : lignes de pics de glace qui jaillissent du sol en eventail vers le joueur
  B1(world, b) {
    const base = bossAim(world, b), n = 3 + b.phase;
    for (let i = 0; i < n; i++) addHazard(world, { type: 'spikes', x: b.x, y: b.y, angle: base + (i - (n - 1) / 2) * 0.32, len: 520, width: 28, tele: 0.9, dur: 0.7, dmg: 12, color: '#8fd8ff' });
  },
  // Le Jardin : pluie de cosses explosives autour du joueur
  B2(world, b) {
    const p = world.player; if (!p) return;
    for (let i = 0; i < 5 + b.phase * 2; i++) {
      addHazard(world, { type: 'meteor', x: p.x + (Math.random() - 0.5) * 320, y: p.y + (Math.random() - 0.5) * 240, r: 42, tele: 1 + Math.random() * 0.6, dur: 0.3, dmg: 11 });
    }
  },
  // La Mitraille : grand laser qui balaie la salle
  B3(world, b) {
    const base = bossAim(world, b);
    addHazard(world, { type: 'laser', boss: b, x: b.x, y: b.y, angle: base - 0.9, rot: 1.8, len: 1600, width: 22, tele: 0.8, dur: 1.5, dmg: 14 });
  },
  // Le Rail : mur de rochers avec une seule breche, qui avance vers le joueur
  B4(world, b) {
    const p = world.player; if (!p) return;
    const a = bossAim(world, b), dir = { x: Math.cos(a), y: Math.sin(a) }, perp = { x: -dir.y, y: dir.x };
    const n = 17, gap = Math.floor(Math.random() * (n - 4)) + 2;
    for (let i = 0; i < n; i++) {
      if (i === gap || i === gap + 1) continue;
      const off = (i - (n - 1) / 2) * 34;
      spawnEnemyProjectile(world, { x: b.x + perp.x * off, y: b.y + perp.y * off, vx: dir.x * 150, vy: dir.y * 150, radius: 11, dmgPercent: 12, life: 7, skin: 'rock', color: '#9a7a5a' });
    }
    if (Game.shakeCamera) Game.shakeCamera(7, 0.3);
    Audio2.explosion(0.8);
  },
  // Le Colosse : pluie de meteorites
  B5(world, b) {
    const p = world.player; if (!p) return;
    for (let i = 0; i < 6 + b.phase * 2; i++) {
      addHazard(world, { type: 'meteor', x: p.x + (Math.random() - 0.5) * 380, y: p.y + (Math.random() - 0.5) * 280, r: 55, tele: 1.1 + i * 0.15, dur: 0.3, dmg: 16 });
    }
    if (Game.shakeCamera) Game.shakeCamera(5, 0.4);
  },
  // Le Centre : croix de lasers qui tourne
  B6(world, b) {
    const base = Math.random() * Math.PI;
    const arms = b.phase >= 3 ? 6 : 4;
    for (let k = 0; k < arms; k++) addHazard(world, { type: 'laser', boss: b, x: b.x, y: b.y, angle: base + k * Math.PI * 2 / arms, rot: 1.2, len: 1400, width: 16, tele: 1, dur: 2, dmg: 12, color: '#ff5d5d' });
  },
};

function updateBossSpecials(world, b, dt) {
  if (b.dead) return;
  if (!b._roared) {
    b._roared = true;
    b._spTimer = 3;
    if (Game.shakeCamera) Game.shakeCamera(12, 0.6);
    Audio2.boss();
    Particles.ring(b.x, b.y, (b.radius || 34) * 3, b.color, 0.6);
  }
  b._spTimer -= dt * (b.fireScale || 1); // double boss : attaques speciales 2x moins frequentes
  if (b._spTimer <= 0) {
    const spec = BOSS_SPECIALS[b.type];
    if (spec) spec(world, b);
    b._spTimer = Math.max(4, 8 - (b.phase || 1) * 1.3);
  }
}
