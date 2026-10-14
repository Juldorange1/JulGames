'use strict';
/* =========================================================
   BINÔME — moteur : état de la partie, salles, combat, IA
   ========================================================= */

const SAVE_KEY = 'binome_save_v1';
let S = null;   // partie (sauvegardée)
let C = null;   // combat en cours (non sauvegardé : on recommence la salle au rechargement)

/* ---------- utilitaires ---------- */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = Math.random;
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
function wpick(r, list) { let tot = 0; for (const [, w] of list) tot += w; let x = r() * tot; for (const [it, w] of list) { if ((x -= w) <= 0) return it; } return list[list.length - 1][0]; }
function shuffle(r, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const inB = (x, y) => x >= 0 && y >= 0 && x < GRID_W && y < GRID_H;
const man = (a, b, c, d) => Math.abs(a - c) + Math.abs(b - d);
const cheb = (a, b, c, d) => Math.max(Math.abs(a - c), Math.abs(b - d));
const key = (x, y) => y * GRID_W + x;
const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIR8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
let ANIM = 1; // multiplicateur de durée des animations
const wait = ms => new Promise(r => setTimeout(r, ms * ANIM));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const eraOf = d => Math.floor(d / 10);
const eraData = d => ERAS[eraOf(d) % ERAS.length];

/* ---------- sauvegarde ---------- */
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function load() {
  try { const t = localStorage.getItem(SAVE_KEY); if (!t) return null; const s = JSON.parse(t); if (!s || s.v !== 1) return null; return s; } catch (e) { return null; }
}
function wipeSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }

/* ---------- nouvelle partie ---------- */
function mkHero(k) {
  return { key: k, pct: 100, slots: [{ key: HEROES[k].basic, perm: true, dur: 0, mods: [] }, null, null, null] };
}
function newGame(h1, h2) {
  S = {
    v: 1, depth: 0, money: 0, bossesKilled: 0, bossesFailed: 0, bossesSeen: 0, sinceBoss: 0,
    heroes: [mkHero(h1), mkHero(h2)], rules: [], pacts: [],
    talents: { vigueur: 0, agilite: 0, soif: 0, robustesse: 0, egide: 0, choix: 0, prosperite: 0, repos: 0 },
    engraved: { skill: 0, upgrade: 0, rule: 0 },
    choices: null, pending: null, rerolls: 0,
    stats: { kills: 0, rooms: 0, moneyTotal: 0, started: Date.now() },
    log: [],
  };
  S.choices = genChoices();
  addLog('La partie commence. Choisis ta première salle.');
  save();
}
function addLog(t) { S.log.unshift({ t, d: S.depth }); if (S.log.length > 40) S.log.length = 40; }

/* ---------- agrégat des effets globaux ---------- */
function hasRule(k) { return S.rules.some(r => r.key === k); }
function pactOf(k) { return S.pacts.find(p => p.key === k); }
function maxPct() { return 100 + 10 * S.talents.vigueur; }
function G() {
  const g = {
    dmg: 1, taken: 1 - 0.1 * S.talents.robustesse, move: S.talents.agilite, range: 0, cd: 0, push: 0, coll: 5,
    heal: KILL_HEAL + 2 * S.talents.soif, healMult: 1, extraEnemies: 0, actions: 1, moveCap: 99,
    diag: false, enemyMove: 0, startHeal: 0, startPenalty: 0, ricochet: false, adrenaline: false, explode: false,
    lien: false, riposte: false, relais: false, initiative: false, fury: false, storm: false, drain: 0, enemyHp: 1,
  };
  for (const r of S.rules) {
    switch (r.key) {
      case 'diagonales': g.diag = true; break;
      case 'elan': g.move += 1; break;
      case 'adrenaline': g.adrenaline = true; break;
      case 'explosifs': g.explode = true; break;
      case 'gravite': g.push += 1; break;
      case 'lien': g.lien = true; break;
      case 'ferveur': g.heal += 5; break;
      case 'percussion': g.coll *= 2; break;
      case 'souffle': g.startHeal += 10; break;
      case 'riposte': g.riposte = true; break;
      case 'relais': g.relais = true; break;
      case 'initiative': g.initiative = true; break;
      case 'ricochets': g.ricochet = true; break;
      case 'vivacite': g.cd -= 1; break;
      case 'fureur': g.fury = true; break;
      case 'pillards': g.enemyHp *= 0.8; break;
    }
  }
  for (const p of S.pacts) {
    const v = p.v || 1;
    switch (p.key) {
      case 'verre': g.dmg *= 1 + 0.4 * v; g.taken *= 1.5; break;
      case 'frenesie': g.actions = 2; g.moveCap = 1; if (v > 1) g.range += 1; break;
      case 'nuee': g.heal += 5 * v; g.extraEnemies += 2; break;
      case 'sang': g.healMult *= v + 1; g.startPenalty += 10; break;
      case 'sprint': g.move += 2 * v; g.cd += 1; break;
      case 'tempete': g.dmg *= 1 + 0.3 * v; g.storm = true; break;
      case 'titan': g.taken *= 1 - 0.25 * v; g.dmg *= 0.75; break;
      case 'brume': g.dmg *= 1 + 0.35 * v; g.range -= 1; break;
      case 'hate': g.cd -= v; g.enemyMove += 1; break;
      case 'colere': g.push += v; g.coll *= 2; g.drain += 3; break;
    }
  }
  if (C && C.card && C.card.trait === 'brouillard') g.range -= 1;
  if (C && C.card && C.card.trait === 'frenetique') g.enemyMove += 1;
  g.taken = Math.max(0.15, g.taken);
  return g;
}
function heroMove(hi) { const g = G(); return Math.max(1, Math.min(g.moveCap, HEROES[S.heroes[hi].key].move + g.move)); }

/* statistiques finales d'une compétence (base + améliorations + effets globaux) */
function skillStats(hi, slot) {
  const inst = S.heroes[hi].slots[slot]; if (!inst) return null;
  const d = SKILLS[inst.key];
  const s = Object.assign({}, d, {
    key: inst.key, dmg: d.dmg || 0, range: d.range || 0, cd: d.cd || 0, push: d.push || 0, poison: d.poison || 0,
    stun: d.stun || 0, pierce: !!d.pierce, splash: 0, lifesteal: d.lifesteal || 0, echo: 0, vif: 0, exec: d.exec || 0,
    chain: d.chain || 0, area: d.area || 'single',
  });
  for (const m of inst.mods) if (UPGRADES[m.key]) UPGRADES[m.key].apply(s, m.v || 1);
  const g = G();
  s.dmg *= g.dmg;
  if (s.range > 1 || (s.type !== 'line' && s.range > 0)) s.range = Math.max(1, s.range + g.range);
  else if (s.range === 1 && g.range > 0) s.range += g.range;
  s.cd = Math.max(0, s.cd + g.cd);
  if (s.push > 0) s.push += g.push;
  if (g.ricochet && s.type === 'line' && s.dmg > 0) s.chain += 1;
  return s;
}
function displayDmg(hi, s) {
  return Math.round(s.dmg * S.heroes[hi].pct / 100 * furyMult(hi));
}
function furyMult(hi) { return (G().fury && S.heroes[hi].pct < 70) ? 1.3 : 1; }

/* =========================================================
   GÉNÉRATION DES PORTES (choix de salle) ET DES RÉCOMPENSES
   ========================================================= */
function tempEffectsCount() {
  let n = S.rules.filter(r => !r.perm).length + S.pacts.length;
  for (const h of S.heroes) for (const s of h.slots) if (s) { if (!s.perm) n++; n += s.mods.filter(m => !m.perm).length; }
  return n;
}
function nonBasicSkills() {
  const out = [];
  S.heroes.forEach((h, hi) => h.slots.forEach((s, si) => { if (s && si > 0) out.push({ hi, si }); }));
  return out;
}
function genReward(r, diff) {
  const list = [['skill', 26], ['upgrade', 28], ['rule', 14], ['pact', 10], ['rest', 9]];
  if (tempEffectsCount() >= 3) list.push(['prolong', 5]);
  if (nonBasicSkills().length >= 1) { list.push(['mutation', 5]); list.push(['transfert', 3]); }
  const low = Math.min(S.heroes[0].pct, S.heroes[1].pct);
  if (low < 70) list.push(['rest', 10]);
  const type = wpick(r, list);
  const rw = { type, v: diff };
  if (type === 'skill') {
    const hi = r() < 0.5 ? 0 : 1;
    const owned = new Set(S.heroes[hi].slots.filter(Boolean).map(s => s.key));
    const pool = SKILL_POOL.filter(k => !owned.has(k));
    rw.hero = hi; rw.key = pick(r, pool);
  } else if (type === 'upgrade') {
    rw.key = pick(r, Object.keys(UPGRADES));
  } else if (type === 'rule') {
    const pool = Object.keys(RULES).filter(k => !S.rules.some(x => x.key === k && x.perm));
    rw.key = pick(r, pool.length ? pool : Object.keys(RULES));
  } else if (type === 'pact') {
    rw.key = pick(r, Object.keys(PACTS));
  }
  return rw;
}
function rewardTitle(rw) {
  switch (rw.type) {
    case 'skill': return `Nouvelle compétence : ${SKILLS[rw.key].name}`;
    case 'upgrade': return `Amélioration : ${UPGRADES[rw.key].name}`;
    case 'rule': return `Règle : ${RULES[rw.key].name}`;
    case 'pact': return `Pacte : ${PACTS[rw.key].name}`;
    case 'rest': return 'Repos';
    case 'prolong': return 'Sablier';
    case 'mutation': return 'Mutation';
    case 'transfert': return 'Transfert';
  }
  return '?';
}
function rewardDesc(rw) {
  const v = rw.v;
  switch (rw.type) {
    case 'skill': return `Pour ${HEROES[S.heroes[rw.hero].key].name} : ${SKILLS[rw.key].desc} (${DUR.skill * v} salles)`;
    case 'upgrade': return `Sur la compétence de ton choix : ${UPGRADES[rw.key].desc(v)} (${DUR.upgrade} salles)`;
    case 'rule': return `${RULES[rw.key].desc} (${DUR.rule * v} salles)`;
    case 'pact': return `Bonus : ${PACTS[rw.key].bonus(v)}. Malus : ${PACTS[rw.key].malus}. (${DUR.pact} salles)`;
    case 'rest': return `+${15 * v} % aux deux héros.`;
    case 'prolong': return `+${3 * v} salles à tous tes effets temporaires.`;
    case 'mutation': return v > 1 ? 'Transforme une compétence : tu choisis parmi 3 nouvelles (améliorations gardées).' : 'Transforme une compétence en une autre au hasard (améliorations gardées).';
    case 'transfert': return `Donne une compétence à l’autre héros${v > 1 ? ' et +3 salles de durée' : ''}.`;
  }
  return '';
}

