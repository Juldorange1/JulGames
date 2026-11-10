'use strict';
/* Colosses — Affrontement en ligne, entre vrais joueurs uniquement (2 ou 3, au choix sur la tuile).
   • Salle d'attente : le jeu cherche des joueurs dont le classement est proche du tien, ou tu invites tes amis.
     Le combat commence dès que la salle est pleine.
   • Un colosse géant, les mêmes armes pour tous : celui qui lui inflige le plus de dégâts gagne. Mourir fait perdre
     15 % de ses dégâts (on revient 4 s plus tard). Fin quand le colosse tombe, ou au bout de 3 minutes.
   • Classement : gagner rapporte des points, perdre en fait perdre un peu (moins qu'une victoire n'en donne).
     Les parties entre amis (salle privée) ne comptent pas.
   • Amis : on s'ajoute en un clic après une partie (ou avec le code joueur), on voit qui est en ligne et on s'invite.
   Pas de serveur : les joueurs se trouvent avec PeerJS (comme le multijoueur), l'hôte fait tourner la partie. */

const AFFRONT_DUREE = 180, AFFRONT_RETOUR = 4, AFFRONT_PERTE = .15, PAS_CLASSEMENT = 150;
const PREF_AFF = 'colosses-aff1-', PREF_PRIVE = 'colosses-affp-', PREF_BOITE = 'colosses-amij-';
function profilAff() {
  const d = Save.d;
  if (!d.idJ) { let s = ''; for (let i = 0; i < 10; i++) s += 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]; d.idJ = s; Save.write(); }
  return d.affront2 = d.affront2 || { pts: 1000, v: 0, dft: 0, n: 2, vus: {} };
}
const nomJoueur = () => (Save.d.pseudo || '').trim() || T2('Joueur');
const propre = s => String(s || '').replace(/[<>&"']/g, '').slice(0, 16);
function amisJ() { return Save.d.amisJ = Save.d.amisJ || []; }
const pauseAff = ms => new Promise(r => setTimeout(r, ms));

// ---------- la partie ----------
const Affront = {
  sc: new Map(),
  actif() { return G.mode === 'affront'; },
  raz() { this.sc = new Map(); },
  ajout(p, d) { if (p) this.sc.set(p, (this.sc.get(p) || 0) + d); },
  score(p) { return this.sc.get(p) || 0; },
  classement() {
    const l = [], P = profilAff(), h = Coop.hote || G.p;
    if (h) l.push({ p: h, nom: nomJoueur(), col: '#8ad8ff', moi: true, idJ: Save.d.idJ, pts: P.pts });
    for (const j of Coop.equipiers()) l.push({ p: j.p, nom: j.nomAff || ('J' + j.n), col: j.col, idJ: j.idJ, pts: j.pts });
    for (const x of l) x.score = this.score(x.p);
    return l.sort((a, b) => b.score - a.score);
  },
  prochain() { return Save.d.affrontProchain = Save.d.affrontProchain || { seed: R.int(1, 2e9), ars: { p: tirerArme('p'), s: tirerArme('s'), t: tirerArme('t') } }; },
  salle() { return clamp(PR().palier * 5 + 10, 10, 30); }
};
// points de classement : chacun gagne contre ceux qu'il devance et perd contre ceux qui le devancent (Elo) ;
// une défaite coûte 30 % de moins qu'une victoire ne rapporte
function deltasClassement(cl) {
  const R = cl.filter(x => typeof x.pts === 'number' && x.idJ);
  for (const a of R) {
    let s = 0; for (const b of R) if (a !== b) { const E = 1 / (1 + Math.pow(10, (b.pts - a.pts) / 400)), S = a.score > b.score ? 1 : a.score < b.score ? 0 : .5; s += S - E; }
    let d = 32 * s / Math.max(1, R.length - 1); if (d < 0) d *= .7; a.delta = Math.round(d);
  }
}
G.lancerAffront = function () {
  if (Coop.N() < 2) return UI.salleAff();
  const n = Affront.prochain(); delete Save.d.affrontProchain;
  this.mode = 'affront'; this.finDefi = null;
  this.defi = { type: 'affront', format: 'affront', cle: 'affront', mut: [], boss: [{ salle: Affront.salle(), seed: n.seed, mega: true, ars: n.ars }], i: 0, temps: 0, tues: 0, degats: 0, coups: 0 };
  if (!Save.d.defis.affront || Save.d.defis.affront.cle !== 'affront') Save.d.defis.affront = { cle: 'affront', best: null, essais: 0 };
  Save.d.defis.affront.essais++; Save.write();
  Affront.raz(); Salon.resultat = null; Salon.depart = 0; Salon.partis = [];
  UI.salleOuverte = false; UI.cacher(); calcStats(); this.p = creerJoueur(DF().pv); this.ars = null;
  this.entrerSalle();
};
FORMATS.affront = { nom: 'Affrontement', ico: '⚔', obj: 'Mêmes armes pour tous, un colosse géant : celui qui lui inflige le plus de dégâts gagne', sens: 1, score: r => Math.round(Affront.score(Coop.hote || G.p)), fmt: v => (Math.round(v / 100) / 10).toString().replace('.', ',') + ' k' };

const _creerAff = Coop.creer.bind(Coop);
Coop.creer = function (j) { _creerAff(j); if (Affront.actif() && G.ars) j.ars = Object.assign({}, G.ars); };
const _frappeAff = G.frappe;
G.frappe = function (tg, dmg, o) {
  if (!Affront.actif() || !this.boss) return _frappeAff.apply(this, arguments);
  const b = this.boss, h0 = b.hp, qui = this.p;
  const r = _frappeAff.apply(this, arguments);
  if (b.hp < h0) Affront.ajout(qui, h0 - Math.max(0, b.hp));
  return r;
};
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
      if (!(p.ko || p.hp <= 0)) continue;
      p.rev = 0; // personne ne relève personne : ce sont des adversaires
      if (p.resp === undefined) { p.resp = AFFRONT_RETOUR; const perte = Affront.score(p) * AFFRONT_PERTE; Affront.sc.set(p, Affront.score(p) - perte); if (perte > 0) G.texte(p.x, p.y - 30, '-' + Math.round(perte) + ' (−15 %)', '#ff8a9a', 15); }
      p.resp -= d;
      if (p.resp <= 0) {
        p.resp = undefined; p.ko = false; p.hp = p.hpMax; p.iframe = 2;
        let pt, k = 0; do { pt = Arene.pointAuHasard(60); } while (++k < 20 && G.boss && d2(pt.x, pt.y, G.boss.x, G.boss.y) < 260 * 260);
        p.x = pt.x; p.y = pt.y; G.fx.push({ kind: 'anneau', x: p.x, y: p.y, r0: 60, r1: 10, t: 0, dur: .4, col: x.col });
      }
    }
    // tout le monde est parti : la partie s'arrête (les absents ont perdu)
    const fini = G.chrono >= AFFRONT_DUREE || (Coop.N() < 2 && G.chrono > 1);
    if (G.etat === 'combat' && !G.finDefi && fini) { G.defi.temps = G.chrono; G.terminerDefi(true); G.etat = 'mort'; G.ecranMort = true; Musique.baisser(.8); }
  } catch (e) { console.warn('affront', e); }
};
// fin : classement, points (sauf entre amis), résultats envoyés aux autres joueurs
const _finAff = G.terminerDefi;
G.terminerDefi = function (reussi) {
  const deja = !!this.finDefi;
  const r = _finAff.apply(this, arguments);
  if (deja || !Affront.actif() || !this.finDefi) return r;
  const cl = Affront.classement().map(x => ({ nom: x.nom, col: x.col, score: Math.round(x.score), moi: !!x.moi, idJ: x.idJ, pts: x.pts }));
  for (const q of Salon.partis) cl.push({ nom: q.nom, col: '#888', score: 0, idJ: q.idJ, pts: q.pts, parti: true });
  const classe = !Salon.prive; if (classe) deltasClassement(cl);
  const res = this.finDefi, P = profilAff(), moi = cl.find(x => x.moi);
  res.classement = cl; res.place = cl.indexOf(moi) + 1; res.classe = classe;
  const id = Save.d.idJ + ':' + Date.now();
  if (classe && moi) { P.pts = Math.max(0, P.pts + (moi.delta || 0)); if (res.place === 1) P.v++; else P.dft++; P.vus[id] = 1; }
  Salon.resultat = { id, cl: cl.map(x => ({ nom: x.nom, col: x.col, score: x.score, idJ: x.idJ, delta: x.delta || 0, parti: !!x.parti })), classe };
  Save.write();
  return r;
};
const _recAff = G.recommencer, _relAff = G.relancer;
G.recommencer = function () { if (Affront.actif()) return Coop.N() >= 2 ? this.lancerAffront() : UI.salleAff(); return _recAff.apply(this, arguments); };
G.relancer = function () { if (Affront.actif()) { this.finDefi = null; return this.recommencer(); } return _relAff.apply(this, arguments); };

