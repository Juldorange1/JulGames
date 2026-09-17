// 100 compétences (2e génération, remplace intégralement les 50 précédentes).
// Philosophie : viser, timer, se positionner, anticiper, enchaîner, prendre des
// risques — pas de simples "+X% dégâts". ctx fourni par skillRuntime :
// { game, player, stats (mis à l'échelle par la rareté), rarityId, angle, origin,
// target (point visé au curseur), chargeRatio (0..1, compétences `charge:true`) }.
// RÈGLE DE CODE : ne jamais utiliser `this.xxx` à l'intérieur d'un onTick/onHit/onTrigger
// (rappelé par le moteur, `this` n'y vaut pas la compétence) — toujours capturer dans
// une variable locale (`const tags = this.tags`) AVANT de définir le callback.
const SKILLS = [

// ================= GROUPE A — TERRAIN ET ZONES =================
{
  id: 'flaque', name: 'Flaque', tags: [TAGS.EAU, TAGS.ZONE],
  desc: "Crée une flaque d'eau qui reste au sol : matière première pour tes compétences de transformation (Incendie, Congélation, Électrolyse...).",
  cooldown: 3, baseStats: { radius: 65, duration: 9, tickInterval: 1 },
  cast(ctx) {
    const { game, stats, target } = ctx;
    const z = Effects.createZone(game, {
      x: target.x, y: target.y, radius: stats.radius, duration: stats.duration, tickInterval: stats.tickInterval, color: 'rgba(80,160,255,.22)',
      onTick(g, zone) { for (const e of Effects.enemiesInZone(g, zone)) Effects.applyStatus(g, e, 'slow', { duration: 1 }); },
    });
    Effects.applyElementToZone(game, z, 'eau', { source: 'flaque' });
  },
},
{
  id: 'maree', name: 'Marée', tags: [TAGS.EAU, TAGS.CONTROLE, TAGS.ZONE],
  desc: 'Une vague avance devant toi et repousse tout ce qui se trouve dans son arc.',
  cooldown: 4.5, baseStats: { damage: 11, knockback: 240, range: 260, arcDeg: 55 },
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    const hits = Effects.spawnMeleeArc(game, { x: player.x, y: player.y, angle: player.aimAngle, arcDeg: stats.arcDeg, range: stats.range, damage: stats.damage, tags, source: 'maree', knockback: stats.knockback });
    for (const e of hits) Effects.applyStatus(game, e, 'slow', { duration: 1.4 });
  },
},
{
  id: 'torrent', name: 'Torrent', tags: [TAGS.EAU, TAGS.ZONE, TAGS.CONTROLE],
  desc: 'Un courant continu autour de toi repousse les ennemis en permanence.',
  cooldown: 6.5, baseStats: { radius: 150, duration: 4, tickInterval: 0.4, pushForce: 70 },
  cast(ctx) {
    const { game, player, stats } = ctx;
    const push = stats.pushForce;
    const z = Effects.createZone(game, {
      x: player.x, y: player.y, radius: stats.radius, duration: stats.duration, tickInterval: stats.tickInterval, followsPlayer: true, color: 'rgba(80,160,255,.12)',
      onTick(g, zone) { for (const e of Effects.enemiesInZone(g, zone)) Effects.knockback(e, zone.x, zone.y, push); },
    });
    Effects.applyElementToZone(game, z, 'eau', { source: 'torrent' });
  },
},
{
  id: 'geyser', name: 'Geyser', tags: [TAGS.EAU, TAGS.ZONE, TAGS.TIMING],
  desc: "Une zone ciblée explose verticalement après un court délai : anticipe où seront les ennemis.",
  cooldown: 5.5, baseStats: { damage: 38, radius: 85, delay: 1.1 },
  cast(ctx) {
    const { game, stats, target } = ctx; const tags = this.tags;
    game.telegraphs.push({ x: target.x, y: target.y, radius: stats.radius, time: stats.delay, maxTime: stats.delay, color: '#5fc8ff' });
    game.schedule(stats.delay, () => {
      Effects.explosionAt(game, { x: target.x, y: target.y, radius: stats.radius, damage: stats.damage, tags, color: '#5fc8ff', source: 'geyser' });
      const z = Effects.createZone(game, { x: target.x, y: target.y, radius: stats.radius * 0.7, duration: 2, tickInterval: 1, color: 'rgba(80,160,255,.14)', onTick() {} });
      Effects.applyElementToZone(game, z, 'eau', { source: 'geyser' });
    });
  },
},
{
  id: 'source_eau', name: 'Source', tags: [TAGS.EAU, TAGS.ZONE, TAGS.RESSOURCE],
  desc: "Crée une zone d'eau stable et longue durée — une réserve pour construire un build de transformations.",
  cooldown: 7, baseStats: { radius: 55, duration: 14 },
  cast(ctx) {
    const { game, stats, target } = ctx;
    const z = Effects.createZone(game, { x: target.x, y: target.y, radius: stats.radius, duration: stats.duration, tickInterval: 1, color: 'rgba(80,160,255,.16)', onTick() {} });
    Effects.applyElementToZone(game, z, 'eau', { source: 'source_eau' });
  },
},
{
  id: 'sol_brulant', name: 'Sol brûlant', tags: [TAGS.FEU, TAGS.ZONE],
  desc: 'Transforme une zone du terrain en sol brûlant.',
  cooldown: 4, baseStats: { radius: 60, duration: 6, dps: 9 },
  cast(ctx) {
    const { game, stats, target } = ctx; const tags = this.tags;
    const z = Effects.createZone(game, {
      x: target.x, y: target.y, radius: stats.radius, duration: stats.duration, tickInterval: 0.5, color: 'rgba(255,107,74,.22)',
      onTick: Kits.zoneDamageStatus({ damage: stats.dps * 0.5, tags, status: 'burn', statusOpts: { value: stats.dps * 0.4, duration: 1.5 }, source: 'sol_brulant' }),
    });
    Effects.applyElementToZone(game, z, 'feu', { source: 'sol_brulant' });
  },
},
{
  id: 'fissure', name: 'Fissure', tags: [TAGS.TERRE, TAGS.ZONE],
  desc: 'Une fissure se propage sur le sol depuis toi et fait trébucher les ennemis touchés.',
  cooldown: 5, baseStats: { damage: 18, length: 230, width: 44, knockback: 130 },
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    const x2 = player.x + Math.cos(player.aimAngle) * stats.length, y2 = player.y + Math.sin(player.aimAngle) * stats.length;
    const px = player.x, py = player.y;
    const z = Effects.createLineZone(game, {
      x1: player.x, y1: player.y, x2, y2, width: stats.width, duration: 0.4, tickInterval: 0.4, color: 'rgba(160,130,90,.4)',
      onTick(g, zone) { for (const e of Effects.enemiesInZone(g, zone)) { Effects.damageEnemy(g, e, stats.damage, { tags, source: 'fissure' }); Effects.knockback(e, px, py, stats.knockback); } },
    });
    Effects.applyElementToZone(game, z, 'terre', { source: 'fissure' });
  },
},
{
  id: 'bourbier', name: 'Bourbier', tags: [TAGS.TERRE, TAGS.ZONE, TAGS.CONTROLE],
  desc: 'Crée une zone qui ralentit fortement les ennemis.',
  cooldown: 5.5, baseStats: { radius: 80, duration: 5 },
  cast(ctx) {
    const { game, stats, target } = ctx;
    const z = Effects.createZone(game, {
      x: target.x, y: target.y, radius: stats.radius, duration: stats.duration, tickInterval: 0.5, color: 'rgba(120,90,50,.28)',
      onTick(g, zone) { for (const e of Effects.enemiesInZone(g, zone)) Effects.applyStatus(g, e, 'slow', { duration: 0.8 }); },
    });
    Effects.applyElementToZone(game, z, 'terre', { source: 'bourbier' });
  },
},
{
  id: 'tornade', name: 'Tornade', tags: [TAGS.VENT, TAGS.ZONE, TAGS.CONTROLE],
  desc: 'Une tornade mobile avance dans la direction visée et attire les ennemis sur son passage.',
  cooldown: 7, baseStats: { radius: 55, duration: 4, speed: 150, damage: 6 },
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    Effects.createZone(game, {
      x: player.x, y: player.y, radius: stats.radius, duration: stats.duration, tickInterval: 0.4,
      vx: Math.cos(player.aimAngle) * stats.speed, vy: Math.sin(player.aimAngle) * stats.speed, color: 'rgba(200,220,230,.22)',
      onTick(g, zone) { Effects.pullEnemies(g, { x: zone.x, y: zone.y, radius: zone.radius, strength: 180, duration: 0.4 }); for (const e of Effects.enemiesInZone(g, zone)) Effects.damageEnemy(g, e, stats.damage, { tags, source: 'tornade' }); },
    });
  },
},
{
  id: 'mur_de_vent', name: 'Mur de vent', tags: [TAGS.VENT, TAGS.ZONE, TAGS.PROJECTILE],
  desc: 'Crée une barrière qui détruit les projectiles ennemis qui la traversent.',
  cooldown: 6, baseStats: { radius: 90, duration: 5 },
  cast(ctx) {
    const { game, player, stats } = ctx;
    Effects.createZone(game, { x: player.x + Math.cos(player.aimAngle) * 70, y: player.y + Math.sin(player.aimAngle) * 70, radius: stats.radius, duration: stats.duration, tickInterval: 1, blocksProjectiles: true, color: 'rgba(220,240,255,.18)', onTick() {} });
  },
},

