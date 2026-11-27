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
    return { b, t: ch[1] === 'b' ? 'b' : 'w', coup: +ch[5] || 1 };
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
              if (tB === 'k') out.push({ par: s, devant: premier, derriere: q, sorte: 'absolu' });
              else if (tA === 'k' || V[tA] > V[tB]) out.push({ par: s, devant: premier, derriere: q, sorte: 'enfilade' });
              else if (V[tB] > V[tA] && V[tB] > V[typ(p)]) out.push({ par: s, devant: premier, derriere: q, sorte: 'relatif' });
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
    if (P1.prise) {
      const pc = P1.priseCase;
      const defendue = attaquants(b0, pc, O).length > 0;
      const g = P1.priseCase === d ? see(b0, P1.de, d) : V.p;
      if (!defendue) ajouter(50 + V[P1.prise], piece[0].toUpperCase() + piece.slice(1) + ' prend <b>' + UN[P1.prise] + ' qui n’était pas défendu' + (['r', 'q'].includes(P1.prise) ? 'e' : '') + '</b> : une pièce <b>en prise</b>, gagnée gratuitement (+' + V[P1.prise] + ').', 'en-prise',
        [fleche, { de: null, vers: nomCase(pc), couleur: C_MENACE }]);
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
  const nb = (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
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

  // =====================================================================
  //  INTERFACE
  // =====================================================================
  const $ = (s) => document.querySelector(s);
  const cache = {};
  let etat = null; // { ctx, onglets, onglet, k, el, jeton }
  let jeton = 0;

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  // ctx = { variante, fen0, coups (jusqu'à la position), joue (uci joué, facultatif), conteneur, plateau, restaurer(), titre }
  function ouvrir(ctx) {
    fermer();
    const id = ++jeton;
    const box = el('div', 'coach');
    box.innerHTML = '<div class="coach-tete"><b>🎓 Coach</b><span class="coach-sous"></span><button class="bouton coach-fermer" title="Fermer (Échap)">✖</button></div>' +
      '<div class="coach-onglets"></div><div class="coach-corps"><h3 class="coach-titre"></h3><div class="coach-texte"></div></div>' +
      '<div class="coach-nav"><button class="bouton coach-prec">◀ Précédent</button><span class="coach-pos"></span><button class="bouton principal coach-suiv">Suivant ▶</button></div>';
    ctx.conteneur.appendChild(box);
    box.querySelector('.coach-fermer').onclick = () => fermer();
    box.querySelector('.coach-prec').onclick = () => bouger(-1);
    box.querySelector('.coach-suiv').onclick = () => bouger(1);
    etat = { ctx, el: box, id, onglets: null, onglet: 0, k: 0 };
    ctx.plateau.bloquer();
    attente('Le coach regarde la position…');
    preparer(ctx, id).then((onglets) => {
      if (!etat || etat.id !== id) return;
      etat.onglets = onglets; etat.onglet = 0; etat.k = 0;
      dessinerOnglets(); montrer();
    }).catch((e) => {
      console.error(e);
      if (etat && etat.id === id) attente('Le coach n’a pas pu analyser cette position.');
    });
  }
  function attente(t) {
    if (!etat) return;
    etat.el.querySelector('.coach-titre').textContent = '';
    etat.el.querySelector('.coach-texte').innerHTML = '<p class="coach-attente">' + t + '</p>';
    etat.el.querySelector('.coach-nav').style.visibility = 'hidden';
  }
  // sansRestaurer : la position a changé ailleurs, celui qui appelle redessine lui-même
  function fermer(sansRestaurer) {
    if (!etat) return;
    const e = etat;
    etat = null;
    jeton++;
    const m = window.Moteurs.tous().find((x) => x.role === 'coach');
    if (m && m.pret) m.arreter();
    e.el.remove();
    e.ctx.plateau.coachDessin(null);
    if (!sansRestaurer) e.ctx.restaurer();
  }
  const ouvert = () => !!etat;

  function dessinerOnglets() {
    const box = etat.el.querySelector('.coach-onglets');
    box.innerHTML = '';
    etat.onglets.forEach((o, i) => {
      const b = el('button', i === etat.onglet ? 'actif' : '', o.nom);
      b.onclick = () => { etat.onglet = i; etat.k = 0; dessinerOnglets(); montrer(); };
      box.appendChild(b);
    });
  }
  function bouger(d) {
    if (!etat || !etat.onglets) return;
    const o = etat.onglets[etat.onglet];
    let k = etat.k + d;
    if (k < 0) { if (etat.onglet > 0) { etat.onglet--; k = etat.onglets[etat.onglet].etapes.length - 1; dessinerOnglets(); } else k = 0; }
    else if (k >= o.etapes.length) { if (etat.onglet < etat.onglets.length - 1) { etat.onglet++; k = 0; dessinerOnglets(); } else k = o.etapes.length - 1; }
    etat.k = k;
    montrer();
  }
  function montrer() {
    const o = etat.onglets[etat.onglet], e = o.etapes[etat.k];
    const ctx = etat.ctx;
    etat.el.querySelector('.coach-titre').innerHTML = e.titre;
    etat.el.querySelector('.coach-texte').innerHTML = e.texte;
    const nav = etat.el.querySelector('.coach-nav');
    nav.style.visibility = '';
    const total = etat.onglets.reduce((n, x) => n + x.etapes.length, 0);
    let ici = 0; for (let i = 0; i < etat.onglet; i++) ici += etat.onglets[i].etapes.length; ici += etat.k + 1;
    nav.querySelector('.coach-pos').textContent = ici + ' / ' + total;
    nav.querySelector('.coach-prec').disabled = ici === 1;
    nav.querySelector('.coach-suiv').disabled = ici === total;
    // position montrée sur le plateau (la suite avance sur le plateau)
    const fen = e.fen || etat.base;
    ctx.plateau.afficher(window.Regles.lireFen(fen), { variante: ctx.variante, dernier: e.dernier || null });
    ctx.plateau.coachDessin(e.dessin || []);
    // notions : liens cliquables
    etat.el.querySelectorAll('[data-notion]').forEach((x) => { x.onclick = () => { const i = etat.onglets.findIndex((oo) => oo.cle === 'notions'); if (i >= 0) { etat.onglet = i; etat.k = 0; dessinerOnglets(); montrer(); } }; });
  }

  // --------------------------------------------------------------------
  //  Préparation : moteur + idées -> onglets et étapes
  // --------------------------------------------------------------------
  const PROF = { sf: 18, fairy: 14, maison: 5 };
  const PROF_MENACE = { sf: 14, fairy: 11, maison: 4 };
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

  async function chercher(ctx, coups, multipv, prof, texte) {
    const m = window.Moteurs.pourVariante(ctx.variante, 'coach');
    const r = await m.chercher({
      variante: ctx.variante, fen0: ctx.fen0, coups, elo: null, profondeur: prof, temps: 30000, multipv, deterministe: true,
      surInfo: (l) => { if (etat && l[0] && texte) attente(texte + ' (profondeur ' + l[0].profondeur + ' / ' + prof + ')'); }
    });
    return r;
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
    const cle = v.uci + '|' + fen + '|' + (ctx.joue || '');
    if (cache[cle]) return construire(ctx, cache[cle]);

    const r = await chercher(ctx, ctx.coups, Math.min(5, legaux.length), PROF[tm], 'Le coach cherche les meilleurs coups…');
    if (!etat || etat.id !== id) throw new Error('fermé');
    if (r.annulee || !r.lignes.length) throw new Error('rien');
    const lignes = r.lignes.filter((l) => l && l.pv && l.pv.length);
    // la menace : que ferait l'adversaire si c'était encore à lui de jouer ?
    let menace = null;
    if (!enEchecMaintenant && v.moteur !== 'maison') {
      const ch = fen.split(/\s+/);
      ch[1] = S === 'w' ? 'b' : 'w'; if (ch.length > 3) ch[3] = '-';
      try {
        const rm = await window.Moteurs.pourVariante(v, 'coach').chercher({
          variante: v, fen0: ch.join(' '), coups: [], elo: null, profondeur: PROF_MENACE[tm], temps: 15000, multipv: 1, deterministe: true,
          surInfo: () => { if (etat) attente('Le coach regarde ce que prépare l’adversaire…'); }
        });
        if (rm && !rm.annulee && rm.lignes[0] && rm.lignes[0].pv && rm.lignes[0].pv.length) menace = { score: rm.lignes[0].score, pv: rm.lignes[0].pv.slice(0, 6) };
      } catch (e) { menace = null; }
      if (!etat || etat.id !== id) throw new Error('fermé');
    }
    // le coup joué (bilan) s'il n'est pas dans la liste
    let joue = null;
    if (ctx.joue) {
      const l = lignes.find((x) => x.pv[0] === ctx.joue);
      if (l) joue = { score: l.score, pv: l.pv };
      else {
        const rj = await chercher(ctx, ctx.coups.concat([ctx.joue]), 1, Math.max(4, PROF[tm] - 2), 'Le coach regarde le coup joué…');
        if (!etat || etat.id !== id) throw new Error('fermé');
        if (rj.lignes[0]) joue = { score: window.App.inverser(rj.lignes[0].score), pv: [ctx.joue].concat(rj.lignes[0].pv || []) };
        else joue = { score: { cp: 0 }, pv: [ctx.joue] };
      }
    }
    const donnees = { fen, S, lignes: lignes.map((l) => ({ score: l.score, pv: l.pv.slice(0, 10) })), menace, joue, enEchec: enEchecMaintenant };
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

  function construire(ctx, D) {
    const cl = classique(ctx.variante, D.fen);
    const S = D.S, O = autre(S);
    const P0 = cl ? lire(D.fen) : null;
    const best = D.lignes[0];
    const suite = fensSuite(ctx, best.pv.slice(0, 8));
    const sanBest = suite[0] ? suite[0].san : best.pv[0];
    const notions = new Set(['evaluation']);
    const lienN = (k) => (NOTIONS[k] ? ' <span class="coach-notion" data-notion="' + k + '">📚 ' + NOTIONS[k][0] + '</span>' : '');
    const onglets = [];

    // ---------- 1. Le coup ----------
    const e1 = [];
    const mat = best.score.mate != null && best.score.mate > 0;
    let ideesBest = [];
    if (cl) {
      const r = idees(P0, best.pv[0], { mat1: best.score.mate === 1 });
      ideesBest = r.idees;
    }
    const alt = D.lignes[1];
    const gap = alt ? ecart(best.score, alt.score) : 99;
    let intro = Maj(aux(S)) + ' de jouer. Le meilleur coup est <b class="coach-coup">' + sanBest + '</b>. Évaluation : ' + phraseScore(best.score, S) + '.';
    if (mat) intro += ' Il y a un <b>mat forcé</b> : chaque coup compte !';
    if (!alt) intro += '<br>C’est le <b>seul coup possible</b>.';
    else if (gap >= 1.5) intro += '<br>C’est <b>le seul bon coup</b> : tous les autres perdent au moins ' + (gap >= 99 ? 'le mat' : nb(gap) + ' pion' + (gap >= 2 ? 's' : '')) + '.';
    else if (gap >= 0.5) intro += '<br>Il est nettement meilleur que les autres (le 2e coup perd ' + nb(gap) + ').';
    else intro += '<br>D’autres coups sont presque aussi bons (écart ' + nb(Math.max(0, gap)) + ') : ici, c’est surtout l’idée qui compte.';
    if (ctx.joue) {
      const jSan = (fensSuite(ctx, [ctx.joue])[0] || {}).san || ctx.joue;
      if (ctx.joue === best.pv[0]) intro += '<br>✅ <b>' + jSan + '</b> a été joué : c’était bien le meilleur !';
      else intro += '<br>Dans la partie, <b>' + jSan + '</b> a été joué : on verra plus loin pourquoi c’est moins bon.';
    }
    const fBest = flecheUci(best.pv[0], C_COUP);
    e1.push({ titre: '★ Le meilleur coup : ' + sanBest, texte: '<p>' + intro + '</p>' + (ideesBest[0] ? '<p>L’idée principale : ' + ideesBest[0].texte + lienN(ideesBest[0].notion) + '</p>' : ''),
      dessin: ideesBest[0] ? ideesBest[0].dessin : (fBest ? [fBest] : []) });
    if (ideesBest[0]) notions.add(ideesBest[0].notion);
    for (const id of ideesBest.slice(1, 4)) {
      notions.add(id.notion);
      e1.push({ titre: 'Ce que fait aussi ' + sanBest, texte: '<p>' + id.texte + lienN(id.notion) + '</p>', dessin: id.dessin });
    }
    if (cl && !ideesBest.length) {
      e1.push({ titre: 'Un coup calme', texte: '<p>' + sanBest + ' ne prend rien et ne menace rien tout de suite. C’est un <b>coup d’amélioration</b> : il prépare la suite et ne laisse rien à l’adversaire. Regarde l’onglet « La suite » pour voir l’idée.' + lienN('prophylaxie') + '</p>', dessin: fBest ? [fBest] : [] });
      notions.add('prophylaxie');
    }
    if (!cl) {
      const s0 = suite[0];
      const bouts = [];
      if (s0 && s0.prise) bouts.push('il <b>prend une pièce</b>');
      if (s0 && s0.echec) bouts.push('il <b>donne échec</b>');
      e1.push({ titre: 'Ce que fait ' + sanBest, texte: '<p>' + (bouts.length ? 'Ce coup est fort parce qu’' + bouts.join(' et ') + '. ' : '') +
        'Avec des personnages créés, le coach ne connaît pas tous leurs déplacements par cœur : il s’appuie sur le calcul du moteur. La suite, coup par coup, montre l’idée.</p>', dessin: fBest ? [fBest] : [] });
    }
    onglets.push({ cle: 'coup', nom: '★ Le coup', etapes: e1 });

    // ---------- 2. La menace adverse ----------
    if (D.menace && D.menace.pv[0]) {
      const sm = D.menace.score; // vu de O
      const forte = (sm.mate != null && sm.mate > 0) || (best.score.mate == null && sm.mate == null && (sm.cp + best.score.cp) >= 150);
      if (forte) {
        const pM = new window.Regles.Partie(ctx.variante, D.fen.split(/\s+/).map((x, i) => (i === 1 ? O : i === 3 ? '-' : x)).join(' '), []);
        let sanM = D.menace.pv[0];
        try { sanM = pM.suiteSan(0, D.menace.pv, 1)[0] || sanM; } catch (e) { /* rien */ }
        pM.detruire();
        let quoi = '';
        const dessin = [flecheUci(D.menace.pv[0], C_MENACE)].filter(Boolean);
        if (sm.mate != null && sm.mate > 0) quoi = campNom(O) + ' feraient <b>mat en ' + sm.mate + '</b> en commençant par <b>' + sanM + '</b>';
        else if (cl) {
          const Pn = Object.assign({}, P0, { t: O });
          const r = idees(Pn, D.menace.pv[0]);
          quoi = campNom(O) + ' joueraient <b>' + sanM + '</b>' + (r.idees[0] ? ' : ' + r.idees[0].texte.replace(/^./, (c) => c.toLowerCase()).replace(/\.$/, '') : '');
          if (r.idees[0]) { notions.add(r.idees[0].notion); for (const x of r.idees[0].dessin) if (x && x.couleur !== C_COUP) dessin.push(x); }
        } else quoi = campNom(O) + ' joueraient <b>' + sanM + '</b>, qui leur ferait gagner environ ' + nb((sm.cp + best.score.cp) / 100) + ' pion(s)';
        let pare = '';
        if (best.pv[1] === D.menace.pv[0]) {
          pare = 'Ici, on ne peut pas tout parer : même après ' + sanBest + ', ' + campNom(O) + ' jouent ' + sanM + '. ' + sanBest + ' est le coup qui <b>limite le plus les dégâts</b> : tous les autres perdent davantage.';
        } else if (cl) {
          const P1 = jouer(P0, best.pv[0]);
          const u = D.menace.pv[0];
          const de = lireCase(u.slice(0, 2)), vers = lireCase(u.slice(2, 4));
          if (P1 && (!P1.b[de] || coul(P1.b[de]) !== O)) pare = sanBest + ' <b>élimine la pièce</b> qui menaçait.';
          else if (P1 && P0.b[vers] && !P1.b[vers]) pare = sanBest + ' <b>met la pièce visée à l’abri</b>.';
          else if (P1 && P1.b[vers] && coul(P1.b[vers]) === S && see(P1.b, de, vers) <= 0) pare = sanBest + ' <b>défend la case</b> : la prise ne gagne plus rien.';
          else if (best.score.mate != null && best.score.mate > 0) pare = sanBest + ' va plus vite : son attaque arrive avant la menace.';
          else pare = sanBest + ' s’en occupe : avec lui, la menace ne marche plus (le moteur l’a vérifié).';
        } else pare = sanBest + ' s’en occupe : avec lui, la menace ne marche plus.';
        notions.add('menace');
        onglets.push({ cle: 'menace', nom: '⚠ La menace', etapes: [{ titre: '⚠ Que veulent faire ' + campNom(O) + ' ?', texte: '<p>Avant de jouer, demande-toi toujours ce que veut l’adversaire. Si ' + campNom(S) + ' ne faisaient rien, ' + quoi + '.</p><p>' + pare + lienN('menace') + '</p>', dessin }] });
      }
    }

    // ---------- 3. La suite ----------
    const e3 = [];
    let Pc = P0;
    suite.slice(0, 6).forEach((s, i) => {
      const qui = i % 2 === 0 ? S : O;
      let com = '';
      if (cl && Pc) {
        const r = idees(Pc, s.uci, { mat1: best.score.mate != null && best.score.mate > 0 && i === best.score.mate * 2 - 2 });
        if (r.idees[0]) { com = r.idees[0].texte; notions.add(r.idees[0].notion); }
        Pc = r.P1;
      }
      if (!com) com = s.echec ? 'Échec !' : s.prise ? 'Une prise.' : (i === 0 ? 'Le meilleur coup.' : qui === O ? 'La meilleure défense ' + des(O) + '.' : 'Le coup le plus fort pour continuer.');
      if (i === 1) com = '<i>Meilleure réponse ' + des(O) + ' :</i> ' + com;
      const avant = i === 0 ? D.fen : suite[i - 1].fen;
      e3.push({ titre: 'La suite · ' + (i + 1) + '. ' + (qui === 'w' ? '○' : '●') + ' ' + s.san,
        texte: '<p>' + com + '</p><p class="coach-ligne">' + suite.slice(0, 6).map((x, j) => (j === i ? '<b>' + x.san + '</b>' : x.san)).join(' ') + '</p>',
        fen: avant, dessin: [flecheUci(s.uci, qui === S ? C_COUP : C_ADV, String(i + 1))].filter(Boolean) });
    });
    if (suite.length) {
      const fin = suite[Math.min(5, suite.length - 1)];
      let bilan = 'Évaluation au bout de la suite : ' + phraseScore(best.score, S) + '.';
      if (cl) {
        const Pf = lire(fin.fen);
        const bp = bilanPieces(P0.b, Pf.b, S);
        if (bp.net > 0) bilan = 'Au bout de cette suite, ' + campNom(S) + ' ont <b>gagné du matériel</b> (+' + bp.net + ')' + (bp.perdO.length ? ' : ' + campNom(O) + ' ont perdu ' + bp.perdO.join(', ') + (bp.perdS.length ? ', contre ' + bp.perdS.join(', ') : '') : '') + '. ' + bilan;
        else if (bp.net < 0) bilan = CampNom(S) + ' ont perdu du matériel (−' + (-bp.net) + ')' + (bp.perdS.length ? ' : ' + bp.perdS.join(', ') : '') + ', mais ' + (best.score.mate != null && best.score.mate > 0 ? 'c’est pour faire mat' : 'le moteur voit que c’est le mieux possible : les autres coups perdent plus, ou leur jeu compense (pièces actives, attaque)') + '. ' + bilan;
        notions.add('valeur');
      }
      e3.push({ titre: 'Le résultat', texte: '<p>' + bilan + '</p><p class="coach-ligne">' + suite.slice(0, 6).map((x) => x.san).join(' ') + '</p>', fen: fin.fen, dernier: window.App.dernierCoupCases(fin.uci) });
    }
    if (e3.length) onglets.push({ cle: 'suite', nom: '▶ La suite', etapes: e3 });

    // ---------- 4. Pourquoi pas les autres ? ----------
    const e4 = [];
    const autres = [];
    if (D.joue && ctx.joue !== best.pv[0]) autres.push({ l: D.joue, joue: true });
    for (const l of D.lignes.slice(1)) if (autres.length < 3 && l.pv[0] !== ctx.joue) autres.push({ l });
    for (const { l, joue } of autres) {
      const s2 = fensSuite(ctx, l.pv.slice(0, 6));
      if (!s2.length) continue;
      const g = ecart(best.score, l.score);
      let t = '';
      if (g <= 0.15) t = '<b>' + s2[0].san + '</b> est <b>aussi bon</b> (' + phraseScore(l.score, S) + ') : les deux coups se valent.';
      else if (g < 0.5) t = '<b>' + s2[0].san + '</b> est un peu moins précis (−' + nb(g) + ').';
      else t = '<b>' + s2[0].san + '</b> est moins bon : ' + phraseScore(l.score, S) + ' au lieu de ' + phraseScore(best.score, S) + (g >= 99 ? '.' : '. Il perd <b>' + nb(g) + '</b> pion' + (g >= 2 ? 's' : '') + ' d’évaluation.');
      const dessin = [flecheUci(l.pv[0], joue ? 'rgba(236,75,75,0.9)' : C_ADV, joue ? '✗' : '?')].filter(Boolean);
      if (g >= 0.4 && s2[1]) {
        let pourquoi = '';
        if (cl) {
          const Pa = jouer(P0, l.pv[0]);
          if (Pa) {
            const rep = idees(Pa, l.pv[1], { mat1: l.score.mate === -1 });
            pourquoi = 'Meilleure réponse : <b>' + s2[1].san + '</b>' + (rep.idees[0] ? ' — ' + rep.idees[0].texte : '.');
            if (rep.idees[0]) { notions.add(rep.idees[0].notion); for (const x of rep.idees[0].dessin) if (x) dessin.push(Object.assign({}, x, x.couleur === C_COUP ? { couleur: C_MENACE } : {})); }
            else { const f = flecheUci(l.pv[1], C_MENACE); if (f) dessin.push(f); }
            // ce qu'il manque par rapport au meilleur coup
            if (ideesBest[0] && ideesBest[0].poids >= 30) pourquoi += '<br>Et surtout, on rate l’idée de ' + sanBest + ' : ' + ideesBest[0].texte.replace(/<[^>]+>/g, '').replace(/^./, (c) => c.toLowerCase());
            const fin = s2[s2.length - 1];
            const bp = bilanPieces(P0.b, lire(fin.fen).b, S);
            const bb = bilanPieces(P0.b, lire((suite[Math.min(5, suite.length - 1)] || { fen: D.fen }).fen).b, S);
            const sg = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x);
            if (bp.net < bb.net) pourquoi += '<br>Matériel au bout de la suite : <b>' + sg(bp.net) + '</b> au lieu de ' + sg(bb.net) + ' avec ' + sanBest + '.';
          }
        } else {
          pourquoi = 'Réponse : <b>' + s2[1].san + '</b>' + (s2[1].prise ? ', qui prend une pièce' : '') + (s2[1].echec ? ', avec échec' : '') + '.';
          const f = flecheUci(l.pv[1], C_MENACE); if (f) dessin.push(f);
        }
        t += '<br>' + pourquoi;
        t += '<p class="coach-ligne">Suite : ' + s2.map((x) => x.san).join(' ') + '</p>';
      }
      // sur le plateau : la position APRÈS ce coup, et la réponse qui le punit
      const apres = g >= 0.4 && s2[1];
      e4.push({ titre: (joue ? '✗ Le coup joué : ' : '? Et ') + s2[0].san + (joue ? '' : ' ?'), texte: '<p>' + t + '</p>' + (apres ? '<p class="coach-ligne">Plateau : la position après ' + s2[0].san + ', et la réponse ' + des(O) + ' en rouge.</p>' : ''),
        fen: apres ? s2[0].fen : null, dernier: apres ? window.App.dernierCoupCases(l.pv[0]) : null,
        dessin: apres ? dessin.slice(1) : dessin.concat(fBest ? [Object.assign({}, fBest, { etiquette: '★' })] : []) });
    }
    if (e4.length) onglets.push({ cle: 'autres', nom: '? Les autres', etapes: e4 });

    // ---------- 5. Notions ----------
    const liste = [...notions].filter((k) => NOTIONS[k]);
    const e5 = [];
    for (let i = 0; i < liste.length; i += 3) {
      e5.push({ titre: '📚 À retenir', texte: liste.slice(i, i + 3).map((k) => '<p><b>' + NOTIONS[k][0] + '</b> : ' + NOTIONS[k][1] + '</p>').join(''), dessin: fBest ? [fBest] : [] });
    }
    if (e5.length) onglets.push({ cle: 'notions', nom: '📚 Notions', etapes: e5 });
    return onglets;
  }

  // touches : ← → pour avancer, Échap pour fermer
  window.addEventListener('keydown', (e) => {
    if (!etat) return;
    if (e.key === 'ArrowRight') { bouger(1); e.preventDefault(); e.stopImmediatePropagation(); }
    else if (e.key === 'ArrowLeft') { bouger(-1); e.preventDefault(); e.stopImmediatePropagation(); }
    else if (e.key === 'Escape') { fermer(); e.preventDefault(); e.stopImmediatePropagation(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Home' || e.key === 'End') { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  window.Coach = { ouvrir, fermer, ouvert, _idees: idees, _lire: lire };
})();
