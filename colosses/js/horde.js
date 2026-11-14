'use strict';
/* Colosses — Survie, nouvelle version : plus de boss. Des vagues sans fin de petits ennemis variés, de plus en plus
   nombreuses. La chance compte le moins possible :
   • les vagues sont les mêmes pour tout le monde (même composition, même ordre, mêmes points d'apparition) ;
   • peu d'ennemis à la fois (3 au début, 9 au plus), qui s'écartent les uns des autres : ils ne s'agglutinent pas ;
   • un coup qui touche plusieurs ennemis dans le même instant fait de moins en moins mal à chacun
     (1er ennemi 100 %, 2e 69 %, 3e 53 %, 4e 43 %…) : les armes de zone ne balaient pas tout ;
   • la vie des ennemis s'ajuste à la force de tes armes tirées (une arme forte ne rend pas la partie plus facile) ;
   • pas de coups critiques au hasard : leur effet moyen est donné à chaque coup.
   Score : vagues terminées + la part de la vague en cours. */

const HORDE = {
  rodeur: { nom: 'Rôdeur', desc: 'Marche droit sur toi et frappe au contact.', hp: 55, r: 14, vit: 105, cout: 1, des: 1, hue: 14, contact: .55 },
  coureur: { nom: 'Coureur', desc: 'Très rapide, il zigzague ; fragile.', hp: 30, r: 12, vit: 180, cout: 1, des: 2, hue: 42, contact: .45 },
  tireur: { nom: 'Tireur', desc: 'Garde ses distances et tire une balle lente.', hp: 45, r: 14, vit: 80, cout: 2, des: 3, hue: 198 },
  kamikaze: { nom: 'Kamikaze', desc: 'Fonce sur toi, s\'arrête puis explose : sors du cercle rouge.', hp: 32, r: 13, vit: 195, cout: 2, des: 4, hue: 352 },
  brute: { nom: 'Brute', desc: 'Lente et solide ; de temps en temps elle charge en ligne droite (la ligne est annoncée).', hp: 240, r: 24, vit: 60, cout: 4, des: 5, hue: 24, contact: 1 },
  lanceur: { nom: 'Lanceur', desc: 'Lance des obus qui tombent là où tu étais : sors du cercle.', hp: 60, r: 15, vit: 70, cout: 3, des: 6, hue: 88 },
  bouclier: { nom: 'Porte-bouclier', desc: 'Son bouclier bloque presque tout de face : contourne-le.', hp: 110, r: 17, vit: 82, cout: 3, des: 7, hue: 214, contact: .6 },
  essaim: { nom: 'Essaim', desc: 'Quatre petites bêtes qui tournent autour de toi puis plongent.', hp: 14, r: 9, vit: 150, cout: 2, des: 8, hue: 300, contact: .35, groupe: 4 },
  tourelle: { nom: 'Tourelle', desc: 'Immobile, elle tourne en crachant deux jets de balles.', hp: 120, r: 17, vit: 0, cout: 3, des: 9, hue: 262 },
  chaman: { nom: 'Chaman', desc: 'Reste loin et soigne les autres : abats-le en premier.', hp: 70, r: 15, vit: 75, cout: 4, des: 10, hue: 150 },
  semeur: { nom: 'Semeur', desc: 'Pose des mines sur son passage : elles explosent quand tu passes dessus.', hp: 60, r: 14, vit: 92, cout: 2, des: 11, hue: 56 },
  spectre: { nom: 'Spectre', desc: 'Disparaît, réapparaît près de toi (l\'endroit est annoncé) et tire en éventail.', hp: 40, r: 14, vit: 85, cout: 3, des: 12, hue: 276 }
};
const HORDE_THEMES = ['temple', 'ruines', 'metal', 'volcan', 'neant', 'glace', 'marais', 'cathedrale', 'celeste'];

FORMATS.horde = {
  nom: 'Survie', ico: '🛡', obj: 'Des vagues d\'ennemis sans fin, toujours plus nombreuses : tiens le plus longtemps possible', sens: 1, un: true,
  score: () => { const h = G.defi && G.defi.h; return h ? Math.round(((h.vague - 1) + (h.total ? h.faits / h.total : 0)) * 100) / 100 : 0; },
  fmt: v => { const n = Math.floor(v), f = Math.round((v - n) * 100); return n + ' ' + (n > 1 ? 'vagues' : 'vague') + (f > 0 ? ' + ' + f + ' %' : ''); }
};

// la force des armes tirées (dégâts sur une seule cible, mesurés par le robot) : la vie des ennemis suit
function hordeForceArmes(ars) {
  try {
    const T = CHASSE_T, moy = o => { const v = Object.values(o); return v.reduce((s, x) => s + x, 0) / v.length; };
    const mp = moy(T.p), ms = T.s ? moy(T.s) : 0;
    const k = ((T.p[ars.p] || mp) + (T.s ? (T.s[ars.s] || ms) : 0)) / (mp + ms);
    return clamp(k, .75, 1.35);
  } catch (e) { return 1; }
}

