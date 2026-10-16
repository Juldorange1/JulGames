// Fonctions de combat partagees entre personnages, tourelles et boss

// ---------- Plusieurs joueurs (multijoueur en ligne) ----------
// Solo : world.player seul. En ligne (serveur) : world.players = tous les joueurs de la partie.
// Joueurs "actifs" = presents, vivants.
function worldPlayers(world) {
  if (world.players) return world.players.filter((p) => !p.dead && !p.absent);
  return world.player ? [world.player] : [];
}
// Joueur actif le plus proche d'un point (cible des tourelles et des boss).
// Un joueur invisible (Cendre C2) n'est plus vu : les ennemis visent l'endroit ou il a disparu.
function seenPlayer(p) { return p && p.invisibleTimer > 0 && p.ghost ? p.ghost : p; }
function nearestPlayer(world, x, y) {
  if (!world.players) return seenPlayer(world.player);
  let best = null, bestD = Infinity;
  for (const p of world.players) {
    if (p.dead || p.absent) continue;
    const q = seenPlayer(p);
    const d = dist2(q.x, q.y, x, y);
    if (d < bestD) { bestD = d; best = q; }
  }
  return best;
}
// Joueur a l'origine d'un effet (lui-meme, ou le proprietaire d'un projectile/mine/vent/zone).
function ownerOf(world, src) {
  if (src && src.character) return src;
  if (src && src.owner && src.owner.character) return src.owner;
  return world.player || null;
}
// Cibles hostiles pour un joueur. Solo / coop : les ennemis. Modes JcJ (world.pvp) : ennemis +
// joueurs adverses + cristal adverse (les joueurs en l'air ne peuvent pas etre touches).
// Les adversaires sont les VRAIS objets joueurs : pousser, figer, teleporter un adversaire
// fonctionne donc exactement comme sur une tourelle.
function hostiles(world, owner) {
  if (!world.pvp) return world.enemies;
  const team = owner ? owner.team : null;
  const cache = world._hostileCache || (world._hostileCache = {});
  const key = String(team);
  const tick = world.tick || 0;
  if (cache[key] && cache[key].tick === tick) return cache[key].list;
  const list = world.enemies.filter((e) => e.team == null || e.team !== team);
  for (const p of world.players || []) {
    if (p === owner || p.dead || p.absent || p.airborne) continue;
    if (team != null && p.team === team) continue;
    list.push(p);
  }
  cache[key] = { tick, list };
  return list;
}

function enemiesInRadius(world, x, y, radius, owner) {
  const out = [];
  for (const e of hostiles(world, owner)) {
    if (e.dead) continue;
    if (dist2(e.x, e.y, x, y) <= (radius + (e.radius || 0)) * (radius + (e.radius || 0))) out.push(e);
  }
  return out;
}

function nearestEnemy(world, x, y, maxRadius, owner) {
  let best = null, bestD = maxRadius ? maxRadius * maxRadius : Infinity;
  for (const e of hostiles(world, owner)) {
    if (e.dead) continue;
    const d = dist2(e.x, e.y, x, y);
    if (d <= bestD) { bestD = d; best = e; }
  }
  return best;
}

function nearestTurret(world, x, y, maxRadius, owner) {
  let best = null, bestD = maxRadius ? maxRadius * maxRadius : Infinity;
  for (const e of hostiles(world, owner)) {
    // en JcJ, un adversaire joue le role de la tourelle (ex : echange de position de Nyx)
    if (e.dead || (e.kind !== 'turret' && e.kind !== 'player')) continue;
    const d = dist2(e.x, e.y, x, y);
    if (d <= bestD) { bestD = d; best = e; }
  }
  return best;
}

function damageEnemy(world, enemy, amount, source) {
  if (!enemy || enemy.dead || amount <= 0) return;
  // Tous les degats infliges par le joueur (attaques, projectiles, mines, vent...) passent par ici :
  // le pourcentage affiche dans le HUD ("DEGATS : X%") doit reellement les mettre a l'echelle.
  // C'est le multiplicateur de l'AUTEUR du coup qui compte (plusieurs joueurs en ligne).
  const attacker = ownerOf(world, source);
  // (Fracas Infini : + bonus de degats achete au marchand)
  // (+ benedictions/maledictions : modDmg ; coup critique = degats doubles)
  const mult = attacker ? attacker.damageMultiplier * (attacker.dmgBonus || 1) * (attacker.modDmg || 1) : 1;
  amount *= mult;
  if (amount <= 0) return;
  if (attacker && attacker.critChance && Math.random() < attacker.critChance) {
    amount *= 2;
    Particles.text(enemy.x, enemy.y - (enemy.radius || 16) - 20, 'CRIT', '#ff9d3d');
  }
  // Adversaire humain ou cristal (modes en ligne) : regles du mode (serveur uniquement).
  if (enemy.kind === 'player' || enemy.kind === 'crystal') {
    if (world.onHostileHit) world.onHostileHit(world, enemy, amount, attacker);
    return;
  }
  enemy.hp -= amount;
  Particles.text(enemy.x, enemy.y - (enemy.radius || 16) - 6, `-${Math.round(amount)}`, '#ffd23d');
  Particles.burst(enemy.x, enemy.y, 5, '#ffd23d', { maxSpeed: 90, life: 0.25 });
  if (enemy.hp <= 0 && !enemy.dead) {
    enemy.dead = true;
    // La salle de test ne compte jamais rien (ni kills du repertoire, ni argent) : c'est un bac a sable.
    if (enemy.type !== 'DUMMY' && typeof Save !== 'undefined' && Save.data && Game.state !== STATE.TEST_ROOM) Save.recordKill(enemy.type);
    const isBoss = enemy.kind === 'boss';
    Particles.burst(enemy.x, enemy.y, isBoss ? 46 : 22, isBoss ? '#ff3d5a' : '#ff9d5d', { maxSpeed: isBoss ? 320 : 220, life: isBoss ? 0.7 : 0.5, gravity: 60 });
    Particles.ring(enemy.x, enemy.y, (enemy.radius || 16) * (isBoss ? 3.5 : 2.2), isBoss ? '#ff3d5a' : '#ff9d5d', isBoss ? 0.55 : 0.35);
    if (isBoss) { Audio2.boss(); if (Game.shakeCamera) Game.shakeCamera(10, 0.3); } else Audio2.turretDown();
    if (world.onEnemyKilled) world.onEnemyKilled(enemy);
    if (world.mods && world.mods.chainBlast && typeof boonChainBlast === 'function') boonChainBlast(world, enemy, attacker); // bonus
    if (attacker && attacker.killHeal) playerHeal(attacker, attacker.killHeal); // benediction
  }
}

