/* Échecs & Variantes — déroulement du jeu : menus, partie contre les bots, pendule, sauvegardes. */
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

  function lire(cle, defaut) {
    try { const v = JSON.parse(localStorage.getItem(cle)); return v == null ? defaut : v; } catch (e) { return defaut; }
  }
  function ecrire(cle, v) {
    try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { console.warn('Sauvegarde impossible', e); }
  }

  const options = Object.assign({
    sons: true, barre: false, variante: 'classique', adversaire: 'expert', couleur: 'w', pendule: '0', reflexion: '3000'
  }, lire(CLE_OPT, {}));
  function sauverOptions() { ecrire(CLE_OPT, options); }

  // ---------- outils d'évaluation (partagés avec le bilan) ----------
  // Pourcentage de chances de gain (0..100) pour les blancs, à partir d'un score vu des blancs.
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
  // Barre d'avantage. retourne = noirs en bas.
  function majBarre(el, scoreBlanc, retourne) {
    const p = chances(scoreBlanc);
    el.classList.toggle('retournee', !!retourne);
    el.querySelector('.barre-blanc').style.height = p + '%';
    const t = el.querySelector('.barre-texte');
    t.textContent = texteScore(scoreBlanc);
    // le texte se met du côté de celui qui mène
    const blancMene = p >= 50;
    t.classList.toggle('cote-blanc', blancMene);
    t.classList.toggle('cote-noir', !blancMene);
  }

  // ---------- écrans ----------
  function ecran(nom) {
    $$('.ecran').forEach((e) => e.classList.toggle('visible', e.id === 'ecran-' + nom));
    App.ecranActuel = nom;
    if (nom === 'accueil') construireAccueil();
    if (nom === 'parties') construireParties();
    if (nom === 'atelier') window.Atelier.ouvrir();
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
      x.addEventListener('click', () => { if (bt.garder !== true) fermerModale(); if (bt.action) bt.action(); });
      rangee.appendChild(x);
    }
    b.appendChild(rangee);
    m.classList.remove('cachee');
    m.dataset.fermable = fermable === false ? '' : '1';
  }
  function fermerModale() { $('#modale').classList.add('cachee'); }

  let bulleMinuteur = null;
  function bulle(texte) {
    const b = $('#bulle');
    b.textContent = texte;
    b.classList.remove('cachee');
    clearTimeout(bulleMinuteur);
    bulleMinuteur = setTimeout(() => b.classList.add('cachee'), 2600);
  }

  // ---------- accueil ----------
  function construireAccueil() {
    const liste = $('#liste-variantes');
    liste.innerHTML = '';
    const toutes = window.Variantes.toutes();
    if (!toutes.find((v) => v.id === options.variante)) options.variante = 'classique';
    for (const v of toutes) {
      const b = document.createElement('button');
      b.className = 'carte-variante' + (v.id === options.variante ? ' choisie' : '');
      b.innerHTML = '<b></b><span></span>' + (v.perso ? '<i class="etiquette">créée</i>' : v.original ? '<i class="etiquette">JulGame</i>' : '');
      b.querySelector('b').textContent = v.nom;
      b.querySelector('span').textContent = v.court || '';
      b.addEventListener('click', () => { options.variante = v.id; sauverOptions(); construireAccueil(); });
      liste.appendChild(b);
    }
    const plus = document.createElement('button');
    plus.className = 'carte-variante ajouter';
    plus.innerHTML = '<b>✚ Créer une variante</b><span>Ton plateau, tes pièces, tes règles.</span>';
    plus.addEventListener('click', () => ecran('atelier'));
    liste.appendChild(plus);

    const v = window.Variantes.trouver(options.variante);
    const info = $('#info-variante');
    info.innerHTML = '';
    const h = document.createElement('h3'); h.textContent = v.nom; info.appendChild(h);
    const p = document.createElement('p'); p.textContent = v.regles || v.court || ''; info.appendChild(p);
    const m = document.createElement('p'); m.className = 'petit-gris';
    const type = window.Variantes.moteurDe(v);
    m.textContent = 'Bots : ' + (type === 'sf' ? 'Stockfish 19' : 'Fairy-Stockfish (le Stockfish des variantes)');
    info.appendChild(m);

    for (const [id, cle] of [['#choix-adversaire', 'adversaire'], ['#choix-couleur', 'couleur'], ['#choix-pendule', 'pendule'], ['#choix-reflexion', 'reflexion']]) {
      $$(id + ' button').forEach((b) => {
        b.classList.toggle('choisi', b.dataset.val === String(options[cle]));
        b.onclick = () => { options[cle] = b.dataset.val; sauverOptions(); construireAccueil(); };
      });
    }
    $('#bloc-reflexion').style.display = options.adversaire === 'ami' || options.pendule !== '0' ? 'none' : '';
    $('#choix-couleur').style.display = options.adversaire === 'ami' ? 'none' : '';
    $('#choix-couleur').previousElementSibling.style.display = options.adversaire === 'ami' ? 'none' : '';
    $('#btn-reprendre').style.display = lire(CLE_ENCOURS, null) ? '' : 'none';
    $('#opt-sons').checked = options.sons;
    $('#opt-barre').checked = options.barre;
    const note = $('#note-moteur');
    if (!window.Moteurs.disponible('fairy')) {
      note.textContent = 'Les bots des variantes ont besoin que la page soit rechargée une fois (et ouverte par une adresse http, pas en fichier).';
    } else {
      note.textContent = window.crossOriginIsolated ? 'Les moteurs calculent sur ' + Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1)) + ' cœurs du processeur.' : '';
    }
  }

  // ---------- partie ----------
  let jeu = null;
  let plateau = null;
  let horlogeMinuteur = null;
  let jeton = 0; // change à chaque nouvelle situation : les réponses de moteur périmées sont ignorées

  function nomJoueur(camp) {
    if (!jeu) return '';
    if (jeu.adversaire === 'ami') return camp === 'w' ? 'Blancs' : 'Noirs';
    if (camp === jeu.humain) return 'Toi';
    const b = BOTS[jeu.adversaire];
    return b.nom;
  }
  function detailJoueur(camp) {
    if (!jeu || jeu.adversaire === 'ami' || camp === jeu.humain) return '';
    const b = BOTS[jeu.adversaire];
    if (b.elo) return b.detail;
    return window.Variantes.moteurDe(jeu.variante) === 'sf' ? 'Stockfish 19' : 'Fairy-Stockfish';
  }

  function estAuBot() {
    return jeu && !jeu.fin && jeu.adversaire !== 'ami' && jeu.partie.trait() !== jeu.humain;
  }

  function nouvellePartie(cfg, depuis) {
    arreterTout();
    if (jeu && jeu.partie) jeu.partie.detruire();
    const v = window.Variantes.trouver(cfg.variante);
    let humain = cfg.couleur;
    if (humain === 'hasard') humain = Math.random() < 0.5 ? 'w' : 'b';
    if (cfg.adversaire === 'ami') humain = 'w';
    let partie;
    try {
      partie = new window.Regles.Partie(v, depuis && depuis.fen0, depuis && depuis.coups);
    } catch (e) {
      bulle('Impossible de lancer cette variante.');
      console.error(e);
      return;
    }
    const pend = cfg.pendule && cfg.pendule !== '0' ? cfg.pendule.split('+').map(Number) : null;
    jeu = {
      id: 'p' + Date.now().toString(36),
      date: Date.now(),
      variante: v,
      partie,
      adversaire: cfg.adversaire,
      humain,
      reflexion: +cfg.reflexion || 3000,
      pendule: pend ? { base: pend[0] * 60000, inc: (pend[1] || 0) * 1000 } : null,
      temps: pend ? { w: pend[0] * 60000, b: pend[0] * 60000 } : null,
      fin: null,
      aide: false,
      evalBlanc: null
    };
    window.Moteurs.pourVariante(v).nouvellePartie();
    ecran('partie');
    plateau.retourner(humain === 'b');
    afficherPartie(false);
    sauverEnCours();
    demarrerHorloge();
    tour();
  }

  function reprendre() {
    const s = lire(CLE_ENCOURS, null);
    if (!s) return;
    const v = window.Variantes.toutes().find((x) => x.id === s.varianteId);
    if (!v) { bulle('La variante de cette partie n’existe plus.'); localStorage.removeItem(CLE_ENCOURS); return; }
    arreterTout();
    if (jeu && jeu.partie) jeu.partie.detruire();
    let partie;
    try { partie = new window.Regles.Partie(v, s.fen0, s.coups); } catch (e) { bulle('Partie illisible.'); return; }
    jeu = {
      id: s.id, date: s.date, variante: v, partie, adversaire: s.adversaire, humain: s.humain,
      reflexion: s.reflexion, pendule: s.pendule, temps: s.temps, fin: null, aide: s.aide, evalBlanc: null
    };
    window.Moteurs.pourVariante(v).nouvellePartie();
    ecran('partie');
    plateau.retourner(jeu.humain === 'b');
    afficherPartie(false);
    demarrerHorloge();
    tour();
  }

  function sauverEnCours() {
    if (!jeu || jeu.fin) { localStorage.removeItem(CLE_ENCOURS); return; }
    ecrire(CLE_ENCOURS, {
      id: jeu.id, date: jeu.date, varianteId: jeu.variante.id, fen0: jeu.partie.fen0, coups: jeu.partie.coups,
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

  function afficherPartie(animer) {
    const p = jeu.partie;
    const pos = window.Regles.lireFen(p.fen);
    plateau.afficher(pos, {
      variante: jeu.variante,
      dernier: dernierCoupCases(p.coups[p.coups.length - 1]),
      echec: caseRoiEnEchec(pos, p),
      animer
    });
    // joueurs (haut = camp adverse de celui du bas)
    const bas = plateau.retourne ? 'b' : 'w';
    const haut = bas === 'w' ? 'b' : 'w';
    for (const [id, camp] of [['#joueur-haut', haut], ['#joueur-bas', bas]]) {
      const el = $(id);
      el.querySelector('.joueur-nom').textContent = (camp === 'w' ? '○ ' : '● ') + nomJoueur(camp);
      let extra = detailJoueur(camp);
      if (pos.echecs) extra = (extra ? extra + ' · ' : '') + 'échecs à donner : ' + pos.echecs[camp];
      el.querySelector('.joueur-extra').textContent = extra;
      el.classList.toggle('au-trait', !jeu.fin && p.trait() === camp);
      el.querySelector('.pendule').style.display = jeu.temps ? '' : 'none';
    }
    majPendules();
    // liste des coups
    remplirListeCoups($('#coups-partie'), p, p.coups.length, null);
    $('#btn-annuler').disabled = !!jeu.fin || !p.coups.length;
    $('#btn-abandonner').disabled = !!jeu.fin;
    const barre = $('#barre-partie');
    barre.style.display = options.barre ? '' : 'none';
    if (options.barre) majBarre(barre, jeu.evalBlanc, plateau.retourne);
    redimensionner();
  }

  // Liste des coups en deux colonnes. marques[i] = classe CSS + symbole pour le coup i (bilan).
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
    else el.scrollTop = el.scrollHeight;
  }

  function etat(texte) { $('#etat-partie').textContent = texte; }

  function tour() {
    if (!jeu || jeu.fin) return;
    const p = jeu.partie;
    if (p.finie()) { terminer(p.resultat(), p.raison()); return; }
    const monJeton = ++jeton;
    if (estAuBot()) {
      plateau.bloquer();
      lancerBot(monJeton);
    } else {
      const camp = p.trait();
      plateau.autoriser(p.legaux(), camp);
      if (jeu.adversaire === 'ami') etat('Au tour des ' + (camp === 'w' ? 'blancs' : 'noirs') + '.');
      else etat('À toi de jouer.');
      if (options.barre) analyseEnDirect(monJeton);
    }
  }

  async function lancerBot(monJeton) {
    const bot = BOTS[jeu.adversaire];
    const p = jeu.partie;
    const moteur = window.Moteurs.pourVariante(jeu.variante);
    etat(bot.nom + ' réfléchit…');
    const debut = performance.now();
    const o = {
      variante: jeu.variante, fen0: p.fen0, coups: p.coups.slice(), elo: bot.elo,
      surInfo: (lignes) => {
        if (monJeton !== jeton || !lignes[0]) return;
        if (!bot.elo) etat(bot.nom + ' réfléchit… (profondeur ' + lignes[0].profondeur + ')');
        if (options.barre && !bot.elo) majEvalDirect(lignes[0].score, p.trait());
      }
    };
    if (jeu.temps && bot.elo) {
      // L'Expert joue à un rythme humain : une petite part de son temps restant.
      const reste = jeu.temps[p.trait()];
      o.temps = Math.max(250, Math.min(2500, reste / 45 + jeu.pendule.inc * 0.6));
    } else if (jeu.temps) {
      o.horloge = { wtime: jeu.temps.w, btime: jeu.temps.b, winc: jeu.pendule.inc, binc: jeu.pendule.inc };
    } else {
      o.temps = bot.elo ? 900 : jeu.reflexion;
    }
    let r;
    try {
      r = await moteur.chercher(o);
    } catch (e) {
      console.error(e);
      etat('Le bot ne peut pas jouer : ' + e.message);
      return;
    }
    if (monJeton !== jeton || !jeu || jeu.fin || r.annulee) return;
    if (!r.coup || !p.legaux().includes(r.coup)) {
      // Le moteur ne trouve rien (ne devrait pas arriver) : on joue un coup légal au hasard.
      const l = p.legaux();
      if (!l.length) return;
      r.coup = l[Math.floor(Math.random() * l.length)];
    }
    // Un bot « humain » ne joue pas instantanément.
    const attente = (bot.elo ? 500 + Math.random() * 900 : 250) - (performance.now() - debut);
    if (attente > 0 && !jeu.temps) await new Promise((ok) => setTimeout(ok, attente));
    if (monJeton !== jeton || !jeu || jeu.fin) return;
    jouerCoup(r.coup, true);
  }

  function majEvalDirect(scoreTrait, trait) {
    jeu.evalBlanc = trait === 'w' ? scoreTrait : inverser(scoreTrait);
    majBarre($('#barre-partie'), jeu.evalBlanc, plateau.retourne);
  }

  function analyseEnDirect(monJeton) {
    const p = jeu.partie;
    const moteur = window.Moteurs.pourVariante(jeu.variante);
    const trait = p.trait();
    moteur.chercher({
      variante: jeu.variante, fen0: p.fen0, coups: p.coups.slice(), elo: null, temps: 30000,
      surInfo: (lignes) => { if (monJeton === jeton && lignes[0]) majEvalDirect(lignes[0].score, trait); }
    }).catch(() => {});
  }

  function arreterTout() {
    jeton++;
    for (const t of ['sf', 'fairy']) {
      const m = window.Moteurs.obtenir(t);
      if (m.pret) m.arreter();
    }
  }

  function surCoupHumain(uci) {
    if (!jeu || jeu.fin || estAuBot()) return;
    if (options.barre) window.Moteurs.pourVariante(jeu.variante).arreter();
    jouerCoup(uci, false);
  }

  function jouerCoup(uci, animer) {
    const p = jeu.partie;
    const camp = p.trait();
    const prise = p.board.isCapture(uci);
    if (!p.jouer(uci)) return;
    if (jeu.temps) jeu.temps[camp] += jeu.pendule.inc;
    if (p.echec()) window.Son.echec();
    else if (uci.includes('@')) window.Son.pose();
    else if (prise) window.Son.prise();
    else window.Son.coup();
    afficherPartie(animer);
    sauverEnCours();
    tour();
  }

  function annulerCoup() {
    if (!jeu || jeu.fin) return;
    const p = jeu.partie;
    if (!p.coups.length) return;
    arreterTout();
    if (jeu.adversaire === 'ami') {
      p.annuler();
    } else {
      // On revient au dernier moment où c'était à toi, en retirant au moins un de tes coups.
      p.annuler();
      while (p.coups.length && p.trait() !== jeu.humain) p.annuler();
      jeu.aide = true;
    }
    jeu.evalBlanc = null;
    afficherPartie(false);
    sauverEnCours();
    tour();
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
      if (!p.coups.length) return; // la pendule part après le premier coup
      const camp = p.trait();
      jeu.temps[camp] -= dt;
      if (jeu.temps[camp] <= 0) {
        jeu.temps[camp] = 0;
        majPendules();
        arreterTout();
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
    arreterTout();
    plateau.bloquer();
    window.Son.fin();
    const rec = enregistrerPartie();
    afficherPartie(false);
    localStorage.removeItem(CLE_ENCOURS);
    let titre;
    if (resultat === '1/2-1/2') titre = 'Partie nulle';
    else {
      const gagnant = resultat === '1-0' ? 'w' : 'b';
      if (jeu.adversaire === 'ami') titre = (gagnant === 'w' ? 'Les blancs' : 'Les noirs') + ' gagnent';
      else titre = gagnant === jeu.humain ? 'Tu as gagné !' : BOTS[jeu.adversaire].nom + ' a gagné';
    }
    etat(titre + ' — ' + raison);
    modale('<h2>' + titre + '</h2><p>' + raison + '</p>', [
      { texte: '📊 Bilan de la partie', classe: 'principal', action: () => window.Bilan.ouvrir(rec) },
      { texte: '↻ Revanche', action: () => revanche() },
      { texte: 'Voir le plateau' },
      { texte: '☰ Menu', action: () => ecran('accueil') }
    ]);
  }

  function revanche() {
    if (!jeu) return;
    const cfg = {
      variante: jeu.variante.id, adversaire: jeu.adversaire,
      couleur: jeu.adversaire === 'ami' ? 'w' : (jeu.humain === 'w' ? 'b' : 'w'),
      pendule: jeu.pendule ? (jeu.pendule.base / 60000) + '+' + (jeu.pendule.inc / 1000) : '0',
      reflexion: jeu.reflexion
    };
    nouvellePartie(cfg);
  }

  function enregistrerPartie() {
    const p = jeu.partie;
    const rec = {
      id: jeu.id, date: jeu.date, varianteId: jeu.variante.id, varianteNom: jeu.variante.nom,
      fen0: p.fen0, coups: p.coups.slice(),
      blancs: nomJoueur('w') + (detailJoueur('w') ? ' (' + detailJoueur('w') + ')' : ''),
      noirs: nomJoueur('b') + (detailJoueur('b') ? ' (' + detailJoueur('b') + ')' : ''),
      adversaire: jeu.adversaire, humain: jeu.humain,
      resultat: jeu.fin.resultat, raison: jeu.fin.raison, aide: jeu.aide,
      pendule: jeu.pendule, reflexion: jeu.reflexion, analyse: null
    };
    sauverPartie(rec);
    return rec;
  }

  function parties() { return lire(CLE_PARTIES, []); }
  function sauverPartie(rec) {
    let l = parties().filter((x) => x.id !== rec.id);
    l.unshift(rec);
    if (l.length > 60) l = l.slice(0, 60);
    ecrire(CLE_PARTIES, l);
  }

  // ---------- liste des parties ----------
  function construireParties() {
    const el = $('#liste-parties');
    el.innerHTML = '';
    const l = parties();
    if (!l.length) {
      el.innerHTML = '<p class="vide">Aucune partie terminée pour l’instant.</p>';
      return;
    }
    for (const rec of l) {
      const d = document.createElement('div');
      d.className = 'ligne-partie';
      const date = new Date(rec.date);
      const res = rec.resultat === '1/2-1/2' ? '½–½' : rec.resultat.replace('-', '–');
      let issue = '';
      if (rec.adversaire !== 'ami') {
        if (rec.resultat === '1/2-1/2') issue = 'nulle';
        else issue = ((rec.resultat === '1-0') === (rec.humain === 'w')) ? 'victoire' : 'défaite';
      }
      const prec = rec.analyse && rec.analyse.precision ? ' · précision ' + Math.round(rec.analyse.precision.w) + ' % / ' + Math.round(rec.analyse.precision.b) + ' %' : '';
      d.innerHTML = '<div class="lp-texte"><b></b><span></span></div><div class="lp-boutons"></div>';
      d.querySelector('b').textContent = rec.varianteNom + ' — ' + rec.blancs + ' contre ' + rec.noirs;
      d.querySelector('span').textContent = date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) +
        ' · ' + res + (issue ? ' (' + issue + ')' : '') + ' · ' + rec.raison + ' · ' + Math.ceil(rec.coups.length / 2) + ' coups' + prec;
      if (issue) d.classList.add('issue-' + (issue === 'victoire' ? 'v' : issue === 'défaite' ? 'd' : 'n'));
      const bts = d.querySelector('.lp-boutons');
      const b1 = document.createElement('button'); b1.className = 'bouton principal'; b1.textContent = '📊 Bilan';
      b1.onclick = () => window.Bilan.ouvrir(rec);
      const b2 = document.createElement('button'); b2.className = 'bouton'; b2.textContent = '📋 PGN';
      b2.onclick = () => copier(pgn(rec), 'Partie copiée (PGN).');
      const b3 = document.createElement('button'); b3.className = 'bouton danger'; b3.textContent = '🗑';
      b3.title = 'Supprimer';
      b3.onclick = () => modale('<h2>Supprimer cette partie ?</h2>', [
        { texte: 'Supprimer', classe: 'danger', action: () => { ecrire(CLE_PARTIES, parties().filter((x) => x.id !== rec.id)); construireParties(); } },
        { texte: 'Annuler' }
      ]);
      bts.append(b1, b2, b3);
      el.appendChild(d);
    }
  }

  // ---------- PGN ----------
  function pgn(rec) {
    const v = window.Variantes.toutes().find((x) => x.id === rec.varianteId);
    const d = new Date(rec.date);
    const date = d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
    const res = rec.resultat;
    const lignes = [
      '[Event "JulGame — Échecs & Variantes"]', '[Site "JulGame"]', '[Date "' + date + '"]',
      '[White "' + rec.blancs + '"]', '[Black "' + rec.noirs + '"]', '[Result "' + res + '"]'
    ];
    if (v && v.uci !== 'chess') lignes.push('[Variant "' + v.uci + '"]');
    if (v && v.is960) lignes.push('[Variant "Chess960"]');
    const std = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    if (rec.fen0 !== std && v && (v.uci === 'chess')) { lignes.push('[SetUp "1"]'); lignes.push('[FEN "' + rec.fen0 + '"]'); }
    let sans = [];
    try {
      const p = new window.Regles.Partie(v, rec.fen0, rec.coups);
      sans = p.sansEn.slice();
      p.detruire();
    } catch (e) { sans = rec.coups.slice(); }
    let num = +(rec.fen0.split(/\s+/).pop()) || 1;
    const noir = rec.fen0.split(/\s+/)[1] === 'b';
    let txt = '';
    let i = 0;
    if (noir && sans.length) { txt += num + '... ' + sans[0] + ' '; i = 1; num++; }
    for (; i < sans.length; i += 2) {
      txt += num + '. ' + sans[i] + ' ' + (sans[i + 1] ? sans[i + 1] + ' ' : '');
      num++;
    }
    return lignes.join('\n') + '\n\n' + txt + res + '\n';
  }

  function copier(texte, message) {
    const fin = () => bulle(message || 'Copié.');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texte).then(fin, () => repli());
    else repli();
    function repli() {
      const t = document.createElement('textarea'); t.value = texte; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); fin(); } catch (e) { bulle('Copie impossible.'); }
      t.remove();
    }
  }

  // ---------- règles de la variante ----------
  function montrerRegles(v) {
    v = v || (jeu && jeu.variante) || window.Variantes.trouver(options.variante);
    const d = document.createElement('div');
    const h = document.createElement('h2'); h.textContent = v.nom; d.appendChild(h);
    const p = document.createElement('p'); p.textContent = v.regles || v.court || ''; d.appendChild(p);
    let fen;
    try { fen = window.Regles.ff.startingFen(v.uci); } catch (e) { fen = ''; }
    const lettres = window.Pieces.piecesDeFen(fen);
    if (v.ini) {
      const m = v.ini.match(/promotionPieceTypes\s*=\s*(\w+)/);
      if (m) for (const l of m[1]) if (!lettres.includes(l)) lettres.push(l);
    }
    const leg = document.createElement('div'); leg.className = 'legende';
    for (const l of lettres) {
      const info = window.Pieces.infoPiece(l, v);
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
    else if (nom === 'atelier') { window.Atelier.redimensionner(); return; }
    if (!pl || !zone) return;
    const r = zone.getBoundingClientRect();
    const avecBarre = barre && barre.style.display !== 'none';
    const largeur = r.width - (avecBarre ? 58 : 0) - 24;
    const poches = pl.position && pl.position.poches;
    const hauteur = r.height - 24;
    const t = Math.floor(Math.min(largeur / pl.cols, hauteur / (pl.lignes + (poches ? 2.3 : 0))));
    pl.taille(Math.max(24, t));
    if (barre) barre.style.height = (t * pl.lignes) + 'px';
  }

  // ---------- démarrage ----------
  async function demarrer() {
    plateau = new window.Plateau($('#plateau-partie'), { surCoup: surCoupHumain });
    window.Son.regler(options.sons);
    try {
      await window.Regles.charger();
      window.Regles.chargerVariantes(window.Variantes.iniTotal());
    } catch (e) {
      $('#chargement-texte').textContent = 'Impossible de charger les règles. Ouvre le jeu par une adresse http (pas en double-cliquant le fichier).';
      console.error(e);
      return;
    }
    $('#chargement').remove();
    window.Bilan.init();
    window.Atelier.init();

    $$('[data-aller]').forEach((b) => b.addEventListener('click', () => ecran(b.dataset.aller)));
    $('#btn-commencer').addEventListener('click', () => nouvellePartie(options));
    $('#btn-reprendre').addEventListener('click', reprendre);
    $('#opt-sons').addEventListener('change', (e) => { options.sons = e.target.checked; window.Son.regler(options.sons); sauverOptions(); });
    $('#opt-barre').addEventListener('change', (e) => { options.barre = e.target.checked; sauverOptions(); });
    $('#btn-retourner').addEventListener('click', () => { plateau.retourner(!plateau.retourne); afficherPartie(false); });
    $('#btn-annuler').addEventListener('click', annulerCoup);
    $('#btn-abandonner').addEventListener('click', abandonner);
    $('#btn-regles').addEventListener('click', () => montrerRegles());
    $('#btn-menu-partie').addEventListener('click', () => {
      if (jeu && !jeu.fin) sauverEnCours();
      arreterTout();
      clearInterval(horlogeMinuteur);
      ecran('accueil');
    });
    $('#modale').addEventListener('click', (e) => { if (e.target.id === 'modale' && $('#modale').dataset.fermable) fermerModale(); });
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'Escape' && !$('#modale').classList.contains('cachee')) { fermerModale(); return; }
      if (App.ecranActuel === 'partie' && (e.key === 'f' || e.key === 'F')) $('#btn-retourner').click();
      if (App.ecranActuel === 'bilan') window.Bilan.touche(e);
    });
    window.addEventListener('resize', redimensionner);
    ecran('accueil');
  }

  const App = {
    ecranActuel: 'accueil',
    ecran, modale, fermerModale, bulle, copier, pgn, montrerRegles, redimensionner,
    chances, texteScore, inverser, majBarre, remplirListeCoups, dernierCoupCases, caseRoiEnEchec,
    sauverPartie, parties, options,
    nouvellePartie,
    // Rejouer depuis une position du bilan
    rejouerDepuis(rec, n) {
      const cfg = {
        variante: rec.varianteId,
        adversaire: rec.adversaire === 'ami' ? options.adversaire === 'ami' ? 'expert' : options.adversaire : rec.adversaire,
        couleur: 'w', pendule: '0', reflexion: rec.reflexion || options.reflexion
      };
      let partie;
      try { partie = new window.Regles.Partie(window.Variantes.trouver(rec.varianteId), rec.fen0, rec.coups.slice(0, n)); } catch (e) { return; }
      cfg.couleur = rec.adversaire === 'ami' ? partie.trait() : rec.humain;
      partie.detruire();
      nouvellePartie(cfg, { fen0: rec.fen0, coups: rec.coups.slice(0, n) });
    }
  };
  window.App = App;
  window.addEventListener('DOMContentLoaded', demarrer);
})();
