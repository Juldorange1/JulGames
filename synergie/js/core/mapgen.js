// Génération de carte. Chaque combat choisit une des structures ci-dessous ; les
// obstacles bloquent joueur/ennemis (collision simple) et les projectiles (destruction
// à l'impact), ce qui influence réellement le gameplay (couloirs de tir, abris...).
// Cartes 30% plus petites que la version initiale (1500x950) : combats plus denses.
const MAP_W = 1050, MAP_H = 665;

function rectObstacle(x, y, w, h) { return { shape: 'rect', x, y, w, h }; }
function circleObstacle(x, y, r) { return { shape: 'circle', x, y, r }; }

const MAP_STRUCTURES = {
  arene_ouverte(rng) {
    const obs = [];
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) obs.push(circleObstacle(200 + rng() * (MAP_W - 400), 150 + rng() * (MAP_H - 300), 30 + rng() * 25));
    return obs;
  },
  couloirs(rng) {
    const obs = [];
    obs.push(rectObstacle(0, MAP_H * 0.33, MAP_W * 0.62, 26));
    obs.push(rectObstacle(MAP_W * 0.38, MAP_H * 0.66, MAP_W * 0.62, 26));
    obs.push(rectObstacle(MAP_W * 0.3, MAP_H * 0.1, 26, MAP_H * 0.25));
    obs.push(rectObstacle(MAP_W * 0.68, MAP_H * 0.62, 26, MAP_H * 0.3));
    return obs;
  },
  zones_obstacles(rng) {
    const obs = [];
    for (let i = 0; i < 8; i++) {
      const w = 50 + rng() * 90, h = 50 + rng() * 90;
      obs.push(rectObstacle(120 + rng() * (MAP_W - 240 - w), 120 + rng() * (MAP_H - 240 - h), w, h));
    }
    return obs;
  },
  petites_salles(rng) {
    const obs = [];
    const midX = MAP_W / 2, midY = MAP_H / 2;
    obs.push(rectObstacle(midX - 8, 60, 16, MAP_H * 0.32));
    obs.push(rectObstacle(midX - 8, MAP_H * 0.68, 16, MAP_H * 0.32 - 60));
    obs.push(rectObstacle(60, midY - 8, MAP_W * 0.32, 16));
    obs.push(rectObstacle(MAP_W * 0.68, midY - 8, MAP_W * 0.32 - 60, 16));
    return obs;
  },
  anneau(rng) {
    const obs = [];
    const cx = MAP_W / 2, cy = MAP_H / 2, R = 190;
    const segments = 10;
    for (let i = 0; i < segments; i++) {
      if (i % 4 === 0) continue; // ouvertures dans l'anneau
      const a = (Math.PI * 2 / segments) * i;
      obs.push(circleObstacle(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 26));
    }
    return obs;
  },
  passages_etroits(rng) {
    const obs = [];
    for (let i = 0; i < 4; i++) {
      const x = MAP_W * (0.2 + i * 0.2);
      obs.push(rectObstacle(x, 0, 22, MAP_H * 0.42));
      obs.push(rectObstacle(x, MAP_H * 0.58, 22, MAP_H * 0.42));
    }
    return obs;
  },
};

function generateMap(difficultyLevel) {
  const keys = Object.keys(MAP_STRUCTURES);
  const kind = keys[Math.floor(Math.random() * keys.length)];
  const rng = Math.random;
  const obstacles = MAP_STRUCTURES[kind](rng);
  const map = { width: MAP_W, height: MAP_H, obstacles, kind };
  map.features = generateMapFeatures(map);
  return map;
}

// Cherche une position qui ne tombe pas dans un obstacle et reste à distance du
// centre de la carte (spawn du joueur), pour de vrai un point "au milieu de nulle part".
function findOpenSpot(map, radius, center, minDistFromCenter) {
  for (let i = 0; i < 25; i++) {
    const x = 70 + Math.random() * (map.width - 140);
    const y = 70 + Math.random() * (map.height - 140);
    if (Effects.dist(x, y, center.x, center.y) < minDistFromCenter) continue;
    let blocked = false;
    for (const o of map.obstacles) {
      if (o.shape === 'circle') { if (Effects.dist(x, y, o.x, o.y) < o.r + radius + 12) { blocked = true; break; } }
      else if (x + radius + 12 > o.x && x - radius - 12 < o.x + o.w && y + radius + 12 > o.y && y - radius - 12 < o.y + o.h) { blocked = true; break; }
    }
    if (!blocked) return { x, y };
  }
  return { x: 100 + Math.random() * (map.width - 200), y: 100 + Math.random() * (map.height - 200) };
}