const Horde = {
  actif() { return G.mode === 'survie' && G.defi && G.defi.format === 'horde' && G.defi.h; },
  cap(n) { return Math.min(9, 3 + Math.floor(n / 2)); },
  // composition d'une vague : la même pour tout le monde
  composer(n) {
    const r = RNG(hashStr('horde-v1:' + n)), dispo = Object.keys(HORDE).filter(k => HORDE[k].des <= n);
    const nouveau = dispo.find(k => HORDE[k].des === n);
    const vedettes = r.shuffle(dispo.slice()).slice(0, Math.min(dispo.length, n >= 8 ? 3 : 2));
    if (nouveau && !vedettes.includes(nouveau)) vedettes[0] = nouveau;
    let budget = Math.round(5 + 2.4 * n + .1 * n * n);
    const file = [];
    if (nouveau) for (let i = 0; i < 2 && budget >= HORDE[nouveau].cout; i++) { file.push({ t: nouveau }); budget -= HORDE[nouveau].cout; }
    for (let g = 0; budget > 0 && g < 400; g++) {
      let t = r() < .7 ? r.pick(vedettes) : r.pick(dispo);
      if (HORDE[t].cout > budget) t = dispo.filter(k => HORDE[k].cout <= budget).sort((a, b) => HORDE[b].cout - HORDE[a].cout)[0] || 'rodeur';
      budget -= HORDE[t].cout; file.push({ t });
    }
    const melange = r.shuffle(file);
    // élites à partir de la vague 10 (plus solides, liseré doré)
    let elites = n >= 10 ? Math.floor((n - 6) / 4) : 0;
    for (const e of melange) if (elites > 0 && e.t !== 'essaim' && e.t !== 'tourelle') { e.elite = true; elites--; }
    return melange;
  },
  demarrer(rep) {
    const df = G.defi;
    G.boss = null; G.banner = null; G.toast = null; G.hz = []; G.eb = []; G.minions = []; G.portail = null;
    try { Arene.appliquer('normale'); } catch (e) { }
    try { AV.raz(null); } catch (e) { }
    df.h = { vague: rep ? rep.vague : 1, file: [], total: 0, faits: 0, pause: 2.6, spawnT: 0, obus: [], mines: [], rayons: [], k: hordeForceArmes(G.ars), n: 0, sonT: 0 };
    if (rep && G.p) G.p.hp = clamp(rep.pv || G.p.hpMax, 1, G.p.hpMax);
    this.preparer();
    this.decor(true);
    G.annonce('Vague ' + df.h.vague, '#ffcf7a', 2.2);
  },
  preparer() {
    const h = G.defi.h;
    h.file = this.composer(h.vague);
    h.total = h.file.reduce((s, e) => s + (HORDE[e.t].groupe || 1), 0); h.faits = 0; h.spawnT = 0;
    G.dmgE = 20 * DF().dmg * (1 + .03 * (h.vague - 1));
  },
  // toutes les 5 vagues, l'arène change de décor
  decor(force) {
    const h = G.defi.h, th = HORDE_THEMES[Math.floor((h.vague - 1) / 5) % HORDE_THEMES.length];
    if (!force && Decor.theme === th) return;
    Decor.theme = th; Arene.version++;
  },
  // point d'apparition au bord de l'arène (le même pour tout le monde, mais jamais sur toi)
  point(i) {
    const h = G.defi.h, r = RNG(hashStr('horde-pos:' + h.vague + ':' + i)), m = 40, s = r.int(0, 3), u = r();
    let x = s === 0 ? AR.x + m + u * (AR.w - 2 * m) : s === 1 ? AR.x + AR.w - m : s === 2 ? AR.x + m + u * (AR.w - 2 * m) : AR.x + m;
    let y = s === 0 ? AR.y + m : s === 1 ? AR.y + m + u * (AR.h - 2 * m) : s === 2 ? AR.y + AR.h - m : AR.y + m + u * (AR.h - 2 * m);
    if (G.p && d2(x, y, G.p.x, G.p.y) < 300 * 300) { x = 2 * CX - x; y = 2 * CY - y; }
    return { x, y };
  },
  creer(type, x, y, elite) {
    const h = G.defi.h, T = HORDE[type], n = h.vague, e = elite ? 1 : 0;
    const hp = T.hp * (1 + .075 * (n - 1)) * h.k * (e ? 2.6 : 1);
    const m = { horde: true, type, x, y, r: T.r * (e ? 1.25 : 1), hp, hpMax: hp, vit: T.vit * (1 + Math.min(.35, .015 * (n - 1))), spawn: .9, flash: 0, elite: !!elite,
      idx: h.n++, t: 0, face: G.p ? ang(x, y, G.p.x, G.p.y) : 0, cd: 1.2 + ((h.n * .37) % 1.2), ph: (h.n * 1.7) % TAU, a: 0 };
    G.minions.push(m);
    return m;
  },
  apparaitre(e) {
    const h = G.defi.h, T = HORDE[e.t], pt = this.point(h.n);
    if (T.groupe) for (let i = 0; i < T.groupe; i++) { const a = i * TAU / T.groupe; this.creer(e.t, pt.x + Math.cos(a) * 22, pt.y + Math.sin(a) * 22, false); }
    else this.creer(e.t, pt.x, pt.y, e.elite);
  },
  tuer(m, parJoueur) {
    if (m.dead) return;
    const h = G.defi.h, T = HORDE[m.type];
    m.dead = true; h.faits++;
    if (parJoueur) { G.defi.tues++; if (G.p && G.p.spec) G.p.spec.cd = Math.max(0, G.p.spec.cd - .2); try { statPlus('tuesHorde'); } catch (e) { } }
    const col = hsl(T.hue, 90, 62);
    G.explo(m.x, m.y, m.r * (m.elite ? 3 : 2.2), col);
    if (G.t - h.sonT > .07) { h.sonT = G.t; Son.play(m.elite || m.type === 'brute' ? 'explo' : 'touche'); }
  },
  // ----- un ennemi -----
  maj(m, dt) {
    if (m.spawn > 0) { m.spawn -= dt; return; }
    const T = HORDE[m.type], p = cible(), a = ang(m.x, m.y, p.x, p.y), dd = Math.sqrt(d2(m.x, m.y, p.x, p.y)), h = G.defi.h;
    m.t += dt; m.flash = Math.max(0, m.flash - dt * 6);
    const tourne = (cibleA, v) => { const df = angDiff(cibleA, m.face); m.face += clamp(df, -v * dt, v * dt); };
    const aller = (ang0, vit) => { m.x += Math.cos(ang0) * vit * dt; m.y += Math.sin(ang0) * vit * dt; };
    const garder = (dist, vit) => { const s = dd > dist + 40 ? 1 : dd < dist - 40 ? -1 : 0; aller(a, vit * s); aller(a + Math.PI / 2 * (m.idx % 2 ? 1 : -1), vit * .35); };
    switch (m.type) {
      case 'rodeur': tourne(a, 4); aller(m.face, m.vit); break;
      case 'coureur': tourne(a, 6); aller(m.face + Math.sin(m.t * 6 + m.ph) * .75, m.vit); break;
      case 'tireur':
        tourne(a, 5); garder(300, m.vit); m.cd -= dt;
        if (m.cd <= 0) { m.cd = 2.2; m.vise = .35; }
        if (m.vise > 0) { m.vise -= dt; if (m.vise <= 0) EB(m.x, m.y, a, 230, { r: 7, src: 'invocation', col: hsl(T.hue, 95, 64), dmg: DMG(.7) }); }
        break;
      case 'kamikaze':
        if (m.boom === undefined) { tourne(a, 6); aller(m.face, m.vit); if (dd < 70) { m.boom = 0; Son.play('tele'); } }
        else { m.boom += dt; if (m.boom >= .75) { G.explo(m.x, m.y, 75, ROUGE); Son.play('explo'); if (G.p && d2(m.x, m.y, G.p.x, G.p.y) < (75 + G.p.hr) ** 2) G.blesser(DMG(1.1), 'invocation'); this.tuer(m, false); return; } }
        break;
      case 'brute':
        if (m.charge) {
          const c = m.charge; c.t += dt;
          if (c.t < .8) { /* annonce : la ligne est dessinée */ }
          else if (c.t < 1.25) aller(c.a, 520);
          else { m.charge = null; m.cd = 4.5; }
        } else {
          tourne(a, 2.5); aller(m.face, m.vit); m.cd -= dt;
          if (m.cd <= 0 && dd < 520) { m.charge = { a, t: 0 }; Son.play('tele'); }
        }
        break;
      case 'lanceur':
        tourne(a, 4); garder(360, m.vit); m.cd -= dt;
        if (m.cd <= 0) { m.cd = 3.5; h.obus.push({ x: G.p.x, y: G.p.y, r: 62, t: 0, dur: 1.1, ox: m.x, oy: m.y }); }
        break;
      case 'bouclier': tourne(a, 1.3); aller(a, m.vit); break;
      case 'essaim':
        if (m.plonge) { m.plonge.t += dt; aller(m.plonge.a, m.vit * 2.3); if (m.plonge.t > .55) { m.plonge = null; m.cd = 2.2 + (m.idx % 4) * .35; } }
        else {
          m.orb = (m.orb === undefined ? a + Math.PI : m.orb) + 1.5 * dt;
          const tx = p.x + Math.cos(m.orb) * 125, ty = p.y + Math.sin(m.orb) * 125, at = ang(m.x, m.y, tx, ty);
          aller(at, Math.min(m.vit, Math.sqrt(d2(m.x, m.y, tx, ty)) * 4)); m.face = a; m.cd -= dt;
          if (m.cd <= 0) m.plonge = { a, t: 0 };
        }
        break;
      case 'tourelle':
        m.a += 1.3 * dt; m.cd -= dt; m.face = m.a;
        if (m.cd <= 0) { m.cd = .42; for (const s of [0, Math.PI]) EB(m.x, m.y, m.a + s, 150, { r: 6, src: 'invocation', col: hsl(T.hue, 95, 66), dmg: DMG(.6) }); }
        break;
      case 'chaman': {
        tourne(a, 3); garder(380, m.vit); m.cd -= dt;
        if (m.cd <= 0) {
          const amis = G.minions.filter(o => o.horde && !o.dead && o !== m && o.spawn <= 0 && o.hp < o.hpMax && d2(o.x, o.y, m.x, m.y) < 220 * 220);
          if (amis.length) { m.cd = 3; for (const o of amis) { o.hp = Math.min(o.hpMax, o.hp + o.hpMax * .3); h.rayons.push({ x1: m.x, y1: m.y, o, t: 0 }); } Son.play('soin'); }
          else m.cd = .5;
        }
        break;
      }
      case 'semeur':
        if (!m.but || d2(m.x, m.y, m.but.x, m.but.y) < 30 * 30) { const r = RNG(hashStr('semeur:' + m.idx + ':' + (m.etape = (m.etape || 0) + 1))); m.but = { x: AR.x + 60 + r() * (AR.w - 120), y: AR.y + 60 + r() * (AR.h - 120) }; }
        { const at = ang(m.x, m.y, m.but.x, m.but.y); tourne(at, 3); aller(m.face, m.vit); }
        m.cd -= dt; if (m.cd <= 0) { m.cd = 2.6; if (h.mines.length < 14) h.mines.push({ x: m.x, y: m.y, t: 0, arme: 1, vie: 12, boom: -1 }); }
        break;
      case 'spectre':
        if (m.saut) {
          m.saut.t += dt;
          if (m.saut.t >= .55) { m.x = m.saut.x; m.y = m.saut.y; m.saut = null; m.cd = 3.4; const a2 = ang(m.x, m.y, p.x, p.y); for (const s of [-.28, 0, .28]) EB(m.x, m.y, a2 + s, 210, { r: 7, src: 'invocation', col: hsl(T.hue, 95, 70), dmg: DMG(.7) }); }
        } else {
          tourne(a, 3); aller(m.face, m.vit * .5); m.cd -= dt;
          if (m.cd <= 0) { const k = (m.sauts = (m.sauts || 0) + 1), aa = m.idx * 2.4 + k * 2.1, x = clamp(p.x + Math.cos(aa) * 175, AR.x + 30, AR.x + AR.w - 30), y = clamp(p.y + Math.sin(aa) * 175, AR.y + 30, AR.y + AR.h - 30); m.saut = { x, y, t: 0 }; }
        }
        break;
    }
    // contact
    if (T.contact && G.p && G.p.hp > 0 && G.p.saut <= 0 && d2(m.x, m.y, G.p.x, G.p.y) < (m.r + G.p.hr) ** 2) {
      if (G.blesser(DMG(T.contact * (m.elite ? 1.3 : 1) * (m.charge && m.charge.t >= .8 ? 1.4 : 1)), 'invocation')) { const k = ang(m.x, m.y, G.p.x, G.p.y); G.p.vx += Math.cos(k) * 420; G.p.vy += Math.sin(k) * 420; m.x -= Math.cos(k) * 18; m.y -= Math.sin(k) * 18; }
    }
    G.arene.contenir(m, m.r);
  },
  // ----- la vague -----
  majVague(dt) {
    const h = G.defi.h, p = G.p;
    if (!p || p.hp <= 0) return;
    const vivants = G.minions.filter(m => m.horde && !m.dead);
    // ils s'écartent les uns des autres : jamais de gros paquet
    for (let i = 0; i < vivants.length; i++) for (let j = i + 1; j < vivants.length; j++) {
      const A = vivants[i], B = vivants[j], mn = A.r + B.r + 14, q = d2(A.x, A.y, B.x, B.y);
      if (q < mn * mn && q > .01) { const d = Math.sqrt(q), push = (mn - d) * .5, ux = (B.x - A.x) / d, uy = (B.y - A.y) / d; if (A.type !== 'tourelle') { A.x -= ux * push; A.y -= uy * push; } if (B.type !== 'tourelle') { B.x += ux * push; B.y += uy * push; } }
    }
    // obus
    for (const o of h.obus) {
      o.t += dt;
      if (o.t >= o.dur && !o.fait) { o.fait = true; G.explo(o.x, o.y, o.r, '#d6ff6a'); if (d2(o.x, o.y, p.x, p.y) < (o.r + p.hr) ** 2 && p.saut <= 0) G.blesser(DMG(.9), 'invocation'); }
    }
    h.obus = h.obus.filter(o => !o.fait);
    // mines
    for (const mi of h.mines) {
      mi.t += dt; mi.vie -= dt;
      if (mi.boom < 0 && mi.t > mi.arme && d2(mi.x, mi.y, p.x, p.y) < 36 * 36) { mi.boom = 0; Son.play('tele'); }
      if (mi.boom >= 0) { mi.boom += dt; if (mi.boom >= .35) { mi.fini = true; G.explo(mi.x, mi.y, 58, '#ffe25a'); if (d2(mi.x, mi.y, p.x, p.y) < (58 + p.hr) ** 2 && p.saut <= 0) G.blesser(DMG(.8), 'invocation'); } }
      if (mi.vie <= 0) mi.fini = true;
    }
    h.mines = h.mines.filter(mi => !mi.fini);
    for (const r of h.rayons) r.t += dt; h.rayons = h.rayons.filter(r => r.t < .5);
    // déroulé de la vague
    if (h.pause > 0) { h.pause -= dt; return; }
    const poids = vivants.reduce((s, m) => s + (m.type === 'essaim' ? .5 : 1), 0);
    if (h.file.length) { h.spawnT -= dt; if (h.spawnT <= 0 && poids < this.cap(h.vague)) { this.apparaitre(h.file.shift()); h.spawnT = .55; } }
    else if (!vivants.length) {
      // vague terminée : un peu de vie, une courte pause, la suivante
      h.vague++;
      const soin = Math.min(15, p.hpMax - p.hp); if (soin > 0) { p.hp += soin; G.texte(p.x, p.y - 34, '+' + Math.round(soin) + ' PV', '#46e39b', 17); }
      h.pause = 3; h.mines = []; h.obus = [];
      this.preparer(); this.decor(false);
      G.annonce('Vague ' + h.vague, '#ffcf7a', 2.2); Son.play('gong');
      try { SurvieRun.garder(); } catch (e) { }
    }
  }
};

