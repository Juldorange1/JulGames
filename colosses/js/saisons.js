'use strict';
/* Colosses — événements de saison et légendes des colosses.
   • Selon la date, une saison est active (Nuit des citrouilles, Fêtes du givre, Éveil des fleurs, Feux de l'été) :
     décor animé dans l'arène et au menu, et 4 apparences de saison achetables avec des cristaux, seulement pendant
     la saison (une fois achetées, elles restent pour toujours).
   • Légendes : chaque espèce a une courte histoire, débloquée dans le Codex après 3 victoires contre elle. */

// ---------- saisons ----------
const SAISONS = [
  { id: 'halloween', nom: 'Nuit des citrouilles', ico: '🎃', de: [10, 15], a: [11, 10], col: '#ff8a1a', part: 'feuilles' },
  { id: 'hiver', nom: 'Fêtes du givre', ico: '❄', de: [12, 1], a: [1, 10], col: '#9fe4ff', part: 'neige' },
  { id: 'printemps', nom: 'Éveil des fleurs', ico: '🌸', de: [3, 20], a: [4, 30], col: '#ff9ad8', part: 'petales' },
  { id: 'ete', nom: 'Feux de l\'été', ico: '☀', de: [7, 1], a: [8, 31], col: '#ffd24d', part: 'lucioles' }
];
const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
function periodeSaison(s) { return s.de[1] + ' ' + MOIS_C[s.de[0] - 1] + ' – ' + s.a[1] + ' ' + MOIS_C[s.a[0] - 1]; }
let _saisonForcee;
function saisonActive(d) {
  if (_saisonForcee === undefined) { const m = /[?&]saison=(\w+)/.exec(location.search); _saisonForcee = m ? m[1] : null; }
  if (_saisonForcee) return SAISONS.find(s => s.id === _saisonForcee) || null;
  d = d || new Date();
  const v = (d.getMonth() + 1) * 100 + d.getDate();
  return SAISONS.find(s => { const a = s.de[0] * 100 + s.de[1], b = s.a[0] * 100 + s.a[1]; return a <= b ? v >= a && v <= b : v >= a || v <= b; }) || null;
}
function saisonOk(id) { const s = saisonActive(); return !!s && s.id === id; }
function nomSaison(id) { const s = SAISONS.find(x => x.id === id); return s ? s.ico + ' ' + s.nom + ' (' + periodeSaison(s) + ')' : ''; }

// apparences de saison : achetées d'un coup (1 « fragment »), seulement pendant leur saison
RARETES.saison = { nom: 'Saison', col: '#ff9a3c', frags: 1, poids: 0 };
PRIX_FRAG.saison = 25;
SKINS.push(
  { id: 'a_citrouille', slot: 'armure', nom: 'Citrouille', rar: 'saison', saison: 'halloween', c: ['#ffe0a8', '#ff7a1a', '#2a0c00'] },
  { id: 'c_sorciere', slot: 'cape', nom: 'Cape de sorcière', rar: 'saison', saison: 'halloween', c: ['#6a1aa0', '#0c0018'], motif: 'etoiles' },
  { id: 't_chauvesouris', slot: 'trainee', nom: 'Nuée de chauves-souris', rar: 'saison', saison: 'halloween', col: '#ff8a1a', add: true, gros: true },
  { id: 'r_lanterne', slot: 'aura', nom: 'Lanterne hantée', rar: 'saison', saison: 'halloween', col: 'rgba(255,140,30,.42)' },
  { id: 'a_givrefete', slot: 'armure', nom: 'Givre de fête', rar: 'saison', saison: 'hiver', c: ['#ffffff', '#b8e8ff', '#1a3a5a'] },
  { id: 'c_flocons', slot: 'cape', nom: 'Cape de flocons', rar: 'saison', saison: 'hiver', c: ['#e8f6ff', '#1e4a8a'], motif: 'etoiles' },
  { id: 't_neige', slot: 'trainee', nom: 'Neige', rar: 'saison', saison: 'hiver', col: '#ffffff', add: true, gros: true },
  { id: 'r_boreale', slot: 'aura', nom: 'Aurore boréale', rar: 'saison', saison: 'hiver', col: 'rgba(120,255,200,.38)' },
  { id: 'a_sakura', slot: 'armure', nom: 'Cerisier', rar: 'saison', saison: 'printemps', c: ['#fff0f6', '#ff9ad0', '#5a1a3a'] },
  { id: 'c_floraison', slot: 'cape', nom: 'Floraison', rar: 'saison', saison: 'printemps', c: ['#ffb0d8', '#2a7a3a'], motif: 'liseré' },
  { id: 't_pollen', slot: 'trainee', nom: 'Pollen', rar: 'saison', saison: 'printemps', col: '#fff6a0', add: true },
  { id: 'r_eclosion', slot: 'aura', nom: 'Éclosion', rar: 'saison', saison: 'printemps', col: 'rgba(255,170,220,.38)' },
  { id: 'a_soleilete', slot: 'armure', nom: 'Soleil d\'été', rar: 'saison', saison: 'ete', c: ['#fff8d0', '#ffb030', '#5a2a00'] },
  { id: 'c_lagon', slot: 'cape', nom: 'Lagon', rar: 'saison', saison: 'ete', c: ['#3ad0ff', '#0a3a6a'], motif: 'etoiles' },
  { id: 't_lucioles', slot: 'trainee', nom: 'Lucioles', rar: 'saison', saison: 'ete', col: '#d8ff6a', add: true, gros: true },
  { id: 'r_canicule', slot: 'aura', nom: 'Canicule', rar: 'saison', saison: 'ete', col: 'rgba(255,200,60,.38)' }
);

