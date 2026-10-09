'use strict';
/* Forge PvP — mode « regarder » : l'ordinateur joue à ta place, avec les mêmes commandes et la même physique
   que toi (touches virtuelles, clics, rotation de la caméra limitée). Il joue parfaitement mais ne connaît pas
   l'avenir : il observe la vitesse des cibles et anticipe leur position. */
(function () {
const FP = window.FP, W = FP.W, DEG = FP.DEG, clamp = FP.clamp, wrap = FP.wrap;
const AI = FP.AI = {};

// ---------------------------------------------------------------- outils
function angles(eye, pt) {
  const dx = pt[0] - eye[0], dy = pt[1] - eye[1], dz = pt[2] - eye[2];
  return { yaw: Math.atan2(-dx, dz) / DEG, pitch: -Math.atan2(dy, Math.hypot(dx, dz)) / DEG };
}
// tourne la vue vers un angle, de façon fluide (accélère puis freine), au plus maxStep degrés par tick ;
// renvoie l'erreur restante
function turn(G, yaw, pitch, maxStep) {
  const acc = Math.max(4, maxStep * 0.5);
  G.yv = FP.camStep(G.yv || 0, wrap(yaw - G.yaw), maxStep, acc); G.yaw += G.yv;
  G.pv = FP.camStep(G.pv || 0, clamp(pitch, -90, 90) - G.pitch, maxStep, acc); G.pitch = clamp(G.pitch + G.pv, -90, 90);
  return Math.hypot(wrap(yaw - G.yaw), pitch - G.pitch);
}
// convertit une direction voulue (dans le monde) en touches avancer / reculer / gauche / droite
function moveDir(G, wx, wz) {
  const r = G.yaw * DEG, fx = -Math.sin(r), fz = Math.cos(r), lx = Math.cos(r), lz = Math.sin(r);
  const f = wx * fx + wz * fz, s = wx * lx + wz * lz, L = Math.hypot(f, s) || 1;
  G.vk.fwd = f / L > 0.35; G.vk.back = f / L < -0.35; G.vk.left = s / L > 0.35; G.vk.right = s / L < -0.35;
}
// vitesse observée d'une entité (lissée) : l'ordinateur ne connaît que le passé
function observe(A, e) {
  let h = A.obs.get(e);
  if (!h || h.t !== A.t - 1) h = { x: e.x, y: e.y, z: e.z, vx: 0, vy: 0, vz: 0 };
  const vx = e.x - h.x, vy = e.y - h.y, vz = e.z - h.z;
  h = { x: e.x, y: e.y, z: e.z, vx: FP.lerp(h.vx, vx, 0.5), vy: FP.lerp(h.vy, vy, 0.5), vz: FP.lerp(h.vz, vz, 0.5), t: A.t };
  A.obs.set(e, h);
  return h;
}
function state(G) { if (!G.ai) G.ai = { t: 0, obs: new Map() }; G.ai.t++; return G.ai; }

AI.tick = function (G) {
  if (G.cd > 0 || G.ended || G.paused) return;
  const A = state(G);
  try {
    if (G.id === 'duel18') boxing(G, A);
    else if (G.id === 'flick') flick(G, A);
    else if (G.id === 'dodge') dodge(G, A);
    else if (G.id === 'targets') targets(G, A);
    else if (G.id === 'build') build(G, A);
    else if (G.id === 'bridge') bridge(G, A);
    else if (G.id === 'parkour') parkour(G, A);
    else if (G.id === 'course') course(G, A);
    else if (G.id === 'foret') forest(G, A);
    else if (G.id === 'bateau') boat(G, A);
    else if (G.id === 'clutch') clutchAI(G, A);
    else if (G.id === 'minage') mineAI(G, A);
    else if (G.id === 'vent') vent(G, A);
  } catch (err) { console.error(err); }
};

// ================================================================ boxing & ciblage
function boxing(G, A) {
  const M = FP.M, p = G.p;
  let t = null, best = 1e9;
  for (const e of G.ents) { if (e.dead) continue; const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < best) { best = d; t = e; } }
  if (!t) return;
  const o = observe(A, t), lead = 2; // vise là où la cible sera dans 2 ticks
  const eye = M.eyePos(), pt = [t.x + o.vx * lead, t.y + 1.25 + o.vy, t.z + o.vz * lead];
  const a = angles(eye, pt); turn(G, a.yaw, a.pitch, 45);
  // déplacement : fonce en sprint, strafe quand il est au contact d'un adversaire qui attaque
  G.vk.fwd = true; G.vk.sprint = true;
  if (G.attack) {
    if (best < 2.4) G.vk.fwd = false;
    if (best < 5) { if (!(--A.strafeT > 0)) { A.strafe = A.strafe === 1 ? -1 : 1; A.strafeT = 10 + (Math.random() * 18 | 0); } G.vk.left = A.strafe > 0; G.vk.right = A.strafe < 0; }
  }
  if (A.wtap > 0) { A.wtap--; G.vk.fwd = false; } // W-tap parfait après chaque coup
  // frappe uniquement quand la cible n'est plus invulnérable (on voit son flash rouge) et qu'elle est à portée
  // Minecraft actuel : il ne frappe qu'avec la charge pleine
  const charge = G.modern ? Math.min(1, (p.sinceSwing + 0.5) / 12.5) : 1;
  if (G.dmgMode && best < 4.2) { // dégâts max : uniquement des critiques (en retombant d'un saut, sans sprint)
    const falling = !p.onGround && p.fall > 0 && p.vy < 0, aimed = M.aimEnt(3) === t;
    A.wtap = 0;
    if (G.modern) {
      if (charge >= 0.98 || p.sinceSwing > 6) {
        G.vk.sprint = false;
        if (p.onGround) { if (p.sprinting) G.vk.fwd = false; else G.vk.jump = true; } // on coupe le sprint, puis on saute
      }
      if (charge >= 0.98 && falling && !p.srv && aimed && t.hurtTime === 0) { G.clickTimes.push(performance.now()); M.onClick(0); }
    } else {
      G.vk.jump = true; A.idle = t.hurtTime === 0 ? (A.idle || 0) + 1 : 0;
      if (aimed && t.hurtTime === 0 && (falling || A.idle > 5)) { G.clickTimes.push(performance.now()); M.onClick(0); }
    }
    return;
  }
  if (charge >= 0.98 && t.hurtTime === 0 && M.aimEnt(3) === t) { G.clickTimes.push(performance.now()); M.onClick(0); A.wtap = 2; }
}

// ================================================================ réflexes
function flick(G, A) {
  const M = FP.M, t = G.o; if (!t) return;
  const a = angles(M.eyePos(), [t.x, t.y + 1.1, t.z]);
  turn(G, a.yaw, a.pitch, 70, 0.55);
  if (M.aimHit(t, 60)) { G.clickTimes.push(performance.now()); M.onClick(0); }
}

// ================================================================ esquive de flèches
// Il voit les flèches déjà en vol (leur trajectoire n'est que de la physique) mais ne sait pas où les tireurs vont
// viser. Chaque tick, il simule toutes les combinaisons de touches avec sa vraie physique et garde celle qui ne se
// fait pas toucher. Sans flèche dangereuse, il se déplace en changeant souvent de direction pour fausser leur visée.
const DMOVES = [];
for (const f of [1, 0, -1]) for (const s of [1, 0, -1]) for (const jump of [false, true]) DMOVES.push({ f, s, jump });
function arrowPaths(G, H) {
  const paths = [];
  for (const ar of G.arrows) {
    if (!ar.enemy || ar.stuck || ar.dead) continue;
    let x = ar.x, y = ar.y, z = ar.z, vx = ar.vx, vy = ar.vy, vz = ar.vz; const path = [];
    for (let k = 0; k < H; k++) {
      const len = Math.hypot(vx, vy, vz), dir = [vx / len, vy / len, vz / len];
      const bh = FP.rayBlock([x, y, z], dir, len);
      path.push({ o: [x, y, z], dir, len: bh ? bh.t : len });
      if (bh) break; // la flèche se plante dans un bloc
      x += vx; y += vy; z += vz; vx *= 0.99; vy = vy * 0.99 - 0.05; vz *= 0.99;
      if (y < -5) break;
    }
    paths.push(path);
  }
  return paths;
}
function simMove(G, m, paths, H) {
  const e = FP.Plan.ent(FP.Plan.snap(G.p));
  for (let k = 0; k < H; k++) {
    e.yaw = G.yaw; e.input.f = m.f; e.input.s = m.s; e.input.jump = m.jump; e.input.sneak = false;
    FP.updateSprint(e, true); FP.stepEnt(e, G.tick + k + 1);
    const b = FP.entBox(e, 0.3);
    for (const path of paths) { const sg = path[k]; if (sg && FP.rayBox(sg.o, sg.dir, b) <= sg.len) return { hit: k, x: e.x, z: e.z }; }
  }
  return { hit: Infinity, x: e.x, z: e.z };
}
function dodge(G, A) {
  const p = G.p, H = 26;
  // regard : le tireur le plus avancé dans sa charge (c'est lui qui va tirer)
  let watch = null, bestK = -1;
  for (const e of G.ents) {
    const k = e.weapon === 'xbow' ? (e.loaded ? 1.2 : e.drawT / 25) : (e.drawT > 0 ? e.drawT / 20 : 0);
    if (k > bestK) { bestK = k; watch = e; }
  }
  const paths = arrowPaths(G, H);
  if (watch) { const a = angles(FP.M.eyePos(), [watch.x, watch.y + 1.4, watch.z]); turn(G, a.yaw, a.pitch, 25); }
  // déplacement « de base » : change de direction souvent, revient vers le centre de l'arène s'il s'en éloigne
  if (!(--A.wT > 0) || !A.wander) {
    const far = Math.hypot(p.x, p.z) > 14;
    if (far) { A.wander = null; A.home = true; }
    else { const opts = DMOVES.filter(m => !m.jump && (m.f || m.s)); A.wander = opts[(Math.random() * opts.length) | 0]; A.home = false; }
    A.wT = 6 + (Math.random() * 14 | 0);
  }
  let pick = null;
  if (paths.length) {
    let best = null;
    for (const m of DMOVES) {
      const r = simMove(G, m, paths, H);
      const same = A.last && A.last.f === m.f && A.last.s === m.s && A.last.jump === m.jump ? 1 : 0;
      const score = (r.hit === Infinity ? 1e6 : r.hit * 1000) + same * 50 - (m.jump ? 20 : 0) - Math.hypot(r.x, r.z) * 2;
      if (!best || score > best.score) best = { m, score, hit: r.hit };
    }
    const base = A.home ? null : A.wander;
    if (base && simMove(G, base, paths, H).hit === Infinity) pick = base; else pick = best.m;
  } else if (A.home) {
    const r = G.yaw * DEG, fx = -Math.sin(r), fz = Math.cos(r), lx = Math.cos(r), lz = Math.sin(r), wx = -p.x, wz = -p.z;
    const f = wx * fx + wz * fz, s = wx * lx + wz * lz, L = Math.hypot(f, s) || 1;
    pick = { f: f / L > 0.35 ? 1 : f / L < -0.35 ? -1 : 0, s: s / L > 0.35 ? 1 : s / L < -0.35 ? -1 : 0, jump: false };
  } else pick = A.wander;
  A.last = pick;
  G.vk.fwd = pick.f > 0; G.vk.back = pick.f < 0; G.vk.left = pick.s > 0; G.vk.right = pick.s < 0; G.vk.jump = pick.jump || p.collidedH; G.vk.sprint = true;
}

// ================================================================ cibles : épée, arc, arbalète
// Épée pour les cibles proches, arbalète (si elle est chargée) ou arc pour les autres, charge de l'arc adaptée à la
// distance ; il recharge l'arbalète entre deux manches. Une cible cachée derrière un obstacle : il va la chercher.
const bowSpeed = n => { let f = n / 20; f = (f * f + f * 2) / 3; return Math.min(1, f) * 3; };
function arrowClear(from, yaw, pitch, speed, ticks) {
  const d = FP.lookDir(yaw, pitch); let x = from[0], y = from[1], z = from[2], vx = d[0] * speed, vy = d[1] * speed, vz = d[2] * speed;
  for (let k = 0; k < ticks - 1; k++) {
    const len = Math.hypot(vx, vy, vz);
    if (FP.rayBlock([x, y, z], [vx / len, vy / len, vz / len], len)) return false;
    x += vx; y += vy; z += vz; vx *= 0.99; vy = vy * 0.99 - 0.05; vz *= 0.99;
  }
  return true;
}
function targets(G, A) {
  const M = FP.M, p = G.p, eye = M.eyePos();
  if (A.release) { A.release = false; M.onRightUp(); }
  A.pend = A.pend || new Map(); A.hidden = A.hidden || new Map();
  for (const [e, t] of A.pend) if (A.t > t || e.dead) A.pend.delete(e);
  for (const [e, t] of A.hidden) if (A.t > t || e.dead) A.hidden.delete(e);
  const sel = w => { const i = M.WEAPONS.indexOf(w); if (G.sel !== i) M.selectSlot(i); };
  const live = G.ents.filter(e => !e.dead);
  // entre deux manches : recharger l'arbalète
  if (G.roundT > 0 || !live.length) {
    if (!G.xLoaded) { sel('xbow'); if (G.xCharge >= G.xNeed) M.onRightUp(); else if (!G.rmb) M.rightDown(); }
    else if (G.rmb) M.onRightUp();
    return;
  }
  let t = A.tgt && !A.tgt.dead && !A.pend.has(A.tgt) ? A.tgt : null;
  if (!t) {
    let melee = null, md = 1e9, far = null, fa = 1e9;
    for (const e of live) {
      if (A.pend.has(e)) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (e.y <= 3.5 && (d < 4.5 || A.hidden.has(e)) && d < md) { md = d; melee = e; }
      const a = angles(eye, [e.x, e.y + 0.9, e.z]), da = Math.abs(wrap(a.yaw - G.yaw)) + Math.abs(a.pitch - G.pitch) * 0.5 + d * 0.4;
      if (!A.hidden.has(e) && da < fa) { fa = da; far = e; }
    }
    t = melee || far || live.find(e => !A.pend.has(e));
    if (!t) { if (G.rmb && G.weapon !== 'bow') M.onRightUp(); return; } // toutes les flèches sont en vol : on attend
    A.tgt = t; A.mode = t === melee ? 'sword' : (G.xLoaded ? 'xbow' : 'bow'); A.since = 0;
  }
  A.since++;
  const o = observe(A, t), d = Math.hypot(t.x - p.x, t.z - p.z);
  if (A.mode === 'sword') {
    sel('sword');
    const a = angles(eye, [t.x + o.vx * 2, t.y + 1.1, t.z + o.vz * 2]); turn(G, a.yaw, a.pitch, 40);
    if (d > 1.6) { moveDir(G, t.x + o.vx * 3 - p.x, t.z + o.vz * 3 - p.z); G.vk.sprint = true; G.vk.jump = p.collidedH && p.onGround; }
    if (M.aimEnt(3) === t) { G.clickTimes.push(performance.now()); M.onClick(0); A.tgt = null; }
    else if (A.since > 120) { A.tgt = null; A.hidden.delete(t); } // trop long : il change de plan
    return;
  }
  if (A.mode === 'xbow' && !G.xLoaded) A.mode = 'bow';
  const from = [eye[0], eye[1] - 0.1, eye[2]], tgt = [t.x, t.y + 0.9, t.z], vel = [o.vx, 0, o.vz];
  const n = A.mode === 'bow' ? (d < 8 ? 10 : d < 15 ? 14 : 20) : 0, speed = A.mode === 'bow' ? bowSpeed(n) : 3.15;
  sel(A.mode);
  const sol = M.ballistic(from, tgt, vel, speed);
  const err = turn(G, sol.yaw, sol.pitch, 30, 0.6);
  if (err < 3 && !arrowClear(from, sol.yaw, sol.pitch, speed, sol.ticks)) { // obstacle sur la trajectoire : il ira la chercher
    A.hidden.set(t, A.t + 100); A.tgt = null; if (G.rmb && A.mode === 'bow') M.cancelDraw();
    return;
  }
  if (A.mode === 'bow') {
    if (!G.rmb) M.rightDown();
    if (G.drawTicks >= n && err < 0.25) { M.onRightUp(); A.pend.set(t, A.t + Math.ceil(sol.ticks) + 4); A.tgt = null; }
  } else if (err < 0.25) { M.onClick(2); A.release = true; A.pend.set(t, A.t + Math.ceil(sol.ticks) + 4); A.tgt = null; }
}

// ================================================================ construction rapide
// Il ne connaît que les blocs de la maquette qu'il a vus. Il se déplace sur une grille de colonnes (sol + dessus des
// blocs) en ne montant que d'un bloc à la fois, vérifie qu'il avance vraiment (sinon il change de plan), corrige tout
// bloc en trop, et pose des blocs d'aide (échafaudage autour de la parcelle, ou marches dans la parcelle qu'il casse
// à la fin) quand un endroit est hors de portée.
function build(G, A) {
  const M = FP.M, p = G.p;
  if (G.roundT > 0 || !G.model) { A.task = null; return; }
  if (A.cool > 0) A.cool--;
  if (A.model !== G.model) { A.model = G.model; A.task = null; A.known = new Map(); A.sv = null; A.surveys = 0; A.helpers = new Set(); A.bad = null; A.idle = 0; }
  look(G, A);
  if (A.stuck > 0) A.stuck--;
  if (!A.task && A.surveys > 0 && !(A.stuck > 0)) {
    A.task = fixTask(G, A) || pickTask(G, A) || scaffoldTask(G, A) || helperCleanup(G, A);
    A.tries = 0; A.miss = 0; A.still = 0; A.lastPos = null;
    if (!A.task) { A.stuck = 8; A.bad = null; A.idle++; }
    else A.idle = 0;
  }
  if (!A.task) {
    // il observe d'abord la maquette en entier ; ensuite il ne refait un tour que s'il n'a vraiment plus rien à faire
    if (A.surveys === 0 || A.idle > 6) { survey(G, A); if (A.surveys > 0 && A.idle > 6 && !A.sv) A.idle = 0; }
    return;
  }
  const T = A.task;
  if (T.kind === 'place' && W.get(T.cell.x, T.cell.y, T.cell.z) === T.cell.type) { A.task = null; return; }
  if (T.kind === 'break' && !W.get(T.cell.x, T.cell.y, T.cell.z)) { A.task = null; return; }
  // garde-fou : s'il ne bouge plus alors qu'il devrait avancer, ce plan est abandonné (jamais bloqué contre un mur)
  const moving = T.path.length > 0;
  if (moving) {
    const pos = [p.x, p.y, p.z];
    if (A.lastPos && Math.hypot(pos[0] - A.lastPos[0], pos[1] - A.lastPos[1], pos[2] - A.lastPos[2]) < 0.01) A.still++; else A.still = 0;
    A.lastPos = pos;
    if (A.still > 14) { failTask(A); return; }
  }
  // suivre le chemin de colonnes
  const cx = Math.floor(p.x), cz = Math.floor(p.z);
  while (T.path.length && T.path[0][0] === cx && T.path[0][1] === cz && Math.hypot(T.path[0][0] + 0.5 - p.x, T.path[0][1] + 0.5 - p.z) < (T.path.length > 1 ? 0.45 : 0.18) && Math.abs(p.y - T.path[0][2]) < 0.6) T.path.shift();
  if (T.path.length) {
    const [nx, nz, nh] = T.path[0], a = angles([p.x, 0, p.z], [nx + 0.5, 0, nz + 0.5]), d = Math.hypot(nx + 0.5 - p.x, nz + 0.5 - p.z);
    turn(G, a.yaw, 25, 45); moveDir(G, nx + 0.5 - p.x, nz + 0.5 - p.z); G.vk.sprint = Math.abs(wrap(a.yaw - G.yaw)) < 20 && d > 1.5; G.vk.sneak = d < 0.6 && T.path.length === 1;
    // saut seulement pour monter d'exactement un bloc, au bord
    if (nh - p.y > 0.5 && nh - p.y < 1.3 && d < 1.15 && p.onGround) G.vk.jump = true;
    if (++A.tries > 240) failTask(A);
    return;
  }
  const eye = [p.x, p.y + 1.62, p.z];
  if (T.kind === 'pillar') { // un bloc sous ses pieds : regarder en bas, sauter, poser au sommet du saut sur SA colonne
    const err = turn(G, G.yaw, 90, 45);
    const top = Math.round(T.h);
    if (p.onGround && Math.hypot(T.x + 0.5 - p.x, T.z + 0.5 - p.z) > 0.12) { moveDir(G, T.x + 0.5 - p.x, T.z + 0.5 - p.z); G.vk.sneak = true; return; }
    if (p.onGround && err < 1) G.vk.jump = true;
    if (!p.onGround && p.y >= top + 1.0 && !(A.cool > 0)) {
      const h = FP.rayBlock(eye, FP.lookDir(G.yaw, G.pitch), 5);
      if (h && h.x === T.x && h.z === T.z && h.y === top - 1 && h.ny === 1) {
        M.selectSlot(0); M.buildPlace(); A.cool = 1;
        if (W.solid(T.x, top, T.z)) { if (M.inBuildZone(T.x, top, T.z)) A.helpers.add(W.key(T.x, top, T.z)); A.task = null; A.bad = null; }
      }
    }
    if (++A.tries > 60) failTask(A);
    return;
  }
  if (T.jump && p.onGround && !T.jumped) { G.vk.jump = true; T.jumped = true; }
  if (T.jump && p.onGround && T.jumped && A.tries > 4) T.jumped = false;
  const a = angles(eye, T.point), err = turn(G, a.yaw, a.pitch, 60);
  const ready = !T.jump || (!p.onGround && p.vy < 0.1);
  if (err < 0.4 && ready && !(A.cool > 0)) {
    const h = FP.rayBlock(eye, FP.lookDir(G.yaw, G.pitch), 5);
    if (T.kind === 'place') {
      const c = T.cell;
      if (h && h.x === T.n.x && h.y === T.n.y && h.z === T.n.z && h.x + h.nx === c.x && h.y + h.ny === c.y && h.z + h.nz === c.z) {
        M.selectSlot(G.palette.indexOf(c.type)); M.buildPlace(); A.cool = 1; // un clic par tick (20 CPS)
        if (W.get(c.x, c.y, c.z) === c.type) { A.task = null; A.bad = null; }
      } else if (++A.miss > 3) failTask(A);
    } else if (T.kind === 'break') {
      const c = T.cell;
      if (h && h.x === c.x && h.y === c.y && h.z === c.z) { M.buildBreak(); A.cool = 1; A.helpers.delete(W.key(c.x, c.y, c.z)); if (!W.get(c.x, c.y, c.z)) { A.task = null; A.bad = null; } }
      else if (++A.miss > 3) failTask(A);
    }
  }
  if (A.task && ++A.tries > 120) failTask(A);
}
function failTask(A) { if (A.task) (A.bad || (A.bad = new Set())).add(A.task.key); A.task = null; A.stuck = 3; }
// observation : une face de bloc de la maquette est vue si elle est dans le champ de vision et que rien ne la cache
function look(G, A) {
  const p = G.p, eye = [p.x, p.y + (p.sneaking ? 1.27 : 1.62), p.z], v = FP.lookDir(G.yaw, G.pitch), cosMax = Math.cos(60 * DEG);
  for (const [k, t] of G.model) {
    if (A.known.has(k)) continue;
    const [x, y, z] = k.split(',').map(Number), wx = G.mx0 + x, wz = G.z0 + z;
    for (const [nx, ny, nz] of FP.FACES) {
      if (W.solid(wx + nx, y + ny, wz + nz)) continue;
      const pt = [wx + 0.5 + nx * 0.5, y + 0.5 + ny * 0.5, wz + 0.5 + nz * 0.5], d = [pt[0] - eye[0], pt[1] - eye[1], pt[2] - eye[2]], L = Math.hypot(...d);
      if (d[0] * nx + d[1] * ny + d[2] * nz >= 0) continue;
      if ((d[0] * v[0] + d[1] * v[1] + d[2] * v[2]) / L < cosMax) continue;
      const h = FP.rayBlock(eye, d.map(c => c / L), L + 0.2);
      if (h && h.x === wx && h.y === y && h.z === wz && h.nx === nx && h.ny === ny && h.nz === nz) { A.known.set(k, t); break; }
    }
  }
}
// tour de la maquette en la regardant
function survey(G, A) {
  const p = G.p, w = G.bw;
  if (!A.sv) {
    const x0 = G.mx0 - 0.6, x1 = G.mx0 + w + 0.6, z0 = G.z0 - 0.7, z1 = G.z0 + w + 0.7, pts = [];
    for (let x = x0; x < x1; x += 1) pts.push([x, z0]);
    for (let z = z0; z < z1; z += 1) pts.push([x1, z]);
    for (let x = x1; x > x0; x -= 1) pts.push([x, z1]);
    for (let z = z1; z > z0; z -= 1) pts.push([x0, z]);
    let i0 = 0, bd = 1e9; pts.forEach((q, i) => { const d = Math.hypot(q[0] - p.x, q[1] - p.z); if (d < bd) { bd = d; i0 = i; } });
    A.sv = { pts, i: i0, n: 0, still: 0, lastD: null };
  }
  const sv = A.sv, pt = sv.pts[sv.i], d = Math.hypot(pt[0] - p.x, pt[1] - p.z);
  const eye = [p.x, p.y + 1.62, p.z], c = [G.mx0 + w / 2, Math.min(G.bh, 4) / 2, G.z0 + w / 2], a = angles(eye, c);
  turn(G, a.yaw, a.pitch, 40);
  if (d < 0.45 || (sv.lastD != null && Math.abs(sv.lastD - d) < 0.003 && ++sv.still > 15)) {
    sv.i = (sv.i + 1) % sv.pts.length; sv.still = 0; sv.lastD = null;
    if (++sv.n >= sv.pts.length) { A.surveys++; A.sv = null; }
    return;
  }
  sv.lastD = d; moveDir(G, pt[0] - p.x, pt[1] - p.z); G.vk.sprint = true;
  if (p.onGround && p.collidedH) G.vk.jump = true; // une marche d'un bloc sur le chemin
}
// hauteur des pieds sur chaque colonne autour de la parcelle
function navHeights(G) {
  const H = new Map();
  for (let x = G.bx0 - 3; x < G.mx0; x++) for (let z = G.z0 - 4; z <= G.z0 + G.bw + 2; z++) {
    let top = 0; for (let y = 0; y < G.bh + 8; y++) if (W.solid(x, y, z)) top = y + 1;
    H.set(x + ',' + z, top);
  }
  return H;
}
function bfs(H, sx, sz, sh) {
  const dist = new Map(), prev = new Map(), k0 = sx + ',' + sz, q = [[sx, sz]];
  dist.set(k0, 0);
  const hOf = (x, z) => (x === sx && z === sz) ? sh : H.get(x + ',' + z);
  while (q.length) {
    const [x, z] = q.shift(), k = x + ',' + z, h = hOf(x, z);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, nk = nx + ',' + nz, nh = H.get(nk);
      if (nh == null || dist.has(nk)) continue;
      if (nh - h > 1 || h - nh > 3) continue; // monter d'un bloc max, descendre de 3 max
      dist.set(nk, dist.get(k) + 1); prev.set(nk, k); q.push([nx, nz]);
    }
  }
  return { dist, prev };
}
function pathTo(H, nav, k) {
  const out = [];
  while (k && nav.dist.get(k) > 0) { const [x, z] = k.split(',').map(Number); out.unshift([x, z, H.get(k)]); k = nav.prev.get(k); }
  return out;
}
function navFrom(G) {
  const p = G.p, H = navHeights(G), sx = Math.floor(p.x), sz = Math.floor(p.z), sh = Math.round(p.y), nav = bfs(H, sx, sz, sh);
  const spots = [...nav.dist.entries()].sort((a, b) => a[1] - b[1]).map(([k]) => { const [x, z] = k.split(',').map(Number); return { x, z, h: k === sx + ',' + sz ? sh : H.get(k), k, here: k === sx + ',' + sz }; });
  return { H, nav, spots, sx, sz };
}
// cherche un emplacement d'où viser une face précise (pour poser à côté, ou pour casser), avec la vue dégagée
function findSpot(G, A, targets, N, kind) {
  const p = G.p;
  for (const jump of [false, true]) for (const tg of targets) {
    for (const sp of N.spots) {
      if (Math.hypot(sp.x - tg.c.x, sp.z - tg.c.z) > 5.5) continue;
      if (kind === 'place' && sp.x === tg.c.x && sp.z === tg.c.z && tg.c.y >= sp.h - 1 && tg.c.y <= sp.h + 2) continue; // pas dans son propre corps
      if (kind === 'break' && sp.x === tg.c.x && sp.z === tg.c.z && tg.c.y >= sp.h && tg.c.y <= sp.h + 1) continue;
      const key = kind + tg.c.x + ',' + tg.c.y + ',' + tg.c.z + '|' + sp.k + '|' + jump;
      if (A.bad && A.bad.has(key)) continue;
      const eye = sp.here ? [p.x, p.y + 1.62 + (jump ? 1.15 : 0), p.z] : [sp.x + 0.5, sp.h + 1.62 + (jump ? 1.15 : 0), sp.z + 0.5];
      for (const f of tg.faces) {
        const dv = [f.pt[0] - eye[0], f.pt[1] - eye[1], f.pt[2] - eye[2]], L = Math.hypot(...dv);
        if (L > 4.9) continue;
        const h = FP.rayBlock(eye, dv.map(v => v / L), 5);
        if (h && h.x === f.n.x && h.y === f.n.y && h.z === f.n.z && h.nx === f.nrm[0] && h.ny === f.nrm[1] && h.nz === f.nrm[2])
          return { kind, cell: tg.c, n: f.n, point: f.pt, jump, path: sp.here ? [] : pathTo(N.H, N.nav, sp.k), key };
      }
    }
  }
  return null;
}
// faces sur lesquelles on peut poser pour remplir la case c
function placeFaces(c) {
  const out = [];
  for (const [dx, dy, dz] of [[0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]]) {
    const n = { x: c.x + dx, y: c.y + dy, z: c.z + dz };
    if (W.solid(n.x, n.y, n.z)) out.push({ n, nrm: [-dx, -dy, -dz], pt: [n.x + 0.5 - dx * 0.5, n.y + 0.5 - dy * 0.5, n.z + 0.5 - dz * 0.5] });
  }
  return out;
}
// faces visibles d'un bloc à casser
function ownFaces(c) {
  const out = [];
  for (const [dx, dy, dz] of FP.FACES) if (!W.solid(c.x + dx, c.y + dy, c.z + dz)) out.push({ n: c, nrm: [dx, dy, dz], pt: [c.x + 0.5 + dx * 0.5, c.y + 0.5 + dy * 0.5, c.z + 0.5 + dz * 0.5] });
  return out;
}
const knownMissing = (G, A) => { const out = []; for (const [k, t] of A.known) { const [x, y, z] = k.split(',').map(Number); const c = { x: G.bx0 + x, y, z: G.z0 + z, type: t }; if (W.get(c.x, c.y, c.z) !== t) out.push(c); } return out; };
// blocs en trop dans la parcelle (mauvaise couleur, ou pas dans la maquette) : on les casse tout de suite
function fixTask(G, A) {
  const wrong = [], missing = knownMissing(G, A).length;
  for (let x = G.bx0; x < G.bx0 + G.bw; x++) for (let z = G.z0; z < G.z0 + G.bw; z++) for (let y = 0; y < G.bh + 4; y++) {
    const t = W.get(x, y, z); if (!t) continue;
    const k = (x - G.bx0) + ',' + y + ',' + (z - G.z0), want = G.model.get(k);
    if (want === t) continue;
    if (!want && A.helpers.has(W.key(x, y, z)) && missing) continue; // marche d'aide gardée tant qu'il reste à construire
    if (want && !A.known.has(k) && A.helpers.has(W.key(x, y, z))) continue;
    wrong.push({ c: { x, y, z }, faces: [] });
  }
  if (!wrong.length) return null;
  wrong.sort((a, b) => b.c.y - a.c.y); // du haut vers le bas
  wrong.forEach(t => { t.faces = ownFaces(t.c); });
  return findSpot(G, A, wrong.filter(t => t.faces.length), navFrom(G), 'break');
}
function helperCleanup(G, A) { return null; } // les marches d'aide sont cassées par fixTask dès que tout est posé
function pickTask(G, A) {
  const p = G.p, w = G.bw, list = knownMissing(G, A).filter(c => !W.get(c.x, c.y, c.z));
  if (!list.length) return null;
  const depth = c => Math.min(c.x - G.bx0, G.bx0 + w - 1 - c.x, c.z - G.z0, G.z0 + w - 1 - c.z);
  list.sort((a, b) => a.y - b.y || depth(b) - depth(a) || Math.hypot(a.x + 0.5 - p.x, a.z + 0.5 - p.z) - Math.hypot(b.x + 0.5 - p.x, b.z + 0.5 - p.z));
  const N = navFrom(G);
  return findSpot(G, A, list.map(c => ({ c, faces: placeFaces(c) })).filter(t => t.faces.length), N, 'place');
}
// rien d'atteignable : on monte d'un bloc (échafaudage autour de la parcelle, ou marche dans une case vide de la parcelle)
function scaffoldTask(G, A) {
  const p = G.p, M = FP.M, miss = knownMissing(G, A);
  if (!miss.length) return null;
  miss.sort((a, b) => a.y - b.y);
  const c = miss[0], N = navFrom(G);
  const okCol = (x, z, h) => {
    if (M.inScaffold(x, h, z)) return true;
    if (!M.inBuildZone(x, h, z)) return false;
    for (let y = h; y <= h + 2; y++) if (G.model.has((x - G.bx0) + ',' + y + ',' + (z - G.z0))) return false; // ne jamais boucher une case de la maquette
    return true;
  };
  let best = null, bd = 1e9;
  for (const sp of N.spots) {
    if (!okCol(sp.x, sp.z, sp.h) || sp.h > c.y + 1) continue;
    if (A.bad && A.bad.has('pillar' + sp.k + '|' + sp.h)) continue;
    const dh = Math.hypot(sp.x - c.x, sp.z - c.z), d = dh - sp.h * 0.3 + (M.inBuildZone(sp.x, sp.h, sp.z) ? 0.6 : 0);
    if (dh >= 1 && dh < 2.5 && d < bd) { bd = d; best = sp; }
  }
  if (!best) for (const sp of N.spots) { if (!okCol(sp.x, sp.z, sp.h) || (A.bad && A.bad.has('pillar' + sp.k + '|' + sp.h))) continue; const d = Math.hypot(sp.x - c.x, sp.z - c.z); if (d >= 1 && d < bd) { bd = d; best = sp; } }
  if (!best) return null;
  return { kind: 'pillar', h: best.h, x: best.x, z: best.z, cell: { x: best.x, y: best.h, z: best.z }, path: best.here ? [] : pathTo(N.H, N.nav, best.k), key: 'pillar' + best.k + '|' + best.h };
}

