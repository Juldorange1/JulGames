'use strict';
/* Forge PvP — monde en blocs, collisions et déplacement calqués sur Minecraft 1.8 :
   accélération sol 0,1 (0,13 en sprint), air 0,02 (0,026), friction 0,546 / 0,91, saut 0,42 (+0,2 en sprint),
   gravité (v-0,08)×0,98, accroupi ×0,3 avec arrêt au bord des blocs, ordre des axes Y puis X puis Z. */
(function () {
const FP = window.FP, DEG = FP.DEG;
const W = FP.W = { flat: true, blocks: new Map(), version: 0 };
const key = (x, y, z) => x + ',' + y + ',' + z;
W.key = key;
W.reset = function (flat) { W.flat = flat; W.blocks.clear(); W.version++; };
W.get = (x, y, z) => W.blocks.get(key(x, y, z));
W.set = function (x, y, z, type) { if (type) W.blocks.set(key(x, y, z), type); else W.blocks.delete(key(x, y, z)); W.version++; if (FP.onBlock) FP.onBlock(x, y, z, type); };
// blocs traversables (pas de collision) : eau, toile d'araignée, échelle
W.NOSOLID = new Set(['water', 'cobweb', 'ladder', 'scaffolding']);
FP.extra = []; // boîtes de collision d'entités sur lesquelles on peut marcher (bateau posé)
W.solid = (x, y, z) => { const t = W.blocks.get(key(x, y, z)); return t ? !W.NOSOLID.has(t) : (W.flat && y < 0); };
// glissance des blocs (Minecraft) : 0,6 par défaut
W.SLIPPY = { ice: 0.98, packed_ice: 0.98, blue_ice: 0.989, slime: 0.8 };
W.slip = (x, y, z) => { const t = W.blocks.get(key(x, y, z)); return (t && W.SLIPPY[t]) || 0.6; };
// cases touchées par une boîte (pour l'eau, les toiles, les échelles)
W.touches = (b, type) => {
  for (let x = Math.floor(b[0]); x <= Math.floor(b[3] - 1e-7); x++) for (let y = Math.floor(b[1]); y <= Math.floor(b[4] - 1e-7); y++) for (let z = Math.floor(b[2]); z <= Math.floor(b[5] - 1e-7); z++) if (W.blocks.get(key(x, y, z)) === type) return true;
  return false;
};

// formes de blocs non pleins (coordonnées dans le bloc, comme les hitbox de Minecraft)
W.SHAPES = {
  slab: [0, 0, 0, 1, 0.5, 1],                  // dalle
  head: [0.25, 0, 0.25, 0.75, 0.5, 0.75],      // tête
  pot: [0.3125, 0, 0.3125, 0.6875, 0.375, 0.6875], // pot de fleurs
  pane: [0.4375, 0, 0.4375, 0.5625, 1, 0.5625],    // poteau de barreaux de fer
  bed: [0, 0, 0, 1, 0.5625, 1]                      // lit
};
let curEnt = null; // entité qui bouge (l'échafaudage ne porte que celui qui est au-dessus et pas accroupi)
W.shape = t => W.SHAPES[t] || null;
function collidingBoxes(b) {
  const out = [];
  const x0 = Math.floor(b[0]), x1 = Math.floor(b[3] - 1e-9), y0 = Math.floor(b[1]) - 1, y1 = Math.floor(b[4] - 1e-9), z0 = Math.floor(b[2]), z1 = Math.floor(b[5] - 1e-9);
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    let c;
    if (W.flat && y < 0 && !W.blocks.has(key(x, y, z))) c = [x, y, z, x + 1, y + 1, z + 1];
    else {
      const t = W.blocks.get(key(x, y, z)); if (!t) continue;
      if (t === 'scaffolding') { if (curEnt && !curEnt.sneaking && curEnt._by0 >= y + 1 - 1e-6) { const top = [x, y + 0.875, z, x + 1, y + 1, z + 1]; if (top[3] > b[0] && top[0] < b[3] && top[4] > b[1] && top[1] < b[4] && top[5] > b[2] && top[2] < b[5]) out.push(top); } continue; }
      if (W.NOSOLID.has(t)) continue;
      const sh = W.SHAPES[t]; c = sh ? [x + sh[0], y + sh[1], z + sh[2], x + sh[3], y + sh[4], z + sh[5]] : [x, y, z, x + 1, y + 1, z + 1]; }
    if (c[3] > b[0] && c[0] < b[3] && c[4] > b[1] && c[1] < b[4] && c[5] > b[2] && c[2] < b[5]) out.push(c);
  }
  for (const x of FP.extra) { const c = x.b; if (c[3] > b[0] && c[0] < b[3] && c[4] > b[1] && c[1] < b[4] && c[5] > b[2] && c[2] < b[5]) out.push(c); }
  return out;
}
const expand = (b, dx, dy, dz) => [b[0] + Math.min(0, dx), b[1] + Math.min(0, dy), b[2] + Math.min(0, dz), b[3] + Math.max(0, dx), b[4] + Math.max(0, dy), b[5] + Math.max(0, dz)];
const offset = (b, dx, dy, dz) => [b[0] + dx, b[1] + dy, b[2] + dz, b[3] + dx, b[4] + dy, b[5] + dz];
function clipY(c, b, d) { if (b[3] <= c[0] || b[0] >= c[3] || b[5] <= c[2] || b[2] >= c[5]) return d; if (d > 0 && b[4] <= c[1]) d = Math.min(d, c[1] - b[4]); else if (d < 0 && b[1] >= c[4]) d = Math.max(d, c[4] - b[1]); return d; }
function clipX(c, b, d) { if (b[4] <= c[1] || b[1] >= c[4] || b[5] <= c[2] || b[2] >= c[5]) return d; if (d > 0 && b[3] <= c[0]) d = Math.min(d, c[0] - b[3]); else if (d < 0 && b[0] >= c[3]) d = Math.max(d, c[3] - b[0]); return d; }
function clipZ(c, b, d) { if (b[3] <= c[0] || b[0] >= c[3] || b[4] <= c[1] || b[1] >= c[4]) return d; if (d > 0 && b[5] <= c[2]) d = Math.min(d, c[2] - b[5]); else if (d < 0 && b[2] >= c[5]) d = Math.max(d, c[5] - b[2]); return d; }

FP.entBox = (e, ex, useRender) => {
  const x = useRender ? e.rx : e.x, y = useRender ? e.ry : e.y, z = useRender ? e.rz : e.z, h = e.h || 1.8;
  return [x - 0.3 - ex, y - ex, z - 0.3 - ex, x + 0.3 + ex, y + h + ex, z + 0.3 + ex];
};
FP.boxesFor = b => collidingBoxes(b);

function moveEnt(e, dx, dy, dz) {
  if (e.inWeb) { e.inWeb = false; dx *= 0.25; dy *= 0.05; dz *= 0.25; e.vx = 0; e.vy = 0; e.vz = 0; } // toile d'araignée
  let b = FP.entBox(e, 0);
  if (e.onGround && e.sneaking) { // accroupi : on ne tombe pas du bord
    const st = 0.05, empty = (ox, oz) => collidingBoxes(offset(b, ox, -1, oz)).length === 0;
    while (dx !== 0 && empty(dx, 0)) dx = Math.abs(dx) < st ? 0 : dx - Math.sign(dx) * st;
    while (dz !== 0 && empty(0, dz)) dz = Math.abs(dz) < st ? 0 : dz - Math.sign(dz) * st;
    while (dx !== 0 && dz !== 0 && empty(dx, dz)) { dx = Math.abs(dx) < st ? 0 : dx - Math.sign(dx) * st; dz = Math.abs(dz) < st ? 0 : dz - Math.sign(dz) * st; }
  }
  curEnt = e; e._by0 = b[1];
  const odx = dx, ody = dy, odz = dz, list = collidingBoxes(expand(b, dx, dy, dz));
  curEnt = null;
  for (const c of list) dy = clipY(c, b, dy); b = offset(b, 0, dy, 0);
  for (const c of list) dx = clipX(c, b, dx); b = offset(b, dx, 0, 0);
  for (const c of list) dz = clipZ(c, b, dz);
  e.x += dx; e.y += dy; e.z += dz;
  e.collidedH = odx !== dx || odz !== dz;
  const wasGround = e.onGround;
  e.onGround = ody !== dy && ody < 0;
  if (odx !== dx) e.vx = 0;
  if (odz !== dz) e.vz = 0;
  const vy0 = e.vy;
  if (ody !== dy) e.vy = 0;
  if (e.onGround) {
    // bloc sous les pieds (posY − 0,2, comme Minecraft) : dégâts de chute = arrondi sup. de (chute − 3), × 0,2 sur le foin,
    // 0 sur le slime (sauf accroupi) ; le slime renvoie la vitesse verticale (rebond)
    const under = W.blocks.get(key(Math.floor(e.x), Math.floor(e.y - 0.2), Math.floor(e.z)));
    if (!wasGround) {
      const fb = FP.entBox(e, 0), soft = W.blocks.size > 0 && (W.touches(fb, 'water') || W.touches(fb, 'cobweb')); // arrivé dans l'eau / une toile : pas de dégâts
      // posé sur un bateau ou sur un échafaudage : pas de dégâts ; lit : dégâts ÷ 2 ; foin : × 0,2
      const onBoat = FP.extra.some(x => x.kind === 'boat' && Math.abs(x.b[4] - e.y) < 1e-6 && x.b[0] < fb[3] && x.b[3] > fb[0] && x.b[2] < fb[5] && x.b[5] > fb[2]);
      const mult = soft || onBoat || under === 'scaffolding' ? 0 : under === 'hay' ? 0.2 : under === 'bed' ? 0.5 : (under === 'slime' && !e.sneaking) ? 0 : 1;
      const dmg = Math.max(0, Math.ceil(e.fall - 3)) * mult;
      if (e.fall > 0.6 && e.landFx) e.landFx(e.fall);
      if (e.onLand) e.onLand(e.fall, dmg, under);
    }
    if (under === 'slime' && !e.sneaking && vy0 < 0) e.vy = -vy0;
    if (under === 'bed' && !e.sneaking && vy0 < 0 && !wasGround) e.vy = -vy0 * 0.66; // le lit fait rebondir
    e.fall = 0;
  } else if (dy < 0) e.fall -= dy;
}

FP.makeEnt = function (x, z, yaw, look) {
  return { x, y: 0, z, px: x, py: 0, pz: z, rx: x, ry: 0, rz: z, vx: 0, vy: 0, vz: 0, yaw: yaw || 0, pitch: 0, onGround: true, fall: 0, h: 1.8,
    sprinting: false, sent: false, srv: false, sneaking: false, jumpTicks: 0, speedLvl: 0, lookYaw: null, input: { f: 0, s: 0, jump: false, sneak: false },
    hurtCd: 0, hurtTime: 0, hp: 20, hits: 0, sinceSwing: 100, swingAnim: 0, walk: 0, walkAmt: 0, dead: 0, look: look || {},
    strafeDir: 1, strafeT: 0, noise: 0, noiseT: 0, noiseTarget: 0, wtap: 0, react: 0, cdGoal: 1, critMode: false,
    jumpReq: 0, wantSprint: true, jumpTick: -99, tick: 0 };
};

// un tick de déplacement (20 par seconde), ordre exact de Minecraft
FP.stepEnt = function (e, tick) {
  e.px = e.x; e.py = e.y; e.pz = e.z;
  if (Math.abs(e.vx) < 0.005) e.vx = 0; if (Math.abs(e.vy) < 0.005) e.vy = 0; if (Math.abs(e.vz) < 0.005) e.vz = 0;
  const inp = e.input;
  e.sneaking = !!inp.sneak;
  e.h = e.sneaking ? 1.5 : 1.8;
  let f = inp.f, s = inp.s;
  if (e.sneaking) { f *= 0.3; s *= 0.3; }
  const spr = e.sprinting && !e.sneaking;
  // saut : 10 ticks d'attente entre deux sauts si la touche reste enfoncée (comme Minecraft)
  if (e.jumpTicks > 0) e.jumpTicks--;
  if (inp.jump) {
    if (e.onGround && !e.jumpTicks) {
      e.vy = 0.42; e.jumpTick = tick; e.jumpTicks = 10;
      if (spr) { const r = e.yaw * DEG; e.vx -= Math.sin(r) * 0.2; e.vz += Math.cos(r) * 0.2; }
    }
  } else e.jumpTicks = 0;
  // eau : boîte réduite de 0,4 en bas (comme Minecraft) ; elle annule la chute
  const bb = FP.entBox(e, 0), wb = [bb[0] + 0.001, bb[1] + 0.4 + 0.001, bb[2] + 0.001, bb[3] - 0.001, bb[4] - 0.001, bb[5] - 0.001];
  const inWater = W.blocks.size > 0 && W.touches(wb, 'water');
  if (inWater) e.fall = 0;
  if (W.blocks.size > 0 && W.touches([bb[0] + 0.001, bb[1] + 0.001, bb[2] + 0.001, bb[3] - 0.001, bb[4] - 0.001, bb[5] - 0.001], 'cobweb')) { e.inWebNext = true; e.fall = 0; }
  const lt = W.blocks.get(key(Math.floor(e.x), Math.floor(e.y), Math.floor(e.z))), ladder = lt === 'ladder' || lt === 'scaffolding'; // grimpables
  if (inWater && inp.jump) e.vy += 0.04; // nager vers le haut
  f *= 0.98; s *= 0.98;
  const accel = a => {
    let d = f * f + s * s;
    if (d >= 1e-4) { d = Math.sqrt(d); if (d < 1) d = 1; d = a / d; const ff = f * d, ss = s * d, r = e.yaw * DEG, sn = Math.sin(r), cs = Math.cos(r); e.vx += ss * cs - ff * sn; e.vz += ff * cs + ss * sn; }
  };
  if (inWater) { // nage : accélération 0,02, freinage ×0,8, gravité −0,02
    accel(0.02);
    if (e.inWebNext) { e.inWeb = true; e.inWebNext = false; }
    moveEnt(e, e.vx, e.vy, e.vz);
    e.vx *= 0.8; e.vy *= 0.8; e.vz *= 0.8; e.vy -= 0.02;
  } else {
    const ground = e.onGround, slip = ground ? W.slip(Math.floor(e.x), Math.floor(e.y) - 1, Math.floor(e.z)) : 1, fr = ground ? slip * 0.91 : 0.91;
    // vitesse au sol = attribut de vitesse (0,1) × 1,3 en sprint × (1 + 0,2 par niveau de l'effet Vitesse) × 0,16277136 / (glissance × 0,91)³
    accel(ground ? 0.1 * (spr ? 1.3 : 1) * (1 + 0.2 * (e.speedLvl || 0)) * (0.16277136 / (fr * fr * fr)) : (spr ? 0.026 : 0.02));
    if (ladder) { e.vx = FP.clamp(e.vx, -0.15, 0.15); e.vz = FP.clamp(e.vz, -0.15, 0.15); e.fall = 0; if (e.vy < -0.15) e.vy = -0.15; if (e.sneaking && e.vy < 0) e.vy = 0; }
    if (e.inWebNext) { e.inWeb = true; e.inWebNext = false; }
    moveEnt(e, e.vx, e.vy, e.vz);
    if (ladder && e.collidedH) e.vy = 0.2;
    e.vy = (e.vy - 0.08) * 0.98; e.vx *= fr; e.vz *= fr;
    // marcher sur du slime ralentit
    if (e.onGround && Math.abs(e.vy) < 0.1 && !e.sneaking && W.blocks.get(key(Math.floor(e.x), Math.floor(e.y) - 1, Math.floor(e.z))) === 'slime') { const k = 0.4 + Math.abs(e.vy) * 0.2; e.vx *= k; e.vz *= k; }
  }
  if (W.flat) { e.x = FP.clamp(e.x, -FP.ARENA, FP.ARENA); e.z = FP.clamp(e.z, -FP.ARENA, FP.ARENA); }
  const mv = Math.hypot(e.x - e.px, e.z - e.pz);
  e.walk += mv; e.walkAmt += (FP.clamp(mv * 4.5, 0, 1) - e.walkAmt) * 0.4;
};

// sprint : il faut avancer « franchement » (≥ 0,8) et ne pas être accroupi
FP.updateSprint = function (e, want) {
  const fwd = e.input.f * (e.input.sneak ? 0.3 : 1);
  if (e.sprinting && (fwd < 0.8 || e.collidedH)) e.sprinting = false;
  if (!e.sprinting && fwd >= 0.8 && want) e.sprinting = true;
};
// le client ne prévient le serveur que si l'état de sprint a changé depuis le dernier envoi → d'où le W-tap
FP.sendSprint = e => { if (e.sprinting !== e.sent) { e.sent = e.sprinting; e.srv = e.sprinting; } };

// obstacle rouge du parkour : le simple contact (même sans s'enfoncer) est mortel
// ---------------------------------------------------------------- bateau (classe Boat de Minecraft 1.9+, à l'identique)
// Boîte de 1,375 × 0,5625. Chaque tick : frottement = glissance moyenne des blocs sous la coque (glace / glace compactée
// 0,98, glace bleue 0,989, autres 0,6 ; en l'air 0,9) appliqué à la vitesse ET à la vitesse de rotation, gravité −0,04,
// puis commandes : ←/→ = ∓1° de vitesse de rotation par tick, avancer = +0,04 de poussée (+0,005 si on tourne sans
// avancer ni reculer), reculer = −0,005 ; puis déplacement avec collisions (aucune marche : un bloc arrête le bateau).
FP.SLIP = { ice: 0.98, packed_ice: 0.98, blue_ice: 0.989 };
FP.boatBox = b => [b.x - 0.6875, b.y, b.z - 0.6875, b.x + 0.6875, b.y + 0.5625, b.z + 0.6875];
FP.makeBoat = (x, y, z, yaw) => ({ x, y, z, px: x, py: y, pz: z, vx: 0, vy: 0, vz: 0, yaw: yaw || 0, pyaw: yaw || 0, dr: 0, onGround: true, hitH: false });
FP.boatFriction = function (b) {
  const bb = FP.boatBox(b), y = Math.floor(b.y - 0.001);
  let sum = 0, n = 0;
  for (let x = Math.floor(bb[0]); x <= Math.floor(bb[3] - 1e-7); x++) for (let z = Math.floor(bb[2]); z <= Math.floor(bb[5] - 1e-7); z++) {
    const t = W.get(x, y, z) || (W.flat && y < 0 ? 'grass' : null);
    if (t) { sum += FP.SLIP[t] || 0.6; n++; }
  }
  return n ? sum / n : 0;
};
FP.stepBoat = function (b, inp) {
  b.px = b.x; b.py = b.y; b.pz = b.z; b.pyaw = b.yaw;
  const fr = FP.boatFriction(b), mom = fr > 0 ? fr : 0.9;
  b.vx *= mom; b.vz *= mom; b.vy += -0.04; b.dr *= mom;
  let f = 0;
  if (inp.left) b.dr -= 1;
  if (inp.right) b.dr += 1;
  if (inp.right !== inp.left && !inp.up && !inp.down) f += 0.005;
  b.yaw += b.dr;
  if (inp.up) f += 0.04;
  if (inp.down) f -= 0.005;
  b.vx += Math.sin(-b.yaw * DEG) * f; b.vz += Math.cos(b.yaw * DEG) * f;
  // déplacement : Y d'abord, puis l'axe horizontal le plus petit en premier (ordre de Minecraft)
  let dx = b.vx, dy = b.vy, dz = b.vz, bb = FP.boatBox(b);
  const list = collidingBoxes(expand(bb, dx, dy, dz));
  for (const c of list) dy = clipY(c, bb, dy); bb = offset(bb, 0, dy, 0);
  if (Math.abs(dx) < Math.abs(dz)) { for (const c of list) dz = clipZ(c, bb, dz); bb = offset(bb, 0, 0, dz); for (const c of list) dx = clipX(c, bb, dx); }
  else { for (const c of list) dx = clipX(c, bb, dx); bb = offset(bb, dx, 0, 0); for (const c of list) dz = clipZ(c, bb, dz); }
  b.hitH = dx !== b.vx || dz !== b.vz;
  b.onGround = dy !== b.vy && b.vy < 0;
  if (dx !== b.vx) b.vx = 0;
  if (dz !== b.vz) b.vz = 0;
  if (dy !== b.vy) b.vy = 0;
  b.x += dx; b.y += dy; b.z += dz;
};
FP.touchDanger = function (e) {
  const b = FP.entBox(e, 0), k = 0.001;
  for (let x = Math.floor(b[0] - k); x <= Math.floor(b[3] + k); x++) for (let y = Math.floor(b[1] - k); y <= Math.floor(b[4] + k); y++) for (let z = Math.floor(b[2] - k); z <= Math.floor(b[5] + k); z++)
    if (W.get(x, y, z) === 'danger') return true;
  return false;
};
FP.separate = function (a, b) {
  if (!a || !b) return;
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
  if (d < 0.6 && Math.abs(a.y - b.y) < 1.8) { const k = (0.6 - d) / 2 / (d || 1e-3); a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; }
};

// ---------------------------------------------------------------- rayons
FP.lookDir = function (yaw, pitch) {
  const cy = Math.cos(yaw * DEG), sy = Math.sin(yaw * DEG), cp = Math.cos(pitch * DEG), sp = Math.sin(pitch * DEG);
  return [-sy * cp, -sp, cy * cp];
};
FP.rayBox = function (o, d, b) {
  let tmin = 0, tmax = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) { if (o[i] < b[i] || o[i] > b[i + 3]) return Infinity; continue; }
    const inv = 1 / d[i]; let t0 = (b[i] - o[i]) * inv, t1 = (b[i + 3] - o[i]) * inv;
    if (t0 > t1) { const t = t0; t0 = t1; t1 = t; }
    if (t0 > tmin) tmin = t0; if (t1 < tmax) tmax = t1;
    if (tmax < tmin) return Infinity;
  }
  return tmin;
};
FP.distPointBox = function (x, y, z, b) {
  return Math.hypot(Math.max(b[0] - x, 0, x - b[3]), Math.max(b[1] - y, 0, y - b[4]), Math.max(b[2] - z, 0, z - b[5]));
};
// parcours de grille (Amanatides & Woo) : premier bloc solide touché + face
// rayon vers la première case qui vérifie pred (ex. une source d'eau pour le seau vide)
FP.rayCell = function (o, d, maxD, pred) {
  let x = Math.floor(o[0]), y = Math.floor(o[1]), z = Math.floor(o[2]);
  const sx = Math.sign(d[0]), sy = Math.sign(d[1]), sz = Math.sign(d[2]);
  const tdx = sx ? Math.abs(1 / d[0]) : Infinity, tdy = sy ? Math.abs(1 / d[1]) : Infinity, tdz = sz ? Math.abs(1 / d[2]) : Infinity;
  let tmx = sx ? ((sx > 0 ? x + 1 - o[0] : o[0] - x) * tdx) : Infinity, tmy = sy ? ((sy > 0 ? y + 1 - o[1] : o[1] - y) * tdy) : Infinity, tmz = sz ? ((sz > 0 ? z + 1 - o[2] : o[2] - z) * tdz) : Infinity;
  let nx = 0, ny = 0, nz = 0, t = 0;
  for (let i = 0; i < 64; i++) {
    const r = pred(x, y, z); if (r) return { x, y, z, nx, ny, nz, t };
    if (r === null) return null;
    if (tmx < tmy && tmx < tmz) { t = tmx; if (t > maxD) break; x += sx; tmx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if (tmy < tmz) { t = tmy; if (t > maxD) break; y += sy; tmy += tdy; nx = 0; ny = -sy; nz = 0; }
    else { t = tmz; if (t > maxD) break; z += sz; tmz += tdz; nx = 0; ny = 0; nz = -sz; }
  }
  return null;
};
FP.rayBlock = function (o, d, maxD) {
  let x = Math.floor(o[0]), y = Math.floor(o[1]), z = Math.floor(o[2]);
  const sx = Math.sign(d[0]), sy = Math.sign(d[1]), sz = Math.sign(d[2]);
  const tdx = sx ? Math.abs(1 / d[0]) : Infinity, tdy = sy ? Math.abs(1 / d[1]) : Infinity, tdz = sz ? Math.abs(1 / d[2]) : Infinity;
  let tmx = sx ? ((sx > 0 ? x + 1 - o[0] : o[0] - x) * tdx) : Infinity;
  let tmy = sy ? ((sy > 0 ? y + 1 - o[1] : o[1] - y) * tdy) : Infinity;
  let tmz = sz ? ((sz > 0 ? z + 1 - o[2] : o[2] - z) * tdz) : Infinity;
  let nx = 0, ny = 0, nz = 0, t = 0;
  for (let i = 0; i < 64; i++) {
    if (W.solid(x, y, z)) return { x, y, z, nx, ny, nz, t };
    if (tmx < tmy && tmx < tmz) { t = tmx; if (t > maxD) break; x += sx; tmx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if (tmy < tmz) { t = tmy; if (t > maxD) break; y += sy; tmy += tdy; nx = 0; ny = -sy; nz = 0; }
    else { t = tmz; if (t > maxD) break; z += sz; tmz += tdz; nx = 0; ny = 0; nz = -sz; }
  }
  return null;
};
})();
