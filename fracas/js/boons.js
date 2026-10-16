// Benedictions et maledictions : a chaque changement de partie du Monde (Monde : partie 1 -> 2 et
// 2 -> 3 ; Infini : toutes les 10 salles), le joueur choisit 1 BONUS parmi 3 et 1 MALUS parmi 3.
//   - la moitie des cartes durent la PARTIE SUIVANTE seulement (effet normal) ;
//   - l'autre moitie durent POUR TOUJOURS (jusqu'a la fin de l'expedition / de la partie Infini),
//     avec un effet TRES TRES faible (environ 1/10 de l'effet normal) ; elles se cumulent.
//   - AUCUNE rarete : chaque carte a la meme chance d'apparaitre.
// Les murs mobiles ne sont PAS un malus (ils font partie des salles normales).
// Equilibrage : effets plafonnes (voir BOON_CLAMP), et en Fracas Infini aucun bonus de soin
// n'est propose.
//
// Chaque effet est une simple valeur sur une cle de modificateur ; les fonctions de jeu lisent
// player.mod* et world.mods.

// cle -> [icone, valeur "partie suivante", valeur "pour toujours" (null = jamais), affichage, tags]
const BOON_EFFECTS = {
  // ------ bonus ------
  dmgDealt: ['⚔️', 0.25 * 1.5, 0.025, 'pct'],
  dmgTaken: ['🛡️', -0.25 * 1.5, -0.025, 'pct'],
  moveSpeed: ['👟', 0.18 * 1.5, 0.015, 'pct'],
  cdRate: ['⏱️', 0.30 * 1.5, 0.025, 'pct'],
  enemyHp: ['🩸', -0.20 * 1.5, -0.02, 'pct'],
  enemyFire: ['🐢', -0.25 * 1.5, -0.025, 'pct'],
  enemyProjSpeed: ['🐌', -0.25 * 1.5, -0.025, 'pct'],
  money: ['💰', 0.50 * 1.5, 0.05, 'pct'],
  crit: ['🎯', 0.15 * 1.5, 0.015, 'chance'],
  healOnClear: ['❤️', 8 * 1.5, 0.5, 'pts', 'heal'],
  killHeal: ['🧛', 2 * 1.5, null, 'pts', 'heal'],
  startHeal: ['💖', 30 * 1.5, null, 'pts', 'heal'],
  allAbilities: ['✨', 1, null, 'flag'],
  shieldStart: ['🔰', 2 * 1.5, null, 'sec'],
  maxPct: ['📈', 0.25 * 1.5, 0.025, 'pct'],
  // effets qui changent la facon de jouer (partie suivante seulement)
  bulletTime: ['🫧', 1, null, 'flag'],   // tirs ennemis ralentis pres de toi
  chainBlast: ['💣', 1, null, 'flag'],   // les ennemis vaincus explosent
  orbitShield: ['🪐', 1, null, 'flag'],  // 2 orbes tournent autour de toi et detruisent les tirs
  allyMeteors: ['🌠', 1, null, 'flag'],  // une meteorite tombe sur un ennemi toutes les 4 s
  extraHelpers: ['🛝', 2 * 1.5, null, 'count'], // trampolines en plus dans chaque salle
  lightStep: ['🪶', 1, null, 'flag'],    // les zones au sol ne te ralentissent plus (sauf accelerateurs)
};
const CURSE_EFFECTS = {
  dmgDealt: ['🔻', -0.20 * 1.5, -0.02, 'pct'],
  dmgTaken: ['💥', 0.25 * 1.5, 0.025, 'pct'],
  moveSpeed: ['🐾', -0.15 * 1.5, -0.015, 'pct'],
  cdRate: ['⌛', -0.25 * 1.5, -0.025, 'pct'],
  enemyHp: ['🪨', 0.30 * 1.5, 0.03, 'pct'],
  enemyFire: ['🔥', 0.30 * 1.5, 0.03, 'pct'],
  enemyProjSpeed: ['🏹', 0.30 * 1.5, 0.03, 'pct'],
  money: ['🕳️', -0.40 * 1.5, -0.04, 'pct'],
  extraEnemies: ['➕', 2 * 1.5, null, 'count'],
  bossHp: ['👑', 0.35 * 1.5, 0.035, 'pct'],
  hazardZones: ['☢️', 2 * 1.5, null, 'count'],
  iceZones: ['🧊', 2 * 1.5, null, 'count'],
  noClearHeal: ['🚫', 1, null, 'flag', 'heal'],
  fog: ['🌫️', 1, null, 'flag'],
  roomStartDamage: ['🩹', 6 * 1.5, 0.5, 'pts'],
  // effets qui changent la facon de jouer (partie suivante seulement)
  slippery: ['⛸️', 1, null, 'flag'],   // tout le sol glisse comme de la glace
  storm: ['🌪️', 1, null, 'flag'],      // un vent permanent te pousse (il tourne toutes les 6 s)
  meteorRain: ['☄️', 1, null, 'flag'], // des meteorites annoncees tombent pres de toi
  ghosts: ['👻', 1, null, 'flag'],     // les ennemis loin de toi deviennent invisibles
  shakyAim: ['🥴', 1, null, 'flag'],   // ta visee tremble
  homingShots: ['🧲', 1, null, 'flag'], // les tirs ennemis te suivent un peu
};
// Plafonds de chaque modificateur une fois tout cumule (le jeu doit rester jouable et juste).
const BOON_CLAMP = { // plafonds releves avec les valeurs x1,5
  dmgDealt: [-0.5, 1], dmgTaken: [-0.6, 1], moveSpeed: [-0.35, 0.5], cdRate: [-0.5, 1],
  enemyHp: [-0.5, 1], enemyFire: [-0.5, 1], enemyProjSpeed: [-0.5, 1], money: [-0.8, 2],
  crit: [0, 0.4], healOnClear: [0, 25], killHeal: [0, 6], shieldStart: [0, 4], maxPct: [0, 0.6],
  extraEnemies: [0, 5], bossHp: [0, 1], hazardZones: [0, 5], iceZones: [0, 5], roomStartDamage: [0, 18], extraHelpers: [0, 4],
};
const BOON_RUN_CHANCE = 0.5; // pas de rarete : autant de cartes "pour toujours" que "partie suivante"