// ================================================================ bridge
// Avant chaque cycle, l'ordinateur SIMULE plusieurs techniques avec la vraie physique et les vraies règles de pose
// (viseur sur la face du dernier bloc, portée 4,5 blocs, un clic par tick au plus = 20 CPS), puis exécute la plus
// rapide, au tick près :
//  • telly bridge : sprint + saut vers l'arrivée, demi-tour en l'air, il pose les blocs sous lui en retombant,
//    puis se retourne avant d'atterrir (le plus rapide sur les longues lignes droites) ;
//  • moonwalk : dos à l'arrivée, il recule sans s'accroupir en cliquant à chaque tick, l'inclinaison du viseur étant
//    recalculée à chaque tick pour tomber pile sur la face (précis : fin de ligne, coins).
// Il ne pose jamais « depuis rien », et la caméra tourne de façon fluide (accélération limitée, 60°/tick au plus).
const BR_MAXV = 60, BR_ACC = 24, BR_PITCH = 80;
function travelKeys(yaw, t) {
  const r = yaw * DEG, f = t[0] * -Math.sin(r) + t[1] * Math.cos(r), s = t[0] * Math.cos(r) + t[1] * Math.sin(r), L = Math.hypot(f, s) || 1;
  return { f: f / L > 0.35 ? 1 : f / L < -0.35 ? -1 : 0, s: s / L > 0.35 ? 1 : s / L < -0.35 ? -1 : 0 };
}
const lineTravel = (seg, e, k) => { const lat = (seg.s.x ? e.z : e.x) - seg.lineC, c = clamp(-lat * 3, -0.8, 0.8) * (k || 1); return seg.s.x ? [seg.s.x, c] : [c, seg.s.z]; };
const faceAl = (seg, c) => (c.x + 0.5) * seg.s.x + (c.z + 0.5) * seg.s.z + 0.5;
// pose simulée : exactement la règle du jeu (rayon depuis l'œil, face du dernier bloc, case libre, pas dans le joueur)
function brPlaceSim(e, cam, last, seg) {
  const eye = [e.x, e.y + (e.sneaking ? 1.27 : 1.62), e.z], h = FP.rayBlock(eye, FP.lookDir(cam.yaw, cam.pitch), 4.5);
  if (!h || h.x !== last.x || h.y !== seg.L || h.z !== last.z || h.nx !== seg.s.x || h.ny !== 0 || h.nz !== seg.s.z) return null;
  const n = { x: last.x + seg.s.x, z: last.z + seg.s.z };
  if (seg.idx(n) > seg.maxIdx || W.solid(n.x, seg.L, n.z)) return null;
  const b = FP.entBox(e, 0);
  if (n.x + 1 > b[0] && n.x < b[3] && seg.L + 1 > b[1] && seg.L < b[4] && n.z + 1 > b[2] && n.z < b[5]) return null;
  return n;
}
// viseur : inclinaison exacte pour que le rayon touche le milieu de la face du dernier bloc
function facePitch(e, seg, last) {
  const eyeY = e.y + (e.sneaking ? 1.27 : 1.62), d = (e.x * seg.s.x + e.z * seg.s.z) - faceAl(seg, last);
  return d > 0.015 ? Math.atan2(eyeY - (seg.L + 0.5), d) / DEG : null;
}
function stopOnLast(e, seg, last) { // fin de ligne (coin) : s'arrêter accroupi sur le dernier bloc
  const c = faceAl(seg, last) - 0.5, al = e.x * seg.s.x + e.z * seg.s.z;
  return { travel: al > c + 0.06 ? [-seg.s.x, -seg.s.z] : al < c - 0.06 ? [seg.s.x, seg.s.z] : null, sneak: true };
}
function mMoon(e, cam, sim, seg) {
  const s = seg.s, back = Math.atan2(s.x, -s.z) / DEG, fwd = back + 180, need = seg.idx(sim.last) < seg.maxIdx;
  if (need) {
    if (sim.k >= 24 && e.onGround) return { stop: true }; // on replanifie souvent : une autre technique peut devenir meilleure
    const pp = facePitch(e, seg, sim.last); return { yaw: back, pitch: pp == null ? 82 : Math.min(89.5, pp), travel: lineTravel(seg, e), click: pp != null };
  }
  if (seg.goalLeg) return { yaw: fwd, pitch: 20, travel: lineTravel(seg, e), sprint: Math.abs(wrap(cam.yaw - fwd)) < 30 };
  if (sim.k > 40) return { stop: true };
  return Object.assign({ yaw: cam.yaw, pitch: cam.pitch }, stopOnLast(e, seg, sim.last));
}
function mTelly(par) {
  const f = (e, cam, sim, seg) => {
    // demi-tour d'un côté puis retour de l'autre (aller-retour, pas de tours complets)
    const s = seg.s, fwd = cam.yaw + wrap(Math.atan2(-s.x, s.z) / DEG - cam.yaw), back = fwd + 179.5, st = sim.st, need = seg.idx(sim.last) < seg.maxIdx;
    const al = e.x * s.x + e.z * s.z, hv = e.vx * s.x + e.vz * s.z, fa = faceAl(seg, sim.last);
    if (!st.ph) { st.ph = e.onGround ? 'run' : 'air'; st.cycles = 0; st.wait = 0; }
    if (st.ph === 'air' && e.onGround) { st.ph = 'run'; st.cycles++; st.wait = 0; }
    if (st.ph === 'run' && !e.onGround) st.ph = 'air';
    if (st.cycles >= par.cycles && e.onGround && need) return { stop: true }; // tout est posé : il doit d'abord s'arrêter
    if (!need && !seg.goalLeg) {
      if (e.onGround) { if (sim.k > 60) return { stop: true }; return Object.assign({ yaw: cam.yaw, pitch: cam.pitch }, stopOnLast(e, seg, sim.last)); }
      return { yaw: fwd, pitch: 20, travel: [-s.x, -s.z] };
    }
    if (st.ph === 'run') {
      const aligned = Math.abs(wrap(cam.yaw - fwd)) < 12;
      let jump = e.onGround && aligned && e.sprinting && ++st.wait > par.jd;
      if (e.onGround && al + hv + 0.13 > fa + 0.27) jump = true; // jamais sortir du bloc sans sauter
      return { yaw: fwd, pitch: 20, travel: lineTravel(seg, e), sprint: true, jump };
    }
    // en l'air : où va-t-il atterrir ? (simulation de la chute)
    let y = e.y, vy = e.vy, t = 0, rem = 0, v = hv;
    while ((y > seg.L + 1 || vy > 0) && t < 40) { y += vy; vy = (vy - 0.08) * 0.98; rem += v; v *= 0.91; t++; }
    if (need && fa < al + rem + par.margin) {
      const pp = facePitch(e, seg, sim.last);
      return { yaw: back, pitch: pp == null ? 80 : Math.min(89.5, pp), travel: lineTravel(seg, e), click: pp != null && Math.abs(wrap(cam.yaw - back)) < 25 };
    }
    return { yaw: fwd, pitch: 20, travel: lineTravel(seg, e), sprint: true };
  };
  f.maxV = par.maxV;
  return f;
}
const BR_MACROS = [['moonwalk', mMoon]];
// telly : demi-tour en 4 à 5 ticks (60°/tick) ou en 3 ticks (90°/tick, un coup de poignet rapide mais réaliste)
for (const maxV of [60, 90]) for (const margin of [0.05, 0.4]) BR_MACROS.push(['telly', mTelly({ jd: 0, margin, cycles: 2, maxV })]);
function brSim(G, seg, macro, H) {
  const e = FP.Plan.ent(FP.Plan.snap(G.p)), s = seg.s;
  const cam = { yaw: G.yaw, pitch: G.pitch, yv: G.yv || 0, pv: G.pv || 0 };
  const sim = { last: { x: seg.end.x, z: seg.end.z }, st: {}, k: 0 }, placed = [], rec = [], al0 = e.x * s.x + e.z * s.z;
  let res = null;
  for (let k = 0; k < H; k++) {
    sim.k = k;
    const c = macro(e, cam, sim, seg);
    if (c.stop) break;
    const mv = macro.maxV || BR_MAXV, ac = mv * 0.45;
    cam.yv = FP.camStep(cam.yv, wrap(c.yaw - cam.yaw), mv, ac); cam.yaw += cam.yv;
    cam.pv = FP.camStep(cam.pv, clamp(c.pitch, -90, 90) - cam.pitch, mv, ac); cam.pitch = clamp(cam.pitch + cam.pv, -90, 90);
    let click = false;
    if (c.click) { const n = brPlaceSim(e, cam, sim.last, seg); if (n) { const key = W.key(n.x, seg.L, n.z); W.blocks.set(key, 'wool_white'); placed.push(key); sim.last = n; click = true; } }
    const kk = c.travel ? travelKeys(cam.yaw, c.travel) : { f: 0, s: 0 };
    e.yaw = cam.yaw; e.input.f = kk.f; e.input.s = kk.s; e.input.jump = !!c.jump; e.input.sneak = !!c.sneak;
    FP.updateSprint(e, !!c.sprint); FP.stepEnt(e, G.tick + k);
    rec.push({ yaw: cam.yaw, pitch: cam.pitch, yv: cam.yv, pv: cam.pv, f: kk.f, s: kk.s, jump: !!c.jump, sneak: !!c.sneak, sprint: !!c.sprint, click });
    if (e.y < seg.L + 0.5) break; // il tomberait
    if (seg.done(e, sim.last)) { res = { done: true, ticks: k + 1 }; break; }
  }
  if (!res && e.onGround && e.y > seg.L + 0.99 && rec.length) {
    // pas encore fini : temps total estimé = temps simulé + reste du trajet à la vitesse moyenne obtenue
    const al = e.x * s.x + e.z * s.z, rate = (al - al0) / rec.length;
    if (rate > 0.02) res = { done: false, ticks: rec.length, rate, est: rec.length + Math.max(0, seg.endAl - al) / rate };
  }
  if (res && res.done) res.est = res.ticks;
  for (const key of placed) W.blocks.delete(key);
  if (res) res.rec = rec;
  return res;
}
// une ligne droite (une branche du trajet en L) : il teste toutes les techniques et garde la plus rapide
function brPlanned(G, A, s, L, T, g, inGoal) {
  const M = FP.M;
  if (A.br && A.bi < A.br.length && A.brS === s) {
    const u = A.br[A.bi++];
    G.yaw = u.yaw; G.pitch = u.pitch; G.yv = u.yv; G.pv = u.pv;
    G.vk.fwd = u.f > 0; G.vk.back = u.f < 0; G.vk.left = u.s > 0; G.vk.right = u.s < 0; G.vk.jump = u.jump; G.vk.sneak = u.sneak; G.vk.sprint = u.sprint;
    if (u.click) { if (M.tryPlace()) { A.end = { x: A.end.x + s.x, z: A.end.z + s.z }; G.clickTimes.push(performance.now()); } else A.br = null; }
    return true;
  }
  A.br = null;
  const idx = c => c.x * s.x + c.z * s.z, tIdx = idx(T);
  let end = { x: A.end.x, z: A.end.z };
  while (idx(end) < tIdx && W.solid(end.x + s.x, L, end.z + s.z)) end = { x: end.x + s.x, z: end.z + s.z };
  let last = end;
  while (idx(last) < tIdx) { const n = { x: last.x + s.x, z: last.z + s.z }; if (W.solid(n.x, L, n.z) || (g.y < 0 && inGoal(n.x, n.z))) break; last = n; }
  const after = { x: last.x + s.x, z: last.z + s.z };
  const goalLeg = g.y - 1 === L && W.solid(after.x, L, after.z) && inGoal(after.x, after.z);
  A.end = end;
  if (idx(last) <= idx(end) && !goalLeg) return false; // rien à poser sur cette branche : la suite (coin, descente) est gérée à part
  const seg = { s, L, end, maxIdx: idx(last), idx, lineC: s.x ? end.z + 0.5 : end.x + 0.5, goalLeg };
  seg.endAl = faceAl(seg, last) + (goalLeg ? 1 : -0.5);
  const dIdx = idx(last);
  seg.done = goalLeg
    ? e => e.onGround && Math.floor(e.y - 0.01) === g.y - 1 && inGoal(Math.floor(e.x), Math.floor(e.z))
    : (e, lst) => idx(lst) >= dIdx && e.onGround && Math.abs(e.x * s.x + e.z * s.z - (faceAl(seg, lst) - 0.5)) < 0.12 && Math.hypot(e.vx, e.vz) < 0.03;
  let best = null; A.cands = [];
  for (const [name, mac] of BR_MACROS) {
    const r = brSim(G, seg, mac, 120);
    A.cands.push(r ? `${name}:${r.done ? 'fini ' : ''}${r.est.toFixed(0)}` : name + ':échec');
    if (!r) continue;
    const better = !best || r.est < best.est - 1e-6;
    if (better) { best = r; best.name = name; }
  }
  if (!best) return false;
  A.br = best.rec; A.bi = 0; A.brS = s; A.tech = best.name;
  return brPlanned(G, A, s, L, T, g, inGoal);
}
function bridge(G, A) {
  const M = FP.M, p = G.p, g = G.goal;
  if (G.crossT > 0 || G.endT) return;
  const Lg = g.y > 0 ? g.y - 1 : -1;
  if (!A.init) { A.init = true; A.L = -1; A.end = { x: 0, z: 0 }; A.phase = 'bridge'; }
  const L = A.L, eye = M.eyePos();
  const gx0 = g.x + g.a, gx1 = g.x + g.b, gz0 = g.z + g.a, gz1 = g.z + g.b;
  const inGoal = (x, z) => x >= gx0 && x <= gx1 && z >= gz0 && z <= gz1;
  const look = (yaw, pitch) => turn(G, yaw, pitch, BR_MAXV);
  const hitIs = (x, y, z, nx, ny, nz) => { const h = FP.rayBlock(eye, FP.lookDir(G.yaw, G.pitch), 4.5); return h && h.x === x && h.y === y && h.z === z && h.nx === nx && h.ny === ny && h.nz === nz; };
  if (A.phase === 'drop') { // arrivée plus basse : on se dirige vers son centre en tombant
    const tx = clamp(p.x, gx0 + 0.5, gx1 + 0.5) - p.x - p.vx * 9, tz = clamp(p.z, gz0 + 0.5, gz1 + 0.5) - p.z - p.vz * 9;
    if (Math.hypot(tx, tz) > 0.15) moveDir(G, tx, tz);
    return;
  }
  if (A.phase === 'pillar') { // un bloc sous ses pieds : se centrer, regarder en bas, sauter, poser au sommet du saut
    const cx = A.end.x + 0.5, cz = A.end.z + 0.5, dc = Math.hypot(cx - p.x, cz - p.z);
    const err = look(G.yaw, 90);
    if (p.onGround && dc > 0.12) { moveDir(G, cx - p.x, cz - p.z); G.vk.sneak = true; return; }
    if (p.onGround && err < 1) G.vk.jump = true;
    if (!p.onGround && p.y >= L + 2 && hitIs(A.end.x, L, A.end.z, 0, 1, 0) && M.tryPlace()) { A.L = L + 1; A.phase = 'land'; }
    return;
  }
  if (A.phase === 'land') { if (p.onGround) A.phase = 'bridge'; return; }
  // objectif horizontal (case d'arrivée la plus proche) et trajet en L
  const T = { x: clamp(A.end.x, gx0, gx1), z: clamp(A.end.z, gz0, gz1) };
  const dx = T.x - A.end.x, dz = T.z - A.end.z;
  // monter : en escalier (un bloc sous ses pieds après chaque bloc posé), ou tout droit tant qu'il reste plus de hauteur que de distance
  if (L < Lg && (A.stepUp || Math.abs(dx) + Math.abs(dz) <= Lg - L)) { A.stepUp = false; A.phase = 'pillar'; return; }
  if (!dx && !dz) { // au-dessus / sur l'arrivée
    const a = angles([p.x, 0, p.z], [(gx0 + gx1 + 1) / 2, 0, (gz0 + gz1 + 1) / 2]); turn(G, a.yaw, 20, BR_MAXV); moveDir(G, (gx0 + gx1 + 1) / 2 - p.x, (gz0 + gz1 + 1) / 2 - p.z); return;
  }
  if (!A.s || (A.s.x && !dx) || (A.s.z && !dz)) A.s = Math.abs(dx) >= Math.abs(dz) && dx ? { x: Math.sign(dx), z: 0 } : { x: 0, z: Math.sign(dz) };
  const s = A.s;
  // à la hauteur de l'arrivée : planificateur (il teste les techniques et garde la plus rapide)
  if (L >= Lg && A.phase === 'bridge' && brPlanned(G, A, s, L, T, g, inGoal)) return;
  A.br = null;
  const n = { x: A.end.x + s.x, z: A.end.z + s.z };
  const backYaw = Math.atan2(s.x, -s.z) / DEG; // dos à la direction du pont
  const along = p.x * s.x + p.z * s.z, faceAlong = (A.end.x + 0.5) * s.x + (A.end.z + 0.5) * s.z + 0.5, delta = along - faceAlong;
  const vAlong = p.vx * s.x + p.vz * s.z, lineC = s.x ? A.end.z + 0.5 : A.end.x + 0.5, lat = (s.x ? p.z : p.x) - lineC;
  const err = look(backYaw, BR_PITCH);
  if (err > 4) { G.vk.sneak = true; return; } // on finit de tourner (coin du L) sans bouger
  // case suivante déjà là (départ, arrivée) : on recule simplement dessus
  if (W.solid(n.x, L, n.z)) { G.vk.back = true; if (delta > 0.35) A.end = n; return; }
  if (g.y < 0 && inGoal(n.x, n.z)) { // au-dessus d'une arrivée plus basse : accroupi jusqu'au bord, puis on se laisse glisser
    G.vk.back = true; if (p.onGround) G.vk.sneak = delta < 0.25; else A.phase = 'drop';
    return;
  }
  // recul : accroupi seulement au moment où le prochain pas ferait passer le bord (le bord retient alors le joueur)
  G.vk.back = true;
  G.vk.sneak = delta + vAlong + 0.14 > 0.28;
  if (Math.abs(lat) > 0.08) { const r = G.yaw * DEG, lx = Math.cos(r), lz = Math.sin(r), side = (s.x ? lz : lx) * lat; G.vk.left = side < 0; G.vk.right = side > 0; }
  // pose : uniquement si le viseur est sur la face du bord du dernier bloc
  if (hitIs(A.end.x, L, A.end.z, s.x, 0, s.z) && M.tryPlace()) {
    A.end = n;
    if (L < Lg) A.stepUp = true; // escalier : on monte d'un bloc sur le bloc qu'on vient de poser
  }
}

