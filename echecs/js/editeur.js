/* Éditeurs : configuration de partie (on choisit un outil, puis on clique ou glisse sur le plateau)
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
  // Position au format du plateau à partir d'une configuration (affichage seulement).
  function positionAffichage(cfg) {
    const cases = [];
    const trous = new Set(), zones = { w: new Set(), b: new Set() };
    for (let r = cfg.lignes - 1; r >= 0; r--) {
      const l = [];
      for (let c = 0; c < cfg.cols; c++) {
        const p = cfg.pieces[r][c];
        const nom = FICH[c] + (r + 1);
        if (cfg.trous[r][c]) trous.add(nom);
        const z = window.Config.zoneDe(cfg, r, c);
        if (z) zones[z].add(nom);
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
  //  On choisit un outil (un personnage, le hasard, un trou, la gomme, une zone),
  //  puis on clique ou on glisse sur le plateau. Clic droit = effacer.
  //  Chaque changement est enregistré tout de suite dans « Mes configurations ».
  // =====================================================================
  const PAR_PAGE = 8;
  const C = {
    cfg: null,
    camp: 'w',
    plateau: null,
    onglet: 'pieces',
    catActive: null,
    jetonEval: 0,
    dernierPool: [],
    outil: null,          // { type: 'perso', perso } | { type: 'hasard', ids } | { type: 'trou' } | { type: 'gomme' } | { type: 'zone', camp }
    peint: null,          // glissement en cours
    pageListe: 0,

    init() {
      this.plateau = new window.Plateau($('#plateau-config'), {});
      this.plateau.bloquer();
      const cadre = this.plateau.cadre;
      cadre.addEventListener('pointerdown', (e) => this._appui(e));
      cadre.addEventListener('pointermove', (e) => { if (this.peint && e.buttons) { const c = this._case(e); if (c) this._peindre(c); } });
      window.addEventListener('pointerup', () => { if (this.peint) { this.peint = null; this.change(); } });
      document.querySelectorAll('#acc-config .pli').forEach((s) => s.querySelector('.pli-titre').addEventListener('click', () => this.choisirOnglet(s.dataset.pli)));
      // mes configurations
      $('#cf-nouvelle').addEventListener('click', () => { this.editer(this.nouvelleVide()); this.choisirOnglet('pieces'); window.App.bulle('Nouvelle configuration : plateau vide.'); });
      $('#cf-dupliquer').addEventListener('click', () => {
        const c = window.Config.copie(this.cfg);
        c.id = window.Config.nouveauId(); c.nom = (this.cfg.nom + ' (copie)').slice(0, 40);
        window.Config.enregistrer(c);
        this.editer(c);
        window.App.bulle('Copie créée : « ' + c.nom + ' ».');
      });
      $('#cf-supprimer').addEventListener('click', () => {
        const cfg = this.cfg;
        window.App.modale('<h2>Supprimer « ' + cfg.nom.replace(/</g, '') + ' » ?</h2><p>Elle sera effacée pour de bon.</p>', [
          { texte: 'Supprimer', classe: 'danger', action: () => {
            window.Config.supprimer(cfg.id);
            const l = window.Config.liste();
            this.editer(l.length ? l[0] : this.nouvelleVide());
          } }, { texte: 'Annuler' }
        ]);
      });
      $('#cf-nom').addEventListener('input', () => {
        this.cfg.nom = $('#cf-nom').value.trim() || 'Sans nom';
        this.sauver();
        $('#cf-titre').textContent = this.cfg.nom;
        this.listeConfigs();
      });
      $('#cf-copier').addEventListener('click', () => window.App.copier(this.code(), 'Code de la configuration copié.'));
      $('#cf-importer').addEventListener('click', () => this.importer());
      // pièces
      document.querySelectorAll('#camp-config button').forEach((b) => b.addEventListener('click', () => { this.camp = b.dataset.camp; this.majEtape2(); }));
      $('#cf-miroir').addEventListener('change', () => { this.cfg.miroir = $('#cf-miroir').checked; this.change(); });
      $('#outil-hasard').addEventListener('click', () => this.choisirHasard());
      $('#outil-trou').addEventListener('click', () => this.choisirOutil({ type: 'trou' }));
      $('#outil-gomme').addEventListener('click', () => this.choisirOutil({ type: 'gomme' }));
      // zones de départ
      $('#zd-blanche').addEventListener('click', () => this.choisirOutil({ type: 'zone', camp: 'w' }));
      $('#zd-noire').addEventListener('click', () => this.choisirOutil({ type: 'zone', camp: 'b' }));
      $('#zd-enlever').addEventListener('click', () => this.choisirOutil({ type: 'zone', camp: false }));
      $('#zd-tout').addEventListener('click', () => { this.cfg.zones = window.Config.grille(this.cfg.lignes, this.cfg.cols, false); this.change(); });
      $('#zd-fond').addEventListener('click', () => this.zonesToutes(1));
      $('#zd-deux').addEventListener('click', () => this.zonesToutes(2));
      $('#zd-moitie').addEventListener('click', () => this.zonesToutes(Math.floor(this.cfg.lignes / 2)));
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
      $('#cf-jouer').addEventListener('click', () => window.App.jouerAvec(this.cfg.id));
    },

    // La configuration modifiée est toujours une configuration enregistrée.
    choisirDepart() {
      const l = window.Config.liste();
      const c = window.Config.courante();
      const deja = l.find((x) => x.id === c.id);
      if (deja) return window.Config.copie(deja);
      // ancienne configuration en cours, jamais enregistrée : on la garde si elle a été changée
      const cl = window.Config.classique();
      const sans = (x) => JSON.stringify(Object.assign({}, x, { id: '', nom: '' }));
      if (c.pieces && sans(c) !== sans(cl)) {
        c.id = window.Config.nouveauId();
        if (!c.nom || c.nom === 'Classique') c.nom = this.nomLibre();
        window.Config.enregistrer(c);
        return c;
      }
      return l.length ? window.Config.copie(l[0]) : this.nouvelleVide();
    },
    nomLibre() {
      const noms = new Set(window.Config.liste().map((x) => x.nom));
      let i = 1;
      while (noms.has('Configuration ' + i)) i++;
      return 'Configuration ' + i;
    },
    nouvelleVide() {
      const c = window.Config.vide(8, 8);
      c.id = window.Config.nouveauId();
      c.nom = this.nomLibre();
      window.Config.enregistrer(c);
      return c;
    },
    sauver() {
      window.Config.definirCourante(this.cfg);
      window.Config.mettreAJour(this.cfg);
    },

    ouvrir() {
      this.cfg = this.choisirDepart();
      window.Config.definirCourante(this.cfg);
      this.remplir();
      this.choisirOnglet(this.onglet);
      this.change(true);
      this.majAvantage();
    },
    editer(cfg) {
      this.cfg = window.Config.copie(cfg);
      window.Config.definirCourante(this.cfg);
      this.pageListe = 0;
      this.remplir();
      this.listeConfigs();
      this.promos();
      this.change(true);
      this.majAvantage();
    },

    // Une seule partie dépliée à la fois : tout tient sur l'écran.
    choisirOnglet(o) {
      this.onglet = o;
      document.querySelectorAll('#acc-config .pli').forEach((s) => s.classList.toggle('ouvert', s.dataset.pli === o));
      // les outils de zone ne servent que dans « Départ au hasard », et inversement
      const zone = this.outil && this.outil.type === 'zone';
      if ((o === 'depart' && this.outil && !zone) || (o !== 'depart' && zone)) this.outil = null;
      if (o === 'mes') this.listeConfigs();
      if (o === 'regles') this.promos();
      if (o === 'pieces') this.majEtape2();
      this.majOutil();
    },

    remplir() {
      const c = this.cfg, R = c.regles;
      $('#cf-titre').textContent = c.nom;
      $('#cf-av-min').value = c.avMin; $('#cf-av-max').value = c.avMax;
      $('#cf-miroir').checked = !!c.miroir;
      $('#cf-but').value = R.but; $('#cf-nb-echecs').value = R.nbEchecs; $('#cf-pat').value = R.pat;
      $('#cf-renfort').checked = R.renfort; $('#cf-obligatoire').checked = R.obligatoire;
      $('#cf-roque').checked = R.roque; $('#cf-double').checked = R.double; $('#cf-passant').checked = R.passant;
      $('#cf-nom').value = c.nom;
    },

    // Liste des configurations enregistrées (par pages : rien ne défile).
    listeConfigs() {
      const box = $('#cf-liste');
      box.innerHTML = '';
      const l = window.Config.liste();
      const pages = Math.max(1, Math.ceil(l.length / PAR_PAGE));
      this.pageListe = Math.min(this.pageListe, pages - 1);
      for (const c of l.slice(this.pageListe * PAR_PAGE, (this.pageListe + 1) * PAR_PAGE)) {
        const b = el('button', 'puce-config' + (c.id === this.cfg.id ? ' choisie' : ''), c.nom);
        b.title = c.nom;
        b.addEventListener('click', () => { if (c.id !== this.cfg.id) this.editer(c); });
        box.appendChild(b);
      }
      if (pages > 1) box.appendChild(pagination(this.pageListe, pages, (p) => { this.pageListe = p; this.listeConfigs(); }));
    },

    // ---------- outils ----------
    choisirOutil(o) {
      this.outil = o;
      this.majOutil();
      if (o && o.type === 'perso') this.majEtape2();
    },
    majOutil() {
      const o = this.outil;
      document.querySelectorAll('#cf-persos .cf-perso').forEach((b) => b.classList.toggle('choisi', !!(o && o.type === 'perso' && b.dataset.perso === o.perso)));
      $('#outil-hasard').classList.toggle('choisi', !!(o && o.type === 'hasard'));
      $('#outil-trou').classList.toggle('choisi', !!(o && o.type === 'trou'));
      $('#outil-gomme').classList.toggle('choisi', !!(o && o.type === 'gomme'));
      $('#zd-blanche').classList.toggle('choisi', !!(o && o.type === 'zone' && o.camp === 'w'));
      $('#zd-noire').classList.toggle('choisi', !!(o && o.type === 'zone' && o.camp === 'b'));
      $('#zd-enlever').classList.toggle('choisi', !!(o && o.type === 'zone' && !o.camp));
      const t = $('#outil-actuel');
      t.innerHTML = '';
      if (!o || o.type === 'zone') t.append(el('span', 'aide', 'Choisis ce que tu veux poser, puis clique ou glisse sur le plateau. Clic droit : effacer.'));
      else {
        t.append(el('b', null, 'Sur le plateau : '));
        if (o.type === 'perso') {
          const p = window.Persos.trouver(o.perso);
          if (p) { const ic = window.Pieces.creerPerso(p, this.camp); ic.classList.add('icone'); t.append(ic, el('span', null, p.nom + (this.camp === 'w' ? ' (blancs)' : ' (noirs)'))); }
        } else if (o.type === 'hasard') t.append(el('span', null, '🎲 au hasard parmi ' + o.ids.length + ' personnage' + (o.ids.length > 1 ? 's' : '') + ' (' + (this.camp === 'w' ? 'blancs' : 'noirs') + ')'));
        else if (o.type === 'trou') t.append(el('span', null, '⬛ des trous (cases supprimées)'));
        else t.append(el('span', null, '✖ la gomme'));
      }
      const z = $('#outil-zone');
      z.textContent = o && o.type === 'zone'
        ? (o.camp ? 'Clique ou glisse sur le plateau pour peindre la zone des ' + (o.camp === 'w' ? 'blancs.' : 'noirs.') : 'Clique ou glisse sur le plateau pour enlever des zones.')
        : 'Choisis une zone, puis clique ou glisse sur le plateau.';
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
      const zone = this.onglet === 'depart';
      let o;
      if (e.button === 2) o = zone ? { type: 'zone', camp: false } : { type: 'gomme' };
      else if (e.button === 0) {
        if (!this.outil) {
          window.App.bulle(zone ? 'Choisis d’abord une zone (blancs ou noirs).' : 'Choisis d’abord ce que tu veux poser : un personnage, 🎲, ⬛ ou ✖.');
          return;
        }
        o = this.outil;
        // cliquer une case qui contient déjà exactement ça : on l'enlève
        if (this._deja(c, o)) o = o.type === 'zone' ? { type: 'zone', camp: false } : { type: 'gomme' };
      } else return;
      this.peint = { outil: o, faites: new Set() };
      if (o.type === 'perso' || o.type === 'hasard') window.Son.pose(); else window.Son.clic();
      this._peindre(c);
    },
    _deja([r, c], o) {
      const cfg = this.cfg, p = cfg.pieces[r][c];
      if (o.type === 'perso') return !!(p && p.hasard == null && p.perso === o.perso && p.camp === this.camp);
      if (o.type === 'hasard') return !!(p && p.hasard != null && p.camp === this.camp && cleContenu(p) === cleContenu({ camp: this.camp, hasard: o.ids }));
      if (o.type === 'trou') return !!cfg.trous[r][c];
      if (o.type === 'zone') return !!o.camp && window.Config.zoneDe(cfg, r, c) === o.camp;
      return false;
    },
    _peindre([r, c]) {
      const P = this.peint;
      const cle = r + ',' + c;
      if (P.faites.has(cle)) return;
      P.faites.add(cle);
      const cfg = this.cfg;
      const pop = [];
      if (this._poser(r, c, P.outil, false)) pop.push(FICH[c] + (r + 1));
      const rm = cfg.lignes - 1 - r;
      if (cfg.miroir && rm !== r && this._poser(rm, c, P.outil, true)) pop.push(FICH[c] + (rm + 1));
      this.pop = pop;
      this.afficher();
    },
    // Pose l'outil sur une case ; renvoie vrai si un personnage y a été posé.
    _poser(r, c, o, enFace) {
      const cfg = this.cfg;
      const autre = (x) => (x === 'w' ? 'b' : 'w');
      const camp = enFace ? autre(this.camp) : this.camp;
      if (o.type === 'perso' || o.type === 'hasard') {
        cfg.trous[r][c] = false;
        cfg.pieces[r][c] = o.type === 'perso' ? { camp, perso: o.perso } : { camp, hasard: o.ids.slice() };
        return true;
      }
      if (o.type === 'trou') { cfg.trous[r][c] = true; cfg.pieces[r][c] = null; cfg.zones[r][c] = false; }
      else if (o.type === 'gomme') { cfg.pieces[r][c] = null; cfg.trous[r][c] = false; }
      else if (o.type === 'zone') {
        const z = o.camp ? (enFace ? autre(o.camp) : o.camp) : false;
        cfg.zones[r][c] = z;
        if (z) cfg.trous[r][c] = false;
      }
      return false;
    },

    // Zones prêtes : les n premières rangées de chaque camp.
    zonesToutes(n) {
      const cfg = this.cfg;
      cfg.zones = window.Config.grille(cfg.lignes, cfg.cols, false);
      for (let r = 0; r < n; r++) for (let c = 0; c < cfg.cols; c++) {
        if (!cfg.trous[r][c]) cfg.zones[r][c] = 'w';
        if (!cfg.trous[cfg.lignes - 1 - r][c]) cfg.zones[cfg.lignes - 1 - r][c] = 'b';
      }
      this.change();
      window.App.bulle(n === 1 ? 'Les pièces de la rangée du fond changeront de place à chaque partie.' : 'Les pièces de ces rangées changeront de place à chaque partie.');
    },

    choisirHasard() {
      const d = el('div');
      d.appendChild(el('h2', null, '🎲 Au hasard parmi…'));
      d.appendChild(el('p', null, 'Coche les personnages qui peuvent apparaître. À chaque partie, un d’eux est tiré au hasard pour chaque case où tu poses 🎲.'));
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
        { texte: '🎲 Poser ce hasard sur le plateau', classe: 'principal', action: () => {
          const ids = cases.filter((x) => x.checked).map((x) => x.value);
          if (!ids.length) { window.App.bulle('Coche au moins un personnage.'); return; }
          this.dernierPool = ids;
          this.choisirOutil({ type: 'hasard', ids });
          window.App.bulle('Clique ou glisse sur le plateau pour poser 🎲.');
        } },
        { texte: 'Annuler' }
      ]);
    },

    // Personnages à poser : une catégorie affichée à la fois (les tiennes d'abord).
    majEtape2() {
      document.querySelectorAll('#camp-config button').forEach((b) => b.classList.toggle('choisi', b.dataset.camp === this.camp));
      const cats = window.Persos.categories();
      const miennes = cats.filter((c) => c !== 'Classiques');
      if (!cats.includes(this.catActive)) this.catActive = miennes.length ? miennes[0] : cats[0];
      const barre = $('#cf-cats');
      barre.innerHTML = '';
      for (const cat of miennes.concat(cats.includes('Classiques') ? ['Classiques'] : [])) {
        const b = el('button', 'puce' + (cat === this.catActive ? ' choisie' : ''), cat);
        b.addEventListener('click', () => { this.catActive = cat; this.majEtape2(); });
        barre.appendChild(b);
      }
      const box = $('#cf-persos');
      box.innerHTML = '';
      for (const p of window.Persos.tous().filter((x) => x.categorie === this.catActive)) {
        const b = el('button', 'cf-perso');
        b.dataset.perso = p.id;
        const ic = window.Pieces.creerPerso(p, this.camp); ic.classList.add('icone');
        b.append(ic, el('span', null, p.nom));
        b.title = window.Persos.description(p);
        b.addEventListener('click', () => this.choisirOutil({ type: 'perso', perso: p.id }));
        box.appendChild(b);
      }
      if (!miennes.length) box.appendChild(el('p', 'aide', 'Tu n’as pas encore créé de personnage : « 🧩 Personnages » en haut.'));
      this.majOutil();
    },

    majZones() {
      const cfg = this.cfg;
      const t = { w: [0, 0], b: [0, 0] };
      for (let r = 0; r < cfg.lignes; r++) for (let c = 0; c < cfg.cols; c++) {
        const z = window.Config.zoneDe(cfg, r, c);
        if (!z || cfg.trous[r][c]) continue;
        t[z][0]++;
        const p = cfg.pieces[r][c];
        if (p && p.camp === z) t[z][1]++;
      }
      const adj = { w: 'blanche', b: 'noire' };
      const ligne = (z, nom) => t[z][0]
        ? 'Zone des ' + nom + ' : ' + t[z][0] + ' case' + (t[z][0] > 1 ? 's' : '') + ', ' + t[z][1] + ' pièce' + (t[z][1] > 1 ? 's ' : ' ') + adj[z] + (t[z][1] > 1 ? 's' : '') + ' dedans.'
        : 'Pas de zone pour les ' + nom + ' : leurs pièces restent à leur place.';
      $('#zd-resume').innerHTML = '';
      $('#zd-resume').append(el('div', 'zd-w', ligne('w', 'blancs')), el('div', 'zd-b', ligne('b', 'noirs')));
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

    afficher() {
      const { pos, zones } = positionAffichage(this.cfg);
      this.plateau.afficher(pos, { decor: { zones }, pop: this.pop });
      this.pop = null;
      this.redimensionner();
    },

    // Appelé après chaque modification (seulementAffichage = rien n'a changé dans la configuration).
    change(seulementAffichage) {
      const cfg = this.cfg;
      if (!seulementAffichage) this.sauver();
      this.afficher();
      this.majZones();
      $('#cols-val').textContent = cfg.cols;
      $('#lignes-val').textContent = cfg.lignes;
      $('#trous-val').textContent = cfg.trousHasard || 0;
      $('#cf-nb-echecs-bloc').style.display = cfg.regles.but === 'echecs' ? '' : 'none';
      if (seulementAffichage) return;
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
        zone.textContent = '(change à chaque partie)';
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
        window.Config.enregistrer(d.cfg);
        this.editer(d.cfg);
        $('#cf-code').value = '';
        window.App.bulle('Configuration « ' + d.cfg.nom + ' » importée.');
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

  // Boutons ◀ 2 / 3 ▶ pour une liste découpée en pages.
  function pagination(page, pages, aller) {
    const d = el('div', 'pagination');
    const g = el('button', 'bouton', '◀'), dr = el('button', 'bouton', '▶');
    g.disabled = page <= 0; dr.disabled = page >= pages - 1;
    g.addEventListener('click', () => aller(page - 1));
    dr.addEventListener('click', () => aller(page + 1));
    d.append(g, el('span', null, (page + 1) + ' / ' + pages), dr);
    return d;
  }

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
      $('#ps-marque').addEventListener('input', () => { this.p.marque = [...$('#ps-marque').value].slice(0, 4).join(''); this.apercu(); this.grille(); });
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

    // Liste des personnages : une catégorie dépliée à la fois.
    liste() {
      const box = $('#ps-liste');
      box.innerHTML = '';
      const cats = window.Persos.categories();
      if (!this.catOuverte || !cats.includes(this.catOuverte)) this.catOuverte = (this.p && cats.includes(this.p.categorie)) ? this.p.categorie : cats[cats.length - 1];
      for (const cat of cats) {
        const persos = window.Persos.tous().filter((x) => x.categorie === cat);
        const pli = el('section', 'pli' + (cat === this.catOuverte ? ' ouvert' : ''));
        const t = el('button', 'pli-titre', cat + ' (' + persos.length + ')');
        t.addEventListener('click', () => { this.catOuverte = cat; this.liste(); });
        const corps = el('div', 'pli-corps ps-liste-corps');
        for (const p of persos) {
          const carte = el('button', 'ps-carte' + (this.p && this.p.id === p.id ? ' choisie' : ''));
          const ic = window.Pieces.creerPerso(p, 'w'); ic.classList.add('icone');
          carte.append(ic, el('span', null, p.nom));
          carte.addEventListener('click', () => this.editer(p));
          corps.appendChild(carte);
        }
        pli.append(t, corps);
        box.appendChild(pli);
      }
    },

    editer(p) {
      if (p) { this.p = JSON.parse(JSON.stringify(p)); this.catOuverte = p.categorie; }
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

    // Grille 15 × 15 : la pièce au milieu, 7 cases de chaque côté, et 8 flèches tout autour
    // pour « continue tout droit jusqu'au bout ». Les cases en biais trop lointaines sont grisées
    // (le moteur ne sait pas jouer ces sauts).
    grille() {
      const p = this.p;
      p.cases = p.cases || {}; p.lignes = p.lignes || {};
      const box = $('#ps-grille');
      box.innerHTML = '';
      const classique = !!p.classique;
      const R = window.Persos.PORTEE, B = R + 1;
      const avertis = classique ? {} : window.Persos.analyser(p).avertis;
      const D = window.Persos.DIRS;
      const dirDe = (dx, dy) => Object.keys(D).find((k) => D[k][0] === Math.sign(dx) && D[k][1] === Math.sign(dy));
      const enLigne = (dx, dy) => (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) && p.lignes[dirDe(dx, dy)];
      const SIGNES = { saute: '⚠', bloque: '⚠', ignore: '✖' };
      box.style.gridTemplateColumns = 'repeat(' + (2 * B + 1) + ', var(--ps-case))';
      box.style.gridTemplateRows = 'repeat(' + (2 * B + 1) + ', var(--ps-case))';
      for (let dy = B; dy >= -B; dy--) {
        for (let dx = -B; dx <= B; dx++) {
          if (Math.abs(dx) === B || Math.abs(dy) === B) {
            const bout = (dx === 0 || Math.abs(dx) === B) && (dy === 0 || Math.abs(dy) === B);
            if (!bout) { box.appendChild(el('div', 'ps-vide')); continue; }
            const k = dirDe(dx, dy);
            const b = el('button', 'ps-fleche' + (p.lignes[k] ? ' active' : ''), FLECHES[k]);
            b.title = 'Continue tout droit jusqu’au bout du plateau';
            if (!classique) b.addEventListener('click', () => { if (p.lignes[k]) delete p.lignes[k]; else p.lignes[k] = 1; window.Son.clic(); this.grille(); });
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
          } else if (!window.Persos.caseJouable(dx, dy)) {
            c.classList.add('grisee');
            c.disabled = true;
            c.title = 'Trop loin en biais : impossible pour le moteur';
          } else {
            if (p.cases[cle]) {
              c.classList.add('oui');
              if (avertis[cle]) { c.classList.add('av-' + avertis[cle]); c.textContent = SIGNES[avertis[cle]]; }
            } else if (enLigne(dx, dy)) c.classList.add('ligne');
            if (!classique) c.addEventListener('click', () => { if (p.cases[cle]) delete p.cases[cle]; else p.cases[cle] = 1; window.Son.clic(); this.grille(); });
          }
          box.appendChild(c);
        }
      }
      document.querySelectorAll('#ps-saute button').forEach((b) => b.classList.toggle('choisi', (b.dataset.val === '1') === !!p.saute));
      $('#ps-desc').textContent = classique ? p.desc : window.Persos.description(Object.assign({}, p, { classique: false }));
      this.redimensionner();
    },

    redimensionner() {
      const zone = $('.ps-centre');
      if (!zone || !zone.offsetParent) return;
      const r = zone.getBoundingClientRect();
      const titre = zone.querySelector('.ps-centre-titre').getBoundingClientRect().height;
      const n = 2 * (window.Persos.PORTEE + 1) + 1;
      const t = Math.floor(Math.min(r.width - 8, r.height - titre - 16) / n);
      $('#ps-grille').style.setProperty('--ps-case', Math.max(16, Math.min(48, t)) + 'px');
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
      if (!p.marque) p.marque = [...p.nom].slice(0, 2).join('');
      window.Persos.enregistrer(p);
      this.catOuverte = p.categorie;
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
  window.Editeur = { positionAffichage, texteAvantage, pagination };
})();