function bossChance() { return S.depth < 4 ? 0 : Math.min(0.75, 0.14 + 0.07 * S.sinceBoss); }
function genChoices() {
  const n = 3 + S.talents.choix;
  const out = [];
  let bossPlaced = false;
  for (let i = 0; i < n; i++) {
    const seed = (Math.random() * 2 ** 31) | 0;
    const r = mulberry32(seed ^ 0x9e3779b9);
    const diff = r() < 0.5 ? 1 : 2;
    const card = { seed, diff, depth: S.depth, boss: null, trait: null, reward: null };
    if (!bossPlaced && Math.random() < bossChance()) {
      bossPlaced = true;
      card.boss = BOSS_ORDER[(S.bossesSeen + Math.floor(Math.random() * 2)) % BOSS_ORDER.length];
    } else {
      card.reward = genReward(r, diff);
      if (S.depth >= 5 && (r() < 0.35 || eraOf(S.depth) % ERAS.length === 4)) card.trait = pick(r, Object.keys(TRAITS));
    }
    out.push(card);
  }
  // si un héros est mal en point, au moins une porte propose du repos
  const low = Math.min(S.heroes[0].pct, S.heroes[1].pct);
  const plain = out.filter(c => !c.boss);
  if (low < 65 && plain.length && !plain.some(c => c.reward.type === 'rest')) {
    const c = plain[Math.floor(Math.random() * plain.length)]; c.reward = { type: 'rest', v: c.diff };
  }
  return out;
}
function bossMoney(card) {
  return Math.round((10 + 3 * S.bossesKilled) * card.diff * (1 + 0.25 * S.talents.prosperite));
}

/* =========================================================
   GÉNÉRATION D'UNE SALLE (déterministe selon la graine)
   ========================================================= */
function genRoom(card) {
  const r = mulberry32(card.seed);
  const d = card.depth, era = eraOf(d) % ERAS.length;
  let grid, objs, ok = false, tries = 0;
  while (!ok && tries++ < 60) {
    grid = []; objs = [];
    for (let y = 0; y < GRID_H; y++) { const row = []; for (let x = 0; x < GRID_W; x++) row.push({ t: 'floor', fire: 0, fireOwner: null, trap: null, ttl: 0 }); grid.push(row); }
    const free = () => { for (let k = 0; k < 40; k++) { const x = 2 + Math.floor(r() * 5), y = Math.floor(r() * GRID_H); if (grid[y][x].t === 'floor' && !objs.some(o => o.x === x && o.y === y)) return [x, y]; } return null; };
    let rocks = 3 + Math.floor(r() * 4) + (card.trait === 'etroit' ? 5 : 0) + (era === 1 ? 3 : 0);
    let pits = d >= 3 ? Math.floor(r() * 3) : (d >= 1 ? Math.floor(r() * 2) : 0);
    if (card.trait === 'instable') pits += 4;
    if (era === 3) pits += 2;
    let lava = (d >= 12 || era === 2) ? Math.floor(r() * 3) : 0;
    if (card.trait === 'coulee') lava += 4;
    let barrels = d >= 6 ? Math.floor(r() * 2.5) : (d >= 2 ? Math.floor(r() * 1.6) : 0);
    if (card.trait === 'poudriere') barrels += 4;
    if (card.boss) { rocks = Math.max(2, rocks - 2); pits = Math.min(pits, 2); }
    for (let i = 0; i < rocks; i++) { const p = free(); if (p) grid[p[1]][p[0]].t = 'rock'; }
    for (let i = 0; i < pits; i++) { const p = free(); if (p) grid[p[1]][p[0]].t = 'pit'; }
    for (let i = 0; i < lava; i++) { const p = free(); if (p) grid[p[1]][p[0]].t = 'lava'; }
    for (let i = 0; i < barrels; i++) { const p = free(); if (p) objs.push({ kind: 'baril', x: p[0], y: p[1] }); }
    // connexité : toutes les cases praticables doivent être reliées
    const pass = (x, y) => grid[y][x].t !== 'rock' && grid[y][x].t !== 'pit';
    let total = 0, sx = -1, sy = -1;
    for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (pass(x, y)) { total++; if (sx < 0) { sx = x; sy = y; } }
    const seen = new Set([key(sx, sy)]); const q = [[sx, sy]];
    while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIR4) { const nx = x + dx, ny = y + dy; if (inB(nx, ny) && pass(nx, ny) && !seen.has(key(nx, ny))) { seen.add(key(nx, ny)); q.push([nx, ny]); } } }
    ok = seen.size === total;
  }
  // héros à gauche
  const hy = [2 + Math.floor(r() * 2), 0];
  hy[1] = hy[0] + 2 + Math.floor(r() * 2); if (hy[1] >= GRID_H) hy[1] = hy[0] - 2;
  const heroSpawns = [[1, hy[0]], [0, hy[1]]];
  for (const [x, y] of heroSpawns) grid[y][x].t = 'floor';
  // ennemis à droite
  const enemies = [];
  const taken = new Set(heroSpawns.map(([x, y]) => key(x, y)).concat(objs.map(o => key(o.x, o.y))));
  const spot = (minX) => {
    for (let k = 0; k < 80; k++) {
      const x = minX + Math.floor(r() * (GRID_W - minX)), y = Math.floor(r() * GRID_H);
      if (grid[y][x].t !== 'floor' || taken.has(key(x, y))) continue;
      taken.add(key(x, y)); return [x, y];
    }
    for (let y = 0; y < GRID_H; y++) for (let x = GRID_W - 1; x >= 3; x--) if (grid[y][x].t === 'floor' && !taken.has(key(x, y))) { taken.add(key(x, y)); return [x, y]; }
    return null;
  };
  if (card.boss) {
    const B = BOSSES[card.boss];
    if (B.heads) {
      for (const [x, y] of [[7, 1], [8, 3], [7, 5]]) { grid[y][x].t = 'floor'; taken.add(key(x, y)); enemies.push({ kind: card.boss, x, y, boss: true }); }
    } else { grid[3][7].t = 'floor'; taken.add(key(7, 3)); enemies.push({ kind: card.boss, x: 7, y: 3, boss: true }); }
    const adds = (card.diff === 2 ? 2 : 1) + Math.floor(d / 20);
    for (let i = 0; i < adds; i++) { const p = spot(5); if (p) enemies.push({ kind: pickEnemy(r, d), x: p[0], y: p[1] }); }
  } else {
    const g = G();
    let n = (card.diff === 2 ? 4 + Math.floor(d / 12) : 3 + Math.floor(d / 15)) + g.extraEnemies;
    n = Math.min(n, card.diff === 2 ? 9 : 7);
    for (let i = 0; i < n; i++) {
      const kind = pickEnemy(r, d);
      const p = spot(kind === 'spectre' ? 4 : 6); if (!p) break;
      const elite = card.diff === 2 && d >= 3 && r() < 0.25;
      enemies.push({ kind, x: p[0], y: p[1], elite });
    }
  }
  return { grid, objs, heroSpawns, enemies };
}
function pickEnemy(r, d) {
  const list = Object.keys(ENEMIES).filter(k => ENEMIES[k].minDepth <= d).map(k => [k, ENEMIES[k].w * (ENEMIES[k].minDepth > 0 && d - ENEMIES[k].minDepth < 4 ? 1.6 : 1)]);
  return wpick(r, list);
}

/* =========================================================
   COMBAT
   ========================================================= */
let uidSeq = 1;
function mkUnit(o) {
  return Object.assign({ uid: uidSeq++, stun: 0, poison: null, shield: 0, taunt: null, dead: false, rx: o.x, ry: o.y, ox: 0, oy: 0, flash: 0, alpha: 1, scale: 1 }, o);
}
function enemyScale() { return 1 + 0.012 * S.depth + 0.12 * S.bossesKilled; }
function enemyDmgScale() { return 1 + 0.006 * S.depth + 0.05 * S.bossesKilled; }
function spawnEnemy(kind, x, y, extra) {
  const E = ENEMIES[kind]; const g = G();
  const hp = Math.max(3, Math.round(E.hp * enemyScale() * g.enemyHp * (extra && extra.elite ? 1.6 : 1)));
  return mkUnit(Object.assign({
    team: 'enemy', kind, x, y, hp, maxHp: hp, dmg: E.dmg * enemyDmgScale() * (extra && extra.elite ? 1.3 : 1),
    move: E.move, range: E.range || 1, ai: E.ai, push: E.push || 0, immunePush: !!E.immunePush, bt: 0,
  }, extra || {}));
}
function spawnBoss(kind, x, y, diff) {
  const B = BOSSES[kind];
  const hp = Math.round(B.hp * (1 + 0.3 * S.bossesKilled) * (1 + 0.015 * S.depth) * (diff === 2 ? 1.25 : 1));
  const ds = (1 + 0.1 * S.bossesKilled) * (diff === 2 ? 1.1 : 1);
  return mkUnit({
    team: 'enemy', kind, x, y, hp, maxHp: hp, dmg: B.dmg * ds, special: (B.special || 0) * ds, move: B.move, range: B.range || 1,
    ai: 'boss', boss: true, push: B.push || 0, immunePush: true, bt: 0, enr: 1,
  });
}

