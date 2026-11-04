'use strict';
/* Colosses — fabrique de boss infinis : une espèce (mécanisme à apprendre, cycle d'attaques fixe),
   un nom, une couleur, des mutations, des arènes spéciales par phase et des invocations. */

const CARTES = {
  normale: { nom: 'Arène', desc: 'Une arène classique.' },
  cercle: { nom: 'Arène ronde', desc: 'Pas de coin où se réfugier.' },
  piliers: { nom: 'Piliers', desc: 'Les piliers arrêtent tous les tirs, les tiens comme les siens. Fais charger les boss dedans : ils s\'assomment.' },
  lave: { nom: 'Lave', desc: 'Des bassins de lave brûlent si tu marches dedans.' },
  glace: { nom: 'Glace', desc: 'Le sol glisse : tu mets du temps à freiner et à changer de direction.' },
  tenebres: { nom: 'Ténèbres', desc: 'Tu ne vois bien que près de toi. Les zones annoncées restent visibles.' },
  etau: { nom: 'Étau', desc: 'Les murs se resserrent peu à peu.' },
  vent: { nom: 'Tempête', desc: 'Un vent violent te pousse, et il tourne.' }
};
const TRAITS = {
  cristaux: { nom: 'Lié aux cristaux', ico: '💎', desc: 'Invulnérable tant que ses cristaux tiennent. Ils reviennent à chaque phase (et 18 s après).' },
  dos: { nom: 'Point faible dorsal', ico: '🎯', desc: 'Il se tourne vers toi : ×2,5 de dégâts dans le dos, ×0,4 de face. Contourne-le.' },
  carapace: { nom: 'Carapace', ico: '🛡', desc: 'Une armure absorbe 75 % des dégâts. Les attaques spéciales la brisent 3× plus vite. Elle repousse 12 s après.' },
  miroir: { nom: 'Reflets', ico: '🪞', desc: 'Quand il scintille de blanc, tes tirs te reviennent dessus. Arrête de tirer à ce moment !' },
  regen: { nom: 'Régénération', ico: '💚', desc: 'Il se soigne doucement s\'il n\'est pas touché pendant 3 s (au plus 6 % de sa vie par phase).' },
  souffle: { nom: 'Souffle court', ico: '💨', desc: 'Il n\'encaisse vraiment qu\'entre deux attaques (contour doré) : ×2,2 à ce moment, ×0,5 sinon.' },
  rage: { nom: 'Rage', ico: '🔥', desc: 'Plus il est blessé, plus il enchaîne vite ses attaques.' },
  spectral: { nom: 'Spectral', ico: '👻', desc: 'De temps en temps il devient transparent : tes tirs le traversent. Profites-en pour te replacer.' }
};
const INVOC = {
  larve: { nom: 'Larves', desc: 'Petites créatures qui te foncent dessus.', hp: 110, r: 12, vit: 150 },
  tireur: { nom: 'Tireurs', desc: 'Restent à distance et tirent des rafales.', hp: 160, r: 14, vit: 85 },
  kamikaze: { nom: 'Kamikazes', desc: 'Foncent sur toi et explosent après un court signal.', hp: 80, r: 11, vit: 215 },
  tourelle: { nom: 'Tourelles', desc: 'Immobiles, elles crachent des balles en tournant.', hp: 230, r: 16, vit: 0 },
  cristal: { nom: 'Cristaux', desc: 'Protègent leur maître.', hp: 260, r: 18, vit: 0 },
  tete: { nom: 'Têtes d\'hydre', desc: 'Protègent le corps de l\'Hydre et crachent à tour de rôle.', hp: 300, r: 17, vit: 0 },
  noeud: { nom: 'Nœuds de toile', desc: 'Les fils de la Tisseuse passent entre eux.', hp: 150, r: 14, vit: 0 }
};
const MOUVS = { ancre: 'Ancré', traqueur: 'Traqueur', errant: 'Errant', orbiteur: 'Orbiteur', clignotant: 'Clignotant', centre: 'Central', aucun: 'Immobile', serpent: 'Rampant' };
const MIN_SALLE = { rochers: 2, failles: 3, givre: 3, ronces: 2, pics: 2, effondrement: 6, geysers: 4, croix: 2, balayage: 2, cage: 3, damier: 3, vortex: 4, mines: 4, echos: 5, fragmentation: 2, zonesSures: 3, murFeu: 3, tornades: 4, marque: 2, seisme: 3, grille: 3 };
// poids d'une attaque = sa difficulté (1 léger, 3 très lourd) : temps de récupération après, phases équilibrées, combinaisons limitées
const POIDS = { zonesSures: 3, damier: 3, cage: 3, vortex: 3, balayage: 3, effondrement: 3, lasers: 3, me_aiguilles: 3, ho_aiguilles: 3, ju_sentence: 3, fo_surchauffe: 3, sn_enroule: 3, bo_combo: 3,
  meteores: 2.5, mur: 2.5, murFeu: 2.5, seisme: 2.5, grille: 2.5, spirale: 2.5, tornades: 2, marque: 2, croix: 2, echos: 2, geysers: 2, failles: 2, rochers: 2, mines: 2, pluie: 2,
  salve: 1.5, rafale: 1, eventail: 1.5, chercheurs: 1.5, petales: 1.5, rebonds: 1.5, sniper: 1.5, ronces: 1, givre: 1, invocation: 1, re_essaim: 1, re_kamikazes: 1.5 };
Object.assign(POIDS, POIDS_EXTRA);
function poids(id) { return POIDS[id] || ({ balles: 1.7, invoc: 1, terrain: 2, zone: 2, rayon: 2.2, corps: 2 }[ATK[id].cat] || 2); }

const NOMS_PHASES = ['Éveil', 'Colère', 'Démence', 'Fureur', 'Éclipse', 'Apothéose', 'Agonie', 'Dernier souffle'];

