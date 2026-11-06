'use strict';
/* Colosses — éléments (lien entre tes armes et le boss), armes, spéciales, talents et attaques supplémentaires. */

// ---------- Éléments : chaque boss a un élément et une faiblesse ----------
const ELEMENTS = {
  feu: { nom: 'Feu', ico: '🔥', col: '#ff7a3d' }, glace: { nom: 'Glace', ico: '❄', col: '#8fd8ff' }, foudre: { nom: 'Foudre', ico: '⚡', col: '#ffe14d' },
  nature: { nom: 'Nature', ico: '🌿', col: '#6ee07a' }, ombre: { nom: 'Ombre', ico: '🌑', col: '#a070ff' }, lumiere: { nom: 'Lumière', ico: '☀', col: '#fff2b0' },
  arcane: { nom: 'Arcane', ico: '🔮', col: '#d05cff' }, acier: { nom: 'Acier', ico: '⚙', col: '#c0c8d4' }
};
const FAIBLESSE = { feu: 'glace', glace: 'feu', foudre: 'nature', nature: 'feu', ombre: 'lumiere', lumiere: 'ombre', arcane: 'foudre', acier: 'foudre' };
const ELEM_ESPECE = { metronome: 'arcane', sentinelle: 'acier', hydre: 'nature', tisseuse: 'ombre', spectre: 'ombre', forgeron: 'feu', reine: 'nature', juge: 'lumiere', horloger: 'acier', serpent: 'nature', nebuleuse: 'arcane', bourreau: 'ombre', phenix: 'feu' };
const ELEM_ARME = {
  blaster: 'foudre', pompe: 'acier', flammes: 'feu', arc: 'nature', epee: 'acier', mitra: 'acier', laser: 'lumiere', boomerang: 'nature', sniper: 'acier', orbes: 'arcane', grenades: 'feu', foudre: 'foudre',
  faux: 'ombre', jumeaux: 'foudre', shuriken: 'glace', roquettes: 'feu', fouet: 'ombre', plasma: 'arcane', aiguilles: 'nature', railgun: 'foudre', pistolet: 'acier', rattrape: 'nature', echo: 'arcane',
  meteorite: 'feu', jumelles: 'lumiere', ricochets: 'glace', gravite: 'ombre', croix: 'feu', surchauffe: 'feu', iaido: 'lumiere',
  cryo: 'glace', harpon: 'acier', mortier: 'feu', hachettes: 'acier', chakram: 'lumiere', lucioles: 'nature', lameSpectrale: 'ombre', prisme: 'lumiere', foreuse: 'acier', ronceLance: 'nature', pacte: 'ombre', marteau: 'foudre', glaive: 'arcane', givreLance: 'glace',
  meteore: 'feu', tourelle: 'acier', devast: 'lumiere', nova: 'arcane', missiles: 'feu', lames: 'acier', javelot: 'foudre', trou: 'ombre', miroir: 'lumiere', barrage: 'arcane', gel: 'glace', clones: 'ombre',
  lamesCiel: 'lumiere', onde: 'glace', satellite: 'lumiere', soin: 'nature', murForce: 'arcane', supernova: 'feu', quatre: 'feu', renvoi: 'arcane', arret: 'glace',
  blizzard: 'glace', colonne: 'feu', tempeteElec: 'foudre', racines: 'nature', faille: 'arcane', lumiereSacree: 'lumiere', ombres: 'ombre', aimantSpe: 'acier'
};
// famille d'une arme principale (forge, affinités)
const FAMILLE = {
  blaster: 'fusil', pompe: 'fusil', mitra: 'fusil', sniper: 'fusil', laser: 'fusil', surchauffe: 'fusil', railgun: 'fusil', aiguilles: 'fusil', jumeaux: 'fusil', pistolet: 'fusil', pacte: 'fusil', foreuse: 'fusil', cryo: 'fusil', flammes: 'fusil',
  epee: 'lame', faux: 'lame', iaido: 'lame', fouet: 'lame', lameSpectrale: 'lame', marteau: 'lame',
  arc: 'trait', shuriken: 'trait', ricochets: 'trait', harpon: 'trait', hachettes: 'trait', prisme: 'trait', glaive: 'trait', boomerang: 'trait', rattrape: 'trait', chakram: 'trait', givreLance: 'trait',
  grenades: 'explosif', roquettes: 'explosif', plasma: 'explosif', meteorite: 'explosif', mortier: 'explosif', ronceLance: 'explosif',
  orbes: 'magie', foudre: 'magie', echo: 'magie', gravite: 'magie', croix: 'magie', jumelles: 'magie', lucioles: 'magie'
};
const FAMILLES = { fusil: { nom: 'Fusils', ico: '🔫' }, lame: { nom: 'Lames', ico: '🗡' }, trait: { nom: 'Lancers', ico: '🏹' }, explosif: { nom: 'Explosifs', ico: '💣' }, magie: { nom: 'Magies', ico: '🔮' } };
function elemArme(id) { return ELEM_ARME[id] || 'arcane'; }
// tire une arme selon les chances réglées dans les Affinités (jamais deux fois de suite la même, sauf si c'est la seule possible)
function tirerArme(cat, avant, def) {
  const possibles = ARS[cat].filter(a => multAff(cat, a) > 0);
  const liste = possibles.filter(a => a.id !== avant);
  return R.weighted(liste.length ? liste : possibles, a => multAff(cat, a)).id;
}

