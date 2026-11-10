'use strict';
/* Colosses — Affrontement : trois héros, un colosse géant, les mêmes armes pour tout le monde.
   Ce n'est plus une équipe : celui qui inflige le plus de dégâts au colosse gagne. Mourir fait perdre 15 % de ses dégâts
   (on revient 4 s plus tard). Les places libres sont prises par des rivaux pilotés par l'ordinateur ; tes amis peuvent
   les remplacer (manette ou en ligne, comme en multijoueur). Fin quand le colosse tombe, ou au bout de 3 minutes. */

const AFFRONT_DUREE = 180, AFFRONT_RETOUR = 4, AFFRONT_PERTE = .15;
const NOMS_RIVAUX = ['Braise', 'Givre'];
const RIVAL_NIV = { apprenti: { reac: .34, err: 70, tir: .8, esquive: .35 }, guerrier: { reac: .2, err: 38, tir: .92, esquive: .65 }, cauchemar: { reac: .11, err: 16, tir: 1, esquive: .9 } };
const MELEE = new Set(['epee', 'faux', 'iaido', 'marteau', 'dosLame', 'fouet', 'glaive', 'toupie', 'froleur', 'lameSpectrale', 'croissant']);
const Affront = {
  sc: new Map(),
  actif() { return G.mode === 'affront'; },
  raz() { this.sc = new Map(); },
  ajout(p, d) { if (p) this.sc.set(p, (this.sc.get(p) || 0) + d); },
  score(p) { return this.sc.get(p) || 0; },
  // tous les participants, du premier au dernier
  classement() {
    const l = [];
    const h = Coop.hote || G.p; if (h) l.push({ p: h, nom: Save.d.pseudo || T2('Toi'), col: '#8ad8ff', moi: true });
    for (const j of Coop.equipiers()) l.push({ p: j.p, nom: j.nomAff || ('J' + j.n), col: j.col, bot: j.type === 'bot' });
    for (const x of l) x.score = this.score(x.p);
    return l.sort((a, b) => b.score - a.score);
  },
  retirerRivaux() { for (const j of Coop.inscrits.filter(x => x.type === 'bot')) Coop.retirer(j); },
  prochain() {
    return Save.d.affrontProchain = Save.d.affrontProchain || { seed: R.int(1, 2e9), ars: { p: tirerArme('p'), s: tirerArme('s'), t: tirerArme('t') } };
  },
  salle() { return clamp(PR().palier * 5 + 10, 10, 30); }
};

G.lancerAffront = function () {
  const n = Affront.prochain(); delete Save.d.affrontProchain;
  this.mode = 'affront'; this.finDefi = null;
  this.defi = { type: 'affront', format: 'affront', cle: 'affront', mut: [], boss: [{ salle: Affront.salle(), seed: n.seed, mega: true, ars: n.ars }], i: 0, temps: 0, tues: 0, degats: 0, coups: 0 };
  if (!Save.d.defis.affront || Save.d.defis.affront.cle !== 'affront') Save.d.defis.affront = { cle: 'affront', best: null, essais: 0 };
  Save.d.defis.affront.essais++; Save.write();
  // les places libres : des rivaux pilotés par l'ordinateur
  Affront.retirerRivaux();
  const niv = RIVAL_NIV[Save.d.diff] || RIVAL_NIV.guerrier;
  for (let i = 0; Coop.N() < MAX_JOUEURS; i++) Coop.ajouter({ type: 'bot', nomAff: T2('Rival') + ' ' + NOMS_RIVAUX[i % 2], entree: {}, bot: Object.assign({ t: 0, cible: null, ex: 0, ey: 0, tirT: 0, specT: 2 + i, sens: i ? -1 : 1 }, niv) });
  Affront.raz();
  calcStats(); this.p = creerJoueur(DF().pv); this.ars = null;
  this.entrerSalle();
};
FORMATS.affront = { nom: 'Affrontement', ico: '⚔', obj: 'Mêmes armes pour tous, un colosse géant : celui qui lui inflige le plus de dégâts gagne', sens: 1, score: r => Math.round(Affront.score(Coop.hote || G.p)), fmt: v => (Math.round(v / 100) / 10).toString().replace('.', ',') + ' k' };

