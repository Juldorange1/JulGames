// Bibliothèque d'effets génériques. Chaque compétence est écrite comme une petite
// fonction `cast(ctx)` qui compose ces primitives — c'est ce système générique qui
// porte la logique de jeu, pas 50 implémentations indépendantes.
const Effects = {};

Effects.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

Effects.getEnemiesInRadius = (game, x, y, r) =>
  game.enemies.filter(e => !e.dead && Effects.dist(e.x, e.y, x, y) <= r + e.radius);

Effects.getNearestEnemy = (game, x, y, maxRange = Infinity) => {
  let best = null, bestD = maxRange;
  for (const e of game.enemies) {
    if (e.dead) continue;
    const d = Effects.dist(e.x, e.y, x, y);
    if (d <= bestD) { bestD = d; best = e; }
  }
  return best;
};

// Toutes les compétences à ciblage automatique du joueur visent le curseur : parmi
// les ennemis à portée du joueur (maxRangeFromPlayer), on choisit celui le plus
// proche du curseur plutôt que le plus proche du joueur.
Effects.getTargetedEnemy = (game, maxRangeFromPlayer = Infinity) => {
  const p = game.player, cursor = game.input.mouseWorld;
  let best = null, bestD = Infinity;
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (Effects.dist(e.x, e.y, p.x, p.y) > maxRangeFromPlayer) continue;
    const d = Effects.dist(e.x, e.y, cursor.x, cursor.y);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
};

Effects.rollCrit = (game, baseChance) => {
  const bonus = (game.specFlags.critChanceBonus || 0);
  return Math.random() < (baseChance + bonus);
};

// ---- Multiplicateur de dégâts dépendant de l'ÉTAT DE LA CIBLE (spécificités) ----
Effects.enemyTargetMultiplier = (game, enemy, tags = []) => {
  let mult = 1;
  const sf = game.specFlags;
  if (hasStatus(enemy, 'mark')) mult *= getStatus(enemy, 'mark').value;
  if (hasStatus(enemy, 'proie')) mult *= getStatus(enemy, 'proie').value;
  if (sf.cryogene && hasStatus(enemy, 'freeze')) mult *= sf.cryogene.mult;
  if (sf.opportuniste && enemy.hpRatio() <= sf.opportuniste.threshold) mult *= sf.opportuniste.mult;
  if (sf.corrosif && hasStatus(enemy, 'poison')) mult *= sf.corrosif.mult;
  if (sf.hemomancien && tags.includes(TAGS.SANG) && game.player.hpRatio() <= sf.hemomancien.threshold) mult *= sf.hemomancien.mult;
  if (sf.predateurSolitaire && Effects.getEnemiesInRadius(game, enemy.x, enemy.y, sf.predateurSolitaire.range).length <= 1) mult *= sf.predateurSolitaire.mult;
  return mult;
};

// amount = dégâts déjà mis à l'échelle par la rareté de la compétence appelante.
Effects.damageEnemy = (game, enemy, amount, opts = {}) => {
  if (!enemy || enemy.dead) return 0;
  const tags = opts.tags || [];
  let dmg = amount;
  if (!opts.noProc) {
    dmg *= (game._castMult || 1);
    dmg *= Effects.enemyTargetMultiplier(game, enemy, tags);
    if (opts.allowCrit && Effects.rollCrit(game, opts.critChance || 0.2)) { dmg *= 1.8; opts.isCrit = true; }
  }
  if (enemy.archetype && ENEMY_ARCHETYPES[enemy.archetype].armor) dmg *= (1 - ENEMY_ARCHETYPES[enemy.archetype].armor);
  const guard = game.enemies.find(o => !o.dead && o !== enemy && o.archetype === 'protecteur' && Effects.dist(o.x, o.y, enemy.x, enemy.y) <= (o.behavior.auraRadius || 100));
  if (guard) dmg *= (1 - (guard.behavior.auraReduction || 0));
  dmg = Math.max(0, dmg);
  enemy.hp -= dmg;
  if (dmg > 0) enemy.hitFlashTimer = 0.12;
  game.floatingTexts.push({ x: enemy.x, y: enemy.y - enemy.radius, text: Math.round(dmg).toString(), life: 0.6, color: opts.isCrit ? '#ffd54a' : (opts.isDot ? '#ffb0a0' : '#ffffff'), vy: -40 });

  if (!opts.noProc) game.events.emit(EVT.ENEMY_HIT, { enemy, damage: dmg, tags, isCrit: !!opts.isCrit, source: opts.source, isDot: !!opts.isDot });

  if (enemy.hp <= 0 && !enemy.dead) {
    enemy.dead = true;
    game.events.emit(EVT.ENEMY_KILLED, { enemy, tags });
  }
  // Marquage croisé : une partie des dégâts se répercute sur l'ennemi lié.
  if (!opts._linked && enemy.linkedEnemyId && dmg > 0) {
    const linked = game.enemies.find(o => o.id === enemy.linkedEnemyId && !o.dead);
    if (linked) Effects.damageEnemy(game, linked, dmg * enemy.linkShareRatio, { tags, source: opts.source, noProc: true, _linked: true });
  }
  return dmg;
};

