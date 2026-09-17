// Comportement des ennemis, un cas par archétype (via enemy.behavior venant de
// data/enemies.js). Appelé chaque frame par core/combat.js.
const EnemyAI = {
  update(game, enemy, dt) {
    if (enemy.dead) return;
    enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
    enemy.attackAnimTimer = Math.max(0, enemy.attackAnimTimer - dt);
    enemy.frenzyTimer = Math.max(0, (enemy.frenzyTimer || 0) - dt);
    if (isFrozen(enemy)) { enemy.attackTimer -= dt; return; }

    if (enemy.forcedTimer > 0) {
      enemy.forcedTimer -= dt;
      const a = angleTo(enemy.x, enemy.y, enemy.forcedTargetX, enemy.forcedTargetY);
      enemy.x += Math.cos(a) * enemy.forcedSpeed * dt;
      enemy.y += Math.sin(a) * enemy.forcedSpeed * dt;
      const pos = resolveObstacleCollisions(game.map, enemy.x, enemy.y, enemy.radius);
      enemy.x = pos.x; enemy.y = pos.y;
      return;
    }

    const kind = enemy.behavior.behavior;
    const fn = this.handlers[kind] || this.handlers.melee_slow;
    fn.call(this, game, enemy, dt);

    // Recul (knockback) commun à tous les archétypes.
    if (Math.abs(enemy.knockbackX) > 0.5 || Math.abs(enemy.knockbackY) > 0.5) {
      enemy.x += enemy.knockbackX * dt; enemy.y += enemy.knockbackY * dt;
      enemy.knockbackX *= 0.85; enemy.knockbackY *= 0.85;
    }
    if (enemy.behavior.ignoresObstacles) {
      enemy.x = clamp(enemy.x, enemy.radius, game.map.width - enemy.radius);
      enemy.y = clamp(enemy.y, enemy.radius, game.map.height - enemy.radius);
    } else {
      const pos = resolveObstacleCollisions(game.map, enemy.x, enemy.y, enemy.radius);
      enemy.x = pos.x; enemy.y = pos.y;
    }
  },

  moveToward(game, enemy, dt, tx, ty, speedMult = 1) {
    const d = Effects.dist(enemy.x, enemy.y, tx, ty);
    if (d < 2) return d;
    const a = Math.atan2(ty - enemy.y, tx - enemy.x);
    // La direction visée sert au rendu (torse/arme orientés) même en reculant (speedMult < 0).
    enemy.facing = speedMult >= 0 ? a : a + Math.PI;
    const spd = enemy.speed * enemySpeedMultiplier(enemy) * speedMult;
    enemy.x += Math.cos(a) * spd * dt;
    enemy.y += Math.sin(a) * spd * dt;
    return d;
  },

  handlers: {
    melee_slow(game, enemy, dt) {
      const p = game.player;
      const d = this.moveToward(game, enemy, dt, p.x, p.y);
      enemy.attackTimer -= dt;
      if (d <= enemy.attackRange + p.radius && enemy.attackTimer <= 0) {
        Combat.enemyAttackPlayer(game, enemy, enemy.damage);
        enemy.attackTimer = enemy.attackCooldown;
        enemy.attackAnimTimer = 0.2;
      }
    },
    melee_fast(game, enemy, dt) { this.handlers.melee_slow.call(this, game, enemy, dt); },
    pursuer(game, enemy, dt) { this.handlers.melee_slow.call(this, game, enemy, dt); },
    melee_lifesteal(game, enemy, dt) {
      const p = game.player;
      const d = this.moveToward(game, enemy, dt, p.x, p.y);
      enemy.attackTimer -= dt;
      if (d <= enemy.attackRange + p.radius && enemy.attackTimer <= 0) {
        const dealt = Combat.enemyAttackPlayer(game, enemy, enemy.damage);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + dealt * (enemy.behavior.lifesteal || 0));
        enemy.attackTimer = enemy.attackCooldown;
        enemy.attackAnimTimer = 0.2;
      }
    },
    ranged(game, enemy, dt) {
      const p = game.player;
      const d = Effects.dist(enemy.x, enemy.y, p.x, p.y);
      const preferred = enemy.attackRange * 0.7;
      if (d < preferred * 0.7) this.moveToward(game, enemy, dt, p.x, p.y, -0.6);
      else if (d > enemy.attackRange) this.moveToward(game, enemy, dt, p.x, p.y);
      enemy.attackTimer -= dt;
      if (d <= enemy.attackRange && enemy.attackTimer <= 0) {
        Effects.spawnProjectile(game, {
          x: enemy.x, y: enemy.y, angle: angleTo(enemy.x, enemy.y, p.x, p.y), speed: 340, radius: 6, color: '#8fe08f', owner: 'enemy', damage: enemy.damage,
          onHit(g, proj, target) { Combat.enemyAttackPlayer(g, enemy, enemy.damage); },
        });
        enemy.attackTimer = enemy.attackCooldown;
        enemy.attackAnimTimer = 0.2;
      }
    },
    ranged_zone(game, enemy, dt) {
      const p = game.player;
      const d = Effects.dist(enemy.x, enemy.y, p.x, p.y);
      if (d < enemy.attackRange * 0.5) this.moveToward(game, enemy, dt, p.x, p.y, -0.5);
      else if (d > enemy.attackRange) this.moveToward(game, enemy, dt, p.x, p.y);
      enemy.attackTimer -= dt;
      if (d <= enemy.attackRange && enemy.attackTimer <= 0) {
        const tx = p.x, ty = p.y;
        game.telegraphs.push({ x: tx, y: ty, radius: 55, time: 0.7, maxTime: 0.7, color: '#c084fc' });
        game.schedule(0.7, () => {
          if (Effects.dist(game.player.x, game.player.y, tx, ty) <= 55) Combat.enemyAttackPlayer(game, enemy, enemy.damage * 1.3);
        });
        enemy.attackTimer = enemy.attackCooldown;
        enemy.attackAnimTimer = 0.2;
      }
    },
    ranged_debuff(game, enemy, dt) {
      const p = game.player;
      const d = Effects.dist(enemy.x, enemy.y, p.x, p.y);
      if (d < enemy.attackRange * 0.6) this.moveToward(game, enemy, dt, p.x, p.y, -0.5);
      else if (d > enemy.attackRange) this.moveToward(game, enemy, dt, p.x, p.y);
      enemy.attackTimer -= dt;
      if (d <= enemy.attackRange && enemy.attackTimer <= 0) {
        Effects.spawnProjectile(game, {
          x: enemy.x, y: enemy.y, angle: angleTo(enemy.x, enemy.y, p.x, p.y), speed: 300, radius: 6, color: '#c084fc', owner: 'enemy',
          onHit(g, proj, target) {
            Combat.enemyAttackPlayer(g, enemy, enemy.damage * 0.6);
            g.player.speedDebuffUntil = g.time + 2.2;
          },
        });
        enemy.attackTimer = enemy.attackCooldown;
        enemy.attackAnimTimer = 0.2;
      }
    },
    support_shield(game, enemy, dt) {
      const p = game.player;
      const d = this.moveToward(game, enemy, dt, p.x, p.y, 0.6);
      enemy.attackTimer -= dt;
      if (d <= enemy.attackRange + p.radius && enemy.attackTimer <= 0) {
        Combat.enemyAttackPlayer(game, enemy, enemy.damage);
        enemy.attackTimer = enemy.attackCooldown;
        enemy.attackAnimTimer = 0.2;
      }
    },
    suicide(game, enemy, dt) {
      const p = game.player;
      const d = this.moveToward(game, enemy, dt, p.x, p.y, 1.15);
      if (d <= (enemy.behavior.explodeRadius || 70)) {
        enemy.dead = true;
        game.events.emit(EVT.ENEMY_KILLED, { enemy, tags: [], silent: true });
        Combat.enemyAttackPlayer(game, enemy, enemy.damage);
        game.particles.push(...Effects.burstParticles(enemy.x, enemy.y, '#e74c3c', 18));
      }
    },
    summoner(game, enemy, dt) {
      const p = game.player;
      const d = Effects.dist(enemy.x, enemy.y, p.x, p.y);
      if (d < enemy.attackRange * 0.6) this.moveToward(game, enemy, dt, p.x, p.y, -0.4);
      else if (d > enemy.attackRange) this.moveToward(game, enemy, dt, p.x, p.y, 0.5);
      enemy.attackTimer -= dt;
      if (d <= enemy.attackRange && enemy.attackTimer <= 0 && game.enemies.length < game.enemySpawnCap) {
        EnemySpawner.spawnAt(game, 'essaim', enemy.x + (Math.random() - 0.5) * 60, enemy.y + (Math.random() - 0.5) * 60, 0.7);
        enemy.attackTimer = enemy.attackCooldown;
        enemy.attackAnimTimer = 0.2;
      }
    },

    // Ne bouge jamais : oriente son "regard" vers le joueur et tire dès qu'il est
    // en portée. Vulnérable si on l'approche — c'est le compromis de l'immobilité.
    stationary_ranged(game, enemy, dt) {
      const p = game.player;
      const d = Effects.dist(enemy.x, enemy.y, p.x, p.y);
      enemy.facing = angleTo(enemy.x, enemy.y, p.x, p.y);
      enemy.attackTimer -= dt;
      if (d <= enemy.attackRange && enemy.attackTimer <= 0) {
        Effects.spawnProjectile(game, {
          x: enemy.x, y: enemy.y, angle: enemy.facing, speed: 380, radius: 6.5, color: '#9fb4d8', owner: 'enemy',
          onHit(g, proj, target) { Combat.enemyAttackPlayer(g, enemy, enemy.damage); },
        });
        enemy.attackTimer = enemy.attackCooldown;
        enemy.attackAnimTimer = 0.2;
      }
    },

    // Ne bouge jamais : bombarde la position du joueur avec un tir en cloche
    // télégraphié (zone au sol prévenant avant l'impact).
    stationary_zone(game, enemy, dt) {
      const p = game.player;
      const d = Effects.dist(enemy.x, enemy.y, p.x, p.y);
      enemy.facing = angleTo(enemy.x, enemy.y, p.x, p.y);
      enemy.attackTimer -= dt;
      if (d <= enemy.attackRange && enemy.attackTimer <= 0) {
        const tx = p.x, ty = p.y, radius = enemy.behavior.blastRadius || 70, delay = enemy.behavior.telegraphTime || 0.9;
        game.telegraphs.push({ x: tx, y: ty, radius, time: delay, maxTime: delay, color: '#e0a05a' });
        game.schedule(delay, () => {
          if (Effects.dist(game.player.x, game.player.y, tx, ty) <= radius) Combat.enemyAttackPlayer(game, enemy, enemy.damage);
        });
        enemy.attackTimer = enemy.attackCooldown;
        enemy.attackAnimTimer = 0.2;
      }
    },

    // Se déplace et laisse une traînée toxique persistante derrière lui.
    trail(game, enemy, dt) {
      const p = game.player;
      const d = this.moveToward(game, enemy, dt, p.x, p.y);
      enemy.attackTimer -= dt;
      if (d <= enemy.attackRange + p.radius && enemy.attackTimer <= 0) {
        Combat.enemyAttackPlayer(game, enemy, enemy.damage);
        enemy.attackTimer = enemy.attackCooldown;
        enemy.attackAnimTimer = 0.2;
      }
      enemy._trailTimer = (enemy._trailTimer || 0) - dt;
      if (enemy._trailTimer <= 0) {
        enemy._trailTimer = enemy.behavior.trailInterval;
        const dps = enemy.behavior.trailDps * ENEMY_DAMAGE_MULT, ex = enemy.x, ey = enemy.y;
        Effects.createZone(game, {
          x: ex, y: ey, radius: enemy.behavior.trailRadius, duration: enemy.behavior.trailDuration, tickInterval: 0.4,
          tags: [TAGS.POISON], color: 'rgba(90,194,106,.28)',
          onTick(g, zone) {
            if (Effects.dist(g.player.x, g.player.y, zone.x, zone.y) <= zone.radius) g.player.takeDamage(g, dps * zone.tickInterval, { source: 'suintant' });
          },
        });
      }
    },

    // Se déplace comme un poursuivant classique mais ignore les obstacles (voir
    // EnemyAI.update) : impossible de le semer derrière un mur.
    phasing(game, enemy, dt) { this.handlers.melee_fast.call(this, game, enemy, dt); },
  },
};
