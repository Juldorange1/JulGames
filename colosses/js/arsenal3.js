'use strict';
/* Colosses — nouvelles armes : 6 armes principales, 4 attaques spéciales, 2 talents.
   Règle de l'arsenal : maintenir le tir donne toujours la meilleure cadence (spammer ne rapporte jamais plus),
   et chaque arme vise environ 150 dégâts par seconde sur une cible immobile. */

const FAUX_HITS = { has: () => true, add() { }, clear() { } }; // projectile qui gère lui-même ses touches

PRIM.push(
  { id: 'bombeCollante', nom: 'Bombes collantes', ico: '💣', desc: 'Des bombes qui se collent au boss et explosent une seconde plus tard (dégâts en zone).',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .55 / ST.pCad);
      for (let i = 0; i < n; i++) {
        const o = bout(p, 14), b = pShot(o.x, o.y, p.aim, 640 * ST.pVel, { dmg: 0, r: 6, life: 1.1, col: '#ff6a3c' });
        b.hits = FAUX_HITS;
        b.up = (b, dt) => {
          const bo = G.boss;
          if (!b.colle) {
            if (bo && !bo.mort && d2(b.x, b.y, bo.x, bo.y) < (b.r + bo.r * .9) ** 2) { b.colle = { dx: b.x - bo.x, dy: b.y - bo.y, t: .9 }; b.vx = b.vy = 0; b.life = 9; Son.play('clic'); }
            else if (b.life <= dt * 1.5) explBombe(b, .5);
          } else {
            b.vx = b.vy = 0; if (bo) { b.x = bo.x + b.colle.dx; b.y = bo.y + b.colle.dy; }
            b.colle.t -= dt; b.col = (b.colle.t * 10 | 0) % 2 ? '#fff0c0' : '#ff3a1a';
            if (b.colle.t <= 0 || !bo || bo.mort) explBombe(b, 1);
          }
        };
        Son.play('tir2');
      }
    } },
  { id: 'helice', nom: 'Lance-hélice', ico: '🌀', desc: 'Deux projectiles s\'enroulent l\'un autour de l\'autre : une hélice fine et très rapide.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .12 / ST.pCad);
      for (let i = 0; i < n; i++) {
        const o = bout(p, 14), a = p.aim, nx = -Math.sin(a), ny = Math.cos(a);
        for (const s of [-1, 1]) {
          const b = pShot(o.x, o.y, a, 0, { dmg: 9, r: 4, life: .75, col: s > 0 ? '#c9a0ff' : '#8fe0ff' });
          b.bx = o.x; b.by = o.y; b.dir = a; b.sp = 780 * ST.pVel; b.s = s;
          b.up = (b, dt) => { b.bx += Math.cos(b.dir) * b.sp * dt; b.by += Math.sin(b.dir) * b.sp * dt; const off = Math.sin(b.t * 26) * 15 * b.s; b.x = b.bx + nx * off; b.y = b.by + ny * off; };
        }
        Son.play('tir1');
      }
    } },
  { id: 'focale', nom: 'Rayons convergents', ico: '🎯', desc: 'Cinq rayons partent en éventail et se croisent pile sur le viseur : place le viseur SUR le boss pour tout faire toucher.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .32 / ST.pCad);
      for (let i = 0; i < n; i++) {
        const nx = -Math.sin(p.aim), ny = Math.cos(p.aim), tx = G.mx, ty = G.my;
        for (const k of [-2, -1, 0, 1, 2]) { const ox = p.x + nx * k * 20, oy = p.y + ny * k * 20, a = ang(ox, oy, tx, ty); pShot(ox, oy, a, 1100 * ST.pVel, { dmg: 10, r: 4, life: .8, kind: 'trait', col: '#fff3a0' }); }
        Son.play('tir2');
      }
    } },
  { id: 'toupie', nom: 'Toupie tranchante', ico: '🗡', desc: 'Lance une toupie qui file jusqu\'au viseur puis tourne sur place 1,6 s en tranchant tout ce qu\'elle touche.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, 1 / ST.pCad);
      for (let i = 0; i < n; i++) {
        const o = bout(p, 14), dx = G.mx - p.x, dy = G.my - p.y, L = Math.min(420, Math.hypot(dx, dy)), a = p.aim;
        const b = pShot(o.x, o.y, a, L / .25, { dmg: 18, r: 15, life: 1.85, kind: 'shuriken', col: '#d8e4ff', pierce: 999, cassable: false });
        b.cible = G.arene.clampPt(p.x + Math.cos(a) * L, p.y + Math.sin(a) * L, 0); b.tick = .2;
        b.up = (b, dt) => { if (b.t >= .25) { b.vx = b.vy = 0; b.x = b.cible.x; b.y = b.cible.y; } b.tick -= dt; if (b.tick <= 0) { b.tick = .2; b.hits.clear(); } };
        Son.play('epee');
      }
    } },
  { id: 'croissant', nom: 'Croissant lunaire', ico: '🌙', desc: 'Un grand croissant lent qui traverse tout ce qu\'il touche : parfait pour les boss et leurs invocations.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .75 / ST.pCad);
      for (let i = 0; i < n; i++) { const o = bout(p, 18), b = pShot(o.x, o.y, p.aim, 430 * ST.pVel, { dmg: 110, r: 24, life: 1.7, col: '#bfa8ff', pierce: 99 }); b.croissant = true; Son.play('epee'); }
    } },
  { id: 'acide', nom: 'Crachat acide', ico: '🧪', desc: 'Un crachat en cloche qui laisse une flaque d\'acide 2,5 s sur le viseur : le boss se ronge dedans.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .5 / ST.pCad);
      for (let i = 0; i < n; i++) { const pt = G.arene.clampPt(G.mx, G.my, 0); G.allies.push({ kind: 'x_acide', x0: p.x, y0: p.y, x: pt.x, y: pt.y, t: 0, vol: .35, dur: .35 + 2.5, r: 58, dps: 32 * ST.pDmg, impact: 12 * ST.pDmg }); Son.play('tir1'); }
    } }
);
function explBombe(b, k) {
  if (b.dead) return; b.dead = true;
  const R0 = 62 * (k < 1 ? .8 : 1);
  G.explo(b.x, b.y, R0, '#ff7a3a'); Son.play('explo'); G.secoue(2);
  for (const tg of G.cibles()) if (Math.sqrt(d2(b.x, b.y, tg.x, tg.y)) - tg.r < R0) G.frappe(tg, 85 * k * ST.pDmg, { prim: true, x: tg.x, y: tg.y });
}