const STATUS_TO_TAG = { burn: TAGS.FEU, poison: TAGS.POISON, bleed: TAGS.SANG, shock: TAGS.ELECTRIQUE, freeze: TAGS.GLACE, mark: TAGS.MARQUE, proie: TAGS.MARQUE };
Effects.applyStatus = (game, enemy, type, opts = {}) => {
  if (!enemy || enemy.dead) return;
  const applied = applyStatusToEnemy(game, enemy, type, opts);
  if (STATUS_TO_TAG[type]) game.lastAppliedStatusElement = STATUS_TO_TAG[type];
  const sf = game.specFlags;
  const spread = sf.spread && sf.spread[type];
  if (spread && !opts._isSpread && (spread.chance == null || Math.random() < spread.chance)) {
    const targets = Effects.getEnemiesInRadius(game, enemy.x, enemy.y, spread.range).filter(e => e !== enemy).slice(0, spread.count);
    for (const t of targets) {
      applyStatusToEnemy(game, t, type, { stacks: Math.max(1, Math.floor((opts.stacks || 1) * 0.6)), duration: (opts.duration || 3) * 0.7, value: (opts.value || 0) * 0.6, source: opts.source, _isSpread: true });
    }
  }
  return applied;
};

// Chaque entité "différée" (projectile/zone/invocation) mémorise le multiplicateur
// de cast en vigueur au moment où elle a été créée : combat.js le réapplique
// temporairement au moment de l'impact/tick, pour que les buffs "prochaine
// compétence" (Danseur, Surcharge...) touchent aussi les effets à retardement.
Effects.spawnProjectile = (game, opts) => {
  const angle = opts.angle;
  const speed = opts.speed || 500;
  const p = new Projectile(Object.assign({
    x: opts.x, y: opts.y,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    castMult: game._castMult || 1,
  }, opts));
  game.projectiles.push(p);
  return p;
};

Effects.spawnProjectileSpread = (game, opts) => {
  const count = opts.count || 3;
  const spreadDeg = opts.spreadDeg != null ? opts.spreadDeg : 30;
  const spreadRad = spreadDeg * Math.PI / 180;
  const start = opts.angle - spreadRad / 2;
  const step = count > 1 ? spreadRad / (count - 1) : 0;
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(Effects.spawnProjectile(game, Object.assign({}, opts, { angle: start + step * i })));
  }
  return out;
};

Effects.spawnProjectileRing = (game, opts) => {
  const count = opts.count || 8;
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(Effects.spawnProjectile(game, Object.assign({}, opts, { angle: (Math.PI * 2 / count) * i })));
  }
  return out;
};

Effects.spawnMeleeArc = (game, opts) => {
  const { x, y, angle, arcDeg = 100, range = 70, damage, tags = [], source, allowCrit } = opts;
  const halfArc = (arcDeg * Math.PI / 180) / 2;
  const hits = [];
  for (const e of Effects.getEnemiesInRadius(game, x, y, range)) {
    const a = Math.atan2(e.y - y, e.x - x);
    let diff = Math.abs(a - angle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff <= halfArc) {
      Effects.damageEnemy(game, e, damage, { tags, source, allowCrit });
      hits.push(e);
      if (opts.knockback) Effects.knockback(e, x, y, opts.knockback);
    }
  }
  return hits;
};

