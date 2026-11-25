/* Personnages (types de pièces) : les 6 classiques + ceux créés dans le jeu, rangés par catégories.
   Un personnage créé = les cases où il peut aller depuis sa place (cliquées dans l'éditeur),
   les directions où il continue tout droit, et s'il saute ou non par-dessus les pièces.
   Tout est traduit en notation Betza, que Fairy-Stockfish (règles + bots) comprend. */
(function () {
  'use strict';

  const CLE = 'echecs.persos';

  // Directions : décalage (dx, dy), dy > 0 = vers l'adversaire.
  const DIRS = {
    N: [0, 1], NE: [1, 1], E: [1, 0], SE: [1, -1], S: [0, -1], SO: [-1, -1], O: [-1, 0], NO: [-1, 1]
  };
  const ADJ = { '0,1': 1, '1,1': 1, '1,0': 1, '1,-1': 1, '0,-1': 1, '-1,-1': 1, '-1,0': 1, '-1,1': 1 };

  const CLASSIQUES = [
    { id: 'pion', lettre: 'p', nom: 'Pion', base: 'p', desc: 'Avance d’une case (deux au premier coup si la règle est active), prend en diagonale, se promeut au bout.',
      cases: { '0,1': 1 }, lignes: {}, saute: false },
    { id: 'cavalier', lettre: 'n', nom: 'Cavalier', base: 'n', desc: 'Saute en « L » par-dessus les pièces.',
      cases: { '1,2': 1, '2,1': 1, '2,-1': 1, '1,-2': 1, '-1,-2': 1, '-2,-1': 1, '-2,1': 1, '-1,2': 1 }, lignes: {}, saute: true },
    { id: 'fou', lettre: 'b', nom: 'Fou', base: 'b', desc: 'Va tout droit en diagonale, bloqué par les pièces.',
      cases: {}, lignes: { NE: 1, SE: 1, SO: 1, NO: 1 }, saute: false },
    { id: 'tour', lettre: 'r', nom: 'Tour', base: 'r', desc: 'Va tout droit en ligne, bloquée par les pièces.',
      cases: {}, lignes: { N: 1, E: 1, S: 1, O: 1 }, saute: false },
    { id: 'dame', lettre: 'q', nom: 'Dame', base: 'q', desc: 'Va tout droit dans les 8 directions, bloquée par les pièces.',
      cases: {}, lignes: { N: 1, NE: 1, E: 1, SE: 1, S: 1, SO: 1, O: 1, NO: 1 }, saute: false },
    { id: 'roi', lettre: 'k', nom: 'Roi', base: 'k', desc: 'Une case dans toutes les directions. Pièce royale : il ne faut pas le perdre.',
      cases: Object.assign({}, ADJ), lignes: {}, saute: false }
  ].map((p) => Object.assign(p, { classique: true, categorie: 'Classiques', marque: '' }));

  // Ancien format (sauts / glisses) -> nouveau format.
  function convertir(p) {
    if (p.cases) return p;
    const cases = {}, lignes = {};
    for (const k in p.sauts || {}) if (p.sauts[k]) cases[k] = 1;
    for (const k in p.glisses || {}) {
      if (!p.glisses[k] || !DIRS[k]) continue;
      if (!p.portee) lignes[k] = 1;
      else { const [dx, dy] = DIRS[k]; for (let i = 1; i <= Math.min(3, p.portee); i++) cases[(dx * i) + ',' + (dy * i)] = 1; }
    }
    return { id: p.id, nom: p.nom, categorie: p.categorie, base: p.base, marque: p.marque, cases, lignes, saute: true };
  }

  function lire() {
    let l = null;
    try { l = JSON.parse(localStorage.getItem(CLE)); } catch (e) { l = null; }
    if (!Array.isArray(l)) l = [];
    // les personnages d'exemple ne font plus partie du jeu
    const propre = l.filter((p) => !String(p.id).startsWith('ex_')).map(convertir);
    if (propre.length !== l.length || l.some((p) => !p.cases)) localStorage.setItem(CLE, JSON.stringify(propre));
    return propre;
  }
  function ecrire(l) { localStorage.setItem(CLE, JSON.stringify(l)); }

  // ---------- notation Betza ----------
  const ATOMES = { '1,0': 'W', '1,1': 'F', '2,0': 'D', '2,1': 'N', '2,2': 'A', '3,0': 'H', '3,1': 'C', '3,2': 'Z', '3,3': 'G' };
  const BLOCABLES = { D: 1, A: 1, N: 1, Z: 1 }; // formes que le moteur sait « bloquer » (préfixe n)
  function atome(dx, dy) {
    return ATOMES[Math.max(Math.abs(dx), Math.abs(dy)) + ',' + Math.min(Math.abs(dx), Math.abs(dy))];
  }
  function direction(dx, dy) {
    const a = Math.max(Math.abs(dx), Math.abs(dy)), b = Math.min(Math.abs(dx), Math.abs(dy));
    const v = dy > 0 ? 'f' : 'b', h = dx > 0 ? 'r' : 'l';
    if (b === 0) return dx === 0 ? v : h;
    if (a === b) return v + h;
    return Math.abs(dx) > Math.abs(dy) ? v + h : h + v; // convention de Fairy-Stockfish pour les « L »
  }
  const DIR_BETZA = { N: ['f', 'R', 'W'], S: ['b', 'R', 'W'], E: ['r', 'R', 'W'], O: ['l', 'R', 'W'], NE: ['fr', 'B', 'F'], NO: ['fl', 'B', 'F'], SE: ['br', 'B', 'F'], SO: ['bl', 'B', 'F'] };
  function dirDe(dx, dy) {
    if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return null;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    return Object.keys(DIRS).find((k) => DIRS[k][0] === sx && DIRS[k][1] === sy) || null;
  }

  // Portée de la grille de création : 7 cases de chaque côté (plateau de 15 × 15).
  const PORTEE = 7;
  // Une case est jouable si elle est en ligne droite / diagonale, ou à 3 cases au plus (formes en « L »).
  function caseJouable(dx, dy) {
    return dirDe(dx, dy) != null || Math.max(Math.abs(dx), Math.abs(dy)) <= 3;
  }

  // Renvoie { betza, avertis : { "dx,dy": 'saute' | 'bloque' | 'ignore' } }
  //  saute  : il saute quand même (le moteur ne sait pas bloquer ce déplacement)
  //  bloque : il est bloqué quand même (au-delà de 3 cases en ligne, le moteur ne sait pas sauter)
  //  ignore : impossible (choisis aussi les cases d'avant sur cette ligne)
  function analyser(p) {
    let s = '';
    const avertis = {};
    const lignes = p.lignes || {};
    const cas = p.cases || {};
    for (const k in lignes) if (lignes[k] && DIR_BETZA[k]) s += DIR_BETZA[k][0] + DIR_BETZA[k][1];
    const cases = Object.keys(cas).filter((k) => cas[k]).map((k) => k.split(',').map(Number));
    const couvert = (dx, dy) => { const d = dirDe(dx, dy); return !!(d && lignes[d]); };
    // suite continue de cases depuis la pièce, dans chaque direction
    const suite = {};
    for (const k in DIRS) {
      const [sx, sy] = DIRS[k];
      let m = 0;
      while (m < PORTEE && cas[(sx * (m + 1)) + ',' + (sy * (m + 1))]) m++;
      suite[k] = m;
    }
    const faits = new Set();
    if (p.saute) {
      // au-delà de 3 cases en ligne : glissade (bloquée), seulement si la ligne est continue
      for (const k in DIRS) {
        if (lignes[k] || suite[k] <= 3) continue;
        s += DIR_BETZA[k][0] + DIR_BETZA[k][2] + suite[k];
      }
      for (const [dx, dy] of cases) {
        const cle = dx + ',' + dy;
        if (couvert(dx, dy)) continue;
        const at = atome(dx, dy);
        if (at) { s += direction(dx, dy) + at; continue; }
        const d = dirDe(dx, dy);
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        if (d && dist <= suite[d]) avertis[cle] = 'bloque';
        else avertis[cle] = 'ignore';
      }
      return { betza: s, avertis };
    }
    for (const k in DIRS) {
      if (lignes[k] || !suite[k]) continue;
      const [sx, sy] = DIRS[k];
      s += DIR_BETZA[k][0] + DIR_BETZA[k][2] + (suite[k] > 1 ? suite[k] : '');
      for (let i = 1; i <= suite[k]; i++) faits.add((sx * i) + ',' + (sy * i));
    }
    for (const [dx, dy] of cases) {
      const cle = dx + ',' + dy;
      if (faits.has(cle) || couvert(dx, dy)) continue;
      const at = atome(dx, dy);
      if (!at) { avertis[cle] = 'ignore'; continue; }
      if (BLOCABLES[at]) s += 'n' + direction(dx, dy) + at;
      else { s += direction(dx, dy) + at; avertis[cle] = 'saute'; }
    }
    return { betza: s, avertis };
  }
  function betza(p) { return analyser(p).betza; }

  function description(p) {
    if (p.classique) return p.desc;
    const nC = Object.values(p.cases || {}).filter(Boolean).length;
    const nL = Object.values(p.lignes || {}).filter(Boolean).length;
    const m = [];
    if (nC) m.push('va sur ' + nC + ' case' + (nC > 1 ? 's' : ''));
    if (nL) m.push('continue tout droit dans ' + nL + ' direction' + (nL > 1 ? 's' : ''));
    if (!m.length) return 'Il ne bouge pas encore : clique des cases.';
    let t = 'Il ' + m.join(' et ') + '. ' + (p.saute ? 'Il saute par-dessus les pièces.' : 'Il est bloqué par les pièces.');
    const a = Object.values(analyser(p).avertis);
    if (a.includes('saute')) t += ' ⚠ jaune : il saute quand même.';
    if (a.includes('bloque')) t += ' ⚠ orange : au-delà de 3 cases, il est bloqué quand même.';
    if (a.includes('ignore')) t += ' ✖ rouge : impossible, choisis aussi les cases d’avant sur la ligne.';
    return t;
  }

  const Persos = {
    DIRS, CLASSIQUES, PORTEE, caseJouable, betza, analyser, description,
    tous() { return CLASSIQUES.map((p) => Object.assign({}, p)).concat(lire()); },
    crees: lire,
    trouver(id) { return this.tous().find((p) => p.id === id) || null; },
    categories() {
      const c = [];
      for (const p of this.tous()) if (!c.includes(p.categorie)) c.push(p.categorie);
      return c;
    },
    enregistrer(p) {
      if (p.classique) return;
      const l = lire().filter((x) => x.id !== p.id);
      l.push(p);
      ecrire(l);
    },
    supprimer(id) { ecrire(lire().filter((x) => x.id !== id)); },
    nouveauId() { return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36); },
    // Personnages possibles pour une case « au hasard » : liste d'identifiants choisis (jamais le roi).
    pool(choix) {
      if (Array.isArray(choix)) return choix.map((id) => this.trouver(id)).filter((p) => p && p.id !== 'roi' && p.base !== 'k');
      return this.tous().filter((p) => p.id !== 'roi' && p.base !== 'k' && p.id !== 'pion' && (!choix || p.categorie === choix));
    },
    apparence(p) {
      return { base: p.base || 'q', marque: p.classique ? '' : (p.marque || ''), nom: p.nom, desc: description(p) };
    }
  };
  window.Persos = Persos;
})();
