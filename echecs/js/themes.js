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
      tex: () => [marbre('#f3ecdd', '#d9ccb0', 13, 512), bois('#332a26', '#171210', 31, 512)] },
    { id: 'cerisier', nom: 'Bois de cerisier', claire: '#f0d9c4', foncee: '#a45a3c',
      tex: () => [bois('#f3dfcb', '#dcbb9d', 41, 512), bois('#b0623f', '#6e3420', 43, 512)] },
    { id: 'flotte', nom: 'Bois flotté', claire: '#dcd8cf', foncee: '#8b8478',
      tex: () => [bois('#e2ded5', '#c4beb2', 51, 512), bois('#958e82', '#615b52', 53, 512)] },
    { id: 'ardoise', nom: 'Ardoise', claire: '#b9c0c6', foncee: '#4a535c',
      tex: () => [pierre('#c3c9ce', '#9aa2a9', 61, 384), pierre('#525b64', '#2e353c', 63, 384)] },
    { id: 'glace', nom: 'Marbre bleu', claire: '#e9eef3', foncee: '#5b7894',
      tex: () => [marbre('#eef2f6', '#a9b8c6', 71, 512), marbre('#5d7a96', '#2f4256', 73, 512)] },
    { id: 'olive', nom: 'Olive', claire: '#e9e7d0', foncee: '#7f8c55' },
    { id: 'lavande', nom: 'Lavande', claire: '#ece7f1', foncee: '#8a7ca8' },
    { id: 'nocturne', nom: 'Nocturne', claire: '#a9b1bf', foncee: '#3f4858' },
    // couleurs unies, totalement lisses et très lisibles
    { id: 'gris', nom: 'Gris uni', claire: '#e4e4e4', foncee: '#8f9298' },
    { id: 'ardoise-uni', nom: 'Bleu ardoise uni', claire: '#e1e7ee', foncee: '#56708c' },
    { id: 'sauge', nom: 'Vert sauge uni', claire: '#e9eee5', foncee: '#7d9a7a' },
    { id: 'sable-uni', nom: 'Sable uni', claire: '#f4ead7', foncee: '#c2a174' },
    { id: 'contraste', nom: 'Contraste fort', claire: '#ffffff', foncee: '#5a5a5a' },
    { id: 'turquoise', nom: 'Turquoise uni', claire: '#e3f1ef', foncee: '#4c958f' },
    { id: 'brique', nom: 'Brique uni', claire: '#f1e3da', foncee: '#a8644c' },
    { id: 'violet', nom: 'Violet uni', claire: '#ece8f3', foncee: '#6e5b96' }
  ];


  // ---------- outils pour les paysages ----------
  function degrade(ctx, x0, y0, x1, y1, arrets) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    arrets.forEach(([t, c]) => g.addColorStop(t, c));
    return g;
  }
  function halo(ctx, x, y, r0, r1, c0, c1) {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  // une chaîne de montagnes (pointu) ou de collines
  function chaine(ctx, B, w, base, haut, freq, coul, graine, pointu) {
    ctx.fillStyle = coul; ctx.beginPath(); ctx.moveTo(0, base + 2);
    for (let x = 0; x <= w; x += 3) {
      let n = B.fbm(x * freq + graine, graine * 0.37, 5);
      if (pointu) n = 1 - Math.abs(n * 2 - 1);
      ctx.lineTo(x, base - haut * n);
    }
    ctx.lineTo(w, base + 2); ctx.closePath(); ctx.fill();
  }
  // reflet du paysage au-dessus de « hor » dans l'eau en dessous, avec de petites vagues
  function reflet(ctx, w, h, hor, eau, B) {
    const copie = toile(w, h); copie.getContext('2d').drawImage(ctx.canvas, 0, 0);
    for (let y = hor; y < h; y += 2) {
      const d = y - hor, src = hor - d * 0.9;
      if (src < 0) break;
      const dec = (B.bruit(y * 0.12, 5) - 0.5) * (4 + d * 0.04);
      ctx.drawImage(copie, 0, src, w, 2, dec, y, w, 2);
    }
    ctx.fillStyle = degrade(ctx, 0, hor, 0, h, eau); ctx.fillRect(0, hor, w, h - hor);
    for (let y = hor + 3; y < h; y += 3 + (y - hor) * 0.02) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.05 * (1 - (y - hor) / (h - hor))).toFixed(3) + ')';
      ctx.fillRect(0, y, w, 1);
    }
  }
  function etoiles(ctx, w, h, n, graine, alphaMax) {
    const r = aleaGraine(graine);
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = r() * h, t = Math.pow(r(), 5);
      ctx.fillStyle = 'rgba(255,255,255,' + ((0.2 + r() * 0.8) * alphaMax).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, 0.4 + t * 1.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  function sapins(ctx, w, h, n, graine, coul, bas, petit, grand) {
    const r = aleaGraine(graine);
    ctx.fillStyle = coul;
    for (let i = 0; i < n; i++) {
      const x = r() * w, b = h * (bas + r() * 0.06), ht = petit + r() * (grand - petit);
      for (let k = 0; k < 5; k++) {
        const yb = b - ht * k / 5, l = ht * 0.3 * (1 - k / 6);
        ctx.beginPath(); ctx.moveTo(x - l, yb); ctx.lineTo(x + l, yb); ctx.lineTo(x, yb - ht * 0.32); ctx.fill();
      }
    }
  }

  const NOUVEAUX_DECORS = [
    { id: 'aube', nom: 'Aube sur le lac', dessiner(w, h) {
      const c = toile(w, h), ctx = c.getContext('2d'), B = creerBruit(101);
      const hor = h * 0.6;
      ctx.fillStyle = degrade(ctx, 0, 0, 0, hor, [[0, '#7f9cc4'], [0.45, '#c9b8d6'], [0.8, '#f6cdbb'], [1, '#fde6cf']]);
      ctx.fillRect(0, 0, w, hor);
      halo(ctx, w * 0.3, hor - 10, 5, w * 0.5, 'rgba(255,236,200,0.75)', 'rgba(255,220,190,0)');
      for (let y = 0; y < hor * 0.7; y += 2) for (let x = 0; x < w; x += 3) {
        const n = B.fbm(x * 0.0015, y * 0.01, 5);
        if (n > 0.6) { ctx.fillStyle = 'rgba(255,225,215,' + ((n - 0.6) * 1.2).toFixed(3) + ')'; ctx.fillRect(x, y, 3, 2); }
      }
      chaine(ctx, B, w, hor, h * 0.22, 0.0016, '#a7a3c4', 3, true);
      chaine(ctx, B, w, hor, h * 0.15, 0.0026, '#8a86ab', 9, true);
      chaine(ctx, B, w, hor, h * 0.07, 0.005, '#5f6487', 17, false);
      ctx.fillStyle = degrade(ctx, 0, hor - 40, 0, hor + 10, [[0, 'rgba(255,240,230,0)'], [1, 'rgba(255,240,230,0.55)']]);
      ctx.fillRect(0, hor - 40, w, 50);
      reflet(ctx, w, h, hor, [[0, 'rgba(120,130,170,0.25)'], [1, 'rgba(40,45,80,0.75)']], B);
      vignette(ctx, w, h, 0.35);
      return c;
    } },
    { id: 'neige', nom: 'Montagnes enneigées', dessiner(w, h) {
      const c = toile(w, h), ctx = c.getContext('2d'), B = creerBruit(211);
      ctx.fillStyle = degrade(ctx, 0, 0, 0, h, [[0, '#0d1834'], [0.45, '#2f4a7a'], [0.7, '#8d93bb'], [1, '#c7b3c8']]);
      ctx.fillRect(0, 0, w, h);
      etoiles(ctx, w, h * 0.4, 500, 7, 0.7);
      const pics = [['#9fb0d0', 0.82, 0.5, 0.0014, 4], ['#7488b3', 0.88, 0.38, 0.0022, 11], ['#4d618f', 0.95, 0.27, 0.0032, 23]];
      pics.forEach(([coul, base, haut, f, g]) => {
        const calque = toile(w, h), cx = calque.getContext('2d');
        chaine(cx, B, w, h * base, h * haut, f, coul, g, true);
        cx.globalCompositeOperation = 'source-atop';
        cx.fillStyle = degrade(cx, 0, h * (base - haut), 0, h * (base - haut * 0.45), [[0, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]);
        cx.fillRect(0, 0, w, h);
        ctx.drawImage(calque, 0, 0);
      });
      ctx.fillStyle = '#1b2440'; ctx.fillRect(0, h * 0.95, w, h * 0.05);
      sapins(ctx, w, h, 70, 5, '#141b33', 0.93, 40, 130);
      vignette(ctx, w, h, 0.45);
      return c;
    } },
    { id: 'ocean', nom: 'Océan sous la lune', dessiner(w, h) {
      const c = toile(w, h), ctx = c.getContext('2d'), B = creerBruit(307);
      const hor = h * 0.58;
      ctx.fillStyle = degrade(ctx, 0, 0, 0, hor, [[0, '#050a1a'], [0.6, '#13254a'], [1, '#2c4670']]);
      ctx.fillRect(0, 0, w, hor);
      etoiles(ctx, w, hor * 0.9, 900, 11, 0.9);
      const lx = w * 0.7, ly = h * 0.2;
      halo(ctx, lx, ly, 20, w * 0.35, 'rgba(210,225,255,0.35)', 'rgba(210,225,255,0)');
      ctx.fillStyle = '#f2f4ff'; ctx.beginPath(); ctx.arc(lx, ly, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(190,200,225,0.35)';
      [[-8, -6, 7], [10, 8, 5], [4, -14, 4]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(lx + dx, ly + dy, r, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = degrade(ctx, 0, hor, 0, h, [[0, '#1d3157'], [1, '#050a16']]);
      ctx.fillRect(0, hor, w, h - hor);
      for (let y = hor; y < h; y += 2) {
        const p = (y - hor) / (h - hor);
        for (let x = 0; x < w; x += 6) {
          const n = B.fbm(x * 0.01 / (0.3 + p), y * 0.08 / (0.3 + p), 3);
          const pres = Math.exp(-Math.pow((x - lx) / (40 + p * 260), 2));
          const a = (n > 0.55 ? (n - 0.55) * 2.5 : 0) * (0.15 + pres * 0.85);
          if (a > 0.02) { ctx.fillStyle = 'rgba(220,230,255,' + Math.min(0.9, a).toFixed(3) + ')'; ctx.fillRect(x, y, 6, 1.5); }
        }
      }
      vignette(ctx, w, h, 0.5);
      return c;
    } },
    { id: 'dunes', nom: 'Dunes au crépuscule', dessiner(w, h) {
      const c = toile(w, h), ctx = c.getContext('2d'), B = creerBruit(401);
      ctx.fillStyle = degrade(ctx, 0, 0, 0, h * 0.6, [[0, '#2a1c3d'], [0.5, '#8a4a5a'], [0.85, '#e0895a'], [1, '#f6c27c']]);
      ctx.fillRect(0, 0, w, h);
      halo(ctx, w * 0.45, h * 0.56, 10, w * 0.4, 'rgba(255,215,150,0.7)', 'rgba(255,180,120,0)');
      const couches = [[0.58, 0.08, '#b8704f', '#8f4f3a'], [0.68, 0.12, '#a35d42', '#6f3a2b'], [0.8, 0.14, '#80452f', '#4e281c'], [0.93, 0.16, '#5a2f21', '#311810']];
      couches.forEach(([base, amp, clair, sombre], i) => {
        ctx.beginPath(); ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) ctx.lineTo(x, h * base - h * amp * (0.5 + 0.5 * Math.sin(x * (0.004 + i * 0.001) + i * 2 + B.fbm(x * 0.002, i, 3) * 3)));
        ctx.lineTo(w, h); ctx.closePath();
        ctx.fillStyle = degrade(ctx, 0, h * (base - amp), 0, h, [[0, clair], [1, sombre]]); ctx.fill();
      });
      vignette(ctx, w, h, 0.45);
      return c;
    } },
    { id: 'aurore', nom: 'Aurore boréale', dessiner(w, h) {
      const c = toile(w, h), ctx = c.getContext('2d'), B = creerBruit(503);
      ctx.fillStyle = degrade(ctx, 0, 0, 0, h, [[0, '#020611'], [0.6, '#0a1a2c'], [1, '#132a3a']]);
      ctx.fillRect(0, 0, w, h);
      etoiles(ctx, w, h * 0.7, 1200, 13, 0.85);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let x = 0; x < w; x += 2) {
        const yc = h * (0.3 + 0.12 * Math.sin(x * 0.003) + 0.08 * (B.fbm(x * 0.002, 1, 4) - 0.5));
        const force = Math.pow(B.fbm(x * 0.006, 7, 4), 2) * 1.6;
        const haut = h * (0.18 + 0.15 * B.fbm(x * 0.004, 3, 3));
        const g = ctx.createLinearGradient(0, yc - haut, 0, yc + 30);
        g.addColorStop(0, 'rgba(120,60,200,0)'); g.addColorStop(0.25, 'rgba(130,80,210,' + Math.min(0.2, 0.05 + 0.15 * force).toFixed(3) + ')'); g.addColorStop(0.55, 'rgba(60,220,170,' + Math.min(0.55, 0.1 + 0.45 * force).toFixed(3) + ')'); g.addColorStop(1, 'rgba(80,255,170,0)');
        ctx.fillStyle = g; ctx.fillRect(x, yc - haut, 2, haut + 30);
      }
      ctx.restore();
      chaine(ctx, B, w, h * 0.86, h * 0.14, 0.002, '#0f1d2a', 31, false);
      ctx.fillStyle = '#07101a'; ctx.fillRect(0, h * 0.86, w, h * 0.14);
      sapins(ctx, w, h, 50, 21, '#050b12', 0.88, 30, 90);
      vignette(ctx, w, h, 0.5);
      return c;
    } },
    { id: 'collines', nom: 'Collines au matin', dessiner(w, h) {
      const c = toile(w, h), ctx = c.getContext('2d'), B = creerBruit(607);
      ctx.fillStyle = degrade(ctx, 0, 0, 0, h, [[0, '#a9c3d6'], [0.5, '#dfe5df'], [1, '#f1ead9']]);
      ctx.fillRect(0, 0, w, h);
      halo(ctx, w * 0.75, h * 0.3, 10, w * 0.45, 'rgba(255,248,225,0.8)', 'rgba(255,248,225,0)');
      const couches = [['#b9cbc4', 0.5, 0.14, 0.0018], ['#97b2a3', 0.62, 0.15, 0.0024], ['#6f9580', 0.74, 0.16, 0.003], ['#4c735d', 0.87, 0.17, 0.0036], ['#2f4f3e', 1.0, 0.18, 0.0044]];
      couches.forEach(([coul, base, haut, f], i) => {
        chaine(ctx, B, w, h * base, h * haut, f, coul, 41 + i * 13, false);
        ctx.fillStyle = degrade(ctx, 0, h * (base - haut), 0, h * base, [[0, 'rgba(240,240,232,0)'], [1, 'rgba(240,240,232,' + (0.5 - i * 0.08).toFixed(2) + ')']]);
        ctx.fillRect(0, h * (base - haut), w, h * haut);
      });
      vignette(ctx, w, h, 0.3);
      return c;
    } }
  ];


  // ---------- décors « geek » ----------
  const LIGNES_CODE = [
    'function evaluer(position, profondeur) {', '  if (profondeur === 0) return statique(position);', '  let meilleur = -Infinity;',
    '  for (const coup of position.coupsLegaux()) {', '    position.jouer(coup);', '    const v = -evaluer(position, profondeur - 1);',
    '    position.annuler();', '    if (v > meilleur) meilleur = v;', '  }', '  return meilleur;', '}', '',
    'const table = new Map();', 'while (temps.restant() > 0) {', '  profondeur++;', '  score = alphaBeta(-INF, INF, profondeur);',
    '  console.log(`prof ${profondeur} : ${score}`);', '}', 'for (let i = 0; i < 64; i++) bitboard |= 1n << BigInt(i);',
    'if (roi.enEchec()) return MAT;', 'export default class Moteur {', '  constructor(taille = 8) {', '    this.cases = new Uint8Array(taille * taille);',
    '  }', 'return hash ^ cleZobrist[piece][caseIndex];', 'const pv = lignes.map(l => l.coups.join(" "));', 'await worker.postMessage({ go: true });',
    '0x3F8A 0x00C1 0xFFE2 0x7B10 0x9D4C', 'git commit -m "plus rapide"', '$ npm run build && ./moteur --threads 8'
  ];
  function code(w, h) {
    const c = toile(w, h), ctx = c.getContext('2d'), r = aleaGraine(901);
    ctx.fillStyle = '#040805'; ctx.fillRect(0, 0, w, h);
    const tailles = [13, 15, 17];
    for (let col = 0; col < 4; col++) {
      const x0 = 30 + col * (w / 4);
      let y = 20 + r() * 20, i = Math.floor(r() * LIGNES_CODE.length);
      const t = tailles[col % 3];
      ctx.font = t + 'px Consolas, "Courier New", monospace';
      while (y < h - 10) {
        const l = LIGNES_CODE[i++ % LIGNES_CODE.length];
        const vif = r() < 0.08;
        ctx.fillStyle = vif ? 'rgba(170,255,190,0.85)' : 'rgba(46,200,100,' + (0.25 + r() * 0.35).toFixed(2) + ')';
        ctx.fillText(l, x0 + (l.match(/^ */)[0].length) * 2, y);
        y += t * 1.45;
      }
    }
    halo(ctx, w / 2, h / 2, 50, w * 0.7, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.55)');
    return c;
  }
  function marches(w, h) {
    const c = toile(w, h), ctx = c.getContext('2d'), r = aleaGraine(77), B = creerBruit(5);
    ctx.fillStyle = '#070c16'; ctx.fillRect(0, 0, w, h);
    const panneaux = [[0.03, 0.05, 0.45, 0.42], [0.52, 0.05, 0.45, 0.42], [0.03, 0.52, 0.45, 0.42], [0.52, 0.52, 0.45, 0.42]];
    const noms = ['EUR/USD', 'BTC/USD', 'CAC 40', 'OR'];
    panneaux.forEach(([px, py, pw, ph], k) => {
      const X = px * w, Y = py * h, W = pw * w, H = ph * h;
      ctx.fillStyle = 'rgba(20,30,50,0.6)'; ctx.fillRect(X, Y, W, H);
      ctx.strokeStyle = 'rgba(90,120,170,0.15)'; ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(X, Y + H * i / 6); ctx.lineTo(X + W, Y + H * i / 6); ctx.stroke(); }
      for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(X + W * i / 10, Y); ctx.lineTo(X + W * i / 10, Y + H); ctx.stroke(); }
      let v = 0.5;
      const n = 48, bw = W / n;
      for (let i = 0; i < n; i++) {
        const o = v; v = Math.max(0.1, Math.min(0.9, v + (B.bruit(i * 0.3, k * 9) - 0.5) * 0.12 + (r() - 0.5) * 0.04));
        const haut = Math.max(o, v) + r() * 0.04, bas = Math.min(o, v) - r() * 0.04;
        const monte = v >= o, x = X + i * bw + bw / 2;
        ctx.strokeStyle = ctx.fillStyle = monte ? 'rgba(46,204,113,0.75)' : 'rgba(231,76,60,0.75)';
        ctx.beginPath(); ctx.moveTo(x, Y + H * (1 - haut)); ctx.lineTo(x, Y + H * (1 - bas)); ctx.stroke();
        ctx.fillRect(x - bw * 0.3, Y + H * (1 - Math.max(o, v)), bw * 0.6, Math.max(1, H * Math.abs(v - o)));
      }
      ctx.font = '600 16px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(200,215,240,0.6)'; ctx.fillText(noms[k], X + 10, Y + 22);
      const pct = ((r() - 0.4) * 3).toFixed(2);
      ctx.fillStyle = pct >= 0 ? 'rgba(46,204,113,0.8)' : 'rgba(231,76,60,0.8)';
      ctx.fillText((pct >= 0 ? '▲ +' : '▼ ') + pct + ' %', X + 110, Y + 22);
    });
    halo(ctx, w / 2, h / 2, 60, w * 0.75, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.5)');
    return c;
  }
  const FORMULES = ['∫₀^∞ e^(−x²) dx = √π / 2', 'Σ 1/n² = π² / 6', 'e^(iπ) + 1 = 0', '∇ · E = ρ / ε₀', 'f(x) = Σ aₙ (x − a)ⁿ',
    'det(A − λI) = 0', 'lim (1 + 1/n)ⁿ = e', '∂u/∂t = α ∇²u', 'P(A|B) = P(B|A) P(A) / P(B)', 'x = (−b ± √(b² − 4ac)) / 2a',
    'ζ(s) = Σ n^(−s)', '∮ B · dl = μ₀ I', '10^120 parties possibles', 'Γ(n) = (n − 1)!', 'φ = (1 + √5) / 2', 'O(b^d) → O(b^(d/2))'];
  function calculs(w, h) {
    const c = toile(w, h), ctx = c.getContext('2d'), r = aleaGraine(313);
    ctx.fillStyle = degrade(ctx, 0, 0, 0, h, [[0, '#0a1222'], [1, '#0d1a2e']]); ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,160,220,0.07)'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    // courbes
    [['rgba(90,200,255,0.35)', 0.008, 60, 0.3], ['rgba(255,170,90,0.3)', 0.004, 110, 0.65], ['rgba(160,255,170,0.25)', 0.013, 30, 0.85]].forEach(([coul, f, a, base]) => {
      ctx.strokeStyle = coul; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x <= w; x += 4) { const y = h * base + Math.sin(x * f) * a * Math.cos(x * f * 0.31); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    });
    for (let i = 0; i < 26; i++) {
      const t = 16 + Math.floor(r() * 16);
      ctx.font = 'italic ' + t + 'px "Cambria Math", "Times New Roman", serif';
      ctx.fillStyle = 'rgba(' + (r() < 0.5 ? '220,235,255' : '140,220,255') + ',' + (0.18 + r() * 0.4).toFixed(2) + ')';
      ctx.fillText(FORMULES[i % FORMULES.length], r() * (w - 300), 30 + r() * (h - 40));
    }
    halo(ctx, w / 2, h / 2, 60, w * 0.75, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.45)');
    return c;
  }
  function circuit(w, h) {
    const c = toile(w, h), ctx = c.getContext('2d'), r = aleaGraine(55);
    ctx.fillStyle = '#06281a'; ctx.fillRect(0, 0, w, h);
    const pas = 24;
    ctx.lineCap = 'round';
    for (let i = 0; i < 140; i++) {
      let x = Math.round(r() * w / pas) * pas, y = Math.round(r() * h / pas) * pas;
      ctx.strokeStyle = 'rgba(214,170,80,' + (0.25 + r() * 0.35).toFixed(2) + ')';
      ctx.lineWidth = r() < 0.2 ? 4 : 2;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        const dir = Math.floor(r() * 4), long = pas * (2 + Math.floor(r() * 6));
        if (dir === 0) x += long; else if (dir === 1) x -= long; else if (dir === 2) y += long; else y -= long;
        if (r() < 0.4) { x += (r() < 0.5 ? 1 : -1) * pas; y += (r() < 0.5 ? 1 : -1) * pas; }
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(230,190,100,0.6)';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 9; i++) {
      const x = r() * (w - 140), y = r() * (h - 100), cw = 70 + r() * 80, ch = 50 + r() * 50;
      ctx.fillStyle = 'rgba(15,15,18,0.9)'; ctx.fillRect(x, y, cw, ch);
      ctx.fillStyle = 'rgba(200,200,210,0.5)';
      for (let k = 6; k < cw - 4; k += 10) { ctx.fillRect(x + k, y - 6, 4, 6); ctx.fillRect(x + k, y + ch, 4, 6); }
    }
    halo(ctx, w / 2, h / 2, 60, w * 0.75, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.55)');
    return c;
  }
  const uni = (couleur) => (w, h) => { const c = toile(w, h), ctx = c.getContext('2d'); ctx.fillStyle = couleur; ctx.fillRect(0, 0, w, h); return c; };
  const DECORS_EN_PLUS = [
    { id: 'uni-nuit', nom: 'Uni anthracite', dessiner: uni('#1c1f24') },
    { id: 'uni-bleu', nom: 'Uni bleu nuit', dessiner: uni('#152235') },
    { id: 'uni-vert', nom: 'Uni vert sapin', dessiner: uni('#16291f') },
    { id: 'uni-prune', nom: 'Uni prune', dessiner: uni('#251c2b') },
    { id: 'uni-gris', nom: 'Uni gris doux', dessiner: uni('#3a3d43') },
    { id: 'code', nom: 'Code vert', ambiance: 'ordinateur', dessiner: code },
    { id: 'marches', nom: 'Salle des marchés', ambiance: 'ordinateur', dessiner: marches },
    { id: 'calculs', nom: 'Calculs extrêmes', ambiance: 'ordinateur', dessiner: calculs },
    { id: 'circuit', nom: 'Circuit imprimé', ambiance: 'ordinateur', dessiner: circuit }
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
    ...NOUVEAUX_DECORS,
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
    } },
    ...DECORS_EN_PLUS
  ];

  // son d'ambiance de chaque décor (les décors unis restent silencieux)
  const AMBIANCES = { table: 'feu', etoiles: 'grillons', couchant: 'vagues', foret: 'foret', aube: 'vagues', neige: 'vent',
    ocean: 'vagues', dunes: 'vent', aurore: 'vent', collines: 'foret' };
  DECORS.forEach((x) => { if (x.ambiance === undefined && AMBIANCES[x.id]) x.ambiance = AMBIANCES[x.id]; });

  // ---------- vrais plateaux en photo (Lichess) et vrais paysages (Poly Haven, domaine public) ----------
  const PHOTOS_PLATEAU = [
    ['s-lave', 'Lave en fusion', 's-lave', '#ac442e', '#483d33', 'claire'], ['s-volcan', 'Volcan', 's-volcan', '#b3a18c', '#4a383b', 'foncee'],
    ['s-plage', 'Plage', 's-plage', '#c2ab88', '#564c3d'], ['s-foret', 'Sous-bois', 's-foret', '#cfa958', '#594b38'],
    ['s-desert', 'Désert', 's-desert', '#c1a89c', '#624832'], ['s-neige', 'Neige et roche', 's-neige', '#aeaeb0', '#483d33'],
    ['s-marais', 'Mousse et boue', 's-marais', '#b3b090', '#564b3d'], ['s-prairie', 'Prairie et terre', 's-prairie', '#ae862e', '#534c43'],
    ['p-canvas2', 'Toile bleue', 'canvas2', '#cbcedf', '#71819c']
  ];
  PHOTOS_PLATEAU.forEach(([id, nom, photo, claire, foncee, lave]) => THEMES.push({ id, nom, photo, claire, foncee, lave }));
  const PHOTOS_DECOR = [
    ['ph-venise', 'Coucher de soleil sur la mer', 'venice_sunset'], ['ph-plage', 'Lever de soleil sur la plage', 'umhlanga_sunrise'],
    ['ph-ciel-feu', 'Ciel en feu', 'the_sky_is_on_fire'], ['ph-aube', 'Aube rose en montagne', 'kiara_1_dawn'],
    ['ph-brume', 'Matin dans la brume', 'spruit_sunrise'], ['ph-alpes', 'Prairie des Alpes', 'alps_field'],
    ['ph-foret', 'Lisière de forêt', 'lilienstein'], ['ph-voie-lactee', 'Voie lactée', 'rogland_clear_night']
  ];
  const AMB_PHOTOS = { 'ph-venise': 'vagues', 'ph-plage': 'vagues', 'ph-ciel-feu': 'vagues', 'ph-aube': 'vent', 'ph-brume': 'foret', 'ph-alpes': 'vent', 'ph-foret': 'foret', 'ph-voie-lactee': 'grillons' };
  PHOTOS_DECOR.forEach(([id, nom, photo]) => DECORS.push({ id, nom, photo, dessiner: null, ambiance: AMB_PHOTOS[id] }));

  // trois groupes de 8 dans les Paramètres
  const GROUPES = [['calme', '🧘 Pour se concentrer'], ['realiste', '📷 Très réalistes'], ['populaire', '⭐ Populaires']];
  const RANG_THEMES = {
    calme: ['gris', 'sauge', 'ardoise-uni', 'sable-uni', 'olive', 'lavande', 'nocturne', 'turquoise'],
    realiste: ['s-lave', 's-volcan', 's-plage', 's-foret', 's-desert', 's-neige', 's-marais', 's-prairie'],
    populaire: ['sable', 'tournoi', 'ocean', 'violet', 'chene', 'ebene', 'marbre', 'p-canvas2']
  };
  const RANG_DECORS = {
    calme: ['nuit', 'uni-nuit', 'uni-bleu', 'uni-vert', 'uni-prune', 'uni-gris', 'feutre', 'foret'],
    realiste: PHOTOS_DECOR.map((x) => x[0]),
    populaire: ['couchant', 'aube', 'ocean', 'neige', 'aurore', 'etoiles', 'collines', 'code']
  };
  function ranger(liste, rangs) {
    const out = [];
    for (const [g] of GROUPES) for (const id of rangs[g]) { const x = liste.find((t) => t.id === id); if (x) { x.groupe = g; out.push(x); } }
    return out;
  }
  const THEMES_MONTRES = ranger(THEMES, RANG_THEMES);
  const DECORS_MONTRES = ranger(DECORS, RANG_DECORS);

  // ---------- calme : tout doit aider à se concentrer ----------
  // textures du plateau adoucies (moins de contraste dans le grain)
  function adoucir(c, couleur, force) {
    const r = toile(c.width, c.height), x = r.getContext('2d');
    x.drawImage(c, 0, 0);
    x.globalAlpha = force; x.fillStyle = couleur; x.fillRect(0, 0, c.width, c.height);
    return r;
  }
  function texDe(t) { const [a, b] = t.tex(); return [adoucir(a, t.claire, 0.45), adoucir(b, t.foncee, 0.45)]; }
  // décors : flous, moins colorés, plus sombres derrière le plateau
  const AGITES = { etoiles: 1, marbre: 1, code: 1, marches: 1, calculs: 1, circuit: 1, table: 1 };
  function calmer(c, d) {
    if (String(d.id).startsWith('uni')) return c;
    const fort = AGITES[d.id] ? 1 : 0;
    const k = c.width / 1600;
    const r = toile(c.width, c.height), x = r.getContext('2d');
    x.filter = 'blur(' + ((fort ? 5 : 2.5) * k).toFixed(2) + 'px) saturate(' + (fort ? 0.45 : 0.75) + ') brightness(' + (fort ? 0.62 : 0.82) + ')';
    x.drawImage(c, 0, 0);
    x.filter = 'none';
    const g = x.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.1, c.width / 2, c.height / 2, c.width * 0.7);
    g.addColorStop(0, 'rgba(12,14,18,' + (fort ? 0.5 : 0.32) + ')'); g.addColorStop(1, 'rgba(12,14,18,0.08)');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    return r;
  }

  // ---------- application ----------
  const cache = {};
  function url(c) { return 'url("' + c.toDataURL('image/jpeg', 0.9) + '")'; }
  function appliquerTheme(id) {
    const t = THEMES_MONTRES.find((x) => x.id === id) || THEMES[0];
    const st = document.documentElement.style;
    st.setProperty('--claire', t.claire);
    st.setProperty('--foncee', t.foncee);
    document.body.classList.toggle('plateau-photo', !!t.photo);
    // lave qui coule : les cases de lave bougent lentement et rougeoient
    document.body.classList.toggle('lave-claire', t.lave === 'claire');
    document.body.classList.toggle('lave-foncee', t.lave === 'foncee');
    if (t.lave) st.setProperty('--lave', 'url("' + new URL('skins/plateaux/' + t.photo + '-lave.jpg', location.href).href + '")');
    if (t.photo) {
      st.setProperty('--photo-claire', 'url("' + new URL('skins/plateaux/' + t.photo + '-c.jpg', location.href).href + '")');
      st.setProperty('--photo-foncee', 'url("' + new URL('skins/plateaux/' + t.photo + '-f.jpg', location.href).href + '")');
      st.setProperty('--tex-claire', 'none');
      st.setProperty('--tex-foncee', 'none');
    } else if (t.tex) {
      if (!cache['t' + t.id]) cache['t' + t.id] = texDe(t).map(url);
      st.setProperty('--tex-claire', cache['t' + t.id][0]);
      st.setProperty('--tex-foncee', cache['t' + t.id][1]);
    } else {
      st.setProperty('--tex-claire', 'none');
      st.setProperty('--tex-foncee', 'none');
    }
  }
  function appliquerDecor(id) {
    const d = DECORS_MONTRES.find((x) => x.id === id) || DECORS[0];
    if (d.photo) { document.body.style.backgroundImage = 'linear-gradient(rgba(10,12,16,.38), rgba(10,12,16,.38)), url("skins/decors/' + d.photo + '.jpg")'; document.body.classList.add('avec-decor'); return; }
    if (!d.dessiner) { document.body.style.backgroundImage = ''; document.body.classList.remove('avec-decor'); return; }
    if (!cache['d' + d.id]) cache['d' + d.id] = url(calmer(d.dessiner(W, H), d));
    document.body.style.backgroundImage = cache['d' + d.id];
    document.body.classList.add('avec-decor');
  }
  // petits aperçus pour l'écran Paramètres
  function apercuTheme(t) {
    const c = toile(160, 100), ctx = c.getContext('2d');
    if (t.photo) {
      const a = new Image(), b = new Image();
      let n = 0;
      const fin = () => {
        if (++n < 2) return;
        for (let y = 0; y < 5; y++) for (let x = 0; x < 8; x++) {
          const im = (x + y) % 2 === 0 ? a : b, v = (x * 7 + y * 3) % 4;
          ctx.drawImage(im, v * 128, 0, 128, 128, x * 20, y * 20, 20, 20);
        }
      };
      a.onload = fin; b.onload = fin;
      a.src = 'skins/plateaux/' + t.photo + '-c.jpg'; b.src = 'skins/plateaux/' + t.photo + '-f.jpg';
      return c;
    }
    const tex = t.tex ? (cache['p' + t.id] = cache['p' + t.id] || texDe(t)) : null;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 8; x++) {
      const clair = (x + y) % 2 === 0;
      if (tex) { const im = tex[clair ? 0 : 1], pas = (im.width - 40) / 8; ctx.drawImage(im, x * pas, y * pas, 40, 40, x * 20, y * 20, 20, 20); }
      else { ctx.fillStyle = clair ? t.claire : t.foncee; ctx.fillRect(x * 20, y * 20, 20, 20); }
    }
    return c;
  }
  function apercuDecor(d) {
    if (d.photo) {
      const c = toile(160, 90), ctx = c.getContext('2d'), im = new Image();
      im.onload = () => ctx.drawImage(im, 0, 0, 160, 90);
      im.src = 'skins/decors/' + d.photo + '.jpg';
      return c;
    }
    if (!d.dessiner) {
      const c = toile(160, 90), ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(48, 0, 5, 80, 45, 120);
      g.addColorStop(0, '#262a31'); g.addColorStop(1, '#17191d');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 160, 90);
      return c;
    }
    return calmer(d.dessiner(480, 270), d);
  }

  window.Themes = { THEMES: THEMES_MONTRES, DECORS: DECORS_MONTRES, GROUPES, appliquerTheme, appliquerDecor, apercuTheme, apercuDecor };
})();
