'use strict';
/* Colosses — l'arsenal : armes principales (type 1), attaques spéciales (type 2), talents (type 3),
   et les améliorations définitives gagnées sur les méga boss. */

// ---------- Améliorations définitives ----------
const UPG = {
  p: [
    { id: 'dmg', nom: 'Puissance', ico: '💥', desc: '+10 % de dégâts des armes principales' },
    { id: 'cad', nom: 'Cadence', ico: '⚡', desc: '+7 % de cadence de tir (et charge plus vite)' },
    { id: 'vel', nom: 'Vélocité', ico: '➶', desc: '+8 % de vitesse et de portée des tirs' },
    { id: 'crit', nom: 'Critique', ico: '✦', desc: '+3 % de chances de coup critique (×2)', max: 17 }
  ],
  s: [
    { id: 'dmg', nom: 'Dévastation', ico: '☄', desc: '+12 % de dégâts des attaques spéciales' },
    { id: 'cout', nom: 'Économie', ico: '◇', desc: '−5 % de coût en énergie' },
    { id: 'rech', nom: 'Recharge', ico: '⟳', desc: '−6 % de temps de recharge' },
    { id: 'res', nom: 'Réservoir', ico: '▮', desc: '+12 d\'énergie max et +10 % d\'énergie gagnée' },
    { id: 'amp', nom: 'Ampleur', ico: '◎', desc: '+8 % de zone et de durée' }
  ],
  t: [
    { id: 'rech', nom: 'Réflexes', ico: '⟳', desc: '−6 % de recharge des talents' },
    { id: 'port', nom: 'Allonge', ico: '↗', desc: '+8 % de distance et de durée des talents' },
    { id: 'intan', nom: 'Intangibilité', ico: '◌', desc: '+0,03 s d\'invincibilité sur les talents' },
    { id: 'charge', nom: 'Charge en plus', ico: '✚', desc: '+1 utilisation d\'affilée du talent', max: 2 }
  ]
};
const CAT_NOM = { p: 'Armes principales', s: 'Attaques spéciales', t: 'Talents' };
function lv(cat, id) { return 0; } // la puissance ne progresse plus : seules les apparences, la forge et les affinités changent
let ST = null;
function calcStats() {
  ST = {
    pDmg: 1 + .10 * lv('p', 'dmg'), pCad: 1 + .07 * lv('p', 'cad'), pVel: 1 + .08 * lv('p', 'vel'), pCrit: Math.min(.51, .03 * lv('p', 'crit')),
    sDmg: 1 + .12 * lv('s', 'dmg'), sCout: Math.max(.4, Math.pow(.95, lv('s', 'cout'))), sRech: Math.max(.35, Math.pow(.94, lv('s', 'rech'))),
    eMax: 100 + 12 * lv('s', 'res'), eGain: 1 + .1 * lv('s', 'res'), sAmp: 1 + .08 * lv('s', 'amp'),
    tRech: Math.max(.35, Math.pow(.94, lv('t', 'rech'))), tPort: 1 + .08 * lv('t', 'port'), tIntan: .03 * lv('t', 'intan'),
    tCharges: 1 + Math.min(2, lv('t', 'charge'))
  };
  // reliques : un avantage, un défaut
  if (aRelique('frenesie')) { ST.pCad *= 1.15; ST.pDmg *= .85; }
  if (aRelique('precision')) { ST.pCrit += .12; ST.pCad *= .85; }
  if (aRelique('batterie')) { ST.eGain *= 1.4; ST.pDmg *= .88; }
  if (aRelique('economie')) { ST.sCout *= .75; ST.sRech *= 1.35; }
  if (aRelique('reflexes')) { ST.tRech *= .75; ST.pDmg *= .9; ST.sDmg *= .9; }
  if (aRelique('reserve')) { ST.tCharges += 1; ST.tRech *= 1.45; }
  if (aRelique('egide')) ST.tRech *= 1.3;
  if (aRelique('verre')) ST.pDmg *= 1.25;
  if (aRelique('tempete')) ST.pDmg *= .88;
  try { const m = modForge(); if (m.portee) ST.pVel *= m.portee; } catch (e) { }
  if (enDefi()) {
    if (G.mut('energie')) ST.sCout = 0;
    if (G.mut('reflexes')) ST.tRech *= .5;
    if (G.mut('colosses')) ST.pDmg *= 1.25;
  }
  return ST;
}
calcStats();

// équilibrage mesuré (dégâts par seconde sur cible fixe) : les armes techniques gardent un léger avantage
const PRIM_EQ = { iaido: .53, rattrape: .6, ricochets: .5, jumelles: .72, surchauffe: .75, laser: .7, meteorite: .8, shuriken: .67, echo: .83, sniper: .8, pompe: .88,
  ronceLance: .52, foreuse: .73, lameSpectrale: .82, hachettes: .79, prisme: 1.26, harpon: 1.3, lucioles: 2.4, glaive: 2.2,
  boomerang: .83, croix: 1.05, grenades: 1.05, foudre: 1.05, faux: 1.35, pistolet: 1.3, roquettes: 1.25, orbes: 1.2, mitra: 1.25, railgun: 1.9, plasma: 2, gravite: 1.3, fouet: 1.15 };

// ---------- Tirs du joueur ----------
function pShot(x, y, a, spd, o) {
  const b = {
    x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, a,
    r: o.r || 4, dmg: (o.dmg || 10) * ST.pDmg, life: (o.life || 1) * (o.noVel ? 1 : ST.pVel), t: 0,
    pierce: o.pierce || 0, hits: new Set(), col: o.col || '#7ff', kind: o.kind || 'balle',
    hom: o.hom || 0, crit: o.crit || 0, spec: !!o.spec, up: o.up || null, grow: o.grow || 0, cassable: o.cassable !== false
  };
  if (o.spec) b.dmg = o.dmg * ST.sDmg;
  else { if (b.kind !== 'flamme' && G.fx.length < 260 && (G.muzzleT || 0) < G.t) { G.muzzleT = G.t + .05; G.fx.push({ kind: 'muzzle', x, y, a, t: 0, dur: .07 }); } const mf = modForge(); if (mf.pierce) b.pierce += mf.pierce; if (mf.hom && !b.hom) b.hom = mf.hom; if (mf.taille) b.r *= mf.taille; if (mf.vit) { b.vx *= mf.vit; b.vy *= mf.vit; } if (mf.eclat) b.eclat = true; }
  G.pb.push(b);
  return b;
}
function cadence(w, dt, held, iv) {
  const mf = modForge(); iv /= (mf.cad || 1);
  w.cd -= dt;
  let n = 0;
  if (held) { while (w.cd <= 0 && n < 4) { w.cd += iv; n++; if (mf.echo && R() < mf.echo) n++; } }
  else if (w.cd < 0) w.cd = 0;
  return n;
}
function bout(p, d) { return { x: p.x + Math.cos(p.aim) * d, y: p.y + Math.sin(p.aim) * d }; }

