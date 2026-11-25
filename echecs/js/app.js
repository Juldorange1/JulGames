/* Échecs — déroulement : accueil, lancement d'une configuration (avec tirage au hasard sous contrôle
   de l'avantage), partie contre les bots, barre d'avantage permanente, meilleurs coups, navigation,
   recommencer, pendule, sauvegardes. */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const CLE_OPT = 'echecs.options';
  const CLE_ENCOURS = 'echecs.encours';
  const CLE_PARTIES = 'echecs.parties';

  const BOTS = {
    expert: { nom: 'Expert', detail: '≈ 2200 Elo', elo: 2200 },
    maitre: { nom: 'Maître', detail: 'pleine force', elo: null }
  };
  // Adversaire : un bot du jeu (Expert, Maître) ou un bot créé (pourcentages par rang de coup).
  function botDe(id) {
    if (BOTS[id]) return BOTS[id];
    const b = window.Bots && window.Bots.trouver(id);
    if (b) return { nom: b.nom, detail: window.Bots.resume(b), elo: null, rangs: b.rangs.slice() };
    return BOTS.expert;
  }
  const COULEURS_CONSEILS = ['rgba(90,200,90,0.9)', 'rgba(80,160,255,0.85)', 'rgba(240,170,60,0.85)'];

  function lire(cle, defaut) {
    try { const v = JSON.parse(localStorage.getItem(cle)); return v == null ? defaut : v; } catch (e) { return defaut; }
  }
  function ecrire(cle, v) {
    try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { console.warn('Sauvegarde impossible', e); }
  }

  const options = Object.assign({
    sons: true, ambiance: true, volume: 40, theme: 'sable', decor: 'nuit', jouer: 'classique', adversaire: 'ami', avMin: -0.5, avMax: 0.5, couleur: 'w', pendule: '0', reflexion: '3000', touche: { code: 'Space', nom: 'Espace' }
  }, lire(CLE_OPT, {}));
  // Les 3 meilleurs coups ne s'affichent que tant qu'on tient la touche (ou le bouton) enfoncée.
  let conseilsTenus = false;
  let toucheTenue = false;
  // Profondeur à atteindre avant d'afficher les 3 meilleurs coups (ils ne changent plus ensuite).
  const PROF_CONSEILS = { sf: 20, fairy: 16 };
  const MAX_CONSEILS = 25000; // ms au plus
  function sauverOptions() { ecrire(CLE_OPT, options); }

  // ---------- évaluations ----------
  function chances(score) {
    if (!score) return 50;
    if (score.mate != null) return score.mate > 0 ? 100 : (score.mate < 0 ? 0 : 50);
    const cp = Math.max(-2000, Math.min(2000, score.cp));
    return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
  }
  function texteScore(score) {
    if (!score) return '0,0';
    if (score.mate != null) {
      if (score.mate === 0) return '#';
      return (score.mate > 0 ? '' : '−') + 'M' + Math.abs(score.mate);
    }
    const v = score.cp / 100;
    const s = Math.abs(v).toFixed(1).replace('.', ',');
    return (v > 0.04 ? '+' : v < -0.04 ? '−' : '') + s;
  }
  function inverser(score) {
    if (!score) return score;
    return score.mate != null ? { mate: -score.mate } : { cp: -score.cp };
  }
  // Barre d'avantage. retourne = noirs en bas ; horizontale = blancs à gauche.
  // reperes = [{ score, etiquette, couleur }] (meilleurs coups).
  function majBarre(el, scoreBlanc, retourne, horizontale, reperes) {
    const p = chances(scoreBlanc);
    el.classList.toggle('retournee', !!retourne);
    const b = el.querySelector('.barre-blanc');
    if (horizontale) b.style.width = p + '%'; else b.style.height = p + '%';
    const t = el.querySelector('.barre-texte');
    t.textContent = texteScore(scoreBlanc);
    t.classList.toggle('cote-blanc', p >= 50);
    t.classList.toggle('cote-noir', p < 50);
    el.querySelectorAll('.barre-repere').forEach((x) => x.remove());
    // repères espacés d'au moins 28 px pour rester lisibles
    const H = el.getBoundingClientRect().height || 400;
    const pos = (reperes || []).map((r) => H * chances(r.score) / 100);
    for (let i = 1; i < pos.length; i++) if (Math.abs(pos[i] - pos[i - 1]) < 28) pos[i] = pos[i - 1] - 28;
    for (let i = 0; i < pos.length; i++) pos[i] = Math.max(14, Math.min(H - 14, pos[i]));
    for (let i = 1; i < pos.length; i++) if (Math.abs(pos[i] - pos[i - 1]) < 28) pos[i] = pos[i - 1] + 28;
    (reperes || []).forEach((r, i) => {
      const d = document.createElement('div');
      d.className = 'barre-repere';
      d.style[retourne ? 'top' : 'bottom'] = (pos[i] - 13) + 'px';
      d.style.background = r.couleur;
      d.textContent = r.etiquette;
      d.title = texteScore(r.score);
      el.appendChild(d);
    });
  }

  // ---------- écrans ----------
  function ecran(nom) {
    if (App.ecranActuel === 'partie' && nom !== 'partie') arreterAnalyse();
    $$('.ecran').forEach((e) => e.classList.toggle('visible', e.id === 'ecran-' + nom));
    if (App.ecranActuel && App.ecranActuel !== nom) window.Son.ecran();
    App.ecranActuel = nom;
    if (nom === 'accueil') construireMenu();
    if (nom === 'jouer') { pageJouer = -1; construireJouer(); }
    if (nom === 'parametres') construireParametres();
    if (nom === 'cartes') window.EditeurCartes.ouvrir();
    if (nom === 'bots') window.EditeurBots.ouvrir();
    if (nom === 'config') window.EditeurConfig.ouvrir();
    if (nom === 'persos') window.EditeurPersos.ouvrir();
    requestAnimationFrame(redimensionner);
  }

  function modale(html, boutons, fermable) {
    const m = $('#modale'), b = $('#modale-boite');
    b.innerHTML = '';
    const contenu = document.createElement('div');
    contenu.className = 'modale-contenu';
    if (typeof html === 'string') contenu.innerHTML = html; else contenu.appendChild(html);
    b.appendChild(contenu);
    const rangee = document.createElement('div');
    rangee.className = 'ligne-boutons centre';
    for (const bt of boutons || []) {
      const x = document.createElement('button');
      x.className = 'bouton ' + (bt.classe || '');
      x.textContent = bt.texte;
      x.addEventListener('click', () => { fermerModale(); if (bt.action) bt.action(); });
      rangee.appendChild(x);
    }
    b.appendChild(rangee);
    m.classList.remove('cachee');
    m.dataset.fermable = fermable === false ? '' : '1';
    return contenu;
  }
  function fermerModale() { $('#modale').classList.add('cachee'); }

  let bulleMinuteur = null;
  function bulle(texte) {
    const b = $('#bulle');
    b.textContent = texte;
    b.classList.remove('cachee');
    clearTimeout(bulleMinuteur);
    bulleMinuteur = setTimeout(() => b.classList.add('cachee'), 2800);
  }

  // ---------- menu principal ----------
  function construireMenu() {
    const enCours = lire(CLE_ENCOURS, null);
    $('#btn-reprendre').style.display = enCours ? '' : 'none';
    if (enCours) $('#btn-reprendre').textContent = '↺ Reprendre la partie en cours (' + ((enCours.variante && enCours.variante.nom) || 'Partie normale') + ')';
    const note = $('#note-moteur');
    if (!window.Moteurs.disponible('fairy')) note.textContent = 'Les bots ont besoin que la page soit rechargée une fois (et ouverte par une adresse http, pas en fichier).';
    else note.textContent = window.crossOriginIsolated ? 'Les moteurs calculent sur ' + Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1)) + ' cœurs du processeur.' : '';
  }

  // ---------- paramètres : thème du plateau, décor de fond ----------
  function choisirOngletPar(o) {
    $$('#par-onglets button').forEach((b) => b.classList.toggle('actif', b.dataset.par === o));
    $$('.par-panneau').forEach((p) => p.classList.toggle('cache', p.dataset.par !== o));
  }
  // son d'ambiance du décor choisi (fondu doux)
  function majAmbiance() {
    const d = window.Themes.DECORS.find((x) => x.id === options.decor);
    window.Son.ambiance(options.ambiance && d ? d.ambiance || null : null, options.volume / 100);
  }
  function construireParametres() {
    $('#opt-sons').checked = options.sons;
    $('#opt-ambiance').checked = options.ambiance;
    $('#opt-volume').value = options.volume;
    $$('#par-onglets button').forEach((b) => { b.onclick = () => choisirOngletPar(b.dataset.par); });
    if (!$('#par-onglets .actif')) choisirOngletPar('plateau'); else choisirOngletPar($('#par-onglets .actif').dataset.par);
    const remplir = (box, liste, cle, apercu, appliquer) => {
      box.innerHTML = '';
      for (const t of liste) {
        const b = document.createElement('button');
        b.className = 'carte-apparence' + (options[cle] === t.id ? ' choisie' : '');
        b.appendChild(apercu(t));
        const n = document.createElement('span'); n.textContent = t.nom; b.appendChild(n);
        b.onclick = () => {
          options[cle] = t.id; sauverOptions(); appliquer(t.id);
          box.querySelectorAll('.carte-apparence').forEach((x) => x.classList.toggle('choisie', x === b));
        };
        box.appendChild(b);
      }
    };
    remplir($('#par-themes'), window.Themes.THEMES, 'theme', window.Themes.apercuTheme, window.Themes.appliquerTheme);
    remplir($('#par-decors'), window.Themes.DECORS, 'decor', window.Themes.apercuDecor, (id) => { window.Themes.appliquerDecor(id); majAmbiance(); });
  }

  // ---------- jouer : partie normale ou configuration créée ----------
  let plateauApercu = null;
  let jetonApercu = 0;
  let pageJouer = 0;
  const PAR_PAGE_JOUER = 9;
  function configChoisie() {
    return window.Config.trouver(options.jouer || 'classique') || window.Config.classique();
  }
  // Les bots créés, sous les adversaires du jeu, + un bouton pour en créer.
  function remplirBots() {
    let box = $('#choix-bots');
    if (!box) { box = document.createElement('div'); box.id = 'choix-bots'; box.className = 'bots-crees'; $('#choix-adversaire').appendChild(box); }
    box.innerHTML = '';
    for (const b of window.Bots.liste()) {
      const x = document.createElement('button');
      x.dataset.val = b.id; x.textContent = '🤖 ' + b.nom; x.title = window.Bots.resume(b);
      box.appendChild(x);
    }
    const c = document.createElement('button');
    c.className = 'creer-bot'; c.textContent = '➕ Créer des bots';
    c.onclick = () => ecran('bots');
    box.appendChild(c);
    if (options.adversaire !== 'ami' && !window.Bots.trouver(options.adversaire)) { options.adversaire = 'ami'; sauverOptions(); }
  }
  function jouerContre(id) { options.adversaire = id; sauverOptions(); ecran('jouer'); }

  function majAvantageVoulu() {
    const ecrit = (v) => (v > 0 ? '+' : '') + String(v).replace('.', ',');
    if (document.activeElement !== $('#jo-av-min')) $('#jo-av-min').value = ecrit(options.avMin);
    if (document.activeElement !== $('#jo-av-max')) $('#jo-av-max').value = ecrit(options.avMax);
  }
  function lireAvantageVoulu(e) {
    const lire = (el) => { const v = parseFloat(String(el.value).replace(',', '.').replace('−', '-').replace(/\s/g, '')); return isNaN(v) ? null : Math.max(-50, Math.min(50, v)); };
    const a = lire($('#jo-av-min')), b = lire($('#jo-av-max'));
    $('#jo-av-min').classList.toggle('faux', a == null); $('#jo-av-max').classList.toggle('faux', b == null);
    if (a == null || b == null) return;
    // la case qu'on vient d'écrire a raison : l'autre s'ajuste si besoin
    const surMax = e && e.target && e.target.id === 'jo-av-max';
    if (a > b) { if (surMax) options.avMin = options.avMax = b; else options.avMin = options.avMax = a; }
    else { options.avMin = a; options.avMax = b; }
    sauverOptions();
  }
  function construireJouer() {
    remplirBots();
    majAvantageVoulu();
    const cfg = configChoisie();
    if (cfg.id !== options.jouer) { options.jouer = cfg.id; sauverOptions(); }
    const { pos, zones } = window.Editeur.positionAffichage(cfg);
    plateauApercu.afficher(pos, { decor: { zones } });
    redimensionnerApercu();
    // liste : partie normale + configurations créées (par pages : rien ne défile)
    const box = $('#jouer-liste');
    box.innerHTML = '';
    const toutes = [Object.assign(window.Config.classique(), { nom: '♟ Partie normale' })].concat(window.Config.liste());
    const pages = Math.max(1, Math.ceil(toutes.length / PAR_PAGE_JOUER));
    const ici = toutes.findIndex((c) => c.id === cfg.id);
    if (pageJouer < 0) pageJouer = ici >= 0 ? Math.floor(ici / PAR_PAGE_JOUER) : 0;
    pageJouer = Math.min(pageJouer, pages - 1);
    for (const c of toutes.slice(pageJouer * PAR_PAGE_JOUER, (pageJouer + 1) * PAR_PAGE_JOUER)) {
      const b = document.createElement('button');
      b.className = 'puce-config' + (c.id === cfg.id ? ' choisie' : '') + (c.id === 'classique' ? ' normale' : '');
      b.textContent = c.nom;
      b.title = c.nom;
      b.onclick = () => { options.jouer = c.id; sauverOptions(); construireJouer(); };
      box.appendChild(b);
    }
    if (pages > 1) box.appendChild(window.Editeur.pagination(pageJouer, pages, (p) => { pageJouer = p; construireJouer(); }));
    if (window.Config.liste().length === 0) {
      const a = document.createElement('p');
      a.className = 'aide';
      a.textContent = 'Tes configurations apparaîtront ici (menu « ⚙ Configurer des parties »).';
      box.appendChild(a);
    }
    // avantage
    const jet = ++jetonApercu;
    const av = $('#acc-avantage');
    const err = window.Config.verifier(cfg);
    $('#btn-commencer').disabled = !!err;
    if (err) { av.textContent = '⚠ ' + err; av.className = 'acc-avantage erreur'; }
    else if (window.Config.aleatoire(cfg)) {
      av.className = 'acc-avantage';
      av.textContent = '🎲 Avec du hasard : le tirage est refait jusqu’à tomber dans ton avantage voulu.';
    } else {
      av.className = 'acc-avantage';
      av.textContent = 'Calcul de l’avantage des blancs…';
      const v = window.Config.construire(cfg, window.Config.tirage(cfg));
      window.Config.evaluer(v, { profondeur: 16, temps: 1200 }).then((x) => {
        if (jet !== jetonApercu || x == null) return;
        av.textContent = 'Avantage des blancs au départ : ' + window.Editeur.texteAvantage(x) + ' (sans hasard, il ne peut pas changer).';
      }).catch(() => {});
    }
    for (const [id, cle] of [['#choix-adversaire', 'adversaire'], ['#choix-couleur', 'couleur'], ['#choix-pendule', 'pendule'], ['#choix-reflexion', 'reflexion']]) {
      $$(id + ' button[data-val]').forEach((b) => {
        b.classList.toggle('choisi', b.dataset.val === String(options[cle]));
        b.onclick = () => { options[cle] = b.dataset.val; sauverOptions(); majChoix(); };
      });
    }
    majChoix();
  }
  function jouerAvec(id) {
    options.jouer = id;
    sauverOptions();
    ecran('jouer');
  }
  function majChoix() {
    for (const [id, cle] of [['#choix-adversaire', 'adversaire'], ['#choix-couleur', 'couleur'], ['#choix-pendule', 'pendule'], ['#choix-reflexion', 'reflexion']]) {
      $$(id + ' button').forEach((b) => b.classList.toggle('choisi', b.dataset.val === String(options[cle])));
    }
    $('#bloc-reflexion').style.display = options.adversaire === 'ami' || options.pendule !== '0' ? 'none' : '';
    $('#bloc-couleur').style.display = options.adversaire === 'ami' ? 'none' : '';
  }
  function redimensionnerApercu() {
    const zone = $('#plateau-apercu');
    if (!zone || !zone.offsetParent || !plateauApercu.position) return;
    const r = zone.parentElement.getBoundingClientRect();
    const haut = window.innerHeight - zone.getBoundingClientRect().top - 140;
    const t = Math.floor(Math.min((r.width - 10) / plateauApercu.cols, Math.max(160, haut) / plateauApercu.lignes));
    plateauApercu.taille(Math.max(20, Math.min(70, t)));
  }

  // ---------- lancement ----------
  function reglagesActuels() {
    return { adversaire: options.adversaire, couleur: options.couleur, pendule: options.pendule, reflexion: options.reflexion };
  }

  // Prépare la configuration courante (tirage au hasard contrôlé) puis lance la partie.
  async function commencer(cfg, reglages) {
    cfg = window.Config.copie(cfg || configChoisie());
    cfg.avMin = options.avMin; cfg.avMax = options.avMax;
    reglages = reglages || reglagesActuels();
    const err = window.Config.verifier(cfg);
    if (err) {
      modale('<h2>Configuration impossible</h2><p></p>', [{ texte: '⚙ La modifier', classe: 'principal', action: () => { if (cfg.id !== 'classique') window.Config.definirCourante(cfg); ecran('config'); } }, { texte: 'Fermer' }]).querySelector('p').textContent = err;
      return;
    }
    arreterTout();
    let prep;
    if (window.Config.aleatoire(cfg)) {
      const c = modale('<h2>Tirage au sort…</h2><p class="tirage">Recherche d’un tirage où l’avantage des blancs est entre ' +
        window.Editeur.texteAvantage(cfg.avMin) + ' et ' + window.Editeur.texteAvantage(cfg.avMax) + '.</p><p class="tirage-etat"></p>', [], false);
      try {
        prep = await window.Config.preparer(cfg, (i, n, av, ok) => {
          c.querySelector('.tirage-etat').textContent = 'Essai ' + i + ' : avantage ' + window.Editeur.texteAvantage(av) + (ok ? ' ✔' : ' (hors fourchette)');
        });
      } catch (e) {
        fermerModale();
        bulle('Aucun tirage jouable : change la configuration.');
        return;
      }
      fermerModale();
      if (prep.ecart > 0) bulle('Aucun tirage dans la fourchette : le plus proche a été pris (' + window.Editeur.texteAvantage(prep.avantage) + ').');
    } else {
      prep = { variante: window.Config.construire(cfg, window.Config.tirage(cfg)), avantage: null };
    }
    lancerPartie(prep.variante, reglages, null, cfg);
  }

  // ---------- partie ----------
  let jeu = null;
  let plateau = null;
  let horlogeMinuteur = null;
  let jeton = 0;          // situations du bot
  let jetonAnalyse = 0;   // analyse en direct

  function nomJoueur(camp) {
    if (!jeu) return '';
    if (jeu.adversaire === 'ami') return camp === 'w' ? 'Blancs' : 'Noirs';
    if (camp === jeu.humain) return 'Toi';
    return botDe(jeu.adversaire).nom;
  }
  function detailJoueur(camp) {
    if (!jeu || jeu.adversaire === 'ami' || camp === jeu.humain) return '';
    const b = botDe(jeu.adversaire);
    if (b.elo || b.rangs) return b.detail;
    return jeu.variante.moteur === 'sf' ? 'Stockfish 19' : 'Fairy-Stockfish';
  }
  function estAuBot() {
    return jeu && !jeu.fin && jeu.adversaire !== 'ami' && jeu.partie.trait() !== jeu.humain;
  }

  function lancerPartie(v, reglages, depuis, cfg) {
    arreterTout();
    if (jeu && jeu.partie) jeu.partie.detruire();
    let humain = reglages.couleur;
    if (humain === 'hasard') humain = Math.random() < 0.5 ? 'w' : 'b';
    if (reglages.adversaire === 'ami') humain = 'w';
    let partie;
    try {
      partie = new window.Regles.Partie(v, depuis ? depuis.fen0 : v.fen0, depuis && depuis.coups);
    } catch (e) {
      console.error(e);
      bulle('Impossible de lancer cette partie.');
      return;
    }
    const pend = reglages.pendule && reglages.pendule !== '0' ? String(reglages.pendule).split('+').map(Number) : null;
    jeu = {
      id: 'p' + Date.now().toString(36), date: Date.now(), variante: v, cfg: cfg ? window.Config.copie(cfg) : null,
      reglages: Object.assign({}, reglages, { couleur: humain }),
      partie, adversaire: reglages.adversaire, humain, reflexion: +reglages.reflexion || 3000,
      pendule: pend ? { base: pend[0] * 60000, inc: (pend[1] || 0) * 1000 } : null,
      temps: pend ? { w: pend[0] * 60000, b: pend[0] * 60000 } : null,
      fin: null, aide: false, vue: null, analyse: null
    };
    window.Moteurs.pourVariante(v, 'jeu').nouvellePartie();
    ecran('partie');
    plateau.retourner(humain === 'b');
    afficherPartie(false, { entree: true });
    window.Son.debut();
    sauverEnCours();
    demarrerHorloge();
    tour();
  }

  function reprendre() {
    const s = lire(CLE_ENCOURS, null);
    if (!s || !s.variante) return;
    arreterTout();
    if (jeu && jeu.partie) jeu.partie.detruire();
    let partie;
    try { partie = new window.Regles.Partie(s.variante, s.fen0, s.coups); } catch (e) { bulle('Partie illisible.'); localStorage.removeItem(CLE_ENCOURS); return; }
    jeu = {
      id: s.id, date: s.date, variante: s.variante, cfg: s.cfg, reglages: s.reglages, partie, adversaire: s.adversaire, humain: s.humain,
      reflexion: s.reflexion, pendule: s.pendule, temps: s.temps, fin: null, aide: s.aide, vue: null, analyse: null
    };
    window.Moteurs.pourVariante(s.variante, 'jeu').nouvellePartie();
    ecran('partie');
    plateau.retourner(jeu.humain === 'b');
    afficherPartie(false);
    demarrerHorloge();
    tour();
  }

  function sauverEnCours() {
    if (!jeu || jeu.fin) { localStorage.removeItem(CLE_ENCOURS); return; }
    ecrire(CLE_ENCOURS, {
      id: jeu.id, date: jeu.date, variante: jeu.variante, cfg: jeu.cfg, reglages: jeu.reglages, fen0: jeu.partie.fen0, coups: jeu.partie.coups,
      adversaire: jeu.adversaire, humain: jeu.humain, reflexion: jeu.reflexion, pendule: jeu.pendule, temps: jeu.temps, aide: jeu.aide
    });
  }

  function caseRoiEnEchec(pos, partie) {
    if (!partie.echec()) return null;
    const roi = partie.trait() === 'w' ? 'K' : 'k';
    for (let r = 0; r < pos.lignes; r++) {
      for (let c = 0; c < pos.cols; c++) {
        const p = pos.cases[r][c];
        if (p && p.l === roi) return 'abcdefghijkl'[c] + (pos.lignes - r);
      }
    }
    return null;
  }
  function dernierCoupCases(uci) {
    if (!uci) return null;
    const d = window.Regles.decouper(uci);
    if (!d) return null;
    return d.de ? [d.de, d.vers] : [d.vers];
  }

  function indexVue() { return jeu.vue == null ? jeu.partie.coups.length : jeu.vue; }

  function afficherPartie(animer, extra) {
    const p = jeu.partie;
    const n = indexVue();
    const enDirect = n === p.coups.length;
    const pos = window.Regles.lireFen(p.fens[n]);
    let echec = null;
    if (enDirect) echec = caseRoiEnEchec(pos, p);
    else {
      try { const t = new window.Regles.Partie(jeu.variante, p.fen0, p.coups.slice(0, n)); echec = caseRoiEnEchec(pos, t); t.detruire(); } catch (e) { /* rien */ }
    }
    plateau.afficher(pos, Object.assign({ variante: jeu.variante, dernier: dernierCoupCases(p.coups[n - 1]), echec, animer }, extra || {}));
    $('#nom-config').innerHTML = 'Configuration : <b></b>';
    $('#nom-config b').textContent = jeu.variante.nom || 'Classique';
    const bas = plateau.retourne ? 'b' : 'w';
    const haut = bas === 'w' ? 'b' : 'w';
    for (const [id, camp] of [['#joueur-haut', haut], ['#joueur-bas', bas]]) {
      const el = $(id);
      el.querySelector('.joueur-nom').textContent = (camp === 'w' ? '○ ' : '● ') + nomJoueur(camp);
      let extra = detailJoueur(camp);
      if (pos.echecs) extra = (extra ? extra + ' · ' : '') + 'échecs à donner : ' + pos.echecs[camp];
      el.querySelector('.joueur-extra').textContent = extra;
      el.classList.toggle('au-trait', !jeu.fin && pos.trait === camp);
      el.querySelector('.pendule').style.display = jeu.temps ? '' : 'none';
    }
    majPendules();
    remplirListeCoups($('#coups-partie'), p, n, null, (k) => allerVue(k));
    $('#btn-annuler').disabled = !!jeu.fin || !p.coups.length;
    $('#btn-abandonner').disabled = !!jeu.fin;
    $('#nav-partie [data-nav=prec]').disabled = n === 0;
    $('#nav-partie [data-nav=debut]').disabled = n === 0;
    $('#nav-partie [data-nav=suiv]').disabled = enDirect;
    $('#nav-partie [data-nav=fin]').disabled = enDirect;
    const bandeau = $('#vue-passee');
    bandeau.style.display = enDirect ? 'none' : '';
    if (!enDirect) $('#vue-passee-texte').textContent = 'Tu regardes la position après le coup ' + n + ' sur ' + p.coups.length + '.';
    $('#conseils').style.display = conseilsTenus ? '' : 'none';
    majAnalyseAffichage();
    redimensionner();
  }

  function remplirListeCoups(el, partie, courant, marques, surClic) {
    el.innerHTML = '';
    const sans = partie.sans;
    const premierNoir = window.Regles.lireFen(partie.fen0).trait === 'b';
    let num = +(partie.fen0.split(/\s+/).pop()) || 1;
    let i = 0;
    let rangee = null;
    const ajouter = (k) => {
      const c = document.createElement('button');
      c.className = 'coup' + (k + 1 === courant ? ' courant' : '');
      c.textContent = sans[k];
      if (marques && marques[k]) {
        c.classList.add('m-' + marques[k].classe);
        const s = document.createElement('span'); s.className = 'symbole'; s.textContent = marques[k].symbole;
        c.appendChild(s);
      }
      if (surClic) c.addEventListener('click', () => surClic(k + 1));
      rangee.appendChild(c);
    };
    while (i < sans.length) {
      rangee = document.createElement('div'); rangee.className = 'rangee-coups';
      const n = document.createElement('span'); n.className = 'num'; n.textContent = num + '.';
      rangee.appendChild(n);
      if (i === 0 && premierNoir) {
        const vide = document.createElement('span'); vide.className = 'coup vide'; vide.textContent = '…'; rangee.appendChild(vide);
        ajouter(i); i++;
      } else {
        ajouter(i); i++;
        if (i < sans.length) { ajouter(i); i++; }
      }
      el.appendChild(rangee);
      num++;
    }
    const cour = el.querySelector('.courant');
    if (cour) cour.scrollIntoView({ block: 'nearest' });
    else el.scrollTop = courant === 0 ? 0 : el.scrollHeight;
  }

  function etat(texte) { $('#etat-partie').textContent = texte; }

  function tour() {
    if (!jeu || jeu.fin) return;
    const p = jeu.partie;
    if (p.finie()) { terminer(p.resultat(), p.raison()); return; }
    const monJeton = ++jeton;
    relancerAnalyse();
    if (estAuBot()) {
      plateau.bloquer();
      lancerBot(monJeton);
    } else {
      const camp = p.trait();
      if (jeu.vue == null) plateau.autoriser(p.legaux(), camp);
      etat(jeu.adversaire === 'ami' ? 'Au tour des ' + (camp === 'w' ? 'blancs' : 'noirs') + '.' : 'À toi de jouer.');
    }
  }

  async function lancerBot(monJeton) {
    const bot = botDe(jeu.adversaire);
    const p = jeu.partie;
    const moteur = window.Moteurs.pourVariante(jeu.variante, 'jeu');
    etat(bot.nom + ' réfléchit…');
    const debut = performance.now();
    const n0 = p.coups.length, cle = p.fens[n0], trait0 = p.trait();
    const o = {
      variante: jeu.variante, fen0: p.fen0, coups: p.coups.slice(), elo: bot.elo,
      surInfo: (lignes) => {
        if (monJeton !== jeton || !lignes[0] || bot.elo || bot.rangs) return;
        etat(bot.nom + ' réfléchit… (profondeur ' + lignes[0].profondeur + ')');
        if (jeu.vue == null) { jeu.analyse = { n: n0, cle, trait: trait0, lignes: copieLignes(lignes) }; majAnalyseAffichage(); }
      }
    };
    if (bot.rangs) o.multipv = Math.max(1, bot.rangs.length);
    else if (!bot.elo) o.multipv = 3;
    if (jeu.temps && bot.elo) {
      const reste = jeu.temps[p.trait()];
      o.temps = Math.max(250, Math.min(2500, reste / 45 + jeu.pendule.inc * 0.6));
    } else if (jeu.temps) {
      o.horloge = { wtime: jeu.temps.w, btime: jeu.temps.b, winc: jeu.pendule.inc, binc: jeu.pendule.inc };
    } else {
      o.temps = bot.elo ? 900 : jeu.reflexion;
    }
    let r;
    try { r = await moteur.chercher(o); } catch (e) { console.error(e); etat('Le bot ne peut pas jouer : ' + e.message); return; }
    if (monJeton !== jeton || !jeu || jeu.fin || r.annulee) return;
    if (bot.rangs && r.lignes.length) {
      // bot créé : il joue le 1er, 2e, 3e… meilleur coup selon ses pourcentages
      const dispo = r.lignes.filter((l) => l && l.pv && l.pv[0] && p.legaux().includes(l.pv[0]));
      if (dispo.length) r.coup = dispo[window.Bots.tirer(bot.rangs, dispo.length)].pv[0];
    }
    if (!bot.elo && !bot.rangs && r.lignes.length) {
      // le Maître joue exactement le meilleur des 3 coups trouvés (celui qu'on voit en n° 1)
      const premier = r.lignes[0].pv[0];
      if (premier && p.legaux().includes(premier)) r.coup = premier;
      jeu.cache = jeu.cache || {};
      jeu.cache[cle] = { n: n0, cle, trait: trait0, lignes: copieLignes(r.lignes), fini: true };
      if (jeu.vue == null) { jeu.analyse = jeu.cache[cle]; majAnalyseAffichage(); }
    }
    if (!r.coup || !p.legaux().includes(r.coup)) {
      const l = p.legaux();
      if (!l.length) return;
      r.coup = l[Math.floor(Math.random() * l.length)];
    }
    const attente = (bot.elo ? 500 + Math.random() * 900 : 150) - (performance.now() - debut);
    if (attente > 0 && !jeu.temps) await new Promise((ok) => setTimeout(ok, attente));
    if (monJeton !== jeton || !jeu || jeu.fin) return;
    jouerCoup(r.coup, true);
  }

  // ---------- analyse en direct (barre + meilleurs coups) ----------
  function arreterAnalyse() {
    jetonAnalyse++;
    for (const m of window.Moteurs.tous()) if (m.role === 'analyse' && m.pret) m.arreter();
  }
  function copieLignes(lignes) {
    return lignes.filter(Boolean).map((l) => ({ score: l.score, pv: l.pv.slice(0, 8), profondeur: l.profondeur }));
  }
  function relancerAnalyse() {
    if (!jeu || App.ecranActuel !== 'partie') return;
    const p = jeu.partie;
    const n = indexVue();
    const cle = p.fens[n];
    const trait = window.Regles.lireFen(cle).trait;
    // déjà calculée jusqu'au bout pour cette position : on garde le résultat (il ne change plus)
    jeu.cache = jeu.cache || {};
    if (jeu.cache[cle]) { arreterAnalyse(); jeu.analyse = Object.assign({}, jeu.cache[cle], { n }); majAnalyseAffichage(); return; }
    if (jeu.analyse && jeu.analyse.cle === cle && jeu.analyse.n === n && jeu.analyse.fin) { majAnalyseAffichage(); return; }
    arreterAnalyse();
    const jet = jetonAnalyse;
    if (n === p.coups.length && p.finie()) {
      jeu.analyse = { n, cle, lignes: [], fin: p.resultat(), trait: p.trait() };
      majAnalyseAffichage();
      return;
    }
    jeu.analyse = { n, cle, trait, lignes: [] };
    // au tour du Maître, c'est son propre calcul qui donne la barre et les 3 coups
    if (n === p.coups.length && estAuBot() && !botDe(jeu.adversaire).elo && !botDe(jeu.adversaire).rangs) { majAnalyseAffichage(); return; }
    const type = jeu.variante.moteur === 'sf' ? 'sf' : 'fairy';
    window.Moteurs.pourVariante(jeu.variante, 'analyse').chercher({
      variante: jeu.variante, fen0: p.fen0, coups: p.coups.slice(0, n), elo: null,
      profondeur: PROF_CONSEILS[type], temps: MAX_CONSEILS, multipv: 3,
      surInfo: (lignes) => {
        if (jet !== jetonAnalyse || !jeu || (jeu.analyse && jeu.analyse.fini)) return;
        jeu.analyse = { n, cle, trait, lignes: copieLignes(lignes) };
        majAnalyseAffichage();
      }
    }).then((r) => {
      if (jet !== jetonAnalyse || !jeu || r.annulee || !r.lignes.length) return;
      jeu.analyse = { n, cle, trait, lignes: copieLignes(r.lignes), fini: true };
      jeu.cache = jeu.cache || {};
      jeu.cache[cle] = jeu.analyse;
      majAnalyseAffichage();
    }).catch(() => {});
  }

  // Si les deux camps jouent parfaitement : qui gagne, et en combien de coups (ou égalité).
  function majPronostic(s, prof, fini) {
    const el = $('#pronostic');
    if (!el) return;
    el.className = 'pronostic';
    if (fini) { el.textContent = ''; return; }
    if (!s) { el.textContent = '🔮 Calcul du pronostic…'; el.classList.add('attente'); return; }
    const camp = (blanc) => (blanc ? 'les blancs' : 'les noirs');
    let t;
    if (s.mate != null && s.mate !== 0) {
      const n = Math.abs(s.mate);
      t = '🔮 En jouant parfaitement : ' + camp(s.mate > 0) + ' gagnent, mat en ' + n + ' coup' + (n > 1 ? 's' : '') + '.';
      el.classList.add(s.mate > 0 ? 'blancs' : 'noirs');
    } else {
      const v = s.cp / 100, a = Math.abs(v);
      if (a < 0.6) t = '🔮 En jouant parfaitement : égalité (nulle).';
      else if (a < 2.5) t = '🔮 En jouant parfaitement : avantage ' + camp(v > 0).replace('les ', 'des ') + ' (' + texteScore(s) + '), pas encore de victoire forcée.';
      else t = '🔮 En jouant parfaitement : ' + camp(v > 0) + ' devraient gagner (' + texteScore(s) + '), mat pas encore visible.';
      el.classList.add(a < 0.6 ? 'egal' : v > 0 ? 'blancs' : 'noirs');
    }
    el.textContent = t;
    el.title = 'Calculé par le moteur à pleine force (profondeur ' + prof + ')';
  }

  function majAnalyseAffichage() {
    if (!jeu) return;
    const a = jeu.analyse;
    const barre = $('#barre-partie');
    const n = indexVue();
    if (!a || a.n !== n) { plateau.effacerFleches(); majPronostic(null, 0); return; }
    if (a.fin) {
      majPronostic(null, 0, true);
      const s = a.fin === '1-0' ? { mate: 1 } : a.fin === '0-1' ? { mate: -1 } : { cp: 0 };
      majBarre(barre, s, plateau.retourne);
      barre.querySelector('.barre-texte').textContent = a.fin === '1/2-1/2' ? '½' : a.fin;
      plateau.effacerFleches();
      $('#conseils-liste').innerHTML = '<div class="petit-gris">Partie terminée.</div>';
      return;
    }
    const versBlanc = (s) => (a.trait === 'w' ? s : inverser(s));
    const lignes = a.lignes.filter((l) => l && l.pv && l.pv.length);
    const montrer = conseilsTenus && a.fini;
    const reperes = montrer ? lignes.map((l, i) => ({ score: versBlanc(l.score), etiquette: i + 1, couleur: COULEURS_CONSEILS[i] })) : null;
    if (lignes[0]) majBarre(barre, versBlanc(lignes[0].score), plateau.retourne, false, reperes);
    majPronostic(lignes[0] && (a.fini || lignes[0].profondeur >= 12) ? versBlanc(lignes[0].score) : null, lignes[0] ? lignes[0].profondeur : 0);
    const liste = $('#conseils-liste');
    liste.innerHTML = '';
    if (!conseilsTenus) { plateau.effacerFleches(); return; }
    if (!a.fini) {
      // pas encore sûr : on n'affiche rien qui pourrait changer
      plateau.effacerFleches();
      const prof = lignes[0] ? lignes[0].profondeur : 0;
      const but = PROF_CONSEILS[jeu.variante.moteur === 'sf' ? 'sf' : 'fairy'];
      const t = document.createElement('div'); t.className = 'petit-gris';
      t.textContent = 'Calcul des 3 meilleurs coups… profondeur ' + prof + ' / ' + but;
      liste.appendChild(t);
      return;
    }
    const fl = [];
    lignes.forEach((l, i) => {
      const d = window.Regles.decouper(l.pv[0]);
      if (d) fl.push({ de: d.de, vers: d.vers, couleur: COULEURS_CONSEILS[i], etiquette: String(i + 1) });
      const san = jeu.partie.suiteSan(n, l.pv, 1)[0] || l.pv[0];
      const suite = jeu.partie.suiteSan(n, l.pv, 5);
      const ligne = document.createElement('div');
      ligne.className = 'conseil';
      ligne.innerHTML = '<span class="conseil-num"></span><b></b><span class="conseil-score"></span><span class="conseil-suite"></span>';
      ligne.querySelector('.conseil-num').textContent = i + 1;
      ligne.querySelector('.conseil-num').style.background = COULEURS_CONSEILS[i];
      ligne.querySelector('b').textContent = san;
      ligne.querySelector('.conseil-score').textContent = texteScore(versBlanc(l.score));
      ligne.querySelector('.conseil-suite').textContent = suite.slice(1).join(' ');
      liste.appendChild(ligne);
    });
    if (!lignes.length) liste.innerHTML = '<div class="petit-gris">Aucun coup.</div>';
    else {
      const pr = document.createElement('div'); pr.className = 'petit-gris';
      pr.textContent = 'Calcul terminé (profondeur ' + lignes[0].profondeur + ') · score vu des blancs';
      liste.appendChild(pr);
    }
    plateau.flechesAfficher(fl.reverse());
  }

  // Tenir la touche choisie (ou le bouton) pour voir les 3 meilleurs coups.
  function tenirConseils(oui) {
    if (conseilsTenus === oui) return;
    conseilsTenus = oui;
    $('#btn-conseils').classList.toggle('actif', oui);
    $('#conseils').style.display = oui ? '' : 'none';
    majAnalyseAffichage();
    redimensionner();
  }
  function majBoutonConseils() {
    $('#btn-conseils-texte').textContent = 'Tiens ' + options.touche.nom + ' : 3 meilleurs coups';
  }
  function changerTouche() {
    const m = modale('<h2>Touche des 3 meilleurs coups</h2><p>Appuie maintenant sur la touche que tu veux utiliser.</p>', [{ texte: 'Annuler' }]);
    const interdites = ['Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'KeyF', 'Tab', 'Enter'];
    const fin = () => document.removeEventListener('keydown', ecoute, true);
    const ecoute = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (e.code === 'Escape') { fin(); fermerModale(); return; }
      if (interdites.includes(e.code)) { m.querySelector('p').textContent = 'Cette touche sert déjà à autre chose : choisis-en une autre.'; return; }
      const nom = e.code === 'Space' ? 'Espace' : (e.key.length === 1 ? e.key.toUpperCase() : e.key);
      options.touche = { code: e.code, nom };
      sauverOptions();
      majBoutonConseils();
      fin(); fermerModale();
      bulle('Tiens ' + nom + ' enfoncé pour voir les 3 meilleurs coups.');
    };
    document.addEventListener('keydown', ecoute, true);
    m.querySelectorAll('.bouton').forEach((x) => x.addEventListener('click', fin));
  }

  function arreterTout() {
    jeton++;
    arreterAnalyse();
    for (const m of window.Moteurs.tous()) if (m.pret) m.arreter();
  }

  function surCoupHumain(uci) {
    if (!jeu || jeu.fin || estAuBot() || jeu.vue != null) return;
    jouerCoup(uci, false);
  }

  function jouerCoup(uci, animer) {
    const p = jeu.partie;
    const camp = p.trait();
    const prise = p._a().isCapture(uci);
    if (!p.jouer(uci)) return;
    plateau.effacerReperes();
    if (jeu.temps) jeu.temps[camp] += jeu.pendule.inc;
    if (p.echec()) window.Son.echec();
    else if (uci.includes('@')) window.Son.pose();
    else if (prise) window.Son.prise();
    else if (/^O-O/.test(p.sansEn[p.sansEn.length - 1] || '')) window.Son.roque();
    else window.Son.coup();
    if (/^[a-l]\d+[a-l]\d+[a-z]/.test(uci)) window.Son.promotion();
    jeu.vue = null;
    jeu.analyse = null;
    afficherPartie(animer, { effets: true });
    sauverEnCours();
    tour();
  }

  // ---------- navigation dans les coups ----------
  function allerVue(n) {
    if (!jeu) return;
    const N = jeu.partie.coups.length;
    n = Math.max(0, Math.min(N, n));
    jeu.vue = n >= N ? null : n;
    jeu.analyse = null;
    plateau.effacerReperes();
    if (jeu.vue != null) plateau.bloquer();
    afficherPartie(true);
    if (jeu.vue == null && !jeu.fin && !estAuBot()) plateau.autoriser(jeu.partie.legaux(), jeu.partie.trait());
    relancerAnalyse();
  }
  function reprendreIci() {
    if (!jeu || jeu.vue == null) return;
    const n = jeu.vue;
    arreterTout();
    const p = jeu.partie;
    while (p.coups.length > n) p.annuler();
    if (jeu.adversaire !== 'ami') jeu.aide = true;
    jeu.vue = null;
    jeu.analyse = null;
    if (jeu.fin) { jeu.fin = null; demarrerHorloge(); }
    afficherPartie(false);
    sauverEnCours();
    tour();
  }

  function annulerCoup() {
    if (!jeu || jeu.fin) return;
    const p = jeu.partie;
    if (!p.coups.length) return;
    arreterTout();
    if (jeu.adversaire === 'ami') p.annuler();
    else {
      p.annuler();
      while (p.coups.length && p.trait() !== jeu.humain) p.annuler();
      jeu.aide = true;
    }
    jeu.vue = null;
    jeu.analyse = null;
    afficherPartie(false);
    sauverEnCours();
    tour();
  }

  // Recommencer : repart du début avec la configuration actuelle (nouveau tirage s'il y a du hasard).
  // La configuration de la partie, dans sa version enregistrée la plus récente.
  function configDeLaPartie() {
    const id = jeu && jeu.cfg && jeu.cfg.id;
    return (id && window.Config.trouver(id)) || (jeu && jeu.cfg) || window.Config.classique();
  }
  function relancer() {
    const reglages = Object.assign({}, jeu.reglages, { couleur: jeu.adversaire === 'ami' ? 'w' : jeu.humain });
    const cfg = configDeLaPartie();
    commencer(cfg, reglages);
  }
  function recommencer() {
    if (!jeu) return;
    const cfg = configDeLaPartie();
    const hasard = window.Config.aleatoire(cfg);
    modale('<h2>Recommencer ?</h2><p></p>', [
      { texte: '↻ Recommencer', classe: 'principal', action: relancer },
      { texte: 'Annuler' }
    ]).querySelector('p').textContent = 'La partie repart du début avec la configuration « ' + cfg.nom + ' »' + (hasard ? ', avec un nouveau tirage au hasard.' : '.');
  }

  function abandonner() {
    if (!jeu || jeu.fin) return;
    modale('<h2>Abandonner ?</h2><p>La partie sera comptée comme perdue.</p>', [
      { texte: 'Oui, abandonner', classe: 'danger', action: () => {
        const perdant = jeu.adversaire === 'ami' ? jeu.partie.trait() : jeu.humain;
        terminer(perdant === 'w' ? '0-1' : '1-0', (perdant === 'w' ? 'Les blancs' : 'Les noirs') + ' abandonnent');
      } },
      { texte: 'Non, continuer' }
    ]);
  }

  // ---------- pendule ----------
  function demarrerHorloge() {
    clearInterval(horlogeMinuteur);
    if (!jeu.temps) return;
    let avant = performance.now();
    horlogeMinuteur = setInterval(() => {
      const maint = performance.now();
      const dt = maint - avant; avant = maint;
      if (!jeu || jeu.fin || !jeu.temps) return;
      const p = jeu.partie;
      if (!p.coups.length) return;
      const camp = p.trait();
      jeu.temps[camp] -= dt;
      if (jeu.temps[camp] <= 0) {
        jeu.temps[camp] = 0;
        majPendules();
        terminer(camp === 'w' ? '0-1' : '1-0', 'Temps écoulé');
        return;
      }
      majPendules();
    }, 100);
  }
  function texteTemps(ms) {
    const s = Math.max(0, ms) / 1000;
    if (s < 20) return Math.floor(s / 60) + ':' + (s % 60).toFixed(1).padStart(4, '0');
    const t = Math.ceil(s);
    return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  }
  function majPendules() {
    if (!jeu || !jeu.temps) return;
    const bas = plateau.retourne ? 'b' : 'w';
    const haut = bas === 'w' ? 'b' : 'w';
    for (const [id, camp] of [['#joueur-haut', haut], ['#joueur-bas', bas]]) {
      const el = $(id + ' .pendule');
      el.textContent = texteTemps(jeu.temps[camp]);
      el.classList.toggle('peu', jeu.temps[camp] < 20000);
    }
  }

  // ---------- fin de partie ----------
  function terminer(resultat, raison) {
    if (!jeu || jeu.fin) return;
    jeu.fin = { resultat, raison };
    clearInterval(horlogeMinuteur);
    jeton++;
    for (const m of window.Moteurs.tous()) if (m.role === 'jeu' && m.pret) m.arreter();
    plateau.bloquer();
    const rec = enregistrerPartie();
    jeu.vue = null;
    afficherPartie(false);
    relancerAnalyse();
    localStorage.removeItem(CLE_ENCOURS);
    let titre;
    if (resultat === '1/2-1/2') titre = 'Partie nulle';
    else {
      const gagnant = resultat === '1-0' ? 'w' : 'b';
      if (jeu.adversaire === 'ami') titre = (gagnant === 'w' ? 'Les blancs' : 'Les noirs') + ' gagnent';
      else titre = gagnant === jeu.humain ? 'Tu as gagné !' : botDe(jeu.adversaire).nom + ' a gagné';
    }
    etat(titre + ' — ' + raison);
    const gagneHumain = resultat !== '1/2-1/2' && (jeu.adversaire === 'ami' || (resultat === '1-0') === (jeu.humain === 'w'));
    if (resultat === '1/2-1/2') window.Son.nulle();
    else if (gagneHumain) { window.Son.victoire(); plateau.feuDeJoie(); }
    else window.Son.defaite();
    modale('<h2>' + titre + '</h2><p>' + raison + '</p>', [
      { texte: '📊 Bilan de la partie', classe: 'principal', action: () => window.Bilan.ouvrir(rec) },
      { texte: '↻ Recommencer', action: relancer },
      { texte: 'Voir le plateau' },
      { texte: '☰ Menu', action: () => ecran('accueil') }
    ]);
  }

  function enregistrerPartie() {
    const p = jeu.partie;
    const rec = {
      id: jeu.id, date: jeu.date, variante: jeu.variante, varianteNom: jeu.variante.nom,
      fen0: p.fen0, coups: p.coups.slice(),
      blancs: nomJoueur('w') + (detailJoueur('w') ? ' (' + detailJoueur('w') + ')' : ''),
      noirs: nomJoueur('b') + (detailJoueur('b') ? ' (' + detailJoueur('b') + ')' : ''),
      adversaire: jeu.adversaire, humain: jeu.humain, reglages: jeu.reglages, cfg: jeu.cfg,
      resultat: jeu.fin.resultat, raison: jeu.fin.raison, aide: jeu.aide,
      pendule: jeu.pendule, reflexion: jeu.reflexion, analyse: null
    };
    sauverPartie(rec);
    return rec;
  }

  function parties() { return lire(CLE_PARTIES, []).filter((r) => r.variante); }
  function sauverPartie(rec) {
    let l = parties().filter((x) => x.id !== rec.id);
    l.unshift(rec);
    if (l.length > 50) l = l.slice(0, 50);
    ecrire(CLE_PARTIES, l);
  }

  // ---------- PGN ----------
  function pgn(rec) {
    const v = rec.variante;
    const d = new Date(rec.date);
    const date = d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
    const lignes = [
      '[Event "JulGame — Échecs (' + rec.varianteNom.replace(/"/g, '') + ')"]', '[Site "JulGame"]', '[Date "' + date + '"]',
      '[White "' + rec.blancs + '"]', '[Black "' + rec.noirs + '"]', '[Result "' + rec.resultat + '"]'
    ];
    const std = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    if (rec.fen0 !== std) { lignes.push('[SetUp "1"]'); lignes.push('[FEN "' + rec.fen0 + '"]'); }
    let sans = [];
    try { const p = new window.Regles.Partie(v, rec.fen0, rec.coups); sans = p.sansEn.slice(); p.detruire(); } catch (e) { sans = rec.coups.slice(); }
    let num = +(rec.fen0.split(/\s+/).pop()) || 1;
    const noir = rec.fen0.split(/\s+/)[1] === 'b';
    let txt = '';
    let i = 0;
    if (noir && sans.length) { txt += num + '... ' + sans[0] + ' '; i = 1; num++; }
    for (; i < sans.length; i += 2) { txt += num + '. ' + sans[i] + ' ' + (sans[i + 1] ? sans[i + 1] + ' ' : ''); num++; }
    return lignes.join('\n') + '\n\n' + txt + rec.resultat + '\n';
  }

  function copier(texte, message) {
    const fin = () => bulle(message || 'Copié.');
    const repli = () => {
      const t = document.createElement('textarea'); t.value = texte; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); fin(); } catch (e) { bulle('Copie impossible.'); }
      t.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texte).then(fin, repli);
    else repli();
  }

  // ---------- règles de la partie ----------
  function montrerRegles(v) {
    v = v || (jeu && jeu.variante);
    if (!v) return;
    const d = document.createElement('div');
    const h = document.createElement('h2'); h.textContent = v.nom; d.appendChild(h);
    const p = document.createElement('p'); p.textContent = v.regles || 'Règles classiques des échecs.'; d.appendChild(p);
    const leg = document.createElement('div'); leg.className = 'legende';
    for (const l of Object.keys(v.pieces || {})) {
      const info = v.pieces[l];
      const ligne = document.createElement('div'); ligne.className = 'legende-ligne';
      const ic = window.Pieces.creerPiece(l.toUpperCase(), v); ic.classList.add('icone');
      const t = document.createElement('div');
      t.innerHTML = '<b></b><span></span>';
      t.querySelector('b').textContent = info.nom;
      t.querySelector('span').textContent = ' — ' + (info.desc || '');
      ligne.append(ic, t);
      leg.appendChild(ligne);
    }
    d.appendChild(leg);
    modale(d, [{ texte: 'Compris' }]);
  }

  // ---------- taille du plateau ----------
  function redimensionner() {
    const nom = App.ecranActuel;
    let pl = null, zone = null, barre = null;
    if (nom === 'partie') { pl = plateau; zone = $('#zone-partie'); barre = $('#barre-partie'); }
    else if (nom === 'bilan') { pl = window.Bilan.plateau; zone = $('#zone-bilan'); barre = $('#barre-bilan'); }
    else if (nom === 'config') { window.EditeurConfig.redimensionner(); return; }
    else if (nom === 'jouer') { redimensionnerApercu(); return; }
    else if (nom === 'persos') { window.EditeurPersos.redimensionner(); return; }
    else if (nom === 'cartes') { window.EditeurCartes.redimensionner(); return; }
    if (!pl || !zone) return;
    const r = zone.getBoundingClientRect();
    const largeur = r.width - (barre ? 58 : 0) - 24;
    const poches = pl.position && pl.position.poches;
    const hauteur = r.height - 24;
    const t = Math.floor(Math.min(largeur / pl.cols, hauteur / (pl.lignes + (poches ? 2.3 : 0))));
    pl.taille(Math.max(24, t));
    if (barre) barre.style.height = (Math.max(24, t) * pl.lignes) + 'px';
  }

  // ---------- démarrage ----------
  async function demarrer() {
    try { window.Themes.appliquerTheme(options.theme); window.Themes.appliquerDecor(options.decor); } catch (e) { console.error(e); }
    plateau = new window.Plateau($('#plateau-partie'), { surCoup: surCoupHumain, reperes: true });
    plateauApercu = new window.Plateau($('#plateau-apercu'), {});
    plateauApercu.bloquer();
    window.Son.regler(options.sons);
    try {
      await window.Regles.charger();
    } catch (e) {
      $('#chargement-texte').textContent = 'Impossible de charger les règles. Ouvre le jeu par une adresse http (pas en double-cliquant le fichier).';
      console.error(e);
      return;
    }
    $('#chargement').remove();
    window.Bilan.init();
    window.EditeurConfig.init();
    window.EditeurPersos.init();
    window.EditeurCartes.init();
    window.EditeurBots.init();

    $$('[data-aller]').forEach((b) => b.addEventListener('click', () => ecran(b.dataset.aller)));
    $('#btn-commencer').addEventListener('click', () => commencer());
    $('#btn-reprendre').addEventListener('click', reprendre);
    $('#opt-sons').addEventListener('change', (e) => { options.sons = e.target.checked; window.Son.regler(options.sons); sauverOptions(); });
    for (const id of ['#jo-av-min', '#jo-av-max']) { $(id).addEventListener('input', lireAvantageVoulu); $(id).addEventListener('change', (e) => { lireAvantageVoulu(e); majAvantageVoulu(); }); }
    $('#opt-ambiance').addEventListener('change', (e) => { options.ambiance = e.target.checked; sauverOptions(); majAmbiance(); });
    $('#opt-volume').addEventListener('input', (e) => { options.volume = +e.target.value; sauverOptions(); majAmbiance(); });
    // le navigateur n'autorise le son qu'après un premier clic : l'ambiance démarre à ce moment
    document.addEventListener('pointerdown', () => majAmbiance(), { once: true });
    $('#btn-retourner').addEventListener('click', () => { plateau.retourner(!plateau.retourne); afficherPartie(false); });
    $('#btn-annuler').addEventListener('click', annulerCoup);
    $('#btn-recommencer').addEventListener('click', recommencer);
    $('#btn-abandonner').addEventListener('click', abandonner);
    $('#btn-regles').addEventListener('click', () => montrerRegles());
    if ($('#btn-bilan-partie')) $('#btn-bilan-partie').addEventListener('click', () => {
      if (!jeu) return;
      if (!jeu.fin) { bulle('Le bilan s’ouvre à la fin de la partie.'); return; }
      const rec = parties().find((x) => x.id === jeu.id);
      if (rec) window.Bilan.ouvrir(rec);
    });
    $('#btn-conseils').addEventListener('pointerdown', (e) => { if (e.button === 0) { e.preventDefault(); tenirConseils(true); } });
    window.addEventListener('pointerup', () => { if (!toucheTenue) tenirConseils(false); });
    $('#btn-touche').addEventListener('click', changerTouche);
    majBoutonConseils();
    window.addEventListener('blur', () => { toucheTenue = false; tenirConseils(false); });
    document.addEventListener('keyup', (e) => {
      if (e.code === options.touche.code) { toucheTenue = false; tenirConseils(false); if (App.ecranActuel === 'partie') e.preventDefault(); }
    });
    $$('#nav-partie [data-nav]').forEach((b) => b.addEventListener('click', () => {
      if (!jeu) return;
      const N = jeu.partie.coups.length, n = indexVue();
      const d = b.dataset.nav;
      allerVue(d === 'debut' ? 0 : d === 'fin' ? N : d === 'prec' ? n - 1 : n + 1);
    }));
    $('#btn-vue-present').addEventListener('click', () => allerVue(Infinity));
    $('#btn-vue-reprendre').addEventListener('click', reprendreIci);
    $('#btn-menu-partie').addEventListener('click', () => {
      if (jeu && !jeu.fin) sauverEnCours();
      arreterTout();
      clearInterval(horlogeMinuteur);
      ecran('accueil');
    });
    $('#modale').addEventListener('click', (e) => { if (e.target.id === 'modale' && $('#modale').dataset.fermable) fermerModale(); });
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'Escape' && !$('#modale').classList.contains('cachee')) { if ($('#modale').dataset.fermable) fermerModale(); return; }
      if (App.ecranActuel === 'partie' && jeu && e.code === options.touche.code && $('#modale').classList.contains('cachee')) {
        e.preventDefault();
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        toucheTenue = true; tenirConseils(true);
        return;
      }
      if (App.ecranActuel === 'partie' && jeu) {
        if (e.key === 'f' || e.key === 'F') $('#btn-retourner').click();
        const N = jeu.partie.coups.length, n = indexVue();
        if (e.key === 'ArrowLeft') { allerVue(n - 1); e.preventDefault(); }
        if (e.key === 'ArrowRight') { allerVue(n + 1); e.preventDefault(); }
        if (e.key === 'Home' || e.key === 'ArrowUp') { allerVue(0); e.preventDefault(); }
        if (e.key === 'End' || e.key === 'ArrowDown') { allerVue(N); e.preventDefault(); }
      }
      if (App.ecranActuel === 'bilan') window.Bilan.touche(e);
    });
    window.addEventListener('resize', redimensionner);
    ecran('accueil');
  }

  const App = {
    ecranActuel: 'accueil',
    ecran, modale, fermerModale, bulle, copier, pgn, montrerRegles, redimensionner,
    chances, texteScore, inverser, majBarre, remplirListeCoups, dernierCoupCases, caseRoiEnEchec,
    sauverPartie, parties, options, commencer, jouerAvec, jouerContre,
    arreterAnalyse,
    // Rejouer depuis une position du bilan
    rejouerDepuis(rec, n) {
      const reglages = Object.assign({ adversaire: 'expert', pendule: '0', reflexion: options.reflexion }, rec.reglages || {});
      if (rec.adversaire === 'ami') reglages.adversaire = options.adversaire === 'ami' ? 'expert' : options.adversaire;
      let trait = 'w';
      try { const p = new window.Regles.Partie(rec.variante, rec.fen0, rec.coups.slice(0, n)); trait = p.trait(); p.detruire(); } catch (e) { return; }
      reglages.couleur = rec.adversaire === 'ami' ? trait : rec.humain;
      reglages.pendule = '0';
      lancerPartie(rec.variante, reglages, { fen0: rec.fen0, coups: rec.coups.slice(0, n) }, rec.cfg);
    }
  };
  window.App = App;
  window.addEventListener('DOMContentLoaded', demarrer);
})();