// tout le monde reçoit les mêmes armes
const _creerAff = Coop.creer.bind(Coop);
Coop.creer = function (j) { _creerAff(j); if (Affront.actif() && G.ars) j.ars = Object.assign({}, G.ars); };
// chaque dégât sur le colosse est compté pour celui qui l'inflige
const _frappeAff = G.frappe;
G.frappe = function (tg, dmg, o) {
  if (!Affront.actif() || !this.boss) return _frappeAff.apply(this, arguments);
  const b = this.boss, h0 = b.hp, qui = this.p;
  const r = _frappeAff.apply(this, arguments);
  if (b.hp < h0) Affront.ajout(qui, h0 - Math.max(0, b.hp));
  return r;
};
// pas de défaite : on tombe, on perd 15 % de ses dégâts, on revient
const _mortAff = G.mortJoueur;
G.mortJoueur = function () {
  if (!Affront.actif()) return _mortAff.apply(this, arguments);
  const p = this.p; p.hp = 0; p.ko = true; this.secoue(10); Son.play('mort');
};
const _bossMortAff = G.bossMort;
G.bossMort = function () { if (Affront.actif() && this.boss && !this.boss.mort) this.defi.temps = this.chrono; return _bossMortAff.apply(this, arguments); };
const _majAff = majCombat;
majCombat = function (dt) {
  const t0 = G.t;
  _majAff.apply(this, arguments);
  if (!Affront.actif()) return;
  try {
    const d = Math.max(0, G.t - t0);
    for (const x of Affront.classement()) {
      const p = x.p;
      if (p.ko || p.hp <= 0) {
        p.rev = 0; // pas de relève par les autres : ce sont des adversaires
        if (p.resp === undefined) {
          p.resp = AFFRONT_RETOUR; const perte = Affront.score(p) * AFFRONT_PERTE;
          Affront.sc.set(p, Affront.score(p) - perte);
          if (perte > 0) G.texte(p.x, p.y - 30, '-' + Math.round(perte) + ' (−15 %)', '#ff8a9a', 15);
        }
        p.resp -= d;
        if (p.resp <= 0) {
          p.resp = undefined; p.ko = false; p.hp = p.hpMax; p.iframe = 2;
          let pt, k = 0; do { pt = Arene.pointAuHasard(60); } while (++k < 20 && G.boss && d2(pt.x, pt.y, G.boss.x, G.boss.y) < 260 * 260);
          p.x = pt.x; p.y = pt.y; G.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 60, r1: 10, t: 0, dur: .4, col: x.col });
        }
      }
    }
    if (G.etat === 'combat' && !G.finDefi && G.chrono >= AFFRONT_DUREE) {
      G.defi.temps = G.chrono; G.terminerDefi(true); G.etat = 'mort'; G.ecranMort = true; Musique.baisser(.3);
    }
  } catch (e) { console.warn('affront', e); }
};
// fin : classement, cristaux pour le podium (6 par jour au plus)
const _finAff = G.terminerDefi;
G.terminerDefi = function (reussi) {
  const deja = !!this.finDefi;
  const r = _finAff.apply(this, arguments);
  if (deja || !Affront.actif() || !this.finDefi) return r;
  const cl = Affront.classement().map(x => ({ nom: x.nom, col: x.col, score: Math.round(x.score), moi: !!x.moi, bot: !!x.bot }));
  const place = cl.findIndex(x => x.moi) + 1, res = this.finDefi;
  res.classement = cl; res.place = place;
  const A = Save.d.affrontJour && Save.d.affrontJour.cle === cleJour() ? Save.d.affrontJour : (Save.d.affrontJour = { cle: cleJour(), n: 0 });
  let gain = place === 1 ? 2 : place === 2 && cl.length > 2 ? 1 : 0;
  gain = Math.max(0, Math.min(gain, 6 - A.n)); A.n += gain;
  if (gain) { const k = gagnerEclats(gain); if (k) res.cristauxAff = k; }
  if (place === 1) Save.d.affrontVictoires = (Save.d.affrontVictoires || 0) + 1;
  Save.write();
  return r;
};
// rejouer, recommencer : un nouvel affrontement
const _recAff = G.recommencer, _relAff = G.relancer;
G.recommencer = function () { if (Affront.actif()) return this.lancerAffront(); return _recAff.apply(this, arguments); };
G.relancer = function () { if (Affront.actif()) { this.finDefi = null; return this.lancerAffront(); } return _relAff.apply(this, arguments); };

