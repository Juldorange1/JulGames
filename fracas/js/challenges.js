// Les 11 defis (un par personnage) : entierement predefinis (positions en fractions de l'ecran), aucun hasard

const SPAWN_FRAC = { fx: 0.078, fy: 0.5 };

// abilityGate : le defi ne rend disponible qu'UNE seule des 3 competences du personnage
// (choisie pour coller au theme du defi) ; bossType (optionnel) ajoute un boss affaibli au combat
// pour les defis les plus longs.
const CHALLENGE_DEFS = [
  {
    id: 1, characterId: 1, title: 'Demonstration du systeme de degats',
    desc: 'Detruis les cibles fixes puis les tourelles pour comprendre la perte de multiplicateur.',
    theme: 1, abilityGate: 3, speed: 1.1,
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
    theme: 2, abilityGate: 1, speed: 1.1,
    obstacles: [{ fx: 0.444, fy: 0.333, fw: 0.078, fh: 0.333 }],
    turretSpecs: [
      { type: 'T1', fx: 0.222, fy: 0.167 }, { type: 'T1', fx: 0.911, fy: 0.167 },
      { type: 'T1', fx: 0.222, fy: 0.833 }, { type: 'T1', fx: 0.911, fy: 0.833 },
    ],
  },
  {
    id: 3, characterId: 3, title: 'Optimisation du boomerang',
    desc: 'Utilise la surcharge pour accelerer et alourdir tes boomerangs.',
    theme: 3, abilityGate: 1, speed: 1.1,
    obstacles: [],
    turretSpecs: [
      { type: 'T2', fx: 0.333, fy: 0.25 }, { type: 'T2', fx: 0.667, fy: 0.5 },
      { type: 'T2', fx: 0.333, fy: 0.75 },
    ],
  },
  {
    id: 4, characterId: 4, title: 'Positionnement des quatre boules',
    desc: 'Place tes orbes de feu au contact des tourelles disposees en cercle.',
    theme: 1, abilityGate: 2, speed: 1.1,
    obstacles: [],
    turretSpecs: [
      { type: 'T4', fx: 0.5, fy: 0.2 }, { type: 'T4', fx: 0.778, fy: 0.5 },
      { type: 'T4', fx: 0.5, fy: 0.8 }, { type: 'T4', fx: 0.244, fy: 0.5 },
    ],
  },
  {
    id: 5, characterId: 5, title: 'Ricochets',
    desc: 'Fais rebondir ton projectile sur les murs et les tourelles pour cumuler les degats. Un boss affaibli rejoint le combat.',
    theme: 2, abilityGate: 3, speed: 1.1, bossType: 'B3',
    obstacles: [{ fx: 0.611, fy: 0.2, fw: 0.067, fh: 0.167 }, { fx: 0.611, fy: 0.633, fw: 0.067, fh: 0.167 }],
    turretSpecs: [
      { type: 'T9', fx: 0.867, fy: 0.25 }, { type: 'T9', fx: 0.867, fy: 0.75 },
      { type: 'T1', fx: 0.444, fy: 0.5 },
    ],
  },
  {
    id: 6, characterId: 6, title: 'Charge de meteorite',
    desc: 'Charge ton attaque au maximum avant de la relacher sur les tourelles lointaines.',
    theme: 3, abilityGate: 3, speed: 1.1,
    obstacles: [],
    turretSpecs: [
      { type: 'T1', fx: 0.911, fy: 0.25 }, { type: 'T1', fx: 0.911, fy: 0.5 },
      { type: 'T1', fx: 0.911, fy: 0.75 },
    ],
  },
  {
    id: 7, characterId: 7, title: 'Utilisation de l\'historique de position',
    desc: 'Deplace-toi puis frappe les positions passees pour toucher les tourelles.',
    theme: 1, abilityGate: 1, speed: 1.1,
    obstacles: [{ fx: 0.467, fy: 0.417, fw: 0.1, fh: 0.15 }],
    turretSpecs: [
      { type: 'T3', fx: 0.333, fy: 0.25 }, { type: 'T3', fx: 0.333, fy: 0.75 },
      { type: 'T1', fx: 0.778, fy: 0.5 },
    ],
  },
  {
    id: 8, characterId: 8, title: 'Poussee et collisions',
    desc: 'Repousse les tourelles contre les obstacles pour les detruire plus vite. Un boss affaibli rejoint le combat.',
    theme: 2, abilityGate: 2, speed: 1.1, bossType: 'B5',
    obstacles: [{ fx: 0.333, fy: 0.167, fw: 0.056, fh: 0.667 }, { fx: 0.778, fy: 0.167, fw: 0.056, fh: 0.667 }],
    turretSpecs: [
      { type: 'T2', fx: 0.422, fy: 0.333 }, { type: 'T2', fx: 0.689, fy: 0.667 },
      { type: 'T2', fx: 0.556, fy: 0.5 },
    ],
  },
  {
    id: 9, characterId: 10, title: 'Gestion des deux orbes',
    desc: 'Alterne les deux charges de tes orbes pour maintenir un rythme d\'attaque.',
    theme: 3, abilityGate: 1, speed: 1.1,
    obstacles: [],
    turretSpecs: [
      { type: 'T5', fx: 0.333, fy: 0.333 }, { type: 'T5', fx: 0.778, fy: 0.333 },
      { type: 'T5', fx: 0.556, fy: 0.75 },
    ],
  },
  {
    id: 10, characterId: 11, title: 'Utilisation des vents',
    desc: 'Pousse les tourelles contre les murs avec le vent puissant.',
    theme: 1, abilityGate: 2, speed: 1.1,
    obstacles: [{ fx: 0.722, fy: 0.167, fw: 0.067, fh: 0.667 }],
    turretSpecs: [
      { type: 'T4', fx: 0.556, fy: 0.3 }, { type: 'T4', fx: 0.556, fy: 0.7 },
      { type: 'T11', fx: 0.278, fy: 0.5 },
    ],
  },
  {
    id: 11, characterId: 9, title: 'Traque et esquive',
    desc: 'Reste a portee pour faire ticker ton aura de proximite, puis esquive au dash entre les tourelles. Un boss affaibli rejoint le combat.',
    theme: 2, abilityGate: 2, speed: 1.1, bossType: 'B1',
    obstacles: [{ fx: 0.46, fy: 0.44, fw: 0.08, fh: 0.12 }],
    turretSpecs: [
      { type: 'T1', fx: 0.5, fy: 0.15 }, { type: 'T1', fx: 0.82, fy: 0.5 },
      { type: 'T1', fx: 0.5, fy: 0.85 }, { type: 'T1', fx: 0.2, fy: 0.5 },
    ],
  },
];

