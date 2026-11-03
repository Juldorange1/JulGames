'use strict';
/* Colosses — fabrique de boss infinis : nom, apparence, phases (3 attaques chacune),
   cartes spéciales, invocations et traits qui changent la façon de le tuer. */

const CARTES = {
  normale: { nom: 'Arène', desc: 'Une arène classique.' },
  cercle: { nom: 'Arène ronde', desc: 'Pas de coin où se réfugier.' },
  piliers: { nom: 'Piliers', desc: 'Les piliers arrêtent tous les tirs, les tiens comme les siens. Fais-le charger dedans : il s\'assomme !' },
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
  regen: { nom: 'Régénération', ico: '💚', desc: 'Il se soigne vite s\'il n\'est pas touché pendant 2 s. Ne relâche jamais la pression.' },
  souffle: { nom: 'Souffle court', ico: '💨', desc: 'Il n\'encaisse vraiment qu\'entre deux attaques (contour doré) : ×2,2 à ce moment, ×0,5 sinon.' },
  rage: { nom: 'Rage', ico: '🔥', desc: 'Plus il est blessé, plus il enchaîne vite ses attaques.' },
  spectral: { nom: 'Spectral', ico: '👻', desc: 'De temps en temps il devient transparent : tes tirs le traversent. Profites-en pour te replacer.' }
};
const INVOC = {
  larve: { nom: 'Larves', desc: 'Petites créatures qui te foncent dessus.', hp: 110, r: 12, vit: 150 },
  tireur: { nom: 'Tireurs', desc: 'Restent à distance et tirent des rafales.', hp: 160, r: 14, vit: 85 },
  kamikaze: { nom: 'Kamikazes', desc: 'Foncent sur toi et explosent après un court signal.', hp: 80, r: 11, vit: 215 },
  tourelle: { nom: 'Tourelles', desc: 'Immobiles, elles crachent des balles en tournant.', hp: 230, r: 16, vit: 0 },
  cristal: { nom: 'Cristaux', desc: 'Protègent leur maître.', hp: 260, r: 18, vit: 0 }
};
const MOUVS = {
  ancre: 'Ancré', traqueur: 'Traqueur', errant: 'Errant', orbiteur: 'Orbiteur', clignotant: 'Clignotant'
};
const MIN_SALLE = { croix: 2, balayage: 2, cage: 3, damier: 3, vortex: 4, mines: 4, echos: 5, fragmentation: 2 };
const NOMS_PHASES = ['Éveil', 'Colère', 'Démence', 'Fureur', 'Éclipse', 'Apothéose', 'Agonie', 'Dernier souffle'];

const SYL1 = ['Vor', 'Kha', 'Zul', 'Mor', 'Ash', 'Thra', 'Gel', 'Nyx', 'Oub', 'Rak', 'Sey', 'Bal', 'Dra', 'Xe', 'Ul', 'Gro', 'Phy', 'Ka', 'Lith', 'Mal', 'Ira', 'Quo', 'Sor', 'Tey', 'Vel', 'Ygg', 'Aza', 'Brel', 'Cth', 'Ezo'];
const SYL2 = ['gath', 'ros', 'neth', 'ax', 'iel', 'oum', 'ra', 'tor', 'zar', 'mir', 'lok', 'dun', 'esh', 'ys', 'gorn', 'aël', 'uth', 'enn', 'ok', 'ash', 'iros', 'vex'];
const EPI1 = ['Dévoreur', 'Tisseur', 'Gardien', 'Brasier', 'Faucheur', 'Colosse', 'Spectre', 'Héraut', 'Briseur', 'Souverain', 'Prophète', 'Serpent', 'Titan', 'Fléau', 'Oracle', 'Bourreau', 'Veilleur', 'Chimère'];
const EPI2 = ['des abysses', 'd\'étoiles', 'du néant', 'aux mille yeux', 'de cendre', 'du dernier jour', 'de verre', 'des marées', 'sans visage', 'de foudre', 'des glaces', 'écarlate', 'du crépuscule', 'des échos', 'de fer', 'des songes', 'd\'obsidienne', 'des tombes'];

function nomBoss(r) {
  let n = r.pick(SYL1) + r.pick(SYL2);
  if (r.chance(.3)) n += r.pick(SYL2);
  return { nom: n, titre: r.pick(EPI1) + ' ' + r.pick(EPI2) };
}