const SYL1 = ['Vor', 'Kha', 'Zul', 'Mor', 'Ash', 'Thra', 'Gel', 'Nyx', 'Oub', 'Rak', 'Sey', 'Bal', 'Dra', 'Xe', 'Ul', 'Gro', 'Phy', 'Ka', 'Lith', 'Mal', 'Ira', 'Quo', 'Sor', 'Tey', 'Vel', 'Ygg', 'Aza', 'Brel', 'Cth', 'Ezo'];
const SYL2 = ['gath', 'ros', 'neth', 'ax', 'iel', 'oum', 'ra', 'tor', 'zar', 'mir', 'lok', 'dun', 'esh', 'ys', 'gorn', 'aël', 'uth', 'enn', 'ok', 'ash', 'iros', 'vex'];
function nomBoss(r) { let n = r.pick(SYL1) + r.pick(SYL2); if (r.chance(.3)) n += r.pick(SYL2); return n; }

// ---------- Génération (définition pure, rejouable avec la même graine) ----------
// attaques d'espèce qui marchent sur n'importe quel boss : elles rejoignent le tirage commun
const ATK_PARTAGEES = ['se_charge', 're_kamikazes', 'ho_aiguilles', 'ho_engrenages', 'bo_combo', 'bo_lames', 'px_plongeon', 'px_plumes'];
function genBoss(salle, seed, mega, eviter) {
  const r = RNG(seed), df = DF();
  const dispo = ESP_ORDRE.slice(0, Math.min(ESP_ORDRE.length, 4 + Math.floor((salle - 1) / 2)));
  let espId;
  if (mega) espId = r.pick(dispo);
  else if (salle >= 3 && r.chance(.16)) espId = 'chimere';
  else { const l = dispo.filter(e => !(eviter || []).includes(e)); espId = r.pick(l.length ? l : dispo); }
  const esp = ESPECES[espId];
  const nom = nomBoss(r);
  let hue = esp.hue != null ? (esp.hue + r.int(-10, 10) + 360) % 360 : r.int(0, 359);
  if (esp.chimere && hue > 150 && hue < 215) hue = (hue + 90) % 360;
  const D = {
    S: Math.min(1.6, (1.08 + .02 * (salle - 1)) * df.vit),
    C: Math.min(1.7, 1.1 + .015 * (salle - 1)) * df.dens * .85,
    T: Math.max(.62, (.92 - .011 * (salle - 1)) * df.tele)
  };
  const rp = RNG(hashNum((ESP_ORDRE.indexOf(espId) + 3) * 977)); // réglages fixes propres à l'espèce
  const pool = ATK_IDS.concat(ATK_PARTAGEES.filter(id => ATK[id] && !ATK_IDS.includes(id))).filter(id => id !== 'invocation' && (MIN_SALLE[id] || 1) <= salle);
  let src;
  if (esp.chimere) {
    const deja = new Set(); src = [];
    const n = salle >= 12 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const l = [], parCat = {}; let lourds = 0;
      for (const id of r.shuffle(pool.filter(id => !deja.has(id) && (ATK[id].cat !== 'balles' || r.chance(.4))))) {
        const c = ATK[id].cat, pd = poids(id);
        if ((parCat[c] || 0) >= 2 || (pd >= 3 && lourds >= 1) || (c === 'terrain' && parCat[c])) continue;
        l.push(id); parCat[c] = (parCat[c] || 0) + 1; if (pd >= 3) lourds++;
        if (l.length >= r.int(3, 4)) break;
      }
      l.forEach(id => deja.add(id)); src.push({ cycle: l });
    }
  } else {
    // chaque boss garde les attaques liées à la mécanique de son espèce ; le reste de son cycle est tiré
    // au sort dans TOUTES les attaques : n'importe quelle apparence peut porter n'importe quelle attaque
    const deja = new Set();
    src = esp.phases.map(ph => {
      const parCat = {}; let lourds = 0;
      const garde = id => ATK[id].esp;
      for (const id of ph.cycle) if (garde(id)) { const c = ATK[id].cat; parCat[c] = (parCat[c] || 0) + 1; if (poids(id) >= 3) lourds++; }
      const cycle = ph.cycle.map(id => {
        if (garde(id)) return id;
        const choix = pool.filter(x => !deja.has(x) && !ph.cycle.includes(x));
        for (let essai = 0; essai < 40; essai++) {
          const x = r.weighted(choix, y => ({ zone: 2, rayon: 1.3, corps: 1.1, terrain: .8, balles: .7 })[ATK[y].cat] || 1), c = ATK[x].cat, pd = poids(x);
          if ((parCat[c] || 0) >= 2 || (pd >= 3 && lourds >= 1) || (c === 'terrain' && parCat[c])) continue;
          parCat[c] = (parCat[c] || 0) + 1; if (pd >= 3) lourds++; deja.add(x); return x;
        }
        return id;
      });
      return { cycle, carte: ph.carte };
    });
  }
  // le combat change en route : à partir de la salle 6, souvent une 3e phase (nouvelle attaque + attaque de fond) ;
  // les méga boss ont toujours une phase de plus et une attaque inédite par phase
  if (mega && salle >= 5) src.forEach(ph => { const extra = r.pick(pool.filter(id => !ph.cycle.includes(id) && ATK[id].cat !== 'terrain')); ph.cycle.splice(r.int(1, ph.cycle.length), 0, extra); });
  if (mega || (salle >= 4 && r.chance(Math.min(.9, .55 + .015 * salle)))) {
    const last = src[src.length - 1], extra = r.pick(pool.filter(id => !last.cycle.includes(id)));
    src.push({ cycle: last.cycle.concat([extra]), finale: true });
  }
  const invoc = !esp.pasInvoc && salle >= 3 && (r.chance(.42) || (mega && r.chance(.6))) ? r.pick(['larve', 'tireur', 'kamikaze', 'tourelle', 'totem', 'poseur']) : null;
  // plus d'attaques différentes dans chaque phase (2 de plus, tirées dans tout le catalogue, en respectant les limites)
  src.forEach(ph => {
    const parCat = {}; let lourds = 0;
    for (const id of ph.cycle) { const c = ATK[id].cat; parCat[c] = (parCat[c] || 0) + 1; if (poids(id) >= 3) lourds++; }
    for (let k = 0, essais = 0; k < 2 && essais < 60; essais++) {
      const x = r.pick(pool), c = ATK[x].cat, pd = poids(x);
      if (ph.cycle.includes(x) || (parCat[c] || 0) >= 3 || (pd >= 3 && lourds >= 1) || (c === 'terrain' && parCat[c])) continue;
      ph.cycle.splice(r.int(1, ph.cycle.length), 0, x); parCat[c] = (parCat[c] || 0) + 1; if (pd >= 3) lourds++; k++;
    }
  });
  if (df.cran) src.forEach(ph => { const z = pool.filter(id => !ph.cycle.includes(id) && (ATK[id].cat === 'zone' || ATK[id].cat === 'rayon')); if (z.length) ph.cycle.splice(r.int(1, ph.cycle.length), 0, r.pick(z)); });
  let carte = 'normale';
  const phases = src.map((ph, i) => {
    if (ph.carte) carte = ph.carte;
    else if (i === 0) carte = salle >= 6 && r.chance(.25) ? r.pick(['cercle', 'piliers', 'lave', 'glace']) : 'normale';
    else if (mega || r.chance(.7)) carte = r.pick(Object.keys(CARTES).filter(k => k !== carte));
    const cyc = ph.cycle.slice();
    if (invoc && (i >= 1 || mega)) cyc.splice(1, 0, 'invocation');
    const rr = esp.chimere ? r : rp;
    const fondId = ph.finale || i >= 1 ? r.pick(ATK_FOND) : null; // dès la 2e phase, une attaque de fond se superpose
    return {
      nom: ph.finale ? 'Dernier souffle' : NOMS_PHASES[Math.min(NOMS_PHASES.length - 2, i)],
      carte, finale: !!ph.finale,
      cycle: cyc.map(id => ({ id, p: ATK[id].params(rr, D, false) })),
      fond: fondId ? { id: fondId, p: ATK[fondId].params(r, D, true) } : null,
      tempo: (1 + .1 * i + (ph.finale ? .1 : 0)) * clamp(1.75 / (cyc.reduce((s, id) => s + poids(id), 0) / cyc.length), .8, 1.15)
    };
  });
  let nTr = salle < 4 ? 0 : salle < 10 ? (r.chance(.45) ? 1 : 0) : 1 + (r.chance(.3) ? 1 : 0);
  if (mega) nTr = salle >= 20 ? Math.min(2, nTr + 1) : Math.min(1, nTr);
  const traits = r.shuffle(Object.keys(TRAITS).filter(t => !(esp.sansTraits || []).includes(t))).slice(0, nTr);
  // vie mesurée par un robot qui joue parfaitement : 1 à 2 min par combat, méga boss compris (ils ont plus d'attaques,
  // pas plus de vie) ; les PV sont les mêmes dans toutes les difficultés, la difficulté change le rythme et les dégâts
  const hpMax = Math.round(12200 * (1 + .003 * Math.min(salle, 60)) * (mega ? 1.15 : 1) * (.95 + .05 * phases.length) * (esp.pv || 1));
  const look = esp.forme ? Object.assign({}, esp.forme) : {
    cotes: r.int(3, 9), style: formePourAttaques((() => { const k = {}; for (const q of phases) for (const a of q.cycle) { const cc = ATK[a.id].cat; k[cc] = (k[cc] || 0) + 1; } return k; })(), r), pics: r.int(0, 12), picL: r.range(.15, .45),
    yeux: r.int(1, 4), sats: r.int(0, 5), anneaux: r.int(0, 2), rot: r.range(.15, .6) * r.sign(), creux: r.range(.35, .6)
  };
  return {
    elem: ELEM_ESPECE[espId] || r.pick(Object.keys(ELEMENTS)),
    seed, salle, mega, esp: espId, nom, titre: esp.chimere ? 'la Chimère' : esp.nom, hue, col: hsl(hue, 100, 66), D, traits, invoc, phases, hpMax,
    r: Math.round((esp.r || r.int(46, 60)) * (mega ? 1.25 : 1)), mouv: esp.mouv || r.pick(['ancre', 'traqueur', 'errant', 'orbiteur', 'clignotant']),
    idle: r.range(.7, 1) * Math.max(.5, 1 - .01 * salle) * df.idle, look
  };
}

