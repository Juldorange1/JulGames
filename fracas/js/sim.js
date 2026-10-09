// Un pas de simulation du monde : joueurs, objets de salle, murs mobiles, projectiles, zones,
// ennemis, collisions. C'est LE coeur du gameplay, execute a l'identique par le jeu solo
// (Game.update) et par le serveur multijoueur (un contexte isole par partie).

function stepWorld(world, simDt, realDt) {
  world.tick = (world.tick || 0) + 1;
  if (world.players) {
    for (const p of world.players) {
      if (p.dead || p.absent) continue;
      // Temps propre a chaque joueur : l'acceleration d'Echo (C2) ne concerne que lui en ligne.
      const pdt = simDt * (1 + (p.timeBonus || 0));
      // Compensation de latence (serveur) : les adversaires sont replaces la ou CE joueur les
      // voyait au moment de son action, le temps de traiter ses attaques instantanees.
      const rewind = world.beginLagComp ? world.beginLagComp(world, p) : null;
      world.simSpeedBonus = p.timeBonus || 0;
      updatePlayer(world, p, pdt, realDt);
      p.timeBonus = world.simSpeedBonus || 0;
      world.simSpeedBonus = 0;
      if (rewind) world.endLagComp(world, p, rewind);
    }
  } else if (world.player) {
    updatePlayer(world, world.player, simDt, realDt);
  }
  if (world.room && world.room.parkour) updateParkourObjects(world, simDt);
  updateMovingWalls(world, simDt);
  updateProjectiles(world, simDt);
  updateZones(world, simDt);
  updateWalls(world, simDt);
  updateShields(world, simDt);
  updateWinds(world, simDt);
  updateMeteors(world, simDt);
  updateFrozenTimers(world, simDt);
  for (const e of world.enemies) {
    if (e.kind === 'turret') updateTurret(world, e, simDt);
    else if (e.kind === 'boss') { updateBoss(world, e, simDt); updateBossSpecials(world, e, simDt); }
  }
  updateHazards(world, simDt);
  resolveCollisions(world, simDt, realDt);
  // Elements ancres (cristaux des modes en ligne) : aucune competence ne peut les deplacer.
  for (const e of world.enemies) if (e.anchored) { e.x = e.anchorX; e.y = e.anchorY; }
  if (world.afterStep) world.afterStep(world, simDt, realDt);
}
