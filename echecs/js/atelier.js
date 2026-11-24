/* Atelier : créer ses propres variantes (plateau, pièces, règles). La variante est traduite
   en définition Fairy-Stockfish : les règles et les deux bots la comprennent aussitôt. */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const FICH = 'abcdefghijkl';
  const PALETTE = ['k', 'q', 'r', 'b', 'n', 'p', 'z', 'c', 'a', 'm'];
  const PROMOS = ['q', 'r', 'b', 'n', 'z', 'c', 'a', 'm'];

  // Les règles et le moteur ne remplacent jamais une variante déjà chargée sous le même nom :
  // chaque version d'une variante reçoit donc un nom unique (empreinte de sa définition).
  function empreinte(t) {
    let h = 5381;
    for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  function etatVide() {
    return {
      id: null, nom: '', desc: '', regles: '',
      cols: 8, lignes: 8, cases: null,
      but: 'mat', nbEchecs: 3, pat: 'draw',
      renfort: false, obligatoire: false, roque: true, double: true, passant: true,
      promos: ['q', 'r', 'b', 'n']
    };
  }

  function positionDepuisFen(fen, cols, lignes) {
    const pos = window.Regles.lireFen(fen);
    const cases = [];
    for (let r = 0; r < lignes; r++) {
      const l = [];
      for (let c = 0; c < cols; c++) {
        const ligne = pos.cases[pos.lignes - 1 - r];
        const p = ligne && r < pos.lignes ? ligne[c] : null;
        l.push(p && PALETTE.includes(p.l.toLowerCase()) ? p.l : null);
      }
      cases.push(l);
    }
    return cases;
  }

  const A = {
    e: etatVide(),
    outil: 'P',
    plateau: null,

    init() {
      this.plateau = new window.Plateau($('#plateau-atelier'), {});
      this.plateau.bloquer();
      this.plateau.cadre.addEventListener('pointerdown', (ev) => this._clic(ev));
      this.plateau.cadre.addEventListener('pointermove', (ev) => { if (ev.buttons && this.peindre) this._clic(ev, true); });
      window.addEventListener('pointerup', () => { this.peindre = false; });
      // palette
      const pal = $('#atelier-palette');
      for (const coul of ['w', 'b']) {
        const rangee = document.createElement('div'); rangee.className = 'palette-rangee';
        for (const t of PALETTE) {
          const l = coul === 'w' ? t.toUpperCase() : t;
          const b = document.createElement('button'); b.className = 'palette-piece'; b.dataset.outil = l;
          b.appendChild(window.Pieces.creerPiece(l, null));
          b.title = window.Pieces.infoPiece(l).nom + ' — ' + window.Pieces.infoPiece(l).desc;
          b.addEventListener('click', () => { this.outil = l; this.majPalette(); });
          rangee.appendChild(b);
        }
        if (coul === 'w') {
          const g = document.createElement('button'); g.className = 'palette-piece gomme'; g.dataset.outil = '';
          g.textContent = '⌫'; g.title = 'Gomme';
          g.addEventListener('click', () => { this.outil = ''; this.majPalette(); });
          rangee.appendChild(g);
        }
        pal.appendChild(rangee);
      }
      const leg = document.createElement('div'); leg.className = 'palette-legende'; leg.id = 'palette-legende';
      pal.appendChild(leg);
      // tailles
      for (const [id, min, max] of [['#at-cols', 5, 12], ['#at-lignes', 5, 10]]) {
        const s = $(id);
        for (let i = min; i <= max; i++) { const o = document.createElement('option'); o.value = i; o.textContent = i; s.appendChild(o); }
        s.addEventListener('change', () => this.changerTaille());
      }
      const ne = $('#at-nb-echecs');
      for (let i = 1; i <= 9; i++) { const o = document.createElement('option'); o.value = i; o.textContent = i; ne.appendChild(o); }
      const pr = $('#at-promos');
      for (const t of PROMOS) {
        const lab = document.createElement('label'); lab.className = 'promo-case';
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = t;
        cb.addEventListener('change', () => this.lireFormulaire());
        const ic = window.Pieces.creerPiece(t.toUpperCase(), null); ic.classList.add('icone');
        lab.append(cb, ic, document.createTextNode(window.Pieces.infoPiece(t).nom));
        pr.appendChild(lab);
      }
      for (const id of ['#at-nom', '#at-desc', '#at-regles', '#at-but', '#at-nb-echecs', '#at-pat', '#at-renfort', '#at-obligatoire', '#at-roque', '#at-double', '#at-passant']) {
        $(id).addEventListener('input', () => this.lireFormulaire());
        $(id).addEventListener('change', () => this.lireFormulaire());
      }
      document.querySelectorAll('#onglets-atelier button').forEach((b) => b.addEventListener('click', () => this.onglet(b.dataset.onglet)));
      $('#at-vider').addEventListener('click', () => { this.e.cases = this.e.cases.map((l) => l.map(() => null)); this.maj(); });
      $('#at-depart').addEventListener('click', () => this.positionClassique());
      $('#at-enregistrer').addEventListener('click', () => this.enregistrer(false));
      $('#at-jouer').addEventListener('click', () => this.enregistrer(true));
      $('#at-nouvelle').addEventListener('click', () => this.charger(null));
      $('#at-supprimer').addEventListener('click', () => this.supprimer());
      $('#at-copier').addEventListener('click', () => window.App.copier($('#at-code').value, 'Code de la variante copié.'));
      $('#at-importer').addEventListener('click', () => this.importer());
    },

    ouvrir() {
      if (!this.e.cases) this.charger(null);
      else { this.remplirFormulaire(); this.maj(); }
      this.listeMes();
      this.onglet(this.ongletActuel || 'nom');
    },

    onglet(o) {
      this.ongletActuel = o;
      document.querySelectorAll('#onglets-atelier button').forEach((b) => b.classList.toggle('actif', b.dataset.onglet === o));
      document.querySelectorAll('.at-onglet').forEach((d) => { d.style.display = d.dataset.onglet === o ? '' : 'none'; });
    },

    listeMes() {
      const el = $('#atelier-mes');
      el.innerHTML = '';
      const mes = window.Variantes.perso();
      const t = document.createElement('span'); t.className = 'petit-gris';
      t.textContent = mes.length ? 'Mes variantes :' : 'Tu n’as pas encore créé de variante.';
      el.appendChild(t);
      for (const v of mes) {
        const b = document.createElement('button');
        b.className = 'puce' + (v.id === this.e.id ? ' choisie' : '');
        b.textContent = v.nom;
        b.addEventListener('click', () => this.charger(v));
        el.appendChild(b);
      }
    },

    charger(v) {
      if (v && v.etat) {
        this.e = JSON.parse(JSON.stringify(v.etat));
        this.e.id = v.id;
      } else {
        this.e = etatVide();
        this.e.cases = positionDepuisFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 8, 8);
      }
      this.outil = 'P';
      this.remplirFormulaire();
      this.majPalette();
      this.maj();
      this.listeMes();
    },

    positionClassique() {
      const e = this.e;
      const cases = [];
      for (let r = 0; r < e.lignes; r++) cases.push(new Array(e.cols).fill(null));
      // Rangée de pièces centrée, complétée par des pions
      const rangee = e.cols === 10 ? 'rnabqkbcnr' : e.cols === 9 ? 'rnbqkcbnr' : e.cols === 8 ? 'rnbqkbnr' : e.cols === 7 ? 'rnbkbnr' : e.cols === 6 ? 'rnqkbr' : e.cols === 5 ? 'rnkbr' : e.cols === 11 ? 'rnabqkzbcnr' : 'rnabqkmzbcnr';
      for (let c = 0; c < e.cols; c++) {
        cases[0][c] = rangee[c].toUpperCase();
        cases[1][c] = 'P';
        cases[e.lignes - 2][c] = 'p';
        cases[e.lignes - 1][c] = rangee[c];
      }
      e.cases = cases;
      this.maj();
    },

    changerTaille() {
      const e = this.e;
      const cols = +$('#at-cols').value, lignes = +$('#at-lignes').value;
      const nouv = [];
      for (let r = 0; r < lignes; r++) {
        const l = [];
        for (let c = 0; c < cols; c++) {
          // les blancs restent en bas, les noirs suivent le haut du plateau
          let src = null;
          if (r < lignes / 2) src = e.cases[r] && e.cases[r][c];
          else { const rs = e.lignes - (lignes - r); src = rs >= 0 && e.cases[rs] ? e.cases[rs][c] : null; }
          l.push(src || null);
        }
        nouv.push(l);
      }
      e.cols = cols; e.lignes = lignes; e.cases = nouv;
      this.maj();
    },

    remplirFormulaire() {
      const e = this.e;
      $('#at-nom').value = e.nom; $('#at-desc').value = e.desc; $('#at-regles').value = e.regles;
      $('#at-cols').value = e.cols; $('#at-lignes').value = e.lignes;
      $('#at-but').value = e.but; $('#at-nb-echecs').value = e.nbEchecs; $('#at-pat').value = e.pat;
      $('#at-renfort').checked = e.renfort; $('#at-obligatoire').checked = e.obligatoire;
      $('#at-roque').checked = e.roque; $('#at-double').checked = e.double; $('#at-passant').checked = e.passant;
      document.querySelectorAll('#at-promos input').forEach((cb) => { cb.checked = e.promos.includes(cb.value); });
      $('#at-supprimer').style.display = e.id ? '' : 'none';
    },

    lireFormulaire() {
      const e = this.e;
      e.nom = $('#at-nom').value.trim(); e.desc = $('#at-desc').value.trim(); e.regles = $('#at-regles').value.trim();
      e.but = $('#at-but').value; e.nbEchecs = +$('#at-nb-echecs').value; e.pat = $('#at-pat').value;
      e.renfort = $('#at-renfort').checked; e.obligatoire = $('#at-obligatoire').checked;
      e.roque = $('#at-roque').checked; e.double = $('#at-double').checked; e.passant = $('#at-passant').checked;
      e.promos = [...document.querySelectorAll('#at-promos input')].filter((c) => c.checked).map((c) => c.value);
      this.maj(true);
    },

    majPalette() {
      document.querySelectorAll('.palette-piece').forEach((b) => b.classList.toggle('choisie', b.dataset.outil === this.outil));
      const leg = $('#palette-legende');
      if (!leg) return;
      if (!this.outil) { leg.textContent = 'Gomme : efface les cases touchées.'; return; }
      const i = window.Pieces.infoPiece(this.outil);
      leg.textContent = i.nom + ' : ' + i.desc;
    },

    _clic(ev, glisse) {
      const nom = this.plateau._caseSous(ev);
      if (!nom) return;
      if (!glisse) { this.peindre = true; ev.preventDefault(); }
      const c = this.plateau._coord(nom);
      const e = this.e;
      const outil = ev.button === 2 ? '' : this.outil;
      const avant = e.cases[c.rang][c.col];
      if (glisse && avant === (outil || null)) return;
      e.cases[c.rang][c.col] = outil || null;
      if ($('#at-miroir').checked) {
        const rm = e.lignes - 1 - c.rang;
        if (rm !== c.rang) {
          let miroir = null;
          if (outil) miroir = outil === outil.toUpperCase() ? outil.toLowerCase() : outil.toUpperCase();
          e.cases[rm][c.col] = miroir;
        }
      }
      this.maj();
    },

    // ---------- traduction en définition Fairy-Stockfish ----------
    fen() {
      const e = this.e;
      const rangs = [];
      for (let r = e.lignes - 1; r >= 0; r--) {
        let s = '', vide = 0;
        for (let c = 0; c < e.cols; c++) {
          const p = e.cases[r][c];
          if (!p) { vide++; continue; }
          if (vide) { s += vide; vide = 0; }
          s += p;
        }
        if (vide) s += vide;
        rangs.push(s);
      }
      let plac = rangs.join('/');
      if (e.renfort) plac += '[]';
      let roque = '';
      if (e.roque && e.but !== 'prise') roque = this.droitsRoque();
      const champs = [plac, 'w', roque || '-', '-'];
      if (e.but === 'echecs') champs.push(e.nbEchecs + '+' + e.nbEchecs);
      champs.push('0', '1');
      return champs.join(' ');
    },

    droitsRoque() {
      const e = this.e;
      let s = '';
      const test = (rang, roi, tour, kc, qc) => {
        const l = e.cases[rang];
        const k = l.indexOf(roi);
        if (k < 0) return '';
        let out = '';
        if (l[e.cols - 1] === tour && k < e.cols - 1) out += kc;
        if (l[0] === tour && k > 0) out += qc;
        return out;
      };
      s += test(0, 'K', 'R', 'K', 'Q');
      s += test(e.lignes - 1, 'k', 'r', 'k', 'q');
      return s;
    },

    nomEssai() { return 'essai' + empreinte(this.ini('x')); },
    nomUci() { return (this.e.id || 'jul') + 'v' + empreinte(this.ini('x')); },

    ini(nom) {
      const e = this.e;
      const l = ['[' + nom + ':chess]'];
      l.push('maxFile = ' + FICH[e.cols - 1]);
      l.push('maxRank = ' + e.lignes);
      const utilisees = new Set();
      for (const r of e.cases) for (const p of r) if (p) utilisees.add(p.toLowerCase());
      for (const t of e.promos) utilisees.add(t);
      if (utilisees.has('a')) l.push('archbishop = a');
      if (utilisees.has('c')) l.push('chancellor = c');
      if (utilisees.has('z')) l.push('amazon = z');
      if (utilisees.has('m')) l.push('customPiece1 = m:K');
      if (e.but === 'prise') {
        l.push('king = -');
        l.push('commoner = k');
        l.push('extinctionValue = loss');
        l.push('extinctionPieceTypes = k');
      }
      l.push('startFen = ' + this.fen());
      l.push('promotionRank = ' + e.lignes);
      l.push('promotionPieceTypes = ' + (e.promos.length ? e.promos.join('') : '-'));
      if (!e.double) l.push('doubleStep = false');
      if (!e.passant) l.push('enPassantRegion = -');
      if (!e.roque || e.but === 'prise') l.push('castling = false');
      else if (e.cols !== 8) {
        l.push('castlingKingsideFile = ' + FICH[e.cols - 2]);
        l.push('castlingQueensideFile = c');
      }
      if (e.obligatoire) l.push('mustCapture = true');
      if (e.renfort) { l.push('pieceDrops = true'); l.push('capturesToHand = true'); }
      if (e.pat !== 'draw') l.push('stalemateValue = ' + e.pat);
      if (e.but === 'echecs') l.push('checkCounting = true');
      if (e.but === 'centre') {
        const cs = this.casesCentre().join(' ');
        l.push('flagPiece = k');
        l.push('flagRegionWhite = ' + cs);
        l.push('flagRegionBlack = ' + cs);
      }
      return l.join('\n') + '\n';
    },

    casesCentre() {
      const e = this.e;
      const cs = e.cols % 2 ? [(e.cols - 1) / 2] : [e.cols / 2 - 1, e.cols / 2];
      const rs = e.lignes % 2 ? [(e.lignes - 1) / 2] : [e.lignes / 2 - 1, e.lignes / 2];
      const out = [];
      for (const r of rs) for (const c of cs) out.push(FICH[c] + (r + 1));
      return out;
    },

    // Vérifie la variante. Renvoie un message d'erreur ou null.
    verifier() {
      const e = this.e;
      let K = 0, k = 0, pionsBout = false;
      for (let r = 0; r < e.lignes; r++) {
        for (const p of e.cases[r]) {
          if (p === 'K') K++;
          if (p === 'k') k++;
          if ((p === 'P' && r === e.lignes - 1) || (p === 'p' && r === 0)) pionsBout = true;
        }
      }
      if (e.but !== 'prise' && (K !== 1 || k !== 1)) return 'Il faut exactement un roi blanc et un roi noir.';
      if (e.but === 'prise' && (K < 1 || k < 1)) return 'Il faut au moins un roi de chaque couleur.';
      if (pionsBout) return 'Un pion ne peut pas commencer sur la dernière rangée.';
      if (!e.promos.length && e.cases.some((r) => r.some((p) => p && p.toLowerCase() === 'p'))) return 'Choisis au moins une pièce de promotion pour les pions.';
      const nom = this.nomEssai();
      const err = window.Regles.testerIni(this.ini(nom), nom);
      window.Regles.chargerVariantes(window.Variantes.iniTotal());
      return err;
    },

    maj(sansPlateau) {
      const e = this.e;
      if (!sansPlateau || !this.plateau.position) {
        const pos = window.Regles.lireFen(this.fen());
        pos.poches = null;
        this.plateau.afficher(pos, { variante: null });
        this.redimensionner();
      }
      $('#at-nb-echecs-bloc').style.display = e.but === 'echecs' ? '' : 'none';
      const ini = this.ini(this.e.id || 'ma_variante');
      $('#at-ini').textContent = ini;
      $('#at-code').value = this.code();
      const err = this.verifier();
      const msg = $('#at-message');
      if (err) { msg.textContent = '⚠ ' + err; msg.className = 'at-message erreur'; }
      else {
        let n = 0;
        try { const b = new window.Regles.ff.Board(this.nomEssai()); n = b.numberLegalMoves(); b.delete(); } catch (x) { /* rien */ }
        msg.textContent = '✔ Variante valide : ' + n + ' coups possibles au départ. Les deux bots sauront y jouer.';
        msg.className = 'at-message ok';
      }
      this.valide = !err;
    },

    code() {
      const e = Object.assign({}, this.e, { id: null });
      return 'JULVAR1:' + btoa(unescape(encodeURIComponent(JSON.stringify(e))));
    },

    importer() {
      const t = $('#at-code').value.trim();
      try {
        if (!t.startsWith('JULVAR1:')) throw new Error();
        const e = JSON.parse(decodeURIComponent(escape(atob(t.slice(8)))));
        if (!e.cases || !e.cols || !e.lignes) throw new Error();
        this.e = Object.assign(etatVide(), e, { id: null });
        this.remplirFormulaire();
        this.maj();
        window.App.bulle('Variante importée : pense à l’enregistrer.');
      } catch (x) {
        window.App.bulle('Code illisible.');
      }
    },

    enregistrer(jouer) {
      this.lireFormulaire();
      const e = this.e;
      if (!e.nom) { this.onglet('nom'); window.App.bulle('Donne un nom à ta variante.'); $('#at-nom').focus(); return; }
      if (!this.valide) { window.App.bulle('La variante n’est pas encore valide.'); return; }
      if (!e.id) e.id = 'jul' + Date.now().toString(36);
      const uci = this.nomUci();
      const v = {
        id: e.id, uci, nom: e.nom, court: e.desc || 'Variante créée dans l’atelier.',
        regles: e.regles || this.reglesAuto(), ini: this.ini(uci), etat: JSON.parse(JSON.stringify(e))
      };
      window.Variantes.enregistrer(v);
      window.Regles.chargerVariantes(window.Variantes.iniTotal());
      this.remplirFormulaire();
      this.listeMes();
      window.App.bulle('Variante « ' + e.nom + ' » enregistrée.');
      if (jouer) {
        window.App.options.variante = e.id;
        window.App.ecran('accueil');
      }
    },

    reglesAuto() {
      const e = this.e;
      const t = ['Plateau de ' + e.cols + ' colonnes sur ' + e.lignes + ' rangées.'];
      if (e.but === 'prise') t.push('On gagne en prenant le roi adverse (on a le droit de laisser son roi en prise).');
      else if (e.but === 'centre') t.push('On gagne par mat ou en amenant son roi au centre (' + this.casesCentre().join(', ') + ').');
      else if (e.but === 'echecs') t.push('On gagne par mat ou en donnant ' + e.nbEchecs + ' échec' + (e.nbEchecs > 1 ? 's' : '') + '.');
      else t.push('On gagne par mat.');
      if (e.pat === 'win') t.push('Pat = victoire pour le joueur bloqué.');
      if (e.pat === 'loss') t.push('Pat = défaite pour le joueur bloqué.');
      if (e.renfort) t.push('Les pièces prises vont dans la réserve et peuvent être posées.');
      if (e.obligatoire) t.push('Prendre est obligatoire.');
      if (!e.roque) t.push('Pas de roque.');
      if (!e.double) t.push('Les pions n’avancent que d’une case.');
      if (!e.passant) t.push('Pas de prise en passant.');
      return t.join(' ');
    },

    supprimer() {
      const e = this.e;
      if (!e.id) return;
      window.App.modale('<h2>Supprimer « ' + (e.nom || 'cette variante').replace(/</g, '') + ' » ?</h2><p>Les parties déjà jouées dans cette variante ne pourront plus être revues.</p>', [
        { texte: 'Supprimer', classe: 'danger', action: () => {
          window.Variantes.supprimer(e.id);
          window.Regles.chargerVariantes(window.Variantes.iniTotal());
          this.charger(null);
          window.App.bulle('Variante supprimée.');
        } },
        { texte: 'Annuler' }
      ]);
    },

    redimensionner() {
      const zone = $('#plateau-atelier');
      if (!zone || !zone.offsetParent) return;
      const parent = zone.parentElement.getBoundingClientRect();
      const haut = zone.getBoundingClientRect().top;
      const dispoH = window.innerHeight - haut - 90;
      const t = Math.floor(Math.min((parent.width - 10) / this.e.cols, dispoH / this.e.lignes));
      this.plateau.taille(Math.max(26, Math.min(80, t)));
    }
  };

  window.Atelier = A;
})();