// ---------- Armes principales supplémentaires ----------
PRIM.push(
  {
    id: 'cryo', nom: 'Souffle cryogénique', ico: '❄', desc: 'Un cône de givre qui traverse tout. Chaque contact refroidit le boss : il attaque plus lentement.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .045 / ST.pCad);
      for (let i = 0; i < n; i++) { const o = bout(p, 14); const b = pShot(o.x, o.y, p.aim + R.range(-.18, .18), R.range(360, 430) * ST.pVel, { dmg: 5, r: 6, life: .5, pierce: 99, kind: 'flamme', grow: 26, col: '#9fe4ff', cassable: false }); b.froid = true; }
    }
  },
  {
    id: 'harpon', nom: 'Harpon', ico: '⚓', desc: 'Un harpon lourd qui s\'accroche à la cible : pendant 2,5 s, tous tes coups sur elle font +30 %.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .95 / ST.pCad);
      for (let i = 0; i < n; i++) { const o = bout(p, 18); const b = pShot(o.x, o.y, p.aim, 1150 * ST.pVel, { dmg: 62, r: 6, life: 1, kind: 'javelot', col: '#c0c8d4' }); b.harpon = true; Son.play('tirLourd'); }
    }
  },
  {
    id: 'mortier', nom: 'Mortier', ico: '⛰', desc: 'Obus en cloche qui tombent sur le viseur après 0,8 s et explosent en grand. Vise où le boss VA aller.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .85 / ST.pCad);
      for (let i = 0; i < n; i++) { const pt = G.arene.clampPt(G.mx, G.my, 0); G.allies.push({ kind: 'meteore', prim: true, obus: true, x: pt.x, y: pt.y, x0: p.x, y0: p.y, t: 0, dur: .8, r: 100, dmg: 96 * ST.pDmg }); Son.play('tirLourd'); }
    }
  },
  {
    id: 'hachettes', nom: 'Hachettes', ico: '🪓', desc: 'Deux hachettes qui tournoient en courbe, l\'une vers la gauche, l\'autre vers la droite.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .42 / ST.pCad);
      for (let i = 0; i < n; i++) for (const s of [-1, 1]) { const o = bout(p, 14); const b = pShot(o.x, o.y, p.aim - s * .45, 620 * ST.pVel, { dmg: 31, r: 9, life: 1.2, pierce: 1, kind: 'shuriken', col: '#d8dde6', noVel: true }); b.angv = s * 1.6; }
      if (n) Son.play('epee');
    }
  },
  {
    id: 'chakram', nom: 'Chakram', ico: '◯', desc: 'Un anneau tranchant qui part en spirale autour de toi, s\'éloigne puis revient. Il touche plusieurs fois.',
    tick(w, p, dt, held) {
      w.cd = (w.cd || 0) - dt;
      if (held && w.cd <= 0 && !G.allies.some(a => a.kind === 'chakram')) { w.cd = .9 / ST.pCad; const pt = G.arene.clampPt(G.mx, G.my, 0); G.allies.push({ kind: 'chakram', t: 0, dur: 1.1, tx: pt.x, ty: pt.y, a: p.aim, hitcd: new Map(), dmg: 24 * ST.pDmg }); Son.play('epee'); }
    }
  },
  {
    id: 'lucioles', nom: 'Lucioles', ico: '✺', desc: 'Cinq lucioles tournent autour de toi. Maintiens : elles foncent une par une sur le viseur et explosent.',
    tick(w, p, dt, held) {
      w.l = w.l || [0, 0, 0, 0, 0]; w.cd = (w.cd || 0) - dt;
      for (let i = 0; i < 5; i++) if (w.l[i] > 0) w.l[i] -= dt;
      if (held && w.cd <= 0) {
        const i = w.l.findIndex(v => v <= 0);
        if (i >= 0) {
          w.cd = .4 / ST.pCad; w.l[i] = 1.2;
          const a = G.t * 3 + i * TAU / 5, x = p.x + Math.cos(a) * 34, y = p.y + Math.sin(a) * 34;
          const b = pShot(x, y, ang(x, y, G.mx, G.my), 700, { dmg: 17, r: 5, life: .9, col: '#c8ff7a', noVel: true }); b.hom = 6; b.boom = { r: 55, dmg: 30 * ST.pDmg, finVie: true };
        }
      }
      w.dispo = w.l.map(v => v <= 0);
    }
  },
  {
    id: 'lameSpectrale', nom: 'Lame spectrale', ico: '🌘', desc: 'Chaque coup d\'épée laisse un écho qui frappe une seconde fois au même endroit 0,45 s plus tard.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .48 / ST.pCad);
      if (n) {
        w.sens = -(w.sens || 1);
        const reach = 105 * ST.pVel, x = p.x, y = p.y, a = p.aim, sens = w.sens;
        const coup = (k, ech) => {
          G.fx.push({ kind: 'taillade', x, y, a, sens, t: 0, dur: .16, reach, fixe: { x, y }, col: ech ? 'rgba(170,120,255,' : null });
          for (const tg of G.cibles()) if (Math.sqrt(d2(x, y, tg.x, tg.y)) - tg.r < reach && Math.abs(angDiff(a, ang(x, y, tg.x, tg.y))) < 1.05) G.frappe(tg, 46 * k * ST.pDmg, { prim: true, x: tg.x, y: tg.y });
        };
        coup(1, false); Son.play('epee');
        G.allies.push({ kind: 'retarde', t: 0, dur: .45, f: () => { coup(.65, true); Son.play('epee'); } });
      }
    }
  },
  {
    id: 'prisme', nom: 'Prisme', ico: '🔺', desc: 'Un trait de lumière qui se divise en trois au premier impact.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .3 / ST.pCad);
      for (let i = 0; i < n; i++) { const o = bout(p, 16); const b = pShot(o.x, o.y, p.aim, 1000 * ST.pVel, { dmg: 26, r: 5, life: 1, col: '#fff2b0', kind: 'trait' }); b.prisme = true; Son.play('tir'); }
    }
  },
  {
    id: 'foreuse', nom: 'Foreuse', ico: '🌀', desc: 'Un rayon très court qui fait d\'énormes dégâts de près : plus tu es collé, plus ça perce.',
    tick(w, p, dt, held) {
      w.beam = null;
      if (!held) return;
      p.lent = Math.min(p.lent, .8);
      const o = bout(p, 14), ray = G.lancerRayon(o.x, o.y, p.aim, 170 * ST.pVel, 10);
      w.beam = { x1: o.x, y1: o.y, x2: ray.x, y2: ray.y, ramp: 1 - ray.d / 170 };
      if (ray.cible) G.frappe(ray.cible, (70 + 190 * (1 - ray.d / (170 * ST.pVel))) * dt * ST.pDmg, { prim: true, continu: true, x: ray.x, y: ray.y });
    }
  },
  {
    id: 'ronceLance', nom: 'Lanceur de ronces', ico: '🌱', desc: 'Lance une graine : à l\'impact, un roncier pousse et blesse tout ce qui se tient dedans pendant 4 s.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .75 / ST.pCad);
      for (let i = 0; i < n; i++) { const o = bout(p, 16); const b = pShot(o.x, o.y, p.aim, 650 * ST.pVel, { dmg: 22, r: 6, life: .9, col: '#7dff5a' }); b.ronce = true; Son.play('tir'); }
    }
  },
  {
    id: 'pacte', nom: 'Pacte de sang', ico: '🩸', desc: 'Des tirs très puissants, mais toutes les 6 balles tu perds 1 PV (jamais en dessous de 1). Un coup critique te soigne de 1 PV.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .16 / ST.pCad);
      for (let i = 0; i < n; i++) {
        const o = bout(p, 16); pShot(o.x, o.y, p.aim + R.range(-.03, .03), 900 * ST.pVel, { dmg: 22, r: 5, life: 1, col: '#ff4d6a' }).pacte = true;
        w.n = (w.n || 0) + 1; if (w.n >= 6) { w.n = 0; if (p.hp > 1) p.hp -= 1; }
        Son.play('tir');
      }
    }
  },
  {
    id: 'marteau', nom: 'Marteau de tonnerre', ico: '🔨', desc: 'Un coup de marteau qui s\'abat devant toi (jusqu\'à 140 px) : grosse zone, et parfois le boss est sonné.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .9 / ST.pCad);
      if (n) {
        const dd = Math.min(140, Math.hypot(G.mx - p.x, G.my - p.y)), x = p.x + Math.cos(p.aim) * dd, y = p.y + Math.sin(p.aim) * dd;
        G.explo(x, y, 85, '#ffe14d'); G.secoue(5); Son.play('choc');
        for (const tg of G.cibles()) if (Math.sqrt(d2(x, y, tg.x, tg.y)) - tg.r < 85) { G.frappe(tg, 118 * ST.pDmg, { prim: true, x: tg.x, y: tg.y }); if ((tg === G.boss || tg.proxy === G.boss) && R() < .2) G.etourdir(G.boss, .5, 'Sonné !'); }
      }
    }
  },
  {
    id: 'glaive', nom: 'Glaive rebondissant', ico: '✦', desc: 'Une lame qui rebondit sur les murs et repart vers la cible, cinq fois.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .8 / ST.pCad);
      for (let i = 0; i < n; i++) { const o = bout(p, 16); const b = pShot(o.x, o.y, p.aim, 700 * ST.pVel, { dmg: 33, r: 8, life: 4, pierce: 5, kind: 'shuriken', col: '#e0a0ff', noVel: true }); b.reb = 5; b.glaive = true; Son.play('epee'); }
    }
  },
  {
    id: 'givreLance', nom: 'Lances de givre', ico: '🧊', desc: 'Trois lances de glace en éventail qui ralentissent le boss à chaque impact.',
    tick(w, p, dt, held) {
      const n = cadence(w, dt, held, .55 / ST.pCad);
      for (let i = 0; i < n; i++) for (const s of [-1, 0, 1]) { const o = bout(p, 16); const b = pShot(o.x, o.y, p.aim + s * .12, 820 * ST.pVel, { dmg: 19, r: 5, life: 1, kind: 'fleche', col: '#bfe9ff' }); b.froid = true; }
      if (n) Son.play('tir');
    }
  }
);