// ================================================================ course en forêt
// Chemin le plus court sur la grille (A*, 8 directions sans couper les coins ; un obstacle d'un bloc se franchit en
// sautant), lissé en lignes droites tant que la voie est libre, puis sprint-jump en continu en visant loin devant.
// Sous les feuilles basses, chaque saut est coupé net : head hitter, encore plus rapide.
const foBlocked = (x, z) => W.solid(x, 1, z) || (W.solid(x, 0, z) && W.solid(x, 2, z));
const foLow = (x, z) => W.solid(x, 0, z) && !W.solid(x, 1, z) && !W.solid(x, 2, z);
function foPath(G, from, to) {
  const F = G.fo, X0 = -64, X1 = 64, Z0 = Math.floor(Math.min(F.start[1], from[1])) - 16, Z1 = Math.floor(F.fin[1]) + 16, Wd = X1 - X0 + 1, Hd = Z1 - Z0 + 1, N = Wd * Hd;
  const id = (x, z) => (z - Z0) * Wd + (x - X0), gx = i => i % Wd + X0, gz = i => Math.floor(i / Wd) + Z0;
  const gs = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const cost = new Float32Array(N);
  for (let i = 0; i < N; i++) { const x = gx(i), z = gz(i); cost[i] = foBlocked(x, z) ? -1 : foLow(x, z) ? 1.8 : 0; }
  for (let i = 0; i < N; i++) if (cost[i] === 0) { const x = gx(i), z = gz(i); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (x + a >= X0 && x + a <= X1 && z + b >= Z0 && z + b <= Z1 && cost[id(x + a, z + b)] < 0) { cost[i] = 0.25; break; } }
  const s = id(Math.floor(from[0]), Math.floor(from[1])), t = id(Math.floor(to[0]), Math.floor(to[1]));
  const hx = i => { const dx = Math.abs(gx(i) - gx(t)), dz = Math.abs(gz(i) - gz(t)); return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz); };
  const heap = [], push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const q = (k - 1) >> 1; if (heap[q][0] <= heap[k][0]) break; [heap[q], heap[k]] = [heap[k], heap[q]]; k = q; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const a = 2 * k + 1, b = a + 1; let m = k; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top[1]; };
  gs[s] = 0; push(s, hx(s));
  while (heap.length) {
    const i = pop(); if (closed[i]) continue; closed[i] = 1; if (i === t) break;
    const x = gx(i), z = gz(i);
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + a, nz = z + b; if (nx < X0 || nx > X1 || nz < Z0 || nz > Z1) continue;
      const j = id(nx, nz); if (cost[j] < 0 || closed[j]) continue;
      if (a && b && (cost[id(x + a, z)] !== 0 && cost[id(x + a, z)] !== 0.25 || cost[id(x, z + b)] !== 0 && cost[id(x, z + b)] !== 0.25)) continue; // pas de coin coupé
      const ng = gs[i] + (a && b ? 1.4142 : 1) + cost[j];
      if (ng < gs[j]) { gs[j] = ng; came[j] = i; push(j, ng + hx(j)); }
    }
  }
  if (came[t] < 0 && t !== s) return null;
  const pts = []; for (let i = t; i >= 0; i = came[i]) { pts.push([gx(i) + 0.5, gz(i) + 0.5]); if (i === s) break; }
  return pts.reverse();
}
// ligne droite praticable (avec la largeur du joueur), sans obstacle à sauter
function foLos(a, b) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 0.2);
  for (let k = 0; k <= n; k++) {
    const x = a[0] + (b[0] - a[0]) * k / n, z = a[1] + (b[1] - a[1]) * k / n;
    for (const [ox, oz] of [[-0.34, -0.34], [0.34, -0.34], [-0.34, 0.34], [0.34, 0.34]]) { const cx = Math.floor(x + ox), cz = Math.floor(z + oz); if (foBlocked(cx, cz) || foLow(cx, cz)) return false; }
  }
  return true;
}
function forest(G, A) {
  const p = G.p, F = G.fo;
  if (G.endT) return;
  if (A.leg !== F.leg) { A.leg = F.leg; A.path = null; }
  if (!A.path || A.replan) { A.path = foPath(G, [p.x, p.z], F.leg === 0 ? F.fin : F.start); A.wi = 1; A.replan = false; A.still = 0; if (!A.path) return; }
  const P = A.path;
  // point visé : le plus loin possible le long du chemin, tant que la ligne droite est libre
  while (A.wi < P.length - 1 && foLos([p.x, p.z], P[A.wi + 1])) A.wi++;
  if (A.wi < P.length - 1 && Math.hypot(P[A.wi][0] - p.x, P[A.wi][1] - p.z) < 0.6) A.wi++;
  const T = P[A.wi], dx = T[0] - p.x, dz = T[1] - p.z, dist = Math.hypot(dx, dz);
  const yaw = Math.atan2(-dx, dz) / DEG, err = Math.abs(wrap(yaw - G.yaw));
  turn(G, yaw, 8, 40);
  if (err < 35) { G.vk.fwd = true; G.vk.sprint = true; } else moveDir(G, dx, dz);
  // sprint-jump dès que la voie est libre assez loin devant (plus rapide que courir) ; saut aussi devant un obstacle bas
  const r = G.yaw * DEG, fx = -Math.sin(r), fz = Math.cos(r);
  const clear = foLos([p.x, p.z], [p.x + fx * Math.min(4, dist), p.z + fz * Math.min(4, dist)]);
  const lowAhead = [0.6, 1.0].some(k => foLow(Math.floor(p.x + fx * k), Math.floor(p.z + fz * k)));
  if (p.onGround && ((clear && err < 12 && p.sprinting && dist > 2.5) || lowAhead)) G.vk.jump = true;
  // bloqué (rare) : on saute et on recalcule le chemin depuis ici
  if (Math.hypot(p.x - p.px, p.z - p.pz) < 0.02) { if (++A.still > 8) { G.vk.jump = true; A.replan = true; } } else A.still = 0;
  if (Math.hypot(P[Math.min(A.wi, P.length - 1)][0] - p.x, P[Math.min(A.wi, P.length - 1)][1] - p.z) > 6) A.replan = true;
}