function startCombat(card) {
  S.pending = card; save();
  const room = genRoom(card);
  const g = G();
  C = {
    card, grid: room.grid, units: [], turn: 1, phase: 'hero', telegraphs: [], bombs: [],
    sel: 0, mode: null, slot: -1, busy: false, boss: !!card.boss, failed: false, ended: false,
    fx: [], texts: [], shake: 0, hover: null, danger: false, kills: [0, 0], reinf: false, banner: null,
  };
  room.heroSpawns.forEach(([x, y], i) => {
    C.units.push(mkUnit({ team: 'hero', kind: 'hero', hero: i, x, y, actions: 0, hasMove: false, moveBudget: 0, preMove: null, adrUsed: false }));
  });
  for (const e of room.enemies) {
    C.units.push(e.boss ? spawnBoss(e.kind, e.x, e.y, card.diff) : spawnEnemy(e.kind, e.x, e.y, { elite: e.elite }));
  }
  for (const o of room.objs) C.units.push(mkUnit({ team: 'obj', kind: 'baril', x: o.x, y: o.y, hp: 1, maxHp: 1 }));
  // effets de début de salle
  for (const h of S.heroes) {
    h.slots.forEach(s => { if (s) s.cdLeft = 0; });
    if (g.startHeal) h.pct = Math.min(maxPct(), h.pct + g.startHeal);
    if (g.startPenalty) h.pct = Math.max(FLOOR_PCT, h.pct - g.startPenalty);
  }
  if (S.talents.egide) heroUnits().forEach(u => u.shield = 1);
  if (g.initiative || card.trait === 'surprise') enemies().forEach(e => e.stun = 1);
  heroPhaseStart(true);
}

/* --- accès --- */
const heroUnits = () => C.units.filter(u => u.team === 'hero' && !u.dead);
const heroUnit = hi => C.units.find(u => u.team === 'hero' && u.hero === hi);
const enemies = () => C.units.filter(u => u.team === 'enemy' && !u.dead);
function unitAt(x, y) { return C.units.find(u => !u.dead && u.x === x && u.y === y) || null; }
function tile(x, y) { return C.grid[y][x]; }
const isRock = (x, y) => tile(x, y).t === 'rock';
const isPit = (x, y) => tile(x, y).t === 'pit';
const walkable = (x, y) => inB(x, y) && tile(x, y).t !== 'rock' && tile(x, y).t !== 'pit';

/* BFS de déplacement. pass(u) : on peut traverser l'unité u ? */
function bfs(sx, sy, maxD, team, diag, extraPass) {
  const res = new Map(); res.set(key(sx, sy), { x: sx, y: sy, d: 0, p: null });
  const q = [[sx, sy]];
  const dirs = diag ? DIR8 : DIR4;
  while (q.length) {
    const [x, y] = q.shift(); const cur = res.get(key(x, y));
    if (cur.d >= maxD) continue;
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (!walkable(nx, ny) || res.has(key(nx, ny))) continue;
      if (dx && dy && (!walkable(x + dx, y) || !walkable(x, y + dy))) continue; // pas de coin coupé
      const o = unitAt(nx, ny);
      if (o && o.team !== team && !(extraPass && extraPass(o))) continue;
      res.set(key(nx, ny), { x: nx, y: ny, d: cur.d + 1, p: key(x, y) });
      q.push([nx, ny]);
    }
  }
  return res;
}
function pathTo(map, x, y) {
  const out = []; let n = map.get(key(x, y));
  while (n && n.p !== null) { out.unshift([n.x, n.y]); n = map.get(n.p); }
  return out;
}
/* champ de distance (ignore les unités) vers un ensemble de cases */
function distField(targets) {
  const f = new Array(GRID_W * GRID_H).fill(99);
  const q = [];
  for (const [x, y] of targets) if (inB(x, y) && walkable(x, y) && f[key(x, y)] > 0) { f[key(x, y)] = 0; q.push([x, y]); }
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of DIR4) { const nx = x + dx, ny = y + dy; if (walkable(nx, ny) && f[key(nx, ny)] > f[key(x, y)] + 1) { f[key(nx, ny)] = f[key(x, y)] + 1; q.push([nx, ny]); } }
  }
  return f;
}

/* ---------- mouvements des héros ---------- */
function heroMoveTiles(u) {
  if (!u.hasMove || C.phase !== 'hero') return new Map();
  const g = G();
  const m = bfs(u.x, u.y, u.moveBudget, 'hero', g.diag);
  for (const [k, n] of [...m]) {
    const o = unitAt(n.x, n.y);
    if (o && o !== u) { if (!(g.relais && o.team === 'hero')) m.delete(k); }
  }
  return m;
}
async function moveHero(u, tx, ty) {
  const m = heroMoveTiles(u); const n = m.get(key(tx, ty)); if (!n || (tx === u.x && ty === u.y)) return false;
  C.busy = true;
  const other = unitAt(tx, ty);
  u.preMove = { x: u.x, y: u.y, budget: u.moveBudget, swap: other ? other.uid : null };
  u.hasMove = false;
  const path = pathTo(m, tx, ty);
  for (const [x, y] of path) {
    if (other && x === tx && y === ty) break;
    u.x = x; u.y = y; Sfx.step(); await wait(85);
  }
  if (other) { other.x = u.preMove.x; other.y = u.preMove.y; u.x = tx; u.y = ty; Sfx.swap(); await wait(120); }
  C.busy = false;
  return true;
}
function undoMove(u) {
  if (!u.preMove) return;
  if (u.preMove.swap) { const o = C.units.find(x => x.uid === u.preMove.swap); if (o) { o.x = u.x; o.y = u.y; } }
  u.x = u.preMove.x; u.y = u.preMove.y; u.rx = u.x; u.ry = u.y;
  u.hasMove = true; u.moveBudget = u.preMove.budget; u.preMove = null;
}

/* ---------- zones ---------- */
function areaTiles(cx, cy, area) {
  const out = [];
  const add = (x, y) => { if (inB(x, y)) out.push([x, y]); };
  switch (area) {
    case 'single': add(cx, cy); break;
    case 'plus': add(cx, cy); for (const [dx, dy] of DIR4) add(cx + dx, cy + dy); break;
    case 'square': for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) add(cx + dx, cy + dy); break;
    case 'ring4': for (const [dx, dy] of DIR4) add(cx + dx, cy + dy); break;
    case 'ring8': for (const [dx, dy] of DIR8) add(cx + dx, cy + dy); break;
    case 'diamond2': for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if ((dx || dy) && Math.abs(dx) + Math.abs(dy) <= 2) add(cx + dx, cy + dy); break;
    case 'vortex': for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) add(cx + dx, cy + dy); break;
  }
  return out;
}

/* ---------- ciblage des compétences ---------- */
function skillTargets(u, s) {
  const out = [];
  const seen = new Set();
  const add = (x, y) => { if (inB(x, y) && !seen.has(key(x, y))) { seen.add(key(x, y)); out.push([x, y]); } };
  switch (s.type) {
    case 'line':
      for (const [dx, dy] of DIR4) {
        for (let i = 1; i <= s.range; i++) {
          const x = u.x + dx * i, y = u.y + dy * i; if (!inB(x, y)) break;
          add(x, y); if (isRock(x, y)) break; const o = unitAt(x, y); if (o && !s.pierce) break;
        }
      }
      break;
    case 'dash':
      for (const [dx, dy] of DIR4) {
        for (let i = 1; i <= s.range; i++) {
          const x = u.x + dx * i, y = u.y + dy * i; if (!inB(x, y) || isRock(x, y) || isPit(x, y)) break;
          add(x, y); if (unitAt(x, y)) break;
        }
      }
      break;
    case 'point':
      for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
        if (man(u.x, u.y, x, y) > s.range) continue;
        if (s.needUnit) { const o = unitAt(x, y); if (!o || o.team === 'hero') continue; }
        add(x, y);
      }
      break;
    case 'self':
      add(u.x, u.y); for (const [x, y] of areaTiles(u.x, u.y, s.area)) add(x, y);
      break;
    case 'leap':
      for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
        if (man(u.x, u.y, x, y) > s.range || (x === u.x && y === u.y)) continue;
        if (!walkable(x, y) || unitAt(x, y)) continue; add(x, y);
      }
      break;
    case 'swap':
      for (const o of C.units) if (!o.dead && o !== u && !o.immunePush && man(u.x, u.y, o.x, o.y) <= s.range) add(o.x, o.y);
      break;
    case 'place':
      for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
        if (man(u.x, u.y, x, y) > s.range || unitAt(x, y)) continue;
        const t = tile(x, y); if (t.t !== 'floor' && !(s.place !== 'wall' && t.t === 'lava')) continue;
        if (t.trap || C.bombs.some(b => b.x === x && b.y === y)) continue;
        add(x, y);
      }
      break;
    case 'ally':
      for (const h of heroUnits()) { if (s.otherOnly && h === u) continue; if (man(u.x, u.y, h.x, h.y) <= s.range) add(h.x, h.y); }
      break;
  }
  return out;
}
/* plan détaillé (zone touchée, cibles) pour une case visée */
function planSkill(u, s, tx, ty) {
  const valid = skillTargets(u, s).some(([x, y]) => x === tx && y === ty);
  if (!valid) return null;
  const p = { tiles: [], hits: [], dir: [0, 0], land: null };
  const canHit = o => o && !o.dead && o !== u && (o.team !== 'hero' || s.ff);
  switch (s.type) {
    case 'line': {
      const dx = Math.sign(tx - u.x), dy = Math.sign(ty - u.y); p.dir = [dx, dy];
      for (let i = 1; i <= s.range; i++) {
        const x = u.x + dx * i, y = u.y + dy * i; if (!inB(x, y)) break;
        p.tiles.push([x, y]); if (isRock(x, y)) break;
        const o = unitAt(x, y); if (o) { p.hits.push(o); if (!s.pierce) break; }
      }
      p.hits = p.hits.filter(o => o.team !== 'hero' || s.ff || s.pierce);
      break;
    }
    case 'dash': {
      const dx = Math.sign(tx - u.x), dy = Math.sign(ty - u.y); p.dir = [dx, dy];
      let lx = u.x, ly = u.y;
      for (let i = 1; i <= s.range; i++) {
        const x = u.x + dx * i, y = u.y + dy * i; if (!inB(x, y) || isRock(x, y) || isPit(x, y)) break;
        const o = unitAt(x, y); p.tiles.push([x, y]); if (o) { if (o.team !== 'hero') p.hits.push(o); break; }
        lx = x; ly = y;
      }
      p.land = [lx, ly];
      break;
    }
    case 'point': {
      p.tiles = areaTiles(tx, ty, s.area); p.center = [tx, ty];
      for (const [x, y] of p.tiles) { const o = unitAt(x, y); if (canHit(o)) p.hits.push(o); }
      break;
    }
    case 'self': {
      p.tiles = areaTiles(u.x, u.y, s.area);
      for (const [x, y] of p.tiles) { const o = unitAt(x, y); if (canHit(o)) p.hits.push(o); }
      break;
    }
    case 'leap': {
      p.land = [tx, ty]; p.tiles = [[tx, ty]].concat(s.area !== 'none' ? areaTiles(tx, ty, s.area) : []);
      if (s.area !== 'none') for (const [x, y] of areaTiles(tx, ty, s.area)) { const o = unitAt(x, y); if (o && o !== u && o.team !== 'hero') p.hits.push(o); }
      break;
    }
    case 'swap': case 'ally': case 'place':
      p.tiles = [[tx, ty]]; { const o = unitAt(tx, ty); if (o && s.type !== 'place') p.hits.push(o); }
      break;
  }
  return p;
}

