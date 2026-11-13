'use strict';
/* PULSAR — boucle de jeu : essais, entraînement, victoire, progression, succès */

var Jeu = {
  etat: 'menu', J: null, demo: null,
  tenu: false, appuiAttente: false, file: [],
  dernier: 0, fpsT: 0, fpsN: 0,

  init: function () {
    Sauve.charger();
    Rendu.init(document.getElementById('jeu'));
    this.entrees();
    this.lancerDemo();
    var self = this;
    requestAnimationFrame(function f(now) { self.boucle(now); requestAnimationFrame(f); });
  },

  /* ---------- Entrées ---------- */
  entrees: function () {
    var self = this;
    var estSaut = function (e) {
      var k = e.code;
      return k === 'Space' || k === 'ArrowUp' || k === 'KeyW' || k === 'KeyZ' || k === 'Enter' && self.etat === 'jeu';
    };
    window.addEventListener('keydown', function (e) {
      Son.init();
      if (self.etat === 'jeu' && self.J) {
        if (estSaut(e)) { e.preventDefault(); if (!e.repeat) self.file.push({ t: performance.now(), d: true }); return; }
        if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); self.pause(); return; }
        if (e.code === 'KeyR') { self.recommencer(); return; }
        if (e.code === 'KeyC' && self.J.pratique) { self.poserPoint(true); return; }
        if (e.code === 'KeyX' && self.J.pratique) { self.retirerPoint(); return; }
        if (e.code === 'KeyG' && self.J.pratique) { self.J.guide = !self.J.guide; return; }
        if (e.code === 'KeyE') { self.basculerPratique(); return; }
      } else if (Menus.touche) Menus.touche(e);
    });
    window.addEventListener('keyup', function (e) {
      if (self.etat === 'jeu' && estSaut(e)) { e.preventDefault(); self.file.push({ t: performance.now(), d: false }); }
    });
    var cv = document.getElementById('jeu');
    var bas = function (e) { Son.init(); if (self.etat === 'jeu') { e.preventDefault(); self.file.push({ t: performance.now(), d: true }); } };
    var haut = function (e) { if (self.etat === 'jeu') { self.file.push({ t: performance.now(), d: false }); } };
    cv.addEventListener('pointerdown', bas);
    window.addEventListener('pointerup', haut);
    window.addEventListener('pointercancel', haut);
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('blur', function () { if (self.etat === 'jeu') self.pause(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && self.etat === 'jeu') self.pause(); });
  },
  manette: function () {
    var gp = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var i = 0; i < gp.length; i++) {
      var g = gp[i]; if (!g) continue;
      var a = (g.buttons[0] && g.buttons[0].pressed) || (g.buttons[7] && g.buttons[7].pressed) || (g.buttons[12] && g.buttons[12].pressed);
      if (a !== !!this.gpA) { this.gpA = a; if (this.etat === 'jeu') this.file.push({ t: performance.now(), d: a }); else if (a && Menus.manette) Menus.manette('a'); }
      var st = g.buttons[9] && g.buttons[9].pressed;
      if (st && !this.gpStart) { if (this.etat === 'jeu') this.pause(); else if (this.etat === 'pause') this.reprendre(); }
      this.gpStart = st;
      return;
    }
  },

  /* ---------- Démo du menu (le fantôme joue tout seul) ---------- */
  lancerDemo: function () {
    var graine = (Date.now() % 100000) | 0;
    var G = creerGenerateur({ graine: graine, D: 3.5, intro: 2 });
    G.L.infini = true; G.L.fin = 1e12; G.L.espece = ESPECES_DEMO[graine % ESPECES_DEMO.length];
    for (var i = 0; i < 3; i++) this.etendre(G, true);
    this.demo = { L: G.L, G: G, p: nouvelEtat(G.L), temps: 0, essai: 1, trace: [], rot: 0, demo: true, points: [], infini: true, sansBoss: false, nomBoss: '' };
    this.demo.t0 = performance.now();
  },
  etendre: function (G, avecBoss) {
    var L = G.L, s0 = G.step;
    var mes = G.P.mesures();
    ajouterSection(G, mes);
    if (avecBoss) genAttaquesNiveau(G, s0, G.step);
  },

  /* ---------- Lancer une partie ---------- */
  // cfg : {type:'parcours', n} | {type:'jour'} | {type:'semaine'} | {type:'infini', D} | {type:'atelier', mode, D}
  lancer: function (cfg) {
    var self = this;
    Menus.chargement(true);
    setTimeout(function () {
      try { self.lancerMaintenant(cfg); } catch (e) { console.error(e); Menus.chargement(false); Menus.erreur('Erreur pendant la création du niveau : ' + e.message); }
    }, 30);
  },
  lancerMaintenant: function (cfg) {
    var d = Sauve.d, L, G = null, J = { cfg: cfg, essai: 0, trace: [], rot: 0, points: [], pratique: false, guide: d.reglages.guide, meilleur: 0, temps: 0 };
    var R;
    if (cfg.type === 'parcours' || cfg.type === 'jour' || cfg.type === 'semaine') {
      var graine, D, esp, grand = false, temps;
      if (cfg.type === 'parcours') {
        graine = hashTexte('pulsar-parcours-' + cfg.n); D = dParcours(cfg.n); grand = cfg.n % 10 === 0;
        R = rngGraine(graine); esp = especePour(cfg.n, R);
        if (cfg.n >= 15 && cfg.n % 3 === 0 && !grand) J.mutateur = ['miroir', 'inverse', 'penombre'][Math.floor(R() * 3)];
        var info = d.parcours.niv[cfg.n] || {}; J.meilleur = info.best || 0; J.essai = info.essais || 0;
      } else if (cfg.type === 'jour') {
        graine = hashTexte('pulsar-jour-' + dateJour()); D = dDefi('jour');
        R = rngGraine(graine); esp = ORDRE_ESPECES[Math.floor(R() * 7)];
        var dj = d.defis.jour[dateJour()] || {}; J.meilleur = dj.best || 0; J.essai = dj.essais || 0;
        cfg.D = D;
      } else {
        graine = hashTexte('pulsar-semaine-' + numSemaine()); D = dDefi('semaine'); grand = true; temps = 150;
        R = rngGraine(graine); esp = 'neant';
        var ds = d.defis.semaine[numSemaine()] || {}; J.meilleur = ds.best || 0; J.essai = ds.essais || 0;
        cfg.D = D;
      }
      L = genNiveau({ graine: graine, D: D, espece: esp, grand: grand, temps: temps });
      J.nomBoss = nomBoss(esp, graine); J.grand = grand;
      J.D = D;
      J.sansBoss = false;
    } else {
      var gi = (Math.random() * 1e9) | 0;
      var opts = { graine: gi, D: cfg.D || 1 };
      if (cfg.type === 'atelier') { opts.modes = [cfg.mode]; }
      G = creerGenerateur(opts);
      L = G.L; L.infini = true; L.fin = 1e12;
      J.infini = true; J.G = G; J.dInfini = cfg.D;
      J.sansBoss = cfg.type === 'atelier';
      if (!J.sansBoss) { L.espece = ORDRE_ESPECES[gi % 7]; J.nomBoss = nomBoss(L.espece, gi); }
      for (var i = 0; i < 3; i++) this.etendreInfini(J);
      J.recordInfini = cfg.type === 'infini' ? d.infini.record : ((d.atelier[cfg.mode] || {})[cfg.D] || 0);
      J.D = cfg.D;
    }
    J.L = L;
    // appuis du fantôme (pour les frappes en musique)
    J.appuis = [];
    for (var s = 1; s < L.ghost.length; s++) if (L.ghost[s] && !L.ghost[s - 1]) J.appuis.push((s + 1) * DT);
    this.J = J;
    this.etat = 'jeu';
    Menus.chargement(false);
    Menus.cacher();
    this.nouvelEssai(true);
    var et = etiquetteD(J.D);
    var titre = cfg.type === 'parcours' ? 'Niveau ' + cfg.n : cfg.type === 'jour' ? 'Défi du jour' : cfg.type === 'semaine' ? 'Défi de la semaine' : cfg.type === 'infini' ? 'Infini' : 'Atelier · ' + NOMS_MODE[cfg.mode];
    this.message(titre + ' · ' + et.nom, J.nomBoss || '', et.c, 2.6);
  },
  etendreInfini: function (J) {
    var G = J.G, L = G.L;
    var D = J.cfg.type === 'atelier' ? J.cfg.D : J.cfg.D + G.nSec * 0.12;
    G.P = paramsD(D, G.R); J.dInfini = D;
    var s0 = G.step;
    if (!J.sansBoss && G.nSec > 0 && G.nSec % 6 === 0) {
      var esp = ORDRE_ESPECES[(ORDRE_ESPECES.indexOf(L.espece) + 1) % (D > 15 ? 8 : 7)];
      L.especes = L.especes || [];
      L.especes.push({ s0: s0, espece: esp });
      L.espece = esp; J.nomBoss = nomBoss(esp, L.graine + G.nSec);
    }
    ajouterSection(G, G.P.mesures());
    if (!J.sansBoss) { L.phaseFixe = Math.min(2, Math.floor((D - J.cfg.D) / 1.5)); genAttaquesNiveau(G, s0, G.step); }
    // nouveaux appuis
    if (J.appuis) for (var s = Math.max(1, s0); s < L.ghost.length; s++) if (L.ghost[s] && !L.ghost[s - 1]) J.appuis.push((s + 1) * DT);
  },

  /* ---------- Essais ---------- */
  nouvelEssai: function (premier) {
    var J = this.J, L = J.L;
    var depuis = J.pratique && J.points.length ? J.points[J.points.length - 1] : null;
    if (!depuis || !J.pratique) J.essai++;
    J.p = depuis ? copieEtat(depuis.p) : nouvelEtat(L);
    J.p.marge = 0;
    J.trace = []; J.rot = 0; J.explose = false; J.victoire = false; J.bossMort = 0; J.coupBoss = 0;
    J.attente = 0; J.phaseVue = phaseAuPas(L, J.p.step);
    J.temps = J.p.step * DT;
    J.dernierPoint = J.temps;
    this.tenu = false; this.appuiAttente = false; this.file = [];
    J.t0 = performance.now() - J.temps * 1000;
    Rendu.parts.length = 0;
    // musique
    if (L.infini && J.cfg.type !== 'infini' && J.cfg.type !== 'atelier') { }
    var cfgM = { graine: L.graine, spb: L.spb, appuis: J.appuis, intensite: this.intensite(J) };
    Son.jouer(cfgM, J.temps);
    if (!J.pratique && !premier) Sauve.d.stats.essais++;
    if (premier) Sauve.d.stats.essais++;
    this.compterEssai();
  },
  compterEssai: function () {
    var J = this.J, d = Sauve.d;
    if (J.pratique) return;
    var c = J.cfg, rec;
    if (c.type === 'parcours') { rec = d.parcours.niv[c.n] = d.parcours.niv[c.n] || { essais: 0, best: 0 }; rec.essais = J.essai; }
    else if (c.type === 'jour') { rec = d.defis.jour[dateJour()] = d.defis.jour[dateJour()] || { essais: 0, best: 0, D: c.D }; rec.essais = J.essai; }
    else if (c.type === 'semaine') { rec = d.defis.semaine[numSemaine()] = d.defis.semaine[numSemaine()] || { essais: 0, best: 0, D: c.D }; rec.essais = J.essai; }
  },
  intensite: function (J) {
    var L = J.L;
    if (L.infini) return function (t) { var s = t / DT; return s < L.spb * 4 ? 1 : (J.dInfini > 6 ? 3 : 2) + (Math.floor(s / (L.spb * 32)) % 4 === 3 ? -1 : 0); };
    return function (t) {
      var s = t / DT;
      if (s < L.spb * 4) return 1;
      if (s > L.nPas - L.spb * 4) return 1;
      var f = s / L.nPas;
      var base = f < 0.34 ? 2 : 3;
      // respiration avant chaque phase
      if (Math.abs(f - 0.34) < 0.02 || Math.abs(f - 0.67) < 0.02) return 1;
      return base;
    };
  },
  recommencer: function () {
    var J = this.J; if (!J || J.victoire) return;
    if (!J.p.mort) { this.mourir(true); }
  },

  /* ---------- Boucle ---------- */
  boucle: function (now) {
    var dtr = Math.min(0.1, (now - (this.dernier || now)) / 1000); this.dernier = now;
    this.fpsN++; if (now - this.fpsT > 500) { if (this.J) this.J.fps = this.fpsN * 1000 / (now - this.fpsT); this.fpsT = now; this.fpsN = 0; }
    this.manette();
    if (this.etat === 'jeu' || this.etat === 'pause' || this.etat === 'fin') {
      if (this.etat === 'jeu') this.majJeu(now, dtr);
      dessinerJeu(this.J, this.etat === 'jeu' ? dtr : 0);
      if (this.J && this.J.message) this.J.message.t -= dtr;
    } else {
      this.majDemo(now, dtr);
    }
  },
  majDemo: function (now, dtr) {
    var J = this.demo; if (!J) return;
    if (Son.ctx && !Son.piste && this.etat === 'menu') Son.jouer({ graine: J.L.graine, spb: J.L.spb, intensite: function (t) { return t < 20 ? 1 : 2; } }, J.temps);
    Son.avancer(J.temps);
    var L = J.L, cible = Math.floor((now - J.t0) / 1000 / DT);
    var n = 0;
    while (J.p.step < cible && n++ < 120) {
      if (J.p.step >= L.ghost.length - 2) break;
      pas(J.p, !!L.ghost[J.p.step], L, false);
    }
    if (J.p.step < cible - 120) J.t0 = now - J.p.step * DT * 1000;
    J.temps = J.p.step * DT;
    if (J.p.x > L.xs[L.xs.length - 1] - 60) this.etendre(J.G, true);
    if (J.p.mort || J.p.x > 3000) { this.lancerDemo(); if (Son.piste) Son.couper(0.5); }
    dessinerJeu(J, dtr);
  },
  majJeu: function (now, dtr) {
    var J = this.J, L = J.L, p = J.p;
    if (J.explose) {
      J.attente -= dtr;
      if (J.attente <= 0) this.nouvelEssai(false);
      return;
    }
    if (J.victoire) {
      J.bossMort = Math.min(1, J.bossMort + dtr * 0.5);
      if (Math.random() < 0.8) { var bx = p.x + BOSS_DX + (Math.random() - 0.5) * 4, by = BOSS_Y + (Math.random() - 0.5) * 4; for (var q = 0; q < 4; q++) particule(bx, by, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, 0.8, ESPECES[L.espece || 'oeil'].c1, 0.2); }
      J.attente -= dtr;
      // le joueur continue d'avancer
      p.x += VITESSES[p.vit] * dtr;
      if (J.attente <= 0) { this.etat = 'fin'; Menus.fin(J); }
      return;
    }
    var cible = Math.floor((now - J.t0) / 1000 / DT);
    if (cible - p.step > 240) { J.t0 = now - p.step * DT * 1000; cible = p.step; }
    var avant = { mode: p.mode, ecl: p.eclats, vit: p.vit };
    while (p.step < cible) {
      var tReel = J.t0 + (p.step + 1) * DT * 1000;
      while (this.file.length && this.file[0].t <= tReel) {
        var ev = this.file.shift();
        if (ev.d) { this.tenu = true; this.appuiAttente = true; } else this.tenu = false;
      }
      var sautsAvant = p.sauts;
      pas(p, Jeu.auto ? !!L.ghost[p.step] : (this.tenu || this.appuiAttente), L, !J.sansBoss);
      this.appuiAttente = false;
      if (p.orbeFlash) { p.orbeFlash = 0; Son.sfx('orbe'); for (var o = 0; o < 10; o++) particule(p.x, p.y, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, 0.4, '#ffe14d', 0.12); }
      if (p.eclatFlash) {
        p.eclatFlash = 0; Son.sfx('eclat'); J.coupBoss = 1;
        for (var e2 = 0; e2 < 14; e2++) particule(p.x, p.y, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 0.5, '#bff8ff', 0.1);
      }
      if (p.mort || p.fini) break;
      if (J.pratique && (p.step * DT) - J.dernierPoint > 2.6 && this.pointSur(J)) { J.temps = p.step * DT; this.poserPoint(false); }
      if (L.infini && p.x > L.xs[L.xs.length - 1] - 70) this.etendreInfini(J);
    }
    this.J.tenu = this.tenu;
    J.temps = p.step * DT;
    // musique
    Son.avancer(J.temps + (now - (J.t0 + p.step * DT * 1000)) / 1000);
    if (p.mode !== avant.mode) { Son.sfx('portail'); for (var k = 0; k < 20; k++) particule(p.x, p.y, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 12, 0.6, COUL_MODE[p.mode], 0.15); this.astuceMode(p.mode); }
    if (p.vit !== avant.vit) Son.sfx('portail');
    // vie du boss
    if (!L.infini) {
      J.vieBoss = Math.max(0, 1 - p.x / L.fin);
      var ph = phaseAuPas(L, p.step);
      if (ph !== J.phaseVue) { J.phaseVue = ph; if (ph > 0) { Son.sfx('phase'); Rendu.flash = 0.4; Rendu.secousse = 1.2; this.message('Phase ' + (ph + 1), ph === 2 ? 'Dernière phase !' : '', ESPECES[L.espece].c1, 1.6); } }
    } else {
      if (J.cfg.type === 'infini' && p.x > (J.recordInfini || 0) && !J.recordBattu && J.recordInfini > 50) { J.recordBattu = true; this.message('Nouveau record !', '', '#ffd23f', 1.5); }
    }
    if (p.mort) this.mourir(false);
    else if (p.fini) this.gagner();
  },

  mourir: function (volontaire) {
    var J = this.J, p = J.p, d = Sauve.d, L = J.L;
    p.mort = true;
    J.explose = true; J.attente = J.pratique ? 0.45 : 0.75; J.mortA = performance.now();
    explosionJoueur(p, Sauve.d.icone.explosion);
    Son.couper(0.06); Son.sfx('mort');
    d.stats.morts[p.mode] = (d.stats.morts[p.mode] || 0) + 1;
    if (!volontaire) d.stats.causes[p.cause] = (d.stats.causes[p.cause] || 0) + 1;
    d.stats.sauts += p.sauts; p.sauts = 0;
    d.stats.temps += J.temps;
    var pc = L.infini ? Math.floor(p.x) : Math.floor(Math.min(100, p.x / L.fin * 100));
    this.enregistrerScore(pc, false);
    if (!J.pratique && !L.infini && pc > J.meilleur) {
      if (J.meilleur > 0 && pc >= 10) this.message('Nouveau record : ' + pc + ' %', '', '#ffd23f', 1.4);
      J.meilleur = pc;
    }
    Sauve.ecrire();
  },
  enregistrerScore: function (pc, fini) {
    var J = this.J, d = Sauve.d, c = J.cfg, p = J.p;
    if (c.type === 'infini' && !J.pratique) {
      d.infini.parties++;
      if (pc > d.infini.record) { d.infini.record = pc; d.infini.recordD = J.dInfini; }
      J.recordInfini = Math.max(J.recordInfini || 0, pc);
      return;
    }
    if (c.type === 'atelier' && !J.pratique) {
      var a = d.atelier[c.mode] = d.atelier[c.mode] || {};
      if (pc > (a[c.D] || 0)) a[c.D] = pc;
      J.recordInfini = Math.max(J.recordInfini || 0, pc);
      return;
    }
    var rec = c.type === 'parcours' ? d.parcours.niv[c.n] : c.type === 'jour' ? d.defis.jour[dateJour()] : d.defis.semaine[numSemaine()];
    if (!rec) return;
    if (J.pratique) { rec.pratiqueBest = Math.max(rec.pratiqueBest || 0, pc); if (fini) rec.pratiqueFini = true; return; }
    rec.best = Math.max(rec.best || 0, pc);
    rec.eclatsMax = Math.max(rec.eclatsMax || 0, p.eclats);
    rec.eclatsTotal = J.L.eclats.length;
  },

  gagner: function () {
    var J = this.J, p = J.p, d = Sauve.d, L = J.L, c = J.cfg;
    J.victoire = true; J.attente = 2.6;
    Son.couper(0.6); Son.sfx('victoire'); Rendu.flash = 0.6; Rendu.secousse = 2;
    d.stats.sauts += p.sauts; p.sauts = 0; d.stats.temps += J.temps;
    var res = { nouveau: false, eclats: p.eclats, eclatsTotal: L.eclats.length, essais: J.essai, pratique: J.pratique };
    if (!J.pratique) {
      d.stats.finis++; d.stats.eclats += p.eclats;
      var rec = c.type === 'parcours' ? d.parcours.niv[c.n] : c.type === 'jour' ? d.defis.jour[dateJour()] : d.defis.semaine[numSemaine()];
      res.nouveau = !rec.fini;
      if (!rec.fini) rec.essaisFin = J.essai;
      rec.fini = true; rec.best = 100;
      if (p.eclats > (rec.eclatsMax || 0)) rec.eclatsMax = p.eclats;
      rec.eclatsTotal = L.eclats.length;
      if (p.eclats === L.eclats.length) rec.parfait = true;
      if (c.type === 'parcours') {
        if (c.n >= d.parcours.debloque) d.parcours.debloque = c.n + 1;
        if (c.n % 10 === 0 && res.nouveau) d.stats.grandsBoss++;
        if (J.mutateur) d.stats.variantes = (d.stats.variantes || 0) + 1;
      }
      if (J.essai === 1 && J.D >= 3) d.stats.premierEssai++;
      if (c.type === 'jour' && res.nouveau) {
        var hier = dateJour(new Date(Date.now() - 86400000));
        d.defis.serie = d.defis.dernierJour === hier ? d.defis.serie + 1 : 1;
        d.defis.dernierJour = dateJour();
      }
    } else {
      this.enregistrerScore(100, true);
      d.stats.pratiqueFinis = (d.stats.pratiqueFinis || 0) + 1;
    }
    J.resultat = res;
    Sauve.ecrire();
    verifierSucces();
  },

  /* ---------- Pause, entraînement ---------- */
  pause: function () {
    if (this.etat !== 'jeu' || !this.J || this.J.victoire) return;
    this.etat = 'pause'; this.J.pauseA = performance.now();
    Son.couper(0.1);
    Menus.pause(this.J);
  },
  reprendre: function () {
    if (this.etat !== 'pause') return;
    var J = this.J;
    Menus.cacher();
    this.etat = 'jeu';
    this.tenu = false; this.file = [];
    if (J.explose) { J.attente = 0; return; }
    // reprise un court instant en arrière (le temps de se remettre)
    J.t0 = performance.now() - J.p.step * DT * 1000;
    Son.jouer({ graine: J.L.graine, spb: J.L.spb, appuis: J.appuis, intensite: this.intensite(J) }, J.temps);
  },
  basculerPratique: function () {
    var J = this.J; if (!J) return;
    J.pratique = !J.pratique; J.points = [];
    this.message(J.pratique ? 'Entraînement' : 'Mode normal', J.pratique ? 'Points de contrôle automatiques · C : poser · X : retirer · G : guide' : '', J.pratique ? '#5dff8a' : '#fff', 2);
    if (this.etat === 'jeu' && !J.p.mort) { J.p.mort = true; J.explose = true; J.attente = 0.01; }
  },
  poserPoint: function (manuel) {
    var J = this.J, p = J.p;
    if (p.mort) return;
    J.points.push({ p: copieEtat(p) });
    J.dernierPoint = p.step * DT;
    if (manuel) Son.sfx('point');
  },
  // un point automatique n'est posé que si le joueur suit à peu près la trajectoire parfaite (sinon il pourrait être condamné)
  pointSur: function (J) {
    var p = J.p, L = J.L, s = p.step;
    if (s >= L.gy.length) return false;
    return MODES[L.gmode[s]] === p.mode && Math.abs(L.gy[s] - p.y) < 0.25 && (p.mode !== 'cube' && p.mode !== 'boule' || p.sol);
  },
  retirerPoint: function () { var J = this.J; if (J.points.length) J.points.pop(); J.dernierPoint = J.temps; },
  quitter: function () {
    var J = this.J;
    if (J && !J.p.mort && !J.victoire && this.etat !== 'fin') { var pc = J.L.infini ? Math.floor(J.p.x) : Math.floor(J.p.x / J.L.fin * 100); this.enregistrerScore(pc, false); Sauve.d.stats.temps += J.temps; Sauve.ecrire(); }
    Son.couper(0.2);
    this.etat = 'menu'; this.J = null;
    this.demo.t0 = performance.now() - this.demo.p.step * DT * 1000;
    Menus.accueil();
  },
  message: function (txt, sous, c, t) { if (this.J) this.J.message = { txt: txt, sous: sous, c: c, t: t || 1.5 }; },
  astuceMode: function (mode) {
    var d = Sauve.d; if (d.vus['mode_' + mode]) return;
    d.vus['mode_' + mode] = 1; Sauve.ecrire();
    var txt = { cube: 'Appuie pour sauter · tiens pour enchaîner', vaisseau: 'Tiens pour monter, lâche pour descendre', boule: 'Appuie pour inverser la gravité', onde: 'Tiens pour monter en diagonale, lâche pour descendre', ovni: 'Chaque appui donne un petit bond' }[mode];
    this.message('Nouveau : ' + NOMS_MODE[mode], txt, COUL_MODE[mode], 3);
  }
};
Jeu.auto = /[?&]auto/.test(location.search);   // test : le fantôme joue à ta place
var ESPECES_DEMO = ['oeil', 'meduse', 'prisme', 'horloge', 'serpent'];