// ---------- Boss en combat ----------
function creerBoss(def) {
  const bb = G.arene.bb();
  const b = {
    def, esp: ESPECES[def.esp], s: {}, x: bb.x + bb.w / 2, y: bb.y + bb.h * .3, r: def.r, hp: def.hpMax, hpMax: def.hpMax, phase: 0, ci: 0,
    col: def.col, D: def.D, ctl: false, air: false, wind: 0, windMax: 1, main: null, fond: null, fondCd: 4,
    idle: .6, last: null, trans: 0, stun: 0, facing: Math.PI / 2, flash: 0, alpha: 1, haut: 0, moveMul: 1,
    charge: false, mort: false, mvT: 0, mvX: 0, mvY: 0, orb: 0, atkNom: '', atkNomT: 0,
    armure: 0, armureMax: 0, armureCd: 0, miroirT: 6 + R() * 3, miroir: 0, specT: 7 + R() * 3, spectral: 0,
    regenT: 0, cristT: 0, eyesA: Math.PI / 2, ouvert: 0, ouvertMul: 1, intro: 2.1, introY: 0, souffle: 0
  };
  if (def.traits.includes('carapace')) { b.armureMax = Math.round(def.hpMax * .12); b.armure = b.armureMax; }
  return b;
}
function initBoss(b) {
  if (b.esp.init) b.esp.init(b);
  if (b.def.traits.includes('cristaux')) poserCristaux(b);
  b.introY = b.y;
}
function phaseCourante(b) { return b.def.phases[b.phase]; }
// au-delà de 90 s, le colosse s'épuise et encaisse de plus en plus : aucun combat ne s'éternise
function fatigueBoss() { const t = G.chrono || 0; return t > 90 && !(G.def && (G.def.invincible || G.def.indestructible)) ? 1 + (t - 90) * .06 : 1; }
function seuilPhase(b, i) { return b.hpMax * (1 - (i + 1) / b.def.phases.length); }
function bouclierBoss(b) {
  if (b.esp.bouclier && b.esp.bouclier(b)) return true;
  return b.def.traits.includes('cristaux') && G.minions.some(m => m.type === 'cristal' && m.spawn <= 0);
}

