'use strict';
/* Colosses — moteur du combat : arène, joueur, collisions, dessin, interface en jeu, enchaînement des salles. */

const W = 1280, H = 800;
const AR = { x: 30, y: 78, w: 1220, h: 646 };
const CX = AR.x + AR.w / 2, CY = AR.y + AR.h / 2;

// ---------- Arène ----------
const Arene = {
  kind: 'rect', carte: 'normale', inset: 0, insetMax: 0, piliers: [], lave: [], glace: false, noir: false, vent: null,
  rad() { return AR.h / 2 - this.inset * .6; },
  bb() {
    if (this.kind === 'cercle') { const r = this.rad(); return { x: CX - r, y: CY - r, w: 2 * r, h: 2 * r }; }
    const i = this.inset; return { x: AR.x + i, y: AR.y + i * .6, w: AR.w - 2 * i, h: AR.h - 1.2 * i };
  },
  dedans(x, y, r) {
    if (this.kind === 'cercle') return Math.sqrt(d2(x, y, CX, CY)) + r <= this.rad();
    const b = this.bb(); return x - r >= b.x && x + r <= b.x + b.w && y - r >= b.y && y + r <= b.y + b.h;
  },
  contenir(o, r) {
    if (this.kind === 'cercle') {
      const dd = Math.sqrt(d2(o.x, o.y, CX, CY)), m = this.rad() - r;
      if (dd > m) { const a = ang(CX, CY, o.x, o.y); o.x = CX + Math.cos(a) * m; o.y = CY + Math.sin(a) * m; }
    } else { const b = this.bb(); o.x = clamp(o.x, b.x + r, b.x + b.w - r); o.y = clamp(o.y, b.y + r, b.y + b.h - r); }
  },
  sortirPiliers(o, r) {
    for (const p of this.piliers) {
      const dd = Math.sqrt(d2(o.x, o.y, p.x, p.y)), m = p.r + r;
      if (dd < m) { const a = dd > .01 ? ang(p.x, p.y, o.x, o.y) : R() * TAU; o.x = p.x + Math.cos(a) * m; o.y = p.y + Math.sin(a) * m; }
    }
  },
  pilierTouche(x, y, r) { for (const p of this.piliers) if (d2(x, y, p.x, p.y) < (p.r + r) ** 2) return p; return null; },
  clampPt(x, y, m) { const o = { x, y }; this.contenir(o, m); this.sortirPiliers(o, m); this.contenir(o, m); return o; },
  pointAuHasard(m, loin) {
    const b = this.bb(); let pt = null;
    for (let k = 0; k < 25; k++) {
      pt = { x: b.x + m + R() * (b.w - 2 * m), y: b.y + m + R() * (b.h - 2 * m) };
      if (!this.dedans(pt.x, pt.y, m) || this.pilierTouche(pt.x, pt.y, m)) continue;
      if (loin && G.p && d2(pt.x, pt.y, G.p.x, G.p.y) < loin * loin) continue;
      return pt;
    }
    return this.clampPt(pt.x, pt.y, m);
  },
  rayMur(x, y, a, max) {
    const ca = Math.cos(a), sa = Math.sin(a);
    let t = max;
    if (this.kind === 'cercle') {
      const ox = x - CX, oy = y - CY, rr = this.rad(), b = ox * ca + oy * sa, c = ox * ox + oy * oy - rr * rr, disc = b * b - c;
      if (disc >= 0) { const t2 = -b + Math.sqrt(disc); if (t2 > 0) t = Math.min(t, t2); }
    } else {
      const bb = this.bb();
      if (ca > 1e-6) t = Math.min(t, (bb.x + bb.w - x) / ca); else if (ca < -1e-6) t = Math.min(t, (bb.x - x) / ca);
      if (sa > 1e-6) t = Math.min(t, (bb.y + bb.h - y) / sa); else if (sa < -1e-6) t = Math.min(t, (bb.y - y) / sa);
    }
    for (const p of this.piliers) t = Math.min(t, rayCircle(x, y, ca, sa, p.x, p.y, p.r));
    return Math.max(0, t);
  },
  appliquer(carte) {
    this.carte = carte; this.kind = carte === 'cercle' ? 'cercle' : 'rect';
    this.piliers = []; this.lave = []; this.glace = carte === 'glace'; this.noir = carte === 'tenebres';
    this.vent = carte === 'vent' ? { a: R() * TAU, f: 105, t: 5 } : null;
    this.insetMax = carte === 'etau' ? 150 : 0;
    const libre = (x, y, m) => (!G.p || d2(x, y, G.p.x, G.p.y) > (m + 60) ** 2) && (!G.boss || d2(x, y, G.boss.x, G.boss.y) > (m + G.boss.r + 30) ** 2);
    if (carte === 'piliers') {
      const lay = R.pick([[[-.28, -.25], [.28, -.25], [-.28, .25], [.28, .25]], [[0, -.28], [-.3, .12], [.3, .12], [0, .32]], [[-.36, 0], [-.12, -.25], [.12, .25], [.36, 0], [0, 0]], [[-.33, -.22], [.33, -.22], [-.33, .22], [.33, .22], [0, 0]]]);
      for (const [fx, fy] of lay) { const r = R.range(32, 44), x = CX + fx * AR.w, y = CY + fy * AR.h * 1.5; if (libre(x, y, r)) this.piliers.push({ x, y, r }); }
    }
    if (carte === 'lave') {
      for (let k = 0, n = R.int(3, 4); k < 40 && this.lave.length < n; k++) {
        const r = R.range(55, 85), pt = this.pointAuHasard(r + 10);
        if (libre(pt.x, pt.y, r) && !this.lave.some(l => d2(l.x, l.y, pt.x, pt.y) < (l.r + r + 40) ** 2)) this.lave.push({ x: pt.x, y: pt.y, r });
      }
    }
    if (G.p) { this.sortirPiliers(G.p, G.p.r); this.contenir(G.p, G.p.r); }
  },
  maj(dt) {
    if (this.insetMax > this.inset) this.inset = Math.min(this.insetMax, this.inset + 9 * dt);
    else if (this.inset > this.insetMax) this.inset = Math.max(this.insetMax, this.inset - 40 * dt);
    if (this.vent) {
      this.vent.t -= dt;
      if (this.vent.t <= 0) { this.vent.a += R.range(1, 2.5) * R.sign(); this.vent.t = 4 + R() * 3; G.annonce('Le vent tourne', '#bde', .9); }
      if (R() < dt * 30) { const b = this.bb(); G.parts.push({ x: b.x + R() * b.w, y: b.y + R() * b.h, vx: Math.cos(this.vent.a) * 400, vy: Math.sin(this.vent.a) * 400, life: .5, max: .5, col: 'rgba(200,230,255,.35)', r: 1.5, trait: true }); }
    }
  }
};