// ================= GROUPE B — TRANSFORMATIONS =================
{
  id: 'incendie', name: 'Incendie', tags: [TAGS.FEU, TAGS.EAU, TAGS.REACTION],
  desc: "Transforme une zone d'eau proche en vapeur brûlante (dégâts + ralentissement).",
  cooldown: 4.5, baseStats: { range: 220 },
  cast(ctx) {
    const { game, player, stats, target } = ctx;
    const z = Effects.findZone(game, target.x, target.y, 90, 'eau') || Effects.findZone(game, player.x, player.y, stats.range, 'eau');
    if (z) Effects.applyElementToZone(game, z, 'feu', { source: 'incendie' });
    else game.floatingTexts.push({ x: player.x, y: player.y - 30, text: "pas d'eau à proximité", life: 0.8, color: '#f87171', vy: -20 });
  },
},
{
  id: 'congelation', name: 'Congélation', tags: [TAGS.GLACE, TAGS.EAU, TAGS.REACTION],
  desc: 'Transforme une flaque en glace : les ennemis dessus sont ralentis puis gelés.',
  cooldown: 4.5, baseStats: { range: 220 },
  cast(ctx) {
    const { game, player, stats, target } = ctx;
    const z = Effects.findZone(game, target.x, target.y, 90, 'eau') || Effects.findZone(game, player.x, player.y, stats.range, 'eau');
    if (z) Effects.applyElementToZone(game, z, 'glace', { source: 'congelation' });
  },
},
{
  id: 'electrolyse', name: 'Électrolyse', tags: [TAGS.ELECTRIQUE, TAGS.EAU, TAGS.REACTION],
  desc: "Électrifie TOUTES les zones d'eau actuellement présentes sur la carte.",
  cooldown: 8, baseStats: {},
  cast(ctx) {
    const { game } = ctx;
    for (const z of Effects.findZonesOfElement(game, 'eau')) Effects.applyElementToZone(game, z, 'electrique', { source: 'electrolyse' });
  },
},
{
  id: 'corruption', name: 'Corruption', tags: [TAGS.OMBRE, TAGS.ZONE, TAGS.MARQUE],
  desc: "Crée une zone d'ombre : les ennemis qui y entrent reçoivent une marque.",
  cooldown: 6, baseStats: { radius: 70, duration: 6, markMult: 1.35, markDuration: 5 },
  cast(ctx) {
    const { game, stats, target } = ctx;
    const z = Effects.createZone(game, {
      x: target.x, y: target.y, radius: stats.radius, duration: stats.duration, tickInterval: 0.5, color: 'rgba(120,60,180,.22)',
      onTick(g, zone) { for (const e of Effects.enemiesInZone(g, zone)) if (!hasStatus(e, 'mark')) Effects.markEnemy(g, e, { duration: stats.markDuration, bonusMult: stats.markMult }); },
    });
    Effects.applyElementToZone(game, z, 'ombre', { source: 'corruption' });
  },
},
{
  id: 'purification', name: 'Purification', tags: [TAGS.LUMIERE, TAGS.STATUT, TAGS.REACTION],
  desc: "Détruit les altérations des ennemis proches ; chaque statut supprimé devient un projectile de lumière.",
  cooldown: 7, baseStats: { radius: 150, damage: 15 },
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    for (const e of Effects.getEnemiesInRadius(game, player.x, player.y, stats.radius)) {
      const types = Object.keys(e.statuses || {});
      for (const type of types) {
        clearStatus(e, type);
        Effects.spawnProjectile(game, { x: e.x, y: e.y, angle: Math.random() * Math.PI * 2, speed: 420, radius: 5, color: '#fff6c9', tags,
          onHit(g, proj, target2) { Effects.damageEnemy(g, target2, stats.damage, { tags, source: 'purification' }); } });
      }
    }
  },
},
{
  id: 'fusion_zones', name: 'Fusion', tags: [TAGS.REACTION, TAGS.ZONE],
  desc: 'Combine deux zones élémentaires proches en une seule — déclenche leur réaction.',
  cooldown: 6, baseStats: { range: 150 },
  cast(ctx) {
    const { game, target, stats } = ctx;
    const zones = game.zones.filter(z => !z.dead && z.element && Effects.dist(z.x, z.y, target.x, target.y) <= stats.range);
    if (zones.length >= 2) { const [a, b] = zones; Effects.applyElementToZone(game, a, b.element, { source: 'fusion' }); b.dead = true; }
  },
},
{
  id: 'transmutation', name: 'Transmutation', tags: [TAGS.ELEMENT, TAGS.PROJECTILE, TAGS.REACTION],
  desc: "Tire un projectile dont l'élément est celui de ta dernière compétence élémentaire utilisée.",
  cooldown: 3, baseStats: { damage: 17, speed: 560 },
  cast(ctx) {
    const { game, player, stats, origin, angle } = ctx; const tags0 = this.tags;
    const el = player.lastElementTag || TAGS.FEU;
    const colorFor = { [TAGS.FEU]: '#ff6b4a', [TAGS.GLACE]: '#5fd4ff', [TAGS.ELECTRIQUE]: '#f5e042', [TAGS.POISON]: '#8bd450', [TAGS.SANG]: '#e0405f', [TAGS.EAU]: '#5fa8ff' };
    const tags = [el, TAGS.PROJECTILE].concat(tags0);
    Effects.spawnProjectile(game, {
      x: origin.x, y: origin.y, angle, speed: stats.speed, radius: 7, color: colorFor[el] || '#fff', tags,
      onHit(g, proj, e) {
        Effects.damageEnemy(g, e, stats.damage, { tags, source: 'transmutation' });
        if (el === TAGS.FEU) Effects.applyStatus(g, e, 'burn', { value: 5, duration: 2, source: 'transmutation' });
        else if (el === TAGS.GLACE) Effects.freezeEnemy(g, e, { duration: 0.8 });
        else if (el === TAGS.ELECTRIQUE) Effects.applyStatus(g, e, 'shock', { stacks: 1, duration: 2, value: 6, source: 'transmutation' });
        else if (el === TAGS.POISON) Effects.applyStatus(g, e, 'poison', { value: 5, duration: 3, source: 'transmutation' });
        else if (el === TAGS.SANG) Effects.applyStatus(g, e, 'bleed', { stacks: 1, value: 3, duration: 3, source: 'transmutation' });
      },
    });
  },
},
{
  id: 'distillation', name: 'Distillation', tags: [TAGS.ZONE, TAGS.REACTION],
  desc: "Concentre les ennemis d'une zone vers son centre et réduit la zone (l'effet devient plus dense).",
  cooldown: 6, baseStats: { radius: 130, strength: 200 },
  cast(ctx) {
    const { game, target, stats } = ctx;
    Effects.pullEnemies(game, { x: target.x, y: target.y, radius: stats.radius, strength: stats.strength, duration: 0.6 });
    const z = Effects.findZone(game, target.x, target.y, stats.radius);
    if (z) z.radius *= 0.6;
  },
},
{
  id: 'dispersion', name: 'Dispersion', tags: [TAGS.ZONE, TAGS.REACTION],
  desc: "Inverse de Distillation : agrandit une zone et repousse les ennemis pour étaler son effet.",
  cooldown: 6, baseStats: { radius: 130, strength: 160 },
  cast(ctx) {
    const { game, target, stats } = ctx;
    const z = Effects.findZone(game, target.x, target.y, stats.radius);
    if (z) z.radius *= 1.6;
    Effects.pullEnemies(game, { x: target.x, y: target.y, radius: stats.radius, strength: -stats.strength, duration: 0.4 });
  },
},
{
  id: 'catalyseur_zone', name: 'Catalyseur', tags: [TAGS.REACTION, TAGS.ZONE],
  desc: 'Déclenche immédiatement une réaction entre toutes les zones élémentaires proches, prises deux par deux.',
  cooldown: 7, baseStats: { range: 180 },
  cast(ctx) {
    const { game, target, stats } = ctx;
    const zones = game.zones.filter(z => !z.dead && z.element && Effects.dist(z.x, z.y, target.x, target.y) <= stats.range);
    for (let i = 0; i < zones.length - 1; i += 2) Effects.applyElementToZone(game, zones[i], zones[i + 1].element, { source: 'catalyseur' });
  },
},