const CHALLENGE_ROOMS = 3; // chaque defi : 3 salles, une competence differente dans chacune
// Competence autorisee dans la salle n : on part de celle du defi puis on tourne (C1 -> C2 -> C3).
function challengeRoomGate(def, roomNum) {
  const g0 = def.abilityGate || 1;
  return ((g0 - 1 + roomNum - 1) % 3) + 1;
}
const CHALLENGE_HP_MULT = 1.6; // defis plus durs : tourelles/boss plus resistants qu'en expedition

// Difficulte homogene : chaque salle de defi officiel est completee par des renforts jusqu'a un
// meme "budget de menace", ajuste a la puissance du personnage impose.
const TURRET_THREAT = { DUMMY: 0.2, T1: 1, T2: 1.2, T3: 1.4, T4: 1.1, T5: 1.3, T6: 1.1, T7: 1.2, T8: 1.5, T9: 1.2, T10: 1.3, T11: 1.2, T12: 1.4 };
const BOSS_THREAT = 4.5;
const CHALLENGE_THREAT_BUDGET = 9;
const CHALLENGE_CHAR_POWER = { 1: 1.15, 2: 1, 3: 0.95, 4: 1.15, 5: 0.9, 6: 0.95, 7: 1.05, 8: 0.9, 9: 1, 10: 1, 11: 0.85 };