// ---------- État du jeu ----------
const G = {
  etat: 'menu', t: 0, dtE: 0, salle: 1, mega: false, def: null, ars: null, arene: Arene,
  p: null, boss: null, minions: [], pb: [], eb: [], hz: [], fx: [], allies: [], parts: [], textes: [],
  leurre: null, ralenti: 0, aspiration: null, dmgE: 20, shake: 0, slowT: 0, slowF: 1, mx: CX, my: CY,
  opts: Save.d.opts, banner: null, chrono: 0, debut: 0, finT: 0, protegeT: 0, degatsSalle: 0, coupsPris: 0,

  cibles() {
    const out = [];
    const b = this.boss;
    if (b && !b.mort && !b.air && b.spectral <= 0 && b.alpha > .3) out.push(b);
    for (const m of this.minions) if (!m.dead && m.spawn <= 0) out.push(m);
    return out;
  },
  // rayon du joueur : s'arrête au mur, à un pilier ou sur la première cible
  lancerRayon(x, y, a, max, w) {
    let d = Arene.rayMur(x, y, a, max), best = null;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (const tg of this.cibles()) { const t = rayCircle(x, y, ca, sa, tg.x, tg.y, tg.r + w / 2); if (t < d) { d = t; best = tg; } }
    return { x: x + ca * d, y: y + sa * d, d, cible: best };
  },
  annonce(txt, col, dur) { this.banner = { txt, col: col || '#fff', t: 0, dur: dur || 1.6 }; },
  texte(x, y, txt, col, size) { if (this.textes.length < 80) this.textes.push({ x: x + R.range(-8, 8), y, txt, col, t: 0, dur: .8, size: size || 15 }); },
  secoue(n) { if (this.opts.tremble) this.shake = Math.max(this.shake, n); },
  ralentir(f, t) { this.slowF = f; this.slowT = t; },
  etincelle(x, y, col, n) { for (let i = 0; i < n; i++) { const a = R() * TAU, s = R.range(60, 220); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .35, max: .35, col, r: R.range(1.5, 3) }); } },
  explo(x, y, r, col) {
    this.fx.push({ kind: 'anneau', x, y, r0: r * .3, r1: r, t: 0, dur: .25, col });
    const n = Math.min(24, 6 + r / 6 | 0);
    for (let i = 0; i < n; i++) { const a = R() * TAU, s = R.range(.3, 1) * r * 3; this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .45, max: .45, col, r: R.range(2, 4) }); }
  },
  recul(p, f) { p.vx -= Math.cos(p.aim) * f; p.vy -= Math.sin(p.aim) * f; },
  traine(p) { for (let i = 0; i < 4; i++) this.fx.push({ kind: 'fantome', x: p.x, y: p.y, t: -i * .03, dur: .25 }); },
  dirMouv(p) {
    let x = 0, y = 0;
    if (Input.down('KeyW') || Input.down('ArrowUp')) y--;
    if (Input.down('KeyS') || Input.down('ArrowDown')) y++;
    if (Input.down('KeyA') || Input.down('ArrowLeft')) x--;
    if (Input.down('KeyD') || Input.down('ArrowRight')) x++;
    const l = Math.hypot(x, y);
    if (!l) return { x: Math.cos(p.aim), y: Math.sin(p.aim) };
    return { x: x / l, y: y / l };
  },
  etourdir(b, t, txt) {
    b.stun = Math.max(b.stun, t); b.main = null; b.ctl = false; b.charge = false; b.alpha = 1; b.wind = 0;
    if (b.air) { b.air = false; b.haut = 0; }
    this.texte(b.x, b.y - b.r - 20, txt || 'Étourdi !', '#ffe14d', 18);
  },
  invoquer(type, x, y) {
    const d = INVOC[type], k = 1 + .08 * (this.salle - 1);
    this.minions.push({ type, x, y, r: d.r, hp: d.hp * k, hpMax: d.hp * k, vit: d.vit, spawn: .8, flash: 0, cd: 1 + R(), a: R() * TAU, salve: 0, st: 0 });
    Save.d.codex.invoc[type] = 1;
  },

  // ---------- Dégâts infligés ----------
  frappe(tg, dmg, o) {
    if (tg.dead || tg.spawn > 0 || this.etat !== 'combat') return;
    let m = 1, crit = false;
    if (o.prim && !o.continu && R() < ST.pCrit + (o.critB || 0)) { m *= 2; crit = true; }
    const b = this.boss;
    if (tg === b) {
      if (b.trans > 0 || b.air || b.mort) return;
      const tr = b.def.traits;
      if (tr.includes('cristaux') && this.minions.some(x => x.type === 'cristal' && x.spawn <= 0)) {
        if (this.protegeT <= 0) { this.texte(b.x, b.y - b.r - 14, 'Protégé par les cristaux', '#7fd8ff', 14); this.protegeT = .8; }
        return;
      }
      if (b.miroir > 0 && o.prim) { if (this.protegeT <= 0) { this.texte(b.x, b.y - b.r - 14, 'Reflété !', '#fff', 15); this.protegeT = .5; } return; }
      if (tr.includes('dos')) {
        const dif = Math.abs(angDiff(b.facing + Math.PI, ang(b.x, b.y, o.x, o.y)));
        m *= dif < 1.05 ? 2.5 : dif > 2.1 ? .4 : 1;
      }
      if (tr.includes('souffle')) m *= bossVulnerableSouffle(b) ? 2.2 : .5;
      if (b.stun > 0) m *= 1.3;
      let d = dmg * m;
      if (b.armure > 0) {
        b.armure -= d * (o.spec ? 3 : 1);
        d *= .25;
        if (b.armure <= 0) { b.armure = 0; b.armureCd = 12; this.annonce('Carapace brisée !', '#fff', 1.3); Son.play('gros'); this.secoue(8); }
      }
      b.hp -= d; b.flash = o.continu ? .35 : 1; b.regenT = 0;
      this.degatsSalle += d;
      if (o.prim) this.p.energie = Math.min(ST.eMax, this.p.energie + d * .1 * ST.eGain);
      if (!o.continu) Son.play('touche');
      this.chiffre(tg, d, crit, o, m);
      const n = b.def.phases.length;
      if (b.phase < n - 1 && b.hp <= seuilPhase(b, b.phase)) { b.hp = seuilPhase(b, b.phase); passerPhase(b); }
      else if (b.hp <= 0) this.bossMort();
    } else {
      const d = dmg * m;
      tg.hp -= d; tg.flash = 1;
      this.chiffre(tg, d, crit, o, 1);
      if (tg.hp <= 0) {
        tg.dead = true; this.explo(tg.x, tg.y, 40, tg.type === 'cristal' ? '#7fd8ff' : this.boss.col); Son.play('explo');
        this.p.energie = Math.min(ST.eMax, this.p.energie + 8 * ST.eGain);
        if (tg.type === 'cristal' && !this.minions.some(x => x !== tg && !x.dead && x.type === 'cristal')) { this.annonce('Bouclier brisé !', '#7fd8ff', 1.3); this.boss.cristT = 18; }
      }
    }
  },
  chiffre(tg, d, crit, o, m) {
    if (!this.opts.chiffres) return;
    if (o.continu) { tg.acc = (tg.acc || 0) + d; tg.accT = (tg.accT || 0) + this.dtE; if (tg.accT < .25) return; d = tg.acc; tg.acc = 0; tg.accT = 0; }
    const col = crit ? '#ffe14d' : m >= 2 ? '#ffb347' : m < .9 ? '#888' : o.spec ? '#9cf' : '#eee';
    this.texte(o.x || tg.x, (o.y || tg.y) - 10, Math.round(d) + (crit ? '!' : ''), col, crit ? 18 : o.spec ? 17 : 13);
  },

  // ---------- Dégâts subis ----------
  blesser(dmg, src) {
    const p = this.p;
    if (this.etat !== 'combat' || !p || p.hp <= 0) return false;
    if (p.fantome > 0 || p.iframe > 0) return false;
    if (p.parade > 0) {
      p.parade = 0; p.iframe = .8; this.ralentir(.3, .3);
      const r = 210;
      for (const tg of this.cibles()) if (Math.sqrt(d2(p.x, p.y, tg.x, tg.y)) - tg.r < r) this.frappe(tg, 260 * ST.pDmg, { x: tg.x, y: tg.y });
      for (const e of this.eb) if (d2(p.x, p.y, e.x, e.y) < r * r) e.dead = true;
      p.energie = Math.min(ST.eMax, p.energie + 25 * ST.eGain);
      p.tal.charges = ST.tCharges; p.tal.cd = 0;
      this.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 20, r1: r, t: 0, dur: .3, col: '#ffe9a0' });
      this.texte(p.x, p.y - 26, 'PARADE !', '#ffe9a0', 20); Son.play('parade'); this.secoue(6);
      Save.d.stats.parades = (Save.d.stats.parades || 0) + 1;
      return false;
    }
    if (p.bouclier > 0) {
      p.bouclier = 0; p.iframe = .6;
      this.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 18, r1: 60, t: 0, dur: .3, col: '#8cf' });
      Son.play('parade'); return false;
    }
    p.hp -= dmg; p.iframe = .75; p.rouge = .35; this.coupsPris++;
    this.secoue(10); Son.play('blesse');
    this.texte(p.x, p.y - 24, '-' + Math.round(dmg), '#ff5a6e', 18);
    if (p.hp <= 0) { p.hp = 0; this.tueur = src; this.mortJoueur(); }
    return true;
  },

  // ---------- Enchaînement ----------
  preparerSalle() {
    const run = Save.d.run;
    this.salle = run.salle;
    this.mega = this.salle % 5 === 0;
    const seed = this.mega ? hashNum(this.salle * 7919 + 13) : R.int(1, 2147483646);
    this.def = genBoss(this.salle, seed, this.mega);
    const prev = this.ars || {};
    const tire = (liste, avant) => { const l = liste.filter(a => a.id !== avant); return R.pick(l).id; };
    this.ars = { p: tire(PRIM, prev.p), s: tire(SPEC, prev.s), t: tire(TAL, prev.t) };
    this.etat = 'arsenal';
    UI.arsenal();
  },
  commencer() {
    calcStats();
    this.minions = []; this.pb = []; this.eb = []; this.hz = []; this.fx = []; this.allies = []; this.parts = []; this.textes = [];
    this.leurre = null; this.tueur = null; this.ralenti = 0; this.aspiration = null; this.slowT = 0; this.banner = null; this.boss = null; this.p = null;
    Arene.inset = 0;
    Arene.appliquer(this.def.phases[0].carte);
    this.p = creerJoueur(Save.d.run.pv);
    this.boss = creerBoss(this.def);
    if (this.def.traits.includes('cristaux')) poserCristaux(this.boss);
    this.dmgE = clamp(20 + .45 * this.salle, 20, 34) * (this.mega ? 1.1 : 1);
    this.etat = 'combat'; this.debut = 1.3; this.chrono = 0; this.degatsSalle = 0; this.coupsPris = 0;
    const cx = Save.d.codex;
    cx.arm['p:' + this.ars.p] = 1; cx.arm['s:' + this.ars.s] = 1; cx.arm['t:' + this.ars.t] = 1;
    cx.cartes[this.def.phases[0].carte] = 1;
    for (const t of this.def.traits) cx.traits[t] = 1;
    Save.d.record = Math.max(Save.d.record, this.salle);
    Save.write();
    this.annonce((this.mega ? '★ MÉGA BOSS ★  ' : '') + this.def.nom, this.def.col, 1.8);
    Input.clear();
  },
  bossMort() {
    const b = this.boss;
    if (b.mort) return;
    b.mort = true; b.hp = 0; b.main = null; b.fond = null;
    for (const e of this.eb) this.etincelle(e.x, e.y, b.col, 1);
    this.eb.length = 0; this.hz.length = 0; this.aspiration = null;
    for (const m of this.minions) { m.dead = true; this.explo(m.x, m.y, 30, b.col); }
    for (let i = 0; i < 6; i++) setTimeout(() => this.explo(b.x + R.range(-40, 40), b.y + R.range(-40, 40), 120, i % 2 ? '#fff' : b.col), i * 160);
    this.ralentir(.25, 1.2); this.secoue(20); Son.play('gros'); Son.play(this.def.mega ? 'mega' : 'victoire');
    this.etat = 'victoire'; this.finT = 2.3;
    this.annonce(this.def.mega ? 'MÉGA BOSS VAINCU !' : 'VAINCU !', '#ffe14d', 2.5);
  },
  finVictoire() {
    const d = Save.d, run = d.run, p = this.p;
    d.stats.boss++; d.stats.salles++; d.stats.temps += this.chrono;
    d.chasse.unshift({ nom: this.def.nom, titre: this.def.titre, salle: this.salle, mega: this.def.mega, temps: Math.round(this.chrono), hue: this.def.hue, phases: this.def.phases.length });
    d.chasse = d.chasse.slice(0, 60);
    const res = { temps: this.chrono, coups: this.coupsPris, soin: 0 };
    if (this.def.mega) {
      d.stats.mega++;
      d.palier = Math.max(d.palier, this.salle / 5);
      const k = String(this.salle), old = d.megaTemps[k];
      res.record = !old || this.chrono < old;
      if (res.record) d.megaTemps[k] = Math.round(this.chrono);
      run.salle = this.salle + 1; run.pv = 100;
      d.record = Math.max(d.record, run.salle);
      Save.write();
      UI.choix(res);
    } else {
      const soin = Math.round(Math.min(100 - p.hp, 30));
      res.soin = soin;
      run.salle = this.salle + 1; run.pv = Math.round(p.hp + soin);
      d.record = Math.max(d.record, run.salle);
      Save.write();
      UI.victoire(res);
    }
  },
  mortJoueur() {
    const d = Save.d;
    this.etat = 'mort'; this.finT = 1.9; this.ralentir(.3, 1.4); Son.play('mort'); this.secoue(16);
    d.stats.morts++; d.stats.temps += this.chrono;
    this.resMort = { salle: this.salle, def: this.def, pct: this.boss ? 1 - Math.max(0, this.boss.hp) / this.boss.hpMax : 0, phase: this.boss ? this.boss.phase + 1 : 1, temps: this.chrono };
    d.run = { salle: d.palier * 5 + 1, pv: 100 };
    Save.write();
  },
  abandonner() { this.p.iframe = 0; this.p.fantome = 0; this.p.parade = 0; this.p.bouclier = 0; this.etat = 'combat'; this.blesser(9999); }
};

