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
        const z = cfg.hasardOu === 'zones' && cfg.zonesH ? cfg.zonesH[r][c] : null;
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
  //  CONFIGURATION DE PARTIE (début de partie)
  //  On choisit ce qu'on pose (un personnage, 🎲 aléatoire, un trou, la gomme),
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
    outil: null,          // { type: 'perso', perso } | { type: 'hasard' } | { type: 'trou' } | { type: 'gomme' }
    peint: null,          // glissement en cours
    pageListe: 0,

    init() {
      this.plateau = new window.Plateau($('#plateau-config'), {});
      this.plateau.bloquer();
      const cadre = this.plateau.cadre;
      cadre.addEventListener('pointerdown', (e) => this._appui(e));
      cadre.addEventListener('pointermove', (e) => {
        if (!this.peint || !e.buttons) return;
        const c = this._case(e);
        if (!c) return;
        // souris rapide : on peint aussi les cases traversées depuis la dernière
        const d = this.peint.dernier || c;
        const n = Math.max(Math.abs(c[0] - d[0]), Math.abs(c[1] - d[1]));
        for (let i = 1; i <= n; i++) this._peindre([Math.round(d[0] + (c[0] - d[0]) * i / n), Math.round(d[1] + (c[1] - d[1]) * i / n)]);
        this._peindre(c);
      });
      window.addEventListener('pointerup', () => { if (this.peint) { this.peint = null; this.change(); } });
      document.querySelectorAll('#acc-config .pli').forEach((s) => s.querySelector('.pli-titre').addEventListener('click', () => this.choisirOnglet(s.dataset.pli)));
      // mes configurations
      $('#cf-nouvelle').addEventListener('click', () => { this.editer(this.nouvelleVide()); this.choisirOnglet('pieces'); window.App.bulle('Nouvelle configuration : plateau vide.'); });
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
      // pièces
      document.querySelectorAll('#camp-config button').forEach((b) => b.addEventListener('click', () => { this.camp = b.dataset.camp; this.majEtape2(); }));
      $('#cf-carte').addEventListener('change', () => {
        this.cfg.carte = $('#cf-carte').value;
        this.cfg = window.Config.simple(this.cfg);
        this.change();
        this.majHasard();
      });
      $('#outil-gomme').addEventListener('click', () => this.choisirOutil({ type: 'gomme' }));
      $('#cf-vider').addEventListener('click', () => { const c = this.cfg; c.pieces = window.Config.grille(c.lignes, c.cols, null); this.change(); });
      // pièces au hasard : avantage des blancs voulu au départ (minimum et maximum, écrits librement)
      const lireAv = () => {
        const lire = (el) => { const v = parseFloat(String(el.value).replace(',', '.').replace('−', '-').replace(/\s/g, '')); return isNaN(v) ? null : Math.max(-50, Math.min(50, v)); };
        const a = lire($('#hz-av-min')), b = lire($('#hz-av-max'));
        $('#hz-av-min').classList.toggle('faux', a == null);
        $('#hz-av-max').classList.toggle('faux', b == null);
        if (a == null || b == null) return;
        this.cfg.avMin = Math.min(a, b); this.cfg.avMax = Math.max(a, b);
        this.change();
      };
      document.querySelectorAll('#hz-ou button').forEach((b) => b.addEventListener('click', () => {
        this.cfg.hasardOu = b.dataset.ou;
        this.outil = b.dataset.ou === 'zones' ? { type: 'zone', camp: 'w' } : null;
        this.majHasard(); this.change();
      }));
      $('#hz-zone-w').addEventListener('click', () => { this.outil = { type: 'zone', camp: 'w' }; this.majHasard(); });
      $('#hz-zone-b').addEventListener('click', () => { this.outil = { type: 'zone', camp: 'b' }; this.majHasard(); });
      $('#hz-zone-gomme').addEventListener('click', () => { this.outil = { type: 'zone', camp: false }; this.majHasard(); });
      for (const id of ['#hz-av-min', '#hz-av-max']) { $(id).addEventListener('input', lireAv); $(id).addEventListener('change', () => { lireAv(); this.majAvCases(); }); }
      $('#cf-jouer').addEventListener('click', () => window.App.jouerAvec(this.cfg.id));
    },

    // La configuration modifiée est toujours une configuration enregistrée.
    choisirDepart() {
      const l = window.Config.liste();
      const c = window.Config.courante();
      const deja = l.find((x) => x.id === c.id);
      if (deja) return window.Config.simple(deja);
      // ancienne configuration en cours, jamais enregistrée : on la garde si elle a été changée
      const cl = window.Config.classique();
      const sans = (x) => JSON.stringify(Object.assign({}, x, { id: '', nom: '' }));
      if (c.pieces && sans(c) !== sans(cl)) {
        c.id = window.Config.nouveauId();
        if (!c.nom || c.nom === 'Classique' || c.nom === 'Partie normale') c.nom = this.nomLibre();
        window.Config.enregistrer(window.Config.simple(c));
        return window.Config.simple(c);
      }
      return l.length ? window.Config.simple(l[0]) : this.nouvelleVide();
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
      this.sauver();
      this.remplir();
      this.choisirOnglet(this.onglet);
      this.change(true);
      this.majAvantage();
    },
    editer(cfg) {
      this.cfg = window.Config.simple(cfg);
      this.sauver();
      this.pageListe = 0;
      this.remplir();
      this.listeConfigs();
      this.change(true);
      this.majAvantage();
    },

    // Une seule partie dépliée à la fois : tout tient sur l'écran.
    choisirOnglet(o) {
      this.onglet = o;
      document.querySelectorAll('#acc-config .pli').forEach((s) => s.classList.toggle('ouvert', s.dataset.pli === o));
      if (o === 'mes') this.listeConfigs();
      const zone = this.outil && this.outil.type === 'zone';
      if ((o === 'hasard') !== zone) this.outil = null;
      if (o === 'hasard' && !this.outil && this.cfg.hasardOu === 'zones') this.outil = { type: 'zone', camp: 'w' };
      if (o === 'pieces') this.majEtape2();
      if (o === 'hasard') this.majHasard();
    },

    // Pièces au hasard : combien de chaque personnage (les mêmes pour les deux couleurs).
    majHasard() {
      const cfg = this.cfg;
      cfg.auHasard = cfg.auHasard || {};
      const cats = window.Persos.categories();
      const miennes = cats.filter((c) => c !== 'Classiques');
      const ordre = miennes.concat(cats.includes('Classiques') ? ['Classiques'] : []);
      if (!ordre.includes(this.catHasard)) this.catHasard = ordre[0];
      const barre = $('#hz-cats');
      barre.innerHTML = '';
      for (const cat of ordre) {
        const n = window.Persos.tous().filter((p) => p.categorie === cat).reduce((t, p) => t + (cfg.auHasard[p.id] || 0), 0);
        const b = el('button', 'puce' + (cat === this.catHasard ? ' choisie' : ''), cat + (n ? ' (' + n + ')' : ''));
        b.addEventListener('click', () => { this.catHasard = cat; this.majHasard(); });
        barre.appendChild(b);
      }
      const box = $('#hz-persos');
      box.innerHTML = '';
      for (const p of window.Persos.tous().filter((x) => x.categorie === this.catHasard)) {
        const n = cfg.auHasard[p.id] || 0;
        const d = el('div', 'hz-perso' + (n ? ' actif' : ''));
        const ic = window.Pieces.creerPerso(p, 'w'); ic.classList.add('icone');
        const moins = el('button', 'bouton', '−'), plus = el('button', 'bouton', '+');
        const max = 16;
        moins.disabled = !n; plus.disabled = n >= max;
        const changer = (dn) => {
          const v = Math.max(0, Math.min(max, (cfg.auHasard[p.id] || 0) + dn));
          if (v) cfg.auHasard[p.id] = v; else delete cfg.auHasard[p.id];
          // un roi au hasard : c'est LE roi de chaque camp (on enlève les autres rois)
          this.majHasard(); this.change();
        };
        moins.addEventListener('click', () => changer(-1));
        plus.addEventListener('click', () => changer(1));
        d.title = window.Persos.description(p);
        d.append(ic, el('span', 'hz-nom', p.nom), moins, el('b', null, n), plus);
        box.appendChild(d);
      }
      const lot = window.Config.lotHasard(cfg);
      const res = $('#hz-resume');
      if (!lot.length) res.textContent = 'Rien au hasard pour l’instant.';
      else {
        const noms = Object.keys(cfg.auHasard).map((id) => { const p = window.Persos.trouver(id); return cfg.auHasard[id] + ' ' + (p ? p.nom : '?'); });
        res.textContent = 'Chaque couleur reçoit au hasard : ' + noms.join(', ') + '.';
      }
      this.majAvCases();
      // où ?
      const zones = cfg.hasardOu === 'zones';
      document.querySelectorAll('#hz-ou button').forEach((b) => b.classList.toggle('choisi', b.dataset.ou === (cfg.hasardOu || 'miroir')));
      $('#hz-zones').style.display = zones ? '' : 'none';
      const o = this.outil;
      $('#hz-zone-w').classList.toggle('choisi', !!(o && o.type === 'zone' && o.camp === 'w'));
      $('#hz-zone-b').classList.toggle('choisi', !!(o && o.type === 'zone' && o.camp === 'b'));
      $('#hz-zone-gomme').classList.toggle('choisi', !!(o && o.type === 'zone' && !o.camp));
      $('#hz-zone-aide').textContent = zones ? 'Clique ou glisse sur le plateau pour peindre. Les blancs apparaissent au hasard dans leur zone, les noirs dans la leur.' : '';
    },

    majAvCases() {
      const ecrit = (v) => (v > 0 ? '+' : '') + String(v).replace('.', ',');
      if (document.activeElement !== $('#hz-av-min')) $('#hz-av-min').value = ecrit(this.cfg.avMin);
      if (document.activeElement !== $('#hz-av-max')) $('#hz-av-max').value = ecrit(this.cfg.avMax);
      $('#hz-av-min').classList.remove('faux'); $('#hz-av-max').classList.remove('faux');
    },
    remplir() {
      this.majAvCases();
      const sel = $('#cf-carte');
      sel.innerHTML = '';
      for (const k of window.Cartes.toutes()) { const o = el('option', null, k.nom + (k.fixe ? '' : ' (' + k.cols + ' × ' + k.lignes + ')')); o.value = k.id; sel.appendChild(o); }
      sel.value = this.cfg.carte || 'normal';
      $('#cf-titre').textContent = this.cfg.nom;
      $('#cf-nom').value = this.cfg.nom;
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
    },
    majOutil() {
      const o = this.outil;
      document.querySelectorAll('#cf-persos .cf-perso').forEach((b) => b.classList.toggle('choisi', !!(o && o.type === 'perso' && b.dataset.perso === o.perso)));
      $('#outil-gomme').classList.toggle('choisi', !!(o && o.type === 'gomme'));
      const coul = this.camp === 'w' ? ' (blancs)' : ' (noirs)';
      const t = $('#outil-actuel');
      t.innerHTML = '';
      if (!o) { t.append(el('span', 'aide', 'Rien de choisi : clique un personnage ou ✖.')); return; }
      t.append(el('b', null, 'Tu poses : '));
      if (o.type === 'perso') {
        const p = window.Persos.trouver(o.perso);
        if (p) { const ic = window.Pieces.creerPerso(p, this.camp); ic.classList.add('icone'); t.append(ic, el('span', null, p.nom + coul)); }
      } else if (o.type === 'trou') t.append(el('span', null, '⬛ des trous'));
      else t.append(el('span', null, '✖ la gomme'));
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
      let o;
      if (e.button === 2) o = this.outil && this.outil.type === 'zone' ? { type: 'zone', camp: false } : { type: 'gomme' };
      else if (e.button === 0) {
        if (!this.outil) { window.App.bulle(this.onglet === 'hasard' ? (this.cfg.hasardOu === 'zones' ? 'Choisis « Zone des blancs » ou « Zone des noirs », puis peins.' : 'Pour peindre des zones, choisis « dans des zones que je peins ».') : 'Choisis d’abord ce que tu poses : un personnage ou ✖.'); return; }
        o = this.outil;
        // cliquer une case qui contient déjà exactement ça : on l'enlève
        if (o.type !== 'zone' && this._deja(c, o)) o = { type: 'gomme' };
      } else return;
      this.peint = { outil: o, faites: new Set() };
      if (o.type === 'perso' || o.type === 'hasard') window.Son.pose(); else window.Son.clic();
      this._peindre(c);
    },
    _deja([r, c], o) {
      const cfg = this.cfg, p = cfg.pieces[r][c];
      if (o.type === 'perso') return !!(p && p.hasard == null && p.perso === o.perso && p.camp === this.camp);
      if (o.type === 'hasard') return !!(p && p.hasard != null && p.camp === this.camp);
      if (o.type === 'trou') return !!cfg.trous[r][c];
      if (o.type === 'zone') return !!o.camp && cfg.zonesH && cfg.zonesH[r][c] === o.camp;
      return false;
    },
    _peindre([r, c]) {
      const P = this.peint;
      P.dernier = [r, c];
      const cle = r + ',' + c;
      if (P.faites.has(cle)) return;
      P.faites.add(cle);
      const cfg = this.cfg, o = P.outil;
      if (cfg.trous[r][c]) return; // trou de la carte : rien à faire ici
      let pose = false;
      if (o.type === 'perso' || o.type === 'hasard') {
        cfg.trous[r][c] = false;
        cfg.pieces[r][c] = o.type === 'perso' ? { camp: this.camp, perso: o.perso } : { camp: this.camp, hasard: '' };
        pose = true;
      } else if (o.type === 'zone') {
        if (!cfg.zonesH) cfg.zonesH = window.Config.grille(cfg.lignes, cfg.cols, false);
        cfg.zonesH[r][c] = o.camp || false;
      } else if (o.type === 'trou') { cfg.trous[r][c] = true; cfg.pieces[r][c] = null; }
      else cfg.pieces[r][c] = null;
      this.pop = pose ? [FICH[c] + (r + 1)] : null;
      this.afficher();
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

    afficher() {
      const { pos, zones } = positionAffichage(this.cfg);
      this.plateau.afficher(pos, { decor: { zones }, pop: this.pop });
      this.pop = null;
      this.redimensionner();
    },

    // Appelé après chaque modification (seulementAffichage = rien n'a changé dans la configuration).
    change(seulementAffichage) {
      if (!seulementAffichage) this.sauver();
      this.afficher();
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
        zone.textContent = '🎲 À chaque partie, le tirage est refait jusqu’à un avantage des blancs entre ' + texteAvantage(this.cfg.avMin) + ' et ' + texteAvantage(this.cfg.avMax) + '.';
        valeur.textContent = '';
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
      const dans = av >= this.cfg.avMin - 1e-9 && av <= this.cfg.avMax + 1e-9;
      zone.textContent = (av > 0.3 ? 'Les blancs commencent avec un avantage.' : av < -0.3 ? 'Les noirs commencent avec un avantage.' : 'La position de départ est équilibrée.') +
        (dans ? '' : ' Pour viser ton avantage voulu, mets des pièces dans « 🎲 Placer au hasard ».');
      barre.style.visibility = '';
      window.App.majBarre(barre, { cp: Math.round(av * 100) }, false, true);
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

    // Grille 15 × 15 (225 cases) : la pièce au milieu, 7 cases de chaque côté. Sous la grille, 8 flèches
    // pour « continue tout droit jusqu'au bout ». Une case que le moteur ne sait pas jouer est marquée ✖.
    grille() {
      const p = this.p;
      p.cases = p.cases || {}; p.lignes = p.lignes || {};
      const box = $('#ps-grille');
      box.innerHTML = '';
      const classique = !!p.classique;
      const R = window.Persos.PORTEE;
      const avertis = classique ? {} : window.Persos.analyser(p).avertis;
      const D = window.Persos.DIRS;
      const dirDe = (dx, dy) => Object.keys(D).find((k) => D[k][0] === Math.sign(dx) && D[k][1] === Math.sign(dy));
      const enLigne = (dx, dy) => (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) && p.lignes[dirDe(dx, dy)];
      const SIGNES = { saute: '⚠', bloque: '⚠', ignore: '✖' };
      box.style.gridTemplateColumns = 'repeat(' + (2 * R + 1) + ', var(--ps-case))';
      box.style.gridTemplateRows = 'repeat(' + (2 * R + 1) + ', var(--ps-case))';
      for (let dy = R; dy >= -R; dy--) {
        for (let dx = -R; dx <= R; dx++) {
          const cle = dx + ',' + dy;
          const c = el('button', 'ps-case ' + ((dx + dy) % 2 === 0 ? 'foncee' : 'claire'));
          if (dx === 0 && dy === 0) {
            c.classList.add('centre');
            const d = window.Pieces.creerPerso(Object.assign({}, p), 'w'); d.classList.add('icone');
            c.appendChild(d);
            c.disabled = true;
          } else {
            const possible = window.Persos.caseJouable(dx, dy);
            if (p.cases[cle]) {
              c.classList.add('oui');
              const av = avertis[cle] || (possible ? null : 'ignore');
              if (av) { c.classList.add('av-' + av); c.textContent = SIGNES[av]; }
            } else if (enLigne(dx, dy)) c.classList.add('ligne');
            if (!possible) c.title = 'Saut trop loin en biais : le moteur des règles ne sait pas le jouer';
            if (!classique) c.addEventListener('click', () => { if (p.cases[cle]) delete p.cases[cle]; else p.cases[cle] = 1; window.Son.clic(); this.grille(); });
          }
          box.appendChild(c);
        }
      }
      // flèches « tout droit jusqu'au bout »
      const fl = $('#ps-fleches');
      fl.innerHTML = '';
      fl.appendChild(el('span', null, 'Tout droit jusqu’au bout :'));
      for (const k of ['NO', 'N', 'NE', 'O', 'E', 'SO', 'S', 'SE']) {
        const b = el('button', 'ps-fleche' + (p.lignes[k] ? ' active' : ''), FLECHES[k]);
        b.title = 'Continue tout droit jusqu’au bout du plateau';
        if (!classique) b.addEventListener('click', () => { if (p.lignes[k]) delete p.lignes[k]; else p.lignes[k] = 1; window.Son.clic(); this.grille(); });
        fl.appendChild(b);
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
      const fleches = $('#ps-fleches').getBoundingClientRect().height;
      const n = 2 * window.Persos.PORTEE + 1;
      const t = Math.floor(Math.min(r.width - 8, r.height - titre - fleches - 24) / n);
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
