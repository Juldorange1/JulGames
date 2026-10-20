/* Stratajium — interface : parties à plusieurs affrontements qui évoluent, plateau en forêt, animations, sons. */
(function () {
  'use strict';
  const E = StratEngine();
  const T = E.T;
  const $ = id => document.getElementById(id);
  const PN = ['Or', 'Améthyste'];
  const COLS = 'abcdefghijkl';
  const CATN = { M: 'Dieu', G: 'Garde', S: 'Soldat' };
  const LEVELN = { facile: 'Bot facile', normal: 'Bot normal', impossible: 'Bot impossible', deux: 'À deux' };
  const LEVELIC = { facile: '🌱', normal: '⚔️', impossible: '👑', deux: '👥' };
  const LEVELD = { facile: 'Pour apprendre.', normal: 'Un vrai adversaire.', impossible: 'Il calcule loin et apprend tes habitudes.', deux: 'Deux joueurs sur le même écran.' };
  const MAPLV = ['Plateau classique 8×8', 'La taille de la carte change', 'Formes simples (coins, croix, losange…)', 'Trous, lacs, anneaux, zones de placement variées', 'Tout est possible : formes mélangées'];
  const isDesktop = /Electron/i.test(navigator.userAgent);
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sfx = (n, v, d) => Sound.sfx(n, v, d);
  const sqName = q => { const g = G ? G.s.g : { W: 8, H: 8 }; return COLS[q % g.W] + (g.H - ((q / g.W) | 0)); };

  // ---------- sauvegarde ----------
  function lsGet(k, d) { try { const v = localStorage.getItem('stratajium.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem('stratajium.' + k, JSON.stringify(v)); } catch (e) { } }
  // état de jeu -> texte (les tableaux typés sont gardés tels quels)
  const ser = o => JSON.stringify(o, (k, v) => ArrayBuffer.isView(v) ? { __t: v.constructor.name, a: Array.from(v) } : v);
  const deser = str => JSON.parse(str, (k, v) => v && v.__t ? new self[v.__t](v.a) : v);

  // ---------- jetons SVG ----------
  document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="gr0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".55" stop-color="#e8b23e"/><stop offset="1" stop-color="#a86a12"/></linearGradient>
    <linearGradient id="gr1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6d8ff"/><stop offset=".55" stop-color="#9468f0"/><stop offset="1" stop-color="#4b2499"/></linearGradient>
    <linearGradient id="grn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4efe6"/><stop offset=".6" stop-color="#bdb3a3"/><stop offset="1" stop-color="#7d7364"/></linearGradient>
  </defs></svg>`);
  // un dessin propre à chaque perso (traits = couleur C ; F = dessin plein)
  const GLYPH = {
    ma: 'F<polygon points="57,22 33,54 47,54 41,79 67,44 53,44 60,22"/>', // éclair
    mb: 'S<path d="M30 40 H68 M59 31 L68 40 L59 49 M70 62 H32 M41 53 L32 62 L41 71"/>', // échange
    mc: 'S<path d="M32 28 H68 M50 24 V34 M36 28 L44 52 M64 28 L56 52"/><circle cx="50" cy="56" r="7" fill="C" stroke="none"/><path d="M50 63 V74 M42 70 H58"/>', // marionnette
    md: 'F<path d="M28 44 H40 L64 30 V70 L40 56 H28 Z"/><path d="M70 40 Q76 50 70 60" fill="none" stroke="C" stroke-width="5" stroke-linecap="round"/>', // trompette
    me: 'S<circle cx="50" cy="50" r="21"/><path d="M50 37 V63 M37 50 H63"/>', // recrutement
    pa: 'S<path d="M37 28 H63 L37 72 H63 Z"/><path d="M44 64 H56" stroke-width="8"/>', // sablier
    pb: 'S<path d="M26 66 H74 M30 52 L40 40 L47 56 L55 34 L62 54 L70 44"/>', // séisme
    pc: 'S<ellipse cx="50" cy="44" rx="19" ry="7"/><path d="M31 44 V62 Q50 72 69 62 V44 M33 24 L46 38 M67 24 L54 38"/>', // tambour
    pd: 'S<path d="M36 76 V26"/><path d="M36 28 H66 L57 39 L66 50 H36 Z" fill="C"/>', // bannière
    pe: 'S<path d="M41 47 V38 A9 9 0 0 1 59 38 V47"/><rect x="34" y="46" width="32" height="26" rx="4" fill="C" stroke="none"/>', // cadenas
    pf: 'S<circle cx="50" cy="50" r="21"/><path d="M35 65 L65 35"/>', // interdit
    pg: 'F<path d="M50 24 Q68 47 66 58 A16 16 0 0 1 34 58 Q32 47 50 24 Z"/>', // goutte de sang
    gu: 'F<path d="M50 70 C50 70 26 55 26 40 C26 30 36 24 44 28 C47 29.5 49 32 50 34 C51 32 53 29.5 56 28 C64 24 74 30 74 40 C74 55 50 70 50 70 Z"/>', // cœur
    dr: 'S<path d="M30 70 Q28 30 70 28 Q72 68 30 70 Z" fill="C"/><path d="M34 66 L64 34" stroke="#000" stroke-opacity=".35" stroke-width="4"/>', // feuille
    pr: 'S<ellipse cx="50" cy="27" rx="15" ry="5.5"/><path d="M50 38 L66 44 L64 60 Q60 70 50 74 Q40 70 36 60 L34 44 Z" fill="C"/>', // auréole
    g1: 'S<circle cx="40" cy="48" r="13"/><circle cx="60" cy="48" r="13"/>', // jumeaux
    g2: 'F<path d="M33 70 V36 H39 V28 H46 V36 H54 V28 H61 V36 H67 V70 Z"/>', // tour
    g3: 'S<path d="M42 26 Q68 48 42 70 M42 26 V70 M28 48 H66 M59 41 L66 48 L59 55"/>', // arc
    g4: 'S<path d="M50 40 C42 24 24 30 30 44 C34 52 43 49 41 42 M50 40 C58 24 76 30 70 44 C66 52 57 49 59 42 M43 46 L50 70 L57 46"/>', // bélier
    g5: 'S<path d="M34 50 L50 34 L66 50 M34 66 L50 50 L66 66"/>', // double avance
    g6: 'S<path d="M50 26 V36 M50 60 V70 M28 48 H38 M62 48 H72 M35 33 L41 39 M59 57 L65 63 M65 33 L59 39 M41 57 L35 63"/><circle cx="50" cy="48" r="7" fill="C" stroke="none"/>', // tourbillon
    g7: 'S<path d="M30 68 L43 50 L55 62 L69 38 M60 38 H69 V47"/>', // pas de danse
    c1: 'S<path d="M28 66 Q50 18 72 66 M63 61 L72 66 L74 56"/>', // saut
    c2: 'F<path d="M50 24 Q68 42 61 70 H39 Q32 42 50 24 Z"/>', // mitre
    c3: 'S<path d="M26 48 Q50 28 74 48 Q50 68 26 48 Z"/><circle cx="50" cy="48" r="7" fill="C" stroke="none"/>', // œil
    c4: 'S<path d="M28 46 Q50 32 72 46 M28 46 L50 54 L72 46 M50 26 V72 M43 33 L50 26 L57 33"/>', // arbalète
    c5: 'S<circle cx="60" cy="38" r="9" fill="C" stroke="none"/><path d="M53 45 L30 68 M49 37 L31 53 M61 49 L46 68"/>', // comète
    c6: 'S<path d="M43 26 H57 M46 26 V42 L31 70 H69 L54 42 V26"/><path d="M38 58 H62 L67 68 H33 Z" fill="C" stroke="none"/>', // fiole
    c7: 'S<circle cx="50" cy="48" r="15"/><path d="M50 24 V38 M50 58 V72 M26 48 H40 M60 48 H74"/>', // viseur
    c8: 'S<circle cx="39" cy="38" r="7"/><circle cx="61" cy="38" r="7"/><path d="M30 52 Q50 72 70 52"/>', // grenouille
    lc: 'S<path d="M50 76 V34 M40 62 H60"/><path d="M50 18 L59 33 L50 39 L41 33 Z" fill="C"/>', // lance
    cv: 'S<path d="M36 72 V34 H64"/><path d="M55 25 L64 34 L55 43"/>', // saut en L
    gd: 'S<path d="M50 28 V68 M30 48 H70 M36 34 L64 62 M64 34 L36 62"/><circle cx="50" cy="48" r="7" fill="C" stroke="none"/>', // 8 directions
    s: 'S<path d="M28 58 A22 22 0 0 1 72 58 Z" fill="C"/><path d="M24 62 H76 M50 36 V24"/>', // casque
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

  // ---------- décors ----------
  // réglages (menu Paramètres)
  const SET = Object.assign({ decor: 'auto', anim: 'normal', coords: true }, lsGet('reglages', {}));
  function applySettings() {
    document.body.classList.toggle('anim-off', SET.anim === 'aucune');
    document.body.classList.toggle('anim-fast', SET.anim === 'rapide');
    document.body.classList.toggle('no-coords', !SET.coords);
  }
  applySettings();
  const bgDecor = Decor.create(), boardDecor = Decor.create();
  const bgSeed = 1 + rnd(1e6);
  // le décor change tout seul de temps en temps (entre 3 et 7 minutes), et à chaque nouvel affrontement
  let theme = SET.decor !== 'auto' && Decor.THEMES[SET.decor] ? SET.decor : pick(Decor.THEME_IDS);
  function otherTheme() { return pick(Decor.THEME_IDS.filter(t => t !== theme)); }
  function setTheme(t, quiet) {
    if (t === theme) return;
    theme = t;
    bgDecor.setTheme(t);
    if (G && $('game').classList.contains('on')) boardDecor.setTheme(t); // sinon le plateau prendra ce décor à sa prochaine construction
    if (!quiet && G && $('game').classList.contains('on')) sys(`Le décor change : ${Decor.THEMES[t].name}.`);
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
  function toast(txt) { const t = $('toast'); t.textContent = txt; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
  function fmtDur(ms) { const t = Math.round(ms / 1000), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, sec = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0'); }
  // un clic sur n'importe quel bouton fait un petit bruit
  document.addEventListener('click', e => { if (e.target.closest('button, .chip.click, .lvl, .evo')) sfx('clic', .7); }, true);

  // ---------- parties (3 emplacements) ----------
  let RUNS = lsGet('runs', null);
  if (!Array.isArray(RUNS) || RUNS.length !== 3) RUNS = [null, null, null];
  const saveRuns = () => lsSet('runs', RUNS);
  let cur = -1, newSlot = 0;
  const run = () => RUNS[cur];
  function newRun(level) {
    return { level, gods: E.START_M.slice(), gards: E.START_G.slice(), mapLv: 0, evChance: 0, wins: 0, losses: 0, winsC: [0, 0], n: 1, first: level === 'deux' ? 'rand' : 'me', match: null, pending: null, created: Date.now(), evolutions: [] };
  }

  // ---------- menu ----------
  function renderMenu() {
    let h = '';
    RUNS.forEach((r, i) => {
      if (!r) { h += `<div class="slot empty"><div class="num">${i + 1}</div><div class="inf"><b>Emplacement libre</b><small>Commence une nouvelle partie.</small></div><div class="acts"><button class="big" data-new="${i}">Nouvelle partie</button></div></div>`; return; }
      const wl = r.level === 'deux' ? `Or ${r.winsC[0]} · Améthyste ${r.winsC[1]}` : `${r.wins} victoire${r.wins > 1 ? 's' : ''} · ${r.losses} défaite${r.losses > 1 ? 's' : ''}`;
      h += `<div class="slot"><div class="num">${i + 1}</div><div class="inf"><b>${LEVELIC[r.level]} ${LEVELN[r.level]}</b>
        <small>${wl} · affrontement n°${r.n}${r.match ? ' (en cours)' : ''}</small>
        <small>${r.gods.length} dieux · ${r.gards.length} gardes · carte niv. ${r.mapLv} · événements ${r.evChance} %</small></div>
        <div class="acts"><button class="big" data-open="${i}">Continuer</button><button class="ghost sm danger" data-del="${i}">Supprimer</button></div></div>`;
    });
    $('slots').innerHTML = h;
    $('slots').querySelectorAll('[data-new]').forEach(b => b.onclick = () => { newSlot = +b.dataset.new; renderLevels(); show('newrun'); });
    $('slots').querySelectorAll('[data-open]').forEach(b => b.onclick = () => openRun(+b.dataset.open));
    $('slots').querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      if (b.dataset.sure) { RUNS[+b.dataset.del] = null; saveRuns(); renderMenu(); sfx('annule'); return; }
      b.dataset.sure = 1; b.textContent = 'Sûr ? Re-clique'; setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = 'Supprimer'; } }, 2500);
    });
    renderScores();
  }
  function scores() { return Object.assign({ points: 0, wins: { facile: 0, normal: 0, impossible: 0 }, best: { facile: [], normal: [], impossible: [] } }, lsGet('scores', {})); }
  function renderScores() {
    const sc = scores(), ad = lsGet('adapt', null);
    let h = `<h2>Tes records</h2><p class="muted center" style="font-size:13px;margin:4px 0 8px">Tes 3 victoires les plus rapides contre chaque bot.</p>`;
    for (const lv of ['facile', 'normal', 'impossible']) {
      const b = sc.best[lv] || [], n = sc.wins[lv] || 0;
      h += `<div class="botrec"><div class="bh">${LEVELIC[lv]} ${LEVELN[lv]}</div>
        <div class="wins">${n} victoire${n > 1 ? 's' : ''} · tes 3 victoires les plus rapides :</div>
        <ol>${[0, 1, 2].map(i => b[i] !== undefined ? `<li>${fmtDur(b[i])}</li>` : '<li class="none">—</li>').join('')}</ol></div>`;
    }
    if (ad && ad.games) h += `<div class="learn">Le bot impossible a étudié ${ad.games} de tes affrontements et s’adapte à ta façon de jouer.</div>`;
    $('scoreBox').innerHTML = h;
  }
  function renderLevels() {
    $('levels').innerHTML = ['facile', 'normal', 'impossible', 'deux'].map(lv => `<button class="lvl" data-lv="${lv}"><span class="ic">${LEVELIC[lv]}</span><b>${LEVELN[lv]}</b><small>${LEVELD[lv]}</small></button>`).join('');
    $('levels').querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { RUNS[newSlot] = newRun(b.dataset.lv); saveRuns(); openRun(newSlot); });
  }
  $('btnNewBack').onclick = () => { renderMenu(); show('menu'); };
  function toggleMusic() { Sound.setMusic(!Sound.music); $('btnMusic').classList.toggle('off', !Sound.music); }
  function toggleSfx() { Sound.setEffects(!Sound.effects); $('btnSfx').classList.toggle('off', !Sound.effects); }
  $('btnMusic').onclick = toggleMusic;
  $('btnSfx').onclick = toggleSfx;
  $('btnMusic').classList.toggle('off', !Sound.music); $('btnSfx').classList.toggle('off', !Sound.effects);
  if (isDesktop) { $('btnQuit').hidden = false; $('btnQuit').onclick = () => window.close(); }

  // ---------- écran de la partie ----------
  function openRun(i) {
    cur = i;
    const r = run();
    renderRun();
    show('run');
    if (r.pending) showEvo();
  }
  function chips(ids, all) {
    return all.map(id => { const i = E.TI[id], on = ids.includes(id); return `<span class="chip ${on ? '' : 'locked'}" data-info="${i}" title="${on ? T[i].name : 'À découvrir'}">${token(i, on ? 0 : -1)}${on ? T[i].name : '?'}</span>`; }).join('');
  }
  function renderRun() {
    const r = run(), deux = r.level === 'deux';
    let h = `<h2 class="title">Partie ${cur + 1} · ${LEVELIC[r.level]} ${LEVELN[r.level]}</h2>
      <div class="runhead">
        <div class="stat"><b>${r.n}</b><small>affrontement</small></div>
        ${deux ? `<div class="stat w"><b>${r.winsC[0]}</b><small>victoires d’Or</small></div><div class="stat l"><b>${r.winsC[1]}</b><small>victoires d’Améthyste</small></div>`
        : `<div class="stat w"><b>${r.wins}</b><small>victoires</small></div><div class="stat l"><b>${r.losses}</b><small>défaites</small></div>`}
      </div>
      <div class="unl"><h4>Dieux dans la réserve (${r.gods.length}/${E.ALL_M.length})</h4><div class="row">${chips(r.gods, E.ALL_M)}</div></div>
      <div class="unl"><h4>Gardes dans la réserve (${r.gards.length}/${E.ALL_G.length}, 2 de chaque)</h4><div class="row">${chips(r.gards, E.ALL_G)}</div></div>
      <div class="unl"><h4>Carte : niveau ${r.mapLv}/4 — ${MAPLV[r.mapLv]}</h4><div class="meter"><i style="width:${r.mapLv * 25}%"></i></div></div>
      <div class="unl"><h4>Chance d’événement à chaque affrontement : ${r.evChance} %</h4><div class="meter"><i style="width:${r.evChance}%"></i></div></div>
      <p class="muted center">Celui qui commence est tiré au sort à chaque affrontement.</p>
      <div class="menu-actions">
        ${r.match ? `<button class="big" id="btnResume">Reprendre l’affrontement n°${r.n}</button><button class="ghost danger" id="btnForfeit">Abandonner l’affrontement</button>`
        : `<button class="big" id="btnStart">Lancer l’affrontement n°${r.n}</button>`}
        <button class="ghost" id="btnRunRules">📖 Codex</button>
        <button class="ghost" id="btnRunMenu">← Menu</button>
      </div>`;
    $('runBox').innerHTML = h;
    $('runBox').querySelectorAll('[data-info]').forEach(c => c.onclick = () => { if (!c.classList.contains('locked')) toast(`${T[+c.dataset.info].name} : ${T[+c.dataset.info].desc}`); });
    if ($('btnStart')) $('btnStart').onclick = startMatch;
    if ($('btnResume')) $('btnResume').onclick = resumeMatch;
    if ($('btnForfeit')) $('btnForfeit').onclick = e => {
      const b = e.currentTarget;
      if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = r.level === 'deux' ? 'Sûr ? Re-clique' : 'Sûr ? Ça compte comme une défaite'; return; }
      r.match = null; if (r.level !== 'deux') r.losses++; r.n++; saveRuns(); sfx('annule'); renderRun();
    };
    $('btnRunRules').onclick = () => openCodex('regles');
    $('btnRunMenu').onclick = () => { renderMenu(); show('menu'); };
  }

  // ---------- évolutions ----------
  function makeOffers(r) {
    const cand = [];
    const lockM = shuffle(E.ALL_M.filter(x => !r.gods.includes(x))), lockG = shuffle(E.ALL_G.filter(x => !r.gards.includes(x)));
    if (lockM[0]) cand.push({ k: 'god', id: lockM[0] });
    if (lockG[0]) cand.push({ k: 'gard', id: lockG[0] });
    if (r.mapLv < 4) cand.push({ k: 'map' });
    if (r.evChance < 100) cand.push({ k: 'event' });
    let out = shuffle(cand).slice(0, 3);
    // s'il manque des cartes : un 2e dieu ou un 2e garde
    if (out.length < 3 && lockM[1]) out.push({ k: 'god', id: lockM[1] });
    if (out.length < 3 && lockG[1]) out.push({ k: 'gard', id: lockG[1] });
    return out;
  }
  function showEvo() {
    const r = run(), offers = r.pending;
    if (!offers || !offers.length) { r.pending = null; saveRuns(); return; }
    $('evoTitle').textContent = r.level === 'deux' && r.pendingBy !== undefined ? `${PN[r.pendingBy]} choisit une évolution` : 'Évolution';
    $('evos').innerHTML = offers.map((o, k) => {
      if (o.k === 'god' || o.k === 'gard') { const i = E.TI[o.id], t = T[i]; return `<button class="evo" data-k="${k}"><div class="kind">${o.k === 'god' ? 'Nouveau dieu' : 'Nouveau garde'}</div>${token(i, 0)}<b>${t.name}</b><p>${t.desc}${t.cost ? ` <br><span style="color:var(--mana)">${t.cost} mana</span>` : ''}</p></button>`; }
      if (o.k === 'map') return `<button class="evo" data-k="${k}"><div class="kind">Cartes plus sauvages</div><span class="big-ic">🗺️</span><b>Niveau ${r.mapLv + 1}</b><p>${MAPLV[r.mapLv + 1]}.</p></button>`;
      return `<button class="evo" data-k="${k}"><div class="kind">Plus d’événements</div><span class="big-ic">🎲</span><b>${r.evChance} % → ${r.evChance + 25} %</b><p>Chance qu’un événement change les règles d’un affrontement.</p></button>`;
    }).join('');
    $('evoModal').hidden = false;
    $('evos').querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      const o = offers[+b.dataset.k];
      if (o.k === 'god') r.gods.push(o.id);
      else if (o.k === 'gard') r.gards.push(o.id);
      else if (o.k === 'map') r.mapLv++;
      else r.evChance = Math.min(100, r.evChance + 25);
      r.evolutions.push(o); r.pending = null; delete r.pendingBy; saveRuns();
      sfx('evolution');
      $('evoModal').hidden = true;
      renderRun(); show('run');
    });
  }

  // ---------- préparation d'un affrontement ----------
  let pre = null;
  function startMatch() {
    const r = run();
    const ev = Math.random() * 100 < r.evChance ? pick(E.EVENTS).id : null;
    const map = E.makeMap(r.mapLv === 0 ? 'classique' : 'aleatoire', r.mapLv);
    const first = rnd(2); // toujours tiré au sort
    pre = { ev, map, first, bet: [null, null], humans: r.level === 'deux' ? [true, true] : [true, false], level: r.level === 'deux' ? null : r.level };
    if (!ev) return beginMatch();
    showPre();
  }
  function showPre() {
    const e = E.EVENTS.find(x => x.id === pre.ev);
    let h = `<h2 class="title">Événement !</h2><div class="evcard"><b>🎲 ${e.name}</b>${e.desc}</div>`;
    if (pre.ev === 'pari') {
      if (!pre.humans[1] && pre.bet[1] === null) pre.bet[1] = pre.level === 'facile' ? rnd(2) : 0;
      for (const p of [0, 1]) {
        if (!pre.humans[p]) { h += `<p class="center">Le bot (${PN[p]}) parie que <b>${PN[pre.bet[p]]}</b> perdra en premier.</p>`; continue; }
        h += `<div class="opt"><h3>${pre.humans[1] ? PN[p] + ' parie' : 'Tu paries'} : qui perdra en premier un dieu ou 2 gardes ?</h3>
          <div class="seg" data-bet="${p}">${[0, 1].map(v => `<button data-v="${v}" class="${pre.bet[p] === v ? 'sel' : ''}">${PN[v]}${!pre.humans[1] ? (v === 0 ? ' (toi)' : ' (le bot)') : ''}</button>`).join('')}</div></div>`;
      }
    }
    const ready = pre.ev !== 'pari' || (pre.bet[0] !== null && pre.bet[1] !== null);
    h += `<div class="menu-actions"><button class="big" id="btnGo" ${ready ? '' : 'disabled'}>Commencer l’affrontement</button></div>`;
    $('preBox').innerHTML = h;
    $('preBox').querySelectorAll('[data-bet]').forEach(seg => seg.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; pre.bet[+seg.dataset.bet] = +b.dataset.v; showPre(); });
    $('btnGo').onclick = () => { if (ready) beginMatch(); };
    show('pre'); sfx('sort');
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

  // ---------- affrontement ----------
  let G = null, gid = 0;
  function newG(s, extra) {
    gid++;
    const r = run();
    return Object.assign({ id: gid, s, humans: r.level === 'deux' ? [true, true] : [true, false], level: r.level === 'deux' ? null : r.level,
      sel: null, legal: null, ver: 0, over: false, thinking: false, elapsed: 0, history: [], usage: {}, seed: 1 + rnd(1e6), lastA: null, recorded: false }, extra || {});
  }
  function beginMatch() {
    const r = run();
    const s = E.newGame({ event: pre.ev, first: pre.first, map: pre.map, gods: r.gods, gards: r.gards });
    if (pre.ev === 'pari') s.bet = pre.bet.slice();
    G = newG(s);
    $('log').innerHTML = '';
    if (SET.decor === 'auto') { setTheme(otherTheme(), true); scheduleTheme(); }
    sys(`Affrontement n°${r.n} · carte : ${pre.map.name}.`);
    const evo = E.EVENTS.find(x => x.id === pre.ev);
    if (evo) sys(`Événement : ${evo.name}.`);
    sys(`Tirage au sort : ${PN[pre.first]} commence.`);
    if (s.phase === 'draft') sys('Draft : on se partage toute la réserve, chacun son tour.');
    enterGame();
    saveMatch();
  }
  function resumeMatch() {
    const r = run();
    let d;
    try { d = deser(r.match); } catch (e) { r.match = null; saveRuns(); renderRun(); return toast('Affrontement illisible : il a été effacé.'); }
    G = newG(d.s, { elapsed: d.elapsed || 0, seed: d.seed || 1, lastA: d.lastA || null, usage: d.usage || {} });
    $('log').innerHTML = d.log || '';
    sys('Affrontement repris.');
    enterGame();
  }
  function saveMatch() {
    if (!G || cur < 0) return;
    const r = run();
    r.match = G.over ? null : ser({ s: G.s, log: $('log').innerHTML, elapsed: G.elapsed, seed: G.seed, lastA: G.lastA, usage: G.usage });
    saveRuns();
  }
  function enterGame() {
    const r = run();
    $('endModal').hidden = true;
    const evo = E.EVENTS.find(x => x.id === G.s.ev);
    $('evBadge').hidden = !evo;
    if (evo) { $('evBadge').textContent = '🎲 ' + evo.name; $('evBadge').title = evo.desc; }
    $('mapBadge').textContent = '🗺️ ' + G.s.g.name;
    $('runBadge').textContent = `Partie ${cur + 1} · affrontement ${r.n} · ${LEVELN[r.level]}`;
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

  // chrono de l'affrontement (temps infini : il ne sert qu'aux records)
  let lastTick = performance.now();
  setInterval(() => {
    const now = performance.now(), dt = now - lastTick; lastTick = now;
    if (!G || G.over || !$('game').classList.contains('on') || !$('codexModal').hidden || !$('setModal').hidden) return;
    G.elapsed += dt;
    $('timer').textContent = '⏱ ' + fmtDur(G.elapsed);
  }, 250);

  // ---------- bot ----------
  function maybeBot() {
    if (!G || G.over || G.humans[G.s.turn] || G.thinking) return;
    G.thinking = true;
    const id = G.id, ver = G.ver, t0 = performance.now();
    const opt = {};
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
      // pour « annuler le coup » : la position d'avant chaque action d'un humain
      G.history.push({ s: before, log: $('log').innerHTML, lastA: G.lastA });
      if (G.history.length > 300) G.history.shift();
      if (!(G.humans[0] && G.humans[1])) {
        // ce que tu joues, pour que le bot impossible apprenne tes habitudes
        const k = a.k === 'act' ? T[E.tix(s.b[a.from])].id : a.k === 'rec' ? 'rec:' + T[a.t].id : null;
        if (k) G.usage[k] = (G.usage[k] || 0) + 1;
      }
    }
    const betBefore = s.betDone;
    s._dead = []; s._martyr = 0;
    E.apply(s, a);
    const dead = s._dead; s._dead = null;
    G.ver++; G.sel = null;
    logLine(describe(before, a, dead), p);
    if (a.k === 'pioche' && G.humans[p]) toast(`Tu as pioché : ${T[a.t].name}`);
    if (s._martyr) { sys(`${PN[s.turn]} gagne ${s._martyr} mana (Martyr).`); sfx('mana', 1, 400); }
    if (!betBefore && s.betDone) sys(`Pari : ${PN[s.betLoser]} perd en premier ! ${[0, 1].map(q => `${PN[q]} ${s.bet[q] === s.betLoser ? '+35' : '−35'} mana`).join(', ')}.`);
    if (s.phase === 'play' && before.phase === 'draft') sys('Draft terminé, l’affrontement commence.');
    G.lastA = a;
    render();
    animate(before, s, a, dead);
    if (s.winner !== null) endGame(); else saveMatch();
    maybeBot();
  }

  // ---------- animations et sons d'une action ----------
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
    const { x, y } = sqXY(q), S = G.sq, top = -y - S * .5;
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
    // pts : positions relatives (px) depuis lesquelles la pièce arrive, la dernière étant 0,0
    if (!el || !el.animate || SET.anim === 'aucune') return;
    if (SET.anim === 'rapide') dur *= .5;
    el.animate(pts.map(([x, y]) => ({ transform: `translate(${x}px, ${y}px)` })), { duration: dur, easing: 'cubic-bezier(.3,.7,.3,1)' });
  }
  function animate(before, after, a, dead) {
    if (!G.sq) return;
    const g = after.g, S = G.sq;
    const id = a.k === 'act' && before.b[a.from] > 0 ? T[E.tix(before.b[a.from])].id : null;
    // 1) les pièces qui ont bougé : chaque pièce arrivée repart de sa case d'origine
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
        // le perso activé suit son chemin case par case
        let way = [best];
        if (id && best === a.from && ['g5', 'g7', 's', 'c8'].includes(id)) way = [best].concat(a.cl.filter(v => typeof v === 'number' && v !== q));
        if (id === 'pc' && best === a.cl[0]) way = a.cl.filter(v => typeof v === 'number' && v !== q);
        const pts = way.map(w => { const P = sqXY(w); return [P.x - Q.x, P.y - Q.y]; }).concat([[0, 0]]);
        slide(el, pts, 220 + 160 * (pts.length - 1) + bd * 25);
      } else if (el && el.animate) {
        // nouveau perso posé : il tombe sur sa case
        el.animate([{ transform: 'translateY(-36px) scale(1.35)', opacity: 0 }, { transform: 'translateY(4px) scale(.95)', opacity: 1, offset: .75 }, { transform: 'none' }], { duration: 380, easing: 'ease-out' });
        setTimeout(() => addFx('dust', q, '', { size: 1.4, life: 600 }), 260);
      }
    }
    // 2) les morts : le perso éclate
    for (const q of dead) {
      const c = before.b[q];
      if (c > 0) {
        const d = addFx('ghost-pc', q, token(E.tix(c), E.own(c)), { size: .86, life: 800 });
        d.style.animationDelay = (moved ? 120 : 0) + 'ms';
      }
      setTimeout(() => sparks(q, 12), moved ? 140 : 20);
    }
    // 3) effets propres à chaque action
    if (a.k === 'rec' || a.k === 'draft' || a.k === 'pioche') sfx('recrute');
    else if (a.k === 'pla') sfx('poser');
    else if (a.k === 'decl') sfx('choix');
    else if (a.k === 'act') {
      const from = a.from;
      const nums = a.cl.filter(v => typeof v === 'number');
      switch (id) {
        case 'ma': {
          const zone = E.areaOf(g, 'ma', a.cl[0]);
          zone.forEach((q, i) => setTimeout(() => addFx('flash', q, '', { life: 600 }), i * 25));
          for (const q of dead) bolt(q);
          addFx('ring', from, '', { color: '#bfe6ff', size: 1.4 });
          sfx('foudre');
          break;
        }
        case 'pb': {
          const zone = E.areaOf(g, 'pb', a.cl[0]);
          zone.forEach((q, i) => setTimeout(() => addFx('crack', q, '', { life: 900 }), i * 30));
          $('terrain').classList.remove('shake'); void $('terrain').offsetWidth; $('terrain').classList.add('shake');
          sfx('mur'); sfx('coup', .8, 150);
          break;
        }
        case 'mb': case 'g1': case 'mc': addFx('swirl', nums[0], '', { size: 1.3 }); addFx('swirl', id === 'g1' ? from : nums[1], '', { size: 1.3 }); sfx('echange'); break;
        case 'pr': addFx('ring', nums[0], '', { color: '#ffe9a0', size: 1.5 }); sparks(nums[0], 10, '#ffe9a0'); sfx('sort'); break;
        case 'dr': nums.forEach(q => { addFx('ring', q, '', { color: '#7ec850', size: 1.3 }); const el = sqEls[q].querySelector('.bramble'); if (el && el.animate) el.animate([{ transform: 'scale(.2) rotate(-40deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: 'ease-out' }); }); sfx('mur'); break;
        case 'c6': floatText(from, '+40 mana', '#7fd3ff'); sparks(from, 8, '#7fd3ff'); sfx('mana'); break;
        case 'pa': floatText(from, '+2 actions', '#ffe08a'); addFx('ring', from, '', { color: '#ffe08a', size: 1.5 }); sfx('sort'); break;
        case 'pe': floatText(from, '🔒 Geôlier', '#ffb3b3'); addFx('ring', from, '', { color: '#ff8a8a', size: 1.5 }); sfx('sort'); break;
        case 'pf': floatText(from, '🤫 Silence', '#ffb3b3'); addFx('ring', from, '', { color: '#ff8a8a', size: 1.5 }); sfx('sort'); break;
        case 'pg': floatText(from, '🩸 Martyr', '#ff9a9a'); addFx('ring', from, '', { color: '#ff6a6a', size: 1.5 }); sfx('sort'); break;
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

  function endGame() {
    if (G.over) return;
    G.over = true; G.sel = null; G.thinking = false;
    const s = G.s, w = s.winner, r = run();
    let title;
    if (w === 2) title = 'Match nul';
    else if (G.humans[0] && G.humans[1]) title = w === 0 ? 'Victoire d’Or !' : 'Victoire d’Améthyste !';
    else title = G.humans[w] ? 'Victoire !' : 'Défaite…';
    $('endTitle').textContent = title;
    $('endTitle').style.color = w === 2 ? '' : (w === 0 ? 'var(--gold)' : 'var(--vio)');
    $('endWhy').textContent = s.why;
    $('endScore').textContent = '';
    const humanWon = w !== 2 && G.humans[w] && !(G.humans[0] && G.humans[1]);
    if (!G.recorded) {
      G.recorded = true;
      if (r.level === 'deux') { if (w !== 2) { r.winsC[w]++; const o = makeOffers(r); r.pending = o.length ? o : null; r.pendingBy = w; } }
      else if (humanWon) {
        r.wins++;
        const sc = scores(), lv = G.level, ms = Math.round(G.elapsed);
        sc.wins[lv] = (sc.wins[lv] || 0) + 1;
        const best = (sc.best[lv] || []).concat([ms]).sort((x, y) => x - y), rank = best.indexOf(ms);
        sc.best[lv] = best.slice(0, 3); lsSet('scores', sc);
        $('endScore').textContent = `Temps : ${fmtDur(ms)}${rank === 0 ? ' · nouveau record !' : rank < 3 ? ` · ${rank + 1}ᵉ meilleur temps !` : ''}`;
        const o = makeOffers(r); r.pending = o.length ? o : null;
      } else if (w !== 2) r.losses++;
      if (G.level) learn(humanWon, s);
      r.n++; r.match = null; saveRuns();
    }
    sys(`Fin : ${title} ${s.why}`);
    Sound.want([w !== 2 && (humanWon || (G.humans[0] && G.humans[1])) ? 'victoire' : 'defaite']);
    const acts = $('endActions');
    acts.innerHTML = (r.pending ? `<button class="big" id="btnEvo">Choisir une évolution</button>` : `<button class="big" id="btnBackRun">Retour à la partie</button>`) + `<button class="ghost" id="btnLook">Voir le plateau</button>`;
    const next = () => { $('endModal').hidden = true; openRun(cur); };
    if ($('btnEvo')) $('btnEvo').onclick = next;
    if ($('btnBackRun')) $('btnBackRun').onclick = next;
    $('btnLook').onclick = () => { $('endModal').hidden = true; render(); };
    setTimeout(() => { if (G && G.over && $('game').classList.contains('on')) $('endModal').hidden = false; }, 900);
    render();
  }
  // apprentissage : le bot retient tes habitudes et renforce ce qui l'a fait perdre
  function learn(humanWon, s) {
    const ad = Object.assign({ wG: 1, wM: 1, games: 0, freq: {} }, lsGet('adapt', {}));
    for (const k in ad.freq) ad.freq[k] *= 0.9;
    for (const k in G.usage) ad.freq[k] = (ad.freq[k] || 0) + G.usage[k];
    if (humanWon) {
      if (/gardes/.test(s.why)) ad.wG = Math.min(1.8, ad.wG * 1.1);
      if (/dieux/.test(s.why)) ad.wM = Math.min(1.8, ad.wM * 1.1);
    } else { ad.wG = 1 + (ad.wG - 1) * 0.95; ad.wM = 1 + (ad.wM - 1) * 0.95; }
    ad.games++;
    lsSet('adapt', ad);
  }
  function undo() {
    if (!G || G.over) return toast(G && G.over ? 'L’affrontement est fini.' : 'Aucun coup à annuler.');
    if (!G.history.length) return toast('Aucun coup à annuler.');
    const h = G.history.pop();
    G.s = h.s; G.lastA = h.lastA; $('log').innerHTML = h.log;
    G.ver++; G.thinking = false; G.sel = null;
    sys('Coup annulé.');
    sfx('annule'); render(); saveMatch(); maybeBot();
  }
  $('btnUndo').onclick = undo;
  $('btnMenu').onclick = () => { if (G && !G.over) saveMatch(); G = null; openRun(cur); };

  // ---------- textes ----------
  const tname = i => T[i].name;
  const SIDE = { haut: 'du haut', bas: 'du bas', gauche: 'de gauche', droite: 'de droite' };
  function optLabel(x, id) {
    if (x === 'centre') return 'le centre';
    if (SIDE[x]) return (id === 'pb' ? '2e ligne ' : 'bord ') + SIDE[x];
    if (x === 'go') return '';
    if (x[0] === 'r') return 'recrute ' + T[+x.slice(1)].name;
    if (x[0] === 'v') return 'ranime ' + T[+x.slice(1)].name;
    return x;
  }
  function declText(d, s) {
    if (d.k === 'rec') return 'recruter';
    if (d.k === 'pla') return 'placer';
    const c = s.b[d.from];
    return `activer ${c > 0 ? T[E.tix(c)].name : '?'} (${sqName(d.from)})`;
  }
  function describe(b, a, dead) {
    const P = `<b>${PN[b.turn]}</b>`;
    const ds = dead.length ? ` — <span style="color:var(--danger)">${dead.length} mort${dead.length > 1 ? 's' : ''}</span>` : '';
    switch (a.k) {
      case 'rec': return `${P} recrute ${tname(a.t)}`;
      case 'draft': return b.ev === 'inverse' ? `${P} donne ${tname(a.t)} à ${PN[1 - b.turn]}` : `${P} prend ${tname(a.t)}`;
      case 'pioche': return `${P} pioche une pièce face cachée`;
      case 'pla': return `${P} place ${tname(a.t)} en ${sqName(a.to)}${E.placeFree(b, a) ? ' (gratuit, case noire)' : ''}`;
      case 'act': {
        const ti = E.tix(b.b[a.from]);
        const d = a.cl.map(x => typeof x === 'number' ? sqName(x) : optLabel(x, T[ti].id)).filter(Boolean).join(' → ');
        return `${P} active ${tname(ti)} en ${sqName(a.from)}${d ? ' : ' + d : ''}${ds}`;
      }
      case 'pass': return `${P} passe son tour`;
      case 'decl': return `${P} annonce : ${declText(a.d, b)}`;
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
    if (sel.k === 'place') {
      for (const a of legal()) if (a.k === 'pla' && a.t === sel.t) v.sq.set(a.to, 'tgt-place' + (E.placeFree(s, a) ? ' free' : ''));
      return v;
    }
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
    const longer = m.filter(a => a.cl.length > n);
    const done = m.find(a => a.cl.length === n);
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
      let why = 'Ce perso n’a aucune action possible pour l’instant.';
      if (s.noAct[s.turn]) why = 'Tu ne peux plus activer de perso (Silence).';
      else if (t.cost && s.mana[s.turn] < t.cost) why = `Pas assez de mana (${t.cost} nécessaires).`;
      else if (s.decl[s.turn] && legal().some(a => a.k !== 'pass')) why = 'Tu dois faire l’action que tu as annoncée.';
      toast(why); sfx('erreur');
    } else sfx('choix');
    render();
  }
  function clickSq(q) {
    if (!G) return;
    const s = G.s, c = s.b[q];
    if (c > 0) showInfo(E.tix(c), E.own(c));
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
        d.addEventListener('mouseenter', () => { if (G && G.s.b[q] > 0) showInfo(E.tix(G.s.b[q]), E.own(G.s.b[q])); });
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
      if (c < 0) h += BRAMBLE;
      if (c > 0) { const t = T[E.tix(c)]; h += `<div class="pc ${t.cat}">${token(E.tix(c), E.own(c))}</div>`; }
      h += '<div class="mk"></div>';
      el.innerHTML = h;
    }
    const tl = $('turnline');
    if (G.over) tl.innerHTML = s.winner === 2 ? 'Match nul' : `<span class="p${s.winner}">${PN[s.winner]}</span> a gagné`;
    else {
      let t = `Au tour de <span class="p${s.turn}">${PN[s.turn]}</span>`;
      if (s.phase === 'draft') t += ' · draft';
      if (s.phase === 'decl') t += ' · annonce';
      if (s.acts > 1) t += ` · ${s.acts} actions restantes`;
      tl.innerHTML = t;
    }
    $('btnUndo').disabled = G.over || !G.history.length;
    renderPlayers(); renderPool(); renderHint(v); music();
  }
  // musique : plus tendue quand quelqu'un est près de perdre
  function music() {
    if (!G || G.over) return;
    const s = G.s, need = s.ev === 'illimite' ? 6 : 4;
    let hot = false;
    for (const p of [0, 1]) {
      if (s.lost[p][1] >= need - 1) hot = true;
      const am = E.aliveMages(s, p);
      if (s.ev !== 'illimite' && s.lost[p][0] >= 1 && am === 1) hot = true;
      if (s.ev === 'illimite' && s.lost[p][0] >= 1) hot = true;
    }
    Sound.want(hot ? ['tension', 'foret'] : ['partie', 'foret']);
  }

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
      const label = G.humans[0] && G.humans[1] ? '' : (G.humans[p] ? ' · Toi' : ' · ' + LEVELN[G.level]);
      const gNeed = s.ev === 'illimite' ? 6 : 4;
      const am = E.aliveMages(s, p);
      let pips = '';
      for (let i = 0; i < gNeed; i++) pips += `<span class="pip ${i < s.lost[p][1] ? 'lost' : ''}"></span>`;
      let gods = '';
      for (let i = 0; i < am; i++) gods += '<span class="pip god"></span>';
      for (let i = 0; i < s.lost[p][0]; i++) gods += '<span class="pip god dead"></span>';
      let fx = '';
      if (s.noPlace[p]) fx += `<span>🔒 Ne peut plus placer : ${s.noPlace[p]} tour${s.noPlace[p] > 1 ? 's' : ''}</span>`;
      if (s.noAct[p]) fx += `<span>🤫 Ne peut plus activer : ${s.noAct[p]} tour${s.noAct[p] > 1 ? 's' : ''}</span>`;
      if (s.pend[p]) fx += `<span class="good">🩸 Martyr : +40 mana par mort au prochain tour</span>`;
      if (s.bl && s.bl[p] >= 0) fx += `<span class="good">✨ Case bénie : ${sqName(s.bl[p])}</span>`;
      if (s.decl[p]) fx += `<span class="info">Annonce : ${declText(s.decl[p], s)}</span>`;
      if (s.ev === 'pari' && s.bet && !s.betDone) fx += `<span class="info">Parie sur ${PN[s.bet[p]]}</span>`;
      let rv = '', total = 0;
      for (let i = 0; i < E.NT; i++) total += s.res[p][i];
      if (!reserveVisible(p)) rv = total ? `<span class="chip"><span class="n">? × ${total} (cachés)</span></span>` : '<span class="muted" style="font-size:13px">vide</span>';
      else {
        for (let i = 0; i < E.NT; i++) {
          const n = s.res[p][i]; if (!n) continue;
          const can = placeable.has(i) && s.turn === p;
          const sel = G.sel && G.sel.k === 'place' && G.sel.t === i && s.turn === p;
          rv += `<span class="chip ${can ? 'click' : ''} ${sel ? 'sel' : ''}" data-res="${p}:${i}">${token(i, p)}${T[i].name}${n > 1 ? ` <span class="n">×${n}</span>` : ''}</span>`;
        }
        if (!rv) rv = '<span class="muted" style="font-size:13px">vide</span>';
      }
      const thinking = !G.over && G.thinking && s.turn === p ? '<span class="thinking">réfléchit…</span>' : '';
      el.innerHTML = `<div class="who"><span class="dot"></span>${PN[p]}${label}${thinking}</div>
        <div class="manabar"><span class="crys">💎 ${s.mana[p]}</span><span class="track"><i style="width:${Math.min(100, s.mana[p] / 2)}%"></i></span></div>
        <div class="pips">Gardes perdus ${pips}</div>
        <div class="pips">Dieux ${gods || '<span class="muted">aucun engagé</span>'}</div>
        ${fx ? `<div class="fx">${fx}</div>` : ''}
        <div class="resv"><div class="lbl">À placer</div>${rv}</div>`;
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
    $('poolTitle').textContent = s.phase === 'draft' ? (s.ev === 'inverse' ? 'Draft inversé — ce que reçoit l’adversaire' : 'Draft caché') : 'Réserve commune (recruter)';
    let total = 0; for (let i = 0; i < E.NT; i++) total += s.pool[i];
    if (s.phase === 'draft' && s.ev === 'cache') {
      el.innerHTML = `<div class="facedown"><span class="chip"><span class="n">🂠 × ${total} face cachée</span></span>${hum ? '<button class="ghost sm" id="btnDraw">Piocher</button>' : ''}</div>`;
      if (hum) $('btnDraw').onclick = () => doAction({ k: 'pioche' });
      return;
    }
    if (!total) { el.innerHTML = '<span class="muted">Vide — tout a été recruté.</span>'; return; }
    const unl = s.ev === 'illimite';
    let h = '';
    for (const [cat, lbl] of [['M', 'Dieux'], ['G', 'Gardes'], ['S', 'Soldats']]) {
      let row = '';
      for (let i = 0; i < E.NT; i++) {
        if (T[i].cat !== cat || !s.pool[i]) continue;
        row += `<span class="chip ${recOk.has(i) ? 'click' : (hum ? 'off' : '')}" data-pool="${i}">${token(i, -1)}${T[i].name}<span class="n">${unl ? '∞' : '×' + s.pool[i]}</span></span>`;
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
        else if (G.s.decl[G.s.turn]) { toast('Tu dois faire l’action que tu as annoncée.'); sfx('erreur'); }
      });
    });
  }
  function renderHint(v) {
    const s = G.s, hint = $('hint'), opts = $('opts');
    let h = '', o = [];
    if (G.over) {
      h = s.why;
      o.push(`<button class="main" data-o="next">Continuer</button>`);
    } else if (!humanTurn()) h = 'Le bot réfléchit…';
    else if (s.phase === 'draft') {
      h = s.ev === 'inverse' ? 'Draft inversé : choisis dans la réserve commune un perso… qui ira à ton adversaire !' : 'Draft caché : pioche une pièce face cachée.';
      if (s.ev === 'cache') o.push(`<button class="main" data-o="draw">Piocher</button>`);
    } else if (s.phase === 'decl') {
      h = 'Annonce ta prochaine action : recruter, placer, ou touche un de tes persos pour annoncer que tu l’activeras.';
      o.push(`<button data-o="decl:rec">Annoncer : recruter</button>`, `<button data-o="decl:pla">Annoncer : placer</button>`);
    } else if (G.sel && G.sel.k === 'place') {
      h = `Place <b>${T[G.sel.t].name}</b> dans ta zone de placement (cases encadrées de ta couleur).` + (s.ev === 'noir' ? ' Les cases vertes (noires) sont gratuites.' : '');
      o.push(`<button data-o="cancel">Annuler</button>`);
    } else if (G.sel) {
      const t = T[E.tix(s.b[G.sel.from])];
      h = `<b>${t.name}</b> : ${t.desc}`;
      if (v.sq.size) h += ' <span class="muted">— choisis une case en surbrillance.</span>';
      for (const x of v.strs) {
        if (x[0] === 'r' || x[0] === 'v') { const i = +x.slice(1); o.push(`<button data-o="s:${x}">${token(i, x[0] === 'v' ? s.turn : -1)} ${x[0] === 'v' ? 'Ranimer ' : ''}${T[i].name}</button>`); }
        else if (x === 'go') o.push(`<button class="main" data-o="s:go"${t.id === 'g6' ? ' data-zone="adj"' : ''}>Activer ${t.name}</button>`);
        else o.push(`<button class="main" data-o="s:${x}" data-zone="${x}">${t.id === 'pb' ? '🌋' : '⚡'} ${x === 'centre' ? 'Le centre' : (t.id === 'pb' ? '2e ligne ' : 'Bord ') + SIDE[x]}</button>`);
      }
      if (v.complete) o.push(`<button class="main" data-o="finish">Valider (s’arrêter là)</button>`);
      o.push(`<button data-o="cancel">Annuler</button>`);
    } else {
      const L = legal(), d = s.decl[s.turn];
      h = 'Ton action : <b>recruter</b> (réserve commune), <b>placer</b> (tes persos à placer) ou <b>activer</b> un de tes persos sur la carte.';
      if (d && L.some(a => a.k !== 'pass')) h = `Tu as annoncé : <b>${declText(d, s)}</b>. Tu dois le faire.`;
      if (s.acts > 1) h += ` <b>(${s.acts} actions restantes)</b>`;
      if (L.some(a => a.k === 'pass')) { o.push(`<button class="warn" data-o="pass">Passer mon tour</button>`); if (L.length === 1) h = 'Aucune action possible : passe ton tour.'; }
    }
    hint.innerHTML = h;
    opts.innerHTML = o.join('');
    opts.querySelectorAll('button').forEach(b => {
      const k = b.dataset.o;
      b.onclick = () => {
        if (k === 'next') { $('endModal').hidden = true; return openRun(cur); }
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
  function showInfo(i, o) {
    const t = T[i];
    const who = o === 0 || o === 1 ? ` · ${PN[o]}` : ' · réserve commune';
    $('infoCard').innerHTML = `<div class="ihead">${token(i, o)}<div><div class="iname">${t.name}</div><div class="icat">${CATN[t.cat]}${who}</div></div></div>
      ${t.cost ? `<div class="icost">💎 Sort : ${t.cost} mana</div>` : ''}<div>${t.desc}</div>`;
  }

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && G && $('game').classList.contains('on')) { e.preventDefault(); return undo(); }
    if (e.key === 'Escape') {
      if (!$('codexModal').hidden) return closeCodex();
      if (!$('setModal').hidden) return closeSettings();
      if (G && G.sel) { G.sel = null; sfx('annule'); render(); }
    }
  });

  // ---------- règles ----------
  function rulesHTML() {
    const r = cur >= 0 ? run() : null;
    const has = id => !r || r.gods.includes(id) || r.gards.includes(id) || id === 's';
    const grp = (ids, title) => `<h3>${title}</h3><div class="ptable">${ids.map(id => { const i = E.TI[id], t = T[i], on = has(id); return `<div class="prow ${on ? '' : 'locked'}">${token(i, on ? 0 : -1)}<div><b>${t.name}${t.cost ? ` <span style="color:var(--mana)">💎 ${t.cost}</span>` : ''}${on ? '' : ' <small>(à débloquer dans cette partie)</small>'}</b><small>${t.desc}</small></div></div>`; }).join('')}</div>`;
    return `<h2>Stratajium — règles</h2>
    <ul>
      <li><b>Une partie</b> est une suite d’<b>affrontements</b> contre un bot dont tu choisis l’intelligence (ou à deux sur le même écran). Le temps est infini.</li>
      <li>Au début d’une partie : <b>3 dieux et 4 sortes de gardes</b> dans la réserve, le plateau classique, aucun événement.</li>
      <li><b>Chaque affrontement gagné fait évoluer la partie</b> : tu choisis entre un nouveau dieu, un nouveau garde, des cartes plus sauvages ou plus de chances d’événement. Ça vaut pour tous les affrontements suivants.</li>
      <li>Chaque joueur commence avec <b>100 mana</b>. Les dieux dépensent du mana pour lancer leur sort.</li>
      <li>À ton tour, <b>une seule action</b> : <b>recruter</b> 1 perso de la réserve commune, <b>placer</b> 1 perso recruté dans ta zone de placement, ou <b>activer</b> 1 de tes persos sur la carte.</li>
      <li><b>But</b> : tuer <b>tous les dieux</b> adverses, ou <b>4 gardes</b> adverses.</li>
      <li>Seuls les <b>soldats</b> ont un sens : ils avancent vers l’adversaire. Les gardes vont dans tous les sens ; les dieux ne bougent pas.</li>
      <li>On prend un ennemi en arrivant sur sa case. Les sorts de zone ne tuent que des ennemis.</li>
      <li>Celui qui commence est <b>tiré au sort</b> à chaque affrontement. Tu peux <b>annuler ton dernier coup</b> (↶ ou Ctrl+Z). Tes 3 victoires les plus rapides contre chaque bot sont gardées (onglet Records).</li>
    </ul>
    <p class="interp">Précisions : « tous les dieux » = l’adversaire a perdu au moins 1 dieu et il ne lui en reste aucun (ni sur la carte, ni à placer) — un dieu jamais recruté ne peut pas mourir. Les trous de la carte sont infranchissables ; un perso poussé dedans meurt. 150 tours sans aucune mort = match nul.</p>
    ${grp(E.ALL_M, 'Dieux (ils lancent des sorts)')}
    ${grp(E.ALL_G, 'Gardes (2 de chaque dans la réserve)')}
    ${grp(['s'], 'Soldat (8 dans la réserve)')}
    <h3>Événements</h3>
    <ul>${E.EVENTS.map(e => `<li><b>${e.name}</b> : ${e.desc}</li>`).join('')}</ul>
    <h3>Comment jouer</h3>
    <ul>
      <li><b>Recruter</b> : clique un perso dans la réserve commune (à droite).</li>
      <li><b>Placer</b> : clique un perso de ta liste « À placer », puis une case de ta zone.</li>
      <li><b>Activer</b> : clique ton perso sur la carte, puis les cases en surbrillance (vert = déplacement, rouge = attaque, bleu pointillé = choix d’un perso). Les sorts de zone ont des boutons sous la carte (survole-les pour voir la zone).</li>
      <li>Échap ou « Annuler » pour changer d’avis. Survole un perso pour voir ce qu’il fait.</li>
    </ul>`;
  }
  // ---------- codex : on y voit tout ----------
  const CTABS = [['regles', '📜 Règles'], ['dieux', '⬢ Dieux'], ['gardes', '🛡️ Gardes'], ['soldat', '● Soldat'], ['evenements', '🎲 Événements'], ['cartes', '🗺️ Cartes'], ['decors', '🌲 Décors'], ['records', '🏆 Records']];
  let codexTab = 'regles';
  const DIAG_W = 7, DIAG_C = 24;
  // petit plateau 7×7 : où le perso peut aller (vert), qui il peut tuer (rouge), ce qu'il choisit (bleu)
  function moveDiagram(id) {
    const ex = new Uint8Array(DIAG_W * DIAG_W).fill(1), z = []; for (let c = 0; c < DIAG_W; c++) z.push(42 + c);
    const g = E.buildGeo(DIAG_W, DIAG_W, ex, z, 'codex');
    const s = E.newGame({ map: g, gods: [], gards: [] });
    s.mana = [999, 999];
    const ti = E.TI[id];
    s.b[DIAG_C] = E.enc(ti, 0);
    const foes = [3, 8, 13, 21, 31, 38, 46], allies = [36, 15];
    for (const q of foes) s.b[q] = E.enc(E.TI.s, 1);
    for (const q of allies) s.b[q] = E.enc(E.TI.s, 0);
    const cls = new Array(49).fill('');
    if (id === 'ma') { for (const q of E.areaOf(g, 'ma', 'haut')) cls[q] = 'zone'; for (const q of g.center) cls[q] = 'zone'; }
    else if (id === 'pb') { for (const q of E.areaOf(g, 'pb', 'haut')) cls[q] = 'zone'; }
    else if (id === 'g6') { for (let d = 0; d < 8; d++) { const q = g.mv[d * g.N + DIAG_C]; if (q >= 0) cls[q] = 'zone'; } }
    else if (id === 'lc') { for (const d of [1, 3, 4, 6]) { let q = DIAG_C; for (let k = 0; k < 3; k++) { q = g.mv[d * g.N + q]; if (q < 0) break; cls[q] = 'zone'; } } }
    else {
      for (const cl of E.genAct(s, DIAG_C, true)) cl.forEach((x, k) => {
        if (typeof x !== 'number') return;
        const c = s.b[x];
        const v = c > 0 && E.own(c) === 1 && !['mc', 'mb', 'g1'].includes(id) ? 'hit' : c > 0 ? 'ally' : (k === 0 ? 'reach' : 'reach2');
        if (!cls[x] || v === 'hit' || (v === 'reach' && cls[x] === 'reach2')) cls[x] = v;
      });
    }
    let h = `<div class="diag" style="grid-template-columns:repeat(${DIAG_W},1fr)">`;
    for (let q = 0; q < 49; q++) {
      const c = s.b[q], light = (((q / DIAG_W) | 0) + q % DIAG_W) % 2 === 0;
      h += `<i class="${light ? 'l' : ''} ${cls[q]}">${c > 0 ? token(E.tix(c), E.own(c)) : ''}</i>`;
    }
    return h + '</div>';
  }
  const NODIAG = { mb: 1, mc: 1, md: 1, me: 1, pa: 1, pc: 1, pd: 1, pe: 1, pf: 1, pg: 1, gu: 1, dr: 1, pr: 1, c6: 1 };
  function pieceCards(ids) {
    const r = cur >= 0 ? run() : null;
    return `<div class="legend"><span style="--c:#3cc47a">case où il peut aller</span><span style="--c:#2b8a58">2e pas</span><span style="--c:#e04a5a">ennemi qu’il peut tuer</span><span style="--c:#ff8a5a">zone frappée</span><span style="--c:#7fb8e0">perso qu’il peut choisir</span></div>
      <div class="cards">${ids.map(id => {
      const i = E.TI[id], t = T[i];
      const inRun = r ? (r.gods.includes(id) || r.gards.includes(id) || id === 's') : null;
      const start = E.START_M.includes(id) || E.START_G.includes(id) || id === 's';
      return `<div class="ccard">${token(i, 0)}<div class="txt"><b>${t.name}</b>${t.cost ? ` <span class="cost">💎 ${t.cost} mana</span>` : ''}
        ${start ? '<span class="tag2">de départ</span>' : ''}${r && inRun ? '<span class="tag2 on">dans ta partie</span>' : ''}
        <p>${t.desc}</p>${NODIAG[id] ? '' : moveDiagram(id)}</div></div>`;
    }).join('')}</div>`;
  }
  function mapPreview(level) {
    const g = E.makeMap(level === 0 ? 'classique' : 'aleatoire', level);
    let h = `<div class="mapprev" style="grid-template-columns:repeat(${g.W},1fr);width:${g.W * 17}px">`;
    for (let q = 0; q < g.N; q++) h += `<i class="${!g.ex[q] ? 'v' : g.zone[0][q] ? 'z0' : g.zone[1][q] ? 'z1' : ''}"></i>`;
    return h + `</div><small class="muted">${g.name}</small>`;
  }
  const previews = [];
  function codexBody(tab) {
    if (tab === 'regles') return rulesHTML();
    if (tab === 'dieux') return pieceCards(E.ALL_M);
    if (tab === 'gardes') return pieceCards(E.ALL_G);
    if (tab === 'soldat') return pieceCards(['s']);
    if (tab === 'evenements') return `<div class="cards">${E.EVENTS.map(e => `<div class="ccard"><span style="font-size:34px">🎲</span><div class="txt"><b>${e.name}</b><p>${e.desc}</p></div></div>`).join('')}</div>`;
    if (tab === 'cartes') return `<p class="muted center">Chaque « carte plus sauvage » choisie en évolution fait monter d’un niveau. Exemples tirés au hasard (or = ta zone de placement, violet = celle de l’adversaire).</p>
      <div class="cards">${MAPLV.map((d, l) => `<div class="ccard"><div class="txt"><b>Niveau ${l}</b><p>${d}</p>${mapPreview(l)}</div></div>`).join('')}</div>
      <div class="menu-actions"><button class="ghost" id="btnMoreMaps">🔄 D’autres exemples</button></div>`;
    if (tab === 'decors') return `<p class="muted center">Le décor change tout seul toutes les 3 à 7 minutes et à chaque affrontement (tu peux en fixer un dans les Paramètres).</p>
      <div class="cards">${Decor.THEME_IDS.map(t => `<div class="ccard"><div class="txt"><b>${Decor.THEMES[t].name}</b>${t === theme ? ' <span class="tag2 on">en ce moment</span>' : ''}<div class="themeprev" data-theme="${t}"></div></div></div>`).join('')}</div>`;
    if (tab === 'records') {
      const sc = scores(), ad = lsGet('adapt', null);
      let h = '<div class="cards">';
      for (const lv of ['facile', 'normal', 'impossible']) {
        const b = sc.best[lv] || [], n = sc.wins[lv] || 0;
        h += `<div class="ccard"><span style="font-size:34px">${LEVELIC[lv]}</span><div class="txt"><b>${LEVELN[lv]}</b><p>${n} affrontement${n > 1 ? 's' : ''} gagné${n > 1 ? 's' : ''}. Tes 3 victoires les plus rapides :</p>
          <ol>${[0, 1, 2].map(i => b[i] !== undefined ? `<li>${fmtDur(b[i])}</li>` : '<li class="muted">—</li>').join('')}</ol></div></div>`;
      }
      h += '</div>';
      if (ad && ad.games) h += `<p class="muted center">Le bot impossible a étudié ${ad.games} de tes affrontements pour s’adapter à ta façon de jouer.</p>`;
      return h;
    }
    return '';
  }
  function renderCodex() {
    $('codexTabs').innerHTML = CTABS.map(([k, l]) => `<button data-tab="${k}" class="${k === codexTab ? 'sel' : ''}">${l}</button>`).join('');
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

  // ---------- paramètres ----------
  function segH(key, opts) { return `<div class="seg" data-set="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(SET[key]) === String(v) ? 'sel' : ''}">${l}</button>`).join('')}</div>`; }
  function renderSettings() {
    const fs = !!document.fullscreenElement;
    $('setBody').innerHTML = `
      <div class="setrow"><div class="lab"><b>🎵 Musique</b><small>Vrais morceaux libres de droits</small></div>
        <div><button class="ghost sm ${Sound.music ? '' : 'off'}" id="setMus">${Sound.music ? 'Activée' : 'Coupée'}</button> <input type="range" min="0" max="100" value="${Math.round(Sound.musicVol * 100)}" id="volMus"></div></div>
      <div class="setrow"><div class="lab"><b>🔊 Effets sonores</b><small>Pas, coups, sorts…</small></div>
        <div><button class="ghost sm ${Sound.effects ? '' : 'off'}" id="setSfx">${Sound.effects ? 'Activés' : 'Coupés'}</button> <input type="range" min="0" max="100" value="${Math.round(Sound.sfxVol * 100)}" id="volSfx"></div></div>
      <div class="setrow"><div class="lab"><b>🌲 Décor</b><small>Automatique : il change tout seul</small></div>${segH('decor', [['auto', 'Auto']].concat(Decor.THEME_IDS.map(t => [t, Decor.THEMES[t].name.replace('Forêt d’', '')])))}</div>
      <div class="setrow"><div class="lab"><b>✨ Animations</b></div>${segH('anim', [['normal', 'Normales'], ['rapide', 'Rapides'], ['aucune', 'Aucune']])}</div>
      <div class="setrow"><div class="lab"><b>🔤 Coordonnées sur la carte</b><small>Lettres et chiffres des cases</small></div>${segH('coords', [[true, 'Oui'], [false, 'Non']])}</div>
      <div class="setrow"><div class="lab"><b>🖥️ Plein écran</b><small>Aussi avec F11</small></div><button class="ghost sm" id="setFs">${fs ? 'Quitter le plein écran' : 'Plein écran'}</button></div>
      <div class="setrow"><div class="lab"><b>🧠 Apprentissage du bot impossible</b><small>Ce qu’il a retenu de ta façon de jouer</small></div><button class="ghost sm danger" id="setForget">Lui faire tout oublier</button></div>
      <div class="setrow"><div class="lab"><b>🗑️ Tout effacer</b><small>Parties, records et apprentissage</small></div><button class="ghost sm danger" id="setWipe">Tout effacer</button></div>`;
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
    $('setFs').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => toast('Plein écran impossible ici.')); setTimeout(renderSettings, 300); };
    const twice = (id, fn) => { const b = $(id); b.onclick = () => { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Sûr ? Re-clique'; return; } fn(); }; };
    twice('setForget', () => { localStorage.removeItem('stratajium.adapt'); toast('Le bot impossible a tout oublié.'); renderSettings(); });
    twice('setWipe', () => { for (const k of ['runs', 'scores', 'adapt']) localStorage.removeItem('stratajium.' + k); RUNS = [null, null, null]; G = null; cur = -1; toast('Tout a été effacé.'); closeSettings(); renderMenu(); show('menu'); });
  }
  function openSettings() { renderSettings(); $('setModal').hidden = false; sfx('page'); }
  function closeSettings() { $('setModal').hidden = true; sfx('page'); }
  $('btnSet').onclick = openSettings;
  $('btnSetMenu').onclick = openSettings;
  $('setModal').addEventListener('click', e => { if (e.target === $('setModal') || e.target.hasAttribute('data-close')) closeSettings(); });

  // ---------- démarrage ----------
  renderMenu();
  show('menu');

  // accès pour les tests et la fabrication de l'icône
  window.STRAT_TOKEN = token;
  window.STRAT = { get G() { return G; }, E, doAction: a => doAction(a), endGame: () => endGame(), undo: () => undo(), get RUNS() { return RUNS; }, openRun: i => openRun(i), startMatch: () => startMatch(), get cur() { return cur; } };
})();