function creerJoueur(pv) {
  return {
    x: CX, y: AR.y + AR.h * .82, vx: 0, vy: 0, r: 13, hr: 6, hp: pv || 100, hpMax: 100, iframe: 0, aim: -Math.PI / 2,
    energie: ST.eMax * .5, prim: { cd: 0 }, spec: { cd: 0 }, tal: { charges: ST.tCharges, cd: 0 }, dash: null, lent: 1,
    miroir: 0, parade: 0, bouclier: 0, fantome: 0, vite: 0, rouge: 0
  };
}

// ---------- Mise à jour ----------
function majJoueur(dt) {
  const p = G.p;
  const prim = trouveArme('p', G.ars.p), spec = trouveArme('s', G.ars.s), tal = trouveArme('t', G.ars.t);
  p.aim = ang(p.x, p.y, G.mx, G.my);
  for (const k of ['iframe', 'miroir', 'parade', 'bouclier', 'fantome', 'vite', 'rouge']) if (p[k] > 0) p[k] -= dt;
  p.energie = Math.min(ST.eMax, p.energie + 4 * ST.eGain * dt);
  p.lent = 1;
  // arme principale
  const held = (Input.lmb || G.opts.auto) && p.fantome <= 0;
  prim.tick(p.prim, p, dt, held);
  // attaque spéciale
  if (p.spec.cd > 0) p.spec.cd -= dt;
  if (Input.rp || Input.hit('KeyE')) {
    const cout = spec.cout * ST.sCout;
    if (p.fantome > 0) { }
    else if (p.spec.cd > 0) { Son.play('vide'); G.texte(p.x, p.y - 28, 'Recharge…', '#888', 13); }
    else if (p.energie < cout) { Son.play('vide'); G.texte(p.x, p.y - 28, 'Pas assez d\'énergie', '#9cf', 13); }
    else { p.energie -= cout; p.spec.cd = spec.rech * ST.sRech; spec.use(p); Son.play('special'); }
  }
  // talent
  const T = p.tal, maxC = ST.tCharges;
  if (T.charges < maxC) { T.cd -= dt; if (T.cd <= 0) { T.charges++; T.cd = T.charges < maxC ? tal.rech * ST.tRech : 0; } }
  if (Input.hit('Space') || Input.hit('ShiftLeft') || Input.hit('ShiftRight')) {
    if (T.charges > 0 && !p.dash) { if (T.charges === maxC) T.cd = tal.rech * ST.tRech; T.charges--; tal.use(p); }
    else Son.play('vide');
  }
  // déplacement
  let sp = 270 * p.lent * (p.fantome > 0 ? 1.35 : 1) * (p.vite > 0 ? 1.3 : 1);
  if (p.dash) {
    const d = p.dash; d.t += dt;
    p.x += d.vx * dt; p.y += d.vy * dt;
    if (d.roule && R() < .5) G.fx.push({ kind: 'fantome', x: p.x, y: p.y, t: 0, dur: .15 });
    if (d.t >= d.dur) { if (d.grappin) { p.x = d.grappin.x; p.y = d.grappin.y; } p.dash = null; p.vx = d.vx * .15; p.vy = d.vy * .15; }
  } else {
    let mx = 0, my = 0;
    if (Input.down('KeyW') || Input.down('ArrowUp')) my--;
    if (Input.down('KeyS') || Input.down('ArrowDown')) my++;
    if (Input.down('KeyA') || Input.down('ArrowLeft')) mx--;
    if (Input.down('KeyD') || Input.down('ArrowRight')) mx++;
    const l = Math.hypot(mx, my) || 1;
    const tvx = mx / l * sp, tvy = my / l * sp, k = Arene.glace ? 2.2 : 16;
    p.vx += (tvx - p.vx) * Math.min(1, k * dt); p.vy += (tvy - p.vy) * Math.min(1, k * dt);
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  if (G.aspiration) { const a = G.aspiration, aa = ang(p.x, p.y, a.x, a.y); p.x += Math.cos(aa) * a.f * dt; p.y += Math.sin(aa) * a.f * dt; }
  if (Arene.vent) { p.x += Math.cos(Arene.vent.a) * Arene.vent.f * dt; p.y += Math.sin(Arene.vent.a) * Arene.vent.f * dt; }
  Arene.contenir(p, p.r); Arene.sortirPiliers(p, p.r); Arene.contenir(p, p.r);
  for (const l of Arene.lave) if (d2(p.x, p.y, l.x, l.y) < (l.r - 4) ** 2) G.blesser(DMG(.6), 'lave');
  for (const h of G.hz) if (h.kind === 'flaque' && HZ.flaque.hit(h, p)) G.blesser(h.dmg, h.src);
}

function majTirsJoueur(dt) {
  const cibles = G.cibles();
  for (const b of G.pb) {
    if (b.dead) continue;
    if (b.delai > 0) { b.delai -= dt; b.x = G.p.x; b.y = G.p.y; continue; }
    b.t += dt;
    if (b.up) b.up(b, dt);
    if (b.hom && cibles.length) {
      let best = null, bd = Infinity;
      for (const tg of cibles) { const q = d2(b.x, b.y, tg.x, tg.y); if (q < bd) { bd = q; best = tg; } }
      const want = ang(b.x, b.y, best.x, best.y), cur = Math.atan2(b.vy, b.vx), s = Math.hypot(b.vx, b.vy);
      const na = cur + clamp(angDiff(cur, want), -b.hom * dt, b.hom * dt), ns = b.kind === 'missile' ? Math.min(900, s + 900 * dt) : s;
      b.vx = Math.cos(na) * ns; b.vy = Math.sin(na) * ns;
    }
    if (b.grow) b.r += b.grow * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }
    if (!Arene.dedans(b.x, b.y, 0) || Arene.pilierTouche(b.x, b.y, 2)) {
      if (b.kind === 'boom' && !b.retour) { b.retour = true; b.hits.clear(); }
      else if (b.kind !== 'boom') { b.dead = true; G.etincelle(b.x, b.y, b.col, 2); continue; }
    }
    for (const tg of cibles) {
      if (b.hits.has(tg) || tg.dead) continue;
      if (d2(b.x, b.y, tg.x, tg.y) < (b.r + tg.r) ** 2) {
        const bo = G.boss;
        if (tg === bo && bo.miroir > 0 && !b.spec) {
          b.dead = true;
          EB(b.x, b.y, ang(b.x, b.y, G.p.x, G.p.y), 380, { dmg: DMG(.6), r: 5, col: '#ffffff' });
          break;
        }
        G.frappe(tg, b.dmg, { prim: !b.spec, spec: b.spec, x: b.x, y: b.y, critB: b.crit });
        b.hits.add(tg);
        if (b.stun && tg === bo && !bo.mort) G.etourdir(bo, b.stun, 'Paralysé !');
        if (b.kind !== 'flamme') G.etincelle(b.x, b.y, b.col, 2);
        if (b.pierce > 0) b.pierce--; else { b.dead = true; break; }
      }
    }
    if (b.dead) continue;
    for (const e of G.eb) {
      if (e.hp > 0 && !e.dead && d2(b.x, b.y, e.x, e.y) < (b.r + e.r) ** 2) {
        e.hp -= b.dmg; G.etincelle(e.x, e.y, e.col, 2);
        if (e.hp <= 0) { e.dead = true; G.etincelle(e.x, e.y, '#fff', 6); }
        if (b.cassable) { b.dead = true; break; }
      }
    }
  }
}