function lancerAttaque(b, a, fond) {
  const def = ATK[a.id];
  const run = { g: def.gen(b, a.p), w: 0, id: a.id };
  if (fond) { b.fond = run; return; }
  b.main = run; b.last = a.id; b.moveMul = .45; statPlus('atkLancees');
  b.atkNom = def.nom; b.atkNomT = 2.2;
  const cx = Save.d.codex.att; cx[a.id] = (cx[a.id] || 0) + 1;
}
function pasRunner(run) {
  run.w -= G.dtE;
  G.atkCourante = run.id;
  let guard = 0;
  while (run.w <= 0 && guard++ < 50) {
    const res = run.g.next();
    if (res.done) return false;
    const v = res.value || 0;
    run.w += v;
    if (v === 0) break;
  }
  return true;
}
function prochaineAttaque(b) {
  const forcee = b.esp.prochaine && b.esp.prochaine(b);
  if (forcee) return { id: forcee, p: ATK[forcee].params(RNG(7), b.D, false) };
  const cyc = phaseCourante(b).cycle;
  for (let k = 0; k < cyc.length; k++) {
    const a = cyc[b.ci % cyc.length]; b.ci++;
    if (a.id === 'invocation' && G.minions.filter(m => m.type !== 'cristal').length >= 5) continue;
    return a;
  }
  return cyc[0];
}

function majBoss(b, dt) {
  const dtE = G.dtE;
  b.flash = Math.max(0, b.flash - dt * 6);
  b.atkNomT -= dt;
  if (b.ouvert > 0) b.ouvert -= dtE;
  if (b.froid > 0) b.froid = Math.max(0, b.froid - .25 * dtE);
  if (b.racine > 0) b.racine -= dtE;
  if (b.harpon > 0) b.harpon -= dtE;
  b.eyesA += angDiff(b.eyesA, ang(b.x, b.y, cible().x, cible().y)) * Math.min(1, dt * 6);
  if (b.intro > 0) {
    b.intro -= dt;
    const k = clamp(1 - (b.intro - .5) / 1.6, 0, 1), e = 1 - Math.pow(1 - k, 3);
    b.y = lerp(b.introY - 330, b.introY, e); b.haut = (1 - e) * 60;
    if (b.intro <= .5 && !b.cri) { b.cri = true; Son.play('cri'); G.secoue(14); G.fx.push({ kind: 'anneau', x: b.x, y: b.y, r0: b.r, r1: 700, t: 0, dur: .7, col: b.col }); }
    if (b.intro <= 0) { b.y = b.introY; b.haut = 0; }
    return;
  }
  if (b.trans > 0) { b.trans -= dt; if (b.trans <= 0) b.idle = .5; return; }
  if (b.esp.maj && b.esp.maj(b, dtE)) return;
  if (b.stun > 0) { b.stun -= dtE; return; }
  if (b.wind > 0) b.wind -= dtE;
  const ph = phaseCourante(b), tr = b.def.traits;
  if (tr.includes('miroir')) {
    if (b.miroir > 0) { b.miroir -= dtE; if (b.miroir <= 0) b.miroirT = 6 + R() * 4; }
    else { b.miroirT -= dtE; if (b.miroirT <= 0) { b.miroir = 2.4; G.annonce('Reflets ! Ne tire plus', '#fff', 1.2); } }
  }
  if (tr.includes('spectral') && b.esp.id !== 'spectre') {
    if (b.spectral > 0) b.spectral -= dtE;
    else { b.specT -= dtE; if (b.specT <= 0) { b.spectral = 2.6; b.specT = 8 + R() * 4; } }
  }
  if (tr.includes('carapace') && b.armure <= 0) { b.armureCd -= dtE; if (b.armureCd <= 0) { b.armure = b.armureMax; G.annonce('La carapace repousse', '#bbb', 1.2); } }
  // régénération : lente (0,4 %/s après 3 s sans être touché) et au plus 6 % de sa vie par phase
  if (tr.includes('regen') && fatigueBoss() === 1) { b.regenT += dtE; if (b.regenPh !== b.phase) { b.regenPh = b.phase; b.regenTot = 0; } if (b.regenT > 3 && b.regenTot < b.hpMax * .06) { const lim = b.phase > 0 ? seuilPhase(b, b.phase - 1) : b.hpMax, s = Math.min(b.hpMax * .004 * dtE, lim - b.hp); if (s > 0) { b.hp += s; b.regenTot += s; } } }
  if (tr.includes('cristaux') && !G.minions.some(m => m.type === 'cristal')) { b.cristT -= dtE; if (b.cristT <= 0) poserCristaux(b); }
  if (b.main) { if (!pasRunner(b.main)) { b.main = null; b.ctl = false; b.moveMul = 1; } }
  if (b.fond) { if (!pasRunner(b.fond)) b.fond = null; }
  if (!b.main && b.stun <= 0) {
    let tempo = ph.tempo;
    if (tr.includes('rage')) tempo *= 1 + .7 * (1 - b.hp / b.hpMax);
    b.idle -= dtE * tempo * (1 - .35 * (b.froid || 0));
    if (b.idle <= 0) { const a = prochaineAttaque(b); lancerAttaque(b, a); b.idle = b.def.idle + .3 * poids(a.id); }
  }
  if (ph.fond && !b.fond && !(b.main && poids(b.main.id) >= 2.5)) { b.fondCd -= dtE; if (b.fondCd <= 0) { lancerAttaque(b, ph.fond, true); b.fondCd = 5 + R() * 3; } }
  if (!b.ctl && !(b.racine > 0) && !(b.esp.bouger && b.esp.bouger(b, dtE))) bougerBoss(b, dtE);
  if (b.def.mouv !== 'serpent') {
    const t = cible(), want = ang(b.x, b.y, t.x, t.y), tr2 = (b.esp.tourne ? b.esp.tourne[Math.min(1, b.phase)] : 1.4) * dtE;
    b.facing += clamp(angDiff(b.facing, want), -tr2, tr2);
  }
}

