'use strict';
/* Colosses — accueil : un premier clic choisit le mode (on voit son boss et ses règles), un second clic le lance.
   Le boss du mode choisi est mis en scène dans un grand décor lumineux (ciel, soleil, montagnes, îles flottantes). */

// ---------- quel boss attend dans chaque mode ----------
const MODES_MENU = { jouerDiff: b => 'diff:' + b.dataset.d, defi: b => 'defi:' + b.dataset.t, survie: () => 'survie', abysses: () => 'abysses', chasse: () => 'chasse' };
function selMenu() {
  let k = Save.d.menuSel || 'diff:' + Save.d.diff;
  if ((k === 'abysses' && !modeOuvert('abysses')) || (k === 'chasse' && !modeOuvert('chasse'))) k = 'diff:' + Save.d.diff;
  if (k.startsWith('diff:') && k !== 'diff:' + Save.d.diff) k = 'diff:' + Save.d.diff;
  return k;
}
// le boss du mode choisi (même graine que le vrai combat)
function bossSel(k) {
  try {
    if (k === 'defi:jour') {
      const x = defiCourant('jour'), b = x.boss[0];
      if (b) return { salle: b.salle, seed: b.seed, mega: b.mega, esp: b.esp, cle: k + x.cle };
      return { salle: 2, seed: RNG(hashStr(x.cle + ':0')).int(1, 2e9), mega: false, cle: k + x.cle };
    }
    if (k === 'affront') { const n = Affront.prochain(); return { salle: Affront.salle(), seed: n.seed, mega: true, cle: 'af' + n.seed }; }
    if (k === 'chasse') { const c = chasseCourante(); return { salle: clamp(PR().palier * 5 + 1, 8, 30), seed: hashStr('chasse-boss-' + c.cle), esp: c.esp, mega: false, cle: k + c.cle }; }
    if (k === 'survie') {
      const r = Save.d.survieRun; if (r && r.seed) return { salle: 10, seed: r.seed, esp: r.esp, mega: false, cle: 'sv' + r.seed };
      const n = Save.d.survieProchain = Save.d.survieProchain || { esp: R.pick(ESP_TOUTES()), seed: R.int(1, 2e9) };
      return { salle: 10, seed: n.seed, esp: n.esp, mega: false, cle: 'sv' + n.seed };
    }
    if (k === 'abysses') {
      const r = Save.d.abyssesRun; if (r && r.boss && r.boss[r.i]) { const b = r.boss[r.i]; return { salle: b.salle, seed: b.seed, mega: b.mega, cle: 'ab' + b.seed }; }
      const i = G.repriseAbysses(), n = Save.d.abyssesProchain = Save.d.abyssesProchain || { seed: R.int(1, 2e9) };
      return { salle: 2 + i + Math.floor(i * i / 5), seed: n.seed, mega: false, cle: 'ab' + n.seed + ':' + i };
    }
  } catch (e) { }
  const rb = G.preparerBoss();
  return { salle: rb.salle, seed: rb.seed, mega: rb.salle % 5 === 0, eviter: rb.eviter, leg: rb.leg, cle: Save.d.diff + '|' + rb.salle + '|' + rb.seed };
}
let _defSel = null;
function defSel() {
  const k = selMenu(), s = bossSel(k);
  if (!_defSel || _defSel.cle !== s.cle) {
    let def; ESP_FORCE = s.esp || null; try { def = genBoss(s.salle, s.seed, s.mega, s.eviter || []); } finally { ESP_FORCE = null; }
    def.legendaire = s.leg;
    _defSel = { cle: s.cle, def, salle: s.salle };
  }
  return _defSel;
}

