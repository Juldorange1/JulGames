// Boucle de combat principale : crée l'état de jeu (`Game`) et fait avancer toutes
// les entités d'un pas de temps. C'est le seul fichier qui orchestre les autres
// systèmes (skillRuntime, enemyAI, effects, status) ; il ne contient pas de règles de
// compétence/spécificité lui-même.
const Combat = {
  createGame({ difficultyLevel, drawnSkills, chosenSpecs }) {
    const map = generateMap(difficultyLevel);
    const game = {
      events: new EventBus(),
      player: new Player(map.width / 2, map.height / 2),
      enemies: [], projectiles: [], zones: [], summons: [], particles: [], corpses: [],
      floatingTexts: [], telegraphs: [], chainVisuals: [], pickups: [], traps: [],
      map, time: 0, difficultyLevel, diffCfg: DIFFICULTY_LEVELS[difficultyLevel - 1],
      specFlags: {}, activeSkillSlots: [],
      selectedSlot: 0,
      input: {
        keys: {}, mouseWorld: { x: map.width / 2 + 100, y: map.height / 2 }, mouseDown: false,
        binds: KeyBindings.load(),
        moveVec() {
          let x = 0, y = 0;
          if (this.keys[this.binds.up] || this.keys['arrowup']) y -= 1;
          if (this.keys[this.binds.down] || this.keys['arrowdown']) y += 1;
          if (this.keys[this.binds.left] || this.keys['arrowleft']) x -= 1;
          if (this.keys[this.binds.right] || this.keys['arrowright']) x += 1;
          const len = Math.hypot(x, y) || 1;
          return len > 1 ? { x: x / len, y: y / len } : { x, y };
        },
      },
      scheduledCallbacks: [], result: null, pointsEarned: 0, paused: false,
      _castMult: 1, _passiveRegistry: null,
      positionHistory: [], _historyTimer: 0, // échantillons pour Retour / Miroir temporel
      schedule(delay, fn) {
        const mult = this._castMult;
        this.scheduledCallbacks.push({ time: this.time + delay, fn: () => { const prev = this._castMult; this._castMult = mult; fn(); this._castMult = prev; } });
      },
    };

    SkillRuntime.initSlots(game, drawnSkills);
    SynergyEngine.activate(game, chosenSpecs);
    SynergyEngine.computeBuildTagCount(game, drawnSkills.map(s => s.skillId), chosenSpecs.map(s => s.specId));
    EnemySpawner.startCombat(game);
    SFX.attach(game);
    game.events.emit(EVT.COMBAT_STARTED, {});
    return game;
  },

  enemyAttackPlayer(game, enemy, amount) {
    const p = game.player;
    if (p.parryActive && game.time <= p.parryUntil) {
      p.parryActive = false;
      Effects.applyStatus(game, enemy, 'freeze', { duration: p.parryStun });
      Effects.addShield(game, p.parryShield, 4);
      game.floatingTexts.push({ x: p.x, y: p.y - 24, text: 'PARÉ !', life: 0.7, color: '#fbbf24', vy: -30 });
      game.events.emit(EVT.PARRY_SUCCESS, { enemy });
      return 0;
    }
    const mult = SynergyEngine.incomingDamageMultiplier(game);
    const dealt = p.takeDamage(game, amount * mult, { source: enemy });
    if (dealt <= 0 && amount > 0) game.events.emit(EVT.DAMAGE_PREVENTED, { amount, source: enemy });
    if (p.hpRatio() <= 0.3) game.events.emit(EVT.LOW_HEALTH, { ratio: p.hpRatio() });
    return dealt;
  },

  update(game, dt) {
    if (game.result || game.paused) return;
    game.time += dt;

    const due = game.scheduledCallbacks.filter(c => c.time <= game.time);
    if (due.length) {
      game.scheduledCallbacks = game.scheduledCallbacks.filter(c => c.time > game.time);
      for (const c of due) c.fn();
    }

    this.updatePlayer(game, dt);
    this.updateHistory(game, dt);
    SkillRuntime.update(game, dt);
    // Maintenir le clic gauche enfoncé relance la compétence équipée dès qu'elle est
    // de nouveau prête (pas besoin de re-cliquer pour chaque charge) — SAUF pour une
    // compétence à charge (`def.charge`), qui se déclenche au relâchement (main.js).
    const heldSlot = game.activeSkillSlots[game.selectedSlot];
    if (game.input.mouseDown && !game.player.charging && heldSlot && !heldSlot.def.charge && SkillRuntime.canUse(game, game.selectedSlot)) {
      SkillRuntime.use(game, game.selectedSlot);
    }
    this.updateProjectiles(game, dt);
    this.updateZones(game, dt);
    this.updateSummons(game, dt);
    this.updateMapFeatures(game, dt);
    this.updateTraps(game, dt);
    for (const e of game.enemies) {
      if (e.dead) continue;
      this.applyMapFeatures(game, e, dt, false);
      EnemyAI.update(game, e, dt);
      tickEnemyStatuses(game, e, dt);
    }
    this.updatePickups(game, dt);
    this.trimTransients(game, dt);

    if (game.enemies.some(e => e.dead)) {
      for (const e of game.enemies.filter(e => e.dead)) {
        game.particles.push(...Effects.burstParticles(e.x, e.y, e.color, 10));
        game.corpses.push({ x: e.x, y: e.y, color: e.color, radius: e.radius, timer: 0.45, maxTimer: 0.45 });
      }
      game.enemies = game.enemies.filter(e => !e.dead);
    }
    game.summons = game.summons.filter(s => !s.dead);

    if (game.player.hp <= 0) { game.result = 'defeat'; game.events.emit(EVT.COMBAT_ENDED, { result: 'defeat' }); }
    else if (game.enemies.length === 0) {
      game.result = 'victory'; game.pointsEarned = game.diffCfg.points;
      game.events.emit(EVT.COMBAT_ENDED, { result: 'victory' });
    }
  },

  // Téléporteurs / pièges / zones de dégâts-vitesse-ralentissement posés sur la carte
  // (core/mapgen.js) : ils affectent le joueur ET les ennemis, ce qui ouvre des jeux
  // tactiques (attirer un poursuivant sur un piège, fuir par un téléporteur...).
  applyMapFeatures(game, entity, dt, isPlayer) {
    entity._zoneSpeedMult = 1;
    entity._teleportCooldown = Math.max(0, (entity._teleportCooldown || 0) - dt);
    for (const f of game.map.features) {
      const d = Effects.dist(entity.x, entity.y, f.x, f.y);
      if (d > f.r) continue;
      if (f.type === 'damageZone') {
        const dmg = f.dps * dt;
        if (isPlayer) game.player.takeDamage(game, dmg, { source: 'hazard' });
        else Effects.damageEnemy(game, entity, dmg, { tags: [], source: 'hazard', noProc: true });
      } else if (f.type === 'speedZone') {
        entity._zoneSpeedMult = Math.max(entity._zoneSpeedMult, f.mult);
      } else if (f.type === 'slowZone') {
        entity._zoneSpeedMult = Math.min(entity._zoneSpeedMult, f.mult);
      } else if (f.type === 'trap' && f.armed) {
        f.armed = false; f.timer = f.cooldown;
        if (isPlayer) game.player.takeDamage(game, f.damage, { source: 'trap' });
        else Effects.damageEnemy(game, entity, f.damage, { tags: [], source: 'trap', noProc: true });
        game.particles.push(...Effects.burstParticles(f.x, f.y, '#ff4757', 10));
        if (isPlayer) SFX.play('trap');
      } else if (f.type === 'teleporter' && entity._teleportCooldown <= 0) {
        const pair = game.map.features.find(o => o.type === 'teleporter' && o.pairId === f.pairId && o !== f);
        if (pair) {
          game.particles.push(...Effects.burstParticles(entity.x, entity.y, '#6d8dff', 10));
          entity.x = pair.x; entity.y = pair.y;
          entity._teleportCooldown = 1.2;
          game.particles.push(...Effects.burstParticles(entity.x, entity.y, '#6d8dff', 10));
          if (isPlayer) SFX.play('teleport');
          break;
        }
      }
    }
  },

  // Échantillonne position joueur + ennemis toutes les ~0.2s (15 entrées ~= 3s
  // d'historique) pour les compétences "Retour" / "Miroir temporel".
  updateHistory(game, dt) {
    game._historyTimer -= dt;
    if (game._historyTimer > 0) return;
    game._historyTimer = 0.2;
    game.positionHistory.push({
      t: game.time, px: game.player.x, py: game.player.y,
      enemies: game.enemies.filter(e => !e.dead).map(e => ({ id: e.id, x: e.x, y: e.y })),
    });
    if (game.positionHistory.length > 20) game.positionHistory.shift();
  },

  updateMapFeatures(game, dt) {
    for (const f of game.map.features) {
      if (f.type === 'trap' && !f.armed) { f.timer -= dt; if (f.timer <= 0) f.armed = true; }
    }
  },

  // Pièges posés par le JOUEUR (Mine, Araignée...) — distincts des pièges générés sur
  // la carte (core/mapgen.js). Un piège armé qui touche un ennemi se déclenche ; les
  // spécificités "Architecte"/"Piégeur" peuvent en faire exploser d'autres à la chaîne
  // via Effects.triggerTrapsNear.
  updateTraps(game, dt) {
    for (const trap of game.traps) {
      if (trap.dead) continue;
      trap.elapsed += dt;
      if (trap.elapsed >= trap.duration) { trap.dead = true; continue; }
      if (!trap.armed) continue;
      const hit = Effects.getEnemiesInRadius(game, trap.x, trap.y, trap.radius)[0];
      if (hit) { Effects.triggerTrap(game, trap, hit); continue; }
      if (trap.triggersOnProjectile) {
        const proj = game.projectiles.find(pr => pr.owner === 'player' && !pr.dead && Effects.dist(pr.x, pr.y, trap.x, trap.y) <= trap.radius);
        if (proj) { proj.dead = true; Effects.triggerTrap(game, trap, null); }
      }
    }
    game.traps = game.traps.filter(t => !t.dead);
  },

  updatePlayer(game, dt) {
    const p = game.player;
    p.iframes = Math.max(0, p.iframes - dt);
    p.hitFlashTimer = Math.max(0, p.hitFlashTimer - dt);
    p.attackAnimTimer = Math.max(0, p.attackAnimTimer - dt);
    p.timeSinceLastDash += dt;
    p.speedBuffTimer = Math.max(0, p.speedBuffTimer - dt);
    p.phasingTimer = Math.max(0, p.phasingTimer - dt);
    if (p.shieldExpireAt && game.time > p.shieldExpireAt) { p.shield = 0; p.shieldExpireAt = 0; }
    this.applyMapFeatures(game, p, dt, true);

    if (p.orbitLock && p.orbitLock.timer > 0) {
      const lock = p.orbitLock;
      const target = game.enemies.find(e => e.id === lock.targetId && !e.dead);
      lock.timer -= dt;
      if (!target || lock.timer <= 0) { p.orbitLock = null; }
      else {
        lock.angle += lock.speed * dt;
        const pos = resolveObstacleCollisions(game.map, target.x + Math.cos(lock.angle) * lock.radius, target.y + Math.sin(lock.angle) * lock.radius, p.radius);
        p.x = pos.x; p.y = pos.y;
      }
      const dx = game.input.mouseWorld.x - p.x, dy = game.input.mouseWorld.y - p.y;
      if (Math.hypot(dx, dy) > 4) p.aimAngle = Math.atan2(dy, dx);
      return;
    }

    if (p.pulledTo) {
      const d = Effects.dist(p.x, p.y, p.pulledTo.x, p.pulledTo.y);
      if (d < 18) { p.pulledTo = null; }
      else {
        const a = angleTo(p.x, p.y, p.pulledTo.x, p.pulledTo.y);
        const pos = resolveObstacleCollisions(game.map, p.x + Math.cos(a) * p.pulledTo.speed * dt, p.y + Math.sin(a) * p.pulledTo.speed * dt, p.radius);
        p.x = pos.x; p.y = pos.y;
      }
      const dxp = game.input.mouseWorld.x - p.x, dyp = game.input.mouseWorld.y - p.y;
      if (Math.hypot(dxp, dyp) > 4) p.aimAngle = Math.atan2(dyp, dxp);
      return;
    }

    if (p.isDashing) {
      const nx = p.x + p.dashDir.x * p.dashSpeed * dt;
      const ny = p.y + p.dashDir.y * p.dashSpeed * dt;
      const pos = p.phasingTimer > 0 ? { x: clamp(nx, p.radius, game.map.width - p.radius), y: clamp(ny, p.radius, game.map.height - p.radius) } : resolveObstacleCollisions(game.map, nx, ny, p.radius);
      p.x = pos.x; p.y = pos.y;
      if (p.dashContactDamage) {
        for (const e of Effects.getEnemiesInRadius(game, p.x, p.y, p.radius + 26)) {
          if (p.dashHitSet.has(e.id)) continue;
          p.dashHitSet.add(e.id);
          let dmg = p.dashContactDamage.damage;
          if (p.nextCollisionBonus) { dmg += p.nextCollisionBonus.damage; Effects.explosionAt(game, { x: e.x, y: e.y, radius: p.nextCollisionBonus.radius, damage: 0, tags: [TAGS.CORPS_A_CORPS], color: '#ffcf5c', source: 'collision' }); p.nextCollisionBonus = null; }
          Effects.damageEnemy(game, e, dmg, { tags: p.dashContactDamage.tags, source: p.dashContactDamage.source });
          Effects.knockback(e, p.x, p.y, p.dashContactDamage.knockback);
        }
      }
    } else {
      p.dashContactDamage = null;
      const mv = game.input.moveVec();
      let speed = p.baseSpeed;
      if (game.time < p.speedDebuffUntil) speed *= 0.55;
      if (p.speedBuffTimer > 0) speed *= p.speedBuffMult;
      speed *= p._zoneSpeedMult;
      const nx = p.x + mv.x * speed * dt, ny = p.y + mv.y * speed * dt;
      const pos = p.phasingTimer > 0 ? { x: clamp(nx, p.radius, game.map.width - p.radius), y: clamp(ny, p.radius, game.map.height - p.radius) } : resolveObstacleCollisions(game.map, nx, ny, p.radius);
      p.x = pos.x; p.y = pos.y;
      if (mv.x || mv.y) { p.momentum = Math.min(100, p.momentum + dt * 40); p.stillTime = 0; }
      else p.stillTime = (p.stillTime || 0) + dt;
    }

    const dx = game.input.mouseWorld.x - p.x, dy = game.input.mouseWorld.y - p.y;
    if (Math.hypot(dx, dy) > 4) p.aimAngle = Math.atan2(dy, dx);
  },

  updateProjectiles(game, dt) {
    for (const proj of game.projectiles) {
      if (proj.dead) continue;
      proj.life -= dt;
      if (proj.life <= 0) { proj.dead = true; continue; }

      if (proj.behavior === 'boomerang') {
        proj.traveled += Math.hypot(proj.vx, proj.vy) * dt;
        if (!proj.returning && proj.traveled >= proj.maxRange) { proj.returning = true; proj.hitEnemies = new Set(); }
        if (proj.returning) {
          const a = angleTo(proj.x, proj.y, game.player.x, game.player.y);
          const spd = Math.hypot(proj.vx, proj.vy);
          proj.vx = Math.cos(a) * spd; proj.vy = Math.sin(a) * spd;
          if (Effects.dist(proj.x, proj.y, game.player.x, game.player.y) < 22) {
            if (proj.onCatch) proj.onCatch(game, proj);
            proj.dead = true; continue;
          }
        }
      }

      if (proj.behavior === 'orbit') {
        proj.orbitAngle = (proj.orbitAngle || 0) + (proj.orbitSpeed || 3) * dt;
        proj.x = game.player.x + Math.cos(proj.orbitAngle) * proj.orbitRadius;
        proj.y = game.player.y + Math.sin(proj.orbitAngle) * proj.orbitRadius;
        proj._reclearTimer = (proj._reclearTimer || 0) - dt;
        if (proj._reclearTimer <= 0) { proj._reclearTimer = 0.5; proj.hitEnemies = new Set(); }
      } else if (proj.planted) {
        // immobile, planté dans un mur/ennemi (Crochet inversé) : ne bouge plus tant que vivant
      } else {
        if (proj.tethered) {
          // Fil : le déplacement du joueur au moment du vol courbe la trajectoire.
          const mv = game.input.moveVec();
          if (mv.x || mv.y) {
            const speed = Math.hypot(proj.vx, proj.vy);
            const perp = Math.atan2(proj.vy, proj.vx) + Math.PI / 2;
            proj.vx += Math.cos(perp) * mv.x * (proj.curveStrength || 2) * speed * dt;
            proj.vy += Math.sin(perp) * mv.x * (proj.curveStrength || 2) * speed * dt;
            const norm = Math.hypot(proj.vx, proj.vy) || 1;
            proj.vx = proj.vx / norm * speed; proj.vy = proj.vy / norm * speed;
          }
        }
        proj.x += proj.vx * dt; proj.y += proj.vy * dt;
      }

      if (proj.behavior !== 'orbit' && (proj.x < 0 || proj.y < 0 || proj.x > game.map.width || proj.y > game.map.height)) { proj.dead = true; continue; }

      if (proj.behavior !== 'orbit' && !proj.planted && this.hitsObstacle(game.map, proj.x, proj.y, proj.radius)) {
        if (proj.behavior === 'wall_bounce' && proj.wallBounces > 0) {
          proj.wallBounces--;
          const refl = reflectOffObstacles(game.map, proj.x, proj.y, proj.vx, proj.vy);
          proj.vx = refl.vx; proj.vy = refl.vy;
          proj.x += proj.vx * dt; proj.y += proj.vy * dt;
          if (proj.onBounce) proj.onBounce(game, proj);
          const sf = game.specFlags;
          if (sf.geometre) Effects.explosionAt(game, { x: proj.x, y: proj.y, radius: sf.geometre.radius, damage: sf.geometre.damage, tags: [TAGS.PROJECTILE], color: '#cfe0ff', source: 'geometre' });
          if (sf.ricochetSpec) proj.__ricochetBonus = (proj.__ricochetBonus || 0) + sf.ricochetSpec.bonusDamage;
        } else if (proj.behavior === 'plant_on_wall') {
          proj.planted = true; proj.vx = 0; proj.vy = 0;
          if (proj.onPlant) proj.onPlant(game, proj);
        } else {
          proj.dead = true; continue;
        }
      }

      if (proj.owner === 'player') {
        for (const e of Effects.getEnemiesInRadius(game, proj.x, proj.y, proj.radius)) {
          if (proj.hitEnemies.has(e.id)) continue;
          proj.hitEnemies.add(e.id);
          game._castMult = proj.castMult;
          if (proj.onHit) proj.onHit(game, proj, e);
          if (proj.__ricochetBonus) { Effects.damageEnemy(game, e, proj.__ricochetBonus, { tags: [TAGS.PROJECTILE], source: 'ricochet_spec', noProc: true }); proj.__ricochetBonus = 0; }
          game._castMult = 1;
          game.particles.push(...Effects.burstParticles(proj.x, proj.y, proj.color || '#fff', 5));

          if (proj.behavior === 'ricochet') {
            const next = Effects.getEnemiesInRadius(game, proj.x, proj.y, proj.bounceRange).find(o => !proj.hitEnemies.has(o.id));
            if (next && proj.bouncesLeft > 0) {
              proj.bouncesLeft--;
              const a = angleTo(proj.x, proj.y, next.x, next.y);
              const spd = Math.hypot(proj.vx, proj.vy);
              proj.vx = Math.cos(a) * spd; proj.vy = Math.sin(a) * spd;
            } else proj.dead = true;
          } else if (proj.behavior === 'boomerang') {
            // continue son trajet, peut retoucher au retour
          } else if (proj.pierce > 0) {
            proj.pierce--;
          } else {
            proj.dead = true;
          }
          if (proj.dead) break;
        }
      } else if (proj.owner === 'enemy') {
        const p = game.player;
        const wall = game.zones.find(z => !z.dead && z.blocksProjectiles && Effects.dist(proj.x, proj.y, z.x, z.y) <= z.radius);
        if (wall) { proj.dead = true; game.particles.push(...Effects.burstParticles(proj.x, proj.y, '#cfe0ff', 4)); continue; }
        const reflector = game.summons.find(s => !s.dead && s.reflects && Effects.dist(proj.x, proj.y, s.x, s.y) <= (s.radius + proj.radius + 6));
        if (reflector) {
          const nearestEnemy = Effects.getNearestEnemy(game, proj.x, proj.y, 500);
          proj.owner = 'player'; proj.hitEnemies = new Set(); proj.color = '#cfe0ff';
          const spd = Math.hypot(proj.vx, proj.vy);
          const a = nearestEnemy ? angleTo(proj.x, proj.y, nearestEnemy.x, nearestEnemy.y) : Math.atan2(proj.vy, proj.vx) + Math.PI;
          proj.vx = Math.cos(a) * spd; proj.vy = Math.sin(a) * spd;
          continue;
        }
        if (p.iframes <= 0 && Effects.dist(proj.x, proj.y, p.x, p.y) <= proj.radius + p.radius) {
          game._castMult = proj.castMult;
          if (proj.onHit) proj.onHit(game, proj, p);
          game._castMult = 1;
          game.particles.push(...Effects.burstParticles(proj.x, proj.y, proj.color || '#fff', 5));
          proj.dead = true;
        }
      }
    }
    game.projectiles = game.projectiles.filter(p => !p.dead);
  },

  hitsObstacle(map, x, y, r) {
    for (const o of map.obstacles) {
      if (o.shape === 'circle') { if (Effects.dist(x, y, o.x, o.y) < r + o.r) return true; }
      else { if (x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h) return true; }
    }
    return false;
  },

  updateZones(game, dt) {
    for (const z of game.zones) {
      if (z.dead) continue;
      if (z.followsPlayer) { z.x = game.player.x; z.y = game.player.y; }
      else if (z.vx || z.vy) { z.x += z.vx * dt; z.y += z.vy * dt; }
      if (z.carrierSummonId) {
        const carrier = game.summons.find(s => s.id === z.carrierSummonId && !s.dead);
        if (carrier) { z.x = carrier.x; z.y = carrier.y; } else z.dead = true;
      }
      z.elapsed += dt;
      if (z.elapsed >= z.duration) { z.dead = true; game.events.emit(EVT.ZONE_DESTROYED, { zone: z }); continue; }
      z.tickTimer -= dt;
      if (z.tickTimer <= 0) {
        z.tickTimer += z.tickInterval;
        if (z.onTick) { game._castMult = z.castMult; z.onTick(game, z); game._castMult = 1; }
      }
    }
    game.zones = game.zones.filter(z => !z.dead);
  },

  updateSummons(game, dt) {
    for (const s of game.summons) {
      if (s.dead) continue;
      s.elapsed += dt;
      if (s.elapsed >= s.duration) { s.dead = true; continue; }
      s.attackTimer -= dt;

      if (s.mode === 'guard') {
        const p = game.player;
        if (Effects.dist(s.x, s.y, p.x, p.y) > 70) {
          const a = angleTo(s.x, s.y, p.x, p.y);
          s.x += Math.cos(a) * s.speed * dt; s.y += Math.sin(a) * s.speed * dt;
        }
        const target = Effects.getNearestEnemy(game, s.x, s.y, s.range);
        if (target && s.attackTimer <= 0) { this.summonHit(game, s, target); s.attackTimer = s.attackCooldown; }
      } else if (s.mode === 'melee') {
        const target = Effects.getNearestEnemy(game, s.x, s.y, 900);
        if (target) {
          const d = Effects.dist(s.x, s.y, target.x, target.y);
          if (d > s.range * 0.8) { const a = angleTo(s.x, s.y, target.x, target.y); s.x += Math.cos(a) * s.speed * dt; s.y += Math.sin(a) * s.speed * dt; }
          else if (s.attackTimer <= 0) { this.summonHit(game, s, target); s.attackTimer = s.attackCooldown; }
        }
      } else if (s.mode === 'turret') {
        if (s.kind === 'clone') { s.x += (game.player.x - 24 - s.x) * Math.min(1, dt * 3); s.y += (game.player.y - s.y) * Math.min(1, dt * 3); }
        const target = Effects.getNearestEnemy(game, s.x, s.y, s.range);
        if (target && s.attackTimer <= 0) {
          const explosive = s.explosive, dmg = s.damage, tags = s.tags, kind = s.kind, castMult = s.castMult;
          Effects.spawnProjectile(game, { x: s.x, y: s.y, angle: angleTo(s.x, s.y, target.x, target.y), speed: 480, radius: 6, color: s.color, tags, castMult,
            onHit: (g, proj, e) => {
              if (explosive) Effects.explosionAt(g, { x: e.x, y: e.y, radius: 55, damage: dmg, tags, color: s.color, source: kind });
              else Effects.damageEnemy(g, e, dmg, { tags, source: kind });
            } });
          s.attackTimer = s.attackCooldown;
        }
      } else if (s.mode === 'trap_layer') {
        if (s.attackTimer <= 0) {
          s.attackTimer = s.attackCooldown;
          const dmg = s.damage, tags = s.tags;
          Effects.placeTrap(game, { x: s.x, y: s.y, radius: 26, duration: 8, color: s.color,
            onTrigger(g, trap, target) { if (target) Effects.damageEnemy(g, target, dmg, { tags, source: 'araignee' }); } });
        }
        const wander = Effects.getNearestEnemy(game, s.x, s.y, 260);
        if (wander) { const d = Effects.dist(s.x, s.y, wander.x, wander.y); if (d > 90) { const a = angleTo(s.x, s.y, wander.x, wander.y); s.x += Math.cos(a) * s.speed * dt; s.y += Math.sin(a) * s.speed * dt; } }
      } else if (s.mode === 'absorber') {
        const proj = game.projectiles.find(pr => pr.owner === 'enemy' && !pr.dead && Effects.dist(pr.x, pr.y, s.x, s.y) <= s.range);
        if (proj) proj.dead = true;
        if (Effects.dist(s.x, s.y, game.player.x, game.player.y) > 90) { const a = angleTo(s.x, s.y, game.player.x, game.player.y); s.x += Math.cos(a) * s.speed * dt; s.y += Math.sin(a) * s.speed * dt; }
      } else if (s.mode === 'leech') {
        const target = game.enemies.find(e => e.id === s.leechTargetId && !e.dead) || Effects.getNearestEnemy(game, s.x, s.y, 400);
        if (target) {
          s.leechTargetId = target.id;
          const a = angleTo(s.x, s.y, target.x, target.y);
          if (Effects.dist(s.x, s.y, target.x, target.y) > target.radius + 20) { s.x += Math.cos(a) * s.speed * dt; s.y += Math.sin(a) * s.speed * dt; }
          else if (s.attackTimer <= 0) { this.summonHit(game, s, target); s.attackTimer = s.attackCooldown; }
        }
      }
    }
  },

  summonHit(game, summon, target) {
    game._castMult = summon.castMult;
    Effects.damageEnemy(game, target, summon.damage, { tags: summon.tags, source: summon.kind });
    game._castMult = 1;
  },

  updatePickups(game, dt) {
    const p = game.player;
    game.pickups = game.pickups.filter(pk => {
      if (Effects.dist(p.x, p.y, pk.x, pk.y) <= pk.radius + p.radius) {
        if (pk.kind === 'heal') Effects.heal(game, pk.amount);
        return false;
      }
      return true;
    });
  },

  trimTransients(game, dt) {
    for (const t of game.floatingTexts) { t.life -= dt; t.y += (t.vy || -30) * dt; }
    game.floatingTexts = game.floatingTexts.filter(t => t.life > 0);
    for (const t of game.telegraphs) t.time -= dt;
    game.telegraphs = game.telegraphs.filter(t => t.time > 0);
    for (const c of game.chainVisuals) c.life -= dt;
    game.chainVisuals = game.chainVisuals.filter(c => c.life > 0);
    for (const pt of game.particles) { pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += pt.gravity * dt; }
    game.particles = game.particles.filter(pt => pt.life > 0);
    for (const c of game.corpses) c.timer -= dt;
    game.corpses = game.corpses.filter(c => c.timer > 0);
  },
};