Effects.explosionAt = (game, opts) => {
  const { x, y, radius, tags = [TAGS.EXPLOSION], color = '#ff9d4a', source } = opts;
  let damage = opts.damage;
  const sf = game.specFlags;
  const nearbyCount = Effects.getEnemiesInRadius(game, x, y, radius).length;
  // Meneur de meute : les zones/explosions montent en puissance avec le nombre
  // d'ennemis groupés dedans (récompense d'attirer un paquet plutôt que de disperser).
  if (sf.meneurDeMeute && nearbyCount >= sf.meneurDeMeute.minCount) damage *= sf.meneurDeMeute.mult;
  const hits = [];
  for (const e of Effects.getEnemiesInRadius(game, x, y, radius)) {
    Effects.damageEnemy(game, e, damage, { tags, source });
    Effects.knockback(e, x, y, 90);
    hits.push(e);
  }
  game.particles.push(...Effects.burstParticles(x, y, color, 14));
  game.events.emit(EVT.EXPLOSION_CREATED, { x, y, radius, tags, source });
  if (sf.detonateurSpec) Effects.triggerTrapsNear(game, x, y, sf.detonateurSpec.radius, null);
  return hits;
};

Effects.chainJump = (game, opts) => {
  const { fromX, fromY, maxJumps = 3, range = 160, damage, tags = [TAGS.ELECTRIQUE], source } = opts;
  const hitIds = new Set(opts.excludeIds || []);
  let cx = fromX, cy = fromY;
  const path = [{ x: cx, y: cy }];
  for (let i = 0; i < maxJumps; i++) {
    const candidates = Effects.getEnemiesInRadius(game, cx, cy, range).filter(e => !hitIds.has(e.id));
    if (candidates.length === 0) break;
    candidates.sort((a, b) => Effects.dist(a.x, a.y, cx, cy) - Effects.dist(b.x, b.y, cx, cy));
    const target = candidates[0];
    Effects.damageEnemy(game, target, damage * Math.pow(0.85, i), { tags, source });
    hitIds.add(target.id);
    path.push({ x: target.x, y: target.y });
    cx = target.x; cy = target.y;
  }
  if (path.length > 1) game.chainVisuals.push({ path, life: 0.18, color: '#f5e042' });
  return path;
};

Effects.pullEnemies = (game, opts) => {
  const { x, y, radius, strength = 260, duration = 0.35 } = opts;
  for (const e of Effects.getEnemiesInRadius(game, x, y, radius)) {
    if (isFrozen(e)) continue;
    e.forcedTargetX = x; e.forcedTargetY = y;
    e.forcedSpeed = strength;
    e.forcedTimer = duration;
  }
};

Effects.knockback = (enemy, fromX, fromY, force) => {
  if (isFrozen(enemy)) return;
  const a = Math.atan2(enemy.y - fromY, enemy.x - fromX);
  enemy.knockbackX += Math.cos(a) * force;
  enemy.knockbackY += Math.sin(a) * force;
};

Effects.slowEnemiesInRadius = (game, opts) => {
  const { x, y, radius, duration = 2 } = opts;
  for (const e of Effects.getEnemiesInRadius(game, x, y, radius)) {
    Effects.applyStatus(game, e, 'slow', { duration });
  }
};

Effects.markEnemy = (game, enemy, opts = {}) => {
  Effects.applyStatus(game, enemy, opts.statusType || 'mark', { duration: opts.duration || 5, value: opts.bonusMult || 1.3 });
};

Effects.freezeEnemy = (game, enemy, opts = {}) => {
  Effects.applyStatus(game, enemy, 'freeze', { duration: opts.duration || 1.2 });
};

Effects.createZone = (game, opts) => {
  const z = new Zone(Object.assign({ castMult: game._castMult || 1 }, opts));
  game.zones.push(z);
  game.events.emit(EVT.ZONE_CREATED, { zone: z });
  return z;
};

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px - x1) * dx + (py - y1) * dy) / lenSq : 0;
  t = clamp(t, 0, 1);
  return Effects.dist(px, py, x1 + dx * t, y1 + dy * t);
}

Effects.enemiesInZone = (game, zone) => {
  if (zone.shape === 'line') {
    return game.enemies.filter(e => !e.dead && pointToSegmentDist(e.x, e.y, zone.x1, zone.y1, zone.x2, zone.y2) <= (zone.width / 2 + e.radius));
  }
  return Effects.getEnemiesInRadius(game, zone.x, zone.y, zone.radius);
};

Effects.createLineZone = (game, opts) => Effects.createZone(game, Object.assign({ shape: 'line' }, opts));