// ---------- Type 1 : armes principales ----------
const PRIM = [
  {
    id: 'blaster', nom: 'Blaster', ico: '🔫', desc: 'Tirs rapides et précis, fiables à toute distance.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .125 / ST.pCad);
      for (let i = 0; i < n; i++) { const o = bout(p, 16); pShot(o.x, o.y, p.aim + R.range(-.03, .03), 900 * ST.pVel, { dmg: 13, r: 4, life: 1.1 }); Son.play('tir'); }
    }
  },
  {
    id: 'pompe', nom: 'Fusil à pompe', ico: '💢', desc: 'Gerbe de 7 plombs. Énorme de près, inutile de loin.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .75 / ST.pCad);
      for (let i = 0; i < n; i++) {
        const o = bout(p, 16);
        for (let k = 0; k < 7; k++) pShot(o.x, o.y, p.aim + R.range(-.28, .28), R.range(750, 1000) * ST.pVel, { dmg: 15, r: 4, life: .3, col: '#ffd27f' });
        Son.play('tir'); G.recul(p, 60);
      }
    }
  },
  {
    id: 'flammes', nom: 'Lance-flammes', ico: '🔥', desc: 'Flot continu de flammes qui traversent tout. Courte portée.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .04 / ST.pCad);
      for (let i = 0; i < n; i++) { const o = bout(p, 14); pShot(o.x, o.y, p.aim + R.range(-.16, .16), R.range(380, 460) * ST.pVel, { dmg: 5.2, r: 6, life: .45, pierce: 99, kind: 'flamme', grow: 30, col: '#ff9a3c', cassable: false }); }
    }
  },
  {
    id: 'arc', nom: 'Arc chargé', ico: '🏹', desc: 'Maintiens pour bander l\'arc, relâche pour tirer. Flèche pleine charge : perce et frappe très fort.',
    tick(w, p, dt, held) {
      // maintenir = l'arc se bande et tire tout seul à pleine charge ; relâcher tôt tire une flèche faible
      w.ch = w.ch || 0; w.cdTir = Math.max(0, (w.cdTir || 0) - dt);
      const tirer = () => {
        const c = w.ch, o = bout(p, 16);
        pShot(o.x, o.y, p.aim, (650 + 950 * c) * ST.pVel, { dmg: 128 * Math.pow(c, 1.6), r: 3 + 3 * c, life: 1.2, pierce: c >= 1 ? 4 : 0, kind: 'fleche', col: c >= 1 ? '#fff6a0' : '#bfe' });
        Son.play('tir'); w.ch = 0; w.cdTir = .2;
      };
      if (held && w.cdTir <= 0) { w.ch = Math.min(1, w.ch + dt * ST.pCad / .85); p.lent = Math.min(p.lent, .7); if (w.ch >= 1) tirer(); }
      else if (!held && w.ch > .05) tirer();
      else if (!held) w.ch = 0;
    }
  },
  {
    id: 'epee', nom: 'Épée', ico: '🗡', desc: 'Grands coups au corps à corps. Tranche aussi les projectiles ennemis (pas les rayons).',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .42 / ST.pCad);
      if (n) {
        w.sens = -(w.sens || 1);
        const reach = 105 * ST.pVel;
        G.fx.push({ kind: 'taillade', x: p.x, y: p.y, a: p.aim, sens: w.sens, t: 0, dur: .16, reach });
        for (const tg of G.cibles()) {
          if (Math.sqrt(d2(p.x, p.y, tg.x, tg.y)) - tg.r < reach && Math.abs(angDiff(p.aim, ang(p.x, p.y, tg.x, tg.y))) < 1.05)
            G.frappe(tg, 54 * ST.pDmg, { prim: true, x: tg.x, y: tg.y });
        }
        for (const e of G.eb) if (e.des && d2(p.x, p.y, e.x, e.y) < (reach + e.r) ** 2 && Math.abs(angDiff(p.aim, ang(p.x, p.y, e.x, e.y))) < 1.05) { e.dead = true; G.etincelle(e.x, e.y, '#fff', 3); }
        Son.play('epee');
        p.vx += Math.cos(p.aim) * 90; p.vy += Math.sin(p.aim) * 90;
      }
    }
  },
  {
    id: 'mitra', nom: 'Mitrailleuse', ico: '⁂', desc: 'Déluge de balles. Plus tu tires longtemps, plus elle s\'écarte.',
    tick(w, p, dt, held) {
      w.heat = Math.max(0, (w.heat || 0) - dt * (held ? 0 : 2.5));
      const n = cadence(w, dt, held, .066 / ST.pCad);
      for (let i = 0; i < n; i++) {
        w.heat = Math.min(1, w.heat + .06);
        const o = bout(p, 16);
        pShot(o.x, o.y, p.aim + R.range(-1, 1) * (.04 + .22 * w.heat), 1000 * ST.pVel, { dmg: 7, r: 3, life: .9, col: '#ffe680' });
        Son.play('tir');
      }
    }
  },
  {
    id: 'laser', nom: 'Rayon continu', ico: '〰', desc: 'Un rayon permanent dont les dégâts montent tant qu\'il reste sur la cible. Ralentit un peu.',
    tick(w, p, dt, held) {
      w.ramp = w.ramp || 0;
      w.beam = null;
      if (!held) { w.ramp = Math.max(0, w.ramp - dt * 2); return; }
      p.lent = Math.min(p.lent, .75);
      const o = bout(p, 14), max = 640 * ST.pVel;
      const ray = G.lancerRayon(o.x, o.y, p.aim, max, 6);
      w.beam = { x1: o.x, y1: o.y, x2: ray.x, y2: ray.y, ramp: w.ramp };
      if (ray.cible) { w.ramp = Math.min(1, w.ramp + dt / 2.2); G.frappe(ray.cible, (55 + 125 * w.ramp) * dt * ST.pDmg * (1 + ST.pCrit), { prim: true, x: ray.x, y: ray.y, continu: true }); }
      else w.ramp = Math.max(0, w.ramp - dt * .8);
    }
  },
  {
    id: 'boomerang', nom: 'Boomerang', ico: '🪃', desc: 'Lancé vers le viseur, il revient vers toi en touchant tout à l\'aller ET au retour.',
    tick(w, p, dt, held) {
      w.cd = (w.cd || 0) - dt;
      const out = G.pb.filter(b => b.kind === 'boom').length;
      if (held && w.cd <= 0 && out < 2) {
        w.cd = .6 / ST.pCad;
        const o = bout(p, 18);
        const b = pShot(o.x, o.y, p.aim, 760 * ST.pVel, { dmg: 40, r: 11, life: 9, pierce: 99, kind: 'boom', col: '#9fffb0', noVel: true, cassable: false });
        b.dist = 0; b.retour = false; b.portee = 420 * ST.pVel;
        b.up = (b, dt) => {
          const sp = Math.hypot(b.vx, b.vy);
          if (!b.retour) {
            b.dist += sp * dt;
            if (b.dist >= b.portee) { b.retour = true; b.hits.clear(); }
          } else {
            const a = ang(b.x, b.y, G.p.x, G.p.y), s = Math.min(1100, sp + 1600 * dt);
            b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s;
            if (d2(b.x, b.y, G.p.x, G.p.y) < 400) b.dead = true;
          }
          b.rot = (b.rot || 0) + dt * 18;
        };
        Son.play('tir');
      }
      if (!held && w.cd < 0) w.cd = 0;
    }
  },
  {
    id: 'sniper', nom: 'Fusil de précision', ico: '⌖', desc: 'Lent mais dévastateur, traverse tout. +25 % de critique.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, 1.1 / ST.pCad);
      for (let i = 0; i < n; i++) {
        const o = bout(p, 18);
        pShot(o.x, o.y, p.aim, 2400 * ST.pVel, { dmg: 122, r: 4, life: .8, pierce: 99, kind: 'trait', crit: .25, col: '#fff' });
        Son.play('tir'); G.recul(p, 140); G.secoue(2);
      }
    }
  },
  {
    id: 'orbes', nom: 'Orbes chercheurs', ico: '◉', desc: 'Orbes lents qui filent tout seuls vers l\'ennemi le plus proche.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .33 / ST.pCad);
      for (let i = 0; i < n; i++) { const o = bout(p, 16); pShot(o.x, o.y, p.aim + R.range(-.3, .3), 430 * ST.pVel, { dmg: 28, r: 6, life: 2.6, hom: 5, kind: 'orbe', col: '#d29bff', noVel: true }); Son.play('tir'); }
    }
  },
  {
    id: 'grenades', nom: 'Lance-grenades', ico: '💣', desc: 'Grenades qui volent jusqu\'au viseur et explosent en zone (touchent aussi les invocations).',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .7 / ST.pCad);
      for (let i = 0; i < n; i++) {
        const max = 460 * ST.pVel, dd = Math.min(max, Math.hypot(G.mx - p.x, G.my - p.y));
        const tx = p.x + Math.cos(p.aim) * dd, ty = p.y + Math.sin(p.aim) * dd;
        G.allies.push({ kind: 'grenade', x0: p.x, y0: p.y, tx, ty, t: 0, dur: .45, dmg: 72 * ST.pDmg, r: 90 });
        Son.play('tir');
      }
    }
  },
  {
    id: 'foudre', nom: 'Arc électrique', ico: 'ϟ', desc: 'Éclairs instantanés sur l\'ennemi visé, qui rebondissent sur 2 autres. Pas de projectile à viser loin.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .25 / ST.pCad);
      for (let i = 0; i < n; i++) {
        const range = 420 * ST.pVel;
        let best = null, bd = Infinity;
        for (const tg of G.cibles()) {
          const dd = Math.sqrt(d2(p.x, p.y, tg.x, tg.y)) - tg.r;
          if (dd < range && Math.abs(angDiff(p.aim, ang(p.x, p.y, tg.x, tg.y))) < .7 && dd < bd) { bd = dd; best = tg; }
        }
        const o = bout(p, 14);
        if (!best) { G.fx.push({ kind: 'eclair', pts: [[o.x, o.y], [o.x + Math.cos(p.aim) * 120, o.y + Math.sin(p.aim) * 120]], t: 0, dur: .08 }); continue; }
        const pts = [[o.x, o.y], [best.x, best.y]], deja = new Set([best]);
        G.frappe(best, 25 * ST.pDmg, { prim: true, x: best.x, y: best.y });
        let cur = best;
        for (let c = 0; c < 2; c++) {
          let nx = null, nd = 220 * 220;
          for (const tg of G.cibles()) if (!deja.has(tg)) { const q = d2(cur.x, cur.y, tg.x, tg.y); if (q < nd) { nd = q; nx = tg; } }
          if (!nx) break;
          deja.add(nx); pts.push([nx.x, nx.y]); G.frappe(nx, 18 * ST.pDmg, { prim: true, x: nx.x, y: nx.y }); cur = nx;
        }
        G.fx.push({ kind: 'eclair', pts, t: 0, dur: .09 });
        Son.play('tir');
      }
    }
  }
];