/* ---------- textes flottants & effets ---------- */
function ftext(x, y, txt, color, big) { C.texts.push({ x, y, txt, color, t0: performance.now(), big: !!big }); }
function fx(o) { o.t0 = performance.now(); C.fx.push(o); }
function lunge(u, tx, ty) { const dx = tx - u.x, dy = ty - u.y, l = Math.hypot(dx, dy) || 1; u.ox = dx / l * 0.35; u.oy = dy / l * 0.35; }

/* ---------- dégâts / soins ---------- */
function healHero(hi, pts) {
  if (pts <= 0) return;
  const h = S.heroes[hi]; const before = h.pct;
  h.pct = Math.min(maxPct(), h.pct + pts);
  const u = heroUnit(hi);
  if (u && h.pct > before) ftext(u.x, u.y, `+${Math.round(h.pct - before)}%`, '#6dffae');
}
async function damageHero(u, pts, opts) {
  if (u.dead || C.ended || !(pts > 0)) return;
  opts = opts || {};
  if (u.shield > 0) { u.shield--; ftext(u.x, u.y, 'Bloqué', '#9fe0ff'); Sfx.block(); fx({ type: 'ring', x: u.x, y: u.y, color: '#9fe0ff', dur: 400 }); await wait(120); return; }
  const h = S.heroes[u.hero];
  const amount = Math.max(1, Math.round(pts * G().taken));
  h.pct = Math.max(FLOOR_PCT, h.pct - amount);
  u.flash = 1; C.shake = Math.min(10, C.shake + 4 + amount * 0.3);
  ftext(u.x, u.y, `−${amount}%`, '#ff6b6b', true);
  Sfx.hurt();
  if (C.boss && h.pct <= FLOOR_PCT) { C.failed = true; }
  await wait(140);
  if (opts.attacker && opts.melee && G().riposte && !opts.attacker.dead) {
    await wait(80); fx({ type: 'slash', x: opts.attacker.x, y: opts.attacker.y, color: '#ffd166', dur: 250 });
    await hurt(opts.attacker, 6, u.hero);
  }
}
/* dégâts « bruts » (PV pour ennemis/objets, % pour héros) */
async function hurt(u, amt, credit, opts) {
  if (!u || u.dead || C.ended) return;
  if (u.team === 'hero') return damageHero(u, amt, opts);
  if (u.shield > 0) { u.shield--; ftext(u.x, u.y, 'Bloqué', '#9fe0ff'); Sfx.block(); return; }
  amt = Math.max(1, Math.round(amt));
  u.hp -= amt; u.flash = 1;
  ftext(u.x, u.y, `−${amt}`, u.boss ? '#ffd166' : '#fff');
  if (u.team === 'enemy' && credit != null) C.shake = Math.min(8, C.shake + 1.5);
  if (u.hp <= 0) await kill(u, credit);
}
async function kill(u, credit) {
  if (u.dead) return;
  u.dead = true; u.hp = 0;
  fx({ type: 'burst', x: u.x, y: u.y, color: u.team === 'obj' ? '#ffb347' : (u.boss ? BOSSES[u.kind].color : ENEMIES[u.kind] ? ENEMIES[u.kind].color : '#fff'), dur: 500 });
  if (u.team === 'enemy') {
    Sfx.kill();
    S.stats.kills++;
    const g = G();
    if (credit != null && credit >= 0) {
      C.kills[credit]++;
      healHero(credit, g.heal * g.healMult);
      if (g.lien) healHero(1 - credit, 3);
      const hu = heroUnit(credit);
      if (g.adrenaline && hu && C.phase === 'hero' && !hu.adrUsed) { hu.adrUsed = true; hu.actions++; ftext(hu.x, hu.y, 'Adrénaline !', '#ffd166'); }
    }
    if (u.kind === 'kamikaze') await explode(u.x, u.y, 'ring8', u.dmg, u.dmg, credit, '#ff5d8f');
    if (u.boss && u.kind === 'hydre') {
      for (const o of enemies()) if (o.kind === 'hydre') { o.enr *= 1.4; ftext(o.x, o.y, 'Rage !', '#ff6b6b'); }
    }
    if (g.explode && u.kind !== 'kamikaze') await explode(u.x, u.y, 'ring8', 5, 4, credit, '#ffb347', true);
  } else if (u.team === 'obj' && u.kind === 'baril') {
    await explode(u.x, u.y, 'ring8', 10, 8, credit, '#ffb347');
  }
  await wait(60);
  checkEnd();
}
async function explode(cx, cy, area, hpDmg, pctDmg, credit, color, small) {
  fx({ type: 'boom', x: cx, y: cy, color: color || '#ffb347', dur: 500, r: area === 'square' || area === 'ring8' ? 1.5 : 1 });
  Sfx.boom(small); C.shake = Math.min(14, C.shake + (small ? 3 : 7));
  await wait(110);
  for (const [x, y] of areaTiles(cx, cy, area)) {
    const o = unitAt(x, y); if (!o) continue;
    await hurt(o, o.team === 'hero' ? pctDmg : hpDmg, credit);
    if (C.ended) return;
  }
}
async function collide(u, o, credit) {
  const g = G();
  fx({ type: 'spark', x: u.x, y: u.y, color: '#fff', dur: 300 });
  Sfx.thud();
  await hurt(u, u.team === 'hero' ? Math.round(4 * g.coll / 5) : g.coll, credit);
  if (o) await hurt(o, o.team === 'hero' ? Math.round(4 * g.coll / 5) : g.coll, credit);
}
async function triggerTrap(u) {
  const t = tile(u.x, u.y); if (!t.trap || u.team !== 'enemy') return false;
  const tr = t.trap; t.trap = null;
  fx({ type: 'slash', x: u.x, y: u.y, color: '#ffd166', dur: 300 }); Sfx.trap();
  ftext(u.x, u.y, 'Piège !', '#ffd166');
  await hurt(u, tr.dmg, tr.owner);
  if (!u.dead) u.stun = Math.max(u.stun, 1);
  return true;
}
async function pushUnit(u, dx, dy, n, credit) {
  if (!u || u.dead || u.immunePush || n <= 0 || (dx === 0 && dy === 0)) return;
  for (let i = 0; i < n; i++) {
    const nx = u.x + dx, ny = u.y + dy;
    if (!inB(nx, ny) || isRock(nx, ny)) { await collide(u, null, credit); return; }
    const o = unitAt(nx, ny);
    if (o) { await collide(u, o, credit); return; }
    if (isPit(nx, ny)) {
      if (u.team === 'hero') { await collide(u, null, credit); return; }
      u.x = nx; u.y = ny; u.falling = performance.now(); Sfx.fall();
      ftext(nx, ny, 'Chute !', '#c9b6ff');
      await wait(260); await kill(u, credit); return;
    }
    u.x = nx; u.y = ny; await wait(75);
    if (await triggerTrap(u)) return;
  }
}
async function pullUnit(u, toward, credit) {
  if (!u || u.dead || u.immunePush) return;
  for (let k = 0; k < 10; k++) {
    if (man(u.x, u.y, toward.x, toward.y) <= 1) return;
    const dx = Math.sign(toward.x - u.x), dy = Math.sign(toward.y - u.y);
    const sx = Math.abs(toward.x - u.x) >= Math.abs(toward.y - u.y) ? dx : 0, sy = sx ? 0 : dy;
    const nx = u.x + sx, ny = u.y + sy;
    if (!inB(nx, ny) || isRock(nx, ny) || unitAt(nx, ny)) return;
    if (isPit(nx, ny)) { if (u.team === 'hero') return; u.x = nx; u.y = ny; u.falling = performance.now(); Sfx.fall(); ftext(nx, ny, 'Chute !', '#c9b6ff'); await wait(260); await kill(u, credit); return; }
    u.x = nx; u.y = ny; await wait(65);
    if (await triggerTrap(u)) return;
  }
}

