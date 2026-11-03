'use strict';
/* Colosses — objets de terrain (tremplins, téléporteurs, pièges à pics) qui changent à chaque phase,
   l'attaque « Pièges » et deux invocations de plus (totem protecteur, poseur de mines). */

// ---------- Objets de terrain ----------
Arene.objets = [];
const _appliquerCarte = Arene.appliquer.bind(Arene);
Arene.appliquer = function (carte) {
  _appliquerCarte(carte);
  this.objets = [];
  const salle = G.salle || 1;
  if (!G.boss && !G.def) return;
  if (salle < 3 || R() > Math.min(.8, .45 + salle * .015)) return;
  const jeux = [['tremplin'], ['portail'], ['piege'], ['tremplin', 'piege'], ['portail', 'piege'], ['tremplin', 'portail']];
  for (const k of R.pick(jeux)) {
    if (k === 'tremplin') for (let i = 0; i < 2; i++) { const pt = this.pointAuHasard(70, 150); this.objets.push({ kind: 'tremplin', x: pt.x, y: pt.y, r: 28, a: ang(pt.x, pt.y, CX, CY) + R.range(-.5, .5), cd: 0 }); }
    if (k === 'portail') {
      const a = this.pointAuHasard(60, 120); let b = this.pointAuHasard(60, 120);
      for (let i = 0; i < 12 && d2(a.x, a.y, b.x, b.y) < 420 * 420; i++) b = this.pointAuHasard(60, 120);
      const A = { kind: 'portail', x: a.x, y: a.y, r: 26, cd: 0, teinte: 190 }, B = { kind: 'portail', x: b.x, y: b.y, r: 26, cd: 0, teinte: 290 };
      A.lien = B; B.lien = A; this.objets.push(A, B);
    }
    if (k === 'piege') for (let i = 0, n = R.int(3, 5); i < n; i++) { const pt = this.pointAuHasard(50, 140); this.objets.push(nouveauPiege(pt.x, pt.y)); }
  }
};
function nouveauPiege(x, y, vie) { return { kind: 'piege', x, y, r: 36, per: R.range(2.8, 3.6), off: R() * 4, vie: vie || 0, t: 0 }; }
// état d'un piège : 0 repos, 1 il s'allume (0,9 s), 2 pics sortis (0,4 s)
function etatPiege(o) { const ph = (G.t + o.off) % o.per; return ph > o.per - .9 ? 1 : ph < .4 ? 2 : 0; }

const _majArene = Arene.maj.bind(Arene);
Arene.maj = function (dt) {
  _majArene(dt);
  const p = G.p, b = G.boss;
  if (!p || G.etat !== 'combat') return;
  for (const o of this.objets) {
    if (o.cd > 0) o.cd -= dt;
    if (o.vie) { o.t += dt; if (o.t > o.vie) o.dead = true; }
    // l'arène qui rétrécit (étau) avale les objets restés dehors
    if (!this.dedans(o.x, o.y, o.r * .5)) { o.dead = true; if (o.lien) o.lien.dead = true; }
    const dedans = d2(o.x, o.y, p.x, p.y) < (o.r + p.hr) ** 2;
    if (o.kind === 'tremplin' && dedans && o.cd <= 0 && !(p.saut > 0) && !p.dash) {
      // saut : on passe au-dessus de la lave, des fissures et des pics (pas des balles)
      const L = 300, fin = Arene.clampPt(o.x + Math.cos(o.a) * L, o.y + Math.sin(o.a) * L, p.r), D = Math.hypot(fin.x - p.x, fin.y - p.y);
      p.saut = .6; p.sautMax = .6; p.sautDoux = true;
      p.dash = { t: 0, dur: .6, vx: (fin.x - p.x) / .6, vy: (fin.y - p.y) / .6 };
      o.cd = 1; Son.play('dash'); G.fx.push({ kind: 'anneau', x: o.x, y: o.y, r0: 10, r1: 60, t: 0, dur: .3, col: '#7dffe0' });
      if (D < 1) p.dash = null;
    }
    if (o.kind === 'portail' && dedans && o.cd <= 0 && !p.dash) {
      const l = o.lien; p.x = l.x; p.y = l.y; o.cd = l.cd = 1.4; p.iframe = Math.max(p.iframe, .25);
      Son.play('tele'); for (const q of [o, l]) G.fx.push({ kind: 'anneau', x: q.x, y: q.y, r0: 8, r1: 70, t: 0, dur: .35, col: hsl(q.teinte, 100, 70) });
    }
    if (o.kind === 'piege' && etatPiege(o) === 2) {
      if (dedans && !(p.saut > 0)) G.blesser(DMG(.9), 'pieges');
      if (b && !b.mort && !b.air && d2(o.x, o.y, b.x, b.y) < (o.r + b.r * .5) ** 2 && !o.boss) { o.boss = true; G.frappe(b, 90, { x: b.x, y: b.y }); }
    } else if (o.kind === 'piege') o.boss = false;
  }
  if (this.objets.some(o => o.dead)) this.objets = this.objets.filter(o => !o.dead);
};

