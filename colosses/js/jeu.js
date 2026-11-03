'use strict';
/* Colosses — moteur du combat : arène, joueur, collisions, enchaînement des salles (sans écrans : portail, butin). */

const W = 1280, H = 800;
const AR = { x: 30, y: 78, w: 1220, h: 646 };
const CX = AR.x + AR.w / 2, CY = AR.y + AR.h / 2;

// ---------- Arène ----------
const Arene = {
  kind: 'rect', carte: 'normale', inset: 0, insetMax: 0, piliers: [], lave: [], glace: false, noir: false, vent: null, version: 0,
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
    this.carte = carte; this.kind = carte === 'cercle' ? 'cercle' : 'rect'; this.version++;
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
    for (const pl of this.piliers) if (pl.tmp !== undefined) { pl.tmp -= dt; if (pl.tmp <= 0) { pl.dead = true; G.explo(pl.x, pl.y, 40, '#8a8070'); } }
    if (this.piliers.some(pl => pl.dead)) this.piliers = this.piliers.filter(pl => !pl.dead);
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
  etat: 'menu', t: 0, dtE: 0, salle: 1, mega: false, def: null, ars: null, arene: Arene, recents: [],
  p: null, boss: null, minions: [], pb: [], eb: [], hz: [], fx: [], allies: [], parts: [], textes: [], lumieres: [], loot: [],
  leurre: null, ralenti: 0, aspiration: null, dmgE: 20, shake: 0, slowT: 0, slowF: 1, mx: CX, my: CY, gel: 0, flash: 0, gelT: 0,
  opts: Save.d.opts, banner: null, chrono: 0, finT: 0, protegeT: 0, coupsPris: 0, portail: null, interT: 0, fondu: 0,
  passage: null, toast: null, coeurT: 0, resMort: null, tueur: null, ecranMort: false,

  cibles() {
    const out = [];
    const b = this.boss;
    if (b && !b.mort && !b.air && b.spectral <= 0 && b.alpha > .3 && b.intro <= 0) {
      out.push(b);
      if (b.esp.cibles) for (const x of b.esp.cibles(b)) out.push(x);
    }
    for (const m of this.minions) if (!m.dead && m.spawn <= 0) out.push(m);
    return out;
  },
  lancerRayon(x, y, a, max, w) {
    let d = Arene.rayMur(x, y, a, max), best = null;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (const tg of this.cibles()) { const t = rayCircle(x, y, ca, sa, tg.x, tg.y, tg.r + w / 2); if (t < d) { d = t; best = tg; } }
    return { x: x + ca * d, y: y + sa * d, d, cible: best };
  },
  annonce(txt, col, dur) { this.banner = { txt, col: col || '#fff', t: 0, dur: dur || 1.6 }; },
  texte(x, y, txt, col, size) { if (this.textes.length < 80) this.textes.push({ x: x + R.range(-8, 8), y, txt, col, t: 0, dur: .8, size: size || 15 }); },
  secoue(n) { this.shake = Math.max(this.shake, n * (+this.opts.tremble || 0)); },
  marque(x, y, r) { Decor.brulure(x, y, r); },
  ralentir(f, t) { this.slowF = f; this.slowT = t; },
  lumiere(x, y, r, col, dur) { if (this.lumieres.length < 40) this.lumieres.push({ x, y, r, col, t: 0, dur }); },
  etincelle(x, y, col, n) { n = Math.round(n * QUAL()); for (let i = 0; i < n; i++) { const a = R() * TAU, s = R.range(80, 280); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .3, max: .3, col, r: R.range(1.2, 2.4), trait: true, add: true }); } },
  explo(x, y, r, col) {
    this.fx.push({ kind: 'anneau', x, y, r0: r * .3, r1: r, t: 0, dur: .3, col });
    this.fx.push({ kind: 'boule', x, y, r, t: 0, dur: .35, col });
    this.lumiere(x, y, r * 2.4, col, .35);
    const n = Math.min(26, 8 + r / 6 | 0);
    for (let i = 0; i < n; i++) { const a = R() * TAU, s = R.range(.3, 1) * r * 3.2; this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .5, max: .5, col, r: R.range(1.5, 3), trait: true, add: true }); }
    for (let i = 0; i < 3; i++) { const a = R() * TAU, s = R.range(10, 60); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 1, max: 1, col: 'rgba(40,36,50,.28)', r: r * R.range(.12, .22), fumee: true }); }
  },
  recul(p, f) { p.vx -= Math.cos(p.aim) * f; p.vy -= Math.sin(p.aim) * f; },
  traine(p) { for (let i = 0; i < 4; i++) this.fx.push({ kind: 'fantome', x: p.x, y: p.y, t: -i * .03, dur: .25 }); },
  dirMouv(p) {
    let x = 0, y = 0;
    const K = TOUCHES();
    if (Input.down(K.haut) || Input.down('ArrowUp')) y--;
    if (Input.down(K.bas) || Input.down('ArrowDown')) y++;
    if (Input.down(K.gauche) || Input.down('ArrowLeft')) x--;
    if (Input.down(K.droite) || Input.down('ArrowRight')) x++;
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
    const m = { type, x, y, r: d.r, hp: d.hp * k, hpMax: d.hp * k, vit: d.vit, spawn: .8, flash: 0, cd: 1 + R(), a: R() * TAU, salve: 0, st: 0, fixe: d.vit === 0 };
    this.minions.push(m);
    Save.d.codex.invoc[type] = 1;
    return m;
  },

  // ---------- Dégâts infligés ----------
  frappe(tg, dmg, o) {
    if (this.etat !== 'combat') return;
    let mult = 1;
    if (tg.proxy) { mult = tg.mult; tg = tg.proxy; }
    if (tg.dead || tg.spawn > 0) return;
    let m = mult, crit = false;
    if (o.prim) {
      m *= PRIM_EQ[G.ars.p] || 1;
      const mf = modForge();
      if (mf.dmg) m *= mf.dmg;
      if (mf.canal) m *= Math.hypot(this.p.vx, this.p.vy) < 25 ? 1.25 : .85;
      if (mf.vampire && (this.p.vampT || 0) < G.t) { this.p.vampT = G.t + 1; this.p.hp = Math.min(this.p.hpMax, this.p.hp + 1); }
    }
    const cible0 = tg.proxy || tg;
    if (cible0.harpon > 0 && o.prim) m *= 1.3;
    let elemTxt = 0;
    if ((o.prim || o.spec) && this.def && (cible0 === this.boss)) {
      const el = elemArme(o.prim ? this.ars.p : this.ars.s);
      if (el === FAIBLESSE[this.def.elem]) { m *= 1.3; elemTxt = 1; } else if (el === this.def.elem) { m *= .75; elemTxt = -1; }
    }
    if (o.prim && !o.continu && R() < ST.pCrit + (o.critB || 0)) { m *= 2; crit = true; this.fx.push({ kind: 'etoile', x: o.x || tg.x, y: o.y || tg.y, t: 0, dur: .25 }); if (this.ars.p === 'pacte') this.p.hp = Math.min(this.p.hpMax, this.p.hp + 1); }
    const b = this.boss;
    if (tg === b) {
      if (b.trans > 0 || b.air || b.mort || b.intro > 0) return;
      if (b.def.invincible) { if (this.protegeT <= 0) { this.texte(b.x, b.y - b.r - 14, 'Invincible', '#888', 13); this.protegeT = .8; } return; }
      if (bouclierBoss(b)) { if (this.protegeT <= 0) { this.texte(b.x, b.y - b.r - 14, 'Protégé', '#7fd8ff', 14); this.protegeT = .6; } return; }
      if (b.miroir > 0 && o.prim) { if (this.protegeT <= 0) { this.texte(b.x, b.y - b.r - 14, 'Reflété !', '#fff', 15); this.protegeT = .5; } return; }
      const me = b.esp.mult ? b.esp.mult(b, o) : 1;
      if (me === 0) { if (this.protegeT <= 0) { this.texte(o.x, o.y - 10, 'Bloqué', '#bfe0ff', 13); this.protegeT = .35; } this.etincelle(o.x, o.y, '#bfe0ff', 3); return; }
      m *= me;
      const tr = b.def.traits;
      if (tr.includes('dos')) { const dif = Math.abs(angDiff(b.facing + Math.PI, ang(b.x, b.y, o.x, o.y))); m *= dif < 1.05 ? 2.5 : dif > 2.1 ? .4 : 1; }
      if (tr.includes('souffle')) m *= bossVulnerableSouffle(b) ? 2.2 : .5;
      if (b.stun > 0) m *= 1.3;
      if (b.ouvert > 0) m *= b.ouvertMul;
      m *= fatigueBoss();
      if (totemProtege()) m *= .55;
      if (this.rel('colere')) m *= this.p.hp < this.p.hpMax * .4 ? 1.3 : .85;
      if (this.rel('opportun')) m *= b.ouvert > 0 || b.stun > 0 ? 1.5 : .85;
      if (this.rel('assassin')) { const dd = Math.abs(angDiff(b.facing + Math.PI, ang(b.x, b.y, o.x, o.y))); m *= dd < 1.05 ? 1.4 : dd > 2.1 ? .8 : 1; }
      if (this.rel('chasseur')) m *= .88;
      let d = dmg * m;
      statPlus('degats', undefined, d);
      if (this.rel('vampire')) { this.sal.vamp += d; while (this.sal.vamp >= 250) { this.sal.vamp -= 250; this.p.hp = Math.min(this.p.hpMax, this.p.hp + 1); } }
      if (b.armure > 0) {
        b.armure -= d * (o.spec ? 3 : 1); d *= .25;
        if (b.armure <= 0) { b.armure = 0; b.armureCd = 12; this.annonce('Carapace brisée !', '#fff', 1.3); Son.play('verre'); this.secoue(8); succes('carapace'); }
      }
      if (o.prim) this.p.energie = Math.min(ST.eMax, this.p.energie + d * .1 * ST.eGain * (modForge().energie || 1));
      b.flash = Math.max(b.flash, o.continu ? .2 : .5); b.regenT = 0;
      if (!o.continu) Son.play('touche');
      this.chiffre(tg, d, crit, o, m);
      if (b.esp.absorbe && b.esp.absorbe(b, d)) return;
      if (b.def.indestructible) { this.defi.degats += d; return; }
      b.hp -= d;
      const n = b.def.phases.length;
      if (b.phase < n - 1 && b.hp <= seuilPhase(b, b.phase)) { b.hp = seuilPhase(b, b.phase); if (!(b.esp.transition && b.esp.transition(b))) passerPhase(b); }
      else if (b.hp <= 0) this.bossMort();
    } else {
      const d = dmg * m * fatigueBoss() * (this.rel('chasseur') ? 1.6 : 1);
      tg.hp -= d; tg.flash = 1;
      this.chiffre(tg, d, crit, o, 1);
      if (tg.hp <= 0) {
        tg.dead = true; this.explo(tg.x, tg.y, 40, tg.type === 'cristal' ? '#7fd8ff' : b.col);
        Son.play(tg.type === 'cristal' || tg.type === 'noeud' ? 'verre' : 'explo');
        if (tg.type === 'tete') Son.play('cri');
        this.p.energie = Math.min(ST.eMax, this.p.energie + 8 * ST.eGain);
        if (tg.type === 'cristal' && !this.minions.some(x => x !== tg && !x.dead && x.type === 'cristal')) { this.annonce('Bouclier brisé !', '#7fd8ff', 1.3); b.cristT = 18; }
      }
    }
  },
  chiffre(tg, d, crit, o, m) {
    if (!this.opts.chiffres) return;
    if (o.continu) { tg.acc = (tg.acc || 0) + d; tg.accT = (tg.accT || 0) + this.dtE; if (tg.accT < .25) return; d = tg.acc; tg.acc = 0; tg.accT = 0; }
    const col = crit ? '#ffe14d' : m >= 2 ? '#ffb347' : m < .9 ? '#888' : o.spec ? '#9cf' : '#eee';
    this.texte(o.x || tg.x, (o.y || tg.y) - 10, Math.round(d) + (crit ? '!' : ''), col, crit ? 18 : m >= 2 ? 17 : o.spec ? 17 : 13);
  },

  // ---------- Dégâts subis ----------
  blesser(dmg, src) {
    const p = this.p;
    if (this.etat !== 'combat' || !p || p.hp <= 0) return false;
    if (p.fantome > 0 || p.iframe > 0) return false;
    if (this.format() === 'danse') { this.defi.coups++; p.iframe = .9; p.rouge = .35; this.secoue(8); Son.play('blesse'); this.texte(p.x, p.y - 24, 'touché', '#ff5a6e', 16); return true; }
    if (p.contre > 0 && this.boss && !this.boss.mort) {
      const b = this.boss; p.contre = 0; p.iframe = .9; this.gel = .06;
      G.fx.push({ kind: 'fantome', x: p.x, y: p.y, t: 0, dur: .3 });
      const pt = Arene.clampPt(b.x - Math.cos(b.facing) * (b.r + 45), b.y - Math.sin(b.facing) * (b.r + 45), p.r); p.x = pt.x; p.y = pt.y;
      this.frappe(b, 220 * ST.pDmg, { x: b.x, y: b.y }); this.texte(p.x, p.y - 26, 'CONTRE !', '#ff8a5c', 20); Son.play('parade'); this.secoue(6);
      return false;
    }
    if (p.parade > 0) {
      p.parade = 0; p.iframe = .8; this.ralentir(.3, .3); this.gel = .08;
      const r = 210;
      for (const tg of this.cibles()) if (Math.sqrt(d2(p.x, p.y, tg.x, tg.y)) - tg.r < r) this.frappe(tg, 260 * ST.pDmg, { x: tg.x, y: tg.y });
      for (const e of this.eb) if (d2(p.x, p.y, e.x, e.y) < r * r) e.dead = true;
      p.energie = Math.min(ST.eMax, p.energie + 25 * ST.eGain);
      p.tal.charges = ST.tCharges; p.tal.cd = 0;
      this.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 20, r1: r, t: 0, dur: .3, col: '#ffe9a0' });
      this.lumiere(p.x, p.y, 300, '#ffe9a0', .3);
      this.texte(p.x, p.y - 26, 'PARADE !', '#ffe9a0', 22); Son.play('parade'); this.secoue(6);
      Save.d.stats.parades++;
      return false;
    }
    if (p.bouclier > 0) {
      p.bouclier = 0; p.iframe = .6;
      this.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 18, r1: 60, t: 0, dur: .3, col: '#8cf' });
      Son.play('parade'); return false;
    }
    if (this.rel('epines')) dmg *= 1.2;
    if (p.hp - dmg <= 0 && this.rel('second') && !this.sal.second) { this.sal.second = true; dmg = p.hp - 1; p.iframe = 1.6; this.annonce('Second souffle !', '#ff8fb0', 1.4); }
    p.hp -= dmg; p.iframe = Math.max(p.iframe, .8); p.rouge = .35; this.coupsPris++; statPlus('coups');
    if (this.rel('epines') && this.boss && !this.boss.mort) this.frappe(this.boss, 200, { x: this.boss.x, y: this.boss.y });
    this.secoue(12); this.gel = .07; this.flash = Math.max(this.flash, .15); Son.play('blesse');
    this.texte(p.x, p.y - 24, '-' + Math.round(dmg), '#ff5a6e', 19);
    for (let i = 0; i < 10; i++) { const a = R() * TAU, s = R.range(60, 240); this.parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .4, max: .4, col: '#ff4d6a', r: 2, trait: true, add: true }); }
    if (p.hp <= 0) { p.hp = 0; this.tueur = src; this.mortJoueur(); }
    return true;
  },

  // ---------- Enchaînement des salles ----------
  // mode : 'normal' (progression), 'jour' ou 'semaine' (défis à graine fixe)
  mode: 'normal', defi: null, finDefi: null,
  nouvellePartie() {
    this.mode = 'normal'; this.defi = null; this.finDefi = null;
    calcStats();
    const pr = PR();
    if (!pr.run) pr.run = { salle: pr.palier * 5 + 1, pv: DF().pv };
    this.p = creerJoueur(pr.run.pv);
    this.ars = null;
    this.entrerSalle();
  },
  lancerAbysses() {
    this.mode = 'abysses'; this.finDefi = null;
    this.defi = { type: 'abysses', format: 'abysses', cle: '∞', mut: [], boss: [], i: 0, temps: 0, tues: 0, degats: 0, coups: 0 };
    calcStats(); this.p = creerJoueur(DF().pv); this.ars = null;
    this.entrerSalle();
  },
  lancerDefi(type) {
    const df = defiCourant(type);
    this.mode = type; this.finDefi = null;
    this.defi = Object.assign(df, { i: 0, temps: 0, tues: 0, degats: 0, coups: 0 });
    const rec = Save.d.defis[type];
    if (!rec || rec.cle !== df.cle) Save.d.defis[type] = { cle: df.cle, best: null, essais: 0 };
    Save.d.defis[type].essais++;
    Save.write();
    calcStats();
    this.p = creerJoueur(this.mut('verre') ? 60 : DF().pv);
    this.ars = null;
    this.entrerSalle();
  },
  mut(id) { return (this.mode === 'jour' || this.mode === 'semaine' || this.mode === 'abysses') && this.defi && this.defi.mut.includes(id); },
  format() { return this.defi && this.mode !== 'normal' && this.mode !== 'entrainement' ? this.defi.format : null; },
  reliques() {
    if (this.mode === 'abysses') return this.defi ? (this.defi.reliques = this.defi.reliques || []) : [];
    if (this.mode === 'normal') { const run = PR().run; return run ? (run.reliques = run.reliques || []) : []; }
    if (this.mode === 'entrainement') return this.entr ? (this.entr.reliques = this.entr.reliques || []) : [];
    return this.defi ? (this.defi.reliques = this.defi.reliques || []) : [];
  },
  rel(id) { return this.reliques().includes(id); },
  lancerEntrainement(cfg) {
    this.mode = 'entrainement'; this.entr = cfg; this.finDefi = null; this.defi = null;
    calcStats();
    this.p = creerJoueur(DF().pv); this.ars = null;
    this.entrerSalle();
  },
  entrerSalle() {
    const d = Save.d;
    let def, ars;
    if (this.mode === 'normal') {
      const pr = PR(), run = pr.run;
      this.salle = run.salle;
      this.mega = this.salle % 5 === 0;
      if (run.boss && run.boss.salle === this.salle) { def = genBoss(this.salle, run.boss.seed, this.mega, run.boss.eviter); ars = run.boss.ars; def.legendaire = run.boss.leg; }
      else {
        const seed = this.mega ? hashNum(this.salle * 7919 + 13 + Object.keys(DIFFS).indexOf(d.diff) * 101) : R.int(1, 2147483646);
        const eviter = this.recents.slice();
        def = genBoss(this.salle, seed, this.mega, eviter);
        if (!this.mega && this.salle >= 6 && R() < .035) def.legendaire = true;
        const prev = this.ars || {};
        ars = { p: tirerArme('p', prev.p, def), s: tirerArme('s', prev.s, def), t: tirerArme('t', prev.t, def) };
        run.boss = { salle: this.salle, seed, eviter, ars, leg: !!def.legendaire };
        this.recents.push(def.esp); if (this.recents.length > 3) this.recents.shift();
      }
    } else if (this.mode === 'entrainement') {
      const cfg = this.entr; this.salle = cfg.salle; this.mega = false;
      def = genBoss(cfg.salle, cfg.seed, false, []);
      for (let i = 1; def.esp !== cfg.esp && i < 600; i++) def = genBoss(cfg.salle, cfg.seed + i * 7919, false, []);
      cfg.seed = def.seed;
      const tire = l => R.pick(l).id;
      ars = { p: cfg.p || tire(PRIM), s: cfg.s || tire(SPEC), t: cfg.t || tire(TAL) };
    } else {
      const df = this.defi;
      if (df.format === 'abysses' && !df.boss[df.i]) {
        if (df.i && df.i % 2 === 0 && df.mut.length < 6) { const m = R.pick(Object.keys(MUTATEURS).filter(k => !df.mut.includes(k) && k !== 'verre' && k !== 'jeune')); if (m) { df.mut.push(m); this.annonce('Abysses : ' + MUTATEURS[m].ico + ' ' + MUTATEURS[m].nom, '#c06bff', 2.4); } }
        df.boss[df.i] = { salle: 3 + df.i * 2, seed: R.int(1, 2e9), mega: false, ars: { p: tirerArme('p'), s: tirerArme('s'), t: tirerArme('t') } };
      }
      const b = df.boss[df.i];
      this.salle = b.salle; this.mega = b.mega;
      def = genBoss(b.salle, b.seed, b.mega, []); ars = b.ars;
      if (df.format === 'abysses') { const r = RNG(b.seed + 3); for (const t of r.shuffle(Object.keys(TRAITS).filter(t => !def.traits.includes(t))).slice(0, Math.min(3, Math.floor(df.i / 2)))) def.traits.push(t); }
      if (df.format === 'geant') { const last = def.phases[def.phases.length - 1]; while (def.phases.length < 4) def.phases.push(Object.assign({}, last, { nom: 'Dernier souffle', tempo: last.tempo * 1.08 })); def.hpMax = Math.round(def.hpMax * 1.25); }
      if (df.format === 'survie' || df.format === 'danse') def.invincible = true;
      if (df.format === 'deluge') def.indestructible = true;
      if (this.mut('frenesie')) { def.D.S *= 1.2; def.idle *= .85; }
      if (this.mut('vitesse')) def.D.S *= 1.12;
      if (this.mut('colosses')) def.hpMax = Math.round(def.hpMax * 1.4);
      if (this.mut('nuit')) def.phases.forEach(ph => ph.carte = 'tenebres');
      if (this.mut('patinoire')) def.phases.forEach(ph => ph.carte = 'glace');
      if (this.mut('chaos')) { const r = RNG(b.seed); for (const t of r.shuffle(Object.keys(TRAITS).filter(t => !def.traits.includes(t))).slice(0, 2)) def.traits.push(t); }
    }
    if (def.legendaire) { def.hpMax = Math.round(def.hpMax * 1.15); def.phases.forEach(ph => { if (!ph.fond) ph.fond = { id: 'salve', p: ATK.salve.params(RNG(def.seed), def.D, true) }; }); }
    this.def = def; this.ars = ars;
    const nouveaux = ['p', 's', 't'].map(c => !d.codex.arm[c + ':' + this.ars[c]]);
    this.minions = []; this.pb = []; this.eb = []; this.hz = []; this.fx = []; this.allies = []; this.parts = []; this.textes = []; this.lumieres = []; this.loot = [];
    this.leurre = null; this.tueur = null; this.ralenti = 0; this.aspiration = null; this.slowT = 0; this.banner = null; this.boss = null; this.portail = null; this.passage = null; this.gelT = 0; this.arretHz = 0;
    Arene.inset = 0; Decor.nouvelleSalle();
    calcStats();
    const p = this.p;
    p.x = CX; p.y = AR.y + AR.h * .82; p.vx = p.vy = 0; p.dash = null; p.ancre = null; p.saut = 0; p.sprint = 0; p.invis = 0; p.hist = [];
    p.hpMax = Math.max(30, (this.mut('verre') ? 60 : DF().pv) - malusPV()); p.hp = Math.min(p.hp, p.hpMax);
    if (this.mode === 'entrainement') p.hp = p.hpMax;
    if (this.format() === 'unCoup') p.hp = p.hpMax = 1;
    p.bouclier = this.rel('egide') ? 1e6 : 0;
    this.sal = { spec: 0, tal: 0, second: false, tempete: 6, vamp: 0, regen: 0 };
    p.prim = { cd: 0 }; p.spec = { cd: 0 }; p.tal = { charges: ST.tCharges, cd: 0 }; p.energie = Math.max(p.energie, ST.eMax * .5); p.iframe = 1.5;
    Arene.appliquer(this.def.phases[0].carte);
    this.boss = creerBoss(this.def);
    initBoss(this.boss);
    this.dmgE = clamp(20 + .45 * this.salle, 20, 34) * (this.mega ? 1.1 : 1) * DF().dmg;
    this.etat = 'combat'; this.chrono = 0; this.coupsPris = 0; this.fondu = 1; this.ecranMort = false;
    this.toast = { t: 0, dur: 3.4, nouveaux };
    const cx = d.codex;
    cx.arm['p:' + this.ars.p] = 1; cx.arm['s:' + this.ars.s] = 1; cx.arm['t:' + this.ars.t] = 1;
    cx.cartes[this.def.phases[0].carte] = 1;
    cx.especes[this.def.esp] = cx.especes[this.def.esp] || { vus: 0, tues: 0 };
    cx.especes[this.def.esp].vus++;
    for (const t of this.def.traits) cx.traits[t] = 1;
    if (this.mode === 'normal') { const pr = PR(); pr.record = Math.max(pr.record, this.salle); pr.run.pv = p.hp; }
    Save.write();
    Musique.baisser(1);
    if (this.mega) { Musique.jouer(MUS.mega[(Math.max(1, Math.round(this.salle / 5)) - 1) % MUS.mega.length][0], 4); Son.play('gong'); }
    else Musique.combat(this.salle % 5 === 1 && this.salleMusique !== this.salle);
    this.salleMusique = this.salle;
    Input.clear();
  },
  musiquePhase() {
    if (!this.mega || !this.boss) return;
    const piste = MUS.mega[(Math.max(1, Math.round(this.salle / 5)) - 1) % MUS.mega.length], n = this.def.phases.length;
    const i = this.boss.phase >= n - 1 ? 2 : Math.min(1, this.boss.phase);
    Musique.jouer(piste[i], 3.5);
  },
  bossMort() {
    const b = this.boss;
    if (b.mort) return;
    b.mort = true; b.hp = 0; b.main = null; b.fond = null;
    for (const e of this.eb) this.etincelle(e.x, e.y, b.col, 1);
    this.eb.length = 0; this.hz.length = 0; this.aspiration = null;
    for (const m of this.minions) { m.dead = true; this.explo(m.x, m.y, 30, b.col); }
    for (let i = 0; i < 7; i++) setTimeout(() => { this.explo(b.x + R.range(-50, 50), b.y + R.range(-50, 50), 130, i % 2 ? '#fff' : b.col); this.secoue(10); }, i * 150);
    this.ralentir(.25, 1.3); this.secoue(22); this.gel = .2; this.flash = .6; Son.play('mortBoss');
    this.lumiere(b.x, b.y, 600, b.col, 1.2); this.marque(b.x, b.y, b.r * 2.2);
    this.etat = 'interlude'; this.interT = 0;
    Musique.baisser(.55);
    this.p.hp = this.p.hpMax; this.texte(this.p.x, this.p.y - 34, 'Vie restaurée', '#46e39b', 18);
    this.annonce(this.def.mega ? 'MÉGA BOSS VAINCU !' : 'VAINCU !', '#ffe14d', 2.4);
    const d = Save.d;
    if (this.mode === 'entrainement') { d.stats.temps += this.chrono; Save.write(); return; }
    // récompenses : éclats de forge et fragments d'apparence, jamais de puissance
    const gains = [];
    const ecl = this.def.mega ? 3 : 1; gagnerEclats(ecl); gains.push('+' + ecl + ' éclat' + (ecl > 1 ? 's' : ''));
    if (this.def.legendaire) { gains.push(donnerLegendaire()); gagnerEclats(5); (d.legendaires = d.legendaires || {})[this.def.esp] = 1; succes('legende'); }
    else if (this.def.mega) { gains.push(donnerFragment('rare')); gains.push(donnerFragment('rare')); }
    else if (R() < .3) gains.push(donnerFragment());
    gains.forEach((g, i) => setTimeout(() => this.texte(this.p.x, this.p.y - 60 - i * 20, g, '#ffd86b', 15), 700 + i * 350));
    if (this.mode === 'normal') noterChasse(this.def.esp, this.chrono);
    statPlus('tuesArme', this.ars.p);
    noterMaitrise(this.def.esp, this.coupsPris === 0 || this.chrono < 60, this.mode === 'normal' && d.diff === 'cauchemar');
    succes('premier');
    if (this.coupsPris === 0) succes('intouchable');
    if (this.chrono < 45) succes('eclair');
    if (this.p.hp < 10) succes('fil');
    if (!this.sal.spec && !this.sal.tal) succes('frugal');
    if (((d.essais || {})[d.diff + ':' + this.salle] || 0) >= 5) succes('revanche');
    if (this.mode === 'normal' && d.diff === 'cauchemar') { succes('cauchemar'); if (this.def.mega) succes('cauchMega'); }
    if (this.def.mega) succes('mega1');
    d.stats.boss++; d.stats.salles++; d.stats.temps += this.chrono;
    if (d.codex.especes[this.def.esp]) d.codex.especes[this.def.esp].tues++;
    d.chasse.unshift({ nom: this.def.nom, titre: this.def.titre, salle: this.salle, mega: this.def.mega, temps: Math.round(this.chrono), hue: this.def.hue, phases: this.def.phases.length, diff: this.mode === 'normal' ? d.diff : this.mode });
    d.chasse = d.chasse.slice(0, 60);
    const esp = d.especesTemps = d.especesTemps || {};
    if (!esp[this.def.esp] || this.chrono < esp[this.def.esp]) esp[this.def.esp] = Math.round(this.chrono);
    if (this.mode === 'normal') {
      const pr = PR();
      if (this.def.mega) {
        d.stats.mega++;
        pr.palier = Math.max(pr.palier, Math.round(this.salle / 5));
        const k = String(this.salle), old = pr.megaTemps[k];
        if (!old || this.chrono < old) pr.megaTemps[k] = Math.round(this.chrono);
      }
      pr.run.salle = this.salle + 1; pr.run.boss = null; pr.run.depuisPasse = (pr.run.depuisPasse === undefined ? 3 : pr.run.depuisPasse) + 1;
      if (this.def.mega && (pr.run.reliques || []).length) { pr.run.reliques = []; calcStats(); this.texte(this.p.x, this.p.y - 50, 'Les reliques se dissipent', '#c06bff', 16); }
      pr.record = Math.max(pr.record, pr.run.salle);
      pr.run.pv = this.p.hp;
    } else {
      const df = this.defi;
      df.tues++; df.temps += this.chrono; df.i++;
      if (df.format !== 'abysses' && df.i >= df.boss.length) this.terminerDefi(true);
    }
    verifierSucces();
    Save.write();
  },
  terminerDefi(reussi) {
    const df = this.defi;
    if (this.finDefi) return;
    const F = FORMATS[df.format] || FORMATS.chrono;
    if (df.type === 'abysses') { Save.d.abysses = Save.d.abysses || { best: 0 }; }
    const rec = df.type === 'abysses' ? Save.d.abysses : Save.d.defis[df.type];
    const res = { reussi, tues: df.tues, total: df.boss.length, temps: df.temps, type: df.type, format: df.format, degats: Math.round(df.degats), coups: df.coups };
    res.score = F.score(res);
    const ancien = df.type === 'abysses' ? (rec.best ? { score: rec.best } : null) : rec.best;
    const mieux = res.score !== null && (!ancien || ancien.score === undefined || (F.sens > 0 ? res.score > ancien.score : res.score < ancien.score));
    res.ancien = ancien; res.record = mieux;
    if (mieux) { if (df.type === 'abysses') rec.best = res.score; else rec.best = { score: res.score, tues: res.tues, temps: Math.round(res.temps * 10) / 10 }; }
    if (reussi && df.type !== 'abysses') { succes(df.type === 'jour' ? 'defiJour' : 'defiSemaine'); statPlus('defisReussis'); gagnerEclats(2); this.texte(this.p.x, this.p.y - 60, donnerFragment(), '#ffd86b', 15); }
    if (df.type === 'abysses' && res.score >= 10) succes('abysses10');
    Save.d.defisHist = Save.d.defisHist || [];
    Save.d.defisHist.unshift({ type: df.type, cle: df.cle, tues: res.tues, total: res.total, temps: Math.round(res.temps) });
    Save.d.defisHist = Save.d.defisHist.slice(0, 30);
    this.finDefi = res;
    Save.write();
  },
  poserButin() {
    const p = this.p;
    if (this.def.mega && this.mode === 'normal') { this.ouvrirPortail(); } else {
      if (!this.finDefi && this.mode !== 'entrainement' && this.format() !== 'unCoup') offrirReliques().forEach((id, i) => this.loot.push({ kind: 'relique', id, x: CX + (i ? 130 : -130), y: CY + 40, t: -i * .15 }));
      if (!this.finDefi) this.ouvrirPortail();
    }
  },
  ouvrirPortail() { if (!this.portail) { this.portail = { x: CX, y: AR.y + AR.h * .3, t: 0 }; Son.play('portail'); } },
  ramasser(l) {
    const p = this.p;
    if (l.kind === 'soin') {
      const s = Math.min(l.val, p.hpMax - p.hp); p.hp += s;
      this.texte(p.x, p.y - 30, '+' + Math.round(s) + ' vie', '#46e39b', 18); Son.play('soin');
    } else if (l.kind === 'relique') {
      this.reliques().push(l.id); calcStats();
      for (const o of this.loot) if (o.kind === 'relique') o.dead = true;
      const r = RELIQUES[l.id]; this.annonce(r.ico + ' ' + r.nom, '#c06bff', 2); Son.play('ramasse');
      this.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 10, r1: 140, t: 0, dur: .5, col: '#c06bff' });
      if (this.reliques().length >= 5) succes('reliques5');
    } else {
      const up = PR().up[l.cat]; up[l.id] = (up[l.id] || 0) + 1;
      calcStats(); Son.play('ramasse');
      const u = UPG[l.cat].find(x => x.id === l.id);
      this.annonce(u.ico + ' ' + u.nom + ' niveau ' + lv(l.cat, l.id), '#ffe14d', 2);
      for (const o of this.loot) if (o.kind === 'up') o.dead = true;
      this.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 10, r1: 160, t: 0, dur: .5, col: '#ffe14d' });
      this.ouvrirPortail();
    }
    l.dead = true;
    if (this.mode === 'normal') PR().run.pv = p.hp;
    Save.write();
  },
  traverserPortail() {
    this.passage = { t: 0, dur: .7 };
    this.etat = 'passage';
    Son.play('teleporte');
    if (this.mode === 'normal') { PR().run.pv = this.p.hp; Save.write(); }
  },
  mortJoueur() {
    const d = Save.d;
    this.etat = 'mort'; this.finT = 1.7; this.ralentir(.3, 1.4); Son.play('mort'); this.secoue(18); this.flash = .5;
    d.stats.morts++; d.stats.temps += this.chrono; statPlus('mortsAttaque', this.tueur || 'inconnu');
    this.resMort = { salle: this.salle, def: this.def, pct: this.boss ? 1 - Math.max(0, this.boss.hp) / this.boss.hpMax : 0, phase: this.boss ? this.boss.phase + 1 : 1, temps: this.chrono };
    if (this.mode === 'normal') {
      // on rejoue le même boss, avec les mêmes armes, tout le monde à pleine vie
      const pr = PR(); pr.run.pv = DF().pv;
      const e = d.essais = d.essais || {}; const k = Save.d.diff + ':' + this.salle; e[k] = (e[k] || 0) + 1;
    } else if (this.mode !== 'entrainement') { this.defi.temps += this.chrono; this.terminerDefi(['survie', 'deluge'].includes(this.defi.format)); }
    Save.write();
    Musique.baisser(.25);
  },
  recommencer() {
    if (this.mode === 'normal' || this.mode === 'entrainement') { this.p = creerJoueur(DF().pv); this.entrerSalle(); }
    else if (this.mode === 'abysses') this.lancerAbysses();
    else this.lancerDefi(this.defi.type);
  },
  // relance le même combat, même boss, mêmes armes, tout le monde à pleine vie (sans compter de mort)
  relancer() {
    this.finDefi = null;
    if (this.mode === 'jour' || this.mode === 'semaine' || this.mode === 'abysses') return this.recommencer();
    this.p = creerJoueur(DF().pv);
    this.entrerSalle();
  },
  passeDispo() { if (this.mode !== 'normal') return -1; const run = PR().run; const n = run.depuisPasse === undefined ? 3 : run.depuisPasse; return Math.max(0, 3 - n); },
  passerBoss() {
    if (this.passeDispo() !== 0) return;
    const run = PR().run;
    run.salle++; run.boss = null; run.depuisPasse = 0; run.pv = DF().pv;
    if ((run.salle - 1) % 5 === 0 && run.reliques) run.reliques = [];
    Save.write();
    this.p = creerJoueur(DF().pv);
    this.entrerSalle();
    this.annonce('Boss passé', '#9a94ad', 1.4);
  },
  abandonner() { this.relancer(); }
};