// garde-robe : bandeau de la saison en cours
const _gardeSaison = UI.garderobe;
UI.garderobe = function (slot) {
  const r = _gardeSaison.apply(this, arguments);
  try {
    const s = saisonActive(), ec = this.el.querySelector('.eclats');
    if (ec) {
      const d = document.createElement('div'); d.className = 'saison-ban'; d.style.setProperty('--sc', s ? s.col : '#9a94ad');
      if (s) {
        const l = SKINS.filter(k => k.saison === s.id), ok = l.filter(k => possede(k.id)).length;
        d.innerHTML = `<b>${s.ico} Événement : ${s.nom}</b><span>${periodeSaison(s)} · ${l.length} apparences de saison, ${PRIX_FRAG.saison} 💎 chacune (${ok} / ${l.length} obtenues). Elles restent à toi pour toujours.</span>`;
      } else {
        const v = new Date(), suiv = SAISONS.map(x => { let y = v.getFullYear(); let dt = new Date(y, x.de[0] - 1, x.de[1]); if (dt < v) dt = new Date(y + 1, x.de[0] - 1, x.de[1]); return { x, dt }; }).sort((a, b) => a.dt - b.dt)[0];
        d.innerHTML = `<b>📅 Pas d'événement en ce moment</b><span>Prochain : ${suiv.x.ico} ${suiv.x.nom} (${periodeSaison(suiv.x)}). Les apparences de saison ne s'achètent que pendant leur saison.</span>`;
      }
      ec.before(d);
      if (typeof Langue !== 'undefined' && Langue.en) Langue.dom(d);
    }
  } catch (e) { console.warn('saison', e); }
  return r;
};
// menu : petit bandeau de la saison sous le titre
const _menuSaison = UI.menu;
UI.menu = function () {
  const r = _menuSaison.apply(this, arguments);
  try {
    const s = saisonActive(), j = this.el && this.el.querySelector('.accueil .jouer');
    if (s && j) {
      const b = document.createElement('button'); b.className = 'saison-menu'; b.dataset.a = 'garderobe'; b.style.setProperty('--sc', s.col);
      b.innerHTML = `${s.ico} ${s.nom} : apparences de saison dans la garde-robe`;
      b.addEventListener('click', ev => { ev.stopPropagation(); Son.play('clic'); this.action('garderobe', b); });
      j.before(b);
      if (typeof Langue !== 'undefined' && Langue.en) Langue.dom(b);
    }
  } catch (e) { }
  return r;
};