function dessinerObjets(c) {
  for (const o of Arene.objets) {
    c.save(); c.translate(o.x, o.y);
    if (o.kind === 'tremplin') {
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(3, 5, o.r, o.r * .7, 0, 0, TAU); c.fill();
      c.globalCompositeOperation = 'lighter'; c.drawImage(glow('rgba(80,255,220,.35)', 40), -40, -40); c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#1d3a3a'; c.strokeStyle = o.cd > 0 ? '#3a6a66' : '#7dffe0'; c.lineWidth = 3;
      c.beginPath(); c.arc(0, 0, o.r, 0, TAU); c.fill(); c.stroke();
      c.rotate(o.a); c.strokeStyle = o.cd > 0 ? '#3a6a66' : '#c8fff2'; c.lineWidth = 4; c.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const x = -10 + i * 9 + ((G.t * 30) % 9); c.globalAlpha = .4 + .2 * i; c.beginPath(); c.moveTo(x - 6, -9); c.lineTo(x + 2, 0); c.lineTo(x - 6, 9); c.stroke(); }
      c.globalAlpha = 1; c.lineCap = 'butt';
    } else if (o.kind === 'portail') {
      const col = hsl(o.teinte, 100, 65);
      c.globalCompositeOperation = 'lighter'; c.drawImage(glow(hsl(o.teinte, 100, 55, .45), 48), -48, -48);
      sprite(c, 'twirl_02', col, 0, 0, o.r * 2.6, G.t * 3, o.cd > 0 ? .3 : .9, true); c.globalCompositeOperation = 'source-over';
      c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, o.r, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(10,0,20,.55)'; c.beginPath(); c.arc(0, 0, o.r * .55, 0, TAU); c.fill();
    } else if (o.kind === 'piege') {
      const e = etatPiege(o), fin = o.vie ? Math.min(1, (o.vie - o.t) * 2) : 1;
      c.globalAlpha = fin;
      c.fillStyle = '#211c22'; c.strokeStyle = '#4a4248'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, o.r, 0, TAU); c.fill(); c.stroke();
      for (let i = 0; i < 7; i++) { const a = i * TAU / 7, rr = i % 2 ? o.r * .55 : o.r * .25; c.fillStyle = '#3a3238'; c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr, 3, 0, TAU); c.fill(); }
      if (e === 1) { const k = ((G.t + o.off) % o.per - (o.per - .9)) / .9; c.fillStyle = `rgba(${AL},${.15 + .35 * k})`; c.beginPath(); c.arc(0, 0, o.r, 0, TAU); c.fill(); c.strokeStyle = k > .7 && (G.t * 20 | 0) % 2 ? '#fff' : ROUGE; c.lineWidth = 2; c.stroke(); }
      if (e === 2) {
        c.fillStyle = '#e8e2ea'; c.strokeStyle = '#6a5a66'; c.lineWidth = 1;
        for (let i = 0; i < 9; i++) { const a = i * TAU / 9 + .3, rr = (i % 3) * o.r * .28 + 6; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; c.beginPath(); c.moveTo(x - 5, y + 4); c.lineTo(x, y - 12); c.lineTo(x + 5, y + 4); c.closePath(); c.fill(); c.stroke(); }
      }
      c.globalAlpha = 1;
    }
    c.restore();
  }
}
const _dessinerArene = dessinerArene;
dessinerArene = function (c) { _dessinerArene(c); dessinerObjets(c); };