// ---------- les rivaux : ils esquivent les zones et les balles, tournent autour du colosse et tirent ----------
function dangerPt(x, y, p) {
  let d = 0; const faux = { x, y, hr: p.hr + 7, r: p.r }, b = G.boss;
  for (const h of G.hz) {
    const Hz = HZ[h.kind]; if (!Hz || !Hz.hit || h.dead) continue;
    if (h.warn !== undefined && h.warn - h.t > 1.1) continue;
    try { if (Hz.hit(Object.assign({}, h, { boom: true, touche: false, t: Math.max(h.t, (h.warn || 0) + .02) }), faux)) d += 1; } catch (e) { }
  }
  for (const e of G.eb) { if (e.dead) continue; for (const tt of [.08, .22]) { const ex = e.x + (e.vx || 0) * tt, ey = e.y + (e.vy || 0) * tt; if (d2(ex, ey, x, y) < ((e.r || 6) + p.hr + 10) ** 2) { d += .7; break; } } }
  if (b && !b.mort && d2(x, y, b.x, b.y) < (b.r + 34) ** 2) d += 1;
  return d;
}
function majRival(j, dt) {
  const p = j.p, b = G.boss, e = j.entree, B = j.bot; e.cmd = 1;
  if (!p || !b || b.mort || G.etat !== 'combat' || p.hp <= 0 || p.ko) { e.h = e.b = e.g = e.d = e.f = e.s = e.t = false; return; }
  const id = j.ars && j.ars.p, D0 = b.r + (MELEE.has(id) ? 75 : 230);
  B.t -= dt;
  if (B.t <= 0 || !B.cible) {
    B.t = B.reac * (.8 + Math.random() * .4);
    const ici = dangerPt(p.x, p.y, p); let best = { x: p.x, y: p.y }, bs = 1e9;
    for (let k = 0; k <= 16; k++) {
      const a = k * TAU / 16, dist = k === 16 ? 0 : 80, x = p.x + Math.cos(a) * dist, y = p.y + Math.sin(a) * dist;
      if (!G.arene.dedans(x, y, p.r + 12)) continue;
      // tourner autour du colosse, à la bonne distance, loin du danger
      const ab = ang(b.x, b.y, x, y) - ang(b.x, b.y, p.x, p.y), tour = angDiff(0, ab) * B.sens;
      const s = dangerPt(x, y, p) * (ici > 0 ? 60 : 40) * B.esquive + Math.abs(Math.hypot(x - b.x, y - b.y) - D0) / 45 - tour * 2 + Math.random() * .4;
      if (s < bs) { bs = s; best = { x, y }; }
    }
    B.cible = best;
    if (Math.random() < .05) B.sens *= -1;
    e.t = ici > 0 && Math.random() < B.esquive * .5; // le talent pour sortir d'un danger
  } else e.t = false;
  const dx = B.cible.x - p.x, dy = B.cible.y - p.y;
  e.g = dx < -10; e.d = dx > 10; e.h = dy < -10; e.b = dy > 10;
  // visée : sur le colosse, avec une petite erreur qui dérive
  B.ex = B.ex * .92 + (Math.random() - .5) * B.err * .3; B.ey = B.ey * .92 + (Math.random() - .5) * B.err * .3;
  e.mx = b.x + B.ex; e.my = b.y + B.ey; e.a = null;
  // tir : en continu, ou en chargeant pour les armes à relâcher
  const w = trouveArme('p', id);
  if (id === 'tambour') { const ph = p.prim.ph || 0; e.f = (ph < .05 || ph > .95) && Math.random() < B.tir; }
  else if (w && w.manuel) { B.tirT -= dt; if (B.tirT <= 0) B.tirT = 1.05; e.f = B.tirT > .15; }
  else e.f = Math.random() < B.tir + .05;
  B.specT -= dt; e.s = false; if (B.specT <= 0) { e.s = true; B.specT = 2.2 + Math.random() * 2; }
}
const _pasAff = pasBoucle;
pasBoucle = function (now) {
  try { if (Affront.actif()) for (const j of Coop.inscrits) if (j.type === 'bot' && j.p) majRival(j, 1 / 60); } catch (e) { console.warn('rival', e); }
  return _pasAff.apply(this, arguments);
};

