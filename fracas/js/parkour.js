// Defis de parcours : atteindre l'arrivee (a droite) le plus vite possible, a travers des
// chicanes, des labyrinthes, des forets de piliers et des arenes piegees. AUCUN ennemi : les
// dangers sont des pieges (piques et lasers a intervalles) et des zones de terrain (beaucoup de
// vent). Aides a exploiter : teleporteurs, trampolines (saut par-dessus murs et pieges) et
// boosts de vitesse temporaires a ramasser.
// Chaque coup recu REDUIT LA VITESSE de deplacement (pas le multiplicateur de degats) et le jeu
// y tourne en vitesse acceleree.
// Les parcours sont generes de facon deterministe a partir d'une graine : un meme parcours est
// toujours identique, ce qui rend les records comparables.

const PARKOUR_SPEED_MULT = 1.4;        // vitesse de jeu acceleree dans les parcours
const PARKOUR_DAMAGE_TO_SPEED = 0.6;   // % de vitesse perdu par % de degat brut recu
const PARKOUR_MIN_SPEED = 0.3;         // on ne descend jamais sous 30% de vitesse
const PARKOUR_HEIGHT = 560;
const PARKOUR_LENGTHS = { 1: 4500, 2: 6900, 3: 9300 };
const PARKOUR_VERSION = 5; // a incrementer si la generation change (les anciens records deviennent caducs)
const PARKOUR_ZONE_TYPES = ['ice', 'mud', 'accel', 'slow', 'damage', 'wind']; // pas d'inversion des commandes
const PARKOUR_SPIKE_DMG = 14;          // brut -> -8.4% de vitesse
const PARKOUR_LASER_DMG = 18;          // brut -> -10.8% de vitesse
const PARKOUR_TRAP_COOLDOWN = 0.7;     // un meme joueur ne peut etre blesse qu'une fois par 0.7s
const PARKOUR_BOOST_MULT = 1.6;        // boost de vitesse ramasse : +60%...
const PARKOUR_BOOST_TIME = 3;          // ...pendant 3s
const PARKOUR_JUMP_TIME = 0.6;         // duree d'un saut de trampoline
const HUB_BOOST_RESPAWN = 10;          // boost de la base : reapparait 10 s apres avoir ete ramasse
const PARKOUR_MOVE_BONUS = 1.3;        // +30% de vitesse de deplacement dans tous les parcours
const PARKOUR_WIND_MULT = 0.65;        // le vent pousse ~35% moins fort en parcours
const PARKOUR_HALF_HEAL = 25;          // +25% de vitesse rendus en passant la moitie du parcours
const PARKOUR_SHOT_DMG = 12;           // tir de piege : brut -> -7.2% de vitesse

// 4 personnages de parcours (Orbis, Trait, Janus, Elan), 2 parcours chacun.
const PARKOUR_DEFS = [
  { id: 'P1', characterId: 12, theme: 1, length: 2, density: 1, seed: 1201, zones: ['ice', 'wind', 'accel', 'mud'], laserRate: 1, spikeRate: 1, shooterRate: 1,
    title: 'Orbites', desc: 'Apprends a sauter d\'orbe en orbe par-dessus les murs.' },
  { id: 'P2', characterId: 12, theme: 3, length: 3, density: 2, seed: 1202, zones: ['damage', 'wind', 'slow'], laserRate: 1.3, spikeRate: 1.2, shooterRate: 1.3,
    title: 'Gravitation', desc: 'Un long dedale brulant : chaque teleportation doit tomber juste.' },
  { id: 'P3', characterId: 13, theme: 2, length: 2, density: 1, seed: 1303, zones: ['accel', 'wind', 'slow'], laserRate: 1.2, spikeRate: 0.9, shooterRate: 1,
    title: 'Premier trait', desc: 'Charge, vise, file : les couloirs de l\'usine en quelques dashs.' },
  { id: 'P4', characterId: 13, theme: 1, length: 3, density: 2, seed: 1304, zones: ['ice', 'wind', 'mud', 'damage'], laserRate: 1.3, spikeRate: 1.3, shooterRate: 1.4,
    title: 'Fleche d\'or', desc: 'Dashs longs, invincibilite au bon moment et tirs croises.' },
  { id: 'P5', characterId: 14, theme: 3, length: 2, density: 1, seed: 1405, zones: ['wind', 'slow', 'mud'], laserRate: 1, spikeRate: 1.1, shooterRate: 1.1,
    title: 'Portes jumelles', desc: 'Pose tes teleporteurs a travers les murs et pousse-toi au vent.' },
  { id: 'P6', characterId: 14, theme: 2, length: 3, density: 2, seed: 1406, zones: ['wind', 'accel', 'damage'], laserRate: 1.4, spikeRate: 1.2, shooterRate: 1.3,
    title: 'Courants d\'air', desc: 'Des bourrasques partout : fais-en tes allies.' },
  { id: 'P7', characterId: 15, theme: 1, length: 2, density: 1, seed: 1507, zones: ['ice', 'wind', 'accel'], laserRate: 1, spikeRate: 1, shooterRate: 1.2,
    title: 'Premier bond', desc: 'Glisse et bondis vers l\'arrivee.' },
  { id: 'P8', characterId: 15, theme: 3, length: 3, density: 2, seed: 1508, zones: ['ice', 'mud', 'accel', 'slow', 'damage', 'wind'], laserRate: 1.5, spikeRate: 1.5, shooterRate: 1.5,
    title: 'Marathon', desc: 'Le parcours ultime : tous les pieges, toutes les zones, sur la plus longue distance.' },
];

Object.assign(CHALLENGE_I18N.en, {
  P1: { title: 'Orbits', desc: 'Learn to hop from orb to orb over the walls.' },
  P2: { title: 'Gravitation', desc: 'A long burning maze: every teleport must land right.' },
  P3: { title: 'First dash', desc: 'Charge, aim, go: the factory corridors in a few dashes.' },
  P4: { title: 'Golden arrow', desc: 'Long dashes, invincibility at the right time and crossfire.' },
  P5: { title: 'Twin doors', desc: 'Place your teleporters through walls and ride your winds.' },
  P6: { title: 'Drafts', desc: 'Gusts everywhere: make them your allies.' },
  P7: { title: 'First leap', desc: 'Slide and leap toward the finish.' },
  P8: { title: 'Marathon', desc: 'The ultimate course: every trap, every zone, over the longest distance.' },
});
for (const k of ['P9', 'P10', 'P11']) delete CHALLENGE_I18N.en[k];