// ================= GROUPE C — PROJECTILES TECHNIQUES =================
{
  id: 'aiguille', name: 'Aiguille', tags: [TAGS.PROJECTILE, TAGS.PRECISION, TAGS.CHARGE],
  desc: "Projectile minuscule et rapide. Maintenir le clic la charge : relâche au bon moment pour un tir bien plus puissant.",
  cooldown: 0.9, charge: true, baseStats: { damage: 13, speed: 1100, radius: 3, maxChargeTime: 1.1 },
  noScale: ['cooldown', 'maxChargeTime'],
  cast(ctx) {
    const { game, stats, origin, angle, chargeRatio } = ctx; const tags = this.tags;
    const sf = game.specFlags;
    let mult = 0.4 + 0.6 * (chargeRatio != null ? chargeRatio : 1);
    if (sf.tireurPatient && chargeRatio >= 0.95) mult *= sf.tireurPatient.mult;
    const dmg = stats.damage * mult;
    Effects.spawnProjectile(game, { x: origin.x, y: origin.y, angle, speed: stats.speed, radius: stats.radius, color: '#e8f4ff', tags, pierce: 1,
      onHit(g, proj, e) { Effects.damageEnemy(g, e, dmg, { tags, source: 'aiguille', allowCrit: true, critChance: 0.25 }); } });
  },
},
{
  id: 'orbite', name: 'Orbite', tags: [TAGS.PROJECTILE, TAGS.POSITIONNEMENT],
  desc: "Un projectile tourne autour de toi pendant quelques secondes, frappant tout ce qui passe à sa portée.",
  cooldown: 5, baseStats: { damage: 9, duration: 4, radius: 75, speed: 4.2 },
  noScale: ['cooldown', 'speed'],
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    Effects.spawnProjectile(game, { x: player.x, y: player.y, angle: 0, speed: 0, radius: 7, color: '#c9a8ff', tags, behavior: 'orbit',
      orbitAngle: player.aimAngle, orbitRadius: stats.radius, orbitSpeed: stats.speed, life: stats.duration,
      onHit(g, proj, e) { Effects.damageEnemy(g, e, stats.damage, { tags, source: 'orbite' }); } });
  },
},
{
  id: 'fil', name: 'Fil', tags: [TAGS.PROJECTILE, TAGS.MOUVEMENT, TAGS.PRECISION],
  desc: 'Projectile relié à toi : te déplacer pendant son vol courbe sa trajectoire en temps réel.',
  cooldown: 3.5, baseStats: { damage: 22, speed: 480, curve: 2.2 },
  cast(ctx) {
    const { game, stats, origin, angle } = ctx; const tags = this.tags;
    const proj = Effects.spawnProjectile(game, { x: origin.x, y: origin.y, angle, speed: stats.speed, radius: 6, color: '#d0e8ff', tags, tethered: true,
      onHit(g, p2, e) { Effects.damageEnemy(g, e, stats.damage, { tags, source: 'fil' }); } });
    proj.curveStrength = stats.curve;
  },
},
{
  id: 'crochet_inverse', name: 'Crochet inversé', tags: [TAGS.PROJECTILE, TAGS.MOUVEMENT],
  desc: 'Se plante dans un mur puis te tire violemment vers lui.',
  cooldown: 5, baseStats: { speed: 620, pullSpeed: 900 },
  cast(ctx) {
    const { game, player, stats, origin, angle } = ctx; const tags = this.tags;
    Effects.spawnProjectile(game, { x: origin.x, y: origin.y, angle, speed: stats.speed, radius: 6, color: '#caa46a', behavior: 'plant_on_wall', tags, pierce: 99, life: 2,
      onHit() {},
      onPlant(g, proj) { g.schedule(0.05, () => { player.pulledTo = { x: proj.x, y: proj.y, speed: stats.pullSpeed }; }); g.schedule(1.4, () => { proj.dead = true; }); } });
  },
},
{
  id: 'perforateur', name: 'Perforateur', tags: [TAGS.PROJECTILE, TAGS.CHAINE],
  desc: 'Traverse plusieurs ennemis ; chaque ennemi traversé prolonge sa portée.',
  cooldown: 3, baseStats: { damage: 16, speed: 600, life: 0.9, lifeBonus: 0.35 },
  cast(ctx) {
    const { game, stats, origin, angle } = ctx; const tags = this.tags;
    Effects.spawnProjectile(game, { x: origin.x, y: origin.y, angle, speed: stats.speed, radius: 6, color: '#dfe8ff', tags, pierce: 99, life: stats.life,
      onHit(g, proj, e) { Effects.damageEnemy(g, e, stats.damage, { tags, source: 'perforateur' }); proj.life += stats.lifeBonus; } });
  },
},
{
  id: 'scission', name: 'Scission', tags: [TAGS.PROJECTILE, TAGS.CHAINE],
  desc: 'Se divise en deux projectiles plus faibles au premier impact.',
  cooldown: 3.2, baseStats: { damage: 19, speed: 560, splitDamage: 9, splitSpeed: 480 },
  cast(ctx) {
    const { game, stats, origin, angle } = ctx; const tags = this.tags;
    Effects.spawnProjectile(game, { x: origin.x, y: origin.y, angle, speed: stats.speed, radius: 7, color: '#ffd27a', tags,
      onHit(g, proj, e) {
        Effects.damageEnemy(g, e, stats.damage, { tags, source: 'scission' });
        if (!proj.split) {
          proj.split = true;
          for (const da of [-0.5, 0.5]) {
            Effects.spawnProjectile(g, { x: proj.x, y: proj.y, angle: angle + da, speed: stats.splitSpeed, radius: 5, color: '#ffd27a', tags,
              onHit(g2, p2, e2) { Effects.damageEnemy(g2, e2, stats.splitDamage, { tags, source: 'scission' }); } });
          }
        }
      } });
  },
},
{
  id: 'eclatement', name: 'Éclatement', tags: [TAGS.PROJECTILE, TAGS.EXPLOSION],
  desc: "Presque aucun dégât à l'impact, mais libère six projectiles secondaires en étoile.",
  cooldown: 4, baseStats: { damage: 3, speed: 520, shardDamage: 12, shardCount: 6 },
  noScale: ['cooldown', 'shardCount'],
  cast(ctx) {
    const { game, stats, origin, angle } = ctx; const tags = this.tags;
    Effects.spawnProjectile(game, { x: origin.x, y: origin.y, angle, speed: stats.speed, radius: 6, color: '#ffb347', tags,
      onHit(g, proj, e) {
        Effects.damageEnemy(g, e, stats.damage, { tags, source: 'eclatement' });
        Effects.spawnProjectileRing(g, { x: proj.x, y: proj.y, speed: 420, radius: 4, color: '#ffb347', tags, count: stats.shardCount,
          onHit(g2, p2, e2) { Effects.damageEnemy(g2, e2, stats.shardDamage, { tags, source: 'eclatement' }); } });
      } });
  },
},
{
  id: 'retourneur', name: 'Retourneur', tags: [TAGS.PROJECTILE, TAGS.TIMING],
  desc: 'Lance un projectile lent ; réutilise la compétence pour le faire revenir en pleine course.',
  cooldown: 4, baseStats: { damage: 15, speed: 260 },
  cast(ctx) {
    const { game, player, stats, origin, angle } = ctx; const tags = this.tags;
    if (player.retournerActive && !player.retournerActive.dead) {
      const proj = player.retournerActive;
      proj.vx *= -1; proj.vy *= -1; proj.hitEnemies = new Set();
      player.retournerActive = null;
      return;
    }
    const proj = Effects.spawnProjectile(game, { x: origin.x, y: origin.y, angle, speed: stats.speed, radius: 6, color: '#a8ffcf', tags,
      onHit(g, p2, e) { Effects.damageEnemy(g, e, stats.damage, { tags, source: 'retourneur' }); } });
    player.retournerActive = proj;
    game.schedule(3, () => { if (player.retournerActive === proj) player.retournerActive = null; });
  },
},
{
  id: 'percuteur', name: 'Percuteur', tags: [TAGS.PROJECTILE, TAGS.COMBO],
  desc: "Pose une charge immobile qui explose au contact d'un ennemi OU d'un de tes autres projectiles.",
  cooldown: 4.5, baseStats: { damage: 30, radius: 65 },
  cast(ctx) {
    const { game, target, stats } = ctx; const tags = this.tags;
    Effects.placeTrap(game, { x: target.x, y: target.y, radius: 14, duration: 8, color: '#ffe27a', triggersOnProjectile: true,
      onTrigger(g, trap) { Effects.explosionAt(g, { x: trap.x, y: trap.y, radius: stats.radius, damage: stats.damage, tags, color: '#ffe27a', source: 'percuteur' }); } });
  },
},
{
  id: 'projectile_vide', name: 'Projectile vide', tags: [TAGS.PROJECTILE, TAGS.MARQUE, TAGS.COMBO],
  desc: "Traverse les ennemis sans dégâts mais les marque : les dégâts n'arrivent que si un AUTRE coup les touche ensuite.",
  cooldown: 3, baseStats: { markDamage: 34, duration: 4 },
  cast(ctx) {
    const { game, stats, origin, angle } = ctx; const tags = this.tags;
    registerOncePerCombat(game, 'projectile_vide', () => {
      game.events.on(EVT.ENEMY_HIT, ({ enemy, source }) => {
        if (enemy.__voidMark && source !== 'projectile_vide' && source !== 'projectile_vide_trigger') {
          const m = enemy.__voidMark; enemy.__voidMark = null;
          Effects.damageEnemy(game, enemy, m.damage, { tags: [TAGS.MARQUE], source: 'projectile_vide_trigger', noProc: true });
        }
      });
    });
    Effects.spawnProjectile(game, { x: origin.x, y: origin.y, angle, speed: 640, radius: 6, color: '#c9c9ff', tags, pierce: 99,
      onHit(g, proj, e) { Effects.applyStatus(g, e, 'mark', { duration: stats.duration, value: 1.15 }); e.__voidMark = { damage: stats.markDamage }; } });
  },
},