/* ---------- utilisation d'une compétence par un héros ---------- */
async function heroHit(hu, o, s, dir, mult, opts) {
  if (!o || o.dead || C.ended) return;
  opts = opts || {};
  const hi = hu.hero;
  if (o.team === 'hero') {
    if (o === hu) return;
    if (s.ff) await damageHero(o, Math.max(1, Math.round(s.dmg * mult * 0.5)));
    return;
  }
  const ox = o.x, oy = o.y;
  let dmg = s.dmg * mult * S.heroes[hi].pct / 100 * furyMult(hi);
  if (s.exec && o.hp < o.maxHp * 0.5) dmg *= 1 + s.exec;
  if (s.dmg > 0) {
    await hurt(o, dmg, hi);
    if (s.lifesteal && !opts.secondary && o.team === 'enemy') healHero(hi, s.lifesteal);
  }
  if (!o.dead && C.ended === false) {
    if (s.stun) { o.stun = Math.max(o.stun, s.stun); ftext(o.x, o.y, 'Étourdi', '#9fe0ff'); }
    if (s.poison && o.team === 'enemy') { o.poison = { dmg: s.poison, turns: 3, owner: hi }; ftext(o.x, o.y, 'Poison', '#9dff6b'); }
    if (s.push && !opts.noPush) {
      let [dx, dy] = dir;
      if (opts.away) { dx = Math.sign(o.x - opts.away[0]); dy = Math.sign(o.y - opts.away[1]); }
      await pushUnit(o, dx, dy, s.push, hi);
    }
  }
  if (opts.secondary) return;
  if (s.splash > 0 && s.dmg > 0) {
    for (const [ddx, ddy] of DIR4) {
      const n = unitAt(ox + ddx, oy + ddy); if (!n || n === hu || n.team === 'hero' || n === o) continue;
      fx({ type: 'spark', x: n.x, y: n.y, color: '#ffd166', dur: 250 });
      await heroHit(hu, n, s, [ddx, ddy], mult * s.splash, { secondary: true, noPush: true });
    }
  }
  if (s.echo > 0 && !o.dead) {
    await wait(160); fx({ type: 'slash', x: o.x, y: o.y, color: HEROES[S.heroes[hi].key].color, dur: 250 });
    await heroHit(hu, o, s, dir, mult * s.echo, { secondary: true, noPush: true });
  }
  if (s.chain > 0) {
    const hitSet = new Set([o.uid]); let from = { x: ox, y: oy };
    for (let c = 0; c < s.chain; c++) {
      let best = null, bd = 99;
      for (const e of C.units) if (!e.dead && e.team !== 'hero' && !hitSet.has(e.uid)) { const d = man(from.x, from.y, e.x, e.y); if (d <= 3 && d < bd) { bd = d; best = e; } }
      if (!best) break;
      hitSet.add(best.uid);
      fx({ type: 'bolt', x: from.x, y: from.y, x2: best.x, y2: best.y, color: '#bfe6ff', dur: 300 }); Sfx.zap();
      await wait(120);
      const nx = best.x, ny = best.y;
      await heroHit(hu, best, s, [Math.sign(best.x - from.x), Math.sign(best.y - from.y)], mult * 0.75, { secondary: true, noPush: true });
      from = { x: nx, y: ny };
      if (C.ended) return;
    }
  }
}

async function useSkill(hu, slot, tx, ty) {
  const hi = hu.hero, inst = S.heroes[hi].slots[slot]; if (!inst) return false;
  const s = skillStats(hi, slot); const p = planSkill(hu, s, tx, ty);
  if (!p || hu.actions <= 0 || (inst.cdLeft || 0) > 0) return false;
  C.busy = true;
  inst.cdLeft = s.cd;
  hu.actions--; hu.preMove = null;
  const col = HEROES[S.heroes[hi].key].color;
  switch (s.type) {
    case 'line': {
      const last = p.tiles[p.tiles.length - 1] || [hu.x + p.dir[0], hu.y + p.dir[1]];
      if (s.range <= 1) { lunge(hu, last[0], last[1]); Sfx.swing(); fx({ type: 'slash', x: last[0], y: last[1], color: col, dur: 260 }); await wait(110); }
      else {
        Sfx.shoot(s.key);
        const end = p.hits.length && !s.pierce ? [p.hits[0].x, p.hits[0].y] : last;
        fx({ type: 'proj', x: hu.x, y: hu.y, x2: end[0], y2: end[1], color: col, dur: 200, kind: s.icon });
        await wait(190);
      }
      if (p.hits.length === 0 && p.tiles.length && isRock(last[0], last[1])) fx({ type: 'spark', x: last[0], y: last[1], color: '#ccc', dur: 250 });
      for (const o of p.hits) {
        if (s.pull) { await heroHit(hu, o, s, p.dir, 1, { noPush: true }); if (!o.dead) await pullUnit(o, hu, hi); }
        else await heroHit(hu, o, s, p.dir, 1);
        if (C.ended) break;
      }
      break;
    }
    case 'dash': {
      const [lx, ly] = p.land; Sfx.dash();
      while (hu.x !== lx || hu.y !== ly) { hu.x += p.dir[0]; hu.y += p.dir[1]; await wait(55); }
      if (p.hits[0]) { lunge(hu, p.hits[0].x, p.hits[0].y); fx({ type: 'slash', x: p.hits[0].x, y: p.hits[0].y, color: col, dur: 260 }); await heroHit(hu, p.hits[0], s, p.dir, 1); }
      break;
    }
    case 'point': {
      if (s.area === 'vortex') {
        fx({ type: 'vortex', x: tx, y: ty, color: col, dur: 600 }); Sfx.vortex(); await wait(200);
        const list = C.units.filter(o => !o.dead && o !== hu && cheb(o.x, o.y, tx, ty) <= 2).sort((a, b) => man(a.x, a.y, tx, ty) - man(b.x, b.y, tx, ty));
        for (const o of list) {
          if (o.dead) continue;
          if (o.team !== 'hero' && s.dmg > 0) await heroHit(hu, o, s, [0, 0], 1, { noPush: true });
          if (o.dead || o.immunePush || (o.x === tx && o.y === ty)) continue;
          const dx = Math.sign(tx - o.x), dy = Math.sign(ty - o.y);
          const sx = Math.abs(tx - o.x) >= Math.abs(ty - o.y) ? dx : 0, sy = sx ? 0 : dy;
          const nx = o.x + sx, ny = o.y + sy;
          if (!inB(nx, ny) || isRock(nx, ny) || unitAt(nx, ny)) continue;
          if (isPit(nx, ny)) { if (o.team === 'hero') continue; o.x = nx; o.y = ny; o.falling = performance.now(); Sfx.fall(); await wait(240); await kill(o, hi); continue; }
          o.x = nx; o.y = ny; await wait(70);
          if (o.team === 'enemy') await triggerTrap(o);
          if (C.ended) break;
        }
        break;
      }
      if (s.key === 'foudre' || s.icon === 'bolt') { fx({ type: 'bolt', x: tx, y: ty - 3, x2: tx, y2: ty, color: '#bfe6ff', dur: 260 }); Sfx.zap(); }
      else if (s.area !== 'single') { fx({ type: 'boom', x: tx, y: ty, color: col, dur: 450, r: 1.2 }); Sfx.boom(true); }
      else { fx({ type: 'proj', x: hu.x, y: hu.y, x2: tx, y2: ty, color: col, dur: 180, arc: true }); Sfx.shoot(s.key); await wait(170); fx({ type: 'spark', x: tx, y: ty, color: col, dur: 260 }); }
      await wait(100);
      if (s.fire) for (const [x, y] of p.tiles) { const t = tile(x, y); if (t.t !== 'rock' && t.t !== 'pit') { t.fire = s.fire + 1; t.fireOwner = hi; } }
      for (const o of p.hits) { await heroHit(hu, o, s, [Math.sign(o.x - hu.x), Math.sign(o.y - hu.y)], 1, { away: p.center[0] === o.x && p.center[1] === o.y ? [hu.x, hu.y] : p.center }); if (C.ended) break; }
      break;
    }
    case 'self': {
      if (s.taunt) {
        hu.shield = Math.min(2, hu.shield + (s.shield || 0));
        fx({ type: 'ring', x: hu.x, y: hu.y, color: '#ff6b6b', dur: 600, r: s.taunt }); Sfx.taunt();
        for (const e of enemies()) if (man(e.x, e.y, hu.x, hu.y) <= s.taunt) { e.taunt = hu.uid; ftext(e.x, e.y, '!', '#ff6b6b'); }
        break;
      }
      fx({ type: 'ring', x: hu.x, y: hu.y, color: col, dur: 450, r: s.area === 'diamond2' ? 2.2 : 1.4 }); Sfx.spin();
      await wait(130);
      for (const o of p.hits) { await heroHit(hu, o, s, [Math.sign(o.x - hu.x), Math.sign(o.y - hu.y)], 1); if (C.ended) break; }
      break;
    }
    case 'leap': {
      Sfx.dash(); hu.jump = performance.now();
      hu.x = tx; hu.y = ty; await wait(260);
      if (s.shield) { hu.shield = Math.min(2, hu.shield + s.shield); ftext(hu.x, hu.y, 'Bouclier', '#9fe0ff'); }
      if (s.dmg > 0) { fx({ type: 'ring', x: tx, y: ty, color: col, dur: 400, r: 1.2 }); Sfx.boom(true); C.shake += 3; }
      for (const o of p.hits) { await heroHit(hu, o, s, [Math.sign(o.x - tx), Math.sign(o.y - ty)], 1); if (C.ended) break; }
      break;
    }
    case 'swap': {
      const o = p.hits[0]; if (!o) break;
      Sfx.swap(); fx({ type: 'ring', x: hu.x, y: hu.y, color: col, dur: 300 }); fx({ type: 'ring', x: o.x, y: o.y, color: col, dur: 300 });
      const ax = hu.x, ay = hu.y; hu.x = o.x; hu.y = o.y; o.x = ax; o.y = ay; await wait(200);
      if (o.team !== 'hero' && s.dmg > 0) await heroHit(hu, o, s, [0, 0], 1, { noPush: true });
      if (!o.dead && o.team === 'enemy') await triggerTrap(o);
      break;
    }
    case 'place': {
      const t = tile(tx, ty);
      if (s.place === 'wall') { t.t = 'rock'; t.ttl = 3; fx({ type: 'burst', x: tx, y: ty, color: '#bbb', dur: 350 }); Sfx.thud(); }
      else if (s.place === 'trap') { t.trap = { dmg: Math.round(s.dmg * S.heroes[hi].pct / 100), owner: hi }; Sfx.trap(); fx({ type: 'ring', x: tx, y: ty, color: '#ffd166', dur: 300 }); }
      else if (s.place === 'bomb') { C.bombs.push({ x: tx, y: ty, dmg: Math.round(s.dmg * S.heroes[hi].pct / 100 * furyMult(hi)), owner: hi }); Sfx.trap(); }
      await wait(150);
      break;
    }
    case 'ally': {
      const o = p.hits[0]; if (!o) break;
      if (s.shield) { o.shield = Math.min(2, o.shield + s.shield); ftext(o.x, o.y, 'Bouclier', '#9fe0ff'); fx({ type: 'ring', x: o.x, y: o.y, color: '#9fe0ff', dur: 450 }); Sfx.block(); }
      if (s.order) { o.actions = Math.max(o.actions, 1); o.hasMove = true; o.moveBudget = heroMove(o.hero); o.adrUsed = false; ftext(o.x, o.y, 'Rejoue !', '#ffd166'); Sfx.order(); }
      await wait(150);
      break;
    }
  }
  if (!hu.dead && s.vif) { if (hu.hasMove) hu.moveBudget += s.vif; else { hu.hasMove = true; hu.moveBudget = s.vif; } ftext(hu.x, hu.y, `+${s.vif} dépl.`, '#9fe0ff'); }
  C.busy = false;
  checkEnd();
  return true;
}