// ---------- affichage : tableau des dégâts en direct, écran de fin ----------
const _hudAff = dessinerHUD;
dessinerHUD = function (c) {
  _hudAff.apply(this, arguments);
  if (!Affront.actif() || !G.p) return;
  try {
    const cl = Affront.classement(), max = Math.max(1, cl[0].score), x0 = W - 262, y0 = 64;
    c.save(); c.setTransform(c.getTransform());
    c.fillStyle = 'rgba(10,8,18,.72)'; c.strokeStyle = 'rgba(255,216,107,.35)'; c.lineWidth = 1;
    c.beginPath(); c.roundRect ? c.roundRect(x0, y0, 248, 30 + cl.length * 34, 8) : c.rect(x0, y0, 248, 30 + cl.length * 34); c.fill(); c.stroke();
    c.textAlign = 'left'; c.textBaseline = 'middle';
    const reste = Math.max(0, AFFRONT_DUREE - G.chrono);
    texteOmbre(c, '⚔ ' + T2('Affrontement'), x0 + 12, y0 + 15, '#ffd86b', `800 14px ${POLICE}`, 3);
    c.textAlign = 'right'; texteOmbre(c, fmtTemps(reste), x0 + 236, y0 + 15, reste < 20 ? '#ff8a9a' : '#e6e0f0', `800 14px ${POLICE}`, 3);
    cl.forEach((x, i) => {
      const y = y0 + 34 + i * 34;
      c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(x0 + 12, y + 12, 224, 6);
      c.fillStyle = x.col; c.fillRect(x0 + 12, y + 12, 224 * x.score / max, 6);
      c.textAlign = 'left'; texteOmbre(c, (i + 1) + '. ' + x.nom + (x.p.ko ? ' ✖' : ''), x0 + 12, y + 2, x.moi ? '#fff' : x.col, `${x.moi ? 800 : 600} 14px ${POLICE}`, 3);
      c.textAlign = 'right'; texteOmbre(c, (Math.round(x.score / 100) / 10).toString().replace('.', ',') + ' k', x0 + 236, y + 2, '#e6e0f0', `700 13px ${POLICE}`, 3);
    });
    c.restore();
  } catch (e) { }
};
const _ecranAff = dessinerEcranDefi;
dessinerEcranDefi = function (c) {
  const f = G.finDefi, df = G.defi;
  if (!df || df.type !== 'affront' || !f || !f.classement) return _ecranAff.apply(this, arguments);
  c.fillStyle = 'rgba(4,2,10,.84)'; c.fillRect(0, 0, W, H);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  texteOmbre(c, T2('AFFRONTEMENT'), W / 2, 92, '#b8b0cc', `800 18px ${POLICE}`, 4);
  const titres = ['', T2('VICTOIRE !'), T2('2e place'), T2('3e place')];
  texteOmbre(c, titres[f.place] || '', W / 2, 160, f.place === 1 ? '#ffe14d' : '#e8e2f5', `900 ${f.place === 1 ? 62 : 48}px ${POLICE}`, 8);
  const coupes = ['🥇', '🥈', '🥉'];
  f.classement.forEach((x, i) => {
    const y = 250 + i * 62, l = 520;
    c.fillStyle = x.moi ? 'rgba(255,216,107,.14)' : 'rgba(255,255,255,.05)'; c.fillRect(W / 2 - l / 2, y - 24, l, 48);
    c.strokeStyle = x.moi ? 'rgba(255,216,107,.6)' : 'rgba(255,255,255,.12)'; c.strokeRect(W / 2 - l / 2 + .5, y - 23.5, l - 1, 47);
    c.textAlign = 'left'; c.font = `26px ${POLICE}`; c.fillStyle = '#fff'; c.fillText(coupes[i] || '', W / 2 - l / 2 + 14, y + 1);
    texteOmbre(c, x.nom, W / 2 - l / 2 + 58, y, x.col, `800 22px ${POLICE}`, 4);
    c.textAlign = 'right'; texteOmbre(c, x.score.toLocaleString('fr-FR') + ' ' + T2('dégâts'), W / 2 + l / 2 - 16, y, '#e8e2f5', `700 20px ${POLICE}`, 4);
  });
  c.textAlign = 'center';
  let y = 250 + f.classement.length * 62 + 16;
  if (f.cristauxAff) { texteOmbre(c, '+' + f.cristauxAff + ' ' + T2('cristaux'), W / 2, y, '#bfefff', `800 20px ${POLICE}`, 4); y += 34; }
  c.font = `15px ${POLICE}`; c.fillStyle = '#9a94ad'; c.fillText(FORMATS.affront.obj, W / 2, y + 6);
  const k = .6 + .4 * Math.sin(G.t * 4);
  c.globalAlpha = k; texteOmbre(c, T2('ESPACE — revanche'), W / 2, 640, '#fff', `800 24px ${POLICE}`, 5); c.globalAlpha = 1;
  c.font = `14px ${POLICE}`; c.fillStyle = '#9a94ad'; c.fillText(T2('Échap — menu'), W / 2, 678);
};

