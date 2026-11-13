'use strict';
/* COMÈTE — boucle de jeu, commandes, modes, records et succès */

var SUCCES = [
  { id: 'premiere', nom: 'Premier lasso', desc: 'Fermer ta première boucle.', test: function (S) { return S.stats.boucles >= 1; } },
  { id: 'premier', nom: 'Tombeur de colosse', desc: 'Vaincre un colosse.', test: function (S) { return S.stats.colosses >= 1; } },
  { id: 'asc5', nom: 'Ascension I', desc: 'Vaincre le colosse 5.', test: function (S) { return S.ascension.debloque > 5; } },
  { id: 'titan', nom: 'Tueur de Titan', desc: 'Vaincre un Titan.', test: function (S) { return S.stats.titans >= 1; } },
  { id: 'asc25', nom: 'Ascension II', desc: 'Vaincre le colosse 25.', test: function (S) { return S.ascension.debloque > 25; } },
  { id: 'asc50', nom: 'Ascension III', desc: 'Vaincre le colosse 50.', test: function (S) { return S.ascension.debloque > 50; } },
  { id: 'asc100', nom: 'Légende des étoiles', desc: 'Vaincre le colosse 100.', test: function (S) { return S.ascension.debloque > 100; } },
  { id: 'parfait', nom: 'Intouchable', desc: 'Vaincre un colosse sans être touché.', test: function (S, x) { return x && x.victoire && x.touches === 0 && !x.entrainement; } },
  { id: 'parfait10', nom: 'Fantôme', desc: '10 colosses à trois étoiles.', test: function (S) { return Jeu.nbEtoiles(3) >= 10; } },
  { id: 'etoiles50', nom: 'Constellation', desc: 'Gagner 50 étoiles en Ascension.', test: function (S) { return Jeu.totalEtoiles() >= 50; } },
  { id: 'combo10', nom: 'Enchaînement', desc: 'Faire un combo de 10 boucles.', test: function (S) { return S.stats.comboMax >= 10; } },
  { id: 'combo20', nom: 'Tornade', desc: 'Faire un combo de 20 boucles.', test: function (S) { return S.stats.comboMax >= 20; } },
  { id: 'combo40', nom: 'Ouragan', desc: 'Faire un combo de 40 boucles.', test: function (S) { return S.stats.comboMax >= 40; } },
  { id: 'pile50', nom: 'Dans le rythme', desc: 'Fermer 50 boucles pile sur le temps.', test: function (S) { return S.stats.pile >= 50; } },
  { id: 'pile500', nom: 'Métronome vivant', desc: 'Fermer 500 boucles pile sur le temps.', test: function (S) { return S.stats.pile >= 500; } },
  { id: 'nova1', nom: 'Supernova', desc: 'Déclencher une Supernova.', test: function (S) { return S.stats.novas >= 1; } },
  { id: 'nova50', nom: 'Faiseur d\'étoiles', desc: 'Déclencher 50 Supernovas.', test: function (S) { return S.stats.novas >= 50; } },
  { id: 'b1000', nom: 'Lasso d\'argent', desc: 'Fermer 1 000 boucles.', test: function (S) { return S.stats.boucles >= 1000; } },
  { id: 'b10000', nom: 'Lasso d\'or', desc: 'Fermer 10 000 boucles.', test: function (S) { return S.stats.boucles >= 10000; } },
  { id: 'balles10', nom: 'Filet', desc: 'Détruire 10 balles d\'une seule boucle.', test: function (S) { return S.stats.ballesMax >= 10; } },
  { id: 'multi3', nom: 'Grand cercle', desc: 'Frapper 3 noyaux d\'une seule boucle.', test: function (S) { return S.stats.multiMax >= 3; } },
  { id: 'serre100', nom: 'Étau', desc: 'Faire 100 boucles serrées qui frappent.', test: function (S) { return S.stats.serrees >= 100; } },
  { id: 'survivant', nom: 'Sur le fil', desc: 'Gagner avec un seul cœur restant (sur 3).', test: function (S, x) { return x && x.victoire && x.coeurs === 1 && x.coeursMax >= 3 && !x.entrainement; } },
  { id: 'rapide', nom: 'Éclair', desc: 'Vaincre un colosse de niveau 10 ou plus en moins d\'une minute.', test: function (S, x) { return x && x.victoire && x.d >= 10 && x.temps < 60 && !x.entrainement; } },
  { id: 'odyssee5', nom: 'Voyageur', desc: 'Vaincre 5 colosses dans une même Odyssée.', test: function (S) { return S.odyssee.meilleur >= 5; } },
  { id: 'odyssee10', nom: 'Explorateur', desc: 'Vaincre 10 colosses dans une même Odyssée.', test: function (S) { return S.odyssee.meilleur >= 10; } },
  { id: 'odyssee20', nom: 'Odyssée', desc: 'Vaincre 20 colosses dans une même Odyssée.', test: function (S) { return S.odyssee.meilleur >= 20; } },
  { id: 'jour1', nom: 'Défi relevé', desc: 'Réussir un défi du jour.', test: function (S) { return S.jour.fait >= 1; } },
  { id: 'serie7', nom: 'Fidèle', desc: 'Réussir le défi du jour 7 jours de suite.', test: function (S) { return S.jour.serie >= 7; } }
];