function boonId(kind, key, dur) { return `${kind}:${key}:${dur}`; }
function boonParse(id) {
  const [kind, key, dur] = id.split(':');
  const table = kind === 'boon' ? BOON_EFFECTS : CURSE_EFFECTS;
  const e = table[key];
  if (!e) return null;
  return { id, kind, key, dur, icon: e[0], value: dur === 'run' ? e[2] : e[1], fmt: e[3], tags: e[4] || '' };
}
// Texte court de la valeur : "+25%", "-6%", "x2", "2 s"...
function boonValueText(b) {
  const v = b.value;
  const pc = +(v * 100).toFixed(1); // 2,5% reste 2,5% (effets "pour toujours" tres faibles)
  if (b.fmt === 'pct') return `${v > 0 ? '+' : ''}${pc}%`;
  if (b.fmt === 'chance') return `${pc}%`;
  if (b.fmt === 'pts') return b.key === 'roomStartDamage' ? `-${v}%` : `+${v}%`;
  if (b.fmt === 'sec') return `${v} s`;
  if (b.fmt === 'count') return `+${v}`;
  return '';
}

const Boons = {
  choosing: false,
  state: null,       // { part: [ids], run: [ids] } de la partie en cours (Monde ou Infini)
  infinite: false,
  mods: {},
  offer: null,
  sel: { boon: null, curse: null },
  onDone: null,
  _panel: null,

  // Associe l'etat des benedictions au mode en cours (null = mode sans benedictions).
  bind(state, infinite, eventMods) {
    this.state = state || null;
    this.eventMods = eventMods || null;
    this.infinite = !!infinite;
    this.recompute();
    if (!this.state && typeof Game !== 'undefined' && Game.world) Game.world.mods = null;
  },
  fresh() { return { part: [], run: [] }; },

  recompute() {
    const m = {};
    if (this.state) {
      for (const id of [...this.state.part, ...this.state.run]) {
        const b = boonParse(id);
        if (!b) continue;
        if (b.fmt === 'flag') m[b.key] = 1;
        else m[b.key] = (m[b.key] || 0) + b.value;
      }
    }
    // evenement majeur du defi du jour : s'ajoute a tout le reste pendant toute la partie
    if (this.eventMods) for (const [k, v] of Object.entries(this.eventMods)) m[k] = (m[k] || 0) + v;
    for (const k of Object.keys(m)) if (BOON_CLAMP[k]) m[k] = clamp(m[k], BOON_CLAMP[k][0], BOON_CLAMP[k][1]);
    this.mods = m;
    return m;
  },
  get(k) { return this.mods[k] || 0; },
  active() { return this.state ? [...this.state.run.map((id) => boonParse(id)), ...this.state.part.map((id) => boonParse(id))].filter(Boolean) : []; },

  // Applique au personnage (apres chaque apparition / changement de perso).
  applyPlayer(p) {
    if (!p) return;
    const g = (k) => this.get(k);
    p.modDmg = 1 + g('dmgDealt');
    p.modTaken = 1 + g('dmgTaken');
    p.modSpeed = 1 + g('moveSpeed');
    p.modCd = 1 + g('cdRate');
    p.critChance = g('crit');
    p.killHeal = g('killHeal');
    if (!this.infinite || g('maxPct')) p.dmgMax = DMG_MAX + g('maxPct');
  },

  // Applique a une salle qui vient d'etre construite (ennemis, decor, debut de salle).
  applyRoom(world) {
    world.mods = this.state ? this.mods : null;
    if (!this.state) return;
    const g = (k) => this.get(k);
    const room = world.room, b = room.bounds;
    for (const e of world.enemies) {
      const k = (1 + g('enemyHp')) * (e.kind === 'boss' ? 1 + g('bossHp') : 1);
      e.hp *= k; e.maxHp *= k;
      e.fireRateMult = (e.fireRateMult || 1) * (1 + g('enemyFire'));
      if (e.kind === 'boss') e.fireScale = (e.fireScale || 1) * (1 + g('enemyFire'));
    }
    const avoid = [{ x: world.player.x, y: world.player.y, r: 140 }, exitAvoidPoint(b)];
    for (const e of world.enemies) avoid.push({ x: e.x, y: e.y, r: 60 });
    // ennemis en plus (pris dans les types deja presents)
    const types = world.enemies.filter((e) => e.kind === 'turret').map((e) => e.type);
    for (let i = 0; i < g('extraEnemies') && types.length; i++) {
      const p = localPickPoint(b, room.obstacles, avoid, 45, 60);
      if (!p) break;
      const t = createTurret(choice(types), p.x, p.y);
      t.hp *= 1 + g('enemyHp'); t.maxHp = t.hp; t.fireRateMult = (t.fireRateMult || 1) * (1 + g('enemyFire'));
      world.enemies.push(t); avoid.push({ x: p.x, y: p.y, r: 62 });
    }
    for (const [key, type] of [['hazardZones', 'damage'], ['iceZones', 'ice']]) {
      for (let i = 0; i < g(key); i++) {
        const p = localPickPoint(b, room.obstacles, avoid, 50, 40);
        if (!p) break;
        room.terrainZones.push(makeTerrainZone(type, p.x, p.y, randRange(44, 60), b, Math.random() < 0.5));
        avoid.push({ x: p.x, y: p.y, r: 60 });
      }
    }
    // trampolines en plus (bonus "aides")
    for (let i = 0; i < g('extraHelpers'); i++) {
      for (let t = 0; t < 20; t++) {
        const p = localPickPoint(b, room.obstacles, avoid, 36, 20);
        if (!p) break;
        const ang = randRange(0, Math.PI * 2), lx = p.x + Math.cos(ang) * 210, ly = p.y + Math.sin(ang) * 210;
        if (lx < b.x + 40 || lx > b.x + b.w - 40 || ly < b.y + 40 || ly > b.y + b.h - 40) continue;
        if (room.obstacles.some((o) => circleRect(lx, ly, 26, o.x, o.y, o.w, o.h))) continue;
        if (!room.props) room.props = makeRoomProps();
        room.props.trampolines.push({ x: p.x, y: p.y, lx, ly });
        avoid.push({ x: p.x, y: p.y, r: 60 });
        break;
      }
    }
    this.fx = { storm: 0, stormAngle: Math.random() * Math.PI * 2, meteor: 2.5, ally: 2, t: 0 };
    if (g('allAbilities')) world.abilityGate = null;
    const pl = world.player;
    if (pl) {
      if (g('shieldStart')) playerSetInvincible(pl, g('shieldStart'));
      if (g('roomStartDamage')) pl.damageMultiplier = Math.max(pl.dmgMin != null ? pl.dmgMin : DMG_MIN, pl.damageMultiplier - g('roomStartDamage') / 100);
    }
    room.requiredKills = world.enemies.length;
  },

  // Soin de fin de salle (Monde) : bonus/malus.
  clearHeal(base) {
    if (this.get('noClearHeal')) return 0;
    return base + this.get('healOnClear');
  },
  moneyMult() { return Math.max(0, 1 + this.get('money')); },

  // ---------------- choix ----------------
  makeOffer() {
    const pick = (table, kind) => {
      const keys = shuffle(Object.keys(table).filter((k) => !(this.infinite && (table[k][4] || '').includes('heal'))));
      const out = [];
      for (const k of keys) {
        if (out.length >= 3) break;
        const e = table[k];
        const canRun = e[2] != null && !(this.state && this.state.run.includes(boonId(kind, k, 'run')));
        const dur = canRun && Math.random() < BOON_RUN_CHANCE ? 'run' : 'part';
        out.push(boonParse(boonId(kind, k, dur)));
      }
      return out;
    };
    return { boons: pick(BOON_EFFECTS, 'boon'), curses: pick(CURSE_EFFECTS, 'curse') };
  },

  open(onDone, extra) {
    if (!this.state) { onDone(); return; }
    this.choosing = true;
    this.onDone = onDone;
    this.extra = extra || null; // Infini : reglages de fin de boss (vitesse, puissance des ennemis)
    this.offer = this.makeOffer();
    for (const b of [...this.offer.boons, ...this.offer.curses]) Save.markBoonSeen(b.kind, b.key); // Codex
    this.sel = { boon: null, curse: null };
    Audio2.charge(0.5);
    this.render();
  },

  confirm() {
    if (!this.sel.boon || !this.sel.curse) { Audio2.denied(); return; }
    const chosen = [this.sel.boon, this.sel.curse];
    if (typeof Playtest !== 'undefined') Playtest.log('boons', { mode: this.infinite ? 'infini' : 'monde', boon: this.sel.boon.id, curse: this.sel.curse.id });
    this.state.part = chosen.filter((b) => b.dur === 'part').map((b) => b.id); // les effets de partie precedents expirent
    for (const b of chosen) if (b.dur === 'run') this.state.run.push(b.id);
    this.recompute();
    const p = Game.world && Game.world.player;
    if (p) {
      this.applyPlayer(p);
      if (this.sel.boon.key === 'startHeal') playerHeal(p, this.sel.boon.value);
    }
    Audio2.purchase();
    this.choosing = false;
    if (this._panel) { this._panel.remove(); this._panel = null; }
    const cb = this.onDone; this.onDone = null;
    if (cb) cb();
  },

  label(b) { return S(`mod_${b.key}`); },

  card(b) {
    const c = UI.el('div', `boon-card ${b.kind}${b.dur === 'run' ? ' run' : ''}`);
    c.appendChild(UI.el('div', 'boon-icon', b.icon));
    c.appendChild(UI.el('div', 'boon-value', boonValueText(b)));
    c.appendChild(UI.el('div', 'boon-label', this.label(b)));
    c.appendChild(UI.el('div', 'boon-dur', b.dur === 'run' ? `∞ ${S('boonForever')}` : `⏳ ${S('boonNextPart')}`));
    c.title = `${this.label(b)} ${boonValueText(b)}`;
    c.onclick = () => {
      this.sel[b.kind] = b;
      for (const el of c.parentElement.children) el.classList.toggle('picked', el === c);
      Audio2.uiClick();
      this._ok.classList.toggle('disabled', !(this.sel.boon && this.sel.curse));
    };
    return c;
  },

  render() {
    if (this._panel) this._panel.remove();
    const panel = UI.el('div', 'panel boon-panel');
    panel.appendChild(UI.el('h2', null, S('boonTitle')));
    const cols = UI.el('div', 'boon-cols');
    for (const kind of ['boon', 'curse']) {
      const col = UI.el('div', 'boon-col ' + kind);
      col.appendChild(UI.el('div', 'boon-col-title', kind === 'boon' ? `✚ ${S('boonPickGood')}` : `✖ ${S('boonPickBad')}`));
      const row = UI.el('div', 'boon-row');
      for (const b of this.offer[kind === 'boon' ? 'boons' : 'curses']) row.appendChild(this.card(b));
      col.appendChild(row);
      cols.appendChild(col);
    }
    panel.appendChild(cols);
    if (this.extra) panel.appendChild(this.extra());
    const ok = UI.el('div', 'menu-btn boon-ok disabled', `✔ ${S('boonConfirm')}`);
    ok.onclick = () => this.confirm();
    this._ok = ok;
    panel.appendChild(ok);
    // effets "pour toujours" deja actifs
    const act = this.state.run.map(boonParse).filter(Boolean);
    if (act.length) {
      const line = UI.el('div', 'boon-active');
      line.appendChild(UI.el('span', null, '∞'));
      for (const b of act) { const ch = UI.el('i', 'boon-chip ' + b.kind, `${b.icon} ${boonValueText(b)}`); ch.title = this.label(b); line.appendChild(ch); }
      panel.appendChild(line);
    }
    UI.overlay.appendChild(panel);
    this._panel = panel;
  },

  // Petites pastilles des effets actifs dans le HUD (vert = bonus, rouge = malus, ∞ = pour toujours).
  renderHudChips(container) {
    const list = this.active();
    const key = list.map((b) => b.id).join(',');
    if (container._key === key) return;
    container._key = key;
    container.innerHTML = '';
    for (const b of list) {
      const ch = UI.el('i', 'boon-chip ' + b.kind + (b.dur === 'run' ? ' run' : ''), `${b.icon}${b.dur === 'run' ? '∞' : ''} ${boonValueText(b)}`);
      ch.title = this.label(b);
      container.appendChild(ch);
    }
  },
};