// ---------- Défis du jour et de la semaine ----------
const MUTATEURS = {
  verre: { nom: 'Corps de verre', ico: '🥚', desc: 'Tu n\'as que 60 points de vie.' },
  frenesie: { nom: 'Frénésie', ico: '⚡', desc: 'Les boss attaquent 20 % plus vite.' },
  nuit: { nom: 'Nuit noire', ico: '🌑', desc: 'Toutes les arènes sont plongées dans les ténèbres.' },
  patinoire: { nom: 'Patinoire', ico: '❄', desc: 'Toutes les arènes sont gelées.' },
  energie: { nom: 'Énergie infinie', ico: '🔋', desc: 'Les attaques spéciales ne coûtent rien.' },
  colosses: { nom: 'Colosses', ico: '🗿', desc: 'Boss 40 % plus résistants, mais tes armes frappent 25 % plus fort.' },
  reflexes: { nom: 'Réflexes', ico: '💨', desc: 'Talents rechargés deux fois plus vite.' },
  jeune: { nom: 'Jeûne', ico: '🚫', desc: 'Aucun soin entre les boss.' },
  chaos: { nom: 'Chaos', ico: '🌀', desc: 'Chaque boss a deux mutations de plus.' },
  vitesse: { nom: 'Pas de géant', ico: '👟', desc: 'Tu cours 25 % plus vite, les boss aussi.' }
};
function cleJour(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function cleSemaine(d) {
  d = d || new Date();
  const u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), n = (u.getUTCDay() + 6) % 7;
  u.setUTCDate(u.getUTCDate() - n + 3);
  const a = new Date(Date.UTC(u.getUTCFullYear(), 0, 4));
  const w = 1 + Math.round(((u - a) / 864e5 - 3 + ((a.getUTCDay() + 6) % 7)) / 7);
  return u.getUTCFullYear() + '-S' + String(w).padStart(2, '0');
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// formats des défis : chacun a son objectif et son score (sens : +1 plus haut = mieux, −1 plus bas = mieux)
const FORMATS = {
  chrono: { nom: 'Contre-la-montre', ico: '⏱', obj: 'Tue les boss le plus vite possible', sens: -1, score: r => r.reussi ? Math.round(r.temps * 10) / 10 : null, fmt: v => fmtTemps(v) },
  survie: { nom: 'Survie', ico: '🛡', obj: 'Le boss est invincible et accélère : tiens le plus longtemps possible', sens: 1, score: r => Math.round(r.temps * 10) / 10, fmt: v => fmtTemps(v), un: true },
  unCoup: { nom: 'Un seul coup', ico: '💀', obj: '1 PV : tue un maximum de boss', sens: 1, score: r => r.tues, fmt: v => v + ' boss' },
  danse: { nom: 'Danse', ico: '💃', obj: 'Sans arme, esquive 90 s en te faisant toucher le moins possible', sens: -1, score: r => r.reussi ? r.coups : null, fmt: v => v + ' coup' + (v > 1 ? 's' : ''), un: true, duree: 90 },
  deluge: { nom: 'Déluge', ico: '💥', obj: '60 s contre un colosse indestructible : un maximum de dégâts', sens: 1, score: r => r.degats, fmt: v => Math.round(v / 100) / 10 + ' k dégâts', un: true, duree: 60 },
  etau: { nom: 'Étau', ico: '🧱', obj: 'L\'arène se resserre sans arrêt : tue les boss au plus vite', sens: -1, score: r => r.reussi ? Math.round(r.temps * 10) / 10 : null, fmt: v => fmtTemps(v) },
  arsenal: { nom: 'Arsenal fou', ico: '🎲', obj: 'Tes armes changent toutes les 15 s : tue les boss au plus vite', sens: -1, score: r => r.reussi ? Math.round(r.temps * 10) / 10 : null, fmt: v => fmtTemps(v) },
  geant: { nom: 'Géant', ico: '🗿', obj: 'Un seul méga boss à 4 phases : le plus vite possible', sens: -1, score: r => r.reussi ? Math.round(r.temps * 10) / 10 : null, fmt: v => fmtTemps(v), un: true },
  abysses: { nom: 'Abysses', ico: '🌌', obj: 'Sans fin : chaque boss est plus fou, une seule vie', sens: 1, score: r => r.tues, fmt: v => 'profondeur ' + v }
};
function defiCourant(type) {
  const cle = type === 'jour' ? cleJour() : cleSemaine(), r = RNG(hashStr('colosses-' + type + '-' + cle));
  const format = type === 'jour' ? r.pick(['chrono', 'survie', 'unCoup', 'danse', 'deluge', 'etau', 'arsenal']) : r.pick(['chrono', 'unCoup', 'geant', 'survie', 'etau', 'arsenal']);
  const F = FORMATS[format];
  let salles = type === 'jour' ? [6, 10, 14] : [8, 12, 16, 20, 24];
  if (F.un) salles = [type === 'jour' ? 10 : 18];
  if (format === 'geant') salles = [type === 'jour' ? 15 : 25];
  if (format === 'unCoup') salles = Array.from({ length: 15 }, (_, i) => 4 + i * 2);
  const mut = r.shuffle(Object.keys(MUTATEURS).filter(m => !(format === 'unCoup' && m === 'verre'))).slice(0, type === 'jour' ? 1 : 2);
  const boss = salles.map(s => ({ salle: s, seed: r.int(1, 2000000000), mega: format === 'geant' || (s % 5 === 0 && !F.un), ars: { p: r.pick(PRIM).id, s: r.pick(SPEC).id, t: r.pick(TAL).id } }));
  return { type, cle, mut, boss, format };
}

function creerJoueur(pv) {
  return {
    x: CX, y: AR.y + AR.h * .82, vx: 0, vy: 0, r: 13, hr: 6, hp: pv || 100, hpMax: DF().pv, iframe: 0, aim: -Math.PI / 2,
    energie: ST.eMax * .5, prim: { cd: 0 }, spec: { cd: 0 }, tal: { charges: ST.tCharges, cd: 0 }, dash: null, lent: 1,
    miroir: 0, parade: 0, bouclier: 0, fantome: 0, vite: 0, rouge: 0, saut: 0, sautMax: 1, sprint: 0, ancre: null
  };
}

// ---------- Mise à jour du joueur ----------
function majJoueur(dt) {
  const p = G.p;
  const prim = trouveArme('p', G.ars.p), spec = trouveArme('s', G.ars.s), tal = trouveArme('t', G.ars.t);
  p.aim = ang(p.x, p.y, G.mx, G.my);
  for (const k of ['iframe', 'miroir', 'parade', 'bouclier', 'fantome', 'vite', 'rouge', 'sprint', 'contre', 'bulle']) if (p[k] > 0) p[k] -= dt;
  if (p.ancre) { p.ancre.t -= dt; if (p.ancre.t <= 0) p.ancre = null; }
  if (p.invis > 0) p.invis -= dt;
  p.hist = p.hist || []; p.hist.push({ x: p.x, y: p.y }); if (p.hist.length > 60) p.hist.shift();
  if (p.saut > 0) {
    p.saut -= dt;
    if (p.saut <= 0 && p.sautDoux) p.sautDoux = false;
    else if (p.saut <= 0) {
      const r = 95;
      for (const tg of G.cibles()) if (Math.sqrt(d2(p.x, p.y, tg.x, tg.y)) - tg.r < r) G.frappe(tg, 70 * ST.pDmg, { x: tg.x, y: tg.y });
      for (const e of G.eb) if (d2(p.x, p.y, e.x, e.y) < r * r) e.dead = true;
      G.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 10, r1: r, t: 0, dur: .25, col: '#9ff' }); G.secoue(4); Son.play('choc');
    }
  }
  p.energie = Math.min(ST.eMax, p.energie + 4 * ST.eGain * dt);
  p.marche = (p.marche || 0) + Math.hypot(p.vx, p.vy) * dt * .07;
  p.lent = 1;
  const actif = G.etat === 'combat';
  const sansArmes = G.format() === 'danse';
  const K = TOUCHES();
  const held = actif && !sansArmes && (Input.down(K.tir) || (G.opts.auto && !prim.manuel)) && p.fantome <= 0;
  prim.tick(p.prim, p, dt, held);
  if (p.spec.cd > 0) p.spec.cd -= dt;
  if (actif && !sansArmes && (Input.hit(K.spec) || Input.hit(K.spec2))) {
    const cout = spec.cout * ST.sCout;
    if (p.fantome > 0) { }
    else if (p.spec.cd > 0) { Son.play('vide'); }
    else if (p.energie < cout) { Son.play('vide'); G.texte(p.x, p.y - 28, 'énergie', '#5aa8ff', 13); }
    else { p.energie -= cout; p.spec.cd = spec.rech * ST.sRech; spec.use(p); G.sal.spec++; Son.play('special'); G.lumiere(p.x, p.y, 220, '#9cf', .25); }
  }
  const T = p.tal, maxC = ST.tCharges;
  if (T.charges < maxC) { T.cd -= dt; if (T.cd <= 0) { T.charges++; T.cd = T.charges < maxC ? tal.rech * ST.tRech : 0; } }
  if (Input.hit(K.tal) || Input.hit(K.tal2)) {
    if (T.charges > 0 && !p.dash) {
      const avant = T.charges === maxC;
      T.charges--;
      const res = tal.use(p); G.sal.tal++;
      if (res === 'gratuit') T.charges++;
      else if (avant) T.cd = tal.rech * ST.tRech;
    } else Son.play('vide');
  }
  if (p.saut <= 0) for (const h of G.hz) if (h.kind === 'ronce' && HZ.ronce.actif(h, p)) p.lent = Math.min(p.lent, .5);
  if (G.rel('regen')) { G.sal.regen += dt; if (G.sal.regen >= 3) { G.sal.regen -= 3; p.hp = Math.min(p.hpMax, p.hp + 1); } }
  let sp = 270 * (p.bulle > 0 ? .2 : 1) * (G.mut('vitesse') ? 1.25 : 1) * (G.rel('plumes') ? 1.12 : 1) * (G.rel('aimant') ? .88 : 1) * p.lent * (p.fantome > 0 ? 1.35 : 1) * (p.vite > 0 ? 1.3 : 1) * (p.sprint > 0 ? 1.6 : 1);
  if (p.dash) {
    const d = p.dash; d.t += dt;
    p.x += d.vx * dt; p.y += d.vy * dt;
    if (d.roule && R() < .5) G.fx.push({ kind: 'fantome', x: p.x, y: p.y, t: 0, dur: .15 });
    if (d.parfait && !d.reussi) for (const e of G.eb) if (d2(e.x, e.y, p.x, p.y) < (e.r + 34) ** 2) { d.reussi = true; G.ralenti = 1.2; p.energie = Math.min(ST.eMax, p.energie + 20); G.texte(p.x, p.y - 28, 'PARFAIT', '#9ff', 18); Son.play('parade'); break; }
    if (d.t >= d.dur) { if (d.grappin) { p.x = d.grappin.x; p.y = d.grappin.y; } p.dash = null; p.vx = d.vx * .15; p.vy = d.vy * .15; }
  } else {
    let mx = 0, my = 0;
    if (Input.down(K.haut) || Input.down('ArrowUp')) my--;
    if (Input.down(K.bas) || Input.down('ArrowDown')) my++;
    if (Input.down(K.gauche) || Input.down('ArrowLeft')) mx--;
    if (Input.down(K.droite) || Input.down('ArrowRight')) mx++;
    const l = Math.hypot(mx, my) || 1;
    let glisse = Arene.glace;
    for (const h of G.hz) if (h.kind === 'givre' && HZ.givre.actif(h, p)) glisse = true;
    const tvx = mx / l * sp, tvy = my / l * sp, k = glisse ? 2.2 : 16;
    p.vx += (tvx - p.vx) * Math.min(1, k * dt); p.vy += (tvy - p.vy) * Math.min(1, k * dt);
    p.x += p.vx * dt; p.y += p.vy * dt;
    if ((mx || my) && R() < dt * 25) G.parts.push({ x: p.x - mx / l * 10, y: p.y - my / l * 10, vx: -mx / l * 60 + R.range(-20, 20), vy: -my / l * 60 + R.range(-20, 20), life: .3, max: .3, col: '#34d6ff', r: 1.6, add: true });
  }
  if (G.aspiration && p.saut <= 0) { const a = G.aspiration, aa = ang(p.x, p.y, a.x, a.y); p.x += Math.cos(aa) * a.f * dt; p.y += Math.sin(aa) * a.f * dt; }
  if (Arene.vent) { p.x += Math.cos(Arene.vent.a) * Arene.vent.f * dt; p.y += Math.sin(Arene.vent.a) * Arene.vent.f * dt; }
  Arene.contenir(p, p.r); Arene.sortirPiliers(p, p.r); Arene.contenir(p, p.r);
  if (p.saut <= 0) {
    for (const l of Arene.lave) if (d2(p.x, p.y, l.x, l.y) < (l.r - 4) ** 2) G.blesser(DMG(.6), 'lave');
    for (const h of G.hz) if ((h.kind === 'flaque' || h.kind === 'lave') && HZ[h.kind].hit(h, p)) G.blesser(h.dmg, h.src);
  }
}

