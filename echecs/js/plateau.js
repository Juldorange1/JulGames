/* Plateau : affichage d'une position, clics / glisser-déposer, poses depuis la réserve,
   surlignages, flèches. Aucun savoir sur les règles : on lui donne la liste des coups légaux. */
(function () {
  'use strict';

  const FICH = 'abcdefghijkl';

  class Plateau {
    constructor(racine, opts) {
      this.racine = racine;
      this.opts = opts || {};
      this.retourne = false;
      this.cols = 8; this.lignes = 8;
      this.position = null;
      this.legaux = [];
      this.actif = false;        // le joueur peut-il bouger ?
      this.camp = 'w';           // camp qui peut bouger
      this.selection = null;     // { de: 'e2' } ou { pose: 'p' }
      this.dernier = null;
      this.fleches = [];
      this.variante = null;

      racine.classList.add('plateau-bloc');
      racine.innerHTML = '';
      this.pocheHaut = document.createElement('div'); this.pocheHaut.className = 'poche';
      this.cadre = document.createElement('div'); this.cadre.className = 'plateau';
      this.pocheBas = document.createElement('div'); this.pocheBas.className = 'poche';
      this.grille = document.createElement('div'); this.grille.className = 'grille';
      this.calquePieces = document.createElement('div'); this.calquePieces.className = 'calque-pieces';
      this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.svg.classList.add('calque-fleches');
      this.cadre.append(this.grille, this.calquePieces, this.svg);
      racine.append(this.pocheHaut, this.cadre, this.pocheBas);

      this.cadre.addEventListener('pointerdown', (e) => this._appui(e));
      window.addEventListener('pointermove', (e) => this._bouge(e));
      window.addEventListener('pointerup', (e) => this._lache(e));
      this.cadre.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // ---------- géométrie ----------
    taille(px) {
      // px = côté d'une case ; rien à refaire si la taille ne change pas (les animations continuent)
      if (px === this.tCase && this.cadre.style.width === (px * this.cols) + 'px' && this.cadre.style.height === (px * this.lignes) + 'px') return;
      this.tCase = px;
      this.cadre.style.width = (px * this.cols) + 'px';
      this.cadre.style.height = (px * this.lignes) + 'px';
      this.racine.style.setProperty('--case', px + 'px');
      this._placerPieces(false);
      this._dessinerFleches();
    }
    // Case (col, rang) -> position écran (x, y en cases depuis le coin haut gauche)
    _ecran(col, rang) {
      if (this.retourne) return { x: this.cols - 1 - col, y: rang };
      return { x: col, y: this.lignes - 1 - rang };
    }
    _depuisEcran(x, y) {
      if (this.retourne) return { col: this.cols - 1 - x, rang: y };
      return { col: x, rang: this.lignes - 1 - y };
    }
    _caseSous(e) {
      const r = this.cadre.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) / (r.width / this.cols));
      const y = Math.floor((e.clientY - r.top) / (r.height / this.lignes));
      if (x < 0 || y < 0 || x >= this.cols || y >= this.lignes) return null;
      const c = this._depuisEcran(x, y);
      return FICH[c.col] + (c.rang + 1);
    }
    _coord(nom) {
      const m = nom.match(/^([a-l])(\d+)$/);
      return { col: FICH.indexOf(m[1]), rang: +m[2] - 1 };
    }

    // ---------- affichage ----------
    afficher(position, o) {
      o = o || {};
      const ancienne = this.position;
      const dimsChangent = position.cols !== this.cols || position.lignes !== this.lignes;
      this.position = position;
      this.cols = position.cols; this.lignes = position.lignes;
      if (o.variante) this.variante = o.variante;
      this.decor = o.decor || null;
      this.dernier = o.dernier || null;
      this.echecCase = o.echec || null;
      if (dimsChangent || !this.grille.children.length) this._construireGrille();
      if (dimsChangent && this.tCase) this.taille(this.tCase);
      this._surligner();
      this._placerPieces(o.animer);
      this._poches();
      if ((o.animer || o.effets) && ancienne && !dimsChangent) this._animerPrises(ancienne);
      if (o.effets && !o.animer && this.dernier) { const el = this.piecesEl && this.piecesEl[this.dernier[this.dernier.length - 1]]; if (el) this._poser(el, 0); }
      if (o.entree) {
        // après le premier dimensionnement du plateau, sinon l'animation serait effacée
        this.calquePieces.style.opacity = '0';
        setTimeout(() => { this.calquePieces.style.opacity = ''; this._entree(); }, 80);
      }
      if (o.pop) for (const nom of o.pop) { const el = this.piecesEl && this.piecesEl[nom]; if (el) this._poser(el, 0); }
    }

    // ---------- petites animations ----------
    _lettreEn(pos, nom) {
      const c = this._coord(nom);
      const l = pos.cases[pos.lignes - 1 - c.rang];
      const p = l ? l[c.col] : null;
      return p ? p.l : null;
    }
    // Pièces disparues (prises, explosions) : elles s'effacent avec un petit éclat.
    _animerPrises(ancienne) {
      if (!this.tCase) return;
      const depart = this.dernier && this.dernier.length === 2 ? this.dernier[0] : null;
      const parties = [], arrivees = [];
      for (let r = 0; r < this.lignes; r++) for (let c = 0; c < this.cols; c++) {
        const nom = FICH[c] + (r + 1);
        const avant = this._lettreEn(ancienne, nom), apres = this._lettreEn(this.position, nom);
        if (avant && avant !== apres && nom !== depart) parties.push([nom, avant]);
        if (apres && apres !== avant) arrivees.push(apres);
      }
      for (const [nom, l] of parties) {
        const i = arrivees.indexOf(l);
        if (i >= 0 && !(this.dernier && this.dernier[1] === nom)) { arrivees.splice(i, 1); continue; } // pièce déplacée (roque), pas prise
        this._eclat(nom, l);
      }
    }
    _centre(nom) {
      const c = this._coord(nom);
      const e = this._ecran(c.col, c.rang);
      return { x: (e.x + 0.5) * this.tCase, y: (e.y + 0.5) * this.tCase, ex: e.x, ey: e.y };
    }
    _eclat(nom, lettre) {
      const t = this.tCase;
      const p = this._centre(nom);
      const fantome = window.Pieces.creerPiece(lettre, this.variante);
      fantome.classList.add('fantome');
      fantome.style.width = t + 'px'; fantome.style.height = t + 'px';
      fantome.style.left = (p.ex * t) + 'px'; fantome.style.top = (p.ey * t) + 'px';
      this.calquePieces.appendChild(fantome);
      setTimeout(() => fantome.remove(), 450);
      for (let i = 0; i < 10; i++) {
        const e = document.createElement('div');
        e.className = 'eclat';
        const a = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
        const d = t * (0.45 + Math.random() * 0.35);
        e.style.left = p.x + 'px'; e.style.top = p.y + 'px';
        e.style.setProperty('--dx', (Math.cos(a) * d) + 'px');
        e.style.setProperty('--dy', (Math.sin(a) * d) + 'px');
        e.style.background = lettre === lettre.toUpperCase() ? '#f4efe2' : '#2a2a2a';
        this.calquePieces.appendChild(e);
        setTimeout(() => e.remove(), 520);
      }
    }
    _poser(el, delai) {
      setTimeout(() => { el.classList.remove('pose'); void el.offsetWidth; el.classList.add('pose'); }, delai);
    }
    // Début de partie : les pièces arrivent rangée par rangée.
    _entree() {
      for (const nom in this.piecesEl || {}) {
        const el = this.piecesEl[nom];
        const c = this._coord(nom);
        const loin = Math.min(c.rang, this.lignes - 1 - c.rang);
        el.style.animationDelay = (loin * 70 + c.col * 15) + 'ms';
        el.classList.add('apparition');
        setTimeout(() => { el.classList.remove('apparition'); el.style.animationDelay = ''; }, 900);
      }
    }
    // Petits confettis dorés au-dessus du plateau.
    feuDeJoie() {
      if (!this.tCase) return;
      const W = this.cols * this.tCase, H = this.lignes * this.tCase;
      const couleurs = ['#e3b15a', '#f4efe2', '#78c850', '#4a9bff', '#ec6b6b'];
      for (let i = 0; i < 60; i++) {
        const e = document.createElement('div');
        e.className = 'confetti';
        e.style.left = (Math.random() * W) + 'px';
        e.style.top = (-10 - Math.random() * H * 0.2) + 'px';
        e.style.background = couleurs[i % couleurs.length];
        e.style.setProperty('--chute', (H * (0.7 + Math.random() * 0.4)) + 'px');
        e.style.setProperty('--tour', (Math.random() * 720 - 360) + 'deg');
        e.style.animationDelay = (Math.random() * 400) + 'ms';
        this.calquePieces.appendChild(e);
        setTimeout(() => e.remove(), 2600);
      }
    }

    retourner(oui) {
      this.retourne = oui;
      this._construireGrille();
      this._surligner();
      this._placerPieces(false);
      this._poches();
      this._dessinerFleches();
    }

    _construireGrille() {
      this.grille.innerHTML = '';
      this.grille.style.gridTemplateColumns = 'repeat(' + this.cols + ', 1fr)';
      this.grille.style.gridTemplateRows = 'repeat(' + this.lignes + ', 1fr)';
      this.casesEl = {};
      for (let y = 0; y < this.lignes; y++) {
        for (let x = 0; x < this.cols; x++) {
          const c = this._depuisEcran(x, y);
          const nom = FICH[c.col] + (c.rang + 1);
          const d = document.createElement('div');
          d.className = 'case ' + ((c.col + c.rang) % 2 === 0 ? 'foncee' : 'claire');
          if (x === 0) { const s = document.createElement('span'); s.className = 'coord rang'; s.textContent = c.rang + 1; d.appendChild(s); }
          if (y === this.lignes - 1) { const s = document.createElement('span'); s.className = 'coord col'; s.textContent = FICH[c.col]; d.appendChild(s); }
          this.casesEl[nom] = d;
          this.grille.appendChild(d);
        }
      }
    }

    _surligner() {
      if (!this.casesEl) return;
      const trous = (this.position && this.position.trous) || new Set();
      const zs = (this.decor && this.decor.zones) || {};
      const zw = zs instanceof Set ? zs : (zs.w || new Set()), zb = zs instanceof Set ? new Set() : (zs.b || new Set());
      for (const nom in this.casesEl) {
        const d = this.casesEl[nom];
        d.classList.remove('dernier', 'selection', 'cible', 'cible-prise', 'echec');
        d.classList.toggle('trou', trous.has(nom));
        d.classList.toggle('zone', zw.has(nom));
        d.classList.toggle('zone-noire', zb.has(nom));
        d.classList.toggle('choisie-cfg', !!(this.decor && this.decor.selection && this.decor.selection.has(nom)));
      }
      if (this.dernier) for (const n of this.dernier) if (this.casesEl[n]) this.casesEl[n].classList.add('dernier');
      if (this.echecCase && this.casesEl[this.echecCase]) this.casesEl[this.echecCase].classList.add('echec');
      for (const nom in this.piecesEl || {}) this.piecesEl[nom].classList.toggle('levee', !!(this.selection && this.selection.de === nom));
      if (this.selection) {
        if (this.selection.de) this.casesEl[this.selection.de].classList.add('selection');
        for (const v of this._ciblesSelection()) {
          const occ = this._pieceEn(v);
          this.casesEl[v].classList.add(occ ? 'cible-prise' : 'cible');
        }
      }
    }

    _pieceEn(nom) {
      if (!this.position) return null;
      const c = this._coord(nom);
      const ligne = this.position.cases[this.lignes - 1 - c.rang];
      return ligne ? ligne[c.col] : null;
    }

    _placerPieces(animer) {
      if (!this.position || !this.tCase) return;
      const anciens = this.piecesEl || {};
      const nouveaux = {};
      this.calquePieces.innerHTML = '';
      const t = this.tCase;
      let depart = null, arrivee = null;
      if (animer && this.dernier && this.dernier.length === 2) { depart = this.dernier[0]; arrivee = this.dernier[1]; }
      for (let r = 0; r < this.lignes; r++) {
        const ligne = this.position.cases[r] || [];
        for (let col = 0; col < this.cols; col++) {
          const p = ligne[col];
          if (!p) continue;
          const rang = this.lignes - 1 - r;
          const nom = FICH[col] + (rang + 1);
          let el;
          if (p.hasard != null) {
            el = document.createElement('div');
            el.className = 'piece de ' + (p.camp === 'b' ? 'noire' : 'blanche');
            const choix = Array.isArray(p.hasard) ? p.hasard.map((id) => (window.Persos.trouver(id) || {}).nom).filter(Boolean) : null;
            el.innerHTML = '<span>🎲</span><small></small>';
            el.querySelector('small').textContent = choix ? choix.length + ' choix' : (p.hasard || 'tous');
            el.title = 'Au hasard parmi : ' + (choix ? choix.join(', ') : (p.hasard || 'tous'));
          } else if (p.perso) el = window.Pieces.creerPerso(p.perso, p.camp);
          else el = window.Pieces.creerPiece(p.l, this.variante);
          if (p.promu) el.classList.add('promue');
          const e = this._ecran(col, rang);
          el.style.width = t + 'px'; el.style.height = t + 'px';
          el.style.transform = 'translate(' + (e.x * t) + 'px,' + (e.y * t) + 'px)';
          el.dataset.case = nom;
          if (animer && nom === arrivee && depart && depart !== arrivee) {
            const d = this._coord(depart);
            const ed = this._ecran(d.col, d.rang);
            el.style.transition = 'none';
            el.style.transform = 'translate(' + (ed.x * t) + 'px,' + (ed.y * t) + 'px)';
            requestAnimationFrame(() => requestAnimationFrame(() => {
              el.style.transition = '';
              el.style.transform = 'translate(' + (e.x * t) + 'px,' + (e.y * t) + 'px)';
            }));
            const arrivant = el;
            setTimeout(() => this._poser(arrivant, 0), 190);
          }
          nouveaux[nom] = el;
          this.calquePieces.appendChild(el);
        }
      }
      this.piecesEl = nouveaux;
      void anciens;
    }

    _poches() {
      const pos = this.position;
      const haut = this.retourne ? 'w' : 'b';
      const bas = this.retourne ? 'b' : 'w';
      for (const [el, camp] of [[this.pocheHaut, haut], [this.pocheBas, bas]]) {
        el.innerHTML = '';
        el.style.display = pos && pos.poches ? '' : 'none';
        if (!pos || !pos.poches) continue;
        const compte = {};
        for (const l of pos.poches[camp]) compte[l] = (compte[l] || 0) + 1;
        const ordre = 'qzcarbnmpk';
        const lettres = Object.keys(compte).sort((a, b) => ordre.indexOf(a.toLowerCase()) - ordre.indexOf(b.toLowerCase()));
        if (!lettres.length) {
          const v = document.createElement('span'); v.className = 'poche-vide';
          v.textContent = camp === 'w' ? 'Réserve des blancs : vide' : 'Réserve des noirs : vide';
          el.appendChild(v);
        }
        for (const l of lettres) {
          const b = document.createElement('button');
          b.className = 'poche-piece';
          b.appendChild(window.Pieces.creerPiece(l, this.variante));
          const n = document.createElement('span'); n.className = 'poche-nb'; n.textContent = compte[l];
          b.appendChild(n);
          const type = l.toLowerCase();
          if (this.selection && this.selection.pose === type && camp === this.camp) b.classList.add('choisie');
          b.addEventListener('click', () => {
            if (!this.actif || camp !== this.camp) return;
            const peut = this.legaux.some(m => m.toLowerCase().startsWith(type + '@'));
            if (!peut) return;
            this.selection = (this.selection && this.selection.pose === type) ? null : { pose: type };
            this._surligner(); this._poches();
          });
          el.appendChild(b);
        }
      }
    }

    // ---------- coups ----------
    autoriser(legaux, camp) {
      this.legaux = legaux || [];
      this.camp = camp;
      this.actif = true;
      this.selection = null;
      this._surligner();
    }
    bloquer() {
      this.actif = false;
      this.selection = null;
      this._annulerGlisse();
      this._surligner();
    }

    _ciblesSelection() {
      const s = this.selection;
      if (!s) return [];
      const out = new Set();
      for (const m of this.legaux) {
        const d = window.Regles.decouper(m);
        if (!d) continue;
        if (s.de && d.de === s.de) out.add(d.vers);
        if (s.pose && d.pose === s.pose) out.add(d.vers);
      }
      return [...out];
    }

    _coupsVers(vers) {
      const s = this.selection;
      return this.legaux.filter(m => {
        const d = window.Regles.decouper(m);
        if (!d || d.vers !== vers) return false;
        return s.de ? d.de === s.de : d.pose === s.pose;
      });
    }

    _estAMoi(nom) {
      const p = this._pieceEn(nom);
      if (!p) return false;
      const blanc = p.l === p.l.toUpperCase();
      return (blanc ? 'w' : 'b') === this.camp && this.legaux.some(m => m.startsWith(nom) && /^[a-l]\d+[a-l]/.test(m) && window.Regles.decouper(m).de === nom);
    }

    _appui(e) {
      if (e.button === 2) { this.effacerFleches(); return; }
      if (!this.actif) return;
      const nom = this._caseSous(e);
      if (!nom) return;
      // Coup vers une case cible ?
      if (this.selection && this._ciblesSelection().includes(nom) && !(this._estAMoi(nom) && !this._coupsVers(nom).length)) {
        this._tenter(nom);
        return;
      }
      if (this._estAMoi(nom)) {
        const dejaChoisie = this.selection && this.selection.de === nom;
        this.selection = { de: nom };
        if (!dejaChoisie && this.opts.surSelection) this.opts.surSelection(nom);
        this._surligner(); this._poches();
        this._commencerGlisse(nom, e, dejaChoisie);
        return;
      }
      this.selection = null;
      this._surligner(); this._poches();
    }

    _commencerGlisse(nom, e, dejaChoisie) {
      const el = this.piecesEl[nom];
      if (!el) return;
      this.glisse = { de: nom, el, x0: e.clientX, y0: e.clientY, bouge: false, dejaChoisie };
      e.preventDefault();
    }
    _bouge(e) {
      const g = this.glisse;
      if (!g) return;
      if (!g.bouge && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 4) return;
      g.bouge = true;
      const r = this.cadre.getBoundingClientRect();
      const t = this.tCase;
      g.el.classList.add('glissee');
      g.el.style.transition = 'none';
      g.el.style.transform = 'translate(' + (e.clientX - r.left - t / 2) + 'px,' + (e.clientY - r.top - t / 2) + 'px)';
      const sous = this._caseSous(e);
      for (const n in this.casesEl) this.casesEl[n].classList.toggle('survol', n === sous && this._ciblesSelection().includes(n));
    }
    _lache(e) {
      const g = this.glisse;
      if (!g) return;
      this.glisse = null;
      for (const n in this.casesEl) this.casesEl[n].classList.remove('survol');
      if (!g.bouge) {
        if (g.dejaChoisie) { this.selection = null; this._surligner(); }
        return;
      }
      const nom = this._caseSous(e);
      g.el.classList.remove('glissee');
      if (nom && nom !== g.de && this._ciblesSelection().includes(nom)) {
        this._tenter(nom, true);
      } else {
        this._placerPieces(false);
      }
    }
    _annulerGlisse() {
      if (this.glisse) { this.glisse.el.classList.remove('glissee'); this.glisse = null; this._placerPieces(false); }
    }

    _tenter(vers, glisse) {
      const coups = this._coupsVers(vers);
      if (!coups.length) return;
      const fini = (uci) => {
        this.selection = null;
        this._surligner(); this._poches();
        if (uci && this.opts.surCoup) this.opts.surCoup(uci, { glisse });
        else this._placerPieces(false);
      };
      if (coups.length === 1) return fini(coups[0]);
      // Plusieurs coups vers la même case : promotion (ou roque 960 particulier).
      this._choixPromotion(vers, coups, fini);
    }

    _choixPromotion(vers, coups, fini) {
      const fond = document.createElement('div');
      fond.className = 'promo-fond';
      const boite = document.createElement('div');
      boite.className = 'promo-boite';
      const titre = document.createElement('div'); titre.className = 'promo-titre'; titre.textContent = 'Promotion : choisis une pièce';
      boite.appendChild(titre);
      const rangee = document.createElement('div'); rangee.className = 'promo-rangee';
      const blanc = this.camp === 'w';
      for (const c of coups) {
        const d = window.Regles.decouper(c);
        const type = (d.promo || '').replace(/[^a-z]/gi, '') || null;
        const b = document.createElement('button');
        b.className = 'promo-choix';
        if (type) {
          const l = blanc ? type.toUpperCase() : type.toLowerCase();
          b.appendChild(window.Pieces.creerPiece(l, this.variante));
          const n = document.createElement('div'); n.className = 'promo-nom'; n.textContent = window.Pieces.infoPiece(l, this.variante).nom;
          b.appendChild(n);
        } else {
          b.textContent = 'Sans promotion';
        }
        b.addEventListener('click', () => { fond.remove(); fini(c); });
        rangee.appendChild(b);
      }
      boite.appendChild(rangee);
      const ann = document.createElement('button'); ann.className = 'bouton discret'; ann.textContent = 'Annuler';
      ann.addEventListener('click', () => { fond.remove(); fini(null); });
      boite.appendChild(ann);
      fond.appendChild(boite);
      this.racine.appendChild(fond);
    }

    // ---------- flèches ----------
    // liste de { de, vers, couleur } (de peut être null pour une pose : on entoure la case)
    flechesAfficher(liste) { this.fleches = liste || []; this._dessinerFleches(); }
    effacerFleches() { this.fleches = []; this._dessinerFleches(); }
    _dessinerFleches() {
      const svg = this.svg;
      const t = this.tCase || 50;
      svg.setAttribute('viewBox', '0 0 ' + (this.cols * t) + ' ' + (this.lignes * t));
      svg.innerHTML = '';
      const ns = 'http://www.w3.org/2000/svg';
      const centre = (nom) => { const c = this._coord(nom); const e = this._ecran(c.col, c.rang); return { x: (e.x + 0.5) * t, y: (e.y + 0.5) * t }; };
      for (const f of this.fleches) {
        const b = centre(f.vers);
        const coul = f.couleur || 'rgba(80,200,120,0.85)';
        if (!f.de || f.de === f.vers) {
          const c = document.createElementNS(ns, 'circle');
          c.setAttribute('cx', b.x); c.setAttribute('cy', b.y); c.setAttribute('r', t * 0.42);
          c.setAttribute('fill', 'none'); c.setAttribute('stroke', coul); c.setAttribute('stroke-width', t * 0.09);
          svg.appendChild(c);
          continue;
        }
        const a = centre(f.de);
        const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
        const ux = dx / L, uy = dy / L;
        const ep = t * 0.17, tete = t * 0.42, larg = t * 0.42;
        const sx = a.x + ux * t * 0.28, sy = a.y + uy * t * 0.28;
        const pointeX = b.x - ux * t * 0.12, pointeY = b.y - uy * t * 0.12;
        const base = { x: pointeX - ux * tete, y: pointeY - uy * tete };
        const corps = document.createElementNS(ns, 'line');
        corps.setAttribute('x1', sx); corps.setAttribute('y1', sy);
        corps.setAttribute('x2', base.x + ux * 2); corps.setAttribute('y2', base.y + uy * 2);
        corps.setAttribute('stroke', coul); corps.setAttribute('stroke-width', ep); corps.setAttribute('stroke-linecap', 'round');
        svg.appendChild(corps);
        const px = -uy, py = ux;
        const pointe = document.createElementNS(ns, 'polygon');
        const p1 = pointeX + ',' + pointeY;
        const p2 = (base.x + px * larg / 2) + ',' + (base.y + py * larg / 2);
        const p3 = (base.x - px * larg / 2) + ',' + (base.y - py * larg / 2);
        pointe.setAttribute('points', p1 + ' ' + p2 + ' ' + p3);
        pointe.setAttribute('fill', coul);
        svg.appendChild(pointe);
        if (f.etiquette) {
          const g = document.createElementNS(ns, 'g');
          const cx = base.x, cy = base.y;
          const rond = document.createElementNS(ns, 'circle');
          rond.setAttribute('cx', cx); rond.setAttribute('cy', cy); rond.setAttribute('r', Math.max(11, t * 0.2));
          rond.setAttribute('fill', coul); rond.setAttribute('stroke', '#111'); rond.setAttribute('stroke-width', 1.5);
          const tx = document.createElementNS(ns, 'text');
          tx.setAttribute('x', cx); tx.setAttribute('y', cy); tx.setAttribute('text-anchor', 'middle'); tx.setAttribute('dominant-baseline', 'central');
          tx.setAttribute('font-size', Math.max(16, t * 0.26)); tx.setAttribute('font-weight', '800'); tx.setAttribute('fill', '#111');
          tx.textContent = f.etiquette;
          g.append(rond, tx);
          svg.appendChild(g);
        }
      }
    }
  }

  window.Plateau = Plateau;
})();
