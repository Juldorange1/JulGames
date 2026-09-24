// Generation des salles : gabarits, terrains (partie 1), tourelles, decors, validation

// Taille "concrete" (en unites du monde) des salles : volontairement petite pour un rythme dense.
// Le rendu zoome ensuite ce petit gabarit pour qu'il remplisse tout l'ecran, quelle que soit la fenetre.
const ROOM_WORLD_W = 760, ROOM_WORLD_H = 500;
const ROOM_WORLD_W_BOSS = 980, ROOM_WORLD_H_BOSS = 640;

// La salle ne doit pas remplir exactement tout l'ecran : un leger dezoom laisse deviner les
// alentours (un peu de vide/fond visible tout autour), sur toutes les salles du jeu.
const ROOM_ZOOM_MARGIN = 0.92;
function computeZoom(worldW, worldH) {
  return Math.min(CANVAS_W / worldW, CANVAS_H / worldH) * ROOM_ZOOM_MARGIN;
}
// Memorise la zone a cadrer pour pouvoir recalculer le zoom quand la fenetre change de taille.
// pad : marge cadree SOUS la carte pour voir la falaise de l'ile qui pend dans le vide.
const ISLAND_VIEW_PAD = 0; // la carte est cadree en grand et centree
function setWorldZoom(world, worldW, worldH, pad) {
  const p = pad == null ? ISLAND_VIEW_PAD : pad;
  world.islandPad = p;
  world.zoomBox = { w: worldW, h: worldH + p };
  world.zoom = computeZoom(worldW, worldH + p);
}

const TURRET_POOL_P1 = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
const TURRET_POOL_P2 = ['T2', 'T2', 'T2', 'T4', 'T4', 'T4', 'T5', 'T5', 'T5', 'T8', 'T8', 'T8', 'T10', 'T10', 'T10', 'T1', 'T3', 'T9'];
const TURRET_POOL_P3 = ['T3', 'T3', 'T3', 'T6', 'T6', 'T6', 'T7', 'T7', 'T7', 'T9', 'T9', 'T9', 'T11', 'T11', 'T11', 'T12', 'T12', 'T12', 'T1', 'T4'];

const ROOM_THEMES = {
  1: { name: 'prairie', bg: '#0c150e', floorTint: 'rgba(70,140,80,0.07)', decos: ['grass', 'grass', 'grass', 'rock'] },
  2: { name: 'usine', bg: '#0a121c', floorTint: 'rgba(80,130,180,0.06)', decos: ['pipe', 'stripe', 'stripe', 'rivet'] },
  3: { name: 'ruines', bg: '#170a08', floorTint: 'rgba(180,80,40,0.07)', decos: ['crack', 'ember', 'ember', 'ashrock'] },
};

function localPickPoint(bounds, obstacles, avoidList, margin, tries) {
  for (let t = 0; t < (tries || 80); t++) {
    const x = randRange(bounds.x + margin, bounds.x + bounds.w - margin);
    const y = randRange(bounds.y + margin, bounds.y + bounds.h - margin);
    let ok = true;
    for (const ob of obstacles) if (circleRect(x, y, margin * 0.6, ob.x, ob.y, ob.w, ob.h)) { ok = false; break; }
    if (ok) for (const a of avoidList) if (dist(x, y, a.x, a.y) < (a.r || 60)) { ok = false; break; }
    if (ok) return { x, y };
  }
  return null;
}

function makeObstacles(bounds, count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const w = randRange(40, 85), h = randRange(40, 85);
    const x = randRange(bounds.x + 90, bounds.x + bounds.w - 90 - w);
    const y = randRange(bounds.y + 90, bounds.y + bounds.h - 90 - h);
    list.push({ x, y, w, h });
  }
  return list;
}

function generateDecorations(bounds, obstacles, avoid, part, count) {
  const theme = ROOM_THEMES[part] || ROOM_THEMES[1];
  const list = [];
  for (let i = 0; i < count; i++) {
    const p = localPickPoint(bounds, obstacles, avoid, 26, 20);
    if (!p) continue;
    list.push({
      type: choice(theme.decos), x: p.x, y: p.y,
      rot: randRange(0, Math.PI * 2), scale: randRange(0.8, 1.3), seed: Math.random() * 10,
    });
  }
  return list;
}

