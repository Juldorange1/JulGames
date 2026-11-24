/* Personnages (types de pièces) : les 6 classiques + ceux créés dans le jeu, rangés par catégories.
   Un personnage créé = des sauts (cases cliquées autour de lui) + des glissades (8 directions),
   traduits en notation Betza que Fairy-Stockfish (règles + bots) comprend. */
(function () {
  'use strict';

  const CLE = 'echecs.persos';
  const CLE_TIRABLES = 'echecs.persos.tirables';

  // Directions de glissade : décalage (dx, dy), dy > 0 = vers l'avant (vers l'adversaire).
  const DIRS = {
    N: [0, 1], NE: [1, 1], E: [1, 0], SE: [1, -1], S: [0, -1], SO: [-1, -1], O: [-1, 0], NO: [-1, 1]
  };

  const CLASSIQUES = [
    { id: 'pion', lettre: 'p', nom: 'Pion', base: 'p', desc: 'Avance d’une case (deux au premier coup si la règle est active), prend en diagonale, se promeut au bout.',
      sauts: { '0,1': 'm', '-1,1': 'c', '1,1': 'c' }, glisses: {} },
    { id: 'cavalier', lettre: 'n', nom: 'Cavalier', base: 'n', desc: 'Saute en « L ».',
      sauts: { '1,2': 'mc', '2,1': 'mc', '2,-1': 'mc', '1,-2': 'mc', '-1,-2': 'mc', '-2,-1': 'mc', '-2,1': 'mc', '-1,2': 'mc' }, glisses: {} },
    { id: 'fou', lettre: 'b', nom: 'Fou', base: 'b', desc: 'Glisse en diagonale.',
      sauts: {}, glisses: { NE: 'mc', SE: 'mc', SO: 'mc', NO: 'mc' } },
    { id: 'tour', lettre: 'r', nom: 'Tour', base: 'r', desc: 'Glisse en ligne droite.',
      sauts: {}, glisses: { N: 'mc', E: 'mc', S: 'mc', O: 'mc' } },
    { id: 'dame', lettre: 'q', nom: 'Dame', base: 'q', desc: 'Glisse dans les 8 directions.',
      sauts: {}, glisses: { N: 'mc', NE: 'mc', E: 'mc', SE: 'mc', S: 'mc', SO: 'mc', O: 'mc', NO: 'mc' } },
    { id: 'roi', lettre: 'k', nom: 'Roi', base: 'k', desc: 'Une case dans toutes les directions. Pièce royale : il ne faut pas le perdre.',
      sauts: { '0,1': 'mc', '1,1': 'mc', '1,0': 'mc', '1,-1': 'mc', '0,-1': 'mc', '-1,-1': 'mc', '-1,0': 'mc', '-1,1': 'mc' }, glisses: {} }
  ].map((p) => Object.assign(p, { classique: true, categorie: 'Classiques', portee: 0, marque: '' }));

  const TIRABLES_DEFAUT = { cavalier: true, fou: true, tour: true, dame: true, pion: false };

  // Quelques exemples (modifiables et supprimables), créés la première fois.
  function exemples() {
    const cav = CLASSIQUES[1].sauts, roi = CLASSIQUES[5].sauts;
    const diag = { NE: 'mc', SE: 'mc', SO: 'mc', NO: 'mc' }, droit = { N: 'mc', E: 'mc', S: 'mc', O: 'mc' };
    return [
      { id: 'ex_archeveque', nom: 'Archevêque', categorie: 'Exemples', base: 'b', marque: 'A', tirable: true, sauts: Object.assign({}, cav), glisses: Object.assign({}, diag), portee: 0 },
      { id: 'ex_chancelier', nom: 'Chancelier', categorie: 'Exemples', base: 'r', marque: 'Ch', tirable: true, sauts: Object.assign({}, cav), glisses: Object.assign({}, droit), portee: 0 },
      { id: 'ex_amazone', nom: 'Amazone', categorie: 'Exemples', base: 'q', marque: 'Am', tirable: true, sauts: Object.assign({}, cav), glisses: Object.assign({}, diag, droit), portee: 0 },
      { id: 'ex_chameau', nom: 'Chameau', categorie: 'Exemples', base: 'n', marque: '🐪', tirable: true,
        sauts: { '1,3': 'mc', '3,1': 'mc', '3,-1': 'mc', '1,-3': 'mc', '-1,-3': 'mc', '-3,-1': 'mc', '-3,1': 'mc', '-1,3': 'mc' }, glisses: {}, portee: 0 },
      { id: 'ex_homme', nom: 'Homme', categorie: 'Exemples', base: 'k', marque: 'H', tirable: true, sauts: Object.assign({}, roi), glisses: {}, portee: 0 }
    ];
  }

  function lire() {
    let l = null;
    try { l = JSON.parse(localStorage.getItem(CLE)); } catch (e) { l = null; }
    if (!Array.isArray(l)) { l = exemples(); localStorage.setItem(CLE, JSON.stringify(l)); }
    return l;
  }
  function ecrire(l) { localStorage.setItem(CLE, JSON.stringify(l)); }
  function tirablesClassiques() {
    try { return Object.assign({}, TIRABLES_DEFAUT, JSON.parse(localStorage.getItem(CLE_TIRABLES) || '{}')); } catch (e) { return Object.assign({}, TIRABLES_DEFAUT); }
  }

  // ---------- notation Betza ----------
  const ATOMES = { '1,0': 'W', '1,1': 'F', '2,0': 'D', '2,1': 'N', '2,2': 'A', '3,0': 'H', '3,1': 'C', '3,2': 'Z', '3,3': 'G' };
  function prefixe(mode) { return mode === 'm' ? 'm' : mode === 'c' ? 'c' : ''; }
  function betzaSaut(dx, dy, mode) {
    const a = Math.max(Math.abs(dx), Math.abs(dy)), b = Math.min(Math.abs(dx), Math.abs(dy));
    const atome = ATOMES[a + ',' + b];
    if (!atome) return '';
    let dir;
    const v = dy > 0 ? 'f' : 'b', h = dx > 0 ? 'r' : 'l';
    if (b === 0) dir = dx === 0 ? v : h;              // orthogonal
    else if (a === b) dir = v + h;                      // diagonal
    else dir = Math.abs(dx) > Math.abs(dy) ? v + h : h + v; // en L (convention de Fairy-Stockfish)
    return prefixe(mode) + dir + atome;
  }
  const DIR_BETZA = { N: ['f', 'R'], S: ['b', 'R'], E: ['r', 'R'], O: ['l', 'R'], NE: ['fr', 'B'], NO: ['fl', 'B'], SE: ['br', 'B'], SO: ['bl', 'B'] };
  function betza(p) {
    let s = '';
    for (const k in p.glisses || {}) {
      const mode = p.glisses[k];
      if (!mode || !DIR_BETZA[k]) continue;
      s += prefixe(mode) + DIR_BETZA[k][0] + DIR_BETZA[k][1] + (p.portee ? p.portee : '');
    }
    for (const k in p.sauts || {}) {
      const mode = p.sauts[k];
      if (!mode) continue;
      const [dx, dy] = k.split(',').map(Number);
      s += betzaSaut(dx, dy, mode);
    }
    return s;
  }

  function description(p) {
    if (p.classique) return p.desc;
    const nS = Object.values(p.sauts || {}).filter(Boolean).length;
    const nG = Object.values(p.glisses || {}).filter(Boolean).length;
    const morceaux = [];
    if (nS) morceaux.push('saute sur ' + nS + ' case' + (nS > 1 ? 's' : '') + ' (par-dessus les pièces)');
    if (nG) morceaux.push('glisse dans ' + nG + ' direction' + (nG > 1 ? 's' : '') + (p.portee ? ' (' + p.portee + ' cases max)' : ''));
    const seul = Object.values(p.sauts || {}).concat(Object.values(p.glisses || {})).some((m) => m === 'm' || m === 'c');
    return (morceaux.join(', ') || 'ne bouge pas') + (seul ? ' ; certains coups servent seulement à avancer ou seulement à prendre' : '') + '.';
  }

  const Persos = {
    DIRS, CLASSIQUES, betza, description,
    tous() {
      const t = tirablesClassiques();
      return CLASSIQUES.map((p) => Object.assign({}, p, { tirable: p.id !== 'roi' && !!t[p.id] })).concat(lire());
    },
    crees: lire,
    trouver(id) { return this.tous().find((p) => p.id === id) || null; },
    categories() {
      const c = [];
      for (const p of this.tous()) if (!c.includes(p.categorie)) c.push(p.categorie);
      return c;
    },
    enregistrer(p) {
      if (p.classique) {
        const t = tirablesClassiques(); t[p.id] = !!p.tirable;
        localStorage.setItem(CLE_TIRABLES, JSON.stringify(t));
        return;
      }
      const l = lire().filter((x) => x.id !== p.id);
      l.push(p);
      ecrire(l);
    },
    supprimer(id) { ecrire(lire().filter((x) => x.id !== id)); },
    nouveauId() { return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36); },
    // Pool du hasard : personnages « tirables » (jamais le roi), éventuellement d'une catégorie.
    pool(categorie) {
      return this.tous().filter((p) => p.tirable && p.id !== 'roi' && (!categorie || p.categorie === categorie));
    },
    // Apparence pour le plateau.
    apparence(p) {
      return { base: p.base || 'q', marque: p.classique ? '' : (p.marque || ''), nom: p.nom, desc: description(p) };
    }
  };
  window.Persos = Persos;
})();
