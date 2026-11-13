'use strict';
/* Colosses — jouer en ligne sans rien installer. L'hôte crée une salle et partage un lien (ou un code de 4 lettres).
   Son appareil fait tourner toute la partie et envoie l'image et le son en direct aux amis (WebRTC, de pair à pair,
   avec PeerJS pour se trouver) ; les amis n'envoient que leurs commandes. Le jeu étant sur un seul écran fixe, tout
   le monde voit la même chose, et n'importe quel appareil peut rejoindre : téléphone, tablette, PC. */

const URL_PEERJS = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIXE_SALLE = 'colosses-julgame-';
const LIEN_JEU = 'https://juldorange1.github.io/JulGames/colosses/';
const Reseau = {
  role: null, peer: null, code: null, msg: '', flux: null, infoT: null, conn: null, info: null, video: null, ang: null,
  charger() {
    return new Promise((ok, non) => {
      if (window.Peer) return ok();
      const s = document.createElement('script'); s.src = URL_PEERJS; s.onload = () => ok(); s.onerror = () => non(new Error('peerjs'));
      document.head.appendChild(s);
    });
  },
  lien() { return LIEN_JEU + '?salle=' + this.code; },
  // ---------- hôte ----------
  async heberger(essai) {
    essai = essai || 0;
    this.msg = 'Création de la salle…'; if (UI.multiOuvert) UI.multi();
    try { await this.charger(); } catch (e) { this.msg = 'Connexion impossible : vérifie Internet.'; if (UI.multiOuvert) UI.multi(); return; }
    let code = ''; for (let i = 0; i < 4; i++) code += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
    const peer = new Peer(PREFIXE_SALLE + code.toLowerCase());
    peer.on('open', () => { this.peer = peer; this.code = code; this.role = 'hote'; this.msg = ''; if (UI.multiOuvert) UI.multi(); this.infoT = setInterval(() => this.annoncer(), 400); });
    peer.on('connection', conn => this.arrivee(conn));
    peer.on('error', e => {
      if (e.type === 'unavailable-id' && essai < 5) { peer.destroy(); return this.heberger(essai + 1); }
      if (this.role !== 'hote') { this.msg = 'Impossible de créer la salle pour le moment.'; if (UI.multiOuvert) UI.multi(); }
    });
  },
  fermer() {
    for (const j of Coop.inscrits.filter(x => x.type === 'reseau')) { try { j.conn.close(); } catch (e) { } Coop.retirer(j); }
    clearInterval(this.infoT); try { if (this.peer) this.peer.destroy(); } catch (e) { }
    this.peer = null; this.code = null; this.role = null;
  },
  // l'image du jeu (et son son) à envoyer
  fluxJeu() {
    if (this.flux) return this.flux;
    const st = (typeof PostFX !== 'undefined' && PostFX.ok && PostFX.cv && G.opts.postfx !== false ? PostFX.cv : cv).captureStream(30); // l'image finale (monde éclairé + interface)
    try { const v = st.getVideoTracks()[0]; if (v && 'contentHint' in v) v.contentHint = 'motion'; } catch (e) { }
    try {
      Son.init();
      if (Son.c && Son.master && Son.c.createMediaStreamDestination) {
        const d = Son.fluxSortie = Son.c.createMediaStreamDestination();
        Son.master.connect(d);
        for (const p of Musique.pistes) if (p.chaine && p.chaine.g) p.chaine.g.connect(d);
        const a = d.stream.getAudioTracks()[0]; if (a) st.addTrack(a);
      }
    } catch (e) { }
    return (this.flux = st);
  },
  arrivee(conn) {
    let j = null;
    conn.on('open', () => {
      if (Coop.N() >= MAX_JOUEURS) { conn.send({ t: 'plein' }); setTimeout(() => conn.close(), 400); return; }
      j = Coop.ajouter({ type: 'reseau', nom: String((conn.metadata && conn.metadata.nom) || 'Ami').replace(/[<>&"']/g, '').slice(0, 16), conn });
      if (!j) return;
      // image nette dès le départ : débit de départ élevé (sinon le navigateur commence en toute petite image)
      const debit = sdp => { const m = /a=rtpmap:(\d+) VP8\/90000/.exec(sdp); return m ? sdp.replace(m[0], m[0] + '\r\na=fmtp:' + m[1] + ' x-google-start-bitrate=2500;x-google-min-bitrate=1000;x-google-max-bitrate=6000') : sdp; };
      j.appel = this.peer.call(conn.peer, this.fluxJeu(), { sdpTransform: debit });
      setTimeout(() => { try { for (const s of j.appel.peerConnection.getSenders()) { if (!s.track || s.track.kind !== 'video') continue; const pr = s.getParameters(); pr.degradationPreference = 'balanced'; (pr.encodings = pr.encodings && pr.encodings.length ? pr.encodings : [{}])[0].maxBitrate = 6000000; s.setParameters(pr); } } catch (e) { } }, 1500);
      this.annoncer();
    });
    conn.on('data', d => { if (j && d && d.cmd) j.entree = d; });
    const fin = () => { if (j) { try { j.appel.close(); } catch (e) { } Coop.retirer(j); j = null; } };
    conn.on('close', fin); conn.on('error', fin);
  },
  // ce que les invités ont besoin de savoir (position de l'image, leur vie, l'état de la partie)
  annoncer() {
    if (this.role !== 'hote') return;
    const prim = G.ars ? trouveArme('p', G.ars.p) : null;
    for (const j of Coop.inscrits) {
      if (j.type !== 'reseau' || !j.conn || !j.conn.open) continue;
      const pj = j.ars ? trouveArme('p', j.ars.p) : prim;
      try { j.conn.send({ t: 'info', aff: typeof Salon !== 'undefined' && (Salon.etat === 'hote' || G.mode === 'affront') ? Salon.pourInvite() : null, n: j.n, N: Coop.N(), etat: G.etat, cw: cv.width, ch: cv.height, sc: scale * dpr, ox: offX * dpr, oy: offY * dpr, pv: j.p ? Math.ceil(j.p.hp) : 0, pvMax: j.p ? j.p.hpMax : 0, ko: !!(j.p && (j.p.ko || j.p.hp <= 0)), manuel: !!(pj && pj.manuel), armes: j.ars ? [pj && pj.nom, (trouveArme('s', j.ars.s) || {}).nom, (trouveArme('t', j.ars.t) || {}).nom] : null }); } catch (e) { }
    }
  },
  // ---------- invité ----------
  async rejoindre(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    if (code.length !== 4) { this.msg = 'Le code fait 4 lettres.'; if (UI.multiOuvert) UI.multi(); return; }
    this.ecranInvite('Connexion à la salle ' + code + '…');
    try { await this.charger(); } catch (e) { return this.echec('Connexion impossible : vérifie Internet.'); }
    this.role = 'invite'; this.code = code;
    const peer = this.peer = new Peer();
    const delai = setTimeout(() => { if (!this.info) this.echec('Salle introuvable : vérifie le code, et que ton ami a bien sa salle ouverte.'); }, 15000);
    peer.on('open', () => {
      const conn = this.conn = peer.connect(PREFIXE_SALLE + code.toLowerCase(), { metadata: { nom: Save.d.pseudo || 'Ami' } });
      conn.on('data', d => {
        if (d.t === 'plein') return this.echec('La salle est pleine (3 joueurs).');
        if (d.t === 'info') { if (!this.info) clearTimeout(delai); this.info = d; this.majInvite(); }
      });
      conn.on('close', () => this.echec('La partie est terminée : ton ami a fermé la salle.'));
      setInterval(() => { if (conn.open) { try { conn.send(this.entreeInvite()); } catch (e) { } } }, 33);
    });
    peer.on('call', call => { call.answer(); call.on('stream', st => { const v = this.video; v.srcObject = st; const p = v.play(); if (p && p.catch) p.catch(() => { v.muted = true; v.play(); }); }); });
    peer.on('error', e => { if (e.type === 'peer-unavailable') this.echec('Salle introuvable : vérifie le code, et que ton ami a bien sa salle ouverte.'); });
  },
  ecranInvite(txt) {
    G.etat = 'invite'; UI.cacher(); Musique.stop();
    let d = document.getElementById('invite');
    if (!d) {
      d = document.createElement('div'); d.id = 'invite';
      d.innerHTML = '<video playsinline autoplay></video><div class="inv-msg"></div><div class="inv-pv"></div><button class="inv-quit">✕</button>';
      document.body.appendChild(d);
      this.video = d.querySelector('video');
      d.querySelector('.inv-quit').addEventListener('click', () => { location.href = location.pathname; });
    }
    d.querySelector('.inv-msg').textContent = txt; if (typeof Langue !== 'undefined' && Langue.en) Langue.dom(d);
    d.querySelector('.inv-msg').style.display = 'block';
  },
  echec(txt) {
    const d = document.getElementById('invite'); if (!d) return;
    const m = d.querySelector('.inv-msg'); m.style.display = 'block'; m.textContent = txt; if (typeof Langue !== 'undefined' && Langue.en) Langue.dom(d);
    try { if (this.peer) this.peer.destroy(); } catch (e) { }
  },
  majInvite() {
    const d = document.getElementById('invite'), i = this.info; if (!d || !i) return;
    const tr = t => (typeof Langue !== 'undefined' && Langue.en ? Langue.t(t) : t);
    const m = d.querySelector('.inv-msg');
    if (i.etat === 'menu') { m.style.display = 'block'; m.textContent = tr('Tu es le joueur ') + i.n + tr(' : ton ami va lancer la partie…'); } else if (i.etat === 'pause') { m.style.display = 'block'; m.textContent = tr('Pause'); } else m.style.display = 'none';
    d.querySelector('.inv-pv').textContent = (i.pvMax ? 'J' + i.n + ' · ' + (i.ko ? tr('à terre') : i.pv + ' / ' + i.pvMax) : 'J' + i.n) + (i.armes ? ' · ' + i.armes.join(' · ') : '');
  },
  // les commandes de l'invité : clavier et souris, manette, ou écran tactile
  entreeInvite() {
    const K = TOUCHES(), e = { cmd: 1 }, I = c => Input.down(c);
    e.h = I(K.haut) || I('ArrowUp'); e.b = I(K.bas) || I('ArrowDown'); e.g = I(K.gauche) || I('ArrowLeft'); e.d = I(K.droite) || I('ArrowRight');
    e.f = I(K.tir); e.s = I(K.spec) || I(K.spec2); e.t = I(K.tal) || I(K.tal2);
    const g = Manette.liste()[0], info = this.info;
    if (g) {
      const ax = g.axes, B = i => Manette.bouton(g, i), C = MANETTE_CFG(), A = act => (C[act] || []).some(i => B(i));
      e.g = e.g || ax[0] < -.3 || B(14); e.d = e.d || ax[0] > .3 || B(15); e.h = e.h || ax[1] < -.3 || B(12); e.b = e.b || ax[1] > .3 || B(13);
      e.f = e.f || A('tir'); e.s = e.s || A('spec'); e.t = e.t || A('tal');
      if (Math.hypot(ax[2] || 0, ax[3] || 0) > .35) e.a = Math.atan2(ax[3], ax[2]);
    }
    if (typeof Tactile !== 'undefined' && Tactile.actif) {
      if (Tactile.droite) { e.f = true; if (typeof this.ang === 'number') e.a = this.ang; }
      else if (info && !info.manuel) e.f = true; // tir automatique sur le boss
    } else if (e.a === undefined && info && this.video && !g) {
      // la souris, convertie dans les coordonnées du jeu
      const r = this.video.getBoundingClientRect(), s = Math.min(r.width / info.cw, r.height / info.ch), dx = (r.width - info.cw * s) / 2, dy = (r.height - info.ch * s) / 2;
      e.mx = ((Input.sx - r.left - dx) / s - info.ox) / info.sc; e.my = ((Input.sy - r.top - dy) / s - info.oy) / info.sc;
    }
    return e;
  }
};
// l'invité ne dessine rien : il regarde la vidéo
const _renduInvite = rendu;
rendu = function () { if (Reseau.role === 'invite' || G.etat === 'invite') return; return _renduInvite.apply(this, arguments); };

// ---------- écran Multijoueur ----------
UI.multi = function () {
  const J = [`<li><b>J1</b> <span>${Save.d.pseudo || 'Toi'}</span></li>`].concat(Coop.inscrits.map((j, i) => `<li><b style="color:${j.col}">J${j.n}</b> <span>${j.type === 'manette' ? '🎮 Manette' : '🌐 ' + j.nom}</span> <button class="petit" data-a="multiRetirer" data-i="${i}">✕</button></li>`));
  while (J.length < MAX_JOUEURS) J.push(`<li class="vide"><b>J${J.length + 1}</b> <span>Place libre</span></li>`);
  const salle = Reseau.role === 'hote' && Reseau.code
    ? `<p class="mini">Envoie ce lien à tes amis : ils l'ouvrent et ils sont dans la partie, sur n'importe quel appareil, sans rien installer.</p>
       <div class="salle-code">${Reseau.code}</div>
       <div class="rang"><button data-a="multiCopier">🔗 Copier le lien</button><button data-a="multiFermer">Fermer la salle</button></div>`
    : `<p class="mini">Tes amis jouent depuis chez eux. Ton appareil fait tourner la partie et leur envoie l'image en direct.</p><div class="rang"><button data-a="multiCreer">🌐 Créer une salle</button></div>`;
  this.ecran('👥 Multijoueur', `
    <ul class="joueurs">${J.join('')}</ul>
    ${Reseau.msg ? `<p class="mini amis-msg">${Reseau.msg}</p>` : ''}
    <div class="bloc"><h3>Jouer en ligne</h3>${salle}</div>
    <div class="bloc"><h3>Rejoindre un ami</h3><div class="rang"><input id="salle-code" maxlength="4" autocomplete="off" placeholder="CODE"><button data-a="multiRejoindre">▶ Rejoindre</button></div></div>
    <div class="bloc"><h3>Sur cet appareil</h3><p class="mini">Branche une manette et appuie sur Start : le joueur rejoint la partie. Appuie encore pour quitter.</p></div>
    <p class="mini">Le boss s'adapte au nombre de joueurs : plus de vie, plus d'attaques, et il frappe aussi ceux qu'il ne vise pas. Un joueur à terre se relève si un coéquipier reste à côté de lui.</p>`);
  this.multiOuvert = true;
  const i = this.el.querySelector('#salle-code');
  if (i) { i.addEventListener('input', () => { i.value = i.value.toUpperCase(); }); i.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); this.action('multiRejoindre'); } }); }
};
const _menuMulti = UI.menu;
UI.menu = function () { this.multiOuvert = false; return _menuMulti.apply(this, arguments); };
const _actMulti = UI.action;
UI.action = function (a, btn) {
  switch (a) {
    case 'multi': Reseau.msg = ''; return this.multi();
    case 'multiCreer': return Reseau.heberger();
    case 'multiFermer': Reseau.fermer(); return this.multi();
    case 'multiRetirer': { const j = Coop.inscrits[+btn.dataset.i]; if (j) { if (j.conn) { try { j.conn.close(); } catch (e) { } } Coop.retirer(j); } return this.multi(); }
    case 'multiCopier': { try { navigator.clipboard.writeText(Reseau.lien()); } catch (e) { } btn.textContent = '✔ Lien copié'; return; }
    case 'multiRejoindre': { const i = this.el.querySelector('#salle-code'); return Reseau.rejoindre(i && i.value); }
  }
  return _actMulti.call(this, a, btn);
};
// un lien d'invitation : un seul bouton à toucher (il faut un geste pour avoir le son et le plein écran)
addEventListener('load', () => {
  const m = /[?&]salle=([A-Za-z]{4})/.exec(location.search); if (!m) return;
  setTimeout(() => {
    const code = m[1].toUpperCase();
    UI.montrer(`<div class="panneau court"><h2>👥 Multijoueur</h2><p class="mini centre">Un ami t'invite dans sa partie.</p><div class="salle-code">${code}</div><div class="rang col"><button class="gros" id="go-salle">▶ Rejoindre la partie</button></div></div>`);
    UI.el.querySelector('#go-salle').addEventListener('click', () => { Son.init(); try { if (typeof pleinEcran === 'function') pleinEcran(); } catch (e) { } Reseau.rejoindre(code); });
  }, 300);
});

// chaque tir et chaque effet est traité avec les armes, la précision et la position de son propriétaire
function parJoueur(nom, f) {
  const eq = Coop.actif() ? Coop.equipiers() : []; if (!eq.length) return f();
  const tout = G[nom];
  G[nom] = tout.filter(b => !b.own || !eq.includes(b.own)); f(); let res = G[nom];
  for (const j of eq) {
    const l = tout.filter(b => b.own === j); if (!l.length) continue;
    Coop.enJoueur(j, () => { G[nom] = l; f(); for (const b of G[nom]) b.own = j; res = res.concat(G[nom]); });
  }
  G[nom] = res;
}
const _tirsCoop = majTirsJoueur;
majTirsJoueur = function (dt) { parJoueur('pb', () => _tirsCoop(dt)); };
const _alliesCoop = majAllies;
majAllies = function (dt) { parJoueur('allies', () => _alliesCoop(dt)); };