// ================================================================ pont dans le vent
// Il avance au centre du pont. Quand une rafale le pousse, il simule sa trajectoire (avec la vraie physique) pour
// chaque façon de contrer en l'air ; si aucune ne le ramène sur un bloc, il calcule où il va retomber et pose un
// bloc pile à cet endroit, contre la face d'un bloc voisin visible depuis son œil (il ne connaît pas les rafales à venir).
function ventSim(G, f, s, H) {
  const e = FP.Plan.ent(FP.Plan.snap(G.p));
  for (let k = 0; k < H; k++) {
    e.yaw = G.yaw; e.input.f = f; e.input.s = s; e.input.jump = false; e.input.sneak = false;
    FP.updateSprint(e, f > 0); FP.stepEnt(e, k);
    if (e.onGround) { // posé… mais encore faut-il ne pas glisser du bord juste après (il s'accroupit en atterrissant)
      for (let j = 0; j < 4; j++) { e.input.f = 0; e.input.s = 0; e.input.sneak = true; FP.updateSprint(e, false); FP.stepEnt(e, k + j + 1); if (!e.onGround) return { ok: false, k, e }; }
      return { ok: true, k, e };
    }
    if (e.y < -1.6) return { ok: false, k, e };
  }
  return { ok: false, k: H, e };
}
// case à poser en premier pour atteindre C : la plus proche de C qui touche déjà un bloc (chaîne de blocs depuis le pont)
function ventChain(C) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], seen = new Set([C.x + ',' + C.z]), Q = [[C.x, C.z]];
  const touches = (x, z) => dirs.some(([a, b]) => W.solid(x + a, -1, z + b)) || W.solid(x, -2, z);
  while (Q.length) {
    const [x, z] = Q.shift();
    if (touches(x, z)) return { x, z };
    for (const [a, b] of dirs) { const nx = x + a, nz = z + b, k = nx + ',' + nz; if (Math.abs(nx - C.x) > 10 || Math.abs(nz - C.z) > 10 || seen.has(k) || W.solid(nx, -1, nz)) continue; seen.add(k); Q.push([nx, nz]); }
  }
  return null;
}
function vent(G, A) {
  const p = G.p, M = FP.M;
  if (G.endT) return;
  const toC = 0.5 - p.x, sC = Math.abs(toC) < 0.06 ? 0 : (toC > 0 ? 1 : -1); // touche gauche = vers +x (vue vers +z)
  const danger = !p.onGround || Math.abs(p.vx) > 0.12 || Math.abs(toC) > 0.45;
  if (!danger) {
    A.place = null;
    turn(G, 0, 62, 45);
    G.vk.fwd = true; G.vk.sprint = Math.abs(toC) < 0.25; G.vk.left = sC > 0 && Math.abs(toC) > 0.08; G.vk.right = sC < 0 && Math.abs(toC) > 0.08;
    return;
  }
  // au sol mais décalé (sur un bloc posé à côté) : accroupi (impossible de tomber), il revient d'abord sur le pont
  if (p.onGround && !A.place) { turn(G, 0, 62, 45); G.vk.sneak = true; G.vk.left = sC > 0; G.vk.right = sC < 0; return; }
  // 1) peut-il retomber sur un bloc en contrant en l'air ?
  let best = null;
  for (const f of [1, 0, -1]) for (const s of [sC || 1, 0, -(sC || 1)]) {
    const r = ventSim(G, f, s, 40);
    if (r.ok && r.e.y > -0.5 && (!best || r.k < best.k)) best = { f, s, k: r.k };
  }
  if (best) { G.vk.fwd = best.f > 0; G.vk.back = best.f < 0; G.vk.left = best.s > 0; G.vk.right = best.s < 0; if (!A.place) { turn(G, 0, 62, 60); return; } }
  else { G.vk.left = sC > 0; G.vk.right = sC < 0; G.vk.fwd = false; }
  // 2) sinon : poser un bloc là où il va retomber
  const r = ventSim(G, 0, sC, 40);
  let C = null; { const e = FP.Plan.ent(FP.Plan.snap(p)); for (let k = 0; k < 40; k++) { e.yaw = G.yaw; e.input.f = 0; e.input.s = sC; e.input.jump = false; e.input.sneak = false; FP.updateSprint(e, false); FP.stepEnt(e, k); if (e.y <= 0.02) { C = { x: Math.floor(e.x), z: Math.floor(e.z) }; break; } } }
  if (!C && !A.place) return;
  if (C && W.solid(C.x, -1, C.z) && !A.place) return;
  if (C) A.place = ventChain(C) || C;
  const T = A.place, eye = M.eyePos();
  if (W.solid(T.x, -1, T.z)) { A.place = null; return; }
  // face visible d'un bloc voisin (côté du pont, bloc posé, ou dessous)
  let aim = null;
  for (const [nx, ny, nz] of [[Math.sign(0.5 - (T.x + 0.5)) || 1, 0, 0], [0, 0, -1], [0, 0, 1], [-(Math.sign(0.5 - (T.x + 0.5)) || 1), 0, 0], [0, -1, 0]]) {
    const bx = T.x + nx, by = -1 + ny, bz = T.z + nz;
    if (!W.solid(bx, by, bz)) continue;
    const pt = [bx + 0.5 - nx * 0.5, by + 0.5 - ny * 0.5, bz + 0.5 - nz * 0.5];
    const a = angles(eye, pt), hh = FP.rayBlock(eye, FP.lookDir(a.yaw, a.pitch), 4.5);
    if (hh && hh.x === bx && hh.y === by && hh.z === bz && hh.nx === -nx && hh.ny === -ny && hh.nz === -nz) { aim = a; break; }
  }
  if (!aim) return;
  turn(G, aim.yaw, aim.pitch, 90);
  const hh = FP.rayBlock(eye, FP.lookDir(G.yaw, G.pitch), 4.5);
  if (hh && hh.x + hh.nx === T.x && hh.y + hh.ny === -1 && hh.z + hh.nz === T.z && M.coursePlace()) { A.place = null; G.st.saves++; G.clickTimes.push(performance.now()); }
}

