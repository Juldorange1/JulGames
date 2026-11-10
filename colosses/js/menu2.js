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
      Save.write(); try { Son.play('clic'); } catch (e) { }
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

// ---------- le décor : lumineux, grand et vivant ----------
const SCENE2 = { b: null, cle: '', t: 0, fond: null, fondCle: '', rayons: null, nuage: null, rochers: [], parts: [], petales: [] };
const SC_CX = W * .8, SC_CY = H * .34;
// quatre ciels joyeux ; on prend celui qui tranche le plus avec la couleur du boss
const CIELS = [
  { t: [212, 62, 42], m: [200, 72, 62], o: [38, 100, 76], b: [235, 32, 30] },   // ciel bleu, horizon doré
  { t: [262, 52, 40], m: [292, 58, 62], o: [28, 100, 74], b: [275, 34, 28] },   // couchant violet
  { t: [190, 66, 40], m: [172, 56, 58], o: [52, 100, 80], b: [196, 40, 24] },   // lagon turquoise
  { t: [336, 46, 42], m: [12, 78, 66], o: [44, 100, 78], b: [326, 30, 26] }     // aube rose
];
function ciel(def) { const d = c => { const x = Math.abs(((c.m[0] - def.hue) % 360 + 540) % 360 - 180); return x; }; return CIELS.reduce((a, c) => d(c) > d(a) ? c : a, CIELS[0]); }
const HS = (a, ds, dl, al) => hsl(a[0], clamp(a[1] + (ds || 0), 0, 100), clamp(a[2] + (dl || 0), 0, 100), al);
function fondScene(def, k) {
  const P = ciel(def), ch = P.m[0], w = Math.ceil(W * k), h = Math.ceil(H * k), cle = ch + ':' + w + ':' + h;
  if (SCENE2.fond && SCENE2.fondCle === cle) return SCENE2.fond;
  const cv2 = SCENE2.fond || document.createElement('canvas'); cv2.width = w; cv2.height = h;
  const c = cv2.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0);
  const r = RNG(hashNum(ch * 977 + 13));
  // ciel d'aube : haut profond, horizon doré
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, HS(P.t)); g.addColorStop(.34, HS(P.m)); g.addColorStop(.6, HS(P.o, -10, -4)); g.addColorStop(.67, HS(P.o, 0, 6)); g.addColorStop(1, HS(P.b, 10, 10));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // étoiles pâles en haut du ciel
  for (let i = 0; i < 70; i++) { c.globalAlpha = r() * .5; c.fillStyle = '#fff'; c.fillRect(r() * W, r() * H * .3, 1.4, 1.4); }
  c.globalAlpha = 1;
  // soleil derrière le boss
  const sx = SC_CX, sy = H * .6;
  let sg = c.createRadialGradient(sx, sy, 0, sx, sy, 640);
  sg.addColorStop(0, 'rgba(255,252,236,1)'); sg.addColorStop(.12, 'rgba(255,240,200,.9)'); sg.addColorStop(.35, HS(P.o, 0, 0, .45)); sg.addColorStop(1, HS(P.o, 0, 0, 0));
  c.fillStyle = sg; c.fillRect(0, 0, W, H);
  // bandes de nuages au loin
  for (let i = 0; i < 26; i++) {
    const x = r() * W, y = H * (.42 + r() * .2), rx = 80 + r() * 200, ry = 8 + r() * 16;
    c.fillStyle = `rgba(255,${235 + r() * 20 | 0},${215 + r() * 30 | 0},${.12 + r() * .2})`; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
  }
  // trois chaînes de montagnes : les plus lointaines baignent dans la lumière
  const chaine = (base, amp, pas, coul, neige) => {
    c.fillStyle = coul; c.beginPath(); c.moveTo(-20, H);
    let y = base; const pts = [];
    for (let x = -20; x <= W + 20; x += pas) { y = base - amp * (.3 + r() * .7) * (Math.abs(x - SC_CX) < 160 ? .55 : 1); pts.push([x, y]); c.lineTo(x, y); }
    c.lineTo(W + 20, H); c.closePath(); c.fill();
    if (neige) { c.fillStyle = 'rgba(255,255,255,.55)'; for (const [x, yy] of pts) if (yy < base - amp * .75) { c.beginPath(); c.moveTo(x - 12, yy + 14); c.lineTo(x, yy); c.lineTo(x + 12, yy + 14); c.closePath(); c.fill(); } }
  };
  chaine(H * .62, 150, 46, hsl(P.m[0], 30, 70, .8), true);
  chaine(H * .7, 110, 34, hsl(P.b[0], 28, 48, .95), false);
  // temple en ruine sur la deuxième chaîne
  c.fillStyle = hsl(P.b[0], 26, 42);
  for (const [x0, n] of [[W * .52, 5], [W * .94, 3]]) { for (let i = 0; i < n; i++) c.fillRect(x0 + i * 22, H * .56, 9, H * .1); c.fillRect(x0 - 6, H * .552, n * 22 + 3, 7); }
  chaine(H * .8, 70, 28, hsl(P.b[0], 34, 28), false);
  // sol de premier plan
  const sol = c.createLinearGradient(0, H * .78, 0, H); sol.addColorStop(0, hsl(P.b[0], 34, 24)); sol.addColorStop(1, hsl(P.b[0], 40, 11));
  c.fillStyle = sol; c.fillRect(0, H * .8, W, H * .2);
  SCENE2.fond = cv2; SCENE2.fondCle = cle; return cv2;
}
function spriteRayons() {
  if (SCENE2.rayons) return SCENE2.rayons;
  const s = 1100, cv2 = document.createElement('canvas'); cv2.width = cv2.height = s; const c = cv2.getContext('2d');
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,248,220,.55)'); g.addColorStop(.5, 'rgba(255,240,200,.16)'); g.addColorStop(1, 'rgba(255,240,200,0)');
  c.fillStyle = g; c.translate(s / 2, s / 2);
  for (let i = 0; i < 18; i++) { const a = i * TAU / 18, l = .05 + (i % 3) * .025; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, s / 2, a - l, a + l); c.closePath(); c.fill(); }
  return (SCENE2.rayons = cv2);
}
function spriteNuage() {
  if (SCENE2.nuage) return SCENE2.nuage;
  const cv2 = document.createElement('canvas'); cv2.width = 420; cv2.height = 150; const c = cv2.getContext('2d'), r = RNG(99);
  for (let i = 0; i < 16; i++) { const x = 60 + r() * 300, y = 60 + r() * 40, rr = 30 + r() * 45, g = c.createRadialGradient(x, y - rr * .3, 0, x, y, rr); g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,245,235,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill(); }
  return (SCENE2.nuage = cv2);
}
function spriteRocher(ch, i) {
  const cv2 = document.createElement('canvas'), w = 150, h = 120; cv2.width = w; cv2.height = h; const c = cv2.getContext('2d'), r = RNG(hashNum(ch * 31 + i * 7));
  const L = w * (.55 + r() * .4), x0 = (w - L) / 2;
  // dessous rocheux
  const g = c.createLinearGradient(0, 30, 0, h); g.addColorStop(0, hsl(ch + 20, 18, 48)); g.addColorStop(1, hsl(ch + 10, 22, 18));
  c.fillStyle = g; c.beginPath(); c.moveTo(x0, 34);
  for (let k = 1; k <= 6; k++) c.lineTo(x0 + L * k / 6 - L / 12, 34 + (h - 40) * Math.sin(k / 6 * Math.PI) * (.6 + r() * .4));
  c.lineTo(x0 + L, 34); c.closePath(); c.fill();
  // herbe et fleurs dessus
  c.fillStyle = hsl(110 + r() * 30, 55, 46); c.beginPath(); c.ellipse(w / 2, 34, L / 2 + 4, 11, 0, 0, TAU); c.fill();
  c.fillStyle = hsl(110, 60, 62, .7); c.beginPath(); c.ellipse(w / 2 - 6, 31, L / 2 - 10, 5, 0, 0, TAU); c.fill();
  for (let k = 0; k < 6; k++) { c.fillStyle = ['#ffe36b', '#ff8fb8', '#fff', '#9fe0ff'][k % 4]; c.beginPath(); c.arc(x0 + 10 + r() * (L - 20), 28 + r() * 8, 2.2, 0, TAU); c.fill(); }
  // un cristal lumineux
  if (r() < .6) { const cx = x0 + L * (.3 + r() * .4); c.fillStyle = hsl(ch + 180, 90, 72); c.beginPath(); c.moveTo(cx, 6); c.lineTo(cx + 7, 26); c.lineTo(cx, 32); c.lineTo(cx - 7, 26); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(cx, 8); c.lineTo(cx + 3, 24); c.lineTo(cx, 28); c.closePath(); c.fill(); }
  return cv2;
}
let _vignette = null;
fondMenu = function () {
  const sw = cv.width, sh = cv.height, kc = Math.max(sw / W, sh / H), kb = Math.min(sw / W, sh / H), ox = sw - W * kb;
  const S = SCENE2, D = defSel(), def = D.def, h = def.hue, P = ciel(def), ch = P.m[0];
  if (!S.b || S.cle !== D.cle) {
    const b = creerBoss(def); b.intro = 0; b.x = 0; b.y = 0; b.armure = 0; b.armureMax = 0;
    S.b = b; S.cle = D.cle; S.t = 0;
    S.rochers = Array.from({ length: 5 }, (_, i) => ({ img: spriteRocher(ch, i), a: i * TAU / 5 + .4, rx: 250 + (i % 2) * 60, ry: 60 + (i % 3) * 22, v: .07 + (i % 2) * .03, s: .55 + (i % 3) * .22, ph: i * 1.7 }));
  }
  if (typeof SCENE_MENU !== 'undefined') SCENE_MENU.vu = performance.now();
  S.t += 1 / 60; const t = S.t, b = S.b;
  // le décor couvre tout l'écran ; le boss garde sa taille et reste entier, calé à droite
  ctx.setTransform(1, 0, 0, 1, sw - W * kc, 0);
  ctx.drawImage(fondScene(def, kc), 0, 0);
  ctx.setTransform(kb, 0, 0, kb, ox, 0);
  const cx = SC_CX, cy = SC_CY + Math.sin(t * .7) * 10;
  // rayons de soleil qui tournent lentement
  ctx.globalCompositeOperation = 'lighter';
  const R0 = spriteRayons(); ctx.save(); ctx.translate(cx, H * .55); ctx.rotate(t * .04); ctx.globalAlpha = .55 + .15 * Math.sin(t * .8); ctx.drawImage(R0, -550, -550); ctx.restore();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // nuages qui dérivent
  const N = spriteNuage();
  for (let i = 0; i < 5; i++) { const x = ((t * (8 + i * 3) + i * 330) % (W + 500)) - 420, y = H * (.12 + i * .07); ctx.globalAlpha = .55 - i * .06; ctx.drawImage(N, x, y, 420 * (1 - i * .08), 150 * (1 - i * .08)); }
  ctx.globalAlpha = 1;
  // îles flottantes autour du colosse (celles de derrière d'abord)
  const iles = S.rochers.map(q => { const a = q.a + t * q.v; return { q, x: cx + Math.cos(a) * q.rx, y: cy + 40 + Math.sin(a) * q.ry + Math.sin(t * 1.3 + q.ph) * 6, z: Math.sin(a) }; });
  const ile = o => { const s = o.q.s * (.85 + .15 * (o.z + 1) / 2); ctx.globalAlpha = .75 + .25 * (o.z + 1) / 2; ctx.drawImage(o.q.img, o.x - 75 * s, o.y - 34 * s, 150 * s, 120 * s); ctx.globalAlpha = 1; };
  for (const o of iles) if (o.z < 0) ile(o);
  // estrade : un grand cercle de runes doré sous le boss
  ctx.save(); ctx.translate(cx, cy + 165); ctx.scale(1, .3);
  const pg = ctx.createRadialGradient(0, 0, 30, 0, 0, 360); pg.addColorStop(0, HS(P.o, -20, 4, .75)); pg.addColorStop(.7, HS(P.o, -30, -20, .25)); pg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, 360, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  sprite(ctx, 'circle6', '#ffe6a0', 0, 0, 620, t * .12, .8, true);
  sprite(ctx, 'circle6', hsl(h, 100, 70), 0, 0, 430, -t * .2, .7, true);
  ctx.restore(); ctx.globalCompositeOperation = 'source-over';
  // halo coloré derrière le boss
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow(hsl(h, 100, 62, .55), 330), cx - 330, cy - 330); ctx.globalCompositeOperation = 'source-over';
  // le boss en grand : il regarde vers toi et charge régulièrement une attaque
  const cyc = t % 5;
  b.wind = cyc > 3.6 ? 5 - cyc : 0; b.windMax = 1.4;
  b.main = cyc > 3.6 ? { id: def.phases[0].cycle[Math.floor(t / 5) % def.phases[0].cycle.length].id } : null;
  b.facing = Math.PI * .95 + Math.sin(t * .4) * .25; b.eyesA = b.facing; b.flash = 0;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1.85, 1.85); b.x = 0; b.y = 0;
  try { dessinerBoss(ctx, b); } catch (e) { }
  ctx.restore();
  for (const o of iles) if (o.z >= 0) ile(o);
  // étincelles dorées et pétales qui montent
  if (S.parts.length < 90) S.parts.push({ x: W * .42 + Math.random() * W * .6, y: H + 10, v: 25 + Math.random() * 55, r: 1 + Math.random() * 2.4, p: Math.random() * 6, pet: Math.random() < .35, col: ['#ffe58a', '#ffb3d1', '#fff6d8', hsl(h, 100, 75)][Math.random() * 4 | 0] });
  ctx.globalCompositeOperation = 'lighter';
  for (const q of S.parts) {
    q.y -= q.v / 60; q.x += Math.sin(t * 1.2 + q.p) * .6; const a = Math.min(1, (q.y / H) * 1.6); ctx.globalAlpha = a;
    if (q.pet) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(t * 2 + q.p); ctx.fillStyle = q.col; ctx.beginPath(); ctx.ellipse(0, 0, q.r * 2.2, q.r, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    else ctx.drawImage(glow(q.col, q.r * 3), q.x - q.r * 3, q.y - q.r * 3);
  }
  S.parts = S.parts.filter(q => q.y > -10);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // le texte du menu reste lisible : léger voile à gauche
  if (!_vignette) { _vignette = ctx.createLinearGradient(0, 0, W * .6, 0); _vignette.addColorStop(0, 'rgba(10,6,22,.5)'); _vignette.addColorStop(.7, 'rgba(10,6,22,.18)'); _vignette.addColorStop(1, 'rgba(10,6,22,0)'); }
  ctx.fillStyle = _vignette; ctx.fillRect(-ox / kb - 10, -10, ox / kb + W * .7, sh / kb + 20);
};
