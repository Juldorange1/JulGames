/* Dessin des pièces : le jeu « Classique » (cburnett), le seul du jeu. */
(function () {
  'use strict';

  const TYPES = {
    p: { base: 'p', nom: 'Pion', desc: 'Avance d’une case (deux au premier coup), prend en diagonale, se promeut au bout.' },
    n: { base: 'n', nom: 'Cavalier', desc: 'Saute en « L » par-dessus les pièces.' },
    b: { base: 'b', nom: 'Fou', desc: 'Va tout droit en diagonale, bloqué par les pièces.' },
    r: { base: 'r', nom: 'Tour', desc: 'Va tout droit en ligne, bloquée par les pièces.' },
    q: { base: 'q', nom: 'Dame', desc: 'Va tout droit dans les 8 directions, bloquée par les pièces.' },
    k: { base: 'k', nom: 'Roi', desc: 'Une case dans toutes les directions. Il ne faut pas le perdre.' }
  };

  function infoPiece(lettre) {
    return TYPES[lettre.toLowerCase()] || { base: null, nom: '?', desc: '' };
  }
  function image(couleur, type) { return window.PIECES_SVG[couleur + type]; }

  // lettre : majuscule = blancs, minuscule = noirs.
  function creerPiece(lettre) {
    const blanc = lettre === lettre.toUpperCase();
    const el = document.createElement('div');
    el.className = 'piece ' + (blanc ? 'blanche' : 'noire');
    const info = infoPiece(lettre);
    if (info.base) {
      el.style.backgroundImage = 'url("' + image(blanc ? 'w' : 'b', info.base) + '")';
      el.dataset.c = blanc ? 'w' : 'b'; el.dataset.b = info.base;
    }
    el.title = info.nom;
    return el;
  }

  window.Pieces = { TYPES, infoPiece, creerPiece, image };
})();