// ---------- Type 2 : attaques spéciales (temps de recharge) ----------
const SPEC = [
  {
    id: 'meteore', nom: 'Météore', ico: '☄', cout: 40, rech: 6, desc: 'Fait tomber un météore sur le viseur après 0,7 s. Énormes dégâts en zone.',
    use(p) { const pt = G.arene.clampPt(G.mx, G.my, 0); G.allies.push({ kind: 'meteore', x: pt.x, y: pt.y, t: 0, dur: .7, r: 120 * ST.sAmp, dmg: 650 * ST.sDmg }); }
  },
  {
    id: 'tourelle', nom: 'Tourelle', ico: '⛫', cout: 50, rech: 12, desc: 'Pose une tourelle qui tire seule pendant 9 s.',
    use(p) { G.allies.push({ kind: 'tourelle', x: p.x, y: p.y, t: 0, dur: 9 * ST.sAmp, cd: 0, a: p.aim }); }
  },
  {
    id: 'devast', nom: 'Rayon dévastateur', ico: '☀', cout: 60, rech: 10, desc: 'Énorme rayon pendant 1,5 s qui suit ton viseur et efface les projectiles. Tu es ralenti.',
    use(p) { G.allies.push({ kind: 'devast', t: 0, dur: 1.5 * ST.sAmp, a: p.aim, w: 30 * Math.sqrt(ST.sAmp), dps: 480 * ST.sDmg }); }
  },
  {
    id: 'nova', nom: 'Nova', ico: '✺', cout: 35, rech: 5, desc: 'Explosion autour de toi : dégâts et efface tous les projectiles proches. Sauve des vies.',
    use(p) {
      const r = 175 * ST.sAmp;
      for (const tg of G.cibles()) if (Math.sqrt(d2(p.x, p.y, tg.x, tg.y)) - tg.r < r) G.frappe(tg, 380 * ST.sDmg, { spec: true, x: tg.x, y: tg.y });
      for (const e of G.eb) if (d2(p.x, p.y, e.x, e.y) < r * r) { e.dead = true; G.etincelle(e.x, e.y, '#bdf', 2); }
      G.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 20, r1: r, t: 0, dur: .35, col: '#9cf' });
      G.secoue(6);
    }
  },
  {
    id: 'missiles', nom: 'Essaim de missiles', ico: '➹', cout: 45, rech: 7, desc: '8 missiles à tête chercheuse.',
    use(p) {
      for (let i = 0; i < 8; i++) {
        const a = p.aim + Math.PI + (i - 3.5) * .3;
        const b = pShot(p.x, p.y, a, 380, { dmg: 70, r: 5, life: 3, hom: 7, kind: 'missile', col: '#ff8', spec: true, noVel: true });
        b.delai = i * .04;
      }
    }
  },
  {
    id: 'lames', nom: 'Lames tournoyantes', ico: '✣', cout: 45, rech: 10, desc: '3 lames tournent autour de toi pendant 6 s : elles coupent les ennemis et les projectiles.',
    use(p) { G.allies.push({ kind: 'lames', t: 0, dur: 6 * ST.sAmp, a: 0, n: 3, rad: 78, hitcd: new Map() }); }
  },
  {
    id: 'javelot', nom: 'Javelot de foudre', ico: '⚡', cout: 40, rech: 6, desc: 'Javelot qui perce tout et paralyse le boss 1 s (il arrête son attaque en cours).',
    use(p) { const o = bout(p, 18); pShot(o.x, o.y, p.aim, 1300, { dmg: 420, r: 9, life: 1.2, pierce: 99, kind: 'javelot', col: '#9ff', spec: true, noVel: true, cassable: false }).stun = 1; }
  },
  {
    id: 'trou', nom: 'Trou noir', ico: '◍', cout: 55, rech: 12, desc: 'Un trou noir au viseur pendant 3 s : aspire et détruit les projectiles, broie les ennemis.',
    use(p) { const pt = G.arene.clampPt(G.mx, G.my, 0); G.allies.push({ kind: 'trou', x: pt.x, y: pt.y, t: 0, dur: 3.2 * ST.sAmp, r: 145 * ST.sAmp, dps: 150 * ST.sDmg }); }
  },
  {
    id: 'miroir', nom: 'Bouclier miroir', ico: '⬡', cout: 30, rech: 8, desc: 'Pendant 1,8 s les projectiles qui te touchent sont renvoyés vers le boss (les rayons et zones font toujours mal).',
    use(p) { p.miroir = 1.8 * ST.sAmp; }
  },
  {
    id: 'barrage', nom: 'Barrage orbital', ico: '⁘', cout: 50, rech: 9, desc: '14 frappes du ciel tombent autour du viseur en 1,2 s.',
    use(p) {
      const pt = G.arene.clampPt(G.mx, G.my, 0);
      for (let i = 0; i < 14; i++) {
        const a = R() * TAU, dd = Math.sqrt(R()) * 150 * ST.sAmp;
        G.allies.push({ kind: 'meteore', petit: true, x: pt.x + Math.cos(a) * dd, y: pt.y + Math.sin(a) * dd, t: -i * .085, dur: .35, r: 55 * Math.sqrt(ST.sAmp), dmg: 90 * ST.sDmg });
      }
    }
  }
];