// ---------- lancement : la Survie devient la horde (reprise possible au début de la vague en cours) ----------
G.lancerSurvie = function () {
  const r0 = Save.d.survieRun, rep = r0 && r0.horde ? r0 : null;
  if (r0 && !rep) delete Save.d.survieRun; // ancienne Survie contre un boss : oubliée
  delete Save.d.survieProchain;
  this.mode = 'survie'; this.finDefi = null;
  // tes armes : celles que tu as choisies (écran de choix au lancement depuis l'accueil)
  if (Horde.depuisMenu && !rep) { Horde.depuisMenu = false; Horde.choisir(); return; }
  Horde.depuisMenu = false;
  const ars = rep && rep.ars ? Object.assign({}, rep.ars) : Horde.armes();
  this.defi = { type: 'horde', format: 'horde', cle: 'horde', mut: [], boss: [{ salle: 10, seed: 777, mega: false, esp: 'sentinelle', ars }], i: 0, temps: rep ? rep.temps || 0 : 0, tues: rep ? rep.tues || 0 : 0, degats: 0, coups: 0, h: null };
  if (!Save.d.defis.horde) Save.d.defis.horde = { cle: 'horde', best: null, essais: 0 };
  if (!rep) Save.d.defis.horde.essais++;
  Save.write();
  calcStats(); this.p = creerJoueur(DF().pv); this.ars = null;
  const cons = Save.d.opts.conseils; Save.d.opts.conseils = false; // pas de fiches de boss avant le combat
  try { this.entrerSalle(); } finally { Save.d.opts.conseils = cons; }
  if (this.etat === 'avant') { UI.cacher(); this.etat = 'combat'; }
  Horde.demarrer(rep);
};
// sauvegarde : la vague en cours, la vie, les armes (on reprend au début de cette vague)
const _garderHorde = SurvieRun.garder;
SurvieRun.garder = function () {
  if (!Horde.actif()) return _garderHorde.apply(this, arguments);
  const df = G.defi; if (G.finDefi || !G.p || G.p.hp <= 0) return;
  Save.d.survieRun = { horde: 1, vague: df.h.vague, pv: G.p.hp, ars: Object.assign({}, df.boss[0].ars), temps: (df.temps || 0) + (G.chrono || 0), tues: df.tues || 0 };
  Save.write();
};
const _finHorde = G.terminerDefi;
G.terminerDefi = function () { const h = Horde.actif(); if (h && !this.finDefi) this.defi.temps = (this.defi.temps || 0); const r = _finHorde.apply(this, arguments); if (h) SurvieRun.effacer(); return r; };

