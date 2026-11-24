/* Bilan de partie : chaque position est analysée par le moteur le plus fort de la variante,
   chaque coup reçoit une note, avec barre d'avantage, courbe et précision des deux joueurs. */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);

  const CLASSES = {
    unique: { nom: 'Seul bon coup', symbole: '!', couleur: '#3fc1d6' },
    meilleur: { nom: 'Meilleur coup', symbole: '★', couleur: '#78c850' },
    excellent: { nom: 'Excellent', symbole: '✓', couleur: '#9ccc6a' },
    bon: { nom: 'Bon', symbole: '○', couleur: '#b4bca8' },
    imprecision: { nom: 'Imprécision', symbole: '?!', couleur: '#f0c541' },
    erreur: { nom: 'Erreur', symbole: '?', couleur: '#f08a3c' },
    gaffe: { nom: 'Gaffe', symbole: '??', couleur: '#ec4b4b' }
  };
  const ORDRE = ['unique', 'meilleur', 'excellent', 'bon', 'imprecision', 'erreur', 'gaffe'];

  const NIVEAUX = {
    normal: { nom: 'normale', profondeur: 18, temps: 900 },
    profond: { nom: 'profonde', profondeur: 24, temps: 3000 }
  };

  const B = {
    plateau: null,
    rec: null,
    partie: null,
    n: 0,
    session: 0,
    onglet: 'coups',

    init() {
      this.plateau = new window.Plateau($('#plateau-bilan'), {});
      this.plateau.bloquer();
      // la courbe reste visible au-dessus des onglets
      const g = $('#graphe-bilan');
      $('#onglets-bilan').before(g);
      g.addEventListener('click', (e) => {
        const r = g.getBoundingClientRect();
        const N = this.partie ? this.partie.coups.length : 0;
        if (!N) return;
        this.aller(Math.round((e.clientX - r.left) / r.width * N));
      });
      document.querySelectorAll('#onglets-bilan button').forEach((b) => b.addEventListener('click', () => this.choisirOnglet(b.dataset.onglet)));
      document.querySelectorAll('#ecran-bilan [data-nav]').forEach((b) => b.addEventListener('click', () => {
        if (!this.partie) return;
        const N = this.partie.coups.length;
        const d = b.dataset.nav;
        this.aller(d === 'debut' ? 0 : d === 'fin' ? N : d === 'prec' ? this.n - 1 : this.n + 1);
      }));
      $('#btn-bilan-retourner').addEventListener('click', () => { this.plateau.retourner(!this.plateau.retourne); this.afficher(); });
      $('#btn-bilan-rejouer').addEventListener('click', () => { this.quitter(); window.App.rejouerDepuis(this.rec, this.n); });
      $('#btn-bilan-profond').addEventListener('click', () => this.lancer('profond'));
      $('#btn-bilan-pgn').addEventListener('click', () => window.App.copier(window.App.pgn(this.rec), 'Partie copiée (PGN) : tu peux la coller sur un autre site d’échecs.'));
      $('#btn-bilan-menu').addEventListener('click', () => { this.quitter(); window.App.ecran('accueil'); });
      window.addEventListener('resize', () => this.dessinerGraphe());
    },

    ouvrir(rec) {
      window.App.fermerModale();
      const v = rec.variante;
      if (!v) { window.App.bulle('Partie illisible.'); return; }
      this.quitter();
      this.rec = rec;
      this.v = v;
      try {
        this.partie = new window.Regles.Partie(v, rec.fen0, rec.coups);
      } catch (e) { window.App.bulle('Partie illisible.'); return; }
      this.n = rec.coups.length;
      window.App.ecran('bilan');
      this.plateau.retourner(rec.adversaire !== 'ami' && rec.humain === 'b');
      const res = rec.resultat === '1/2-1/2' ? '½–½' : rec.resultat.replace('-', '–');
      $('#bilan-titre').textContent = v.nom + ' · ' + rec.blancs + ' contre ' + rec.noirs + ' · ' + res + ' (' + rec.raison + ')';
      this.choisirOnglet('resume');
      const a = rec.analyse;
      if (a && a.positions && a.positions.length === rec.coups.length + 1 && a.positions.every(Boolean)) {
        this.calculer();
        this.majProgression();
        this.afficher();
      } else {
        this.lancer(a && a.niveau || 'normal', true);
      }
    },

    quitter() {
      this.session++;
      if (this.v) { const m = window.Moteurs.pourVariante(this.v, 'analyse'); if (m.pret) m.arreter(); }
      if (this.partie) { this.partie.detruire(); this.partie = null; }
    },

    choisirOnglet(o) {
      this.onglet = o;
      document.querySelectorAll('#onglets-bilan button').forEach((b) => b.classList.toggle('actif', b.dataset.onglet === o));
      $('#bilan-resume').style.display = o === 'resume' ? '' : 'none';
      $('#bilan-coups').style.display = o === 'coups' ? '' : 'none';
      this.afficher();
    },

    // ---------- analyse ----------
    async lancer(niveau, garder) {
      const rec = this.rec;
      const ses = ++this.session;
      const v = this.v;
      const moteur = window.Moteurs.pourVariante(v, 'analyse');
      if (moteur.pret) moteur.arreter();
      const ancien = rec.analyse;
      const N = rec.coups.length;
      rec.analyse = {
        niveau,
        positions: garder && ancien && ancien.niveau === niveau && ancien.positions ? ancien.positions.slice(0, N + 1) : new Array(N + 1).fill(null),
        marques: [], precision: null
      };
      while (rec.analyse.positions.length < N + 1) rec.analyse.positions.push(null);
      this.calculer();
      this.majProgression();
      this.afficher();
      const reglage = NIVEAUX[niveau] || NIVEAUX.normal;
      // Une partie qui avance coup par coup pour savoir qui est au trait et si c'est fini.
      const marche = new window.Regles.Partie(v, rec.fen0);
      try {
        await moteur.nouvellePartie();
        for (let k = 0; k <= N; k++) {
          if (k > 0) marche.jouer(rec.coups[k - 1]);
          if (ses !== this.session) return;
          if (rec.analyse.positions[k]) continue;
          let pos;
          if (marche.finie()) {
            const r = marche.resultat();
            pos = { s: { cp: r === '1-0' ? 10000 : r === '0-1' ? -10000 : 0 }, fin: r };
          } else {
            const trait = marche.trait();
            const r = await moteur.chercher({
              variante: v, fen0: rec.fen0, coups: rec.coups.slice(0, k), elo: null,
              profondeur: reglage.profondeur, temps: reglage.temps, multipv: 2
            });
            if (ses !== this.session) return;
            if (r.annulee) { pos = null; }
            else if (!r.lignes.length) { pos = { s: { cp: 0 }, m: r.coup }; }
            else {
              const versBlanc = (s) => (trait === 'w' ? s : window.App.inverser(s));
              pos = {
                s: versBlanc(r.lignes[0].score),
                m: r.coup,
                pv: (r.lignes[0].pv || []).slice(0, 12),
                s2: r.lignes[1] ? versBlanc(r.lignes[1].score) : null,
                p: r.lignes[0].profondeur
              };
            }
          }
          if (!pos) return;
          rec.analyse.positions[k] = pos;
          this.calculer();
          this.majProgression();
          if (k === this.n || k === this.n - 1 || k === N) this.afficher();
          else { this.dessinerGraphe(); this.resume(); }
        }
        this.calculer();
        window.App.sauverPartie(rec);
        this.majProgression();
        this.afficher();
      } catch (e) {
        console.error(e);
        $('#bilan-progression span').textContent = 'Analyse impossible : ' + e.message;
      } finally {
        marche.detruire();
      }
    },

    // Notes des coups et précision, à partir des positions déjà analysées.
    calculer() {
      const a = this.rec.analyse;
      const P = a.positions;
      const N = this.rec.coups.length;
      const premierNoir = this.rec.fen0.split(/\s+/)[1] === 'b';
      const ch = window.App.chances;
      a.marques = [];
      const accs = { w: [], b: [] };
      for (let i = 1; i <= N; i++) {
        const av = P[i - 1], ap = P[i];
        if (!av || !ap) { a.marques.push(null); continue; }
        const camp = ((i - 1) % 2 === 0) !== premierNoir ? 'w' : 'b';
        const vu = (s) => (camp === 'w' ? ch(s) : 100 - ch(s));
        const wAvant = vu(av.s), wApres = vu(ap.s);
        const perte = Math.max(0, wAvant - wApres);
        const joue = this.rec.coups[i - 1];
        let classe;
        if (joue === av.m || (ap.fin && ap.fin !== '1/2-1/2' && wApres >= 99)) {
          classe = 'meilleur';
          if (av.s2 && wAvant - vu(av.s2) >= 20 && wAvant < 97 && wAvant > 4) classe = 'unique';
        } else if (perte < 2) classe = 'excellent';
        else if (perte < 5) classe = 'bon';
        else if (perte < 10) classe = 'imprecision';
        else if (perte < 20) classe = 'erreur';
        else classe = 'gaffe';
        const acc = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * perte) - 3.1669));
        accs[camp].push(acc);
        a.marques.push({ classe, symbole: CLASSES[classe].symbole, perte, camp });
      }
      const prec = (l) => {
        if (!l.length) return null;
        const moy = l.reduce((x, y) => x + y, 0) / l.length;
        const harm = l.length / l.reduce((x, y) => x + 1 / Math.max(1, y), 0);
        return (moy + harm) / 2;
      };
      a.precision = { w: prec(accs.w), b: prec(accs.b) };
    },

    majProgression() {
      const a = this.rec.analyse;
      const total = a.positions.length;
      const faits = a.positions.filter(Boolean).length;
      const el = $('#bilan-progression');
      el.querySelector('.progression-barre').style.width = (100 * faits / total) + '%';
      const niv = (NIVEAUX[a.niveau] || NIVEAUX.normal).nom;
      const moteurNom = this.v.moteur === 'sf' ? 'Stockfish 19' : 'Fairy-Stockfish';
      el.querySelector('span').textContent = faits < total
        ? 'Analyse ' + niv + ' par ' + moteurNom + ' : ' + faits + ' / ' + total + ' positions…'
        : 'Analyse ' + niv + ' par ' + moteurNom + ' terminée.';
      el.classList.toggle('finie', faits >= total);
      $('#btn-bilan-profond').style.display = a.niveau === 'profond' ? 'none' : '';
    },

    // ---------- affichage ----------
    aller(n) {
      if (!this.partie) return;
      this.n = Math.max(0, Math.min(this.partie.coups.length, n));
      this.afficher(true);
    },

    afficher(animer) {
      if (!this.partie || !this.rec || !this.rec.analyse) return;
      const p = this.partie, n = this.n, a = this.rec.analyse;
      const pos = window.Regles.lireFen(p.fens[n]);
      // roi en échec : on regarde la position via une partie temporaire
      let echec = null;
      try {
        const tmp = new window.Regles.Partie(this.v, p.fen0, p.coups.slice(0, n));
        echec = window.App.caseRoiEnEchec(pos, tmp);
        tmp.detruire();
      } catch (e) { /* rien */ }
      this.plateau.afficher(pos, { variante: this.v, dernier: window.App.dernierCoupCases(p.coups[n - 1]), echec, animer: !!animer });
      // flèches : meilleur coup qui était possible
      const fl = [];
      const m = a.marques[n - 1];
      const av = a.positions[n - 1];
      if (n > 0 && m && av && av.m && av.m !== p.coups[n - 1] && ['imprecision', 'erreur', 'gaffe', 'bon'].includes(m.classe)) {
        const d = window.Regles.decouper(av.m);
        if (d) fl.push({ de: d.de, vers: d.vers, couleur: 'rgba(110,200,90,0.85)' });
      }
      this.plateau.flechesAfficher(fl);
      // barre
      const ici = a.positions[n];
      const barre = $('#barre-bilan');
      window.App.majBarre(barre, ici ? ici.s : null, this.plateau.retourne);
      if (ici && ici.fin) barre.querySelector('.barre-texte').textContent = ici.fin === '1/2-1/2' ? '½' : ici.fin;
      barre.classList.toggle('attente', !ici);
      // liste des coups
      window.App.remplirListeCoups($('#coups-bilan'), p, n, a.marques, (k) => this.aller(k));
      this.commentaire();
      this.resume();
      this.dessinerGraphe();
    },

    commentaire() {
      const el = $('#bilan-commentaire');
      const p = this.partie, n = this.n, a = this.rec.analyse;
      el.innerHTML = '';
      const ici = a.positions[n];
      const titre = document.createElement('div'); titre.className = 'com-titre';
      const texte = document.createElement('div'); texte.className = 'com-texte';
      el.append(titre, texte);
      const ts = window.App.texteScore;
      if (n === 0) {
        titre.textContent = 'Position de départ';
        texte.textContent = ici ? 'Évaluation : ' + ts(ici.s) + '. Avance avec ▶ ou les flèches du clavier.' : 'Analyse en cours…';
        return;
      }
      const m = a.marques[n - 1];
      const av = a.positions[n - 1];
      const premierNoir = this.rec.fen0.split(/\s+/)[1] === 'b';
      const camp = ((n - 1) % 2 === 0) !== premierNoir ? 'w' : 'b';
      const num = Math.floor((n - 1 + (premierNoir ? 1 : 0)) / 2) + (+(this.rec.fen0.split(/\s+/).pop()) || 1);
      const san = num + (camp === 'w' ? '. ' : '… ') + p.sans[n - 1];
      if (!m) {
        titre.textContent = san;
        texte.textContent = 'Analyse en cours…';
        return;
      }
      const c = CLASSES[m.classe];
      titre.innerHTML = '<span class="pastille"></span><span class="t"></span>';
      titre.querySelector('.pastille').textContent = c.symbole;
      titre.querySelector('.pastille').style.background = c.couleur;
      titre.querySelector('.t').textContent = san + ' : ' + c.nom.toLowerCase();
      let t = '';
      const qui = this.nomCamp(camp);
      if (ici.fin) t = ici.fin === '1/2-1/2' ? 'La partie se termine par une nulle. ' : 'Ce coup termine la partie. ';
      else t = 'Évaluation après le coup : ' + ts(ici.s) + '. ';
      if (m.classe === 'unique') t += 'C’était le seul coup qui garde la position : bravo à ' + qui + '.';
      else if (m.classe === 'meilleur') t += 'C’est le coup que le moteur aurait joué.';
      else if (av && av.m) {
        const meilleurSan = p.suiteSan(n - 1, [av.m], 1)[0] || av.m;
        if (m.classe === 'excellent') t += 'Presque aussi bon que le meilleur coup (' + meilleurSan + ').';
        else {
          t += 'Le meilleur était ' + meilleurSan + ' (' + ts(av.s) + ').';
          if (m.classe !== 'bon') t += ' Chances de gain perdues : ' + Math.round(m.perte) + ' %.';
          const suite = p.suiteSan(n - 1, av.pv || [], 6);
          if (suite.length > 1) {
            const s = document.createElement('div'); s.className = 'com-suite';
            s.textContent = 'Suite conseillée : ' + suite.join(' ');
            el.appendChild(s);
          }
        }
      }
      texte.textContent = t;
    },

    nomCamp(camp) {
      const r = this.rec;
      return camp === 'w' ? r.blancs.replace(/ \(.*$/, '') : r.noirs.replace(/ \(.*$/, '');
    },

    resume() {
      const el = $('#bilan-resume');
      if (this.onglet !== 'resume') return;
      const a = this.rec.analyse;
      el.innerHTML = '';
      const tab = document.createElement('table'); tab.className = 'tableau-resume';
      const fmt = (x) => (x == null ? '…' : Math.round(x) + ' %');
      tab.innerHTML = '<thead><tr><th></th><th></th><th></th></tr></thead><tbody></tbody>';
      const th = tab.querySelectorAll('th');
      th[1].textContent = '○ ' + this.nomCamp('w');
      th[2].textContent = '● ' + this.nomCamp('b');
      const corps = tab.querySelector('tbody');
      const lp = document.createElement('tr'); lp.className = 'ligne-precision';
      lp.innerHTML = '<td>Précision</td><td></td><td></td>';
      lp.children[1].textContent = fmt(a.precision && a.precision.w);
      lp.children[2].textContent = fmt(a.precision && a.precision.b);
      corps.appendChild(lp);
      const compte = { w: {}, b: {} };
      for (const m of a.marques) if (m) compte[m.camp][m.classe] = (compte[m.camp][m.classe] || 0) + 1;
      for (const k of ORDRE) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td><span class="pastille"></span> </td><td></td><td></td>';
        const pa = tr.querySelector('.pastille');
        pa.textContent = CLASSES[k].symbole; pa.style.background = CLASSES[k].couleur;
        tr.children[0].appendChild(document.createTextNode(CLASSES[k].nom));
        tr.children[1].textContent = compte.w[k] || 0;
        tr.children[2].textContent = compte.b[k] || 0;
        tr.children[1].style.color = tr.children[2].style.color = CLASSES[k].couleur;
        corps.appendChild(tr);
      }
      el.appendChild(tab);
      // moments clés
      const cles = [];
      a.marques.forEach((m, i) => { if (m && (m.classe === 'gaffe' || m.classe === 'erreur' || m.classe === 'unique')) cles.push(i + 1); });
      const h = document.createElement('h3'); h.textContent = cles.length ? 'Moments clés (clique pour voir)' : 'Moments clés';
      el.appendChild(h);
      const box = document.createElement('div'); box.className = 'moments';
      if (!cles.length) {
        const p = document.createElement('p'); p.className = 'petit-gris';
        p.textContent = a.positions.every(Boolean) ? 'Aucune erreur ni gaffe dans cette partie.' : 'En attente de l’analyse…';
        box.appendChild(p);
      }
      for (const k of cles.slice(0, 12)) {
        const m = a.marques[k - 1];
        const b = document.createElement('button'); b.className = 'moment';
        b.style.borderColor = CLASSES[m.classe].couleur;
        b.textContent = CLASSES[m.classe].symbole + ' ' + this.partie.sans[k - 1] + ' (' + this.nomCamp(m.camp) + ')';
        b.addEventListener('click', () => { this.choisirOnglet('coups'); this.aller(k); });
        box.appendChild(b);
      }
      el.appendChild(box);
    },

    dessinerGraphe() {
      const cv = $('#graphe-bilan');
      if (!cv || !this.rec || !this.rec.analyse || !this.partie) return;
      const r = cv.getBoundingClientRect();
      if (!r.width) return;
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      const g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = r.width, H = r.height;
      const a = this.rec.analyse, N = this.partie.coups.length;
      g.fillStyle = '#2c2a28'; g.fillRect(0, 0, W, H);
      const X = (i) => (N ? (i / N) * W : 0);
      const Y = (p) => H - (p / 100) * H;
      g.beginPath(); g.moveTo(0, H);
      let dernier = 0;
      for (let i = 0; i <= N; i++) {
        const pos = a.positions[i];
        if (!pos) break;
        g.lineTo(X(i), Y(window.App.chances(pos.s)));
        dernier = i;
      }
      g.lineTo(X(dernier), H); g.closePath();
      g.fillStyle = '#ecebe6'; g.fill();
      g.strokeStyle = 'rgba(130,130,130,0.7)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
      // points sur les fautes
      a.marques.forEach((m, k) => {
        if (!m || !['imprecision', 'erreur', 'gaffe'].includes(m.classe)) return;
        const pos = a.positions[k + 1];
        if (!pos) return;
        g.fillStyle = CLASSES[m.classe].couleur;
        g.beginPath(); g.arc(X(k + 1), Y(window.App.chances(pos.s)), 4.5, 0, Math.PI * 2); g.fill();
      });
      // coup affiché
      g.strokeStyle = '#4aa3ff'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(X(this.n), 0); g.lineTo(X(this.n), H); g.stroke();
    },

    touche(e) {
      if (!this.partie) return;
      const N = this.partie.coups.length;
      if (e.key === 'ArrowLeft') { this.aller(this.n - 1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { this.aller(this.n + 1); e.preventDefault(); }
      else if (e.key === 'ArrowUp' || e.key === 'Home') { this.aller(0); e.preventDefault(); }
      else if (e.key === 'ArrowDown' || e.key === 'End') { this.aller(N); e.preventDefault(); }
      else if (e.key === 'f' || e.key === 'F') $('#btn-bilan-retourner').click();
    }
  };

  window.Bilan = B;
})();
