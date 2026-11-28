/* Coach : explique POURQUOI le meilleur coup est le meilleur.
   Le moteur donne les meilleurs coups, leurs suites et la menace adverse ; ce module regarde la position
   comme un professeur (pièces en prise, fourchettes, clouages, échecs, centre, développement…)
   et raconte tout en petites étapes, avec des dessins sur le plateau. */
(function () {
  'use strict';

  // =====================================================================
  //  PETIT ÉCHIQUIER CLASSIQUE (pour reconnaître les idées)
  // =====================================================================
  const FI = 'abcdefgh';
  const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 50 };
  const NOM = { p: 'pion', n: 'cavalier', b: 'fou', r: 'tour', q: 'dame', k: 'roi' };
  const LE = { p: 'le pion', n: 'le cavalier', b: 'le fou', r: 'la tour', q: 'la dame', k: 'le roi' };
  const UN = { p: 'un pion', n: 'un cavalier', b: 'un fou', r: 'une tour', q: 'la dame', k: 'le roi' };
  const DU = { p: 'du pion', n: 'du cavalier', b: 'du fou', r: 'de la tour', q: 'de la dame', k: 'du roi' };

  const col = (s) => s & 7, rg = (s) => s >> 3;
  const nomCase = (s) => FI[col(s)] + (rg(s) + 1);
  const lireCase = (n) => FI.indexOf(n[0]) + 8 * (+n.slice(1) - 1);
  const coul = (ch) => (ch === ch.toUpperCase() ? 'w' : 'b');
  const typ = (ch) => ch.toLowerCase();
  const autre = (c) => (c === 'w' ? 'b' : 'w');
  const campNom = (c) => (c === 'w' ? 'les blancs' : 'les noirs');
  const CampNom = (c) => (c === 'w' ? 'Les blancs' : 'Les noirs');
  const aux = (c) => (c === 'w' ? 'aux blancs' : 'aux noirs');
  const des = (c) => (c === 'w' ? 'des blancs' : 'des noirs');
  const Maj = (x) => x[0].toUpperCase() + x.slice(1);
  const pieceEn = (b, s) => LE[typ(b[s])] + ' ' + nomCase(s);
  const fem = (t) => t === 'r' || t === 'q';

  function lire(fen) {
    const ch = fen.trim().split(/\s+/);
    const b = new Array(64).fill(null);
    const rangs = ch[0].split('/');
    for (let r = 0; r < 8; r++) {
      let c = 0;
      for (const x of rangs[r]) {
        if (/\d/.test(x)) c += +x;
        else { b[(7 - r) * 8 + c] = x; c++; }
      }
    }
    return { b, t: ch[1] === 'b' ? 'b' : 'w', coup: +ch[5] || 1, roques: ch[2] || '-' };
  }

  const DIRS = { b: [[1, 1], [1, -1], [-1, 1], [-1, -1]], r: [[1, 0], [-1, 0], [0, 1], [0, -1]] };
  DIRS.q = DIRS.b.concat(DIRS.r);
  const SAUTS = { n: [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]], k: DIRS.q };
  const dans = (c, r) => c >= 0 && c < 8 && r >= 0 && r < 8;

  // cases attaquées par la pièce posée en s
  function attaques(b, s) {
    const p = b[s]; if (!p) return [];
    const t = typ(p), c = col(s), r = rg(s), out = [];
    if (t === 'p') {
      const d = coul(p) === 'w' ? 1 : -1;
      for (const dc of [-1, 1]) if (dans(c + dc, r + d)) out.push((r + d) * 8 + c + dc);
    } else if (SAUTS[t]) {
      for (const [dc, dr] of SAUTS[t]) if (dans(c + dc, r + dr)) out.push((r + dr) * 8 + c + dc);
    } else {
      for (const [dc, dr] of DIRS[t]) {
        let x = c + dc, y = r + dr;
        while (dans(x, y)) { out.push(y * 8 + x); if (b[y * 8 + x]) break; x += dc; y += dr; }
      }
    }
    return out;
  }
  function attaquants(b, s, c) {
    const out = [];
    for (let i = 0; i < 64; i++) if (b[i] && coul(b[i]) === c && attaques(b, i).includes(s)) out.push(i);
    return out;
  }
  function moinsCher(b, s, c) {
    let best = -1;
    for (const a of attaquants(b, s, c)) if (best < 0 || V[typ(b[a])] < V[typ(b[best])]) best = a;
    return best;
  }
  const roiDe = (b, c) => b.findIndex((x) => x === (c === 'w' ? 'K' : 'k'));
  const enEchec = (b, c) => { const k = roiDe(b, c); return k >= 0 && attaquants(b, k, autre(c)).length > 0; };

  // échange sur la case « vers » commencé par la pièce en « de » : gain en pions pour celui qui commence
  function see(b0, de, vers) {
    const b = b0.slice();
    const gain = [b[vers] ? V[typ(b[vers])] : 0];
    let sur = b[de];
    b[vers] = sur; b[de] = null;
    let cote = autre(coul(sur));
    let d = 0;
    for (;;) {
      const a = moinsCher(b, vers, cote);
      if (a < 0) break;
      if (typ(b[a]) === 'k' && moinsCher(b, vers, autre(cote)) >= 0) break;
      d++;
      gain[d] = V[typ(sur)] - gain[d - 1];
      sur = b[a]; b[vers] = sur; b[a] = null;
      cote = autre(cote);
    }
    while (d > 0) { gain[d - 1] = -Math.max(-gain[d - 1], gain[d]); d--; }
    return gain[0];
  }

  // ce que le camp c pourrait gagner tout de suite s'il jouait (pièces adverses mal protégées)
  function menaces(b, c) {
    const out = [];
    for (let s = 0; s < 64; s++) {
      const p = b[s];
      if (!p || coul(p) === c || typ(p) === 'k') continue;
      let best = 0, par = -1;
      for (const a of attaquants(b, s, c)) {
        if (typ(b[a]) === 'k' && attaquants(b, s, autre(c)).length) continue;
        const g = see(b, a, s);
        if (g > best) { best = g; par = a; }
      }
      if (best > 0) out.push({ s, gain: best, par });
    }
    return out;
  }

  // clouages et enfilades faits par le camp c
  function clouages(b, c) {
    const out = [];
    for (let s = 0; s < 64; s++) {
      const p = b[s];
      if (!p || coul(p) !== c || !DIRS[typ(p)]) continue;
      for (const [dc, dr] of DIRS[typ(p)]) {
        let x = col(s) + dc, y = rg(s) + dr, premier = -1;
        while (dans(x, y)) {
          const q = y * 8 + x;
          if (b[q]) {
            if (coul(b[q]) === c) break;
            if (premier < 0) premier = q;
            else {
              const tA = typ(b[premier]), tB = typ(b[q]);
              // si la pièce de devant s'en va, prendre celle de derrière doit vraiment rapporter
              const sans = b.slice(); sans[premier] = null;
              const gainDerriere = tB === 'k' ? 99 : see(sans, s, q);
              const devantMenace = tA === 'k' || V[tA] > V[typ(p)] || !attaquants(b, premier, autre(c)).length;
              if (tB === 'k') { if (tA !== 'k') out.push({ par: s, devant: premier, derriere: q, sorte: 'absolu' }); }
              else if ((tA === 'k' || V[tA] > V[tB]) && devantMenace && gainDerriere > 0) out.push({ par: s, devant: premier, derriere: q, sorte: 'enfilade' });
              else if (V[tB] > V[tA] && gainDerriere > 0) out.push({ par: s, devant: premier, derriere: q, sorte: 'relatif' });
              break;
            }
          }
          x += dc; y += dr;
        }
      }
    }
    return out;
  }

  // joue un coup UCI sur une copie (roque, prise en passant, promotion)
  function jouer(P, uci) {
    const b = P.b.slice();
    const de = lireCase(uci.slice(0, 2)), vers = lireCase(uci.slice(2, 4)), promo = uci[4];
    const p = b[de];
    if (!p) return null;
    let prise = b[vers] && coul(b[vers]) !== coul(p) ? typ(b[vers]) : null, roque = null, priseCase = prise ? vers : -1;
    if (typ(p) === 'k' && ((b[vers] && coul(b[vers]) === coul(p) && typ(b[vers]) === 'r') || Math.abs(col(vers) - col(de)) === 2)) {
      // roque (aussi le roque du 960 : le roi « prend » sa tour)
      const cote = col(vers) > col(de) ? 'petit' : 'grand';
      const r0 = rg(de) * 8;
      let tour = b[vers] && typ(b[vers]) === 'r' ? vers : (cote === 'petit' ? r0 + 7 : r0);
      if (!(b[tour] && typ(b[tour]) === 'r')) { for (let i = r0; i < r0 + 8; i++) if (b[i] && typ(b[i]) === 'r' && coul(b[i]) === coul(p) && (cote === 'petit' ? i > de : i < de)) tour = i; }
      const T = b[tour];
      b[de] = null; b[tour] = null;
      b[r0 + (cote === 'petit' ? 6 : 2)] = p; b[r0 + (cote === 'petit' ? 5 : 3)] = T;
      return { b, t: autre(P.t), coup: P.coup + (P.t === 'b' ? 1 : 0), prise: null, roque: cote, de, vers: r0 + (cote === 'petit' ? 6 : 2), piece: 'k' };
    }
    if (typ(p) === 'p' && col(de) !== col(vers) && !b[vers]) { priseCase = rg(de) * 8 + col(vers); prise = 'p'; b[priseCase] = null; }
    b[vers] = promo ? (coul(p) === 'w' ? promo.toUpperCase() : promo.toLowerCase()) : p;
    b[de] = null;
    return { b, t: autre(P.t), coup: P.coup + (P.t === 'b' ? 1 : 0), prise, priseCase, roque, de, vers, piece: typ(p), promo: promo || null };
  }

  function materiel(b) {
    const m = { w: 0, b: 0 };
    for (const p of b) if (p && typ(p) !== 'k') m[coul(p)] += V[typ(p)];
    return m;
  }
  function comptes(b) {
    const c = { w: {}, b: {} };
    for (const p of b) if (p && typ(p) !== 'k') c[coul(p)][typ(p)] = (c[coul(p)][typ(p)] || 0) + 1;
    return c;
  }
  const mobilite = (b, s) => attaques(b, s).filter((q) => !b[q] || coul(b[q]) !== coul(b[s])).length;
  const CENTRE = [27, 28, 35, 36];
  const controleCentre = (b, c) => CENTRE.reduce((n, q) => n + attaquants(b, q, c).length, 0);
  function zoneRoi(b, c) {
    const k = roiDe(b, c); if (k < 0) return [];
    const out = [];
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) if (dans(col(k) + dc, rg(k) + dr)) out.push((rg(k) + dr) * 8 + col(k) + dc);
    return out;
  }
  const pressionRoi = (b, c) => zoneRoi(b, autre(c)).reduce((n, q) => n + attaquants(b, q, c).length, 0);
  function pionPasse(b, s) {
    const p = b[s]; if (!p || typ(p) !== 'p') return false;
    const c = coul(p), d = c === 'w' ? 1 : -1;
    for (let y = rg(s) + d; y >= 0 && y < 8; y += d) {
      for (const dc of [-1, 0, 1]) {
        const x = col(s) + dc;
        if (dans(x, y) && b[y * 8 + x] === (c === 'w' ? 'p' : 'P')) return false;
      }
    }
    return true;
  }
  const pionsColonne = (b, x, c) => { let n = 0; for (let y = 0; y < 8; y++) if (b[y * 8 + x] === (c === 'w' ? 'P' : 'p')) n++; return n; };
  function avantPoste(b, s) {
    const p = b[s]; if (!p) return false;
    const c = coul(p), r = c === 'w' ? rg(s) : 7 - rg(s);
    if (r < 3 || r > 5) return false;
    const protege = attaquants(b, s, c).some((a) => typ(b[a]) === 'p');
    if (!protege) return false;
    const d = c === 'w' ? 1 : -1;
    for (const dc of [-1, 1]) {
      const x = col(s) + dc; if (x < 0 || x > 7) continue;
      for (let y = rg(s) + d; y >= 0 && y < 8; y += d) if (b[y * 8 + x] === (c === 'w' ? 'p' : 'P')) return false;
    }
    return true;
  }
  const finale = (b) => { const m = materiel(b); return m.w + m.b - b.filter((p) => p && typ(p) === 'p').length <= 14; };

  // =====================================================================
  //  NOTIONS (le petit dictionnaire du coach)
  // =====================================================================
  const NOTIONS = {
    valeur: ['Valeur des pièces', 'Pion = 1, cavalier = 3, fou = 3, tour = 5, dame = 9. Une évaluation de +1,0 veut dire environ un pion d’avance.'],
    'en-prise': ['Pièce en prise', 'Une pièce attaquée qui n’est pas assez défendue : l’adversaire peut la prendre sans rien perdre. Avant chaque coup, regarde ce qui est attaqué !'],
    echange: ['Échange', 'On prend une pièce et l’adversaire reprend une pièce de même valeur. Compte toujours les attaquants et les défenseurs de la case.'],
    sacrifice: ['Sacrifice', 'Donner du matériel exprès, pour gagner plus ensuite (mat, attaque, pièce plus grosse).'],
    fourchette: ['Fourchette', 'Une seule pièce attaque deux cibles à la fois : l’adversaire ne peut en sauver qu’une. Le cavalier est le roi des fourchettes.'],
    clouage: ['Clouage', 'Une pièce ne peut pas bouger sans laisser prendre une pièce plus importante cachée derrière elle. Contre le roi, elle n’a même pas le droit de bouger.'],
    enfilade: ['Enfilade', 'Le contraire du clouage : la pièce de devant, la plus précieuse, doit s’enlever… et celle de derrière tombe.'],
    decouverte: ['Attaque à la découverte', 'Une pièce bouge et ouvre la ligne d’une autre pièce, qui attaque à son tour. Deux menaces d’un coup !'],
    'echec-double': ['Échec double', 'Deux pièces donnent échec en même temps : la seule défense est de bouger le roi.'],
    echec: ['Échec avec gain de temps', 'Un échec oblige l’adversaire à répondre : il ne peut pas faire ce qu’il voulait. On s’en sert pour placer ses pièces ou pour gagner une pièce juste après.'],
    mat: ['Mat', 'Le roi est attaqué et n’a aucune case pour fuir, rien pour s’interposer ni prendre l’attaquant : la partie est finie.'],
    couloir: ['Mat du couloir', 'Le roi est enfermé sur sa dernière rangée par ses propres pions : une tour ou une dame qui arrive sur cette rangée fait mat.'],
    menace: ['Menace', 'Un coup qui prépare un gain (prendre une pièce, faire mat). Toujours se demander : « Que veut faire mon adversaire ? »'],
    defense: ['Défendre une pièce', 'Mettre à l’abri une pièce attaquée, la protéger par une autre, ou chasser l’attaquant.'],
    defenseur: ['Attaquer le défenseur', 'Si une pièce adverse est protégée par une seule autre, on attaque ou on échange ce protecteur : la pièce protégée devient prenable.'],
    surcharge: ['Défenseur surchargé', 'Une même pièce doit protéger deux choses à la fois : elle ne peut pas tout faire, une des deux tombe.'],
    developpement: ['Développement', 'Sortir ses cavaliers et ses fous au début de la partie, pour qu’ils participent au jeu. Une pièce restée chez elle ne sert à rien.'],
    centre: ['Contrôle du centre', 'Les cases d4, e4, d5, e5 : une pièce au centre va partout vite, et l’adversaire manque de place.'],
    roque: ['Roque', 'Met le roi à l’abri derrière ses pions et fait entrer la tour dans le jeu. À faire tôt en général.'],
    activite: ['Activité des pièces', 'Une pièce qui contrôle beaucoup de cases est forte ; une pièce coincée est presque inutile. Améliore ta pièce la moins active.'],
    'colonne-ouverte': ['Colonne ouverte', 'Une colonne sans pion : les tours et la dame y sont très fortes, elles visent le camp adverse.'],
    septieme: ['Tour en 7e rangée', 'Une tour sur l’avant-dernière rangée de l’adversaire attaque ses pions et enferme son roi.'],
    'avant-poste': ['Avant-poste', 'Une case avancée, protégée par un de tes pions, qu’aucun pion adverse ne peut attaquer. Un cavalier y est très fort.'],
    'pion-passe': ['Pion passé', 'Aucun pion adverse ne peut l’arrêter sur sa route : il menace d’aller à dame. Les pions passés doivent être poussés.'],
    promotion: ['Promotion', 'Un pion arrivé au bout du plateau devient une dame (ou une autre pièce).'],
    'roi-actif': ['Roi actif en finale', 'Quand il reste peu de pièces, le roi n’a plus peur : il devient une pièce forte et doit aller au centre.'],
    opposition: ['Opposition', 'Les deux rois face à face avec une case entre eux : celui qui ne doit PAS jouer gagne la bataille des cases.'],
    simplification: ['Simplifier', 'Quand on a plus de matériel, échanger des pièces rapproche de la victoire : l’adversaire a moins de chances de contre-attaque.'],
    'attaque-roi': ['Attaque sur le roi', 'Amener plus de pièces près du roi adverse qu’il n’a de défenseurs.'],
    tempo: ['Gagner un temps', 'Jouer un coup utile qui attaque en même temps : l’adversaire doit répondre au lieu de jouer son plan.'],
    prophylaxie: ['Prophylaxie', 'Empêcher le plan de l’adversaire avant qu’il ne commence.'],
    evaluation: ['Évaluation', 'Le chiffre du moteur : + bon pour les blancs, − bon pour les noirs. 1,0 ≈ un pion. « Mat en 3 » = mat forcé.']
  };

  // =====================================================================
  //  ANALYSE D'UN COUP (idées tactiques et positionnelles)
  // =====================================================================
  const C_COUP = 'rgba(90,200,90,0.9)', C_MENACE = 'rgba(235,70,70,0.85)', C_DEF = 'rgba(80,160,255,0.85)',
    C_ADV = 'rgba(240,150,50,0.9)', C_CLOU = 'rgba(190,110,255,0.85)', C_ZONE = 'rgba(255,215,0,0.35)';

  // Renvoie une liste d'idées { poids, texte, notion, dessin:[...] }, de la plus importante à la moins importante.
  function idees(P0, uci, o) {
    o = o || {};
    const P1 = jouer(P0, uci);
    if (!P1) return { P1: null, idees: [] };
    const S = P0.t, O = autre(S), b0 = P0.b, b1 = P1.b;
    const out = [];
    const ajouter = (poids, texte, notion, dessin) => out.push({ poids, texte, notion, dessin: dessin || [] });
    const d = P1.vers, t = P1.piece, piece = LE[t];
    const fleche = { de: nomCase(P1.de), vers: nomCase(d), couleur: C_COUP };

    // --- mat / échec
    const echec = enEchec(b1, O);
    const donneurs = echec ? attaquants(b1, roiDe(b1, O), S) : [];
    if (o.mat1) {
      const k = roiDe(b1, O);
      let couloir = false;
      if (k >= 0 && (rg(k) === 0 || rg(k) === 7) && donneurs.length === 1 && ['r', 'q'].includes(typ(b1[donneurs[0]])) && rg(donneurs[0]) === rg(k)) couloir = true;
      ajouter(100, 'C’est <b>échec et mat</b> ! Le roi ' + (O === 'w' ? 'blanc' : 'noir') + ' est attaqué et n’a plus aucune case.' +
        (couloir ? ' C’est un <b>mat du couloir</b> : ses propres pions l’empêchent de fuir.' : ''), couloir ? 'couloir' : 'mat',
        [fleche, { de: null, vers: nomCase(k), couleur: C_MENACE, carre: true }]);
      return { P1, idees: out };
    }
    if (donneurs.length >= 2) ajouter(60, 'C’est un <b>échec double</b> : deux pièces attaquent le roi, il est obligé de bouger.', 'echec-double',
      donneurs.map((a) => ({ de: nomCase(a), vers: nomCase(roiDe(b1, O)), couleur: C_MENACE })));
    else if (echec && donneurs[0] !== d) ajouter(55, 'C’est un <b>échec à la découverte</b> : ' + piece + ' bouge et ouvre la ligne ' + DU[typ(b1[donneurs[0]])] + ' ' + nomCase(donneurs[0]) + ' qui donne échec.', 'decouverte',
      [fleche, { de: nomCase(donneurs[0]), vers: nomCase(roiDe(b1, O)), couleur: C_MENACE }]);
    else if (echec) ajouter(20, 'Le coup donne <b>échec</b> : ' + campNom(O) + ' doivent s’en occuper tout de suite.', 'echec',
      [fleche, { de: nomCase(d), vers: nomCase(roiDe(b1, O)), couleur: C_MENACE }]);

    // --- prise
    if (P1.prise && o.repriseCase != null && P1.priseCase === o.repriseCase && V[P1.prise] <= (o.repriseValeur || 0)) {
      ajouter(26, Maj(piece) + ' <b>reprend ' + UN[P1.prise] + '</b> : l’échange est fini, le matériel redevient égal.', 'echange', [fleche]);
    } else if (P1.prise) {
      const pc = P1.priseCase;
      const defendue = attaquants(b0, pc, O).length > 0;
      const g = P1.priseCase === d ? see(b0, P1.de, d) : V.p;
      if (!defendue) ajouter(50 + V[P1.prise], piece[0].toUpperCase() + piece.slice(1) + ' prend <b>' + UN[P1.prise] + ' qui n’était pas défendu' + (['r', 'q'].includes(P1.prise) ? 'e' : '') + '</b> : une pièce <b>en prise</b>, gagnée gratuitement (+' + V[P1.prise] + ').', 'en-prise',
        [fleche, { de: null, vers: nomCase(pc), couleur: C_MENACE }]);
      else if (g >= V[P1.prise]) ajouter(45 + g, piece[0].toUpperCase() + piece.slice(1) + ' <b>gagne ' + UN[P1.prise] + '</b> : ' + campNom(O) + ' ne peuvent pas reprendre sans perdre plus.', 'valeur',
        [fleche, ...attaquants(b0, pc, O).map((a) => ({ de: nomCase(a), vers: nomCase(pc), couleur: C_ADV }))]);
      else if (g > 0) ajouter(45 + g, 'La prise gagne du matériel : ' + UN[P1.prise] + ' (' + V[P1.prise] + ') contre ' + piece.replace(/^(le|la) /, '') + ' (' + V[t] + ') si ' + campNom(O) + ' reprennent. Compte : <b>+' + g + '</b> au bout des échanges.', 'valeur',
        [fleche, ...attaquants(b0, pc, O).map((a) => ({ de: nomCase(a), vers: nomCase(pc), couleur: C_ADV }))]);
      else if (g === 0) {
        const m = materiel(b0), devant = m[S] - m[O];
        if (devant >= 2) ajouter(30, 'C’est un <b>échange</b> ' + UN[P1.prise] + ' contre ' + UN[t] + '. ' + CampNom(S) + ' ont déjà plus de matériel (+' + devant + ') : <b>simplifier</b> rapproche de la victoire.', 'simplification', [fleche]);
        else ajouter(25, 'C’est un <b>échange</b> : ' + UN[P1.prise] + ' contre ' + UN[t] + ' (même valeur).', 'echange', [fleche]);
      } else ajouter(40, 'C’est un <b>sacrifice</b> : ' + piece + ' (' + V[t] + ') prend ' + UN[P1.prise] + ' (' + V[P1.prise] + ') et peut être repris. La suite montre pourquoi ça vaut le coup.', 'sacrifice', [fleche]);
    }
    if (P1.promo) ajouter(70, 'Le pion arrive au bout : <b>promotion</b> en ' + NOM[P1.promo] + ' !', 'promotion', [fleche]);

    // --- sacrifice sans prise : la pièce jouée peut être prise
    if (!P1.prise && t !== 'k' && !echec) {
      const att = attaquants(b1, d, O);
      if (att.length) {
        let pire = 0;
        for (const a of att) pire = Math.max(pire, typ(b1[a]) === 'k' && attaquants(b1, d, S).length ? 0 : see(b1, a, d));
        if (pire >= 2) ajouter(38, piece[0].toUpperCase() + piece.slice(1) + ' se met exprès là où on peut ' + (fem(t) ? 'la' : 'le') + ' prendre : c’est un <b>sacrifice</b>. Si ' + campNom(O) + ' ' + (fem(t) ? 'la' : 'le') + ' prennent, la suite les punit.', 'sacrifice',
          [fleche, ...att.map((a) => ({ de: nomCase(a), vers: nomCase(d), couleur: C_ADV }))]);
      }
    }

    // --- nouvelles menaces (ce que S pourrait gagner au coup suivant)
    const T0 = menaces(b0, S), T1 = menaces(b1, S);
    const nouv = T1.filter((x) => !T0.some((y) => y.s === x.s && y.gain >= x.gain));
    const ciblesPiece = attaques(b1, d).filter((q) => b1[q] && coul(b1[q]) === O && (typ(b1[q]) === 'k' || nouv.some((x) => x.s === q) || V[typ(b1[q])] > V[t]));
    if (ciblesPiece.length >= 2 && t !== 'k') {
      ajouter(65, '<b>Fourchette !</b> ' + piece[0].toUpperCase() + piece.slice(1) + ' en ' + nomCase(d) + ' attaque en même temps ' +
        ciblesPiece.map((q) => LE[typ(b1[q])] + ' ' + nomCase(q)).join(' et ') + '. ' + CampNom(O) + ' ne peuvent pas tout sauver.', 'fourchette',
        [fleche, ...ciblesPiece.map((q) => ({ de: nomCase(d), vers: nomCase(q), couleur: C_MENACE }))]);
    } else {
      for (const x of nouv.slice(0, 2)) {
        const decou = x.par !== d && x.par >= 0 && !attaques(b0, x.par).includes(x.s);
        // défenseur surchargé ?
        const defs = attaquants(b1, x.s, O);
        let surcharge = null;
        if (defs.length === 1) {
          const dd = defs[0];
          const autres = attaques(b1, dd).filter((q) => q !== x.s && b1[q] && coul(b1[q]) === O && attaquants(b1, q, S).length && attaquants(b1, q, O).length === 1);
          if (autres.length) surcharge = { def: dd, aussi: autres[0] };
        }
        if (decou) ajouter(50, '<b>Attaque à la découverte</b> : en bougeant, ' + piece + ' ouvre la ligne ' + DU[typ(b1[x.par])] + ' ' + nomCase(x.par) + ', qui attaque maintenant ' + pieceEn(b1, x.s) + '.', 'decouverte',
          [fleche, { de: nomCase(x.par), vers: nomCase(x.s), couleur: C_MENACE }]);
        else if (surcharge) ajouter(42, Maj(pieceEn(b1, x.par)) + ' attaque ' + pieceEn(b1, x.s) + '. Son seul défenseur, ' + pieceEn(b1, surcharge.def) + ', doit aussi protéger ' + pieceEn(b1, surcharge.aussi) + ' : c’est un <b>défenseur surchargé</b>.', 'surcharge',
          [fleche, { de: nomCase(x.par), vers: nomCase(x.s), couleur: C_MENACE }, { de: nomCase(surcharge.def), vers: nomCase(x.s), couleur: C_CLOU }, { de: nomCase(surcharge.def), vers: nomCase(surcharge.aussi), couleur: C_CLOU }]);
        else {
          const tc = typ(b1[x.s]), ta = typ(b1[x.par]), e = fem(tc) ? 'e' : '';
          const pourquoi = !attaquants(b1, x.s, O).length ? ', qui n’est pas défendu' + e
            : V[tc] > V[ta] ? ' : ' + LE[tc] + ' (' + V[tc] + ') vaut plus que ' + LE[ta] + ' (' + V[ta] + '), même défendu' + e + ' ' + (fem(tc) ? 'elle' : 'il') + ' doit partir'
            : ', qui n’est pas assez défendu' + e;
          ajouter(30 + x.gain, '<b>Menace</b> : ' + pieceEn(b1, x.par) + ' attaque ' + pieceEn(b1, x.s) + pourquoi + '. ' + CampNom(O) + ' doivent réagir : c’est un <b>gain de temps</b>.', 'tempo',
          [fleche, { de: nomCase(x.par), vers: nomCase(x.s), couleur: C_MENACE }]);
        }
      }
    }

    // --- clouages / enfilades
    const C0 = clouages(b0, S), C1 = clouages(b1, S);
    for (const x of C1.filter((y) => !C0.some((z) => z.devant === y.devant && z.derriere === y.derriere)).slice(0, 1)) {
      const dessin = [fleche, { de: nomCase(x.par), vers: nomCase(x.derriere), couleur: C_CLOU }, { de: null, vers: nomCase(x.devant), couleur: C_CLOU }];
      if (x.sorte === 'enfilade') ajouter(48, '<b>Enfilade</b> : ' + pieceEn(b1, x.par) + ' attaque ' + pieceEn(b1, x.devant) + ' ; ' + (fem(typ(b1[x.devant])) ? 'si elle' : 's’il') + ' s’enlève, ' + pieceEn(b1, x.derriere) + ' derrière tombe.', 'enfilade', dessin);
      else ajouter(x.sorte === 'absolu' ? 40 : 34, '<b>Clouage</b> : ' + pieceEn(b1, x.devant) + ' est cloué' + (['r', 'q'].includes(typ(b1[x.devant])) ? 'e' : '') + ' par ' + pieceEn(b1, x.par) +
        (x.sorte === 'absolu' ? ' contre son roi : il n’a plus le droit de bouger.' : ' : s’il bouge, ' + pieceEn(b1, x.derriere) + ' derrière tombe.'), 'clouage', dessin);
    }

    // --- défense : ce que O menaçait avant et ne menace plus
    const H0 = menaces(b0, O), H1 = menaces(b1, O);
    for (const x of H0) {
      const encore = H1.some((y) => y.s === x.s || (x.s === P1.de && y.s === d));
      if (encore) continue;
      if (x.s === P1.de) ajouter(36 + x.gain, piece[0].toUpperCase() + piece.slice(1) + ' était <b>attaqué' + (['r', 'q'].includes(t) ? 'e' : '') + '</b> en ' + nomCase(P1.de) + ' (' + campNom(O) + ' menaçaient de ' + (fem(t) ? 'la' : 'le') + ' prendre) : ' + (fem(t) ? 'elle' : 'il') + ' se met à l’abri.', 'defense',
        [fleche, { de: nomCase(x.par), vers: nomCase(x.s), couleur: C_ADV }]);
      else if (P1.prise && P1.priseCase === x.par) ajouter(36 + x.gain, Maj(piece) + ' <b>élimine l’attaquant</b> qui menaçait ' + pieceEn(b0, x.s) + '.', 'defense', [fleche]);
      else if (b1[x.s]) ajouter(30 + x.gain, Maj(piece) + ' <b>protège</b> ' + pieceEn(b1, x.s) + ', qui était attaqué' + (['r', 'q'].includes(typ(b1[x.s])) ? 'e' : '') + ' par ' + pieceEn(b0, x.par) + '.', 'defense',
        [fleche, { de: nomCase(x.par), vers: nomCase(x.s), couleur: C_ADV }, { de: nomCase(d), vers: nomCase(x.s), couleur: C_DEF }]);
    }

    // --- idées précises pour les coups calmes
    if (!P1.prise && !echec) {
      // il ouvre une ligne à une autre pièce
      let ouvre = null;
      for (let s = 0; s < 64; s++) {
        const p = b1[s];
        if (!p || coul(p) !== S || s === d || !DIRS[typ(p)]) continue;
        const g = mobilite(b1, s) - mobilite(b0, s);
        if (g >= 2 && (!ouvre || g > ouvre.g)) ouvre = { s, g };
      }
      if (ouvre) {
        const tp = typ(b1[ouvre.s]);
        const nouv = attaques(b1, ouvre.s).filter((q) => !attaques(b0, ouvre.s).includes(q) && (!b1[q] || coul(b1[q]) !== S));
        ajouter(16, Maj(piece) + ' en bougeant <b>ouvre la route ' + DU[tp] + ' ' + nomCase(ouvre.s) + '</b> : ' + (fem(tp) ? 'elle' : 'il') + ' gagne ' + ouvre.g + ' cases (' + nouv.slice(0, 4).map(nomCase).join(', ') + (nouv.length > 4 ? '…' : '') + ').', 'activite',
          [fleche, ...nouv.map((q) => ({ de: null, vers: nomCase(q), couleur: 'rgba(90,200,90,0.28)', carre: true }))]);
      }
      // il vise un point faible : une pièce défendue seulement par son roi
      if (t !== 'k' && t !== 'p') {
        const faible = attaques(b1, d).find((q) => b1[q] && coul(b1[q]) === O && typ(b1[q]) !== 'k' && !attaques(b0, P1.de).includes(q) &&
          attaquants(b1, q, O).length === 1 && typ(b1[attaquants(b1, q, O)[0]]) === 'k');
        if (faible != null) ajouter(24, Maj(piece) + ' <b>vise ' + pieceEn(b1, faible) + '</b>, défendu' + (fem(typ(b1[faible])) ? 'e' : '') + ' seulement par le roi : c’est un <b>point faible</b>. Une 2e pièce sur ' + (fem(typ(b1[faible])) ? 'elle' : 'lui') + ' et ' + (fem(typ(b1[faible])) ? 'elle' : 'il') + ' tombe.', 'attaque-roi',
          [fleche, { de: nomCase(d), vers: nomCase(faible), couleur: C_MENACE }]);
      }
      // il attaque le défenseur d'une pièce que l'on attaque déjà
      if (t !== 'k') {
        for (const q of attaques(b1, d)) {
          if (!b1[q] || coul(b1[q]) !== O || typ(b1[q]) === 'k' || attaques(b0, P1.de).includes(q)) continue;
          const proteges = attaques(b1, q).filter((y) => b1[y] && coul(b1[y]) === O && typ(b1[y]) !== 'k' && attaquants(b1, y, S).length);
          if (proteges.length) {
            const y = proteges[0], att = attaquants(b1, y, S)[0];
            ajouter(26, Maj(piece) + ' <b>attaque le défenseur</b> : ' + pieceEn(b1, q) + ' protège ' + pieceEn(b1, y) + ', déjà visé' + (fem(typ(b1[y])) ? 'e' : '') + ' par ' + pieceEn(b1, att) + '. Si le défenseur disparaît, ' + pieceEn(b1, y) + ' tombe.', 'defenseur',
              [fleche, { de: nomCase(d), vers: nomCase(q), couleur: C_MENACE }, { de: nomCase(q), vers: nomCase(y), couleur: C_CLOU }, { de: nomCase(att), vers: nomCase(y), couleur: C_MENACE }]);
            break;
          }
        }
      }
      // il protège des pièces qui en avaient besoin
      const prot = attaques(b1, d).filter((q) => b1[q] && coul(b1[q]) === S && typ(b1[q]) !== 'k' && !attaques(b0, P1.de).includes(q) &&
        (attaquants(b1, q, O).length > 0 || attaquants(b0, q, S).length === 0));
      if (prot.length) ajouter(15, Maj(piece) + ' <b>protège</b> ' + prot.slice(0, 2).map((q) => pieceEn(b1, q)).join(' et ') + (prot.some((q) => attaquants(b1, q, O).length) ? ', qui était attaqué' + (prot.length > 1 ? 's' : (fem(typ(b1[prot[0]])) ? 'e' : '')) : ', qui n’avai' + (prot.length > 1 ? 'en' : '') + 't aucun défenseur') + '.', 'defense',
        [fleche, ...prot.slice(0, 2).map((q) => ({ de: nomCase(d), vers: nomCase(q), couleur: C_DEF }))]);
      // il libère la place pour roquer
      const k = roiDe(b0, S), r0 = S === 'w' ? 0 : 7;
      if (t !== 'k' && k === r0 * 8 + 4 && P0.roques) {
        for (const [cote, cases, lettre] of [['petit', [5, 6], 'k'], ['grand', [1, 2, 3], 'q']]) {
          const droit = P0.roques.includes(S === 'w' ? lettre.toUpperCase() : lettre);
          if (droit && cases.map((c) => r0 * 8 + c).includes(P1.de) && cases.every((c) => !b1[r0 * 8 + c])) {
            ajouter(21, Maj(piece) + ' quitte sa case et <b>libère la place pour roquer</b> (' + cote + ' roque) : le roi pourra se mettre à l’abri au prochain coup.', 'roque',
              [fleche, ...cases.map((c) => ({ de: null, vers: nomCase(r0 * 8 + c), couleur: C_ZONE, carre: true }))]);
          }
        }
      }
      // un pion qui empêche une pièce adverse de venir sur une case
      if (t === 'p') {
        const nouvelles = attaques(b1, d).filter((q) => !attaquants(b0, q, S).length && !b1[q]);
        let vu = null;
        for (const q of nouvelles) {
          for (let e = 0; e < 64 && !vu; e++) {
            const p = b1[e];
            if (p && coul(p) === O && ['n', 'b', 'q'].includes(typ(p)) && attaques(b1, e).includes(q)) vu = { e, q };
          }
        }
        if (vu) ajouter(17, 'Le pion <b>empêche ' + pieceEn(b1, vu.e) + ' de venir en ' + nomCase(vu.q) + '</b> : cette case est maintenant surveillée.', 'prophylaxie',
          [fleche, { de: nomCase(vu.e), vers: nomCase(vu.q), couleur: C_CLOU }, { de: null, vers: nomCase(vu.q), couleur: C_MENACE }]);
      }
    }

    // --- idées de position
    if (P1.roque) ajouter(28, '<b>Roque</b> : le roi part se cacher derrière ses pions et ' + (P1.roque === 'petit' ? 'la tour h' : 'la tour a') + ' entre dans le jeu.', 'roque',
      [{ de: nomCase(P1.de), vers: nomCase(d), couleur: C_COUP }]);
    const rangDepart = S === 'w' ? 0 : 7;
    if ((t === 'n' || t === 'b') && rg(P1.de) === rangDepart && P0.coup <= 15) ajouter(22, '<b>Développement</b> : ' + piece + ' quitte sa case de départ et entre dans la bataille.', 'developpement', [fleche]);
    const cc0 = controleCentre(b0, S), cc1 = controleCentre(b1, S);
    if (CENTRE.includes(d) && (t === 'p' || t === 'n')) ajouter(18, Maj(piece) + ' occupe <b>le centre</b> (' + nomCase(d) + ').', 'centre', [fleche, ...CENTRE.map((q) => ({ de: null, vers: nomCase(q), couleur: C_ZONE, carre: true }))]);
    else if (cc1 - cc0 >= 2) ajouter(14, 'Le coup augmente le <b>contrôle du centre</b> : ' + cc1 + ' attaques sur d4, e4, d5, e5 au lieu de ' + cc0 + '.', 'centre', [fleche, ...CENTRE.map((q) => ({ de: null, vers: nomCase(q), couleur: C_ZONE, carre: true }))]);
    if (t === 'r' || t === 'q') {
      const x = col(d);
      const amis = pionsColonne(b1, x, S), ennemis = pionsColonne(b1, x, O);
      if (col(P1.de) !== x && amis === 0) ajouter(t === 'r' ? 20 : 12, piece[0].toUpperCase() + piece.slice(1) + ' va sur la <b>colonne ' + (ennemis ? 'semi-ouverte' : 'ouverte') + ' ' + FI[x] + '</b> : rien ne la gêne pour attaquer.', 'colonne-ouverte',
        [fleche, ...[0, 1, 2, 3, 4, 5, 6, 7].map((y) => ({ de: null, vers: FI[x] + (y + 1), couleur: C_ZONE, carre: true }))]);
      const sept = S === 'w' ? 6 : 1;
      if (t === 'r' && rg(d) === sept && rg(P1.de) !== sept) ajouter(22, 'La tour s’installe en <b>7e rangée</b> : elle attaque les pions et enferme le roi.', 'septieme', [fleche]);
    }
    if ((t === 'n' || t === 'b') && avantPoste(b1, d) && !avantPoste(b0, P1.de)) ajouter(20, piece[0].toUpperCase() + piece.slice(1) + ' s’installe sur un <b>avant-poste</b> en ' + nomCase(d) + ' : protégé par un pion, aucun pion adverse ne pourra le chasser.', 'avant-poste',
      [fleche, { de: null, vers: nomCase(d), couleur: C_ZONE, carre: true }]);
    if (t === 'p' && !P1.promo && pionPasse(b1, d)) ajouter(26, 'Le <b>pion passé</b> avance : plus aucun pion ne peut l’arrêter, il menace d’aller à dame.', 'pion-passe',
      [fleche, { de: nomCase(d), vers: FI[col(d)] + (S === 'w' ? 8 : 1), couleur: C_ZONE }]);
    if (t === 'k' && !P1.roque && finale(b0)) {
      const dist = (s) => Math.max(Math.abs(col(s) - 3.5), Math.abs(rg(s) - 3.5));
      const k2 = roiDe(b1, O);
      const opp = k2 >= 0 && b1.every((p) => !p || ['k', 'p'].includes(typ(p))) &&
        ((col(k2) === col(d) && Math.abs(rg(k2) - rg(d)) === 2) || (rg(k2) === rg(d) && Math.abs(col(k2) - col(d)) === 2));
      if (opp) ajouter(34, 'Le roi prend l’<b>opposition</b> : les rois sont face à face, et c’est à ' + campNom(O) + ' de jouer, donc de reculer.', 'opposition', [fleche, { de: null, vers: nomCase(k2), couleur: C_ADV }]);
      else if (dist(d) < dist(P1.de)) ajouter(20, 'En finale, <b>le roi devient actif</b> : il se rapproche du centre et des pions.', 'roi-actif', [fleche]);
    }
    const pr0 = pressionRoi(b0, S), pr1 = pressionRoi(b1, S);
    if (pr1 - pr0 >= 2 && !echec) ajouter(24, 'Le coup renforce l’<b>attaque sur le roi</b> : ' + pr1 + ' attaques autour du roi adverse au lieu de ' + pr0 + '.', 'attaque-roi',
      [fleche, ...zoneRoi(b1, O).map((q) => ({ de: null, vers: nomCase(q), couleur: 'rgba(235,70,70,0.25)', carre: true }))]);
    if (t !== 'p' && t !== 'k' && !P1.prise) {
      const m0 = mobilite(b0, P1.de), m1 = mobilite(b1, d);
      if (m1 - m0 >= 3) ajouter(12, piece[0].toUpperCase() + piece.slice(1) + ' devient <b>plus acti' + (['r', 'q'].includes(t) ? 've' : 'f') + '</b> : ' + m1 + ' cases contrôlées au lieu de ' + m0 + '.', 'activite',
        [fleche, ...attaques(b1, d).filter((q) => !b1[q] || coul(b1[q]) !== S).map((q) => ({ de: null, vers: nomCase(q), couleur: 'rgba(90,200,90,0.28)', carre: true }))]);
    }
    out.sort((a, b) => b.poids - a.poids);
    return { P1, idees: out };
  }

  // gains et pertes de pièces entre deux positions
  function bilanPieces(b0, b1, S) {
    const c0 = comptes(b0), c1 = comptes(b1);
    const liste = (c) => {
      const out = [];
      for (const t of ['q', 'r', 'b', 'n', 'p']) {
        const n = (c0[c][t] || 0) - (c1[c][t] || 0);
        if (n > 0) out.push(n === 1 ? UN[t] : n + ' ' + NOM[t] + 's');
      }
      return out;
    };
    const m0 = materiel(b0), m1 = materiel(b1);
    return { perdS: liste(S), perdO: liste(autre(S)), net: (m1[S] - m1[autre(S)]) - (m0[S] - m0[autre(S)]) };
  }

  // =====================================================================
  //  TEXTES
  // =====================================================================
  const nb = (x) => (Math.round(x * 100) / 100).toFixed(2).replace('.', ',');
  // score vu du camp au trait -> phrase
  function phraseScore(s, S) {
    if (!s) return '';
    if (s.mate != null) {
      if (s.mate === 0) return 'partie finie';
      const g = s.mate > 0 ? S : autre(S);
      return 'mat en ' + Math.abs(s.mate) + ' pour ' + campNom(g);
    }
    const v = s.cp / 100, a = Math.abs(v), g = v > 0 ? S : autre(S);
    const signe = (g === 'w' ? '+' : '−') + nb(a);
    if (a < 0.3) return 'égalité (' + nb(a) + ')';
    if (a < 1) return 'léger avantage pour ' + campNom(g) + ' (' + signe + ')';
    if (a < 2.5) return 'net avantage pour ' + campNom(g) + ' (' + signe + ')';
    return 'gros avantage pour ' + campNom(g) + ' (' + signe + ')';
  }
  const valeurS = (s) => (s.mate != null ? (s.mate > 0 ? 10000 - s.mate : -10000 - s.mate) : s.cp);
  function ecart(sBest, sAlt) {
    const a = valeurS(sBest), b = valeurS(sAlt);
    if (Math.abs(a) >= 9000 || Math.abs(b) >= 9000) return a === b ? 0 : 99;
    return (a - b) / 100;
  }

  // Garde les idées utiles, sans répétition : une idée par cible, pas d'« échec » déjà dit ailleurs,
  // pas de petites idées de position quand il y a de la tactique.
  function nettoyer(liste, max) {
    const tactique = liste.some((x) => x.poids >= 30);
    const vues = new Set(), notions = new Set(), out = [];
    for (const x of liste) {
      if (out.length >= (max || 3)) break;
      if (tactique && x.poids < 20) continue;
      if (x.notion === 'echec' && out.some((y) => /roi/.test(y.texte))) continue;
      if (notions.has(x.notion) && x.notion !== 'defense') continue;
      const cibles = x.dessin.filter((d) => d && d.de !== undefined && (d.couleur === C_MENACE || d.couleur === C_CLOU)).map((d) => d.vers);
      if (cibles.length && cibles.every((c) => vues.has(c))) continue;
      cibles.forEach((c) => vues.add(c));
      notions.add(x.notion);
      out.push(x);
    }
    return out;
  }
  const sansBalises = (t) => t.replace(/<[^>]+>/g, '');
  const court = (t) => sansBalises(t).replace(/^(Menace|Développement|Roque|Clouage|Enfilade|Fourchette|Promotion|Attaque à la découverte) ?[:!] /, '').replace(/^./, (c) => c.toLowerCase()).replace(/\.$/, '');
  const puce = (x) => '<li' + (NOTIONS[x.notion] ? ' title="' + NOTIONS[x.notion][0] + ' : ' + NOTIONS[x.notion][1].replace(/"/g, '') + '"' : '') + '>' + x.texte + '</li>';

  // =====================================================================
  //  RÉFLEXION DÉTAILLÉE : ce qu'un bon joueur regarde avant de choisir
  // =====================================================================
  const C_VERT = 'rgba(90,200,90,0.28)', C_ROUGE = 'rgba(235,70,70,0.28)', C_JAUNE = 'rgba(255,215,0,0.35)';
  const carres = (liste, c) => liste.map((q) => ({ de: null, vers: nomCase(q), couleur: c, carre: true }));
  const DEPART = { w: { n: [1, 6], b: [2, 5] }, b: { n: [57, 62], b: [58, 61] } };
  function nonDeveloppees(b, c) {
    const out = [];
    for (const t of ['n', 'b']) for (const q of DEPART[c][t]) if (b[q] === (c === 'w' ? t.toUpperCase() : t)) out.push(q);
    return out;
  }
  const LETTRE = { n: 'C', b: 'F', r: 'T', q: 'D', k: 'R', p: '' };
  const court2 = (b, s) => LETTRE[typ(b[s])] + nomCase(s);
  function listeEt(l) { return l.length <= 1 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' et ' + l[l.length - 1]; }
  function pionsDe(b, c) { const out = []; for (let s = 0; s < 64; s++) if (b[s] === (c === 'w' ? 'P' : 'p')) out.push(s); return out; }
  function structure(b, c) {
    const P = pionsDe(b, c);
    const passes = P.filter((s) => pionPasse(b, s));
    const isoles = P.filter((s) => !passes.includes(s) && ![col(s) - 1, col(s) + 1].some((x) => x >= 0 && x < 8 && pionsColonne(b, x, c) > 0));
    const doubles = [];
    for (let x = 0; x < 8; x++) if (pionsColonne(b, x, c) >= 2) doubles.push(x);
    return { passes, isoles, doubles };
  }
  function activiteTotale(b, c) {
    let n = 0;
    for (let s = 0; s < 64; s++) if (b[s] && coul(b[s]) === c && !['p', 'k'].includes(typ(b[s]))) n += mobilite(b, s);
    return n;
  }
  // pièces de c (sauf pions et roi) qui visent une case autour du roi adverse
  function attaquantsRoi(b, c) {
    const z = zoneRoi(b, autre(c)), out = [];
    for (let s = 0; s < 64; s++) if (b[s] && coul(b[s]) === c && !['p', 'k'].includes(typ(b[s])) && attaques(b, s).some((q) => z.includes(q))) out.push(s);
    return out;
  }
  function abriRoi(b, c) {
    const k = roiDe(b, c); if (k < 0) return null;
    const d = c === 'w' ? 1 : -1, bouclier = [];
    for (const dc of [-1, 0, 1]) for (const dr of [1, 2]) {
      const x = col(k) + dc, y = rg(k) + d * dr;
      if (dans(x, y) && b[y * 8 + x] === (c === 'w' ? 'P' : 'p')) bouclier.push(y * 8 + x);
    }
    const ouvertes = [];
    for (const dc of [-1, 0, 1]) { const x = col(k) + dc; if (x >= 0 && x < 8 && !pionsColonne(b, x, c)) ouvertes.push(FI[x]); }
    const base = c === 'w' ? rg(k) === 0 : rg(k) === 7;
    return { k, bouclier, ouvertes, centre: base && col(k) >= 3 && col(k) <= 5, aile: col(k) <= 2 || col(k) >= 6 };
  }
  const accord = (t, mot) => mot + (fem(t) ? 'e' : '');

  // ce que l'on remarque dans la position (S = camp au trait), du plus important au moins important
  function diagnostic(P0, S, ra) {
    const b = P0.b, O = autre(S), out = [];
    const ajout = (poids, texte, dessin) => out.push({ poids, texte, dessin: dessin || [] });
    const fin = finale(b);
    // matériel
    const m = materiel(b), d = m.w - m.b;
    if (!d) ajout(9, '<b>Matériel égal</b> (' + m.w + ' points chacun).');
    else {
      const g = d > 0 ? 'w' : 'b', c = comptes(b), plus = [], moins = [];
      for (const t of ['q', 'r', 'b', 'n', 'p']) {
        const x = (c[g][t] || 0) - (c[autre(g)][t] || 0);
        if (x > 0) plus.push(x === 1 ? UN[t] : x + ' ' + NOM[t] + 's');
        if (x < 0) moins.push(-x === 1 ? UN[t] : -x + ' ' + NOM[t] + 's');
      }
      ajout(9, '<b>Matériel</b> : ' + campNom(g) + ' ont <b>' + Math.abs(d) + ' point' + (Math.abs(d) > 1 ? 's' : '') + ' de plus</b>' +
        (plus.length ? ' (' + listeEt(plus) + ' en plus' + (moins.length ? ', ' + listeEt(moins) + ' en moins' : '') + ')' : '') +
        (ra && ra.repriseCase != null && g === O && attaquants(b, ra.repriseCase, S).length ? ', mais l’échange n’est pas fini : tu peux reprendre en ' + nomCase(ra.repriseCase) : '') + '.');
    }
    // ce qui est attaqué tout de suite
    const mO = menaces(b, O).sort((x, y) => y.gain - x.gain)[0];
    if (mO) { const t = typ(b[mO.s]); ajout(8, '⚠ <b>' + Maj(pieceEn(b, mO.s)) + '</b> est ' + accord(t, 'attaqué') + ' et pas assez ' + accord(t, 'défendu') + ' : il faut s’en occuper.', [{ de: nomCase(mO.par), vers: nomCase(mO.s), couleur: C_MENACE }]); }
    const mS = menaces(b, S).sort((x, y) => y.gain - x.gain)[0];
    if (mS) { const t = typ(b[mS.s]); ajout(8, '🎯 Chez l’adversaire, <b>' + pieceEn(b, mS.s) + '</b> est ' + accord(t, 'mal protégé') + ' : c’est une cible.', [{ de: nomCase(mS.par), vers: nomCase(mS.s), couleur: C_COUP }]); }
    // les rois
    if (!fin) {
      for (const c of [S, O]) {
        const a = abriRoi(b, c); if (!a) continue;
        const att = attaquantsRoi(b, autre(c));
        const roiNom = 'le roi ' + (c === 'w' ? 'blanc' : 'noir');
        let t = null, poids = 5;
        if (a.centre && P0.coup >= 8) {
          const peut = c === 'w' ? /[KQA-H]/.test(P0.roques) : /[kqa-h]/.test(P0.roques);
          t = Maj(roiNom) + ' est <b>encore au centre</b> (' + nomCase(a.k) + ')' + (peut ? '' : ' et <b>ne peut plus roquer</b>') + ' : il est exposé.';
          poids = 7;
        } else if (a.aile && a.bouclier.length >= 2 && att.length < 3) { t = Maj(roiNom) + ' est <b>à l’abri</b> en ' + nomCase(a.k) + ', derrière ' + a.bouclier.length + ' pions.'; poids = 4.5; }
        if (att.length >= 3) {
          t = (t ? t + ' ' : '') + '<b>' + att.length + ' pièces ' + (c === 'w' ? 'noires' : 'blanches') + '</b> visent les cases autour ' + (c === 'w' ? 'du roi blanc' : 'du roi noir') + ' (' + listeEt(att.map((s) => court2(b, s))) + ').';
          poids = 8;
        } else if (t && a.ouvertes.length && a.aile && m.w + m.b > 40) { t += ' Mais la colonne ' + listeEt(a.ouvertes) + ' devant lui n’a plus de pion pour le protéger.'; poids = 6; }
        if (t) ajout(poids, t, carres(zoneRoi(b, c), c === S ? C_VERT : C_ROUGE).concat(att.length >= 3 ? att.map((s) => ({ de: nomCase(s), vers: nomCase(a.k), couleur: C_ADV })) : []));
      }
      // les deux rois simplement à l'abri : une seule ligne
      const abris = out.filter((x) => x.poids === 4.5);
      if (abris.length === 2) {
        out.splice(out.indexOf(abris[0]), 1); out.splice(out.indexOf(abris[1]), 1);
        ajout(4, 'Les deux rois sont <b>à l’abri</b> derrière leurs pions : pas d’attaque directe possible pour l’instant.', abris[0].dessin.concat(abris[1].dessin));
      }
    } else {
      const kS = roiDe(b, S), kO = roiDe(b, O);
      const dist = (k) => Math.max(Math.abs(col(k) - 3.5), Math.abs(rg(k) - 3.5));
      if (kS >= 0 && kO >= 0) ajout(6, '<b>Finale</b> : les rois deviennent des pièces d’attaque. Ton roi est ' + (dist(kS) < dist(kO) ? '<b>plus central</b>' : dist(kS) > dist(kO) ? '<b>moins central</b>' : 'aussi central') + ' que le roi adverse.', carres([kS], C_VERT).concat(carres([kO], C_ROUGE)));
    }
    // développement
    if (!fin && P0.coup <= 20) {
      const nS = nonDeveloppees(b, S), nO = nonDeveloppees(b, O);
      if (nS.length || nO.length) {
        const t = '<b>Développement</b> : ' + campNom(S) + ' ont ' + (nS.length ? nS.length + ' pièce' + (nS.length > 1 ? 's' : '') + ' encore chez ' + (nS.length > 1 ? 'elles' : 'elle') + ' (' + listeEt(nS.map((s) => court2(b, s))) + ')' : 'tout sorti') +
          ', ' + campNom(O) + ' ' + (nO.length ? nO.length + ' (' + listeEt(nO.map((s) => court2(b, s))) + ')' : 'ont tout sorti') + '.';
        ajout(nS.length !== nO.length ? 6 : 4, t, carres(nS, C_JAUNE).concat(carres(nO, C_ROUGE)));
      }
    }
    // les pions
    const pt = [];
    let dP = [];
    for (const c of [S, O]) {
      const st = structure(b, c), f = [];
      if (st.passes.length) { f.push(st.passes.length > 1 ? 'des <b>pions passés</b> en ' + listeEt(st.passes.map(nomCase)) : 'un <b>pion passé</b> en ' + nomCase(st.passes[0])); dP = dP.concat(carres(st.passes, c === S ? C_VERT : C_ROUGE)); }
      if (st.isoles.length) { f.push(st.isoles.length > 1 ? 'des pions isolés (' + listeEt(st.isoles.map(nomCase)) + ')' : 'un pion isolé en ' + nomCase(st.isoles[0])); dP = dP.concat(carres(st.isoles, C_JAUNE)); }
      if (st.doubles.length) f.push('des pions doublés (colonne ' + listeEt(st.doubles.map((x) => FI[x])) + ')');
      if (f.length) pt.push(campNom(c) + ' ont ' + listeEt(f));
    }
    if (pt.length) ajout(pt.join('').includes('passé') ? 7 : 4, '<b>Pions</b> : ' + pt.join(' ; ') + '.', dP);
    // activité
    const aS = activiteTotale(b, S), aO = activiteTotale(b, O);
    if (Math.abs(aS - aO) >= 5) ajout(5, '<b>Activité</b> : les pièces ' + (S === 'w' ? 'blanches' : 'noires') + ' contrôlent <b>' + aS + ' cases</b>, celles d’en face ' + aO + ' : ' + (aS > aO ? 'tu es plus actif.' : 'l’adversaire est plus actif.'));
    // colonnes ouvertes
    const ouv = [];
    for (let x = 0; x < 8; x++) if (!pionsColonne(b, x, 'w') && !pionsColonne(b, x, 'b')) ouv.push(x);
    if (ouv.length && !fin) {
      const occ = (c) => ouv.filter((x) => { for (let y = 0; y < 8; y++) { const p = b[y * 8 + x]; if (p && coul(p) === c && ['r', 'q'].includes(typ(p))) return true; } return false; });
      const oS = occ(S), oO = occ(O), cases = [];
      for (const x of ouv) for (let y = 0; y < 8; y++) cases.push(y * 8 + x);
      const pl = ouv.length > 1;
      ajout(4, '<b>Colonne' + (pl ? 's' : '') + ' ouverte' + (pl ? 's' : '') + '</b> ' + listeEt(ouv.map((x) => FI[x])) + ' : ' +
        (oS.length ? 'tes tours ou ta dame y sont déjà' : oO.length ? 'l’adversaire y est déjà' : 'personne n’y est encore, c’est une place pour une tour') + '.', carres(cases, C_JAUNE));
    }
    out.sort((x, y) => y.poids - x.poids);
    return out.slice(0, 5);
  }

  // ce que la ligne du moteur change pour S entre le début (b0) et la fin (b1)
  function changements(b0, b1, S, bMat) {
    const O = autre(S), out = [];
    // au milieu d'un échange, le matériel se compte depuis AVANT la prise adverse (reprendre n'est pas gagner)
    const bp = bilanPieces(bMat || b0, b1, S);
    if (bp.net > 0) out.push('<b>Matériel</b> : ' + campNom(S) + ' gagnent <b>' + bp.net + ' point' + (bp.net > 1 ? 's' : '') + '</b>' + (bp.perdO.length ? ' (' + listeEt(bp.perdO) + ' pris' + (bp.perdS.length ? ', contre ' + listeEt(bp.perdS) : '') + ')' : '') + '.');
    else if (bp.net < 0) out.push('<b>Matériel</b> : ' + campNom(S) + ' donnent <b>' + (-bp.net) + ' point' + (bp.net < -1 ? 's' : '') + '</b> exprès : c’est un <b>sacrifice</b>, payé par ce qui suit.');
    else if (bp.perdO.length) out.push('<b>Échanges</b> : ' + listeEt(bp.perdS) + ' contre ' + listeEt(bp.perdO) + ', le matériel reste égal.');
    const a0 = activiteTotale(b0, S), a1 = activiteTotale(b1, S);
    if (a1 - a0 >= 4) out.push('<b>Activité</b> : tes pièces passent de ' + a0 + ' à <b>' + a1 + ' cases</b> contrôlées.');
    const o0 = activiteTotale(b0, O), o1 = activiteTotale(b1, O);
    if (o0 - o1 >= 4) out.push('Les pièces adverses perdent de l’activité : <b>' + o0 + ' → ' + o1 + ' cases</b>.');
    const r0 = attaquantsRoi(b0, S).length, r1 = attaquantsRoi(b1, S).length;
    if (r1 - r0 >= 2) out.push('<b>Attaque</b> : ' + r1 + ' de tes pièces visent maintenant les cases du roi adverse (au lieu de ' + r0 + ').');
    const k0 = abriRoi(b0, S), k1 = abriRoi(b1, S);
    if (k0 && k1 && k0.centre && k1.aile) out.push('<b>Ton roi</b> quitte le centre et se met à l’abri.');
    const d0 = nonDeveloppees(b0, S).length, d1 = nonDeveloppees(b1, S).length;
    if (d0 > d1) out.push('<b>Développement</b> : ' + (d0 - d1) + ' pièce' + (d0 - d1 > 1 ? 's' : '') + ' de plus ' + (d0 - d1 > 1 ? 'sorties' : 'sortie') + '.');
    const s0 = structure(b0, S), s1 = structure(b1, S), t0 = structure(b0, O), t1 = structure(b1, O);
    const nvPasses = s1.passes.filter((x) => !s0.passes.includes(x));
    if (s1.passes.length > s0.passes.length && nvPasses.length) out.push('<b>Pion passé</b> créé en ' + listeEt(nvPasses.map(nomCase)) + '.');
    if (t1.doubles.length > t0.doubles.length) out.push('L’adversaire se retrouve avec des <b>pions doublés</b>.');
    if (t1.isoles.length > t0.isoles.length) out.push('L’adversaire se retrouve avec un <b>pion isolé</b> de plus.');
    return out;
  }

  // =====================================================================
  //  STRATÉGIE : le plan à long terme (sans parler des coups exacts)
  // =====================================================================
  const AILES = [{ nom: 'l’aile dame', cols: [0, 1, 2] }, { nom: 'le centre', cols: [3, 4] }, { nom: 'l’aile roi', cols: [5, 6, 7] }];
  const aileDe = (x) => (x <= 2 ? 0 : x <= 4 ? 1 : 2);
  const relRg = (s, c) => (c === 'w' ? rg(s) : 7 - rg(s)); // rangée vue du camp c (0 = sa première)
  const pionDe = (c) => (c === 'w' ? 'P' : 'p');
  // cases fortes pour c : dans le camp adverse, protégées par un pion de c, qu'aucun pion adverse ne pourra chasser
  function casesFortes(b, c) {
    const O = autre(c), d = c === 'w' ? 1 : -1, out = [];
    for (let s = 0; s < 64; s++) {
      const r = relRg(s, c);
      if (r < 3 || r > 5 || col(s) < 1 || col(s) > 6) continue;
      if (b[s] && (typ(b[s]) === 'p' || coul(b[s]) === O)) continue;
      if (!attaquants(b, s, c).some((a) => b[a] === pionDe(c))) continue;
      let chassable = false;
      for (const dc of [-1, 1]) { const x = col(s) + dc; if (x < 0 || x > 7) continue; for (let y = rg(s) + d; y >= 0 && y < 8; y += d) if (b[y * 8 + x] === pionDe(O)) chassable = true; }
      if (chassable) continue;
      out.push({ s, poids: (r === 4 || r === 5 ? 2 : 1) + (col(s) >= 2 && col(s) <= 5 ? 2 : 0) + (b[s] && typ(b[s]) === 'n' ? 3 : 0) });
    }
    return out.sort((x, y) => y.poids - x.poids);
  }
  // les idées stratégiques pour le camp c, écrites pour « moi » (c = celui qui joue) ou pour « lui » (c = l'adversaire)
  function strategie(P0, c) {
    const b = P0.b, O = autre(c), out = [];
    const ajout = (poids, moi, lui, dessin) => out.push({ poids, moi, lui, dessin: dessin || [] });
    const fin = finale(b), m = materiel(b), dm = m[c] - m[O];
    const ouverture = !fin && P0.coup <= 14 && nonDeveloppees(b, c).length >= 2;
    const st = structure(b, c), stO = structure(b, O);
    const kc = abriRoi(b, c), ko = abriRoi(b, O);
    const peutRoquer = c === 'w' ? /[KQA-H]/.test(P0.roques) : /[kqa-h]/.test(P0.roques);
    // phase de jeu et objectif général
    if (ouverture) {
      const nd = nonDeveloppees(b, c);
      ajout(9, '<b>Phase d’ouverture</b> : le but n’est pas encore d’attaquer, mais de <b>finir de sortir les pièces</b> (' + nd.length + ' encore chez elles)' + (kc && kc.centre && peutRoquer ? ', de <b>mettre le roi à l’abri</b> en roquant' : '') + ' et de <b>relier les tours</b>. Chaque coup doit faire avancer ce travail.', null, carres(nd, C_JAUNE));
    } else if (fin) {
      ajout(8, '<b>Finale</b> : le roi devient une pièce d’attaque, il faut le <b>rapprocher du centre et des pions</b>. Les pions passés valent beaucoup : on pousse les siens, on bloque ceux d’en face.', null, carres([roiDe(b, c)].filter((x) => x >= 0), C_VERT));
    }
    if (fin) {
      const kS = roiDe(b, c), kO = roiDe(b, O);
      const dist = (k) => Math.max(Math.abs(col(k) - 3.5), Math.abs(rg(k) - 3.5));
      if (kS >= 0 && kO >= 0 && dist(kS) > dist(kO) + 0.9) ajout(7, 'Ton <b>roi est plus loin du centre</b> que le roi adverse : le rapprocher est souvent le coup le plus utile d’une finale.', 'Le roi adverse est plus loin du centre : il va vouloir le rapprocher.', carres([kS], C_JAUNE));
      const mobT = (cc) => { let n = 0; for (let s = 0; s < 64; s++) if (b[s] === (cc === 'w' ? 'R' : 'r')) n = Math.max(n, mobilite(b, s)); return n; };
      const tS = mobT(c), tO = mobT(O);
      if (tS && tO && tO >= tS + 4) ajout(6.5, 'Ta <b>tour est plus passive</b> que celle d’en face (' + tS + ' cases contre ' + tO + ') : en finale de tours, une <b>tour active</b> (qui attaque les pions, derrière les pions passés) vaut souvent un pion. Active-la.', null);
      else if (tS && tO && tS >= tO + 4) ajout(6, 'Ta <b>tour est plus active</b> (' + tS + ' cases contre ' + tO + ') : garde-la active, elle attaque les pions adverses et coupe le roi. C’est un vrai avantage en finale.', 'La tour adverse est plus active que la tienne : il faut l’activer ou la chasser.');
    }
    // matériel : simplifier ou compliquer
    if (dm >= 2) ajout(8, '<b>Tu as plus de matériel</b> : le plan le plus simple est d’<b>échanger des pièces</b> (pas des pions). Moins il reste de pièces, moins l’adversaire a de contre-jeu, et plus ton avance compte.', 'L’adversaire a plus de matériel : il va chercher à <b>échanger les pièces</b>. Toi, garde-les et cherche de l’activité.');
    else if (dm <= -2) ajout(8, '<b>Tu as moins de matériel</b> : évite les échanges, <b>garde les pièces</b> et cherche l’activité et l’attaque. Une finale serait perdue d’avance.', 'L’adversaire a moins de matériel : il va <b>éviter les échanges</b> et chercher des complications.');
    // roques opposés : course à l'attaque
    if (!fin && kc && ko && ((col(kc.k) <= 2 && col(ko.k) >= 5) || (col(kc.k) >= 5 && col(ko.k) <= 2)) && relRg(kc.k, c) === 0 && relRg(ko.k, O) === 0) {
      const a = aileDe(col(ko.k));
      ajout(8.5, '<b>Roques opposés</b> : les rois sont sur des ailes différentes, c’est une <b>course à l’attaque</b>. Tu peux avancer les pions de ' + AILES[a].nom + ' contre le roi adverse sans affaiblir le tien. Le plus rapide gagne.', 'Roques opposés : l’adversaire va lancer ses pions contre ton roi, chaque temps compte.', carres(zoneRoi(b, O), C_ROUGE));
    }
    // le roi adverse resté au centre / mal protégé
    if (!fin && ko && ko.centre && P0.coup >= 8 && !(O === 'w' ? /[KQA-H]/.test(P0.roques) : /[kqa-h]/.test(P0.roques))) ajout(8, 'Le <b>roi adverse est coincé au centre</b> sans pouvoir roquer : il faut <b>ouvrir le jeu</b> (colonnes, diagonales) pour l’attaquer avant qu’il ne se mette à l’abri.', 'Ton roi est coincé au centre : l’adversaire va chercher à <b>ouvrir le jeu</b> contre lui.', carres(zoneRoi(b, O), C_ROUGE));
    else if (!fin && ko && ko.aile && ko.bouclier.length <= 1 && m.w + m.b > 30) ajout(7, 'Le <b>roi adverse n’a presque plus de pions devant lui</b> : amène dame et pièces vers lui, une attaque peut vite devenir décisive.', 'Ton roi n’a presque plus de pions devant lui : l’adversaire va y amener ses pièces.', carres(zoneRoi(b, O), C_ROUGE));
    // majorité de pions sur une aile
    for (let a = 0; a < 3; a += 2) {
      const n1 = AILES[a].cols.reduce((n, x) => n + pionsColonne(b, x, c), 0), n2 = AILES[a].cols.reduce((n, x) => n + pionsColonne(b, x, O), 0);
      if (n1 > n2 && n1 >= 2 && (fin || m.w + m.b <= 60 || !(kc && aileDe(col(kc.k)) === a))) {
        const cases = []; for (const x of AILES[a].cols) for (let y = 0; y < 8; y++) if (b[y * 8 + x] === pionDe(c)) cases.push(y * 8 + x);
        ajout(fin ? 7.5 : 5.5, '<b>Majorité de pions sur ' + AILES[a].nom + '</b> (' + n1 + ' contre ' + n2 + ') : à long terme, l’avancer ensemble pour <b>créer un pion passé</b>.', 'L’adversaire a la majorité sur ' + AILES[a].nom + ' : il voudra y <b>créer un pion passé</b>, il faut le freiner.', carres(cases, C_VERT));
      }
    }
    // pions passés
    if (st.passes.length) {
      const p = st.passes.slice().sort((x, y) => relRg(y, c) - relRg(x, c))[0];
      ajout(relRg(p, c) >= 4 ? 8 : 6.5, '<b>Ton pion passé</b> (' + nomCase(p) + ') est un atout durable : il faut le <b>soutenir et le pousser</b>, idéalement avec une tour placée derrière lui. L’adversaire devra bloquer une pièce devant.', 'L’adversaire a un <b>pion passé</b> (' + nomCase(p) + ') : il faut le <b>bloquer</b>, le mieux avec un cavalier juste devant lui.', carres([p], C_VERT));
    }
    // faiblesses adverses à attaquer
    if (stO.isoles.length && !fin) {
      const q = stO.isoles.sort((x, y) => Math.abs(col(x) - 3.5) - Math.abs(col(y) - 3.5))[0];
      ajout(5.5, 'Le <b>pion isolé ' + nomCase(q) + '</b> adverse ne peut être défendu que par des pièces : c’est une <b>cible à long terme</b>. Mets-le sous pression et occupe la case juste devant lui.', 'Ton pion isolé ' + nomCase(q) + ' est une cible : l’adversaire va le viser.', carres([q], C_ROUGE));
    }
    if (stO.doubles.length && !fin) ajout(4, 'Les <b>pions doublés</b> adverses (colonne ' + listeEt(stO.doubles.map((x) => FI[x])) + ') bougent mal et se défendent mal : en finale, ce sera un vrai avantage.', null);
    // case forte pour un cavalier
    const cf = casesFortes(b, c)[0];
    if (cf && !fin) {
      const deja = b[cf.s] && typ(b[cf.s]) === 'n';
      ajout(deja ? 5 : 6, deja ? 'Ton <b>cavalier en ' + nomCase(cf.s) + '</b> est sur une <b>case forte</b> : aucun pion ne peut le chasser. Garde-le là, il gêne tout le camp adverse.' : '<b>Case forte en ' + nomCase(cf.s) + '</b> : protégée par un de tes pions, aucun pion adverse ne pourra jamais la chasser. Un <b>cavalier</b> installé là serait excellent : c’est une bonne destination pour tes pièces.', 'L’adversaire a une case forte en ' + nomCase(cf.s) + ' : il voudra y installer un cavalier.', carres([cf.s], C_VERT));
    }
    // colonnes pour les tours
    if (!fin) {
      const tours = []; for (let s = 0; s < 64; s++) if (b[s] === (c === 'w' ? 'R' : 'r')) tours.push(s);
      const ouv = [], semi = [];
      for (let x = 0; x < 8; x++) { const a = pionsColonne(b, x, c), o = pionsColonne(b, x, O); if (!a && !o) ouv.push(x); else if (!a && o) semi.push(x); }
      const occupe = (x) => tours.some((s) => col(s) === x);
      const libres = ouv.filter((x) => !occupe(x)), semiL = semi.filter((x) => !occupe(x));
      if (tours.length && libres.length) {
        const cases = []; for (const x of libres) for (let y = 0; y < 8; y++) cases.push(y * 8 + x);
        ajout(5, '<b>Colonne' + (libres.length > 1 ? 's' : '') + ' ouverte' + (libres.length > 1 ? 's' : '') + ' ' + listeEt(libres.map((x) => FI[x])) + '</b> : c’est là que les <b>tours</b> doivent aller. Celui qui prend la colonne en premier entre dans le camp adverse (souvent jusqu’à la 7e rangée).', 'L’adversaire voudra mettre ses tours sur la colonne ouverte ' + listeEt(libres.map((x) => FI[x])) + '.', carres(cases, C_JAUNE));
      } else if (tours.length && semiL.length && !ouverture) {
        const x = semiL.sort((p, q) => Math.abs(p - 3.5) - Math.abs(q - 3.5))[0];
        ajout(4.5, '<b>Colonne ' + FI[x] + ' semi-ouverte</b> (plus de pion à toi dessus) : une tour placée là fait <b>pression sur le pion adverse</b> de cette colonne.', null);
      }
    }
    // les fous
    const cpt = comptes(b);
    if ((cpt[c].b || 0) >= 2 && (cpt[O].b || 0) < 2) ajout(4.5, 'Tu as la <b>paire de fous</b> : ils sont plus forts quand la position est <b>ouverte</b>. Ouvrir des lignes (échanger des pions) les rend encore meilleurs.', 'L’adversaire a la paire de fous : il voudra ouvrir la position. Garde-la plutôt fermée.');
    for (let s = 0; s < 64; s++) {
      if (b[s] !== (c === 'w' ? 'B' : 'b')) continue;
      const cl0 = (col(s) + rg(s)) & 1;
      const pareil = pionsDe(b, c).filter((q) => ((col(q) + rg(q)) & 1) === cl0).length, autreC = pionsDe(b, c).length - pareil;
      if (pareil >= 4 && pareil >= autreC + 2) { ajout(5, 'Ton <b>fou ' + nomCase(s) + ' est « mauvais »</b> : ' + pareil + ' de tes pions sont sur des cases de sa couleur et lui bouchent la route. Plan : <b>le sortir devant ses pions</b>, mettre les pions sur l’autre couleur, ou l’échanger.', null, carres([s], C_JAUNE)); break; }
    }
    // le centre : qui le tient, la tension, les ruptures de pions
    if (!fin) {
      const cC = controleCentre(b, c), cO = controleCentre(b, O);
      if (cC >= cO + 3) ajout(4.5, 'Tu <b>contrôles mieux le centre</b> (' + cC + ' attaques sur d4, e4, d5, e5 contre ' + cO + ') : tes pièces y passent facilement d’une aile à l’autre. Garde ce contrôle.', 'L’adversaire tient mieux le centre : il faut le <b>contester</b> (pions et pièces vers d4, e4, d5, e5).', carres(CENTRE, C_VERT));
      else if (cO >= cC + 3) ajout(5, 'L’adversaire <b>contrôle mieux le centre</b> (' + cO + ' attaques sur les cases centrales contre ' + cC + ') : il faut le <b>contester</b>, avec un pion ou en amenant des pièces qui visent d4, e4, d5, e5.', null, carres(CENTRE, C_ROUGE));
      let tension = null;
      for (const s of pionsDe(b, c)) for (const a of attaques(b, s)) if (b[a] === pionDe(O) && col(s) >= 2 && col(s) <= 5) tension = tension || [s, a];
      if (tension) ajout(4, '<b>Tension au centre</b> : ton pion ' + nomCase(tension[0]) + ' et le pion ' + nomCase(tension[1]) + ' se touchent. Souvent, il ne faut <b>pas se presser de prendre</b> : celui qui échange libère le jeu de l’autre.', null, carres(tension, C_JAUNE));
      else {
        const d = c === 'w' ? 8 : -8;
        let rupt = null;
        for (const s of pionsDe(b, c)) {
          if (rupt || col(s) < 1 || col(s) > 6) continue;
          const pas = [s + d];
          if (relRg(s, c) === 1 && !b[s + d]) pas.push(s + 2 * d);
          for (const t of pas) {
            if (rupt || b[t] || (t === s + 2 * d && b[s + d])) continue;
            const b2 = b.slice(); b2[t] = b2[s]; b2[s] = null;
            if (attaques(b2, t).some((q) => b2[q] === pionDe(O)) && attaquants(b2, t, O).filter((a) => b2[a] === pionDe(O)).length <= attaquants(b2, t, c).length) rupt = [s, t];
          }
        }
        if (rupt) ajout(5, '<b>Rupture de pions</b> : le pion ' + FI[col(rupt[0])] + ' peut avancer jusqu’en ' + nomCase(rupt[1]) + ' pour attaquer les pions adverses et <b>ouvrir des lignes</b> pour tes pièces. C’est l’idée à préparer ; le bon moment, c’est quand tes pièces sont prêtes à profiter des lignes ouvertes.', 'L’adversaire prépare une rupture avec son pion ' + FI[col(rupt[0])] + ' (vers ' + nomCase(rupt[1]) + ') pour ouvrir le jeu.', [{ de: nomCase(rupt[0]), vers: nomCase(rupt[1]), couleur: C_COUP }]);
      }
    }
    // espace
    const espace =(cc) => pionsDe(b, cc).filter((q) => relRg(q, cc) >= 4 && col(q) >= 2 && col(q) <= 5).length;
    if (!fin && !ouverture && espace(c) >= 2 && espace(c) > espace(O) + 1) ajout(4.5, 'Tu as <b>plus d’espace</b> (pions avancés au centre) : tes pièces circulent mieux. Évite les échanges qui libéreraient l’adversaire, il étouffe.', 'L’adversaire a plus d’espace : chercher à <b>échanger des pièces</b> et à casser ses pions avancés.');
    // la pièce la moins active
    if (!ouverture && !fin) {
      let pire = -1, mob = 99;
      for (let s = 0; s < 64; s++) if (b[s] && coul(b[s]) === c && ['n', 'b', 'r'].includes(typ(b[s]))) { const n = mobilite(b, s); if (n < mob) { mob = n; pire = s; } }
      if (pire >= 0 && mob <= 3 && !out.some((x) => x.dessin.some((d) => d.carre && d.vers === nomCase(pire)))) ajout(5, 'Ta <b>pièce la moins active</b> est ' + pieceEn(b, pire) + ' (' + mob + ' case' + (mob > 1 ? 's' : '') + ' seulement) : un bon plan simple est de <b>lui trouver une meilleure place</b>. Une armée vaut ce que vaut sa pire pièce.', null, carres([pire], C_JAUNE));
    }
    return out.sort((x, y) => y.poids - x.poids);
  }
  // ce que font les coups de S dans une ligne du moteur, en mots stratégiques (sans nommer les coups)
  function resumeLigne(P0, pv, S) {
    let P = P0;
    const O = autre(S), faits = [], ajout = (k, t) => { if (!faits.some((f) => f.k === k)) faits.push({ k, t }); };
    const ailes = [0, 0, 0];
    for (let i = 0; i < Math.min(pv.length, 8) && P; i++) {
      const u = pv[i], de = lireCase(u.slice(0, 2)), vers = lireCase(u.slice(2, 4)), p = P.b[de];
      const P1 = jouer(P, u);
      if (!P1) break;
      if (i % 2 === 0 && p) {
        const t = typ(p);
        if (P1.roque) ajout('roque', 'mettre le roi à l’abri (roque)');
        else if (DEPART[S][t] && DEPART[S][t].includes(de)) ajout('dev', 'sortir les pièces restées chez elles');
        if (P1.prise) ajout('prise', V[P1.prise] >= 3 && t !== 'p' ? 'échanger des pièces' : 'gagner ou échanger du matériel');
        if (t === 'p' && !P1.prise) { if (P1.promo) ajout('promo', 'aller à dame'); else if (pionPasse(P.b, de)) ajout('passe', 'pousser le pion passé'); else if (col(de) >= 3 && col(de) <= 4 && relRg(de, S) <= 2) ajout('centre', 'prendre de la place au centre avec les pions'); else ailes[aileDe(col(de))]++; }
        if (t !== 'p' && t !== 'k' && !P1.prise) {
          const kO = roiDe(P1.b, O);
          if (kO >= 0 && Math.max(Math.abs(col(vers) - col(kO)), Math.abs(rg(vers) - rg(kO))) <= 2 && !finale(P.b)) ajout('roi', 'rapprocher les pièces du roi adverse');
          else if (t === 'r' && !pionsColonne(P1.b, col(vers), S)) ajout('col', 'placer une tour sur une colonne ouverte');
          else if (mobilite(P1.b, vers) >= mobilite(P.b, de) + 2) ajout('act', 'rendre une pièce plus active');
          else if (CENTRE.includes(vers) || casesFortes(P1.b, S).some((x) => x.s === vers)) ajout('case', 'installer une pièce sur une bonne case');
        }
        if (t === 'k' && !P1.roque && finale(P.b)) ajout('rk', 'activer le roi');
        if (enEchec(P1.b, O) && !P1.prise) ajout('echec', 'gagner du temps par des échecs');
      }
      P = P1;
    }
    const a = ailes.indexOf(Math.max(...ailes));
    if (ailes[a] >= 1) ajout('aile', 'avancer les pions de ' + AILES[a].nom);
    return faits;
  }

  // =====================================================================
  //  INTERFACE
  // =====================================================================
  const cache = {};
  let etat = null;
  let jeton = 0;

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ctx = { variante, fen0, coups (jusqu'à la position), conteneur, plateau, restaurer(),
             lignes() -> promesse des lignes du moteur (les MÊMES que les conseils ou le bilan),
             joue (uci joué, bilan), exact (score exact vu du camp au trait, facultatif) } */
  function ouvrir(ctx) {
    fermer();
    const id = ++jeton;
    const box = el('div', 'coach');
    box.innerHTML = '<div class="coach-tete"><b>🎓 Coach</b><div class="coach-onglets"></div><button class="bouton coach-fermer" title="Fermer (Échap)">✖</button></div>' +
      '<div class="coach-corps"></div>' +
      '<div class="coach-nav"><button class="bouton coach-prec">◀ Page précédente</button><button class="bouton principal coach-suiv">Page suivante ▶</button></div>';
    ctx.conteneur.appendChild(box);
    // sur téléphone : plateau plus petit tant que le coach est ouvert, pour que ses explications tiennent sans défiler
    const ecr = ctx.conteneur.closest('.ecran');
    if (ecr) { ecr.classList.add('coach-actif'); requestAnimationFrame(() => window.App.redimensionner()); }
    box.querySelector('.coach-fermer').onclick = () => fermer();
    box.querySelector('.coach-prec').onclick = () => bouger(-1);
    box.querySelector('.coach-suiv').onclick = () => bouger(1);
    etat = { ctx, el: box, id, pages: null, page: 0 };
    ctx.plateau.bloquer();
    attente('Le coach regarde la position…');
    preparer(ctx, id).then((pages) => {
      if (!etat || etat.id !== id) return;
      etat.pages = pages; etat.page = 0;
      montrer();
    }).catch((e) => {
      if (e && e.message !== 'fermé') console.error(e);
      if (etat && etat.id === id) attente(e && e.message === 'fin' ? 'La partie est finie ici : plus de coup à expliquer.' : 'Le coach n’a pas pu analyser cette position.');
    });
  }
  function attente(t) {
    if (!etat) return;
    etat.el.querySelector('.coach-corps').innerHTML = '<p class="coach-attente">' + t + '</p>';
    etat.el.querySelector('.coach-nav').style.visibility = 'hidden';
  }
  function fermer(sansRestaurer) {
    if (!etat) return;
    const e = etat;
    etat = null;
    jeton++;
    const m = window.Moteurs.tous().find((x) => x.role === 'aide');
    if (m && m.pret) m.arreter();
    e.el.remove();
    const ecr = e.ctx.conteneur.closest('.ecran');
    if (ecr) { ecr.classList.remove('coach-actif'); requestAnimationFrame(() => window.App.redimensionner()); }
    e.ctx.plateau.coachDessin(null);
    if (!sansRestaurer) e.ctx.restaurer();
  }
  const ouvert = () => !!etat;

  function bouger(d) {
    if (!etat || !etat.pages) return;
    const p = Math.max(0, Math.min(etat.pages.length - 1, etat.page + d));
    if (p === etat.page) return;
    etat.page = p;
    montrer();
  }
  // vue du plateau : { fen, dernier, dessin }
  function vue(v) {
    const ctx = etat.ctx;
    ctx.plateau.afficher(window.Regles.lireFen(v.fen || etat.base), { variante: ctx.variante, dernier: v.dernier || null });
    ctx.plateau.coachDessin(v.dessin || []);
  }
  function montrer() {
    const pg = etat.pages[etat.page];
    const ong = etat.el.querySelector('.coach-onglets');
    ong.innerHTML = '';
    etat.pages.forEach((x, i) => {
      const b = el('button', i === etat.page ? 'actif' : '', x.nom);
      b.onclick = () => { etat.page = i; montrer(); };
      ong.appendChild(b);
    });
    const corps = etat.el.querySelector('.coach-corps');
    corps.innerHTML = pg.html;
    const nav = etat.el.querySelector('.coach-nav');
    nav.style.visibility = etat.pages.length > 1 ? '' : 'hidden';
    nav.querySelector('.coach-prec').disabled = etat.page === 0;
    nav.querySelector('.coach-suiv').disabled = etat.page === etat.pages.length - 1;
    // éléments cliquables : ils changent ce que montre le plateau
    const choisir = (k) => {
      corps.querySelectorAll('[data-vue]').forEach((x) => x.classList.toggle('choisi', +x.dataset.vue === k));
      vue(pg.vues[k]);
    };
    corps.querySelectorAll('[data-vue]').forEach((x) => { x.onclick = () => choisir(+x.dataset.vue); });
    // sous-onglets (page « Réflexion ») : une seule partie affichée à la fois
    const plis = corps.querySelectorAll('.coach-pli');
    corps.querySelectorAll('.coach-so').forEach((t) => {
      t.onclick = () => {
        corps.querySelectorAll('.coach-so').forEach((x) => x.classList.toggle('actif', x === t));
        plis.forEach((p, i) => p.classList.toggle('ouvert', i === +t.dataset.pli));
        choisir(+t.dataset.v);
        ajuster(corps);
      };
    });
    choisir(0);
    if (pg.init) pg.init(corps, choisir);
    ajuster(corps);
  }
  // jamais de défilement : si la page ne tient pas, on masque les phrases secondaires (de la dernière à la première)
  function ajuster(corps) {
    const opts = [...corps.querySelectorAll('.coach-opt')];
    opts.forEach((x) => x.classList.remove('coach-cache'));
    for (let i = opts.length - 1; i >= 0 && corps.scrollHeight > corps.clientHeight + 1; i--) if (opts[i].offsetParent) opts[i].classList.add('coach-cache');
  }

  // --------------------------------------------------------------------
  //  Préparation : moteur + idées -> 2 ou 3 pages
  // --------------------------------------------------------------------
  const PROF_MENACE = { sf: 16, fairy: 11, maison: 4 };
  const typeMoteur = (v) => (v.moteur === 'sf' ? 'sf' : v.moteur === 'maison' ? 'maison' : 'fairy');

  function classique(v, fen) {
    if (v.moteur === 'sf') return true;
    if (v.moteur === 'maison') return false;
    const pos = window.Regles.lireFen(fen);
    if (pos.cols !== 8 || pos.lignes !== 8 || pos.poches || pos.echecs || (pos.trous && pos.trous.size)) return false;
    if (/[^kqrbnp1-8\/]/i.test(fen.split(' ')[0])) return false;
    const P = v.pieces || {};
    return !Object.keys(P).some((l) => P[l] && P[l].marque);
  }

  async function preparer(ctx, id) {
    const v = ctx.variante;
    const tm = typeMoteur(v);
    const partie = new window.Regles.Partie(v, ctx.fen0, ctx.coups);
    const fen = partie.fen;
    etat.base = fen;
    const enEchecMaintenant = partie.echec();
    const S = partie.trait();
    const legaux = partie.legaux();
    partie.detruire();
    if (!legaux.length) throw new Error('fin');
    const cle = v.uci + '|' + fen + '|' + (ctx.joue || '') + '|' + (ctx.source || '');
    if (cache[cle]) return construire(ctx, cache[cle]);

    attente('Le coach cherche les meilleurs coups…');
    const lignes = (await ctx.lignes()).filter((l) => l && l.pv && l.pv.length);
    if (!etat || etat.id !== id) throw new Error('fermé');
    if (!lignes.length) throw new Error('rien');
    // la menace : que ferait l'adversaire si c'était encore à lui de jouer ?
    let menace = null;
    if (!enEchecMaintenant && v.moteur !== 'maison') {
      attente('Le coach regarde ce que prépare l’adversaire…');
      const ch = fen.split(/\s+/);
      ch[1] = S === 'w' ? 'b' : 'w'; if (ch.length > 3) ch[3] = '-';
      try {
        const rm = await window.Moteurs.pourVariante(v, 'coach').chercher({
          variante: v, fen0: ch.join(' '), coups: [], elo: null, profondeur: PROF_MENACE[tm], temps: 15000, multipv: 1, deterministe: true
        });
        if (rm && !rm.annulee && rm.lignes[0] && rm.lignes[0].pv && rm.lignes[0].pv.length) menace = { score: rm.lignes[0].score, pv: rm.lignes[0].pv.slice(0, 6) };
      } catch (e) { menace = null; }
      if (!etat || etat.id !== id) throw new Error('fermé');
    }
    // les coups « tentants » (échecs et prises) que le moteur n'a pas gardés : on les fait calculer pour dire POURQUOI ils ne marchent pas
    let tentants = [];
    if (v.moteur !== 'maison' && classique(v, fen)) {
      const P0 = lire(fen), O = autre(S);
      const deja = new Set(lignes.map((l) => l.pv[0]));
      const cands = [];
      for (const u of legaux) {
        if (deja.has(u) || (u.length > 4 && u[4] !== 'q')) continue;
        const P1 = jouer(P0, u); if (!P1) continue;
        const ech = enEchec(P1.b, O);
        if (!ech && !P1.prise) continue;
        cands.push({ u, poids: (ech ? 4 : 0) + (P1.prise ? V[P1.prise] : 0) + (P1.prise && see(P0.b, lireCase(u.slice(0, 2)), lireCase(u.slice(2, 4))) < 0 ? 2 : 0) });
      }
      cands.sort((a, b) => b.poids - a.poids);
      const choix = cands.slice(0, 4).map((c) => c.u);
      if (choix.length) {
        attente('Le coach vérifie les coups tentants (échecs et prises)…');
        try {
          const rt = await window.Moteurs.pourVariante(v, 'coach').chercher({
            variante: v, fen0: ctx.fen0, coups: ctx.coups, elo: null, profondeur: PROF_MENACE[tm], temps: 20000, multipv: choix.length, deterministe: true, coupsLimites: choix
          });
          if (rt && !rt.annulee) tentants = rt.lignes.filter((l) => l && l.pv && l.pv.length && choix.includes(l.pv[0])).map((l) => ({ score: l.score, pv: l.pv.slice(0, 6) }));
        } catch (e) { tentants = []; }
        if (!etat || etat.id !== id) throw new Error('fermé');
      }
      // le nombre total d'échecs et de prises possibles (méthode des coups forçants)
      tentants.nbEchecs = 0; tentants.nbPrises = 0;
      for (const u of legaux) { if (u.length > 4 && u[4] !== 'q') continue; const P1 = jouer(P0, u); if (!P1) continue; if (enEchec(P1.b, O)) tentants.nbEchecs++; if (P1.prise) tentants.nbPrises++; }
    }
    const donnees = { fen, S, lignes: lignes.map((l) => ({ score: l.score, pv: l.pv.slice(0, 10), joue: !!l.joue })), menace, tentants, nbEchecs: tentants.nbEchecs || 0, nbPrises: tentants.nbPrises || 0 };
    cache[cle] = donnees;
    return construire(ctx, donnees);
  }

  // positions (fen) le long d'une suite de coups
  function fensSuite(ctx, pv) {
    const p = new window.Regles.Partie(ctx.variante, ctx.fen0, ctx.coups);
    const out = [];
    try { for (const u of pv) { if (!p.jouer(u)) break; out.push({ fen: p.fen, san: p.sans[p.sans.length - 1], uci: u, echec: p.echec(), prise: p.prises[p.prises.length - 1] }); } } catch (e) { /* rien */ }
    p.detruire();
    return out;
  }
  const flecheUci = (u, c, etiquette) => { const d = window.Regles.decouper(u); return d ? { de: d.de, vers: d.vers, couleur: c, etiquette } : null; };
  const recolorer = (l, c) => l.filter(Boolean).map((x) => (x.couleur === C_COUP ? Object.assign({}, x, { couleur: c }) : x));

  function construire(ctx, D) {
    const cl = classique(ctx.variante, D.fen);
    const S = D.S, O = autre(S);
    const P0 = cl ? lire(D.fen) : null;
    const best = D.lignes[0];
    const suite = fensSuite(ctx, best.pv.slice(0, 8));
    const sanBest = suite[0] ? suite[0].san : best.pv[0];
    const fBest = flecheUci(best.pv[0], C_COUP);
    const pages = [];
    const dits = new Set(); // phrases déjà dites (pour ne jamais répéter)
    const dire = (t) => { const k = sansBalises(t).slice(0, 60); if (dits.has(k)) return false; dits.add(k); return true; };
    const eval1 = ctx.exact ? ctx.exact.texte : phraseScore(best.score, S);
    const joue = ctx.joue ? D.lignes.find((l) => l.joue) : null;
    const sanJoue = ctx.joue ? ((fensSuite(ctx, [ctx.joue])[0] || {}).san || ctx.joue) : null;

    // ---------- Page 1 : le meilleur coup et pourquoi ----------
    let h = '<h3 class="coach-titre">★ ' + sanBest + '</h3><p>' + Maj(aux(S)) + ' de jouer. Meilleur coup : <b class="coach-coup">' + sanBest + '</b> — ' + eval1 + '.';
    const egaux = D.lignes.slice(1).filter((l) => !l.joue && ecart(best.score, l.score) <= 0.15);
    const autresVrais = D.lignes.slice(1).filter((l) => !l.joue);
    if (best.score.mate != null && best.score.mate > 0) h += ' <b>Mat forcé</b> : chaque coup compte.';
    else if (egaux.length) {
      const noms = egaux.map((l) => (fensSuite(ctx, [l.pv[0]])[0] || {}).san || l.pv[0]);
      h += ' ' + (noms.length === 1 ? noms[0] + ' est' : noms.join(' et ') + ' sont') + ' aussi bon' + (noms.length > 1 ? 's' : '') + '.';
    } else if (autresVrais.length && ecart(best.score, autresVrais[0].score) >= 1.5) h += ' C’est <b>le seul bon coup</b> : tous les autres perdent beaucoup.';
    else if (autresVrais.length) {
      const z = autresVrais[0];
      h += ' Le 2e meilleur, ' + ((fensSuite(ctx, [z.pv[0]])[0] || {}).san || z.pv[0]) + ', fait <b>' + nb(ecart(best.score, z.score)) + '</b> de moins.';
    }
    else if (legauxUn(ctx)) h += ' C’est le seul coup possible.';
    h += '</p>';
    if (joue) {
      if (ctx.joue === best.pv[0]) h += '<p>✅ Dans la partie, <b>' + sanJoue + '</b> a été joué : c’était le meilleur.</p>';
      else h += '<p>Dans la partie : <b>' + sanJoue + '</b> (page « Les autres coups »).</p>';
    }
    let dessin1 = fBest ? [fBest] : [];
    const puces = [], notions1 = [];
    if (cl) {
      const ra = repriseAvant(ctx);
      const r = idees(P0, best.pv[0], { mat1: best.score.mate === 1, repriseCase: ra.repriseCase, repriseValeur: ra.repriseValeur });
      for (const x of nettoyer(r.idees, 3)) { if (!dire(x.texte)) continue; notions1.push(x.notion); puces.push(puce(x)); dessin1 = dessin1.concat(x.dessin.filter((d) => d && !(fBest && d.de === fBest.de && d.vers === fBest.vers))); }
    } else if (suite[0] && (suite[0].prise || suite[0].echec)) {
      puces.push('<li>' + (suite[0].prise ? 'Il <b>prend une pièce</b>' : '') + (suite[0].prise && suite[0].echec ? ' et ' : '') + (suite[0].echec ? (suite[0].prise ? 'donne' : 'Il donne') + ' <b>échec</b>' : '') + '.</li>');
    }
    // la menace adverse, dans la même page
    if (D.menace && D.menace.pv[0]) {
      const sm = D.menace.score; // vu de O
      const forte = (sm.mate != null && sm.mate > 0) || (best.score.mate == null && sm.mate == null && (sm.cp + best.score.cp) >= 150);
      if (forte) {
        const fenM = D.fen.split(/\s+/).map((x, i) => (i === 1 ? O : i === 3 ? '-' : x)).join(' ');
        let sanM = D.menace.pv[0];
        try { const pM = new window.Regles.Partie(ctx.variante, fenM, []); sanM = pM.suiteSan(0, D.menace.pv, 1)[0] || sanM; pM.detruire(); } catch (e) { /* rien */ }
        let quoi;
        if (sm.mate != null && sm.mate > 0) quoi = 'feraient <b>mat en ' + sm.mate + '</b> avec ' + sanM;
        else {
          quoi = 'joueraient <b>' + sanM + '</b>';
          if (cl) {
            const r = idees(Object.assign({}, P0, { t: O }), D.menace.pv[0]);
            if (r.idees[0]) quoi += ' (' + sansBalises(r.idees[0].texte).replace(/^./, (c) => c.toLowerCase()).replace(/\.$/, '') + ')';
          }
        }
        let pare;
        const plusTard = best.pv.findIndex((u, i) => i % 2 === 1 && u === D.menace.pv[0]);
        if (plusTard === 1) pare = 'On ne peut pas tout parer : ' + sanBest + ' est le coup qui <b>limite le plus les dégâts</b>.';
        else if (plusTard > 1) pare = sanBest + ' passe d’abord, mais ' + campNom(O) + ' joueront quand même ' + sanM + ' un peu plus tard : on ne peut pas tout sauver, c’est <b>le moins mauvais</b>.';
        else if (cl) {
          const P1 = jouer(P0, best.pv[0]);
          const u = D.menace.pv[0], de = lireCase(u.slice(0, 2)), vers = lireCase(u.slice(2, 4));
          if (P1 && (!P1.b[de] || coul(P1.b[de]) !== O)) pare = sanBest + ' <b>élimine la pièce</b> qui menaçait.';
          else if (P1 && P0.b[vers] && !P1.b[vers]) pare = sanBest + ' <b>met la pièce visée à l’abri</b>.';
          else if (P1 && P1.b[vers] && coul(P1.b[vers]) === S && see(P1.b, de, vers) <= 0) pare = sanBest + ' <b>défend la case</b>.';
          else if (best.score.mate != null && best.score.mate > 0) pare = sanBest + ' va plus vite que la menace.';
          else pare = 'Après ' + sanBest + ', la menace ne marche plus.';
        } else pare = 'Après ' + sanBest + ', la menace ne marche plus.';
        // déjà expliqué dans les idées du coup (« élimine l'attaquant », « met à l'abri »…) : on ne le répète pas
        if (notions1.includes('defense') && plusTard < 1) pare = '';
        const t = '⚠ <b>Menace adverse</b> : sans rien faire, ' + campNom(O) + ' ' + quoi + '.' + (pare ? ' ' + pare : '');
        if (dire(t)) {
          puces.push('<li class="coach-menace" title="' + NOTIONS.menace[1] + '">' + t + '</li>');
          const fm = flecheUci(D.menace.pv[0], C_MENACE);
          if (fm) dessin1.push(Object.assign(fm, { etiquette: '!' }));
        }
      }
    }
    // et ensuite : la réponse adverse et ce que le coup prépare (seulement ce qui touche à ce coup)
    const vues1 = [{ dessin: dessin1.slice(0, 8) }];
    let ensuite = '';
    if (suite.length > 1) {
      const rep = suite[1];
      let txtRep = '';
      let P1c = cl ? jouer(P0, best.pv[0]) : null;
      if (cl && P1c) {
        if (enEchec(P1c.b, O)) {
          // après un échec, la réponse est forcée : on dit simplement comment elle sort de l'échec
          const Pr = jouer(P1c, rep.uci);
          const de = lireCase(rep.uci.slice(0, 2));
          txtRep = typ(P1c.b[de]) === 'k' ? ' — le roi est obligé de fuir l’échec' : Pr && Pr.prise ? ' — elle prend la pièce qui donnait échec' : ' — elle bouche la ligne de l’échec';
        } else {
          const x = nettoyer(idees(P1c, rep.uci, { mat1: best.score.mate === -1, repriseCase: P1c.prise ? P1c.priseCase : null, repriseValeur: P1c.prise ? V[P1c.prise] : 0 }).idees, 1)[0];
          if (x && dire(x.texte)) txtRep = ' — ' + court(x.texte);
        }
      } else if (rep.prise || rep.echec) txtRep = rep.prise ? ' (une prise)' : ' (échec)';
      vues1.push({ fen: rep.fen, dernier: window.App.dernierCoupCases(rep.uci), dessin: [] });
      ensuite += '<li><span class="coach-chip" data-vue="1">● ' + rep.san + '</span> meilleure réponse ' + des(O) + txtRep + '.</li>';
      if (suite[2]) {
        const plan = suite[2];
        let txtPlan = '';
        if (cl && P1c) {
          const P2 = jouer(P1c, rep.uci);
          const x = P2 ? nettoyer(idees(P2, plan.uci, { mat1: best.score.mate === 2, repriseCase: P2.prise ? P2.priseCase : null, repriseValeur: P2.prise ? V[P2.prise] : 0 }).idees, 1)[0] : null;
          if (x && dire(x.texte)) txtPlan = ' — ' + court(x.texte);
        }
        vues1.push({ fen: plan.fen, dernier: window.App.dernierCoupCases(plan.uci), dessin: [] });
        ensuite += '<li><span class="coach-chip" data-vue="2">○ ' + plan.san + '</span> ' + (txtPlan ? 'ce que ' + sanBest + ' prépare' + txtPlan : 'la suite prévue : un coup de placement, sans menace directe') + '.</li>';
      }
    }
    if (!puces.length) puces.push('<li>' + (suite[2] ? 'Pas de gain tout de suite : ' + sanBest + ' sert surtout à préparer la suite ci-dessous.' : 'Pas de gain tout de suite : le moteur le préfère de peu aux autres coups.') + '</li>');
    h += '<p class="coach-sous">Pourquoi ' + sanBest + ' :</p><ul class="coach-liste">' + puces.join('') + '</ul>';
    if (ensuite) h += '<div class="coach-opt"><p class="coach-sous">Et ensuite <span class="coach-ligne">(clique pour voir)</span> :</p><ul class="coach-liste">' + ensuite + '</ul></div>';
    h = h.replace('<h3 class="coach-titre">★ ' + sanBest + '</h3>', '<h3 class="coach-titre" data-vue="0">★ Pourquoi ' + sanBest + ' ?</h3>');
    pages.push({ nom: '★ Pourquoi ' + sanBest, html: h, vues: vues1 });

    // ---------- Page 2 : la réflexion détaillée ----------
    const p2 = pageReflexion(ctx, D, { cl, P0, S, O, best, suite, sanBest, fBest, notions1, dire });
    if (p2) pages.push(p2);

    // ---------- Page 3 : les autres coups (le 2e meilleur, le coup joué, puis les moins bons) ----------
    const alts = [];
    const second = D.lignes.slice(1).find((l) => l.pv[0] !== best.pv[0]);
    if (second) alts.push(second);
    if (joue && ctx.joue !== best.pv[0] && !alts.includes(joue)) alts.push(joue);
    for (const l of D.lignes.slice(1)) if (!alts.includes(l) && l.pv[0] !== best.pv[0] && alts.length < 3) alts.push(l);
    if (alts.length) {
      const vues = [];
      const planBest = cl ? resumeLigne(P0, best.pv, S) : [];
      const onglets = [];
      let h3 = '';
      alts.forEach((l) => {
        const s2 = fensSuite(ctx, l.pv.slice(0, 8));
        if (!s2.length) return;
        const g = ecart(best.score, l.score);
        const rang = D.lignes.indexOf(l);
        const etiq = (rang === 1 ? '2e meilleur coup' : rang > 1 ? (rang + 1) + 'e coup du moteur' : '') + (l.joue ? (rang >= 1 ? ', ' : '') + 'joué' : '');
        let tete = '<b>' + s2[0].san + '</b>' + (etiq ? ' (' + etiq + ')' : '') + ' : ' + phraseScore(l.score, S) + (g >= 99 ? '' : g > 0.004 ? ', soit <b>−' + nb(g) + '</b> par rapport à ' + sanBest : ', <b>exactement aussi bon</b> que ' + sanBest) + '.';
        const det = [];
        const dessin = [];
        if (cl) {
          const ra = repriseAvant(ctx);
          // l'idée du coup lui-même
          const id1 = nettoyer(idees(P0, l.pv[0], { mat1: l.score.mate === 1, repriseCase: ra.repriseCase, repriseValeur: ra.repriseValeur }).idees, 2);
          if (id1.length) det.push('<span class="coach-opt"><b>Son idée</b> : ' + listeEt(id1.map((x) => court(x.texte))) + '.</span>');
          // la réponse adverse
          if (s2[1]) {
            const Pa = jouer(P0, l.pv[0]);
            const rep = Pa ? nettoyer(idees(Pa, l.pv[1], { mat1: l.score.mate === -1, repriseCase: Pa.prise ? Pa.priseCase : null, repriseValeur: Pa.prise ? V[Pa.prise] : 0 }).idees, 1)[0] : null;
            det.push('<b>Réponse ' + des(O) + '</b> : ' + s2[1].san + (rep ? ' — ' + court(rep.texte) : '') + '.');
            if (rep) dessin.push(...recolorer(rep.dessin, C_MENACE)); else { const f = flecheUci(l.pv[1], C_MENACE); if (f) dessin.push(f); }
          }
          // le plan : en quoi il diffère du meilleur coup
          const planL = resumeLigne(P0, l.pv, S);
          const commun = planL.filter((f) => planBest.some((x) => x.k === f.k)).map((f) => f.t);
          const seulL = planL.filter((f) => !planBest.some((x) => x.k === f.k)).map((f) => f.t);
          const seulB = planBest.filter((f) => !planL.some((x) => x.k === f.k)).map((f) => f.t);
          if (seulL.length || seulB.length) det.push('<b>Le plan</b> : ' + (commun.length ? 'comme ' + sanBest + ', il cherche à ' + listeEt(commun.slice(0, 2)) + ', mais ' : '') +
            (seulL.length ? 'il préfère ' + listeEt(seulL.slice(0, 2)) : 'il ne fait rien de plus') + (seulB.length ? ', là où ' + sanBest + ' cherche plutôt à ' + listeEt(seulB.slice(0, 2)) : '') + '.');
          else if (commun.length) det.push('<b>Le plan</b> : le même que ' + sanBest + ' (' + listeEt(commun.slice(0, 2)) + '), dans un autre ordre.');
          // au bout de la ligne : matériel et activité comparés au meilleur coup
          const finB = lire((suite[Math.min(s2.length, suite.length) - 1] || { fen: D.fen }).fen).b, finL = lire(s2[s2.length - 1].fen).b;
          const bb = bilanPieces(P0.b, finB, S), bp = bilanPieces(P0.b, finL, S);
          const aB = activiteTotale(finB, S), aL = activiteTotale(finL, S);
          const cmp = [];
          if (bp.net < bb.net) cmp.push('<b>' + (bb.net - bp.net) + ' point' + (bb.net - bp.net > 1 ? 's' : '') + ' de matériel en moins</b>');
          else if (bp.net > bb.net) cmp.push((bp.net - bb.net) + ' point' + (bp.net - bb.net > 1 ? 's' : '') + ' de matériel en plus, mais une position moins bonne ailleurs');
          if (aL <= aB - 3) cmp.push('des pièces <b>moins actives</b> (' + aL + ' cases contrôlées au lieu de ' + aB + ')');
          else if (aL >= aB + 3) cmp.push('des pièces plus actives (' + aL + ' cases au lieu de ' + aB + ')');
          // le verdict
          const verdict = (g <= 0.004 ? '<b>Verdict</b> : les deux se valent, c’est une question de goût.' : g <= 0.15 ? '<b>Verdict</b> : presque aussi bon, la différence (' + nb(g) + ') est minuscule. Tu peux le jouer sans crainte.' : g <= 0.5 ? '<b>Verdict</b> : un peu moins précis, sans faute grave.' : g <= 1.5 ? '<b>Verdict</b> : une <b>imprécision</b> qui donne quelque chose à l’adversaire.' : '<b>Verdict</b> : une <b>erreur</b> sérieuse.');
          det.push(verdict + (cmp.length ? '<span class="coach-opt"> Au bout de la suite, par rapport à ' + sanBest + ' : ' + listeEt(cmp) + '.</span>' : ''));
        } else if (s2[1]) {
          det.push('Réponse : <b>' + s2[1].san + '</b>' + (s2[1].prise ? ', qui prend une pièce' : '') + (s2[1].echec ? ', avec échec' : '') + '.');
          const f = flecheUci(l.pv[1], C_MENACE); if (f) dessin.push(f);
        }
        vues.push(s2[1] ? { fen: s2[0].fen, dernier: window.App.dernierCoupCases(l.pv[0]), dessin } : { dessin: [flecheUci(l.pv[0], C_ADV, '?'), fBest].filter(Boolean) });
        onglets.push({ court: s2[0].san + (rang === 1 ? ' (2e)' : rang > 1 ? ' (' + (rang + 1) + 'e)' : '') + (l.joue ? ' joué' : ''), html: '<p>' + tete + '</p>' + (det.length ? '<ul class="coach-liste">' + det.map((x) => /^<span class="coach-opt">.*<\/span>$/.test(x) ? '<li class="coach-opt">' + x.slice(24, -7) + '</li>' : '<li>' + x + '</li>').join('') + '</ul>' : '') });
      });
      if (onglets.length) {
        h3 += '<div class="coach-sous-onglets">' + onglets.map((o, i) => '<button class="coach-so' + (i === 0 ? ' actif' : '') + '" data-pli="' + i + '" data-v="' + i + '">' + o.court + '</button>').join('') + '</div>';
        onglets.forEach((o, i) => { h3 += '<div class="coach-pli' + (i === 0 ? ' ouvert' : '') + '">' + o.html + '</div>'; });
        h3 += '<p class="coach-ligne coach-opt">Le plateau montre la position après ce coup, et la réponse en rouge.</p>';
        pages.push({ nom: '? Les autres coups', html: h3, vues });
      }
    }
    // ---------- Page 4 : « Ton coup » — on tape un coup, le coach dit pourquoi il est bon ou mauvais ----------
    if (cl) pages.push(pageTonCoup(ctx, D, { P0, S, O, best, suite, sanBest, fBest }));
    return pages;
  }
  // =====================================================================
  //  « TON COUP » : le joueur tape un coup, le coach l'explique en détail
  // =====================================================================
  const normCoup = (t) => t.replace(/[+#!?\s]/g, '').replace(/0/g, 'O').replace(/=/g, '').replace(/^o-o(-o)?$/i, (m) => m.toUpperCase());
  // les coups légaux avec leur notation (française), pour reconnaître ce que le joueur tape
  function coupsNommes(ctx) {
    const p = new window.Regles.Partie(ctx.variante, ctx.fen0, ctx.coups);
    const out = [];
    try {
      for (const u of p.legaux()) { if (p.jouer(u)) { out.push({ uci: u, san: p.sans[p.sans.length - 1] }); p.annuler(); } }
    } catch (e) { /* rien */ }
    p.detruire();
    return out;
  }
  function trouverCoup(liste, texte) {
    const t = normCoup(texte.trim());
    if (!t) return null;
    const uci = t.toLowerCase();
    let c = liste.find((x) => x.uci === uci || (x.uci.length === 5 && x.uci.slice(0, 4) === uci && x.uci[4] === 'q'));
    if (c) return c;
    const sans = (s) => normCoup(s).replace(/x/g, '');
    const essais = [t, t.replace(/^N/, 'C').replace(/^B/, 'F').replace(/^Q/, 'D').replace(/^K/, 'R'), t.replace(/^R/, 'T').replace(/^K/, 'R')];
    for (const e of essais) {
      const v = e.replace(/x/g, '');
      c = liste.find((x) => sans(x.san) === v) || liste.find((x) => sans(x.san).toLowerCase() === v.toLowerCase());
      if (c) return c;
    }
    return null;
  }
  const NIVEAUX = [
    [0.004, '★ Meilleur coup', 'C’est exactement le coup du moteur.', 'top'],
    [0.1, '✔ Excellent', 'Presque aussi bon que le meilleur : la différence ne se verra pas dans une vraie partie.', 'bon'],
    [0.3, '✔ Bon coup', 'Un coup sain, un peu moins précis que le meilleur.', 'bon'],
    [0.7, '≈ Imprécision', 'Jouable, mais il laisse passer une partie de l’avantage.', 'moyen'],
    [1.5, '? Erreur', 'Il donne à l’adversaire un vrai avantage.', 'mauvais'],
    [99, '?? Gaffe', 'Il perd beaucoup (matériel ou position) : à éviter.', 'mauvais']
  ];
  function pageTonCoup(ctx, D, o) {
    const { P0, S, O, best, sanBest, fBest } = o;
    const vues = [{ dessin: fBest ? [fBest] : [] }];
    const html = '<div class="coach-ton-coup"><p>Tape un coup (<b>e4</b>, <b>Cf3</b>, <b>Fxc4</b>, <b>O-O</b>…) : le coach te dit surtout <b>pourquoi il est moins bon que le meilleur coup</b>, puis sa tactique et sa stratégie.</p>' +
      '<div class="coach-saisie"><input type="text" class="coach-input" maxlength="10" placeholder="ton coup" autocomplete="off" spellcheck="false"><button class="bouton principal coach-analyser">Analyser</button></div>' +
      '<div class="coach-resultat"></div></div>';
    let liste = null;
    const init = (corps, choisir) => {
      const inp = corps.querySelector('.coach-input'), res = corps.querySelector('.coach-resultat');
      const lancer = async () => {
        if (!liste) liste = coupsNommes(ctx);
        const c = trouverCoup(liste, inp.value);
        if (!c) { res.innerHTML = '<p class="coach-menace">Coup non reconnu ou impossible ici. Exemples de coups possibles : ' + liste.slice(0, 6).map((x) => '<b>' + x.san + '</b>').join(', ') + '.</p>'; ajuster(corps); return; }
        inp.value = c.san;
        const intro = corps.querySelector('.coach-ton-coup > p'); if (intro) intro.classList.add('coach-masque');
        res.innerHTML = '<p class="coach-attente">Le coach calcule ' + c.san + '…</p>';
        const id = etat && etat.id;
        let ligne = D.lignes.find((l) => l.pv[0] === c.uci), bestL = best;
        if (!ligne) {
          // même calcul pour ce coup et pour le meilleur, pour une comparaison juste
          try {
            const r = await window.Moteurs.pourVariante(ctx.variante, 'coach').chercher({
              variante: ctx.variante, fen0: ctx.fen0, coups: ctx.coups, elo: null, profondeur: 20, temps: 12000, multipv: 2, deterministe: true, coupsLimites: [c.uci, best.pv[0]]
            });
            if (!etat || etat.id !== id) return;
            const ls = (r && !r.annulee ? r.lignes : []).filter((l) => l && l.pv && l.pv.length);
            ligne = ls.find((l) => l.pv[0] === c.uci);
            const b2 = ls.find((l) => l.pv[0] === best.pv[0]);
            if (b2) bestL = b2;
          } catch (e) { ligne = null; }
        }
        if (!etat || etat.id !== id) return;
        if (!ligne) { res.innerHTML = '<p class="coach-menace">Le moteur n’a pas pu calculer ce coup.</p>'; return; }
        vues.length = 1;
        const secs = expliquerCoup(ctx, D, { P0, S, O, best: bestL, sanBest, fBest }, c, { score: ligne.score, pv: ligne.pv.slice(0, 8) }, vues);
        res.innerHTML = '<div class="coach-sous-onglets">' + secs.map((x, i) => '<button class="coach-so coach-so2' + (i === 0 ? ' actif' : '') + '" data-i="' + i + '">' + x.nom + '</button>').join('') + '</div>' +
          secs.map((x, i) => '<div class="coach-pli coach-pli2' + (i === 0 ? ' ouvert' : '') + '">' + x.html + '</div>').join('');
        const plis = res.querySelectorAll('.coach-pli2');
        res.querySelectorAll('[data-vue]').forEach((x) => { x.onclick = () => choisir(+x.dataset.vue); });
        res.querySelectorAll('.coach-so2').forEach((t) => {
          t.onclick = () => {
            res.querySelectorAll('.coach-so2').forEach((x) => x.classList.toggle('actif', x === t));
            plis.forEach((p, i) => p.classList.toggle('ouvert', i === +t.dataset.i));
            choisir(secs[+t.dataset.i].vue);
            ajuster(corps);
          };
        });
        choisir(secs[0].vue);
        ajuster(corps);
      };
      corps.querySelector('.coach-analyser').onclick = lancer;
      inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); lancer(); } e.stopPropagation(); };
      setTimeout(() => inp.focus(), 50);
    };
    return { nom: '✍ Ton coup', html, vues, init };
  }
  // l'explication détaillée d'un coup, en 4 parties : verdict, tactique, stratégie, comparaison
  function expliquerCoup(ctx, D, o, c, l, vues) {
    const { P0, S, O, best, sanBest, fBest } = o;
    const vueDe = (v) => { vues.push(v); return vues.length - 1; };
    const li = (t, v) => '<li' + (v != null ? ' data-vue="' + v + '"' : '') + '>' + t + '</li>';
    const estBest = c.uci === best.pv[0];
    const g = estBest ? 0 : Math.max(0, ecart(best.score, l.score));
    const niv = NIVEAUX.find((n) => g <= n[0]) || NIVEAUX[NIVEAUX.length - 1];
    const s2 = fensSuite(ctx, l.pv);
    const sb = fensSuite(ctx, best.pv.slice(0, 8));
    const fCoup = flecheUci(c.uci, niv[3] === 'mauvais' ? C_MENACE : niv[3] === 'moyen' ? C_ADV : C_COUP);
    const P1 = jouer(P0, c.uci);
    const ra = repriseAvant(ctx);
    const secs = [];

    // ce qui sert à plusieurs parties
    const PB = estBest ? P1 : jouer(P0, best.pv[0]);
    const ideesDe = (u, s, n) => nettoyer(idees(P0, u, { mat1: s.mate === 1, repriseCase: ra.repriseCase, repriseValeur: ra.repriseValeur }).idees, n);
    let id1 = ideesDe(c.uci, l.score, 3);
    const fauxSacrifice = g >= 1 && id1.some((x) => x.notion === 'sacrifice');
    if (fauxSacrifice) id1 = id1.filter((x) => x.notion !== 'sacrifice');
    const pire = (P) => (P ? menaces(P.b, O).sort((a, b) => b.gain - a.gain)[0] : null);
    const mL = pire(P1), mB = pire(PB);
    // la menace adverse d'avant : parée ou non par un coup ?
    let menaceAv = null;
    if (D.menace && D.menace.pv[0]) {
      const u = D.menace.pv[0], de = lireCase(u.slice(0, 2)), vers = lireCase(u.slice(2, 4));
      if (P0.b[vers] && coul(P0.b[vers]) === S && see(Object.assign([], P0.b), de, vers) > 0) menaceAv = { de, vers };
    }
    const pare = (P) => !menaceAv || !P || !P.b[menaceAv.de] || coul(P.b[menaceAv.de]) !== O || !P.b[menaceAv.vers] || coul(P.b[menaceAv.vers]) !== S || see(P.b, menaceAv.de, menaceAv.vers) <= 0;
    const finL = lire(s2[s2.length - 1] ? s2[s2.length - 1].fen : D.fen).b, finB = lire((sb[Math.min(s2.length, sb.length) - 1] || { fen: D.fen }).fen).b;
    const bl = bilanPieces(ra.fenAvant ? lire(ra.fenAvant).b : P0.b, finL, S), bb = bilanPieces(ra.fenAvant ? lire(ra.fenAvant).b : P0.b, finB, S);
    const dernierL = window.App.dernierCoupCases(c.uci);
    const vueMenace = (m, P, fen, dernier) => vueDe({ fen, dernier, dessin: [{ de: nomCase(m.par), vers: nomCase(m.s), couleur: C_MENACE }] });

    // 1. le verdict (meilleur coup) — sinon : POURQUOI il est moins bien que le meilleur (le cœur de l'explication)
    if (estBest) {
      const v0 = vueDe({ dessin: [fCoup].filter(Boolean) });
      let h = '<p class="coach-verdict ' + niv[3] + '"><b>' + c.san + ' : ' + niv[1] + '</b></p><ul class="coach-liste">';
      h += li('<b>Évaluation</b> : ' + phraseScore(l.score, S) + '.', v0);
      h += li(niv[2]);
      if (D.lignes[1] && D.lignes[1].pv[0]) {
        const s2b = fensSuite(ctx, D.lignes[1].pv.slice(0, 1));
        if (s2b[0]) h += li('Le 2e choix, <b>' + s2b[0].san + '</b>, est moins bon de <b>' + nb(Math.max(0, ecart(best.score, D.lignes[1].score))) + '</b>.', vueDe({ dessin: [fCoup, flecheUci(D.lignes[1].pv[0], C_ADV, '2')].filter(Boolean) }));
      }
      h += '</ul>';
      secs.push({ nom: '1. Verdict', html: h, vue: v0 });
    } else {
      const raisons = [];
      const ajout = (t, v) => raisons.push(li(t, v));
      // a. il laisse une pièce en prise (le meilleur, non)
      if (mL && mL.gain >= 1 && (!mB || mB.gain < mL.gain)) ajout('⚠ <b>Il laisse ' + pieceEn(P1.b, mL.s) + ' en prise</b> : ' + court2(P1.b, mL.par) + ' peut ' + (typ(P1.b[mL.s]) === 'r' || typ(P1.b[mL.s]) === 'q' ? 'la' : 'le') + ' prendre (environ <b>' + mL.gain + ' point' + (mL.gain > 1 ? 's' : '') + '</b>)' + (mB ? '.' : '. Avec ' + sanBest + ', rien n’est en prise.'), vueMenace(mL, P1, s2[0] && s2[0].fen, dernierL));
      // b. il ne pare pas la menace (le meilleur, si)
      if (menaceAv && !pare(P1) && pare(PB)) ajout('⚠ <b>Il ne pare pas la menace</b> : ' + court2(P0.b, menaceAv.de) + ' peut toujours prendre en ' + nomCase(menaceAv.vers) + '. ' + sanBest + ', lui, la pare.', vueDe({ dessin: [{ de: nomCase(menaceAv.de), vers: nomCase(menaceAv.vers), couleur: C_MENACE }] }));
      // c. la réponse qu'il permet à l'adversaire
      if (s2[1] && g >= 0.25) {
        const rep = P1 ? nettoyer(idees(P1, l.pv[1], { mat1: l.score.mate === -1, repriseCase: P1.prise ? P1.priseCase : null, repriseValeur: P1.prise ? V[P1.prise] : 0 }).idees, 1)[0] : null;
        ajout('↩ <b>Il permet ' + s2[1].san + '</b> ' + (O === 'w' ? 'aux blancs' : 'aux noirs') + (rep ? ' : ' + court(rep.texte) : '') + (sb[1] ? '. Après ' + sanBest + ', la meilleure réponse serait seulement ' + sb[1].san : '') + '.',
          vueDe({ fen: s2[1].fen, dernier: window.App.dernierCoupCases(l.pv[1]), dessin: rep ? recolorer(rep.dessin, C_MENACE) : [] }));
      }
      // d. ce que le meilleur fait et que ton coup ne fait pas
      const idB = ideesDe(best.pv[0], best.score, 3).filter((x) => !id1.some((y) => y.notion === x.notion));
      if (idB.length) ajout('✘ <b>Ce que ton coup ne fait pas</b> : avec ' + sanBest + ', ' + listeEt(idB.slice(0, 2).map((x) => court(x.texte))) + '.', vueDe({ dessin: [fBest].concat(idB[0].dessin).filter(Boolean) }));
      // e. le matériel au bout des deux suites
      if (bl.net < bb.net) ajout('⚖ <b>Matériel</b> : au bout des suites calculées, tu as <b>' + (bb.net - bl.net) + ' point' + (bb.net - bl.net > 1 ? 's' : '') + ' de moins</b> qu’avec ' + sanBest + '.', vueDe({ fen: s2[s2.length - 1] && s2[s2.length - 1].fen, dessin: [] }));
      // f. la position : atouts que le meilleur obtient, défauts que ton coup crée
      if (P1 && PB) {
        const defaut = (x) => /mauvais|moins active|moins de matériel|L’adversaire <b>contrôle|plus loin du centre|plus passive/.test(x.moi);
        const cleS = (x) => sansBalises(x.moi).slice(0, 40);
        const stL = strategie(Object.assign({}, P1, { coup: P0.coup }), S).filter((x) => x.moi), stB = strategie(Object.assign({}, PB, { coup: P0.coup }), S).filter((x) => x.moi);
        const crees = stL.filter((x) => defaut(x) && !stB.some((y) => cleS(y) === cleS(x)))[0];
        const manques = stB.filter((x) => !defaut(x) && !stL.some((y) => cleS(y) === cleS(x)))[0];
        if (crees) ajout('➖ <b>Défaut créé</b> (que ' + sanBest + ' évite) : ' + crees.moi, vueDe({ fen: s2[0] && s2[0].fen, dernier: dernierL, dessin: crees.dessin }));
        if (manques) ajout('➕ <b>Atout manqué</b> (que ' + sanBest + ' obtient) : ' + manques.moi, vueDe({ dessin: [fBest].concat(manques.dessin).filter(Boolean) }));
        const k0 = abriRoi(P0.b, S), kL = abriRoi(P1.b, S), kB = abriRoi(PB.b, S);
        if (k0 && kL && kB && !finale(P0.b) && kL.bouclier.length < Math.min(k0.bouclier.length, kB.bouclier.length)) ajout('⚠ <b>Sécurité du roi</b> : ton coup affaiblit l’abri de ton roi, ' + sanBest + ' non.', vueDe({ dessin: carres(zoneRoi(P1.b, S), C_ROUGE) }));
      }
      // g. le plan
      const planB = resumeLigne(P0, best.pv, S), planL = resumeLigne(P0, l.pv, S);
      const seulB = planB.filter((f) => !planL.some((x) => x.k === f.k)).map((f) => f.t), seulL = planL.filter((f) => !planB.some((x) => x.k === f.k)).map((f) => f.t);
      if (seulB.length) ajout('🧭 <b>Le plan</b> : ' + sanBest + ' cherche à ' + listeEt(seulB.slice(0, 2)) + (seulL.length ? ', alors que ' + c.san + ' préfère ' + listeEt(seulL.slice(0, 2)) : '') + '.');
      // rien de visible : la différence est dans le calcul
      if (!raisons.length) ajout(g < 0.1 ? '≈ La différence est <b>minime</b> : aucune pièce en prise, aucune menace ratée. Les deux coups mènent au même genre de position.' : '🔭 Pas de raison immédiate (ni pièce en prise, ni menace ratée) : la différence vient de la <b>suite</b>. Au bout du calcul, la position est ' + phraseScore(l.score, S) + ' contre ' + phraseScore(best.score, S) + ' avec ' + sanBest + '.', vueDe({ dessin: [fCoup, fBest].filter(Boolean) }));
      const v0 = vueDe({ dessin: [fCoup, fBest].filter(Boolean) });
      const h = '<p class="coach-verdict ' + niv[3] + '"><b>' + c.san + ' : ' + niv[1] + '</b> — ' + (g >= 99 ? 'énormément' : '<b>−' + nb(g) + '</b>') + ' par rapport à <b>' + sanBest + '</b> (le meilleur)</p>' +
        '<ul class="coach-liste">' + raisons.map((r, i) => (i >= 4 ? r.replace('<li', '<li class="coach-opt"') : r)).join('') + '</ul>';
      secs.push({ nom: '1. Pourquoi moins bien', html: h, vue: v0 });
    }
    // 2. la tactique : ce que le coup fait tout de suite, ce qu'il laisse, la réponse adverse
    {
      const items = [];
      if (fauxSacrifice) items.push(li('✘ Ce n’est <b>pas un vrai sacrifice</b> : la suite ne rapporte rien, le matériel est simplement perdu.', vueDe({ dessin: [fCoup].filter(Boolean) })));
      if (id1.length) id1.forEach((x) => items.push(li('✔ ' + x.texte, vueDe({ dessin: [fCoup].concat(x.dessin).filter(Boolean) }))));
      else items.push(li('Pas d’effet tactique immédiat : ni prise, ni menace, ni échec. C’est un <b>coup de placement</b>.', vueDe({ dessin: [fCoup].filter(Boolean) })));
      if (P1 && mL && mL.gain >= 1) items.push(li('⚠ Après ce coup, <b>' + pieceEn(P1.b, mL.s) + '</b> peut être ' + accord(typ(P1.b[mL.s]), 'pris') + ' (environ <b>' + mL.gain + ' point' + (mL.gain > 1 ? 's' : '') + '</b>).', vueMenace(mL, P1, s2[0] && s2[0].fen, dernierL)));
      if (P1 && menaceAv) items.push(li(pare(P1) ? '🛡 Il <b>pare la menace</b> adverse (' + court2(P0.b, menaceAv.de) + ' sur ' + nomCase(menaceAv.vers) + ').' : '⚠ Il <b>ne pare pas la menace</b> adverse : ' + court2(P0.b, menaceAv.de) + ' peut toujours prendre en ' + nomCase(menaceAv.vers) + '.', vueDe({ dessin: [{ de: nomCase(menaceAv.de), vers: nomCase(menaceAv.vers), couleur: pare(P1) ? C_DEF : C_MENACE }] })));
      if (s2[1]) {
        const rep = P1 ? nettoyer(idees(P1, l.pv[1], { mat1: l.score.mate === -1, repriseCase: P1.prise ? P1.priseCase : null, repriseValeur: P1.prise ? V[P1.prise] : 0 }).idees, 1)[0] : null;
        items.push(li('↩ <b>Meilleure réponse ' + des(O) + '</b> : ' + s2[1].san + (rep ? ' — ' + court(rep.texte) : '') + '.', vueDe({ fen: s2[1].fen, dernier: window.App.dernierCoupCases(l.pv[1]), dessin: rep ? recolorer(rep.dessin, C_MENACE) : [] })));
      }
      secs.push({ nom: '2. Tactique', html: '<ul class="coach-liste">' + items.slice(0, 5).join('') + '</ul>', vue: vues.length > 1 ? 1 : 0 });
    }
    // 3. la stratégie : ce que le coup change dans la position, et le plan qu'il suit
    {
      const items = [], v0 = vues.length;
      if (P1) {
        const ch = changements(P0.b, P1.b, S).filter((t) => !/^<b>(Matériel|Échanges)/.test(t));
        ch.slice(0, 2).forEach((t) => items.push(li('• ' + t, vueDe({ fen: s2[0] && s2[0].fen, dernier: dernierL, dessin: [] }))));
        const k0 = abriRoi(P0.b, S), k1 = abriRoi(P1.b, S);
        if (k0 && k1 && !finale(P0.b) && k1.bouclier.length < k0.bouclier.length && typ(P0.b[lireCase(c.uci.slice(0, 2))]) === 'p') items.push(li('⚠ <b>Sécurité du roi</b> : ce pion protégeait ton roi ; le bouger affaiblit son abri.', vueDe({ dessin: carres(zoneRoi(P1.b, S), C_ROUGE) })));
        const avant = strategie(P0, S).filter((x) => x.moi), apres = strategie(Object.assign({}, P1, { coup: P0.coup }), S).filter((x) => x.moi);
        const cleS = (x) => sansBalises(x.moi).slice(0, 40);
        const perdus = avant.filter((x) => !apres.some((y) => cleS(y) === cleS(x))).slice(0, 1);
        const gagnes = apres.filter((x) => !avant.some((y) => cleS(y) === cleS(x))).slice(0, 1);
        const defaut = (x) => /mauvais|moins active|moins de matériel|L’adversaire <b>contrôle|plus loin du centre|plus passive/.test(x.moi);
        gagnes.forEach((x) => items.push(li((defaut(x) ? '➖ Nouveau défaut : ' : '➕ Nouvel atout : ') + x.moi, vueDe({ dessin: x.dessin }))));
        perdus.forEach((x) => items.push(li((defaut(x) ? '➕ Défaut corrigé : ' : '➖ Atout perdu : ') + sansBalises(x.moi).split(' : ')[0] + '.', vueDe({ dessin: x.dessin }))));
      }
      const planL = resumeLigne(P0, l.pv, S).map((f) => f.t);
      if (planL.length) items.push(li('🧭 <b>Le plan</b> qu’il suit : ' + listeEt(planL.slice(0, 3)) + '.'));
      if (!items.length) items.push(li('Il ne change presque rien à la structure de la position : ni les pions, ni la sécurité des rois, ni l’activité des pièces.'));
      secs.push({ nom: '3. Stratégie', html: '<ul class="coach-liste">' + items.slice(0, 5).join('') + '</ul>', vue: vues.length > v0 ? v0 : 0 });
    }
    // 4. les deux suites côte à côte, et la leçon
    if (!estBest) {
      const items = [];
      const finS = (s) => s[s.length - 1];
      const vL = vueDe({ fen: finS(s2) && finS(s2).fen, dernier: finS(s2) && window.App.dernierCoupCases(finS(s2).uci), dessin: [] });
      const vB = vueDe({ fen: finS(sb) && finS(sb).fen, dernier: finS(sb) && window.App.dernierCoupCases(finS(sb).uci), dessin: [] });
      items.push(li('✍ <b>Ta suite</b> : ' + s2.slice(0, 6).map((x) => x.san).join(' ') + ' → ' + phraseScore(l.score, S) + '.', vL));
      items.push(li('★ <b>La meilleure</b> : ' + sb.slice(0, 6).map((x) => x.san).join(' ') + ' → ' + phraseScore(best.score, S) + '.', vB));
      const rang = D.lignes.findIndex((x) => x.pv[0] === c.uci);
      items.push(li(niv[2] + (rang > 0 ? ' C’est le <b>' + (rang + 1) + 'e choix</b> du moteur.' : '')));
      items.push(li('💡 <b>À retenir</b> : ' + (g >= 1.5 ? 'avant de jouer, vérifie toujours ce que l’adversaire peut prendre ou menacer après ton coup.' : g >= 0.3 ? 'cherche le coup qui fait le plus de choses à la fois (développer, menacer, améliorer la pire pièce).' : 'les deux coups se valent presque : choisis celui dont tu comprends le mieux le plan.')));
      secs.push({ nom: '4. Les deux suites', html: '<ul class="coach-liste">' + items.join('') + '</ul>', vue: vB });
    }
    return secs;
  }
  // Page 2 : comment un bon joueur réfléchit ici, en 3 parties dépliables (une seule ouverte à la fois)
  function pageReflexion(ctx, D, o) {
    const { cl, P0, S, O, best, suite, sanBest, fBest, notions1, dire } = o;
    const vues = [{ dessin: fBest ? [fBest] : [] }];
    const plis = [];
    const vueDe = (v) => { vues.push(v); return vues.length - 1; };
    const li = (texte, v) => '<li' + (v != null ? ' data-vue="' + v + '"' : '') + '>' + texte + '</li>';

    // 1. ce que je vois
    if (cl) {
      const ra = repriseAvant(ctx);
      const diag = diagnostic(P0, S, ra).filter((x) => dire(x.texte));
      if (diag.length) {
        const v0 = vueDe({ dessin: diag.reduce((a, x) => a.concat(x.dessin.filter((d) => d.carre)), []).slice(0, 24) });
        plis.push({ titre: '1. Ce que je vois dans la position', court: '1. La position', vue: v0,
          corps: '<p class="coach-ligne">Avant de chercher un coup, on fait le point. Clique une ligne pour la voir.</p><ul class="coach-liste">' + diag.map((x) => li(x.texte, vueDe({ dessin: x.dessin }))).join('') + '</ul>' });
      }
    }

    // 2. les coups forçants (échecs, prises) : lesquels marchent, lesquels non
    if (cl && D.tentants) {
      const items = [];
      const nE = D.nbEchecs || 0, nP = D.nbPrises || 0;
      const P1 = jouer(P0, best.pv[0]);
      const sorte = P1 && enEchec(P1.b, autre(S)) ? (P1.prise ? 'une prise avec échec' : 'un échec') : P1 && P1.prise ? 'une prise' : 'un <b>coup calme</b> (ni échec ni prise)';
      const intro = '<p>On regarde d’abord les <b>coups forçants</b> (échecs, prises). ' +
        (nE + nP ? 'Ici : <b>' + nE + ' échec' + (nE > 1 ? 's' : '') + '</b> et <b>' + nP + ' prise' + (nP > 1 ? 's' : '') + '</b>.' : 'Ici <b>aucun</b> : position calme, on cherche un plan.') +
        ' ' + sanBest + ' est ' + sorte + '.' + (!P1 || P1.prise || enEchec(P1.b, autre(S)) || !(nE + nP) ? '' : ' Aucun coup forçant ne fait mieux :') + '</p>';
      for (const t of D.tentants.slice(0, 2)) {
        const s2 = fensSuite(ctx, t.pv);
        if (!s2.length) continue;
        const g = ecart(best.score, t.score);
        const genre = s2[0].echec && s2[0].prise ? 'prise avec échec' : s2[0].echec ? 'échec' : 'prise';
        let tx;
        const dessin = [];
        if (g <= 0.15) tx = '<b>' + s2[0].san + '</b> (' + genre + ') : se joue aussi, presque aussi bon (' + (g > 0.04 ? '−' + nb(g) : 'pareil') + ').';
        else if (g <= 0.6) tx = '<b>' + s2[0].san + '</b> (' + genre + ') : jouable, mais un peu moins bon que ' + sanBest + ' (−' + nb(g) + ').';
        else {
          tx = '<b>' + s2[0].san + ' ?</b> (' + genre + ') ne marche pas';
          if (s2[1]) {
            const Pa = jouer(P0, t.pv[0]);
            const rep = Pa ? nettoyer(idees(Pa, t.pv[1], { mat1: t.score.mate === -1, repriseCase: Pa.prise ? Pa.priseCase : null, repriseValeur: Pa.prise ? V[Pa.prise] : 0 }).idees, 1)[0] : null;
            tx += ' : ' + campNom(autre(S)) + ' répondent <b>' + s2[1].san + '</b>' + (rep ? ' — ' + court(rep.texte).split(/\. /)[0] : '');
            if (rep) dessin.push(...recolorer(rep.dessin, C_MENACE)); else { const f = flecheUci(t.pv[1], C_MENACE); if (f) dessin.push(f); }
            const fin = lire(s2[s2.length - 1].fen).b, bp = bilanPieces(P0.b, fin, S);
            if (bp.net < 0) tx += '. Au bout, <b>' + (-bp.net) + ' de matériel perdu</b>';
          }
          tx += '. ' + (g >= 99 ? '' : 'Soit <b>−' + nb(g) + '</b> par rapport à ' + sanBest + '.');
        }
        items.push(li(tx, vueDe(g > 0.6 && s2[1] ? { fen: s2[0].fen, dernier: window.App.dernierCoupCases(t.pv[0]), dessin } : { dessin: [flecheUci(t.pv[0], C_ADV, '?'), fBest].filter(Boolean) })));
      }
      plis.push({ titre: '2. Les coups à regarder d’abord', court: '2. Coups forçants', vue: 0, corps: intro + (items.length ? '<ul class="coach-liste">' + items.join('') + '</ul>' : '') });
    }

    // 3. le plan stratégique : les objectifs à long terme, sans parler des coups exacts
    if (cl) {
      const items = [];
      let budget = 0;
      const moi = strategie(P0, S).filter((x) => x.moi).filter((x, i) => { budget += sansBalises(x.moi).length; return i === 0 || (i < 3 && budget <= 430); });
      const rl = resumeLigne(P0, best.pv, S).map((f) => f.t).slice(0, 4);
      if (moi.length || rl.length) {
        const v1 = vues.length;
        const corps = (moi.length ? '<ul class="coach-liste">' + moi.map((x) => li(x.moi, vueDe({ dessin: x.dessin }))).join('') + '</ul>' : '') +
          (rl.length ? '<p>🧭 <b>' + sanBest + ' suit ce plan</b> : dans la suite calculée, tes coups servent à ' + listeEt(rl) + '.</p>' : '');
        plis.push({ titre: (plis.length + 1) + '. Le plan : tes objectifs à long terme', court: (plis.length + 1) + '. Le plan', vue: moi.length ? v1 : 0, corps });
      }
      const lui = strategie(P0, O).filter((x) => x.lui).slice(0, 3);
      if (lui.length) plis.push({ titre: (plis.length + 1) + '. Le plan de l’adversaire (à surveiller)', court: (plis.length + 1) + '. Adversaire', vue: vues.length,
        corps: '<ul class="coach-liste">' + lui.map((x) => li('🛡 ' + x.lui, vueDe({ dessin: x.dessin.map((d) => Object.assign({}, d, { couleur: C_ROUGE })) }))).join('') + '</ul>' });
    }

    // 4. la ligne : où mène la suite du moteur, et ce qu'elle change
    if (suite.length >= 2) {
      const n0 = +(D.fen.split(/\s+/)[5] || 1);
      let num = n0, blanc = S === 'w', chips = '';
      suite.forEach((x, i) => {
        const pre = blanc ? num + '. ' : (i === 0 ? num + '… ' : '');
        const v = vueDe({ fen: x.fen, dernier: window.App.dernierCoupCases(x.uci), dessin: [flecheUci(x.uci, i % 2 ? C_MENACE : C_COUP)].filter(Boolean) });
        chips += '<span class="coach-chip" data-vue="' + v + '">' + pre + x.san + '</span>';
        if (!blanc) num++;
        blanc = !blanc;
      });
      let corps = '<p>La ligne que le moteur a calculée (' + suite.length + ' demi-coups, clique pour voir) :</p><p>' + chips + '</p>';
      if (cl) {
        const ra2 = repriseAvant(ctx);
        const ch = changements(P0.b, lire(suite[suite.length - 1].fen).b, S, ra2.fenAvant ? lire(ra2.fenAvant).b : null).filter((t) => dire(t)).slice(0, 3);
        corps += '<p class="coach-sous">Ce que ça change au bout de la ligne :</p><ul class="coach-liste">' +
          (ch.length ? ch.map((t) => li(t)).join('') : li('Rien de spectaculaire : pas de gain, mais une position un peu plus agréable (' + phraseScore(best.score, S) + '). Aux échecs, beaucoup de bons coups sont de petites améliorations.')) + '</ul>';
        const ret = [...new Set(notions1)].filter((n) => NOTIONS[n])[0];
        if (ret) corps += '<p>📘 <b>À retenir — ' + NOTIONS[ret][0] + '</b> : ' + NOTIONS[ret][1] + '</p>';
      } else {
        const prises = suite.filter((x) => x.prise).length, echecs = suite.filter((x) => x.echec).length;
        corps += '<p>' + (prises ? prises + ' prise' + (prises > 1 ? 's' : '') : 'Aucune prise') + ' et ' + (echecs ? echecs + ' échec' + (echecs > 1 ? 's' : '') : 'aucun échec') + ' dans cette ligne.</p>';
      }
      plis.push({ titre: (plis.length + 1) + '. La suite calculée après ' + sanBest, court: (plis.length + 1) + '. La suite', vue: vues.length > 1 ? vues.length - suite.length : 0, corps });
    }
    if (!plis.length) return null;
    let h = '<h3 class="coach-titre" data-vue="0">🧠 Réflexion détaillée</h3>';
    // 3 sous-onglets : une seule partie affichée à la fois
    h += '<div class="coach-sous-onglets">' + plis.map((p, i) => '<button class="coach-so' + (i === 0 ? ' actif' : '') + '" data-pli="' + i + '" data-v="' + p.vue + '">' + p.court + '</button>').join('') + '</div>';
    plis.forEach((p, i) => {
      h += '<div class="coach-pli' + (i === 0 ? ' ouvert' : '') + '"><p class="coach-pli-titre">' + p.titre + '</p>' + p.corps + '</div>';
    });
    return { nom: '🧠 Réflexion', html: h, vues };
  }
  // le dernier coup joué était-il une prise ? (pour reconnaître une simple reprise)
  function repriseAvant(ctx) {
    if (!ctx.coups || !ctx.coups.length) return {};
    try {
      const p = new window.Regles.Partie(ctx.variante, ctx.fen0, ctx.coups.slice(0, -1));
      const f = p.fen; p.detruire();
      const P = jouer(lire(f), ctx.coups[ctx.coups.length - 1]);
      return P && P.prise ? { repriseCase: P.priseCase, repriseValeur: V[P.prise], fenAvant: f } : {};
    } catch (e) { return {}; }
  }
  function legauxUn(ctx) { try { const p = new window.Regles.Partie(ctx.variante, ctx.fen0, ctx.coups); const n = p.legaux().length; p.detruire(); return n === 1; } catch (e) { return false; } }

  // touches : ← → pour changer de page, Échap pour fermer
  window.addEventListener('keydown', (e) => {
    if (!etat) return;
    if (e.target && e.target.tagName === 'INPUT') { if (e.key === 'Escape') { fermer(); e.preventDefault(); } return; }
    if (e.key === 'ArrowRight') { bouger(1); e.preventDefault(); e.stopImmediatePropagation(); }
    else if (e.key === 'ArrowLeft') { bouger(-1); e.preventDefault(); e.stopImmediatePropagation(); }
    else if (e.key === 'Escape') { fermer(); e.preventDefault(); e.stopImmediatePropagation(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Home' || e.key === 'End') { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  window.Coach = { ouvrir, fermer, ouvert, _idees: idees, _lire: lire, _nettoyer: nettoyer, _diag: diagnostic, _chg: changements };
})();