// ---------- la salle d'attente ----------
const Salon = {
  etat: null, prive: false, n: 2, b: 0, sonde: null, t0: 0, depart: 0, msg: '', partis: [], resultat: null, flux: null,
  idSalle(n, b, k) { return PREF_AFF + 'n' + n + '-b' + b + '-' + k; },
  tranche() { return Math.floor(profilAff().pts / PAS_CLASSEMENT); },
  meta() { const P = profilAff(); return { nom: nomJoueur(), pts: P.pts, idJ: Save.d.idJ, aff: this.n }; },
  async peer(id) {
    await Reseau.charger();
    return new Promise(ok => {
      const p = id ? new Peer(id) : new Peer(); let fait = false;
      p.on('open', () => { if (!fait) { fait = true; ok(p); } });
      p.on('error', () => { if (!fait) { fait = true; try { p.destroy(); } catch (x) { } ok(null); } });
      setTimeout(() => { if (!fait) { fait = true; try { p.destroy(); } catch (x) { } ok(null); } }, 9000);
    });
  },
  // essaie d'entrer dans une salle : 'rejoint', 'plein', 'absent' ou 'erreur'
  sonder(id) {
    return new Promise(ok => {
      const peer = this.sonde; if (!peer || peer.destroyed) return ok('erreur');
      let fini = false; const fin = r => { if (fini) return; fini = true; try { peer.off('error', err); } catch (e) { } ok(r); };
      const err = e => { if (e && e.type === 'peer-unavailable' && String(e.message || '').includes(id)) fin('absent'); };
      peer.on('error', err);
      const conn = peer.connect(id, { metadata: this.meta(), reliable: true });
      conn.on('data', d => {
        if (d.t === 'plein') { fin('plein'); try { conn.close(); } catch (e) { } }
        else if (d.t === 'info' && !fini) { fin('rejoint'); this.devenirInvite(peer, conn, d); }
      });
      setTimeout(() => { if (!fini) { fin('erreur'); try { conn.close(); } catch (e) { } } }, 7000);
    });
  },
  devenirInvite(peer, conn, d) {
    if (Reseau.role === 'hote') Reseau.fermer();
    this.etat = 'invite'; UI.salleOuverte = false;
    Reseau.role = 'invite'; Reseau.peer = peer; Reseau.conn = conn; Reseau.info = d; Reseau.code = '';
    Reseau.ecranInvite(T2('Salle trouvée !'));
    if (this.flux) this.brancherFlux(this.flux);
    conn.on('data', x => { if (x.t === 'info') { Reseau.info = x; Reseau.majInvite(); } });
    conn.on('close', () => Reseau.echec(T2('La partie est terminée : la salle a été fermée.')));
    setInterval(() => { if (conn.open) { try { conn.send(Reseau.entreeInvite()); } catch (e) { } } }, 33);
    Reseau.majInvite();
  },
  brancherFlux(st) { const v = Reseau.video; if (!v) { this.flux = st; return; } v.srcObject = st; const p = v.play(); if (p && p.catch) p.catch(() => { v.muted = true; v.play(); }); },
  async nouvelleSonde() {
    if (this.sonde && !this.sonde.destroyed) return this.sonde;
    const p = this.sonde = await this.peer(null);
    if (p) p.on('call', call => { call.answer(); call.on('stream', st => this.brancherFlux(st)); });
    return p;
  },
  async heberger(id, k) {
    const p = await this.peer(id); if (!p) return false;
    if (this.etat !== 'recherche' && this.etat !== 'prive-cree') { p.destroy(); return false; }
    Reseau.peer = p; Reseau.role = 'hote'; Reseau.code = null; Reseau.msg = '';
    p.on('connection', conn => Reseau.arrivee(conn));
    clearInterval(Reseau.infoT); Reseau.infoT = setInterval(() => Reseau.annoncer(), 400);
    this.etat = 'hote'; this.idHote = id; this.kHote = k || 0; this.tHote = Date.now();
    return true;
  },
  // recherche : d'abord des joueurs de ta tranche de classement, puis les tranches voisines
  async chercher() {
    this.fermer(); this.n = profilAff().n || 2; this.prive = false; this.etat = 'recherche'; this.t0 = Date.now(); this.msg = ''; this.partis = [];
    const b0 = this.b = this.tranche(), jeton = this.jeton = {};
    if (!(await this.nouvelleSonde())) { this.msg = T2('Connexion impossible : vérifie Internet.'); this.etat = null; return; }
    for (let tour = 0; this.etat === 'recherche' && this.jeton === jeton && tour < 40; tour++) {
      const tr = tour === 0 ? [b0] : [b0, b0 - 1, b0 + 1];
      for (const b of tr) for (let k = 0; k < 5 && this.etat === 'recherche' && this.jeton === jeton; k++) {
        const r = await this.sonder(this.idSalle(this.n, b, k));
        if (r === 'rejoint') return;
        if (r === 'absent' && b === b0 && this.etat === 'recherche' && this.jeton === jeton) { if (await this.heberger(this.idSalle(this.n, b0, k), k)) return; }
      }
      await pauseAff(2500);
    }
  },
  // l'hôte qui attend seul va voir s'il y a une salle qui attend dans la tranche juste en dessous
  // (ainsi deux salles de tranches voisines finissent toujours par se rejoindre)
  async veille() {
    if (this.etat !== 'hote' || this.prive || this.veilleEnCours || Coop.N() > 1 || Date.now() - this.tHote < 4000 || G.etat !== 'menu') return;
    this.veilleEnCours = true; this.refus = true;
    try {
      await this.nouvelleSonde();
      // d'abord les salles plus anciennes de la même tranche (numéro plus petit), puis la tranche juste en dessous
      for (let k = 0; k < (this.kHote || 0) && Coop.N() === 1 && this.etat === 'hote'; k++) if (await this.sonder(this.idSalle(this.n, this.b, k)) === 'rejoint') return;
      for (let k = 0; k < 5 && Coop.N() === 1 && this.etat === 'hote'; k++) if (await this.sonder(this.idSalle(this.n, this.b - 1, k)) === 'rejoint') return;
      this.tHote = Date.now();
    } finally { this.veilleEnCours = false; this.refus = false; }
  },
  // salle privée : seuls tes amis invités entrent, et la partie ne compte pas pour le classement
  async creerPrivee() {
    if (this.etat === 'hote' && this.prive) return true;
    this.fermer(); this.prive = true; this.n = profilAff().n || 2; this.etat = 'prive-cree'; this.t0 = Date.now(); this.partis = [];
    const ok = await this.heberger(PREF_PRIVE + Save.d.idJ);
    if (!ok) { this.etat = null; this.msg = T2('Impossible de créer la salle privée pour le moment.'); }
    return ok;
  },
  async rejoindrePrive(id) {
    this.fermer(); this.etat = 'recherche'; this.prive = true; this.jeton = {};
    if (!(await this.nouvelleSonde())) { this.etat = null; return UI.salleAff(T2('Connexion impossible : vérifie Internet.')); }
    const r = await this.sonder(id);
    if (r !== 'rejoint') { this.etat = null; UI.salleAff(r === 'plein' ? T2('La salle de ton ami est pleine ou la partie a commencé.') : T2('La salle de ton ami n\'existe plus.')); }
  },
  fermer() {
    this.jeton = null;
    if (Reseau.role === 'hote') Reseau.fermer();
    this.etat = null; this.depart = 0;
  },
  // ce que voient les invités pendant l'attente et après la partie
  pourInvite() {
    const l = [{ nom: nomJoueur(), pts: profilAff().pts, idJ: Save.d.idJ }].concat(Coop.inscrits.map(j => ({ nom: j.nomAff || 'J' + j.n, pts: j.pts, idJ: j.idJ })));
    return { n: this.n, prive: this.prive, joueurs: l, depart: this.depart ? Math.max(0, Math.ceil((this.depart - Date.now()) / 1000)) : 0, fin: G.mode === 'affront' && G.finDefi ? this.resultat : null };
  },
  // côté hôte, toutes les 0,5 s : lancer quand la salle est pleine
  tic() {
    if (this.etat !== 'hote') return;
    this.veille();
    if (G.etat === 'menu' && UI.salleOuverte) {
      if (Coop.N() >= this.n) { if (!this.depart) this.depart = Date.now() + 3500; else if (Date.now() >= this.depart) { this.depart = 0; G.lancerAffront(); return; } }
      else this.depart = 0;
    }
    if (UI.salleOuverte) UI.majSalle();
  }
};
setInterval(() => { try { Salon.tic(); } catch (e) { console.warn('salon', e); } }, 500);
// l'hôte : refuser quand c'est plein ou que la partie a commencé, et retenir le classement de chacun
const _arriveeAff = Reseau.arrivee.bind(Reseau);
Reseau.arrivee = function (conn) {
  const m = conn.metadata || {};
  if (Salon.etat === 'hote' || m.aff) {
    const refuse = Salon.etat !== 'hote' || Salon.refus || G.etat !== 'menu' || Coop.N() >= Salon.n || (m.aff && m.aff !== Salon.n);
    if (refuse) { conn.on('open', () => { try { conn.send({ t: 'plein' }); } catch (e) { } setTimeout(() => conn.close(), 400); }); return; }
  }
  _arriveeAff(conn);
  conn.on('open', () => {
    const j = Coop.inscrits.find(x => x.conn === conn); if (!j) return;
    j.nomAff = propre(m.nom) || 'Ami'; j.pts = Math.max(0, Math.min(5000, +m.pts || 1000)); j.idJ = String(m.idJ || '').replace(/[^a-z0-9]/g, '').slice(0, 12);
    if (UI.salleOuverte) UI.majSalle();
  });
  conn.on('close', () => { const j = Coop.inscrits.find(x => x.conn === conn) || null; if (G.mode === 'affront' && G.etat === 'combat' && m.idJ) Salon.partis.push({ nom: propre(m.nom) || 'Ami', idJ: String(m.idJ).replace(/[^a-z0-9]/g, '').slice(0, 12), pts: +m.pts || 1000 }); });
};
// les invités voient la salle d'attente, puis leur résultat (et peuvent ajouter les autres en amis)
const _majInvAff = Reseau.majInvite.bind(Reseau);
Reseau.majInvite = function () {
  _majInvAff();
  const i = this.info, d = document.getElementById('invite'); if (!i || !d || !i.aff) return;
  const A = i.aff, m = d.querySelector('.inv-msg');
  let box = d.querySelector('.inv-aff'); if (!box) { box = document.createElement('div'); box.className = 'inv-aff'; d.appendChild(box); }
  if (i.etat === 'menu') {
    m.style.display = 'block';
    m.textContent = (A.depart ? T2('La partie commence dans') + ' ' + A.depart + ' s' : T2('Salle d\'attente') + ' : ' + A.joueurs.length + ' / ' + A.n + ' ' + T2('joueurs')) + ' — ' + A.joueurs.map(x => propre(x.nom) + (x.pts !== undefined && !A.prive ? ' (' + x.pts + ')' : '')).join(' · ');
  }
  if (A.fin && A.fin.id) {
    const P = profilAff(), moi = A.fin.cl.find(x => x.idJ === Save.d.idJ);
    if (A.fin.classe && moi && !P.vus[A.fin.id]) { P.vus[A.fin.id] = 1; P.pts = Math.max(0, P.pts + (moi.delta || 0)); if (A.fin.cl[0] === moi) P.v++; else P.dft++; Save.write(); }
    if (box.dataset.id !== A.fin.id) {
      box.dataset.id = A.fin.id;
      box.innerHTML = `<b>${T2('Résultat')}</b>` + A.fin.cl.map((x, k) => `<div>${k + 1}. <span style="color:${String(x.col).replace(/[^#a-z0-9]/gi, '')}">${propre(x.nom)}</span> · ${+x.score || 0} ${A.fin.classe ? `· <b class="${x.delta >= 0 ? 'plus' : 'moins'}">${x.delta >= 0 ? '+' : ''}${+x.delta || 0} pts</b>` : ''} ${x.idJ && x.idJ !== Save.d.idJ && !amisJ().some(a => a.idJ === x.idJ) ? `<button data-ami="${propre(x.idJ)}" data-nom="${propre(x.nom)}">＋ ${T2('Ami')}</button>` : ''}</div>`).join('') + `<div class="mini">${htmlRang(P.pts)} · ${P.pts} pts</div>`;
      box.querySelectorAll('[data-ami]').forEach(b => b.addEventListener('click', () => { Boite.ajouterAmi({ idJ: b.dataset.ami, nom: b.dataset.nom }); b.remove(); }));
    }
    box.style.display = 'block';
  } else box.style.display = 'none';
};

