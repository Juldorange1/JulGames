// Base générique pour toute tourelle. Les types concrets (projectile, laser,
// radial, rail, area, directional, custom) héritent de cette classe et
// n'implémentent que `update`/`draw`/`fire`. Ne jamais coder de logique de
// tourelle spécifique ailleurs que dans une sous-classe.
class Turret {
  constructor({ x, y, radius = 16, fireInterval, telegraphMs = 400, hp = Infinity }) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.fireInterval = fireInterval;
    this.telegraphMs = telegraphMs;
    this.cooldown = fireInterval;
    this.telegraphing = false;
    this.telegraphRemaining = 0;
    this.maxHp = hp;
    this.hp = hp;
    this.dead = false;
    this.hitFlashMs = 0;
  }

  takeDamage(amount) {
    if (this.maxHp === Infinity) return;
    this.hp -= amount;
    this.hitFlashMs = 120;
    if (this.hp <= 0) this.dead = true;
  }

  fire(room) {
    // À surcharger par les sous-classes.
  }

  update(dt, room) {
    if (this.hitFlashMs > 0) this.hitFlashMs -= dt * 1000;
    this._updateFire(dt, room);
  }

  _updateFire(dt, room) {
    if (this.telegraphing) {
      this.telegraphRemaining -= dt * 1000;
      if (this.telegraphRemaining <= 0) {
        this.telegraphing = false;
        this.fire(room);
        this.cooldown = this.fireInterval;
      }
      return;
    }

    this.cooldown -= dt * 1000;
    if (this.cooldown <= 0) {
      this.telegraphing = true;
      this.telegraphRemaining = this.telegraphMs;
    }
  }

  draw(ctx, camera) {
    const s = camera.worldToScreen(this.x, this.y);
    ctx.beginPath();
    ctx.arc(s.x, s.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.hitFlashMs > 0 ? '#ffffff' : '#4a4f63';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.telegraphing ? '#ff5d5d' : '#8a90ab';
    ctx.stroke();

    if (this.telegraphing) {
      const t = 1 - this.telegraphRemaining / this.telegraphMs;
      ctx.beginPath();
      ctx.arc(s.x, s.y, this.radius + 4 + t * 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 93, 93, ${0.8 - t * 0.6})`;
      ctx.stroke();
    }

    if (this.maxHp !== Infinity) {
      const w = this.radius * 2;
      const hpRatio = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(s.x - w / 2, s.y - this.radius - 10, w, 4);
      ctx.fillStyle = '#6bffb0';
      ctx.fillRect(s.x - w / 2, s.y - this.radius - 10, w * hpRatio, 4);
    }
  }
}

// Tourelle simple : tire un projectile vers la position du joueur au moment du tir
// (télégraphié avant l'impact pour rester lisible).
class ProjectileTurret extends Turret {
  constructor(opts) {
    super({ fireInterval: 1600, telegraphMs: 450, ...opts });
    this.damagePct = opts.damagePct ?? 0.12;
    this.projectileSpeed = opts.projectileSpeed ?? 260;
  }

  fire(room) {
    const player = room.player;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    room.spawnProjectile(new Projectile({
      x: this.x,
      y: this.y,
      dirX: dx / dist,
      dirY: dy / dist,
      speed: this.projectileSpeed,
      radius: 6,
      owner: 'turret',
      baseDamage: this.damagePct,
    }));
  }
}
