/* Stratajium — interface : parties à affrontements (normal, difficile, boss tous les 10) qui font progresser la réserve,
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
  const deser = str => JSON.parse(str, (k, v) => v && v.__t ? new self[v.__t](v.a) : v);
  const pseudo = () => lsGet('pseudo', '') || L('Joueur');
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // ---------- jetons : une créature dans un cadre aux couleurs du camp ----------
  document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <radialGradient id="bg0" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fff4cf"/><stop offset=".7" stop-color="#f0c45a"/><stop offset="1" stop-color="#b8801c"/></radialGradient>
    <radialGradient id="bg1" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#f1e8ff"/><stop offset=".7" stop-color="#b294f4"/><stop offset="1" stop-color="#6a3fd1"/></radialGradient>
    <radialGradient id="bgn" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fbf8f2"/><stop offset=".7" stop-color="#d4ccbe"/><stop offset="1" stop-color="#8a8070"/></radialGradient>
  </defs></svg>`);
  let tokSeed = 0;
  function token(ti, o) {
    const t = T[ti];
    const bg = o === 0 ? 'url(#bg0)' : o === 1 ? 'url(#bg1)' : 'url(#bgn)';
    const st = o === 0 ? '#7a4e08' : o === 1 ? '#2e1466' : '#5a5246';
    const ring = o === 0 ? '#ffd86a' : o === 1 ? '#c8a8ff' : '#e8e0d0';
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
    const crown = t.cat === 'M' ? `<path d="M38 16 L38 6 L44 11 L50 3 L56 11 L62 6 L62 16 Z" fill="${st}" stroke="${ring}" stroke-width="1.2"/>` : '';
    const d = ((tokSeed++ * 7919) % 4700) / 1000;
    return `<svg class="tk" viewBox="0 0 100 100">${frame}<g transform="translate(50 ${cy}) scale(${k}) translate(-50 -52)"><g class="crit" style="--d:-${d.toFixed(2)}s">${Art.get(t.id)}</g></g>${crown}</svg>`;
  }
  const BRAMBLE = `<svg class="bramble" viewBox="0 0 100 100"><g fill="none" stroke-linecap="round">
    <path d="M10 70 Q30 30 55 45 T92 25" stroke="#5a7a2a" stroke-width="7"/><path d="M8 35 Q40 60 60 80 T95 72" stroke="#4a6a22" stroke-width="6"/>
    <path d="M22 50 l-6 -6 M40 40 l2 -8 M62 47 l6 -5 M80 33 l2 -8 M30 55 l-5 6 M52 70 l-7 3 M72 78 l3 7" stroke="#c9d89a" stroke-width="3"/></g>
    <g fill="#3f6a2a"><ellipse cx="45" cy="42" rx="7" ry="3.5" transform="rotate(-30 45 42)"/><ellipse cx="68" cy="76" rx="7" ry="3.5" transform="rotate(20 68 76)"/></g>
    <g fill="#b8323a"><circle cx="33" cy="58" r="3"/><circle cx="74" cy="32" r="3"/></g></svg>`;
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

  // ---------- décors ----------
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
    resizeT = setTimeout(() => { bgDecor.scene($('bgForest'), bgSeed, theme); if (G && $('game').classList.contains('on')) layoutBoard(); if (!$('codexModal').hidden) renderCodex(); }, 200);
  });

  // ---------- écrans ----------
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id !== 'game') { boardDecor.stop(); closeSheet(); }
    if (id === 'menu' || id === 'newrun' || id === 'run') Sound.want(['menu']);
  }
  let toastT = 0;
  function toast(txt, ms) { const t = $('toast'); t.innerHTML = txt; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms || 3200); }
  document.addEventListener('click', e => { if (e.target.closest('button, .chip.click, .lvl, .evo, .choice')) sfx('clic', .7); }, true);
  function translateStatic() {
    document.documentElement.lang = I18N.lang;
    document.querySelectorAll('[data-l]').forEach(el => { el.textContent = L(el.getAttribute('data-l')); });
    $('btnMusic').title = L('Musique (M)'); $('btnSfx').title = L('Effets sonores (N)'); $('btnSet').title = L('Paramètres (O)');
    $('btnUndo').title = L('Revenir un coup en arrière (Ctrl+Z ou U)');
  }

  // =====================================================================
  //  Parties
  // =====================================================================
  let RUNS = lsGet('runs', null);
  if (!Array.isArray(RUNS) || RUNS.length !== 3) RUNS = [null, null, null];
  const saveRuns = () => lsSet('runs', RUNS);
  let cur = -1, newSlot = 0;
  const run = () => RUNS[cur];
  const TRACKS = { gard: { normal: 3, hardStreak: 2 }, god: { normal: 5, hard: 3 }, map: 3, event: 4 };
  const HARD = ['mana', 'riche', 'avance', 'premier', 'sauvage', 'evenement', 'dieupris'];
  const hardName = id => ({
    mana: L('Tu commences avec 60 mana au lieu de 100'), riche: L('L’adversaire commence avec 160 mana'),
    avance: L('L’adversaire a déjà un garde posé'), premier: L('L’adversaire joue en premier'),
    sauvage: L('Carte plus sauvage d’un niveau'), evenement: L('Un événement à coup sûr'), dieupris: L('L’adversaire a déjà recruté un dieu'),
  })[id];
  // exploits : certains persos ne se débloquent QUE par un exploit (dans la partie en cours)
  const EXPLOITS = [
    { id: 'colline', piece: 'dr', test: s => s.goal === 'colline' },
    { id: 'percee', piece: 'cv', test: s => s.goal === 'percee' },
    { id: 'massacre', piece: 'lc', test: s => s.goal === 'massacre' },
    { id: 'chasse', piece: 'c4', test: s => s.goal === 'chasse' },
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
    { pts: 50, id: 'mana1' }, { pts: 150, id: 'recrue' }, { pts: 300, id: 'choix4' }, { pts: 500, id: 'mana2' }, { pts: 800, id: 'garde' }, { pts: 1200, id: 'dieu' },
  ];
  const talentName = id => ({
    mana1: L('+10 mana au début de chaque affrontement'), recrue: L('Un soldat offert dans ta réserve à chaque affrontement'), choix4: L('Choix parmi 4 au lieu de 3 quand tu débloques un perso'),
    mana2: L('Encore +10 mana au début de chaque affrontement'), garde: L('Chaque nouvelle partie commence avec 1 garde de plus'), dieu: L('Chaque nouvelle partie commence avec 1 dieu de plus'),
  })[id];
  const dailyData = () => Object.assign({ total: 0, days: {} }, lsGet('daily', {}));
  const hasTalent = id => { const t = TALENTS.find(x => x.id === id); return t && dailyData().total >= t.pts; };
  const BOSS_ORDER = ['bt', 'bn', 'bd'];
  const isBossBattle = r => r.n % 10 === 0;
  const bossOf = r => BOSS_ORDER[(Math.floor(r.n / 10) - 1) % BOSS_ORDER.length];

  function newRun(level) {
    const r = {
      level, gods: E.START_M.slice(), gards: E.START_G.slice(), mapLv: 0, evChance: 0,
      wins: 0, winsH: 0, losses: 0, n: 1, match: null, pending: [], news: [], exploits: [],
      t: { gN: 0, gH: 0, dN: 0, dH: 0, map: 0, ev: 0 }, hard: shuffle(HARD).slice(0, 2), created: Date.now(),
    };
    const lockG = E.ALL_G.filter(x => !r.gards.includes(x) && !SPECIAL.has(x)), lockM = E.ALL_M.filter(x => !r.gods.includes(x) && !SPECIAL.has(x));
    if (hasTalent('garde') && lockG.length) r.gards.push(pick(lockG));
    if (hasTalent('dieu') && lockM.length) r.gods.push(pick(lockM));
    return r;
  }
  function migrate(r) {
    if (!r) return r;
    if (r.level === 'deux') r.level = 'normal'; // le mode à deux n'existe plus
    if (!r.t) r.t = { gN: 0, gH: 0, dN: 0, dH: 0, map: 0, ev: 0 };
    if (!r.hard) r.hard = shuffle(HARD).slice(0, 2);
    if (!Array.isArray(r.pending)) r.pending = [];
    if (!r.news) r.news = [];
    if (!r.exploits) r.exploits = [];
    if (r.winsH === undefined) r.winsH = 0;
    return r;
  }
  RUNS = RUNS.map(migrate);

  // ---------- menu ----------
  function renderMenu() {
    $('hello').innerHTML = L('Bonjour, <b>{p}</b> !', { p: esc(pseudo()) });
    let h = '';
    RUNS.forEach((r, i) => {
      if (!r) { h += `<div class="slot empty"><div class="num">${i + 1}</div><div class="inf"><b>${L('Emplacement libre')}</b></div><button class="big" data-new="${i}">${L('Nouvelle partie')}</button></div>`; return; }
      h += `<div class="slot"><div class="num">${i + 1}</div><div class="inf"><b>${LEVELIC[r.level]} ${levelName(r.level)}</b>
        <small>${L('{w} victoire(s) dont {h} difficile(s) · {l} défaite(s)', { w: r.wins, h: r.winsH, l: r.losses })} · ${L('affrontement n°{n}', { n: r.n })}${r.match ? ' ' + L('(en cours)') : ''}</small></div>
        <button class="big" data-open="${i}">${L('Continuer')}</button><button class="ghost sm danger" data-del="${i}" title="${L('Supprimer')}">🗑</button></div>`;
    });
    $('slots').innerHTML = h;
    $('slots').querySelectorAll('[data-new]').forEach(b => b.onclick = () => { newSlot = +b.dataset.new; renderLevels(); show('newrun'); });
    $('slots').querySelectorAll('[data-open]').forEach(b => b.onclick = () => openRun(+b.dataset.open));
    $('slots').querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      if (b.dataset.sure) { RUNS[+b.dataset.del] = null; saveRuns(); renderMenu(); sfx('annule'); return; }
      b.dataset.sure = 1; b.textContent = L('Sûr ?'); setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = '🗑'; } }, 2500);
    });
    renderDaily();
  }
  function renderLevels() {
    $('levels').innerHTML = LEVELS.map(lv => `<button class="lvl" data-lv="${lv}"><span class="ic">${LEVELIC[lv]}</span><b>${levelName(lv)}</b><small>${levelDesc(lv)}</small></button>`).join('');
    $('levels').querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { RUNS[newSlot] = newRun(b.dataset.lv); saveRuns(); openRun(newSlot); });
  }
  $('btnNewBack').onclick = () => { renderMenu(); show('menu'); };
  function toggleMusic() { Sound.setMusic(!Sound.music); $('btnMusic').classList.toggle('off', !Sound.music); }
  function toggleSfx() { Sound.setEffects(!Sound.effects); $('btnSfx').classList.toggle('off', !Sound.effects); }
  $('btnMusic').onclick = toggleMusic; $('btnSfx').onclick = toggleSfx;
  $('btnMusic').classList.toggle('off', !Sound.music); $('btnSfx').classList.toggle('off', !Sound.effects);
  if (isDesktop) { $('btnQuit').hidden = false; $('btnQuit').onclick = () => window.close(); }

  // ---------- écran de la partie ----------
  function openRun(i) { cur = i; renderRun(); show('run'); nextReward(); }
  function chips(ids, all) {
    const on = all.filter(id => ids.includes(id)), off = all.length - on.length;
    const many = on.length > 6 ? ' ic' : '';
    return on.map(id => { const i = E.TI[id]; return `<span class="chip click${many}" data-info="${i}" title="${esc(tn(i))}">${token(i, 0)}${many ? '' : `<span>${tn(i)}</span>`}</span>`; }).join('') + (off ? `<span class="chip locked">+${off} ${L('à découvrir')}</span>` : '');
  }
  function bar(v, max, label) { return `<div class="trk"><span>${label}</span><div class="meter"><i style="width:${Math.min(100, 100 * v / max)}%"></i></div><small>${fmt1(v)}/${max}</small></div>`; }
  function renderRun() {
    const r = run(), t = r.t;
    const allG = E.ALL_G.every(x => r.gards.includes(x) || SPECIAL.has(x)), allD = E.ALL_M.every(x => r.gods.includes(x) || SPECIAL.has(x));
    let h = `<div class="runtop"><h2 class="title">${L('Partie {n}', { n: cur + 1 })} · ${LEVELIC[r.level]} ${levelName(r.level)}</h2>
      <div class="runhead"><span><b>${r.n}</b> ${L('affrontement')}</span><span class="w"><b>${r.wins}</b> ${L('victoires')}</span><span><b>${r.winsH}</b> ${L('dont difficiles')}</span><span class="l"><b>${r.losses}</b> ${L('défaites')}</span></div></div>
      <div class="runbody"><div class="runcol">
        <h4>${L('Dieux dans la réserve')}</h4><div class="row">${chips(r.gods, E.ALL_M)}</div>
        <h4>${L('Gardes dans la réserve')} (${L('2 de chaque')})</h4><div class="row">${chips(r.gards, E.ALL_G)}</div>
        <h4>${L('Carte')} : ${L('niveau {n}', { n: r.mapLv })}/4 · ${L('Événements')} : ${r.evChance} %</h4>
      </div><div class="runcol">
        <h4>${L('Progression')}</h4>
        ${allG ? `<div class="trk done">${L('Tous les gardes sont débloqués')}</div>` : bar(t.gN, TRACKS.gard.normal, L('Nouveau garde : victoires normales')) + bar(t.gH, TRACKS.gard.hardStreak, L('… ou victoires difficiles d’affilée'))}
        ${allD ? `<div class="trk done">${L('Tous les dieux sont débloqués')}</div>` : bar(t.dN, TRACKS.god.normal, L('Nouveau dieu : victoires normales')) + bar(t.dH, TRACKS.god.hard, L('… ou victoires difficiles'))}
        ${r.mapLv >= 4 ? '' : bar(t.map, TRACKS.map, L('Carte plus sauvage : victoires'))}
        ${r.evChance >= 100 ? '' : bar(t.ev, TRACKS.event, L('Plus d’événements : victoires'))}
        <h4>${L('Exploits')}</h4><div class="exps">${EXPLOITS.map(x => { const done = r.exploits.includes(x.id) || r.gods.includes(x.piece) || r.gards.includes(x.piece); return `<span class="exp ${done ? 'done' : ''}" title="${esc(exploitText(x.id))}">${token(E.TI[x.piece], done ? 0 : -1)}<span>${done ? '✓ ' : ''}${exploitText(x.id)}</span></span>`; }).join('')}</div>
      </div></div>`;
    if (r.match) h += `<div class="choices one"><button class="choice" id="btnResume"><span class="ic">▶</span><b>${L('Reprendre l’affrontement n°{n}', { n: r.n })}</b><kbd>↵</kbd></button></div><div class="menu-actions"><button class="ghost danger sm" id="btnForfeit">${L('Abandonner l’affrontement')}</button>`;
    else if (isBossBattle(r)) { const b = E.TI[bossOf(r)]; h += `<div class="choices one"><button class="choice boss" id="btnStart"><span class="bossic">${token(b, 1)}</span><b>${L('Affrontement de boss : {b}', { b: tn(b) })}</b><small>${td(b)}</small><small class="gold">${L('Tue le boss pour gagner. Récompense : un perso au choix parmi tous ceux à découvrir.')}</small><kbd>↵</kbd></button></div><div class="menu-actions">`; }
    else h += `<div class="choices">
        <button class="choice" id="btnStart"><span class="ic">⚔️</span><b>${L('Affrontement normal')}</b><small>${L('Compte pour les victoires normales.')}</small><kbd>↵</kbd></button>
        <button class="choice hard" id="btnHard"><span class="ic">🔥</span><b>${L('Affrontement difficile')}</b><small>${r.hard.map(hardName).join(' · ')}</small><small class="gold">${L('Débloque plus vite les gardes et les dieux.')}</small><kbd>D</kbd></button>
      </div><div class="menu-actions">`;
    h += `<button class="ghost sm" id="btnRunCodex">${L('📖 Codex')}</button><button class="ghost sm" id="btnRunMenu">${L('← Menu')}</button></div>`;
    $('runBox').innerHTML = h;
    $('runBox').querySelectorAll('[data-info]').forEach(c => c.onclick = () => toast(`<b>${tn(+c.dataset.info)}</b> : ${td(+c.dataset.info)}`, 5000));
    if ($('btnStart')) $('btnStart').onclick = () => startMatch(isBossBattle(r) ? 'boss' : 'normal');
    if ($('btnHard')) $('btnHard').onclick = () => startMatch('hard');
    if ($('btnResume')) $('btnResume').onclick = resumeMatch;
    if ($('btnForfeit')) $('btnForfeit').onclick = e => {
      const b = e.currentTarget;
      if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = L('Sûr ? Ça compte comme une défaite'); return; }
      r.match = null; r.losses++; lossProgress(r); r.n++; r.hard = shuffle(HARD).slice(0, 2); saveRuns(); sfx('annule'); renderRun();
    };
    $('btnRunCodex').onclick = () => openCodex('progression');
    $('btnRunMenu').onclick = () => { renderMenu(); show('menu'); };
  }

  // ---------- récompenses ----------
  const nChoices = () => hasTalent('choix4') ? 4 : 3;
  function lossProgress(r) { r.t.gN += .5; r.t.dN += .5; r.t.gH = 0; checkUnlocks(r); } // une défaite rapporte un peu
  function checkUnlocks(r, by) {
    const t = r.t;
    const lockM = E.ALL_M.filter(x => !r.gods.includes(x) && !SPECIAL.has(x)), lockG = E.ALL_G.filter(x => !r.gards.includes(x) && !SPECIAL.has(x));
    if (lockG.length && (t.gN >= TRACKS.gard.normal || t.gH >= TRACKS.gard.hardStreak)) { r.pending.push({ k: 'gard', opts: shuffle(lockG).slice(0, nChoices()) }); t.gN = 0; t.gH = 0; }
    if (lockM.length && (t.dN >= TRACKS.god.normal || t.dH >= TRACKS.god.hard)) { r.pending.push({ k: 'god', opts: shuffle(lockM).slice(0, nChoices()) }); t.dN = 0; t.dH = 0; }
    if (t.map >= TRACKS.map) { t.map = 0; if (r.mapLv < 4) { r.mapLv++; r.news.push(L('🗺️ Cartes plus sauvages : niveau {n} — {d}', { n: r.mapLv, d: I18N.mapLevel(r.mapLv) })); } }
    if (t.ev >= TRACKS.event) { t.ev = 0; if (r.evChance < 100) { r.evChance += 25; r.news.push(L('🎲 Chance d’événement : {e} %', { e: r.evChance })); } }
  }
  function grantWin(r, mode, s) {
    const t = r.t;
    if (mode === 'hard') { t.gH++; t.dH++; } else if (mode === 'normal') { t.gN++; t.dN++; t.gH = 0; }
    t.map++; t.ev++;
    // exploits
    for (const x of EXPLOITS) {
      if (r.exploits.includes(x.id) || !x.test(s)) continue;
      r.exploits.push(x.id);
      const isGod = T[E.TI[x.piece]].cat === 'M', list = isGod ? r.gods : r.gards;
      if (!list.includes(x.piece)) { list.push(x.piece); r.news.push(L('🏅 Exploit ! {x} rejoint ta réserve.', { x: tn(E.TI[x.piece]) })); }
    }
    // boss vaincu : un perso au choix parmi tous ceux à découvrir
    if (mode === 'boss') {
      const lock = E.ALL_M.concat(E.ALL_G).filter(x => !r.gods.includes(x) && !r.gards.includes(x));
      if (lock.length) r.pending.push({ k: 'any', opts: shuffle(lock).slice(0, nChoices()) });
    }
    checkUnlocks(r);
  }
  function nextReward() {
    const r = run();
    if (!r) return;
    if (r.news.length) { toast(r.news.join('<br>'), 5000); r.news = []; saveRuns(); sfx('evolution'); }
    const pd = r.pending[0];
    if (!pd) return;
    $('evoTitle').textContent = pd.k === 'god' ? L('Nouveau dieu débloqué !') : pd.k === 'gard' ? L('Nouveau garde débloqué !') : L('Récompense du boss !');
    $('evoSub').textContent = L('Choisis celui qui rejoint la réserve pour tous les prochains affrontements.');
    $('evos').innerHTML = pd.opts.map((id, k) => { const i = E.TI[id], t = T[i]; return `<button class="evo" data-k="${k}"><div class="kind">${catName(t.cat)} · <kbd>${k + 1}</kbd></div>${token(i, 0)}<b>${tn(i)}</b><p>${td(i)}${t.cost ? ` <span style="color:var(--mana)">💎 ${t.cost}</span>` : ''}</p></button>`; }).join('');
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
  const DAILY = ['vite', 'survie', 'propre', 'carnage'];
  const dailyName = id => ({ vite: L('Éclair'), survie: L('Survie'), propre: L('Sans une égratignure'), carnage: L('Carnage') })[id];
  const dailyDesc = id => ({
    vite: L('Gagne en jouant le moins de tours possible.'), survie: L('Le bot stratège veut ta peau : tiens le plus de tours possible (et gagne si tu peux).'),
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
      return { date, seed, goal, level, perso: pick(Object.keys(E.PERSOS)), gods: shuffle(E.ALL_M).slice(0, 5), gards: shuffle(E.ALL_G).slice(0, 6),
        mapLv: 3 + rnd(2), ev: Math.random() < .4 ? pick(evs).id : null, first: rnd(2), mapSeed: 1 + rnd(1e9) };
    });
  }
  function renderDaily() {
    const c = dailyCfg(), d = dailyData(), best = d.days[c.date];
    const next = TALENTS.find(t => d.total < t.pts), got = TALENTS.filter(t => d.total >= t.pts).length;
    $('dailyBox').innerHTML = `<div class="dleft"><h2>📅 ${L('Défi du jour')}</h2><b class="dgoal">🎯 ${dailyName(c.goal)}</b><small>${dailyDesc(c.goal)}</small>
        <small>${LEVELIC[c.level]} ${levelName(c.level)} · ${I18N.persoName(c.perso)}${c.ev ? ' · 🎲 ' + I18N.evName(c.ev) : ''}</small></div>
      <div class="dmid"><div class="pts">${d.total}</div><small>${L('points de défi du jour')}</small>
        <small>${best ? L('Aujourd’hui : {p} pts', { p: best.best }) : L('Pas encore joué aujourd’hui.')}</small></div>
      <div class="dright"><button class="big" id="btnDaily">${best ? L('Rejouer') : L('Jouer le défi')} <kbd>J</kbd></button>
        <small>${L('Talents : {n}/{t}', { n: got, t: TALENTS.length })}${next ? ' · ' + L('prochain à {p} pts : {x}', { p: next.pts, x: talentName(next.id) }) : ''}</small></div>`;
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
    pre = { ev: c.ev, map, first: c.first, bet: [null, null], level: c.level, mode: 'daily', daily: c, perso: c.perso, gods: c.gods, gards: c.gards };
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
    const mapLv = Math.max(boss ? 2 : 0, Math.min(4, r.mapLv + (hs.includes('sauvage') ? 1 : 0)));
    const ev = boss ? null : (hs.includes('evenement') || Math.random() * 100 < r.evChance ? pickEvent() : null);
    const map = E.makeMap(mapLv === 0 ? 'classique' : 'aleatoire', mapLv);
    const first = hs.includes('premier') ? 1 : rnd(2);
    pre = { ev, map, first, bet: [null, null], level: r.level, mode, hard: hs, perso: pick(Object.keys(E.PERSOS)), gods: r.gods, gards: r.gards, boss: boss ? bossOf(r) : null };
    if (!ev && !hard && !boss) return beginMatch();
    showPre(false);
  }
  function showPre(daily) {
    let h = '';
    if (daily) { const c = pre.daily; h += `<h2 class="title">📅 ${L('Défi du jour')}</h2><div class="evcard"><b>🎯 ${dailyName(c.goal)}</b>${dailyDesc(c.goal)}</div><p class="center">${LEVELIC[c.level]} ${levelName(c.level)} · ${I18N.persoName(c.perso)} · ${I18N.mapName(pre.map)}</p>`; }
    if (pre.mode === 'hard') h += `<h2 class="title">🔥 ${L('Affrontement difficile')}</h2><div class="evcard hardc">${pre.hard.map(x => '• ' + hardName(x)).join('<br>')}</div>`;
    if (pre.boss) { const b = E.TI[pre.boss]; h += `<h2 class="title">${L('Affrontement de boss !')}</h2><div class="evcard hardc bossc">${token(b, 1)}<div><b>${tn(b)}</b>${td(b)}<br><small>${L('Il a des sbires. Tue le boss (chaque coup lui retire un point de vie) pour gagner.')}</small></div></div>`; }
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
        <div class="seg" data-bet="0">${[0, 1].map(v => `<button data-v="${v}" class="${pre.bet[0] === v ? 'sel' : ''}">${esc(nm[v])} <kbd>${v + 1}</kbd></button>`).join('')}</div></div>`;
    }
    const ready = pre.ev !== 'pari' || pre.bet[0] !== null;
    h += `<div class="menu-actions"><button class="big" id="btnGo" ${ready ? '' : 'disabled'}>${L('Commencer l’affrontement')} <kbd>↵</kbd></button><button class="ghost" id="btnPreBack">${L('Retour')}</button></div>`;
    $('preBox').innerHTML = h;
    $('preBox').querySelectorAll('[data-bet]').forEach(seg => seg.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; pre.bet[0] = +b.dataset.v; showPre(daily); });
    $('btnGo').onclick = () => { if (ready) beginMatch(); };
    $('btnPreBack').onclick = () => { if (pre.mode === 'daily') { renderMenu(); show('menu'); } else openRun(cur); };
    show('pre'); sfx('sort');
  }
  function curNames() {
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
    return Object.assign({ id: gid, s, humans: [true, false], level: 'normal', mode: 'normal', perso: null, daily: null, hard: [],
      sel: null, legal: null, ver: 0, over: false, thinking: false, history: [], seed: 1 + rnd(1e6), lastA: null, committed: false, names: ['', ''] }, extra || {});
  }
  function beginMatch() {
    const hs = pre.hard || [];
    const s = E.newGame({ event: pre.ev, first: pre.first, map: pre.map, gods: pre.gods, gards: pre.gards, goal: pre.goal, boss: pre.boss });
    if (pre.ev === 'pari') s.bet = pre.bet.slice();
    if (hs.includes('mana')) s.mana[0] = 60;
    if (hs.includes('riche')) s.mana[1] = 160;
    if (hs.includes('avance')) { const z = shuffle(s.g.zl[1].filter(q => s.b[q] === 0)); if (z.length) s.b[z[0]] = E.enc(E.TI[pick(pre.gards)], 1); }
    if (hs.includes('dieupris')) { const av = pre.gods.filter(id => s.pool[E.TI[id]] > 0); if (av.length) { const i = E.TI[pick(av)]; s.pool[i]--; s.res[1][i]++; } }
    // talents du défi du jour (pas pendant le défi lui-même)
    if (pre.mode !== 'daily') {
      if (hasTalent('mana1')) s.mana[0] += 10;
      if (hasTalent('mana2')) s.mana[0] += 10;
      if (hasTalent('recrue')) s.res[0][E.TI.s]++;
    }
    G = newG(s, { level: pre.level, mode: pre.mode, perso: pre.perso, daily: pre.daily || null, hard: hs, names: curNames() });
    $('log').innerHTML = '';
    if (SET.decor === 'auto') { setTheme(otherTheme(), true); scheduleTheme(); }
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
    G = newG(d.s, { level: r.level, mode: d.mode || 'normal', perso: d.perso || null, hard: d.hard || [], seed: d.seed || 1, lastA: d.lastA || null, history: [] });
    G.names = curNames();
    $('log').innerHTML = d.log || '';
    sys(L('Affrontement repris.'));
    enterGame();
    if (G.s.winner !== null) endGame();
  }
  function saveMatch() {
    if (!G || G.mode === 'daily' || cur < 0 || G.committed) return;
    run().match = ser({ s: G.s, log: $('log').innerHTML, seed: G.seed, lastA: G.lastA, mode: G.mode, perso: G.perso, hard: G.hard });
    saveRuns();
  }
  function enterGame() {
    PN[0] = G.names[0]; PN[1] = G.names[1];
    $('endModal').hidden = true;
    $('evBadge').hidden = !G.s.ev;
    if (G.s.ev) { $('evBadge').textContent = '🎲 ' + I18N.evName(G.s.ev); $('evBadge').title = I18N.evDesc(G.s.ev); }
    const gl = G.s.goal ? ['🎯 ' + I18N.goalName(G.s.goal), I18N.goalDesc(G.s.goal)] : G.daily ? ['🎯 ' + dailyName(G.daily.goal), dailyDesc(G.daily.goal)] : G.s.boss ? ['👹 ' + tn(E.TI[G.s.boss.kind]), td(E.TI[G.s.boss.kind])] : null;
    $('goalBadge').hidden = !gl;
    if (gl) { $('goalBadge').textContent = gl[0]; $('goalBadge').title = gl[1]; }
    $('mapBadge').textContent = '🗺️ ' + I18N.mapName(G.s.g);
    $('runBadge').textContent = G.mode === 'daily' ? L('Défi du jour') : L('Partie {n} · affrontement {a}', { n: cur + 1, a: run().n }) + (G.mode === 'hard' ? ' · 🔥' : G.mode === 'boss' ? ' · 👹' : '');
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

  // ---------- bot : rapide (le stratège réfléchit environ 1,5 s) ----------
  function maybeBot() {
    if (!G || G.over || G.humans[G.s.turn] || G.thinking) return;
    G.thinking = true;
    const id = G.id, ver = G.ver, t0 = performance.now();
    const opt = { perso: G.perso, canExtend: false };
    if (G.level === 'normal') opt.budget = 350;
    if (G.level === 'impossible') { opt.budget = 1500; opt.maxMs = 2000; }
    renderPlayers();
    askBot(G.s, G.level, opt, a => {
      const wait = Math.max(0, (SET.anim === 'normal' ? 380 : 150) - (performance.now() - t0));
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
    if (G.humans[p]) { G.history.push({ s: before, log: $('log').innerHTML, lastA: G.lastA }); if (G.history.length > 300) G.history.shift(); }
    const betBefore = s.betDone, holdBefore = s.hold ? s.hold.slice() : null, hpBefore = s.boss ? s.boss.hp : 0;
    s._dead = []; s._hits = []; s._martyr = 0; s._fire = null; s._smash = -1;
    E.apply(s, a);
    const dead = s._dead, hits = s._hits, fire = s._fire, smash = s._smash; s._dead = null; s._hits = null; s._fire = null;
    G.ver++; G.sel = null;
    logLine(describe(before, a, dead), p);
    if (a.k === 'pioche') toast(L('Tu as pioché : {x}', { x: tn(a.t) }));
    if (s._martyr) { sys(L('{p} gagne {m} mana (Martyr).', { p: PN[s.turn], m: s._martyr })); sfx('mana', 1, 400); }
    if (!betBefore && s.betDone) sys(L('Pari : {p} perd en premier !', { p: PN[s.betLoser] }));
    if (s.phase === 'play' && before.phase === 'draft') sys(L('Draft terminé, l’affrontement commence.'));
    if (holdBefore) for (const q of [0, 1]) if (s.hold[q] > holdBefore[q]) sys(L('{p} tient le centre : {n}/3.', { p: PN[q], n: s.hold[q] }));
    if (s.boss && s.boss.hp < hpBefore) sys(L('Le boss perd {n} point(s) de vie ({h} restant(s)).', { n: hpBefore - s.boss.hp, h: Math.max(0, s.boss.hp) }));
    G.lastA = a;
    render();
    animate(before, s, a, dead, hits, fire, smash);
    if (G.daily && G.daily.goal === 'carnage' && s.winner === null && Math.ceil((s.ply + (s.first0 === 0 ? 1 : 0)) / 2) > 25) { s.winner = 2; s.why = L('25 tours joués.'); }
    saveMatch();
    if (s.winner !== null) endGame();
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
  function slide(el, pts, dur) {
    if (!el || !el.animate || SET.anim === 'aucune') return;
    if (SET.anim === 'rapide') dur *= .5;
    el.animate(pts.map(([x, y]) => ({ transform: `translate(${x}px, ${y}px)` })), { duration: dur, easing: 'cubic-bezier(.3,.7,.3,1)' });
  }
  function animate(before, after, a, dead, hits, fire, smash) {
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
    if (dead.length) { sfx('coup', 1, 80); sfx('prise', .8, 120); }
  }

  // ---------- fin d'un affrontement (le résultat n'est compté qu'en continuant : on peut encore annuler son coup) ----------
  function endGame() {
    if (G.over) return;
    G.over = true; G.sel = null; G.thinking = false;
    const s = G.s, w = s.winner;
    let title;
    if (G.mode === 'daily') title = L('Défi terminé');
    else if (w === 2) title = L('Match nul');
    else title = w === 0 ? L('Victoire !') : L('Défaite…');
    $('endTitle').textContent = title;
    $('endTitle').style.color = w === 2 ? '' : (w === 0 ? 'var(--gold)' : 'var(--vio)');
    $('endWhy').textContent = I18N.why(s.why);
    $('endScore').textContent = G.mode === 'daily' ? L('{p} points de défi du jour', { p: dailyScore(G) }) : '';
    sys(L('Fin : {t}', { t: title }) + ' ' + I18N.why(s.why));
    const good = w === 0 || (G.mode === 'daily' && dailyScore(G) > 0);
    Sound.want([good ? 'victoire' : 'defaite']);
    $('endActions').innerHTML = `<button class="big" id="btnNext">${G.mode === 'daily' ? L('Retour au menu') : L('Continuer')} <kbd>↵</kbd></button>${G.history.length ? `<button class="ghost" id="btnEndUndo">↶ ${L('Annuler le coup')} <kbd>U</kbd></button>` : ''}<button class="ghost" id="btnLook">${L('Voir la carte')}</button>`;
    $('btnNext').onclick = endNext;
    if ($('btnEndUndo')) $('btnEndUndo').onclick = undo;
    $('btnLook').onclick = () => { $('endModal').hidden = true; render(); };
    setTimeout(() => { if (G && G.over && $('game').classList.contains('on')) $('endModal').hidden = false; }, 700);
    render();
  }
  // compte le résultat (une seule fois)
  function commit() {
    if (!G || !G.over || G.committed) return;
    G.committed = true;
    const s = G.s, w = s.winner;
    if (G.mode === 'daily') {
      const pts = dailyScore(G), d = dailyData(), c = G.daily, old = d.days[c.date];
      const before = TALENTS.filter(t => d.total >= t.pts).length;
      if (!old || pts > old.best) { d.total += pts - (old ? old.best : 0); d.days[c.date] = { best: pts }; lsSet('daily', d); }
      const nowT = TALENTS.filter(t => d.total >= t.pts);
      if (nowT.length > before) toast(L('🎁 Nouveau talent : {x}', { x: talentName(nowT[nowT.length - 1].id) }), 6000);
      return;
    }
    const r = run();
    if (w === 0) { r.wins++; if (G.mode === 'hard') r.winsH++; grantWin(r, G.mode, s); }
    else if (w === 1) { r.losses++; lossProgress(r); }
    r.n++; r.match = null; r.hard = shuffle(HARD).slice(0, 2);
    saveRuns();
  }
  function endNext() {
    $('endModal').hidden = true;
    commit();
    if (G && G.mode === 'daily') { G = null; renderMenu(); show('menu'); return; }
    G = null;
    openRun(cur);
  }
  function undo() {
    if (!G) return;
    if (!G.history.length) return toast(L('Aucun coup à annuler.'));
    if (G.committed) return toast(L('L’affrontement est fini.'));
    const h = G.history.pop();
    G.s = h.s; G.lastA = h.lastA; $('log').innerHTML = h.log;
    G.ver++; G.thinking = false; G.sel = null; G.over = false;
    $('endModal').hidden = true;
    sys(L('Coup annulé.'));
    sfx('annule'); render(); saveMatch(); maybeBot();
  }
  $('btnUndo').onclick = undo;
  $('btnMenu').onclick = () => {
    if (G && G.over) commit();
    if (G && G.mode === 'daily') { G = null; renderMenu(); show('menu'); return; }
    if (G && !G.over) saveMatch();
    G = null; openRun(cur);
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
      case 'act': { const ti = E.tix(b.b[a.from]); const d = a.cl.map(x => typeof x === 'number' ? sqName(x) : optLabel(x, T[ti].id)).filter(Boolean).join(' → '); return L('{p} active {x} en {c}', { p: P, x: tn(ti), c: sqName(a.from) }) + (d ? ' : ' + d : '') + ds; }
      case 'pass': return L('{p} passe son tour', { p: P });
      case 'decl': return L('{p} annonce : {d}', { p: P, d: declText(a.d, b) });
    }
    return '';
  }
  function logLine(html, p) { const li = document.createElement('li'); li.className = 'p' + p; li.innerHTML = html; $('log').prepend(li); while ($('log').children.length > 60) $('log').lastChild.remove(); }
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
      boardEl.appendChild(d); sqEls.push(d);
    }
  }
  let lastLayout = '';
  function layoutBoard() {
    if (!G) return;
    const g = G.s.g, box = $('boardBox');
    const availW = Math.max(200, box.clientWidth), availH = Math.max(200, box.clientHeight);
    const sq = Math.max(24, Math.floor(Math.min(availW / (g.W + .8), availH / (g.H + .8), 110)));
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
      if (c > 0) {
        const t = T[E.tix(c)];
        h += `<div class="pc ${t.cat}">${token(E.tix(c), E.own(c))}</div>`;
        if (t.cat === 'B' && s.boss && s.boss.q === q) h += `<div class="hp">${'❤'.repeat(Math.max(0, s.boss.hp))}<span>${'♡'.repeat(Math.max(0, s.boss.max - s.boss.hp))}</span></div>`;
      }
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
      if (s.boss && s.boss.hp > 0) t += ` · 👹 ${'❤'.repeat(s.boss.hp)}`;
      tl.innerHTML = t;
    }
    $('btnUndo').disabled = !G.history.length || G.committed;
    renderPlayers(); renderPool(); renderHint(v); music();
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
    Sound.want(hotState ? ['tension', 'foret'] : ['partie', 'foret']);
  }
  setInterval(() => { if (G && !G.over && $('game').classList.contains('on')) music(); }, 2000);

  function reserveVisible(p) { return G.s.ev !== 'cache' || G.over || G.humans[p]; }
  function renderPlayers() {
    const s = G.s;
    const placeable = new Set();
    if (humanTurn() && s.phase === 'play') for (const a of legal()) if (a.k === 'pla') placeable.add(a.t);
    for (const p of [0, 1]) {
      const el = $('pp' + p);
      el.className = `pp p${p}` + (!G.over && s.turn === p ? ' active' : '');
      const gNeed = s.ev === 'illimite' ? 6 : 4, am = E.aliveMages(s, p);
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
      else for (let i = 0; i < E.NT; i++) {
        const n = s.res[p][i]; if (!n) continue;
        const can = placeable.has(i) && s.turn === p, sel = G.sel && G.sel.k === 'place' && G.sel.t === i && s.turn === p;
        rv += `<span class="chip ic ${can ? 'click' : ''} ${sel ? 'sel' : ''}" data-res="${p}:${i}" title="${esc(tn(i))}">${token(i, p)}${n > 1 ? `<span class="cnt">${n}</span>` : ''}</span>`;
      }
      const thinking = !G.over && G.thinking && s.turn === p ? `<span class="thinking">${L('réfléchit…')}</span>` : '';
      el.innerHTML = `<div class="who"><span class="dot"></span><span class="nm">${esc(PN[p])}</span>${thinking}<span class="crys">💎 ${s.mana[p]}</span></div>
        <div class="pips">${s.goal ? '' : `<span>${L('Gardes perdus')}</span>${pips}`}<span>${L('Dieux')}</span>${gods || '–'}</div>
        ${fx ? `<div class="fx">${fx}</div>` : ''}
        <div class="resv">${rv || `<span class="muted">${L('Rien à placer')}</span>`}</div>`;
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
    let total = 0; for (let i = 0; i < E.NT; i++) total += s.pool[i];
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
        if (T[i].cat !== cat || !s.pool[i]) continue;
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
    const s = G.s, hint = $('hint'), opts = $('opts');
    let h = '', o = [];
    if (G.over) { h = I18N.why(s.why); o.push(`<button class="main" data-o="next">${L('Continuer')}</button>`); if (G.history.length && !G.committed) o.push(`<button data-o="undo">↶ ${L('Annuler le coup')}</button>`); }
    else if (!humanTurn()) h = L('{p} réfléchit…', { p: esc(PN[s.turn]) });
    else if (s.phase === 'draft') {
      h = s.ev === 'inverse' ? L('Draft inversé : choisis dans la réserve commune un perso… qui ira à ton adversaire !') : L('Draft caché : pioche une pièce face cachée.');
      if (s.ev === 'cache') o.push(`<button class="main" data-o="draw">${L('Piocher')}</button>`); else o.push(`<button class="main" data-o="pool">${L('Ouvrir la réserve')}</button>`);
    } else if (s.phase === 'decl') {
      h = L('Annonce ta prochaine action : recruter, placer, ou touche un de tes persos pour annoncer que tu l’activeras.');
      o.push(`<button data-o="decl:rec">${L('Annoncer : recruter')}</button>`, `<button data-o="decl:pla">${L('Annoncer : placer')}</button>`);
    } else if (G.sel && G.sel.k === 'place') {
      h = L('Place <b>{x}</b> dans ta zone de placement (cases encadrées de ta couleur).', { x: tn(G.sel.t) }) + (s.ev === 'noir' ? ' ' + L('Les cases vertes (noires) sont gratuites.') : '');
      o.push(`<button data-o="cancel">${L('Annuler')}</button>`);
    } else if (G.sel) {
      const ti = E.tix(s.b[G.sel.from]), t = T[ti];
      h = `<b>${tn(ti)}</b> : ${td(ti)}`;
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
      if (L2.some(a => a.k === 'rec')) o.push(`<button class="pooltab" data-o="pool">➕ ${L('Recruter')}</button>`);
      if (L2.some(a => a.k === 'pass')) { o.push(`<button class="warn" data-o="pass">${L('Passer mon tour')}</button>`); if (L2.length === 1) h = L('Aucune action possible : passe ton tour.'); }
    }
    hint.innerHTML = h;
    opts.innerHTML = o.map((b, i) => i < 9 ? b.replace(/<\/button>$/, ` <kbd>${i + 1}</kbd></button>`) : b).join('');
    opts.querySelectorAll('button').forEach(b => {
      const k = b.dataset.o;
      b.onclick = () => {
        if (k === 'next') return endNext();
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
      <div class="idesc">${td(i)}</div>${q !== undefined ? specLine(q) : ''}`;
  }
  function specLine(q) { const k = G && G.s.g.spec[q]; return k ? `<div class="specline">${SPEC_SVG[k]}<span><b>${I18N.specName(k)}</b> : ${I18N.specDesc(k)}</span></div>` : ''; }
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
  function modalOpen() { return ['codexModal', 'setModal', 'evoModal', 'tutoModal', 'endModal'].find(id => !$(id).hidden); }
  document.addEventListener('keydown', e => {
    if (e.target.matches && e.target.matches('input, textarea, select')) return;
    const k = e.key, ctrl = e.ctrlKey || e.metaKey, m = modalOpen();
    if (k === 'Escape') {
      if (m === 'codexModal') return closeCodex();
      if (m === 'setModal') return closeSettings();
      if (m === 'tutoModal') return closeTuto();
      if (m === 'endModal') { $('endModal').hidden = true; return; }
      if (sheet) return closeSheet();
      if (G && G.sel) { G.sel = null; sfx('annule'); render(); }
      return;
    }
    if (m === 'evoModal') { const n = +k; if (n >= 1 && n <= 4) { const b = $('evos').querySelector(`[data-k="${n - 1}"]`); if (b) b.click(); } return; }
    if (m === 'endModal') { if (k === 'Enter' || k === ' ') { e.preventDefault(); $('btnNext').click(); } if ((k === 'u' || k === 'U' || (ctrl && (k === 'z' || k === 'Z')))) { e.preventDefault(); undo(); } return; }
    if (m === 'tutoModal') { if (k === 'ArrowRight' || k === 'Enter') tutoStep(1); if (k === 'ArrowLeft') tutoStep(-1); return; }
    if (m === 'codexModal') { if (k === 'ArrowRight') codexPage(1); if (k === 'ArrowLeft') codexPage(-1); return; }
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
    if (scr === 'pre') { if (k === 'Enter') $('btnGo').click(); const n = +k; if ((n === 1 || n === 2) && document.querySelector('[data-bet] button')) document.querySelectorAll('[data-bet] button')[n - 1].click(); return; }
    if (scr === 'newrun') { const n = +k; if (n >= 1 && n <= 3) $('levels').querySelectorAll('button')[n - 1].click(); if (k === 'Backspace') $('btnNewBack').click(); return; }
    if (scr === 'menu') { const n = +k; if (n >= 1 && n <= 3) { const b = document.querySelector(`[data-open="${n - 1}"]`) || document.querySelector(`[data-new="${n - 1}"]`); if (b) b.click(); } if (k === 'j' || k === 'J') $('btnDaily').click(); return; }
    if (scr !== 'game' || !G) return;
    if (ctrl && (k === 'z' || k === 'Z')) { e.preventDefault(); return undo(); }
    if (k === 'u' || k === 'U') return undo();
    if (k === 'p' || k === 'P') { const b = document.querySelector('#opts [data-o="pass"]'); if (b) b.click(); return; }
    if (k === 'r' || k === 'R') return openSheet('pool');
    if (k === 'Enter' || k === ' ') { e.preventDefault(); const b = document.querySelector('#opts [data-o="finish"]') || document.querySelector('#opts .main'); if (b) b.click(); return; }
    const n = +k;
    if (n >= 1 && n <= 9) { const b = $('opts').querySelectorAll('button')[n - 1]; if (b) b.click(); return; }
    if (k === 'Tab') {
      e.preventDefault();
      if (!humanTurn() || G.s.phase !== 'play') return;
      const froms = [...new Set(legal().filter(a => a.k === 'act').map(a => a.from))];
      if (!froms.length) return toast(L('Aucun perso à activer.'));
      const curF = G.sel && G.sel.k === 'piece' ? G.sel.from : -1, i = froms.indexOf(curF);
      selectPiece(froms[(i + (e.shiftKey ? froms.length - 1 : 1)) % froms.length]);
    }
  });
  const SHORTCUTS = () => [
    ['Esc', L('Annuler la sélection, fermer une fenêtre')], ['Ctrl+Z / U', L('Annuler le coup')], ['Tab / ⇧+Tab', L('Choisir le perso suivant / précédent')],
    ['1 … 9', L('Boutons sous la carte (sorts, choix, recrues…)')], ['↵ / ␣', L('Valider, continuer')], ['P', L('Passer son tour')], ['R', L('Ouvrir la réserve')],
    ['C', L('Codex')], ['O', L('Paramètres')], ['M / N', L('Musique / effets sonores')], ['H / F1', L('Tutoriel')], ['F11', L('Plein écran')],
    ['1, 2, 3', L('Menu : ouvrir une partie')], ['J', L('Menu : défi du jour')], ['↵ / D', L('Partie : affrontement normal / difficile')], ['← →', L('Codex : page précédente / suivante')],
  ];

  // =====================================================================
  //  Codex (pages, sans défilement)
  // =====================================================================
  const CTABS = () => [['regles', L('📜 Règles')], ['dieux', L('⬢ Dieux')], ['gardes', L('🛡️ Gardes')], ['autres', L('👹 Soldat & boss')], ['evenements', L('🎲 Événements')], ['cartes', L('🗺️ Cartes')],
    ['decors', L('🌲 Décors')], ['bots', L('🤖 Bots')], ['progression', L('📈 Progression')], ['raccourcis', L('⌨️ Raccourcis')]];
  let codexTab = 'regles', codexPg = 0, codexPages = 1;
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
    let h = `<div class="diag">`;
    for (let q = 0; q < 49; q++) { const c = s.b[q], light = (((q / DIAG_W) | 0) + q % DIAG_W) % 2 === 0; h += `<i class="${light ? 'l' : ''} ${cls[q]}">${q === DIAG_C ? token(E.tix(c), 0) : c > 0 ? `<b class="${E.own(c) ? 'en' : 'al'}"></b>` : ''}</i>`; }
    return h + '</div>';
  }
  const NODIAG = { mb: 1, mc: 1, md: 1, me: 1, pa: 1, pc: 1, pd: 1, pe: 1, pf: 1, pg: 1, gu: 1, dr: 1, pr: 1, c6: 1, bt: 1, bn: 1, bd: 1 };
  function pieceCards(ids) {
    const r = cur >= 0 ? run() : null;
    return ids.map(id => {
      const i = E.TI[id], t = T[i];
      const inRun = r ? (r.gods.includes(id) || r.gards.includes(id) || id === 's') : null;
      const start = E.START_M.includes(id) || E.START_G.includes(id) || id === 's';
      const ex = EXPLOITS.find(x => x.piece === id);
      return `<div class="ccard">${token(i, t.cat === 'B' || id === 'mi' ? 1 : 0)}<div class="txt"><b>${tn(i)}</b>${t.cost ? ` <span class="cost">💎 ${t.cost}</span>` : ''}
        ${start ? `<span class="tag2">${L('de départ')}</span>` : ''}${r && inRun ? `<span class="tag2 on">${L('dans ta partie')}</span>` : ''}${ex ? `<span class="tag2 gold">🏅 ${exploitText(ex.id)}</span>` : ''}
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
    if (tab === 'dieux') return pieceCards(E.ALL_M);
    if (tab === 'gardes') return pieceCards(E.ALL_G);
    if (tab === 'autres') return pieceCards(['s']).concat([textBlock(`<h3>${L('Boss')}</h3><p>${L('Tous les 10 affrontements, un boss t’attend avec ses sbires. Chaque coup lui retire un point de vie ; tue-le pour gagner.')}</p>`)]).concat(pieceCards(['bt', 'bn', 'bd', 'mi']));
    if (tab === 'evenements') return E.EVENTS.map(e => card('🎲', I18N.evName(e.id), I18N.evDesc(e.id), e.weight ? ` <span class="tag2 on">${L('plus fréquent')}</span>` : ''))
      .concat([textBlock(`<h3>${L('Objectifs mystère')}</h3><p class="muted">${L('Pour tous les objectifs : au bout de 60 tours chacun (30 pour l’Endurance), celui qui a perdu le moins de persos gagne.')}</p>`)])
      .concat(E.GOALS.map(gl => card('🎯', I18N.goalName(gl.id), I18N.goalDesc(gl.id))));
    if (tab === 'cartes') return E.MAPS.map(([id, , lv]) => { const g = exampleMap(id); return `<div class="ccard"><div class="txt"><b>${I18N.mapKind(id)}</b> <span class="tag2">${L('niveau {n}', { n: lv })}</span><p>${I18N.mapKindDesc(id)}</p></div>${g ? mapPreview(g) : ''}</div>`; })
      .concat([1, 2].map(k => card(SPEC_SVG[k], I18N.specName(k), I18N.specDesc(k), ` <span class="tag2">${L('case spéciale')}</span>`)))
      .concat([textBlock(`<h3>${L('Niveaux de sauvagerie')}</h3><ul>${[0, 1, 2, 3, 4].map(n => `<li><b>${L('Niveau {n}', { n })}</b> : ${I18N.mapLevel(n)}</li>`).join('')}</ul>`)]);
    if (tab === 'decors') return Decor.THEME_IDS.map(t => `<div class="ccard"><div class="txt"><b>${I18N.themeName(t)}</b>${t === theme ? ` <span class="tag2 on">${L('en ce moment')}</span>` : ''}<div class="themeprev" data-theme="${t}"></div></div></div>`);
    if (tab === 'bots') return ['facile', 'normal', 'impossible'].map(lv => card(LEVELIC[lv], levelName(lv), ({ facile: L('Joue souvent au hasard et rate des prises. Parfait pour apprendre.'), normal: L('Regarde 2 coups à l’avance, voit les menaces immédiates.'), impossible: L('Le plus fort : il calcule plusieurs coups à l’avance et lit les menaces, en environ 1,5 seconde. Il n’a aucun avantage, et on peut le battre, même en difficile.') })[lv]))
      .concat([textBlock(`<h3>${L('Caractères')}</h3><p class="muted">${L('À chaque affrontement, le bot reçoit un caractère tiré au hasard. Il change sa façon de jouer, pas sa force.')}</p>`)])
      .concat(Object.keys(E.PERSOS).map(id => card('🎭', I18N.persoName(id), I18N.persoDesc(id))));
    if (tab === 'progression') return [
      textBlock(`<p>${L('Avant chaque affrontement, tu choisis : <b>normal</b> ou <b>difficile</b> (avec 2 handicaps tirés au hasard). Tes victoires font avancer ces barres :')}</p>
        <ul><li><b>${L('Nouveau garde')}</b> : ${L('3 victoires normales, ou 2 victoires difficiles d’affilée. Tu choisis parmi 3.')}</li>
        <li><b>${L('Nouveau dieu')}</b> : ${L('5 victoires normales, ou 3 victoires difficiles. Tu choisis parmi 3.')}</li>
        <li><b>${L('Carte plus sauvage')}</b> : ${L('toutes les 3 victoires (niveau 0 à 4).')}</li>
        <li><b>${L('Plus d’événements')}</b> : ${L('+25 % toutes les 4 victoires.')}</li>
        <li><b>${L('Défaites')}</b> : ${L('chaque défaite rapporte quand même une demi-victoire normale vers le prochain garde et le prochain dieu.')}</li></ul>`),
      textBlock(`<h3>${L('Boss')}</h3><p>${L('Tous les 10 affrontements, un boss t’attend avec ses sbires. Chaque coup lui retire un point de vie ; tue-le pour gagner.')} ${L('Récompense : un perso au choix parmi tous ceux à découvrir.')}</p>`),
      textBlock(`<h3>${L('Exploits')}</h3><p class="muted">${L('Ces persos ne se débloquent que par un exploit :')}</p><ul>${EXPLOITS.map(x => `<li><b>${tn(E.TI[x.piece])}</b> : ${exploitText(x.id)}</li>`).join('')}</ul>`),
      textBlock(`<h3>${L('Défi du jour et talents')}</h3><p>${L('Chaque jour, la même carte, la même réserve et le même objectif pour tout le monde. Ton meilleur score du jour s’ajoute à tes points de défi du jour, qui débloquent des talents pour toujours :')}</p><ul>${TALENTS.map(t => `<li class="${dailyData().total >= t.pts ? 'ok' : ''}"><b>${t.pts} ${L('pts')}</b> : ${talentName(t.id)}</li>`).join('')}</ul>`),
      textBlock(`<h3>${L('Handicaps possibles')}</h3><ul>${HARD.map(h => `<li>${hardName(h)}</li>`).join('')}</ul>`),
    ];
    if (tab === 'raccourcis') return [`<table class="keys">${SHORTCUTS().slice(0, 8).map(([k, d]) => `<tr><td><kbd>${k}</kbd></td><td>${d}</td></tr>`).join('')}</table>`, `<table class="keys">${SHORTCUTS().slice(8).map(([k, d]) => `<tr><td><kbd>${k}</kbd></td><td>${d}</td></tr>`).join('')}</table>`];
    return [];
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
        <li>${L('Celui qui commence est <b>tiré au sort</b>. Tu peux <b>annuler ton dernier coup</b> (↶, Ctrl+Z ou U), même après la fin d’un affrontement.')}</li></ul>`),
      textBlock(`<p class="interp">${L('Précisions : « tous les dieux » = l’adversaire a perdu au moins 1 dieu et il ne lui en reste aucun (ni sur la carte, ni à placer) — un dieu jamais recruté ne peut pas mourir. Les trous de la carte sont infranchissables ; un perso poussé dedans meurt. 150 tours sans aucune mort = match nul.')}</p>`),
      textBlock(`<h3>${L('Comment jouer')}</h3><ul>
        <li>${L('<b>Recruter</b> : ouvre la réserve commune (bouton ➕ Recruter ou touche R) et clique un perso.')}</li>
        <li>${L('<b>Placer</b> : clique un perso de ta liste « À placer », puis une case de ta zone.')}</li>
        <li>${L('<b>Activer</b> : clique ton perso sur la carte, puis les cases en surbrillance (vert = déplacement, rouge = attaque, bleu pointillé = choix d’un perso). Les sorts de zone ont des boutons sous la carte (survole-les pour voir la zone).')}</li>
        <li>${L('Survole un perso ou une case spéciale pour voir ce qu’il fait. Tous les raccourcis clavier sont dans l’onglet Raccourcis.')}</li></ul>`),
    ];
  }
  const previews = [];
  function renderCodex() {
    $('codexTabs').innerHTML = CTABS().map(([k, l]) => `<button data-tab="${k}" class="${k === codexTab ? 'sel' : ''}">${l}</button>`).join('');
    $('codexTabs').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { codexTab = b.dataset.tab; codexPg = 0; sfx('page'); renderCodex(); });
    while (previews.length) previews.pop().stop();
    const body = $('codexBody'), blocks = codexBlocks(codexTab);
    // pagination : on range les blocs en colonnes, page après page, sans jamais dépasser la hauteur
    const isText = codexTab === 'regles' || codexTab === 'progression' || codexTab === 'raccourcis';
    const gap = 10, W = body.clientWidth, H = body.clientHeight, minW = isText ? 400 : 330;
    const N = Math.max(1, Math.min(isText ? 2 : 3, Math.floor((W + gap) / (minW + gap)))), colW = (W - gap * (N - 1)) / N;
    body.innerHTML = `<div style="width:${colW}px">${blocks.map(b => `<div class="cb">${b}</div>`).join('')}</div>`;
    const hs = [...body.querySelectorAll('.cb')].map(e => e.offsetHeight);
    const pages = [];
    let pg = null;
    blocks.forEach((b, i) => {
      if (pg) {
        let best = -1;
        for (let c = 0; c < N; c++) if (pg.h[c] + (pg.h[c] ? gap : 0) + hs[i] <= H && (best < 0 || pg.h[c] < pg.h[best])) best = c;
        if (best >= 0) { pg.cols[best].push(i); pg.h[best] += (pg.h[best] ? gap : 0) + hs[i]; return; }
      }
      pg = { cols: Array.from({ length: N }, () => []), h: new Array(N).fill(0) };
      pg.cols[0].push(i); pg.h[0] = hs[i]; pages.push(pg);
    });
    codexPages = Math.max(1, pages.length);
    if (codexPg >= codexPages) codexPg = codexPages - 1;
    const P = pages[codexPg];
    body.innerHTML = P ? `<div class="cpage">${P.cols.map(c => `<div class="ccol">${c.map(i => `<div class="cb">${blocks[i]}</div>`).join('')}</div>`).join('')}</div>` : '';
    $('codexPager').innerHTML = codexPages > 1 ? `<button class="ghost sm" id="cPrev" ${codexPg ? '' : 'disabled'}>◀</button><span>${codexPg + 1} / ${codexPages}</span><button class="ghost sm" id="cNext" ${codexPg < codexPages - 1 ? '' : 'disabled'}>▶</button>` : '';
    if ($('cPrev')) $('cPrev').onclick = () => codexPage(-1);
    if ($('cNext')) $('cNext').onclick = () => codexPage(1);
    body.querySelectorAll('[data-theme]').forEach(el => { const d = Decor.create(); d.scene(el, 7 + Decor.THEME_IDS.indexOf(el.dataset.theme), el.dataset.theme); d.stop(); previews.push(d); });
  }
  function codexPage(d) { const n = codexPg + d; if (n < 0 || n >= codexPages) return; codexPg = n; sfx('page'); renderCodex(); }
  function openCodex(tab) { if (tab) { codexTab = tab; codexPg = 0; } $('codexModal').hidden = false; renderCodex(); sfx('page'); }
  function closeCodex() { $('codexModal').hidden = true; while (previews.length) previews.pop().stop(); sfx('page'); }
  $('btnCodex').onclick = () => openCodex();
  $('btnCodexMenu').onclick = () => { const c = cur; cur = -1; openCodex(); cur = c; };
  $('codexModal').addEventListener('click', e => { if (e.target === $('codexModal') || e.target.hasAttribute('data-close')) closeCodex(); });

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
      <div class="setrow"><div class="lab"><b>🌲 ${L('Décor')}</b></div>${segH('decor', [['auto', L('Auto')]].concat(Decor.THEME_IDS.map(t => [t, I18N.themeShort(t)])))}</div>
      <div class="setrow"><div class="lab"><b>✨ ${L('Animations')}</b></div>${segH('anim', [['normal', L('Normales')], ['rapide', L('Rapides')], ['aucune', L('Aucune')]])}</div>
      <div class="setrow"><div class="lab"><b>🔤 ${L('Coordonnées sur la carte')}</b></div>${segH('coords', [[true, L('Oui')], [false, L('Non')]])}</div>
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
    { t: L('Bienvenue dans Stratajium !'), b: `<p>${L('Un jeu de stratégie au tour par tour sur une carte, un peu comme les échecs. Comment tu t’appelles ?')}</p><input id="tutoPseudo" maxlength="18" value="${esc(lsGet('pseudo', ''))}" placeholder="${L('Ton pseudo')}">` },
    { t: L('Le but'), b: `<div class="tutoic">${token(E.TI.ma, 1)}${token(E.TI.mc, 1)}${token(E.TI.g2, 1)}${token(E.TI.g3, 1)}</div><p>${L('Tue <b>tous les dieux</b> adverses (les hexagones couronnés), ou <b>4 de ses gardes</b> (les boucliers).')}</p>` },
    { t: L('Une action par tour'), b: `<p>${L('À ton tour tu fais <b>une seule chose</b> :')}</p><ul><li>${L('<b>Recruter</b> un perso dans la réserve commune ;')}</li><li>${L('<b>Placer</b> un perso recruté dans ta zone (cases encadrées d’or) ;')}</li><li>${L('<b>Activer</b> un de tes persos sur la carte : il se déplace, attaque ou lance un sort.')}</li></ul>` },
    { t: L('Dieux et mana'), b: `<div class="tutoic">${token(E.TI.ma, 0)}${token(E.TI.mc, 0)}${token(E.TI.md, 0)}</div><p>${L('Les dieux ne bougent pas : ils lancent des sorts qui coûtent du mana (tu en as 100 au départ). Un dieu posé sur la carte peut être tué ; dans ta réserve, il est à l’abri.')}</p>` },
    { t: L('Les gardes et les soldats'), b: `<div class="tutoic">${token(E.TI.g2, 0)}${token(E.TI.g3, 0)}${token(E.TI.g5, 0)}${token(E.TI.s, 0)}</div><p>${L('Chaque garde se déplace à sa façon (le Codex montre leurs déplacements). On tue un ennemi en arrivant sur sa case. Les soldats avancent seulement vers l’adversaire.')}</p>` },
    { t: L('Ta partie évolue'), b: `<p>${L('Avant chaque affrontement, choisis <b>normal</b> ou <b>difficile</b>. Tes victoires débloquent de nouveaux dieux, de nouveaux gardes, des cartes plus sauvages et des événements. Tous les 10 affrontements, un boss t’attend !')}</p><p class="muted">${L('Astuce : survole un perso pour lire ce qu’il fait, Ctrl+Z annule un coup, C ouvre le Codex.')}</p>` },
  ];
  function renderTuto() {
    const S = TUTO(), st = S[tutoI];
    $('tutoBody').innerHTML = `<div class="tutostep">${tutoI + 1} / ${S.length}</div><h2 class="title">${st.t}</h2><div class="tutotxt">${st.b}</div>
      <div class="menu-actions">${tutoI ? `<button class="ghost" id="tutoPrev">← ${L('Précédent')}</button>` : ''}<button class="big" id="tutoNext">${tutoI === S.length - 1 ? L('C’est parti !') : L('Suivant') + ' →'}</button></div>`;
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
  $('btnTutoMenu').onclick = openTuto;
  $('tutoModal').addEventListener('click', e => { if (e.target === $('tutoModal') || e.target.hasAttribute('data-close')) closeTuto(); });

  // ---------- démarrage ----------
  translateStatic();
  renderMenu();
  show('menu');
  if (!lsGet('tutoFait', false)) setTimeout(openTuto, 400);

  window.STRAT_TOKEN = token;
  window.STRAT = { get G() { return G; }, E, doAction: a => doAction(a), endGame: () => endGame(), undo: () => undo(), get RUNS() { return RUNS; }, openRun: i => openRun(i), startMatch: m => startMatch(m), startDaily: () => startDaily(), get cur() { return cur; }, L, endNext: () => endNext() };
})();