function generateRoomLayout(part, index) {
  const isBoss = index === 10;
  const w = isBoss ? ROOM_WORLD_W_BOSS : ROOM_WORLD_W;
  const h = isBoss ? ROOM_WORLD_H_BOSS : ROOM_WORLD_H;
  const bounds = { x: -w / 2, y: -h / 2, w, h };
  const spawnPoint = { x: bounds.x + 55, y: bounds.y + bounds.h / 2 };
  const obstacles = makeObstacles(bounds, isBoss ? randInt(0, 2) : randInt(1, 3));
  const avoid = [{ x: spawnPoint.x, y: spawnPoint.y, r: 110 }];

  const terrainZones = [];
  if (part === 1 && !isBoss) {
    const count = randInt(2, 4);
    const types = pickN(TERRAIN_TYPES, count);
    for (const type of types) {
      const p = localPickPoint(bounds, obstacles, avoid, 45) || { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 };
      terrainZones.push(makeZone({
        x: p.x, y: p.y, radius: randRange(46, 66), duration: 9999, persistent: true, tickInterval: 999,
        color: terrainColor(type), edgeColor: terrainEdgeColor(type), terrainType: type,
        windAngle: randInt(0, 7) * Math.PI / 4,
      }));
      avoid.push({ x: p.x, y: p.y, r: 60 });
    }
  }

  const turretSpecs = [];
  let bossTypes = null;
  if (isBoss) {
    const pair = part === 1 ? ['B1', 'B2'] : (part === 2 ? ['B3', 'B4'] : ['B5', 'B6']);
    // Une salle de boss sur trois environ fait affronter les deux boss de la partie a la fois
    // (PV individuels reduits dans createBoss via l'option "weakened").
    bossTypes = Math.random() < 0.32 ? pair.slice() : [choice(pair)];
  } else {
    const pool = part === 1 ? TURRET_POOL_P1 : (part === 2 ? TURRET_POOL_P2 : TURRET_POOL_P3);
    const [lo, hi] = part === 2 ? [9, 13] : (part === 3 ? [4, 6] : [6, 9]);
    const n = randInt(lo, hi);
    for (let i = 0; i < n; i++) {
      const type = choice(pool);
      const p = localPickPoint(bounds, obstacles, avoid, 40, 100);
      if (!p) continue;
      turretSpecs.push({ type, x: p.x, y: p.y });
      avoid.push({ x: p.x, y: p.y, r: 62 });
    }
  }

  // Aides de deplacement (comme dans les parcours) : une paire de teleporteurs (sens unique) et
  // des trampolines qui font sauter par-dessus murs et projectiles.
  const helpers = { teleporters: [], trampolines: [] };
  const landingFree = (x, y) => x > bounds.x + 30 && x < bounds.x + bounds.w - 30 && y > bounds.y + 30 && y < bounds.y + bounds.h - 30
    && !obstacles.some((o) => circleRect(x, y, 26, o.x, o.y, o.w, o.h));
  if (Math.random() < 0.65) {
    const a = localPickPoint({ x: bounds.x, y: bounds.y, w: bounds.w * 0.5, h: bounds.h }, obstacles, avoid, 40, 60);
    const b = a && localPickPoint({ x: bounds.x + bounds.w * 0.5, y: bounds.y, w: bounds.w * 0.5, h: bounds.h }, obstacles, avoid, 40, 60);
    if (a && b) { helpers.teleporters.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y }); avoid.push({ x: a.x, y: a.y, r: 60 }, { x: b.x, y: b.y, r: 60 }); }
  }
  const nTramp = isBoss ? randInt(1, 2) : randInt(1, 3);
  for (let k = 0; k < nTramp; k++) {
    for (let t = 0; t < 20; t++) {
      const p = localPickPoint(bounds, obstacles, avoid, 36, 20);
      if (!p) break;
      const ang = randRange(0, Math.PI * 2);
      const lx = p.x + Math.cos(ang) * 210, ly = p.y + Math.sin(ang) * 210;
      if (!landingFree(lx, ly)) continue;
      helpers.trampolines.push({ x: p.x, y: p.y, lx, ly });
      avoid.push({ x: p.x, y: p.y, r: 60 });
      break;
    }
  }

  const decorations = generateDecorations(bounds, obstacles, avoid, part, isBoss ? 26 : 18);

  return {
    part, index, bounds: Object.assign({}, bounds), obstacles, terrainZones, turretSpecs, decorations,
    bossTypes, spawnPoint, isBoss, heavy: part === 3, zoom: computeZoom(w, h), helpers,
  };
}