// ---------- premier clic : choisir ; second clic : lancer ----------
const _actMenu2 = UI.action;
UI.action = function (a, btn) {
  if (MODES_MENU[a] && G.etat === 'menu' && btn && btn.closest && btn.closest('.accueil')) {
    const k = MODES_MENU[a](btn);
    if (selMenu() !== k) {
      Save.d.menuSel = k;
      if (a === 'jouerDiff') { Save.d.diff = btn.dataset.d; calcStats(); }
      Save.write();
      majSelection(); return;
    }
  }
  return _actMenu2.call(this, a, btn);
};
const T2 = s => (typeof Langue !== 'undefined' && Langue.t ? Langue.t(s) : s);
function ligneArmes(ars) {
  if (!ars) return '';
  const n = (c, id) => { const a = trouveArme(c, id); return a ? a.nom : id; };
  return `<p class="am-armes">⚔ ${T2('Armes imposées')} : ${[n('p', ars.p), n('s', ars.s), n('t', ars.t)].join(' · ')}</p>`;
}
function texteSel(k) {
  const d = Save.d, D = defSel(), def = D.def;
  let titre = '', regles = [], rec = '';
  if (k.startsWith('diff:')) {
    const v = DIFFS[d.diff]; titre = v.ico + ' ' + v.nom; regles.push(v.desc);
    if ((d.reprises || {})['normal:' + d.diff]) regles.push(T2('Combat en cours : tu le reprends où tu l\'as laissé.'));
  } else if (k === 'defi:jour') {
    const x = defiCourant('jour'), F = FORMATS[x.format], r = d.defis.jour, bon = r && r.cle === x.cle && r.format === x.format && r.best ? r.best : null;
    titre = '📅 ' + T2('Défi du jour') + ' — ' + F.nom; regles.push(F.obj);
    for (const m of x.mut) regles.push(MUTATEURS[m].ico + ' <b>' + MUTATEURS[m].nom + '</b> : ' + MUTATEURS[m].desc);
    if (x.boss.length > 1) regles.push(x.boss.length + ' ' + T2('boss à la suite'));
    const o = typeof objectifJour === 'function' ? objectifJour(x) : null;
    rec = (bon ? '🏆 ' + T2('Ton record') + ' : ' + F.fmt(bon.score) + '<br>' : '') + (o !== null ? '👑 ' + T2('Record du Colosse') + ' : ' + F.fmt(o) + (r && r.couronne ? ' ✔' : ' (' + T2('presque impossible') + ')') : '');
    if (x.boss[0] && x.format !== 'danse') regles.push(ligneArmes(x.boss[0].ars));
  } else if (k === 'survie') {
    titre = '🛡 ' + T2('Survie'); regles.push(FORMATS.survie.obj, T2('Le boss s\'adapte à la force de tes armes.'));
    if (d.survieRun) regles.push(T2('Partie en cours : tu la reprends où tu l\'as laissée.'));
    const r = d.defis.survie; if (r && r.best && r.best.score !== undefined) rec = '🏆 ' + T2('Ton record') + ' : ' + fmtTemps(r.best.score);
  } else if (k === 'abysses') {
    titre = '🌌 ' + T2('Abysses'); regles.push(FORMATS.abysses.obj);
    if (d.abyssesRun) regles.push(T2('Descente en cours : profondeur') + ' ' + d.abyssesRun.i); else if (G.repriseAbysses()) regles.push(T2('Tu repars avec') + ' ' + G.repriseAbysses() + ' ' + T2('boss vaincus'));
    if ((d.abysses || {}).best) rec = '🏆 ' + T2('Ton record') + ' : ' + T2('profondeur') + ' ' + d.abysses.best;
  } else if (k === 'affront') {
    const n = Affront.prochain(), P = profilAff(); titre = '⚔ ' + T2('Affrontement') + ' · ' + P.n + ' ' + T2('joueurs'); regles.push(FORMATS.affront.obj, T2('En ligne, contre de vrais joueurs de ton niveau (ou tes amis). Mourir te fait perdre 15 % de tes dégâts, tu reviens 4 s plus tard. 3 minutes au plus.'), ligneArmes(n.ars));
    rec = htmlRang(P.pts) + ' · ' + P.pts + ' pts · ' + P.v + ' V · ' + P.dft + ' D<br><small>' + saisonAff().nom + ' · ' + T2('fin le') + ' ' + saisonAff().fin.toLocaleDateString('fr-FR') + '</small>';
  } else if (k === 'chasse') {
    const c = chasseCourante(); titre = '🎯 ' + T2('Chasse'); regles.push(FORMATS.chasse.obj, T2('Le boss se téléporte, fait surgir des obstacles et se met en garde.'));
    if (c.bestP) rec = '🏆 ' + T2('Ton meilleur') + ' : ' + fmtPct(c.bestP);
  }
  try { const md = k.startsWith('diff:') ? 'normal' : k === 'defi:jour' ? 'jour' : k, av = typeof areneVivanteDe === 'function' ? areneVivanteDe(def, md) : null; if (av) regles.push('<b>' + AV_TYPES[av].ico + ' ' + T2('Arène vivante') + ' : ' + T2(AV_TYPES[av].nom) + '</b> — ' + T2(AV_TYPES[av].desc)); } catch (e) { }
  return `<div class="am-mode">${titre}</div>
    <div class="am-boss" style="--h:${def.hue}"><b>${def.nom}</b><span>${def.titre}${def.mega ? ' — ' + T2('méga boss') : ''} · ${T2('salle')} ${D.salle}</span></div>
    <div class="am-regles">${regles.filter(Boolean).map(t => t.startsWith('<p') ? t : '<p>' + t + '</p>').join('')}</div>
    ${rec ? `<div class="am-rec">${rec}</div>` : ''}
    <div class="am-go">${T2('Clique encore sur la tuile pour lancer')}</div>`;
}
function majSelection() {
  const el = UI.el; if (!el || G.etat !== 'menu') return;
  const acc = el.querySelector('.accueil'); if (!acc) return;
  const k = selMenu();
  acc.querySelectorAll('.choisi').forEach(b => b.classList.remove('choisi'));
  acc.querySelectorAll('.lancer').forEach(b => b.remove());
  acc.querySelectorAll('[data-def]').forEach(b => b.removeAttribute('data-def'));
  let sel = null;
  acc.querySelectorAll('[data-a]').forEach(b => { const f = MODES_MENU[b.dataset.a]; if (f && f(b) === k) sel = b; });
  if (sel) { sel.classList.add('choisi'); sel.setAttribute('data-def', ''); const s = document.createElement('span'); s.className = 'lancer'; s.textContent = '▶ ' + T2('Jouer'); sel.appendChild(s); }
  let p = el.querySelector('#apercu-mode');
  if (!p) { p = document.createElement('div'); p.id = 'apercu-mode'; p.className = 'apercu-mode'; acc.appendChild(p); }
  try { p.innerHTML = texteSel(k); } catch (e) { p.innerHTML = ''; }
  try { if (typeof iconiser === 'function') iconiser(p); } catch (e) { }
  try { if (typeof Langue !== 'undefined' && Langue.dom) Langue.dom(p); } catch (e) { }
}
function ajusterAccueil() {
  const acc = UI.el && UI.el.querySelector('.accueil'); if (!acc || G.etat !== 'menu') return;
  const z = +Save.d.opts.zoomMenu || 1; acc.style.zoom = z;
  // on réduit jusqu'à ce que le bas de l'accueil tienne dans la fenêtre (le haut se décale quand la taille change)
  let k = z;
  for (let i = 0; i < 5; i++) { const r = acc.getBoundingClientRect(), trop = r.bottom - (innerHeight - 10); if (trop <= 1) break; k *= Math.max(.3, (r.height - trop) / r.height); acc.style.zoom = k; }
}
addEventListener('resize', () => { try { ajusterAccueil(); } catch (e) { } });
const _menuSel = UI.menu;
UI.menu = function () { const r = _menuSel.apply(this, arguments); try { majSelection(); ajusterAccueil(); setTimeout(ajusterAccueil, 0); setTimeout(ajusterAccueil, 300); } catch (e) { console.warn('menu', e); } return r; };