function bougerBoss(b, dt) {
  const bb = G.arene.bb(), t = cible(), mm = b.main ? b.moveMul : 1, S = b.D.S;
  let tx = b.x, ty = b.y, v = 0;
  switch (b.def.mouv) {
    case 'ancre': tx = bb.x + bb.w / 2 + Math.sin(G.t * .4) * 120; ty = bb.y + bb.h * .35 + Math.cos(G.t * .3) * 50; v = 60; break;
    case 'centre': tx = bb.x + bb.w / 2; ty = bb.y + bb.h / 2; v = 90; break;
    case 'aucun': case 'serpent': return;
    case 'traqueur': {
      const dd = Math.sqrt(d2(b.x, b.y, t.x, t.y)), a = ang(t.x, t.y, b.x, b.y);
      tx = t.x + Math.cos(a) * 260; ty = t.y + Math.sin(a) * 260; v = dd > 320 || dd < 190 ? 125 : 55; break;
    }
    case 'orbiteur': {
      b.orb += dt * .35; const rr = Math.min(bb.w, bb.h) * .32;
      tx = bb.x + bb.w / 2 + Math.cos(b.orb) * rr * 1.3; ty = bb.y + bb.h / 2 + Math.sin(b.orb) * rr; v = 140; break;
    }
    case 'errant': case 'clignotant': {
      b.mvT -= dt;
      if (b.mvT <= 0) { const pt = G.arene.pointAuHasard(b.r + 40); b.mvX = pt.x; b.mvY = pt.y; b.mvT = 2.5 + R() * 1.5; }
      tx = b.mvX; ty = b.mvY; v = 120;
      if (b.def.mouv === 'clignotant' && !b.main && b.mvT < .05 && R() < .5) {
        let pt, k = 0; do { pt = G.arene.pointAuHasard(b.r + 40); } while (++k < 15 && d2(pt.x, pt.y, G.p.x, G.p.y) < 260 * 260);
        G.fx.push({ kind: 'fantome', x: b.x, y: b.y, t: 0, dur: .3, r: b.r }); b.x = pt.x; b.y = pt.y; Son.play('teleporte');
      }
      break;
    }
  }
  const dx = tx - b.x, dy = ty - b.y, dd = Math.hypot(dx, dy);
  if (dd > 2) { const s = Math.min(dd, v * S * mm * dt); b.x += dx / dd * s; b.y += dy / dd * s; }
  G.arene.contenir(b, b.r * .8);
}

function poserCristaux(b) {
  const n = Math.min(4, 2 + Math.floor(G.salle / 10)), bb = G.arene.bb(), a0 = R() * TAU;
  for (let i = 0; i < n; i++) {
    const a = a0 + i * TAU / n;
    const pt = G.arene.clampPt(bb.x + bb.w / 2 + Math.cos(a) * bb.w * .38, bb.y + bb.h / 2 + Math.sin(a) * bb.h * .38, 30);
    G.invoquer('cristal', pt.x, pt.y);
  }
  b.cristT = 18;
}

function passerPhase(b) {
  b.phase++;
  b.main = null; b.fond = null; b.ctl = false; b.air = false; b.haut = 0; b.alpha = 1; b.charge = false; b.wind = 0;
  b.trans = 2; b.stun = 0; b.ci = 0; b.ouvert = 0;
  for (const e of G.eb) G.etincelle(e.x, e.y, b.col, 1);
  G.eb.length = 0; G.hz.length = 0; G.aspiration = null;
  const ph = phaseCourante(b);
  G.arene.appliquer(ph.carte);
  Save.d.codex.cartes[ph.carte] = 1;
  if (b.esp.phaseInit) b.esp.phaseInit(b, b.phase);
  if (b.def.traits.includes('cristaux')) { G.minions = G.minions.filter(m => m.type !== 'cristal'); poserCristaux(b); }
  if (ph.carte !== 'normale') G.annonce(CARTES[ph.carte].nom, b.col, 2.4);
  G.secoue(16); G.gel = .12; G.flash = .35; Son.play('phase');
  G.fx.push({ kind: 'anneau', x: b.x, y: b.y, r0: b.r, r1: 900, t: 0, dur: .8, col: b.col });
  G.musiquePhase();
  if (G.rel('brise') && G.p) { G.p.hp = Math.min(G.p.hpMax, G.p.hp + 20); G.texte(G.p.x, G.p.y - 30, '+20', '#46e39b', 18); }
}

