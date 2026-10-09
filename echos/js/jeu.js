'use strict';
/* Partie : notes qui descendent, jugement des frappes, lecture des passages, dessin. */

const Jeu = (() => {
  const FEN = { parfait: 0.045, super: 0.09, bien: 0.14 };
  const FEN_LACHER = 0.15; // on peut lâcher une note longue jusqu'à 0,15 s avant sa fin
  const POINTS = { parfait: 300, super: 200, bien: 100 };
  const POIDS = { parfait: 1, super: 0.75, bien: 0.45 };
  const TEXTES = { parfait: 'Parfait', super: 'Super', bien: 'Bien' };
  // couleur de la bande b (0 = aigu) pour le nombre de touches de la partie
  const K = () => (S ? S.K : Reglages.d.nbTouches);
  const couleur = b => Analyse.couleur(b, K());
  const rgbs = {};
  function rgba(b, a) {
    const h = couleur(b);
    const c = rgbs[h] || (rgbs[h] = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  let cv, g, W = 0, H = 0, dpr = 1;
  let S = null, rappels = {};
  let dernierCadre = 0;

  function init(canvas, r) {
    cv = canvas; g = cv.getContext('2d'); rappels = r;
    addEventListener('resize', taille);
    const doigts = new Map(); // pointeur → voie
    cv.addEventListener('pointerdown', e => {
      if (!S) return;
      const v = voieA(e.clientX);
      if (v >= 0) { e.preventDefault(); doigts.set(e.pointerId, v); S.tenues[v] = true; appui(v, e.timeStamp); }
    });
    const lever = e => {
      if (!doigts.has(e.pointerId)) return;
      const v = doigts.get(e.pointerId); doigts.delete(e.pointerId);
      if (S) relache(v, e.timeStamp);
    };
    cv.addEventListener('pointerup', lever);
    cv.addEventListener('pointercancel', lever);
    document.addEventListener('visibilitychange', () => { if (document.hidden && S && !S.pause && !S.finie) basculerPause(); });
    document.getElementById('btn-pause').onclick = () => basculerPause();
    document.getElementById('p-reprendre').onclick = () => basculerPause();
    document.getElementById('p-son').onclick = () => { Reglages.d.son = Reglages.d.son === false; Reglages.sauver(); Son.volume(Reglages.d.volume); majPause(); };
    document.getElementById('p-vaisseaux').onclick = () => {
      Reglages.d.vaisseaux = Reglages.d.vaisseaux === false; Reglages.sauver(); majPause();
      // en les réaffichant, on les remet à l'heure (sans compter les crashs pendant qu'ils étaient masqués)
      if (Reglages.d.vaisseaux && S) Vaisseaux.preparer(S.notes, S.parVoie, S.tGel, S.opts.partition.duree + 1, S.relachement);
    };
    document.getElementById('p-recommencer').onclick = () => { const o = S.opts; fermerPause(); lancer(o); };
    document.getElementById('p-quitter').onclick = () => { fermerPause(); arreter(); rappels.quitter(); };
    requestAnimationFrame(boucle);
  }

  function taille() {
    if (!cv) return;
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  // Les pistes de notes (le « piano ») toujours au centre de l'écran ; s'il reste assez de place,
  // les mini-niveaux vaisseau (un par touche) dans l'espace à leur gauche.
  function geo() {
    const k = K();
    const ideal = Math.min(k * 160, 620 + Math.max(0, k - 4) * 75);   // largeur souhaitée du clavier
    const avecGD = W >= 760 && Reglages.d.vaisseaux !== false && (H - 82) / k >= 24;
    let PW = avecGD ? Math.min(ideal, W * Math.min(0.76, 0.44 + Math.max(0, k - 4) * 0.04)) : Math.min(ideal, W * 0.94);
    let zoneGD = null;
    if (avecGD) {
      const gw = Math.min(560, (W - PW) / 2 - 32);
      if (gw >= 150) zoneGD = { x: (W - PW) / 2 - 16 - gw, y: 66, w: gw, h: H - 66 - 16 };
      else PW = Math.min(ideal, W * 0.94); // pas la place pour les vaisseaux : le clavier prend tout
    }
    const lw = PW / k, x0 = (W - PW) / 2, yH = H * 0.8;
    return { PW, lw, x0, yH, zoneGD, cx: x0 + PW / 2 };
  }
  function voieA(x) { const { lw, x0 } = geo(); const v = Math.floor((x - x0) / lw); return v >= 0 && v < K() ? v : -1; }
  const bandeDeVoie = v => Analyse.voieDe(v, Reglages.d.aiguGauche, K());

  /* ---------- partie ---------- */
  // o : { morceau, tampon, etire, partition, mode, style, diff, rate, depart, guide }
  function lancer(o) {
    arreter();
    taille();
    const nbT = o.partition.K || 4;
    // sans relâchement : toutes les notes sont de simples appuis
    const notes = o.partition.notes.filter(n => n.t >= o.depart - 0.01)
      .map(n => Object.assign({}, n, { etat: 0, joue: 0 }, o.relachement === false ? { duree: 0 } : {}));
    const parVoie = Array.from({ length: nbT }, () => []);
    const rempli = x => new Array(nbT).fill(x);
    notes.forEach((n, i) => parVoie[n.voie].push(i));
    S = {
      opts: o, K: nbT, relachement: o.relachement !== false, mode: o.mode, style: o.style, tampon: o.tampon, depart: o.depart, rate: o.rate,
      notes, parVoie, ptr: rempli(0), iAuto: 0, iVis: 0,
      score: 0, combo: 0, maxCombo: 0,
      cpt: { parfait: 0, super: 0, bien: 0, rate: 0, fausse: 0, tenu: 0, lache: 0 },
      nbLongues: notes.filter(n => n.duree > 0).length,
      enTenue: rempli(null),   // note longue en cours de chaque touche
      autoTenue: rempli(-1),   // mode Écouter : fin de la note longue « tenue » par l'ordinateur
      accSum: 0, accN: 0,
      total: notes.reduce((s, n) => s + (n.fin - n.t), 0),
      appuis: rempli(-1e9), erreurs: rempli(-1e9), tenues: rempli(false),
      jug: null, parts: [],
      fin: o.partition.duree + 0.6, // toujours jusqu'à la toute fin du morceau
      pause: false, reprise: 0, finie: false, tGel: o.depart - 2,
    };
    Son.toutArreter();
    Son.bandes(nbT);
    Son.demarrerHorloge(o.depart, o.rate, 2.2, o.etire);
    Son.demarrerGuide(o.tampon, o.guide);
    Vaisseaux.preparer(notes, parVoie, o.depart - 2.5 * o.rate, o.partition.duree + 1, S.relachement);
  }

  function arreter() {
    Son.toutArreter();
    if (S && S.pause) Son.reprendre();
    S = null;
  }

  function boucle(maintenant) {
    requestAnimationFrame(boucle);
    cadre(maintenant);
  }
  function cadre(maintenant) {
    const dt = Math.min(0.05, (maintenant - dernierCadre) / 1000 || 0);
    dernierCadre = maintenant;
    if (!S) return;
    if (S.pause && S.reprise && performance.now() >= S.reprise) { S.reprise = 0; S.pause = false; Son.reprendre(); }
    let t;
    if (S.pause) t = S.tGel;
    else { t = Son.tempsEntendu(); S.tGel = t; }
    if (!S.pause && !S.finie) {
      if (Reglages.d.vaisseaux !== false) Vaisseaux.maj(t - Reglages.d.decalage / 1000);
      if (S.mode === 'ecoute') auto(t);
      else {
        if (S.mode === 'entrainement') rates(t - Reglages.d.decalage / 1000);
        for (let v = 0; v < S.K; v++) {
          const n = S.enTenue[v];
          if (n && t - Reglages.d.decalage / 1000 >= n.t + n.duree) finirTenue(v, true, n.t + n.duree);
        }
      }
      if (t > S.fin) terminer();
    }
    if (S) dessiner(t, dt);
  }

  // Mode Écouter : l'ordinateur joue parfaitement (les passages sont programmés un peu à l'avance)
  function auto(t) {
    const tr = Son.tempsRendu();
    while (S.iAuto < S.notes.length && S.notes[S.iAuto].t < tr + 0.15) {
      const n = S.notes[S.iAuto++];
      Son.jouerPassage(S.tampon, n.src, n.t, n.fin);
      Vaisseaux.appui(n.voie, n.t, true);
      const suiv = S.parVoie[n.voie].find(k => S.notes[k].t > n.t);
      Vaisseaux.appui(n.voie, Math.min(n.t + (n.duree > 0 ? n.duree : Vaisseaux.TAP), suiv !== undefined ? S.notes[suiv].t - 0.01 : Infinity), false);
    }
    while (S.iVis < S.notes.length && S.notes[S.iVis].t <= t) {
      const n = S.notes[S.iVis++];
      n.etat = 1; n.joue = n.fin - n.t;
      if (n.duree > 0) { n.tenu = 1; S.autoTenue[n.voie] = n.t + n.duree; }
      S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo);
      S.appuis[n.voie] = performance.now();
      effets(n.voie, 'parfait');
    }
    for (let v = 0; v < S.K; v++) S.tenues[v] = t < S.autoTenue[v];
  }

  function rates(t) {
    for (let v = 0; v < S.K; v++) {
      const L = S.parVoie[v];
      while (S.ptr[v] < L.length && t - S.notes[L[S.ptr[v]]].t > FEN.bien) {
        const n = S.notes[L[S.ptr[v]++]];
        n.etat = 2;
        S.cpt.rate++; S.combo = 0; S.accN++;
        if (n.duree > 0) { n.tenu = 2; S.accN++; }
        S.jug = { txt: 'Raté', coul: '#8a86a3', a: performance.now() };
      }
    }
  }

  function appui(v, ts) {
    if (!S || S.pause || S.finie) return;
    S.appuis[v] = performance.now();
    if (S.mode === 'ecoute') return;
    const t = Son.tempsEntendu(ts) - Reglages.d.decalage / 1000;
    Vaisseaux.appui(v, t, true);
    if (S.mode === 'solo') return solo(v, t);
    const L = S.parVoie[v], p = S.ptr[v];
    if (p < L.length) {
      const n = S.notes[L[p]], d = t - n.t;
      if (Math.abs(d) <= FEN.bien) { S.ptr[v]++; reussir(n, d); return; }
    }
    fausse(v);
  }

  function reussir(n, d) {
    const a = Math.abs(d);
    const j = a <= FEN.parfait ? 'parfait' : a <= FEN.super ? 'super' : 'bien';
    n.etat = 1; n.joue = n.fin - n.t;
    S.cpt[j]++; S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo);
    S.score += Math.round(POINTS[j] * (1 + Math.min(S.combo, 200) / 100));
    S.accSum += POIDS[j]; S.accN++;
    Son.jouerPassage(S.tampon, n.src, n.t, n.fin);
    if (n.duree > 0) S.enTenue[n.voie] = n;
    effets(n.voie, j, d);
  }

  // Touche relâchée : utile pour les vaisseaux et pour les notes longues
  function relache(v, ts) {
    S.tenues[v] = false;
    if (S.finie || S.mode === 'ecoute') return;
    const t = (S.pause ? S.tGel : Son.tempsEntendu(ts)) - Reglages.d.decalage / 1000;
    Vaisseaux.appui(v, t, false);
    const n = S.enTenue[v];
    if (n && S.relachement) finirTenue(v, t >= n.t + n.duree - FEN_LACHER, t);
  }

  // Fin d'une note longue : tenue jusqu'au bout (ok) ou lâchée trop tôt (le son s'arrête)
  function finirTenue(v, ok, t) {
    const n = S.enTenue[v];
    S.enTenue[v] = null;
    if (!n) return;
    if (ok) {
      n.tenu = 1;
      if (S.mode !== 'entrainement') return;
      S.cpt.tenu++;
      S.score += Math.round(150 * (1 + Math.min(S.combo, 200) / 100));
      S.accSum += 1; S.accN++;
      S.jug = { txt: 'Tenu !', coul: '#5dffa8', a: performance.now() };
    } else {
      n.tenu = 2;
      Son.couperSource(n.src);
      n.joue = Math.max(0, Math.min(n.joue, t - n.t));
      if (S.mode !== 'entrainement') return;
      S.cpt.lache++; S.combo = 0; S.accN++;
      S.jug = { txt: 'Lâché trop tôt', coul: '#ffb341', a: performance.now() };
    }
  }

  function fausse(v) {
    S.cpt.fausse++;
    if (S.mode === 'entrainement') { S.combo = 0; S.accN += 0.5; }
    S.erreurs[v] = performance.now();
    S.jug = { txt: 'Fausse note', coul: '#ff4d6d', a: performance.now() };
  }

  // Dernier indice i (dans la liste d'indices L, ou toutes les notes si L est nul) tel que note.t <= t
  function derniereAvant(L, t) {
    const len = L ? L.length : S.notes.length, at = i => S.notes[L ? L[i] : i].t;
    let lo = 0, hi = len;
    while (lo < hi) { const m = (lo + hi) >> 1; if (at(m) <= t) lo = m + 1; else hi = m; }
    return lo - 1;
  }

  // Solo libre : pas de notes affichées ; la touche joue sa partie du morceau à partir de maintenant.
  function solo(v, t) {
    const tr = Son.tempsRendu();
    let n = null;
    if (S.style === 'couches') {
      const i = derniereAvant(S.parVoie[v], t + 0.12);
      if (i >= 0) n = S.notes[S.parVoie[v][i]];
    } else {
      const i = derniereAvant(null, t + 0.12);
      if (i >= 0) n = S.notes[i];
      if (n && n.voie !== v) return fausse(v); // mauvaise touche pour ce passage : silence
    }
    if (!n || n.fin <= tr) return;
    const debut = Math.max(n.t, tr);
    Son.jouerPassage(S.tampon, n.src, debut, n.fin);
    n.joue = Math.max(n.joue, n.fin - debut);
    n.etat = 1;
    if (n.duree > 0 && t < n.t + n.duree - FEN_LACHER) S.enTenue[v] = n;
    effets(v, null);
  }

  function effets(v, j, d) {
    const { lw, x0, yH } = geo();
    const b = bandeDeVoie(v), x = x0 + (v + 0.5) * lw;
    for (let i = 0; i < (j === 'parfait' ? 14 : 8); i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, vit = 120 + Math.random() * 260;
      S.parts.push({ x, y: yH, vx: Math.cos(ang) * vit, vy: Math.sin(ang) * vit, vie: 0.5 + Math.random() * 0.3, b });
    }
    if (j) {
      const coul = j === 'parfait' ? '#5dffa8' : j === 'super' ? '#5ee7ff' : '#ffd23f';
      let txt = TEXTES[j];
      if (j !== 'parfait' && d !== undefined) txt += d < 0 ? ' (tôt)' : ' (tard)';
      S.jug = { txt, coul, a: performance.now() };
    }
  }

  function terminer() {
    S.finie = true;
    const fini = S;
    setTimeout(() => { if (S === fini) { Son.toutArreter(); S = null; } }, 400);
    const precision = fini.accN ? fini.accSum / fini.accN * 100 : 0;
    const joue = fini.notes.reduce((s, n) => s + n.joue, 0);
    const repro = fini.total ? Math.min(100, joue / fini.total * 100) : 0;
    const note = precision >= 95 ? 'S' : precision >= 88 ? 'A' : precision >= 78 ? 'B' : precision >= 65 ? 'C' : 'D';
    rappels.fin({
      opts: fini.opts, mode: fini.mode, score: fini.score, precision, note, repro,
      cpt: fini.cpt, maxCombo: fini.maxCombo, nbNotes: fini.notes.length, crashs: Reglages.d.vaisseaux !== false ? Vaisseaux.crashs() : null, nbLongues: fini.nbLongues,
    });
  }

  /* ---------- pause ---------- */
  function basculerPause() {
    if (!S || S.finie) return;
    const voile = document.getElementById('voile-pause');
    if (!S.pause) {
      S.pause = true; S.reprise = 0;
      Son.pause();
      majPause();
      voile.hidden = false;
    } else if (!S.reprise) {
      voile.hidden = true;
      S.reprise = performance.now() + 1000; // petit délai pour se remettre en place
    }
  }
  function majPause() {
    document.getElementById('p-son').textContent = Reglages.d.son === false ? '🔇 Son coupé — réactiver' : '🔊 Son activé — couper';
    document.getElementById('p-vaisseaux').textContent = Reglages.d.vaisseaux === false ? '🚀 Afficher les vaisseaux' : '🚀 Masquer les vaisseaux';
  }
  function fermerPause() { document.getElementById('voile-pause').hidden = true; }

  function clavier(e, bas) {
    if (!S) return false;
    if (e.code === 'Escape') { if (bas) basculerPause(); return true; }
    const v = Reglages.touches().findIndex(k => k.code === e.code);
    if (v < 0) return false;
    if (bas) { if (!e.repeat) { S.tenues[v] = true; appui(v, e.timeStamp); } }
    else relache(v, e.timeStamp);
    return true;
  }

  /* ---------- dessin ---------- */
  function rect(x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function premierDepuis(L, t) {
    let lo = 0, hi = L.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (S.notes[L[m]].t < t) lo = m + 1; else hi = m; }
    return lo;
  }
  const mmss = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  function dessiner(t, dt) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { PW, lw, x0, yH, zoneGD, cx } = geo();
    // secondes de morceau visibles au-dessus de la ligne (× vitesse : les notes défilent toujours au même rythme à l'écran)
    const vue = 1.6 / Reglages.d.vitesse * S.rate;
    const Y = tn => yH - (tn - t) / vue * yH;
    const now = performance.now();
    const niv = Son.niveau();
    const montrerNotes = S.mode !== 'solo';

    // fond
    g.fillStyle = '#06060d'; g.fillRect(0, 0, W, H);
    const halo = g.createRadialGradient(cx, yH, 10, cx, yH, Math.max(W, H) * 0.8);
    halo.addColorStop(0, 'rgba(155,140,255,' + (0.07 + niv * 0.22) + ')');
    halo.addColorStop(1, 'rgba(6,6,13,0)');
    g.fillStyle = halo; g.fillRect(0, 0, W, H);

    // pistes
    for (let v = 0; v < S.K; v++) {
      const b = bandeDeVoie(v), x = x0 + v * lw;
      g.fillStyle = rgba(b, 0.045); g.fillRect(x, 0, lw, H);
      const k = Math.max(0, 1 - (now - S.appuis[v]) / 240) * (S.tenues[v] ? 1 : 0.85);
      if (k > 0 || S.tenues[v]) {
        const kk = Math.max(k, S.tenues[v] ? 0.35 : 0);
        const gr = g.createLinearGradient(0, yH, 0, yH - H * 0.45);
        gr.addColorStop(0, rgba(b, 0.38 * kk)); gr.addColorStop(1, rgba(b, 0));
        g.fillStyle = gr; g.fillRect(x, yH - H * 0.45, lw, H * 0.45);
      }
      const ke = Math.max(0, 1 - (now - S.erreurs[v]) / 320);
      if (ke > 0) {
        const gr = g.createLinearGradient(0, yH, 0, yH - H * 0.35);
        gr.addColorStop(0, 'rgba(255,77,109,' + 0.45 * ke + ')'); gr.addColorStop(1, 'rgba(255,77,109,0)');
        g.fillStyle = gr; g.fillRect(x, yH - H * 0.35, lw, H * 0.35);
      }
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x, 0, 1, H);
    }
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x0 + PW, 0, 1, H);

    // traînées : la durée pendant laquelle la note fait sonner sa partie, puis les notes
    if (montrerNotes) {
      for (let v = 0; v < S.K; v++) {
        const L = S.parVoie[v];
        const b = bandeDeVoie(v), cx = x0 + (v + 0.5) * lw;
        let i = Math.max(0, premierDepuis(L, t - 0.3) - 1);
        for (; i < L.length; i++) {
          const n = S.notes[L[i]];
          if (n.t > t + vue) break;
          const y1 = Math.min(yH, Y(n.t)), y2 = Math.max(0, Y(n.fin));
          if (y1 > y2 && n.fin > t - 0.05) {
            const larg = n.etat === 1 ? 10 : 6;
            g.fillStyle = n.etat === 1 ? rgba(b, 0.55) : n.etat === 2 ? 'rgba(120,115,140,.12)' : rgba(b, 0.17);
            g.fillRect(cx - larg / 2, y2, larg, y1 - y2);
          }
        }
        // corps des notes longues : à tenir jusqu'en haut du trait
        i = Math.max(0, premierDepuis(L, t - 3.5));
        for (; i < L.length; i++) {
          const n = S.notes[L[i]];
          if (n.t > t + vue + 0.1) break;
          if (!(n.duree > 0) || n.tenu === 1) continue;
          const fin = n.t + n.duree;
          if (fin < t - 0.3) continue;
          let ya = Y(n.t);
          const enCours = S.enTenue[v] === n;
          if (enCours) ya = Math.min(ya, yH);
          const yz = Math.max(-10, Y(fin));
          if (ya <= yz) continue;
          const larg = lw * 0.46, xb = cx - larg / 2;
          const perdue = n.etat === 2 || n.tenu === 2;
          const gr = g.createLinearGradient(0, yz, 0, ya);
          gr.addColorStop(0, perdue ? 'rgba(92,88,115,.25)' : rgba(b, enCours ? 0.75 : 0.35));
          gr.addColorStop(1, perdue ? 'rgba(92,88,115,.4)' : rgba(b, enCours ? 0.95 : 0.6));
          g.fillStyle = gr;
          rect(xb, yz, larg, ya - yz, 7); g.fill();
          g.strokeStyle = perdue ? 'rgba(140,135,160,.5)' : rgba(b, 1); g.lineWidth = 2; g.stroke();
          // bout de la note longue (moment où l'on peut lâcher)
          g.fillStyle = perdue ? 'rgba(140,135,160,.6)' : '#fff';
          g.fillRect(xb + 4, yz + 3, larg - 8, 3);
          if (enCours) { g.shadowColor = rgba(b, 1); g.shadowBlur = 24; g.fillStyle = rgba(b, 0.9); g.fillRect(xb, yH - 3, larg, 6); g.shadowBlur = 0; }
        }
        i = Math.max(0, premierDepuis(L, t - 0.4));
        for (; i < L.length; i++) {
          const n = S.notes[L[i]];
          if (n.t > t + vue + 0.1) break;
          if (n.etat === 1) continue;
          const y = Y(n.t);
          if (y > H + 20) continue;
          const x = x0 + v * lw + 7, w = lw - 14;
          if (n.etat === 2) {
            g.globalAlpha = Math.max(0, 1 - (y - yH) / 120) * 0.5;
            g.fillStyle = '#5c5873';
          } else {
            const gr = g.createLinearGradient(0, y - 12, 0, y + 12);
            gr.addColorStop(0, rgba(b, 1)); gr.addColorStop(1, rgba(b, 0.65));
            g.fillStyle = gr;
            g.shadowColor = rgba(b, 0.8); g.shadowBlur = 14;
          }
          rect(x, y - 12, w, 24, 8); g.fill();
          g.shadowBlur = 0; g.globalAlpha = 1;
          if (n.etat === 0) { g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x + 10, y - 7, w - 20, 3); }
        }
      }
    }

    // ligne de frappe + touches
    g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(x0, yH - 1, PW, 2);
    for (let v = 0; v < S.K; v++) {
      const b = bandeDeVoie(v), x = x0 + v * lw;
      const actif = S.tenues[v] || now - S.appuis[v] < 120;
      g.strokeStyle = rgba(b, actif ? 1 : 0.55); g.lineWidth = 2;
      rect(x + 7, yH - 13, lw - 14, 26, 8); g.stroke();
      if (actif) { g.fillStyle = rgba(b, 0.35); g.fill(); }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = actif ? '#fff' : 'rgba(255,255,255,.8)';
      g.font = '800 ' + Math.round(Math.max(11, Math.min(30, lw * 0.3))) + 'px Segoe UI, system-ui, sans-serif';
      g.fillText(Reglages.touches()[v].nom, x + lw / 2, yH + 42);
      g.fillStyle = rgba(b, 0.9);
      g.font = '600 ' + Math.round(Math.min(13, lw * 0.15)) + 'px Segoe UI, system-ui, sans-serif';
      if (lw >= 44) g.fillText(Analyse.nomBande(b, S.K), x + lw / 2, yH + 68);
    }

    // particules
    for (let i = S.parts.length - 1; i >= 0; i--) {
      const p = S.parts[i];
      p.vie -= dt; if (p.vie <= 0) { S.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt;
      g.fillStyle = rgba(p.b, Math.min(1, p.vie * 2));
      g.fillRect(p.x - 2, p.y - 2, 4, 4);
    }

    // mini-niveaux vaisseau
    if (zoneGD) Vaisseaux.dessiner(g, zoneGD, t - Reglages.d.decalage / 1000, S.rate, bandeDeVoie, Reglages.touches().map(k => k.nom), couleur);

    // en-tête
    const prog = Math.max(0, Math.min(1, (t - S.depart) / Math.max(1, S.fin - S.depart)));
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, W, 4);
    const gp = g.createLinearGradient(0, 0, W, 0);
    gp.addColorStop(0, '#5ee7ff'); gp.addColorStop(0.5, '#9b8cff'); gp.addColorStop(1, '#ff6fae');
    g.fillStyle = gp; g.fillRect(0, 0, W * prog, 4);
    g.textBaseline = 'top'; g.textAlign = 'left';
    g.fillStyle = '#fff'; g.font = '700 16px Segoe UI, system-ui, sans-serif';
    const m = S.opts.morceau;
    g.fillText(m.titre.length > 40 ? m.titre.slice(0, 39) + '…' : m.titre, 16, 16);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '13px Segoe UI, system-ui, sans-serif';
    const etiq = { entrainement: 'Entraînement', solo: 'Solo libre', ecoute: 'Écoute (démo)' }[S.mode] + ' · '
      + (S.style === 'couches' ? 'Couches' : 'Mélodie') + ' · ' + Analyse.DIFFS[S.opts.diff].nom
      + (S.rate !== 1 ? ' · ' + Math.round(S.rate * 100) + ' %' : '') + ' · ' + S.K + (S.K > 1 ? ' touches' : ' touche')
      + (S.relachement ? '' : ' · sans relâchement');
    g.fillText(etiq + '   ' + mmss(t) + ' / ' + mmss(S.opts.partition.duree), 16, 38);

    if (S.mode === 'entrainement') {
      g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = '800 26px Segoe UI, system-ui, sans-serif';
      g.fillText(S.score.toLocaleString('fr-FR'), W - 70, 14);
      g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '13px Segoe UI, system-ui, sans-serif';
      const prec = S.accN ? (S.accSum / S.accN * 100).toFixed(1) : '100.0';
      g.fillText('Précision ' + prec + ' %', W - 70, 46);
    }
    if (S.mode === 'solo') {
      g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.35)'; g.font = '14px Segoe UI, system-ui, sans-serif';
      g.fillText(S.style === 'couches'
        ? 'Joue librement : chaque touche fait sonner sa partie du morceau'
        : 'Joue à l\'oreille : seule la bonne touche fait sonner le passage', cx, 70);
    }

    // combo
    if (S.combo >= 5 && S.mode !== 'solo') {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(255,255,255,.13)'; g.font = '900 ' + Math.round(Math.min(110, PW * 0.22)) + 'px Segoe UI, system-ui, sans-serif';
      g.fillText(S.combo, cx, H * 0.36);
      g.font = '700 15px Segoe UI, system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.3)';
      g.fillText('COMBO', cx, H * 0.36 + Math.min(62, PW * 0.12));
    }
    // jugement
    if (S.jug) {
      const age = (now - S.jug.a) / 1000;
      if (age < 0.6) {
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.globalAlpha = 1 - age / 0.6;
        g.fillStyle = S.jug.coul;
        g.font = '800 ' + Math.round(30 + 8 * Math.max(0, 0.15 - age) / 0.15) + 'px Segoe UI, system-ui, sans-serif';
        g.fillText(S.jug.txt, cx, yH - 110 - age * 30);
        g.globalAlpha = 1;
      }
    }
    // compte à rebours / reprise
    let rebours = null;
    if (S.pause && S.reprise) rebours = 'Prêt…';
    else if (!S.pause && t < S.depart) rebours = String(Math.ceil((S.depart - t) / S.rate));
    if (rebours) {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#fff'; g.font = '900 72px Segoe UI, system-ui, sans-serif';
      g.fillText(rebours, cx, H * 0.42);
    }
  }

  return {
    init, lancer, arreter, clavier, basculerPause,
    get enCours() { return !!S; },
    get etat() { return S; },
    _cadre: cadre, // tests automatiques (onglet caché = pas d'animation)
  };
})();