/* ---------- fin de combat ---------- */
function checkEnd() {
  if (!C || C.ended) return C && C.ended;
  if (C.failed) { C.ended = 'fail'; return true; }
  const en = enemies();
  if (C.boss) { if (!en.some(e => e.boss)) { C.ended = 'win'; for (const e of en) { e.dead = true; fx({ type: 'burst', x: e.x, y: e.y, color: '#888', dur: 400 }); } return true; } }
  else if (en.length === 0) { C.ended = 'win'; return true; }
  return false;
}

/* ---------- phases ---------- */
function heroPhaseStart(first) {
  C.phase = 'hero';
  const g = G();
  for (const u of heroUnits()) {
    u.actions = g.actions; u.hasMove = true; u.moveBudget = heroMove(u.hero); u.preMove = null; u.adrUsed = false;
  }
  if (!first) {
    for (const h of S.heroes) for (const s of h.slots) if (s && s.cdLeft > 0) s.cdLeft--;
  }
  C.sel = heroUnit(0) ? 0 : 1; C.mode = null; C.slot = -1;
}
async function heroPhaseHazards() {
  // dégâts en début de tour des héros : lave, feu, drain (Colère)
  const g = G();
  for (const u of heroUnits()) {
    const t = tile(u.x, u.y);
    if (t.t === 'lava') { ftext(u.x, u.y, 'Lave', '#ff9a3d'); await damageHero(u, 5); }
    else if (t.fire > 0) { ftext(u.x, u.y, 'Feu', '#ff9a3d'); await damageHero(u, 4); }
    if (g.drain) await damageHero(u, g.drain);
    if (C.ended || C.failed) break;
  }
  checkEnd();
}

async function enemyPhase() {
  C.phase = 'enemy'; C.mode = null; C.busy = true; UI.refreshCombat();
  await wait(200);
  // 1. bombes des héros
  const bombs = C.bombs; C.bombs = [];
  for (const b of bombs) { await explode(b.x, b.y, 'square', b.dmg, Math.round(b.dmg * 0.5), b.owner, '#ffb347'); if (C.ended) return finishCombat(); }
  // 2. attaques annoncées
  const tel = C.telegraphs; C.telegraphs = [];
  for (const t of tel) {
    if (t.owner && !C.units.some(u => u.uid === t.owner && !u.dead)) continue;
    await resolveTelegraph(t); if (checkEnd()) return finishCombat();
  }
  // 3. poison, feu, lave sur les ennemis
  for (const e of enemies()) {
    if (e.poison) { fx({ type: 'spark', x: e.x, y: e.y, color: '#9dff6b', dur: 250 }); await hurt(e, e.poison.dmg, e.poison.owner); if (e.poison && --e.poison.turns <= 0) e.poison = null; }
    if (e.dead) continue;
    const t = tile(e.x, e.y);
    if (t.t === 'lava') await hurt(e, 6, null);
    else if (t.fire > 0) await hurt(e, 5, t.fireOwner);
    if (C.ended) return finishCombat();
  }
  if (checkEnd()) return finishCombat();
  // 4. chaque ennemi agit
  const order = enemies().sort((a, b) => (a.boss ? 1 : 0) - (b.boss ? 1 : 0) || a.x - b.x);
  for (const e of order) {
    if (e.dead) continue;
    C.acting = e.uid;
    await enemyAct(e);
    C.acting = null;
    e.taunt = null;
    if (checkEnd()) return finishCombat();
  }
  // 5. renforts
  if (C.card.trait === 'renforts' && C.turn === 2 && !C.reinf) {
    C.reinf = true;
    for (let i = 0; i < 2; i++) {
      const spots = []; for (let y = 0; y < GRID_H; y++) for (const x of [GRID_W - 1, GRID_W - 2]) if (walkable(x, y) && !unitAt(x, y)) spots.push([x, y]);
      if (!spots.length) break; const [x, y] = pick(rnd, spots);
      const e = spawnEnemy(pickEnemy(rnd, S.depth), x, y); e.alpha = 0; C.units.push(e); ftext(x, y, 'Renfort', '#ff6b6b');
    }
    Sfx.summon(); await wait(250);
  }
  // 6. tempête : annonce 2 impacts pour le prochain tour
  if (G().storm) {
    for (let i = 0; i < 2; i++) {
      const x = Math.floor(rnd() * GRID_W), y = Math.floor(rnd() * GRID_H);
      C.telegraphs.push({ tiles: [[x, y]], hp: 10, pct: 8, owner: null, label: 'Foudre', color: '#bfe6ff', kind: 'bolt' });
    }
  }
  // 7. fin du tour : feu, murs temporaires
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
    const t = C.grid[y][x];
    if (t.fire > 0) t.fire--;
    if (t.ttl > 0 && --t.ttl === 0 && t.t === 'rock') t.t = 'floor';
  }
  C.turn++;
  heroPhaseStart(false);
  await heroPhaseHazards();
  if (C.ended) return finishCombat();
  C.busy = false;
  UI.refreshCombat();
}

async function resolveTelegraph(t) {
  const col = t.color || '#ff5a5a';
  if (t.kind === 'laser') { const a = t.tiles[0], b = t.tiles[t.tiles.length - 1]; fx({ type: 'laser', x: a[0], y: a[1], x2: b[0], y2: b[1], color: col, dur: 450 }); Sfx.laser(); }
  else if (t.kind === 'bolt') { const [x, y] = t.tiles[0]; fx({ type: 'bolt', x, y: y - 3, x2: x, y2: y, color: col, dur: 260 }); Sfx.zap(); }
  else { const c = t.center || t.tiles[0]; fx({ type: 'boom', x: c[0], y: c[1], color: col, dur: 500, r: 1.4 }); Sfx.boom(); }
  C.shake = Math.min(14, C.shake + 6);
  await wait(130);
  for (const [x, y] of t.tiles) {
    const o = unitAt(x, y);
    if (o) await hurt(o, o.team === 'hero' ? t.pct : t.hp, null);
    if (t.fire) { const tt = tile(x, y); if (tt.t !== 'rock' && tt.t !== 'pit') { tt.fire = t.fire; tt.fireOwner = null; } }
    if (C.ended) return;
  }
}

async function finishCombat() {
  if (C.finishing) return; C.finishing = true;
  C.busy = true;
  const res = C.ended || 'flee';
  await wait(450);
  if (res === 'win') { Sfx.win(); C.banner = { txt: C.boss ? 'BOSS VAINCU !' : 'SALLE NETTOYÉE', color: C.boss ? '#ffd166' : '#6dffae', t0: performance.now() }; }
  else if (res === 'fail') { Sfx.fail(); C.banner = { txt: 'LE BOSS S’ENFUIT…', color: '#ff6b6b', t0: performance.now() }; }
  await wait(1300);
  roomComplete(res);
}

/* =========================================================
   IA ENNEMIE
   ========================================================= */
function targetHeroes(e) {
  let hs = heroUnits();
  if (e.taunt) { const t = hs.find(h => h.uid === e.taunt); if (t) hs = [t]; }
  return hs;
}
function hpct(h) { return S.heroes[h.hero].pct; }
/* première unité touchée en ligne depuis (x,y) */
function lineFirst(x, y, dx, dy, range) {
  for (let i = 1; i <= range; i++) {
    const nx = x + dx * i, ny = y + dy * i; if (!inB(nx, ny) || isRock(nx, ny)) return null;
    const o = unitAt(nx, ny); if (o) return o;
  }
  return null;
}
function enemyReach(e) {
  const m = bfs(e.x, e.y, e.move + G().enemyMove, 'enemy', false);
  for (const [k, n] of [...m]) { const o = unitAt(n.x, n.y); if (o && o !== e) m.delete(k); }
  return m;
}
function tilePenalty(x, y) { const t = tile(x, y); return (t.t === 'lava' ? 40 : 0) + (t.fire > 0 ? 25 : 0) + (C.telegraphs.some(tl => tl.tiles.some(([a, b]) => a === x && b === y)) ? 30 : 0); }
async function walkEnemy(e, map, tx, ty) {
  const path = pathTo(map, tx, ty);
  for (const [x, y] of path) {
    e.x = x; e.y = y; await wait(80);
    if (await triggerTrap(e)) return false;
  }
  return true;
}
function approachTile(e, map, goals) {
  const f = distField(goals);
  let best = null, bs = 1e9;
  for (const n of map.values()) {
    const sc = f[key(n.x, n.y)] * 10 + tilePenalty(n.x, n.y) + n.d * 0.1;
    if (sc < bs) { bs = sc; best = n; }
  }
  return best;
}
async function meleeAttack(e, h, dmg, push) {
  lunge(e, h.x, h.y); Sfx.enemyHit(); fx({ type: 'slash', x: h.x, y: h.y, color: '#ff6b6b', dur: 250 });
  await wait(120);
  await damageHero(h, dmg * (e.enr || 1), { attacker: e, melee: true });
  if (push && !h.dead && !C.ended) await pushUnit(h, Math.sign(h.x - e.x), Math.sign(h.y - e.y), push, null);
}
async function rangedAttack(e, h, dmg, color) {
  fx({ type: 'proj', x: e.x, y: e.y, x2: h.x, y2: h.y, color: color || '#ffb36b', dur: 200 }); Sfx.enemyShoot();
  await wait(200);
  await damageHero(h, dmg * (e.enr || 1));
}