Effects.dash = (game, opts = {}) => {
  const p = game.player;
  const distance = (opts.distance || 170) * (opts.distanceMult || 1);
  const dur = opts.duration || 0.16;
  let dir = opts.dir;
  if (!dir) {
    const mv = game.input.moveVec();
    dir = (mv.x || mv.y) ? mv : { x: Math.cos(p.aimAngle), y: Math.sin(p.aimAngle) };
  }
  const len = Math.hypot(dir.x, dir.y) || 1;
  p.dashDir = { x: dir.x / len, y: dir.y / len };
  p.isDashing = true;
  p.dashTimer = dur;
  p.dashSpeed = distance / dur;
  p.iframes = Math.max(p.iframes, opts.iframes != null ? opts.iframes : dur + 0.05);
  p.timeSinceLastDash = 0;
  game.events.emit(EVT.DASH_STARTED, {});
  game.schedule(dur, () => { p.isDashing = false; game.events.emit(EVT.DASH_FINISHED, { x: p.x, y: p.y, dir: p.dashDir }); });
};

Effects.teleportTo = (game, x, y, opts = {}) => {
  const p = game.player;
  p.x = clamp(x, 30, game.map.width - 30);
  p.y = clamp(y, 30, game.map.height - 30);
  if (opts.iframes) p.iframes = Math.max(p.iframes, opts.iframes);
};

Effects.addShield = (game, amount, duration = 6) => {
  const p = game.player;
  p.shield += amount;
  p.shieldExpireAt = game.time + duration;
};

Effects.heal = (game, amount) => {
  const healed = game.player.heal(amount);
  if (healed > 0) game.events.emit(EVT.PLAYER_HEALED, { amount: healed });
  return healed;
};

Effects.spawnSummon = (game, opts) => {
  const s = new Summon(Object.assign({ castMult: game._castMult || 1 }, opts));
  game.summons.push(s);
  return s;
};

Effects.burstParticles = (x, y, color, count = 10) => {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 160;
    out.push(new Particle(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, color, life: 0.35 + Math.random() * 0.3, radius: 2 + Math.random() * 3 }));
  }
  return out;
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// =====================================================================================
// GÉNÉRATION 2 — primitives génériques pour les 100 compétences / 50 spécificités.
// Rien ici n'est câblé à une compétence précise : ce sont des briques réutilisables
// (ressources, rupture, réactions de zone, historique de position, esquive/parry,
// combo) que data/skills2.js et data/specificities2.js composent.
// =====================================================================================

// ---- Ressources génériques (chaleur, réserve, cicatrices de sang, etc.) ----
Effects.addResource = (game, key, amount, max = Infinity) => {
  const p = game.player;
  const r = p.resources[key] || (p.resources[key] = { value: 0, max });
  r.max = max;
  const before = r.value;
  r.value = clamp(r.value + amount, 0, r.max);
  if (r.value !== before) game.events.emit(EVT.RESOURCE_GENERATED, { key, amount: r.value - before, total: r.value });
  if (r.value >= r.max && before < r.max) game.events.emit(EVT.RESOURCE_FULL, { key });
  return r.value;
};
Effects.getResource = (game, key) => (game.player.resources[key] || { value: 0 }).value;
Effects.spendResource = (game, key, amount) => {
  const r = game.player.resources[key];
  if (!r || r.value < amount) return false;
  r.value -= amount;
  game.events.emit(EVT.RESOURCE_SPENT, { key, amount });
  return true;
};

// ---- Jauge de RUPTURE (étourdissement progressif, réutilise le statut freeze) ----
Effects.addRupture = (game, enemy, amount) => {
  if (!enemy || enemy.dead || enemy.ruptured) return;
  enemy.ruptureGauge = Math.min(enemy.ruptureMax, enemy.ruptureGauge + amount);
  if (enemy.ruptureGauge >= enemy.ruptureMax) {
    enemy.ruptured = true;
    Effects.applyStatus(game, enemy, 'freeze', { duration: 1.6 });
    game.events.emit(EVT.ENEMY_RUPTURED, { enemy });
    game.schedule(1.6, () => { enemy.ruptured = false; enemy.ruptureGauge = 0; });
  }
};

