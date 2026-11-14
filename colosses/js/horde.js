'use strict';
/* Colosses — Survie : plus de boss. Des ennemis arrivent sans arrêt, et plus le temps passe, plus ils arrivent vite et
   nombreux (pas de vagues : une menace qui monte). Ils viennent tous t'attaquer, au contact ou à distance, et chacun a
   son attaque et sa façon d'être combattu. Score : le temps tenu.
   La chance compte le moins possible :
   • l'ordre des ennemis et leurs points d'arrivée sont les mêmes pour tout le monde ;
   • un nombre limité d'ennemis à la fois (3 au début, 11 au plus), qui s'écartent les uns des autres ;
   • un coup qui touche plusieurs ennemis au même instant fait de moins en moins mal à chacun
     (1er 100 %, 2e 69 %, 3e 53 %, 4e 43 %…) : les armes de zone ne balaient pas tout ;
   • les armes sont tirées au sort, mais la vie des ennemis suit leur force (un bon tirage ne rend pas la partie facile) ;
   • pas de coups critiques au hasard : leur effet moyen est donné à chaque coup. */

// des : à partir de combien de secondes l'ennemi peut arriver ; parade : comment le battre
const HORDE = {
  rodeur: { nom: 'Rôdeur', desc: 'Une bête qui court droit sur toi et mord au contact.', parade: 'Recule en tirant.', hp: 55, r: 14, vit: 110, cout: 1, des: 0, hue: 14, contact: .55 },
  coureur: { nom: 'Coureur', desc: 'Très rapide, il zigzague jusqu\'à toi et tranche au passage.', parade: 'Fragile : un ou deux coups. Écarte-toi au dernier moment.', hp: 30, r: 12, vit: 190, cout: 1, des: 12, hue: 42, contact: .45 },
  tireur: { nom: 'Tireur', desc: 'S\'approche à moyenne distance, vise (une ligne t\'avertit) puis tire.', parade: 'Sors de la ligne de visée, puis fonce sur lui.', hp: 45, r: 14, vit: 95, cout: 2, des: 24, hue: 198 },
  kamikaze: { nom: 'Kamikaze', desc: 'Une bombe vivante : elle fonce, s\'arrête près de toi et explose.', parade: 'Abats-la de loin, ou sors du cercle rouge.', hp: 32, r: 13, vit: 200, cout: 2, des: 36, hue: 352 },
  sauteur: { nom: 'Sauteur', desc: 'Bondit sur toi : un cercle montre où il va retomber.', parade: 'Sors du cercle avant qu\'il atterrisse ; juste après, il reste un instant sans bouger.', hp: 70, r: 15, vit: 90, cout: 2, des: 48, hue: 330 },
  brute: { nom: 'Brute', desc: 'Lente et solide ; elle charge en ligne droite (la ligne est annoncée).', parade: 'Pas de côté quand la ligne apparaît.', hp: 240, r: 24, vit: 62, cout: 4, des: 60, hue: 24, contact: 1 },
  lanceur: { nom: 'Lanceur', desc: 'Vient à portée et lance des obus là où tu te trouves.', parade: 'Ne reste jamais immobile.', hp: 60, r: 15, vit: 80, cout: 3, des: 72, hue: 88 },
  rayon: { nom: 'Prisme', desc: 'S\'arrête à distance et tire un long rayon : une ligne fine le suit, puis se fige en rouge juste avant le tir.', parade: 'Pas de côté quand la ligne devient rouge.', hp: 60, r: 14, vit: 80, cout: 3, des: 84, hue: 185 },
  bouclier: { nom: 'Porte-bouclier', desc: 'Avance sur toi derrière un grand bouclier et te repousse d\'un coup de bouclier.', parade: 'Il tourne lentement : passe sur son côté ou dans son dos.', hp: 110, r: 17, vit: 85, cout: 3, des: 96, hue: 214, contact: .6 },
  essaim: { nom: 'Essaim', desc: 'Quatre insectes qui tournent autour de toi puis plongent.', parade: 'Esquive chaque plongeon de côté.', hp: 14, r: 9, vit: 155, cout: 2, des: 108, hue: 300, contact: .35, groupe: 4 },
  empoisonneur: { nom: 'Empoisonneur', desc: 'Lance des fioles qui laissent des flaques de poison pendant plusieurs secondes.', parade: 'Ne reste pas dans les flaques et garde de la place pour bouger.', hp: 55, r: 14, vit: 85, cout: 3, des: 120, hue: 95 },
  foreur: { nom: 'Foreur', desc: 'Creuse sous le sol jusqu\'à toi (intouchable), puis jaillit en faisant sortir des pics.', parade: 'Quitte le cercle quand il sort, puis frappe-le avant qu\'il replonge.', hp: 90, r: 16, vit: 130, cout: 3, des: 132, hue: 30 },
  chaman: { nom: 'Chaman', desc: 'S\'approche, soigne ses alliés d\'un coup, sinon lance un orbe qui te suit.', parade: 'Abats-le en premier ; l\'orbe est lent, distance-le.', hp: 70, r: 15, vit: 85, cout: 4, des: 144, hue: 150 },
  harponneur: { nom: 'Harponneur', desc: 'Lance un harpon (annoncé par une ligne) qui te tire vers lui.', parade: 'Esquive le harpon de côté ou avec ta ruée.', hp: 65, r: 14, vit: 85, cout: 3, des: 156, hue: 28 },
  guerisseuse: { nom: 'Guérisseuse', desc: 'Se cache derrière l\'allié le plus solide et le soigne sans arrêt avec un rayon.', parade: 'Contourne l\'allié et abats-la d\'abord.', hp: 50, r: 13, vit: 100, cout: 3, des: 168, hue: 120 },
  semeur: { nom: 'Semeur', desc: 'Te poursuit en semant des mines derrière lui, donc sur ton chemin.', parade: 'Ne repasse pas par où tu es passé ; abats-le vite.', hp: 60, r: 14, vit: 100, cout: 2, des: 180, hue: 56 },
  givre: { nom: 'Gardien du givre', desc: 'Avance entouré d\'un champ de givre qui te ralentit beaucoup.', parade: 'Reste hors de son cercle et tire de loin.', hp: 130, r: 18, vit: 70, cout: 4, des: 192, hue: 200, contact: .7 },
  spectre: { nom: 'Spectre', desc: 'Disparaît, réapparaît près de toi (l\'endroit est annoncé) et tire en éventail.', parade: 'Regarde la marque : tourne-lui le dos au bon moment.', hp: 40, r: 14, vit: 80, cout: 3, des: 204, hue: 276 }
};
const HORDE_THEMES = ['temple', 'ruines', 'metal', 'volcan', 'neant', 'glace', 'marais', 'cathedrale', 'celeste'];

FORMATS.horde = {
  nom: 'Survie', ico: '🛡', obj: 'Des ennemis arrivent sans arrêt, toujours plus vite et plus nombreux : tiens le plus longtemps possible', sens: 1, un: true,
  score: r => Math.round((r.temps || 0) * 10) / 10, fmt: v => fmtTemps(v)
};

// force des armes contre une foule (dégâts par seconde mesurés par le robot : 8 ennemis autour du héros, partage compris)
// 0 = non mesurable par le robot (armes à charger, à rythme) : comptée comme moyenne. Les spéciales sans dégâts aussi.
const HORDE_MESURE = {"p":{"blaster":104,"pompe":123,"flammes":130,"arc":96,"epee":220,"mitra":133,"laser":118,"boomerang":108,"sniper":112,"orbes":106,"grenades":237,"foudre":197,"faux":327,"jumeaux":109,"shuriken":58,"roquettes":233,"fouet":106,"plasma":87,"aiguilles":113,"railgun":0,"pistolet":127,"rattrape":121,"echo":218,"meteorite":0,"jumelles":140,"ricochets":46,"gravite":173,"croix":125,"surchauffe":68,"iaido":0,"cryo":113,"harpon":87,"mortier":248,"hachettes":118,"chakram":110,"lucioles":102,"lameSpectrale":219,"prisme":109,"foreuse":159,"ronceLance":184,"pacte":138,"marteau":305,"glaive":91,"givreLance":105,"arbalete":117,"dagues":108,"sismique":60,"trident":120,"calice":81,"froleur":94,"couleuvrine":128,"bombeCollante":0,"helice":138,"focale":141,"toupie":136,"croissant":141,"acide":142,"tambour":6,"portee":48,"dosLame":144},"s":{"meteore":240,"tourelle":50,"devast":121,"nova":314,"missiles":82,"lames":88,"javelot":70,"trou":89,"miroir":0,"barrage":136,"gel":0,"clones":68,"lamesCiel":100,"onde":85,"satellite":90,"soin":0,"murForce":0,"supernova":286,"quatre":360,"renvoi":0,"arret":0,"blizzard":73,"colonne":92,"tempeteElec":100,"racines":0,"faille":130,"lumiereSacree":41,"ombres":118,"aimantSpe":0,"pluieMeteores":186,"volee":48,"repousse":89,"tornade":15,"mines":121,"lanceSoleil":77,"orage":71}};
function hordeForceArmes(ars) {
  try {
    const med = o => { const v = Object.values(o).filter(x => x > 20).sort((a, b) => a - b); return v[v.length >> 1] || 1; };
    const mp = med(HORDE_MESURE.p), ms = med(HORDE_MESURE.s);
    const P = HORDE_MESURE.p[ars.p] > 20 ? HORDE_MESURE.p[ars.p] : mp, S = HORDE_MESURE.s[ars.s] > 20 ? HORDE_MESURE.s[ars.s] : ms;
    return clamp((P + .5 * S) / (mp + .5 * ms), .6, 2.8);
  } catch (e) { return 1; }
}