async function aiMelee(e, dmg, push, noAttack) {
  const hs = targetHeroes(e); if (!hs.length) return;
  const map = enemyReach(e);
  let best = null, bs = -1e9;
  for (const n of map.values()) for (const h of hs) {
    if (man(n.x, n.y, h.x, h.y) !== 1) continue;
    const sc = 100 - n.d * 2 - hpct(h) * 0.25 - tilePenalty(n.x, n.y);
    if (sc > bs) { bs = sc; best = { n, h }; }
  }
  if (best) {
    if (!(await walkEnemy(e, map, best.n.x, best.n.y)) || e.dead) return;
    if (!noAttack && man(e.x, e.y, best.h.x, best.h.y) === 1) await meleeAttack(e, best.h, dmg, push);
    return;
  }
  const goals = []; for (const h of hs) for (const [dx, dy] of DIR4) goals.push([h.x + dx, h.y + dy]);
  const t = approachTile(e, map, goals); if (t) await walkEnemy(e, map, t.x, t.y);
}
function rangedSpots(e, map, hs, range) {
  const out = [];
  for (const n of map.values()) for (const [dx, dy] of DIR4) {
    const o = lineFirst(n.x, n.y, dx, dy, range);
    if (o && o.team === 'hero' && hs.includes(o)) out.push({ n, h: o });
  }
  return out;
}
async function aiRanged(e, dmg, range, color) {
  const hs = targetHeroes(e); if (!hs.length) return;
  const map = enemyReach(e);
  const spots = rangedSpots(e, map, hs, range);
  if (spots.length) {
    let best = null, bs = -1e9;
    for (const sp of spots) {
      const near = Math.min(...heroUnits().map(h => man(h.x, h.y, sp.n.x, sp.n.y)));
      const sc = 100 - hpct(sp.h) * 0.25 + Math.min(near, 3) * 6 - sp.n.d * 1.5 - tilePenalty(sp.n.x, sp.n.y);
      if (sc > bs) { bs = sc; best = sp; }
    }
    if (!(await walkEnemy(e, map, best.n.x, best.n.y)) || e.dead) return;
    const o = lineFirst(e.x, e.y, Math.sign(best.h.x - e.x), Math.sign(best.h.y - e.y), range);
    if (o === best.h && (e.x === best.h.x || e.y === best.h.y)) await rangedAttack(e, best.h, dmg, color);
    return;
  }
  const goals = []; for (const h of hs) for (const [dx, dy] of DIR4) for (let i = 2; i <= range; i++) goals.push([h.x + dx * i, h.y + dy * i]);
  if (e.move > 0) { const t = approachTile(e, map, goals); if (t) await walkEnemy(e, map, t.x, t.y); }
}
function lowestHero(hs) { return hs.slice().sort((a, b) => hpct(a) - hpct(b))[0]; }

async function enemyAct(e) {
  if (e.stun > 0) { e.stun--; ftext(e.x, e.y, 'Étourdi', '#9fe0ff'); await wait(200); return; }
  e.bt++;
  if (e.alpha < 1) e.alpha = 1;
  if (e.ai === 'boss') return bossAct(e);
  switch (e.ai) {
    case 'melee': return aiMelee(e, e.dmg, e.push);
    case 'ranged': return aiRanged(e, e.dmg, e.range);
    case 'artillery': {
      const hs = targetHeroes(e); if (!hs.length) return;
      const map = enemyReach(e);
      let best = null, bs = 1e9;
      for (const n of map.values()) {
        const dn = Math.min(...hs.map(h => man(h.x, h.y, n.x, n.y)));
        const sc = Math.abs(dn - 4) * 5 + n.d + tilePenalty(n.x, n.y);
        if (sc < bs) { bs = sc; best = n; }
      }
      if (best && !(await walkEnemy(e, map, best.x, best.y))) return;
      if (e.dead) return;
      const inR = hs.filter(h => man(h.x, h.y, e.x, e.y) <= e.range);
      if (!inR.length) return;
      const h = lowestHero(inR);
      C.telegraphs.push({ tiles: areaTiles(h.x, h.y, 'plus'), center: [h.x, h.y], hp: e.dmg, pct: e.dmg, owner: e.uid, label: 'Obus', color: '#ff7a4a' });
      fx({ type: 'proj', x: e.x, y: e.y, x2: h.x, y2: h.y, color: '#ff7a4a', dur: 300, arc: true }); Sfx.mark();
      await wait(250); return;
    }
    case 'kamikaze': {
      if (e.armed) { ftext(e.x, e.y, 'BOUM', '#ff5d8f', true); e.dead = true; await explode(e.x, e.y, 'ring8', e.dmg, e.dmg, null, '#ff5d8f'); checkEnd(); return; }
      await aiMelee(e, 0, 0, true);
      if (!e.dead && heroUnits().some(h => man(h.x, h.y, e.x, e.y) === 1)) { e.armed = true; ftext(e.x, e.y, 'Armée !', '#ff5d8f'); Sfx.mark(); await wait(200); }
      return;
    }
    case 'healer': {
      const allies = enemies().filter(o => o !== e);
      const hurtA = allies.filter(o => o.hp < o.maxHp).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
      const map = enemyReach(e);
      const tryHelp = async (list, fn) => {
        for (const a of list) {
          let best = null, bs = 1e9;
          for (const n of map.values()) { if (man(n.x, n.y, a.x, a.y) > 3) continue; const sc = n.d - Math.min(...heroUnits().map(h => man(h.x, h.y, n.x, n.y))) + tilePenalty(n.x, n.y); if (sc < bs) { bs = sc; best = n; } }
          if (best) { if (!(await walkEnemy(e, map, best.x, best.y)) || e.dead) return true; await fn(a); return true; }
        }
        return false;
      };
      const heal = Math.round(ENEMIES.chaman.heal * enemyScale());
      if (hurtA.length && await tryHelp(hurtA, async a => { fx({ type: 'proj', x: e.x, y: e.y, x2: a.x, y2: a.y, color: '#6dffae', dur: 200 }); await wait(200); a.hp = Math.min(a.maxHp, a.hp + heal); ftext(a.x, a.y, `+${heal}`, '#6dffae'); Sfx.heal(); })) return;
      const noShield = allies.filter(o => !o.shield);
      if (noShield.length && await tryHelp(noShield, async a => { a.shield = 1; ftext(a.x, a.y, 'Bouclier', '#9fe0ff'); fx({ type: 'ring', x: a.x, y: a.y, color: '#9fe0ff', dur: 400 }); Sfx.block(); })) return;
      return aiRanged(e, e.dmg, 3, '#6dffae');
    }
    case 'spectre': {
      const hs = targetHeroes(e); if (!hs.length) return;
      const h = lowestHero(hs);
      const spots = DIR4.map(([dx, dy]) => [h.x + dx, h.y + dy]).filter(([x, y]) => walkable(x, y) && !unitAt(x, y) && man(x, y, e.x, e.y) <= e.move + G().enemyMove && tile(x, y).t !== 'lava');
      if (spots.length) {
        const [x, y] = spots.sort((a, b) => man(a[0], a[1], e.x, e.y) - man(b[0], b[1], e.x, e.y))[0];
        e.alpha = 0.2; Sfx.ghost(); await wait(160); e.x = x; e.y = y; e.rx = x; e.ry = y; await wait(60); e.alpha = 1;
        if (await triggerTrap(e)) return; if (e.dead) return;
        await meleeAttack(e, h, e.dmg, 0); return;
      }
      return aiMelee(e, e.dmg, 0);
    }
    case 'summoner': {
      if (e.bt % 2 === 0 && (e.summons || 0) < 3 && enemies().length < SUMMON_LIMIT) {
        const free = DIR8.map(([dx, dy]) => [e.x + dx, e.y + dy]).filter(([x, y]) => walkable(x, y) && !unitAt(x, y));
        if (free.length) { const [x, y] = pick(rnd, free); const n = spawnEnemy('rodeur', x, y); n.alpha = 0; C.units.push(n); e.summons = (e.summons || 0) + 1; fx({ type: 'ring', x, y, color: '#b06ad9', dur: 400 }); Sfx.summon(); ftext(x, y, 'Invoqué', '#c79bff'); await wait(250); return; }
      }
      const adj = heroUnits().find(h => man(h.x, h.y, e.x, e.y) === 1);
      if (adj) return meleeAttack(e, adj, e.dmg, 0);
      const map = enemyReach(e);
      const f = distField(heroUnits().map(h => [h.x, h.y]));
      let best = null, bs = -1e9;
      for (const n of map.values()) { const sc = Math.min(f[key(n.x, n.y)], 5) * 3 - n.d * 0.5 - tilePenalty(n.x, n.y); if (sc > bs) { bs = sc; best = n; } }
      if (best) await walkEnemy(e, map, best.x, best.y);
      return;
    }
  }
}

