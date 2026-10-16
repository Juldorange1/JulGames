// Projectile générique. `owner` vaut 'player' ou 'turret' pour savoir qui il touche.
class Projectile {
  constructor({ x, y, dirX, dirY, speed, radius, owner, baseDamage, maxBounces = 0, color }) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.speed = speed;
    this.radius = radius;
    this.owner = owner;
    this.baseDamage = baseDamage;
    this.bounces = 0;
    this.maxBounces = maxBounces;
    this.color = color || (owner === 'player' ? '#6bd7ff' : '#ff5d5d');
    this.dead = false;
  }

  update(dt, room) {
    this.x += this.dirX * this.speed * dt;
    this.y += this.dirY * this.speed * dt;

    if (!Collision.pointInRect(this.x, this.y, room.bounds)) {
      this.dead = true;
      return;
    }

    for (const wall of room.walls) {
      if (Collision.circleRect(this, wall)) {
        if (this.maxBounces > 0 && this.bounces < this.maxBounces) {
          this._bounceOffRect(wall);
          this.bounces += 1;
          this.baseDamage *= 1.15; // chaque rebond augmente les dégâts
        } else {
          this.dead = true;
          return;
        }
      }
    }
  }

  _bounceOffRect(rect) {
    const closestX = Math.max(rect.x, Math.min(this.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(this.y, rect.y + rect.height));
    const overlapX = Math.abs(this.x - closestX);
    const overlapY = Math.abs(this.y - closestY);
    if (overlapX < overlapY) {
      this.dirX *= -1;
    } else {
      this.dirY *= -1;
    }
  }

  draw(ctx, camera) {
    const s = camera.worldToScreen(this.x, this.y);
    ctx.beginPath();
    ctx.arc(s.x, s.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}