const Horde = {
  actif() { return G.mode === 'survie' && G.defi && G.defi.format === 'horde' && G.defi.h; },
  temps() { const df = G.defi; return G.finDefi ? (df.temps || 0) : (df.temps || 0) + (G.chrono || 0); },
  cap(T) { return Math.min(11, 3 + Math.floor(T / 20)); },
  cadence(T) { return .4 + .011 * T; },          // ennemis par seconde (tant qu'il y a de la place)
  niveau(T) { return 1 + Math.floor(T / 30); },
  demarrer(rep) {
    const df = G.defi;
    G.boss = null; G.banner = null; G.toast = null; G.hz = []; G.eb = []; G.minions = []; G.portail = null;
    try { Arene.appliquer('normale'); } catch (e) { }
    try { AV.raz(null); } catch (e) { }
    try { Regions.entrer(null); } catch (e) { } // pas de pièges de région en Survie
    G.lenteur = 1;
    df.h = { flaques: rep ? rep.flaques || [] : [], crochets: [], k: rep ? rep.k || 0 : Math.floor((df.temps || 0) * 1.2), jauge: rep ? rep.jauge || 0 : .6, force: hordeForceArmes(G.ars), obus: [], mines: [], rayons: [], sonT: 0, soinT: rep ? rep.soinT || 0 : 0, niv: 0 };
    if (rep) {
      if (G.p) G.p.hp = clamp(rep.pv || G.p.hpMax, 1, G.p.hpMax);
      for (const m of rep.en || []) G.minions.push(Object.assign(m, { horde: true }));
      df.h.mines = rep.mines || []; df.h.obus = rep.obus || [];
    }
    Decor.theme = rep && rep.theme ? rep.theme : R.pick(HORDE_THEMES); Arene.version++; df.theme = Decor.theme;
    this.regler();
    G.annonce(rep ? 'Reprise : ' + fmtTemps(df.temps || 0) : df.depart > 0 ? 'Départ à ' + fmtTemps(df.depart) + ' (record − 2 min)' : 'Ils arrivent…', '#ffcf7a', 2.4);
  },
  regler() { const T = this.temps(); G.dmgE = 20 * DF().dmg * (1 + .004 * T); }, // les coups font de plus en plus mal (×2,2 à 5 min, ×3,4 à 10 min)
  // l'ennemi n° k : le même pour tout le monde
  suivant(T) {
    const h = G.defi.h, r = RNG(hashStr('horde-v2:' + h.k)), dispo = Object.keys(HORDE).filter(t => HORDE[t].des <= T);
    const t = r.weighted(dispo, x => 1 / Math.sqrt(HORDE[x].cout));
    return { t, elite: T > 200 && h.k % 6 === 5 && !HORDE[t].groupe, pt: this.point(r) };
  },
  point(r) {
    const m = 40, s = r.int(0, 3), u = r();
    let x = s === 0 ? AR.x + m + u * (AR.w - 2 * m) : s === 1 ? AR.x + AR.w - m : s === 2 ? AR.x + m + u * (AR.w - 2 * m) : AR.x + m;
    let y = s === 0 ? AR.y + m : s === 1 ? AR.y + m + u * (AR.h - 2 * m) : s === 2 ? AR.y + AR.h - m : AR.y + m + u * (AR.h - 2 * m);
    if (G.p && d2(x, y, G.p.x, G.p.y) < 300 * 300) { x = 2 * CX - x; y = 2 * CY - y; }
    return { x, y };
  },
  creer(type, x, y, elite, T) {
    const h = G.defi.h, D = HORDE[type], e = elite ? 1 : 0;
    const hp = D.hp * (1 + .005 * T) * h.force * (e ? 2.6 : 1);
    const m = { horde: true, type, x, y, r: D.r * (e ? 1.25 : 1), hp, hpMax: hp, vit: D.vit * (1 + Math.min(.3, .0008 * T)), spawn: .9, flash: 0, elite: !!elite,
      idx: h.k * 4 + G.minions.length % 4, t: 0, face: G.p ? ang(x, y, G.p.x, G.p.y) : 0, cd: 1 + ((h.k * .37) % 1.2), ph: (h.k * 1.7) % TAU };
    if (type === 'foreur') { m.etat = 'sous'; m.et = 0; m.spawn = .3; }
    G.minions.push(m);
    return m;
  },
  tuer(m, parJoueur) {
    if (m.dead) return;
    const h = G.defi.h, D = HORDE[m.type];
    m.dead = true;
    if (parJoueur) { G.defi.tues = (G.defi.tues || 0) + 1; if (G.p && G.p.spec) G.p.spec.cd = Math.max(0, G.p.spec.cd - .2); }
    G.explo(m.x, m.y, m.r * (m.elite ? 3 : 2.2), hsl(D.hue, 90, 62));
    if (G.t - h.sonT > .07) { h.sonT = G.t; Son.play(m.elite || m.type === 'brute' ? 'explo' : 'touche'); }
  },
  // ----- un ennemi : tous viennent t'attaquer -----
  maj(m, dt) {
    if (m.spawn > 0) { m.spawn -= dt; return; }
    const D = HORDE[m.type], p = cible(), a = ang(m.x, m.y, p.x, p.y), dd = Math.sqrt(d2(m.x, m.y, p.x, p.y)), h = G.defi.h;
    m.t += dt; m.flash = Math.max(0, m.flash - dt * 6);
    const tourne = (ca, v) => { m.face += clamp(angDiff(m.face, ca), -v * dt, v * dt); }; // angDiff(a, b) = b − a
    const aller = (a0, v) => { m.x += Math.cos(a0) * v * dt; m.y += Math.sin(a0) * v * dt; };
    // s'approche jusqu'à sa portée, puis tourne autour de toi en restant à portée
    const portee = (dist, v) => { const s = dd > dist + 30 ? 1 : dd < dist - 60 ? -.6 : 0; aller(a, v * s); aller(a + Math.PI / 2 * (m.idx % 2 ? 1 : -1), v * .4); };
    switch (m.type) {
      case 'rodeur': tourne(a, 4); aller(m.face, m.vit); break;
      case 'coureur': tourne(a, 7); aller(m.face + Math.sin(m.t * 6 + m.ph) * .7 * Math.min(1, dd / 150), m.vit); break;
      case 'tireur':
        tourne(a, 5); if (!(m.vise > 0)) portee(280, m.vit); m.cd -= dt;
        if (m.cd <= 0 && dd < 520) { m.cd = 2.1; m.vise = .45; m.viseA = a; }
        if (m.vise > 0) { m.viseA += clamp(angDiff(m.viseA, a), -1.2 * dt, 1.2 * dt); m.vise -= dt; if (m.vise <= 0) EB(m.x, m.y, m.viseA, 300, { r: 7, src: 'invocation', col: hsl(D.hue, 95, 66), dmg: DMG(.75) }); }
        break;
      case 'kamikaze':
        if (m.boom === undefined) { tourne(a, 6); aller(m.face, m.vit); if (dd < 72) { m.boom = 0; Son.play('tele'); } }
        else { m.boom += dt; if (m.boom >= .75) { G.explo(m.x, m.y, 78, ROUGE); Son.play('explo'); if (G.p && d2(m.x, m.y, G.p.x, G.p.y) < (78 + G.p.hr) ** 2) G.blesser(DMG(1.1), 'invocation'); this.tuer(m, false); return; } }
        break;
      case 'brute':
        if (m.charge) { const c = m.charge; c.t += dt; if (c.t >= .8 && c.t < 1.25) aller(c.a, 540); else if (c.t >= 1.25) { m.charge = null; m.cd = 4.2; } }
        else { tourne(a, 2.5); aller(m.face, m.vit); m.cd -= dt; if (m.cd <= 0 && dd < 480) { m.charge = { a, t: 0 }; Son.play('tele'); } }
        break;
      case 'lanceur':
        tourne(a, 4); portee(330, m.vit); m.cd -= dt;
        if (m.cd <= 0 && dd < 560) { m.cd = 3.2; h.obus.push({ x: G.p.x, y: G.p.y, r: 62, t: 0, dur: 1.1, ox: m.x, oy: m.y }); }
        break;
      case 'bouclier':
        tourne(a, 1.3); aller(a, m.vit); m.cd -= dt;
        if (m.cd <= 0 && dd < m.r + 46 && Math.abs(angDiff(a, m.face)) < .9) { m.cd = 1.6; m.bash = .25; if (G.blesser(DMG(.6), 'invocation')) { G.p.vx += Math.cos(m.face) * 650; G.p.vy += Math.sin(m.face) * 650; } }
        if (m.bash > 0) m.bash -= dt;
        break;
      case 'essaim':
        if (m.plonge) { m.plonge.t += dt; aller(m.plonge.a, m.vit * 2.3); if (m.plonge.t > .55) { m.plonge = null; m.cd = 2.2 + (m.idx % 4) * .35; } }
        else {
          m.orb = (m.orb === undefined ? a + Math.PI : m.orb) + 1.5 * dt;
          const tx = p.x + Math.cos(m.orb) * 125, ty = p.y + Math.sin(m.orb) * 125, at = ang(m.x, m.y, tx, ty);
          aller(at, Math.min(m.vit, Math.sqrt(d2(m.x, m.y, tx, ty)) * 4)); m.face = at; m.cd -= dt;
          if (m.cd <= 0) { m.plonge = { a, t: 0 }; m.face = a; }
        }
        break;
      case 'foreur':
        m.et += dt;
        if (m.etat === 'sous') { aller(a, m.vit); m.face = a; m.sous = true; if (dd < 40 || m.et > 3.5) { m.etat = 'sort'; m.et = 0; Son.play('tele'); } }
        else if (m.etat === 'sort') { m.sous = true; if (m.et >= .75) { m.etat = 'dehors'; m.et = 0; m.sous = false; G.explo(m.x, m.y, 70, '#c9a06a'); G.secoue(5); if (G.p && G.p.saut <= 0 && d2(m.x, m.y, G.p.x, G.p.y) < (70 + G.p.hr) ** 2) G.blesser(DMG(1), 'invocation'); } }
        else { tourne(a, 2); aller(m.face, 35); m.sous = false; if (m.et > 2.6) { m.etat = 'sous'; m.et = 0; } }
        break;
      case 'chaman': {
        tourne(a, 3); portee(300, m.vit); m.cd -= dt;
        if (m.cd <= 0) {
          m.cd = 3;
          const amis = G.minions.filter(o => o.horde && !o.dead && o !== m && o.spawn <= 0 && o.hp < o.hpMax * .9 && d2(o.x, o.y, m.x, m.y) < 240 * 240);
          if (amis.length) { for (const o of amis) { o.hp = Math.min(o.hpMax, o.hp + o.hpMax * .25); h.rayons.push({ x1: m.x, y1: m.y, o, t: 0 }); } Son.play('soin'); }
          else EB(m.x, m.y, a, 135, { r: 10, src: 'invocation', col: hsl(D.hue, 95, 65), dmg: DMG(.9), hom: 1.3, life: 5 });
        }
        break;
      }
      case 'semeur':
        tourne(a, 3); aller(m.face, m.vit); m.cd -= dt;
        if (m.cd <= 0) { m.cd = 1.6; if (h.mines.length < 16) h.mines.push({ x: m.x - Math.cos(m.face) * m.r, y: m.y - Math.sin(m.face) * m.r, t: 0, arme: .9, vie: 10, boom: -1 }); }
        break;
      case 'spectre':
        if (m.saut) {
          m.saut.t += dt; m.cache = true;
          if (m.saut.t >= .6) { m.x = m.saut.x; m.y = m.saut.y; m.saut = null; m.cache = false; m.cd = 3.2; const a2 = ang(m.x, m.y, p.x, p.y); for (const s of [-.3, 0, .3]) EB(m.x, m.y, a2 + s, 220, { r: 7, src: 'invocation', col: hsl(D.hue, 95, 72), dmg: DMG(.7) }); }
        } else {
          tourne(a, 3); aller(m.face, m.vit); m.cd -= dt;
          if (m.cd <= 0) { const k = (m.sauts = (m.sauts || 0) + 1), aa = m.idx * 2.4 + k * 2.1, x = clamp(p.x + Math.cos(aa) * 170, AR.x + 30, AR.x + AR.w - 30), y = clamp(p.y + Math.sin(aa) * 170, AR.y + 30, AR.y + AR.h - 30); m.saut = { x, y, t: 0 }; }
        }
        break;
      case 'sauteur':
        if (m.bond) {
          const b = m.bond; b.t += dt; const k = Math.min(1, b.t / b.dur);
          m.x = lerp(b.x0, b.x1, k); m.y = lerp(b.y0, b.y1, k); m.haut = Math.sin(k * Math.PI) * 70; m.cache = true;
          if (k >= 1) { m.bond = null; m.cache = false; m.haut = 0; m.cd = 3.2; m.repos = .9; G.explo(m.x, m.y, 65, hsl(D.hue, 90, 62)); G.secoue(4); if (G.p && G.p.saut <= 0 && d2(m.x, m.y, G.p.x, G.p.y) < (65 + G.p.hr) ** 2) G.blesser(DMG(1), 'invocation'); }
        } else if (m.repos > 0) m.repos -= dt;
        else { tourne(a, 4); aller(m.face, m.vit); m.cd -= dt; if (m.cd <= 0 && dd < 420) { m.bond = { x0: m.x, y0: m.y, x1: clamp(p.x, AR.x + 20, AR.x + AR.w - 20), y1: clamp(p.y, AR.y + 20, AR.y + AR.h - 20), t: 0, dur: .95 }; Son.play('tele'); } }
        break;
      case 'rayon':
        if (m.tir) {
          const T2 = m.tir; T2.t += dt;
          if (T2.t < .8) T2.a += clamp(angDiff(T2.a, a), -1.4 * dt, 1.4 * dt);
          if (T2.t >= 1.1 && T2.t < 1.55 && !T2.fait && G.p && G.p.saut <= 0 && segD2(G.p.x, G.p.y, m.x, m.y, m.x + Math.cos(T2.a) * 900, m.y + Math.sin(T2.a) * 900) < (14 + G.p.hr) ** 2) { if (G.blesser(DMG(1.1), 'invocation')) T2.fait = true; }
          if (T2.t >= 1.55) { m.tir = null; m.cd = 3.6; }
          m.face = T2.a;
        } else { tourne(a, 4); portee(330, m.vit); m.cd -= dt; if (m.cd <= 0 && dd < 600) { m.tir = { a, t: 0 }; Son.play('tele'); } }
        break;
      case 'empoisonneur':
        tourne(a, 4); portee(300, m.vit); m.cd -= dt;
        if (m.cd <= 0 && dd < 560) { m.cd = 3.6; h.obus.push({ x: G.p.x, y: G.p.y, r: 70, t: 0, dur: .9, ox: m.x, oy: m.y, poison: true }); }
        break;
      case 'harponneur':
        if (m.vise2 > 0) { m.vise2 -= dt; m.face = m.viseA; if (m.vise2 <= 0) h.crochets.push({ x: m.x, y: m.y, a: m.viseA, d: 0, m }); }
        else { tourne(a, 4); portee(300, m.vit); m.cd -= dt; if (m.cd <= 0 && dd < 520) { m.cd = 3.6; m.vise2 = .55; m.viseA = a; Son.play('tele'); } }
        break;
      case 'guerisseuse': {
        let al = m.soigne && !m.soigne.dead && !m.soigne.sous ? m.soigne : null;
        if (!al || (m.t % 2) < dt) { al = null; let best = 0; for (const o of G.minions) if (o.horde && !o.dead && o !== m && o.type !== 'guerisseuse' && !o.sous && o.spawn <= 0 && o.hpMax > best) { best = o.hpMax; al = o; } m.soigne = al; }
        if (al) {
          const ap = ang(p.x, p.y, al.x, al.y), tx = al.x + Math.cos(ap) * 70, ty = al.y + Math.sin(ap) * 70;
          if (d2(m.x, m.y, tx, ty) > 100) aller(ang(m.x, m.y, tx, ty), m.vit);
          tourne(ang(m.x, m.y, al.x, al.y), 5);
          if (d2(m.x, m.y, al.x, al.y) < 260 * 260) al.hp = Math.min(al.hpMax, al.hp + al.hpMax * .09 * dt);
        } else { tourne(a, 4); portee(260, m.vit); m.cd -= dt; if (m.cd <= 0) { m.cd = 2.2; EB(m.x, m.y, a, 200, { r: 7, src: 'invocation', col: hsl(D.hue, 95, 70), dmg: DMG(.6) }); } }
        break;
      }
      case 'givre': tourne(a, 3); aller(m.face, m.vit); break;
    }
    // contact (morsure, coup de lame, poing, dard…)
    if (D.contact && !m.sous && G.p && G.p.hp > 0 && G.p.saut <= 0 && d2(m.x, m.y, G.p.x, G.p.y) < (m.r + G.p.hr) ** 2) {
      if (G.blesser(DMG(D.contact * (m.elite ? 1.3 : 1) * (m.charge && m.charge.t >= .8 ? 1.4 : 1)), 'invocation')) { const k = ang(m.x, m.y, G.p.x, G.p.y); G.p.vx += Math.cos(k) * 420; G.p.vy += Math.sin(k) * 420; m.x -= Math.cos(k) * 18; m.y -= Math.sin(k) * 18; m.mord = .2; }
    }
    if (m.mord > 0) m.mord -= dt;
    G.arene.contenir(m, m.r);
  },
  // ----- l'arrivée des ennemis : une menace qui monte avec le temps -----
  majFlux(dt) {
    const h = G.defi.h, p = G.p;
    if (!p || p.hp <= 0) return;
    const T = this.temps();
    this.regler();
    const vivants = G.minions.filter(m => m.horde && !m.dead);
    // ils s'écartent les uns des autres : jamais de gros paquet
    for (let i = 0; i < vivants.length; i++) for (let j = i + 1; j < vivants.length; j++) {
      const A = vivants[i], B = vivants[j]; if (A.sous || B.sous) continue;
      const mn = A.r + B.r + 14, q = d2(A.x, A.y, B.x, B.y);
      if (q < mn * mn && q > .01) { const d = Math.sqrt(q), push = (mn - d) * .5, ux = (B.x - A.x) / d, uy = (B.y - A.y) / d; A.x -= ux * push; A.y -= uy * push; B.x += ux * push; B.y += uy * push; }
    }
    // obus et mines
    for (const o of h.obus) { o.t += dt; if (o.t >= o.dur && !o.fait && o.poison) { o.fait = true; h.flaques.push({ x: o.x, y: o.y, r: o.r, vie: 6, t: 0, tick: 0 }); G.explo(o.x, o.y, 30, '#9cff5a'); continue; } if (o.t >= o.dur && !o.fait) { o.fait = true; G.explo(o.x, o.y, o.r, '#d6ff6a'); if (d2(o.x, o.y, p.x, p.y) < (o.r + p.hr) ** 2 && p.saut <= 0) G.blesser(DMG(.9), 'invocation'); } }
    h.obus = h.obus.filter(o => !o.fait);
    for (const mi of h.mines) {
      mi.t += dt; mi.vie -= dt;
      if (mi.boom < 0 && mi.t > mi.arme && d2(mi.x, mi.y, p.x, p.y) < 36 * 36) { mi.boom = 0; Son.play('tele'); }
      if (mi.boom >= 0) { mi.boom += dt; if (mi.boom >= .35) { mi.fini = true; G.explo(mi.x, mi.y, 58, '#ffe25a'); if (d2(mi.x, mi.y, p.x, p.y) < (58 + p.hr) ** 2 && p.saut <= 0) G.blesser(DMG(.8), 'invocation'); } }
      if (mi.vie <= 0) mi.fini = true;
    }
    h.mines = h.mines.filter(mi => !mi.fini);
    // flaques de poison
    for (const f of h.flaques) { f.t += dt; f.vie -= dt; f.tick -= dt; if (f.tick <= 0 && p.saut <= 0 && d2(f.x, f.y, p.x, p.y) < (f.r * .85 + p.hr) ** 2) { f.tick = .6; G.blesser(DMG(.3), 'invocation'); } }
    h.flaques = h.flaques.filter(f => f.vie > 0);
    // harpons : s'ils te touchent, ils te tirent vers le harponneur
    for (const c of h.crochets) {
      c.d += 560 * dt; const x = c.x + Math.cos(c.a) * c.d, y = c.y + Math.sin(c.a) * c.d;
      if (p.saut <= 0 && d2(x, y, p.x, p.y) < (p.hr + 10) ** 2) { c.fini = true; if (G.blesser(DMG(.5), 'invocation') && c.m && !c.m.dead) { const k = ang(p.x, p.y, c.m.x, c.m.y); p.vx += Math.cos(k) * 950; p.vy += Math.sin(k) * 950; } }
      if (c.d > 560 || !c.m || c.m.dead) c.fini = true;
    }
    h.crochets = h.crochets.filter(c => !c.fini);
    for (const r of h.rayons) r.t += dt; h.rayons = h.rayons.filter(r => r.t < .5);
    // un peu de vie toutes les minutes (la même pour tout le monde)
    h.soinT += dt; if (h.soinT >= 60) { h.soinT -= 60; const s = Math.min(12, p.hpMax - p.hp); if (s > 0) { p.hp += s; G.texte(p.x, p.y - 34, '+' + Math.round(s) + ' PV', '#46e39b', 17); } }
    // la menace monte : un nouveau niveau toutes les 30 s
    const niv = this.niveau(T); if (niv > h.niv) { if (h.niv) { G.annonce('Menace ' + niv, '#ff9a5a', 1.6); Son.play('gong'); } h.niv = niv; }
    // arrivée des ennemis
    const poids = vivants.reduce((s, m) => s + (m.type === 'essaim' ? .5 : 1), 0);
    h.jauge = Math.min(3, h.jauge + this.cadence(T) * dt);
    if (h.jauge >= 1 && poids < this.cap(T)) {
      h.jauge -= 1;
      const e = this.suivant(T), D = HORDE[e.t];
      if (D.groupe) for (let i = 0; i < D.groupe; i++) { const a = i * TAU / D.groupe; this.creer(e.t, e.pt.x + Math.cos(a) * 22, e.pt.y + Math.sin(a) * 22, false, T); }
      else this.creer(e.t, e.pt.x, e.pt.y, e.elite, T);
      h.k++;
    }
  }
};