async function bossAct(e) {
  const hs = targetHeroes(e); if (!hs.length) return;
  switch (e.kind) {
    case 'colosse':
      if (e.bt % 3 === 0) {
        C.telegraphs.push({ tiles: areaTiles(e.x, e.y, 'diamond2'), center: [e.x, e.y], hp: e.special, pct: e.special, owner: e.uid, label: 'Séisme', color: '#ffcf4a' });
        ftext(e.x, e.y, 'Séisme !', '#ffcf4a', true); Sfx.mark(); C.shake += 4; await wait(350); return;
      }
      return aiMelee(e, e.dmg, 0);
    case 'reine':
      if (e.bt % 3 === 2 && enemies().length < 4) {
        let n = 0; const want = C.card.diff;
        for (const [dx, dy] of shuffle(rnd, DIR8.slice())) {
          if (n >= want || enemies().length >= 4) break; const x = e.x + dx, y = e.y + dy;
          if (walkable(x, y) && !unitAt(x, y)) { const m = spawnEnemy('rodeur', x, y); m.alpha = 0; C.units.push(m); fx({ type: 'ring', x, y, color: '#e05a9a', dur: 400 }); n++; }
        }
        if (n) { Sfx.summon(); ftext(e.x, e.y, 'Nuée !', '#e05a9a', true); await wait(300); }
      }
      return aiRanged(e, e.dmg, e.range, '#ff7ab8');
    case 'oracle': {
      const h = lowestHero(hs);
      const rowHits = heroUnits().filter(o => o.y === h.y).length, colHits = heroUnits().filter(o => o.x === h.x).length;
      const tiles = [];
      if (rowHits >= colHits) for (let x = 0; x < GRID_W; x++) tiles.push([x, h.y]); else for (let y = 0; y < GRID_H; y++) tiles.push([h.x, y]);
      C.telegraphs.push({ tiles: tiles.filter(([x, y]) => !(x === e.x && y === e.y)), hp: e.dmg, pct: e.dmg * (e.enr || 1), owner: e.uid, label: 'Laser', color: '#7fd6ff', kind: 'laser' });
      Sfx.mark(); fx({ type: 'ring', x: e.x, y: e.y, color: '#7fd6ff', dur: 400 }); await wait(250);
      // téléportation loin des héros
      const f = distField(heroUnits().map(o => [o.x, o.y]));
      const cands = []; for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (walkable(x, y) && !unitAt(x, y) && tile(x, y).t !== 'lava' && !tiles.some(([a, b]) => a === x && b === y)) cands.push([x, y, f[key(x, y)]]);
      cands.sort((a, b) => b[2] - a[2]);
      if (cands.length) { const c = cands[Math.floor(rnd() * Math.min(4, cands.length))]; e.alpha = 0.2; Sfx.ghost(); await wait(150); e.x = c[0]; e.y = c[1]; e.rx = c[0]; e.ry = c[1]; e.alpha = 1; await wait(100); }
      return;
    }
    case 'forgeron':
      if (e.bt % 2 === 0) {
        const h = lowestHero(hs);
        C.telegraphs.push({ tiles: areaTiles(h.x, h.y, 'square'), center: [h.x, h.y], hp: e.special, pct: e.special, owner: e.uid, label: 'Marteau', color: '#ff7b3a', fire: 2 });
        fx({ type: 'proj', x: e.x, y: e.y, x2: h.x, y2: h.y, color: '#ff7b3a', dur: 300, arc: true }); Sfx.mark(); ftext(e.x, e.y, 'Marteau !', '#ff7b3a', true);
        await wait(300);
        // il peut encore frapper s'il est déjà au contact
        const adj = hs.find(o => man(o.x, o.y, e.x, e.y) === 1);
        if (adj) await meleeAttack(e, adj, e.dmg, e.push);
        return;
      }
      return aiMelee(e, e.dmg, e.push);
    case 'hydre':
      return aiRanged(e, e.dmg, e.range, '#4fd18b');
  }
}

/* ---------- zone de danger (ce que les ennemis peuvent toucher au prochain tour) ---------- */
function dangerTiles(onlyUnit) {
  const set = new Set();
  const list = onlyUnit ? [onlyUnit] : enemies();
  for (const e of list) {
    if (e.stun > 0) continue;
    const mv = e.move + G().enemyMove;
    const m = bfs(e.x, e.y, mv, 'enemy', false);
    const ai = e.ai === 'boss' ? (e.kind === 'reine' || e.kind === 'hydre' ? 'ranged' : (e.kind === 'oracle' ? 'none' : 'melee')) : e.ai;
    if (ai === 'melee' || ai === 'kamikaze' || ai === 'summoner') {
      for (const n of m.values()) { if (unitAt(n.x, n.y) && unitAt(n.x, n.y) !== e && unitAt(n.x, n.y).team !== 'hero') continue; for (const [dx, dy] of DIR4) if (inB(n.x + dx, n.y + dy)) set.add(key(n.x + dx, n.y + dy)); }
    } else if (ai === 'ranged' || ai === 'healer') {
      const r = ai === 'healer' ? 3 : e.range;
      for (const n of m.values()) for (const [dx, dy] of DIR4) for (let i = 1; i <= r; i++) { const x = n.x + dx * i, y = n.y + dy * i; if (!inB(x, y) || isRock(x, y)) break; set.add(key(x, y)); const o = unitAt(x, y); if (o && o !== e && o.team !== 'hero') break; }
    } else if (ai === 'spectre') {
      for (const h of heroUnits()) if (man(h.x, h.y, e.x, e.y) <= mv + 1) set.add(key(h.x, h.y));
    }
  }
  for (const k of [...set]) { const x = k % GRID_W, y = Math.floor(k / GRID_W); if (!walkable(x, y)) set.delete(k); }
  return set;
}

/* =========================================================
   FIN DE SALLE, RÉCOMPENSES, DURÉES
   ========================================================= */
function tickDurations() {
  const expired = [];
  S.heroes.forEach((h, hi) => {
    const hn = HEROES[h.key].name;
    h.slots.forEach((s, si) => {
      if (!s) return;
      s.mods = s.mods.filter(m => { if (m.perm) return true; m.dur--; if (m.dur <= 0) { expired.push(`${UPGRADES[m.key].name} (${SKILLS[s.key].name}, ${hn})`); return false; } return true; });
      if (!s.perm) { s.dur--; if (s.dur <= 0) { expired.push(`${SKILLS[s.key].name} (${hn})`); h.slots[si] = null; } }
    });
  });
  S.rules = S.rules.filter(r => { if (r.perm) return true; r.dur--; if (r.dur <= 0) { expired.push(`Règle ${RULES[r.key].name}`); return false; } return true; });
  S.pacts = S.pacts.filter(p => { p.dur--; if (p.dur <= 0) { expired.push(`Pacte ${PACTS[p.key].name}`); return false; } return true; });
  return expired;
}

function roomComplete(res) {
  const card = C.card;
  const kills = C.kills.slice();
  C = null;
  S.pending = null; S.depth++; S.stats.rooms++;
  const notes = [];
  const expired = tickDurations();
  if (S.talents.repos) { for (const h of S.heroes) h.pct = Math.min(maxPct(), h.pct + 3 * S.talents.repos); }
  if (card.boss) {
    S.bossesSeen++; S.sinceBoss = 0;
    if (res === 'win') {
      const m = bossMoney(card); S.money += m; S.stats.moneyTotal += m; S.bossesKilled++;
      notes.push({ t: `${BOSSES[card.boss].name} vaincu : +${m} or`, c: 'gold' });
      addLog(`${BOSSES[card.boss].name} vaincu (+${m} or).`);
    } else {
      S.bossesFailed++;
      notes.push({ t: `${BOSSES[card.boss].name} s’est enfui : pas d’or.`, c: 'bad' });
      addLog(`${BOSSES[card.boss].name} s’est enfui.`);
    }
  } else {
    S.sinceBoss++;
    if (res === 'flee') { notes.push({ t: 'Vous avez fui : aucune récompense.', c: 'bad' }); addLog('Fuite d’une salle.'); }
  }
  for (const x of expired) notes.push({ t: `Expiré : ${x}`, c: 'dim' });
  for (const k in ENEMIES) if (ENEMIES[k].minDepth === S.depth && S.depth > 0) { notes.push({ t: `Nouvel ennemi : ${ENEMIES[k].name} — ${ENEMIES[k].desc}`, c: 'bad' }); addLog(`Nouvel ennemi : ${ENEMIES[k].name}.`); }
  if (S.depth % 10 === 0) { const e = eraData(S.depth); notes.push({ t: `Nouvelle ère : ${e.name} — ${e.desc}`, c: 'gold' }); addLog(`Nouvelle ère : ${e.name}.`); }
  if (S.depth === 4) notes.push({ t: 'Les boss peuvent maintenant apparaître derrière une porte. Eux seuls donnent de l’or.', c: 'gold' });
  if (expired.length) addLog(`Expiré : ${expired.join(', ')}.`);
  const after = () => {
    S.choices = genChoices(); S.rerolls = 0;
    save();
    UI.showChoice(notes);
  };
  if (res === 'win' && !card.boss) UI.applyReward(card.reward, notes, after);
  else after();
}

/* application des récompenses simples (les choix interactifs sont gérés par l'UI) */
function giveSkill(hi, key, slot, dur) {
  const h = S.heroes[hi];
  h.slots[slot] = { key, perm: false, dur, mods: [] };
}
function addRule(key, dur) {
  const r = S.rules.find(x => x.key === key);
  if (r) { if (!r.perm) r.dur += dur; } else S.rules.push({ key, dur, perm: false });
}
function addPact(key, v) {
  const p = S.pacts.find(x => x.key === key);
  if (p) { p.dur += DUR.pact; p.v = Math.max(p.v, v); } else S.pacts.push({ key, v, dur: DUR.pact });
}
function prolongAll(n) {
  for (const h of S.heroes) for (const s of h.slots) if (s) { if (!s.perm) s.dur += n; for (const m of s.mods) if (!m.perm) m.dur += n; }
  for (const r of S.rules) if (!r.perm) r.dur += n;
  for (const p of S.pacts) p.dur += n;
}

/* ---------- gravure (or) ---------- */
function engraveCost(kind) { return ENGRAVE_COST[kind] + ENGRAVE_STEP[kind] * S.engraved[kind]; }
function talentCost(k) { return TALENTS[k].base + TALENTS[k].step * S.talents[k]; }