// ---------- Type 3 : talents (Espace) ----------
const TAL = [
  {
    id: 'dash', nom: 'Ruée', ico: '»', rech: 1.0, desc: 'Ruée éclair dans la direction de tes déplacements, invincible pendant 0,22 s.',
    use(p) { const d = G.dirMouv(p); p.dash = { t: 0, dur: .16, vx: d.x * 250 * ST.tPort / .16, vy: d.y * 250 * ST.tPort / .16 }; p.iframe = Math.max(p.iframe, .22 + ST.tIntan); G.traine(p); Son.play('dash'); }
  },
  {
    id: 'blink', nom: 'Clignement', ico: '✧', rech: 1.6, desc: 'Téléportation instantanée vers le viseur (260 px max).',
    use(p) {
      const a = ang(p.x, p.y, G.mx, G.my), dd = Math.min(260 * ST.tPort, Math.hypot(G.mx - p.x, G.my - p.y));
      G.fx.push({ kind: 'fantome', x: p.x, y: p.y, t: 0, dur: .3 });
      p.x += Math.cos(a) * dd; p.y += Math.sin(a) * dd; G.arene.contenir(p, p.r);
      p.iframe = Math.max(p.iframe, .2 + ST.tIntan); Son.play('dash');
    }
  },
  {
    id: 'parade', nom: 'Parade', ico: '⛨', rech: 1.1, desc: 'Fenêtre de 0,32 s : si un coup te touche pile à ce moment, tu ne prends rien, une onde frappe autour de toi et ton attaque spéciale se recharge d\'une seconde. Le talent se recharge aussitôt.',
    use(p) { p.parade = .32 + ST.tIntan; G.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 30, r1: 34, t: 0, dur: .32, col: '#ffe9a0', suit: true }); }
  },
  {
    id: 'roulade', nom: 'Roulade', ico: '↻', rech: 1.25, desc: 'Courte roulade mais longue invincibilité (0,42 s).',
    use(p) { const d = G.dirMouv(p); p.dash = { t: 0, dur: .4, vx: d.x * 170 * ST.tPort / .4, vy: d.y * 170 * ST.tPort / .4, roule: true }; p.iframe = Math.max(p.iframe, .42 + ST.tIntan); Son.play('dash'); }
  },
  {
    id: 'temps', nom: 'Bulle temporelle', ico: '⧗', rech: 9, desc: 'Ralentit le boss, ses invocations et ses projectiles de 60 % pendant 2,6 s.',
    use(p) { G.ralenti = 2.6 * ST.tPort; Son.play('tele'); }
  },
  {
    id: 'bouclier', nom: 'Bouclier', ico: '◈', rech: 6, desc: 'Un bouclier absorbe le prochain coup pendant 3 s.',
    use(p) { p.bouclier = 3 * ST.tPort; }
  },
  {
    id: 'grappin', nom: 'Grappin', ico: '⚓', rech: 2, desc: 'Te propulse très vite jusqu\'au viseur (380 px max), invincible pendant le trajet.',
    use(p) {
      const a = ang(p.x, p.y, G.mx, G.my), dd = Math.min(380 * ST.tPort, Math.hypot(G.mx - p.x, G.my - p.y)), dur = Math.max(.08, dd / 1400);
      p.dash = { t: 0, dur, vx: Math.cos(a) * dd / dur, vy: Math.sin(a) * dd / dur, grappin: { x: p.x + Math.cos(a) * dd, y: p.y + Math.sin(a) * dd } };
      p.iframe = Math.max(p.iframe, dur + .08 + ST.tIntan); Son.play('dash');
    }
  },
  {
    id: 'leurre', nom: 'Leurre', ico: '☖', rech: 8, desc: 'Laisse un double : le boss vise le leurre pendant 3,2 s. Tu gagnes de la vitesse 1 s.',
    use(p) { G.leurre = { x: p.x, y: p.y, t: 3.2 * ST.tPort }; p.vite = 1; }
  },
  {
    id: 'fantome', nom: 'Pas fantôme', ico: '◌', rech: 5.5, desc: 'Intangible pendant 1,1 s et plus rapide, mais tu ne peux pas tirer.',
    use(p) { p.fantome = 1.1 * ST.tPort + ST.tIntan; Son.play('dash'); }
  }
];
// ---------- Armes ajoutées ----------
PRIM.push(
  {
    id: 'faux', nom: 'Faux', ico: '☾', desc: 'Grands moulinets tout autour de toi : touche tout ce qui est proche et coupe les projectiles.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .55 / ST.pCad);
      if (n) {
        const reach = 118 * ST.pVel;
        G.fx.push({ kind: 'moulinet', x: p.x, y: p.y, a: p.aim, t: 0, dur: .2, reach });
        for (const tg of G.cibles()) if (Math.sqrt(d2(p.x, p.y, tg.x, tg.y)) - tg.r < reach) G.frappe(tg, 50 * ST.pDmg, { prim: true, x: tg.x, y: tg.y });
        for (const e of G.eb) if (e.des && d2(p.x, p.y, e.x, e.y) < (reach + e.r) ** 2) { e.dead = true; G.etincelle(e.x, e.y, '#fff', 2); }
        Son.play('epee');
      }
    }
  },
  {
    id: 'jumeaux', nom: 'Pistolets jumeaux', ico: '⁑', desc: 'Deux pistolets qui tirent chacun leur tour, très vite.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .085 / ST.pCad);
      for (let i = 0; i < n; i++) {
        w.cote = -(w.cote || 1);
        const ox = Math.cos(p.aim + Math.PI / 2) * 8 * w.cote, oy = Math.sin(p.aim + Math.PI / 2) * 8 * w.cote, o = bout(p, 14);
        pShot(o.x + ox, o.y + oy, p.aim + R.range(-.05, .05), 950 * ST.pVel, { dmg: 9, r: 3.5, life: 1, col: '#ffb3e6' });
        Son.play('tir');
      }
    }
  },
  {
    id: 'shuriken', nom: 'Shurikens', ico: '✴', desc: 'Étoiles qui transpercent et rebondissent deux fois sur les murs.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .3 / ST.pCad);
      for (let i = 0; i < n; i++) { const o = bout(p, 16); const b = pShot(o.x, o.y, p.aim, 680 * ST.pVel, { dmg: 25, r: 8, life: 2, pierce: 2, kind: 'shuriken', col: '#e6e6ff', noVel: true }); b.reb = 2; Son.play('tir'); }
    }
  },
  {
    id: 'roquettes', nom: 'Lance-roquettes', ico: '🚀', desc: 'Roquettes qui accélèrent et explosent en zone.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .85 / ST.pCad);
      for (let i = 0; i < n; i++) {
        const o = bout(p, 18);
        const b = pShot(o.x, o.y, p.aim, 300, { dmg: 20, r: 6, life: 2, kind: 'roquette', col: '#ffcf6b', noVel: true });
        b.boom = { r: 85 * Math.sqrt(ST.pVel), dmg: 72 * ST.pDmg }; b.accel = 1400;
        Son.play('missile'); G.recul(p, 50);
      }
    }
  },
  {
    id: 'fouet', nom: 'Fouet-chaîne', ico: '〽', desc: 'Un long coup de chaîne en ligne droite qui fouette tout sur son passage.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .5 / ST.pCad);
      if (n) {
        const L = Math.min(250 * ST.pVel, G.arene.rayMur(p.x, p.y, p.aim, 250 * ST.pVel)), ex = p.x + Math.cos(p.aim) * L, ey = p.y + Math.sin(p.aim) * L;
        for (const tg of G.cibles()) if (segD2(tg.x, tg.y, p.x, p.y, ex, ey) < (14 + tg.r) ** 2) G.frappe(tg, 46 * ST.pDmg, { prim: true, x: tg.x, y: tg.y });
        for (const e of G.eb) if (e.des && segD2(e.x, e.y, p.x, p.y, ex, ey) < (12 + e.r) ** 2) { e.dead = true; G.etincelle(e.x, e.y, '#fff', 2); }
        G.fx.push({ kind: 'fouet', x: p.x, y: p.y, a: p.aim, L, t: 0, dur: .18, s: (w.s = -(w.s || 1)) });
        Son.play('epee');
      }
    }
  },
  {
    id: 'plasma', nom: 'Canon à plasma', ico: '⦿', desc: 'Grosse boule lente qui traverse tout et explose au bout de sa course.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .95 / ST.pCad);
      for (let i = 0; i < n; i++) {
        const o = bout(p, 20);
        const b = pShot(o.x, o.y, p.aim, 400 * ST.pVel, { dmg: 40, r: 14, life: 1.1, pierce: 99, kind: 'plasma', col: '#b388ff', cassable: false });
        b.boom = { r: 110, dmg: 62 * ST.pDmg, finVie: true };
        Son.play('tirLourd');
      }
    }
  },
  {
    id: 'aiguilles', nom: 'Aiguilles', ico: '⋰', desc: 'Des aiguilles qui se plantent dans la cible. Au bout de 15, tout explose.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .1 / ST.pCad);
      for (let i = 0; i < n; i++) { const o = bout(p, 14); pShot(o.x, o.y, p.aim + R.range(-.04, .04), 1100 * ST.pVel, { dmg: 5, r: 3, life: .9, kind: 'aiguille', col: '#c8ffd0' }).aig = true; Son.play('tir'); }
    }
  },
  {
    id: 'railgun', nom: 'Canon électrique', ico: '⌁', desc: 'Maintiens pour charger (tu ralentis), relâche à pleine charge : un trait instantané qui traverse tout.',
    tick(w, p, dt, held) {
      w.ch = w.ch || 0; w.cd = Math.max(0, (w.cd || 0) - dt);
      if (held && w.cd <= 0 && !(G.opts.auto && w.ch >= 1)) { w.ch = Math.min(1, w.ch + dt * ST.pCad / 1.2); p.lent = Math.min(p.lent, .55); if (w.ch >= 1 && !w.pret) { w.pret = true; Son.play('charge'); } }
      else if (w.ch > 0) {
        if (w.ch >= 1) {
          const L = G.arene.rayMur(p.x, p.y, p.aim, 1600), ex = p.x + Math.cos(p.aim) * L, ey = p.y + Math.sin(p.aim) * L;
          for (const tg of G.cibles()) if (segD2(tg.x, tg.y, p.x, p.y, ex, ey) < (10 + tg.r) ** 2) G.frappe(tg, 175 * ST.pDmg, { prim: true, x: tg.x, y: tg.y });
          for (const e of G.eb) if (e.des && segD2(e.x, e.y, p.x, p.y, ex, ey) < (10 + e.r) ** 2) e.dead = true;
          G.fx.push({ kind: 'trait', x1: p.x, y1: p.y, x2: ex, y2: ey, t: 0, dur: .25, col: '#9ff' });
          G.recul(p, 220); G.secoue(5); Son.play('tirLourd'); w.cd = .25;
        } else Son.play('vide');
        w.ch = 0; w.pret = false;
      }
    }
  }
);

