'use strict';
/* Forge PvP — cœur du jeu 3D et logique des exercices (tout est configurable, durées libres ou infinies) :
   boxing & ciblage, réflexes, arc, esquive de flèches, cibles (épée / arc / arbalète), construction rapide, bridge, parkour. */
(function () {
const FP = window.FP, W = FP.W, S = FP.S, DEG = FP.DEG, R = FP.R;
const { clamp, rand, wrap } = FP;
let G = null;
const keys = new Set();
const kd = c => keys.has(c) ? 1 : 0;
// touche « logique » : clavier du joueur, ou commandes virtuelles de l'ordinateur en mode regarder
const inp = n => G.auto ? (G.vk[n] ? 1 : 0) : kd(S.keys[n]);
const inp2 = inp;
const BOT_LOOK = { shirt: '#b8322a', pants: '#2b2b38', hair: '#1d1d1d', skin: '#b98a5e', item: 'sword', name: 'Bot' };
const SHIRTS = ['#b8322a', '#2a6fb8', '#2e9b4f', '#d06a1c', '#7b3fb0', '#1a9a8c', '#c9a227', '#c2407a'];
const INF = n => n ? n : Infinity;

// ================================================================ création
function base(id, cfg) {
  return { id, cfg, D: FP.diffParams(cfg.diff), combat: id === 'duel18', tick: 0, acc: 0, last: performance.now(),
    time: 0, cd: 0, dur: cfg.duree > 0 ? cfg.duree : null, running: false, started: false, paused: false, ended: false,
    yaw: 0, pitch: 0, p: FP.makeEnt(0, 0, 0), ents: [], queue: [], clickTimes: [], st: {}, hurtFx: 0, hurtDir: 1,
    rmb: false, lmb: false, rmbTimer: 0, lmbTimer: 0, arrows: [], eyeH: 1.62, equip: 1, fovZoom: 0, bowPull: 0, drawTicks: 0,
    hitTexts: [], noHand: false, endT: 0, stepAcc: 0, eye: [0, 1.62, 0], auto: !!cfg.regarder, vk: {}, enemyHits: 0 };
}
function arena() { W.reset(true); R.decorateArena(); R.setWorld('arena'); }

function newGame(id, cfg) {
  G = base(id, cfg); FP.extra = [];
  const p = G.p;
  p.landFx = fall => { FP.sfx('land'); R.burst('dust', p.x, p.y, p.z, { n: Math.min(14, 4 + fall * 3 | 0), color: G.world === 'void' ? '#cfcfcf' : '#6f8f45' }); };
  G.world = (id === 'bridge' || id === 'parkour' || id === 'course' || id === 'vent') ? 'void' : 'arena';
  if (G.world === 'arena' && id !== 'foret' && id !== 'bateau' && id !== 'clutch' && id !== 'minage') arena();
  if (id === 'duel18') {
    const n = clamp(cfg.cibles | 0, 1, 20), att = cfg.comport === 'attaque';
    for (let i = 0; i < n; i++) {
      const a = att ? rand(-0.5, 0.5) + (i - (n - 1) / 2) * 0.5 : (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
      const r = att ? rand(5, 8) : cfg.comport === 'ignore' ? rand(3, Math.max(3.5, cfg.zone)) : rand(Math.min(cfg.distMin, cfg.distMax), Math.max(cfg.distMin, cfg.distMax));
      const e = FP.makeEnt(Math.sin(a) * r, Math.cos(a) * r, 180, Object.assign({}, BOT_LOOK, { shirt: SHIRTS[i % SHIRTS.length], name: n > 1 ? '' : 'Bot', item: att ? 'sword' : 'none' }));
      initMover(e, cfg); e.free = cfg.comport === 'ignore'; e.yaw = e.lookYaw = faceYaw(e, p);
      G.ents.push(e);
    }
    G.o = G.ents[0]; G.goal = INF(cfg.objectif); G.attack = att; G.modern = cfg.combat !== 'v18'; G.dmgMode = cfg.but === 'degats';
    for (const e of G.ents) e.cdGoal = rand(G.D.cdMin, 1);
    G.st = { swings: 0, onTarget: 0, hits: 0, sprintHits: 0, noReset: 0, iframe: 0, combo: 0, maxCombo: 0, jumpResets: 0, taken: 0, weak: 0, crits: 0, strSum: 0, dmg: 0, maxHit: 0, over: 0, kb: [] };
    R.setItem('sword');
  } else if (id === 'flick') {
    G.st = { n: 0, times: [], miss: 0, total: INF(cfg.cibles) }; R.setItem('sword');
  } else if (id === 'dodge') {
    dodgeSetup();
  } else if (id === 'targets') {
    targetsSetup();
  } else if (id === 'build') {
    buildSetup();
  } else if (id === 'bridge') {
    buildBridge(); R.setItem('block', 'wool_' + cfg.couleur);
  } else if (id === 'parkour') {
    pkInit(); R.setItem('none');
  } else if (id === 'course') {
    courseInit();
  } else if (id === 'foret') {
    forestInit();
  } else if (id === 'vent') {
    ventInit();
  } else if (id === 'bateau') {
    boatInit();
  } else if (id === 'clutch') {
    clutchInit();
  } else if (id === 'minage') {
    mineInit();
  }
  updateHotbar();
}

// ================================================================ déplacement des bots (mêmes règles que le joueur)
function initMover(e, cfg) {
  e.allure = cfg.allure || 'sprint'; e.speedLvl = cfg.vitesse || 0;
  e.moveDir = Math.random() < 0.5 ? -1 : 1; e.changeT = 0; e.wp = null; e.stopped = false;
  e.rMin = Math.min(cfg.distMin || 2.5, cfg.distMax || 3.5); e.rMax = Math.max(cfg.distMin || 2.5, cfg.distMax || 3.5);
  e.radius = rand(e.rMin, e.rMax); e.zone = cfg.zone || 12; e.free = cfg.mouv === 'libre';
}
function moverTick(e, p) {
  const D = G.D, inp = e.input;
  e.lookYaw = faceYaw(e, p); e.pitch = lookPitch(e, p);
  inp.s = 0; inp.sneak = e.allure === 'accroupi';
  if (e.allure === 'immobile') { inp.f = 0; inp.jump = false; e.yaw = e.lookYaw; e.wantSprint = false; return; }
  if (--e.changeT <= 0) {
    e.stopped = Math.random() < D.stop;
    e.moveDir = Math.random() < 0.7 ? -e.moveDir : (Math.random() < 0.5 ? -1 : 1);
    e.changeT = (e.stopped ? rand(3, 10) : rand(D.strafe[0], D.strafe[1])) | 0;
    e.radius = rand(e.rMin, e.rMax);
    if (e.free && Math.random() < 0.6) e.wp = null;
  }
  let heading;
  if (e.free) {
    const far = Math.hypot(e.x - p.x, e.z - p.z) > e.zone + 1.5;
    if (!e.wp || far || Math.hypot(e.wp[0] - e.x, e.wp[1] - e.z) < 1) {
      for (let k = 0; k < 12; k++) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * e.zone;
        const wx = clamp(p.x + Math.cos(a) * r, -FP.ARENA + 3, FP.ARENA - 3), wz = clamp(p.z + Math.sin(a) * r, -FP.ARENA + 3, FP.ARENA - 3);
        if (Math.hypot(wx - p.x, wz - p.z) > 1.5 && !W.solid(Math.floor(wx), 0, Math.floor(wz))) { e.wp = [wx, wz]; break; }
      }
    }
    heading = e.wp ? Math.atan2(-(e.wp[0] - e.x), e.wp[1] - e.z) / DEG : e.yaw;
  } else {
    const err = Math.hypot(p.x - e.x, p.z - e.z) - e.radius;
    heading = e.lookYaw + e.moveDir * (90 - clamp(err * 40, -75, 75)); // tangent au cercle, corrigé selon la distance
    if (e.sector != null) { // secteur imposé (tireurs « devant moi ») : demi-tour au bord
      const ang = o => wrap(Math.atan2(-(o[0] - p.x), o[1] - p.z) / DEG - e.sector);
      const now = ang([e.x, e.z]), next = ang([e.x - Math.sin(heading * DEG) * 0.5, e.z + Math.cos(heading * DEG) * 0.5]);
      if (Math.abs(now) > e.sectorSpan && Math.abs(next) > Math.abs(now)) { e.moveDir = -e.moveDir; heading = e.lookYaw + e.moveDir * (90 - clamp(err * 40, -75, 75)); }
    }
  }
  e.yaw = heading;
  inp.f = e.stopped ? 0 : 1;
  e.wantSprint = e.allure === 'sprint' || e.allure === 'sautant';
  inp.jump = e.allure === 'sautant' ? !e.stopped : Math.random() < D.jump;
}

// ================================================================ tick (20/s)
function tick() {
  G.tick++;
  const p = G.p, cfg = G.cfg;
  if (G.auto) { G.prevYaw = G.yaw; G.prevPitch = G.pitch; G.vk = {}; if (FP.AI) FP.AI.tick(G); }
  if (G.id === 'bateau') { if (!G.ended) boatTick(); if (G.endT > 0 && --G.endT === 0) endGame(G.endWin); return; }
  const frozen = G.id === 'flick' || G.endT > 0 || (G.roundT > 0 && G.id !== 'targets');
  p.input.f = frozen ? 0 : inp('fwd') - inp('back');
  p.input.s = frozen ? 0 : inp('left') - inp('right');
  p.input.jump = !frozen && !!inp('jump');
  p.input.sneak = !frozen && !!inp('sneak');
  if (usingItem()) { p.input.f *= 0.2; p.input.s *= 0.2; } // arc bandé / arbalète en charge : vitesse ×0,2 comme dans Minecraft
  p.yaw = G.yaw; p.pitch = G.pitch; p.walkPrev = p.walk;
  if (G.combat) for (const tgt of G.queue) swingAttack(p, tgt, !!tgt);
  G.queue.length = 0;
  if (G.ended) return;
  FP.updateSprint(p, (G.auto ? !!G.vk.sprint : (S.toggleSprint || !!kd(S.keys.sprint))) && !usingItem());
  for (const e of G.ents) {
    e.walkPrev = e.walk;
    if (G.combat) {
      if (G.attack) aiDuel(e, p); else moverTick(e, p);
      if (e.kbFrom && ++e.kbT > 1 && e.onGround) {
        const d = Math.hypot(e.x - e.kbFrom[0], e.z - e.kbFrom[1]); e.kbFrom = null; G.st.kb.push(d);
        if (!G.dmgMode) hitText(`Recul : ${d.toFixed(2)} blocs`, d >= 2.5 ? '#5dff7a' : '#ffa53d');
      }
    }
    else if (G.id === 'dodge' || (G.id === 'flick' && cfg.mobiles)) { moverTick(e, p); if (G.id === 'dodge') shooterTick(e, p); }
    else if (G.id === 'targets') targetMover(e, p);
    else { e.input.f = e.input.s = 0; e.input.jump = false; e.lookYaw = faceYaw(e, p); }
    FP.updateSprint(e, !!e.wantSprint && !e.dead);
    if (!e.static) FP.stepEnt(e, G.tick);
  }
  FP.stepEnt(p, G.tick);
  if (G.combat || G.id === 'flick') {
    for (let i = 0; i < G.ents.length; i++) { FP.separate(p, G.ents[i]); for (let j = i + 1; j < G.ents.length; j++) FP.separate(G.ents[i], G.ents[j]); }
  }
  FP.sendSprint(p); for (const e of G.ents) FP.sendSprint(e);
  for (const e of [p, ...G.ents]) { e.sinceSwing++; if (e.hurtCd > 0) e.hurtCd--; if (e.hurtTime > 0) e.hurtTime--; if (e.swingAnim > 0) e.swingAnim--; if (e.dead > 0) e.dead++; }
  if (p.onGround && !p.sneaking) { G.stepAcc += Math.hypot(p.x - p.px, p.z - p.pz); if (G.stepAcc > 1.7) { G.stepAcc = 0; FP.sfx('step'); } }
  if (G.id === 'dodge' || G.id === 'targets') bowTick();
  if (G.id === 'dodge') dodgeTick();
  if (G.id === 'targets') targetsTick();
  if (G.id === 'bridge') bridgeTick();
  if (G.id === 'parkour') parkourTick();
  if (G.id === 'course') courseTick();
  if (G.id === 'foret') forestTick();
  if (G.id === 'clutch') clutchTick();
  if (G.id === 'minage') mineTick();
  if (G.id === 'vent') ventTick();
  if (G.id === 'build') buildTick();
  if (G.combat && !G.endT) {
    if (G.st.hits >= G.goal) finishDuel(true);
    else if (G.st.taken >= G.goal) finishDuel(false);
  }
  if (G.endT > 0 && --G.endT === 0) endGame(G.endWin);
}

// ================================================================ boxing & ciblage
function finishDuel(win) {
  if (win) { for (const e of G.ents) e.dead = 1; setTimeout(() => G && G.ents.forEach(e => R.burstAt('smoke', e, 0.4, { n: 12 })), 700); } else G.hurtFx = 1;
  FP.sfx('death'); G.endWin = win; G.endT = 26;
}
function hitText(txt, col) { G.hitTexts.push({ txt, col, t: 1 }); if (G.hitTexts.length > 3) G.hitTexts.shift(); }
const holdingW = () => !!inp('fwd');

function swingAttack(att, tgt, hit) {
  const isP = att === G.p, st = G.st;
  // Minecraft actuel : la charge de l'épée remonte en 12,5 ticks (0,625 s) et repart à zéro à chaque coup, même dans le vide
  const str = G.modern ? clamp((att.sinceSwing + 0.5) / 12.5, 0, 1) : 1;
  att.sinceSwing = 0; att.swingAnim = 6;
  if (isP) { st.swings++; st.strSum += str; R.swing(); FP.sfx('swing'); }
  if (!hit || !tgt || tgt.dead) return;
  if (isP) st.onTarget++;
  const strong = str > 0.9, sprintHit = att.srv && strong;
  // critique : en retombant d'un saut (1.9+ : charge pleine et sans sprint ; 1.8 : sprint autorisé)
  const crit = (G.modern ? strong && !att.srv : true) && att.fall > 0 && !att.onGround;
  // dégâts de Minecraft : épée en diamant 7, ×(0,2 + 0,8×charge²) en 1.9+, ×1,5 en critique
  const dmg = 7 * (G.modern ? 0.2 + str * str * 0.8 : 1) * (crit ? 1.5 : 1);
  if (tgt.hurtCd > 0) { // invulnérabilité de 10 ticks : seul un coup plus fort passe, pour la différence, sans recul
    if (dmg > (tgt.lastDmg || 0)) {
      const extra = dmg - tgt.lastDmg; tgt.lastDmg = dmg;
      if (isP) { st.dmg += extra; st.over++; if (G.dmgMode) hitText(`+${extra.toFixed(1)} (coup plus fort pendant l’invulnérabilité)`, '#ffd23f'); }
      R.burst(crit ? 'crit' : 'hit', tgt.x, tgt.y + 1.1, tgt.z, { n: 5 });
    } else if (isP) st.iframe++;
    return;
  }
  tgt.hurtCd = 10; tgt.hurtTime = 10; tgt.lastDmg = dmg;
  if (isP) { st.dmg += dmg; st.maxHit = Math.max(st.maxHit, dmg); tgt.kbFrom = [tgt.x, tgt.z]; tgt.kbT = 0; }
  knock(tgt, att, 0.4, sprintHit ? 1 : 0);
  if (sprintHit) { att.srv = false; att.sprinting = false; att.vx *= 0.6; att.vz *= 0.6; }
  R.burst(crit ? 'crit' : 'hit', tgt.x, tgt.y + 1.1, tgt.z, { n: crit ? 14 : 6 });
  if (G.modern) R.burst('heart', tgt.x, tgt.y + 1.3, tgt.z, { n: Math.max(1, Math.round(7 * (0.2 + str * str * 0.8) * (crit ? 1.5 : 1) / 2)) });
  if (strong) att.hits++;
  if (isP) {
    st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo);
    if (strong) st.hits++; else st.weak++;
    if (crit) st.crits++;
    if (sprintHit) st.sprintHits++; else if (holdingW()) st.noReset++;
    const dt = `${dmg.toFixed(1)} dégâts (${(dmg / 2).toFixed(1)} ❤)`;
    if (G.dmgMode) hitText(crit ? `CRITIQUE ! ${dt}` : !strong ? `Coup faible (charge ${Math.round(str * 100)} %) : ${dt}` : dt, crit ? '#ffe14d' : !strong ? '#ff6b5b' : '#5dff7a');
    else if (!strong) hitText('Coup faible : charge ' + Math.round(str * 100) + ' %', '#ff6b5b');
    else if (crit) hitText('CRITIQUE !', '#ffe14d');
    else hitText(sprintHit ? 'RECUL MAX ✔' : 'pas de reset', sprintHit ? '#5dff7a' : '#ffa53d');
    FP.sfx(crit ? 'crit' : strong ? 'hit' : 'weak');
  } else {
    st.taken++; st.combo = 0; G.hurtFx = 1; G.hurtDir = Math.random() < 0.5 ? -1 : 1; FP.sfx('hurt');
    if (Math.random() < G.D.wtap) att.wtap = 1 + (Math.random() * 2 | 0);
  }
}
function knock(tgt, att, strength, bonus) {
  const dx = att.x - tgt.x, dz = att.z - tgt.z, d = Math.hypot(dx, dz) || 1e-4;
  let kx = tgt.vx / 2 - dx / d * strength, kz = tgt.vz / 2 - dz / d * strength;
  let ky = Math.min(0.4, tgt.vy / 2 + strength);
  if (bonus) { const r = att.yaw * DEG; kx += -Math.sin(r) * bonus * 0.5; kz += Math.cos(r) * bonus * 0.5; ky += 0.1; }
  const jr = tgt === G.p ? G.tick - tgt.jumpTick <= 1 : (G.attack && tgt.onGround && Math.random() < G.D.jreset);
  if (jr) { kx *= 0.62; kz *= 0.62; if (tgt === G.p) { G.st.jumpResets++; hitText('Jump reset ✔', '#7fd7ff'); } }
  tgt.vx = kx; tgt.vz = kz; tgt.vy = ky; tgt.onGround = false;
}
const faceYaw = (o, p) => Math.atan2(-(p.x - o.x), p.z - o.z) / DEG;
function lookPitch(o, p) { const dy = (p.y + 1.4) - (o.y + 1.62), dh = Math.hypot(p.x - o.x, p.z - o.z); return -Math.atan2(dy, dh) / DEG; }
function aiDuel(o, p) {
  if (o.dead) { o.input.f = o.input.s = 0; o.input.jump = false; o.wantSprint = false; return; }
  const D = G.D, dx = p.x - o.x, dz = p.z - o.z, dist = Math.hypot(dx, dz);
  if (--o.noiseT <= 0) { o.noiseTarget = rand(-D.noise, D.noise); o.noiseT = (10 + rand(0, 20)) | 0; }
  o.noise += (o.noiseTarget - o.noise) * 0.2;
  const ty = faceYaw(o, p);
  o.yaw += clamp(wrap(ty + o.noise - o.yaw), -D.turn, D.turn); o.lookYaw = o.yaw; o.pitch = lookPitch(o, p);
  if (--o.strafeT <= 0) { o.strafeDir = Math.random() < D.stop ? 0 : (Math.random() < 0.5 ? -1 : 1); o.strafeT = rand(D.strafe[0], D.strafe[1]) | 0; }
  const al = o.allure;
  o.input.s = dist < 5 ? o.strafeDir : 0;
  o.input.f = dist > 0.9 ? 1 : 0;
  o.input.sneak = al === 'accroupi';
  o.wantSprint = al === 'sprint' || al === 'sautant';
  if (o.wtap > 0) { o.wtap--; o.input.f = 0; }
  o.input.jump = al === 'sautant' && dist > 3.4 && o.onGround;
  if (G.modern && al !== 'immobile') { // recharge : il recule pendant que sa charge remonte, puis rentre
    const str = clamp((o.sinceSwing + 0.5) / 12.5, 0, 1);
    if (str < o.cdGoal) o.input.f = dist < 3.1 ? -1 : dist > 3.9 ? 1 : 0;
    if (o.critMode) o.wantSprint = false;
    if (o.jumpReq > 0) { o.input.jump = true; o.jumpReq--; }
  }
  if (al === 'immobile') { o.input.f = o.input.s = 0; o.input.jump = false; o.wantSprint = false; }
  if (G.endT) return;
  const reach = FP.distPointBox(o.x, o.y + 1.62, o.z, FP.entBox(p, 0)), facing = Math.abs(wrap(ty - o.yaw)) < 30;
  if (reach > 3.2) { o.react = D.react; return; }
  if (o.react > 0) { o.react--; return; }
  if (reach > 3 || !facing) return;
  if (!G.modern) { if (Math.random() < D.cps) swingAttack(o, p, Math.random() < D.acc); return; }
  // Minecraft actuel : il attend que sa charge soit assez remplie, et tente parfois un critique en retombant d'un saut
  const str = clamp((o.sinceSwing + 0.5) / 12.5, 0, 1);
  if (str < o.cdGoal) return;
  if (o.critMode && o.onGround) { o.jumpReq = 1; return; }
  if (o.critMode && !(o.fall > 0)) return;
  swingAttack(o, p, Math.random() < D.acc); o.cdGoal = rand(D.cdMin, 1); o.critMode = Math.random() < D.crit;
}

// ================================================================ réflexes
function spawnFlick() {
  if (G.flickBlock) { W.set(G.flickBlock[0], 0, G.flickBlock[1], null); G.flickBlock = null; }
  const cfg = G.cfg, sp = G.D.flick, side = Math.random() < 0.5 ? -1 : 1;
  const ang = G.yaw + side * rand(sp[0], sp[1]), dist = rand(Math.min(cfg.distMin, cfg.distMax), Math.max(cfg.distMin, cfg.distMax));
  let x = 0, z = 0, h = 0;
  for (let k = 0; k < 30; k++) {
    const a2 = k ? G.yaw + side * rand(sp[0], sp[1]) : ang, d2 = k ? rand(Math.min(cfg.distMin, cfg.distMax), Math.max(cfg.distMin, cfg.distMax)) : dist;
    x = clamp(G.p.x - Math.sin(a2 * DEG) * d2, -FP.ARENA + 2, FP.ARENA - 2); z = clamp(G.p.z + Math.cos(a2 * DEG) * d2, -FP.ARENA + 2, FP.ARENA - 2);
    if (!W.solid(Math.floor(x), 0, Math.floor(z)) && !W.solid(Math.floor(x), 1, Math.floor(z))) break;
  }
  if (!cfg.mobiles && Math.random() < 0.3) { const bx = Math.floor(x), bz = Math.floor(z); W.set(bx, 0, bz, 'bricks'); G.flickBlock = [bx, bz]; x = bx + 0.5; z = bz + 0.5; h = 1; }
  const t = FP.makeEnt(x, z, 0, Object.assign({}, BOT_LOOK, { shirt: SHIRTS[(Math.random() * SHIRTS.length) | 0], name: '', item: 'none' }));
  t.y = t.py = t.ry = h; t.static = !cfg.mobiles;
  t.yaw = t.lookYaw = faceYaw(t, G.p); t.pitch = lookPitch(t, G.p);
  if (cfg.mobiles) initMover(t, { allure: 'sprint', distMin: dist, distMax: dist });
  G.o = t; G.ents = [t]; G.tSpawn = performance.now();
  R.burst('smoke', x, h, z, { n: 6, color: '#ffffff' });
}

// ================================================================ arc (physique réelle de Minecraft)
// visée balistique : angle pour toucher un point avec une flèche à pleine charge (3 blocs/tick, frottement 0,99, gravité 0,05)
function arrowHeight(elev, D, speed) {
  const v0 = speed || 3; let x = 0, y = 0, vx = v0 * Math.cos(elev * DEG), vy = v0 * Math.sin(elev * DEG);
  for (let t = 1; t < 300; t++) {
    const nx = x + vx, ny = y + vy;
    if (nx >= D) { const f = (D - x) / (nx - x); return [y + (ny - y) * f, t - 1 + f]; }
    x = nx; y = ny; vx *= 0.99; vy = vy * 0.99 - 0.05;
    if (vx < 0.02) break;
  }
  return [null, 0];
}
function ballistic(from, to, vel, speed) {
  let T = to.slice(), yaw = 0, elev = 0, n = 0;
  for (let it = 0; it < 4; it++) {
    const dx = T[0] - from[0], dz = T[2] - from[2], D = Math.max(0.5, Math.hypot(dx, dz)), H = T[1] - from[1];
    yaw = Math.atan2(-dx, dz) / DEG;
    let lo = -40, hi = 40;
    for (let k = 0; k < 24; k++) { const mid = (lo + hi) / 2, h = arrowHeight(mid, D, speed)[0]; if (h === null || h < H) lo = mid; else hi = mid; }
    elev = (lo + hi) / 2; n = arrowHeight(elev, D, speed)[1] || n;
    T = [to[0] + vel[0] * n, to[1], to[2] + vel[2] * n];
  }
  return { yaw, pitch: -elev, ticks: n };
}
FP.ballistic = ballistic;
function enemyArrow(from, yaw, pitch, v, crit) {
  const d = FP.lookDir(yaw, pitch);
  G.arrows.push({ x: from[0], y: from[1], z: from[2], px: from[0], py: from[1], pz: from[2], vx: d[0] * v, vy: d[1] * v, vz: d[2] * v, crit, life: 0, stuck: 0, enemy: true, minD: 99 });
  G.st.incoming++;
}
const aimErr = () => { const err = FP.lerp(5, 0.25, G.D.d); return (Math.random() + Math.random() + Math.random() - 1.5) * err; };
// à chaque tir, le tireur parie sur ce que tu vas faire : continuer, t'arrêter, faire demi-tour, ou quelque part entre les deux
// (sinon un simple gauche-droite suffirait à toutes les esquiver)
function pickLead() {
  const r = Math.random();
  return r < 0.35 ? 1 : r < 0.55 ? 0 : r < 0.75 ? -0.8 : rand(-0.6, 1.4);
}
// point visé : position prévue + petit décalage latéral au hasard (plus grand si la difficulté est basse)
function aimTarget(e, p) {
  const k = e.lead == null ? (e.lead = pickLead()) : e.lead, side = e.side == null ? (e.side = rand(-1, 1) * FP.lerp(0.9, 0.35, G.D.d)) : e.side;
  const dx = p.x - e.x, dz = p.z - e.z, L = Math.hypot(dx, dz) || 1;
  return { to: [p.x - dz / L * side, p.y + 0.9, p.z + dx / L * side], vel: [p.vx * k, 0, p.vz * k] };
}
// tireurs : arc (charge de 1 s max) ou arbalète (1,25 s de chargement, puis tir instantané à 3,15 blocs/tick)
function shooterTick(e, p) {
  const D = G.D;
  if (e.respawnT > 0) { e.drawT = 0; e.bowPose = false; return; }
  if (e.weapon === 'xbow') return xbowShooter(e, p);
  if (e.drawT > 0) {
    e.drawT++; e.bowPose = true;
    e.input.f = 0; e.input.s = (e.moveDir || 1) * 0.2; e.input.jump = false; e.wantSprint = false; // arc bandé : ralenti, il strafe doucement
    // puissance du tir proportionnelle à la difficulté : elles bandent l'arc plus ou moins longtemps (vraie règle de l'arc)
    const power = clamp(D.d, 0.1, 1), needT = Math.ceil((Math.sqrt(1 + 3 * power) - 1) * 20) + (e.hold == null ? (e.hold = Math.random() * FP.lerp(12, 6, D.d) | 0) : e.hold);
    const from = [e.x, e.y + 1.52, e.z], aim = aimTarget(e, p);
    const sol = ballistic(from, aim.to, aim.vel, power * 3);
    e.yaw = e.lookYaw = sol.yaw; e.pitch = sol.pitch;
    if (e.drawT >= needT + 1) {
      enemyArrow(from, sol.yaw + aimErr(), sol.pitch + aimErr(), power * 3, power >= 1); FP.sfx('bowshoot');
      e.drawT = 0; e.bowPose = false; e.cool = Math.round(FP.lerp(90, 22, D.d) + Math.random() * 25); e.lead = e.side = e.hold = null;
    }
  } else if (--e.cool <= 0) { e.drawT = 1; }
}
function xbowShooter(e, p) {
  const D = G.D;
  if (!e.loaded) {
    if (e.cool > 0) { e.cool--; e.bowPose = false; return; }
    e.drawT++; e.bowPose = true;
    e.input.f = 0; e.input.s = (e.moveDir || 1) * 0.2; e.input.jump = false; e.wantSprint = false; // en charge : ralenti
    if (e.drawT >= 25) { e.loaded = true; e.drawT = 0; e.aimT = Math.round(FP.lerp(16, 3, D.d) + Math.random() * 8); }
    return;
  }
  // chargée : elle vise (en anticipant ta trajectoire) puis tire instantanément, toujours à pleine puissance
  e.bowPose = true;
  const from = [e.x, e.y + 1.52, e.z], aim = aimTarget(e, p), sol = ballistic(from, aim.to, aim.vel, 3.15);
  e.yaw = e.lookYaw = sol.yaw; e.pitch = sol.pitch;
  if (--e.aimT <= 0) {
    enemyArrow(from, sol.yaw + aimErr(), sol.pitch + aimErr(), 3.15, false); FP.sfx('xshoot');
    e.loaded = false; e.bowPose = false; e.cool = Math.round(FP.lerp(70, 6, D.d) + Math.random() * 20); e.lead = e.side = null;
  }
}
// objet en cours d'utilisation (ralentit et empêche le sprint) : arc bandé, arbalète en charge
function usingItem() { return G.rmb && G.id === 'targets' && (G.weapon === 'bow' || (G.weapon === 'xbow' && !G.xLoaded && !(G.xDelay > 0))); }
function shootArrow() {
  // charge : f = t/20, puissance = (f² + 2f)/3 plafonnée à 1 ; en dessous de 0,1 la flèche ne part pas
  let f = G.drawTicks / 20; f = (f * f + f * 2) / 3;
  G.drawTicks = 0; G.bowPull = 0; G.fovZoom = 0;
  if (f < 0.1) return;
  if (f > 1) f = 1;
  const d = FP.lookDir(G.yaw, G.pitch), g = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.0075 * 1.6;
  let vx = d[0] + g(), vy = d[1] + g(), vz = d[2] + g(); const l = Math.hypot(vx, vy, vz), sp = f * 3;
  vx = vx / l * sp; vy = vy / l * sp; vz = vz / l * sp;
  const ey = eyePos(), a = { x: ey[0], y: ey[1] - 0.1, z: ey[2], px: ey[0], py: ey[1] - 0.1, pz: ey[2], vx: vx + G.p.vx, vy, vz: vz + G.p.vz, crit: f >= 1, life: 0, stuck: 0, src: 'bow' };
  G.arrows.push(a);
  G.st.shots.bow++;
  FP.sfx('bowshoot');
}
// arbalète du joueur : tir instantané à 3,15 blocs/tick (imprécision 1, comme un joueur dans Minecraft)
function fireXbow() {
  const d = FP.lookDir(G.yaw, G.pitch), g = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.0075;
  let vx = d[0] + g(), vy = d[1] + g(), vz = d[2] + g(); const l = Math.hypot(vx, vy, vz), sp = 3.15;
  vx = vx / l * sp; vy = vy / l * sp; vz = vz / l * sp;
  const ey = eyePos();
  G.arrows.push({ x: ey[0], y: ey[1] - 0.1, z: ey[2], px: ey[0], py: ey[1] - 0.1, pz: ey[2], vx: vx + G.p.vx, vy, vz: vz + G.p.vz, crit: false, life: 0, stuck: 0, src: 'xbow' });
  G.xLoaded = false; G.xDelay = 4; G.xCharge = 0; G.st.shots.xbow++;
  FP.sfx('xshoot'); R.kick(); updateHotbar();
}
function bowTick() {
  if (G.rmb && G.id === 'targets' && G.weapon === 'bow') { if (G.drawTicks === 0) FP.sfx('bowdraw'); G.drawTicks++; G.bowPull = Math.min(1, G.drawTicks / 20); G.fovZoom = G.bowPull * 0.15; }
  for (const a of G.arrows) {
    a.px = a.x; a.py = a.y; a.pz = a.z; a.life++;
    if (a.stuck) { a.stuck++; continue; }
    const len = Math.hypot(a.vx, a.vy, a.vz), dir = [a.vx / len, a.vy / len, a.vz / len];
    let tHit = Infinity, who = null;
    if (a.enemy) {
      a.minD = Math.min(a.minD, FP.distPointBox(a.x, a.y, a.z, FP.entBox(G.p, 0)));
      const t = FP.rayBox([a.x, a.y, a.z], dir, FP.entBox(G.p, 0.3));
      if (t <= len) {
        const bh0 = FP.rayBlock([a.x, a.y, a.z], dir, len);
        if (!bh0 || bh0.t > t) {
          a.dead = true; a.hitP = true; G.st.taken++;
          if (G.p.hurtCd <= 0) { G.p.hurtCd = 10; const h = Math.hypot(a.vx, a.vz) || 1; G.p.vx += a.vx / h * 0.4; G.p.vz += a.vz / h * 0.4; G.p.vy = Math.max(G.p.vy, 0.3); G.p.onGround = false; }
          G.hurtFx = 1; G.hurtDir = Math.random() < 0.5 ? -1 : 1; FP.sfx('hurt'); hitText('Touché par une flèche !', '#ff6b5b');
          continue;
        }
      }
    } else for (const e of G.ents) { if (e.respawnT > 0 || e.dead) continue; const t = FP.rayBox([a.x, a.y, a.z], dir, FP.entBox(e, 0.3)); if (t <= len && t < tHit) { tHit = t; who = e; } }
    const bh = FP.rayBlock([a.x, a.y, a.z], dir, len);
    if (bh && bh.t < tHit) { a.x += dir[0] * bh.t; a.y += dir[1] * bh.t; a.z += dir[2] * bh.t; a.stuck = 1; FP.sfx('arrowground'); R.burst('dust', a.x, a.y, a.z, { n: 5 }); continue; }
    if (who) { a.dead = true; targetHit(who, a.src || 'bow'); continue; } // flèches du joueur : seulement le mode Cibles
    a.x += a.vx; a.y += a.vy; a.z += a.vz;
    a.vx *= 0.99; a.vy *= 0.99; a.vz *= 0.99; a.vy -= 0.05;
    if (a.crit) R.burst('trail', a.x, a.y, a.z, { n: 1 });
  }
  // une flèche ennemie est « évitée » dès qu'elle s'éloigne de toi après son point le plus proche
  for (const a of G.arrows) if (a.enemy && !a.counted && (a.stuck || a.y < -5 || a.life >= 399 || a.dead || (a.life > 4 && FP.distPointBox(a.x, a.y, a.z, FP.entBox(G.p, 0)) > a.minD + 4))) {
    a.counted = true;
    if (!a.hitP) { G.st.avoided = (G.st.avoided || 0) + 1; if (a.minD < 2.5) { G.st.dodged++; hitText('Esquivé ✔', '#7fd7ff'); } }
  }
  G.arrows = G.arrows.filter(a => !a.dead && a.stuck < 60 && a.y > -20 && a.life < 400);
}

// ================================================================ esquive de flèches
const freeSpot = (x, z) => !W.solid(Math.floor(x), 0, Math.floor(z)) && !W.solid(Math.floor(x), 1, Math.floor(z));
function dodgeSetup() {
  const cfg = G.cfg, D = G.D, p = G.p, n = clamp(cfg.tireurs | 0, 1, 16), front = cfg.place === 'devant';
  for (let i = 0; i < n; i++) {
    const xb = cfg.arme === 'arbalete' || (cfg.arme === 'mix' && i % 2 === 1);
    const e = FP.makeEnt(0, 0, 0, Object.assign({}, BOT_LOOK, { item: xb ? 'crossbow' : 'bow', shirt: SHIRTS[i % SHIRTS.length], name: '' }));
    e.weapon = xb ? 'xbow' : 'bow';
    initMover(e, cfg);
    if (front) { e.sector = 0; e.sectorSpan = 60; }
    for (let k = 0; k < 30; k++) {
      const ang = front ? (n > 1 ? -60 + 120 * i / (n - 1) : 0) + rand(-8, 8) : i / n * 360 + rand(-15, 15), dist = rand(e.rMin, e.rMax);
      const x = p.x - Math.sin(ang * DEG) * dist, z = p.z + Math.cos(ang * DEG) * dist;
      Object.assign(e, { x, z, px: x, pz: z, rx: x, rz: z, radius: dist });
      if (freeSpot(x, z)) break;
    }
    e.yaw = e.lookYaw = faceYaw(e, p);
    // premières flèches décalées : elles n'arrivent pas toutes en même temps
    e.cool = 20 + i * Math.round(FP.lerp(28, 9, D.d)) + (Math.random() * 15 | 0); e.drawT = 0; e.loaded = false;
    G.ents.push(e);
  }
  G.lives = INF(cfg.vies); G.lastHit = 0;
  G.st = { incoming: 0, taken: 0, avoided: 0, dodged: 0, best: 0, hitsAt: [] };
  R.setItem('none');
}
function dodgeTick() {
  const st = G.st, t = G.tick / 20;
  if (st.taken > st.hitsAt.length) { st.hitsAt.push(t); st.best = Math.max(st.best, t - G.lastHit); G.lastHit = t; }
  if (st.taken >= G.lives && !G.endT) { G.endT = 20; G.endWin = false; FP.sfx('death'); }
}

// ================================================================ cibles : épée, arc et arbalète en même temps
const WEAPONS = ['sword', 'bow', 'xbow'], WNAME = { sword: 'Épée', bow: 'Arc', xbow: 'Arbalète' };
function targetsSetup() {
  const cfg = G.cfg;
  G.weapon = 'sword'; G.sel = 0; G.xLoaded = !!cfg.precharge; G.xCharge = 0; G.xDelay = 0;
  G.xNeed = 25 - 5 * clamp(cfg.recharge | 0, 0, 3); // Charge rapide : −5 ticks par niveau
  G.goalRounds = INF(cfg.manches); G.pillars = []; G.roundT = 0;
  G.st = { done: 0, times: [], hits: { sword: 0, bow: 0, xbow: 0 }, shots: { bow: 0, xbow: 0 }, swings: 0 };
  R.setItem('sword'); newTargets();
}
const TARGET_LOOK = { shirt: '#d8312b', pants: '#f2f2f2', hair: '#f2f2f2', skin: '#e9d8bf', item: 'none', name: '' };
function newTargets() {
  for (const k of G.pillars) W.blocks.delete(k);
  G.pillars = []; W.version++;
  const cfg = G.cfg, D = G.D, p = G.p, n = clamp(cfg.cibles | 0, 1, 60);
  const dmin = Math.min(cfg.distMin, cfg.distMax), dmax = Math.max(cfg.distMin, cfg.distMax);
  const spread = FP.lerp(60, 180, D.d), hMax = clamp(cfg.hauteur | 0, 0, 20);
  const moving = cfg.mobiles === 'toutes' ? 1 : cfg.mobiles === 'aucune' ? 0 : FP.lerp(0, 0.6, D.d);
  const eye = [p.x, p.y + 1.62, p.z], used = [];
  G.ents = [];
  for (let i = 0; i < n; i++) {
    let spot = null;
    for (let k = 0; k < 60 && !spot; k++) {
      const ang = G.yaw + rand(-spread, spread), dist = rand(dmin, dmax);
      const bx = Math.floor(p.x - Math.sin(ang * DEG) * dist), bz = Math.floor(p.z + Math.cos(ang * DEG) * dist);
      const x = bx + 0.5, z = bz + 0.5;
      if (Math.hypot(x - p.x, z - p.z) < 1.2) continue;
      const mob = Math.random() < moving, hgt = !mob && hMax > 0 && Math.random() < FP.lerp(0.25, 0.7, D.d) ? 1 + (Math.random() * hMax | 0) : 0;
      let free = true;
      for (let y = 0; y < hgt + 3 && free; y++) if (W.solid(bx, y, bz)) free = false;
      if (!free || used.some(u => Math.hypot(u[0] - x, u[1] - z) < 1.6)) continue;
      // visible depuis l'endroit où tu es (k grand : on accepte une cible cachée, il suffira de se déplacer)
      const c = [x, hgt + 1.1, z], d = [c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]], L = Math.hypot(d[0], d[1], d[2]);
      const hit = FP.rayBlock(eye, [d[0] / L, d[1] / L, d[2] / L], L);
      if (hit && hit.t < L - 0.5 && k < 45) continue;
      spot = { bx, bz, x, z, hgt, mob };
    }
    if (!spot) continue;
    used.push([spot.x, spot.z]);
    for (let y = 0; y < spot.hgt; y++) { W.set(spot.bx, y, spot.bz, 'planks'); G.pillars.push(W.key(spot.bx, y, spot.bz)); }
    const e = FP.makeEnt(spot.x, spot.z, 0, Object.assign({}, TARGET_LOOK, spot.mob ? { shirt: '#e0821c' } : {}));
    e.y = e.py = e.ry = spot.hgt; e.static = !spot.mob; e.target = true;
    if (spot.mob) { e.home = [spot.x, spot.z]; e.allure = D.d > 0.6 ? 'sprint' : 'marche'; e.changeT = 0; }
    e.yaw = e.lookYaw = faceYaw(e, p); e.pitch = lookPitch(e, p);
    G.ents.push(e);
    R.burst('smoke', spot.x, spot.hgt, spot.z, { n: 5, color: '#ffffff' });
  }
  G.total = G.ents.length; G.left = G.total;
}
// cibles mobiles : elles se promènent autour de leur point de départ
function targetMover(e, p) {
  const inp = e.input;
  e.lookYaw = faceYaw(e, p); e.pitch = lookPitch(e, p);
  if (e.static || e.dead) { inp.f = inp.s = 0; inp.jump = false; e.wantSprint = false; return; }
  if (--e.changeT <= 0 || !e.wp || Math.hypot(e.wp[0] - e.x, e.wp[1] - e.z) < 0.6 || e.collidedH) {
    for (let k = 0; k < 10; k++) {
      const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * 3.5, wx = e.home[0] + Math.cos(a) * r, wz = e.home[1] + Math.sin(a) * r;
      if (freeSpot(wx, wz)) { e.wp = [wx, wz]; break; }
    }
    e.changeT = (15 + Math.random() * 40) | 0;
  }
  e.yaw = e.wp ? Math.atan2(-(e.wp[0] - e.x), e.wp[1] - e.z) / DEG : e.yaw;
  inp.f = 1; inp.s = 0; inp.jump = false; inp.sneak = false; e.wantSprint = e.allure === 'sprint';
}
function targetHit(e, w) {
  if (!e || e.dead || G.roundT > 0) return;
  e.dead = 1; e.hurtTime = 10; G.st.hits[w]++; G.left--;
  const dist = Math.hypot(e.x - G.p.x, e.z - G.p.z), near = dist < 4;
  R.burst('crit', e.x, e.y + 1.2, e.z, { n: near ? 6 : 14 }); if (!near) R.burst('smoke', e.x, e.y + 0.6, e.z, { n: 6, color: '#ffffff' });
  FP.sfx(w === 'sword' ? 'hit' : 'ding');
  hitText(`${WNAME[w]} · ${dist.toFixed(1)} blocs · reste ${G.left}`, '#5dff7a');
  if (G.left <= 0) {
    const t = G.time - G.roundStart; G.st.times.push(t); G.st.done++;
    FP.sfx('finish'); if (dist > 3) R.burst('confetti', e.x, e.y + 1, e.z, { n: 50 });
    hitText(`Manche terminée en ${t.toFixed(2)} s`, '#ffe14d');
    if (G.st.done >= G.goalRounds) { G.endT = 24; G.endWin = true; } else G.roundT = 40; // 2 s de pause : le temps de recharger l'arbalète
  }
}
function targetsTick() {
  if (G.roundT > 0 && !G.endT && --G.roundT === 0) { newTargets(); G.roundStart = G.time; FP.sfx('go'); }
  if (G.xDelay > 0) G.xDelay--;
  // arbalète : maintenir le clic droit pendant tout le chargement, la relâcher ensuite (elle reste chargée)
  if (G.weapon === 'xbow' && G.rmb && !G.xLoaded && !(G.xDelay > 0)) {
    if (G.xCharge === 0) FP.sfx('xload');
    G.xCharge++;
    if (G.xCharge === G.xNeed) FP.sfx('tick');
  }
  G.ents = G.ents.filter(e => !(e.dead > 24));
}