// ---------- boucle ----------
const _majMinionHorde = majMinion;
majMinion = function (m, dt) { if (m && m.horde) { if (Horde.actif()) Horde.maj(m, dt); return; } return _majMinionHorde.apply(this, arguments); };
const _majCombatHorde = majCombat;
majCombat = function (dt) {
  _majCombatHorde.apply(this, arguments);
  try { if (Horde.actif() && G.etat === 'combat') Horde.majVague(G.dtE); } catch (e) { console.warn('horde', e); }
};

// ---------- dégâts : partagés quand un coup touche plusieurs ennemis en même temps ----------
const _coupsInstant = { t: -1, ordre: new Map() };
function rangDansInstant(tg) {
  if (_coupsInstant.t !== G.t) { _coupsInstant.t = G.t; _coupsInstant.ordre.clear(); }
  if (!_coupsInstant.ordre.has(tg)) _coupsInstant.ordre.set(tg, _coupsInstant.ordre.size + 1);
  return _coupsInstant.ordre.get(tg);
}
const _frappeHorde = G.frappe;
G.frappe = function (tg, dmg, o) {
  const vrai = tg && (tg.proxy || tg);
  if (!vrai || !vrai.horde) return _frappeHorde.apply(this, arguments);
  if (this.etat !== 'combat' || vrai.dead || vrai.spawn > 0) return;
  o = o || {};
  let m = tg.proxy ? (tg.mult || 1) : 1;
  if (o.prim) { m *= PRIM_EQ[G.ars.p] || 1; try { const mf = modForge(); if (mf.dmg) m *= mf.dmg; } catch (e) { } if (!o.continu) m *= 1 + (ST.pCrit || 0) + (o.critB || 0); }
  if (vrai.type === 'bouclier' && G.p) {
    const dif = Math.abs(angDiff(vrai.face, ang(vrai.x, vrai.y, G.p.x, G.p.y))); // les coups viennent de toi : de face, le bouclier bloque
    if (dif < 1.05) { m *= .2; if (this.protegeT <= 0) { this.texte(vrai.x, vrai.y - vrai.r - 12, 'Bloqué', '#bfe0ff', 13); this.protegeT = .4; } }
  }
  const n = rangDansInstant(vrai);
  m /= 1 + .45 * (n - 1);
  const d = dmg * m;
  vrai.hp -= d; vrai.flash = 1; this.defi.degats = (this.defi.degats || 0) + d; this.degatsCombat = (this.degatsCombat || 0) + d;
  try { statPlus('degats', undefined, d); } catch (e) { }
  this.chiffre(vrai, d, false, o, m);
  if (vrai.hp <= 0) Horde.tuer(vrai, true);
};