// ---------- Génération d'un boss (définition pure, rejouable avec la même graine) ----------
function genBoss(salle, seed, mega) {
  const r = RNG(seed);
  const nm = nomBoss(r);
  let hue = r.int(0, 359);
  if (hue > 150 && hue < 215) hue = (hue + 90) % 360; // jamais la couleur des tirs du joueur
  const nPh = mega ? Math.min(6, 3 + Math.floor(salle / 20)) : clamp(1 + Math.floor((salle + r.int(0, 5)) / 7), 1, 4);
  const D = {
    S: Math.min(1.7, 1 + .022 * (salle - 1)) * (mega ? 1.05 : 1),
    C: Math.min(1.8, 1 + .02 * (salle - 1)),
    T: Math.max(.6, 1 - .011 * (salle - 1))
  };
  // traits
  let nTr = salle < 3 ? 0 : salle < 8 ? (r.chance(.5) ? 1 : 0) : 1 + (r.chance(.35) ? 1 : 0);
  if (mega) nTr = salle >= 15 ? 2 : 1;
  const traits = r.shuffle(Object.keys(TRAITS)).slice(0, nTr);
  const invoc = (salle >= 3 && r.chance(.3)) || (mega && r.chance(.5)) ? r.pick(['larve', 'tireur', 'kamikaze', 'tourelle']) : null;
  const invocDes = invoc ? (r.chance(.5) ? 0 : 1) : 99;
  // phases
  const dispo = ATK_IDS.filter(id => id !== 'invocation' && (MIN_SALLE[id] || 1) <= salle);
  const deja = new Set();
  const phases = [];
  let carte = salle >= 6 && r.chance(.25) ? r.pick(['cercle', 'piliers', 'lave', 'glace']) : 'normale';
  for (let i = 0; i < nPh; i++) {
    if (i > 0 && r.chance(.55)) { const c = r.pick(Object.keys(CARTES).filter(k => k !== carte)); carte = c; }
    let pool = dispo.filter(id => !deja.has(id));
    if (pool.length < 3) pool = dispo.slice();
    const choix = [], parCat = {};
    for (const id of r.shuffle(pool.slice())) {
      const cat = ATK[id].cat;
      if ((parCat[cat] || 0) >= 2) continue;
      choix.push(id); parCat[cat] = (parCat[cat] || 0) + 1;
      if (choix.length === 3) break;
    }
    choix.forEach(id => deja.add(id));
    const atk = choix.map(id => ({ id, p: ATK[id].params(r, D, false) }));
    if (invoc && i >= invocDes) atk.push({ id: 'invocation', p: ATK.invocation.params(r, D, false) });
    const fondId = (mega && i >= 1) || (!mega && i >= 2 && salle >= 12) ? r.pick(ATK_FOND) : null;
    phases.push({
      nom: NOMS_PHASES[Math.min(NOMS_PHASES.length - 1, i + (nPh <= 2 && i ? 1 : 0))],
      carte, atk,
      fond: fondId ? { id: fondId, p: ATK[fondId].params(r, D, true) } : null,
      tempo: 1 + .1 * i
    });
  }
  const croiss = 1 + .08 * Math.min(salle - 1, 30) + .03 * Math.max(0, salle - 31);
  const hpMax = Math.round(5500 * croiss * (mega ? 2 : 1) * (.85 + .15 * nPh));
  return {
    seed, salle, mega, nom: nm.nom, titre: nm.titre, hue, col: hsl(hue, 100, 66), D, traits, invoc, phases, hpMax,
    r: mega ? 72 : r.int(46, 60), mouv: r.pick(Object.keys(MOUVS)), idle: r.range(.7, 1.05) * Math.max(.5, 1 - .01 * salle),
    look: {
      cotes: r.int(3, 9), style: r.pick(['poly', 'etoile', 'blob', 'poly']), pics: r.int(0, 12), picL: r.range(.15, .45),
      yeux: r.int(1, 4), sats: r.int(0, 5), anneaux: r.int(0, 2), rot: r.range(.15, .6) * r.sign(), creux: r.range(.35, .6)
    }
  };
}