// Malediction "brouillard" : seul un cercle autour du personnage reste bien visible.
function drawBoonFog(ctx, camera, world) {
  if (!world.mods || !world.mods.fog || !world.player) return;
  const p = world.player;
  const x = p.x - camera.x, y = p.y - camera.y;
  const z = world.zoom || 1;
  const R = 230;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, R * 0.45, x, y, R);
  g.addColorStop(0, 'rgba(8,10,16,0)'); g.addColorStop(1, 'rgba(8,10,16,0.88)');
  ctx.fillStyle = g;
  ctx.fillRect(-camera.x - 2000, -camera.y - 2000, CANVAS_W / z + 4000, CANVAS_H / z + 4000);
  ctx.restore();
}

// ---------------- effets en jeu des bonus/malus "qui changent la facon de jouer" ----------------
// Appele a chaque image en solo (Game.update), apres la simulation.
function updateBoonEffects(world, dt) {
  const m = world.mods, p = world.player;
  if (!m || !p || p.dead) return;
  const fx = Boons.fx || (Boons.fx = { storm: 0, stormAngle: 0, meteor: 2.5, ally: 2, t: 0 });
  fx.t += dt;
  // Tempete : vent permanent qui change de direction toutes les 6 s
  if (m.storm && !p.airborne) {
    fx.storm += dt;
    if (fx.storm >= 6) { fx.storm = 0; fx.stormAngle = Math.random() * Math.PI * 2; }
    const r = resolvePlayerPosition(world, p, p.x + Math.cos(fx.stormAngle) * 70 * dt, p.y + Math.sin(fx.stormAngle) * 70 * dt, p.x, p.y);
    p.x = r.x; p.y = r.y;
  }
  // Pluie de meteorites (annoncees) pres du joueur
  if (m.meteorRain) {
    fx.meteor -= dt;
    if (fx.meteor <= 0) {
      fx.meteor = 3.5;
      addHazard(world, { type: 'meteor', x: p.x + randRange(-140, 140), y: p.y + randRange(-110, 110), r: 46, tele: 1.2, dur: 0.3, dmg: 10 });
    }
  }
  // Meteorites alliees sur un ennemi
  if (m.allyMeteors) {
    fx.ally -= dt;
    const alive = world.enemies.filter((e) => !e.dead && e.kind !== 'crystal');
    if (fx.ally <= 0 && alive.length) {
      fx.ally = 4;
      const tg = choice(alive);
      world.meteors.push(makeMeteorMarker({ x: tg.x, y: tg.y, radius: 60, fallDelay: 1, dmgPercent: 30, onImpact: (mm) => {
        for (const e of enemiesInRadius(world, mm.x, mm.y, mm.radius, p)) damageEnemy(world, e, mm.dmgPercent, p);
        Particles.ring(mm.x, mm.y, mm.radius, '#9fd8ff', 0.4);
      } }));
    }
  }
  // Tirs ennemis : bulle de temps, tete chercheuse, orbes protecteurs
  const orbs = m.orbitShield ? [0, Math.PI].map((o) => ({ x: p.x + Math.cos(fx.t * 3 + o) * 46, y: p.y + Math.sin(fx.t * 3 + o) * 46 })) : null;
  for (let i = world.projectiles.length - 1; i >= 0; i--) {
    const pr = world.projectiles[i];
    if (pr.team !== TEAM.ENEMY) continue;
    if (m.homingShots) {
      const sp = Math.hypot(pr.vx, pr.vy);
      if (sp > 1) {
        const cur = Math.atan2(pr.vy, pr.vx), want = Math.atan2(p.y - pr.y, p.x - pr.x);
        let d = want - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        const na = cur + clamp(d, -0.9 * dt, 0.9 * dt);
        pr.vx = Math.cos(na) * sp; pr.vy = Math.sin(na) * sp;
      }
    }
    if (m.bulletTime) {
      const inside = dist(pr.x, pr.y, p.x, p.y) < 150;
      if (inside && !pr._bt) { pr._bt = true; pr.vx *= 0.45; pr.vy *= 0.45; }
      else if (!inside && pr._bt) { pr._bt = false; pr.vx /= 0.45; pr.vy /= 0.45; }
    }
    if (orbs && orbs.some((o) => dist(o.x, o.y, pr.x, pr.y) < 12 + (pr.radius || 6))) {
      Particles.burst(pr.x, pr.y, 6, '#c49bff', { maxSpeed: 90, life: 0.25 });
      world.projectiles.splice(i, 1);
    }
  }
}