// ================================================================ course de bateau
// Pilote physique, comme un excellent joueur :
//  • vitesse permise en chaque point = celle qui laisse tourner assez (accélération latérale ≈ poussée 0,04), propagée
//    vers l'arrière avec le freinage réel sur la glace (le bateau ne perd que 2 % de vitesse par tick) ;
//  • le bateau est orienté dans la direction de la poussée nécessaire pour atteindre la vitesse voulue sur la ligne ;
//  • direction « prédictive » : il contre-braque quand l'inertie de rotation (×0,98 par tick sur la glace) suffit
//    à finir le virage, pour ne jamais partir en tête-à-queue.
// Toutes les 3 ticks, il simule plusieurs réglages de ce pilote (FP.stepBoat, physique exacte) sur 60 ticks et garde
// le plus rapide.
function boatPrep(T) {
  if (T.tan) return;
  const M = T.M, P = T.P, w = i => ((i % M) + M) % M, hd = i => { const a = P[w(i + 2)], b = P[w(i - 2)]; return Math.atan2(-(a[0] - b[0]), a[1] - b[1]) / DEG; };
  const tan = [], kap = [];
  for (let i = 0; i < M; i++) { const a = P[w(i + 2)], b = P[w(i - 2)], l = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; tan.push([(a[0] - b[0]) / l, (a[1] - b[1]) / l]); kap.push(Math.abs(wrap(hd(i + 4) - hd(i - 4))) * DEG / 4); }
  T.kap = kap.map((_, i) => { let m = 0; for (let k = -6; k <= 6; k++) m = Math.max(m, kap[w(i + k)]); return m; });
  T.vprof = {}; T.tan = tan;
  const slip = FP.SLIP[T.ice] || 0.98; T.vterm = 0.04 / (1 - slip); T.slip = slip;
}
function boatProfile(T, f) {
  if (T.vprof[f]) return T.vprof[f];
  const M = T.M, v = new Float32Array(M);
  for (let i = 0; i < M; i++) v[i] = Math.min(T.vterm * 0.999, Math.sqrt(0.035 * f / Math.max(1e-4, T.kap[i])));
  for (let pass = 0; pass < 3; pass++) for (let i = M - 1; i >= 0; i--) { const n = v[(i + 1) % M]; v[i] = Math.min(v[i], n + 0.5 * ((1 - T.slip) + 0.005 / Math.max(0.3, n))); }
  return (T.vprof[f] = v);
}
const BOAT_POLS = [];
for (const look of [6, 14, 26]) for (const f of [0.2, 0.3, 0.45, 0.6, 0.8, 1, 1.25, 1.6]) for (const kl of [0.03, 0.08, 0.2]) BOAT_POLS.push({ look, f, kl });
function boatInput(b, pol, T, idx) {
  const M = T.M, P = T.P, jl = (idx + pol.look) % M, tg = T.tan[jl], vt = boatProfile(T, pol.f)[(idx + 3) % M];
  const nx = -T.tan[idx][1], nz = T.tan[idx][0], lat = (b.x - P[idx][0]) * nx + (b.z - P[idx][1]) * nz;
  const vdx = tg[0] * vt - nx * lat * pol.kl, vdz = tg[1] * vt - nz * lat * pol.kl, ax = vdx - b.vx, az = vdz - b.vz, al = Math.hypot(ax, az);
  const yawDes = al > 0.004 ? Math.atan2(-ax, az) / DEG : Math.atan2(-tg[0], tg[1]) / DEG;
  const fx = -Math.sin(b.yaw * DEG), fz = Math.cos(b.yaw * DEG), along = fx * ax + fz * az, sp = Math.hypot(b.vx, b.vz);
  const up = along > 0.002, down = !up && sp > vt + 0.06 && fx * b.vx + fz * b.vz > 0;
  // direction prédictive : rotation qui reste à faire si on contre-braque dès maintenant
  const e = wrap(yawDes - b.yaw), m = FP.boatFriction(b) || 0.9;
  let left = false, right = false;
  if (Math.abs(e) > 0.4 || Math.abs(b.dr) > 0.3) {
    if (e * b.dr <= 0) { right = e > 0; left = e < 0; }
    else {
      let d = b.dr, rest = 0; const s = Math.sign(b.dr);
      for (let k = 0; k < 60; k++) { d = d * m - s; if (Math.sign(d) !== s) break; rest += d; }
      if (Math.abs(rest) < Math.abs(e) - 0.5) { right = e > 0; left = e < 0; } else { right = s < 0; left = s > 0; }
    }
  }
  return { up, down, left, right };
}
function boatEval(G, pol, H) {
  const T = G.track, b0 = G.boat, b = Object.assign({}, b0);
  let idx = b0.idx, prog = 0, hits = 0;
  for (let t = 0; t < H; t++) {
    FP.stepBoat(b, boatInput(b, pol, T, idx)); if (b.hitH) hits++;
    const ni = FP.boatIndex(T, b, idx), d = ((ni - idx) % T.M + T.M) % T.M; prog += d > T.M / 2 ? d - T.M : d; idx = ni;
  }
  const tg = T.tan[idx], vAlong = b.vx * tg[0] + b.vz * tg[1];
  return prog * 0.5 + vAlong * 20 - hits * 2;
}
function boat(G, A) {
  const b = G.boat, T = G.track;
  if (G.endT || G.finalTime != null) return;
  boatPrep(T);
  if (!(A.k > 0)) {
    let best = null, bs = -1e9;
    for (const pol of BOAT_POLS) { const s = boatEval(G, pol, 60); if (s > bs) { bs = s; best = pol; } }
    A.pol = best; A.k = 3;
  }
  A.k--;
  const inp = boatInput(b, A.pol, T, b.idx);
  G.vk.fwd = inp.up; G.vk.back = inp.down; G.vk.left = inp.left; G.vk.right = inp.right;
}