// ---------- dessin des ennemis ----------
function dessinerEnnemi(c, m, menu) {
  const T = HORDE[m.type], h = T.hue, r = m.r, t = G.t || 0;
  if (!menu) { c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(m.x + 3, m.y + r * .75, r * 1.05, r * .45, 0, 0, TAU); c.fill(); }
  if (m.spawn > 0) {
    // apparition : un cercle qui se resserre, l'ennemi se forme
    const k = 1 - m.spawn / .9;
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = hsl(h, 90, 62, .7); c.lineWidth = 2; c.beginPath(); c.arc(m.x, m.y, r * (1 + 2.2 * (1 - k)), 0, TAU); c.stroke();
    c.drawImage(glow(hsl(h, 90, 55, .35), r * 3), m.x - r * 3, m.y - r * 3); c.restore();
    c.globalAlpha = .25 + .5 * k;
  }
  if (m.type === 'spectre') c.globalAlpha *= .78 + .18 * Math.sin(t * 5 + m.ph);
  c.save(); c.translate(m.x, m.y); c.rotate(m.face || 0);
  const corps = c.createRadialGradient(-r * .35, -r * .35, r * .1, 0, 0, r * 1.25);
  corps.addColorStop(0, m.flash > .5 ? '#ffffff' : hsl(h, 60, 60)); corps.addColorStop(.55, hsl(h, 60, 36)); corps.addColorStop(1, hsl(h, 62, 14));
  c.fillStyle = corps; c.strokeStyle = hsl(h, 90, 70); c.lineWidth = 2.4; c.lineJoin = 'round';
  c.beginPath();
  switch (m.type) {
    case 'rodeur': for (let i = 0; i <= 12; i++) { const a = i * TAU / 12, rr = r * (1 + (Math.cos(a) < -.3 ? .22 * (i % 2) : 0)); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } break;
    case 'coureur': c.moveTo(r * 1.4, 0); c.quadraticCurveTo(r * .2, r * 1.1, -r * 1.1, r * .55); c.lineTo(-r * .7, 0); c.lineTo(-r * 1.1, -r * .55); c.quadraticCurveTo(r * .2, -r * 1.1, r * 1.4, 0); break;
    case 'tireur': c.roundRect ? c.roundRect(-r, -r, r * 2, r * 2, r * .45) : c.rect(-r, -r, r * 2, r * 2); break;
    case 'kamikaze': for (let i = 0; i < 12; i++) { const rr = i % 2 ? r * .62 : r * 1.18, a = i * TAU / 12 + t * 3; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); break;
    case 'brute': for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * .92); } c.closePath(); break;
    case 'lanceur': c.arc(0, 0, r, 0, TAU); break;
    case 'bouclier': c.arc(0, 0, r, 0, TAU); break;
    case 'essaim': c.moveTo(r * 1.5, 0); c.lineTo(-r, r * .9); c.lineTo(-r * .5, 0); c.lineTo(-r, -r * .9); c.closePath(); break;
    case 'tourelle': for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); break;
    case 'chaman': c.moveTo(r * 1.1, 0); c.lineTo(-r * .9, r * 1.05); c.quadraticCurveTo(-r * .4, 0, -r * .9, -r * 1.05); c.closePath(); break;
    case 'semeur': c.ellipse(0, 0, r * 1.1, r * .85, 0, 0, TAU); break;
    case 'spectre': c.arc(r * .1, 0, r, -Math.PI / 2, Math.PI / 2); for (let i = 0; i <= 6; i++) { const y = r - i * r / 3; c.lineTo(-r * (1.1 + .25 * Math.sin(t * 8 + i + m.ph) * (i % 2 ? 1 : -1)), y); } c.closePath(); break;
  }
  c.fill(); c.stroke();
  // détails
  c.lineWidth = 2;
  if (m.type === 'tireur' || m.type === 'tourelle') { c.fillStyle = '#1a1d24'; c.strokeStyle = hsl(h, 60, 55); const L = r * 1.5; for (const s of m.type === 'tourelle' ? [0, Math.PI] : [0]) { c.save(); c.rotate(s); c.fillRect(r * .3, -r * .22, L - r * .3, r * .44); c.strokeRect(r * .3, -r * .22, L - r * .3, r * .44); c.restore(); } }
  if (m.type === 'lanceur') { c.fillStyle = '#20251a'; c.beginPath(); c.arc(-r * .15, 0, r * .55, 0, TAU); c.fill(); c.strokeStyle = hsl(h, 70, 60); c.stroke(); }
  if (m.type === 'brute') { c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-r * .5, -r * .8); c.lineTo(-r * .5, r * .8); c.moveTo(r * .1, -r * .85); c.lineTo(r * .1, r * .85); c.stroke(); }
  if (m.type === 'bouclier') { c.strokeStyle = hsl(205, 90, 75); c.lineWidth = 5; c.shadowColor = hsl(205, 100, 65); c.shadowBlur = 8; c.beginPath(); c.arc(0, 0, r + 6, -1.05, 1.05); c.stroke(); c.shadowBlur = 0; }
  if (m.type === 'chaman') { c.fillStyle = hsl(140, 100, 70, .8 + .2 * Math.sin(t * 4)); c.beginPath(); c.arc(-r * .2, 0, r * .3, 0, TAU); c.fill(); }
  if (m.type === 'semeur') { c.fillStyle = hsl(40, 40, 22); c.beginPath(); c.ellipse(-r * .55, 0, r * .45, r * .6, 0, 0, TAU); c.fill(); c.stroke(); }
  if (m.type === 'essaim') { c.globalAlpha *= .5; c.fillStyle = hsl(h, 80, 85); const bat = Math.sin(t * 40 + m.ph) * .4; c.beginPath(); c.ellipse(-r * .1, r * .9, r * .9, r * .35, .6 + bat, 0, TAU); c.ellipse(-r * .1, -r * .9, r * .9, r * .35, -.6 - bat, 0, TAU); c.fill(); c.globalAlpha /= .5; }
  // œil
  if (m.type !== 'tourelle') { const ex = m.type === 'tireur' ? r * .35 : r * .45; c.globalCompositeOperation = 'lighter'; c.drawImage(glow(hsl(h, 100, 72, .7), r * .8), ex - r * .8, -r * .8); c.globalCompositeOperation = 'source-over'; c.fillStyle = hsl(h, 100, 88); c.beginPath(); c.arc(ex, 0, Math.max(1.6, r * .16), 0, TAU); c.fill(); }
  // élite : liseré doré et petite couronne
  if (m.elite) { c.strokeStyle = '#ffd36a'; c.lineWidth = 2.5; c.shadowColor = '#ffb020'; c.shadowBlur = 10; c.beginPath(); c.arc(0, 0, r + 4, 0, TAU); c.stroke(); c.shadowBlur = 0; }
  if (m.flash > 0) { c.globalAlpha = Math.min(1, m.flash) * .5; c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); }
  c.restore();
  c.globalAlpha = 1;
  if (menu) return;
  // annonces : explosion du kamikaze, charge de la brute, saut du spectre
  if (m.type === 'kamikaze' && m.boom !== undefined) { const k = Math.min(1, m.boom / .75); c.fillStyle = `rgba(255,40,80,${.12 + .18 * k})`; c.beginPath(); c.arc(m.x, m.y, 75, 0, TAU); c.fill(); c.strokeStyle = ROUGE; c.lineWidth = 2; c.beginPath(); c.arc(m.x, m.y, 75 * k, 0, TAU); c.stroke(); }
  if (m.type === 'brute' && m.charge && m.charge.t < .8) { const L = 520 * .45, a = m.charge.a, k = m.charge.t / .8; c.save(); c.globalAlpha = .35 + .35 * k; c.strokeStyle = ROUGE; c.lineWidth = r * 2; c.lineCap = 'round'; c.globalAlpha *= .35; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x + Math.cos(a) * L, m.y + Math.sin(a) * L); c.stroke(); c.globalAlpha /= .35; c.lineWidth = 2; c.setLineDash([8, 6]); c.stroke(); c.restore(); }
  if (m.type === 'spectre' && m.saut) { const k = m.saut.t / .55; c.strokeStyle = hsl(h, 90, 75, .8); c.lineWidth = 2; c.setLineDash([4, 5]); c.beginPath(); c.arc(m.saut.x, m.saut.y, r * (2.4 - 1.4 * k), 0, TAU); c.stroke(); c.setLineDash([]); }
  // vie
  if (m.hp < m.hpMax && m.spawn <= 0) { const w = Math.max(24, r * 2.4); c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(m.x - w / 2, m.y - r - 11, w, 4); c.fillStyle = m.elite ? '#ffd36a' : hsl(h, 85, 60); c.fillRect(m.x - w / 2, m.y - r - 11, w * Math.max(0, m.hp / m.hpMax), 4); }
}
const _dessinerMinionHorde = dessinerMinion;
dessinerMinion = function (c, m) { if (m && m.horde) return dessinerEnnemi(c, m); return _dessinerMinionHorde.apply(this, arguments); };

