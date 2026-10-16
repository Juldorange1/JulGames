// Entité joueur : moteur générique. Les 9 personnages (étape 3) viendront
// remplacer/étendre `baseAttack` et les 3 compétences via des données, sans
// toucher au déplacement/collision/dégâts définis ici.
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.speedPxPerSec = 260; // vitesse de référence = 100%
    this.baseAttackDamage = 100;
    this.attackCooldownMs = 260;
    this.attackTimer = 0;

    DamageSystem.init(this);
  }

  handleInput(dt, room, camera) {
    let dx = 0;
    let dy = 0;
    if (Input.isDown('up')) dy -= 1;
    if (Input.isDown('down')) dy += 1;
    if (Input.isDown('left')) dx -= 1;
    if (Input.isDown('right')) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.x += dx * this.speedPxPerSec * dt;
      this.y += dy * this.speedPxPerSec * dt;
    }

    // Reste dans les bornes de la salle.
    const b = room.bounds;
    this.x = Math.min(Math.max(this.x, b.x + this.radius), b.x + b.width - this.radius);
    this.y = Math.min(Math.max(this.y, b.y + this.radius), b.y + b.height - this.radius);

    Collision.resolveCircleWalls(this, room.walls);

    if (this.attackTimer > 0) this.attackTimer -= dt * 1000;
    if (Input.mouseDown && this.attackTimer <= 0) {
      this._fireBaseAttack(room, camera);
      this.attackTimer = this.attackCooldownMs;
    }
  }

  _fireBaseAttack(room, camera) {
    const worldMouse = camera.screenToWorld(Input.mouseScreen.x, Input.mouseScreen.y);
    const dx = worldMouse.x - this.x;
    const dy = worldMouse.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const damage = DamageSystem.computeDamage(this, this.baseAttackDamage);

    room.spawnProjectile(new Projectile({
      x: this.x,
      y: this.y,
      dirX: dx / dist,
      dirY: dy / dist,
      speed: 620,
      radius: 5,
      owner: 'player',
      baseDamage: damage,
    }));
  }

  get attackReadyRatio() {
    return 1 - Math.max(0, this.attackTimer) / this.attackCooldownMs;
  }

  draw(ctx, camera) {
    const s = camera.worldToScreen(this.x, this.y);
    ctx.beginPath();
    ctx.arc(s.x, s.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.invincible ? '#ffd166' : '#6bd7ff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#eef1f8';
    ctx.stroke();

    // Petit indicateur d'orientation vers la souris.
    const worldMouse = camera.screenToWorld(Input.mouseScreen.x, Input.mouseScreen.y);
    const dx = worldMouse.x - this.x;
    const dy = worldMouse.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    ctx.beginPath();
    ctx.moveTo(s.x + (dx / dist) * this.radius, s.y + (dy / dist) * this.radius);
    ctx.lineTo(s.x + (dx / dist) * (this.radius + 10), s.y + (dy / dist) * (this.radius + 10));
    ctx.strokeStyle = '#eef1f8';
    ctx.stroke();
  }
}