// ---------- au menu : une tuile Affrontement, et les rivaux s'en vont ----------
MODES_MENU.affront = () => 'affront';
const _menuAff = UI.menu;
UI.menu = function () {
  try { Affront.retirerRivaux(); } catch (e) { }
  const r = _menuAff.apply(this, arguments);
  try {
    const g = this.el.querySelector('.accueil .defis2');
    if (g && !g.querySelector('[data-a=affront]')) {
      const v = Save.d.affrontVictoires || 0, b = document.createElement('button');
      b.className = 'defi2 d-affront'; b.dataset.a = 'affront'; b.title = FORMATS.affront.obj;
      b.innerHTML = `<span class="di">⚔</span><span class="dtx"><b>${T2('Affrontement')}</b><span class="dm">${T2('3 héros, mêmes armes : le plus de dégâts gagne')}</span></span><span class="dr">${v ? '🏆<small>' + v + ' ' + T2(v > 1 ? 'victoires' : 'victoire') + '</small>' : '—'}</span>`;
      b.addEventListener('click', ev => { ev.stopPropagation(); Son.init(); Son.play('clic'); UI.action('affront', b); });
      const surv = g.querySelector('[data-a=survie]'); if (surv) surv.after(b); else g.appendChild(b);
      try { if (typeof iconiser === 'function') iconiser(b); } catch (e) { }
      majSelection();
    }
  } catch (e) { console.warn('affront menu', e); }
  return r;
};
const _actAff = UI.action;
UI.action = function (a, btn) {
  if (a === 'affront' && G.etat === 'menu' && selMenu() === 'affront') { this.cacher(); G.lancerAffront(); return; }
  return _actAff.call(this, a, btn);
};