// ---------- décor de saison (arène et menu) ----------
const DecorSaison = {
  parts: [], t0: 0, id: null,
  maj() {
    const s = saisonActive(); if (!s) { this.parts.length = 0; return null; }
    const now = performance.now(), dt = this.t0 ? Math.min(.05, (now - this.t0) / 1000) : 0; this.t0 = now;
    const n = G.opts && G.opts.effetsReduits ? 14 : (G.etat === 'menu' || !G.p ? 42 : 26); // moins dans l'arène : le combat reste lisible
    if (this.id !== s.id) { this.parts.length = 0; this.id = s.id; }
    if (this.parts.length > n) this.parts.length = n;
    while (this.parts.length < n) this.parts.push(this.nouvelle(s, true));
    for (const q of this.parts) {
      q.ph += dt; q.x += (q.vx + Math.sin(q.ph * q.f) * q.amp) * dt; q.y += q.vy * dt; q.a += q.va * dt;
      if (q.y > H + 30 || q.y < -60 || q.x < -60 || q.x > W + 60) Object.assign(q, this.nouvelle(s, false));
    }
    return s;
  },
  nouvelle(s, partout) {
    const R0 = Math.random, p = s.part;
    const q = { x: R0() * W, y: partout ? R0() * H : -20, ph: R0() * 10, f: .5 + R0(), amp: 20 + R0() * 30, a: R0() * TAU, va: R0() * 2 - 1, taille: 3 + R0() * 4, k: R0() };
    if (p === 'neige') Object.assign(q, { vx: R0() * 20 - 10, vy: 30 + R0() * 40, taille: 1.5 + R0() * 2.5 });
    else if (p === 'feuilles') Object.assign(q, { vx: 20 + R0() * 30, vy: 35 + R0() * 35, va: R0() * 4 - 2 });
    else if (p === 'petales') Object.assign(q, { vx: 25 + R0() * 25, vy: 25 + R0() * 30, va: R0() * 3 - 1.5 });
    else Object.assign(q, { x: R0() * W, y: partout ? R0() * H : H + 10, vx: R0() * 16 - 8, vy: -(6 + R0() * 14), amp: 30, taille: 2 + R0() * 2 });
    return q;
  },
  dessiner(c, s, arene) {
    c.save();
    for (const q of this.parts) {
      if (s.part === 'neige') { c.fillStyle = `rgba(255,255,255,${(arene ? .3 : .5) + .4 * q.k})`; c.beginPath(); c.arc(q.x, q.y, q.taille, 0, TAU); c.fill(); }
      else if (s.part === 'feuilles') { c.save(); c.translate(q.x, q.y); c.rotate(q.a); c.globalAlpha = arene ? .5 : .9; c.fillStyle = q.k < .5 ? 'rgb(230,120,30)' : q.k < .8 ? 'rgb(180,64,20)' : 'rgb(140,84,40)'; c.beginPath(); c.ellipse(0, 0, q.taille * 1.6, q.taille * .8, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(60,20,0,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-q.taille * 1.6, 0); c.lineTo(q.taille * 1.6, 0); c.stroke(); c.restore(); }
      else if (s.part === 'petales') { c.save(); c.translate(q.x, q.y); c.rotate(q.a); c.globalAlpha = arene ? .55 : .9; c.fillStyle = q.k < .6 ? 'rgb(255,170,215)' : 'rgb(255,225,240)'; c.beginPath(); c.ellipse(0, 0, q.taille * 1.3, q.taille * .7, 0, 0, TAU); c.fill(); c.restore(); }
      else { const al = .4 + .6 * Math.max(0, Math.sin(q.ph * 2 + q.k * 6)); c.globalCompositeOperation = 'lighter'; c.drawImage(glow(`rgba(210,255,110,${.5 * al})`, 14), q.x - 14, q.y - 14); c.fillStyle = `rgba(240,255,170,${al})`; c.beginPath(); c.arc(q.x, q.y, q.taille * .7, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; }
    }
    // chauves-souris (Halloween) : deux qui traversent de temps en temps
    if (s.id === 'halloween') {
      const T = performance.now() / 1000;
      for (let i = 0; i < 2; i++) {
        const u = ((T * .07 + i * .5) % 1), x = -80 + u * (W + 160), y = 120 + i * 140 + Math.sin(T * 2 + i) * 30, bat = Math.sin(T * 18 + i) * .8;
        c.save(); c.translate(x, y); c.fillStyle = 'rgba(20,6,24,.85)';
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-12, -14 * bat, -26, -4 * bat); c.quadraticCurveTo(-16, 2, -8, 4); c.lineTo(0, 6); c.lineTo(8, 4); c.quadraticCurveTo(16, 2, 26, -4 * bat); c.quadraticCurveTo(12, -14 * bat, 0, 0); c.fill();
        c.restore();
      }
      // citrouilles lumineuses aux coins de l'arène (ou au bas du menu)
      const pts = arene ? [[AR.x + 46, AR.y + 46], [AR.x + AR.w - 46, AR.y + 46], [AR.x + 46, AR.y + AR.h - 40], [AR.x + AR.w - 46, AR.y + AR.h - 40]] : [[70, H - 60], [160, H - 44]];
      for (const [x, y] of pts) citrouille(c, x, y, arene ? 22 : 30, T);
    }
    // voile de givre (hiver) ou chaleur (été) sur les bords
    if (!arene && (s.id === 'hiver' || s.id === 'ete')) {
      const g = c.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 820);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, s.id === 'hiver' ? 'rgba(190,230,255,.18)' : 'rgba(255,180,60,.12)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    c.restore();
  }
};
function citrouille(c, x, y, r, T) {
  c.save(); c.translate(x, y);
  c.globalCompositeOperation = 'lighter'; c.drawImage(glow('rgba(255,140,30,.35)', r * 2.4), -r * 2.4, -r * 2.4); c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#d8661a'; c.strokeStyle = '#6a2a04'; c.lineWidth = 1.5;
  for (const dx of [-.45, .45, 0]) { c.beginPath(); c.ellipse(dx * r, 0, r * .62, r * .78, 0, 0, TAU); c.fill(); c.stroke(); }
  c.fillStyle = '#3a6a1a'; c.fillRect(-r * .08, -r * 1.02, r * .16, r * .3);
  const fl = .75 + .25 * Math.sin(T * 9 + x);
  c.fillStyle = `rgba(255,${200 + 40 * fl | 0},90,${fl})`;
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * .42, -r * .2); c.lineTo(s * r * .18, -r * .2); c.lineTo(s * r * .3, -r * .42); c.closePath(); c.fill(); }
  c.beginPath(); c.moveTo(-r * .45, r * .15); for (let i = 0; i <= 6; i++) c.lineTo(-r * .45 + i * r * .15, r * (i % 2 ? .28 : .42)); c.lineTo(r * .45, r * .15); c.quadraticCurveTo(0, r * .3, -r * .45, r * .15); c.fill();
  c.restore();
}
const _ambSaison = Decor.dessinerAmbiance;
Decor.dessinerAmbiance = function (c) {
  const r = _ambSaison.apply(this, arguments);
  try { if (G.opts.decorAnime !== false) { const s = DecorSaison.maj(); if (s) DecorSaison.dessiner(c, s, true); } } catch (e) { }
  return r;
};
const _fondSaison = fondMenu;
fondMenu = function () {
  const r = _fondSaison.apply(this, arguments);
  try { const s = DecorSaison.maj(); if (s) { const k = cv.width / W; ctx.setTransform(k, 0, 0, k, 0, (cv.height - H * k) / 2); DecorSaison.dessiner(ctx, s, false); } } catch (e) { }
  return r;
};