SPEC.push(
  {
    id: 'gel', nom: 'Gel du temps', ico: '❄', cout: 45, rech: 12, desc: 'Fige tous les projectiles ennemis pendant 2,5 s.',
    use(p) { const t = 2.5 * ST.sAmp; for (const e of G.eb) e.gel = t; G.gelT = t; G.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 20, r1: 900, t: 0, dur: .5, col: '#bdf' }); }
  },
  {
    id: 'clones', nom: 'Doubles', ico: '👥', cout: 50, rech: 14, desc: 'Deux doubles t\'accompagnent 6 s et tirent avec toi.',
    use(p) { G.allies.push({ kind: 'clones', t: 0, dur: 6 * ST.sAmp, cd: 0 }); }
  },
  {
    id: 'lamesCiel', nom: 'Pluie de lames', ico: '⚔', cout: 45, rech: 8, desc: '8 lames tombent du ciel sur la cible la plus proche du viseur.',
    use(p) { for (let i = 0; i < 8; i++) G.allies.push({ kind: 'lameCiel', t: -i * .12, dur: .35, r: 45, dmg: 72 * ST.sDmg }); }
  },
  {
    id: 'onde', nom: 'Onde de choc', ico: '◗', cout: 35, rech: 6, desc: 'Une onde en cône devant toi : dégâts, efface les projectiles, repousse les invocations.',
    use(p) {
      const R0 = 270 * ST.sAmp;
      for (const tg of G.cibles()) if (Math.sqrt(d2(p.x, p.y, tg.x, tg.y)) - tg.r < R0 && Math.abs(angDiff(p.aim, ang(p.x, p.y, tg.x, tg.y))) < .9) {
        G.frappe(tg, 230 * ST.sDmg, { spec: true, x: tg.x, y: tg.y });
        if (tg !== G.boss && !tg.fixe) { tg.x += Math.cos(p.aim) * 90; tg.y += Math.sin(p.aim) * 90; }
      }
      for (const e of G.eb) if (d2(p.x, p.y, e.x, e.y) < R0 * R0 && Math.abs(angDiff(p.aim, ang(p.x, p.y, e.x, e.y))) < .9) e.dead = true;
      G.fx.push({ kind: 'cone', x: p.x, y: p.y, a: p.aim, r: R0, t: 0, dur: .3 });
      G.secoue(5);
    }
  },
  {
    id: 'satellite', nom: 'Rayon orbital', ico: '⊙', cout: 55, rech: 11, desc: 'Un rayon tombé du ciel suit ton viseur pendant 3 s.',
    use(p) { const pt = G.arene.clampPt(G.mx, G.my, 0); G.allies.push({ kind: 'satellite', x: pt.x, y: pt.y, t: 0, dur: 3 * ST.sAmp, r: 48, dps: 270 * ST.sDmg }); }
  },
  {
    id: 'soin', nom: 'Soin', ico: '✚', cout: 80, rech: 25, desc: 'Rend 25 points de vie.',
    use(p) { const s = Math.round(25 * ST.sAmp); p.hp = Math.min(p.hpMax, p.hp + s); G.texte(p.x, p.y - 30, '+' + s, '#46e39b', 20); Son.play('soin'); G.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 60, r1: 10, t: 0, dur: .4, col: '#46e39b' }); }
  },
  {
    id: 'murForce', nom: 'Mur de force', ico: '▬', cout: 30, rech: 9, desc: 'Un mur devant toi arrête tous les projectiles pendant 4 s.',
    use(p) { const o = bout(p, 70); G.allies.push({ kind: 'mur', x: o.x, y: o.y, a: p.aim + Math.PI / 2, L: 170 * ST.sAmp, t: 0, dur: 4 * ST.sAmp }); }
  },
  {
    id: 'supernova', nom: 'Supernova', ico: '✹', cout: 90, rech: 20, desc: 'Tu te charges 1 s (ralenti), puis une explosion géante ravage tout autour.',
    use(p) { G.allies.push({ kind: 'supernova', t: 0, dur: 1, r: 380 * ST.sAmp, dmg: 900 * ST.sDmg }); Son.play('charge'); }
  }
);

