// FRACAS INFINI : seconde version du jeu, a part de la version classique.
// Pas de base : des parties qui continuent a l'infini, de salle en salle (porte de droite).
//   - 3 EMPLACEMENTS de partie, chacun avec sa PROGRESSION INDEPENDANTE : argent gagne dans
//     cette partie, ameliorations achetees dans cette partie, salle, personnage, % de degats ;
//   - meme difficulte dans toutes les parties ; boss toutes les 10 salles, tous pareils sauf le
//     BOSS FINAL (fin de chaque 3e partie, B7) : plus dur, rapporte 3x plus ;
//   - MARCHAND a la FIN DE CHAQUE BOSS (apres le choix bonus/malus) : ameliorations de gain d'€, de degats et de
//     resistance (prix croissant), payees avec l'argent de la partie + vitesse du jeu gratuite ;
//   - 1 chance sur 15, en entrant dans une salle, de changer de personnage au hasard ;
//   - les parties du Monde alternent (1, 2, 3, 1, 2...) toutes les 10 salles et, comme dans le
//     Monde, chaque personnage n'a acces qu'a UNE de ses 3 competences selon la partie ;
//   - le % de degats ne descend jamais sous 40% (INF_DMG_MIN) ; aucun soin, sauf en TRAVERSANT
//     une porte : +12,5% par salle, et la porte d'une salle de boss regenere ENTIEREMENT ;
//   - salle de boss : atteindre 40% = boss perdu : il s'enfuit et la salle ne rapporte rien ;
//   - vitesse du jeu et PUISSANCE DES ENNEMIS (degats + PV, et % d'argent gagne en consequence)
//     ne se reglent qu'a la fin d'un boss (ecran du choix bonus/malus).
// Pas de chrono ni de record : seulement les statistiques de la partie en cours.
// Chaque partie est sauvegardee a chaque salle : on peut quitter et reprendre plus tard.

const INF_SLOTS = 3;
const INF_DMG_MIN = 0.40;      // plancher du % de degats (atteint pendant un boss = boss perdu)
const INF_KILL_REGEN = 0.02; // +2% par ennemi tue ; finir une salle de boss (= nouvelle partie) remet a 100%
const INF_POWER_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3]; // puissance des ennemis
const INF_SPEED_STEPS = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150]; // vitesse du jeu (%)
// Changement de perso : aleatoire mais encadre. On garde un perso AU MOINS 5 salles d'affilee et
// AU PLUS 15 ; entre les deux, 1 chance sur 6 a chaque nouvelle salle (~10 salles en moyenne).
const INF_SWAP_MIN_ROOMS = 5, INF_SWAP_MAX_ROOMS = 15, INF_SWAP_CHANCE = 1 / 6;
const INF_ROOM_MONEY = 0.10;      // € par salle videe (toujours le meme)
const INF_BOSS_MONEY_MULT = 10;   // une salle de boss rapporte 10x plus (tous les boss pareil)
const INF_FINAL_MONEY_MULT = 30;  // boss FINAL (fin de chaque 3e partie) : 30x
const INF_FINAL_HP_MULT = 2;      // difficulte du boss FINAL : 2x les PV (en plus de ses attaques)
const INF_UPGRADES = {
  money: { base: 2, growth: 1.6, perLevel: 0.15, max: 30 },  // +15% d'€ gagnes par niveau
  damage: { base: 3, growth: 1.6, perLevel: 0.08, max: 30 }, // +8% de degats infliges par niveau
  resist: { base: 3, growth: 1.6, perLevel: 0.06, max: 10 }, // -6% de degats subis par niveau (max -60%)
};
const INF_UPGRADE_ORDER = ['money', 'damage', 'resist'];
const INF_UPGRADE_ICON = { money: '💰', damage: '⚔️', resist: '🛡️' };

function infNewRun(characterId) {
  return { depth: 1, characterId, mult: 1, money: 0, upgrades: { money: 0, damage: 0, resist: 0 }, power: 1, speed: 100, createdAt: Date.now() };
}
// Puissance des ennemis de la partie : multiplie leurs degats et leurs PV ; l'argent gagne suit
// (puissance 150% = +50% d'argent, 50% = -50%).
function infPower(run) { return run && run.power > 0 ? run.power : 1; }
function infPowerMoneyMult(run) { return infPower(run); }
function infSpeed(run) { return run && run.speed > 0 ? run.speed : 100; }