var NOMS_CAUSES = { balle: 'Balles', sillage: 'Sillage du cœur', mine: 'Mines', traqueur: 'Traqueurs', laser: 'Lasers', onde: 'Ondes', mur: 'Murs', meteore: 'Météores', corps: 'Corps du colosse', ruee: 'Ruées' };
var CONSEILS = {
  balle: 'Garde de la place autour de toi : en tournant autour d\'un noyau, regarde aussi les balles qui arrivent. Entoure-les pour les détruire.',
  sillage: 'Le cœur laisse des balles derrière lui : tourne autour de lui par l\'avant, pas dans son sillage.',
  mine: 'Les mines explosent en étoile : entoure-les avant qu\'elles explosent, elles chargent beaucoup la Supernova.',
  traqueur: 'Les traqueurs te suivent : fais une boucle autour d\'eux pour les détruire.',
  laser: 'La ligne pointillée montre où le laser va tirer : sors-en avant qu\'il devienne blanc.',
  onde: 'Passe par le trou de l\'onde (repéré par le point vert), ou traverse-la avec un élan.',
  mur: 'Repère le trou dans le mur dès qu\'il clignote au bord de l\'arène.',
  meteore: 'Les cercles rouges explosent quand ils sont pleins : sors-en tout de suite.',
  corps: 'Ne passe pas trop près du corps du colosse.',
  ruee: 'Quand une flèche rouge part du colosse, il va foncer : écarte-toi de sa ligne.'
};