// ---------- légendes des colosses ----------
const LEGENDES_VICT = 3;
const LEGENDES = {
  bourreau: 'Avant les Colosses, il n\'était qu\'un geôlier armé d\'une seule hache. Les rois tombèrent et les prisons se vidèrent, mais personne ne vint lui dire que les exécutions avaient pris fin. Il frappe encore, par habitude, et compte chaque tête comme une prière.',
  metronome: 'Les bâtisseurs l\'avaient forgé pour donner la mesure aux chantiers des géants. Quand le dernier bâtisseur se tut, il continua de battre, seul, et le monde finit par danser à son rythme. Briser sa cadence, c\'est lui rappeler qu\'il existe d\'autres musiques.',
  sentinelle: 'Elle garde une porte que plus personne ne se souvient avoir ouverte. Ses boucliers ont arrêté mille armées, et une seule lassitude : la sienne. On dit qu\'elle s\'ouvre encore pour ceux qui savent attendre le bon instant.',
  forgeron: 'Il forgea les armes des premiers héros, puis celles de leurs ennemis, puis celles de tout le monde. Un jour il comprit qu\'aucune lame ne durait plus longtemps que la guerre, et il décida de devenir la guerre elle-même. Son enclume résonne encore sous chaque arène.',
  hydre: 'Née du marais où l\'on jetait les rois déchus, elle porte une tête pour chaque couronne engloutie. Ses têtes se disputent sans cesse, et c\'est dans leurs disputes que les héros trouvent une faille.',
  spectre: 'Il fut un duelliste si rapide que la mort elle-même le manqua. Depuis, il erre entre deux battements de cœur, ni vivant ni tout à fait parti. Il ne frappe que lorsqu\'il redevient réel : un instant, juste assez pour être touché.',
  juge: 'Il rendit la justice pendant mille ans sans jamais se tromper, disait-on, car nul n\'osait faire appel. Sa balance pèse désormais les héros qui entrent dans son arène. Ceux qu\'elle trouve trop légers ne ressortent pas.',
  tisseuse: 'Elle tissait les tapisseries qui racontaient l\'histoire du monde, fil après fil. Quand l\'histoire devint trop cruelle, elle se mit à tisser des pièges à la place. Chaque toile qu\'elle tend est un chapitre à traverser sans s\'y prendre.',
  horloger: 'Il construisit une horloge capable de compter le temps qu\'il restait à chaque chose. Quand il y lut sa propre heure, il démonta l\'horloge et s\'en fit une armure. Depuis, ses aiguilles tournent pour les autres.',
  serpent: 'Il s\'enroula autour d\'une montagne pour dormir, et la montagne s\'effondra. Il s\'enroula autour d\'une cité, et la cité oublia son nom. Il cherche encore quelque chose d\'assez solide pour l\'étreindre sans se briser.',
  reine: 'Chaque abeille de son essaim porte le souvenir d\'une fleur disparue. La Reine ne se bat pas pour elle, mais pour un jardin dont elle seule se souvient. Tant qu\'un seul de ses enfants vole, elle ne se rend pas.',
  nebuleuse: 'Elle naquit de la poussière d\'une étoile morte et garde la mémoire de toutes les lumières éteintes. Ses salves sont des constellations qu\'elle redessine sans fin. Pour la vaincre, il faut savoir lire le ciel qu\'elle porte.',
  phenix: 'Il mourut une première fois pour sauver une cité de l\'hiver éternel. Il renaquit, et la cité l\'avait déjà oublié. Depuis, chaque renaissance le rend un peu plus ardent, et un peu moins généreux.',
  mante: 'Elle prie avant chaque combat, et personne ne sait à qui. Les moines qui l\'ont suivie disent qu\'elle ne pardonne jamais deux fois la même erreur. Ceux qui esquivent toutes ses faux voient enfin sa garde s\'ouvrir, comme une réponse à sa prière.',
  titan: 'Les montagnes s\'agenouillèrent quand il se leva pour la première fois. Ses plaques d\'armure sont taillées dans les murailles des royaumes qu\'il a traversés. Chaque plaque brisée laisse voir le cœur d\'une forteresse disparue.',
  reflet: 'Un héros contempla si longtemps son reflet dans le grand miroir des Colosses qu\'il oublia lequel des deux était réel. Le reflet, lui, s\'en souvint : il sortit du miroir et laissa le héros derrière la vitre. Depuis, il imite chaque guerrier qu\'il croise, en cherchant le visage qui le délivrera.',
  inverseur: 'Il garde le sablier où s\'écoule le sens des choses : le haut, le bas, la gauche et la droite. Quand il le retourne, le monde se renverse un instant, et seuls les esprits patients gardent l\'équilibre. Il n\'a jamais été vaincu par la force, seulement par le calme.',
  chimere: 'Personne ne l\'a créée : elle s\'est assemblée seule, avec les morceaux que les autres Colosses laissaient derrière eux. Elle ne sait pas ce qu\'elle est, alors elle essaie d\'être tout à la fois. Mais même le chaos a ses habitudes, et elle répète toujours son cycle.'
};
function legendeTexte(id) { const L = typeof Langue !== 'undefined' && Langue.en && Langue.L.legendes; return (L && L[id]) || LEGENDES[id] || ''; }
function nbLegendes() { const cx = Save.d.codex.especes; return Object.keys(LEGENDES).filter(e => cx[e] && cx[e].tues >= LEGENDES_VICT).length; }
function blocLegende(id, v) {
  if (!LEGENDES[id]) return '';
  const n = v ? v.tues : 0;
  if (n >= LEGENDES_VICT) return `<div class="cx-legende"><b>📜 Légende</b><p>${legendeTexte(id)}</p></div>`;
  return `<div class="cx-legende verrou"><b>📜 Légende</b><p>Encore ${LEGENDES_VICT - n} victoire${LEGENDES_VICT - n > 1 ? 's' : ''} pour la découvrir.</p></div>`;
}
if (typeof TITRES !== 'undefined') TITRES.push({ id: 'conteur', nom: 'Conteur', desc: 'Découvrir 10 légendes dans le Codex.', ok: () => nbLegendes() >= 10 });
