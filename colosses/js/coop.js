'use strict';
/* Colosses — jouer à plusieurs, jusqu'à 3 joueurs : le joueur 1 sur cet appareil, et les autres avec une manette
   branchée (touche Start pour rejoindre) ou en ligne depuis n'importe quel appareil (voir reseau.js).
   Tout le monde partage l'arène ; chacun a sa vie et ses propres armes, différentes de celles des autres. Le moteur du joueur 1 est réutilisé pour les autres
   (on échange G.p et les touches le temps de les faire jouer).
   Équilibrage selon le nombre de joueurs : boss plus résistant, plus dense, un peu plus rapide, avec moins de répit ;
   il frappe aussi les joueurs qu'il ne vise pas ; les spéciales se rechargent moins vite (elles s'additionnent) et
   les soins profitent à toute l'équipe. Un joueur à terre se relève si un coéquipier reste à côté de lui. */

const MAX_JOUEURS = 3;
const COUL_J = ['#7dffb0', '#ffd86b'];
const VIE_BOSS_N = [1, 1.85, 2.7]; // la vie du boss selon le nombre de joueurs (mesurée pour garder la même durée de combat)
const Coop = {
  inscrits: [], cibleT: 0, cibleI: 0, renfortT: 5, hote: null, avantPad: {},
  N() { return 1 + this.inscrits.length; },
  actif() { return this.inscrits.length > 0 && G.mode !== 'entrainement'; },
  equipiers() { return this.inscrits.filter(j => j.p); },
  tous() { const l = this.equipiers().map(j => j.p); const h = this.hote || G.p; if (h) l.unshift(h); return l; },
  vivants() { return this.tous().filter(p => p.hp > 0 && !p.ko); },
  ajouter(o) {
    if (this.N() >= MAX_JOUEURS) return null;
    const j = Object.assign({ k: {}, pp: {}, visee: null, mx: null, my: null, p: null, entree: {} }, o);
    this.inscrits.push(j); this.renumeroter();
    if ((G.etat === 'combat' || G.etat === 'interlude') && G.p && G.boss) { this.creer(j); this.equilibrer(1); } // il arrive en plein combat
    return j;
  },
  retirer(j) { const i = this.inscrits.indexOf(j); if (i >= 0) { this.inscrits.splice(i, 1); this.renumeroter(); } },
  renumeroter() { this.inscrits.forEach((j, i) => { j.n = i + 2; j.col = COUL_J[i]; }); try { if (typeof Reseau !== 'undefined') Reseau.annoncer(); if (UI.multiOuvert) UI.multi(); } catch (e) { } },
  basculerManette(g) {
    const j = this.inscrits.find(x => x.pad === g.index);
    if (j) this.retirer(j); else this.ajouter({ type: 'manette', pad: g.index, nom: 'Manette' });
    if (G.etat === 'menu' && !UI.multiOuvert) UI.menu();
    Son.play('clic');
  },
  // les manettes rejoignent et quittent avec Start, depuis les menus
  ecouterManettes() {
    if (G.etat !== 'menu') return;
    for (const g of Manette.liste()) { const b = Manette.bouton(g, 9); if (b && !this.avantPad[g.index]) this.basculerManette(g); this.avantPad[g.index] = b; }
  },
  // les commandes d'un joueur : manette, ou ce qu'il envoie en ligne
  lire(j) {
    const K = TOUCHES(), set = (c, v) => { if (!c) return; if (v && !j.k[c]) j.pp[c] = true; j.k[c] = !!v; };
    if (j.type === 'manette') {
      const g = Manette.liste().find(x => x.index === j.pad); if (!g) return;
      const ax = g.axes, B = i => Manette.bouton(g, i), lx = Math.abs(ax[0]) > .3 ? ax[0] : 0, ly = Math.abs(ax[1]) > .3 ? ax[1] : 0, rx = ax[2] || 0, ry = ax[3] || 0;
      set(K.gauche, lx < -.3 || B(14)); set(K.droite, lx > .3 || B(15)); set(K.haut, ly < -.3 || B(12)); set(K.bas, ly > .3 || B(13));
      const C = MANETTE_CFG(), A = act => (C[act] || []).some(i => B(i));
      set(K.tir, A('tir')); set(K.spec, A('spec')); set(K.tal, A('tal'));
      if (Math.hypot(rx, ry) > .35) { const voulu = Math.atan2(ry, rx), sens = C.sens || .5; j.visee = j.visee === null ? voulu : j.visee + clamp(angDiff(j.visee, voulu), -sens * 9 / 60, sens * 9 / 60); } else j.visee = null;
    } else {
      const e = j.entree;
      set(K.haut, e.h); set(K.bas, e.b); set(K.gauche, e.g); set(K.droite, e.d); set(K.tir, e.f); set(K.spec, e.s); set(K.tal, e.t);
      j.visee = typeof e.a === 'number' ? e.a : null; j.mx = typeof e.mx === 'number' ? e.mx : null; j.my = typeof e.my === 'number' ? e.my : null;
    }
  },
  creer(j) {
    const p = creerJoueur(DF().pv); p.hp = p.hpMax; p.iframe = 1.5; p.prec = .35;
    p.x = CX + (j.n === 2 ? 90 : -90); p.y = AR.y + AR.h * .82;
    p.prim = { cd: 0 }; p.spec = { cd: 0 }; p.tal = { charges: ST.tCharges, cd: 0 };
    j.p = p; j.k = {}; j.pp = {};
    // ses propres armes, toutes différentes de celles des autres joueurs
    const pris = [G.ars].concat(this.inscrits.filter(x => x !== j && x.ars).map(x => x.ars)).filter(Boolean), a = {};
    for (const c of ['p', 's', 't']) { const l = ARS[c].filter(w => !pris.some(x => x[c] === w.id)); a[c] = R.pick(l.length ? l : ARS[c]).id; Save.d.codex.arm[c + ':' + a[c]] = 1; }
    j.ars = a;
  },
  // joue un morceau de code « comme si » ce joueur était le joueur principal
  enJoueur(j, f) {
    const s = { p: G.p, k: Input.k, pp: Input.p, mx: G.mx, my: G.my, lmb: Input.lmb, ars: G.ars };
    G.p = j.p; if (j.ars) G.ars = j.ars; Input.k = j.k; Input.p = j.pp; Input.lmb = !!j.k[TOUCHES().tir];
    const b = G.boss, p = j.p;
    if (j.mx !== null) { G.mx = j.mx; G.my = j.my; }
    else if (j.visee !== null) { G.mx = p.x + Math.cos(j.visee) * 240; G.my = p.y + Math.sin(j.visee) * 240; }
    else if (b && !b.mort) { G.mx = b.x; G.my = b.y; } // sans visée : il vise le boss tout seul
    try { f(); } finally { G.p = s.p; G.ars = s.ars; Input.k = s.k; Input.p = s.pp; G.mx = s.mx; G.my = s.my; Input.lmb = s.lmb; }
  },
  maj(dt) {
    if (!this.actif()) return;
    this.hote = G.p;
    const enCombat = G.etat === 'combat', b = G.boss;
    for (const j of this.equipiers()) {
      const p = j.p;
      this.enJoueur(j, () => {
        const n0 = G.pb.length, a0 = G.allies.length;
        if ((enCombat || G.etat === 'interlude') && p.hp > 0 && !p.ko) majJoueur(dt);
        for (let i = n0; i < G.pb.length; i++) G.pb[i].own = j; // ses tirs comptent avec SES armes
        for (let i = a0; i < G.allies.length; i++) G.allies[i].own = j;
        if (!enCombat || p.hp <= 0 || p.ko || p.saut > 0) return;
        for (const e of G.eb) if (!e.dead && d2(e.x, e.y, p.x, p.y) < ((e.r || 5) * .85 + p.hr) ** 2 && p.iframe <= 0 && p.fantome <= 0) { G.blesser(e.dmg, e.src); e.dead = true; }
        for (const h of G.hz) if (h.kind !== 'flaque' && h.kind !== 'lave' && HZ[h.kind].hit(h, p)) { if (G.blesser(h.dmg, h.src) && !HZ[h.kind].continu) h.touche = true; }
        if (b && !b.mort && !b.air && b.alpha > .5 && b.spectral <= 0 && b.trans <= 0 && b.intro <= 0 && d2(b.x, b.y, p.x, p.y) < (b.r * .85 + p.hr) ** 2) {
          if (G.blesser(DMG(1), 'contact')) { const a = ang(b.x, b.y, p.x, p.y); p.vx += Math.cos(a) * 500; p.vy += Math.sin(a) * 500; }
        }
      });
      j.pp = {};
    }
    if (!enCombat || !b || b.mort) return;
    // le boss change de cible toutes les 3,5 s
    this.cibleT -= dt; if (this.cibleT <= 0) { this.cibleT = 3.5; this.cibleI++; }
    // il frappe aussi ceux qu'il ne vise pas : personne n'est tranquille
    this.renfortT -= dt;
    if (this.renfortT <= 0 && b.intro <= 0) {
      this.renfortT = Math.max(3.5, 6 - this.N());
      const vise = this.cible(), avant = G.atkCourante; G.atkCourante = 'Renfort';
      for (const p of this.vivants()) if (p !== vise) zoneC(p.x, p.y, 70, Math.max(1, 1.2 * b.D.T), { dmg: DMG(.9) });
      G.atkCourante = avant; Son.play('tele');
    }
    // relever un coéquipier : rester à côté de lui 2,5 s
    const v = this.vivants();
    for (const q of this.tous()) {
      if (!(q.ko || q.hp <= 0)) { q.rev = 0; continue; }
      const proche = v.some(p => d2(p.x, p.y, q.x, q.y) < 60 * 60);
      q.rev = Math.max(0, (q.rev || 0) + (proche ? dt : -dt));
      if (q.rev >= 2.5) { q.ko = false; q.hp = Math.round(q.hpMax * .4); q.rev = 0; q.iframe = 2; Son.play('soin'); G.texte(q.x, q.y - 30, 'Relevé !', '#7dffb0', 18); }
    }
  },
  cible() { const v = this.vivants(); if (!v.length) return G.p; return v[this.cibleI % v.length]; },
  // boss adapté au nombre de joueurs (ajout = joueurs arrivés en plein combat)
  equilibrer(ajout) {
    const b = this.boss = G.boss, def = G.def; if (!b || !def) return;
    const N = this.N(), n0 = ajout ? N - 1 : 1;
    const k = VIE_BOSS_N[N - 1] / VIE_BOSS_N[n0 - 1], f = b.hp / b.hpMax;
    b.hpMax = Math.round(b.hpMax * k); b.hp = Math.round(b.hpMax * f);
    const D = def.D, d = N - n0;
    D.C *= Math.pow(1.12, d); D.S = Math.min(2.2, D.S * Math.pow(1.05, d)); def.idle *= Math.pow(.9, d);
    calcStats();
  },
  boutonMenu() { return `<button class="pill coop ${this.N() > 1 ? 'actif' : ''}" data-a="multi" title="Jouer à plusieurs : manettes ou en ligne, jusqu'à 3 joueurs">👥 Multijoueur · ${this.N()}/${MAX_JOUEURS}</button>`; }
};