// ================================================================ clutch
// Il prévoit son point de chute (physique exacte, sans toucher aux touches), vise la face du sol juste dessous et agit
// dès que c'est à portée. Charge de vent : il simule le lancer maintenant ou dans 1, 2, 3 ticks et choisit celui qui
// donne le moins de dégâts. Masse : il frappe le zombie dès qu'il est à portée en tombant.
function fallSim(G, opts) {
  const e = FP.Plan.ent(FP.Plan.snap(G.p)); let dmg = null, land = null;
  e.onLand = (f, d) => { if (dmg == null) dmg = d; };
  const wc = [];
  for (let t = 0; t < 400; t++) {
    if (opts && opts.throwAt === t) wc.push({ x: e.x, y: e.y + 1.52, z: e.z, vy: -1.5 + (e.onGround ? 0 : e.vy) });
    e.input.f = 0; e.input.s = 0; e.input.jump = false; e.input.sneak = false; FP.stepEnt(e, t);
    for (const w of wc) { if (w.dead) continue; const len = -w.vy, hit = FP.rayBlock([w.x, w.y, w.z], [0, -1, 0], len); if (hit) { w.dead = true; FP.windBurst(w.x, w.y - hit.t, w.z, e); } else w.y += w.vy; }
    if (e.onGround) { land = { x: e.x, y: e.y, z: e.z }; break; }
  }
  return { dmg: dmg == null ? 0 : dmg, land };
}
// sortie du pilier : accroupi jusqu'au bord (impossible de tomber), puis un pas : on tombe tout près du pilier
function stepOffInput(e) { if (e.onGround && e.z < 1.27) return { f: 1, sneak: true }; if (e.onGround) return { f: 1, sneak: false }; return { f: 0, sneak: false }; }
// TNT : pour chaque attente possible avant de sauter, on simule la chute, la TNT (physique, mèche) et l'explosion
function tntPlan(G) {
  const t0 = G.tnts[0]; if (!t0) return 0;
  let best = 0, bd = Infinity;
  for (let w = 7; w <= 78; w++) { // au moins 7 ticks : le temps de se retourner face au vide
    const e = FP.Plan.ent(FP.Plan.snap(G.p)), t = Object.assign({}, t0); let tot = 0, landed = false;
    e.onLand = (f, d) => { if (!landed && e.y < G.cl.H - 0.5) { tot += d; landed = true; } };
    for (let k = 0; k < 400 && !landed; k++) {
      const u = k < w ? { f: 0, sneak: true } : stepOffInput(e);
      e.yaw = 0; e.input.f = u.f; e.input.s = 0; e.input.jump = false; e.input.sneak = u.sneak; FP.updateSprint(e, false); FP.stepEnt(e, k);
      if (!t.done && FP.tntStep(t)) { t.done = true; tot += FP.tntExplode(t.x, t.y + 0.06125, t.z, e); }
    }
    if (!landed) tot += 20;
    if (tot < bd) { bd = tot; best = w; }
  }
  return best;
}
function clutchAI(G, A) {
  const C = G.cl, p = G.p, M = FP.M; if (!C) return;
  if (A.round !== C.round) { A.round = C.round; A.tp = 'place'; A.wait = null; }
  const eye = M.eyePos(), aimHit = () => FP.rayBlock(eye, FP.lookDir(G.yaw, G.pitch), 4.5);
  const go = () => { const u = stepOffInput(p); G.vk.fwd = u.f > 0; G.vk.sneak = u.sneak; };
  if (C.state === 'done') { // après un seau d'eau : on reprend l'eau
    if (C.item === 'water' && C.bucket === 'bucket') { const hit = FP.rayCell(eye, FP.lookDir(G.yaw, G.pitch), 4.5, (x, y, z) => W.get(x, y, z) === 'water' ? true : W.solid(x, y, z) ? null : false); if (hit) M.clutchUse(); }
    return;
  }
  if (C.state === 'stand') {
    if (C.item === 'tnt') { // poser la TNT contre le pilier, l'allumer, attendre le bon moment, sauter
      const H = C.H;
      if (A.tp === 'place' && p.z < 1.25) { G.vk.fwd = true; G.vk.sneak = true; turn(G, 0, 60, 45); return; } // accroupi jusqu'au bord
      if (A.tp === 'place') {
        G.vk.sneak = true;
        if (C.slot !== 0) M.selectSlot(0);
        const a = angles(eye, [0.5, H - 0.5, 1.0]); turn(G, a.yaw, a.pitch, 45);
        const h = aimHit(); if (h && h.x === 0 && h.y === H - 1 && h.z === 0 && h.nz === 1) { M.clutchUse(); if (W.get(0, H - 1, 1) === 'tnt') A.tp = 'light'; }
        return;
      }
      if (A.tp === 'light') {
        G.vk.sneak = true;
        if (p.z > 1.12) { G.vk.fwd = true; turn(G, 180, 70, 45); return; } // reculer sur le pilier : la TNT allumée ne porte plus personne
        if (C.slot !== 1) M.selectSlot(1);
        const a = angles(eye, [0.5, H, 1.5]); turn(G, a.yaw, a.pitch, 45);
        const h = aimHit(); if (h && h.x === 0 && h.y === H - 1 && h.z === 1) { M.clutchUse(); if (G.tnts.length) { A.tp = 'wait'; A.wait = tntPlan(G); A.lit = G.tick; } }
        return;
      }
      if (A.tp === 'wait' && G.tick - A.lit < A.wait) { G.vk.sneak = true; turn(G, 0, 55, 45); return; } // k = ticks depuis l'allumage, comme dans la simulation
      turn(G, 0, 55, 45); go(); return;
    }
    turn(G, 0, C.item === 'wind' ? 90 : 60, 45);
    if (Math.abs(wrap(G.yaw)) < 2) go();
    return;
  }
  // ---- en chute
  if (C.item === 'tnt') return;
  if (C.item === 'mace') {
    let z = null, bd = 1e9; for (const e of G.ents) { const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; z = e; } } if (!z) return;
    const a = angles(eye, [z.x, z.y + 1.5, z.z]); turn(G, a.yaw, a.pitch, 60);
    if (p.fall > 1.5 && M.aimEnt(3) === z) M.onClick(0);
    return;
  }
  if (C.item === 'wind') {
    turn(G, G.yaw, 90, 60);
    if (C.cool > 0 || Math.abs(G.pitch - 90) > 1 || p.y > 16) return;
    let best = 0, bd = Infinity;
    for (let k = 0; k <= 3; k++) { const r = fallSim(G, { throwAt: k }); if (r.dmg < bd - 1e-9) { bd = r.dmg; best = k; } }
    if (best === 0 && bd < fallSim(G, {}).dmg) M.clutchUse();
    return;
  }
  const r = fallSim(G, {}); if (!r.land) return;
  const bx = Math.floor(r.land.x), bz = Math.floor(r.land.z), gy = Math.round(r.land.y) - 1;
  if (C.item === 'ladder') { // l'échelle contre le mur d'un bloc, dans la case où il va arriver
    if (W.get(bx, gy + 1, bz) === 'ladder') return;
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (W.get(bx + nx, gy + 1, bz + nz) !== 'bricks') continue;
      const pt = [bx + 0.5 + nx * 0.5, gy + 1.5, bz + 0.5 + nz * 0.5], a = angles(eye, pt); turn(G, a.yaw, a.pitch, 60);
      const h = aimHit(); if (h && h.x === bx + nx && h.y === gy + 1 && h.z === bz + nz && h.nx === -nx && h.nz === -nz) M.clutchUse();
      return;
    }
    return;
  }
  if (C.item === 'boat') { if (G.boat) return; const pt = [r.land.x, gy + 1, r.land.z], a = angles(eye, pt); turn(G, a.yaw, a.pitch, 60); const h = aimHit(); if (h && h.ny === 1 && h.y === gy) M.clutchUse(); return; }
  if (W.get(bx, gy + 1, bz)) return; // déjà posé
  const pt = [bx + 0.5, gy + 1, bz + 0.5], a = angles(eye, pt);
  turn(G, a.yaw, a.pitch, 60);
  const h = aimHit();
  if (h && h.x === bx && h.y === gy && h.z === bz && h.ny === 1) M.clutchUse();
}