TAL.push(
  {
    id: 'saut', nom: 'Saut', ico: '⤊', rech: 2.2, desc: 'Un bond par-dessus tout (invincible en l\'air). L\'atterrissage fait une petite onde.',
    use(p) { p.saut = .55 * ST.tPort; p.sautMax = p.saut; p.iframe = Math.max(p.iframe, p.saut + .05 + ST.tIntan); Son.play('dash'); }
  },
  {
    id: 'esquive', nom: 'Esquive parfaite', ico: '≫', rech: 1.1, desc: 'Une ruée. Si un projectile te frôle pendant la ruée, le temps ralentit et ton attaque spéciale se recharge plus vite.',
    use(p) { const d = G.dirMouv(p); p.dash = { t: 0, dur: .16, vx: d.x * 230 * ST.tPort / .16, vy: d.y * 230 * ST.tPort / .16, parfait: true }; p.iframe = Math.max(p.iframe, .22 + ST.tIntan); G.traine(p); Son.play('dash'); }
  },
  {
    id: 'ancre', nom: 'Ancre temporelle', ico: '⚲', rech: 7, desc: 'Pose une ancre. Rappuie dans les 4 s : tu y reviens et récupères la moitié de la vie perdue depuis.',
    use(p) {
      if (p.ancre) {
        const a = p.ancre;
        G.fx.push({ kind: 'fantome', x: p.x, y: p.y, t: 0, dur: .3 });
        p.x = a.x; p.y = a.y; p.iframe = Math.max(p.iframe, .35 + ST.tIntan);
        if (p.hp < a.hp) { const s = Math.round((a.hp - p.hp) / 2); p.hp += s; G.texte(p.x, p.y - 30, '+' + s, '#46e39b', 18); }
        p.ancre = null; Son.play('teleporte');
        return;
      }
      p.ancre = { x: p.x, y: p.y, hp: p.hp, t: 4 * ST.tPort }; Son.play('tele');
      return 'gratuit';
    }
  },
  {
    id: 'ombre', nom: 'Ruée d\'ombre', ico: '⟿', rech: 1.6, desc: 'Une ruée qui laisse une traînée d\'ombre brûlante derrière toi.',
    use(p) {
      const d = G.dirMouv(p), L = 260 * ST.tPort;
      G.allies.push({ kind: 'trainee', x1: p.x, y1: p.y, x2: p.x + d.x * L, y2: p.y + d.y * L, t: 0, dur: 2, dps: 90 * ST.pDmg });
      p.dash = { t: 0, dur: .17, vx: d.x * L / .17, vy: d.y * L / .17 }; p.iframe = Math.max(p.iframe, .22 + ST.tIntan); Son.play('dash');
    }
  },
  {
    id: 'echange', nom: 'Permutation', ico: '⇄', rech: 6, desc: 'Tu échanges ta place avec celle du boss.',
    use(p) {
      const b = G.boss;
      if (!b || b.mort || b.air || b.intro > 0) { Son.play('vide'); return 'gratuit'; }
      const x = p.x, y = p.y;
      G.fx.push({ kind: 'fantome', x, y, t: 0, dur: .3 });
      p.x = b.x; p.y = b.y; b.x = x; b.y = y;
      G.arene.contenir(p, p.r); G.arene.contenir(b, b.r * .8);
      p.iframe = Math.max(p.iframe, .4 + ST.tIntan); Son.play('teleporte');
    }
  },
  {
    id: 'sprint', nom: 'Sprint', ico: '⇶', rech: 6, desc: 'Vitesse ×1,6 pendant 2 s.',
    use(p) { p.sprint = 2 * ST.tPort; p.iframe = Math.max(p.iframe, .15 + ST.tIntan); Son.play('dash'); }
  }
);
// ---------- Armes techniques (difficiles à maîtriser) ----------
PRIM.push(
  {
    id: 'pistolet', nom: 'Pistolet vivant', ico: '⌖', manuel: true, desc: 'Un pistolet tourne autour de toi et tire tout seul vers le viseur. Clic : tu échanges ta place avec lui (et il change de sens).',
    tick(w, p, dt, held) {
      if (w.ga === undefined) { w.ga = -Math.PI / 2; w.sens = 1; }
      w.ga += 1.8 * dt * w.sens;
      w.gx = p.x + Math.cos(w.ga) * 95; w.gy = p.y + Math.sin(w.ga) * 95;
      w.cd = (w.cd || 0) - dt;
      if (w.cd <= 0) { w.cd = .14 / ST.pCad; pShot(w.gx, w.gy, ang(w.gx, w.gy, G.mx, G.my), 850 * ST.pVel, { dmg: 14, r: 4, life: 1.1, col: '#ffd23d' }); Son.play('tir'); }
      if (Input.hit(TOUCHES().tir)) {
        const ox = p.x, oy = p.y, pt = G.arene.clampPt(w.gx, w.gy, p.r);
        p.x = pt.x; p.y = pt.y; w.ga += Math.PI; w.sens = -w.sens; p.iframe = Math.max(p.iframe, .12);
        G.fx.push({ kind: 'fantome', x: ox, y: oy, t: 0, dur: .25 }); Son.play('dash');
      }
    }
  },
  {
    id: 'rattrape', nom: 'Boomerang à rattraper', ico: '↺', manuel: true, desc: 'Gros boomerang : il faut le RATTRAPER au retour. Chaque prise d\'affilée ajoute +20 % de dégâts (jusqu\'à ×2). Raté : il tombe et il faut aller le chercher.',
    tick(w, p, dt, held) {
      w.etat = w.etat || 'main'; w.combo = w.combo || 0;
      if (w.etat === 'sol' && d2(p.x, p.y, w.sx, w.sy) < 34 * 34) { w.etat = 'main'; Son.play('ramasse'); }
      if (w.etat === 'main' && held) {
        const o = bout(p, 18);
        const b = pShot(o.x, o.y, p.aim, 720 * ST.pVel, { dmg: 55 * (1 + .2 * w.combo), r: 14, life: 30, pierce: 99, kind: 'boom', col: w.combo ? '#ffe14d' : '#9fffb0', noVel: true, cassable: false });
        b.dist = 0; b.portee = 380 * ST.pVel; b.retour = false; b.tr = 0;
        b.up = (b, dt) => {
          const sp = Math.hypot(b.vx, b.vy);
          b.rot = (b.rot || 0) + dt * 20;
          if (!b.retour) { b.dist += sp * dt; if (b.dist >= b.portee) { b.retour = true; b.hits.clear(); } return; }
          b.tr += dt;
          const a = ang(b.x, b.y, G.p.x, G.p.y), s = Math.min(950, sp + 1500 * dt);
          b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s;
          if (d2(b.x, b.y, G.p.x, G.p.y) < 30 * 30) {
            b.dead = true; w.etat = 'main'; w.combo = Math.min(5, w.combo + 1);
            G.texte(G.p.x, G.p.y - 26, 'Prise ×' + (1 + .2 * w.combo).toFixed(1), '#ffe14d', 15); Son.play('ramasse');
          } else if (b.tr > 1.25) {
            b.dead = true; w.etat = 'sol'; w.sx = b.x; w.sy = b.y; w.combo = 0;
            G.texte(b.x, b.y - 20, 'Raté', '#888', 14); Son.play('vide');
          }
        };
        w.etat = 'vol'; Son.play('epee');
      }
    }
  },
  {
    id: 'echo', nom: 'Frappe différée', ico: '◎', desc: 'Marque l\'endroit visé : une frappe lourde y tombe 1 s plus tard. Il faut viser où le boss SERA.',
    tick(w, p, dt, held) {
      w.cd = (w.cd || 0) - dt;
      if (held && w.cd <= 0) {
        w.cd = .6 / ST.pCad;
        const pt = G.arene.clampPt(G.mx, G.my, 0);
        G.allies.push({ kind: 'echoFrappe', x: pt.x, y: pt.y, t: 0, dur: 1, r: 72, dmg: 98 * ST.pDmg });
        Son.play('tele');
      }
    }
  },
  {
    id: 'meteorite', nom: 'Météorite chargée', ico: '☄', manuel: true, desc: 'Maintiens pour grossir la météorite, relâche : elle tombe sur le viseur une demi-seconde plus tard. Pleine charge : énorme, et elle efface les projectiles.',
    tick(w, p, dt, held) {
      w.ch = w.ch || 0;
      if (held) { w.ch = Math.min(1, w.ch + dt * ST.pCad / 1.4); p.lent = Math.min(p.lent, .75); }
      else if (w.ch > 0) {
        const c = Math.max(.15, w.ch), pt = G.arene.clampPt(G.mx, G.my, 0);
        G.allies.push({ kind: 'meteore', prim: true, efface: c >= 1, x: pt.x, y: pt.y, t: 0, dur: .5, r: 50 + 65 * c, dmg: (40 + 225 * c) * ST.pDmg });
        w.ch = 0; Son.play('charge');
      }
    }
  },
  {
    id: 'jumelles', nom: 'Orbes jumelles', ico: '⚭', desc: 'Deux orbes partent de chaque côté et se percutent sur le viseur : si le choc a lieu SUR l\'ennemi, gros dégâts. Sinon, presque rien.',
    tick(w, p, dt, held) {
      w.cd = (w.cd || 0) - dt;
      if (held && w.cd <= 0 && !w.vol) { w.cd = 1 / ST.pCad; w.vol = { t: 0, tx: G.mx, ty: G.my, x0: p.x, y0: p.y, h: [new Set(), new Set()] }; Son.play('tir'); }
      const per = p.aim + Math.PI / 2;
      if (!w.vol) {
        const a = G.t * 4;
        w.o = [[p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30], [p.x - Math.cos(a) * 30, p.y - Math.sin(a) * 30]];
        return;
      }
      const v = w.vol; v.t += dt;
      const k = v.t / .4;
      const pts = [];
      for (const s of [-1, 1]) {
        let x, y;
        if (k <= 1) {
          const cx = (v.x0 + v.tx) / 2 + Math.cos(per) * 140 * s, cy = (v.y0 + v.ty) / 2 + Math.sin(per) * 140 * s, u = k;
          x = (1 - u) * (1 - u) * v.x0 + 2 * (1 - u) * u * cx + u * u * v.tx; y = (1 - u) * (1 - u) * v.y0 + 2 * (1 - u) * u * cy + u * u * v.ty;
        } else { const u = Math.min(1, k - 1); x = lerp(v.tx, p.x, u); y = lerp(v.ty, p.y, u); }
        pts.push([x, y]);
        if (k <= 1) { const hs = v.h[s < 0 ? 0 : 1]; for (const tg of G.cibles()) { const id = tg.proxy || tg; if (!hs.has(id) && d2(x, y, tg.x, tg.y) < (10 + tg.r) ** 2) { hs.add(id); G.frappe(tg, 22 * ST.pDmg, { prim: true, x, y }); } } }
      }
      w.o = pts;
      if (k >= 1 && !v.choc) {
        v.choc = true;
        let touche = false;
        for (const tg of G.cibles()) if (Math.sqrt(d2(v.tx, v.ty, tg.x, tg.y)) - tg.r < 40) { G.frappe(tg, 150 * ST.pDmg, { prim: true, x: v.tx, y: v.ty }); touche = true; }
        G.explo(v.tx, v.ty, touche ? 60 : 25, touche ? '#ffe14d' : '#888');
        Son.play(touche ? 'explo' : 'vide');
      }
      if (k >= 2) w.vol = null;
    }
  },
  {
    id: 'ricochets', nom: 'Lames ricochets', ico: '⇋', desc: 'Deux lames à la fois, une devant et une DERRIÈRE toi. Elles rebondissent 4 fois et frappent 20 % plus fort à chaque rebond.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .45 / ST.pCad);
      for (let i = 0; i < n; i++) for (const s of [0, Math.PI]) {
        const b = pShot(p.x + Math.cos(p.aim + s) * 14, p.y + Math.sin(p.aim + s) * 14, p.aim + s, 620 * ST.pVel, { dmg: 21, r: 7, life: 3, pierce: 3, kind: 'shuriken', col: '#7fd8ff', noVel: true });
        b.reb = 4; b.bonusReb = 1.2;
        Son.play('tir');
      }
    }
  },
  {
    id: 'gravite', nom: 'Puits gravitationnel', ico: '◍', manuel: true, desc: 'Maintiens : un puits au viseur aspire et stocke les projectiles ennemis. Relâche : il les renvoie tous sur la cible la plus proche.',
    tick(w, p, dt, held) {
      w.stock = w.stock || 0;
      if (held) {
        const pt = G.arene.clampPt(G.mx, G.my, 0); w.puits = pt; p.lent = Math.min(p.lent, .8);
        for (const e of G.eb) {
          const q = d2(pt.x, pt.y, e.x, e.y);
          if (q < 120 * 120) { const a = ang(e.x, e.y, pt.x, pt.y); e.x += Math.cos(a) * 330 * dt; e.y += Math.sin(a) * 330 * dt; if (q < 26 * 26) { e.dead = true; w.stock = Math.min(45, w.stock + 1); } }
        }
        for (const tg of G.cibles()) if (Math.sqrt(d2(pt.x, pt.y, tg.x, tg.y)) - tg.r < 110) G.frappe(tg, 60 * dt * ST.pDmg, { prim: true, continu: true, x: tg.x, y: tg.y });
      } else if (w.puits) {
        const pt = w.puits; w.puits = null;
        if (w.stock > 0) {
          const t = plusProche(pt.x, pt.y), a0 = t ? ang(pt.x, pt.y, t.x, t.y) : p.aim;
          for (let i = 0; i < w.stock; i++) { const b = pShot(pt.x, pt.y, a0 + R.range(-.35, .35), R.range(500, 700), { dmg: 17, r: 5, life: 2, col: '#d29bff', noVel: true }); b.hom = 3; }
          G.texte(pt.x, pt.y - 20, '×' + w.stock, '#d29bff', 16); Son.play('special'); w.stock = 0;
        }
      }
    }
  },
  {
    id: 'croix', nom: 'Lasers croisés', ico: '✚', manuel: true, desc: 'Tire tout seul 4 lasers en croix depuis toi, à chaque seconde. Clic : bascule entre croix « + » et croix « × ». Place-toi dans l\'axe du boss.',
    tick(w, p, dt, held) {
      w.mode = w.mode || 0;
      if (Input.hit(TOUCHES().tir)) { w.mode ^= 1; Son.play('clic'); }
      w.cd = (w.cd || .5) - dt;
      if (w.cd <= 0) {
        w.cd = .8 / ST.pCad;
        for (let k = 0; k < 4; k++) {
          const a = k * Math.PI / 2 + (w.mode ? Math.PI / 4 : 0), L = G.arene.rayMur(p.x, p.y, a, 1500), ex = p.x + Math.cos(a) * L, ey = p.y + Math.sin(a) * L;
          for (const tg of G.cibles()) if (segD2(tg.x, tg.y, p.x, p.y, ex, ey) < (12 + tg.r) ** 2) G.frappe(tg, 95 * ST.pDmg, { prim: true, x: tg.x, y: tg.y });
          G.fx.push({ kind: 'trait', x1: p.x, y1: p.y, x2: ex, y2: ey, t: 0, dur: .2, col: '#ff7a3d' });
        }
        Son.play('tirLourd');
      }
    }
  },
  {
    id: 'surchauffe', nom: 'Canon à surchauffe', ico: '♨', manuel: true, desc: 'Tire très vite mais chauffe. Lâche la détente quand la jauge est dans la zone verte : refroidi d\'un coup et +35 % de dégâts 3 s. Trop chaud : bloqué 2 s.',
    tick(w, p, dt, held) {
      // maintenir = cadence maximale : il ralentit en chauffant (sans jamais se bloquer) et refroidit pareil qu'on appuie ou non
      w.heat = w.heat || 0; w.bonus = Math.max(0, (w.bonus || 0) - dt);
      w.heat = Math.max(0, w.heat - .3 * dt);
      const n = cadence(w, dt, held, .083 * (1 + 1.6 * Math.max(0, w.heat - .5) / .5) / ST.pCad);
      for (let i = 0; i < n; i++) {
        w.heat = Math.min(1, w.heat + .045);
        const o = bout(p, 16);
        pShot(o.x, o.y, p.aim + R.range(-.05, .05), 950 * ST.pVel, { dmg: 11 * (w.bonus > 0 ? 1.2 : 1), r: 4, life: 1, col: w.bonus > 0 ? '#fff17a' : '#ff9a5c' });
        Son.play('tir');
      }
      // relâcher dans la zone verte : refroidit à moitié et +20 % pendant 2,5 s (une seule fois tant que le bonus dure)
      if (!held && w.avant && w.tenu >= .8 && w.heat >= .72 && w.heat <= .9 && !(w.bonus > 0)) { w.heat = .35; w.bonus = 2.5; G.texte(p.x, p.y - 28, 'PARFAIT', '#7dffb0', 17); Son.play('parade'); }
      w.tenu = held ? (w.tenu || 0) + dt : 0;
      w.avant = held;
    }
  },
  {
    id: 'iaido', nom: 'Iaido', ico: '⚔', manuel: true, desc: 'Maintiens pour te mettre en garde, relâche pour traverser l\'ennemi d\'un coup de sabre. Relâche pile quand la lame brille : ×4 dégâts.',
    tick(w, p, dt, held) {
      w.ch = w.ch || 0;
      if (held) { w.ch = Math.min(1.6, w.ch + dt * ST.pCad); p.lent = Math.min(p.lent, .55); if (w.ch >= .8 && !w.bip) { w.bip = true; Son.play('tic'); } return; }
      if (w.ch <= 0) return;
      const c = w.ch; w.ch = 0; w.bip = false;
      if (c < .3) {
        G.fx.push({ kind: 'taillade', x: p.x, y: p.y, a: p.aim, sens: 1, t: 0, dur: .14, reach: 90 });
        for (const tg of G.cibles()) if (Math.sqrt(d2(p.x, p.y, tg.x, tg.y)) - tg.r < 90 && Math.abs(angDiff(p.aim, ang(p.x, p.y, tg.x, tg.y))) < 1) G.frappe(tg, 28 * ST.pDmg, { prim: true, x: tg.x, y: tg.y });
        Son.play('epee'); return;
      }
      const parfait = c >= .8 && c <= .98, L = Math.min(240 * ST.pVel, G.arene.rayMur(p.x, p.y, p.aim, 240 * ST.pVel) - p.r);
      const ex = p.x + Math.cos(p.aim) * L, ey = p.y + Math.sin(p.aim) * L;
      for (const tg of G.cibles()) if (segD2(tg.x, tg.y, p.x, p.y, ex, ey) < (30 + tg.r) ** 2) G.frappe(tg, (parfait ? 270 : 70) * ST.pDmg, { prim: true, x: tg.x, y: tg.y });
      for (const e of G.eb) if (e.des && segD2(e.x, e.y, p.x, p.y, ex, ey) < (24 + e.r) ** 2) e.dead = true;
      G.fx.push({ kind: 'trait', x1: p.x, y1: p.y, x2: ex, y2: ey, t: 0, dur: .3, col: parfait ? '#ffe14d' : '#ffffff' });
      p.dash = { t: 0, dur: .1, vx: (ex - p.x) / .1, vy: (ey - p.y) / .1 }; p.iframe = Math.max(p.iframe, .25);
      if (parfait) { G.texte(p.x, p.y - 30, 'PARFAIT', '#ffe14d', 18); Son.play('parade'); G.gel = .05; G.secoue(6); } else Son.play('epee');
    }
  }
);

