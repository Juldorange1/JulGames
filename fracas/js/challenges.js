// Les 11 defis (un par personnage) : entierement predefinis (positions en fractions de l'ecran), aucun hasard

const SPAWN_FRAC = { fx: 0.078, fy: 0.5 };

// abilityGate : le defi ne rend disponible qu'UNE seule des 3 competences du personnage
// (choisie pour coller au theme du defi) ; bossType (optionnel) ajoute un boss affaibli au combat
// pour les defis les plus longs.
const CHALLENGE_DEFS = [
  {
    id: 1, characterId: 1, title: 'Demonstration du systeme de degats',
    desc: 'Detruis les cibles fixes puis les tourelles pour comprendre la perte de multiplicateur.',
    theme: 1, abilityGate: 3,
    obstacles: [],
    turretSpecs: [
      { type: 'DUMMY', fx: 0.278, fy: 0.25 }, { type: 'DUMMY', fx: 0.278, fy: 0.75 },
      { type: 'DUMMY', fx: 0.722, fy: 0.25 }, { type: 'DUMMY', fx: 0.722, fy: 0.75 },
      { type: 'T1', fx: 0.867, fy: 0.333 }, { type: 'T1', fx: 0.867, fy: 0.667 },
    ],
  },
  {
    id: 2, characterId: 2, title: 'Optimisation de teleportation',
    desc: 'Enchaine les teleportations offensives pour rejoindre les tourelles eloignees.',
    theme: 2, abilityGate: 1,
    obstacles: [{ fx: 0.444, fy: 0.333, fw: 0.078, fh: 0.333 }],
    turretSpecs: [
      { type: 'T1', fx: 0.222, fy: 0.167 }, { type: 'T1', fx: 0.911, fy: 0.167 },
      { type: 'T1', fx: 0.222, fy: 0.833 }, { type: 'T1', fx: 0.911, fy: 0.833 },
    ],
  },
  {
    id: 3, characterId: 3, title: 'Optimisation du boomerang',
    desc: 'Utilise la surcharge pour accelerer et alourdir tes boomerangs.',
    theme: 3, abilityGate: 1,
    obstacles: [],
    turretSpecs: [
      { type: 'T2', fx: 0.333, fy: 0.25 }, { type: 'T2', fx: 0.667, fy: 0.5 },
      { type: 'T2', fx: 0.333, fy: 0.75 },
    ],
  },
  {
    id: 4, characterId: 4, title: 'Positionnement des quatre boules',
    desc: 'Place tes orbes de feu au contact des tourelles disposees en cercle.',
    theme: 1, abilityGate: 2,
    obstacles: [],
    turretSpecs: [
      { type: 'T4', fx: 0.5, fy: 0.2 }, { type: 'T4', fx: 0.778, fy: 0.5 },
      { type: 'T4', fx: 0.5, fy: 0.8 }, { type: 'T4', fx: 0.244, fy: 0.5 },
    ],
  },
  {
    id: 5, characterId: 5, title: 'Ricochets',
    desc: 'Fais rebondir ton projectile sur les murs et les tourelles pour cumuler les degats. Un boss affaibli rejoint le combat.',
    theme: 2, abilityGate: 3, bossType: 'B3',
    obstacles: [{ fx: 0.611, fy: 0.2, fw: 0.067, fh: 0.167 }, { fx: 0.611, fy: 0.633, fw: 0.067, fh: 0.167 }],
    turretSpecs: [
      { type: 'T9', fx: 0.867, fy: 0.25 }, { type: 'T9', fx: 0.867, fy: 0.75 },
      { type: 'T1', fx: 0.444, fy: 0.5 },
    ],
  },
  {
    id: 6, characterId: 6, title: 'Charge de meteorite',
    desc: 'Charge ton attaque au maximum avant de la relacher sur les tourelles lointaines.',
    theme: 3, abilityGate: 3,
    obstacles: [],
    turretSpecs: [
      { type: 'T1', fx: 0.911, fy: 0.25 }, { type: 'T1', fx: 0.911, fy: 0.5 },
      { type: 'T1', fx: 0.911, fy: 0.75 },
    ],
  },
  {
    id: 7, characterId: 7, title: 'Utilisation de l\'historique de position',
    desc: 'Deplace-toi puis frappe les positions passees pour toucher les tourelles.',
    theme: 1, abilityGate: 1,
    obstacles: [{ fx: 0.467, fy: 0.417, fw: 0.1, fh: 0.15 }],
    turretSpecs: [
      { type: 'T3', fx: 0.333, fy: 0.25 }, { type: 'T3', fx: 0.333, fy: 0.75 },
      { type: 'T1', fx: 0.778, fy: 0.5 },
    ],
  },
  {
    id: 8, characterId: 8, title: 'Poussee et collisions',
    desc: 'Repousse les tourelles contre les obstacles pour les detruire plus vite. Un boss affaibli rejoint le combat.',
    theme: 2, abilityGate: 2, bossType: 'B5',
    obstacles: [{ fx: 0.333, fy: 0.167, fw: 0.056, fh: 0.667 }, { fx: 0.778, fy: 0.167, fw: 0.056, fh: 0.667 }],
    turretSpecs: [
      { type: 'T2', fx: 0.422, fy: 0.333 }, { type: 'T2', fx: 0.689, fy: 0.667 },
      { type: 'T2', fx: 0.556, fy: 0.5 },
    ],
  },
  {
    id: 9, characterId: 10, title: 'Gestion des deux orbes',
    desc: 'Alterne les deux charges de tes orbes pour maintenir un rythme d\'attaque.',
    theme: 3, abilityGate: 1,
    obstacles: [],
    turretSpecs: [
      { type: 'T5', fx: 0.333, fy: 0.333 }, { type: 'T5', fx: 0.778, fy: 0.333 },
      { type: 'T5', fx: 0.556, fy: 0.75 },
    ],
  },
  {
    id: 10, characterId: 11, title: 'Utilisation des vents',
    desc: 'Pousse les tourelles contre les murs avec le vent puissant.',
    theme: 1, abilityGate: 2,
    obstacles: [{ fx: 0.722, fy: 0.167, fw: 0.067, fh: 0.667 }],
    turretSpecs: [
      { type: 'T4', fx: 0.556, fy: 0.3 }, { type: 'T4', fx: 0.556, fy: 0.7 },
      { type: 'T11', fx: 0.278, fy: 0.5 },
    ],
  },
  {
    id: 11, characterId: 9, title: 'Traque et esquive',
    desc: 'Reste a portee pour faire ticker ton aura de proximite, puis esquive au dash entre les tourelles. Un boss affaibli rejoint le combat.',
    theme: 2, abilityGate: 2, bossType: 'B1',
    obstacles: [{ fx: 0.46, fy: 0.44, fw: 0.08, fh: 0.12 }],
    turretSpecs: [
      { type: 'T1', fx: 0.5, fy: 0.15 }, { type: 'T1', fx: 0.82, fy: 0.5 },
      { type: 'T1', fx: 0.5, fy: 0.85 }, { type: 'T1', fx: 0.2, fy: 0.5 },
    ],
  },
];