function parkourRng(seed) {
  let v = (Math.floor(seed) % 2147483647) || 1;
  return () => { v = (v * 16807) % 2147483647; return (v - 1) / 2147483646; };
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

// ---------- Trace multi-directionnel ----------
// Le parcours est une suite de troncons (couloirs de 560 de large) orientes vers la droite, le
// haut, le bas ou meme la gauche, relies par des virages carres. Tout ce qui n'est pas le trace
// est de la roche. Chaque troncon est genere dans un repere local (x = sens de la marche,
// y = travers) puis tourne/retourne vers le monde.
const PK_HALF = PARKOUR_HEIGHT / 2;
const PK_TILE = 40;
const PK_DIRV = { E: { x: 1, y: 0 }, W: { x: -1, y: 0 }, N: { x: 0, y: -1 }, S: { x: 0, y: 1 } };

function pkXf(ch, x, y) {
  switch (ch.dir) {
    case 'E': return { x: ch.ox + x, y: ch.oy + y };
    case 'W': return { x: ch.ox - x, y: ch.oy + y };
    case 'N': return { x: ch.ox + y, y: ch.oy - x };
    default: return { x: ch.ox - y, y: ch.oy + x };
  }
}
function pkXfAngle(ch, a) {
  if (ch.dir === 'E') return a;
  if (ch.dir === 'W') return Math.PI - a;
  if (ch.dir === 'N') return a - Math.PI / 2;
  return a + Math.PI / 2;
}
function pkXfRect(ch, r) {
  const a = pkXf(ch, r.x, r.y), b = pkXf(ch, r.x + r.w, r.y + r.h);
  return Object.assign({}, r, { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });
}
function pkChunkRect(dir, px, py, len) {
  const d = PK_DIRV[dir];
  if (d.x) return { x: d.x > 0 ? px : px - len, y: py - PK_HALF, w: len, h: 2 * PK_HALF };
  return { x: px - PK_HALF, y: d.y > 0 ? py : py - len, w: 2 * PK_HALF, h: len };
}
function pkInRect(x, y, r, m) { const k = m || 0; return x >= r.x - k && x <= r.x + r.w + k && y >= r.y - k && y <= r.y + r.h + k; }

// Accessibilite de l'arrivee (parcours en largeur sur une grille, a pied, sans trampoline ni
// teleporteur). goal : rectangle (ou un x, ancien format). Renvoie Infinity si atteignable ;
// avec info=true renvoie { ok, seen, W, H, cs } pour le filet de securite.
function parkourReach(bounds, obstacles, turrets, start, goal, info) {
  const cs = 10, R = PLAYER_RADIUS + 2;
  const g = typeof goal === 'number' ? { x: goal, y: -1e9, w: 1e9, h: 2e9 } : goal;
  const W = Math.ceil(bounds.w / cs), H = Math.ceil(bounds.h / cs);
  const blocked = new Uint8Array(W * H);
  const mark = (x0, y0, x1, y1) => {
    const i0 = Math.max(0, Math.floor((x0 - bounds.x) / cs)), i1 = Math.min(W - 1, Math.floor((x1 - bounds.x) / cs));
    const j0 = Math.max(0, Math.floor((y0 - bounds.y) / cs)), j1 = Math.min(H - 1, Math.floor((y1 - bounds.y) / cs));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) blocked[j * W + i] = 1;
  };
  for (const o of obstacles) mark(o.x - R, o.y - R, o.x + o.w + R, o.y + o.h + R);
  for (const t of turrets || []) { const rr = 16 + R; mark(t.x - rr, t.y - rr, t.x + rr, t.y + rr); }
  mark(bounds.x - 10, bounds.y - 10, bounds.x + bounds.w + 10, bounds.y + R);
  mark(bounds.x - 10, bounds.y + bounds.h - R, bounds.x + bounds.w + 10, bounds.y + bounds.h + 10);
  mark(bounds.x - 10, bounds.y - 10, bounds.x + R, bounds.y + bounds.h + 10);
  mark(bounds.x + bounds.w - R, bounds.y - 10, bounds.x + bounds.w + 10, bounds.y + bounds.h + 10);
  const si = clamp(Math.floor((start.x - bounds.x) / cs), 0, W - 1), sj = clamp(Math.floor((start.y - bounds.y) / cs), 0, H - 1);
  const seen = new Uint8Array(W * H);
  let q = [sj * W + si]; seen[q[0]] = 1; blocked[q[0]] = 0;
  let ok = false;
  while (q.length && !ok) {
    const nq = [];
    for (const k of q) {
      const i = k % W, j = (k - i) / W;
      if (pkInRect(bounds.x + (i + 0.5) * cs, bounds.y + (j + 0.5) * cs, g)) { ok = true; break; }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, c = j + dj;
        if (a < 0 || c < 0 || a >= W || c >= H) continue;
        const kk = c * W + a;
        if (seen[kk] || blocked[kk]) continue;
        seen[kk] = 1; nq.push(kk);
      }
    }
    q = nq;
  }
  if (info) return { ok, seen, W, H, cs };
  return ok ? Infinity : 0;
}