const Challenges = {
  active: false,
  id: null,
  elapsedMs: 0,
  finished: false,
  newRecord: false,
  // Chaque defi se deroule en 2 salles : la 2e (disposition miroir + renforts, boss eventuel)
  // se charge derriere un fondu noir, comme en expedition. Le chrono continue entre les deux.
  roomNum: 1,
  transitionTimer: 0,
  transitionPhase: null, // null | 'out' | 'in'
  transitionDuration: 0.32,

  get(id) {
    if (typeof id === 'string' && /^P\d+$/.test(id)) {
      const pk = PARKOUR_DEFS.find((d) => d.id === id);
      return pk ? Object.assign({ parkour: true, abilityGate: 1 }, pk) : null;
    }
    const custom = Save.getCustomChallenge(id);
    if (custom && custom.parkour) {
      return {
        // les anciens parcours perso utilisaient des persos normaux : on bascule sur Orbis
        id: custom.id, custom: true, parkour: true, characterId: (getCharacter(custom.characterId) || {}).parkourOnly ? custom.characterId : 12, abilityGate: 1,
        theme: custom.theme, title: custom.name, desc: '', length: custom.length, density: custom.density,
        zones: custom.zones || [], enemies: custom.enemies || {}, seed: custom.seed, extras: custom.extras || [],
        manual: !!custom.manual, straight: !!custom.straight, shapeSeed: custom.shapeSeed, items: custom.items || [], speed: custom.speed || 1,
      };
    }
    if (custom) {
      return {
        id: custom.id, custom: true, characterId: custom.characterId, abilityGate: custom.abilityGate,
        theme: custom.theme, title: custom.name, desc: '', obstacles: [], turretSpecs: [],
        enemies: custom.enemies, bossType: custom.bossType, placed: custom.placed || null, speed: custom.speed || 1,
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
    this.roomNum = 1;
    this.transitionTimer = 0;
    this.transitionPhase = null;
    this.load(world, def, 1);
  },

  restart(world) { this.start(world, this.id); },

  // Salle 2 d'un defi officiel : disposition en miroir vertical, et les cibles fixes
  // (DUMMY) deviennent de vraies tourelles.
  mirrorDef(def) {
    return Object.assign({}, def, {
      obstacles: def.obstacles.map((o) => ({ fx: o.fx, fy: 1 - o.fy - o.fh, fw: o.fw, fh: o.fh })),
      turretSpecs: def.turretSpecs.map((t) => ({ type: t.type === 'DUMMY' ? 'T1' : t.type, fx: t.fx, fy: 1 - t.fy })),
    });
  },

  // Parcours : une seule longue salle, arrivee a droite, jeu accelere, degats -> vitesse.
  loadParkour(world, def) {
    // parcours perso de l'editeur : trace vide + elements places a la main
    const L = def.manual
      ? buildParkourLayout({ seed: def.shapeSeed, length: def.length, straight: def.straight, contentless: true })
      : buildParkourLayout(def);
    applyParkourExtras(L, def.manual ? def.items : def.extras);
    const room = {
      bounds: L.bounds, obstacles: L.obstacles,
      terrainZones: L.zones.map((z) => makeZone({
        x: z.x, y: z.y, radius: z.radius, duration: 9999, persistent: true, tickInterval: 999,
        color: terrainColor(z.type), edgeColor: terrainEdgeColor(z.type), terrainType: z.type, windAngle: z.windAngle, id: uid(),
      })),
      part: 0, index: 0, isBoss: false, challengeRoom: 1,
      parkourGoal: Object.assign({ dir: L.goalDir }, L.goal), parkourStart: L.start,
      floorRects: L.rects.map((r) => Object.assign({}, r)), // sol calcule par troncon (parcours tres grands)
    };
    world.room = room;
    world.noFollow = false;
    world.enemies = [];
    world.projectiles = []; world.zones = []; world.walls = []; world.shields = [];
    world.mines = []; world.winds = []; world.meteors = []; world.hazards = [];
    // 2 competences : l'attaque + la touche de competence unique (competence 1)
    world.abilityGate = 1;
    world.hubDoors = null;
    world.onEnemyKilled = null;
    world.theme = ROOM_THEMES[def.theme] || ROOM_THEMES[1];
    // Vue plus rapprochee que la salle : la camera suit le joueur le long du parcours.
    setWorldZoom(world, 1000, PARKOUR_HEIGHT + 60, 0);
    world.userSpeedMult = PARKOUR_SPEED_MULT * (def.speed || 1); // vitesse fixee par le parcours
    // Aucun ennemi dans les parcours : seulement des pieges et des aides.
    room.parkour = {
      time: 0, spikes: L.spikes, lasers: L.lasers, trampolines: L.trampolines,
      boosts: L.boosts.map((b) => ({ x: b.x, y: b.y, taken: false })), teleporters: L.teleporters,
      shooters: L.shooters.map((sh) => Object.assign({}, sh, { fired: [] })),
    };
    world.decorations = generateDecorations(L.bounds, L.obstacles, [{ x: L.start.x, y: L.start.y, r: 80 }], def.theme, Math.round(L.bounds.w / 60));
    room.requiredKills = 0;
    world.player.x = L.start.x; world.player.y = L.start.y;
    world.player.parkour = true;
    world.player.parkourSpeed = 1;
    this.progress = 0;
    this.halfHealed = false;
    this.layout = L;
    Game.updateCamera(1);
  },

  // Defi perso construit dans l'editeur : positions exactes ; salle 2 = miroir vertical + boss.
  loadPlaced(world, def, roomNum) {
    const w = COMBAT_ROOM_W, h = COMBAT_ROOM_H;
    const bounds = { x: -w / 2, y: -h / 2, w, h };
    const mir = roomNum === 2;
    // positions ramenees dans la salle (les anciens defis perso etaient faits pour une salle plus grande)
    const cx = (x) => clamp(x, bounds.x + 30, bounds.x + w - 30), cy = (y) => clamp(y, bounds.y + 30, bounds.y + h - 30);
    const my = (y) => cy(mir ? -y : y);
    const raw = def.placed;
    const pl = {
      enemies: raw.enemies.map((e) => ({ type: e.type, x: cx(e.x), y: e.y })),
      boss: raw.boss ? { type: raw.boss.type, x: cx(raw.boss.x), y: raw.boss.y } : null,
      obstacles: raw.obstacles.filter((o) => o.x > bounds.x - 20 && o.x + o.w < bounds.x + w + 20 && o.y > bounds.y - 20 && o.y + o.h < bounds.y + h + 20),
      zones: (raw.zones || []).map((z) => Object.assign({}, z, { x: cx(z.x) })),
      teleporters: (raw.teleporters || []).map((t) => ({ ax: cx(t.ax), ay: t.ay, bx: cx(t.bx), by: t.by })),
      trampolines: (raw.trampolines || []).map((t) => ({ x: cx(t.x), y: t.y, lx: cx(t.lx), ly: t.ly })),
    };
    const room = {
      bounds, obstacles: pl.obstacles.map((o) => ({ x: o.x, y: mir ? -(o.y + o.h) : o.y, w: o.w, h: o.h })),
      terrainZones: (pl.zones || []).map((z) => editorZone(Object.assign({}, z, { y: my(z.y), windAngle: mir ? -(z.windAngle || 0) : (z.windAngle || 0) }))),
      part: 0, index: 0, isBoss: false, challengeRoom: roomNum,
      parkour: {
        time: 0, spikes: [], lasers: [], boosts: [], shooters: [],
        teleporters: (pl.teleporters || []).map((t) => ({ ax: t.ax, ay: my(t.ay), bx: t.bx, by: my(t.by) })),
        trampolines: (pl.trampolines || []).map((t) => ({ x: t.x, y: my(t.y), lx: t.lx, ly: my(t.ly) })),
      },
    };
    world.room = room;
    world.noFollow = false;
    world.enemies = [];
    world.projectiles = []; world.zones = []; world.walls = []; world.shields = [];
    world.mines = []; world.winds = []; world.meteors = []; world.hazards = [];
    world.abilityGate = challengeRoomGate(def, roomNum);
    world.hubDoors = null;
    world.onEnemyKilled = null;
    world.theme = ROOM_THEMES[def.theme] || ROOM_THEMES[1];
    setWorldZoom(world, w, h);
    world.userSpeedMult = def.speed || 1; // vitesse fixee par le defi
    for (const e of pl.enemies) {
      const t = createTurret(e.type, e.x, my(e.y));
      t.hp *= CHALLENGE_HP_MULT; t.maxHp = t.hp;
      if (e.type === 'T6') t.railPath = [{ x: e.x - 110, y: my(e.y) }, { x: e.x + 110, y: my(e.y) }];
      world.enemies.push(t);
    }
    if (pl.boss && (roomNum === CHALLENGE_ROOMS || !pl.enemies.length)) world.enemies.push(createBoss(pl.boss.type, room, { weakened: true, x: pl.boss.x, y: my(pl.boss.y) }));
    const spawn = { x: bounds.x + SPAWN_FRAC.fx * w, y: bounds.y + SPAWN_FRAC.fy * h };
    world.decorations = generateDecorations(bounds, room.obstacles, [{ x: spawn.x, y: spawn.y, r: 130 }], def.theme, 22);
    room.requiredKills = world.enemies.length;
    world.player.x = spawn.x; world.player.y = spawn.y;
    Game.updateCamera(1);
  },

  load(world, def, roomNum) {
    if (def.parkour) { this.loadParkour(world, def); return; }
    if (def.placed) { this.loadPlaced(world, def, roomNum); return; }
    if (roomNum === 2 && !def.custom) def = this.mirrorDef(def);
    // Salles de taille moderee (3 salles par defi).
    const w = COMBAT_ROOM_W, h = COMBAT_ROOM_H;
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
      part: 0, index: def.id, isBoss: false, challengeRoom: roomNum,
    };
    world.room = room;
    world.noFollow = false;
    world.enemies = [];
    world.projectiles = []; world.zones = []; world.walls = []; world.shields = [];
    world.mines = []; world.winds = []; world.meteors = []; world.hazards = [];
    // Une seule competence par salle, differente dans chacune des 3 salles.
    world.abilityGate = challengeRoomGate(def, roomNum);
    world.hubDoors = null;
    world.onEnemyKilled = null; // seule la fin du defi (Challenges.update) verse la recompense
    world.theme = ROOM_THEMES[def.theme] || ROOM_THEMES[1];
    setWorldZoom(world, w, h);
    world.userSpeedMult = def.speed || 1; // vitesse fixee par le defi

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
    if (!def.custom) {
      const budget = CHALLENGE_THREAT_BUDGET * (CHALLENGE_CHAR_POWER[def.characterId] || 1);
      let threat = world.enemies.reduce((a, e) => a + (TURRET_THREAT[e.type] || 1), 0) + (def.bossType && roomNum === CHALLENGE_ROOMS ? BOSS_THREAT : 0);
      for (let guard = 0; threat < budget && guard < 20; guard++) {
        const p = localPickPoint(bounds, obstacles, avoid, 45, 60);
        if (!p) break;
        const type = choice(extraPool);
        const t = createTurret(type, p.x, p.y);
        t.hp *= CHALLENGE_HP_MULT; t.maxHp = t.hp;
        world.enemies.push(t);
        avoid.push({ x: p.x, y: p.y, r: 62 });
        threat += TURRET_THREAT[type] || 1;
      }
    }

    // Le boss eventuel n'apparait que dans la derniere salle.
    if (def.bossType && roomNum === CHALLENGE_ROOMS) {
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
    if (this.transitionPhase === 'out') {
      this.transitionTimer -= realDt;
      if (this.transitionTimer <= 0) {
        this.roomNum += 1;
        this.load(world, this.get(this.id), this.roomNum);
        this.transitionPhase = 'in';
        this.transitionTimer = this.transitionDuration;
      }
      return;
    }
    if (this.transitionPhase === 'in') {
      this.transitionTimer -= realDt;
      if (this.transitionTimer <= 0) { this.transitionTimer = 0; this.transitionPhase = null; }
      return;
    }
    const cur = this.get(this.id);
    if (cur && cur.parkour) {
      const pl = world.player;
      if (pl) this.progress = Math.max(this.progress || 0, parkourProgress(this.layout, pl.x, pl.y));
      // Mi-parcours : +25% de vitesse rendus automatiquement (une seule fois)
      if (!this.halfHealed && this.progress >= 0.5 && world.player) {
        this.halfHealed = true;
        playerHeal(world.player, PARKOUR_HALF_HEAL);
        Particles.text(world.player.x, world.player.y - 34, S('parkourHalfHeal'), '#7fff9c');
        Particles.ring(world.player.x, world.player.y, 34, '#7fff9c', 0.4);
      }
      const g = this.layout.goal;
      if (pl && circleRect(pl.x, pl.y, pl.radius, g.x, g.y, g.w, g.h)) {
        this.finished = true;
        this.newRecord = Save.submitChallengeRecord(this.id, this.elapsedMs);
        if (!cur.custom) Save.addMoneyForChar(cur.characterId, CHALLENGE_REWARD);
        if (this.newRecord) Audio2.record();
      }
      return;
    }
    const allDead = world.enemies.length > 0 && world.enemies.every((e) => e.dead);
    if (allDead && this.roomNum < CHALLENGE_ROOMS) {
      if (world.player) playerHeal(world.player, 6);
      this.transitionPhase = 'out';
      this.transitionTimer = this.transitionDuration;
      return;
    }
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
