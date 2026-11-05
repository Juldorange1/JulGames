'use strict';
/* Colosses — réglages de la manette (Paramètres → Manette) : chaque action se règle en appuyant sur le bouton voulu,
   et la sensibilité de la visée (vitesse à laquelle le viseur tourne vers le stick droit) se règle au curseur. */

const NOMS_BOUTONS = ['A / Croix', 'B / Rond', 'X / Carré', 'Y / Triangle', 'LB / L1', 'RB / R1', 'LT / L2', 'RT / R2', 'Back / Share', 'Start / Options', 'Stick gauche (clic)', 'Stick droit (clic)', 'Croix ↑', 'Croix ↓', 'Croix ←', 'Croix →', 'Bouton central'];
const MANETTE_DEF = { tir: [7], spec: [5, 6], tal: [0, 4], pause: [9], sens: .5 };
function MANETTE_CFG() { const o = Save.d.opts; if (!o.manette) o.manette = JSON.parse(JSON.stringify(MANETTE_DEF)); return o.manette; }
const ACTIONS_MANETTE = [['tir', 'Tirer'], ['spec', 'Attaque spéciale'], ['tal', 'Talent'], ['pause', 'Pause']];
UI._corpsManette = function (op) {
  const C = MANETTE_CFG(), cap = UI.captureManette, pad = Manette.liste().length;
  return `<p class="mini">${pad ? 'Manette détectée.' : 'Aucune manette détectée : branche-la puis appuie sur un bouton.'} Clique sur une action puis appuie sur le bouton voulu (chaque action peut avoir 2 boutons : le 2e clic ajoute un bouton, le 3e remplace).</p>` +
    ACTIONS_MANETTE.map(([k, n]) => `<div class="ligne touche-l"><span>${n}</span><button class="tch" data-a="mBouton" data-k="${k}">${cap === k ? '… appuie sur un bouton' : (C[k] || []).map(i => NOMS_BOUTONS[i] || 'Bouton ' + i).join(' + ') || '—'}</button></div>`).join('') +
    `<label class="opt">Sensibilité de la visée <input type="range" id="o-msens" min=".15" max="1.5" step=".05" value="${C.sens || .5}"><span class="pct" id="o-msens-v">${Math.round((C.sens || .5) * 100)} %</span></label>
     <p class="mini">Plus bas = le viseur tourne plus lentement et plus précisément. Déplacement : stick gauche ou croix (toujours).</p>
     <div class="rang"><button data-a="mDefaut">Manette par défaut</button></div>`;
};
const _actionManette = UI.action;
UI.action = function (a, btn) {
  if (a === 'mBouton') { UI.captureManette = btn.dataset.k; UI.captureAjout = (UI.captureAjout === btn.dataset.k) ? 'remplacer' : btn.dataset.k; Manette.avantCapture = null; return this.options(this.ongletOptDepuis || 'menu', 'manette'); }
  if (a === 'mDefaut') { Save.d.opts.manette = JSON.parse(JSON.stringify(MANETTE_DEF)); Save.write(); UI.captureManette = null; return this.options(this.ongletOptDepuis || 'menu', 'manette'); }
  return _actionManette.call(this, a, btn);
};
// après l'affichage de l'onglet : le curseur de sensibilité
const _optionsManette = UI.options;
UI.options = function (depuis, onglet) {
  const r = _optionsManette.apply(this, arguments);
  if (onglet === 'manette') {
    const s = document.getElementById('o-msens');
    if (s) s.addEventListener('input', () => { MANETTE_CFG().sens = +s.value; const v = document.getElementById('o-msens-v'); if (v) v.textContent = Math.round(s.value * 100) + ' %'; Save.write(); });
  } else UI.captureManette = null;
  return r;
};
// capture : le premier bouton nouvellement appuyé est attribué à l'action choisie
const _lireManette2 = Manette.lire.bind(Manette);
Manette.lire = function () {
  if (UI.captureManette) {
    const g = this.liste()[0];
    if (g) {
      const appuyes = g.buttons.map((b, i) => (b.pressed || b.value > .5) ? i : -1).filter(i => i >= 0);
      if (this.avantCapture === null || this.avantCapture === undefined) { this.avantCapture = appuyes; return; }
      const nouv = appuyes.find(i => !this.avantCapture.includes(i));
      this.avantCapture = appuyes;
      if (nouv !== undefined) {
        const C = MANETTE_CFG(), k = UI.captureManette, l = C[k] || [];
        C[k] = UI.captureAjout === 'remplacer' || l.length >= 2 ? [nouv] : (l.includes(nouv) ? l : l.concat([nouv]));
        UI.captureManette = null; UI.captureAjout = null; Save.write(); Son.play('clic');
        this.avant = {}; g.buttons.forEach((b, i) => { this.avant[i] = b.pressed || b.value > .5; }); // pas de clic fantôme dans le menu
        UI.options(UI.ongletOptDepuis || 'menu', 'manette');
      }
    }
    return;
  }
  return _lireManette2();
};
