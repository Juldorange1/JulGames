/* Stratajium — interface : parties à affrontements (normal ou difficile) qui font progresser la réserve, défi du jour,
   plateau en forêt, animations, sons, raccourcis clavier, tutoriel, plusieurs langues (voir i18n.js : L('texte français')). */
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
  const LEVELS = ['facile', 'normal', 'impossible', 'deux'];
  const LEVELIC = { facile: '🌱', normal: '⚔️', impossible: '👑', deux: '👥' };
  const levelName = lv => ({ facile: L('Bot facile'), normal: L('Bot normal'), impossible: L('Bot impossible'), deux: L('À deux') })[lv];
  const levelDesc = lv => ({ facile: L('Pour apprendre.'), normal: L('Un vrai adversaire.'), impossible: L('Il calcule loin et apprend tes habitudes.'), deux: L('Deux joueurs sur le même écran.') })[lv];
  const catName = c => ({ M: L('Dieu'), G: L('Garde'), S: L('Soldat') })[c];
  const tn = i => I18N.name(T[i]);
  const td = i => I18N.desc(T[i]);
  // noms des deux camps (le joueur choisit son pseudo ; l'adversaire porte le nom de ce qu'il est)
  const PN = ['', ''];
  const sqName = q => { const g = G ? G.s.g : { W: 8, H: 8 }; return COLS[q % g.W] + (g.H - ((q / g.W) | 0)); };

  // ---------- sauvegarde ----------
  function lsGet(k, d) { try { const v = localStorage.getItem('stratajium.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem('stratajium.' + k, JSON.stringify(v)); } catch (e) { } }
  const ser = o => JSON.stringify(o, (k, v) => ArrayBuffer.isView(v) ? { __t: v.constructor.name, a: Array.from(v) } : v);
  const deser = str => JSON.parse(str, (k, v) => v && v.__t ? new self[v.__t](v.a) : v);
  const pseudo = () => lsGet('pseudo', '') || L('Joueur');
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // ---------- jetons SVG ----------
  document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="gr0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".55" stop-color="#e8b23e"/><stop offset="1" stop-color="#a86a12"/></linearGradient>
    <linearGradient id="gr1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6d8ff"/><stop offset=".55" stop-color="#9468f0"/><stop offset="1" stop-color="#4b2499"/></linearGradient>
    <linearGradient id="grn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4efe6"/><stop offset=".6" stop-color="#bdb3a3"/><stop offset="1" stop-color="#7d7364"/></linearGradient>
  </defs></svg>`);
  const GLYPH = {
    ma: 'F<polygon points="57,22 33,54 47,54 41,79 67,44 53,44 60,22"/>',
    mb: 'S<path d="M30 40 H68 M59 31 L68 40 L59 49 M70 62 H32 M41 53 L32 62 L41 71"/>',
    mc: 'S<path d="M32 28 H68 M50 24 V34 M36 28 L44 52 M64 28 L56 52"/><circle cx="50" cy="56" r="7" fill="C" stroke="none"/><path d="M50 63 V74 M42 70 H58"/>',
    md: 'F<path d="M28 44 H40 L64 30 V70 L40 56 H28 Z"/><path d="M70 40 Q76 50 70 60" fill="none" stroke="C" stroke-width="5" stroke-linecap="round"/>',
    me: 'S<circle cx="50" cy="50" r="21"/><path d="M50 37 V63 M37 50 H63"/>',
    pa: 'S<path d="M37 28 H63 L37 72 H63 Z"/><path d="M44 64 H56" stroke-width="8"/>',
    pb: 'S<path d="M26 66 H74 M30 52 L40 40 L47 56 L55 34 L62 54 L70 44"/>',
    pc: 'S<ellipse cx="50" cy="44" rx="19" ry="7"/><path d="M31 44 V62 Q50 72 69 62 V44 M33 24 L46 38 M67 24 L54 38"/>',
    pd: 'S<path d="M36 76 V26"/><path d="M36 28 H66 L57 39 L66 50 H36 Z" fill="C"/>',
    pe: 'S<path d="M41 47 V38 A9 9 0 0 1 59 38 V47"/><rect x="34" y="46" width="32" height="26" rx="4" fill="C" stroke="none"/>',
    pf: 'S<circle cx="50" cy="50" r="21"/><path d="M35 65 L65 35"/>',
    pg: 'F<path d="M50 24 Q68 47 66 58 A16 16 0 0 1 34 58 Q32 47 50 24 Z"/>',
    gu: 'F<path d="M50 70 C50 70 26 55 26 40 C26 30 36 24 44 28 C47 29.5 49 32 50 34 C51 32 53 29.5 56 28 C64 24 74 30 74 40 C74 55 50 70 50 70 Z"/>',
    dr: 'S<path d="M30 70 Q28 30 70 28 Q72 68 30 70 Z" fill="C"/><path d="M34 66 L64 34" stroke="#000" stroke-opacity=".35" stroke-width="4"/>',
    pr: 'S<ellipse cx="50" cy="27" rx="15" ry="5.5"/><path d="M50 38 L66 44 L64 60 Q60 70 50 74 Q40 70 36 60 L34 44 Z" fill="C"/>',
    g1: 'S<circle cx="40" cy="48" r="13"/><circle cx="60" cy="48" r="13"/>',
    g2: 'F<path d="M33 70 V36 H39 V28 H46 V36 H54 V28 H61 V36 H67 V70 Z"/>',
    g3: 'S<path d="M42 26 Q68 48 42 70 M42 26 V70 M28 48 H66 M59 41 L66 48 L59 55"/>',
    g4: 'S<path d="M50 40 C42 24 24 30 30 44 C34 52 43 49 41 42 M50 40 C58 24 76 30 70 44 C66 52 57 49 59 42 M43 46 L50 70 L57 46"/>',
    g5: 'S<path d="M34 50 L50 34 L66 50 M34 66 L50 50 L66 66"/>',
    g6: 'S<path d="M50 26 V36 M50 60 V70 M28 48 H38 M62 48 H72 M35 33 L41 39 M59 57 L65 63 M65 33 L59 39 M41 57 L35 63"/><circle cx="50" cy="48" r="7" fill="C" stroke="none"/>',
    g7: 'S<path d="M30 68 L43 50 L55 62 L69 38 M60 38 H69 V47"/>',
    c1: 'S<path d="M28 66 Q50 18 72 66 M63 61 L72 66 L74 56"/>',
    c2: 'F<path d="M50 24 Q68 42 61 70 H39 Q32 42 50 24 Z"/>',
    c3: 'S<path d="M26 48 Q50 28 74 48 Q50 68 26 48 Z"/><circle cx="50" cy="48" r="7" fill="C" stroke="none"/>',
    c4: 'S<path d="M28 46 Q50 32 72 46 M28 46 L50 54 L72 46 M50 26 V72 M43 33 L50 26 L57 33"/>',
    c5: 'S<circle cx="60" cy="38" r="9" fill="C" stroke="none"/><path d="M53 45 L30 68 M49 37 L31 53 M61 49 L46 68"/>',
    c6: 'S<path d="M43 26 H57 M46 26 V42 L31 70 H69 L54 42 V26"/><path d="M38 58 H62 L67 68 H33 Z" fill="C" stroke="none"/>',
    c7: 'S<circle cx="50" cy="48" r="15"/><path d="M50 24 V38 M50 58 V72 M26 48 H40 M60 48 H74"/>',
    c8: 'S<circle cx="39" cy="38" r="7"/><circle cx="61" cy="38" r="7"/><path d="M30 52 Q50 72 70 52"/>',
    lc: 'S<path d="M50 76 V34 M40 62 H60"/><path d="M50 18 L59 33 L50 39 L41 33 Z" fill="C"/>',
    cv: 'S<path d="M36 72 V34 H64"/><path d="M55 25 L64 34 L55 43"/>',
    gd: 'S<path d="M50 28 V68 M30 48 H70 M36 34 L64 62 M64 34 L36 62"/><circle cx="50" cy="48" r="7" fill="C" stroke="none"/>',
    s: 'S<path d="M28 58 A22 22 0 0 1 72 58 Z" fill="C"/><path d="M24 62 H76 M50 36 V24"/>',
  };
  function glyph(id, tc) {
    const g = GLYPH[id] || '';
    const body = g.slice(1).replace(/"C"/g, `"${tc}"`);
    return g[0] === 'F' ? `<g fill="${tc}">${body}</g>` : `<g fill="none" stroke="${tc}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
  }
  function token(ti, o) {
    const t = T[ti];
    const fill = o === 0 ? 'url(#gr0)' : o === 1 ? 'url(#gr1)' : 'url(#grn)';
    const stroke = o === 0 ? '#5a3a06' : o === 1 ? '#271055' : '#4a4338';
    const tc = o === 1 ? '#fff' : '#2b1c03';
    let shape, inner;
    if (t.cat === 'M') {
      shape = `<polygon points="50,3 91,26 91,74 50,97 9,74 9,26" fill="${fill}" stroke="${stroke}" stroke-width="5"/><path d="M35 22 L35 9 L43 15 L50 5 L57 15 L65 9 L65 22 Z" fill="${tc}" opacity=".85"/>`;
      inner = `<g transform="translate(50 57) scale(.9) translate(-50 -50)">${glyph(t.id, tc)}</g>`;
    } else if (t.cat === 'G') {
      shape = `<path d="M50 4 L90 17 L86 56 Q80 82 50 96 Q20 82 14 56 L10 17 Z" fill="${fill}" stroke="${stroke}" stroke-width="5"/>`;
      inner = `<g transform="translate(50 46) translate(-50 -48)">${glyph(t.id, tc)}</g>`;
    } else {
      shape = `<circle cx="50" cy="50" r="44" fill="${fill}" stroke="${stroke}" stroke-width="6"/>`;
      inner = glyph('s', tc);
    }
    return `<svg class="tk" viewBox="0 0 100 100">${shape}${inner}</svg>`;
  }
  const BRAMBLE = `<svg class="bramble" viewBox="0 0 100 100"><g fill="none" stroke-linecap="round">
    <path d="M10 70 Q30 30 55 45 T92 25" stroke="#5a7a2a" stroke-width="7"/><path d="M8 35 Q40 60 60 80 T95 72" stroke="#4a6a22" stroke-width="6"/>
    <path d="M22 50 l-6 -6 M40 40 l2 -8 M62 47 l6 -5 M80 33 l2 -8 M30 55 l-5 6 M52 70 l-7 3 M72 78 l3 7" stroke="#c9d89a" stroke-width="3"/></g>
    <g fill="#3f6a2a"><ellipse cx="45" cy="42" rx="7" ry="3.5" transform="rotate(-30 45 42)"/><ellipse cx="68" cy="76" rx="7" ry="3.5" transform="rotate(20 68 76)"/></g>
    <g fill="#b8323a"><circle cx="33" cy="58" r="3"/><circle cx="74" cy="32" r="3"/></g></svg>`;
  // cases spéciales : cristal de mana, bosquet
  const SPEC_SVG = [null,
    `<svg class="specic" viewBox="0 0 100 100"><polygon points="50,8 72,40 50,92 28,40" fill="#7fd3ff" stroke="#1a5a8a" stroke-width="5"/><polygon points="50,8 60,40 50,92" fill="#c4ecff" opacity=".7"/></svg>`,
    `<svg class="specic" viewBox="0 0 100 100"><circle cx="38" cy="55" r="22" fill="#3d7a35"/><circle cx="62" cy="50" r="24" fill="#4f9440"/><circle cx="50" cy="34" r="20" fill="#62a84e"/></svg>`];

  // ---------- réglages ----------
  const SET = Object.assign({ decor: 'auto', anim: 'normal', coords: true }, lsGet('reglages', {}));
  function applySettings() {
    document.body.classList.toggle('anim-off', SET.anim === 'aucune');
    document.body.classList.toggle('anim-fast', SET.anim === 'rapide');
    document.body.classList.toggle('no-coords', !SET.coords);
  }
  applySettings();

  // ---------- décors (ils changent tout seuls toutes les 3 à 7 minutes, et à chaque affrontement) ----------
  const bgDecor = Decor.create(), boardDecor = Decor.create();
  const bgSeed = 1 + rnd(1e6);
  let theme = SET.decor !== 'auto' && Decor.THEMES[SET.decor] ? SET.decor : pick(Decor.THEME_IDS);
  const otherTheme = () => pick(Decor.THEME_IDS.filter(t => t !== theme));
  function setTheme(t, quiet) {
    if (t === theme) return;
    theme = t;
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
    resizeT = setTimeout(() => { bgDecor.scene($('bgForest'), bgSeed, theme); if (G && $('game').classList.contains('on')) layoutBoard(); }, 200);
  });

  // ---------- écrans ----------
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id !== 'game') boardDecor.stop();
    if (id === 'menu' || id === 'newrun' || id === 'run') Sound.want(['menu']);
  }
  let toastT = 0;
  function toast(txt) { const t = $('toast'); t.textContent = txt; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3000); }
  document.addEventListener('click', e => { if (e.target.closest('button, .chip.click, .lvl, .evo, .choice')) sfx('clic', .7); }, true);
  function translateStatic() {
    document.documentElement.lang = I18N.lang;
    document.querySelectorAll('[data-l]').forEach(el => { el.textContent = L(el.getAttribute('data-l')); });
    $('btnMusic').title = L('Musique (M)'); $('btnSfx').title = L('Effets sonores (N)'); $('btnSet').title = L('Paramètres (O)');
    $('btnUndo').title = L('Revenir un coup en arrière (Ctrl+Z ou U)');
  }

  // =====================================================================
  //  Parties : 3 emplacements
  // =====================================================================
  let RUNS = lsGet('runs', null);
  if (!Array.isArray(RUNS) || RUNS.length !== 3) RUNS = [null, null, null];
  const saveRuns = () => lsSet('runs', RUNS);
  let cur = -1, newSlot = 0;
  const run = () => RUNS[cur];
  // progression : ce qu'il faut gagner pour débloquer chaque chose
  const TRACKS = {
    gard: { normal: 3, hardStreak: 2 },  // nouveau garde : 3 victoires normales, ou 2 difficiles d'affilée
    god: { normal: 5, hard: 3 },         // nouveau dieu : 5 victoires normales, ou 3 difficiles
    map: 3,                              // carte plus sauvage : toutes les 3 victoires
    event: 4,                            // +25 % d'événements : toutes les 4 victoires
  };
  // handicaps possibles d'un affrontement difficile (le bot ne triche jamais : c'est toi qui pars avec un handicap)
  const HARD = ['mana', 'riche', 'avance', 'premier', 'sauvage', 'evenement', 'dieupris'];
  const hardName = id => ({
    mana: L('Tu commences avec 60 mana au lieu de 100'), riche: L('L’adversaire commence avec 160 mana'),
    avance: L('L’adversaire a déjà un garde posé'), premier: L('L’adversaire joue en premier'),
    sauvage: L('Carte plus sauvage d’un niveau'), evenement: L('Un événement à coup sûr'), dieupris: L('L’adversaire a déjà recruté un dieu'),
  })[id];
  function newRun(level, names) {
    return {
      level, names: names || null, gods: E.START_M.slice(), gards: E.START_G.slice(), mapLv: 0, evChance: 0,
      wins: 0, winsH: 0, losses: 0, winsC: [0, 0], n: 1, match: null, pending: [], news: [],
      t: { gN: 0, gH: 0, dN: 0, dH: 0, map: 0, ev: 0 }, hard: shuffle(HARD).slice(0, 2), created: Date.now(),
    };
  }
  function migrate(r) {
    if (!r) return r;
    if (!r.t) r.t = { gN: 0, gH: 0, dN: 0, dH: 0, map: 0, ev: 0 };
    if (!r.hard) r.hard = shuffle(HARD).slice(0, 2);
    if (!Array.isArray(r.pending)) r.pending = [];
    if (!r.news) r.news = [];
    if (r.winsH === undefined) r.winsH = 0;
    return r;
  }
  RUNS = RUNS.map(migrate);

  // ---------- menu ----------
  function renderMenu() {
    $('hello').innerHTML = L('Bonjour, <b>{p}</b> !', { p: esc(pseudo()) });
    let h = '';
    RUNS.forEach((r, i) => {
      if (!r) { h += `<div class="slot empty"><div class="num">${i + 1}</div><div class="inf"><b>${L('Emplacement libre')}</b><small>${L('Commence une nouvelle partie.')}</small></div><div class="acts"><button class="big" data-new="${i}">${L('Nouvelle partie')}</button></div></div>`; return; }
      const wl = r.level === 'deux' ? `${esc(r.names ? r.names[0] : 'Or')} ${r.winsC[0]} · ${esc(r.names ? r.names[1] : 'Améthyste')} ${r.winsC[1]}`
        : L('{w} victoire(s) dont {h} difficile(s) · {l} défaite(s)', { w: r.wins, h: r.winsH, l: r.losses });
      h += `<div class="slot"><div class="num">${i + 1}</div><div class="inf"><b>${LEVELIC[r.level]} ${levelName(r.level)}</b>
        <small>${wl} · ${L('affrontement n°{n}', { n: r.n })}${r.match ? ' ' + L('(en cours)') : ''}</small>
        <small>${L('{g} dieux · {a} gardes · carte niv. {m} · événements {e} %', { g: r.gods.length, a: r.gards.length, m: r.mapLv, e: r.evChance })}</small></div>
        <div class="acts"><button class="big" data-open="${i}">${L('Continuer')}</button><button class="ghost sm danger" data-del="${i}">${L('Supprimer')}</button></div></div>`;
    });
    $('slots').innerHTML = h;
    $('slots').querySelectorAll('[data-new]').forEach(b => b.onclick = () => { newSlot = +b.dataset.new; renderLevels(); show('newrun'); });
    $('slots').querySelectorAll('[data-open]').forEach(b => b.onclick = () => openRun(+b.dataset.open));
    $('slots').querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      if (b.dataset.sure) { RUNS[+b.dataset.del] = null; saveRuns(); renderMenu(); sfx('annule'); return; }
      b.dataset.sure = 1; b.textContent = L('Sûr ? Re-clique'); setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = L('Supprimer'); } }, 2500);
    });
    renderDaily();
  }
  function renderLevels() {
    $('duoNames').hidden = true;
    $('levels').innerHTML = LEVELS.map(lv => `<button class="lvl" data-lv="${lv}"><span class="ic">${LEVELIC[lv]}</span><b>${levelName(lv)}</b><small>${levelDesc(lv)}</small></button>`).join('');
    $('levels').querySelectorAll('[data-lv]').forEach(b => b.onclick = () => {
      const lv = b.dataset.lv;
      if (lv !== 'deux') { RUNS[newSlot] = newRun(lv); saveRuns(); openRun(newSlot); return; }
      // à deux : chacun donne son nom
      $('duoNames').hidden = false;
      $('duoNames').innerHTML = `<div class="opt"><h3>${L('Les noms des deux joueurs')}</h3>
        <div class="names"><input id="nm0" maxlength="18" value="${esc(pseudo())}" placeholder="${L('Joueur 1')}"><input id="nm1" maxlength="18" value="" placeholder="${L('Joueur 2')}"></div>
        <div class="menu-actions"><button class="big" id="btnDuoGo">${L('Commencer')}</button></div></div>`;
      $('nm1').focus();
      $('btnDuoGo').onclick = () => {
        const a = ($('nm0').value.trim() || L('Joueur 1')).slice(0, 18), b2 = ($('nm1').value.trim() || L('Joueur 2')).slice(0, 18);
        RUNS[newSlot] = newRun('deux', [a, b2]); saveRuns(); openRun(newSlot);
      };
    });
  }
  $('btnNewBack').onclick = () => { renderMenu(); show('menu'); };
  function toggleMusic() { Sound.setMusic(!Sound.music); $('btnMusic').classList.toggle('off', !Sound.music); }
  function toggleSfx() { Sound.setEffects(!Sound.effects); $('btnSfx').classList.toggle('off', !Sound.effects); }
  $('btnMusic').onclick = toggleMusic; $('btnSfx').onclick = toggleSfx;
  $('btnMusic').classList.toggle('off', !Sound.music); $('btnSfx').classList.toggle('off', !Sound.effects);
  if (isDesktop) { $('btnQuit').hidden = false; $('btnQuit').onclick = () => window.close(); }

  // ---------- écran de la partie ----------
  function openRun(i) {
    cur = i;
    renderRun();
    show('run');
    nextReward();
  }
  function chips(ids, all) {
    return all.map(id => { const i = E.TI[id], on = ids.includes(id); return `<span class="chip ${on ? '' : 'locked'}" data-info="${i}" title="${on ? esc(tn(i)) : L('À découvrir')}">${token(i, on ? 0 : -1)}${on ? tn(i) : '?'}</span>`; }).join('');
  }
  function bar(v, max, label) { return `<div class="trk"><span>${label}</span><div class="meter"><i style="width:${Math.min(100, 100 * v / max)}%"></i></div><small>${v}/${max}</small></div>`; }
  function renderRun() {
    const r = run(), deux = r.level === 'deux', t = r.t;
    const nm = r.names || [pseudo(), levelName(r.level)];
    const allG = r.gards.length >= E.ALL_G.length, allD = r.gods.length >= E.ALL_M.length;
    let h = `<h2 class="title">${L('Partie {n}', { n: cur + 1 })} · ${LEVELIC[r.level]} ${levelName(r.level)}</h2>
      <div class="runhead">
        <div class="stat"><b>${r.n}</b><small>${L('affrontement')}</small></div>
        ${deux ? `<div class="stat w"><b>${r.winsC[0]}</b><small>${esc(nm[0])}</small></div><div class="stat l"><b>${r.winsC[1]}</b><small>${esc(nm[1])}</small></div>`
        : `<div class="stat w"><b>${r.wins}</b><small>${L('victoires')}</small></div><div class="stat"><b>${r.winsH}</b><small>${L('dont difficiles')}</small></div><div class="stat l"><b>${r.losses}</b><small>${L('défaites')}</small></div>`}
      </div>
      <div class="cols2"><div>
      <div class="unl"><h4>${L('Dieux dans la réserve')} (${r.gods.length}/${E.ALL_M.length})</h4><div class="row">${chips(r.gods, E.ALL_M)}</div></div>
      <div class="unl"><h4>${L('Gardes dans la réserve')} (${r.gards.length}/${E.ALL_G.length}, ${L('2 de chaque')})</h4><div class="row">${chips(r.gards, E.ALL_G)}</div></div>
      </div><div>
      <div class="unl"><h4>${L('Progression')}</h4>
        ${allG ? `<div class="trk done">${L('Tous les gardes sont débloqués')}</div>` : (deux ? bar(t.gN, TRACKS.gard.normal, L('Nouveau garde : victoires')) : bar(t.gN, TRACKS.gard.normal, L('Nouveau garde : victoires normales')) + bar(t.gH, TRACKS.gard.hardStreak, L('… ou victoires difficiles d’affilée')))}
        ${allD ? `<div class="trk done">${L('Tous les dieux sont débloqués')}</div>` : (deux ? bar(t.dN, TRACKS.god.normal, L('Nouveau dieu : victoires')) : bar(t.dN, TRACKS.god.normal, L('Nouveau dieu : victoires normales')) + bar(t.dH, TRACKS.god.hard, L('… ou victoires difficiles')))}
        ${r.mapLv >= 4 ? `<div class="trk done">${L('Cartes au maximum')}</div>` : bar(t.map, TRACKS.map, L('Carte plus sauvage (niv. {n}/4) : victoires', { n: r.mapLv }))}
        ${r.evChance >= 100 ? `<div class="trk done">${L('Événements à chaque affrontement')}</div>` : bar(t.ev, TRACKS.event, L('Événements +25 % ({e} % aujourd’hui) : victoires', { e: r.evChance }))}
      </div></div></div>
      <p class="muted center">${L('Celui qui commence est tiré au sort à chaque affrontement.')}</p>`;
    if (r.match) h += `<div class="menu-actions"><button class="big" id="btnResume">${L('Reprendre l’affrontement n°{n}', { n: r.n })}</button><button class="ghost danger" id="btnForfeit">${L('Abandonner l’affrontement')}</button></div>`;
    else if (deux) h += `<div class="menu-actions"><button class="big" id="btnStart" data-mode="normal">${L('Lancer l’affrontement n°{n}', { n: r.n })}</button></div>`;
    else h += `<div class="choices">
        <button class="choice" id="btnStart" data-mode="normal"><span class="ic">⚔️</span><b>${L('Affrontement normal')}</b><small>${L('Compte pour les victoires normales.')}</small><kbd>Entrée</kbd></button>
        <button class="choice hard" id="btnHard" data-mode="hard"><span class="ic">🔥</span><b>${L('Affrontement difficile')}</b><small>${r.hard.map(hardName).join('<br>')}</small><small class="gold">${L('Débloque plus vite les gardes et les dieux.')}</small><kbd>D</kbd></button>
      </div>`;
    h += `<div class="menu-actions"><button class="ghost" id="btnRunCodex">${L('📖 Codex')}</button><button class="ghost" id="btnRunMenu">${L('← Menu')}</button></div>`;
    $('runBox').innerHTML = h;
    $('runBox').querySelectorAll('[data-info]').forEach(c => c.onclick = () => { if (!c.classList.contains('locked')) toast(`${tn(+c.dataset.info)} : ${td(+c.dataset.info)}`); });
    if ($('btnStart')) $('btnStart').onclick = () => startMatch('normal');
    if ($('btnHard')) $('btnHard').onclick = () => startMatch('hard');
    if ($('btnResume')) $('btnResume').onclick = resumeMatch;
    if ($('btnForfeit')) $('btnForfeit').onclick = e => {
      const b = e.currentTarget;
      if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = r.level === 'deux' ? L('Sûr ? Re-clique') : L('Sûr ? Ça compte comme une défaite'); return; }
      r.match = null; if (r.level !== 'deux') { r.losses++; r.t.gH = 0; } r.n++; r.hard = shuffle(HARD).slice(0, 2); saveRuns(); sfx('annule'); renderRun();
    };
    $('btnRunCodex').onclick = () => openCodex('progression');
    $('btnRunMenu').onclick = () => { renderMenu(); show('menu'); };
  }

  // ---------- récompenses (après une victoire) ----------
  function grantRewards(r, hard, winner) {
    const t = r.t;
    if (hard) { t.gH++; t.dH++; } else { t.gN++; t.dN++; t.gH = 0; }
    t.map++; t.ev++;
    const lockM = E.ALL_M.filter(x => !r.gods.includes(x)), lockG = E.ALL_G.filter(x => !r.gards.includes(x));
    if (lockG.length && (t.gN >= TRACKS.gard.normal || t.gH >= TRACKS.gard.hardStreak)) { r.pending.push({ k: 'gard', opts: shuffle(lockG).slice(0, 3), by: winner }); t.gN = 0; t.gH = 0; }
    if (lockM.length && (t.dN >= TRACKS.god.normal || t.dH >= TRACKS.god.hard)) { r.pending.push({ k: 'god', opts: shuffle(lockM).slice(0, 3), by: winner }); t.dN = 0; t.dH = 0; }
    if (t.map >= TRACKS.map) { t.map = 0; if (r.mapLv < 4) { r.mapLv++; r.news.push(L('🗺️ Cartes plus sauvages : niveau {n} — {d}', { n: r.mapLv, d: I18N.mapLevel(r.mapLv) })); } }
    if (t.ev >= TRACKS.event) { t.ev = 0; if (r.evChance < 100) { r.evChance += 25; r.news.push(L('🎲 Chance d’événement : {e} %', { e: r.evChance })); } }
  }
  // affiche les nouveautés, puis un choix de nouveau garde / dieu s'il y en a un en attente
  function nextReward() {
    const r = run();
    if (!r) return;
    if (r.news.length) { toast(r.news.join(' · ')); r.news = []; saveRuns(); sfx('evolution'); }
    const pd = r.pending[0];
    if (!pd) return;
    const nm = r.names || [pseudo(), ''];
    $('evoTitle').textContent = pd.k === 'god' ? L('Nouveau dieu débloqué !') : L('Nouveau garde débloqué !');
    $('evoSub').textContent = (r.level === 'deux' && pd.by !== undefined ? nm[pd.by] + ' : ' : '') + L('Choisis celui qui rejoint la réserve pour tous les prochains affrontements.');
    $('evos').innerHTML = pd.opts.map((id, k) => { const i = E.TI[id], t = T[i]; return `<button class="evo" data-k="${k}"><div class="kind">${pd.k === 'god' ? L('Dieu') : L('Garde')} · <kbd>${k + 1}</kbd></div>${token(i, 0)}<b>${tn(i)}</b><p>${td(i)}${t.cost ? ` <br><span style="color:var(--mana)">💎 ${t.cost} mana</span>` : ''}</p></button>`; }).join('');
    $('evoModal').hidden = false;
    sfx('evolution');
    $('evos').querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      const id = pd.opts[+b.dataset.k];
      if (pd.k === 'god') r.gods.push(id); else r.gards.push(id);
      r.pending.shift(); saveRuns();
      $('evoModal').hidden = true;
      renderRun();
      nextReward();
    });
  }

  // =====================================================================
  //  Défi du jour : même carte, même réserve et même objectif pour tout le monde ce jour-là
  // =====================================================================
  const DAILY = ['vite', 'survie', 'propre', 'carnage'];
  const dailyName = id => ({ vite: L('Éclair'), survie: L('Survie'), propre: L('Sans une égratignure'), carnage: L('Carnage') })[id];
  const dailyDesc = id => ({
    vite: L('Gagne en jouant le moins de tours possible.'), survie: L('Le bot impossible veut ta peau : tiens le plus de tours possible (et gagne si tu peux).'),
    propre: L('Gagne en perdant le moins de persos possible.'), carnage: L('Tue le plus de persos possible en 25 de tes tours.'),
  })[id];
  function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function hashStr(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) || 1; }
  function dailyCfg() {
    const date = today(), seed = hashStr('stratajium-' + date);
    return E.withSeed(seed, () => {
      const goal = DAILY[rnd(DAILY.length)];
      const level = goal === 'survie' ? 'impossible' : (Math.random() < .5 ? 'normal' : 'impossible');
      const evs = E.EVENTS.filter(e => e.id !== 'objectif' && e.id !== 'pari');
      return {
        date, seed, goal, level, perso: pick(Object.keys(E.PERSOS)),
        gods: shuffle(E.ALL_M).slice(0, 5), gards: shuffle(E.ALL_G).slice(0, 6),
        mapLv: 3 + rnd(2), ev: Math.random() < .4 ? pick(evs).id : null, first: rnd(2), mapSeed: 1 + rnd(1e9),
      };
    });
  }
  function dailyData() { return Object.assign({ total: 0, days: {} }, lsGet('daily', {})); }
  function renderDaily() {
    const c = dailyCfg(), d = dailyData(), best = d.days[c.date];
    $('dailyBox').innerHTML = `<h2>${L('Défi du jour')}</h2>
      <div class="pts">${d.total}<small>${L('points de défi du jour')}</small></div>
      <div class="botrec"><div class="bh">🎯 ${dailyName(c.goal)}</div><div class="wins">${dailyDesc(c.goal)}</div>
      <div class="wins">${LEVELIC[c.level]} ${levelName(c.level)} · ${I18N.persoName(c.perso)}${c.ev ? ' · 🎲 ' + I18N.evName(c.ev) : ''}</div></div>
      <p class="center">${best ? L('Ton meilleur score aujourd’hui : <b>{p} points</b>', { p: best.best }) : L('Pas encore joué aujourd’hui.')}</p>
      <div class="menu-actions"><button class="big" id="btnDaily">${best ? L('Rejouer le défi') : L('Jouer le défi')}</button></div>
      <p class="learn">${L('Nouveau défi chaque jour. Seul ton meilleur score du jour compte.')}</p>`;
    $('btnDaily').onclick = startDaily;
  }
  function dailyScore(G) {
    const s = G.s, c = G.daily, w = s.winner, my = Math.ceil((s.ply + (s.first0 === 0 ? 1 : 0)) / 2);
    const lostMe = s.lost[0][0] + s.lost[0][1] + s.lost[0][2], kills = s.lost[1][0] + s.lost[1][1] + s.lost[1][2];
    if (c.goal === 'vite') return w === 0 ? Math.max(10, 120 - 2 * my) : 0;
    if (c.goal === 'survie') return Math.min(200, my * 2 + (w === 0 ? 60 : 0));
    if (c.goal === 'propre') return w === 0 ? Math.max(10, 100 - 12 * lostMe) : 0;
    return kills * 10 + (w === 0 ? 20 : 0);
  }
  function startDaily() {
    const c = dailyCfg();
    cur = -1;
    const map = E.withSeed(c.mapSeed, () => E.makeMap('aleatoire', c.mapLv));
    pre = { ev: c.ev, map, first: c.first, bet: [null, null], humans: [true, false], level: c.level, mode: 'daily', daily: c, perso: c.perso, gods: c.gods, gards: c.gards };
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
    const r = run(), hard = mode === 'hard';
    const hs = hard ? r.hard : [];
    const mapLv = Math.min(4, r.mapLv + (hs.includes('sauvage') ? 1 : 0));
    let ev = hs.includes('evenement') || Math.random() * 100 < r.evChance ? pickEvent() : null;
    const map = E.makeMap(mapLv === 0 ? 'classique' : 'aleatoire', mapLv);
    const first = hs.includes('premier') ? 1 : rnd(2);
    pre = { ev, map, first, bet: [null, null], humans: r.level === 'deux' ? [true, true] : [true, false], level: r.level === 'deux' ? null : r.level, mode, hard: hs, perso: r.level === 'deux' ? null : pick(Object.keys(E.PERSOS)), gods: r.gods, gards: r.gards };
    if (!ev && !hard) return beginMatch();
    showPre(false);
  }
  function showPre(daily) {
    let h = '';
    if (daily) {
      const c = pre.daily;
      h += `<h2 class="title">${L('Défi du jour')}</h2><div class="evcard"><b>🎯 ${dailyName(c.goal)}</b>${dailyDesc(c.goal)}</div>
        <p class="center">${LEVELIC[c.level]} ${levelName(c.level)} · ${I18N.persoName(c.perso)} · ${I18N.mapName(pre.map)}</p>`;
    }
    if (pre.mode === 'hard') h += `<h2 class="title">🔥 ${L('Affrontement difficile')}</h2><div class="evcard hardc">${pre.hard.map(x => '• ' + hardName(x)).join('<br>')}</div>`;
    if (pre.ev) {
      const e = E.EVENTS.find(x => x.id === pre.ev);
      h += `<h2 class="title">${L('Événement !')}</h2><div class="evcard"><b>🎲 ${I18N.evName(e.id)}</b>${I18N.evDesc(e.id)}</div>`;
      if (pre.ev === 'objectif' && !pre.goal) pre.goal = pick(E.GOALS).id;
      if (pre.goal) h += `<div class="evcard"><b>🎯 ${I18N.goalName(pre.goal)}</b>${I18N.goalDesc(pre.goal)}</div>`;
    }
    if (pre.ev === 'pari') {
      if (!pre.humans[1] && pre.bet[1] === null) pre.bet[1] = pre.level === 'facile' ? rnd(2) : 0;
      const nm = curNames();
      for (const p of [0, 1]) {
        if (!pre.humans[p]) { h += `<p class="center">${L('{b} parie que <b>{x}</b> perdra en premier.', { b: esc(nm[p]), x: esc(nm[pre.bet[p]]) })}</p>`; continue; }
        h += `<div class="opt"><h3>${L('{p} parie : qui perdra en premier un dieu ou 2 gardes ?', { p: esc(nm[p]) })}</h3>
          <div class="seg" data-bet="${p}">${[0, 1].map(v => `<button data-v="${v}" class="${pre.bet[p] === v ? 'sel' : ''}">${esc(nm[v])}</button>`).join('')}</div></div>`;
      }
    }
    const ready = pre.ev !== 'pari' || (pre.bet[0] !== null && pre.bet[1] !== null);
    h += `<div class="menu-actions"><button class="big" id="btnGo" ${ready ? '' : 'disabled'}>${L('Commencer l’affrontement')}</button><button class="ghost" id="btnPreBack">${L('Retour')}</button></div>`;
    $('preBox').innerHTML = h;
    $('preBox').querySelectorAll('[data-bet]').forEach(seg => seg.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; pre.bet[+seg.dataset.bet] = +b.dataset.v; showPre(daily); });
    $('btnGo').onclick = () => { if (ready) beginMatch(); };
    $('btnPreBack').onclick = () => { if (pre.mode === 'daily') { renderMenu(); show('menu'); } else { openRun(cur); } };
    show('pre'); sfx('sort');
  }
  // noms des deux camps pour l'affrontement en préparation / en cours
  function curNames() {
    if (pre && pre.mode === 'daily') return [pseudo(), levelName(pre.level)];
    const r = run();
    if (r && r.level === 'deux') return r.names || [L('Joueur 1'), L('Joueur 2')];
    const lv = pre ? pre.level : r.level, ps = pre ? pre.perso : null;
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
    return Object.assign({ id: gid, s, humans: [true, false], level: null, mode: 'normal', perso: null, daily: null, hard: [],
      sel: null, legal: null, ver: 0, over: false, thinking: false, history: [], usage: {}, seed: 1 + rnd(1e6), lastA: null, recorded: false, names: ['', ''] }, extra || {});
  }
  function beginMatch() {
    const opts = { event: pre.ev, first: pre.first, map: pre.map, gods: pre.gods, gards: pre.gards, goal: pre.goal };
    const hs = pre.hard || [];
    const s = E.newGame(opts);
    if (pre.ev === 'pari') s.bet = pre.bet.slice();
    // handicaps d'un affrontement difficile
    if (hs.includes('mana')) s.mana[0] = 60;
    if (hs.includes('riche')) s.mana[1] = 160;
    if (hs.includes('avance')) { const z = shuffle(s.g.zl[1].filter(q => s.b[q] === 0)); const gid2 = pick(pre.gards); if (z.length) s.b[z[0]] = E.enc(E.TI[gid2], 1); }
    if (hs.includes('dieupris')) { const av = pre.gods.filter(id => s.pool[E.TI[id]] > 0); if (av.length) { const i = E.TI[pick(av)]; s.pool[i]--; s.res[1][i]++; } }
    G = newG(s, { humans: pre.humans, level: pre.level, mode: pre.mode, perso: pre.perso, daily: pre.daily || null, hard: hs, names: curNames() });
    $('log').innerHTML = '';
    if (SET.decor === 'auto') { setTheme(otherTheme(), true); scheduleTheme(); }
    sys(L('Carte : {m}.', { m: I18N.mapName(s.g) }));
    if (s.ev) sys(L('Événement : {e}.', { e: I18N.evName(s.ev) }));
    if (s.goal) sys(L('Objectif : {g}.', { g: I18N.goalName(s.goal) }));
    sys(L('Tirage au sort : {p} commence.', { p: G.names[pre.first] }));
    if (s.phase === 'draft') sys(L('Draft : on se partage toute la réserve, chacun son tour.'));
    enterGame();
    saveMatch();
  }
  function resumeMatch() {
    const r = run();
    let d;
    try { d = deser(r.match); } catch (e) { r.match = null; saveRuns(); renderRun(); return toast(L('Affrontement illisible : il a été effacé.')); }
    G = newG(d.s, { humans: r.level === 'deux' ? [true, true] : [true, false], level: r.level === 'deux' ? null : r.level, mode: d.mode || 'normal', perso: d.perso || null, hard: d.hard || [], seed: d.seed || 1, lastA: d.lastA || null, usage: d.usage || {} });
    pre = { level: G.level, perso: G.perso, mode: G.mode };
    G.names = curNames();
    $('log').innerHTML = d.log || '';
    sys(L('Affrontement repris.'));
    enterGame();
  }
  function saveMatch() {
    if (!G || G.mode === 'daily' || cur < 0) return;
    const r = run();
    r.match = G.over ? null : ser({ s: G.s, log: $('log').innerHTML, seed: G.seed, lastA: G.lastA, usage: G.usage, mode: G.mode, perso: G.perso, hard: G.hard });
    saveRuns();
  }
  function enterGame() {
    PN[0] = G.names[0]; PN[1] = G.names[1];
    $('endModal').hidden = true;
    $('evBadge').hidden = !G.s.ev;
    if (G.s.ev) { $('evBadge').textContent = '🎲 ' + I18N.evName(G.s.ev); $('evBadge').title = I18N.evDesc(G.s.ev); }
    $('goalBadge').hidden = !(G.s.goal || G.daily);
    if (G.s.goal) { $('goalBadge').textContent = '🎯 ' + I18N.goalName(G.s.goal); $('goalBadge').title = I18N.goalDesc(G.s.goal); }
    else if (G.daily) { $('goalBadge').textContent = '🎯 ' + dailyName(G.daily.goal); $('goalBadge').title = dailyDesc(G.daily.goal); }
    $('mapBadge').textContent = '🗺️ ' + I18N.mapName(G.s.g);
    const r = run();
    $('runBadge').textContent = G.mode === 'daily' ? L('Défi du jour') : L('Partie {n} · affrontement {a}', { n: cur + 1, a: r.n }) + (G.mode === 'hard' ? ' · 🔥' : '');
    show('game');
    buildBoard(G.s.g);
    layoutBoard(); render(); maybeBot();
    requestAnimationFrame(() => { if (G && $('game').classList.contains('on')) { layoutBoard(); render(); } });
  }
  function legal() {
    if (!G.legal || G.legalVer !== G.ver) { G.legal = E.gen(G.s, true); G.legalVer = G.ver; }
    return G.legal;
  }
  const humanTurn = () => G && !G.over && G.humans[G.s.turn];

  // ---------- bot ----------
  function maybeBot() {
    if (!G || G.over || G.humans[G.s.turn] || G.thinking) return;
    G.thinking = true;
    const id = G.id, ver = G.ver, t0 = performance.now();
    const opt = { perso: G.perso };
    if (G.level === 'impossible') {
      // ~5 s par coup, jusqu'à 7 s quand la position est délicate
      opt.budget = 5500; opt.maxMs = 6700; opt.canExtend = true;
      const ad = lsGet('adapt', null);
      if (ad) {
        const mx = Math.max(1, ...Object.values(ad.freq || {}));
        const opp = {}; for (const k in ad.freq || {}) opp[k] = ad.freq[k] / mx;
        opt.adapt = { wG: ad.wG || 1, wM: ad.wM || 1, opp };
      }
    }
    renderPlayers();
    askBot(G.s, G.level, opt, a => {
      const wait = Math.max(0, (SET.anim === 'normal' ? 550 : 200) - (performance.now() - t0));
      setTimeout(() => {
        if (!G || G.id !== id || G.ver !== ver || G.over) return;
        G.thinking = false;
        doAction(a);
      }, wait);
    });
  }

  // ---------- exécution d'une action ----------
  function doAction(a) {
    const s = G.s, p = s.turn, before = E.clone(s);
    if (G.humans[p]) {
      G.history.push({ s: before, log: $('log').innerHTML, lastA: G.lastA });
      if (G.history.length > 300) G.history.shift();
      if (!(G.humans[0] && G.humans[1])) {
        const k = a.k === 'act' ? T[E.tix(s.b[a.from])].id : a.k === 'rec' ? 'rec:' + T[a.t].id : null;
        if (k) G.usage[k] = (G.usage[k] || 0) + 1;
      }
    }
    const betBefore = s.betDone, holdBefore = s.hold ? s.hold.slice() : null, manaBefore = s.mana.slice();
    s._dead = []; s._martyr = 0;
    E.apply(s, a);
    const dead = s._dead; s._dead = null;
    G.ver++; G.sel = null;
    logLine(describe(before, a, dead), p);
    if (a.k === 'pioche' && G.humans[p]) toast(L('Tu as pioché : {x}', { x: tn(a.t) }));
    if (s._martyr) { sys(L('{p} gagne {m} mana (Martyr).', { p: PN[s.turn], m: s._martyr })); sfx('mana', 1, 400); }
    if (!betBefore && s.betDone) sys(L('Pari : {p} perd en premier !', { p: PN[s.betLoser] }));
    if (s.phase === 'play' && before.phase === 'draft') sys(L('Draft terminé, l’affrontement commence.'));
    if (holdBefore) for (const q of [0, 1]) if (s.hold[q] > holdBefore[q]) sys(L('{p} tient le centre : {n}/3.', { p: PN[q], n: s.hold[q] }));
    if (s.turn !== before.turn && s.mana[s.turn] > manaBefore[s.turn] + (s._martyr || 0) && a.k !== 'act') sys(L('{p} reçoit du mana (sources, marée…).', { p: PN[s.turn] }));
    G.lastA = a;
    render();
    animate(before, s, a, dead);
    // défi « Carnage » : fini au bout de 25 de tes tours
    if (G.daily && G.daily.goal === 'carnage' && s.winner === null && Math.ceil((s.ply + (s.first0 === 0 ? 1 : 0)) / 2) > 25) { s.winner = 2; s.why = L('25 tours joués.'); }
    if (s.winner !== null) endGame(); else saveMatch();
    maybeBot();
  }

  // ---------- animations et sons ----------
  const fxEl = $('fx');
  function sqXY(q) { const g = G.s.g; return { x: (q % g.W) * G.sq, y: ((q / g.W) | 0) * G.sq }; }
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
    const d = document.createElement('div');
    const { x, y } = sqXY(q);
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
    const svg = `<svg width="${S}" height="${S - top}" viewBox="0 ${top} ${S} ${S - top}" style="position:absolute;left:0;top:${top}px;overflow:visible"><polyline points="${pts.join(' ')}" fill="none" stroke="#eaf6ff" stroke-width="4" stroke-linejoin="round"/></svg>`;
    addFx('bolt', q, svg, { life: 700 });
  }
  function arrowFx(from, to) {
    const a = sqXY(from), b = sqXY(to), S = G.sq;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const d = document.createElement('div');
    d.className = 'fxe arrow';
    d.style.left = (a.x + S / 2) + 'px'; d.style.top = (a.y + S / 2 - 2) + 'px'; d.style.width = len + 'px';
    d.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    fxEl.appendChild(d); setTimeout(() => d.remove(), 500);
  }
  function pcEl(q) { return sqEls[q] && sqEls[q].querySelector('.pc'); }
  function slide(el, pts, dur) {
    if (!el || !el.animate || SET.anim === 'aucune') return;
    if (SET.anim === 'rapide') dur *= .5;
    el.animate(pts.map(([x, y]) => ({ transform: `translate(${x}px, ${y}px)` })), { duration: dur, easing: 'cubic-bezier(.3,.7,.3,1)' });
  }
  function animate(before, after, a, dead) {
    if (!G.sq) return;
    const g = after.g;
    const id = a.k === 'act' && before.b[a.from] > 0 ? T[E.tix(before.b[a.from])].id : null;
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
    for (const q of dead) {
      const c = before.b[q];
      if (c > 0) { const d = addFx('ghost-pc', q, token(E.tix(c), E.own(c)), { size: .86, life: 800 }); d.style.animationDelay = (moved ? 120 : 0) + 'ms'; }
      setTimeout(() => sparks(q, 12), moved ? 140 : 20);
    }
    if (a.k === 'rec' || a.k === 'draft' || a.k === 'pioche') sfx('recrute');
    else if (a.k === 'pla') sfx('poser');
    else if (a.k === 'decl') sfx('choix');
    else if (a.k === 'act') {
      const from = a.from, nums = a.cl.filter(v => typeof v === 'number');
      switch (id) {
        case 'ma': { E.areaOf(g, 'ma', a.cl[0]).forEach((q, i) => setTimeout(() => addFx('flash', q, '', { life: 600 }), i * 25)); for (const q of dead) bolt(q); addFx('ring', from, '', { color: '#bfe6ff', size: 1.4 }); sfx('foudre'); break; }
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
    if (dead.length) { sfx('coup', 1, 80); sfx('prise', .8, 120); }
  }

  // ---------- fin d'un affrontement ----------
  function endGame() {
    if (G.over) return;
    G.over = true; G.sel = null; G.thinking = false;
    const s = G.s, w = s.winner, duo = G.humans[0] && G.humans[1];
    let title;
    if (G.mode === 'daily') title = L('Défi terminé');
    else if (w === 2) title = L('Match nul');
    else if (duo) title = L('Victoire de {p} !', { p: PN[w] });
    else title = w === 0 ? L('Victoire !') : L('Défaite…');
    $('endTitle').textContent = title;
    $('endTitle').style.color = w === 2 ? '' : (w === 0 ? 'var(--gold)' : 'var(--vio)');
    $('endWhy').textContent = I18N.why(s.why);
    $('endScore').textContent = '';
    const humanWon = w === 0 && !duo;
    let rewards = false;
    if (!G.recorded) {
      G.recorded = true;
      if (G.mode === 'daily') {
        const pts = dailyScore(G), d = dailyData(), c = G.daily, old = d.days[c.date];
        if (!old || pts > old.best) { d.total += pts - (old ? old.best : 0); d.days[c.date] = { best: pts }; lsSet('daily', d); }
        $('endScore').textContent = L('{p} points de défi du jour', { p: pts }) + (old && pts <= old.best ? ' · ' + L('ton record du jour reste {b}', { b: old.best }) : old ? ' · ' + L('nouveau record du jour !') : '');
      } else {
        const r = run();
        if (duo) { if (w !== 2) { r.winsC[w]++; grantRewards(r, false, w); rewards = true; } }
        else if (humanWon) { r.wins++; if (G.mode === 'hard') r.winsH++; grantRewards(r, G.mode === 'hard'); rewards = true; }
        else { if (w !== 2) r.losses++; r.t.gH = 0; }
        r.n++; r.match = null; if (G.mode === 'hard' || !duo) r.hard = shuffle(HARD).slice(0, 2);
        saveRuns();
        if (rewards && (r.pending.length || r.news.length)) $('endScore').textContent = r.pending.length ? L('Tu débloques quelque chose !') : r.news.join(' · ');
      }
      if (G.level) learn(humanWon, s);
    }
    sys(L('Fin : {t}', { t: title }) + ' ' + I18N.why(s.why));
    Sound.want([w !== 2 && (humanWon || duo) ? 'victoire' : (G.mode === 'daily' && dailyScore(G) > 0 ? 'victoire' : 'defaite')]);
    const acts = $('endActions');
    acts.innerHTML = `<button class="big" id="btnNext">${G.mode === 'daily' ? L('Retour au menu') : L('Continuer')} <kbd>Entrée</kbd></button><button class="ghost" id="btnLook">${L('Voir la carte')}</button>`;
    $('btnNext').onclick = endNext;
    $('btnLook').onclick = () => { $('endModal').hidden = true; render(); };
    setTimeout(() => { if (G && G.over && $('game').classList.contains('on')) $('endModal').hidden = false; }, 900);
    render();
  }
  function endNext() {
    $('endModal').hidden = true;
    if (G && G.mode === 'daily') { G = null; renderMenu(); show('menu'); return; }
    openRun(cur);
  }
  function learn(humanWon, s) {
    const ad = Object.assign({ wG: 1, wM: 1, games: 0, freq: {} }, lsGet('adapt', {}));
    for (const k in ad.freq) ad.freq[k] *= 0.9;
    for (const k in G.usage) ad.freq[k] = (ad.freq[k] || 0) + G.usage[k];
    if (humanWon) {
      if (/gardes/.test(s.why)) ad.wG = Math.min(1.8, ad.wG * 1.1);
      if (/dieu/.test(s.why)) ad.wM = Math.min(1.8, ad.wM * 1.1);
    } else { ad.wG = 1 + (ad.wG - 1) * 0.95; ad.wM = 1 + (ad.wM - 1) * 0.95; }
    ad.games++;
    lsSet('adapt', ad);
  }
  function undo() {
    if (!G || G.over) return toast(G && G.over ? L('L’affrontement est fini.') : L('Aucun coup à annuler.'));
    if (!G.history.length) return toast(L('Aucun coup à annuler.'));
    const h = G.history.pop();
    G.s = h.s; G.lastA = h.lastA; $('log').innerHTML = h.log;
    G.ver++; G.thinking = false; G.sel = null;
    sys(L('Coup annulé.'));
    sfx('annule'); render(); saveMatch(); maybeBot();
  }
  $('btnUndo').onclick = undo;
  $('btnMenu').onclick = () => {
    if (G && G.mode === 'daily') { G = null; renderMenu(); show('menu'); return; }
    if (G && !G.over) saveMatch(); G = null; openRun(cur);
  };

  // ---------- textes du journal ----------
  const SIDE = { haut: L('du haut'), bas: L('du bas'), gauche: L('de gauche'), droite: L('de droite') };
  function optLabel(x, id) {
    if (x === 'centre') return L('le centre');
    if (SIDE[x]) return (id === 'pb' ? L('2e ligne') : L('bord')) + ' ' + SIDE[x];
    if (x === 'go') return '';
    if (x[0] === 'r') return L('recrute {x}', { x: tn(+x.slice(1)) });
    if (x[0] === 'v') return L('ranime {x}', { x: tn(+x.slice(1)) });
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
      case 'act': {
        const ti = E.tix(b.b[a.from]);
        const d = a.cl.map(x => typeof x === 'number' ? sqName(x) : optLabel(x, T[ti].id)).filter(Boolean).join(' → ');
        return L('{p} active {x} en {c}', { p: P, x: tn(ti), c: sqName(a.from) }) + (d ? ' : ' + d : '') + ds;
      }
      case 'pass': return L('{p} passe son tour', { p: P });
      case 'decl': return L('{p} annonce : {d}', { p: P, d: declText(a.d, b) });
    }
    return '';
  }
  function logLine(html, p) { const li = document.createElement('li'); li.className = 'p' + p; li.innerHTML = html; $('log').prepend(li); }
  function sys(txt) { const li = document.createElement('li'); li.className = 'sys'; li.textContent = txt; $('log').prepend(li); }

  // ---------- sélection ----------
  const SELECT_IDX = { mb: [0, 1], mc: [0], md: [0, 2], g1: [0], pc: [0], pr: [0] };
  function matching() { const sel = G.sel; return sel.cands.filter(a => sel.pre.every((x, i) => a.cl[i] === x)); }
  function selView() {
    const v = { sq: new Map(), strs: [], complete: null, path: [] };
    const sel = G.sel; if (!sel) return v;
    const s = G.s;
    if (sel.k === 'place') { for (const a of legal()) if (a.k === 'pla' && a.t === sel.t) v.sq.set(a.to, 'tgt-place' + (E.placeFree(s, a) ? ' free' : '')); return v; }
    const m = matching(), n = sel.pre.length;
    const tid = T[E.tix(s.b[sel.from])].id;
    v.path = sel.pre.filter(x => typeof x === 'number');
    for (const a of m) {
      if (a.cl.length === n) { v.complete = a; continue; }
      const x = a.cl[n];
      if (typeof x === 'string') { if (!v.strs.includes(x)) v.strs.push(x); continue; }
      if (v.sq.has(x)) continue;
      const c = s.b[x];
      let cls = 'tgt-move';
      if (c > 0) cls = (SELECT_IDX[tid] || []).includes(n) || E.own(c) === s.turn ? 'tgt-ally' : 'tgt-cap';
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
      else if (t.cost && s.mana[s.turn] < t.cost) why = L('Pas assez de mana ({c} nécessaires).', { c: t.cost });
      else if (s.decl[s.turn] && legal().some(a => a.k !== 'pass')) why = L('Tu dois faire l’action que tu as annoncée.');
      toast(why); sfx('erreur');
    } else sfx('choix');
    render();
  }
  function clickSq(q) {
    if (!G) return;
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

  // ---------- plateau ----------
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
      boardEl.appendChild(d); sqEls.push(d);
    }
  }
  function layoutBoard() {
    if (!G) return;
    const g = G.s.g, mid = document.querySelector('.mid');
    const availW = Math.max(260, mid.clientWidth - 4), availH = Math.max(300, window.innerHeight - 190);
    const sq = Math.max(28, Math.floor(Math.min(availW / (g.W + 1.4), availH / (g.H + 1.4), 92)));
    const m = Math.round(sq * .7);
    G.sq = sq; G.m = m;
    const root = document.documentElement.style;
    root.setProperty('--sq', sq + 'px'); root.setProperty('--cols', g.W); root.setProperty('--rows', g.H);
    terrainEl.style.width = (g.W * sq + 2 * m) + 'px'; terrainEl.style.height = (g.H * sq + 2 * m) + 'px';
    for (const el of [boardEl, fxEl]) { el.style.left = m + 'px'; el.style.top = m + 'px'; el.style.width = (g.W * sq) + 'px'; el.style.height = (g.H * sq) + 'px'; }
    boardDecor.build(terrainEl, g, sq, m, G.seed, theme);
  }
  function render() {
    if (!G) return;
    const s = G.s, g = s.g, v = selView();
    const lastSq = new Set(), la = G.lastA;
    if (la) { if (la.from !== undefined) lastSq.add(la.from); if (la.to !== undefined) lastSq.add(la.to); if (la.cl) la.cl.forEach(x => typeof x === 'number' && lastSq.add(x)); }
    const declSq = new Set(); for (const p of [0, 1]) if (s.decl[p] && s.decl[p].k === 'act') declSq.add(s.decl[p].from);
    const showHome = G.sel && G.sel.k === 'place';
    const centerSet = s.goal === 'colline' ? new Set(g.center) : null;
    const botOf = [], leftOf = [];
    for (let q = 0; q < g.N; q++) if (g.ex[q]) { const r = (q / g.W) | 0, c = q % g.W; if (botOf[c] === undefined || r > botOf[c]) botOf[c] = r; if (leftOf[r] === undefined || c < leftOf[r]) leftOf[r] = c; }
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
      if (lastSq.has(q)) cls += ' last';
      if (declSq.has(q)) cls += ' decl';
      if (v.sq.has(q)) cls += ' ' + v.sq.get(q);
      if (v.path.includes(q)) cls += ' path';
      if (G.sel && G.sel.k === 'piece' && G.sel.from === q) cls += ' selp';
      el.className = cls;
      let h = '';
      if (botOf[col] === r) h += `<span class="crd f">${COLS[col]}</span>`;
      if (leftOf[r] === col) h += `<span class="crd r">${g.H - r}</span>`;
      if (g.spec[q]) h += SPEC_SVG[g.spec[q]];
      if (c < 0) h += BRAMBLE;
      if (c > 0) { const t = T[E.tix(c)]; h += `<div class="pc ${t.cat}">${token(E.tix(c), E.own(c))}</div>`; }
      h += '<div class="mk"></div>';
      el.innerHTML = h;
    }
    const tl = $('turnline');
    if (G.over) tl.innerHTML = s.winner === 2 ? L('Match nul') : L('{p} a gagné', { p: `<span class="p${s.winner}">${esc(PN[s.winner])}</span>` });
    else {
      let t = L('Au tour de {p}', { p: `<span class="p${s.turn}">${esc(PN[s.turn])}</span>` });
      if (s.phase === 'draft') t += ' · ' + L('draft');
      if (s.phase === 'decl') t += ' · ' + L('annonce');
      if (s.acts > 1) t += ' · ' + L('{n} actions restantes', { n: s.acts });
      if (s.goal === 'colline') t += ` · ⛰️ ${s.hold[0]}–${s.hold[1]}`;
      tl.innerHTML = t;
    }
    $('btnUndo').disabled = G.over || !G.history.length;
    renderPlayers(); renderPool(); renderHint(v); music();
  }
  // musique plus tendue quand quelqu'un est près de perdre (on attend quelques secondes avant de changer : pas d'à-coups)
  let hotSince = 0, hotState = false;
  function music() {
    if (!G || G.over) return;
    const s = G.s, need = s.ev === 'illimite' ? 6 : 4;
    let hot = false;
    if (s.goal) { const tot = p => s.lost[p][0] + s.lost[p][1] + s.lost[p][2]; hot = (s.goal === 'massacre' && Math.max(tot(0), tot(1)) >= 3) || (s.goal === 'colline' && Math.max(s.hold[0], s.hold[1]) >= 2) || (s.goal === 'chasse' && (s.lost[0][1] + s.lost[1][1]) >= 2); }
    else for (const p of [0, 1]) {
      if (s.lost[p][1] >= need - 1) hot = true;
      if (s.ev !== 'illimite' && s.lost[p][0] >= 1 && E.aliveMages(s, p) === 1) hot = true;
    }
    const now = performance.now();
    if (hot !== hotState) { if (!hotSince) hotSince = now; if (now - hotSince > 6000) { hotState = hot; hotSince = 0; } } else hotSince = 0;
    Sound.want(hotState ? ['tension', 'foret'] : ['partie', 'foret']);
  }
  setInterval(() => { if (G && !G.over && $('game').classList.contains('on')) music(); }, 2000);

  function reserveVisible(p) {
    if (G.s.ev !== 'cache' || G.over) return true;
    if (G.humans[0] && G.humans[1]) return G.s.turn === p;
    return G.humans[p];
  }
  function renderPlayers() {
    const s = G.s;
    const placeable = new Set();
    if (humanTurn() && s.phase === 'play') for (const a of legal()) if (a.k === 'pla') placeable.add(a.t);
    for (const p of [0, 1]) {
      const el = $('pp' + p);
      el.className = `pp p${p}` + (!G.over && s.turn === p ? ' active' : '');
      const gNeed = s.ev === 'illimite' ? 6 : 4;
      const am = E.aliveMages(s, p);
      let pips = '';
      if (!s.goal) for (let i = 0; i < gNeed; i++) pips += `<span class="pip ${i < s.lost[p][1] ? 'lost' : ''}"></span>`;
      let gods = '';
      for (let i = 0; i < am; i++) gods += '<span class="pip god"></span>';
      for (let i = 0; i < s.lost[p][0]; i++) gods += '<span class="pip god dead"></span>';
      let fx = '';
      if (s.goal) {
        const tot = s.lost[p][0] + s.lost[p][1] + s.lost[p][2];
        fx += `<span class="info">🎯 ${s.goal === 'colline' ? L('Centre : {n}/3', { n: s.hold[p] }) : L('Pertes : {n}', { n: tot })}</span>`;
      }
      if (s.noPlace[p]) fx += `<span>🔒 ${L('Ne peut plus placer : {n} tour(s)', { n: s.noPlace[p] })}</span>`;
      if (s.noAct[p]) fx += `<span>🤫 ${L('Ne peut plus activer : {n} tour(s)', { n: s.noAct[p] })}</span>`;
      if (s.pend[p]) fx += `<span class="good">🩸 ${L('Martyr : +40 mana par mort au prochain tour')}</span>`;
      if (s.bl && s.bl[p] >= 0) fx += `<span class="good">✨ ${L('Case bénie : {c}', { c: sqName(s.bl[p]) })}</span>`;
      if (s.decl[p]) fx += `<span class="info">${L('Annonce : {d}', { d: declText(s.decl[p], s) })}</span>`;
      if (s.ev === 'pari' && s.bet && !s.betDone) fx += `<span class="info">${L('Parie sur {p}', { p: esc(PN[s.bet[p]]) })}</span>`;
      let rv = '', total = 0;
      for (let i = 0; i < E.NT; i++) total += s.res[p][i];
      if (!reserveVisible(p)) rv = total ? `<span class="chip"><span class="n">${L('? × {n} (cachés)', { n: total })}</span></span>` : `<span class="muted" style="font-size:13px">${L('vide')}</span>`;
      else {
        for (let i = 0; i < E.NT; i++) {
          const n = s.res[p][i]; if (!n) continue;
          const can = placeable.has(i) && s.turn === p;
          const sel = G.sel && G.sel.k === 'place' && G.sel.t === i && s.turn === p;
          rv += `<span class="chip ${can ? 'click' : ''} ${sel ? 'sel' : ''}" data-res="${p}:${i}">${token(i, p)}${tn(i)}${n > 1 ? ` <span class="n">×${n}</span>` : ''}</span>`;
        }
        if (!rv) rv = `<span class="muted" style="font-size:13px">${L('vide')}</span>`;
      }
      const thinking = !G.over && G.thinking && s.turn === p ? `<span class="thinking">${L('réfléchit…')}</span>` : '';
      el.innerHTML = `<div class="who"><span class="dot"></span>${esc(PN[p])}${thinking}</div>
        <div class="manabar"><span class="crys">💎 ${s.mana[p]}</span><span class="track"><i style="width:${Math.min(100, s.mana[p] / 2)}%"></i></span></div>
        ${s.goal ? '' : `<div class="pips">${L('Gardes perdus')} ${pips}</div>`}
        <div class="pips">${L('Dieux')} ${gods || `<span class="muted">${L('aucun engagé')}</span>`}</div>
        ${fx ? `<div class="fx">${fx}</div>` : ''}
        <div class="resv"><div class="lbl">${L('À placer')}</div>${rv}</div>`;
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
    let total = 0; for (let i = 0; i < E.NT; i++) total += s.pool[i];
    if (s.phase === 'draft' && s.ev === 'cache') {
      el.innerHTML = `<div class="facedown"><span class="chip"><span class="n">🂠 × ${total} ${L('face cachée')}</span></span>${hum ? `<button class="ghost sm" id="btnDraw">${L('Piocher')}</button>` : ''}</div>`;
      if (hum) $('btnDraw').onclick = () => doAction({ k: 'pioche' });
      return;
    }
    if (!total) { el.innerHTML = `<span class="muted">${L('Vide — tout a été recruté.')}</span>`; return; }
    const unl = s.ev === 'illimite';
    let h = '';
    for (const [cat, lbl] of [['M', L('Dieux')], ['G', L('Gardes')], ['S', L('Soldats')]]) {
      let row = '';
      for (let i = 0; i < E.NT; i++) {
        if (T[i].cat !== cat || !s.pool[i]) continue;
        row += `<span class="chip ${recOk.has(i) ? 'click' : (hum ? 'off' : '')}" data-pool="${i}">${token(i, -1)}${tn(i)}<span class="n">${unl ? '∞' : '×' + s.pool[i]}</span></span>`;
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
        if (a) doAction(a);
        else if (G.s.decl[G.s.turn]) { toast(L('Tu dois faire l’action que tu as annoncée.')); sfx('erreur'); }
      });
    });
  }
  function renderHint(v) {
    const s = G.s, hint = $('hint'), opts = $('opts');
    let h = '', o = [];
    if (G.over) { h = I18N.why(s.why); o.push(`<button class="main" data-o="next">${L('Continuer')}</button>`); }
    else if (!humanTurn()) h = L('{p} réfléchit…', { p: esc(PN[s.turn]) });
    else if (s.phase === 'draft') {
      h = s.ev === 'inverse' ? L('Draft inversé : choisis dans la réserve commune un perso… qui ira à ton adversaire !') : L('Draft caché : pioche une pièce face cachée.');
      if (s.ev === 'cache') o.push(`<button class="main" data-o="draw">${L('Piocher')}</button>`);
    } else if (s.phase === 'decl') {
      h = L('Annonce ta prochaine action : recruter, placer, ou touche un de tes persos pour annoncer que tu l’activeras.');
      o.push(`<button data-o="decl:rec">${L('Annoncer : recruter')}</button>`, `<button data-o="decl:pla">${L('Annoncer : placer')}</button>`);
    } else if (G.sel && G.sel.k === 'place') {
      h = L('Place <b>{x}</b> dans ta zone de placement (cases encadrées de ta couleur).', { x: tn(G.sel.t) }) + (s.ev === 'noir' ? ' ' + L('Les cases vertes (noires) sont gratuites.') : '');
      o.push(`<button data-o="cancel">${L('Annuler')}</button>`);
    } else if (G.sel) {
      const ti = E.tix(s.b[G.sel.from]), t = T[ti];
      h = `<b>${tn(ti)}</b> : ${td(ti)}`;
      if (v.sq.size) h += ` <span class="muted">— ${L('choisis une case en surbrillance.')}</span>`;
      for (const x of v.strs) {
        if (x[0] === 'r' || x[0] === 'v') { const i = +x.slice(1); o.push(`<button data-o="s:${x}">${token(i, x[0] === 'v' ? s.turn : -1)} ${x[0] === 'v' ? L('Ranimer') + ' ' : ''}${tn(i)}</button>`); }
        else if (x === 'go') o.push(`<button class="main" data-o="s:go"${t.id === 'g6' ? ' data-zone="adj"' : ''}>${L('Activer {x}', { x: tn(ti) })}</button>`);
        else o.push(`<button class="main" data-o="s:${x}" data-zone="${x}">${t.id === 'pb' ? '🌋' : '⚡'} ${x === 'centre' ? L('Le centre') : (t.id === 'pb' ? L('2e ligne') : L('Bord')) + ' ' + SIDE[x]}</button>`);
      }
      if (v.complete) o.push(`<button class="main" data-o="finish">${L('Valider (s’arrêter là)')}</button>`);
      o.push(`<button data-o="cancel">${L('Annuler')}</button>`);
    } else {
      const L2 = legal(), d = s.decl[s.turn];
      h = L('Ton action : <b>recruter</b> (réserve commune), <b>placer</b> (tes persos à placer) ou <b>activer</b> un de tes persos sur la carte.');
      if (d && L2.some(a => a.k !== 'pass')) h = L('Tu as annoncé : <b>{d}</b>. Tu dois le faire.', { d: declText(d, s) });
      if (s.acts > 1) h += ` <b>(${L('{n} actions restantes', { n: s.acts })})</b>`;
      if (L2.some(a => a.k === 'pass')) { o.push(`<button class="warn" data-o="pass">${L('Passer mon tour')}</button>`); if (L2.length === 1) h = L('Aucune action possible : passe ton tour.'); }
    }
    hint.innerHTML = h;
    // numéros 1-9 pour les raccourcis clavier
    opts.innerHTML = o.map((b, i) => i < 9 ? b.replace(/<\/button>$/, ` <kbd>${i + 1}</kbd></button>`) : b).join('');
    opts.querySelectorAll('button').forEach(b => {
      const k = b.dataset.o;
      b.onclick = () => {
        if (k === 'next') return endNext();
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
    $('infoCard').innerHTML = `<div class="ihead">${token(i, o)}<div><div class="iname">${tn(i)}</div><div class="icat">${catName(t.cat)}${who}</div></div></div>
      ${t.cost ? `<div class="icost">💎 ${L('Sort : {c} mana', { c: t.cost })}</div>` : ''}<div>${td(i)}</div>${q !== undefined ? specLine(q) : ''}`;
  }
  function specLine(q) { const k = G && G.s.g.spec[q]; return k ? `<div class="specline">${SPEC_SVG[k]}<span><b>${I18N.specName(k)}</b> : ${I18N.specDesc(k)}</span></div>` : ''; }
  function showSpec(q) { if (G && G.s.g.spec[q]) $('infoCard').innerHTML = specLine(q); }

  // =====================================================================
  //  Raccourcis clavier
  // =====================================================================
  function modalOpen() { return ['codexModal', 'setModal', 'evoModal', 'tutoModal', 'endModal'].find(id => !$(id).hidden); }
  document.addEventListener('keydown', e => {
    if (e.target.matches && e.target.matches('input, textarea, select')) { if (e.key === 'Enter' && $('btnDuoGo') && !$('duoNames').hidden) $('btnDuoGo').click(); return; }
    const k = e.key, ctrl = e.ctrlKey || e.metaKey;
    const m = modalOpen();
    if (k === 'Escape') {
      if (m === 'codexModal') return closeCodex();
      if (m === 'setModal') return closeSettings();
      if (m === 'tutoModal') return closeTuto();
      if (m === 'endModal') { $('endModal').hidden = true; return; }
      if (G && G.sel) { G.sel = null; sfx('annule'); render(); }
      return;
    }
    if (m === 'evoModal') { const n = +k; if (n >= 1 && n <= 3) { const b = $('evos').querySelector(`[data-k="${n - 1}"]`); if (b) b.click(); } return; }
    if (m === 'endModal') { if (k === 'Enter' || k === ' ') { e.preventDefault(); $('btnNext').click(); } return; }
    if (m === 'tutoModal') { if (k === 'ArrowRight' || k === 'Enter') tutoStep(1); if (k === 'ArrowLeft') tutoStep(-1); return; }
    if (m) return;
    if (k === 'c' || k === 'C') return openCodex();
    if (k === 'o' || k === 'O' || k === ',') return openSettings();
    if (k === 'm' || k === 'M') return toggleMusic();
    if (k === 'n' || k === 'N') return toggleSfx();
    if (k === 'F1' || k === 'h' || k === 'H') { e.preventDefault(); return openTuto(); }
    const scr = document.querySelector('.screen.on').id;
    if (scr === 'run') {
      if (k === 'Enter') { const b = $('btnResume') || $('btnStart'); if (b) b.click(); }
      if (k === 'd' || k === 'D') { const b = $('btnHard'); if (b) b.click(); }
      if (k === 'Backspace') $('btnRunMenu').click();
      return;
    }
    if (scr === 'pre') { if (k === 'Enter') $('btnGo').click(); return; }
    if (scr === 'menu') { const n = +k; if (n >= 1 && n <= 3) { const b = document.querySelector(`[data-open="${n - 1}"]`) || document.querySelector(`[data-new="${n - 1}"]`); if (b) b.click(); } if (k === 'j' || k === 'J') $('btnDaily').click(); return; }
    if (scr !== 'game' || !G) return;
    if (ctrl && (k === 'z' || k === 'Z')) { e.preventDefault(); return undo(); }
    if (k === 'u' || k === 'U') return undo();
    if (k === 'p' || k === 'P') { const b = document.querySelector('#opts [data-o="pass"]'); if (b) b.click(); return; }
    if (k === 'Enter' || k === ' ') { e.preventDefault(); const b = document.querySelector('#opts [data-o="finish"]') || document.querySelector('#opts .main'); if (b) b.click(); return; }
    const n = +k;
    if (n >= 1 && n <= 9) { const b = $('opts').querySelectorAll('button')[n - 1]; if (b) b.click(); return; }
    if (k === 'Tab') {
      // passe d'un de tes persos activables au suivant
      e.preventDefault();
      if (!humanTurn() || G.s.phase !== 'play') return;
      const froms = [...new Set(legal().filter(a => a.k === 'act').map(a => a.from))];
      if (!froms.length) return toast(L('Aucun perso à activer.'));
      const curF = G.sel && G.sel.k === 'piece' ? G.sel.from : -1;
      const i = froms.indexOf(curF);
      selectPiece(froms[(i + (e.shiftKey ? froms.length - 1 : 1)) % froms.length]);
    }
  });
  const SHORTCUTS = () => [
    ['Échap', L('Annuler la sélection, fermer une fenêtre')], ['Ctrl+Z / U', L('Annuler le coup')], ['Tab / Maj+Tab', L('Choisir le perso suivant / précédent')],
    ['1 … 9', L('Boutons sous la carte (sorts, choix, recrues…)')], ['Entrée / Espace', L('Valider, continuer')], ['P', L('Passer son tour')],
    ['C', L('Codex')], ['O', L('Paramètres')], ['M / N', L('Musique / effets sonores')], ['H / F1', L('Tutoriel')], ['F11', L('Plein écran')],
    ['1, 2, 3', L('Menu : ouvrir une partie')], ['J', L('Menu : défi du jour')], ['Entrée / D', L('Partie : affrontement normal / difficile')],
  ];

  // =====================================================================
  //  Codex : on y voit tout
  // =====================================================================
  const CTABS = () => [['regles', L('📜 Règles')], ['dieux', L('⬢ Dieux')], ['gardes', L('🛡️ Gardes')], ['soldat', L('● Soldat')], ['evenements', L('🎲 Événements')], ['cartes', L('🗺️ Cartes')],
    ['decors', L('🌲 Décors')], ['bots', L('🤖 Bots')], ['progression', L('📈 Progression')], ['raccourcis', L('⌨️ Raccourcis')]];
  let codexTab = 'regles';
  const DIAG_W = 7, DIAG_C = 24;
  function moveDiagram(id) {
    const ex = new Uint8Array(DIAG_W * DIAG_W).fill(1), z = []; for (let c = 0; c < DIAG_W; c++) z.push(42 + c);
    const g = E.buildGeo(DIAG_W, DIAG_W, ex, z, 'codex');
    const s = E.newGame({ map: g, gods: [], gards: [] });
    s.mana = [999, 999];
    s.b[DIAG_C] = E.enc(E.TI[id], 0);
    for (const q of [3, 8, 13, 21, 31, 38, 46]) s.b[q] = E.enc(E.TI.s, 1);
    for (const q of [36, 15]) s.b[q] = E.enc(E.TI.s, 0);
    const cls = new Array(49).fill('');
    if (id === 'ma') { for (const q of E.areaOf(g, 'ma', 'haut')) cls[q] = 'zone'; for (const q of g.center) cls[q] = 'zone'; }
    else if (id === 'pb') { for (const q of E.areaOf(g, 'pb', 'haut')) cls[q] = 'zone'; }
    else if (id === 'g6') { for (let d = 0; d < 8; d++) { const q = g.mv[d * g.N + DIAG_C]; if (q >= 0) cls[q] = 'zone'; } }
    else if (id === 'lc') { for (const d of [1, 3, 4, 6]) { let q = DIAG_C; for (let k = 0; k < 3; k++) { q = g.mv[d * g.N + q]; if (q < 0) break; cls[q] = 'zone'; } } }
    else for (const cl of E.genAct(s, DIAG_C, true)) cl.forEach((x, k) => {
      if (typeof x !== 'number') return;
      const c = s.b[x];
      const v = c > 0 && E.own(c) === 1 && !['mc', 'mb', 'g1'].includes(id) ? 'hit' : c > 0 ? 'ally' : (k === 0 ? 'reach' : 'reach2');
      if (!cls[x] || v === 'hit' || (v === 'reach' && cls[x] === 'reach2')) cls[x] = v;
    });
    let h = `<div class="diag" style="grid-template-columns:repeat(${DIAG_W},1fr)">`;
    for (let q = 0; q < 49; q++) { const c = s.b[q], light = (((q / DIAG_W) | 0) + q % DIAG_W) % 2 === 0; h += `<i class="${light ? 'l' : ''} ${cls[q]}">${c > 0 ? token(E.tix(c), E.own(c)) : ''}</i>`; }
    return h + '</div>';
  }
  const NODIAG = { mb: 1, mc: 1, md: 1, me: 1, pa: 1, pc: 1, pd: 1, pe: 1, pf: 1, pg: 1, gu: 1, dr: 1, pr: 1, c6: 1 };
  function pieceCards(ids) {
    const r = cur >= 0 ? run() : null;
    return `<div class="legend"><span style="--c:#3cc47a">${L('case où il peut aller')}</span><span style="--c:#2b8a58">${L('2e pas')}</span><span style="--c:#e04a5a">${L('ennemi qu’il peut tuer')}</span><span style="--c:#ff8a5a">${L('zone frappée')}</span><span style="--c:#7fb8e0">${L('perso qu’il peut choisir')}</span></div>
      <div class="cards">${ids.map(id => {
      const i = E.TI[id], t = T[i];
      const inRun = r ? (r.gods.includes(id) || r.gards.includes(id) || id === 's') : null;
      const start = E.START_M.includes(id) || E.START_G.includes(id) || id === 's';
      return `<div class="ccard">${token(i, 0)}<div class="txt"><b>${tn(i)}</b>${t.cost ? ` <span class="cost">💎 ${t.cost} mana</span>` : ''}
        ${start ? `<span class="tag2">${L('de départ')}</span>` : ''}${r && inRun ? `<span class="tag2 on">${L('dans ta partie')}</span>` : ''}
        <p>${td(i)}</p>${NODIAG[id] ? '' : moveDiagram(id)}</div></div>`;
    }).join('')}</div>`;
  }
  function mapPreview(g) {
    let h = `<div class="mapprev" style="grid-template-columns:repeat(${g.W},1fr);width:${g.W * 15}px">`;
    for (let q = 0; q < g.N; q++) h += `<i class="${!g.ex[q] ? 'v' : g.zone[0][q] ? 'z0' : g.zone[1][q] ? 'z1' : g.spec[q] ? 's' + g.spec[q] : ''}"></i>`;
    return h + '</div>';
  }
  function exampleMap(kind) {
    for (let i = 0; i < 80; i++) { const g = E.makeMap(kind === 'classique' ? 'classique' : 'aleatoire', kind === 'classique' ? 0 : 4); if (g.info && g.info.kinds.length === 1 && g.info.kinds[0] === kind) return g; }
    return null;
  }
  const previews = [];
  function codexBody(tab) {
    if (tab === 'regles') return rulesHTML();
    if (tab === 'dieux') return pieceCards(E.ALL_M);
    if (tab === 'gardes') return pieceCards(E.ALL_G);
    if (tab === 'soldat') return pieceCards(['s']);
    if (tab === 'evenements') return `<div class="cards">${E.EVENTS.map(e => `<div class="ccard"><span style="font-size:34px">🎲</span><div class="txt"><b>${I18N.evName(e.id)}</b>${e.weight ? ` <span class="tag2 on">${L('plus fréquent')}</span>` : ''}<p>${I18N.evDesc(e.id)}</p></div></div>`).join('')}</div>
      <h3>${L('Objectifs mystère')}</h3><div class="cards">${E.GOALS.map(gl => `<div class="ccard"><span style="font-size:34px">🎯</span><div class="txt"><b>${I18N.goalName(gl.id)}</b><p>${I18N.goalDesc(gl.id)}</p></div></div>`).join('')}</div>
      <p class="muted">${L('Pour tous les objectifs : au bout de 60 tours chacun (30 pour l’Endurance), celui qui a perdu le moins de persos gagne.')}</p>`;
    if (tab === 'cartes') {
      let h = `<p class="muted center">${L('17 cartes. Elles se débloquent quand la partie devient plus sauvage (niveau 0 à 4). Or = ta zone de placement, violet = celle de l’adversaire.')}</p><div class="cards">`;
      for (const [id, , lv] of E.MAPS) { const g = exampleMap(id); h += `<div class="ccard"><div class="txt"><b>${I18N.mapKind(id)}</b> <span class="tag2">${L('niveau {n}', { n: lv })}</span><p>${I18N.mapKindDesc(id)}</p>${g ? mapPreview(g) : ''}</div></div>`; }
      h += `</div><h3>${L('Cases spéciales')}</h3><p class="muted">${L('Peu nombreuses, elles apparaissent sur les cartes plus sauvages (niveau 2 et plus), toujours par paires face à face.')}</p><div class="cards">`;
      for (const k of [1, 2]) h += `<div class="ccard"><span class="specbig">${SPEC_SVG[k]}</span><div class="txt"><b>${I18N.specName(k)}</b><p>${I18N.specDesc(k)}</p></div></div>`;
      return h + `</div><h3>${L('Niveaux de sauvagerie')}</h3><ul>${[0, 1, 2, 3, 4].map(n => `<li><b>${L('Niveau {n}', { n })}</b> : ${I18N.mapLevel(n)}</li>`).join('')}</ul>
        <div class="menu-actions"><button class="ghost" id="btnMoreMaps">🔄 ${L('D’autres exemples')}</button></div>`;
    }
    if (tab === 'decors') return `<p class="muted center">${L('Le décor change tout seul toutes les 3 à 7 minutes et à chaque affrontement (tu peux en fixer un dans les Paramètres).')}</p>
      <div class="cards">${Decor.THEME_IDS.map(t => `<div class="ccard"><div class="txt"><b>${I18N.themeName(t)}</b>${t === theme ? ` <span class="tag2 on">${L('en ce moment')}</span>` : ''}<div class="themeprev" data-theme="${t}"></div></div></div>`).join('')}</div>`;
    if (tab === 'bots') return `<div class="cards">${['facile', 'normal', 'impossible'].map(lv => `<div class="ccard"><span style="font-size:34px">${LEVELIC[lv]}</span><div class="txt"><b>${levelName(lv)}</b><p>${({ facile: L('Joue souvent au hasard et rate des prises. Parfait pour apprendre.'), normal: L('Regarde 2 coups à l’avance, voit les menaces immédiates.'), impossible: L('Calcule loin (environ 5 secondes par coup), lit les menaces, et apprend tes habitudes d’une partie à l’autre. Il n’a aucun avantage : seulement un meilleur raisonnement.') })[lv]}</p></div></div>`).join('')}</div>
      <h3>${L('Caractères')}</h3><p class="muted">${L('À chaque affrontement, le bot reçoit un caractère tiré au hasard. Il change sa façon de jouer, pas sa force. Le bot impossible en a moins : il s’adapte surtout à la position.')}</p>
      <div class="cards">${Object.keys(E.PERSOS).map(id => `<div class="ccard"><span style="font-size:34px">🎭</span><div class="txt"><b>${I18N.persoName(id)}</b><p>${I18N.persoDesc(id)}</p></div></div>`).join('')}</div>`;
    if (tab === 'progression') return `<p>${L('Avant chaque affrontement, tu choisis : <b>normal</b> ou <b>difficile</b> (avec 2 handicaps tirés au hasard). Tes victoires font avancer ces barres :')}</p>
      <ul><li><b>${L('Nouveau garde')}</b> : ${L('3 victoires normales, ou 2 victoires difficiles d’affilée. Tu choisis parmi 3.')}</li>
      <li><b>${L('Nouveau dieu')}</b> : ${L('5 victoires normales, ou 3 victoires difficiles. Tu choisis parmi 3.')}</li>
      <li><b>${L('Carte plus sauvage')}</b> : ${L('toutes les 3 victoires (niveau 0 à 4).')}</li>
      <li><b>${L('Plus d’événements')}</b> : ${L('+25 % toutes les 4 victoires.')}</li></ul>
      <p class="muted">${L('Une défaite ou une victoire normale casse la série de victoires difficiles d’affilée.')}</p>
      <h3>${L('Handicaps possibles')}</h3><ul>${HARD.map(h => `<li>${hardName(h)}</li>`).join('')}</ul>
      <h3>${L('Défi du jour')}</h3><p>${L('Chaque jour, la même carte, la même réserve et le même objectif pour tout le monde. Ton meilleur score du jour s’ajoute à tes points de défi du jour.')}</p><ul>${DAILY.map(d => `<li><b>${dailyName(d)}</b> : ${dailyDesc(d)}</li>`).join('')}</ul>`;
    if (tab === 'raccourcis') return `<table class="keys">${SHORTCUTS().map(([k, d]) => `<tr><td><kbd>${k}</kbd></td><td>${d}</td></tr>`).join('')}</table>`;
    return '';
  }
  function renderCodex() {
    $('codexTabs').innerHTML = CTABS().map(([k, l]) => `<button data-tab="${k}" class="${k === codexTab ? 'sel' : ''}">${l}</button>`).join('');
    $('codexTabs').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { codexTab = b.dataset.tab; sfx('page'); renderCodex(); });
    while (previews.length) previews.pop().stop();
    $('codexBody').innerHTML = codexBody(codexTab);
    if ($('btnMoreMaps')) $('btnMoreMaps').onclick = renderCodex;
    $('codexBody').querySelectorAll('[data-theme]').forEach(el => { const d = Decor.create(); d.scene(el, 7 + Decor.THEME_IDS.indexOf(el.dataset.theme), el.dataset.theme); d.stop(); previews.push(d); });
  }
  function openCodex(tab) { if (tab) codexTab = tab; renderCodex(); $('codexModal').hidden = false; sfx('page'); }
  function closeCodex() { $('codexModal').hidden = true; while (previews.length) previews.pop().stop(); sfx('page'); }
  $('btnCodex').onclick = () => openCodex();
  $('btnCodexMenu').onclick = () => { const c = cur; cur = -1; openCodex(); cur = c; };
  $('codexModal').addEventListener('click', e => { if (e.target === $('codexModal') || e.target.hasAttribute('data-close')) closeCodex(); });

  function rulesHTML() {
    return `<ul>
      <li>${L('<b>Une partie</b> est une suite d’<b>affrontements</b> contre un bot dont tu choisis l’intelligence (ou à deux sur le même écran). Le temps est infini.')}</li>
      <li>${L('Au début : <b>3 dieux et 4 sortes de gardes</b> dans la réserve, le plateau classique, aucun événement. Tes victoires débloquent le reste (voir Progression).')}</li>
      <li>${L('Chaque joueur commence avec <b>100 mana</b>. Les dieux dépensent du mana pour lancer leur sort.')}</li>
      <li>${L('À ton tour, <b>une seule action</b> : <b>recruter</b> 1 perso de la réserve commune, <b>placer</b> 1 perso recruté dans ta zone de placement, ou <b>activer</b> 1 de tes persos sur la carte.')}</li>
      <li>${L('<b>But</b> : tuer <b>tous les dieux</b> adverses, ou <b>4 gardes</b> adverses (sauf avec l’Objectif mystère).')}</li>
      <li>${L('Seuls les <b>soldats</b> ont un sens : ils avancent vers l’adversaire. Les gardes vont dans tous les sens ; les dieux ne bougent pas.')}</li>
      <li>${L('On prend un ennemi en arrivant sur sa case. Les sorts de zone ne tuent que des ennemis.')}</li>
      <li>${L('Celui qui commence est <b>tiré au sort</b>. Tu peux <b>annuler ton dernier coup</b> (↶, Ctrl+Z ou U).')}</li>
    </ul>
    <p class="interp">${L('Précisions : « tous les dieux » = l’adversaire a perdu au moins 1 dieu et il ne lui en reste aucun (ni sur la carte, ni à placer) — un dieu jamais recruté ne peut pas mourir. Les trous de la carte sont infranchissables ; un perso poussé dedans meurt. 150 tours sans aucune mort = match nul.')}</p>
    <h3>${L('Comment jouer')}</h3>
    <ul>
      <li>${L('<b>Recruter</b> : clique un perso dans la réserve commune (à droite).')}</li>
      <li>${L('<b>Placer</b> : clique un perso de ta liste « À placer », puis une case de ta zone.')}</li>
      <li>${L('<b>Activer</b> : clique ton perso sur la carte, puis les cases en surbrillance (vert = déplacement, rouge = attaque, bleu pointillé = choix d’un perso). Les sorts de zone ont des boutons sous la carte (survole-les pour voir la zone).')}</li>
      <li>${L('Survole un perso ou une case spéciale pour voir ce qu’il fait. Tous les raccourcis clavier sont dans l’onglet Raccourcis.')}</li>
    </ul>`;
  }

  // =====================================================================
  //  Paramètres
  // =====================================================================
  function segH(key, opts) { return `<div class="seg" data-set="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(SET[key]) === String(v) ? 'sel' : ''}">${l}</button>`).join('')}</div>`; }
  function renderSettings() {
    const fs = !!document.fullscreenElement;
    $('setBody').innerHTML = `
      <div class="setrow"><div class="lab"><b>👤 ${L('Ton pseudo')}</b><small>${L('Ton nom pendant les affrontements')}</small></div><input id="setPseudo" maxlength="18" value="${esc(lsGet('pseudo', ''))}" placeholder="${L('Joueur')}"></div>
      <div class="setrow"><div class="lab"><b>🌍 ${L('Langue')}</b></div><div class="seg" id="setLang">${I18N.LANGS.map(([c, n]) => `<button data-v="${c}" class="${I18N.lang === c ? 'sel' : ''}">${n}</button>`).join('')}</div></div>
      <div class="setrow"><div class="lab"><b>🎵 ${L('Musique')}</b><small>${L('Vrais morceaux libres de droits')}</small></div>
        <div><button class="ghost sm ${Sound.music ? '' : 'off'}" id="setMus">${Sound.music ? L('Activée') : L('Coupée')}</button> <input type="range" min="0" max="100" value="${Math.round(Sound.musicVol * 100)}" id="volMus"></div></div>
      <div class="setrow"><div class="lab"><b>🔊 ${L('Effets sonores')}</b><small>${L('Pas, coups, sorts…')}</small></div>
        <div><button class="ghost sm ${Sound.effects ? '' : 'off'}" id="setSfx">${Sound.effects ? L('Activés') : L('Coupés')}</button> <input type="range" min="0" max="100" value="${Math.round(Sound.sfxVol * 100)}" id="volSfx"></div></div>
      <div class="setrow"><div class="lab"><b>🌲 ${L('Décor')}</b><small>${L('Auto : il change tout seul')}</small></div>${segH('decor', [['auto', L('Auto')]].concat(Decor.THEME_IDS.map(t => [t, I18N.themeShort(t)])))}</div>
      <div class="setrow"><div class="lab"><b>✨ ${L('Animations')}</b></div>${segH('anim', [['normal', L('Normales')], ['rapide', L('Rapides')], ['aucune', L('Aucune')]])}</div>
      <div class="setrow"><div class="lab"><b>🔤 ${L('Coordonnées sur la carte')}</b><small>${L('Lettres et chiffres des cases')}</small></div>${segH('coords', [[true, L('Oui')], [false, L('Non')]])}</div>
      <div class="setrow"><div class="lab"><b>🖥️ ${L('Plein écran')}</b><small>${L('Aussi avec F11')}</small></div><button class="ghost sm" id="setFs">${fs ? L('Quitter le plein écran') : L('Plein écran')}</button></div>
      <div class="setrow"><div class="lab"><b>🧠 ${L('Apprentissage du bot impossible')}</b><small>${L('Ce qu’il a retenu de ta façon de jouer')}</small></div><button class="ghost sm danger" id="setForget">${L('Lui faire tout oublier')}</button></div>
      <div class="setrow"><div class="lab"><b>🗑️ ${L('Tout effacer')}</b><small>${L('Parties, défis et apprentissage')}</small></div><button class="ghost sm danger" id="setWipe">${L('Tout effacer')}</button></div>`;
    $('setPseudo').onchange = e => { lsSet('pseudo', e.target.value.trim().slice(0, 18)); renderMenu(); };
    $('setLang').onclick = e => { const b = e.target.closest('button'); if (!b) return; I18N.setLang(b.dataset.v); translateStatic(); renderSettings(); renderMenu(); if ($('run').classList.contains('on')) renderRun(); if (G) render(); };
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
      if (k === 'decor') { if (v === 'auto') scheduleTheme(); else setTheme(v); }
      renderSettings();
    });
    $('setFs').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => toast(L('Plein écran impossible ici.'))); setTimeout(renderSettings, 300); };
    const twice = (id, fn) => { const b = $(id); b.onclick = () => { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = L('Sûr ? Re-clique'); return; } fn(); }; };
    twice('setForget', () => { localStorage.removeItem('stratajium.adapt'); toast(L('Le bot impossible a tout oublié.')); renderSettings(); });
    twice('setWipe', () => { for (const k of ['runs', 'scores', 'adapt', 'daily']) localStorage.removeItem('stratajium.' + k); RUNS = [null, null, null]; G = null; cur = -1; toast(L('Tout a été effacé.')); closeSettings(); renderMenu(); show('menu'); });
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
    { t: L('Bienvenue dans Stratajium !'), b: `<p>${L('Un jeu de stratégie au tour par tour sur une carte, un peu comme les échecs. Comment tu t’appelles ?')}</p><input id="tutoPseudo" maxlength="18" value="${esc(lsGet('pseudo', ''))}" placeholder="${L('Ton pseudo')}">` },
    { t: L('Le but'), b: `<div class="tutoic">${token(E.TI.ma, 1)}${token(E.TI.g2, 1)}${token(E.TI.g3, 1)}</div><p>${L('Tue <b>tous les dieux</b> adverses (les hexagones couronnés), ou <b>4 de ses gardes</b> (les boucliers).')}</p>` },
    { t: L('Une action par tour'), b: `<p>${L('À ton tour tu fais <b>une seule chose</b> :')}</p><ul><li>${L('<b>Recruter</b> un perso dans la réserve commune (à droite) ;')}</li><li>${L('<b>Placer</b> un perso recruté dans ta zone (cases encadrées d’or) ;')}</li><li>${L('<b>Activer</b> un de tes persos sur la carte : il se déplace, attaque ou lance un sort.')}</li></ul>` },
    { t: L('Dieux et mana'), b: `<div class="tutoic">${token(E.TI.ma, 0)}${token(E.TI.mc, 0)}${token(E.TI.md, 0)}</div><p>${L('Les dieux ne bougent pas : ils lancent des sorts qui coûtent du mana (tu en as 100 au départ). Un dieu posé sur la carte peut être tué ; dans ta réserve, il est à l’abri.')}</p>` },
    { t: L('Les gardes et les soldats'), b: `<div class="tutoic">${token(E.TI.g2, 0)}${token(E.TI.g3, 0)}${token(E.TI.g5, 0)}${token(E.TI.s, 0)}</div><p>${L('Chaque garde se déplace à sa façon (le Codex montre leurs déplacements). On tue un ennemi en arrivant sur sa case. Les soldats avancent seulement vers l’adversaire.')}</p>` },
    { t: L('Ta partie évolue'), b: `<p>${L('Avant chaque affrontement, choisis <b>normal</b> ou <b>difficile</b>. Tes victoires débloquent de nouveaux dieux, de nouveaux gardes, des cartes plus sauvages et des événements.')}</p><p class="muted">${L('Astuce : survole un perso pour lire ce qu’il fait, Ctrl+Z annule un coup, C ouvre le Codex.')}</p>` },
  ];
  function renderTuto() {
    const S = TUTO(), st = S[tutoI];
    $('tutoBody').innerHTML = `<div class="tutostep">${tutoI + 1} / ${S.length}</div><h2 class="title">${st.t}</h2><div class="tutotxt">${st.b}</div>
      <div class="menu-actions">${tutoI ? `<button class="ghost" id="tutoPrev">← ${L('Précédent')}</button>` : ''}<button class="big" id="tutoNext">${tutoI === S.length - 1 ? L('C’est parti !') : L('Suivant') + ' →'}</button></div>`;
    if ($('tutoPrev')) $('tutoPrev').onclick = () => tutoStep(-1);
    $('tutoNext').onclick = () => tutoStep(1);
    if ($('tutoPseudo')) { $('tutoPseudo').focus(); $('tutoPseudo').onchange = e => { lsSet('pseudo', e.target.value.trim().slice(0, 18)); renderMenu(); }; }
  }
  function tutoStep(d) {
    if ($('tutoPseudo')) { lsSet('pseudo', $('tutoPseudo').value.trim().slice(0, 18)); renderMenu(); }
    const n = TUTO().length;
    tutoI += d;
    if (tutoI >= n) return closeTuto();
    if (tutoI < 0) tutoI = 0;
    sfx('page'); renderTuto();
  }
  function openTuto() { tutoI = 0; renderTuto(); $('tutoModal').hidden = false; }
  function closeTuto() { $('tutoModal').hidden = true; lsSet('tutoFait', true); }
  $('btnTutoMenu').onclick = openTuto;
  $('tutoModal').addEventListener('click', e => { if (e.target === $('tutoModal') || e.target.hasAttribute('data-close')) closeTuto(); });

  // ---------- démarrage ----------
  translateStatic();
  renderMenu();
  show('menu');
  if (!lsGet('tutoFait', false)) setTimeout(openTuto, 400);

  window.STRAT_TOKEN = token;
  window.STRAT = { get G() { return G; }, E, doAction: a => doAction(a), endGame: () => endGame(), undo: () => undo(), get RUNS() { return RUNS; }, openRun: i => openRun(i), startMatch: m => startMatch(m), startDaily: () => startDaily(), get cur() { return cur; }, L };
})();
