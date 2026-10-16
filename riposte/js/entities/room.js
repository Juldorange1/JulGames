// Salle de test unique (étape 1-2). Le générateur d'expédition (étape 4)
// produira des instances de Room à partir de pools de config, sans changer
// cette classe : elle ne fait que porter les bornes/murs/entités/collisions.
class Room {
  constructor() {
    this.bounds = { x: 0, y: 0, width: 1400, height: 900 };
    this.walls = [
      { x: 600, y: 300, width: 40, height: 300 },
      { x: 0, y: 0, width: 1400, height: 20 },
      { x: 0, y: 880, width: 1400, height: 20 },
      { x: 0, y: 0, width: 20, height: 900 },
      { x: 1380, y: 0, width: 20, height: 900 },
    ];

    this.player = new Player(300, 450);
    this.turrets = [
      new ProjectileTurret({ x: 1000, y: 250, hp: 300, damagePct: 0.15 }),
      new ProjectileTurret({ x: 1000, y: 650, hp: 300, damagePct: 0.15, fireInterval: 1200 }),
    ];
    this.projectiles = [];
  }

  spawnProjectile(p) {
    this.projectiles.push(p);
  }

  update(dt, camera, now) {
    this.player.handleInput(dt, this, camera);

    for (const turret of this.turrets) {
      if (turret.dead) continue;
      turret.update(dt, this);
    }
    // Tourelles détruites : retirées mais on ne les remplace pas dans ce prototype d'étape 1.
    this.turrets = this.turrets.filter((t) => !t.dead);

    for (const proj of this.projectiles) {
      proj.update(dt, this);
    }

    this._resolveProjectileHits(now);

    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  _resolveProjectileHits(now) {
    for (const proj of this.projectiles) {
      if (proj.dead) continue;

      if (proj.owner === 'turret' && Collision.circleCircle(proj, this.player)) {
        DamageSystem.applyLoss(this.player, proj.baseDamage, now);
        proj.dead = true;
        continue;
      }

      if (proj.owner === 'player') {
        for (const turret of this.turrets) {
          if (Collision.circleCircle(proj, turret)) {
            turret.takeDamage(proj.baseDamage);
            proj.dead = true;
            break;
          }
        }
      }
    }
  }

  draw(ctx, camera) {
    ctx.fillStyle = '#12141c';
    const topLeft = camera.worldToScreen(this.bounds.x, this.bounds.y);
    ctx.fillRect(topLeft.x, topLeft.y, this.bounds.width, this.bounds.height);

    ctx.fillStyle = '#2a2e3d';
    for (const wall of this.walls) {
      const s = camera.worldToScreen(wall.x, wall.y);
      ctx.fillRect(s.x, s.y, wall.width, wall.height);
    }

    for (const turret of this.turrets) turret.draw(ctx, camera);
    for (const proj of this.projectiles) proj.draw(ctx, camera);
    this.player.draw(ctx, camera);
  }
}