// obus, mines, soins du chaman : dessinés au sol avant les personnages
const _fxHorde = dessinerFx;
dessinerFx = function (c) {
  try {
    if (Horde.actif()) {
      const h = G.defi.h;
      for (const o of h.obus) {
        const k = Math.min(1, o.t / o.dur);
        c.fillStyle = `rgba(200,255,80,${.08 + .14 * k})`; c.beginPath(); c.arc(o.x, o.y, o.r, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(220,255,120,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(o.x, o.y, o.r, 0, TAU); c.stroke();
        c.beginPath(); c.arc(o.x, o.y, o.r * k, 0, TAU); c.stroke();
        // l'obus en vol (petit, en cloche)
        const px = lerp(o.ox, o.x, k), py = lerp(o.oy, o.y, k) - Math.sin(k * Math.PI) * 120;
        c.fillStyle = '#2a3018'; c.beginPath(); c.arc(px, py, 6, 0, TAU); c.fill(); c.strokeStyle = '#d6ff6a'; c.lineWidth = 1.5; c.stroke();
      }
      for (const mi of h.mines) {
        const arme = mi.t > mi.arme, cl = mi.boom >= 0 ? 1 : arme ? (Math.sin(G.t * 6 + mi.x) > .3 ? 1 : .35) : .3;
        if (mi.boom >= 0) { c.fillStyle = 'rgba(255,220,60,.18)'; c.beginPath(); c.arc(mi.x, mi.y, 58, 0, TAU); c.fill(); }
        c.fillStyle = '#26221a'; c.beginPath(); c.arc(mi.x, mi.y, 8, 0, TAU); c.fill(); c.strokeStyle = '#8a7a40'; c.lineWidth = 1.5; c.stroke();
        c.fillStyle = `rgba(255,214,60,${cl})`; c.beginPath(); c.arc(mi.x, mi.y, 3, 0, TAU); c.fill();
      }
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const r of h.rayons) { if (!r.o || r.o.dead) continue; c.strokeStyle = `rgba(120,255,170,${.8 * (1 - r.t / .5)})`; c.lineWidth = 3; c.beginPath(); c.moveTo(r.x1, r.y1); c.lineTo(r.o.x, r.o.y); c.stroke(); }
      c.restore();
    }
  } catch (e) { }
  return _fxHorde.apply(this, arguments);
};

// ---------- interface : la vague en haut au centre ----------
const _hudHorde = dessinerHUD;
dessinerHUD = function (c) {
  const r = _hudHorde.apply(this, arguments);
  try {
    if (!Horde.actif() || !G.p) return r;
    const h = G.defi.h, vivants = G.minions.filter(m => m.horde && !m.dead).reduce((s, m) => s + 1, 0), reste = vivants + h.file.reduce((s, e) => s + (HORDE[e.t].groupe || 1), 0);
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    const x = W / 2, y = 26;
    c.font = `900 26px ${typeof POLICE_ER !== 'undefined' ? POLICE_ER : POLICE}`; c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,.75)';
    const titre = 'VAGUE ' + h.vague; c.strokeText(titre, x, y); c.fillStyle = '#ffd98a'; c.fillText(titre, x, y);
    const bw = 360, bx = x - bw / 2, by = y + 20, k = h.total ? Math.max(0, Math.min(1, reste / h.total)) : 0;
    c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(bx - 2, by - 2, bw + 4, 10);
    const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#ff8a4a'); g.addColorStop(1, '#ffcf6a');
    c.fillStyle = g; c.fillRect(bx, by, bw * k, 6);
    c.font = `700 14px ${POLICE}`; c.lineWidth = 3;
    const sous = h.pause > 0 && !h.file.length && !vivants ? 'La vague arrive…' : reste + ' ' + (reste > 1 ? 'ennemis restants' : 'ennemi restant');
    c.strokeText(sous, x, by + 20); c.fillStyle = '#efe6d2'; c.fillText(sous, x, by + 20);
    c.restore();
  } catch (e) { }
  return r;
};