const CHALLENGE_HP_MULT = 1.6; // defis plus durs : tourelles/boss plus resistants qu'en expedition

const Challenges = {
  active: false,
  id: null,
  elapsedMs: 0,
  finished: false,
  newRecord: false,

  get(id) {
    const custom = Save.getCustomChallenge(id);
    if (custom) {
      return {
        id: custom.id, custom: true, characterId: custom.characterId, abilityGate: custom.abilityGate,
        theme: custom.theme, title: custom.name, desc: '', obstacles: [], turretSpecs: [],
        enemies: custom.enemies, bossType: custom.bossType,
      };
    }
    return CHALLENGE_DEFS.find((c) => c.id === id);
  },

  start(world, id) {
    const def = this.get(id);
    if (!def) return;
    this.active = true;
    this.id = id;
    this.elapsedMs = 0;
    this.finished = false;
    this.newRecord = false;
    this.load(world, def);
  },

  restart(world) { this.start(world, this.id); },

  load(world, def) {
    // Salle agrandie par rapport a l'expedition : les defis sont volontairement plus longs.
    const w = 1300, h = 850;
    const bounds = { x: -w / 2, y: -h / 2, w, h };
    const toX = (fx) => bounds.x + fx * bounds.w;
    const toY = (fy) => bounds.y + fy * bounds.h;
    const spawn = { x: toX(SPAWN_FRAC.fx), y: toY(SPAWN_FRAC.fy) };
    const obstacles = def.custom
      ? makeObstacles(bounds, 3).filter((ob) => !circleRect(spawn.x, spawn.y, 80, ob.x, ob.y, ob.w, ob.h))
      : def.obstacles.map((o) => ({ x: toX(o.fx), y: toY(o.fy), w: o.fw * bounds.w, h: o.fh * bounds.h }));
    const avoid = [{ x: spawn.x, y: spawn.y, r: 130 }];
    for (const spec of def.turretSpecs) avoid.push({ x: toX(spec.fx), y: toY(spec.fy), r: 70 });

    const room = {
      bounds, obstacles,
      terrainZones: (def.terrainZones || []).map((z) => makeZone(Object.assign({}, z, { id: uid() }))),
      part: 0, index: def.id, isBoss: false,
    };
    world.room = room;
    world.enemies = [];
    world.projectiles = []; world.zones = []; world.walls = []; world.shields = [];
    world.mines = []; world.winds = []; world.meteors = [];
    // Une seule des 3 competences est disponible pendant le defi (celle choisie par le defi).
    world.abilityGate = def.abilityGate || null;
    world.hubDoors = null;
    world.onEnemyKilled = null; // seule la fin du defi (Challenges.update) verse la recompense
    world.theme = ROOM_THEMES[def.theme] || ROOM_THEMES[1];
    world.zoom = computeZoom(w, h);

    for (const spec of def.turretSpecs) {
      const t = createTurret(spec.type, toX(spec.fx), toY(spec.fy));
      if (spec.type !== 'DUMMY') { t.hp *= CHALLENGE_HP_MULT; t.maxHp = t.hp; }
      world.enemies.push(t);
    }

    // Defi personnalise : exactement les ennemis choisis par le joueur, places aleatoirement.
    if (def.custom) {
      for (const [type, count] of Object.entries(def.enemies || {})) {
        for (let i = 0; i < count; i++) {
          const p = localPickPoint(bounds, obstacles, avoid, 45, 80);
          if (!p) continue;
          const t = createTurret(type, p.x, p.y);
          t.hp *= CHALLENGE_HP_MULT; t.maxHp = t.hp;
          if (type === 'T6') t.railPath = [{ x: p.x - 110, y: p.y }, { x: p.x + 110, y: p.y }];
          world.enemies.push(t);
          avoid.push({ x: p.x, y: p.y, r: 62 });
        }
      }
    }

    // Renforts supplementaires (defis plus longs) : reprend les types deja presents du defi,
    // positionnes automatiquement dans la salle agrandie.
    const nonDummyTypes = def.turretSpecs.filter((s) => s.type !== 'DUMMY').map((s) => s.type);
    const extraPool = nonDummyTypes.length ? nonDummyTypes : ['T1'];
    const extraCount = def.custom ? 0 : Math.max(2, Math.ceil(nonDummyTypes.length * 0.7));
    for (let i = 0; i < extraCount; i++) {
      const p = localPickPoint(bounds, obstacles, avoid, 45, 60);
      if (!p) continue;
      const t = createTurret(choice(extraPool), p.x, p.y);
      t.hp *= CHALLENGE_HP_MULT; t.maxHp = t.hp;
      world.enemies.push(t);
      avoid.push({ x: p.x, y: p.y, r: 62 });
    }

    if (def.bossType) {
      world.enemies.push(createBoss(def.bossType, room, { weakened: true }));
    }

    world.decorations = generateDecorations(bounds, obstacles, avoid, def.theme, 22);
    room.requiredKills = world.enemies.length;
    world.player.x = spawn.x; world.player.y = spawn.y;
    Game.updateCamera(1);
  },

  update(world, realDt) {
    if (!this.active || this.finished) return;
    this.elapsedMs += realDt * 1000;
    const allDead = world.enemies.length > 0 && world.enemies.every((e) => e.dead);
    if (allDead) {
      this.finished = true;
      this.newRecord = Save.submitChallengeRecord(this.id, this.elapsedMs);
      const def = this.get(this.id);
      // Les defis personnalises enregistrent un record mais ne rapportent jamais d'argent.
      if (!def.custom) Save.addMoneyForChar(def.characterId, CHALLENGE_REWARD);
      if (this.newRecord) Audio2.record();
    }
  },
};