function infData() {
  const d = Save.data;
  if (!d.infinite) d.infinite = {};
  const inf = d.infinite;
  if (inf.speedMult == null) inf.speedMult = 100;
  if (!Array.isArray(inf.slots)) {
    inf.slots = [null, null, null];
    // ancienne sauvegarde (une seule partie, ameliorations communes) -> emplacement 1
    if (inf.run) inf.slots[0] = Object.assign(infNewRun(inf.run.characterId), inf.run, { money: 0, upgrades: Object.assign({ money: 0, damage: 0, resist: 0 }, inf.upgrades || {}) });
    delete inf.run; delete inf.upgrades; delete inf.bestDepth;
  }
  while (inf.slots.length < INF_SLOTS) inf.slots.push(null);
  return inf;
}

// Partie en cours (celle de l'emplacement joue).
function infRun() { return Infinite.run; }
function infLevel(key) { const r = infRun(); return r ? r.upgrades[key] || 0 : 0; }
function infPrice(key) { const u = INF_UPGRADES[key]; return roundCents(u.base * Math.pow(u.growth, infLevel(key))); }
function infIsMax(key) { return infLevel(key) >= INF_UPGRADES[key].max; }
function infBonus(key) { return infLevel(key) * INF_UPGRADES[key].perLevel; }
function infMoney() { const r = infRun(); return r ? r.money : 0; }
// Applique les ameliorations de la partie au personnage (y compris apres un changement de perso).
function infApplyUpgrades(player) {
  if (!player) return;
  player.dmgMin = INF_DMG_MIN; // jamais sous 40%
  player.noHeal = true;  // aucun soin (sauf en traversant une porte, voir completeAdvance)
  player.dmgBonus = 1 + infBonus('damage');
  player.resist = Math.min(0.9, infBonus('resist'));
  Boons.applyPlayer(player);
}
function infBuy(key) {
  const r = infRun();
  if (!r || infIsMax(key)) return false;
  const price = infPrice(key);
  if (r.money < price - 1e-9) return false;
  r.money = roundCents(r.money - price);
  r.upgrades[key] += 1;
  Save.persist();
  infApplyUpgrades(Game.world && Game.world.player);
  Audio2.purchase();
  return true;
}

