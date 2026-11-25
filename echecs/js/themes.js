/* Paramètres d'apparence : thème du plateau (couleurs ou vraies textures bois / marbre / pierre)
   et décor de fond (dessinés ici, au pixel : bois, feutre, ciel étoilé, coucher de soleil, forêt…). */
(function () {
  'use strict';

  // ---------- bruit (pour des textures naturelles) ----------
  function aleaGraine(graine) {
    let s = graine >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function creerBruit(graine) {
    const r = aleaGraine(graine);
    const N = 256, perm = new Uint8Array(512), val = new Float32Array(N);
    for (let i = 0; i < N; i++) { perm[i] = i; val[i] = r(); }
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    for (let i = 0; i < N; i++) perm[i + N] = perm[i];
    const lisse = (t) => t * t * (3 - 2 * t);
    const v = (x, y) => val[perm[(x & 255) + perm[y & 255]]];
    function bruit(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
      const u = lisse(xf), w = lisse(yf);
      return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
    }
    function fbm(x, y, oct) {
      let t = 0, amp = 0.5, f = 1, somme = 0;
      for (let i = 0; i < (oct || 5); i++) { t += amp * bruit(x * f, y * f); somme += amp; amp *= 0.5; f *= 2.03; }
      return t / somme;
    }
    return { bruit, fbm, alea: r };
  }
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const borne = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

  function toile(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function parPixel(w, h, f) {
    const c = toile(w, h), ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const col = f(x, y), i = (y * w + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  // ---------- textures de cases ----------
  function bois(clair, fonce, graine, taille) {
    const B = creerBruit(graine), A = hex(clair), F = hex(fonce);
    return parPixel(taille, taille, (x, y) => {
      const n = B.fbm(x * 0.006, y * 0.05, 4);
      const veine = 0.5 + 0.5 * Math.sin(y * 0.09 + n * 14);
      const fin = B.bruit(x * 0.6, y * 0.08);
      const t = borne(Math.pow(veine, 3) * 0.55 + fin * 0.18 + n * 0.25);
      return mix(A, F, t);
    });
  }
  function marbre(clair, veine, graine, taille) {
    const B = creerBruit(graine), A = hex(clair), V = hex(veine);
    return parPixel(taille, taille, (x, y) => {
      const n = B.fbm(x * 0.008, y * 0.008, 6);
      const t = Math.pow(1 - Math.abs(Math.sin((x * 0.012 + y * 0.006 + n * 7) * Math.PI)), 10);
      const nuage = B.fbm(x * 0.02 + 40, y * 0.02, 4) * 0.25;
      return mix(A, V, borne(t * 0.85 + nuage));
    });
  }
  function pierre(base, sombre, graine, taille) {
    const B = creerBruit(graine), A = hex(base), S = hex(sombre);
    return parPixel(taille, taille, (x, y) => {
      const n = B.fbm(x * 0.03, y * 0.03, 5);
      const grain = B.bruit(x * 0.9, y * 0.9) * 0.25;
      return mix(A, S, borne((n - 0.3) * 1.4 + grain));
    });
  }

  const THEMES = [
    { id: 'sable', nom: 'Sable (classique)', claire: '#eee3cc', foncee: '#b0885f' },
    { id: 'chene', nom: 'Bois de chêne', claire: '#e6c99a', foncee: '#9c6a3a',
      tex: () => [bois('#ecd3a6', '#c9a26e', 11, 512), bois('#a8743f', '#6d4321', 23, 512)] },
    { id: 'noyer', nom: 'Noyer et érable', claire: '#e9d6b5', foncee: '#5e3b22',
      tex: () => [bois('#efdfc2', '#d2b88f', 5, 512), bois('#6a4226', '#3a2111', 8, 512)] },
    { id: 'marbre', nom: 'Marbre', claire: '#ece9e2', foncee: '#3d5a4c',
      tex: () => [marbre('#f1eee8', '#9c968c', 3, 512), marbre('#355246', '#1b2b24', 7, 512)] },
    { id: 'pierre', nom: 'Pierre', claire: '#c9c4b8', foncee: '#6e6a62',
      tex: () => [pierre('#d4cfc3', '#a39d90', 4, 384), pierre('#7a756c', '#4a4640', 9, 384)] },
    { id: 'tournoi', nom: 'Tournoi (vert)', claire: '#eeeed2', foncee: '#769656' },
    { id: 'ocean', nom: 'Océan', claire: '#dee3e6', foncee: '#6f8fae' },
    { id: 'ebene', nom: 'Ébène et ivoire', claire: '#efe6d4', foncee: '#2c2522',
      tex: () => [marbre('#f3ecdd', '#d9ccb0', 13, 512), bois('#332a26', '#171210', 31, 512)] }
  ];

  // ---------- décors de fond ----------
  const W = 1600, H = 900;
  function vignette(ctx, w, h, force) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + force + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  const DECORS = [
    { id: 'nuit', nom: 'Nuit sobre', dessiner: null },
    { id: 'table', nom: 'Table en bois', dessiner(w, h) {
      const B = creerBruit(77);
      const planche = Math.round(w / 9);
      const teintes = ['#7a4b2a', '#6b4024', '#80512e', '#714528', '#5f3a20'].map(hex);
      const c = parPixel(w, h, (x, y) => {
        const p = Math.floor(x / planche), base = teintes[p % teintes.length];
        const lx = x - p * planche;
        const n = B.fbm(lx * 0.05 + p * 30, y * 0.004, 4);
        const veine = 0.5 + 0.5 * Math.sin(lx * 0.11 + n * 16 + p);
        const t = borne(Math.pow(veine, 4) * 0.35 + B.bruit(x * 0.5, y * 0.05) * 0.15);
        let col = mix(base, [40, 22, 10], t);
        if (lx < 2 || lx > planche - 2) col = mix(col, [20, 10, 4], 0.7);
        return col;
      });
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 50, w * 0.5, h * 0.4, w * 0.7);
      g.addColorStop(0, 'rgba(255,210,150,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      vignette(ctx, w, h, 0.6);
      return c;
    } },
    { id: 'feutre', nom: 'Feutre vert', dessiner(w, h) {
      const B = creerBruit(5), r = aleaGraine(9);
      const A = hex('#1f6b3c'), S = hex('#0f3a20');
      const c = parPixel(w, h, (x, y) => {
        const n = B.fbm(x * 0.004, y * 0.004, 3);
        const g = (r() - 0.5) * 0.18;
        return mix(A, S, borne(n * 0.5 + g + 0.1));
      });
      const ctx = c.getContext('2d');
      const l = ctx.createRadialGradient(w / 2, h * 0.4, 30, w / 2, h * 0.45, w * 0.6);
      l.addColorStop(0, 'rgba(255,255,220,0.16)'); l.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = l; ctx.fillRect(0, 0, w, h);
      vignette(ctx, w, h, 0.75);
      return c;
    } },
    { id: 'etoiles', nom: 'Ciel étoilé', dessiner(w, h) {
      const B = creerBruit(21), r = aleaGraine(4);
      const c = parPixel(w, h, (x, y) => {
        const fond = mix([2, 3, 12], [14, 18, 48], y / h);
        // voie lactée en diagonale + nébuleuses
        const d = Math.abs((x / w) * 0.8 - (y / h) + 0.1);
        const bande = Math.exp(-d * d * 18) * B.fbm(x * 0.004, y * 0.004, 6);
        const neb = Math.pow(B.fbm(x * 0.0025 + 10, y * 0.0025, 5), 3) * 1.4;
        let col = mix(fond, [120, 110, 170], borne(bande * 0.9));
        col = mix(col, [150, 60, 140], borne(neb * 0.35));
        return col;
      });
      const ctx = c.getContext('2d');
      for (let i = 0; i < 3200; i++) {
        const x = r() * w, y = r() * h, t = Math.pow(r(), 6);
        const rayon = 0.4 + t * 1.8;
        const teinte = r() < 0.2 ? '255,220,200' : r() < 0.4 ? '200,220,255' : '255,255,255';
        ctx.fillStyle = 'rgba(' + teinte + ',' + (0.35 + r() * 0.65) + ')';
        ctx.beginPath(); ctx.arc(x, y, rayon, 0, Math.PI * 2); ctx.fill();
        if (t > 0.5) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, rayon * 6);
          g.addColorStop(0, 'rgba(' + teinte + ',0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.fillRect(x - rayon * 6, y - rayon * 6, rayon * 12, rayon * 12);
        }
      }
      return c;
    } },
    { id: 'couchant', nom: 'Coucher de soleil', dessiner(w, h) {
      const c = toile(w, h), ctx = c.getContext('2d');
      const B = creerBruit(13);
      const hor = h * 0.62;
      const ciel = ctx.createLinearGradient(0, 0, 0, hor);
      ciel.addColorStop(0, '#1d1433'); ciel.addColorStop(0.35, '#5a2a5e'); ciel.addColorStop(0.7, '#d0603e'); ciel.addColorStop(1, '#ffc56e');
      ctx.fillStyle = ciel; ctx.fillRect(0, 0, w, hor);
      const sx = w * 0.62, sy = hor - 30;
      const halo = ctx.createRadialGradient(sx, sy, 10, sx, sy, w * 0.45);
      halo.addColorStop(0, 'rgba(255,240,190,0.95)'); halo.addColorStop(0.08, 'rgba(255,200,120,0.6)'); halo.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = halo; ctx.fillRect(0, 0, w, hor);
      ctx.fillStyle = '#fff3cf'; ctx.beginPath(); ctx.arc(sx, sy, 42, 0, Math.PI * 2); ctx.fill();
      // nuages fins
      for (let y = 0; y < hor; y += 2) for (let x = 0; x < w; x += 2) {
        const n = B.fbm(x * 0.002, y * 0.012, 5);
        if (n > 0.58) { ctx.fillStyle = 'rgba(255,170,140,' + ((n - 0.58) * 1.6).toFixed(3) + ')'; ctx.fillRect(x, y, 2, 2); }
      }
      // montagnes en couches (de plus en plus sombres et nettes)
      const couches = [['#8a4a6a', 0.30, 0.0018, 60], ['#5e3253', 0.22, 0.0025, 90], ['#3a2140', 0.14, 0.004, 120], ['#1c1224', 0.06, 0.006, 150]];
      couches.forEach(([coul, haut, f, graine], i) => {
        ctx.fillStyle = coul; ctx.beginPath(); ctx.moveTo(0, hor);
        for (let x = 0; x <= w; x += 4) ctx.lineTo(x, hor - h * haut * (0.35 + B.fbm(x * f + graine, i * 7, 5)) + i * 18);
        ctx.lineTo(w, hor + 2); ctx.closePath(); ctx.fill();
      });
      // lac et reflet
      const eau = ctx.createLinearGradient(0, hor, 0, h);
      eau.addColorStop(0, '#6b3550'); eau.addColorStop(1, '#120b18');
      ctx.fillStyle = eau; ctx.fillRect(0, hor, w, h - hor);
      for (let y = hor; y < h; y += 3) {
        const l = (1 - (y - hor) / (h - hor));
        const large = 60 + (y - hor) * 0.9;
        ctx.fillStyle = 'rgba(255,210,140,' + (0.45 * l * l).toFixed(3) + ')';
        const dec = (B.bruit(y * 0.15, 3) - 0.5) * 40;
        ctx.fillRect(sx - large / 2 + dec, y, large * (0.4 + B.bruit(y * 0.3, 9)), 1.5);
      }
      vignette(ctx, w, h, 0.45);
      return c;
    } },
    { id: 'foret', nom: 'Forêt dans la brume', dessiner(w, h) {
      const c = toile(w, h), ctx = c.getContext('2d');
      const r = aleaGraine(17);
      const ciel = ctx.createLinearGradient(0, 0, 0, h);
      ciel.addColorStop(0, '#c9d6d3'); ciel.addColorStop(0.6, '#9fb3ad'); ciel.addColorStop(1, '#5d726c');
      ctx.fillStyle = ciel; ctx.fillRect(0, 0, w, h);
      const sapin = (x, base, haut, coul) => {
        ctx.fillStyle = coul;
        ctx.fillRect(x - haut * 0.02, base - haut * 0.15, haut * 0.04, haut * 0.15);
        const etages = 6;
        for (let i = 0; i < etages; i++) {
          const yb = base - haut * 0.1 - (haut * 0.85) * (i / etages);
          const larg = haut * 0.38 * (1 - i / (etages + 1));
          ctx.beginPath();
          ctx.moveTo(x - larg, yb); ctx.lineTo(x + larg, yb); ctx.lineTo(x, yb - haut * 0.3); ctx.closePath(); ctx.fill();
        }
      };
      const couches = [
        ['rgba(120,140,135,1)', h * 0.55, 120, 18], ['rgba(88,108,102,1)', h * 0.66, 170, 22],
        ['rgba(58,76,70,1)', h * 0.78, 240, 26], ['rgba(32,45,40,1)', h * 0.93, 360, 30], ['rgba(16,24,20,1)', h * 1.05, 520, 16]
      ];
      couches.forEach(([coul, base, haut, n], i) => {
        for (let k = 0; k < n; k++) {
          const x = (k + r() * 0.8) * (w / n);
          sapin(x, base + r() * 30, haut * (0.7 + r() * 0.5), coul);
        }
        const brume = ctx.createLinearGradient(0, base - haut, 0, base + 40);
        brume.addColorStop(0, 'rgba(210,222,218,0)'); brume.addColorStop(1, 'rgba(210,222,218,' + (0.55 - i * 0.1).toFixed(2) + ')');
        ctx.fillStyle = brume; ctx.fillRect(0, base - haut, w, haut + 40);
      });
      const soleil = ctx.createRadialGradient(w * 0.3, h * 0.15, 10, w * 0.3, h * 0.15, w * 0.5);
      soleil.addColorStop(0, 'rgba(255,250,230,0.5)'); soleil.addColorStop(1, 'rgba(255,250,230,0)');
      ctx.fillStyle = soleil; ctx.fillRect(0, 0, w, h);
      vignette(ctx, w, h, 0.5);
      return c;
    } },
    { id: 'marbre', nom: 'Marbre noir', dessiner(w, h) {
      const B = creerBruit(41);
      const A = hex('#141414'), V = hex('#c9b27a');
      const c = parPixel(w, h, (x, y) => {
        const n = B.fbm(x * 0.0035, y * 0.0035, 6);
        const t = Math.pow(1 - Math.abs(Math.sin((x * 0.0016 - y * 0.0011 + n * 3.2) * Math.PI)), 40);
        const nuage = B.fbm(x * 0.01 + 7, y * 0.01, 4);
        return mix(mix(A, [40, 40, 44], nuage * 0.6), V, borne(t * 0.8));
      });
      vignette(c.getContext('2d'), w, h, 0.5);
      return c;
    } }
  ];

  // ---------- application ----------
  const cache = {};
  function url(c) { return 'url("' + c.toDataURL('image/jpeg', 0.9) + '")'; }
  function appliquerTheme(id) {
    const t = THEMES.find((x) => x.id === id) || THEMES[0];
    const st = document.documentElement.style;
    st.setProperty('--claire', t.claire);
    st.setProperty('--foncee', t.foncee);
    if (t.tex) {
      if (!cache['t' + t.id]) cache['t' + t.id] = t.tex().map(url);
      st.setProperty('--tex-claire', cache['t' + t.id][0]);
      st.setProperty('--tex-foncee', cache['t' + t.id][1]);
    } else {
      st.setProperty('--tex-claire', 'none');
      st.setProperty('--tex-foncee', 'none');
    }
  }
  function appliquerDecor(id) {
    const d = DECORS.find((x) => x.id === id) || DECORS[0];
    if (!d.dessiner) { document.body.style.backgroundImage = ''; document.body.classList.remove('avec-decor'); return; }
    if (!cache['d' + d.id]) cache['d' + d.id] = url(d.dessiner(W, H));
    document.body.style.backgroundImage = cache['d' + d.id];
    document.body.classList.add('avec-decor');
  }
  // petits aperçus pour l'écran Paramètres
  function apercuTheme(t) {
    const c = toile(120, 120), ctx = c.getContext('2d');
    const tex = t.tex ? (cache['p' + t.id] = cache['p' + t.id] || t.tex()) : null;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const clair = (x + y) % 2 === 0;
      if (tex) ctx.drawImage(tex[clair ? 0 : 1], x * 60, y * 60, 60, 60, x * 30, y * 30, 30, 30);
      else { ctx.fillStyle = clair ? t.claire : t.foncee; ctx.fillRect(x * 30, y * 30, 30, 30); }
    }
    return c;
  }
  function apercuDecor(d) {
    if (!d.dessiner) {
      const c = toile(160, 90), ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(48, 0, 5, 80, 45, 120);
      g.addColorStop(0, '#262a31'); g.addColorStop(1, '#17191d');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 160, 90);
      return c;
    }
    const grand = d.dessiner(480, 270);
    return grand;
  }

  window.Themes = { THEMES, DECORS, appliquerTheme, appliquerDecor, apercuTheme, apercuDecor };
})();
