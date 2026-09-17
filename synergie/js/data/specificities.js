// 50 spécificités (2e génération, remplace intégralement les 25 précédentes).
// Chacune répond à une vraie question de build (voir description). register(game,cfg)
// est appelé une fois au début du combat : soit elle pose un drapeau lu directement
// par le moteur (core/effects.js, core/combat.js, core/synergyEngine.js — voir les
// commentaires de ces fichiers pour la liste des sf.xxx consommés), soit elle
// s'abonne elle-même au bus d'événements (core/events.js) pour un comportement
// entièrement autonome. Même règle que skills.js : jamais de `this.x` dans un callback.
const SPECIFICITIES = [
{
  id: 'electrostatique', name: 'Électrostatique', tags: [TAGS.ELECTRIQUE, TAGS.ZONE],
  desc: 'Les effets électriques laissent une flaque électrifiée au sol après avoir frappé une cible.',
  baseConfig: { radius: 45, duration: 2.5, dps: 6 },
  register(game, cfg) {
    game.events.on(EVT.ENEMY_HIT, ({ enemy, tags }) => {
      if (!tags.includes(TAGS.ELECTRIQUE)) return;
      const z = Effects.createZone(game, { x: enemy.x, y: enemy.y, radius: cfg.radius, duration: cfg.duration, tickInterval: 0.5, color: 'rgba(245,224,66,.22)',
        onTick: Kits.zoneDamageStatus({ damage: 0, status: 'shock', statusOpts: { stacks: 1, duration: 1.5, value: cfg.dps }, source: 'electrostatique' }) });
      Effects.applyElementToZone(game, z, 'electrique', { source: 'electrostatique' });
    });
  },
},
{
  id: 'oceanique', name: 'Océanique', tags: [TAGS.EAU, TAGS.MOUVEMENT],
  desc: "Un dash à travers une zone d'eau la déplace avec toi.",
  baseConfig: { distance: 90 },
  register(game, cfg) {
    game.events.on(EVT.DASH_FINISHED, ({ x, y, dir }) => {
      const z = Effects.findZone(game, x, y, 90, 'eau');
      if (z) { z.x += dir.x * cfg.distance; z.y += dir.y * cfg.distance; }
    });
  },
},
{
  id: 'thermodynamique', name: 'Thermodynamique', tags: [TAGS.FEU, TAGS.GLACE, TAGS.REACTION],
  desc: 'Les zones de feu et de glace proches réagissent automatiquement entre elles.',
  baseConfig: { interval: 1.5, range: 160 },
  register(game, cfg) {
    const tick = () => {
      if (game.result) return;
      const feuZones = Effects.findZonesOfElement(game, 'feu'), glaceZones = Effects.findZonesOfElement(game, 'glace');
      for (const f of feuZones) for (const g2 of glaceZones) if (Effects.dist(f.x, f.y, g2.x, g2.y) <= cfg.range) Effects.applyElementToZone(game, f, 'glace', { source: 'thermodynamique' });
      game.schedule(cfg.interval, tick);
    };
    tick();
  },
},
{
  id: 'chimiste', name: 'Chimiste', tags: [TAGS.STATUT, TAGS.REACTION],
  desc: "Un ennemi affecté par plusieurs statuts différents subit une réaction bonus à chaque coup supplémentaire.",
  baseConfig: { minStatuses: 2, bonusDamage: 8 },
  register(game, cfg) {
    game.events.on(EVT.ENEMY_HIT, ({ enemy, isDot }) => {
      if (isDot || countDistinctStatuses(enemy) < cfg.minStatuses) return;
      Effects.damageEnemy(game, enemy, cfg.bonusDamage, { tags: [TAGS.REACTION], source: 'chimiste', noProc: true });
    });
  },
},
{
  id: 'reservoir', name: 'Réservoir', tags: [TAGS.RESSOURCE],
  desc: "Chaque compétence utilisée stocke un peu de puissance inutilisée, libérable par les compétences de type Ressource.",
  baseConfig: { amount: 2, max: 150 },
  register(game, cfg) {
    game.events.on(EVT.SKILL_USED, () => Effects.addResource(game, 'stockage', cfg.amount, cfg.max));
  },
},
{
  id: 'instable', name: 'Instable', tags: [TAGS.REACTION, TAGS.RISQUE],
  desc: "Les réactions élémentaires ont une chance d'en déclencher une seconde sur une zone voisine différente.",
  baseConfig: { chance: 0.3, range: 180 },
  noScale: ['chance'],
  register(game, cfg) {
    game.events.on(EVT.ZONE_REACTION, ({ zone, result }) => {
      if (!result || Math.random() > cfg.chance) return;
      const other = game.zones.find(z => z !== zone && !z.dead && z.element && z.element !== result && Effects.dist(z.x, z.y, zone.x, zone.y) <= cfg.range);
      if (other) Effects.applyElementToZone(game, other, result, { source: 'instable' });
    });
  },
},
{
  id: 'predateur_solitaire', name: 'Prédateur solitaire', tags: [TAGS.PRECISION, TAGS.RISQUE],
  desc: "Un ennemi isolé des autres subit bien plus de dégâts. Récompense de séparer les groupes.",
  baseConfig: { range: 140, mult: 1.5 },
  register(game, cfg) { game.specFlags.predateurSolitaire = cfg; },
},
{
  id: 'meneur_de_meute', name: 'Meneur de meute', tags: [TAGS.ZONE, TAGS.POSITIONNEMENT],
  desc: 'À l inverse, tes compétences de zone/explosion sont bien plus fortes contre un groupe d ennemis.',
  baseConfig: { minCount: 3, mult: 1.6 }, noScale: ['minCount'],
  register(game, cfg) { game.specFlags.meneurDeMeute = cfg; },
},
{
  id: 'acrobate_spec', name: 'Acrobate', tags: [TAGS.ESQUIVE, TAGS.COMBO],
  desc: 'Une esquive parfaite renforce immédiatement ta prochaine compétence.',
  baseConfig: { mult: 1.5 },
  register(game, cfg) {
    game.events.on(EVT.PERFECT_DODGE, () => { game.player.buffs.nextSkillMult = { mult: cfg.mult }; });
  },
},
{
  id: 'danseur_spec', name: 'Danseur', tags: [TAGS.DASH, TAGS.COMBO],
  desc: 'La compétence utilisée juste après un dash est renforcée.',
  baseConfig: { mult: 1.4 },
  register(game, cfg) {
    game.events.on(EVT.DASH_FINISHED, () => { game.player.buffs.nextSkillMult = { mult: cfg.mult }; });
  },
},
{
  id: 'geometre_spec', name: 'Géomètre', tags: [TAGS.PROJECTILE, TAGS.PRECISION],
  desc: "Tes projectiles qui rebondissent sur un mur déclenchent une petite explosion au point d'impact.",
  baseConfig: { radius: 45, damage: 10 },
  register(game, cfg) { game.specFlags.geometre = cfg; },
},
{
  id: 'ricochet_spec', name: 'Ricochet', tags: [TAGS.PROJECTILE, TAGS.CHAINE],
  desc: 'Un projectile ayant rebondi sur un mur inflige des dégâts supplémentaires à son prochain impact.',
  baseConfig: { bonusDamage: 12 },
  register(game, cfg) { game.specFlags.ricochetSpec = cfg; },
},
{
  id: 'tireur_patient', name: 'Tireur patient', tags: [TAGS.PRECISION, TAGS.CHARGE],
  desc: 'Charger une compétence au maximum avant de tirer lui donne un bonus supplémentaire.',
  baseConfig: { mult: 1.4 },
  register(game, cfg) { game.specFlags.tireurPatient = cfg; },
},
{
  id: 'instinct', name: 'Instinct', tags: [TAGS.ESQUIVE, TAGS.RESSOURCE],
  desc: 'Esquiver un projectile de très près génère une charge utilisable par tes compétences de Ressource.',
  baseConfig: { amount: 8, max: 100 },
  register(game, cfg) {
    game.events.on(EVT.PERFECT_DODGE, () => Effects.addResource(game, 'stockage', cfg.amount, cfg.max));
  },
},
{
  id: 'contretemps', name: 'Contretemps', tags: [TAGS.ESQUIVE, TAGS.TIMING],
  desc: 'La compétence utilisée juste après avoir évité une attaque de près est renforcée.',
  baseConfig: { mult: 1.5 },
  register(game, cfg) {
    game.events.on(EVT.PERFECT_DODGE, () => { game.player.buffs.nextSkillMult = { mult: cfg.mult }; });
  },
},
{
  id: 'parfait_spec', name: 'Parfait', tags: [TAGS.TIMING, TAGS.PARRY],
  desc: 'Un contre réussi déclenche une onde de choc autour de toi.',
  baseConfig: { damage: 20, radius: 90 },
  register(game, cfg) {
    game.events.on(EVT.PARRY_SUCCESS, () => Effects.explosionAt(game, { x: game.player.x, y: game.player.y, radius: cfg.radius, damage: cfg.damage, tags: [TAGS.PARRY], color: '#fbbf24', source: 'parfait' }));
  },
},
{
  id: 'pyromane_spec', name: 'Pyromane', tags: [TAGS.FEU, TAGS.ZONE],
  desc: 'Deux zones de feu proches fusionnent automatiquement en une seule zone plus grande.',
  baseConfig: { range: 100 },
  register(game, cfg) {
    game.events.on(EVT.ZONE_CREATED, ({ zone }) => {
      if (zone.element !== 'feu') return;
      const other = game.zones.find(z => z !== zone && !z.dead && z.element === 'feu' && Effects.dist(z.x, z.y, zone.x, zone.y) <= cfg.range);
      if (other) { zone.radius = Math.max(zone.radius, other.radius) * 1.25; zone.duration = Math.max(zone.duration, other.elapsed + other.duration - other.elapsed); other.dead = true; }
    });
  },
},
{
  id: 'cryogene_spec', name: 'Cryogène', tags: [TAGS.GLACE, TAGS.EXECUTION],
  desc: 'Les ennemis gelés subissent bien plus de dégâts.',
  baseConfig: { mult: 1.5 },
  register(game, cfg) { game.specFlags.cryogene = cfg; },
},
{
  id: 'conducteur_spec', name: 'Conducteur', tags: [TAGS.ELECTRIQUE, TAGS.EAU, TAGS.CHAINE],
  desc: "Frapper un ennemi électrifié dans une zone d'eau propage le choc à tous les ennemis de la zone.",
  baseConfig: { damage: 10 },
  register(game, cfg) {
    game.events.on(EVT.ENEMY_HIT, ({ enemy, tags }) => {
      if (!tags.includes(TAGS.ELECTRIQUE)) return;
      const z = Effects.findZone(game, enemy.x, enemy.y, 10, 'eau') || Effects.findZone(game, enemy.x, enemy.y, 10, 'electrique');
      if (!z) return;
      for (const other of Effects.enemiesInZone(game, z)) if (other !== enemy) Effects.damageEnemy(game, other, cfg.damage, { tags: [TAGS.ELECTRIQUE], source: 'conducteur', noProc: true });
    });
  },
},
{
  id: 'corrosif_spec', name: 'Corrosif', tags: [TAGS.POISON, TAGS.EXECUTION],
  desc: 'Les ennemis empoisonnés subissent davantage de dégâts de toutes tes compétences.',
  baseConfig: { mult: 1.35 },
  register(game, cfg) { game.specFlags.corrosif = cfg; },
},
{
  id: 'hemomancien_spec', name: 'Hémomancien', tags: [TAGS.SANG, TAGS.RISQUE],
  desc: 'Tes compétences de Sang sont bien plus fortes lorsque tes PV sont bas.',
  baseConfig: { threshold: 0.4, mult: 1.6 }, noScale: ['threshold'],
  register(game, cfg) { game.specFlags.hemomancien = cfg; },
},
{
  id: 'derniere_chance', name: 'Dernière chance', tags: [TAGS.RISQUE, TAGS.EXECUTION],
  desc: "En dessous d'un seuil de PV critique, tes compétences infligent bien plus de dégâts.",
  baseConfig: { threshold: 0.25, mult: 1.7 }, noScale: ['threshold'],
  register(game, cfg) {
    game.events.on(EVT.SKILL_USED, () => { if (game.player.hpRatio() <= cfg.threshold) game.player.buffs.nextSkillMult = { mult: cfg.mult }; });
  },
},
{
  id: 'sacrifice_spec', name: 'Sacrifice', tags: [TAGS.SACRIFICE, TAGS.RESSOURCE],
  desc: 'Perdre des PV via une compétence de Sacrifice génère aussi des charges de Ressource.',
  baseConfig: { ratio: 1.2, max: 150 },
  register(game, cfg) {
    game.events.on(EVT.RESOURCE_SPENT, ({ key, amount }) => { if (key === 'hp') Effects.addResource(game, 'stockage', amount * cfg.ratio, cfg.max); });
  },
},
{
  id: 'vampirique_spec', name: 'Vampirique', tags: [TAGS.SANG, TAGS.CORPS_A_CORPS, TAGS.RECUPERATION],
  desc: 'Tes attaques au corps à corps te soignent pour une fraction des dégâts infligés.',
  baseConfig: { ratio: 0.18 },
  register(game, cfg) {
    game.events.on(EVT.ENEMY_HIT, ({ tags, damage, isDot }) => { if (!isDot && tags.includes(TAGS.CORPS_A_CORPS)) Effects.heal(game, damage * cfg.ratio); });
  },
},
{
  id: 'architecte_spec', name: 'Architecte', tags: [TAGS.PIEGE, TAGS.COMBO],
  desc: 'Un piège déclenché active automatiquement les autres pièges à proximité.',
  baseConfig: { radius: 140 },
  register(game, cfg) { game.specFlags.architecte = cfg; },
},
{
  id: 'detonateur_spec', name: 'Détonateur', tags: [TAGS.EXPLOSION, TAGS.PIEGE],
  desc: 'Chaque explosion déclenche automatiquement tes pièges proches.',
  baseConfig: { radius: 130 },
  register(game, cfg) { game.specFlags.detonateurSpec = cfg; },
},
{
  id: 'piegeur_spec', name: 'Piégeur', tags: [TAGS.PIEGE, TAGS.TIMING],
  desc: "Un piège qui a mûri longtemps avant de se déclencher inflige bien plus de dégâts.",
  baseConfig: { minMaturity: 0.6, mult: 1.6 }, noScale: ['minMaturity'],
  register(game, cfg) { game.specFlags.piegeur = cfg; },
},
{
  id: 'chronomancien', name: 'Chronomancien', tags: [TAGS.TIMING, TAGS.CONTROLE],
  desc: 'Chaque dash accélère légèrement tous tes effets à retardement en cours.',
  baseConfig: { reduction: 0.3 },
  register(game, cfg) {
    game.events.on(EVT.DASH_STARTED, () => { for (const c of game.scheduledCallbacks) c.time -= cfg.reduction; });
  },
},
{
  id: 'archiviste_spec', name: 'Archiviste', tags: [TAGS.COMBO, TAGS.RESSOURCE],
  desc: 'Utiliser suffisamment de compétences DIFFÉRENTES pendant le combat déclenche une explosion bonus (récompense la variété plutôt que le spam).',
  baseConfig: { threshold: 6, radius: 110, damage: 40 }, noScale: ['threshold'],
  register(game, cfg) { game.specFlags.archiviste = cfg; },
},
{
  id: 'polyvalent_spec', name: 'Polyvalent', tags: [TAGS.ELEMENT, TAGS.COMBO],
  desc: 'Alterner entre familles élémentaires différentes renforce chaque nouvelle compétence.',
  baseConfig: { mult: 1.3 },
  register(game, cfg) { game.specFlags.polyvalent = cfg; },
},
{
  id: 'specialiste_spec', name: 'Spécialiste', tags: [TAGS.ELEMENT, TAGS.RESSOURCE],
  desc: "À l'inverse, répéter la même famille élémentaire charge une jauge de spécialisation qui renforce la compétence suivante à pleine charge.",
  baseConfig: { threshold: 4, mult: 1.7 }, noScale: ['threshold'],
  register(game, cfg) { game.specFlags.specialiste = cfg; },
},
{
  id: 'combo_addict', name: 'Combo addict', tags: [TAGS.COMBO, TAGS.RISQUE],
  desc: 'Plus ton combo est long, plus tes compétences sont puissantes — mais il retombe à zéro si tu es touché.',
  baseConfig: { perStep: 0.12 },
  register(game, cfg) { game.specFlags.comboAddict = cfg; },
},
{
  id: 'briseur_de_combo', name: 'Briseur de combo', tags: [TAGS.COMBO, TAGS.EXECUTION],
  desc: "Répéter volontairement la même compétence après un long combo (3+) déclenche une décharge massive.",
  baseConfig: { radius: 100, damage: 12 },
  register(game, cfg) { game.specFlags.briseurDeCombo = cfg; },
},
{
  id: 'catalyseur_vivant', name: 'Catalyseur vivant', tags: [TAGS.ELEMENT, TAGS.RISQUE],
  desc: 'Après une compétence élémentaire, tu portes brièvement cet élément : la prochaine compétence du MÊME élément est amplifiée.',
  baseConfig: { duration: 3, mult: 1.4 },
  register(game, cfg) {
    game.events.on(EVT.SKILL_USED, ({ skill }) => {
      const el = skill.tags.find(t => ELEMENT_TAGS.includes(t));
      const p = game.player;
      if (p.elementCarried && p.elementCarried === el) p.buffs.nextSkillMult = { mult: cfg.mult };
      if (el) { p.elementCarried = el; game.schedule(cfg.duration, () => { if (p.elementCarried === el) p.elementCarried = null; }); }
    });
  },
},
{
  id: 'resonateur_spec', name: 'Résonateur', tags: [TAGS.REACTION, TAGS.COMBO],
  desc: 'Une compétence dont plusieurs tags correspondent aux effets actuellement actifs déclenche une réaction bonus.',
  baseConfig: { threshold: 2, damage: 22 }, noScale: ['threshold'],
  register(game, cfg) { game.specFlags.resonateur = cfg; },
},
{
  id: 'parasite_spec', name: 'Parasite', tags: [TAGS.STATUT, TAGS.CHAINE],
  desc: "Un ennemi affecté par 3 altérations différentes en transmet une partie aux ennemis proches.",
  baseConfig: {},
  register(game, cfg) { game.specFlags.parasite = true; },
},
{
  id: 'marqueur_spec', name: 'Marqueur', tags: [TAGS.MARQUE, TAGS.CHAINE],
  desc: "À la mort d'un ennemi marqué, la marque saute automatiquement sur l'ennemi le plus proche.",
  baseConfig: { duration: 5, bonusMult: 1.3 }, noScale: ['duration'],
  register(game, cfg) {
    game.events.on(EVT.ENEMY_KILLED, ({ enemy }) => {
      if (!hasStatus(enemy, 'mark') && !hasStatus(enemy, 'proie')) return;
      const next = Effects.getNearestEnemy(game, enemy.x, enemy.y, 260);
      if (next) Effects.markEnemy(game, next, { duration: cfg.duration, bonusMult: cfg.bonusMult });
    });
  },
},
{
  id: 'chainage_spec', name: 'Chaînage', tags: [TAGS.STATUT, TAGS.CHAINE],
  desc: 'Chaque altération appliquée a une chance de se propager légèrement à un ennemi proche.',
  baseConfig: { chance: 0.25, range: 110 }, noScale: ['chance'],
  register(game, cfg) {
    game.specFlags.spread = game.specFlags.spread || {};
    for (const type of ['burn', 'poison', 'bleed', 'shock', 'slow']) game.specFlags.spread[type] = { range: cfg.range, count: 1, chance: cfg.chance };
  },
},
{
  id: 'reaction_en_chaine', name: 'Réaction en chaîne', tags: [TAGS.REACTION, TAGS.CHAINE],
  desc: 'Une réaction élémentaire peut en déclencher une autre du même type sur une zone voisine.',
  baseConfig: { chance: 0.35, range: 200 }, noScale: ['chance'],
  register(game, cfg) {
    game.events.on(EVT.ZONE_REACTION, ({ zone, result }) => {
      if (!result || Math.random() > cfg.chance) return;
      const other = game.zones.find(z => z !== zone && !z.dead && z.element && Effects.dist(z.x, z.y, zone.x, zone.y) <= cfg.range);
      if (other) Effects.applyElementToZone(game, other, zone.element, { source: 'reaction_en_chaine' });
    });
  },
},
{
  id: 'familier_spec', name: 'Familier', tags: [TAGS.INVOCATION, TAGS.COMBO],
  desc: 'Chaque compétence que tu utilises a une chance d être imitée par tes invocations actives.',
  baseConfig: { chance: 0.4, mult: 0.5 }, noScale: ['chance'],
  register(game, cfg) { game.specFlags.familier = cfg; },
},
{
  id: 'essaim_spec', name: 'Essaim', tags: [TAGS.INVOCATION],
  desc: 'Plus tu as d invocations actives, plus tes compétences sont puissantes.',
  baseConfig: { perSummonMult: 0.12 },
  register(game, cfg) { game.specFlags.essaimSpec = cfg; },
},
{
  id: 'sacrifice_familier_spec', name: 'Sacrifice de familier', tags: [TAGS.INVOCATION, TAGS.SACRIFICE],
  desc: 'Amplifie fortement l effet de ta compétence Sacrifice de familier.',
  baseConfig: { mult: 1.6 },
  register(game, cfg) { game.specFlags.sacrificeFamilierSpec = cfg; },
},
{
  id: 'miroir_spec', name: 'Miroir', tags: [TAGS.INVOCATION, TAGS.TIMING],
  desc: 'Tes invocations reproduisent tes compétences avec un léger délai.',
  baseConfig: { delay: 0.6, mult: 0.45 }, noScale: ['delay'],
  register(game, cfg) { game.specFlags.miroirSpec = cfg; },
},
{
  id: 'momentum_spec', name: 'Momentum', tags: [TAGS.MOUVEMENT],
  desc: "Te déplacer sans être touché augmente progressivement la puissance de tes compétences.",
  baseConfig: { maxBonus: 0.5 },
  register(game, cfg) { game.specFlags.momentumSpec = cfg; },
},
{
  id: 'immobile_spec', name: 'Immobile', tags: [TAGS.POSITIONNEMENT, TAGS.CHARGE],
  desc: "À l'inverse, rester immobile quelques instants charge tes compétences suivantes.",
  baseConfig: { time: 1.5, maxBonus: 0.5 }, noScale: ['time'],
  register(game, cfg) { game.specFlags.immobileSpec = cfg; },
},
{
  id: 'risque_calcule_spec', name: 'Risque calculé', tags: [TAGS.RISQUE, TAGS.POSITIONNEMENT],
  desc: 'Tes compétences sont plus puissantes plus tu es proche du danger.',
  baseConfig: { range: 200, maxBonus: 0.6 },
  register(game, cfg) { game.specFlags.risqueCalcule = cfg; },
},
{
  id: 'zoneur_spec', name: 'Zoneur', tags: [TAGS.ZONE, TAGS.POSITIONNEMENT],
  desc: "Lancer une compétence alors que tu te tiens dans une zone préparée à l'avance la renforce.",
  baseConfig: { mult: 1.35 },
  register(game, cfg) { game.specFlags.zoneurSpec = cfg; },
},
{
  id: 'opportuniste_spec', name: 'Opportuniste', tags: [TAGS.EXECUTION],
  desc: 'Les ennemis à faible PV subissent davantage de dégâts.',
  baseConfig: { threshold: 0.3, mult: 1.45 }, noScale: ['threshold'],
  register(game, cfg) { game.specFlags.opportuniste = cfg; },
},
{
  id: 'adaptatif_spec', name: 'Adaptatif', tags: [TAGS.STATUT, TAGS.REACTION],
  desc: "Ta prochaine compétence est renforcée si elle partage l'élément de la dernière altération appliquée.",
  baseConfig: { mult: 1.4 },
  register(game, cfg) { game.specFlags.adaptatif = cfg; },
},
{
  id: 'architecte_synergies_spec', name: 'Architecte de synergies', tags: [TAGS.REACTION, TAGS.COMBO],
  desc: "Une compétence dont plusieurs tags correspondent aux altérations actives déclenche soin + explosion. Difficile à déclencher, dévastateur en build optimisé.",
  baseConfig: { threshold: 3, heal: 10, damage: 34 }, noScale: ['threshold'],
  register(game, cfg) { game.specFlags.architecteSynergies = cfg; },
},
];

const SPECIFICITIES_BY_ID = Object.fromEntries(SPECIFICITIES.map(s => [s.id, s]));
