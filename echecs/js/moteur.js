/* Les moteurs d'échecs (protocole UCI).
   - « sf »    : Stockfish 19 (version navigateur « lite ») pour les échecs classiques et le 960.
   - « fairy » : Fairy-Stockfish, le Stockfish des variantes (lit aussi les variantes créées).
   Un seul moteur de chaque sorte ; les recherches passent l'une après l'autre. */
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

  // Cœurs : le moteur du bot en prend la plus grosse part, celui de l'analyse (barre, conseils) le reste.
  function nbThreads(role) {
    if (!window.crossOriginIsolated) return 1;
    const total = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1));
    const analyse = Math.max(1, Math.round(total / 3));
    // analyse : un seul cœur, pour que la même position donne toujours les mêmes résultats
    return role === 'analyse' ? 1 : Math.max(1, total - analyse);
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
      if (this.type === 'sf') {
        const multi = !!window.crossOriginIsolated;
        const src = 'moteurs/stockfish/stockfish-19-lite' + (multi ? '' : '-single') + '.js';
        this.worker = new Worker(src);
        this.worker.onmessage = (e) => this._ligne(String(e.data));
        this.worker.onerror = (e) => console.error('Stockfish', e);
        this.envoyer = (c) => this.worker.postMessage(c);
      } else {
        if (!window.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') {
          throw new Error('Le moteur des variantes a besoin d’une page isolée (recharge la page).');
        }
        await chargerScript('moteurs/fairy/stockfish.js');
        this.sf = await window.Stockfish();
        this.sf.addMessageListener((l) => this._ligne(String(l)));
        this.envoyer = (c) => this.sf.postMessage(c);
      }
      this.envoyer('uci');
      await this._attendre((l) => l === 'uciok', (l) => {
        const m = l.match(/^id name (.*)$/);
        if (m) this.nom = m[1].replace(/\s*\[.*$/, '');
      });
      const t = nbThreads(this.role);
      if (t > 1) this.envoyer('setoption name Threads value ' + t);
      this.envoyer('setoption name Hash value 64');
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

    // Variante définie en .ini (seulement pour Fairy-Stockfish), chargée une fois.
    async assurer(ini) {
      if (this.type !== 'fairy' || !ini) return;
      const m = ini.match(/^\[([^:\]]+)/);
      const nom = m ? m[1] : ini;
      if (this.charges.has(nom)) return;
      const fichier = '/v' + (++this.nbFichiers) + '.ini';
      this.sf.FS.writeFile(fichier, ini);
      this.envoyer('setoption name VariantPath value ' + fichier);
      this.charges.add(nom);
      await this.synchro();
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
      const v = o.variante;
      if (this.type === 'fairy') {
        await this.assurer(v.ini);
        this.envoyer('setoption name UCI_Variant value ' + v.uci);
      }
      this.envoyer('setoption name UCI_Chess960 value ' + (v.is960 ? 'true' : 'false'));
      if (o.elo) {
        this.envoyer('setoption name UCI_LimitStrength value true');
        this.envoyer('setoption name UCI_Elo value ' + o.elo);
      } else {
        this.envoyer('setoption name UCI_LimitStrength value false');
      }
      this.envoyer('setoption name MultiPV value ' + (o.multipv || 1));
      // analyse : mémoire vidée avant chaque calcul, pour ne dépendre ni du bot ni des positions vues avant
      if (o.deterministe || this.role === 'analyse') this.envoyer('setoption name Clear Hash');
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

  // Moteur maison (js/maison.js dans un Worker) : même façon de s'en servir que les autres.
  class MoteurMaison {
    constructor(role) {
      this.type = 'maison'; this.role = role || 'jeu'; this.nom = 'Moteur Custom Chess';
      this.pret = null; this.file = Promise.resolve(); this.gen = 0; this.courante = null; this.w = null; this.id = 0;
    }
    demarrer() { if (!this.pret) this.pret = Promise.resolve(); return this.pret; }
    nouvellePartie() { this.demarrer(); return this.file; }
    arreter() { this.gen++; if (this.courante) this.courante.stop(); }
    chercher(o) {
      const gen = this.gen;
      const tache = this.file.then(() => (gen === this.gen ? this._chercher(o) : { coup: null, lignes: [], annulee: true }));
      this.file = tache.catch(() => {});
      return tache;
    }
    _chercher(o) {
      this.demarrer();
      if (!this.w) this.w = new Worker('js/maison.js?v=47');
      const w = this.w, id = ++this.id;
      let temps = o.temps || 0;
      if (o.horloge) {
        const t0 = (o.fen0.split(' ')[1] === 'b') ? 1 : 0;
        const noir = ((o.coups ? o.coups.length : 0) + t0) % 2 === 1;
        const reste = noir ? o.horloge.btime : o.horloge.wtime, inc = noir ? o.horloge.binc : o.horloge.winc;
        temps = Math.max(100, Math.min(6000, reste / 45 + (inc || 0) * 0.6));
      }
      if (!temps) temps = o.profondeur ? 20000 : 3000;
      return new Promise((ok) => {
        let lignes = [], fait = false;
        const fini = (annulee, coup) => {
          if (fait) return;
          fait = true; w.onmessage = null; this.courante = null;
          if (o.surInfo && lignes[0]) o.surInfo(lignes);
          ok({ coup: coup || (lignes[0] && lignes[0].pv[0]) || null, lignes, annulee });
        };
        this.courante = { stop: () => { w.terminate(); if (this.w === w) this.w = null; fini(true); } };
        w.onmessage = (e) => {
          const r = e.data;
          if (r.id !== id) return;
          if (r.type === 'info') { lignes = r.lignes; if (o.surInfo) o.surInfo(lignes); }
          else { if (r.lignes && r.lignes.length) lignes = r.lignes; fini(false, r.coup); }
        };
        w.onerror = (e) => { console.error('Moteur maison', e); w.terminate(); if (this.w === w) this.w = null; fini(true); };
        w.postMessage({ id, def: o.variante.def, fen0: o.fen0, coups: o.coups || [], temps, profondeur: o.profondeur, multipv: o.multipv || 1 });
      });
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
  window.Moteurs = {
    // role : « jeu » (le bot) ou « analyse » (barre d'avantage, conseils, bilan, configuration)
    obtenir(type, role) {
      const cle = type + ':' + (role || 'jeu');
      if (!moteurs[cle]) moteurs[cle] = type === 'maison' ? new MoteurMaison(role) : new Moteur(type, role);
      return moteurs[cle];
    },
    pourVariante(v, role) { return this.obtenir(v.moteur === 'sf' || v.moteur === 'maison' ? v.moteur : 'fairy', role); },
    tous() { return Object.values(moteurs); },
    disponible(type) { return type === 'sf' || (!!window.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined'); }
  };
})();