// ---------- branchements ----------
const _entrerCoop = G.entrerSalle;
G.entrerSalle = function () {
  const r = _entrerCoop.apply(this, arguments);
  try {
    this.hoteKo = false;
    if (Coop.actif()) {
      Coop.hote = this.p; this.p.ko = false; if (this.p.hp <= 0) this.p.hp = this.p.hpMax;
      for (const j of Coop.inscrits) Coop.creer(j);
      this.p.x = CX; Coop.renfortT = 5;
      Coop.equilibrer(0);
    } else for (const j of Coop.inscrits) j.p = null;
  } catch (e) { console.warn('coop', e); }
  return r;
};
// à plusieurs, les spéciales de tout le monde s'additionnent : recharge plus longue
const _calcCoop = calcStats;
calcStats = function () { const r = _calcCoop.apply(this, arguments); try { if (typeof Coop !== 'undefined' && Coop.actif()) ST.sRech *= 1 + .2 * (Coop.N() - 1); } catch (e) { } return r; };
const _majCoop = majCombat;
majCombat = function (dt) {
  const t0 = G.t;
  _majCoop.apply(this, arguments);
  try { Coop.maj(Math.max(0, G.t - t0)); } catch (e) { console.warn('coop', e); }
};
const _pasCoop = pasBoucle;
pasBoucle = function (now) { try { Coop.ecouterManettes(); for (const j of Coop.inscrits) if (j.p) Coop.lire(j); } catch (e) { } return _pasCoop(now); };
const _cibleCoop = cible;
cible = function () { if (G.leurre) return G.leurre; if (Coop.actif() && Coop.equipiers().length) return Coop.cible(); return _cibleCoop(); };
// un joueur tombe : les autres continuent ; la partie s'arrête quand tout le monde est à terre
const _mortCoop = G.mortJoueur;
G.mortJoueur = function () {
  if (Coop.actif() && Coop.equipiers().length) {
    const p = this.p; p.hp = 0; p.ko = true; p.rev = 0; this.secoue(12); Son.play('mort');
    if (Coop.vivants().length) return;
    if (Coop.hote) this.p = Coop.hote;
  }
  return _mortCoop.apply(this, arguments);
};
const _blesserCoop = G.blesser;
G.blesser = function () { if (Coop.actif() && this.p && (this.p.ko || this.p.hp <= 0)) return false; return _blesserCoop.apply(this, arguments); };
// fin du boss : tout le monde se relève
const _bossMortCoop = G.bossMort;
G.bossMort = function () {
  const r = _bossMortCoop.apply(this, arguments);
  if (this.boss && this.boss.mort) for (const p of Coop.tous()) { p.ko = false; p.hp = p.hpMax; }
  return r;
};
// dessin : chaque joueur avec un anneau de sa couleur, son numéro et sa vie
const _joueurCoop = dessinerJoueur;
dessinerJoueur = function (c) {
  _joueurCoop(c);
  if (!Coop.actif()) return;
  const barre = (q, nom, col) => {
    if (q.hp > 0 && !q.ko) {
      c.save(); c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.ellipse(q.x, q.y + 8, 17, 7, 0, 0, TAU); c.stroke(); c.restore();
      c.textAlign = 'center'; texteOmbre(c, nom, q.x, q.y - 40, col, `800 12px ${POLICE}`, 3);
      c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(q.x - 21, q.y - 34, 42, 6); c.fillStyle = '#46e39b'; c.fillRect(q.x - 20, q.y - 33, 40 * Math.max(0, q.hp / q.hpMax), 4);
    } else {
      c.save(); c.globalAlpha = .7; c.textAlign = 'center'; texteOmbre(c, q.resp !== undefined ? nom + ' · ' + Math.ceil(q.resp) + ' s' : nom + ' à terre', q.x, q.y - 12, '#ff9aa8', `800 12px ${POLICE}`, 3); c.restore();
      if (q.resp !== undefined) return; // en Affrontement on revient tout seul
      c.strokeStyle = 'rgba(125,255,176,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(q.x, q.y, 60, 0, TAU); c.stroke();
      if (q.rev > 0) { c.strokeStyle = '#7dffb0'; c.lineWidth = 5; c.beginPath(); c.arc(q.x, q.y, 24, -Math.PI / 2, -Math.PI / 2 + TAU * q.rev / 2.5); c.stroke(); }
    }
  };
  for (const j of Coop.equipiers()) { if (j.p.hp > 0 && !j.p.ko) { Coop.enJoueur(j, () => _joueurCoop(c)); const w = j.ars && trouveArme('p', j.ars.p); if (w) icoDessin(c, w.ico, j.p.x + 24, j.p.y - 40, 16); } barre(j.p, j.nomAff || 'J' + j.n, j.col); }
  if (Coop.hote) barre(Coop.hote, G.mode === 'affront' ? (Save.d.pseudo || 'Toi') : 'J1', '#8ad8ff');
};