/* difficulté des défis : fixée au premier lancement du jour / de la semaine */
function dDefi(type) {
  var d = Sauve.d, cle = type === 'jour' ? dateJour() : numSemaine(), tab = d.defis[type];
  if (tab[cle] && tab[cle].D) return tab[cle].D;
  var D = type === 'jour' ? clamp(Math.round(maitrise() * 2) / 2, 2, 40) : clamp(Math.round((maitrise() + 1.5) * 2) / 2, 3, 45);
  tab[cle] = tab[cle] || { essais: 0, best: 0 }; tab[cle].D = D; Sauve.ecrire();
  return D;
}

/* ---------- Maîtrise ---------- */
function maitrise() {
  var d = Sauve.d, m = 0;
  for (var n in d.parcours.niv) if (d.parcours.niv[n].fini) m = Math.max(m, dParcours(+n));
  for (var j in d.defis.jour) if (d.defis.jour[j].fini) m = Math.max(m, d.defis.jour[j].D || 0);
  for (var s in d.defis.semaine) if (d.defis.semaine[s].fini) m = Math.max(m, d.defis.semaine[s].D || 0);
  return m;
}
function titreMaitrise(m) {
  var t = [[0, 'Novice'], [2, 'Apprenti'], [4, 'Rythmicien'], [7, 'Virtuose'], [11, 'Expert'], [16, 'Maître'], [22, 'Grand maître'], [30, 'Légende'], [40, 'Mythe'], [55, 'Pulsar']];
  var r = t[0][1]; for (var i = 0; i < t.length; i++) if (m >= t[i][0]) r = t[i][1]; return r;
}

