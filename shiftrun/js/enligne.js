/* Shiftrun — jouer à deux en ligne, sans serveur à nous : PeerJS sert juste à se trouver, puis les deux navigateurs
   se parlent directement (WebRTC).
   - Première rencontre : l'un crée une salle (code de 4 lettres), l'autre le tape.
   - Ensuite on peut s'ajouter en ami : chaque joueur a un identifiant à lui ; quand le jeu est ouvert et qu'on a des amis,
     on « écoute » sur cet identifiant, et un ami peut nous inviter directement (on accepte ou on refuse).
   Voir jeu.js (« Jeu en ligne ») pour ce qui est échangé pendant les parties. */
(function (racine) {
'use strict';
const URL_PEERJS = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIXE = 'shiftrun-julgame-';
const EnLigne = {
  role: null, peer: null, perso: null, conn: null, code: null, etat: '', ami: null, accepte: false, viaAmi: false,
  surMessage: null, surChange: null, identite: null, persoErr: null,
  charger() {
    return new Promise((ok, non) => {
      if (racine.Peer) return ok();
      const s = document.createElement('script'); s.src = URL_PEERJS; s.onload = () => ok(); s.onerror = () => non(new Error('peerjs'));
      document.head.appendChild(s);
    });
  },
  changer(etat) { this.etat = etat; if (this.surChange) this.surChange(); },
  actif() { return !!(this.conn && this.conn.open); },
  ensemble() { return this.actif() && this.accepte && !!this.ami; },
  envoyer(o) { if (this.actif()) { try { this.conn.send(o); } catch (e) { /* connexion coupée */ } } },
  brancher(conn, viaAmi) {
    this.conn = conn; this.ami = null; this.accepte = false; this.viaAmi = !!viaAmi;
    conn.on('open', () => {
      if (this.identite) this.envoyer(Object.assign({ t: 'moi' }, this.identite()));   // on se présente (identifiant + nom)
      this.changer('connecte');
    });
    conn.on('data', (d) => { if (d && this.surMessage) this.surMessage(d); });
    const fin = () => { if (this.conn === conn) { this.conn = null; this.ami = null; this.accepte = false; this.changer('parti'); } };
    conn.on('close', fin); conn.on('error', fin);
  },
  async heberger(essai) {
    essai = essai || 0;
    this.fermer(); this.role = 'hote'; this.changer('creation');
    try { await this.charger(); } catch (e) { this.changer('internet'); return; }
    let code = ''; for (let i = 0; i < 4; i++) code += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
    const peer = new racine.Peer(PREFIXE + code.toLowerCase());
    peer.on('open', () => { this.peer = peer; this.code = code; this.changer('attente'); });
    peer.on('connection', (conn) => { if (this.actif()) { conn.on('open', () => conn.close()); return; } this.brancher(conn, false); });
    peer.on('error', (e) => {
      if (e.type === 'unavailable-id' && essai < 5) { try { peer.destroy(); } catch (x) { } this.heberger(essai + 1); return; }
      if (!this.code) this.changer('impossible');
    });
  },
  async rejoindre(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    if (code.length !== 4) { this.changer('code'); return; }
    this.fermer(); this.role = 'invite'; this.code = code; this.changer('recherche');
    try { await this.charger(); } catch (e) { this.changer('internet'); return; }
    const peer = this.peer = new racine.Peer();
    const delai = setTimeout(() => { if (!this.actif() && this.role === 'invite') this.changer('introuvable'); }, 15000);
    peer.on('open', () => { this.brancher(peer.connect(PREFIXE + code.toLowerCase(), { reliable: true }), false); });
    peer.on('error', (e) => { if (e.type === 'peer-unavailable') { clearTimeout(delai); this.changer('introuvable'); } });
  },
  // être joignable par ses amis (tant que le jeu est ouvert)
  async ecouter(id) {
    if (!id || (this.perso && !this.perso.destroyed)) return;
    try { await this.charger(); } catch (e) { return; }
    if (this.perso && !this.perso.destroyed) return;
    const p = this.perso = new racine.Peer(PREFIXE + 'j-' + id);
    p.on('connection', (conn) => {
      if (this.actif()) { conn.on('open', () => conn.close()); return; }        // déjà avec quelqu'un
      this.role = 'hote'; this.code = null; this.brancher(conn, true);
    });
    p.on('error', (e) => { if (this.persoErr) this.persoErr(e); });
    p.on('disconnected', () => { try { if (!p.destroyed) p.reconnect(); } catch (e) { } });
  },
  // inviter un ami directement (il doit avoir le jeu ouvert)
  async appeler(id) {
    this.fermer(); this.role = 'invite'; this.code = null; this.changer('appel');
    try { await this.charger(); } catch (e) { this.changer('internet'); return; }
    const delai = setTimeout(() => { if (!this.actif() && this.etat === 'appel') this.changer('absent'); }, 12000);
    const absent = (e) => { if (e && e.type === 'peer-unavailable' && this.etat === 'appel') { clearTimeout(delai); this.changer('absent'); } };
    const go = (peer) => this.brancher(peer.connect(PREFIXE + 'j-' + id, { reliable: true }), true);
    if (this.perso && this.perso.open) { this.persoErr = absent; go(this.perso); }
    else { const peer = this.peer = new racine.Peer(); peer.on('open', () => go(peer)); peer.on('error', absent); }
  },
  fermer() {
    try { if (this.conn) this.conn.close(); } catch (e) { }
    try { if (this.peer) this.peer.destroy(); } catch (e) { }
    this.conn = null; this.peer = null; this.code = null; this.role = null; this.etat = ''; this.ami = null; this.accepte = false; this.viaAmi = false;
  }
};
racine.EnLigne = EnLigne;
})(window);