// ================================================================ construction rapide
const BUILD_REACH = 5; // portée du mode créatif de Minecraft (la casse est instantanée comme en créatif)
const BUILD_TYPES = ['wool_red', 'wool_blue', 'wool_yellow', 'wool_lime', 'wool_white', 'wool_orange', 'wool_purple', 'wool_cyan', 'planks', 'bricks', 'gold', 'obsidian', 'glowstone'];
function buildSetup() {
  const cfg = G.cfg, w = clamp(cfg.largeur | 0, 2, 8);
  G.D = FP.diffParams(cfg.remplissage == null ? 50 : cfg.remplissage);
  G.bw = w; G.bh = clamp(cfg.hauteur | 0, 1, 8);
  G.mx0 = 1; G.bx0 = -w; G.z0 = 1; // maquette à gauche, parcelle à droite (en regardant vers l'avant)
  for (let x = 0; x < w; x++) for (let z = 0; z < w; z++) { W.set(G.mx0 + x, -1, G.z0 + z, 'sand'); W.set(G.bx0 + x, -1, G.z0 + z, 'bricks'); }
  const p = G.p; p.z = p.pz = -2.5; p.x = p.px = 0.5;
  R.clearLabels(); R.addLabel('Maquette', G.mx0 + w / 2, G.bh + 1.6, G.z0 + w / 2); R.addLabel('Ta parcelle', G.bx0 + w / 2, G.bh + 1.6, G.z0 + w / 2);
  G.yaw = 0; G.pitch = 25; G.sel = 0;
  G.goalRounds = INF(cfg.manches); G.st = { done: 0, times: [], placed: 0, broken: 0, wrong: 0 };
  newModel();
}
function newModel() {
  const cfg = G.cfg, w = G.bw, h = G.bh, D = G.D;
  for (let x = 0; x < w; x++) for (let z = 0; z < w; z++) for (let y = 0; y < h + 4; y++) W.blocks.delete(W.key(G.mx0 + x, y, G.z0 + z));
  for (let x = G.bx0 - 2; x < G.mx0; x++) for (let z = G.z0 - 2; z < G.z0 + w + 2; z++) for (let y = 0; y < h + 6; y++) W.blocks.delete(W.key(x, y, z));
  W.version++;
  const types = BUILD_TYPES.slice().sort(() => Math.random() - 0.5).slice(0, clamp(cfg.couleurs | 0, 1, 9));
  G.palette = types; G.sel = Math.min(G.sel, types.length - 1);
  const target = clamp(Math.round(w * w * h * FP.lerp(0.16, 0.55, D.d)), 2, w * w * h);
  const cells = new Map(), K = (x, y, z) => x + ',' + y + ',' + z;
  const inside = (x, y, z) => x >= 0 && x < w && z >= 0 && z < w && y >= 0 && y < h;
  const supported = (x, y, z) => y === 0 || cells.has(K(x, y - 1, z));
  const seeds = 1 + Math.round(D.d * 2);
  for (let i = 0; i < seeds; i++) { const x = rand(0, w) | 0, z = rand(0, w) | 0; cells.set(K(x, 0, z), types[(Math.random() * types.length) | 0]); }
  let guard = 0;
  while (cells.size < target && guard++ < 5000) {
    const list = [...cells.keys()], [x, y, z] = list[(Math.random() * list.length) | 0].split(',').map(Number);
    const n = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]][(Math.random() * 5) | 0];
    const nx = x + n[0], ny = y + n[1], nz = z + n[2];
    if (!inside(nx, ny, nz) || cells.has(K(nx, ny, nz))) continue;
    if (Math.random() > D.d && !supported(nx, ny, nz)) continue; // facile : que des blocs posés sur quelque chose
    const keep = Math.random() < FP.lerp(0.8, 0.15, D.d);
    cells.set(K(nx, ny, nz), keep ? cells.get(K(x, y, z)) : types[(Math.random() * types.length) | 0]);
  }
  // aucun bloc caché : chaque bloc doit avoir une face visible depuis le tour de la maquette (yeux d'un joueur debout),
  // et rester relié au sol (sinon impossible à poser)
  makeVisible(cells);
  G.model = cells;
  for (const [k, t] of cells) { const [x, y, z] = k.split(',').map(Number); W.set(G.mx0 + x, y, G.z0 + z, t); }
  G.roundStart = G.time; G.roundT = 0; G.buildAcc = 0;
  R.burst('portal', G.mx0 + w / 2, 0, G.z0 + w / 2, { n: 20 });
  R.setItem('block', types[G.sel]); updateHotbar();
}
// points de vue tout autour de la maquette, à hauteur des yeux d'un joueur debout
function modelViewpoints() {
  const w = G.bw, x0 = G.mx0 - 0.6, x1 = G.mx0 + w + 0.6, z0 = G.z0 - 0.6, z1 = G.z0 + w + 0.6, pts = [];
  for (let x = x0; x < x1; x += 0.5) pts.push([x, 1.62, z0], [x, 1.62, z1]);
  for (let z = z0; z < z1; z += 0.5) pts.push([x0, 1.62, z], [x1, 1.62, z]);
  return pts;
}
const FACES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
FP.FACES = FACES;
function makeVisible(cells) {
  const K = (x, y, z) => x + ',' + y + ',' + z, view = modelViewpoints();
  for (let pass = 0; pass < 8; pass++) {
    for (const [k, t] of cells) { const [x, y, z] = k.split(',').map(Number); W.blocks.set(W.key(G.mx0 + x, y, G.z0 + z), t); }
    const hidden = [];
    for (const k of cells.keys()) {
      const [x, y, z] = k.split(',').map(Number), wx = G.mx0 + x, wz = G.z0 + z;
      let vis = false;
      for (const [nx, ny, nz] of FACES) {
        if (W.solid(wx + nx, y + ny, wz + nz)) continue;
        const pt = [wx + 0.5 + nx * 0.5, y + 0.5 + ny * 0.5, wz + 0.5 + nz * 0.5];
        for (const e of view) {
          const d = [pt[0] - e[0], pt[1] - e[1], pt[2] - e[2]], L = Math.hypot(d[0], d[1], d[2]);
          if (d[0] * nx + d[1] * ny + d[2] * nz >= 0) continue; // face tournée de l'autre côté
          const h = FP.rayBlock(e, [d[0] / L, d[1] / L, d[2] / L], L + 0.2);
          if (h && h.x === wx && h.y === y && h.z === wz && h.nx === nx && h.ny === ny && h.nz === nz) { vis = true; break; }
        }
        if (vis) break;
      }
      if (!vis) hidden.push(k);
    }
    for (const k of cells.keys()) { const [x, y, z] = k.split(',').map(Number); W.blocks.delete(W.key(G.mx0 + x, y, G.z0 + z)); }
    hidden.forEach(k => cells.delete(k));
    // reliés au sol (de proche en proche)
    const seen = new Set(), q = [...cells.keys()].filter(k => k.split(',')[1] === '0');
    q.forEach(k => seen.add(k));
    while (q.length) { const [x, y, z] = q.pop().split(',').map(Number); for (const [a, b, c] of FACES) { const n = K(x + a, y + b, z + c); if (cells.has(n) && !seen.has(n)) { seen.add(n); q.push(n); } } }
    let removed = hidden.length;
    for (const k of [...cells.keys()]) if (!seen.has(k)) { cells.delete(k); removed++; }
    if (!removed) break;
  }
  if (!cells.size) cells.set('0,0,0', G.palette[0]);
}
function buildCheck() {
  const w = G.bw; let correct = 0, wrong = 0;
  for (let x = 0; x < w; x++) for (let z = 0; z < w; z++) for (let y = 0; y < G.bh + 4; y++) {
    const want = G.model.get(x + ',' + y + ',' + z), have = W.get(G.bx0 + x, y, G.z0 + z);
    if (have) { if (have === want) correct++; else wrong++; }
  }
  G.buildAcc = correct / Math.max(1, G.model.size + wrong);
  if (correct === G.model.size && wrong === 0 && !G.roundT) {
    const t = G.time - G.roundStart; G.st.times.push(t); G.st.done++;
    FP.sfx('finish'); R.burst('confetti', G.bx0 + w / 2, 1, G.z0 + w / 2, { n: 70 });
    hitText(`Construction réussie en ${t.toFixed(2)} s`, '#5dff7a');
    if (G.st.done >= G.goalRounds) { G.endT = 24; G.endWin = true; } else G.roundT = 30;
  }
}
function inBuildZone(x, y, z) { return x >= G.bx0 && x < G.bx0 + G.bw && z >= G.z0 && z < G.z0 + G.bw && y >= 0 && y < G.bh + 4; }
// échafaudage autorisé autour de la parcelle (pour atteindre les étages hauts) : il ne compte pas dans la vérification
function inScaffold(x, y, z) { return x >= G.bx0 - 2 && x < G.mx0 && z >= G.z0 - 2 && z < G.z0 + G.bw + 2 && y >= 0 && y < G.bh + 6 && !inBuildZone(x, y, z); }
function buildPlace() {
  const hit = FP.rayBlock(eyePos(), FP.lookDir(G.yaw, G.pitch), BUILD_REACH); if (!hit) return;
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  if (!inBuildZone(x, y, z) && !inScaffold(x, y, z)) { if (G.tick - (G.warnT || 0) > 20) { hitText('Construis sur ta parcelle (à droite)', '#ffa53d'); G.warnT = G.tick; } return; }
  if (W.solid(x, y, z)) return;
  const b = FP.entBox(G.p, 0);
  if (x + 1 > b[0] && x < b[3] && y + 1 > b[1] && y < b[4] && z + 1 > b[2] && z < b[5]) return;
  const t = G.palette[G.sel]; W.set(x, y, z, t); G.st.placed++; FP.sfx('place'); R.swing();
  if (inBuildZone(x, y, z)) { const want = G.model.get((x - G.bx0) + ',' + y + ',' + (z - G.z0)); if (want !== t) G.st.wrong++; }
  buildCheck();
}
function buildBreak() {
  R.swing();
  const hit = FP.rayBlock(eyePos(), FP.lookDir(G.yaw, G.pitch), BUILD_REACH); if (!hit || hit.y < 0) return;
  if (!inBuildZone(hit.x, hit.y, hit.z) && !inScaffold(hit.x, hit.y, hit.z)) return;
  const t = W.get(hit.x, hit.y, hit.z); W.set(hit.x, hit.y, hit.z, null); G.st.broken++;
  FP.sfx('place'); R.burst('block', hit.x + 0.5, hit.y + 0.4, hit.z + 0.5, { n: 10, color: blockColor(t) });
  buildCheck();
}
function blockColor(t) { return { wool_red: '#a12722', wool_blue: '#35399d', wool_yellow: '#f8c627', wool_lime: '#70b919', wool_white: '#e9ecec', wool_orange: '#f07613', wool_purple: '#7a2aad', wool_cyan: '#158991', planks: '#a2824e', bricks: '#7a7a7a', gold: '#f7d03c', obsidian: '#1e1430', glowstone: '#e0b25a' }[t] || '#cccccc'; }
function buildTick() {
  if (G.roundT > 0) { if (--G.roundT === 0) newModel(); return; }
  if (G.rmb && ++G.rmbTimer >= 4) { G.rmbTimer = 0; buildPlace(); }   // clic droit maintenu : 1 bloc / 4 ticks
  if (G.lmb && ++G.lmbTimer >= 5) { G.lmbTimer = 0; buildBreak(); }   // clic gauche maintenu (créatif) : 1 bloc / 5 ticks
}
function selectSlot(i) {
  if (G.id === 'minage') { mineSelect(i); return; }
  if (G.id === 'clutch') { clutchSelect(i); return; }
  if (G.id === 'targets') {
    const s = ((i % 3) + 3) % 3;
    if (s === G.sel) return;
    // changer d'objet annule la charge en cours (une arbalète déjà chargée le reste) et remet la recharge de l'épée à zéro
    G.sel = s; G.weapon = WEAPONS[s]; G.drawTicks = 0; G.bowPull = 0; G.fovZoom = 0; G.xCharge = 0; G.p.sinceSwing = 0;
    R.setItem(G.weapon === 'xbow' ? 'crossbow' : G.weapon); updateHotbar(); FP.sfx('equip');
    return;
  }
  if (G.id !== 'build' || !G.palette) return;
  G.sel = (i + G.palette.length) % G.palette.length; R.setItem('block', G.palette[G.sel]); updateHotbar(); FP.sfx('click');
}