// ---------- boîte aux lettres : les amis s'invitent et s'ajoutent quand leur jeu est ouvert ----------
const Boite = {
  peer: null, enCours: false, enLigne: {},
  async ouvrir() {
    if (this.peer || this.enCours || Reseau.role === 'invite') return;
    this.enCours = true; profilAff();
    const p = await Salon.peer(PREF_BOITE + Save.d.idJ); this.enCours = false;
    if (!p) return; this.peer = p;
    p.on('connection', conn => conn.on('data', d => this.recu(d, conn)));
  },
  recu(d, conn) {
    if (!d || !d.de) return;
    const de = { idJ: String(d.de.idJ || '').replace(/[^a-z0-9]/g, '').slice(0, 12), nom: propre(d.de.nom) || 'Ami', pts: Math.max(0, Math.min(5000, +d.de.pts || 1000)) };
    if (!de.idJ) return;
    if (d.t === 'ping') { try { conn.send({ t: 'pong' }); } catch (e) { } return; }
    if (d.t === 'ami') { this.memoriser(de); avis(de.nom + ' ' + T2('t\'a ajouté en ami.')); }
    if (d.t === 'invit' && typeof d.salle === 'string' && d.salle === PREF_PRIVE + de.idJ) {
      avis('⚔ ' + de.nom + ' ' + T2('t\'invite à un Affrontement'), [[T2('Rejoindre'), () => { UI.cacher(); Salon.rejoindrePrive(d.salle); }], [T2('Non merci'), () => { }]]);
    }
    setTimeout(() => { try { conn.close(); } catch (e) { } }, 800);
  },
  memoriser(o) { const l = amisJ(), i = l.findIndex(x => x.idJ === o.idJ); const e = { idJ: o.idJ, nom: propre(o.nom) || 'Ami', pts: o.pts || (i >= 0 ? l[i].pts : 1000) }; if (i >= 0) l[i] = e; else l.push(e); if (l.length > 40) l.shift(); Save.write(); },
  // envoie un message à la boîte d'un ami ; renvoie vrai s'il est en ligne
  async envoyer(idJ, msg) {
    const p = await Salon.nouvelleSonde(); if (!p) return false;
    return new Promise(ok => {
      let fini = false; const id = PREF_BOITE + idJ, fin = r => { if (!fini) { fini = true; try { p.off('error', err); } catch (e) { } ok(r); } };
      const err = e => { if (e && e.type === 'peer-unavailable' && String(e.message || '').includes(id)) fin(false); };
      p.on('error', err);
      const c = p.connect(id, { reliable: true });
      c.on('open', () => { try { c.send(Object.assign({ de: { idJ: Save.d.idJ, nom: nomJoueur(), pts: profilAff().pts } }, msg)); } catch (e) { } setTimeout(() => { try { c.close(); } catch (e) { } }, 1500); fin(true); });
      setTimeout(() => fin(false), 6000);
    });
  },
  async ajouterAmi(o) { this.memoriser(o); const ok = await this.envoyer(o.idJ, { t: 'ami' }); if (UI.salleOuverte) UI.majSalle(); return ok; },
  async verifier() { for (const a of amisJ().slice(0, 12)) { this.enLigne[a.idJ] = await this.envoyer(a.idJ, { t: 'ping' }); if (UI.salleOuverte) UI.majSalle(); } }
};
// un petit avis en bas de l'écran (invitation, ami ajouté)
function avis(txt, boutons) {
  const d = document.createElement('div'); d.className = 'avis-aff';
  const s = document.createElement('span'); s.textContent = txt; d.appendChild(s);
  for (const [t, f] of boutons || []) { const b = document.createElement('button'); b.textContent = t; b.addEventListener('click', () => { d.remove(); f(); }); d.appendChild(b); }
  document.body.appendChild(d); setTimeout(() => d.remove(), boutons ? 30000 : 5000);
}
// les amis peuvent t'inviter dès que le jeu est ouvert (si tu as déjà des amis ou joué en Affrontement)
setTimeout(() => { try { if (amisJ().length || (Save.d.affront2 && (Save.d.affront2.v + Save.d.affront2.dft) > 0)) Boite.ouvrir(); } catch (e) { } }, 3000);

