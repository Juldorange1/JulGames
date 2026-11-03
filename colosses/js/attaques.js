'use strict';
/* Colosses — les dangers (balles, zones annoncées, rayons, ondes, flaques, mines)
   et le catalogue des attaques de boss. Chaque attaque est un générateur :
   « yield t » attend t secondes, « yield 0 » attend une image. */

const ROUGE = '#ff3355';
function DMG(m) { return G.dmgE * (m || 1); }
function cible() { return G.leurre || G.p; }
function vise(b) { const t = cible(); return ang(b.x, b.y, t.x, t.y); }
function viseAvance(b, spd) {
  const t = cible(), p = G.p, dd = Math.sqrt(d2(b.x, b.y, t.x, t.y)), tt = dd / spd;
  const vx = t === p ? p.vx : 0, vy = t === p ? p.vy : 0;
  return ang(b.x, b.y, t.x + vx * tt * .8, t.y + vy * tt * .8);
}
function* prep(b, t) { b.wind = t * b.D.T; b.windMax = b.wind; yield b.wind; }
function* attendre(t) { let x = 0; while (x < t) { x += G.dtE; yield 0; } }

// ---------- Fabriques de dangers ----------
function EB(x, y, a, spd, o) {
  o = o || {};
  const b = {
    x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: o.r || 7, dmg: o.dmg || DMG(), life: o.life || 9,
    col: o.col || (G.boss ? G.boss.col : '#f55'), t: 0, hom: o.hom || 0, acc: o.acc || 0, angv: o.angv || 0,
    bounce: o.bounce || 0, split: o.split || null, des: o.des !== false, hp: o.hp || 0, delai: o.delai || 0,
    ext: !!o.ext, dedans: !o.ext, vmin: o.vmin || 0, src: o.src || G.atkCourante
  };
  G.eb.push(b);
  return b;
}
function anneauTirs(x, y, n, a0, spd, o) { for (let k = 0; k < n; k++) EB(x, y, a0 + k * TAU / n, spd, o); }
function zoneC(x, y, r, warn, o) { const h = Object.assign({ kind: 'cercle', x, y, r, warn, t: 0, act: .14, dmg: DMG(1.3), src: G.atkCourante }, o || {}); G.hz.push(h); Son.play('tele'); return h; }
function zoneR(x, y, w, h, warn, o) { const z = Object.assign({ kind: 'rect', x, y, w, h, warn, t: 0, act: .16, dmg: DMG(1.3), src: G.atkCourante }, o || {}); G.hz.push(z); return z; }
function rayon(x, y, a, len, w, warn, act, o) {
  const h = Object.assign({ kind: 'rayon', x, y, a, len, w, warn, act, t: 0, rot: 0, suit: null, track: 0, off: 0, L: len, dmg: DMG(1.25), src: G.atkCourante }, o || {});
  h.L = G.arene.rayMur(h.x, h.y, h.a, h.len);
  G.hz.push(h);
  return h;
}
function onde(x, y, spd, o) { const h = Object.assign({ kind: 'onde', x, y, r: 20, spd, th: 16, gaps: [], life: 4, t: 0, dmg: DMG(), src: G.atkCourante }, o || {}); G.hz.push(h); return h; }
function flaque(x, y, r, life) { G.hz.push({ kind: 'flaque', x, y, r, life, t: 0, dmg: DMG(.6), src: 'flaques' }); }