// ================= GROUPE D — RISQUE ET PV =================
{
  id: 'pacte', name: 'Pacte', tags: [TAGS.SACRIFICE, TAGS.SANG],
  desc: 'Consomme une partie de tes PV actuels pour produire une attaque puissante.',
  cooldown: 3, baseStats: { hpCost: 12, damage: 55, radius: 75 },
  noScale: ['cooldown', 'hpCost'],
  cast(ctx) {
    const { game, player, stats, target } = ctx; const tags = this.tags;
    const cost = Effects.spendPlayerHp(game, stats.hpCost, 'pacte');
    if (cost <= 0) return;
    Effects.explosionAt(game, { x: target.x, y: target.y, radius: stats.radius, damage: stats.damage, tags, color: '#e0405f', source: 'pacte' });
  },
},
{
  id: 'dernier_souffle', name: 'Dernier souffle', tags: [TAGS.RISQUE, TAGS.ZONE],
  desc: 'Ne peut être utilisée qu à faible PV : déclenche une puissante onde autour de toi.',
  cooldown: 8, baseStats: { threshold: 0.3, damage: 65, radius: 140 },
  noScale: ['cooldown', 'threshold'],
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    if (player.hpRatio() > stats.threshold) { game.floatingTexts.push({ x: player.x, y: player.y - 30, text: 'PV trop hauts', life: 0.8, color: '#f87171', vy: -20 }); return; }
    Effects.explosionAt(game, { x: player.x, y: player.y, radius: stats.radius, damage: stats.damage, tags, color: '#ff2d3a', source: 'dernier_souffle' });
  },
},
{
  id: 'cicatrice', name: 'Cicatrice', tags: [TAGS.SANG, TAGS.RESSOURCE],
  desc: 'Convertit une partie des dégâts que tu reçois en charges utilisables par Décharge et compétences liées.',
  cooldown: 6, baseStats: { ratio: 0.5, max: 100 },
  cast(ctx) {
    const { game, stats } = ctx;
    registerOncePerCombat(game, 'cicatrice', () => {
      game.events.on(EVT.PLAYER_DAMAGED, ({ amount }) => Effects.addResource(game, 'cicatrice', amount * stats.ratio, stats.max));
    });
    Effects.addResource(game, 'cicatrice', 5, stats.max);
  },
},
{
  id: 'transfusion', name: 'Transfusion', tags: [TAGS.SANG, TAGS.INVOCATION],
  desc: 'Transfère une partie de tes PV à ta plus proche invocation pour prolonger sa durée et sa puissance.',
  cooldown: 5, baseStats: { hpCost: 15, durationBonus: 4, damageMult: 1.4 },
  noScale: ['cooldown', 'hpCost'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    const summon = game.summons.filter(s => !s.dead).sort((a, b) => Effects.dist(a.x, a.y, player.x, player.y) - Effects.dist(b.x, b.y, player.x, player.y))[0];
    if (!summon) return;
    const cost = Effects.spendPlayerHp(game, stats.hpCost, 'transfusion');
    if (cost <= 0) return;
    summon.duration += stats.durationBonus; summon.damage *= stats.damageMult;
  },
},
{
  id: 'retour_de_dette', name: 'Retour de dette', tags: [TAGS.SANG, TAGS.RESSOURCE, TAGS.RISQUE],
  desc: 'Chaque dégât reçu remplit une jauge de dette ; relâche-la pour la restituer en dégâts.',
  cooldown: 5, baseStats: { ratio: 0.7, radius: 100 },
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    registerOncePerCombat(game, 'retour_de_dette', () => {
      game.events.on(EVT.PLAYER_DAMAGED, ({ amount }) => Effects.addResource(game, 'dette', amount * stats.ratio, 400));
    });
    const value = Effects.getResource(game, 'dette');
    if (value <= 0) return;
    Effects.spendResource(game, 'dette', value);
    Effects.explosionAt(game, { x: player.x, y: player.y, radius: stats.radius, damage: value, tags, color: '#e0405f', source: 'retour_de_dette' });
  },
},
{
  id: 'echange_vital', name: 'Échange vital', tags: [TAGS.SACRIFICE, TAGS.RESSOURCE],
  desc: 'Sacrifie des PV pour réinitialiser instantanément une autre de tes compétences équipées.',
  cooldown: 5, baseStats: { hpCost: 14 },
  noScale: ['cooldown', 'hpCost'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    const others = game.activeSkillSlots.filter(s => s.def.id !== 'echange_vital' && s.charges < s.maxCharges);
    if (!others.length) return;
    const cost = Effects.spendPlayerHp(game, stats.hpCost, 'echange_vital');
    if (cost <= 0) return;
    const slot = others[Math.floor(Math.random() * others.length)];
    slot.charges = slot.maxCharges; slot.cooldownTimer = 0;
  },
},
{
  id: 'blessure_ouverte', name: 'Blessure ouverte', tags: [TAGS.SANG, TAGS.RISQUE, TAGS.CONTROLE],
  desc: 'Attire les ennemis proches vers toi mais te rend plus vulnérable pendant quelques secondes.',
  cooldown: 6, baseStats: { radius: 180, duration: 3, strength: 150, vulnerableMult: 1.3 },
  cast(ctx) {
    const { game, player, stats } = ctx;
    Effects.pullEnemies(game, { x: player.x, y: player.y, radius: stats.radius, strength: stats.strength, duration: 0.5 });
    player.buffs.vulnerable = { mult: stats.vulnerableMult, until: game.time + stats.duration };
  },
},
{
  id: 'pulse_sang', name: 'Pulse', tags: [TAGS.SANG, TAGS.ZONE, TAGS.RISQUE],
  desc: 'Coûte plus de PV selon le nombre d ennemis proches, mais les frappe tous durement.',
  cooldown: 6, baseStats: { hpCostPerEnemy: 2, damagePerEnemy: 15, radius: 150 },
  noScale: ['cooldown', 'hpCostPerEnemy'],
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    const count = Effects.getEnemiesInRadius(game, player.x, player.y, stats.radius).length;
    if (!count) return;
    Effects.spendPlayerHp(game, count * stats.hpCostPerEnemy, 'pulse_sang');
    Effects.explosionAt(game, { x: player.x, y: player.y, radius: stats.radius, damage: count * stats.damagePerEnemy, tags, color: '#e0405f', source: 'pulse_sang' });
  },
},
{
  id: 'vol_vital', name: 'Vol vital', tags: [TAGS.SANG, TAGS.CORPS_A_CORPS],
  desc: 'Frappe au corps à corps et récupère une partie des dégâts infligés en PV.',
  cooldown: 2.2, baseStats: { damage: 22, healRatio: 0.4, range: 62, arcDeg: 100 },
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    const hits = Effects.spawnMeleeArc(game, { x: player.x, y: player.y, angle: player.aimAngle, arcDeg: stats.arcDeg, range: stats.range, damage: stats.damage, tags, source: 'vol_vital' });
    if (hits.length) Effects.heal(game, stats.damage * stats.healRatio * hits.length);
  },
},
{
  id: 'coeur_instable', name: 'Coeur instable', tags: [TAGS.SANG, TAGS.EXPLOSION, TAGS.RISQUE],
  desc: 'Arme une charge qui explose autour de toi dès que tu as subi assez de dégâts.',
  cooldown: 7, baseStats: { threshold: 25, damage: 48, radius: 110 },
  noScale: ['cooldown', 'threshold'],
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    player.coeurInstable = { threshold: stats.threshold, accum: 0 };
    registerOncePerCombat(game, 'coeur_instable', () => {
      game.events.on(EVT.PLAYER_DAMAGED, ({ amount }) => {
        if (!player.coeurInstable) return;
        player.coeurInstable.accum += amount;
        if (player.coeurInstable.accum >= player.coeurInstable.threshold) {
          Effects.explosionAt(game, { x: player.x, y: player.y, radius: stats.radius, damage: stats.damage, tags, color: '#ff4757', source: 'coeur_instable' });
          player.coeurInstable = null;
        }
      });
    });
  },
},

// ================= GROUPE E — MOUVEMENT =================
{
  id: 'ruee', name: 'Ruée', tags: [TAGS.DASH, TAGS.MOUVEMENT],
  desc: 'Fonce jusqu à la première collision ; les ennemis traversés sont projetés.',
  cooldown: 3.5, baseStats: { distance: 230, damage: 22, knockback: 220, iframes: 0.25 },
  noScale: ['cooldown', 'iframes'],
  cast(ctx) {
    const { game, stats } = ctx;
    game.player.dashContactDamage = { damage: stats.damage, knockback: stats.knockback, tags: this.tags, source: 'ruee' };
    game.player.dashHitSet = new Set();
    Effects.dash(game, { distance: stats.distance, iframes: stats.iframes });
  },
},
{
  id: 'freinage', name: 'Freinage', tags: [TAGS.MOUVEMENT, TAGS.TIMING],
  desc: 'Arrête net ton dash en cours et libère une onde proportionnelle à la vitesse perdue.',
  cooldown: 4, baseStats: { damageMult: 0.16, radius: 95 },
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    if (!player.isDashing) return;
    const dmg = player.dashSpeed * stats.damageMult;
    player.isDashing = false;
    Effects.explosionAt(game, { x: player.x, y: player.y, radius: stats.radius, damage: dmg, tags, color: '#8fb4ff', source: 'freinage' });
  },
},
{
  id: 'acceleration', name: 'Accélération', tags: [TAGS.MOUVEMENT],
  desc: 'Convertis ton momentum actuel (accumulé en te déplaçant sans être touché) en vitesse temporaire.',
  cooldown: 5, baseStats: { maxBonus: 0.6, duration: 3 },
  noScale: ['cooldown', 'duration'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    player.speedBuffMult = 1 + (player.momentum / 100) * stats.maxBonus;
    player.speedBuffTimer = stats.duration;
  },
},
{
  id: 'virage', name: 'Virage', tags: [TAGS.DASH, TAGS.PRECISION],
  desc: 'Pendant un dash en cours, change instantanément sa direction vers ton curseur.',
  cooldown: 4, baseStats: {},
  cast(ctx) {
    const { player } = ctx;
    if (!player.isDashing) return;
    player.dashDir = { x: Math.cos(player.aimAngle), y: Math.sin(player.aimAngle) };
  },
},
{
  id: 'trace_fantome', name: 'Trace fantôme', tags: [TAGS.MOUVEMENT, TAGS.INVOCATION],
  desc: 'Laisse un fantôme à ta position actuelle qui attaque les ennemis à ta place.',
  cooldown: 6, baseStats: { duration: 6, damage: 10, attackCooldown: 1 },
  noScale: ['cooldown', 'duration', 'attackCooldown'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    Effects.spawnSummon(game, { kind: 'trace_fantome', x: player.x, y: player.y, duration: stats.duration, damage: stats.damage, attackCooldown: stats.attackCooldown, range: 220, color: '#c9c9ff', tags: this.tags, mode: 'turret' });
  },
},
{
  id: 'collision', name: 'Collision', tags: [TAGS.MOUVEMENT, TAGS.CORPS_A_CORPS],
  desc: 'Ta prochaine collision de dash produit une explosion bonus.',
  cooldown: 5, baseStats: { damage: 26, radius: 75 },
  cast(ctx) {
    const { player, stats } = ctx;
    player.nextCollisionBonus = { damage: stats.damage, radius: stats.radius };
  },
},
{
  id: 'passage', name: 'Passage', tags: [TAGS.DASH, TAGS.ESQUIVE],
  desc: 'Devient intangible un court instant : traverse murs et ennemis sans dégâts.',
  cooldown: 6, baseStats: { duration: 0.45 },
  noScale: ['cooldown', 'duration'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    player.phasingTimer = stats.duration;
    Effects.grantDodge(game, stats.duration);
  },
},
{
  id: 'accroche', name: 'Accroche', tags: [TAGS.MOUVEMENT, TAGS.CORPS_A_CORPS],
  desc: "T'accroche à un ennemi visé et tourne autour de lui, hors de portée de ses attaques.",
  cooldown: 6, baseStats: { range: 240, radius: 55, duration: 2, speed: 4.5 },
  noScale: ['cooldown', 'duration', 'speed'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    const target = Effects.getTargetedEnemy(game, stats.range);
    if (!target) return;
    player.orbitLock = { targetId: target.id, angle: angleTo(target.x, target.y, player.x, player.y), radius: stats.radius, speed: stats.speed, timer: stats.duration };
  },
},
{
  id: 'orbitalite', name: 'Orbitalité', tags: [TAGS.MOUVEMENT, TAGS.POSITIONNEMENT],
  desc: "Comme Accroche, mais t'accroches en frappant continuellement la cible pendant la rotation.",
  cooldown: 7, baseStats: { range: 240, radius: 90, duration: 3, speed: 3, damage: 6, tickInterval: 0.3 },
  noScale: ['cooldown', 'duration', 'speed', 'tickInterval'],
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    const target = Effects.getTargetedEnemy(game, stats.range);
    if (!target) return;
    player.orbitLock = { targetId: target.id, angle: angleTo(target.x, target.y, player.x, player.y), radius: stats.radius, speed: stats.speed, timer: stats.duration };
    channelOverTime(game, stats.duration, stats.tickInterval, () => {
      if (player.orbitLock && player.orbitLock.targetId === target.id && !target.dead) Effects.damageEnemy(game, target, stats.damage, { tags, source: 'orbitalite' });
    });
  },
},
{
  id: 'point_dancrage', name: "Point d'ancrage", tags: [TAGS.MOUVEMENT, TAGS.TELEPORTATION],
  desc: "Pose une ancre à ta position ; réutilise la compétence pour y revenir instantanément.",
  cooldown: 8, baseStats: { iframes: 0.2 },
  noScale: ['cooldown', 'iframes'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    if (player.anchorPos) { Effects.teleportTo(game, player.anchorPos.x, player.anchorPos.y, { iframes: stats.iframes }); player.anchorPos = null; }
    else player.anchorPos = { x: player.x, y: player.y };
  },
},

