'use strict';
/* COMÈTE — menus (HTML par-dessus le canvas) */

var Menus = {
  el: null, retour: null, pageAsc: null, ent: { n: 1, invincible: true, lent: false },
  init: function () { this.el = document.getElementById('ecran'); },
  montrer: function (html, cls, retour) {
    var e = this.el; e.className = 'visible ' + (cls || ''); e.innerHTML = html; e.scrollTop = 0;
    this.retour = retour || null;
    var self = this;
    e.querySelectorAll('[data-a]').forEach(function (b) {
      b.addEventListener('click', function (ev) { ev.stopPropagation(); Son.init(); Son.sfx('clic'); self.action(b.getAttribute('data-a'), b); });
      b.addEventListener('pointerenter', function () { Son.sfx('survol'); });
    });
    e.querySelectorAll('input[type=range]').forEach(function (r) {
      r.addEventListener('input', function () { Sauve.d.reglages[r.name] = +r.value / 100; Sauve.ecrire(); Son.volumes(); });
    });
    var p = e.querySelector('.principal'); if (p) setTimeout(function () { try { p.focus({ preventScroll: true }); } catch (er) { } }, 30);
  },
  cacher: function () { this.el.className = ''; this.el.innerHTML = ''; this.retour = null; },
  touche: function (e) {
    if (e.code === 'Escape') { e.preventDefault(); if (Jeu.etat === 'pause') { Jeu.reprendre(); return; } if (this.retour) this.retour(); return; }
    if (Jeu.etat === 'pause' && e.code === 'KeyR') { this.action('recommencer'); return; }
    if (Jeu.etat === 'fin' && e.code === 'KeyR') { var r = this.el.querySelector('[data-a=rejouer]'); if (r) { e.preventDefault(); r.click(); return; } }
    if ((e.code === 'Space' || e.code === 'Enter') && (document.activeElement === document.body || !document.activeElement || !this.el.contains(document.activeElement))) {
      var p = this.el.querySelector('.principal'); if (p) { e.preventDefault(); p.click(); }
    }
    if (e.code === 'ArrowDown' || e.code === 'ArrowRight' || e.code === 'ArrowUp' || e.code === 'ArrowLeft') this.navigation(e);
  },
  navigation: function (e) {
    var b = Array.prototype.slice.call(this.el.querySelectorAll('button:not([disabled])'));
    if (!b.length) return;
    var i = b.indexOf(document.activeElement);
    var dir = (e.code === 'ArrowDown' || e.code === 'ArrowRight') ? 1 : -1;
    i = i < 0 ? 0 : (i + dir + b.length) % b.length;
    e.preventDefault(); b[i].focus();
  },
  manette: function (btn) {
    if (btn === 'b') { if (Jeu.etat === 'pause') Jeu.reprendre(); else if (this.retour) this.retour(); return; }
    if (btn === 'start' && Jeu.etat === 'pause') { Jeu.reprendre(); return; }
    var a = document.activeElement; if (a && a.click && a !== document.body && this.el.contains(a)) a.click(); else { var p = this.el.querySelector('.principal'); if (p) p.click(); }
  },
  toast: function (t, s) {
    var z = document.getElementById('toasts'), d = document.createElement('div');
    d.className = 'toast'; d.innerHTML = '<b>' + t + '</b>' + (s ? '<span>' + s + '</span>' : '');
    z.appendChild(d); setTimeout(function () { d.classList.add('part'); }, 3800); setTimeout(function () { d.remove(); }, 4400);
  },
  etoiles: function (n, max) { var s = ''; for (var i = 0; i < (max || 3); i++) s += '<em class="' + (i < n ? 'on' : '') + '">★</em>'; return '<span class="etoiles">' + s + '</span>'; },

  action: function (a, b) {
    var d = Sauve.d, v = b ? b.getAttribute('data-v') : null, self = this;
    switch (a) {
      case 'accueil': this.accueil(); break;
      case 'jouer': Jeu.lancer({ mode: 'ascension', n: Math.min(d.ascension.debloque, this.maxAsc()) }); break;
      case 'asc': this.ascension(v != null ? +v : null); break;
      case 'colosse': Jeu.lancer({ mode: 'ascension', n: +v }); break;
      case 'odyssee': this.odyssee(); break;
      case 'goOdyssee': Jeu.nouvelleOdyssee(); break;
      case 'jour': this.jour(); break;
      case 'goJour': Jeu.lancer({ mode: 'jour' }); break;
      case 'entrainement': this.entrainement(); break;
      case 'entN': this.ent.n = clamp(this.ent.n + (+v), 1, this.maxAsc()); this.entrainement(); break;
      case 'entB': this.ent[v] = !this.ent[v]; this.entrainement(); break;
      case 'goEnt': Jeu.lancer({ mode: 'entrainement', n: this.ent.n, invincible: this.ent.invincible, lent: this.ent.lent }); break;
      case 'aide': this.aide(); break;
      case 'collection': this.collection(); break;
      case 'coul': if (b.classList.contains('verrou')) { this.toast('Verrouillé', b.getAttribute('title')); break; } d.cosmetique.couleur = +v; Sauve.ecrire(); this.collection(); break;
      case 'trai': if (b.classList.contains('verrou')) { this.toast('Verrouillé', b.getAttribute('title')); break; } d.cosmetique.trainee = +v; Sauve.ecrire(); this.collection(); break;
      case 'succes': this.succes(); break;
      case 'stats': this.stats(); break;
      case 'reglages': this.reglages(); break;
      case 'basc': d.reglages[v] = d.reglages[v] ? 0 : 1; Sauve.ecrire(); if (Jeu.etat === 'pause') this.pause(); else this.reglages(); break;
      case 'effacer': if (confirm('Tout effacer ? Progression, records et collection seront perdus.')) { try { localStorage.removeItem(Sauve.cle); } catch (e) { } Sauve.charger(); this.accueil(); } break;
      case 'reprendre': Jeu.reprendre(); break;
      case 'recommencer': Jeu.reprendre(); Jeu.recommencer(); break;
      case 'quitter': Jeu.quitter(); break;
      case 'suivant': Jeu.lancer({ mode: 'ascension', n: Jeu.J.cfg.n + 1 }); break;
      case 'rejouer': if (Jeu.J.cfg.mode === 'odyssee') Jeu.nouvelleOdyssee(); else Jeu.lancer(Jeu.J.cfg); break;
      case 'versEnt': this.ent.n = Jeu.J.cfg.n; Jeu.quitter(); this.entrainement(); break;
      case 'glyphe': Son.sfx('choix'); Jeu.prendreGlyphe(Jeu.J.cfg.run, v); break;
    }
  },
  maxAsc: function () { return Math.max(1, Sauve.d.ascension.debloque); },

  /* ---------- accueil ---------- */
  accueil: function () {
    var d = Sauve.d, n = d.ascension.debloque, def = colosseAscension(n), dj = Jeu.defiJour();
    var nbS = 0; for (var k in d.succes) if (k.indexOf('coul') !== 0) nbS++;
    var jourFait = d.jour.date === dateJour() && d.jour.meilleur != null;
    var html = '<div class="accueil">' +
      '<div class="logo"><span>COMÈTE</span><small>Encercle les colosses</small></div>' +
      (function () { var r = Jeu.rang(); return '<div class="rang" title="Les points de talent viennent des colosses vaincus, des étoiles et de ta meilleure Odyssée."><b>' + r.nom + '</b><span>rang ' + r.niveau + ' · ' + r.points + ' points de talent</span><i><em style="width:' + Math.round(r.prog * 100) + '%"></em></i>' + (r.suivant ? '<small>encore ' + r.manque + ' pour « ' + r.suivant + ' »</small>' : '') + '</div>'; })() +
      '<button class="gros principal" data-a="jouer"><b>' + (n === 1 && !d.tuto ? 'Commencer' : 'Jouer') + '</b><span>' + (def.titan ? 'TITAN ' : 'Colosse ') + n + ' · ' + def.nom + ', ' + def.epithete + '</span></button>' +
      '<div class="ligne3">' +
      '<button data-a="odyssee" class="mode-btn"><b>Odyssée</b><span>Record : ' + pluriel(d.odyssee.meilleur, 'colosse') + '</span></button>' +
      '<button data-a="jour" class="mode-btn' + (jourFait ? '' : ' nouveau') + '"><b>Défi du jour</b><span>' + (dj.mut === 'geant' ? 'Titan géant' : MUTATEURS[dj.mut].nom) + (jourFait ? ' · ✓ ' + fmtTemps(d.jour.meilleur) : ' · à faire') + '</span></button>' +
      '<button data-a="asc" class="mode-btn"><b>Ascension</b><span>' + Jeu.totalEtoiles() + ' ★ · colosse ' + n + '</span></button>' +
      '</div>' +
      '<div class="ligne3 petitsb">' +
      '<button data-a="entrainement">Entraînement</button><button data-a="aide">Comment jouer</button><button data-a="collection">Collection</button>' +
      '<button data-a="succes">Succès ' + nbS + '/' + SUCCES.length + '</button><button data-a="stats">Statistiques</button><button data-a="reglages">Réglages</button>' +
      '</div>' +
      '<p class="petit centre">Souris, clavier, manette ou tactile · Échap : pause · R : recommencer</p>' +
      '</div>';
    this.montrer(html, 'fond-leger');
  },

  aide: function () {
    var html = '<div class="panneau aide"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Comment jouer</h2></div>' +
      '<p class="intro">Tu es une <b class="bleu">comète</b> qui laisse une traînée de lumière. Quand ta traînée se recroise, elle forme une <b>boucle</b> : tout ce qui est à l\'intérieur est frappé.</p>' +
      '<div class="regles2">' +
      '<div><b>🎯 Frapper</b><span>Fais le tour d\'un <b>noyau</b> (cristal brillant relié au colosse) jusqu\'à recroiser ta traînée. Plus tu enchaînes vite, plus le <b>combo</b> monte (+5 % par boucle, jusqu\'à ×2,5).</span></div>' +
      '<div><b>💥 Achever</b><span>Quand tous les noyaux sont brisés, le <b>cœur</b> du colosse s\'échappe et fuit dans l\'arène : encercle-le pour gagner.</span></div>' +
      '<div><b>🔴 Esquiver</b><span>Les balles rouges, mines, traqueurs, lasers, ondes, murs et météores te blessent. Tu as 3 cœurs. Chaque attaque est annoncée juste avant, en rythme avec la musique.</span></div>' +
      '<div><b>✂️ Attention</b><span>Les attaques <b>blanches</b> (lasers, ondes, murs) <b>coupent ta traînée</b> : ta boucle en cours est perdue.</span></div>' +
      '<div><b>⭐ Supernova</b><span>Entoure des balles, des mines ou des traqueurs pour les détruire et remplir la jauge. Pleine, ta prochaine boucle qui frappe fait <b>×3</b> et efface toutes les balles.</span></div>' +
      '<div><b>⚡ Élan</b><span>Clic, Espace ou bouton A : un bond très rapide. Pendant l\'élan, rien ne te touche. Il se recharge en moins d\'une seconde (cercle autour de la comète).</span></div>' +
      '<div><b>🎵 Bonus</b><span><b>PILE !</b> : boucle fermée pile sur le temps de la musique (×1,5). <b>SERRÉ</b> : petite boucle (×1,3).</span></div>' +
      '<div><b>🎮 Commandes</b><span>Souris (la comète suit le curseur), flèches ou ZQSD, manette (stick gauche), ou doigt (glisser n\'importe où ; toucher rapide = élan).</span></div>' +
      '</div>' +
      '<h3>Les modes</h3>' +
      '<p><b>Ascension</b> : des colosses toujours plus forts, chacun toujours identique pour que tu puisses l\'apprendre. Un <b>Titan</b> tous les 10. ★ = vaincu, ★★ = touché une fois au plus, ★★★ = sans être touché.<br>' +
      '<b>Odyssée</b> : enchaîne des colosses inconnus avec 3 cœurs pour toute la partie. Après chaque victoire, tu récupères un cœur et tu choisis un <b>pouvoir</b> parmi trois.<br>' +
      '<b>Défi du jour</b> : un colosse et une règle spéciale qui changent chaque jour.<br>' +
      '<b>Entraînement</b> : rejoue n\'importe quel colosse débloqué, sans perdre de cœur ou au ralenti.</p>' +
      '<button class="principal" data-a="accueil">Compris !</button></div>';
    this.montrer(html, '', function () { Menus.accueil(); });
  },

  /* ---------- Ascension ---------- */
  ascension: function (page) {
    var d = Sauve.d, max = d.ascension.debloque, parPage = 20;
    if (page == null) page = Math.floor((max - 1) / parPage);
    page = Math.max(0, page);
    var html = '<div class="panneau large"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Ascension</h2><span class="petit">' + Jeu.totalEtoiles() + ' ★ · ' + pluriel(max - 1, 'colosse vaincu', 'colosses vaincus') + '</span></div><div class="grille-col">';
    for (var n = page * parPage + 1; n <= (page + 1) * parPage; n++) {
      var r = d.ascension.rec[n], ouvert = n <= max, def = colosseAscension(n);
      var cls = 'col' + (def.titan ? ' titan' : '') + (n === max ? ' courant' : '') + (r && r.victoires ? ' fini' : '') + (ouvert ? '' : ' verrou');
      html += '<button class="' + cls + '" ' + (ouvert ? 'data-a="colosse" data-v="' + n + '"' : 'disabled') + ' style="--h:' + def.teinte + ';--h2:' + def.teinte2 + '">' +
        '<i class="pastille"></i><b>' + (def.titan ? 'TITAN ' : '') + n + '</b><span class="nom">' + (ouvert ? def.nom : '???') + '</span>' +
        this.etoiles(r ? r.etoiles : 0) +
        '<span class="pc">' + (r ? (r.victoires ? fmtTemps(r.temps) : Math.floor(r.pct * 100) + ' %') + ' · ' + pluriel(r.essais, 'essai') : (ouvert ? 'Nouveau' : '')) + '</span></button>';
    }
    html += '</div><div class="pages"><button data-a="asc" data-v="' + (page - 1) + '"' + (page ? '' : ' disabled') + '>← Précédents</button><span class="petit">' + (page * parPage + 1) + ' – ' + ((page + 1) * parPage) + '</span><button data-a="asc" data-v="' + (page + 1) + '"' + ((page + 1) * parPage < max ? '' : ' disabled') + '>Suivants →</button></div></div>';
    this.montrer(html, '', function () { Menus.accueil(); });
    var c = this.el.querySelector('.courant'); if (c) c.classList.add('principal');
  },

  odyssee: function () {
    var d = Sauve.d, gl = '';
    for (var k in GLYPHES) gl += '<span class="glyphe-mini" title="' + GLYPHES[k].desc + '">' + GLYPHES[k].ico + ' ' + GLYPHES[k].nom + '</span>';
    var html = '<div class="panneau"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Odyssée</h2></div>' +
      '<p>Enchaîne des colosses jamais vus, de plus en plus forts, avec <b>3 cœurs pour toute la partie</b>. Après chaque victoire, tu récupères un cœur et tu choisis <b>un pouvoir parmi trois</b>. Un <b>Titan</b> tous les 5 colosses.</p>' +
      '<div class="stats"><div><b>' + d.odyssee.meilleur + '</b><span>record (colosses)</span></div><div><b>' + d.odyssee.parties + '</b><span>parties</span></div></div>' +
      '<h3>Les pouvoirs possibles</h3><div class="glyphes-liste">' + gl + '</div>' +
      '<button class="gros principal" data-a="goOdyssee"><b>Partir</b><span>Nouvelle Odyssée</span></button></div>';
    this.montrer(html, '', function () { Menus.accueil(); });
  },

  jour: function () {
    var d = Sauve.d, dj = Jeu.defiJour(), m = dj.mut === 'geant' ? { nom: 'Titan géant', desc: 'Le colosse du jour est un Titan.' } : MUTATEURS[dj.mut];
    var def = genColosse({ n: dj.d, graine: dj.graine, titan: dj.mut === 'geant' });
    var auj = d.jour.date === dateJour();
    var html = '<div class="panneau"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Défi du jour</h2></div>' +
      '<div class="carte-defi" style="--h:' + def.teinte + '"><b>' + def.nom + ', ' + def.epithete + '</b><span>Puissance ' + dj.d + '</span><div class="mut"><b>' + m.nom + '</b> : ' + m.desc + '</div></div>' +
      '<div class="stats"><div><b>' + (auj && d.jour.meilleur != null ? fmtTemps(d.jour.meilleur) : '—') + '</b><span>ton meilleur temps aujourd\'hui</span></div><div><b>' + (auj ? d.jour.essais : 0) + '</b><span>essais aujourd\'hui</span></div><div><b>' + d.jour.serie + '</b><span>jours de suite</span></div></div>' +
      '<p class="petit">Le défi change chaque jour à minuit. Réussis-le plusieurs jours de suite pour allonger ta série.</p>' +
      '<button class="gros principal" data-a="goJour"><b>Relever le défi</b></button></div>';
    this.montrer(html, '', function () { Menus.accueil(); });
  },

  entrainement: function () {
    var e = this.ent; e.n = clamp(e.n, 1, this.maxAsc());
    var def = colosseAscension(e.n), noms = def.attaques.map(function (a) { return CATALOGUE[a].nom; }).join(', ');
    var html = '<div class="panneau"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Entraînement</h2></div>' +
      '<p>Rejoue un colosse que tu as atteint pour apprendre ses attaques. Rien n\'est compté pour les records.</p>' +
      '<div class="selecteur"><button data-a="entN" data-v="-10">−10</button><button data-a="entN" data-v="-1">−1</button><div><b>' + (def.titan ? 'TITAN ' : 'Colosse ') + e.n + '</b><span>' + def.nom + ', ' + def.epithete + '</span></div><button data-a="entN" data-v="1">+1</button><button data-a="entN" data-v="10">+10</button></div>' +
      '<p class="petit centre">Attaques : ' + noms + '</p>' +
      '<button class="bascule' + (e.invincible ? ' on' : '') + '" data-a="entB" data-v="invincible"><b>Invincible</b><span>Les coups ne retirent pas de cœur</span><i>' + (e.invincible ? 'OUI' : 'NON') + '</i></button>' +
      '<button class="bascule' + (e.lent ? ' on' : '') + '" data-a="entB" data-v="lent"><b>Ralenti</b><span>Tout va à 70 % de la vitesse</span><i>' + (e.lent ? 'OUI' : 'NON') + '</i></button>' +
      '<button class="gros principal" data-a="goEnt"><b>S\'entraîner</b></button></div>';
    this.montrer(html, '', function () { Menus.accueil(); });
  },

  collection: function () {
    var d = Sauve.d, et = Jeu.totalEtoiles(), html = '<div class="panneau"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Collection</h2></div>';
    html += '<p class="petit">Rien ici ne rend plus fort : ce sont juste de belles comètes. Les couleurs se gagnent avec les étoiles de l\'Ascension (tu en as ' + et + ').</p><h3>Couleur de la comète</h3><div class="tuiles">';
    for (var i = 0; i < COULEURS_COMETE.length; i++) {
      var c = COULEURS_COMETE[i], ok = et >= c.etoiles;
      var fond = c.c === 'arc' ? 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' : c.c;
      html += '<button class="tuile' + (d.cosmetique.couleur === i ? ' actif' : '') + (ok ? '' : ' verrou') + '" data-a="coul" data-v="' + i + '" title="' + (ok ? c.nom : c.nom + ' : ' + c.etoiles + ' étoiles') + '"><i style="background:' + fond + '"></i><span>' + (ok ? c.nom : c.etoiles + ' ★') + '</span></button>';
    }
    html += '</div><h3>Traînée</h3><div class="tuiles larges">';
    for (i = 0; i < TRAINEES.length; i++) {
      var t = TRAINEES[i], ok2 = !t.succes || d.succes[t.succes], sc = t.succes ? SUCCES.filter(function (s) { return s.id === t.succes; })[0] : null;
      html += '<button class="tuile' + (d.cosmetique.trainee === i ? ' actif' : '') + (ok2 ? '' : ' verrou') + '" data-a="trai" data-v="' + i + '" title="' + (ok2 ? t.nom : 'Succès « ' + sc.nom + ' » : ' + sc.desc) + '"><span>' + t.nom + '</span>' + (ok2 ? '' : '<small>🔒 ' + sc.nom + '</small>') + '</button>';
    }
    html += '</div></div>';
    this.montrer(html, '', function () { Menus.accueil(); });
  },

  succes: function () {
    var d = Sauve.d, html = '<div class="panneau large"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Succès</h2></div><div class="liste-succes">';
    for (var i = 0; i < SUCCES.length; i++) { var s = SUCCES[i], ok = d.succes[s.id]; html += '<div class="succes' + (ok ? ' ok' : '') + '"><b>' + (ok ? '🏆 ' : '') + s.nom + '</b><span>' + s.desc + '</span></div>'; }
    html += '</div></div>';
    this.montrer(html, '', function () { Menus.accueil(); });
  },

  stats: function () {
    var d = Sauve.d, s = d.stats;
    var h = Math.floor(s.temps / 3600), m = Math.floor((s.temps % 3600) / 60);
    var html = '<div class="panneau large"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Statistiques</h2></div><div class="stats">' +
      '<div><b>' + (h ? h + ' h ' : '') + m + ' min</b><span>de combat</span></div>' +
      '<div><b>' + s.colosses + '</b><span>colosses vaincus</span></div>' +
      '<div><b>' + s.titans + '</b><span>Titans vaincus</span></div>' +
      '<div><b>' + (d.ascension.debloque - 1) + '</b><span>Ascension</span></div>' +
      '<div><b>' + Jeu.totalEtoiles() + '</b><span>étoiles</span></div>' +
      '<div><b>' + s.boucles + '</b><span>boucles</span></div>' +
      '<div><b>' + s.noyaux + '</b><span>noyaux brisés</span></div>' +
      '<div><b>' + s.balles + '</b><span>balles détruites</span></div>' +
      '<div><b>' + s.comboMax + '</b><span>meilleur combo</span></div>' +
      '<div><b>' + s.pile + '</b><span>boucles « pile »</span></div>' +
      '<div><b>' + s.novas + '</b><span>Supernovas</span></div>' +
      '<div><b>' + d.odyssee.meilleur + '</b><span>record d\'Odyssée</span></div>' +
      '</div>';
    var tot = 0, k; for (k in s.mortsPar) tot += s.mortsPar[k];
    if (tot) {
      var l = []; for (k in s.mortsPar) l.push([k, s.mortsPar[k]]); l.sort(function (a, b) { return b[1] - a[1]; });
      html += '<h3>Ce qui t\'a vaincu (' + tot + ' défaites)</h3><div class="barres">';
      for (var i = 0; i < l.length; i++) html += '<div class="barre"><span>' + (NOMS_CAUSES[l[i][0]] || l[i][0]) + '</span><i style="width:' + Math.max(2, l[i][1] / l[0][1] * 100) + '%"></i><b>' + Math.round(l[i][1] / tot * 100) + ' %</b></div>';
      html += '</div><div class="conseil">💡 ' + (CONSEILS[l[0][0]] || '') + '</div>';
    }
    html += '</div>';
    this.montrer(html, '', function () { Menus.accueil(); });
  },

  reglages: function () {
    var r = Sauve.d.reglages, enPause = Jeu.etat === 'pause';
    var html = '<div class="panneau"><div class="entete"><button class="retour" data-a="' + (enPause ? 'reprendre' : 'accueil') + '">← Retour</button><h2>Réglages</h2></div>' +
      '<label class="curseur">Musique<input type="range" name="musique" min="0" max="100" value="' + Math.round(r.musique * 100) + '"></label>' +
      '<label class="curseur">Bruitages<input type="range" name="sons" min="0" max="100" value="' + Math.round(r.sons * 100) + '"></label>' +
      this.bascule('tremblement', 'Tremblements de l\'écran', 'Secousses quand ça explose') +
      this.bascule('curseur', 'Viseur de la souris', 'Petit rond qui montre où va la comète') +
      (enPause ? '' : '<button class="danger" data-a="effacer">Tout effacer</button>') + '</div>';
    this.montrer(html, enPause ? 'sombre' : '', function () { if (enPause) Jeu.reprendre(); else Menus.accueil(); });
  },
  bascule: function (k, nom, desc) { var on = Sauve.d.reglages[k]; return '<button class="bascule' + (on ? ' on' : '') + '" data-a="basc" data-v="' + k + '"><b>' + nom + '</b><span>' + desc + '</span><i>' + (on ? 'OUI' : 'NON') + '</i></button>'; },

  pause: function () {
    var J = Jeu.J, ody = J.cfg.mode === 'odyssee';
    var html = '<div class="panneau petitp"><h2>Pause</h2><p class="petit">' + (J.cfg.etiquette || '') + ' · ' + Math.floor(pctCombat(J.C) * 100) + ' %</p>' +
      '<button class="principal" data-a="reprendre">Reprendre</button>' +
      (ody ? '' : '<button data-a="recommencer">Recommencer (R)</button>') +
      this.bascule('tremblement', 'Tremblements', 'Secousses de l\'écran') +
      '<button data-a="quitter">' + (ody ? 'Abandonner l\'Odyssée' : 'Quitter') + '</button></div>';
    this.montrer(html, 'sombre', function () { Jeu.reprendre(); });
  },

  /* ---------- écrans de fin ---------- */
  fin: function (J, x) {
    var cfg = J.cfg, C = J.C, html;
    if (x.victoire) {
      var titre = cfg.mode === 'jour' ? 'Défi relevé !' : (C.def.titan ? 'Titan vaincu !' : 'Colosse vaincu !');
      html = '<div class="panneau petitp fin"><div class="victoire">' + titre + '</div><p>' + C.def.nom + ', ' + C.def.epithete + '</p>' +
        (cfg.mode === 'entrainement' ? '' : '<div class="grandes-etoiles">' + this.etoiles(x.etoiles) + '</div>') +
        '<div class="stats"><div><b>' + fmtTemps(x.temps) + '</b><span>' + (x.nouveauTemps ? '<i class="or">nouveau record !</i>' : 'temps') + '</span></div><div><b>' + C.s.comboMax + '</b><span>meilleur combo</span></div><div><b>' + pluriel(x.touches, 'coup', 'coups') + '</b><span>reçus</span></div></div>' +
        (cfg.mode === 'ascension' && x.etoiles < 3 ? '<p class="petit">' + (x.etoiles === 1 ? '★★ : ne te fais toucher qu\'une fois au plus. ' : '') + '★★★ : sans te faire toucher.</p>' : '') +
        (cfg.mode === 'ascension' ? '<button class="gros principal" data-a="suivant"><b>Colosse ' + (cfg.n + 1) + '</b><span>' + colosseAscension(cfg.n + 1).nom + '</span></button><button data-a="rejouer">Rejouer (R)</button>' :
          '<button class="principal" data-a="rejouer">Rejouer (R)</button>') +
        '<button class="discret" data-a="quitter">Menu</button></div>';
      this.montrer(html, 'fond-leger', function () { Jeu.quitter(); });
      return;
    }
    var pc = Math.floor(x.pct * 100);
    html = '<div class="panneau petitp fin"><div class="pct-mort">' + pc + ' %</div>' +
      '<p>' + (x.nouveauPct ? '<b class="or">Nouveau record !</b> ' : '') + (cfg.mode === 'ascension' && x.record ? 'Record : ' + Math.floor(x.record.pct * 100) + ' % · essai ' + x.record.essais : '') + '</p>' +
      (x.cause ? '<p class="petit">Vaincu par : <b>' + (NOMS_CAUSES[x.cause] || x.cause) + '</b></p><p class="conseil petit">💡 ' + (CONSEILS[x.cause] || '') + '</p>' : '') +
      '<button class="gros principal" data-a="rejouer"><b>Réessayer</b><span>Espace · R</span></button>' +
      (cfg.mode === 'ascension' ? '<button data-a="versEnt">S\'entraîner sur ce colosse</button>' : '') +
      '<button class="discret" data-a="quitter">Menu</button></div>';
    this.montrer(html, 'fond-leger', function () { Jeu.quitter(); });
  },
  choixGlyphe: function (run, x) {
    var ids = Jeu.tirerGlyphes(run), html = '<div class="panneau fin"><div class="victoire">Colosse ' + run.k + ' vaincu !</div>' +
      '<p class="centre">' + this.coeurs(run.coeurs, run.coeursMax) + ' · ' + fmtTemps(x.temps) + (x.nouveauRecord ? ' · <b class="or">record !</b>' : '') + '</p><h3 class="centre">Choisis un pouvoir</h3><div class="glyphes">';
    for (var i = 0; i < ids.length; i++) {
      var g = GLYPHES[ids[i]], n = run.mods[ids[i]] || 0;
      html += '<button class="glyphe' + (i === 0 ? ' principal' : '') + '" data-a="glyphe" data-v="' + ids[i] + '"><i>' + g.ico + '</i><b>' + g.nom + (n ? ' ' + (n + 1) : '') + '</b><span>' + g.desc + '</span></button>';
    }
    if (!ids.length) html += '<button class="principal" data-a="glyphe" data-v="coeur">Continuer</button>';
    html += '</div><p class="petit centre">Prochain : ' + ((run.k + 1) % 5 === 0 ? 'un TITAN' : 'colosse ' + (run.k + 1)) + '</p></div>';
    this.montrer(html, 'fond-leger', null);
  },
  coeurs: function (n, max) { var s = ''; for (var i = 0; i < max; i++) s += i < n ? '<span class="c-plein">♥</span>' : '<span class="c-vide">♥</span>'; return s; },
  finOdyssee: function (run, x) {
    var d = Sauve.d, gl = run.choix.map(function (k) { return GLYPHES[k].ico + ' ' + GLYPHES[k].nom; }).join(' · ');
    var html = '<div class="panneau petitp fin"><div class="pct-mort">' + pluriel(run.score, 'colosse') + '</div><p>' + (run.score >= d.odyssee.meilleur && run.score > 0 ? '<b class="or">Record !</b>' : 'Record : ' + d.odyssee.meilleur) + '</p>' +
      '<p class="petit">Tombé face au colosse ' + run.k + ' (' + Math.floor(x.pct * 100) + ' %)' + (x.cause ? ', vaincu par : ' + (NOMS_CAUSES[x.cause] || x.cause) : '') + '</p>' +
      (gl ? '<p class="petit">Pouvoirs : ' + gl + '</p>' : '') +
      '<button class="gros principal" data-a="rejouer"><b>Nouvelle Odyssée</b><span>Espace · R</span></button><button class="discret" data-a="quitter">Menu</button></div>';
    this.montrer(html, 'fond-leger', function () { Jeu.quitter(); });
  }
};