// ---------- Spéciales supplémentaires ----------
SPEC.push(
  { id: 'blizzard', nom: 'Blizzard', ico: '🌨', cout: 45, rech: 10, desc: 'Une tempête au viseur pendant 4 s : les balles ennemies y ralentissent fortement et les ennemis gèlent.',
    use(p) { const pt = G.arene.clampPt(G.mx, G.my, 0); G.allies.push({ kind: 'blizzard', x: pt.x, y: pt.y, r: 170 * ST.sAmp, t: 0, dur: 4 * ST.sAmp, dps: 55 * ST.sDmg }); } },
  { id: 'colonne', nom: 'Colonne de feu', ico: '🔥', cout: 45, rech: 9, desc: 'Une colonne de feu au viseur pendant 3,5 s : elle brûle ce qui la touche et détruit les balles qui y entrent.',
    use(p) { const pt = G.arene.clampPt(G.mx, G.my, 0); G.allies.push({ kind: 'colonne', x: pt.x, y: pt.y, r: 62 * Math.sqrt(ST.sAmp), t: 0, dur: 3.5 * ST.sAmp, dps: 170 * ST.sDmg }); } },
  { id: 'tempeteElec', nom: 'Tempête électrique', ico: '🌩', cout: 50, rech: 10, desc: 'Sept éclairs s\'abattent sur la cible la plus proche du viseur.',
    use(p) { for (let i = 0; i < 7; i++) G.allies.push({ kind: 'retarde', t: -i * .2, dur: .01, f: () => { const tg = plusProche(G.mx, G.my); if (!tg) return; G.fx.push({ kind: 'eclair', pts: [[tg.x + R.range(-40, 40), AR.y], [tg.x, tg.y]], t: 0, dur: .15 }); G.frappe(tg, 86 * ST.sDmg, { spec: true, x: tg.x, y: tg.y }); Son.play('tirLourd'); } }); } },
  { id: 'racines', nom: 'Racines', ico: '🌳', cout: 40, rech: 10, desc: 'Des racines immobilisent le boss 3 s (il attaque toujours) et l\'écrasent.',
    use(p) { const b = G.boss; if (!b || b.mort) return; b.racine = 3 * ST.sAmp; G.frappe(b, 200 * ST.sDmg, { spec: true, x: b.x, y: b.y }); G.fx.push({ kind: 'anneau', x: b.x, y: b.y, r0: b.r * 2, r1: b.r, t: 0, dur: .4, col: '#6ee07a' }); } },
  { id: 'faille', nom: 'Faille', ico: '🌀', cout: 40, rech: 8, desc: 'Tu te téléportes au viseur ; l\'endroit que tu quittes explose.',
    use(p) {
      const ox = p.x, oy = p.y, a = ang(p.x, p.y, G.mx, G.my), dd = Math.min(400, Math.hypot(G.mx - p.x, G.my - p.y)), pt = G.arene.clampPt(p.x + Math.cos(a) * dd, p.y + Math.sin(a) * dd, p.r);
      p.x = pt.x; p.y = pt.y; p.iframe = Math.max(p.iframe, .3);
      G.explo(ox, oy, 140, '#d05cff'); for (const tg of G.cibles()) if (Math.sqrt(d2(ox, oy, tg.x, tg.y)) - tg.r < 140) G.frappe(tg, 260 * ST.sDmg, { spec: true, x: tg.x, y: tg.y });
      Son.play('teleporte');
    } },
  { id: 'lumiereSacree', nom: 'Lumière sacrée', ico: '✨', cout: 60, rech: 14, desc: 'Une explosion de lumière : rend 12 PV, efface les balles proches et blesse autour de toi.',
    use(p) {
      const r = 220 * ST.sAmp; p.hp = Math.min(p.hpMax, p.hp + 12);
      for (const e of G.eb) if (d2(p.x, p.y, e.x, e.y) < r * r) e.dead = true;
      for (const tg of G.cibles()) if (Math.sqrt(d2(p.x, p.y, tg.x, tg.y)) - tg.r < r) G.frappe(tg, 150 * ST.sDmg, { spec: true, x: tg.x, y: tg.y });
      G.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 20, r1: r, t: 0, dur: .4, col: '#fff2b0' }); G.lumiere(p.x, p.y, 400, '#fff2b0', .4); Son.play('soin');
    } },
  { id: 'ombres', nom: 'Ombres', ico: '👤', cout: 50, rech: 10, desc: 'Trois ombres foncent sur l\'ennemi le plus proche et explosent.',
    use(p) { for (let i = 0; i < 3; i++) G.allies.push({ kind: 'ombre', x: p.x, y: p.y, t: -i * .12, dur: 2, dmg: 140 * ST.sDmg, a: p.aim + (i - 1) * .7 }); } },
  { id: 'aimantSpe', nom: 'Aimant', ico: '🧲', cout: 25, rech: 9, desc: 'Absorbe toutes les balles proches : chacune avance la recharge de ta spéciale. Au-delà de 10, tu gagnes un bouclier.',
    use(p) {
      let n = 0; const r = 260 * ST.sAmp;
      for (const e of G.eb) if (d2(p.x, p.y, e.x, e.y) < r * r) { e.dead = true; n++; G.fx.push({ kind: 'trait', x1: e.x, y1: e.y, x2: p.x, y2: p.y, t: 0, dur: .2, col: '#c0c8d4' }); }
      p.spec.cd = Math.max(0, p.spec.cd - n * .15); if (n >= 10) p.bouclier = Math.max(p.bouclier, 4);
      G.texte(p.x, p.y - 30, n + ' absorbées', '#c0c8d4', 15);
    } }
);