// ================================================================ bridge (arrivée configurable)
function buildBridge() {
  W.reset(false); R.setWorld('void');
  const cfg = G.cfg, s = clamp(cfg.taille | 0, 1, 9), a = -Math.floor((s - 1) / 2), b = a + s - 1;
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) W.set(x, -1, z, 'bricks');
  // devant = +z ; à droite (en regardant l'arrivée) = -x
  const gx = -(cfg.gx | 0), gz = cfg.gz | 0, gy = cfg.gy | 0;
  for (let x = a; x <= b; x++) for (let z = a; z <= b; z++) W.set(gx + x, gy - 1, gz + z, 'gold');
  G.goal = { x: gx, y: gy, z: gz, a, b }; G.bridgeLen = Math.hypot(gx, gz, gy);
  G.startYaw = Math.atan2(-gx, gz) / DEG + 180; // dos tourné vers l'arrivée
  G.fixed = new Set(W.blocks.keys());
  G.minY = Math.min(0, gy) - 15;
  G.st = { blocks: 0, falls: 0, times: [], tries: 0 };
  G.goalCross = INF(cfg.essais);
  bridgeRespawn(true, true);
}
function clearBridge() { for (const k of [...W.blocks.keys()]) if (!G.fixed.has(k)) W.blocks.delete(k); W.version++; }
function bridgeRespawn(first, clear) {
  if (clear) clearBridge();
  const p = G.p; Object.assign(p, { x: 0.5, y: 0, z: 0.5, px: 0.5, py: 0, pz: 0.5, vx: 0, vy: 0, vz: 0, fall: 0 });
  G.yaw = G.startYaw; G.pitch = 78; G.runStart = null; G.ai = null;
  if (!first) { G.st.falls++; FP.sfx('fall'); G.hurtFx = 0.6; }
}
function tryPlace() {
  if (G.id === 'course' || G.id === 'vent' || G.id === 'foret') return coursePlace();
  const hit = FP.rayBlock(eyePos(), FP.lookDir(G.yaw, G.pitch), 4.5);
  if (!hit) return false;
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  if (W.solid(x, y, z)) return false;
  const b = FP.entBox(G.p, 0);
  if (x + 1 > b[0] && x < b[3] && y + 1 > b[1] && y < b[4] && z + 1 > b[2] && z < b[5]) return false;
  W.set(x, y, z, 'wool_' + G.cfg.couleur); FP.sfx('place'); R.swing();
  R.burst('block', x + 0.5, y + 0.9, z + 0.5, { n: 5, color: blockColor('wool_' + G.cfg.couleur) });
  G.st.blocks++;
  if (G.runStart == null) { G.runStart = G.time; G.st.tries++; }
  return true;
}
function bridgeTick() {
  const p = G.p, g = G.goal;
  if (G.crossT > 0) { if (--G.crossT === 0) bridgeRespawn(true, true); return; }
  if (G.rmb && ++G.rmbTimer >= 4) { G.rmbTimer = 0; tryPlace(); }
  if (p.y < G.minY) { bridgeRespawn(false, !G.cfg.garder); return; }
  if (G.runStart == null && Math.hypot(p.x - 0.5, p.z - 0.5) > 1.6) { G.runStart = G.time; G.st.tries++; } // chrono aussi sans bloc posé (arrivée collée au départ)
  const bx = Math.floor(p.x), bz = Math.floor(p.z), by = Math.floor(p.y - 0.01);
  if (p.onGround && by === g.y - 1 && bx >= g.x + g.a && bx <= g.x + g.b && bz >= g.z + g.a && bz <= g.z + g.b && G.runStart != null && !G.endT) {
    const t = G.time - G.runStart; G.st.times.push(t); G.runStart = null;
    FP.sfx('finish'); R.burst('confetti', p.x, p.y, p.z, { n: 60 }); hitText(`Traversée en ${t.toFixed(2)} s`, '#5dff7a');
    if (G.st.times.length >= G.goalCross) { G.endT = 24; G.endWin = true; } else G.crossT = 24;
  }
  if (G.tick % 3 === 0) R.burst('portal', g.x + 0.5, g.y, g.z + 0.5, { n: 2 });
}

// ================================================================ course libre
// Des îles espacées au-dessus du vide (blocs seuls, bandes, murs à franchir). Seul compte d'arriver sur l'émeraude,
// par où on veut ; on peut poser des blocs partout (ponts, marches, et plafond pour sprint-jumper dessous : « head hitter »,
// plus rapide que la course normale, exactement comme dans Minecraft).
function courseInit() {
  W.reset(false); R.setWorld('void');
  const cfg = G.cfg, d = G.D.d, r = FP.rng((cfg.seed | 0) * 4099 + Math.round(cfg.diff) * 71 + 5);
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) W.set(x, -1, z, 'bricks');
  const C = G.course = { isl: [], index: new Map(), prog: -1, cps: [{ x: 0.5, y: 0, z: 0.5, yaw: 0, idx: -1 }], cpIdx: 0 };
  const n = clamp(cfg.iles | 0, 3, 200), every = Math.max(1, cfg.cp | 0);
  const near = (x, y, z) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -2; dy <= 3; dy++) for (let dz = -1; dz <= 1; dz++) if (W.blocks.has(W.key(x + dx, y + dy, z + dz))) return true; return false; };
  let cx = 0, cy = -1, cz = 1, minY = -1;
  for (let i = 0; i < n; i++) {
    for (let tries = 0; tries < 60; tries++) {
      const g = 2 + Math.floor(r() * (1.5 + 6.5 * d)), lat = d > 0.25 ? Math.round((r() * 2 - 1) * (1 + 2 * d)) : 0;
      const rr = r(), dy = rr < 0.15 ? 1 : rr < 0.35 ? -1 : (rr < 0.45 && d > 0.4) ? -2 : 0;
      const cp = (i + 1) % every === 0 && i < n - 1;
      const kind = !cp && i > 0 && r() < 0.18 + 0.25 * d ? 'mur' : r() < 0.35 ? 'bande' : 'bloc';
      const len = kind === 'mur' ? 5 : kind === 'bande' ? 2 + (r() * 3 | 0) : 1;
      const x = cx + lat, y = cy + dy, z0 = cz + g;
      if (y < -14 || y > 12) continue;
      const cells = []; for (let j = 0; j < len; j++) cells.push([x, z0 + j]);
      const wall = kind === 'mur' ? { z: z0 + 2, h: 2 + Math.round(r() * 2 * d), x } : null;
      if (cells.some(([a, b]) => near(a, y, b)) || (wall && [-1, 1].some(s => near(x + s, y + 1, wall.z)))) continue;
      const type = cp ? 'gold' : PK_COLS[(i / 2 | 0) % PK_COLS.length];
      cells.forEach(([a, b]) => { W.set(a, y, b, type); C.index.set(W.key(a, y, b), i); });
      if (wall) for (let s = -1; s <= 1; s++) for (let h = 1; h <= wall.h; h++) W.set(x + s, y + h, wall.z, 'bricks');
      C.isl.push({ cells, y, cp, wall, x, z0, len });
      if (cp) C.cps.push({ x: x + 0.5, y: y + 1, z: z0 + 0.5, yaw: 0, idx: i });
      cx = x; cy = y; cz = z0 + len - 1; minY = Math.min(minY, y);
      break;
    }
  }
  for (let a = -1; a <= 1; a++) for (let b = 3; b <= 5; b++) W.set(cx + a, cy, cz + b, 'emerald');
  C.finishBox = [cx - 1, cy, cz + 3, cx + 2, cy + 1, cz + 6];
  G.fixed = new Set(W.blocks.keys()); G.minY = minY - 10;
  G.st = { falls: 0, placed: 0, broken: 0 }; G.runStart = null;
  R.setItem('block', 'wool_' + cfg.couleur);
  courseRespawn(true);
}
function courseRespawn(first) {
  const C = G.course, c = C.cps[C.cpIdx], p = G.p;
  Object.assign(p, FP.Plan.rest([c.x - 0.5, c.y - 1, c.z - 0.5, c.x + 0.5, c.y, c.z + 0.5], c.yaw), { px: c.x, py: c.y, pz: c.z });
  C.prog = c.idx; G.yaw = c.yaw; G.pitch = 20; G.ai = null;
  if (!first) { G.st.falls++; FP.sfx('fall'); G.hurtFx = 0.5; }
}
const courseColor = () => 'wool_' + (G.cfg.couleur || 'blue');
function coursePlace() {
  const hit = FP.rayBlock(eyePos(), FP.lookDir(G.yaw, G.pitch), 4.5);
  if (!hit) return false;
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  if (W.solid(x, y, z)) return false;
  const b = FP.entBox(G.p, 0);
  if (x + 1 > b[0] && x < b[3] && y + 1 > b[1] && y < b[4] && z + 1 > b[2] && z < b[5]) return false;
  W.set(x, y, z, courseColor()); FP.sfx('place'); R.swing(); G.st.placed++;
  if (G.runStart == null) G.runStart = G.time;
  return true;
}
function courseBreak() { // on ne casse que ses propres blocs
  R.swing();
  const hit = FP.rayBlock(eyePos(), FP.lookDir(G.yaw, G.pitch), 4.5);
  if (!hit || G.fixed.has(W.key(hit.x, hit.y, hit.z))) return false;
  W.set(hit.x, hit.y, hit.z, null); G.st.broken++; FP.sfx('place');
  R.burst('block', hit.x + 0.5, hit.y + 0.4, hit.z + 0.5, { n: 8, color: blockColor(courseColor()) });
  return true;
}
function courseTick() {
  const p = G.p, C = G.course;
  if (G.rmb && ++G.rmbTimer >= 4) { G.rmbTimer = 0; coursePlace(); } // clic droit maintenu : 1 bloc / 4 ticks
  if (p.y < G.minY) { courseRespawn(false); return; }
  if (G.runStart == null && Math.hypot(p.x - 0.5, p.z - 0.5) > 1.6) G.runStart = G.time;
  if (G.tick % 3 === 0) R.burst('portal', (C.finishBox[0] + C.finishBox[3]) / 2, C.finishBox[4], (C.finishBox[2] + C.finishBox[5]) / 2, { n: 3 });
  if (!p.onGround) return;
  const by = Math.floor(p.y - 0.01);
  let idx = null, fin = false;
  for (const [ox, oz] of [[0, 0], [-0.2999, -0.2999], [0.2999, -0.2999], [-0.2999, 0.2999], [0.2999, 0.2999]]) {
    const bx = Math.floor(p.x + ox), bz = Math.floor(p.z + oz), i = C.index.get(W.key(bx, by, bz));
    if (i != null && i > C.prog && (idx == null || i > idx)) idx = i; // île la plus loin atteinte (dans n'importe quel ordre)
    if (W.get(bx, by, bz) === 'emerald') fin = true;
  }
  if (idx != null) {
    C.prog = idx;
    if (C.isl[idx].cp) { const ci = C.cps.findIndex(c => c.idx === idx); if (ci > C.cpIdx) { C.cpIdx = ci; FP.sfx('checkpoint'); hitText(`Checkpoint ${ci}`, '#ffe14d'); } }
  }
  if (fin && !G.endT) { G.finalTime = G.time - (G.runStart || 0); FP.sfx('finish'); R.burst('confetti', p.x, p.y, p.z, { n: 80 }); G.endT = 20; G.endWin = true; }
}