// Contenu d'un troncon, dans son repere local : x de 0 a len (sens de la marche), y de -280 a 280.
function pkBuildSection(type, len, ctx) {
  const { rnd, rr, ri, density, laserRate, spikeRate, shooterRate, zoneTypes } = ctx;
  const top = -PK_HALF, bot = PK_HALF;
  const O = { obstacles: [], zones: [], spikes: [], lasers: [], trampolines: [], boosts: [], shooters: [] };
  const thick = 30;
  const freeAt = (x, y, r) => {
    if (x < 10 + r || x > len - 10 - r || y < top + r || y > bot - r) return false;
    if (O.obstacles.some((o) => circleRect(x, y, r, o.x, o.y, o.w, o.h))) return false;
    if (O.spikes.some((s) => circleRect(x, y, r, s.x, s.y, s.w, s.h))) return false;
    if (O.lasers.some((l) => distToSegment(x, y, l.ax, l.ay, l.bx, l.by) < r + 8)) return false;
    for (const list of [O.trampolines, O.boosts]) if (list.some((o) => Math.hypot(o.x - x, o.y - y) < r + 40)) return false;
    return true;
  };
  const pickFree = (x0, x1, r, tries) => {
    for (let t = 0; t < (tries || 40); t++) {
      const x = rr(x0, x1), y = rr(top + r + 10, bot - r - 10);
      if (freeAt(x, y, r)) return { x, y };
    }
    return null;
  };
  // Plus de vent : pres de la moitie des zones sont des bourrasques si le vent est autorise.
  const addZone = (x, y, r) => {
    if (!zoneTypes.length) return;
    const type = zoneTypes.includes('wind') && rnd() < 0.45 ? 'wind' : zoneTypes[ri(0, zoneTypes.length - 1)];
    O.zones.push({ type, x, y, radius: r, windAngle: ri(0, 7) * Math.PI / 4 });
  };
  const laserTiming = () => ({ period: rr(2.2, 3.2), on: rr(0.7, 1.0), warn: 0.55, offset: rr(0, 4) });
  const spikeTiming = () => ({ period: rr(1.8, 2.8), out: rr(0.7, 1.1), warn: 0.45, offset: rr(0, 4) });
  const addSpike = (cx, cy, size) => {
    const s = Object.assign({ x: cx - size / 2, y: cy - size / 2, w: size, h: size }, spikeTiming());
    if (O.obstacles.some((o) => o.x < s.x + s.w && o.x + o.w > s.x && o.y < s.y + s.h && o.y + o.h > s.y)) return;
    O.spikes.push(s);
  };
  const addCrossLaser = (x, y0, y1) => O.lasers.push(Object.assign({ ax: x, ay: y0, bx: x, by: y1 }, laserTiming()));
  const addBoost = (x0, x1) => { const p = pickFree(x0, x1, 16); if (p) O.boosts.push({ x: p.x, y: p.y }); };
  const addTrampoline = (x, y, dist) => {
    const lx = x + dist, ly = clamp(y + rr(-40, 40), top + 40, bot - 40);
    if (lx > len - 20 || !freeAt(x, y, 24) || !freeAt(lx, ly, 26)) return false;
    O.trampolines.push({ x, y, lx, ly });
    return true;
  };
  // Tourelle-piege sur un bord du couloir : tire en travers du trace.
  const addShooters = (x0, x1, count) => {
    for (let k = 0; k < count; k++) {
      for (let t = 0; t < 12; t++) {
        const sx = rr(x0 + 20, x1 - 20);
        const fromTop = rnd() < 0.5;
        const sy = fromTop ? top + 12 : bot - 12;
        if (O.obstacles.some((o) => circleRect(sx, sy, 22, o.x, o.y, o.w, o.h))) continue;
        if (O.shooters.some((o) => Math.abs(o.x - sx) < 90)) continue;
        O.shooters.push({ x: sx, y: sy, angle: (fromTop ? Math.PI / 2 : -Math.PI / 2) + rr(-0.4, 0.4),
          period: rr(1.4, 2.4), offset: rr(0, 3), burst: ri(1, 3), speed: rr(200, 280), fired: [] });
        break;
      }
    }
  };

  if (type === 'open') return { used: len, O };

  if (type === 'gates') {
    const openH = 150 - density * 15;
    const n = Math.max(2, Math.round(len / (300 - density * 30)));
    const step = len / n;
    let prevY = rr(top + 100, bot - 100), prevX = 0;
    for (let i = 0; i < n; i++) {
      const gx = (i + 0.5) * step;
      let gy, tries = 0;
      do { gy = rr(top + openH / 2 + 25, bot - openH / 2 - 25); tries++; } while (tries < 25 && Math.abs(gy - prevY) < 150 + density * 35);
      const t0 = gy - openH / 2, b0 = gy + openH / 2;
      O.obstacles.push({ x: gx - thick / 2, y: top, w: thick, h: t0 - top });
      O.obstacles.push({ x: gx - thick / 2, y: b0, w: thick, h: bot - b0 });
      if (rnd() < 0.45 * laserRate) addCrossLaser(gx, t0, b0);
      const nz = ri(1, 1 + density);
      for (let k = 0; k < nz; k++) { const f = rr(0.25, 0.75); addZone(lerp(prevX, gx, f), clamp(lerp(prevY, gy, f) + rr(-70, 70), top + 70, bot - 70), rr(52, 78)); }
      const ns = Math.round(rr(0.6, 1.6 + density * 0.5) * spikeRate);
      for (let k = 0; k < ns; k++) { const f = rr(0.3, 0.7); addSpike(lerp(prevX, gx, f) + rr(-30, 30), clamp(lerp(prevY, gy, f) + rr(-60, 60), top + 50, bot - 50), rr(52, 84)); }
      if (rnd() < 0.35) {
        const ty = gy > 0 ? rr(top + 50, t0 - 60) : rr(b0 + 60, bot - 50);
        if (ty > top + 40 && ty < bot - 40) addTrampoline(gx - 95, ty, 200);
      }
      prevY = gy; prevX = gx;
    }
    if (rnd() < 0.5) addBoost(0, len);
    addShooters(0, len, Math.round((1 + density * 0.5 + rnd()) * shooterRate));
    return { used: len, O };
  }

  if (type === 'maze') {
    // Labyrinthe "parfait" puis des murs retires : plusieurs chemins possibles (dilemme).
    const rows = density >= 2 ? 8 : 7;
    const cellH = (bot - top) / rows;
    const cellW = cellH * rr(1.0, 1.25);
    const cols = Math.max(4, Math.floor((len - 20) / cellW));
    const mw = cols * cellW;
    const x0 = 10;
    const wt = 12;
    const right = [], down = [], visited = [];
    for (let c = 0; c < cols; c++) { right.push(new Array(rows).fill(true)); down.push(new Array(rows).fill(true)); visited.push(new Array(rows).fill(false)); }
    const rIn = ri(0, rows - 1), rOut = ri(0, rows - 1);
    const stack = [[0, rIn]]; visited[0][rIn] = true;
    while (stack.length) {
      const [c, r] = stack[stack.length - 1];
      const nb = [];
      if (c > 0 && !visited[c - 1][r]) nb.push([c - 1, r]);
      if (c < cols - 1 && !visited[c + 1][r]) nb.push([c + 1, r]);
      if (r > 0 && !visited[c][r - 1]) nb.push([c, r - 1]);
      if (r < rows - 1 && !visited[c][r + 1]) nb.push([c, r + 1]);
      if (!nb.length) { stack.pop(); continue; }
      const [nc, nr] = nb[ri(0, nb.length - 1)];
      if (nc > c) right[c][r] = false; else if (nc < c) right[nc][r] = false;
      else if (nr > r) down[c][r] = false; else down[c][nr] = false;
      visited[nc][nr] = true;
      stack.push([nc, nr]);
    }
    const braid = 0.3 - density * 0.04;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { if (rnd() < braid) right[c][r] = false; if (rnd() < braid) down[c][r] = false; }
    for (let r = 0; r < rows; r++) {
      if (r !== rIn) O.obstacles.push({ x: x0 - wt / 2, y: top + r * cellH - wt / 2, w: wt, h: cellH + wt });
      if (r !== rOut) O.obstacles.push({ x: x0 + mw - wt / 2, y: top + r * cellH - wt / 2, w: wt, h: cellH + wt });
    }
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const cx = x0 + c * cellW, cy = top + r * cellH;
      if (c < cols - 1 && right[c][r]) O.obstacles.push({ x: cx + cellW - wt / 2, y: cy - wt / 2, w: wt, h: cellH + wt });
      if (r < rows - 1 && down[c][r]) O.obstacles.push({ x: cx - wt / 2, y: cy + cellH - wt / 2, w: cellW + wt, h: wt });
    }
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const ccx = x0 + (c + 0.5) * cellW, ccy = top + (r + 0.5) * cellH;
      const roll = rnd();
      if (roll < (0.16 + density * 0.05) * spikeRate) addSpike(ccx, ccy, Math.min(cellW, cellH) * 0.52);
      else if (roll < 0.36 + density * 0.05) addZone(ccx, ccy, Math.min(cellW, cellH) * 0.36);
      else if (roll < 0.40) O.boosts.push({ x: ccx, y: ccy });
    }
    // la couture du labyrinthe se fait sur toute la hauteur : on retire les murs des bords haut/bas
    // (ils sont deja fournis par la roche autour du couloir)
    if (rnd() < 0.55 * laserRate) addCrossLaser(x0, top + rIn * cellH + 4, top + (rIn + 1) * cellH - 4);
    if (rnd() < 0.55 * laserRate) addCrossLaser(x0 + mw, top + rOut * cellH + 4, top + (rOut + 1) * cellH - 4);
    return { used: len, O };
  }

  if (type === 'pillars') {
    const sp = 118;
    let col = 0;
    for (let gx = 30; gx < len - 30; gx += sp, col++) {
      for (let gy = top + 70 + (col % 2 ? sp / 2 : 0); gy < bot - 50; gy += sp) {
        if (rnd() < 0.22) continue;
        const s = rr(26, 40);
        O.obstacles.push({ x: gx + rr(-8, 8) - s / 2, y: gy + rr(-8, 8) - s / 2, w: s, h: s });
      }
    }
    const nz = ri(2, 4) + density;
    for (let k = 0; k < nz; k++) addZone(rr(40, len - 40), rr(top + 70, bot - 70), rr(45, 70));
    const ns = Math.round((2 + density + rnd() * 2) * spikeRate);
    for (let k = 0; k < ns; k++) { const p = pickFree(30, len - 30, 30); if (p) addSpike(p.x, p.y, rr(40, 58)); }
    if (rnd() < 0.6 * laserRate) addCrossLaser(len * rr(0.35, 0.65), top, bot);
    for (let k = 0; k < 2; k++) { const p = pickFree(20, len - 260, 24); if (p && addTrampoline(p.x, p.y, 240)) break; }
    addBoost(0, len);
    addShooters(0, len, Math.round((1 + density * 0.5 + rnd()) * shooterRate));
    return { used: len, O };
  }

  // arena
  const nb = ri(2, 3);
  for (let k = 0; k < nb; k++) {
    const bw = rr(50, 95), bh = rr(50, 110);
    O.obstacles.push({ x: rr(40, len - 40 - bw), y: rr(top + 90, bot - 90 - bh), w: bw, h: bh });
  }
  const nz = ri(4, 6) + density;
  for (let k = 0; k < nz; k++) addZone(rr(40, len - 40), rr(top + 60, bot - 60), rr(50, 85));
  const nl = Math.round((1 + density * 0.5 + rnd()) * laserRate);
  const baseOffset = rr(0, 3);
  for (let k = 0; k < nl; k++) {
    const lx = len * (k + 1) / (nl + 1);
    if (O.obstacles.some((o) => lx > o.x - 10 && lx < o.x + o.w + 10)) continue;
    O.lasers.push({ ax: lx, ay: top, bx: lx, by: bot, period: 2.6, on: 0.8, warn: 0.55, offset: baseOffset + k * 0.55 });
  }
  const ns = Math.round((3 + density + rnd() * 2) * spikeRate);
  for (let k = 0; k < ns; k++) { const p = pickFree(30, len - 30, 34); if (p) addSpike(p.x, p.y, rr(50, 80)); }
  for (let k = 0; k < 2; k++) { const p = pickFree(20, len - 260, 24); if (p && addTrampoline(p.x, p.y, 240)) break; }
  addBoost(0, len); if (rnd() < 0.5) addBoost(0, len);
  addShooters(0, len, Math.round((2 + density * 0.5 + rnd()) * shooterRate));
  return { used: len, O };
}

