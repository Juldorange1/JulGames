'use strict';
/* Colosses — coop à deux sur le même PC. Le joueur 2 joue à la manette (le joueur 1 au clavier et à la souris, ou
   avec une 2e manette). Il a le même équipement et sa propre vie. Le boss vise l'un puis l'autre et a 50 % de vie
   en plus. Si un joueur tombe, l'autre continue ; la partie n'est perdue que si les deux tombent. Le joueur tombé
   revient quand le boss meurt. Le moteur du joueur 1 est réutilisé tel quel pour le joueur 2 (on échange G.p). */

const Coop = {
  p2: null, k: {}, pp: {}, avant: {}, cibleT: 0, cibleJ: 1, visee: null,
  voulu() { return !!Save.d.opts.coop; },
  manette() { const l = Manette.liste(); return l.length ? l[l.length - 1] : null; },
  actif() { return this.voulu() && G.mode !== 'entrainement' && !!this.manette(); },
  vivants() { const l = []; if (G.p && G.p.hp > 0) l.push(G.p); if (this.p2 && this.p2.hp > 0 && !this.p2.ko) l.push(this.p2); return l; },
  // touches virtuelles du joueur 2, lues sur sa manette (mêmes codes que les touches réglées)
  lire() {
    const g = this.manette(); if (!g || !this.p2) return;
    const K = TOUCHES(), ax = g.axes, B = i => Manette.bouton(g, i);
    const lx = Math.abs(ax[0]) > .3 ? ax[0] : 0, ly = Math.abs(ax[1]) > .3 ? ax[1] : 0, rx = ax[2] || 0, ry = ax[3] || 0;
    const set = (c, v) => { if (!c) return; if (v && !this.k[c]) this.pp[c] = true; this.k[c] = v; };
    set(K.gauche, lx < -.3 || B(14)); set(K.droite, lx > .3 || B(15)); set(K.haut, ly < -.3 || B(12)); set(K.bas, ly > .3 || B(13));
    const C = MANETTE_CFG(), A = act => (C[act] || []).some(i => B(i));
    set(K.tir, A('tir')); set(K.spec, A('spec')); set(K.tal, A('tal'));
    if (Math.hypot(rx, ry) > .35) { const voulu = Math.atan2(ry, rx), sens = MANETTE_CFG().sens || .5; this.visee = this.visee === null ? voulu : this.visee + clamp(angDiff(this.visee, voulu), -sens * 9 / 60, sens * 9 / 60); } else this.visee = null;
  },
  creerJ2() {
    const p = creerJoueur(DF().pv); p.hp = p.hpMax; p.j2 = true; p.x = CX + 70; p.y = AR.y + AR.h * .82; p.iframe = 1.5;
    p.prim = { cd: 0 }; p.spec = { cd: 0 }; p.tal = { charges: ST.tCharges, cd: 0 };
    this.p2 = p; this.k = {}; this.pp = {};
  },
  // joue un morceau de code « comme si » le joueur 2 était le joueur principal
  enJ2(f) {
    const s = { p: G.p, k: Input.k, pp: Input.p, mx: G.mx, my: G.my, lmb: Input.lmb };
    G.p = this.p2; Input.k = this.k; Input.p = this.pp; Input.lmb = !!this.k[TOUCHES().tir];
    const b = G.boss, p = this.p2;
    if (this.visee !== null) { G.mx = p.x + Math.cos(this.visee) * 240; G.my = p.y + Math.sin(this.visee) * 240; }
    else if (b && !b.mort) { G.mx = b.x; G.my = b.y; } // sans stick droit : il vise le boss tout seul
    try { f(); } finally { G.p = s.p; Input.k = s.k; Input.p = s.pp; G.mx = s.mx; G.my = s.my; Input.lmb = s.lmb; }
  },
  maj(dt) {
    const p2 = this.p2; if (!p2 || !this.actif()) return;
    const enCombat = G.etat === 'combat', b = G.boss;
    this.enJ2(() => {
      if ((enCombat || G.etat === 'interlude') && p2.hp > 0 && !p2.ko) majJoueur(dt);
      if (!enCombat || p2.hp <= 0 || p2.ko || p2.saut > 0) return;
      for (const e of G.eb) if (!e.dead && d2(e.x, e.y, p2.x, p2.y) < ((e.r || 5) * .85 + p2.hr) ** 2 && p2.iframe <= 0 && p2.fantome <= 0) { G.blesser(e.dmg, e.src); e.dead = true; }
      for (const h of G.hz) if (h.kind !== 'flaque' && h.kind !== 'lave' && HZ[h.kind].hit(h, p2)) { if (G.blesser(h.dmg, h.src) && !HZ[h.kind].continu) h.touche = true; }
      if (b && !b.mort && !b.air && b.alpha > .5 && b.spectral <= 0 && b.trans <= 0 && b.intro <= 0 && d2(b.x, b.y, p2.x, p2.y) < (b.r * .85 + p2.hr) ** 2) {
        if (G.blesser(DMG(1), 'contact')) { const a = ang(b.x, b.y, p2.x, p2.y); p2.vx += Math.cos(a) * 500; p2.vy += Math.sin(a) * 500; }
      }
    });
    this.pp = {};
    // le boss change de cible toutes les 3,5 s (toujours un joueur debout)
    this.cibleT -= dt; if (this.cibleT <= 0) { this.cibleT = 3.5; this.cibleJ = this.cibleJ === 1 ? 2 : 1; }
  },
  cible() {
    const v = this.vivants(); if (!v.length) return G.p;
    if (v.length === 1) return v[0];
    return this.cibleJ === 2 ? this.p2 : G.p;
  },
  boutonMenu() {
    const on = this.voulu(), pad = Manette.liste().length;
    return `<button class="pill coop ${on ? 'actif' : ''}" data-a="coop" title="Le joueur 2 joue à la manette (le joueur 1 au clavier et à la souris, ou avec une 2e manette)">👥 Coop à deux : ${on ? 'oui' : 'non'}${on && !pad ? ' · branche une manette' : ''}</button>`;
  }
};