SPEC.push(
  { id: 'tornade', nom: 'Tornade', ico: '🌪', cout: 50, rech: 9, desc: 'Une tornade avance vers le viseur pendant 3 s : elle frappe sans arrêt et avale les balles qu\'elle touche.',
    use(p) { const a = ang(p.x, p.y, G.mx, G.my); G.allies.push({ kind: 'x_tornade', x: p.x + Math.cos(a) * 30, y: p.y + Math.sin(a) * 30, a, t: 0, dur: 3, r: 62 * Math.sqrt(ST.sAmp), dps: 115 * ST.sDmg }); Son.play('dash'); } },
  { id: 'mines', nom: 'Champ de mines', ico: '💥', cout: 45, rech: 8, desc: 'Trois mines autour du viseur : elles explosent quand le boss passe dessus (ou au bout de 5 s).',
    use(p) { for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + G.t, pt = G.arene.clampPt(G.mx + Math.cos(a) * 70, G.my + Math.sin(a) * 70, 0); G.allies.push({ kind: 'x_mine', x: pt.x, y: pt.y, t: 0, dur: 5, r: 85 * Math.sqrt(ST.sAmp), dmg: 175 * ST.sDmg }); } Son.play('clic'); } },
  { id: 'lanceSoleil', nom: 'Lance solaire', ico: '☀', cout: 55, rech: 10, desc: 'Une lance de lumière traverse toute l\'arène dans la direction visée, après un court éclair d\'annonce.',
    use(p) { G.allies.push({ kind: 'x_lance', x: p.x, y: p.y, a: p.aim, t: 0, dur: .65, frappe: .35, w: 36 * Math.sqrt(ST.sAmp), dmg: 460 * ST.sDmg }); Son.play('charge'); } },
  { id: 'orage', nom: 'Orage', ico: '⚡', cout: 50, rech: 9, desc: 'Douze éclairs tombent autour du viseur pendant 2 secondes.',
    use(p) { const cx = G.mx, cy = G.my; for (let i = 0; i < 12; i++) G.allies.push({ kind: 'retarde', t: -i * .16, dur: .01, f: () => { const a = R() * TAU, d = R.range(0, 140) * Math.sqrt(ST.sAmp), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; G.fx.push({ kind: 'eclairX', x, y, t: 0, dur: .2 }); G.etincelle(x, y, '#fff7a0', 5); Son.play('tir2'); for (const tg of G.cibles()) if (Math.sqrt(d2(x, y, tg.x, tg.y)) - tg.r < 48) G.frappe(tg, 52 * ST.sDmg, { spec: true, x, y }); } }); } }
);
TAL.push(
  { id: 'tourbillon', nom: 'Tourbillon', ico: '🌀', rech: 2.2, desc: 'Une ruée en tournoyant (invincible) : à l\'arrivée, les balles proches sont balayées.',
    use(p) { const d = G.dirMouv(p), L = 210 * ST.tPort; p.dash = { t: 0, dur: .25, vx: d.x * L / .25, vy: d.y * L / .25, roule: true }; p.iframe = Math.max(p.iframe, .3 + ST.tIntan); Son.play('dash'); G.allies.push({ kind: 'retarde', t: -.25, dur: .01, f: () => { const R0 = 95; for (const e of G.eb) if (d2(e.x, e.y, p.x, p.y) < R0 * R0) e.dead = true; G.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 15, r1: R0, t: 0, dur: .3, col: '#bfefff' }); } }); } },
  { id: 'zigzag', nom: 'Zigzag', ico: '⚡', rech: 1.4, desc: 'Deux petits bonds très rapides en zigzag (invincible) : idéal pour traverser un mur de balles.',
    use(p) { const d = G.dirMouv(p), a = Math.atan2(d.y, d.x), L = 105 * ST.tPort; const bond = s => { p.dash = { t: 0, dur: .1, vx: Math.cos(a + s) * L / .1, vy: Math.sin(a + s) * L / .1 }; }; bond(-.6); p.iframe = Math.max(p.iframe, .26 + ST.tIntan); Son.play('dash'); G.allies.push({ kind: 'retarde', t: -.11, dur: .01, f: () => bond(.6) }); } }
);
Object.assign(ELEM_ARME, { bombeCollante: 'feu', helice: 'arcane', focale: 'lumiere', toupie: 'acier', croissant: 'ombre', acide: 'nature', tornade: 'nature', mines: 'feu', lanceSoleil: 'lumiere', orage: 'foudre' });
Object.assign(FAMILLE, { bombeCollante: 'explosif', helice: 'magie', focale: 'trait', toupie: 'lame', croissant: 'lame', acide: 'magie' });
Object.assign(PRIM_EQ, { bombeCollante: .87, helice: .92, focale: .89, toupie: .87, croissant: .96, acide: .85 }); // mesuré au banc : même dégâts par seconde que le Blaster
if (typeof ICO_CLE !== 'undefined') Object.assign(ICO_CLE, { 'p:bombeCollante': 'falling-blob', 'p:helice': 'magic-swirl', 'p:focale': 'target-arrows', 'p:toupie': 'spinning-sword', 'p:croissant': 'night-sky', 'p:acide': 'earth-spit', 's:tornade': 'wind-slap', 's:mines': 'explosion-rays', 's:lanceSoleil': 'sun', 's:orage': 'lightning-frequency', 't:tourbillon': 'clockwise-rotation', 't:zigzag': 'back-forth' });
for (const [cat, ids] of [['p', ['bombeCollante', 'helice', 'focale', 'toupie', 'croissant', 'acide']], ['s', ['tornade', 'mines', 'lanceSoleil', 'orage']], ['t', ['tourbillon', 'zigzag']]]) for (const id of ids) { const a = trouveArme(cat, id); if (a) a.ico = '⟦' + cat + ':' + id + '⟧'; }