SPEC.push(
  {
    id: 'quatre', nom: 'Quatre météores', ico: '⁜', cout: 55, rech: 10, desc: 'Quatre météores tombent en carré autour du viseur.',
    use(p) { const pt = G.arene.clampPt(G.mx, G.my, 0); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b], i) => G.allies.push({ kind: 'meteore', x: pt.x + a * 70, y: pt.y + b * 70, t: -i * .1, dur: .8, r: 85 * Math.sqrt(ST.sAmp), dmg: 280 * ST.sDmg })); }
  },
  {
    id: 'renvoi', nom: 'Renvoi', ico: '⟲', cout: 55, rech: 12, desc: 'Tous les projectiles proches se retournent contre la cible la plus proche.',
    use(p) {
      const R0 = 210 * ST.sAmp; let n = 0;
      for (const e of G.eb) if (d2(p.x, p.y, e.x, e.y) < R0 * R0) {
        e.dead = true; n++;
        const t = plusProche(e.x, e.y), a = t ? ang(e.x, e.y, t.x, t.y) : R() * TAU;
        pShot(e.x, e.y, a, 650, { dmg: 18, r: 5, life: 2, spec: true, col: '#ffffff', noVel: true }).hom = 4;
      }
      G.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: R0, r1: 20, t: 0, dur: .3, col: '#fff' });
      G.texte(p.x, p.y - 30, n + ' renvoyés', '#fff', 15);
    }
  },
  {
    id: 'arret', nom: 'Arrêt du temps', ico: '⏸', cout: 100, rech: 25, desc: 'Tout s\'arrête 1,8 s : le boss, ses projectiles et ses zones. Toi, tu continues.',
    use(p) {
      const t = 1.8 * ST.sAmp;
      for (const e of G.eb) e.gel = t;
      G.gelT = t; G.arretHz = t;
      if (G.boss && !G.boss.mort) G.etourdir(G.boss, t, 'Figé !');
      G.flash = .3; Son.play('gong');
    }
  }
);