/* ---------- Succès ---------- */
var SUCCES = [
  ['premier', 'Premier battement', 'Finir le niveau 1', function (d) { return d.parcours.niv[1] && d.parcours.niv[1].fini; }],
  ['n5', 'En rythme', 'Finir 5 niveaux du Parcours', function (d) { return niveauxFinis(d) >= 5; }],
  ['n10', 'Dix battements', 'Finir 10 niveaux du Parcours', function (d) { return niveauxFinis(d) >= 10; }],
  ['n25', 'Vingt-cinq', 'Finir 25 niveaux du Parcours', function (d) { return niveauxFinis(d) >= 25; }],
  ['n50', 'Demi-centaine', 'Finir 50 niveaux du Parcours', function (d) { return niveauxFinis(d) >= 50; }],
  ['n100', 'Centurion', 'Finir 100 niveaux du Parcours', function (d) { return niveauxFinis(d) >= 100; }],
  ['n200', 'Infatigable', 'Finir 200 niveaux du Parcours', function (d) { return niveauxFinis(d) >= 200; }],
  ['g1', 'Tueur de géant', 'Vaincre un grand boss', function (d) { return d.stats.grandsBoss >= 1; }],
  ['g5', 'Chasseur de colosses', 'Vaincre 5 grands boss', function (d) { return d.stats.grandsBoss >= 5; }],
  ['g10', 'Fléau des boss', 'Vaincre 10 grands boss', function (d) { return d.stats.grandsBoss >= 10; }],
  ['e100', 'Têtu', '100 essais au total', function (d) { return d.stats.essais >= 100; }],
  ['e1000', 'Persévérant', '1 000 essais au total', function (d) { return d.stats.essais >= 1000; }],
  ['e10000', 'Inarrêtable', '10 000 essais au total', function (d) { return d.stats.essais >= 10000; }],
  ['e50000', 'Légende de l’effort', '50 000 essais au total', function (d) { return d.stats.essais >= 50000; }],
  ['ec100', 'Collectionneur', 'Ramasser 100 éclats', function (d) { return d.stats.eclats >= 100; }],
  ['ec1000', 'Trésorier', 'Ramasser 1 000 éclats', function (d) { return d.stats.eclats >= 1000; }],
  ['parfait', 'Ligne parfaite', 'Finir un niveau avec tous ses éclats', function (d) { return nbParfaits(d) >= 1; }],
  ['parfait10', 'Perfectionniste', 'Tous les éclats dans 10 niveaux', function (d) { return nbParfaits(d) >= 10; }],
  ['parfait50', 'Orfèvre', 'Tous les éclats dans 50 niveaux', function (d) { return nbParfaits(d) >= 50; }],
  ['premierEssai', 'Du premier coup', 'Finir un niveau Normal ou plus dur au premier essai', function (d) { return d.stats.premierEssai >= 1; }],
  ['jour1', 'Rendez-vous', 'Finir un défi du jour', function (d) { return d.defis.serie >= 1; }],
  ['jour7', 'Une semaine pile', 'Série de 7 défis du jour', function (d) { return d.defis.serie >= 7; }],
  ['jour30', 'Métronome humain', 'Série de 30 défis du jour', function (d) { return d.defis.serie >= 30; }],
  ['semaine', 'Marathonien', 'Finir un défi de la semaine', function (d) { for (var k in d.defis.semaine) if (d.defis.semaine[k].fini) return true; return false; }],
  ['inf500', 'Loin, très loin', '500 m en Infini', function (d) { return d.infini.record >= 500; }],
  ['inf2000', 'Horizon', '2 000 m en Infini', function (d) { return d.infini.record >= 2000; }],
  ['inf5000', 'Au-delà', '5 000 m en Infini', function (d) { return d.infini.record >= 5000; }],
  ['atelier', 'Polyvalent', '300 m dans chaque forme en Atelier', function (d) { return MODES.every(function (m) { var a = d.atelier[m] || {}; for (var k in a) if (a[k] >= 300) return true; return false; }); }],
  ['demon', 'Démoniaque', 'Finir un niveau Démon', function (d) { return maitrise() >= 16; }],
  ['demon2', 'Démon extrême', 'Finir un niveau Démon extrême', function (d) { return maitrise() >= 30; }],
  ['m10', 'Expert', 'Atteindre la maîtrise 10', function (d) { return maitrise() >= 10; }],
  ['variante', 'Monde à l’envers', 'Finir un niveau en variante', function (d) { return (d.stats.variantes || 0) >= 1; }],
  ['pratique', 'Répétition', 'Finir un niveau en entraînement', function (d) { return (d.stats.pratiqueFinis || 0) >= 1; }],
  ['obstine', 'Obstiné', '500 essais sur un même niveau', function (d) { for (var k in d.parcours.niv) if (d.parcours.niv[k].essais >= 500) return true; return false; }],
  ['sauts', 'Ressort', '20 000 sauts et bascules', function (d) { return d.stats.sauts >= 20000; }],
  ['heure', 'Une heure de rythme', 'Jouer une heure au total', function (d) { return d.stats.temps >= 3600; }],
  ['dix', 'Dix heures', 'Jouer dix heures au total', function (d) { return d.stats.temps >= 36000; }],
  ['cent', 'Cent heures', 'Jouer cent heures au total', function (d) { return d.stats.temps >= 360000; }]
];
function nbParfaits(d) { var n = 0; for (var k in d.parcours.niv) if (d.parcours.niv[k].parfait) n++; return n; }
function verifierSucces() {
  var d = Sauve.d, nouveaux = [];
  SUCCES.forEach(function (s) { if (!d.succes[s[0]] && s[3](d)) { d.succes[s[0]] = Date.now(); nouveaux.push(s); } });
  if (nouveaux.length) { Sauve.ecrire(); nouveaux.forEach(function (s, i) { setTimeout(function () { Menus.toast('Succès : ' + s[1], s[2]); Son.sfx('succes'); }, 600 + i * 1800); }); }
}
