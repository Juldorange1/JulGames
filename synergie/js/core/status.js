// Système générique d'altérations d'état. Une seule implémentation gère burn / poison /
// bleed / shock / freeze / slow / mark — les compétences et spécificités ne font
// qu'appeler applyStatusToEnemy() avec des paramètres différents.
const STATUS_DEFS = {
  burn:    { label: 'Brûlure',  color: '#ff6b4a', dot: true,  tickInterval: 0.5 },
  poison:  { label: 'Poison',   color: '#8bd450', dot: true,  tickInterval: 0.5, ramping: true },
  bleed:   { label: 'Saignement', color: '#e0405f', dot: true, tickInterval: 0.6, stacking: true, burstThreshold: 6, burstDamageMult: 2.2 },
  shock:   { label: 'Surcharge', color: '#f5e042', stacking: true, maxStacks: 3, dischargeDamageMult: 2.4 },
  freeze:  { label: 'Gel',      color: '#5fd4ff', control: true },
  slow:    { label: 'Ralenti',  color: '#8fd6ff' },
  mark:    { label: 'Marqué',   color: '#ffb454' },
  proie:   { label: 'Proie',    color: '#ff8fa3' },
  parasited: { label: 'Parasité', color: '#c084fc' },
};

function ensureStatusBag(entity) {
  if (!entity.statuses) entity.statuses = {};
  return entity.statuses;
}

function getStatus(entity, type) {
  return entity.statuses ? entity.statuses[type] : null;
}

function getStatusStacks(entity, type) {
  const s = getStatus(entity, type);
  return s ? (s.stacks || 1) : 0;
}

function hasStatus(entity, type) {
  return !!getStatus(entity, type);
}

function countDistinctStatuses(entity) {
  return entity.statuses ? Object.keys(entity.statuses).length : 0;
}

function clearStatus(entity, type) {
  if (entity.statuses) delete entity.statuses[type];
}

// opts: { stacks=1, duration, value, source }
function applyStatusToEnemy(game, enemy, type, opts = {}) {
  if (enemy.dead) return;
  const def = STATUS_DEFS[type];
  if (!def) return;
  const bag = ensureStatusBag(enemy);
  const addStacks = opts.stacks || 1;
  const duration = opts.duration != null ? opts.duration : 3;
  const value = opts.value || 0;

  let existing = bag[type];
  const isNew = !existing;
  if (!existing) {
    existing = bag[type] = { stacks: 0, duration: 0, maxDuration: duration, value: 0, tickTimer: 0 };
  }

  if (def.stacking) {
    existing.stacks = Math.min((existing.stacks || 0) + addStacks, def.maxStacks || 99);
  } else {
    existing.stacks = 1;
  }
  existing.value = def.dot ? existing.value + value : Math.max(existing.value, value);
  existing.duration = Math.max(existing.duration, duration);
  existing.maxDuration = Math.max(existing.maxDuration || 0, duration);
  existing.source = opts.source || existing.source;

  game.events.emit(EVT.ENEMY_STATUS_CHANGED, { enemy, type, stacks: existing.stacks });
  if (isNew) {
    if (type === 'burn') game.events.emit(EVT.ENEMY_BURNED, { enemy });
    if (type === 'freeze') game.events.emit(EVT.ENEMY_FROZEN, { enemy });
    if (type === 'poison') game.events.emit(EVT.ENEMY_POISONED, { enemy });
    if (type === 'bleed') game.events.emit(EVT.ENEMY_BLEEDING, { enemy });
    if (type === 'shock') game.events.emit(EVT.ENEMY_SHOCKED, { enemy });
    if (type === 'mark' || type === 'proie') game.events.emit(EVT.ENEMY_MARKED, { enemy });
  }

  // Surcharge électrique : à charge max, décharge immédiate.
  if (type === 'shock' && existing.stacks >= (def.maxStacks || 3)) {
    const dmg = Math.max(6, existing.value) * def.dischargeDamageMult;
    clearStatus(enemy, 'shock');
    Effects.explosionAt(game, { x: enemy.x, y: enemy.y, radius: 70, damage: dmg, tags: [TAGS.ELECTRIQUE], color: '#f5e042', source: opts.source });
  }
  // Hémorragie : au seuil de charges de saignement, forte perte de PV immédiate.
  if (type === 'bleed' && existing.stacks >= (def.burstThreshold || 6)) {
    const dmg = Math.max(4, existing.value) * def.burstDamageMult;
    existing.stacks = Math.floor(existing.stacks / 2);
    Effects.damageEnemy(game, enemy, dmg, { tags: [TAGS.SANG], source: opts.source, noProc: true });
  }

  return existing;
}

// Avance toutes les altérations d'un ennemi d'un pas de temps dt (secondes).
function tickEnemyStatuses(game, enemy, dt) {
  if (!enemy.statuses) return;
  for (const type of Object.keys(enemy.statuses)) {
    const s = enemy.statuses[type];
    const def = STATUS_DEFS[type];
    s.duration -= dt;
    if (def.dot) {
      s.tickTimer -= dt;
      if (s.tickTimer <= 0) {
        s.tickTimer += def.tickInterval;
        let dps = s.value;
        if (def.ramping) {
          // Venin rampant (spécificité/compétence) : le poison s'intensifie avec le temps.
          const elapsed = s.maxDuration - Math.max(s.duration, 0);
          dps *= 1 + Math.min(elapsed / 4, 1.5);
        }
        const dmg = dps * def.tickInterval;
        Effects.damageEnemy(game, enemy, dmg, { tags: [type === 'burn' ? TAGS.FEU : type === 'poison' ? TAGS.POISON : TAGS.SANG], isDot: true, source: s.source });
      }
    }
    if (s.duration <= 0) {
      delete enemy.statuses[type];
      game.events.emit(EVT.ENEMY_STATUS_CHANGED, { enemy, type, stacks: 0 });
    }
  }

  // Parasite (spécificité) : 3+ altérations différentes -> transmet aux ennemis proches.
  if (game.specFlags && game.specFlags.parasite && countDistinctStatuses(enemy) >= 3 && !enemy.statuses.parasited) {
    applyStatusToEnemy(game, enemy, 'parasited', { duration: 4 });
    for (const other of Effects.getEnemiesInRadius(game, enemy.x, enemy.y, 110)) {
      if (other === enemy) continue;
      for (const type of Object.keys(enemy.statuses)) {
        if (type === 'parasited') continue;
        const src = enemy.statuses[type];
        applyStatusToEnemy(game, other, type, { stacks: 1, duration: src.duration * 0.6, value: src.value * 0.5, source: src.source });
      }
    }
  }
}

function isFrozen(enemy) { return hasStatus(enemy, 'freeze'); }

function enemySpeedMultiplier(enemy) {
  if (isFrozen(enemy)) return 0;
  let mult = enemy._zoneSpeedMult != null ? enemy._zoneSpeedMult : 1;
  if (hasStatus(enemy, 'slow')) mult *= 0.45;
  if (enemy.frenzyTimer > 0) mult *= enemy.frenzyMult || 1;
  return mult;
}