// ---------- Talents supplémentaires ----------
TAL.push(
  { id: 'contre', nom: 'Contre-attaque', ico: '⚔', rech: 2.5, desc: 'Garde de 0,5 s : si tu es touché, tu ne prends rien et tu réapparais dans le dos du boss en le frappant fort.',
    use(p) { p.contre = .5 + ST.tIntan; G.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 26, r1: 30, t: 0, dur: .5, col: '#ff8a5c', suit: true }); } },
  { id: 'glissade', nom: 'Glissade', ico: '⤳', rech: 1.4, desc: 'Une longue glissade au ras du sol (invincible au début).',
    use(p) { const d = G.dirMouv(p), L = 330 * ST.tPort; p.dash = { t: 0, dur: .32, vx: d.x * L / .32, vy: d.y * L / .32, roule: true }; p.iframe = Math.max(p.iframe, .26 + ST.tIntan); Son.play('dash'); } },
  { id: 'bondArriere', nom: 'Bond arrière', ico: '⤺', rech: 2.2, desc: 'Tu bondis en arrière (invincible) en lâchant une grenade devant toi.',
    use(p) {
      const a = p.aim + Math.PI, L = 230 * ST.tPort;
      p.saut = .4; p.sautMax = .4; p.iframe = Math.max(p.iframe, .45 + ST.tIntan); p.dash = { t: 0, dur: .4, vx: Math.cos(a) * L / .4, vy: Math.sin(a) * L / .4 };
      G.allies.push({ kind: 'grenade', x0: p.x, y0: p.y, tx: p.x + Math.cos(p.aim) * 120, ty: p.y + Math.sin(p.aim) * 120, t: 0, dur: .4, dmg: 90 * ST.pDmg, r: 90 }); Son.play('dash');
    } },
  { id: 'dephasage', nom: 'Déphasage', ico: '⇢', rech: .8, desc: 'Un mini-clignement de 130 px dans ta direction, presque sans recharge.',
    use(p) { const d = G.dirMouv(p); G.fx.push({ kind: 'fantome', x: p.x, y: p.y, t: 0, dur: .2 }); p.x += d.x * 130 * ST.tPort; p.y += d.y * 130 * ST.tPort; G.arene.contenir(p, p.r); G.arene.sortirPiliers(p, p.r); p.iframe = Math.max(p.iframe, .12 + ST.tIntan); Son.play('dash'); } },
  { id: 'bulle', nom: 'Bulle', ico: '🫧', rech: 6, desc: 'Une bulle te rend invincible 1,3 s, mais tu bouges à peine.',
    use(p) { p.bulle = 1.3 * ST.tPort; p.iframe = Math.max(p.iframe, p.bulle + ST.tIntan); Son.play('parade'); } },
  { id: 'rueeFeu', nom: 'Ruée de feu', ico: '☄', rech: 1.6, desc: 'Une ruée qui laisse une traînée de flammes derrière toi.',
    use(p) { const d = G.dirMouv(p), L = 260 * ST.tPort; G.allies.push({ kind: 'trainee', feu: true, x1: p.x, y1: p.y, x2: p.x + d.x * L, y2: p.y + d.y * L, t: 0, dur: 2.2, dps: 120 * ST.pDmg }); p.dash = { t: 0, dur: .17, vx: d.x * L / .17, vy: d.y * L / .17 }; p.iframe = Math.max(p.iframe, .22 + ST.tIntan); Son.play('dash'); } }
);

