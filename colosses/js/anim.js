'use strict';
/* Colosses — animations : le héros recule quand il tire, encaisse quand il est touché, s'étire quand il court ou esquive ;
   le boss respire, se gonfle avant d'attaquer, se détend quand il frappe, recule sous les coups et crache des étincelles.
   Tout est purement visuel : le point rouge du héros (sa vraie zone de coup) ne bouge jamais, et la silhouette touchable
   du boss suit exactement son dessin (corpsFin lit _adx/_ady/_as). */

const Anim = {
  t0: null,
  pas() { const t = G.t || 0, dt = this.t0 === null ? 0 : clamp(t - this.t0, 0, .05); this.t0 = t; return dt; },
  ressort(o, dt, raideur, amorti, max) {
    // petit ressort amorti : o.x/o.y = décalage, o.vx/o.vy = vitesse
    o.vx += (-raideur * o.x - amorti * o.vx) * dt; o.vy += (-raideur * o.y - amorti * o.vy) * dt;
    o.x += o.vx * dt; o.y += o.vy * dt;
    const d = Math.hypot(o.x, o.y); if (d > max) { o.x *= max / d; o.y *= max / d; }
  }
};
function animDe(x) { return x._an || (x._an = { x: 0, y: 0, vx: 0, vy: 0, kick: 0, hurt: 0, ha: 0, st: 0, sa: 0, pulse: 0, lastMain: null, wind0: 0, etinT: 0 }); }

// ---------- héros ----------
const _pShotAnim = pShot;
pShot = function (x, y, a, spd, o) {
  const p = G.p;
  if (p && o) { const A = animDe(p), f = o.spec ? 160 : 55; A.vx -= Math.cos(a) * f; A.vy -= Math.sin(a) * f; A.kick = Math.min(1, A.kick + (o.spec ? 1 : .35)); }
  return _pShotAnim.apply(this, arguments);
};
const _blesserAnim = G.blesser;
G.blesser = function (dmg, src) {
  const r = _blesserAnim.call(this, dmg, src);
  if (r && this.p) {
    const A = animDe(this.p), a = this.coupInfo ? this.coupInfo.a + Math.PI : Math.random() * TAU;
    A.vx += Math.cos(a) * 260; A.vy += Math.sin(a) * 260; A.hurt = 1; A.ha = a;
  }
  return r;
};
const _vaisseauAnim = dessinerVaisseau;
dessinerVaisseau = function (c, x, y, a, r, col, al, p) {
  if (!p || p !== G.p) return _vaisseauAnim.apply(this, arguments);
  const A = animDe(p), dt = Anim.pas();
  Anim.ressort(A, dt, 260, 22, 7);
  A.kick = Math.max(0, A.kick - dt * 6); A.hurt = Math.max(0, A.hurt - dt * 4);
  // étirement dans le sens de la course (plus fort pendant une esquive)
  const v = Math.hypot(p.vx, p.vy), cible = p.dash ? .22 : clamp((v - 60) / 900, 0, .07);
  A.st += (cible - A.st) * Math.min(1, dt * 14);
  if (v > 20) A.sa = Math.atan2(p.vy, p.vx);
  // pas de course : le corps monte et descend légèrement ; à l'arrêt, une respiration lente
  const bob = v > 40 ? -Math.abs(Math.sin((p.marche || 0) * 1)) * 1.6 : Math.sin(G.t * 2.4) * .5;
  const ecrase = A.hurt * .12;
  c.save();
  c.translate(x + A.x, y + A.y + bob);
  c.rotate(A.sa); c.scale(1 + A.st - ecrase * .5, 1 - A.st * .55 + ecrase * .3); c.rotate(-A.sa);
  c.translate(-x, -y);
  _vaisseauAnim.call(this, c, x, y, a, r, col, al, p);
  c.restore();
  // éclair blanc sur le héros juste après un coup
  if (A.hurt > .6) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = (A.hurt - .6) * 2;
    c.drawImage(glow('rgba(255,120,140,.9)', r * 2.2), x + A.x - r * 2.2, y + A.y - r * 2.2); c.restore();
  }
};

// ---------- boss ----------
const _frappeAnim = G.frappe;
G.frappe = function (tg, dmg, o) {
  const b = this.boss, cible = tg && tg.proxy ? tg.proxy : tg, hp0 = b ? b.hp : 0;
  const r = _frappeAnim.apply(this, arguments);
  if (b && cible === b && b.hp < hp0 && !b.mort) {
    const A = animDe(b), p = this.p, perdu = hp0 - b.hp;
    const a = p ? ang(p.x, p.y, b.x, b.y) : 0, f = clamp(perdu / b.hpMax * 9000, 18, 140) * (o && o.spec ? 1.8 : 1);
    A.vx += Math.cos(a) * f; A.vy += Math.sin(a) * f; A.hurt = Math.min(1, A.hurt + .25);
    // étincelles au point d'impact, en gerbe vers le tireur (limitées pour ne pas noyer l'écran)
    if ((A.etinT || 0) < G.t && !G.opts.effetsReduits) {
      A.etinT = G.t + .07;
      const ix = o && o.x !== undefined ? o.x : b.x - Math.cos(a) * b.r * .8, iy = o && o.y !== undefined ? o.y : b.y - Math.sin(a) * b.r * .8;
      const n = Math.round((o && o.spec ? 7 : 3) * QUAL());
      for (let i = 0; i < n && G.parts.length < 700; i++) {
        const d = a + Math.PI + R.range(-.7, .7), s = R.range(140, 340);
        G.parts.push({ x: ix, y: iy, vx: Math.cos(d) * s, vy: Math.sin(d) * s, life: .22, max: .22, col: i % 2 ? '#fff4c8' : b.col, r: R.range(1.1, 2), trait: true, add: true });
      }
    }
  }
  return r;
};
const _bossAnim = dessinerBoss;
dessinerBoss = function (c, b) {
  if (!b || !b.def || G.etat === 'menu' || !(G.etat === 'combat' || G.etat === 'interlude' || G.etat === 'pause' || G.etat === 'mort')) return _bossAnim.apply(this, arguments);
  const A = animDe(b), dt = b === G.boss ? Anim.pas2() : 0;
  Anim.ressort(A, dt, 180, 16, 9);
  A.hurt = Math.max(0, A.hurt - dt * 5);
  // prise d'élan : il se gonfle pendant l'annonce, puis se détend d'un coup quand l'attaque part
  const k = b.wind > 0 ? 1 - b.wind / (b.windMax || 1) : 0;
  if (b.main && b.main !== A.lastMain) A.pulse = 1;
  A.lastMain = b.main;
  A.pulse = Math.max(0, A.pulse - dt * 5);
  const s = 1 + .07 * k * k - .06 * Math.sin(A.pulse * Math.PI) - .025 * A.hurt;
  const bob = b.mort ? 0 : Math.sin(G.t * 1.7 + (b.seed || 0) % 7) * 2;
  const dx = A.x, dy = A.y + bob;
  b._adx = dx; b._ady = dy; b._as = s;
  c.save();
  c.translate(b.x + dx, b.y + dy); c.scale(s, s); c.translate(-b.x, -b.y);
  _bossAnim.call(this, c, b);
  c.restore();
  b._adx = 0; b._ady = 0; b._as = 1;
};
// horloge séparée pour le boss (le héros a la sienne)
Anim.t1 = null;
Anim.pas2 = function () { const t = G.t || 0, dt = this.t1 === null ? 0 : clamp(t - this.t1, 0, .05); this.t1 = t; return dt; };