// ================= GROUPE F — CONTRÔLE DES ENNEMIS =================
{
  id: 'provocation', name: 'Provocation', tags: [TAGS.CONTROLE, TAGS.RISQUE],
  desc: "Expose les ennemis proches : ils deviennent temporairement plus vulnérables.",
  cooldown: 6, baseStats: { radius: 200, duration: 4, bonusMult: 1.3 },
  cast(ctx) {
    const { game, player, stats } = ctx;
    for (const e of Effects.getEnemiesInRadius(game, player.x, player.y, stats.radius)) Effects.markEnemy(game, e, { duration: stats.duration, bonusMult: stats.bonusMult });
  },
},
{
  id: 'confusion', name: 'Confusion', tags: [TAGS.CONTROLE],
  desc: 'Désoriente les ennemis proches : gelés un instant puis ralentis.',
  cooldown: 5.5, baseStats: { radius: 150, freezeDuration: 0.5, slowDuration: 2.5 },
  cast(ctx) {
    const { game, player, stats } = ctx;
    for (const e of Effects.getEnemiesInRadius(game, player.x, player.y, stats.radius)) {
      Effects.freezeEnemy(game, e, { duration: stats.freezeDuration });
      game.schedule(stats.freezeDuration, () => Effects.applyStatus(game, e, 'slow', { duration: stats.slowDuration }));
    }
  },
},
{
  id: 'frenesie', name: 'Frénésie', tags: [TAGS.CONTROLE, TAGS.RISQUE],
  desc: 'Rend un ennemi ciblé beaucoup plus rapide, mais aussi bien plus vulnérable.',
  cooldown: 6, baseStats: { range: 260, speedMult: 1.7, damageMult: 1.45, duration: 4 },
  noScale: ['cooldown', 'speedMult', 'duration'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    const target = Effects.getTargetedEnemy(game, stats.range);
    if (!target) return;
    target.frenzyTimer = stats.duration; target.frenzyMult = stats.speedMult;
    Effects.markEnemy(game, target, { duration: stats.duration, bonusMult: stats.damageMult });
  },
},
{
  id: 'marquage_croise', name: 'Marquage croisé', tags: [TAGS.MARQUE, TAGS.CHAINE],
  desc: 'Lie deux ennemis : une partie des dégâts reçus par l un est transférée à l autre.',
  cooldown: 6, baseStats: { range: 280, shareRatio: 0.5, duration: 6 },
  noScale: ['cooldown', 'shareRatio', 'duration'],
  cast(ctx) {
    const { game, player, stats, target } = ctx;
    const candidates = Effects.getEnemiesInRadius(game, target.x, target.y, 260).filter(e => !e.dead);
    if (candidates.length < 2) return;
    candidates.sort((a, b) => Effects.dist(a.x, a.y, target.x, target.y) - Effects.dist(b.x, b.y, target.x, target.y));
    const [a, b] = candidates;
    a.linkedEnemyId = b.id; a.linkShareRatio = stats.shareRatio;
    b.linkedEnemyId = a.id; b.linkShareRatio = stats.shareRatio;
    game.schedule(stats.duration, () => { if (a.linkedEnemyId === b.id) a.linkedEnemyId = null; if (b.linkedEnemyId === a.id) b.linkedEnemyId = null; });
  },
},
{
  id: 'lien', name: 'Lien', tags: [TAGS.CHAINE, TAGS.POSITIONNEMENT],
  desc: 'Relie plusieurs ennemis proches par des chaînes qui les ralentissent mutuellement.',
  cooldown: 6, baseStats: { radius: 220, count: 3, duration: 4 },
  noScale: ['cooldown', 'count', 'duration'],
  cast(ctx) {
    const { game, target, stats } = ctx;
    const linked = Effects.getEnemiesInRadius(game, target.x, target.y, stats.radius).slice(0, stats.count);
    for (const e of linked) Effects.applyStatus(game, e, 'slow', { duration: stats.duration });
    if (linked.length > 1) game.chainVisuals.push({ path: linked.map(e => ({ x: e.x, y: e.y })), life: 0.6, color: '#c084fc' });
  },
},
{
  id: 'gravite', name: 'Gravité', tags: [TAGS.ZONE, TAGS.CONTROLE],
  desc: 'Crée une zone qui aspire continuellement les ennemis vers son centre.',
  cooldown: 6, baseStats: { radius: 130, duration: 4, strength: 60, tickInterval: 0.3 },
  // duration/tickInterval hors mise à l'échelle : sinon à haute rareté la zone dure des
  // dizaines de secondes et aspire les ennemis en continu loin du joueur (quasi-immunité).
  noScale: ['cooldown', 'duration', 'tickInterval'],
  cast(ctx) {
    const { game, target, stats } = ctx;
    Effects.createZone(game, {
      x: target.x, y: target.y, radius: stats.radius, duration: stats.duration, tickInterval: stats.tickInterval, color: 'rgba(90,60,140,.22)',
      onTick(g, zone) { Effects.pullEnemies(g, { x: zone.x, y: zone.y, radius: zone.radius, strength: stats.strength, duration: stats.tickInterval + 0.05 }); },
    });
  },
},
{
  id: 'attraction', name: 'Attraction', tags: [TAGS.CONTROLE],
  desc: 'Attire fortement les ennemis proches vers un point ciblé.',
  cooldown: 4, baseStats: { radius: 150, strength: 240, duration: 0.5 },
  // duration hors mise à l'échelle : c'est le verrou de contrôle lui-même (0.5s de base) —
  // le laisser scaler ferait durer le pull ~aussi longtemps que le cooldown à haute rareté
  // (immobilisation quasi permanente d'une vague entière).
  noScale: ['cooldown', 'duration'],
  cast(ctx) {
    const { game, target, stats } = ctx;
    Effects.pullEnemies(game, { x: target.x, y: target.y, radius: stats.radius, strength: stats.strength, duration: stats.duration });
  },
},
{
  id: 'repulsion', name: 'Répulsion', tags: [TAGS.CONTROLE],
  desc: 'Repousse violemment tous les ennemis proches loin de toi.',
  cooldown: 4, baseStats: { radius: 150, force: 300 },
  cast(ctx) {
    const { game, player, stats } = ctx;
    for (const e of Effects.getEnemiesInRadius(game, player.x, player.y, stats.radius)) Effects.knockback(e, player.x, player.y, stats.force);
  },
},
{
  id: 'echange_ennemi', name: 'Échange ennemi', tags: [TAGS.POSITIONNEMENT, TAGS.CONTROLE],
  desc: 'Échange instantanément la position de deux ennemis proches du curseur.',
  cooldown: 6, baseStats: { range: 300 },
  cast(ctx) {
    const { game, target, stats } = ctx;
    const candidates = Effects.getEnemiesInRadius(game, target.x, target.y, stats.range);
    if (candidates.length < 2) return;
    candidates.sort((a, b) => Effects.dist(a.x, a.y, target.x, target.y) - Effects.dist(b.x, b.y, target.x, target.y));
    const [a, b] = candidates;
    const ax = a.x, ay = a.y; a.x = b.x; a.y = b.y; b.x = ax; b.y = ay;
  },
},
{
  id: 'condamnation', name: 'Condamnation', tags: [TAGS.MARQUE, TAGS.CHAINE],
  desc: "Marque une cible ; à sa mort, la marque saute automatiquement sur l'ennemi le plus proche.",
  cooldown: 6, baseStats: { range: 280, duration: 6, bonusMult: 1.4 },
  noScale: ['cooldown', 'duration'],
  cast(ctx) {
    const { game, stats } = ctx;
    const target = Effects.getTargetedEnemy(game, stats.range);
    if (!target) return;
    Effects.markEnemy(game, target, { duration: stats.duration, bonusMult: stats.bonusMult, statusType: 'mark' });
    target.__condamne = true;
    registerOncePerCombat(game, 'condamnation', () => {
      game.events.on(EVT.ENEMY_KILLED, ({ enemy }) => {
        if (!enemy.__condamne) return;
        const next = Effects.getNearestEnemy(game, enemy.x, enemy.y, 260);
        if (next) { Effects.markEnemy(game, next, { duration: stats.duration, bonusMult: stats.bonusMult }); next.__condamne = true; }
      });
    });
  },
},