// ---------- Tirs du joueur ----------
function exploserTir(b) {
  const B = b.boom, mf = b.spec ? {} : modForge();
  if (mf.zone) B.r *= mf.zone;
  if (mf.grappe) for (let i = 0; i < 3; i++) { const a = R() * TAU; G.allies.push({ kind: 'meteore', petit: true, prim: true, x: b.x + Math.cos(a) * 60, y: b.y + Math.sin(a) * 60, t: -.1 - i * .08, dur: .15, r: 42, dmg: B.dmg * .3 }); }
  G.explo(b.x, b.y, B.r, b.col); Son.play('explo'); G.secoue(3);
  for (const tg of G.cibles()) if (Math.sqrt(d2(b.x, b.y, tg.x, tg.y)) - tg.r < B.r) G.frappe(tg, B.dmg, { prim: !b.spec, spec: b.spec, x: tg.x, y: tg.y });
  b.dead = true;
}
function majTirsJoueur(dt) {
  const cibles = G.cibles(), bo = G.boss;
  for (const b of G.pb) {
    if (b.dead) continue;
    if (b.delai > 0) { b.delai -= dt; b.x = G.p.x; b.y = G.p.y; continue; }
    b.t += dt;
    if (b.up) b.up(b, dt);
    if (b.accel) { const s = Math.hypot(b.vx, b.vy), ns = Math.min(1300, s + b.accel * dt); b.vx *= ns / s; b.vy *= ns / s; }
    if (b.hom && cibles.length) {
      let best = null, bd = Infinity;
      for (const tg of cibles) { const q = d2(b.x, b.y, tg.x, tg.y); if (q < bd) { bd = q; best = tg; } }
      const want = ang(b.x, b.y, best.x, best.y), cur = Math.atan2(b.vy, b.vx), s = Math.hypot(b.vx, b.vy);
      const na = cur + clamp(angDiff(cur, want), -b.hom * dt, b.hom * dt), ns = b.kind === 'missile' ? Math.min(900, s + 900 * dt) : s;
      b.vx = Math.cos(na) * ns; b.vy = Math.sin(na) * ns;
    }
    if (b.grow) b.r += b.grow * dt;
    if (b.angv) { const c = Math.cos(b.angv * dt), s = Math.sin(b.angv * dt), vx = b.vx; b.vx = vx * c - b.vy * s; b.vy = vx * s + b.vy * c; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) { if (b.boom && (b.boom.finVie || b.kind === 'roquette')) exploserTir(b); if (b.ronce) G.allies.push({ kind: 'roncier', x: b.x, y: b.y, r: 70, t: 0, dur: 4, dps: 42 * ST.pDmg }); b.dead = true; continue; }
    if (!Arene.dedans(b.x, b.y, 0) || Arene.pilierTouche(b.x, b.y, 2)) {
      if (b.kind === 'boom' && !b.retour) { b.retour = true; b.hits.clear(); }
      else if (b.reb > 0) {
        b.reb--; b.hits.clear(); if (b.bonusReb) b.dmg *= b.bonusReb;
        if (b.glaive) { const t = plusProche(b.x, b.y); if (t) { const a = ang(b.x, b.y, t.x, t.y), s = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; } }
        if (Arene.kind === 'cercle') { const a = ang(CX, CY, b.x, b.y), nx = Math.cos(a), ny = Math.sin(a), dt2 = b.vx * nx + b.vy * ny; b.vx -= 2 * dt2 * nx; b.vy -= 2 * dt2 * ny; }
        else { const bb = Arene.bb(); if (b.x < bb.x || b.x > bb.x + bb.w) b.vx = -b.vx; if (b.y < bb.y || b.y > bb.y + bb.h) b.vy = -b.vy; }
        Arene.contenir(b, 1); G.etincelle(b.x, b.y, b.col, 3);
      }
      else if (b.kind !== 'boom') { if (b.boom) exploserTir(b); b.dead = true; G.etincelle(b.x, b.y, b.col, 2); continue; }
    }
    if (bo && !bo.mort && bo.esp.bloque && b.kind !== 'flamme' && bo.esp.bloque(bo, b.x, b.y, b.r)) { G.etincelle(b.x, b.y, '#bfe0ff', 3); if (b.boom) exploserTir(b); b.dead = true; continue; }
    for (const tg of cibles) {
      const vrai = tg.proxy || tg;
      if (b.hits.has(vrai) || vrai.dead) continue;
      if (d2(b.x, b.y, tg.x, tg.y) < (b.r + tg.r) ** 2) {
        if (vrai === bo && bouclierBoss(bo)) { b.hits.add(vrai); G.etincelle(b.x, b.y, '#7fd8ff', 2); if (G.protegeT <= 0) { G.texte(bo.x, bo.y - bo.r - 14, 'Protégé', '#7fd8ff', 14); G.protegeT = .6; } continue; }
        if (vrai === bo && bo.miroir > 0 && !b.spec) {
          b.dead = true;
          EB(b.x, b.y, ang(b.x, b.y, G.p.x, G.p.y), 380, { dmg: DMG(.6), r: 5, col: '#ffffff' });
          break;
        }
        if (b.boom && b.kind === 'roquette') { exploserTir(b); break; }
        G.frappe(tg, b.dmg, { prim: !b.spec, spec: b.spec, x: b.x, y: b.y, critB: b.crit });
        b.hits.add(vrai);
        if (b.aig) {
          vrai.aig = (vrai.aig || 0) + 1;
          if (vrai.aig >= 15) { vrai.aig = 0; G.frappe(tg, 95 * ST.pDmg, { prim: true, x: tg.x, y: tg.y }); G.explo(tg.x, tg.y, 60, '#c8ffd0'); Son.play('explo'); }
        }
        if (b.stun && vrai === bo && !bo.mort) G.etourdir(bo, b.stun, 'Paralysé !');
        if (b.eclat && !b.fils) { const a = Math.atan2(b.vy, b.vx); for (const s of [-.6, .6]) { const x = pShot(b.x, b.y, a + s, 700, { dmg: b.dmg * .3 / ST.pDmg, r: 3, life: .4, col: b.col }); x.fils = true; x.hits.add(vrai); } }
        if (b.froid) vrai.froid = Math.min(1, (vrai.froid || 0) + .025);
        if (b.harpon) { vrai.harpon = 2.5; G.texte(tg.x, tg.y - 30, 'Harponné', '#c0c8d4', 14); }
        if (b.ronce) { G.allies.push({ kind: 'roncier', x: b.x, y: b.y, r: 70, t: 0, dur: 4, dps: 42 * ST.pDmg }); b.ronce = false; }
        if (b.prisme) { b.prisme = false; const a = Math.atan2(b.vy, b.vx); for (const s of [-.35, 0, .35]) { const x = pShot(b.x, b.y, a + s, 900, { dmg: 12, r: 4, life: .5, col: '#fff2b0', kind: 'trait' }); x.hits.add(vrai); } }
        if (b.kind !== 'flamme') G.etincelle(b.x, b.y, b.col, 3);
        if (b.pierce > 0) b.pierce--; else { b.dead = true; break; }
      }
    }
    if (b.dead) continue;
    for (const e of G.eb) {
      if (e.hp > 0 && !e.dead && d2(b.x, b.y, e.x, e.y) < (b.r + e.r) ** 2) {
        e.hp -= b.dmg; G.etincelle(e.x, e.y, e.col, 2);
        if (e.hp <= 0) { e.dead = true; e.boom = 0; G.etincelle(e.x, e.y, '#fff', 6); }
        if (b.cassable) { b.dead = true; break; }
      }
    }
  }
}

