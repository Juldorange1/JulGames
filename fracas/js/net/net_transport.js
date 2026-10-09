// Transport reseau cote client. Le reste du jeu n'utilise QUE cette interface :
//   transport.connect(url) -> Promise   transport.send(obj)   transport.close()
//   transport.onMessage = (obj) => {}   transport.onClose = () => {}   transport.connected
// Une future version Steam (Electron + steamworks.js, Steam Networking Sockets) n'aurait qu'a
// fournir un objet avec la meme interface.

class WsClientTransport {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.onMessage = null;
    this.onClose = null;
  }

  connect(url) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let ws;
      try { ws = new WebSocket(url); } catch (e) { reject(e); return; }
      this.ws = ws;
      const timer = setTimeout(() => { if (!settled) { settled = true; try { ws.close(); } catch (e) { /* */ } reject(new Error('timeout')); } }, 6000);
      ws.onopen = () => { this.connected = true; if (!settled) { settled = true; clearTimeout(timer); resolve(); } };
      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch (e) { return; }
        if (this.onMessage) this.onMessage(msg);
      };
      ws.onerror = () => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error('connexion impossible')); } };
      ws.onclose = () => {
        const was = this.connected;
        this.connected = false;
        if (!settled) { settled = true; clearTimeout(timer); reject(new Error('ferme')); }
        if (was && this.onClose) this.onClose();
      };
    });
  }

  send(obj) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
  }

  close() {
    this.connected = false;
    if (this.ws) { this.ws.onclose = null; try { this.ws.close(); } catch (e) { /* */ } }
    this.ws = null;
  }
}
