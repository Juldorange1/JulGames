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
    const n = Affront.prochain(); titre = '⚔ ' + T2('Affrontement'); regles.push(FORMATS.affront.obj, T2('Toi contre deux rivaux (ou tes amis en multijoueur). Mourir te fait perdre 15 % de tes dégâts, tu reviens 4 s plus tard. 3 minutes au plus.'), ligneArmes(n.ars));
    if (d.affrontVictoires) rec = '🏆 ' + d.affrontVictoires + ' ' + T2(d.affrontVictoires > 1 ? 'victoires' : 'victoire');
  } else if (k === 'chasse') {
    const c = chasseCourante(); titre = '🎯 ' + T2('Chasse'); regles.push(FORMATS.chasse.obj, T2('Le boss se téléporte, fait surgir des obstacles et se met en garde.'));
    if (c.bestP) rec = '🏆 ' + T2('Ton meilleur') + ' : ' + fmtPct(c.bestP);
  }
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
const _menuSel = UI.menu;
UI.menu = function () { const r = _menuSel.apply(this, arguments); try { majSelection(); } catch (e) { console.warn('menu', e); } return r; };

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
// une crête de montagnes (déplacement du point milieu) avec quelques grands sommets
function crete(r, n, base, amp, rough, pics) {
  const y = new Float32Array(n + 1); y[0] = base - r() * amp * .4; y[n] = base - r() * amp * .4;
  let a = amp, step = n;
  while (step > 1) { const h = step >> 1; for (let i = h; i < n; i += step) y[i] = (y[i - h] + y[i + h]) / 2 + (r() - .5) * a; a *= rough; step = h; }
  for (const [u, A, L] of pics) for (let i = 0; i <= n; i++) { const d = (i / n - u) / L; y[i] -= A * Math.exp(-d * d) * (.85 + .15 * Math.cos(d * 9)); }
  return y;
}
// peint une chaîne : grands versants à l'ombre (le soleil est à droite), neige, ravines, arêtes éclairées, forêt, brume
function chaineReelle(c, r, o) {
  const n = 512, y = crete(r, n, o.base, o.amp, o.rough, o.pics || []), dx = (W + 40) / n, X = i => -20 + i * dx;
  const ys = new Float32Array(n + 1); for (let i = 0; i <= n; i++) { let s = 0, m = 0; for (let k = -6; k <= 6; k++) { const j = i + k; if (j >= 0 && j <= n) { s += y[j]; m++; } } ys[i] = s / m; }
  const bruit = i => Math.sin(i * .37) * .5 + Math.sin(i * 1.13 + 2) * .3 + Math.sin(i * 2.9 + 5) * .2;
  c.save();
  c.beginPath(); c.moveTo(-20, H + 10); for (let i = 0; i <= n; i++) c.lineTo(X(i), y[i]); c.lineTo(W + 20, H + 10); c.closePath();
  let top = H; for (let i = 0; i <= n; i++) top = Math.min(top, y[i]);
  const g = c.createLinearGradient(0, top, 0, o.base + 90); g.addColorStop(0, vCol(vMix(o.col, o.lum, .12))); g.addColorStop(1, vCol(vMix(o.col, o.brume, .55)));
  c.fillStyle = g; c.fill(); c.clip();
  // neige : plaques irrégulières sous les sommets
  if (o.neige !== undefined) {
    let i = 0;
    while (i <= n) {
      if (y[i] >= o.neige) { i++; continue; }
      let j = i; while (j <= n && y[j] < o.neige) j++;
      c.beginPath(); c.moveTo(X(i), y[i]);
      for (let k = i; k < j; k++) c.lineTo(X(k), y[k] - 1);
      for (let k = j - 1; k >= i; k--) { const L = (o.neige - y[k]) * (.55 + .4 * bruit(k)) + 3 + 6 * Math.abs(Math.sin(k * 3.1)); c.lineTo(X(k), y[k] + L); }
      c.closePath();
      const gs = c.createLinearGradient(0, top, 0, o.neige + 30); gs.addColorStop(0, 'rgba(255,253,248,.97)'); gs.addColorStop(1, 'rgba(240,244,252,.8)');
      c.fillStyle = gs; c.fill();
      i = j;
    }
  }
  // sommets et vallées du profil lissé
  const pics = [], creux = [0];
  for (let i = 8; i <= n - 8; i++) {
    let haut = true, bas = true;
    for (let k = 1; k <= 8; k++) { if (ys[i] > ys[i - k] || ys[i] > ys[i + k]) haut = false; if (ys[i] < ys[i - k] || ys[i] < ys[i + k]) bas = false; }
    if (haut && (!pics.length || i - pics[pics.length - 1] > 8)) pics.push(i);
    if (bas && i - creux[creux.length - 1] > 8) creux.push(i);
  }
  creux.push(n);
  // le versant gauche de chaque sommet est à l'ombre : une grande facette qui descend jusqu'au pied
  for (const p of pics) {
    const vl = creux.filter(v => v < p).pop() || 0, haut = o.base - y[p];
    if (haut < 12) continue;
    const pied = Math.min(H + 10, y[p] + haut * 1.5 + 30), sx = X(p) - (X(p) - X(vl)) * (.12 + r() * .22);
    c.beginPath(); c.moveTo(X(vl), y[vl]);
    for (let k = vl; k <= p; k++) c.lineTo(X(k), y[k]);
    const pas = 9; for (let s = 1; s <= pas; s++) { const u = s / pas; c.lineTo(X(p) + (sx - X(p)) * u + (r() - .5) * 10 * u, y[p] + (pied - y[p]) * u); }
    c.lineTo(X(vl) - 30, pied); c.closePath();
    const go = c.createLinearGradient(0, y[p], 0, pied); go.addColorStop(0, vCol(o.omb, .62)); go.addColorStop(.6, vCol(o.omb, .38)); go.addColorStop(1, vCol(o.omb, .12));
    c.fillStyle = go; c.fill();
    // une arête secondaire dans le versant au soleil
    if (r() < .7) {
      const vr = creux.find(v => v > p) || n, ex = X(p) + (X(vr) - X(p)) * (.3 + r() * .3);
      c.strokeStyle = vCol(o.omb, .3); c.lineWidth = 1.2; c.beginPath(); c.moveTo(X(p), y[p] + 2);
      for (let s = 1; s <= 8; s++) { const u = s / 8; c.lineTo(X(p) + (ex - X(p)) * u + (r() - .5) * 6, y[p] + (pied - y[p]) * u * .8); }
      c.stroke();
    }
  }
  // ravines
  if (o.ravines) for (let k = 0; k < o.ravines; k++) {
    const i = 2 + Math.floor(r() * (n - 4)); if (y[i] > o.base - o.amp * .2) continue;
    let px = X(i), py = y[i] + 3; const dir = r() < .5 ? -1 : 1, L = 15 + r() * o.amp * .6;
    c.strokeStyle = vCol(o.omb, .18 + r() * .2); c.lineWidth = .6 + r() * .8; c.beginPath(); c.moveTo(px, py);
    for (let s = 0; s < L; s += 5) { px += dir * (.5 + r() * 2); py += 5; c.lineTo(px, py); }
    c.stroke();
  }
  // arêtes éclairées par le soleil
  c.lineWidth = 1.4; c.strokeStyle = vCol(o.lum, .55); c.beginPath();
  for (let i = 1; i <= n; i++) { if (ys[i] > ys[i - 1]) { c.moveTo(X(i - 1), y[i - 1] + .8); c.lineTo(X(i), y[i] + .8); } }
  c.stroke();
  // forêt de sapins le long de la crête
  if (o.foret) {
    const F = o.foret;
    for (let i = 0; i <= n; i++) {
      if (r() > F.dens) continue;
      const tx = X(i) + (r() - .5) * dx, ty = y[i] + 2 + r() * F.prof, h = F.h * (.6 + r() * .7);
      const cc = vMix(F.col, o.brume, (ty - y[i]) / (F.prof * 2.5));
      sapin(c, tx, ty, h, cc, vMix(cc, o.lum, .35));
    }
  }
  c.restore();
  // brume au pied de la chaîne
  const bg = c.createLinearGradient(0, o.base - 60, 0, o.base + 70); bg.addColorStop(0, vCol(o.brume, 0)); bg.addColorStop(.55, vCol(o.brume, o.brumeA || .45)); bg.addColorStop(1, vCol(o.brume, 0));
  c.fillStyle = bg; c.fillRect(-20, o.base - 60, W + 40, 130);
  return y;
}
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
  // montagnes : de la plus lointaine (dans la brume) à la plus proche
  const brume = vMix(hor, milieu, .35), lumS = vMix(hor, BLANC, .35);
  chaineReelle(c, r, { base: H * .6, amp: 230, rough: .56, col: vMix(vMix(milieu, bas, .35), brume, .45), lum: lumS, omb: vMix(bas, milieu, .3), brume, brumeA: .5, neige: H * .6 - 130, ravines: 50, pics: [[.62, 150, .05], [.84, 110, .04], [.3, 90, .05]] });
  chaineReelle(c, r, { base: H * .68, amp: 170, rough: .58, col: vMix(bas, brume, .25), lum: vMix(lumS, bas, .25), omb: vMix(bas, [10, 10, 30], .35), brume, brumeA: .55, neige: H * .68 - 120, ravines: 80, pics: [[.72, 110, .035], [.95, 80, .04]] });
  chaineReelle(c, r, { base: H * .79, amp: 90, rough: .5, col: vMix(vMix(bas, [30, 60, 40], .4), brume, .1), lum: vMix(lumS, [120, 160, 90], .5), omb: vMix(bas, [5, 10, 15], .5), brume, brumeA: .35, foret: { dens: .9, prof: 30, h: 22, col: vMix([18, 46, 34], bas, .3) } });
  // lac : il reflète le ciel et le soleil
  const ly = H * .84, eau = vRgb(P.eau);
  const ge = c.createLinearGradient(0, ly, 0, H); ge.addColorStop(0, vCol(vMix(hor, eau, .45))); ge.addColorStop(.35, vCol(vMix(milieu, eau, .55))); ge.addColorStop(1, vCol(vMix(haut, eau, .6)));
  c.fillStyle = ge; c.fillRect(0, ly, W, H - ly);
  const rs = c.createLinearGradient(0, ly, 0, H); rs.addColorStop(0, 'rgba(255,250,225,.85)'); rs.addColorStop(1, 'rgba(255,250,225,0)');
  c.fillStyle = rs; c.beginPath(); c.moveTo(sx - 22, ly); c.lineTo(sx + 22, ly); c.lineTo(sx + 90, H); c.lineTo(sx - 90, H); c.closePath(); c.fill();
  for (let i = 0; i < 160; i++) { const y = ly + Math.pow(r(), 1.6) * (H - ly), x = r() * W, L = 6 + (y - ly) * .5 * r(); c.fillStyle = Math.abs(x - sx) < 120 ? 'rgba(255,245,210,.5)' : vCol(vMix(BLANC, hor, .4), .18); c.fillRect(x, y, L, 1); }
  const bord = c.createLinearGradient(0, ly - 3, 0, ly + 6); bord.addColorStop(0, vCol(brume, .7)); bord.addColorStop(1, vCol(brume, 0)); c.fillStyle = bord; c.fillRect(0, ly - 3, W, 9);
  // rives au premier plan, avec quelques sapins sombres
  const rive = (x0, x1, yb, amp) => {
    c.fillStyle = vCol(vMix(bas, [10, 20, 16], .55)); c.beginPath(); c.moveTo(x0, H + 5);
    for (let x = x0; x <= x1; x += 8) c.lineTo(x, yb - amp * Math.sin((x - x0) / (x1 - x0) * Math.PI) * (.8 + .2 * r()));
    c.lineTo(x1, H + 5); c.closePath(); c.fill();
    for (let x = x0 + 10; x < x1 - 10; x += 9 + r() * 14) sapin(c, x, yb - amp * Math.sin((x - x0) / (x1 - x0) * Math.PI) + 4, 30 + r() * 36, vMix([10, 26, 20], bas, .2), vMix(lumS, [90, 130, 70], .5));
  };
  rive(W * .52, W * .74, H * .97, 46); rive(W * .9, W + 40, H * .95, 70);
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
  if (S.parts.length < 80) S.parts.push({ x: W * .42 + Math.random() * W * .6, y: H + 10, v: 25 + Math.random() * 55, r: 1 + Math.random() * 2.2, p: Math.random() * 6, pet: Math.random() < .35, col: ['#ffe58a', '#ffc4dc', '#fff6d8', hsl(h, 100, 78)][Math.random() * 4 | 0] });
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
