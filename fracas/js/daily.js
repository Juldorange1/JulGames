// DEFI DU JOUR : une partie courte (2 parties du Monde = 20 salles, 2 boss) dont TOUT est tire au
// sort a partir de la date : parties, cartes des salles, personnages (et quand on en change),
// bonus/malus proposes, et surtout un EVENEMENT MAJEUR qui change toute la partie.
// Identique pour tout le monde le meme jour ; rejouable a volonte ; but : battre son record de temps.
// Un boss qui s'enfuit (tomber a 40 %) coute +30 s.

const DAILY_ROOMS = 20;
const DAILY_FLEE_PENALTY = 30; // s ajoutees quand un boss s'enfuit
// Evenements majeurs : modificateurs (memes cles que les bonus/malus) appliques a toute la partie.
const DAILY_EVENTS = [
  { id: 'blizzard', icon: '⛸️', mods: { slippery: 1, storm: 1 } },
  { id: 'darkness', icon: '🌫️', mods: { fog: 1, ghosts: 1 } },
  { id: 'firerain', icon: '☄️', mods: { meteorRain: 1, allyMeteors: 1 } },
  { id: 'frenzy', icon: '⏩', speed: 135, mods: { chainBlast: 1 } },
  { id: 'hunt', icon: '🧲', mods: { homingShots: 1, bulletTime: 1 } },
  { id: 'giants', icon: '👹', power: 1.4, mods: { dmgDealt: 0.3 } },
  { id: 'overload', icon: '✨', mods: { allAbilities: 1, cdRate: 0.6, dmgTaken: 0.3 } },
  { id: 'glass', icon: '💥', mods: { dmgDealt: 0.6, dmgTaken: 0.8 } },
  { id: 'swarm', icon: '➕', mods: { extraEnemies: 3, enemyHp: -0.35 } },
  { id: 'quake', icon: '🥴', mods: { shakyAim: 1, orbitShield: 1 } },
];

// Generateur pseudo-aleatoire reproductible (meme graine = memes tirages).
function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Execute fn avec Math.random remplace par un tirage reproductible.
function withSeed(seed, fn) {
  const orig = Math.random;
  Math.random = seededRng(seed);
  try { return fn(); } finally { Math.random = orig; }
}
function hashString(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const Daily = {
  elapsed: 0,
  penalty: 0,
  cfg: null,
  done: false,

  key() { return localDateKey(); },
  config(key) {
    const k = key || this.key();
    const seed = hashString('fracas-daily-' + k);
    const rng = seededRng(seed);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const parts = [1, 2, 3].sort(() => rng() - 0.5).slice(0, 2);
    const ids = allCharacterIds();
    const c0 = pick(ids), c1 = pick(ids.filter((i) => i !== c0)), c2 = pick(ids.filter((i) => i !== c1));
    const s1 = 6 + Math.floor(rng() * 5);                 // 1er changement : salle 6 a 10
    const s2 = Math.min(18, s1 + 5 + Math.floor(rng() * 5)); // 2e : 5 a 9 salles plus tard
    return { key: k, seed, parts, chars: [c0, c1, c2], swaps: [s1, s2], event: DAILY_EVENTS[Math.floor(rng() * DAILY_EVENTS.length)] };
  },
  record(key) { const d = Save.data.dailyRecords || {}; return d[key || this.key()] != null ? d[key || this.key()] : null; },
  totalMs() { return Math.round((this.elapsed + this.penalty) * 1000); },

  start(cfg) { this.cfg = cfg; this.elapsed = 0; this.penalty = 0; this.done = false; },
  bossFled() { this.penalty += DAILY_FLEE_PENALTY; },
  // Fin des 20 salles : temps final, record du jour.
  finish() {
    this.done = true;
    const ms = this.totalMs();
    if (!Save.data.dailyRecords) Save.data.dailyRecords = {};
    const key = this.cfg.key, best = Save.data.dailyRecords[key];
    const isRecord = best == null || ms < best;
    if (isRecord) Save.data.dailyRecords[key] = ms;
    // on ne garde que les 30 derniers jours
    const keys = Object.keys(Save.data.dailyRecords).sort();
    while (keys.length > 30) delete Save.data.dailyRecords[keys.shift()];
    Save.persist();
    if (isRecord) Audio2.record();
    Music.jingle('victory');
    UI.showRoundEnd(`📅 ${S('dailyDone')}`, ms, isRecord, () => Game.startDaily(), () => Game.leaveDaily());
  },

  // ---------- ecran de presentation ----------
  renderMenu() {
    const cfg = this.config();
    const ev = cfg.event;
    const panel = UI.el('div', 'panel daily-panel');
    panel.appendChild(UI.backBtn(() => Game.goToMenu()));
    panel.appendChild(UI.el('h2', null, `📅 ${S('dailyTitle')}`));
    const d = new Date(), midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const left = Math.max(0, midnight - d), hh = Math.floor(left / 3600000), mm = Math.floor((left % 3600000) / 60000);
    panel.appendChild(UI.el('div', 'menu-sub', `${d.toLocaleDateString()} · ⏳ ${S('dailyNext')} ${hh}h${String(mm).padStart(2, '0')}`));
    const evCard = UI.el('div', 'daily-event');
    evCard.appendChild(UI.el('div', 'daily-event-icon', ev.icon));
    const evTxt = UI.el('div', 'daily-event-txt');
    evTxt.appendChild(UI.el('div', 'daily-kicker', `⚠ ${S('dailyEvent')}`));
    evTxt.appendChild(UI.el('h3', null, S('dailyEv_' + ev.id)));
    evTxt.appendChild(UI.el('p', null, S('dailyEvd_' + ev.id)));
    evCard.appendChild(evTxt);
    panel.appendChild(evCard);
    const info = UI.el('div', 'daily-info-row');
    const box = (icon, title, value) => { const b = UI.el('div', 'daily-box'); b.appendChild(UI.el('span', null, `${icon} ${title}`)); b.appendChild(UI.el('b', null, value)); info.appendChild(b); };
    box('🗺️', S('dailyParts'), cfg.parts.map((p) => `${S('hudPart')} ${p}`).join(' → '));
    box('🧍', S('dailyChars'), `${charName(cfg.chars[0])} → ${charName(cfg.chars[1])} (${S('infRoom')} ${cfg.swaps[0]}) → ${charName(cfg.chars[2])} (${S('infRoom')} ${cfg.swaps[1]})`);
    const rec = this.record();
    box('🏆', S('record'), rec != null ? formatTime(rec) : '—');
    panel.appendChild(info);
    panel.appendChild(UI.el('div', 'daily-rules', S('dailyRules')));
    const go = UI.el('div', 'menu-btn daily-go', `▶ ${S('dailyPlay')}`);
    go.onclick = () => Game.startDaily();
    panel.appendChild(go);
    UI.overlay.appendChild(panel);
  },
};