function majTirsEnnemis(dt) {
  const p = G.p, t = cible();
  for (const e of G.eb) {
    if (e.dead) continue;
    if (e.delai > 0) { e.delai -= dt; }
    else {
      e.t += dt;
      if (e.hom && e.t < 4.5) {
        const cur = Math.atan2(e.vy, e.vx), s = Math.hypot(e.vx, e.vy), na = cur + clamp(angDiff(cur, ang(e.x, e.y, t.x, t.y)), -e.hom * dt, e.hom * dt);
        e.vx = Math.cos(na) * s; e.vy = Math.sin(na) * s;
      }
      if (e.angv) { const c = Math.cos(e.angv * dt), s = Math.sin(e.angv * dt), vx = e.vx; e.vx = vx * c - e.vy * s; e.vy = vx * s + e.vy * c; }
      if (e.acc) { const s = Math.hypot(e.vx, e.vy), ns = Math.max(e.vmin, s + e.acc * dt); if (s > 0) { e.vx *= ns / s; e.vy *= ns / s; } }
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.life -= dt;
      if (e.life <= 0) { e.dead = true; continue; }
      if (e.split && e.t >= e.split.t) { e.dead = true; anneauTirs(e.x, e.y, e.split.n, R() * TAU, e.split.spd, { r: 6, col: e.col }); G.etincelle(e.x, e.y, e.col, 8); Son.play('explo'); continue; }
      const inside = Arene.dedans(e.x, e.y, e.r * .5);
      if (!e.dedans) { if (inside) e.dedans = true; else if (e.t > 6) e.dead = true; }
      else if (!inside) {
        if (e.bounce > 0) {
          e.bounce--;
          if (Arene.kind === 'cercle') {
            const a = ang(CX, CY, e.x, e.y), nx = Math.cos(a), ny = Math.sin(a), dot = e.vx * nx + e.vy * ny;
            e.vx -= 2 * dot * nx; e.vy -= 2 * dot * ny;
          } else {
            const bb = Arene.bb();
            if (e.x < bb.x || e.x > bb.x + bb.w) e.vx = -e.vx;
            if (e.y < bb.y || e.y > bb.y + bb.h) e.vy = -e.vy;
          }
          Arene.contenir(e, e.r * .5);
        } else { e.dead = true; continue; }
      }
      if (e.dedans && Arene.piliers.length && Arene.pilierTouche(e.x, e.y, e.r * .6)) { e.dead = true; G.etincelle(e.x, e.y, e.col, 2); continue; }
    }
    // contact avec le joueur
    if (p.hp > 0 && d2(e.x, e.y, p.x, p.y) < (e.r * .85 + p.hr) ** 2) {
      if (p.miroir > 0 && G.boss && !G.boss.mort) {
        e.dead = true;
        pShot(e.x, e.y, ang(e.x, e.y, G.boss.x, G.boss.y), 700, { dmg: 30, r: 5, life: 2, spec: true, col: '#fff', noVel: true });
        continue;
      }
      if (p.iframe <= 0 && p.fantome <= 0) { G.blesser(e.dmg, e.src); e.dead = true; }
    }
  }
}

