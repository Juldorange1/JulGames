'use strict';
/* Moteur audio.
   - Des filtres « séparateurs » (Linkwitz-Riley 4e ordre, compensés en phase) découpent le morceau
     en autant de bandes que de touches (1 à 24, de l'aigu au grave). Toutes les bandes réunies = le
     morceau d'origine.
   - Chaque note réussie fait jouer SA bande (ou tout le morceau en style Mélodie) depuis l'instant
     de la note jusqu'à la note suivante. Pas de note réussie = silence.
   - Horloge : temps audio (précis) ; si l'audio est coupé (?muet) on bascule sur performance.now(). */

const Son = (() => {
  const ATTENUATION = 1; // à 100 %, le jeu est aussi fort que le morceau d'origine
  let ctx = null, sortie, analyseur, guideG, directe;
  let chaines = [];                   // entrée de la chaîne de filtres de chaque bande (0 = aigu)
  const chainesParK = {};             // chaînes déjà construites pour chaque nombre de touches
  const voix = {};                    // dernière voix en cours par bande ('mix' = morceau entier)
  let guideSrc = null;
  let h = null; // horloge de la partie

  function contexte() {
    if (!ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      ctx = new A({ latencyHint: 'interactive' });
      construire();
    }
    return ctx;
  }

  function filtre(type, f) {
    const b = ctx.createBiquadFilter();
    b.type = type; b.frequency.value = f;
    // passe-bas/haut : Q en dB dans Web Audio (−3,01 dB = Butterworth) ; passe-tout : Q linéaire
    b.Q.value = type === 'allpass' ? Math.SQRT1_2 : -3.0103;
    return b;
  }
  function serie(noeuds) { for (let i = 0; i < noeuds.length - 1; i++) noeuds[i].connect(noeuds[i + 1]); return noeuds; }

  function construire() {
    sortie = ctx.createGain();
    sortie.gain.value = Reglages.d.son === false ? 0 : Reglages.d.volume * ATTENUATION;
    sortie.connect(ctx.destination);
    analyseur = ctx.createAnalyser();
    analyseur.fftSize = 512;
    sortie.connect(analyseur);
    // le morceau entier et le guide passent par le même retard que les bandes (voir bandes())
    retardNoeud = ctx.createDelay(0.5); retardNoeud.connect(sortie);
    guideG = ctx.createGain(); guideG.gain.value = 0; guideG.connect(retardNoeud);
    directe = ctx.createGain(); directe.connect(retardNoeud);
    bandes(4);
  }

  /* Filtres pour K bandes, de deux façons selon le nombre de touches :
     - jusqu'à 8 : filtres Linkwitz-Riley en cascade. Coupures c1 < c2 < … (du grave vers l'aigu) ; bande j
       (j = 0 la plus grave) : passe-haut à c1…cj, passe-bas à c(j+1), puis passe-tout aux coupures au-dessus.
       La somme des bandes se simplifie en un simple passe-tout : on retrouve le morceau tel quel, sans retard.
     - au-delà : bandes trop serrées pour ces filtres. On utilise des filtres à réponse impulsionnelle finie
       (convolution) complémentaires : leur somme est exactement le morceau, mais retardé de RIF_N/2
       échantillons. Ce retard (~43 ms) est appliqué partout (morceau entier, guide) et retiré de l'horloge. */
  const RIF_N = 4097;
  let retardNoeud = null, retardActuel = 0;
  function planBande(K, j) {
    const c = Analyse.coupures(K).slice().reverse(); // croissant
    const plan = [];
    for (let m = 0; m < j; m++) plan.push(['highpass', c[m]], ['highpass', c[m]]);
    if (j < K - 1) plan.push(['lowpass', c[j]], ['lowpass', c[j]]);
    for (let m = j + 1; m < K - 1; m++) plan.push(['allpass', c[m]]);
    return plan;
  }
  // Réponse impulsionnelle (fenêtre de Hann) de la bande [fb, fh[ Hz ; la somme de toutes les bandes = impulsion retardée
  function impulsionBande(fb, fh, sr) {
    const n = RIF_N, m = (n - 1) / 2, h = new Float32Array(n);
    const sinc = (f, k) => k === 0 ? 2 * f / sr : Math.sin(2 * Math.PI * f * k / sr) / (Math.PI * k);
    for (let i = 0; i < n; i++) {
      const k = i - m, w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
      h[i] = (sinc(fh, k) - sinc(fb, k)) * w;
    }
    return h;
  }
  function bandes(K) {
    contexte();
    if (!chainesParK[K]) {
      const parGrave = [];
      const c = Analyse.coupures(K).slice().reverse(); // croissant
      for (let j = 0; j < K; j++) {
        let n;
        if (K <= 8) n = [ctx.createGain(), ...planBande(K, j).map(([type, f]) => filtre(type, f))];
        else {
          const conv = ctx.createConvolver();
          conv.normalize = false;
          const tb = ctx.createBuffer(1, RIF_N, ctx.sampleRate);
          tb.copyToChannel(impulsionBande(j === 0 ? 0 : c[j - 1], j === K - 1 ? ctx.sampleRate / 2 : c[j], ctx.sampleRate), 0);
          conv.buffer = tb;
          n = [ctx.createGain(), conv];
        }
        serie(n);
        n[n.length - 1].connect(sortie);
        parGrave.push(n[0]);
      }
      chainesParK[K] = parGrave.reverse(); // index 0 = la plus aiguë
    }
    chaines = chainesParK[K];
    retardActuel = K > 8 ? (RIF_N - 1) / 2 / ctx.sampleRate : 0;
    retardNoeud.delayTime.value = retardActuel;
  }

  // v : volume (0..1) ; si le son est coupé dans les réglages, la sortie reste à zéro
  function volume(v) {
    if (sortie) sortie.gain.setTargetAtTime(Reglages.d.son === false ? 0 : v * ATTENUATION, ctx.currentTime, 0.02);
  }

  /* ---------- horloge ---------- */
  // pos : temps du morceau qui sera atteint après « avance » secondes ; rate : vitesse de lecture ;
  // etire : version ralentie du morceau sans changer la hauteur (voir etirer), ou null
  function demarrerHorloge(pos, rate, avance, etire) {
    const c = contexte();
    const audio = c.state === 'running';
    const maintenant = audio ? c.currentTime : performance.now() / 1000;
    h = { audio, t0: maintenant + avance, pos, rate, acc: 0, pauseA: null, etire: rate !== 1 ? etire || null : null, retard: retardActuel };
  }
  function rendu() { return h.audio ? ctx.currentTime : performance.now() / 1000 - h.acc; }
  // instant de l'horloge réellement ENTENDU au moment p (ms, même base que performance.now / event.timeStamp)
  function entendu(p) {
    if (!h.audio) return (h.pauseA != null ? h.pauseA : p / 1000) - h.acc;
    if (ctx.getOutputTimestamp) {
      const ts = ctx.getOutputTimestamp();
      if (ts.contextTime > 0 && ts.performanceTime > 0) return ts.contextTime + (p - ts.performanceTime) / 1000 - h.retard;
    }
    return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0) - (performance.now() - p) / 1000 - h.retard;
  }
  const chanson = T => h.pos + (T - h.t0) * h.rate;   // horloge → temps du morceau
  const versHorloge = s => h.t0 + (s - h.pos) / h.rate; // temps du morceau → horloge
  const tempsEntendu = p => chanson(entendu(p === undefined ? performance.now() : p));
  const tempsRendu = () => chanson(rendu());

  async function pause() {
    if (!h) return;
    if (h.audio) { try { await ctx.suspend(); } catch (e) { /* rien */ } }
    else h.pauseA = performance.now() / 1000;
  }
  async function reprendre() {
    if (!h) return;
    if (h.audio) { try { await ctx.resume(); } catch (e) { /* rien */ } }
    else if (h.pauseA != null) { h.acc += performance.now() / 1000 - h.pauseA; h.pauseA = null; }
  }
  async function reveiller() {
    const c = contexte();
    if (c.state !== 'running') { try { await c.resume(); } catch (e) { /* rien */ } }
  }

  /* ---------- lecture des passages ---------- */
  // Source du morceau à la bonne vitesse : version étirée (même hauteur) si elle existe, sinon lecture ralentie.
  function source(tampon) {
    const s = ctx.createBufferSource();
    if (h.etire) { s.buffer = h.etire; s.playbackRate.value = 1; }
    else { s.buffer = tampon; s.playbackRate.value = h.rate; }
    return s;
  }
  // position dans le tampon joué pour un temps du morceau (la version étirée est plus longue)
  const decalage = s => h.etire ? s / h.rate : s;

  /* Ralentit ou accélère un morceau SANS changer la hauteur des notes (WSOLA : on recolle des petits morceaux de son
     qui se chevauchent, en choisissant chaque fois le raccord le plus ressemblant). */
  // Réglages du ralenti/accéléré : choisis en mesurant les parasites ajoutés (−45 dB, contre −26 dB avec
  // des morceaux de 43 ms à moitié chevauchés, qui grésillaient)
  const ETIRE = { N: 4096, chevauchement: 4, D: 16, tol: 1 / 8, fin: true };
  async function etirer(tampon, rate, progression, reglage) {
    const P = Object.assign({}, ETIRE, reglage);
    const prog = progression || (() => {});
    const c = contexte(), sr = tampon.sampleRate, nc = tampon.numberOfChannels, L = tampon.length;
    const N = sr > 32000 ? P.N : P.N / 2;          // longueur d'un morceau recollé (~85 ms)
    const Hs = N / P.chevauchement, Ha = Hs * rate; // pas en sortie / en entrée
    const tol = Math.round(N * P.tol);             // marge de recherche du raccord
    const canaux = [];
    for (let k = 0; k < nc; k++) canaux.push(tampon.getChannelData(k));
    const mono = new Float32Array(L);
    for (let k = 0; k < nc; k++) { const ch = canaux[k]; for (let i = 0; i < L; i++) mono[i] += ch[i]; }
    // version réduite (÷D) pour une 1re recherche rapide, puis affinage à l'échantillon près
    const D = P.D, md = new Float32Array(Math.ceil(L / D));
    for (let i = 0; i < md.length; i++) { let s = 0; for (let j = i * D; j < Math.min(L, i * D + D); j++) s += mono[j]; md[i] = s; }
    const fen = new Float32Array(N);
    // fenêtre de Hann normalisée : la somme des morceaux qui se chevauchent vaut exactement 1
    for (let i = 0; i < N; i++) fen[i] = (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)) * 2 / P.chevauchement;
    const Lout = Math.ceil(L / rate) + N;
    const sortieT = c.createBuffer(nc, Lout, sr);
    const sorties = [];
    for (let k = 0; k < nc; k++) sorties.push(sortieT.getChannelData(k));
    const nb = Math.floor((L - N - tol) / Ha);
    const lcomp = N / 2;                          // longueur comparée pour juger un raccord
    const lc = lcomp / D, td = Math.ceil(tol / D);
    let avant = 0;
    for (let f = 0; f <= nb; f++) {
      // le centre de chaque morceau recollé doit tomber au bon instant (sinon tout arrive un peu en avance)
      const nominal = Math.max(0, Math.min(L - N, Math.round(f * Ha - (N / 2) * (1 - rate))));
      let pos = nominal;
      if (f > 0) {
        // le son qui suivrait naturellement le morceau précédent
        const cible = Math.min(L - lcomp - 1, avant + Hs), cd = Math.floor(cible / D);
        let meilleur = -Infinity, bd = Math.round(nominal / D);
        for (let d = -td; d <= td; d++) {
          const p = Math.round(nominal / D) + d;
          if (p < 0 || p + lc >= md.length || cd + lc >= md.length) continue;
          let dot = 0, e = 1e-9;
          for (let i = 0; i < lc; i++) { const x = md[p + i]; dot += x * md[cd + i]; e += x * x; }
          const score = dot / Math.sqrt(e);
          if (score > meilleur) { meilleur = score; bd = p; }
        }
        pos = bd * D;
        if (P.fin) {
          let mf = -Infinity, bp = pos;
          for (let q = pos - D; q <= pos + D; q++) {
            if (q < 0 || q + lcomp >= L) continue;
            let dot = 0, e = 1e-9;
            for (let i = 0; i < lcomp; i += 2) { const x = mono[q + i]; dot += x * mono[cible + i]; e += x * x; }
            const score = dot / Math.sqrt(e);
            if (score > mf) { mf = score; bp = q; }
          }
          pos = bp;
        }
        pos = Math.max(0, Math.min(L - N, pos));
      }
      const o = f * Hs;
      for (let k = 0; k < nc; k++) {
        const ent = canaux[k], so = sorties[k];
        for (let i = 0; i < N; i++) so[o + i] += ent[pos + i] * fen[i];
      }
      avant = pos;
      if ((f & 511) === 0) { prog(f / nb); await new Promise(r => setTimeout(r, 0)); }
    }
    prog(1);
    return sortieT;
  }
  function couper(v, t) {
    const g = v.g.gain;
    try { g.cancelScheduledValues(t); g.setTargetAtTime(0, t, 0.004); } catch (e) { /* rien */ }
    try { v.s.stop(t + 0.05); } catch (e) { /* déjà arrêtée */ }
    v.fin = t;
  }

  // Joue la bande « src » (0..3, ou 'mix' = tout) du morceau, de debut à fin (temps du morceau).
  function jouerPassage(tampon, src, debut, fin) {
    if (!h || !h.audio || !tampon) return;
    const k = src === 'mix' ? 'mix' : src;
    const prevu = versHorloge(debut);
    const maintenant = ctx.currentTime + 0.004;
    const t = Math.max(prevu, maintenant);
    // en retard : on saute au plus 20 ms de l'attaque pour rester calé sur la musique
    const offset = debut + Math.min(Math.max(0, maintenant - prevu), 0.02) * h.rate;
    if (offset >= fin - 0.01 || offset >= tampon.duration) return;
    const finT = t + (fin - offset) / h.rate;

    const v = voix[k];
    if (v && v.fin > t) couper(v, t);

    const s = source(tampon);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 0.004);
    g.gain.setValueAtTime(1, Math.max(t + 0.005, finT - 0.012));
    g.gain.linearRampToValueAtTime(0, finT);
    s.connect(g);
    g.connect(k === 'mix' ? directe : chaines[k]);
    s.start(t, decalage(offset));
    s.stop(finT + 0.03);
    s.onended = () => { try { s.disconnect(); g.disconnect(); } catch (e) { /* rien */ } };
    voix[k] = { s, g, fin: finT };
  }

  // Coupe tout de suite le son en cours d'une bande (note longue lâchée trop tôt)
  function couperSource(src) {
    if (!h || !h.audio) return;
    const k = src === 'mix' ? 'mix' : src, v = voix[k], t = ctx.currentTime;
    if (v && v.fin > t) couper(v, t);
  }

  function demarrerGuide(tampon, vol) {
    arreterGuide();
    if (!h || !h.audio || !vol) return;
    guideG.gain.value = vol;
    const s = source(tampon);
    s.connect(guideG);
    const t = Math.max(ctx.currentTime + 0.01, h.t0);
    s.start(t, decalage(Math.max(0, chanson(t))));
    guideSrc = s;
  }
  function arreterGuide() {
    if (guideSrc) { try { guideSrc.stop(); guideSrc.disconnect(); } catch (e) { /* rien */ } guideSrc = null; }
  }

  function toutArreter() {
    arreterGuide();
    if (ctx) {
      const t = ctx.currentTime;
      for (const k of Object.keys(voix)) { if (voix[k]) couper(voix[k], t); delete voix[k]; }
    }
  }

  // Niveau sonore actuel (0..1) pour les effets visuels
  let tampNiv = null;
  function niveau() {
    if (!analyseur || !h || !h.audio) return 0;
    if (!tampNiv) tampNiv = new Uint8Array(analyseur.fftSize);
    analyseur.getByteTimeDomainData(tampNiv);
    let s = 0;
    for (let i = 0; i < tampNiv.length; i++) { const x = (tampNiv[i] - 128) / 128; s += x * x; }
    return Math.min(1, Math.sqrt(s / tampNiv.length) * 3 / Math.max(0.05, Reglages.d.volume * ATTENUATION));
  }

  // Découpe un AudioBuffer entre a et b secondes
  function decouper(tampon, a, b) {
    const c = contexte(), sr = tampon.sampleRate;
    const i0 = Math.max(0, Math.floor(a * sr)), i1 = Math.min(tampon.length, Math.ceil(b * sr));
    if (i1 - i0 < sr) return tampon;
    const out = c.createBuffer(tampon.numberOfChannels, i1 - i0, sr);
    for (let ch = 0; ch < tampon.numberOfChannels; ch++) out.copyToChannel(tampon.getChannelData(ch).subarray(i0, i1), ch);
    return out;
  }

  return {
    contexte, reveiller, volume, bandes, planBande, impulsionBande, RIF_N, demarrerHorloge, pause, reprendre, etirer,
    tempsEntendu, tempsRendu, versHorloge,
    jouerPassage, couperSource, demarrerGuide, toutArreter, niveau, decouper,
    get audioActif() { return !!(h && h.audio); },
  };
})();
