/* Éditeurs : configuration de partie (plateau, placements, hasard, règles, enregistrement)
   et personnages (création, catégories, mouvements, apparence, tirage au hasard). */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const FICH = 'abcdefghijkl';
  const CLASSIQUES_IDS = ['pion', 'cavalier', 'fou', 'tour', 'dame', 'roi'];

  function el(tag, cls, texte) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texte != null) e.textContent = texte;
    return e;
  }
  function texteAvantage(v) {
    if (v == null) return '…';
    if (Math.abs(v) >= 99) return v > 0 ? 'mat pour les blancs' : 'mat pour les noirs';
    const s = Math.abs(v).toFixed(1).replace('.', ',');
    return (v > 0.04 ? '+' : v < -0.04 ? '−' : '') + s;
  }
  function libelleContenu(c) {
    if (!c) return 'Vide';
    if (c.hasard != null) return '🎲 Au hasard' + (c.hasard ? ' : ' + c.hasard : ' (tous)');
    const p = window.Persos.trouver(c.perso);
    return p ? p.nom : '?';
  }
  // Remplit un <select> avec : personnages par catégorie, hasard, vide.
  function remplirChoixContenu(sel, avecVide) {
    sel.innerHTML = '';
    if (avecVide) { const o = el('option', null, '— Vide —'); o.value = 'vide'; sel.appendChild(o); }
    const gh = document.createElement('optgroup'); gh.label = 'Au hasard';
    const oh = el('option', null, '🎲 Au hasard parmi tous les tirables'); oh.value = 'h:'; gh.appendChild(oh);
    for (const cat of window.Persos.categories()) {
      if (!window.Persos.pool(cat).length) continue;
      const o = el('option', null, '🎲 Au hasard : ' + cat); o.value = 'h:' + cat; gh.appendChild(o);
    }
    for (const cat of window.Persos.categories()) {
      const g = document.createElement('optgroup'); g.label = cat;
      for (const p of window.Persos.tous().filter((x) => x.categorie === cat)) {
        const o = el('option', null, p.nom); o.value = 'p:' + p.id; g.appendChild(o);
      }
      sel.appendChild(g);
    }
    sel.appendChild(gh);
  }
  function contenuDepuisValeur(v) {
    if (v === 'vide') return null;
    if (v.startsWith('h:')) return { hasard: v.slice(2) };
    return { perso: v.slice(2) };
  }
  function valeurDeContenu(c) {
    if (!c) return 'vide';
    return c.hasard != null ? 'h:' + c.hasard : 'p:' + c.perso;
  }

  // Position au format du plateau à partir d'une configuration (affichage seulement).
  function positionAffichage(cfg) {
    const cases = [];
    const trous = new Set(), zones = new Set();
    for (let r = cfg.lignes - 1; r >= 0; r--) {
      const l = [];
      for (let c = 0; c < cfg.cols; c++) {
        const p = cfg.pieces[r][c];
        const nom = FICH[c] + (r + 1);
        if (cfg.trous[r][c]) trous.add(nom);
        if (cfg.zones[r][c]) zones.add(nom);
        if (!p) { l.push(null); continue; }
        if (p.hasard != null) l.push({ hasard: p.hasard, camp: p.camp });
        else {
          const perso = window.Persos.trouver(p.perso);
          l.push(perso ? { perso, camp: p.camp } : null);
        }
      }
      cases.push(l);
    }
    return { pos: { cols: cfg.cols, lignes: cfg.lignes, cases, poches: null, trous }, zones };
  }

  // =====================================================================
  //  CONFIGURATION DE PARTIE
  // =====================================================================
  const C = {
    cfg: null,
    outil: 'perso',
    camp: 'w',
    contenu: { perso: 'cavalier' },
    plateau: null,
    onglet: 'placement',
    jetonEval: 0,

    init() {
      this.plateau = new window.Plateau($('#plateau-config'), {});
      this.plateau.bloquer();
      const cadre = this.plateau.cadre;
      cadre.addEventListener('pointerdown', (e) => this._clic(e, false));
      cadre.addEventListener('pointermove', (e) => { if (e.buttons && this.peinture) this._clic(e, true); });
      window.addEventListener('pointerup', () => { this.peinture = null; });
      document.querySelectorAll('#onglets-config button').forEach((b) => b.addEventListener('click', () => this.choisirOnglet(b.dataset.onglet)));
      document.querySelectorAll('#outils-config button').forEach((b) => b.addEventListener('click', () => { this.outil = b.dataset.outil; this.majOutils(); }));
      document.querySelectorAll('#camp-config button').forEach((b) => b.addEventListener('click', () => { this.camp = b.dataset.camp; this.majOutils(); this.palette(); }));
      for (const [id, min, max] of [['#cf-cols', 5, 12], ['#cf-lignes', 5, 10]]) {
        const s = $(id);
        for (let i = min; i <= max; i++) { const o = el('option', null, i); o.value = i; s.appendChild(o); }
        s.addEventListener('change', () => this.changerTaille(+$('#cf-cols').value, +$('#cf-lignes').value));
      }
      const th = $('#cf-trous-hasard');
      for (let i = 0; i <= 16; i++) { const o = el('option', null, i); o.value = i; th.appendChild(o); }
      th.addEventListener('change', () => { this.cfg.trousHasard = +th.value; this.change(); });
      const ne = $('#cf-nb-echecs');
      for (let i = 1; i <= 9; i++) { const o = el('option', null, i); o.value = i; ne.appendChild(o); }
      for (const id of ['#cf-but', '#cf-nb-echecs', '#cf-pat', '#cf-renfort', '#cf-obligatoire', '#cf-roque', '#cf-double', '#cf-passant']) {
        $(id).addEventListener('change', () => this.lireRegles());
      }
      for (const id of ['#cf-av-min', '#cf-av-max']) $(id).addEventListener('change', () => this.lireAvantage());
      $('#cf-miroir').addEventListener('change', () => { this.cfg.miroir = $('#cf-miroir').checked; this.change(); });
      $('#cf-vider').addEventListener('click', () => { this.cfg.pieces = window.Config.grille(this.cfg.lignes, this.cfg.cols, null); this.change(); });
      $('#cf-classique').addEventListener('click', () => this.positionClassique());
      $('#cf-nom').addEventListener('input', () => { this.cfg.nom = $('#cf-nom').value.trim() || 'Sans nom'; window.Config.definirCourante(this.cfg); });
      $('#cf-enregistrer').addEventListener('click', () => this.enregistrer(false));
      $('#cf-enregistrer-nouv').addEventListener('click', () => this.enregistrer(true));
      $('#cf-copier').addEventListener('click', () => window.App.copier(this.code(), 'Code de la configuration copié.'));
      $('#cf-importer').addEventListener('click', () => this.importer());
      $('#cf-jouer').addEventListener('click', () => window.App.commencer());
    },

    ouvrir() {
      this.cfg = window.Config.courante();
      this.remplir();
      this.choisirOnglet(this.onglet);
      this.change(true);
    },

    choisirOnglet(o) {
      this.onglet = o;
      document.querySelectorAll('#onglets-config button').forEach((b) => b.classList.toggle('actif', b.dataset.onglet === o));
      document.querySelectorAll('.cf-onglet').forEach((d) => { d.style.display = d.dataset.onglet === o ? '' : 'none'; });
      if (o === 'emplacements') this.emplacements();
      if (o === 'enregistrer') this.listeEnregistrees();
      if (o === 'placement') this.palette();
      if (o === 'regles') this.promos();
    },

    remplir() {
      const c = this.cfg, R = c.regles;
      $('#cf-av-min').value = c.avMin; $('#cf-av-max').value = c.avMax;
      $('#cf-miroir').checked = c.miroir;
      $('#cf-cols').value = c.cols; $('#cf-lignes').value = c.lignes;
      $('#cf-trous-hasard').value = c.trousHasard || 0;
      $('#cf-but').value = R.but; $('#cf-nb-echecs').value = R.nbEchecs; $('#cf-pat').value = R.pat;
      $('#cf-renfort').checked = R.renfort; $('#cf-obligatoire').checked = R.obligatoire;
      $('#cf-roque').checked = R.roque; $('#cf-double').checked = R.double; $('#cf-passant').checked = R.passant;
      $('#cf-nom').value = c.nom;
      this.majOutils();
    },

    majOutils() {
      document.querySelectorAll('#outils-config button').forEach((b) => b.classList.toggle('choisi', b.dataset.outil === this.outil));
      document.querySelectorAll('#camp-config button').forEach((b) => b.classList.toggle('choisi', b.dataset.camp === this.camp));
      $('#cf-palette-bloc').style.display = this.outil === 'perso' ? '' : 'none';
      const aides = {
        perso: 'Clique (ou glisse) sur des cases pour poser le personnage choisi. Clic droit : effacer.',
        trou: 'Clique des cases pour en faire des trous (ou les reboucher). Les pièces ne peuvent ni s’y arrêter ni glisser à travers.',
        zone: 'Les pièces posées dans une zone (hachurée) sont mélangées au hasard sur les cases de la zone, dans la moitié de leur camp.',
        gomme: 'Clique des cases pour enlever ce qui s’y trouve.'
      };
      $('#cf-aide-outil').textContent = aides[this.outil];
    },

    palette() {
      const box = $('#cf-palette');
      box.innerHTML = '';
      const ajouter = (contenu, element, titre) => {
        const b = el('button', 'palette-piece');
        b.title = titre;
        b.appendChild(element);
        if (valeurDeContenu(contenu) === valeurDeContenu(this.contenu)) b.classList.add('choisie');
        b.addEventListener('click', () => { this.contenu = contenu; this.outil = 'perso'; this.majOutils(); this.palette(); this.legendeContenu(); });
        return b;
      };
      for (const cat of window.Persos.categories()) {
        const t = el('div', 'palette-cat', cat);
        box.appendChild(t);
        const r = el('div', 'palette-rangee');
        for (const p of window.Persos.tous().filter((x) => x.categorie === cat)) {
          r.appendChild(ajouter({ perso: p.id }, window.Pieces.creerPerso(p, this.camp), p.nom));
        }
        box.appendChild(r);
      }
      box.appendChild(el('div', 'palette-cat', 'Au hasard (parmi les personnages « tirables »)'));
      const rh = el('div', 'palette-rangee');
      const de = (cat) => {
        const d = el('div', 'piece de ' + (this.camp === 'b' ? 'noire' : 'blanche'));
        d.innerHTML = '<span>🎲</span>';
        if (cat) { const s = el('small', null, cat); d.appendChild(s); }
        return d;
      };
      rh.appendChild(ajouter({ hasard: '' }, de(''), 'Au hasard parmi tous'));
      for (const cat of window.Persos.categories()) {
        if (window.Persos.pool(cat).length) rh.appendChild(ajouter({ hasard: cat }, de(cat), 'Au hasard : ' + cat));
      }
      box.appendChild(rh);
      this.legendeContenu();
    },

    legendeContenu() {
      const c = this.contenu;
      let t = libelleContenu(c);
      if (c.perso) { const p = window.Persos.trouver(c.perso); if (p) t += ' : ' + window.Persos.description(p); }
      else t += ' : ' + window.Persos.pool(c.hasard).map((p) => p.nom).join(', ');
      $('#cf-legende').textContent = t;
    },

    _clic(e, glisse) {
      const nom = this.plateau._caseSous(e);
      if (!nom) return;
      const { col, rang } = this.plateau._coord(nom);
      const cfg = this.cfg;
      const outil = e.button === 2 ? 'gomme' : this.outil;
      if (!glisse) {
        e.preventDefault();
        // valeur appliquée pendant tout le glissé
        if (outil === 'trou') this.peinture = { outil, val: !cfg.trous[rang][col] };
        else if (outil === 'zone') this.peinture = { outil, val: !cfg.zones[rang][col] };
        else this.peinture = { outil };
      }
      const pt = this.peinture || { outil };
      const appliquer = (r, c, miroirCamp) => {
        if (pt.outil === 'perso') {
          cfg.trous[r][c] = false;
          cfg.pieces[r][c] = Object.assign({ camp: miroirCamp || this.camp }, this.contenu);
        } else if (pt.outil === 'trou') {
          cfg.trous[r][c] = pt.val;
          if (pt.val) { cfg.pieces[r][c] = null; cfg.zones[r][c] = false; }
        } else if (pt.outil === 'zone') {
          cfg.zones[r][c] = pt.val;
          if (pt.val) cfg.trous[r][c] = false;
        } else {
          cfg.pieces[r][c] = null; cfg.trous[r][c] = false;
        }
      };
      appliquer(rang, col);
      const rm = cfg.lignes - 1 - rang;
      if (cfg.miroir && rm !== rang) appliquer(rm, col, this.camp === 'w' ? 'b' : 'w');
      this.change();
    },

    changerTaille(cols, lignes) {
      const c = this.cfg;
      const ajuster = (g, vide) => {
        const n = [];
        for (let r = 0; r < lignes; r++) {
          const l = [];
          for (let x = 0; x < cols; x++) {
            let src;
            if (r < lignes / 2) src = g[r] ? g[r][x] : vide;
            else { const rs = c.lignes - (lignes - r); src = rs >= 0 && g[rs] ? g[rs][x] : vide; }
            l.push(src === undefined ? vide : src);
          }
          n.push(l);
        }
        return n;
      };
      c.pieces = ajuster(c.pieces, null);
      c.trous = ajuster(c.trous, false);
      c.zones = ajuster(c.zones, false);
      c.cols = cols; c.lignes = lignes;
      this.change();
    },

    positionClassique() {
      const c = this.cfg;
      const rangees = {
        5: ['tour', 'cavalier', 'roi', 'fou', 'tour'], 6: ['tour', 'cavalier', 'dame', 'roi', 'fou', 'tour'],
        7: ['tour', 'cavalier', 'fou', 'roi', 'fou', 'cavalier', 'tour'], 8: ['tour', 'cavalier', 'fou', 'dame', 'roi', 'fou', 'cavalier', 'tour'],
        9: ['tour', 'cavalier', 'fou', 'dame', 'roi', 'dame', 'fou', 'cavalier', 'tour'],
        10: ['tour', 'cavalier', 'fou', 'fou', 'dame', 'roi', 'fou', 'fou', 'cavalier', 'tour'],
        11: ['tour', 'cavalier', 'cavalier', 'fou', 'dame', 'roi', 'dame', 'fou', 'cavalier', 'cavalier', 'tour'],
        12: ['tour', 'tour', 'cavalier', 'fou', 'fou', 'dame', 'roi', 'fou', 'fou', 'cavalier', 'tour', 'tour']
      };
      const rang = rangees[c.cols];
      c.pieces = window.Config.grille(c.lignes, c.cols, null);
      for (let x = 0; x < c.cols; x++) {
        c.pieces[0][x] = { camp: 'w', perso: rang[x] };
        c.pieces[1][x] = { camp: 'w', perso: 'pion' };
        c.pieces[c.lignes - 2][x] = { camp: 'b', perso: 'pion' };
        c.pieces[c.lignes - 1][x] = { camp: 'b', perso: rang[x] };
        for (const r of [0, 1, c.lignes - 2, c.lignes - 1]) c.trous[r][x] = false;
      }
      this.change();
    },

    lireRegles() {
      const R = this.cfg.regles;
      R.but = $('#cf-but').value; R.nbEchecs = +$('#cf-nb-echecs').value; R.pat = $('#cf-pat').value;
      R.renfort = $('#cf-renfort').checked; R.obligatoire = $('#cf-obligatoire').checked;
      R.roque = $('#cf-roque').checked; R.double = $('#cf-double').checked; R.passant = $('#cf-passant').checked;
      this.change();
    },

    promos() {
      const box = $('#cf-promos');
      box.innerHTML = '';
      for (const p of window.Persos.tous()) {
        if (p.id === 'roi' || p.id === 'pion') continue;
        const lab = el('label', 'promo-case');
        const cb = document.createElement('input'); cb.type = 'checkbox';
        cb.checked = this.cfg.regles.promos.includes(p.id);
        cb.addEventListener('change', () => {
          const l = this.cfg.regles.promos.filter((x) => x !== p.id);
          if (cb.checked) l.push(p.id);
          this.cfg.regles.promos = l;
          this.change();
        });
        const ic = window.Pieces.creerPerso(p, 'w'); ic.classList.add('icone');
        lab.append(cb, ic, document.createTextNode(p.nom));
        box.appendChild(lab);
      }
    },

    lireAvantage() {
      let a = parseFloat(String($('#cf-av-min').value).replace(',', '.'));
      let b = parseFloat(String($('#cf-av-max').value).replace(',', '.'));
      if (isNaN(a)) a = -0.5; if (isNaN(b)) b = 0.5;
      if (a > b) [a, b] = [b, a];
      this.cfg.avMin = a; this.cfg.avMax = b;
      $('#cf-av-min').value = a; $('#cf-av-max').value = b;
      this.change();
    },

    emplacements() {
      const box = $('#cf-emplacements');
      box.innerHTML = '';
      const groupes = new Map();
      const cfg = this.cfg;
      for (let r = 0; r < cfg.lignes; r++) for (let c = 0; c < cfg.cols; c++) {
        const p = cfg.pieces[r][c];
        if (!p) continue;
        const cle = valeurDeContenu(p);
        if (!groupes.has(cle)) groupes.set(cle, { contenu: p, w: 0, b: 0 });
        groupes.get(cle)[p.camp]++;
      }
      if (!groupes.size) { box.appendChild(el('p', 'aide', 'Aucun personnage sur le plateau.')); return; }
      for (const [cle, g] of groupes) {
        const ligne = el('div', 'emplacement');
        let dessin;
        if (g.contenu.hasard != null) { dessin = el('div', 'piece de blanche icone'); dessin.innerHTML = '<span>🎲</span>'; }
        else { const p = window.Persos.trouver(g.contenu.perso); dessin = p ? window.Pieces.creerPerso(p, 'w') : el('div', 'piece'); dessin.classList.add('icone'); }
        const t = el('div', 'emp-texte');
        t.appendChild(el('b', null, libelleContenu(g.contenu)));
        t.appendChild(el('span', null, (g.w ? g.w + ' chez les blancs' : '') + (g.w && g.b ? ', ' : '') + (g.b ? g.b + ' chez les noirs' : '')));
        const sel = document.createElement('select');
        remplirChoixContenu(sel, true);
        sel.value = cle;
        sel.addEventListener('change', () => {
          const nouveau = contenuDepuisValeur(sel.value);
          for (let r = 0; r < cfg.lignes; r++) for (let c = 0; c < cfg.cols; c++) {
            const p = cfg.pieces[r][c];
            if (p && valeurDeContenu(p) === cle) cfg.pieces[r][c] = nouveau ? Object.assign({ camp: p.camp }, nouveau) : null;
          }
          this.change();
          this.emplacements();
        });
        ligne.append(dessin, t, sel);
        box.appendChild(ligne);
      }
    },

    // Appelé après chaque modification.
    change(sansSauver) {
      if (!sansSauver) window.Config.definirCourante(this.cfg);
      const { pos, zones } = positionAffichage(this.cfg);
      this.plateau.afficher(pos, { decor: { zones } });
      this.redimensionner();
      $('#cf-nb-echecs-bloc').style.display = this.cfg.regles.but === 'echecs' ? '' : 'none';
      if (this.onglet === 'emplacements') this.emplacements();
      clearTimeout(this.minuteur);
      this.minuteur = setTimeout(() => this.majAvantage(), 450);
    },

    async majAvantage() {
      const jet = ++this.jetonEval;
      const zone = $('#cf-avantage');
      const err = window.Config.verifier(this.cfg);
      const barre = $('#cf-barre');
      if (err) {
        zone.className = 'cf-avantage erreur';
        zone.textContent = '⚠ ' + err;
        barre.style.visibility = 'hidden';
        $('#cf-jouer').disabled = true;
        return;
      }
      $('#cf-jouer').disabled = false;
      if (window.Config.aleatoire(this.cfg)) {
        zone.className = 'cf-avantage';
        zone.textContent = '🎲 Il y a du hasard : à chaque partie, un tirage est choisi pour que l’avantage des blancs soit entre ' +
          texteAvantage(this.cfg.avMin) + ' et ' + texteAvantage(this.cfg.avMax) + '.';
        barre.style.visibility = 'hidden';
        return;
      }
      zone.className = 'cf-avantage';
      zone.textContent = 'Calcul de l’avantage des blancs…';
      const v = window.Config.construire(this.cfg, window.Config.tirage(this.cfg));
      let av = null;
      try { av = await window.Config.evaluer(v, { profondeur: 16, temps: 1500 }); } catch (e) { av = null; }
      if (jet !== this.jetonEval) return;
      if (av == null) { zone.textContent = 'Avantage impossible à calculer.'; return; }
      zone.textContent = 'Avantage des blancs (le joueur 1) au départ : ' + texteAvantage(av);
      barre.style.visibility = '';
      window.App.majBarre(barre, { cp: Math.round(av * 100) }, false, true);
    },

    // ---------- enregistrement ----------
    enregistrer(nouvelle) {
      const cfg = this.cfg;
      const nom = $('#cf-nom').value.trim();
      if (!nom) { window.App.bulle('Donne un nom à la configuration.'); $('#cf-nom').focus(); return; }
      cfg.nom = nom;
      const existe = window.Config.liste().some((x) => x.id === cfg.id);
      if (nouvelle || !existe || cfg.id === 'classique') cfg.id = window.Config.nouveauId();
      window.Config.enregistrer(cfg);
      window.Config.definirCourante(cfg);
      this.listeEnregistrees();
      window.App.bulle('Configuration « ' + nom + ' » enregistrée.');
    },

    listeEnregistrees() {
      const box = $('#cf-liste');
      box.innerHTML = '';
      const l = window.Config.liste();
      const charger = (cfg) => { this.cfg = window.Config.copie(cfg); window.Config.definirCourante(this.cfg); this.remplir(); this.change(); this.listeEnregistrees(); window.App.bulle('Configuration « ' + cfg.nom + ' » chargée.'); };
      const ligne = (cfg, suppr) => {
        const d = el('div', 'cf-ligne' + (cfg.id === this.cfg.id ? ' choisie' : ''));
        d.appendChild(el('b', null, cfg.nom));
        const b = el('button', 'bouton', 'Charger'); b.addEventListener('click', () => charger(cfg)); d.appendChild(b);
        if (suppr) {
          const s = el('button', 'bouton danger', '🗑'); s.title = 'Supprimer';
          s.addEventListener('click', () => window.App.modale('<h2>Supprimer « ' + cfg.nom.replace(/</g, '') + ' » ?</h2>', [
            { texte: 'Supprimer', classe: 'danger', action: () => { window.Config.supprimer(cfg.id); this.listeEnregistrees(); } }, { texte: 'Annuler' }
          ]));
          d.appendChild(s);
        }
        box.appendChild(d);
      };
      ligne(window.Config.classique(), false);
      for (const c of l) ligne(c, true);
    },

    code() {
      const cfg = window.Config.copie(this.cfg);
      const ids = new Set();
      for (const l of cfg.pieces) for (const p of l) if (p && p.perso) ids.add(p.perso);
      for (const id of cfg.regles.promos) ids.add(id);
      const persos = [...ids].map((id) => window.Persos.trouver(id)).filter((p) => p && !p.classique);
      return 'JULCFG1:' + btoa(unescape(encodeURIComponent(JSON.stringify({ cfg, persos }))));
    },

    importer() {
      const t = $('#cf-code').value.trim();
      try {
        if (!t.startsWith('JULCFG1:')) throw new Error();
        const d = JSON.parse(decodeURIComponent(escape(atob(t.slice(8)))));
        if (!d.cfg || !d.cfg.pieces) throw new Error();
        for (const p of d.persos || []) if (!window.Persos.trouver(p.id)) window.Persos.enregistrer(p);
        d.cfg.id = window.Config.nouveauId();
        this.cfg = d.cfg;
        window.Config.definirCourante(this.cfg);
        this.remplir(); this.change();
        window.App.bulle('Configuration importée (pense à l’enregistrer).');
      } catch (e) { window.App.bulle('Code illisible.'); }
    },

    redimensionner() {
      const zone = $('#plateau-config');
      if (!zone || !zone.offsetParent) return;
      const parent = zone.parentElement.getBoundingClientRect();
      const t = Math.floor(Math.min((parent.width - 16) / this.cfg.cols, (parent.height - 16) / this.cfg.lignes));
      this.plateau.taille(Math.max(26, Math.min(90, t)));
    }
  };

  // =====================================================================
  //  PERSONNAGES
  // =====================================================================
  const ETATS = ['', 'mc', 'm', 'c'];
  const SYMB = { mc: '●', m: '○', c: '✕' };
  const FLECHES = { NO: '↖', N: '↑', NE: '↗', O: '←', E: '→', SO: '↙', S: '↓', SE: '↘' };

  const P = {
    p: null,
    init() {
      $('#ps-nouveau').addEventListener('click', () => this.editer(null));
      $('#ps-nom').addEventListener('input', () => { this.p.nom = $('#ps-nom').value; });
      $('#ps-cat').addEventListener('input', () => { this.p.categorie = $('#ps-cat').value; });
      $('#ps-marque').addEventListener('input', () => { this.p.marque = [...$('#ps-marque').value].slice(0, 2).join(''); this.apercu(); });
      $('#ps-tirable').addEventListener('change', () => { this.p.tirable = $('#ps-tirable').checked; });
      $('#ps-portee').addEventListener('change', () => { this.p.portee = +$('#ps-portee').value; this.grille(); });
      $('#ps-copier').addEventListener('change', () => {
        const src = window.Persos.trouver($('#ps-copier').value);
        if (src) { this.p.sauts = Object.assign({}, src.sauts); this.p.glisses = Object.assign({}, src.glisses); this.p.portee = src.portee || 0; $('#ps-portee').value = this.p.portee; this.grille(); }
        $('#ps-copier').value = '';
      });
      $('#ps-effacer').addEventListener('click', () => { this.p.sauts = {}; this.p.glisses = {}; this.grille(); });
      $('#ps-enregistrer').addEventListener('click', () => this.enregistrer());
      $('#ps-supprimer').addEventListener('click', () => this.supprimer());
      const sel = $('#ps-portee');
      const o0 = el('option', null, 'illimitée'); o0.value = 0; sel.appendChild(o0);
      for (let i = 1; i <= 7; i++) { const o = el('option', null, i + ' case' + (i > 1 ? 's' : '')); o.value = i; sel.appendChild(o); }
      const bases = $('#ps-bases');
      for (const b of ['p', 'n', 'b', 'r', 'q', 'k']) {
        const bt = el('button', 'palette-piece');
        bt.dataset.base = b;
        const d = el('div', 'piece blanche'); d.style.backgroundImage = 'url("' + window.Pieces.image('w', b) + '")';
        bt.appendChild(d);
        bt.addEventListener('click', () => { this.p.base = b; this.apercu(); });
        bases.appendChild(bt);
      }
    },

    ouvrir() {
      this.liste();
      if (!this.p) this.editer(null);
      else this.remplir();
    },

    liste() {
      const box = $('#ps-liste');
      box.innerHTML = '';
      for (const cat of window.Persos.categories()) {
        box.appendChild(el('h3', 'ps-cat-titre', cat));
        const grille = el('div', 'ps-grille');
        for (const p of window.Persos.tous().filter((x) => x.categorie === cat)) {
          const carte = el('div', 'ps-carte' + (this.p && this.p.id === p.id ? ' choisie' : ''));
          const ic = window.Pieces.creerPerso(p, 'w'); ic.classList.add('icone-grande');
          const t = el('div', 'ps-carte-texte');
          t.appendChild(el('b', null, p.nom));
          t.appendChild(el('span', null, p.tirable ? '🎲 tirable au hasard' : (p.id === 'roi' ? 'pièce royale' : 'pas tirée au hasard')));
          carte.append(ic, t);
          carte.addEventListener('click', () => this.editer(p));
          grille.appendChild(carte);
        }
        box.appendChild(grille);
      }
      const dl = $('#ps-cats');
      dl.innerHTML = '';
      for (const c of window.Persos.categories()) { const o = document.createElement('option'); o.value = c; dl.appendChild(o); }
    },

    editer(p) {
      if (p) this.p = JSON.parse(JSON.stringify(p));
      else this.p = { id: null, nom: '', categorie: 'Mes personnages', base: 'q', marque: '', tirable: true, sauts: {}, glisses: {}, portee: 0 };
      this.remplir();
      this.liste();
    },

    remplir() {
      const p = this.p;
      const classique = !!p.classique;
      $('#ps-titre').textContent = p.id ? (classique ? p.nom + ' (classique)' : 'Modifier « ' + p.nom + ' »') : 'Nouveau personnage';
      $('#ps-nom').value = p.nom; $('#ps-cat').value = p.categorie; $('#ps-marque').value = p.marque || '';
      $('#ps-tirable').checked = !!p.tirable;
      $('#ps-tirable').disabled = p.id === 'roi';
      $('#ps-portee').value = p.portee || 0;
      for (const id of ['#ps-nom', '#ps-cat', '#ps-marque', '#ps-portee', '#ps-copier', '#ps-effacer']) $(id).disabled = classique;
      $('#ps-bases').style.pointerEvents = classique ? 'none' : '';
      $('#ps-supprimer').style.display = p.id && !classique ? '' : 'none';
      $('#ps-note-classique').style.display = classique ? '' : 'none';
      const cp = $('#ps-copier');
      cp.innerHTML = '';
      const o0 = el('option', null, 'Copier les mouvements de…'); o0.value = ''; cp.appendChild(o0);
      for (const x of window.Persos.tous()) { const o = el('option', null, x.nom); o.value = x.id; cp.appendChild(o); }
      this.apercu();
      this.grille();
    },

    apercu() {
      const p = this.p;
      document.querySelectorAll('#ps-bases button').forEach((b) => b.classList.toggle('choisie', b.dataset.base === p.base));
      const box = $('#ps-apercu');
      box.innerHTML = '';
      const tmp = Object.assign({}, p, { classique: p.classique });
      for (const camp of ['w', 'b']) { const d = window.Pieces.creerPerso(tmp, camp); d.classList.add('icone-grande'); box.appendChild(d); }
    },

    grille() {
      const p = this.p;
      const box = $('#ps-grille');
      box.innerHTML = '';
      const classique = !!p.classique;
      // cases atteintes par les glissades (pour l'aperçu)
      const glisse = {};
      for (const k in p.glisses) {
        const mode = p.glisses[k];
        if (!mode) continue;
        const [dx, dy] = window.Persos.DIRS[k];
        for (let i = 1; i <= 3; i++) {
          if (p.portee && i > p.portee) break;
          glisse[(dx * i) + ',' + (dy * i)] = mode;
        }
      }
      for (let dy = 3; dy >= -3; dy--) {
        for (let dx = -3; dx <= 3; dx++) {
          const cle = dx + ',' + dy;
          const c = el('button', 'ps-case ' + ((dx + dy) % 2 === 0 ? 'foncee' : 'claire'));
          if (dx === 0 && dy === 0) {
            c.classList.add('centre');
            const d = window.Pieces.creerPerso(Object.assign({}, p), 'w'); d.classList.add('icone');
            c.appendChild(d);
            c.disabled = true;
          } else {
            const m = p.sauts[cle];
            if (m) { c.classList.add('saut', 'mode-' + m); c.textContent = SYMB[m]; }
            else if (glisse[cle]) { c.classList.add('glisse', 'mode-' + glisse[cle]); c.textContent = '·'; }
            if (!classique) c.addEventListener('click', () => {
              const i = ETATS.indexOf(p.sauts[cle] || '');
              const n = ETATS[(i + 1) % ETATS.length];
              if (n) p.sauts[cle] = n; else delete p.sauts[cle];
              this.grille();
            });
          }
          box.appendChild(c);
        }
      }
      // boussole des glissades
      const bous = $('#ps-boussole');
      bous.innerHTML = '';
      for (const k of ['NO', 'N', 'NE', 'O', null, 'E', 'SO', 'S', 'SE']) {
        if (!k) { bous.appendChild(el('div', 'ps-centre-boussole', 'glisse')); continue; }
        const m = p.glisses[k] || '';
        const b = el('button', 'ps-dir' + (m ? ' mode-' + m : ''), FLECHES[k] + (m ? ' ' + SYMB[m] : ''));
        if (!classique) b.addEventListener('click', () => {
          const i = ETATS.indexOf(m);
          const n = ETATS[(i + 1) % ETATS.length];
          if (n) p.glisses[k] = n; else delete p.glisses[k];
          this.grille();
        });
        bous.appendChild(b);
      }
      $('#ps-desc').textContent = window.Persos.description(Object.assign({}, p, { classique: false }));
    },

    enregistrer() {
      const p = this.p;
      if (p.classique) { window.Persos.enregistrer(p); this.liste(); window.App.bulle('Enregistré.'); return; }
      p.nom = (p.nom || '').trim();
      p.categorie = (p.categorie || '').trim() || 'Mes personnages';
      if (!p.nom) { window.App.bulle('Donne un nom au personnage.'); $('#ps-nom').focus(); return; }
      if (!window.Persos.betza(p)) { window.App.bulle('Ce personnage n’a aucun déplacement : clique des cases ou des flèches.'); return; }
      if (!p.id) p.id = window.Persos.nouveauId();
      if (!p.marque) p.marque = [...p.nom][0].toUpperCase();
      window.Persos.enregistrer(p);
      this.remplir();
      this.liste();
      window.App.bulle('Personnage « ' + p.nom + ' » enregistré.');
    },

    supprimer() {
      const p = this.p;
      if (!p.id || p.classique) return;
      window.App.modale('<h2>Supprimer « ' + p.nom.replace(/</g, '') + ' » ?</h2><p>Les configurations qui l’utilisent devront être modifiées.</p>', [
        { texte: 'Supprimer', classe: 'danger', action: () => { window.Persos.supprimer(p.id); this.editer(null); } },
        { texte: 'Annuler' }
      ]);
    }
  };

  window.EditeurConfig = C;
  window.EditeurPersos = P;
  window.Editeur = { positionAffichage, texteAvantage };
})();