const Infinite = {
  active: false,
  slot: 0,
  run: null,
  depth: 1,
  characterId: null,
  transitionTimer: 0,
  transitionPhase: null,
  transitionDuration: 0.32,
  shopOpen: false,
  swapBanner: 0,
  partBanner: 0,
  fleeBanner: 0,
  finalBanner: 0,
  atBase: false,      // la partie est arretee a la BASE (apres les 3 parties)
  layout: null,
  finished: false, // jamais : la partie est infinie (champ attendu par le HUD commun)

  // Demarre (ou reprend) la partie de l'emplacement `slot`.
  // Defi du jour : meme moteur, mais une partie temporaire (jamais sauvegardee) dont tout vient
  // de la configuration du jour (voir js/daily.js).
  startDaily(world, cfg) {
    this.daily = cfg;
    Daily.start(cfg);
    for (const k of Object.keys(cfg.event.mods)) Save.markBoonSeen(BOON_EFFECTS[k] ? 'boon' : 'curse', k);
    const run = infNewRun(cfg.chars[0]);
    run.power = cfg.event.power || 1;
    run.speed = cfg.event.speed || 100;
    run.boons = Boons.fresh();
    run.daily = true;
    this.start(world, -1, run);
  },

  start(world, slot, dailyRun) {
    const inf = infData();
    this.active = true;
    this.slot = slot;
    if (!dailyRun) this.daily = null;
    this.run = dailyRun || inf.slots[slot];
    this.characterId = this.run.characterId;
    this.depth = this.run.depth;
    this.transitionTimer = 0;
    this.transitionPhase = null;
    this.shopOpen = false;
    this.swapBanner = 0; this.partBanner = 0; this.fleeBanner = 0;
    if (this.run.speed == null) this.run.speed = infData().speedMult || 100; // ancienne vitesse commune
    if (this.run.power == null) this.run.power = 1;
    if (!this.run.boons) this.run.boons = Boons.fresh();
    Boons.bind(this.run.boons, true, this.daily ? this.daily.event.mods : null);
    Playtest.log('runStart', { mode: 'infini', char: this.characterId, depth: this.depth });
    world.player.damageMultiplier = clamp(this.run.mult != null ? this.run.mult : 1, INF_DMG_MIN, DMG_MAX + Boons.get('maxPct'));
    infApplyUpgrades(world.player);
    this.loadRoom(world);
  },

  // Profondeur -> partie (decor, pool d'ennemis) et numero dans la "decennie" (10 = boss).
  partOf(depth) {
    if (this.daily) return this.daily.parts[Math.min(1, Math.floor((depth - 1) / 10))]; // defi : 2 parties du jour
    return (Math.floor((depth - 1) / 10) % 3) + 1;
  },
  isFinalBoss(depth) { const d = depth || this.depth; return !this.daily && this.indexOf(d) === 10 && this.partOf(d) === 3; },
  indexOf(depth) { return ((depth - 1) % 10) + 1; },

  loadRoom(world) {
    const part = this.partOf(this.depth), index = this.indexOf(this.depth);
    const gen = () => generateRoomLayout(part, index, { uniform: true }); // toutes les parties aussi dures
    this.layout = this.daily ? withSeed(this.daily.seed + this.depth * 7919, gen) : gen(); // defi : memes salles pour tous
    if (this.isFinalBoss()) this.layout.bossTypes = ['B7']; // fin de la 3e partie : boss final
    if (index === 1 && this.depth > 1) this.partBanner = 2.4; // nouvelle partie du Monde
    if (this.daily) withSeed(this.daily.seed + this.depth * 104729, () => this.buildRoom(world)); else this.buildRoom(world);
    this.saveRun(world);
    Game.updateCamera(1);
  },

  // (Re)construit la salle courante a partir de son plan : ennemis, murs, decor.
  buildRoom(world) {
    const layout = this.layout;
    const part = this.partOf(this.depth);
    instantiateRoom(world, layout);
    // Difficulte identique partout (pas de montee avec la profondeur) : seule la PUISSANCE choisie
    // apres chaque boss la change. Chaque boss garde ses PV propres (650 max de base).
    const power = infPower(this.run);
    for (const e of world.enemies) {
      let k = power;
      if (e.type === 'B7') k *= INF_FINAL_HP_MULT; // chaque boss garde ses PV propres ; le final x2
      e.hp *= k; e.maxHp *= k;
    }
    if (this.isFinalBoss()) this.finalBanner = 4;
    world.player.x = layout.spawnPoint.x;
    world.player.y = layout.spawnPoint.y;
    // regeneration : +2% a chaque ennemi tue (jamais au-dessus du maximum)
    world.onEnemyKilled = (e) => {
      const p = world.player;
      if (!p || e.type === 'DUMMY') return;
      const max = p.dmgMax || DMG_MAX;
      if (p.damageMultiplier >= max) return;
      p.damageMultiplier = Math.min(max, p.damageMultiplier + INF_KILL_REGEN);
      Particles.text(p.x, p.y - 30, `+${Math.round(INF_KILL_REGEN * 100)}%`, '#7fff9c');
    };
    world.abilityGate = part; // comme dans le Monde : une seule competence selon la partie
    world.userSpeedMult = infSpeed(this.run) / 100;
    world.enemyPower = infPower(this.run); // degats des ennemis (voir enemyDamageScale)
    world.onlineUnder = null;
    ensureRoomExit(world.room);
    Boons.applyRoom(world);
    Playtest.roomStart();
  },

  saveRun(world) {
    const r = this.run;
    if (!r || this.daily) return; // le defi du jour n'est jamais sauvegarde
    r.depth = this.depth;
    r.characterId = this.characterId;
    r.mult = world.player ? Math.max(INF_DMG_MIN, world.player.damageMultiplier) : r.mult;
    r.updatedAt = Date.now();
    infData().slots[this.slot] = r;
    Save.persist();
  },

  update(world, realDt) {
    if (!this.active) return;
    if (this.swapBanner > 0) this.swapBanner -= realDt;
    if (this.partBanner > 0) this.partBanner -= realDt;
    if (this.fleeBanner > 0) this.fleeBanner -= realDt;
    if (this.finalBanner > 0) this.finalBanner -= realDt;
    if (this.transitionPhase === 'choice' || this.transitionPhase === 'done') return; // choix bonus/malus / defi termine
    if (this.daily) Daily.elapsed += realDt; // chrono du defi du jour
    if (this.transitionPhase === 'out') {
      this.transitionTimer -= realDt;
      if (this.transitionTimer <= 0) this.completeAdvance(world);
      return;
    }
    if (this.transitionPhase === 'in') {
      this.transitionTimer -= realDt;
      if (this.transitionTimer <= 0) { this.transitionTimer = 0; this.transitionPhase = null; }
      return;
    }
    if (this.shopOpen) return; // le marchand met la partie en pause
    // salle de boss : tomber a 40% (le plancher) = boss perdu : il s'enfuit, pas d'argent
    const p = world.player;
    if (p && world.room.isBoss && !world.room.bossFled && !world.room.exit.open && p.damageMultiplier <= INF_DMG_MIN + 1e-6
        && world.enemies.some((e) => !e.dead)) this.bossFlees(world);
    const room = world.room;
    updateRoomExit(world, realDt);
    if (!room.exit.open && world.enemies.every((e) => e.dead)) {
      if (!room.bossFled) this.rewardRoom(world);
      openRoomExit(world);
    }
    if (playerAtExit(world)) {
      this.transitionPhase = 'out';
      this.transitionTimer = this.transitionDuration;
      Audio2.doorPass();
    }
  },

  // Le boss s'enfuit : il disparait (ainsi que ses renforts), la porte s'ouvre, pas d'argent.
  bossFlees(world) {
    world.room.bossFled = true;
    if (this.daily) Daily.bossFled(); // defi du jour : +30 s
    Playtest.log('bossFled', { mode: 'infini', depth: this.depth, secs: Playtest.secs(), power: infPower(this.run), bossTypes: [...new Set(world.enemies.filter((e) => e.kind === 'boss' && !e.dead).map((e) => e.type))] });
    for (const e of world.enemies) {
      if (e.dead) continue;
      Particles.burst(e.x, e.y, 34, '#b98cff', { maxSpeed: 240, life: 0.8 });
      Particles.ring(e.x, e.y, 70, '#b98cff', 0.5);
      e.dead = true; e.noRespawn = true; e.fled = true;
    }
    // ses tirs et ses zones de degats disparaissent avec lui (le decor de glace/boue reste)
    world.projectiles = world.projectiles.filter((pr) => pr.team !== TEAM.ENEMY);
    world.zones = world.zones.filter((z) => !(z.team === TEAM.ENEMY && !z.terrainType));
    this.fleeBanner = 3;
    Audio2.teleport();
    Game.shakeCamera(6, 0.3);
  },

  // Argent de LA PARTIE (chaque partie a son propre porte-monnaie).
  rewardRoom(world) {
    const isBoss = world.room.isBoss;
    if (this.daily) return; // pas d'argent dans le defi du jour
    if (!world.room.bossFled) Playtest.roomEnd('infini', { depth: this.depth, part: this.partOf(this.depth), boss: !!isBoss, bossTypes: isBoss ? [...new Set(world.enemies.filter((e) => e.kind === 'boss').map((e) => e.type))] : undefined, power: infPower(this.run) }, world.player);
    const mult = isBoss ? (this.isFinalBoss() ? INF_FINAL_MONEY_MULT : INF_BOSS_MONEY_MULT) : 1;
    const gain = roundCents(INF_ROOM_MONEY * mult * (1 + infBonus('money')) * Boons.moneyMult() * infPowerMoneyMult(this.run));
    if (gain > 0 && this.run) {
      this.run.money = roundCents(this.run.money + gain);
      Save.persist();
      const p = world.player;
      if (p) Particles.text(p.x, p.y - 40, `+${formatMoney(gain)}`, '#ffd23d');
      Audio2.coins();
    }
  },

  completeAdvance(world) {
    // regeneration complete apres une salle de boss ; apres le boss FINAL (3e partie) : la base
    const wasBoss = !!(world.room && world.room.isBoss);
    const toBase = wasBoss && this.isFinalBoss() && !this.daily;
    const pl = world.player;
    if (pl) {
      const max = pl.dmgMax || DMG_MAX, before = pl.damageMultiplier;
      if (wasBoss) pl.damageMultiplier = Math.max(before, max); // fin de boss : 100%
      this.regenGain = Math.round((pl.damageMultiplier - before) * 100);
    }
    // defi du jour : fini apres les 2 parties (salle 20)
    if (this.daily && wasBoss && this.depth >= DAILY_ROOMS) { this.transitionPhase = 'done'; this.transitionTimer = 0; Daily.finish(); return; }
    this.depth += 1;
    // changement de personnage (le % de degats est garde) : pas avant 5 salles, force a 15 ;
    // defi du jour : aux salles prevues par la configuration du jour
    const run = this.run;
    run.charRooms = (run.charRooms || 0) + 1;
    const dailySwap = this.daily ? this.daily.swaps.indexOf(this.depth) : -1;
    const swap = this.daily ? dailySwap >= 0 : (run.charRooms >= INF_SWAP_MAX_ROOMS || (run.charRooms >= INF_SWAP_MIN_ROOMS && Math.random() < INF_SWAP_CHANCE));
    if (swap) {
      run.charRooms = 0;
      const others = allCharacterIds().filter((id) => id !== this.characterId);
      const id = this.daily ? this.daily.chars[dailySwap + 1] : choice(others);
      const mult = world.player.damageMultiplier;
      Game.spawnPlayerFor(id, 0, 0);
      world.player.damageMultiplier = mult;
      infApplyUpgrades(world.player);
      this.characterId = id;
      Save.markCharPlayed(id);
      this.swapBanner = 2.6;
      this.briefingFor = id; // mode assiste : fiche du nouveau perso en entrant dans la salle
      Audio2.teleport();
    }
    const enter = () => {
      this.loadRoom(world);
      this.transitionPhase = 'in';
      this.transitionTimer = this.transitionDuration;
      const p = world.player;
      if (p && this.regenGain > 0) Particles.text(p.x, p.y - 30, `+${this.regenGain}%`, '#7fff9c');
      this.regenGain = 0;
      if (this.briefingFor) { const id = this.briefingFor; this.briefingFor = null; Assist.briefing(id, this.partOf(this.depth)); }
      else if (this.indexOf(this.depth) === 1) Assist.newPart(this.characterId, this.partOf(this.depth));
    };
    // nouvelle partie du Monde (toutes les 10 salles) : choix d'1 bonus et d'1 malus
    if (this.indexOf(this.depth) === 1) {
      this.transitionPhase = 'choice';
      this.transitionTimer = 0;
      this.saveRun(world);
      // fin d'un boss : bonus/malus + reglages, puis le MARCHAND (seul moment ou il est accessible)
      if (this.daily) { // defi : memes cartes pour tous, pas de marchand ni de reglages
        withSeed(this.daily.seed + 777, () => Boons.open(() => enter()));
        return;
      }
      Boons.open(() => { this.saveRun(world); this.openShop(() => { this.saveRun(world); if (toBase) this.goBase(world); else enter(); }); }, () => InfiniteUI.buildBossSettings(this.run));
      return;
    }
    enter();
  },

  // Fin des 3 parties : la partie s'arrete a la BASE (on en repart pour les 3 parties suivantes).
  goBase(world) {
    this.run.atBase = true;
    this.saveRun(world);
    this.active = false;
    this.atBase = true;
    Game.setState(STATE.MENU);
  },

  // Marchand : uniquement a la fin d'un boss (apres le choix bonus/malus) ; onClose = salle suivante.
  openShop(onClose) { this.shopOpen = true; this.shopClose = onClose || null; InfiniteUI.showShop(); },
  closeShop() { this.shopOpen = false; InfiniteUI.hideShop(); const cb = this.shopClose; this.shopClose = null; if (cb) cb(); },

  leave(world) {
    if (this.active && world && world.player) this.saveRun(world);
    this.active = false;
    this.daily = null;
    if (world) world.enemyPower = null;
    this.shopOpen = false;
    InfiniteUI.hideShop();
  },
};