// ================================================================ minage rapide
// À chaque bloc : parmi ceux dont une face est visible et à portée (4,5 blocs), celui qui demande de tourner le moins ;
// il prend le bon outil (changement instantané), vise et maintient le clic jusqu'à la casse, sans jamais sauter (×5).
function mineAI(G, A) {
  const Mi = G.mi, p = G.p, M = FP.M; if (!Mi) return;
  if (Mi.roundT > 0) { G.lmb = false; A.tgt = null; return; }
  const eye = M.eyePos();
  if (A.tgt && !Mi.cells.has(W.key(A.tgt.x, A.tgt.y, A.tgt.z))) A.tgt = null;
  if (A.tgt) { // toujours visible ? (un bloc de sable ou de gravier a pu tomber devant)
    const t = A.tgt, dv = [t.pt[0] - eye[0], t.pt[1] - eye[1], t.pt[2] - eye[2]], L = Math.hypot(dv[0], dv[1], dv[2]), hh = FP.rayBlock(eye, [dv[0] / L, dv[1] / L, dv[2] / L], L + 0.1);
    if (L > 4.4 || !hh || hh.x !== t.x || hh.y !== t.y || hh.z !== t.z) A.tgt = null;
  }
  if (!A.tgt) {
    let best = null, bc = 1e9;
    for (const k of Mi.cells) {
      const [x, y, z] = k.split(',').map(Number);
      for (const [nx, ny, nz] of FP.FACES) {
        if (W.solid(x + nx, y + ny, z + nz)) continue;
        const pt = [x + 0.5 + nx * 0.5, y + 0.5 + ny * 0.5, z + 0.5 + nz * 0.5], dv = [pt[0] - eye[0], pt[1] - eye[1], pt[2] - eye[2]], L = Math.hypot(dv[0], dv[1], dv[2]);
        if (L > 4.3 || dv[0] * nx + dv[1] * ny + dv[2] * nz >= 0) continue;
        const hh = FP.rayBlock(eye, [dv[0] / L, dv[1] / L, dv[2] / L], L + 0.1);
        if (!hh || hh.x !== x || hh.y !== y || hh.z !== z) continue;
        const a = angles(eye, pt), c = Math.abs(wrap(a.yaw - G.yaw)) + Math.abs(a.pitch - G.pitch);
        if (c < bc) { bc = c; best = { x, y, z, pt }; }
      }
    }
    A.tgt = best;
  }
  if (A.tgt) {
    const t = A.tgt, type = W.get(t.x, t.y, t.z), tool = FP.MINE[type] && FP.MINE[type][1];
    if (tool && G.tool !== tool) M.selectSlot(['pickaxe', 'axe', 'shovel', 'shears'].indexOf(tool));
    const a = angles(eye, t.pt); turn(G, a.yaw, a.pitch, 60);
    const hh = FP.rayBlock(eye, FP.lookDir(G.yaw, G.pitch), 4.5);
    G.lmb = !!(hh && hh.x === t.x && hh.y === t.y && hh.z === t.z);
    return;
  }
  // rien à portée : on s'approche du bloc restant le plus proche (sans sauter)
  G.lmb = false;
  let nb = null, nd = 1e9; for (const k of Mi.cells) { const [x, y, z] = k.split(',').map(Number), d = Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z) + y * 0.3; if (d < nd) { nd = d; nb = [x + 0.5, z + 0.5]; } }
  if (nb) { const a = angles([p.x, 0, p.z], [nb[0], 0, nb[1]]); turn(G, a.yaw, 20, 40); moveDir(G, nb[0] - p.x, nb[1] - p.z); }
}