function majAllies(dt) {
  const p = G.p;
  for (const a of G.allies) {
    a.t += dt;
    if (a.t < 0) continue;
    switch (a.kind) {
      case 'grenade':
        if (a.t >= a.dur) {
          a.dead = true; G.explo(a.tx, a.ty, a.r, '#8cf'); Son.play('explo');
          for (const tg of G.cibles()) if (Math.sqrt(d2(a.tx, a.ty, tg.x, tg.y)) - tg.r < a.r) G.frappe(tg, a.dmg, { prim: true, x: tg.x, y: tg.y });
        }
        break;
      case 'meteore':
        if (a.t >= a.dur) {
          a.dead = true; G.explo(a.x, a.y, a.r, a.petit ? '#9cf' : '#ffd27f'); Son.play(a.petit ? 'explo' : 'gros'); G.secoue(a.petit ? 2 : 9);
          for (const tg of G.cibles()) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < a.r) G.frappe(tg, a.dmg, { spec: true, x: tg.x, y: tg.y });
        }
        break;
      case 'tourelle': {
        a.cd -= dt;
        const cs = G.cibles();
        if (cs.length) {
          let best = cs[0], bd = Infinity; for (const tg of cs) { const q = d2(a.x, a.y, tg.x, tg.y); if (q < bd) { bd = q; best = tg; } }
          a.a = ang(a.x, a.y, best.x, best.y);
          if (a.cd <= 0) { a.cd = .2; pShot(a.x + Math.cos(a.a) * 14, a.y + Math.sin(a.a) * 14, a.a, 820, { dmg: 14, r: 4, life: 1.2, spec: true, col: '#9cf', noVel: true }); }
        }
        if (a.t >= a.dur) a.dead = true;
        break;
      }
      case 'devast': {
        p.lent = Math.min(p.lent, .5);
        a.a += clamp(angDiff(a.a, p.aim), -2.5 * dt, 2.5 * dt);
        const L = Arene.rayMur(p.x, p.y, a.a, 1500), ex = p.x + Math.cos(a.a) * L, ey = p.y + Math.sin(a.a) * L;
        a.x1 = p.x; a.y1 = p.y; a.x2 = ex; a.y2 = ey;
        for (const tg of G.cibles()) if (segD2(tg.x, tg.y, p.x, p.y, ex, ey) < (a.w / 2 + tg.r) ** 2) G.frappe(tg, a.dps * dt, { spec: true, continu: true, x: tg.x, y: tg.y });
        for (const e of G.eb) if (segD2(e.x, e.y, p.x, p.y, ex, ey) < (a.w / 2 + e.r) ** 2) e.dead = true;
        G.secoue(2);
        if (a.t >= a.dur) a.dead = true;
        break;
      }
      case 'lames': {
        a.a += 5.5 * dt;
        for (let i = 0; i < a.n; i++) {
          const aa = a.a + i * TAU / a.n, bx = p.x + Math.cos(aa) * a.rad, by = p.y + Math.sin(aa) * a.rad;
          for (const tg of G.cibles()) {
            if (d2(bx, by, tg.x, tg.y) < (16 + tg.r) ** 2) {
              const k = tg === G.boss ? 'b' + i : tg;
              if (!a.hitcd.get(k) || a.hitcd.get(k) < G.t) { a.hitcd.set(k, G.t + .15); G.frappe(tg, 24 * ST.sDmg, { spec: true, x: bx, y: by }); }
            }
          }
          for (const e of G.eb) if (d2(bx, by, e.x, e.y) < (18 + e.r) ** 2) { e.dead = true; G.etincelle(e.x, e.y, '#bdf', 2); }
        }
        if (a.t >= a.dur) a.dead = true;
        break;
      }
      case 'trou': {
        for (const e of G.eb) {
          const q = d2(a.x, a.y, e.x, e.y);
          if (q < a.r * a.r) { const aa = ang(e.x, e.y, a.x, a.y); e.x += Math.cos(aa) * 260 * dt; e.y += Math.sin(aa) * 260 * dt; if (q < (a.r * .4) ** 2) e.dead = true; }
        }
        for (const m of G.minions) if (m.type !== 'cristal' && d2(a.x, a.y, m.x, m.y) < a.r * a.r) { const aa = ang(m.x, m.y, a.x, a.y); m.x += Math.cos(aa) * 140 * dt; m.y += Math.sin(aa) * 140 * dt; }
        for (const tg of G.cibles()) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < a.r * .7) G.frappe(tg, a.dps * dt, { spec: true, continu: true, x: tg.x, y: tg.y });
        if (a.t >= a.dur) a.dead = true;
        break;
      }
    }
  }
}

function majCombat(dt) {
  if (G.slowT > 0) { G.slowT -= dt; dt *= G.slowF; }
  G.t += dt;
  if (G.ralenti > 0) G.ralenti -= dt;
  G.dtE = dt * (G.ralenti > 0 ? .4 : 1);
  if (G.protegeT > 0) G.protegeT -= dt;
  const enCombat = G.etat === 'combat';
  if (enCombat) G.chrono += dt;
  if (G.debut > 0) G.debut -= dt;
  Arene.maj(dt);
  const p = G.p;
  if (enCombat && p.hp > 0) majJoueur(dt);
  const b = G.boss;
  if (b && !b.mort && enCombat && G.debut <= 0) majBoss(b, dt);
  for (const m of G.minions) if (!m.dead && enCombat) majMinion(m, G.dtE);
  majTirsJoueur(dt);
  majTirsEnnemis(G.dtE);
  for (const h of G.hz) {
    HZ[h.kind].up(h, G.dtE);
    if (enCombat && p.hp > 0 && h.kind !== 'flaque' && HZ[h.kind].hit(h, p)) { if (G.blesser(h.dmg, h.src) && h.kind !== 'rayon' && h.kind !== 'onde') h.touche = true; }
  }
  majAllies(dt);
  // contacts
  if (enCombat && p.hp > 0 && b && !b.mort && !b.air && b.alpha > .5 && b.spectral <= 0 && b.trans <= 0 && G.debut <= 0) {
    if (d2(b.x, b.y, p.x, p.y) < (b.r * .85 + p.hr) ** 2) {
      if (G.blesser(DMG(b.charge ? 1.4 : 1), b.charge ? 'charge' : 'contact')) { const a = ang(b.x, b.y, p.x, p.y); p.vx += Math.cos(a) * 500; p.vy += Math.sin(a) * 500; }
    }
  }
  if (enCombat && p.hp > 0) for (const m of G.minions) if (!m.dead && m.spawn <= 0 && m.type === 'larve' && d2(m.x, m.y, p.x, p.y) < (m.r + p.hr) ** 2) G.blesser(DMG(.7), 'invocation');
  // effets
  for (const f of G.fx) f.t += dt;
  for (const q of G.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - 3 * dt; q.vy *= 1 - 3 * dt; q.life -= dt; }
  for (const x of G.textes) { x.t += dt; x.y -= 30 * dt; }
  if (G.leurre) { G.leurre.t -= dt; if (G.leurre.t <= 0) G.leurre = null; }
  if (G.aspiration) { G.aspiration.t -= dt; if (G.aspiration.t <= 0) G.aspiration = null; }
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
  G.shake = Math.max(0, G.shake - dt * 40);
  // nettoyage
  G.pb = G.pb.filter(x => !x.dead);
  G.eb = G.eb.filter(x => !x.dead);
  G.hz = G.hz.filter(x => !x.dead);
  G.allies = G.allies.filter(x => !x.dead);
  G.minions = G.minions.filter(x => !x.dead);
  G.fx = G.fx.filter(f => f.t < f.dur);
  G.parts = G.parts.filter(q => q.life > 0);
  if (G.parts.length > 700) G.parts.splice(0, G.parts.length - 700);
  G.textes = G.textes.filter(x => x.t < x.dur);
  if (G.etat === 'victoire' || G.etat === 'mort') {
    G.finT -= dt / Math.max(.25, G.slowT > 0 ? G.slowF : 1);
    if (G.finT <= 0) { if (G.etat === 'victoire') { G.etat = 'bilan'; G.finVictoire(); } else { G.etat = 'bilan'; UI.mort(G.resMort); } }
  }
}

// ---------- Dessin ----------
let cv, ctx, scale = 1, offX = 0, offY = 0, dpr = 1;
function redim() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  scale = Math.min(innerWidth / W, innerHeight / H);
  offX = (innerWidth - W * scale) / 2; offY = (innerHeight - H * scale) / 2;
}

