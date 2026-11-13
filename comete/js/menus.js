'use strict';
/* COMÈTE — menus (HTML par-dessus le canvas ; la souris sert seulement ici, jamais pour jouer)
   Écrans : Préparation (accueil) · Arsenal (forme, compétences, améliorations) · Profil · Comment jouer · Réglages */

var Menus = {
  el: null, retour: null, mode: 'ascension', vue: null, onglet: 'comp', slot: 0, ongletP: 'stats',
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
    var ap = e.querySelector('canvas.apercu');
    Rendu.apercu(ap, ap ? this.defApercu : null);
  },
  cacher: function () { this.el.className = ''; this.el.innerHTML = ''; this.retour = null; Rendu.apercu(null); },
  touche: function (e) {
    if (e.code === 'Escape') { e.preventDefault(); if (Jeu.etat === 'pause') { Jeu.reprendre(); return; } if (this.retour) this.retour(); return; }
    if (Jeu.etat === 'pause' && e.code === 'KeyR') { this.action('recommencer'); return; }
    if (Jeu.etat === 'fin' && e.code === 'KeyR') { var r = this.el.querySelector('[data-a=rejouer]'); if (r) { e.preventDefault(); r.click(); return; } }
    // sur la préparation, Q/D (ou A/D) changent de colosse
    if (Jeu.etat === 'menu' && this.el.querySelector('.prep') && this.mode === 'ascension' && (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'KeyQ')) { this.action('vue', { getAttribute: function () { return e.code === 'KeyD' ? '1' : '-1'; } }); return; }
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
  pips: function (n, max) { var s = ''; for (var i = 0; i < max; i++) s += '<em class="' + (i < n ? 'on' : '') + '"></em>'; return '<span class="pips">' + s + '</span>'; },
  touchesNoms: function () { return Jeu.entree.mode === 'manette' ? ['X', 'Y', 'B'] : ['J', 'K', 'L']; },

  action: function (a, b) {
    var d = Sauve.d, v = b ? b.getAttribute('data-v') : null, P = PR();
    switch (a) {
      case 'accueil': this.accueil(); break;
      case 'diff': d.diff = v; Sauve.ecrire(); this.vue = null; this.accueil(); break;
      case 'mode': this.mode = v; this.accueil(); break;
      case 'vue': this.vue = clamp((this.vue || 1) + (+v), 1, this.maxAsc()); Son.sfx('survol'); this.accueil(true); break;
      case 'jouer': Jeu.lancer({ mode: 'ascension', n: this.vue || this.maxAsc() }); break;
      case 'entrainer': Jeu.lancer({ mode: 'entrainement', n: this.vue || this.maxAsc() }); break;
      case 'goOdyssee': Jeu.nouvelleOdyssee(); break;
      case 'goJour': Jeu.lancer({ mode: 'jour' }); break;
      case 'arsenal':
        if (v && v.indexOf('comp:') === 0) { this.onglet = 'comp'; this.slot = +v.split(':')[1]; } else if (v) this.onglet = v;
        this.arsenal(); break;
      case 'ong': this.onglet = v; this.arsenal(); break;
      case 'slot': this.slot = +v; this.arsenal(true); break;
      case 'forme': if (Jeu.formeDebloquee(v)) { P.forme = v; Sauve.ecrire(); Son.sfx('choix'); } this.arsenal(true); break;
      case 'equiper': Jeu.equiper(v, this.slot); Son.sfx('choix'); this.arsenal(true); break;
      case 'monter': if (Jeu.monterComp(v)) Son.sfx('choix'); this.arsenal(true); break;
      case 'ameli': if (Jeu.acheterAmeli(v)) Son.sfx('choix'); this.arsenal(true); break;
      case 'aide': this.aide(); break;
      case 'profil': if (v) this.ongletP = v; this.profil(); break;
      case 'coul': if (b.classList.contains('verrou')) { this.toast('Verrouillé', b.getAttribute('title')); break; } d.cosmetique.couleur = +v; Sauve.ecrire(); this.profil(true); break;
      case 'trai': if (b.classList.contains('verrou')) { this.toast('Verrouillé', b.getAttribute('title')); break; } d.cosmetique.trainee = +v; Sauve.ecrire(); this.profil(true); break;
      case 'reglages': this.reglages(); break;
      case 'basc': d.reglages[v] = d.reglages[v] ? 0 : 1; Sauve.ecrire(); if (Jeu.etat === 'pause') this.pause(); else this.reglages(); break;
      case 'effacerPartie': if (confirm('Effacer la partie « ' + DIFFS[d.diff].nom + ' » ? Sa progression, sa poussière et ses compétences seront perdues.')) { d.parties[d.diff] = partieVide(); Sauve.ecrire(); this.vue = null; this.accueil(); } break;
      case 'effacer': if (confirm('Tout effacer ? Les 3 parties, les statistiques et la collection seront perdues.')) { try { localStorage.removeItem(Sauve.cle); } catch (e) { } Sauve.charger(); this.vue = null; this.accueil(); } break;
      case 'reprendre': Jeu.reprendre(); break;
      case 'recommencer': Jeu.reprendre(); Jeu.recommencer(); break;
      case 'quitter': Jeu.quitter(); break;
      case 'suivant': Jeu.lancer({ mode: 'ascension', n: Jeu.J.cfg.n + 1 }); break;
      case 'rejouer': if (Jeu.J.cfg.mode === 'odyssee') Jeu.nouvelleOdyssee(); else Jeu.lancer(Jeu.J.cfg); break;
      case 'versEnt': Jeu.lancer({ mode: 'entrainement', n: Jeu.J.cfg.n }); break;
      case 'preparer': if (Jeu.J.cfg.n) { this.vue = Jeu.J.cfg.n; this.mode = 'ascension'; } Jeu.quitter(); break;
      case 'versArsenal': Jeu.quitter(); this.onglet = v || 'comp'; this.arsenal(); break;
      case 'glyphe': Son.sfx('choix'); Jeu.prendreGlyphe(Jeu.J.cfg.run, v); break;
    }
  },
  maxAsc: function () { return Math.max(1, PR().ascension.debloque); },

  /* ---------- règles d'un colosse, en petites pastilles ---------- */
  regles: function (def, mut) {
    var h = '<div class="regles-col">';
    h += '<div class="pastille-r espece"><i>◎</i><b>' + ESPECES[def.espece].nom + '</b><span>' + ESPECES[def.espece].desc + '</span></div>';
    for (var i = 0; i < def.types.length; i++) { var t = TYPES_NOYAU[def.types[i]]; h += '<div class="pastille-r cristal"><i>' + t.ico + '</i><b>' + t.nom + '</b><span>' + t.desc + '</span></div>'; }
    for (i = 0; i < (def.traits || []).length; i++) { var r = TRAITS[def.traits[i]]; h += '<div class="pastille-r trait"><i>' + r.ico + '</i><b>' + r.nom + '</b><span>' + r.desc + '</span></div>'; }
    if (def.coeur.saut) h += '<div class="pastille-r coeur"><i>✦</i><b>Cœur sauteur</b><span>Une fois libéré, son cœur saute ailleurs toutes les 2 mesures : un cercle montre où.</span></div>';
    if (mut) h += '<div class="pastille-r regle"><i>⚑</i><b>' + mut.nom + '</b><span>' + mut.desc + '</span></div>';
    h += '</div>';
    var conseil = def.traits && def.traits.length ? TRAITS[def.traits[0]].conseil : def.types.length ? 'Regarde bien ses cristaux : chacun a sa règle.' : null;
    if (conseil) h += '<p class="conseil-col">💡 ' + conseil + '</p>';
    return h;
  },

  /* ---------- accueil = préparation du combat ---------- */
  accueil: function (garder) {
    var d = Sauve.d, P = PR(), r = Jeu.rang(), max = P.ascension.debloque;
    if (this.vue == null || this.vue > max) this.vue = max;
    var parties = '';
    for (var dk in DIFFS) {
      var Q = d.parties[dk], D = DIFFS[dk];
      parties += '<button class="partie' + (dk === d.diff ? ' choisie' : '') + ' p-' + dk + '" data-a="diff" data-v="' + dk + '" title="' + D.desc + '"><i>' + D.ico + '</i><b>' + D.nom + '</b><small>' + (Q.ascension.debloque > 1 ? 'Colosse ' + Q.ascension.debloque + ' · ' + Jeu.totalEtoiles(Q) + ' ★' : 'Nouvelle partie') + ' · ' + D.coeurs + ' ♥</small></button>';
    }
    var dj = Jeu.defiJour(), jourFait = P.jour.date === dateJour() && P.jour.meilleur != null;
    var modes = [['ascension', 'Ascension'], ['odyssee', 'Odyssée'], ['jour', 'Défi du jour']], mh = '';
    for (var i = 0; i < 3; i++) mh += '<button class="onglet' + (this.mode === modes[i][0] ? ' actif' : '') + (modes[i][0] === 'jour' && !jourFait ? ' point' : '') + '" data-a="mode" data-v="' + modes[i][0] + '">' + modes[i][1] + '</button>';
    var html = '<div class="prep">' +
      '<div class="haut"><div class="logo-mini">COMÈTE</div>' +
      '<div class="rang" title="Ton rang monte avec les colosses vaincus, les étoiles et ta meilleure Odyssée."><b>' + r.nom + '</b><i><em style="width:' + Math.round(r.prog * 100) + '%"></em></i><span>rang ' + r.niveau + ' · ' + r.points + ' pts</span></div>' +
      '<div class="icones"><button data-a="profil" title="Profil : statistiques, succès, collection">🏆</button><button data-a="aide" title="Comment jouer">?</button><button data-a="reglages" title="Réglages">⚙</button></div></div>' +
      '<div class="parties">' + parties + '</div>' +
      '<div class="modes">' + mh + '</div>' +
      '<div class="prep-corps">' + this.carteMode(P, max, dj) + '<div class="col-droite">' + (this.reglesHtml ? '<section class="carte-regles"><h3>Ce qu’il faut savoir</h3>' + this.reglesHtml + '</section>' : '') + this.carteEquipement(P) + '</div></div></div>';
    this.montrer(html, 'fond-leger', null, garder);
  },
  carteMode: function (P, max, dj) {
    var h;
    if (this.mode === 'odyssee') {
      this.defApercu = null; this.reglesHtml = null;
      return '<section class="carte-col odyssee"><div class="titre-col seul"><small>Mode</small><b>Odyssée</b><span>Des colosses jamais vus, l’un après l’autre</span></div>' +
        '<ul class="points"><li>♥ Tes cœurs ne reviennent pas entre deux colosses (un seul rendu par victoire).</li><li>✦ Après chaque victoire, choisis <b>un pouvoir</b> parmi trois.</li><li>👑 Un <b>Titan</b> tous les 5 colosses.</li><li>☄ Ta forme, tes compétences et tes améliorations comptent.</li></ul>' +
        '<div class="stats mini"><div><b>' + P.odyssee.meilleur + '</b><span>record</span></div><div><b>' + P.odyssee.parties + '</b><span>parties</span></div></div>' +
        '<div class="boutons-col"><button class="gros principal" data-a="goOdyssee"><b>Partir</b><span>Espace</span></button></div></section>';
    }
    if (this.mode === 'jour') {
      var m = dj.mut === 'geant' ? { nom: 'Titan géant', desc: 'Le colosse du jour est un Titan.' } : MUTATEURS[dj.mut];
      var def = genColosse({ n: dj.d, graine: dj.graine, titan: dj.mut === 'geant' }), auj = P.jour.date === dateJour();
      this.defApercu = def; this.reglesHtml = this.regles(def, m);
      return '<section class="carte-col" style="--h:' + def.teinte + ';--h2:' + def.teinte2 + '"><div class="titre-col seul"><small>Défi du jour · change à minuit</small><b>' + def.nom + '</b><span>' + def.epithete + ' · puissance ' + Math.round(dj.d) + '</span></div>' +
        '<canvas class="apercu"></canvas>' +
        '<div class="rec"><span>Aujourd’hui : <b>' + (auj && P.jour.meilleur != null ? fmtTemps(P.jour.meilleur) : '—') + '</b> · ' + pluriel(auj ? P.jour.essais : 0, 'essai') + ' · série ' + P.jour.serie + ' j</span><span class="or">+50 ✧ à la première réussite</span></div>' +
        '<div class="boutons-col"><button class="gros principal" data-a="goJour"><b>Relever le défi</b><span>Espace</span></button></div></section>';
    }
    var n = this.vue, def2 = colosseAscension(n), rec = P.ascension.rec[n];
    this.defApercu = def2; this.reglesHtml = this.regles(def2);
    h = '<section class="carte-col' + (def2.titan ? ' titan' : '') + '" style="--h:' + def2.teinte + ';--h2:' + def2.teinte2 + '">' +
      '<div class="nav-col"><button data-a="vue" data-v="-1" title="Colosse précédent (Q)"' + (n > 1 ? '' : ' disabled') + '>◀</button>' +
      '<div class="titre-col"><small>' + (def2.titan ? '👑 TITAN ' : 'Colosse ') + n + (n === max ? ' · à vaincre' : ' · déjà vaincu') + '</small><b>' + def2.nom + '</b><span>' + def2.epithete + '</span></div>' +
      '<button data-a="vue" data-v="1" title="Colosse suivant (D)"' + (n < max ? '' : ' disabled') + '>▶</button></div>' +
      '<canvas class="apercu"></canvas>' +
      '<div class="rec">' + this.etoiles(rec ? rec.etoiles : 0) + '<span>' + (rec ? (rec.victoires ? 'Meilleur temps ' + fmtTemps(rec.temps) : 'Record ' + Math.floor(rec.pct * 100) + ' %') + ' · ' + pluriel(rec.essais, 'essai') : 'Jamais affronté') + '</span></div>' +
      '<div class="boutons-col"><button class="gros principal" data-a="jouer"><b>' + (n === 1 && !P.tuto ? 'Commencer' : 'Affronter') + '</b><span>Espace</span></button>' +
      '<button class="secondaire" data-a="entrainer"><b>S’entraîner</b><small>sans perdre de cœur</small></button></div></section>';
    return h;
  },
  carteEquipement: function (P) {
    var f = FORMES[P.forme] && Jeu.formeDebloquee(P.forme) ? FORMES[P.forme] : FORMES.comete, tn = this.touchesNoms();
    var nbF = 0; for (var k in FORMES) if (Jeu.formeDebloquee(k)) nbF++;
    var h = '<section class="equip"><h3>Ton équipement</h3>' +
      '<button class="forme-choisie" data-a="arsenal" data-v="forme"><i>' + f.ico + '</i><span><b>' + f.nom + '</b><small>' + f.court + (nbF > 1 ? ' · ' + nbF + ' formes' : '') + '</small></span><em>Changer</em></button><div class="slots-mini">';
    for (var s = 0; s < 3; s++) {
      var id = P.comp.slots[s], c = id && Jeu.compDebloquee(id) ? COMPETENCES[id] : null;
      h += '<button class="slot-mini' + (s === 2 ? ' ult' : '') + '" data-a="arsenal" data-v="comp:' + s + '"><kbd>' + tn[s] + '</kbd><i>' + (c ? c.ico : '+') + '</i><span>' + (c ? c.nom : 'Vide') + '</span></button>';
    }
    h += '</div><button class="poussiere-btn" data-a="arsenal" data-v="ameli"><span>✧ ' + P.poussiere + '</span> Améliorer</button>' +
      '<p class="petit">Change de forme et de compétences selon le colosse : chacun a ses faiblesses.</p></section>';
    return h;
  },

  /* ---------- arsenal : forme, compétences, améliorations ---------- */
  arsenal: function (garder) {
    var P = PR(), o = this.onglet, tn = this.touchesNoms();
    var html = '<div class="panneau large arsenal"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Arsenal</h2><span class="poussiere">✧ ' + P.poussiere + ' poussière d’étoile</span><span class="petit">' + DIFFS[Sauve.d.diff].ico + ' ' + DIFFS[Sauve.d.diff].nom + '</span></div>' +
      '<div class="onglets"><button class="onglet' + (o === 'forme' ? ' actif' : '') + '" data-a="ong" data-v="forme">☄ Forme</button><button class="onglet' + (o === 'comp' ? ' actif' : '') + '" data-a="ong" data-v="comp">⚡ Compétences</button><button class="onglet' + (o === 'ameli' ? ' actif' : '') + '" data-a="ong" data-v="ameli">✧ Améliorations</button></div>';
    if (o === 'forme') {
      html += '<p class="intro">Ta <b>forme</b> change ta façon de jouer. Choisis celle qui convient au colosse que tu affrontes.</p><div class="grille-formes">';
      for (var k in FORMES) {
        var F = FORMES[k], ok = Jeu.formeDebloquee(k), ch = (P.forme || 'comete') === k;
        html += '<div class="carte-forme' + (ch ? ' choisie' : '') + (ok ? '' : ' verrou') + '"><i>' + F.ico + '</i><b>' + F.nom + '</b><small>' + F.court + '</small><p>' + F.desc + '</p>' +
          '<ul>' + F.plus.map(function (x) { return '<li class="plus">' + x + '</li>'; }).join('') + F.moins.map(function (x) { return '<li class="moins">' + x + '</li>'; }).join('') + '</ul>' +
          (ok ? '<button ' + (ch ? 'disabled' : '') + ' data-a="forme" data-v="' + k + '"' + (ch ? '' : ' class="principal-f"') + '>' + (ch ? '✓ Choisie' : 'Choisir') + '</button>' : '<p class="verrou-txt">🔒 Bats le colosse ' + (F.debloque - 1) + '</p>') + '</div>';
      }
      html += '</div>';
    } else if (o === 'comp') {
      var s = this.slot;
      html += '<p class="intro">En combat, <kbd>' + tn[0] + '</kbd> <kbd>' + tn[1] + '</kbd> <kbd>' + tn[2] + '</kbd> lancent tes compétences. Elles coûtent de l’<b class="jaune">énergie</b> (la barre jaune en bas) : tu en gagnes en frappant et surtout en <b>entourant des balles</b>.</p><div class="slots-grands">';
      var noms = ['Compétence', 'Compétence', 'Ultime (100 d’énergie)'];
      for (var q = 0; q < 3; q++) {
        var id = P.comp.slots[q], c = id && Jeu.compDebloquee(id) ? COMPETENCES[id] : null;
        html += '<button class="slot-grand' + (q === s ? ' choisi' : '') + (q === 2 ? ' ult' : '') + '" data-a="slot" data-v="' + q + '"><kbd>' + tn[q] + '</kbd><i>' + (c ? c.ico : '+') + '</i><b>' + (c ? c.nom : 'Vide') + '</b><small>' + noms[q] + '</small></button>';
      }
      html += '</div><h3>Choisis ce que fait la touche <kbd>' + tn[s] + '</kbd></h3><div class="liste-comp">';
      for (var cid in COMPETENCES) {
        var cp = COMPETENCES[cid];
        if ((s === 2) !== !!cp.ultime) continue;
        var dispo = Jeu.compDebloquee(cid), niv = P.comp.niv[cid] || 1, eq = P.comp.slots.indexOf(cid);
        html += '<div class="carte-comp' + (dispo ? '' : ' verrou') + (eq === s ? ' equipee' : '') + '"><div class="tete"><i>' + cp.ico + '</i><div><b>' + cp.nom + '</b><span class="role r-' + cp.role.charAt(0) + '">' + cp.role + '</span></div>' + (dispo ? this.pips(niv, 5) : '') + '</div>';
        if (!dispo) { html += '<p class="verrou-txt">🔒 Bats le colosse ' + (cp.debloque - 1) + ' pour la débloquer.</p></div>'; continue; }
        html += '<p class="effet">' + effetComp(cid, niv) + '</p><div class="chiffres"><span>⚡ ' + coutComp(cid, niv) + ' d’énergie</span><span>⏱ ' + virg(cp.rech) + ' s</span></div><div class="actions">';
        if (eq === s) html += '<button disabled>✓ Sur ' + tn[s] + '</button>';
        else html += '<button class="principal-c" data-a="equiper" data-v="' + cid + '">Mettre sur ' + tn[s] + (eq >= 0 ? ' (au lieu de ' + tn[eq] + ')' : '') + '</button>';
        if (niv < 5) html += '<button class="achat" ' + (P.poussiere >= PRIX_COMP[niv + 1] ? '' : 'disabled') + ' data-a="monter" data-v="' + cid + '">Niveau ' + (niv + 1) + ' · ✧ ' + PRIX_COMP[niv + 1] + '</button>';
        var e2 = effetComp(cid, niv + 1), memeEffet = e2 === effetComp(cid, niv);
        html += '</div>' + (niv < 5 ? '<p class="suivant">Au niveau ' + (niv + 1) + ' : ' + (cp.ultime ? '' : coutComp(cid, niv + 1) + ' d’énergie' + (memeEffet ? '' : ', ')) + (memeEffet ? '' : e2.charAt(0).toLowerCase() + e2.slice(1)) + '</p>' : '<p class="suivant or">Niveau maximum</p>') + '</div>';
      }
      html += '</div>';
    } else {
      html += '<p class="intro">La <b class="or">poussière d’étoile</b> se gagne en battant des colosses (deux fois plus la première fois). Elle aide un peu ; ton talent fait le reste.</p><div class="liste-comp">';
      for (var a in AMELIORATIONS) {
        var am = AMELIORATIONS[a], n = P.ameli[a] || 0;
        html += '<div class="carte-comp"><div class="tete"><i>' + am.ico + '</i><div><b>' + am.nom + '</b></div>' + this.pips(n, am.max) + '</div><p class="effet">' + am.desc + '</p><div class="actions">' +
          (n < am.max ? '<button class="achat" ' + (P.poussiere >= am.prix[n] ? '' : 'disabled') + ' data-a="ameli" data-v="' + a + '">Acheter · ✧ ' + am.prix[n] + '</button>' : '<span class="petit or">Au maximum</span>') + '</div></div>';
      }
      html += '</div>';
    }
    html += '<button class="gros principal" data-a="accueil"><b>Prêt</b><span>retour à la préparation</span></button></div>';
    this.montrer(html, '', function () { Menus.accueil(); }, garder);
  },

  /* ---------- comment jouer ---------- */
  aide: function () {
    var html = '<div class="panneau large aide"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Comment jouer</h2></div>' +
      '<div class="etapes">' +
      '<div class="etape"><i>1</i><b>Bouge</b><span>Flèches ou ZQSD. Ta comète laisse une <b class="bleu">traînée</b> de lumière.</span></div>' +
      '<div class="etape"><i>2</i><b>Entoure</b><span>Fais le tour d’un <b>cristal</b> jusqu’à recroiser ta traînée : la boucle frappe tout ce qui est dedans.</span></div>' +
      '<div class="etape"><i>3</i><b>Esquive</b><span>Les attaques sont annoncées juste avant. <b>Espace</b> = élan : rien ne te touche pendant l’élan.</span></div>' +
      '<div class="etape"><i>4</i><b>Achève</b><span>Tous les cristaux brisés ? Le <b>cœur</b> s’échappe : entoure-le pour gagner.</span></div>' +
      '</div><h3>Bon à savoir</h3><ul class="savoir">' +
      '<li>Enchaîne les boucles : ton <b>combo</b> augmente tes dégâts.</li>' +
      '<li>Un cristal que tu laisses tranquille <b>se répare</b> (son anneau devient vert).</li>' +
      '<li>Entoure les <b class="rouge">balles</b> : elles disparaissent et remplissent ton <b class="jaune">énergie</b>, qui lance tes compétences (J, K, L).</li>' +
      '<li>Les attaques <b>blanches</b> (lasers, ondes, murs) coupent ta traînée.</li>' +
      '<li><b class="or">PILE !</b> : boucle fermée sur le temps de la musique (×1,5). <b class="vert">SERRÉ</b> : petite boucle (×1,3).</li>' +
      '<li>Chaque colosse montre ses <b>règles spéciales</b> avant le combat : pas besoin de tout retenir à l’avance.</li></ul>' +
      '<h3>Commandes</h3><div class="commandes"><div><b>⌨ Clavier</b><span>Flèches / ZQSD : bouger · Espace : élan · J K L : compétences · Échap : pause · R : recommencer</span></div>' +
      '<div><b>🎮 Manette</b><span>Stick : bouger · A : élan · X Y B : compétences · Start : pause</span></div>' +
      '<div><b>📱 Tactile</b><span>Glisse le doigt n’importe où pour bouger · boutons à droite</span></div></div>' +
      '<h3>Les 3 parties</h3><p class="petit">' + DIFFS.etincelle.ico + ' <b>Étincelle</b> : ' + DIFFS.etincelle.desc + '<br>' + DIFFS.comete.ico + ' <b>Comète</b> : ' + DIFFS.comete.desc + '<br>' + DIFFS.trounoir.ico + ' <b>Trou noir</b> : ' + DIFFS.trounoir.desc + '<br>Chacune a sa propre progression. ★ = vaincu, ★★ = touché une fois au plus, ★★★ = sans être touché.</p>' +
      '<button class="principal" data-a="accueil">Compris !</button></div>';
    this.montrer(html, '', function () { Menus.accueil(); });
  },

  /* ---------- profil : statistiques, succès, collection ---------- */
  profil: function (garder) {
    var o = this.ongletP, d = Sauve.d, nbS = 0; for (var k in d.succes) if (k.indexOf('coul') !== 0) nbS++;
    var html = '<div class="panneau large"><div class="entete"><button class="retour" data-a="accueil">← Retour</button><h2>Profil</h2></div>' +
      '<div class="onglets"><button class="onglet' + (o === 'stats' ? ' actif' : '') + '" data-a="profil" data-v="stats">📊 Statistiques</button><button class="onglet' + (o === 'succes' ? ' actif' : '') + '" data-a="profil" data-v="succes">🏆 Succès ' + nbS + '/' + SUCCES.length + '</button><button class="onglet' + (o === 'collection' ? ' actif' : '') + '" data-a="profil" data-v="collection">🎨 Collection</button></div>';
    if (o === 'succes') {
      html += '<div class="liste-succes">';
      for (var i = 0; i < SUCCES.length; i++) { var s = SUCCES[i], ok = d.succes[s.id]; html += '<div class="succes' + (ok ? ' ok' : '') + '"><b>' + (ok ? '🏆 ' : '') + s.nom + '</b><span>' + s.desc + '</span></div>'; }
      html += '</div>';
    } else if (o === 'collection') {
      var et = Jeu.etoilesCollection();
      html += '<p class="petit">Juste de belles comètes, communes aux 3 parties. Les couleurs se gagnent avec les étoiles de ta meilleure partie (' + et + ' ★).</p><h3>Couleur de la comète</h3><div class="tuiles">';
      for (i = 0; i < COULEURS_COMETE.length; i++) {
        var c = COULEURS_COMETE[i], ok2 = et >= c.etoiles, fond = c.c === 'arc' ? 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' : c.c;
        html += '<button class="tuile' + (d.cosmetique.couleur === i ? ' actif' : '') + (ok2 ? '' : ' verrou') + '" data-a="coul" data-v="' + i + '" title="' + (ok2 ? c.nom : c.nom + ' : ' + c.etoiles + ' étoiles') + '"><i style="background:' + fond + '"></i><span>' + (ok2 ? c.nom : c.etoiles + ' ★') + '</span></button>';
      }
      html += '</div><h3>Traînée</h3><div class="tuiles larges">';
      for (i = 0; i < TRAINEES.length; i++) {
        var t = TRAINEES[i], ok3 = !t.succes || d.succes[t.succes], sc = t.succes ? SUCCES.filter(function (x) { return x.id === t.succes; })[0] : null;
        html += '<button class="tuile' + (d.cosmetique.trainee === i ? ' actif' : '') + (ok3 ? '' : ' verrou') + '" data-a="trai" data-v="' + i + '" title="' + (ok3 ? t.nom : 'Succès « ' + sc.nom + ' » : ' + sc.desc) + '"><span>' + t.nom + '</span>' + (ok3 ? '' : '<small>🔒 ' + sc.nom + '</small>') + '</button>';
      }
      html += '</div>';
    } else {
      var st = d.stats, hh = Math.floor(st.temps / 3600), mm = Math.floor((st.temps % 3600) / 60);
      var parts = ''; for (var k0 in DIFFS) parts += '<div><b>' + (d.parties[k0].ascension.debloque - 1) + '</b><span>' + DIFFS[k0].ico + ' ' + DIFFS[k0].nom + '</span></div>';
      html += '<div class="stats">' +
        '<div><b>' + (hh ? hh + ' h ' : '') + mm + ' min</b><span>de combat</span></div><div><b>' + st.colosses + '</b><span>colosses vaincus</span></div><div><b>' + st.titans + '</b><span>Titans vaincus</span></div>' + parts +
        '<div><b>' + st.boucles + '</b><span>boucles</span></div><div><b>' + st.noyaux + '</b><span>cristaux brisés</span></div><div><b>' + st.balles + '</b><span>balles détruites</span></div>' +
        '<div><b>' + st.comboMax + '</b><span>meilleur combo</span></div><div><b>' + st.pile + '</b><span>boucles « pile »</span></div><div><b>' + st.comps + '</b><span>compétences lancées</span></div><div><b>' + Jeu.maxOdy() + '</b><span>record d’Odyssée</span></div></div>';
      var tot = 0, kk; for (kk in st.mortsPar) tot += st.mortsPar[kk];
      if (tot) {
        var l = []; for (kk in st.mortsPar) l.push([kk, st.mortsPar[kk]]); l.sort(function (a, b) { return b[1] - a[1]; });
        html += '<h3>Ce qui t’a vaincu (' + tot + ' défaites)</h3><div class="barres">';
        for (i = 0; i < l.length; i++) html += '<div class="barre"><span>' + (NOMS_CAUSES[l[i][0]] || l[i][0]) + '</span><i style="width:' + Math.max(2, l[i][1] / l[0][1] * 100) + '%"></i><b>' + Math.round(l[i][1] / tot * 100) + ' %</b></div>';
        html += '</div><div class="conseil">💡 ' + (CONSEILS[l[0][0]] || '') + '</div>';
      }
    }
    html += '</div>';
    this.montrer(html, '', function () { Menus.accueil(); }, garder);
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
    var J = Jeu.J, ody = J.cfg.mode === 'odyssee', C = J.C, tr = '';
    (C.def.traits || []).forEach(function (t) { tr += '<div class="pastille-r trait"><i>' + TRAITS[t].ico + '</i><b>' + TRAITS[t].nom + '</b><span>' + TRAITS[t].desc + '</span></div>'; });
    var html = '<div class="panneau petitp"><h2>Pause</h2><p class="petit">' + (J.cfg.etiquette || '') + ' · ' + Math.floor(pctCombat(C) * 100) + ' %</p>' +
      (tr ? '<div class="regles-col">' + tr + '</div>' : '') +
      '<button class="principal" data-a="reprendre">Reprendre</button>' +
      (ody ? '' : '<button data-a="recommencer">Recommencer (R)</button>') +
      this.bascule('tremblement', 'Tremblements', 'Secousses de l\'écran') +
      '<button data-a="quitter">' + (ody ? 'Abandonner l\'Odyssée' : 'Quitter') + '</button></div>';
    this.montrer(html, 'sombre', function () { Jeu.reprendre(); });
  },

  /* ---------- écrans de fin ---------- */
  gains: function (x) {
    var s = x.poussiere ? '<p class="gain">✧ +' + x.poussiere + ' poussière d\'étoile</p>' : '';
    if (x.comps && x.comps.length) s += '<p class="gain nouveau-comp">Nouvelle compétence : ' + x.comps.map(function (c) { return COMPETENCES[c].ico + ' ' + COMPETENCES[c].nom; }).join(', ') + '</p>';
    if (x.formes && x.formes.length) s += '<p class="gain nouveau-comp">Nouvelle forme : ' + x.formes.map(function (c) { return FORMES[c].ico + ' ' + FORMES[c].nom; }).join(', ') + '</p>';
    return s;
  },
  fin: function (J, x) {
    var cfg = J.cfg, C = J.C, html, nouv = (x.comps && x.comps.length) || (x.formes && x.formes.length);
    if (x.victoire) {
      var titre = cfg.mode === 'jour' ? 'Défi relevé !' : (C.def.titan ? 'Titan vaincu !' : 'Colosse vaincu !');
      html = '<div class="panneau petitp fin"><div class="victoire">' + titre + '</div><p>' + C.def.nom + ', ' + C.def.epithete + '</p>' +
        (cfg.mode === 'entrainement' ? '' : '<div class="grandes-etoiles">' + this.etoiles(x.etoiles) + '</div>') +
        '<div class="stats"><div><b>' + fmtTemps(x.temps) + '</b><span>' + (x.nouveauTemps ? '<i class="or">nouveau record !</i>' : 'temps') + '</span></div><div><b>' + C.s.comboMax + '</b><span>meilleur combo</span></div><div><b>' + pluriel(x.touches, 'coup', 'coups') + '</b><span>reçus</span></div></div>' +
        this.gains(x) +
        (cfg.mode === 'ascension' && x.etoiles < 3 ? '<p class="petit">' + (x.etoiles === 1 ? '★★ : ne te fais toucher qu\'une fois au plus. ' : '') + '★★★ : sans te faire toucher.</p>' : '') +
        (nouv ? '<button class="principal" data-a="versArsenal" data-v="' + (x.formes && x.formes.length ? 'forme' : 'comp') + '">Voir la nouveauté</button>' : '') +
        (cfg.mode === 'ascension' ? '<button class="gros' + (nouv ? '' : ' principal') + '" data-a="suivant"><b>Colosse ' + (cfg.n + 1) + '</b><span>' + colosseAscension(cfg.n + 1).nom + '</span></button><button data-a="rejouer">Rejouer (R)</button>' :
          '<button class="' + (nouv ? '' : 'principal') + '" data-a="rejouer">Rejouer (R)</button>') +
        '<button class="discret" data-a="quitter">Menu</button></div>';
      this.montrer(html, 'fond-leger', function () { Jeu.quitter(); });
      return;
    }
    var pc = Math.floor(x.pct * 100), tr = C.def.traits && C.def.traits.length ? TRAITS[C.def.traits[0]] : null;
    html = '<div class="panneau petitp fin"><div class="pct-mort">' + pc + ' %</div>' +
      '<p>' + (x.nouveauPct ? '<b class="or">Nouveau record !</b> ' : '') + (cfg.mode === 'ascension' && x.record ? 'Record : ' + Math.floor(x.record.pct * 100) + ' % · essai ' + x.record.essais : '') + '</p>' +
      (x.cause ? '<p class="petit">Vaincu par : <b>' + (NOMS_CAUSES[x.cause] || x.cause) + '</b></p><p class="conseil petit">💡 ' + (CONSEILS[x.cause] || '') + '</p>' : '') +
      (tr ? '<p class="conseil petit">' + tr.ico + ' ' + tr.nom + ' : ' + tr.conseil + '</p>' : '') +
      this.gains(x) +
      '<button class="gros principal" data-a="rejouer"><b>Réessayer</b><span>Espace · R</span></button>' +
      (cfg.mode === 'ascension' ? '<button data-a="preparer">Changer de forme ou de compétences</button><button data-a="versEnt">S\'entraîner sur ce colosse</button>' : '') +
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