// Fonctionnalités de carte : téléporteurs (paire), pièges, zones de dégâts, de vitesse
// et de ralentissement. Elles affectent joueur ET ennemis (voir Combat.applyMapFeatures).
function generateMapFeatures(map) {
  const center = { x: map.width / 2, y: map.height / 2 };
  const features = [];

  const tpA = findOpenSpot(map, 22, center, 240);
  const tpB = findOpenSpot(map, 22, center, 240);
  features.push({ type: 'teleporter', x: tpA.x, y: tpA.y, r: 24, pairId: 'tp0' });
  features.push({ type: 'teleporter', x: tpB.x, y: tpB.y, r: 24, pairId: 'tp0' });

  const trapCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < trapCount; i++) {
    const p = findOpenSpot(map, 16, center, 160);
    features.push({ type: 'trap', x: p.x, y: p.y, r: 17, damage: 14, cooldown: 2.5, timer: 0, armed: true });
  }

  const dz = findOpenSpot(map, 70, center, 200);
  features.push({ type: 'damageZone', x: dz.x, y: dz.y, r: 70, dps: 11 });

  const sz = findOpenSpot(map, 65, center, 180);
  features.push({ type: 'speedZone', x: sz.x, y: sz.y, r: 65, mult: 1.6 });

  const slz = findOpenSpot(map, 65, center, 180);
  features.push({ type: 'slowZone', x: slz.x, y: slz.y, r: 65, mult: 0.5 });

  return features;
}

function circleRectPushOut(cx, cy, cr, rect) {
  const closestX = clamp(cx, rect.x, rect.x + rect.w);
  const closestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - closestX, dy = cy - closestY;
  const distSq = dx * dx + dy * dy;
  if (distSq >= cr * cr || distSq === 0) return null;
  const dist = Math.sqrt(distSq) || 0.01;
  const overlap = cr - dist;
  return { x: (dx / dist) * overlap, y: (dy / dist) * overlap };
}

function resolveObstacleCollisions(map, x, y, r) {
  let px = x, py = y;
  for (const o of map.obstacles) {
    if (o.shape === 'rect') {
      const push = circleRectPushOut(px, py, r, o);
      if (push) { px += push.x; py += push.y; }
    } else {
      const d = Effects.dist(px, py, o.x, o.y);
      if (d < r + o.r) {
        const a = Math.atan2(py - o.y, px - o.x);
        const overlap = (r + o.r) - d;
        px += Math.cos(a) * overlap; py += Math.sin(a) * overlap;
      }
    }
  }
  return { x: clamp(px, r, map.width - r), y: clamp(py, r, map.height - r) };
}

// Réflexion approximative d'un vecteur vitesse contre l'obstacle le plus proche du
// point d'impact (Tir ricochet, Retourneur...) : normale rectangulaire (axe le plus
// pénétré) ou normale radiale pour un obstacle circulaire.
function reflectOffObstacles(map, x, y, vx, vy) {
  let nearest = null, nearestD = Infinity;
  for (const o of map.obstacles) {
    if (o.shape === 'circle') {
      const d = Effects.dist(x, y, o.x, o.y) - o.r;
      if (d < nearestD) { nearestD = d; nearest = { type: 'circle', o }; }
    } else {
      const cx = clamp(x, o.x, o.x + o.w), cy = clamp(y, o.y, o.y + o.h);
      const d = Effects.dist(x, y, cx, cy);
      if (d < nearestD) { nearestD = d; nearest = { type: 'rect', o, cx, cy }; }
    }
  }
  if (!nearest) return { vx: -vx, vy: -vy };
  let nx, ny;
  if (nearest.type === 'circle') {
    const a = Math.atan2(y - nearest.o.y, x - nearest.o.x);
    nx = Math.cos(a); ny = Math.sin(a);
  } else {
    const dLeft = Math.abs(x - nearest.o.x), dRight = Math.abs(x - (nearest.o.x + nearest.o.w));
    const dTop = Math.abs(y - nearest.o.y), dBottom = Math.abs(y - (nearest.o.y + nearest.o.h));
    const minH = Math.min(dLeft, dRight), minV = Math.min(dTop, dBottom);
    if (minH < minV) { nx = dLeft < dRight ? -1 : 1; ny = 0; } else { nx = 0; ny = dTop < dBottom ? -1 : 1; }
  }
  const dot = vx * nx + vy * ny;
  return { vx: vx - 2 * dot * nx, vy: vy - 2 * dot * ny };
}
