'use strict';
/* PULSAR — menus (HTML par-dessus le canvas) */

function pluriel(n, un, plus) { return n + ' ' + (n > 1 ? plus : un); }

var Menus = {
  el: null, retour: null, page: null,
  init: function () { this.el = document.getElementById('ecran'); },
  montrer: function (html, cls) {
    var e = this.el; e.className = 'visible ' + (cls || ''); e.innerHTML = html;
    var self = this;
    e.querySelectorAll('[data-a]').forEach(function (b) {
      b.addEventListener('click', function (ev) { ev.stopPropagation(); Son.init(); Son.sfx('clic'); self.action(b.getAttribute('data-a'), b); });
      b.addEventListener('pointerenter', function () { Son.sfx('survol'); });
    });
    var p = e.querySelector('.principal'); if (p) setTimeout(function () { try { p.focus({ preventScroll: true }); } catch (er) { } }, 30);
  },
  cacher: function () { this.el.className = ''; this.el.innerHTML = ''; this.retour = null; this.page = null; },
  touche: function (e) {
    if (e.code === 'Escape') { e.preventDefault(); if (Jeu.etat === 'pause') { Jeu.reprendre(); return; } if (this.retour) this.retour(); return; }
    if (Jeu.etat === 'pause' && (e.code === 'KeyE')) { Jeu.basculerPratique(); Jeu.reprendre(); return; }
    if (Jeu.etat === 'pause' && e.code === 'KeyR') { Jeu.reprendre(); Jeu.recommencer(); return; }
    if ((e.code === 'Space' || e.code === 'Enter') && document.activeElement === document.body) {
      var p = this.el.querySelector('.principal'); if (p) { e.preventDefault(); p.click(); }
    }
    if (e.code === 'ArrowDown' || e.code === 'ArrowRight' || e.code === 'ArrowUp' || e.code === 'ArrowLeft') this.navigation(e);
  },
  navigation: function (e) {
    var b = Array.prototype.slice.call(this.el.querySelectorAll('button:not([disabled]), [data-a]'));
    if (!b.length) return;
    var i = b.indexOf(document.activeElement);
    var dir = (e.code === 'ArrowDown' || e.code === 'ArrowRight') ? 1 : -1;
    i = i < 0 ? 0 : (i + dir + b.length) % b.length;
    e.preventDefault(); b[i].focus();
  },
  manette: function (btn) { var a = document.activeElement; if (a && a.click && a !== document.body) a.click(); else { var p = this.el.querySelector('.principal'); if (p) p.click(); } },
  chargement: function (on) { document.getElementById('chargement').className = on ? '' : 'cache'; },
  erreur: function (m) { this.toast('Oups', m); this.accueil(); },
  toast: function (t, s) {
    var z = document.getElementById('toasts'), d = document.createElement('div');
    d.className = 'toast'; d.innerHTML = '<b>' + t + '</b>' + (s ? '<span>' + s + '</span>' : '');
    z.appendChild(d); setTimeout(function () { d.classList.add('part'); }, 3800); setTimeout(function () { d.remove(); }, 4400);
  },

  action: function (a, b) {
    var d = Sauve.d;
    var v = b.getAttribute('data-v');
    switch (a) {
      case 'accueil': this.accueil(); break;
      case 'jouer': Jeu.lancer({ type: 'parcours', n: d.parcours.debloque }); break;
      case 'niveau': Jeu.lancer({ type: 'parcours', n: +v }); break;
      case 'parcours': this.parcours(v != null ? +v : null); break;
      case 'passer': if (confirm('Passer le niveau ' + v + ' ? Il restera à finir plus tard (sans médaille).')) { d.parcours.debloque = Math.max(d.parcours.debloque, +v + 1); var r = d.parcours.niv[v] = d.parcours.niv[v] || { essais: 0, best: 0 }; r.passe = true; Sauve.ecrire(); this.parcours(); } break;
      case 'defis': this.defis(); break;
      case 'jour': Jeu.lancer({ type: 'jour' }); break;
      case 'semaine': Jeu.lancer({ type: 'semaine' }); break;
      case 'infini': this.infini(); break;
      case 'goInfini': Jeu.lancer({ type: 'infini', D: +v }); break;
      case 'atelier': this.atelier(); break;
      case 'atMode': this.atMode = v; this.atelier(); break;
      case 'atD': this.atD = +v; this.atelier(); break;
      case 'goAtelier': Jeu.lancer({ type: 'atelier', mode: this.atMode || 'cube', D: this.atD || 3 }); break;
      case 'collection': this.collection(); break;
      case 'ic': var parts = v.split(':'); if (b.classList.contains('verrou')) { this.toast('Verrouillé', b.getAttribute('title')); break; } d.icone[parts[0]] = +parts[1]; Sauve.ecrire(); this.collection(); break;
      case 'stats': this.stats(); break;
      case 'succes': this.succes(); break;
      case 'reglages': this.reglages(); break;
      case 'aide': this.aide(); break;
      case 'basc': d.reglages[v] = !d.reglages[v]; Sauve.ecrire(); if (Jeu.etat === 'pause') this.pause(Jeu.J); else this.reglages(); break;
      case 'effacer': if (confirm('Tout effacer ? Progression, records et collection seront perdus.')) { localStorage.removeItem(Sauve.cle); Sauve.charger(); this.accueil(); } break;
      case 'reprendre': Jeu.reprendre(); break;
      case 'recommencer': Jeu.reprendre(); Jeu.recommencer(); break;
      case 'pratique': Jeu.basculerPratique(); Jeu.reprendre(); break;
      case 'guide': Jeu.J.guide = !Jeu.J.guide; this.pause(Jeu.J); break;
      case 'quitter': Jeu.quitter(); break;
      case 'suivant': Jeu.lancer({ type: 'parcours', n: Jeu.J.cfg.n + 1 }); break;
      case 'rejouer': Jeu.lancer(Jeu.J.cfg); break;
      case 'menuFin': Jeu.quitter(); break;
      case 'finAide': d.tuto = true; Sauve.ecrire(); this.accueil(); break;
    }
  },

  entete: function (titre, retour) {
    return '<div class="entete"><button class="retour" data-a="' + (retour || 'accueil') + '">‹ Retour</button><h2>' + titre + '</h2></div>';
  },

  /* ---------- Accueil ---------- */
  accueil: function () {
    var d = Sauve.d; this.retour = null;
    if (!d.tuto) { this.aide(true); return; }
    var m = maitrise(), n = d.parcours.debloque;
    var et = etiquetteD(dParcours(n));
    var jr = d.defis.jour[dateJour()];
    var html = '<div class="accueil">' +
      '<div class="logo"><span>PULSAR</span><small>un battement, une touche, mille boss</small></div>' +
      '<div class="colonnes"><div class="col">' +
      '<button class="gros principal" data-a="jouer"><b>Jouer</b><span>Parcours · niveau ' + n + ' · <i style="color:' + et.c + '">' + et.nom + '</i></span></button>' +
      '<div class="ligne2"><button data-a="parcours">Niveaux</button><button data-a="defis">Défis' + (jr && jr.fini ? ' ✓' : ' <em>•</em>') + '</button></div>' +
      '<div class="ligne2"><button data-a="infini">Infini</button><button data-a="atelier">Atelier</button></div>' +
      '<div class="ligne3"><button data-a="collection">Collection</button><button data-a="stats">Statistiques</button><button data-a="succes">Succès</button></div>' +
      '<div class="ligne2"><button data-a="reglages">Réglages</button><button data-a="aide">Comment jouer</button></div>' +
      '</div><div class="col carte-m">' +
      '<div class="maitrise"><small>Maîtrise</small><b>' + m.toFixed(1) + '</b><span>' + titreMaitrise(m) + '</span></div>' +
      '<canvas id="apercu" width="300" height="90"></canvas>' +
      '<div class="petit">' + pluriel(niveauxFinis(d), 'niveau fini', 'niveaux finis') + ' · ' + pluriel(d.stats.essais, 'essai', 'essais') + ' · ' + Object.keys(d.succes).length + '/' + SUCCES.length + ' succès</div>' +
      '</div></div></div>';
    this.montrer(html, 'fond-leger');
    this.apercu();
  },
  apercu: function () {
    var cv = document.getElementById('apercu'); if (!cv) return;
    var ctx = cv.getContext('2d'), self = this;
    var t0 = performance.now();
    var f = function () {
      if (!document.getElementById('apercu')) return;
      var t = (performance.now() - t0) / 1000;
      ctx.clearRect(0, 0, cv.width, cv.height);
      MODES.forEach(function (m, i) {
        var y = 45 + Math.sin(t * 3 + i) * 6;
        dessinerJoueur(ctx, m, Sauve.d.icone, 32 + i * 59, y, 34, m === 'cube' || m === 'boule' ? t * 2 : Math.sin(t * 2 + i) * 0.3, 1);
      });
      requestAnimationFrame(f);
    };
    f();
  },

  /* ---------- Comment jouer ---------- */
  aide: function (premier) {
    this.retour = premier ? null : function () { Menus.accueil(); };
    var lignes = [
      ['cube', 'Cube', 'Appuie pour sauter. Tiens pour sauter dès que tu touches le sol.'],
      ['vaisseau', 'Vaisseau', 'Tiens pour monter, lâche pour descendre.'],
      ['boule', 'Boule', 'Appuie pour inverser la gravité (seulement au sol ou au plafond).'],
      ['onde', 'Onde', 'Tiens pour monter en diagonale, lâche pour descendre. Les murs tuent.'],
      ['ovni', 'Ovni', 'Chaque appui donne un petit bond.']
    ];
    var html = '<div class="panneau aide">' + (premier ? '<h2>Bienvenue dans Pulsar</h2>' : this.entete('Comment jouer')) +
      '<p class="intro">Une seule touche : <b>Espace</b>, <b>flèche haut</b>, <b>clic</b> ou <b>toucher l\'écran</b>. Le niveau défile en rythme avec sa musique ; un boss t\'attaque pendant ce temps. Atteins 100 % pour le vaincre. Un seul contact = recommencer, tout de suite.</p>' +
      '<div class="modes">' + lignes.map(function (l) { return '<div class="mode"><canvas data-mode="' + l[0] + '" width="64" height="64"></canvas><div><b>' + l[1] + '</b><span>' + l[2] + '</span></div></div>'; }).join('') + '</div>' +
      '<ul class="regles"><li>Les <b>portails</b> (grandes colonnes de lumière) changent ta forme ou ta vitesse.</li>' +
      '<li>Les <b>orbes</b> jaunes : appuie en passant dessus pour rebondir. Les <b>tampons</b> te propulsent tout seuls.</li>' +
      '<li>Les attaques du boss sont toujours <b>annoncées</b> (zones rouges qui clignotent) et toujours esquivables.</li>' +
      '<li>Les <b>éclats</b> bleus suivent la ligne parfaite : les ramasser tous donne une médaille.</li>' +
      '<li><b>E</b> : mode entraînement (points de contrôle automatiques, <b>C</b> poser, <b>X</b> retirer, <b>G</b> guide qui montre la trajectoire). <b>R</b> : recommencer. <b>Échap</b> : pause.</li>' +
      '<li>Chaque niveau est construit en le jouant : il est <b>toujours faisable</b>. Rien ne rend plus fort, seul ton talent progresse.</li></ul>' +
      '<button class="gros principal" data-a="' + (premier ? 'finAide' : 'accueil') + '"><b>' + (premier ? 'C\'est parti' : 'Compris') + '</b></button></div>';
    this.montrer(html);
    var t0 = performance.now();
    var f = function () {
      var cs = document.querySelectorAll('canvas[data-mode]'); if (!cs.length) return;
      var t = (performance.now() - t0) / 1000;
      cs.forEach(function (c) { var g = c.getContext('2d'); g.clearRect(0, 0, 64, 64); var m = c.getAttribute('data-mode'); dessinerJoueur(g, m, Sauve.d.icone, 32, 32 + Math.sin(t * 3) * 4, 40, m === 'cube' || m === 'boule' ? t * 2 : 0, 1); });
      requestAnimationFrame(f);
    };
    f();
  },

  /* ---------- Parcours ---------- */
  parcours: function (page) {
    var d = Sauve.d, self = this; this.retour = function () { self.accueil(); };
    var deb = d.parcours.debloque;
    if (page == null) page = Math.floor((deb - 1) / 20);
    this.pagePc = page;
    var html = '<div class="panneau large">' + this.entete('Parcours') +
      '<p class="petit">Sans fin : chaque niveau est un peu plus dur que le précédent. Tous les 10 niveaux, un grand boss. À partir du niveau 15, certains niveaux ont une variante (miroir, tête en bas, pénombre).</p>' +
      '<div class="grille-niv">';
    for (var n = page * 20 + 1; n <= page * 20 + 20; n++) {
      var r = d.parcours.niv[n] || {}, D = dParcours(n), et = etiquetteD(D), ok = n <= deb;
      var R = rngGraine(hashTexte('pulsar-parcours-' + n)), esp = especePour(n, R);
      html += '<button class="niv' + (ok ? '' : ' verrou') + (n % 10 === 0 ? ' grand' : '') + (r.fini ? ' fini' : '') + (n === deb ? ' courant principal' : '') + '" ' + (ok ? 'data-a="niveau" data-v="' + n + '"' : 'disabled') + '>' +
        '<canvas class="mini" data-esp="' + esp + '" width="56" height="56"></canvas>' +
        '<b>' + n + '</b><i style="color:' + et.c + '">' + et.nom + '</i>' +
        '<span class="med">' + (r.fini ? '<em class="or">★</em>' : '<em>☆</em>') + (r.parfait ? '<em class="bleu">◆</em>' : '<em>◇</em>') + '</span>' +
        '<span class="pc">' + (r.fini ? (r.eclatsMax || 0) + '/' + (r.eclatsTotal || '?') + ' éclats' : ok ? (r.best || 0) + ' %' : '') + (r.essais ? ' · ' + r.essais + ' essais' : '') + '</span>' +
        '</button>';
    }
    html += '</div><div class="pages">' +
      (page > 0 ? '<button data-a="parcours" data-v="' + (page - 1) + '">‹ ' + ((page - 1) * 20 + 1) + '–' + (page * 20) + '</button>' : '<span></span>') +
      '<span>Niveaux ' + (page * 20 + 1) + ' à ' + (page * 20 + 20) + '</span>' +
      (page * 20 + 20 < deb + 20 ? '<button data-a="parcours" data-v="' + (page + 1) + '">' + ((page + 1) * 20 + 1) + '–' + ((page + 2) * 20) + ' ›</button>' : '<span></span>') + '</div>';
    var rc = d.parcours.niv[deb];
    if (rc && rc.essais >= 30) html += '<div class="centre"><button class="discret" data-a="passer" data-v="' + deb + '">Bloqué ? Passer le niveau ' + deb + ' (' + rc.essais + ' essais)</button></div>';
    html += '</div>';
    this.montrer(html);
    this.minis();
  },
  minis: function () {
    document.querySelectorAll('canvas.mini').forEach(function (c) {
      var g = c.getContext('2d'), esp = c.getAttribute('data-esp');
      g.save(); g.translate(28, 28);
      (DESSINS_BOSS[esp] || DESSINS_BOSS.oeil)(g, 7, { t: 1, pulse: 0, vie: 1, coup: 0, mort: 0, regard: Math.PI, charge: 0 }, ESPECES[esp]);
      g.restore();
    });
  },

  /* ---------- Défis ---------- */
  defis: function () {
    var d = Sauve.d, self = this; this.retour = function () { self.accueil(); };
    var j = d.defis.jour[dateJour()] || {}, s = d.defis.semaine[numSemaine()] || {};
    var Dj = dDefi('jour'), Ds = dDefi('semaine');
    var gj = hashTexte('pulsar-jour-' + dateJour()), espj = ORDRE_ESPECES[Math.floor(rngGraine(gj)() * 7)];
    var html = '<div class="panneau">' + this.entete('Défis') +
      '<div class="cartes">' +
      '<div class="carte"><h3>Défi du jour</h3><canvas class="mini" data-esp="' + espj + '" width="56" height="56"></canvas><p>' + nomBoss(espj, gj) + '</p>' +
      '<p class="petit">Un nouveau niveau chaque jour, adapté à ta maîtrise (difficulté ' + Dj.toFixed(1) + ' · ' + etiquetteD(Dj).nom + ').</p>' +
      '<p>' + (j.fini ? '<b class="or">★ Réussi</b> en ' + (j.essaisFin || j.essais) + ' essais' : 'Record : ' + (j.best || 0) + ' % · ' + (j.essais || 0) + ' essais') + '</p>' +
      '<p class="petit">Série : <b>' + d.defis.serie + '</b> jour' + (d.defis.serie > 1 ? 's' : '') + '</p>' +
      '<button class="gros principal" data-a="jour"><b>' + (j.fini ? 'Rejouer' : 'Jouer') + '</b></button></div>' +
      '<div class="carte"><h3>Défi de la semaine</h3><canvas class="mini" data-esp="neant" width="56" height="56"></canvas><p>Le grand marathon</p>' +
      '<p class="petit">Un niveau de 2 min 30 contre un grand boss, un peu au-dessus de ta maîtrise (difficulté ' + Ds.toFixed(1) + ' · ' + etiquetteD(Ds).nom + ').</p>' +
      '<p>' + (s.fini ? '<b class="or">★ Réussi</b> en ' + (s.essaisFin || s.essais) + ' essais' : 'Record : ' + (s.best || 0) + ' % · ' + (s.essais || 0) + ' essais') + '</p>' +
      '<button class="gros" data-a="semaine"><b>' + (s.fini ? 'Rejouer' : 'Jouer') + '</b></button></div>' +
      '</div></div>';
    this.montrer(html);
    this.minis();
  },

  /* ---------- Infini ---------- */
  infini: function () {
    var d = Sauve.d, self = this; this.retour = function () { self.accueil(); };
    var m = Math.max(1, maitrise());
    var choix = [1, 3, 6, 10, 15, 22, 30].filter(function (x) { return x <= Math.max(3, m + 2); });
    var html = '<div class="panneau">' + this.entete('Infini') +
      '<p>Un niveau sans fin qui accélère et se durcit peu à peu. Les boss se relaient. Une seule vie : va le plus loin possible.</p>' +
      '<p class="record">Record : <b>' + d.infini.record + ' m</b>' + (d.infini.recordD ? ' (atteint à la difficulté ' + d.infini.recordD.toFixed(1) + ')' : '') + '</p>' +
      '<p class="petit">Difficulté de départ :</p><div class="choix">' +
      choix.map(function (x, i) { var e = etiquetteD(x); return '<button ' + (i === 0 ? 'class="principal" ' : '') + 'data-a="goInfini" data-v="' + x + '"><b style="color:' + e.c + '">' + e.nom + '</b><span>' + x + '</span></button>'; }).join('') +
      '</div></div>';
    this.montrer(html);
  },

  /* ---------- Atelier ---------- */
  atelier: function () {
    var d = Sauve.d, self = this; this.retour = function () { self.accueil(); };
    var mode = this.atMode || 'cube', D = this.atD || 3;
    var crans = [1, 2, 3, 4, 6, 8, 10, 13, 16, 20, 25, 30, 40];
    var html = '<div class="panneau">' + this.entete('Atelier') +
      '<p>Entraîne une seule forme, sans boss, à la difficulté de ton choix. Idéal pour travailler ton point faible.</p>' +
      '<div class="choix modes-at">' + MODES.map(function (m) { var r = d.atelier[m] || {}, best = 0; for (var k in r) best = Math.max(best, r[k]); return '<button class="' + (m === mode ? 'actif' : '') + '" data-a="atMode" data-v="' + m + '"><canvas data-mode="' + m + '" width="44" height="44"></canvas><b>' + NOMS_MODE[m] + '</b><span>' + (best ? best + ' m' : '—') + '</span></button>'; }).join('') + '</div>' +
      '<p class="petit">Difficulté :</p><div class="choix crans">' + crans.map(function (x) { var e = etiquetteD(x), r = (d.atelier[mode] || {})[x]; return '<button class="' + (x === D ? 'actif' : '') + '" data-a="atD" data-v="' + x + '"><b style="color:' + e.c + '">' + x + '</b><span>' + (r ? r + ' m' : '') + '</span></button>'; }).join('') + '</div>' +
      '<p class="petit">' + etiquetteD(D).nom + ' · morts dans cette forme : ' + (d.stats.morts[mode] || 0) + '</p>' +
      '<button class="gros principal" data-a="goAtelier"><b>Lancer : ' + NOMS_MODE[mode] + ' · ' + D + '</b></button></div>';
    this.montrer(html);
    document.querySelectorAll('canvas[data-mode]').forEach(function (c) { var g = c.getContext('2d'); var m = c.getAttribute('data-mode'); dessinerJoueur(g, m, Sauve.d.icone, 22, 22, 28, 0, 1); });
  },

  /* ---------- Collection ---------- */
  collection: function () {
    var d = Sauve.d, ic = d.icone, self = this; this.retour = function () { self.accueil(); };
    var tuile = function (type, i, ok, cond, actif, inner) { return '<button class="tuile' + (ok ? '' : ' verrou') + (actif ? ' actif' : '') + '" data-a="ic" data-v="' + type + ':' + i + '" title="' + cond + '">' + inner + '</button>'; };
    var html = '<div class="panneau large">' + this.entete('Collection') +
      '<p class="petit">Tout est esthétique : rien ne rend plus fort. Les objets verrouillés se gagnent en jouant (survole ou touche pour voir comment).</p>' +
      '<canvas id="apercu" width="300" height="90"></canvas>' +
      '<h3>Icône</h3><div class="tuiles">';
    for (var i = 0; i < NB_CUBES; i++) { var c = condCube(i); html += tuile('cube', i, c.ok(d), c.txt, ic.cube === i, '<canvas class="cub" data-cube="' + i + '" width="40" height="40"></canvas>'); }
    html += '</div><h3>Couleur principale</h3><div class="tuiles">';
    for (var j = 0; j < COULEURS.length; j++) { var cc = condCouleur(j); html += tuile('c1', j, cc.ok(d), cc.txt, ic.c1 === j, '<i style="background:' + COULEURS[j] + '"></i>'); }
    html += '</div><h3>Couleur secondaire</h3><div class="tuiles">';
    for (var j2 = 0; j2 < COULEURS.length; j2++) { var c2 = condCouleur(j2); html += tuile('c2', j2, c2.ok(d), c2.txt, ic.c2 === j2, '<i style="background:' + COULEURS[j2] + '"></i>'); }
    html += '</div><h3>Traînée</h3><div class="tuiles larges">';
    for (var t = 0; t < TRAINEES.length; t++) { var ct = condTrainee(t); html += tuile('trainee', t, ct.ok(d), ct.txt, ic.trainee === t, '<span>' + TRAINEES[t] + '</span>'); }
    html += '</div><h3>Explosion</h3><div class="tuiles larges">';
    for (var x = 0; x < EXPLOSIONS.length; x++) { var cx = condExplosion(x); html += tuile('explosion', x, cx.ok(d), cx.txt, ic.explosion === x, '<span>' + EXPLOSIONS[x] + '</span>'); }
    html += '</div></div>';
    this.montrer(html);
    document.querySelectorAll('canvas.cub').forEach(function (c) { var g = c.getContext('2d'); g.translate(20, 20); dessinerCube(g, +c.getAttribute('data-cube'), COULEURS[ic.c1], COULEURS[ic.c2], 30); });
    this.apercu();
  },

  /* ---------- Statistiques ---------- */
  stats: function () {
    var d = Sauve.d, s = d.stats, self = this; this.retour = function () { self.accueil(); };
    var h = Math.floor(s.temps / 3600), mi = Math.floor(s.temps % 3600 / 60);
    var morts = MODES.map(function (m) { return [m, s.morts[m] || 0]; });
    var max = Math.max.apply(null, morts.map(function (x) { return x[1]; }).concat([1]));
    var tot = morts.reduce(function (a, x) { return a + x[1]; }, 0);
    var pire = morts.slice().sort(function (a, b) { return b[1] - a[1]; })[0];
    var causes = { pique: 'Piques', mur: 'Murs', bloc: 'Blocs', scie: 'Scies', boss: 'Attaques du boss' };
    var m = maitrise();
    var html = '<div class="panneau">' + this.entete('Statistiques') +
      '<div class="stats">' +
      '<div><b>' + m.toFixed(1) + '</b><span>Maîtrise · ' + titreMaitrise(m) + '</span></div>' +
      '<div><b>' + niveauxFinis(d) + '</b><span>niveaux finis</span></div>' +
      '<div><b>' + s.essais + '</b><span>essais</span></div>' +
      '<div><b>' + h + ' h ' + mi + '</b><span>temps de jeu</span></div>' +
      '<div><b>' + s.sauts + '</b><span>sauts et bascules</span></div>' +
      '<div><b>' + s.eclats + '</b><span>éclats ramassés</span></div>' +
      '<div><b>' + s.grandsBoss + '</b><span>grands boss vaincus</span></div>' +
      '<div><b>' + nbParfaits(d) + '</b><span>niveaux parfaits</span></div>' +
      '<div><b>' + d.infini.record + ' m</b><span>record Infini</span></div>' +
      '</div><h3>Morts par forme</h3><div class="barres">' +
      morts.map(function (x) { return '<div class="barre"><span>' + NOMS_MODE[x[0]] + '</span><i style="width:' + (x[1] / max * 100) + '%;background:' + COUL_MODE[x[0]] + '"></i><b>' + x[1] + (tot ? ' (' + Math.round(x[1] / tot * 100) + ' %)' : '') + '</b></div>'; }).join('') + '</div>' +
      (tot > 20 ? '<p class="conseil">Ton point faible : <b>' + NOMS_MODE[pire[0]] + '</b>. Essaie l\'Atelier dans cette forme.</p>' : '') +
      '<h3>Causes</h3><div class="barres">' + Object.keys(causes).map(function (c) { var v = s.causes[c] || 0; return '<div class="barre"><span>' + causes[c] + '</span><i style="width:' + (v / Math.max(1, tot) * 100) + '%"></i><b>' + v + '</b></div>'; }).join('') + '</div>' +
      '</div>';
    this.montrer(html);
  },

  /* ---------- Succès ---------- */
  succes: function () {
    var d = Sauve.d, self = this; this.retour = function () { self.accueil(); };
    var n = Object.keys(d.succes).length;
    var html = '<div class="panneau large">' + this.entete('Succès · ' + n + ' / ' + SUCCES.length) + '<div class="liste-succes">' +
      SUCCES.map(function (s) { var ok = d.succes[s[0]]; return '<div class="succes' + (ok ? ' ok' : '') + '"><b>' + (ok ? '★ ' : '') + s[1] + '</b><span>' + s[2] + '</span></div>'; }).join('') + '</div></div>';
    this.montrer(html);
  },

  /* ---------- Réglages ---------- */
  reglages: function () {
    var d = Sauve.d, r = d.reglages, self = this; this.retour = function () { self.accueil(); };
    var bascule = function (k, t, s) { return '<button class="bascule' + (r[k] ? ' on' : '') + '" data-a="basc" data-v="' + k + '"><b>' + t + '</b><span>' + s + '</span><i>' + (r[k] ? 'Oui' : 'Non') + '</i></button>'; };
    var html = '<div class="panneau">' + this.entete('Réglages') +
      '<label class="curseur">Musique <input type="range" min="0" max="1" step="0.05" value="' + r.musique + '" data-k="musique"></label>' +
      '<label class="curseur">Bruitages <input type="range" min="0" max="1" step="0.05" value="' + r.sons + '" data-k="sons"></label>' +
      bascule('frappes', 'Frappes', 'Un petit coup de percussion à chaque appui de la trajectoire parfaite') +
      bascule('guide', 'Guide en entraînement', 'Montre la trajectoire parfaite pendant l\'entraînement') +
      bascule('secousses', 'Secousses', 'L\'écran tremble aux impacts') +
      bascule('particules', 'Particules', 'Étincelles et explosions') +
      bascule('fps', 'Images par seconde', 'Affiche la fluidité en bas à droite') +
      '<p class="petit">Touches : Espace / flèche haut / Z / W / clic / toucher = action · Échap ou P = pause · R = recommencer · E = entraînement · manette : bouton A.</p>' +
      '<button class="discret danger" data-a="effacer">Tout effacer</button></div>';
    this.montrer(html);
    this.el.querySelectorAll('input[type=range]').forEach(function (inp) {
      inp.addEventListener('input', function () { r[inp.getAttribute('data-k')] = +inp.value; Sauve.ecrire(); Son.init(); Son.volumes(); });
    });
  },

  /* ---------- Pause ---------- */
  pause: function (J) {
    this.retour = function () { Jeu.reprendre(); };
    var c = J.cfg, titre = c.type === 'parcours' ? 'Niveau ' + c.n : c.type === 'jour' ? 'Défi du jour' : c.type === 'semaine' ? 'Défi de la semaine' : c.type === 'infini' ? 'Infini' : 'Atelier';
    var pc = J.L.infini ? Math.floor(J.p.x) + ' m' : Math.floor(Math.min(100, J.p.x / J.L.fin * 100)) + ' %';
    var html = '<div class="panneau petitp">' +
      '<h2>Pause</h2><p>' + titre + (J.nomBoss ? ' · ' + (J.grand ? 'grand boss ' : '') + J.nomBoss : '') + '</p>' +
      '<p class="petit">' + pc + ' · essai ' + J.essai + (J.meilleur ? ' · record ' + J.meilleur + ' %' : '') + '</p>' +
      '<button class="gros principal" data-a="reprendre"><b>Reprendre</b></button>' +
      '<div class="ligne2"><button data-a="recommencer">Recommencer (R)</button><button data-a="pratique">' + (J.pratique ? 'Quitter l\'entraînement' : 'Entraînement (E)') + '</button></div>' +
      (J.pratique ? '<div class="ligne2"><button data-a="guide">Guide : ' + (J.guide ? 'oui' : 'non') + ' (G)</button><span class="petit">C : poser un point · X : retirer</span></div>' : '') +
      '<button data-a="quitter">Quitter</button></div>';
    this.montrer(html, 'sombre');
  },

  /* ---------- Fin de niveau ---------- */
  fin: function (J) {
    var r = J.resultat || {}, c = J.cfg, d = Sauve.d, self = this;
    this.retour = function () { Jeu.quitter(); };
    var parfait = r.eclats === r.eclatsTotal && r.eclatsTotal > 0;
    var titre = r.pratique ? 'Terminé en entraînement' : c.type === 'parcours' && c.n % 10 === 0 ? 'Grand boss vaincu !' : 'Boss vaincu !';
    var rang = r.eclatsTotal ? (parfait ? 'S' : r.eclats / r.eclatsTotal >= 0.9 ? 'A' : r.eclats / r.eclatsTotal >= 0.7 ? 'B' : r.eclats / r.eclatsTotal >= 0.4 ? 'C' : 'D') : '';
    var html = '<div class="panneau petitp fin">' +
      '<h2 class="victoire">' + titre + '</h2><p>' + (J.nomBoss || '') + '</p>' +
      (r.pratique ? '<p class="petit">Maintenant, essaie-le d\'une traite en mode normal !</p>' : '<div class="rang rang-' + rang + '">' + rang + '</div>') +
      '<div class="stats"><div><b>' + r.essais + '</b><span>essai' + (r.essais > 1 ? 's' : '') + '</span></div>' +
      '<div><b>' + r.eclats + ' / ' + r.eclatsTotal + '</b><span>éclats</span></div>' +
      '<div><b>' + etiquetteD(J.D).nom + '</b><span>difficulté ' + J.D.toFixed(1) + '</span></div></div>' +
      (!r.pratique ? '<p class="medailles"><em class="or">★</em> Victoire ' + (parfait ? ' · <em class="bleu">◆</em> Ligne parfaite !' : ' · <em>◇</em> tous les éclats : à toi de jouer') + '</p>' : '') +
      (c.type === 'parcours' && !r.pratique ? '<button class="gros principal" data-a="suivant"><b>Niveau ' + (c.n + 1) + '</b><span>' + etiquetteD(dParcours(c.n + 1)).nom + '</span></button>' : '') +
      '<div class="ligne2"><button ' + (c.type !== 'parcours' || r.pratique ? 'class="principal" ' : '') + 'data-a="rejouer">Rejouer</button><button data-a="menuFin">Menu</button></div>' +
      '</div>';
    this.montrer(html, 'sombre');
  }
};