// ---------- l'écran de la salle d'attente ----------
UI.salleAff = function (msg) {
  G.etat = 'menu'; G.mode = 'normal';
  const P = profilAff();
  if (msg) Salon.msg = msg;
  this.retour = () => { Salon.fermer(); UI.salleOuverte = false; UI.menu(); };
  this.montrer(`<div class="panneau court salle-aff"><div class="barre-titre"><button class="rond" data-a="salleQuitter" data-echap title="Retour">←</button><h2>⚔ ${T2('Affrontement')}</h2></div>
    <div class="af-haut"><div class="af-nb">${[2, 3].map(n => `<button data-a="salleN" data-n="${n}" class="${P.n === n ? 'actif' : ''}">${n} ${T2('joueurs')}</button>`).join('')}</div>
      <div class="af-rang">${htmlRang(P.pts)} <small>${P.pts} pts · ${P.v} V · ${P.dft} D · ${saisonAff().nom}</small></div></div>
    <div id="af-etat" class="af-etat"></div>
    <ul id="af-joueurs" class="joueurs"></ul>
    <div class="bloc"><h3>${T2('Tes amis')}</h3><div id="af-amis"></div>
      <div class="rang af-ajout"><input id="af-code" maxlength="12" autocomplete="off" placeholder="${T2('Code joueur d\'un ami')}"><button data-a="salleAjout">＋ ${T2('Ajouter')}</button></div>
      <p class="mini">${T2('Ton code joueur')} : <b class="af-moncode">${Save.d.idJ}</b> <button class="petit" data-a="salleCopier">${T2('Copier')}</button> · ${T2('Ton pseudo')} : <input id="af-pseudo" maxlength="16" value="${(Save.d.pseudo || '').replace(/"/g, '')}" placeholder="${T2('Pseudo')}"></p></div>
    <div class="rang"><button data-a="salleChercher">🔎 ${T2('Chercher des adversaires')}</button><button data-a="salleQuitter">${T2('Annuler')}</button></div>
    <p class="mini">${T2('Les adversaires ont un classement proche du tien. Gagner rapporte des points, perdre en fait perdre un peu. Les parties avec des amis invités ne comptent pas.')}</p></div>`);
  this.salleOuverte = true;
  const ps = this.el.querySelector('#af-pseudo'); if (ps) ps.addEventListener('change', () => { Save.d.pseudo = propre(ps.value); Save.write(); });
  this.majSalle();
  if (!Salon.etat && !msg) Salon.chercher().then(() => this.majSalle());
  Boite.ouvrir(); Boite.verifier();
};
UI.majSalle = function () {
  if (!this.salleOuverte || !this.el) return;
  const e = this.el.querySelector('#af-etat'), l = this.el.querySelector('#af-joueurs'), a = this.el.querySelector('#af-amis'); if (!e || !l) return;
  const s = Salon, t = Math.floor((Date.now() - s.t0) / 1000), P = profilAff();
  let txt = s.msg || '';
  if (s.depart) txt = '⚔ ' + T2('Salle pleine ! La partie commence dans') + ' ' + Math.max(0, Math.ceil((s.depart - Date.now()) / 1000)) + ' s';
  else if (s.etat === 'recherche' || (s.etat === 'hote' && !s.prive)) txt = '🔎 ' + T2('Recherche de joueurs proches de ton classement') + ` (${Math.max(0, s.b * PAS_CLASSEMENT)}–${(s.b + 1) * PAS_CLASSEMENT} pts) · ${fmtTemps(t)}` + (s.msg ? ' — ' + s.msg : '');
  else if (s.etat === 'hote' && s.prive) txt = '🔒 ' + T2('Salle privée : en attente de tes amis invités (la partie ne compte pas pour le classement)') + (s.msg ? ' — ' + s.msg : '');
  e.textContent = txt;
  const J = [`<li><b>J1</b> <span>${propre(nomJoueur())}${s.prive ? '' : ' (' + P.pts + ')'}</span></li>`].concat(Coop.inscrits.map(j => `<li><b style="color:${j.col}">J${j.n}</b> <span>${j.type === 'manette' ? '🎮 ' + T2('Manette') : propre(j.nomAff || 'Ami') + (j.pts && !s.prive ? ' (' + j.pts + ')' : '')}</span>${j.idJ && !amisJ().some(x => x.idJ === j.idJ) ? `<button class="petit" data-a="salleAmi" data-id="${j.idJ}" data-nom="${propre(j.nomAff)}">＋ ${T2('Ami')}</button>` : ''}</li>`));
  while (J.length < s.n) J.push(`<li class="vide"><b>J${J.length + 1}</b> <span>${T2('En attente d\'un joueur…')}</span></li>`);
  l.innerHTML = J.join('');
  if (a) a.innerHTML = amisJ().length ? amisJ().map(x => `<div class="af-ami"><span>${propre(x.nom)}</span><small class="${Boite.enLigne[x.idJ] ? 'en' : ''}">${Boite.enLigne[x.idJ] === undefined ? '…' : Boite.enLigne[x.idJ] ? T2('en ligne') : T2('hors ligne')}</small><button class="petit" data-a="salleInviter" data-id="${x.idJ}" ${Boite.enLigne[x.idJ] === false ? 'disabled' : ''}>${T2('Inviter')}</button></div>`).join('') : `<p class="mini">${T2('Pas encore d\'amis : ajoute les joueurs après une partie, ou avec leur code joueur.')}</p>`;
  const lier = r => r.querySelectorAll('[data-a]').forEach(b => { if (b._lie) return; b._lie = true; b.addEventListener('click', ev => { ev.stopPropagation(); Son.init(); Son.play('clic'); UI.action(b.dataset.a, b); }); });
  lier(l); if (a) lier(a);
};
const _actSalle = UI.action;
UI.action = function (a, btn) {
  switch (a) {
    case 'affront': if (G.etat === 'menu' && selMenu() === 'affront') { this.salleAff(); return; } break;
    case 'salleQuitter': Salon.fermer(); this.salleOuverte = false; return this.menu();
    case 'salleN': { const P = profilAff(); P.n = +btn.dataset.n; Save.write(); Salon.n = P.n; if (!(Salon.prive && Salon.etat === 'hote')) { Salon.fermer(); Salon.msg = ''; } this.salleAff(); return; }
    case 'salleChercher': Salon.fermer(); Salon.msg = ''; this.salleAff(); return;
    case 'salleCopier': { try { navigator.clipboard.writeText(Save.d.idJ); } catch (e) { } btn.textContent = '✔'; return; }
    case 'salleAjout': { const i = this.el.querySelector('#af-code'), c = String(i && i.value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''); if (c.length < 6 || c === Save.d.idJ) { Salon.msg = T2('Ce code joueur n\'est pas valide.'); return this.majSalle(); } Boite.ajouterAmi({ idJ: c, nom: T2('Ami') + ' ' + c.slice(0, 4) }).then(ok => { Salon.msg = ok ? T2('Ami ajouté : il te voit aussi dans sa liste.') : T2('Ami ajouté. Il te verra quand son jeu sera ouvert.'); this.majSalle(); }); return; }
    case 'salleAmi': Boite.ajouterAmi({ idJ: btn.dataset.id, nom: btn.dataset.nom }); btn.remove(); return;
    case 'salleInviter': {
      const id = btn.dataset.id; btn.disabled = true; btn.textContent = '…';
      Salon.creerPrivee().then(async ok => {
        if (!ok) return this.majSalle();
        const en = await Boite.envoyer(id, { t: 'invit', salle: PREF_PRIVE + Save.d.idJ });
        Salon.msg = en ? T2('Invitation envoyée : la partie commence dès que la salle est pleine.') : T2('Ton ami n\'est pas en ligne (son jeu doit être ouvert).');
        this.salleAff();
      });
      return;
    }
  }
  return _actSalle.call(this, a, btn);
};