// ---------- Tirs ennemis ----------
function majTirsEnnemis(dt) {
  const p = G.p, t = cible(), bo = G.boss;
  if (G.gelT > 0) G.gelT -= dt;
  for (const e of G.eb) {
    if (e.dead) continue;
    if (e.gel > 0) { e.gel -= dt; }
    else if (e.delai > 0) { e.delai -= dt; }
    else if (e.orb) {
      const o = e.orb;
      if (!o.c || o.c.mort) { e.dead = true; continue; }
      e.t += dt; o.a += o.av * dt; o.r += o.dr * dt;
      e.x = o.c.x + Math.cos(o.a) * o.r; e.y = o.c.y + Math.sin(o.a) * o.r;
      e.life -= dt;
      if (e.life <= 0 || o.r > 1300) { e.dead = true; continue; }
    } else {
      e.t += dt;
      if (e.hom && e.t < 4.5) {
        const cur = Math.atan2(e.vy, e.vx), s = Math.hypot(e.vx, e.vy), na = cur + clamp(angDiff(cur, ang(e.x, e.y, t.x, t.y)), -e.hom * dt, e.hom * dt);
        e.vx = Math.cos(na) * s; e.vy = Math.sin(na) * s;
      }
      if (e.angv) { const c = Math.cos(e.angv * dt), s = Math.sin(e.angv * dt), vx = e.vx; e.vx = vx * c - e.vy * s; e.vy = vx * s + e.vy * c; }
      if (e.acc) { const s = Math.hypot(e.vx, e.vy), ns = Math.max(e.vmin, s + e.acc * dt); if (s > 0) { e.vx *= ns / s; e.vy *= ns / s; } }
      if (e.ond) { const s = Math.hypot(e.vx, e.vy), a = e.ond.base + e.ond.amp * Math.sin(e.ond.f * e.t + e.ond.ph); e.vx = Math.cos(a) * s; e.vy = Math.sin(a) * s; }
      if (e.stop) {
        const st = e.stop;
        if (!st.arret && e.t >= st.t) { st.arret = true; st.vx = e.vx; e.vx = e.vy = 0; }
        if (st.arret && !st.parti && e.t >= st.t + st.d) { st.parti = true; const a = ang(e.x, e.y, t.x, t.y); e.vx = Math.cos(a) * st.spd; e.vy = Math.sin(a) * st.spd; }
      }
      if (e.retour) {
        const rt = e.retour; rt.parc = (rt.parc || 0) + Math.hypot(e.vx, e.vy) * dt;
        if (rt.parc > rt.d && bo && !bo.mort) { const a = ang(e.x, e.y, bo.x, bo.y); e.vx = Math.cos(a) * rt.s * 1.1; e.vy = Math.sin(a) * rt.s * 1.1; if (d2(e.x, e.y, bo.x, bo.y) < bo.r * bo.r) e.dead = true; }
      }
      if (e.tir) { e.tir.cd -= dt; if (e.tir.cd <= 0) { e.tir.cd = e.tir.per; EB(e.x, e.y, ang(e.x, e.y, t.x, t.y), e.tir.spd, { r: 6, src: e.src }); } }
      const fr = G.rel('aimant') && d2(e.x, e.y, p.x, p.y) < 130 * 130 ? .65 : 1;
      e.x += e.vx * dt * fr; e.y += e.vy * dt * fr;
      e.life -= dt;
      if (e.life <= 0) { if (e.boom) zoneC(e.x, e.y, e.boom, .28, { dmg: DMG(1.2), src: e.src }); e.dead = true; continue; }
      if (e.boom && p.hp > 0 && d2(e.x, e.y, p.x, p.y) < 50 * 50) { zoneC(e.x, e.y, e.boom, .28, { dmg: DMG(1.2), src: e.src }); e.dead = true; continue; }
      if (e.split && e.t >= e.split.t) { e.dead = true; anneauTirs(e.x, e.y, e.split.n, R() * TAU, e.split.spd, { r: 6, col: e.col }); G.etincelle(e.x, e.y, e.col, 8); Son.play('explo'); continue; }
      const inside = Arene.dedans(e.x, e.y, e.r * .5);
      if (!e.dedans) { if (inside) e.dedans = true; else if (e.t > 6) e.dead = true; }
      else if (!inside && !e.retour) {
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
    if (p.hp > 0 && p.saut <= 0 && d2(e.x, e.y, p.x, p.y) < (e.r * .85 + p.hr) ** 2) {
      if (p.miroir > 0 && bo && !bo.mort) {
        e.dead = true;
        pShot(e.x, e.y, ang(e.x, e.y, bo.x, bo.y), 700, { dmg: 30, r: 5, life: 2, spec: true, col: '#fff', noVel: true });
        continue;
      }
      if (p.iframe <= 0 && p.fantome <= 0) { G.blesser(e.dmg, e.src); e.dead = true; }
    }
  }
}

// ---------- Effets alliés (spéciales, grenades…) ----------
function plusProche(x, y) { let best = null, bd = Infinity; for (const tg of G.cibles()) { const q = d2(x, y, tg.x, tg.y); if (q < bd) { bd = q; best = tg; } } return best; }
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
          a.dead = true; G.explo(a.x, a.y, a.r, a.petit ? '#9cf' : '#ffd27f'); Son.play(a.petit ? 'explo' : 'gros'); G.secoue(a.petit ? 2 : 10); G.marque(a.x, a.y, a.r * .7);
          for (const tg of G.cibles()) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < a.r) G.frappe(tg, a.dmg, a.prim ? { prim: true, x: tg.x, y: tg.y } : { spec: true, x: tg.x, y: tg.y });
          if (a.efface) for (const e of G.eb) if (d2(a.x, a.y, e.x, e.y) < a.r * a.r) e.dead = true;
        }
        break;
      case 'echoFrappe':
        if (a.t >= a.dur) {
          a.dead = true; G.explo(a.x, a.y, a.r, '#c77aff'); Son.play('explo'); G.secoue(4); G.marque(a.x, a.y, a.r * .6);
          for (const tg of G.cibles()) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < a.r) G.frappe(tg, a.dmg, { prim: true, x: tg.x, y: tg.y });
        }
        break;
      case 'trampo':
        a.pret -= dt;
        if (a.pret <= 0 && p.saut <= 0 && !p.dash && d2(a.x, a.y, p.x, p.y) < 26 * 26) {
          a.pret = .8;
          const an = ang(p.x, p.y, G.mx, G.my), L = Math.min(320 * ST.tPort, Math.hypot(G.mx - p.x, G.my - p.y));
          p.saut = .6; p.sautMax = .6; p.iframe = Math.max(p.iframe, .65 + ST.tIntan);
          p.dash = { t: 0, dur: .6, vx: Math.cos(an) * L / .6, vy: Math.sin(an) * L / .6 };
          Son.play('dash'); G.fx.push({ kind: 'anneau', x: a.x, y: a.y, r0: 10, r1: 50, t: 0, dur: .3, col: '#7dffb0' });
        }
        if (a.t >= a.dur) a.dead = true;
        break;
      case 'retarde': if (a.t >= a.dur) { a.dead = true; a.f(); } break;
      case 'roncier':
        for (const tg of G.cibles()) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < a.r) G.frappe(tg, a.dps * dt, { prim: true, continu: true, x: tg.x, y: tg.y });
        if (a.t >= a.dur) a.dead = true; break;
      case 'chakram': {
        const k = a.t / a.dur, an = a.t * 12;
        if (k < .3) { a.x = lerp(p.x, a.tx, k / .3); a.y = lerp(p.y, a.ty, k / .3); }
        else if (k < .75) { a.x = a.tx + Math.cos(an) * 22; a.y = a.ty + Math.sin(an) * 22; }
        else { const u = (k - .75) / .25; a.x = lerp(a.tx, p.x, u); a.y = lerp(a.ty, p.y, u); }
        for (const tg of G.cibles()) if (d2(a.x, a.y, tg.x, tg.y) < (16 + tg.r) ** 2) { const id = tg.proxy || tg; if (!a.hitcd.get(id) || a.hitcd.get(id) < G.t) { a.hitcd.set(id, G.t + .18); G.frappe(tg, a.dmg, { prim: true, x: a.x, y: a.y }); } }
        if (a.t >= a.dur) a.dead = true; break;
      }
      case 'blizzard':
        for (const e of G.eb) if (d2(a.x, a.y, e.x, e.y) < a.r * a.r) { e.x -= e.vx * dt * .65; e.y -= e.vy * dt * .65; }
        for (const tg of G.cibles()) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < a.r) { G.frappe(tg, a.dps * dt, { spec: true, continu: true, x: tg.x, y: tg.y }); (tg.proxy || tg).froid = Math.min(1, ((tg.proxy || tg).froid || 0) + dt * .3); }
        if (R() < .6) G.parts.push({ x: a.x + R.range(-a.r, a.r), y: a.y + R.range(-a.r, a.r), vx: 40, vy: 90, life: .6, max: .6, col: '#e8f6ff', r: 2 });
        if (a.t >= a.dur) a.dead = true; break;
      case 'colonne':
        for (const e of G.eb) if (d2(a.x, a.y, e.x, e.y) < (a.r + e.r) ** 2) { e.dead = true; G.etincelle(e.x, e.y, '#ffb347', 2); }
        for (const tg of G.cibles()) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < a.r) G.frappe(tg, a.dps * dt, { spec: true, continu: true, x: tg.x, y: tg.y });
        if (R() < .8) G.parts.push({ x: a.x + R.range(-a.r, a.r) * .6, y: a.y, vx: R.range(-20, 20), vy: -R.range(80, 160), life: .6, max: .6, col: '#ffb347', r: 3, add: true });
        G.lumiere(a.x, a.y, 200, '#ff8a3c', .05);
        if (a.t >= a.dur) a.dead = true; break;
      case 'ombre': {
        const t = plusProche(a.x, a.y);
        if (t) { const an = ang(a.x, a.y, t.x, t.y); a.a += clamp(angDiff(a.a, an), -6 * dt, 6 * dt); }
        a.x += Math.cos(a.a) * 520 * dt; a.y += Math.sin(a.a) * 520 * dt;
        if ((t && Math.sqrt(d2(a.x, a.y, t.x, t.y)) < t.r + 12) || a.t >= a.dur) {
          a.dead = true; G.explo(a.x, a.y, 70, '#a070ff'); Son.play('explo');
          for (const tg of G.cibles()) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < 70) G.frappe(tg, a.dmg, { spec: true, x: tg.x, y: tg.y });
        }
        break;
      }
      case 'tourelle': {
        a.cd -= dt;
        const best = plusProche(a.x, a.y);
        if (best) { a.a = ang(a.x, a.y, best.x, best.y); if (a.cd <= 0) { a.cd = .2; pShot(a.x + Math.cos(a.a) * 14, a.y + Math.sin(a.a) * 14, a.a, 820, { dmg: 14, r: 4, life: 1.2, spec: true, col: '#9cf', noVel: true }); } }
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
        G.secoue(2); G.lumiere(ex, ey, 160, '#bdf', .05);
        if (a.t >= a.dur) a.dead = true;
        break;
      }
      case 'lames': {
        a.a += 5.5 * dt;
        for (let i = 0; i < a.n; i++) {
          const aa = a.a + i * TAU / a.n, bx = p.x + Math.cos(aa) * a.rad, by = p.y + Math.sin(aa) * a.rad;
          for (const tg of G.cibles()) {
            if (d2(bx, by, tg.x, tg.y) < (16 + tg.r) ** 2) {
              const k = (tg.proxy || tg) === G.boss ? 'b' + i : tg;
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
        for (const m of G.minions) if (!m.fixe && d2(a.x, a.y, m.x, m.y) < a.r * a.r) { const aa = ang(m.x, m.y, a.x, a.y); m.x += Math.cos(aa) * 140 * dt; m.y += Math.sin(aa) * 140 * dt; }
        for (const tg of G.cibles()) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < a.r * .7) G.frappe(tg, a.dps * dt, { spec: true, continu: true, x: tg.x, y: tg.y });
        if (a.t >= a.dur) a.dead = true;
        break;
      }
      case 'clones': {
        a.cd -= dt;
        const per = p.aim + Math.PI / 2;
        a.pos = [-1, 1].map(s => ({ x: p.x + Math.cos(per) * 55 * s - Math.cos(p.aim) * 20, y: p.y + Math.sin(per) * 55 * s - Math.sin(p.aim) * 20 }));
        if (a.cd <= 0) { a.cd = .16; for (const c of a.pos) pShot(c.x, c.y, ang(c.x, c.y, G.mx, G.my), 900, { dmg: 11, r: 4, life: 1.1, spec: true, col: '#b0f0ff', noVel: true }); }
        if (a.t >= a.dur) a.dead = true;
        break;
      }
      case 'lameCiel':
        if (!a.vise) { a.vise = true; const tg = plusProche(G.mx, G.my); const q = tg || { x: G.mx, y: G.my }; a.x = q.x + R.range(-20, 20); a.y = q.y + R.range(-20, 20); }
        if (a.t >= a.dur) {
          a.dead = true; G.explo(a.x, a.y, a.r, '#cfe8ff'); Son.play('epee');
          for (const tg of G.cibles()) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < a.r) G.frappe(tg, a.dmg, { spec: true, x: tg.x, y: tg.y });
        }
        break;
      case 'satellite': {
        const dd = Math.hypot(G.mx - a.x, G.my - a.y), s = Math.min(dd, 330 * dt);
        if (dd > 1) { a.x += (G.mx - a.x) / dd * s; a.y += (G.my - a.y) / dd * s; }
        for (const tg of G.cibles()) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < a.r) G.frappe(tg, a.dps * dt, { spec: true, continu: true, x: tg.x, y: tg.y });
        G.lumiere(a.x, a.y, 150, '#ffe9a0', .05);
        if (a.t >= a.dur) a.dead = true;
        break;
      }
      case 'mur': {
        const x1 = a.x + Math.cos(a.a) * a.L / 2, y1 = a.y + Math.sin(a.a) * a.L / 2, x2 = a.x - Math.cos(a.a) * a.L / 2, y2 = a.y - Math.sin(a.a) * a.L / 2;
        for (const e of G.eb) if (segD2(e.x, e.y, x1, y1, x2, y2) < (e.r + 7) ** 2) { e.dead = true; G.etincelle(e.x, e.y, '#9cf', 2); }
        if (a.t >= a.dur) a.dead = true;
        break;
      }
      case 'supernova':
        p.lent = Math.min(p.lent, .3);
        if (a.t >= a.dur) {
          a.dead = true;
          for (const tg of G.cibles()) if (Math.sqrt(d2(p.x, p.y, tg.x, tg.y)) - tg.r < a.r) G.frappe(tg, a.dmg, { spec: true, x: tg.x, y: tg.y });
          for (const e of G.eb) if (d2(p.x, p.y, e.x, e.y) < a.r * a.r) e.dead = true;
          G.explo(p.x, p.y, a.r, '#fff2b0'); G.flash = .5; G.gel = .1; G.secoue(20); Son.play('gros');
        }
        break;
      case 'trainee':
        for (const tg of G.cibles()) if (segD2(tg.x, tg.y, a.x1, a.y1, a.x2, a.y2) < (18 + tg.r) ** 2) G.frappe(tg, a.dps * dt, { continu: true, x: tg.x, y: tg.y });
        if (a.t >= a.dur) a.dead = true;
        break;
    }
  }
}

