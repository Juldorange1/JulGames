// Système de collision centralisé. Toutes les paires de collision du jeu
// passent par ces fonctions — aucune résolution ad-hoc ailleurs dans le code.
const Collision = {
  circleCircle(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distSq = dx * dx + dy * dy;
    const r = a.radius + b.radius;
    return distSq <= r * r;
  },

  circleRect(circle, rect) {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    return (dx * dx + dy * dy) <= circle.radius * circle.radius;
  },

  // Repousse un cercle hors d'un rectangle (murs). Modifie circle.x/y en place.
  resolveCircleRect(circle, rect) {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    let dx = circle.x - closestX;
    let dy = circle.y - closestY;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) {
      // Centre du cercle exactement sur le rectangle : pousse vers le bord le plus proche.
      const distances = [
        { d: circle.x - rect.x, nx: -1, ny: 0 },
        { d: (rect.x + rect.width) - circle.x, nx: 1, ny: 0 },
        { d: circle.y - rect.y, nx: 0, ny: -1 },
        { d: (rect.y + rect.height) - circle.y, nx: 0, ny: 1 },
      ].sort((p, q) => p.d - q.d)[0];
      circle.x += distances.nx * circle.radius;
      circle.y += distances.ny * circle.radius;
      return;
    }

    const overlap = circle.radius - dist;
    if (overlap > 0) {
      dx /= dist;
      dy /= dist;
      circle.x += dx * overlap;
      circle.y += dy * overlap;
    }
  },

  resolveCircleWalls(circle, walls) {
    for (const wall of walls) {
      if (this.circleRect(circle, wall)) {
        this.resolveCircleRect(circle, wall);
      }
    }
  },

  pointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  },
};