function dessinerArene(c) {
  const bb = Arene.bb(), hue = G.def ? G.def.hue : 260;
  c.fillStyle = '#05040a'; c.fillRect(0, 0, W, H);
  c.save();
  c.beginPath();
  if (Arene.kind === 'cercle') c.arc(CX, CY, Arene.rad(), 0, TAU); else c.rect(bb.x, bb.y, bb.w, bb.h);
  c.clip();
  const g = c.createRadialGradient(CX, CY, 50, CX, CY, 760);
  g.addColorStop(0, Arene.glace ? '#16243a' : hsl(hue, 25, 10)); g.addColorStop(1, Arene.glace ? '#0b1322' : '#07060d');
  c.fillStyle = g; c.fillRect(AR.x, AR.y, AR.w, AR.h);
  c.strokeStyle = Arene.glace ? 'rgba(160,210,255,.07)' : 'rgba(255,255,255,.035)'; c.lineWidth = 1;
  c.beginPath();
  for (let x = AR.x; x <= AR.x + AR.w; x += 40) { c.moveTo(x, AR.y); c.lineTo(x, AR.y + AR.h); }
  for (let y = AR.y; y <= AR.y + AR.h; y += 40) { c.moveTo(AR.x, y); c.lineTo(AR.x + AR.w, y); }
  c.stroke();
  for (const l of Arene.lave) {
    const lg = c.createRadialGradient(l.x, l.y, 4, l.x, l.y, l.r);
    lg.addColorStop(0, '#ffdd55'); lg.addColorStop(.55, '#ff6a00'); lg.addColorStop(1, '#7a1500');
    c.fillStyle = lg; c.beginPath();
    for (let i = 0; i <= 20; i++) { const a = i * TAU / 20, rr = l.r * (1 + .05 * Math.sin(a * 5 + G.t * 2 + l.x)); c.lineTo(l.x + Math.cos(a) * rr, l.y + Math.sin(a) * rr); }
    c.fill();
  }
  c.restore();
  // bordure
  c.strokeStyle = Arene.insetMax > 0 ? '#ff4d6a' : hsl(hue, 80, 55, .7); c.lineWidth = 3;
  c.beginPath(); if (Arene.kind === 'cercle') c.arc(CX, CY, Arene.rad(), 0, TAU); else c.rect(bb.x, bb.y, bb.w, bb.h); c.stroke();
  for (const pl of Arene.piliers) {
    c.fillStyle = '#1c1a26'; c.beginPath(); c.arc(pl.x, pl.y, pl.r, 0, TAU); c.fill();
    c.strokeStyle = '#4a4660'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#2a2738'; c.beginPath(); c.arc(pl.x - pl.r * .2, pl.y - pl.r * .2, pl.r * .55, 0, TAU); c.fill();
  }
}

function dessinerTirsJoueur(c) {
  for (const b of G.pb) {
    if (b.delai > 0) continue;
    if (b.kind === 'flamme') {
      const k = b.t / (b.t + b.life);
      c.globalAlpha = .55 * (1 - k); c.fillStyle = k < .4 ? '#ffd27a' : '#ff6a2a';
      c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill(); c.globalAlpha = 1; continue;
    }
    if (b.kind === 'boom') {
      c.save(); c.translate(b.x, b.y); c.rotate(b.rot || 0); c.strokeStyle = b.col; c.lineWidth = 4;
      c.beginPath(); c.arc(0, 0, b.r, -1.2, 1.2); c.stroke(); c.restore(); continue;
    }
    if (b.kind === 'fleche' || b.kind === 'trait' || b.kind === 'javelot' || b.kind === 'missile') {
      const l = b.kind === 'trait' ? 34 : b.kind === 'javelot' ? 40 : 16, a = Math.atan2(b.vy, b.vx);
      c.strokeStyle = b.col; c.lineWidth = b.r * (b.kind === 'javelot' ? 1 : .9); c.lineCap = 'round';
      c.beginPath(); c.moveTo(b.x - Math.cos(a) * l, b.y - Math.sin(a) * l); c.lineTo(b.x, b.y); c.stroke(); c.lineCap = 'butt'; continue;
    }
    c.globalAlpha = .8; c.fillStyle = b.col; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.fill(); c.globalAlpha = 1;
  }
}

function dessinerAllies(c) {
  const p = G.p;
  for (const a of G.allies) {
    if (a.t < 0) continue;
    switch (a.kind) {
      case 'grenade': {
        const k = a.t / a.dur, x = lerp(a.x0, a.tx, k), y = lerp(a.y0, a.ty, k) - Math.sin(k * Math.PI) * 60;
        c.strokeStyle = 'rgba(140,200,255,.35)'; c.setLineDash([4, 6]); c.beginPath(); c.arc(a.tx, a.ty, a.r, 0, TAU); c.stroke(); c.setLineDash([]);
        c.fillStyle = '#8cf'; c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill();
        break;
      }
      case 'meteore': {
        const k = a.t / a.dur;
        c.strokeStyle = a.petit ? 'rgba(150,200,255,.6)' : 'rgba(255,210,127,.8)'; c.lineWidth = 2;
        c.beginPath(); c.arc(a.x, a.y, a.r, 0, TAU); c.stroke();
        c.fillStyle = a.petit ? 'rgba(150,200,255,.15)' : 'rgba(255,210,127,.18)'; c.beginPath(); c.arc(a.x, a.y, a.r * k, 0, TAU); c.fill();
        break;
      }
      case 'tourelle':
        c.save(); c.translate(a.x, a.y); c.fillStyle = '#1a2a3a'; c.strokeStyle = '#9cf'; c.lineWidth = 2;
        c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.fill(); c.stroke(); c.rotate(a.a); c.fillStyle = '#9cf'; c.fillRect(0, -3, 18, 6); c.restore();
        c.fillStyle = '#9cf'; c.fillRect(a.x - 13, a.y + 17, 26 * (1 - a.t / a.dur), 3);
        break;
      case 'devast':
        if (a.x2 !== undefined) {
          c.lineCap = 'round'; c.strokeStyle = 'rgba(150,220,255,.4)'; c.lineWidth = a.w * 1.8; c.beginPath(); c.moveTo(a.x1, a.y1); c.lineTo(a.x2, a.y2); c.stroke();
          c.strokeStyle = '#eaffff'; c.lineWidth = a.w * .6; c.beginPath(); c.moveTo(a.x1, a.y1); c.lineTo(a.x2, a.y2); c.stroke(); c.lineCap = 'butt';
        }
        break;
      case 'lames':
        for (let i = 0; i < a.n; i++) {
          const aa = a.a + i * TAU / a.n, bx = p.x + Math.cos(aa) * a.rad, by = p.y + Math.sin(aa) * a.rad;
          c.save(); c.translate(bx, by); c.rotate(aa * 3); c.fillStyle = '#bdf';
          c.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? 5 : 16, q = k * TAU / 8; c.lineTo(Math.cos(q) * r, Math.sin(q) * r); } c.closePath(); c.fill(); c.restore();
        }
        break;
      case 'trou': {
        const k = Math.min(1, a.t / .3, (a.dur - a.t) / .3);
        c.fillStyle = 'rgba(60,20,90,.35)'; c.beginPath(); c.arc(a.x, a.y, a.r * k, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(190,140,255,.7)'; c.lineWidth = 2;
        for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(a.x, a.y, a.r * k * (.35 + i * .25), G.t * (3 + i) , G.t * (3 + i) + 4); c.stroke(); }
        c.fillStyle = '#000'; c.beginPath(); c.arc(a.x, a.y, 18 * k, 0, TAU); c.fill();
        break;
      }
    }
  }
}

