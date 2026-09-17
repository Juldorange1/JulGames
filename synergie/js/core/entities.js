let _entityId = 1;
function nextId() { return _entityId++; }

class Player {
  constructor(x, y) {
    this.id = nextId();
    this.x = x; this.y = y;
    this.radius = 16;
    this.maxHp = 100;
    this.hp = 100;
    this.baseSpeed = 220;
    this.aimAngle = 0;
    this.shield = 0;
    this.shieldExpireAt = 0;
    this.iframes = 0;
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashDir = { x: 1, y: 0 };
    this.dashSpeed = 0;
    this.dashContactDamage = null;
    this.dashHitSet = null;
    this.timeSinceLastDash = 999;
    this.speedDebuffUntil = 0;
    this.parryActive = false; this.parryUntil = 0; this.parryShield = 0; this.parryStun = 0;
    this.dodgeUntil = 0; this.dodgeIsPerfect = false; // fenêtre d'esquive (Pas de côté, Passage...)
    this.preyTargetId = null; // Chasseur
    this.buffs = {}; // buffs temporaires génériques (ex: nextSkillMult)
    this.hitFlashTimer = 0; this.attackAnimTimer = 0;
    // ---- Génération 2 (100 compétences / 50 spécificités) : état générique ----
    this.resources = {}; // { heat:{value,max}, chargesStorage:{...}, bleedCharges:{...}, ... }
    this.actionHistory = []; // [{skillId, tags, t}] historique borné des dernières compétences utilisées
    this.distinctSkillsUsed = new Set(); // pour Archiviste (variété plutôt que spam)
    this.comboCount = 0; this.lastSkillId = null; this.lastSkillFamily = null;
    this.momentum = 0; // Momentum : monte en bougeant sans être touché, retombe à 0 si touché
    this.stillTime = 0; // temps passé immobile (Immobile)
    this.positionHistory = []; // [{x,y,t}] pour Retour / Miroir temporel
    this.anchorPos = null; // Point d'ancrage / Ancre
    this.charging = null; // { slotIndex, startTime, maxTime } pendant une charge (Tir chargé...)
    this.elementCarried = null; // statut élémentaire porté par le JOUEUR lui-même (Catalyseur vivant)
    this.linkedSummonIds = []; // invocations actives déclenchées par le joueur (Familier, Essaim spec)
    this.orbitLock = null; // { targetId, angle, radius, speed, timer } — Accroche / Orbitalité
    this.pulledTo = null; // { x, y, speed } — Crochet inversé (plante dans un mur puis tire le joueur)
    this.retournerActive = null; // projectile en vol pouvant être rappelé (Retourneur)
    this.speedBuffMult = 1; this.speedBuffTimer = 0; // Accélération
    this.phasingTimer = 0; // Passage : ignore temporairement les obstacles
    this.nextCollisionBonus = null; // Collision : bonus sur le prochain impact de dash
    this.coeurInstable = null; // { threshold, accum } — Coeur instable
  }
  get alive() { return this.hp > 0; }

  takeDamage(game, amount, opts = {}) {
    if (this.iframes > 0 || this.hp <= 0) return 0;
    let dmg = amount;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, dmg);
      this.shield -= absorbed;
      dmg -= absorbed;
      if (this.shield <= 0) game.events.emit(EVT.SHIELD_BROKEN, {});
    }
    if (dmg <= 0) return 0;
    this.hp = Math.max(0, this.hp - dmg);
    this.hitFlashTimer = 0.14;
    this.momentum = 0;
    this.comboCount = 0;
    game.events.emit(EVT.PLAYER_DAMAGED, { amount: dmg, source: opts.source });
    return dmg;
  }

  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }

  hpRatio() { return this.hp / this.maxHp; }
}

class Enemy {
  constructor(archetype, x, y, stats) {
    this.id = nextId();
    this.archetype = archetype;
    this.x = x; this.y = y;
    this.radius = stats.radius || 16;
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.speed = stats.speed;
    this.damage = stats.damage;
    this.attackRange = stats.attackRange || 34;
    this.attackCooldown = stats.attackCooldown || 1.2;
    this.attackTimer = Math.random() * 0.5;
    this.color = stats.color || '#c0392b';
    this.tags = stats.tags || [];
    this.dead = false;
    this.statuses = {};
    this.knockbackX = 0; this.knockbackY = 0;
    this.forcedTimer = 0; this.forcedTargetX = 0; this.forcedTargetY = 0; this.forcedSpeed = 0;
    this.facing = Math.random() * Math.PI * 2;
    this.animPhase = Math.random() * Math.PI * 2;
    this.hitFlashTimer = 0; this.attackAnimTimer = 0;
    this.behavior = stats.behavior || {};
    this.xpValue = stats.xpValue || 1;
    // ---- Génération 2 : jauge de rupture, liens entre ennemis, marques transférables ----
    this.ruptureGauge = 0; this.ruptureMax = 100; this.ruptured = false;
    this.linkedEnemyId = null; this.linkShareRatio = 0;
    this.frenzyTimer = 0; this.frenzyMult = 1; // Frénésie
  }
  hpRatio() { return this.hp / this.maxHp; }
}

class Projectile {
  constructor(opts) {
    this.id = nextId();
    Object.assign(this, {
      x: 0, y: 0, vx: 0, vy: 0, radius: 6, damage: 5, tags: [], pierce: 0,
      life: 1.5, color: '#fff', hitEnemies: new Set(), bounces: 0, returning: false,
      owner: 'player', onHit: null, onExpire: null, trail: [],
    }, opts);
    this.dead = false;
  }
}

class Zone {
  constructor(opts) {
    this.id = nextId();
    Object.assign(this, {
      x: 0, y: 0, radius: 60, duration: 3, elapsed: 0, tickInterval: 0.5, tickTimer: 0,
      tags: [], color: 'rgba(255,100,50,.25)', onTick: null, onEnter: null, ownerTeam: 'player',
      enteredSet: new Set(), followsPlayer: false,
      element: null, // 'eau' | 'feu' | 'glace' | 'electrique' | 'poison' | 'ombre' | 'lumiere' | 'vent' — voir Effects.applyElementToZone
      accumulated: 0, // pour les zones "Singularité"/"Distillation" qui stockent puis relâchent
    }, opts);
    this.dead = false;
  }
}

class Summon {
  constructor(opts) {
    this.id = nextId();
    Object.assign(this, {
      x: 0, y: 0, kind: 'esprit', duration: 8, elapsed: 0, radius: 12, damage: 4,
      attackCooldown: 1, attackTimer: 0, range: 140, speed: 160, color: '#ffb347', tags: [],
    }, opts);
    this.dead = false;
  }
}

class Particle {
  constructor(x, y, opts = {}) {
    this.x = x; this.y = y;
    this.vx = opts.vx || 0; this.vy = opts.vy || 0;
    this.life = opts.life || 0.5; this.maxLife = this.life;
    this.color = opts.color || '#fff';
    this.radius = opts.radius || 3;
    this.gravity = opts.gravity || 0;
  }
}