// ---------- fin de partie, titre de l'écran de fin ----------
const _defiTenuHorde = defiTenu;
defiTenu = function (df) { if (df && df.format === 'horde') return true; return _defiTenuHorde.apply(this, arguments); };

// ---------- accueil : la horde dans la scène et dans le panneau ----------
const _texteSelHorde = texteSel;
texteSel = function (k) {
  if (k !== 'survie') return _texteSelHorde.apply(this, arguments);
  const d = Save.d, T2b = s => (typeof Langue !== 'undefined' && Langue.t ? Langue.t(s) : s);
  const regles = [FORMATS.horde.obj, T2b('Pas de boss : douze sortes de petits ennemis, de plus en plus nombreux.'), T2b('Les vagues sont les mêmes pour tout le monde, les armes de zone sont freinées et la vie des ennemis suit la force de tes armes : la chance compte très peu.')];
  if (d.survieRun && d.survieRun.horde) regles.push(T2b('Partie en cours : tu reprends au début de la vague') + ' ' + d.survieRun.vague + '.');
  const r = d.defis.horde, rec = r && r.best && r.best.score !== undefined ? '🏆 ' + T2b('Ton record') + ' : ' + FORMATS.horde.fmt(r.best.score) : '';
  return `<div class="am-mode">🛡 ${T2b('Survie')}</div>
    <div class="am-boss" style="--h:30"><b>${T2b('La horde')}</b><span>${T2b('vagues sans fin')} · ${Object.keys(HORDE).length} ${T2b('sortes d\'ennemis')}</span></div>
    <div class="am-regles">${regles.map(t => '<p>' + t + '</p>').join('')}</div>
    ${rec ? `<div class="am-rec">${rec}</div>` : ''}
    <div class="am-go">${T2b('Clique encore sur la tuile pour lancer')}</div>`;
};
// dans la grande scène de l'accueil, une petite troupe d'ennemis à la place du boss
const _bossMenuHorde = dessinerBoss;
dessinerBoss = function (c, b) {
  try {
    if (G.etat === 'menu' && typeof SCENE2 !== 'undefined' && b === SCENE2.b && typeof selMenu === 'function' && selMenu() === 'survie') {
      const t = G.t || performance.now() / 1000, groupe = [['brute', 0, 18, 1.6], ['bouclier', -62, -26, 1.35], ['tireur', 62, -34, 1.3], ['kamikaze', -96, 34, 1.2], ['coureur', 100, 30, 1.2], ['chaman', 0, -78, 1.25], ['essaim', -40, 70, 1.1], ['essaim', 40, 74, 1.1], ['spectre', 128, -62, 1.1], ['lanceur', -128, -60, 1.15]];
      for (const [type, x, y, s] of groupe) {
        const T = HORDE[type], m = { type, x: x + Math.sin(t * 1.3 + x) * 4, y: y + Math.cos(t * 1.1 + y) * 4, r: T.r * s, face: Math.PI * .95 + Math.sin(t * .6 + x) * .3, flash: 0, spawn: 0, ph: x, a: t, hp: 1, hpMax: 1, elite: type === 'brute' };
        dessinerEnnemi(c, m, true);
      }
      return;
    }
  } catch (e) { }
  return _bossMenuHorde.apply(this, arguments);
};