// Construit le parcours complet. def.contentless : seulement le trace (editeur, parcours manuels).
// def.straight : pas de virage.
function buildParkourLayout(def) {
  const rnd = parkourRng(def.seed || 1);
  const rr = (a, b) => a + rnd() * (b - a);
  const ri = (a, b) => Math.floor(rr(a, b + 1));
  const snap = (v) => Math.max(PK_TILE, Math.round(v / PK_TILE) * PK_TILE);
  const total = PARKOUR_LENGTHS[def.length] || PARKOUR_LENGTHS[2];
  const density = def.density || 0;
  const ctx = {
    rnd, rr, ri, density,
    laserRate: def.laserRate != null ? def.laserRate : 1,
    spikeRate: def.spikeRate != null ? def.spikeRate : 1,
    shooterRate: def.shooterRate != null ? def.shooterRate : 1,
    zoneTypes: (def.zones || []).filter((z) => PARKOUR_ZONE_TYPES.includes(z)),
  };

  // 1. Trace : troncons + virages, sans jamais se recouper.
  const chunks = [], rects = [], pathPts = [{ x: 0, y: 0 }];
  const overlaps = (r) => rects.some((o) => r.x < o.x + o.w - 1 && r.x + r.w > o.x + 1 && r.y < o.y + o.h - 1 && r.y + r.h > o.y + 1);
  let dir = 'E', px = 0, py = 0, traveled = 0;
  const addChunk = (type, len) => {
    const r = pkChunkRect(dir, px, py, len);
    chunks.push({ type, len, dir, ox: px, oy: py, rect: r });
    rects.push(r);
    const d = PK_DIRV[dir];
    px += d.x * len; py += d.y * len; traveled += len;
    pathPts.push({ x: px, y: py });
  };
  const tryTurn = (minNext) => {
    const perp = (dir === 'E' || dir === 'W') ? ['N', 'S'] : ['E', 'W'];
    if (rnd() < 0.5) perp.reverse();
    for (const nd of perp) {
      const corner = pkChunkRect(dir, px, py, 2 * PK_HALF);
      const d = PK_DIRV[dir], n = PK_DIRV[nd];
      const cx = px + d.x * PK_HALF, cy = py + d.y * PK_HALF;
      const ex = cx + n.x * PK_HALF, ey = cy + n.y * PK_HALF;
      if (overlaps(corner) || overlaps(pkChunkRect(nd, ex, ey, minNext))) continue;
      rects.push(corner);
      pathPts.push({ x: cx, y: cy });
      traveled += 2 * PK_HALF;
      dir = nd; px = ex; py = ey;
      pathPts.push({ x: px, y: py });
      return true;
    }
    return false;
  };
  addChunk('open', 200);
  let last = null;
  for (let guard = 0; guard < 60 && traveled < total - 420; guard++) {
    if (!def.straight && chunks.length > 1 && rnd() < 0.38) tryTurn(480);
    let type;
    if (def.contentless) type = 'open';
    else {
      const roll = rnd();
      if (roll < 0.26 + density * 0.06) type = 'maze';
      else if (roll < 0.52 + density * 0.04) type = 'gates';
      else if (roll < 0.78) type = 'pillars';
      else type = 'arena';
      if (type === last) type = type === 'maze' ? 'gates' : 'maze';
    }
    let len = snap(Math.min(def.contentless ? rr(500, 900) : { maze: rr(620, 980), gates: rr(850, 1300), pillars: rr(650, 1000), arena: rr(500, 750), open: 600 }[type], total - traveled));
    if (len < 400) len = 400;
    while (len > 400 && overlaps(pkChunkRect(dir, px, py, len))) len -= PK_TILE * 2;
    if (overlaps(pkChunkRect(dir, px, py, len))) { if (!tryTurn(400)) break; continue; }
    addChunk(type, len);
    last = type;
  }
  // fin : petit palier puis bande d'arrivee
  if (overlaps(pkChunkRect(dir, px, py, 280))) tryTurn(280);
  addChunk('open', 160);
  const goal = pkChunkRect(dir, px, py, 120);
  rects.push(goal);
  pathPts.push({ x: px + PK_DIRV[dir].x * 120, y: py + PK_DIRV[dir].y * 120 });
  const goalDir = dir;

  // 2. Limites et roche (tout ce qui n'est pas le trace), en bandes de tuiles fusionnees.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rects) { minX = Math.min(minX, r.x); minY = Math.min(minY, r.y); maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h); }
  const bounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  const obstacles = [];
  const cols = Math.round(bounds.w / PK_TILE), rowsN = Math.round(bounds.h / PK_TILE);
  for (let j = 0; j < rowsN; j++) {
    const cy = bounds.y + (j + 0.5) * PK_TILE;
    let runStart = -1;
    for (let i = 0; i <= cols; i++) {
      const cx = bounds.x + (i + 0.5) * PK_TILE;
      const open = i < cols && rects.some((r) => pkInRect(cx, cy, r));
      if (!open && i < cols) { if (runStart < 0) runStart = i; }
      else if (runStart >= 0) {
        obstacles.push({ x: bounds.x + runStart * PK_TILE, y: bounds.y + j * PK_TILE, w: (i - runStart) * PK_TILE, h: PK_TILE, pkVoid: true });
        runStart = -1;
      }
    }
  }

  // 3. Contenu de chaque troncon, transforme vers le monde.
  const zones = [], spikes = [], lasers = [], trampolines = [], boosts = [], shooters = [], teleporters = [];
  for (const ch of chunks) {
    if (ch.type === 'open') continue;
    const { O } = pkBuildSection(ch.type, ch.len, ctx);
    for (const o of O.obstacles) obstacles.push(pkXfRect(ch, o));
    for (const s of O.spikes) spikes.push(pkXfRect(ch, s));
    for (const z of O.zones) { const p = pkXf(ch, z.x, z.y); zones.push(Object.assign({}, z, p, { windAngle: pkXfAngle(ch, z.windAngle) })); }
    for (const l of O.lasers) { const a = pkXf(ch, l.ax, l.ay), b = pkXf(ch, l.bx, l.by); lasers.push(Object.assign({}, l, { ax: a.x, ay: a.y, bx: b.x, by: b.y })); }
    for (const t of O.trampolines) { const a = pkXf(ch, t.x, t.y), b = pkXf(ch, t.lx, t.ly); trampolines.push({ x: a.x, y: a.y, lx: b.x, ly: b.y }); }
    for (const b of O.boosts) boosts.push(pkXf(ch, b.x, b.y));
    for (const s of O.shooters) { const p = pkXf(ch, s.x, s.y); shooters.push(Object.assign({}, s, p, { angle: pkXfAngle(ch, s.angle), fired: [] })); }
  }

  const start = pkXf(chunks[0], 70, 0);

  // 4. Teleporteurs (sens unique, vers un peu plus loin sur le trace).
  const contentChunks = chunks.filter((c) => c.type !== 'open');
  const freeWorld = (x, y, r) => !obstacles.some((o) => circleRect(x, y, r, o.x, o.y, o.w, o.h))
    && !spikes.some((s) => circleRect(x, y, r, s.x, s.y, s.w, s.h))
    && !lasers.some((l) => distToSegment(x, y, l.ax, l.ay, l.bx, l.by) < r + 8)
    && !trampolines.some((o) => Math.hypot(o.x - x, o.y - y) < r + 40) && !boosts.some((o) => Math.hypot(o.x - x, o.y - y) < r + 40);
  const pickInChunk = (ch) => {
    for (let t = 0; t < 60; t++) {
      const p = pkXf(ch, rr(40, ch.len - 40), rr(-PK_HALF + 40, PK_HALF - 40));
      if (freeWorld(p.x, p.y, 26)) return p;
    }
    return null;
  };
  if (!def.contentless) {
    const tpCount = Math.max(2, Math.floor(total / 1100));
    for (let k = 0; k < tpCount && contentChunks.length >= 2; k++) {
      const i = ri(0, contentChunks.length - 2);
      const a = pickInChunk(contentChunks[i]);
      const b = a && pickInChunk(contentChunks[Math.min(contentChunks.length - 1, i + 1)]);
      if (!a || !b || Math.hypot(b.x - a.x, b.y - a.y) > 900 || Math.hypot(b.x - a.x, b.y - a.y) < 200) continue;
      teleporters.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y });
    }
  }

  // 5. Filet de securite : l'arrivee doit rester atteignable a pied.
  for (let guard = 0; guard < 150; guard++) {
    const r = parkourReach(bounds, obstacles, [], start, goal, true);
    if (r.ok) break;
    const touches = (o) => {
      const m = PLAYER_RADIUS + 22;
      const i0 = Math.max(0, Math.floor((o.x - m - bounds.x) / r.cs)), i1 = Math.min(r.W - 1, Math.floor((o.x + o.w + m - bounds.x) / r.cs));
      const j0 = Math.max(0, Math.floor((o.y - m - bounds.y) / r.cs)), j1 = Math.min(r.H - 1, Math.floor((o.y + o.h + m - bounds.y) / r.cs));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (r.seen[j * r.W + i]) return true;
      return false;
    };
    const cand = obstacles.filter((o) => !o.pkVoid && touches(o)).sort((a, b) => a.w * a.h - b.w * b.h);
    if (!cand.length) break;
    obstacles.splice(obstacles.indexOf(cand[0]), 1);
  }

  // longueur du trace (pour la progression)
  let pathLen = 0;
  for (let i = 1; i < pathPts.length; i++) pathLen += Math.hypot(pathPts[i].x - pathPts[i - 1].x, pathPts[i].y - pathPts[i - 1].y);

  return { bounds, obstacles, zones, start, goal, goalDir, goalX: goal.x, spikes, lasers, trampolines, boosts, teleporters, shooters, pathPts, pathLen, rects };
}