// ---------- lancement : armes tirées au sort ; reprise possible à l'endroit exact ----------
G.lancerSurvie = function () {
  const r0 = Save.d.survieRun, rep = r0 && r0.horde2 ? r0 : null;
  if (r0 && !rep) delete Save.d.survieRun; // anciennes parties (boss, vagues) : oubliées
  delete Save.d.survieProchain;
  this.mode = 'survie'; this.finDefi = null;
  const ars = rep && rep.ars ? Object.assign({}, rep.ars) : { p: tirerArme('p'), s: tirerArme('s'), t: tirerArme('t') };
  if (!Save.d.defis.horde || Save.d.defis.horde.cle !== 'horde2') Save.d.defis.horde = { cle: 'horde2', best: null, essais: 0 };
  const record = (Save.d.defis.horde.best || {}).score || 0, depart = Math.max(0, Math.floor(record - 120)); // on commence à son record moins 2 minutes
  this.defi = { type: 'horde', format: 'horde', cle: 'horde2', mut: [], boss: [{ salle: 10, seed: 777, mega: false, esp: 'sentinelle', ars }], i: 0, depart, temps: rep ? rep.temps || 0 : depart, tues: rep ? rep.tues || 0 : 0, degats: 0, coups: 0, h: null };
  if (!Save.d.defis.horde || Save.d.defis.horde.cle !== 'horde2') Save.d.defis.horde = { cle: 'horde2', best: null, essais: 0 };
  if (!rep) Save.d.defis.horde.essais++;
  Save.write();
  calcStats(); this.p = creerJoueur(DF().pv); this.ars = null;
  const cons = Save.d.opts.conseils; Save.d.opts.conseils = false; // pas de fiches de boss avant le combat
  try { this.entrerSalle(); } finally { Save.d.opts.conseils = cons; }
  if (this.etat === 'avant') { UI.cacher(); this.etat = 'combat'; }
  Horde.demarrer(rep);
};
// sauvegarde : le temps, la vie, les armes, les ennemis présents (on reprend exactement là)
const _garderHorde = SurvieRun.garder;
SurvieRun.garder = function () {
  if (!Horde.actif()) return _garderHorde.apply(this, arguments);
  const df = G.defi, h = df.h; if (G.finDefi || !G.p || G.p.hp <= 0) return;
  const copie = o => { const r = {}; for (const k in o) { const v = o[k]; if (v === null || typeof v !== 'object') r[k] = v; else if (k === 'charge' || k === 'saut' || k === 'plonge' || k === 'bond' || k === 'tir') r[k] = Object.assign({}, v); } return r; };
  Save.d.survieRun = { horde2: 1, temps: Horde.temps(), pv: G.p.hp, ars: Object.assign({}, df.boss[0].ars), tues: df.tues || 0, k: h.k, jauge: h.jauge, soinT: h.soinT, theme: df.theme,
    en: G.minions.filter(m => m.horde && !m.dead).slice(0, 30).map(copie), mines: h.mines.map(copie), obus: h.obus.map(copie), flaques: h.flaques.map(copie) };
  Save.write();
};
const _finHorde = G.terminerDefi;
G.terminerDefi = function () { const h = Horde.actif(); if (h) G.lenteur = 1; const r = _finHorde.apply(this, arguments); if (h) SurvieRun.effacer(); return r; };