// ================================================================ course en forêt
function forestTree(x, z, r) {
  const h = 4 + (r() * 3 | 0);
  for (let y = 0; y < h; y++) W.set(x, y, z, 'log');
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = h - 2; dy <= h + 1; dy++) {
    const rr = Math.abs(dx) + Math.abs(dz) + Math.max(0, dy - h) * 2;
    if ((dx || dz || dy >= h) && rr <= (dy >= h ? 2 : 3) && !(Math.abs(dx) === 2 && Math.abs(dz) === 2 && r() < 0.7)) W.set(x + dx, dy, z + dz, 'leaves');
  }
}
function forestInit() {
  W.reset(true); R.setWorld('arena');
  const cfg = G.cfg, d = clamp(cfg.obstacles == null ? 50 : cfg.obstacles, 0, 100) / 100, r = FP.rng((cfg.seed | 0) * 7717 + (cfg.dist | 0) * 13 + (cfg.densite | 0) * 3 + Math.round(d * 100) * 31);
  const D = clamp(cfg.dist | 0, 30, 220), z0 = -Math.floor(D / 2), z1 = z0 + D, fx = Math.round((r() * 2 - 1) * 8);
  const dens = clamp(cfg.densite | 0, 5, 100) / 100;
  G.fo = { start: [0.5, z0 + 0.5], fin: [fx + 0.5, z1 + 0.5], D, leg: 0 };
  const clearAt = (x, z) => Math.hypot(x - 0.5, z - z0 - 0.5) < 3.5 || Math.hypot(x - fx - 0.5, z - z1 - 0.5) < 3.5;
  const free = (x, z, rr) => { for (let a = -rr; a <= rr; a++) for (let b = -rr; b <= rr; b++) if (W.get(x + a, 0, z + b) || W.get(x + a, 1, z + b)) return false; return true; };
  // arbres sur une grille irrégulière (cases de 4×4) ; plus c'est difficile, plus il y a de buissons, troncs couchés et rochers
  for (let gx = -44; gx < 44; gx += 4) for (let gz = z0 - 16; gz < z1 + 16; gz += 4) {
    const x = gx + (r() * 4 | 0), z = gz + (r() * 4 | 0);
    if (clearAt(x, z) || Math.abs(z) > FP.ARENA - 3) continue;
    const k = r();
    if (k < dens * 0.55) { if (free(x, z, 1)) forestTree(x, z, r); }
    else if (k < dens * (0.55 + 0.25 * d)) { if (free(x, z, 1)) { W.set(x, 0, z, 'leaves'); if (r() < 0.6) W.set(x + 1, 0, z, 'leaves'); if (r() < 0.5) W.set(x, 1, z, 'leaves'); } }
    else if (k < dens * (0.55 + 0.4 * d)) { if (free(x, z, 2)) { const hx = r() < 0.5, len = 2 + (r() * 3 | 0); for (let j = 0; j < len; j++) W.set(x + (hx ? j : 0), 0, z + (hx ? 0 : j), r() < 0.5 ? 'log' : 'stone'); } }
  }
  // arche du demi-tour (loin) et arche de départ / arrivée : deux piliers dorés chacune
  for (let y = 0; y < 4; y++) { W.set(fx - 2, y, z1, 'gold'); W.set(fx + 2, y, z1, 'gold'); W.set(-2, y, z0, 'gold'); W.set(2, y, z0, 'gold'); }
  R.clearLabels(); R.addLabel('Demi-tour', fx + 0.5, 5.2, z1 + 0.5); R.addLabel('Départ / arrivée', 0.5, 5.2, z0 + 0.5);
  const p = G.p; Object.assign(p, { x: 0.5, z: z0 + 0.5, px: 0.5, pz: z0 + 0.5, y: 0, py: 0 });
  G.yaw = Math.atan2(-(fx - 0), z1 - z0) / DEG; G.pitch = 5;
  G.st = { walked: 0, placed: 0, broken: 0 }; G.runStart = null; G.finalTime = null;
  G.fixed = new Set(W.blocks.keys()); R.setItem('block', 'wool_' + (cfg.couleur || 'blue'));
}
function forestTick() {
  const p = G.p, F = G.fo;
  if (G.rmb && ++G.rmbTimer >= 4) { G.rmbTimer = 0; coursePlace(); } // clic droit maintenu : 1 bloc / 4 ticks
  if (G.finalTime != null) return; // arrivé : le chrono est arrêté
  if (G.runStart == null && Math.hypot(p.x - F.start[0], p.z - F.start[1]) > 1.5) G.runStart = G.time;
  if (G.runStart != null) G.st.walked += Math.hypot(p.x - p.px, p.z - p.pz);
  const tgt = F.leg === 0 ? F.fin : F.start;
  if (G.tick % 2 === 0) R.burst('portal', tgt[0], 0.2, tgt[1], { n: 3 });
  if (F.leg === 0 && Math.hypot(p.x - F.fin[0], p.z - F.fin[1]) < 2) { F.leg = 1; F.half = G.time - (G.runStart || 0); FP.sfx('checkpoint'); hitText(`Demi-tour en ${F.half.toFixed(2)} s : retour au départ !`, '#ffe14d'); }
  else if (F.leg === 1 && !G.endT && Math.hypot(p.x - F.start[0], p.z - F.start[1]) < 2) {
    G.finalTime = G.time - (G.runStart || 0); FP.sfx('finish'); R.burst('confetti', p.x, p.y, p.z, { n: 80 }); G.endT = 20; G.endWin = true;
  }
}

// ================================================================ pont dans le vent
// Un pont d'un bloc de large, infini. Des coups te frappent de côté (recul exact de Minecraft, enchantement Recul de
// plus en plus fort à mesure qu'on avance) et on se rattrape en posant des blocs.
function ventInit() {
  W.reset(false); R.setWorld('void');
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) W.set(x, -1, z, 'bricks');
  G.vt = { built: -40, tries: 0, dists: [], best: 0, maxZ: 0, gust: null, next: 60 };
  G.st = { placed: 0, broken: 0, gusts: 0, saves: 0 }; G.goalTries = INF(G.cfg.essais);
  ventExtend(); G.fixed = new Set(W.blocks.keys());
  R.setItem('block', 'wool_' + G.cfg.couleur);
  ventRespawn(true);
}
const VENT_DEPTH = 64; // le pont est plein jusqu'à 64 blocs sous la surface (au-delà, le brouillard cache tout)
function ventExtend() {
  const V = G.vt, p = G.p;
  let added = false;
  while (V.built < Math.max(80, p.z + 80)) {
    V.built++;
    for (let y = -1; y >= -VENT_DEPTH; y--) { const k = W.key(0, y, V.built); if (!W.blocks.has(k)) W.blocks.set(k, 'bricks'); if (G.fixed) G.fixed.add(k); }
    added = true;
  }
  if (added) W.version++;
}
function ventRespawn(first) {
  const V = G.vt, p = G.p;
  if (!first) {
    V.dists.push(V.maxZ); V.best = Math.max(V.best, V.maxZ); V.tries++;
    FP.sfx('fall'); G.hurtFx = 0.6; hitText(`Essai ${V.tries} : ${V.maxZ.toFixed(1)} blocs`, '#ffe14d');
    if (V.tries >= G.goalTries) { G.endT = 20; G.endWin = undefined; return; }
    for (const k of [...W.blocks.keys()]) if (!G.fixed.has(k)) W.blocks.delete(k); W.version++;
  }
  Object.assign(p, FP.Plan.rest([0, -1, 0, 1, 0, 1], 0), { px: 0.5, py: 0, pz: 0.5 });
  G.yaw = 0; G.pitch = 45; G.ai = null; V.maxZ = 0; V.gust = null; V.next = 50;
}
// niveau de l'enchantement Recul des coups, selon la distance parcourue
function ventLevel() { return Math.floor(Math.max(0, G.p.z) / Math.max(5, G.cfg.montee | 0)); }
function ventTick() {
  const p = G.p, V = G.vt, D = G.D;
  if (G.rmb && ++G.rmbTimer >= 4) { G.rmbTimer = 0; coursePlace(); }
  if (G.endT) return;
  if (p.y < -VENT_DEPTH + 4) { ventRespawn(false); return; } // tout en bas : essai terminé (on peut se rattraper contre le pont avant)
  if (p.onGround && p.y > -0.5) V.maxZ = Math.max(V.maxZ, p.z - 0.5);
  if (G.runStart == null && p.z > 1.5) G.runStart = G.time;
  ventExtend();
  const lv = ventLevel();
  if (!V.gust && --V.next <= 0) { // un coup s'annonce (étincelles du côté de l'attaquant), puis frappe
    const warn = Math.round(FP.lerp(16, 4, D.d));
    V.gust = { dir: Math.random() < 0.5 ? -1 : 1, t: -warn, sprint: Math.random() < Math.max(0, D.d - 0.5) * 1.2 }; // coups en sprint (+1 niveau) : seulement au-delà de 50 %
  }
  const g = V.gust;
  if (g) {
    g.t++;
    const side = g.dir; // l'attaquant est du côté opposé à la poussée
    if (g.t < 0 && G.tick % 2 === 0) R.burst('crit', p.x - side * 1.6, p.y + 1.2, p.z, { n: 2 });
    if (g.t === 0) {
      // recul de Minecraft : vitesse ÷2, −0,4 vers l'attaquant (donc +0,4 vers l'extérieur), vertical +0,4 (max 0,4) ;
      // puis Recul niveau L (+1 si l'attaquant sprinte) : +0,5 × L horizontal et +0,1 vertical
      const L = lv + (g.sprint ? 1 : 0);
      p.vx = p.vx / 2 + side * 0.4; p.vz /= 2; p.vy = Math.min(0.4, p.vy / 2 + 0.4);
      if (L > 0) { p.vx += side * 0.5 * L; p.vy += 0.1; }
      p.onGround = false; G.st.gusts++; G.hurtFx = 1; G.hurtDir = -side; FP.sfx('hurt');
      R.burst('hit', p.x - side * 0.3, p.y + 1.2, p.z, { n: 8 }); hitText(`Coup ! Recul ${L ? 'niveau ' + L : 'de base'}`, '#ff6b5b');
    }
    if (g.t > 1) { V.gust = null; V.next = Math.round(rand(FP.lerp(70, 28, D.d), FP.lerp(130, 60, D.d)) / (1 + lv * 0.25)); }
  }
}