// ---------- choix des armes : aucune chance, chacun prend ce qu'il veut ----------
Object.assign(Horde, {
  depuisMenu: false,
  possibles(c) { return ARS[c].filter(a => { try { return multAff(c, a) > 0; } catch (e) { return true; } }); },
  armes() {
    const v = Object.assign({}, Save.d.hordeArmes || {}), out = {};
    for (const c of ['p', 's', 't']) { const l = this.possibles(c); out[c] = l.some(a => a.id === v[c]) ? v[c] : tirerArme(c); }
    Save.d.hordeArmes = Object.assign({}, out);
    return out;
  },
  choisir() {
    const sel = this.armes(), T2b = s => (typeof Langue !== 'undefined' && Langue.t ? Langue.t(s) : s);
    const ligne = (c, titre) => {
      const l = this.possibles(c), choisie = trouveArme(c, sel[c]);
      return `<h3 class="hc-titre">${T2b(titre)}</h3><div class="hc-grille">${l.map(a => `<button class="hc-arme${a.id === sel[c] ? ' sel' : ''}" data-a="hordeChoix" data-c="${c}" data-id="${a.id}" title="${(a.desc || '').replace(/"/g, '&quot;')}">${icoSVG(c + ':' + a.id) || a.ico || ''}<span>${a.nom}</span></button>`).join('')}</div>
        <p class="hc-desc"><b>${choisie ? choisie.nom : ''}</b> — ${choisie ? choisie.desc || '' : ''}</p>`;
    };
    UI.ecran('🛡 ' + T2b('Survie') + ' — ' + T2b('tes armes'), `<div class="horde-choix">
      <p class="hc-aide">${T2b('Choisis tes trois armes. Tout le monde peut prendre les mêmes et les vagues sont identiques pour tous : la chance ne décide de rien. La vie des ennemis suit la force des armes choisies, chaque choix reste bon.')}</p>
      ${ligne('p', 'Arme principale')}${ligne('s', 'Spéciale')}${ligne('t', 'Talent')}
      <div class="hc-bas"><button class="hc-go" data-a="hordeGo">▶ ${T2b('Lancer la Survie')}</button></div></div>`);
  }
});
const _actionHorde = UI.action;
UI.action = function (a, btn) {
  if (a === 'hordeChoix' && btn) {
    const ec = this.el, haut = ec ? ec.scrollTop : 0;
    Save.d.hordeArmes = Object.assign(Horde.armes(), { [btn.dataset.c]: btn.dataset.id }); Save.write();
    Horde.choisir();
    if (ec) ec.scrollTop = haut;
    const b2 = ec && ec.querySelector(`.hc-arme[data-c="${btn.dataset.c}"][data-id="${btn.dataset.id}"]`); if (b2 && typeof b2.focus === 'function') try { b2.focus({ preventScroll: true }); } catch (e) { }
    return;
  }
  if (a === 'hordeGo') { this.cacher(); Horde.depuisMenu = false; G.lancerSurvie(); return; }
  if (a === 'survie') Horde.depuisMenu = true;
  try { return _actionHorde.call(this, a, btn); } finally { if (a === 'survie') Horde.depuisMenu = false; }
};