// ---------- Boucle de combat ----------
function majCombat(dt) {
  if (G.gel > 0) { G.gel -= dt; return; }
  if (G.slowT > 0) { G.slowT -= dt; dt *= G.slowF; }
  G.t += dt;
  if (G.ralenti > 0) G.ralenti -= dt;
  G.dtE = dt * (G.ralenti > 0 ? .4 : 1);
  if (G.protegeT > 0) G.protegeT -= dt;
  if (G.flash > 0) G.flash -= dt * 2;
  if (G.fondu > 0) G.fondu -= dt * 1.6;
  if (G.toast) { G.toast.t += dt; if (G.toast.t > G.toast.dur) G.toast = null; }
  const enCombat = G.etat === 'combat', p = G.p;
  if (enCombat) G.chrono += dt;
  Arene.maj(dt);
  if ((enCombat || G.etat === 'interlude') && p.hp > 0) majJoueur(dt);
  const b = G.boss;
  if (b && !b.mort && enCombat) majBoss(b, dt);
  for (const m of G.minions) if (!m.dead && enCombat) majMinion(m, G.dtE);
  majTirsJoueur(dt);
  majTirsEnnemis(G.dtE);
  for (const h of G.hz) {
    if (G.arretHz <= 0) HZ[h.kind].up(h, G.dtE);
    if (enCombat && p.hp > 0 && p.saut <= 0 && h.kind !== 'flaque' && h.kind !== 'lave' && HZ[h.kind].hit(h, p)) { if (G.blesser(h.dmg, h.src) && !HZ[h.kind].continu) h.touche = true; }
  }
  majAllies(dt);
  // contacts
  if (enCombat && p.hp > 0 && p.saut <= 0 && b && !b.mort && !b.air && b.alpha > .5 && b.spectral <= 0 && b.trans <= 0 && b.intro <= 0) {
    if (d2(b.x, b.y, p.x, p.y) < (b.r * .85 + p.hr) ** 2 || (b.esp.contact && b.esp.contact(b, p))) {
      if (G.blesser(DMG(b.charge ? 1.4 : 1), b.charge ? (b.main ? b.main.id : 'contact') : 'contact')) { const a = ang(b.x, b.y, p.x, p.y); p.vx += Math.cos(a) * 500; p.vy += Math.sin(a) * 500; }
    }
  }
  if (enCombat && p.hp > 0 && p.saut <= 0) for (const m of G.minions) if (!m.dead && m.spawn <= 0 && m.type === 'larve' && d2(m.x, m.y, p.x, p.y) < (m.r + p.hr) ** 2) G.blesser(DMG(.7), 'invocation');
  // vie basse : battement de cœur
  if (enCombat && p.hp > 0 && p.hp < p.hpMax * .3) { G.coeurT -= dt; if (G.coeurT <= 0) { G.coeurT = .85; Son.play('coeur'); } }
  // butin et portail
  if (G.etat === 'interlude') {
    G.interT += dt;
    if (G.interT > 1.1 && !G.butinPose) { G.butinPose = true; G.poserButin(); }
    for (const l of G.loot) { l.t += dt; if (l.t > .4 && !l.dead && d2(l.x, l.y, p.x, p.y) < 36 * 36) G.ramasser(l); }
    G.loot = G.loot.filter(l => !l.dead);
    if (G.portail) {
      const po = G.portail; po.t += dt;
      if (po.t > 6) { const a = ang(p.x, p.y, po.x, po.y); p.x += Math.cos(a) * 200 * dt; p.y += Math.sin(a) * 200 * dt; }
      if (po.t > .6 && d2(p.x, p.y, po.x, po.y) < 44 * 44) G.traverserPortail();
    }
    if (G.finDefi && G.interT > 2.8) { G.etat = 'mort'; G.ecranMort = true; Musique.baisser(.3); }
  } else G.butinPose = false;
  // effets
  for (const f of G.fx) f.t += dt;
  for (const l of G.lumieres) l.t += dt;
  for (const q of G.parts) { q.x += q.vx * dt; q.y += q.vy * dt; const fr = q.fumee ? 1.5 : 3; q.vx *= 1 - fr * dt; q.vy *= 1 - fr * dt; if (q.fumee) q.r += dt * 14; q.life -= dt; }
  for (const x of G.textes) { x.t += dt; x.y -= 30 * dt; }
  if (G.leurre) { G.leurre.t -= dt; if (G.leurre.t <= 0) G.leurre = null; }
  if (G.aspiration) { G.aspiration.t -= dt; if (G.aspiration.t <= 0) G.aspiration = null; }
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
  G.shake = Math.max(0, G.shake - dt * 40);
  G.pb = G.pb.filter(x => !x.dead);
  G.eb = G.eb.filter(x => !x.dead);
  G.hz = G.hz.filter(x => !x.dead);
  G.allies = G.allies.filter(x => !x.dead);
  G.minions = G.minions.filter(x => !x.dead);
  G.fx = G.fx.filter(f => f.t < f.dur);
  G.lumieres = G.lumieres.filter(l => l.t < l.dur);
  G.parts = G.parts.filter(q => q.life > 0);
  const maxP = { faible: 250, normale: 900, elevee: 1800 }[G.opts.particules] || 900;
  if (G.parts.length > maxP) G.parts.splice(0, G.parts.length - maxP);
  if (G.arretHz > 0) G.arretHz -= dt;
  if (G.mut('energie')) p.energie = ST.eMax;
  const fmt = G.format();
  if (fmt && enCombat && G.boss && G.boss.intro <= 0) {
    const F = FORMATS[fmt];
    if (F.duree && G.chrono >= F.duree) { G.defi.temps += G.chrono; G.terminerDefi(true); G.etat = 'mort'; G.ecranMort = true; Musique.baisser(.3); }
    if (fmt === 'survie') { G.survieT = (G.survieT || 0) + dt; if (G.survieT > 15) { G.survieT = 0; G.def.D.S = Math.min(2, G.def.D.S * 1.07); G.def.idle *= .92; G.annonce('Le boss accélère !', '#ff8a5c', 1.2); } }
    if (fmt === 'arsenal') { G.arsT = (G.arsT || 0) + dt; if (G.arsT > 15) { G.arsT = 0; G.ars = { p: tirerArme('p', G.ars.p, G.def), s: tirerArme('s', G.ars.s, G.def), t: tirerArme('t', G.ars.t, G.def) }; p.prim = { cd: 0 }; G.toast = { t: 0, dur: 2.5, nouveaux: [false, false, false] }; Son.play('pouvoir'); calcStats(); } }
    if (fmt === 'etau') Arene.insetMax = 230;
  }
  if (G.rel('tempete') && enCombat && b && !b.mort && b.intro <= 0) { G.sal.tempete -= dt; if (G.sal.tempete <= 0) { G.sal.tempete = 6; G.fx.push({ kind: 'eclair', pts: [[b.x + R.range(-30, 30), AR.y], [b.x, b.y]], t: 0, dur: .2 }); G.frappe(b, 150, { x: b.x, y: b.y }); Son.play('tirLourd'); } }
  if (G.succesFile && G.succesFile.length) { G.succesFile[0].t += dt; if (G.succesFile[0].t > 3) G.succesFile.shift(); }
  Decor.maj(dt);
  G.textes = G.textes.filter(x => x.t < x.dur);
  if (G.etat === 'mort' && !G.ecranMort) {
    G.finT -= dt / Math.max(.25, G.slowT > 0 ? G.slowF : 1);
    if (G.finT <= 0) G.ecranMort = true;
  }
}