function dessinerJoueur(c) {
  const p = G.p;
  if (!p || p.hp <= 0) return;
  // arme : visée
  const prim = G.ars.p;
  if (prim === 'sniper') { c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1; const L = Arene.rayMur(p.x, p.y, p.aim, 1500); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + Math.cos(p.aim) * L, p.y + Math.sin(p.aim) * L); c.stroke(); }
  const w = p.prim;
  if (prim === 'laser' && w.beam) {
    const B = w.beam; c.lineCap = 'round';
    c.strokeStyle = `rgba(120,255,255,${.25 + .3 * B.ramp})`; c.lineWidth = 8 + 8 * B.ramp; c.beginPath(); c.moveTo(B.x1, B.y1); c.lineTo(B.x2, B.y2); c.stroke();
    c.strokeStyle = '#effffe'; c.lineWidth = 2 + 2 * B.ramp; c.beginPath(); c.moveTo(B.x1, B.y1); c.lineTo(B.x2, B.y2); c.stroke(); c.lineCap = 'butt';
  }
  if (prim === 'arc' && w.ch > 0) { c.strokeStyle = w.ch >= 1 ? '#fff6a0' : 'rgba(190,255,238,.6)'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, 22, p.aim - w.ch * 1.4, p.aim + w.ch * 1.4); c.stroke(); }
  if (G.leurre) { c.globalAlpha = .45 + .15 * Math.sin(G.t * 10); c.fillStyle = '#9ff'; c.beginPath(); c.arc(G.leurre.x, G.leurre.y, p.r, 0, TAU); c.fill(); c.globalAlpha = 1; }
  let al = 1;
  if (p.iframe > 0 && !p.dash) al = (G.t * 24 | 0) % 2 ? .35 : .9;
  if (p.fantome > 0) al = .35;
  c.globalAlpha = al;
  c.drawImage(glow('rgba(110,240,255,.35)', 34), p.x - 34, p.y - 34);
  c.fillStyle = p.rouge > 0 ? '#ff6b7d' : '#dffcff'; c.strokeStyle = '#34d6ff'; c.lineWidth = 3;
  c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#34d6ff'; c.beginPath();
  c.moveTo(p.x + Math.cos(p.aim) * (p.r + 8), p.y + Math.sin(p.aim) * (p.r + 8));
  c.lineTo(p.x + Math.cos(p.aim + 2.5) * (p.r - 2), p.y + Math.sin(p.aim + 2.5) * (p.r - 2));
  c.lineTo(p.x + Math.cos(p.aim - 2.5) * (p.r - 2), p.y + Math.sin(p.aim - 2.5) * (p.r - 2)); c.closePath(); c.fill();
  // vraie zone touchable
  c.fillStyle = '#ff2d55'; c.beginPath(); c.arc(p.x, p.y, p.hr, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke();
  c.globalAlpha = 1;
  if (p.bouclier > 0) { c.strokeStyle = 'rgba(140,200,255,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, p.r + 9, 0, TAU); c.stroke(); }
  if (p.miroir > 0) { c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + G.t * 2; c.lineTo(p.x + Math.cos(a) * (p.r + 12), p.y + Math.sin(a) * (p.r + 12)); } c.closePath(); c.stroke(); }
  if (p.parade > 0) { c.strokeStyle = '#ffe9a0'; c.lineWidth = 4; c.beginPath(); c.arc(p.x, p.y, p.r + 6, 0, TAU); c.stroke(); }
}

function dessinerTirsEnnemis(c) {
  const p = G.p, noir = Arene.noir;
  for (const e of G.eb) {
    let al = 1;
    if (noir && p) { const dd = Math.sqrt(d2(e.x, e.y, p.x, p.y)); al = dd < 240 ? 1 : Math.max(.3, 1 - (dd - 240) / 300); }
    if (e.delai > 0) al *= .5 + .5 * Math.sin(G.t * 20);
    c.globalAlpha = al;
    const gr = e.r * 2.4;
    c.drawImage(glow(e.col, gr), e.x - gr, e.y - gr);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(e.x, e.y, e.r * .62, 0, TAU); c.fill();
    c.strokeStyle = e.col; c.lineWidth = Math.max(2, e.r * .35); c.beginPath(); c.arc(e.x, e.y, e.r * .8, 0, TAU); c.stroke();
    if (e.hp > 0) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.setLineDash([3, 4]); c.beginPath(); c.arc(e.x, e.y, e.r + 4, G.t * 3, G.t * 3 + TAU); c.stroke(); c.setLineDash([]); }
  }
  c.globalAlpha = 1;
}

function dessinerFx(c) {
  for (const f of G.fx) {
    if (f.t < 0) continue;
    const k = f.t / f.dur;
    switch (f.kind) {
      case 'anneau': {
        const x = f.suit ? G.p.x : f.x, y = f.suit ? G.p.y : f.y;
        c.strokeStyle = f.col; c.globalAlpha = 1 - k; c.lineWidth = 4 * (1 - k) + 1;
        c.beginPath(); c.arc(x, y, lerp(f.r0, f.r1, k), 0, TAU); c.stroke(); c.globalAlpha = 1; break;
      }
      case 'taillade': {
        const p = G.p, a0 = f.a - 1.05 * f.sens, a1 = f.a + 1.05 * f.sens, cur = lerp(a0, a1, Math.min(1, k * 1.6));
        c.fillStyle = `rgba(220,250,255,${.4 * (1 - k)})`; c.beginPath(); c.moveTo(p.x, p.y);
        c.arc(p.x, p.y, f.reach, Math.min(a0, cur), Math.max(a0, cur)); c.closePath(); c.fill();
        c.strokeStyle = `rgba(255,255,255,${1 - k})`; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, f.reach, Math.min(a0, cur), Math.max(a0, cur)); c.stroke();
        break;
      }
      case 'eclair': {
        c.strokeStyle = `rgba(200,240,255,${1 - k})`; c.lineWidth = 2.5; c.beginPath();
        for (let i = 0; i < f.pts.length - 1; i++) {
          const [x1, y1] = f.pts[i], [x2, y2] = f.pts[i + 1];
          c.moveTo(x1, y1);
          for (let s = 1; s <= 5; s++) { const q = s / 5; c.lineTo(lerp(x1, x2, q) + (s < 5 ? R.range(-9, 9) : 0), lerp(y1, y2, q) + (s < 5 ? R.range(-9, 9) : 0)); }
        }
        c.stroke(); break;
      }
      case 'fantome':
        c.globalAlpha = .4 * (1 - k); c.fillStyle = f.r ? (G.boss ? G.boss.col : '#fff') : '#9ff';
        c.beginPath(); c.arc(f.x, f.y, f.r || 13, 0, TAU); c.fill(); c.globalAlpha = 1; break;
      case 'echo':
        c.globalAlpha = .8 * (1 - k * k); c.strokeStyle = G.boss ? G.boss.col : '#fff'; c.lineWidth = 2;
        c.beginPath(); c.arc(f.x, f.y, 18, 0, TAU); c.stroke(); c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(f.x, f.y, 6, 0, TAU); c.fill(); c.globalAlpha = 1; break;
    }
  }
  for (const q of G.parts) {
    c.globalAlpha = q.life / q.max; c.fillStyle = q.col; c.strokeStyle = q.col;
    if (q.trait) { c.lineWidth = 1.5; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - q.vx * .04, q.y - q.vy * .04); c.stroke(); }
    else c.fillRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2);
  }
  c.globalAlpha = 1;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const x of G.textes) {
    c.globalAlpha = 1 - (x.t / x.dur) ** 2; c.font = `700 ${x.size}px Segoe UI, system-ui, sans-serif`;
    c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(x.txt, x.x, x.y); c.fillStyle = x.col; c.fillText(x.txt, x.x, x.y);
  }
  c.globalAlpha = 1;
}

function barre(c, x, y, w, h, k, col, fond) {
  c.fillStyle = fond || 'rgba(0,0,0,.55)'; c.fillRect(x, y, w, h);
  c.fillStyle = col; c.fillRect(x, y, w * clamp(k, 0, 1), h);
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; c.strokeRect(x + .5, y + .5, w - 1, h - 1);
}

