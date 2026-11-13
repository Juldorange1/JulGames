'use strict';
/* COMÈTE — menus (HTML par-dessus le canvas ; la souris sert seulement ici, jamais pour jouer) */

var Menus = {
  el: null, retour: null, ent: { n: 1, invincible: true, lent: false },
  init: function () { this.el = document.getElementById('ecran'); },
  montrer: function (html, cls, retour, garderDefil) {
    var e = this.el, defil = e.scrollTop, p0 = e.querySelector('.panneau'), defilP = p0 ? p0.scrollTop : 0;
    e.className = 'visible ' + (cls || ''); e.innerHTML = html;
    if (garderDefil) { e.scrollTop = defil; var p1 = e.querySelector('.panneau'); if (p1) p1.scrollTop = defilP; } else e.scrollTop = 0;
    this.retour = retour || null;
    var self = this;
    e.querySelectorAll('[data-a]').forEach(function (b) {
      b.addEventListener('click', function (ev) { ev.stopPropagation(); Son.init(); Son.sfx('clic'); self.action(b.getAttribute('data-a'), b); });
      b.addEventListener('pointerenter', function () { Son.sfx('survol'); });
    });
    e.querySelectorAll('input[type=range]').forEach(function (r) {
      r.addEventListener('input', function () { Sauve.d.reglages[r.name] = +r.value / 100; Sauve.ecrire(); Son.volumes(); });
    });
    var p = e.querySelector('.principal'); if (p && !garderDefil) setTimeout(function () { try { p.focus({ preventScroll: true }); } catch (er) { } }, 30);
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
    var d = Sauve.d, v = b ? b.getAttribute('data-v') : null;
    switch (a) {
      case 'accueil': this.accueil(); break;
      case 'diff': d.diff = v; Sauve.ecrire(); this.accueil(); break;
      case 'jouer': Jeu.lancer({ mode: 'ascension', n: this.maxAsc() }); break;
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
      case 'comp': this.competences(); break;
      case 'equiper': var pr = v.split(':'); Jeu.equiper(pr[0], +pr[1]); Son.sfx('choix'); this.competences(true); break;
      case 'monter': if (Jeu.monterComp(v)) Son.sfx('choix'); this.competences(true); break;
      case 'ameli': if (Jeu.acheterAmeli(v)) Son.sfx('choix'); this.competences(true); break;
      case 'aide': this.aide(); break;
      case 'collection': this.collection(); break;
      case 'coul': if (b.classList.contains('verrou')) { this.toast('Verrouillé', b.getAttribute('title')); break; } d.cosmetique.couleur = +v; Sauve.ecrire(); this.collection(); break;
      case 'trai': if (b.classList.contains('verrou')) { this.toast('Verrouillé', b.getAttribute('title')); break; } d.cosmetique.trainee = +v; Sauve.ecrire(); this.collection(); break;
      case 'succes': this.succes(); break;
      case 'stats': this.stats(); break;
      case 'reglages': this.reglages(); break;
      case 'basc': d.reglages[v] = d.reglages[v] ? 0 : 1; Sauve.ecrire(); if (Jeu.etat === 'pause') this.pause(); else this.reglages(); break;
      case 'effacerPartie': if (confirm('Effacer la partie « ' + DIFFS[d.diff].nom + ' » ? Sa progression, sa poussière et ses compétences seront perdues.')) { d.parties[d.diff] = partieVide(); Sauve.ecrire(); this.accueil(); } break;
      case 'effacer': if (confirm('Tout effacer ? Les 3 parties, les statistiques et la collection seront perdues.')) { try { localStorage.removeItem(Sauve.cle); } catch (e) { } Sauve.charger(); this.accueil(); } break;
      case 'reprendre': Jeu.reprendre(); break;
      case 'recommencer': Jeu.reprendre(); Jeu.recommencer(); break;
      case 'quitter': Jeu.quitter(); break;
      case 'suivant': Jeu.lancer({ mode: 'ascension', n: Jeu.J.cfg.n + 1 }); break;
      case 'rejouer': if (Jeu.J.cfg.mode === 'odyssee') Jeu.nouvelleOdyssee(); else Jeu.lancer(Jeu.J.cfg); break;
      case 'versEnt': this.ent.n = Jeu.J.cfg.n; Jeu.quitter(); this.entrainement(); break;
      case 'versComp': Jeu.quitter(); this.competences(); break;
      case 'glyphe': Son.sfx('choix'); Jeu.prendreGlyphe(Jeu.J.cfg.run, v); break;
    }
  },
  maxAsc: function () { return Math.max(1, PR().ascension.debloque); },

  /* ---------- accueil ---------- */
  accueil: function () {
    var d = Sauve.d, P = PR(), n = P.ascension.debloque, def = colosseAscension(n), dj = Jeu.defiJour(), r = Jeu.rang();
    var nbS = 0; for (var k in d.succes) if (k.indexOf('coul') !== 0) nbS++;
    var jourFait = P.jour.date === dateJour() && P.jour.meilleur != null;
    var parties = '';
    for (var dk in DIFFS) {
      var Q = d.parties[dk], D = DIFFS[dk];
      parties += '<button class="partie' + (dk === d.diff ? ' choisie' : '') + ' p-' + dk + '" data-a="diff" data-v="' + dk + '"><i>' + D.ico + '</i><b>' + D.nom + '</b><span>' + (Q.ascension.debloque > 1 ? 'Colosse ' + Q.ascension.debloque + ' · ' + Jeu.totalEtoiles(Q) + ' ★' : 'Nouvelle partie') + '</span><small>' + D.coeurs + ' cœurs · ✧ ' + Q.poussiere + '</small></button>';
    }
    var nbComp = 0; for (var c in COMPETENCES) if (Jeu.compDebloquee(c)) nbComp++;
    var html = '<div class="accueil">' +
      '<div class="logo"><span>COMÈTE</span><small>Encercle les colosses</small></div>' +
      '<div class="rang" title="Les points de talent viennent des colosses vaincus, des étoiles et de ta meilleure Odyssée (Trou noir compte plus qu\'Étincelle)."><b>' + r.nom + '</b><span>rang ' + r.niveau + ' · ' + r.points + ' points de talent</span><i><em style="width:' + Math.round(r.prog * 100) + '%"></em></i></div>' +
      '<div class="parties">' + parties + '</div>' +
      '<button class="gros principal" data-a="jouer"><b>' + (n === 1 && !P.tuto ? 'Commencer' : 'Jouer') + '</b><span>' + (def.titan ? 'TITAN ' : 'Colosse ') + n + ' · ' + def.nom + ', ' + def.epithete + '</span></button>' +
      '<div class="ligne3">' +
      '<button data-a="odyssee" class="mode-btn"><b>Odyssée</b><span>Record : ' + pluriel(P.odyssee.meilleur, 'colosse') + '</span></button>' +
      '<button data-a="jour" class="mode-btn' + (jourFait ? '' : ' nouveau') + '"><b>Défi du jour</b><span>' + (dj.mut === 'geant' ? 'Titan géant' : MUTATEURS[dj.mut].nom) + (jourFait ? ' · ✓ ' + fmtTemps(P.jour.meilleur) : ' · à faire') + '</span></button>' +
      '<button data-a="comp" class="mode-btn comp-btn"><b>Compétences</b><span>✧ ' + P.poussiere + ' poussière · ' + nbComp + '/' + Object.keys(COMPETENCES).length + '</span></button>' +
      '</div>' +
      '<div class="ligne3 petitsb">' +
      '<button data-a="asc">Ascension</button><button data-a="entrainement">Entraînement</button><button data-a="aide">Comment jouer</button>' +
      '<button data-a="collection">Collection</button><button data-a="succes">Succès ' + nbS + '/' + SUCCES.length + '</button><button data-a="stats">Statistiques</button>' +
      '</div>' +
      '<div class="ligne-bas"><button class="discret" data-a="reglages">Réglages</button><span class="petit">Clavier : flèches/ZQSD · Espace élan · J K L compétences · Échap pause — ou manette, ou tactile</span></div>' +
      '</div>';
    this.montrer(html, 'fond-leger');
  },

  aide: function () {
    var types = '', esp = '';
    for (var t in TYPES_NOYAU) if (t !== 'normal') types += '<div><b>' + TYPES_NOYAU[t].nom + '</b><span>' + TYPES_NOYAU[t].desc + ' (dès la puissance ' + TYPES_NOYAU[t].dMin + ')</span></div>';
    for (var e in ESPECES) esp += '<div><b>' + ESPECES[e].nom + '</b><span>' + ESPECES[e].desc + '</span></div>';
    var html = '<div class="panneau large aide"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Comment jouer</h2></div>' +
      '<p class="intro">Tu es une <b class="bleu">comète</b> qui laisse une traînée de lumière. Quand ta traînée se recroise, elle forme une <b>boucle</b> : tout ce qui est à l\'intérieur est frappé.</p>' +
      '<div class="regles2">' +
      '<div><b>🎮 Commandes</b><span><b>Flèches</b> ou <b>ZQSD</b> (WASD) pour bouger — tiens deux flèches pour tourner en rond. <b>Espace</b> : élan. <b>J, K, L</b> (ou 1, 2, 3) : tes compétences. Manette : stick, A élan, X Y B compétences. Tactile : glisse le doigt n\'importe où, boutons à droite.</span></div>' +
      '<div><b>🎯 Frapper</b><span>Fais le tour d\'un <b>cristal</b> jusqu\'à recroiser ta traînée. Plus tu enchaînes, plus le <b>combo</b> monte (+5 % par boucle, jusqu\'à ×2,5). Un cristal qu\'on laisse tranquille <b>se répare</b> (sa vie devient verte).</span></div>' +
      '<div><b>💥 Achever</b><span>Quand tous les cristaux sont brisés, le <b>cœur</b> s\'échappe et fuit : encercle-le. Il ralentit sur le premier temps de chaque mesure.</span></div>' +
      '<div><b>🔴 Esquiver</b><span>Les attaques sont annoncées juste avant, en rythme. Les <b>blanches</b> (lasers, ondes, murs, éclairs, rempart) <b>coupent ta traînée</b>. Pendant l\'élan, rien ne te touche.</span></div>' +
      '<div><b>⚡ Énergie et compétences</b><span>Entourer des balles, des mines, des traqueurs ou des trous noirs remplit ton énergie, frapper aussi. Elle paie tes 2 compétences et ton ultime (100). Choisis-les et améliore-les dans « Compétences ».</span></div>' +
      '<div><b>🎵 Bonus</b><span><b>PILE !</b> : boucle fermée pile sur le temps (×1,5). <b>SERRÉ</b> : petite boucle (×1,3).</span></div>' +
      '</div>' +
      '<h3>Les sortes de cristaux</h3><div class="regles2">' + types + '</div>' +
      '<h3>Les espèces de colosses</h3><div class="regles2">' + esp + '</div>' +
      '<h3>Les modes</h3>' +
      '<p><b>3 parties</b> : Étincelle, Comète et Trou noir, chacune avec sa propre progression, sa poussière d\'étoile et ses compétences.<br>' +
      '<b>Ascension</b> : des colosses toujours plus forts, chacun toujours identique pour que tu puisses l\'apprendre. Un <b>Titan</b> tous les 10. ★ = vaincu, ★★ = touché une fois au plus, ★★★ = sans être touché. Les colosses vaincus débloquent de nouvelles compétences.<br>' +
      '<b>Odyssée</b> : des colosses inconnus à la suite, avec les mêmes cœurs pour toute la partie, et un pouvoir à choisir après chaque victoire.<br>' +
      '<b>Défi du jour</b> : un colosse et une règle spéciale qui changent chaque jour.<br>' +
      '<b>Entraînement</b> : rejoue un colosse, sans perdre de cœur ou au ralenti (sans récompense).</p>' +
      '<button class="principal" data-a="accueil">Compris !</button></div>';
    this.montrer(html, '', function () { Menus.accueil(); });
  },

  /* ---------- compétences et améliorations ---------- */
  competences: function (garder) {
    var P = PR(), html = '<div class="panneau large"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Compétences</h2><span class="poussiere">✧ ' + P.poussiere + ' poussière d\'étoile</span><span class="petit">Partie ' + DIFFS[Sauve.d.diff].ico + ' ' + DIFFS[Sauve.d.diff].nom + '</span></div>';
    var nomsSlots = ['Compétence 1 (J)', 'Compétence 2 (K)', 'Ultime (L)'];
    html += '<div class="slots">';
    for (var s = 0; s < 3; s++) { var id = P.comp.slots[s], cp = id && COMPETENCES[id]; html += '<div class="slot' + (s === 2 ? ' ult' : '') + '"><small>' + nomsSlots[s] + '</small>' + (cp ? '<i>' + cp.ico + '</i><b>' + cp.nom + '</b>' : '<i>·</i><b>Vide</b>') + '</div>'; }
    html += '</div><p class="petit">Les compétences coûtent de l\'énergie (gagnée en entourant des balles et en frappant). Chaque niveau baisse le coût de 7 % et rend l\'effet 15 % plus fort. Les nouvelles se débloquent en battant les colosses de l\'Ascension.</p><div class="liste-comp">';
    for (var k in COMPETENCES) {
      var c = COMPETENCES[k], ok = Jeu.compDebloquee(k), niv = P.comp.niv[k] || 1, eq = P.comp.slots.indexOf(k);
      html += '<div class="carte-comp' + (ok ? '' : ' verrou') + (c.ultime ? ' ult' : '') + '"><div class="tete"><i>' + c.ico + '</i><b>' + c.nom + '</b><span>' + (ok ? 'niv. ' + niv + '/5 · ' + coutComp(k, niv) + ' énergie' : '🔒 après le colosse ' + (c.debloque - 1)) + '</span></div><p>' + c.desc + '</p>';
      if (ok) {
        html += '<div class="actions">';
        if (c.ultime) html += '<button ' + (eq === 2 ? 'disabled' : '') + ' data-a="equiper" data-v="' + k + ':2">' + (eq === 2 ? 'Équipée' : 'Équiper (L)') + '</button>';
        else { html += '<button ' + (eq === 0 ? 'disabled' : '') + ' data-a="equiper" data-v="' + k + ':0">' + (eq === 0 ? 'En J' : 'Mettre en J') + '</button><button ' + (eq === 1 ? 'disabled' : '') + ' data-a="equiper" data-v="' + k + ':1">' + (eq === 1 ? 'En K' : 'Mettre en K') + '</button>'; }
        if (niv < 5) html += '<button class="achat" ' + (P.poussiere >= PRIX_COMP[niv + 1] ? '' : 'disabled') + ' data-a="monter" data-v="' + k + '">Niveau ' + (niv + 1) + ' · ✧ ' + PRIX_COMP[niv + 1] + '</button>';
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div><h3>Améliorations de la comète</h3><div class="liste-comp">';
    for (var a in AMELIORATIONS) {
      var am = AMELIORATIONS[a], n = P.ameli[a] || 0;
      html += '<div class="carte-comp"><div class="tete"><i>' + am.ico + '</i><b>' + am.nom + '</b><span>' + n + '/' + am.max + '</span></div><p>' + am.desc + '</p><div class="actions">' +
        (n < am.max ? '<button class="achat" ' + (P.poussiere >= am.prix[n] ? '' : 'disabled') + ' data-a="ameli" data-v="' + a + '">Acheter · ✧ ' + am.prix[n] + '</button>' : '<span class="petit">Au maximum</span>') + '</div></div>';
    }
    html += '</div><p class="petit">La poussière d\'étoile se gagne en battant des colosses (deux fois plus la première fois, plus en Trou noir) et un peu même en perdant. Elle aide, mais seul ton talent bat les grands colosses.</p></div>';
    this.montrer(html, '', function () { Menus.accueil(); }, garder);
  },

  /* ---------- Ascension ---------- */
  ascension: function (page) {
    var P = PR(), max = P.ascension.debloque, parPage = 20;
    if (page == null) page = Math.floor((max - 1) / parPage);
    page = Math.max(0, page);
    var html = '<div class="panneau large"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Ascension</h2><span class="petit">' + DIFFS[Sauve.d.diff].ico + ' ' + DIFFS[Sauve.d.diff].nom + ' · ' + Jeu.totalEtoiles() + ' ★ · ' + pluriel(max - 1, 'colosse vaincu', 'colosses vaincus') + '</span></div><div class="grille-col">';
    for (var n = page * parPage + 1; n <= (page + 1) * parPage; n++) {
      var r = P.ascension.rec[n], ouvert = n <= max, def = colosseAscension(n);
      var cls = 'col' + (def.titan ? ' titan' : '') + (n === max ? ' courant' : '') + (r && r.victoires ? ' fini' : '') + (ouvert ? '' : ' verrou');
      html += '<button class="' + cls + '" ' + (ouvert ? 'data-a="colosse" data-v="' + n + '"' : 'disabled') + ' style="--h:' + def.teinte + ';--h2:' + def.teinte2 + '">' +
        '<i class="pastille"></i><b>' + (def.titan ? 'TITAN ' : '') + n + '</b><span class="nom">' + (ouvert ? def.nom + ' · ' + ESPECES[def.espece].nom : '???') + '</span>' +
        this.etoiles(r ? r.etoiles : 0) +
        '<span class="pc">' + (r ? (r.victoires ? fmtTemps(r.temps) : Math.floor(r.pct * 100) + ' %') + ' · ' + pluriel(r.essais, 'essai') : (ouvert ? 'Nouveau' : '')) + '</span></button>';
    }
    html += '</div><div class="pages"><button data-a="asc" data-v="' + (page - 1) + '"' + (page ? '' : ' disabled') + '>← Précédents</button><span class="petit">' + (page * parPage + 1) + ' – ' + ((page + 1) * parPage) + '</span><button data-a="asc" data-v="' + (page + 1) + '"' + ((page + 1) * parPage < max ? '' : ' disabled') + '>Suivants →</button></div></div>';
    this.montrer(html, '', function () { Menus.accueil(); });
    var c = this.el.querySelector('.courant'); if (c) c.classList.add('principal');
  },

  odyssee: function () {
    var P = PR(), gl = '';
    for (var k in GLYPHES) gl += '<span class="glyphe-mini" title="' + GLYPHES[k].desc + '">' + GLYPHES[k].ico + ' ' + GLYPHES[k].nom + '</span>';
    var html = '<div class="panneau"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Odyssée</h2></div>' +
      '<p>Enchaîne des colosses jamais vus, de plus en plus forts, avec <b>les mêmes cœurs pour toute la partie</b>. Après chaque victoire, tu récupères un cœur et tu choisis <b>un pouvoir parmi trois</b>. Un <b>Titan</b> tous les 5 colosses. Tes compétences et améliorations comptent aussi.</p>' +
      '<div class="stats"><div><b>' + P.odyssee.meilleur + '</b><span>record (colosses)</span></div><div><b>' + P.odyssee.parties + '</b><span>parties</span></div></div>' +
      '<h3>Les pouvoirs possibles</h3><div class="glyphes-liste">' + gl + '</div>' +
      '<button class="gros principal" data-a="goOdyssee"><b>Partir</b><span>Nouvelle Odyssée</span></button></div>';
    this.montrer(html, '', function () { Menus.accueil(); });
  },

  jour: function () {
    var P = PR(), dj = Jeu.defiJour(), m = dj.mut === 'geant' ? { nom: 'Titan géant', desc: 'Le colosse du jour est un Titan.' } : MUTATEURS[dj.mut];
    var def = genColosse({ n: dj.d, graine: dj.graine, titan: dj.mut === 'geant' });
    var auj = P.jour.date === dateJour();
    var html = '<div class="panneau"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Défi du jour</h2></div>' +
      '<div class="carte-defi" style="--h:' + def.teinte + '"><b>' + def.nom + ', ' + def.epithete + '</b><span>' + ESPECES[def.espece].nom + ' · puissance ' + dj.d + '</span><div class="mut"><b>' + m.nom + '</b> : ' + m.desc + '</div></div>' +
      '<div class="stats"><div><b>' + (auj && P.jour.meilleur != null ? fmtTemps(P.jour.meilleur) : '—') + '</b><span>ton meilleur temps aujourd\'hui</span></div><div><b>' + (auj ? P.jour.essais : 0) + '</b><span>essais aujourd\'hui</span></div><div><b>' + P.jour.serie + '</b><span>jours de suite</span></div></div>' +
      '<p class="petit">Le défi change chaque jour à minuit. La première réussite du jour rapporte 50 poussières d\'étoile en plus.</p>' +
      '<button class="gros principal" data-a="goJour"><b>Relever le défi</b></button></div>';
    this.montrer(html, '', function () { Menus.accueil(); });
  },

  entrainement: function () {
    var e = this.ent; e.n = clamp(e.n, 1, this.maxAsc());
    var def = colosseAscension(e.n), noms = def.attaques.map(function (a) { return CATALOGUE[a].nom; }).join(', ');
    var types = def.types.map(function (t) { return TYPES_NOYAU[t].nom; }).join(', ');
    var html = '<div class="panneau"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Entraînement</h2></div>' +
      '<p>Rejoue un colosse que tu as atteint pour apprendre ses attaques. Rien n\'est compté pour les records.</p>' +
      '<div class="selecteur"><button data-a="entN" data-v="-10">−10</button><button data-a="entN" data-v="-1">−1</button><div><b>' + (def.titan ? 'TITAN ' : 'Colosse ') + e.n + '</b><span>' + def.nom + ', ' + def.epithete + '</span><span>' + ESPECES[def.espece].nom + '</span></div><button data-a="entN" data-v="1">+1</button><button data-a="entN" data-v="10">+10</button></div>' +
      '<p class="petit centre">Attaques : ' + noms + (types ? '<br>Cristaux : ' + types : '') + '</p>' +
      '<button class="bascule' + (e.invincible ? ' on' : '') + '" data-a="entB" data-v="invincible"><b>Invincible</b><span>Les coups ne retirent pas de cœur</span><i>' + (e.invincible ? 'OUI' : 'NON') + '</i></button>' +
      '<button class="bascule' + (e.lent ? ' on' : '') + '" data-a="entB" data-v="lent"><b>Ralenti</b><span>Tout va à 70 % de la vitesse</span><i>' + (e.lent ? 'OUI' : 'NON') + '</i></button>' +
      '<button class="gros principal" data-a="goEnt"><b>S\'entraîner</b></button></div>';
    this.montrer(html, '', function () { Menus.accueil(); });
  },

  collection: function () {
    var d = Sauve.d, et = Jeu.etoilesCollection(), html = '<div class="panneau"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Collection</h2></div>';
    html += '<p class="petit">Juste de belles comètes, communes aux 3 parties. Les couleurs se gagnent avec les étoiles de ta meilleure partie (' + et + ').</p><h3>Couleur de la comète</h3><div class="tuiles">';
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
    var parts = ''; for (var k0 in DIFFS) parts += '<div><b>' + (d.parties[k0].ascension.debloque - 1) + '</b><span>' + DIFFS[k0].ico + ' ' + DIFFS[k0].nom + '</span></div>';
    var html = '<div class="panneau large"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Statistiques</h2></div><div class="stats">' +
      '<div><b>' + (h ? h + ' h ' : '') + m + ' min</b><span>de combat</span></div>' +
      '<div><b>' + s.colosses + '</b><span>colosses vaincus</span></div>' +
      '<div><b>' + s.titans + '</b><span>Titans vaincus</span></div>' + parts +
      '<div><b>' + s.boucles + '</b><span>boucles</span></div>' +
      '<div><b>' + s.noyaux + '</b><span>cristaux brisés</span></div>' +
      '<div><b>' + s.balles + '</b><span>balles détruites</span></div>' +
      '<div><b>' + s.comboMax + '</b><span>meilleur combo</span></div>' +
      '<div><b>' + s.pile + '</b><span>boucles « pile »</span></div>' +
      '<div><b>' + s.comps + '</b><span>compétences utilisées</span></div>' +
      '<div><b>' + Jeu.maxOdy() + '</b><span>record d\'Odyssée</span></div>' +
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
      (enPause ? '' : '<button class="danger" data-a="effacerPartie">Effacer la partie « ' + DIFFS[Sauve.d.diff].nom + ' »</button><button class="danger" data-a="effacer">Tout effacer</button>') + '</div>';
    this.montrer(html, enPause ? 'sombre' : '', function () { if (enPause) Jeu.reprendre(); else Menus.accueil(); });
  },
  bascule: function (k, nom, desc) { var on = Sauve.d.reglages[k]; return '<button class="bascule' + (on ? ' on' : '') + '" data-a="basc" data-v="' + k + '"><b>' + nom + '</b><span>' + desc + '</span><i>' + (on ? 'OUI' : 'NON') + '</i></button>'; },

  pause: function () {
    var J = Jeu.J, ody = J.cfg.mode === 'odyssee';
    var html = '<div class="panneau petitp"><h2>Pause</h2><p class="petit">' + (J.cfg.etiquette || '') + ' · ' + Math.floor(pctCombat(J.C) * 100) + ' %</p>' +
      '<button class="principal" data-a="reprendre">Reprendre</button>' +
      (ody ? '' : '<button data-a="recommencer">Recommencer (R)</button>') +
      this.bascule('tremblement', 'Tremblements', 'Secousses de l\'écran') +
      '<p class="petit">Flèches/ZQSD bouger · Espace élan · J K L compétences</p>' +
      '<button data-a="quitter">' + (ody ? 'Abandonner l\'Odyssée' : 'Quitter') + '</button></div>';
    this.montrer(html, 'sombre', function () { Jeu.reprendre(); });
  },

  /* ---------- écrans de fin ---------- */
  gains: function (x) {
    var s = x.poussiere ? '<p class="gain">✧ +' + x.poussiere + ' poussière d\'étoile</p>' : '';
    if (x.comps && x.comps.length) s += '<p class="gain nouveau-comp">Nouvelle compétence : ' + x.comps.map(function (c) { return COMPETENCES[c].ico + ' ' + COMPETENCES[c].nom; }).join(', ') + '</p>';
    return s;
  },
  fin: function (J, x) {
    var cfg = J.cfg, C = J.C, html;
    if (x.victoire) {
      var titre = cfg.mode === 'jour' ? 'Défi relevé !' : (C.def.titan ? 'Titan vaincu !' : 'Colosse vaincu !');
      html = '<div class="panneau petitp fin"><div class="victoire">' + titre + '</div><p>' + C.def.nom + ', ' + C.def.epithete + '</p>' +
        (cfg.mode === 'entrainement' ? '' : '<div class="grandes-etoiles">' + this.etoiles(x.etoiles) + '</div>') +
        '<div class="stats"><div><b>' + fmtTemps(x.temps) + '</b><span>' + (x.nouveauTemps ? '<i class="or">nouveau record !</i>' : 'temps') + '</span></div><div><b>' + C.s.comboMax + '</b><span>meilleur combo</span></div><div><b>' + pluriel(x.touches, 'coup', 'coups') + '</b><span>reçus</span></div></div>' +
        this.gains(x) +
        (cfg.mode === 'ascension' && x.etoiles < 3 ? '<p class="petit">' + (x.etoiles === 1 ? '★★ : ne te fais toucher qu\'une fois au plus. ' : '') + '★★★ : sans te faire toucher.</p>' : '') +
        (cfg.mode === 'ascension' ? '<button class="gros principal" data-a="suivant"><b>Colosse ' + (cfg.n + 1) + '</b><span>' + colosseAscension(cfg.n + 1).nom + '</span></button><button data-a="rejouer">Rejouer (R)</button>' :
          '<button class="principal" data-a="rejouer">Rejouer (R)</button>') +
        (x.comps && x.comps.length ? '<button data-a="versComp">Voir les compétences</button>' : '') +
        '<button class="discret" data-a="quitter">Menu</button></div>';
      this.montrer(html, 'fond-leger', function () { Jeu.quitter(); });
      return;
    }
    var pc = Math.floor(x.pct * 100);
    html = '<div class="panneau petitp fin"><div class="pct-mort">' + pc + ' %</div>' +
      '<p>' + (x.nouveauPct ? '<b class="or">Nouveau record !</b> ' : '') + (cfg.mode === 'ascension' && x.record ? 'Record : ' + Math.floor(x.record.pct * 100) + ' % · essai ' + x.record.essais : '') + '</p>' +
      (x.cause ? '<p class="petit">Vaincu par : <b>' + (NOMS_CAUSES[x.cause] || x.cause) + '</b></p><p class="conseil petit">💡 ' + (CONSEILS[x.cause] || '') + '</p>' : '') +
      this.gains(x) +
      '<button class="gros principal" data-a="rejouer"><b>Réessayer</b><span>Espace · R</span></button>' +
      (cfg.mode === 'ascension' ? '<button data-a="versEnt">S\'entraîner sur ce colosse</button>' : '') +
      '<button class="discret" data-a="quitter">Menu</button></div>';
    this.montrer(html, 'fond-leger', function () { Jeu.quitter(); });
  },
  choixGlyphe: function (run, x) {
    var ids = Jeu.tirerGlyphes(run), html = '<div class="panneau fin"><div class="victoire">Colosse ' + run.k + ' vaincu !</div>' +
      '<p class="centre">' + this.coeurs(run.coeurs, run.coeursMax) + ' · ' + fmtTemps(x.temps) + (x.nouveauRecord ? ' · <b class="or">record !</b>' : '') + '</p>' + this.gains(x) + '<h3 class="centre">Choisis un pouvoir</h3><div class="glyphes">';
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
    var P = PR(), gl = run.choix.map(function (k) { return GLYPHES[k].ico + ' ' + GLYPHES[k].nom; }).join(' · ');
    var html = '<div class="panneau petitp fin"><div class="pct-mort">' + pluriel(run.score, 'colosse') + '</div><p>' + (run.score >= P.odyssee.meilleur && run.score > 0 ? '<b class="or">Record !</b>' : 'Record : ' + P.odyssee.meilleur) + '</p>' +
      '<p class="petit">Tombé face au colosse ' + run.k + ' (' + Math.floor(x.pct * 100) + ' %)' + (x.cause ? ', vaincu par : ' + (NOMS_CAUSES[x.cause] || x.cause) : '') + '</p>' +
      (gl ? '<p class="petit">Pouvoirs : ' + gl + '</p>' : '') + this.gains(x) +
      '<button class="gros principal" data-a="rejouer"><b>Nouvelle Odyssée</b><span>Espace · R</span></button><button class="discret" data-a="quitter">Menu</button></div>';
    this.montrer(html, 'fond-leger', function () { Jeu.quitter(); });
  }
};
