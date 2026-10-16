'use strict';
/* =========================================================
   TRIADE — moteur : état de la partie, salles, combat, IA
   ========================================================= */

const SAVE_KEY = 'binome_save_v1';
const DAILY_KEY = 'binome_daily_v1';
let S = null;   // partie (sauvegardée)
let C = null;   // combat en cours (non sauvegardé : on recommence la salle au rechargement)

/* ---------- utilitaires ---------- */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rngFn = Math.random;                 // remplacé par un hasard à graine pendant le tour ennemi
const rnd = () => rngFn();
let SIM = false;                          // vrai pendant la prévision du tour ennemi (aucune animation, aucun son)
let UNDO = null;                          // instantané pour annuler le dernier déplacement
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
const wait = ms => SIM ? Promise.resolve() : new Promise(r => setTimeout(r, ms * ANIM));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const eraOf = d => Math.floor(d / 10);
const eraData = d => ERAS[eraOf(d) % ERAS.length];

/* ---------- sauvegarde ---------- */
function save() { try { localStorage.setItem(S && S.daily ? DAILY_KEY : SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function load(k) {
  try { const t = localStorage.getItem(k || SAVE_KEY); if (!t) return null; const s = JSON.parse(t); if (!s || s.v !== 1) return null; s.seen = s.seen || {}; s.level = s.level || 1; while (s.heroes.length < NB_HEROES) { const k = Object.keys(HEROES).find(x => !s.heroes.some(h => h.key === x)); s.heroes.push(mkHero(k)); } s.stats.heroKills = (s.stats.heroKills || []).concat([0, 0, 0]).slice(0, NB_HEROES); s.rules = s.rules.filter(r => RULES[r.key]); s.pacts = s.pacts.filter(p => PACTS[p.key]); for (const h of s.heroes) for (const sl of h.slots) if (sl) sl.mods = sl.mods.filter(m => UPGRADES[m.key]); for (const k in s.talents) if (!TALENTS[k]) delete s.talents[k]; for (const k in TALENTS) s.talents[k] = s.talents[k] || 0; s.stats.perfect = s.stats.perfect || 0; s.stats.goals = s.stats.goals || 0; return s; } catch (e) { return null; }
}
function wipeSave(k) { try { localStorage.removeItem(k || SAVE_KEY); } catch (e) { } }

/* ---------- Épreuve du jour : la même partie pour tout le monde, avec un score ---------- */
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function strSeed(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
/* hasard de la partie : à graine pendant une épreuve (mêmes portes et mêmes salles pour tous) */
function runRand() { if (!S || !S.daily) return Math.random(); S.daily.n = (S.daily.n || 0) + 1; return mulberry32((S.daily.seed ^ Math.imul(S.daily.n, 0x9E3779B1)) | 0)(); }
function dailySetup(date) {
  const seed = strSeed('triade-' + date), r = mulberry32(seed);
  return { seed, keys: shuffle(r, Object.keys(HEROES)).slice(0, NB_HEROES), level: 2 + Math.floor(r() * 2) };
}
function newDaily() { const date = todayStr(), d = dailySetup(date); newGame(d.keys, d.level, { date, seed: d.seed, n: 0, pts: 0 }); }
function loadDaily() { const s = load(DAILY_KEY); return s && s.daily && s.daily.date === todayStr() ? s : null; }
function dailyRecords() { try { return JSON.parse(localStorage.getItem('binome_daily_rec')) || {}; } catch (e) { return {}; } }
function saveDailyRecord(score) {
  const r = dailyRecords(), d = S.daily.date; r.days = r.days || {};
  r.days[d] = Math.max(r.days[d] || 0, score); r.best = Math.max(r.best || 0, score); r.played = (r.played || 0) + 1;
  try { localStorage.setItem('binome_daily_rec', JSON.stringify(r)); } catch (e) { }
  return r;
}

/* ---------- statistiques à vie et hauts faits ---------- */
function lifeStats() { try { return JSON.parse(localStorage.getItem('binome_life')) || {}; } catch (e) { return {}; } }
function featsDone() { try { return JSON.parse(localStorage.getItem('binome_feats')) || {}; } catch (e) { return {}; } }
function featValue(L, f) { return f.stat === 'kinds' ? Object.keys(L.bossKinds || {}).length : (L[f.stat] || 0); }
/* ajoute des valeurs ({clé: n} additionnées, {max: {clé: n}} gardées au maximum) et renvoie les hauts faits nouveaux */
function lifeAdd(add, max, kind) {
  const L = lifeStats();
  for (const k in add || {}) L[k] = (L[k] || 0) + add[k];
  for (const k in max || {}) L[k] = Math.max(L[k] || 0, max[k]);
  if (kind) { L.bossKinds = L.bossKinds || {}; L.bossKinds[kind] = 1; }
  try { localStorage.setItem('binome_life', JSON.stringify(L)); } catch (e) { }
  const done = featsDone(), fresh = [];
  for (const f of FEATS) if (!done[f.id] && featValue(L, f) >= f.goal) { done[f.id] = todayStr(); fresh.push(f); }
  if (fresh.length) try { localStorage.setItem('binome_feats', JSON.stringify(done)); } catch (e) { }
  return fresh;
}

/* ---------- nouvelle partie ---------- */
function mkHero(k) {
  return { key: k, pct: 100, slots: [{ key: HEROES[k].basic, perm: true, dur: 0, mods: [] }, null, null, null] };
}
function newGame(keys, level, daily) {
  S = {
    v: 1, level: Math.max(1, Math.round(level || 1)), depth: 0, money: 0, bossesKilled: 0, bossesFailed: 0, bossesSeen: 0, sinceBoss: 0,
    heroes: keys.map(mkHero), rules: [], pacts: [],
    talents: { vigueur: 0, soif: 0, robustesse: 0, egide: 0, choix: 0, prosperite: 0, repos: 0 },
    engraved: { skill: 0, upgrade: 0, rule: 0 },
    choices: null, pending: null, rerolls: 0,
    stats: { kills: 0, rooms: 0, moneyTotal: 0, started: Date.now(), perfect: 0, goals: 0 }, seen: {},
    log: [], daily: daily || null,
  };
  S.choices = genChoices();
  addLog('La partie commence. Choisis ta première salle.');
  save();
}
function addLog(t) { S.log.unshift({ t, d: S.depth }); if (S.log.length > 40) S.log.length = 40; }

/* ---------- agrégat des effets globaux ---------- */
function lowestPct() { return Math.min(...S.heroes.map(h => h.pct)); }
function hasRule(k) { return S.rules.some(r => r.key === k); }
function pactOf(k) { return S.pacts.find(p => p.key === k); }
function maxPct() { return 100 + 10 * S.talents.vigueur; }
function G() {
  const g = {
    dmg: 1, taken: Math.pow(0.9, S.talents.robustesse), move: 0, range: 0, cd: 0, push: 0, coll: 5,
    heal: KILL_HEAL + 2 * S.talents.soif, healMult: 1, extraEnemies: 0, actions: 1, moveCap: 99,
    diag: false, enemyMove: 0, startHeal: 0, startPenalty: 0, ricochet: false, adrenaline: false, explode: false,
    lien: false, riposte: false, relais: false, initiative: false, fury: false, storm: false, drain: 0, enemyHp: 1,
  };
  for (const r of S.rules) {
    switch (r.key) {
      case 'diagonales': g.diag = true; break;
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
      case 'nuee': g.heal += 5 * v; g.extraEnemies += 1; break;
      case 'sang': g.healMult *= v + 1; g.startPenalty += 10; break;
      case 'tempete': g.dmg *= 1 + 0.3 * v; g.storm = true; break;
      case 'titan': g.taken *= 1 - 0.25 * v; g.dmg *= 0.85; break;
      case 'brume': g.dmg *= 1 + 0.35 * v; g.range -= 1; break;
      case 'hate': g.cd -= v; g.enemyMove += 1; break;
      case 'colere': g.push += v; g.coll *= 2; g.drain += 2; break;
    }
  }
  if (C && C.card && C.card.trait === 'brouillard') g.range -= 1;
  if (C && C.boost) { if (C.boost.dmg) g.dmg *= C.boost.dmg; if (C.boost.range) g.range += C.boost.range; }
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
    chain: d.chain || 0, area: d.area || 'single', capMult: 1,
  });
  for (const m of inst.mods) if (UPGRADES[m.key]) UPGRADES[m.key].apply(s, m.v || 1);
  const g = G();
  s.dmg *= g.dmg;
  s.cap = d.dmg ? Math.round((d.cap || d.dmg * CAP_MULT) * s.capMult * (C && onRune(heroUnit(hi)) ? RUNE_CAP : 1)) : 0;
  if (s.range > 1 || (s.type !== 'line' && s.range > 0)) s.range = Math.max(1, s.range + g.range);
  else if (s.range === 1 && g.range > 0) s.range += g.range;
  s.cd = Math.max(0, s.cd + g.cd);
  if (s.push > 0) s.push += g.push;
  if (g.ricochet && s.type === 'line' && s.dmg > 0) s.chain += 1;
  return s;
}
function onRune(u) { return !!(u && C && inB(u.x, u.y) && tile(u.x, u.y).z === 'rune'); }
function runeMult(u) { return 1; }
function ritualOn() { return !!C && C.kind === 'rituel' && C.units.some(u => !u.dead && u.kind === 'cristal'); }
function bannerNear(e) { return !!C && e.team === 'enemy' && C.units.some(b => !b.dead && b.kind === 'etendard' && b !== e && cheb(b.x, b.y, e.x, e.y) <= 2); }
function enemyPower(e) { return (e.enr || 1) * runeMult(e) * (ritualOn() ? 1.3 : 1) * (bannerNear(e) ? 1.3 : 1); }
/* dégâts sans plafond (pour afficher « 40/16 ») */
function rawDmg(hi, s) {
  const u = C ? heroUnit(hi) : null;
  return Math.round(s.dmg * S.heroes[hi].pct / 100 * furyMult(hi) * runeMult(u));
}
function displayDmg(hi, s) {
  const u = C ? heroUnit(hi) : null;
  return Math.round(Math.min(s.cap || 1e9, s.dmg * S.heroes[hi].pct / 100 * furyMult(hi) * runeMult(u)));
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
/* une compétence approche-t-elle de son maximum (sinon Plafond ne servirait à rien) ? */
function nearCap() {
  return S.heroes.some((h, hi) => h.slots.some((s, si) => { if (!s) return false; const st = skillStats(hi, si); return st.cap > 0 && st.dmg >= st.cap * 0.8; }));
}
function genReward(r, diff) {
  const list = [['skill', 26], ['upgrade', 28], ['rule', 14], ['pact', 10], ['rest', 9]];
  if (tempEffectsCount() >= 3) list.push(['prolong', 5]);
  if (nonBasicSkills().length >= 1) { list.push(['mutation', 5]); list.push(['transfert', 3]); }
  const low = lowestPct();
  if (low < 70) list.push(['rest', 10]);
  const type = wpick(r, list);
  const rw = { type, v: diff };
  if (type === 'skill') {
    const hi = Math.floor(r() * S.heroes.length);
    const owned = new Set(S.heroes[hi].slots.filter(Boolean).map(s => s.key));
    const pool = SKILL_POOL.filter(k => !owned.has(k));
    rw.hero = hi; rw.key = pick(r, pool);
  } else if (type === 'upgrade') {
    // seulement des améliorations qu'au moins une compétence peut recevoir
    const ok = Object.keys(UPGRADES).filter(k => (k !== 'plafond' || nearCap()) && S.heroes.some((h, hi) => h.slots.some((s, si) => s && UPGRADES[k].ok(skillStats(hi, si)))));
    rw.key = pick(r, ok.length ? ok : ['puissance']);
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
    case 'skill': return `${tr('Nouvelle compétence')} : ${tr(SKILLS[rw.key].name)}`;
    case 'upgrade': return `${tr('Amélioration')} : ${tr(UPGRADES[rw.key].name)}`;
    case 'rule': return `${tr('Règle')} : ${tr(RULES[rw.key].name)}`;
    case 'pact': return `${tr('Pacte')} : ${tr(PACTS[rw.key].name)}`;
    case 'rest': return tr('Repos');
    case 'prolong': return tr('Sablier');
    case 'mutation': return tr('Mutation');
    case 'transfert': return tr('Transfert');
  }
  return '?';
}
function rewardDesc(rw) {
  const v = rw.v;
  switch (rw.type) {
    case 'skill': return `${tr('Pour')} ${HEROES[S.heroes[rw.hero].key].name} : ${tr(SKILLS[rw.key].desc)} ${tr(`(${DUR.skill * v} salles)`)}`;
    case 'upgrade': return `${tr('Sur la compétence de ton choix')} : ${tr(UPGRADES[rw.key].desc(v))} ${tr(`(${DUR.upgrade} salles)`)}`;
    case 'rule': return `${tr(RULES[rw.key].desc)} ${tr(`(${DUR.rule * v} salles)`)}`;
    case 'pact': return `${tr('Bonus')} : ${tr(PACTS[rw.key].bonus(v))}. ${tr('Malus')} : ${tr(PACTS[rw.key].malus)}. ${tr(`(${DUR.pact} salles)`)}`;
    case 'rest': return tr(`+${15 * v} % à tous les héros.`);
    case 'prolong': return tr(`+${3 * v} salles à tous tes effets temporaires.`);
    case 'mutation': return tr(v > 1 ? 'Transforme une compétence : tu choisis parmi 3 nouvelles (améliorations gardées).' : 'Transforme une compétence en une autre au hasard (améliorations gardées).');
    case 'transfert': return tr(v > 1 ? 'Donne une compétence à un autre héros et +3 salles de durée.' : 'Donne une compétence à un autre héros.');
  }
  return '';
}

function bossChance() { return S.depth < 4 ? 0 : Math.min(0.75, 0.14 + 0.07 * S.sinceBoss); }
function genChoices() {
  const n = 3 + S.talents.choix;
  const out = [];
  let bossPlaced = false;
  for (let i = 0; i < n; i++) {
    const seed = (runRand() * 2 ** 31) | 0;
    const r = mulberry32(seed ^ 0x9e3779b9);
    const diff = r() < 0.5 ? 1 : 2;
    const card = { seed, diff, depth: S.depth, boss: null, trait: null, reward: null, kind: 'normal' };
    if (!bossPlaced && runRand() < bossChance()) {
      bossPlaced = true;
      card.boss = BOSS_ORDER[(S.bossesSeen + Math.floor(runRand() * 2)) % BOSS_ORDER.length];
      card.mods = bossMods(r, card.boss);
    } else {
      card.reward = genReward(r, diff);
      if (S.depth >= 2) card.kind = wpick(r, [['normal', 46], ['vagues', 15], ['survie', 13], ['chasse', 12], ['rituel', 14]]);
      if (S.depth >= 5 && (r() < 0.35 || eraOf(S.depth) % ERAS.length === 4)) card.trait = pick(r, Object.keys(TRAITS));
    }
    if (S.depth >= 1 && r() < 0.65) {
      card.goal = pick(r, Object.keys(GOALS).filter(g => !(g === 'rapide' && (card.kind === 'survie' || card.kind === 'chasse'))));
      if (card.goal === 'rapide') card.goalN = goalTurns(card, genRoom(card));
    }
    out.push(card);
  }
  // si un héros est mal en point, au moins une porte propose du repos
  const low = lowestPct();
  const plain = out.filter(c => !c.boss);
  if (low < 65 && plain.length && !plain.some(c => c.reward.type === 'rest')) {
    const c = plain[Math.floor(runRand() * plain.length)]; c.reward = { type: 'rest', v: c.diff };
  }
  return out;
}
function bossMoney(card) {
  return Math.round((10 + 2.2 * S.bossesKilled) * card.diff * (1 + 0.25 * S.talents.prosperite) * levelFx().gold);
}

/* =========================================================
   GÉNÉRATION D'UNE SALLE (déterministe selon la graine)
   ========================================================= */
function genRoom(card) {
  const r = mulberry32(card.seed);
  const d = card.depth, era = eraOf(d) % ERAS.length;
  // taille et forme aléatoires
  let W = 8 + Math.floor(r() * 5), H = 6 + Math.floor(r() * 4);
  if (card.boss) { W = Math.max(W, 9); H = Math.max(H, 7); }
  GRID_W = W; GRID_H = H;
  let shape = pick(r, ['rect', 'coins', 'trous', 'caverne', 'croix', 'ravin', 'coins', 'trous']);
  let grid, objs, ok = false, tries = 0;
  const pass = (x, y) => { const t = grid[y][x].t; return t !== 'rock' && t !== 'pit' && t !== 'void'; };
  while (!ok && tries++ < 90) {
    if (tries > 60) shape = 'rect';
    grid = []; objs = [];
    for (let y = 0; y < H; y++) { const row = []; for (let x = 0; x < W; x++) row.push({ t: 'floor', fire: 0, fireOwner: null, trap: null, ttl: 0, z: null, zd: null, zp: null }); grid.push(row); }
    const V = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) grid[y][x].t = 'void'; };
    if (shape === 'coins' || shape === 'croix') {
      for (const [cx, cy] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]) {
        if (r() > (shape === 'croix' ? 0.9 : 0.65)) continue;
        const cw = shape === 'croix' ? Math.max(1, Math.floor(W * 0.3)) : 1 + Math.floor(r() * 2), ch = shape === 'croix' ? Math.max(1, Math.floor(H * 0.3)) : 1 + Math.floor(r() * 2);
        for (let dy = 0; dy < ch; dy++) for (let dx = 0; dx < cw; dx++) V(cx === 0 ? dx : W - 1 - dx, cy === 0 ? dy : H - 1 - dy);
      }
    } else if (shape === 'trous') {
      const n = 1 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) { let x = 2 + Math.floor(r() * (W - 4)), y = 1 + Math.floor(r() * (H - 2)); const sz = 1 + Math.floor(r() * 3); for (let k = 0; k < sz; k++) { V(x, y); const [dx, dy] = pick(r, DIR4); x = clamp(x + dx, 2, W - 3); y = clamp(y + dy, 0, H - 1); } }
    } else if (shape === 'caverne') {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (r() < 0.32) V(x, y);
      for (let it = 0; it < 2; it++) {
        const vv = grid.map(row => row.map(t => t.t === 'void'));
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          let n = 0; for (const [dx, dy] of DIR8) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || vv[ny][nx]) n++; }
          grid[y][x].t = n >= 5 ? 'void' : 'floor';
        }
      }
    } else if (shape === 'ravin') {
      const x0 = 3 + Math.floor(r() * Math.max(1, W - 6));
      const bridges = new Set([Math.floor(r() * H), Math.floor(r() * H)]);
      for (let y = 0; y < H; y++) if (!bridges.has(y)) V(x0, y);
    }
    const free = () => { for (let k = 0; k < 50; k++) { const x = 2 + Math.floor(r() * Math.max(1, W - 4)), y = Math.floor(r() * H); if (grid[y][x].t === 'floor' && !objs.some(o => o.x === x && o.y === y)) return [x, y]; } return null; };
    const area = W * H;
    let rocks = Math.round(area * 0.06) + Math.floor(r() * 3) + (card.trait === 'etroit' ? 5 : 0) + (era === 1 ? 3 : 0);
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
    // connexité, place pour les héros (à gauche) et les ennemis (à droite)
    let total = 0, sx = -1, sy = -1, left = 0, right = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (pass(x, y)) { total++; if (sx < 0) { sx = x; sy = y; } if (x <= 1) left++; if (x >= W - 3) right++; }
    if (sx < 0 || total < area * 0.5 || left < 5 || right < 5) continue;
    const seen = new Set([key(sx, sy)]); const q = [[sx, sy]];
    while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIR4) { const nx = x + dx, ny = y + dy; if (inB(nx, ny) && pass(nx, ny) && !seen.has(key(nx, ny))) { seen.add(key(nx, ny)); q.push([nx, ny]); } } }
    ok = seen.size === total;
  }
  // héros à gauche
  const cand = []; for (let x = 0; x < 2; x++) for (let y = 0; y < H; y++) if (grid[y][x].t === 'floor' && !objs.some(o => o.x === x && o.y === y)) cand.push([x, y]);
  shuffle(r, cand);
  cand.sort((a, b) => Math.abs(a[1] - (H - 1) / 2) - Math.abs(b[1] - (H - 1) / 2));
  const heroSpawns = [];
  for (let i = 0; i < NB_HEROES; i++) {
    const c = cand.find(c => !heroSpawns.includes(c) && heroSpawns.every(o => man(o[0], o[1], c[0], c[1]) >= 2)) || cand.find(c => !heroSpawns.includes(c));
    if (c) heroSpawns.push(c);
  }
  for (const [x, y] of heroSpawns) grid[y][x].t = 'floor';
  // zones de carte
  const freeFloor = (x, y) => inB(x, y) && grid[y][x].t === 'floor' && !grid[y][x].z && !heroSpawns.some(([a, b]) => a === x && b === y) && !objs.some(o => o.x === x && o.y === y);
  const rndFloor = () => { for (let k = 0; k < 60; k++) { const x = 1 + Math.floor(r() * (GRID_W - 1)), y = Math.floor(r() * GRID_H); if (freeFloor(x, y)) return [x, y]; } return null; };
  let portalId = 0;
  const placeZone = z => {
    if (z === 'portail') {
      const a = rndFloor(); if (!a) return;
      let b = null; for (let k = 0; k < 60; k++) { const p = rndFloor(); if (p && man(p[0], p[1], a[0], a[1]) >= 4) { b = p; break; } }
      if (!b) return;
      const id = portalId++;
      for (const [x, y] of [a, b]) { grid[y][x].z = 'portail'; grid[y][x].zp = id; }
      return;
    }
    if (z === 'courant') {
      const p = rndFloor(); if (!p) return;
      const [dx, dy] = pick(r, DIR4), len = 2 + Math.floor(r() * 2);
      let [x, y] = p;
      for (let i = 0; i < len && freeFloor(x, y); i++) { grid[y][x].z = 'courant'; grid[y][x].zd = [dx, dy]; x += dx; y += dy; }
      return;
    }
    if (z === 'glace') {
      const p = rndFloor(); if (!p) return;
      let [x, y] = p; const sz = 2 + Math.floor(r() * 3);
      for (let i = 0; i < sz; i++) { if (freeFloor(x, y)) grid[y][x].z = 'glace'; const [dx, dy] = pick(r, DIR4); if (inB(x + dx, y + dy)) { x += dx; y += dy; } }
      return;
    }
    if (z === 'buisson' || z === 'boue') { const p = rndFloor(); if (!p) return; let [x, y] = p; const sz = 1 + Math.floor(r() * 3); for (let i = 0; i < sz; i++) { if (freeFloor(x, y)) grid[y][x].z = z; const [dx, dy] = pick(r, DIR4); if (inB(x + dx, y + dy)) { x += dx; y += dy; } } return; }
    const p = rndFloor(); if (p) grid[p[1]][p[0]].z = z;
  };
  const zoneList = Object.keys(ZONES).filter(k => ZONES[k].minDepth <= d && ZONES[k].w > 0);
  const bias = ['boue', 'buisson', 'rune', 'courant', 'portail'][era];
  const nz = 3 + Math.floor(r() * 3) + Math.floor(GRID_W * GRID_H / 30) + (d >= 12 ? 1 : 0) + (d >= 25 ? 1 : 0);
  for (let i = 0; i < nz && zoneList.length; i++) placeZone(wpick(r, zoneList.map(k => [k, ZONES[k].w * (k === bias ? 3 : 1)])));
  if (card.trait === 'glacier') for (let i = 0; i < 4; i++) placeZone('glace');
  if (card.trait === 'portails') { placeZone('portail'); placeZone('portail'); }
  // ennemis à droite
  const enemies = [];
  const extra = {};
  const nearFloor = (tx, ty) => { let best = null, bd = 1e9; for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) { if (grid[y][x].t !== 'floor' || taken.has(key(x, y)) || grid[y][x].z) continue; const dd = man(x, y, tx, ty) * 10 + y * 0.1 + x * 0.01; if (dd < bd) { bd = dd; best = [x, y]; } } return best || [GRID_W - 1, 0]; };
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
      for (const [tx, ty] of [[GRID_W - 2, 1], [GRID_W - 1, Math.floor(GRID_H / 2)], [GRID_W - 2, GRID_H - 2]]) { const p = nearFloor(tx, ty); if (p) { taken.add(key(p[0], p[1])); enemies.push({ kind: card.boss, x: p[0], y: p[1], boss: true }); } }
    } else { const p = nearFloor(GRID_W - 2, Math.floor(GRID_H / 2)); taken.add(key(p[0], p[1])); enemies.push({ kind: card.boss, x: p[0], y: p[1], boss: true }); }
    const adds = (card.diff === 2 ? 2 : 1) + Math.floor(d / 20);
    for (let i = 0; i < adds; i++) { const k = pickEnemy(r, d, true); const p = spot(5); if (p) enemies.push({ kind: k, x: p[0], y: p[1] }); }
    if ((card.mods || []).includes('escorte')) for (let i = 0; i < 2; i++) { const k = pickEnemy(r, d, true); const p = spot(5); if (p) enemies.push({ kind: k, x: p[0], y: p[1], elite: true, mods: eliteMods(r, Math.max(d, 8)) }); }
  } else {
    const g = G();
    const LF = levelFx();
    let n = (card.diff === 2 ? 4 + Math.floor(d / 12) : 3 + Math.floor(d / 15)) + g.extraEnemies + LF.extra;
    n = Math.min(n, card.diff === 2 ? 10 : 8);
    const kind = card.kind || 'normal';
    if (kind === 'vagues') n = Math.max(2, Math.ceil(n * 0.6));
    if (kind === 'survie' || kind === 'chasse') n = Math.max(2, n - 1);
    let pairId = 0;
    for (let i = 0; i < n; i++) {
      const kind = pickEnemy(r, d, i >= n - 1);
      const p = spot(Math.floor(GRID_W * (kind === 'spectre' ? 0.45 : 0.6))); if (!p) break;
      const elite = (d >= 3 || lvl() >= 3) && r() < (card.diff === 2 ? 0.25 : 0) + LF.elite;
      if (kind === 'jumeau') {
        const q = spot(5); if (!q) continue;
        const id = ++pairId; i++;
        enemies.push({ kind, x: p[0], y: p[1], pair: id }, { kind, x: q[0], y: q[1], pair: id });
        continue;
      }
      enemies.push({ kind, x: p[0], y: p[1], elite, mods: elite ? eliteMods(r, d) : [] });
    }
    // contenu propre au type de salle (tiré ici pour rester déterministe)
    if (kind === 'vagues') {
      extra.waves = [];
      for (let w = 0; w < card.diff; w++) { const wave = []; for (let i = 0; i < n; i++) { const k = pickEnemy(r, d, true); const el = (d >= 3 || lvl() >= 3) && r() < LF.elite + 0.1; wave.push({ kind: k, elite: el, mods: el ? eliteMods(r, d) : [] }); } extra.waves.push(wave); }
    }
    if (kind === 'survie') {
      extra.turns = 4 + card.diff;
      extra.spawns = [];
      for (let t = 0; t < extra.turns; t++) { const lst = []; const cnt = 1 + (card.diff === 2 && t % 2 === 1 ? 1 : 0) + (lvl() >= 4 && t % 3 === 2 ? 1 : 0); for (let i = 0; i < cnt; i++) lst.push({ kind: pickEnemy(r, d, true) }); extra.spawns.push(lst); }
    }
    if (kind === 'chasse') {
      extra.turns = card.diff === 2 ? 4 : 5;
      const p = spot(6); if (p) enemies.push({ kind: 'voleur', x: p[0], y: p[1] });
    }
    if (kind === 'rituel') {
      for (let i = 0; i < 1 + card.diff; i++) { const p = spot(4); if (p) objs.push({ kind: 'cristal', x: p[0], y: p[1] }); }
    }
    // bonus à aller chercher (coffre, orbe, cercle de pouvoir)
    const nb = (r() < 0.5 ? 1 : 0) + (card.diff === 2 && r() < 0.35 ? 1 : 0);
    for (let i = 0; i < nb; i++) {
      const b = wpick(r, [['coffre', 4], ['orbe', 4], ['cercle', 3]]);
      const p = spot(3); if (!p) break;
      if (b === 'cercle') { grid[p[1]][p[0]].z = 'cercle'; grid[p[1]][p[0]].prog = 0; taken.delete(key(p[0], p[1])); }
      else objs.push({ kind: b, x: p[0], y: p[1], orb: b === 'orbe' ? pick(r, Object.keys(ORBS)) : null });
    }
  }
  return Object.assign({ grid, objs, heroSpawns, enemies }, extra);
}
/* pouvoirs d'une élite (tirés avec le hasard de la salle) */
function eliteMods(r, d) {
  if (d < 8) return [];
  const out = [pick(r, ELITE_MODS)];
  if (lvl() >= 5 && r() < 0.4) out.push(pick(r, ELITE_MODS.filter(x => x !== out[0])));
  return out;
}
/* mutations d'un boss : une de plus à chaque tour complet des 6 boss */
function bossModCount() { return Math.min(3, Math.floor(S.bossesKilled / BOSS_ORDER.length)); }
function bossMods(r, kind) {
  const pool = BOSS_MODS.filter(k => !(k === 'vif' && !BOSSES[kind].move)), out = [];
  for (let i = 0; i < bossModCount() && pool.length; i++) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}