// ================================================================ course libre
// Pour chaque île : saut direct si le planificateur en trouve un depuis l'état exact ; sinon il calcule (en simulant
// les sauts) le plus petit pont qui rend le saut possible, le construit avec la technique de bridge la plus rapide,
// et saute. Mur : pillar (saut + bloc sous les pieds) jusqu'au sommet, il passe dessus et redescend.
const NOGOAL = { y: -1e9 }, NOIN = () => false;
const cellBox = (x, y, z) => [x, y, z, x + 1, y + 1, z + 1];
function cBox(cells, y) {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const [x, z] of cells) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return [x0, y, z0, x1 + 1, y + 1, z1 + 1];
}
const islBox = isl => cBox(isl.wall ? isl.cells.filter(c => c[1] < isl.wall.z) : isl.cells, isl.y);
// ligne de blocs libres (rien au-dessus) sous le joueur, dans l'axe x ou z : c'est là qu'il peut prendre son élan
function supportCell(p) { // bloc qui porte le joueur (il peut déborder jusqu'à 0,3 bloc)
  const by = Math.floor(p.y - 0.01);
  for (const [ox, oz] of [[0, 0], [-0.2999, -0.2999], [0.2999, -0.2999], [-0.2999, 0.2999], [0.2999, 0.2999], [-0.2999, 0], [0.2999, 0], [0, -0.2999], [0, 0.2999]]) { const x = Math.floor(p.x + ox), z = Math.floor(p.z + oz); if (W.solid(x, by, z) && !W.solid(x, by + 1, z)) return [x, z]; }
  return null;
}
function supportBox(p, ax) {
  const by = Math.floor(p.y - 0.01), c = supportCell(p);
  if (!c) return null;
  const dx = ax === 'x' ? 1 : 0, dz = 1 - dx, ok = k => W.solid(c[0] + dx * k, by, c[1] + dz * k) && !W.solid(c[0] + dx * k, by + 1, c[1] + dz * k) && !W.solid(c[0] + dx * k, by + 2, c[1] + dz * k);
  let a = 0, b = 0; while (a < 6 && ok(-(a + 1))) a++; while (b < 6 && ok(b + 1)) b++;
  return [c[0] - dx * a, by, c[1] - dz * a, c[0] + dx * b + 1, by + 1, c[1] + dz * b + 1];
}
function planBridge(G, tb, minK) {
  const p = G.p, Plan = FP.Plan, L = Math.floor(p.y - 0.01), sb = supportBox(p, 'z');
  if (!sb) return null;
  const E = { x: sb[0], z: sb[5] - 1 }, tx = clamp(sb[0], tb[0], tb[3] - 1), tz = tb[2] - 1;
  const cells = [], legs = [];
  const s1 = { x: 0, z: 1 }, s2 = { x: Math.sign(tx - E.x), z: 0 };
  for (let z = E.z + 1; z <= tz; z++) cells.push({ x: E.x, z, leg: 0 });
  for (let x = E.x + s2.x; s2.x && x !== tx + s2.x; x += s2.x) cells.push({ x, z: Math.max(tz, E.z), leg: 1 });
  if (!cells.length) return null;
  // trajet bouché (île ou mur à hauteur du joueur) : ce pont-là est impossible
  if (cells.some(c => W.solid(c.x, L + 1, c.z) || W.solid(c.x, L + 2, c.z))) return null;
  const tc = [(tb[0] + tb[3]) / 2, (tb[2] + tb[5]) / 2];
  // pour chaque longueur de pont possible : temps estimé = pose des blocs (~3,6 ticks par bloc) + arrêt + saut simulé ;
  // il garde la plus rapide (un pont un peu plus long évite souvent de reculer pour prendre de l'élan)
  let k = cells.length, bestT = cells.length * 3.6 + 30;
  for (let i = Math.max(0, (minK || 1) - 1); i < cells.length; i++) {
    const c = cells[i], run = cells.filter((q, j) => j <= i && j >= i - 2 && q.leg === c.leg);
    const rb = cBox(run.map(q => [q.x, q.z]), L), yaw = Math.atan2(-(tc[0] - c.x - 0.5), tc[1] - c.z - 0.5) / DEG;
    const tmp = run.map(q => W.key(q.x, L, q.z)).filter(key => !W.blocks.has(key));
    tmp.forEach(key => W.blocks.set(key, 'wool_white'));
    const pl = Plan.jump(Plan.rest(cellBox(c.x, L, c.z), yaw), rb, tb);
    tmp.forEach(key => W.blocks.delete(key));
    if (pl) { const t = (i + 1) * 3.6 + 10 + pl.inputs.length; if (t < bestT) { bestT = t; k = i + 1; } }
  }
  const last = cells[k - 1];
  if (last.leg === 0 || cells.some(q => q.leg === 0)) legs.push({ s: s1, T: { x: E.x, z: last.leg === 0 ? last.z : Math.max(tz, E.z) } });
  if (last.leg === 1) legs.push({ s: s2, T: { x: last.x, z: last.z } });
  return { L, E, legs, k, last, cost: bestT };
}
function wallStep(G, A, isl) {
  const p = G.p, M = FP.M, wz = isl.wall.z, cx = isl.x, cz = wz - 1, top = isl.y + isl.wall.h; // top : niveau du dernier bloc à poser
  if (A.colTop == null) A.colTop = isl.y;
  if (A.colTop >= top && p.onGround && p.y >= top + 0.99) A.over = true;
  if (A.over) { // au sommet : on passe sur le mur et on se laisse tomber au milieu de la bande, de l'autre côté
    turn(G, 0, 25, 60); moveDir(G, cx + 0.5 - p.x, wz + 1.8 - p.z); G.vk.sprint = false;
    return;
  }
  const dc = Math.hypot(cx + 0.5 - p.x, cz + 0.5 - p.z), err = turn(G, G.yaw, 90, 60);
  if (p.onGround && dc > 0.1) { moveDir(G, cx + 0.5 - p.x, cz + 0.5 - p.z); G.vk.sneak = true; return; }
  if (p.onGround && err < 1 && A.colTop < top) G.vk.jump = true;
  if (!p.onGround && p.y >= A.colTop + 2) {
    const h = FP.rayBlock(M.eyePos(), FP.lookDir(G.yaw, G.pitch), 4.5);
    if (h && h.x === cx && h.y === A.colTop && h.z === cz && h.ny === 1 && M.coursePlace()) { A.colTop++; G.clickTimes.push(performance.now()); }
  }
}
function course(G, A) {
  const C = G.course, p = G.p, M = FP.M, Plan = FP.Plan;
  if (G.endT) return;
  if (A.plan) {
    if (A.i < A.plan.inputs.length && !(p.y < A.lowY)) {
      const u = A.plan.inputs[A.i++];
      G.yaw = u.ya; G.yv = p.yv = u.yv; G.vk.fwd = u.f > 0; G.vk.back = u.f < 0; G.vk.jump = u.jump; G.vk.sneak = u.sneak; G.vk.sprint = u.ws;
      G.pv = FP.camStep(G.pv || 0, 25 - G.pitch, 8, 2); G.pitch += G.pv;
      return;
    }
    A.plan = null;
  }
  // île sur laquelle il se trouve (ou la dernière touchée s'il est sur ses propres blocs)
  if (p.onGround) { const sc = supportCell(p); if (sc) { const i = C.index.get(W.key(sc[0], Math.floor(p.y - 0.01), sc[1])); if (i != null) A.on = i; } }
  const ci = A.on == null ? -1 : A.on, cur = ci >= 0 ? C.isl[ci] : null;
  if (A.from !== ci) { A.from = ci; A.tgt = null; A.bt = null; A.br = null; A.wallDone = false; A.colTop = null; A.over = false; A.jt = 0; A.stuckJ = 0; A.minK = 0; }
  if (A.br && A.bi < A.br.length && A.bt) { const leg = A.bt.legs[A.legI]; if (leg) { brPlanned(G, A, leg.s, A.bt.L, leg.T, NOGOAL, NOIN); return; } }
  if (cur && cur.wall && !A.wallDone && p.z < cur.wall.z + 3) {
    if (p.onGround && p.z > cur.wall.z + 1 && p.y < cur.y + 1.5) A.wallDone = true;
    else if (p.z < cur.wall.z + 0.7) { wallStep(G, A, cur); return; }
  }
  if (!p.onGround) return;
  // cible : parmi les 3 îles suivantes et l'arrivée, celle qui donne le temps total estimé le plus court
  // (pont ou saut simulé jusqu'à elle + reste du trajet) : il saute des îles quand c'est plus rapide
  if (A.tgt == null) {
    const fz = C.finishBox[2];
    let best = null;
    for (let j = ci + 1; j <= Math.min(ci + 3, C.isl.length); j++) {
      const fin = j === C.isl.length, il = fin ? null : C.isl[j], box = fin ? C.finishBox : islBox(il);
      let cost = Infinity, bt = null;
      const sb = supportBox(p, 'z'), jp = sb && Plan.jump(Plan.snap(p), sb, box);
      if (jp) cost = jp.inputs.length; else { bt = planBridge(G, box, 0); if (bt) cost = bt.cost; }
      if (!isFinite(cost)) continue;
      const rest = fin ? 0 : Math.max(0, fz - (il.z0 + il.len)) * 3.2 + (il.wall ? 30 + il.wall.h * 16 : 0);
      if (!best || cost + rest < best.t) best = { j, t: cost + rest, bt };
    }
    if (best) { A.tgt = best.j; A.bt = best.bt; A.legI = 0; if (A.bt) A.end = { x: A.bt.E.x, z: A.bt.E.z }; }
    else A.tgt = Math.min(ci + 1, C.isl.length);
  }
  const isl = A.tgt < C.isl.length ? C.isl[A.tgt] : null;
  const tb = isl ? islBox(isl) : C.finishBox, tc = [(tb[0] + tb[3]) / 2, (tb[2] + tb[5]) / 2];
  // saut direct depuis l'état exact (testé régulièrement, aussi pendant le pont : dès que c'est faisable, il saute)
  if (!(A.jt > 0)) {
    A.jt = 5;
    for (const ax of Math.abs(tc[0] - p.x) > Math.abs(tc[1] - p.z) ? ['x', 'z'] : ['z', 'x']) {
      const fb = supportBox(p, ax); if (!fb) continue;
      const plan = Plan.jump(Plan.snap(p), fb, tb);
      if (plan) { A.plan = plan; A.i = 0; A.lowY = Math.min(fb[4], tb[4]) - 4; A.br = null; A.tgt = null; return course(G, A); }
    }
  } else A.jt--;
  // sinon : le plus petit pont qui rend le saut possible
  if (!A.bt) { A.bt = planBridge(G, tb, A.minK); A.legI = 0; A.minK = 0; if (A.bt) A.end = { x: A.bt.E.x, z: A.bt.E.z }; }
  const bt = A.bt;
  if (bt) {
    while (A.legI < bt.legs.length) {
      const leg = bt.legs[A.legI];
      if (brPlanned(G, A, leg.s, bt.L, leg.T, NOGOAL, NOIN)) return;
      A.legI++; A.br = null; A.jt = 0;
    }
  }
  // pont fini mais pas de saut depuis cet état : se recentrer arrêté (sur le bloc qui le porte), puis rallonger le pont
  const sc = supportCell(p) || [Math.floor(p.x), Math.floor(p.z)], bx = sc[0], bz = sc[1], dc = Math.hypot(bx + 0.5 - p.x, bz + 0.5 - p.z);
  if (dc > 0.08 || Math.hypot(p.vx, p.vz) > 0.003) { const a = angles([p.x, 0, p.z], [bx + 0.5, 0, bz + 0.5]); turn(G, a.yaw, 25, 36); p.yv = G.yv; moveDir(G, bx + 0.5 - p.x, bz + 0.5 - p.z); G.vk.sneak = true; A.jt = 0; return; }
  if (bt && ++A.stuckJ > 3) { A.minK = bt.k + 1; A.bt = null; A.stuckJ = 0; }
}

AI._t = { tntPlan: (...a) => tntPlan(...a), brSim: (...a) => brSim(...a), macros: () => BR_MACROS, planBridge: (...a) => planBridge(...a), supportBox: (...a) => supportBox(...a), faceAl: (...a) => faceAl(...a) }; // outils de test

// ================================================================ parkour (planificateur exact)
function parkour(G, A) {
  const P = G.pk, p = G.p, Plan = FP.Plan;
  if (G.endT) return;
  if (A.plan && A.i < A.plan.inputs.length && !(A.lastY != null && p.y < A.lastY - 8)) {
    const u = A.plan.inputs[A.i++];
    G.yaw = u.ya; G.yv = p.yv = u.yv; G.vk.fwd = u.f > 0; G.vk.back = u.f < 0; G.vk.jump = u.jump; G.vk.sneak = u.sneak; G.vk.sprint = u.ws;
    G.pv = FP.camStep(G.pv || 0, A.look - G.pitch, 8, 2); G.pitch += G.pv;
    return;
  }
  A.plan = null;
  if (!p.onGround) return;
  // plateforme sous les pieds
  const by = Math.floor(p.y - 0.01);
  let idx = null, onFinish = false;
  for (const [ox, oz] of [[0, 0], [-0.29, -0.29], [0.29, -0.29], [-0.29, 0.29], [0.29, 0.29]]) {
    const bx = Math.floor(p.x + ox), bz = Math.floor(p.z + oz), i = P.index.get(W.key(bx, by, bz));
    if (i != null && (idx == null || i > idx)) idx = i;
    if (W.get(bx, by, bz) === 'emerald') onFinish = true;
  }
  if (onFinish) return;
  if (idx == null) idx = -1;
  const q = idx >= 0 ? P.path[idx] : null;
  const fromBox = q ? FP.M.platBox({ x: q.x, y: q.y, z: q.z, type: W.get(q.x, q.y, q.z) }) : [-1, -1, -1, 2, 0, 2];
  let toBox;
  if (idx + 1 < P.path.length) { const n = P.path[idx + 1]; toBox = FP.M.platBox({ x: n.x, y: n.y, z: n.z, type: W.get(n.x, n.y, n.z) }); }
  else if (P.finishBox) toBox = P.finishBox; else return;
  if (A.wait > 0) { A.wait--; G.vk.sneak = true; return; }
  // il rejoue d'abord le saut déjà vérifié par le générateur s'il est exactement dans l'état prévu, sinon il recalcule
  const s0 = Plan.snap(p), nx = idx + 1 < P.path.length ? P.path[idx + 1] : null;
  const same = (a, b) => !!a && !!b && ['x', 'y', 'z', 'vx', 'vy', 'vz', 'onGround', 'sprinting', 'sneaking', 'jumpTicks', 'yaw', 'yv', 'h', 'collidedH'].every(k => Math.abs((+a[k] || 0) - (+b[k] || 0)) < 1e-9);
  let plan = nx && nx.plan && same(s0, nx.st0) ? nx.plan : nx && nx.restPlan && same(s0, nx.restSt) ? nx.restPlan : null;
  if (!plan) plan = Plan.jump(s0, fromBox, toBox);
  const eye = [p.x, p.y + 1.62, p.z], tc = [(toBox[0] + toBox[3]) / 2, toBox[4], (toBox[2] + toBox[5]) / 2];
  A.look = clamp(angles(eye, tc).pitch, -10, 60); A.lastY = Math.min(fromBox[4], toBox[4]);
  if (plan) { A.plan = plan; A.i = 0; parkour(G, A); }
  else { // aucun plan depuis cet état : on se recentre, arrêté, puis on recommence
    const fc = [(fromBox[0] + fromBox[3]) / 2, (fromBox[2] + fromBox[5]) / 2];
    const a = angles([p.x, 0, p.z], [fc[0], 0, fc[1]]), dc = Math.hypot(fc[0] - p.x, fc[1] - p.z); turn(G, a.yaw, G.pitch, 36); p.yv = G.yv; moveDir(G, fc[0] - p.x, fc[1] - p.z); if (dc <= 0.08) G.vk.fwd = G.vk.back = G.vk.left = G.vk.right = false; G.vk.sneak = true;
    if (dc <= 0.08) A.wait = 4; // arrêté au centre : on laisse la vitesse retomber avant de replanifier
  }
}
})();