// ---------- Attaques de boss supplémentaires ----------
HZ.pendule = {
  continu: true,
  up(h, dt) { h.t += dt; if (h.t > h.warn + h.dur) h.dead = true; const k = Math.max(0, h.t - h.warn); h.a = Math.PI / 2 + Math.sin(k * TAU / h.per + h.ph) * h.amp; h.x = h.px + Math.cos(h.a) * h.L; h.y = h.py + Math.sin(h.a) * h.L; },
  hit(h, p) { return h.t > h.warn && d2(h.x, h.y, p.x, p.y) < (h.r + p.hr) ** 2; },
  draw(h, c) {
    if (h.t < h.warn) { c.strokeStyle = `rgba(${AL},.35)`; c.lineWidth = h.r * 2; c.globalAlpha = .25; c.beginPath(); c.arc(h.px, h.py, h.L, Math.PI / 2 - h.amp, Math.PI / 2 + h.amp); c.stroke(); c.globalAlpha = 1; return; }
    c.strokeStyle = '#6a6070'; c.lineWidth = 5; c.beginPath(); c.moveTo(h.px, h.py); c.lineTo(h.x, h.y); c.stroke();
    const g = c.createRadialGradient(h.x - h.r * .3, h.y - h.r * .3, 3, h.x, h.y, h.r);
    g.addColorStop(0, '#9a90a8'); g.addColorStop(1, '#1a1620'); c.fillStyle = g; c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.fill();
    c.strokeStyle = G.boss ? G.boss.col : '#fff'; c.lineWidth = 3; c.stroke();
  }
};
function nouvelleAttaque(id, o) { def(id, o); ATK_IDS.push(id); }
nouvelleAttaque('lunes', { nom: 'Lunes', cat: 'balles', conseil: 'Trois lunes tournent autour de l\'endroit où tu étais en se resserrant : sors du cercle tout de suite.',
  params: (r, D) => ({ av: r.range(.8, 1.1) }),
  *gen(b, p) {
    yield* prep(b, .5);
    const t = cible(), c = { x: t.x, y: t.y };
    G.hz.push({ kind: 'apercuC', x: c.x, y: c.y, r: 230, t: 0, dur: 1 });
    for (let k = 0; k < 3; k++) { const e = EB(c.x, c.y, 0, 0, { r: 18, life: 4.5 }); e.orb = { c, a: k * TAU / 3, r: 230, av: p.av, dr: -55 }; }
    yield 1.5;
  } });
