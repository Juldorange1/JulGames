/* Panthéa — interface : parties à affrontements (normal, difficile, boss tous les 10) qui font progresser la réserve,
   exploits, défi du jour (ses points débloquent des talents), plateau en forêt, créatures animées, sons, raccourcis,
   tutoriel, plusieurs langues (voir i18n.js : L('texte français')). Tout tient à l'écran, sans défilement. */
(function () {
  'use strict';
  const E = StratEngine();
  const T = E.T;
  const L = I18N.L;
  const $ = id => document.getElementById(id);
  const COLS = 'abcdefghijkl';
  const isDesktop = /Electron/i.test(navigator.userAgent);
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sfx = (n, v, d) => Sound.sfx(n, v, d);
  const LEVELS = ['facile', 'normal', 'impossible'];
  const LEVELIC = { facile: '🌱', normal: '⚔️', impossible: '🧠' };
  const levelName = lv => ({ facile: L('Bot facile'), normal: L('Bot normal'), impossible: L('Bot stratège') })[lv] || L('Bot normal');
  const levelDesc = lv => ({ facile: L('Pour apprendre.'), normal: L('Un vrai adversaire.'), impossible: L('Le plus fort : il calcule plusieurs coups à l’avance.') })[lv];
  const catName = c => ({ M: L('Dieu'), G: L('Garde'), S: L('Soldat'), B: L('Boss') })[c];
  const tn = i => I18N.name(T[i]);
  const td = i => I18N.desc(T[i]);
  const PN = ['', ''];
  const sqName = q => { const g = G ? G.s.g : { W: 8, H: 8 }; return COLS[q % g.W] + (g.H - ((q / g.W) | 0)); };
  const fmt1 = v => String(Math.round(v * 10) / 10);

  // ---------- sauvegarde ----------
  function lsGet(k, d) { try { const v = localStorage.getItem('stratajium.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem('stratajium.' + k, JSON.stringify(v)); } catch (e) { } }
  try { localStorage.removeItem('stratajium.adapt'); } catch (e) { } // le bot n'apprend plus ta façon de jouer
  const ser = o => JSON.stringify(o, (k, v) => ArrayBuffer.isView(v) ? { __t: v.constructor.name, a: Array.from(v) } : v);
  // les anciens plateaux (Int8Array) passent en Int16Array : sinon les persos des Ombres et les derniers boss débordent
  const deser = str => JSON.parse(str, (k, v) => !v || !v.__t ? v : k === 'b' && v.__t === 'Int8Array' ? Int16Array.from(v.a, x => x < -2 ? x + 256 : x) : new self[v.__t](v.a));
  const pseudo = () => lsGet('pseudo', '') || L('Joueur');
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // ---------- jetons : une créature dans un cadre aux couleurs du camp ----------
  document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <radialGradient id="bg0" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fff4cf"/><stop offset=".7" stop-color="#f0c45a"/><stop offset="1" stop-color="#b8801c"/></radialGradient>
    <radialGradient id="bg1" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#f1e8ff"/><stop offset=".7" stop-color="#b294f4"/><stop offset="1" stop-color="#6a3fd1"/></radialGradient>
    <filter id="shTint" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".30 .28 .22 0 .06  .20 .20 .20 0 .02  .42 .34 .40 0 .12  0 0 0 1 0"/></filter>
    <radialGradient id="bgn" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fbf8f2"/><stop offset=".7" stop-color="#d4ccbe"/><stop offset="1" stop-color="#8a8070"/></radialGradient>
  </defs></svg>`);
  // la couronne des dieux du joueur change de couleur avec son Cercle (bronze, argent, or, rubis, émeraude, saphir, améthyste, diamant)
  const CROWN = ['#7a4e08', '#cd7f32', '#c9ccd4', '#ffd700', '#e0115f', '#2ec27e', '#2f6fe4', '#a24bff', '#bff6ff'];
  let myCercle = 0;
  let tokSeed = 0;
  function token(ti, o) {
    const t = T[ti];
    const bg = o === 0 ? 'url(#bg0)' : o === 1 ? 'url(#bg1)' : 'url(#bgn)';
    const st = o === 0 ? '#7a4e08' : o === 1 ? '#2e1466' : '#5a5246';
    const cbm = typeof SET !== 'undefined' && SET.vision === 'daltonien';
    const ring = o === 0 ? (TOK && TOK.gem ? GEMS[TOK.gem] : '#ffd86a') : o === 1 ? (cbm ? '#8fd0ff' : '#c8a8ff') : '#e8e0d0';
    const mast = o === 0 && TOK ? stars(TOK.pp[t.id]) : 0;
    let frame, k = .9, cy = 52;
    if (t.cat === 'M') {
      frame = `<polygon points="50,3 92,26 92,74 50,97 8,74 8,26" fill="${bg}" stroke="${st}" stroke-width="5"/><polygon points="50,9 87,29 87,71 50,91 13,71 13,29" fill="none" stroke="${ring}" stroke-width="2.4" opacity=".9"/>`;
      k = .94; cy = 55;
    } else if (t.cat === 'G') {
      frame = `<path d="M50 3 L91 16 L87 56 Q81 83 50 97 Q19 83 13 56 L9 16 Z" fill="${bg}" stroke="${st}" stroke-width="5"/><path d="M50 9 L85 20 L82 55 Q77 77 50 90 Q23 77 18 55 L15 20 Z" fill="none" stroke="${ring}" stroke-width="2.2" opacity=".9"/>`;
      k = .94; cy = 50;
    } else if (t.cat === 'B') {
      const pts = []; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 41 : 48; pts.push(`${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`); }
      frame = `<polygon points="${pts.join(' ')}" fill="#3a0e0e" stroke="${st}" stroke-width="3.4"/><circle cx="50" cy="50" r="39" fill="${bg}" stroke="${ring}" stroke-width="3"/>`;
      k = .98; cy = 51;
    } else {
      frame = `<circle cx="50" cy="50" r="45" fill="${bg}" stroke="${st}" stroke-width="5.5"/><circle cx="50" cy="50" r="39" fill="none" stroke="${ring}" stroke-width="2.2" opacity=".9"/>`;
      k = 1; cy = 51;
    }
    const moon = t.fac ? `<circle cx="81" cy="80" r="11" fill="#14081f" stroke="#c8a8ff" stroke-width="2"/><path d="M84 72 A9 9 0 1 0 84 88 A7 7 0 1 1 84 72 Z" fill="#e8dcff"/>` : '';
    const crown = t.cat === 'M' ? `<path d="M38 16 L38 6 L44 11 L50 3 L56 11 L62 6 L62 16 Z" fill="${o === 0 ? CROWN[Math.min(myCercle, CROWN.length - 1)] : st}" stroke="${ring}" stroke-width="1.2"/>` : '';
    const d = ((tokSeed++ * 7919) % 4700) / 1000;
    // mode daltoniens : triangle pour toi (camp 0), carré pour l'adversaire, en plus de la couleur
    const cbBadge = cbm && o >= 0 ? (o === 0 ? '<g><circle cx="16" cy="18" r="11" fill="#1a1206" stroke="#ffd86a" stroke-width="2.5"/><path d="M16 11 L23 23 L9 23 Z" fill="#ffd86a"/></g>' : '<g><circle cx="16" cy="18" r="11" fill="#06121f" stroke="#8fd0ff" stroke-width="2.5"/><rect x="10.5" y="12.5" width="11" height="11" fill="#8fd0ff"/></g>') : '';
    return `<svg class="tk" viewBox="0 0 100 100">${frame}<g transform="translate(50 ${cy}) scale(${k}) translate(-50 -52)"><g class="crit" style="--d:-${d.toFixed(2)}s"><g class="ink">${Art.get(t.id)}</g>${Art.get(t.id)}</g></g><ellipse class="gloss" cx="36" cy="26" rx="22" ry="11" transform="rotate(-28 36 26)"/>${crown}${moon}${cbBadge}${mast ? `<g class="mast"><path d="M84 3 L88 12 L98 13 L90.5 19.5 L93 29 L84 24 L75 29 L77.5 19.5 L70 13 L80 12 Z" fill="#ffd86a" stroke="#5a3a08" stroke-width="1.6"/><text x="84" y="21.5" text-anchor="middle" font-size="${mast > 9 ? 8 : 10}" font-weight="900" fill="#3a2404">${mast}</text></g>` : ''}</svg>`;
  }
  const BRAMBLE = `<svg class="bramble" viewBox="0 0 100 100"><g fill="none" stroke-linecap="round">
    <path d="M10 70 Q30 30 55 45 T92 25" stroke="#5a7a2a" stroke-width="7"/><path d="M8 35 Q40 60 60 80 T95 72" stroke="#4a6a22" stroke-width="6"/>
    <path d="M22 50 l-6 -6 M40 40 l2 -8 M62 47 l6 -5 M80 33 l2 -8 M30 55 l-5 6 M52 70 l-7 3 M72 78 l3 7" stroke="#c9d89a" stroke-width="3"/></g>
    <g fill="#3f6a2a"><ellipse cx="45" cy="42" rx="7" ry="3.5" transform="rotate(-30 45 42)"/><ellipse cx="68" cy="76" rx="7" ry="3.5" transform="rotate(20 68 76)"/></g>
    <g fill="#b8323a"><circle cx="33" cy="58" r="3"/><circle cx="74" cy="32" r="3"/></g></svg>`;
  const WEB = `<svg class="bramble" viewBox="0 0 100 100"><g fill="none" stroke="#e8e8f0" stroke-width="2.4" opacity=".9"><path d="M50 4 V96 M4 50 H96 M14 14 L86 86 M86 14 L14 86"/><path d="M50 22 L70 30 L78 50 L70 70 L50 78 L30 70 L22 50 L30 30 Z"/><path d="M50 38 L59 41 L62 50 L59 59 L50 62 L41 59 L38 50 L41 41 Z"/></g></svg>`;
  const STONE = `<svg class="bramble" viewBox="0 0 100 100"><path d="M18 78 L24 40 L42 22 L66 24 L82 44 L80 76 Z" fill="#8a8a84" stroke="#4a4a44" stroke-width="3"/><path d="M34 46 L44 40 M58 34 L66 48 M40 64 L56 60" stroke="#5a5a54" stroke-width="2.4"/><circle cx="44" cy="52" r="3" fill="#5a5a54"/><circle cx="60" cy="52" r="3" fill="#5a5a54"/></svg>`;
  // courant (DLC « Les Abysses ») : une flèche d'eau dans le sens du courant
  const DIR_ANGLE = { 1: -90, 6: 90, 3: 180, 4: 0 };
  const currentSvg = d => `<svg class="specic cur" viewBox="0 0 100 100"><g transform="rotate(${DIR_ANGLE[d] || 0} 50 50)"><path d="M14 38 Q30 30 46 38 T78 38" fill="none" stroke="#9fe8ff" stroke-width="7" stroke-linecap="round" opacity=".8"/><path d="M14 62 Q30 54 46 62 T78 62" fill="none" stroke="#9fe8ff" stroke-width="7" stroke-linecap="round" opacity=".8"/><path d="M70 26 L92 50 L70 74 Z" fill="#dff8ff"/></g></svg>`;
  const CORAL = `<svg class="bramble" viewBox="0 0 100 100"><path d="M50 92 L50 52 M50 64 L30 44 L26 24 M50 60 L72 40 L74 20 M50 52 L50 28" stroke="#ff6a7a" stroke-width="10" stroke-linecap="round" fill="none"/><circle cx="26" cy="22" r="6" fill="#ffb0b8"/><circle cx="74" cy="18" r="6" fill="#ffb0b8"/><circle cx="50" cy="26" r="7" fill="#ffb0b8"/></svg>`;
  const SPEC_SVG = [null,
    `<svg class="specic" viewBox="0 0 100 100"><polygon points="50,8 72,40 50,92 28,40" fill="#7fd3ff" stroke="#1a5a8a" stroke-width="5"/><polygon points="50,8 60,40 50,92" fill="#c4ecff" opacity=".7"/></svg>`,
    `<svg class="specic" viewBox="0 0 100 100"><circle cx="38" cy="55" r="22" fill="#3d7a35"/><circle cx="62" cy="50" r="24" fill="#4f9440"/><circle cx="50" cy="34" r="20" fill="#62a84e"/></svg>`,
    null,
    `<svg class="specic" viewBox="0 0 100 100"><path d="M22 80 L78 80 L70 52 L30 52 Z" fill="#3a2a52" stroke="#1a1028" stroke-width="5"/><rect x="26" y="44" width="48" height="10" rx="3" fill="#5a3f80"/><path d="M50 40 C40 30 44 18 50 10 C56 18 60 30 50 40 Z" fill="#b48cff"/><path d="M50 36 C46 30 47 24 50 18 C53 24 54 30 50 36 Z" fill="#efe2ff"/></svg>`,
    `<svg class="specic" viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="#fff6c8" opacity=".5"/><g stroke="#ffe27a" stroke-width="6" stroke-linecap="round"><path d="M50 8 V24 M50 76 V92 M8 50 H24 M76 50 H92 M20 20 L31 31 M69 69 L80 80 M80 20 L69 31 M31 69 L20 80"/></g><circle cx="50" cy="50" r="16" fill="#fffbe6" stroke="#ffd34a" stroke-width="4"/></svg>`,
    `<svg class="specic" viewBox="0 0 100 100"><ellipse cx="50" cy="52" rx="30" ry="38" fill="#2a1450" stroke="#9a6bff" stroke-width="7"/><ellipse cx="50" cy="52" rx="18" ry="25" fill="none" stroke="#5ad1ff" stroke-width="5" stroke-dasharray="12 8"/><circle cx="50" cy="52" r="7" fill="#d9c6ff"/></svg>`];

  // ---------- réglages ----------
  const SET = Object.assign({ decor: 'auto', anim: 'normal', coords: true, vision: 'normale', rumble: true, test: false }, lsGet('reglages', {}));
  function applySettings() {
    document.body.classList.toggle('anim-off', SET.anim === 'aucune');
    document.body.classList.toggle('anim-fast', SET.anim === 'rapide');
    document.body.classList.toggle('no-coords', !SET.coords);
    document.body.classList.toggle('cb', SET.vision === 'daltonien');
  }
  applySettings();

  // ---------- extensions (DLC) : activées par défaut, on peut les couper ----------
  const DLC = Object.assign({ abysses: true, ombres: true }, lsGet('dlc', {}));
  const dlcOn = k => !!DLC[k];
  const allM = () => E.ALL_M.concat(dlcOn('abysses') ? E.DLC_M : []);
  const allG = () => E.ALL_G.concat(dlcOn('abysses') ? E.DLC_G : []);
  const bossList = () => E.BOSSES.concat(dlcOn('abysses') ? E.BOSSES_DLC : []);
  const themeList = () => Decor.BASE_THEMES.concat(dlcOn('abysses') ? ['abysses'] : [], dlcOn('ombres') ? ['nuit'] : []);
  // une partie de l'armée des Ombres (r.fac = 1) débloque les persos des Ombres
  const runM = r => r.fac ? E.SH_M : allM(), runG = r => r.fac ? E.SH_G : allG();
  const startM = r => r.fac ? E.SH_START_M : E.START_M, startG = r => r.fac ? E.SH_START_G : E.START_G;
  // jumeaux : perso des Ombres -> perso de la Lumière qui lui fait face (et l'inverse)
  const REV = {}; for (const k in E.TWIN) REV[E.TWIN[k]] = k;
  const lightOf = ids => [...new Set(ids.map(x => E.TWIN[x] || x).filter(x => !isSh(x)))], shadowOf = ids => [...new Set(ids.map(x => isSh(x) ? x : REV[x]).filter(Boolean))];
  const mid = id => E.MID[E.TI[id]] || id; // ses pouvoirs viennent de ce perso
const isSh = id => !!T[E.TI[id]].fac;
  // ---------- décors ----------
  const bgDecor = Decor.create(), boardDecor = Decor.create();
  const bgSeed = 1 + rnd(1e6);
  let theme = SET.decor !== 'auto' && Decor.THEMES[SET.decor] ? SET.decor : pick(themeList());
  const otherTheme = () => pick(themeList().filter(t => t !== theme));
  function setTheme(t, quiet) {
    if (t === theme) return;
    theme = t;
    $('terrain').dataset.theme = t;
    bgDecor.setTheme(t);
    if (G && $('game').classList.contains('on')) boardDecor.setTheme(t);
    if (!quiet && G && $('game').classList.contains('on')) sys(L('Le décor change : {d}.', { d: I18N.themeName(t) }));
  }
  let themeT = 0;
  function scheduleTheme() {
    clearTimeout(themeT);
    themeT = setTimeout(() => { if (SET.decor === 'auto') setTheme(otherTheme()); scheduleTheme(); }, (180 + rnd(240)) * 1000);
  }
  scheduleTheme();
  bgDecor.scene($('bgForest'), bgSeed, theme);
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { bgDecor.scene($('bgForest'), bgSeed, theme); if (G && $('game').classList.contains('on')) layoutBoard(); if (!$('codexModal').hidden) renderCodex(); }, 200);
  });

  // ---------- écrans ----------
  function show(id) {
    setTimeout(() => { if (typeof padHint !== 'function') return; padHint(); padAutoFocus(); }, 0);
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id !== 'game') { boardDecor.stop(); closeSheet(); }
    if (['menu', 'newrun', 'run', 'duel', 'ext', 'story', 'season'].includes(id)) Sound.want(['menu']);
  }
  let toastT = 0;
  function toast(txt, ms) { const t = $('toast'); t.innerHTML = txt; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms || 3200); }
  document.addEventListener('click', e => { if (e.target.closest('button, .chip.click, .lvl, .evo, .choice')) sfx('clic', .7); }, true);
  function translateStatic() {
    document.documentElement.lang = I18N.lang;
    document.querySelectorAll('[data-l]').forEach(el => { el.textContent = L(el.getAttribute('data-l')); });
    $('btnMusic').title = L('Musique (M)'); $('btnSfx').title = L('Effets sonores (N)'); $('btnSet').title = L('Paramètres (O)');
    $('btnUndo').title = L('Revenir un coup en arrière');
  }

  // =====================================================================
  //  Parties
  // =====================================================================
  let RUNS = lsGet('runs', null);
  if (!Array.isArray(RUNS) || RUNS.length < 3) RUNS = [null, null, null];
  while (RUNS.length < 5) RUNS.push(null); // les emplacements 4 et 5 viennent du DLC « Les Ombres » (gardés même s'il est désactivé)
  const nSlots = () => dlcOn('ombres') ? 5 : 3;
  const saveRuns = () => lsSet('runs', RUNS);
  const SEEN = new Set(lsGet('vus', E.START_M.concat(E.START_G, ['s'])));
  for (const r of RUNS) if (r) { for (const id of (r.gods || []).concat(r.gards || [])) SEEN.add(id); if (r.fac) SEEN.add('os'); } // ce qui est déjà dans tes parties
  function markSeen(ids) { let n = 0; for (const id of ids) if (id && !SEEN.has(id)) { SEEN.add(id); n++; } if (n) lsSet('vus', [...SEEN]); }
  function markSeenState(s) { // tout ce qu'on peut voir dans un affrontement : la réserve commune, les réserves, la carte, le boss
    const ids = [];
    for (let i = 0; i < E.NT; i++) if ((s.pool[i] > 0 && (!s.fac || E.canRec(s, 0, i) || E.canRec(s, 1, i))) || s.res[0][i] > 0 || s.res[1][i] > 0) ids.push(T[i].id);
    for (let q = 0; q < s.g.N; q++) if (s.b[q] > 0) ids.push(T[E.tix(s.b[q])].id);
    markSeen(ids);
  }
  let cur = -1, newSlot = 0;
  const run = () => RUNS[cur];
  const TRACKS = { gard: 4, god: 6, map: 3, ev: 3 }; // points à atteindre : victoire normale +1, difficile +2, défaite +½ sur les derniers choix
  const TRACK_GROUPS = [['gard', 'god'], ['map', 'ev']]; // après une victoire : une barre de chaque groupe avance
  const newT = () => ({ gard: 0, god: 0, map: 0, ev: 0, last: ['gard', 'map'] });
  const lockGard = r => runG(r).filter(x => !r.gards.includes(x) && !SPECIAL.has(x)), lockGod = r => runM(r).filter(x => !r.gods.includes(x) && !SPECIAL.has(x));
  const trackOpen = (r, k) => k === 'gard' ? lockGard(r).length > 0 : k === 'god' ? lockGod(r).length > 0 : k === 'map' ? r.mapLv < 4 : r.evChance < 100;
  const TRACK_IC = { gard: '🛡️', god: '👑', map: '🗺️', ev: '🎲' };
  const trackName = k => ({ gard: L('Nouveau garde'), god: L('Nouveau dieu'), map: L('Carte plus sauvage'), ev: L('Plus d’événements') })[k];
  const trackHint = (r, k) => k === 'gard' ? L('Un garde de plus dans ta réserve, au choix.') : k === 'god' ? L('Un dieu de plus dans ta réserve, au choix.')
    : k === 'map' ? L('Niveau {n} : {d}', { n: r.mapLv + 1, d: I18N.mapLevel(r.mapLv + 1) }) : L('+25 % de chance d’un événement à chaque affrontement.');
  // handicaps difficiles, mesurés sur 1 440 parties : les « ronces » aidaient, la « geôle » ne gênait pas, la carte ou un événement n'étaient pas des handicaps
  const HARD = ['mana', 'riche', 'avance', 'dieupris', 'soldats', 'pauvre', 'silence', 'gardespris', 'blesse'];
  const hardName = id => ({
    mana: L('Tu commences avec 40 mana de moins'), riche: L('L’adversaire commence avec 100 mana de plus'),
    avance: L('L’adversaire a déjà un garde posé'), premier: L('L’adversaire joue en premier'),
    sauvage: L('Carte plus sauvage d’un niveau'), evenement: L('Un événement à coup sûr'), dieupris: L('L’adversaire a déjà recruté un dieu'),
    soldats: L('L’adversaire commence avec 2 soldats déjà posés'), pauvre: L('La réserve commune n’a qu’un garde de chaque sorte'),
    silence: L('Tu ne peux pas activer de perso pendant tes 3 premiers tours'), geole: L('Tu ne peux pas placer de perso pendant tes 3 premiers tours'),
    ronces: L('Des ronces poussent dans ta moitié de carte'), gardespris: L('L’adversaire a déjà recruté 2 gardes'),
    blesse: L('Tu commences avec un garde déjà perdu'),
    aube: L('L’aube arrive : gagne en 80 de tes tours, sinon c’est perdu'), paladins: L('L’adversaire a déjà 2 gardes posés'),
    invasion4: L('L’invasion demande 4 Ombres au lieu de 3'), sansombre: L('Pas de soldats des Ombres dans la réserve'),
    veilleurs: L('2 lumières sacrées brillent dans ta moitié de carte'),
  })[id];
  // handicaps qui n'existent que dans les parties des Ombres (DLC)
  const SH_HARD = ['aube', 'paladins', 'invasion4', 'veilleurs']; // (« sansombre » toucherait aussi l'adversaire, qui joue les Ombres)
  const SH_HARD_MIX = ['mana', 'riche', 'silence'];
  // exploits : certains persos ne se débloquent QUE par un exploit (dans la partie en cours)
  const EXPLOITS = [
    { id: 'colline', piece: 'dr', test: s => s.goal === 'colline' },
    { id: 'percee', piece: 'cv', test: s => s.goal === 'percee' },
    { id: 'massacre', piece: 'lc', test: s => s.goal === 'massacre' },
    { id: 'chasse', piece: 'c5', test: s => s.goal === 'chasse' },
    { id: 'endurance', piece: 'gd', test: s => s.goal === 'endurance' },
    { id: 'intact', piece: 'pr', test: s => s.lost[0][0] + s.lost[0][1] + s.lost[0][2] === 0 },
    { id: 'phenix', piece: 'gu', test: s => s.lost[0][1] >= 3 },
    { id: 'boss', piece: 'pa', test: s => !!s.boss },
  ];
  const exploitText = id => ({
    colline: L('Gagne un « Roi de la colline »'), percee: L('Gagne une « Percée »'), massacre: L('Gagne un « Massacre »'), chasse: L('Gagne une « Chasse au dieu »'),
    endurance: L('Gagne une « Endurance »'), intact: L('Gagne sans perdre un seul perso'), phenix: L('Gagne après avoir perdu 3 gardes'), boss: L('Bats un boss'),
  })[id];
  const SPECIAL = new Set(EXPLOITS.map(e => e.piece));
  // talents : débloqués pour toujours par les points de défi du jour
  const TALENTS = [
    { pts: 50, id: 'mana1' }, { pts: 150, id: 'recrue' }, { pts: 300, id: 'vite' }, { pts: 500, id: 'mana2' }, { pts: 800, id: 'garde' }, { pts: 1200, id: 'dieu' },
  ];
  const talentName = id => ({
    mana1: L('+10 mana au début de chaque affrontement'), recrue: L('Un soldat offert dans ta réserve à chaque affrontement'), vite: L('Nouveaux persos plus vite : un garde tous les 3 points, un dieu tous les 5'),
    mana2: L('Encore +10 mana au début de chaque affrontement'), garde: L('Chaque nouvelle partie commence avec 1 garde de plus'), dieu: L('Chaque nouvelle partie commence avec 1 dieu de plus'),
  })[id];
  const dailyData = () => Object.assign({ total: 0, days: {} }, lsGet('daily', {}));
  // statistiques gardées pour toujours : points des persos (+1 à chaque recrutement, placement ou activation), affrontements par sorte…
  const statsData = () => Object.assign({ pts: {}, used: {}, usedW: {}, modes: {}, bosses: {}, kills: 0, lost: 0, battles: 0, turns: 0, ms: 0 }, lsGet('stats', {}));
  const hasTalent = id => { const t = TALENTS.find(x => x.id === id); return t && dailyData().total >= t.pts; };

  // ---------- renommée de la partie (sans fin) et maîtrise des persos (étoiles, sans fin) ----------
  const XPN = n => 40 + 10 * n; // renommée pour passer du niveau n au suivant : ça ralentit doucement
  function fameLevel(xp) { let n = 0; xp = xp || 0; while (xp >= XPN(n)) { xp -= XPN(n); n++; } return { n, cur: xp, need: XPN(n) }; }
  const roman = n => { let s = ''; for (const [v, r] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { s += r; n -= v; } return s; };
  const TITLES = () => [L('Recrue'), L('Écuyer'), L('Soldat'), L('Sergent'), L('Capitaine'), L('Commandant'), L('Champion'), L('Général'), L('Maréchal'), L('Seigneur'), L('Héros'), L('Roi'), L('Empereur'), L('Légende'), L('Demi-dieu'), L('Dieu vivant')];
  const fameTitle = n => { const T0 = TITLES(); return n < T0.length ? T0[n] : T0[T0.length - 1] + ' ' + roman(n - T0.length + 2); };
  // couleurs de cadre pour tes persos : une de plus tous les 2 niveaux
  const GEMS = ['#ffd86a', '#d08a4a', '#e6ebf2', '#ff4a6a', '#3fe08a', '#4aa8ff', '#c070ff', '#ff9a30', '#7ad0a0', '#ff7f9a', '#bff4ff', '#8a7aaa'];
  const gemLevel = k => 2 * k;
  const stars = pts => Math.floor(Math.sqrt((pts || 0) / 15)); // 15, 60, 135, 240… points : toujours une étoile de plus, de plus en plus lentement
  let TOK = null; // { pp, gem } de la partie en cours : étoiles et couleur sur tes persos
  const setTok = r => { TOK = r ? { pp: r.pp || {}, gem: r.gem || 0 } : null; };
  function fameGain(r, mode, w) {
    const base = w === 0 ? (mode === 'boss' ? 24 : mode === 'hard' ? 16 : 10) : w === 1 ? 3 : 4;
    return Math.round(base * (1 + .1 * Math.min(r.cercle || 0, 10)));
  }
  const BOSS_ORDER = E.BOSSES; // chaque partie les rencontre dans un ordre tiré au hasard (r.bossSeq)
  // ---------- Cercles : la difficulté monte sans fin ----------
  // Cercle 0 = bot facile, 1 = normal, 2 = stratège ; ensuite chaque Cercle ajoute un fardeau, puis +1 point de vie aux boss par Cercle.
  // Quand tout est débloqué, on peut monter au Cercle suivant : la réserve repart du début (débloquer à l'infini).
  const FARDEAUX = ['pv', 'mana', 'carte', 'hard3', 'event', 'boss7', 'soldat'];
  const cercleBot = () => 'impossible'; // dans une partie, le bot joue toujours au mieux (pas de failles faciles à exploiter)
  // l'avantage : les désavantages du bot. Un de moins à chaque victoire (deux en difficile), un de plus à chaque défaite :
  // la difficulté suit ton niveau
  const EDGE_MAX = 6;
  const startEdge = c => Math.max(0, EDGE_MAX - 2 * c);
  // mesuré : le mana et les tours bloqués pèsent peu ; les gardes déjà perdus pèsent beaucoup
  const edgeMana = e => (e >= 1 ? 30 : 0) + (e >= 3 ? 30 : 0);
  const edgeGuards = e => (e >= 2 ? 1 : 0) + (e >= 4 ? 1 : 0) + (e >= 6 ? 1 : 0);
  const edgeRules = e => [edgeMana(e) ? L('Le bot commence avec {n} mana de moins', { n: edgeMana(e) }) : '', edgeGuards(e) ? L('Le bot commence avec {n} garde(s) déjà perdu(s)', { n: edgeGuards(e) }) : '',
    e >= 3 ? L('Le bot ne peut pas activer de perso pendant ses 2 premiers tours') : '', e >= 5 ? L('Le bot ne peut pas placer de perso pendant ses 2 premiers tours') : ''].filter(Boolean);
  function applyEdge(s, e, b) {
    s.mana[b] = Math.max(0, s.mana[b] - edgeMana(e));
    s.lost[b][1] += edgeGuards(e);
    if (e >= 3) s.noAct[b] = Math.max(s.noAct[b], 2);
    if (e >= 5) s.noPlace[b] = Math.max(s.noPlace[b], 2);
  }
  const edgeBar = e => `<span class="edge" title="${esc(L('Avantage : les désavantages du bot. Un de moins à chaque victoire (deux en difficile), un de plus à chaque défaite.'))}">🎚️ ${L('Avantage {n}/{m}', { n: e, m: EDGE_MAX })}</span>`;
  const fardeaux = c => FARDEAUX.slice(0, Math.max(0, c - 2));
  const hasF = (r, f) => fardeaux(r.cercle).includes(f);
  const bossHpBonus = c => Math.min(3, (c >= 3 ? 1 : 0) + Math.max(0, c - 2 - FARDEAUX.length)); // plafonné : le boss reste toujours battable
  const fardeauText = (f, c) => ({
    pv: L('Les boss ont {n} point(s) de vie en plus', { n: bossHpBonus(c) }), mana: L('Tu commences chaque affrontement avec 20 mana de moins'),
    carte: L('Les cartes sont au moins de niveau 2'), hard3: L('Les affrontements difficiles ont 3 handicaps'), event: L('Un événement à chaque affrontement'),
    boss7: L('Un boss tous les 7 affrontements au lieu de 10'), soldat: L('L’adversaire commence avec un soldat déjà posé'),
  })[f];
  const cercleLabel = c => L('Cercle {n}', { n: c });
  const cercleMax = () => lsGet('cercleMax', 0);
  // ce qui change en montant au Cercle c
  const cercleNew = c => c <= 2 ? L('Tu commences avec un avantage de {n}/{m}', { n: startEdge(c), m: EDGE_MAX }) : (c - 2 <= FARDEAUX.length ? fardeauText(FARDEAUX[c - 3], c) : fardeauText('pv', c));
  const bossEvery = r => hasF(r, 'boss7') ? 7 : 10;
  const isBossBattle = r => r.n % bossEvery(r) === 0;
  const bossOf = r => { const seq = r.bossSeq && r.bossSeq.length ? r.bossSeq : BOSS_ORDER; return seq[(Math.floor(r.n / bossEvery(r)) - 1) % seq.length]; };
  // poids de chaque malus : on n'en cumule jamais trop, pour que l'affrontement reste gagnable en jouant parfaitement
  const HARD_W = { mana: 2, riche: 1, avance: 2, premier: 1, sauvage: 1, evenement: 1, dieupris: 1, soldats: 2, pauvre: 1, silence: 1, geole: 1, ronces: 1, gardespris: 2, blesse: 4, aube: 2, paladins: 2, invasion4: 1, sansombre: 2, veilleurs: 1 };
  function rollHard(r) {
    const n = hasF(r, 'hard3') ? 3 : 2, cap = n === 3 ? 4 : 3; // plus doux : 2 malus légers, ou 3 avec le fardeau du Cercle
    const pool = (r.fac ? SH_HARD.concat(SH_HARD_MIX) : HARD).filter(x => HARD_W[x] < 3); // « garde déjà perdu » est retiré : trop dur
    // toujours la même difficulté : la somme des poids vaut exactement le plafond (sinon le plus proche en dessous)
    let near = null;
    for (let t = 0; t < 200; t++) { const h = shuffle(pool).slice(0, n), w = h.reduce((a, x) => a + HARD_W[x], 0); if (w > cap || (r.fac && !h.some(x => SH_HARD.includes(x)))) continue; if (w === cap) return h; if (!near || w > near.w) near = { h, w }; }
    return near ? near.h : ['mana', 'pauvre', 'silence'].slice(0, n);
  }
  const allUnlocked = r => runM(r).every(x => r.gods.includes(x)) && runG(r).every(x => r.gards.includes(x)) && r.mapLv >= 4 && r.evChance >= 100;

  // réserve de départ (nouvelle partie, ou montée au Cercle suivant)
  function freshReserve(r) {
    Object.assign(r, { gods: startM(r).slice(), gards: startG(r).slice(), mapLv: 0, evChance: 0, n: 1, match: null, pending: [], exploits: [],
      t: newT() });
    const lockG = runG(r).filter(x => !r.gards.includes(x) && !SPECIAL.has(x)), lockM = runM(r).filter(x => !r.gods.includes(x) && !SPECIAL.has(x));
    if (hasTalent('garde') && lockG.length) r.gards.push(pick(lockG));
    if (hasTalent('dieu') && lockM.length) r.gods.push(pick(lockM));
    r.hard = rollHard(r);
    r.bossSeq = bossSeqFor(r);
  }
  // les parties des Ombres rencontrent d'abord les 4 boss de la Lumière
  const bossSeqFor = r => (r.fac ? shuffle(E.SH_BOSSES) : []).concat(shuffle(bossList()));
  function newRun(cercle, fac) {
    const r = { cercle, fac: fac || 0, level: cercleBot(cercle), edge: startEdge(cercle), wins: 0, winsH: 0, losses: 0, news: [], created: Date.now() };
    freshReserve(r);
    if (cercle > cercleMax()) lsSet('cercleMax', cercle);
    return r;
  }
  function ascend(r) {
    r.cercle++; r.level = cercleBot(r.cercle); r.edge = startEdge(r.cercle);
    freshReserve(r);
    if (r.cercle > cercleMax()) lsSet('cercleMax', r.cercle);
    r.news.push(L('Bienvenue au Cercle {n} !', { n: r.cercle }) + '<br>' + L('Nouveau : {x}', { x: cercleNew(r.cercle) }));
    myCercle = r.cercle;
    saveRuns(); sfx('evolution'); renderRun(); nextReward();
  }
  function migrate(r) {
    if (!r) return r;
    if (r.level === 'deux') r.level = 'normal'; // le mode à deux n'existe plus
    if (r.cercle === undefined) r.cercle = { facile: 0, normal: 1, impossible: 2 }[r.level] ?? 1; // le niveau du bot devient un Cercle
    r.level = cercleBot(r.cercle);
    if (r.edge === undefined) r.edge = startEdge(r.cercle);
    if (!r.t) r.t = newT();
    if (r.t.gN !== undefined) { // ancienne progression (tout avançait à la fois) : convertie en points
      const o = r.t, h = (x, m) => Math.min(m - .5, Math.floor(x * 2) / 2);
      r.t = { gard: h(Math.max(o.gN * 4 / 5, o.gH * 4 / 3), TRACKS.gard), god: h(Math.max(o.dN * 6 / 8, o.dH * 6 / 5), TRACKS.god), map: h(o.map * 3 / 4, TRACKS.map), ev: h(o.ev * 3 / 5, TRACKS.ev), last: ['gard', 'map'] };
    }
    if (!r.hard || r.hard.some(x => ['premier', 'sauvage', 'evenement', 'geole', 'ronces'].includes(x))) r.hard = rollHard(r); // handicaps retirés
    if (!Array.isArray(r.pending)) r.pending = [];
    if (!r.news) r.news = [];
    if (!r.exploits) r.exploits = [];
    if (r.winsH === undefined) r.winsH = 0;
    if (r.xp === undefined) r.xp = 0;
    if (r.hard && (r.hard.includes('blesse') || r.hard.includes('sansombre') || r.hard.reduce((a, x) => a + (HARD_W[x] || 1), 0) > (hasF(r, 'hard3') ? 4 : 3))) r.hard = rollHard(r); // nouveaux malus, plus doux
    if (!r.pp) r.pp = {};
    if (r.gem === undefined) r.gem = 0;
    if (!r.bossSeq || r.bossSeq.length !== bossList().length + (r.fac ? E.SH_BOSSES.length : 0)) r.bossSeq = bossSeqFor(r);
    if (r.fac === undefined) r.fac = 0;
    // partie des Ombres : chaque perso de la Lumière déjà débloqué devient son jumeau des Ombres
    if (r.fac && (r.gods.some(x => !isSh(x)) || r.gards.some(x => !isSh(x)) || !E.SH_START_M.every(x => r.gods.includes(x)))) {
      r.gods = shadowOf(E.SH_START_M.concat(r.gods)); r.gards = shadowOf(E.SH_START_G.concat(r.gards));
      r.pending = r.pending.filter(pd => pd.opts.every(isSh));
    }
    // persos retirés du jeu (trop proches d'un autre) : chacun est remplacé par un autre perso encore à découvrir de la même sorte
    for (const k of ['gods', 'gards']) {
      const all = k === 'gods' ? runM(r) : runG(r), out = r[k].filter(x => !E.RETIRED.has(x));
      for (let n = r[k].length - out.length; n > 0; n--) { const alt = shuffle(all.filter(x => !out.includes(x) && !SPECIAL.has(x))); if (alt.length) out.push(alt[0]); }
      r[k] = out;
    }
    r.pending = r.pending.map(pd => pd.opts ? Object.assign(pd, { opts: pd.opts.filter(x => !E.RETIRED.has(x)) }) : pd).filter(pd => !pd.opts || pd.opts.length);
    return r;
  }
  RUNS = RUNS.map(migrate);
  RUNS.forEach(r => { if (r && r.cercle > cercleMax()) lsSet('cercleMax', r.cercle); });

  // ---------- menu ----------
  function renderMenu() {
    setTok(null);
    $('hello').innerHTML = L('Bonjour, <b>{p}</b> !', { p: esc(pseudo()) });
    let h = '';
    const free = [];
    RUNS.slice(0, nSlots()).forEach((r, i) => {
      if (!r) { free.push(i); return; }
      h += `<div class="slot"><div class="num">${i + 1}</div><div class="inf"><b>${cercleLabel(r.cercle)} · ${edgeBar(r.edge)}${dlcOn('ombres') || r.fac ? `<br><span class="army ${r.fac ? 'sh' : 'li'}">${r.fac ? '🌑 ' + L('Armée des Ombres') : '☀️ ' + L('Armée de la Lumière')}</span>` : ''}</b>
        <small>${L('{w} victoire(s) dont {h} difficile(s)', { w: r.wins, h: r.winsH })}${r.match ? ' · ' + L('(en cours)') : ''}</small></div>
        <button class="big" data-open="${i}">${L('Continuer')}</button><button class="ghost sm danger" data-del="${i}" title="${L('Supprimer')}">🗑</button></div>`;
    });
    // les emplacements libres tiennent sur une seule ligne
    if (free.length) h += `<div class="slot empty"><div class="num">＋</div><div class="inf"><b>${free.length > 1 ? L('{n} emplacements libres', { n: free.length }) : L('Emplacement libre')}</b></div><button class="big" data-new="${free[0]}">${L('Nouvelle partie')}</button></div>`;
    $('slots').innerHTML = h;
    $('slots').querySelectorAll('[data-new]').forEach(b => b.onclick = () => { newSlot = +b.dataset.new; renderLevels(); show('newrun'); });
    $('slots').querySelectorAll('[data-open]').forEach(b => b.onclick = () => openRun(+b.dataset.open));
    $('slots').querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      if (b.dataset.sure) { RUNS[+b.dataset.del] = null; saveRuns(); renderMenu(); sfx('annule'); return; }
      b.dataset.sure = 1; b.textContent = L('Sûr ?'); setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = '🗑'; } }, 2500);
    });
    renderDaily();
  }
  // nouvelle partie : on commence au Cercle 0 ; on peut commencer plus haut (c'est affiché dans la partie)
  let newFac = 0;
  function renderLevels() {
    const top = Math.max(2, cercleMax()), cs = [];
    for (let c = 1; c <= top; c++) cs.push(`<button data-c="${c}">${cercleLabel(c)} · 🎚️ ${startEdge(c)}${c >= 3 ? ' · ' + fardeaux(c).length + ' ' + L('Fardeaux').toLowerCase() : ''}</button>`);
    $('levels').className = 'newc';
    const facSeg = dlcOn('ombres') ? `<div class="seg" id="facSeg"><button data-f="0" class="${newFac ? '' : 'sel'}">☀️ ${L('Armée de la Lumière')}</button><button data-f="1" class="${newFac ? 'sel' : ''}">🌑 ${L('Armée des Ombres')}</button></div>` : '';
    const facInfo = dlcOn('ombres') ? `<p class="facinfo">${newFac ? '🌑 ' + L('Pouvoirs à part et cachée dans le noir : un garde ou un soldat ennemi ne peut pas la prendre à plus de 4 cases. Elle gagne aussi avec 3 persos dans la zone de placement adverse.') : '☀️ ' + L('L’armée de base. Elle gagne en tuant tous les dieux adverses ou 4 de leurs gardes.')}</p>` : '';
    $('levels').innerHTML = facSeg + facInfo + `<p class="muted center">${L('Le bot joue toujours au mieux, mais il a des désavantages qui suivent ton niveau : un de moins à chaque victoire (deux en difficile), un de plus à chaque défaite. Quand tu as tout débloqué, tu montes au Cercle suivant : tout recommence, avec moins d’avantage puis des fardeaux.')}</p>
      <button class="big" data-c="0">${L('Commencer au Cercle 0')} <small>(${L('conseillé')})</small></button>
      <p class="muted center">${L('Ou commencer plus haut :')}</p><div class="seg">${cs.join('')}</div>`;
    $('levels').querySelectorAll('[data-c]').forEach(b => b.onclick = () => { RUNS[newSlot] = newRun(+b.dataset.c, dlcOn('ombres') ? newFac : 0); saveRuns(); openRun(newSlot); });
    $('levels').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { newFac = +b.dataset.f; renderLevels(); });
  }
  $('btnNewBack').onclick = () => { renderMenu(); show('menu'); };
  function toggleMusic() { Sound.setMusic(!Sound.music); $('btnMusic').classList.toggle('off', !Sound.music); }
  function toggleSfx() { Sound.setEffects(!Sound.effects); $('btnSfx').classList.toggle('off', !Sound.effects); }
  $('btnMusic').onclick = toggleMusic; $('btnSfx').onclick = toggleSfx;
  $('btnMusic').classList.toggle('off', !Sound.music); $('btnSfx').classList.toggle('off', !Sound.effects);
  if (isDesktop) { $('btnQuit').hidden = false; $('btnQuit').onclick = () => window.close(); }

  // ---------- écran de la partie ----------
  function openRun(i) { cur = i; myCercle = run().cercle; renderRun(); show('run'); nextReward(); }
  function chips(ids, all) {
    const on = all.filter(id => ids.includes(id)), off = all.length - on.length;
    const many = on.length > 6 ? ' ic' : '';
    return on.map(id => { const i = E.TI[id]; return `<span class="chip click${many}" data-info="${i}" title="${esc(tn(i))}">${token(i, 0)}${many ? '' : `<span>${tn(i)}</span>`}</span>`; }).join('') + (off ? `<span class="chip locked">+${off} ${L('à découvrir')}</span>` : '');
  }
  function bar(v, max, label) { return `<div class="trk"><span>${label}</span><div class="meter"><i style="width:${Math.min(100, 100 * v / max)}%"></i></div><small>${fmt1(v)}/${max}</small></div>`; }
  function fameBlock(r) {
    const f = fameLevel(r.xp);
    const nextGem = GEMS.findIndex((c, k) => f.n < gemLevel(k));
    const gems = GEMS.map((c, k) => { const ok = f.n >= gemLevel(k); if (!ok && k !== nextGem) return ''; return `<button class="gem ${r.gem === k ? 'sel' : ''}" ${ok ? `data-gem="${k}"` : 'disabled'} title="${esc(ok ? L('Couleur de tes persos') : L('Débloquée au niveau {n}', { n: gemLevel(k) }))}" style="--g:${c}">${ok ? '' : '🔒'}</button>`; }).join('');
    return `<h4>👑 ${L('Renommée')} : <span class="gold">${fameTitle(f.n)}</span> · ${L('niveau {n}', { n: f.n })}</h4><div class="famerow">${bar(f.cur, f.need, '')}<div class="gems" title="${esc(L('Maîtrise : chaque perso gagne des étoiles en jouant (recruter, placer, activer).'))}">${gems}</div></div>`;
  }
  function renderRun() {
    const r = run(), t = r.t;
    setTok(r);
    const allG = runG(r).every(x => r.gards.includes(x) || SPECIAL.has(x)), allD = runM(r).every(x => r.gods.includes(x) || SPECIAL.has(x));
    let h = `<div class="runtop"><h2 class="title">${L('Partie {n}', { n: cur + 1 })}${r.fac ? ' · 🌑' : ''} · ${cercleLabel(r.cercle)} · ${edgeBar(r.edge)}</h2>
      <div class="runhead"><span>${L('{w} victoire(s) dont {h} difficile(s)', { w: r.wins, h: r.winsH })}</span></div></div>
      <div class="runbody"><div class="runcol">
        <h4>🎚️ ${L('Désavantages du bot')} · ${r.edge}/${EDGE_MAX}</h4>${edgeRules(r.edge).length ? `<ul class="fards">${edgeRules(r.edge).map(x => `<li>${x}</li>`).join('')}</ul>` : `<p class="muted small">${L('Aucun : le bot joue à pleine force.')}</p>`}
        <h4>${L('Dieux dans la réserve')}</h4><div class="row">${chips(r.gods, runM(r))}</div>
        <h4>${L('Gardes dans la réserve')} (${L('2 de chaque')})</h4><div class="row">${chips(r.gards, runG(r))}</div>
        ${fardeaux(r.cercle).length ? `<h4>${L('Fardeaux')}</h4><ul class="fards">${fardeaux(r.cercle).map(f => `<li>${fardeauText(f, r.cercle)}</li>`).join('')}</ul>` : ''}
      </div><div class="runcol">
        ${fameBlock(r)}
        <h4>${L('Progression')}</h4><p class="muted trkhint">${L('Après chaque victoire, tu choisis ce qui avance : un garde ou un dieu, puis la carte ou les événements.')}</p>
        ${allG ? `<div class="trk done">${L('Tous les gardes sont débloqués')}</div>` : bar(t.gard, need('gard'), '🛡️ ' + L('Nouveau garde'))}
        ${allD ? `<div class="trk done">${L('Tous les dieux sont débloqués')}</div>` : bar(t.god, need('god'), '👑 ' + L('Nouveau dieu'))}
        ${r.mapLv >= 4 ? `<div class="trk done">🗺️ ${L('Carte')} : ${L('niveau {n}', { n: 4 })}/4</div>` : bar(t.map, TRACKS.map, `🗺️ ${L('Carte plus sauvage')} <small>(${L('niveau {n}', { n: r.mapLv })}/4)</small>`)}
        ${r.evChance >= 100 ? `<div class="trk done">🎲 ${L('Événements')} : 100 %</div>` : bar(t.ev, TRACKS.ev, `🎲 ${L('Plus d’événements')} <small>(${r.evChance} %)</small>`)}
        ${r.fac ? '' : `<h4>${L('Exploits')} <small class="muted">· ${L('chacun fait gagner un perso rare')}</small></h4>`}<div class="exps"${r.fac ? ' hidden' : ''}>${EXPLOITS.map(x => { const done = r.exploits.includes(x.id) || r.gods.includes(x.piece) || r.gards.includes(x.piece); const gd = ['colline', 'percee', 'massacre', 'chasse', 'endurance'].includes(x.id) ? L('Objectif mystère') + ' : ' + I18N.goalDesc(x.id) : ''; return `<span class="exp ${done ? 'done' : ''}" title="${esc(exploitText(x.id) + (gd ? ' — ' + gd : ''))}">${token(E.TI[x.piece], done ? 0 : -1)}<span>${done ? '✓ ' : ''}${exploitText(x.id)}</span></span>`; }).join('')}</div>
      </div></div>`;
    if (r.match) h += `<div class="choices one"><button class="choice" id="btnResume"><span class="ic">▶</span><b>${L('Reprendre l’affrontement')}</b></button></div><div class="menu-actions"><button class="ghost danger sm" id="btnForfeit">${L('Abandonner l’affrontement')}</button>`;
    else if (isBossBattle(r)) { const b = E.TI[bossOf(r)]; h += `<div class="choices one"><button class="choice boss" id="btnStart"><span class="bossic">${token(b, 1)}</span><b>${L('Affrontement de boss : {b}', { b: tn(b) })}</b><small>${td(b)}</small><small class="gold">${L('Tue le boss pour gagner. Récompense : un perso tiré au hasard parmi tous ceux à découvrir.')}</small></button></div><div class="menu-actions">`; }
    else h += `<div class="choices${allUnlocked(r) ? ' three' : ''}">
        <button class="choice" id="btnStart"><span class="ic">⚔️</span><b>${L('Affrontement normal')}</b><small>${L('Une victoire = 1 point de progression, que tu places où tu veux.')}</small></button>
        <button class="choice hard" id="btnHard"><span class="ic">🔥</span><b>${L('Affrontement difficile')}</b><small>${r.hard.map(hardName).join(' · ')}</small><small class="gold">${L('Plus dur, mais une victoire = 2 points de progression.')}</small></button>
        ${allUnlocked(r) ? `<button class="choice asc" id="btnAsc"><span class="ic">🔁</span><b>${L('🔁 Monter au Cercle {n}', { n: r.cercle + 1 }).replace(/^🔁\s*/, '')}</b><small>${L('Tu as tout débloqué ! Tu recommences avec la réserve de départ, contre un adversaire plus coriace. Tes victoires restent comptées.')}</small><small class="gold">${L('Nouveau : {x}', { x: cercleNew(r.cercle + 1) })}</small></button>` : ''}
      </div><div class="menu-actions">`;
    h += `<button class="ghost sm" id="btnRunCodex">${L('📖 Codex')}</button><button class="ghost sm" id="btnRunMenu">${L('← Menu')}</button></div>`;
    $('runBox').innerHTML = h;
    $('runBox').querySelectorAll('[data-info]').forEach(c => c.onclick = () => { const id = T[+c.dataset.info].id, n = stars(r.pp && r.pp[id]); toast(`<b>${tn(+c.dataset.info)}</b> : ${td(+c.dataset.info)}<br>⭐ ${L('Maîtrise')} : ${n} · ${L('{p} points', { p: (r.pp && r.pp[id]) || 0 })}`, 5000); });
    $('runBox').querySelectorAll('[data-gem]').forEach(b => b.onclick = () => { r.gem = +b.dataset.gem; saveRuns(); sfx('choix'); renderRun(); });
    if ($('btnStart')) $('btnStart').onclick = () => startMatch(isBossBattle(r) ? 'boss' : 'normal');
    if ($('btnHard')) $('btnHard').onclick = () => startMatch('hard');
    if ($('btnResume')) $('btnResume').onclick = resumeMatch;
    if ($('btnAsc')) $('btnAsc').onclick = e => {
      const b = e.currentTarget;
      if (!b.dataset.sure) { b.dataset.sure = 1; b.querySelector('b').textContent = L('Sûr ? Ta réserve repart de zéro'); return; }
      ascend(r);
    };
    if ($('btnForfeit')) $('btnForfeit').onclick = e => {
      const b = e.currentTarget;
      if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = L('Sûr ? Ça compte comme une défaite'); return; }
      r.match = null; r.losses++; lossProgress(r); r.edge = Math.min(EDGE_MAX, r.edge + 1); r.n++; r.hard = rollHard(r); saveRuns(); sfx('annule'); renderRun();
    };
    $('btnRunCodex').onclick = () => openCodex('progression');
    $('btnRunMenu').onclick = () => { renderMenu(); show('menu'); };
  }

  // ---------- récompenses ----------
  // points à atteindre (le talent « plus vite » retire 1 point aux gardes et aux dieux)
  const need = k => TRACKS[k] - (hasTalent('vite') && (k === 'gard' || k === 'god') ? 1 : 0);
  function lossProgress(r) { for (const k of r.t.last || []) if (trackOpen(r, k)) r.t[k] += .5; checkUnlocks(r); } // une défaite rapporte un peu, sur tes derniers choix
  function checkUnlocks(r) {
    const t = r.t, lockG = lockGard(r), lockM = lockGod(r);
    if (lockG.length && t.gard >= need('gard')) { r.pending.push({ k: 'gard', opts: [pick(lockG)] }); t.gard = 0; }
    if (lockM.length && t.god >= need('god')) { r.pending.push({ k: 'god', opts: [pick(lockM)] }); t.god = 0; }
    if (t.map >= TRACKS.map) { t.map = 0; if (r.mapLv < 4) { r.mapLv++; r.news.push(L('🗺️ Cartes plus sauvages : niveau {n} — {d}', { n: r.mapLv, d: I18N.mapLevel(r.mapLv) })); } }
    if (t.ev >= TRACKS.ev) { t.ev = 0; if (r.evChance < 100) { r.evChance += 25; r.news.push(L('🎲 Chance d’événement : {e} %', { e: r.evChance })); } }
  }
  function grantWin(r, mode, s) {
    // exploits
    if (!r.fac) for (const x of EXPLOITS) {
      if (r.exploits.includes(x.id) || !x.test(s)) continue;
      r.exploits.push(x.id);
      const isGod = T[E.TI[x.piece]].cat === 'M', list = isGod ? r.gods : r.gards;
      if (!list.includes(x.piece)) { list.push(x.piece); r.news.push(L('🏅 Exploit ! {x} rejoint ta réserve.', { x: tn(E.TI[x.piece]) })); }
    }
    // boss vaincu : un perso au hasard parmi tous ceux à découvrir
    if (mode === 'boss') {
      const lock = runM(r).concat(runG(r)).filter(x => !r.gods.includes(x) && !r.gards.includes(x));
      if (lock.length) r.pending.push({ k: 'any', opts: [pick(lock)] });
    }
    // progression : une barre de chaque groupe avance, celle que tu choisis (seule ouverte : elle avance toute seule)
    const amt = mode === 'hard' ? 2 : 1, ask = [];
    for (const g of TRACK_GROUPS.map(g => g.filter(k => trackOpen(r, k))).filter(g => g.length)) if (g.length === 1) r.t[g[0]] += amt; else ask.push(g);
    if (ask.length) r.pending.push({ k: 'track', groups: ask, amt });
    checkUnlocks(r);
  }
  // après une victoire : tu choisis une barre dans chaque groupe
  function trackChoice(r, pd) {
    const sel = pd.groups.map(() => null);
    let n = 0;
    $('evoTitle').textContent = L('Que veux-tu faire avancer ?');
    $('evoSub').textContent = pd.groups.length > 1 ? L('Choisis une chose dans chaque groupe : elle avance de +{n}.', { n: pd.amt }) : L('Choisis ce qui avance de +{n}.', { n: pd.amt });
    $('evos').innerHTML = pd.groups.map((g, gi) => `<div class="tgrp"><span class="tgl">${gi === 0 && g.includes('gard') ? L('Ta réserve') : L('Le terrain')}</span>${g.map(k => {
      const v = r.t[k] || 0, mx = need(k), nv = Math.min(mx, v + pd.amt);
      return `<button class="evo tch" data-k="${n++}" data-g="${gi}" data-t="${k}"><span class="tic">${TRACK_IC[k]}</span><b>${trackName(k)}</b><p>${trackHint(r, k)}</p>
        <div class="meter"><i style="width:${100 * v / mx}%"></i><i class="plus" style="left:${100 * v / mx}%;width:${100 * (nv - v) / mx}%"></i></div><small>${fmt1(v)} → ${fmt1(nv)}/${mx}${nv >= mx ? ' ✨' : ''}</small></button>`;
    }).join('')}</div>`).join('');
    $('evoModal').hidden = false;
    sfx('evolution');
    $('evos').querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      const gi = +b.dataset.g;
      sel[gi] = b.dataset.t; sfx('choix');
      $('evos').querySelectorAll(`[data-g="${gi}"]`).forEach(x => x.classList.toggle('sel', x === b));
      if (sel.some(x => !x)) return;
      for (const k of sel) r.t[k] += pd.amt;
      r.t.last = sel.slice();
      r.pending.shift(); checkUnlocks(r); saveRuns();
      setTimeout(() => { $('evoModal').hidden = true; renderRun(); nextReward(); }, 280);
    });
  }
  let afterRewards = null; // ce qui s'ouvre une fois les récompenses prises (le bilan, à la fin d'un affrontement)
  function nextReward() {
    const r = run();
    if (!r) return;
    if (r.news.length) { toast(r.news.join('<br>'), 5000); r.news = []; saveRuns(); sfx('evolution'); }
    const pd = r.pending[0];
    if (!pd) { if (afterRewards) { const f = afterRewards; afterRewards = null; f(); } return; }
    if (pd.k === 'track') return trackChoice(r, pd);
    $('evoTitle').textContent = pd.k === 'god' ? L('Nouveau dieu débloqué !') : pd.k === 'gard' ? L('Nouveau garde débloqué !') : L('Récompense du boss !');
    $('evoSub').textContent = L('Il rejoint ta réserve pour tous les prochains affrontements.');
    markSeen(pd.opts);
    $('evos').innerHTML = pd.opts.map((id, k) => { const i = E.TI[id], t = T[i]; return `<button class="evo" data-k="${k}"><div class="kind">${catName(t.cat)}</div>${token(i, 0)}<b>${tn(i)}</b><p>${td(i)}${t.cost ? ` <span style="color:var(--mana)">💎 ${t.cost}</span>` : ''}</p></button>`; }).join('');
    $('evoModal').hidden = false;
    sfx('evolution');
    $('evos').querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      const id = pd.opts[+b.dataset.k];
      if (T[E.TI[id]].cat === 'M') r.gods.push(id); else r.gards.push(id);
      r.pending.shift(); saveRuns();
      $('evoModal').hidden = true;
      renderRun(); nextReward();
    });
  }

  // =====================================================================
  //  Défi du jour (ses points débloquent des talents pour toutes les parties)
  // =====================================================================
  // défis du jour et de la semaine : toujours un objectif à record (pas seulement gagner)
  const RECORDS = ['vite', 'econome', 'sobre', 'propre', 'carnage', 'survie', 'defi'];
  const dailyName = id => ({ vite: L('Éclair'), survie: L('Survie'), propre: L('Sans une égratignure'), carnage: L('Carnage'), econome: L('Économe'), sobre: L('Sobriété'), defi: L('Défi choisi') })[id];
  const dailyDesc = id => ({
    vite: L('Gagne en jouant le moins de tours possible.'), survie: L('Le bot stratège veut ta peau : tiens le plus de tours possible (et gagne si tu peux).'),
    propre: L('Gagne en perdant le moins de persos possible.'), carnage: L('Tue le plus de persos possible en 25 de tes tours.'),
    econome: L('Gagne en dépensant le moins de mana possible.'), sobre: L('Gagne en activant tes persos le moins de fois possible.'),
    defi: L('Choisis toi-même tes handicaps avant de jouer : plus ils sont durs, plus ta victoire rapporte.'),
  })[id];
  // handicaps qu'on peut se choisir dans un « Défi choisi » (+ ceux des Ombres si tu joues l'armée des Ombres)
  const pickableHard = p => ['mana', 'riche', 'avance', 'dieupris', 'soldats', 'gardespris', 'pauvre', 'silence', 'blesse'].concat(p.fac && p.fac[0] === 1 ? ['aube', 'paladins', 'invasion4'] : []);
  // la mesure du record et les points qu'elle rapporte
  function recInfo(G, goal) {
    const s = G.s, st = G.st, me = G.me, win = s.winner === me && !s.long, myT = Math.ceil((s.ply + (s.first0 === me ? 1 : 0)) / 2);
    const lost = s.lost[me][0] + s.lost[me][1] + s.lost[me][2], kills = s.lost[1 - me][0] + s.lost[1 - me][1] + s.lost[1 - me][2];
    switch (goal) {
      case 'vite': return { v: myT, txt: L('{n} tours', { n: myT }), score: win ? Math.max(10, 150 - 3 * myT) : 0 };
      case 'econome': { const m = st.mana[me]; return { v: m, txt: L('{n} mana dépensée', { n: m }), score: win ? Math.max(10, 150 - Math.round(m / 4)) : 0 }; }
      case 'sobre': { const a = st.act[me][2]; return { v: a, txt: L('{n} activations', { n: a }), score: win ? Math.max(10, 150 - 5 * a) : 0 }; }
      case 'propre': return { v: lost, txt: L('{n} perdu(s)', { n: lost }), score: win ? Math.max(10, 150 - 20 * lost) : 0 };
      case 'carnage': return { v: kills, txt: L('{k} ennemi(s) tué(s)', { k: kills }), score: kills * 10 + (s.winner === me ? 20 : 0) };
      case 'survie': return { v: myT, txt: L('{n} tours', { n: myT }), score: Math.min(200, myT * 2 + (s.winner === me ? 60 : 0)) };
      case 'defi': { const d = (G.hard || []).reduce((x, h) => x + (HARD_W[h] || 1), 0); return { v: d, txt: L('difficulté {n}', { n: d }), score: win ? 50 + 25 * d : 0 }; }
    }
    return { v: 0, txt: '', score: win ? 100 : 0 };
  }
  // persos des défis : totalement au hasard (nombre, sortes), la Lumière et les Ombres peuvent se mélanger
  // toujours 7 sortes de persos recrutables (2 ou 3 dieux + des gardes ; les soldats en plus) : assez pour varier,
  // et il reste des persos à découvrir dans tes parties
  function pick10(Ms, Gs, noGods) { const nm = noGods ? 0 : 2 + rnd(2); return [shuffle(Ms).slice(0, nm), shuffle(Gs).slice(0, 7 - nm)]; }
  function randomArmy(noGods) {
    const mode = rnd(4), from = (L0, S0) => mode === 0 ? L0 : mode === 1 ? S0 : L0.concat(S0); // Lumière seule, Ombres seules, ou mélange (une fois sur deux)
    const [M, Gd] = pick10(from(E.ALL_M, E.SH_M), from(E.ALL_G, E.SH_G), noGods);
    const gods = M.filter(x => !isSh(x)), gards = Gd.filter(x => !isSh(x)), shM = M.filter(isSh), shG = Gd.filter(isSh);
    const light = gods.length + gards.length, dark = shM.length + shG.length;
    return { gods, gards, shM, shG, fac: !dark ? null : !light ? [1, 1] : [2, 2] };
  }
  const armyChips = p => { const ids = (p.gods || []).concat(p.shM || [], p.gards || [], p.shG || []); return ids.length ? `<div class="armyrow">${ids.map(id => `<span class="achip" title="${esc(tn(E.TI[id]))}">${token(E.TI[id], 0)}</span>`).join('')}</div>` : ''; };
  const facTag = f => !f ? '' : f[0] === 2 ? '☀️🌑 ' + L('Lumière et Ombres mélangées') : f[0] === 1 && f[1] === 1 ? '🌑 ' + L('Aujourd’hui : l’armée des Ombres des deux côtés !') : f[0] === 1 ? '🌑 ' + L('Aujourd’hui : tu joues l’armée des Ombres contre la Lumière !') : '🌑 ' + L('Aujourd’hui : l’armée des Ombres est en face !');
  function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function hashStr(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) || 1; }
  function dailyCfg() {
    const date = today(), seed = hashStr('stratajium-' + date);
    return E.withSeed(seed, () => {
      const goal = RECORDS[rnd(RECORDS.length)];
      const level = goal === 'survie' ? 'impossible' : (Math.random() < .5 ? 'normal' : 'impossible');
      const army = randomArmy();
      const evs = E.EVENTS.filter(e => e.id !== 'objectif' && e.id !== 'pari' && !(army.fac && ['cache', 'inverse'].includes(e.id))); // pas de draft avec les Ombres
      return Object.assign({ date, seed, goal, level, perso: pick(Object.keys(E.PERSOS)), mapLv: 2 + rnd(3), ev: Math.random() < .4 ? pick(evs).id : null, mapSeed: 1 + rnd(1e9) }, army);
    });
  }
  function renderDaily() {
    const c = dailyCfg(), d = dailyData(), best = d.days[c.date];
    const got = TALENTS.filter(t => d.total >= t.pts).length;
    // le menu reste simple : les règles du défi s'affichent quand on l'ouvre
    $('dailyBox').innerHTML = `<div class="dleft"><h2>📅 ${L('Défi du jour')}</h2><b class="dgoal">🏆 ${dailyName(c.goal)}</b>
        <small>${best ? L('Aujourd’hui : {p} pts', { p: best.best }) + (best.m ? ` · ${best.m}` : '') : L('Pas encore joué aujourd’hui.')}</small></div>
      <div class="dmid"><div class="pts">${d.total}</div><small>${L('points de défi')}</small><small class="tal" title="${esc(L('Tes points de défi débloquent des talents : des petits bonus pour tes parties.'))}">🎁 ${L('Talents : {n}/{t}', { n: got, t: TALENTS.length })}</small></div>
      <div class="dright"><button class="big" id="btnDaily">${best ? L('Rejouer') : L('Jouer le défi')}</button>${dlcOn('ombres') ? `<button class="ghost" id="btnWeekly">🗓️ ${L('Défi de la semaine')}</button>` : ''}</div>`;
    $('btnDaily').onclick = startDaily;
    if ($('btnWeekly')) $('btnWeekly').onclick = () => openSeason('menu');
  }
  const dailyScore = G => recInfo(G, G.chal).score;
  function startDaily() {
    const c = dailyCfg();
    cur = -1; myCercle = 0;
    const map = E.withSeed(c.mapSeed, () => { const m = E.makeMap('aleatoire', c.mapLv); if (c.fac) E.addShadowSpecs(m); return m; });
    pre = { ev: c.ev, map, first: rnd(2), bet: [null, null], level: c.level, mode: 'daily', daily: c, chal: c.goal, hard: [], perso: c.perso, gods: c.gods, gards: c.gards,
      fac: c.fac || null, shM: c.shM || null, shG: c.shG || null, theme: c.fac && c.fac[0] === 1 ? 'nuit' : null };
    showPre(true);
  }

  // =====================================================================
  //  Préparation d'un affrontement
  // =====================================================================
  let pre = null;
  function pickEvent() {
    const tot = E.EVENTS.reduce((a, e) => a + (e.weight || 1), 0);
    let x = Math.random() * tot;
    for (const e of E.EVENTS) { x -= e.weight || 1; if (x < 0) return e.id; }
    return E.EVENTS[0].id;
  }
  function startMatch(mode) {
    const r = run(), hard = mode === 'hard', boss = mode === 'boss';
    const hs = hard ? r.hard : [];
    const mapLv = Math.max(boss || hasF(r, 'carte') ? 2 : 0, Math.min(4, r.mapLv + (hs.includes('sauvage') ? 1 : 0)));
    const ev = boss ? null : (hs.includes('evenement') || hasF(r, 'event') || Math.random() * 100 < r.evChance ? pickEvent() : null);
    const currents = dlcOn('abysses') && mapLv >= 2 && Math.random() < .35;
    const map = E.makeMap(mapLv === 0 ? 'classique' : 'aleatoire', mapLv, currents);
    if (r.fac) E.addShadowSpecs(map); // autels, lumières sacrées, portails
    const first = rnd(2); // qui commence : toujours tiré au sort
    // armée des Ombres : l'adversaire (la Lumière) a autant de sortes de persos que toi
    const more = (base, all, n) => base.concat(shuffle(all.filter(x => !base.includes(x))).slice(0, Math.max(0, n)));
    // les persos de base vont dans la réserve commune ; ceux des Ombres, seuls les Ombres peuvent les prendre
    // partie des Ombres : la Lumière en face a les mêmes sortes de persos (leurs jumeaux)
    // partie des Ombres : l'adversaire joue lui aussi l'armée des Ombres (même réserve commune)
    const oppM = r.fac ? [] : r.gods, oppG = r.fac ? [] : r.gards;
    pre = { ev, map, first, bet: [null, null], level: r.level, mode, hard: hs, perso: pick(Object.keys(E.PERSOS)), gods: oppM, gards: oppG, boss: boss ? bossOf(r) : null, cercle: r.cercle, edge: r.edge,
      fac: r.fac ? [1, 1] : null, shM: r.fac ? r.gods.slice() : null, shG: r.fac ? r.gards.slice() : null, theme: currents ? 'abysses' : r.fac ? 'nuit' : null };
    if (!ev && !hard && !boss) return beginMatch();
    showPre(false);
  }
  const bossQuote = id => ({
    bt: L('Je suis la montagne. Les montagnes ne reculent pas.'), bn: L('Tes morts m’appartiennent déjà.'), bd: L('Approche, petit dieu, que je voie si tu brûles bien.'),
    bh: L('Coupe une tête, il en repousse deux. Tu connais la chanson.'), bq: L('Ma ruche a mille dards. Tu n’as qu’une peau.'), bk: L('Tout ce qui flotte finit au fond.'),
    bg: L('Reste immobile… pour toujours.'), bv: L('La terre gronde. Écoute-la bien : c’est peut-être ton dernier tour.'), bw: L('Chaque pas te prend un peu plus dans ma toile.'),
    bs: L('Tu frappes le vide. Moi, je ne te manquerai pas.'), bp: L('Tue-moi. J’adore renaître.'), bb: L('Un seul regard suffit.'), bc: L('J’ai gagné cent batailles. La tienne sera vite oubliée.'),
    bl: L('Dans les abysses, personne ne t’entendra fuir.'), bm: L('La mer monte, la mer descend. Toi, tu coules.'), bo: L('Je pousse lentement, mais je pousse partout.'), bj: L('Ne touche pas. Trop tard.'),
    bx: L('Ils m’ont chassé du panthéon. Je reviens prendre ma place.'), sa: L('Baisse les yeux devant la Lumière.'), sp: L('Mes frères me gardent. Qui te garde, toi, Ombre ?'),
    sl: L('Là où ma lumière tombe, l’ombre se fige.'), sg: L('Frappe-moi de loin, et ton coup se brisera sur moi.'),
  })[id];
  function showPre(daily) {
    let h = '';
    if (pre.mode === 'story') h += `<h2 class="title">📖 ${L('Chapitre {n}', { n: pre.story + 1 })} · ${storyTitle(pre.story)}</h2><img class="storyimg" src="img/story/${pre.story + 1}.jpg" alt="" onerror="this.remove()"><div class="evcard story">${storyText(pre.story)}</div><p class="center">${LEVELIC[pre.level]} ${levelName(pre.level)} · ${I18N.mapName(pre.map)}</p>`;
    if (pre.mode === 'season') h += `<h2 class="title">🗓️ ${L('Défi de la semaine')}</h2><div class="evcard"><b>${seasonName(pre.season.rule)}</b>${seasonDesc(pre.season.rule)}</div>`;
    if (daily) { const c = pre.daily; h += `<h2 class="title">📅 ${L('Défi du jour')}</h2><p class="center">${LEVELIC[c.level]} ${levelName(c.level)} · ${I18N.persoName(c.perso)} · ${I18N.mapName(pre.map)}</p>`; }
    if (pre.chal) {
      h += `<div class="evcard"><b>🏆 ${L('Record')} : ${dailyName(pre.chal)}</b>${dailyDesc(pre.chal)}</div>`;
      if (pre.fac) h += `<p class="center">${facTag(pre.fac)}</p>`;
      h += armyChips(pre);
      if (pre.chal === 'defi') {
        const d = pre.hard.reduce((x, k) => x + (HARD_W[k] || 1), 0);
        h += `<div class="opt"><h3>${L('Tes handicaps')} · ${L('difficulté {n}', { n: d })} · ${L('victoire = {p} pts', { p: 50 + 25 * d })}</h3><div class="hpick">${pickableHard(pre).map(k => `<button data-hp="${k}" class="${pre.hard.includes(k) ? 'sel' : ''}"><b>+${HARD_W[k] || 1}</b> ${hardName(k)}</button>`).join('')}</div></div>`;
      }
    }
    if (pre.mode === 'hard') h += `<h2 class="title">🔥 ${L('Affrontement difficile')}</h2><div class="evcard hardc">${pre.hard.map(x => '• ' + hardName(x)).join('<br>')}</div>`;
    if (pre.boss) { const b = E.TI[pre.boss]; h += `<h2 class="title">${L('Affrontement de boss !')}</h2><div class="evcard hardc bossc">${token(b, 1)}<div><b>${tn(b)}</b>${bossQuote(pre.boss) ? `<i class="quote">« ${bossQuote(pre.boss)} »</i>` : ''}${td(b)}<br><small>${L('Il a des sbires. Tue le boss (chaque coup lui retire un point de vie) pour gagner.')}</small></div></div>`; }
    if (pre.ev) {
      h += `<h2 class="title">${L('Événement !')}</h2><div class="evcard"><b>🎲 ${I18N.evName(pre.ev)}</b>${I18N.evDesc(pre.ev)}</div>`;
      if (pre.ev === 'objectif' && !pre.goal) pre.goal = pick(E.GOALS).id;
      if (pre.goal) h += `<div class="evcard"><b>🎯 ${I18N.goalName(pre.goal)}</b>${I18N.goalDesc(pre.goal)}</div>`;
    }
    if (pre.ev === 'pari') {
      if (pre.bet[1] === null) pre.bet[1] = pre.level === 'facile' ? rnd(2) : 0;
      const nm = curNames();
      h += `<p class="center">${L('{b} parie que <b>{x}</b> perdra en premier.', { b: esc(nm[1]), x: esc(nm[pre.bet[1]]) })}</p>
        <div class="opt"><h3>${L('{p} parie : qui perdra en premier un dieu ou 2 gardes ?', { p: esc(nm[0]) })}</h3>
        <div class="seg" data-bet="0">${[0, 1].map(v => `<button data-v="${v}" class="${pre.bet[0] === v ? 'sel' : ''}">${esc(nm[v])}</button>`).join('')}</div></div>`;
    }
    const ready = pre.ev !== 'pari' || pre.bet[0] !== null;
    h += `<div class="menu-actions"><button class="big" id="btnGo" ${ready ? '' : 'disabled'}>${L('Commencer l’affrontement')}</button><button class="ghost" id="btnPreBack">${L('Retour')}</button></div>`;
    $('preBox').innerHTML = h;
    $('preBox').querySelectorAll('[data-bet]').forEach(seg => seg.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; pre.bet[0] = +b.dataset.v; showPre(daily); });
    $('preBox').querySelectorAll('[data-hp]').forEach(b => b.onclick = () => { const k = b.dataset.hp; pre.hard = pre.hard.includes(k) ? pre.hard.filter(x => x !== k) : pre.hard.concat([k]); sfx('choix'); showPre(daily); });
    $('btnGo').onclick = () => { if (ready) beginMatch(); };
    $('btnPreBack').onclick = () => { if (pre.mode === 'daily') { renderMenu(); show('menu'); } else if (pre.mode === 'duel') { renderDuel(); show('duel'); } else if (pre.mode === 'story') { renderStory(); show('story'); } else if (pre.mode === 'season') { renderSeason(); show('season'); } else openRun(cur); };
    show('pre'); sfx('sort');
  }
  function curNames() {
    if (pre && pre.names) return pre.names.slice();
    if (pre && pre.ctl && pre.ctl[1] === 'me') return [pseudo(), L('Joueur 2')];
    const lv = pre ? pre.level : 'normal', ps = pre && pre.mode !== 'daily' ? pre.perso : null;
    return [pseudo(), levelName(lv) + (ps ? ' · ' + I18N.persoName(ps) : '')];
  }

  // ---------- bot (Web Worker créé depuis le texte du moteur) ----------
  let worker = null, wreq = 0;
  const wcb = {};
  try {
    const src = 'var E=(' + StratEngine.toString() + ')();onmessage=function(e){var d=e.data;postMessage({id:d.id,a:E.think(d.s,d.level,d.opt)});};';
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    worker.onmessage = e => { const cb = wcb[e.data.id]; delete wcb[e.data.id]; if (cb) cb(e.data.a); };
    worker.onerror = () => { worker = null; for (const k in wcb) { const cb = wcb[k]; delete wcb[k]; cb(null); } };
  } catch (e) { worker = null; }
  function askBot(s, level, opt, cb) {
    const sync = () => setTimeout(() => cb(E.think(s, level, opt)), 20);
    if (!worker) return sync();
    const id = ++wreq;
    wcb[id] = a => a ? cb(a) : sync();
    try { worker.postMessage({ id, s, level, opt }); } catch (e) { delete wcb[id]; sync(); }
  }

  // =====================================================================
  //  Affrontement
  // =====================================================================
  let G = null, gid = 0;
  function newG(s, extra) {
    gid++;
    const G0 = Object.assign({ id: gid, s, ctl: ['me', 'bot'], me: 0, flip: false, net: false, level: 'normal', mode: 'normal', perso: null, daily: null, hard: [],
      sel: null, legal: null, ver: 0, over: false, thinking: false, history: [], seed: 1 + rnd(1e6), lastA: null, committed: false, names: ['', ''], st: newBattleStats() }, extra || {});
    G0.humans = G0.ctl.map(c => c === 'me'); // camps joués sur cet écran
    return G0;
  }
  // ---------- suivi de l'affrontement (pour le bilan) ----------
  function newBattleStats() {
    return { act: [[0, 0, 0, 0], [0, 0, 0, 0]], kills: [[0, 0, 0], [0, 0, 0]], mana: [0, 0], gain: [0, 0], pts: {}, pieces: {}, moments: [], forces: [], missed: [], hits: 0, t0: Date.now() };
  }
  const catOf = i => ({ M: 0, G: 1 })[T[i].cat] ?? 2;
  // la meilleure prise possible (un dieu vaut plus qu'un garde) ; null s'il n'y en a pas
  function bestCapture(st0, acts) {
    const p = st0.turn, op = 1 - p; let best = null;
    if (acts.length > 400) return null;
    for (const a of acts) {
      if (a.k !== 'act') continue;
      const c = E.clone(st0); c._dead = []; E.apply(c, a);
      const gain = (c.lost[op][0] - st0.lost[op][0]) * 3 + (c.lost[op][1] - st0.lost[op][1]);
      if (gain > 0 && (!best || gain > best.gain)) {
        let vi = -1; for (let q = 0; q < st0.g.N; q++) { const v = st0.b[q]; if (v > 0 && E.own(v) === op && T[E.tix(v)].cat !== 'S' && (c.b[q] <= 0 || E.own(c.b[q]) !== op)) { vi = E.tix(v); if (T[vi].cat === 'M') break; } }
        best = { gain, ai: E.tix(st0.b[a.from]), vi };
      }
    }
    return best;
  }
  function forces(s) {
    const f = [0, 0];
    for (let q = 0; q < s.g.N; q++) { const c = s.b[q]; if (c > 0) f[E.own(c)] += T[E.tix(c)].val; }
    for (const p of [0, 1]) for (let i = 0; i < E.NT; i++) f[p] += s.res[p][i] * T[i].val;
    return [Math.round(f[0] * 10) / 10, Math.round(f[1] * 10) / 10];
  }
  const pieceLabel = (o, i) => `<b class="p${o}">${tn(i)}</b>`;
  function track(before, s, a, dead, p) {
    const st = G.st, k = { rec: 0, draft: 0, pioche: 0, pla: 1, act: 2, pass: 3 }[a.k];
    if (k !== undefined) st.act[p][k]++;
    const spent = before.mana[p] - s.mana[p]; if (spent > 0) st.mana[p] += spent;
    if (!st.gain) st.gain = [0, 0];
    for (const o of [0, 1]) { const dm = s.mana[o] - before.mana[o] + (o === p && spent > 0 ? spent : 0); if (dm > 0) st.gain[o] += dm; } // mana gagnée (sources, autels, vols…)
    const pc = (o, id) => st.pieces[o + ':' + id] || (st.pieces[o + ':' + id] = { act: 0, kills: 0, died: 0 });
    // points : +1 au perso recruté, placé ou activé par un joueur de cet écran
    const ti = a.k === 'act' ? E.tix(before.b[a.from]) : (a.k === 'rec' || a.k === 'pla' || (a.k === 'draft' && before.ev !== 'inverse')) ? a.t : -1;
    if (ti >= 0 && G.ctl[p] === 'me') st.pts[T[ti].id] = (st.pts[T[ti].id] || 0) + 1;
    if (a.k === 'act') pc(p, T[ti].id).act++;
    const actor = a.k === 'act' ? ti : -1, bossDead = s._bossDead || [];
    const turnN = Math.floor(before.ply / 2) + 1;
    st.forces.push(forces(s));
    for (const q of dead) {
      const c = before.b[q]; if (c <= 0) continue;
      const vo = E.own(c), vi = E.tix(c), byBoss = bossDead.includes(q) && before.boss;
      const ko = byBoss ? before.boss.owner : p, ki = byBoss ? E.TI[before.boss.kind] : actor;
      pc(vo, T[vi].id).died++;
      if (vo !== ko) { st.kills[ko][catOf(vi)]++; if (ki >= 0) pc(ko, T[ki].id).kills++; }
      st.moments.push({ i: st.forces.length - 1, o: vo, vi, ki: vo !== ko ? ki : -1, turn: turnN, h: G.history.length, txt: L('Tour {n}', { n: turnN }) + ' · ' + (ki >= 0 && vo !== ko ? L('{a} tue {v}', { a: pieceLabel(ko, ki), v: pieceLabel(vo, vi) }) : L('{v} meurt', { v: pieceLabel(vo, vi) })) });
    }
    if (before.boss && s.boss && s.boss.hp < before.boss.hp) {
      st.hits += before.boss.hp - s.boss.hp;
      st.moments.push({ i: st.forces.length - 1, o: before.boss.owner, txt: L('Tour {n}', { n: turnN }) + ' · ' + L('{a} frappe le boss ({h} PV restants)', { a: actor >= 0 ? pieceLabel(p, actor) : esc(PN[p]), h: Math.max(0, s.boss.hp) }) });
    }
  }
  function beginMatch() {
    const hs = pre.hard || [];
    const of1 = pre.fac ? pre.fac[1] : 0, oGods = of1 === 1 ? pre.shM : of1 === 2 ? (pre.gods || []).concat(pre.shM || []) : pre.gods, oGards = of1 === 1 ? pre.shG : of1 === 2 ? (pre.gards || []).concat(pre.shG || []) : pre.gards; // persos de l'adversaire
    const botSide = (pre.ctl || ['me', 'bot']).indexOf('bot');
    const s = E.newGame({ event: pre.event || pre.ev, first: pre.first, map: pre.map, gods: pre.gods, gards: pre.gards, goal: pre.goal, boss: pre.boss, fac: pre.fac, shM: pre.shM, shG: pre.shG, tieTo: botSide });
    if (pre.ev === 'pari') s.bet = pre.bet.slice();
    if (hs.includes('mana')) s.mana[0] -= 40;
    if (hs.includes('riche')) s.mana[1] += 100;
    if (hs.includes('avance')) { const z = shuffle(s.g.zl[1].filter(q => s.b[q] === 0)); if (z.length) s.b[z[0]] = E.enc(E.TI[pick(oGards)], 1); }
    if (hs.includes('dieupris')) { const av = oGods.filter(id => s.pool[E.TI[id]] > 0); if (av.length) { const i = E.TI[pick(av)]; s.pool[i]--; s.res[1][i]++; } }
    if (hs.includes('soldats')) for (const q of shuffle(s.g.zl[1].filter(q => s.b[q] === 0)).slice(0, 2)) s.b[q] = E.enc(E.TI[of1 === 1 ? 'os' : 's'], 1);
    if (hs.includes('pauvre')) for (const id of oGards) { const i = E.TI[id]; if (s.pool[i] > 1) s.pool[i] = 1; }
    if (hs.includes('silence')) s.noAct[0] = 3;
    if (hs.includes('geole')) s.noPlace[0] = 3;
    if (hs.includes('ronces')) { const g = s.g, half = q => ((q / g.W) | 0) >= g.H / 2; for (const q of shuffle([...Array(g.N).keys()].filter(q => g.ex[q] && s.b[q] === 0 && half(q) && !g.zone[0][q] && !g.zone[1][q])).slice(0, 3)) s.b[q] = -1; }
    if (hs.includes('gardespris')) for (let k = 0; k < 2; k++) { const av = oGards.filter(id => s.pool[E.TI[id]] > 0); if (av.length) { const i = E.TI[pick(av)]; s.pool[i]--; s.res[1][i]++; } }
    if (hs.includes('blesse')) s.lost[0][1] = 1;
    if (hs.includes('aube')) s.dawn = 80; // 60 tours : 34 % de victoires seulement (mesuré), 80 : 41 %
    if (hs.includes('paladins')) for (const q of shuffle(s.g.zl[1].filter(q => s.b[q] === 0)).slice(0, 2)) s.b[q] = E.enc(E.TI[pick(oGards)], 1);
    if (hs.includes('invasion4')) s.invN = 4;
    if (hs.includes('sansombre')) s.pool[E.TI.os] = 0;
    if (hs.includes('veilleurs')) {
      const g = s.g, half = q => ((q / g.W) | 0) >= g.H / 2, have = [...Array(g.N).keys()].filter(q => g.spec[q] === 5 && half(q)).length;
      for (const q of shuffle([...Array(g.N).keys()].filter(q => g.ex[q] && !g.spec[q] && s.b[q] === 0 && half(q) && !g.zone[0][q] && !g.zone[1][q])).slice(0, Math.max(0, 2 - have))) g.spec[q] = 5;
    }
    // fardeaux du Cercle
    if (pre.cercle >= 3) {
      const fs = fardeaux(pre.cercle);
      if (fs.includes('mana')) s.mana[0] -= 20;
      if (fs.includes('soldat')) { const z = shuffle(s.g.zl[1].filter(q => s.b[q] === 0)); if (z.length) s.b[z[0]] = E.enc(E.TI.s, 1); }
      if (s.boss) { const x = bossHpBonus(pre.cercle); s.boss.hp += x; s.boss.max += x; }
    }
    if (pre.mode === 'normal' || pre.mode === 'hard' || pre.mode === 'boss') { s.mana[0] = Math.max(60, s.mana[0]); if (pre.edge) applyEdge(s, pre.edge, 1); } // jamais moins de 60 mana au départ
    // talents du défi du jour (pas pendant le défi lui-même, ni en duel)
    if (pre.myMana) s.mana[0] = pre.myMana;
    if (pre.mode !== 'daily' && pre.mode !== 'duel' && pre.mode !== 'story' && pre.mode !== 'season') {
      if (hasTalent('mana1')) s.mana[0] += 10;
      if (hasTalent('mana2')) s.mana[0] += 10;
      if (hasTalent('recrue')) s.res[0][E.TI[pre.fac && pre.fac[0] === 1 ? 'os' : 's']]++;
    }
    if (pre.mana) s.mana = [pre.mana, pre.mana];
    markSeenState(s);
    G = newG(s, { level: pre.level, mode: pre.mode, perso: pre.perso, daily: pre.daily || null, chal: pre.chal || null, edge: ['normal', 'hard', 'boss'].includes(pre.mode) ? pre.edge || 0 : 0, hard: hs, names: curNames(), ctl: pre.ctl || ['me', 'bot'], net: !!(pre.ctl && pre.ctl.includes('net')) });
    $('log').innerHTML = '';
    if (pre.theme && themeList().includes(pre.theme)) { setTheme(pre.theme, true); scheduleTheme(); }
    else if (SET.decor === 'auto') { setTheme(otherTheme(), true); scheduleTheme(); }
    sys(L('Carte : {m}.', { m: I18N.mapName(s.g) }));
    if (s.ev) sys(L('Événement : {e}.', { e: I18N.evName(s.ev) }));
    if (s.goal) sys(L('Objectif : {g}.', { g: I18N.goalName(s.goal) }));
    if (s.boss) sys(L('Boss : {b} ({h} points de vie).', { b: tn(E.TI[s.boss.kind]), h: s.boss.hp }));
    sys(L('Tirage au sort : {p} commence.', { p: G.names[pre.first] }));
    if (s.phase === 'draft') sys(L('Draft : on se partage toute la réserve, chacun son tour.'));
    enterGame();
    saveMatch();
  }
  function resumeMatch() {
    const r = run();
    let d;
    try { d = deser(r.match); } catch (e) { r.match = null; saveRuns(); renderRun(); return toast(L('Affrontement illisible : il a été effacé.')); }
    pre = { level: r.level, perso: d.perso || null, mode: d.mode || 'normal' };
    G = newG(d.s, { level: r.level, mode: d.mode || 'normal', perso: d.perso || null, hard: d.hard || [], edge: d.edge || 0, seed: d.seed || 1, lastA: d.lastA || null, history: [], st: d.st || newBattleStats(), rec: d.rec || null });
    G.names = curNames();
    $('log').innerHTML = d.log || '';
    sys(L('Affrontement repris.'));
    enterGame();
    if (G.s.winner !== null) endGame();
  }
  function saveMatch() {
    if (!G || G.replay || G.mode === 'daily' || G.mode === 'tuto' || cur < 0 || G.committed) return;
    run().match = ser({ s: G.s, log: $('log').innerHTML, seed: G.seed, lastA: G.lastA, mode: G.mode, perso: G.perso, hard: G.hard, edge: G.edge, st: G.st, rec: G.rec });
    saveRuns();
  }
  // les règles spéciales de l'affrontement, toujours visibles (pour ne pas les oublier)
  function rulesHtml() {
    if (!G || G.replay) return '';
    const s = G.s, out = [];
    if (s.ev) out.push(`🎲 <b>${I18N.evName(s.ev)}</b> : ${I18N.evDesc(s.ev)}`);
    if (s.goal) out.push(`🎯 <b>${I18N.goalName(s.goal)}</b> : ${I18N.goalDesc(s.goal)}`);
    if (G.chal) out.push(`🏆 <b>${L('Record')} : ${dailyName(G.chal)}</b> : ${dailyDesc(G.chal)} <span class="gold">(${recInfo(G, G.chal).txt})</span>`);
    if (G.mode === 'season' && pre && pre.season) out.push(`🗓️ <b>${seasonName(pre.season.rule)}</b> : ${seasonDesc(pre.season.rule)}`);
    if (s.boss) out.push(`👹 <b>${tn(E.TI[s.boss.kind])}</b> : ${td(E.TI[s.boss.kind])}`);
    for (const h of G.hard || []) out.push(`🔥 ${hardName(h)}`);
    if (G.edge) for (const x of edgeRules(G.edge)) out.push(`🎚️ ${x}`);
    const cer = cur >= 0 && run() && ['normal', 'hard', 'boss'].includes(G.mode) ? run().cercle : 0;
    if (cer >= 3) for (const f of fardeaux(cer)) out.push(`⚖️ ${fardeauText(f, cer)}`);
    if (s.fac && (s.fac[0] === 1 || s.fac[1] === 1)) out.push(`🌑 ${L('Ombres : 3 persos dans la zone de placement adverse = victoire. Un garde ou un soldat ennemi ne peut pas les prendre à plus de 4 cases.')}`);
    if (s.fac && [0, 1].some(p => E.gNeed(s, p) === 5)) out.push(`🌑 ${L('Face à la Lumière, l’armée des Ombres ne perd qu’après 5 gardes tués (au lieu de 4), mais son invasion demande 4 persos (au lieu de 3).')}`);
    else if (s.fac) out.push(`🌑 ${L('Persos des Ombres : un garde ou un soldat ennemi ne peut pas les prendre à plus de 4 cases.')}`);
    return out.length ? `<h3>📜 ${L('Règles de cet affrontement')}</h3><ul class="rules">${out.map(x => `<li>${x}</li>`).join('')}</ul>` : '';
  }
  function enterGame() {
    PN[0] = G.names[0]; PN[1] = G.names[1];
    $('endModal').hidden = true;
    $('evBadge').hidden = !G.s.ev;
    if (G.s.ev) { $('evBadge').textContent = '🎲 ' + I18N.evName(G.s.ev); $('evBadge').title = I18N.evDesc(G.s.ev); $('evBadge').onclick = () => toast(`🎲 <b>${I18N.evName(G.s.ev)}</b> : ${I18N.evDesc(G.s.ev)}`, 6000); }
    const gl = G.s.goal ? ['🎯 ' + I18N.goalName(G.s.goal), I18N.goalDesc(G.s.goal)] : G.chal ? ['🏆 ' + dailyName(G.chal), dailyDesc(G.chal)] : G.s.boss ? ['👹 ' + tn(E.TI[G.s.boss.kind]), td(E.TI[G.s.boss.kind])] : null;
    $('goalBadge').hidden = !gl;
    if (gl) { $('goalBadge').textContent = gl[0]; $('goalBadge').title = gl[1]; $('goalBadge').onclick = () => toast(`<b>${gl[0]}</b> : ${gl[1]}`, 6000); }
    $('mapBadge').textContent = '🗺️ ' + I18N.mapName(G.s.g);
    $('btnUndo').hidden = G.net || !!G.replay;
    $('btnGiveUp').hidden = !!G.replay;
    $('btnTestWin').hidden = !SET.test || !!G.replay || !!G.net || ['daily', 'season', 'duel'].includes(G.mode); // mode test : gagner tout de suite pour avancer plus vite
    $('runBadge').textContent = G.replay ? '🎬 ' + L('Revoir la partie') : G.mode === 'tuto' ? '🎓 ' + L('Tutoriel') : G.mode === 'story' ? '📖 ' + storyTitle(pre.story) : G.mode === 'season' ? '🗓️ ' + seasonName(pre.season.rule) : G.mode === 'duel' ? '⚔️ ' + L('Duel') + (G.net ? ' · 🌐' : G.ctl[1] === 'me' ? ' · 👥' : '') : G.mode === 'daily' ? L('Défi du jour') : cercleLabel(run().cercle) + ' · ' + L('Partie {n}', { n: cur + 1 }) + (G.mode === 'hard' ? ' · 🔥' : G.mode === 'boss' ? ' · 👹' : '');
    setTok(cur >= 0 && run() && ['normal', 'hard', 'boss'].includes(G.mode) ? run() : null);
    $('rulesCard').innerHTML = rulesHtml();
    show('game');
    $('terrain').dataset.theme = theme;
    buildBoard(G.s.g);
    layoutBoard(); render(); maybeBot();
    const g0 = G; requestAnimationFrame(() => { if (G && G === g0 && $('game').classList.contains('on')) { layoutBoard(); render(); } });
  }
  function legal() {
    if (!G.legal || G.legalVer !== G.ver) { G.legal = E.gen(G.s, true); G.legalVer = G.ver; }
    return G.legal;
  }
  const humanTurn = () => G && !G.over && G.humans[G.s.turn];

  // ---------- bot : rapide (le stratège réfléchit environ 1,5 s) ----------
  function maybeBot() {
    if (G && !G.over && G.ctl[G.s.turn] === 'tuto') return guideOpp();
    if (!G || G.over || G.ctl[G.s.turn] !== 'bot' || G.thinking) return;
    G.thinking = true;
    const id = G.id, ver = G.ver, t0 = performance.now();
    const opt = { perso: G.perso, canExtend: false };
    if (G.level === 'normal') opt.budget = 350;
    if (G.level === 'impossible') {
      // dans une partie, le stratège monte en puissance avec les Cercles : au Cercle 2 il réfléchit moins longtemps
      const c = cur >= 0 && run() && ['normal', 'hard', 'boss'].includes(G.mode) ? run().cercle : 99;
      opt.budget = c <= 2 ? 450 : c === 3 ? 900 : 1500; opt.maxMs = c <= 2 ? 650 : c === 3 ? 1200 : 2000;
    }
    renderPlayers();
    askBot(G.s, G.level, opt, a => {
      const wait = Math.max(0, (SET.anim === 'normal' ? 900 : SET.anim === 'rapide' ? 450 : 250) - (performance.now() - t0));
      setTimeout(() => {
        if (!G || G.id !== id || G.ver !== ver || G.over) return;
        G.thinking = false;
        doAction(a);
      }, wait);
    });
  }

  $('btnTestWin').onclick = () => { if (!G || G.over || !SET.test) return; G.s.winner = G.me; G.s.why = 'Victoire de test.'; sfx('choix'); endGame(); };
  // revoir le coup de l'adversaire : la carte d'avant pendant un instant, puis celle d'après
  function peekBot() {
    if (!G || !G.botTurn || G.peek) return;
    const now = G.s, la = G.lastA;
    G.peek = true; G.s = G.botTurn.before; G.lastA = null; render();
    sfx('page');
    setTimeout(() => { if (!G || !G.peek) return; G.s = now; G.lastA = la; G.peek = false; render(); }, 1300);
  }
  // ---------- exécution d'une action ----------
  function doAction(a) {
    if (G.tuto && G.humans[G.s.turn]) { const st = guideStep(); if (st && !st.free && !st.ok(a, G.s)) { G.sel = null; render(); toast('🎓 ' + st.t, 4500); sfx('annule'); return; } }
    const s = G.s, p = s.turn, before = E.clone(s);
    if (!G.rec && !G.replay) G.rec = [frameOf(before, null)];
    const could = G.humans[p] && !G.replay && !G.tuto && s.phase === 'play' ? bestCapture(before, legal()) : null;
    const an = !G.replay && !G.tuto && !G.net ? E.analyse(before, a) : null; // pour le bilan : la valeur du coup joué et du meilleur
    if (G.humans[p] && !G.net) { G.history.push({ s: before, log: $('log').innerHTML, lastA: G.lastA, st: JSON.stringify(G.st), rf: G.rec ? G.rec.length : 0 }); if (G.history.length > 300) G.history.shift(); }
    if (G.net && G.ctl[p] === 'me') netSend({ t: 'act', a, ply: before.ply });
    const iceBefore = s.boss && s.boss.ice ? s.boss.ice.join() : '', warnBefore = s.boss && s.boss.warn ? s.boss.warn.join() : '';
    const minions = st => { let n = 0; for (let q = 0; q < st.g.N; q++) { const c = st.b[q]; if (c > 0) { const id = T[E.tix(c)].id; if (id === 'mi' || id === 'ab') n++; } } return n; };
    const minBefore = s.boss ? minions(s) : 0;
    const betBefore = s.betDone, holdBefore = s.hold ? s.hold.slice() : null, hpBefore = s.boss ? s.boss.hp : 0;
    s._dead = []; s._hits = []; s._martyr = 0; s._fire = null; s._smash = -1; s._bossDead = null;
    E.apply(s, a);
    const dead = s._dead, hits = s._hits, fire = s._fire, smash = s._smash; s._dead = null; s._hits = null; s._fire = null;
    track(before, s, a, dead, p); s._bossDead = null;
    let missedNow = null;
    if (could) { // il pouvait prendre un garde ou un dieu, et ne l'a pas fait (ou a pris moins bien)
      const got = (s.lost[1 - p][0] - before.lost[1 - p][0]) * 3 + (s.lost[1 - p][1] - before.lost[1 - p][1]);
      if (got < could.gain && could.vi >= 0) { if (!G.st.missed) G.st.missed = []; missedNow = { p, turn: Math.floor(before.ply / 2) + 1, h: G.history.length, ai: could.ai, vi: could.vi }; G.st.missed.push(missedNow); }
    }
    if (an) reviewMove(an, before, a, dead, p, missedNow);
    if (G.rec) { G.rec.push(frameOf(s, a)); if (G.rec.length > 400) G.rec.splice(1, 1); }
    const tide = s._tide; s._tide = 0;
    if (s.boss) {
      if (fire || smash >= 0) sfx('rugir', .55, 120);
      if (tide) { sfx('eau', .8); $('terrain').classList.remove('shake'); void $('terrain').offsetWidth; $('terrain').classList.add('shake'); }
      if (s.boss.ice && s.boss.ice.join() !== iceBefore) sfx('gel', 1, 200);
      if (minions(s) > minBefore) sfx('sbire', .7, 250);
      if (s.boss.hp <= 0 && hpBefore > 0) { sfx('rugir', .9); sfx('chute', 1, 300); }
    }
    if (a.k === 'act' && dead.length && T[E.tix(before.b[a.from])] && T[E.tix(before.b[a.from])].fac) sfx('lame', .8, 60);
    G.lastP = p;
    G.ver++; G.sel = null;
    logLine(describe(before, a, dead), p);
    if (!G.humans[p]) {
      if (!G.botTurn || G.botTurn.done) G.botTurn = { p, before, lines: [], done: false }; // un nouveau tour adverse commence
      G.botTurn.lines.push(describe(before, a, dead)); if (s.turn !== p || s.winner !== null) G.botTurn.done = true; }
    else if (G.botTurn && G.botTurn.done) G.botTurn = null;
    if (a.k === 'pioche') toast(L('Tu as pioché : {x}', { x: tn(a.t) }));
    if (s._martyr) { sys(L('{p} gagne {m} mana (Martyr).', { p: PN[s.turn], m: s._martyr })); sfx('mana', 1, 400); }
    if (!betBefore && s.betDone) sys(L('Pari : {p} perd en premier !', { p: PN[s.betLoser] }));
    if (s.phase === 'play' && before.phase === 'draft') sys(L('Draft terminé, l’affrontement commence.'));
    if (holdBefore) for (const q of [0, 1]) if (s.hold[q] > holdBefore[q]) sys(L('{p} tient le centre : {n}/3.', { p: PN[q], n: s.hold[q] }));
    if (s.boss && s.boss.hp < hpBefore) sys(L('Le boss perd {n} point(s) de vie ({h} restant(s)).', { n: hpBefore - s.boss.hp, h: Math.max(0, s.boss.hp) }));
    if (s.boss && s.boss.hp > hpBefore) sys(L('Le phénix renaît de ses cendres !'));
    if (s.boss && s.boss.ice && s.boss.ice.join() !== iceBefore) sys(L('Gel : {n} de tes persos ne pourront pas agir à ton prochain tour.', { n: s.boss.ice.length }));
    if (s.boss && s.boss.warn && s.boss.warn.join() !== warnBefore) sys(L('Attention : le boss menace les cases marquées en rouge !'));
    G.lastA = a;
    if (G.tuto) guideAfter(before, s, a, p);
    render();
    animate(before, s, a, dead, hits, fire, smash);
    if (G.chal === 'carnage' && s.winner === null && Math.ceil((s.ply + (s.first0 === 0 ? 1 : 0)) / 2) > 25) { s.winner = 2; s.why = L('25 tours joués.'); }
    saveMatch();
    if (s.winner !== null) endGame();
    else if (G.ctl[s.turn] === 'me' && G.ctl[p] !== 'me') { // c'est à toi : petit signal
      sfx('tour', .7, 350); rumble(90, .25);
      const tl = $('turnline'); tl.classList.remove('yourturn'); void tl.offsetWidth; tl.classList.add('yourturn');
    }
    maybeBot();
  }

  // ---------- animations et sons ----------
  const fxEl = $('fx');
  function sqXY(q) { const g = G.s.g, v = G.flip ? g.N - 1 - q : q; return { x: (v % g.W) * G.sq, y: ((v / g.W) | 0) * G.sq }; }
  function addFx(cls, q, html, opts) {
    const d = document.createElement('div');
    d.className = 'fxe ' + cls;
    const { x, y } = sqXY(q), S = G.sq, k = (opts && opts.size) || 1;
    d.style.left = (x + S * (1 - k) / 2) + 'px'; d.style.top = (y + S * (1 - k) / 2) + 'px';
    d.style.width = d.style.height = (S * k) + 'px';
    if (opts && opts.color) d.style.setProperty('--rc', opts.color);
    if (html) d.innerHTML = html;
    fxEl.appendChild(d);
    setTimeout(() => d.remove(), (opts && opts.life) || 1100);
    return d;
  }
  function floatText(q, txt, color) {
    const d = document.createElement('div'), { x, y } = sqXY(q);
    d.className = 'fxe floattxt'; d.textContent = txt; d.style.color = color || '#fff';
    d.style.left = (x + G.sq / 2) + 'px'; d.style.top = (y + G.sq * .1) + 'px';
    fxEl.appendChild(d); setTimeout(() => d.remove(), 1200);
  }
  function sparks(q, n, color) {
    const { x, y } = sqXY(q);
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div'), a = Math.random() * Math.PI * 2, r = G.sq * (.4 + Math.random() * .6);
      d.className = 'fxe spark';
      d.style.left = (x + G.sq / 2 - 3) + 'px'; d.style.top = (y + G.sq / 2 - 3) + 'px';
      d.style.setProperty('--dx', Math.cos(a) * r + 'px'); d.style.setProperty('--dy', Math.sin(a) * r + 'px');
      if (color) d.style.background = `radial-gradient(circle, #fff, ${color} 60%, transparent 70%)`;
      fxEl.appendChild(d); setTimeout(() => d.remove(), 800);
    }
  }
  function bolt(q) {
    const { y } = sqXY(q), S = G.sq, top = -y - S * .5;
    const pts = []; let px = S / 2, py = top;
    while (py < S / 2) { pts.push(`${px},${py}`); py += S * .35; px = S / 2 + (Math.random() - .5) * S * .5; }
    pts.push(`${S / 2},${S / 2}`);
    addFx('bolt', q, `<svg width="${S}" height="${S - top}" viewBox="0 ${top} ${S} ${S - top}" style="position:absolute;left:0;top:${top}px;overflow:visible"><polyline points="${pts.join(' ')}" fill="none" stroke="#eaf6ff" stroke-width="4" stroke-linejoin="round"/></svg>`, { life: 700 });
  }
  function arrowFx(from, to, cls) {
    const a = sqXY(from), b = sqXY(to), S = G.sq;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const d = document.createElement('div');
    d.className = 'fxe ' + (cls || 'arrow');
    d.style.left = (a.x + S / 2) + 'px'; d.style.top = (a.y + S / 2 - (cls ? S * .18 : 2)) + 'px'; d.style.width = len + 'px';
    if (cls) d.style.height = (S * .36) + 'px';
    d.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    fxEl.appendChild(d); setTimeout(() => d.remove(), cls ? 800 : 500);
  }
  function pcEl(q) { return sqEls[q] && sqEls[q].querySelector('.pc'); }
  const IS_MAGE = c => c > 0 && T[E.tix(c)].cat === 'M';
  function slide(el, pts, dur) {
    if (!el || !el.animate || SET.anim === 'aucune') return;
    if (SET.anim === 'rapide') dur *= .5;
    el.animate(pts.map(([x, y]) => ({ transform: `translate(${x}px, ${y}px)` })), { duration: dur, easing: 'cubic-bezier(.3,.7,.3,1)' });
  }
  // un coup : deux traits qui se croisent sur la victime
  function slashFx(q, color) {
    const c = color || '#fff6e0';
    addFx('slash', q, `<svg viewBox="0 0 100 100"><path d="M14 22 Q50 46 86 80" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M84 18 Q52 50 18 84" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round" style="animation-delay:.07s"/></svg>`, { size: 1.15, life: 520 });
  }
  // l'âme du perso tué s'envole
  const SOUL = o => `<svg viewBox="0 0 100 100"><path d="M50 14 C30 14 24 32 26 50 C28 66 22 78 30 88 C36 80 40 90 46 84 C50 92 56 84 60 90 C66 80 74 84 72 70 C78 54 74 14 50 14 Z" fill="${o === 0 ? '#fff3c8' : '#e2d4ff'}" opacity=".85"/><circle cx="41" cy="42" r="4.5" fill="#2a2030"/><circle cx="59" cy="42" r="4.5" fill="#2a2030"/><ellipse cx="50" cy="56" rx="5" ry="3.5" fill="#2a2030" opacity=".7"/></svg>`;
  // le perso qui frappe à distance prend son élan vers sa cible
  function lunge(from, to) {
    const el = pcEl(from); if (!el || !el.animate || SET.anim === 'aucune') return;
    const A = sqXY(from), B = sqXY(to), dx = B.x - A.x, dy = B.y - A.y, n = Math.hypot(dx, dy) || 1, k = Math.min(G.sq * .28, n * .4);
    el.animate([{ transform: 'none' }, { transform: `translate(${-dx / n * k * .35}px, ${-dy / n * k * .35}px) scale(.96)`, offset: .35 }, { transform: `translate(${dx / n * k}px, ${dy / n * k}px) scale(1.08)`, offset: .6 }, { transform: 'none' }],
      { duration: SET.anim === 'rapide' ? 220 : 380, easing: 'ease-out' });
  }
  function animate(before, after, a, dead, hits, fire, smash) {
    if (!G.sq) return;
    const g = after.g;
    const id = a.k === 'act' && before.b[a.from] > 0 ? mid(T[E.tix(before.b[a.from])].id) : null;
    const used = new Set();
    let moved = 0;
    for (let q = 0; q < g.N; q++) {
      const c = after.b[q];
      if (c <= 0 || c === before.b[q]) continue;
      let best = -1, bd = 1e9;
      for (let x = 0; x < g.N; x++) {
        if (x === q || used.has(x) || before.b[x] !== c || after.b[x] === before.b[x]) continue;
        const d = Math.abs((x % g.W) - (q % g.W)) + Math.abs(((x / g.W) | 0) - ((q / g.W) | 0));
        if (d < bd) { bd = d; best = x; }
      }
      const el = pcEl(q), Q = sqXY(q);
      if (best >= 0) {
        used.add(best); moved++;
        let way = [best];
        if (id && best === a.from && ['g5', 'g7', 's', 'c8'].includes(id)) way = [best].concat(a.cl.filter(v => typeof v === 'number' && v !== q));
        if (id === 'pc' && best === a.cl[0]) way = a.cl.filter(v => typeof v === 'number' && v !== q);
        const pts = way.map(w => { const P = sqXY(w); return [P.x - Q.x, P.y - Q.y]; }).concat([[0, 0]]);
        slide(el, pts, 220 + 160 * (pts.length - 1) + bd * 25);
      } else if (el && el.animate && SET.anim !== 'aucune') {
        el.animate([{ transform: 'translateY(-36px) scale(1.35)', opacity: 0 }, { transform: 'translateY(4px) scale(.95)', opacity: 1, offset: .75 }, { transform: 'none' }], { duration: SET.anim === 'rapide' ? 200 : 380, easing: 'ease-out' });
        setTimeout(() => addFx('dust', q, '', { size: 1.4, life: 600 }), 260);
      }
    }
    // qui frappe ? (le perso activé, s'il n'a pas pris la place de sa victime, prend son élan)
    const atk = a.k === 'act' && before.b[a.from] > 0 ? a.from : -1, atkAt = atk >= 0 && after.b[atk] === before.b[atk] ? atk : -1;
    if (atkAt >= 0 && dead.length && !dead.includes(atkAt) && !IS_MAGE(before.b[atk])) lunge(atkAt, dead[0]);
    const quick = SET.anim === 'aucune';
    dead.forEach((q, i) => {
      const c = before.b[q], delay = (moved ? 130 : 60) + i * 70;
      if (!quick) setTimeout(() => slashFx(q, c > 0 && E.own(c) === 0 ? '#ffd0d0' : '#fff6e0'), delay);
      if (c > 0) {
        const d = addFx('ghost-pc', q, token(E.tix(c), E.own(c)), { size: .86, life: 900 }); d.style.animationDelay = delay + 'ms';
        if (!quick) {
          const s = addFx('soul', q, SOUL(E.own(c)), { size: .55, life: 1500 }); s.style.animationDelay = (delay + 220) + 'ms';
          if (T[E.tix(c)].cat === 'M') setTimeout(() => { addFx('ring', q, '', { color: '#ffd86a', size: 2.2 }); sparks(q, 16, '#ffd86a'); }, delay + 120);
        }
      }
      setTimeout(() => sparks(q, 12), delay + 20);
    });
    for (const q of hits) if (!dead.includes(q)) { floatText(q, '−1 ❤', '#ff8a8a'); sparks(q, 10, '#ff4a4a'); const el = pcEl(q); if (el && el.animate) el.animate([{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], { duration: 260 }); sfx('coup'); }
    if (fire) { const B = after.boss; for (const q of fire) { if (B) arrowFx(B.q, q, 'flame'); addFx('flash', q, '', { life: 700 }); } sfx('foudre'); }
    if (smash >= 0) { addFx('ring', smash, '', { color: '#c8a070', size: 1.8 }); $('terrain').classList.remove('shake'); void $('terrain').offsetWidth; $('terrain').classList.add('shake'); sfx('mur'); }
    if (a.k === 'rec' || a.k === 'draft' || a.k === 'pioche') sfx('recrute');
    else if (a.k === 'pla') sfx('poser');
    else if (a.k === 'decl') sfx('choix');
    else if (a.k === 'act') {
      const from = a.from, nums = a.cl.filter(v => typeof v === 'number');
      switch (id) {
        case 'ma': { E.areaOf(g, 'ma', a.cl[0]).forEach((q, i) => setTimeout(() => addFx('flash', q, '', { life: 600 }), i * 25)); for (const q of dead.concat(hits)) bolt(q); addFx('ring', from, '', { color: '#bfe6ff', size: 1.4 }); sfx('foudre'); break; }
        case 'pb': { E.areaOf(g, 'pb', a.cl[0]).forEach((q, i) => setTimeout(() => addFx('crack', q, '', { life: 900 }), i * 30)); $('terrain').classList.remove('shake'); void $('terrain').offsetWidth; $('terrain').classList.add('shake'); sfx('mur'); sfx('coup', .8, 150); break; }
        case 'mb': case 'g1': case 'mc': addFx('swirl', nums[0], '', { size: 1.3 }); addFx('swirl', id === 'g1' ? from : nums[1], '', { size: 1.3 }); sfx('echange'); break;
        case 'pr': addFx('ring', nums[0], '', { color: '#ffe9a0', size: 1.5 }); sparks(nums[0], 10, '#ffe9a0'); sfx('sort'); break;
        case 'dr': nums.forEach(q => { addFx('ring', q, '', { color: '#7ec850', size: 1.3 }); const el = sqEls[q].querySelector('.bramble'); if (el && el.animate) el.animate([{ transform: 'scale(.2) rotate(-40deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: 'ease-out' }); }); sfx('mur'); break;
        case 'c6': floatText(from, '+40 mana', '#7fd3ff'); sparks(from, 8, '#7fd3ff'); sfx('mana'); break;
        case 'pa': floatText(from, L('+2 actions'), '#ffe08a'); addFx('ring', from, '', { color: '#ffe08a', size: 1.5 }); sfx('sort'); break;
        case 'pe': case 'pf': case 'pg': floatText(from, (id === 'pe' ? '🔒 ' : id === 'pf' ? '🤫 ' : '🩸 ') + tn(E.TI[id]), '#ffb3b3'); addFx('ring', from, '', { color: '#ff8a8a', size: 1.5 }); sfx('sort'); break;
        case 'me': addFx('ring', from, '', { color: '#ffe08a', size: 1.4 }); sfx('recrute'); break;
        case 'pd': case 'gu': addFx('ring', nums[0], '', { color: id === 'gu' ? '#ff9ac0' : '#ffe08a', size: 1.4 }); sparks(nums[0], 10, id === 'gu' ? '#ff9ac0' : '#ffe08a'); sfx('sort'); break;
        case 'md': addFx('ring', from, '', { color: '#ffe08a', size: 1.3 }); sfx('sort'); sfx('pas', 1, 200); break;
        case 'g6': addFx('ring', from, '', { color: '#ff6a6a', size: 2.6 }); sfx('coup'); break;
        case 'lc': { const d = [1, 3, 4, 6].find(dd => g.mv[dd * g.N + from] === nums[0]); let q = from, last = from; for (let k = 0; k < 3; k++) { q = g.mv[d * g.N + q]; if (q < 0) break; last = q; } arrowFx(from, last); sfx('prise'); break; }
        case 'c4': case 'c7': arrowFx(from, nums[0]); sfx('prise'); break;
        case 'g3': { const adj = [0, 2, 5, 7].some(d => g.mv[d * g.N + from] === nums[0]); if (adj) sfx('pas'); else { arrowFx(from, nums[0]); sfx('prise'); } break; }
        case 'g4': sfx('pas'); if (dead.length) sfx('chute', 1, 150); nums.forEach(q => addFx('dust', q, '', { size: 1.2, life: 600 })); break;
        default: nums.forEach((q, i) => sfx('pas', 1, i * 160)); if (!nums.length) sfx('sort');
      }
    }
    if (dead.length) { sfx('coup', 1, 80); sfx('prise', .8, 120); rumble(dead.some(q => IS_MAGE(before.b[q])) ? 260 : 140, dead.some(q => before.b[q] > 0 && E.own(before.b[q]) === G.me) ? .9 : .5); }
  }

  // ---------- fin d'un affrontement (le résultat n'est compté qu'en continuant : on peut encore annuler son coup) ----------
  function endTitle() {
    const w = G.s.winner;
    if (G.mode === 'daily') return L('Défi terminé');
    if (w === 2) return L('Match nul');
    if (G.ctl[0] === 'me' && G.ctl[1] === 'me') return L('{p} a gagné', { p: esc(PN[w]) });
    return w === G.me ? L('Victoire !') : L('Défaite…');
  }
  function endGame() {
    if (G.over) return;
    G.over = true; G.sel = null; G.thinking = false; bilanTab = 'err';
    const s = G.s, w = s.winner, title = endTitle();
    sys(L('Fin : {t}', { t: title }) + ' ' + I18N.why(s.why));
    const good = w === G.me || (G.mode === 'daily' && dailyScore(G) > 0);
    Sound.want([good ? 'victoire' : 'defaite']);
    // d'abord les récompenses (le résultat est enregistré tout de suite), puis le bilan
    bilanGains(); // ce que tu gagnes, gardé pour le bilan
    if (!G.practice) commit();
    renderBilan();
    setTimeout(() => {
      if (!G || !G.over || !$('game').classList.contains('on')) return;
      const showB = () => { if (G && G.over) $('endModal').hidden = false; };
      const r = cur >= 0 && !G.practice ? run() : null;
      if (r && (r.pending.length || r.news.length)) { afterRewards = showB; nextReward(); } else showB();
    }, 700);
    render();
  }
  // applique le résultat à une partie (pour de vrai, ou sur une copie pour l'aperçu du bilan)
  function runResult(r, s, mode) {
    const w = s.winner;
    // renommée et maîtrise : elles ne s'arrêtent jamais
    const lv0 = fameLevel(r.xp).n; r.xp = (r.xp || 0) + fameGain(r, mode, w);
    const lv1 = fameLevel(r.xp).n;
    if (lv1 > lv0) { r.news.push(L('👑 Renommée : niveau {n} — {t}', { n: lv1, t: fameTitle(lv1) })); for (let k = 1; k < GEMS.length; k++) if (gemLevel(k) > lv0 && gemLevel(k) <= lv1) r.news.push(L('🎨 Nouvelle couleur pour tes persos (dans la partie)')); }
    if (!r.pp) r.pp = {};
    let ms = 0;
    if (G && G.st) for (const id in G.st.pts) { const a = stars(r.pp[id]); r.pp[id] = (r.pp[id] || 0) + G.st.pts[id]; const b = stars(r.pp[id]); if (b > a && ms++ < 2) r.news.push(L('⭐ Maîtrise : {x} passe à {n} étoile(s)', { x: tn(E.TI[id]), n: b })); }
    if (w === 0) { r.wins++; if (mode === 'hard') r.winsH++; grantWin(r, mode, s); const e0 = r.edge; r.edge = Math.max(0, r.edge - (mode === 'hard' ? 2 : 1)); if (r.edge < e0) r.news.push(L('🎚️ Tu progresses : le bot a moins de désavantages ({n}/{m}).', { n: r.edge, m: EDGE_MAX })); }
    else if (w === 1) { r.losses++; lossProgress(r); if (r.edge < EDGE_MAX) { r.edge++; r.news.push(L('🎚️ Le bot reçoit un désavantage de plus ({n}/{m}).', { n: r.edge, m: EDGE_MAX })); } }
    r.n++; r.match = null; r.hard = rollHard(r);
  }
  function recordStats() {
    const d = statsData(), st = G.st, s = G.s, w = s.winner, me = G.me, duo = G.ctl[0] === 'me' && G.ctl[1] === 'me';
    const m = d.modes[G.mode] || (d.modes[G.mode] = { n: 0, w: 0, l: 0 });
    m.n++; if (!duo) { if (w === me) m.w++; else if (w === 1 - me) m.l++; }
    for (const id in st.pts) { d.pts[id] = (d.pts[id] || 0) + st.pts[id]; d.used[id] = (d.used[id] || 0) + 1; if (!duo && w === me) d.usedW[id] = (d.usedW[id] || 0) + 1; }
    if (s.boss && !duo) { const b = d.bosses[s.boss.kind] || (d.bosses[s.boss.kind] = { w: 0, l: 0 }); if (w === 1 - s.boss.owner) b.w++; else b.l++; }
    d.kills += st.kills[me][0] + st.kills[me][1] + st.kills[me][2];
    d.lost += s.lost[me][0] + s.lost[me][1] + s.lost[me][2];
    d.battles++; d.turns += Math.ceil(s.ply / 2); d.ms += Math.min(4 * 3600e3, Date.now() - st.t0);
    lsSet('stats', d);
  }
  // compte le résultat (une seule fois), garde de quoi revoir la partie, vérifie les succès
  function commit() {
    if (!G || !G.over || G.committed || G.replay) return;
    commitInner();
    saveReplay();
    checkAch(G);
  }
  function commitInner() {
    if (!G || !G.over || G.committed) return;
    G.committed = true;
    if (G.mode === 'tuto') { lsSet('tutoJoue', true); return; }
    recordStats();
    const s = G.s;
    if (G.mode === 'duel') return;
    if (G.mode === 'story') { if (s.winner === G.me && pre.story >= storyDone()) lsSet('story', pre.story + 1); return; }
    if (G.mode === 'season') {
      const d = seasonData(), wk = pre.season.wk, pts = seasonScore(G), old = (d[wk] || []).reduce((a, x) => Math.max(a, x.p), 0);
      d[wk] = (d[wk] || []).concat([{ p: pts, d: Date.now(), m: recInfo(G, G.chal).txt }]).sort((a, b) => b.p - a.p).slice(0, 10); lsSet('seasons', d);
      if (pts > old) { const dd = dailyData(); dd.total += pts - old; lsSet('daily', dd); G.weekGain = pts - old; } // seule l'amélioration de ton meilleur score compte
      return;
    }
    if (G.mode === 'daily') {
      const pts = dailyScore(G), d = dailyData(), c = G.daily, old = d.days[c.date];
      const before = TALENTS.filter(t => d.total >= t.pts).length;
      if (!old || pts > old.best) { d.total += pts - (old ? old.best : 0); d.days[c.date] = { best: pts, m: recInfo(G, G.chal).txt }; lsSet('daily', d); }
      const nowT = TALENTS.filter(t => d.total >= t.pts);
      if (nowT.length > before) toast(L('🎁 Nouveau talent : {x}', { x: talentName(nowT[nowT.length - 1].id) }), 6000);
      return;
    }
    runResult(run(), s, G.mode);
    saveRuns();
  }
  function leaveGame() {
    if (G && G.replay && G.replay.play) clearInterval(G.replay.play);
    const mode = G ? (G.replay ? G.replay.back : G.mode) : null;
    if (G && G.net) netClose();
    G = null;
    if (mode === 'daily') { renderMenu(); show('menu'); }
    else if (mode === 'duel') { renderDuel(); show('duel'); }
    else if (mode === 'story') { renderStory(); show('story'); }
    else if (mode === 'season') { renderSeason(); show('season'); }
    else if (mode === 'tuto' || cur < 0) { renderMenu(); show('menu'); }
    else openRun(cur);
  }
  function endNext() {
    $('endModal').hidden = true;
    commit();
    leaveGame();
  }

  // ---------- le bilan : clair, précis, sans défilement ----------
  // revenir juste avant un coup (h = longueur de l'historique au moment de ce coup)
  function startPractice() {
    if (!G || G.practice || !G.over) return;
    commit(); // le vrai résultat compte tel quel (récompenses, défi, statistiques)
    G.practice = true;
    toast(L('Entraînement : ta vraie partie est gardée telle quelle. Ce que tu rejoues maintenant ne compte pas.'), 5000);
  }
  const canBack = () => G && !G.net && (!G.committed || G.practice || G.over); // après la fin : on peut annuler le dernier coup pour s'entraîner
  function bilanGains() {
    if (G.practice) return []; // entraînement : rien ne compte
    if (G.gainsPre) return G.gainsPre; // calculé avant l'enregistrement du résultat
    const out = [], st = G.st;
    if (!G.committed) G.gainsPre = out;
    const pts = Object.values(st.pts).reduce((a, b) => a + b, 0);
    if (pts) out.push(`⭐ ${L('+{n} points pour tes persos', { n: pts })}`);
    if (G.chal) out.push(`🏆 ${L('Record')} · ${dailyName(G.chal)} : <b>${recInfo(G, G.chal).txt}</b>`);
    if (G.mode === 'season') out.push(`🗓️ ${L('{p} points de défi de la semaine', { p: seasonScore(G) }) + (weekGain(G) ? ' · ' + L('+{n} points pour les talents', { n: weekGain(G) }) : '')}`);
    if (G.mode === 'story' && G.s.winner === G.me) out.push(`📜 <i>${storyEnd(pre.story)}</i>`);
    if (G.mode === 'story' && G.s.winner === G.me && pre.story + 1 < STORY.length) out.push(`📖 ${L('Chapitre suivant débloqué : {x}', { x: storyTitle(pre.story + 1) })}`);
    if (G.mode === 'daily') { out.push(`📅 ${L('{p} points de défi du jour', { p: dailyScore(G) })}`); return out; }
    if (G.mode === 'duel' || cur < 0 || G.committed) return out;
    const r0 = run(), r1 = JSON.parse(JSON.stringify(r0));
    runResult(r1, G.s, G.mode);
    out.push(`👑 ${L('+{n} renommée', { n: (r1.xp || 0) - (r0.xp || 0) })}`);
    for (const pd of r1.pending.slice(r0.pending.length)) out.push(pd.k === 'track' ? `🎯 ${L('Tu choisis ce qui avance (+{n}).', { n: pd.amt })}` : `🎁 ${pd.k === 'god' ? L('Nouveau dieu débloqué !') : pd.k === 'gard' ? L('Nouveau garde débloqué !') : L('Récompense du boss !')}`);
    for (const n of r1.news.slice(r0.news.length)) out.push(n);
    return out;
  }
  // ce qui t'a coûté le combat : tes persos perdus (avec retour en arrière) et quelques conseils simples
  function bilanErrors() {
    const s = G.s, st = G.st, me = G.me, op = 1 - me, lostGame = s.winner === op, out = [];
    const tips = [];
    if (lostGame && s.lost[me][0] > 0 && E.aliveMages(s, me) === 0) tips.push(L('Ton dernier dieu est mort : garde toujours un dieu à l’abri dans ta réserve.'));
    if (lostGame && s.lost[me][1] >= 4) tips.push(L('Tu as perdu 4 gardes : garde-les hors de portée des tirs et des sorts adverses.'));
    if (lostGame && s.mana[me] >= 60) tips.push(L('Tu as fini avec {m} mana : tes dieux auraient pu lancer des sorts.', { m: s.mana[me] }));
    const left = s.res[me].reduce((a, b) => a + b, 0);
    if (lostGame && left >= 3) tips.push(L('{n} persos sont restés dans ta réserve sans servir.', { n: left }));
    if (st.act[me][3] >= 3) tips.push(L('Tu as passé ton tour {n} fois.', { n: st.act[me][3] }));
    const nm = (st.missed || []).filter(m => m.p === me).length;
    if (nm) tips.push(L('Tu as raté {n} prise(s) d’un garde ou d’un dieu ennemi : elles sont dans « Tes erreurs ».', { n: nm }));
    const deaths = st.moments.filter(m => m.o === me && m.vi !== undefined);
    for (const m of deaths.slice(-6)) {
      const what = m.ki >= 0 ? L('ton {v} a été tué par {a}', { v: pieceLabel(me, m.vi), a: pieceLabel(op, m.ki) }) : L('ton {v} est mort', { v: pieceLabel(me, m.vi) });
      out.push(`<li class="err"><span>${L('Tour {n}', { n: m.turn })} · ${what}</span></li>`);
    }
    if (deaths.length > 6) out.unshift(`<li class="muted">${L('… et {n} autres pertes avant.', { n: deaths.length - 6 })}</li>`);
    return { tips, list: out };
  }
  // bilan détaillé : tout ce qu'il faut pour progresser
  // ---------- revue de la partie (inspirée de chess.com) ----------
  const winP = v => 100 / (1 + Math.exp(-v / 3)); // valeur d'une position -> chances de gagner (%)
  const CLS = () => [['unique', '‼', L('Coup unique'), '#26c2a3'], ['meilleur', '★', L('Meilleur coup'), '#81b64c'], ['excellent', '👍', L('Excellent'), '#81b64c'],
    ['bon', '✓', L('Bon'), '#95b776'], ['imprecision', '?!', L('Imprécision'), '#f7c631'], ['erreur', '?', L('Erreur'), '#ffa459'], ['rate', '✕', L('Prise ratée'), '#ff7769'], ['gaffe', '??', L('Gaffe'), '#fa412d']];
  function reviewMove(an, before, a, dead, p, missed) {
    const wb = winP(an.best), wp = winP(an.played), diff = Math.max(0, wb - wp);
    let cls = diff <= 1 ? (an.n > 1 && wb - winP(an.second) >= 15 ? 'unique' : 'meilleur') : diff <= 3 ? 'excellent' : diff <= 7 ? 'bon' : diff <= 14 ? 'imprecision' : diff <= 25 ? 'erreur' : 'gaffe';
    if (missed) cls = 'rate';
    const acc = an.n > 1 ? Math.max(0, Math.min(100, 103.17 * Math.exp(-0.04354 * diff) - 3.17)) : null;
    const key = G.humans[p] && ['imprecision', 'erreur', 'gaffe', 'rate', 'unique'].includes(cls);
    const pack = x => x && { k: x.k, t: x.t, to: x.to, from: x.from, cl: x.cl ? x.cl.slice() : undefined, d: x.d };
    if (!G.st.mv) G.st.mv = [];
    G.st.mv.push({ p, turn: Math.floor(before.ply / 2) + 1, h: G.humans[p] ? G.history.length : 0, cls, acc, ev: Math.max(-60, Math.min(60, an.played)),
      txt: key ? describe(before, a, dead) : '', better: key && cls !== 'unique' && an.bestA && an.bestA !== a ? describe(before, an.bestA, []) : '',
      ply: key ? before.ply : undefined, a: key ? pack(a) : undefined, ba: key && cls !== 'unique' && an.bestA && an.bestA !== a ? pack(an.bestA) : undefined });
  }
  function reviewData(me) {
    const op = 1 - me, mv = G.st.mv || [];
    const acc = [0, 1].map(o => { const l = mv.filter(m => m.p === o && m.acc !== null); return l.length ? Math.round(l.reduce((x, m) => x + m.acc, 0) / l.length) : null; });
    const cnt = (o, c) => mv.filter(m => m.p === o && m.cls === c).length;
    const rows = CLS().map(([c, ic, lbl, col]) => `<tr><td class="ic" style="color:${col}">${ic}</td><td>${lbl}</td><td class="p${me}">${cnt(me, c)}</td><td class="p${op}">${cnt(op, c)}</td></tr>`).join('');
    // courbe : tes chances de gagner après chaque coup
    const ys = mv.map(m => winP(m.p === me ? m.ev : -m.ev)), n = ys.length;
    const X = i => (i / Math.max(1, n - 1) * 300).toFixed(1), Y = v => (90 - v * .9).toFixed(1);
    const dots = mv.map((m, i) => ['gaffe', 'erreur', 'rate'].includes(m.cls) && m.p === me ? `<circle cx="${X(i)}" cy="${Y(ys[i])}" r="3.5" fill="${CLS().find(c => c[0] === m.cls)[3]}"/>` : '').join('');
    const graph = n > 1 ? `<svg class="rvgraph" viewBox="0 0 300 90" preserveAspectRatio="none"><rect width="300" height="90" fill="rgba(180,140,255,.18)"/><polygon points="0,90 ${ys.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} 300,90" fill="rgba(242,193,78,.55)"/><line x1="0" y1="45" x2="300" y2="45" stroke="rgba(255,255,255,.35)" stroke-dasharray="4 4"/>${dots}</svg><p class="muted small">${L('En or : tes chances de gagner après chaque coup (au-dessus du milieu, tu menais).')}</p>` : '';
    // tes erreurs (gaffes, erreurs, prises ratées) : toute la ligne s'ouvre sur la carte
    G.km = mv.map((m, i) => i).filter(i => mv[i].p === me && mv[i].a && mv[i].cls !== 'unique' && momentState(mv[i])); // tout ce qu'on peut revoir sur la carte
    const big = []; mv.forEach((m, i) => { if (m.p === me && ['gaffe', 'erreur', 'rate'].includes(m.cls)) big.push(i); });
    const nUnique = mv.filter(m => m.p === me && m.cls === 'unique').length;
    const kl = big.slice(0, 7).map(i => {
      const m = mv[i], see = G.km.includes(i);
      const [, ic, lbl, col] = CLS().find(c => c[0] === m.cls);
      const ms = m.cls === 'rate' ? (G.st.missed || []).find(x => x.h === m.h && x.p === me) : null;
      const what = (m.txt || '?') + (ms ? `<br>⚔️ ${L('{a} pouvait prendre {v}', { a: pieceLabel(me, ms.ai), v: pieceLabel(op, ms.vi) })}` : '');
      return `<li class="km2${see ? ' km' : ''}"${see ? ` data-km="${i}"` : ''} style="--c:${col}"><span class="kic">${ic}</span><span class="ktx"><b style="color:${col}">${lbl}</b> · ${L('Tour {n}', { n: m.turn })}<br>${L('Ton coup')} : ${what}${m.better ? `<br><span class="kbest">✔ ${L('Il fallait')} : ${m.better}</span>` : ''}</span>${see ? `<span class="kgo">👁 ${L('Voir')}</span>` : ''}</li>`;
    });
    const keys = (kl.length ? `<ul class="errs2">${kl.join('')}</ul>${big.length > 7 ? `<p class="muted small">${L('… et {n} autre(s) : utilise ◀ ▶ sur la carte.', { n: big.length - 7 })}</p>` : ''}`
      : `<p class="okmsg">${L('Aucune grosse erreur : bien joué !')}</p>`)
      + (nUnique ? `<p class="small">✨ ${L('{n} coup(s) unique(s) : le seul bon coup, et tu l’as trouvé !', { n: nUnique })}</p>` : '');
    const seeAll = G.km.length ? `<button class="big seeall" data-km="${(big.find(i => G.km.includes(i)) ?? G.km[0])}">👁 ${L('Revoir mes erreurs sur la carte ({n})', { n: G.km.length })}</button>` : '';
    return { acc, rows, graph, keys, seeAll };
  }
  // ---------- revoir un moment du bilan sur la carte ----------
  function momentState(m) { const e = G.history.find(x => x.s.ply === m.ply); return e ? e.s : null; }
  function actSquares(a) { if (!a) return []; const l = []; if (a.from !== undefined) l.push(a.from); if (a.to !== undefined) l.push(a.to); if (a.cl) for (const x of a.cl) if (typeof x === 'number') l.push(x); return l; }
  function showMoment(i) {
    const m = G.st.mv[i], st = m && momentState(m);
    if (!st) return;
    if (!G.view) G.view = { s: G.s, la: G.lastA, sel: G.sel };
    G.s = st; G.lastA = null; G.sel = null; G.viewI = i;
    document.body.classList.add('viewing');
    $('endModal').hidden = true;
    render();
    const [, ic, lbl, col] = CLS().find(c => c[0] === m.cls), me = G.me, op = 1 - me;
    const ms = m.cls === 'rate' ? (G.st.missed || []).find(x => x.h === m.h && x.p === me) : null;
    const tokOf = a => a && a.t !== undefined && a.t >= 0 && (a.k === 'rec' || a.k === 'pla' || a.k === 'draft') ? `<span class="mbtk">${token(a.t, me)}</span>` : '';
    const k = G.km.indexOf(i);
    let bar = $('momentBar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'momentBar'; bar.className = 'glass'; document.body.appendChild(bar); }
    bar.innerHTML = `<div class="mbtop"><b style="color:${col}">${ic} ${lbl}</b> · ${L('Tour {n}', { n: m.turn })}${G.km.length > 1 ? ` · <span class="muted">${k + 1}/${G.km.length}</span>` : ''}</div>
      <div class="mbl bad"><i></i>${tokOf(m.a)}<span>${L('Ton coup')} : ${m.txt || '?'}</span></div>
      ${m.better ? `<div class="mbl good"><i></i>${tokOf(m.ba)}<span>${L('Il fallait')} : ${m.better}</span></div>` : ''}
      ${ms ? `<div class="mbl miss"><span>⚔️ ${L('{a} pouvait prendre {v}', { a: pieceLabel(me, ms.ai), v: pieceLabel(op, ms.vi) })}</span></div>` : ''}
      <div class="mbbtn"><button class="ghost sm" id="mbPrev" ${k > 0 ? '' : 'disabled'}>◀</button><button class="ghost sm" id="mbNext" ${k >= 0 && k < G.km.length - 1 ? '' : 'disabled'}>▶</button>
      <button class="ghost sm mbback" id="mbBack">${L('← Retour au bilan')}</button></div>`;
    $('mbPrev').onclick = () => momentStep(-1); $('mbNext').onclick = () => momentStep(1);
    $('mbBack').onclick = () => closeMoment();
    sfx('choix');
  }
  function momentMarks() { // appelé par render() pendant qu'on revoit un moment
    const m = G.st.mv[G.viewI]; if (!m) return;
    actSquares(m.a).forEach(q => sqEls[q] && sqEls[q].classList.add('mbad'));
    actSquares(m.ba).forEach(q => sqEls[q] && sqEls[q].classList.add('mgood'));
    momentArrows([[m.a, '#ff5f5f'], [m.ba, '#5fe08e']]);
  }
  function momentStep(d) { const k = G.km.indexOf(G.viewI) + d; if (k >= 0 && k < G.km.length) showMoment(G.km[k]); }
  function closeMoment(quiet) {
    if (!G || !G.view) return;
    G.s = G.view.s; G.lastA = G.view.la; G.sel = G.view.sel; G.view = null; G.viewI = null;
    document.body.classList.remove('viewing');
    const bar = $('momentBar'); if (bar) bar.remove();
    const ar = $('momArrows'); if (ar) ar.remove();
    render();
    if (!quiet) $('endModal').hidden = false;
  }
  // pendant qu'on revoit un moment, un clic ailleurs que sur la carte ramène au bilan (rien d'autre ne doit agir sur cet ancien plateau)
  document.addEventListener('click', e => {
    if (!G || !G.view) return;
    const t = e.target;
    if (t.closest && (t.closest('#momentBar') || t.closest('#board') || t.closest('#infoCard'))) return;
    e.preventDefault(); e.stopPropagation(); closeMoment();
  }, true);
  function momentArrows(list) {
    const old = $('momArrows'); if (old) old.remove();
    if (!G.sq) return;
    const S = G.sq, g = G.s.g, W = g.W * S, H = g.H * S;
    let svg = '';
    for (const [a, col] of list) {
      if (!a || a.k !== 'act') continue;
      const pts = [a.from].concat((a.cl || []).filter(x => typeof x === 'number')).filter((q, j, l) => j === 0 || q !== l[j - 1]).map(q => { const p = sqXY(q); return [p.x + S / 2, p.y + S / 2]; });
      if (pts.length < 2) continue;
      const [x2, y2] = pts[pts.length - 1], [x1, y1] = pts[pts.length - 2], len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const ux = (x2 - x1) / len, uy = (y2 - y1) / len, ex = x2 - ux * S * .28, ey = y2 - uy * S * .28, hw = S * .17;
      const path = pts.slice(0, -1).concat([[ex, ey]]).map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
      svg += `<polyline points="${path}" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="${Math.max(6, S * .14)}" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline points="${path}" fill="none" stroke="${col}" stroke-width="${Math.max(4, S * .09)}" stroke-linecap="round" stroke-linejoin="round"/>
        <polygon points="${x2 - ux * S * .08},${y2 - uy * S * .08} ${ex - uy * hw},${ey + ux * hw} ${ex + uy * hw},${ey - ux * hw}" fill="${col}" stroke="rgba(0,0,0,.55)" stroke-width="1.5"/>`;
    }
    if (!svg) return;
    const d = document.createElement('div');
    d.id = 'momArrows'; d.className = 'fxe lastarrow';
    d.style.left = '0'; d.style.top = '0'; d.style.width = W + 'px'; d.style.height = H + 'px';
    d.innerHTML = `<svg width="${W}" height="${H}">${svg}</svg>`;
    fxEl.appendChild(d);
  }
  let bilanTab = 'err';
  function renderBilan(tab) {
    if (tab) bilanTab = tab;
    const s = G.s, st = G.st, me = G.me, op = 1 - me, w = s.winner;
    const title = endTitle(), col = w === 2 ? '' : (w === me ? 'var(--gold)' : 'var(--vio)');
    const myTurns = Math.ceil(s.ply / 2), mins = Math.floor((Date.now() - st.t0) / 60000), secs = Math.floor((Date.now() - st.t0) / 1000) % 60;
    const sum = a => a[0] + a[1] + a[2];
    const kills = sum(st.kills[me]), lost = sum(s.lost[me]);
    const err = bilanErrors(), gains = bilanGains(), R = reviewData(me);
    const mine = Object.entries(st.pieces).filter(([k]) => +k[0] === me).map(([k, v]) => ({ id: k.slice(2), ...v })).sort((a, b) => b.kills - a.kills || b.act - a.act);
    const best = mine.length && mine[0].kills ? mine[0] : null;
    let body;
    if (bilanTab === 'err') {
      body = `<div class="review">
        <section class="bcard rvL"><h3>🔑 ${L('Tes erreurs')}</h3><p class="muted small">${L('Clique sur une erreur : la carte montre ton coup en rouge et le bon coup en vert.')}</p>${R.keys}${R.seeAll}</section>
        <section class="bcard rvR">
          <div class="accs">${[me, op].map(o => `<div class="acc p${o}"><small>${esc(PN[o])}</small><b>${R.acc[o] === null ? '–' : R.acc[o] + ' %'}</b><small>${L('précision')}</small></div>`).join('')}</div>
          <h3>📈 ${L('Avantage au fil de la partie')}</h3>${R.graph}
          <p class="rvmini">⚔️ ${L('{k} ennemi(s) tué(s)', { k: kills })} · 💀 ${L('{n} perdu(s)', { n: lost })} · ⏱️ ${L('{n} tours', { n: myTurns })} · ${mins}:${String(secs).padStart(2, '0')}</p>
          ${best ? `<p class="small">⭐ ${L('Ton meilleur perso : {x}, {k} ennemi(s) tué(s).', { x: pieceLabel(me, E.TI[best.id]), k: best.kills })}</p>` : ''}
          ${err.tips.length ? `<ul class="tips">${err.tips.slice(0, 3).map(t => `<li>💡 ${t}</li>`).join('')}</ul>` : ''}
          ${gains.length ? `<h3>🎁 ${L('Ce que tu gagnes')}</h3><ul class="gains">${gains.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
        </section></div>`;
    } else {
      const ptab = mine.length ? `<table class="dtab"><tr><th></th><th>${L('Activations')}</th><th>${L('Tués')}</th><th>${L('Morts')}</th></tr>${mine.map(r => `<tr><td class="pn">${token(E.TI[r.id], me)}<span>${tn(E.TI[r.id])}</span></td><td>${r.act}</td><td>${r.kills || ''}</td><td class="${r.died ? 'bad' : ''}">${r.died || ''}</td></tr>`).join('')}</table>` : `<p class="muted">${L('Aucun perso activé.')}</p>`;
      const line = (lbl, a, b) => `<tr><td>${lbl}</td><td class="p${me}">${a}</td><td class="p${op}">${b}</td></tr>`;
      const gn = st.gain || [0, 0];
      const cmp = `<table class="dtab cmp2"><tr><th></th><th class="p${me}">${esc(PN[me])}</th><th class="p${op}">${esc(PN[op])}</th></tr>
        ${line(L('Dieux tués'), st.kills[me][0], st.kills[op][0])}${line(L('Gardes tués'), st.kills[me][1], st.kills[op][1])}${line(L('Soldats tués'), st.kills[me][2], st.kills[op][2])}
        ${line(L('Persos perdus'), sum(s.lost[me]), sum(s.lost[op]))}${line(L('Recrutements'), st.act[me][0], st.act[op][0])}${line(L('Placements'), st.act[me][1], st.act[op][1])}
        ${line(L('Activations'), st.act[me][2], st.act[op][2])}${line(L('Tours passés'), st.act[me][3], st.act[op][3])}
        ${line(L('Mana dépensée'), st.mana[me], st.mana[op])}${line(L('Mana gagnée'), gn[me], gn[op])}${line(L('Mana à la fin'), s.mana[me], s.mana[op])}</table>`;
      body = `<div class="bcols dcols">
        <section class="bcard"><h3>${L('Tes coups, classés')}</h3><table class="rvtab">${R.rows}</table></section>
        <section class="bcard"><h3>${L('Toi contre l’adversaire')}</h3>${cmp}</section>
        <section class="bcard"><h3>${L('Tes persos')}</h3>${ptab}${err.list.length ? `<h3>💀 ${L('Persos perdus')}</h3><ul class="errs">${err.list.join('')}</ul>` : ''}</section>
      </div>`;
    }
    $('bilan').innerHTML = `<div class="bhead"><h2 style="color:${col}">${title}</h2><p class="why">${G.practice ? `🏋️ ${L('Entraînement : ce résultat ne compte pas, ta vraie partie est gardée.')}<br>` : ''}${I18N.why(s.why)}</p></div>
      <div class="seg bltabs"><button data-bt="err" class="${bilanTab === 'err' ? 'sel' : ''}">🔑 ${L('Tes erreurs')}</button><button data-bt="num" class="${bilanTab === 'num' ? 'sel' : ''}">📊 ${L('Chiffres')}</button></div>
      ${body}
      <div class="menu-actions"><button class="big" id="btnNext">${G.mode === 'daily' ? L('Retour au menu') : L('Continuer')}</button><button class="ghost" id="btnLook">🗺️ ${L('Voir la carte')}</button>${G.history.length && canBack() ? `<button class="ghost" id="btnEndUndo" title="${esc(L('Pour t’entraîner : ta vraie partie est gardée telle quelle.'))}">↶ ${L('Annuler le dernier coup')}</button>` : ''}${G.net || G.mode === 'tuto' || !G.rec || G.rec.length < 2 ? '' : `<button class="ghost" id="btnEndReplay">🎬 ${L('Revoir toute la partie')}</button>`}</div>`;
    $('btnNext').onclick = endNext;
    $('bilan').querySelectorAll('[data-bt]').forEach(b => b.onclick = () => { sfx('page'); renderBilan(b.dataset.bt); });
    if ($('btnEndReplay')) $('btnEndReplay').onclick = () => { const back = G.mode; $('endModal').hidden = true; commit(); openReplay(0, back); };
    $('btnLook').onclick = () => { $('endModal').hidden = true; render(); };
    if ($('btnEndUndo')) $('btnEndUndo').onclick = undo;
    $('bilan').querySelectorAll('[data-km]').forEach(b => b.onclick = e => { e.stopPropagation(); showMoment(+b.dataset.km); });
  }
  function undo() {
    if (!G || G.peek) return;
    if (!G.history.length) return toast(L('Aucun coup à annuler.'));
    if (!canBack()) return toast(L('L’affrontement est fini.'));
    startPractice();
    const h = G.history.pop();
    G.s = h.s; G.lastA = h.lastA; $('log').innerHTML = h.log; if (h.st) G.st = JSON.parse(h.st);
    if (G.rec && h.rf) G.rec.length = h.rf;
    G.ver++; G.thinking = false; G.sel = null; G.over = false;
    $('endModal').hidden = true;
    sys(L('Coup annulé.'));
    sfx('annule'); render(); saveMatch(); maybeBot();
  }
  $('btnUndo').onclick = undo;
  // abandonner : compte comme une défaite (2 appuis pour éviter les erreurs)
  function giveUp() {
    if (!G || G.over || G.replay) return;
    const b = $('btnGiveUp');
    if (!b.dataset.sure) { b.dataset.sure = 1; b.classList.add('danger'); toast('🏳️ ' + L('Touche encore 🏳️ pour abandonner : ça compte comme une défaite.'), 3000); setTimeout(() => { delete b.dataset.sure; b.classList.remove('danger'); }, 3000); return; }
    delete b.dataset.sure; b.classList.remove('danger');
    const loser = G.humans[0] && G.humans[1] ? G.s.turn : G.me;
    if (G.net) netSend({ t: 'bye' });
    G.thinking = false; G.ver++; G.sel = null; G.history = [];
    G.s.winner = 1 - loser; G.s.why = 'Abandon.';
    sfx('annule'); render(); endGame();
  }
  $('btnGiveUp').onclick = giveUp;
  $('btnMenu').onclick = () => {
    if (G && G.over) commit();
    if (G && G.net && !G.over) netSend({ t: 'bye' });
    if (G && !G.over) saveMatch();
    leaveGame();
  };

  // ---------- textes du journal ----------
  const SIDE = { haut: L('du haut'), bas: L('du bas'), gauche: L('de gauche'), droite: L('de droite') };
  function optLabel(x, id) {
    if (x === 'centre') return L('le centre');
    if (SIDE[x]) return (id === 'pb' ? L('2e ligne') : L('bord')) + ' ' + SIDE[x];
    if (x === 'go') return '';
    if (x[0] === 'r') return L('recrute {x}', { x: tn(+x.slice(1)) });
    if (x[0] === 'v') return L('ranime {x}', { x: tn(+x.slice(1)) });
    if (/^p\d+$/.test(x)) return L('prend en {c}', { c: sqName(+x.slice(1)) }); // Jumeau : prendre au lieu d'échanger
    return x;
  }
  function declText(d, s) {
    if (d.k === 'rec') return L('recruter');
    if (d.k === 'pla') return L('placer');
    const c = s.b[d.from];
    return L('activer {x} ({c})', { x: c > 0 ? tn(E.tix(c)) : '?', c: sqName(d.from) });
  }
  function describe(b, a, dead) {
    const P = `<b>${esc(PN[b.turn])}</b>`;
    const ds = dead.length ? ` — <span style="color:var(--danger)">${L(dead.length > 1 ? '{n} morts' : '{n} mort', { n: dead.length })}</span>` : '';
    switch (a.k) {
      case 'rec': return L('{p} recrute {x}', { p: P, x: tn(a.t) });
      case 'draft': return b.ev === 'inverse' ? L('{p} donne {x} à {o}', { p: P, x: tn(a.t), o: esc(PN[1 - b.turn]) }) : L('{p} prend {x}', { p: P, x: tn(a.t) });
      case 'pioche': return L('{p} pioche une pièce face cachée', { p: P });
      case 'pla': return L('{p} place {x} en {c}', { p: P, x: tn(a.t), c: sqName(a.to) }) + (E.placeFree(b, a) ? ' ' + L('(gratuit, case noire)') : '');
      case 'act': { const ti = E.tix(b.b[a.from]); const d = a.cl.map(x => typeof x === 'number' ? sqName(x) : optLabel(x, mid(T[ti].id))).filter(Boolean).join(' → '); return L('{p} active {x} en {c}', { p: P, x: tn(ti), c: sqName(a.from) }) + (d ? ' : ' + d : '') + ds; }
      case 'pass': return L('{p} passe son tour', { p: P });
      case 'decl': return L('{p} annonce : {d}', { p: P, d: declText(a.d, b) });
    }
    return '';
  }
  function logLine(html, p) { const li = document.createElement('li'); li.className = 'p' + p; li.innerHTML = html; $('log').prepend(li); while ($('log').children.length > 60) $('log').lastChild.remove(); }
  function sys(txt) { const li = document.createElement('li'); li.className = 'sys'; li.textContent = txt; $('log').prepend(li); }

  // ---------- sélection ----------
  const SELECT_IDX = { mb: [0, 1], mc: [0], md: [0, 2], g1: [0], pc: [0], pr: [0], nc: [0], nh: [0], nj: [0] };
  function matching() { const sel = G.sel; return sel.cands.filter(a => sel.pre.every((x, i) => a.cl[i] === x)); }
  function selView() {
    const v = { sq: new Map(), strs: [], complete: null, path: [] };
    const sel = G.sel; if (!sel) return v;
    const s = G.s;
    if (sel.k === 'place') { for (const a of legal()) if (a.k === 'pla' && a.t === sel.t) v.sq.set(a.to, 'tgt-place' + (E.placeFree(s, a) ? ' free' : '')); return v; }
    const m = matching(), n = sel.pre.length;
    const tid = mid(T[E.tix(s.b[sel.from])].id);
    v.path = sel.pre.filter(x => typeof x === 'number');
    for (const a of m) {
      if (a.cl.length === n) { v.complete = a; continue; }
      const x = a.cl[n];
      if (typeof x === 'string') { if (!v.strs.includes(x)) v.strs.push(x); continue; }
      if (v.sq.has(x)) continue;
      const c = s.b[x];
      let cls = 'tgt-move';
      const g = s.g, near = Math.max(Math.abs(((x / g.W) | 0) - ((sel.from / g.W) | 0)), Math.abs(x % g.W - sel.from % g.W)) === 1;
      if (c > 0) cls = tid === 'g1' && near && E.own(c) !== s.turn ? 'tgt-cap' : (SELECT_IDX[tid] || []).includes(n) || E.own(c) === s.turn ? 'tgt-ally' : 'tgt-cap';
      else if (tid === 'lc') cls = 'tgt-cap';
      v.sq.set(x, cls);
    }
    return v;
  }
  function stepSel() {
    const m = matching(), n = G.sel.pre.length;
    const longer = m.filter(a => a.cl.length > n), done = m.find(a => a.cl.length === n);
    if (done && !longer.length) return doAction(done);
    if (!m.length) G.sel = null;
    render();
  }
  function selectPiece(q) {
    const cands = legal().filter(a => a.k === 'act' && a.from === q);
    G.sel = { k: 'piece', from: q, cands, pre: [] };
    if (!cands.length) {
      G.sel = null;
      const s = G.s, t = T[E.tix(s.b[q])];
      let why = L('Ce perso n’a aucune action possible pour l’instant.');
      if (s.noAct[s.turn]) why = L('Tu ne peux plus activer de perso (Silence).');
      else if (E.isIce(s, q) && s.frz && s.frz.some(f => f.q === q)) why = L('Ce perso est enchaîné : il ne peut pas être activé ce tour-ci.');
      else if (E.isIce(s, q)) why = s.boss.kind === 'sl' && !(s.boss.ice && s.boss.ice.includes(q)) ? L('La lumière du Phare fige ce perso : éloigne-toi ou frappe-le de loin.') : s.boss.kind === 'sa' ? L('L’Archange a aveuglé ce perso : il ne peut pas agir ce tour-ci.') : L('Ce perso est gelé : il ne peut pas agir ce tour-ci.');
      else if (t.cost && s.mana[s.turn] < t.cost) why = L('Pas assez de mana ({c} nécessaires).', { c: t.cost });
      else if (s.decl[s.turn] && legal().some(a => a.k !== 'pass')) why = L('Tu dois faire l’action que tu as annoncée.');
      toast(why); sfx('erreur');
    } else sfx('choix');
    render();
  }
  function clickSq(q) {
    if (!G || G.peek) return;
    const s = G.s, c = s.b[q];
    if (c > 0) showInfo(E.tix(c), E.own(c), q); else showSpec(q);
    if (!humanTurn()) return;
    if (s.phase === 'decl') { const a = legal().find(x => x.d.k === 'act' && x.d.from === q); if (a) doAction(a); return; }
    if (s.phase !== 'play') return;
    if (G.sel) {
      const v = selView();
      if (v.sq.has(q)) {
        if (G.sel.k === 'place') return doAction(legal().find(a => a.k === 'pla' && a.t === G.sel.t && a.to === q));
        G.sel.pre.push(q); sfx('choix', .7); return stepSel();
      }
      if (G.sel.k === 'piece' && G.sel.from === q) { G.sel = null; sfx('annule'); render(); return; }
    }
    if (c > 0 && E.own(c) === s.turn) return selectPiece(q);
    if (G.sel) { G.sel = null; render(); }
  }

  // ---------- plateau (la taille s'adapte à la place disponible) ----------
  const boardEl = $('board'), terrainEl = $('terrain');
  let sqEls = [];
  function buildBoard(g) {
    boardEl.innerHTML = ''; fxEl.innerHTML = ''; sqEls = [];
    for (let q = 0; q < g.N; q++) {
      const d = document.createElement('div');
      if (g.ex[q]) {
        d.addEventListener('click', () => clickSq(q));
        d.addEventListener('mouseenter', () => { if (!G) return; if (G.s.b[q] > 0) showInfo(E.tix(G.s.b[q]), E.own(G.s.b[q]), q); else showSpec(q); });
      }
      sqEls.push(d);
    }
    // le 2e joueur en ligne voit la carte de son côté (retournée)
    (G && G.flip ? sqEls.slice().reverse() : sqEls).forEach(d => boardEl.appendChild(d));
  }
  let lastLayout = '';
  function layoutBoard() {
    if (!G) return;
    const g = G.s.g, box = $('boardBox');
    const availW = Math.max(200, box.clientWidth), availH = Math.max(200, box.clientHeight);
    const sq = Math.max(24, Math.floor(Math.min(availW / (g.W + .8), availH / (g.H + .8), 170))); // les petites cartes (rivière, îles…) prennent toute la place
    const m = Math.round(sq * .4);
    const key = `${g.W}x${g.H}:${sq}:${G.seed}:${theme}`;
    G.sq = sq; G.m = m;
    const root = document.documentElement.style;
    root.setProperty('--sq', sq + 'px'); root.setProperty('--cols', g.W); root.setProperty('--rows', g.H);
    terrainEl.style.width = (g.W * sq + 2 * m) + 'px'; terrainEl.style.height = (g.H * sq + 2 * m) + 'px';
    for (const el of [boardEl, fxEl]) { el.style.left = m + 'px'; el.style.top = m + 'px'; el.style.width = (g.W * sq) + 'px'; el.style.height = (g.H * sq) + 'px'; }
    if (key !== lastLayout || !terrainEl.querySelector('canvas')) { boardDecor.build(terrainEl, g, sq, m, G.seed, theme); lastLayout = key; }
  }
  if (window.ResizeObserver) new ResizeObserver(() => { if (G && $('game').classList.contains('on')) layoutBoard(); }).observe($('boardBox'));

  function render() {
    if (!G) return;
    if (sqEls.length !== G.s.g.N) { buildBoard(G.s.g); layoutBoard(); } // la carte a changé (nouvel affrontement) : on la reconstruit d'abord
    if (!G.replay) for (let q = 0; q < G.s.g.N; q++) { const c = G.s.b[q]; if (c > 0 && !SEEN.has(T[E.tix(c)].id)) markSeen([T[E.tix(c)].id]); }
    const s = G.s, g = s.g, v = selView();
    const lastSq = new Set(), la = G.lastA;
    if (la) { if (la.from !== undefined) lastSq.add(la.from); if (la.to !== undefined) lastSq.add(la.to); if (la.cl) la.cl.forEach(x => typeof x === 'number' && lastSq.add(x)); }
    const declSq = new Set(); for (const p of [0, 1]) if (s.decl[p] && s.decl[p].k === 'act') declSq.add(s.decl[p].from);
    const showHome = G.sel && G.sel.k === 'place';
    const centerSet = s.goal === 'colline' ? new Set(g.center) : null;
    const botOf = [], leftOf = [];
    const fl = G.flip;
    for (let q = 0; q < g.N; q++) if (g.ex[q]) { const r = (q / g.W) | 0, c = q % g.W; if (botOf[c] === undefined || (fl ? r < botOf[c] : r > botOf[c])) botOf[c] = r; if (leftOf[r] === undefined || (fl ? c > leftOf[r] : c < leftOf[r])) leftOf[r] = c; }
    const B = s.boss && s.boss.hp > 0 ? s.boss : null;
    for (let q = 0; q < g.N; q++) {
      const el = sqEls[q], c = s.b[q];
      if (!g.ex[q]) { el.className = 'sq void'; el.innerHTML = ''; continue; }
      if (c === E.VOID) { el.className = 'sq pit'; el.innerHTML = ''; continue; }
      const r = (q / g.W) | 0, col = q % g.W;
      let cls = 'sq ' + (E.isDark(g, q) ? 'd' : 'l');
      if (g.zone[0][q]) cls += ' zone0 home0'; if (g.zone[1][q]) cls += ' zone1 home1';
      if (showHome) cls += ' showhome';
      if (c < 0) cls += ' wall';
      if (g.spec[q]) cls += ' spec' + g.spec[q];
      if (centerSet && centerSet.has(q)) cls += ' hill';
      if (E.isBl(s, q)) cls += ' blessed';
      if (B && B.warn && B.warn.includes(q)) cls += ' warn';
      if ((B && B.ice && B.ice.includes(q)) || (s.frz && c > 0 && s.frz.some(f => f.q === q && E.own(c) === f.p))) cls += ' ice'; // gelé, ou enchaîné
      if (s.curse && c > 0 && s.curse.some(k => k.q === q && E.own(c) === k.p)) cls += ' warn'; // maudit : il meurt s'il reste là
      if (B && B.kind === 'sl' && B.hp > 0 && q !== B.q && Math.max(Math.abs(((q / g.W) | 0) - ((B.q / g.W) | 0)), Math.abs(q % g.W - B.q % g.W)) <= 2) cls += ' aura';
      if (lastSq.has(q)) cls += ' last';
      if (declSq.has(q)) cls += ' decl';
      if (v.sq.has(q)) cls += ' ' + v.sq.get(q);
      if (v.path.includes(q)) cls += ' path';
      if (G.sel && G.sel.k === 'piece' && G.sel.from === q) cls += ' selp';
      if (padOn && padBoard && G.padQ === q) cls += ' padq';
      el.className = cls;
      let h = '';
      if (botOf[col] === r) h += `<span class="crd f">${COLS[col]}</span>`;
      if (leftOf[r] === col) h += `<span class="crd r">${g.H - r}</span>`;
      if (g.spec[q]) h += g.spec[q] === 3 ? currentSvg(g.cdir ? g.cdir[q] : 4) : SPEC_SVG[g.spec[q]];
      if (c < 0) h += s.boss && (s.boss.coral || []).includes(q) ? CORAL : B && B.webs && B.webs.includes(q) ? WEB : B && B.stones && B.stones.includes(q) ? STONE : (s.boss && ((s.boss.webs || []).includes(q))) ? WEB : (s.boss && (s.boss.stones || []).includes(q)) ? STONE : BRAMBLE;
      if (c > 0) {
        const t = T[E.tix(c)];
        h += `<div class="pc ${t.cat}${t.cat === 'B' && s.boss && s.boss.ghost ? ' ghost' : ''}">${token(E.tix(c), E.own(c))}</div>`;
        if (t.cat === 'B' && s.boss && s.boss.q === q) h += `<div class="hp">${'❤'.repeat(Math.max(0, s.boss.hp))}<span>${'♡'.repeat(Math.max(0, s.boss.max - s.boss.hp))}</span></div>`;
      }
      h += '<div class="mk"></div>';
      el.innerHTML = h;
    }
    const tl = $('turnline');
    if (G.view) tl.innerHTML = `🔎 ${L('Tour {n}', { n: Math.floor(s.ply / 2) + 1 })}`;
    else if (G.practice && !G.over) tl.innerHTML = `🏋️ ${L('Entraînement')} · ${L('Tour {n}', { n: Math.floor(s.ply / 2) + 1 })} · ` + L('Au tour de {p}', { p: `<span class="p${s.turn}">${esc(PN[s.turn])}</span>` });
    else if (G.over) tl.innerHTML = s.winner === 2 ? L('Match nul') : L('{p} a gagné', { p: `<span class="p${s.winner}">${esc(PN[s.winner])}</span>` });
    else {
      let t = `<b class="turnno">${L('Tour {n}', { n: Math.floor(s.ply / 2) + 1 })}</b> · ` + L('Au tour de {p}', { p: `<span class="p${s.turn}">${esc(PN[s.turn])}</span>` });
      if (s.phase === 'draft') t += ' · ' + L('draft');
      if (s.phase === 'decl') t += ' · ' + L('annonce');
      if (s.acts > 1) t += ' · ' + L('{n} actions restantes', { n: s.acts });
      if (s.goal === 'colline') t += ` · ⛰️ ${s.hold[0]}–${s.hold[1]}`;
      if (s.boss && s.boss.hp > 0) t += ` · 👹 ${'❤'.repeat(s.boss.hp)}`;
      if (s.dawn) t += ` · 🌅 ${L('{n} tours avant l’aube', { n: Math.max(0, s.dawn - Math.floor(s.ply / 2)) })}`;
      tl.innerHTML = t;
    }
    drawLastArrow();
    const oldM = $('momArrows'); if (oldM) oldM.remove();
    if (G.view) momentMarks();
    $('btnUndo').disabled = !G.history.length || !canBack();
    renderPlayers(); renderPool(); renderHint(v); music();
  }
  function drawLastArrow() {
    const old = $('lastArrow'); if (old) old.remove();
    const la = G.lastA;
    if (!la || la.k !== 'act' || !G.sq || SET.anim === 'aucune') return;
    const nums = la.cl.filter(v => typeof v === 'number');
    if (!nums.length) return;
    const to = nums[nums.length - 1]; if (to === la.from) return;
    const S = G.sq, A = sqXY(la.from), B = sqXY(to), g = G.s.g;
    const x1 = A.x + S / 2, y1 = A.y + S / 2, x2 = B.x + S / 2, y2 = B.y + S / 2, len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 4) return;
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len, ex = x2 - ux * S * .3, ey = y2 - uy * S * .3, hw = S * .14;
    const col = G.lastP === 1 ? '#c8a8ff' : '#ffd86a';
    const d = document.createElement('div');
    d.id = 'lastArrow'; d.className = 'fxe lastarrow';
    d.style.left = '0'; d.style.top = '0'; d.style.width = (g.W * S) + 'px'; d.style.height = (g.H * S) + 'px';
    d.innerHTML = `<svg width="${g.W * S}" height="${g.H * S}"><line x1="${x1 + ux * S * .3}" y1="${y1 + uy * S * .3}" x2="${ex}" y2="${ey}" stroke="${col}" stroke-width="${Math.max(3, S * .07)}" stroke-linecap="round" stroke-dasharray="${S * .12} ${S * .1}"/>
      <polygon points="${x2 - ux * S * .12},${y2 - uy * S * .12} ${ex - uy * hw},${ey + ux * hw} ${ex + uy * hw},${ey - ux * hw}" fill="${col}"/></svg>`;
    fxEl.appendChild(d);
  }
  let hotSince = 0, hotState = false;
  function music() {
    if (!G || G.over) return;
    if (G.s.boss) return Sound.want(['boss', 'foret']);
    const s = G.s, need = s.ev === 'illimite' ? 6 : 4;
    let hot = false;
    if (s.goal) { const tot = p => s.lost[p][0] + s.lost[p][1] + s.lost[p][2]; hot = (s.goal === 'massacre' && Math.max(tot(0), tot(1)) >= 3) || (s.goal === 'colline' && Math.max(s.hold[0], s.hold[1]) >= 2) || (s.goal === 'chasse' && (s.lost[0][1] + s.lost[1][1]) >= 2); }
    else for (const p of [0, 1]) { if (s.lost[p][1] >= need - 1) hot = true; if (s.ev !== 'illimite' && s.lost[p][0] >= 1 && E.aliveMages(s, p) === 1) hot = true; }
    const now = performance.now();
    if (hot !== hotState) { if (!hotSince) hotSince = now; if (now - hotSince > 6000) { hotState = hot; hotSince = 0; } } else hotSince = 0;
    const sea = !!G.s.g.cdir || theme === 'abysses', dark = !!(G.s.fac && (G.s.fac[0] || G.s.fac[1]));
    Sound.want(hotState ? ['tension', 'foret'] : sea && dlcOn('abysses') ? ['abysses'] : dark && dlcOn('ombres') ? ['ombres', 'foret'] : ['partie', 'foret']);
  }
  setInterval(() => { if (G && !G.over && $('game').classList.contains('on')) music(); }, 2000);

  function reserveVisible(p) { return G.s.ev !== 'cache' || G.over || G.humans[p]; }
  function renderPlayers() {
    const s = G.s;
    const placeable = new Set();
    if (humanTurn() && s.phase === 'play') for (const a of legal()) if (a.k === 'pla') placeable.add(a.t);
    for (const p of [0, 1]) {
      const el = $('pp' + (G.flip ? 1 - p : p)); // en ligne, le 2e joueur voit son panneau en bas
      el.className = `pp p${p}` + (!G.over && s.turn === p ? ' active' : '');
      const gNeed = s.ev === 'illimite' ? 6 : E.gNeed(s, p), am = E.aliveMages(s, p);
      let pips = '';
      if (!s.goal) for (let i = 0; i < gNeed; i++) pips += `<span class="pip ${i < s.lost[p][1] ? 'lost' : ''}"></span>`;
      let gods = '';
      for (let i = 0; i < am; i++) gods += '<span class="pip god"></span>';
      for (let i = 0; i < s.lost[p][0]; i++) gods += '<span class="pip god dead"></span>';
      let fx = '';
      if (s.goal) fx += `<span class="info">🎯 ${s.goal === 'colline' ? L('Centre : {n}/3', { n: s.hold[p] }) : L('Pertes : {n}', { n: s.lost[p][0] + s.lost[p][1] + s.lost[p][2] })}</span>`;
      if (s.noPlace[p]) fx += `<span>🔒 ${s.noPlace[p]}</span>`;
      if (s.noAct[p]) fx += `<span>🤫 ${s.noAct[p]}</span>`;
      if (s.pend[p]) fx += `<span class="good">🩸</span>`;
      if (s.bl && s.bl[p] >= 0) fx += `<span class="good">✨ ${sqName(s.bl[p])}</span>`;
      if (s.decl[p]) fx += `<span class="info">${L('Annonce : {d}', { d: declText(s.decl[p], s) })}</span>`;
      let rv = '', total = 0;
      for (let i = 0; i < E.NT; i++) total += s.res[p][i];
      if (!reserveVisible(p)) rv = total ? `<span class="chip"><span class="n">? × ${total}</span></span>` : '';
      else for (const [cat, lbl] of [['M', L('Dieux')], ['G', L('Gardes')], ['S', L('Soldats')]]) { // réserve rangée : dieux, gardes, soldats
        let row = '';
        for (let i = 0; i < E.NT; i++) {
          const n = s.res[p][i]; if (!n || T[i].cat !== cat) continue;
          const can = placeable.has(i) && s.turn === p, sel = G.sel && G.sel.k === 'place' && G.sel.t === i && s.turn === p;
          row += `<span class="chip ic ${can ? 'click' : ''} ${sel ? 'sel' : ''}" data-res="${p}:${i}" title="${esc(tn(i))}">${token(i, p)}${n > 1 ? `<span class="cnt">${n}</span>` : ''}</span>`;
        }
        if (row) rv += `<div class="rgrp"><span class="rgl">${lbl}</span>${row}</div>`;
      }
      const thinking = !G.over && G.thinking && s.turn === p ? `<span class="thinking">${L('réfléchit…')}</span>` : '';
      el.innerHTML = `<div class="who"><span class="dot"></span><span class="nm">${esc(PN[p])}</span>${thinking}<span class="crys">💎 ${s.mana[p]}</span></div>
        <div class="pips">${s.goal ? '' : `<span>${L('Gardes perdus')}</span>${pips}`}<span>${L('Dieux')}</span>${gods || '–'}</div>
        ${fx ? `<div class="fx">${fx}</div>` : ''}
        <div class="resv">${rv ? `<div class="rvh">${L('Réserve')} · ${total}</div>${rv}` : `<span class="muted">${L('Rien à placer')}</span>`}</div>`;
      el.querySelectorAll('[data-res]').forEach(ch => {
        const [pp, i] = ch.dataset.res.split(':').map(Number);
        ch.addEventListener('mouseenter', () => showInfo(i, pp));
        ch.addEventListener('click', () => {
          showInfo(i, pp);
          if (!humanTurn() || G.s.turn !== pp || !placeable.has(i)) return;
          G.sel = (G.sel && G.sel.k === 'place' && G.sel.t === i) ? null : { k: 'place', t: i };
          sfx('choix'); render();
        });
      });
    }
  }
  function renderPool() {
    const s = G.s, el = $('pool'), hum = humanTurn();
    const recOk = new Set();
    if (hum) for (const a of legal()) if (a.k === 'rec' || a.k === 'draft') recOk.add(a.t);
    $('poolTitle').textContent = s.phase === 'draft' ? (s.ev === 'inverse' ? L('Draft inversé — ce que reçoit l’adversaire') : L('Draft caché')) : L('Réserve commune (recruter)');
    $('btnSheetPool').classList.toggle('glow', recOk.size > 0);
    // un perso qu'aucun des deux camps ne peut recruter (ex. le soldat de la Lumière en partie des Ombres) n'est pas montré
    const seen = i => !s.fac || E.canRec(s, 0, i) || E.canRec(s, 1, i);
    let total = 0; for (let i = 0; i < E.NT; i++) if (seen(i)) total += s.pool[i];
    if (s.phase === 'draft' && s.ev === 'cache') {
      el.innerHTML = `<div class="facedown"><span class="chip"><span class="n">🂠 × ${total}</span></span>${hum ? `<button class="ghost sm" id="btnDraw">${L('Piocher')}</button>` : ''}</div>`;
      if (hum) $('btnDraw').onclick = () => doAction({ k: 'pioche' });
      return;
    }
    if (!total) { el.innerHTML = `<span class="muted">${L('Vide — tout a été recruté.')}</span>`; return; }
    const unl = s.ev === 'illimite';
    let h = '';
    for (const [cat, lbl] of [['M', L('Dieux')], ['G', L('Gardes')], ['S', L('Soldats')]]) {
      let row = '';
      for (let i = 0; i < E.NT; i++) {
        if (T[i].cat !== cat || !s.pool[i] || !seen(i)) continue;
        row += `<span class="chip ic ${recOk.has(i) ? 'click' : (hum ? 'off' : '')}" data-pool="${i}" title="${esc(tn(i))}">${token(i, -1)}<span class="cnt">${unl ? '∞' : s.pool[i]}</span></span>`;
      }
      if (row) h += `<div class="grp">${lbl}</div><div class="row">${row}</div>`;
    }
    el.innerHTML = h;
    el.querySelectorAll('[data-pool]').forEach(ch => {
      const i = +ch.dataset.pool;
      ch.addEventListener('mouseenter', () => showInfo(i, -1));
      ch.addEventListener('click', () => {
        showInfo(i, -1);
        if (!humanTurn()) return;
        const a = legal().find(x => (x.k === 'rec' || x.k === 'draft') && x.t === i);
        if (a) { closeSheet(); doAction(a); }
        else if (G.s.decl[G.s.turn]) { toast(L('Tu dois faire l’action que tu as annoncée.')); sfx('erreur'); }
      });
    });
  }
  function renderHint(v) {
    if (G.replay) return replayHint();
    renderHint0(v);
    const st = guideStep();
    if (st && !G.over) {
      $('hint').innerHTML = `<div class="tutohint">🎓 ${st.t}${st.skip ? ` <button class="ghost sm" id="btnGuideSkip">${L('Passer')}</button>` : ''}</div>` + $('hint').innerHTML;
      if ($('btnGuideSkip')) $('btnGuideSkip').onclick = guideSkip;
    }
  }
  function renderHint0(v) {
    const s = G.s, hint = $('hint'), opts = $('opts');
    let h = '', o = [];
    if (G.over) { h = I18N.why(s.why); o.push(`<button class="main" data-o="bilan">📊 ${L('Bilan')}</button>`, `<button data-o="next">${L('Continuer')}</button>`); if (G.history.length && canBack()) o.push(`<button data-o="undo">↶ ${L('Annuler le dernier coup')}</button>`); }
    else if (!humanTurn()) h = L('{p} réfléchit…', { p: esc(PN[s.turn]) });
    else if (s.phase === 'draft') {
      h = s.ev === 'inverse' ? L('Draft inversé : choisis dans la réserve commune un perso… qui ira à ton adversaire !') : L('Draft caché : pioche une pièce face cachée.');
      if (s.ev === 'cache') o.push(`<button class="main" data-o="draw">${L('Piocher')}</button>`); else o.push(`<button class="main" data-o="pool">${L('Ouvrir la réserve')}</button>`);
    } else if (s.phase === 'decl') {
      h = L('Annonce ta prochaine action : recruter, placer, ou touche un de tes persos pour annoncer que tu l’activeras.');
      o.push(`<button data-o="decl:rec">${L('Annoncer : recruter')}</button>`, `<button data-o="decl:pla">${L('Annoncer : placer')}</button>`);
    } else if (G.sel && G.sel.k === 'place') {
      h = L('Touche une case encadrée de ta couleur pour y poser <b>{x}</b>.', { x: tn(G.sel.t) }) + (s.ev === 'noir' ? ' ' + L('Les cases vertes (noires) sont gratuites.') : '');
      o.push(`<button data-o="cancel">${L('Annuler')}</button>`);
    } else if (G.sel) {
      const ti = E.tix(s.b[G.sel.from]), t = T[ti];
      h = `<b>${tn(ti)}</b> : ${td(ti)}<br><small class="muted">${L('Touche une case qui brille pour choisir où il agit, ou « Annuler ».')}</small>`;
      for (const x of v.strs) {
        if (x[0] === 'r' || x[0] === 'v') { const i = +x.slice(1); o.push(`<button data-o="s:${x}">${token(i, x[0] === 'v' ? s.turn : -1)} ${x[0] === 'v' ? L('Ranimer') + ' ' : ''}${tn(i)}</button>`); }
        else if (x === 'go') o.push(`<button class="main" data-o="s:go"${mid(t.id) === 'g6' ? ' data-zone="adj"' : ''}>${L('Activer {x}', { x: tn(ti) })}</button>`);
        else o.push(`<button class="main" data-o="s:${x}" data-zone="${x}">${mid(t.id) === 'pb' ? '🌋' : '⚡'} ${x === 'centre' ? L('Le centre') : (mid(t.id) === 'pb' ? L('2e ligne') : L('Bord')) + ' ' + SIDE[x]}</button>`);
      }
      if (v.complete) o.push(`<button class="main" data-o="finish">${L('Valider (s’arrêter là)')}</button>`);
      o.push(`<button data-o="cancel">${L('Annuler')}</button>`);
    } else {
      const L2 = legal(), d = s.decl[s.turn];
      h = L('À toi ! Fais <b>une seule</b> de ces choses : <b>➕ recruter</b> un perso de la réserve commune, <b>poser</b> un perso de ta réserve sur la carte, ou <b>toucher un de tes persos</b> sur la carte pour le faire agir.');
      if (d && L2.some(a => a.k !== 'pass')) h = L('Tu as annoncé : <b>{d}</b>. Tu dois le faire.', { d: declText(d, s) });
      if (s.acts > 1) h += ` <b>(${L('{n} actions restantes', { n: s.acts })})</b>`;
      if (s.bonusRec && s.acts === 1) h = L('Action bonus : comme tu joues en second, tu recrutes un perso de plus.');
      if (L2.some(a => a.k === 'rec')) o.push(`<button class="pooltab" data-o="pool">➕ ${L('Recruter')}</button>`);
      if (L2.length === 1 && L2[0].k === 'pass') { // rien à faire : le tour passe tout seul (on ne peut pas passer exprès)
        h = L('Aucune action possible : ton tour passe tout seul.');
        const ply = s.ply, id = G.id;
        setTimeout(() => { if (G && G.id === id && G.s.ply === ply && humanTurn() && legal().length === 1) doAction({ k: 'pass' }); }, 1200);
      }
    }
    if (!G.over && humanTurn() && G.botTurn && G.botTurn.done && G.botTurn.lines.length) h = `<div class="botlast">🤖 ${G.botTurn.lines.join(' · ')} <button class="ghost sm" id="btnPeek">↺ ${L('Revoir son coup')}</button></div>` + h;
    hint.innerHTML = h;
    if ($('btnPeek')) $('btnPeek').onclick = peekBot;
    opts.innerHTML = o.join('');
    opts.querySelectorAll('button').forEach(b => {
      const k = b.dataset.o;
      b.onclick = () => {
        if (k === 'next') return endNext();
        if (k === 'bilan') { renderBilan('err'); $('endModal').hidden = false; sfx('page'); return; }
        if (k === 'undo') return undo();
        if (k === 'pool') return openSheet('pool');
        if (k === 'cancel') { G.sel = null; sfx('annule'); return render(); }
        if (k === 'pass') return doAction({ k: 'pass' });
        if (k === 'draw') return doAction({ k: 'pioche' });
        if (k === 'finish') return doAction(selView().complete);
        if (k.startsWith('decl:')) return doAction(legal().find(a => a.k === 'decl' && a.d.k === k.slice(5)));
        if (k.startsWith('s:')) { G.sel.pre.push(k.slice(2)); return stepSel(); }
      };
      const z = b.dataset.zone;
      if (z) {
        const g = G.s.g, id = T[E.tix(G.s.b[G.sel.from])].id;
        const zone = z === 'adj' ? [0, 1, 2, 3, 4, 5, 6, 7].map(d => g.mv[d * g.N + G.sel.from]).filter(x => x >= 0) : E.areaOf(g, id, z);
        b.onmouseenter = () => zone.forEach(q => sqEls[q].classList.add('zone'));
        b.onmouseleave = () => sqEls.forEach(e => e.classList.remove('zone'));
      }
    });
  }
  function showInfo(i, o, q) {
    const t = T[i];
    const who = o === 0 || o === 1 ? ' · ' + esc(PN[o]) : ' · ' + L('réserve commune');
    $('infoCard').innerHTML = `<div class="ihead">${token(i, o)}<div><div class="iname">${tn(i)}</div><div class="icat">${catName(t.cat)}${who}${t.cost ? ` · <span class="icost">💎 ${t.cost}</span>` : ''}</div></div></div>
      <div class="ibody"><div class="idesc">${td(i)}</div>${t.cat === 'G' || t.cat === 'S' ? (NODIAG[t.id] ? '' : `<div class="idiag">${moveDiagram(t.id)}<small>${L('vert : où il peut aller · rouge : qui il peut tuer')}</small></div>`) : ''}</div>${q !== undefined ? specLine(q) : ''}`;
  }
  function specLine(q) { const k = G && G.s.g.spec[q]; return k ? `<div class="specline">${k === 3 ? currentSvg(G.s.g.cdir ? G.s.g.cdir[q] : 4) : SPEC_SVG[k]}<span><b>${I18N.specName(k)}</b> : ${I18N.specDesc(k)}</span></div>` : ''; }
  function showSpec(q) { if (G && G.s.g.spec[q]) $('infoCard').innerHTML = specLine(q); }

  // ---------- panneau du bas sur petits écrans (réserve, infos, journal) ----------
  let sheet = '';
  function openSheet(k) {
    if (window.matchMedia('(min-width: 900px) and (min-aspect-ratio: 1/1) and (min-height: 561px)').matches) { if (k === 'pool') $('poolCard').classList.add('flash'); setTimeout(() => $('poolCard').classList.remove('flash'), 700); return; }
    sheet = sheet === k ? '' : k;
    document.body.dataset.sheet = sheet;
  }
  function closeSheet() { sheet = ''; document.body.dataset.sheet = ''; }
  $('btnSheetPool').onclick = () => openSheet('pool');
  $('btnSheetInfo').onclick = () => openSheet('info');
  $('btnSheetLog').onclick = () => openSheet('log');
  $('sheetClose').onclick = closeSheet;

  // =====================================================================
  //  Raccourcis clavier
  // =====================================================================
  function modalOpen() { return ['codexModal', 'setModal', 'evoModal', 'tutoModal', 'endModal', 'statsModal', 'achModal', 'replayModal'].find(id => !$(id).hidden); }
  document.addEventListener('keydown', e => {
    if (e.target.matches && e.target.matches('input, textarea, select')) return;
    const k = e.key, m = modalOpen();
    if (G && G.view && !m) {
      if (k === 'Escape') { e.preventDefault(); return closeMoment(); }
      if (k === 'ArrowLeft') return momentStep(-1);
      if (k === 'ArrowRight') return momentStep(1);
      return;
    }
    if (k === 'Escape') {
      if (m === 'codexModal') return closeCodex();
      if (m === 'setModal') return closeSettings();
      if (m === 'statsModal') return closeStats();
      if (m === 'achModal') return closeAch();
      if (m === 'replayModal') return closeReplays();
      if (m === 'tutoModal') return closeTuto();
      if (m === 'endModal') { $('endModal').hidden = true; return; }
      if (sheet) return closeSheet();
      if (G && G.sel) { G.sel = null; sfx('annule'); render(); }
      return;
    }
    if (k !== 'ArrowLeft' && k !== 'ArrowRight') return;
    const d = k === 'ArrowRight' ? 1 : -1;
    if (m === 'endModal') { renderBilan(bilanTab === 'err' ? 'num' : 'err'); sfx('page'); return; }
    if (m === 'tutoModal') return tutoStep(d);
    if (m === 'codexModal') return codexPage(d);
    if (m === 'statsModal') return statsPage(d);
    if (m === 'achModal') return achPage(d);
    if (m === 'replayModal') return rpPage(d);
    if (!m && G && G.replay && $('game').classList.contains('on')) replayCtl(d > 0 ? 'next' : 'prev');
  });

  // =====================================================================
  //  Codex (pages, sans défilement)
  // =====================================================================
  const CTABS = () => [['regles', L('📜 Règles')], ['dieux', L('⬢ Dieux')], ['gardes', L('🛡️ Gardes')], ['autres', L('👹 Soldat & boss')], ['evenements', L('🎲 Événements')], ['cartes', L('🗺️ Cartes')],
    ['decors', L('🌲 Décors')], ['bots', L('🤖 Bots')], ['progression', L('📈 Progression')]];
  let codexTab = 'regles', codexPg = 0, codexPages = 1;
  const DIAG_W = 7, DIAG_C = 24;
  function moveDiagram(id0) {
    const id = mid(id0);
    const ex = new Uint8Array(DIAG_W * DIAG_W).fill(1), z = []; for (let c = 0; c < DIAG_W; c++) z.push(42 + c);
    const g = E.buildGeo(DIAG_W, DIAG_W, ex, z, 'codex');
    const s = E.newGame({ map: g, gods: [], gards: [] });
    s.mana = [999, 999];
    s.b[DIAG_C] = E.enc(E.TI[id0], 0);
    for (const q of [3, 8, 13, 21, 31, 38, 46]) s.b[q] = E.enc(E.TI.s, 1);
    for (const q of [36, 15]) s.b[q] = E.enc(E.TI.s, 0);
    const cls = new Array(49).fill('');
    if (id === 'ma') { for (const q of E.areaOf(g, 'ma', 'haut')) cls[q] = 'zone'; for (const q of g.center) cls[q] = 'zone'; }
    else if (id === 'pb') { for (const q of E.areaOf(g, 'pb', 'haut')) cls[q] = 'zone'; }
    else if (id === 'g6') { for (let d = 0; d < 8; d++) { const q = g.mv[d * g.N + DIAG_C]; if (q >= 0) cls[q] = 'zone'; } }
    else if (id === 'lc') { for (const d of [1, 3, 4, 6]) { let q = DIAG_C; for (let k = 0; k < 4; k++) { q = g.mv[d * g.N + q]; if (q < 0) break; cls[q] = 'zone'; } } }
    else for (const cl of E.genAct(s, DIAG_C, true)) cl.forEach((x, k) => {
      if (typeof x !== 'number') return;
      const c = s.b[x];
      const v = c > 0 && E.own(c) === 1 && !['mc', 'mb', 'g1'].includes(id) ? 'hit' : c > 0 ? 'ally' : (k === 0 ? 'reach' : 'reach2');
      if (!cls[x] || v === 'hit' || (v === 'reach' && cls[x] === 'reach2')) cls[x] = v;
    });
    let h = `<div class="diag">`;
    for (let q = 0; q < 49; q++) { const c = s.b[q], light = (((q / DIAG_W) | 0) + q % DIAG_W) % 2 === 0; h += `<i class="${light ? 'l' : ''} ${cls[q]}">${q === DIAG_C ? token(E.tix(c), 0) : c > 0 ? `<b class="${E.own(c) ? 'en' : 'al'}"></b>` : ''}</i>`; }
    return h + '</div>';
  }
  const NODIAG = { mb: 1, mc: 1, md: 1, me: 1, pa: 1, pc: 1, pd: 1, pe: 1, pf: 1, pg: 1, gu: 1, dr: 1, pr: 1, c6: 1, pv: 1, sr: 1, om: 1, of: 1, oe: 1, ou: 1, ob: 1 }; E.BOSSES.concat(E.BOSSES_DLC, E.SH_BOSSES, ['bx']).forEach(b => NODIAG[b] = 1); E.SH_M.forEach(x => NODIAG[x] = 1);
  function pieceCards(ids) {
    const r = cur >= 0 ? run() : null;
    return ids.map(id => {
      const i = E.TI[id], t = T[i];
      if (!SEEN.has(id)) { const ex = EXPLOITS.find(x => x.piece === id); return `<div class="ccard locked"><span class="cic">❔</span><div class="txt"><b>???</b> <span class="tag2">${catName(t.cat)}</span>${ex ? `<span class="tag2 gold">🏅 ${exploitText(ex.id)}</span>` : ''}<p>${L('À découvrir : tu le verras en jouant.')}</p></div></div>`; }
      const inRun = r ? (r.gods.includes(id) || r.gards.includes(id) || id === 's') : null;
      const start = E.START_M.includes(id) || E.START_G.includes(id) || E.SH_START_M.includes(id) || E.SH_START_G.includes(id) || id === 's' || id === 'os';
      const dlcTag = T[i].dlc ? ` <span class="tag2 dlc">🌊 ${L('Les Abysses')}</span>` : T[i].fac || E.SH_BOSSES.includes(id) ? ` <span class="tag2 dlc">🌑 ${L('Les Ombres')}</span>` : E.BOSSES_DLC.includes(id) || id === 'bx' ? ` <span class="tag2 dlc">🌊 ${L('Les Abysses')}</span>` : '';
      const ex = EXPLOITS.find(x => x.piece === id);
      return `<div class="ccard">${token(i, t.cat === 'B' || id === 'mi' ? 1 : 0)}<div class="txt"><b>${tn(i)}</b>${t.cost ? ` <span class="cost">💎 ${t.cost}</span>` : ''}
        ${start ? `<span class="tag2">${L('de départ')}</span>` : ''}${dlcTag}${r && inRun ? `<span class="tag2 on">${L('dans ta partie')}</span>` : ''}${ex ? `<span class="tag2 gold">🏅 ${exploitText(ex.id)}</span>` : ''}
        <p>${td(i)}</p></div>${NODIAG[id] ? '' : moveDiagram(id)}</div>`;
    });
  }
  function mapPreview(g) {
    let h = `<div class="mapprev" style="grid-template-columns:repeat(${g.W},1fr);width:${g.W * 9}px">`;
    for (let q = 0; q < g.N; q++) h += `<i class="${!g.ex[q] ? 'v' : g.zone[0][q] ? 'z0' : g.zone[1][q] ? 'z1' : g.spec[q] ? 's' + g.spec[q] : ''}"></i>`;
    return h + '</div>';
  }
  function exampleMap(kind) {
    for (let i = 0; i < 80; i++) { const g = E.makeMap(kind === 'classique' ? 'classique' : 'aleatoire', kind === 'classique' ? 0 : 4); if (g.info && g.info.kinds.length === 1 && g.info.kinds[0] === kind) return g; }
    return null;
  }
  const card = (ic, title, txt, extra) => `<div class="ccard">${ic ? `<span class="cic">${ic}</span>` : ''}<div class="txt"><b>${title}</b>${extra || ''}<p>${txt}</p></div></div>`;
  const textBlock = h => `<div class="tblock">${h}</div>`;
  // chaque onglet = une liste de blocs ; on les répartit en pages selon la place
  function codexBlocks(tab) {
    if (tab === 'regles') return rulesBlocks();
    const head = (ic, t, ids) => `<div class="cxhead ${ic === '🌑' ? 'sh' : 'li'}">${ic} ${t}${ids ? ` <small>· ${L('{n}/{t} découverts', { n: ids.filter(x => SEEN.has(x)).length, t: ids.length })}</small>` : ''}</div>`;
    if (tab === 'dieux') return [head('☀️', L('Dieux de la Lumière'), allM())].concat(pieceCards(allM()), [head('🌑', L('Dieux des Ombres'), E.SH_M)], pieceCards(E.SH_M));
    if (tab === 'gardes') return [head('☀️', L('Gardes de la Lumière'), allG())].concat(pieceCards(allG()), [head('🌑', L('Gardes des Ombres'), E.SH_G)], pieceCards(E.SH_G));
    if (tab === 'autres') return [head('☀️', L('Soldat de la Lumière'))].concat(pieceCards(['s']), [head('🌑', L('Soldat des Ombres'))], pieceCards(['os']),
      [textBlock(`<h3>${L('Boss')}</h3><p>${L('Tous les 10 affrontements, un boss t’attend avec ses sbires. Chaque coup lui retire un point de vie ; tue-le pour gagner.')}</p>`)], pieceCards(bossList().concat(dlcOn('abysses') ? ['bx'] : [], ['mi', 'ab'])),
      [textBlock(`<h3>☀️ ${L('Les boss de la Lumière')}</h3><p>${L('Dans une partie des Ombres, ce sont eux que tu affrontes en premier, à la place des boss habituels.')}</p>`)], pieceCards(E.SH_BOSSES));
    if (tab === 'evenements') return E.EVENTS.map(e => card('🎲', I18N.evName(e.id), I18N.evDesc(e.id), e.weight ? ` <span class="tag2 on">${L('plus fréquent')}</span>` : ''))
      .concat([textBlock(`<h3>${L('Objectifs mystère')}</h3><p class="muted">${L('Pour tous les objectifs : au bout de 60 tours chacun (30 pour l’Endurance), celui qui a perdu le moins de persos gagne.')}</p>`)])
      .concat(E.GOALS.map(gl => card('🎯', I18N.goalName(gl.id), I18N.goalDesc(gl.id))));
    if (tab === 'cartes') return E.MAPS.map(([id, , lv]) => { const g = exampleMap(id); return `<div class="ccard"><div class="txt"><b>${I18N.mapKind(id)}</b> <span class="tag2">${L('niveau {n}', { n: lv })}</span><p>${I18N.mapKindDesc(id)}</p></div>${g ? mapPreview(g) : ''}</div>`; })
      .concat([1, 2].concat(dlcOn('abysses') ? [3] : [], dlcOn('ombres') ? [4, 5, 6] : []).map(k => card(k === 3 ? currentSvg(4) : SPEC_SVG[k], I18N.specName(k), I18N.specDesc(k), ` <span class="tag2">${L('case spéciale')}</span>`)))
      .concat([textBlock(`<h3>${L('Niveaux de sauvagerie')}</h3><ul>${[0, 1, 2, 3, 4].map(n => `<li><b>${L('Niveau {n}', { n })}</b> : ${I18N.mapLevel(n)}</li>`).join('')}</ul>`)]);
    if (tab === 'decors') return themeList().map(t => `<div class="ccard"><div class="txt"><b>${I18N.themeName(t)}</b>${t === theme ? ` <span class="tag2 on">${L('en ce moment')}</span>` : ''}<div class="themeprev" data-theme="${t}"></div></div></div>`);
    if (tab === 'bots') return [textBlock(`<p>${L('Dans tes parties, tu affrontes toujours le bot stratège. Pour que ce soit jouable, il a des désavantages (ton avantage, de 0 à 6) : un de moins à chaque victoire (deux en difficile), un de plus à chaque défaite. Les autres bots servent aux duels et aux défis.')}</p>`)].concat(['facile', 'normal', 'impossible'].map(lv => card(LEVELIC[lv], levelName(lv), ({ facile: L('Joue souvent au hasard et rate des prises. Parfait pour apprendre.'), normal: L('Regarde 2 coups à l’avance, voit les menaces immédiates.'), impossible: L('Le plus fort : il calcule plusieurs coups à l’avance et lit les menaces, en environ 1,5 seconde. Il n’a aucun avantage, et on peut le battre, même en difficile.') })[lv])))
      .concat([textBlock(`<h3>${L('Caractères')}</h3><p class="muted">${L('À chaque affrontement, le bot reçoit un caractère tiré au hasard. Il change sa façon de jouer, pas sa force.')}</p>`)])
      .concat(Object.keys(E.PERSOS).map(id => card('🎭', I18N.persoName(id), I18N.persoDesc(id))))
      .concat([cercleBlock()]);
    if (tab === 'progression') return [
      textBlock(`<p>${L('Avant chaque affrontement, tu choisis : <b>normal</b> ou <b>difficile</b> (avec 2 handicaps tirés au hasard).')} ${L('Après chaque victoire, tu choisis ce qui avance : un garde ou un dieu, puis la carte ou les événements.')}</p>
        <ul><li><b>${L('Nouveau garde')}</b> : ${L('{a} points : un garde tiré au hasard parmi ceux à découvrir.', { a: need('gard') })}</li>
        <li><b>${L('Nouveau dieu')}</b> : ${L('{a} points : un dieu tiré au hasard parmi ceux à découvrir.', { a: need('god') })}</li>
        <li><b>${L('Carte plus sauvage')}</b> : ${L('{a} points par niveau (niveau 0 à 4).', { a: TRACKS.map })}</li>
        <li><b>${L('Plus d’événements')}</b> : ${L('+25 % tous les {a} points.', { a: TRACKS.ev })}</li>
        <li><b>${L('Points')}</b> : ${L('victoire normale +1, victoire difficile +2, défaite +½ sur tes derniers choix. Quand il ne reste qu’une barre dans un groupe, elle avance toute seule.')}</li></ul>`),
      cercleBlock(),
      textBlock(`<h3>${L('Boss')}</h3><p>${L('Tous les 10 affrontements, un boss t’attend avec ses sbires. Chaque coup lui retire un point de vie ; tue-le pour gagner.')} ${L('Récompense : un perso tiré au hasard parmi tous ceux à découvrir.')}</p>`),
      textBlock(`<h3>${L('Exploits')}</h3><p class="muted">${L('Ces persos ne se débloquent que par un exploit :')}</p><ul>${EXPLOITS.map(x => `<li><b>${tn(E.TI[x.piece])}</b> : ${exploitText(x.id)}</li>`).join('')}</ul>`),
      textBlock(`<h3>${L('Défi du jour et talents')}</h3><p>${L('Chaque jour, la même carte, la même réserve et le même objectif pour tout le monde. Ton meilleur score du jour s’ajoute à tes points de défi du jour, qui débloquent des talents pour toujours :')}</p><ul>${TALENTS.map(t => `<li class="${dailyData().total >= t.pts ? 'ok' : ''}"><b>${t.pts} ${L('pts')}</b> : ${talentName(t.id)}</li>`).join('')}</ul>`),
      textBlock(`<h3>${L('Handicaps possibles')}</h3><ul>${HARD.map(h => `<li>${hardName(h)}</li>`).join('')}</ul>${dlcOn('ombres') ? `<h3>🌑 ${L('Handicaps des parties des Ombres')}</h3><ul>${SH_HARD.map(h => `<li>${hardName(h)}</li>`).join('')}</ul>` : ''}`),
    ];
    return [];
  }
  function cercleBlock() {
    return textBlock(`<h3>${L('Cercles')}</h3><p>${L('Le bot joue toujours au mieux, mais il a des désavantages qui suivent ton niveau : un de moins à chaque victoire (deux en difficile), un de plus à chaque défaite. Quand tu as tout débloqué, tu montes au Cercle suivant : tout recommence, avec moins d’avantage puis des fardeaux.')}</p>
      <ul>${FARDEAUX.map((f, i) => `<li><b>${cercleLabel(i + 3)}</b> : ${fardeauText(f, i + 3)}</li>`).join('')}<li>${L('Ensuite, chaque Cercle donne 1 point de vie de plus aux boss (3 de plus au maximum, pour qu’ils restent battables).')}</li></ul>
      <p class="muted">${L('Plus haut Cercle atteint : {n}', { n: cercleMax() })}</p>`);
  }
  function rulesBlocks() {
    return [
      textBlock(`<ul>
        <li>${L('<b>Une partie</b> est une suite d’<b>affrontements</b> contre un bot dont tu choisis l’intelligence. Le temps est infini.')}</li>
        <li>${L('Au début : <b>3 dieux et 4 sortes de gardes</b> dans la réserve, le plateau classique, aucun événement. Tes victoires débloquent le reste (voir Progression).')}</li>
        <li>${L('Chaque joueur commence avec <b>100 mana</b>. Les dieux dépensent du mana pour lancer leur sort.')}</li>
        <li>${L('À ton tour, <b>une seule action</b> : <b>recruter</b> 1 perso de la réserve commune, <b>placer</b> 1 perso recruté dans ta zone de placement, ou <b>activer</b> 1 de tes persos sur la carte.')}</li></ul>`),
      textBlock(`<ul><li>${L('<b>But</b> : tuer <b>tous les dieux</b> adverses, ou <b>4 gardes</b> adverses (sauf avec l’Objectif mystère).')}</li>
        <li>${L('Seuls les <b>soldats</b> ont un sens : ils avancent vers l’adversaire. Les gardes vont dans tous les sens ; les dieux ne bougent pas.')}</li>
        <li>${L('On prend un ennemi en arrivant sur sa case. Les sorts de zone ne tuent que des ennemis.')}</li>
        <li>${L('Celui qui commence est <b>tiré au sort</b> ; l’autre recrute un perso de plus à son premier tour. Tu peux <b>annuler ton dernier coup</b> avec ↶. Après la fin, revenir en arrière sert à t’entraîner : le vrai résultat est gardé.')}</li></ul>`),
      textBlock(`<p class="interp">${L('Précisions : « tous les dieux » = l’adversaire a perdu au moins 1 dieu et il ne lui en reste aucun (ni sur la carte, ni à placer) — un dieu jamais recruté ne peut pas mourir. Les trous de la carte sont infranchissables ; un perso poussé dedans meurt. Partie trop longue (200 coups, ou 150 coups sans aucune mort) : le plus de persos vivants gagne, puis le plus de mana, sinon le bot.')}</p>`),
      textBlock(`<h3>${L('Comment jouer')}</h3><ul>
        <li>${L('<b>Recruter</b> : ouvre la réserve commune (bouton ➕ Recruter ou touche R) et clique un perso.')}</li>
        <li>${L('<b>Placer</b> : clique un perso de ta liste « À placer », puis une case de ta zone.')}</li>
        <li>${L('<b>Activer</b> : clique ton perso sur la carte, puis les cases en surbrillance (vert = déplacement, rouge = attaque, bleu pointillé = choix d’un perso). Les sorts de zone ont des boutons sous la carte (survole-les pour voir la zone).')}</li>
        <li>${L('Touche un perso ou une case spéciale pour voir ce qu’il fait.')}</li></ul>`),,
      ...(dlcOn('ombres') ? [textBlock(`<h3>🌑 ${L('Le Clan des Ombres')}</h3><p>${L('Une 2e armée, à choisir à la place de la Lumière. Dans une partie des Ombres, l’adversaire joue aussi les Ombres. Tous ses persos ont des pouvoirs à eux. Ils se cachent dans le noir : un garde ou un soldat ennemi ne peut pas les prendre à plus de 4 cases. Elle gagne aussi avec 3 persos dans la zone de placement adverse.')}</p><p>${L('Face à la Lumière, l’armée des Ombres ne perd qu’après 5 gardes tués (au lieu de 4), mais son invasion demande 4 persos (au lieu de 3).')}</p>`)] : [])
    ];
  }
  const previews = [];
  // pagination : on range les blocs en colonnes, page après page, sans jamais dépasser la hauteur (aucun défilement)
  function paginate(body, blocks, minW, pgWanted, maxCols, seq) {
    const gap = 10, W = body.clientWidth, H = body.clientHeight - 4;
    const N = Math.max(1, Math.min(maxCols || 3, Math.floor((W + gap) / (minW + gap)))), colW = (W - gap * (N - 1)) / N;
    body.innerHTML = `<div style="width:${colW}px">${blocks.map(b => `<div class="cb">${b}</div>`).join('')}</div>`;
    const hs = [...body.querySelectorAll('.cb')].map(e => e.offsetHeight);
    const pages = [];
    let pg = null;
    // un titre de section (Lumière / Ombres) commence une nouvelle page, en bande sur toute la largeur, répétée sur les pages suivantes
    let head = -1;
    const newPage = () => { pg = { cols: Array.from({ length: N }, () => []), h: new Array(N).fill(head >= 0 ? hs[head] + gap : 0), last: 0, head }; pages.push(pg); };
    blocks.forEach((b, i) => {
      if (b.startsWith('<div class="cxhead')) { head = i; newPage(); return; }
      if (pg) {
        let best = -1;
        for (let c = 0; c < N; c++) if (pg.h[c] + (pg.h[c] ? gap : 0) + hs[i] <= H && (best < 0 || pg.h[c] < pg.h[best])) best = c;
        if (seq) { best = -1; for (let c = pg.last; c < N; c++) if (pg.h[c] + (pg.h[c] ? gap : 0) + hs[i] <= H) { best = c; pg.last = c; break; } } // lecture colonne par colonne
        if (best >= 0) { pg.cols[best].push(i); pg.h[best] += (pg.h[best] ? gap : 0) + hs[i]; return; }
      }
      newPage();
      pg.h[0] += hs[i]; pg.cols[0].push(i);
    });
    const n = Math.max(1, pages.length), k = Math.min(pgWanted, n - 1), P = pages[k];
    body.innerHTML = P ? (P.head >= 0 ? blocks[P.head] : '') + `<div class="cpage">${P.cols.map(c => `<div class="ccol">${c.map(i => `<div class="cb">${blocks[i]}</div>`).join('')}</div>`).join('')}</div>` : '';
    return { pages: n, pg: k };
  }
  function pagerHtml(el, pg, pages, go) {
    el.innerHTML = pages > 1 ? `<button class="ghost sm" data-pg="-1" ${pg ? '' : 'disabled'}>◀</button><span>${pg + 1} / ${pages}</span><button class="ghost sm" data-pg="1" ${pg < pages - 1 ? '' : 'disabled'}>▶</button>` : '';
    el.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => go(+b.dataset.pg));
  }
  function renderCodex() {
    $('codexTabs').innerHTML = CTABS().map(([k, l]) => `<button data-tab="${k}" class="${k === codexTab ? 'sel' : ''}">${l}</button>`).join('');
    $('codexTabs').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { codexTab = b.dataset.tab; codexPg = 0; sfx('page'); renderCodex(); });
    while (previews.length) previews.pop().stop();
    const body = $('codexBody'), isText = codexTab === 'regles' || codexTab === 'progression';
    const r = paginate(body, codexBlocks(codexTab), isText ? 400 : 330, codexPg, isText ? 2 : 3, ['dieux', 'gardes', 'autres'].includes(codexTab));
    codexPages = r.pages; codexPg = r.pg;
    pagerHtml($('codexPager'), codexPg, codexPages, codexPage);
    body.querySelectorAll('[data-theme]').forEach(el => { const d = Decor.create(); d.scene(el, 7 + Decor.THEME_IDS.indexOf(el.dataset.theme), el.dataset.theme); d.stop(); previews.push(d); });
  }
  function codexPage(d) { const n = codexPg + d; if (n < 0 || n >= codexPages) return; codexPg = n; sfx('page'); renderCodex(); }
  function openCodex(tab) { if (tab) { codexTab = tab; codexPg = 0; } $('codexModal').hidden = false; renderCodex(); sfx('page'); }
  function closeCodex() { $('codexModal').hidden = true; while (previews.length) previews.pop().stop(); sfx('page'); }
  $('btnCodex').onclick = () => openCodex();
  $('btnCodexMenu').onclick = () => { const c = cur; cur = -1; openCodex(); cur = c; };
  $('codexModal').addEventListener('click', e => { if (e.target === $('codexModal') || e.target.hasAttribute('data-close')) closeCodex(); });

  // =====================================================================
  //  Duel : contre un bot, à deux sur le même écran, ou en ligne contre un ami
  // =====================================================================
  const DUEL = Object.assign({ opp: 'normal', res: 'start', map: '0', ev: 'none', boss: 'non', mana: 100, first: 'rnd', fac: '0', ofac: '0', cur: 'non' }, lsGet('duel', {}));
  function duelSeg(key, opts) { return `<div class="seg" data-duel="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(DUEL[key]) === String(v) ? 'sel' : ''}">${l}</button>`).join('')}</div>`; }
  function renderDuel() {
    const online = DUEL.opp === 'net';
    $('duelBox').innerHTML = `<h2 class="title">⚔️ ${L('Duel')}</h2><p class="muted center">${L('Un affrontement libre, avec tes réglages. Il ne compte pas pour tes parties, mais tes persos gagnent leurs points.')}</p>
      <div class="dopts">
        <div class="dopt"><b>${L('Adversaire')}</b>${duelSeg('opp', [['facile', '🌱 ' + L('Bot facile')], ['normal', '⚔️ ' + L('Bot normal')], ['impossible', '🧠 ' + L('Bot stratège')], ['deux', '👥 ' + L('À deux (même écran)')], ['net', '🌐 ' + L('En ligne')]])}</div>
        ${dlcOn('ombres') ? `<div class="dopt"><b>${L('Ton armée')}</b>${duelSeg('fac', [['0', '☀️ ' + L('Lumière')], ['1', '🌑 ' + L('Ombres')]])}</div>
        <div class="dopt"><b>${L('Armée adverse')}</b>${duelSeg('ofac', [['0', '☀️ ' + L('Lumière')], ['1', '🌑 ' + L('Ombres')]])}</div>` : ''}
        <div class="dopt"><b>${L('Persos')}</b>${duelSeg('res', [['start', L('Ceux du départ')], ['rnd', L('Au hasard')], ['all', L('Tous')]])}</div>
        <div class="dopt"><b>${L('Carte')}</b>${duelSeg('map', [['0', L('Classique')], ['1', L('Niveau {n}', { n: 1 })], ['2', L('Niveau {n}', { n: 2 })], ['3', L('Niveau {n}', { n: 3 })], ['4', L('Niveau {n}', { n: 4 })], ['rnd', L('Au hasard')]])}</div>
        ${dlcOn('abysses') ? `<div class="dopt"><b>${L('Courants')}</b>${duelSeg('cur', [['non', L('Non')], ['oui', L('Oui')]])}</div>` : ''}
        <div class="dopt"><b>${L('Événement')}</b>${duelSeg('ev', [['none', L('Aucun')], ['rnd', L('Au hasard')], ['objectif', I18N.evName('objectif')]])}</div>
        <div class="dopt"><b>${L('Boss')}</b>${duelSeg('boss', [['non', L('Non')], ['oui', L('Oui (au hasard, dans le camp adverse)')]])}</div>
        <div class="dopt"><b>${L('Mana de départ')}</b>${duelSeg('mana', [[100, '100'], [150, '150'], [200, '200']])}</div>
      </div>
      ${online ? `<div class="netbox"><button class="big" id="btnHost">${L('Créer une salle')}</button><span class="or">${L('ou')}</span><input id="joinCode" maxlength="4" placeholder="${L('Code')}"><button class="ghost" id="btnJoin">${L('Rejoindre')}</button></div><p class="center" id="netStatus">${L('Le joueur qui crée la salle choisit les réglages.')}</p>`
        : `<div class="menu-actions"><button class="big" id="btnDuelGo">${L('Commencer le duel')}</button></div>`}
      <div class="menu-actions"><button class="ghost" id="btnDuelBack">${L('Retour')}</button></div>`;
    $('duelBox').querySelectorAll('[data-duel]').forEach(seg => seg.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      let v = b.dataset.v; if (seg.dataset.duel === 'mana') v = +v;
      DUEL[seg.dataset.duel] = v; lsSet('duel', DUEL); if (seg.dataset.duel === 'opp') netClose(); renderDuel();
    });
    if ($('btnDuelGo')) $('btnDuelGo').onclick = () => startDuel(null);
    if ($('btnHost')) $('btnHost').onclick = hostRoom;
    if ($('btnJoin')) $('btnJoin').onclick = () => joinRoom($('joinCode').value);
    if ($('joinCode')) $('joinCode').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') joinRoom($('joinCode').value); };
    $('btnDuelBack').onclick = () => { netClose(); renderMenu(); show('menu'); };
  }
  function openDuel() { cur = -1; myCercle = 0; renderDuel(); show('duel'); }
  // prépare un duel ; en ligne, guestName = nom de l'ami qui a rejoint
  function startDuel(guestName) {
    const o = DUEL, bot = ['facile', 'normal', 'impossible'].includes(o.opp), online = o.opp === 'net';
    const gods = o.res === 'all' ? allM() : o.res === 'rnd' ? shuffle(allM()).slice(0, 5) : E.START_M.slice();
    const gards = o.res === 'all' ? allG() : o.res === 'rnd' ? shuffle(allG()).slice(0, 7) : E.START_G.slice();
    const shM = o.res === 'all' ? E.SH_M : o.res === 'rnd' ? shadowOf(gods) : E.SH_START_M, shG = o.res === 'all' ? E.SH_G : o.res === 'rnd' ? shadowOf(gards) : E.SH_START_G;
    const myF = dlcOn('ombres') ? +o.fac : 0, opF = dlcOn('ombres') ? +o.ofac : 0, cur2 = dlcOn('abysses') && o.cur === 'oui';
    const mapLv = o.map === 'rnd' ? rnd(5) : +o.map;
    let ev = o.ev === 'rnd' ? pickEvent() : o.ev === 'objectif' ? 'objectif' : null;
    if (online || (dlcOn('ombres') && (+o.fac || +o.ofac))) while (ev === 'cache' || ev === 'pari' || ev === 'inverse') ev = pickEvent(); // pas de draft avec les Ombres // en ligne : pas de pioche au hasard ni de pari
    const first = rnd(2); // toujours tiré au sort
    const dmap = E.makeMap(mapLv === 0 && !cur2 ? 'classique' : 'aleatoire', Math.max(mapLv, cur2 ? 2 : 0), cur2);
    if (myF || opF) E.addShadowSpecs(dmap);
    pre = { mode: 'duel', level: bot ? o.opp : 'normal', ev, map: dmap, first, bet: [null, null],
      perso: bot ? pick(Object.keys(E.PERSOS)) : null, gods, gards, boss: o.boss === 'oui' ? pick(bossList()) : null, mana: o.mana,
      fac: myF || opF ? [myF, opF] : null, shM, shG, theme: cur2 ? 'abysses' : myF || opF ? 'nuit' : null,
      ctl: bot ? ['me', 'bot'] : online ? ['me', 'net'] : ['me', 'me'], names: online ? [pseudo(), guestName || L('Ami')] : null };
    if (pre.ev === 'objectif') pre.goal = pick(E.GOALS).id;
    if (online) { if (pre.ev === 'pari') pre.ev = null; beginMatch(); netSend({ t: 'start', s: ser(G.s), names: G.names, log: $('log').innerHTML }); return; }
    if (pre.ev || pre.boss) showPre(false); else beginMatch();
  }

  // ---------- en ligne : pair à pair avec PeerJS (aucun serveur à nous) ----------
  let net = null;
  const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const ROOM = c => 'totem-jeu-salle-' + c.toUpperCase();
  function loadPeer() {
    return new Promise((ok, ko) => {
      if (window.Peer) return ok();
      const sc = document.createElement('script');
      sc.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      sc.onload = () => window.Peer ? ok() : ko(); sc.onerror = ko;
      document.head.appendChild(sc);
    });
  }
  function netStatus(h) { if ($('netStatus')) $('netStatus').innerHTML = h; }
  function netSend(m) { try { if (net && net.conn && net.conn.open) net.conn.send(JSON.stringify(m)); } catch (e) { } }
  function netClose() { const n = net; net = null; if (!n) return; clearInterval(n.hb); try { n.conn && n.conn.close(); } catch (e) { } try { n.peer && n.peer.destroy(); } catch (e) { } }
  async function hostRoom() {
    netClose(); netStatus(L('Connexion…'));
    try { await loadPeer(); } catch (e) { return netStatus(L('Le mode en ligne ne se charge pas (pas d’Internet ?).')); }
    const code = Array.from({ length: 4 }, () => CODE_CH[rnd(CODE_CH.length)]).join('');
    const n = net = { peer: new window.Peer(ROOM(code)), host: true, code, conn: null };
    n.peer.on('open', () => netStatus(L('Salle créée ! Donne ce code à ton ami :') + ` <b class="code">${code}</b><br><small class="muted">${L('En attente de ton ami…')}</small>`));
    n.peer.on('error', e => netStatus(L('Erreur de connexion ({e}).', { e: esc(e && e.type || '?') })));
    n.peer.on('connection', conn => { if (n.conn) { conn.close(); return; } n.conn = conn; bindConn(n, conn); });
  }
  async function joinRoom(code) {
    code = String(code || '').trim().toUpperCase();
    if (code.length !== 4) return netStatus(L('Le code a 4 caractères.'));
    netClose(); netStatus(L('Connexion…'));
    try { await loadPeer(); } catch (e) { return netStatus(L('Le mode en ligne ne se charge pas (pas d’Internet ?).')); }
    const n = net = { peer: new window.Peer(), host: false, code, conn: null };
    n.peer.on('error', e => netStatus(e && e.type === 'peer-unavailable' ? L('Aucune salle avec ce code.') : L('Erreur de connexion ({e}).', { e: esc(e && e.type || '?') })));
    n.peer.on('open', () => { const conn = n.peer.connect(ROOM(code), { reliable: true }); n.conn = conn; bindConn(n, conn); conn.on('open', () => netSend({ t: 'hello', name: pseudo() })); });
  }
  function bindConn(n, conn) {
    n.seen = Date.now();
    conn.on('data', d => { if (net !== n) return; n.seen = Date.now(); const m = typeof d === 'string' ? JSON.parse(d) : d; if (m.t !== 'ping') onNet(m); });
    // battement : si l'ami ne répond plus pendant 20 s, on le considère comme parti
    n.hb = setInterval(() => { if (net !== n) return clearInterval(n.hb); if (conn.open) netSend({ t: 'ping' }); if (conn.open && Date.now() - n.seen > 20000) lost(); }, 4000);
    const lost = () => {
      clearInterval(n.hb);
      if (net !== n) return;
      net = null;
      if (G && G.net && !G.over) { toast(L('Ton adversaire s’est déconnecté.'), 6000); G.s.winner = G.me; G.s.why = 'Ton adversaire a quitté la partie.'; endGame(); }
      else netStatus(L('Connexion fermée.'));
    };
    conn.on('close', lost);
  }
  function onNet(m) {
    if (m.t === 'hello' && net.host) { netStatus(L('{p} a rejoint la salle !', { p: esc(m.name) })); startDuel(String(m.name || '').slice(0, 18)); }
    else if (m.t === 'start' && !net.host) {
      cur = -1; myCercle = 0;
      pre = { mode: 'duel', names: m.names };
      G = newG(deser(m.s), { mode: 'duel', ctl: ['net', 'me'], me: 1, flip: true, net: true, names: m.names.slice() });
      $('log').innerHTML = m.log || '';
      sys(L('Connecté ! Tu joues contre {p}.', { p: esc(m.names[0]) }));
      enterGame();
    }
    else if (m.t === 'act' && G && G.net && !G.over) { if (m.ply !== G.s.ply) netSend({ t: 'need' }); else doAction(m.a); }
    else if (m.t === 'need' && net.host && G) netSend({ t: 'sync', s: ser(G.s) });
    else if (m.t === 'sync' && G) { G.s = deser(m.s); G.ver++; G.sel = null; render(); if (G.s.winner !== null) endGame(); }
    else if (m.t === 'bye' && G && G.net && !G.over) { G.s.winner = G.me; G.s.why = 'Ton adversaire a abandonné.'; endGame(); }
  }

  // =====================================================================
  //  DLC « Les Abysses » : l'histoire « L'Ascension »
  // =====================================================================
  const STORY = [
    { lv: 'facile', map: ['classique', 0] },
    { lv: 'normal', map: ['aleatoire', 2] },
    { lv: 'normal', map: ['aleatoire', 2], boss: 'bh' },
    { lv: 'normal', map: ['aleatoire', 3, true], ev: 'maree', theme: 'abysses', sea: true },
    { lv: 'normal', map: ['aleatoire', 3, true], boss: 'bm', theme: 'abysses', sea: true },
    { lv: 'impossible', map: ['aleatoire', 3, true], boss: 'bl', theme: 'abysses', sea: true },
    { lv: 'impossible', map: ['aleatoire', 4], all: true },
    { lv: 'impossible', map: ['aleatoire', 4, true], boss: 'bx', all: true, theme: 'abysses' },
  ];
  const storyEnd = i => [
    L('Ton rival s’incline. Mais au loin, une source de mana se met à briller…'),
    L('La source est à toi. Son éclat attire pourtant un ennemi bien plus ancien.'),
    L('L’Hydre s’effondre dans un dernier sifflement. Sous tes pieds, la terre devient humide : la mer approche.'),
    L('Tu as dompté les courants. Au loin, la mer se retire… et quelqu’un la commande.'),
    L('Le Seigneur des marées sombre dans les vagues. Plus bas, dans le noir, quelque chose s’éveille.'),
    L('Le Léviathan ne chassera plus. Les dieux t’attendent : ils veulent savoir qui tu es.'),
    L('Le conseil te reconnaît. Mais un dieu chassé, lui, refuse ton nom.'),
    L('Le Dieu déchu tombe pour de bon. Panthéa est en paix… pour l’instant.'),
  ][i];
  const storyTitle = i => [L('Le réveil'), L('La source'), L('Le pacte de l’Hydre'), L('Les courants'), L('Le Seigneur des marées'), L('Le Léviathan'), L('Le conseil des dieux'), L('Le Dieu déchu')][i];
  const storyText = i => [
    L('Les dieux de Panthéa se réveillent dans la clairière. Un rival te défie : montre-lui ce que valent tes gardes.'),
    L('Une source de mana jaillit au cœur de la forêt. Celui qui la tiendra deviendra plus fort : ne la laisse pas à ton rival.'),
    L('Ton rival a passé un pacte avec l’Hydre. Chaque coup lui fait pousser une tête : frappe vite et frappe fort.'),
    L('La forêt s’enfonce sous la mer. Des courants emportent tes persos : sers-t’en au lieu de les subir.'),
    L('Le Seigneur des marées repousse tout ce qui ose approcher. Avance quand la mer se retire.'),
    L('Dans les abysses, le Léviathan chasse sans bruit. Quand une case devient rouge, fuis !'),
    L('Les dieux se réunissent pour choisir qui régnera sur Panthéa. Tous les persos sont là ; seul le meilleur stratège gagnera.'),
    L('Un dieu chassé du panthéon revient se venger. Abats-le… puis abats-le encore, car il se relève.'),
  ][i];
  const storyDone = () => lsGet('story', 0);
  function renderStory() {
    const done = storyDone();
    $('storyBox').innerHTML = `<h2 class="title">📖 ${L('L’Ascension')}</h2><p class="muted center">${L('L’histoire de Panthéa, en 8 chapitres. Chaque victoire ouvre le chapitre suivant.')}</p>
      <div class="chaps">${STORY.map((c, i) => { const st = i < done ? 'done' : i === done ? 'next' : 'lock';
        return `<button class="chap ${st}" data-ch="${i}" ${st === 'lock' ? 'disabled' : ''}><span class="cn">${i + 1}</span><b>${st === 'lock' ? '🔒 ' : st === 'done' ? '✓ ' : ''}${storyTitle(i)}</b>${c.boss ? `<span class="cb2">${token(E.TI[c.boss], 1)}</span>` : ''}</button>`; }).join('')}</div>
      ${done >= STORY.length ? `<p class="center gold">🏆 ${L('Tu as terminé l’Ascension !')}</p>` : ''}
      <div class="menu-actions"><button class="ghost" id="btnStoryBack">${L('Retour')}</button></div>`;
    $('storyBox').querySelectorAll('[data-ch]').forEach(b => b.onclick = () => startStory(+b.dataset.ch));
    $('btnStoryBack').onclick = () => { renderExt(); show('ext'); };
  }
  function openStory() { cur = -1; myCercle = 0; renderStory(); show('story'); }
  function startStory(i) {
    const c = STORY[i], all = !!c.all;
    const gods = all ? allM() : E.START_M.concat(c.sea ? E.DLC_M : []), gards = all ? allG() : E.START_G.concat(c.sea ? E.DLC_G : []);
    pre = { mode: 'story', story: i, level: c.lv, ev: c.ev || null, map: E.makeMap(c.map[0], c.map[1], !!c.map[2]), first: rnd(2), bet: [null, null],
      perso: pick(Object.keys(E.PERSOS)), gods, gards, boss: c.boss || null, theme: c.theme || null };
    showPre(false);
  }

  // =====================================================================
  //  DLC « Les Ombres » : la saison de la semaine et son classement
  // =====================================================================
  const SEASON_RULES = ['tempete', 'brulee', 'invasion', 'ombres', 'maree', 'sansdieux', 'cimetiere', 'toutourien', 'lumiere', 'portails'];
  const SEASON_RULES2 = ['tempete', 'guerre', 'brulee', 'invasion', 'ombres', 'maree', 'sansdieux', 'guerre', 'cimetiere', 'toutourien', 'lumiere', 'portails'], SEASON_WK2 = 2965;
  const seasonName = id => ({ tempete: L('Tempête de mana'), brulee: L('Terres brûlées'), invasion: L('Invasion'), ombres: L('L’armée des Ombres'), maree: L('Marée haute'),
    sansdieux: L('Sans dieux'), cimetiere: L('Cimetière'), toutourien: L('Tout ou rien'), lumiere: L('La Lumière contre-attaque'), portails: L('Portails'), guerre: L('Guerre des Ombres') })[id];
  const seasonDesc = id => ({
    tempete: L('Les deux camps commencent avec 250 mana : les sorts pleuvent.'), brulee: L('Carte très sauvage et sol fragile : là où un perso meurt, un trou s’ouvre.'),
    invasion: L('Un boss au hasard t’attend, mais tu commences avec 150 mana.'), ombres: L('Tu joues l’armée des Ombres contre l’armée de la Lumière.'),
    maree: L('Des courants partout et +10 mana à chaque tour.'), sansdieux: L('Aucun dieu dans la réserve : seuls les gardes et les soldats se battent.'),
    cimetiere: L('Les morts restent sur la carte et la bloquent pour toujours.'), toutourien: L('Tous les persos, contre le bot stratège.'),
    lumiere: L('Tu joues l’armée des Ombres contre un boss de la Lumière, sur une carte avec autels, lumières sacrées et portails.'),
    portails: L('Des portails partout : un perso qui finit son tour dessus passe de l’autre côté de la carte.'),
    guerre: L('Les deux camps jouent l’armée des Ombres.'),
  })[id];
  const weekId = () => Math.floor((Date.now() / 864e5 + 3) / 7); // semaines du lundi au dimanche
  function seasonCfg() {
    const wk = weekId();
    const RL = wk >= SEASON_WK2 ? SEASON_RULES2 : SEASON_RULES;
    let rule = RL[wk % RL.length];
    if (rule === 'maree' && !dlcOn('abysses')) rule = 'tempete';
    return E.withSeed(hashStr('panthea-saison-' + wk), () => {
      const c = { wk, rule, perso: pick(Object.keys(E.PERSOS)), mapSeed: 1 + rnd(1e9), boss: pick(bossList()), light: pick(E.SH_BOSSES) };
      c.goal = pick(RECORDS.filter(g => !((rule === 'invasion' || rule === 'lumiere') && (g === 'carnage' || g === 'survie')))); // contre un boss : il faut le tuer
      c.army = randomArmy(rule === 'sansdieux');
      c.sh10 = pick10(E.SH_M, E.SH_G); c.li10 = pick10(E.ALL_M, E.ALL_G); // règles des Ombres : 10 sortes de chaque armée
      return c;
    });
  }
  const seasonData = () => lsGet('seasons', {});
  // points de talents gagnés : seulement ce qui dépasse ton meilleur score de la semaine
  const weekGain = G => G.committed ? G.weekGain || 0 : Math.max(0, seasonScore(G) - (seasonData()[pre.season.wk] || []).reduce((a, x) => Math.max(a, x.p), 0));
  const seasonScore = G => recInfo(G, G.chal).score;
  function renderSeason() {
    const c = seasonCfg(), d = seasonData(), board = (d[c.wk] || []).slice(0, 10);
    const left = 7 - Math.floor((Date.now() / 864e5 + 3) % 7);
    const past = Object.keys(d).map(Number).filter(k => k !== c.wk).sort((a, b) => b - a).slice(0, 5);
    $('seasonBox').innerHTML = `<h2 class="title">🗓️ ${L('Défi de la semaine')}</h2>
      <div class="evcard"><b>${seasonName(c.rule)}</b>${seasonDesc(c.rule)}<br><small class="muted">${L('Encore {n} jour(s) avant la règle suivante.', { n: left })}</small></div>
      <div class="evcard"><b>🏆 ${L('Record')} : ${dailyName(c.goal)}</b>${dailyDesc(c.goal)}</div>
      <div class="menu-actions"><button class="big" id="btnSeasonGo">${L('Jouer le défi')}</button></div>
      <div class="seasoncols"><div><h3>${L('Ton classement de la semaine')}</h3>${board.length ? `<ol class="board">${board.map((x, k) => `<li class="${k === 0 ? 'gold' : ''}"><b>${x.p}</b> ${L('pts')}${x.m ? ` · ${x.m}` : ''} <small>${new Date(x.d).toLocaleDateString()}</small></li>`).join('')}</ol>` : `<p class="muted">${L('Pas encore de score cette semaine.')}</p>`}</div>
        <div><h3>${L('Tes meilleures semaines')}</h3>${past.length ? `<ul class="board">${past.map(k => `<li><b>${Math.max(...d[k].map(x => x.p))}</b> ${L('pts')}</li>`).join('')}</ul>` : `<p class="muted">${L('Rien pour l’instant.')}</p>`}</div></div>
      <p class="muted center">${L('Chaque fois que tu bats ton meilleur score de la semaine, la différence s’ajoute à tes points de talents.')}</p>
      <div class="menu-actions"><button class="ghost" id="btnSeasonBack">${L('Retour')}</button></div>`;
    $('btnSeasonGo').onclick = startSeason;
    $('btnSeasonBack').onclick = () => { if (seasonFrom === 'menu') { renderMenu(); show('menu'); } else { renderExt(); show('ext'); } };
  }
  let seasonFrom = 'ext';
  function openSeason(from) { seasonFrom = from === 'menu' ? 'menu' : 'ext'; cur = -1; myCercle = 0; renderSeason(); show('season'); }
  function startSeason() {
    const c = seasonCfg(), R = c.rule;
    const map = E.withSeed(c.mapSeed, () => { const m = E.makeMap('aleatoire', R === 'brulee' ? 4 : 3, R === 'maree'); if (R === 'ombres' || R === 'lumiere' || R === 'guerre') E.addShadowSpecs(m); if (R === 'portails') E.addShadowSpecs(m, [6, 6, 6]); return m; });
    // persos : au hasard pour les règles qui n'imposent pas d'armée ; « Tout ou rien » : tous, Lumière et Ombres mélangées
    if (!c.sh10) { c.sh10 = pick10(E.SH_M, E.SH_G); c.li10 = pick10(E.ALL_M, E.ALL_G); }
    const fixed = ['toutourien', 'ombres', 'lumiere', 'guerre'].includes(R), A = c.army || randomArmy(R === 'sansdieux');
    const army = R === 'toutourien' ? { gods: allM(), gards: allG(), shM: E.SH_M, shG: E.SH_G, fac: [2, 2] }
      : R === 'guerre' ? { gods: [], gards: [], shM: c.sh10[0], shG: c.sh10[1], fac: [1, 1] }
      : R === 'ombres' || R === 'lumiere' ? { gods: c.li10[0], gards: c.li10[1], shM: c.sh10[0], shG: c.sh10[1], fac: [1, 0] } : A;
    if (!fixed && army.fac) E.addShadowSpecs(map);
    pre = { mode: 'season', season: c, chal: c.goal, hard: [], level: R === 'toutourien' || c.goal === 'survie' ? 'impossible' : 'normal', perso: c.perso, first: rnd(2), bet: [null, null], map,
      ev: R === 'brulee' ? 'fragile' : R === 'maree' ? 'maree' : R === 'cimetiere' ? 'murs' : null,
      gods: army.gods, gards: army.gards, shM: army.fac ? army.shM : null, shG: army.fac ? army.shG : null, fac: army.fac,
      boss: R === 'invasion' ? c.boss : R === 'lumiere' ? c.light : null, mana: R === 'tempete' ? 250 : null, myMana: R === 'invasion' ? 150 : null,
      theme: R === 'maree' ? 'abysses' : army.fac && army.fac[0] === 1 ? 'nuit' : null };
    showPre(false);
  }

  // =====================================================================
  //  Écran des extensions (DLC)
  // =====================================================================
  function renderExt() {
    const card = (k, icon, title, items, btns) => `<section class="dlc ${dlcOn(k) ? 'on' : ''}"><div class="dlchead"><h3>${icon} ${title}</h3>
        <button class="ghost sm ${dlcOn(k) ? '' : 'off'}" data-dlc="${k}">${dlcOn(k) ? '✓ ' + L('Activée') : L('Désactivée')}</button></div>
        <ul>${items.map(x => `<li>${x}</li>`).join('')}</ul><div class="menu-actions">${dlcOn(k) ? btns : ''}</div></section>`;
    $('extBox').innerHTML = `<h2 class="title">🧩 ${L('Extensions')}</h2><p class="muted center">${L('Deux extensions gratuites. Tu peux les désactiver pour retrouver le jeu de base.')}</p>
      <div class="dlcs">
      ${card('abysses', '🌊', L('Les Abysses'), [L('Un nouveau monde sous-marin, avec ses courants qui emportent les persos'), L('4 persos marins : Requin, Méduse, Pieuvre, Sirène'),
        L('4 boss des profondeurs : Léviathan, Seigneur des marées, Grand Corail, Méduse géante'), L('L’Ascension : l’histoire en 8 chapitres et le Dieu déchu, un boss en 2 phases')],
        `<button class="big" id="btnStory">📖 ${L('L’Ascension')}</button>`)}
      ${card('ombres', '🌑', L('Les Ombres'), [L('Le Clan des Ombres : une 2e armée complète (10 dieux, 15 gardes, ses soldats) aux pouvoirs que la Lumière n’a pas, cachée dans le noir'),
        L('Sa façon de gagner : avoir 3 persos dans la zone de placement adverse'), L('4 boss de la Lumière, rien que pour les parties des Ombres : Archange, Paladin, Phare, Golem de cristal'),
        L('3 nouvelles cases spéciales : autels, lumières sacrées et portails'), L('5 handicaps difficiles propres aux parties des Ombres'),
        L('Le défi de la semaine : une règle spéciale chaque semaine, ton classement, et des points pour les talents'), L('2 emplacements de partie en plus : 5 parties en cours'),
        L('Les statistiques : points de tes persos, réussite de tes affrontements')],
        `<button class="big" id="btnSeason">🗓️ ${L('Défi de la semaine')}</button><button class="ghost" id="btnStats2">📊 ${L('Statistiques')}</button>`)}
      </div>
      <div class="menu-actions"><button class="ghost" id="btnExtBack">${L('Retour')}</button></div>`;
    $('extBox').querySelectorAll('[data-dlc]').forEach(b => b.onclick = () => { DLC[b.dataset.dlc] = !DLC[b.dataset.dlc]; lsSet('dlc', DLC); sfx('evolution'); renderExt(); });
    if ($('btnStory')) $('btnStory').onclick = openStory;
    if ($('btnSeason')) $('btnSeason').onclick = () => openSeason('ext');
    if ($('btnStats2')) $('btnStats2').onclick = openStats;
    $('btnExtBack').onclick = () => { renderMenu(); show('menu'); };
  }
  function openExt() { renderExt(); show('ext'); }

  // =====================================================================
  //  Statistiques : points des persos, affrontements, boss
  // =====================================================================
  let statsTab = 'persos', statsPg = 0, statsPages = 1;
  const pct = (a, b) => b ? Math.round(100 * a / b) + ' %' : '–';
  function statsBlocks() {
    const d = statsData();
    if (statsTab === 'persos') {
      const ids = allM().concat(allG(), ['s'], dlcOn('ombres') ? E.SH_M.concat(E.SH_G, ['os']) : []);
      const max = Math.max(1, ...ids.map(id => d.pts[id] || 0));
      const sorted = ids.slice().sort((a, b) => (d.pts[b] || 0) - (d.pts[a] || 0) || tn(E.TI[a]).localeCompare(tn(E.TI[b])));
      const low = ids.slice().sort((a, b) => (d.pts[a] || 0) - (d.pts[b] || 0)).slice(0, 5);
      return [textBlock(`<h3>${L('Les points de tes persos')}</h3><p class="muted">${L('Un perso gagne 1 point chaque fois que tu le recrutes, le places ou l’actives.')}</p>
          <p>${L('Les moins utilisés :')} ${low.map(id => `<span class="chip ic" title="${esc(tn(E.TI[id]))}">${token(E.TI[id], 0)}</span>`).join(' ')}</p>`)]
        .concat(sorted.map((id, k) => { const i = E.TI[id], n = d.pts[id] || 0, u = d.used[id] || 0;
          return `<div class="srow">${k < 3 && n ? `<span class="rank">${k + 1}</span>` : '<span class="rank"></span>'}${token(i, 0)}<div class="sname"><b>${tn(i)}</b><small>${L('{u} affrontement(s)', { u })} · ${L('{p} de victoires', { p: pct(d.usedW[id] || 0, u) })}</small></div>
            <div class="sbar"><i style="width:${100 * n / max}%"></i></div><b class="snum">${n}</b></div>`; }));
    }
    if (statsTab === 'affrontements') {
      const M = d.modes, kinds = [['normal', L('Affrontement normal')], ['hard', L('Affrontement difficile')], ['boss', L('Affrontement de boss !')], ['daily', L('Défi du jour')], ['duel', L('Duel')], ['story', L('L’Ascension')], ['season', L('Défi de la semaine')]];
      const runN = ['normal', 'hard', 'boss'].reduce((a, k) => a + (M[k] ? M[k].n : 0), 0);
      const totW = Object.values(M).reduce((a, m) => a + m.w, 0), totL = Object.values(M).reduce((a, m) => a + m.l, 0);
      const h = Math.floor(d.ms / 3600e3), mn = Math.floor(d.ms / 60000) % 60;
      return [
        textBlock(`<h3>${L('En tout')}</h3><div class="bigstats"><div><b>${d.battles}</b><small>${L('affrontements')}</small></div><div><b>${pct(totW, totW + totL)}</b><small>${L('de victoires')}</small></div>
          <div><b>${d.kills}</b><small>${L('persos ennemis tués')}</small></div><div><b>${d.lost}</b><small>${L('persos perdus')}</small></div><div><b>${d.turns}</b><small>${L('tours joués')}</small></div><div><b>${h} h ${String(mn).padStart(2, '0')}</b><small>${L('de jeu')}</small></div></div>`),
        textBlock(`<h3>${L('Sortes d’affrontements')}</h3><table class="cmp stab"><tr><th></th><th>${L('Part')}</th><th>${L('Joués')}</th><th>${L('Victoires')}</th><th>${L('Réussite')}</th></tr>
          ${kinds.map(([k, lab]) => { const m = M[k] || { n: 0, w: 0, l: 0 }; const share = ['normal', 'hard', 'boss'].includes(k) ? pct(m.n, runN) : '–';
            return `<tr><td>${lab}</td><td>${share}</td><td>${m.n}</td><td>${m.w}</td><td class="best">${pct(m.w, m.w + m.l)}</td></tr>`; }).join('')}</table>
          <p class="muted">${L('« Part » = la part de tes affrontements de partie qui étaient simples, compliqués ou contre un boss.')}</p>`),
        textBlock(`<h3>${L('Boss')}</h3><div class="bossgrid">${bossList().concat(dlcOn('abysses') ? ['bx'] : []).map(b => { const x = d.bosses[b] || { w: 0, l: 0 }, seen = x.w + x.l;
          return `<div class="bstat ${seen ? '' : 'unseen'}">${token(E.TI[b], 1)}<small>${seen ? tn(E.TI[b]) : '?'}</small><b>${seen ? `${x.w} / ${seen}` : '–'}</b></div>`; }).join('')}</div>
          <p class="muted">${L('Victoires / combats contre chaque boss.')}</p>`),
      ];
    }
    return [];
  }
  function renderStats() {
    $('statsTabs').innerHTML = [['persos', L('⭐ Persos')], ['affrontements', L('⚔️ Affrontements')]].map(([k, l]) => `<button data-tab="${k}" class="${k === statsTab ? 'sel' : ''}">${l}</button>`).join('');
    $('statsTabs').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { statsTab = b.dataset.tab; statsPg = 0; sfx('page'); renderStats(); });
    const r = paginate($('statsBody'), statsBlocks(), statsTab === 'persos' ? 380 : 420, statsPg, 3, statsTab === 'persos');
    statsPages = r.pages; statsPg = r.pg;
    pagerHtml($('statsPager'), statsPg, statsPages, statsPage);
  }
  function statsPage(d) { const n = statsPg + d; if (n < 0 || n >= statsPages) return; statsPg = n; sfx('page'); renderStats(); }
  function openStats() { statsPg = 0; $('statsModal').hidden = false; renderStats(); sfx('page'); }
  function closeStats() { $('statsModal').hidden = true; sfx('page'); }
  $('statsModal').addEventListener('click', e => { if (e.target === $('statsModal') || e.target.hasAttribute('data-close')) closeStats(); });
  $('btnExtMenu').onclick = openExt;
  $('btnDuelMenu').onclick = openDuel;

  // =====================================================================
  //  Paramètres
  // =====================================================================
  function segH(key, opts) { return `<div class="seg" data-set="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(SET[key]) === String(v) ? 'sel' : ''}">${l}</button>`).join('')}</div>`; }
  function renderSettings() {
    const fs = !!document.fullscreenElement;
    $('setBody').innerHTML = `
      <div class="setrow"><div class="lab"><b>👤 ${L('Ton pseudo')}</b></div><input id="setPseudo" maxlength="18" value="${esc(lsGet('pseudo', ''))}" placeholder="${L('Joueur')}"></div>
      <div class="setrow"><div class="lab"><b>🌍 ${L('Langue')}</b></div><select id="setLang">${I18N.LANGS.map(([c, n]) => `<option value="${c}" ${I18N.lang === c ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="setrow"><div class="lab"><b>🎵 ${L('Musique')}</b></div><div><button class="ghost sm ${Sound.music ? '' : 'off'}" id="setMus">${Sound.music ? L('Activée') : L('Coupée')}</button> <input type="range" min="0" max="100" value="${Math.round(Sound.musicVol * 100)}" id="volMus"></div></div>
      <div class="setrow"><div class="lab"><b>🔊 ${L('Effets sonores')}</b></div><div><button class="ghost sm ${Sound.effects ? '' : 'off'}" id="setSfx">${Sound.effects ? L('Activés') : L('Coupés')}</button> <input type="range" min="0" max="100" value="${Math.round(Sound.sfxVol * 100)}" id="volSfx"></div></div>
      <div class="setrow wide"><div class="lab"><b>🌲 ${L('Décor')}</b></div>${segH('decor', [['auto', L('Auto')]].concat(themeList().map(t => [t, I18N.themeShort(t)])))}</div>
      <div class="setrow"><div class="lab"><b>✨ ${L('Animations')}</b></div>${segH('anim', [['normal', L('Normales')], ['rapide', L('Rapides')], ['aucune', L('Aucune')]])}</div>
      <div class="setrow"><div class="lab"><b>🔤 ${L('Coordonnées sur la carte')}</b></div>${segH('coords', [[true, L('Oui')], [false, L('Non')]])}</div>
      <div class="setrow"><div class="lab"><b>👁️ ${L('Couleurs')}</b> <small>${L('Mode daltoniens : un symbole sur chaque perso (▲ toi, ■ l’adversaire), bleu au lieu de violet, motifs en plus des couleurs.')}</small></div>${segH('vision', [['normale', L('Normales')], ['daltonien', L('Daltoniens')]])}</div>
      <div class="setrow"><div class="lab"><b>🎮 ${L('Manette')}</b> <small>${L('Branche une manette, elle marche tout de suite : croix ou stick pour se déplacer, A choisir, B retour, X carte ou boutons, Y annuler le coup, LB/RB pages, Start paramètres, Select Codex.')}</small></div><span class="muted">${padOn ? '✅ ' + L('Connectée') : L('Aucune manette')}</span></div>
      <div class="setrow"><div class="lab"><b>📳 ${L('Vibrations de la manette')}</b></div>${segH('rumble', [[true, L('Oui')], [false, L('Non')]])}</div>
      <div class="setrow"><div class="lab"><b>🧪 ${L('Mode test')}</b> <small>${L('Ajoute un bouton « Gagner (test) » en haut de l’écran de jeu, pour avancer plus vite. Pas dans les défis ni les duels.')}</small></div>${segH('test', [[true, L('Oui')], [false, L('Non')]])}</div>
      <div class="setrow"><div class="lab"><b>🖥️ ${L('Plein écran')}</b> <small>F11</small></div><button class="ghost sm" id="setFs">${fs ? L('Quitter le plein écran') : L('Plein écran')}</button></div>`;
    $('setPseudo').onchange = e => { lsSet('pseudo', e.target.value.trim().slice(0, 18)); renderMenu(); };
    $('setLang').onchange = e => { I18N.setLang(e.target.value); translateStatic(); renderSettings(); renderMenu(); if ($('run').classList.contains('on')) renderRun(); if (G) { G.names = curNames(); PN[0] = G.names[0]; PN[1] = G.names[1]; render(); } };
    $('setMus').onclick = () => { toggleMusic(); renderSettings(); };
    $('setSfx').onclick = () => { toggleSfx(); renderSettings(); };
    $('volMus').oninput = e => Sound.setMusicVol(e.target.value / 100);
    $('volSfx').oninput = e => Sound.setSfxVol(e.target.value / 100);
    $('volSfx').onchange = () => sfx('choix');
    $('setBody').querySelectorAll('[data-set]').forEach(seg => seg.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      const k = seg.dataset.set; let v = b.dataset.v;
      if (v === 'true') v = true; else if (v === 'false') v = false;
      SET[k] = v; lsSet('reglages', SET); applySettings();
      if (k === 'vision') { renderMenu(); if (G && $('game').classList.contains('on')) render(); }
      if (k === 'decor') { if (v === 'auto') scheduleTheme(); else setTheme(v); }
      renderSettings();
    });
    $('setFs').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => toast(L('Plein écran impossible ici.'))); setTimeout(renderSettings, 300); };
  }
  function openSettings() { renderSettings(); $('setModal').hidden = false; sfx('page'); }
  function closeSettings() { $('setModal').hidden = true; sfx('page'); }
  $('btnSet').onclick = openSettings;
  $('btnSetMenu').onclick = openSettings;
  $('setModal').addEventListener('click', e => { if (e.target === $('setModal') || e.target.hasAttribute('data-close')) closeSettings(); });

  // =====================================================================
  //  Tutoriel (court)
  // =====================================================================
  let tutoI = 0;
  const TUTO = () => [
    { t: L('Bienvenue dans Panthéa !'), b: `<p>${L('Un jeu de stratégie au tour par tour sur une carte, un peu comme les échecs. Comment tu t’appelles ?')}</p><input id="tutoPseudo" maxlength="18" value="${esc(lsGet('pseudo', ''))}" placeholder="${L('Ton pseudo')}">` },
    { t: L('Le but'), b: `<div class="tutoic">${token(E.TI.ma, 1)}${token(E.TI.mc, 1)}${token(E.TI.g2, 1)}${token(E.TI.g3, 1)}</div><p>${L('Tue <b>tous les dieux</b> adverses (les hexagones couronnés), ou <b>4 de ses gardes</b> (les boucliers).')}</p>` },
    { t: L('Une action par tour'), b: `<p>${L('À ton tour, tu fais toujours <b>une seule action</b> (on ne peut pas passer son tour) :')}</p><ul class="tutoacts">
        <li>➕ ${L('<b>Recruter</b> : prends un perso dans la <b>réserve commune</b> (à droite). Il rejoint ta réserve.')}</li>
        <li>📍 ${L('<b>Poser</b> : touche un perso de <b>ta réserve</b> (à gauche), puis une case encadrée de ta couleur, en bas de la carte.')}</li>
        <li>⚡ ${L('<b>Activer</b> : touche un de tes persos sur la carte. Les cases qui brillent montrent ce qu’il peut faire : touche-en une.')}</li></ul>` },
    { t: L('Comprendre un perso'), b: `<p>${L('Touche n’importe quel perso, même dans une réserve : sa fiche dit exactement ce qu’il fait. Sur ces schémas, <b style="color:#3cc47a">vert</b> = où il peut aller, <b style="color:#e04a5a">rouge</b> = qui il peut prendre.')}</p>
        <div class="tutodiags">${['g2', 'g3'].map(id => `<div>${moveDiagram(id)}<b>${tn(E.TI[id])}</b><small>${td(E.TI[id])}</small></div>`).join('')}</div>` },
    { t: L('Dieux et mana'), b: `<div class="tutoic">${token(E.TI.ma, 0)}${token(E.TI.mc, 0)}${token(E.TI.md, 0)}</div><p>${L('Les dieux ne bougent jamais. Une fois posés, active-les pour lancer leur sort, qui coûte du mana 💎 (tu en as 100 au départ, et il revient très peu : seules les sources de mana de la carte en redonnent).')}</p><p>${L('Un dieu posé sur la carte peut être tué. Dans ta réserve, il est à l’abri… mais il ne sert à rien.')}</p>` },
    { t: L('Les gardes et les soldats'), b: `<div class="tutoic">${token(E.TI.g2, 0)}${token(E.TI.g3, 0)}${token(E.TI.g5, 0)}${token(E.TI.s, 0)}</div><p>${L('Chaque garde a sa façon de bouger. La plupart tuent un ennemi en arrivant sur sa case ; d’autres tirent de loin sans bouger. Si tu perds 4 gardes, tu as perdu !')}</p><p>${L('Les soldats sont faibles mais nombreux : ils avancent seulement vers l’adversaire, comme des pions aux échecs.')}</p>` },
    { t: L('Ta partie évolue'), b: `<p>${L('Avant chaque affrontement, choisis <b>normal</b> ou <b>difficile</b>. Après chaque victoire, tu choisis ce qui avance : un nouveau garde ou un nouveau dieu, puis une carte plus sauvage ou plus d’événements. Tous les 10 affrontements, un boss t’attend !')}</p><p class="muted">${L('Astuce : touche un perso pour lire ce qu’il fait. Le bouton ↶ annule ton dernier coup, et le Codex explique tout.')}</p>` },
  ];
  function renderTuto() {
    const S = TUTO(), st = S[tutoI];
    $('tutoBody').innerHTML = `<div class="tutostep">${tutoI + 1} / ${S.length}</div><h2 class="title">${st.t}</h2><div class="tutotxt">${st.b}</div>
      <div class="menu-actions">${tutoI ? `<button class="ghost" id="tutoPrev">← ${L('Précédent')}</button>` : ''}${tutoI === S.length - 1 ? `<button class="big" id="tutoPlay">🎓 ${L('Jouer le tutoriel')}</button>` : ''}<button class="${tutoI === S.length - 1 ? 'ghost' : 'big'}" id="tutoNext">${tutoI === S.length - 1 ? L('C’est parti !') : L('Suivant') + ' →'}</button></div>`;
    if ($('tutoPlay')) $('tutoPlay').onclick = startGuided;
    if ($('tutoPrev')) $('tutoPrev').onclick = () => tutoStep(-1);
    $('tutoNext').onclick = () => tutoStep(1);
    if ($('tutoPseudo')) { $('tutoPseudo').focus(); $('tutoPseudo').onkeydown = e => { if (e.key === 'Enter') tutoStep(1); }; }
  }
  function tutoStep(d) {
    if ($('tutoPseudo')) { lsSet('pseudo', $('tutoPseudo').value.trim().slice(0, 18)); renderMenu(); }
    tutoI += d;
    if (tutoI >= TUTO().length) return closeTuto();
    if (tutoI < 0) tutoI = 0;
    sfx('page'); renderTuto();
  }
  function openTuto() { tutoI = 0; renderTuto(); $('tutoModal').hidden = false; }
  function closeTuto() { $('tutoModal').hidden = true; lsSet('tutoFait', true); }
  $('btnTutoMenu').onclick = startGuided;
  $('tutoModal').addEventListener('click', e => { if (e.target === $('tutoModal') || e.target.hasAttribute('data-close')) closeTuto(); });




  // =====================================================================
  //  Manette (API Gamepad) : la croix déplace, A choisit, B revient
  // =====================================================================
  let padOn = false, padBoard = true;
  const padPrev = {};
  window.addEventListener('gamepadconnected', () => {
    if (padOn) return;
    padOn = true;
    toast('🎮 ' + L('Manette connectée : croix pour se déplacer, A pour choisir, B pour revenir.'), 4000);
    padLoop();
  });
  let padAt = 0; // dernière fois que la manette a servi
  function padHint() {
    const el = $('padHint'); if (!el) return;
    const show = padOn && performance.now() - padAt < 20000;
    el.hidden = !show; if (!show) return;
    const scr = (document.querySelector('.screen.on') || {}).id, inBoard = scr === 'game' && G && !modalOpen() && padBoard && !G.replay;
    el.innerHTML = [['A', L('Choisir')], ['B', L('Retour')]].concat(scr === 'game' && G && !G.replay ? [['X', inBoard ? L('Boutons') : L('Carte')], ['Y', L('Annuler le coup')]] : [], [['LB RB', inBoard ? L('Perso suivant') : L('Pages')]])
      .map(([k, t]) => `<span><kbd class="pad${k.length > 1 ? ' w' : ''}">${k}</kbd>${t}</span>`).join('');
  }
  document.addEventListener('mousemove', () => { if (padAt && performance.now() - padAt > 800) { padAt = 0; padHint(); } });
  function rumble(ms, strong) {
    if (!padOn || SET.rumble === false || !padAt) return;
    const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
    try { if (gp && gp.vibrationActuator) gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: strong * .6 }).catch(() => { }); } catch (e) { }
  }
  function padLoop() {
    const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
    if (!gp) { padOn = false; return; }
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), ax = gp.axes || [];
    const st = { up: b(12) || ax[1] < -.6, down: b(13) || ax[1] > .6, left: b(14) || ax[0] < -.6, right: b(15) || ax[0] > .6,
      a: b(0), b: b(1), x: b(2), y: b(3), lb: b(4), rb: b(5), back: b(8), start: b(9) };
    const now = performance.now(), dirs = ['up', 'down', 'left', 'right'];
    for (const k in st) {
      if (!st[k]) { padPrev[k] = 0; continue; }
      if (!padPrev[k]) { padPrev[k] = now + (dirs.includes(k) ? 230 : 1e9); padPress(k); } // 1re pression
      else if (dirs.includes(k) && now > padPrev[k]) { padPrev[k] = now + 110; padPress(k); } // maintenue : ça défile
    }
    setTimeout(padLoop, 16); // (pas requestAnimationFrame : il s'arrête quand la fenêtre est cachée)
  }
  const padKey = key => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  function padContainer() {
    const m = modalOpen(); if (m) return $(m);
    if (sheet) return document.body;
    return document.querySelector('.screen.on') || document.body;
  }
  function padNav(dir) {
    const root = padContainer();
    const els = [...root.querySelectorAll('button, select, input, .chip.click, [data-o], [data-t]')].filter(e => e.offsetParent && !e.disabled && !e.closest('[hidden]'));
    if (!els.length) return;
    const cur0 = document.activeElement;
    if (!els.includes(cur0)) { padFocusEl(els.find(e => e.matches('.big, .main, .choice, #btnGo, #btnNext')) || els[0]); return; }
    const r0 = cur0.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2, v = dir === 'up' || dir === 'down';
    let best = null, bd = 1e9;
    for (const e of els) {
      if (e === cur0) continue;
      const r = e.getBoundingClientRect(), dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
      if (!(dir === 'up' ? dy < -4 : dir === 'down' ? dy > 4 : dir === 'left' ? dx < -4 : dx > 4)) continue;
      const sc = (v ? Math.abs(dy) : Math.abs(dx)) + (v ? Math.abs(dx) : Math.abs(dy)) * 2.5;
      if (sc < bd) { bd = sc; best = e; }
    }
    if (best) padFocusEl(best);
  }
  // manette : sur un nouvel écran, le bouton principal est déjà choisi (A le valide)
  function padAutoFocus() {
    if (!padOn || !padAt || performance.now() - padAt > 20000) return;
    const scr = document.querySelector('.screen.on'); if (!scr || scr.id === 'game') return;
    const e = [...scr.querySelectorAll('.big, .main, .choice, #btnGo')].find(x => x.offsetParent && !x.disabled);
    if (e) padFocusEl(e);
  }
  function padFocusEl(e) {
    document.querySelectorAll('.padfocus').forEach(x => x.classList.remove('padfocus'));
    e.classList.add('padfocus'); e.focus({ preventScroll: true }); sfx('choix', .35);
  }
  // le curseur de la manette sur la carte
  function padBoardMove(dir) {
    const g = G.s.g;
    if (G.padQ === undefined || G.padQ < 0 || !g.ex[G.padQ]) { G.padQ = g.zl[G.me] && g.zl[G.me].length ? g.zl[G.me][0] : g.N >> 1; render(); return; }
    let dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0, dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    if (G.flip) { dr = -dr; dc = -dc; }
    let r = (G.padQ / g.W) | 0, c = G.padQ % g.W;
    for (let k = 0; k < Math.max(g.W, g.H); k++) {
      r += dr; c += dc;
      if (r < 0 || r >= g.H || c < 0 || c >= g.W) return;
      const q = r * g.W + c;
      if (g.ex[q]) { G.padQ = q; sfx('choix', .3); render(); if (G.s.b[q] > 0) showInfo(E.tix(G.s.b[q]), E.own(G.s.b[q]), q); else showSpec(q); return; }
    }
  }
  function padPress(k) {
    padAt = performance.now(); setTimeout(padHint, 0);
    const scr = (document.querySelector('.screen.on') || {}).id, m = modalOpen();
    const inBoard = scr === 'game' && G && !m && !sheet && padBoard && !G.replay;
    if (k === 'b') return padKey('Escape');
    if (k === 'start') return m === 'setModal' ? closeSettings() : openSettings();
    if (k === 'back') return m === 'codexModal' ? closeCodex() : openCodex();
    if ((k === 'lb' || k === 'rb') && scr === 'game' && G && !m && !G.replay && padBoard) { // perso suivant / précédent qu'on peut activer
      if (!humanTurn() || G.s.phase !== 'play') return;
      const froms = [...new Set(legal().filter(a => a.k === 'act').map(a => a.from))];
      if (!froms.length) return toast(L('Aucun perso à activer.'));
      const i = froms.indexOf(G.padQ), q = froms[(i + (k === 'lb' ? froms.length - 1 : 1)) % froms.length];
      G.padQ = q; selectPiece(q); return;
    }
    if (k === 'lb') return padKey('ArrowLeft');
    if (k === 'rb') return padKey('ArrowRight');
    if (scr === 'game' && G && G.replay && !m) {
      if (k === 'left' || k === 'right') return padKey(k === 'left' ? 'ArrowLeft' : 'ArrowRight');
      if (k === 'a') return replayCtl('play');
    }
    if (scr === 'game' && G && !m && k === 'y') return undo();
    if (scr === 'game' && G && !m && k === 'x') { padBoard = !padBoard; document.querySelectorAll('.padfocus').forEach(x => x.classList.remove('padfocus')); toast(padBoard ? '🎮 ' + L('Manette : la carte') : '🎮 ' + L('Manette : les boutons'), 1400); render(); return; }
    if (['up', 'down', 'left', 'right'].includes(k)) return inBoard ? padBoardMove(k) : padNav(k);
    if (k === 'a') {
      if (inBoard) { if (G.padQ >= 0) clickSq(G.padQ); return; }
      const e = document.activeElement;
      if (e && e !== document.body && e.offsetParent) e.click(); else padNav('down');
    }
  }

  // =====================================================================
  //  Tutoriel jouable : tes premiers coups, guidés pas à pas
  // =====================================================================
  const GUIDE = () => [
    { t: L('Chaque tour, tu fais UNE seule action. Commence par <b>recruter un garde</b> : ouvre la réserve commune et choisis un bouclier.'), ok: (a, s) => a.k === 'rec' && T[a.t].cat === 'G', done: a => a.k === 'rec' },
    { t: L('Bien ! Ton garde attend dans ta réserve. <b>Place-le</b> sur une case de ta zone (en bas, encadrée d’or).'), ok: a => a.k === 'pla', done: a => a.k === 'pla' },
    { t: L('Maintenant <b>recrute un dieu</b> (un hexagone couronné) : il lancera des sorts.'), ok: a => a.k === 'rec' && T[a.t].cat === 'M', done: a => a.k === 'rec' },
    { t: L('<b>Place ton dieu</b> dans ta zone. Attention : si tous tes dieux posés meurent, tu perds !'), ok: a => a.k === 'pla', done: a => a.k === 'pla' },
    { t: L('<b>Active ton garde</b> : touche-le. Sa fiche à droite dit comment il bouge, et les cases qui brillent montrent où il peut aller : touche-en une.'), ok: (a, s) => a.k === 'act' && T[E.tix(s.b[a.from])].cat !== 'M', done: a => a.k === 'act' },
    { t: L('Un soldat ennemi s’approche ! <b>Prends-le</b> : touche un de tes persos, puis la case rouge où se trouve l’ennemi.'), ok: () => true, done: (a, s0, s) => s.lost[1][0] + s.lost[1][1] + s.lost[1][2] > 0, prey: true },
    { t: L('Les dieux ne bougent pas mais lancent des <b>sorts</b> qui coûtent du mana (💎, le nombre bleu). Lis sa fiche, puis <b>active ton dieu</b> pour essayer.'), ok: () => true, done: (a, s0, s) => a.k === 'act' && T[E.tix(s0.b[a.from])].cat === 'M', skip: true },
    { t: L('Bravo, tu connais l’essentiel ! Maintenant <b>bats le bot facile</b> : tue ses dieux posés ou 4 de ses gardes. Le Codex (📖 en haut) explique chaque perso.'), free: true },
  ];
  function startGuided() {
    $('tutoModal').hidden = true; lsSet('tutoFait', true);
    cur = -1; myCercle = 0;
    const s = E.newGame({ map: E.makeMap('classique', 0), first: 0, gods: E.START_M, gards: E.START_G });
    pre = { mode: 'tuto', level: 'facile', perso: null };
    G = newG(s, { mode: 'tuto', ctl: ['me', 'tuto'], level: 'facile', names: [pseudo(), L('Bot facile')], tuto: { i: 0 } });
    $('log').innerHTML = '';
    enterGame();
  }
  const guideStep = () => G && G.tuto && GUIDE()[G.tuto.i];
  // l'adversaire du tutoriel attend sans rien faire, puis devient le vrai bot facile
  function guideOpp() {
    if (G.thinking) return;
    G.thinking = true;
    const id = G.id;
    setTimeout(() => {
      if (!G || G.id !== id || G.over) return;
      G.thinking = false;
      const st = guideStep();
      if (st && st.prey && !G.tuto.prey) guidePrey();
      doAction({ k: 'pass' });
    }, 450);
  }
  // pose un soldat ennemi sur une case qu'un de tes persos peut prendre tout de suite
  function guidePrey() {
    const s = G.s, me = 0;
    let best = -1, bd = 99;
    for (let x = 0; x < s.g.N; x++) {
      if (!s.g.ex[x] || s.b[x] !== 0 || s.g.zone[0][x] || s.g.zone[1][x]) continue;
      const c = E.clone(s); c.b[x] = E.enc(E.TI.s, 1); c.turn = me; c.acts = 1;
      const can = E.gen(c, true).some(a => { if (a.k !== 'act') return false; const t = E.clone(c); t._dead = []; E.apply(t, a); return t.b[x] <= 0 || E.own(t.b[x]) === me; });
      const dd = Math.abs(((x / s.g.W) | 0) - 4);
      if (can && dd < bd) { bd = dd; best = x; }
    }
    if (best >= 0) { s.b[best] = E.enc(E.TI.s, 1); G.tuto.prey = best; }
  }
  function guideAfter(before, s, a, p) {
    const st = guideStep();
    if (!st || st.free || p !== 0) return;
    if (st.done(a, before, s)) {
      G.tuto.i++;
      sfx('evolution', .6, 150);
      if (guideStep().free) { G.ctl[1] = 'bot'; G.humans = G.ctl.map(c => c === 'me'); }
    }
  }
  function guideSkip() { if (!G || !G.tuto) return; G.tuto.i++; if (guideStep().free) { G.ctl[1] = 'bot'; G.humans = G.ctl.map(c => c === 'me'); } render(); maybeBot(); }

  // =====================================================================
  //  Succès (pour toujours, dans stratajium.succes)
  // =====================================================================
  const ACH = [
    { id: 'premiere', ic: '🥇', g: c => c.win },
    { id: 'intact', ic: '🛡️', g: c => c.win && c.lostMe === 0 },
    { id: 'eclair', ic: '⚡', g: c => c.win && c.myT <= 12 },
    { id: 'remontee', ic: '🔥', g: c => c.win && c.s.lost[c.me][1] >= 3 },
    { id: 'carnage', ic: '💀', g: c => c.kills >= 10 },
    { id: 'deicide', ic: '⚔️', g: c => c.win && c.s.lost[1 - c.me][0] > 0 && E.aliveMages(c.s, 1 - c.me) === 0 },
    { id: 'difficile', ic: '🌶️', g: c => c.win && c.mode === 'hard' },
    { id: 'triple', ic: '🌋', g: c => c.win && c.mode === 'hard' && c.hard.length >= 3 },
    { id: 'boss', ic: '👹', g: c => c.win && !!c.s.boss },
    { id: 'stratege', ic: '🧠', g: c => c.win && c.mode === 'duel' && c.G.ctl[1] === 'bot' && c.G.level === 'impossible' },
    { id: 'enligne', ic: '🌐', g: c => !!c.G.net },
    { id: 'veteran', ic: '🏅', t: d => d.wins >= 10 },
    { id: 'champion', ic: '🎖️', t: d => d.wins >= 50 },
    { id: 'legende', ic: '🏆', t: d => d.wins >= 200 },
    { id: 'tousboss', ic: '🐉', t: d => E.BOSSES.every(b => d.st.bosses[b] && d.st.bosses[b].w > 0) },
    { id: 'cercle3', ic: '🔁', t: () => cercleMax() >= 3 },
    { id: 'cercle6', ic: '♾️', t: () => cercleMax() >= 6 },
    { id: 'cercle10', ic: '🌌', t: () => cercleMax() >= 10 },
    { id: 'collection', ic: '🗝️', t: () => RUNS.some(r => r && runM(r).every(x => r.gods.includes(x)) && runG(r).every(x => r.gards.includes(x))) },
    { id: 'touche', ic: '🎭', t: d => E.ALL_M.concat(E.ALL_G, ['s']).every(id => d.st.used[id]) },
    { id: 'mille', ic: '🌟', t: d => Object.values(d.st.pts).reduce((a, b) => a + b, 0) >= 1000 },
    { id: 'defi', ic: '📅', t: d => Object.keys(d.daily.days).length >= 1 },
    { id: 'fidele', ic: '🗓️', t: d => Object.keys(d.daily.days).length >= 7 },
    { id: 'talents', ic: '✨', t: d => d.daily.total >= TALENTS[TALENTS.length - 1].pts },
    { id: 'passion', ic: '⏳', t: d => d.st.ms >= 10 * 3600e3 },
    { id: 'courants', ic: '🌊', dlc: 'abysses', g: c => c.win && !!c.s.g.cdir },
    { id: 'dieudechu', ic: '👑', dlc: 'abysses', g: c => c.win && !!c.s.boss && c.s.boss.kind === 'bx' },
    { id: 'ascension', ic: '📖', dlc: 'abysses', t: () => storyDone() >= STORY.length },
    { id: 'invasion', ic: '🌑', dlc: 'ombres', g: c => c.win && /^Invasion/.test(c.s.why || '') },
    { id: 'lumiere', ic: '☀️', dlc: 'ombres', g: c => c.win && !!c.s.boss && E.SH_BOSSES.includes(c.s.boss.kind) },
    { id: 'aube', ic: '🌅', dlc: 'ombres', g: c => c.win && !!c.s.dawn },
    { id: 'semaine', ic: '📆', dlc: 'ombres', t: () => Object.keys(seasonData()).length >= 1 },
  ];
  const achText = id => ({
    premiere: [L('Premier sang'), L('Gagne ton premier affrontement.')],
    intact: [L('Sans une égratignure'), L('Gagne un affrontement sans perdre un seul perso.')],
    eclair: [L('Éclair'), L('Gagne en 12 de tes tours ou moins.')],
    remontee: [L('Remontée'), L('Gagne après avoir perdu 3 gardes.')],
    carnage: [L('Carnage'), L('Tue 10 persos ennemis dans un seul affrontement.')],
    deicide: [L('Déicide'), L('Gagne en tuant tous les dieux adverses.')],
    difficile: [L('Sans peur'), L('Gagne un affrontement difficile.')],
    triple: [L('Trois fardeaux'), L('Gagne un affrontement difficile avec 3 handicaps.')],
    boss: [L('Tueur de boss'), L('Bats un boss.')],
    stratege: [L('Plus malin que le bot'), L('Gagne un duel contre le bot stratège.')],
    enligne: [L('Rencontre'), L('Joue un duel en ligne.')],
    veteran: [L('Vétéran'), L('Gagne 10 affrontements.')],
    champion: [L('Champion'), L('Gagne 50 affrontements.')],
    legende: [L('Légende'), L('Gagne 200 affrontements.')],
    tousboss: [L('Chasseur de légendes'), L('Bats chacun des 13 boss du jeu de base.')],
    cercle3: [L('Cercle 3'), L('Atteins le Cercle 3.')],
    cercle6: [L('Cercle 6'), L('Atteins le Cercle 6.')],
    cercle10: [L('Cercle 10'), L('Atteins le Cercle 10.')],
    collection: [L('Collectionneur'), L('Débloque tous les dieux et tous les gardes dans une partie.')],
    touche: [L('Touche-à-tout'), L('Utilise au moins une fois chaque perso du jeu de base.')],
    mille: [L('Mille points'), L('Gagne 1000 points de persos au total.')],
    defi: [L('Défi relevé'), L('Joue un défi du jour.')],
    fidele: [L('Fidèle'), L('Joue le défi du jour 7 jours différents.')],
    talents: [L('Tous les talents'), L('Débloque les 6 talents.')],
    passion: [L('Passionné'), L('Joue 10 heures.')],
    courants: [L('Porté par les flots'), L('Gagne sur une carte avec des courants.')],
    dieudechu: [L('Le Dieu déchu'), L('Bats le Dieu déchu, à la fin de L’Ascension.')],
    ascension: [L('L’Ascension'), L('Termine l’histoire.')],
    invasion: [L('Envahisseur'), L('Gagne par invasion avec l’armée des Ombres.')],
    lumiere: [L('Briseur de lumière'), L('Bats un boss de la Lumière.')],
    aube: [L('Avant l’aube'), L('Gagne avec le handicap « L’aube arrive ».')],
    semaine: [L('Chaque semaine'), L('Joue un défi de la semaine.')],
  })[id];
  const achData = () => lsGet('succes', {});
  const achList = () => ACH.filter(a => !a.dlc || dlcOn(a.dlc));
  // vérifie les succès ; G0 = l'affrontement qui vient de finir (ou rien) ; quiet = sans annonce (au démarrage)
  function checkAch(G0, quiet) {
    const got = achData(), st = statsData(), dd = dailyData(), news = [];
    const d = { st, daily: dd, wins: Object.values(st.modes).reduce((a, m) => a + (m.w || 0), 0) };
    let c = null;
    if (G0 && G0.s && !['replay', 'tuto'].includes(G0.mode)) {
      const s = G0.s, me = G0.me, duo = G0.ctl[0] === 'me' && G0.ctl[1] === 'me';
      c = { G: G0, s, me, mode: G0.mode, hard: G0.hard || [], win: !duo && s.winner === me, lostMe: s.lost[me][0] + s.lost[me][1] + s.lost[me][2],
        kills: duo ? 0 : G0.st.kills[me][0] + G0.st.kills[me][1] + G0.st.kills[me][2], myT: Math.ceil((s.ply + (s.first0 === me ? 1 : 0)) / 2) };
    }
    for (const a of ACH) {
      if (got[a.id]) continue;
      let ok = false;
      try { ok = a.g ? !!(c && a.g(c)) : !!a.t(d); } catch (e) { ok = false; }
      if (ok) { got[a.id] = Date.now(); news.push(a); }
    }
    if (!news.length) return;
    lsSet('succes', got);
    if (!quiet) { toast(`🏆 ${L('Succès débloqué : {x}', { x: news.map(a => a.ic + ' ' + achText(a.id)[0]).join(', ') })}`, 6500); sfx('evolution', .8, 300); }
  }
  let achPg = 0, achPages = 1;
  function renderAch() {
    const got = achData(), list = achList(), n = list.filter(a => got[a.id]).length;
    $('achCount').textContent = L('{n} succès sur {t}', { n, t: list.length });
    const blocks = list.map(a => { const [nm, ds] = achText(a.id), when = got[a.id];
      return `<div class="ach ${when ? 'done' : ''}"><span class="aic">${when ? a.ic : '🔒'}</span><div><b>${nm}</b><p>${ds}</p><small>${when ? L('Débloqué le {d}', { d: new Date(when).toLocaleDateString() }) : L('Pas encore débloqué')}</small></div></div>`; });
    const r = paginate($('achBody'), blocks, 300, achPg, 3);
    achPages = r.pages; achPg = r.pg;
    pagerHtml($('achPager'), achPg, achPages, achPage);
  }
  function achPage(dd) { const n = achPg + dd; if (n < 0 || n >= achPages) return; achPg = n; sfx('page'); renderAch(); }
  function openAch() { achPg = 0; $('achModal').hidden = false; renderAch(); sfx('page'); }
  function closeAch() { $('achModal').hidden = true; sfx('page'); }
  $('achModal').addEventListener('click', e => { if (e.target === $('achModal') || e.target.hasAttribute('data-close')) closeAch(); });
  $('btnAchMenu').onclick = openAch;

  // =====================================================================
  //  Revoir une partie : une image légère de la carte après chaque coup
  // =====================================================================
  const packA = a => { let s = ''; for (const v of a) s += String.fromCharCode(v + 51); return s; };
  const unpackN = (str, Ctor, n) => { const a = new Ctor(n || str.length); for (let i = 0; i < Math.min(a.length, str.length); i++) a[i] = str.charCodeAt(i) - 51; return a; };
  function frameOf(s, a) {
    const B = s.boss;
    return { b: packA(s.b), po: packA(s.pool), r: [packA(s.res[0]), packA(s.res[1])], m: s.mana.slice(), l: s.lost.map(x => x.slice()), t: s.turn, p: s.ply, h: s.hold ? s.hold.slice() : null,
      bo: B ? { q: B.q, hp: B.hp, max: B.max, kind: B.kind, owner: B.owner, ice: B.ice, warn: B.warn, webs: B.webs, stones: B.stones, coral: B.coral, ghost: B.ghost } : null,
      a: a && a.k !== 'pass' ? { k: a.k, from: a.from, to: a.to, cl: a.cl } : null, w: s.winner, y: s.why || '' };
  }
  function geoOf(g) {
    const z = []; for (let q = 0; q < g.N; q++) if (g.zone[0][q]) z.push(q);
    return { W: g.W, H: g.H, ex: packA(g.ex), z, name: g.name, spec: packA(g.spec), info: g.info, cdir: g.cdir ? packA(g.cdir) : null };
  }
  function geoFrom(o) {
    const g = E.buildGeo(o.W, o.H, unpackN(o.ex, Uint8Array), o.z, o.name, unpackN(o.spec, Uint8Array), o.info);
    if (o.cdir) g.cdir = unpackN(o.cdir, Int8Array);
    return g;
  }
  function saveReplay() {
    if (!G || !G.rec || G.rec.length < 2 || G.replay || G.mode === 'tuto') return;
    const list = lsGet('replays', []);
    list.unshift({ d: Date.now(), badge: $('runBadge').textContent, names: PN.slice(), me: G.me, w: G.s.winner, why: G.s.why, ev: G.s.ev, goal: G.s.goal, fac: G.s.fac, dawn: G.s.dawn || 0, geo: geoOf(G.s.g), fr: G.rec });
    while (list.length > 8) list.pop();
    while (list.length) { try { localStorage.setItem('stratajium.replays', JSON.stringify(list)); break; } catch (e) { list.pop(); } }
  }
  let rpPg = 0, rpPages = 1;
  function renderReplays() {
    const list = lsGet('replays', []);
    const res = R => R.w === 2 ? L('Match nul') : R.w === R.me ? L('Victoire') : L('Défaite');
    const blocks = list.length ? list.map((R, i) => `<div class="ccard rpcard"><div class="txt"><b>${esc(R.badge)}</b> <span class="tag2 ${R.w === R.me ? 'on' : ''}">${res(R)}</span>
        <p>${esc(R.names[0])} — ${esc(R.names[1])} · ${L('{n} coups', { n: R.fr.length - 1 })}</p><small class="muted">${new Date(R.d).toLocaleString()}</small></div><button class="big" data-rp="${i}">▶ ${L('Revoir')}</button></div>`)
      : [`<div class="ccard"><div class="txt"><p>${L('Aucune partie enregistrée pour l’instant : tes 8 derniers affrontements terminés apparaîtront ici.')}</p></div></div>`];
    const r = paginate($('replayBody'), blocks, 420, rpPg, 2);
    rpPages = r.pages; rpPg = r.pg;
    pagerHtml($('replayPager'), rpPg, rpPages, rpPage);
    $('replayBody').querySelectorAll('[data-rp]').forEach(b => b.onclick = () => openReplay(+b.dataset.rp, 'daily'));
  }
  function rpPage(dd) { const n = rpPg + dd; if (n < 0 || n >= rpPages) return; rpPg = n; sfx('page'); renderReplays(); }
  function openReplays() { rpPg = 0; $('replayModal').hidden = false; renderReplays(); sfx('page'); }
  function closeReplays() { $('replayModal').hidden = true; }
  $('replayModal').addEventListener('click', e => { if (e.target === $('replayModal') || e.target.hasAttribute('data-close')) closeReplays(); });
  $('btnReplayMenu').onclick = openReplays;
  // back : où revenir ensuite (le mode de l'affrontement, comme en le quittant ; 'daily' = le menu)
  function openReplay(i, back) {
    const R = lsGet('replays', [])[i]; if (!R) return;
    closeReplays();
    const base = E.newGame({ map: geoFrom(R.geo), fac: R.fac });
    base.ev = R.ev || null; base.goal = R.goal || null; base.dawn = R.dawn || 0;
    G = newG(base, { mode: 'replay', ctl: ['view', 'view'], names: R.names.slice(), seed: R.d % 1e6, replay: { R, base, i: 0, back, play: null } });
    G.humans = [false, false];
    replaySet(0);
    enterGame();
  }
  function replaySet(k) {
    const RP = G.replay, fr = RP.R.fr; RP.i = Math.max(0, Math.min(fr.length - 1, k));
    const f = fr[RP.i], s = E.clone(RP.base), NT = E.NT;
    s.b = unpackN(f.b, Int16Array, s.g.N); s.pool = unpackN(f.po, Int16Array, NT); s.res = f.r.map(x => unpackN(x, Int16Array, NT));
    s.mana = f.m.slice(); s.lost = f.l.map(x => x.slice()); s.turn = f.t; s.ply = f.p; if (f.h) s.hold = f.h.slice();
    s.boss = f.bo ? Object.assign({ cd: 0 }, JSON.parse(JSON.stringify(f.bo))) : null;
    G.s = s; G.lastA = f.a; G.ver++; G.sel = null;
  }
  function replayGo(k) { replaySet(k); render(); }
  function replayHint() {
    const RP = G.replay, n = RP.R.fr.length, f = RP.R.fr[RP.i];
    let h = L('Coup {i} sur {n}', { i: RP.i, n: n - 1 });
    if (RP.i === n - 1 && f.w !== null && f.w !== undefined) h += ' · ' + (f.w === 2 ? L('Match nul') : L('{p} a gagné', { p: `<span class="p${f.w}">${esc(PN[f.w])}</span>` })) + (f.y ? ' — ' + I18N.why(f.y) : '');
    $('hint').innerHTML = h;
    $('opts').innerHTML = `<button data-rp="first" title="${L('Début')}">⏮</button><button data-rp="prev" title="${L('Coup précédent')}">◀</button><button class="main" data-rp="play">${RP.play ? '⏸ ' + L('Pause') : '▶ ' + L('Lecture')}</button><button data-rp="next" title="${L('Coup suivant')}">▶</button><button data-rp="last" title="${L('Fin')}">⏭</button>`;
    $('opts').querySelectorAll('[data-rp]').forEach(b => b.onclick = e => { e.stopPropagation(); replayCtl(b.dataset.rp); });
  }
  function replayCtl(c) {
    const RP = G && G.replay; if (!RP) return;
    const n = RP.R.fr.length;
    if (c === 'play') {
      if (RP.play) { clearInterval(RP.play); RP.play = null; render(); return; }
      if (RP.i >= n - 1) replaySet(0);
      RP.play = setInterval(() => {
        if (!G || G.replay !== RP) return clearInterval(RP.play);
        if (RP.i >= n - 1) { clearInterval(RP.play); RP.play = null; render(); return; }
        replayGo(RP.i + 1);
      }, SET.anim === 'rapide' ? 500 : 900);
      render(); return;
    }
    if (RP.play) { clearInterval(RP.play); RP.play = null; }
    sfx('choix', .5);
    replayGo(c === 'first' ? 0 : c === 'last' ? n - 1 : RP.i + (c === 'next' ? 1 : -1));
  }

  // ---------- démarrage ----------
  translateStatic();
  renderMenu();
  show('menu');
  if (!lsGet('tutoFait', false)) setTimeout(openTuto, 400);
  checkAch(null, true); // succès déjà mérités (anciennes parties) : sans annonce

  window.STRAT_TOKEN = token;
  window.STRAT = { get G() { return G; }, E, doAction: a => doAction(a), endGame: () => endGame(), undo: () => undo(), get RUNS() { return RUNS; }, openRun: i => openRun(i), startMatch: m => startMatch(m), startDaily: () => startDaily(), get cur() { return cur; }, L, endNext: () => endNext(), dailyCfg: () => dailyCfg(), renderMenu: () => renderMenu() };
})();
