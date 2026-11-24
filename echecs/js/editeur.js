/* Éditeurs : configuration de partie (on choisit des cases, puis ce qu'on y met)
   et personnages (on clique les cases où il peut aller, et s'il saute ou non). */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const FICH = 'abcdefghijkl';

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
  function cleContenu(p) {
    if (!p) return '';
    return p.camp + ':' + (p.hasard != null ? 'h:' + (Array.isArray(p.hasard) ? p.hasard.slice().sort().join('|') : p.hasard) : 'p:' + p.perso);
  }
  function nomContenu(p) {
    if (p.hasard != null) {
      const l = window.Persos.pool(p.hasard).map((x) => x.nom);
      return '🎲 Au hasard (' + l.length + ' choix)';
    }
    const x = window.Persos.trouver(p.perso);
    return x ? x.nom : '?';
  }
  function dessinContenu(p) {
    if (p.hasard != null) {
      const d = el('div', 'piece de ' + (p.camp === 'b' ? 'noire' : 'blanche'));
      d.innerHTML = '<span>🎲</span>';
      return d;
    }
    const x = window.Persos.trouver(p.perso);
    return x ? window.Pieces.creerPerso(x, p.camp) : el('div', 'piece');
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
    sel: new Set(),        // cases choisies « r,c »
    camp: 'w',
    plateau: null,
    onglet: 'pieces',
    jetonEval: 0,
    dernierPool: ['cavalier', 'fou', 'tour', 'dame'],

    init() {
      this.plateau = new window.Plateau($('#plateau-config'), {});
      this.plateau.bloquer();
      const cadre = this.plateau.cadre;
      cadre.addEventListener('pointerdown', (e) => this._appui(e));
      cadre.addEventListener('pointermove', (e) => { if (e.buttons && this.glisse) this._etendre(e); });
      window.addEventListener('pointerup', () => { this.glisse = null; });
      document.querySelectorAll('#onglets-config button').forEach((b) => b.addEventListener('click', () => this.choisirOnglet(b.dataset.onglet)));
      document.querySelectorAll('#camp-config button').forEach((b) => b.addEventListener('click', () => { this.camp = b.dataset.camp; this.majEtape2(); }));
      $('#sel-blancs').addEventListener('click', () => this.choisirZone((r) => r < this.cfg.lignes / 2));
      $('#sel-noirs').addEventListener('click', () => this.choisirZone((r) => r >= this.cfg.lignes / 2));
      $('#sel-tout').addEventListener('click', () => this.choisirZone(() => true));
      $('#sel-aucune').addEventListener('click', () => { this.sel.clear(); this.change(true); });
      $('#act-hasard').addEventListener('click', () => this.choisirHasard());
      $('#act-melanger').addEventListener('click', () => this.appliquer('zone'));
      $('#act-trou').addEventListener('click', () => this.appliquer('trou'));
      $('#act-vider').addEventListener('click', () => this.appliquer('vider'));
      $('#cf-miroir').addEventListener('change', () => { this.cfg.miroir = $('#cf-miroir').checked; this.change(); });
      // plateau
      const pm = (id, delta, f) => $(id).addEventListener('click', () => f(delta));
      pm('#cols-moins', -1, (d) => this.changerTaille(this.cfg.cols + d, this.cfg.lignes));
      pm('#cols-plus', 1, (d) => this.changerTaille(this.cfg.cols + d, this.cfg.lignes));
      pm('#lignes-moins', -1, (d) => this.changerTaille(this.cfg.cols, this.cfg.lignes + d));
      pm('#lignes-plus', 1, (d) => this.changerTaille(this.cfg.cols, this.cfg.lignes + d));
      pm('#trous-moins', -1, (d) => { this.cfg.trousHasard = Math.max(0, (this.cfg.trousHasard || 0) + d); this.change(); });
      pm('#trous-plus', 1, (d) => { this.cfg.trousHasard = Math.min(16, (this.cfg.trousHasard || 0) + d); this.change(); });
      $('#cf-vider').addEventListener('click', () => { const c = this.cfg; c.pieces = window.Config.grille(c.lignes, c.cols, null); c.zones = window.Config.grille(c.lignes, c.cols, false); c.trous = window.Config.grille(c.lignes, c.cols, false); this.change(); });
      $('#cf-classique').addEventListener('click', () => this.positionClassique());
      // règles
      const ne = $('#cf-nb-echecs');
      for (let i = 1; i <= 9; i++) { const o = el('option', null, i); o.value = i; ne.appendChild(o); }
      for (const id of ['#cf-but', '#cf-nb-echecs', '#cf-pat', '#cf-renfort', '#cf-obligatoire', '#cf-roque', '#cf-double', '#cf-passant']) {
        $(id).addEventListener('change', () => this.lireRegles());
      }
      for (const id of ['#cf-av-min', '#cf-av-max']) $(id).addEventListener('change', () => this.lireAvantage());
      // enregistrer
      $('#cf-nom').addEventListener('input', () => { this.cfg.nom = $('#cf-nom').value.trim() || 'Sans nom'; window.Config.definirCourante(this.cfg); });
      $('#cf-enregistrer').addEventListener('click', () => this.enregistrer(false));
      $('#cf-enregistrer-nouv').addEventListener('click', () => this.enregistrer(true));
      $('#cf-copier').addEventListener('click', () => window.App.copier(this.code(), 'Code de la configuration copié.'));
      $('#cf-importer').addEventListener('click', () => this.importer());
      $('#cf-jouer').addEventListener('click', () => window.App.commencer());
    },

    ouvrir() {
      this.cfg = window.Config.courante();
      this.sel.clear();
      this.remplir();
      this.choisirOnglet(this.onglet);
      this.change(true);
      this.majAvantage();
    },

    choisirOnglet(o) {
      this.onglet = o;
      document.querySelectorAll('#onglets-config button').forEach((b) => b.classList.toggle('actif', b.dataset.onglet === o));
      document.querySelectorAll('.cf-onglet').forEach((d) => { d.style.display = d.dataset.onglet === o ? '' : 'none'; });
      if (o === 'enregistrer') this.listeEnregistrees();
      if (o === 'regles') this.promos();
      if (o === 'pieces') this.majEtape2();
    },

    remplir() {
      const c = this.cfg, R = c.regles;
      $('#cf-av-min').value = c.avMin; $('#cf-av-max').value = c.avMax;
      $('#cf-miroir').checked = c.miroir;
      $('#cf-but').value = R.but; $('#cf-nb-echecs').value = R.nbEchecs; $('#cf-pat').value = R.pat;
      $('#cf-renfort').checked = R.renfort; $('#cf-obligatoire').checked = R.obligatoire;
      $('#cf-roque').checked = R.roque; $('#cf-double').checked = R.double; $('#cf-passant').checked = R.passant;
      $('#cf-nom').value = c.nom;
    },

    // ---------- sélection des cases ----------
    _case(e) {
      const nom = this.plateau._caseSous(e);
      if (!nom) return null;
      const { col, rang } = this.plateau._coord(nom);
      return [rang, col];
    },
    _appui(e) {
      e.preventDefault();
      if (e.button === 2) { this.sel.clear(); this.change(true); return; }
      const c = this._case(e);
      if (!c) return;
      const cle = c[0] + ',' + c[1];
      this.glisse = { ancre: c, base: new Set(this.sel), ajouter: !this.sel.has(cle) };
      this._etendre(e);
    },
    _etendre(e) {
      const g = this.glisse;
      const c = this._case(e);
      if (!g || !c) return;
      const sel = new Set(g.base);
      const [r0, c0] = g.ancre;
      for (let r = Math.min(r0, c[0]); r <= Math.max(r0, c[0]); r++) {
        for (let x = Math.min(c0, c[1]); x <= Math.max(c0, c[1]); x++) {
          if (g.ajouter) sel.add(r + ',' + x); else sel.delete(r + ',' + x);
        }
      }
      this.sel = sel;
      this.change(true);
    },
    choisirZone(test) {
      this.sel.clear();
      for (let r = 0; r < this.cfg.lignes; r++) for (let c = 0; c < this.cfg.cols; c++) if (test(r, c)) this.sel.add(r + ',' + c);
      this.change(true);
    },
    choisirType(cle) {
      this.sel.clear();
      const cfg = this.cfg;
      for (let r = 0; r < cfg.lignes; r++) for (let c = 0; c < cfg.cols; c++) if (cleContenu(cfg.pieces[r][c]) === cle) this.sel.add(r + ',' + c);
      this.change(true);
    },

    // Applique une action aux cases choisies (et en face si « miroir »).
    appliquer(action, contenu) {
      const cfg = this.cfg;
      if (!this.sel.size) { window.App.bulle('Choisis d’abord des cases sur le plateau.'); return; }
      const cases = [...this.sel].map((k) => k.split(',').map(Number));
      let valZone = true;
      if (action === 'zone') valZone = !cases.every(([r, c]) => cfg.zones[r][c]);
      const faire = (r, c, autreCamp) => {
        if (action === 'perso') {
          cfg.trous[r][c] = false;
          cfg.pieces[r][c] = Object.assign({ camp: autreCamp ? (this.camp === 'w' ? 'b' : 'w') : this.camp }, contenu);
        } else if (action === 'trou') {
          cfg.trous[r][c] = true; cfg.pieces[r][c] = null; cfg.zones[r][c] = false;
        } else if (action === 'zone') {
          cfg.zones[r][c] = valZone; if (valZone) cfg.trous[r][c] = false;
        } else if (action === 'vider') {
          cfg.pieces[r][c] = null; cfg.trous[r][c] = false; cfg.zones[r][c] = false;
        }
      };
      for (const [r, c] of cases) {
        faire(r, c, false);
        const rm = cfg.lignes - 1 - r;
        if (cfg.miroir && rm !== r && !this.sel.has(rm + ',' + c)) faire(rm, c, true);
      }
      this.change();
    },

    choisirHasard() {
      if (!this.sel.size) { window.App.bulle('Choisis d’abord des cases sur le plateau.'); return; }
      const d = el('div');
      d.appendChild(el('h2', null, '🎲 Au hasard parmi…'));
      d.appendChild(el('p', null, 'Coche les personnages qui peuvent apparaître sur ces cases. À chaque partie, un d’eux est tiré au hasard pour chaque case.'));
      const boutons = el('div', 'ligne-boutons');
      const tout = el('button', 'bouton', 'Tout cocher'), rien = el('button', 'bouton', 'Tout décocher');
      boutons.append(tout, rien);
      d.appendChild(boutons);
      const cases = [];
      for (const cat of window.Persos.categories()) {
        const liste = window.Persos.tous().filter((p) => p.categorie === cat && p.id !== 'roi');
        if (!liste.length) continue;
        const titre = el('label', 'hasard-cat');
        const cbCat = document.createElement('input'); cbCat.type = 'checkbox';
        titre.append(cbCat, document.createTextNode(cat + ' (toute la catégorie)'));
        d.appendChild(titre);
        const grille = el('div', 'hasard-grille');
        const lesCb = [];
        for (const p of liste) {
          const lab = el('label', 'hasard-choix');
          const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = p.id;
          cb.checked = this.dernierPool.includes(p.id);
          const ic = window.Pieces.creerPerso(p, this.camp); ic.classList.add('icone');
          lab.append(cb, ic, document.createTextNode(p.nom));
          grille.appendChild(lab);
          lesCb.push(cb); cases.push(cb);
        }
        const majCat = () => { cbCat.checked = lesCb.every((x) => x.checked); };
        lesCb.forEach((x) => x.addEventListener('change', majCat));
        cbCat.addEventListener('change', () => { lesCb.forEach((x) => { x.checked = cbCat.checked; }); });
        majCat();
        d.appendChild(grille);
      }
      tout.addEventListener('click', () => { d.querySelectorAll('input').forEach((x) => { x.checked = true; }); });
      rien.addEventListener('click', () => { d.querySelectorAll('input').forEach((x) => { x.checked = false; }); });
      window.App.modale(d, [
        { texte: '🎲 Mettre sur les ' + this.sel.size + ' case' + (this.sel.size > 1 ? 's' : ''), classe: 'principal', action: () => {
          const ids = cases.filter((x) => x.checked).map((x) => x.value);
          if (!ids.length) { window.App.bulle('Coche au moins un personnage.'); return; }
          this.dernierPool = ids;
          this.appliquer('perso', { hasard: ids });
        } },
        { texte: 'Annuler' }
      ]);
    },

    // ---------- étape 2 : ce qu'on met ----------
    majEtape2() {
      document.querySelectorAll('#camp-config button').forEach((b) => b.classList.toggle('choisi', b.dataset.camp === this.camp));
      const box = $('#cf-persos');
      box.innerHTML = '';
      for (const cat of window.Persos.categories()) {
        box.appendChild(el('div', 'cf-cat', cat));
        const g = el('div', 'cf-grille-persos');
        for (const p of window.Persos.tous().filter((x) => x.categorie === cat)) {
          const b = el('button', 'cf-perso');
          const ic = window.Pieces.creerPerso(p, this.camp); ic.classList.add('icone');
          b.append(ic, el('span', null, p.nom));
          b.title = window.Persos.description(p);
          b.addEventListener('click', () => this.appliquer('perso', { perso: p.id }));
          g.appendChild(b);
        }
        box.appendChild(g);
      }
      const lien = el('button', 'bouton discret', '🧩 Créer un nouveau personnage…');
      lien.addEventListener('click', () => window.App.ecran('persos'));
      box.appendChild(lien);
    },

    majSelectionInfo() {
      const n = this.sel.size;
      $('#sel-nb').textContent = n ? n + ' case' + (n > 1 ? 's choisies' : ' choisie') + '.' : 'Aucune case choisie.';
      $('#etape2').classList.toggle('inactif', !n);
      // raccourcis « toutes les cases avec… »
      const box = $('#sel-types');
      box.innerHTML = '';
      const groupes = new Map();
      const cfg = this.cfg;
      for (let r = 0; r < cfg.lignes; r++) for (let c = 0; c < cfg.cols; c++) {
        const p = cfg.pieces[r][c];
        if (!p) continue;
        const cle = cleContenu(p);
        if (!groupes.has(cle)) groupes.set(cle, { p, n: 0 });
        groupes.get(cle).n++;
      }
      if (!groupes.size) return;
      box.appendChild(el('div', 'aide', 'Ou toutes les cases qui contiennent :'));
      const rangee = el('div', 'puces');
      for (const [cle, g] of groupes) {
        const b = el('button', 'puce puce-piece');
        const ic = dessinContenu(g.p); ic.classList.add('icone');
        b.append(ic, el('span', null, nomContenu(g.p) + ' ×' + g.n + (g.p.camp === 'w' ? ' (blancs)' : ' (noirs)')));
        b.addEventListener('click', () => this.choisirType(cle));
        rangee.appendChild(b);
      }
      box.appendChild(rangee);
    },

    // ---------- plateau ----------
    changerTaille(cols, lignes) {
      cols = Math.max(5, Math.min(12, cols)); lignes = Math.max(5, Math.min(10, lignes));
      const c = this.cfg;
      if (cols === c.cols && lignes === c.lignes) return;
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
      this.sel.clear();
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
      c.zones = window.Config.grille(c.lignes, c.cols, false);
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
      if (isNaN(a)) a = -0.5;
      if (isNaN(b)) b = 0.5;
      if (a > b) [a, b] = [b, a];
      this.cfg.avMin = a; this.cfg.avMax = b;
      $('#cf-av-min').value = a; $('#cf-av-max').value = b;
      this.change();
    },

    // Appelé après chaque modification (sansSauver = seule la sélection a changé).
    change(seulementSelection) {
      const cfg = this.cfg;
      if (!seulementSelection) window.Config.definirCourante(cfg);
      const { pos, zones } = positionAffichage(cfg);
      const selection = new Set([...this.sel].map((k) => { const [r, c] = k.split(',').map(Number); return FICH[c] + (r + 1); }));
      this.plateau.afficher(pos, { decor: { zones, selection } });
      this.redimensionner();
      this.majSelectionInfo();
      $('#cols-val').textContent = cfg.cols;
      $('#lignes-val').textContent = cfg.lignes;
      $('#trous-val').textContent = cfg.trousHasard || 0;
      $('#cf-nb-echecs-bloc').style.display = cfg.regles.but === 'echecs' ? '' : 'none';
      if (seulementSelection) return;
      clearTimeout(this.minuteur);
      this.minuteur = setTimeout(() => this.majAvantage(), 450);
    },

    async majAvantage() {
      const jet = ++this.jetonEval;
      const zone = $('#cf-avantage');
      const valeur = $('#cf-av-valeur');
      const err = window.Config.verifier(this.cfg);
      const barre = $('#cf-barre');
      $('#cf-jouer').disabled = !!err;
      if (err) {
        zone.className = 'cf-av-texte erreur';
        zone.textContent = '⚠ ' + err;
        valeur.textContent = '';
        barre.style.visibility = 'hidden';
        return;
      }
      if (window.Config.aleatoire(this.cfg)) {
        zone.className = 'cf-av-texte';
        zone.textContent = '🎲 Il y a du hasard : l’avantage changera à chaque partie, toujours entre les deux nombres ci-dessous.';
        valeur.textContent = 'entre ' + texteAvantage(this.cfg.avMin) + ' et ' + texteAvantage(this.cfg.avMax);
        barre.style.visibility = 'hidden';
        return;
      }
      zone.className = 'cf-av-texte';
      zone.textContent = 'Calcul en cours…';
      const v = window.Config.construire(this.cfg, window.Config.tirage(this.cfg));
      let av = null;
      try { av = await window.Config.evaluer(v, { profondeur: 16, temps: 1500 }); } catch (e) { av = null; }
      if (jet !== this.jetonEval) return;
      if (av == null) { zone.textContent = 'Avantage impossible à calculer.'; return; }
      valeur.textContent = texteAvantage(av);
      zone.textContent = av > 0.3 ? 'Les blancs commencent avec un avantage.' : av < -0.3 ? 'Les noirs commencent avec un avantage.' : 'La position de départ est équilibrée.';
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
      const charger = (cfg) => { this.cfg = window.Config.copie(cfg); this.sel.clear(); window.Config.definirCourante(this.cfg); this.remplir(); this.change(); this.listeEnregistrees(); window.App.bulle('Configuration « ' + cfg.nom + ' » chargée.'); };
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
      for (const c of window.Config.liste()) ligne(c, true);
    },

    code() {
      const cfg = window.Config.copie(this.cfg);
      const ids = new Set();
      for (const l of cfg.pieces) for (const p of l) {
        if (p && p.perso) ids.add(p.perso);
        if (p && Array.isArray(p.hasard)) p.hasard.forEach((x) => ids.add(x));
      }
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
        this.sel.clear();
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
      this.plateau.taille(Math.max(26, Math.min(100, t)));
    }
  };

  // =====================================================================
  //  PERSONNAGES
  // =====================================================================
  const FLECHES = { N: '⬆', NE: '⬈', E: '➡', SE: '⬊', S: '⬇', SO: '⬋', O: '⬅', NO: '⬉' };

  const P = {
    p: null,
    init() {
      $('#ps-nouveau').addEventListener('click', () => this.editer(null));
      $('#ps-nom').addEventListener('input', () => { this.p.nom = $('#ps-nom').value; });
      $('#ps-cat').addEventListener('change', () => {
        const v = $('#ps-cat').value;
        $('#ps-cat-nouvelle').style.display = v === '__nouvelle' ? '' : 'none';
        if (v !== '__nouvelle') this.p.categorie = v;
        else $('#ps-cat-nouvelle').focus();
      });
      $('#ps-cat-nouvelle').addEventListener('input', () => { this.p.categorie = $('#ps-cat-nouvelle').value; });
      $('#ps-marque').addEventListener('input', () => { this.p.marque = [...$('#ps-marque').value].slice(0, 2).join(''); this.apercu(); this.grille(); });
      document.querySelectorAll('#ps-saute button').forEach((b) => b.addEventListener('click', () => {
        if (this.p.classique) return;
        this.p.saute = b.dataset.val === '1';
        this.grille();
      }));
      $('#ps-copier').addEventListener('change', () => {
        const src = window.Persos.trouver($('#ps-copier').value);
        if (src) {
          this.p.cases = Object.assign({}, src.cases);
          this.p.lignes = Object.assign({}, src.lignes);
          this.p.saute = !!src.saute;
          this.grille();
        }
        $('#ps-copier').value = '';
      });
      $('#ps-effacer').addEventListener('click', () => { this.p.cases = {}; this.p.lignes = {}; this.grille(); });
      $('#ps-enregistrer').addEventListener('click', () => this.enregistrer());
      $('#ps-supprimer').addEventListener('click', () => this.supprimer());
      const bases = $('#ps-bases');
      for (const b of ['p', 'n', 'b', 'r', 'q', 'k']) {
        const bt = el('button', 'palette-piece');
        bt.dataset.base = b;
        const d = el('div', 'piece blanche'); d.style.backgroundImage = 'url("' + window.Pieces.image('w', b) + '")';
        bt.appendChild(d);
        bt.addEventListener('click', () => { if (this.p.classique) return; this.p.base = b; this.apercu(); this.grille(); });
        bases.appendChild(bt);
      }
    },

    ouvrir() {
      if (!this.p) this.editer(null);
      else { this.remplir(); this.liste(); }
    },

    liste() {
      const box = $('#ps-liste');
      box.innerHTML = '';
      for (const cat of window.Persos.categories()) {
        box.appendChild(el('h3', 'ps-cat-titre', cat));
        const grille = el('div', 'ps-grille-liste');
        for (const p of window.Persos.tous().filter((x) => x.categorie === cat)) {
          const carte = el('button', 'ps-carte' + (this.p && this.p.id === p.id ? ' choisie' : ''));
          const ic = window.Pieces.creerPerso(p, 'w'); ic.classList.add('icone-grande');
          carte.append(ic, el('b', null, p.nom));
          carte.addEventListener('click', () => this.editer(p));
          grille.appendChild(carte);
        }
        box.appendChild(grille);
      }
      if (!window.Persos.crees().length) box.appendChild(el('p', 'aide grande-aide', 'Tu n’as pas encore créé de personnage : clique « ✚ Nouveau personnage ».'));
    },

    editer(p) {
      if (p) this.p = JSON.parse(JSON.stringify(p));
      else this.p = { id: null, nom: '', categorie: 'Mes personnages', base: 'q', marque: '', cases: {}, lignes: {}, saute: false };
      this.remplir();
      this.liste();
    },

    remplir() {
      const p = this.p;
      const classique = !!p.classique;
      $('#ps-titre').textContent = p.id ? (classique ? p.nom + ' (pièce classique)' : 'Modifier « ' + p.nom + ' »') : 'Nouveau personnage';
      $('#ps-nom').value = p.nom;
      $('#ps-marque').value = p.marque || '';
      // catégories
      const sel = $('#ps-cat');
      sel.innerHTML = '';
      const cats = window.Persos.categories().filter((c) => c !== 'Classiques');
      if (!cats.includes(p.categorie) && p.categorie !== 'Classiques') cats.push(p.categorie);
      for (const c of cats) { const o = el('option', null, c); o.value = c; sel.appendChild(o); }
      const on = el('option', null, '➕ Nouvelle catégorie…'); on.value = '__nouvelle'; sel.appendChild(on);
      if (classique) { const oc = el('option', null, 'Classiques'); oc.value = 'Classiques'; sel.prepend(oc); }
      sel.value = p.categorie;
      $('#ps-cat-nouvelle').style.display = 'none';
      $('#ps-cat-nouvelle').value = '';
      for (const id of ['#ps-nom', '#ps-cat', '#ps-marque', '#ps-copier', '#ps-effacer', '#ps-enregistrer']) $(id).disabled = classique;
      $('#ps-supprimer').style.display = p.id && !classique ? '' : 'none';
      $('#ps-note-classique').style.display = classique ? '' : 'none';
      $('#ps-bloc-edition').classList.toggle('lecture', classique);
      const cp = $('#ps-copier');
      cp.innerHTML = '';
      const o0 = el('option', null, 'Copier les déplacements d’un autre personnage…'); o0.value = ''; cp.appendChild(o0);
      for (const x of window.Persos.tous()) { const o = el('option', null, x.nom); o.value = x.id; cp.appendChild(o); }
      this.apercu();
      this.grille();
    },

    apercu() {
      const p = this.p;
      document.querySelectorAll('#ps-bases button').forEach((b) => b.classList.toggle('choisie', b.dataset.base === p.base));
      const box = $('#ps-apercu');
      box.innerHTML = '';
      for (const camp of ['w', 'b']) { const d = window.Pieces.creerPerso(Object.assign({}, p), camp); d.classList.add('icone-grande'); box.appendChild(d); }
    },

    // Grille 9 × 9 : la pièce au milieu, les cases cliquables autour (3 cases de chaque côté),
    // et 8 flèches au bord pour « continue tout droit jusqu'au bout ».
    grille() {
      const p = this.p;
      p.cases = p.cases || {}; p.lignes = p.lignes || {};
      const box = $('#ps-grille');
      box.innerHTML = '';
      const classique = !!p.classique;
      const forces = new Set(classique ? [] : window.Persos.analyser(p).sautsForces);
      const dirDe = (dx, dy) => Object.keys(window.Persos.DIRS).find((k) => window.Persos.DIRS[k][0] === Math.sign(dx) && window.Persos.DIRS[k][1] === Math.sign(dy));
      const enLigne = (dx, dy) => (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) && p.lignes[dirDe(dx, dy)];
      for (let dy = 4; dy >= -4; dy--) {
        for (let dx = -4; dx <= 4; dx++) {
          const bord = Math.abs(dx) === 4 || Math.abs(dy) === 4;
          if (bord) {
            const estBout = (dx === 0 || Math.abs(dx) === 4) && (dy === 0 || Math.abs(dy) === 4);
            if (!estBout) { box.appendChild(el('div', 'ps-vide')); continue; }
            const k = dirDe(dx, dy);
            const b = el('button', 'ps-fleche' + (p.lignes[k] ? ' active' : ''), FLECHES[k]);
            b.title = 'Continue tout droit jusqu’au bout du plateau';
            if (!classique) b.addEventListener('click', () => { if (p.lignes[k]) delete p.lignes[k]; else p.lignes[k] = 1; this.grille(); });
            box.appendChild(b);
            continue;
          }
          const cle = dx + ',' + dy;
          const c = el('button', 'ps-case ' + ((dx + dy) % 2 === 0 ? 'foncee' : 'claire'));
          if (dx === 0 && dy === 0) {
            c.classList.add('centre');
            const d = window.Pieces.creerPerso(Object.assign({}, p), 'w'); d.classList.add('icone');
            c.appendChild(d);
            c.disabled = true;
          } else {
            if (p.cases[cle]) { c.classList.add('oui'); c.textContent = forces.has(cle) ? '⚠' : '●'; }
            else if (enLigne(dx, dy)) { c.classList.add('ligne'); c.textContent = '•'; }
            if (!classique) c.addEventListener('click', () => { if (p.cases[cle]) delete p.cases[cle]; else p.cases[cle] = 1; this.grille(); });
          }
          box.appendChild(c);
        }
      }
      document.querySelectorAll('#ps-saute button').forEach((b) => b.classList.toggle('choisi', (b.dataset.val === '1') === !!p.saute));
      $('#ps-desc').textContent = window.Persos.description(Object.assign({}, p, { classique: false }));
      if (classique) $('#ps-desc').textContent = p.desc;
    },

    enregistrer() {
      const p = this.p;
      if (p.classique) return;
      p.nom = (p.nom || '').trim();
      p.categorie = (p.categorie || '').trim();
      if (!p.categorie || p.categorie === '__nouvelle') p.categorie = 'Mes personnages';
      if (!p.nom) { window.App.bulle('Donne un nom au personnage.'); $('#ps-nom').focus(); return; }
      if (!window.Persos.betza(p)) { window.App.bulle('Clique au moins une case où il peut aller.'); return; }
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