var Jeu = {
  auto: /[?&]auto(&|$)/.test(location.search),   // tests : le pilote automatique joue
  cv: null, etat: 'menu', J: null, tReel: 0, dernier: 0,
  entree: { mode: 'cible', cx: 8, cy: 6, dx: 0, dy: 0, elan: false },
  touches: {}, toucher: null, manette: { avant: {} },

  init: function () {
    Sauve.charger();
    this.cv = document.getElementById('jeu');
    Rendu.init(this.cv);
    var self = this;
    window.addEventListener('resize', function () { Rendu.taille(); if (self.J) Rendu.cadrer(self.J.C); });
    window.addEventListener('mousemove', function (e) { self.souris(e.clientX, e.clientY); });
    this.cv.addEventListener('mousedown', function (e) { Son.init(); if (self.etat === 'jeu') { e.preventDefault(); self.entree.elan = true; self.souris(e.clientX, e.clientY); } });
    window.addEventListener('contextmenu', function (e) { if (self.etat === 'jeu') e.preventDefault(); });
    window.addEventListener('keydown', function (e) { self.toucheBas(e); });
    window.addEventListener('keyup', function (e) { self.touches[e.code] = false; });
    window.addEventListener('blur', function () { self.touches = {}; if (self.etat === 'jeu') self.pause(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && self.etat === 'jeu') self.pause(); });
    this.cv.addEventListener('touchstart', function (e) { self.toucheDebut(e); }, { passive: false });
    this.cv.addEventListener('touchmove', function (e) { self.toucheMouv(e); }, { passive: false });
    this.cv.addEventListener('touchend', function (e) { self.toucheFin(e); }, { passive: false });
    document.getElementById('bPause').addEventListener('click', function (e) { e.stopPropagation(); if (self.etat === 'jeu') self.pause(); });
    requestAnimationFrame(function (t) { self.dernier = t; self.boucle(t); });
    this.lancerDemo();
  },

  /* ---------- commandes ---------- */
  souris: function (x, y) {
    if (!this.J || this.J.demo) return;
    var m = Rendu.versMonde(x, y), C = this.J.C;
    this.entree.mode = 'cible';
    this.entree.cx = clamp(m.x, 0.15, C.W - 0.15); this.entree.cy = clamp(m.y, 0.15, C.H - 0.15);
  },
  toucheBas: function (e) {
    var c = e.code;
    if (this.etat !== 'jeu') { Menus.touche(e); return; }
    if (c === 'Escape' || c === 'KeyP') { e.preventDefault(); this.pause(); return; }
    if (c === 'KeyR' && !e.repeat) { e.preventDefault(); this.recommencer(); return; }
    if (c === 'Space' || c === 'ShiftLeft' || c === 'ShiftRight' || c === 'KeyK' || c === 'Enter') { e.preventDefault(); if (!e.repeat) this.entree.elan = true; return; }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyQ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(c) >= 0) {
      e.preventDefault(); this.touches[c] = true; this.entree.mode = 'dir';
    }
  },
  dirClavier: function () {
    var t = this.touches, dx = 0, dy = 0;
    if (t.KeyA || t.KeyQ || t.ArrowLeft) dx -= 1;
    if (t.KeyD || t.ArrowRight) dx += 1;
    if (t.KeyW || t.KeyZ || t.ArrowUp) dy -= 1;
    if (t.KeyS || t.ArrowDown) dy += 1;
    var l = Math.sqrt(dx * dx + dy * dy); if (l > 0) { dx /= l; dy /= l; }
    return { dx: dx, dy: dy };
  },
  toucheDebut: function (e) {
    Son.init();
    if (this.etat !== 'jeu') return;
    e.preventDefault();
    if (this.toucher && e.touches.length > 1) { this.entree.elan = true; return; }
    var t = e.changedTouches[0];
    this.toucher = { id: t.identifier, x: t.clientX, y: t.clientY, t0: performance.now(), bouge: 0 };
    this.entree.mode = 'cible'; this.entree.cx = this.J.C.j.x; this.entree.cy = this.J.C.j.y;
  },
  toucheMouv: function (e) {
    if (this.etat !== 'jeu' || !this.toucher) return;
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i]; if (t.identifier !== this.toucher.id) continue;
      var dx = (t.clientX - this.toucher.x) / Rendu.k * 1.45, dy = (t.clientY - this.toucher.y) / Rendu.k * 1.45;
      this.toucher.x = t.clientX; this.toucher.y = t.clientY; this.toucher.bouge += Math.abs(dx) + Math.abs(dy);
      var C = this.J.C;
      this.entree.cx = clamp(this.entree.cx + dx, 0.15, C.W - 0.15); this.entree.cy = clamp(this.entree.cy + dy, 0.15, C.H - 0.15);
    }
  },
  toucheFin: function (e) {
    if (!this.toucher) return;
    for (var i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === this.toucher.id) {
      if (performance.now() - this.toucher.t0 < 180 && this.toucher.bouge < 0.3 && this.etat === 'jeu') this.entree.elan = true;
      this.toucher = null;
    }
  },
  lireManette: function () {
    var gp = navigator.getGamepads ? navigator.getGamepads() : null, p = null;
    if (gp) for (var i = 0; i < gp.length; i++) if (gp[i] && gp[i].connected) { p = gp[i]; break; }
    if (!p) return;
    var av = this.manette.avant, appui = function (k) { var b = p.buttons[k]; var on = b && (b.pressed || b.value > 0.5); var r = on && !av[k]; av[k] = on; return r; };
    var ax = p.axes[0] || 0, ay = p.axes[1] || 0, l = Math.sqrt(ax * ax + ay * ay);
    if (this.etat === 'jeu') {
      if (l > 0.18) { this.entree.mode = 'manette'; var f = Math.min(1, (l - 0.18) / 0.72) / l; this.entree.mdx = ax * f; this.entree.mdy = ay * f; }
      else if (this.entree.mode === 'manette') { this.entree.mdx = 0; this.entree.mdy = 0; }
      if (appui(0) | appui(5) | appui(4) | appui(7) | appui(6)) this.entree.elan = true;
      if (appui(9)) this.pause();
    } else {
      if (appui(0)) Menus.manette('a');
      if (appui(1)) Menus.manette('b');
      if (appui(9)) Menus.manette('start');
      if (appui(12)) Menus.navigation({ code: 'ArrowUp', preventDefault: function () { } });
      if (appui(13)) Menus.navigation({ code: 'ArrowDown', preventDefault: function () { } });
      if (appui(14)) Menus.navigation({ code: 'ArrowLeft', preventDefault: function () { } });
      if (appui(15)) Menus.navigation({ code: 'ArrowRight', preventDefault: function () { } });
    }
  },
  entreeCombat: function () {
    var e = this.entree, r = { mode: 'cible', cx: e.cx, cy: e.cy, dx: 0, dy: 0, elan: e.elan };
    if (e.mode === 'dir') { var d = this.dirClavier(); r.mode = 'dir'; r.dx = d.dx; r.dy = d.dy; }
    else if (e.mode === 'manette') { r.mode = 'dir'; r.dx = e.mdx || 0; r.dy = e.mdy || 0; }
    return r;
  },

  /* ---------- lancement ---------- */
  arene: function () { return window.innerHeight > window.innerWidth * 1.15 ? { W: 9, H: 14 } : { W: 16, H: 9 }; },
  lancerDemo: function () {
    var R = rngGraine((Date.now() / 1000) | 0);
    var n = R.ent(4, 26);
    var def = genColosse({ n: n, graine: R.ent(1, 1e6) });
    var a = this.arene();
    this.J = { demo: true, cfg: { mode: 'demo' }, C: creerCombat(def, { W: a.W, H: a.H, invincible: true }), bot: creerBot(1), acc: 0, vitesse: 1, ralenti: 1 };
    Rendu.cadrer(this.J.C); Rendu.viderFx();
    if (this.etat !== 'pause') this.etat = 'menu';
  },
  lancer: function (cfg) {
    Son.init();
    var d = Sauve.d, def, opts = {}, a = this.arene();
    opts.W = a.W; opts.H = a.H;
    cfg = JSON.parse(JSON.stringify(cfg));
    switch (cfg.mode) {
      case 'ascension':
        def = colosseAscension(cfg.n);
        cfg.etiquette = (def.titan ? 'TITAN ' : 'Colosse ') + cfg.n;
        opts.tuto = cfg.n === 1 && !d.tuto;
        break;
      case 'entrainement':
        def = colosseAscension(cfg.n);
        cfg.etiquette = 'Entraînement · ' + cfg.n;
        opts.invincible = !!cfg.invincible;
        break;
      case 'odyssee':
        var run = cfg.run, dd = 1 + (run.k - 1) * 1.6;
        def = genColosse({ n: dd, titan: run.k % 5 === 0, graine: run.graine + run.k * 1013 });
        cfg.etiquette = 'Odyssée ' + run.k + (def.titan ? ' · TITAN' : '');
        opts.mods = run.mods; opts.coeurs = run.coeurs; opts.coeursMax = run.coeursMax;
        break;
      case 'jour':
        var dj = Jeu.defiJour();
        def = genColosse({ n: dj.d, graine: dj.graine, titan: dj.mut === 'geant' });
        cfg.etiquette = 'Défi du jour';
        opts.mut = {}; opts.mut[dj.mut] = true;
        break;
    }
    var C = creerCombat(def, opts);
    var rec = cfg.mode === 'ascension' ? d.ascension.rec[cfg.n] : null;
    this.J = { cfg: cfg, C: C, acc: 0, vitesse: cfg.lent ? 0.7 : 1, ralenti: 1, record: rec ? rec.pct : null, message: null, astuce: null, tuto: opts.tuto ? { etape: 0, bouge: 0, t: 0 } : null, flashRouge: 0, musique: false, finT: null };
    this.entree.cx = C.j.x; this.entree.cy = C.j.y - 0.01; this.entree.elan = false;
    if (this.entree.mode === 'manette') { this.entree.mdx = 0; this.entree.mdy = 0; }
    Rendu.cadrer(C); Rendu.viderFx();
    Menus.cacher();
    document.getElementById('boutons').className = '';
    document.body.classList.add('en-jeu');
    this.etat = 'jeu';
    Son.couper(0.05);
    this.message(def.nom, def.epithete, 2.2, 'hsl(' + def.teinte2 + ',100%,75%)', 46);
  },
  recommencer: function () { if (this.J && !this.J.demo) { if (this.J.cfg.mode === 'odyssee' && !this.J.C.fini) return; this.compterFin(true); this.lancer(this.J.cfg); } },
  quitter: function () {
    if (this.J && !this.J.demo && !this.J.C.fini && this.etat !== 'menu') this.compterFin(true);
    Son.couper(0.3);
    document.getElementById('boutons').className = 'cache';
    document.body.classList.remove('en-jeu');
    this.lancerDemo(); this.etat = 'menu'; Menus.accueil();
  },
  pause: function () {
    if (this.etat !== 'jeu') return;
    this.etat = 'pause'; Son.couper(0.05); this.J.musique = false;
    Menus.pause();
  },
  reprendre: function () {
    if (this.etat !== 'pause') return;
    Menus.cacher(); this.etat = 'jeu'; this.entree.elan = false;
  },
  message: function (txt, sous, vie, col, taille) { if (this.J) this.J.message = { txt: txt, sous: sous, vie: vie || 1.4, col: col, taille: taille }; },

  /* ---------- boucle ---------- */
  intensite: function () {
    var J = this.J; if (!J) return 1;
    var C = J.C;
    if (J.demo) return 1;
    if (C.phase === 'coeur') return 3;
    if (C.phase === 'transition') return 1;
    return rage(C) >= 0.5 || C.mut.fureur ? 3 : 2;
  },
  boucle: function (t, manuel) {
    var self = this;
    if (!manuel) requestAnimationFrame(function (t2) { self.boucle(t2); });
    var dt = Math.min(0.05, Math.max(0, (t - this.dernier) / 1000)); this.dernier = t; this.tReel += dt;
    this.lireManette();
    var J = this.J; if (!J) return;
    var C = J.C;
    if (this.etat === 'jeu' || (this.etat === 'menu' && J.demo) || (this.etat === 'fin' && !J.demo)) {
      var vit = J.vitesse * J.ralenti;
      J.acc += dt * vit;
      var n = 0;
      while (J.acc >= DT && n < 12) {
        J.acc -= DT; n++;
        if (Jeu.auto && !J.bot) J.bot = creerBot(1);
        var E = (J.demo || Jeu.auto) ? botEntree(C, J.bot) : this.entreeCombat();
        pasCombat(C, E);
        this.entree.elan = false;
        this.evenements(C, J);
        if (J.demo && C.fini) { this.lancerDemo(); return; }
      }
      if (n >= 12) J.acc = 0;
      if (J.ralenti < 1) J.ralenti = Math.min(1, J.ralenti + dt * (J.ralentiV || 1.2));
      if (J.demo && C.t > 70) { this.lancerDemo(); return; }
      if (!J.demo) this.tutoriel(J, C);
      // musique
      var tm = C.t - T0;
      if (Son.ctx && this.etat === 'jeu' && !C.fini) {
        if (!J.musique && tm >= -0.12) { Son.jouer({ graine: C.def.graine, b: C.b, intensite: function () { return Jeu.intensite(); } }, Math.max(0, tm)); J.musique = true; }
        if (J.musique) Son.avancer(tm);
      }
      // fin du combat
      if (C.fini && !J.demo && J.finT == null) J.finT = this.tReel + (C.fini === 'victoire' ? 1.6 : 0.85);
      if (J.finT != null && this.tReel >= J.finT && this.etat === 'jeu') { J.finT = 1e9; this.finCombat(); }
    }
    if (J.message) J.message.vie -= dt;
    J.flashRouge = Math.max(0, (J.flashRouge || 0) - dt);
    Rendu.majFx(dt * (J.ralenti || 1));
    Rendu.dessiner(C, J, this.tReel);
    if (J.flashRouge > 0) { var g = Rendu.g; g.fillStyle = 'rgba(255,40,70,' + (J.flashRouge * 0.9) + ')'; g.fillRect(0, 0, Rendu.w, Rendu.h); }
  },

  tutoriel: function (J, C) {
    var tu = J.tuto; if (!tu) { J.astuce = null; return; }
    var clavier = this.entree.mode !== 'cible';
    tu.bouge += Math.sqrt(C.j.vx * C.j.vx + C.j.vy * C.j.vy) * DT;
    if (C.t < T0) { J.astuce = null; return; }
    switch (tu.etape) {
      case 0: J.astuce = clavier ? 'Bouge avec les flèches ou ZQSD : ta comète laisse une traînée de lumière.' : 'Bouge la souris : ta comète la suit et laisse une traînée de lumière.'; if (tu.bouge > 8) tu.etape = 1; break;
      case 1: J.astuce = 'Tourne autour d\'un noyau (un cristal brillant) jusqu\'à recroiser ta traînée : la boucle le frappe !'; if (C.s.noyaux > 0 || C.degats >= 2) { tu.etape = 2; tu.t = C.t; } break;
      case 2: J.astuce = 'Continue ! Enchaîne les boucles sans t\'arrêter : le combo monte (×1,05, ×1,10…).'; if (C.t - tu.t > 5) { tu.etape = 3; tu.t = C.t; } break;
      case 3: J.astuce = 'Évite les balles rouges… ou fais une boucle autour pour les détruire et charger la Supernova.'; if (C.t - tu.t > 7) { tu.etape = 4; tu.t = C.t; } break;
      case 4: J.astuce = (clavier ? 'Espace' : 'Clic') + ' : élan ! Pendant l\'élan, rien ne peut te toucher.'; if (C.t - tu.t > 6) { tu.etape = 5; } break;
      case 5: J.astuce = null; if (C.phase === 'coeur') { tu.etape = 6; } break;
      case 6: J.astuce = 'Le cœur s\'échappe : encercle-le pour gagner !'; if (C.coeur && C.coeur.hp < C.coeur.hpMax) tu.etape = 7; break;
      default: J.astuce = null;
    }
  },

  /* ---------- événements du combat → effets et sons ---------- */
  evenements: function (C, J) {
    var evs = C.ev, demo = J.demo, son = !demo && this.etat === 'jeu';
    var col = Rendu.couleurJoueur(this.tReel);
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      switch (e.type) {
        case 'boucle':
          var cfl = e.nova ? 'rgba(255,240,150,A)' : e.cibles ? (e.echo ? 'rgba(200,200,255,A)' : this.rgbaJoueur(col)) : e.balles ? 'rgba(255,210,80,A)' : 'rgba(255,255,255,A)';
          Rendu.fx.flashs.push({ poly: e.poly, vie: e.cibles || e.balles ? 0.45 : 0.25, max: e.cibles || e.balles ? 0.45 : 0.25, col: cfl });
          if (son) { if (e.cibles && !e.echo) Son.sfx('boucle', e.combo); else if (e.balles) Son.sfx('balles'); else if (!e.echo) Son.sfx('boucleVide'); }
          if (!demo && e.pile) { Rendu.texte(C.j.x, C.j.y - 0.5, 'PILE !', '#ffd34d', 0.42, 0.7); if (son) Son.sfx('pile'); }
          else if (!demo && e.serre) Rendu.texte(C.j.x, C.j.y - 0.5, 'SERRÉ', '#7dffb0', 0.3, 0.55);
          if (e.nova) { Rendu.anneau(C.j.x, C.j.y, 0.2, 18, 'rgba(255,240,150,1)', 0.8, 0.25); Rendu.secouer(0.9); if (son) Sauve.d.reglages.sons && Son.sfx('nova'); this.message('SUPERNOVA !', null, 1.1, '#ffe27a', 48); }
          break;
        case 'degat':
          Rendu.texte(e.x + (Math.random() - 0.5) * 0.3, e.y - 0.45, (Math.round(e.v * 10) / 10).toString().replace('.', ','), e.coeur ? '#fff' : 'hsl(' + C.def.teinte2 + ',100%,80%)', e.echo ? 0.26 : 0.36, 0.8);
          Rendu.particules(e.x, e.y, e.echo ? 5 : 12, 'hsl(' + C.def.teinte2 + ',100%,70%)', 4, 0.5);
          if (son) Son.sfx('degat');
          break;
        case 'balleDetruite': if (!e.muet || Math.random() < 0.3) Rendu.particules(e.x, e.y, e.gros ? 10 : 4, '#ffd34d', 2.5, 0.4, 0.05); break;
        case 'mineDesamorcee': Rendu.particules(e.x, e.y, 14, '#ffb13d', 3, 0.5); if (son) Son.sfx('desamorce'); break;
        case 'mineBoom': Rendu.anneau(e.x, e.y, 0.2, 5, 'rgba(255,170,60,1)', 0.35); if (son) Son.sfx('mine'); break;
        case 'noyauMort':
          Rendu.particules(e.x, e.y, 60, 'hsl(' + C.def.teinte2 + ',100%,70%)', 7, 1.0, 0.09);
          Rendu.anneau(e.x, e.y, 0.3, 9, 'rgba(255,255,255,1)', 0.6, 0.12);
          Rendu.secouer(0.6);
          if (!demo) { J.ralenti = 0.15; J.ralentiV = 3; if (son) Son.sfx('noyau'); if (e.reste) this.message('NOYAU BRISÉ', e.reste === 1 ? 'Plus qu\'un !' : 'Encore ' + e.reste, 1.2, '#fff', 34); }
          break;
        case 'coeurSort':
          Rendu.anneau(e.x, e.y, 0.5, 6, 'hsla(' + C.def.teinte + ',100%,75%,1)', 1.2, 0.2);
          Rendu.secouer(0.7);
          if (!demo) { if (son) Son.sfx('coeurSort'); this.message('LE CŒUR S\'ÉCHAPPE', 'Encercle-le pour en finir !', 1.8, 'hsl(' + C.def.teinte + ',100%,78%)', 40); }
          break;
        case 'victoire':
          for (var r = 0; r < 4; r++) Rendu.anneau(e.x, e.y, 0.2, 4 + r * 3, 'hsla(' + (C.def.teinte + r * 40) + ',100%,75%,1)', 1.4, 0.18);
          Rendu.particules(e.x, e.y, 160, '#fff', 9, 1.6, 0.1);
          Rendu.particules(e.x, e.y, 120, 'hsl(' + C.def.teinte + ',100%,70%)', 6, 1.8, 0.08);
          Rendu.secouer(1.2);
          if (!demo) { J.ralenti = 0.12; J.ralentiV = 0.6; if (son) Son.sfx('victoire'); Son.couper(1.2); this.message('VAINCU !', C.def.nom + ' est tombé', 2.5, '#ffd34d', 56); }
          break;
        case 'touche':
          Rendu.particules(e.x, e.y, 40, '#ff4d7a', 6, 0.8, 0.08);
          Rendu.secouer(0.9);
          if (!demo) { J.flashRouge = 0.35; if (son) Son.sfx('touche'); if (!e.entrainement && e.reste > 0) this.message(e.reste === 1 ? 'DERNIER CŒUR' : 'TOUCHÉ', NOMS_CAUSES[e.cause] || '', 1, '#ff6b8a', 30); }
          break;
        case 'egide': Rendu.anneau(e.x, e.y, 0.2, 4, 'rgba(140,220,255,1)', 0.5); if (son) Son.sfx('egide'); this.message('ÉGIDE', 'Coup annulé', 0.9, '#8cdcff', 30); break;
        case 'defaite': if (son) { Son.sfx('defaite'); Son.couper(0.4); } break;
        case 'coupe': Rendu.particules(e.x, e.y, 6, '#fff', 2, 0.3, 0.04); if (son && this.tReel - (J.tCoupe || 0) > 0.15) { J.tCoupe = this.tReel; Son.sfx('coupe'); } break;
        case 'elan': Rendu.anneau(e.x, e.y, 0.1, 5, this.rgbaJoueur(col).replace('A', '1'), 0.3, 0.06); if (son) Son.sfx('elan'); break;
        case 'novaPrete': if (son) Son.sfx('novaPrete'); if (!demo) this.message('SUPERNOVA PRÊTE', 'Ta prochaine boucle qui frappe fera ×3', 1.3, '#ffe27a', 28); break;
        case 'bouclier': if (!demo) { Rendu.texte(e.x, e.y - 0.6, 'Protégé', '#9fdcff', 0.28, 0.6); if (son) Son.sfx('bouclier'); } break;
        case 'tir': if (son) { if (e.a === 'laser' || e.a === 'croix' || e.a === 'balayage') Son.sfx('laser'); else if (e.a === 'onde') Son.sfx('onde'); } break;
        case 'meteore': Rendu.secouer(0.4); if (son) Son.sfx('meteore'); break;
        case 'annonce': if (son) Son.sfx('annonce'); break;
      }
    }
    evs.length = 0;
  },
  rgbaJoueur: function (col) {
    if (col.charAt(0) === '#') { var n = parseInt(col.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',A)'; }
    return col.replace('hsl(', 'hsla(').replace(')', ',A)');
  },

  /* ---------- fin d'un combat : records, statistiques, succès ---------- */
  compterFin: function (abandon) {
    var J = this.J; if (!J || J.demo || J.compte) return null;
    J.compte = true;
    var C = J.C, S = Sauve.d, st = S.stats, cfg = J.cfg;
    var vic = C.fini === 'victoire';
    var temps = Math.max(0, (C.fini ? C.tFin : C.t) - T0);
    var x = { victoire: vic, abandon: !!abandon, pct: pctCombat(C), temps: temps, touches: C.s.touches, coeurs: C.j.coeurs, coeursMax: C.j.coeursMax, d: C.def.d, entrainement: cfg.mode === 'entrainement', etoiles: 0, nouveau: [], cause: C.cause };
    st.boucles += C.s.boucles; st.balles += C.s.balles; st.pile += C.s.pile; st.novas += C.s.novas; st.noyaux += C.s.noyaux; st.serrees += C.s.serrees;
    st.comboMax = Math.max(st.comboMax, C.s.comboMax); st.multiMax = Math.max(st.multiMax, C.s.multiMax); st.ballesMax = Math.max(st.ballesMax, C.s.ballesMax);
    st.temps += C.t; st.coups += C.s.touches;
    if (C.fini === 'defaite') { st.morts++; st.mortsPar[C.cause] = (st.mortsPar[C.cause] || 0) + 1; }
    if (vic && cfg.mode !== 'entrainement') { st.colosses++; if (C.def.titan) st.titans++; }
    if (vic) x.etoiles = 1 + (C.s.touches <= 1 ? 1 : 0) + (C.s.touches === 0 ? 1 : 0);
    if (cfg.mode === 'ascension') {
      var r = S.ascension.rec[cfg.n] || (S.ascension.rec[cfg.n] = { pct: 0, temps: null, etoiles: 0, essais: 0, victoires: 0 });
      r.essais++;
      if (x.pct > r.pct) { if (!vic && r.pct > 0) x.nouveauPct = true; r.pct = x.pct; }
      if (vic) {
        r.victoires++;
        if (r.temps == null || temps < r.temps) { if (r.temps != null) x.nouveauTemps = true; r.temps = temps; }
        if (x.etoiles > r.etoiles) { x.nouvellesEtoiles = x.etoiles - r.etoiles; r.etoiles = x.etoiles; }
        if (cfg.n >= S.ascension.debloque) { S.ascension.debloque = cfg.n + 1; x.debloque = true; }
        if (cfg.n === 1) S.tuto = 1;
      }
      x.record = r;
    }
    if (cfg.mode === 'jour') {
      var jr = S.jour, auj = dateJour();
      if (jr.date !== auj) { jr.date = auj; jr.meilleur = null; jr.essais = 0; }
      jr.essais++;
      if (vic) {
        if (jr.meilleur == null || temps < jr.meilleur) { x.nouveauTemps = jr.meilleur != null; jr.meilleur = temps; }
        if (jr.dernier !== auj) {
          var hier = new Date(); hier.setDate(hier.getDate() - 1);
          var sh = hier.getFullYear() + '-' + (hier.getMonth() + 1) + '-' + hier.getDate();
          jr.serie = jr.dernier === sh ? jr.serie + 1 : 1; jr.dernier = auj; jr.fait++;
        }
      }
    }
    this.verifierSucces(x);
    Sauve.ecrire();
    J.resultat = x;
    return x;
  },
  finCombat: function () {
    var J = this.J, C = J.C, cfg = J.cfg;
    var x = this.compterFin(false);
    this.etat = 'fin';
    document.getElementById('boutons').className = 'cache';
    document.body.classList.remove('en-jeu');
    if (cfg.mode === 'odyssee') {
      var run = cfg.run;
      if (x.victoire) {
        run.score = run.k; run.coeurs = Math.min(run.coeursMax, C.j.coeurs + 1);
        var S = Sauve.d;
        if (run.score > S.odyssee.meilleur) { S.odyssee.meilleur = run.score; x.nouveauRecord = true; }
        this.verifierSucces(x); Sauve.ecrire();
        Menus.choixGlyphe(run, x);
      } else {
        run.score = run.k - 1;
        Menus.finOdyssee(run, x);
      }
      return;
    }
    Menus.fin(J, x);
  },
  RANGS: [[0, 'Poussière d’étoile'], [40, 'Météore'], [120, 'Comète'], [280, 'Étoile filante'], [550, 'Astre'], [950, 'Supernova'], [1600, 'Nébuleuse'], [2600, 'Galaxie'], [4200, 'Amas stellaire'], [7000, 'Univers']],
  // points de talent : uniquement ce qui demande du savoir-faire (colosses vaincus, étoiles, meilleure Odyssée)
  talent: function () {
    var S = Sauve.d, p = 0, r = S.ascension.rec;
    for (var k in r) if (r[k].victoires) p += 10 + Math.floor(+k / 5) + 4 * (r[k].etoiles - 1);
    p += S.odyssee.meilleur * 12;
    return p;
  },
  rang: function () {
    var p = this.talent(), R = this.RANGS, i = 0;
    while (i + 1 < R.length && p >= R[i + 1][0]) i++;
    var suiv = R[i + 1];
    return { points: p, nom: R[i][1], niveau: i + 1, suivant: suiv ? suiv[1] : null, prog: suiv ? (p - R[i][0]) / (suiv[0] - R[i][0]) : 1, manque: suiv ? suiv[0] - p : 0 };
  },
  nbEtoiles: function (min) { var n = 0, r = Sauve.d.ascension.rec; for (var k in r) if (r[k].etoiles >= min) n++; return n; },
  totalEtoiles: function () { var n = 0, r = Sauve.d.ascension.rec; for (var k in r) n += r[k].etoiles || 0; return n; },
  verifierSucces: function (x) {
    var S = Sauve.d;
    for (var i = 0; i < SUCCES.length; i++) {
      var s = SUCCES[i];
      if (S.succes[s.id]) continue;
      var ok = false; try { ok = s.test(S, x); } catch (e) { ok = false; }
      if (ok) { S.succes[s.id] = Date.now(); Menus.toast('Succès : ' + s.nom, s.desc); Son.sfx('succes'); if (x) x.nouveau.push(s.id); }
    }
    // couleurs débloquées par les étoiles
    var et = this.totalEtoiles();
    for (var c = 0; c < COULEURS_COMETE.length; c++) {
      var cl = COULEURS_COMETE[c], cle = 'coul' + c;
      if (cl.etoiles > 0 && et >= cl.etoiles && !S.succes[cle]) { S.succes[cle] = Date.now(); Menus.toast('Nouvelle couleur de comète', cl.nom + ' (Collection)'); }
    }
  },
  defiJour: function () {
    var n = numJour(), liste = ['rapide', 'courte', 'fragile', 'fureur', 'nuit', 'boucliers', 'geant'];
    return { n: n, d: 9 + (n % 6) * 3, graine: n * 131 + 7, mut: liste[n % liste.length] };
  },
  nouvelleOdyssee: function () {
    var S = Sauve.d; S.odyssee.parties++; Sauve.ecrire();
    var run = { k: 1, score: 0, coeurs: 3, coeursMax: 3, mods: {}, graine: (Date.now() % 1e6) | 0, choix: [] };
    this.lancer({ mode: 'odyssee', run: run });
  },
  prendreGlyphe: function (run, id) {
    run.mods[id] = (run.mods[id] || 0) + 1;
    if (id === 'coeur') { run.coeursMax++; run.coeurs = Math.min(run.coeursMax, run.coeurs + 1); }
    run.choix.push(id);
    run.k++;
    this.lancer({ mode: 'odyssee', run: run });
  },
  tirerGlyphes: function (run) {
    var R = rngGraine(run.graine + run.k * 77), dispo = [];
    for (var k in GLYPHES) if ((run.mods[k] || 0) < GLYPHES[k].max) dispo.push(k);
    R.melange(dispo);
    return dispo.slice(0, 3);
  }
};
