'use strict';
/* Analyse d'un morceau et création des partitions.
   1. Spectre court terme (STFT) du morceau en mono 22 050 Hz.
   2. Pour chacune des 24 bandes fines (réparties comme l'oreille les entend : échelle ERB, plus serrées
      dans le grave en hertz) : énergie et montées d'énergie (« flux spectral »).
   3. Selon le nombre de touches choisi (1 à 24), les bandes fines sont regroupées en autant de bandes
      de jeu (aigu → grave), dont on détecte les attaques.
   4. Pour le style Mélodie : attaques dans la zone mélodique + hauteur moyenne de chaque passage.
   Les partitions sont ensuite générées à la volée (rapide, rien à recalculer). */

const Analyse = (() => {
  const VERSION = 3;
  const SR = 22050, N = 1024, HOP = 256;
  const TRAME = HOP / SR;                 // ≈ 11,6 ms
  const NF = 24;                          // bandes fines (0 = la plus aiguë)
  // 23 coupures entre bandes fines (Hz, croissant), régulièrement espacées sur l'échelle ERB de 80 Hz à 9 kHz
  const erb = f => 21.4 * Math.log10(1 + 0.00437 * f), deErb = e => (Math.pow(10, e / 21.4) - 1) / 0.00437;
  const FINES = Array.from({ length: NF - 1 }, (_, i) => Math.round(deErb(erb(80) + i * (erb(9000) - erb(80)) / (NF - 2))));
  const MAX_TOUCHES = 24;
  // Décalage entre le début de la trame où l'attaque est repérée et l'attaque réelle (mesuré sur des sons tests)
  const DECAL = 0.031;

  // bande fine d'une fréquence (0 = ≥ 6400 Hz … 7 = < 100 Hz)
  const fineDe = f => { let i = NF - 1; for (const c of FINES) { if (f >= c) i--; } return i; };
  const souffle = () => new Promise(r => setTimeout(r, 0));

  /* ---------- touches : regroupement des bandes, noms, couleurs ---------- */
  // bandes fines regroupées pour K touches : bornes[g] .. bornes[g+1] (exclu)
  const bornes = K => Array.from({ length: K + 1 }, (_, g) => Math.round(g * NF / K));
  // fréquences de coupure entre les K bandes de jeu, de la plus aiguë à la plus grave
  const coupures = K => bornes(K).slice(1, -1).map(b => FINES[NF - 1 - b]);
  const NOMS_PAR_K = {
    1: ['Tout'],
    2: ['Aigu', 'Grave'],
    3: ['Aigu', 'Médium', 'Grave'],
    4: ['Aigu', 'Médium aigu', 'Médium grave', 'Grave'],
    5: ['Très aigu', 'Aigu', 'Médium', 'Grave', 'Très grave'],
    6: ['Très aigu', 'Aigu', 'Médium aigu', 'Médium grave', 'Grave', 'Très grave'],
    7: ['Très aigu', 'Aigu', 'Médium aigu', 'Médium', 'Médium grave', 'Grave', 'Très grave'],
    8: ['Brillance', 'Très aigu', 'Aigu', 'Médium aigu', 'Médium grave', 'Grave', 'Très grave', 'Sub-basse'],
  };
  // Au-delà de 8 touches : la fréquence centrale de la bande (« 1,5 kHz », « 230 Hz »)
  function nomBande(b, K) {
    if (NOMS_PAR_K[K]) return NOMS_PAR_K[K][b];
    const bo = bornes(K), haut = bo[b] === 0 ? 11000 : FINES[NF - 1 - bo[b]], bas = bo[b + 1] >= NF ? 40 : FINES[NF - 1 - bo[b + 1]];
    const f = Math.sqrt(haut * bas);
    return f >= 1000 ? (f / 1000).toFixed(1).replace('.', ',') + ' kHz' : Math.round(f / 10) * 10 + ' Hz';
  }
  const PALETTE = ['#5ee7ff', '#5fb8ff', '#7f9cff', '#9b8cff', '#c77dff', '#ff6fae', '#ff8f6b', '#ffb341'];
  const PAL_RGB = PALETTE.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
  // couleur de la bande b sur K : dégradé continu du cyan (aigu) à l'orange (grave)
  function couleur(b, K) {
    if (K === 1) return PALETTE[3];
    const x = b * (PALETTE.length - 1) / (K - 1), i = Math.min(PALETTE.length - 2, Math.floor(x)), f = x - i;
    const c = [0, 1, 2].map(k => Math.round(PAL_RGB[i][k] * (1 - f) + PAL_RGB[i + 1][k] * f));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  // Voie (0 = touche de gauche) d'une bande (0 = aigu)
  const voieDe = (b, aiguGauche, K) => aiguGauche ? b : (K || 4) - 1 - b;

  function fabriquerFFT(n) {
    const niv = Math.log2(n) | 0, inv = new Uint32Array(n);
    for (let i = 0; i < n; i++) { let r = 0, x = i; for (let j = 0; j < niv; j++) { r = (r << 1) | (x & 1); x >>= 1; } inv[i] = r; }
    const co = new Float64Array(n / 2), si = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) { co[i] = Math.cos(2 * Math.PI * i / n); si[i] = Math.sin(2 * Math.PI * i / n); }
    return (re, im) => {
      for (let i = 0; i < n; i++) {
        const j = inv[i];
        if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
      }
      for (let taille = 2; taille <= n; taille <<= 1) {
        const moitie = taille >> 1, pas = n / taille;
        for (let i = 0; i < n; i += taille) {
          for (let j = i, k = 0; j < i + moitie; j++, k += pas) {
            const a = j + moitie;
            const tr = re[a] * co[k] + im[a] * si[k];
            const ti = im[a] * co[k] - re[a] * si[k];
            re[a] = re[j] - tr; im[a] = im[j] - ti;
            re[j] += tr; im[j] += ti;
          }
        }
      }
    };
  }

  // Pics d'un flux spectral → attaques candidates {t, s} (s = force, normalisée sur le morceau)
  // relMax[f] : niveau (par rapport à sa normale) de la bande la plus présente à la trame f
  function pics(flux, energie, ref, relMax) {
    const n = flux.length;
    const tri = Float32Array.from(flux).sort();
    const p95 = Math.max(1e-6, tri[Math.floor(n * 0.95)]);
    const cumul = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) cumul[i + 1] = cumul[i] + flux[i];
    const T = [], S = [];
    for (let i = 1; i < n - 1; i++) {
      const v = flux[i];
      if (v <= 0) continue;
      let max = true;
      for (let j = Math.max(0, i - 4); j <= Math.min(n - 1, i + 4); j++) {
        if ((j < i && flux[j] > v) || (j > i && flux[j] >= v)) { max = false; break; }
      }
      if (!max) continue;
      const a = Math.max(0, i - 16), b = Math.min(n, i + 6);
      const s = (v - (cumul[b] - cumul[a]) / (b - a)) / p95;
      if (s < 0.08) continue;
      if (energie) {
        let e = -200, r = -200;
        for (let j = i; j < Math.min(n, i + 5); j++) {
          if (energie[j] - ref > e) e = energie[j] - ref;
          if (relMax && relMax[j] > r) r = relMax[j];
        }
        if (e < -40) continue;               // trop faible : bruit de fond
        if (relMax && e < r - 30) continue;  // simple débordement d'une autre bande bien plus forte
      }
      T.push(i * TRAME + DECAL); S.push(Math.min(s, 6));
    }
    return { t: Float32Array.from(T), s: Float32Array.from(S) };
  }

  function centile(arr, p) {
    const t = Float32Array.from(arr).sort();
    return t.length ? t[Math.min(t.length - 1, Math.floor(t.length * p))] : 0;
  }

  async function analyser(tampon, progression) {
    const prog = progression || (() => {});
    const long = Math.max(N * 2, Math.ceil(tampon.duration * SR));
    const hors = new OfflineAudioContext(1, long, SR);
    const src = hors.createBufferSource();
    src.buffer = tampon; src.connect(hors.destination); src.start();
    const mono = (await hors.startRendering()).getChannelData(0);
    prog(0.05);

    let crete = 0;
    for (let i = 0; i < mono.length; i++) { const a = Math.abs(mono[i]); if (a > crete) crete = a; }
    const echelle = crete > 1e-6 ? 1 / crete : 1;

    const nT = Math.floor((mono.length - N) / HOP) + 1;
    const fft = fabriquerFFT(N), re = new Float64Array(N), im = new Float64Array(N);
    const fen = new Float64Array(N);
    for (let i = 0; i < N; i++) fen[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    const H = N / 2, hzParCase = SR / N;
    const bande = new Int8Array(H), melo = new Uint8Array(H), log2f = new Float32Array(H);
    for (let k = 0; k < H; k++) {
      const f = k * hzParCase;
      bande[k] = f < 30 ? -1 : fineDe(f);
      melo[k] = f >= 120 && f <= 2500 ? 1 : 0;
      log2f[k] = f > 0 ? Math.log2(f) : 0;
    }
    const flux = Array.from({ length: NF }, () => new Float32Array(nT));
    const energie = Array.from({ length: NF }, () => new Float32Array(nT));
    const fluxMelo = new Float32Array(nT), hauteur = new Float32Array(nT), eMelo = new Float32Array(nT);
    const eMeloDb = new Float32Array(nT);
    const mag = new Float64Array(H), avant = new Float32Array(H), eb = new Float64Array(NF), fb = new Float64Array(NF);
    const norm = 4 / N;
    const nbCases = new Array(NF).fill(0);
    let nbMelo = 0;
    for (let k = 1; k < H; k++) { if (bande[k] >= 0) nbCases[bande[k]]++; if (melo[k]) nbMelo++; }

    // Parcourt toutes les trames : spectre (amplitudes) dans « mag », puis fn(trame)
    async function passe(fn, p0, p1) {
      for (let f = 0; f < nT; f++) {
        const o = f * HOP;
        for (let i = 0; i < N; i++) { re[i] = mono[o + i] * fen[i] * echelle; im[i] = 0; }
        fft(re, im);
        for (let k = 1; k < H; k++) mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]) * norm;
        fn(f);
        if ((f & 511) === 0) { prog(p0 + (p1 - p0) * f / nT); await souffle(); }
      }
    }

    // 1re passe : énergie de chaque bande fine et hauteur moyenne (zone mélodique)
    await passe(f => {
      eb.fill(0);
      let sp = 0, spf = 0, em = 0;
      for (let k = 1; k < H; k++) {
        const b = bande[k];
        if (b < 0) continue;
        const m = mag[k];
        eb[b] += m * m;
        if (melo[k]) { sp += m; spf += m * log2f[k]; em += m * m; }
      }
      for (let b = 0; b < NF; b++) energie[b][f] = 10 * Math.log10(eb[b] + 1e-12);
      eMelo[f] = sp;
      eMeloDb[f] = 10 * Math.log10(em + 1e-12);
      hauteur[f] = sp > 1e-6 ? spf / sp : 0;
    }, 0.05, 0.45);

    // 2e passe : flux spectral (montées d'énergie case par case), compressé par rapport au niveau
    // habituel de la bande : un débordement très faible d'une autre bande ne compte presque pas.
    const ref = energie.map(e => centile(e, 0.95));
    const plancher = new Float64Array(H);
    const refMelo = centile(eMeloDb, 0.95);
    const plancherMelo = Math.sqrt(Math.pow(10, refMelo / 10) / Math.max(1, nbMelo)) * 0.01;
    for (let k = 1; k < H; k++) {
      const b = bande[k];
      plancher[k] = b < 0 ? 1 : Math.sqrt(Math.pow(10, ref[b] / 10) / Math.max(1, nbCases[b])) * 0.01; // −40 dB
    }
    const avantMelo = new Float32Array(H);
    await passe(f => {
      fb.fill(0);
      let fm = 0;
      for (let k = 1; k < H; k++) {
        const b = bande[k];
        if (b < 0) continue;
        const L = Math.log(1 + mag[k] / plancher[k]);
        const d = L - avant[k]; avant[k] = L;
        if (d > 0) fb[b] += d;
        if (melo[k]) {
          const Lm = Math.log(1 + mag[k] / plancherMelo);
          const dm = Lm - avantMelo[k]; avantMelo[k] = Lm;
          if (dm > 0) fm += dm;
        }
      }
      for (let b = 0; b < NF; b++) flux[b][f] = fb[b];
      fluxMelo[f] = fm;
    }, 0.45, 0.9);

    const eTot = new Float32Array(nT);
    for (let f = 0; f < nT; f++) {
      let m = -200;
      for (let b = 0; b < NF; b++) if (energie[b][f] > m) m = energie[b][f];
      eTot[f] = m;
    }
    const melodie = pics(fluxMelo, eTot, centile(eTot, 0.95));
    prog(1);
    return { v: VERSION, duree: tampon.duration, trame: TRAME, nT, flux, energie, melodie, hauteur, eMelo };
  }

  /* Bandes de jeu pour K touches : énergie, niveau de référence et attaques de chaque groupe de bandes fines.
     Calculé une fois par nombre de touches puis gardé en mémoire (pas dans la bibliothèque). */
  function bandes(an, K) {
    if (!an._bandes) Object.defineProperty(an, '_bandes', { value: {}, enumerable: false });
    if (an._bandes[K]) return an._bandes[K];
    const bo = bornes(K), nT = an.nT;
    const energie = [], flux = [];
    for (let g = 0; g < K; g++) {
      const e = new Float32Array(nT), fl = new Float32Array(nT);
      for (let f = 0; f < nT; f++) {
        let lin = 0, s = 0;
        for (let b = bo[g]; b < bo[g + 1]; b++) { lin += Math.pow(10, an.energie[b][f] / 10); s += an.flux[b][f]; }
        e[f] = 10 * Math.log10(lin + 1e-12); fl[f] = s;
      }
      energie.push(e); flux.push(fl);
    }
    const ref = energie.map(e => centile(e, 0.95));
    const relMax = new Float32Array(nT);
    for (let f = 0; f < nT; f++) {
      let m = -200;
      for (let g = 0; g < K; g++) if (energie[g][f] - ref[g] > m) m = energie[g][f] - ref[g];
      relMax[f] = m;
    }
    const cands = flux.map((fl, g) => pics(fl, energie[g], ref[g], K > 1 ? relMax : null));
    return (an._bandes[K] = { K, energie, ref, cands });
  }

  /* ----------------- Partitions ----------------- */
  // long : durée minimale (s) d'un son tenu pour en faire une note longue à tenir
  const DIFFS = {
    facile:    { nom: 'Facile',    long: 0.6,  c: { ecart: 1.0,  glob: 0.32,  seuil: 0.45, trou: 4.0 }, m: { ecart: 0.45,  seuil: 0.4,  trou: 3.0 } },
    normal:    { nom: 'Normal',    long: 0.45, c: { ecart: 0.55, glob: 0.17,  seuil: 0.3,  trou: 3.0 }, m: { ecart: 0.28,  seuil: 0.28, trou: 2.2 } },
    difficile: { nom: 'Difficile', long: 0.38, c: { ecart: 0.3,  glob: 0.085, seuil: 0.18, trou: 2.2 }, m: { ecart: 0.16,  seuil: 0.12, trou: 1.6 } },
    expert:    { nom: 'Expert',    long: 0.32, c: { ecart: 0.2,  glob: 0.04,  seuil: 0.12, trou: 1.6 }, m: { ecart: 0.115, seuil: 0.08, trou: 1.2 } },
  };

  function rang(arr, t) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < t) lo = m + 1; else hi = m; } return lo; }
  function libre(arr, t, ecart) {
    if (ecart <= 0) return true;
    const i = rang(arr, t);
    return !((i < arr.length && arr[i] - t < ecart) || (i > 0 && t - arr[i - 1] < ecart));
  }
  function inserer(arr, t) { arr.splice(rang(arr, t), 0, t); }

  // La bande de jeu b joue-t-elle vraiment autour de t ?
  function actif(bk, b, t) {
    const e = bk.energie[b], i0 = Math.max(0, Math.round((t - DECAL) / TRAME));
    let m = -200;
    for (let i = i0; i < Math.min(e.length, i0 + 10); i++) if (e[i] > m) m = e[i];
    return m > bk.ref[b] - 30;
  }
  function actifTout(bk, t) { for (let b = 0; b < bk.K; b++) if (actif(bk, b, t)) return true; return false; }
  // Durée pendant laquelle le son de la note reste fort (moins de 9 dB sous son attaque), sans dépasser la note suivante
  function tenue(an, e, t, fin) {
    const niv = i => e ? e[i] : 20 * Math.log10(an.eMelo[i] + 1e-9);
    const i0 = Math.max(0, Math.round((t - DECAL) / an.trame));
    const lim = Math.min(an.nT, Math.round((fin - 0.12 - DECAL) / an.trame));
    let pic = -300;
    for (let i = i0; i < Math.min(an.nT, i0 + 7); i++) if (niv(i) > pic) pic = niv(i);
    let i = i0 + 7;
    while (i < lim && niv(i) > pic - 9) i++;
    return Math.max(0, Math.min(i, lim) - i0) * an.trame;
  }

  // Choisit les attaques : les plus fortes d'abord, en respectant les écarts ; puis bouche les trous trop longs.
  function choisir(c, P, D, ok) {
    const ordre = Array.from(c.t.keys()).sort((a, b) => c.s[b] - c.s[a]);
    const pris = [];
    for (const i of ordre) {
      if (c.s[i] < P.seuil) break;
      const t = c.t[i];
      if (t < 0.05 || t > D - 0.1) continue;
      if (libre(pris, t, P.ecart)) inserer(pris, t);
    }
    const boucher = (a, z) => {
      if (z - a <= P.trou) return;
      let meilleur = -1, ms = 0;
      for (let i = rang(c.t, a + P.ecart); i < c.t.length && c.t[i] < z - P.ecart; i++) {
        if (c.s[i] > ms && ok(c.t[i])) { ms = c.s[i]; meilleur = i; }
      }
      if (meilleur < 0) return;
      const t = c.t[meilleur];
      inserer(pris, t);
      boucher(a, t); boucher(t, z);
    };
    const bornesT = [-P.ecart, ...pris, D + P.ecart];
    for (let i = 0; i < bornesT.length - 1; i++) boucher(bornesT[i], bornesT[i + 1]);
    return pris;
  }

  // K : nombre de touches (1 à 8)
  function partition(an, style, diff, aiguGauche, K) {
    K = Math.max(1, Math.min(MAX_TOUCHES, K || 4));
    const D = an.duree, bk = bandes(an, K);
    const notes = [];
    if (style === 'couches') {
      const P = DIFFS[diff].c, globale = [];
      // les bandes sont traitées ensemble par force décroissante pour l'écart global
      const parBande = Array.from({ length: K }, () => []);
      const tous = [];
      for (let b = 0; b < K; b++) for (let i = 0; i < bk.cands[b].t.length; i++) tous.push([bk.cands[b].s[i], bk.cands[b].t[i], b]);
      tous.sort((x, y) => y[0] - x[0]);
      for (const [s, t, b] of tous) {
        if (s < P.seuil) break;
        if (t < 0.05 || t > D - 0.1) continue;
        if (libre(parBande[b], t, P.ecart) && libre(globale, t, P.glob)) { inserer(parBande[b], t); inserer(globale, t); }
      }
      for (let b = 0; b < K; b++) {
        const c = bk.cands[b], pris = parBande[b];
        const boucher = (a, z) => {
          if (z - a <= P.trou) return;
          let meilleur = -1, ms = 0;
          for (let i = rang(c.t, a + P.ecart); i < c.t.length && c.t[i] < z - P.ecart; i++) {
            if (c.s[i] > ms && actif(bk, b, c.t[i]) && libre(globale, c.t[i], P.glob)) { ms = c.s[i]; meilleur = i; }
          }
          if (meilleur < 0) return;
          const t = c.t[meilleur];
          inserer(pris, t); inserer(globale, t);
          boucher(a, t); boucher(t, z);
        };
        const bornesT = [-P.ecart, ...pris, D + P.ecart];
        for (let i = 0; i < bornesT.length - 1; i++) boucher(bornesT[i], bornesT[i + 1]);
        for (let i = 0; i < pris.length; i++) {
          notes.push({ t: pris[i], fin: i + 1 < pris.length ? pris[i + 1] : D, bande: b, voie: voieDe(b, aiguGauche, K), src: b });
        }
      }
    } else {
      const P = DIFFS[diff].m;
      const pris = choisir(an.melodie, P, D, t => actifTout(bk, t));
      // hauteur moyenne du début de chaque passage (pondérée par l'énergie mélodique)
      const h = pris.map((t, i) => {
        const fin = Math.min(i + 1 < pris.length ? pris[i + 1] : D, t + 0.45);
        const a = Math.max(0, Math.round((t - DECAL) / an.trame) + 2), z = Math.min(an.nT, Math.round((fin - DECAL) / an.trame) + 2);
        let sp = 0, s = 0;
        for (let f = a; f < z; f++) { sp += an.eMelo[f]; s += an.eMelo[f] * an.hauteur[f]; }
        return sp > 1e-6 ? s / sp : NaN;
      });
      // K paliers de hauteur de même taille : les passages les plus aigus sur la bande 0
      const valides = h.filter(x => !isNaN(x));
      const q = Array.from({ length: K - 1 }, (_, j) => centile(valides, (K - 1 - j) / K)); // seuils décroissants
      let bPrec = Math.floor(K / 2);
      for (let i = 0; i < pris.length; i++) {
        let b = bPrec;
        if (!isNaN(h[i])) { b = 0; while (b < K - 1 && h[i] < q[b]) b++; }
        bPrec = b;
        notes.push({ t: pris[i], fin: i + 1 < pris.length ? pris[i + 1] : D, bande: b, voie: voieDe(b, aiguGauche, K), src: 'mix' });
      }
    }
    // Notes longues : le son reste fort après l'attaque → il faut tenir la touche jusqu'à ce qu'il retombe
    for (const n of notes) {
      const d = tenue(an, style === 'couches' ? bk.energie[n.bande] : null, n.t, n.fin);
      n.duree = d >= DIFFS[diff].long ? Math.min(d, 3) : 0;
    }
    notes.sort((a, b) => a.t - b.t || a.voie - b.voie);
    return { style, diff, K, notes, duree: D };
  }

  return { VERSION, MAX_TOUCHES, DIFFS, analyser, bandes, partition, voieDe, coupures, nomBande, couleur };
})();
