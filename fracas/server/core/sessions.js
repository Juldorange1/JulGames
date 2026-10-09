'use strict';
// Identite des joueurs. Un joueur = une session :
//   id        identifiant ABSTRAIT, stable pendant la session (jamais une adresse IP ni un SteamID)
//   token     secret remis au client pour se reconnecter (meme onglet / meme application)
//   identity  { provider: 'guest' } aujourd'hui ; plus tard { provider: 'steam', externalId }
//             apres validation d'un ticket Steam cote serveur. Le gameplay n'utilise que `id`.

const crypto = require('node:crypto');

function randomId(prefix) { return prefix + crypto.randomBytes(6).toString('base64url'); }

function cleanName(raw) {
  let n = String(raw || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!n) n = 'Joueur ' + Math.floor(100 + Math.random() * 900);
  return n;
}

class Sessions {
  constructor(graceMs, log) {
    this.graceMs = graceMs;
    this.log = log;
    this.byId = new Map();
    this.byToken = new Map();
    this.onExpire = null; // (session) => void : delai de reconnexion depasse
  }

  // Premier message d'une connexion. Reprend la session si le jeton est valide (reconnexion).
  hello(conn, name, token) {
    let s = token ? this.byToken.get(String(token)) : null;
    let resumed = false;
    if (s) {
      if (s.conn && s.conn !== conn) { s.conn._replaced = true; s.conn.close(4000, 'session reprise ailleurs'); }
      resumed = true;
      if (name) s.name = cleanName(name);
    } else {
      s = {
        id: randomId('u_'), token: crypto.randomBytes(24).toString('base64url'), name: cleanName(name),
        identity: { provider: 'guest', externalId: null },
        conn: null, lobbyCode: null, disconnectedAt: null, createdAt: Date.now(),
      };
      this.byId.set(s.id, s);
      this.byToken.set(s.token, s);
    }
    s.conn = conn;
    s.disconnectedAt = null;
    return { session: s, resumed };
  }

  disconnected(s) {
    s.conn = null;
    s.disconnectedAt = Date.now();
  }

  // Supprime les sessions deconnectees depuis trop longtemps (la place en partie est perdue).
  sweep(now) {
    for (const s of this.byId.values()) {
      if (s.conn || s.disconnectedAt == null) continue;
      if (now - s.disconnectedAt < this.graceMs) continue;
      if (this.onExpire) this.onExpire(s);
      this.byId.delete(s.id);
      this.byToken.delete(s.token);
    }
  }

  count() { return this.byId.size; }
}

module.exports = { Sessions, cleanName };
