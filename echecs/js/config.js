/* Configuration d'une partie : plateau (taille, trous), personnages placés (ou tirés au hasard),
   zones de placement aléatoire, règles, et fourchette d'avantage voulue quand il y a du hasard.
   Une configuration est traduite en définition Fairy-Stockfish : les règles et les bots la comprennent. */
(function () {
  'use strict';

  const CLE_LISTE = 'echecs.configs';
  const CLE_COURANTE = 'echecs.config';
  const FICH = 'abcdefghijkl';
  const LETTRES_LIBRES = 'acdefghijlmostuvwxyz';

  function grille(l, c, v) { return Array.from({ length: l }, () => Array.from({ length: c }, () => v)); }
  function copie(o) { return JSON.parse(JSON.stringify(o)); }

  function reglesDefaut() {
    return { but: 'mat', nbEchecs: 3, pat: 'draw', renfort: false, obligatoire: false, roque: true, double: true, passant: true, promos: ['dame', 'tour', 'fou', 'cavalier'] };
  }

  function classique() {
    const cfg = {
      id: 'classique', nom: 'Partie normale', avMin: -0.5, avMax: 0.5,
      cols: 8, lignes: 8, pieces: grille(8, 8, null), trous: grille(8, 8, false), zones: grille(8, 8, false),
      trousHasard: 0, miroir: true, regles: reglesDefaut()
    };
    const rangee = ['tour', 'cavalier', 'fou', 'dame', 'roi', 'fou', 'cavalier', 'tour'];
    for (let c = 0; c < 8; c++) {
      cfg.pieces[0][c] = { camp: 'w', perso: rangee[c] };
      cfg.pieces[1][c] = { camp: 'w', perso: 'pion' };
      cfg.pieces[6][c] = { camp: 'b', perso: 'pion' };
      cfg.pieces[7][c] = { camp: 'b', perso: rangee[c] };
    }
    return cfg;
  }

  // Configuration neuve : plateau vide (on y pose ce qu'on veut).
  function vide(cols, lignes) {
    cols = cols || 8; lignes = lignes || 8;
    return {
      id: '', nom: '', avMin: -0.5, avMax: 0.5,
      cols, lignes, pieces: grille(lignes, cols, null), trous: grille(lignes, cols, false), zones: grille(lignes, cols, false),
      trousHasard: 0, miroir: false, regles: reglesDefaut(), auHasard: {}
    };
  }

  // Version simple d'une configuration : seulement les pièces posées (ou aléatoires) et les trous.
  // Règles normales, pas de zones de départ ni de trous tirés au hasard.
  function simple(cfg) {
    const c = copie(cfg);
    c.regles = reglesDefaut();
    c.zones = grille(c.lignes, c.cols, false);
    c.trousHasard = 0;
    c.miroir = false;
    c.auHasard = c.auHasard || {};
    // où vont les pièces au hasard : « miroir » (dans sa moitié, les noirs pareil en face) ou « zones » (peintes)
    if (c.hasardOu !== 'zones') c.hasardOu = 'miroir';
    if (!c.zonesH || c.zonesH.length !== c.lignes) c.zonesH = grille(c.lignes, c.cols, false);
    const roiH = Object.keys(c.auHasard).find((id) => c.auHasard[id] > 0 && estRoi(id));
    if (roiH) garderUnRoi(c, roiH);
    if (c.avMin == null) c.avMin = -0.5;
    if (c.avMax == null) c.avMax = 0.5;
    return c;
  }

  // ---------- hasard ----------
  // Un personnage dessiné en roi EST un roi (pièce royale : échec, mat), quels que soient ses déplacements.
  function estRoi(id) {
    if (id === 'roi') return true;
    const p = window.Persos && window.Persos.trouver(id);
    return !!(p && p.base === 'k');
  }

  // Le roi « id » est mis au hasard : on enlève les rois posés à la main et les autres rois au hasard.
  // Renvoie vrai si quelque chose a été enlevé.
  function garderUnRoi(cfg, id) {
    let enleve = false;
    for (const x of Object.keys(cfg.auHasard || {})) if (x !== id && estRoi(x)) { delete cfg.auHasard[x]; enleve = true; }
    if (cfg.auHasard[id] > 1) cfg.auHasard[id] = 1;
    for (const l of cfg.pieces) for (let c = 0; c < l.length; c++) if (l[c] && l[c].perso && estRoi(l[c].perso)) { l[c] = null; enleve = true; }
    return enleve;
  }

  // Pièces posées au hasard : { idPerso: nombre }, les mêmes pour les blancs et pour les noirs.
  function lotHasard(cfg) {
    const l = [];
    for (const id in cfg.auHasard || {}) for (let i = 0; i < (cfg.auHasard[id] || 0); i++) l.push(id);
    return l;
  }
  function aleatoire(cfg) {
    if (cfg.trousHasard > 0) return true;
    if (lotHasard(cfg).length) return true;
    for (let r = 0; r < cfg.lignes; r++) for (let c = 0; c < cfg.cols; c++) {
      const p = cfg.pieces[r][c];
      if (p && p.hasard != null) return true;
      if (zoneDe(cfg, r, c)) return true;
    }
    return false;
  }

  function zoneDe(cfg, r, c) {
    const v = cfg.zones[r] && cfg.zones[r][c];
    if (v === true) return r < cfg.lignes / 2 ? 'w' : 'b';
    return v === 'w' || v === 'b' ? v : null;
  }

  function melanger(t) {
    for (let i = t.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; }
    return t;
  }
  function auHasard(l) { return l.length ? l[Math.floor(Math.random() * l.length)] : null; }

  // Tire une position concrète : { pieces[r][c] = {camp, perso} | null, trous[r][c] }
  function tirage(cfg) {
    const L = cfg.lignes, C = cfg.cols;
    const pieces = copie(cfg.pieces);
    const trous = copie(cfg.trous);
    const miroir = (r) => L - 1 - r;
    const moitie = Math.floor(L / 2);
    // 1. personnages au hasard
    const tirer = (cat) => { const p = auHasard(window.Persos.pool(cat || '')); return p ? p.id : null; };
    for (let r = 0; r < L; r++) for (let c = 0; c < C; c++) {
      const p = pieces[r][c];
      if (!p || p.hasard == null || p.camp !== 'w') continue;
      const id = tirer(p.hasard);
      pieces[r][c] = id ? { camp: 'w', perso: id } : null;
      const m = pieces[miroir(r)][c];
      if (cfg.miroir && m && m.camp === 'b' && m.hasard != null) pieces[miroir(r)][c] = id ? { camp: 'b', perso: id } : null;
    }
    for (let r = 0; r < L; r++) for (let c = 0; c < C; c++) {
      const p = pieces[r][c];
      if (p && p.hasard != null) { const id = tirer(p.hasard); pieces[r][c] = id ? { camp: p.camp, perso: id } : null; }
    }
    // 1 bis. pièces au hasard : les blancs sont posés au hasard dans leur moitié (un pion jamais sur la première
    //        ni la dernière rangée), puis les noirs reçoivent exactement la même disposition, en miroir.
    const lot = lotHasard(cfg).sort((a, b) => (b === 'pion') - (a === 'pion'));
    const parZones = cfg.hasardOu === 'zones';
    if (lot.length && parZones) {
      // chaque couleur au hasard dans les cases peintes pour elle
      for (const camp of ['w', 'b']) {
        const libres = [];
        for (let r = 0; r < L; r++) for (let c = 0; c < C; c++) if (cfg.zonesH && cfg.zonesH[r] && cfg.zonesH[r][c] === camp && !pieces[r][c] && !trous[r][c]) libres.push([r, c]);
        melanger(libres);
        for (const id of lot) {
          const i = libres.findIndex(([r]) => id !== 'pion' || (r !== 0 && r !== L - 1));
          if (i < 0) continue;
          const [r, c] = libres.splice(i, 1)[0];
          pieces[r][c] = { camp, perso: id };
        }
      }
    } else if (lot.length) {
      const pionOk = (r) => r !== 0 && r !== L - 1;
      const libresDe = (camp) => {
        const l = [];
        for (let r = 0; r < L; r++) for (let c = 0; c < C; c++) {
          const moi = camp === 'w' ? r < moitie : r >= L - moitie;
          if (moi && !pieces[r][c] && !trous[r][c]) l.push([r, c]);
        }
        return melanger(l);
      };
      const libresW = libresDe('w');
      const poses = [];
      for (const id of lot) {
        // de préférence une case dont le miroir est libre aussi (pour que les noirs aient la même place)
        const ok = ([r, c]) => (id !== 'pion' || pionOk(r));
        let i = libresW.findIndex(([r, c]) => ok([r, c]) && !pieces[miroir(r)][c] && !trous[miroir(r)][c]);
        if (i < 0) i = libresW.findIndex(ok);
        if (i < 0) continue;
        const [r, c] = libresW.splice(i, 1)[0];
        pieces[r][c] = { camp: 'w', perso: id };
        poses.push([r, c, id]);
      }
      const restes = [];
      for (const [r, c, id] of poses) {
        const rm = miroir(r);
        if (!pieces[rm][c] && !trous[rm][c]) pieces[rm][c] = { camp: 'b', perso: id };
        else restes.push(id);
      }
      // si une case miroir était prise (pièce posée à la main, trou), on prend une autre case libre
      const libresB = libresDe('b');
      for (const id of restes) {
        const i = libresB.findIndex(([r]) => id !== 'pion' || pionOk(r));
        if (i < 0) continue;
        const [r, c] = libresB.splice(i, 1)[0];
        pieces[r][c] = { camp: 'b', perso: id };
      }
    }
    // 2. zones de départ : les pièces d'une couleur posées dans sa zone apparaissent au hasard
    //    sur n'importe quelle case libre de cette zone (un pion jamais sur la rangée de promotion).
    const Z = { w: [], b: [] };
    for (let r = 0; r < L; r++) for (let c = 0; c < C; c++) {
      const z = zoneDe(cfg, r, c);
      if (z && !trous[r][c]) Z[z].push([r, c]);
    }
    const lotDe = (cases, camp) => cases.map(([r, c]) => pieces[r][c]).filter((p) => p && p.camp === camp).map((p) => p.perso).sort().join('|');
    const memeLot = lotDe(Z.w, 'w') === lotDe(Z.b, 'b');
    const brasser = (cases, camp) => {
      const lot = [];
      for (const [r, c] of cases) { const p = pieces[r][c]; if (p && p.camp === camp) { lot.push(p); pieces[r][c] = null; } }
      const libres = melanger(cases.filter(([r, c]) => !pieces[r][c]));
      const promo = camp === 'w' ? L - 1 : 0;
      const pris = new Set();
      const poser = (p, ok) => {
        const i = libres.findIndex(([r, c], k) => !pris.has(k) && ok(r));
        if (i < 0) return;
        pris.add(i);
        pieces[libres[i][0]][libres[i][1]] = p;
      };
      for (const p of lot.filter((x) => x.perso === 'pion')) poser(p, (r) => r !== promo);
      for (const p of lot.filter((x) => x.perso !== 'pion')) poser(p, () => true);
    };
    brasser(Z.w, 'w');
    const enFace = cfg.miroir && memeLot && Z.w.length === Z.b.length &&
      Z.w.every(([r, c]) => zoneDe(cfg, miroir(r), c) === 'b');
    if (enFace) {
      // même tirage, en face
      for (const [r, c] of Z.w) {
        const q = pieces[miroir(r)][c];
        if (q && q.camp === 'w') continue;
        const p = pieces[r][c];
        pieces[miroir(r)][c] = p && p.camp === 'w' ? { camp: 'b', perso: p.perso } : null;
      }
    } else {
      brasser(Z.b, 'b');
    }
    // 3. trous au hasard (sur des cases vides)
    let n = cfg.trousHasard || 0;
    if (n > 0) {
      const vides = [];
      for (let r = 0; r < L; r++) for (let c = 0; c < C; c++) {
        if (pieces[r][c] || trous[r][c]) continue;
        if (cfg.miroir && r > miroir(r)) continue;
        if (cfg.miroir && pieces[miroir(r)][c]) continue;
        vides.push([r, c]);
      }
      melanger(vides);
      for (const [r, c] of vides) {
        if (n <= 0) break;
        trous[r][c] = true; n--;
        if (cfg.miroir && miroir(r) !== r) { trous[miroir(r)][c] = true; n--; }
      }
    }
    return { pieces, trous };
  }

  // ---------- traduction en variante ----------
  function empreinte(t) {
    let h = 5381;
    for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  function casesCentre(cfg) {
    const cs = cfg.cols % 2 ? [(cfg.cols - 1) / 2] : [cfg.cols / 2 - 1, cfg.cols / 2];
    const rs = cfg.lignes % 2 ? [(cfg.lignes - 1) / 2] : [cfg.lignes / 2 - 1, cfg.lignes / 2];
    const out = [];
    for (const r of rs) for (const c of cs) out.push(FICH[c] + (r + 1));
    return out;
  }

  // Construit la variante jouable à partir d'une position tirée.
  function construire(cfg, t) {
    const R = cfg.regles;
    const ids = new Set();
    for (const l of t.pieces) for (const p of l) if (p) ids.add(p.perso);
    const aPion = ids.has('pion');
    if (aPion) for (const id of R.promos) ids.add(id);
    // lettres
    const lettres = {}; // id -> lettre
    const customs = [];
    let libre = 0;
    // le roi de la partie : la lettre « k », avec ses propres déplacements s'il a été créé
    let roiCree = null;
    for (const id of ids) {
      if (!estRoi(id) || id === 'roi') continue;
      roiCree = window.Persos.trouver(id);
      lettres[id] = 'k';
    }
    for (const id of ids) {
      const p = window.Persos.trouver(id);
      if (!p || lettres[id]) continue;
      if (p.classique) lettres[id] = p.lettre;
      else { lettres[id] = LETTRES_LIBRES[libre++] || '?'; customs.push(p); }
    }
    // FEN
    const rangs = [];
    for (let r = cfg.lignes - 1; r >= 0; r--) {
      let s = '', vide = 0;
      for (let c = 0; c < cfg.cols; c++) {
        if (t.trous[r][c]) { if (vide) { s += vide; vide = 0; } s += '*'; continue; }
        const p = t.pieces[r][c];
        if (!p || !lettres[p.perso]) { vide++; continue; }
        if (vide) { s += vide; vide = 0; }
        const l = lettres[p.perso];
        s += p.camp === 'w' ? l.toUpperCase() : l;
      }
      if (vide) s += vide;
      rangs.push(s);
    }
    let plac = rangs.join('/');
    if (R.renfort) plac += '[]';
    let roque = '';
    if (R.roque && R.but !== 'prise') {
      const test = (rang, camp, kc, qc) => {
        const l = t.pieces[rang];
        const k = l.findIndex((p) => p && p.camp === camp && estRoi(p.perso));
        if (k < 0) return '';
        let o = '';
        const d = l[cfg.cols - 1], g = l[0];
        if (d && d.camp === camp && d.perso === 'tour' && k < cfg.cols - 1) o += kc;
        if (g && g.camp === camp && g.perso === 'tour' && k > 0) o += qc;
        return o;
      };
      roque = test(0, 'w', 'K', 'Q') + test(cfg.lignes - 1, 'b', 'k', 'q');
    }
    const champs = [plac, 'w', roque || '-', '-'];
    if (R.but === 'echecs') champs.push(R.nbEchecs + '+' + R.nbEchecs);
    champs.push('0', '1');
    const fen = champs.join(' ');

    // Apparences
    const pieces = {};
    for (const id in lettres) {
      const p = window.Persos.trouver(id);
      if (p) pieces[lettres[id]] = window.Persos.apparence(p);
    }

    // Classique pur ? -> Stockfish 19
    const STD = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const rd = reglesDefaut();
    const reglesStd = R.but === 'mat' && R.pat === 'draw' && !R.renfort && !R.obligatoire && R.roque && R.double && R.passant &&
      R.promos.length === 4 && rd.promos.every((x) => R.promos.includes(x));
    if (fen === STD && reglesStd && !roiCree) {
      return { uci: 'chess', ini: '', moteur: 'sf', fen0: fen, nom: cfg.nom, pieces, but: '', regles: texteRegles(cfg), cfgId: cfg.id };
    }

    const l = [];
    l.push('maxFile = ' + FICH[cfg.cols - 1]);
    l.push('maxRank = ' + cfg.lignes);
    customs.forEach((p, i) => l.push('customPiece' + (i + 1) + ' = ' + lettres[p.id] + ':' + window.Persos.betza(p)));
    if (roiCree) l.push('king = k:' + window.Persos.betza(roiCree));
    if (R.but === 'prise') {
      l.push('king = -'); l.push('commoner = k'); l.push('extinctionValue = loss'); l.push('extinctionPieceTypes = k');
    }
    l.push('startFen = ' + fen);
    l.push('promotionRank = ' + cfg.lignes);
    const promos = R.promos.filter((id) => !estRoi(id)).map((id) => lettres[id]).filter((x) => x && x !== 'k' && x !== 'p');
    l.push('promotionPieceTypes = ' + (promos.length ? promos.join('') : '-'));
    if (!R.double) l.push('doubleStep = false');
    if (!R.passant) l.push('enPassantRegion = -');
    if (!R.roque || R.but === 'prise') l.push('castling = false');
    else if (cfg.cols !== 8) { l.push('castlingKingsideFile = ' + FICH[cfg.cols - 2]); l.push('castlingQueensideFile = c'); }
    if (R.obligatoire) l.push('mustCapture = true');
    if (R.renfort) { l.push('pieceDrops = true'); l.push('capturesToHand = true'); }
    if (R.pat !== 'draw') l.push('stalemateValue = ' + R.pat);
    if (R.but === 'echecs') l.push('checkCounting = true');
    if (R.but === 'centre') {
      const cs = casesCentre(cfg).join(' ');
      l.push('flagPiece = k'); l.push('flagRegionWhite = ' + cs); l.push('flagRegionBlack = ' + cs);
    }
    const corps = l.join('\n') + '\n';
    const uci = 'cfg' + empreinte(corps);
    const buts = { prise: 'Roi pris', centre: 'Roi arrivé au centre', echecs: 'Échecs donnés' };
    return {
      uci, ini: '[' + uci + ':chess]\n' + corps, moteur: 'fairy', fen0: fen, nom: cfg.nom, pieces,
      but: buts[R.but] || '', regles: texteRegles(cfg), cfgId: cfg.id
    };
  }

  function texteRegles(cfg) {
    const R = cfg.regles;
    const t = ['Plateau de ' + cfg.cols + ' × ' + cfg.lignes + '.'];
    if (R.but === 'prise') t.push('On gagne en prenant le roi adverse (on peut laisser son roi en prise).');
    else if (R.but === 'centre') t.push('On gagne par mat ou en amenant son roi au centre (' + casesCentre(cfg).join(', ') + ').');
    else if (R.but === 'echecs') t.push('On gagne par mat ou en donnant ' + R.nbEchecs + ' échec' + (R.nbEchecs > 1 ? 's' : '') + '.');
    else t.push('On gagne par mat.');
    if (R.pat === 'win') t.push('Pat = victoire pour le joueur bloqué.');
    if (R.pat === 'loss') t.push('Pat = défaite pour le joueur bloqué.');
    if (R.renfort) t.push('Les pièces prises vont dans la réserve et peuvent être posées.');
    if (R.obligatoire) t.push('Prendre est obligatoire.');
    if (!R.roque) t.push('Pas de roque.');
    if (!R.double) t.push('Les pions n’avancent que d’une case.');
    if (!R.passant) t.push('Pas de prise en passant.');
    if (cfg.zones.some((l, r) => l.some((x, c) => zoneDe(cfg, r, c)))) t.push('Les pièces posées dans les zones de départ apparaissent à une place tirée au hasard dans leur zone.');
    if (cfg.trous.some((l) => l.some(Boolean)) || cfg.trousHasard) t.push('Les cases noires barrées sont des trous : on ne peut ni s’y arrêter ni glisser à travers (les sauts passent au-dessus).');
    return t.join(' ');
  }

  // ---------- vérification ----------
  function verifier(cfg) {
    let K = 0, k = 0, pionBout = false, aPion = false, nbHasard = 0;
    const lot = lotHasard(cfg);
    const customs = new Set();
    for (const id of lot) {
      if (!window.Persos.trouver(id)) return 'Un personnage mis au hasard n’existe plus.';
      if (estRoi(id)) { K++; k++; }
      if (id === 'pion') aPion = true;
      if (!['pion', 'cavalier', 'fou', 'tour', 'dame', 'roi'].includes(id)) customs.add(id);
    }
    if (lot.length) {
      const moitie = Math.floor(cfg.lignes / 2);
      const zones = cfg.hasardOu === 'zones';
      const zH = (r, c) => cfg.zonesH && cfg.zonesH[r] ? cfg.zonesH[r][c] : false;
      let libresW = 0, libresB = 0;
      for (let r = 0; r < cfg.lignes; r++) for (let c = 0; c < cfg.cols; c++) {
        if (cfg.pieces[r][c] || cfg.trous[r][c]) continue;
        if (zones) { if (zH(r, c) === 'w') libresW++; if (zH(r, c) === 'b') libresB++; continue; }
        if (r < moitie) libresW++;
        if (r >= cfg.lignes - moitie) libresB++;
      }
      if (zones && !libresW) return 'Peins la zone des blancs (cases où leurs pièces au hasard peuvent apparaître).';
      if (zones && !libresB) return 'Peins la zone des noirs (cases où leurs pièces au hasard peuvent apparaître).';
      if (lot.length > Math.min(libresW, libresB)) return 'Trop de pièces au hasard : il n’y a que ' + Math.min(libresW, libresB) + (zones ? ' cases libres dans une des zones.' : ' cases libres dans chaque moitié du plateau.');
    }
    for (let r = 0; r < cfg.lignes; r++) for (let c = 0; c < cfg.cols; c++) {
      const p = cfg.pieces[r][c];
      if (!p) continue;
      if (p.perso && estRoi(p.perso)) { if (p.camp === 'w') K++; else k++; }
      if (p.perso === 'pion') {
        aPion = true;
        if ((p.camp === 'w' && r === cfg.lignes - 1) || (p.camp === 'b' && r === 0)) pionBout = true;
      }
      if (p.perso && !window.Persos.trouver(p.perso)) return 'Un personnage placé n’existe plus.';
      if (p.perso && !['pion', 'cavalier', 'fou', 'tour', 'dame', 'roi'].includes(p.perso)) customs.add(p.perso);
      if (p.hasard != null) nbHasard++;
      if (p.hasard != null && !window.Persos.pool(p.hasard).length) return 'Une case 🎲 aléatoire n’a aucun personnage possible : efface-la et repose 🎲.';
    }
    const R = cfg.regles;
    if (R.but !== 'prise' && (!K || !k)) return 'Il faut un roi blanc et un roi noir : pose-les à la main ou mets un roi au hasard.';
    if (R.but !== 'prise' && (K > 1 || k > 1)) return 'Un seul roi par couleur (à la main ou au hasard, pas les deux).';
    if (R.but === 'prise' && (K < 1 || k < 1)) return 'Il faut au moins un roi de chaque couleur.';
    if (pionBout) return 'Un pion ne peut pas commencer sur la dernière rangée.';
    if (aPion && !R.promos.length) return 'Choisis au moins un personnage pour la promotion des pions.';
    for (const id of R.promos) if (!['pion', 'cavalier', 'fou', 'tour', 'dame', 'roi'].includes(id)) customs.add(id);
    // un seul genre de roi par partie
    const rois = new Set();
    for (const id of lot) if (estRoi(id)) rois.add(id);
    for (const l of cfg.pieces) for (const p of l) if (p && p.perso && estRoi(p.perso)) rois.add(p.perso);
    if (rois.size > 1) return 'Un seul genre de roi par partie : les deux camps doivent avoir le même roi (classique ou créé).';
    for (const id of rois) customs.delete(id);
    if (customs.size + nbHasard > 20) return 'Trop de personnages créés différents dans une même partie (20 au maximum, hasard compris).';
    for (const id of customs) {
      const p = window.Persos.trouver(id);
      if (p && !window.Persos.betza(p)) return '« ' + p.nom + ' » n’a aucun déplacement.';
    }
    // Essai réel dans les règles (avec du hasard : il suffit qu'un tirage sur 60 soit jouable)
    let erreur = null;
    for (let n = 0; n < (aleatoire(cfg) ? 60 : 1); n++) {
      erreur = testerVariante(construire(cfg, tirage(cfg)));
      if (!erreur) return null;
    }
    return erreur;
  }

  function testerVariante(v) {
    try {
      window.Regles.assurer(v.ini);
      const b = window.Regles.nouveauPlateau(v.uci, v.fen0, false);
      const n = b.numberLegalMoves();
      b.delete();
      if (!n) return 'Aucun coup possible au départ.';
      // si c'était aux noirs de jouer, seraient-ils déjà en échec ?
      const champs = v.fen0.split(' ');
      champs[1] = 'b';
      const b2 = window.Regles.nouveauPlateau(v.uci, champs.join(' '), false);
      const echec = b2.isCheck();
      b2.delete();
      if (echec) return 'Au départ, le roi noir serait déjà en échec.';
      const b3 = window.Regles.nouveauPlateau(v.uci, v.fen0, false);
      const echecBlanc = b3.isCheck();
      b3.delete();
      if (echecBlanc) return 'Au départ, le roi blanc serait déjà en échec.';
      return null;
    } catch (e) {
      return 'Cette configuration est refusée par les règles.';
    }
  }

  // ---------- avantage ----------
  // Évalue la position de départ (en pions, vue des blancs). Mat = ±99.
  async function evaluer(v, o) {
    const m = window.Moteurs.obtenir(v.moteur, 'analyse');
    const r = await m.chercher({ variante: v, fen0: v.fen0, coups: [], elo: null, profondeur: (o && o.profondeur) || 16, temps: (o && o.temps) || 1500 });
    if (r.annulee || !r.lignes.length) return null;
    const s = r.lignes[0].score;
    const val = s.mate != null ? (s.mate > 0 ? 99 : -99) : s.cp / 100;
    return v.fen0.split(' ')[1] === 'b' ? -val : val;
  }

  // Prépare une partie : tire au hasard jusqu'à tomber dans la fourchette d'avantage voulue.
  async function preparer(cfg, progres) {
    if (!aleatoire(cfg)) return { variante: construire(cfg, tirage(cfg)), avantage: null };
    let meilleur = null;
    const essais = 30;
    let i = 0;
    // les tirages impossibles (roi en échec, aucun coup…) ne comptent pas : on en essaie jusqu'à 600
    for (let t = 0; t < 600 && i < essais; t++) {
      const v = construire(cfg, tirage(cfg));
      if (testerVariante(v)) continue;
      i++;
      const av = await evaluer(v, { profondeur: 14, temps: 900 });
      if (av == null) { if (!meilleur) meilleur = { variante: v, avantage: 0, ecart: 99 }; continue; }
      const dans = av >= cfg.avMin - 1e-9 && av <= cfg.avMax + 1e-9;
      const ecart = dans ? 0 : Math.min(Math.abs(av - cfg.avMin), Math.abs(av - cfg.avMax));
      if (!meilleur || ecart < meilleur.ecart) meilleur = { variante: v, avantage: av, ecart };
      if (progres) progres(i, essais, av, dans);
      if (dans) break;
    }
    if (!meilleur) throw new Error('Aucun tirage jouable.');
    return meilleur;
  }

  // ---------- rangement ----------
  function liste() { try { return JSON.parse(localStorage.getItem(CLE_LISTE) || '[]'); } catch (e) { return []; } }
  const Config = {
    classique, vide, simple, lotHasard, estRoi, garderUnRoi, aleatoire, zoneDe, tirage, construire, verifier, evaluer, preparer, testerVariante, texteRegles, casesCentre, reglesDefaut, grille, copie,
    liste,
    trouver(id) { if (id === 'classique') return classique(); const c = liste().find((x) => x.id === id); return c ? simple(c) : null; },
    enregistrer(cfg) { const l = liste().filter((x) => x.id !== cfg.id); l.unshift(copie(cfg)); localStorage.setItem(CLE_LISTE, JSON.stringify(l)); },
    // Met à jour une configuration déjà enregistrée (à sa place dans la liste) ; rien si elle ne l'est pas.
    mettreAJour(cfg) {
      const l = liste();
      const i = l.findIndex((x) => x.id === cfg.id);
      if (i < 0) return;
      l[i] = copie(cfg);
      localStorage.setItem(CLE_LISTE, JSON.stringify(l));
    },
    supprimer(id) { localStorage.setItem(CLE_LISTE, JSON.stringify(liste().filter((x) => x.id !== id))); },
    courante() {
      try { const c = JSON.parse(localStorage.getItem(CLE_COURANTE)); if (c && c.pieces) return c; } catch (e) { /* rien */ }
      return classique();
    },
    definirCourante(cfg) { localStorage.setItem(CLE_COURANTE, JSON.stringify(cfg)); },
    nouveauId() { return 'c' + Date.now().toString(36); }
  };
  window.Config = Config;
})();