// ---------- branchements ----------
const _entrerCoop = G.entrerSalle;
G.entrerSalle = function () {
  const r = _entrerCoop.apply(this, arguments);
  try {
    if (Coop.actif()) {
      Coop.creerJ2();
      if (this.boss) { this.boss.hpMax = Math.round(this.boss.hpMax * 1.5); this.boss.hp = this.boss.hpMax; } // deux joueurs : plus de vie
      if (this.p) this.p.x = CX - 70;
    } else Coop.p2 = null;
  } catch (e) { console.warn('coop', e); }
  return r;
};
const _majCoop = majCombat;
majCombat = function (dt) {
  const t0 = G.t;
  _majCoop.apply(this, arguments);
  try { Coop.maj(Math.max(0, G.t - t0)); } catch (e) { console.warn('coop', e); }
};
const _pasCoop = pasBoucle;
pasBoucle = function (now) { try { if (Coop.p2) Coop.lire(); } catch (e) { } return _pasCoop(now); };
// le boss vise le joueur choisi (jamais un joueur tombé)
const _cibleCoop = cible;
cible = function () { if (G.leurre) return G.leurre; if (Coop.p2 && Coop.actif()) return Coop.cible(); return _cibleCoop(); };
// un joueur tombe : l'autre continue ; la partie s'arrête quand les deux sont tombés
const _mortCoop = G.mortJoueur;
G.mortJoueur = function () {
  const p2 = Coop.p2;
  if (p2 && Coop.actif()) {
    if (this.p === p2) { p2.ko = true; p2.hp = 0; this.secoue(12); Son.play('mort'); if (!(G.p && G.p.hp > 0)) { } return; }
    if (p2.hp > 0 && !p2.ko) { this.p.hp = 0; this.p.ko = true; this.secoue(12); Son.play('mort'); return; }
  }
  return _mortCoop.apply(this, arguments);
};
// quand le joueur 2 tombe en dernier, la partie est perdue (le joueur 1 est déjà à terre)
const _blesserCoop = G.blesser;
G.blesser = function (dmg, src) {
  const r = _blesserCoop.call(this, dmg, src);
  const p2 = Coop.p2;
  if (p2 && Coop.actif() && this.p === p2 && p2.ko) {
    const p1 = Coop.joueur1;
    if (p1 && p1.hp <= 0) { G.p = p1; _mortCoop.call(G); }
  }
  return r;
};
// on garde une référence au joueur 1 pour le cas ci-dessus
const _enJ2Coop = Coop.enJ2.bind(Coop);
Coop.enJ2 = function (f) { Coop.joueur1 = G.p; return _enJ2Coop(f); };
// fin du boss : les deux joueurs se relèvent
const _bossMortCoop = G.bossMort;
G.bossMort = function () {
  const r = _bossMortCoop.apply(this, arguments);
  const p2 = Coop.p2;
  if (p2 && this.boss && this.boss.mort) { p2.ko = false; p2.hp = p2.hpMax; if (this.p) { this.p.ko = false; this.p.hp = this.p.hpMax; } }
  return r;
};
// dessin : le joueur 2 avec un anneau vert, « J2 » et sa vie au-dessus de la tête
const _joueurCoop = dessinerJoueur;
dessinerJoueur = function (c) {
  _joueurCoop(c);
  const p2 = Coop.p2; if (!p2 || !Coop.actif()) return;
  if (p2.hp > 0 && !p2.ko) {
    c.save(); c.strokeStyle = 'rgba(120,255,170,.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(p2.x, p2.y + 8, 17, 7, 0, 0, TAU); c.stroke(); c.restore();
    Coop.enJ2(() => _joueurCoop(c));
    texteOmbre(c, 'J2', p2.x, p2.y - 40, '#9dffc4', `800 12px ${POLICE}`, 3);
    c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(p2.x - 21, p2.y - 34, 42, 6); c.fillStyle = '#46e39b'; c.fillRect(p2.x - 20, p2.y - 33, 40 * Math.max(0, p2.hp / p2.hpMax), 4);
  } else { c.save(); c.globalAlpha = .6; texteOmbre(c, 'J2 à terre', p2.x, p2.y - 10, '#ff9aa8', `800 12px ${POLICE}`, 3); c.restore(); }
  const p1 = G.p;
  if (p1 && p1.ko) { c.save(); c.globalAlpha = .6; texteOmbre(c, 'J1 à terre', p1.x, p1.y - 10, '#ff9aa8', `800 12px ${POLICE}`, 3); c.restore(); }
};
const _actionCoop = UI.action;
UI.action = function (a, btn) {
  if (a === 'coop') { Save.d.opts.coop = !Save.d.opts.coop; Save.write(); return this.menu(); }
  return _actionCoop.call(this, a, btn);
};