// ---------- Invocations ----------
function majMinion(m, dt) {
  if (m.spawn > 0) { m.spawn -= dt; return; }
  m.flash = Math.max(0, m.flash - dt * 6);
  const t = cible(), a = ang(m.x, m.y, t.x, t.y), dd = Math.sqrt(d2(m.x, m.y, t.x, t.y));
  const b = G.boss, S = b ? b.D.S : 1;
  switch (m.type) {
    case 'larve': m.x += Math.cos(a) * m.vit * S * dt; m.y += Math.sin(a) * m.vit * S * dt; break;
    case 'tireur': {
      const s = dd > 330 ? 1 : dd < 250 ? -1 : 0;
      m.x += Math.cos(a) * m.vit * s * dt + Math.cos(a + Math.PI / 2) * 40 * dt; m.y += Math.sin(a) * m.vit * s * dt + Math.sin(a + Math.PI / 2) * 40 * dt;
      m.cd -= dt;
      if (m.cd <= 0) { m.cd = 2.4; m.salve = 3; m.st = 0; }
      if (m.salve > 0) { m.st -= dt; if (m.st <= 0) { m.st = .12; m.salve--; EB(m.x, m.y, a, 260 * S, { r: 6, src: 'invocation' }); } }
      break;
    }
    case 'kamikaze':
      if (m.boom === undefined) { m.x += Math.cos(a) * m.vit * S * dt; m.y += Math.sin(a) * m.vit * S * dt; if (dd < 75) { m.boom = 0; Son.play('tele'); } }
      else { m.boom += dt; if (m.boom >= .7) { m.dead = true; G.explo(m.x, m.y, 85, ROUGE); Son.play('explo'); if (d2(m.x, m.y, G.p.x, G.p.y) < (85 + G.p.hr) ** 2) G.blesser(DMG(1.2), 'invocation'); } }
      break;
    case 'tourelle':
      m.a += 1.6 * dt; m.cd -= dt;
      if (m.cd <= 0) { m.cd = .24; EB(m.x, m.y, m.a, 170 * S, { r: 6, src: 'invocation' }); EB(m.x, m.y, m.a + Math.PI, 170 * S, { r: 6, src: 'invocation' }); }
      break;
    case 'tete':
      if (b && !b.mort) { const aa = (b.s.rot || 0) + m.idx * TAU / m.n; m.x = b.x + Math.cos(aa) * b.r * 1.7; m.y = b.y + Math.sin(aa) * b.r * 1.7; }
      return;
  }
  G.arene.contenir(m, m.r);
}
function dessinerMinion(c, m) {
  const b = G.boss, col = m.type === 'cristal' ? '#7fd8ff' : (b ? b.col : '#f6a');
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(m.x + 4, m.y + m.r * .8, m.r, m.r * .45, 0, 0, TAU); c.fill();
  if (m.type === 'tete' && b) { c.strokeStyle = hsl(b.def.hue, 60, 30); c.lineWidth = 14; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(m.x, m.y); c.stroke(); c.strokeStyle = hsl(b.def.hue, 90, 50, .6); c.lineWidth = 2; c.stroke(); }
  c.save(); c.translate(m.x, m.y);
  if (m.spawn > 0) { c.globalAlpha = .35; c.strokeStyle = col; c.setLineDash([4, 4]); c.beginPath(); c.arc(0, 0, m.r * (1 + m.spawn), 0, TAU); c.stroke(); c.setLineDash([]); }
  const g = c.createRadialGradient(-m.r * .3, -m.r * .3, 1, 0, 0, m.r * 1.2);
  g.addColorStop(0, m.flash > 0 ? '#fff' : (b ? hsl(b.def.hue, 50, 35) : '#444')); g.addColorStop(1, '#0c0812');
  c.fillStyle = g; c.strokeStyle = col; c.lineWidth = 2.5;
  c.beginPath();
  if (m.type === 'cristal') { const h = m.r * 1.3; c.moveTo(0, -h); c.lineTo(m.r * .8, 0); c.lineTo(0, h); c.lineTo(-m.r * .8, 0); c.closePath(); }
  else if (m.type === 'noeud') { for (let i = 0; i < 8; i++) { const rr = i % 2 ? m.r * .5 : m.r, aa = i * TAU / 8 + G.t; c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } c.closePath(); }
  else if (m.type === 'tourelle') { for (let i = 0; i < 6; i++) { const aa = m.a + i * TAU / 6; c.lineTo(Math.cos(aa) * m.r, Math.sin(aa) * m.r); } c.closePath(); }
  else if (m.type === 'kamikaze') { for (let i = 0; i < 10; i++) { const rr = i % 2 ? m.r * .6 : m.r * 1.15, aa = i * TAU / 10 + G.t * 4; c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } c.closePath(); }
  else if (m.type === 'tete') { const ea = ang(m.x, m.y, G.p.x, G.p.y); c.moveTo(Math.cos(ea) * m.r * 1.5, Math.sin(ea) * m.r * 1.5); c.arc(0, 0, m.r, ea + .7, ea - .7 + TAU); c.closePath(); }
  else c.arc(0, 0, m.r, 0, TAU);
  c.fill(); c.stroke();
  if (m.type === 'cristal' || m.type === 'noeud') { c.globalAlpha = .4 + .3 * Math.sin(G.t * 5); c.fillStyle = col; c.fill(); c.globalAlpha = 1; }
  else { c.fillStyle = col; c.beginPath(); const ea = ang(m.x, m.y, G.p.x, G.p.y); c.arc(Math.cos(ea) * m.r * .35, Math.sin(ea) * m.r * .35, 3, 0, TAU); c.fill(); }
  c.restore();
  if (m.type === 'kamikaze' && m.boom !== undefined) { c.fillStyle = 'rgba(255,40,80,.2)'; c.beginPath(); c.arc(m.x, m.y, 85 * Math.min(1, m.boom / .7), 0, TAU); c.fill(); c.strokeStyle = ROUGE; c.beginPath(); c.arc(m.x, m.y, 85, 0, TAU); c.stroke(); }
  if (m.hp < m.hpMax && m.spawn <= 0) { c.fillStyle = '#000a'; c.fillRect(m.x - 16, m.y - m.r - 10, 32, 4); c.fillStyle = col; c.fillRect(m.x - 16, m.y - m.r - 10, 32 * m.hp / m.hpMax, 4); }
}