nouvelleAttaque('pendule', { nom: 'Pendule', cat: 'zone', conseil: 'Une boule géante balance d\'un côté à l\'autre : l\'arc est montré avant ; passe sous elle quand elle remonte.',
  params: (r, D) => ({ per: r.range(2.2, 2.8) / Math.min(1.3, D.S) }),
  *gen(b, p) {
    yield* prep(b, .4);
    const bb = G.arene.bb();
    G.hz.push({ kind: 'pendule', px: bb.x + bb.w / 2, py: bb.y - 40, L: bb.h * .78, r: 52, amp: 1, per: p.per, ph: R.sign() * Math.PI / 2, warn: 1, dur: p.per * 2, t: 0, dmg: DMG(1.3), src: 'pendule' });
    yield 1 + p.per * 2;
  } });
nouvelleAttaque('grele', { nom: 'Grêle', cat: 'zone', conseil: 'De petits impacts tombent partout pendant 3 s : regarde les cercles et faufile-toi entre eux.',
  params: (r, D) => ({ cad: Math.min(16, 11 * D.C) }),
  *gen(b, p) {
    yield* prep(b, .4);
    let t = 0, acc = 0;
    while (t < 3) { const dt = G.dtE; t += dt; acc += dt * p.cad; while (acc >= 1) { acc--; const pt = R() < .4 ? G.arene.clampPt(cible().x + R.range(-120, 120), cible().y + R.range(-120, 120), 0) : G.arene.pointAuHasard(20); zoneC(pt.x, pt.y, 34, Math.max(.7, .8 * b.D.T), { dmg: DMG(.9) }); } yield 0; }
  } });
nouvelleAttaque('fouetBoss', { nom: 'Coup de fouet', cat: 'rayon', conseil: 'Un fouet court balaie devant le boss trois fois en alternant : recule hors de portée.',
  params: (r, D) => ({ L: r.range(240, 290) }),
  *gen(b, p) {
    b.ctl = true;
    for (let i = 0; i < 3; i++) {
      const a = vise(b), s = i % 2 ? 1 : -1, warn = Math.max(.55, .6 * b.D.T);
      b.wind = warn; b.windMax = warn;
      rayon(b.x, b.y, a - s * 1.3, p.L, 34, warn, .45, { suit: b, balaye: { de: a - s * 1.3, vers: a + s * 1.3, dur: .45 } });
      yield warn + .55;
    }
    b.ctl = false;
  } });
nouvelleAttaque('satellites', { nom: 'Satellites', cat: 'balles', conseil: 'Quatre satellites tournent autour du boss et te tirent dessus : reste en mouvement, ils visent ta position actuelle.',
  params: (r, D) => ({ av: r.range(.9, 1.3) }),
  *gen(b, p) {
    yield* prep(b, .5);
    for (let k = 0; k < 4; k++) { const e = EB(b.x, b.y, 0, 0, { r: 12, life: 5.5, col: '#ffffff' }); e.orb = { c: b, a: k * TAU / 4, r: b.r + 60, av: p.av, dr: 0 }; e.tir = { cd: .6 + k * .2, per: 1, spd: 240 * b.D.S }; e.des = false; }
    yield 1.5;
  } });