// ---- Réactions de zone : une zone porte un `element`; lui appliquer un second élément
// peut déclencher une réaction (table ci-dessous), sinon le nouvel élément remplace
// l'ancien. C'est LE point d'extension générique pour "EAU + FOUDRE", "EAU + FEU", etc.
const ZONE_REACTION_TABLE = {
  'eau+feu': 'vapeur',
  'eau+glace': 'glace',
  'eau+electrique': 'electrifiee',
  'feu+glace': 'fonte',
  'feu+poison': 'toxique_enflamme',
  'feu+vent': 'brasier',
  'glace+electrique': 'verglas_charge',
  'poison+electrique': 'gaz_ionise',
};
Effects.applyElementToZone = (game, zone, element, opts = {}) => {
  if (!zone || zone.dead || !element) return;
  if (!zone.element) { zone.element = element; return null; }
  if (zone.element === element) return null;
  const key = [zone.element, element].sort().join('+');
  const result = ZONE_REACTION_TABLE[key] || null;
  game.events.emit(EVT.ZONE_REACTION, { zone, from: zone.element, into: element, result, source: opts.source });
  zone.element = result || element;
  if (result) Effects.triggerZoneReaction(game, zone, result, opts.source);
  return result;
};
Effects.triggerZoneReaction = (game, zone, result, source) => {
  const hits = Effects.enemiesInZone(game, zone);
  for (const e of hits) {
    if (result === 'vapeur') { Effects.damageEnemy(game, e, 9, { tags: [TAGS.EAU, TAGS.FEU], source }); Effects.applyStatus(game, e, 'slow', { duration: 1.8 }); }
    else if (result === 'electrifiee') Effects.applyStatus(game, e, 'shock', { stacks: 1, duration: 3, value: 8, source });
    else if (result === 'glace') Effects.freezeEnemy(game, e, { duration: 1 });
    else if (result === 'fonte') Effects.damageEnemy(game, e, 7, { tags: [TAGS.GLACE, TAGS.FEU], source });
    else if (result === 'toxique_enflamme') { Effects.damageEnemy(game, e, 6, { tags: [TAGS.FEU, TAGS.POISON], source }); Effects.applyStatus(game, e, 'burn', { value: 7, duration: 2, source }); }
    else if (result === 'brasier') Effects.applyStatus(game, e, 'burn', { value: 10, duration: 2.5, source });
    else if (result === 'verglas_charge') { Effects.applyStatus(game, e, 'slow', { duration: 2.5 }); Effects.applyStatus(game, e, 'shock', { stacks: 1, duration: 2, value: 6, source }); }
    else if (result === 'gaz_ionise') Effects.applyStatus(game, e, 'poison', { value: 6, duration: 3, source });
  }
  game.particles.push(...Effects.burstParticles(zone.x, zone.y, '#cfe8ff', 10));
};
Effects.findZone = (game, x, y, r, element) =>
  game.zones.find(z => !z.dead && (!element || z.element === element) && Effects.dist(x, y, z.x, z.y) <= r + z.radius);
Effects.findZonesOfElement = (game, element) => game.zones.filter(z => !z.dead && z.element === element);

// ---- Esquive / Parry génériques (retour d'événement pour les spécificités) ----
Effects.grantDodge = (game, duration) => {
  const p = game.player;
  p.iframes = Math.max(p.iframes, duration);
  const meleeThreat = game.enemies.some(e => !e.dead && Effects.dist(e.x, e.y, p.x, p.y) <= (e.attackRange + p.radius + 16) && e.attackTimer < 0.3);
  const projThreat = game.projectiles.some(pr => pr.owner === 'enemy' && Effects.dist(pr.x, pr.y, p.x, p.y) < 70);
  const perfect = meleeThreat || projThreat;
  p.dodgeIsPerfect = perfect;
  p.dodgeUntil = game.time + duration;
  if (perfect) game.events.emit(EVT.PERFECT_DODGE, {});
  return perfect;
};

// ---- Historique de position (Retour / Miroir temporel) : échantillonné dans
// combat.js toutes les ~0.2s plutôt qu'à chaque frame (suffisant, peu coûteux). ----
Effects.getPastSnapshot = (game, secondsAgo) => {
  const targetT = game.time - secondsAgo;
  let best = null, bestDiff = Infinity;
  for (const snap of game.positionHistory) {
    const diff = Math.abs(snap.t - targetT);
    if (diff < bestDiff) { bestDiff = diff; best = snap; }
  }
  return best;
};

