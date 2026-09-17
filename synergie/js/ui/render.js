// Rendu canvas du combat. Purement visuel — ne modifie jamais l'état du jeu.
// La carte entière est toujours visible et centrée (pas de caméra qui suit le
// joueur) : on calcule une échelle qui fait tenir toute la carte dans le canvas.
const Render = {
  computeView(game, canvas) {
    const margin = 0.94;
    const scale = Math.min(canvas.width / game.map.width, canvas.height / game.map.height) * margin;
    const offsetX = (canvas.width - game.map.width * scale) / 2;
    const offsetY = (canvas.height - game.map.height * scale) / 2;
    return { scale, offsetX, offsetY };
  },

  // Convertit des coordonnées écran (ex: la souris) en coordonnées monde.
  screenToWorld(game, canvas, sx, sy) {
    const v = this.computeView(game, canvas);
    return { x: (sx - v.offsetX) / v.scale, y: (sy - v.offsetY) / v.scale };
  },

  draw(ctx, canvas, game) {
    const view = this.computeView(game, canvas);
    ctx.save();
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(view.offsetX, view.offsetY);
    ctx.scale(view.scale, view.scale);

    this.drawGround(ctx, game);
    this.drawMapFeatures(ctx, game);
    this.drawObstacles(ctx, game);
    this.drawTelegraphs(ctx, game);
    this.drawZones(ctx, game);
    this.drawPickups(ctx, game);
    this.drawTraps(ctx, game);
    this.drawChainVisuals(ctx, game);
    this.drawProjectiles(ctx, game);
    this.drawCorpses(ctx, game);
    this.drawEnemies(ctx, game);
    this.drawSummons(ctx, game);
    this.drawPlayer(ctx, game);
    this.drawParticles(ctx, game);
    this.drawFloatingTexts(ctx, game);

    ctx.restore();
    this.drawVignette(ctx, canvas);
  },

  drawVignette(ctx, canvas) {
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.35, canvas.width / 2, canvas.height / 2, canvas.height * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  },

  drawGround(ctx, game) {
    const g = ctx.createRadialGradient(game.map.width / 2, game.map.height / 2, 60, game.map.width / 2, game.map.height / 2, Math.max(game.map.width, game.map.height) * 0.75);
    g.addColorStop(0, '#12161f'); g.addColorStop(1, '#080a0f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, game.map.width, game.map.height);

    ctx.strokeStyle = 'rgba(140,160,220,.05)';
    ctx.lineWidth = 1;
    const grid = 60;
    ctx.beginPath();
    for (let x = 0; x <= game.map.width; x += grid) { ctx.moveTo(x, 0); ctx.lineTo(x, game.map.height); }
    for (let y = 0; y <= game.map.height; y += grid) { ctx.moveTo(0, y); ctx.lineTo(game.map.width, y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(109,141,255,.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, game.map.width, game.map.height);
  },

  drawObstacles(ctx, game) {
    ctx.fillStyle = '#232a3d';
    ctx.strokeStyle = '#3a4256';
    ctx.lineWidth = 2;
    for (const o of game.map.obstacles) {
      ctx.beginPath();
      if (o.shape === 'circle') ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      else ctx.rect(o.x, o.y, o.w, o.h);
      ctx.fill(); ctx.stroke();
    }
  },

  drawMapFeatures(ctx, game) {
    const t = game.time;
    for (const f of game.map.features) {
      ctx.save();
      if (f.type === 'teleporter') {
        const pulse = 0.7 + Math.sin(t * 3) * 0.3;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#6d8dff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.55, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#6d8dff'; ctx.fill();
      } else if (f.type === 'trap') {
        ctx.fillStyle = f.armed ? '#ff4757' : '#3a2020';
        ctx.strokeStyle = f.armed ? '#ffb0b0' : '#5a3a3a';
        ctx.lineWidth = 2;
        const spikes = 6;
        ctx.beginPath();
        for (let i = 0; i < spikes; i++) {
          const a = (Math.PI * 2 / spikes) * i;
          const r = i % 2 === 0 ? f.r : f.r * 0.5;
          ctx.lineTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (f.type === 'damageZone') {
        ctx.fillStyle = 'rgba(255,71,87,.16)';
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,71,87,.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        ctx.stroke(); ctx.setLineDash([]);
      } else if (f.type === 'speedZone') {
        ctx.fillStyle = 'rgba(74,222,128,.14)';
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(74,222,128,.5)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          const yy = f.y + i * 14;
          ctx.beginPath(); ctx.moveTo(f.x - 14, yy); ctx.lineTo(f.x + 6, yy); ctx.lineTo(f.x, yy - 6); ctx.moveTo(f.x + 6, yy); ctx.lineTo(f.x, yy + 6); ctx.stroke();
        }
      } else if (f.type === 'slowZone') {
        ctx.fillStyle = 'rgba(192,132,252,.14)';
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(192,132,252,.5)'; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.restore();
    }
  },

  drawTelegraphs(ctx, game) {
    for (const t of game.telegraphs) {
      const ratio = 1 - t.time / t.maxTime;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
      ctx.strokeStyle = t.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.35 + ratio * 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },

  drawZones(ctx, game) {
    for (const z of game.zones) {
      ctx.fillStyle = z.color || 'rgba(255,255,255,.15)';
      if (z.shape === 'line') {
        ctx.save();
        ctx.strokeStyle = z.color; ctx.lineWidth = z.width; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(z.x1, z.y1); ctx.lineTo(z.x2, z.y2); ctx.stroke();
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2); ctx.fill();
      }
    }
  },

  drawTraps(ctx, game) {
    for (const t of game.traps) {
      ctx.globalAlpha = t.armed ? 0.85 : 0.35;
      ctx.strokeStyle = t.color || '#ff4757'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = t.color || '#ff4757';
      ctx.beginPath(); ctx.arc(t.x, t.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  drawPickups(ctx, game) {
    for (const pk of game.pickups) {
      ctx.beginPath(); ctx.arc(pk.x, pk.y, pk.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#4ade80'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  },

  drawChainVisuals(ctx, game) {
    for (const c of game.chainVisuals) {
      ctx.strokeStyle = c.color; ctx.lineWidth = 2; ctx.globalAlpha = Math.min(1, c.life * 4);
      ctx.beginPath();
      ctx.moveTo(c.path[0].x, c.path[0].y);
      for (let i = 1; i < c.path.length; i++) ctx.lineTo(c.path[i].x, c.path[i].y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },

  // Un ennemi tué ne disparaît pas instantanément : il s'aplatit et s'estompe en
  // ~0.45s (silhouette qui "fond" au sol) plutôt qu'un pop immédiat.
  drawCorpses(ctx, game) {
    for (const c of game.corpses) {
      const p = c.timer / c.maxTimer;
      ctx.globalAlpha = p * 0.75;
      ctx.fillStyle = c.color;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.radius * (0.5 + p * 0.5), c.radius * (0.15 + p * 0.35), 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  drawProjectiles(ctx, game) {
    for (const p of game.projectiles) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color || '#fff'; ctx.fill();
    }
  },

  statusColor(enemy) {
    const order = ['freeze', 'burn', 'poison', 'bleed', 'shock'];
    for (const type of order) if (hasStatus(enemy, type)) return STATUS_DEFS[type].color;
    return null;
  },

  drawEnemies(ctx, game) {
    for (const e of game.enemies) {
      if (e.dead) continue;
      CharacterArt.drawShadow(ctx, e.x, e.y, e.radius * 0.85, e.radius * 0.4);
      const glow = this.statusColor(e);
      if (glow) { ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 12; }
      CharacterArt.draw(ctx, e, e.archetype, game.time);
      if (glow) ctx.restore();
      if (game.player.preyTargetId === e.id) {
        ctx.strokeStyle = '#ff8fa3'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2); ctx.stroke();
      }
      // barre de vie
      const w = e.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w, 5);
      ctx.fillStyle = e.hpRatio() > 0.5 ? '#4ade80' : e.hpRatio() > 0.25 ? '#fbbf24' : '#f87171';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w * e.hpRatio(), 5);
      this.drawStatusIcons(ctx, e);
    }
  },

  // Toutes les altérations actives d'un ennemi, chacune avec sa couleur (voir
  // STATUS_DEFS) et son nombre de charges si elle stack — pas juste une lueur unique.
  drawStatusIcons(ctx, e) {
    const types = e.statuses ? Object.keys(e.statuses) : [];
    if (!types.length) return;
    const w = e.radius * 2;
    const y = e.y - e.radius - 18;
    const spacing = 11;
    const startX = e.x - ((types.length - 1) * spacing) / 2;
    types.forEach((type, i) => {
      const def = STATUS_DEFS[type];
      if (!def) return;
      const x = startX + i * spacing;
      const s = e.statuses[type];
      ctx.beginPath(); ctx.arc(x, y, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = def.color; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.stroke();
      if (def.stacking && s.stacks > 1) {
        ctx.font = '700 8px Segoe UI, sans-serif';
        ctx.textAlign = 'center'; ctx.fillStyle = '#0b0e14';
        ctx.fillText(String(Math.round(s.stacks)), x, y + 2.8);
      }
    });
  },

  drawSummons(ctx, game) {
    for (const s of game.summons) {
      CharacterArt.drawShadow(ctx, s.x, s.y, s.radius * 0.85, s.radius * 0.4);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = CharacterArt.sphereGradient(ctx, s.x, s.y, s.radius, s.color);
      ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    }
  },

  drawPlayer(ctx, game) {
    const p = game.player;
    CharacterArt.drawShadow(ctx, p.x, p.y, p.radius * 0.85, p.radius * 0.42);
    ctx.save();
    if (p.iframes > 0) ctx.globalAlpha = 0.55;
    if (p.shield > 0) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#7fd4ff'; ctx.lineWidth = 3; ctx.stroke();
    }
    p.facing = p.aimAngle;
    CharacterArt.draw(ctx, p, 'player', game.time);
    ctx.restore();

    if (p.charging) {
      const slot = game.activeSkillSlots[p.charging.slotIndex];
      const maxTime = (slot && slot.def.baseStats && slot.def.baseStats.maxChargeTime) || 1;
      const ratio = clamp((game.time - p.charging.startTime) / maxTime, 0, 1);
      ctx.strokeStyle = ratio >= 1 ? '#fbbf24' : '#7fd4ff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 10 + ratio * 6, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
      ctx.stroke();
    }
  },

  drawParticles(ctx, game) {
    for (const pt of game.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fillStyle = pt.color; ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  drawFloatingTexts(ctx, game) {
    ctx.font = '600 13px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    for (const t of game.floatingTexts) {
      ctx.globalAlpha = Math.min(1, t.life * 2.2);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.globalAlpha = 1;
    }
  },
};
