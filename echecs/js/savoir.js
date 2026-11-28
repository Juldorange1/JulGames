/* Ce que le jeu « sait » en plus du calcul de Stockfish :
   - le livre d'ouvertures (hors ligne) : 3 865 ouvertures de Lichess (moteurs/ouvertures/livre.json, CC0) ;
   - les parties de maîtres (en ligne, explorer.lichess.ovh) : ce que jouent les meilleurs joueurs du monde ;
   - les analyses très profondes de Lichess (en ligne, cloud-eval) : positions déjà calculées à profondeur 30 à 60 ;
   - les tables de finales (en ligne, tablebase.lichess.ovh) : résultat parfait à 7 pièces ou moins.
   Sans internet, tout continue avec le livre et Stockfish. */
(function () {
  'use strict';

  let livre = null, promesse = null;
  function charger() {
    if (!promesse) promesse = fetch('moteurs/ouvertures/livre.json').then((r) => r.json()).then((j) => { livre = j; }).catch(() => { livre = {}; });
    return promesse;
  }
  const cle = (fen) => fen.trim().split(/\s+/).slice(0, 4).join(' ');
  // nom de l'ouverture si la position est dans le livre
  function ouverture(fen) { const x = livre && livre[cle(fen)]; return x && x[1] ? { eco: x[0], nom: nomFr(x[1]), nomEn: x[1] } : null; }

  // ---------- noms des ouvertures en français (le livre est en anglais) ----------
  const FAMILLES = {
    'Sicilian Defense': 'Défense sicilienne', 'Ruy Lopez': 'Partie espagnole', 'French Defense': 'Défense française',
    "Queen's Gambit": 'Gambit dame', 'Italian Game': 'Partie italienne', 'English Opening': 'Ouverture anglaise',
    "King's Gambit": 'Gambit du roi', "King's Indian Defense": 'Défense est-indienne', 'Caro-Kann Defense': 'Défense Caro-Kann',
    'Nimzo-Indian Defense': 'Défense nimzo-indienne', "Queen's Pawn Game": 'Partie du pion dame', 'Semi-Slav Defense': 'Défense semi-slave',
    'Dutch Defense': 'Défense hollandaise', 'Benoni Defense': 'Défense Benoni', 'Grünfeld Defense': 'Défense Grünfeld',
    "Queen's Indian Defense": 'Défense ouest-indienne', 'Alekhine Defense': 'Défense Alekhine', 'Indian Defense': 'Défense indienne',
    'Scotch Game': 'Partie écossaise', 'Slav Defense': 'Défense slave', "Petrov's Defense": 'Défense Petrov (défense russe)',
    'Four Knights Game': 'Partie des quatre cavaliers', 'Scandinavian Defense': 'Défense scandinave', "Bishop's Opening": 'Ouverture du fou',
    'Vienna Game': 'Partie viennoise', 'Vienna Gambit': 'Gambit viennois', 'Modern Defense': 'Défense moderne', "King's Pawn Game": 'Partie du pion roi',
    'Catalan Opening': 'Ouverture catalane', 'Polish Opening': 'Ouverture polonaise', 'Neo-Grünfeld Defense': 'Défense néo-Grünfeld',
    'Bogo-Indian Defense': 'Défense bogo-indienne', 'Hungarian Opening': 'Ouverture hongroise', "King's Indian Attack": 'Attaque est-indienne',
    'Center Game': 'Partie du centre', 'Latvian Gambit': 'Gambit letton', 'Old Indian Defense': 'Défense vieille-indienne',
    'Danish Gambit': 'Gambit danois', 'Three Knights Opening': 'Partie des trois cavaliers', 'London System': 'Système de Londres',
    'Elephant Gambit': 'Gambit de l’éléphant', "King's Pawn Opening": 'Ouverture du pion roi', 'Portuguese Opening': 'Ouverture portugaise',
    "King's Knight Opening": 'Ouverture du cavalier roi', 'English Defense': 'Défense anglaise', 'English Orangutan': 'Ouverture orang-outan',
    'Polish Defense': 'Défense polonaise', 'Hippopotamus Defense': 'Défense hippopotame', 'Mexican Defense': 'Défense mexicaine',
    'Czech Defense': 'Défense tchèque', 'Australian Defense': 'Défense australienne', 'East Indian Defense': 'Défense est-indienne',
    "Pseudo Queen's Indian Defense": 'Défense pseudo-ouest-indienne', "Queen's Indian Accelerated": 'Défense ouest-indienne accélérée',
    'Rat Defense': 'Défense du rat', 'Lion Defense': 'Défense du lion', 'Kangaroo Defense': 'Défense kangourou', 'Vulture Defense': 'Défense du vautour',
    'Fried Fox Defense': 'Défense du renard frit', 'Lemming Defense': 'Défense lemming', 'Pterodactyl Defense': 'Défense ptérodactyle',
    'Creepy Crawly Formation': 'Formation « rampante »', 'Global Opening': 'Ouverture globale', 'Valencia Opening': 'Ouverture de Valence',
    'Saragossa Opening': 'Ouverture de Saragosse', 'Basque Opening': 'Ouverture basque', 'Irish Gambit': 'Gambit irlandais', 'Slav Indian': 'Slave indienne',
    "Queen's Pawn": 'Pion dame', 'Amazon Attack': 'Attaque amazone', 'Sodium Attack': 'Attaque sodium', 'Bongcloud Attack': 'Attaque Bongcloud',
    'Formation': 'Formation'
  };
  const GENRE_F = /^(Défense|Partie|Ouverture|Attaque|Formation)/;
  const MOTS = {
    Exchange: 'd’échange', Advance: 'd’avance', Classical: 'classique', Modern: 'moderne', Closed: 'fermée', Open: 'ouverte', Main: 'principale',
    Accelerated: 'accélérée', Deferred: 'différée', Normal: 'normale', Old: 'ancienne', Symmetrical: 'symétrique', Reversed: 'inversée',
    Hedgehog: 'hérisson', Poisoned: 'empoisonné', Pawn: 'pion', Knight: 'cavalier', Knights: 'cavaliers', Bishop: 'fou', Rook: 'tour', Queen: 'dame',
    King: 'roi', Two: 'deux', Three: 'trois', Four: 'quatre', Five: 'cinq', with: 'avec', and: 'et', the: 'le', of: 'de', Fianchetto: 'fianchetto',
    Countergambit: 'contre-gambit', Counterattack: 'contre-attaque', Retreat: 'retraite', Center: 'centre', Wing: 'aile', Defense: 'défense',
    Attack: 'attaque', Gambit: 'gambit', Variation: 'variante', Line: 'ligne', System: 'système', Opening: 'ouverture', Game: 'partie',
    Accepted: 'accepté', Declined: 'refusé', Refused: 'refusé', Berlin: 'berlinoise', Spanish: 'espagnole', Italian: 'italienne', French: 'française',
    English: 'anglaise', Dutch: 'hollandaise', Russian: 'russe', Swiss: 'suisse', Polish: 'polonaise', Hungarian: 'hongroise', Austrian: 'autrichienne',
    Scotch: 'écossaise', Indian: 'indienne', Slav: 'slave', Dragon: 'dragon', Yugoslav: 'yougoslave', Quiet: 'calme', Sharp: 'tranchante',
    Short: 'courte', Long: 'longue', Early: 'précoce', Delayed: 'retardée', Improved: 'améliorée', Lines: 'lignes', Variations: 'variantes',
    "Bishop's": 'du fou', "King's": 'du roi', "Queen's": 'de la dame', "Knight's": 'du cavalier', Kingside: 'côté roi', Queenside: 'côté dame', Castle: 'roque', Castling: 'roque', Wild: 'sauvage', Double: 'double', Little: 'petit', Big: 'grand'
  };
  const TETES = [[/ Variation$/, 'variante'], [/ Attack$/, 'attaque'], [/ Countergambit$/, 'contre-gambit'], [/ Gambit$/, 'gambit'], [/ Line$/, 'ligne'],
    [/ System$/, 'système'], [/ Defense$/, 'défense'], [/ Opening$/, 'ouverture'], [/ Game$/, 'partie'], [/ Trap$/, 'piège'], [/ Formation$/, 'formation']];
  const LETTRES = { N: 'C', B: 'F', R: 'T', Q: 'D', K: 'R' };
  const motFr = (w) => (/^[NBRQK][a-h]?[1-8]?x?[a-h][1-8][+#]?$/.test(w) ? LETTRES[w[0]] + w.slice(1) : MOTS[w] || w.replace(/'s$/, ''));
  function partieFr(t) {
    t = t.trim();
    if (/^Main Line$/i.test(t)) return 'ligne principale';
    if (/^with /.test(t)) return 'avec ' + partieFr(t.slice(5));
    const acc = t.match(/ (Accepted|Declined)$/);
    if (acc) return partieFr(t.slice(0, -acc[0].length)) + (acc[1] === 'Accepted' ? ' accepté' : ' refusé');
    for (const [re, mot] of TETES) if (re.test(t)) { const reste = t.replace(re, ''); return mot + (reste ? ' ' + reste.split(/\s+/).map(motFr).join(' ') : ''); }
    return t.split(/\s+/).map(motFr).join(' ');
  }
  function familleFr(f) {
    const m = f.match(/ (Accepted|Declined)$/);
    if (m) f = f.slice(0, -m[0].length);
    let fr = FAMILLES[f];
    if (!fr) {
      const g = f.match(/^(.+) (Defense|Opening|Game|Gambit|Attack|System|Countergambit)$/);
      fr = g ? { Defense: 'Défense', Opening: 'Ouverture', Game: 'Partie', Gambit: 'Gambit', Attack: 'Attaque', System: 'Système', Countergambit: 'Contre-gambit' }[g[2]] + ' ' + g[1].replace(/'s$/, '') : f;
    }
    return fr + (m ? (m[1] === 'Accepted' ? ' accepté' : ' refusé') + (GENRE_F.test(fr) ? 'e' : '') : '');
  }
  function nomFr(nom) {
    try {
      const [fam, ...reste] = nom.split(':');
      const morceaux = fam.split(',');
      const parties = morceaux.slice(1).concat(reste.join(':').split(',')).map((x) => x.trim()).filter(Boolean);
      return familleFr(morceaux[0].trim()) + (parties.length ? ' : ' + parties.map(partieFr).join(', ') : '');
    } catch (e) { return nom; }
  }
  // coups de la théorie depuis cette position (livre hors ligne)
  function coupsLivre(fen) { const x = livre && livre[cle(fen)]; return x ? x[2].slice() : []; }

  // ---------- services en ligne (jamais plus de 3 s ; pause d'une minute si Lichess demande d'attendre) ----------
  let pauseJusqua = 0;
  async function lire(url) {
    if (Date.now() < pauseJusqua || !navigator.onLine) return null;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const minut = setTimeout(() => ctrl && ctrl.abort(), 3000);
    try {
      const r = await fetch(url, ctrl ? { signal: ctrl.signal } : {});
      if (r.status === 429) { pauseJusqua = Date.now() + 61000; return null; }
      if (r.status === 404) return { absent: true };
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; } finally { clearTimeout(minut); }
  }

  // Les coups UCI de Lichess écrivent le roque « roi prend sa tour » (e1h1) : on les remet en e1g1.
  function remettreRoques(fen, coups) {
    const out = [];
    let p = null;
    try {
      p = new window.Regles.Partie(window.Config.variante(), fen, []);
      for (const u of coups) {
        let x = u;
        if (!p.legaux().includes(x)) {
          const m = { e1h1: 'e1g1', e1a1: 'e1c1', e8h8: 'e8g8', e8a8: 'e8c8' }[u];
          if (!m || !p.legaux().includes(m)) break;
          x = m;
        }
        p.jouer(x); out.push(x);
      }
    } catch (e) { /* rien */ }
    if (p) p.detruire();
    return out;
  }

  // Parties de maîtres : { total, coups: [{ uci, n, score }] } ; score = points moyens pour le camp au trait (0 à 1).
  const cacheM = {};
  async function maitres(fen) {
    const k = cle(fen);
    if (k in cacheM) return cacheM[k];
    const d = await lire('https://explorer.lichess.ovh/masters?fen=' + encodeURIComponent(fen) + '&moves=12&topGames=0');
    if (!d || !d.moves) return null;
    const blanc = fen.split(/\s+/)[1] !== 'b';
    const total = (d.white || 0) + (d.draws || 0) + (d.black || 0);
    const coups = d.moves.map((m) => {
      const n = m.white + m.draws + m.black;
      const g = blanc ? m.white : m.black;
      return { uci: remettreRoques(fen, [m.uci])[0] || m.uci, n, score: n ? (g + m.draws / 2) / n : 0.5, san: m.san };
    }).filter((m) => m.n > 0);
    cacheM[k] = { total, coups };
    return cacheM[k];
  }

  // Analyse profonde de Lichess : { profondeur, lignes: [{ score (vu du camp au trait), pv, profondeur }] } ou null.
  const cacheN = {};
  async function nuage(fen, multipv) {
    const k = cle(fen) + '|' + multipv;
    if (k in cacheN) return cacheN[k];
    const d = await lire('https://lichess.org/api/cloud-eval?fen=' + encodeURIComponent(fen) + '&multiPv=' + multipv);
    if (d && d.absent) { cacheN[k] = null; return null; }
    if (!d || !d.pvs || !d.pvs.length) return null;
    const blanc = fen.split(/\s+/)[1] !== 'b';
    const lignes = d.pvs.map((x) => {
      const s = x.mate != null ? { mate: blanc ? x.mate : -x.mate } : { cp: blanc ? x.cp : -x.cp };
      return { score: s, pv: remettreRoques(fen, x.moves.split(' ').slice(0, 12)), profondeur: d.depth, multipv: 1 };
    }).filter((l) => l.pv.length);
    lignes.forEach((l, i) => { l.multipv = i + 1; });
    cacheN[k] = lignes.length ? { profondeur: d.depth, lignes } : null;
    return cacheN[k];
  }

  // Tables de finales (7 pièces ou moins) : le meilleur coup exact, ou null.
  async function finale(fen) {
    const plac = fen.split(' ')[0];
    if ((plac.match(/[a-z]/gi) || []).length > 7 || (fen.split(' ')[2] || '-') !== '-') return null;
    const d = await lire('https://tablebase.lichess.ovh/standard?fen=' + encodeURIComponent(fen));
    if (!d || !d.moves || !d.moves.length || !d.category || d.category === 'unknown') return null;
    return { categorie: d.category, coup: remettreRoques(fen, [d.moves[0].uci])[0] || null };
  }

  window.Savoir = { nomFr, charger, ouverture, coupsLivre, maitres, nuage, finale };
})();