// ================= GROUPE G — INVOCATIONS =================
{
  id: 'araignee', name: 'Araignée', tags: [TAGS.INVOCATION, TAGS.PIEGE],
  desc: 'Invoque une créature qui pose des mini-pièges explosifs sur son passage.',
  cooldown: 8, baseStats: { duration: 12, damage: 16, attackCooldown: 2.2, speed: 130 },
  noScale: ['cooldown', 'duration', 'attackCooldown', 'speed'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    Effects.spawnSummon(game, { kind: 'araignee', x: player.x, y: player.y, duration: stats.duration, damage: stats.damage, attackCooldown: stats.attackCooldown, speed: stats.speed, color: '#9b59b6', tags: this.tags, mode: 'trap_layer' });
  },
},
{
  id: 'miroir_double', name: 'Miroir', tags: [TAGS.INVOCATION, TAGS.COMBO],
  desc: 'Invoque un double qui répète une fraction des dégâts de tes compétences avec un léger délai.',
  cooldown: 9, baseStats: { duration: 8, damage: 8, attackCooldown: 1.5, range: 260 },
  noScale: ['cooldown', 'duration', 'attackCooldown'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    Effects.spawnSummon(game, { kind: 'miroir', x: player.x - 20, y: player.y, duration: stats.duration, damage: stats.damage, attackCooldown: stats.attackCooldown, range: stats.range, color: '#c9c9ff', tags: this.tags, mode: 'turret' });
  },
},
{
  id: 'porteur', name: 'Porteur', tags: [TAGS.INVOCATION, TAGS.ZONE],
  desc: "Invoque une créature qui transporte avec elle une de tes zones actives.",
  cooldown: 7, baseStats: { duration: 10, range: 200 },
  noScale: ['cooldown', 'duration'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    const zone = game.zones.filter(z => !z.dead && Effects.dist(z.x, z.y, player.x, player.y) <= stats.range)[0];
    const summon = Effects.spawnSummon(game, { kind: 'porteur', x: player.x, y: player.y, duration: stats.duration, damage: 0, attackCooldown: 99, speed: 90, range: 0, color: '#7fd4ff', tags: this.tags, mode: 'guard' });
    if (zone) { zone.carrierSummonId = summon.id; zone.duration = Math.max(zone.duration, stats.duration); }
  },
},
{
  id: 'devoreur', name: 'Dévoreur', tags: [TAGS.INVOCATION, TAGS.CONTRE],
  desc: 'Invoque une créature qui absorbe les projectiles ennemis proches.',
  cooldown: 8, baseStats: { duration: 9, range: 90, speed: 170 },
  noScale: ['cooldown', 'duration'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    Effects.spawnSummon(game, { kind: 'devoreur', x: player.x, y: player.y, duration: stats.duration, damage: 0, attackCooldown: 99, speed: stats.speed, range: stats.range, color: '#5fa8ff', tags: this.tags, mode: 'absorber' });
  },
},
{
  id: 'cameleon', name: 'Caméléon', tags: [TAGS.INVOCATION, TAGS.STATUT],
  desc: "Invoque une créature qui applique ton dernier élément utilisé à chaque coup.",
  cooldown: 7, baseStats: { duration: 8, damage: 8, attackCooldown: 1.1, range: 200 },
  noScale: ['cooldown', 'duration', 'attackCooldown'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    const el = player.lastElementTag || TAGS.FEU;
    Effects.spawnSummon(game, { kind: 'cameleon', x: player.x, y: player.y, duration: stats.duration, damage: stats.damage, attackCooldown: stats.attackCooldown, range: stats.range, speed: 190, color: '#9adf9a', tags: [el].concat(this.tags), mode: 'melee' });
  },
},
{
  id: 'bombardier', name: 'Bombardier', tags: [TAGS.INVOCATION, TAGS.EXPLOSION],
  desc: 'Invoque une tourelle qui tire des projectiles explosifs.',
  cooldown: 8, baseStats: { duration: 10, damage: 15, attackCooldown: 1.7, range: 260 },
  noScale: ['cooldown', 'duration', 'attackCooldown'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    Effects.spawnSummon(game, { kind: 'bombardier', x: player.x, y: player.y, duration: stats.duration, damage: stats.damage, attackCooldown: stats.attackCooldown, range: stats.range, color: '#ff9d4a', tags: this.tags, mode: 'turret', explosive: true });
  },
},
{
  id: 'gardien_miroir', name: 'Gardien miroir', tags: [TAGS.INVOCATION, TAGS.PROJECTILE, TAGS.CONTRE],
  desc: 'Invoque un gardien qui renvoie les projectiles ennemis passant à sa portée.',
  cooldown: 9, baseStats: { duration: 8, radius: 55 },
  noScale: ['cooldown', 'duration'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    Effects.spawnSummon(game, { kind: 'gardien_miroir', x: player.x, y: player.y, duration: stats.duration, damage: 12, attackCooldown: 1.2, range: 60, radius: stats.radius, speed: 210, color: '#a0d0ff', tags: this.tags, mode: 'guard', reflects: true });
  },
},
{
  id: 'parasite_invoc', name: 'Parasite', tags: [TAGS.INVOCATION, TAGS.STATUT],
  desc: "Invoque une créature qui s'attache à un ennemi et le frappe en continu.",
  cooldown: 7, baseStats: { duration: 8, damage: 10, attackCooldown: 0.9 },
  noScale: ['cooldown', 'duration', 'attackCooldown'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    Effects.spawnSummon(game, { kind: 'parasite_invoc', x: player.x, y: player.y, duration: stats.duration, damage: stats.damage, attackCooldown: stats.attackCooldown, range: 40, speed: 260, color: '#c084fc', tags: this.tags, mode: 'leech' });
  },
},
{
  id: 'essaim_invoc', name: 'Essaim', tags: [TAGS.INVOCATION, TAGS.MOUVEMENT],
  desc: 'Invoque plusieurs petites créatures rapides et nombreuses.',
  cooldown: 8, baseStats: { duration: 9, damage: 4, count: 5, speed: 230 },
  noScale: ['cooldown', 'duration', 'speed', 'count'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    for (let i = 0; i < stats.count; i++) {
      const a = (Math.PI * 2 / stats.count) * i;
      Effects.spawnSummon(game, { kind: 'essaim_invoc', x: player.x + Math.cos(a) * 30, y: player.y + Math.sin(a) * 30, duration: stats.duration, damage: stats.damage, attackCooldown: 0.7, speed: stats.speed, range: 30, radius: 8, color: '#ffb3e0', tags: this.tags, mode: 'melee' });
    }
  },
},
{
  id: 'sacrifice_familier', name: 'Sacrifice de familier', tags: [TAGS.INVOCATION, TAGS.SACRIFICE, TAGS.COMBO],
  desc: 'Détruit ta plus proche invocation pour déclencher une explosion proportionnelle à sa puissance.',
  cooldown: 3, baseStats: { damageMult: 3.2 },
  noScale: ['cooldown'],
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    const summon = game.summons.filter(s => !s.dead).sort((a, b) => Effects.dist(a.x, a.y, player.x, player.y) - Effects.dist(b.x, b.y, player.x, player.y))[0];
    if (!summon) return;
    const sf = game.specFlags;
    const mult = stats.damageMult * (sf.sacrificeFamilierSpec ? sf.sacrificeFamilierSpec.mult : 1);
    Effects.explosionAt(game, { x: summon.x, y: summon.y, radius: 80, damage: Math.max(20, summon.damage * mult), tags, color: summon.color, source: 'sacrifice_familier' });
    summon.dead = true;
  },
},

// ================= GROUPE H — COMBOS =================
{
  id: 'premier_acte', name: 'Premier acte', tags: [TAGS.COMBO],
  desc: "Arme ta séquence : la prochaine compétence DIFFÉRENTE que tu utilises déclenche un effet supplémentaire.",
  cooldown: 5, baseStats: { damage: 22, radius: 80 },
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    player.buffs.premierActe = { damage: stats.damage, radius: stats.radius, tags };
    registerOncePerCombat(game, 'premier_acte', () => {
      game.events.on(EVT.SKILL_CHANGED, ({ to }) => {
        if (!player.buffs.premierActe || to === 'premier_acte') return;
        const b = player.buffs.premierActe; player.buffs.premierActe = null;
        Effects.explosionAt(game, { x: player.x, y: player.y, radius: b.radius, damage: b.damage, tags: b.tags, color: '#c9a8ff', source: 'premier_acte' });
      });
    });
  },
},
{
  id: 'deuxieme_acte', name: 'Deuxième acte', tags: [TAGS.COMBO, TAGS.TIMING],
  desc: "Enchaîne deux compétences différentes rapidement : la troisième reçoit un gros bonus.",
  cooldown: 5, baseStats: { window: 2.2, mult: 1.7 },
  noScale: ['cooldown', 'window'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    registerOncePerCombat(game, 'deuxieme_acte', () => {
      let recent = [];
      game.events.on(EVT.SKILL_CHANGED, () => {
        recent.push(game.time);
        recent = recent.filter(t => game.time - t <= stats.window);
        if (recent.length >= 2) { player.buffs.nextSkillMult = { mult: stats.mult }; recent = []; }
      });
    });
  },
},
{
  id: 'finisseur', name: 'Finisseur', tags: [TAGS.COMBO, TAGS.EXECUTION],
  desc: 'Termine ta séquence actuelle : convertit ton combo en une explosion proportionnelle.',
  cooldown: 4, baseStats: { perComboDamage: 9, radius: 90 },
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    const count = player.comboCount;
    Effects.explosionAt(game, { x: player.x, y: player.y, radius: stats.radius, damage: 10 + count * stats.perComboDamage, tags, color: '#fbbf24', source: 'finisseur' });
    player.comboCount = 0;
  },
},
{
  id: 'reset_combo', name: 'Reset', tags: [TAGS.COMBO, TAGS.RESSOURCE],
  desc: 'Réinitialise volontairement ton combo pour en récupérer une partie sous forme de soin.',
  cooldown: 4, baseStats: { perComboHeal: 4 },
  cast(ctx) {
    const { game, player, stats } = ctx;
    Effects.heal(game, player.comboCount * stats.perComboHeal);
    player.comboCount = 0;
  },
},
{
  id: 'copie', name: 'Copie', tags: [TAGS.COMBO],
  desc: 'Répète une version affaiblie de la dernière compétence différente que tu as utilisée.',
  cooldown: 5, baseStats: { mult: 0.65, radius: 80 },
  cast(ctx) {
    const { game, player, stats, target } = ctx; const tags = this.tags;
    const prev = [...player.actionHistory].reverse().find(a => a.skillId !== 'copie');
    if (!prev) return;
    const def = SKILLS_BY_ID[prev.skillId];
    const base = (def && def.baseStats && def.baseStats.damage) || 16;
    Effects.explosionAt(game, { x: target.x, y: target.y, radius: stats.radius, damage: base * stats.mult, tags: prev.tags.concat(tags), color: '#c9c9ff', source: 'copie' });
  },
},
{
  id: 'inversion', name: 'Inversion', tags: [TAGS.COMBO, TAGS.REACTION],
  desc: "Arme un bonus pour ta prochaine compétence si elle partage un tag avec la précédente.",
  cooldown: 4, baseStats: { mult: 1.4 },
  noScale: ['cooldown'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    const prevTags = player.lastSkillId ? (SKILLS_BY_ID[player.lastSkillId]?.tags || []) : [];
    game.events.on(EVT.SKILL_CHANGED, function handler({ to }) {
      const def = SKILLS_BY_ID[to];
      if (def && def.tags.some(t => prevTags.includes(t))) player.buffs.nextSkillMult = { mult: stats.mult };
      game.events.off(EVT.SKILL_CHANGED, handler);
    });
  },
},
{
  id: 'alternance', name: 'Alternance', tags: [TAGS.COMBO],
  desc: 'Frappe plus fort si utilisée juste après une compétence d une famille différente.',
  cooldown: 4, baseStats: { damage: 24, radius: 85, mult: 1.6 },
  cast(ctx) {
    const { game, player, stats, target } = ctx; const tags = this.tags;
    const boosted = player.lastSkillFamily && player.lastSkillFamily !== tags[0];
    Effects.explosionAt(game, { x: target.x, y: target.y, radius: stats.radius, damage: stats.damage * (boosted ? stats.mult : 1), tags, color: '#7fffe0', source: 'alternance' });
  },
},
{
  id: 'cascade', name: 'Cascade', tags: [TAGS.COMBO, TAGS.EXECUTION],
  desc: "Frappe rapprochée ; si elle achève un ennemi, ta prochaine compétence est fortement renforcée.",
  cooldown: 5, baseStats: { damage: 26, range: 70, mult: 1.8, arcDeg: 100 },
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    const before = Effects.getEnemiesInRadius(game, player.x, player.y, stats.range).filter(e => !e.dead);
    Effects.spawnMeleeArc(game, { x: player.x, y: player.y, angle: player.aimAngle, arcDeg: stats.arcDeg, range: stats.range, damage: stats.damage, tags, source: 'cascade' });
    if (before.some(e => e.dead)) player.buffs.nextSkillMult = { mult: stats.mult };
  },
},
{
  id: 'tempo', name: 'Tempo', tags: [TAGS.TIMING, TAGS.COMBO],
  desc: 'Frappe plus fort si le délai depuis ta dernière compétence colle à un rythme régulier.',
  cooldown: 3, baseStats: { damage: 18, radius: 80, idealInterval: 1.2, tolerance: 0.3, bonusMult: 1.6 },
  noScale: ['cooldown', 'idealInterval', 'tolerance'],
  cast(ctx) {
    const { game, player, stats, target } = ctx; const tags = this.tags;
    const prev = player.actionHistory[player.actionHistory.length - 1];
    const elapsed = prev ? game.time - prev.t : 999;
    const onBeat = Math.abs(elapsed - stats.idealInterval) <= stats.tolerance;
    Effects.explosionAt(game, { x: target.x, y: target.y, radius: stats.radius, damage: stats.damage * (onBeat ? stats.bonusMult : 1), tags, color: onBeat ? '#4ade80' : '#8b93a7', source: 'tempo' });
  },
},
{
  id: 'rupture_de_rythme', name: 'Rupture de rythme', tags: [TAGS.COMBO, TAGS.RISQUE],
  desc: 'Décharge massive si utilisée après une compétence différente ; modeste sinon.',
  cooldown: 5, baseStats: { bigDamage: 40, smallDamage: 14, radius: 100 },
  cast(ctx) {
    const { game, player, stats, target } = ctx; const tags = this.tags;
    const different = player.lastSkillId && player.lastSkillId !== 'rupture_de_rythme';
    Effects.explosionAt(game, { x: target.x, y: target.y, radius: stats.radius, damage: different ? stats.bigDamage : stats.smallDamage, tags, color: '#ff6b4a', source: 'rupture_de_rythme' });
  },
},