// ---- Marques transférables (Vol de marque, Marqueur, Toxicité, Condamnation...) ----
Effects.transferStatuses = (game, fromEnemy, toEnemy, opts = {}) => {
  if (!fromEnemy || !toEnemy || fromEnemy === toEnemy) return;
  const types = Object.keys(fromEnemy.statuses || {});
  for (const type of types) {
    if (opts.only && !opts.only.includes(type)) continue;
    const s = fromEnemy.statuses[type];
    applyStatusToEnemy(game, toEnemy, type, { stacks: s.stacks, duration: s.duration, value: s.value, source: opts.source });
    if (opts.move) clearStatus(fromEnemy, type);
  }
};

// ---- Petit helper directionnel pour les compétences qui visent une position monde. ----
Effects.angleTo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

// PV dépensés VOLONTAIREMENT par une compétence (Pacte, Échange vital, Pulse...) —
// distinct de takeDamage() : ne déclenche ni parry ni bouclier, ne peut pas tuer,
// mais émet un événement générique pour que des spécificités type "Sacrifice"
// réagissent au coût, pas seulement aux dégâts ennemis.
Effects.spendPlayerHp = (game, amount, source) => {
  const p = game.player;
  const cost = Math.min(amount, Math.max(0, p.hp - 1));
  if (cost <= 0) return 0;
  p.hp -= cost;
  p.hitFlashTimer = 0.1;
  game.events.emit(EVT.RESOURCE_SPENT, { key: 'hp', amount: cost, source });
  return cost;
};

// ---- Pièges posés par le joueur (Mine, Araignée, Geyser à retardement...) ----
Effects.placeTrap = (game, opts) => {
  const trap = Object.assign({
    x: 0, y: 0, radius: 30, armed: true, duration: 30, elapsed: 0, dead: false,
    castMult: game._castMult || 1, color: '#ff4757',
  }, opts);
  game.traps.push(trap);
  return trap;
};
Effects.triggerTrap = (game, trap, target) => {
  if (!trap.armed || trap.dead) return;
  trap.armed = false; trap.dead = trap.consumeOnTrigger !== false;
  const sf = game.specFlags;
  // Piégeur : un piège qui a "mûri" longtemps avant de se déclencher frappe plus fort.
  const maturity = trap.duration > 0 ? clamp(trap.elapsed / trap.duration, 0, 1) : 0;
  const bonusMult = sf.piegeur && maturity >= sf.piegeur.minMaturity ? sf.piegeur.mult : 1;
  game._castMult = trap.castMult * bonusMult;
  if (trap.onTrigger) trap.onTrigger(game, trap, target);
  game._castMult = 1;
  game.particles.push(...Effects.burstParticles(trap.x, trap.y, trap.color, 8));
  if (trap.chainRadius) Effects.triggerTrapsNear(game, trap.x, trap.y, trap.chainRadius, trap);
  // Architecte : les pièges du joueur s'activent aussi entre eux automatiquement.
  if (sf.architecte) Effects.triggerTrapsNear(game, trap.x, trap.y, sf.architecte.radius, trap);
};
// Déclenche en chaîne les autres pièges du joueur à proximité (Détonateur, Architecte).
Effects.triggerTrapsNear = (game, x, y, radius, exclude) => {
  for (const t of game.traps) {
    if (t === exclude || t.dead || !t.armed) continue;
    if (Effects.dist(t.x, t.y, x, y) <= radius) {
      const target = Effects.getEnemiesInRadius(game, t.x, t.y, t.radius)[0] || null;
      Effects.triggerTrap(game, t, target);
    }
  }
};

// ---- Déclencheur générique : attend une condition (via le bus d'événements) puis
// exécute un effet, avec expiration si la condition n'arrive jamais. ----
Effects.placeTrigger = (game, eventName, opts = {}) => {
  const x = opts.x, y = opts.y, radius = opts.radius || 120, duration = opts.duration || 8;
  const castMult = game._castMult || 1;
  let done = false;
  const off = game.events.on(eventName, (payload) => {
    if (done) return;
    const px = (payload && payload.enemy) ? payload.enemy.x : x, py = (payload && payload.enemy) ? payload.enemy.y : y;
    if (x != null && Effects.dist(px, py, x, y) > radius) return;
    if (opts.filter && !opts.filter(payload)) return;
    done = true; off();
    game._castMult = castMult;
    opts.onTrigger(game, payload);
    game._castMult = 1;
  });
  game.schedule(duration, () => { if (!done) { done = true; off(); } });
};
