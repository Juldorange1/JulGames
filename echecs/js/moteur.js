/* Le moteur d'échecs (protocole UCI) : Stockfish 19 COMPLET (gros réseau de neurones, le plus fort),
   sur plusieurs cœurs. Si la page n'est pas isolée (premier chargement), version « lite » sur un cœur.
   Trois moteurs au plus : « jeu » (le bot), « analyse » (barre, conseils, bilan) et « aide » (4e-6e coups, coach). */
(function () {
  'use strict';

  // Un seul chargement par fichier, même si les deux moteurs le demandent en même temps.
  const scripts = {};
  function chargerScript(src) {
    if (!scripts[src]) {
      scripts[src] = new Promise((ok, ko) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => ok();
        s.onerror = () => { delete scripts[src]; ko(new Error('Chargement impossible : ' + src)); };
        document.head.appendChild(s);
      });
    }
    return scripts[src];
  }

  // Cœurs : chaque moteur prend au plus la moitié des cœurs (4 au plus) pour laisser l'ordinateur fluide.
  const complet = () => !!window.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined';
  function nbThreads() {
    if (!complet()) return 1;
    return Math.max(1, Math.min(4, Math.floor((navigator.hardwareConcurrency || 2) / 2)));
  }

  class Moteur {
    constructor(type, role) {
      this.type = type;
      this.role = role || 'jeu';
      this.charges = new Set();
      this.nbFichiers = 0;
      this.ecouteurs = [];
      this.file = Promise.resolve();
      this.recherche = null; // recherche en cours
      this.gen = 0; // augmente à chaque « arreter » : les recherches en attente sont abandonnées
      this.pret = null;
      this.ini = '';
      this.nom = '';
    }

    demarrer() {
      if (!this.pret) this.pret = this._demarrer().catch((e) => { this.pret = null; throw e; });
      return this.pret;
    }

    async _demarrer() {
      const src = complet() ? 'moteurs/stockfish/stockfish-19.js' : 'moteurs/stockfish/stockfish-19-lite-single.js';
      this.worker = new Worker(src);
      this.worker.onmessage = (e) => this._ligne(String(e.data));
      this.worker.onerror = (e) => console.error('Stockfish', e);
      this.envoyer = (c) => this.worker.postMessage(c);
      this.envoyer('uci');
      await this._attendre((l) => l === 'uciok', (l) => {
        const m = l.match(/^id name (.*)$/);
        if (m) this.nom = m[1].replace(/\s*\[.*$/, '');
      });
      const t = nbThreads();
      if (t > 1) this.envoyer('setoption name Threads value ' + t);
      this.envoyer('setoption name Hash value ' + (this.role === 'analyse' ? 128 : 64));
      await this.synchro();
    }

    _ligne(l) {
      for (const f of this.ecouteurs.slice()) f(l);
    }

    _attendre(fin, chaque) {
      return new Promise((ok) => {
        const f = (l) => {
          if (chaque) chaque(l);
          if (fin(l)) {
            this.ecouteurs.splice(this.ecouteurs.indexOf(f), 1);
            ok(l);
          }
        };
        this.ecouteurs.push(f);
      });
    }

    async synchro() {
      this.envoyer('isready');
      await this._attendre((l) => l === 'readyok');
    }

    nouvellePartie() {
      this.file = this.file.then(async () => {
        await this.demarrer();
        this.envoyer('ucinewgame');
        await this.synchro();
      }).catch(() => {});
      return this.file;
    }

    // Arrête la recherche en cours (elle renvoie quand même son meilleur coup).
    arreter() {
      this.gen++;
      if (this.recherche) {
        this.recherche.annulee = true;
        this.envoyer('stop');
      }
    }

    /* Lance une recherche.
       o = { variante, fen0, coups, elo (null = pleine force), temps (ms), profondeur,
             horloge {wtime,btime,winc,binc}, multipv, surInfo(lignes) }
       Renvoie { coup, lignes:[{ score:{cp}|{mate}, pv:[], profondeur }], annulee } ; scores vus du camp au trait. */
    chercher(o) {
      const gen = this.gen;
      const tache = this.file.then(() => (gen === this.gen ? this._chercher(o) : { coup: null, lignes: [], annulee: true }));
      this.file = tache.catch(() => {});
      return tache;
    }

    async _chercher(o) {
      await this.demarrer();
      const v = o.variante || {};
      this.envoyer('setoption name UCI_Chess960 value ' + (v.is960 ? 'true' : 'false'));
      if (o.elo) {
        this.envoyer('setoption name UCI_LimitStrength value true');
        this.envoyer('setoption name UCI_Elo value ' + o.elo);
      } else {
        this.envoyer('setoption name UCI_LimitStrength value false');
      }
      this.envoyer('setoption name MultiPV value ' + (o.multipv || 1));
      // analyse : mémoire vidée avant chaque calcul, pour ne dépendre ni du bot ni des positions vues avant
      if (o.deterministe) this.envoyer('setoption name Clear Hash');
      await this.synchro();

      const rech = { annulee: false };
      this.recherche = rech;
      const lignes = [];
      let go = 'go';
      if (o.horloge) {
        const h = o.horloge;
        go += ' wtime ' + Math.max(50, Math.round(h.wtime)) + ' btime ' + Math.max(50, Math.round(h.btime)) +
          ' winc ' + Math.round(h.winc || 0) + ' binc ' + Math.round(h.binc || 0);
      } else {
        if (o.profondeur) go += ' depth ' + o.profondeur;
        if (o.temps) go += ' movetime ' + Math.round(o.temps);
        if (!o.profondeur && !o.temps) go += ' infinite';
      }
      // seulement ces coups-là (le coach fait calculer les coups « tentants »)
      if (o.coupsLimites && o.coupsLimites.length) go += ' searchmoves ' + o.coupsLimites.join(' ');
      let derniereInfo = 0;
      const attente = this._attendre((l) => l.startsWith('bestmove'), (l) => {
        if (!l.startsWith('info') || l.indexOf(' pv ') < 0) return;
        const info = lireInfo(l);
        if (!info) return;
        lignes[info.multipv - 1] = info;
        if (o.surInfo && info.multipv === 1) {
          const t = performance.now();
          if (t - derniereInfo > 120) { derniereInfo = t; o.surInfo(lignes); }
        }
      });
      this.envoyer('position fen ' + o.fen0 + (o.coups && o.coups.length ? ' moves ' + o.coups.join(' ') : ''));
      this.envoyer(go);
      if (rech.annulee) this.envoyer('stop');
      const fin = await attente;
      if (o.surInfo && lignes[0]) o.surInfo(lignes);
      this.recherche = null;
      const coup = fin.split(/\s+/)[1];
      return { coup: coup && coup !== '(none)' && coup !== '0000' ? coup : null, lignes: lignes.filter(Boolean), annulee: rech.annulee };
    }
  }

  function lireInfo(l) {
    const t = l.split(/\s+/);
    const info = { multipv: 1, profondeur: 0, score: null, pv: [] };
    for (let i = 1; i < t.length; i++) {
      const k = t[i];
      if (k === 'depth') info.profondeur = +t[++i];
      else if (k === 'multipv') info.multipv = +t[++i];
      else if (k === 'score') {
        const genre = t[++i]; const val = +t[++i];
        info.score = genre === 'mate' ? { mate: val } : { cp: val };
        if (t[i + 1] === 'lowerbound' || t[i + 1] === 'upperbound') return null;
      } else if (k === 'pv') { info.pv = t.slice(i + 1); break; }
    }
    return info.score ? info : null;
  }

  const moteurs = {};
  // rôles demandés -> moteur réel (les 4e-6e coups et le coach se partagent le moteur « aide »)
  const ROLE = { jeu: 'jeu', analyse: 'analyse', plus: 'aide', coach: 'aide' };
  window.Moteurs = {
    obtenir(type, role) {
      const r = ROLE[role || 'jeu'] || 'jeu';
      if (!moteurs[r]) moteurs[r] = new Moteur('sf', r);
      return moteurs[r];
    },
    pourVariante(v, role) { return this.obtenir('sf', role); },
    tous() { return Object.values(moteurs); },
    complet,
    disponible() { return true; }
  };
})();