// Progression (0..1) du joueur le long du trace.
function parkourProgress(L, x, y) {
  let best = Infinity, bestAcc = 0, acc = 0;
  for (let i = 1; i < L.pathPts.length; i++) {
    const a = L.pathPts[i - 1], b = L.pathPts[i];
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((x - a.x) * dx + (y - a.y) * dy) / l2, 0, 1);
    const d = Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
    const seg = Math.sqrt(l2);
    if (d < best) { best = d; bestAcc = acc + seg * t; }
    acc += seg;
  }
  return clamp(bestAcc / (L.pathLen || 1), 0, 1);
}

// ---------- Pieges et aides : logique ----------
function trapPhase(obj, time) {
  return ((time + obj.offset) % obj.period + obj.period) % obj.period;
}
function spikeState(s, time) {
  const t = trapPhase(s, time), outStart = s.period - s.out;
  if (t >= outStart) return 'out';
  if (t >= outStart - s.warn) return 'warn';
  return 'in';
}
function laserState(l, time) {
  const t = trapPhase(l, time), onStart = l.period - l.on;
  if (t >= onStart) return 'on';
  if (t >= onStart - l.warn) return 'warn';
  return 'off';
}

function updateParkourObjects(world, dt) {
  const P = world.room && world.room.parkour;
  const p = world.player;
  if (!P || !p) return;
  P.time += dt;
  if (p._trapCd > 0) p._trapCd -= dt;
  if (p.boostTimer > 0) p.boostTimer -= dt;
  if (p._tpCd > 0) p._tpCd -= dt;
  for (const t of P.trampolines) if (t.bounce > 0) t.bounce -= dt;

  // Tourelles-pieges : rafales a intervalles (seulement pres du joueur, inutile ailleurs)
  for (const sh of P.shooters) {
    if (Math.abs(sh.x - p.x) > 1100) continue;
    const tt = P.time + sh.offset;
    const cyc = Math.floor(tt / sh.period), local = tt - cyc * sh.period;
    for (let k = 0; k < sh.burst; k++) {
      if (local >= k * 0.14 && sh.fired[k] !== cyc) {
        sh.fired[k] = cyc;
        const d = vecFromAngle(sh.angle);
        world.projectiles.push(makeProjectile({
          x: sh.x + d.x * 14, y: sh.y + d.y * 14, vx: d.x * sh.speed, vy: d.y * sh.speed,
          radius: 6, dmgPercent: PARKOUR_SHOT_DMG, life: 3, color: '#ff7a3d', team: TEAM.ENEMY, stopOnObstacles: true,
        }));
      }
    }
  }

  // Saut de trampoline : trajectoire imposee, au-dessus des murs, pieges et zones.
  if (p.jump) {
    const j = p.jump;
    j.t += dt;
    const f = clamp(j.t / j.dur, 0, 1);
    p.x = lerp(j.x0, j.x1, f); p.y = lerp(j.y0, j.y1, f);
    p.airScale = 1 + 0.6 * Math.sin(Math.PI * f);
    p.airborne = true;
    if (f >= 1) {
      p.jump = null; p.airborne = false; p.airScale = 1;
      if (p.character && p.character.onTrampolineLand) p.character.onTrampolineLand(world, p); // ex. Nyx : 4 projectiles
      Particles.ring(p.x, p.y, 26, '#ffd23d', 0.25);
      Particles.burst(p.x, p.y, 10, '#ffe08a', { maxSpeed: 120 });
    }
    return;
  }

  const hurt = (amount) => {
    if (p._trapCd > 0) return;
    p._trapCd = PARKOUR_TRAP_COOLDOWN;
    playerApplyDamage(p, amount);
  };
  for (const s of P.spikes) {
    if (Math.abs(s.x - p.x) > 120) continue;
    if (spikeState(s, P.time) === 'out' && circleRect(p.x, p.y, p.radius - 3, s.x, s.y, s.w, s.h)) hurt(PARKOUR_SPIKE_DMG);
  }
  for (const l of P.lasers) {
    if (Math.abs(l.ax - p.x) > 60 && Math.abs(l.bx - p.x) > 60) continue;
    if (laserState(l, P.time) === 'on' && distToSegment(p.x, p.y, l.ax, l.ay, l.bx, l.by) < p.radius + 3) hurt(PARKOUR_LASER_DMG);
  }
  for (const b of P.boosts) {
    if (b.taken && b.respawnAt != null && P.time >= b.respawnAt) { b.taken = false; b.respawnAt = null; Particles.ring(b.x, b.y, 16, '#ffd23d', 0.3); }
    if (b.taken) continue;
    if (Math.hypot(b.x - p.x, b.y - p.y) < p.radius + 14) {
      b.taken = true;
      if (b.respawn) b.respawnAt = P.time + HUB_BOOST_RESPAWN;
      p.boostTimer = PARKOUR_BOOST_TIME;
      Particles.text(p.x, p.y - 26, 'BOOST', '#ffd23d');
      Particles.burst(b.x, b.y, 16, '#ffd23d', { maxSpeed: 160 });
      Audio2.spark();
    }
  }
  if (!(p._tpCd > 0)) {
    for (const t of P.teleporters) {
      if (Math.hypot(t.ax - p.x, t.ay - p.y) < 20) {
        Particles.burst(p.x, p.y, 18, '#7fd8ff', { maxSpeed: 160 });
        p.x = t.bx; p.y = t.by;
        p._tpCd = 0.5;
        Particles.ring(t.bx, t.by, 30, '#7fd8ff', 0.3);
        Audio2.teleport();
        break;
      }
    }
  }
  for (const t of P.trampolines) {
    if (Math.hypot(t.x - p.x, t.y - p.y) < 20) {
      p.jump = { x0: p.x, y0: p.y, x1: t.lx, y1: t.ly, t: 0, dur: PARKOUR_JUMP_TIME };
      p.airborne = true;
      t.bounce = 0.3;
      Audio2.whoosh();
      break;
    }
  }
}

