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

  // Jeux de pièces (Paramètres) : 3 groupes de 8. Crédits dans skins/CREDITS.md.
  const JEUX = [
    ['cburnett', 'Classique', 'calme'], ['merida', 'Merida', 'calme'], ['staunty', 'Staunty', 'calme'], ['maestro', 'Maestro', 'calme'],
    ['cardinal', 'Cardinal', 'calme'], ['chessnut', 'Chessnut', 'calme'], ['leipzig', 'Leipzig', 'calme'], ['mpchess', 'MPChess', 'calme'],
    ['cr-sauvage', 'Savane et dragon', 'realiste'], ['cr-ocean', 'Océan', 'realiste'], ['cr-prehistoire', 'Dinosaures', 'realiste'], ['cr-fantastique', 'Royaume magique', 'realiste'],
    ['cr-monstres', 'Monstres', 'realiste'], ['cr-insectes', 'Insectes', 'realiste'], ['cr-espace', 'Espace', 'realiste'], ['cr-foret', 'Forêt', 'realiste'],
    ['dragons', 'Dragons', 'populaire'], ['fantasy', 'Fantasy', 'populaire'], ['celtic', 'Celtique', 'populaire'], ['california', 'California', 'populaire'],
    ['alpha', 'Alpha', 'populaire'], ['tatiana', 'Tatiana', 'populaire'], ['pixel', 'Pixel', 'populaire'], ['horsey', 'Horsey', 'populaire']
  ].map(([id, nom, groupe]) => ({ id, nom, groupe }));
  const NOMS_3D = { k: 'King', q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn' };
  let jeu = 'cburnett';
  function choisirJeu(id) {
    jeu = JEUX.some((j) => j.id === id) ? id : 'cburnett';
    document.body.classList.toggle('pieces-3d', jeu.startsWith('3d-'));
    // les pièces déjà dessinées changent aussi
    document.querySelectorAll('.piece[data-b]').forEach((e) => { e.style.backgroundImage = 'url("' + image(e.dataset.c, e.dataset.b) + '")'; });
  }
  function imageDe(j, couleur, type) {
    if (j === 'cburnett') return window.PIECES_SVG[couleur + type];
    if (j.startsWith('cr-')) return 'skins/creatures/' + j.slice(3) + '/' + couleur + type.toUpperCase() + '.webp';
    if (j.startsWith('3d-')) return 'skins/pieces3d/' + j.slice(3) + '/' + (couleur === 'w' ? 'White' : 'Black') + '-' + NOMS_3D[type] + '.webp';
    return 'skins/pieces/' + j + '/' + couleur + type.toUpperCase() + '.svg';
  }
  function image(couleur, type) { return imageDe(jeu, couleur, type); }
  // aperçu pour les Paramètres : roi et dame blancs, cavalier et dame noirs
  function apercuJeu(j) {
    const box = document.createElement('div');
    box.className = 'apercu-pieces' + (j.id.startsWith('3d-') ? ' en-3d' : '');
    for (const [c, t] of [['w', 'k'], ['w', 'q'], ['b', 'q'], ['b', 'n']]) {
      const im = document.createElement('img');
      im.src = imageDe(j.id, c, t); im.alt = ''; im.draggable = false;
      box.appendChild(im);
    }
    return box;
  }

  // Dessine une apparence { base, marque } dans un élément .piece
  function dessiner(el, couleur, app) {
    el.innerHTML = '';
    if (app.base) {
      el.style.backgroundImage = 'url("' + image(couleur, app.base) + '")';
      el.dataset.c = couleur; el.dataset.b = app.base;
      if (app.marque) {
        // personnage créé : seulement son petit signe (pas de halo)
        el.classList.add('creee');
        const m = document.createElement('div');
        m.className = 'marque';
        m.textContent = app.marque;
        if ([...app.marque].length > 2 && !/\p{Extended_Pictographic}/u.test(app.marque)) m.classList.add('longue');
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

  window.Pieces = { TYPES, JEUX, infoPiece, creerPiece, creerPerso, image, choisirJeu, apercuJeu };
})();
