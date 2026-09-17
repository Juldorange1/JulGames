// Archétypes d'ennemis. Les stats ici sont la base (difficulté 1) ; core/enemySpawner.js
// applique ensuite les multiplicateurs de data/difficulty.js. Le comportement concret
// de chaque archétype est interprété par core/enemyAI.js via le champ `behavior`.
// Vitesse de base avant le bonus +11% (ENEMY_ACTION_SPEED_MULT, voir plus bas) :
// 198 = 90% de Player.baseSpeed (core/entities.js), soit ~220 une fois le bonus
// appliqué — au ras de la vitesse du joueur pour les archétypes les plus rapides.
const ENEMY_SPEED_CAP = 198;
// Tous les dégâts infligés par les ennemis (attaques ET traînées/zones) passent par
// ce multiplicateur : -30% puis encore -10% (cumulés) par rapport aux valeurs de
// base ci-dessous, soit ×0.63.
const ENEMY_DAMAGE_MULT = 0.7 * 0.9;
// Déplacement ET cadence d'attaque des ennemis : +11% (vitesse ×1.11, temps entre
// deux attaques ÷1.11) — appliqué dans core/enemySpawner.js.
const ENEMY_ACTION_SPEED_MULT = 1.11;
const ENEMY_ARCHETYPES = {
  brute:      { name: 'Brute',      color: '#c0392b', radius: 20, hp: 42, speed: 72,  damage: 13, attackRange: 40,  attackCooldown: 1.3, behavior: 'melee_slow',    xpValue: 2 },
  coureur:    { name: 'Coureur',    color: '#e67e22', radius: 12, hp: 15, speed: 198, damage: 6,  attackRange: 32,  attackCooldown: 0.8,  behavior: 'melee_fast',    xpValue: 1 },
  archer:     { name: 'Archer',     color: '#27ae60', radius: 14, hp: 18, speed: 110, damage: 8,  attackRange: 270, attackCooldown: 1.6,  behavior: 'ranged',        xpValue: 2 },
  mage:       { name: 'Mage',       color: '#8e44ad', radius: 15, hp: 20, speed: 90,  damage: 11, attackRange: 230, attackCooldown: 2.2,  behavior: 'ranged_zone',   xpValue: 2 },
  tank:       { name: 'Tank',       color: '#7f8c8d', radius: 25, hp: 95, speed: 54,  damage: 15, attackRange: 42,  attackCooldown: 1.6,  behavior: 'melee_slow',    xpValue: 3, armor: 0.22 },
  essaim:     { name: 'Essaim',     color: '#f1c40f', radius: 9,  hp: 8,  speed: 175, damage: 4,  attackRange: 26,  attackCooldown: 0.6,  behavior: 'melee_fast',    xpValue: 1 },
  protecteur: { name: 'Protecteur', color: '#3498db', radius: 16, hp: 28, speed: 80,  damage: 6,  attackRange: 38,  attackCooldown: 1.5,  behavior: 'support_shield', xpValue: 2, auraRadius: 105, auraReduction: 0.3 },
  chasseur_e: { name: 'Chasseur',   color: '#d35400', radius: 14, hp: 22, speed: 198, damage: 9,  attackRange: 34,  attackCooldown: 1.0,  behavior: 'pursuer',       xpValue: 2 },
  explosif:   { name: 'Explosif',   color: '#e74c3c', radius: 14, hp: 13, speed: 135, damage: 28, attackRange: 55,  attackCooldown: 999,  behavior: 'suicide',       xpValue: 2, explodeRadius: 75 },
  parasite_e: { name: 'Parasite',   color: '#9b59b6', radius: 13, hp: 17, speed: 120, damage: 5,  attackRange: 210, attackCooldown: 2.4,  behavior: 'ranged_debuff', xpValue: 2 },
  invocateur: { name: 'Invocateur', color: '#16a085', radius: 15, hp: 25, speed: 70,  damage: 5,  attackRange: 190, attackCooldown: 3.5,  behavior: 'summoner',      xpValue: 3 },
  vampire:    { name: 'Vampire',    color: '#c0392b', radius: 15, hp: 27, speed: 122, damage: 11, attackRange: 40,  attackCooldown: 1.3,  behavior: 'melee_lifesteal', xpValue: 2, lifesteal: 0.5 },
  // Ne bouge jamais : tire à distance sur le joueur dès qu'il est en portée.
  sentinelle: { name: 'Sentinelle', color: '#5a6b8c', radius: 17, hp: 32, speed: 0,   damage: 10, attackRange: 320, attackCooldown: 1.8,  behavior: 'stationary_ranged', xpValue: 2 },
  // Ne bouge jamais : bombarde la position du joueur d'un tir en cloche télégraphié.
  mortier:    { name: 'Mortier',    color: '#7a5a3a', radius: 19, hp: 30, speed: 0,   damage: 15, attackRange: 380, attackCooldown: 2.8,  behavior: 'stationary_zone',   xpValue: 3, blastRadius: 75, telegraphTime: 0.9 },
  // Laisse une traînée de poison persistante derrière lui en se déplaçant.
  suintant:   { name: 'Suintant',   color: '#5ac26a', radius: 16, hp: 24, speed: 95,  damage: 6,  attackRange: 36,  attackCooldown: 1.2,  behavior: 'trail',             xpValue: 2, trailDps: 6, trailDuration: 3, trailInterval: 0.45, trailRadius: 26 },
  // Ignore les obstacles : les traverse directement pour foncer sur le joueur.
  spectre:    { name: 'Spectre',    color: '#b8a8ff', radius: 14, hp: 20, speed: 150, damage: 9,  attackRange: 34,  attackCooldown: 1.1,  behavior: 'phasing',           xpValue: 2, ignoresObstacles: true },
};