function hasMod(u, k) { return !!(u && u.mods && u.mods.includes(k)); }
function pickEnemy(r, d, single) {
  const list = Object.keys(ENEMIES).filter(k => ENEMIES[k].minDepth <= d && ENEMIES[k].w > 0 && !(single && k === 'jumeau')).map(k => [k, ENEMIES[k].w * (ENEMIES[k].minDepth > 0 && d - ENEMIES[k].minDepth < 4 ? 1.6 : 1)]);
  return wpick(r, list);
}

/* =========================================================
   COMBAT
   ========================================================= */
let uidSeq = 1;
function mkUnit(o) {
  return Object.assign({ uid: uidSeq++, stun: 0, poison: null, shield: 0, taunt: null, dead: false, rx: o.x, ry: o.y, ox: 0, oy: 0, flash: 0, alpha: 1, scale: 1 }, o);
}
function lvl() { return (S && S.level) || 1; }
/* plus haut niveau débloqué (gardé d'une partie à l'autre) */
function unlockedLevel() { try { return Math.max(1, parseInt(localStorage.getItem('binome_unlocked')) || 1); } catch (e) { return 1; } }
function setUnlocked(n) { try { localStorage.setItem('binome_unlocked', String(n)); } catch (e) { } }
function canChangeLevel() { return !!S && !S.daily && S.depth % 10 === 0; }
/* effets du niveau de difficulté (1 à l'infini) */
function levelFx(L) {
  L = L || lvl();
  return { hp: 1 + 0.3 * (L - 1), dmg: 1 + 0.12 * (L - 1), extra: Math.floor((L - 1) / 2), elite: Math.min(0.8, 0.06 * (L - 1)), gold: L };
}
function enemyScale() { return (1.1 + 0.012 * S.depth + 0.12 * S.bossesKilled) * levelFx().hp; }
function enemyDmgScale() { return (1.1 + 0.006 * S.depth + 0.05 * S.bossesKilled) * levelFx().dmg; }
function spawnEnemy(kind, x, y, extra) {
  const E = ENEMIES[kind]; const g = G();
  if (S.seen && !SIM) S.seen[kind] = 1;
  const hp = Math.max(3, Math.round(E.hp * enemyScale() * g.enemyHp * (extra && extra.elite ? 1.6 : 1)));
  return mkUnit(Object.assign({
    team: 'enemy', kind, x, y, hp, maxHp: hp, dmg: E.dmg * enemyDmgScale() * (extra && extra.elite ? 1.3 : 1),
    move: E.move, range: E.range || 1, ai: E.ai, push: E.push || 0, immunePush: !!E.immunePush, bt: 0,
    armor: E.armor || 0, split: !!E.split, grows: !!E.grows,
  }, extra || {}, { mods: (extra && extra.mods) || [] }));
}
/* effets immédiats des pouvoirs (le reste est géré au fil du combat) */
function applyMods(u) {
  if (hasMod(u, 'vif')) u.move += 1;
  if (hasMod(u, 'lourd')) u.immunePush = true;
  if (hasMod(u, 'protege')) { u.shield = Math.max(u.shield, 1); u.protT = 0; }
  if (hasMod(u, 'furie')) u.dmg *= 1.25;
  return u;
}
function spawnBoss(kind, x, y, diff, mods) {
  const B = BOSSES[kind];
  if (S.seen && !SIM) S.seen[kind] = 1;
  // croissance additive (les mutations ajoutent la difficulté à partir de 6 boss battus)
  const hp = Math.round(B.hp * (1 + 0.13 * S.bossesKilled + 0.006 * S.depth) * (diff === 2 ? 1.25 : 1) * levelFx().hp);
  const ds = (1 + 0.05 * S.bossesKilled + 0.003 * S.depth) * (diff === 2 ? 1.1 : 1) * levelFx().dmg;
  return mkUnit({
    team: 'enemy', kind, x, y, hp, maxHp: hp, dmg: B.dmg * ds, special: (B.special || 0) * ds, move: B.move, range: B.range || 1,
    ai: 'boss', boss: true, push: B.push || 0, immunePush: true, bt: 0, enr: 1, phase: 0, lastHit: 1, mods: (mods || []).slice(),
  });
}

