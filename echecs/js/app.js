/* Échecs classiques — déroulement : accueil, partie contre les bots ou à deux, barre d'avantage permanente,
   meilleurs coups, navigation, recommencer, pendule, sauvegardes. */
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
  const COULEURS_PLUS = ['rgba(200,120,255,0.85)', 'rgba(255,120,170,0.85)', 'rgba(170,175,185,0.85)'];
  // recherche des 4e, 5e et 6e meilleurs coups (bouton), pour la position regardée
  let plus = null;
  let jetonPlus = 0;

  function lire(cle, defaut) {
    try { const v = JSON.parse(localStorage.getItem(cle)); return v == null ? defaut : v; } catch (e) { return defaut; }
  }
  function ecrire(cle, v) {
    try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { console.warn('Sauvegarde impossible', e); }
  }

  const options = Object.assign({
    sons: true, adversaire: 'ami', couleur: 'w', pendule: '0', reflexion: '3000', touche: { code: 'Space', nom: 'Espace' }, pendules: []
  }, lire(CLE_OPT, {}));
  // Les 3 meilleurs coups ne s'affichent que tant qu'on tient la touche (ou le bouton) enfoncée.
  let conseilsTenus = false;
  let toucheTenue = false;
  // Profondeur à atteindre avant d'afficher les meilleurs coups (ils ne changent plus ensuite) : Stockfish complet,
  // profondeur 24, ou 10 s au plus dans les positions très compliquées. Si Lichess a déjà analysé la position
  // plus profondément, c'est son analyse qui est prise (tout de suite).
  // avec le programme Windows (environ 4 fois plus de calcul), profondeur 28 dans le même temps
  const profConseils = () => (window.Moteurs.natif() ? 28 : 24);
  const MAX_CONSEILS = 10000;
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
  // valeur comparable d'un score (vu du camp au trait) ; deux coups exactement aussi bons ont la même valeur
  function valeurScore(s) {
    if (!s) return 0;
    return s.mate != null ? (s.mate > 0 ? 1e6 - s.mate : -1e6 - s.mate) : s.cp;
  }
  // rangs « 1, 1, 3 » : des coups exactement aussi bons ont le même rang
  function rangsEgaux(lignes) {
    const r = [];
    lignes.forEach((l, i) => r.push(i && valeurScore(l.score) === valeurScore(lignes[i - 1].score) ? r[i - 1] : i + 1));
    return r;
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
    // repères à leur VRAIE hauteur ; s'ils se chevauchent (même score ou presque), ils se rangent côte à côte vers la gauche
    const rb = el.getBoundingClientRect();
    const H = rb.height || 400;
    const gauche = Math.max(0, Math.floor((rb.left + rb.width / 2 - 15) / 29));
    const pos = (reperes || []).map((r) => Math.max(13, Math.min(H - 13, H * chances(r.score) / 100)));
    const col = pos.map(() => 0);
    for (let i = 1; i < pos.length; i++) {
      const pris = new Set();
      for (let j = 0; j < i; j++) if (Math.abs(pos[i] - pos[j]) < 26) pris.add(col[j]);
      while (pris.has(col[i])) col[i]++;
    }
    (reperes || []).forEach((r, i) => {
      const d = document.createElement('div');
      d.className = 'barre-repere';
      d.style[retourne ? 'top' : 'bottom'] = (pos[i] - 13) + 'px';
      // vers la gauche tant qu'il y a de la place à l'écran, puis à droite de la barre
      if (col[i]) d.style.left = col[i] <= gauche ? 'calc(50% - ' + (col[i] * 29) + 'px)' : 'calc(50% + ' + ((col[i] - gauche) * 29) + 'px)';
      d.style.background = r.couleur;
      d.textContent = r.etiquette;
      d.title = texteScore(r.score);
      el.appendChild(d);
    });
  }

  // ---------- écrans ----------
  function ecran(nom) {
    if (window.Coach && window.Coach.ouvert()) window.Coach.fermer(true);
    if (App.ecranActuel === 'partie' && nom !== 'partie') arreterAnalyse();
    $$('.ecran').forEach((e) => e.classList.toggle('visible', e.id === 'ecran-' + nom));
    if (App.ecranActuel && App.ecranActuel !== nom) window.Son.ecran();
    App.ecranActuel = nom;
    if (nom === 'accueil') construireMenu();
    if (nom === 'jouer') construireJouer();
    if (nom === 'bots') window.EditeurBots.ouvrir();
    if (nom === 'repertoire') requestAnimationFrame(() => window.Repertoire.ouvrir());
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
    if (enCours) $('#btn-reprendre').textContent = '↺ Reprendre la partie en cours';
    const note = $('#note-moteur');
    const ecrire = () => {
      if (window.Moteurs.natif()) { note.textContent = '🖥 Moteur Windows actif : Stockfish 19 sur ' + window.Moteurs.coeursNatif() + ' cœurs, livre d’ouvertures, parties de maîtres et analyses de Lichess.'; return; }
      note.innerHTML = '';
      note.append(window.Moteurs.complet() ? 'Stockfish 19 complet sur ' + Math.max(1, Math.min(4, Math.floor((navigator.hardwareConcurrency || 2) / 2))) + ' cœurs, livre d’ouvertures, parties de maîtres et analyses de Lichess. '
        : 'Moteur réduit : recharge la page une fois pour avoir Stockfish complet. ');
      if (/Windows/i.test(navigator.userAgent)) {
        const a = document.createElement('a');
        a.href = 'windows/MoteurCustomChess.exe'; a.download = 'MoteurCustomChess.exe';
        a.textContent = '⬇ Moteur Windows gratuit : 4 fois plus de calcul';
        a.title = 'Petit programme qui fait tourner le vrai Stockfish sur tous les cœurs du PC. Lance-le, puis recharge cette page.';
        note.appendChild(a);
      }
    };
    ecrire();
    window.Moteurs.verifierNatif().then(ecrire);
  }

  // ---------- jouer ----------
  let plateauApercu = null;
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

  // Pendules : seulement celles que le joueur a créées (minutes + secondes ajoutées à chaque coup).
  function textePendule(v) { const [m, s] = v.split('+'); return m + ' min' + (+s ? ' + ' + s + ' s' : ''); }
  function remplirPendules() {
    const box = $('#choix-pendule');
    if (!Array.isArray(options.pendules)) options.pendules = [];
    if (options.pendule !== '0' && !options.pendules.includes(options.pendule)) { options.pendule = '0'; sauverOptions(); }
    box.querySelectorAll('.puce-pendule, .creer-pendule').forEach((x) => x.remove());
    for (const v of options.pendules) {
      const b = document.createElement('button');
      b.className = 'puce-pendule'; b.dataset.val = v;
      b.textContent = '⏱ ' + textePendule(v);
      const x = document.createElement('span');
      x.className = 'suppr-pendule'; x.textContent = '✕'; x.title = 'Supprimer cette pendule';
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        options.pendules = options.pendules.filter((p) => p !== v);
        if (options.pendule === v) options.pendule = '0';
        sauverOptions(); construireJouer();
      });
      b.appendChild(x);
      box.appendChild(b);
    }
    const c = document.createElement('button');
    c.className = 'creer-pendule'; c.textContent = '➕ Créer une pendule';
    c.onclick = () => {
      const m = modale('<h2>Nouvelle pendule</h2><div class="pendule-champs"><label>Minutes pour chaque joueur <input type="number" id="np-min" min="1" max="180" value="10"></label>' +
        '<label>Secondes ajoutées à chaque coup <input type="number" id="np-inc" min="0" max="60" value="0"></label></div>', [
        { texte: 'Créer', classe: 'principal', action: () => {
          const mi = Math.max(1, Math.min(180, Math.round(+m.querySelector('#np-min').value || 0)));
          const inc = Math.max(0, Math.min(60, Math.round(+m.querySelector('#np-inc').value || 0)));
          const v = mi + '+' + inc;
          if (!options.pendules.includes(v)) options.pendules.push(v);
          options.pendule = v; sauverOptions(); construireJouer();
        } },
        { texte: 'Annuler' }
      ]);
      m.querySelector('#np-min').focus();
    };
    box.appendChild(c);
  }

  function construireJouer() {
    remplirBots();
    remplirPendules();
    plateauApercu.afficher(window.Regles.lireFen(window.Config.STD), {});
    redimensionnerApercu();
    for (const [id, cle] of [['#choix-adversaire', 'adversaire'], ['#choix-couleur', 'couleur'], ['#choix-pendule', 'pendule'], ['#choix-reflexion', 'reflexion']]) {
      $$(id + ' button[data-val]').forEach((b) => {
        b.classList.toggle('choisi', b.dataset.val === String(options[cle]));
        b.onclick = () => { options[cle] = b.dataset.val; sauverOptions(); majChoix(); };
      });
    }
    majChoix();
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

  function commencer(reglages) {
    lancerPartie(window.Config.variante(), reglages || reglagesActuels(), null);
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
    return 'Stockfish 19 + ouvertures';
  }
  function estAuBot() {
    return jeu && !jeu.fin && jeu.adversaire !== 'ami' && jeu.partie.trait() !== jeu.humain;
  }

  function lancerPartie(v, reglages, depuis) {
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
      id: 'p' + Date.now().toString(36), date: Date.now(), variante: v,
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
    if (!s || !window.Config.estClassique(s.variante)) { localStorage.removeItem(CLE_ENCOURS); construireMenu(); return; }
    arreterTout();
    if (jeu && jeu.partie) jeu.partie.detruire();
    let partie;
    try { partie = new window.Regles.Partie(s.variante, s.fen0, s.coups); } catch (e) { bulle('Partie illisible.'); localStorage.removeItem(CLE_ENCOURS); return; }
    jeu = {
      id: s.id, date: s.date, variante: s.variante, reglages: s.reglages, partie, adversaire: s.adversaire, humain: s.humain,
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
      id: jeu.id, date: jeu.date, variante: jeu.variante, reglages: jeu.reglages, fen0: jeu.partie.fen0, coups: jeu.partie.coups,
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
    // la position change : le coach (qui parlait de l'ancienne) se ferme
    if (window.Coach && window.Coach.ouvert()) window.Coach.fermer(true);
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
      afficherPrises(el.querySelector('.prises'), camp, p.fen0, pos);
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
    if (!jeu.premove && plateau.premove) plateau.marquerPremove(null);
    relancerAnalyse();
    if (estAuBot()) {
      // pendant que le bot réfléchit, on peut préparer son coup (pré-move)
      if (jeu.vue == null) plateau.autoriser(window.Regles.premoves(jeu.variante, p.fen), p.trait() === 'w' ? 'b' : 'w');
      else plateau.bloquer();
      lancerBot(monJeton);
    } else {
      // pré-move prêt : on le joue tout de suite s'il est permis
      if (jeu.premove) {
        const u = jeu.premove;
        jeu.premove = null; plateau.marquerPremove(null);
        if (jeu.vue == null && p.legaux().includes(u)) { setTimeout(() => { if (jeu && !jeu.fin && !estAuBot() && jeu.partie === p) jouerCoup(u, true); }, 120); return; }
      }
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
    // Bot créé : on tire d'abord le rang qu'il va jouer (1er, 2e, 3e… meilleur coup, selon ses pourcentages).
    const kTire = bot.rangs ? window.Bots.tirer(bot.rangs, bot.rangs.length) : 0;
    const pleineForce = !bot.elo && (!bot.rangs || kTire === 0);
    // quelques coups de plus que ses rangs, pour bien repérer les coups exactement aussi bons ;
    // pour le 1er meilleur coup, un seul coup cherché : c'est la recherche la plus forte
    if (bot.rangs) o.multipv = kTire === 0 ? 1 : Math.min(20, Math.max(1, bot.rangs.length) + 4);
    else if (!bot.elo) o.multipv = 3;
    if (jeu.temps && bot.elo) {
      const reste = jeu.temps[p.trait()];
      o.temps = Math.max(250, Math.min(2500, reste / 45 + jeu.pendule.inc * 0.6));
    } else if (jeu.temps) {
      o.horloge = { wtime: jeu.temps.w, btime: jeu.temps.b, winc: jeu.pendule.inc, binc: jeu.pendule.inc };
    } else {
      o.temps = bot.elo ? 900 : jeu.reflexion;
    }
    let r = null;
    // le meilleur coup (Maître, ou bot créé qui doit jouer son 1er meilleur coup) : d'abord tout ce qu'on sait par cœur
    if (pleineForce) {
      const su = await savoirDuMaitre(p, cle);
      if (monJeton !== jeton || !jeu || jeu.fin) return;
      if (su && su.coup) {
        r = { coup: su.coup, lignes: su.lignes || [] };
        etat(bot.nom + ' joue ' + su.pourquoi + '.');
        if (su.livre) o.coupsLimites = su.livre;
        else if (su.lignes && su.lignes.length && !bot.rangs) {
          jeu.cache = jeu.cache || {};
          jeu.cache[cle] = { n: n0, cle, trait: trait0, lignes: copieLignes(su.lignes), fini: true, source: 'lichess' };
          if (jeu.vue == null) { jeu.analyse = jeu.cache[cle]; majAnalyseAffichage(); }
        }
        if (su.livre) r = null; // livre hors ligne : Stockfish choisit le meilleur des coups de la théorie
      }
    }
    if (!r) {
      try { r = await moteur.chercher(o); } catch (e) { console.error(e); etat('Le bot ne peut pas jouer : ' + e.message); return; }
    }
    if (monJeton !== jeton || !jeu || jeu.fin || r.annulee) return;
    if (bot.rangs && kTire === 0 && r.lignes.length && !r.annulee) {
      // 1er meilleur coup : le meilleur trouvé
      if (r.lignes[0].pv && p.legaux().includes(r.lignes[0].pv[0])) r.coup = r.lignes[0].pv[0];
    } else if (bot.rangs && r.lignes.length) {
      // bot créé : il joue le 1er, 2e, 3e… meilleur coup selon ses pourcentages
      const dispo = r.lignes.filter((l) => l && l.pv && l.pv[0] && p.legaux().includes(l.pv[0]));
      // des coups exactement aussi bons forment UN seul rang (deux « 1er meilleur coup », etc.)
      const niveaux = [];
      for (const l of dispo) {
        const v = valeurScore(l.score);
        const n = niveaux.find((x) => x.v === v);
        if (n) n.l.push(l); else niveaux.push({ v, l: [l] });
      }
      niveaux.sort((a, b) => b.v - a.v);
      if (niveaux.length) {
        const k = Math.min(kTire, niveaux.length - 1);
        const choix = niveaux[k].l;
        r.coup = choix[Math.floor(Math.random() * choix.length)].pv[0];
      }
    }
    if (!bot.elo && !bot.rangs && r.lignes.length && !o.coupsLimites) {
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

  // Ce que le Maître sait par cœur, dans cet ordre :
  //   finale de 7 pièces ou moins -> le coup parfait (tables de finales) ;
  //   début de partie -> le coup des maîtres qui marque le plus de points (avec assez de parties) ;
  //   position déjà analysée très profondément par Lichess -> son meilleur coup ;
  //   sans internet, dans le livre d'ouvertures -> Stockfish choisit parmi les coups de la théorie.
  async function savoirDuMaitre(p, fen) {
    const legaux = p.legaux();
    const ok = (u) => u && legaux.includes(u);
    const fin = await window.Savoir.finale(fen);
    if (fin && ok(fin.coup)) return { coup: fin.coup, pourquoi: 'le coup parfait (tables de finales)' };
    if (p.coups.length < 30) {
      const m = await window.Savoir.maitres(fen);
      if (m && m.total >= 50) {
        // coups assez joués (5 % des parties au moins), classés par points marqués (prudence pour les petits nombres)
        const bons = m.coups.filter((c) => ok(c.uci) && c.n >= Math.max(10, m.total * 0.05))
          .map((c) => Object.assign({ note: (c.score * c.n + 0.5 * 20) / (c.n + 20) }, c))
          .sort((a, b) => b.note - a.note);
        if (bons.length) return { coup: bons[0].uci, pourquoi: 'un coup de maître (' + bons[0].n + ' parties)' };
      }
    }
    const nu = await window.Savoir.nuage(fen, 3);
    if (nu && nu.profondeur >= profConseils() && ok(nu.lignes[0].pv[0])) return { coup: nu.lignes[0].pv[0], lignes: nu.lignes, pourquoi: 'le meilleur coup analysé par Lichess (profondeur ' + nu.profondeur + ')' };
    const livre = window.Savoir.coupsLivre(fen).filter(ok);
    if (livre.length) return { coup: livre[0], livre, pourquoi: 'la théorie' };
    return null;
  }

  // ---------- analyse en direct (barre + meilleurs coups) ----------
  function arreterAnalyse() {
    jetonAnalyse++;
    for (const m of window.Moteurs.tous()) if (m.role === 'analyse' && m.pret) m.arreter();
  }
  function copieLignes(lignes) {
    return lignes.filter(Boolean).map((l) => ({ score: l.score, pv: l.pv.slice(0, 8), profondeur: l.profondeur }));
  }
  // Finales de 7 pièces ou moins aux échecs classiques : résultat EXACT (tables de finales de Lichess).
  const tables = {};
  function tablesFinales(cle) {
    if (!jeu || tables[cle] || jeu.variante.is960) return;
    const plac = cle.split(' ')[0];
    const rangs = plac.split('/');
    // seulement de vraies positions d'échecs : 8 × 8, pièces classiques, un roi de chaque côté
    if (rangs.length !== 8 || /[^kqrbnp1-8\/]/i.test(plac) || rangs.some((r) => r.replace(/\d/g, (n) => '.'.repeat(+n)).length !== 8)) return;
    if ((plac.match(/K/g) || []).length !== 1 || (plac.match(/k/g) || []).length !== 1) return;
    if ((plac.match(/[a-z]/gi) || []).length > 7 || (cle.split(' ')[2] || '-') !== '-') return;
    const v = jeu.variante.pieces || {};
    if (Object.keys(v).some((l) => v[l] && v[l].marque)) return;
    tables[cle] = { attente: true };
    fetch('https://tablebase.lichess.ovh/standard?fen=' + encodeURIComponent(cle))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!d || !d.category) { delete tables[cle]; return; } tables[cle] = d; majAnalyseAffichage(); })
      .catch(() => { delete tables[cle]; });
  }
  function pronosticExact(tb, trait) {
    const el = $('#pronostic');
    const c = tb.category, autre = trait === 'w' ? 'b' : 'w';
    const nom = (x) => (x === 'w' ? 'les blancs' : 'les noirs');
    el.className = 'pronostic';
    let t;
    if (c === 'win' || c === 'loss') {
      const gagnant = c === 'win' ? trait : autre;
      const n = tb.dtm != null ? Math.ceil(Math.abs(tb.dtm) / 2) : null;
      t = '🔮 Certain (tables de finales) : ' + nom(gagnant) + ' gagnent' + (n ? ', mat en ' + n + ' coup' + (n > 1 ? 's' : '') : '') + ' si les deux jouent parfaitement.';
      el.classList.add(gagnant === 'w' ? 'blancs' : 'noirs');
    } else {
      t = '🔮 Certain (tables de finales) : nulle, personne ne peut gagner en jouant parfaitement.';
      el.classList.add('egal');
    }
    el.textContent = t;
    el.title = 'Résultat exact : toutes les positions à 7 pièces ou moins ont été calculées jusqu’au bout.';
  }

  function relancerAnalyse() {
    if (!jeu || App.ecranActuel !== 'partie') return;
    const p = jeu.partie;
    const n = indexVue();
    const cle = p.fens[n];
    const trait = window.Regles.lireFen(cle).trait;
    if (plus && plus.cle !== cle) fermerPlus();
    tablesFinales(cle);
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
    const nbLegaux = n === p.coups.length ? p.legaux().length : 3;
    lignesProfondes(cle, 3, nbLegaux).then((nu) => {
      if (jet !== jetonAnalyse || !jeu) return;
      if (nu) {
        // déjà analysée par Lichess plus loin que notre calcul : on la prend telle quelle
        jeu.analyse = { n, cle, trait, lignes: copieLignes(nu.lignes), fini: true, source: 'lichess' };
        jeu.cache[cle] = jeu.analyse;
        majAnalyseAffichage();
        return;
      }
      analyseLocale(p, n, cle, trait, jet);
    });
  }
  // analyse de Lichess utilisable si elle est plus profonde que notre calcul et a assez de coups
  async function lignesProfondes(fen, multipv, nbLegaux) {
    const nu = await window.Savoir.nuage(fen, multipv);
    if (!nu || nu.profondeur < profConseils() || nu.lignes.length < Math.min(multipv, nbLegaux)) return null;
    return nu;
  }
  function analyseLocale(p, n, cle, trait, jet) {
    window.Moteurs.pourVariante(jeu.variante, 'analyse').chercher({
      variante: jeu.variante, fen0: p.fen0, coups: p.coups.slice(0, n), elo: null,
      profondeur: profConseils(), temps: MAX_CONSEILS, multipv: 3, deterministe: true,
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
    const rangs = rangsEgaux(lignes);
    // 4e, 5e, 6e coups : affichés (et sur la barre) dès qu'ils sont trouvés
    const flPlus = afficherPlus(a, lignes);
    let reperes = montrer ? lignes.map((l, i) => ({ score: versBlanc(l.score), etiquette: rangs[i], couleur: COULEURS_CONSEILS[i] })) : null;
    if (flPlus.reperes && flPlus.reperes.length) reperes = (reperes || []).concat(flPlus.reperes);
    // fin de partie connue exactement : la barre montre le vrai résultat
    const tb = tables[a.cle];
    let exact = null;
    if (tb && tb.category) {
      const gagne = tb.category === 'win' ? a.trait : tb.category === 'loss' ? (a.trait === 'w' ? 'b' : 'w') : null;
      const nb = tb.dtm != null ? Math.ceil(Math.abs(tb.dtm) / 2) : null;
      exact = !gagne ? { cp: 0 } : nb ? { mate: gagne === 'w' ? nb : -nb } : { cp: gagne === 'w' ? 2000 : -2000 };
    }
    if (exact) majBarre(barre, exact, plateau.retourne, false, reperes);
    else if (lignes[0]) majBarre(barre, versBlanc(lignes[0].score), plateau.retourne, false, reperes);
    majPronostic(lignes[0] && (a.fini || lignes[0].profondeur >= 12) ? versBlanc(lignes[0].score) : null, lignes[0] ? lignes[0].profondeur : 0);
    if (tables[a.cle] && tables[a.cle].category) pronosticExact(tables[a.cle], a.trait);
    const liste = $('#conseils-liste');
    liste.innerHTML = '';
    if (!conseilsTenus) { if (flPlus.length) plateau.flechesAfficher(flPlus.reverse()); else plateau.effacerFleches(); return; }
    if (!a.fini) {
      // pas encore sûr : on n'affiche rien qui pourrait changer
      if (flPlus.length) plateau.flechesAfficher(flPlus.reverse()); else plateau.effacerFleches();
      const prof = lignes[0] ? lignes[0].profondeur : 0;
      const but = profConseils();
      const t = document.createElement('div'); t.className = 'petit-gris';
      t.textContent = 'Calcul des 3 meilleurs coups… profondeur ' + prof + ' / ' + but;
      liste.appendChild(t);
      return;
    }
    const fl = [];
    lignes.forEach((l, i) => {
      const d = window.Regles.decouper(l.pv[0]);
      if (d) fl.push({ de: d.de, vers: d.vers, couleur: COULEURS_CONSEILS[i], etiquette: String(rangs[i]) });
      const san = jeu.partie.suiteSan(n, l.pv, 1)[0] || l.pv[0];
      const suite = jeu.partie.suiteSan(n, l.pv, 5);
      const ligne = document.createElement('div');
      ligne.className = 'conseil';
      ligne.innerHTML = '<span class="conseil-num"></span><b></b><span class="conseil-score"></span><span class="conseil-suite"></span>';
      ligne.querySelector('.conseil-num').textContent = rangs[i];
      ligne.querySelector('.conseil-num').style.background = COULEURS_CONSEILS[i];
      ligne.querySelector('b').textContent = san;
      ligne.querySelector('.conseil-score').textContent = texteScore(versBlanc(l.score));
      ligne.querySelector('.conseil-suite').textContent = suite.slice(1).join(' ');
      liste.appendChild(ligne);
    });
    if (!lignes.length) liste.innerHTML = '<div class="petit-gris">Aucun coup.</div>';
    else {
      const pr = document.createElement('div'); pr.className = 'petit-gris';
      pr.textContent = (a.source === 'lichess' ? 'Analyse de Lichess (profondeur ' : 'Calcul terminé (profondeur ') + lignes[0].profondeur + ') · score vu des blancs';
      liste.appendChild(pr);
    }
    plateau.flechesAfficher(fl.concat(flPlus).reverse());
  }

  // ---------- coach : pourquoi le meilleur coup est le meilleur ----------
  function ouvrirCoach() {
    if (!jeu) return;
    const p = jeu.partie;
    const n = indexVue();
    if (n === p.coups.length && p.finie()) { bulle('La partie est finie : plus de coup à expliquer.'); return; }
    const cle = p.fens[n];
    const v = jeu.variante;
    // résultat exact des tables de finales (le même que le pronostic)
    let exact = null;
    const tb = tables[cle];
    if (tb && tb.category) {
      const nb = tb.dtm != null ? Math.ceil(Math.abs(tb.dtm) / 2) : null;
      const trait = window.Regles.lireFen(cle).trait, autre = trait === 'w' ? 'b' : 'w';
      const nom = (x) => (x === 'w' ? 'les blancs' : 'les noirs');
      exact = { texte: tb.category === 'win' ? 'certain : ' + nom(trait) + ' gagnent' + (nb ? ', mat en ' + nb : '') : tb.category === 'loss' ? 'certain : ' + nom(autre) + ' gagnent' + (nb ? ', mat en ' + nb : '') : 'certain : nulle' };
    }
    window.Coach.ouvrir({
      variante: v, fen0: p.fen0, coups: p.coups.slice(0, n), exact, source: 'conseils',
      // EXACTEMENT les 3 meilleurs coups des conseils (même calcul : même profondeur, un cœur, mémoire vidée)
      lignes: async () => {
        if (jeu.cache && jeu.cache[cle] && jeu.cache[cle].lignes) return jeu.cache[cle].lignes;
        const nu = await lignesProfondes(cle, 3, n === p.coups.length ? p.legaux().length : 3);
        if (nu && jeu && jeu.partie === p) {
          jeu.cache = jeu.cache || {};
          jeu.cache[cle] = { n, cle, trait: window.Regles.lireFen(cle).trait, lignes: copieLignes(nu.lignes), fini: true, source: 'lichess' };
          return nu.lignes;
        }
        const r = await window.Moteurs.pourVariante(v, 'coach').chercher({
          variante: v, fen0: p.fen0, coups: p.coups.slice(0, n), elo: null,
          profondeur: profConseils(), temps: MAX_CONSEILS, multipv: 3, deterministe: true
        });
        if (!r.annulee && r.lignes.length && jeu && jeu.partie === p) {
          jeu.cache = jeu.cache || {};
          const lignes = copieLignes(r.lignes);
          jeu.cache[cle] = { n, cle, trait: window.Regles.lireFen(cle).trait, lignes, fini: true };
        }
        return r.lignes;
      },
      conteneur: $('#ecran-partie .panneau'), plateau,
      restaurer: () => {
        if (!jeu) return;
        afficherPartie(false);
        if (!jeu.fin) {
          if (jeu.vue != null) plateau.bloquer();
          else if (estAuBot()) plateau.autoriser(window.Regles.premoves(jeu.variante, jeu.partie.fen), jeu.partie.trait() === 'w' ? 'b' : 'w');
          else plateau.autoriser(jeu.partie.legaux(), jeu.partie.trait());
        }
        majAnalyseAffichage();
      }
    });
  }

  // ---------- 4e, 5e et 6e meilleurs coups (bouton) ----------
  // panneau resserré quand les meilleurs coups sont affichés, pour que tout tienne sans défiler
  function majSerre() { const pn = $('#ecran-partie .panneau'); if (pn) pn.classList.toggle('serre', conseilsTenus || !!plus); }
  function fermerPlus() {
    jetonPlus++;
    plus = null;
    majSerre();
    for (const m of window.Moteurs.tous()) if (m.role === 'aide' && m.pret) m.arreter();
    $('#plus-coups').style.display = 'none';
    $('#btn-plus-coups').classList.remove('actif');
    $('#btn-plus-texte').textContent = '4e, 5e, 6e coups';
  }
  function chercherPlus() {
    if (!jeu) return;
    const p = jeu.partie;
    const n = indexVue();
    const cle = p.fens[n];
    if (plus && plus.cle === cle) { fermerPlus(); majAnalyseAffichage(); redimensionner(); return; }
    fermerPlus();
    if (n === p.coups.length && p.finie()) return;
    const jet = jetonPlus;
    const trait = window.Regles.lireFen(cle).trait;
    jeu.cachePlus = jeu.cachePlus || {};
    plus = jeu.cachePlus[cle] ? Object.assign({}, jeu.cachePlus[cle]) : { cle, trait, lignes: [], fini: false };
    majSerre();
    $('#btn-plus-coups').classList.add('actif');
    $('#btn-plus-texte').textContent = 'Cacher 4e, 5e, 6e';
    $('#plus-coups').style.display = '';
    if (!plus.fini) {
      // même profondeur que les 3 meilleurs coups, 6 coups à la fois
      window.Moteurs.pourVariante(jeu.variante, 'plus').chercher({
        variante: jeu.variante, fen0: p.fen0, coups: p.coups.slice(0, n), elo: null,
        profondeur: profConseils(), temps: MAX_CONSEILS + 4000, multipv: 6, deterministe: true,
        surInfo: (l) => {
          if (jet !== jetonPlus || !plus || plus.fini) return;
          plus.lignes = copieLignes(l);
          majAnalyseAffichage();
        }
      }).then((r) => {
        if (jet !== jetonPlus || !plus || r.annulee) return;
        plus.lignes = copieLignes(r.lignes);
        plus.fini = true;
        jeu.cachePlus[cle] = Object.assign({}, plus);
        majAnalyseAffichage();
      }).catch(() => {});
    }
    majAnalyseAffichage();
    redimensionner();
  }
  // remplit la liste des 4e-6e coups ; renvoie leurs flèches
  function afficherPlus(a, lignes3) {
    const box = $('#plus-liste');
    if (!plus || plus.cle !== a.cle) { if (box) box.innerHTML = ''; return []; }
    box.innerHTML = '';
    const l6 = plus.lignes.filter((l) => l && l.pv && l.pv.length);
    if (!plus.fini) {
      const t = document.createElement('div'); t.className = 'petit-gris';
      t.textContent = 'Recherche des 4e, 5e et 6e meilleurs coups… profondeur ' + (l6[0] ? l6[0].profondeur : 0) + ' / ' + profConseils();
      box.appendChild(t);
      return [];
    }
    // les 3 coups qui suivent les 3 meilleurs : tous ceux de la recherche à 6 qui ne sont pas déjà dans les 3 meilleurs
    // (les deux recherches peuvent ranger un peu différemment : on prend toujours les 3 suivants, jamais moins)
    const trois = a.fini ? lignes3 : l6.slice(0, 3);
    const deja = new Set(trois.map((l) => l.pv[0]));
    const suivants = l6.filter((l) => !deja.has(l.pv[0])).slice(0, 3);
    // rangs 4, 5, 6 ; des coups exactement aussi bons gardent le même rang (aussi avec le 3e)
    const choix = [];
    suivants.forEach((l, i) => {
      const v = valeurScore(l.score);
      let r = 4 + i;
      if (i > 0 && v === valeurScore(suivants[i - 1].score)) r = choix[i - 1].r;
      else if (i === 0 && trois.length === 3 && v === valeurScore(trois[2].score)) r = rangsEgaux(trois)[2];
      choix.push({ l, r });
    });
    const versBlanc = (s) => (plus.trait === 'w' ? s : inverser(s));
    const fl = [];
    fl.reperes = [];
    choix.forEach(({ l, r }, i) => {
      const d = window.Regles.decouper(l.pv[0]);
      if (d) fl.push({ de: d.de, vers: d.vers, couleur: COULEURS_PLUS[i], etiquette: String(r) });
      fl.reperes.push({ score: versBlanc(l.score), etiquette: r, couleur: COULEURS_PLUS[i] });
      const san = jeu.partie.suiteSan(a.n, l.pv, 1)[0] || l.pv[0];
      const suite = jeu.partie.suiteSan(a.n, l.pv, 5);
      const ligne = document.createElement('div');
      ligne.className = 'conseil';
      ligne.innerHTML = '<span class="conseil-num"></span><b></b><span class="conseil-score"></span><span class="conseil-suite"></span>';
      ligne.querySelector('.conseil-num').textContent = r;
      ligne.querySelector('.conseil-num').style.background = COULEURS_PLUS[i];
      ligne.querySelector('b').textContent = san;
      ligne.querySelector('.conseil-score').textContent = texteScore(versBlanc(l.score));
      ligne.querySelector('.conseil-suite').textContent = suite.slice(1).join(' ');
      box.appendChild(ligne);
    });
    if (!choix.length) {
      const t = document.createElement('div'); t.className = 'petit-gris';
      t.textContent = l6.length <= 3 ? 'Il n’y a que ' + l6.length + ' coup' + (l6.length > 1 ? 's' : '') + ' possible' + (l6.length > 1 ? 's' : '') + ' ici.' : 'Aucun autre coup.';
      box.appendChild(t);
    }
    return fl;
  }

  // Tenir la touche choisie (ou le bouton) pour voir les 3 meilleurs coups.
  function tenirConseils(oui) {
    if (conseilsTenus === oui) return;
    conseilsTenus = oui;
    $('#btn-conseils').classList.toggle('actif', oui);
    $('#conseils').style.display = oui ? '' : 'none';
    majSerre();
    majAnalyseAffichage();
    redimensionner();
  }
  function majBoutonConseils() {
    $('#btn-conseils-texte').textContent = window.matchMedia('(pointer: coarse)').matches ? 'Garde le doigt ici : 3 meilleurs coups' : 'Tiens ' + options.touche.nom + ' : 3 meilleurs coups';
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
    if (jeu && !jeu.fin && jeu.vue == null && estAuBot()) {
      jeu.premove = uci;
      plateau.marquerPremove(uci);
      return;
    }
    if (!jeu || jeu.fin || estAuBot() || jeu.vue != null) return;
    jouerCoup(uci, false);
  }

  function jouerCoup(uci, animer) {
    const p = jeu.partie;
    const camp = p.trait();
    const prise = p._a().isCapture(uci);
    if (!p.jouer(uci)) return;
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

  // Recommencer : la partie repart du début, mêmes réglages.
  function relancer() {
    commencer(Object.assign({}, jeu.reglages, { couleur: jeu.adversaire === 'ami' ? 'w' : jeu.humain }));
  }
  function recommencer() {
    if (!jeu) return;
    modale('<h2>Recommencer ?</h2><p>La partie repart du début.</p>', [
      { texte: '↻ Recommencer', classe: 'principal', action: relancer },
      { texte: 'Annuler' }
    ]);
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
  // Pièces mangées par « camp » : celles de l'adversaire qui ont disparu depuis le départ.
  function afficherPrises(box, camp, fen0, pos) {
    if (!box) return;
    const compte = (P) => { const c = {}; for (const l of P.cases) for (const x of l) if (x) c[x.l] = (c[x.l] || 0) + 1; return c; };
    const avant = compte(window.Regles.lireFen(fen0)), maint = compte(pos);
    const ordre = 'qrbnp';
    const lettres = Object.keys(avant).filter((l) => (camp === 'w' ? l === l.toLowerCase() : l === l.toUpperCase()) && l.toLowerCase() !== 'k')
      .sort((a, b) => ordre.indexOf(a.toLowerCase()) - ordre.indexOf(b.toLowerCase()));
    const cle = lettres.map((l) => l + Math.max(0, avant[l] - (maint[l] || 0))).join(',');
    if (box.dataset.cle === cle) return;
    box.dataset.cle = cle;
    box.innerHTML = '';
    for (const l of lettres) {
      for (let i = 0; i < Math.max(0, avant[l] - (maint[l] || 0)); i++) {
        const ic = window.Pieces.creerPiece(l, jeu.variante);
        ic.classList.add('icone');
        box.appendChild(ic);
      }
    }
  }
  function majPendules() {
    if (!jeu || !jeu.temps) return;
    const bas = plateau.retourne ? 'b' : 'w';
    const haut = bas === 'w' ? 'b' : 'w';
    for (const [id, camp] of [['#joueur-haut', haut], ['#joueur-bas', bas]]) {
      const el = $(id + ' .pendule');
      // on ne touche à l'affichage que s'il change (moins de travail pour le navigateur)
      const t = texteTemps(jeu.temps[camp]);
      if (el.textContent !== t) el.textContent = t;
      const peu = jeu.temps[camp] < 20000;
      if (el.classList.contains('peu') !== peu) el.classList.toggle('peu', peu);
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
      { texte: '💾 Enregistrer', action: () => window.Repertoire.enregistrer(rec) },
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

  // fiche d'une partie pas encore finie (pour la ranger dans « Mes parties »)
  function ficheEnCours() {
    const p = jeu.partie;
    return {
      id: jeu.id, date: jeu.date, variante: jeu.variante, varianteNom: jeu.variante.nom,
      fen0: p.fen0, coups: p.coups.slice(),
      blancs: nomJoueur('w') + (detailJoueur('w') ? ' (' + detailJoueur('w') + ')' : ''),
      noirs: nomJoueur('b') + (detailJoueur('b') ? ' (' + detailJoueur('b') + ')' : ''),
      adversaire: jeu.adversaire, humain: jeu.humain, reglages: jeu.reglages, cfg: jeu.cfg,
      resultat: '*', raison: 'partie en cours', aide: jeu.aide, pendule: jeu.pendule, reflexion: jeu.reflexion, analyse: null
    };
  }
  function parties() { return lire(CLE_PARTIES, []).filter((r) => window.Config.estClassique(r.variante)); }
  function sauverPartie(rec) {
    // partie rangée dans « Mes parties » : c'est là qu'on garde son analyse
    if (rec.rep) { window.Repertoire.maj(rec); return; }
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
      '[Event "JulGame — Custom Chess (' + rec.varianteNom.replace(/"/g, '') + ')"]', '[Site "JulGame"]', '[Date "' + date + '"]',
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
    else if (nom === 'jouer') { redimensionnerApercu(); return; }
    if (!pl || !zone) return;
    const r = zone.getBoundingClientRect();
    const etroit = window.innerWidth <= 900 || (window.innerWidth <= 1100 && window.innerHeight > window.innerWidth);
    const marge = etroit ? 8 : 24;
    const largeur = r.width - (barre ? barre.getBoundingClientRect().width + (etroit ? 6 : 14) : 0) - marge;
    const poches = pl.position && pl.position.poches;
    const hauteur = r.height - marge;
    const t = Math.floor(Math.min(largeur / pl.cols, hauteur / (pl.lignes + (poches ? 2.3 : 0))));
    pl.taille(Math.max(24, t));
    if (barre) barre.style.height = (Math.max(24, t) * pl.lignes) + 'px';
  }

  // ---------- démarrage ----------
  async function demarrer() {
    window.Savoir.charger();
    plateau = new window.Plateau($('#plateau-partie'), { surCoup: surCoupHumain, reperes: true,
      // un clic ailleurs sur le plateau annule le pré-move
      surClicVide: () => { if (jeu && jeu.premove) { jeu.premove = null; plateau.marquerPremove(null); } } });
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
    window.EditeurBots.init();

    $$('[data-aller]').forEach((b) => b.addEventListener('click', () => ecran(b.dataset.aller)));
    $('#btn-commencer').addEventListener('click', () => commencer());
    $('#btn-reprendre').addEventListener('click', reprendre);
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
    $('#btn-effacer-reperes').addEventListener('click', () => plateau.effacerReperes());
    $('#btn-plus-coups').addEventListener('click', chercherPlus);
    $('#btn-coach').addEventListener('click', ouvrirCoach);
    $('#btn-enregistrer-partie').addEventListener('click', () => {
      if (!jeu) return;
      let rec = jeu.fin ? parties().find((x) => x.id === jeu.id) : null;
      if (!rec) rec = ficheEnCours();
      window.Repertoire.enregistrer(rec);
    });
    window.Repertoire.init();
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
      // Échap : efface tous les repères faits au clic droit
      if (e.key === 'Escape' && App.ecranActuel === 'partie' && plateau) { plateau.effacerReperes(); return; }
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
    sauverPartie, parties, options, commencer, jouerContre,
    arreterAnalyse,
    // Rejouer depuis une position du bilan
    rejouerDepuis(rec, n) {
      const reglages = Object.assign({ adversaire: 'expert', pendule: '0', reflexion: options.reflexion }, rec.reglages || {});
      if (rec.adversaire === 'ami') reglages.adversaire = options.adversaire === 'ami' ? 'expert' : options.adversaire;
      let trait = 'w';
      try { const p = new window.Regles.Partie(rec.variante, rec.fen0, rec.coups.slice(0, n)); trait = p.trait(); p.detruire(); } catch (e) { return; }
      reglages.couleur = rec.adversaire === 'ami' ? trait : rec.humain;
      reglages.pendule = '0';
      lancerPartie(rec.variante, reglages, { fen0: rec.fen0, coups: rec.coups.slice(0, n) });
    }
  };
  window.App = App;
  window.addEventListener('DOMContentLoaded', demarrer);
})();
