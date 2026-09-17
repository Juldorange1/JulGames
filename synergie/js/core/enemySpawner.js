// Choisit la composition d'ennemis pour un combat (sous-ensemble aléatoire du pool
// disponible à cette difficulté) et les fait apparaître sur la carte.
const EnemySpawner = {
  spawnAt(game, archetypeId, x, y, statMult = 1) {
    const def = ENEMY_ARCHETYPES[archetypeId];
    const cfg = game.diffCfg;
    const stats = {
      hp: Math.round(def.hp * cfg.hpMult * statMult),
      speed: def.speed * ENEMY_ACTION_SPEED_MULT,
      damage: Math.round(def.damage * cfg.dmgMult * statMult * ENEMY_DAMAGE_MULT),
      attackRange: def.attackRange,
      attackCooldown: def.attackCooldown / ENEMY_ACTION_SPEED_MULT,
      radius: def.radius,
      color: def.color,
      tags: [],
      behavior: def,
      xpValue: def.xpValue,
    };
    const e = new Enemy(archetypeId, x, y, stats);
    game.enemies.push(e);
    return e;
  },

  startCombat(game) {
    const cfg = game.diffCfg;
    const types = pickRandom(cfg.pool, Math.min(cfg.typesPerFight, cfg.pool.length));
    const count = cfg.countBase + Math.floor(Math.random() * cfg.countVariance);
    game.enemySpawnCap = count + 12;
    const cx = game.map.width / 2, cy = game.map.height / 2;
    for (let i = 0; i < count; i++) {
      const archetype = types[Math.floor(Math.random() * types.length)];
      let x, y, tries = 0;
      do {
        const a = Math.random() * Math.PI * 2;
        const r = 260 + Math.random() * (Math.min(game.map.width, game.map.height) / 2 - 260);
        x = clamp(cx + Math.cos(a) * r, 40, game.map.width - 40);
        y = clamp(cy + Math.sin(a) * r, 40, game.map.height - 40);
        tries++;
      } while (Effects.dist(x, y, cx, cy) < 220 && tries < 10);
      this.spawnAt(game, archetype, x, y);
    }
  },
};