function startCombat(card) {
  S.pending = card; save();
  const room = genRoom(card);
  const g = G();
  C = {
    card, grid: room.grid, units: [], turn: 1, phase: 'hero', telegraphs: [], bombs: [],
    sel: 0, mode: null, slot: -1, busy: false, boss: !!card.boss, failed: false, ended: false,
    fx: [], texts: [], shake: 0, hover: null, danger: false, kills: [0, 0, 0], reinf: false, banner: null,
    goal: card.goal || null, goalN: card.goalN || 0, gs: { hurt: false, falls: 0, crash: 0, combo: false, basic: false },
    showPreview: UI.showPreview !== false, preview: null, ver: 0, turnSeed: 1,
    kind: card.boss ? 'normal' : (card.kind || 'normal'), waves: room.waves ? room.waves.slice() : [], waveNo: 1, waveTotal: room.waves ? room.waves.length + 1 : 1,
    incoming: [], spawns: room.spawns || [], limit: room.turns || 0, flash: 0, pbanner: null, boost: null, loot: 0,
  };
  UNDO = null;
  room.heroSpawns.forEach(([x, y], i) => {
    C.units.push(mkUnit({ team: 'hero', kind: 'hero', hero: i, x, y, actions: 0, hasMove: false, moveBudget: 0, preMove: null, adrUsed: false }));
  });
  const pairs = {};
  for (const e of room.enemies) {
    const u = applyMods(e.boss ? spawnBoss(e.kind, e.x, e.y, card.diff, card.mods) : spawnEnemy(e.kind, e.x, e.y, { elite: e.elite, mods: e.mods }));
    C.units.push(u);
    if (e.pair) { if (pairs[e.pair]) { u.twin = pairs[e.pair].uid; pairs[e.pair].twin = u.uid; } else pairs[e.pair] = u; }
  }
  if (card.goal === 'rapide') C.goalN = goalTurns(card, room);
  for (const o of room.objs) {
    if (o.kind === 'cristal') { const hp = Math.round(8 * levelFx().hp); C.units.push(mkUnit({ team: 'obj', kind: 'cristal', x: o.x, y: o.y, hp, maxHp: hp, immunePush: true })); }
    else if (o.kind === 'coffre' || o.kind === 'orbe') { const hp = Math.round((o.kind === 'coffre' ? 10 : 7) * levelFx().hp); C.units.push(mkUnit({ team: 'obj', kind: o.kind, orb: o.orb, x: o.x, y: o.y, hp, maxHp: hp, immunePush: o.kind === 'coffre' })); }
    else C.units.push(mkUnit({ team: 'obj', kind: 'baril', x: o.x, y: o.y, hp: 1, maxHp: 1 }));
  }
  if (C.kind === 'survie') C.incoming = placeIncoming(C.spawns[0] || [], 1);
  // effets de début de salle
  for (const h of S.heroes) {
    h.slots.forEach(s => { if (s) s.cdLeft = 0; });
    if (g.startHeal) h.pct = Math.min(maxPct(), h.pct + g.startHeal);
    if (g.startPenalty) h.pct = Math.max(FLOOR_PCT, h.pct - g.startPenalty);
  }
  if (S.talents.egide) heroUnits().forEach(u => u.shield = S.talents.egide);
  if (card.trait === 'reflets') S.heroes.forEach((h, i) => spawnOmbre(i));
  if (card.boss === 'reflet') spawnOmbre(0);
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
const isPit = (x, y) => tile(x, y).t === 'pit' || tile(x, y).t === 'void';
const walkable = (x, y) => inB(x, y) && tile(x, y).t !== 'rock' && tile(x, y).t !== 'pit' && tile(x, y).t !== 'void';

/* BFS de déplacement. pass(u) : on peut traverser l'unité u ? */
function bfs(sx, sy, maxD, team, diag, extraPass) {
  const res = new Map(); res.set(key(sx, sy), { x: sx, y: sy, d: 0, p: null });
  const q = [[sx, sy]];
  const dirs = diag ? DIR8 : DIR4;
  while (q.length) {
    const [x, y] = q.shift(); const cur = res.get(key(x, y));
    if (cur.d >= maxD) continue;
    if (cur.d > 0 && (C.grid[y][x].z === 'boue' || C.grid[y][x].z === 'trampoline' || C.grid[y][x].z === 'machoire')) continue;
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
  UNDO = { s: structuredClone(S), c: cloneCombat(), hi: u.hero };
  C.busy = true;
  const other = unitAt(tx, ty);
  const sx = u.x, sy = u.y;
  u.hasMove = false;
  const path = pathTo(m, tx, ty);
  for (const [x, y] of path) {
    if (other && x === tx && y === ty) break;
    const fx0 = u.x, fy0 = u.y;
    u.x = x; u.y = y; Sfx.step(); await wait(85);
    if (await enterTile(u, fx0, fy0)) break;
    if (C.ended || u.dead) break;
  }
  if (other && !C.ended && unitAt(tx, ty) === other) {
    const ux = u.x, uy = u.y;
    other.x = sx; other.y = sy; u.x = tx; u.y = ty; Sfx.swap(); await wait(120);
    await enterTile(u, ux, uy); await enterTile(other, tx, ty);
  }
  if (!C.ended && !u.dead) await sentinelWatch(u);
  C.busy = false; C.ver++;
  return true;
}
/* cases surveillées par une sentinelle (sa ligne et sa colonne, jusqu'au premier obstacle) */
function watchTiles(e) {
  const out = [];
  for (const [dx, dy] of DIR4) for (let i = 1; i <= (e.range || 5); i++) {
    const x = e.x + dx * i, y = e.y + dy * i; if (!inB(x, y) || isRock(x, y)) break;
    out.push([x, y]); const o = unitAt(x, y); if (o && o.team !== 'hero') break; if (o && o.team === 'hero') break;
  }
  return out;
}
async function sentinelWatch(u) {
  for (const e of enemies()) {
    if (e.kind !== 'sentinelle' || e.stun > 0 || (u.watched && u.watched[e.uid])) continue;
    if (inBush(u) && man(u.x, u.y, e.x, e.y) > 1) continue;
    if (!watchTiles(e).some(([x, y]) => x === u.x && y === u.y)) continue;
    u.watched = u.watched || {}; u.watched[e.uid] = 1;
    ftext(e.x, e.y, 'Guet !', '#ff8f6b', true);
    await rangedAttack(e, u, e.dmg, '#ff8f6b');
    if (C.ended || u.dead) return;
  }
}
/* copie du combat sans les effets visuels (pour l'annulation et la prévision) */
function cloneCombat() {
  const f = C.fx, t = C.texts, pv = C.preview;
  C.fx = []; C.texts = []; C.preview = null;
  const c = structuredClone(C);
  C.fx = f; C.texts = t; C.preview = pv;
  return c;
}
function undoMove() {
  if (!UNDO || !C) return false;
  const f = C.fx, t = C.texts;
  S = UNDO.s; C = UNDO.c; C.fx = f; C.texts = t; C.busy = false; C.mode = null; C.slot = -1; C.sel = UNDO.hi;
  UNDO = null; C.ver++;
  return true;
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
          add(x, y); if (isRock(x, y)) break; const o = unitAt(x, y); if (o && !s.pierce && !(i > 1 && inBush(o))) break;
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
        const o = unitAt(x, y); if (o) { if (i > 1 && inBush(o)) continue; p.hits.push(o); if (!s.pierce) break; }
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
function ftext(x, y, txt, color, big) { if (SIM) return; C.texts.push({ x, y, txt: tr(txt), color, t0: performance.now(), big: !!big }); }
function fx(o) { if (SIM) return; o.t0 = performance.now(); C.fx.push(o); }
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
  if (opts.attacker) opts.attacker.lastHit = C.turn;
  C.gs.hurt = true;
  u.flash = 1; C.shake = Math.min(10, C.shake + 4 + amount * 0.3);
  ftext(u.x, u.y, `−${amount}%`, '#ff6b6b', true);
  Sfx.hurt();
  if (C.boss && h.pct <= FLOOR_PCT) { C.failed = true; }
  const at = opts.attacker;
  if (at && !at.dead && hasMod(at, 'vampire') && at.hp < at.maxHp) { const v = Math.max(1, Math.round(at.maxHp * (at.boss ? 0.05 : 0.15))); at.hp = Math.min(at.maxHp, at.hp + v); ftext(at.x, at.y, `+${v}`, '#ff5a7a'); }
  await wait(140);
  if (opts.attacker && opts.melee && G().riposte && !opts.attacker.dead) {
    await wait(80); fx({ type: 'slash', x: opts.attacker.x, y: opts.attacker.y, color: '#ffd166', dur: 250 });
    await hurt(opts.attacker, 6, u.hero);
  }
}
async function applyOrb(kind, u) {
  const O = ORBS[kind]; Sfx.order();
  ftext(u.x, u.y, O.name + ' !', O.color, true);
  fx({ type: 'ring', x: u.x, y: u.y, color: O.color, dur: 600, r: 2.5 });
  if (kind === 'fureur') C.boost = Object.assign({}, C.boost, { dmg: 1.4, label: O.name });
  else if (kind === 'portee') C.boost = Object.assign({}, C.boost, { range: 1, label: O.name });
  else if (kind === 'soin') S.heroes.forEach((h, i) => healHero(i, 12));
  else if (kind === 'egide') for (const h of heroUnits()) h.shield = Math.min(h.shield + 1, 3);
  C.ver++;
}
/* un Totem protège-t-il cette unité ? */
function totemNear(u) { return u.team === 'enemy' && u.kind !== 'totem' && C.units.some(t => !t.dead && t.kind === 'totem' && t !== u && cheb(t.x, t.y, u.x, u.y) <= 1); }
/* dégâts qu'une unité subirait vraiment (Totem, Carapace) — sert aussi aux aperçus */
function realDmg(u, amt, direct) {
  if (u.team !== 'enemy') return Math.max(1, Math.round(amt));
  if (totemNear(u)) amt *= 0.5;
  if (direct && hasMod(u, 'blinde')) amt *= 0.6;
  if (direct && u.armor) amt = Math.min(amt, u.armor);
  return Math.max(1, Math.round(amt));
}
/* dégâts « bruts » (PV pour ennemis/objets, % pour héros) */
async function hurt(u, amt, credit, opts) {
  if (!u || u.dead || C.ended) return;
  if (u.team === 'hero') return damageHero(u, amt, opts);
  if (u.shield > 0) { u.shield--; ftext(u.x, u.y, 'Bloqué', '#9fe0ff'); Sfx.block(); return; }
  const raw = amt;
  amt = realDmg(u, amt, opts && opts.direct);
  if (opts && opts.direct && u.armor && raw > amt) ftext(u.x, u.y + 0.3, 'Carapace', '#7fe0d8');
  u.hp -= amt; u.flash = 1;
  ftext(u.x, u.y, `−${amt}`, u.boss ? '#ffd166' : '#fff');
  if (u.team === 'enemy' && credit != null) C.shake = Math.min(8, C.shake + 1.5);
  if (u.hp <= 0) { await kill(u, credit); return; }
  if (u.boss) await checkPhase(u);
  if (u.kind === 'enrage') { u.dmg += 2; u.move = Math.min(ENEMIES.enrage.move + 2, u.move + 1); ftext(u.x, u.y + 0.3, 'Rage', '#ff5a5a'); }
  if (u.kind === 'miroir' && opts && opts.direct && credit != null && credit >= 0) { const h = heroUnit(credit); if (h && !h.dead) { fx({ type: 'bolt', x: u.x, y: u.y, x2: h.x, y2: h.y, color: '#c9d6ff', dur: 250 }); await damageHero(h, Math.max(1, Math.round(amt * 0.4))); } }
  if (hasMod(u, 'epines') && opts && opts.direct && credit != null && credit >= 0) { const h = heroUnit(credit); if (h && !h.dead && man(h.x, h.y, u.x, u.y) === 1) { ftext(h.x, h.y - 0.3, 'Épines', '#c6e05a'); await damageHero(h, 3); } }
  if (u.kind === 'geolier' && credit != null && credit >= 0) { const h = heroUnit(credit); if (h && h.chain > 0) { h.chain = 0; h.chainBy = null; ftext(h.x, h.y, 'Chaîne brisée !', '#cfd6ea', true); Sfx.shatter(); } }
  if (u.split && u.hp >= 2 && enemies().length < 12) await splitUnit(u);
}
function phaseBanner(u, name, tip) {
  if (SIM) return;
  C.pbanner = { txt: `PHASE ${(u.phase || 0) + 1}`, sub: name, tip, color: (BOSSES[u.kind] || {}).color || '#ffd166', t0: performance.now() };
  C.flash = 1; C.shake = Math.min(18, C.shake + 12); Sfx.phase(); Music.duck(0.45, 1.4);
}
async function checkPhase(u) {
  const P = BOSSES[u.kind] && BOSSES[u.kind].phases; if (!P || !P.length) return;
  const ph = u.phase || 0;
  if (ph >= P.length || u.hp > u.maxHp * P[ph].at) return;
  u.phase = ph + 1; u.enr = (u.enr || 1) * 1.1; u.stun = 0; u.poison = null;
  if (BOSSES[u.kind].move > 0) u.move += 1;
  phaseBanner(u, P[ph].name, P[ph].tip);
  fx({ type: 'ring', x: u.x, y: u.y, color: BOSSES[u.kind].color, dur: 700, r: 3 });
  await wait(650);
}
async function splitUnit(u) {
  const hs = heroUnits();
  const spots = DIR4.map(([dx, dy]) => [u.x + dx, u.y + dy]).filter(([x, y]) => walkable(x, y) && !unitAt(x, y) && tile(x, y).t !== 'lava')
    .sort((a, b) => Math.min(...hs.map(h => man(h.x, h.y, b[0], b[1]))) - Math.min(...hs.map(h => man(h.x, h.y, a[0], a[1]))) || a[1] - b[1] || a[0] - b[0]);
  if (!spots.length) return;
  const half = Math.floor(u.hp / 2); if (half < 1) return;
  u.hp -= half;
  const [x, y] = spots[0];
  const n = spawnEnemy('scissipare', x, y, { split: false, noHeal: true, piece: true });
  n.hp = half; n.maxHp = Math.max(half, Math.round(u.maxHp / 2)); n.alpha = 0.3; n.rx = u.x; n.ry = u.y;
  C.units.push(n);
  ftext(u.x, u.y, 'Division !', '#c6e05a'); Sfx.summon();
  await wait(150);
}
async function kill(u, credit, cause) {
  if (u.dead) return;
  cause = cause || C.cause || null;
  u.dead = true; u.hp = 0;
  fx({ type: 'burst', x: u.x, y: u.y, color: u.team === 'obj' ? '#ffb347' : (u.boss ? BOSSES[u.kind].color : ENEMIES[u.kind] ? ENEMIES[u.kind].color : '#fff'), dur: 500 });
  if (u.team === 'enemy') {
    Sfx.kill();
    S.stats.kills++;
    if (cause === 'chute') C.gs.falls++;
    if (cause === 'coll' || cause === 'boom') C.gs.crash++;
    if (C.inAction) C.actionKills = (C.actionKills || 0) + 1;
    const g = G();
    if (credit != null && credit >= 0 && !u.noHeal) {
      C.kills[credit]++; if (!SIM) { S.stats.heroKills = S.stats.heroKills || [0, 0, 0]; S.stats.heroKills[credit] = (S.stats.heroKills[credit] || 0) + 1; }
      healHero(credit, g.heal * g.healMult);
      if (g.lien) for (let i = 0; i < S.heroes.length; i++) if (i !== credit) healHero(i, 3);
      const hu = heroUnit(credit);
      if (g.adrenaline && hu && C.phase === 'hero' && !hu.adrUsed) { hu.adrUsed = true; hu.actions++; ftext(hu.x, hu.y, 'Adrénaline !', '#ffd166'); }
    }
    if (u.kind === 'martyr') {
      for (const a of enemies()) { a.hp = Math.min(a.maxHp, a.hp + 8); if (man(a.x, a.y, u.x, u.y) === 1) a.shield = Math.max(a.shield, 1); ftext(a.x, a.y, '+8', '#f2e6b0'); }
      fx({ type: 'ring', x: u.x, y: u.y, color: '#f2e6b0', dur: 600, r: 3 }); Sfx.heal();
    }
    for (const sc of C.units) if (!sc.dead && sc !== u && sc.kind === 'charognard') { sc.maxHp += 4; sc.hp += 4; sc.dmg += 1; ftext(sc.x, sc.y, 'Festin !', '#d8d870'); }
    if (u.kind === 'jumeau' && u.twin) {
      const p = C.units.find(x => x.uid === u.twin && !x.dead);
      if (p) { p.reviving = true; ftext(p.x, p.y, 'Va le ramener…', '#ff9ad5'); }
    }
    if (u.kind === 'kamikaze') await explode(u.x, u.y, 'ring8', u.dmg, u.dmg, credit, '#ff5d8f');
    if (hasMod(u, 'explosif')) await explode(u.x, u.y, 'ring8', 8, 6, credit, '#ff9a3d');
    if (u.boss && u.kind === 'hydre') {
      const rest = enemies().filter(o => o.kind === 'hydre');
      for (const o of rest) { o.enr *= 1.4; ftext(o.x, o.y, 'Rage !', '#ff6b6b'); }
      if (rest.length === 1) { const o = rest[0]; o.phase = 1; o.move = 2; phaseBanner(o, 'Dernière tête', 'Bouge et tire deux fois'); o.phase = 2; }
    }
    if (g.explode && u.kind !== 'kamikaze') await explode(u.x, u.y, 'ring8', 5, 0, credit, '#ffb347', true);
  } else if (u.team === 'obj' && u.kind === 'baril') {
    await explode(u.x, u.y, 'ring8', 10, 8, credit, '#ffb347');
  } else if (u.kind === 'coffre') {
    if (credit != null && credit >= 0) {
      const g = Math.max(1, Math.round((2 + S.depth * 0.15) * levelFx().gold * (1 + 0.25 * S.talents.prosperite)));
      S.money += g; S.stats.moneyTotal += g; C.loot += g; ftext(u.x, u.y, `+${g} or`, '#ffd166', true); Sfx.gold();
    } else ftext(u.x, u.y, 'Coffre perdu', '#888');
  } else if (u.kind === 'orbe') {
    if (credit != null && credit >= 0) await applyOrb(u.orb, u);
    else ftext(u.x, u.y, 'Orbe perdue', '#888');
  } else if (u.kind === 'cristal') {
    Sfx.shatter(); C.shake += 5; ftext(u.x, u.y, 'Cristal brisé', '#d68bff', true);
    if (credit != null && credit >= 0) healHero(credit, 5);
  }
  await wait(60);
  checkEnd();
}
async function explode(cx, cy, area, hpDmg, pctDmg, credit, color, small) {
  fx({ type: 'boom', x: cx, y: cy, color: color || '#ffb347', dur: 500, r: area === 'square' || area === 'ring8' ? 1.5 : 1 });
  Sfx.boom(small); C.shake = Math.min(14, C.shake + (small ? 3 : 7));
  await wait(110);
  const prev = C.cause; C.cause = 'boom';
  for (const [x, y] of areaTiles(cx, cy, area)) {
    const o = unitAt(x, y); if (!o) continue;
    await hurt(o, o.team === 'hero' ? pctDmg : hpDmg, credit);
    if (C.ended) break;
  }
  C.cause = prev;
}
async function collide(u, o, credit) {
  const g = G();
  fx({ type: 'spark', x: u.x, y: u.y, color: '#fff', dur: 300 });
  Sfx.thud();
  const prev = C.cause; C.cause = 'coll';
  await hurt(u, u.team === 'hero' ? Math.round(4 * g.coll / 5) : g.coll, credit);
  if (o) await hurt(o, o.team === 'hero' ? Math.round(4 * g.coll / 5) : g.coll, credit);
  C.cause = prev;
}
async function triggerTrap(u) {
  const t = tile(u.x, u.y); if (!t.trap || u.team !== 'enemy') return false;
  const tr = t.trap; t.trap = null;
  fx({ type: 'slash', x: u.x, y: u.y, color: '#ffd166', dur: 300 }); Sfx.trap();
  ftext(u.x, u.y, 'Piège !', '#ffd166');
  await hurt(u, tr.dmg, tr.owner);
  if (!u.dead) stunUnit(u, 1);
  return true;
}
/* un héros tombe : −12 %, puis remonte sur la case libre la plus proche */
async function heroFall(u, x, y) {
  const ox = u.x, oy = u.y;
  u.x = x; u.y = y; u.falling = performance.now(); Sfx.fall(); ftext(x, y, 'Chute !', '#c9b6ff', true);
  await wait(300);
  u.falling = 0;
  let best = null, bd = 1e9;
  for (let yy = 0; yy < GRID_H; yy++) for (let xx = 0; xx < GRID_W; xx++) {
    if (!walkable(xx, yy) || unitAt(xx, yy)) continue;
    const t = tile(xx, yy); const bad = t.t === 'lava' || t.z === 'piques' || t.fire > 0 ? 5 : 0;
    const dd = man(xx, yy, ox, oy) * 10 + bad * 10 + yy * 0.1 + xx * 0.01;
    if (dd < bd) { bd = dd; best = [xx, yy]; }
  }
  if (best) { u.x = best[0]; u.y = best[1]; u.rx = u.x; u.ry = u.y; }
  fx({ type: 'ring', x: u.x, y: u.y, color: '#c9b6ff', dur: 400 });
  await damageHero(u, 12);
}
async function fallInto(u, x, y, credit) {
  u.x = x; u.y = y; u.falling = performance.now(); Sfx.fall();
  ftext(x, y, 'Chute !', '#c9b6ff');
  await wait(260); await kill(u, credit, 'chute');
}
function portalPair(x, y) {
  const t = tile(x, y); if (t.z !== 'portail') return null;
  for (let yy = 0; yy < GRID_H; yy++) for (let xx = 0; xx < GRID_W; xx++) if ((xx !== x || yy !== y) && C.grid[yy][xx].z === 'portail' && C.grid[yy][xx].zp === t.zp) return [xx, yy];
  return null;
}
/* une unité vient d'arriver sur sa case (marche, poussée, saut, téléportation…).
   Renvoie true si son mouvement doit s'arrêter. */
async function enterTile(u, fromX, fromY, opts) {
  opts = opts || {};
  if (u.dead || C.ended) return true;
  if (u.team === 'hero' && !opts.noMirror && (u.x !== fromX || u.y !== fromY)) await mirrorFollow(u, u.x - fromX, u.y - fromY);
  if (u.dead || C.ended) return true;
  const t = tile(u.x, u.y);
  if (t.z === 'piques') {
    fx({ type: 'spark', x: u.x, y: u.y, color: '#dfe3ee', dur: 280 }); Sfx.thud();
    await hurt(u, u.team === 'hero' ? 5 : 6, u.team === 'hero' ? null : (opts.credit != null ? opts.credit : null));
    if (u.dead || C.ended) return true;
  }
  if (t.z === 'soin') {
    t.z = null; fx({ type: 'ring', x: u.x, y: u.y, color: '#6dffae', dur: 400 }); Sfx.heal();
    if (u.team === 'hero') healHero(u.hero, 6); else if (u.team === 'enemy') { u.hp = Math.min(u.maxHp, u.hp + 5); ftext(u.x, u.y, '+5', '#6dffae'); }
  }
  if (t.z === 'machoire' && u.team !== 'obj') {
    t.z = null; fx({ type: 'slash', x: u.x, y: u.y, color: '#d9b55a', dur: 300 }); Sfx.trap(); ftext(u.x, u.y, 'Mâchoires !', '#d9b55a');
    stunUnit(u, 1);
    await hurt(u, 3, u.team === 'hero' ? null : (opts.credit != null ? opts.credit : null));
    return true;
  }
  if (t.z === 'trampoline' && !opts.noBounce && (u.x !== fromX || u.y !== fromY)) {
    const dx = Math.sign(u.x - fromX), dy = Math.sign(u.y - fromY);
    const nx = u.x + 2 * dx, ny = u.y + 2 * dy;
    if (inB(nx, ny) && !isRock(nx, ny) && !unitAt(nx, ny)) {
      const ox0 = u.x, oy0 = u.y;
      u.jump = performance.now(); Sfx.dash(); ftext(u.x, u.y, 'Boing !', '#ff9ad5');
      if (isPit(nx, ny)) { if (u.team === 'hero') await heroFall(u, nx, ny); else await fallInto(u, nx, ny, opts.credit != null ? opts.credit : null); return true; }
      u.x = nx; u.y = ny; await wait(260);
      await enterTile(u, ox0, oy0, Object.assign({}, opts, { noBounce: true }));
      return true;
    }
  }
  let stop = false;
  if (u.team === 'enemy' && t.trap) { await triggerTrap(u); stop = true; if (u.dead) return true; }
  if (t.z === 'portail' && !opts.noPortal) {
    const o = portalPair(u.x, u.y);
    if (o && !unitAt(o[0], o[1])) {
      const ox = u.x, oy = u.y;
      fx({ type: 'ring', x: ox, y: oy, color: '#d68bff', dur: 350 }); fx({ type: 'ring', x: o[0], y: o[1], color: '#d68bff', dur: 350 }); Sfx.swap();
      u.x = o[0]; u.y = o[1]; u.rx = u.x; u.ry = u.y; await wait(120);
      await enterTile(u, ox, oy, Object.assign({}, opts, { noPortal: true }));
      return true;
    }
  }
  return stop;
}
/* les Ombres d'un héros copient son mouvement en miroir (gauche ↔ droite) */
async function mirrorFollow(hu, dx, dy) {
  const ombres = C.units.filter(o => !o.dead && o.kind === 'ombre' && o.mirror === hu.hero);
  if (!ombres.length) return;
  const steps = [];
  for (let i = 0; i < Math.abs(dx); i++) steps.push([Math.sign(dx), 0]);
  for (let i = 0; i < Math.abs(dy); i++) steps.push([0, Math.sign(dy)]);
  for (const o of ombres) {
    for (const [sx, sy] of steps) {
      if (o.dead || C.ended) break;
      const nx = o.x - sx, ny = o.y + sy;
      if (!inB(nx, ny) || isRock(nx, ny) || unitAt(nx, ny)) continue;
      if (isPit(nx, ny)) { await fallInto(o, nx, ny, hu.hero); break; }
      const fx0 = o.x, fy0 = o.y;
      o.x = nx; o.y = ny; await wait(45);
      if (await enterTile(o, fx0, fy0, { credit: hu.hero })) break;
    }
  }
}
function spawnOmbre(hi, cap) {
  const h = heroUnit(hi); if (!h || h.dead) return null;
  if (enemies().filter(e => e.kind === 'ombre').length >= (cap || MAX_OMBRES)) return null;
  const tx = GRID_W - 1 - h.x, ty = h.y;
  let best = null, bd = 99;
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (walkable(x, y) && !unitAt(x, y) && tile(x, y).z !== 'piques') { const d = man(x, y, tx, ty) * 10 + y + x * 0.01; if (d < bd) { bd = d; best = [x, y]; } }
  if (!best) return null;
  const o = spawnEnemy('ombre', best[0], best[1], { mirror: hi });
  o.alpha = 0; C.units.push(o);
  fx({ type: 'ring', x: best[0], y: best[1], color: '#9aa3ff', dur: 450 }); ftext(best[0], best[1], 'Ombre !', '#b9c0ff'); Sfx.ghost();
  return o;
}
async function pushUnit(u, dx, dy, n, credit) {
  if (!u || u.dead || u.immunePush || n <= 0 || (dx === 0 && dy === 0)) return;
  let left = n, guard = 0;
  while (left > 0 && guard++ < 20) {
    const nx = u.x + dx, ny = u.y + dy;
    if (!inB(nx, ny) || isRock(nx, ny)) { await collide(u, null, credit); return; }
    const o = unitAt(nx, ny);
    if (o) { await collide(u, o, credit); return; }
    if (isPit(nx, ny)) {
      if (u.team === 'hero') { await heroFall(u, nx, ny); return; }
      await fallInto(u, nx, ny, credit); return;
    }
    const fx0 = u.x, fy0 = u.y;
    u.x = nx; u.y = ny; await wait(70);
    left--;
    if (await enterTile(u, fx0, fy0, { credit })) return;
    if (u.dead) return;
    if (tile(u.x, u.y).z === 'boue') return;
    if (tile(u.x, u.y).z === 'glace') { left = Math.max(left, 1); ftext(u.x, u.y, 'Glisse', '#bfeaff'); }
  }
}
async function pullUnit(u, toward, credit, steps) {
  if (!u || u.dead || u.immunePush) return;
  for (let k = 0; k < (steps || 10); k++) {
    if (man(u.x, u.y, toward.x, toward.y) <= 1) return;
    const dx = Math.sign(toward.x - u.x), dy = Math.sign(toward.y - u.y);
    const sx = Math.abs(toward.x - u.x) >= Math.abs(toward.y - u.y) ? dx : 0, sy = sx ? 0 : dy;
    const nx = u.x + sx, ny = u.y + sy;
    if (!inB(nx, ny) || isRock(nx, ny) || unitAt(nx, ny)) return;
    if (isPit(nx, ny)) { if (u.team === 'hero') await heroFall(u, nx, ny); else await fallInto(u, nx, ny, credit); return; }
    const fx0 = u.x, fy0 = u.y;
    u.x = nx; u.y = ny; await wait(65);
    if (await enterTile(u, fx0, fy0, { credit })) return;
  }
}

/* étourdir : une unité qui sort d'un étourdissement y résiste jusqu'à son prochain vrai tour */
function stunUnit(o, n) {
  if (!o || o.dead || !(n > 0)) return false;
  if (o.stunRes > 0) { ftext(o.x, o.y, 'Résiste', '#cfd8ff'); return false; }
  o.stun = Math.max(o.stun, n); ftext(o.x, o.y, 'Étourdi', '#9fe0ff');
  return true;
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
  let dmg = s.dmg * mult * S.heroes[hi].pct / 100 * furyMult(hi) * runeMult(hu);
  const ex = s.exec && o.hp < o.maxHp * 0.5 ? 1 + s.exec : 1;
  dmg *= ex;
  if (s.cap) dmg = Math.min(dmg, s.cap * ex);
  if (s.dmg > 0) {
    await hurt(o, dmg, hi, { direct: true });
    if (s.lifesteal && !opts.secondary && o.team === 'enemy') healHero(hi, s.lifesteal);
  }
  if (!o.dead && C.ended === false) {
    if (s.stun) stunUnit(o, s.stun);
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
      for (const e of C.units) if (!e.dead && e.team !== 'hero' && e.kind !== 'baril' && !hitSet.has(e.uid)) { const d = man(from.x, from.y, e.x, e.y); if (d <= 3 && d < bd) { bd = d; best = e; } }
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
  UNDO = null;
  inst.cdLeft = s.cd;
  hu.actions--; hu.attacked = true;
  if (slot === 0) C.gs.basic = true;
  C.inAction = true; C.actionKills = 0;
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
      let cut = false;
      while (hu.x !== lx || hu.y !== ly) { const fx0 = hu.x, fy0 = hu.y; hu.x += p.dir[0]; hu.y += p.dir[1]; await wait(55); if (await enterTile(hu, fx0, fy0)) { cut = true; break; } }
      if (!cut && !C.ended && p.hits[0] && !p.hits[0].dead && man(hu.x, hu.y, p.hits[0].x, p.hits[0].y) === 1) { lunge(hu, p.hits[0].x, p.hits[0].y); fx({ type: 'slash', x: p.hits[0].x, y: p.hits[0].y, color: col, dur: 260 }); await heroHit(hu, p.hits[0], s, p.dir, 1); }
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
          if (isPit(nx, ny)) { if (o.team === 'hero') continue; await fallInto(o, nx, ny, hi); continue; }
          const fx0 = o.x, fy0 = o.y;
          o.x = nx; o.y = ny; await wait(70);
          await enterTile(o, fx0, fy0, { credit: hi });
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
      const fx0 = hu.x, fy0 = hu.y;
      hu.x = tx; hu.y = ty; await wait(260);
      await enterTile(hu, fx0, fy0);
      if (hu.dead || C.ended) break;
      if (s.shield) { hu.shield = Math.min(2, hu.shield + s.shield); ftext(hu.x, hu.y, 'Bouclier', '#9fe0ff'); }
      if (s.dmg > 0) { fx({ type: 'ring', x: hu.x, y: hu.y, color: col, dur: 400, r: 1.2 }); Sfx.boom(true); C.shake += 3; }
      const lx = hu.x, ly = hu.y;
      const hits = s.area !== 'none' ? areaTiles(lx, ly, s.area).map(([x, y]) => unitAt(x, y)).filter(o => o && o !== hu && o.team !== 'hero') : [];
      for (const o of hits) { await heroHit(hu, o, s, [Math.sign(o.x - lx), Math.sign(o.y - ly)], 1); if (C.ended) break; }
      break;
    }
    case 'swap': {
      const o = p.hits[0]; if (!o) break;
      Sfx.swap(); fx({ type: 'ring', x: hu.x, y: hu.y, color: col, dur: 300 }); fx({ type: 'ring', x: o.x, y: o.y, color: col, dur: 300 });
      const ax = hu.x, ay = hu.y, bx = o.x, by = o.y; hu.x = bx; hu.y = by; o.x = ax; o.y = ay; await wait(200);
      if (o.team !== 'hero' && s.dmg > 0) await heroHit(hu, o, s, [0, 0], 1, { noPush: true });
      await enterTile(hu, ax, ay);
      if (!o.dead && !C.ended && o.x === ax && o.y === ay) await enterTile(o, bx, by, { credit: hi });
      break;
    }
    case 'place': {
      const t = tile(tx, ty);
      if (s.place === 'wall') { t.t = 'rock'; t.ttl = 3; fx({ type: 'burst', x: tx, y: ty, color: '#bbb', dur: 350 }); Sfx.thud(); }
      else if (s.place === 'trap') { t.trap = { dmg: Math.round(Math.min(s.cap || 1e9, s.dmg * S.heroes[hi].pct / 100)), owner: hi }; Sfx.trap(); fx({ type: 'ring', x: tx, y: ty, color: '#ffd166', dur: 300 }); }
      else if (s.place === 'bomb') { C.bombs.push({ x: tx, y: ty, dmg: Math.round(Math.min(s.cap || 1e9, s.dmg * S.heroes[hi].pct / 100 * furyMult(hi))), owner: hi }); Sfx.trap(); }
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
  if (C.actionKills >= 2) C.gs.combo = true;
  C.inAction = false;
  C.busy = false; C.ver++;
  checkEnd();
  return true;
}

/* un héros peut-il encore faire quelque chose d'utile ? (bouger, ou toucher un ennemi / objet) */
function heroCanAct(u) {
  if (!u || u.dead) return false;
  if (u.hasMove && heroMoveTiles(u).size > 1) return true;
  if (u.actions <= 0) return false;
  for (let si = 0; si < 4; si++) {
    const inst = S.heroes[u.hero].slots[si]; if (!inst || (inst.cdLeft || 0) > 0) continue;
    const s = skillStats(u.hero, si);
    for (const [x, y] of skillTargets(u, s)) { const p = planSkill(u, s, x, y); if (p && p.hits.some(o => o.team !== 'hero')) return true; }
  }
  return false;
}

/* ---------- fin de combat ---------- */
function checkEnd() {
  if (!C || C.ended) return C && C.ended;
  if (C.failed) { C.ended = 'fail'; return true; }
  const en = enemies();
  if (C.kind === 'chasse') {
    const thief = C.units.find(u => u.kind === 'voleur');
    if (thief && thief.dead) { C.ended = 'win'; for (const e of en) { e.dead = true; fx({ type: 'burst', x: e.x, y: e.y, color: '#888', dur: 400 }); } return true; }
  }
  if (!C.boss && en.length === 0) {
    if (C.kind === 'vagues' && (C.waves.length || C.incoming.length)) { if (!C.incoming.length) { C.incoming = placeIncoming(C.waves.shift().map(w => Object.assign({}, w)), C.waveNo + 1); C.waveNo++; } return false; }
    if (C.kind === 'survie' && (C.spawnIdx || 0) < C.limit - 1) return false;
  }
  if (C.boss) { if (!en.some(e => e.boss)) { C.ended = 'win'; for (const e of en) { e.dead = true; fx({ type: 'burst', x: e.x, y: e.y, color: '#888', dur: 400 }); } return true; } }
  else if (en.length === 0) { C.ended = 'win'; return true; }
  return false;
}

/* ---------- phases ---------- */
function heroPhaseStart(first) {
  C.phase = 'hero';
  const g = G();
  for (const u of heroUnits()) {
    u.idle = !first && !u.attacked; u.attacked = false;
    u.actions = g.actions; u.hasMove = true; u.moveBudget = heroMove(u.hero); u.adrUsed = false; u.watched = {};
    if (u.chain > 0) { u.hasMove = false; u.moveBudget = 0; }
    if (C.units.some(e => !e.dead && e.kind === 'gardien' && cheb(e.x, e.y, u.x, u.y) <= 2)) { u.moveBudget = Math.max(1, u.moveBudget - 2); u.frozen = true; } else u.frozen = false;
  }
  if (!first) {
    for (const h of S.heroes) for (const s of h.slots) if (s && s.cdLeft > 0) s.cdLeft--;
  }
  C.turnSeed = (SIM ? Math.random() : runRand()) * 2 ** 31 | 0;
  C.ver++;
  if (!SIM) { const f = heroUnits()[0]; C.sel = f ? f.hero : 0; C.mode = null; C.slot = -1; C.tban = { txt: first ? 'À TOI !' : `TOUR ${C.turn}`, color: '#6dffae', t0: performance.now() }; }
}
async function heroPhaseHazards() {
  // début du tour des héros : lave, feu, autel, drain (Colère)
  const g = G();
  for (const u of heroUnits()) {
    const t = tile(u.x, u.y);
    if (t.t === 'lava') { ftext(u.x, u.y, 'Lave', '#ff9a3d'); await damageHero(u, 8); }
    else if (t.fire > 0 || t.z === 'foyer') { ftext(u.x, u.y, 'Feu', '#ff9a3d'); await damageHero(u, 5); }
    if (t.z === 'autel') healHero(u.hero, 5);
    if (t.z === 'cercle') {
      t.prog = (t.prog || 0) + 1;
      ftext(u.x, u.y, `Cercle ${t.prog}/2`, '#ffd166');
      if (t.prog >= 2) {
        const gld = Math.max(1, Math.round((2 + S.depth * 0.1) * levelFx().gold * (1 + 0.25 * S.talents.prosperite)));
        S.money += gld; S.stats.moneyTotal += gld; C.loot += gld; S.heroes.forEach((h, i) => healHero(i, 8));
        ftext(u.x, u.y, `+${gld} or`, '#ffd166', true); Sfx.gold(); t.z = null;
        fx({ type: 'ring', x: u.x, y: u.y, color: '#ffd166', dur: 600, r: 2 });
      }
    }
    if (g.drain && u.idle) { ftext(u.x, u.y - 0.3, 'Colère', '#ff6b6b'); await damageHero(u, g.drain); }
    if (C.ended || C.failed) break;
  }
  checkEnd();
}
/* cases d'arrivée des renforts (déterministes, côté droit, loin des héros) */
function placeIncoming(list, salt) {
  const out = [], used = new Set();
  const hs = heroUnits();
  for (const s of list) {
    let best = null, bs = -1e9;
    for (let y = 0; y < GRID_H; y++) for (let x = Math.floor(GRID_W * 0.45); x < GRID_W; x++) {
      if (!walkable(x, y) || unitAt(x, y) || used.has(key(x, y))) continue;
      const t = tile(x, y); if (t.t === 'lava' || t.z) continue;
      const near = hs.length ? Math.min(...hs.map(h => man(h.x, h.y, x, y))) : 9;
      const h = ((x * 73856093) ^ (y * 19349663) ^ (salt * 83492791) ^ (C.card.seed | 0)) >>> 0;
      const sc = Math.min(near, 5) * 10 + x * 2 + (h % 100) / 25;
      if (sc > bs) { bs = sc; best = [x, y]; }
    }
    if (best) { used.add(key(best[0], best[1])); out.push(Object.assign({}, s, { x: best[0], y: best[1] })); }
  }
  return out;
}
function freeTileNear(x, y) {
  let best = null, bd = 1e9;
  for (let yy = 0; yy < GRID_H; yy++) for (let xx = 0; xx < GRID_W; xx++) if (walkable(xx, yy) && !unitAt(xx, yy)) { const d = man(xx, yy, x, y) * 10 + yy * 0.1 + xx * 0.01; if (d < bd) { bd = d; best = [xx, yy]; } }
  return best;
}
/* ordre d'action des ennemis (affiché sur le plateau) */
function enemyOrder() {
  return enemies().sort((a, b) => (a.boss ? 1 : 0) - (b.boss ? 1 : 0) || a.x - b.x || a.y - b.y);
}
async function enemyPhase() {
  const prev = rngFn;
  rngFn = mulberry32(C.turnSeed || 1);
  try { return await enemyPhaseInner(); }
  finally { rngFn = prev; }
}
async function enemyPhaseInner() {
  C.phase = 'enemy'; C.mode = null; C.busy = true;
  for (const h of heroUnits()) if (h.chain > 0) h.chain--;   // chaînes : un tour de moins
  if (!SIM) { UNDO = null; C.tban = { txt: 'TOUR ENNEMI', color: '#ff7a6a', t0: performance.now() }; UI.refreshCombat(); }
  await wait(200);
  const order = enemyOrder();
  // 0. arrivées annoncées (vagues, survie) : elles ne jouent qu'au tour suivant
  if (C.incoming.length) {
    for (const s of C.incoming) {
      let x = s.x, y = s.y;
      if (!walkable(x, y) || unitAt(x, y)) { const alt = freeTileNear(x, y); if (!alt) continue; [x, y] = alt; }
      const e = applyMods(spawnEnemy(s.kind, x, y, { elite: s.elite, mods: s.mods })); e.alpha = 0; C.units.push(e);
      fx({ type: 'ring', x, y, color: '#ff6b6b', dur: 450 });
    }
    C.incoming = []; Sfx.horn(); await wait(300);
  }
  // 1. courants
  const movers = C.units.filter(u => !u.dead && !u.immunePush && tile(u.x, u.y).z === 'courant');
  movers.sort((a, b) => { const da = tile(a.x, a.y).zd, db = tile(b.x, b.y).zd; return (b.x * db[0] + b.y * db[1]) - (a.x * da[0] + a.y * da[1]) || a.uid - b.uid; });
  for (const u of movers) {
    if (u.dead) continue;
    const tc = tile(u.x, u.y); if (tc.z !== 'courant' || !tc.zd) continue;
    const [dx, dy] = tc.zd; const nx = u.x + dx, ny = u.y + dy;
    if (!inB(nx, ny) || isRock(nx, ny) || unitAt(nx, ny)) continue;
    if (isPit(nx, ny)) { if (u.team === 'hero') await heroFall(u, nx, ny); else await fallInto(u, nx, ny, null); if (checkEnd()) return finishCombat(); continue; }
    const fx0 = u.x, fy0 = u.y; u.x = nx; u.y = ny; await wait(90);
    await enterTile(u, fx0, fy0);
    if (checkEnd()) return finishCombat();
  }
  // 2. bombes des héros
  const bombs = C.bombs; C.bombs = [];
  for (const b of bombs) { await explode(b.x, b.y, 'square', b.dmg, Math.round(b.dmg * 0.5), b.owner, '#ffb347'); if (C.ended) return finishCombat(); }
  // 3. attaques annoncées
  const tel = C.telegraphs; C.telegraphs = [];
  for (const t of tel) {
    if (t.owner && !C.units.some(u => u.uid === t.owner && !u.dead)) continue;
    await resolveTelegraph(t); if (checkEnd()) return finishCombat();
  }
  // 4. poison, feu, lave, autel sur les ennemis
  for (const e of enemies()) {
    if (e.poison) { fx({ type: 'spark', x: e.x, y: e.y, color: '#9dff6b', dur: 250 }); await hurt(e, e.poison.dmg, e.poison.owner); if (e.poison && --e.poison.turns <= 0) e.poison = null; }
    if (e.dead) continue;
    const t = tile(e.x, e.y);
    if (t.t === 'lava') await hurt(e, 10, null);
    else if (t.fire > 0 || t.z === 'foyer') await hurt(e, 6, t.fire > 0 ? t.fireOwner : null);
    if (!e.dead && t.z === 'autel' && e.hp < e.maxHp) { e.hp = Math.min(e.maxHp, e.hp + 5); ftext(e.x, e.y, '+5', '#6dffae'); }
    if (!e.dead && ritualOn() && e.hp < e.maxHp) { e.hp = Math.min(e.maxHp, e.hp + 3); ftext(e.x, e.y, '+3', '#d68bff'); }
    if (!e.dead && hasMod(e, 'regen') && e.hp < e.maxHp) { const v = Math.max(1, Math.round(e.maxHp * (e.boss ? 0.04 : 0.1))); e.hp = Math.min(e.maxHp, e.hp + v); ftext(e.x, e.y, `+${v}`, '#6dffae'); }
    if (!e.dead && hasMod(e, 'protege')) { e.protT = (e.protT || 0) + 1; if (e.protT % 3 === 0 && !e.shield) { e.shield = 1; ftext(e.x, e.y, 'Bouclier', '#9fe0ff'); } }
    if (C.ended) return finishCombat();
  }
  if (checkEnd()) return finishCombat();
  // 5. chaque ennemi agit
  for (const e of order) {
    if (e.dead) continue;
    C.acting = e.uid;
    await enemyAct(e);
    C.acting = null;
    e.taunt = null;
    if (checkEnd()) return finishCombat();
  }
  // 6. renforts
  if (C.card.trait === 'renforts' && C.turn === 2 && !C.reinf) {
    C.reinf = true;
    for (let i = 0; i < 2; i++) {
      const spots = []; for (let y = 0; y < GRID_H; y++) for (const x of [GRID_W - 1, GRID_W - 2]) if (walkable(x, y) && !unitAt(x, y)) spots.push([x, y]);
      if (!spots.length) break; const [x, y] = pick(rnd, spots);
      const e = spawnEnemy(pickEnemy(rnd, S.depth, true), x, y); e.alpha = 0; C.units.push(e); ftext(x, y, 'Renfort', '#ff6b6b');
    }
    Sfx.summon(); await wait(250);
  }
  // 7. tempête : annonce 2 impacts pour le prochain tour
  if (G().storm) {
    for (let i = 0; i < 2; i++) {
      const x = Math.floor(rnd() * GRID_W), y = Math.floor(rnd() * GRID_H);
      C.telegraphs.push({ tiles: [[x, y]], hp: 10, pct: 8, owner: null, label: 'Foudre', color: '#bfe6ff', kind: 'bolt' });
    }
  }
  // 8. fin du tour : feu, murs temporaires
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
    const t = C.grid[y][x];
    if (t.fire > 0) t.fire--;
    if (t.ttl > 0 && --t.ttl === 0 && t.t === 'rock') t.t = 'floor';
  }
  if (C.kind === 'survie') {
    C.spawnIdx = (C.spawnIdx || 0) + 1;
    if (C.spawnIdx < C.limit - 1) C.incoming = placeIncoming(C.spawns[C.spawnIdx] || [], C.turn + 1);
  }
  C.turn++;
  if (C.kind === 'survie' && C.turn > C.limit) { C.ended = 'win'; return finishCombat(); }
  if (C.kind === 'chasse' && C.turn > C.limit && C.units.some(u => u.kind === 'voleur' && !u.dead)) { C.ended = 'escape'; return finishCombat(); }
  heroPhaseStart(false);
  await heroPhaseHazards();
  if (C.ended) return finishCombat();
  C.busy = false;
  if (!SIM) { UI.refreshCombat(); UI.checkAutoEnd(); }
}

async function collapse(t) {
  const [x, y] = t.tiles[0];
  if (!inB(x, y)) return;
  const tt = tile(x, y); if (tt.t === 'rock') return;
  fx({ type: 'boom', x, y, color: '#b08a5a', dur: 500, r: 0.9 }); Sfx.boom(true); C.shake = Math.min(14, C.shake + 5);
  tt.t = 'pit'; tt.z = null; tt.fire = 0; tt.trap = null; ftext(x, y, 'Effondrement', '#d8b07a', true);
  await wait(150);
  const o = unitAt(x, y);
  if (o && !o.dead) { if (o.team === 'hero') await heroFall(o, x, y); else if (o.team === 'enemy') await fallInto(o, x, y, null); else await kill(o, null); }
}
async function resolveTelegraph(t) {
  const col = t.color || '#ff5a5a';
  if (t.pit) return collapse(t);
  if (t.kind === 'laser') { const a = t.tiles[0], b = t.tiles[t.tiles.length - 1]; fx({ type: 'laser', x: a[0], y: a[1], x2: b[0], y2: b[1], color: col, dur: 450 }); Sfx.laser(); }
  else if (t.kind === 'bolt') { const [x, y] = t.tiles[0]; fx({ type: 'bolt', x, y: y - 3, x2: x, y2: y, color: col, dur: 260 }); Sfx.zap(); }
  else { const c = t.center || t.tiles[0]; fx({ type: 'boom', x: c[0], y: c[1], color: col, dur: 500, r: 1.4 }); Sfx.boom(); }
  C.shake = Math.min(14, C.shake + 6);
  await wait(130);
  for (const [x, y] of t.tiles) {
    const o = unitAt(x, y);
    if (o) await hurt(o, o.team === 'hero' ? t.pct : t.hp, null, { attacker: C.units.find(u => u.uid === t.owner) });
    if (t.fire) { const tt = tile(x, y); if (tt.t !== 'rock' && tt.t !== 'pit') { tt.fire = t.fire; tt.fireOwner = null; } }
    if (C.ended) return;
  }
}

async function finishCombat() {
  if (SIM || !C || C.finishing) return; C.finishing = true;
  C.busy = true;
  const res = C.ended || 'flee';
  await wait(450);
  if (!SIM) Music.duck(0.3, 2.4);
  if (res === 'win') { Sfx.win(); C.banner = { txt: C.boss ? 'BOSS VAINCU !' : C.kind === 'survie' ? 'SURVIE RÉUSSIE' : C.kind === 'chasse' ? 'VOLEUR ATTRAPÉ' : 'VICTOIRE', color: C.boss ? '#ffd166' : '#6dffae', t0: performance.now() }; }
  else if (res === 'fail') { Sfx.fail(); C.banner = { txt: 'LE BOSS S’ENFUIT…', color: '#ff6b6b', t0: performance.now() }; }
  else if (res === 'escape') { Sfx.fail(); C.banner = { txt: 'LE VOLEUR S’ENFUIT…', color: '#ff6b6b', t0: performance.now() }; }
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
    const o = unitAt(nx, ny); if (o && !(i > 1 && inBush(o))) return o;
  }
  return null;
}
function inBush(o) { return inB(o.x, o.y) && tile(o.x, o.y).z === 'buisson'; }
function enemyReach(e) {
  const m = bfs(e.x, e.y, e.move + G().enemyMove, 'enemy', false);
  for (const [k, n] of [...m]) { const o = unitAt(n.x, n.y); if (o && o !== e) m.delete(k); }
  return m;
}
function tilePenalty(x, y) { const t = tile(x, y); return (t.t === 'lava' ? 40 : 0) + (t.fire > 0 || t.z === 'foyer' ? 25 : 0) + (t.z === 'piques' || t.z === 'machoire' ? 20 : 0) + (t.z === 'soin' ? -8 : 0) + (t.z === 'autel' ? -6 : 0) + (C.telegraphs.some(tl => tl.tiles.some(([a, b]) => a === x && b === y)) ? 30 : 0); }
async function walkEnemy(e, map, tx, ty) {
  const path = pathTo(map, tx, ty);
  for (const [x, y] of path) {
    const fx0 = e.x, fy0 = e.y;
    e.x = x; e.y = y; await wait(80);
    if (await enterTile(e, fx0, fy0)) return false;
    if (e.dead || C.ended) return false;
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
  if (SIM) C.simLog.push({ t: 'atk', uid: e.uid, x: e.x, y: e.y, tx: h.x, ty: h.y });
  await damageHero(h, dmg * enemyPower(e), { attacker: e, melee: true });
  if (push && !h.dead && !C.ended) await pushUnit(h, Math.sign(h.x - e.x), Math.sign(h.y - e.y), push, null);
}
async function rangedAttack(e, h, dmg, color) {
  fx({ type: 'proj', x: e.x, y: e.y, x2: h.x, y2: h.y, color: color || '#ffb36b', dur: 200 }); Sfx.enemyShoot();
  await wait(200);
  if (SIM) C.simLog.push({ t: 'atk', uid: e.uid, x: e.x, y: e.y, tx: h.x, ty: h.y, ranged: true });
  await damageHero(h, dmg * enemyPower(e), { attacker: e });
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

/* Lancier : frappe les 2 cases devant lui */
function lanceTiles(x, y, dx, dy) {
  const a = [x + dx, y + dy], b = [x + 2 * dx, y + 2 * dy];
  if (!inB(a[0], a[1]) || isRock(a[0], a[1])) return [];
  return inB(b[0], b[1]) && !isRock(b[0], b[1]) ? [a, b] : [a];
}
async function aiLance(e) {
  const hs = targetHeroes(e); if (!hs.length) return;
  const map = enemyReach(e);
  let best = null, bs = -1e9;
  for (const n of map.values()) for (const [dx, dy] of DIR4) {
    const ts = lanceTiles(n.x, n.y, dx, dy);
    let sc = 0;
    for (const [x, y] of ts) { const o = unitAt(x, y); if (o && o !== e) { if (o.team === 'hero' && hs.includes(o)) sc += 100 - hpct(o) * 0.25; else if (o.team === 'enemy') sc -= 30; } }
    if (sc <= 0) continue;
    sc -= n.d * 2 + tilePenalty(n.x, n.y);
    if (sc > bs) { bs = sc; best = { n, dx, dy }; }
  }
  if (!best) { const goals = []; for (const h of hs) for (const [dx, dy] of DIR4) { goals.push([h.x + dx, h.y + dy]); goals.push([h.x + 2 * dx, h.y + 2 * dy]); } const t = approachTile(e, map, goals); if (t) await walkEnemy(e, map, t.x, t.y); return; }
  if (!(await walkEnemy(e, map, best.n.x, best.n.y)) || e.dead) return;
  const ts = lanceTiles(e.x, e.y, best.dx, best.dy);
  lunge(e, e.x + best.dx, e.y + best.dy); Sfx.swing();
  for (const [x, y] of ts) fx({ type: 'slash', x, y, color: '#ffe08a', dur: 260 });
  await wait(120);
  for (const [x, y] of ts) {
    const o = unitAt(x, y); if (!o || o === e) continue;
    if (SIM && o.team === 'hero') C.simLog.push({ t: 'atk', uid: e.uid, x: e.x, y: e.y, tx: o.x, ty: o.y });
    if (o.team === 'hero') await damageHero(o, e.dmg * enemyPower(e), { attacker: e, melee: man(o.x, o.y, e.x, e.y) === 1 });
    else await hurt(o, e.dmg * enemyPower(e), null);
    if (C.ended) return;
  }
}
/* Souffleur (repousse de 2) et Grappineur (attire) : tir en ligne */
async function aiLine(e, mode) {
  const hs = targetHeroes(e); if (!hs.length) return;
  const map = enemyReach(e);
  const spots = rangedSpots(e, map, hs, e.range);
  if (!spots.length) {
    const goals = []; for (const h of hs) for (const [dx, dy] of DIR4) for (let i = 2; i <= e.range; i++) goals.push([h.x + dx * i, h.y + dy * i]);
    const t = approachTile(e, map, goals); if (t) await walkEnemy(e, map, t.x, t.y); return;
  }
  let best = null, bs = -1e9;
  for (const sp of spots) {
    const dx = Math.sign(sp.h.x - sp.n.x), dy = Math.sign(sp.h.y - sp.n.y);
    let sc = 50 - sp.n.d - tilePenalty(sp.n.x, sp.n.y);
    if (mode === 'blow') { // chercher à envoyer le héros dans un danger
      for (let i = 1; i <= e.push; i++) { const x = sp.h.x + dx * i, y = sp.h.y + dy * i; if (!inB(x, y) || isRock(x, y) || unitAt(x, y)) { sc += 10; break; } if (isPit(x, y)) { sc += 60; break; } const t = tile(x, y); if (t.t === 'lava' || t.z === 'piques') sc += 25; }
    } else sc += man(sp.n.x, sp.n.y, sp.h.x, sp.h.y) * 3;
    if (sc > bs) { bs = sc; best = sp; }
  }
  if (!(await walkEnemy(e, map, best.n.x, best.n.y)) || e.dead) return;
  const h = best.h, dx = Math.sign(h.x - e.x), dy = Math.sign(h.y - e.y);
  if (lineFirst(e.x, e.y, dx, dy, e.range) !== h) return;
  if (SIM) C.simLog.push({ t: 'atk', uid: e.uid, x: e.x, y: e.y, tx: h.x, ty: h.y, ranged: true });
  fx({ type: 'proj', x: e.x, y: e.y, x2: h.x, y2: h.y, color: mode === 'blow' ? '#bfe8ff' : '#e0a060', dur: 220 });
  mode === 'blow' ? Sfx.wind() : Sfx.hook();
  await wait(220);
  await damageHero(h, e.dmg * enemyPower(e));
  if (h.dead || C.ended) return;
  if (mode === 'blow') await pushUnit(h, dx, dy, e.push, null);
  else await pullUnit(h, e, null);
}
/* Tisseur : fait surgir un rocher à côté du héros le plus faible */
async function aiWeaver(e) {
  const hs = targetHeroes(e); if (!hs.length) return;
  const temp = []; for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (C.grid[y][x].ttl > 0) temp.push(1);
  const h = lowestHero(hs);
  if (temp.length < 4) {
    const cands = DIR4.map(([dx, dy]) => [h.x + dx, h.y + dy]).filter(([x, y]) => inB(x, y) && tile(x, y).t === 'floor' && !unitAt(x, y) && !tile(x, y).z)
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (cands.length) {
      const [x, y] = cands[0]; const t = tile(x, y); t.t = 'rock'; t.ttl = 2;
      fx({ type: 'burst', x, y, color: '#9ad1a0', dur: 400 }); Sfx.thud(); ftext(x, y, 'Mur !', '#9ad1a0');
      await wait(250);
    }
  }
  const map = enemyReach(e);
  const f = distField(heroUnits().map(o => [o.x, o.y]));
  let best = null, bs = -1e9;
  for (const n of map.values()) { const dd = f[key(n.x, n.y)]; const sc = -Math.abs(Math.min(dd, 9) - 3) * 4 - n.d * 0.5 - tilePenalty(n.x, n.y); if (sc > bs) { bs = sc; best = n; } }
  if (best) await walkEnemy(e, map, best.x, best.y);
}
/* Semeur : fait pousser des piques à côté du héros le plus faible */
async function aiSower(e) {
  const hs = targetHeroes(e); if (!hs.length) return;
  let planted = 0; for (const row of C.grid) for (const t of row) if (t.sown) planted++;
  const h = lowestHero(hs);
  if (planted < 8) {
    const cands = DIR8.map(([dx, dy]) => [h.x + dx, h.y + dy]).filter(([x, y]) => inB(x, y) && tile(x, y).t === 'floor' && !tile(x, y).z && !unitAt(x, y)).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    if (cands.length) { const [x, y] = cands[0]; const t = tile(x, y); t.z = 'piques'; t.sown = true; fx({ type: 'burst', x, y, color: '#8fbf4a', dur: 400 }); ftext(x, y, 'Piques !', '#b6e070'); Sfx.thud(); await wait(220); }
  }
  const map = enemyReach(e); const f = distField(heroUnits().map(o => [o.x, o.y]));
  let best = null, bs = 1e9; for (const n of map.values()) { const sc = Math.abs(f[key(n.x, n.y)] - 3) * 4 + tilePenalty(n.x, n.y) + n.d * 0.1; if (sc < bs) { bs = sc; best = n; } }
  if (best) await walkEnemy(e, map, best.x, best.y);
}
/* Pyromane : annonce un embrasement en croix sur un héros */
async function aiPyro(e) {
  const hs = targetHeroes(e); if (!hs.length) return;
  const map = enemyReach(e); const f = distField(hs.map(o => [o.x, o.y]));
  let best = null, bs = 1e9; for (const n of map.values()) { const sc = Math.abs(f[key(n.x, n.y)] - 4) * 4 + tilePenalty(n.x, n.y) + n.d * 0.1; if (sc < bs) { bs = sc; best = n; } }
  if (best && !(await walkEnemy(e, map, best.x, best.y))) return;
  if (e.dead) return;
  const inR = hs.filter(h => man(h.x, h.y, e.x, e.y) <= e.range); if (!inR.length) return;
  const h = lowestHero(inR);
  C.telegraphs.push({ tiles: areaTiles(h.x, h.y, 'plus'), center: [h.x, h.y], hp: e.dmg, pct: e.dmg * enemyPower(e), owner: e.uid, label: 'Feu', color: '#ff7a2a', fire: 3 });
  fx({ type: 'proj', x: e.x, y: e.y, x2: h.x, y2: h.y, color: '#ff7a2a', dur: 300, arc: true }); Sfx.mark(); await wait(250);
}
/* Coureur : frappe puis recule */
async function aiSkirmish(e) {
  await aiMelee(e, e.dmg, 0);
  if (e.dead || C.ended) return;
  const map = bfs(e.x, e.y, 2, 'enemy', false); for (const [k, n] of [...map]) { const o = unitAt(n.x, n.y); if (o && o !== e) map.delete(k); }
  const f = distField(heroUnits().map(o => [o.x, o.y]));
  let best = null, bs = -1e9; for (const n of map.values()) { const sc = Math.min(f[key(n.x, n.y)], 6) * 4 - tilePenalty(n.x, n.y) - n.d * 0.1; if (sc > bs) { bs = sc; best = n; } }
  if (best && (best.x !== e.x || best.y !== e.y)) await walkEnemy(e, map, best.x, best.y);
}
/* Voleur : fuit les héros */
async function aiFlee(e) {
  const map = enemyReach(e);
  const f = distField(heroUnits().map(o => [o.x, o.y]));
  let best = null, bs = -1e9;
  for (const n of map.values()) { const sc = Math.min(f[key(n.x, n.y)], 12) * 5 - tilePenalty(n.x, n.y) + n.x * 0.3 - n.d * 0.1; if (sc > bs) { bs = sc; best = n; } }
  if (best) await walkEnemy(e, map, best.x, best.y);
}

async function enemyAct(e) {
  if (e.reviving) {
    e.reviving = false;
    const spots = DIR8.map(([dx, dy]) => [e.x + dx, e.y + dy]).filter(([x, y]) => walkable(x, y) && !unitAt(x, y));
    if (spots.length) {
      const [x, y] = spots[0];
      const n = spawnEnemy('jumeau', x, y, { noHeal: true }); n.twin = e.uid; e.twin = n.uid; n.alpha = 0;
      C.units.push(n); fx({ type: 'ring', x, y, color: '#ff9ad5', dur: 450 }); ftext(x, y, 'Renaissance !', '#ff9ad5'); Sfx.summon();
      await wait(250);
    }
  }
  if (e.stun > 0) { e.stun--; if (!e.stun) e.stunRes = e.boss ? 2 : 1; ftext(e.x, e.y, 'Étourdi', '#9fe0ff'); await wait(200); return; }
  if (e.stunRes > 0) e.stunRes--;
  e.bt++;
  if (e.alpha < 1) e.alpha = 1;
  if (e.grows) { e.dmg *= 1.12; e.maxHp += 3; e.hp += 3; ftext(e.x, e.y, 'Grandit', '#f08a5a'); }
  if (e.ai === 'boss') return bossAct(e);
  switch (e.ai) {
    case 'totem': return;
    case 'frost': { // se place à 2 cases d'un héros
      const map = enemyReach(e); const f = distField(heroUnits().map(o => [o.x, o.y]));
      let best = null, bs = 1e9; for (const n of map.values()) { const sc = Math.abs(f[key(n.x, n.y)] - 2) * 5 + tilePenalty(n.x, n.y) + n.d * 0.1; if (sc < bs) { bs = sc; best = n; } }
      if (best) await walkEnemy(e, map, best.x, best.y); return;
    }
    case 'sower': return aiSower(e);
    case 'pyro': return aiPyro(e);
    case 'skirmish': return aiSkirmish(e);
    case 'lance': return aiLance(e);
    case 'blow': return aiLine(e, 'blow');
    case 'hook': return aiLine(e, 'hook');
    case 'weaver': return aiWeaver(e);
    case 'flee': return aiFlee(e);
    case 'sapper': {
      const hs = targetHeroes(e); if (!hs.length) return;
      const map = enemyReach(e); const f = distField(hs.map(o => [o.x, o.y]));
      let best = null, bs = 1e9; for (const n of map.values()) { const sc = Math.abs(f[key(n.x, n.y)] - 3) * 4 + n.d * 0.2 + tilePenalty(n.x, n.y); if (sc < bs) { bs = sc; best = n; } }
      if (best && !(await walkEnemy(e, map, best.x, best.y))) return;
      if (e.dead || (e.dug || 0) >= 4) return;
      const tg = hs.filter(h => man(h.x, h.y, e.x, e.y) <= e.range && !C.telegraphs.some(t => t.pit && t.tiles[0][0] === h.x && t.tiles[0][1] === h.y));
      if (!tg.length) return;
      const h = lowestHero(tg); e.dug = (e.dug || 0) + 1;
      C.telegraphs.push({ tiles: [[h.x, h.y]], center: [h.x, h.y], hp: 0, pct: 12, owner: e.uid, label: 'Fosse', color: '#d8a060', pit: true });
      fx({ type: 'proj', x: e.x, y: e.y, x2: h.x, y2: h.y, color: '#d8a060', dur: 260, arc: true }); Sfx.mark(); ftext(h.x, h.y, 'Ça s’effondre !', '#d8a060');
      await wait(250); return;
    }
    case 'banner': { // reste près de ses alliés, loin des héros
      const map = enemyReach(e); const f = distField(heroUnits().map(o => [o.x, o.y]));
      const al = enemies().filter(o => o !== e && o.kind !== 'etendard');
      let best = null, bs = -1e9;
      for (const n of map.values()) { const near = al.filter(o => cheb(o.x, o.y, n.x, n.y) <= 2).length; const sc = near * 6 + Math.min(f[key(n.x, n.y)], 5) * 2 - n.d * 0.3 - tilePenalty(n.x, n.y); if (sc > bs) { bs = sc; best = n; } }
      if (best) await walkEnemy(e, map, best.x, best.y);
      return;
    }
    case 'ombre': {
      for (const h of heroUnits()) if (man(h.x, h.y, e.x, e.y) === 1 && !C.ended) await meleeAttack(e, h, e.dmg, 0);
      return;
    }
    case 'mirror': {
      if (e.bt % 3 === 1) {
        const cnt = hi => enemies().filter(o => o.kind === 'ombre' && o.mirror === hi).length;
        const order = heroUnits().map(h => h.hero).sort((a, b) => cnt(a) - cnt(b) || a - b);
        if (order.some(hi => spawnOmbre(hi))) { await wait(300); return; }
      }
      return aiRanged(e, e.dmg, e.range, '#a0a8ff');
    }
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
        const fx0 = e.x, fy0 = e.y;
        e.alpha = 0.2; Sfx.ghost(); await wait(160); e.x = x; e.y = y; e.rx = x; e.ry = y; await wait(60); e.alpha = 1;
        if (await enterTile(e, fx0, fy0)) return; if (e.dead || C.ended || man(e.x, e.y, h.x, h.y) !== 1) return;
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
  const ph = e.phase || 0;
  if (C.turn - (e.lastHit || 0) >= 3 && C.huntTurn !== C.turn) { if (await bossHunt(e, hs)) return; }
  switch (e.kind) {
    case 'colosse': {
      if (ph >= 2) { // éboulement : un rocher annoncé sur chaque héros
        for (const h of hs) C.telegraphs.push({ tiles: [[h.x, h.y]], center: [h.x, h.y], hp: e.special * 0.6, pct: e.special * 0.6 * e.enr, owner: e.uid, label: 'Rocher', color: '#c9a227' });
        Sfx.mark();
      }
      if (e.bt % (ph >= 1 ? 2 : 3) === 0) {
        C.telegraphs.push({ tiles: areaTiles(e.x, e.y, 'diamond2'), center: [e.x, e.y], hp: e.special, pct: e.special * e.enr, owner: e.uid, label: 'Séisme', color: '#ffcf4a' });
        ftext(e.x, e.y, 'Séisme !', '#ffcf4a', true); Sfx.mark(); C.shake += 4; await wait(350); return;
      }
      return aiMelee(e, e.dmg, 0);
    }
    case 'reine': {
      if (e.bt % (ph >= 2 ? 2 : 3) === (ph >= 2 ? 0 : 2) && enemies().length < 4 + ph) {
        let n = 0; const want = C.card.diff + (ph >= 1 ? 1 : 0);
        for (const [dx, dy] of shuffle(rnd, DIR8.slice())) {
          if (n >= want || enemies().length >= 4 + ph) break; const x = e.x + dx, y = e.y + dy;
          if (walkable(x, y) && !unitAt(x, y)) { const m = spawnEnemy('rodeur', x, y); m.alpha = 0; C.units.push(m); fx({ type: 'ring', x, y, color: '#e05a9a', dur: 400 }); n++; }
        }
        if (n) { Sfx.summon(); ftext(e.x, e.y, 'Nuée !', '#e05a9a', true); await wait(300); }
      }
      await aiRanged(e, e.dmg, e.range, '#ff7ab8');
      if (ph >= 2 && !e.dead && !C.ended) { // rafale : 2e tir sans bouger
        for (const [dx, dy] of DIR4) { const o = lineFirst(e.x, e.y, dx, dy, e.range); if (o && o.team === 'hero' && !o.dead) { await wait(120); await rangedAttack(e, o, e.dmg, '#ff7ab8'); break; } }
      }
      return;
    }
    case 'oracle': {
      const lines = (h, both) => {
        const row = [], col = [];
        for (let x = 0; x < GRID_W; x++) row.push([x, h.y]);
        for (let y = 0; y < GRID_H; y++) col.push([h.x, y]);
        if (both) return row.concat(col.filter(([x, y]) => y !== h.y));
        const rh = heroUnits().filter(o => o.y === h.y).length, ch = heroUnits().filter(o => o.x === h.x).length;
        return rh >= ch ? row : col;
      };
      const targets = ph >= 2 ? hs : [lowestHero(hs)];
      const all = [];
      for (const h of targets) {
        const tiles = lines(h, ph >= 1).filter(([x, y]) => !(x === e.x && y === e.y));
        all.push(...tiles);
        C.telegraphs.push({ tiles, hp: e.dmg, pct: e.dmg * e.enr, owner: e.uid, label: 'Laser', color: '#7fd6ff', kind: 'laser' });
      }
      Sfx.mark(); fx({ type: 'ring', x: e.x, y: e.y, color: '#7fd6ff', dur: 400 }); await wait(250);
      // il ne se téléporte qu'un tour sur deux, et jamais hors de portée : à 3-4 cases du héros le plus proche
      if (e.bt % 2 === 1) return;
      const f = distField(heroUnits().map(o => [o.x, o.y]));
      const cands = []; for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (walkable(x, y) && !unitAt(x, y) && tile(x, y).t !== 'lava' && !tile(x, y).z && !all.some(([a, b]) => a === x && b === y) && f[key(x, y)] < 99) cands.push([x, y, f[key(x, y)]]);
      const sc = d => d === 4 ? 0 : d === 3 ? 1 : d > 4 ? 2 + d : 10 - d;
      cands.sort((a, b) => sc(a[2]) - sc(b[2]) || a[1] - b[1] || a[0] - b[0]);
      if (cands.length) { const c = cands[Math.floor(rnd() * Math.min(3, cands.length))]; e.alpha = 0.2; Sfx.ghost(); await wait(150); e.x = c[0]; e.y = c[1]; e.rx = c[0]; e.ry = c[1]; e.alpha = 1; await wait(100); }
      return;
    }
    case 'forgeron': {
      if (ph >= 2) { // fournaise : anneau de feu annoncé autour de lui
        C.telegraphs.push({ tiles: areaTiles(e.x, e.y, 'ring8'), center: [e.x, e.y], hp: e.special * 0.7, pct: e.special * 0.7 * e.enr, owner: e.uid, label: 'Fournaise', color: '#ff5a2a', fire: 2 });
      }
      if (ph >= 1 || e.bt % 2 === 0) {
        const h = lowestHero(hs);
        C.telegraphs.push({ tiles: areaTiles(h.x, h.y, 'square'), center: [h.x, h.y], hp: e.special, pct: e.special * e.enr, owner: e.uid, label: 'Marteau', color: '#ff7b3a', fire: ph >= 2 ? 3 : 2 });
        fx({ type: 'proj', x: e.x, y: e.y, x2: h.x, y2: h.y, color: '#ff7b3a', dur: 300, arc: true }); Sfx.mark(); ftext(e.x, e.y, 'Marteau !', '#ff7b3a', true);
        await wait(300);
        const adj = hs.find(o => man(o.x, o.y, e.x, e.y) === 1);
        if (adj) await meleeAttack(e, adj, e.dmg, e.push);
        else if (ph >= 1) await aiMelee(e, e.dmg, e.push);
        return;
      }
      return aiMelee(e, e.dmg, e.push);
    }
    case 'hydre': {
      await aiRanged(e, e.dmg, e.range, '#4fd18b');
      if (ph >= 2 && !e.dead && !C.ended) for (const [dx, dy] of DIR4) { const o = lineFirst(e.x, e.y, dx, dy, e.range); if (o && o.team === 'hero' && !o.dead) { await wait(120); await rangedAttack(e, o, e.dmg, '#4fd18b'); break; } }
      return;
    }
    case 'geolier': {
      // traction : les héros enchaînés sont attirés de 2 cases
      if (ph >= 1) for (const h of hs) if (h.chain > 0 && !h.dead && !C.ended) { ftext(h.x, h.y, 'Traction', '#cfd6ea'); await pullUnit(h, e, null, 2); }
      if (C.ended || e.dead) return;
      if (ph >= 2 && e.bt % 3 === 0) { // cachot : des murs autour d'un héros (sauf du côté du Geôlier)
        const h = lowestHero(hs); let n = 0;
        for (const [dx, dy] of DIR4) {
          const x = h.x + dx, y = h.y + dy; if (!inB(x, y) || !walkable(x, y) || unitAt(x, y)) continue;
          if (Math.sign(e.x - h.x) === dx && dx || Math.sign(e.y - h.y) === dy && dy) continue;
          const tt = tile(x, y); if (tt.z === 'portail' || tt.z === 'cercle') continue;
          tt.t = 'rock'; tt.ttl = 2; n++; fx({ type: 'spark', x, y, color: '#9aa0b4', dur: 300 });
        }
        if (n) { ftext(h.x, h.y, 'Cachot !', '#cfd6ea', true); Sfx.thud(); await wait(250); }
      }
      if (e.bt % 2 === 1) { // chaîne sur le héros le plus loin
        const free = hs.filter(h => !(h.chain > 0));
        if (free.length) {
          const h = free.slice().sort((a, b) => man(b.x, b.y, e.x, e.y) - man(a.x, a.y, e.x, e.y) || a.hero - b.hero)[0];
          h.chain = 2; h.chainBy = e.uid;
          fx({ type: 'bolt', x: e.x, y: e.y, x2: h.x, y2: h.y, color: '#cfd6ea', dur: 350 }); Sfx.hook(); ftext(h.x, h.y, 'Enchaîné !', '#cfd6ea', true);
          await wait(300);
        }
      }
      return aiMelee(e, e.dmg, 0);
    }
    case 'reflet': {
      if (ph >= 2) { // échange : prend la place d'une Ombre
        const om = enemies().filter(o => o.kind === 'ombre').sort((a, b) => a.uid - b.uid)[0];
        if (om) { const ax = e.x, ay = e.y; e.x = om.x; e.y = om.y; om.x = ax; om.y = ay; e.rx = e.x; e.ry = e.y; om.rx = om.x; om.ry = om.y; Sfx.swap(); fx({ type: 'ring', x: e.x, y: e.y, color: '#9aa3ff', dur: 400 }); await wait(200); }
      }
      if (e.bt % (ph >= 1 ? 2 : 3) === 0) { const hs2 = heroUnits().map(h => h.hero), st = Math.floor(e.bt / 2) % Math.max(1, hs2.length); if ([...hs2.slice(st), ...hs2.slice(0, st)].some(hi => spawnOmbre(hi, ph >= 2 ? 3 : MAX_OMBRES))) { ftext(e.x, e.y, 'Reflet !', '#b9c0ff', true); await wait(300); } }
      return aiRanged(e, e.dmg, e.range, '#9aa3ff');
    }
  }
}

/* Traque : téléportation à côté du héros le plus faible + coup immédiat */
async function bossHunt(e, hs) {
  const h = lowestHero(hs);
  const spots = DIR4.map(([dx, dy]) => [h.x + dx, h.y + dy]).filter(([x, y]) => walkable(x, y) && !unitAt(x, y) && tile(x, y).t !== 'lava' && !tile(x, y).z);
  if (!spots.length) return false;
  spots.sort((a, b) => man(a[0], a[1], e.x, e.y) - man(b[0], b[1], e.x, e.y) || a[1] - b[1] || a[0] - b[0]);
  const [x, y] = spots[0];
  C.huntTurn = C.turn;
  for (const o of enemies()) if (o.boss) o.lastHit = Math.max(o.lastHit || 0, C.turn - 1);
  ftext(e.x, e.y, 'Traque !', '#ff5a5a', true); Sfx.ghost();
  e.alpha = 0.2; await wait(200); e.x = x; e.y = y; e.rx = x; e.ry = y; e.alpha = 1; await wait(120);
  fx({ type: 'ring', x, y, color: '#ff5a5a', dur: 450 });
  await meleeAttack(e, h, e.dmg, 0);
  e.lastHit = C.turn;
  return true;
}

/* ---------- zone de danger (ce que les ennemis peuvent toucher au prochain tour) ---------- */
function dangerTiles(onlyUnit) {
  const set = new Set();
  const list = onlyUnit ? [onlyUnit] : enemies();
  for (const e of list) {
    if (e.stun > 0) continue;
    const mv = e.move + G().enemyMove;
    const m = bfs(e.x, e.y, mv, 'enemy', false);
    const ai = e.ai === 'boss' ? (e.kind === 'reine' || e.kind === 'hydre' || e.kind === 'reflet' ? 'ranged' : (e.kind === 'oracle' ? 'none' : 'melee')) : (e.ai === 'mirror' ? 'healer' : e.ai);
    if (ai === 'ombre') { for (const [dx, dy] of DIR4) if (inB(e.x + dx, e.y + dy)) set.add(key(e.x + dx, e.y + dy)); continue; }
    if (ai === 'frost' || ai === 'sower' || ai === 'pyro' || ai === 'sapper' || ai === 'banner') continue;
    if (ai === 'lance') { for (const n of m.values()) for (const [dx, dy] of DIR4) for (const [x, y] of lanceTiles(n.x, n.y, dx, dy)) set.add(key(x, y)); continue; }
    if (ai === 'blow' || ai === 'hook') { for (const n of m.values()) for (const [dx, dy] of DIR4) for (let i = 1; i <= e.range; i++) { const x = n.x + dx * i, y = n.y + dy * i; if (!inB(x, y) || isRock(x, y)) break; set.add(key(x, y)); } continue; }
    if (ai === 'melee' || ai === 'kamikaze' || ai === 'summoner' || ai === 'skirmish') {
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
      s.mods = s.mods.filter(m => { if (m.perm) return true; m.dur--; if (m.dur <= 0) { expired.push(`${tr(UPGRADES[m.key].name)} (${tr(SKILLS[s.key].name)}, ${hn})`); return false; } return true; });
      if (!s.perm) { s.dur--; if (s.dur <= 0) { expired.push(`${tr(SKILLS[s.key].name)} (${hn})`); h.slots[si] = null; } }
    });
  });
  S.rules = S.rules.filter(r => { if (r.perm) return true; r.dur--; if (r.dur <= 0) { expired.push(`${tr('Règle')} ${tr(RULES[r.key].name)}`); return false; } return true; });
  S.pacts = S.pacts.filter(p => { p.dur--; if (p.dur <= 0) { expired.push(`${tr('Pacte')} ${tr(PACTS[p.key].name)}`); return false; } return true; });
  return expired;
}

function roomComplete(res) {
  const card = C.card;
  const kills = C.kills.slice();
  const goalOk = res === 'win' && !!card.goal && goalStatus() !== 'fail' && goalMetAtEnd();
  const perfect = res === 'win' && !C.gs.hurt;
  const falls = C.gs.falls || 0;
  C = null; UNDO = null;
  S.pending = null; S.depth++; S.stats.rooms++;
  const notes = [];
  const expired = tickDurations();
  if (S.talents.repos) { for (const h of S.heroes) h.pct = Math.min(maxPct(), h.pct + 3 * S.talents.repos); }
  if (perfect) S.stats.perfect++;
  if (goalOk) {
    S.stats.goals++;
    for (const h of S.heroes) h.pct = Math.min(maxPct(), h.pct + GOAL_HEAL);
    notes.push({ t: `${tr('Défi')} « ${tr(GOALS[card.goal].name)} » ${tr(`réussi : +${GOAL_HEAL} % à tous les héros${card.boss ? ' et or ×1,5' : ''} !`)}`, c: 'gold' });
    addLog(`Défi ${GOALS[card.goal].name} réussi.`);
  } else if (res === 'win' && card.goal) notes.push({ t: `${tr('Défi')} « ${tr(GOALS[card.goal].name)} » ${tr('raté.')}`, c: 'dim' });
  if (card.boss) {
    S.bossesSeen++; S.sinceBoss = 0;
    if (res === 'win') {
      const m = Math.round(bossMoney(card) * (goalOk ? 1.5 : 1)); S.money += m; S.stats.moneyTotal += m; S.bossesKilled++;
      notes.push({ t: `${tr('Boss battu')} : ${tr(BOSSES[card.boss].name)} ${tr(`(+${m} or)`)}`, c: 'gold' });
      if (!S.daily && lvl() >= unlockedLevel()) { setUnlocked(lvl() + 1); notes.push({ t: `Difficulté ${lvl() + 1} débloquée !`, c: 'gold' }); addLog(`Difficulté ${lvl() + 1} débloquée.`); }
      addLog(`Boss battu : ${BOSSES[card.boss].name} (+${m} or).`);
    } else {
      S.bossesFailed++;
      notes.push({ t: `${tr(BOSSES[card.boss].name)} ${tr('s’est enfui : pas d’or.')}`, c: 'bad' });
      addLog(`${BOSSES[card.boss].name} s’est enfui.`);
    }
  } else {
    S.sinceBoss++;
    if (res === 'flee') { notes.push({ t: 'Fuite : aucune récompense.', c: 'bad' }); addLog('Fuite d’une salle.'); }
    if (res === 'escape') { notes.push({ t: 'Le voleur s’est enfui : aucune récompense.', c: 'bad' }); addLog('Le voleur s’est enfui.'); }
  }
  // statistiques à vie et hauts faits
  const won = res === 'win';
  const fresh = lifeAdd({ rooms: 1, kills: kills.reduce((a, b) => a + b, 0), falls, perfect: perfect ? 1 : 0, goals: goalOk ? 1 : 0, d2: won && card.diff === 2 ? 1 : 0, bosses: won && card.boss ? 1 : 0, perfectBoss: won && card.boss && perfect ? 1 : 0 },
    Object.assign({ maxDepth: S.depth }, won && card.boss ? { maxLvlBoss: lvl(), mutBoss: (card.mods || []).length } : {}), won && card.boss ? card.boss : null);
  for (const f of fresh) notes.push({ t: `${tr('Haut fait')} : ${tr(f.name)} — ${tr(f.desc)}`, c: 'gold' });
  // Épreuve du jour : points
  if (S.daily) {
    const p = (won ? (card.boss ? 60 : 10) * card.diff : 0) + (goalOk ? 10 : 0) + (perfect ? 5 : 0);
    S.daily.pts += p;
    if (p) notes.push({ t: `Épreuve : +${p} points (total ${S.daily.pts})`, c: 'gold' });
  }
  for (const x of expired) notes.push({ t: `${tr('Expiré')} : ${x}`, c: 'dim' });
  for (const k in ENEMIES) if (ENEMIES[k].minDepth === S.depth && S.depth > 0) { notes.push({ t: `${tr('Nouvel ennemi')} : ${tr(ENEMIES[k].name)} — ${tr(ENEMIES[k].desc)}`, c: 'bad' }); addLog(`Nouvel ennemi : ${ENEMIES[k].name}.`); }
  if (S.depth % 10 === 0) { const e = eraData(S.depth); notes.push({ t: `${tr('Nouvelle ère')} : ${tr(e.name)} — ${tr(e.desc)}`, c: 'gold' }); addLog(`Nouvelle ère : ${e.name}.`); }
  if (S.depth === 4) notes.push({ t: 'Les boss peuvent maintenant apparaître derrière une porte. Eux seuls donnent de l’or.', c: 'gold' });
  if (expired.length) addLog(`Expiré : ${expired.join(', ')}.`);
  if (S.daily && S.depth >= DAILY_ROOMS) {
    S.daily.done = true; save();
    const rec = saveDailyRecord(S.daily.pts);
    for (const f of lifeAdd({ daily: 1 }, { dailyBest: S.daily.pts })) notes.push({ t: `${tr('Haut fait')} : ${tr(f.name)} — ${tr(f.desc)}`, c: 'gold' });
    UI.showDailyEnd(rec, notes);
    return;
  }
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
function talentCost(k) { return Math.round(TALENTS[k].base * Math.pow(TALENTS[k].grow, S.talents[k] || 0)); }

/* ---------- défis de salle ---------- */
function goalTurns(card, room) {
  if (card.boss) return 5 + card.diff;
  return Math.max(2, Math.ceil(room.enemies.length / 2) + 1);
}
function goalText(goal, n) { return GOALS[goal].desc(n); }
/* 'ok' (déjà acquis), 'fail' (déjà raté) ou 'pending' */
function goalStatus() {
  if (!C || !C.goal) return null;
  const gs = C.gs;
  switch (C.goal) {
    case 'intact': return gs.hurt ? 'fail' : 'pending';
    case 'rapide': return C.turn > C.goalN ? 'fail' : 'pending';
    case 'chute': return gs.falls >= 1 ? 'ok' : 'pending';
    case 'fracas': return gs.crash >= 2 ? 'ok' : 'pending';
    case 'combo': return gs.combo ? 'ok' : 'pending';
    case 'econome': return gs.basic ? 'fail' : 'pending';
  }
  return 'pending';
}
function goalMetAtEnd() {
  const st = goalStatus();
  if (st === 'ok') return true;
  if (st === 'fail') return false;
  return ['intact', 'rapide', 'econome'].includes(C.goal);
}

/* ---------- prévision exacte du tour ennemi ----------
   On rejoue le tour ennemi sur une copie de la partie, sans animation : même graine,
   donc même résultat que le vrai tour si tu finis ton tour maintenant. */
async function computePreview() {
  if (!C || C.phase !== 'hero' || C.busy || C.ended || SIM || rngFn !== Math.random) return null;
  const S0 = S, C0 = C, u0 = uidSeq, R0 = rngFn, ver = C.ver;
  let out = null;
  const copy = cloneCombat();
  try {
    S = structuredClone(S0); C = copy; C.simLog = [];
    SIM = true;
    await enemyPhase();
    out = { ver, pct: S.heroes.map(h => h.pct), fail: C.ended === 'fail' || C.failed, win: C.ended === 'win', pos: {}, atks: C.simLog.filter(l => l.t === 'atk'), tel: C.telegraphs.map(t => ({ tiles: t.tiles, color: t.color, label: t.label })) };
    for (const u of C.units) out.pos[u.uid] = { x: u.x, y: u.y, dead: u.dead };
    out.spawned = C.units.filter(u => u.uid >= u0 && !u.dead && u.team === 'enemy').map(u => ({ x: u.x, y: u.y, kind: u.kind }));
  } catch (e) { console.warn('Prévision impossible', e); }
  finally { S = S0; C = C0; SIM = false; uidSeq = u0; rngFn = R0; }
  if (out && C === C0 && C.ver === ver) C.preview = out;
  return out;
}
