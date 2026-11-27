/* Règles du jeu : enveloppe autour de ffish.js (règles de Fairy-Stockfish, toutes variantes). */
(function () {
  'use strict';

  let ff = null;
  let iniCharge = '';

  // ffish.js est un vieux script emscripten qui crée des dizaines de variables globales :
  // on l'exécute dans sa propre fonction pour qu'il ne touche à rien d'autre.
  async function charger() {
    if (ff) return ff;
    const rep = await fetch('moteurs/regles/ffish.js');
    const texte = await rep.text();
    await new Promise((resolve, reject) => {
      const cfg = {
        locateFile: (p) => 'moteurs/regles/' + p,
        print: () => {},
        printErr: () => {},
        onRuntimeInitialized: () => resolve(),
        onAbort: (e) => reject(new Error('Règles : ' + e))
      };
      ff = new Function('Module', texte + '\n;return Module;')(cfg);
    });
    return ff;
  }

  // Charge une définition de variante (une seule fois par nom : les règles ne remplacent jamais).
  const chargees = new Set();
  function assurer(ini) {
    if (!ini || !ff) return;
    const m = ini.match(/^\[([^:\]]+)/);
    const nom = m ? m[1] : ini;
    if (chargees.has(nom)) return;
    ff.loadVariantConfig(ini);
    chargees.add(nom);
  }

  // ffish ne garde en mémoire QU'UNE définition des personnages créés à la fois : celle de la dernière
  // variante préparée. Avant toute opération, on remet la bonne variante (sinon un aperçu ou un tirage
  // fait dans la configuration change les déplacements des pièces de la partie en cours).
  let active = null;
  function nouveauPlateau(uci, fen, is960) {
    const b = new ff.Board(uci, fen, !!is960);
    active = uci;
    return b;
  }
  function activer(uci, is960) {
    if (active === uci) return;
    const b = new ff.Board(uci);
    active = uci;
    b.delete();
  }

  // ---------- Lecture d'une FEN ----------
  // Renvoie { cols, lignes, cases[ligne][col] (ligne 0 = rangée du haut), poches, trait, echecs }
  function lireFen(fen) {
    const champs = fen.trim().split(/\s+/);
    let plac = champs[0];
    let poches = null;
    const mPoche = plac.match(/\[([^\]]*)\]$/);
    if (mPoche) {
      plac = plac.slice(0, mPoche.index);
      poches = { w: [], b: [] };
      for (const ch of mPoche[1]) {
        if (/[A-Z]/.test(ch)) poches.w.push(ch);
        else if (/[a-z]/.test(ch)) poches.b.push(ch);
      }
    }
    const rangs = plac.split('/');
    const cases = [];
    const murs = [];
    let cols = 0;
    for (const r of rangs) {
      const ligne = [];
      let i = 0;
      while (i < r.length) {
        const ch = r[i];
        if (/\d/.test(ch)) {
          let n = ch;
          while (i + 1 < r.length && /\d/.test(r[i + 1])) { i++; n += r[i]; }
          for (let k = 0; k < +n; k++) ligne.push(null);
        } else if (ch === '~') {
          if (ligne.length && ligne[ligne.length - 1]) ligne[ligne.length - 1].promu = true;
        } else if (ch === '+') {
          // préfixe de pièce promue (shogi) : ignoré
        } else if (/[a-z]/i.test(ch)) {
          ligne.push({ l: ch });
        } else {
          if (ch === '*') murs.push([cases.length, ligne.length]); // trou (mur)
          ligne.push(null);
        }
        i++;
      }
      cols = Math.max(cols, ligne.length);
      cases.push(ligne);
    }
    let echecs = null;
    for (const c of champs.slice(2)) {
      const m = c.match(/^(\d+)\+(\d+)$/);
      if (m) echecs = { w: +m[1], b: +m[2] };
    }
    const trous = new Set(murs.map(([r, c]) => 'abcdefghijkl'[c] + (cases.length - r)));
    return { cols, lignes: cases.length, cases, poches, trait: champs[1] === 'b' ? 'b' : 'w', echecs, trous };
  }

  // Notation française : R(oi) D(ame) T(our) F(ou) C(avalier) ; pièces féeriques : A, Ch, Am, H.
  const FR = { K: 'R', Q: 'D', R: 'T', B: 'F', N: 'C', A: 'A', C: 'Ch', Z: 'Am', M: 'H' };
  // Avec une variante : un personnage créé s'écrit avec sa marque.
  function francais(san, v) {
    return san.replace(/[A-NP-Z]/g, (l) => {
      const info = v && v.pieces && v.pieces[l.toLowerCase()];
      if (info && info.marque) return info.marque;
      return FR[l] || l;
    });
  }

  const FICHIERS = 'abcdefghijkl';
  function nomCase(col, rang) { return FICHIERS[col] + (rang + 1); } // rang 0 = première rangée
  function lireCase(s) {
    const m = s.match(/^([a-l])(\d+)$/);
    if (!m) return null;
    return { col: FICHIERS.indexOf(m[1]), rang: +m[2] - 1 };
  }
  // Découpe un coup UCI : déplacement « e2e4 », promotion « e7e8q », pose « P@e4 ».
  function decouper(uci) {
    let m = uci.match(/^([A-Za-z])@([a-l]\d+)$/);
    if (m) return { pose: m[1].toLowerCase(), de: null, vers: m[2] };
    m = uci.match(/^([a-l]\d+)([a-l]\d+)(.*)$/);
    if (!m) return null;
    return { de: m[1], vers: m[2], promo: m[3] || '' };
  }

  // ---------- Une partie ----------
  class Partie {
    constructor(variante, fen0, coups) {
      assurer(variante.ini);
      this.v = variante;
      this.fen0 = fen0 || Regles.fenDepart(variante);
      this.board = nouveauPlateau(variante.uci, this.fen0, variante.is960);
      this.coups = [];
      this.sans = [];
      this.sansEn = [];
      this.fens = [this.board.fen()];
      this.prises = [];
      for (const c of coups || []) this.jouer(c);
    }
    get fen() { return this.fens[this.fens.length - 1]; }
    _a() { activer(this.v.uci, this.v.is960); return this.board; }
    trait() { return this.board.turn() ? 'w' : 'b'; }
    legaux() {
      this._a();
      const s = this.board.legalMoves();
      return s ? s.split(' ') : [];
    }
    jouer(uci) {
      if (!this.legaux().includes(uci)) return false;
      this._a();
      const san = this.board.sanMove(uci);
      const prise = this.board.isCapture(uci);
      this.board.push(uci);
      this.coups.push(uci);
      this.sans.push(francais(san, this.v));
      this.sansEn.push(san);
      this.prises.push(prise);
      this.fens.push(this.board.fen());
      return true;
    }
    annuler() {
      if (!this.coups.length) return;
      this._a().pop();
      this.coups.pop(); this.sans.pop(); this.sansEn.pop(); this.prises.pop(); this.fens.pop();
    }
    echec() { return this._a().isCheck(); }
    finie() { return this._a().isGameOver(true); }
    resultat() { return this._a().result(true); }
    raison() {
      this._a();
      const res = this.resultat();
      if (this.board.numberLegalMoves() === 0) {
        if (this.board.isCheck()) return 'Échec et mat';
        return res === '1/2-1/2' ? 'Pat' : 'Plus aucun coup possible';
      }
      if (res === '1/2-1/2') {
        if (this.board.isInsufficientMaterial()) return 'Matériel insuffisant';
        if (this.board.halfmoveClock() >= 100) return 'Règle des 50 coups';
        if (this.v.uci === 'racingkings') return 'Les deux rois sont arrivés';
        return 'Répétition de la position';
      }
      return this.v.but || 'Règle de la variante';
    }
    // Notation d'une suite de coups depuis la position après « n » coups.
    suiteSan(n, pv, max) {
      const b = nouveauPlateau(this.v.uci, this.fen0, this.v.is960);
      for (let i = 0; i < n; i++) b.push(this.coups[i]);
      const out = [];
      for (const c of pv.slice(0, max || 8)) {
        let s;
        try { s = b.sanMove(c); } catch (e) { break; }
        if (!b.push(c)) break;
        out.push(francais(s, this.v));
      }
      b.delete();
      return out;
    }
    detruire() { if (this.board) { this.board.delete(); this.board = null; } }
  }

  // Position de départ aléatoire du 960.
  function fen960() {
    const r = new Array(8).fill(null);
    const libres = () => r.map((x, i) => (x ? -1 : i)).filter(i => i >= 0);
    const hasard = (l) => l[Math.floor(Math.random() * l.length)];
    r[hasard([0, 2, 4, 6])] = 'b';
    r[hasard([1, 3, 5, 7])] = 'b';
    r[hasard(libres())] = 'q';
    r[hasard(libres())] = 'n';
    r[hasard(libres())] = 'n';
    const l = libres();
    r[l[0]] = 'r'; r[l[1]] = 'k'; r[l[2]] = 'r';
    const noirs = r.join('');
    const tours = [l[0], l[2]].map(i => 'abcdefgh'[i]);
    const roque = tours.slice().reverse().map(t => t.toUpperCase()).join('') + tours.slice().reverse().join('');
    return noirs + '/pppppppp/8/8/8/8/PPPPPPPP/' + noirs.toUpperCase() + ' w ' + roque + ' - 0 1';
  }

  // Pré-moves possibles : tous les coups qu'on pourrait jouer après n'importe quelle réponse de l'adversaire.
  function premoves(v, fen) {
    const out = new Set();
    let P = null;
    try {
      P = new Partie(v, fen, []);
      for (const m of P.legaux()) {
        if (!P.jouer(m)) continue;
        for (const x of P.legaux()) out.add(x);
        P.annuler();
      }
    } catch (e) { /* rien */ }
    if (P) P.detruire();
    return [...out];
  }

  const Regles = {
    premoves,
    charger, assurer, nouveauPlateau, activer, francais, lireFen, nomCase, lireCase, decouper, Partie, fen960,
    get ff() { return ff; },
    fenDepart(v) { return v.fen0 || (v.is960 ? fen960() : ff.startingFen(v.uci)); }
  };
  window.Regles = Regles;
})();