// ================= GROUPE I — TEMPS, CHARGE ET RESSOURCES =================
{
  id: 'stockage', name: 'Stockage', tags: [TAGS.RESSOURCE],
  desc: "Emmagasine de l'énergie utilisable plus tard par Décharge.",
  cooldown: 3, baseStats: { amount: 22, max: 100 },
  cast(ctx) {
    const { game, stats } = ctx;
    Effects.addResource(game, 'stockage', stats.amount, stats.max);
  },
},
{
  id: 'decharge', name: 'Décharge', tags: [TAGS.RESSOURCE],
  desc: "Consomme toute l'énergie stockée pour une explosion proportionnelle.",
  cooldown: 5, baseStats: { mult: 0.55, radius: 100 },
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    const value = Effects.getResource(game, 'stockage');
    if (value <= 0) return;
    Effects.spendResource(game, 'stockage', value);
    Effects.explosionAt(game, { x: player.x, y: player.y, radius: stats.radius, damage: value * stats.mult, tags, color: '#7fd4ff', source: 'decharge' });
  },
},
{
  id: 'surchauffe', name: 'Surchauffe', tags: [TAGS.RESSOURCE, TAGS.RISQUE],
  desc: 'Frappe fort, mais chaque utilisation rapprochée augmente la chaleur et réduit tes dégâts suivants.',
  cooldown: 1.4, baseStats: { damage: 26, radius: 70, heatPerUse: 18, maxHeat: 100 },
  noScale: ['cooldown', 'heatPerUse', 'maxHeat'],
  cast(ctx) {
    const { game, player, stats, target } = ctx; const tags = this.tags;
    registerOncePerCombat(game, 'surchauffe_decay', () => {
      channelOverTime(game, 999999, 1, () => Effects.spendResource(game, 'heat', Math.min(10, Effects.getResource(game, 'heat'))));
    });
    const heat = Effects.getResource(game, 'heat');
    const penalty = 1 - Math.min(0.7, heat / stats.maxHeat);
    Effects.addResource(game, 'heat', stats.heatPerUse, stats.maxHeat);
    Effects.explosionAt(game, { x: target.x, y: target.y, radius: stats.radius, damage: stats.damage * penalty, tags, color: '#ff6b4a', source: 'surchauffe' });
  },
},
{
  id: 'refroidissement', name: 'Refroidissement', tags: [TAGS.GLACE, TAGS.RESSOURCE, TAGS.REACTION],
  desc: 'Consomme ta chaleur accumulée pour créer une zone de glace proportionnelle.',
  cooldown: 5, baseStats: { radius: 80, perHeatDamage: 0.5 },
  cast(ctx) {
    const { game, target, stats } = ctx; const tags = this.tags;
    const heat = Effects.getResource(game, 'heat');
    Effects.spendResource(game, 'heat', heat);
    const z = Effects.createZone(game, { x: target.x, y: target.y, radius: stats.radius, duration: 3, tickInterval: 0.5, color: 'rgba(95,212,255,.22)',
      onTick: Kits.zoneDamageStatus({ damage: heat * stats.perHeatDamage * 0.5, tags, status: 'slow', statusOpts: { duration: 1 }, source: 'refroidissement' }) });
    Effects.applyElementToZone(game, z, 'glace', { source: 'refroidissement' });
  },
},
{
  id: 'retard', name: 'Retard', tags: [TAGS.TIMING],
  desc: "L'effet se déclenche plusieurs secondes après le cast — anticipe où sera l'ennemi.",
  cooldown: 4.5, baseStats: { delay: 2.2, damage: 34, radius: 85 },
  cast(ctx) {
    const { game, stats, target } = ctx; const tags = this.tags;
    game.telegraphs.push({ x: target.x, y: target.y, radius: stats.radius, time: stats.delay, maxTime: stats.delay, color: '#e0a05a' });
    game.schedule(stats.delay, () => Effects.explosionAt(game, { x: target.x, y: target.y, radius: stats.radius, damage: stats.damage, tags, color: '#e0a05a', source: 'retard' }));
  },
},
{
  id: 'premonition', name: 'Prémonition', tags: [TAGS.TIMING, TAGS.POSITIONNEMENT],
  desc: 'Révèle la trajectoire prévue des ennemis proches et les ralentit brièvement.',
  cooldown: 6, baseStats: { radius: 260, aheadTime: 1.2, slowDuration: 1.5 },
  cast(ctx) {
    const { game, player, stats } = ctx;
    for (const e of Effects.getEnemiesInRadius(game, player.x, player.y, stats.radius)) {
      const px = e.x + Math.cos(e.facing) * e.speed * stats.aheadTime, py = e.y + Math.sin(e.facing) * e.speed * stats.aheadTime;
      game.telegraphs.push({ x: px, y: py, radius: e.radius + 8, time: stats.aheadTime, maxTime: stats.aheadTime, color: '#a8ffcf' });
      Effects.applyStatus(game, e, 'slow', { duration: stats.slowDuration });
    }
  },
},
{
  id: 'declencheur', name: 'Déclencheur', tags: [TAGS.COMBO, TAGS.TIMING],
  desc: "Place un piège invisible qui attend qu'un ennemi proche soit gelé pour exploser.",
  cooldown: 5, baseStats: { damage: 40, radius: 90, range: 130, duration: 8 },
  noScale: ['cooldown', 'duration'],
  cast(ctx) {
    const { game, target, stats } = ctx; const tags = this.tags;
    Effects.placeTrigger(game, EVT.ENEMY_FROZEN, { x: target.x, y: target.y, radius: stats.range, duration: stats.duration,
      onTrigger(g, payload) { Effects.explosionAt(g, { x: payload.enemy.x, y: payload.enemy.y, radius: stats.radius, damage: stats.damage, tags, color: '#5fd4ff', source: 'declencheur' }); } });
  },
},
{
  id: 'compteur', name: 'Compteur', tags: [TAGS.COMBO, TAGS.RESSOURCE],
  desc: "Chaque utilisation charge un compteur ; au maximum, libère une explosion et se réinitialise.",
  cooldown: 2, baseStats: { max: 6, damage: 45, radius: 100 },
  noScale: ['cooldown', 'max'],
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    const v = Effects.addResource(game, 'compteur', 1, stats.max);
    if (v >= stats.max) {
      Effects.spendResource(game, 'compteur', v);
      Effects.explosionAt(game, { x: player.x, y: player.y, radius: stats.radius, damage: stats.damage, tags, color: '#fbbf24', source: 'compteur' });
    }
  },
},
{
  id: 'conversion', name: 'Conversion', tags: [TAGS.RESSOURCE, TAGS.REACTION],
  desc: 'Convertit ta chaleur accumulée en énergie stockée (et inversement selon ce qui est disponible).',
  cooldown: 4, baseStats: { ratio: 1 },
  cast(ctx) {
    const { game, stats } = ctx;
    const heat = Effects.getResource(game, 'heat');
    if (heat > 0) { Effects.spendResource(game, 'heat', heat); Effects.addResource(game, 'stockage', heat * stats.ratio, 100); return; }
    const stock = Effects.getResource(game, 'stockage');
    if (stock > 0) { Effects.spendResource(game, 'stockage', stock); Effects.addResource(game, 'heat', stock * stats.ratio, 100); }
  },
},
{
  id: 'accumulation', name: 'Accumulation', tags: [TAGS.RESSOURCE, TAGS.COMBO],
  desc: 'Accumule une charge à chaque coup porté, dash ou esquive parfaite ; dépense-la en rayon dévastateur.',
  cooldown: 6, baseStats: { perEvent: 3, max: 120, mult: 0.5, range: 300, width: 50 },
  cast(ctx) {
    const { game, player, stats, angle } = ctx; const tags = this.tags;
    registerOncePerCombat(game, 'accumulation', () => {
      const add = () => Effects.addResource(game, 'accumulation', stats.perEvent, stats.max);
      game.events.on(EVT.ENEMY_HIT, ({ isDot }) => { if (!isDot) add(); });
      game.events.on(EVT.DASH_STARTED, add);
      game.events.on(EVT.PERFECT_DODGE, add);
    });
    const value = Effects.getResource(game, 'accumulation');
    if (value <= 0) return;
    Effects.spendResource(game, 'accumulation', value);
    const x2 = player.x + Math.cos(angle) * stats.range, y2 = player.y + Math.sin(angle) * stats.range;
    Effects.createLineZone(game, { x1: player.x, y1: player.y, x2, y2, width: stats.width, duration: 0.25, tickInterval: 0.25, color: 'rgba(255,255,255,.3)',
      onTick(g, zone) { for (const e of Effects.enemiesInZone(g, zone)) Effects.damageEnemy(g, e, value * stats.mult, { tags, source: 'accumulation' }); } });
  },
},