// ---------- Boss en combat ----------
function creerBoss(def) {
  const bb = G.arene.bb();
  const b = {
    def, x: bb.x + bb.w / 2, y: bb.y + bb.h * .3, r: def.r, hp: def.hpMax, hpMax: def.hpMax, phase: 0,
    col: def.col, D: def.D, ctl: false, air: false, wind: 0, windMax: 1, main: null, fond: null, fondCd: 4,
    idle: 1.5, last: null, trans: 0, stun: 0, facing: Math.PI / 2, flash: 0, alpha: 1, haut: 0, moveMul: 1,
    charge: false, mort: false, mvT: 0, mvX: 0, mvY: 0, orb: 0, atkNom: '', atkNomT: 0, vx: 0, vy: 0,
    armure: 0, armureMax: 0, armureCd: 0, miroirT: 6 + R() * 3, miroir: 0, specT: 7 + R() * 3, spectral: 0,
    regenT: 0, cristT: 0, ralent: 1, eyesA: 0
  };
  if (def.traits.includes('carapace')) { b.armureMax = Math.round(def.hpMax * .12); b.armure = b.armureMax; }
  return b;
}
function phaseCourante(b) { return b.def.phases[b.phase]; }
function seuilPhase(b, i) { return b.hpMax * (1 - (i + 1) / b.def.phases.length); }

