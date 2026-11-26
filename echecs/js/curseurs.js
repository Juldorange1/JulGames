/* Curseurs de souris au choix (Paramètres → Curseur). Dessinés ici en SVG, appliqués à toute la page. */
(function () {
  'use strict';

  const FLECHE = 'M3 2 L3 25 L9 19.5 L13 29 L17.5 27 L13.5 17.8 L21 17.8 Z';
  const svg = (corps, t) => '<svg xmlns="http://www.w3.org/2000/svg" width="' + (t || 32) + '" height="' + (t || 32) + '" viewBox="0 0 32 32">' + corps + '</svg>';
  const fleche = (fond, trait, t) => svg('<path d="' + FLECHE + '" fill="' + fond + '" stroke="' + trait + '" stroke-width="1.6" stroke-linejoin="round"/>', t);

  const LISTE = [
    { id: 'systeme', nom: 'Normal', image: fleche('#ffffff', '#000000'), aucun: true },
    { id: 'grande', nom: 'Grande flèche', image: fleche('#ffffff', '#000000', 48), x: 4, y: 3 },
    { id: 'noire', nom: 'Flèche noire', image: fleche('#111111', '#ffffff'), x: 3, y: 2 },
    { id: 'or', nom: 'Flèche dorée', image: fleche('#f0c050', '#3a2a08'), x: 3, y: 2 },
    { id: 'main', nom: 'Main', mot: 'pointer', apercu: '👆' },
    { id: 'croix', nom: 'Croix', x: 16, y: 16, image: svg(
      '<path d="M16 3 V29 M3 16 H29" stroke="#000" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M16 3 V29 M3 16 H29" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>') },
    { id: 'point', nom: 'Point rouge', x: 16, y: 16, image: svg(
      '<circle cx="16" cy="16" r="7" fill="#e23b3b" stroke="#fff" stroke-width="2.5"/>') },
    { id: 'pion', nom: 'Pion', x: 16, y: 2, image: svg(
      '<path d="M16 2.5 a5 5 0 0 1 3 9 c2 1.3 3 3 2.4 5 h-2.2 c.6 4 2.6 6.6 5.3 8.2 v3.8 H7.5 v-3.8 c2.7-1.6 4.7-4.2 5.3-8.2 h-2.2 c-.6-2 .4-3.7 2.4-5 a5 5 0 0 1 3-9 z" fill="#f0c050" stroke="#2a1f08" stroke-width="1.6" stroke-linejoin="round"/>') }
  ];

  const url = (c) => 'data:image/svg+xml,' + encodeURIComponent(c.image);

  const Curseurs = {
    LISTE,
    appliquer(id) {
      const c = LISTE.find((x) => x.id === id) || LISTE[0];
      let st = document.getElementById('style-curseur');
      if (!st) { st = document.createElement('style'); st.id = 'style-curseur'; document.head.appendChild(st); }
      if (c.aucun) { st.textContent = ''; return; }
      const val = c.mot ? c.mot : 'url("' + url(c) + '") ' + c.x + ' ' + c.y + ', auto';
      st.textContent = 'html, html * { cursor: ' + val + ' !important; }';
    },
    apercu(c) {
      const d = document.createElement('div');
      d.className = 'apercu-curseur';
      if (c.apercu) d.textContent = c.apercu;
      else { const i = document.createElement('img'); i.src = url(c); i.alt = ''; i.draggable = false; d.appendChild(i); }
      return d;
    }
  };

  window.Curseurs = Curseurs;
})();