// ---------- Dessin du boss ----------
function cheminCorps(c, L, r, t) {
  const n = L.cotes, rot = t * L.rot;
  c.beginPath();
  if (L.style === 'blob') {
    const k = 28;
    for (let i = 0; i <= k; i++) { const a = i * TAU / k + rot, rr = r * (1 + .08 * Math.sin(a * n + t * 2) + .04 * Math.sin(a * 3 - t * 3)); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  } else if (L.style === 'etoile') {
    for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n + rot, rr = i % 2 ? r * L.creux * 1.4 : r * 1.08; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  } else {
    for (let i = 0; i < n; i++) { const a = i * TAU / n + rot, rr = r * (1 + .03 * Math.sin(t * 3 + i)); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  }
  c.closePath();
}
// la silhouette du boss (corps + armes) est dessinée sur un calque à part, puis posée avec un contour sombre net :
// on lit tout de suite sa forme, sans halo autour
let calqueCorps = null, calqueSil = null, corpsInfo = null;
function corpsDebut(cm, r) {
  if (typeof document === 'undefined' || !cm.getTransform) return cm;
  const T = cm.getTransform(), k = Math.max(Math.abs(T.a), Math.abs(T.d)), S = Math.ceil(2 * 2.4 * r * k) + 16;
  if (!calqueCorps) { calqueCorps = document.createElement('canvas'); calqueSil = document.createElement('canvas'); }
  if (calqueCorps.width < S) { calqueCorps.width = calqueCorps.height = calqueSil.width = calqueSil.height = S; }
  const x = calqueCorps.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, S, S);
  x.setTransform(T.a, T.b, T.c, T.d, S / 2, S / 2);
  corpsInfo = { T, S, k, al: cm.globalAlpha };
  return x;
}
function corpsFin(cm, b, h) {
  if (!corpsInfo || cm === calqueCorps.getContext('2d') || typeof document === 'undefined') return cm;
  const { T, S, k, al } = corpsInfo; corpsInfo = null;
  const sx = calqueSil.getContext('2d');
  sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, S, S);
  sx.drawImage(calqueCorps, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#050307'; sx.fillRect(0, 0, S, S);
  const ep = Math.max(2, 1.7 * k);
  cm.save(); cm.setTransform(1, 0, 0, 1, 0, 0); cm.globalAlpha = al;
  const x0 = T.e - S / 2, y0 = T.f - S / 2;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; cm.drawImage(calqueSil, 0, 0, S, S, x0 + Math.cos(a) * ep, y0 + Math.sin(a) * ep, S, S); }
  cm.drawImage(calqueCorps, 0, 0, S, S, x0, y0, S, S);
  cm.restore();
  return cm;
}
function dessinerBoss(c, b) {
  const L = b.def.look, t = G.t, h = b.def.hue, ph = b.phase;
  // ombre portée
  c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(b.x + 8, b.y + b.r * .75, b.r * (1 - b.haut / 400), b.r * .42 * (1 - b.haut / 400), 0, 0, TAU); c.fill();
  if (b.esp.dessinCorps && b.esp.dessinCorps(c, b) === true) return;
  const sc = 1 + b.haut / 300;
  c.save();
  c.translate(b.x, b.y - b.haut);
  c.scale(sc, sc);
  let al = b.alpha;
  if (b.spectral > 0) al *= .25 + .1 * Math.sin(t * 12);
  c.globalAlpha = al;
  const r = b.r * (1 + .03 * Math.sin(t * 2.2)) * (b.trans > 0 ? 1 + .08 * Math.sin(t * 30) : 1);
  c.globalCompositeOperation = 'lighter';
  c.drawImage(glow(hsl(h, 100, 50, .4), r * 2.6), -r * 2.6, -r * 2.6);
  c.globalCompositeOperation = 'source-over';
  sprite(c, 'magic_03', hsl(h, 100, 60), 0, 0, r * 3.4, t * .3, .12, true);
  if (b.intro > 0) sprite(c, 'circle7', hsl(h, 100, 65), 0, 0, r * 4, -t, .6, true);
  if (b.def.legendaire) { sprite(c, 'circle6', '#ffb43d', 0, 0, r * 3.6, t * .4, .55, true); if (R() < .3) G.parts.push({ x: b.x + R.range(-r, r), y: b.y + R.range(-r, r), vx: 0, vy: -40, life: .8, max: .8, col: '#ffd86b', r: 2, add: true }); }
  if (false) { c.strokeStyle = '#ffd86b'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.globalAlpha = al * (.5 - i * .12); c.beginPath(); c.arc(0, 0, r * (1.35 + i * .15) + Math.sin(t * 2 + i) * 4, 0, TAU); c.stroke(); } c.globalAlpha = al; }
  if (b.wind > 0) { const k = 1 - b.wind / b.windMax; c.strokeStyle = hsl(h, 100, 78, .95); c.lineWidth = 3 + 3 * k; c.beginPath(); c.arc(0, 0, r * (1.9 - .8 * k), 0, TAU); c.stroke(); }
  const cM = c; c = corpsDebut(cM, r);
  armement(c, b, r, t, h, ph, 'dessous');
  const forme = FORMES[L.style];
  if (forme) {
    forme(c, b, r, t, h, ph, b.eyesA);
    if (b.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = al * b.flash * .5; c.drawImage(glow('#ffffff', r * 1.2), -r * 1.2, -r * 1.2); c.globalAlpha = al; c.globalCompositeOperation = 'source-over'; }
  }
  if (!forme && L.pics) {
    const pl = L.picL * (1 + .3 * ph);
    for (let i = 0; i < L.pics; i++) {
      const a = i * TAU / L.pics - t * L.rot * .5;
      const g = c.createLinearGradient(Math.cos(a) * r * .9, Math.sin(a) * r * .9, Math.cos(a) * r * (1.15 + pl), Math.sin(a) * r * (1.15 + pl));
      g.addColorStop(0, hsl(h, 60, 20)); g.addColorStop(1, hsl(h, 100, 72));
      c.fillStyle = g;
      c.beginPath(); c.moveTo(Math.cos(a - .14) * r * .9, Math.sin(a - .14) * r * .9);
      c.lineTo(Math.cos(a) * r * (1.15 + pl), Math.sin(a) * r * (1.15 + pl));
      c.lineTo(Math.cos(a + .14) * r * .9, Math.sin(a + .14) * r * .9); c.closePath(); c.fill();
    }
  }
  if (!forme) {
  // corps éclairé depuis le haut-gauche
  cheminCorps(c, L, r, t);
  const g = c.createRadialGradient(-r * .35, -r * .4, r * .05, 0, 0, r * 1.15);
  g.addColorStop(0, hsl(h, 55, 42)); g.addColorStop(.45, hsl(h, 65, 18)); g.addColorStop(1, hsl(h, 80, 8));
  c.fillStyle = g; c.fill();
  c.strokeStyle = hsl(h, 100, 66); c.lineWidth = 3 + ph; c.stroke();
  c.save(); c.clip();
  c.strokeStyle = hsl(h, 100, 85, .35); c.lineWidth = r * .18; c.beginPath(); c.arc(-r * .15, -r * .2, r * .95, Math.PI * 1.05, Math.PI * 1.55); c.stroke();
  c.restore();
  // cœur
  const coeur = b.ouvert > 0 ? 1 : .35 + .15 * Math.sin(t * 4);
  c.globalCompositeOperation = 'lighter';
  c.drawImage(glow(b.ouvert > 0 ? 'rgba(255,220,90,.9)' : hsl(h, 100, 60, .55), r * .8 * (1 + coeur * .4)), -r * .8 * (1 + coeur * .4), -r * .8 * (1 + coeur * .4));
  c.globalCompositeOperation = 'source-over';
  if (b.flash > 0) { cheminCorps(c, L, r, t); c.globalAlpha = al * b.flash * .55; c.fillStyle = '#fff'; c.fill(); c.globalAlpha = al; }
  for (let i = 0; i < L.anneaux; i++) { c.strokeStyle = hsl(h, 100, 60, .5); c.lineWidth = 1.5; c.setLineDash([6, 8]); c.lineDashOffset = t * 30 * (i ? -1 : 1); c.beginPath(); c.arc(0, 0, r * (.55 + i * .18), 0, TAU); c.stroke(); }
  c.setLineDash([]);
  const ea = b.eyesA;
  for (let i = 0; i < L.yeux; i++) {
    const off = (i - (L.yeux - 1) / 2) * r * .32, px = -Math.sin(ea) * off, py = Math.cos(ea) * off;
    const ex = px + Math.cos(ea) * r * .25, ey = py + Math.sin(ea) * r * .25, er = r * (L.yeux === 1 ? .22 : .13);
    c.fillStyle = '#05030a'; c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.fill();
    const ec = b.wind > 0 ? '#fff' : b.ouvert > 0 ? '#ffe14d' : hsl(h, 100, 70);
    c.globalCompositeOperation = 'lighter'; c.drawImage(glow(ec, er * 1.6), ex - er * 1.6, ey - er * 1.6); c.globalCompositeOperation = 'source-over';
    c.fillStyle = ec; c.beginPath(); c.arc(ex + Math.cos(ea) * er * .35, ey + Math.sin(ea) * er * .35, er * .5, 0, TAU); c.fill();
  }
  }
  armement(c, b, r, t, h, ph, 'dessus');
  c = corpsFin(cM, b, h);
  if (b.ouvert > 0) lueur(c, 'rgba(255,220,90,.7)', r * .9);
  for (let i = 0; i < L.sats; i++) {
    const a = t * (1 + i * .2) + i * TAU / L.sats, rr = r * (1.45 + .1 * Math.sin(t + i));
    c.globalCompositeOperation = 'lighter'; c.drawImage(glow(hsl(h, 100, 65, .8), 10 + ph * 2), Math.cos(a) * rr - 10 - ph * 2, Math.sin(a) * rr - 10 - ph * 2); c.globalCompositeOperation = 'source-over';
  }
  c.restore();
  // états visibles
  const tr = b.def.traits;
  c.save(); c.translate(b.x, b.y - b.haut);
  if (b.ouvert > 0) { c.strokeStyle = `rgba(255,210,77,${.6 + .4 * Math.sin(t * 18)})`; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, b.r * 1.22, 0, TAU); c.stroke(); }
  if (tr.includes('dos')) {
    const a = b.facing + Math.PI;
    c.fillStyle = '#ffe14d'; c.globalAlpha = .7 + .3 * Math.sin(t * 6);
    c.beginPath(); c.arc(Math.cos(a) * b.r * .9, Math.sin(a) * b.r * .9, 9, 0, TAU); c.fill();
    c.globalAlpha = 1; c.strokeStyle = '#ccc'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, b.r * 1.08, b.facing - 1.2, b.facing + 1.2); c.stroke();
  }
  // carapace : de vraies plaques de métal autour de lui (elles tombent à mesure qu'elle s'use)
  if (tr.includes('carapace') && b.armure > 0) {
    const n = Math.ceil(8 * b.armure / b.armureMax), R1 = b.r * 1.06, R2 = b.r * 1.26;
    for (let i = 0; i < n; i++) {
      const a0 = b.facing + i * TAU / 8 + .06, a1 = a0 + TAU / 8 - .12;
      c.beginPath(); c.arc(0, 0, R2, a0, a1); c.arc(0, 0, R1, a1, a0, true); c.closePath();
      const g = c.createRadialGradient(0, 0, R1, 0, 0, R2); g.addColorStop(0, '#3a3c44'); g.addColorStop(.5, '#a9adb8'); g.addColorStop(1, '#4a4c56');
      c.fillStyle = g; c.fill(); c.strokeStyle = '#121218'; c.lineWidth = 2; c.stroke();
      const am = (a0 + a1) / 2; c.fillStyle = '#e6e8ee'; c.beginPath(); c.arc(Math.cos(am) * (R1 + R2) / 2, Math.sin(am) * (R1 + R2) / 2, 2.2, 0, TAU); c.fill();
    }
  }
  if (b.miroir > 0) { c.strokeStyle = `rgba(255,255,255,${.6 + .4 * Math.sin(t * 25)})`; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, b.r * 1.2, 0, TAU); c.stroke(); }
  if (tr.includes('souffle') && bossVulnerableSouffle(b)) { c.strokeStyle = '#ffd24d'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, b.r * 1.15, 0, TAU); c.stroke(); }
  if (bouclierBoss(b)) {
    // champ de force : bulle à alvéoles hexagonales (on voit que c'est un bouclier, pas une partie du corps)
    const RB = b.r * 1.38 + Math.sin(t * 3) * 2;
    c.fillStyle = 'rgba(127,216,255,.08)'; c.beginPath(); c.arc(0, 0, RB, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.arc(0, 0, RB, 0, TAU); c.clip(); c.strokeStyle = 'rgba(160,230,255,.35)'; c.lineWidth = 1.2;
    const hx = 16; for (let yy = -RB; yy < RB + hx; yy += hx * 1.5) for (let xx = -RB; xx < RB + hx; xx += hx * 1.732) { const ox = xx + ((yy / (hx * 1.5)) % 2 ? hx * .866 : 0); c.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; c.lineTo(ox + Math.cos(a) * hx * .9, yy + Math.sin(a) * hx * .9); } c.closePath(); c.stroke(); }
    c.restore(); c.strokeStyle = 'rgba(160,230,255,.9)'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, RB, 0, TAU); c.stroke();
  }
  if (b.stun > 0) { c.fillStyle = '#ffe14d'; for (let i = 0; i < 3; i++) { const a = t * 4 + i * TAU / 3; c.beginPath(); c.arc(Math.cos(a) * b.r * .6, -b.r - 12 + Math.sin(a) * 6, 4, 0, TAU); c.fill(); } }
  c.restore();
  if (tr.includes('cristaux')) {
    c.strokeStyle = 'rgba(127,216,255,.35)'; c.lineWidth = 2; c.setLineDash([6, 8]); c.lineDashOffset = -t * 40;
    for (const m of G.minions) if (m.type === 'cristal' && m.spawn <= 0) { c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(m.x, m.y); c.stroke(); }
    c.setLineDash([]);
  }
  if (b.esp.dessin) b.esp.dessin(c, b);
}
function bossVulnerableSouffle(b) { return (!b.main && b.trans <= 0) || b.stun > 0; }