// ---------- effets au sol des nouvelles armes ----------
const _majAllies3 = majAllies;
majAllies = function (dt) {
  _majAllies3(dt);
  const cib = G.cibles();
  for (const a of G.allies) {
    if (a.dead || a.t < 0 || !a.kind || a.kind.slice(0, 2) !== 'x_') continue;
    if (a.kind === 'x_acide') {
      if (!a.pose && a.t >= a.vol) { a.pose = true; G.etincelle(a.x, a.y, '#9dff6a', 4); for (const tg of cib) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < a.r) G.frappe(tg, a.impact, { prim: true, x: tg.x, y: tg.y }); }
      if (a.pose) for (const tg of cib) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < a.r) G.frappe(tg, a.dps * dt, { prim: true, continu: true, x: tg.x, y: tg.y });
    } else if (a.kind === 'x_tornade') {
      a.x += Math.cos(a.a) * 150 * dt; a.y += Math.sin(a.a) * 150 * dt; const pt = G.arene.clampPt(a.x, a.y, a.r * .5); a.x = pt.x; a.y = pt.y;
      for (const tg of cib) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < a.r) G.frappe(tg, a.dps * dt, { spec: true, continu: true, x: tg.x, y: tg.y });
      for (const e of G.eb) if (d2(e.x, e.y, a.x, a.y) < a.r * a.r) e.dead = true;
    } else if (a.kind === 'x_mine') {
      const bo = G.boss, arme = a.t > .4;
      let boum = a.t >= a.dur;
      if (arme) for (const tg of cib) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < 40) boum = true;
      if (boum) { a.dead = true; G.explo(a.x, a.y, a.r, '#ff9a3c'); Son.play('explo'); G.secoue(5); for (const tg of cib) if (Math.sqrt(d2(a.x, a.y, tg.x, tg.y)) - tg.r < a.r) G.frappe(tg, a.dmg, { spec: true, x: tg.x, y: tg.y }); }
      continue;
    } else if (a.kind === 'x_lance') {
      if (!a.fait && a.t >= a.frappe) {
        a.fait = true; G.secoue(8); Son.play('gros');
        const L = G.arene.rayMur(a.x, a.y, a.a, 2400), dx = Math.cos(a.a), dy = Math.sin(a.a);
        for (const tg of cib) { const u = (tg.x - a.x) * dx + (tg.y - a.y) * dy; if (u < 0 || u > L) continue; const v = Math.abs((tg.x - a.x) * dy - (tg.y - a.y) * dx); if (v < a.w + tg.r) G.frappe(tg, a.dmg, { spec: true, x: tg.x, y: tg.y }); }
        a.L = L;
      }
    }
    if (a.t >= a.dur) a.dead = true;
  }
};
const _dessAllies3 = dessinerAllies;
dessinerAllies = function (c) {
  _dessAllies3(c);
  c.save();
  for (const a of G.allies) {
    if (a.t < 0 || !a.kind || a.kind.slice(0, 2) !== 'x_') continue;
    if (a.kind === 'x_acide') {
      if (!a.pose) { const k = a.t / a.vol, x = lerp(a.x0, a.x, k), y = lerp(a.y0, a.y, k) - Math.sin(k * Math.PI) * 70; c.fillStyle = '#9dff6a'; c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill(); continue; }
      const f = Math.min(1, (a.dur - a.t) * 2);
      c.globalAlpha = .55 * f; c.fillStyle = '#4fbf2a'; c.beginPath(); for (let i = 0; i <= 16; i++) { const an = i * TAU / 16, rr = a.r * (.9 + .1 * Math.sin(an * 3 + a.t * 4)); c.lineTo(a.x + Math.cos(an) * rr, a.y + Math.sin(an) * rr * .85); } c.fill();
      c.globalAlpha = .8 * f; c.strokeStyle = '#c8ff8a'; c.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const k = (a.t * .8 + i / 4) % 1; c.beginPath(); c.arc(a.x + Math.cos(i * 2.3) * a.r * .5, a.y + Math.sin(i * 2.3) * a.r * .4, 2 + 4 * k, 0, TAU); c.stroke(); }
      c.globalAlpha = 1;
    } else if (a.kind === 'x_tornade') {
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) { c.strokeStyle = `rgba(190,240,220,${.55 - i * .1})`; c.lineWidth = 3; c.beginPath(); c.ellipse(a.x, a.y - i * 12, a.r * (1 - i * .18), a.r * .35 * (1 - i * .15), 0, a.t * 9 + i, a.t * 9 + i + 4.5); c.stroke(); }
      c.globalCompositeOperation = 'source-over';
    } else if (a.kind === 'x_mine') {
      const cl = a.t > .4 && (a.t * 6 | 0) % 2;
      c.fillStyle = '#3a2a20'; c.beginPath(); c.arc(a.x, a.y, 11, 0, TAU); c.fill(); c.strokeStyle = '#ffb04a'; c.lineWidth = 2; c.stroke();
      c.fillStyle = cl ? '#ff3a1a' : '#ffd27a'; c.beginPath(); c.arc(a.x, a.y, 4, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,160,60,.25)'; c.setLineDash([4, 6]); c.beginPath(); c.arc(a.x, a.y, 40, 0, TAU); c.stroke(); c.setLineDash([]);
    } else if (a.kind === 'x_lance') {
      const L = a.L || G.arene.rayMur(a.x, a.y, a.a, 2400), ex = a.x + Math.cos(a.a) * L, ey = a.y + Math.sin(a.a) * L;
      c.lineCap = 'round';
      if (!a.fait) { c.strokeStyle = 'rgba(255,230,140,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(ex, ey); c.stroke(); }
      else { const k = 1 - (a.t - a.frappe) / (a.dur - a.frappe); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(255,210,90,${.6 * k})`; c.lineWidth = a.w * 2; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(ex, ey); c.stroke(); c.strokeStyle = `rgba(255,255,230,${k})`; c.lineWidth = a.w * .6; c.stroke(); c.globalCompositeOperation = 'source-over'; }
      c.lineCap = 'butt';
    }
  }
  c.restore();
};
// le croissant lunaire et les éclairs de l'Orage
const _tirs3 = dessinerTirsJoueur;
dessinerTirsJoueur = function (c) {
  _tirs3(c);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const b of G.pb) {
    if (!b.croissant || b.dead) continue;
    const a = Math.atan2(b.vy, b.vx);
    c.save(); c.translate(b.x, b.y); c.rotate(a);
    c.fillStyle = 'rgba(200,180,255,.85)'; c.beginPath(); c.arc(0, 0, b.r * 1.3, -1.3, 1.3); c.arc(-b.r * .45, 0, b.r * 1.05, 1.2, -1.2, true); c.closePath(); c.fill();
    c.restore();
  }
  for (const f of G.fx) if (f.kind === 'eclairX') {
    const k = 1 - f.t / f.dur; c.strokeStyle = `rgba(255,250,190,${k})`; c.lineWidth = 3; c.beginPath(); let x = f.x + 20, y = f.y - 260; c.moveTo(x, y);
    for (let i = 0; i < 6; i++) { x = lerp(x, f.x, .35) + R.range(-14, 14); y += 260 / 6; c.lineTo(x, y); } c.lineTo(f.x, f.y); c.stroke();
  }
  c.restore();
};

// armes à charger (Iaido, arc, canon…) : 0,4 s avant de pouvoir recharger, cliquer très vite ne sert plus à rien
for (const a of PRIM) {
  const tick = a.tick;
  a.tick = function (w, p, dt, held) {
    G.salveTir = 1;
    w.verrou = Math.max(0, (w.verrou || 0) - dt);
    const ch0 = w.ch || 0, r = tick.call(this, w, p, dt, held && w.verrou <= 0);
    if (ch0 > 0 && !(w.ch > 0)) w.verrou = PAUSE_MIN;
    G.salveTir = 1;
    return r;
  };
}
