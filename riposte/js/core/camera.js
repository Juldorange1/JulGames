// Caméra top-down : suit une cible, reste dans les bornes de la salle.
class Camera {
  constructor(viewWidth, viewHeight) {
    this.x = 0; // coin haut-gauche, coordonnées monde
    this.y = 0;
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.followLerp = 8; // vitesse de rattrapage (par seconde)
  }

  resize(viewWidth, viewHeight) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
  }

  follow(target, room, dt) {
    const desiredX = target.x - this.viewWidth / 2;
    const desiredY = target.y - this.viewHeight / 2;

    const t = Math.min(1, this.followLerp * dt);
    this.x += (desiredX - this.x) * t;
    this.y += (desiredY - this.y) * t;

    // Clamp aux bornes de la salle (si la salle est plus grande que la vue).
    const maxX = Math.max(room.bounds.x, room.bounds.x + room.bounds.width - this.viewWidth);
    const maxY = Math.max(room.bounds.y, room.bounds.y + room.bounds.height - this.viewHeight);
    this.x = Math.min(Math.max(this.x, room.bounds.x), maxX);
    this.y = Math.min(Math.max(this.y, room.bounds.y), maxY);
  }

  worldToScreen(x, y) {
    return { x: x - this.x, y: y - this.y };
  }

  screenToWorld(x, y) {
    return { x: x + this.x, y: y + this.y };
  }
}