// ================================================================ course de bateau sur glace
// Circuit fermé (courbe lissée), piste de glace bordée de murs d'un bloc : le bateau ne peut ni les monter ni les
// traverser. Physique du bateau : FP.stepBoat (copie exacte de Minecraft). Le joueur tourne avec le bateau et peut
// regarder autour de lui jusqu'à 105° de chaque côté, comme dans Minecraft.
// largeur de la piste selon la difficulté : 16 blocs (0 %) → 4 blocs (100 %)
const boatWidth = cfg => Math.round(FP.lerp(16, 4, clamp(cfg.diff == null ? 50 : cfg.diff, 0, 100) / 100));
FP.boatWidth = boatWidth;
function boatInit() {
  W.reset(false); R.setWorld('arena');
  const cfg = G.cfg, larg = boatWidth(cfg), r = FP.rng((cfg.seed | 0) * 9173 + larg * 7 + (cfg.virages | 0) * 3 + ({ petit: 1, moyen: 2, grand: 3 }[cfg.taille] || 2) * 101);
  const R0 = { petit: 55, moyen: 95, grand: 150 }[cfg.taille] || 95, wig = clamp(cfg.virages | 0, 0, 100) / 100;
  const ph = [r() * 6.283, r() * 6.283, r() * 6.283], am = [0.2 * wig, 0.11 * wig, 0.05 * wig], asp = 1 + (r() * 0.5 - 0.1) * (0.4 + wig);
  const N = Math.round(Math.PI * R0 * 4), pts = [];
  for (let i = 0; i < N; i++) {
    const th = i / N * Math.PI * 2, rr = R0 * (1 + am[0] * Math.sin(2 * th + ph[0]) + am[1] * Math.sin(3 * th + ph[1]) + am[2] * Math.sin(5 * th + ph[2]));
    pts.push([Math.cos(th) * rr * asp, Math.sin(th) * rr]);
  }
  // longueur réelle, points ré-échantillonnés tous les 0,5 bloc
  const seg = []; let L = 0; for (let i = 0; i < N; i++) { const a = pts[i], b = pts[(i + 1) % N], d = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push(d); L += d; }
  const M = Math.round(L / 0.5), P = []; let k = 0, acc = 0;
  for (let j = 0; j < M; j++) { const s = j * L / M; while (acc + seg[k] < s) { acc += seg[k]; k = (k + 1) % N; } const t = (s - acc) / seg[k], a = pts[k], b = pts[(k + 1) % N]; P.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  const hw = larg / 2, ice = cfg.glace === 'blue_ice' ? 'blue_ice' : 'packed_ice', dist = new Map();
  for (const [px, pz] of P) for (let dx = -Math.ceil(hw + 2); dx <= Math.ceil(hw + 2); dx++) for (let dz = -Math.ceil(hw + 2); dz <= Math.ceil(hw + 2); dz++) {
    const cx = Math.floor(px) + dx, cz = Math.floor(pz) + dz, d = Math.hypot(cx + 0.5 - px, cz + 0.5 - pz), key = cx + ',' + cz;
    if (d < (dist.get(key) ?? 1e9)) dist.set(key, d);
  }
  for (const [key, d] of dist) {
    const [x, z] = key.split(',').map(Number);
    if (d <= hw) W.blocks.set(W.key(x, 0, z), ice);
    else if (d <= hw + 1.25) { W.blocks.set(W.key(x, 0, z), 'bricks'); W.blocks.set(W.key(x, 1, z), 'bricks'); }
  }
  // portique de départ / arrivée
  const t0 = [P[1][0] - P[0][0], P[1][1] - P[0][1]], tl = Math.hypot(t0[0], t0[1]), nx = -t0[1] / tl, nz = t0[0] / tl;
  for (const s of [-1, 1]) { const gx = Math.floor(P[0][0] + nx * s * (hw + 0.7)), gz = Math.floor(P[0][1] + nz * s * (hw + 0.7)); for (let y = 0; y < 5; y++) W.blocks.set(W.key(gx, y, gz), 'gold'); }
  W.version++;
  R.clearLabels(); R.addLabel('Départ / arrivée', P[0][0], 6.2, P[0][1]);
  G.track = { P, M, L, hw, NS: 8, ice };
  const st = P[(M - 8) % M], yaw = Math.atan2(-t0[0], t0[1]) / DEG;
  G.boat = FP.makeBoat(st[0], 1, st[1], yaw); G.boat.idx = M - 8;
  G.yaw = yaw; G.pitch = 10; G.noHand = true; R.setItem('none');
  G.race = { lap: 0, laps: clamp(cfg.tours | 0, 1, 20), sec: G.track.NS - 1, lapStart: null, times: [] };
  G.st = { hits: 0, maxSpeed: 0 }; G.runStart = null; G.finalTime = null;
  boatSyncPlayer();
}
// le joueur est assis dans le bateau : la caméra suit le bateau
function boatSyncPlayer() {
  const b = G.boat, p = G.p;
  p.px = b.px; p.py = b.py - 0.45; p.pz = b.pz; p.x = b.x; p.y = b.y - 0.45; p.z = b.z; p.vx = b.vx; p.vz = b.vz; p.onGround = true; p.sneaking = false; p.h = 1.8;
}
// point le plus proche de la ligne centrale (recherche locale, la piste est une boucle)
function boatIndex(T, b, i0) {
  let best = i0, bd = 1e9;
  for (let k = -6; k <= 24; k++) { const j = ((i0 + k) % T.M + T.M) % T.M, d = (T.P[j][0] - b.x) ** 2 + (T.P[j][1] - b.z) ** 2; if (d < bd) { bd = d; best = j; } }
  return best;
}
FP.boatIndex = boatIndex;
function boatTick() {
  const b = G.boat, T = G.track, R2 = G.race;
  const inp = { up: !!inp2('fwd'), down: !!inp2('back'), left: !!inp2('left'), right: !!inp2('right') };
  if (G.endT || G.finalTime != null) { inp.up = inp.down = inp.left = inp.right = false; }
  const sp0 = Math.hypot(b.vx, b.vz);
  FP.stepBoat(b, inp);
  G.boatRow = inp.up || inp.down || inp.left !== inp.right;
  if (b.hitH && sp0 > 0.25) { G.st.hits++; FP.sfx('land'); }
  // le joueur tourne avec le bateau, et regarde au plus à 105° de son axe
  G.yaw += b.dr; G.yaw = b.yaw + clamp(wrap(G.yaw - b.yaw), -105, 105);
  if (G.auto) { G.yaw = b.yaw; G.pitch = 8; }
  boatSyncPlayer();
  const sp = Math.hypot(b.vx, b.vz); G.st.maxSpeed = Math.max(G.st.maxSpeed, sp);
  if (G.runStart == null) { G.runStart = G.time; R2.lapStart = G.time; }
  // tours : secteurs à passer dans l'ordre, le tour compte en repassant la ligne
  b.idx = boatIndex(T, b, b.idx);
  const sec = Math.floor(b.idx / T.M * T.NS);
  if (sec === (R2.sec + 1) % T.NS) {
    R2.sec = sec;
    if (sec === 0) {
      if (R2.started) { const lt = G.time - R2.lapStart; R2.times.push(lt); R2.lapStart = G.time; R2.lap++; FP.sfx(R2.lap >= R2.laps ? 'finish' : 'checkpoint'); hitText(`Tour ${R2.lap} : ${lt.toFixed(2)} s`, '#ffe14d');
        if (R2.lap >= R2.laps && G.finalTime == null) { G.finalTime = G.time - G.runStart; G.endT = 30; G.endWin = true; R.burst('confetti', b.x, b.y + 1, b.z, { n: 80 }); } }
      R2.started = true;
    }
  }
  if (G.tick % 2 === 0 && G.finalTime == null) R.burst('portal', T.P[0][0], 1.2, T.P[0][1], { n: 2 });
}

// ================================================================ clutch (rattrapage de chute)
// On saute du haut d'un pilier et on se rattrape avant le sol. Objets (selon la difficulté, ou au choix) : seau d'eau,
// botte de foin (coussin, dégâts × 0,2), toile, slime, lit (dégâts ÷ 2, rebond), bateau, échafaudage, échelle contre un
// mur d'un seul bloc de haut, charge de vent, masse, TNT + briquet (l'explosion te relance : elle blesse, mais ta chute
// repart de zéro).
const CLUTCH = { water: ['Seau d’eau', 'water_bucket'], hay: ['Botte de foin (coussin)', 'hay'], cobweb: ['Toile d’araignée', 'cobweb'], slime: ['Bloc de slime', 'slime'],
  bed: ['Lit', 'bed'], boat: ['Bateau', 'boat'], scaffolding: ['Échafaudage', 'scaffolding'], ladder: ['Échelle (mur d’un bloc)', 'ladder'],
  wind: ['Charge de vent', 'wind_charge'], mace: ['Masse (frappe le zombie)', 'mace'], tnt: ['TNT + briquet', 'tnt_item'] };
const CL_PARTIAL = new Set(['hay', 'bed', 'tnt']); // ne suppriment pas tous les dégâts : réussi = survivre
FP.CLUTCH = CLUTCH; FP.CL_PARTIAL = CL_PARTIAL;
const groundBelow = (x, y, z) => { for (let yy = Math.floor(y - 0.001); yy > -3; yy--) if (W.solid(Math.floor(x), yy, Math.floor(z))) return yy + 1; return 0; };
function clutchInit() {
  G.cl = { round: 0, total: INF(G.cfg.manches), log: [] };
  G.st = { ok: 0, fail: 0, dead: 0, dmg: 0, margins: [], byItem: {} };
  G.p.onLand = (fall, dmg) => clutchLand(fall, dmg);
  clutchRound();
}
function clutchPool() {
  const o = G.cfg.objet; if (o && o !== 'auto' && CLUTCH[o]) return [o];
  const d = G.D.d, pool = ['water', 'hay'];
  if (d >= 0.25) pool.push('cobweb', 'slime', 'bed');
  if (d >= 0.45) pool.push('boat', 'scaffolding', 'ladder');
  if (d >= 0.65) pool.push('wind');
  if (d >= 0.85) pool.push('mace', 'tnt');
  return pool;
}
// hauteur des pieds au début de chaque tick, en tombant sans vitesse d'un bloc de hauteur H (physique de Minecraft)
function fallTicks(H) { const out = []; let y = H, vy = 0; for (let t = 0; t < 400 && y > 0; t++) { out.push(y); y += vy; vy = (vy - 0.08) * 0.98; } return out; }
function clutchRound() {
  W.reset(true); R.decorateArena(); G.ents = []; G.wc = []; G.tnts = []; FP.extra = []; G.boat = null; R.clearEntities();
  const d = G.D.d, C = G.cl, pool = clutchPool(), item = pool[(Math.random() * pool.length) | 0];
  C.round++;
  let H = Math.round(FP.lerp(12, 44, d) + Math.random() * FP.lerp(5, 20, d));
  if (item === 'tnt') H = Math.max(H, 22);
  if (item === 'bed') H = Math.min(H, 26); // le lit ne fait que diviser les dégâts par deux
  // il faut au moins un tick où l'action est possible (portée 4,5 blocs depuis l'œil) — à près de 4 blocs par tick, ce
  // n'est pas toujours le cas : on ajuste la hauteur du pilier d'un bloc ou deux
  const lo = { water: 0.05, cobweb: 0.05, scaffolding: 0.05, boat: 0.6, bed: 0.6, slime: 1.05, hay: 1.05 }[item];
  for (let k = 0; k < 14; k++) {
    const ys = fallTicks(H); let ok = true;
    if (lo != null) ok = ys.some(y => y <= 2.8 && y > lo);
    if (item === 'ladder') ok = ys.some((y, i) => y < 1 && y >= 0.05 && i > 0 && ys[i - 1] <= 3.1);
    if (ok) break; H++;
  }
  // le pilier dont on saute
  for (let y = 0; y < H; y++) W.blocks.set(W.key(0, y, 0), 'stone');
  if (item === 'ladder') for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) if (Math.max(Math.abs(x), Math.abs(z)) === 3) W.blocks.set(W.key(x, 0, z), 'bricks'); // mur d'un seul bloc de haut
  W.version++;
  Object.assign(G.p, { x: 0.5, y: H, z: 0.5, px: 0.5, py: H, pz: 0.5, vx: 0, vy: 0, vz: 0, onGround: true, fall: 0, sneaking: false, inWeb: false });
  C.H = H; C.item = item; C.used = null; C.state = 'stand'; C.dmg = 0; C.cool = 0; C.after = 0;
  C.bucket = item === 'water' ? 'water_bucket' : null; C.slot = 0;
  if (item === 'mace') for (const [x, z] of [[0.5, 2.0], [0.5, -1.0], [2.0, 0.5], [-1.0, 0.5]]) { // un zombie de chaque côté du pilier
    const zb = FP.makeEnt(x, z, 0, { shirt: '#2a8a8a', pants: '#3a3a9a', hair: '#2f6e2f', skin: '#5f9e4a', item: 'none', name: '' });
    zb.static = true; zb.yaw = zb.lookYaw = Math.atan2(-(0.5 - x), 0.5 - z) / DEG; G.ents.push(zb);
  }
  G.o = G.ents[0] || null;
  G.yaw = 0; G.pitch = 40;
  clutchHand(); updateHotbar();
}
function clutchItems() { const C = G.cl; if (!C) return []; if (C.item === 'tnt') return ['tnt_item', 'flint_and_steel']; return [C.item === 'water' ? C.bucket : CLUTCH[C.item][1]]; }
function clutchHand() { const it = clutchItems()[G.cl.slot] || clutchItems()[0]; R.setItem('sprite', FP.CRAFT.icon(it)); }
function clutchSelect(i) { const C = G.cl, n = clutchItems().length; if (n < 2) return; const s = ((i % n) + n) % n; if (s === C.slot) return; C.slot = s; G.sel = s; clutchHand(); updateHotbar(); FP.sfx('equip'); }
function clutchHeight() { const p = G.p; return p.y - groundBelow(p.x, p.y, p.z); }
function clutchMark() { const C = G.cl; if (C.used == null && C.state === 'fall') C.used = Math.max(0, clutchHeight()); }
const intersectsPlayer = (x, y, z) => { const b = FP.entBox(G.p, 0); return x + 1 > b[0] && x < b[3] && y + 1 > b[1] && y < b[4] && z + 1 > b[2] && z < b[5]; };
function clutchUse() { // clic droit
  const C = G.cl, eye = eyePos(), dir = FP.lookDir(G.yaw, G.pitch);
  if (C.state === 'done' && C.item !== 'water') return;
  const it = C.item, hit = FP.rayBlock(eye, dir, 4.5);
  if (it === 'water') {
    if (C.bucket === 'water_bucket') {
      if (!hit) return; const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; if (W.get(x, y, z) || W.solid(x, y, z)) return;
      W.set(x, y, z, 'water'); C.bucket = 'bucket'; clutchMark(); FP.sfx('place'); R.swing();
    } else { // seau vide : on reprend l'eau
      const h2 = FP.rayCell(eye, dir, 4.5, (x, y, z) => W.get(x, y, z) === 'water' ? true : W.solid(x, y, z) ? null : false);
      if (!h2) return; W.set(h2.x, h2.y, h2.z, null); C.bucket = 'water_bucket'; FP.sfx('place'); R.swing();
    }
    clutchHand(); updateHotbar(); return;
  }
  if (it === 'wind') { // charge de vent : 1,5 bloc/tick + vitesse du lanceur, recharge 0,5 s
    if (C.cool > 0) return; C.cool = 10; const p = G.p;
    G.wc.push({ x: eye[0], y: eye[1] - 0.1, z: eye[2], vx: dir[0] * 1.5 + p.vx, vy: dir[1] * 1.5 + (p.onGround ? 0 : p.vy), vz: dir[2] * 1.5 + p.vz, life: 0 });
    clutchMark(); FP.sfx('swing'); R.swing(); return;
  }
  if (it === 'tnt' && C.slot === 1) { // briquet sur une TNT : elle s'allume et tombe (entité, mèche de 4 s)
    if (!hit || W.get(hit.x, hit.y, hit.z) !== 'tnt') return;
    W.set(hit.x, hit.y, hit.z, null); const a = Math.random() * Math.PI * 2;
    G.tnts.push({ x: hit.x + 0.5, y: hit.y, z: hit.z + 0.5, px: hit.x + 0.5, py: hit.y, pz: hit.z + 0.5, vx: -Math.sin(a) * 0.02, vy: 0.2, vz: -Math.cos(a) * 0.02, fuse: 80, onGround: false });
    FP.sfx('bowdraw'); R.swing(); return;
  }
  if (!hit) return;
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  if (it === 'boat') { // le bateau se pose sur le dessus d'un bloc, là où l'on vise
    if (hit.ny !== 1 || G.boat) return;
    const t = FP.rayBox(eye, dir, [hit.x, hit.y, hit.z, hit.x + 1, hit.y + 1, hit.z + 1]), bx = eye[0] + dir[0] * t, bz = eye[2] + dir[2] * t, by = hit.y + 1;
    const box = [bx - 0.6875, by, bz - 0.6875, bx + 0.6875, by + 0.5625, bz + 0.6875], pb = FP.entBox(G.p, 0);
    if (box[0] < pb[3] && box[3] > pb[0] && box[1] < pb[4] && box[4] > pb[1] && box[2] < pb[5] && box[5] > pb[2]) return;
    FP.extra.push({ b: box, kind: 'boat' }); G.boat = FP.makeBoat(bx, by, bz, G.yaw); clutchMark(); FP.sfx('place'); R.swing(); return;
  }
  if (W.get(x, y, z) || W.solid(x, y, z)) return;
  if (it === 'ladder' && hit.ny !== 0) return; // une échelle se pose contre le côté d'un bloc
  if ((it === 'slime' || it === 'hay' || it === 'tnt' || it === 'bed') && intersectsPlayer(x, y, z)) return;
  if (it === 'bed') { // un lit prend deux cases : la tête dans la direction du regard
    if (hit.ny !== 1) return;
    const r = G.yaw * DEG, fx = Math.abs(Math.sin(r)) > Math.abs(Math.cos(r)) ? -Math.sign(Math.sin(r)) : 0, fz = fx ? 0 : Math.sign(Math.cos(r));
    if (W.get(x + fx, y, z + fz) || W.solid(x + fx, y, z + fz) || !W.solid(x + fx, y - 1, z + fz) || intersectsPlayer(x + fx, y, z + fz)) return;
    W.set(x, y, z, 'bed'); W.set(x + fx, y, z + fz, 'bed');
  } else W.set(x, y, z, it === 'tnt' ? 'tnt' : it);
  if (it !== 'tnt') clutchMark();
  FP.sfx('place'); R.swing();
}
// rafale de la charge de vent (puissance 1,2) : pousse dans un rayon de 2,4 blocs et remet la chute à zéro
function windBurst(cx, cy, cz, e) {
  const d = Math.hypot(e.x - cx, e.y - cy, e.z - cz), Rr = 2.4;
  if (d >= Rr) return false;
  const ey = e.y + (e.sneaking ? 1.27 : 1.62), dx = e.x - cx, dy = ey - cy, dz = e.z - cz, L = Math.hypot(dx, dy, dz) || 1, k = (1 - d / Rr) * 1.22;
  e.vx += dx / L * k; e.vy += dy / L * k; e.vz += dz / L * k; e.fall = 0; e.onGround = false;
  return true;
}
FP.windBurst = windBurst;
// explosion de TNT (puissance 4, rayon d'effet 8) : dégâts = ((i² + i) / 2) × 7 × 8 + 1 et recul = i, avec
// i = (1 − distance / 8) × part du corps exposée ; la chute repart de zéro au moment où l'explosion te relance
function tntExplode(x, y, z, e, exposure) {
  const d = Math.hypot(e.x - x, e.y - y, e.z - z) / 8;
  if (d > 1) return 0;
  const ex = exposure == null ? tntExposure(x, y, z, e) : exposure, imp = (1 - d) * ex;
  const dx = e.x - x, dy = e.y + 1.62 - y, dz = e.z - z, L = Math.hypot(dx, dy, dz) || 1;
  e.vx += dx / L * imp; e.vy += dy / L * imp; e.vz += dz / L * imp; e.onGround = false;
  if (imp > 0) e.fall = 0;
  return Math.floor((imp * imp + imp) / 2 * 7 * 8 + 1);
}
function tntExposure(x, y, z, e) { // proportion des points du corps visibles depuis l'explosion
  const b = FP.entBox(e, 0); let seen = 0, n = 0;
  for (const fx of [0, 1]) for (const fy of [0, 0.5, 1]) for (const fz of [0, 1]) {
    const px = b[0] + (b[3] - b[0]) * fx, py = b[1] + (b[4] - b[1]) * fy, pz = b[2] + (b[5] - b[2]) * fz, dv = [px - x, py - y, pz - z], L = Math.hypot(dv[0], dv[1], dv[2]) || 1e-6;
    const h = FP.rayBlock([x, y, z], [dv[0] / L, dv[1] / L, dv[2] / L], L); n++; if (!h) seen++;
  }
  return seen / n;
}
FP.tntExplode = tntExplode;
// TNT allumée : gravité 0,04, frottement 0,98, au sol × 0,7 et rebond × −0,5 ; explose quand la mèche arrive à 0
function tntStep(t) {
  t.px = t.x; t.py = t.y; t.pz = t.z;
  t.vy -= 0.04;
  let dx = t.vx, dy = t.vy, dz = t.vz; let b = [t.x - 0.49, t.y, t.z - 0.49, t.x + 0.49, t.y + 0.98, t.z + 0.49];
  const list = FP.boxesFor([b[0] + Math.min(0, dx), b[1] + Math.min(0, dy), b[2] + Math.min(0, dz), b[3] + Math.max(0, dx), b[4] + Math.max(0, dy), b[5] + Math.max(0, dz)]);
  const ody = dy, odx = dx, odz = dz, ov = (c, bb, ax) => ax === 'y' ? !(bb[3] <= c[0] || bb[0] >= c[3] || bb[5] <= c[2] || bb[2] >= c[5]) : ax === 'x' ? !(bb[4] <= c[1] || bb[1] >= c[4] || bb[5] <= c[2] || bb[2] >= c[5]) : !(bb[3] <= c[0] || bb[0] >= c[3] || bb[4] <= c[1] || bb[1] >= c[4]);
  // collisions sur les trois axes (Y puis X puis Z), comme une entité de Minecraft
  for (const c of list) { if (!ov(c, b, 'y')) continue; if (dy < 0 && b[1] >= c[4]) dy = Math.max(dy, c[4] - b[1]); else if (dy > 0 && b[4] <= c[1]) dy = Math.min(dy, c[1] - b[4]); }
  b = [b[0], b[1] + dy, b[2], b[3], b[4] + dy, b[5]];
  for (const c of list) { if (!ov(c, b, 'x')) continue; if (dx < 0 && b[0] >= c[3]) dx = Math.max(dx, c[3] - b[0]); else if (dx > 0 && b[3] <= c[0]) dx = Math.min(dx, c[0] - b[3]); }
  b = [b[0] + dx, b[1], b[2], b[3] + dx, b[4], b[5]];
  for (const c of list) { if (!ov(c, b, 'z')) continue; if (dz < 0 && b[2] >= c[5]) dz = Math.max(dz, c[5] - b[2]); else if (dz > 0 && b[5] <= c[2]) dz = Math.min(dz, c[2] - b[5]); }
  t.y += dy; t.x += dx; t.z += dz; t.onGround = ody !== dy && ody < 0; if (ody !== dy) t.vy = 0; if (odx !== dx) t.vx = 0; if (odz !== dz) t.vz = 0;
  t.vx *= 0.98; t.vy *= 0.98; t.vz *= 0.98;
  if (t.onGround) { t.vx *= 0.7; t.vz *= 0.7; t.vy *= -0.5; }
  return --t.fuse <= 0;
}
FP.tntStep = tntStep;
function clutchTick() {
  const C = G.cl, p = G.p;
  if (C.cool > 0) C.cool--;
  if (C.state === 'stand' && p.y < C.H - 0.01) { C.state = 'fall'; } // il a quitté le pilier
  for (const w of G.wc) { // charges de vent en vol
    if (w.dead) continue;
    w.life++;
    const len = Math.hypot(w.vx, w.vy, w.vz), dir = [w.vx / len, w.vy / len, w.vz / len], hit = FP.rayBlock([w.x, w.y, w.z], dir, len);
    let ent = null; for (const e of G.ents) { const t = FP.rayBox([w.x, w.y, w.z], dir, FP.entBox(e, 0)); if (t <= len && (!hit || t < hit.t)) ent = { t }; }
    const tt = ent ? ent.t : hit ? hit.t : null;
    if (tt != null) {
      const cx = w.x + dir[0] * tt, cy = w.y + dir[1] * tt, cz = w.z + dir[2] * tt; w.dead = true;
      R.burst('explode', cx, cy, cz, { n: 14 }); FP.sfx('boom'); windBurst(cx, cy, cz, p);
    } else { w.x += w.vx; w.y += w.vy; w.z += w.vz; R.burst('smoke', w.x, w.y - 0.8, w.z, { n: 1, color: '#e8f8ff' }); if (w.life > 100) w.dead = true; }
  }
  G.wc = G.wc.filter(w => !w.dead);
  for (const t of G.tnts) { // TNT allumées
    if (t.dead) continue;
    if (G.tick % 3 === 0) R.burst('smoke', t.x, t.y + 1, t.z, { n: 1, color: '#bbbbbb' });
    if (tntStep(t)) {
      t.dead = true; const ey = t.y + 0.06125; R.burst('explode', t.x, ey, t.z, { n: 40 }); R.burst('flash', t.x, ey + 0.5, t.z, {}); FP.sfx('boom');
      const dmg = C.state !== 'done' ? tntExplode(t.x, ey, t.z, p) : 0;
      if (dmg > 0) { C.dmg += dmg; G.hurtFx = 1; FP.sfx('hurt'); hitText(`Explosion : −${(dmg / 2).toFixed(1)} ❤`, '#ffa53d'); clutchMark(); if (C.dmg >= 20) clutchLand(0, 0); }
    }
  }
  G.tnts = G.tnts.filter(t => !t.dead);
  if (C.state === 'done' && --C.after <= 0) { if (C.round >= C.total) { G.endT = 1; G.endWin = undefined; } else clutchRound(); }
}
function clutchAttack() { // clic gauche : la masse annule la chute si on frappe en tombant (plus de 1,5 bloc)
  const C = G.cl; R.swing(); FP.sfx('swing');
  if (C.item !== 'mace' || C.state !== 'fall') return;
  const t = aimEnt(3);
  if (t && G.p.fall > 1.5 && !G.p.onGround) {
    clutchMark(); G.p.fall = 0; G.p.vy = 0.01; t.hurtTime = 10;
    R.burst('crit', t.x, t.y + 1.8, t.z, { n: 20 }); R.burst('explode', t.x, t.y + 0.2, t.z, { n: 10 }); FP.sfx('crit'); hitText('Coup de masse !', '#ffe14d');
  }
}
function clutchLand(fall, dmg) {
  const C = G.cl; if (!C || C.state !== 'fall') return;
  C.state = 'done'; C.after = 32; C.dmg += dmg;
  const st = G.st, name = CLUTCH[C.item][0], bi = st.byItem[C.item] || (st.byItem[C.item] = { ok: 0, n: 0 }), tot = C.dmg;
  const ok = tot < 20 && (tot <= 0 || CL_PARTIAL.has(C.item));
  bi.n++;
  if (ok) { st.ok++; bi.ok++; if (C.used != null) st.margins.push(C.used); FP.sfx('ok'); hitText(tot > 0 ? `Survécu ✔ (${name}) : −${(tot / 2).toFixed(1)} ❤` : `Clutch réussi ✔ (${name}${C.used != null ? ` à ${C.used.toFixed(1)} blocs du sol` : ''})`, '#5dff7a'); }
  else if (tot >= 20) { st.dead++; st.fail++; G.hurtFx = 1; FP.sfx('death'); hitText(`Mort (${name})`, '#ff4d3d'); }
  else { st.fail++; G.hurtFx = 0.8; FP.sfx('hurt'); hitText(`Raté : −${(tot / 2).toFixed(1)} ❤ (chute de ${Math.round(fall)} blocs)`, '#ffa53d'); }
  st.dmg += Math.min(20, tot);
  C.log.push({ item: C.item, dmg: tot, used: C.used, ok });
}

// ================================================================ minage rapide (temps de casse de Minecraft)
// [dureté, outil efficace, niveau d'outil requis pour récolter (0 = à la main)]
const MINE = { dirt: [0.5, 'shovel', 0], grass: [0.6, 'shovel', 0], sand: [0.5, 'shovel', 0], gravel: [0.6, 'shovel', 0],
  log: [2, 'axe', 0], planks: [2, 'axe', 0], stone: [1.5, 'pickaxe', 1], cobblestone: [2, 'pickaxe', 1], bricks: [1.5, 'pickaxe', 1],
  coal_ore: [3, 'pickaxe', 1], iron_ore: [3, 'pickaxe', 2], gold_ore: [3, 'pickaxe', 3], diamond_ore: [3, 'pickaxe', 3], obsidian: [50, 'pickaxe', 4],
  leaves: [0.2, 'shears', 0], glass: [0.3, null, 0], wool_white: [0.8, 'shears', 0] };
const SHEARS = { leaves: 15, wool_white: 5 }; // vitesse des cisailles selon le bloc (Minecraft)
const MINE_NOM = { dirt: 'Terre', grass: 'Bloc d’herbe', sand: 'Sable', gravel: 'Gravier', log: 'Bûche', planks: 'Planches', stone: 'Pierre', cobblestone: 'Roche', bricks: 'Pierres taillées',
  coal_ore: 'Minerai de charbon', iron_ore: 'Minerai de fer', gold_ore: 'Minerai d’or', diamond_ore: 'Minerai de diamant', obsidian: 'Obsidienne', leaves: 'Feuilles', glass: 'Verre', wool_white: 'Laine' };
const TIER = { wood: 1, gold: 1, stone: 2, iron: 3, diamond: 4 }, TSPEED = { wood: 2, stone: 4, iron: 6, diamond: 8, gold: 12 };
const MTOOLS = ['pickaxe', 'axe', 'shovel', 'shears'];
const toolItem = (mat, t) => t === 'shears' ? 'shears' : mat + '_' + t;
FP.MINE = MINE;
// progression par tick = vitesse / dureté / (30 si récoltable, sinon 100) ; ÷5 en l'air et dans l'eau
function mineRate(type, tool, mat, eff, onGround) {
  const m = MINE[type]; if (!m) return 0;
  const good = m[1] && m[1] === tool;
  let sp = good ? (tool === 'shears' ? SHEARS[type] : TSPEED[mat]) : 1;
  if (good && eff > 0) sp += eff * eff + 1;
  const harvest = m[2] === 0 || (good && TIER[mat] >= m[2]);
  let r = sp / m[0] / (harvest ? 30 : 100);
  if (!onGround) r /= 5;
  return r;
}
FP.mineRate = mineRate;
function mineInit() {
  W.reset(true); R.setWorld('arena'); R.decorateArena();
  const cfg = G.cfg;
  G.mi = { mat: cfg.outils || 'iron', eff: clamp(cfg.efficacite | 0, 0, 5), total: INF(cfg.manches), done: 0, times: [], cells: new Set(), falling: [] };
  G.sel = 0; G.tool = 'pickaxe'; G.mt = null; G.mineDelay = 0;
  G.st = { broken: 0, goodTool: 0, ticks: 0, wrongTicks: 0 };
  mineStructure();
  R.setItem('sprite', FP.CRAFT.icon(G.mi.mat + '_pickaxe')); updateHotbar();
}
function mineStructure() {
  const d = G.D.d, M = G.mi, w = 3 + Math.round(3 * d), h = 2 + Math.round(2 * d), dep = 2 + Math.round(3 * d);
  for (const k of M.cells) W.blocks.delete(k); M.cells.clear();
  // matériaux : de plus en plus variés avec la difficulté
  const groups = [['dirt', 'grass', 'sand', 'gravel'], ['log', 'planks'], ['stone', 'cobblestone', 'bricks', 'coal_ore'], ['iron_ore', 'gold_ore', 'diamond_ore'], ['leaves', 'glass', 'wool_white']];
  const pool = groups[0].slice(0, 2).concat(groups[1].slice(0, 1), groups[2].slice(0, 1));
  if (d > 0.3) pool.push(...groups[0].slice(2), groups[1][1], groups[2][1], groups[4][0]);
  if (d > 0.55) pool.push(groups[2][2], groups[2][3], groups[4][1], groups[4][2], groups[3][0]);
  if (d > 0.8) pool.push(groups[3][1], groups[3][2]);
  if (d > 0.9 && M.mat === 'diamond') pool.push('obsidian');
  const x0 = -Math.floor(w / 2), z0 = 3;
  for (let x = 0; x < w; x++) for (let z = 0; z < dep; z++) for (let y = 0; y < h; y++) {
    // amas : un bloc ressemble souvent à son voisin du dessous
    const below = y > 0 ? W.blocks.get(W.key(x0 + x, y - 1, z0 + z)) : null;
    const t = below && Math.random() < 0.45 ? below : pool[(Math.random() * pool.length) | 0];
    const k = W.key(x0 + x, y, z0 + z); W.blocks.set(k, t); M.cells.add(k);
  }
  W.version++;
  Object.assign(G.p, { x: 0.5, y: 0, z: 0.5, px: 0.5, py: 0, pz: 0.5, vx: 0, vy: 0, vz: 0 });
  G.yaw = 0; G.pitch = 20; M.start = G.time; M.size = M.cells.size; G.mt = null;
}
function mineBreak(x, y, z) {
  const t = W.get(x, y, z), k = W.key(x, y, z);
  W.set(x, y, z, null); G.mi.cells.delete(k); G.st.broken++;
  FP.sfx('place'); R.burst('block', x + 0.5, y + 0.4, z + 0.5, { n: 12, color: blockColor(t) });
  // sable et gravier au-dessus : ils tombent (entité qui chute, gravité 0,04, frottement 0,98)
  for (let yy = y + 1; ; yy++) { const u = W.get(x, yy, z); if (u !== 'sand' && u !== 'gravel') break; W.blocks.delete(W.key(x, yy, z)); G.mi.cells.delete(W.key(x, yy, z)); G.mi.falling.push({ t: u, x, z, y: yy, vy: 0 }); }
  W.version++;
}
function mineTick() {
  const M = G.mi, p = G.p;
  // blocs qui tombent
  for (const f of M.falling) {
    f.vy = (f.vy - 0.04) * 0.98; const ny = f.y + f.vy, cell = Math.floor(ny);
    if (W.solid(f.x, cell, f.z) || cell < 0) { const yy = Math.floor(f.y + 0.5); const k = W.key(f.x, Math.max(0, yy), f.z); W.blocks.set(k, f.t); M.cells.add(k); f.done = true; W.version++; } else f.y = ny;
  }
  M.falling = M.falling.filter(f => !f.done);
  if (M.roundT > 0) { if (--M.roundT === 0) { if (M.done >= M.total) { G.endT = 1; G.endWin = true; } else mineStructure(); } G.crack = null; return; }
  G.st.ticks++;
  if (G.mineDelay > 0) G.mineDelay--;
  let target = null;
  if (G.lmb && !(G.mineDelay > 0)) {
    const hit = FP.rayBlock(eyePos(), FP.lookDir(G.yaw, G.pitch), 4.5);
    if (hit && M.cells.has(W.key(hit.x, hit.y, hit.z))) target = hit;
  }
  if (!target) { if (!G.lmb) G.mt = null; G.crack = null; }
  else {
    const k = W.key(target.x, target.y, target.z), type = W.get(target.x, target.y, target.z);
    if (!G.mt || G.mt.k !== k) G.mt = { k, x: target.x, y: target.y, z: target.z, prog: 0, ticks: 0 };
    const r = mineRate(type, G.tool, M.mat, M.eff, p.onGround), best = MINE[type][1];
    if (best && best !== G.tool) G.st.wrongTicks++;
    G.mt.prog += r; G.mt.ticks++;
    if (G.mt.ticks % 4 === 1) { R.swing(); FP.sfx('step'); }
    if (G.mt.prog >= 1) {
      const instant = G.mt.ticks === 1; mineBreak(target.x, target.y, target.z); G.mt = null; G.crack = null;
      if (!instant) G.mineDelay = 5; // 5 ticks d'attente après chaque bloc (sauf casse instantanée), comme Minecraft
      if (!M.cells.size && !M.falling.length) { const t = G.time - M.start; M.times.push(t); M.done++; FP.sfx('finish'); hitText(`Structure détruite en ${t.toFixed(2)} s`, '#5dff7a'); M.roundT = 30; }
    } else G.crack = { x: target.x, y: target.y, z: target.z, stage: Math.floor(G.mt.prog * 10) };
  }
}
function mineSelect(i) {
  const s = ((i % 4) + 4) % 4; if (s === G.sel) return;
  G.sel = s; G.tool = MTOOLS[s]; G.mt = null; // changer d'outil recommence le bloc en cours
  R.setItem('sprite', FP.CRAFT.icon(toolItem(G.mi.mat, G.tool))); updateHotbar(); FP.sfx('equip');
}