function terrainColor(type) {
  return {
    ice: 'rgba(157,232,255,0.28)', mud: 'rgba(138,106,69,0.35)', accel: 'rgba(93,255,157,0.25)',
    slow: 'rgba(180,124,255,0.28)', damage: 'rgba(255,122,61,0.3)',
    invertH: 'rgba(255,122,209,0.25)', invertV: 'rgba(199,122,255,0.25)', wind: 'rgba(191,232,255,0.22)',
  }[type] || COLORS.danger;
}
function terrainEdgeColor(type) {
  return {
    ice: COLORS.ice, mud: COLORS.mud, accel: COLORS.accel, slow: COLORS.slow, damage: COLORS.dmgZone,
    invertH: COLORS.invertH, invertV: COLORS.invertV, wind: COLORS.wind,
  }[type] || COLORS.dangerEdge;
}

function terrainLabel(type) {
  return {
    ice: 'Glace', mud: 'Boue', accel: 'Accelerateur', slow: 'Ralentisseur', damage: 'Zone de degats',
    invertH: 'Inversion horizontale', invertV: 'Inversion verticale', wind: 'Vent',
  }[type] || type;
}

function instantiateRoom(world, layout) {
  const room = {
    bounds: Object.assign({}, layout.bounds), obstacles: layout.obstacles,
    terrainZones: layout.terrainZones.map((z) => Object.assign({}, z, { id: uid() })),
    part: layout.part, index: layout.index, isBoss: layout.isBoss,
    // memes objets que les parcours (logique/rendu dans parkour.js), sans pieges ni boosts
    parkour: layout.helpers ? {
      time: 0, spikes: [], lasers: [], boosts: [], shooters: [],
      teleporters: layout.helpers.teleporters, trampolines: layout.helpers.trampolines.map((t) => Object.assign({}, t)),
    } : null,
  };
  world.room = room;
  world.noFollow = true; // Monde : la camera ne suit jamais le personnage
  world.enemies = [];
  world.projectiles = [];
  world.zones = [];
  world.walls = [];
  world.shields = [];
  world.mines = [];
  world.winds = [];
  world.meteors = []; world.hazards = [];
  world.decorations = layout.decorations || [];
  world.theme = ROOM_THEMES[layout.part] || ROOM_THEMES[1];
  setWorldZoom(world, layout.bounds.w, layout.bounds.h);

  for (const spec of layout.turretSpecs) {
    const t = createTurret(spec.type, spec.x, spec.y);
    if (layout.heavy) { t.hp *= 1.8; t.maxHp = t.hp; t.fireRateMult = (t.fireRateMult || 1) * 1.25; }
    if (spec.type === 'T6') t.railPath = [{ x: spec.x - 110, y: spec.y }, { x: spec.x + 110, y: spec.y }];
    world.enemies.push(t);
  }
  if (layout.bossTypes && layout.bossTypes.length) {
    const double = layout.bossTypes.length > 1;
    if (double) {
      const off = room.bounds.w * 0.24;
      const cy = room.bounds.y + room.bounds.h / 2 - 70;
      world.enemies.push(createBoss(layout.bossTypes[0], room, { weakened: true, x: room.bounds.x + room.bounds.w / 2 - off, y: cy }));
      world.enemies.push(createBoss(layout.bossTypes[1], room, { weakened: true, x: room.bounds.x + room.bounds.w / 2 + off, y: cy }));
    } else {
      world.enemies.push(createBoss(layout.bossTypes[0], room));
    }
  }
  room.requiredKills = world.enemies.length;
  return room;
}