// ---------- Rendu ----------
// Arrivee (bande a damier), depart, et tout ce qui est au sol (piques, trampolines,
// teleporteurs, boosts, ombre du joueur en l'air).
function renderParkourMarks(ctx, camera, world) {
  const room = world.room;
  if (!room) return;
  const t = performance.now() / 1000;
  if (room.parkourGoal) renderParkourGoal(ctx, camera, room, t);
  renderParkourObjects(ctx, camera, world, t);
}

function renderParkourGoal(ctx, camera, room, t) {
  const g = room.parkourGoal;
  const sx = g.x - camera.x, sy = g.y - camera.y;
  const horiz = g.dir === 'E' || g.dir === 'W';
  ctx.save();
  ctx.fillStyle = `rgba(93,255,157,${0.1 + 0.05 * Math.sin(t * 3)})`;
  ctx.fillRect(sx, sy, g.w, g.h);
  const cell = 14;
  if (horiz) {
    const bx = g.dir === 'E' ? sx : sx + g.w - 2 * cell;
    for (let y = 0; y < g.h; y += cell) for (let k = 0; k < 2; k++) {
      ctx.fillStyle = ((y / cell + k) % 2 === 0) ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)';
      ctx.fillRect(bx + k * cell, sy + y, cell, Math.min(cell, g.h - y));
    }
  } else {
    const by = g.dir === 'S' ? sy : sy + g.h - 2 * cell;
    for (let x = 0; x < g.w; x += cell) for (let k = 0; k < 2; k++) {
      ctx.fillStyle = ((x / cell + k) % 2 === 0) ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)';
      ctx.fillRect(sx + x, by + k * cell, Math.min(cell, g.w - x), cell);
    }
  }
  ctx.translate(sx + g.w / 2, sy + g.h / 2);
  if (horiz) ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(200,255,220,0.85)'; ctx.font = 'bold 22px Segoe UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#5dff9d'; ctx.shadowBlur = 12;
  ctx.fillText(S('parkourGoal'), 0, 0);
  ctx.restore();
  if (room.parkourStart) {
    ctx.save();
    ctx.strokeStyle = 'rgba(127,216,255,0.4)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.arc(room.parkourStart.x - camera.x, room.parkourStart.y - camera.y, 34, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function renderParkourObjects(ctx, camera, world, t) {
  const P = world.room.parkour;
  if (!P) return;
  const zoom = world.zoom || 1;
  const vx0 = camera.x - 120, vx1 = camera.x + CANVAS_W / zoom + 120;
  const vis = (x) => x > vx0 && x < vx1;

  for (const s of P.spikes) if (vis(s.x)) drawSpikePad(ctx, s.x - camera.x, s.y - camera.y, s, spikeState(s, P.time), P.time);
  for (const tr of P.trampolines) if (vis(tr.x) || vis(tr.lx)) drawTrampoline(ctx, tr, camera, t);
  for (const tp of P.teleporters) {
    if (vis(tp.ax)) drawTeleporterPad(ctx, tp.ax - camera.x, tp.ay - camera.y, t, true);
    if (vis(tp.bx)) drawTeleporterPad(ctx, tp.bx - camera.x, tp.by - camera.y, t, false);
  }
  for (const bo of P.boosts) if (!bo.taken && vis(bo.x)) drawBoostPickup(ctx, bo.x - camera.x, bo.y - camera.y, t, bo.x);

  const p = world.player;
  if (p && p.jump) {
    const k = p.airScale || 1;
    ctx.save();
    ctx.globalAlpha = 0.35 / k;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(p.x - camera.x, p.y - camera.y + 10, 14 / k, 6 / k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// Lasers : dessines au-dessus des murs (ils les traversent visuellement d'un emetteur a l'autre).
function renderParkourLasers(ctx, camera, world) {
  const P = world.room && world.room.parkour;
  if (!P) return;
  const zoom = world.zoom || 1;
  const vx0 = camera.x - 60, vx1 = camera.x + CANVAS_W / zoom + 60;
  const t = performance.now() / 1000;
  for (const sh of P.shooters) {
    if (sh.x < vx0 || sh.x > vx1) continue;
    const tt = P.time + sh.offset, local = tt - Math.floor(tt / sh.period) * sh.period;
    drawShooterTrap(ctx, sh.x - camera.x, sh.y - camera.y, sh.angle, local > sh.period - 0.35);
  }
  for (const l of P.lasers) {
    if (Math.max(l.ax, l.bx) < vx0 || Math.min(l.ax, l.bx) > vx1) continue;
    const st = laserState(l, P.time);
    const ax = l.ax - camera.x, ay = l.ay - camera.y, bx = l.bx - camera.x, by = l.by - camera.y;
    ctx.save();
    if (st === 'on') {
      ctx.strokeStyle = 'rgba(255,40,70,0.35)'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.strokeStyle = '#ff3d5a'; ctx.lineWidth = 5; ctx.shadowColor = '#ff3d5a'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.strokeStyle = '#ffe0e6'; ctx.lineWidth = 1.6; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    } else if (st === 'warn') {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 30);
      ctx.strokeStyle = '#ff7a8a'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    ctx.restore();
    for (const [ex, ey] of [[ax, ay], [bx, by]]) {
      ctx.save();
      ctx.fillStyle = '#1a1c24'; ctx.strokeStyle = '#4a4e5c'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(ex, ey, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = st === 'on' ? '#ff3d5a' : (st === 'warn' ? '#ffb0bc' : '#5a2a32');
      ctx.shadowColor = '#ff3d5a'; ctx.shadowBlur = st === 'off' ? 0 : 10;
      ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

function drawSpikePad(ctx, sx, sy, s, state, time) {
  ctx.save();
  ctx.fillStyle = '#1b1d24';
  ctx.strokeStyle = state === 'warn' ? `rgba(255,90,90,${0.5 + 0.5 * Math.sin(time * 28)})` : '#3a3e4a';
  ctx.lineWidth = state === 'warn' ? 2 : 1.5;
  ctx.beginPath(); ctx.roundRect(sx, sy, s.w, s.h, 4); ctx.fill(); ctx.stroke();
  const n = Math.max(2, Math.round(s.w / 16));
  const step = s.w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const cx = sx + (i + 0.5) * step, cy = sy + (j + 0.5) * step;
    if (state === 'in') {
      ctx.fillStyle = '#0b0c10';
      ctx.beginPath(); ctx.arc(cx, cy, step * 0.16, 0, Math.PI * 2); ctx.fill();
    } else {
      const hgt = state === 'out' ? step * 0.42 : step * 0.18;
      const g = ctx.createLinearGradient(cx - hgt, cy - hgt, cx + hgt, cy + hgt);
      g.addColorStop(0, '#f2f4f8'); g.addColorStop(1, state === 'out' ? '#8a2a30' : '#6a6e7a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx, cy - hgt); ctx.lineTo(cx + hgt * 0.7, cy + hgt * 0.6); ctx.lineTo(cx - hgt * 0.7, cy + hgt * 0.6);
      ctx.closePath(); ctx.fill();
    }
  }
  if (state === 'out') { ctx.fillStyle = 'rgba(255,60,60,0.12)'; ctx.fillRect(sx, sy, s.w, s.h); }
  ctx.restore();
}

function drawTrampoline(ctx, tr, camera, t) {
  const sx = tr.x - camera.x, sy = tr.y - camera.y;
  const lx = tr.lx - camera.x, ly = tr.ly - camera.y;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,210,61,0.22)'; ctx.lineWidth = 2; ctx.setLineDash([4, 7]);
  ctx.beginPath(); ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo((sx + lx) / 2, (sy + ly) / 2 - 50, lx, ly); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(lx, ly, 10, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  const squash = tr.bounce > 0 ? 1 - tr.bounce : 1;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(2, 4, 20, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2a34'; ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, 0, 19, 19 * (0.75 + 0.25 * squash), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 14);
  g.addColorStop(0, '#4a4a5a'); g.addColorStop(1, '#16161e');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 14 * (0.75 + 0.25 * squash), 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(Math.atan2(tr.ly - tr.y, tr.lx - tr.x));
  ctx.fillStyle = `rgba(255,210,61,${0.6 + 0.3 * Math.sin(t * 6)})`;
  ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-3, -6); ctx.lineTo(-3, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawTeleporterPad(ctx, sx, sy, t, isEntry) {
  ctx.save();
  ctx.translate(sx, sy);
  const col = isEntry ? '#7fd8ff' : '#b47cff';
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
  g.addColorStop(0, isEntry ? 'rgba(200,245,255,0.7)' : 'rgba(220,190,255,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.shadowColor = col; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0; ctx.lineWidth = 2;
  const spin = t * (isEntry ? 3 : -1.5);
  for (let i = 0; i < 3; i++) {
    const a = spin + i * Math.PI * 2 / 3;
    ctx.beginPath(); ctx.arc(0, 0, 12, a, a + 1.2); ctx.stroke();
  }
  if (!isEntry) { ctx.fillStyle = col; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function drawBoostPickup(ctx, sx, sy, t, seed) {
  const bob = Math.sin(t * 3 + seed) * 3;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 10, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(sx, sy - 4 + bob);
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
  g.addColorStop(0, '#fff6c8'); g.addColorStop(0.6, '#ffd23d'); g.addColorStop(1, 'rgba(255,160,40,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
  // double chevron ">>"
  ctx.fillStyle = '#7a4a00';
  for (const off of [-4, 2]) {
    ctx.beginPath();
    ctx.moveTo(off - 2, -5); ctx.lineTo(off + 3, 0); ctx.lineTo(off - 2, 5); ctx.lineTo(off + 1, 5); ctx.lineTo(off + 6, 0); ctx.lineTo(off + 1, -5);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawShooterTrap(ctx, sx, sy, angle, warn) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(2, 3, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#23252e'; ctx.strokeStyle = '#4a4e5c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-13, -9, 26, 18, 4); ctx.fill(); ctx.stroke();
  ctx.rotate(angle);
  const g = ctx.createLinearGradient(0, -4, 0, 4);
  g.addColorStop(0, '#6a6e7a'); g.addColorStop(1, '#2a2c34');
  ctx.fillStyle = g; ctx.fillRect(2, -4, 16, 8);
  ctx.fillStyle = warn ? '#ffb14d' : '#7a3a1a';
  ctx.shadowColor = '#ff7a3d'; ctx.shadowBlur = warn ? 12 : 0;
  ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