let dernier = performance.now();
let erreursBoucle = 0;
function boucle(now) {
  // la boucle continue même si une image plante (sinon l'écran restait figé)
  try { pasBoucle(now); } catch (e) { if (erreursBoucle++ < 20) console.error(e); }
  Input.endFrame();
  requestAnimationFrame(boucle);
}
function pasBoucle(now) {
  let dt = Math.max(0, (now - dernier) / 1000); dernier = now;
  G.fps = G.fps ? G.fps * .95 + (dt > 0 ? 1 / dt : 60) * .05 : 60;
  dt = Math.min(dt, 1 / 30);
  if (G.mode === 'normal' || G.mode === 'entrainement') dt *= G.opts.vitesse || 1;
  G.mx = (Input.sx - offX) / scale; G.my = (Input.sy - offY) / scale;
  Musique.maj(dt);
  if ((G.etat === 'combat' || G.etat === 'interlude') && (Input.hit('Escape') || Input.hit(TOUCHES().pause))) UI.pause();
  else if (G.etat === 'combat' || G.etat === 'interlude' || G.etat === 'mort') {
    majCombat(dt);
    if (G.etat === 'mort' && G.ecranMort) {
      if (Input.hit('Space') || Input.hit('Enter') || Input.hit('KeyR')) G.recommencer();
      else if (Input.hit('Escape')) { G.mode = 'normal'; UI.menu(); }
    }
  }
  else if (G.etat === 'passage') {
    G.passage.t += dt;
    if (G.passage.t >= G.passage.dur) G.entrerSalle();
  }
  else if (G.etat === 'pause') { if (UI.capture) UI.clavier(); else if (Input.hit('Escape') || Input.hit(TOUCHES().pause)) UI.reprendre(); else UI.clavier(); }
  else UI.clavier();
  rendu();
}

addEventListener('blur', () => { if (G.opts.autoPause && (G.etat === 'combat' || G.etat === 'interlude')) UI.pause(); });
window.addEventListener('load', () => {
  cv = document.getElementById('jeu'); ctx = cv.getContext('2d');
  majAlerte(); Decor.nouvelleSalle(); appliquerAffichage();
  redim(); addEventListener('resize', redim);
  UI.menu();
  requestAnimationFrame(boucle);
});