// ---------- le champ de givre ralentit (appliqué juste avant le déplacement du héros) ----------
const _majJoueurHorde = majJoueur;
majJoueur = function () {
  if (Horde.actif() && G.p) { const p = G.p; G.lenteur = G.minions.some(m => m.horde && !m.dead && m.type === 'givre' && m.spawn <= 0 && d2(m.x, m.y, p.x, p.y) < 150 * 150) ? .5 : 1; }
  return _majJoueurHorde.apply(this, arguments);
};

// ---------- boucle ----------
const _majMinionHorde = majMinion;
majMinion = function (m, dt) { if (m && m.horde) { if (Horde.actif()) Horde.maj(m, dt); return; } return _majMinionHorde.apply(this, arguments); };
const _majCombatHorde = majCombat;
majCombat = function (dt) {
  _majCombatHorde.apply(this, arguments);
  try { if (Horde.actif() && G.etat === 'combat') Horde.majFlux(G.dtE); } catch (e) { console.warn('horde', e); }
};
// sous terre ou en plein saut : intouchable
const _ciblesHorde = G.cibles;
G.cibles = function () { const l = _ciblesHorde.apply(this, arguments); return Horde.actif() ? l.filter(m => !(m.horde && (m.sous || m.cache))) : l; };

// ---------- dégâts : partagés quand un coup touche plusieurs ennemis au même instant ----------
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
  if (this.etat !== 'combat' || vrai.dead || vrai.spawn > 0 || vrai.sous || vrai.cache) return;
  o = o || {};
  let m = tg.proxy ? (tg.mult || 1) : 1;
  if (o.prim) { m *= PRIM_EQ[G.ars.p] || 1; try { const mf = modForge(); if (mf.dmg) m *= mf.dmg; } catch (e) { } if (!o.continu) m *= 1 + (ST.pCrit || 0) + (o.critB || 0); }
  if (vrai.type === 'bouclier' && G.p) {
    const dif = Math.abs(angDiff(vrai.face, ang(vrai.x, vrai.y, G.p.x, G.p.y))); // les coups viennent de toi : de face, le bouclier bloque
    if (dif < 1.05) { m *= .2; if (this.protegeT <= 0) { this.texte(vrai.x, vrai.y - vrai.r - 12, 'Bloqué', '#bfe0ff', 13); this.protegeT = .4; } }
  }
  m /= 1 + .45 * (rangDansInstant(vrai) - 1);
  const d = dmg * m;
  vrai.hp -= d; vrai.flash = 1; this.defi.degats = (this.defi.degats || 0) + d; this.degatsCombat = (this.degatsCombat || 0) + d;
  try { statPlus('degats', undefined, d); } catch (e) { }
  this.chiffre(vrai, d, false, o, m);
  if (vrai.hp <= 0) Horde.tuer(vrai, true);
};

