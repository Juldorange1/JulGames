/* Cartes : la forme du plateau (nombre de colonnes et de rangées, et les trous).
   On les crée dans le menu « Créer des cartes », puis on en choisit une dans la configuration de partie. */
(function () {
  'use strict';

  const CLE = 'echecs.cartes';
  const FICH = 'abcdefghijkl';
  const $ = (s) => document.querySelector(s);
  function el(tag, cls, texte) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texte != null) e.textContent = texte;
    return e;
  }
  const grille = (l, c, v) => Array.from({ length: l }, () => Array.from({ length: c }, () => v));
  const copie = (o) => JSON.parse(JSON.stringify(o));

  const NORMALE = { id: 'normal', nom: 'Plateau normal 8 × 8', cols: 8, lignes: 8, trous: grille(8, 8, false), fixe: true };

  function lire() { try { const l = JSON.parse(localStorage.getItem(CLE) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function ecrire(l) { localStorage.setItem(CLE, JSON.stringify(l)); }

  const Cartes = {
    NORMALE,
    liste() { return lire(); },
    toutes() { return [copie(NORMALE)].concat(lire()); },
    trouver(id) {
      if (!id || id === 'normal') return copie(NORMALE);
      const c = lire().find((x) => x.id === id);
      return c ? copie(c) : null;
    },
    enregistrer(c) {
      if (c.fixe) return;
      const l = lire();
      const i = l.findIndex((x) => x.id === c.id);
      if (i >= 0) l[i] = copie(c); else l.unshift(copie(c));
      ecrire(l);
    },
    supprimer(id) { ecrire(lire().filter((x) => x.id !== id)); },
    nouveauId() { return 'k' + Date.now().toString(36); }
  };

  // =====================================================================
  //  ÉDITEUR DE CARTES
  // =====================================================================
  const E = {
    carte: null,
    plateau: null,
    peint: null,

    init() {
      this.plateau = new window.Plateau($('#plateau-carte'), {});
      this.plateau.bloquer();
      const cadre = this.plateau.cadre;
      cadre.addEventListener('pointerdown', (e) => this._appui(e));
      cadre.addEventListener('pointermove', (e) => {
        if (!this.peint || !e.buttons) return;
        const c = this._case(e);
        if (!c) return;
        const d = this.peint.dernier || c;
        const n = Math.max(Math.abs(c[0] - d[0]), Math.abs(c[1] - d[1]));
        for (let i = 1; i <= n; i++) this._peindre([Math.round(d[0] + (c[0] - d[0]) * i / n), Math.round(d[1] + (c[1] - d[1]) * i / n)]);
        this._peindre(c);
      });
      window.addEventListener('pointerup', () => { if (this.peint) { this.peint = null; this.sauver(); } });
      $('#ca-nouvelle').addEventListener('click', () => this.nouvelle());
      $('#ca-nom').addEventListener('input', () => {
        if (this.carte.fixe) return;
        this.carte.nom = $('#ca-nom').value.trim() || 'Sans nom';
        this.sauver(); this.liste();
      });
      const taille = (dc, dl) => {
        if (this.carte.fixe) return;
        const c = this.carte;
        const cols = Math.max(5, Math.min(12, c.cols + dc)), lignes = Math.max(5, Math.min(10, c.lignes + dl));
        if (cols === c.cols && lignes === c.lignes) return;
        c.trous = window.Config.ajusterGrille(c.trous, c.lignes, cols, lignes, false);
        c.cols = cols; c.lignes = lignes;
        this.sauver(); this.afficher(); this.remplir();
      };
      $('#ca-cols-moins').addEventListener('click', () => taille(-1, 0));
      $('#ca-cols-plus').addEventListener('click', () => taille(1, 0));
      $('#ca-lignes-moins').addEventListener('click', () => taille(0, -1));
      $('#ca-lignes-plus').addEventListener('click', () => taille(0, 1));
      $('#ca-boucher').addEventListener('click', () => {
        if (this.carte.fixe) return;
        this.carte.trous = grille(this.carte.lignes, this.carte.cols, false);
        this.sauver(); this.afficher();
      });
      $('#ca-supprimer').addEventListener('click', () => {
        const c = this.carte;
        if (c.fixe) return;
        window.App.modale('<h2>Supprimer « ' + c.nom.replace(/</g, '') + ' » ?</h2><p>Les configurations qui l’utilisent reprendront le plateau normal.</p>', [
          { texte: 'Supprimer', classe: 'danger', action: () => { Cartes.supprimer(c.id); this.editer(Cartes.liste()[0] || Cartes.trouver('normal')); } },
          { texte: 'Annuler' }
        ]);
      });
    },

    ouvrir() {
      const l = Cartes.liste();
      const garde = this.carte && Cartes.trouver(this.carte.id);
      this.editer(garde || l[0] || Cartes.trouver('normal'));
    },
    editer(c) {
      this.carte = copie(c);
      this.remplir(); this.liste(); this.afficher();
    },
    nouvelle() {
      const noms = new Set(Cartes.liste().map((x) => x.nom));
      let i = 1;
      while (noms.has('Carte ' + i)) i++;
      const c = { id: Cartes.nouveauId(), nom: 'Carte ' + i, cols: 8, lignes: 8, trous: grille(8, 8, false) };
      Cartes.enregistrer(c);
      this.editer(c);
      window.App.bulle('Nouvelle carte : clique les cases pour faire des trous.');
    },
    sauver() { Cartes.enregistrer(this.carte); },

    remplir() {
      const c = this.carte;
      $('#ca-titre').textContent = c.nom;
      $('#ca-nom').value = c.nom;
      $('#ca-nom').disabled = !!c.fixe;
      $('#ca-cols-val').textContent = c.cols;
      $('#ca-lignes-val').textContent = c.lignes;
      document.querySelectorAll('#ca-reglages .bouton').forEach((b) => { b.disabled = !!c.fixe; });
      $('#ca-note-fixe').style.display = c.fixe ? '' : 'none';
      const n = c.trous.flat().filter(Boolean).length;
      $('#ca-resume').textContent = c.cols + ' × ' + c.lignes + ' cases, ' + (n ? n + ' trou' + (n > 1 ? 's' : '') : 'aucun trou') + '.';
    },

    liste() {
      const box = $('#ca-liste');
      box.innerHTML = '';
      for (const c of Cartes.toutes()) {
        const b = el('button', 'ps-carte' + (c.id === this.carte.id ? ' choisie' : ''));
        b.append(el('span', 'ca-icone', c.fixe ? '♟' : '🗺'), el('span', null, c.nom));
        b.addEventListener('click', () => this.editer(c));
        box.appendChild(b);
      }
    },

    afficher() {
      const c = this.carte;
      const cases = [], trous = new Set();
      for (let r = c.lignes - 1; r >= 0; r--) {
        cases.push(new Array(c.cols).fill(null));
        for (let x = 0; x < c.cols; x++) if (c.trous[r][x]) trous.add(FICH[x] + (r + 1));
      }
      this.plateau.afficher({ cols: c.cols, lignes: c.lignes, cases, poches: null, trous }, {});
      this.redimensionner();
      this.remplir();
    },

    _case(e) {
      const nom = this.plateau._caseSous(e);
      if (!nom) return null;
      const { col, rang } = this.plateau._coord(nom);
      return [rang, col];
    },
    _appui(e) {
      e.preventDefault();
      const c = this._case(e);
      if (!c) return;
      if (this.carte.fixe) { window.App.bulle('Le plateau normal ne se modifie pas : clique « ➕ Nouvelle carte ».'); return; }
      // clic gauche : trou (ou rebouche si c'en était un) ; clic droit : rebouche
      const trou = e.button === 2 ? false : !this.carte.trous[c[0]][c[1]];
      this.peint = { trou, faites: new Set() };
      window.Son.clic();
      this._peindre(c);
    },
    _peindre([r, c]) {
      const P = this.peint;
      P.dernier = [r, c];
      const cle = r + ',' + c;
      if (P.faites.has(cle)) return;
      P.faites.add(cle);
      this.carte.trous[r][c] = P.trou;
      this.afficher();
    },

    redimensionner() {
      const zone = $('#plateau-carte');
      if (!zone || !zone.offsetParent) return;
      const parent = zone.parentElement.getBoundingClientRect();
      const t = Math.floor(Math.min((parent.width - 16) / this.carte.cols, (parent.height - 16) / this.carte.lignes));
      this.plateau.taille(Math.max(26, Math.min(100, t)));
    }
  };

  window.Cartes = Cartes;
  window.EditeurCartes = E;
})();
