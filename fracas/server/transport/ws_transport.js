'use strict';
// Transport WebSocket. Le reste du serveur ne connait QUE l'interface ci-dessous, ce qui permet
// d'ajouter plus tard un autre transport (ex : Steam Networking Sockets) sans toucher au gameplay :
//
//   transport.onConnection((conn) => {...})
//   conn.id                      identifiant technique de la connexion
//   conn.send(obj | string)      envoi d'un message (objet JSON ou chaine deja serialisee)
//   conn.onMessage((obj) => {})  message recu (deja decode)
//   conn.onClose(() => {})
//   conn.close(code, reason)

const { WebSocketServer } = require('ws');

let nextConnId = 1;

class WsTransport {
  constructor(httpServer, config, log) {
    this.config = config;
    this.log = log;
    this.handlers = [];
    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/ws',
      maxPayload: config.MAX_MESSAGE_BYTES,
      // compression : les snapshots JSON se compressent tres bien
      perMessageDeflate: { threshold: 256, zlibDeflateOptions: { level: 3 } },
      verifyClient: (info, cb) => {
        const origins = config.ALLOWED_ORIGINS;
        if (!origins.length || origins.includes(info.origin) || !info.origin) return cb(true);
        this.log('warn', `origine refusee : ${info.origin}`);
        cb(false, 403, 'origine non autorisee');
      },
    });
    this.wss.on('connection', (ws, req) => this.accept(ws, req));
  }

  onConnection(handler) { this.handlers.push(handler); }

  count() { return this.wss.clients.size; }

  accept(ws, req) {
    if (this.wss.clients.size > this.config.MAX_CONNECTIONS) { ws.close(1013, 'serveur plein'); return; }
    const lag = this.config.DEV_LAG_MS;
    const conn = {
      id: nextConnId++,
      ip: req.socket.remoteAddress,
      _onMessage: null, _onClose: null, closed: false,
      _rate: { t: Date.now(), n: 0 },
      send(msg) {
        if (conn.closed || ws.readyState !== 1) return;
        const data = typeof msg === 'string' ? msg : JSON.stringify(msg);
        if (lag > 0) setTimeout(() => { if (ws.readyState === 1) ws.send(data); }, lag);
        else ws.send(data);
      },
      onMessage(fn) { conn._onMessage = fn; },
      onClose(fn) { conn._onClose = fn; },
      close(code, reason) { try { ws.close(code || 1000, reason || ''); } catch (e) { /* deja ferme */ } },
      bufferedAmount() { return ws.bufferedAmount; },
    };
    ws.on('message', (raw, isBinary) => {
      if (isBinary) return;
      // limitation de debit : protege le serveur d'un client qui inonde
      const now = Date.now();
      if (now - conn._rate.t >= 1000) { conn._rate.t = now; conn._rate.n = 0; }
      if (++conn._rate.n > this.config.MAX_MESSAGES_PER_SEC) return;
      let obj;
      try { obj = JSON.parse(raw.toString()); } catch (e) { return; }
      if (!obj || typeof obj !== 'object' || typeof obj.t !== 'string') return;
      const deliver = () => { if (conn._onMessage) { try { conn._onMessage(obj); } catch (e) { this.log('error', 'message', e); } } };
      if (lag > 0) setTimeout(deliver, lag); else deliver();
    });
    ws.on('close', () => {
      conn.closed = true;
      if (conn._onClose) conn._onClose();
    });
    ws.on('error', () => {});
    for (const h of this.handlers) h(conn);
  }
}

module.exports = { WsTransport };