// ---------- affichage pendant et après la partie ----------
const _hudAff = dessinerHUD;
dessinerHUD = function (c) {
  _hudAff.apply(this, arguments);
  if (!Affront.actif() || !G.p) return;
  try {
    const cl = Affront.classement(), max = Math.max(1, cl[0].score), x0 = W - 262, y0 = 64;
    c.save();
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
  texteOmbre(c, T2('AFFRONTEMENT') + (f.classe ? '' : ' · ' + T2('entre amis')), W / 2, 92, '#b8b0cc', `800 18px ${POLICE}`, 4);
  const titres = ['', T2('VICTOIRE !'), T2('2e place'), T2('3e place')];
  texteOmbre(c, titres[f.place] || '', W / 2, 160, f.place === 1 ? '#ffe14d' : '#e8e2f5', `900 ${f.place === 1 ? 62 : 48}px ${POLICE}`, 8);
  const coupes = ['🥇', '🥈', '🥉'];
  f.classement.forEach((x, i) => {
    const y = 250 + i * 62, l = 600;
    c.fillStyle = x.moi ? 'rgba(255,216,107,.14)' : 'rgba(255,255,255,.05)'; c.fillRect(W / 2 - l / 2, y - 24, l, 48);
    c.strokeStyle = x.moi ? 'rgba(255,216,107,.6)' : 'rgba(255,255,255,.12)'; c.strokeRect(W / 2 - l / 2 + .5, y - 23.5, l - 1, 47);
    c.textAlign = 'left'; c.font = `26px ${POLICE}`; c.fillStyle = '#fff'; c.fillText(coupes[i] || '', W / 2 - l / 2 + 14, y + 1);
    texteOmbre(c, x.nom + (x.parti ? ' (' + T2('parti') + ')' : ''), W / 2 - l / 2 + 58, y, x.col, `800 22px ${POLICE}`, 4);
    c.textAlign = 'right'; texteOmbre(c, x.score.toLocaleString('fr-FR') + ' ' + T2('dégâts'), W / 2 + l / 2 - (f.classe ? 110 : 16), y, '#e8e2f5', `700 19px ${POLICE}`, 4);
    if (f.classe && x.delta !== undefined) texteOmbre(c, (x.delta >= 0 ? '+' : '') + x.delta + ' pts', W / 2 + l / 2 - 16, y, x.delta >= 0 ? '#7dffb0' : '#ff8a9a', `800 19px ${POLICE}`, 4);
  });
  c.textAlign = 'center';
  const y = 250 + f.classement.length * 62 + 20;
  if (f.classe) texteOmbre(c, T2('Ton classement') + ' : ' + profilAff().pts + ' pts', W / 2, y, '#ffe7a6', `800 18px ${POLICE}`, 4);
  const k = .6 + .4 * Math.sin(G.t * 4);
  c.globalAlpha = k; texteOmbre(c, Coop.N() >= 2 ? T2('ESPACE — revanche') : T2('ESPACE — chercher une partie'), W / 2, 640, '#fff', `800 24px ${POLICE}`, 5); c.globalAlpha = 1;
  c.font = `14px ${POLICE}`; c.fillStyle = '#9a94ad'; c.fillText(T2('Échap — menu'), W / 2, 678);
  boutonsAmisFin(f);
};
// après la partie, l'hôte peut ajouter les autres joueurs en amis
function boutonsAmisFin(f) {
  let d = document.getElementById('aff-amis-fin');
  const autres = f.classement.filter(x => !x.moi && x.idJ && !amisJ().some(a => a.idJ === x.idJ));
  if (!autres.length || G.etat !== 'mort') { if (d) d.remove(); return; }
  if (d && d.dataset.n === String(autres.length)) return;
  if (!d) { d = document.createElement('div'); d.id = 'aff-amis-fin'; d.className = 'avis-aff fin'; document.body.appendChild(d); }
  d.dataset.n = autres.length; d.innerHTML = ''; const s = document.createElement('span'); s.textContent = T2('Ajouter en ami') + ' :'; d.appendChild(s);
  for (const x of autres) { const b = document.createElement('button'); b.textContent = '＋ ' + x.nom; b.addEventListener('click', () => { Boite.ajouterAmi({ idJ: x.idJ, nom: x.nom, pts: x.pts }); b.remove(); }); d.appendChild(b); }
}
const _cacherAff = UI.cacher;
UI.cacher = function () { const d = document.getElementById('aff-amis-fin'); if (d) d.remove(); return _cacherAff.apply(this, arguments); };

// ---------- au menu : la tuile Affrontement (choix 2 ou 3 joueurs) ----------
MODES_MENU.affront = () => 'affront';
const _menuAff = UI.menu;
UI.menu = function () {
  this.salleOuverte = false;
  const fin = document.getElementById('aff-amis-fin'); if (fin) fin.remove();
  if (Salon.etat && Salon.etat !== 'invite') Salon.fermer(); // revenir au menu ferme la salle
  const r = _menuAff.apply(this, arguments);
  try {
    const g = this.el.querySelector('.accueil .defis2');
    if (g && !g.querySelector('[data-a=affront]')) {
      const P = profilAff(), b = document.createElement('button');
      b.className = 'defi2 d-affront'; b.dataset.a = 'affront'; b.title = FORMATS.affront.obj;
      b.innerHTML = `<span class="di">⚔</span><span class="dtx"><b>${T2('Affrontement')}</b><span class="dm">${T2('en ligne, contre de vrais joueurs')}</span><span class="af-nb-t">${[2, 3].map(n => `<span class="af-n ${P.n === n ? 'actif' : ''}" data-n="${n}">${n} ${T2('joueurs')}</span>`).join('')}</span></span><span class="dr">${htmlRang(P.pts)}<small>${P.pts} pts</small></span>`;
      b.addEventListener('click', ev => {
        ev.stopPropagation(); Son.init(); Son.play('clic');
        const n = ev.target.closest && ev.target.closest('.af-n');
        if (n) { P.n = +n.dataset.n; Save.write(); b.querySelectorAll('.af-n').forEach(x => x.classList.toggle('actif', x === n)); Save.d.menuSel = 'affront'; Save.write(); majSelection(); return; }
        UI.action('affront', b);
      });
      const surv = g.querySelector('[data-a=survie]'); if (surv) surv.after(b); else g.appendChild(b);
      try { if (typeof iconiser === 'function') iconiser(b); } catch (e) { }
      majSelection(); ajusterAccueil();
    }
  } catch (e) { console.warn('affront menu', e); }
  return r;
};