// ---------- Comportement des dangers ----------
const HZ = {
  cercle: {
    up(h, dt) {
      h.t += dt;
      if (h.t >= h.warn && !h.boom) { h.boom = true; h.at = 0; G.explo(h.x, h.y, h.r, h.col || ROUGE); Son.play('explo'); if (h.r > 100) G.secoue(5); }
      if (h.boom) { h.at += dt; if (h.at >= h.act) { h.dead = true; if (h.apres) h.apres(h); } }
    },
    hit(h, p) { return h.boom && !h.touche && d2(h.x, h.y, p.x, p.y) < (h.r + p.hr) ** 2; },
    draw(h, c) {
      if (!h.boom) {
        const k = clamp(h.t / h.warn, 0, 1);
        c.fillStyle = 'rgba(255,40,80,.10)'; c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,60,90,.28)'; c.beginPath(); c.arc(h.x, h.y, h.r * k, 0, TAU); c.fill();
        c.strokeStyle = k > .8 && (G.t * 20 | 0) % 2 ? '#fff' : ROUGE; c.lineWidth = 2;
        c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.stroke();
      } else {
        c.fillStyle = `rgba(255,220,200,${.7 * (1 - h.at / h.act)})`; c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.fill();
      }
    }
  },
  rect: {
    up(h, dt) {
      h.t += dt;
      if (h.t >= h.warn && !h.boom) { h.boom = true; h.at = 0; G.etincelle(h.x + h.w / 2, h.y + h.h / 2, ROUGE, 6); }
      if (h.boom) { h.at += dt; if (h.at >= h.act) h.dead = true; }
    },
    hit(h, p) { return h.boom && !h.touche && p.x > h.x - p.hr && p.x < h.x + h.w + p.hr && p.y > h.y - p.hr && p.y < h.y + h.h + p.hr; },
    draw(h, c) {
      if (!h.boom) {
        const k = clamp(h.t / h.warn, 0, 1);
        c.fillStyle = `rgba(255,40,80,${.08 + .22 * k})`; c.fillRect(h.x + 3, h.y + 3, h.w - 6, h.h - 6);
        c.strokeStyle = k > .8 && (G.t * 20 | 0) % 2 ? '#fff' : ROUGE; c.lineWidth = 2; c.strokeRect(h.x + 3, h.y + 3, h.w - 6, h.h - 6);
      } else { c.fillStyle = `rgba(255,220,200,${.75 * (1 - h.at / h.act)})`; c.fillRect(h.x, h.y, h.w, h.h); }
    }
  },
  rayon: {
    up(h, dt) {
      h.t += dt;
      if (h.suit) { if (h.suit.mort) h.suit = null; else { h.x = h.suit.x; h.y = h.suit.y; } }
      if (h.track && h.t < h.warn - .25) {
        const t = cible(), want = ang(h.x, h.y, t.x, t.y) + h.off, d = angDiff(h.a, want), m = h.track * dt;
        h.a += clamp(d, -m, m);
      }
      if (h.t >= h.warn) {
        if (h.balaye) {
          const s = h.balaye, k = (h.t - h.warn) / s.dur;
          const e = k <= 1 ? k : (s.retour ? 2 - k : 1), ee = e * e * (3 - 2 * e);
          h.a = lerp(s.de, s.vers, clamp(ee, 0, 1));
        } else h.a += h.rot * dt;
        if (!h.sonne && !h.alerte) { h.sonne = true; Son.play('salve'); }
      }
      h.L = G.arene.rayMur(h.x, h.y, h.a, h.len);
      if (h.t >= h.warn + h.act) h.dead = true;
    },
    hit(h, p) {
      if (h.alerte || h.t < h.warn) return false;
      return segD2(p.x, p.y, h.x, h.y, h.x + Math.cos(h.a) * h.L, h.y + Math.sin(h.a) * h.L) < (h.w / 2 + p.hr) ** 2;
    },
    draw(h, c) {
      const ex = h.x + Math.cos(h.a) * h.L, ey = h.y + Math.sin(h.a) * h.L;
      c.lineCap = 'round';
      if (h.t < h.warn) {
        const k = h.t / h.warn;
        if (h.balaye) {
          const s = h.balaye;
          c.fillStyle = 'rgba(255,40,80,.07)'; c.beginPath(); c.moveTo(h.x, h.y);
          c.arc(h.x, h.y, 900, Math.min(s.de, s.vers), Math.max(s.de, s.vers)); c.closePath(); c.fill();
        }
        c.strokeStyle = `rgba(255,40,80,${.08 + .18 * k})`; c.lineWidth = h.w; c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(ex, ey); c.stroke();
        c.strokeStyle = k > .8 && (G.t * 20 | 0) % 2 ? '#fff' : ROUGE; c.lineWidth = h.alerte ? 2 : 1.5;
        if (h.alerte) c.setLineDash([14, 10]);
        c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(ex, ey); c.stroke(); c.setLineDash([]);
      } else if (!h.alerte) {
        const fl = .85 + .15 * Math.sin(G.t * 60);
        c.strokeStyle = h.col || ROUGE; c.globalAlpha = .45; c.lineWidth = h.w * 1.2 * fl; c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(ex, ey); c.stroke();
        c.globalAlpha = 1; c.strokeStyle = '#ffd8e0'; c.lineWidth = h.w * .55; c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(ex, ey); c.stroke();
      }
      c.lineCap = 'butt';
    }
  },
  onde: {
    up(h, dt) { h.t += dt; h.r += h.spd * dt; if (h.t > h.life || h.r > 1500) h.dead = true; },
    hit(h, p) {
      const dd = Math.sqrt(d2(h.x, h.y, p.x, p.y));
      if (Math.abs(dd - h.r) > h.th / 2 + p.hr) return false;
      const a = ang(h.x, h.y, p.x, p.y);
      for (const g of h.gaps) if (Math.abs(angDiff(g[0], a)) < g[1] / 2) return false;
      return true;
    },
    draw(h, c) {
      c.strokeStyle = h.col || (G.boss ? G.boss.col : ROUGE); c.lineWidth = h.th;
      c.globalAlpha = Math.min(1, (h.life - h.t) * 2);
      if (!h.gaps.length) { c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.stroke(); }
      else {
        const g = h.gaps.map(x => [x[0] - x[1] / 2, x[0] + x[1] / 2]).sort((a, b) => a[0] - b[0]);
        for (let i = 0; i < g.length; i++) {
          const a0 = g[i][1], a1 = i + 1 < g.length ? g[i + 1][0] : g[0][0] + TAU;
          if (a1 > a0) { c.beginPath(); c.arc(h.x, h.y, h.r, a0, a1); c.stroke(); }
        }
      }
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.globalAlpha *= .5;
      c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.stroke();
      c.globalAlpha = 1;
    }
  },
  flaque: {
    up(h, dt) { h.t += dt; if (h.t > h.life) h.dead = true; },
    hit(h, p) { return h.t > .4 && d2(h.x, h.y, p.x, p.y) < (h.r * .9) ** 2; },
    draw(h, c) {
      const a = Math.min(1, h.t / .4, (h.life - h.t) / .6);
      c.globalAlpha = a * .55; c.fillStyle = '#7dff5a'; c.beginPath(); c.arc(h.x, h.y, h.r * (.95 + .05 * Math.sin(G.t * 5 + h.x)), 0, TAU); c.fill();
      c.globalAlpha = a; c.strokeStyle = '#c8ff9a'; c.lineWidth = 2; c.stroke(); c.globalAlpha = 1;
    }
  },
  mine: {
    up(h, dt) {
      h.t += dt;
      if (!h.etat && h.t > h.arme && (d2(h.x, h.y, G.p.x, G.p.y) < h.rd * h.rd || h.t > h.vie)) { h.etat = 1; h.bt = 0; Son.play('tele'); }
      if (h.etat === 1) { h.bt += dt; if (h.bt >= .5 * (G.boss ? G.boss.D.T : 1)) { h.etat = 2; G.explo(h.x, h.y, h.rb, ROUGE); Son.play('explo'); h.bt = 0; } }
      else if (h.etat === 2) { h.bt += dt; if (h.bt > .12) h.dead = true; }
    },
    hit(h, p) { return h.etat === 2 && !h.touche && d2(h.x, h.y, p.x, p.y) < (h.rb + p.hr) ** 2; },
    draw(h, c) {
      const on = h.t > h.arme;
      if (h.etat === 1) { c.fillStyle = 'rgba(255,40,80,.18)'; c.beginPath(); c.arc(h.x, h.y, h.rb, 0, TAU); c.fill(); c.strokeStyle = ROUGE; c.lineWidth = 2; c.stroke(); }
      if (h.etat === 2) return;
      c.fillStyle = on ? ((G.t * (h.etat ? 16 : 3) | 0) % 2 ? '#ff3355' : '#661020') : '#555';
      c.beginPath();
      for (let i = 0; i < 16; i++) { const rr = i % 2 ? 7 : 12, a = i * TAU / 16 + G.t; c.lineTo(h.x + Math.cos(a) * rr, h.y + Math.sin(a) * rr); }
      c.closePath(); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke();
      if (on && !h.etat) { c.strokeStyle = 'rgba(255,60,90,.25)'; c.setLineDash([4, 6]); c.beginPath(); c.arc(h.x, h.y, h.rd, 0, TAU); c.stroke(); c.setLineDash([]); }
    }
  }
};