// ================================================================ parkour
// Chaque saut proposé est SIMULÉ avec la physique du jeu avant d'être accepté : un parcours est donc
// toujours faisable. La difficulté règle la marge d'erreur tolérée (sauter en avance), la taille des
// plateformes (blocs, dalles, têtes, pots, barreaux), les obstacles (murs à franchir, plafonds) et l'espacement.
const PK_COLS = ['wool_cyan', 'wool_lime', 'wool_orange', 'wool_purple', 'wool_yellow', 'wool_red'];
const FULL = [0, 0, 0, 1, 1, 1];
const platBox = c => { const sh = W.shape(c.type) || FULL; return [c.x + sh[0], c.y + sh[1], c.z + sh[2], c.x + sh[3], c.y + sh[4], c.z + sh[5]]; };
function simJump(fb, tb, early, standing, sprint) {
  const e = FP.makeEnt(0, 0, 0);
  const fc = [(fb[0] + fb[3]) / 2, (fb[2] + fb[5]) / 2], tc = [(tb[0] + tb[3]) / 2, (tb[2] + tb[5]) / 2];
  let dx = tc[0] - fc[0], dz = tc[1] - fc[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
  const reach = (sx, sz) => { // jusqu'où le centre du joueur peut aller en restant sur la plateforme
    let t = Infinity; const m = 0.29;
    if (Math.abs(sx) > 1e-6) t = Math.min(t, (sx > 0 ? fb[3] + m - fc[0] : fc[0] - (fb[0] - m)) / Math.abs(sx));
    if (Math.abs(sz) > 1e-6) t = Math.min(t, (sz > 0 ? fb[5] + m - fc[1] : fc[1] - (fb[2] - m)) / Math.abs(sz));
    return t;
  };
  const tmax = reach(dx, dz), top = fb[4], tTop = tb[4];
  let jumpAt;
  if (standing) { const tb0 = reach(-dx, -dz); e.x = fc[0] - dx * tb0; e.z = fc[1] - dz * tb0; jumpAt = tmax - early - (sprint ? 0.28 : 0.216); }
  else { const v0 = sprint ? 0.153 : 0.118, t0 = tmax - early - (sprint ? 0.28 : 0.216); e.x = fc[0] + dx * t0; e.z = fc[1] + dz * t0; e.vx = dx * v0; e.vz = dz * v0; e.sprinting = sprint; e.sent = sprint; jumpAt = -Infinity; }
  e.y = top; e.onGround = true; e.vy = -0.0784; // posé au sol (sinon le premier tick ne détecte pas le contact)
  let jumped = false;
  for (let t = 0; t < 70; t++) {
    const ddx = tc[0] - e.x, ddz = tc[1] - e.z, dist = Math.hypot(ddx, ddz);
    e.yaw = Math.atan2(-ddx, ddz) / DEG;
    const along = (e.x - fc[0]) * dx + (e.z - fc[1]) * dz;
    e.input.s = 0; e.input.sneak = false;
    if (!jumped) { e.input.f = 1; e.input.jump = e.onGround && along >= jumpAt; if (e.input.jump) jumped = true; }
    else { const v = Math.hypot(e.vx, e.vz); e.input.f = dist < v * 0.91 / 0.09 * 0.55 ? -1 : 1; e.input.jump = false; }
    FP.updateSprint(e, sprint);
    FP.stepEnt(e, t + 1);
    if (FP.touchDanger(e)) return false;
    if (jumped && e.onGround && t > 0) {
      const b = FP.entBox(e, 0);
      return Math.abs(e.y - tTop) < 1e-6 && b[0] < tb[3] && b[3] > tb[0] && b[2] < tb[5] && b[5] > tb[2];
    }
    if (!jumped && (t > 45 || !e.onGround)) return false;
    if (e.y < Math.min(top, tTop) - 3) return false;
  }
  return false;
}
function pkInit() {
  W.reset(false); R.setWorld('void');
  const cfg = G.cfg, D = G.D;
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) W.set(x, -1, z, 'bricks');
  G.pk = { r: FP.rng((cfg.seed | 0) * 7919 + Math.round(cfg.diff) * 131 + 17), cx: 0, cy: -1, cz: 1, dir: [0, 1], turnSide: 1, i: 0, d: D.d,
    total: INF(cfg.sauts), path: [], index: new Map(), finished: false, every: Math.max(1, cfg.cp | 0),
    last: { box: [-1, -1, -1, 2, 0, 2], cell: { x: 0, y: -1, z: 0 }, start: true }, vols: [] };
  G.pk.state = FP.Plan.rest(G.pk.last.box, 0);
  G.cps = [{ x: 0.5, y: 0, z: 0.5, yaw: 0, idx: -1 }]; G.cpIdx = 0; G.progress = -1; G.lastY = 0;
  G.st = { falls: 0, deaths: 0, skips: 0 }; G.runStart = null; G.best = -1;
  while (G.pk.i < Math.min(G.pk.total, 25)) pkGenOne();
  pkRespawn(true);
}
function pkGenOne(depth) {
  const P = G.pk, r = P.r, d = P.d, from = P.last;
  const snap = { state: P.state, last: P.last, cx: P.cx, cy: P.cy, cz: P.cz, dir: P.dir.slice(), turnSide: P.turnSide, lastDir: P.lastDir, cps: G.cps.length };
  const simple = P.simple; P.simple = 0;
  if (P.i > 0 && P.i % 7 === 0) { P.dir = P.turnSide > 0 ? [P.dir[1], -P.dir[0]] : [-P.dir[1], P.dir[0]]; P.turnSide = -P.turnSide; }
  const last = P.i === P.total - 1, isCp = (P.i + 1) % P.every === 0 && !last;
  const near = (x, y, z) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -2; dy <= 3; dy++) for (let dz = -1; dz <= 1; dz++) if (W.blocks.has(W.key(x + dx, y + dy, z + dz))) return true; return false; };
  // un nouveau bloc ne doit jamais entrer dans (ni toucher) la trajectoire d'un saut déjà validé
  // (y compris jusqu'à 1 bloc en dessous : accroupi, Minecraft laisse descendre d'un bord s'il y a un sol à moins d'un bloc)
  const m = 0.05, inFlight = c => P.vols.some(v => v.some(b => c.x + 1 > b[0] - m && c.x < b[3] + m && c.y + 1 > b[1] - 1.05 && c.y < b[4] + m && c.z + 1 > b[2] - m && c.z < b[5] + m));
  const smallP = simple ? 0 : clamp((d - 0.1) / 0.9, 0, 1) * 0.85, obstP = simple ? 0 : clamp((d - 0.15) / 0.85, 0, 1) * 0.95;
  const cands = [];
  let st0 = P.state;
  const evaluate = (cell, obst) => {
    if (inFlight(cell) || obst.some(inFlight)) return null;
    const ty = cell.type === 'full' ? 'stone' : cell.type;
    W.blocks.set(W.key(cell.x, cell.y, cell.z), ty); obst.forEach(o => W.blocks.set(W.key(o.x, o.y, o.z), 'danger'));
    const tb = platBox(cell);
    // 1) faisable pour de vrai depuis l'état exact où l'on arrive sur la plateforme précédente, sans toucher d'obstacle
    let plan = FP.Plan.jump(st0, from.box, tb), restPlan = null;
    // ... et une fois posé, on peut toujours s'arrêter sans glisser dans un obstacle
    if (plan && !FP.Plan.settle(plan.end, tb)) plan = null;
    // après un checkpoint, le saut doit aussi marcher en partant arrêté (réapparition après une chute)
    if (plan && from.cp && !(restPlan = FP.Plan.jump(FP.Plan.rest(from.box, from.yaw || 0), from.box, tb))) plan = null;
    // 2) marge d'erreur (en partant avec un élan idéal) : sert à doser la difficulté
    let tol = -1;
    if (plan) {
      tol = 0;
      for (const spr of [true, false]) {
        if (!simJump(from.box, tb, 0, false, spr)) continue;
        let t0 = 0; for (const e of [0.12, 0.25, 0.4, 0.6, 0.85]) { if (simJump(from.box, tb, e, false, spr)) t0 = e; else break; }
        tol = Math.max(tol, t0);
      }
    }
    W.blocks.delete(W.key(cell.x, cell.y, cell.z)); obst.forEach(o => W.blocks.delete(W.key(o.x, o.y, o.z)));
    return plan ? { plan, tol, restPlan } : null;
  };
  const gather = () => { for (let tries = 0; tries < 40 && cands.length < 8; tries++) {
    let type = 'full';
    if (!isCp && r() < smallP) { const o = ['slab']; if (d > 0.35) o.push('head'); if (d > 0.5) o.push('pot'); if (d > 0.7) o.push('pane'); type = o[(r() * o.length) | 0]; }
    const fwd = 2 + Math.floor(r() * (2 + 4.5 * d));
    const latMax = d > 0.55 ? 2 : d > 0.2 ? 1 : 0, lat = latMax ? Math.round((r() * 2 - 1) * latMax) : 0;
    const rr = r(), up = 0.22 + 0.12 * d, dy = rr < up ? 1 : rr < up + 0.2 ? -1 : (rr < up + 0.28 && d > 0.5) ? -2 : 0;
    const cell = { x: P.cx + P.dir[0] * fwd - P.dir[1] * lat, y: P.cy + dy, z: P.cz + P.dir[1] * fwd + P.dir[0] * lat, type };
    if (cell.y > 14 || cell.y < -12 || near(cell.x, cell.y, cell.z)) continue;
    // obstacles rouges (mortels au contact) : mur à sauter au milieu, couloir étroit, mur derrière ou à côté de l'arrivée
    const obst = [];
    if (!from.start) {
      const ft = Math.floor(from.box[4] - 1e-6), cb = platBox(cell), feet = Math.floor(cb[4]);
      const mx = Math.round(((from.box[0] + from.box[3]) / 2 + (cell.x + 0.5)) / 2 - 0.5), mz = Math.round(((from.box[2] + from.box[5]) / 2 + (cell.z + 0.5)) / 2 - 0.5);
      const px = -P.dir[1], pz = P.dir[0], midFree = !(mx === cell.x && mz === cell.z) && !(mx === from.cell.x && mz === from.cell.z);
      const nObst = r() < obstP ? (d > 0.7 && r() < (d - 0.7) * 2.5 ? 2 : 1) : 0, kinds = new Set();
      for (let n = 0; n < nObst; n++) {
        const k = r();
        if (k < 0.32 && fwd >= 3 && midFree && !kinds.has('mur')) { kinds.add('mur'); obst.push({ x: mx, y: ft + 1, z: mz }); if (d > 0.6 && r() < 0.5) obst.push({ x: mx + px, y: ft + 1, z: mz + pz }, { x: mx - px, y: ft + 1, z: mz - pz }); }
        else if (k < 0.55 && fwd >= 3 && !kinds.has('couloir')) { kinds.add('couloir'); for (const s of [1, -1]) for (const hy of [1, 2]) obst.push({ x: mx + px * s, y: ft + hy, z: mz + pz * s }); }
        else if (k < 0.8 && (P.i + 1) % 7 === 0 && !kinds.has('fond')) { kinds.add('fond'); /* mur derrière l'arrivée : seulement avant un virage, sinon il bloquerait la suite */ obst.push({ x: cell.x + P.dir[0], y: feet, z: cell.z + P.dir[1] }); if (r() < 0.5) obst.push({ x: cell.x + P.dir[0], y: feet + 1, z: cell.z + P.dir[1] }); }
        else if (!kinds.has('cote')) { kinds.add('cote'); const s = r() < 0.5 ? 1 : -1; obst.push({ x: cell.x + px * s, y: feet, z: cell.z + pz * s }); }
      }
    }
    if (obst.some(o => W.blocks.has(W.key(o.x, o.y, o.z)) || (o.x === cell.x && o.y === cell.y && o.z === cell.z))) continue;
    const res = evaluate(cell, obst);
    if (res) cands.push({ cell, obst, tol: res.tol, plan: res.plan, restPlan: res.restPlan, fwd, st0 });
  } };
  gather();
  // rien de faisable avec l'élan d'arrivée : on cherche un saut faisable en partant arrêté au centre
  // (c'est exactement ce que fait le mode regarder quand il ne trouve pas de solution : il se recentre)

  // choix : facile = grande marge d'erreur ; difficile = marge minime et sauts longs (parfois presque impossibles)
  let pick = null;
  if (cands.length) {
    const hTarget = d > 0.7 && r() < (d - 0.7) * 2.5 ? 1 : clamp(d * 1.15 + (r() - 0.5) * 0.3, 0, 1);
    let bestS = Infinity;
    for (const c of cands) {
      const hard = 1 - c.tol / 0.85;
      const s = Math.abs(hard - hTarget) - (d > 0.5 ? c.fwd * 0.03 + c.obst.length * 0.06 : 0) + (c.obst.length && d < 0.3 ? 1 : 0);
      if (s < bestS) { bestS = s; pick = c; }
    }
  } else {
    P.fallbacks = (P.fallbacks || 0) + 1;
    // secours : un saut simple, tout droit ou en tournant, plus ou moins loin / haut
    const dirs = [P.dir, [P.dir[1], -P.dir[0]], [-P.dir[1], P.dir[0]]];
    search: for (const dv of dirs) for (const f of [2, 3, 1, 4]) for (const dy of [0, -1, 1]) {
      const cell = { x: P.cx + dv[0] * f, y: P.cy + dy, z: P.cz + dv[1] * f, type: 'full' };
      if (W.blocks.has(W.key(cell.x, cell.y, cell.z)) || W.blocks.has(W.key(cell.x, cell.y + 1, cell.z)) || W.blocks.has(W.key(cell.x, cell.y + 2, cell.z))) continue;
      const res = evaluate(cell, []);
      if (res) { pick = { cell, obst: [], plan: res.plan, restPlan: res.restPlan, st0 }; if (dv !== P.dir) P.dir = dv; break search; }
    }
    if (!pick) {
      // impasse : on refait le saut précédent autrement (sans obstacle ni petite plateforme), puis on repart
      const prev = P.path[P.path.length - 1];
      if (prev && prev.snap && (prev.retry || 0) < 4 && (depth || 0) < 6 && G.progress < P.i - 1) {
        W.blocks.delete(W.key(prev.x, prev.y, prev.z)); prev.obst.forEach(o => W.blocks.delete(W.key(o.x, o.y, o.z))); W.version++;
        P.index.delete(W.key(prev.x, prev.y, prev.z)); P.path.pop();
        for (let k = 0; k < prev.nVols; k++) P.vols.pop();
        Object.assign(P, { state: prev.snap.state, last: prev.snap.last, cx: prev.snap.cx, cy: prev.snap.cy, cz: prev.snap.cz, dir: prev.snap.dir, turnSide: prev.snap.turnSide, lastDir: prev.snap.lastDir });
        G.cps.length = prev.snap.cps; P.i--; P.simple = 1; P.retry = (prev.retry || 0) + 1;
        pkGenOne((depth || 0) + 1);
        return pkGenOne((depth || 0) + 1);
      }
      pick = { cell: { x: P.cx + P.dir[0], y: P.cy, z: P.cz + P.dir[1], type: 'full' }, obst: [], plan: null };
    }
  }
  const c = pick.cell, type = isCp ? 'gold' : c.type === 'full' ? PK_COLS[(P.i / 3 | 0) % PK_COLS.length] : c.type;
  W.set(c.x, c.y, c.z, type); pick.obst.forEach(o => W.set(o.x, o.y, o.z, 'danger'));
  // le plan vérifié est gardé : le mode regarder le rejoue à l'identique tant qu'il est exactement dans l'état prévu
  const entry = { x: c.x, y: c.y, z: c.z, cp: isCp, obst: pick.obst, st0: pick.plan ? pick.st0 : null, snap, retry: P.retry || 0, nVols: pick.plan ? (pick.restPlan ? 2 : 1) : 0,
    plan: pick.plan || null, restPlan: pick.restPlan || null, restSt: pick.restPlan ? FP.Plan.rest(from.box, from.yaw || 0) : null };
  P.retry = 0;
  P.path.push(entry); P.index.set(W.key(c.x, c.y, c.z), P.i);
  if (isCp) G.cps.push({ x: c.x + 0.5, y: c.y + 1, z: c.z + 0.5, yaw: Math.atan2(-P.dir[0], P.dir[1]) / DEG, idx: P.i });
  const nb = platBox({ x: c.x, y: c.y, z: c.z, type }), ld = [(nb[0] + nb[3]) / 2 - (from.box[0] + from.box[3]) / 2, (nb[2] + nb[5]) / 2 - (from.box[2] + from.box[5]) / 2], ll = Math.hypot(ld[0], ld[1]) || 1;
  P.lastDir = [ld[0] / ll, ld[1] / ll];
  P.last = { box: nb, cell: c, cp: isCp, yaw: isCp ? G.cps[G.cps.length - 1].yaw : 0 };
  if (pick.plan) { P.vols.push(pick.plan.boxes); if (pick.restPlan) P.vols.push(pick.restPlan.boxes); while (P.vols.length > 120) P.vols.shift(); }
  // après un checkpoint on repart arrêté (comme après une chute) ; sinon avec l'élan réel de l'atterrissage
  P.state = !pick.plan ? FP.Plan.rest(nb, Math.atan2(-P.dir[0], P.dir[1]) / DEG) : pick.plan.end;
  P.cx = c.x; P.cy = c.y; P.cz = c.z; P.i++;
  if (P.i === P.total) {
    const top = Math.floor(P.last.box[4] - 1e-6), fx = P.cx + P.dir[0] * 3, fz = P.cz + P.dir[1] * 3;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) W.set(fx + a, top, fz + b, 'emerald');
    P.finishBox = [fx - 1, top, fz - 1, fx + 2, top + 1, fz + 2];
    P.finished = true;
  }
}
function pkRespawn(first, why) {
  const c = G.cps[G.cpIdx], p = G.p;
  G.progress = c.idx; // on reprend au checkpoint : impossible ensuite de sauter des étapes
  // état exactement identique à celui supposé par le générateur (FP.Plan.rest)
  Object.assign(p, FP.Plan.rest([c.x - 0.5, c.y - 1, c.z - 0.5, c.x + 0.5, c.y, c.z + 0.5], c.yaw), { px: c.x, py: c.y, pz: c.z });
  G.yaw = c.yaw; G.pitch = 20; G.lastY = c.y; G.ai = null;
  if (first) return;
  if (why === 'danger') { G.st.deaths++; FP.sfx('death'); G.hurtFx = 1; hitText('Obstacle rouge touché !', '#ff4d3d'); }
  else if (why === 'skip') { G.st.skips++; FP.sfx('bad'); G.hurtFx = 0.6; hitText('Étape sautée : il faut passer par tous les blocs', '#ffa53d'); }
  else { G.st.falls++; FP.sfx('fall'); G.hurtFx = 0.5; }
}
function parkourTick() {
  const p = G.p, P = G.pk;
  if (G.runStart == null && (Math.hypot(p.x - 0.5, p.z - 0.5) > 1.3 || p.jumpTick > 0)) G.runStart = G.time;
  if (p.y < Math.min(G.cps[G.cpIdx].y, G.lastY) - 9) { pkRespawn(false); return; }
  if (FP.touchDanger(p)) { R.burst('hit', p.x, p.y + 1, p.z, { n: 14, color: '#ff3b2f' }); pkRespawn(false, 'danger'); return; }
  if (!p.onGround) return;
  // bloc du parcours sous les pieds (le joueur peut déborder sur les bords)
  const by = Math.floor(p.y - 0.01);
  let idx = null, under = null;
  for (const [ox, oz] of [[0, 0], [-0.29, -0.29], [0.29, -0.29], [-0.29, 0.29], [0.29, 0.29]]) {
    const bx = Math.floor(p.x + ox), bz = Math.floor(p.z + oz), i = P.index.get(W.key(bx, by, bz));
    if (i != null && (idx == null || i > idx)) idx = i;
    if (W.get(bx, by, bz) === 'emerald') under = 'emerald';
  }
  // on peut sauter des étapes : la progression est le bloc le plus loin atteint
  if (idx != null && idx > G.progress) {
    G.progress = idx; G.best = Math.max(G.best, idx); G.lastY = p.y;
    if (!P.finished && P.i - G.progress < 15) { for (let k = 0; k < 12 && !P.finished; k++) pkGenOne(); }
    if (P.path[idx].cp) {
      const ci = G.cps.findIndex(c => c.idx === idx);
      if (ci > G.cpIdx) { G.cpIdx = ci; FP.sfx('checkpoint'); hitText(`Checkpoint ${ci}`, '#ffe14d'); R.burst('totem', p.x, p.y, p.z, { n: 24 }); }
    }
    // parcours infini : on retire les blocs trop loin derrière
    if (P.total === Infinity) for (let j = Math.max(0, G.progress - 60); j < G.progress - 40; j++) {
      const q = P.path[j]; if (q && !q.gone) { W.blocks.delete(W.key(q.x, q.y, q.z)); q.obst.forEach(o => W.blocks.delete(W.key(o.x, o.y, o.z))); q.gone = true; W.version++; }
    }
  }
  if (under === 'emerald' && !G.endT) {
    G.finalTime = G.time - (G.runStart || 0); FP.sfx('finish'); R.burst('confetti', p.x, p.y, p.z, { n: 80 }); G.endT = 20; G.endWin = true;
  }
}

