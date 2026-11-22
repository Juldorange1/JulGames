/* Shiftrun — symboles dessinés par le jeu, à la place des emojis (qui changent d'un ordinateur à l'autre).
   Après chaque affichage d'écran, les emojis des textes sont remplacés par ces petits dessins (SVG, couleur du texte).
   Dans le jeu lui-même (texte dessiné sur le canvas), ils sont retirés ou remplacés par des signes simples. */
(function (racine) {
'use strict';
const L = (d) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
const P = (d, c) => `<path d="${d}" fill="${c || 'currentColor'}"/>`;
const C = (x, y, r, plein, c) => plein ? `<circle cx="${x}" cy="${y}" r="${r}" fill="${c || 'currentColor'}"/>` : `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c || 'currentColor'}" stroke-width="2"/>`;
const TXT = (t) => `<text x="12" y="17" font-size="14" font-weight="800" text-anchor="middle" fill="currentColor" font-family="sans-serif">${t}</text>`;
const COEUR = 'M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20z';
const D = {
  frag: L('M5 9h3a2 2 0 1 1 4 0h3v3a2 2 0 1 0 0 4v3H5v-4a2 2 0 1 0 0-3z'),
  robot: L('M6 9h12v10H6zM12 5v4M9 13h0M15 13h0M9 16h6') + C(12, 4, 1.4, true) + C(9.5, 13, 1.2, true) + C(14.5, 13, 1.2, true),
  pro: C(12, 8, 3.5) + L('M5 20c1-4 4-6 7-6s6 2 7 6'),
  facile: C(12, 12, 8) + L('M8.5 14c1 1.6 2.2 2.2 3.5 2.2s2.5-.6 3.5-2.2') + C(9.5, 10, 1, true) + C(14.5, 10, 1, true),
  drapeau: L('M6 21V4') + P('M7 4h11l-2.5 4L18 12H7z'),
  cible: C(12, 12, 8) + C(12, 12, 4.5) + C(12, 12, 1.5, true),
  de: L('M5 5h14v14H5z') + C(9, 9, 1.3, true) + C(15, 15, 1.3, true) + C(15, 9, 1.3, true) + C(9, 15, 1.3, true) + C(12, 12, 1.3, true),
  globe: C(12, 12, 8) + L('M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16'),
  saut: L('M12 4v12M7 9l5-5 5 5M5 20h14'),
  manette: L('M7 8h10a4 4 0 0 1 4 4v1a3 3 0 0 1-5.5 1.6L14 13h-4l-1.5 1.6A3 3 0 0 1 3 13v-1a4 4 0 0 1 4-4zM7 10.5v3M5.5 12h3') + C(15.5, 11, 1, true) + C(17.5, 13, 1, true),
  diplome: L('M2 9l10-4 10 4-10 4zM6 11v4c2 2 10 2 12 0v-4M21 9v5'),
  epees: L('M5 5l10 10M19 5L9 15M13 17l4 4M11 17l-4 4M15 13l2 2M9 13l-2 2'),
  rapide: P('M4 6l7 6-7 6zM12 6l7 6-7 6z'),
  coupe: L('M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8'),
  acces: C(12, 5, 2, true) + L('M5 9h14M12 9v6M12 15l-4 5M12 15l4 5'),
  eclair: P('M13 2L5 14h6l-1 8 8-12h-6z'),
  roue: C(12, 12, 3.5) + L('M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2'),
  etincelles: P('M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z') + P('M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z'),
  brume: L('M4 8h12M7 12h13M4 16h10M9 20h8'),
  lune: P('M15 3a9 9 0 1 0 6 13A7 7 0 0 1 15 3z'),
  un: C(12, 12, 9.5) + TXT('1'), quatre: C(12, 12, 9.5) + TXT('4'),
  chrono: C(12, 13, 7.5) + L('M12 13V9M10 3h4M18 6l1.5-1.5'),
  muet: L('M4 9h3l5-4v14l-5-4H4zM16 9l5 6M21 9l-5 6'),
  son: L('M4 9h3l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11'),
  lent: L('M4 17h16M6 17c0-5 3-8 7-8s6 3 6 8M19 12h2.5') + C(21, 11, 1, true),
  feu: P('M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z'),
  calendrierMois: L('M4 6h16v14H4zM4 10h16M8 3v5M16 3v5') + C(9, 14, 1, true) + C(13, 14, 1, true) + C(9, 17, 1, true) + C(13, 17, 1, true),
  calendrier: L('M4 6h16v14H4zM4 10h16M8 3v5M16 3v5') + C(9, 14, 1, true) + C(13, 14, 1, true) + C(9, 17, 1, true),
  sac: L('M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2'),
  question: L('M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.3-1.5 2.4') + C(12, 18, 1.2, true),
  fusee: L('M12 3c3 2 5 6 5 10l-2 3H9l-2-3c0-4 2-8 5-10zM9 16l-2 4M15 16l2 4M12 21v-3') + C(12, 10, 1.6, true),
  yeux: C(8, 12, 3.5) + C(16, 12, 3.5) + C(8.5, 12.5, 1.3, true) + C(16.5, 12.5, 1.3, true),
  chapeau: L('M3 18h18M7 18V8h10v10M7 14h10'),
  rouge: C(12, 12, 7, true, '#ff4a5a'),
  balle: C(12, 12, 8) + L('M4 12h16M12 4v16M6.5 6.5c3 3 3 8 0 11M17.5 6.5c-3 3-3 8 0 11'),
  carte: L('M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14'),
  bouclier: L('M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z'),
  cadenas: L('M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3'),
  boucle: L('M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4'),
  attention: L('M12 3l10 18H2zM12 10v5') + C(12, 18, 1, true),
  marteau: L('M14 4l6 6-3 3-6-6zM12 9L4 17l3 3 8-8'),
  clavier: L('M3 7h18v11H3zM6 10h1M9 10h1M12 10h1M15 10h1M18 10h0M7 14h10'),
  coeur: P(COEUR, '#ff6a7a'),
  coeurVert: P(COEUR, '#5ee887'),
  pouls: P(COEUR, '#ff6a7a') + L('M3 12h4l2-3 3 6 2-3h7'),
  medaille: L('M8 3l4 6 4-6') + C(12, 15, 5.5, true, '#ffd84a') + TXT(''),
  interdit: C(12, 12, 8.5) + L('M6 6l12 12'),
  ampoule: L('M9 17h6M10 20h4M8 13a5.5 5.5 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3z'),
  gemme: L('M6 4h12l3 5-9 11L3 9zM3 9h18M9 4l3 5 3-5M12 9v11'),
  bourse: L('M8 7h8M9 4h6l-1 3M6 20a6 6 0 0 1 0-1c0-5 3-9 6-11 3 2 6 6 6 11a6 6 0 0 1 0 1zM12 11v6M10 13c0-1 4-1 4 .5S10 15 10 16s4 1.5 4 0'),
  recul: P('M20 6l-7 6 7 6zM12 6l-7 6 7 6z'),
  pause: P('M7 5h3.5v14H7zM13.5 5H17v14h-3.5z'),
  suivant: P('M5 6l8 6-8 6zM15 6h3v12h-3z'),
  goutte: P('M12 3c3 4.5 6 8 6 11a6 6 0 0 1-12 0c0-3 3-6.5 6-11z'),
  nuage: L('M7 18h10a4 4 0 0 0 .5-8A5.5 5.5 0 0 0 7 9a4.5 4.5 0 0 0 0 9z'),
  plume: L('M20 4C10 4 5 10 5 19M5 19l3-3M9 15h5M8 12h7M11 8h6'),
  flocon: L('M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M10 5l2 2 2-2M10 19l2-2 2 2'),
  crane: L('M6 15a7 7 0 1 1 12 0v3H6zM9 21v-3M12 21v-3M15 21v-3') + C(9.5, 12, 1.6, true) + C(14.5, 12, 1.6, true),
  croix: L('M6 6l12 12M18 6L6 18'),
  coche: L('M5 12.5l4.5 4.5L19 7'),
  carreau: L('M5 5h14v14H5z'), grilleI: L('M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16')
};
// couleur de chaque symbole (le texte juste à côté prend la même couleur)
const COUL = {
  frag: '#c89bff', robot: '#7ad8ff', pro: '#9ab8ff', facile: '#8dffb0', drapeau: '#ff6a7a', cible: '#ff7a5a', de: '#ff9f43',
  globe: '#34d6c4', saut: '#8dffb0', manette: '#b89bff', diplome: '#d4f05a', epees: '#ff5c5c', rapide: '#ffd84a', coupe: '#ffd23f',
  acces: '#7ad8ff', eclair: '#ffe14a', roue: '#c0c8d8', etincelles: '#ffe98a', brume: '#b8c4d0', lune: '#ffe9a0', un: '#7ad8ff',
  quatre: '#ff9ae6', chrono: '#ffd84a', muet: '#c8d0e0', son: '#8dffb0', lent: '#8dffb0', feu: '#ff8a3a', calendrier: '#b98cff', calendrierMois: '#ec8cf0',
  sac: '#5fe08a', question: '#6aa8ff', fusee: '#ff8a5a', yeux: '#ffffff', chapeau: '#c89bff', balle: '#ffa04a', carte: '#e8c88a',
  bouclier: '#7ae8ff', cadenas: '#ffc85a', boucle: '#7ad8ff', attention: '#ffd84a', marteau: '#e0a070', clavier: '#c8d0e0',
  medaille: '#ffd84a', interdit: '#ff6a6a', ampoule: '#ffe98a', gemme: '#ff9ae6', bourse: '#ffd84a', recul: '#7ad8ff', pause: '#c8d0e0',
  suivant: '#7ad8ff', goutte: '#5ab8ff', nuage: '#d8e4f0', plume: '#e0f0ff', flocon: '#bfe8ff', crane: '#e8e8e8', croix: '#ff7a7a',
  coche: '#7dff9a', carreau: '#c8d0e0', grilleI: '#c8d0e0'
};
// emoji -> dessin
const E = {
  '🧩': 'frag', '🤖': 'robot', '🧑': 'pro', '🙂': 'facile', '🏁': 'drapeau', '🎯': 'cible', '🎲': 'de', '🌐': 'globe', '🦘': 'saut',
  '🎮': 'manette', '🎓': 'diplome', '⚔': 'epees', '⏩': 'rapide', '🏆': 'coupe', '♿': 'acces', '⚡': 'eclair', '⚙': 'roue', '✨': 'etincelles',
  '🌫': 'brume', '🌙': 'lune', '1️⃣': 'un', '4️⃣': 'quatre', '⏱': 'chrono', '🔇': 'muet', '🔊': 'son', '🐢': 'lent', '🔥': 'feu',
  '📅': 'calendrier', '🗓': 'calendrierMois', '🛍': 'sac', '❓': 'question', '🚀': 'fusee', '👀': 'yeux', '🎩': 'chapeau', '🔴': 'rouge',
  '🏀': 'balle', '🗺': 'carte', '🛡': 'bouclier', '🔒': 'cadenas', '🔄': 'boucle', '🔁': 'boucle', '⚠': 'attention', '🔨': 'marteau',
  '⌨': 'clavier', '💓': 'pouls', '💚': 'coeurVert', '❤': 'coeur', '🥇': 'medaille', '🚫': 'interdit', '💡': 'ampoule', '💎': 'gemme',
  '💰': 'bourse', '⏪': 'recul', '⏸': 'pause', '⏭': 'suivant', '💧': 'goutte', '☁': 'nuage', '🪶': 'plume', '❄': 'flocon', '☠': 'crane',
  '✖': 'croix', '✘': 'croix', '✔': 'coche', '◻': 'carreau', '▦': 'grilleI'
};
const cles = Object.keys(E).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const RE = new RegExp('(' + cles.join('|') + ')\\ufe0f?', 'gu');
const svg = (nom) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"${COUL[nom] ? ` style="color:${COUL[nom]}"` : ''}>${D[nom]}</svg>`;
const TITRES = { B: 1, H2: 1, H3: 1 };
// remplace les emojis des textes d'un élément par les dessins (sans toucher aux attributs)
function iconiser(racineEl) {
  if (!racineEl || typeof document === 'undefined') return;
  const w = document.createTreeWalker(racineEl, NodeFilter.SHOW_TEXT), aFaire = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) { RE.lastIndex = 0; if (RE.test(n.nodeValue)) aFaire.push(n); }
  for (const n of aFaire) {
    // un titre qui commence par un symbole prend sa couleur (ex. « ⚔ Survivant »)
    const par = n.parentNode;
    if (par && TITRES[par.tagName] && par.firstChild === n && !par.style.color) {
      RE.lastIndex = 0; const m = RE.exec(n.nodeValue.trimStart());
      if (m && m.index === 0) { const nom = E[m[1]]; if (COUL[nom]) par.style.color = COUL[nom]; }
    }
    const s = document.createElement('span');
    s.innerHTML = n.nodeValue.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]).replace(RE, (m, e) => svg(E[e.replace('️', '')] || E[e]));
    n.parentNode.replaceChild(s, n);
  }
}
// texte dessiné dans le jeu (canvas) : pas d'emoji ; les cœurs deviennent ♥, les autres disparaissent
const CANVAS = { '❤': '♥', '✖': '×', '✘': '×', '✔': '✓' };
function sansEmoji(t) {
  if (typeof t !== 'string') return t;
  RE.lastIndex = 0;
  return t.replace(RE, (m, e) => CANVAS[e] !== undefined ? CANVAS[e] : '').replace(/^\s+/, '').replace(/ {3,}/g, '   ');
}
racine.Icones = { iconiser, sansEmoji, svg, E };
if (typeof module !== 'undefined' && module.exports) module.exports = racine.Icones;
})(typeof window !== 'undefined' ? window : globalThis);