function lancerAttaque(b, a, fond) {
  const def = ATK[a.id];
  const run = { g: def.gen(b, a.p), w: 0, id: a.id };
  if (fond) { b.fond = run; return; }
  b.main = run; b.last = a.id; b.moveMul = .45;
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

function majBoss(b, dt) {
  const dtE = G.dtE;
  b.flash = Math.max(0, b.flash - dt * 6);
  b.atkNomT -= dt;
  b.eyesA += angDiff(b.eyesA, ang(b.x, b.y, cible().x, cible().y)) * Math.min(1, dt * 6);
  const ph = phaseCourante(b);
  if (b.trans > 0) { b.trans -= dt; if (b.trans <= 0) b.idle = .6; return; }
  if (b.stun > 0) { b.stun -= dtE; return; }
  if (b.wind > 0) b.wind -= dtE;
  // traits
  const tr = b.def.traits;
  if (tr.includes('miroir')) {
    if (b.miroir > 0) { b.miroir -= dtE; if (b.miroir <= 0) b.miroirT = 6 + R() * 4; }
    else { b.miroirT -= dtE; if (b.miroirT <= 0) { b.miroir = 2.4; G.annonce('Reflets ! Ne tire plus', '#fff', 1.2); } }
  }
  if (tr.includes('spectral')) {
    if (b.spectral > 0) b.spectral -= dtE;
    else { b.specT -= dtE; if (b.specT <= 0) { b.spectral = 2.6; b.specT = 8 + R() * 4; } }
  }
  if (tr.includes('carapace') && b.armure <= 0) { b.armureCd -= dtE; if (b.armureCd <= 0) { b.armure = b.armureMax; G.annonce('La carapace repousse', '#bbb', 1.2); } }
  if (tr.includes('regen')) { b.regenT += dtE; if (b.regenT > 2) { const lim = b.phase > 0 ? seuilPhase(b, b.phase - 1) : b.hpMax; b.hp = Math.min(lim, b.hp + b.hpMax * .012 * dtE); } }
  if (tr.includes('cristaux') && !G.minions.some(m => m.type === 'cristal')) { b.cristT -= dtE; if (b.cristT <= 0) poserCristaux(b); }
  // attaques
  if (b.main) { if (!pasRunner(b.main)) { b.main = null; b.ctl = false; b.moveMul = 1; } }
  if (b.fond) { if (!pasRunner(b.fond)) b.fond = null; }
  if (!b.main) {
    let tempo = ph.tempo;
    if (tr.includes('rage')) tempo *= 1 + .7 * (1 - b.hp / b.hpMax);
    b.idle -= dtE * tempo;
    if (b.idle <= 0) {
      const opts = ph.atk.filter(a => a.id !== b.last || ph.atk.length === 1);
      // l'invocation ne revient pas si l'arène est déjà pleine
      const ok = opts.filter(a => a.id !== 'invocation' || G.minions.filter(m => m.type !== 'cristal').length < 4);
      lancerAttaque(b, R.pick(ok.length ? ok : opts));
      b.idle = b.def.idle * (1 + R() * .3);
    }
  }
  if (ph.fond && !b.fond) { b.fondCd -= dtE; if (b.fondCd <= 0) { lancerAttaque(b, ph.fond, true); b.fondCd = 5 + R() * 3; } }
  // déplacement
  if (!b.ctl) bougerBoss(b, dtE);
  const t = cible(), want = ang(b.x, b.y, t.x, t.y), turn = 1.4 * dtE;
  b.facing += clamp(angDiff(b.facing, want), -turn, turn);
}

function bougerBoss(b, dt) {
  const bb = G.arene.bb(), t = cible(), mm = b.main ? b.moveMul : 1, S = b.D.S;
  let tx = b.x, ty = b.y, v = 0;
  switch (b.def.mouv) {
    case 'ancre': tx = bb.x + bb.w / 2 + Math.sin(G.t * .4) * 120; ty = bb.y + bb.h * .35 + Math.cos(G.t * .3) * 50; v = 60; break;
    case 'traqueur': {
      const dd = Math.sqrt(d2(b.x, b.y, t.x, t.y)), a = ang(t.x, t.y, b.x, b.y), want = 260;
      tx = t.x + Math.cos(a) * want; ty = t.y + Math.sin(a) * want; v = dd > 320 || dd < 190 ? 120 : 50; break;
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
        G.fx.push({ kind: 'fantome', x: b.x, y: b.y, t: 0, dur: .3, r: b.r }); b.x = pt.x; b.y = pt.y; Son.play('tele');
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
  b.trans = 2; b.stun = 0;
  for (const e of G.eb) G.etincelle(e.x, e.y, b.col, 1);
  G.eb.length = 0; G.hz.length = 0; G.aspiration = null;
  const ph = phaseCourante(b);
  G.arene.appliquer(ph.carte);
  Save.d.codex.cartes[ph.carte] = 1;
  if (b.def.traits.includes('cristaux')) { G.minions = G.minions.filter(m => m.type !== 'cristal'); poserCristaux(b); }
  G.annonce('PHASE ' + (b.phase + 1) + ' — ' + ph.nom + (ph.carte !== 'normale' ? ' · ' + CARTES[ph.carte].nom : ''), b.col, 2.4);
  G.secoue(14); Son.play('phase');
  G.fx.push({ kind: 'anneau', x: b.x, y: b.y, r0: b.r, r1: 900, t: 0, dur: .8, col: b.col });
}

// ---------- Invocations ----------
function majMinion(m, dt) {
  if (m.spawn > 0) { m.spawn -= dt; return; }
  m.flash = Math.max(0, m.flash - dt * 6);
  const t = cible(), a = ang(m.x, m.y, t.x, t.y), dd = Math.sqrt(d2(m.x, m.y, t.x, t.y));
  const S = G.boss ? G.boss.D.S : 1;
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
      else { m.boom += dt; if (m.boom >= .55) { m.dead = true; G.explo(m.x, m.y, 85, ROUGE); Son.play('explo'); if (d2(m.x, m.y, G.p.x, G.p.y) < (85 + G.p.hr) ** 2) G.blesser(DMG(1.2), 'invocation'); } }
      break;
    case 'tourelle':
      m.a += 1.6 * dt; m.cd -= dt;
      if (m.cd <= 0) { m.cd = .24; EB(m.x, m.y, m.a, 170 * S, { r: 6, src: 'invocation' }); EB(m.x, m.y, m.a + Math.PI, 170 * S, { r: 6, src: 'invocation' }); }
      break;
  }
  G.arene.contenir(m, m.r);
}
function dessinerMinion(c, m) {
  const col = m.type === 'cristal' ? '#7fd8ff' : (G.boss ? G.boss.col : '#f6a');
  c.save(); c.translate(m.x, m.y);
  if (m.spawn > 0) { c.globalAlpha = .35; c.strokeStyle = col; c.setLineDash([4, 4]); c.beginPath(); c.arc(0, 0, m.r * (1 + m.spawn), 0, TAU); c.stroke(); c.setLineDash([]); }
  c.fillStyle = m.flash > 0 ? '#fff' : '#120a18'; c.strokeStyle = col; c.lineWidth = 2.5;
  c.beginPath();
  if (m.type === 'cristal') { const h = m.r * 1.3; c.moveTo(0, -h); c.lineTo(m.r * .8, 0); c.lineTo(0, h); c.lineTo(-m.r * .8, 0); c.closePath(); }
  else if (m.type === 'tourelle') { for (let i = 0; i < 6; i++) { const aa = m.a + i * TAU / 6; c.lineTo(Math.cos(aa) * m.r, Math.sin(aa) * m.r); } c.closePath(); }
  else if (m.type === 'kamikaze') { for (let i = 0; i < 10; i++) { const rr = i % 2 ? m.r * .6 : m.r * 1.15, aa = i * TAU / 10 + G.t * 4; c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } c.closePath(); }
  else c.arc(0, 0, m.r, 0, TAU);
  c.fill(); c.stroke();
  if (m.type === 'cristal') { c.globalAlpha = .4 + .3 * Math.sin(G.t * 5); c.fillStyle = col; c.fill(); }
  else { c.fillStyle = col; c.beginPath(); const ea = ang(m.x, m.y, G.p.x, G.p.y); c.arc(Math.cos(ea) * m.r * .35, Math.sin(ea) * m.r * .35, 3, 0, TAU); c.fill(); }
  c.restore();
  if (m.type === 'kamikaze' && m.boom !== undefined) { c.fillStyle = 'rgba(255,40,80,.2)'; c.beginPath(); c.arc(m.x, m.y, 85 * Math.min(1, m.boom / .55), 0, TAU); c.fill(); c.strokeStyle = ROUGE; c.beginPath(); c.arc(m.x, m.y, 85, 0, TAU); c.stroke(); }
  if (m.hp < m.hpMax && m.spawn <= 0) { c.fillStyle = '#000a'; c.fillRect(m.x - 16, m.y - m.r - 9, 32, 4); c.fillStyle = col; c.fillRect(m.x - 16, m.y - m.r - 9, 32 * m.hp / m.hpMax, 4); }
}

// ---------- Dessin du boss ----------
function cheminCorps(c, L, r, t, phase) {
  const n = L.cotes, rot = t * L.rot;
  c.beginPath();
  if (L.style === 'blob') {
    const k = 24;
    for (let i = 0; i <= k; i++) { const a = i * TAU / k + rot, rr = r * (1 + .08 * Math.sin(a * n + t * 2) + .04 * Math.sin(a * 3 - t * 3)); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  } else if (L.style === 'etoile') {
    for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n + rot, rr = i % 2 ? r * L.creux * 1.4 : r * 1.08; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  } else {
    for (let i = 0; i < n; i++) { const a = i * TAU / n + rot, rr = r * (1 + .03 * Math.sin(t * 3 + i)); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  }
  c.closePath();
}
function dessinerBoss(c, b) {
  const L = b.def.look, t = G.t, h = b.def.hue, ph = b.phase;
  const sc = 1 + b.haut / 300;
  if (b.air || b.haut > 0) { c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(b.x, b.y, b.r * .9, b.r * .45, 0, 0, TAU); c.fill(); }
  c.save();
  c.translate(b.x, b.y - b.haut);
  c.scale(sc, sc);
  let al = b.alpha;
  if (b.spectral > 0) al *= .28 + .1 * Math.sin(t * 12);
  c.globalAlpha = al;
  const r = b.r * (1 + .03 * Math.sin(t * 2.2)) * (b.trans > 0 ? 1 + .08 * Math.sin(t * 30) : 1);
  // aura
  c.drawImage(glow(hsl(h, 100, 55, .35), r * 2.2), -r * 2.2, -r * 2.2);
  if (b.def.mega) { c.strokeStyle = '#ffd86b'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.globalAlpha = al * (.5 - i * .12); c.beginPath(); c.arc(0, 0, r * (1.35 + i * .15) + Math.sin(t * 2 + i) * 4, 0, TAU); c.stroke(); } c.globalAlpha = al; }
  // préparation d'attaque
  if (b.wind > 0) { const k = 1 - b.wind / b.windMax; c.strokeStyle = hsl(h, 100, 75, .9); c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r * (1.8 - .7 * k), 0, TAU); c.stroke(); }
  // pics
  if (L.pics) {
    c.fillStyle = hsl(h, 70, 35); c.strokeStyle = hsl(h, 100, 70); c.lineWidth = 1.5;
    const pl = L.picL * (1 + .3 * ph);
    for (let i = 0; i < L.pics; i++) {
      const a = i * TAU / L.pics - t * L.rot * .5;
      c.beginPath(); c.moveTo(Math.cos(a - .14) * r * .9, Math.sin(a - .14) * r * .9);
      c.lineTo(Math.cos(a) * r * (1.15 + pl), Math.sin(a) * r * (1.15 + pl));
      c.lineTo(Math.cos(a + .14) * r * .9, Math.sin(a + .14) * r * .9); c.closePath(); c.fill(); c.stroke();
    }
  }
  // corps
  cheminCorps(c, L, r, t, ph);
  const g = c.createRadialGradient(0, 0, r * .1, 0, 0, r * 1.1);
  g.addColorStop(0, hsl(h, 60, 22)); g.addColorStop(.7, hsl(h, 70, 14)); g.addColorStop(1, hsl(h, 90, 40));
  c.fillStyle = g; c.fill();
  c.strokeStyle = hsl(h, 100, 68); c.lineWidth = 3 + ph; c.stroke();
  if (b.flash > 0) { c.globalAlpha = al * b.flash * .8; c.fillStyle = '#fff'; c.fill(); c.globalAlpha = al; }
  // anneaux intérieurs
  for (let i = 0; i < L.anneaux; i++) { c.strokeStyle = hsl(h, 100, 60, .5); c.lineWidth = 1.5; c.setLineDash([6, 8]); c.lineDashOffset = t * 30 * (i ? -1 : 1); c.beginPath(); c.arc(0, 0, r * (.55 + i * .18), 0, TAU); c.stroke(); }
  c.setLineDash([]);
  // yeux
  const ea = b.eyesA;
  for (let i = 0; i < L.yeux; i++) {
    const off = (i - (L.yeux - 1) / 2) * r * .32, px = -Math.sin(ea) * off, py = Math.cos(ea) * off;
    const ex = px + Math.cos(ea) * r * .25, ey = py + Math.sin(ea) * r * .25, er = r * (L.yeux === 1 ? .22 : .13);
    c.fillStyle = '#05030a'; c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.fill();
    c.fillStyle = b.wind > 0 ? '#fff' : hsl(h, 100, 70); c.beginPath(); c.arc(ex + Math.cos(ea) * er * .35, ey + Math.sin(ea) * er * .35, er * .5, 0, TAU); c.fill();
  }
  // satellites
  for (let i = 0; i < L.sats; i++) {
    const a = t * (1 + i * .2) + i * TAU / L.sats, rr = r * (1.45 + .1 * Math.sin(t + i));
    c.fillStyle = hsl(h, 100, 70); c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr, 4 + ph, 0, TAU); c.fill();
  }
  c.restore();
  // traits visibles
  const tr = b.def.traits;
  c.save(); c.translate(b.x, b.y - b.haut);
  if (tr.includes('dos')) {
    const a = b.facing + Math.PI;
    c.fillStyle = '#ffe14d'; c.globalAlpha = .7 + .3 * Math.sin(t * 6);
    c.beginPath(); c.arc(Math.cos(a) * b.r * .9, Math.sin(a) * b.r * .9, 9, 0, TAU); c.fill();
    c.globalAlpha = .25; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, b.r * 1.25, a - 1.05, a + 1.05); c.closePath(); c.fill();
    c.globalAlpha = 1; c.strokeStyle = '#ccc'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, b.r * 1.08, b.facing - 1.2, b.facing + 1.2); c.stroke();
  }
  if (tr.includes('carapace') && b.armure > 0) {
    c.strokeStyle = '#c9c9d6'; c.lineWidth = 3 + 5 * b.armure / b.armureMax; c.setLineDash([16, 6]);
    c.beginPath(); c.arc(0, 0, b.r * 1.12, 0, TAU); c.stroke(); c.setLineDash([]);
  }
  if (b.miroir > 0) { c.strokeStyle = `rgba(255,255,255,${.6 + .4 * Math.sin(t * 25)})`; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, b.r * 1.2, 0, TAU); c.stroke(); }
  if (tr.includes('souffle') && bossVulnerableSouffle(b)) { c.strokeStyle = '#ffd24d'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, b.r * 1.15, 0, TAU); c.stroke(); }
  if (tr.includes('cristaux') && G.minions.some(m => m.type === 'cristal')) {
    c.strokeStyle = 'rgba(127,216,255,.8)'; c.lineWidth = 2; c.fillStyle = 'rgba(127,216,255,.12)';
    c.beginPath(); c.arc(0, 0, b.r * 1.3, 0, TAU); c.fill(); c.stroke();
  }
  if (b.stun > 0) { c.fillStyle = '#ffe14d'; for (let i = 0; i < 3; i++) { const a = t * 4 + i * TAU / 3; c.beginPath(); c.arc(Math.cos(a) * b.r * .6, -b.r - 12 + Math.sin(a) * 6, 4, 0, TAU); c.fill(); } }
  c.restore();
  // liens vers les cristaux
  if (tr.includes('cristaux')) {
    c.strokeStyle = 'rgba(127,216,255,.35)'; c.lineWidth = 2; c.setLineDash([6, 8]); c.lineDashOffset = -t * 40;
    for (const m of G.minions) if (m.type === 'cristal' && m.spawn <= 0) { c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(m.x, m.y); c.stroke(); }
    c.setLineDash([]);
  }
}
function bossVulnerableSouffle(b) { return !b.main && b.trans <= 0 || b.stun > 0; }