TAL.push(
  {
    id: 'rembobine', nom: 'Rembobinage', ico: '⏪', rech: 6, desc: 'Tu reviens là où tu étais il y a 1 s, invincible pendant 1 s.',
    use(p) {
      const h = p.hist && p.hist[0];
      if (!h) return 'gratuit';
      G.fx.push({ kind: 'fantome', x: p.x, y: p.y, t: 0, dur: .3 });
      p.x = h.x; p.y = h.y; p.iframe = Math.max(p.iframe, 1 + ST.tIntan); p.hist.length = 0;
      Son.play('teleporte');
    }
  },
  {
    id: 'invisible', nom: 'Invisibilité', ico: '◐', rech: 7, desc: 'Invisible 2 s : le boss vise l\'endroit où tu as disparu. Invincible au début.',
    use(p) { const t = 2 * ST.tPort; p.invis = t; G.leurre = { x: p.x, y: p.y, t, invis: true }; p.iframe = Math.max(p.iframe, .4 + ST.tIntan); Son.play('dash'); }
  },
  {
    id: 'trampoline', nom: 'Trampoline', ico: '⊻', rech: 4, desc: 'Pose un trampoline (2 max). Marche dessus : tu bondis vers le viseur, invincible.',
    use(p) {
      const pads = G.allies.filter(a => a.kind === 'trampo');
      if (pads.length >= 2) pads[0].dead = true;
      G.allies.push({ kind: 'trampo', x: p.x, y: p.y, t: 0, dur: 14, pret: .5 }); Son.play('clic');
    }
  }
);
const ARS = { p: PRIM, s: SPEC, t: TAL };
function trouveArme(cat, id) { return ARS[cat].find(a => a.id === id); }