nouvelleAttaque('meteoreGeant', { nom: 'Météore géant', cat: 'zone', conseil: 'Un énorme cercle sur toi avec 2 s pour en sortir, puis un anneau de débris : sors par le côté le plus court.',
  params: (r, D) => ({ n: Math.round(14 * Math.min(1.4, D.C)) }),
  *gen(b, p) {
    yield* prep(b, .3);
    const t = cible(), pt = { x: t.x, y: t.y };
    zoneC(pt.x, pt.y, 210, 2, { dmg: DMG(1.6), apres: h => { anneauTirs(h.x, h.y, p.n, R() * TAU, 170 * b.D.S); G.secoue(16); Son.play('gros'); G.marque(h.x, h.y, 160); } });
    yield 2.6;
  } });
nouvelleAttaque('tourellesLaser', { nom: 'Tourelles laser', cat: 'rayon', conseil: 'Trois tourelles au bord de l\'arène tirent tour à tour un laser sur ta position : bouge juste après chaque ligne.',
  params: (r, D) => ({}),
  *gen(b, p) {
    yield* prep(b, .4);
    const bb = G.arene.bb(), pts = [[bb.x + 20, bb.y + 20], [bb.x + bb.w - 20, bb.y + 20], [bb.x + bb.w / 2, bb.y + bb.h - 20]];
    for (const [x, y] of pts) G.fx.push({ kind: 'echo', x, y, t: 0, dur: 5 });
    for (let i = 0; i < 6; i++) { const [x, y] = pts[i % 3], t = cible(); rayon(x, y, ang(x, y, t.x, t.y), 1600, 26, Math.max(.75, .8 * b.D.T), .3); yield .75; }
    yield .5;
  } });
nouvelleAttaque('tsunami', { nom: 'Raz-de-marée', cat: 'balles', conseil: 'Des rangées de balles arrivent d\'un côté avec un trou qui ondule : suis le trou.',
  params: (r, D) => ({ spd: 200 * Math.min(1.3, D.S) }),
  *gen(b, p) {
    yield* prep(b, .5);
    const bb = G.arene.bb(), base = clamp((cible().y - bb.y) / bb.h + R.range(-.06, .06), .25, .75), cote = R.int(0, 1); // le trou part en face du héros
    for (let i = 0; i < 7; i++) {
      const g = (base + Math.sin(i * .9) * .17) * bb.h;
      for (let s = 15; s < bb.h; s += 30) if (Math.abs(s - g) > 85) EB(cote ? bb.x + bb.w - 2 : bb.x + 2, bb.y + s, cote ? Math.PI : 0, p.spd, { ext: true });
      Son.play('salve'); yield .36;
    }
  } });
nouvelleAttaque('feuxFollets', { nom: 'Feux follets', cat: 'balles', conseil: 'Des feux follets te suivent lentement et explosent au bout de 4 s ou s\'ils t\'approchent : éloigne-toi en ligne droite puis contourne.',
  params: (r, D) => ({ n: r.int(5, 7) }),
  *gen(b, p) {
    yield* prep(b, .5);
    for (let k = 0; k < p.n; k++) { const a = k * TAU / p.n; EB(b.x + Math.cos(a) * b.r, b.y + Math.sin(a) * b.r, a, 120 * b.D.S, { r: 10, hom: 1.3, life: 4, col: '#b0ff8a', boom: 62 }); yield .1; }
    yield .8;
  } });
nouvelleAttaque('rebondsTerre', { nom: 'Rebonds sismiques', cat: 'corps', conseil: 'Le boss rebondit 4 fois de suite près de toi : chaque point de chute est annoncé, ne t\'arrête pas.',
  params: (r, D) => ({}),
  *gen(b, p) {
    b.ctl = true;
    for (let i = 0; i < 4; i++) {
      const t = cible(), a = R() * TAU, pt = G.arene.clampPt(t.x + Math.cos(a) * 60, t.y + Math.sin(a) * 60, b.r), warn = Math.max(.6, .65 * b.D.T);
      zoneC(pt.x, pt.y, 95, warn, { dmg: DMG(1.2) });
      b.air = true; const sx = b.x, sy = b.y; let tt = 0;
      while (tt < warn) { tt += G.dtE; const k = Math.min(1, tt / warn); b.x = lerp(sx, pt.x, k); b.y = lerp(sy, pt.y, k); b.haut = Math.sin(k * Math.PI) * 80; yield 0; }
      b.air = false; b.haut = 0; G.secoue(7); Son.play('choc'); yield .25;
    }
    b.ctl = false;
  } });