// ================================================================ clics
const hbExpand = () => G.combat ? 0.1 : (S.hitbox18 && G.id === 'flick' ? 0.1 : 0);
// en mode regarder, l'ordinateur vise avec les positions physiques exactes (pas celles interpolées pour l'affichage)
const eyePos = () => G.auto ? [G.p.x, G.p.y + (G.p.sneaking ? 1.27 : 1.62), G.p.z] : G.eye;
function aimEnt(max) {
  const d = FP.lookDir(G.yaw, G.pitch), ex = hbExpand(), eye = eyePos(); let best = null, bt = max;
  for (const e of G.ents) { if (e.dead || e.respawnT > 0) continue; const t = FP.rayBox(eye, d, FP.entBox(e, ex, !G.auto)); if (t <= bt) { bt = t; best = e; } }
  return best;
}
const aimHit = (e, max) => e && !e.dead && FP.rayBox(eyePos(), FP.lookDir(G.yaw, G.pitch), FP.entBox(e, hbExpand(), !G.auto)) <= max;
function onClick(btn) {
  if (G.cd > 0 || G.ended || G.endT) return;
  if (btn === 0) {
    G.lmb = true; G.lmbTimer = 0;
    if (G.id === 'flick') {
      R.swing();
      if (aimHit(G.o, 60)) {
        G.st.times.push(performance.now() - G.tSpawn); G.st.n++;
        R.burstAt('crit', G.o, 1.1, { n: 14 }); R.burstAt('smoke', G.o, 0.2, { n: 8 }); FP.sfx('hit');
        if (G.st.n >= G.st.total) endGame(); else spawnFlick();
      } else { G.st.miss++; FP.sfx('bad'); }
    } else if (G.combat) G.queue.push(aimEnt(3));
    else if (G.id === 'targets') {
      if (G.weapon === 'sword') { R.swing(); FP.sfx('swing'); G.st.swings++; G.p.sinceSwing = 0; targetHit(aimEnt(3), 'sword'); }
    }
    else if (G.id === 'build') buildBreak();
    else if (G.id === 'course' || G.id === 'vent' || G.id === 'foret') courseBreak();
    else if (G.id === 'clutch') clutchAttack();
    else if (G.id === 'minage') { /* maintenir le clic gauche pour casser (géré à chaque tick) */ }
    else R.swing();
  } else if (btn === 2) {
    G.rmb = true; G.rmbTimer = 0;
    if (G.id === 'bridge') tryPlace();
    if (G.id === 'course' || G.id === 'vent' || G.id === 'foret') coursePlace();
    if (G.id === 'clutch') clutchUse();
    if (G.id === 'targets' && G.weapon === 'xbow' && G.xLoaded) fireXbow();
    if (G.id === 'build' && !G.roundT) buildPlace();
  }
}
function onRightUp() {
  if (!G) return;
  G.rmb = false;
  if (G.ended || G.cd > 0) return;
  if (G.id === 'targets' && G.weapon === 'bow') shootArrow();
  if (G.id === 'targets' && G.weapon === 'xbow') {
    if (!G.xLoaded && G.xCharge >= G.xNeed) { G.xLoaded = true; FP.sfx('xloaded'); updateHotbar(); }
    G.xCharge = 0;
  }
}

// ================================================================ HUD
const $ = FP.$;
function updateHotbar() {
  const slots = { duel18: ['sword'], flick: ['sword'], bridge: ['wool_' + G.cfg.couleur], course: ['wool_' + G.cfg.couleur], bateau: [], clutch: G.cl ? clutchItems() : [], minage: G.mi ? MTOOLS.map(t => toolItem(G.mi.mat, t)) : [], vent: ['wool_' + G.cfg.couleur], foret: ['wool_' + (G.cfg.couleur || 'blue')], parkour: [], dodge: [], build: G.palette || [],
    targets: ['sword', 'bow', G.xLoaded ? 'crossbow_loaded' : 'crossbow', 'arrow'] }[G.id] || [];
  const sel = G.id === 'build' || G.id === 'targets' || G.id === 'minage' ? G.sel : G.id === 'clutch' && G.cl ? G.cl.slot : 0;
  const ic = n => FP.CRAFT && FP.CRAFT.has(n) ? FP.CRAFT.icon(n) : FP.TX.icon(n);
  $('#hotbar').innerHTML = Array.from({ length: 9 }, (_, i) => `<div class="hb${i === sel ? ' sel' : ''}">${slots[i] ? `<img src="${ic(slots[i])}" alt="">${slots[i] === 'arrow' || slots[i].startsWith('wool') || G.id === 'build' ? '<span>∞</span>' : ''}` : ''}${(G.id === 'build' || ((G.id === 'targets' && i < 3) || (G.id === 'minage' && i < 4))) && slots[i] ? `<em>${i + 1}</em>` : ''}</div>`).join('');
  $('#hearts').hidden = true; $('#armorbar').hidden = true; $('#cooldown').hidden = !(G.combat && G.modern);
}
function cpsNow() { const t = performance.now(); while (G.clickTimes.length && t - G.clickTimes[0] > 1000) G.clickTimes.shift(); return G.clickTimes.length; }
const fmtT = s => s >= 60 ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : Math.floor(s) + ' s';
function updateHud() {
  const st = G.st, m = FP.modeById(G.id), cfg = G.cfg;
  let main = '', side = '';
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  if (G.combat) {
    const kbAvg = st.kb.length ? st.kb.reduce((a, b) => a + b, 0) / st.kb.length : 0;
    main = `Coups <b>${st.hits}</b>${G.attack ? ` — reçus <b>${st.taken}</b>` : ''}${isFinite(G.goal) ? ` <span class="dim">(premier à ${G.goal})</span>` : ''} · `
      + (G.dmgMode ? `Dégâts <b>${st.dmg.toFixed(1)}</b> (${(st.dmg / 2).toFixed(1)} ❤) · <b>${(st.dmg / Math.max(1, G.time)).toFixed(1)}</b>/s` : `Recul moyen <b>${kbAvg.toFixed(2)}</b> blocs`);
    side = `${G.modern ? `Charge moy. ${st.swings ? Math.round(st.strSum / st.swings * 100) : 0} % · Crits ${st.crits} · Faibles ${st.weak} · ` : ''}Combo ${st.combo} (max ${st.maxCombo}) · CPS ${cpsNow()} · Sprint serveur <b class="${G.p.srv ? 'ok' : 'ko'}">${G.p.srv ? 'OUI' : 'NON'}</b>`;
  } else if (G.id === 'flick') { main = `Cible <b>${st.n + 1}${isFinite(st.total) ? '/' + st.total : ''}</b>`; side = `Moyenne ${Math.round(avg(st.times))} ms · Ratés ${st.miss}`; }
  else if (G.id === 'dodge') {
    const streak = G.tick / 20 - G.lastHit;
    main = `Reçues <b>${st.taken}</b>${isFinite(G.lives) ? '/' + G.lives : ''} · Évitées <b>${st.avoided}</b> · Esquives serrées <b>${st.dodged}</b>`;
    side = `Sans être touché : <b>${streak.toFixed(1)} s</b> (meilleur ${Math.max(st.best, streak).toFixed(1)} s) · Flèches tirées ${st.incoming}`;
  } else if (G.id === 'targets') {
    const rt = G.roundT > 0 ? (G.st.times[G.st.times.length - 1] || 0) : G.time - G.roundStart;
    main = `Manche <b>${Math.min(st.done + 1, G.goalRounds)}${isFinite(G.goalRounds) ? '/' + G.goalRounds : ''}</b> · Cibles <b>${G.total - G.left}/${G.total}</b> · <b>${rt.toFixed(2)} s</b>${G.roundT > 0 ? ' <span class="dim">(manche suivante…)</span>' : ''}`;
    const xs = G.xLoaded ? '<b class="ok">chargée</b>' : G.xCharge ? `charge ${Math.min(100, Math.round(G.xCharge / G.xNeed * 100))} %` : 'vide';
    side = `<b>${WNAME[G.weapon]}</b>${G.weapon === 'bow' && G.rmb ? ' ' + Math.round(G.bowPull * 100) + ' %' : ''}${G.weapon === 'xbow' ? ' ' + xs : ' · Arbalète ' + xs} · touches 1 épée · 2 arc · 3 arbalète`;
  }
  else if (G.id === 'build') { main = `Construction <b>${st.done + 1}${isFinite(G.goalRounds) ? '/' + G.goalRounds : ''}</b> · <b>${(G.time - G.roundStart).toFixed(1)} s</b>`; side = `Exactitude ${Math.round(G.buildAcc * 100)} % · Bloc : ${G.sel + 1} (touches 1–${G.palette.length})`; }
  else if (G.id === 'bridge') {
    const g = G.goal, d = Math.max(0, Math.hypot(g.x + 0.5 - G.p.x, g.z + 0.5 - G.p.z) - 1.5);
    main = G.runStart != null ? `Chrono <b>${(G.time - G.runStart).toFixed(2)} s</b>` : 'Pose un bloc pour lancer le chrono';
    const tech = G.auto && G.ai && G.ai.tech ? ` · Technique : <b>${{ telly: 'telly bridge', moonwalk: 'moonwalk' }[G.ai.tech] || G.ai.tech}</b>` : '';
    side = `Reste ${Math.ceil(d)} blocs${g.y ? ` (hauteur ${g.y > 0 ? '+' : ''}${g.y} : ${Math.round(g.y - G.p.y)} à faire)` : ''} · Traversées ${st.times.length}${isFinite(G.goalCross) ? '/' + G.goalCross : ''} · Chutes ${st.falls}${tech}`;
  } else if (G.id === 'clutch') {
    const C = G.cl, h = clutchHeight();
    main = `Chute <b>${C.round}${isFinite(C.total) ? '/' + C.total : ''}</b> · Réussis <b>${st.ok}</b> · Ratés <b>${st.fail}</b>${C.state === 'stand' ? ' · <span class="ok">saute du pilier !</span>' : ''}`;
    side = `Objet : <b>${CLUTCH[C.item][0]}</b> · Hauteur <b>${Math.max(0, h).toFixed(1)}</b> blocs · Chute ${G.p.fall.toFixed(1)}${C.dmg ? ' · dégâts ' + (C.dmg / 2).toFixed(1) + ' ❤' : ''}${C.item === 'water' ? ' · ' + (C.bucket === 'water_bucket' ? 'seau plein' : 'seau vide (clic droit sur l’eau pour la reprendre)') : ''}${C.item === 'tnt' ? ' · ' + (C.slot ? 'briquet' : 'TNT') + ' en main (touches 1-2)' + (G.tnts.length ? ` · mèche ${(G.tnts[0].fuse / 20).toFixed(1)} s` : '') : ''}`;
  } else if (G.id === 'minage') {
    const M = G.mi, tg = G.mt ? W.get(G.mt.x, G.mt.y, G.mt.z) : null, best = tg && MINE[tg] ? MINE[tg][1] : null;
    main = `Structure <b>${Math.min(M.done + 1, M.total)}${isFinite(M.total) ? '/' + M.total : ''}</b> · <b>${(M.roundT > 0 ? M.times[M.times.length - 1] || 0 : G.time - M.start).toFixed(2)} s</b> · Restent <b>${M.cells.size}</b> blocs`;
    side = tg ? `${MINE_NOM[tg] || tg} ${Math.round(G.mt.prog * 100)} % · outil ${best ? ({ pickaxe: 'pioche', axe: 'hache', shovel: 'pelle', shears: 'cisailles' }[best]) : 'quelconque'} ${!best || best === G.tool ? '<b class="ok">✔</b>' : '<b class="ko">✘ mauvais outil</b>'}${G.p.onGround ? '' : ' · <b class="ko">en l’air : ×5 plus lent</b>'}` : `Touches 1 pioche · 2 hache · 3 pelle · 4 cisailles · maintiens le clic gauche`;
  } else if (G.id === 'bateau') {
    const R2 = G.race, b = G.boat, sp = Math.hypot(b.vx, b.vz) * 20, best = R2.times.length ? Math.min(...R2.times) : null;
    const tot = G.finalTime != null ? G.finalTime : G.runStart != null ? G.time - G.runStart : 0;
    main = `Tour <b>${Math.min(R2.lap + 1, R2.laps)}/${R2.laps}</b> · Chrono <b>${tot.toFixed(2)} s</b>${G.finalTime != null ? ' ✔' : ''} · <b>${sp.toFixed(1)}</b> blocs/s`;
    side = `Tour en cours ${G.finalTime != null || R2.lapStart == null ? '—' : (G.time - R2.lapStart).toFixed(2) + ' s'} · Meilleur tour ${best != null ? best.toFixed(2) + ' s' : '—'} · Murs touchés ${st.hits}`;
  } else if (G.id === 'foret') {
    const F = G.fo, tg = F.leg === 0 ? F.fin : F.start, d = Math.max(0, Math.hypot(G.p.x - tg[0], G.p.z - tg[1]) - 2);
    main = G.finalTime != null ? `Chrono <b>${G.finalTime.toFixed(2)} s</b> ✔` : G.runStart != null ? `Chrono <b>${(G.time - G.runStart).toFixed(2)} s</b>` : 'Le chrono part dès que tu bouges';
    side = `${F.leg === 0 ? 'Aller : demi-tour' : 'Retour : arrivée'} à <b>${Math.ceil(d)}</b> blocs${F.half != null ? ` (demi-tour en ${F.half.toFixed(2)} s)` : ''} · Vitesse ${(Math.hypot(G.p.x - G.p.px, G.p.z - G.p.pz) * 20).toFixed(1)} blocs/s`;
  } else if (G.id === 'vent') {
    const V = G.vt, g = V.gust;
    main = `Distance <b>${V.maxZ.toFixed(1)}</b> blocs · Meilleure <b>${Math.max(V.best, V.maxZ).toFixed(1)}</b> · Essai ${Math.min(V.tries + 1, G.goalTries)}${isFinite(G.goalTries) ? '/' + G.goalTries : ''}`;
    side = `Recul des coups : niveau ${ventLevel()}${g ? (g.t < 0 ? ` · <b class="ko">coup ${g.dir > 0 ? '→' : '←'} dans ${(-g.t / 20).toFixed(1)} s</b>` : ` · <b class="ko">COUP ${g.dir > 0 ? '→' : '←'}</b>`) : ''} · Blocs posés ${st.placed}`;
  } else if (G.id === 'course') {
    const C = G.course;
    main = G.finalTime != null ? `Chrono <b>${G.finalTime.toFixed(2)} s</b> ✔` : G.runStart != null ? `Chrono <b>${(G.time - G.runStart).toFixed(2)} s</b>` : 'Le chrono part dès que tu quittes le départ';
    const dz = Math.max(0, Math.round(C.finishBox[2] - G.p.z));
    side = `Arrivée (émeraude) à ${dz} blocs · Blocs posés ${st.placed} · Chutes ${st.falls}`;
  } else if (G.id === 'parkour') {
    main = G.finalTime != null ? `Chrono <b>${G.finalTime.toFixed(2)} s</b> ✔` : G.runStart != null ? `Chrono <b>${(G.time - G.runStart).toFixed(2)} s</b>` : 'Le chrono part au premier saut';
    side = `Saut ${G.progress + 1}${isFinite(G.pk.total) ? '/' + G.pk.total : ' (infini)'} · Checkpoint ${G.cpIdx} · Chutes ${st.falls} · Obstacles touchés ${st.deaths}`;
  }
  const df = cfg.diff != null ? ` · ${cfg.diff} %` : '';
  $('#hud-info').innerHTML = `<div class="hud-mode">${m.nom}${df}${G.auto ? ' · 👁 l’ordinateur joue' : ''}</div><div>${main}</div><div class="dim">${side}</div>`;
  $('#hud-timer').textContent = G.dur ? fmtT(Math.max(0, G.dur - G.time)) : '∞ ' + fmtT(G.time);
  $('#hud-sub').innerHTML = G.hitTexts.map(h => `<div style="color:${h.col};opacity:${clamp(h.t * 2, 0, 1)}">${h.txt}</div>`).join('');
  if (G.combat && G.modern) {
    const cdEl = $('#cooldown'), str = clamp((G.p.sinceSwing + G.acc / 0.05 + 0.5) / 12.5, 0, 1);
    cdEl.firstElementChild.style.width = (str * 100) + '%'; cdEl.classList.toggle('done', str >= 1); cdEl.classList.toggle('full', str >= 1 && !!aimEnt(3));
  }
  $('#vignette').style.opacity = G.hurtFx * 0.85;
  shooterIndicators();
  const cd = $('#hud-center');
  if (G.cd > 0 && G.running) { const n = Math.ceil(G.cd); if (cd.dataset.n !== String(n)) { cd.dataset.n = n; cd.textContent = n; cd.classList.remove('pop'); void cd.offsetWidth; cd.classList.add('pop'); } }
  else if (G.goT > 0 && G.running) { if (cd.dataset.n !== '0') { cd.dataset.n = '0'; cd.textContent = '0'; cd.classList.remove('pop'); void cd.offsetWidth; cd.classList.add('pop'); } }
  else if (cd.dataset.n !== '') { cd.dataset.n = ''; cd.textContent = ''; }
}

// tireurs hors du champ de vision qui bandent leur arc ou chargent / visent avec leur arbalète
function shooterIndicators() {
  const box = $('#ind'); if (!box) return;
  if (G.id !== 'dodge' || !G.cfg.indic || G.ended) { if (box.innerHTML) box.innerHTML = ''; return; }
  const p = G.p, cvs = $('#cv'), asp = cvs ? cvs.clientWidth / Math.max(1, cvs.clientHeight) : 16 / 9;
  const half = Math.atan(Math.tan(S.fov / 2 * DEG) * asp) / DEG - 4;
  let html = '';
  for (const e of G.ents) {
    const k = e.weapon === 'xbow' ? (e.loaded ? 1 : e.drawT / 25 * 0.6) : (e.drawT > 0 ? Math.min(1, e.drawT / 20) : 0);
    if (k <= 0) continue;
    const rel = wrap(Math.atan2(-(e.x - p.x), e.z - p.z) / DEG - G.yaw);
    if (Math.abs(rel) < half) continue;
    html += `<i style="transform:rotate(${rel.toFixed(1)}deg) translateY(-150px);opacity:${(0.35 + k * 0.65).toFixed(2)}"></i>`;
  }
  if (box.innerHTML !== html) box.innerHTML = html;
}

// ================================================================ boucle
let rafId = 0;
const MENU = { ents: [] };
function frame(now) {
  rafId = requestAnimationFrame(frame);
  if (!G) { if (FP.UI && FP.UI.menuVisible()) R.menuFrame(MENU); return; }
  if (G.twoD) return;
  const dt = clamp((now - G.last) / 1000, 0, 0.1); G.last = now;
  if (G.running && !G.paused && !G.ended) {
    if (G.cd > 0) {
      const before = Math.ceil(G.cd); G.cd -= dt;
      if (Math.ceil(G.cd) !== before && G.cd > 0) FP.sfx('tick');
      if (G.cd <= 0) { G.cd = 0; G.goT = 0.6; FP.sfx('go'); if (G.id === 'flick') spawnFlick(); if (G.id === 'build' || G.id === 'targets') G.roundStart = G.time; }
    } else {
      G.acc += dt;
      while (G.acc >= 0.05) { G.acc -= 0.05; tick(); if (!G || G.ended) break; }
      if (!G) return;
      G.time += dt;
      if (G.dur && G.time >= G.dur && !G.ended && !G.endT) endGame(G.combat && G.attack ? (G.st.hits === G.st.taken ? undefined : G.st.hits > G.st.taken) : undefined);
    }
  }
  if (G.goT > 0) G.goT -= dt;
  G.hitTexts.forEach(h => h.t -= dt); G.hitTexts = G.hitTexts.filter(h => h.t > 0);
  if (G.hurtFx > 0) G.hurtFx = Math.max(0, G.hurtFx - dt * 2.2);
  G.equip = (G.combat && G.modern) || (G.id === 'targets' && G.weapon === 'sword') ? Math.pow(clamp((G.p.sinceSwing + G.acc / 0.05 + 0.5) / 12.5, 0, 1), 2) * 0.85 + 0.15 : 1;
  const tgt = G.combat ? (aimEnt(60) || G.o) : G.o;
  G.hitbox = tgt && !tgt.dead && !(tgt.respawnT > 0) ? FP.entBox(tgt, hbExpand(), true) : null;
  const alpha = G.running && !G.paused && G.cd <= 0 ? G.acc / 0.05 : 1;
  if (G.auto && G.prevYaw != null) { G.camYaw = G.prevYaw + wrap(G.yaw - G.prevYaw) * alpha; G.camPitch = G.prevPitch + (G.pitch - G.prevPitch) * alpha; }
  else if (G.boat && G.running && !G.paused) { G.camYaw = G.yaw - (G.boat.yaw - G.boat.pyaw) * (1 - alpha); G.camPitch = G.pitch; }
  else { G.camYaw = null; G.camPitch = null; }
  R.frame(G, alpha);
  updateHud();
}
FP.startLoop = () => { if (!rafId) rafId = requestAnimationFrame(frame); };

