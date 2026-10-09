'use strict';
/* Interface : bibliothèque, import (fichier / Spotify), écran du morceau, réglages, résultats. */

const UI = (() => {
  const $ = id => document.getElementById(id);
  const COULEURS = ['#5ee7ff', '#9b8cff', '#ff6fae', '#ffb341'];
  const cache = new Map(); // id → { tampon, analyse } (2 morceaux max en mémoire)
  let etire = null;        // dernière version ralentie préparée : { id, rate, tampon }
  let courant = null;      // { morceau, tampon, analyse, depart }
  let dernierResultat = null;

  const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const nouvelId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const echapper = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function toast(txt, ms) {
    const t = $('toast');
    t.textContent = txt; t.classList.add('vu');
    clearTimeout(toast.m); toast.m = setTimeout(() => t.classList.remove('vu'), ms || 3200);
  }
  function chargement(txt, p) {
    $('voile-chargement').hidden = txt == null;
    if (txt != null) { $('ch-texte').textContent = txt; $('ch-barre').style.width = Math.round((p || 0) * 100) + '%'; }
  }

  /* ---------- navigation ---------- */
  let ecranActif = 'biblio';
  function aller(nom) {
    if (ecranActif === 'jeu' && nom !== 'jeu') Jeu.arreter();
    if (ecranActif === 'spotify' && nom !== 'spotify') quitterSpotify();
    document.querySelectorAll('.ecran').forEach(e => e.classList.toggle('actif', e.id === 'ecran-' + nom));
    ecranActif = nom;
    if (nom === 'biblio') afficherBiblio();
    if (nom === 'morceau') majMorceau();
    window.scrollTo(0, 0);
  }

  function pochette(el, m) {
    el.style.backgroundImage = m.pochette ? 'url("' + m.pochette + '")' : '';
    el.textContent = m.pochette ? '' : (m.titre || '?').trim().charAt(0).toUpperCase();
    if (!m.pochette) {
      let h = 0; for (const c of m.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      const a = COULEURS[h % 4], b = COULEURS[(h >> 3) % 4 === h % 4 ? (h + 1) % 4 : (h >> 3) % 4];
      el.style.background = 'linear-gradient(135deg,' + a + ',' + b + ')';
    } else el.style.background = '';
    if (m.pochette) el.style.backgroundImage = 'url("' + m.pochette + '")';
  }

  /* ---------- bibliothèque ---------- */
  async function afficherBiblio() {
    const liste = $('liste');
    let morceaux = [];
    try { morceaux = await Stock.tous(); } catch (e) { toast('Stockage local indisponible dans ce navigateur.'); }
    morceaux.sort((a, b) => (b.joueLe || b.cree) - (a.joueLe || a.cree));
    liste.innerHTML = '';
    $('liste-vide').hidden = morceaux.length > 0;
    for (const m of morceaux) {
      const b = document.createElement('button');
      b.className = 'morceau';
      b.innerHTML = '<div class="pochette"></div><b>' + echapper(m.titre) + '</b><small>'
        + echapper(m.artiste || (m.source === 'spotify' ? 'Spotify' : 'Fichier importé')) + ' · ' + mmss(m.duree) + '</small>';
      pochette(b.querySelector('.pochette'), m);
      const note = Records.meilleureNote(m.id);
      if (note) { const s = document.createElement('span'); s.className = 'badge'; s.textContent = note; b.appendChild(s); }
      b.onclick = () => ouvrir(m.id);
      liste.appendChild(b);
    }
  }

  /* ---------- import ---------- */
  function nomDepuisFichier(nom) {
    const base = nom.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
    const i = base.indexOf(' - ');
    return i > 0 ? { artiste: base.slice(0, i).trim(), titre: base.slice(i + 3).trim() } : { artiste: '', titre: base };
  }

  // Ajoute un morceau à la bibliothèque : décodage, analyse, sauvegarde, puis ouverture
  async function importer(blob, infos, trim) {
    chargement('Lecture du son…', 0.02);
    try {
      await Son.reveiller();
      let tampon;
      try { tampon = await Son.contexte().decodeAudioData(await blob.arrayBuffer()); }
      catch (e) { chargement(null); toast('Ce fichier ne contient pas de son lisible.'); return null; }
      if (trim === 'auto') trim = blancs(tampon);
      if (trim) tampon = Son.decouper(tampon, trim[0], trim[1]);
      if (tampon.duration < 3) { chargement(null); toast('Morceau trop court (moins de 3 secondes).'); return null; }
      const id = nouvelId();
      chargement('Analyse de la musique…', 0.05);
      const an = await Analyse.analyser(tampon, p => chargement('Analyse de la musique… ' + Math.round(p * 100) + ' %', p));
      an.id = id;
      const m = Object.assign({ id, cree: Date.now(), duree: tampon.duration, blob, trim: trim || null }, infos);
      await Stock.enregistrer(m);
      await Stock.enregistrerAnalyse(an);
      memoriser(id, { tampon, analyse: an });
      chargement(null);
      return m;
    } catch (e) {
      console.error(e);
      chargement(null);
      toast('Erreur pendant l\'import : ' + (e && e.message || e));
      return null;
    }
  }

  async function importerFichiers(fichiers) {
    let dernier = null;
    for (const f of fichiers) {
      if (!/^(audio|video)\//.test(f.type) && !/\.(mp3|wav|ogg|oga|opus|m4a|aac|flac|webm|mp4|weba)$/i.test(f.name)) {
        toast('« ' + f.name + ' » n\'est pas un fichier audio.'); continue;
      }
      const m = await importer(new Blob([f], { type: f.type }), Object.assign({ source: 'fichier', pochette: '' }, nomDepuisFichier(f.name)));
      if (m) dernier = m;
    }
    if (dernier) { toast('« ' + dernier.titre + ' » ajouté à ta bibliothèque !'); ouvrir(dernier.id); }
    else if (ecranActif === 'biblio') afficherBiblio();
  }

  // Début / fin du son (pour couper les silences d'un enregistrement)
  function blancs(tampon) {
    const sr = tampon.sampleRate, d = tampon.getChannelData(0), d2 = tampon.numberOfChannels > 1 ? tampon.getChannelData(1) : d;
    const bloc = Math.round(sr * 0.02), seuil = 0.001; // très bas : on ne coupe que le vrai silence
    let a = 0, z = tampon.length;
    const fort = i => { for (let j = i; j < Math.min(tampon.length, i + bloc); j++) if (Math.abs(d[j]) > seuil || Math.abs(d2[j]) > seuil) return true; return false; };
    while (a < tampon.length && !fort(a)) a += bloc;
    while (z > a && !fort(Math.max(0, z - bloc))) z -= bloc;
    return [Math.max(0, a / sr - 0.2), Math.min(tampon.duration, z / sr + 0.5)];
  }

  function memoriser(id, v) {
    cache.delete(id); cache.set(id, v);
    while (cache.size > 2) cache.delete(cache.keys().next().value);
  }

  async function charger(id) {
    if (cache.has(id)) { const c = cache.get(id); memoriser(id, c); return c; }
    const m = await Stock.morceau(id);
    if (!m) throw new Error('Morceau introuvable');
    chargement('Chargement du morceau…', 0.1);
    await Son.reveiller();
    let tampon = await Son.contexte().decodeAudioData(await m.blob.arrayBuffer());
    if (m.trim) tampon = Son.decouper(tampon, m.trim[0], m.trim[1]);
    let an = await Stock.analyse(id);
    if (!an || an.v !== Analyse.VERSION) {
      an = await Analyse.analyser(tampon, p => chargement('Analyse de la musique… ' + Math.round(p * 100) + ' %', p));
      an.id = id;
      await Stock.enregistrerAnalyse(an);
    }
    chargement(null);
    const c = { tampon, analyse: an };
    memoriser(id, c);
    return c;
  }

  /* ---------- écran du morceau ---------- */
  async function ouvrir(id) {
    try {
      const m = await Stock.morceau(id);
      const c = await charger(id);
      courant = { morceau: m, tampon: c.tampon, analyse: c.analyse, depart: 0 };
      aller('morceau');
    } catch (e) {
      console.error(e);
      chargement(null);
      toast('Impossible d\'ouvrir ce morceau.');
    }
  }

  function partitionCourante() {
    const d = Reglages.d;
    return Analyse.partition(courant.analyse, d.style, d.diff, d.aiguGauche, d.nbTouches);
  }

  const AIDES_MODE = {
    entrainement: 'Les notes descendent : appuie sur la bonne touche quand elles touchent la ligne. Score, précision et records.',
    solo: 'Pas de notes à l\'écran ni de score : tu joues le morceau librement, de mémoire ou à l\'oreille.',
    ecoute: 'L\'ordinateur joue parfaitement la partition : écoute et regarde avant de t\'entraîner.',
  };
  const AIDES_STYLE = {
    couches: 'Le morceau est découpé en un son par touche, qui jouent en même temps : chaque touche fait sonner sa couche (aigu → grave) jusqu\'à sa note suivante.',
    melodie: 'Une seule suite de notes, comme un piano : chaque note fait sonner tout le morceau, et la touche dépend de la hauteur du passage (aigu à gauche).',
  };

  function majMorceau() {
    if (!courant) return;
    const m = courant.morceau, d = Reglages.d;
    pochette($('m-pochette'), m);
    $('m-titre').value = m.titre;
    $('m-artiste').value = m.artiste || '';
    $('m-duree').textContent = '⏱ ' + mmss(courant.tampon.duration);
    $('m-source').textContent = m.source === 'spotify' ? '🟢 Enregistré depuis Spotify' : '📁 Fichier importé';
    document.querySelectorAll('#ecran-morceau .segm').forEach(s => {
      const cle = s.dataset.opt;
      s.querySelectorAll('button').forEach(b => b.classList.toggle('on', cle === 'rate' ? Math.abs(d.rate - Number(b.dataset.v)) < 0.001 : String(d[cle]) === b.dataset.v));
    });
    $('aide-mode').textContent = AIDES_MODE[d.mode];
    $('aide-style').textContent = AIDES_STYLE[d.style];
    $('aide-touches').textContent = d.nbTouches === 1
      ? 'Une seule touche : elle joue tout le morceau.'
      : 'Le morceau est partagé en ' + d.nbTouches + ' sons, du plus aigu (' + Analyse.nomBande(0, d.nbTouches).toLowerCase() + ') au plus grave. Touches : '
        + Reglages.touches().map(k => k.nom).join(' ') + ' (modifiables dans ⚙).';
    $('aide-relachement').textContent = d.relachement
      ? 'Les sons tenus deviennent des notes longues : il faut tenir la touche jusqu\'au bout (et le vaisseau monte tant que la touche est tenue).'
      : 'Toutes les notes sont de simples appuis : le moment où tu lâches la touche ne compte pas (le vaisseau fait un saut à chaque appui).';
    const p = partitionCourante();
    const parVoie = new Array(d.nbTouches).fill(0);
    p.notes.forEach(n => parVoie[n.voie]++);
    const longues = d.relachement ? p.notes.filter(n => n.duree > 0).length : 0;
    $('m-stats').textContent = p.notes.length + ' notes' + (longues ? ' (dont ' + longues + ' longues à tenir)' : '') + ' · ' + (p.notes.length / courant.tampon.duration).toFixed(1).replace('.', ',')
      + ' notes/s · par touche : ' + (d.nbTouches <= 8
        ? parVoie.map((n, v) => Reglages.touches()[v].nom + ' ' + n).join(', ')
        : 'de ' + Math.min(...parVoie) + ' à ' + Math.max(...parVoie));
    $('m-touches').value = d.nbTouches;
    $('m-touches-v').textContent = d.nbTouches + (d.nbTouches > 1 ? ' touches' : ' touche');
    $('m-rate').value = d.rate;
    $('m-rate-v').textContent = Math.round(d.rate * 100) + ' %';
    $('m-depart').textContent = mmss(courant.depart);
    $('m-depart-zero').hidden = courant.depart === 0;
    $('btn-jouer').textContent = d.mode === 'ecoute' ? '👂 Écouter' : d.mode === 'solo' ? '🎹 Jouer en solo' : '▶ Jouer';
    // records
    const r = $('m-records');
    r.innerHTML = '';
    const variante = Records.variante(d.nbTouches, d.relachement);
    for (const st of ['couches', 'melodie']) for (const df of Object.keys(Analyse.DIFFS)) {
      const rec = Records.lire(m.id, st, df, variante);
      if (!rec) continue;
      const s = document.createElement('span');
      s.innerHTML = (st === 'couches' ? 'Couches' : 'Mélodie') + ' ' + Analyse.DIFFS[df].nom + ' : <b>' + rec.note + '</b> · '
        + rec.score.toLocaleString('fr-FR') + ' pts · ' + rec.precision.toFixed(1).replace('.', ',') + ' %';
      r.appendChild(s);
    }
    dessinerApercu(p);
  }

  function dessinerApercu(p) {
    const cv = $('apercu'), an = courant.analyse;
    cv.style.height = Math.max(120, Reglages.d.nbTouches * 9) + 'px';
    const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    if (!W) return;
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const K = Reglages.d.nbTouches, bk = Analyse.bandes(an, K);
    const D = an.duree, hl = H / K;
    // énergie de chaque bande (une ligne par touche, dans l'ordre des touches)
    for (let v = 0; v < K; v++) {
      const b = Analyse.voieDe(v, Reglages.d.aiguGauche, K), e = bk.energie[b], ref = bk.ref[b];
      g.fillStyle = Analyse.couleur(b, K);
      const pas = e.length / W;
      for (let x = 0; x < W; x++) {
        let m = -200;
        for (let i = Math.floor(x * pas); i < Math.min(e.length, Math.floor((x + 1) * pas)); i++) if (e[i] > m) m = e[i];
        const k = Math.max(0, Math.min(1, (m - (ref - 35)) / 38));
        if (k <= 0) continue;
        g.globalAlpha = 0.25 + 0.55 * k;
        const hh = (hl - Math.min(4, hl * 0.15)) * k;
        g.fillRect(x, v * hl + (hl - hh) / 2, 1, hh);
      }
    }
    g.globalAlpha = 1;
    // notes de la partition
    g.fillStyle = 'rgba(255,255,255,.75)';
    for (const n of p.notes) g.fillRect(Math.floor(n.t / D * W), n.voie * hl + hl / 2 - 1, 1.5, 2);
    // zone ignorée + curseur de départ
    if (courant.depart > 0) {
      const x = courant.depart / D * W;
      g.fillStyle = 'rgba(6,6,13,.6)'; g.fillRect(0, 0, x, H);
      g.fillStyle = '#fff'; g.fillRect(x - 1, 0, 2, H);
    }
  }

  function choisirDepart(e) {
    if (!courant) return;
    const r = $('apercu').getBoundingClientRect();
    const k = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    let t = k * courant.analyse.duree;
    t = t < 2 ? 0 : Math.min(courant.analyse.duree - 5, Math.floor(t * 2) / 2);
    courant.depart = Math.max(0, t);
    majMorceau();
  }

  async function jouer() {
    if (!courant) return;
    await Son.reveiller();
    const d = Reglages.d;
    const rate = Number(d.rate);
    // version ralentie sans changer la hauteur (préparée une fois, gardée pour « Rejouer »)
    if (rate !== 1 && !(etire && etire.id === courant.morceau.id && etire.rate === rate)) {
      etire = null;
      const quoi = rate < 1 ? 'Ralentissement' : 'Accélération';
      chargement(quoi + ' à ' + Math.round(rate * 100) + ' %…', 0);
      const t = await Son.etirer(courant.tampon, rate, p => chargement(quoi + ' à ' + Math.round(rate * 100) + ' %… ' + Math.round(p * 100) + ' %', p));
      chargement(null);
      etire = { id: courant.morceau.id, rate, tampon: t };
    }
    const o = {
      morceau: courant.morceau, tampon: courant.tampon, partition: partitionCourante(),
      etire: rate !== 1 ? etire.tampon : null,
      relachement: d.relachement,
      mode: d.mode, style: d.style, diff: d.diff, rate: Number(d.rate), depart: courant.depart, guide: Number(d.guide),
    };
    if (!o.partition.notes.some(n => n.t >= o.depart)) { toast('Aucune note après ce point de départ.'); return; }
    courant.morceau.joueLe = Date.now();
    Stock.enregistrer(courant.morceau).catch(() => {});
    aller('jeu');
    Jeu.lancer(o);
  }

  /* ---------- résultats ---------- */
  function finPartie(r) {
    dernierResultat = r;
    const o = r.opts;
    if (r.mode === 'ecoute') { aller('morceau'); toast('Démo terminée : à toi de jouer !'); return; }
    $('r-titre').textContent = o.morceau.titre;
    $('r-sous').textContent = (r.mode === 'solo' ? 'Solo libre' : 'Entraînement') + ' · '
      + (o.style === 'couches' ? 'Couches' : 'Mélodie') + ' · ' + Analyse.DIFFS[o.diff].nom
      + (o.rate !== 1 ? ' · vitesse ' + Math.round(o.rate * 100) + ' %' : '')
      + ' · ' + o.partition.K + (o.partition.K > 1 ? ' touches' : ' touche') + (o.relachement === false ? ' · sans relâchement' : '')
      + (o.depart > 0 ? ' · depuis ' + mmss(o.depart) : '');
    const grille = $('r-grille');
    const cases = [];
    if (r.mode === 'entrainement') {
      $('r-note').textContent = r.note;
      cases.push([r.score.toLocaleString('fr-FR'), 'Score'], [r.precision.toFixed(1).replace('.', ',') + ' %', 'Précision'],
        [r.repro.toFixed(0) + ' %', 'Musique jouée'], [r.maxCombo, 'Combo max'],
        [r.cpt.parfait, 'Parfait'], [r.cpt.super, 'Super'], [r.cpt.bien, 'Bien'], [r.cpt.rate, 'Ratés'], [r.cpt.fausse, 'Fausses notes'],
        [r.crashs, 'Crashs de vaisseau']);
      if (r.crashs == null) cases.pop();
      if (r.nbLongues) cases.splice(4, 0, [r.cpt.tenu + ' / ' + r.nbLongues, 'Notes longues tenues']);
    } else {
      $('r-note').textContent = r.repro.toFixed(0) + ' %';
      cases.push([r.repro.toFixed(0) + ' %', 'Musique jouée'], [r.cpt.fausse, 'Fausses notes']);
      if (r.crashs != null) cases.push([r.crashs, 'Crashs de vaisseau']);
    }
    grille.innerHTML = cases.map(([v, l]) => '<div><b>' + v + '</b><small>' + l + '</small></div>').join('');
    let txt = '';
    if (r.mode === 'entrainement') {
      if (o.depart > 0 || o.rate !== 1) txt = 'Passage ou vitesse modifiée : pas de record (entraînement).';
      else if (Records.proposer(o.morceau.id, o.style, o.diff, Records.variante(o.partition.K, o.relachement),
        { score: r.score, precision: r.precision, note: r.note })) txt = '★ Nouveau record !';
    }
    $('r-record').textContent = txt;
    aller('resultats');
  }

  /* ---------- réglages ---------- */
  let attenteTouche = -1;
  const nomTouche = e => {
    const noms = { Space: 'Espace', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', ShiftLeft: 'Maj G', ShiftRight: 'Maj D',
      ControlLeft: 'Ctrl G', ControlRight: 'Ctrl D', Enter: 'Entrée', Semicolon: e.key, Comma: e.key };
    if (noms[e.code]) return noms[e.code];
    return e.key && e.key.length === 1 ? e.key.toUpperCase() : e.code.replace(/^(Key|Digit|Numpad)/, '');
  };
  function majReglages() {
    const d = Reglages.d, t = $('rg-touches'), K = d.nbTouches;
    t.innerHTML = '';
    t.style.gridTemplateColumns = 'repeat(' + (K <= 4 ? K : K <= 8 ? 4 : 8) + ',1fr)';
    $('rg-touches-nb').textContent = '(' + K + (K > 1 ? ' touches' : ' touche') + ' — à changer sur l\'écran du morceau)';
    Reglages.touches().forEach((k, v) => {
      const b = Analyse.voieDe(v, d.aiguGauche, K);
      const el = document.createElement('button');
      el.className = 'touche' + (attenteTouche === v ? ' attente' : '');
      el.style.borderColor = attenteTouche === v ? '' : Analyse.couleur(b, K);
      el.innerHTML = '<b>' + (attenteTouche === v ? '…' : echapper(k.nom)) + '</b><small>' + Analyse.nomBande(b, K) + '</small>';
      el.onclick = () => { attenteTouche = attenteTouche === v ? -1 : v; majReglages(); };
      t.appendChild(el);
    });
    document.querySelectorAll('[data-reglage="aiguGauche"] button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === d.aiguGauche));
    $('rg-vitesse').value = d.vitesse; $('rg-vitesse-v').textContent = '×' + Number(d.vitesse).toFixed(1).replace('.', ',');
    $('rg-decalage').value = d.decalage; $('rg-decalage-v').textContent = (d.decalage > 0 ? '+' : '') + d.decalage + ' ms';
    $('rg-volume').value = d.volume; $('rg-volume-v').textContent = Math.round(d.volume * 100) + ' %';
  }
  function ouvrirReglages() { attenteTouche = -1; majReglages(); $('modal-reglages').hidden = false; }
  function fermerReglages() {
    attenteTouche = -1; $('modal-reglages').hidden = true; Reglages.sauver();
    if (ecranActif === 'morceau') majMorceau();
  }
  function capterTouche(e) {
    if (attenteTouche < 0) return false;
    e.preventDefault();
    if (e.code === 'Escape') { attenteTouche = -1; majReglages(); return true; }
    const t = Reglages.touches(), nouv = { code: e.code, nom: nomTouche(e), auto: false };
    Reglages.d.touchesK[Reglages.d.nbTouches] = t;
    const deja = t.findIndex(k => k.code === e.code);
    if (deja >= 0 && deja !== attenteTouche) t[deja] = t[attenteTouche]; // échange
    t[attenteTouche] = nouv;
    attenteTouche = -1;
    Reglages.sauver(); majReglages();
    return true;
  }

  /* ---------- Spotify ---------- */
  let sp = { lien: null, infos: null, rec: null };
  function quitterSpotify() {
    if (sp.rec) { sp.rec.annuler(); sp.rec = null; }
    $('sp-bloc-encours').hidden = true;
  }
  // « 3:32 », « 3.32 », « 212 » → secondes (null si vide ou illisible)
  function lireDuree(txt) {
    const s = (txt || '').trim().replace(/[.,h]/g, ':');
    if (!s) return null;
    const p = s.split(':').map(Number);
    if (p.some(isNaN)) return null;
    const sec = p.length === 1 ? p[0] : p.length === 2 ? p[0] * 60 + p[1] : p[0] * 3600 + p[1] * 60 + p[2];
    return sec >= 5 && sec < 3 * 3600 ? sec : null;
  }
  async function chargerLienSpotify() {
    const txt = $('sp-lien').value;
    $('sp-erreur').textContent = '';
    const l = Spotify.lireLien(txt);
    if (!l) {
      $('sp-erreur').textContent = Spotify.estLienCourt(txt)
        ? 'Lien court : ouvre-le dans ton navigateur puis copie l’adresse complète (open.spotify.com/track/…).'
        : 'Ce n’est pas un lien Spotify reconnu (exemple : https://open.spotify.com/track/…).';
      return;
    }
    sp.lien = l;
    $('sp-bloc-lecteur').hidden = false;
    $('sp-bloc-rec').hidden = false;
    $('sp-ouvrir').href = 'https://open.spotify.com/' + l.type + '/' + l.id;
    $('sp-ouvrir-appli').href = 'spotify:' + l.type + ':' + l.id;
    $('sp-titre').value = ''; $('sp-artiste').value = ''; $('sp-duree').value = '';
    pochette($('sp-pochette'), { id: l.id, titre: '♪', pochette: '' });
    const inf = await Spotify.infos(l);
    sp.infos = inf;
    if (inf && sp.lien === l) {
      $('sp-titre').value = inf.titre;
      pochette($('sp-pochette'), { id: l.id, titre: inf.titre, pochette: inf.pochette });
    }
    if (!$('sp-titre').value) $('sp-titre').placeholder = 'Titre (à remplir)';
  }

  async function lancerEnregistrement() {
    const duree = lireDuree($('sp-duree').value);
    if ($('sp-duree').value.trim() && !duree) { toast('Durée illisible : écris-la comme dans Spotify, par exemple 3:32.'); return; }
    await Son.reveiller();
    let flux;
    try { flux = await Spotify.capturer(false); }
    catch (e) {
      const msg = e && e.message === 'pasDeSon'
        ? 'Aucun son partagé : recommence et coche bien « Partager aussi l’audio ».'
        : e && e.message === 'nonSupporte'
          ? 'Ce navigateur ne sait pas enregistrer le son. Utilise Chrome ou Edge sur ordinateur.'
          : e && e.name === 'NotAllowedError' ? 'Enregistrement annulé.' : 'Impossible de démarrer l’enregistrement.';
      toast(msg, 5000);
      return;
    }
    $('sp-bloc-encours').hidden = false;
    $('sp-avance-boite').hidden = !duree;
    $('sp-avance').style.width = '0%';
    $('sp-bloc-encours').scrollIntoView({ behavior: 'smooth', block: 'center' });
    sp.rec = Spotify.enregistrer(flux, {
      duree,
      niveau: v => { $('sp-vu').style.width = Math.round(v * 100) + '%'; },
      etat: txt => { $('sp-etat').textContent = txt; },
      temps: s => {
        $('sp-temps').textContent = mmss(s) + (duree ? ' / ' + mmss(duree) : '');
        if (duree) $('sp-avance').style.width = Math.min(100, s / duree * 100) + '%';
      },
      fini: async blob => {
        sp.rec = null;
        $('sp-bloc-encours').hidden = true;
        if (!blob) return;
        let tampon = null;
        try { tampon = await Son.contexte().decodeAudioData(await blob.arrayBuffer()); } catch (e) { /* rien */ }
        if (!tampon) { toast('L’enregistrement est illisible, recommence.'); return; }
        let [a, z] = blancs(tampon);
        if (duree) z = Math.min(z, a + duree + 0.6); // pile la durée du titre : pas de morceau suivant
        const son = z - a;
        let alerte = '';
        if (duree && son < duree - 3) alerte = 'Il manque la fin : ' + mmss(son) + ' enregistrées sur ' + mmss(duree) + '.';
        else if (!duree && son < 33) alerte = 'Seulement ' + Math.round(son) + ' secondes enregistrées : c’est sûrement un extrait, pas le morceau entier.';
        if (alerte && !confirm(alerte + '\n\nPour avoir toute la musique : lance le titre depuis le début dans l’appli ou sur le site Spotify et laisse-le jouer jusqu’au bout.\n\nImporter quand même ?')) return;
        const infos = {
          source: 'spotify',
          titre: $('sp-titre').value.trim() || (sp.infos && sp.infos.titre) || 'Titre Spotify',
          artiste: $('sp-artiste').value.trim(),
          pochette: (sp.infos && sp.infos.pochette) || '',
          spotify: sp.lien ? sp.lien.type + ':' + sp.lien.id : '',
        };
        const m = await importer(blob, infos, [a, z]);
        if (m) { toast('« ' + m.titre + ' » ajouté à ta bibliothèque (' + mmss(m.duree) + ') !'); quitterSpotify(); ouvrir(m.id); }
      },
    });
  }

  /* ---------- démarrage ---------- */
  function init() {
    Jeu.init($('jeu'), { fin: finPartie, quitter: () => aller('morceau') });

    document.addEventListener('click', e => {
      const a = e.target.closest('[data-aller]');
      if (a) { aller(a.dataset.aller); return; }
      if (e.target.closest('[data-action="reglages"]')) ouvrirReglages();
    });

    $('btn-fichier').onclick = () => $('input-fichier').click();
    $('input-fichier').onchange = e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) importerFichiers(f); };

    // glisser-déposer partout
    let prof = 0;
    addEventListener('dragenter', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { prof++; $('glisser').hidden = false; } });
    addEventListener('dragleave', () => { prof = Math.max(0, prof - 1); if (!prof) $('glisser').hidden = true; });
    addEventListener('dragover', e => e.preventDefault());
    addEventListener('drop', e => {
      e.preventDefault(); prof = 0; $('glisser').hidden = true;
      if (ecranActif === 'jeu') return;
      const f = [...(e.dataTransfer.files || [])];
      if (f.length) importerFichiers(f);
    });

    // écran du morceau
    document.querySelectorAll('#ecran-morceau .segm').forEach(s => s.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const cle = s.dataset.opt;
      Reglages.d[cle] = (cle === 'rate' || cle === 'guide' || cle === 'nbTouches') ? Number(b.dataset.v)
        : (cle === 'son' || cle === 'vaisseaux' || cle === 'relachement') ? b.dataset.v === 'true' : b.dataset.v;
      if (cle === 'son') Son.volume(Reglages.d.volume);
      Reglages.sauver(); majMorceau();
    }));
    $('apercu').addEventListener('click', choisirDepart);
    $('m-depart-zero').onclick = () => { courant.depart = 0; majMorceau(); };
    const fixerTouches = k => { Reglages.d.nbTouches = Math.max(1, Math.min(Analyse.MAX_TOUCHES, Math.round(k))); Reglages.sauver(); majMorceau(); };
    $('m-touches').oninput = e => fixerTouches(Number(e.target.value));
    $('m-touches-moins').onclick = () => fixerTouches(Reglages.d.nbTouches - 1);
    $('m-touches-plus').onclick = () => fixerTouches(Reglages.d.nbTouches + 1);
    const fixerVitesse = v => { Reglages.d.rate = Math.round(Math.max(0.25, Math.min(2, v)) * 20) / 20; Reglages.sauver(); majMorceau(); };
    $('m-rate').oninput = e => fixerVitesse(Number(e.target.value));
    $('m-rate-moins').onclick = () => fixerVitesse(Reglages.d.rate - 0.05);
    $('m-rate-plus').onclick = () => fixerVitesse(Reglages.d.rate + 0.05);
    $('btn-jouer').onclick = jouer;
    const renommer = () => {
      if (!courant) return;
      courant.morceau.titre = $('m-titre').value.trim() || courant.morceau.titre;
      courant.morceau.artiste = $('m-artiste').value.trim();
      Stock.enregistrer(courant.morceau).catch(() => {});
      pochette($('m-pochette'), courant.morceau);
    };
    $('m-titre').addEventListener('change', renommer);
    $('m-artiste').addEventListener('change', renommer);
    [$('m-titre'), $('m-artiste')].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') i.blur(); }));
    $('m-supprimer').onclick = async () => {
      if (!courant || !confirm('Supprimer « ' + courant.morceau.titre + ' » de ta bibliothèque ?')) return;
      await Stock.supprimer(courant.morceau.id);
      Records.supprimer(courant.morceau.id);
      cache.delete(courant.morceau.id);
      courant = null;
      aller('biblio');
    };
    addEventListener('resize', () => { if (ecranActif === 'morceau' && courant) dessinerApercu(partitionCourante()); });

    // résultats
    $('r-rejouer').onclick = () => { if (dernierResultat) { aller('jeu'); Jeu.lancer(dernierResultat.opts); } };
    $('r-morceau').onclick = () => aller('morceau');

    // réglages
    $('rg-fermer').onclick = fermerReglages;
    $('modal-reglages').addEventListener('click', e => { if (e.target.id === 'modal-reglages') fermerReglages(); });
    $('rg-defaut').onclick = () => { Reglages.reinitialiser(); Son.volume(Reglages.d.volume); majReglages(); };
    document.querySelector('[data-reglage="aiguGauche"]').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      Reglages.d.aiguGauche = b.dataset.v === '1'; Reglages.sauver(); majReglages();
    });
    $('rg-vitesse').oninput = e => { Reglages.d.vitesse = Number(e.target.value); majReglages(); };
    $('rg-decalage').oninput = e => { Reglages.d.decalage = Number(e.target.value); majReglages(); };
    $('rg-volume').oninput = e => { Reglages.d.volume = Number(e.target.value); Son.volume(Reglages.d.volume); majReglages(); };

    // Spotify
    $('sp-ok').onclick = chargerLienSpotify;
    $('sp-lien').addEventListener('keydown', e => { if (e.key === 'Enter') chargerLienSpotify(); });
    $('sp-lien').addEventListener('paste', () => setTimeout(chargerLienSpotify, 0));
    $('sp-rec').onclick = lancerEnregistrement;
    $('sp-terminer').onclick = () => { if (sp.rec) sp.rec.arreter(); };
    $('sp-annuler').onclick = () => { if (sp.rec) { sp.rec.annuler(); sp.rec = null; } $('sp-bloc-encours').hidden = true; };

    // clavier
    addEventListener('keydown', e => {
      if (!$('modal-reglages').hidden) {
        if (capterTouche(e)) return;
        if (e.code === 'Escape') fermerReglages();
        return;
      }
      if (ecranActif === 'jeu') { if (Jeu.clavier(e, true)) e.preventDefault(); return; }
      if (ecranActif === 'resultats' && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); $('r-rejouer').click(); }
    });
    addEventListener('keyup', e => { if (ecranActif === 'jeu') Jeu.clavier(e, false); });

    afficherBiblio();
    nommerTouches().then(change => { if (change) { Reglages.sauver(); if (ecranActif === 'morceau') majMorceau(); } });
  }

  return { init, importerFichiers, importer, ouvrir, aller, get courant() { return courant; } };
})();

UI.init();
