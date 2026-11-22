/* Shiftrun — jouer à deux en ligne (Survivant et Expédition), sans serveur à nous : PeerJS sert juste à se trouver,
   puis les deux navigateurs se parlent directement (WebRTC). L'hôte crée une salle (code de 4 lettres), l'ami le tape.
   Chacun voit la partie avec sa propre caméra ; voir jeu.js (« Jeu en ligne ») pour ce qui est échangé. */
(function (racine) {
'use strict';
const URL_PEERJS = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIXE = 'shiftrun-julgame-';
const EnLigne = {
  role: null, peer: null, conn: null, code: null, etat: '', surMessage: null, surChange: null,
  charger() {
    return new Promise((ok, non) => {
      if (racine.Peer) return ok();
      const s = document.createElement('script'); s.src = URL_PEERJS; s.onload = () => ok(); s.onerror = () => non(new Error('peerjs'));
      document.head.appendChild(s);
    });
  },
  changer(etat) { this.etat = etat; if (this.surChange) this.surChange(); },
  actif() { return !!(this.conn && this.conn.open); },
  envoyer(o) { if (this.actif()) { try { this.conn.send(o); } catch (e) { /* connexion coupée */ } } },
  brancher(conn) {
    this.conn = conn;
    conn.on('open', () => this.changer('connecte'));
    conn.on('data', (d) => { if (d && this.surMessage) this.surMessage(d); });
    const fin = () => { if (this.conn === conn) { this.conn = null; this.changer('parti'); } };
    conn.on('close', fin); conn.on('error', fin);
  },
  async heberger(essai) {
    essai = essai || 0;
    this.fermer(); this.role = 'hote'; this.changer('creation');
    try { await this.charger(); } catch (e) { this.changer('internet'); return; }
    let code = ''; for (let i = 0; i < 4; i++) code += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
    const peer = new racine.Peer(PREFIXE + code.toLowerCase());
    peer.on('open', () => { this.peer = peer; this.code = code; this.changer('attente'); });
    peer.on('connection', (conn) => { if (this.actif()) { conn.on('open', () => conn.close()); return; } this.brancher(conn); });
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
    peer.on('open', () => { this.brancher(peer.connect(PREFIXE + code.toLowerCase(), { reliable: true })); });
    peer.on('error', (e) => { if (e.type === 'peer-unavailable') { clearTimeout(delai); this.changer('introuvable'); } });
  },
  fermer() {
    try { if (this.conn) this.conn.close(); } catch (e) { }
    try { if (this.peer) this.peer.destroy(); } catch (e) { }
    this.conn = null; this.peer = null; this.code = null; this.role = null; this.etat = '';
  }
};
racine.EnLigne = EnLigne;
})(window);