// ================= GROUPE J — MÉCANIQUES EXOTIQUES =================
{
  id: 'ombre_miroir', name: 'Ombre', tags: [TAGS.OMBRE, TAGS.MOUVEMENT],
  desc: "Crée une ombre à l'opposé de ta position qui attaque les ennemis proches d'elle.",
  cooldown: 7, baseStats: { duration: 6, damage: 10, attackCooldown: 1.1 },
  noScale: ['cooldown', 'duration', 'attackCooldown'],
  cast(ctx) {
    const { game, player, stats } = ctx;
    const cx = game.map.width - player.x, cy = game.map.height - player.y;
    Effects.spawnSummon(game, { kind: 'ombre', x: clamp(cx, 30, game.map.width - 30), y: clamp(cy, 30, game.map.height - 30), duration: stats.duration, damage: stats.damage, attackCooldown: stats.attackCooldown, range: 200, speed: 150, color: '#8a6ad0', tags: this.tags, mode: 'melee' });
  },
},
{
  id: 'lumiere_reflechie', name: 'Lumière réfléchie', tags: [TAGS.LUMIERE, TAGS.PROJECTILE],
  desc: 'Crée un voile de lumière qui détruit les projectiles ennemis le traversant.',
  cooldown: 6, baseStats: { radius: 100, duration: 5 },
  cast(ctx) {
    const { game, target, stats } = ctx;
    Effects.createZone(game, { x: target.x, y: target.y, radius: stats.radius, duration: stats.duration, tickInterval: 1, blocksProjectiles: true, color: 'rgba(255,246,201,.2)', onTick() {} });
  },
},
{
  id: 'trou_noir', name: 'Trou noir', tags: [TAGS.OMBRE, TAGS.CONTROLE],
  desc: 'Zone minuscule qui aspire progressivement tout ce qui l entoure.',
  cooldown: 9, baseStats: { radius: 45, duration: 3, strength: 260, damage: 6, tickInterval: 0.3 },
  noScale: ['cooldown', 'duration', 'tickInterval'],
  cast(ctx) {
    const { game, target, stats } = ctx; const tags = this.tags;
    Effects.createZone(game, {
      x: target.x, y: target.y, radius: stats.radius, duration: stats.duration, tickInterval: stats.tickInterval, color: 'rgba(20,10,40,.4)',
      onTick(g, zone) { Effects.pullEnemies(g, { x: zone.x, y: zone.y, radius: 200, strength: stats.strength, duration: stats.tickInterval + 0.05 }); for (const e of Effects.enemiesInZone(g, zone)) Effects.damageEnemy(g, e, stats.damage, { tags, source: 'trou_noir' }); },
    });
  },
},
{
  id: 'echange_projectile', name: 'Échange', tags: [TAGS.TELEPORTATION, TAGS.PROJECTILE, TAGS.PRECISION],
  desc: "Échange ta position avec celle du projectile ennemi le plus proche du curseur, en le détruisant.",
  cooldown: 6, baseStats: { range: 400, damage: 18, radius: 60, iframes: 0.2 },
  noScale: ['cooldown', 'iframes'],
  cast(ctx) {
    const { game, player, stats, target } = ctx; const tags = this.tags;
    let best = null, bestD = stats.range;
    for (const p of game.projectiles) {
      if (p.owner !== 'enemy' || p.dead) continue;
      const d = Effects.dist(p.x, p.y, target.x, target.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (!best) return;
    const { x, y } = best; best.dead = true;
    Effects.teleportTo(game, x, y, { iframes: stats.iframes });
    Effects.explosionAt(game, { x, y, radius: stats.radius, damage: stats.damage, tags, color: '#cfe0ff', source: 'echange_projectile' });
  },
},
{
  id: 'decalage', name: 'Décalage', tags: [TAGS.COMBO],
  desc: 'Reproduit ta dernière compétence différente, mais décalée à distance sur ta cible.',
  cooldown: 4.5, baseStats: { mult: 0.6, radius: 75 },
  cast(ctx) {
    const { game, player, stats, target } = ctx; const tags = this.tags;
    const prev = [...player.actionHistory].reverse().find(a => a.skillId !== 'decalage');
    if (!prev) return;
    const def = SKILLS_BY_ID[prev.skillId];
    const base = (def && def.baseStats && def.baseStats.damage) || 16;
    Effects.explosionAt(game, { x: target.x, y: target.y, radius: stats.radius, damage: base * stats.mult, tags: prev.tags.concat(tags), color: '#a8ffcf', source: 'decalage' });
  },
},
{
  id: 'resonance_tags', name: 'Résonance', tags: [TAGS.REACTION, TAGS.COMBO],
  desc: 'Déclenche une onde dont la puissance dépend du nombre de familles de tags différentes de ton build.',
  cooldown: 6, baseStats: { baseDamage: 10, perTagDamage: 6, radius: 140 },
  cast(ctx) {
    const { game, player, stats } = ctx; const tags = this.tags;
    const count = game.buildTagCount || 1;
    Effects.explosionAt(game, { x: player.x, y: player.y, radius: stats.radius, damage: stats.baseDamage + stats.perTagDamage * count, tags, color: '#c9a8ff', source: 'resonance' });
  },
},
{
  id: 'reecriture', name: 'Réécriture', tags: [TAGS.COMBO, TAGS.REACTION],
  desc: "Réécrit temporairement le comportement de ta prochaine compétence pour la renforcer nettement.",
  cooldown: 8, baseStats: { mult: 1.6 },
  noScale: ['cooldown'],
  cast(ctx) {
    const { player, stats } = ctx;
    player.buffs.nextSkillMult = { mult: stats.mult };
  },
},
{
  id: 'miroir_temporel', name: 'Miroir temporel', tags: [TAGS.TIMING, TAGS.CONTROLE],
  desc: "Frappe la position qu'occupaient les ennemis il y a quelques secondes — récompense l'anticipation.",
  cooldown: 8, baseStats: { secondsAgo: 2.2, damage: 26, radius: 55 },
  noScale: ['cooldown', 'secondsAgo'],
  cast(ctx) {
    const { game, stats } = ctx; const tags = this.tags;
    const snap = Effects.getPastSnapshot(game, stats.secondsAgo);
    if (!snap) return;
    for (const pastEnemy of snap.enemies) {
      game.telegraphs.push({ x: pastEnemy.x, y: pastEnemy.y, radius: stats.radius, time: 0.001, maxTime: 0.3, color: '#c9baff' });
      const hits = Effects.getEnemiesInRadius(game, pastEnemy.x, pastEnemy.y, stats.radius);
      for (const e of hits) Effects.damageEnemy(game, e, stats.damage, { tags, source: 'miroir_temporel' });
    }
  },
},
{
  id: 'fractale', name: 'Fractale', tags: [TAGS.CHAINE, TAGS.COMBO],
  desc: 'Frappe une cible puis reproduit un écho plus faible de son effet sur plusieurs autres.',
  cooldown: 5, baseStats: { damage: 24, secondaryMult: 0.4, secondaryCount: 3, secondaryRadius: 160 },
  noScale: ['cooldown', 'secondaryCount'],
  cast(ctx) {
    const { game, stats } = ctx; const tags = this.tags;
    const target = Effects.getTargetedEnemy(game, 400);
    if (!target) return;
    Effects.damageEnemy(game, target, stats.damage, { tags, source: 'fractale' });
    const others = Effects.getEnemiesInRadius(game, target.x, target.y, stats.secondaryRadius).filter(e => e !== target).slice(0, stats.secondaryCount);
    for (const e of others) Effects.damageEnemy(game, e, stats.damage * stats.secondaryMult, { tags, source: 'fractale' });
  },
},
{
  id: 'singularite', name: 'Singularité', tags: [TAGS.REACTION, TAGS.ZONE, TAGS.COMBO, TAGS.RESSOURCE],
  desc: 'Crée une zone qui accumule tous les dégâts infligés en elle puis les libère en une explosion à sa disparition.',
  cooldown: 10, baseStats: { radius: 90, duration: 5, releaseMult: 0.4 },
  cast(ctx) {
    const { game, stats, target } = ctx; const tags = this.tags;
    const zone = Effects.createZone(game, { x: target.x, y: target.y, radius: stats.radius, duration: stats.duration, tickInterval: 999, color: 'rgba(150,90,255,.18)', accumulated: 0, onTick() {} });
    const off = game.events.on(EVT.ENEMY_HIT, ({ enemy, damage }) => {
      if (zone.dead || Effects.dist(enemy.x, enemy.y, zone.x, zone.y) > zone.radius) return;
      zone.accumulated += damage;
    });
    game.events.on(EVT.ZONE_DESTROYED, function onDestroy({ zone: z }) {
      if (z !== zone) return;
      game.events.off(EVT.ZONE_DESTROYED, onDestroy);
      off();
      if (zone.accumulated > 0) Effects.explosionAt(game, { x: zone.x, y: zone.y, radius: stats.radius * 1.3, damage: zone.accumulated * stats.releaseMult, tags, color: '#c9a8ff', source: 'singularite' });
    });
  },
},
];

// Recharges globalement allongées de 40% : le jeu se joue moins en spam de touches,
// davantage en gestion de fenêtres de vulnérabilité.
const COOLDOWN_MULT = 1.4;
for (const s of SKILLS) s.cooldown = Math.round(s.cooldown * COOLDOWN_MULT * 100) / 100;

const SKILLS_BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));