nouvelleAttaque('eclairsChaine', { nom: 'Orage', cat: 'zone', conseil: 'La foudre frappe autour de toi l\'un après l\'autre, chaque impact lâche quelques étincelles : continue de bouger.',
  params: (r, D) => ({ n: r.int(7, 9) }),
  *gen(b, p) {
    yield* prep(b, .4);
    for (let i = 0; i < p.n; i++) {
      const t = cible(), pt = G.arene.clampPt(t.x + R.range(-90, 90), t.y + R.range(-90, 90), 0);
      zoneC(pt.x, pt.y, 46, Math.max(.6, .6 * b.D.T), { dmg: DMG(1.1), apres: h => { anneauTirs(h.x, h.y, 6, R() * TAU, 160, { r: 5, col: '#ffe14d' }); G.fx.push({ kind: 'eclair', pts: [[h.x, AR.y], [h.x, h.y]], t: 0, dur: .15 }); } });
      yield .2;
    }
    yield .6;
  } });
nouvelleAttaque('poles', { nom: 'Pôles', cat: 'zone', conseil: 'Deux pôles : l\'un t\'attire, l\'autre te repousse, et ils s\'inversent. Cours perpendiculairement à la force.',
  params: (r, D) => ({ f: Math.min(140, 110 * D.S) }),
  *gen(b, p) {
    yield* prep(b, .5);
    const bb = G.arene.bb(), A = { x: bb.x + bb.w * .2, y: bb.y + bb.h / 2 }, B = { x: bb.x + bb.w * .8, y: bb.y + bb.h / 2 };
    let t = 0, acc = 0;
    while (t < 4) {
      const dt = G.dtE; t += dt; acc += dt * 4;
      const pole = Math.floor(t / 2) % 2 ? A : B;
      G.aspiration = { x: pole.x, y: pole.y, f: p.f, t: .1 };
      G.fx.push({ kind: 'anneau', x: pole.x, y: pole.y, r0: 60, r1: 10, t: 0, dur: .2, col: b.col });
      while (acc >= 1) { acc--; EB(b.x, b.y, vise(b) + R.range(-.3, .3), 220 * b.D.S, { r: 6 }); }
      yield 0;
    }
  } });
nouvelleAttaque('cercleVide', { nom: 'Anneau qui se referme', cat: 'zone', conseil: 'Un anneau part du bord et se resserre vers le boss : passe par un de ses trous.',
  params: (r, D) => ({ spd: 170 * Math.min(1.3, D.S) }),
  *gen(b, p) {
    yield* prep(b, .5);
    for (let i = 0; i < 2; i++) { onde(b.x, b.y, -p.spd, { r: 650, th: 18, life: 650 / p.spd, gaps: [[R() * TAU, .5], [R() * TAU, .5]] }); yield 1.1; }
    yield 1.2;
  } });
nouvelleAttaque('lanceGeante', { nom: 'Lances du ciel', cat: 'rayon', conseil: 'Cinq lances verticales tombent l\'une après l\'autre près de toi : décale-toi sur le côté, pas en avant.',
  params: (r, D) => ({}),
  *gen(b, p) {
    yield* prep(b, .4);
    const bb = G.arene.bb();
    for (let i = 0; i < 5; i++) { const x = clamp(cible().x + R.range(-60, 60), bb.x + 30, bb.x + bb.w - 30); rayon(x, bb.y + 1, Math.PI / 2, 1600, 48, Math.max(.7, .75 * b.D.T), .3); yield .4; }
    yield .6;
  } });
nouvelleAttaque('murEpines', { nom: 'Murs d\'épines', cat: 'terrain', conseil: 'Deux murs d\'épines en croix sortent du boss et restent 5 s : ils coupent l\'arène, choisis vite ton quart.',
  params: (r, D) => ({}),
  *gen(b, p) {
    yield* prep(b, .5);
    const a0 = R() * Math.PI / 2;
    for (let k = 0; k < 4; k++) { const a = a0 + k * Math.PI / 2, L = G.arene.rayMur(b.x, b.y, a, 700); G.hz.push({ kind: 'fissure', x1: b.x + Math.cos(a) * (b.r + 30), y1: b.y + Math.sin(a) * (b.r + 30), x2: b.x + Math.cos(a) * L, y2: b.y + Math.sin(a) * L, w: 22, warn: Math.max(1, b.D.T), life: 5, t: 0, dmg: DMG(.9), src: 'murEpines', epines: true }); }
    yield 1.4;
  } });
HZ.apercuC = { up(h, dt) { h.t += dt; if (h.t > h.dur) h.dead = true; }, hit() { return false; }, draw(h, c) { c.strokeStyle = `rgba(${AL},${.6 * (1 - h.t / h.dur)})`; c.setLineDash([10, 8]); c.lineWidth = 2; c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.stroke(); c.setLineDash([]); } };
const POIDS_EXTRA = { lunes: 2, pendule: 2.5, grele: 2, fouetBoss: 2, satellites: 2, meteoreGeant: 2.5, tourellesLaser: 2.5, tsunami: 2.5, feuxFollets: 2, rebondsTerre: 2.5, eclairsChaine: 2, poles: 2, cercleVide: 2, lanceGeante: 2, murEpines: 2 };
