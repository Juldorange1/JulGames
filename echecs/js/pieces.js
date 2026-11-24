/* Dessin des pièces : pièces classiques (cburnett) + pièces féeriques composées
   (pièce de base + petit insigne d'une autre pièce dans le coin). */
(function () {
  'use strict';

  // Pièces connues. « base » = dessin principal, « insigne » = petite pièce dans le coin.
  const TYPES = {
    p: { base: 'p', nom: 'Pion', desc: 'Avance d’une case (deux au premier coup), prend en diagonale.' },
    n: { base: 'n', nom: 'Cavalier', desc: 'Saute en « L ».' },
    b: { base: 'b', nom: 'Fou', desc: 'Va en diagonale.' },
    r: { base: 'r', nom: 'Tour', desc: 'Va en ligne droite.' },
    q: { base: 'q', nom: 'Dame', desc: 'Tour + fou.' },
    k: { base: 'k', nom: 'Roi', desc: 'Une case dans toutes les directions. Pièce royale.' },
    a: { base: 'b', insigne: 'n', nom: 'Archevêque', desc: 'Fou + cavalier.' },
    c: { base: 'r', insigne: 'n', nom: 'Chancelier', desc: 'Tour + cavalier.' },
    z: { base: 'q', insigne: 'n', nom: 'Amazone', desc: 'Dame + cavalier : la pièce la plus forte.' },
    m: { base: 'k', insigne: 'p', nom: 'Homme', desc: 'Se déplace comme un roi, mais n’est pas royal (on peut le perdre).' }
  };

  function infoPiece(lettre, variante) {
    const t = lettre.toLowerCase();
    if (variante && variante.pieces && variante.pieces[t]) return variante.pieces[t];
    return TYPES[t] || { base: null, nom: 'Pièce « ' + t.toUpperCase() + ' »', desc: '' };
  }

  function image(couleur, type) {
    return window.PIECES_SVG[couleur + type];
  }

  // Crée l'élément d'une pièce. lettre : majuscule = blancs, minuscule = noirs.
  function creerPiece(lettre, variante) {
    const blanc = lettre === lettre.toUpperCase();
    const c = blanc ? 'w' : 'b';
    const info = infoPiece(lettre, variante);
    const el = document.createElement('div');
    el.className = 'piece ' + (blanc ? 'blanche' : 'noire');
    if (info.base) {
      el.style.backgroundImage = 'url("' + image(c, info.base) + '")';
      if (info.insigne) {
        const ins = document.createElement('div');
        ins.className = 'insigne';
        ins.style.backgroundImage = 'url("' + image(c, info.insigne) + '")';
        el.appendChild(ins);
      }
    } else {
      el.classList.add('inconnue');
      el.textContent = lettre.toUpperCase();
    }
    el.title = info.nom;
    return el;
  }

  // Liste des pièces présentes dans une position de départ (pour la légende).
  function piecesDeFen(fen) {
    const plac = fen.split(' ')[0];
    const vus = new Set();
    for (const ch of plac) if (/[a-z]/i.test(ch)) vus.add(ch.toLowerCase());
    return [...vus];
  }

  window.Pieces = { TYPES, infoPiece, creerPiece, piecesDeFen, image };
})();
