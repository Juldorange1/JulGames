/* La seule partie du jeu : les échecs classiques. Apparence fixe : plateau « Nocturne » (couleurs dans
   css/jeu.css), pièces « Classique », fond « Nuit sobre », curseur « Flèche noire ». */
(function () {
  'use strict';

  const STD = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  function variante() {
    const pieces = {};
    for (const l in window.Pieces.TYPES) pieces[l] = Object.assign({ marque: '' }, window.Pieces.TYPES[l]);
    return { uci: 'chess', ini: '', moteur: 'sf', fen0: STD, nom: 'Partie normale', pieces, but: '', regles: 'Les règles classiques des échecs : plateau de 8 × 8, on gagne par mat.' };
  }
  // une partie enregistrée est-elle bien une partie d'échecs classiques ? (les anciennes variantes sont ignorées)
  function estClassique(v) { return !!v && v.uci === 'chess' && v.moteur === 'sf' && !v.is960; }

  // curseur « Flèche noire »
  const FLECHE = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M3 2 L3 25 L9 19.5 L13 29 L17.5 27 L13.5 17.8 L21 17.8 Z" fill="#111111" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const st = document.createElement('style');
  st.textContent = 'html, html * { cursor: url("data:image/svg+xml,' + encodeURIComponent(FLECHE) + '") 3 2, auto !important; }';
  document.head.appendChild(st);

  window.Config = { STD, variante, estClassique };
})();