// ---------- dessin des ennemis : volumes éclairés, contour net, yeux lumineux, parties animées ----------
function hPeau(c, h, r, flash, l0) {
  const g = c.createRadialGradient(-r * .38, -r * .42, r * .06, 0, 0, r * 1.3);
  g.addColorStop(0, flash ? '#ffffff' : hsl(h, 62, l0 || 60)); g.addColorStop(.5, hsl(h, 58, (l0 || 60) - 24)); g.addColorStop(1, hsl(h, 62, 9));
  return g;
}
function hContour(c, h, w) { c.lineJoin = 'round'; c.lineWidth = (w || 1) * 3.4; c.strokeStyle = 'rgba(6,3,10,.92)'; c.stroke(); c.lineWidth = (w || 1) * 1.4; c.strokeStyle = hsl(h, 90, 74); c.stroke(); }
function hOeil(c, x, y, s, h) {
  c.globalCompositeOperation = 'lighter'; c.drawImage(glow(hsl(h, 100, 70, .75), s * 4), x - s * 4, y - s * 4); c.globalCompositeOperation = 'source-over';
  c.fillStyle = hsl(h, 100, 92); c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
}
function hReflet(c, r) { c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(-r * .35, -r * .42, r * .38, r * .18, -.5, 0, TAU); c.fill(); }
function hForme(c, f) { c.beginPath(); f(); }
function dessinerEnnemi(c, m, menu) {
  const D = HORDE[m.type], h = D.hue, r = m.r, t = (m.t || 0) + (G.t || 0) * (menu ? 1 : 0), fl = m.flash > .5;
  if (m.type === 'foreur' && m.sous && !menu) {
    // sous terre : un monticule qui avance, des fissures et de la poussière
    c.save(); c.translate(m.x, m.y);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(3, 4, r * 1.3, r * .9, 0, 0, TAU); c.fill();
    const g = c.createRadialGradient(-r * .3, -r * .3, 2, 0, 0, r * 1.3); g.addColorStop(0, '#9a7a52'); g.addColorStop(1, '#3a2a18');
    c.fillStyle = g; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * TAU / 10, rr = r * (1 + .18 * Math.sin(i * 3 + t * 9)); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill();
    c.strokeStyle = 'rgba(30,18,8,.8)'; c.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const a = i * 1.6 + t * 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * 1.4, Math.sin(a) * r * 1.4); c.stroke(); }
    c.restore();
    if (m.etat === 'sort') { const k = Math.min(1, m.et / .75); c.fillStyle = `rgba(255,60,60,${.1 + .16 * k})`; c.beginPath(); c.arc(m.x, m.y, 70, 0, TAU); c.fill(); c.strokeStyle = ROUGE; c.lineWidth = 2; c.beginPath(); c.arc(m.x, m.y, 70, 0, TAU); c.stroke(); c.beginPath(); c.arc(m.x, m.y, 70 * k, 0, TAU); c.stroke(); }
    return;
  }
  if (!menu && m.type === 'givre' && m.spawn <= 0) {
    c.save(); const g = c.createRadialGradient(m.x, m.y, 20, m.x, m.y, 150); g.addColorStop(0, 'rgba(170,220,255,.22)'); g.addColorStop(1, 'rgba(170,220,255,.06)');
    c.fillStyle = g; c.beginPath(); c.arc(m.x, m.y, 150, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(210,240,255,.55)'; c.lineWidth = 2; c.setLineDash([10, 7]); c.lineDashOffset = -t * 20; c.beginPath(); c.arc(m.x, m.y, 150, 0, TAU); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(235,248,255,.7)'; for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + t * .4, d = 60 + 70 * ((i * .37 + t * .1) % 1); c.fillRect(m.x + Math.cos(a) * d - 1, m.y + Math.sin(a) * d - 1, 2, 2); }
    c.restore();
  }
  if (!menu) { const ho = m.haut || 0; c.fillStyle = `rgba(0,0,0,${.42 - Math.min(.25, ho / 300)})`; c.beginPath(); c.ellipse(m.x + 3, m.y + r * .8, r * 1.1 * (1 - ho / 200), r * .45 * (1 - ho / 200), 0, 0, TAU); c.fill(); }
  c.save();
  if (m.spawn > 0) {
    const k = 1 - m.spawn / .9;
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = hsl(h, 90, 62, .75); c.lineWidth = 2; c.beginPath(); c.arc(m.x, m.y, r * (1 + 2.2 * (1 - k)), 0, TAU); c.stroke();
    c.drawImage(glow(hsl(h, 90, 55, .4), r * 3), m.x - r * 3, m.y - r * 3); c.restore();
    c.globalAlpha = .25 + .55 * k;
  }
  if (m.type === 'spectre') c.globalAlpha *= m.cache ? .25 : .72 + .2 * Math.sin(t * 5 + m.ph);
  c.translate(m.x, m.y - (m.haut || 0)); if (m.haut) c.scale(1 + m.haut / 180, 1 + m.haut / 180); c.rotate(m.face || 0);
  const peau = hPeau(c, h, r, fl), pas = Math.sin(t * 14 + (m.ph || 0));
  // patte : contour sombre puis couleur claire (bien visible sur tous les sols)
  const patte = (x1, y1, x2, y2, w) => { c.lineCap = 'round'; c.strokeStyle = 'rgba(6,3,10,.92)'; c.lineWidth = w + 3; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.strokeStyle = hsl(h, 45, 42); c.lineWidth = w; c.stroke(); };
  switch (m.type) {
    case 'rodeur': {
      // bête à quatre pattes : pattes qui courent, épines sur le dos, gueule devant
      for (const [px, s] of [[r * .45, 1], [-r * .45, -1]]) for (const cote of [-1, 1]) { const k = pas * s * cote; patte(px, cote * r * .5, px + k * r * .5, cote * r * 1.2, r * .2); }
      hForme(c, () => c.ellipse(-r * .1, 0, r * 1.05, r * .82, 0, 0, TAU)); c.fillStyle = peau; c.fill(); hContour(c, h);
      c.fillStyle = hsl(h, 45, 22); for (let i = 0; i < 3; i++) { const x = -r * (.55 + i * .28); c.beginPath(); c.moveTo(x + r * .14, -r * .12); c.lineTo(x - r * .2, 0); c.lineTo(x + r * .14, r * .12); c.closePath(); c.fill(); }
      hForme(c, () => c.arc(r * .8, 0, r * .48, 0, TAU)); c.fillStyle = hPeau(c, h, r * .5, fl, 66); c.fill(); hContour(c, h, .7);
      if (m.mord > 0) { c.fillStyle = '#fff'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(r * 1.15, s * r * .2); c.lineTo(r * 1.45, s * r * .05); c.lineTo(r * 1.15, 0); c.fill(); } }
      hOeil(c, r * .95, -r * .2, r * .1, h); hOeil(c, r * .95, r * .2, r * .1, h);
      hReflet(c, r); break;
    }
    case 'coureur': {
      // silhouette fine, lames repliées vers l'arrière, traînée de vitesse
      c.globalAlpha *= .3; for (let i = 1; i <= 2; i++) { hForme(c, () => c.ellipse(-r * .7 * i, 0, r * .9, r * .45, 0, 0, TAU)); c.fillStyle = hsl(h, 80, 55); c.fill(); } c.globalAlpha /= .3;
      c.fillStyle = '#d8dde6'; for (const s of [-1, 1]) { hForme(c, () => { c.moveTo(r * .2, s * r * .35); c.lineTo(-r * 1.2, s * r * (1.05 + .1 * pas)); c.lineTo(-r * .2, s * r * .55); c.closePath(); }); c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,.7)'; c.stroke(); }
      hForme(c, () => { c.moveTo(r * 1.4, 0); c.quadraticCurveTo(r * .2, r * 1, -r * 1.05, r * .45); c.lineTo(-r * .7, 0); c.lineTo(-r * 1.05, -r * .45); c.quadraticCurveTo(r * .2, -r * 1, r * 1.4, 0); });
      c.fillStyle = peau; c.fill(); hContour(c, h);
      hOeil(c, r * .7, 0, r * .14, h); hReflet(c, r); break;
    }
    case 'tireur': {
      // soldat trapu, sac à dos, long canon devant (le bout s'allume avant le tir)
      hForme(c, () => c.roundRect ? c.roundRect(-r * 1.1, -r * .7, r * .6, r * 1.4, r * .2) : c.rect(-r * 1.1, -r * .7, r * .6, r * 1.4)); c.fillStyle = hsl(h, 25, 22); c.fill(); hContour(c, h, .6);
      c.fillStyle = '#20252e'; c.fillRect(r * .2, -r * .2, r * 1.5, r * .4); c.strokeStyle = 'rgba(0,0,0,.9)'; c.lineWidth = 2; c.strokeRect(r * .2, -r * .2, r * 1.5, r * .4);
      c.fillStyle = hsl(h, 40, 55); c.fillRect(r * .3, -r * .26, r * .5, r * .12);
      hForme(c, () => c.arc(0, 0, r * .85, 0, TAU)); c.fillStyle = peau; c.fill(); hContour(c, h);
      hForme(c, () => c.arc(r * .1, 0, r * .45, -1.2, 1.2)); c.fillStyle = hsl(h, 80, 70, .55); c.fill();
      if (m.vise > 0) { c.globalCompositeOperation = 'lighter'; c.drawImage(glow(hsl(h, 100, 70, .9), r * .9), r * 1.7 - r * .9, -r * .9); c.globalCompositeOperation = 'source-over'; }
      hReflet(c, r * .85); break;
    }
    case 'kamikaze': {
      // bombe vivante : coque sombre fissurée de lumière, mèche qui crépite, clignote avant d'exploser
      const bl = m.boom !== undefined ? (Math.sin(m.boom * 40) > 0 ? 1 : 0) : 0;
      for (const s of [-1, 1]) patte(-r * .2, s * r * .7, -r * .2 + pas * s * r * .35, s * r * 1.25, r * .17);
      hForme(c, () => c.arc(0, 0, r, 0, TAU)); const gk = c.createRadialGradient(-r * .35, -r * .4, 1, 0, 0, r * 1.2); gk.addColorStop(0, bl || fl ? '#fff' : '#5a4a50'); gk.addColorStop(1, '#120a0e'); c.fillStyle = gk; c.fill(); hContour(c, h);
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = hsl(h, 100, 60, .9); c.lineWidth = 1.6; for (let i = 0; i < 4; i++) { const a = i * 1.7 + .4; c.beginPath(); c.moveTo(Math.cos(a) * r * .2, Math.sin(a) * r * .2); c.lineTo(Math.cos(a + .3) * r * .6, Math.sin(a + .3) * r * .6); c.lineTo(Math.cos(a) * r * .92, Math.sin(a) * r * .92); c.stroke(); }
      c.drawImage(glow('rgba(255,210,90,.9)', r * .6), -r * 1.3 - r * .6, -r * .6); c.globalCompositeOperation = 'source-over';
      c.strokeStyle = '#6a5038'; c.lineWidth = 2; c.beginPath(); c.moveTo(-r * .9, 0); c.quadraticCurveTo(-r * 1.2, -r * .3, -r * 1.3, 0); c.stroke();
      hReflet(c, r); break;
    }
    case 'brute': {
      // colosse en armure : gros poings qui balancent, cornes, plaques
      for (const s of [-1, 1]) { const bal = pas * s * r * .25; hForme(c, () => c.arc(r * .25 + bal, s * r * 1.05, r * .42, 0, TAU)); c.fillStyle = hPeau(c, h, r * .45, fl, 50); c.fill(); hContour(c, h, .8); }
      hForme(c, () => { for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * .9); } c.closePath(); }); c.fillStyle = peau; c.fill(); hContour(c, h, 1.2);
      c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-r * .45, -r * .75); c.lineTo(-r * .45, r * .75); c.moveTo(r * .05, -r * .82); c.lineTo(r * .05, r * .82); c.stroke();
      c.fillStyle = '#e8dcc4'; for (const s of [-1, 1]) { hForme(c, () => { c.moveTo(r * .65, s * r * .3); c.quadraticCurveTo(r * 1.2, s * r * .55, r * 1.35, s * r * .15); c.lineTo(r * .7, s * r * .12); c.closePath(); }); c.fill(); c.lineWidth = 1.2; c.strokeStyle = 'rgba(0,0,0,.7)'; c.stroke(); }
      hOeil(c, r * .6, -r * .18, r * .09, 10); hOeil(c, r * .6, r * .18, r * .09, 10);
      hReflet(c, r); break;
    }
    case 'lanceur': {
      // artilleur : deux pattes, gros mortier dressé (vu de dessus), sacoche d'obus
      for (const s of [-1, 1]) patte(0, s * r * .6, pas * s * r * .4, s * r * 1.2, r * .19);
      hForme(c, () => c.ellipse(0, 0, r, r * .85, 0, 0, TAU)); c.fillStyle = peau; c.fill(); hContour(c, h);
      c.fillStyle = hsl(30, 30, 24); hForme(c, () => c.ellipse(-r * .75, 0, r * .35, r * .5, 0, 0, TAU)); c.fill(); hContour(c, 30, .5);
      hForme(c, () => c.arc(r * .2, 0, r * .55, 0, TAU)); const gm = c.createRadialGradient(r * .2, 0, 1, r * .2, 0, r * .55); gm.addColorStop(0, '#0a0c08'); gm.addColorStop(.7, '#2a3020'); gm.addColorStop(1, '#6a7a50'); c.fillStyle = gm; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,.9)'; c.stroke();
      hOeil(c, r * .75, -r * .45, r * .09, h); break;
    }
    case 'bouclier': {
      // soldat derrière un grand bouclier bombé (riveté), pointe de lance qui dépasse
      c.strokeStyle = '#8a7a5a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-r * .4, r * .55); c.lineTo(r * 1.9, r * .55); c.stroke();
      c.fillStyle = '#e0e6ee'; hForme(c, () => { c.moveTo(r * 2.2, r * .55); c.lineTo(r * 1.8, r * .4); c.lineTo(r * 1.8, r * .7); c.closePath(); }); c.fill();
      hForme(c, () => c.arc(-r * .1, 0, r * .85, 0, TAU)); c.fillStyle = peau; c.fill(); hContour(c, h);
      const ba = m.bash > 0 ? r * .35 : 0;
      hForme(c, () => { c.arc(ba, 0, r + 7, -1.15, 1.15); c.arc(ba, 0, r + 1, 1.15, -1.15, true); c.closePath(); });
      const gb = c.createLinearGradient(ba + r, -r, ba + r + 6, r); gb.addColorStop(0, '#e9f1ff'); gb.addColorStop(.5, '#7d93b5'); gb.addColorStop(1, '#2a3550'); c.fillStyle = gb; c.fill(); hContour(c, 214, .9);
      c.fillStyle = '#ffe9a8'; for (const a of [-.8, 0, .8]) { c.beginPath(); c.arc(ba + Math.cos(a) * (r + 4), Math.sin(a) * (r + 4), 1.6, 0, TAU); c.fill(); }
      hOeil(c, r * .3, 0, r * .1, h); break;
    }
    case 'essaim': {
      // insecte : abdomen rayé, ailes translucides qui battent vite
      c.globalAlpha *= .55; c.fillStyle = hsl(h, 60, 90); const bat = Math.sin(t * 45 + m.ph) * .45;
      for (const s of [-1, 1]) { c.beginPath(); c.ellipse(-r * .1, s * r * .9, r * .95, r * .38, s * (.6 + bat), 0, TAU); c.fill(); }
      c.globalAlpha /= .55;
      hForme(c, () => c.ellipse(-r * .55, 0, r * .75, r * .5, 0, 0, TAU)); c.fillStyle = hPeau(c, h, r * .7, fl, 52); c.fill(); hContour(c, h, .7);
      c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1.5; for (const x of [-.4, -.75]) { c.beginPath(); c.moveTo(x * r, -r * .45); c.lineTo(x * r, r * .45); c.stroke(); }
      hForme(c, () => c.arc(r * .4, 0, r * .55, 0, TAU)); c.fillStyle = peau; c.fill(); hContour(c, h, .7);
      c.strokeStyle = hsl(h, 60, 30); c.lineWidth = 1.5; c.beginPath(); c.moveTo(r * 1.4, 0); c.lineTo(r * .9, 0); c.stroke();
      hOeil(c, r * .65, -r * .2, r * .13, h); hOeil(c, r * .65, r * .2, r * .13, h); break;
    }
    case 'foreur': {
      // à l'air libre : chenilles, corps blindé, foret en spirale qui tourne
      c.fillStyle = '#2a241c'; for (const s of [-1, 1]) { c.fillRect(-r * .9, s * r * .62 - r * .2, r * 1.5, r * .4); c.strokeStyle = 'rgba(0,0,0,.9)'; c.lineWidth = 1.5; c.strokeRect(-r * .9, s * r * .62 - r * .2, r * 1.5, r * .4); c.strokeStyle = '#6a5a40'; for (let i = 0; i < 5; i++) { const x = -r * .9 + ((i * r * .3 + t * 60) % (r * 1.5)); c.beginPath(); c.moveTo(x, s * r * .62 - r * .2); c.lineTo(x, s * r * .62 + r * .2); c.stroke(); } }
      hForme(c, () => c.roundRect ? c.roundRect(-r * .8, -r * .55, r * 1.3, r * 1.1, r * .3) : c.rect(-r * .8, -r * .55, r * 1.3, r * 1.1)); c.fillStyle = peau; c.fill(); hContour(c, h);
      hForme(c, () => { c.moveTo(r * .45, -r * .5); c.lineTo(r * 1.6, 0); c.lineTo(r * .45, r * .5); c.closePath(); }); const gf = c.createLinearGradient(0, -r * .5, 0, r * .5); gf.addColorStop(0, '#e2e6ea'); gf.addColorStop(.5, '#8a929c'); gf.addColorStop(1, '#3a4048'); c.fillStyle = gf; c.fill(); hContour(c, 210, .7);
      c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const x = r * .5 + ((i * r * .28 + t * 40) % (r * 1.1)), w = r * .5 * (1 - (x - r * .45) / (r * 1.15)); c.beginPath(); c.moveTo(x, -w); c.lineTo(x + r * .12, w); c.stroke(); }
      hOeil(c, -r * .1, 0, r * .1, h); hReflet(c, r * .8); break;
    }
    case 'chaman': {
      // robe à capuche, bâton surmonté d'un orbe vert, runes qui tournent autour
      hForme(c, () => { c.moveTo(r * .9, 0); c.lineTo(-r * 1.1, r * (1 + .08 * pas)); c.quadraticCurveTo(-r * .5, 0, -r * 1.1, -r * (1 + .08 * pas)); c.closePath(); }); c.fillStyle = peau; c.fill(); hContour(c, h);
      hForme(c, () => c.arc(r * .2, 0, r * .5, 0, TAU)); c.fillStyle = hsl(h, 30, 14); c.fill(); hContour(c, h, .6);
      c.strokeStyle = '#7a5a34'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-r * .2, r * .8); c.lineTo(r * 1.3, r * .8); c.stroke();
      hOeil(c, r * 1.4, r * .8, r * .2, h); hOeil(c, r * .35, -r * .15, r * .08, h); hOeil(c, r * .35, r * .15, r * .08, h);
      c.rotate(-(m.face || 0)); c.globalCompositeOperation = 'lighter'; c.fillStyle = hsl(h, 100, 70, .55); c.font = `700 ${Math.round(r * .55)}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 0; i < 4; i++) { const a = t * 1.5 + i * TAU / 4; c.fillText('ᚱᛟᚦᛉ'[i], Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6); } c.globalCompositeOperation = 'source-over'; break;
    }
    case 'semeur': {
      // petit porteur courbé sous un gros sac de mines, petites pattes
      for (const s of [-1, 1]) patte(r * .2, s * r * .55, r * .2 + pas * s * r * .4, s * r * 1.12, r * .17);
      hForme(c, () => c.ellipse(-r * .55, 0, r * .8, r * .85, 0, 0, TAU)); const gs = c.createRadialGradient(-r * .8, -r * .4, 1, -r * .55, 0, r); gs.addColorStop(0, '#a08860'); gs.addColorStop(1, '#3a2c18'); c.fillStyle = gs; c.fill(); hContour(c, 40, .8);
      c.fillStyle = '#ffd23c'; for (const [x, y] of [[-.7, -.3], [-.4, .35], [-.9, .25]]) { c.beginPath(); c.arc(x * r, y * r, r * .12, 0, TAU); c.fill(); }
      hForme(c, () => c.arc(r * .35, 0, r * .6, 0, TAU)); c.fillStyle = peau; c.fill(); hContour(c, h);
      hOeil(c, r * .65, 0, r * .12, h); hReflet(c, r * .6); break;
    }
    case 'spectre': {
      // fantôme : traîne ondulante, orbites creuses lumineuses
      hForme(c, () => { c.arc(r * .2, 0, r, -Math.PI / 2, Math.PI / 2); for (let i = 0; i <= 6; i++) { const y = r - i * r / 3; c.lineTo(-r * (1.1 + .3 * Math.sin(t * 8 + i + (m.ph || 0)) * (i % 2 ? 1 : -1)), y); } c.closePath(); });
      const gp = c.createRadialGradient(r * .1, -r * .2, 1, 0, 0, r * 1.3); gp.addColorStop(0, fl ? '#fff' : hsl(h, 70, 82)); gp.addColorStop(.6, hsl(h, 60, 45, .8)); gp.addColorStop(1, hsl(h, 60, 15, .4)); c.fillStyle = gp; c.fill();
      c.lineWidth = 1.5; c.strokeStyle = hsl(h, 90, 85, .8); c.stroke();
      for (const s of [-1, 1]) { c.fillStyle = '#0a0414'; c.beginPath(); c.ellipse(r * .5, s * r * .3, r * .2, r * .14, 0, 0, TAU); c.fill(); hOeil(c, r * .52, s * r * .3, r * .06, h); }
      break;
    }
    case 'sauteur': {
      // grenouille de guerre : grosses pattes arrière repliées, dos bosselé, yeux en haut de la tête
      const pli = m.bond ? 1 : (m.repos > 0 ? -.3 : .2 * pas);
      for (const s of [-1, 1]) { patte(-r * .3, s * r * .6, -r * (1 + .3 * pli), s * r * 1.15, r * .3); patte(-r * (1 + .3 * pli), s * r * 1.15, -r * (.2 - .6 * pli), s * r * 1.3, r * .24); patte(r * .45, s * r * .5, r * .8, s * r * .95, r * .16); }
      hForme(c, () => c.ellipse(0, 0, r * 1.05, r * .88, 0, 0, TAU)); c.fillStyle = peau; c.fill(); hContour(c, h);
      c.fillStyle = hsl(h, 50, 30, .7); for (const [x, y] of [[-.3, -.3], [-.5, .25], [-.05, .1]]) { c.beginPath(); c.arc(x * r, y * r, r * .14, 0, TAU); c.fill(); }
      for (const s of [-1, 1]) { hForme(c, () => c.arc(r * .6, s * r * .45, r * .3, 0, TAU)); c.fillStyle = hPeau(c, h, r * .3, fl, 70); c.fill(); hContour(c, h, .6); hOeil(c, r * .68, s * r * .45, r * .1, 50); }
      c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 2; c.beginPath(); c.arc(r * .55, 0, r * .45, -.6, .6); c.stroke();
      hReflet(c, r); break;
    }
    case 'rayon': {
      // prisme de cristal : facettes éclairées, lentille centrale qui se charge
      const charge = m.tir ? Math.min(1, m.tir.t / 1.1) : 0;
      hForme(c, () => { for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c.lineTo(Math.cos(a) * r * (i % 2 ? .85 : 1.15), Math.sin(a) * r * (i % 2 ? .85 : 1.15)); } c.closePath(); });
      c.fillStyle = peau; c.fill(); hContour(c, h);
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.2; for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * (i % 2 ? .85 : 1.15), Math.sin(a) * r * (i % 2 ? .85 : 1.15)); c.stroke(); }
      c.fillStyle = hsl(h, 40, 15); c.beginPath(); c.arc(r * .55, 0, r * .38, 0, TAU); c.fill();
      hOeil(c, r * .55, 0, r * (.14 + .2 * charge), charge > .7 ? 0 : h);
      break;
    }
    case 'empoisonneur': {
      // alchimiste masqué, grosse fiole verte qui bouillonne sur le dos
      for (const s of [-1, 1]) patte(r * .1, s * r * .55, r * .1 + pas * s * r * .35, s * r * 1.1, r * .17);
      hForme(c, () => c.arc(-r * .6, 0, r * .62, 0, TAU)); const gf = c.createRadialGradient(-r * .75, -r * .2, 1, -r * .6, 0, r * .62); gf.addColorStop(0, '#d8ff8a'); gf.addColorStop(.6, '#5ab82a'); gf.addColorStop(1, '#1e4a10'); c.fillStyle = gf; c.fill(); hContour(c, 95, .8);
      c.fillStyle = 'rgba(230,255,180,.8)'; for (let i = 0; i < 3; i++) { const k = (t * .8 + i / 3) % 1; c.beginPath(); c.arc(-r * .6 + Math.sin(i * 2 + t) * r * .2, r * .3 - k * r * .7, r * .08 * (1 - k) + 1, 0, TAU); c.fill(); }
      hForme(c, () => c.arc(r * .3, 0, r * .7, 0, TAU)); c.fillStyle = peau; c.fill(); hContour(c, h);
      c.fillStyle = '#2a2a24'; c.beginPath(); c.ellipse(r * .65, 0, r * .3, r * .42, 0, 0, TAU); c.fill(); for (const s of [-1, 1]) hOeil(c, r * .7, s * r * .17, r * .08, h);
      break;
    }
    case 'harponneur': {
      // chasseur : rouleau de corde sur le dos, long lance-harpon
      for (const s of [-1, 1]) patte(0, s * r * .55, pas * s * r * .35, s * r * 1.1, r * .17);
      c.strokeStyle = '#a88a5a'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-r * .55, 0, r * (.2 + i * .14), 0, TAU); c.stroke(); }
      c.fillStyle = '#2a2420'; c.fillRect(r * .1, -r * .18, r * 1.6, r * .36); c.strokeStyle = 'rgba(0,0,0,.9)'; c.lineWidth = 2; c.strokeRect(r * .1, -r * .18, r * 1.6, r * .36);
      if (!(m.vise2 > 0) || true) { c.fillStyle = '#d8dde4'; c.beginPath(); c.moveTo(r * 2.1, 0); c.lineTo(r * 1.7, -r * .25); c.lineTo(r * 1.75, 0); c.lineTo(r * 1.7, r * .25); c.closePath(); c.fill(); }
      hForme(c, () => c.arc(0, 0, r * .75, 0, TAU)); c.fillStyle = peau; c.fill(); hContour(c, h);
      hOeil(c, r * .4, -r * .18, r * .09, h); hOeil(c, r * .4, r * .18, r * .09, h); hReflet(c, r * .75);
      break;
    }
    case 'guerisseuse': {
      // prêtresse : robe claire, auréole dorée, mains qui brillent de vert
      hForme(c, () => { c.moveTo(r * .9, 0); c.quadraticCurveTo(0, r * 1.2, -r * 1.05, r * .85); c.quadraticCurveTo(-r * .6, 0, -r * 1.05, -r * .85); c.quadraticCurveTo(0, -r * 1.2, r * .9, 0); });
      const gr = c.createRadialGradient(-r * .3, -r * .3, 1, 0, 0, r * 1.2); gr.addColorStop(0, fl ? '#fff' : '#f4fff0'); gr.addColorStop(.6, hsl(h, 40, 62)); gr.addColorStop(1, hsl(h, 50, 22)); c.fillStyle = gr; c.fill(); hContour(c, h);
      hForme(c, () => c.arc(r * .25, 0, r * .42, 0, TAU)); c.fillStyle = hsl(h, 30, 80); c.fill(); hContour(c, h, .5);
      c.strokeStyle = 'rgba(255,220,120,.9)'; c.lineWidth = 2; c.beginPath(); c.ellipse(r * .25, 0, r * .62, r * .62, 0, 0, TAU); c.stroke();
      for (const s of [-1, 1]) hOeil(c, r * .75, s * r * .55, r * .12, h);
      break;
    }
    case 'givre': {
      // gardien de glace : corps de cristal entouré de pointes de glace
      c.fillStyle = 'rgba(220,245,255,.9)'; for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t * .3; c.beginPath(); c.moveTo(Math.cos(a - .12) * r * .9, Math.sin(a - .12) * r * .9); c.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5); c.lineTo(Math.cos(a + .12) * r * .9, Math.sin(a + .12) * r * .9); c.closePath(); c.fill(); c.strokeStyle = 'rgba(40,80,120,.8)'; c.lineWidth = 1; c.stroke(); }
      hForme(c, () => { for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); }); c.fillStyle = peau; c.fill(); hContour(c, h);
      c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-r * .6, -r * .5); c.lineTo(r * .2, r * .1); c.lineTo(-r * .2, r * .6); c.stroke();
      hOeil(c, r * .5, -r * .2, r * .1, 195); hOeil(c, r * .5, r * .2, r * .1, 195); hReflet(c, r);
      break;
    }
  }
  // élite : liseré doré et couronne
  if (m.elite) { c.strokeStyle = '#ffd36a'; c.lineWidth = 2.5; c.shadowColor = '#ffb020'; c.shadowBlur = 10; c.beginPath(); c.arc(0, 0, r * 1.3, 0, TAU); c.stroke(); c.shadowBlur = 0; c.fillStyle = '#ffd36a'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(-r * .2, i * r * .35 - r * .12); c.lineTo(-r * .75, i * r * .35); c.lineTo(-r * .2, i * r * .35 + r * .12); c.fill(); } }
  if (m.flash > 0 && !fl) { c.globalAlpha *= Math.min(1, m.flash) * .45; c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); }
  c.restore();
  if (menu) return;
  // annonces : visée du tireur, explosion du kamikaze, charge de la brute, saut du spectre
  if (m.type === 'tireur' && m.vise > 0) { c.save(); c.strokeStyle = hsl(h, 100, 70, .35 + .4 * (1 - m.vise / .45)); c.lineWidth = 2; c.setLineDash([10, 8]); c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x + Math.cos(m.viseA) * 900, m.y + Math.sin(m.viseA) * 900); c.stroke(); c.restore(); }
  if (m.type === 'kamikaze' && m.boom !== undefined) { const k = Math.min(1, m.boom / .75); c.fillStyle = `rgba(255,40,80,${.12 + .18 * k})`; c.beginPath(); c.arc(m.x, m.y, 78, 0, TAU); c.fill(); c.strokeStyle = ROUGE; c.lineWidth = 2; c.beginPath(); c.arc(m.x, m.y, 78 * k, 0, TAU); c.stroke(); }
  if (m.type === 'brute' && m.charge && m.charge.t < .8) { const L = 540 * .45, a = m.charge.a, k = m.charge.t / .8; c.save(); c.strokeStyle = ROUGE; c.lineCap = 'round'; c.globalAlpha = .12 + .18 * k; c.lineWidth = r * 2; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x + Math.cos(a) * L, m.y + Math.sin(a) * L); c.stroke(); c.globalAlpha = .5 + .4 * k; c.lineWidth = 2; c.setLineDash([8, 6]); c.stroke(); c.restore(); }
  if (m.type === 'spectre' && m.saut) { const k = m.saut.t / .6; c.strokeStyle = hsl(h, 90, 75, .85); c.lineWidth = 2; c.setLineDash([4, 5]); c.beginPath(); c.arc(m.saut.x, m.saut.y, r * (2.6 - 1.6 * k), 0, TAU); c.stroke(); c.setLineDash([]); hOeil(c, m.saut.x, m.saut.y, 3, h); }
  if (m.type === 'sauteur' && m.bond) { const b = m.bond, k = Math.min(1, b.t / b.dur); c.fillStyle = `rgba(255,60,120,${.1 + .18 * k})`; c.beginPath(); c.arc(b.x1, b.y1, 65, 0, TAU); c.fill(); c.strokeStyle = ROUGE; c.lineWidth = 2; c.beginPath(); c.arc(b.x1, b.y1, 65, 0, TAU); c.stroke(); c.beginPath(); c.arc(b.x1, b.y1, 65 * k, 0, TAU); c.stroke(); }
  if (m.type === 'rayon' && m.tir) {
    const T2 = m.tir, ex = m.x + Math.cos(T2.a) * 900, ey = m.y + Math.sin(T2.a) * 900;
    c.save();
    if (T2.t < 1.1) { c.strokeStyle = T2.t < .8 ? hsl(h, 100, 75, .45) : 'rgba(255,70,90,.85)'; c.lineWidth = T2.t < .8 ? 1.5 : 2.5; c.setLineDash(T2.t < .8 ? [6, 8] : []); c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(ex, ey); c.stroke(); }
    else if (T2.t < 1.55) { c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.strokeStyle = hsl(h, 100, 60, .5); c.lineWidth = 26; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(ex, ey); c.stroke(); c.strokeStyle = '#f2ffff'; c.lineWidth = 8; c.stroke(); }
    c.restore();
  }
  if (m.type === 'harponneur' && m.vise2 > 0) { c.save(); c.strokeStyle = 'rgba(255,190,120,.7)'; c.lineWidth = 2; c.setLineDash([10, 8]); c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x + Math.cos(m.viseA) * 560, m.y + Math.sin(m.viseA) * 560); c.stroke(); c.restore(); }
  if (m.type === 'guerisseuse' && m.soigne && !m.soigne.dead && d2(m.x, m.y, m.soigne.x, m.soigne.y) < 260 * 260) {
    const o = m.soigne; c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    c.strokeStyle = 'rgba(120,255,160,.35)'; c.lineWidth = 9; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(o.x, o.y); c.stroke(); c.strokeStyle = 'rgba(220,255,230,.9)'; c.lineWidth = 2.5; c.stroke();
    for (let i = 0; i < 3; i++) { const k = (t * 1.5 + i / 3) % 1; c.fillStyle = 'rgba(200,255,210,.9)'; c.beginPath(); c.arc(lerp(m.x, o.x, k), lerp(m.y, o.y, k), 2.5, 0, TAU); c.fill(); }
    c.restore();
  }
  if (m.hp < m.hpMax && m.spawn <= 0) { const w = Math.max(26, r * 2.4); c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(m.x - w / 2, m.y - r - 12, w, 4); c.fillStyle = m.elite ? '#ffd36a' : hsl(h, 85, 60); c.fillRect(m.x - w / 2, m.y - r - 12, w * Math.max(0, m.hp / m.hpMax), 4); }
}
const _dessinerMinionHorde = dessinerMinion;
dessinerMinion = function (c, m) { if (m && m.horde) return dessinerEnnemi(c, m); return _dessinerMinionHorde.apply(this, arguments); };

// obus, mines, soins du chaman : au sol, avant les personnages
const _fxHorde = dessinerFx;
dessinerFx = function (c) {
  try {
    if (Horde.actif()) {
      const h = G.defi.h;
      for (const o of h.obus) {
        const k = Math.min(1, o.t / o.dur);
        c.fillStyle = `rgba(200,255,80,${.08 + .14 * k})`; c.beginPath(); c.arc(o.x, o.y, o.r, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(220,255,120,.85)'; c.lineWidth = 2; c.beginPath(); c.arc(o.x, o.y, o.r, 0, TAU); c.stroke(); c.beginPath(); c.arc(o.x, o.y, o.r * k, 0, TAU); c.stroke();
        const px = lerp(o.ox, o.x, k), py = lerp(o.oy, o.y, k) - Math.sin(k * Math.PI) * 120;
        c.fillStyle = '#2a3018'; c.beginPath(); c.arc(px, py, 6, 0, TAU); c.fill(); c.strokeStyle = '#d6ff6a'; c.lineWidth = 1.5; c.stroke();
      }
      for (const mi of h.mines) {
        const arme = mi.t > mi.arme, cl = mi.boom >= 0 ? 1 : arme ? (Math.sin(G.t * 6 + mi.x) > .3 ? 1 : .35) : .3;
        if (mi.boom >= 0) { c.fillStyle = 'rgba(255,220,60,.2)'; c.beginPath(); c.arc(mi.x, mi.y, 58, 0, TAU); c.fill(); }
        c.fillStyle = '#26221a'; c.beginPath(); c.arc(mi.x, mi.y, 8, 0, TAU); c.fill(); c.strokeStyle = '#8a7a40'; c.lineWidth = 1.5; c.stroke();
        c.fillStyle = `rgba(255,214,60,${cl})`; c.beginPath(); c.arc(mi.x, mi.y, 3, 0, TAU); c.fill();
      }
      for (const f of h.flaques || []) {
        const a = Math.min(1, f.t / .3) * Math.min(1, f.vie / .8);
        c.save(); c.globalAlpha = a;
        const g = c.createRadialGradient(f.x, f.y, 4, f.x, f.y, f.r); g.addColorStop(0, 'rgba(120,230,60,.55)'); g.addColorStop(.8, 'rgba(70,170,30,.4)'); g.addColorStop(1, 'rgba(70,170,30,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(f.x, f.y, f.r, f.r * .8, 0, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(190,255,120,.6)'; c.lineWidth = 2; c.beginPath(); c.ellipse(f.x, f.y, f.r * .85, f.r * .68, 0, 0, TAU); c.stroke();
        for (let i = 0; i < 4; i++) { const k = (G.t * .9 + i / 4 + f.x * .01) % 1, px = f.x + Math.cos(i * 1.9 + f.y) * f.r * .45, py = f.y + Math.sin(i * 1.9 + f.x) * f.r * .35; c.strokeStyle = `rgba(210,255,150,${.7 * (1 - k)})`; c.lineWidth = 1.5; c.beginPath(); c.arc(px, py, 2 + k * 7, 0, TAU); c.stroke(); }
        c.restore();
      }
      for (const cr of h.crochets || []) {
        const x = cr.x + Math.cos(cr.a) * cr.d, y = cr.y + Math.sin(cr.a) * cr.d;
        c.strokeStyle = '#b89a6a'; c.lineWidth = 2; c.beginPath(); c.moveTo(cr.m ? cr.m.x : cr.x, cr.m ? cr.m.y : cr.y); c.lineTo(x, y); c.stroke();
        c.save(); c.translate(x, y); c.rotate(cr.a); c.fillStyle = '#e4e8ee'; c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(10, 0); c.lineTo(-4, -7); c.lineTo(0, 0); c.lineTo(-4, 7); c.closePath(); c.fill(); c.stroke(); c.restore();
      }
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const r of h.rayons) { if (!r.o || r.o.dead) continue; c.strokeStyle = `rgba(120,255,170,${.8 * (1 - r.t / .5)})`; c.lineWidth = 3; c.beginPath(); c.moveTo(r.x1, r.y1); c.lineTo(r.o.x, r.o.y); c.stroke(); }
      c.restore();
    }
  } catch (e) { }
  return _fxHorde.apply(this, arguments);
};

// ---------- interface : le temps tenu et la menace, en haut au centre ----------
const _hudHorde = dessinerHUD;
dessinerHUD = function (c) {
  const r = _hudHorde.apply(this, arguments);
  try {
    if (!Horde.actif() || !G.p) return r;
    const T = Horde.temps(), niv = Horde.niveau(T), k = (T % 30) / 30, n = G.minions.filter(m => m.horde && !m.dead).length;
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    const x = W / 2, y = 26;
    c.font = `900 28px ${typeof POLICE_ER !== 'undefined' ? POLICE_ER : POLICE}`; c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,.75)';
    const titre = fmtTemps(T); c.strokeText(titre, x, y); c.fillStyle = '#ffd98a'; c.fillText(titre, x, y);
    const bw = 300, bx = x - bw / 2, by = y + 20;
    c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(bx - 2, by - 2, bw + 4, 10);
    const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#ffcf6a'); g.addColorStop(1, '#ff5a3a');
    c.fillStyle = g; c.fillRect(bx, by, bw * k, 6);
    c.font = `700 14px ${POLICE}`; c.lineWidth = 3;
    const sous = 'Menace ' + niv + ' · ' + n + ' ' + (n > 1 ? 'ennemis' : 'ennemi');
    c.strokeText(sous, x, by + 20); c.fillStyle = '#efe6d2'; c.fillText(sous, x, by + 20);
    c.restore();
  } catch (e) { }
  return r;
};

const _defiTenuHorde = defiTenu;
defiTenu = function (df) { if (df && df.format === 'horde') return true; return _defiTenuHorde.apply(this, arguments); };

// ---------- accueil : le panneau et une petite troupe d'ennemis dans la scène ----------
const _texteSelHorde = texteSel;
texteSel = function (k) {
  if (k !== 'survie') return _texteSelHorde.apply(this, arguments);
  const d = Save.d, T2b = s => (typeof Langue !== 'undefined' && Langue.t ? Langue.t(s) : s);
  const regles = [FORMATS.horde.obj, T2b('Pas de boss : dix-huit sortes d\'ennemis, chacune avec son attaque et sa façon d\'être battue.'), T2b('Armes au hasard, mais la vie des ennemis suit leur force ; les ennemis arrivent dans le même ordre pour tout le monde et les armes de zone sont freinées : la chance compte très peu.')];
  { const rb = (d.defis.horde && d.defis.horde.cle === 'horde2' && d.defis.horde.best || {}).score || 0; if (rb > 120) regles.push(T2b('Tu commences à ton record moins 2 minutes (même temps, même menace) :') + ' ' + fmtTemps(Math.floor(rb - 120)) + '.'); }
  if (d.survieRun && d.survieRun.horde2) regles.push(T2b('Partie en cours : tu la reprends où tu l\'as laissée.'));
  const r = d.defis.horde, rec = r && r.cle === 'horde2' && r.best && r.best.score !== undefined ? '🏆 ' + T2b('Ton record') + ' : ' + fmtTemps(r.best.score) : '';
  return `<div class="am-mode">🛡 ${T2b('Survie')}</div>
    <div class="am-boss" style="--h:30"><b>${T2b('La horde')}</b><span>${T2b('sans fin')} · ${Object.keys(HORDE).length} ${T2b('sortes d\'ennemis')}</span></div>
    <div class="am-regles">${regles.map(t => '<p>' + t + '</p>').join('')}</div>
    ${rec ? `<div class="am-rec">${rec}</div>` : ''}
    <div class="am-go">${T2b('Clique encore sur la tuile pour lancer')}</div>`;
};
const _bossMenuHorde = dessinerBoss;
dessinerBoss = function (c, b) {
  try {
    if (G.etat === 'menu' && typeof SCENE2 !== 'undefined' && b === SCENE2.b && typeof selMenu === 'function' && selMenu() === 'survie') {
      const t = performance.now() / 1000, groupe = [['brute', 0, 18, 1.5], ['bouclier', -66, -26, 1.3], ['tireur', 66, -34, 1.25], ['sauteur', -150, 20, 1.1], ['rayon', 160, 20, 1.1], ['givre', 0, 150, 1.05], ['kamikaze', -100, 36, 1.15], ['coureur', 104, 30, 1.15], ['chaman', 0, -84, 1.2], ['essaim', -42, 74, 1.05], ['essaim', 42, 78, 1.05], ['spectre', 132, -66, 1.1], ['lanceur', -132, -62, 1.1], ['foreur', -60, 120, 1.05], ['semeur', 64, 122, 1.05], ['rodeur', 150, 96, 1.1]];
      for (const [type, x, y, s] of groupe) {
        const D = HORDE[type], m = { type, x: x + Math.sin(t * 1.3 + x) * 4, y: y + Math.cos(t * 1.1 + y) * 4, r: D.r * s, face: Math.PI * .95 + Math.sin(t * .6 + x) * .3, flash: 0, spawn: 0, ph: x, t, hp: 1, hpMax: 1, elite: type === 'brute' };
        dessinerEnnemi(c, m, true);
      }
      return;
    }
  } catch (e) { }
  return _bossMenuHorde.apply(this, arguments);
};
