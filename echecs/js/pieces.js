/* Dessin des pièces : silhouettes classiques (cburnett) ; un personnage créé = une silhouette
   + une petite marque (lettres ou emoji) dans une pastille dorée. */
(function () {
  'use strict';

  const TYPES = {
    p: { base: 'p', nom: 'Pion' }, n: { base: 'n', nom: 'Cavalier' }, b: { base: 'b', nom: 'Fou' },
    r: { base: 'r', nom: 'Tour' }, q: { base: 'q', nom: 'Dame' }, k: { base: 'k', nom: 'Roi' }
  };

  function infoPiece(lettre, variante) {
    const t = lettre.toLowerCase();
    if (variante && variante.pieces && variante.pieces[t]) return variante.pieces[t];
    return TYPES[t] || { base: null, nom: 'Pièce « ' + t.toUpperCase() + ' »', desc: '' };
  }

  function image(couleur, type) { return window.PIECES_SVG[couleur + type]; }

  // Dessine une apparence { base, marque } dans un élément .piece
  function dessiner(el, couleur, app) {
    el.innerHTML = '';
    if (app.base) {
      el.style.backgroundImage = 'url("' + image(couleur, app.base) + '")';
      if (app.marque) {
        const m = document.createElement('div');
        m.className = 'marque';
        m.textContent = app.marque;
        if ([...app.marque].length > 1 && !/\p{Extended_Pictographic}/u.test(app.marque)) m.classList.add('longue');
        el.appendChild(m);
      }
    } else {
      el.classList.add('inconnue');
      el.textContent = app.lettre || '?';
    }
  }

  // lettre : majuscule = blancs, minuscule = noirs.
  function creerPiece(lettre, variante) {
    const blanc = lettre === lettre.toUpperCase();
    const el = document.createElement('div');
    el.className = 'piece ' + (blanc ? 'blanche' : 'noire');
    const info = infoPiece(lettre, variante);
    dessiner(el, blanc ? 'w' : 'b', Object.assign({ lettre: lettre.toUpperCase() }, info));
    el.title = info.nom;
    return el;
  }

  // Pièce dessinée à partir d'un personnage (éditeurs).
  function creerPerso(perso, camp) {
    const el = document.createElement('div');
    el.className = 'piece ' + (camp === 'b' ? 'noire' : 'blanche');
    dessiner(el, camp === 'b' ? 'b' : 'w', window.Persos.apparence(perso));
    el.title = perso.nom;
    return el;
  }

  window.Pieces = { TYPES, infoPiece, creerPiece, creerPerso, image };
})();