// ---------------- Ecrans propres a Fracas Infini ----------------
const InfiniteUI = {
  _shopEl: null,

  // Menu de la version Infini (pas de base) : 3 emplacements de partie independants.
  renderMenu() {
    const inf = infData();
    const panel = UI.el('div', 'panel inf-panel');
    panel.appendChild(UI.el('h2', null, S('infTitle')));
    panel.appendChild(UI.el('div', 'menu-sub', S('infTagline')));
    const slots = UI.el('div', 'inf-slots');
    for (let i = 0; i < INF_SLOTS; i++) {
      const run = inf.slots[i];
      const card = UI.el('div', 'inf-slot' + (run ? '' : ' empty'));
      card.appendChild(UI.el('h3', null, `${S('infSlot')} ${i + 1}`));
      if (run) {
        const c = getCharacter(run.characterId);
        const known = Save.isCharKnown(c.id);
        const sc = known ? createShowcase('character', c.id) : createMysteryShowcase(c.color);
        sc.canvas.classList.add('inf-slot-portrait');
        card.appendChild(sc.canvas);
        this._scenes.push(sc);
        const st = UI.el('div', 'inf-slot-stats');
        const line = (k, v) => { const r = UI.el('div', null); r.appendChild(UI.el('span', null, k)); r.appendChild(UI.el('b', null, v)); st.appendChild(r); };
        line(`🚪 ${S('infRoom')}`, run.atBase ? `🏠 ${S('baseTitle')}` : String(run.depth));
        line(`🗺️ ${S('hudPart')}`, String(Infinite.partOf(run.depth)));
        line(`🧍 ${S('hudPersonnage')}`, known ? charName(c.id) : S('unknownName'));
        line(`⚔️ ${S('hudDamage')}`, `${Math.round((run.mult != null ? run.mult : 1) * 100)}%`);
        line(`💰 ${S('infMoney')}`, formatMoney(run.money || 0));
        line(`⬆️ ${S('infUpgradesShort')}`, INF_UPGRADE_ORDER.map((k) => `${INF_UPGRADE_ICON[k]}${run.upgrades[k] || 0}`).join(' '));
        card.appendChild(st);
        const cont = UI.el('div', 'menu-btn menu-btn-small', `▶ ${S('infContinue')}`);
        cont.onclick = () => Game.startInfinite(i);
        card.appendChild(cont);
        const del = UI.el('div', 'menu-btn menu-btn-small inf-danger', `🗑️ ${S('infDelete')}`);
        let armed = false;
        del.onclick = () => {
          if (!armed) { armed = true; del.textContent = S('infConfirm'); del.classList.add('armed'); return; }
          infData().slots[i] = null; Save.persist();
          Game.setState(STATE.INFINITE_MENU);
        };
        card.appendChild(del);
      } else {
        card.appendChild(UI.el('div', 'inf-slot-empty', S('infEmptySlot')));
        const fresh = UI.el('div', 'menu-btn menu-btn-small', `＋ ${S('infNew')}`);
        fresh.onclick = () => { Game.pendingCharSelectMode = 'infinite'; Game.pendingInfiniteSlot = i; Game.setState(STATE.CHAR_SELECT); };
        card.appendChild(fresh);
      }
      slots.appendChild(card);
    }
    panel.appendChild(slots);
    // les regles sont dans le Codex (onglet Regles) : ici seulement les acces
    const row = UI.el('div', 'inf-menu-row');
    const btn = (label, fn) => { const b = UI.el('div', 'menu-btn menu-btn-small', label); b.onclick = fn; row.appendChild(b); };
    btn(`📅 ${S('dailyTitle')}`, () => Game.setState(STATE.DAILY));
    btn(`🌐 ${S('btnOnline')}`, () => Game.setState(STATE.ONLINE_MENU));
    btn(`📖 ${S('btnBestiary')}`, () => Game.setState(STATE.BESTIARY));
    btn(`⚙️ ${S('settingsTitle')}`, () => Game.setState(STATE.SETTINGS));
    btn(`🎓 ${S('tutoReplay')}`, () => Tutorial.start(STATE.INFINITE_MENU));
    if (NATIVE) btn(`⏻ ${S('quitGame')}`, () => { Save.persist(); NATIVE.quit(); });
    panel.appendChild(row);
    UI.overlay.appendChild(panel);
  },
  _scenes: [],
  beginMenu() { this._scenes = []; this.renderMenu(); UI.startPortraitAnim(this._scenes); },

  showShop() {
    this.hideShop();
    const panel = UI.el('div', 'panel inf-shop');
    panel.appendChild(UI.el('h2', null, S('infMerchant')));
    panel.appendChild(UI.el('div', 'menu-sub', `${S('infSlot')} ${Infinite.slot + 1} · ${S('infShopNote')}`));
    const money = UI.el('div', 'inf-money');
    panel.appendChild(money);
    const cards = UI.el('div', 'inf-cards');
    const refresh = () => {
      money.textContent = `${S('infMoney')} : ${formatMoney(infMoney())}`;
      cards.innerHTML = '';
      for (const k of INF_UPGRADE_ORDER) {
        const card = UI.el('div', 'inf-card');
        card.appendChild(UI.el('div', 'inf-card-icon', INF_UPGRADE_ICON[k]));
        card.appendChild(UI.el('h3', null, S('infUp_' + k)));
        card.appendChild(UI.el('div', 'inf-lvl', `${S('infLvl')} ${infLevel(k)}${infIsMax(k) ? ' (MAX)' : ''}`));
        const pct = Math.round(infBonus(k) * 100), step = Math.round(INF_UPGRADES[k].perLevel * 100);
        card.appendChild(UI.el('p', null, S('infEffect_' + k).replace('{step}', step).replace('{total}', pct)));
        const price = infPrice(k);
        const can = !infIsMax(k) && infMoney() >= price - 1e-9;
        const btn = UI.el('div', 'menu-btn menu-btn-small' + (can ? '' : ' disabled'), infIsMax(k) ? 'MAX' : `🛒 ${formatMoney(price)}`);
        btn.onclick = () => { if (infBuy(k)) refresh(); else Audio2.denied(); };
        card.appendChild(btn);
        cards.appendChild(card);
      }
    };
    refresh();
    panel.appendChild(cards);
    const close = UI.el('div', 'menu-btn menu-btn-small', `▶ ${S('infLeaveShop')}`);
    close.onclick = () => Infinite.closeShop();
    panel.appendChild(close);
    UI.overlay.appendChild(panel);
    this._shopEl = panel;
  },

  hideShop() { if (this._shopEl) { this._shopEl.remove(); this._shopEl = null; } },

  // Fin d'un boss : seul moment ou l'on regle la vitesse du jeu et la puissance des ennemis.
  buildBossSettings(run) {
    const box = UI.el('div', 'inf-boss-settings');
    const stepper = (icon, label, steps, get, set, def, toPct, extra) => {
      const row = UI.el('div', 'inf-step');
      row.appendChild(UI.el('span', 'inf-step-label', `${icon} ${label}`));
      const minus = UI.el('div', 'menu-btn menu-btn-small inf-step-btn', '−');
      const val = UI.el('b', 'inf-step-val', '');
      const plus = UI.el('div', 'menu-btn menu-btn-small inf-step-btn', '+');
      const ex = UI.el('em', 'inf-step-extra', '');
      const show = () => { val.textContent = `${Math.round(toPct(get()))}%`; ex.textContent = extra ? extra() : ''; };
      const move = (d) => {
        let i = steps.indexOf(get());
        if (i < 0) i = steps.indexOf(def);
        const j = clamp(i + d, 0, steps.length - 1);
        if (j === i) { Audio2.denied(); return; }
        set(steps[j]); Audio2.uiClick(); show();
      };
      minus.onclick = () => move(-1);
      plus.onclick = () => move(1);
      row.appendChild(minus); row.appendChild(val); row.appendChild(plus); row.appendChild(ex);
      show();
      return row;
    };
    box.appendChild(stepper('⏩', S('infSpeed'), INF_SPEED_STEPS, () => infSpeed(run), (v) => { run.speed = v; Save.persist(); }, 100, (v) => v));
    box.appendChild(stepper('👹', S('infPower'), INF_POWER_STEPS, () => infPower(run), (v) => { run.power = v; Save.persist(); }, 1, (v) => v * 100,
      () => { const m = Math.round((infPowerMoneyMult(run) - 1) * 100); return `💰 ${m >= 0 ? '+' : ''}${m}%`; }));
    return box;
  },
};

// ---------------- Choix de version (au lancement) ----------------