// fond du menu : deux joueurs qui se battent
FP.setupMenuScene = function () {
  arena();
  const a = FP.makeEnt(-1.3, 0, -90, Object.assign({}, BOT_LOOK, { name: '', armor: true })), b = FP.makeEnt(1.3, 0, 90, { shirt: '#18a7a8', pants: '#383f9a', item: 'sword', armor: true });
  MENU.ents = [a, b];
  clearInterval(MENU.timer);
  MENU.timer = setInterval(() => {
    if (G) return;
    const t = performance.now() / 1000;
    for (const [e, o] of [[a, b], [b, a]]) {
      e.px = e.x; e.pz = e.z; e.walkPrev = e.walk;
      const ang = t * 0.6 + (e === a ? 0 : Math.PI);
      e.x = Math.cos(ang) * 1.5; e.z = Math.sin(ang) * 1.5; e.walk += 0.12; e.walkAmt = 0.7;
      e.yaw = e.lookYaw = faceYaw(e, o); e.pitch = 0;
      if (e.swingAnim > 0) e.swingAnim--; if (e.hurtTime > 0) e.hurtTime--;
      if (Math.random() < 0.06) { e.swingAnim = 6; o.hurtTime = 8; if (FP.UI.menuVisible()) R.burst(Math.random() < 0.3 ? 'crit' : 'hit', o.x, 1.2, o.z, { n: 6 }); }
    }
  }, 50);
};

// ================================================================ souris / clavier
const cv = () => FP.$('#cv');
FP.lock = function () {
  const c = cv(), fail = () => FP.UI.lockFailed();
  try {
    const r = S.raw ? c.requestPointerLock({ unadjustedMovement: true }) : c.requestPointerLock();
    if (r && r.catch) r.catch(() => { try { const r2 = c.requestPointerLock(); if (r2 && r2.catch) r2.catch(fail); } catch (e) { fail(); } });
  } catch (e) { try { c.requestPointerLock(); } catch (e2) { fail(); } }
};
document.addEventListener('pointerlockerror', () => FP.UI.lockFailed());
document.addEventListener('pointerlockchange', () => {
  if (!G || G.twoD || G.auto) return;
  if (document.pointerLockElement === cv()) {
    FP.UI.hideOverlay();
    if (!G.started) { G.started = true; G.running = true; G.cd = 2; G.last = performance.now(); }
    else if (G.paused) { G.paused = false; G.last = performance.now(); }
  } else {
    keys.clear(); G.lmb = false; if (G.rmb) onRightUp();
    if (G.running && !G.ended) { G.paused = true; FP.UI.showPause(); }
  }
});
document.addEventListener('mousemove', e => {
  if (!G || G.twoD || document.pointerLockElement !== cv() || G.paused || !G.running || G.ended) return;
  if (Math.abs(e.movementX) > 800 || Math.abs(e.movementY) > 800) return;
  const k = FP.degPerCount();
  G.yaw += e.movementX * k;
  G.pitch = clamp(G.pitch + e.movementY * k * (S.invertY ? -1 : 1), -90, 90);
});
document.addEventListener('mousedown', e => {
  if (!G || G.twoD || document.pointerLockElement !== cv() || !G.running || G.paused) return;
  e.preventDefault();
  if (e.button === 0) G.clickTimes.push(performance.now());
  onClick(e.button);
});
// le clic droit sert à bander l'arc / poser des blocs : jamais de menu contextuel pendant une partie
document.addEventListener('contextmenu', e => { if (G || document.body.classList.contains('in-game')) e.preventDefault(); });
document.addEventListener('mouseup', e => { if (!G || G.twoD) return; if (e.button === 2) onRightUp(); if (e.button === 0) G.lmb = false; });
document.addEventListener('wheel', e => { if (G && !G.twoD && document.pointerLockElement === cv()) selectSlot(G.sel + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
addEventListener('keydown', e => {
  if (!G) return;
  if (G.twoD) { if (G.onKey) G.onKey(e); return; }
  if (G.auto) {
    if (e.code === 'Escape' && !G.ended && G.started) { if (G.paused) FP.resume(); else { G.paused = true; FP.UI.showPause(); } }
    return;
  }
  if (document.pointerLockElement === cv()) {
    keys.add(e.code);
    if (/^Digit[1-9]$/.test(e.code)) selectSlot(+e.code.slice(5) - 1);
    if (e.code === 'Space' || e.code === 'Tab' || e.ctrlKey || e.altKey) e.preventDefault();
  } else if (G.ended && e.code === 'Escape') FP.closeGame();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// ================================================================ fin de session (statistiques, pas de records)
function endGame(win) {
  if (!G || G.ended) return;
  G.ended = true; G.running = false; G.rmb = false; G.lmb = false;
  if (document.pointerLockElement) document.exitPointerLock();
  const st = G.st, id = G.id, cfg = G.cfg;
  let big = '—', rows = [], advice = [], title = 'Session terminée';
  const stat = (l, v, good) => ({ l, v, good }), avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  rows.push(stat('Durée jouée', fmtT(G.time)));
  if (G.combat) {
    if (win === true) title = 'Victoire !'; else if (win === false) title = 'Défaite';
    const resets = st.hits ? st.sprintHits / st.hits * 100 : 0, prec = st.swings ? st.onTarget / st.swings * 100 : 0;
    const kbAvg = st.kb.length ? avg(st.kb) : 0;
    big = G.dmgMode ? `${st.dmg.toFixed(1)} dégâts` : G.attack ? `${st.hits} — ${st.taken}` : `${st.hits} coups`;
    if (G.dmgMode) rows.push(stat('Dégâts par seconde', (st.dmg / Math.max(1, G.time)).toFixed(2)), stat('Plus gros coup', st.maxHit.toFixed(1)), stat('Coups plus forts pendant l’invulnérabilité', st.over));
    else rows.push(stat('Recul moyen par coup', kbAvg.toFixed(2) + ' blocs', kbAvg >= 2.5), stat('Plus long recul', (st.kb.length ? Math.max(...st.kb) : 0).toFixed(2) + ' blocs'));
    if (G.dmgMode) advice.push(G.modern ? 'Dégâts max : attends la charge pleine, saute, et frappe en retombant SANS sprinter (relâche avancer un instant avant de sauter) : critique ×1,5.' : 'En 1.8 : saute en continu et frappe en retombant (critique ×1,5), pile quand l’invulnérabilité de la cible (0,5 s) se termine.');
    rows.push(stat('Coups avec recul max', Math.round(resets) + ' %', resets >= 75), stat('Combo max', st.maxCombo, st.maxCombo >= 6), stat('Clics sur une cible', Math.round(prec) + ' %', prec >= 60), stat('CPS moyen', (st.swings / Math.max(1, G.time)).toFixed(1)));
    if (G.attack) rows.push(stat('Jump resets', st.jumpResets));
    if (G.modern) { const ch = st.swings ? st.strSum / st.swings * 100 : 0; rows.push(stat('Charge moyenne au clic', Math.round(ch) + ' %', ch >= 90), stat('Coups faibles', st.weak, st.weak <= st.hits * 0.1), stat('Critiques', st.crits)); if (ch < 85) advice.push('Tu cliques avant la fin de la recharge : un coup à 50 % ne fait que 40 % des dégâts, ne donne pas de recul bonus, et remet la recharge à zéro.'); }
    if (resets < 60) advice.push(`Seulement ${Math.round(resets)} % de coups avec recul max. Relâche ${FP.keyLabel(S.keys.fwd)} au moins 1 tick (50–100 ms) juste après chaque coup, puis réappuie.`);
    if (prec < 50) advice.push('Beaucoup de clics dans le vide : garde le viseur collé sur la cible en la suivant avec le bras, pas en à-coups.');
    advice.push(G.attack ? `Défense : appuie sur ${FP.keyLabel(S.keys.jump)} pile quand tu te fais toucher (jump reset).` : 'Contre une cible qui fuit, reste en ligne droite derrière elle et W-tap à chaque coup pour l’empêcher de revenir.');
  } else if (id === 'flick') {
    const a = avg(st.times), accu = st.n / Math.max(1, st.n + st.miss) * 100; big = st.n ? Math.round(a) + ' ms' : '—';
    rows.push(stat('Cibles touchées', st.n), stat('Temps moyen', st.n ? Math.round(a) + ' ms' : '—', a < 600), stat('Meilleur', st.n ? Math.round(Math.min(...st.times)) + ' ms' : '—'), stat('Précision', Math.round(accu) + ' %', accu >= 85));
    if (accu < 80) advice.push('Trop de clics ratés : ne clique que quand le viseur est posé. La précision d’abord, la vitesse ensuite.');
    advice.push('Un grand mouvement du bras vers la cible, puis une micro-correction du poignet. Les yeux vont sur la cible AVANT la souris.');
  } else if (id === 'dodge') {
    const tot = st.taken + st.avoided, pct = tot ? st.avoided / tot * 100 : 0, best = Math.max(st.best, G.tick / 20 - G.lastHit);
    if (win === false) title = 'Trop de flèches reçues';
    big = Math.round(pct) + ' % évitées';
    rows.push(stat('Flèches tirées', st.incoming), stat('Reçues', st.taken, st.taken <= tot * 0.2), stat('Évitées', st.avoided), stat('Esquives serrées (< 2,5 blocs)', st.dodged), stat('Plus longue série sans être touché', best.toFixed(1) + ' s'));
    advice.push('Ne cours jamais en ligne droite : les tireurs visent là où tu seras. Change de direction juste après qu’ils ont tiré.');
    advice.push('Écoute la corde et regarde les bras levés : un arc bandé à fond (1 s) ou une arbalète chargée = un tir imminent. Bouge perpendiculairement à la flèche.');
    advice.push('Utilise le décor : un arbre entre toi et un tireur arrête toutes ses flèches. Contre plusieurs tireurs, garde-les tous du même côté.');
  } else if (id === 'targets') {
    const t = st.times, shots = st.shots.bow + st.shots.xbow, rh = st.hits.bow + st.hits.xbow, acc = shots ? rh / shots * 100 : 0;
    big = t.length ? avg(t).toFixed(2) + ' s / manche' : (G.total - G.left) + ' cibles';
    rows.push(stat('Manches finies', st.done), stat('Meilleure manche', t.length ? Math.min(...t).toFixed(2) + ' s' : '—'),
      stat('Cibles à l’épée', st.hits.sword), stat('Cibles à l’arc', st.hits.bow), stat('Cibles à l’arbalète', st.hits.xbow),
      stat('Précision des tirs', shots ? Math.round(acc) + ' %' : '—', shots ? acc >= 60 : undefined), stat('Coups d’épée dans le vide', st.swings - st.hits.sword, st.swings - st.hits.sword <= st.hits.sword * 0.3));
    advice.push('Épée jusqu’à ~3 blocs, arc ou arbalète au-delà. Change d’arme pendant que tu te tournes vers la cible suivante, pas après.');
    advice.push('L’arbalète chargée le reste dans ta barre : charge-la entre deux manches pour avoir un tir instantané au départ.');
    advice.push('À l’arc, n’attends la pleine charge (1 s) que pour les cibles lointaines : à moins de 10 blocs, une demi-charge suffit souvent.');
  } else if (id === 'build') {
    big = st.done + ' construction' + (st.done > 1 ? 's' : '');
    rows.push(stat('Temps moyen', st.times.length ? avg(st.times).toFixed(2) + ' s' : '—'), stat('Meilleur', st.times.length ? Math.min(...st.times).toFixed(2) + ' s' : '—'), stat('Blocs posés', st.placed), stat('Mauvais blocs posés', st.wrong, st.wrong <= st.placed * 0.1), stat('Blocs cassés', st.broken));
    advice.push('Lis la maquette couche par couche, du bas vers le haut, et pose tous les blocs d’une même couleur d’affilée.');
    advice.push('Garde le clic droit enfoncé en balayant avec la souris : un bloc tous les 4 ticks, comme dans Minecraft.');
  } else if (id === 'bridge') {
    const t = st.times; big = t.length ? avg(t).toFixed(2) + ' s' : '—';
    rows.push(stat('Traversées', t.length), stat('Meilleure', t.length ? Math.min(...t).toFixed(2) + ' s' : '—'), stat('Vitesse moyenne', t.length ? (G.bridgeLen / avg(t)).toFixed(2) + ' blocs/s' : '—'), stat('Chutes', st.falls, st.falls === 0), stat('Blocs posés', st.blocks));
    advice.push('Base : accroupi au bord, recule et clic droit sur le côté du bloc. Ensuite, relâche l’accroupi au milieu des blocs (speed bridge).');
    if (G.goal.y > 0) advice.push('Pour monter : saute et pose le bloc sous tes pieds au sommet du saut (pillar), ou fais des escaliers en sautant vers l’avant.');
    else advice.push('Clic droit maintenu = un bloc tous les 4 ticks : c’est ce qui permet le god bridge et le breezily sans spammer.');
  } else if (id === 'clutch') {
    const n = st.ok + st.fail, pct = n ? st.ok / n * 100 : 0, mg = st.margins.length ? avg(st.margins) : null;
    big = Math.round(pct) + ' % de clutchs réussis';
    rows.push(stat('Réussis', st.ok + '/' + n, pct >= 70), stat('Morts', st.dead, st.dead === 0), stat('Cœurs perdus', (st.dmg / 2).toFixed(1)), stat('Marge moyenne (hauteur au moment d’agir)', mg != null ? mg.toFixed(1) + ' blocs' : '—'));
    for (const k in st.byItem) rows.push(stat(CLUTCH[k][0], st.byItem[k].ok + '/' + st.byItem[k].n, st.byItem[k].ok === st.byItem[k].n));
    advice.push('Seau d’eau : regarde tout en bas pendant la chute et clique droit dès que le sol est à portée (4,5 blocs de ton œil) ; reprends l’eau tout de suite après.');
    advice.push('Toile, slime, échafaudage, bateau : comme l’eau, pose-les juste sous toi. Sur le slime, ne sois pas accroupi. Botte de foin (× 0,2) et lit (÷ 2) ne font qu’amortir.');
    advice.push('Échelle sur un mur d’un bloc : elle ne t’attrape que si tu es dans sa case au début d’un tick — pose-la au dernier moment, pile là où tu vas passer.');
    advice.push('TNT : pose-la contre le côté du pilier, allume-la au briquet (elle tombe), puis saute : l’explosion te relance et ta chute repart de zéro, mais elle blesse — sois à environ 6 blocs d’elle quand elle explose.');
    advice.push('Charge de vent : lance-la à tes pieds quand le sol est tout proche : la rafale te relance et remet ta chute à zéro. Masse : frappe le mob en tombant (plus de 1,5 bloc de chute).');
  } else if (id === 'minage') {
    const M = G.mi, t = M.times, wrong = st.ticks ? st.wrongTicks / st.ticks * 100 : 0;
    big = t.length ? avg(t).toFixed(2) + ' s / structure' : st.broken + ' blocs';
    rows.push(stat('Structures détruites', M.done), stat('Meilleure', t.length ? Math.min(...t).toFixed(2) + ' s' : '—'), stat('Blocs cassés', st.broken), stat('Temps avec le mauvais outil', Math.round(wrong) + ' %', wrong < 10), stat('Outils', ({ wood: 'bois', stone: 'pierre', iron: 'fer', gold: 'or', diamond: 'diamant' }[M.mat]) + (M.eff ? ' · Efficacité ' + M.eff : '')));
    advice.push('Pioche : pierre, roche, minerais. Pelle : terre, herbe, sable, gravier. Hache : bois. Cisailles : laine (×5) et feuilles (instantané). Verre : peu importe.');
    advice.push('Reste au sol : en l’air, on casse 5 fois moins vite. Change d’outil (1-2-3) pendant que tu vises le bloc suivant.');
    advice.push('Après chaque bloc, Minecraft impose 5 ticks d’attente (sauf casse instantanée) : enchaîne sans relâcher le clic.');
  } else if (id === 'bateau') {
    const R2 = G.race, T = G.track, t = R2.times;
    big = G.finalTime != null ? G.finalTime.toFixed(2) + ' s' : R2.lap + '/' + R2.laps + ' tours';
    rows.push(stat('Tours', R2.lap + '/' + R2.laps), stat('Meilleur tour', t.length ? Math.min(...t).toFixed(2) + ' s' : '—'), stat('Vitesse moyenne', G.finalTime ? (T.L * R2.laps / G.finalTime).toFixed(1) + ' blocs/s' : '—'),
      stat('Vitesse max', (G.st.maxSpeed * 20).toFixed(1) + ' blocs/s'), stat('Murs touchés', G.st.hits, G.st.hits <= R2.laps), stat('Longueur du circuit', Math.round(T.L) + ' blocs'));
    advice.push('Sur la glace, le bateau garde sa vitesse de rotation : relâche la direction (ou contre-braque) AVANT d’être aligné, sinon tu pars en tête-à-queue.');
    advice.push('Le bateau glisse dans la direction où il allait : vise l’intérieur du virage et lâche avancer un instant si tu vas taper le mur extérieur.');
  } else if (id === 'foret') {
    const F = G.fo;
    big = G.finalTime != null ? G.finalTime.toFixed(2) + ' s' : 'arrivée non atteinte';
    rows.push(stat('Demi-tour', F.half != null ? F.half.toFixed(2) + ' s' : '—'), stat('Vitesse moyenne', G.finalTime ? (2 * F.D / G.finalTime).toFixed(2) + ' blocs/s' : '—', G.finalTime ? 2 * F.D / G.finalTime > 6 : undefined), stat('Distance parcourue', G.st.walked.toFixed(0) + ' blocs'), stat('Détour', G.finalTime ? '+' + Math.max(0, (G.st.walked / (2 * F.D) - 1) * 100).toFixed(0) + ' %' : '—'), stat('Forêt', `n°${cfg.seed} · ${cfg.densite} %`));
    advice.push('Sprint-jump en continu dans les zones dégagées (7 blocs/s contre 5,6 en courant) ; sous les feuilles basses, chaque saut est coupé net : c’est un head hitter, encore plus rapide.');
    advice.push('Regarde loin devant pour choisir ton couloir : un petit détour sans obstacle vaut mieux qu’un chemin droit plein de buissons.');
  } else if (id === 'vent') {
    const V = G.vt, all = V.dists.concat(G.endT || !V.maxZ ? [] : [V.maxZ]), best = Math.max(V.best, V.maxZ);
    big = best.toFixed(1) + ' blocs';
    rows.push(stat('Essais', all.length), stat('Distance moyenne', all.length ? avg(all).toFixed(1) + ' blocs' : '—'), stat('Coups reçus', st.gusts), stat('Blocs posés', st.placed));
    advice.push('Dès que le coup te soulève, regarde sous toi du côté où tu pars et pose un bloc contre le côté du pont : tu retombes dessus.');
    advice.push('Reste au centre du pont et avance sans sauter : un coup reçu en l’air t’envoie beaucoup plus loin.');
  } else if (id === 'course') {
    const C = G.course;
    big = G.finalTime != null ? G.finalTime.toFixed(2) + ' s' : 'arrivée non atteinte';
    rows.push(stat('Blocs posés', st.placed), stat('Chutes', st.falls, st.falls === 0), stat('Parcours', `n°${cfg.seed} · ${cfg.diff} %`));
    advice.push('Trou trop long : telly bridge (saute vers l’avant, retourne-toi en l’air et pose sous toi) ou avance de quelques blocs puis saute.');
    advice.push('Mur : pillar (saute et pose un bloc sous tes pieds) jusqu’au sommet, ou contourne-le si c’est plus court.');
    advice.push('Longue ligne droite : pose une ligne de blocs 2 blocs au-dessus du sol et sprint-jumpe dessous (head hitter) : chaque saut redonne l’élan du sprint.');
  } else if (id === 'parkour') {
    big = G.finalTime != null ? G.finalTime.toFixed(2) + ' s' : (G.best + 1) + ' sauts';
    rows.push(stat('Sauts réussis', G.best + 1), stat('Chutes', st.falls, st.falls <= 2), stat('Obstacles rouges touchés', st.deaths, st.deaths <= 1), stat('Parcours', `n°${cfg.seed} · ${cfg.diff} %`));
    if (st.deaths) advice.push('Les blocs rouges tuent au moindre contact : prends ton élan bien droit et freine (relâche avancer) avant d’atterrir près d’un mur rouge.');
    advice.push('Saute au tout dernier moment au bord du bloc, en sprint. Prépare ta direction AVANT de sauter : le contrôle en l’air est faible.');
    advice.push('Petites plateformes : vise le centre et relâche avancer (ou tape reculer) juste avant d’atterrir. Sous un plafond, le saut est plus bas mais plus rapide.');
  }
  FP.logSession(id, big);
  FP.UI.showResults({ id, title, big, rows, advice, win });
}
FP.endGame = endGame;
FP.finishSession = () => { if (G && !G.ended && !G.twoD) endGame(G.combat && G.attack ? (G.st.hits === G.st.taken ? undefined : G.st.hits > G.st.taken) : undefined); };

// ================================================================ ouverture / fermeture
FP.openGame = function (id, autoLock) {
  if (G && G.cleanup) G.cleanup();
  if (document.pointerLockElement) document.exitPointerLock();
  keys.clear(); R.clearEntities(); R.clearParticles(); R.clearLabels();
  const cfg = FP.getCfg(id);
  FP.UI.enterGame(id);
  if (id === 'cps' || id === 'craft') { G = { twoD: true, id, cfg }; FP.Drills[id](g => Object.assign(G, g), cfg); }
  else { newGame(id, cfg); updateHud(); if (G.auto) { FP.UI.hideOverlay(); G.started = true; G.running = true; G.cd = 2; G.last = performance.now(); } else if (autoLock) FP.lock(); else FP.UI.showClickToStart(id); }
  FP.startLoop();
};
FP.resume = function () {
  if (!G) return;
  if (G.auto) { if (!G.started) { G.started = true; G.running = true; G.cd = 2; } G.paused = false; G.last = performance.now(); FP.UI.hideOverlay(); }
  else FP.lock();
};
FP.closeGame = function () {
  if (G && G.cleanup) G.cleanup();
  R.clearLabels();
  if (document.pointerLockElement) document.exitPointerLock();
  G = null; keys.clear(); R.clearEntities(); R.clearParticles();
  FP.setupMenuScene();
  FP.UI.leaveGame();
};
FP.M = { clutchUse, coursePlace, courseBreak, fireXbow, WEAPONS, inScaffold, spawnFlick, onClick, onRightUp, aimEnt, aimHit, eyePos, tryPlace, buildPlace, buildBreak, selectSlot, platBox, hitText, faceYaw, lookPitch, inBuildZone, ballistic,
  rightDown: () => { if (G && !G.rmb) { G.rmb = true; G.rmbTimer = 0; } }, cancelDraw: () => { if (G) { G.rmb = false; G.drawTicks = 0; G.bowPull = 0; G.fovZoom = 0; } } };
FP._dbg = () => G; FP._keys = keys; FP._tick = () => tick(); FP._click = b => onClick(b); FP._rup = () => onRightUp();
FP._sim = simJump; FP._platBox = platBox;
})();
