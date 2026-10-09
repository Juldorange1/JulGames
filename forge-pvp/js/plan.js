'use strict';
/* Forge PvP — planificateur de sauts.
   À partir de l'état EXACT du joueur (position, vitesse, sprint…), il essaie plusieurs façons de sauter
   vers une plateforme (sprint ou marche, plus ou moins tôt, avec ou sans prise d'élan en reculant) en
   simulant la vraie physique tick par tick. Le générateur de parkour s'en sert pour ne placer que des sauts
   réussissables, et le mode « regarder » s'en sert pour jouer à ta place. */
(function () {
const FP = window.FP, DEG = FP.DEG;
const P = FP.Plan = {};
const FIELDS = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'onGround', 'fall', 'sprinting', 'sent', 'srv', 'sneaking', 'h', 'jumpTicks', 'collidedH', 'yaw', 'yv'];
const TURN = 36, TACC = 14; // caméra fluide : 36°/tick au plus, accélération et freinage progressifs
P.snap = e => { const s = {}; for (const k of FIELDS) s[k] = e[k]; return s; };
P.ent = s => { const e = FP.makeEnt(0, 0, 0); Object.assign(e, s); e.px = e.x; e.py = e.y; e.pz = e.z; e.input = { f: 0, s: 0, jump: false, sneak: false }; return e; };
P.rest = (box, yaw) => ({ x: (box[0] + box[3]) / 2, y: box[4], z: (box[2] + box[5]) / 2, vx: 0, vy: -0.0784, vz: 0, onGround: true, fall: 0,
  sprinting: false, sent: false, srv: false, sneaking: false, h: 1.8, jumpTicks: 0, collidedH: false, yaw: yaw || 0, yv: 0 });
P.onBox = (e, tb) => { const b = FP.entBox(e, 0); return e.onGround && Math.abs(e.y - tb[4]) < 1e-6 && b[0] < tb[3] && b[3] > tb[0] && b[2] < tb[5] && b[5] > tb[2]; };

function reachFn(fb, fc) {
  return (sx, sz) => { // jusqu'où le centre du joueur peut aller dans une direction en restant sur la plateforme
    let t = Infinity; const m = 0.29;
    if (Math.abs(sx) > 1e-6) t = Math.min(t, (sx > 0 ? fb[3] + m - fc[0] : fc[0] - (fb[0] - m)) / Math.abs(sx));
    if (Math.abs(sz) > 1e-6) t = Math.min(t, (sz > 0 ? fb[5] + m - fc[1] : fc[1] - (fb[2] - m)) / Math.abs(sz));
    return t;
  };
}
// une stratégie simulée ; renvoie { inputs, end, boxes } si elle atterrit sur la plateforme visée
function run(s0, fb, tb, sprint, early, backup) {
  const e = P.ent(s0);
  const fc = [(fb[0] + fb[3]) / 2, (fb[2] + fb[5]) / 2], tc = [(tb[0] + tb[3]) / 2, (tb[2] + tb[5]) / 2];
  let dx = tc[0] - fc[0], dz = tc[1] - fc[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
  const reach = reachFn(fb, fc), tmax = reach(dx, dz), tback = -reach(-dx, -dz);
  const baseYaw = Math.atan2(-dx, dz) / DEG, low = Math.min(fb[4], tb[4]) - 3;
  const inputs = [], boxes = [];
  let phase = backup === 'back' ? 'back' : backup === 'center' ? 'center' : 'run', wait = 0, jumped = false, yaw = e.yaw || 0, yv = e.yv || 0;
  for (let t = 0; t < 140; t++) {
    const along = (e.x - fc[0]) * dx + (e.z - fc[1]) * dz;
    let f = 0, sneak = false, jump = false, ws = false, ya = baseYaw;
    if (phase === 'center') { // se recentrer accroupi (impossible de tomber) puis s'arrêter
      const cdx = fc[0] - e.x, cdz = fc[1] - e.z, cd = Math.hypot(cdx, cdz);
      ya = cd > 0.02 ? Math.atan2(-cdx, cdz) / DEG : baseYaw; f = cd > 0.06 ? 1 : 0; sneak = true;
      if ((cd <= 0.06 && Math.hypot(e.vx, e.vz) < 0.004) || t > 60) phase = 'run';
    }
    if (phase === 'back') { f = -1; sneak = true; if (along <= tback + 0.1 || t > 45) phase = 'wait'; }
    if (phase === 'wait') { f = 0; sneak = true; if (Math.hypot(e.vx, e.vz) < 0.004 || ++wait > 12) phase = 'run'; }
    if (phase === 'run') {
      ya = Math.atan2(-(tc[0] - e.x), tc[1] - e.z) / DEG; f = 1; ws = sprint;
      const vAlong = e.vx * dx + e.vz * dz, next = along + Math.max(0.04, vAlong + (sprint ? 0.127 : 0.098));
      if (e.onGround && next >= tmax - early) { jump = true; jumped = true; phase = 'air'; }
      else if (!e.onGround && t > 0) return null; // tombé avant de sauter
    } else if (phase === 'air') {
      const ddx = tc[0] - e.x, ddz = tc[1] - e.z, dist = Math.hypot(ddx, ddz), v = Math.hypot(e.vx, e.vz);
      ya = Math.atan2(-ddx, ddz) / DEG; f = dist < v * 0.91 / 0.09 * 0.55 ? -1 : 1; ws = sprint;
    }
    yv = FP.camStep(yv, FP.wrap(ya - yaw), TURN, TACC); yaw += yv; ya = yaw;
    e.yaw = ya; e.yv = yv; e.input.f = f; e.input.s = 0; e.input.jump = jump; e.input.sneak = sneak;
    FP.updateSprint(e, ws);
    FP.stepEnt(e, t + 1);
    if (FP.touchDanger(e)) return null; // toucher un obstacle rouge = mort
    inputs.push({ ya, yv, f, jump, sneak, ws });
    boxes.push(FP.entBox(e, 0)); // toute la trajectoire, prise d'élan comprise
    if (P.onBox(e, tb)) return { inputs, end: P.snap(e), boxes };
    if (jumped && e.onGround && phase === 'air' && t > 0 && !jump) return null; // atterri ailleurs
    if (e.y < low) return null;
  }
  return null;
}
const STRATS = [];
for (const early of [0, 0.1, 0.2, 0.35, 0.5, 0.7]) for (const sprint of [true, false]) STRATS.push([sprint, early, false]);
for (const early of [0, 0.15, 0.3]) for (const sprint of [true, false]) STRATS.push([sprint, early, 'back']);
for (const early of [0, 0.15, 0.3, 0.5]) for (const sprint of [true, false]) STRATS.push([sprint, early, 'center']);
// après l'atterrissage : peut-on s'arrêter (accroupi, en se recentrant) sans toucher d'obstacle ni tomber ?
P.settle = function (s0, fb) {
  const e = P.ent(s0), fc = [(fb[0] + fb[3]) / 2, (fb[2] + fb[5]) / 2];
  for (let t = 0; t < 60; t++) {
    const cdx = fc[0] - e.x, cdz = fc[1] - e.z, cd = Math.hypot(cdx, cdz);
    if (cd <= 0.06 && Math.hypot(e.vx, e.vz) < 0.004) return true;
    const ya = cd > 0.02 ? Math.atan2(-cdx, cdz) / DEG : e.yaw; e.yv = FP.camStep(e.yv || 0, FP.wrap(ya - e.yaw), TURN, TACC); e.yaw += e.yv; e.input.f = cd > 0.06 ? 1 : 0; e.input.s = 0; e.input.jump = false; e.input.sneak = true;
    FP.updateSprint(e, false); FP.stepEnt(e, t + 1);
    if (FP.touchDanger(e) || e.y < fb[4] - 0.5) return false;
  }
  return true;
};
// première stratégie qui marche depuis l'état s0 (null si aucune)
P.jump = function (s0, fb, tb) {
  for (const [sprint, early, backup] of STRATS) { const r = run(s0, fb, tb, sprint, early, backup); if (r) return r; }
  return null;
};
})();
