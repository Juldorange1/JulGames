// Adresse du serveur de jeu en ligne.
//
// Ordre de priorite :
//   1. ?server=wss://... dans l'adresse de la page (tests)
//   2. adresse saisie par le joueur (menu En ligne > Serveur), gardee dans la sauvegarde
//   3. jeu ouvert en local (fichier, localhost) -> serveur de developpement ws://localhost:8787/ws
//   4. PRODUCTION_URL ci-dessous (a renseigner une fois le serveur deploye sur Internet)

const NetConfig = {
  // Serveur public (ex : 'wss://fracas-serveur.exemple.com/ws'). Doit etre en wss:// (TLS) car
  // le jeu est publie en https (GitHub Pages) : les navigateurs refusent ws:// depuis https.
  PRODUCTION_URL: '',
  DEV_URL: 'ws://localhost:8787/ws',

  url() {
    try {
      const q = new URLSearchParams(location.search).get('server');
      if (q) return q;
    } catch (e) { /* adresse de page illisible */ }
    if (typeof Save !== 'undefined' && Save.data && Save.data.serverUrl) return Save.data.serverUrl;
    const h = location.hostname;
    if (location.protocol === 'file:' || h === 'localhost' || h === '127.0.0.1' || h === '') return this.DEV_URL;
    return this.PRODUCTION_URL || this.DEV_URL;
  },
};