function spawnPlayerProjectile(world, player, opts) {
  const pr = makeProjectile(Object.assign({ team: TEAM.PLAYER, color: COLORS.projPlayer, owner: player, ownerTeam: player ? player.team : null }, opts));
  world.projectiles.push(pr);
  return pr;
}

// Degats des ennemis sur le joueur : tous les BOSS font 2x moins de degats ; en Fracas Infini la
// "puissance des ennemis" choisie apres chaque boss (world.enemyPower) multiplie aussi les degats.
const BOSS_DAMAGE_MULT = 0.5; // -50% : 2x moins de degats pour tous les boss
const PVE_LOSS_MULT = 0.5 * 1.35; // -50% puis +35% : % perdu face aux ennemis et pieges (pas en PvP)
let BOSS_SCOPE = false;       // vrai pendant la mise a jour d'un boss : ses tirs sont marques fromBoss
function enemyDamageScale(world, fromBoss) {
  return PVE_LOSS_MULT * (fromBoss ? BOSS_DAMAGE_MULT : 1) * (world && world.enemyPower > 0 ? world.enemyPower : 1);
}
function enemyHitPlayer(world, player, percent, fromBoss) {
  playerApplyDamage(player, percent * enemyDamageScale(world, fromBoss));
}

function spawnEnemyProjectile(world, opts) {
  const pr = makeProjectile(Object.assign({ team: TEAM.ENEMY, color: COLORS.projEnemy }, opts));
  if (BOSS_SCOPE) pr.fromBoss = true;
  const k = ENEMY_PROJECTILE_SPEED_MULT * (world.mods && world.mods.enemyProjSpeed ? 1 + world.mods.enemyProjSpeed : 1);
  pr.vx *= k;
  pr.vy *= k;
  world.projectiles.push(pr);
  return pr;
}

function randomValidPointInRoom(world, opts) {
  const o = opts || {};
  const margin = o.margin != null ? o.margin : 30;
  const avoidPlayerRadius = o.avoidPlayerRadius != null ? o.avoidPlayerRadius : 60;
  const b = world.room.bounds;
  for (let tries = 0; tries < 40; tries++) {
    const x = randRange(b.x + margin, b.x + b.w - margin);
    const y = randRange(b.y + margin, b.y + b.h - margin);
    if (worldPlayers(world).some((p) => dist(x, y, p.x, p.y) < avoidPlayerRadius)) continue;
    let blocked = false;
    for (const ob of world.room.obstacles) {
      if (circleRect(x, y, margin * 0.6, ob.x, ob.y, ob.w, ob.h)) { blocked = true; break; }
    }
    if (blocked) continue;
    return { x, y };
  }
  return { x: (b.x + b.w) / 2, y: (b.y + b.h) / 2 };
}

function pushEnemy(enemy, dx, dy) {
  if (!enemy._pushX) { enemy._pushX = 0; enemy._pushY = 0; }
  enemy._pushX = (enemy._pushX || 0) + dx;
  enemy._pushY = (enemy._pushY || 0) + dy;
}

function enemyIsDisabled(e) {
  if (e.frozen && e.frozen > 0) return true;
  if (e.frozenUntilTouched) return true;
  return false;
}

function updateFrozenTimers(world, dt) {
  for (const e of world.enemies) {
    if (e.dead) continue;
    if (e.frozen && e.frozen > 0) { e.frozen -= dt; if (e.frozen < 0) e.frozen = 0; }
    if (e.frozenUntilTouched && worldPlayers(world).some((p) => circleCircle(e.x, e.y, (e.radius || 16) + 4, p.x, p.y, p.radius))) {
      e.frozenUntilTouched = false;
    }
  }
}
