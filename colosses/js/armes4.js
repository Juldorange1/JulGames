'use strict';
/* Colosses — armes techniques et Chasse plus dure.
   • Trois armes qui demandent de la maîtrise : Tambour de guerre (timing), Lance de portée (distance exacte),
     Lame de l'ombre (placement dans le dos du boss). Bien jouées, ce sont les plus fortes ; mal jouées, elles ne font presque rien.
   • En Chasse, on ne reçoit que des armes techniques, et le boss se téléporte, fait surgir des obstacles et se met en garde. */

PRIM.push(
  { id: 'tambour', nom: 'Tambour de guerre', ico: '🥁', manuel: true, desc: 'Frappe en rythme : clique quand l\'anneau touche le centre. Dans le temps : ×4, presque : ×2, et chaque temps réussi d\'affilée ajoute +10 % (jusqu\'à +50 %). Un clic de trop ou à contretemps ne fait rien et casse la série : marteler ne sert à rien.',
    // un temps toutes les 0,8 s ; un seul clic compte par temps, les autres cassent la série
    tick(w, p, dt, held) {
      const per = .8 / ST.pCad;
      w.n = w.n || 0; w.ph = (w.ph || 0) + dt / per;
      if (w.ph >= 1) { w.ph -= 1; w.n++; w.vu = false; }
      // le temps qui vient de passer sans clic : la série est perdue
      if (w.ph >= .5 && !w.vu) { w.vu = true; if (w.pris !== w.n && w.serie) { w.serie = 0; } }
      if (held && !w.avant) {
        const ecart = Math.min(w.ph, 1 - w.ph) * per, temps = w.n + (w.ph >= .5 ? 1 : 0), pt = G.arene.clampPt(G.mx, G.my, 0);
        let note = ecart < .1 ? 2 : ecart < .2 ? 1 : 0;
        if (w.pris === temps) note = -1; // deuxième clic sur le même temps
        if (note > 0) {
          w.pris = temps; const k = 1 + .1 * Math.min(5, w.serie || 0); w.serie = Math.min(5, (w.serie || 0) + 1);
          let touche = false;
          for (const tg of G.cibles()) if (Math.sqrt(d2(pt.x, pt.y, tg.x, tg.y)) - tg.r < 46) { G.frappe(tg, (note === 2 ? 110 : 55) * k * ST.pDmg, { prim: true, x: pt.x, y: pt.y }); touche = true; }
          G.fx.push({ kind: 'anneau', x: pt.x, y: pt.y, r0: 8, r1: note === 2 ? 72 : 48, t: 0, dur: .25, col: note === 2 ? '#ffe14d' : '#9fe4ff' });
          G.texte(pt.x, pt.y - 30, (note === 2 ? 'PARFAIT' : 'BIEN') + (w.serie > 1 ? ' ×' + (1 + .1 * w.serie).toFixed(1).replace('.', ',') : ''), note === 2 ? '#ffe14d' : '#9fe4ff', 16);
          if (note === 2) { G.secoue(2); Son.play('choc'); } else Son.play('tir2');
          if (!touche && typeof Precision !== 'undefined') Precision.rate();
        } else {
          if (note === 0) w.pris = temps;
          w.serie = 0; G.texte(pt.x, pt.y - 26, note < 0 ? 'trop de clics' : 'contretemps', '#ff9aa8', 13);
          if (typeof Precision !== 'undefined') Precision.rate();
        }
      }
      w.avant = held;
    } },
  { id: 'portee', nom: 'Lance de portée', ico: '🎯', desc: 'Un anneau entoure ton héros : si le bord du boss est exactement dessus, la lance frappe ×4. Plus près ou plus loin : presque rien.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .55 / ST.pCad), b = G.boss;
      for (let i = 0; i < n; i++) {
        const d = b ? Math.sqrt(d2(p.x, p.y, b.x, b.y)) - b.r : 0, juste = Math.abs(d - PORTEE_LANCE) < 22, o = bout(p, 16);
        pShot(o.x, o.y, p.aim, 1300 * ST.pVel, { dmg: juste ? 112 : 26, r: juste ? 7 : 4, life: .6, kind: 'javelot', col: juste ? '#7dffb0' : '#b8b0a0' });
        Son.play('tir2');
      }
    } },
  { id: 'dosLame', nom: 'Lame de l\'ombre', ico: '🗡', desc: 'Courte portée. Dans le dos du boss : ×4. De face : presque rien. Contourne-le sans arrêt.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .5 / ST.pCad);
      for (let i = 0; i < n; i++) {
        G.fx.push({ kind: 'taillade', x: p.x, y: p.y, a: p.aim, sens: 1, t: 0, dur: .14, reach: 150 }); Son.play('epee');
        for (const tg of G.cibles()) {
          if (Math.sqrt(d2(p.x, p.y, tg.x, tg.y)) - tg.r > 150) continue;
          const dos = tg === G.boss ? Math.abs(angDiff((tg.facing || 0) + Math.PI, ang(tg.x, tg.y, p.x, p.y))) < 1 : false;
          G.frappe(tg, (dos ? 100 : 24) * ST.pDmg, { prim: true, x: tg.x, y: tg.y });
          if (dos) G.etincelle(tg.x, tg.y, '#c8a0ff', 4);
        }
      }
    } }
);
const PORTEE_LANCE = 240;
Object.assign(ELEM_ARME, { tambour: 'foudre', portee: 'acier', dosLame: 'ombre' });
Object.assign(FAMILLE, { tambour: 'magie', portee: 'trait', dosLame: 'lame' });
if (typeof ICO_CLE !== 'undefined') Object.assign(ICO_CLE, { 'p:tambour': 'speaker', 'p:portee': 'thrown-spear', 'p:dosLame': 'backstab' });
for (const id of ['tambour', 'portee', 'dosLame']) { const a = trouveArme('p', id); if (a) a.ico = '⟦p:' + id + '⟧'; }
// dégâts par seconde d'un jeu parfait, précision au maximum
// spéciales que le robot ne savait pas utiliser : leur vraie part de dégâts
Object.assign(CHASSE_T.s, { lames: 45, supernova: 45, lumiereSacree: 11 });
if (typeof ARMES_COMPLEXES !== 'undefined') for (const id of ['tambour', 'portee', 'dosLame']) ARMES_COMPLEXES.add('p:' + id);
// repères à l'écran pour ces armes
const _dessArmes4 = dessinerAllies;
dessinerAllies = function (c) {
  _dessArmes4(c);
  try {
    const p = G.p, id = G.ars && G.ars.p; if (!p || p.hp <= 0) return;
    c.save();
    if (id === 'tambour') {
      // l'anneau se resserre jusqu'au centre à chaque temps ; il devient bleu puis doré quand c'est le moment
      const w = p.prim, per = .8 / ST.pCad, ph = w.ph || 0, ec = Math.min(ph, 1 - ph) * per, k = 1 - ph, note = ec < .1 ? 2 : ec < .2 ? 1 : 0;
      c.strokeStyle = 'rgba(255,225,77,.25)'; c.lineWidth = 10; c.beginPath(); c.arc(G.mx, G.my, 22, 0, TAU); c.stroke();
      c.strokeStyle = note === 2 ? '#ffe14d' : note === 1 ? '#9fe4ff' : 'rgba(230,220,200,.75)'; c.lineWidth = note ? 4 : 2; c.beginPath(); c.arc(G.mx, G.my, 18 + 80 * k, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(255,225,77,.85)'; c.lineWidth = 2; c.beginPath(); c.arc(G.mx, G.my, 18, 0, TAU); c.stroke();
      if (w.serie > 0) { c.fillStyle = '#ffe14d'; for (let i = 0; i < w.serie; i++) { c.beginPath(); c.arc(G.mx - 20 + i * 10, G.my + 34, 3, 0, TAU); c.fill(); } }
    } else if (id === 'portee' && G.boss) {
      const d = Math.sqrt(d2(p.x, p.y, G.boss.x, G.boss.y)) - G.boss.r, juste = Math.abs(d - PORTEE_LANCE) < 22;
      c.strokeStyle = juste ? 'rgba(125,255,176,.9)' : 'rgba(230,220,200,.35)'; c.lineWidth = juste ? 3 : 1.5; c.setLineDash([10, 8]); c.beginPath(); c.arc(p.x, p.y, PORTEE_LANCE, 0, TAU); c.stroke(); c.setLineDash([]);
    }
    c.restore();
  } catch (e) { }
};

// ---------- la Chasse : armes techniques et boss plus retors ----------
// armes de la Chasse : seulement celles où un joueur peut viser le temps parfait à armes égales
// (l'arc était bien trop dur à viser sur un point faible qui bouge ; le sabre et la lame de l'ombre bien trop faciles)
const ARMES_CHASSE = ['railgun', 'surchauffe', 'jumelles', 'focale', 'meteorite', 'tambour', 'portee', 'rattrape'];
function armeChasse() { return R.pick(ARMES_CHASSE); }
// spéciales de la Chasse : des tirs qui se visent, pas d'explosion géante (la Supernova enlevait plus d'un tiers de la vie d'un coup)
const SPEC_CHASSE = ['javelot', 'missiles', 'tourelle', 'clones', 'lamesCiel', 'barrage', 'volee', 'ombres', 'lanceSoleil', 'orage'].filter(id => SPEC.some(s => s.id === id));
function specChasse() { return R.pick(SPEC_CHASSE); }
const GARDE_DEGATS = .15, GARDE_DUREE = 2, GARDE_TOUS = 9;
const ChasseBoss = {
  tpT: 6, obsT: 5, gardeT: GARDE_TOUS, garde: 0, dest: null,
  raz() { this.tpT = 6; this.obsT = 5; this.gardeT = GARDE_TOUS; this.garde = 0; this.dest = null; },
  maj(dt) {
    const b = G.boss, p = G.p;
    if (G.format() !== 'chasse' || G.etat !== 'combat' || !b || b.mort || b.intro > 0 || b.trans > 0 || !p) return;
    // téléportation : la destination est annoncée, puis le boss y apparaît
    this.tpT -= dt;
    const tpOk = !b.ctl && !b.air;
    if (this.tpT <= .7 && !this.dest && tpOk) {
      let pt, k = 0; do { pt = G.arene.pointAuHasard(b.r + 40); } while (++k < 15 && d2(pt.x, pt.y, p.x, p.y) < 280 * 280);
      this.dest = pt; G.hz.push({ kind: 'apercuC', x: pt.x, y: pt.y, r: b.r + 20, t: 0, dur: .7 });
    }
    if (this.tpT <= 0) {
      this.tpT = R.range(4.5, 6.5);
      if (this.dest && tpOk) { G.fx.push({ kind: 'fantome', x: b.x, y: b.y, t: 0, dur: .3, r: b.r }); b.x = this.dest.x; b.y = this.dest.y; Son.play('teleporte');
        // le Serpent ressort de terre : son corps repart derrière sa tête
        if (b.s && b.s.trace && b.s.dir !== undefined) { const d0 = b.s.dir; b.s.trace = Array.from({ length: 60 }, (_, k) => G.arene.clampPt(b.x - Math.cos(d0) * k * 8, b.y - Math.sin(d0) * k * 8, 10)); }
      }
      this.dest = null;
    }
    // obstacles : des rochers surgissent entre toi et le boss et arrêtent tes tirs
    this.obsT -= dt;
    if (this.obsT <= 0) {
      this.obsT = 8;
      const a = ang(p.x, p.y, b.x, b.y), dd = Math.sqrt(d2(p.x, p.y, b.x, b.y)) * .5;
      for (const s of [-1, 1]) { const pt = G.arene.clampPt(p.x + Math.cos(a) * dd + Math.cos(a + Math.PI / 2) * s * 55, p.y + Math.sin(a) * dd + Math.sin(a + Math.PI / 2) * s * 55, 40); if (Arene.piliers.length < 8) Arene.piliers.push({ x: pt.x, y: pt.y, r: 30, tmp: 6 }); }
      Arene.sortirPiliers(p, p.r); Son.play('choc'); G.secoue(3);
    }
    // garde : pendant 2 s il encaisse à peine ; l'anneau prévient une seconde avant
    this.gardeT -= dt; if (this.garde > 0) this.garde -= dt;
    if (this.gardeT <= 0) { this.gardeT = GARDE_TOUS; this.garde = GARDE_DUREE; Son.play('parade'); }
  }
};
const _entrerChasseB = G.entrerSalle;
G.entrerSalle = function () { ChasseBoss.raz(); return _entrerChasseB.apply(this, arguments); };
const _majChasseB = majCombat;
majCombat = function (dt) { const t0 = G.t; _majChasseB.apply(this, arguments); try { ChasseBoss.maj(Math.max(0, G.t - t0)); } catch (e) { } };
const _frappeGarde = G.frappe;
G.frappe = function (tg, dmg, o) {
  if (ChasseBoss.garde > 0 && G.format() === 'chasse' && tg === G.boss) { dmg *= GARDE_DEGATS; if (G.t - (this.gardeTexte || 0) > .5) { this.gardeTexte = G.t; G.texte(tg.x, tg.y - tg.r - 16, 'Garde', '#9fe4ff', 15); } }
  return _frappeGarde.call(this, tg, dmg, o);
};
const _bossGarde = dessinerBoss;
dessinerBoss = function (c, b) {
  _bossGarde.apply(this, arguments);
  try {
    if (G.format() !== 'chasse' || !b) return;
    const y = b.y - (b.haut || 0);
    if (ChasseBoss.garde > 0) { c.save(); c.strokeStyle = 'rgba(159,228,255,.95)'; c.lineWidth = 6; c.beginPath(); c.arc(b.x, y, b.r * 1.4, 0, TAU); c.stroke(); c.restore(); }
    else if (ChasseBoss.gardeT < 1) { c.save(); c.strokeStyle = 'rgba(159,228,255,.7)'; c.lineWidth = 2; c.setLineDash([8, 8]); c.lineDashOffset = -G.t * 40; c.beginPath(); c.arc(b.x, y, b.r * (1.4 + ChasseBoss.gardeT * .5), 0, TAU); c.stroke(); c.restore(); }
  } catch (e) { }
};