// ---------- Catalogue des attaques ----------
const ATK = {};
function def(id, o) { o.id = id; ATK[id] = o; }

def('salve', {
  nom: 'Salve radiale', cat: 'balles', conseil: 'Place-toi entre deux balles. Chaque vague est un peu décalée : glisse dans le même sens qu\'elle.',
  params: (r, D, l) => ({ v: l ? 1 : r.int(2, 4), n: Math.round(r.int(12, 18) * D.C * (l ? .6 : 1)), spd: r.range(150, 205) * D.S * (l ? .75 : 1), dec: r.range(.1, .28) * r.sign(), gap: r.range(.4, .6) }),
  *gen(b, p) { yield* prep(b, .6); const a0 = R() * TAU; for (let i = 0; i < p.v; i++) { anneauTirs(b.x, b.y, p.n, a0 + i * p.dec, p.spd); Son.play('salve'); yield p.gap; } }
});
def('spirale', {
  nom: 'Spirale', cat: 'balles', conseil: 'Tourne autour du boss dans le même sens que la spirale, à bonne distance : les bras te passent à côté.',
  params: (r, D, l) => ({ bras: r.int(2, 4), dur: l ? 2.5 : r.range(3, 4.5), cad: r.range(7, 10) * D.C * (l ? .5 : 1), rot: r.range(1.1, 2) * r.sign() * D.S, spd: r.range(160, 210) * D.S, dbl: !l && r.chance(.3) }),
  *gen(b, p) {
    yield* prep(b, .6); let t = 0, acc = 0, a = R() * TAU; b.moveMul = .25;
    while (t < p.dur) {
      const dt = G.dtE; t += dt; acc += dt * p.cad; a += p.rot * dt;
      while (acc >= 1) { acc--; for (let k = 0; k < p.bras; k++) { EB(b.x, b.y, a + k * TAU / p.bras, p.spd, { r: 6 }); if (p.dbl) EB(b.x, b.y, -a + k * TAU / p.bras, p.spd * .8, { r: 6 }); } }
      yield 0;
    }
  }
});
def('rafale', {
  nom: 'Rafale visée', cat: 'balles', conseil: 'Les balles visent où tu seras : change de direction au dernier moment plutôt que de courir tout droit.',
  params: (r, D) => ({ rep: r.int(2, 4), n: r.int(3, 6), spd: r.range(300, 380) * D.S, avance: r.chance(.5), ecart: r.range(0, .12) }),
  *gen(b, p) {
    yield* prep(b, .45);
    for (let i = 0; i < p.rep; i++) { for (let k = 0; k < p.n; k++) { const a = p.avance ? viseAvance(b, p.spd) : vise(b); EB(b.x, b.y, a + R.range(-p.ecart, p.ecart), p.spd, { r: 6 }); Son.play('tir'); yield .08; } yield .45; }
  }
});
def('eventail', {
  nom: 'Éventail', cat: 'balles', conseil: 'Recule pour que les balles s\'écartent, puis passe dans un trou. Les vagues alternent leurs trous.',
  params: (r, D) => ({ rep: r.int(2, 4), n: Math.round(r.int(7, 11) * D.C), arc: r.range(.9, 1.5), spd: r.range(200, 260) * D.S }),
  *gen(b, p) {
    yield* prep(b, .55);
    for (let i = 0; i < p.rep; i++) {
      const a = vise(b), st = p.arc / (p.n - 1);
      for (let k = 0; k < p.n; k++) EB(b.x, b.y, a - p.arc / 2 + k * st + (i % 2 ? st / 2 : 0), p.spd);
      Son.play('salve'); yield .5;
    }
  }
});
def('charge', {
  nom: 'Charge', cat: 'corps', conseil: 'La ligne pointillée se fige juste avant la charge : esquive sur le côté à ce moment. S\'il fonce dans un pilier, il reste étourdi !',
  params: (r, D) => ({ rep: r.int(1, 3), vit: r.range(850, 1050) * D.S, traine: r.chance(.45), choc: r.chance(.5) }),
  *gen(b, p) {
    for (let i = 0; i < p.rep; i++) {
      b.ctl = true;
      const warn = .8 * b.D.T;
      const ray = rayon(b.x, b.y, vise(b), 1400, b.r * 2, warn, 0, { alerte: true, suit: b, track: 6 });
      b.wind = warn; b.windMax = warn;
      yield* attendre(warn);
      const a = ray.a; let tt = 0, drop = 0;
      b.charge = true;
      while (true) {
        const dt = G.dtE; b.x += Math.cos(a) * p.vit * dt; b.y += Math.sin(a) * p.vit * dt; tt += dt;
        if (p.traine && tt - drop > .06) { drop = tt; EB(b.x, b.y, a + Math.PI / 2, 90, { r: 6 }); EB(b.x, b.y, a - Math.PI / 2, 90, { r: 6 }); }
        if (G.arene.pilierTouche(b.x, b.y, b.r)) { b.charge = false; G.arene.contenir(b, b.r); G.secoue(12); Son.play('gros'); G.etourdir(b, 1.8, 'Assommé contre le pilier !'); b.ctl = false; return; }
        if (!G.arene.dedans(b.x, b.y, b.r) || tt > 2) { G.arene.contenir(b, b.r); break; }
        yield 0;
      }
      b.charge = false; G.secoue(8); Son.play('explo');
      if (p.choc) anneauTirs(b.x, b.y, 16, R() * TAU, 170 * b.D.S);
      yield .45;
    }
    b.ctl = false;
  }
});
def('bond', {
  nom: 'Bond écrasant', cat: 'corps', conseil: 'Sors du cercle rouge avant qu\'il atterrisse. L\'onde qui suit se passe avec une esquive (invincibilité) ou en s\'éloignant.',
  params: (r, D) => ({ rep: r.int(1, 3), r: r.range(110, 140), onde: r.chance(.6), balles: r.chance(.45) }),
  *gen(b, p) {
    b.ctl = true;
    for (let i = 0; i < p.rep; i++) {
      const t = cible(), pt = G.arene.clampPt(t.x, t.y, b.r), warn = 1 * b.D.T;
      zoneC(pt.x, pt.y, p.r, warn, { dmg: DMG(1.4) });
      b.air = true; const sx = b.x, sy = b.y; let tt = 0;
      while (tt < warn) { tt += G.dtE; const k = Math.min(1, tt / warn); b.x = lerp(sx, pt.x, k); b.y = lerp(sy, pt.y, k); b.haut = Math.sin(k * Math.PI) * 120; yield 0; }
      b.air = false; b.haut = 0; G.secoue(10); Son.play('gros');
      if (p.onde) onde(pt.x, pt.y, 300 * b.D.S, { th: 18, r: p.r * .5, life: 3 });
      if (p.balles) anneauTirs(pt.x, pt.y, 18, R() * TAU, 190 * b.D.S);
      yield .55;
    }
    b.ctl = false;
  }
});
def('lasers', {
  nom: 'Lasers tournants', cat: 'rayon', conseil: 'Reste loin du boss : les rayons y sont plus espacés. Tourne avec eux, et attention s\'ils changent de sens.',
  params: (r, D) => ({ n: r.int(2, 5), dur: r.range(2.6, 3.6), rot: r.range(.5, .85) * r.sign() * D.S, inv: r.chance(.35) }),
  *gen(b, p) {
    b.ctl = true;
    const a0 = vise(b) + Math.PI / p.n, warn = 1 * b.D.T, beams = [];
    b.wind = warn; b.windMax = warn;
    for (let k = 0; k < p.n; k++) beams.push(rayon(b.x, b.y, a0 + k * TAU / p.n, 1500, 26, warn, p.dur, { suit: b, rot: p.rot }));
    let t = 0, flip = false;
    while (t < warn + p.dur) { t += G.dtE; if (p.inv && !flip && t > warn + p.dur / 2) { flip = true; beams.forEach(h => h.rot = -h.rot); } yield 0; }
    b.ctl = false;
    yield .3;
  }
});
def('rayon', {
  nom: 'Rayon visé', cat: 'rayon', conseil: 'Le rayon te suit puis se fige un instant avant de tirer : bouge juste après qu\'il se fige.',
  params: (r, D) => ({ rep: r.int(2, 3), w: r.range(30, 40), multi: r.pick([1, 1, 3]), ecart: r.range(.3, .45) }),
  *gen(b, p) {
    for (let i = 0; i < p.rep; i++) {
      const warn = .9 * b.D.T, a = vise(b);
      b.wind = warn; b.windMax = warn;
      for (let m = 0; m < p.multi; m++) { const off = (m - (p.multi - 1) / 2) * p.ecart; rayon(b.x, b.y, a + off, 1500, p.w, warn, .35, { suit: b, track: 3.5, off }); }
      yield* attendre(warn + .35); yield .25;
    }
  }
});
def('meteores', {
  nom: 'Pluie de météores', cat: 'zone', conseil: 'Le premier tombe toujours sur toi : bouge sans arrêt et ne reviens pas sur un cercle qui n\'a pas encore explosé.',
  params: (r, D) => ({ n: Math.round(r.int(8, 13) * D.C), r: r.range(60, 85), pas: r.range(.11, .18) }),
  *gen(b, p) {
    yield* prep(b, .4);
    for (let i = 0; i < p.n; i++) {
      const t = cible(); let pt;
      if (i === 0) pt = { x: t.x, y: t.y };
      else if (R() < .55) { const a = R() * TAU, dd = R() * 170; pt = G.arene.clampPt(t.x + Math.cos(a) * dd, t.y + Math.sin(a) * dd, 0); }
      else pt = G.arene.pointAuHasard(40);
      zoneC(pt.x, pt.y, p.r, 1.1 * b.D.T);
      yield p.pas;
    }
    yield .5;
  }
});
function murBalles(cote, spd, trou) {
  const bb = G.arene.bb(), pas = 30;
  const horiz = cote < 2; // 0 gauche→droite, 1 droite→gauche, 2 haut→bas, 3 bas→haut
  const L = horiz ? bb.h : bb.w, g = trou / 2 + R() * (L - trou);
  for (let s = pas / 2; s < L; s += pas) {
    if (Math.abs(s - g) < trou / 2) continue;
    if (cote === 0) EB(bb.x + 2, bb.y + s, 0, spd, { ext: true });
    else if (cote === 1) EB(bb.x + bb.w - 2, bb.y + s, Math.PI, spd, { ext: true });
    else if (cote === 2) EB(bb.x + s, bb.y + 2, Math.PI / 2, spd, { ext: true });
    else EB(bb.x + s, bb.y + bb.h - 2, -Math.PI / 2, spd, { ext: true });
  }
}
def('mur', {
  nom: 'Murs de balles', cat: 'balles', conseil: 'Repère le trou de chaque mur dès qu\'il apparaît et place-toi en face à l\'avance.',
  params: (r, D) => ({ n: r.int(3, 5), spd: r.range(170, 220) * D.S, pas: r.range(.85, 1.1), croise: r.chance(.4), trou: r.range(105, 130) }),
  *gen(b, p) {
    yield* prep(b, .5);
    const c0 = R.int(0, 3);
    for (let i = 0; i < p.n; i++) { murBalles(p.croise ? [c0, c0 ^ 2, c0 ^ 1, c0 ^ 3][i % 4] : c0, p.spd, p.trou); Son.play('salve'); yield p.pas; }
  }
});
def('croix', {
  nom: 'Croix de feu', cat: 'rayon', conseil: 'Les lignes se croisent sur toi : sors en diagonale, pas en ligne droite. La croix suivante tourne de 45°.',
  params: (r, D) => ({ rep: r.int(2, 3), w: r.range(40, 52) }),
  *gen(b, p) {
    yield* prep(b, .4);
    for (let i = 0; i < p.rep; i++) {
      const t = cible(), base = i % 2 ? Math.PI / 4 : 0, warn = 1 * b.D.T;
      for (let k = 0; k < 4; k++) rayon(t.x, t.y, base + k * Math.PI / 2, 1600, p.w, warn, .25);
      yield warn + .4;
    }
  }
});
def('chercheurs', {
  nom: 'Âmes chercheuses', cat: 'balles', conseil: 'Elles te suivent mais tournent mal : fais-les se croiser, ou détruis-les avec tes tirs (un seul tir suffit).',
  params: (r, D) => ({ n: Math.round(r.int(4, 7) * D.C), spd: r.range(140, 175) * D.S, turn: r.range(1.4, 2.1) }),
  *gen(b, p) {
    yield* prep(b, .5);
    for (let k = 0; k < p.n; k++) { const a = k * TAU / p.n; EB(b.x + Math.cos(a) * b.r, b.y + Math.sin(a) * b.r, a, p.spd, { r: 10, hom: p.turn, life: 5.5, hp: 1, col: '#ff5ad8' }); yield .07; }
    yield .9;
  }
});
def('anneaux', {
  nom: 'Ondes concentriques', cat: 'zone', conseil: 'Chaque onde a un ou deux trous : place-toi dedans, ou traverse-la avec ton talent d\'esquive.',
  params: (r, D) => ({ n: r.int(3, 5), spd: r.range(210, 260) * D.S, trous: r.int(1, 2), pas: r.range(.6, .85) }),
  *gen(b, p) {
    yield* prep(b, .5);
    for (let i = 0; i < p.n; i++) {
      const gaps = []; for (let g = 0; g < p.trous; g++) gaps.push([R() * TAU, .62]);
      onde(b.x, b.y, p.spd, { gaps, th: 16, r: b.r }); Son.play('salve'); yield p.pas;
    }
  }
});
def('cage', {
  nom: 'Cage', cat: 'balles', conseil: 'Un cercle de balles se forme autour de toi : fonce vers le trou avant qu\'elles se resserrent.',
  params: (r, D) => ({ rep: r.int(1, 2), n: Math.round(34 * Math.min(1.4, D.C)), spd: r.range(110, 140) * D.S, R: r.range(270, 330) }),
  *gen(b, p) {
    yield* prep(b, .4);
    for (let i = 0; i < p.rep; i++) {
      const t = cible(), ga = R() * TAU, wait = .7 * b.D.T;
      for (let k = 0; k < p.n; k++) {
        const a = k * TAU / p.n; if (Math.abs(angDiff(a, ga)) < .3) continue;
        EB(t.x + Math.cos(a) * p.R, t.y + Math.sin(a) * p.R, a + Math.PI, p.spd, { r: 7, ext: true, delai: wait, life: wait + 2 * p.R / p.spd + 1 });
      }
      Son.play('tele');
      yield wait + 1.2;
    }
  }
});
def('vortex', {
  nom: 'Vortex', cat: 'balles', conseil: 'Il t\'aspire : cours à contre-sens en permanence et faufile-toi entre les bras de la spirale.',
  params: (r, D) => ({ dur: r.range(3, 4), force: r.range(120, 160) * D.S, bras: r.int(2, 3), cad: r.range(4.5, 6.5) }),
  *gen(b, p) {
    yield* prep(b, .6); b.ctl = true;
    let t = 0, acc = 0, a = R() * TAU;
    while (t < p.dur) {
      const dt = G.dtE; t += dt; acc += dt * p.cad; a += 1.4 * dt;
      G.aspiration = { x: b.x, y: b.y, f: p.force, t: .1 };
      while (acc >= 1) { acc--; for (let k = 0; k < p.bras; k++) EB(b.x, b.y, a + k * TAU / p.bras, 150 * b.D.S, { r: 7 }); }
      yield 0;
    }
    b.ctl = false;
  }
});
def('telenova', {
  nom: 'Téléportation explosive', cat: 'corps', conseil: 'Le cercle montre où il va réapparaître : sors-en, puis évite l\'anneau de balles qu\'il lâche en arrivant.',
  params: (r, D) => ({ rep: r.int(2, 4), n: Math.round(r.int(14, 19) * D.C), spd: r.range(170, 210) * D.S }),
  *gen(b, p) {
    b.ctl = true;
    for (let i = 0; i < p.rep; i++) {
      const t = cible(), pt = G.arene.clampPt(t.x, t.y, b.r), warn = .85 * b.D.T;
      zoneC(pt.x, pt.y, b.r + 22, warn, { dmg: DMG(1.2) });
      let tt = 0; while (tt < warn) { tt += G.dtE; b.alpha = 1 - tt / warn; yield 0; }
      G.fx.push({ kind: 'fantome', x: b.x, y: b.y, t: 0, dur: .3, r: b.r });
      b.x = pt.x; b.y = pt.y; b.alpha = 1;
      anneauTirs(b.x, b.y, p.n, R() * TAU, p.spd);
      yield .45;
    }
    b.ctl = false;
  }
});
def('balayage', {
  nom: 'Balayage', cat: 'rayon', conseil: 'La zone pâle montre tout l\'arc balayé : sors-en, ou passe derrière le boss au bon moment.',
  params: (r, D) => ({ dur: r.range(1.4, 1.9) / D.S, arc: r.range(2.6, 3.4), w: r.range(50, 64), retour: r.chance(.35) }),
  *gen(b, p) {
    b.ctl = true;
    const a = vise(b), s = R.sign(), de = a - s * p.arc / 2, warn = 1 * b.D.T;
    b.wind = warn; b.windMax = warn;
    rayon(b.x, b.y, de, 1500, p.w, warn, p.dur * (p.retour ? 2 : 1), { suit: b, balaye: { de, vers: de + s * p.arc, dur: p.dur, retour: p.retour } });
    yield* attendre(warn + p.dur * (p.retour ? 2 : 1));
    b.ctl = false;
    yield .3;
  }
});
def('rebonds', {
  nom: 'Balles rebondissantes', cat: 'balles', conseil: 'Elles rebondissent sur les murs : reste au centre de l\'arène, c\'est là qu\'il y a le plus de place.',
  params: (r, D, l) => ({ n: Math.round(r.int(5, 8) * D.C * (l ? .6 : 1)), spd: r.range(210, 260) * D.S, reb: r.int(3, 5) }),
  *gen(b, p) { yield* prep(b, .5); for (let k = 0; k < p.n; k++) { EB(b.x, b.y, R() * TAU, p.spd, { r: 9, bounce: p.reb, life: 7 }); yield .05; } yield .6; }
});
def('fragmentation', {
  nom: 'Fragmentation', cat: 'balles', conseil: 'Les grosses boules éclatent en anneau : éloigne-toi d\'elles, ou détruis-les à coups de tirs avant qu\'elles n\'éclatent.',
  params: (r, D) => ({ k: r.int(2, 3), n: Math.round(r.int(12, 16) * D.C), spd: r.range(160, 200) * D.S, t: r.range(1.2, 1.6) }),
  *gen(b, p) {
    yield* prep(b, .55);
    for (let i = 0; i < p.k; i++) { EB(b.x, b.y, vise(b) + (i - (p.k - 1) / 2) * .5, 170 * b.D.S, { r: 18, hp: 70 * (1 + .06 * G.salle), split: { t: p.t, n: p.n, spd: p.spd } }); yield .25; }
    yield .8;
  }
});
def('invocation', {
  nom: 'Invocation', cat: 'invoc', conseil: 'Tue les invocations vite (les grenades, l\'éclair et les zones aident) ou elles finiront par te submerger.',
  params: (r, D) => ({ n: Math.min(4, Math.round(r.int(2, 3) * Math.min(1.5, D.C))) }),
  *gen(b, p) {
    yield* prep(b, .7);
    const n = Math.min(p.n, 7 - G.minions.length);
    for (let i = 0; i < n; i++) { const pt = G.arene.pointAuHasard(60, 200); G.invoquer(b.def.invoc, pt.x, pt.y); yield .12; }
    yield .8;
  }
});
def('flaques', {
  nom: 'Flaques toxiques', cat: 'zone', conseil: 'Les flaques restent 6 s : garde toujours un chemin libre pour la suite du combat.',
  params: (r, D) => ({ n: Math.round(r.int(5, 7) * D.C), r: r.range(60, 78) }),
  *gen(b, p) {
    yield* prep(b, .5);
    for (let i = 0; i < p.n; i++) {
      const t = cible(), a = R() * TAU, dd = i ? 60 + R() * 200 : 0, pt = G.arene.clampPt(t.x + Math.cos(a) * dd, t.y + Math.sin(a) * dd, 0);
      zoneC(pt.x, pt.y, p.r, .95 * b.D.T, { dmg: DMG(), col: '#7dff5a', apres: h => flaque(h.x, h.y, h.r, 6) });
      yield .12;
    }
    yield .6;
  }
});
def('damier', {
  nom: 'Damier', cat: 'zone', conseil: 'Une case sur deux explose, puis les autres : saute sur une case qui vient d\'exploser.',
  params: (r, D) => ({ cell: r.pick([130, 150, 170]), rep: r.int(1, 2) }),
  *gen(b, p) {
    yield* prep(b, .5);
    const bb = G.arene.bb(), nc = Math.ceil(bb.w / p.cell), nr = Math.ceil(bb.h / p.cell), warn = 1.1 * b.D.T;
    const cw = bb.w / nc, ch = bb.h / nr;
    for (let r = 0; r < p.rep; r++) for (const par of [0, 1]) {
      for (let i = 0; i < nc; i++) for (let j = 0; j < nr; j++) if ((i + j) % 2 === par) zoneR(bb.x + i * cw, bb.y + j * ch, cw, ch, warn);
      Son.play('tele');
      yield warn + .3;
    }
  }
});
def('petales', {
  nom: 'Fleur de balles', cat: 'balles', conseil: 'Les balles tournent en courbe : observe dans quel sens elles s\'enroulent et va du côté opposé.',
  params: (r, D) => ({ v: r.int(3, 4), n: Math.round(r.int(10, 14) * D.C), spd: r.range(170, 210) * D.S, angv: r.range(.8, 1.4) }),
  *gen(b, p) { yield* prep(b, .55); for (let i = 0; i < p.v; i++) { const a0 = R() * TAU; for (let k = 0; k < p.n; k++) EB(b.x, b.y, a0 + k * TAU / p.n, p.spd, { angv: p.angv * (i % 2 ? 1 : -1), r: 7 }); Son.play('salve'); yield .55; } }
});
def('echos', {
  nom: 'Échos', cat: 'rayon', conseil: 'Des échos t\'encerclent et tirent tous sur l\'endroit où tu étais : bouge dès qu\'ils apparaissent.',
  params: (r, D) => ({ n: r.int(3, 4), rep: r.int(1, 2) }),
  *gen(b, p) {
    yield* prep(b, .4);
    for (let r = 0; r < p.rep; r++) {
      const t = cible(), a0 = R() * TAU, warn = .95 * b.D.T;
      for (let k = 0; k < p.n; k++) {
        const a = a0 + k * TAU / p.n, pt = G.arene.clampPt(t.x + Math.cos(a) * 280, t.y + Math.sin(a) * 280, 20);
        G.fx.push({ kind: 'echo', x: pt.x, y: pt.y, t: 0, dur: warn + .3 });
        rayon(pt.x, pt.y, ang(pt.x, pt.y, t.x, t.y), 1500, 30, warn, .3);
      }
      yield warn + .45;
    }
  }
});
def('pluie', {
  nom: 'Averse', cat: 'balles', conseil: 'Les balles tombent du haut : reste en bas de l\'arène, elles arrivent plus espacées, et regarde vers le haut.',
  params: (r, D, l) => ({ dur: l ? 3 : r.range(2.6, 3.4), cad: r.range(14, 20) * D.C * (l ? .4 : 1), spd: r.range(220, 280) * D.S * (l ? .8 : 1), pente: r.range(-.35, .35) }),
  *gen(b, p) {
    yield* prep(b, .45);
    let t = 0, acc = 0;
    while (t < p.dur) {
      const dt = G.dtE; t += dt; acc += dt * p.cad;
      while (acc >= 1) { acc--; const bb = G.arene.bb(); EB(bb.x + R() * bb.w, bb.y + 2, Math.PI / 2 + p.pente, p.spd, { r: 6, ext: true }); }
      yield 0;
    }
  }
});
def('mines', {
  nom: 'Champ de mines', cat: 'zone', conseil: 'Les mines explosent si tu t\'approches (cercle pointillé) ou au bout de 7 s : garde tes distances.',
  params: (r, D) => ({ n: Math.round(r.int(6, 9) * D.C) }),
  *gen(b, p) {
    yield* prep(b, .5);
    for (let k = 0; k < p.n; k++) {
      let pt, essai = 0;
      do { pt = G.arene.pointAuHasard(40); essai++; } while (essai < 20 && d2(pt.x, pt.y, G.p.x, G.p.y) < 140 * 140);
      G.hz.push({ kind: 'mine', x: pt.x, y: pt.y, t: 0, arme: .8, vie: 7 + R() * 1.5, rd: 78, rb: 95, etat: 0, dmg: DMG(1.3), src: 'mines' });
      yield .08;
    }
    yield .4;
  }
});

const ATK_IDS = Object.keys(ATK);
const ATK_FOND = ['salve', 'spirale', 'rebonds', 'pluie'];