function dessinerHUD(c) {
  const b = G.boss, p = G.p, def = G.def;
  c.textBaseline = 'middle';
  // boss
  if (b) {
    const bw = 640, bx = W / 2 - bw / 2, by = 40;
    c.textAlign = 'center'; c.font = '700 19px Segoe UI, system-ui, sans-serif';
    c.fillStyle = def.mega ? '#ffd86b' : def.col;
    c.fillText((def.mega ? '★ ' : '') + def.nom + (def.mega ? ' ★' : ''), W / 2, 16);
    c.font = 'italic 12px Segoe UI, system-ui, sans-serif'; c.fillStyle = '#aaa'; c.fillText(def.titre, W / 2, 31);
    barre(c, bx, by, bw, 14, b.hp / b.hpMax, def.mega ? '#ffb43d' : def.col);
    const n = def.phases.length;
    c.fillStyle = '#000';
    for (let i = 1; i < n; i++) c.fillRect(bx + bw * (1 - i / n) - 1, by, 3, 14);
    c.font = '600 11px Segoe UI, system-ui, sans-serif'; c.textAlign = 'left'; c.fillStyle = '#ddd';
    c.fillText('Phase ' + (b.phase + 1) + '/' + n, bx + bw + 10, by + 7);
    c.textAlign = 'right'; c.fillText(Math.ceil(Math.max(0, b.hp)).toLocaleString('fr-FR'), bx - 10, by + 7);
    if (b.armureMax) barre(c, bx, by + 17, bw, 4, b.armure / b.armureMax, '#c9c9d6');
    // traits
    c.textAlign = 'left'; c.font = '14px Segoe UI Emoji, Segoe UI, sans-serif';
    let tx = bx + bw + 80;
    for (const t of def.traits) { c.fillText(TRAITS[t].ico, tx, by + 7); tx += 22; }
    if (b.atkNomT > 0 && !b.mort) {
      c.globalAlpha = Math.min(1, b.atkNomT); c.textAlign = 'center'; c.font = '600 13px Segoe UI, system-ui, sans-serif'; c.fillStyle = '#fff';
      c.fillText('▶ ' + ATK[b.main ? b.main.id : b.last].nom, W / 2, by + 32); c.globalAlpha = 1;
    }
  }
  // salle
  c.textAlign = 'left'; c.font = '700 15px Segoe UI, system-ui, sans-serif'; c.fillStyle = '#fff';
  c.fillText('Salle ' + G.salle, 16, 18);
  c.font = '12px Segoe UI, system-ui, sans-serif'; c.fillStyle = '#9a94ad';
  const reste = 5 - ((G.salle - 1) % 5) - 1;
  c.fillText(G.mega ? 'MÉGA BOSS du palier ' + (G.salle / 5) : 'Méga boss dans ' + reste + ' salle' + (reste > 1 ? 's' : ''), 16, 37);
  c.fillText('Palier ' + Save.d.palier, 16, 54);
  c.textAlign = 'right'; c.font = '600 15px Segoe UI, system-ui, sans-serif'; c.fillStyle = '#ddd';
  c.fillText(fmtTemps(G.chrono), W - 16, 18);
  c.font = '11px Segoe UI, system-ui, sans-serif'; c.fillStyle = '#777'; c.fillText('Échap : pause', W - 16, 36);
  // joueur
  if (p) {
    const y0 = 736;
    c.textAlign = 'left'; c.font = '700 12px Segoe UI, system-ui, sans-serif'; c.fillStyle = '#fff';
    c.fillText('VIE ' + Math.ceil(p.hp), 30, y0 + 7);
    barre(c, 90, y0, 260, 14, p.hp / p.hpMax, p.hp < 35 ? '#ff4d6a' : '#46e39b');
    c.fillStyle = '#9cf'; c.fillText('ÉNERGIE', 30, y0 + 30);
    barre(c, 90, y0 + 24, 260, 11, p.energie / ST.eMax, '#5aa8ff');
    const spec = trouveArme('s', G.ars.s), cout = spec.cout * ST.sCout;
    c.fillStyle = '#fff'; c.fillRect(90 + 260 * Math.min(1, cout / ST.eMax) - 1, y0 + 22, 2, 15);
    // emplacements
    const slots = [
      { a: trouveArme('p', G.ars.p), k: 'Clic gauche', t: 'Arme' },
      { a: spec, k: 'Clic droit / E', t: 'Spéciale', cd: p.spec.cd / (spec.rech * ST.sRech), manque: p.energie < cout },
      { a: trouveArme('t', G.ars.t), k: 'Espace', t: 'Talent', cd: p.tal.charges > 0 ? 0 : p.tal.cd / (trouveArme('t', G.ars.t).rech * ST.tRech), ch: p.tal.charges }
    ];
    let sx = 420;
    for (const s of slots) {
      const w = 230;
      c.fillStyle = 'rgba(10,8,20,.75)'; c.fillRect(sx, y0 - 6, w, 52); c.strokeStyle = 'rgba(255,255,255,.18)'; c.strokeRect(sx + .5, y0 - 5.5, w - 1, 51);
      if (s.cd > 0) { c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(sx, y0 - 6, w * clamp(s.cd, 0, 1), 52); }
      c.font = '22px Segoe UI Emoji, Segoe UI, sans-serif'; c.textAlign = 'center'; c.fillStyle = s.manque || s.cd > 0 ? '#666' : '#fff';
      c.fillText(s.a.ico, sx + 26, y0 + 20);
      c.textAlign = 'left'; c.font = '700 13px Segoe UI, system-ui, sans-serif'; c.fillStyle = s.manque || s.cd > 0 ? '#888' : '#fff';
      c.fillText(s.a.nom, sx + 50, y0 + 10);
      c.font = '11px Segoe UI, system-ui, sans-serif'; c.fillStyle = '#9a94ad';
      c.fillText(s.t + ' · ' + s.k, sx + 50, y0 + 29);
      if (s.ch !== undefined && ST.tCharges > 1) { c.textAlign = 'right'; c.fillStyle = '#ffe9a0'; c.font = '700 13px Segoe UI'; c.fillText('×' + s.ch, sx + w - 8, y0 + 10); }
      if (s.manque && !(s.cd > 0)) { c.textAlign = 'right'; c.fillStyle = '#5aa8ff'; c.font = '11px Segoe UI'; c.fillText(Math.round(cout) + ' ⚡', sx + w - 8, y0 + 29); }
      sx += w + 12;
    }
  }
  // bannière
  if (G.banner) {
    const bn = G.banner, k = bn.t / bn.dur, a = Math.min(1, bn.t * 5, (1 - k) * 4);
    c.globalAlpha = a; c.textAlign = 'center'; c.font = '800 34px Segoe UI, system-ui, sans-serif';
    c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.75)'; c.strokeText(bn.txt, W / 2, 150); c.fillStyle = bn.col; c.fillText(bn.txt, W / 2, 150);
    c.globalAlpha = 1;
  }
  if (G.debut > 0 && G.etat === 'combat') {
    c.textAlign = 'center'; c.font = '800 54px Segoe UI'; c.fillStyle = 'rgba(255,255,255,.85)';
    c.fillText(G.debut > .5 ? 'Prêt…' : 'COMBAT !', W / 2, H / 2 + 40);
  }
  if (G.ralenti > 0) { c.fillStyle = 'rgba(120,160,255,.06)'; c.fillRect(AR.x, AR.y, AR.w, AR.h); }
}

function rendu() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#05040a'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (!G.p) return;
  const sh = G.shake, sx = sh ? R.range(-sh, sh) * .6 : 0, sy = sh ? R.range(-sh, sh) * .6 : 0;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (offX + sx * scale), dpr * (offY + sy * scale));
  const c = ctx;
  dessinerArene(c);
  c.save();
  c.beginPath(); c.rect(AR.x - 40, AR.y - 40, AR.w + 80, AR.h + 80); c.clip();
  for (const h of G.hz) if (h.kind === 'flaque') HZ.flaque.draw(h, c);
  dessinerAllies(c);
  for (const m of G.minions) dessinerMinion(c, m);
  dessinerTirsJoueur(c);
  if (Arene.noir && G.p) {
    const p = G.p, g = c.createRadialGradient(p.x, p.y, 110, p.x, p.y, 300);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.93)');
    c.fillStyle = g; c.fillRect(AR.x - 40, AR.y - 40, AR.w + 80, AR.h + 80);
  }
  if (G.boss && !G.boss.mort) dessinerBoss(c, G.boss);
  c.save();
  c.beginPath(); const bb = Arene.bb(); if (Arene.kind === 'cercle') c.arc(CX, CY, Arene.rad(), 0, TAU); else c.rect(bb.x, bb.y, bb.w, bb.h); c.clip();
  for (const h of G.hz) if (h.kind !== 'flaque') HZ[h.kind].draw(h, c);
  c.restore();
  dessinerTirsEnnemis(c);
  dessinerJoueur(c);
  dessinerFx(c);
  c.restore();
  dessinerHUD(c);
}

let dernier = performance.now();
function boucle(now) {
  let dt = (now - dernier) / 1000; dernier = now;
  dt = Math.min(dt, 1 / 30);
  G.mx = (Input.sx - offX) / scale; G.my = (Input.sy - offY) / scale;
  if (G.etat === 'combat' && (Input.hit('Escape') || Input.hit('KeyP'))) UI.pause();
  else if (G.etat === 'combat' || G.etat === 'victoire' || G.etat === 'mort') majCombat(dt);
  else if (G.etat === 'pause') { if (Input.hit('Escape') || Input.hit('KeyP')) UI.reprendre(); else UI.clavier(); }
  else UI.clavier && UI.clavier();
  rendu();
  Input.endFrame();
  requestAnimationFrame(boucle);
}

window.addEventListener('load', () => {
  cv = document.getElementById('jeu'); ctx = cv.getContext('2d');
  redim(); addEventListener('resize', redim);
  UI.menu();
  requestAnimationFrame(boucle);
});
