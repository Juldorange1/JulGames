// Collision précise entre le joueur (cercle) et le couloir (colonnes verticales).
function checkPlayerCollision(player, levelGen, reflexMargin) {
  const margin = COLLISION_MARGIN + (reflexMargin || 0);
  const leftEdge = player.x - PLAYER_RADIUS;
  const rightEdge = player.x + PLAYER_RADIUS;
  const cols = levelGen.getColumnsInRange(leftEdge, rightEdge);
  for (const col of cols) {
    const top = col.top + margin;
    const bottom = col.bottom - margin;
    if (player.y - PLAYER_RADIUS < top || player.y + PLAYER_RADIUS > bottom) {
      return true;
    }
  }
  return false;
}