// ---------- le décor : un vrai paysage peint (ciel, soleil, nuages en volume, montagnes éclairées, forêt, lac) ----------
// tout est peint une seule fois dans un calque (selon le ciel et la taille de l'écran) : il ne coûte rien à afficher
const SCENE2 = { b: null, cle: '', t: 0, fond: null, fondCle: '', rayons: null, nuages: null, nuagesCle: '', rochers: [], parts: [] };
const SC_CX = W * .8, SC_CY = H * .34;
// quatre ciels ; on prend celui qui tranche le plus avec la couleur du boss
const CIELS = [
  { t: [212, 62, 40], m: [204, 70, 62], o: [36, 100, 74], b: [228, 30, 34], eau: [210, 45, 34] },   // ciel bleu, horizon doré
  { t: [258, 48, 34], m: [290, 52, 60], o: [26, 100, 70], b: [268, 30, 30], eau: [262, 35, 30] },   // couchant violet
  { t: [196, 64, 36], m: [180, 52, 58], o: [48, 100, 76], b: [192, 34, 28], eau: [186, 45, 28] },   // lagon turquoise
  { t: [330, 40, 38], m: [8, 70, 66], o: [40, 100, 76], b: [318, 26, 30], eau: [330, 28, 30] }     // aube rose
];
function ciel(def) { const d = c => Math.abs(((c.m[0] - def.hue) % 360 + 540) % 360 - 180); return CIELS.reduce((a, c) => d(c) > d(a) ? c : a, CIELS[0]); }
const HS = (a, ds, dl, al) => hsl(a[0], clamp(a[1] + (ds || 0), 0, 100), clamp(a[2] + (dl || 0), 0, 100), al);
// couleurs en [r, g, b] pour pouvoir les mélanger
function vRgb(a) {
  const h = a[0] / 360, s = a[1] / 100, l = a[2] / 100, q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
const vMix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const vCol = (c, al) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al === undefined ? 1 : al})`;
const BLANC = [255, 255, 255];
function sapin(c, x, y, h, col, lum) {
  const w = h * .42;
  c.fillStyle = vCol(col);
  c.fillRect(x - h * .03, y - h * .12, h * .06, h * .14);
  for (let k = 0; k < 3; k++) {
    const yb = y - h * (.12 + k * .26), ww = w * (1 - k * .25);
    c.beginPath(); c.moveTo(x - ww, yb); c.lineTo(x, yb - h * .42); c.lineTo(x + ww, yb); c.closePath(); c.fill();
  }
  // un liseré de lumière côté soleil
  c.fillStyle = vCol(lum, .55); c.beginPath(); c.moveTo(x, y - h * .92); c.lineTo(x + w * .55, y - h * .38); c.lineTo(x + w * .2, y - h * .42); c.closePath(); c.fill();
}
// un cumulus en volume : corps à l'ombre, sommets éclairés côté soleil, base plate
function nuageReel(seed, w, h, P) {
  const cv2 = document.createElement('canvas'); cv2.width = w; cv2.height = h; const c = cv2.getContext('2d'), r = RNG(seed);
  const lum = vMix(BLANC, vRgb(P.o), .22), omb = vMix(vRgb(P.b), [205, 212, 228], .55), base = h * .8, puffs = [];
  for (let k = 0; k < 34; k++) {
    const u = .06 + r() * .88, env = Math.sin(u * Math.PI), rr = (h * .13 + r() * h * .16) * (.45 + env * .85);
    puffs.push({ x: u * w, y: base - rr * .55 - r() * env * h * .32, rr });
  }
  puffs.sort((a, b) => b.y - a.y);
  for (const p of puffs) { const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.rr); g.addColorStop(0, vCol(omb, .95)); g.addColorStop(.72, vCol(omb, .85)); g.addColorStop(1, vCol(omb, 0)); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.rr, 0, TAU); c.fill(); }
  for (const p of puffs) { const lx = p.x + p.rr * .28, ly = p.y - p.rr * .32, g = c.createRadialGradient(lx, ly, 0, lx, ly, p.rr * .82); g.addColorStop(0, vCol(lum, .95)); g.addColorStop(.6, vCol(lum, .55)); g.addColorStop(1, vCol(lum, 0)); c.fillStyle = g; c.beginPath(); c.arc(lx, ly, p.rr * .82, 0, TAU); c.fill(); }
  // dessous plat et adouci
  c.globalCompositeOperation = 'destination-out';
  const gb = c.createLinearGradient(0, base - h * .05, 0, base + h * .14); gb.addColorStop(0, 'rgba(0,0,0,0)'); gb.addColorStop(1, 'rgba(0,0,0,1)');
  c.fillStyle = gb; c.fillRect(0, base - h * .05, w, h);
  return cv2;
}
// ---------- relief réel : une carte de hauteur fractale, éclairée par le soleil, vue en perspective ----------
// (rendu « voxel » colonne par colonne : montagnes enneigées au loin, collines boisées, lac au premier plan)
const TERRAIN = { N: 512, WL: 16, HMAX: 175, h: null, col: null };
function carteTerrain() {
  if (TERRAIN.h) return TERRAIN;
  const N = TERRAIN.N, r = RNG(424242), H0 = new Float32Array(N * N), F0 = new Float32Array(N * N);
  // bruit de valeur sur plusieurs octaves
  const grilles = [];
  for (let o = 0; o < 8; o++) { const L = 3 << o, g = new Float32Array((L + 1) * (L + 1)); for (let i = 0; i < g.length; i++) g[i] = r(); grilles.push({ L, g }); }
  const lisse = t => t * t * (3 - 2 * t);
  const val = (o, x, y) => { const { L, g } = grilles[o], fx = x * L, fy = y * L, ix = Math.min(L - 1, fx | 0), iy = Math.min(L - 1, fy | 0), tx = lisse(fx - ix), ty = lisse(fy - iy), w = L + 1;
    const a = g[iy * w + ix], b = g[iy * w + ix + 1], c = g[(iy + 1) * w + ix], d = g[(iy + 1) * w + ix + 1]; return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty; };
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    // crêtes acérées (multifractale « ridged »)
    let s = 0, amp = .55, poids = 1;
    for (let o = 0; o < 8; o++) { let n = 1 - Math.abs(val(o, u, v) * 2 - 1); n *= n; n *= poids; poids = clamp(n * 2.2, 0, 1); s += n * amp; amp *= .5; }
    let f = 0, a2 = .5; for (let o = 1; o < 7; o++) { f += val(o, (u + .37) % 1, (v + .71) % 1) * a2; a2 *= .5; }
    const d = N - 1 - y, lat = Math.abs(x - N / 2);
    // le lac devant, des collines ensuite, les grandes montagnes au fond ; des berges sur les côtés
    const m = ss(40, 190, d) * .38 + ss(190, 440, d) * .9;
    const berge = ss(70, 230, lat) * (1 - ss(80, 280, d)) * .55;
    H0[y * N + x] = (s * (m + berge) + f * .16 * ss(20, 140, d)) * TERRAIN.HMAX;
    F0[y * N + x] = f;
  }
  // couleurs : roche, neige, prairie, forêt, sable, éclairées par le soleil (devant à droite, assez bas)
  const C = new Uint8ClampedArray(N * N * 3), L = [.55, -.5, .5], ln = Math.hypot(...L); L[0] /= ln; L[1] /= ln; L[2] /= ln;
  const HM = TERRAIN.HMAX, WL = TERRAIN.WL;
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const i = y * N + x, h = H0[i], dx = (H0[i + 1] - H0[i - 1]) / 2, dy = (H0[i + N] - H0[i - N]) / 2, pente = Math.hypot(dx, dy);
    const nl = Math.hypot(dx, dy, 1), lamb = Math.max(0, (-dx * L[0] - dy * L[1] + L[2]) / nl), f = F0[i];
    let c;
    const neige = HM * .5 + (f - .5) * 30;
    if (h < WL + 1.5) c = [168, 152, 112];
    else if (h > neige && pente < 1.6) c = [244, 247, 255];
    else if (pente > 1.05 || h > HM * .42) { const k = clamp((f - .3) * 1.5, 0, 1); c = [104 + 30 * k, 96 + 24 * k, 90 + 18 * k]; }
    else if (h < HM * .26) c = f > .52 ? [30, 58, 34] : [78, 116, 52];
    else { const k = clamp((h - HM * .26) / (HM * .16), 0, 1); c = [42 + 62 * k, 70 + 26 * k, 40 + 50 * k]; }
    const lum = .34 + .82 * lamb;
    C[i * 3] = c[0] * lum; C[i * 3 + 1] = c[1] * lum; C[i * 3 + 2] = c[2] * lum;
  }
  TERRAIN.h = H0; TERRAIN.col = C; return TERRAIN;
}
// rendu du relief pour un ciel donné : renvoie un calque (le ciel reste transparent)
function rendreTerrain(P, TW, TH) {
  const T = carteTerrain(), N = T.N, Hm = T.h, Cm = T.col, WL = T.WL;
  const cv2 = document.createElement('canvas'); cv2.width = TW; cv2.height = TH; const c = cv2.getContext('2d');
  const img = c.createImageData(TW, TH), px = new Uint32Array(img.data.buffer);
  const hor = vMix(vRgb(P.o), vRgb(P.m), .35), milieu = vRgb(P.m), haut = vRgb(P.t), eau = vRgb(P.eau), soleil = vMix(vRgb(P.o), BLANC, .45);
  const yh = TH * .6, f = TH * .95, camH = WL + 24, cx = N / 2, cy = N - 2, fov = .62, sunX = (SC_CX + 40) / W * TW;
  const pack = (r, g, b) => (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  for (let x = 0; x < TW; x++) {
    const a = (x / TW - .5) * 2 * fov, dxr = Math.sin(a), dyr = -Math.cos(a);
    let ybuf = TH, z = 1, dz = .2;
    const reflet = Math.max(0, 1 - Math.abs(x - sunX) / (TW * .05));
    while (z < 560 && ybuf > 0) {
      const mx = cx + dxr * z, my = cy + dyr * z;
      if (mx < 1 || my < 1 || mx >= N - 2 || my >= N - 2) break;
      const ix = mx | 0, iy = my | 0, tx = mx - ix, ty = my - iy, i = iy * N + ix;
      let hg = Hm[i] * (1 - tx) * (1 - ty) + Hm[i + 1] * tx * (1 - ty) + Hm[i + N] * (1 - tx) * ty + Hm[i + N + 1] * tx * ty;
      const dansEau = hg < WL; if (dansEau) hg = WL;
      const sy = yh + (camH - hg) * f / z;
      if (sy < ybuf) {
        let r, g, b;
        if (dansEau) {
          // l'eau reflète le ciel : plus clair au loin, le soleil y laisse une traînée
          const k = clamp(z / 260, 0, 1), vague = .92 + .08 * Math.sin(mx * .9 + my * 2.3) * Math.sin(my * 1.7);
          let col = vMix(vMix(haut, eau, .55), vMix(hor, BLANC, .15), k);
          col = vMix(col, soleil, reflet * (.35 + .45 * k) * (vague > .97 ? 1.6 : 1));
          r = col[0] * vague; g = col[1] * vague; b = col[2] * vague;
        } else { const j = i * 3, j1 = j + 3, j2 = j + N * 3, j3 = j2 + 3, w0 = (1 - tx) * (1 - ty), w1 = tx * (1 - ty), w2 = (1 - tx) * ty, w3 = tx * ty; // couleurs lissées : pas d'escaliers au premier plan
          r = Cm[j] * w0 + Cm[j1] * w1 + Cm[j2] * w2 + Cm[j3] * w3; g = Cm[j + 1] * w0 + Cm[j1 + 1] * w1 + Cm[j2 + 1] * w2 + Cm[j3 + 1] * w3; b = Cm[j + 2] * w0 + Cm[j1 + 2] * w1 + Cm[j2 + 2] * w2 + Cm[j3 + 2] * w3; }
        // brume : les lointains se fondent dans la couleur de l'horizon
        const fg = (1 - Math.exp(-z / 230)) * .88;
        r += (hor[0] - r) * fg; g += (hor[1] - g) * fg; b += (hor[2] - b) * fg;
        const p = pack(r, g, b);
        for (let y = Math.max(0, Math.ceil(sy)); y < ybuf; y++) px[y * TW + x] = p;
        ybuf = Math.max(0, Math.ceil(sy));
      }
      z += dz; dz = .2 + z * .006;
    }
  }
  c.putImageData(img, 0, 0);
  // une fine bande de brume lumineuse sur l'horizon
  const bg = c.createLinearGradient(0, yh - TH * .12, 0, yh + TH * .03); bg.addColorStop(0, vCol(hor, 0)); bg.addColorStop(.7, vCol(vMix(hor, BLANC, .2), .35)); bg.addColorStop(1, vCol(hor, 0));
  c.globalCompositeOperation = 'source-atop'; c.fillStyle = bg; c.fillRect(0, yh - TH * .12, TW, TH * .15); c.globalCompositeOperation = 'source-over';
  return cv2;
}
function fondScene(def, k) {
  const P = ciel(def), ch = P.m[0], w = Math.ceil(W * k), h = Math.ceil(H * k), cle = ch + ':' + w + ':' + h;
  if (SCENE2.fond && SCENE2.fondCle === cle) return SCENE2.fond;
  const cv2 = SCENE2.fond || document.createElement('canvas'); cv2.width = w; cv2.height = h;
  const c = cv2.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0);
  const r = RNG(hashNum(ch * 977 + 13)), hor = vRgb(P.o), haut = vRgb(P.t), milieu = vRgb(P.m), bas = vRgb(P.b);
  // ciel : profond en haut, doré à l'horizon
  const g = c.createLinearGradient(0, 0, 0, H * .7);
  g.addColorStop(0, vCol(haut)); g.addColorStop(.45, vCol(milieu)); g.addColorStop(.82, vCol(vMix(milieu, hor, .6))); g.addColorStop(1, vCol(vMix(hor, BLANC, .25)));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // voiles d'altitude (cirrus)
  c.save(); c.globalAlpha = .1;
  for (let i = 0; i < 40; i++) { const x = r() * W, y = H * (.05 + r() * .25), L = 120 + r() * 300; c.fillStyle = vCol(vMix(BLANC, hor, .3)); c.beginPath(); c.ellipse(x, y, L, 2 + r() * 4, -.05 + r() * .1, 0, TAU); c.fill(); }
  c.restore();
  // soleil bas derrière le colosse
  const sx = SC_CX + 40, sy = H * .55;
  let sg = c.createRadialGradient(sx, sy, 0, sx, sy, 700);
  sg.addColorStop(0, 'rgba(255,253,240,1)'); sg.addColorStop(.05, 'rgba(255,248,220,.95)'); sg.addColorStop(.2, vCol(vMix(hor, BLANC, .3), .6)); sg.addColorStop(.55, vCol(hor, .18)); sg.addColorStop(1, vCol(hor, 0));
  c.fillStyle = sg; c.fillRect(0, 0, W, H);
  // banc de nuages lointains, dorés par le soleil
  for (let i = 0; i < 7; i++) { const nw = 260 + r() * 260, nh = nw * .32, img = nuageReel(hashNum(ch + i * 71), Math.ceil(nw), Math.ceil(nh), P); c.globalAlpha = .55 + r() * .25; c.drawImage(img, r() * W - nw * .3, H * (.4 + r() * .1) - nh * .7); }
  c.globalAlpha = 1;
  // le relief : montagnes, collines, lac (calculé à la résolution de l'écran, au plus 1280 px de large)
  const brume = vMix(hor, milieu, .35), lumS = vMix(hor, BLANC, .35);
  const TW = Math.min(1280, Math.ceil(w * .8)), TH = Math.ceil(TW * H / W);
  c.imageSmoothingQuality = 'high'; c.drawImage(rendreTerrain(P, TW, TH), 0, 0, W, H);
  // rives au premier plan, avec quelques sapins sombres
  const rive = (x0, x1, yb, amp) => {
    c.fillStyle = vCol(vMix(bas, [10, 20, 16], .55)); c.beginPath(); c.moveTo(x0, H + 5);
    for (let x = x0; x <= x1; x += 8) c.lineTo(x, yb - amp * Math.sin((x - x0) / (x1 - x0) * Math.PI) * (.8 + .2 * r()));
    c.lineTo(x1, H + 5); c.closePath(); c.fill();
    for (let x = x0 + 10; x < x1 - 10; x += 9 + r() * 14) sapin(c, x, yb - amp * Math.sin((x - x0) / (x1 - x0) * Math.PI) + 4, 30 + r() * 36, vMix([10, 26, 20], bas, .2), vMix(lumS, [90, 130, 70], .5));
  };
  rive(W * .9, W + 40, H * .97, 60);
  SCENE2.fond = cv2; SCENE2.fondCle = cle; return cv2;
}
function spriteRayons() {
  if (SCENE2.rayons) return SCENE2.rayons;
  const s = 1100, cv2 = document.createElement('canvas'); cv2.width = cv2.height = s; const c = cv2.getContext('2d');
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,248,220,.45)'); g.addColorStop(.5, 'rgba(255,240,200,.12)'); g.addColorStop(1, 'rgba(255,240,200,0)');
  c.fillStyle = g; c.translate(s / 2, s / 2);
  for (let i = 0; i < 18; i++) { const a = i * TAU / 18, l = .04 + (i % 3) * .02; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, s / 2, a - l, a + l); c.closePath(); c.fill(); }
  return (SCENE2.rayons = cv2);
}
function nuagesMobiles(P) {
  const cle = P.m[0]; if (SCENE2.nuages && SCENE2.nuagesCle === cle) return SCENE2.nuages;
  SCENE2.nuagesCle = cle;
  return (SCENE2.nuages = Array.from({ length: 4 }, (_, i) => { const w = 420 + i * 60, h = Math.round(w * .34); return { img: nuageReel(hashNum(cle * 3 + i * 101), w, h, P), w, h, y: H * (.06 + i * .075), v: 5 + i * 2.5, x0: i * 380 }; }));
}
// île flottante : roche en strates, herbe, racines qui pendent
function spriteRocher(ch, i) {
  const cv2 = document.createElement('canvas'), w = 170, h = 150; cv2.width = w; cv2.height = h; const c = cv2.getContext('2d'), r = RNG(hashNum(ch * 31 + i * 7));
  const L = w * (.55 + r() * .35), x0 = (w - L) / 2, top = 36, pts = [[x0, top]];
  for (let k = 1; k < 8; k++) pts.push([x0 + L * k / 8 + (r() - .5) * 8, top + (h - top - 14) * Math.pow(Math.sin(k / 8 * Math.PI), .8) * (.55 + r() * .45)]);
  pts.push([x0 + L, top]);
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]); c.closePath();
  const g = c.createLinearGradient(x0, top, x0 + L, h); g.addColorStop(0, hsl(30, 16, 46)); g.addColorStop(.5, hsl(25, 18, 30)); g.addColorStop(1, hsl(20, 22, 14));
  c.fillStyle = g; c.fill();
  c.save(); c.clip();
  for (let s = 0; s < 6; s++) { const y = top + 8 + s * 14 + r() * 4; c.strokeStyle = `rgba(20,12,8,${.25 + r() * .2})`; c.lineWidth = 1 + r() * 2; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= w; x += 12) c.lineTo(x, y + Math.sin(x * .08 + s) * 3); c.stroke(); }
  const lg = c.createLinearGradient(x0 + L, 0, x0, 0); lg.addColorStop(0, 'rgba(255,220,170,.35)'); lg.addColorStop(.5, 'rgba(255,220,170,0)'); c.fillStyle = lg; c.fillRect(0, 0, w, h);
  c.restore();
  // racines
  c.strokeStyle = 'rgba(70,48,30,.85)'; c.lineWidth = 1.2;
  for (let k = 0; k < 5; k++) { const x = x0 + L * (.2 + r() * .6), y = top + 20 + r() * 30; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + (r() - .5) * 20, y + 25, x + (r() - .5) * 14, y + 30 + r() * 30); c.stroke(); }
  // herbe
  const gh = c.createLinearGradient(0, top - 10, 0, top + 8); gh.addColorStop(0, hsl(100, 55, 52)); gh.addColorStop(1, hsl(110, 50, 30));
  c.fillStyle = gh; c.beginPath(); c.ellipse(w / 2, top, L / 2 + 5, 10, 0, 0, TAU); c.fill();
  c.strokeStyle = hsl(95, 60, 58); c.lineWidth = 1;
  for (let k = 0; k < 40; k++) { const x = x0 + r() * L, y = top - 4 + r() * 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - .5) * 3, y - 3 - r() * 5); c.stroke(); }
  for (let k = 0; k < 7; k++) { c.fillStyle = ['#ffe36b', '#ffb3d1', '#fff', '#b9e3ff'][k % 4]; c.beginPath(); c.arc(x0 + 8 + r() * (L - 16), top - 3 + r() * 5, 1.8, 0, TAU); c.fill(); }
  // un petit sapin sur certaines îles
  if (r() < .55) sapin(c, x0 + L * (.25 + r() * .5), top + 1, 26 + r() * 14, [24, 60, 40], [150, 200, 120]);
  return cv2;
}
let _vignette = null;
fondMenu = function () {
  const sw = cv.width, sh = cv.height, kc = Math.max(sw / W, sh / H), kb = Math.min(sw / W, sh / H), ox = sw - W * kb;
  const S = SCENE2, D = defSel(), def = D.def, h = def.hue, P = ciel(def), ch = P.m[0];
  if (!S.b || S.cle !== D.cle) {
    const b = creerBoss(def); b.intro = 0; b.x = 0; b.y = 0; b.armure = 0; b.armureMax = 0;
    S.b = b; S.cle = D.cle; S.t = 0;
    S.rochers = Array.from({ length: 5 }, (_, i) => ({ img: spriteRocher(ch, i), a: i * TAU / 5 + .4, rx: 250 + (i % 2) * 60, ry: 60 + (i % 3) * 22, v: .07 + (i % 2) * .03, s: .5 + (i % 3) * .2, ph: i * 1.7 }));
  }
  if (typeof SCENE_MENU !== 'undefined') SCENE_MENU.vu = performance.now();
  S.t += 1 / 60; const t = S.t, b = S.b;
  // le décor couvre tout l'écran ; le boss garde sa taille et reste entier, calé à droite
  ctx.setTransform(1, 0, 0, 1, sw - W * kc, 0);
  ctx.drawImage(fondScene(def, kc), 0, 0);
  ctx.setTransform(kb, 0, 0, kb, ox, 0);
  const serpent = b.esp && b.esp.id === 'serpent';
  const cx = SC_CX, cy = SC_CY + Math.sin(t * .7) * 10 - (serpent ? 70 : 0);
  // rayons de soleil qui tournent lentement
  ctx.globalCompositeOperation = 'lighter';
  const R0 = spriteRayons(); ctx.save(); ctx.translate(SC_CX + 40, H * .55); ctx.rotate(t * .03); ctx.globalAlpha = .45 + .12 * Math.sin(t * .8); ctx.drawImage(R0, -550, -550); ctx.restore();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // nuages en volume qui dérivent
  for (const n of nuagesMobiles(P)) { const x = ((t * n.v + n.x0) % (W + n.w + 200)) - n.w - 100; ctx.globalAlpha = .92; ctx.drawImage(n.img, x, n.y); }
  ctx.globalAlpha = 1;
  // îles flottantes autour du colosse (celles de derrière d'abord)
  const iles = S.rochers.map(q => { const a = q.a + t * q.v; return { q, x: cx + Math.cos(a) * q.rx, y: cy + 40 + Math.sin(a) * q.ry + Math.sin(t * 1.3 + q.ph) * 6, z: Math.sin(a) }; });
  const ile = o => { const s = o.q.s * (.85 + .15 * (o.z + 1) / 2); ctx.globalAlpha = .8 + .2 * (o.z + 1) / 2; ctx.drawImage(o.q.img, o.x - 85 * s, o.y - 36 * s, 170 * s, 150 * s); ctx.globalAlpha = 1; };
  for (const o of iles) if (o.z < 0) ile(o);
  // estrade : un grand cercle de runes doré sous le boss
  ctx.save(); ctx.translate(cx, SC_CY + 165); ctx.scale(1, .3);
  const pg = ctx.createRadialGradient(0, 0, 30, 0, 0, 360); pg.addColorStop(0, HS(P.o, -20, 4, .7)); pg.addColorStop(.7, HS(P.o, -30, -20, .22)); pg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, 360, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  sprite(ctx, 'circle6', '#ffe6a0', 0, 0, 620, t * .12, .75, true);
  sprite(ctx, 'circle6', hsl(h, 100, 70), 0, 0, 430, -t * .2, .65, true);
  ctx.restore(); ctx.globalCompositeOperation = 'source-over';
  // halo coloré derrière le boss
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow(hsl(h, 100, 62, .5), 330), cx - 330, cy - 330); ctx.globalCompositeOperation = 'source-over';
  // le boss en grand : il regarde vers toi et charge régulièrement une attaque
  const cyc = t % 5;
  b.wind = cyc > 3.6 ? 5 - cyc : 0; b.windMax = 1.4;
  b.main = cyc > 3.6 ? { id: def.phases[0].cycle[Math.floor(t / 5) % def.phases[0].cycle.length].id } : null;
  b.facing = Math.PI * .95 + Math.sin(t * .4) * .25; b.eyesA = b.facing; b.flash = 0;
  // le Serpent : son corps s'enroule derrière sa tête (il faut lui fabriquer une trace, il ne rampe pas ici)
  if (serpent && b.s && b.esp.maj) {
    const R1 = 92, tr = []; let th = 0; // une spirale serrée derrière la tête
    for (let k = 0; k < 220; k++) { const rr = Math.max(34, R1 - k * .3) + 7 * Math.sin(k * .09 - t * 2); th += 4 / rr; tr.push({ x: Math.sin(th) * rr, y: R1 - Math.cos(th) * rr }); }
    if (!b.s.n) { try { b.esp.init(b); } catch (e) { } }
    b.s.trace = tr; b.s.dir = Math.PI; try { b.esp.maj(b); } catch (e) { }
    b.facing = Math.PI; b.eyesA = Math.PI;
  }
  ctx.save(); ctx.translate(cx, cy); const sc = serpent ? 1.4 : 1.85; ctx.scale(sc, sc); b.x = 0; b.y = 0;
  try { dessinerBoss(ctx, b); } catch (e) { }
  ctx.restore();
  for (const o of iles) if (o.z >= 0) ile(o);
  // étincelles dorées et pétales qui montent
  if (S.parts.length < 80) S.parts.push({ x: W * .42 + Math.random() * W * .6, y: H + 10, v: 25 + Math.random() * 55, r: 1 + Math.random() * 2.2, p: Math.random() * 6, pet: false, col: ['#ffe58a', '#ffc4dc', '#fff6d8', hsl(h, 100, 78)][Math.random() * 4 | 0] });
  ctx.globalCompositeOperation = 'lighter';
  for (const q of S.parts) {
    q.y -= q.v / 60; q.x += Math.sin(t * 1.2 + q.p) * .6; const a = Math.min(1, (q.y / H) * 1.6) * .85; ctx.globalAlpha = a;
    if (q.pet) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(t * 2 + q.p); ctx.fillStyle = q.col; ctx.beginPath(); ctx.ellipse(0, 0, q.r * 2.2, q.r, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    else ctx.drawImage(glow(q.col, q.r * 3), q.x - q.r * 3, q.y - q.r * 3);
  }
  S.parts = S.parts.filter(q => q.y > -10);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // le texte du menu reste lisible : léger voile à gauche
  if (!_vignette) { _vignette = ctx.createLinearGradient(0, 0, W * .6, 0); _vignette.addColorStop(0, 'rgba(10,6,22,.45)'); _vignette.addColorStop(.7, 'rgba(10,6,22,.14)'); _vignette.addColorStop(1, 'rgba(10,6,22,0)'); }
  ctx.fillStyle = _vignette; ctx.fillRect(-ox / kb - 10, -10, ox / kb + W * .7, sh / kb + 20);
};