// Bonus "explosions en chaine" : un ennemi vaincu explose et blesse ses voisins.
function boonChainBlast(world, enemy, attacker) {
  if (!world.mods || !world.mods.chainBlast || enemy._blasted) return;
  enemy._blasted = true;
  Particles.ring(enemy.x, enemy.y, 100, '#ffb347', 0.4);
  Particles.burst(enemy.x, enemy.y, 18, '#ffb347', { maxSpeed: 240, life: 0.45 });
  for (const e of enemiesInRadius(world, enemy.x, enemy.y, 100, attacker)) if (e !== enemy) damageEnemy(world, e, 20, attacker);
}

// Dessins : orbes, bulle de temps, traits de vent.
function drawBoonEffects(ctx, camera, world) {
  const m = world.mods, p = world.player;
  if (!m || !p) return;
  const fx = Boons.fx || { t: 0, stormAngle: 0 };
  const px = p.x - camera.x, py = p.y - camera.y;
  ctx.save();
  if (m.bulletTime) {
    ctx.strokeStyle = 'rgba(159,216,255,0.28)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.arc(px, py, 150, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  if (m.orbitShield) {
    for (const o of [0, Math.PI]) {
      const x = px + Math.cos(fx.t * 3 + o) * 46, y = py + Math.sin(fx.t * 3 + o) * 46;
      ctx.fillStyle = '#c49bff'; ctx.shadowColor = '#c49bff'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
  if (m.storm) {
    const a = fx.stormAngle, z = world.zoom || 1, W = CANVAS_W / z, H = CANVAS_H / z;
    ctx.strokeStyle = 'rgba(220,235,255,0.18)'; ctx.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      const k = ((fx.t * 0.6 + i * 0.137) % 1);
      const sx = ((i * 97) % W) + Math.cos(a) * k * 300 - 150 * Math.cos(a), sy = ((i * 53) % H) + Math.sin(a) * k * 300 - 150 * Math.sin(a);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * 40, sy + Math.sin(a) * 40); ctx.stroke();
    }
  }
  ctx.restore();
}