// ---------- Attaque : le boss sème des pièges ----------
nouvelleAttaque('pieges', { nom: 'Pièges', cat: 'terrain', conseil: 'Des plaques à pics poussent autour de toi pendant 14 s : elles s\'allument juste avant de sortir leurs pics. Ne reste pas dessus, mais le boss aussi s\'y pique.',
  params: (r, D) => ({ n: r.int(3, 5) }),
  *gen(b, p) {
    yield* prep(b, .45);
    const t = cible();
    for (let i = 0; i < p.n; i++) { const a = i * TAU / p.n + R() * .5, dd = R.range(90, 220), pt = G.arene.clampPt(t.x + Math.cos(a) * dd, t.y + Math.sin(a) * dd, 40); const o = nouveauPiege(pt.x, pt.y, 14); o.off = (o.per - (G.t % o.per)) + .9 + i * .25; Arene.objets.push(o); }
    Son.play('choc'); G.secoue(4);
    yield .8;
  }
});
Object.assign(POIDS, { pieges: 1.5 }); Object.assign(MIN_SALLE, { pieges: 3 });

// ---------- Invocations de plus ----------
Object.assign(INVOC, {
  totem: { nom: 'Totems', desc: 'Immobiles : tant qu\'un totem tient debout, le boss encaisse 45 % de dégâts en moins (un lien lumineux le montre).', hp: 240, r: 17, vit: 0 },
  poseur: { nom: 'Poseurs de mines', desc: 'Errent dans l\'arène et lâchent des mines qui s\'arment puis explosent quand tu passes près.', hp: 150, r: 13, vit: 95 }
});
const _majMinion = majMinion;
majMinion = function (m, dt) {
  if (m.type !== 'totem' && m.type !== 'poseur') return _majMinion(m, dt);
  if (m.spawn > 0) { m.spawn -= dt; return; }
  m.flash = Math.max(0, m.flash - dt * 6);
  if (m.type === 'poseur') {
    m.cap = (m.cap === undefined ? R() * TAU : m.cap) + R.range(-1.5, 1.5) * dt;
    m.x += Math.cos(m.cap) * m.vit * dt; m.y += Math.sin(m.cap) * m.vit * dt;
    if (!G.arene.dedans(m.x, m.y, m.r + 20)) m.cap = ang(m.x, m.y, CX, CY);
    m.cd -= dt;
    if (m.cd <= 0 && G.hz.filter(h => h.kind === 'mine').length < 8) { m.cd = 3.2; G.hz.push({ kind: 'mine', x: m.x, y: m.y, t: 0, arme: 1, vie: 9, rd: 70, rb: 85, etat: 0, dmg: DMG(1.1), src: 'invocation' }); }
    G.arene.contenir(m, m.r);
  }
};
const _dessinerMinion = dessinerMinion;
dessinerMinion = function (c, m) {
  const b = G.boss;
  if (m.type === 'totem' && b && !b.mort && m.spawn <= 0) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = hsl(b.def.hue, 100, 70, .35 + .2 * Math.sin(G.t * 8)); c.lineWidth = 4;
    c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(b.x, b.y); c.stroke(); c.restore();
  }
  _dessinerMinion(c, m);
  if (m.type === 'totem') {
    c.save(); c.translate(m.x, m.y); c.strokeStyle = '#fff'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -m.r * 1.6); c.lineTo(0, m.r * .6); c.moveTo(-m.r * .6, -m.r * .7); c.lineTo(m.r * .6, -m.r * .7); c.stroke(); c.restore();
  } else if (m.type === 'poseur') {
    c.save(); c.translate(m.x, m.y); c.fillStyle = (G.t * 4 | 0) % 2 ? '#ff3355' : '#661020'; c.beginPath(); c.arc(0, m.r * .9, 3.5, 0, TAU); c.fill(); c.restore();
  }
};
function totemProtege() { return G.minions.some(m => m.type === 'totem' && m.spawn <= 0 && !m.dead); }
