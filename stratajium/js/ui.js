/* Stratajium — interface */
(function () {
  'use strict';
  const E = StratEngine();
  const T = E.T;
  const $ = id => document.getElementById(id);
  const PN = ['Or', 'Améthyste'];
  const COLS = 'abcdefghijkl';
  const sqName = q => { const g = G ? G.s.g : { W: 8, H: 8 }; return COLS[q % g.W] + (g.H - ((q / g.W) | 0)); };
  const CATN = { M: 'Mage · dieu (Primage)', G: 'Garde · guerrier (Champion)', S: 'Soldat · simple' };
  const LEVELN = { facile: 'Bot facile', normal: 'Bot normal', impossible: 'Bot impossible' };

  // ---------- sauvegarde des réglages ----------
  function lsGet(k, d) { try { const v = localStorage.getItem('stratajium.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem('stratajium.' + k, JSON.stringify(v)); } catch (e) { } }
  const cfg = Object.assign({ mode: 'normal', time: '20', event: 'none', pick: 'inverse', first: 'rand', map: 'aleatoire' }, lsGet('cfg', {}));
  const isDesktop = /Electron/i.test(navigator.userAgent);

  // ---------- sons (synthétisés) ----------
  let soundOn = lsGet('son', true), ac = null;
  function tone(f, d, type, vol, f2, delay) {
    const t0 = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    g.gain.setValueAtTime(vol || .12, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + d + .02);
  }
  function snd(k) {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      if (k === 'sel') tone(740, .06, 'triangle', .06);
      else if (k === 'move') { tone(260, .09, 'triangle', .12, 180); }
      else if (k === 'cap') { tone(180, .22, 'sawtooth', .09, 70); tone(90, .3, 'sine', .14, 50); }
      else if (k === 'magic') { tone(420, .35, 'sine', .08, 1100); tone(630, .35, 'triangle', .04, 1500, .05); }
      else if (k === 'rec') tone(520, .1, 'sine', .08, 780);
      else if (k === 'win') [523, 659, 784, 1046].forEach((f, i) => tone(f, .35, 'triangle', .1, null, i * .12));
      else if (k === 'lose') [392, 330, 262].forEach((f, i) => tone(f, .4, 'sine', .1, null, i * .16));
    } catch (e) { }
  }

  // ---------- jetons SVG ----------
  document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="gr0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".55" stop-color="#e8b23e"/><stop offset="1" stop-color="#a86a12"/></linearGradient>
    <linearGradient id="gr1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6d8ff"/><stop offset=".55" stop-color="#9468f0"/><stop offset="1" stop-color="#4b2499"/></linearGradient>
    <linearGradient id="grn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4efe6"/><stop offset=".6" stop-color="#bdb3a3"/><stop offset="1" stop-color="#7d7364"/></linearGradient>
  </defs></svg>`);
  // Un dessin propre à chaque perso (traits = couleur C, remplissages = F)
  const GLYPH = {
    // mages
    ma: 'F<polygon points="57,22 33,54 47,54 41,79 67,44 53,44 60,22"/>', // éclair
    mb: 'S<path d="M30 40 H68 M59 31 L68 40 L59 49 M70 62 H32 M41 53 L32 62 L41 71"/>', // échange
    mc: 'S<path d="M32 28 H68 M50 24 V34 M36 28 L44 52 M64 28 L56 52"/><circle cx="50" cy="56" r="7" fill="C" stroke="none"/><path d="M50 63 V74 M42 70 H58"/>', // marionnette
    md: 'F<path d="M28 44 H40 L64 30 V70 L40 56 H28 Z"/><path d="M70 40 Q76 50 70 60" fill="none" stroke="C" stroke-width="5" stroke-linecap="round"/>', // trompette
    me: 'S<circle cx="50" cy="50" r="21"/><path d="M50 37 V63 M37 50 H63"/>', // invocation
    pa: 'S<path d="M37 28 H63 L37 72 H63 Z"/><path d="M44 64 H56" stroke-width="8"/>', // sablier
    pb: 'S<path d="M26 66 H74 M30 52 L40 40 L47 56 L55 34 L62 54 L70 44"/>', // séisme
    pc: 'S<ellipse cx="50" cy="44" rx="19" ry="7"/><path d="M31 44 V62 Q50 72 69 62 V44 M33 24 L46 38 M67 24 L54 38"/>', // tambour
    pd: 'S<path d="M36 76 V26"/><path d="M36 28 H66 L57 39 L66 50 H36 Z" fill="C"/>', // bannière
    pe: 'S<path d="M41 47 V38 A9 9 0 0 1 59 38 V47"/><rect x="34" y="46" width="32" height="26" rx="4" fill="C" stroke="none"/>', // cadenas
    pf: 'S<circle cx="50" cy="50" r="21"/><path d="M35 65 L65 35"/>', // interdit
    pg: 'F<path d="M50 24 Q68 47 66 58 A16 16 0 0 1 34 58 Q32 47 50 24 Z"/>', // goutte de sang
    // gardes
    g1: 'S<circle cx="40" cy="48" r="13"/><circle cx="60" cy="48" r="13"/>', // jumeaux
    g2: 'F<path d="M33 70 V36 H39 V28 H46 V36 H54 V28 H61 V36 H67 V70 Z"/>', // tour
    g3: 'S<path d="M42 26 Q68 48 42 70 M42 26 V70 M28 48 H66 M59 41 L66 48 L59 55"/>', // arc
    g4: 'S<path d="M50 40 C42 24 24 30 30 44 C34 52 43 49 41 42 M50 40 C58 24 76 30 70 44 C66 52 57 49 59 42 M43 46 L50 70 L57 46"/>', // bélier
    g5: 'S<path d="M34 50 L50 34 L66 50 M34 66 L50 50 L66 66"/>', // double avance
    g6: 'S<path d="M50 26 V36 M50 60 V70 M28 48 H38 M62 48 H72 M35 33 L41 39 M59 57 L65 63 M65 33 L59 39 M41 57 L35 63"/><circle cx="50" cy="48" r="7" fill="C" stroke="none"/>', // tourbillon
    g7: 'S<path d="M30 68 L43 50 L55 62 L69 38 M60 38 H69 V47"/>', // pas de danse en diagonale
    // champions de l'extension
    c1: 'S<path d="M28 66 Q50 18 72 66 M63 61 L72 66 L74 56"/>', // saut
    c2: 'F<path d="M50 24 Q68 42 61 70 H39 Q32 42 50 24 Z"/>', // mitre
    c3: 'S<path d="M26 48 Q50 28 74 48 Q50 68 26 48 Z"/><circle cx="50" cy="48" r="7" fill="C" stroke="none"/>', // œil
    c4: 'S<path d="M28 46 Q50 32 72 46 M28 46 L50 54 L72 46 M50 26 V72 M43 33 L50 26 L57 33"/>', // arbalète
    c5: 'S<circle cx="60" cy="38" r="9" fill="C" stroke="none"/><path d="M53 45 L30 68 M49 37 L31 53 M61 49 L46 68"/>', // comète
    c6: 'S<path d="M43 26 H57 M46 26 V42 L31 70 H69 L54 42 V26"/><path d="M38 58 H62 L67 68 H33 Z" fill="C" stroke="none"/>', // fiole
    c7: 'S<circle cx="50" cy="48" r="15"/><path d="M50 24 V38 M50 58 V72 M26 48 H40 M60 48 H74"/>', // viseur
    c8: 'S<circle cx="39" cy="38" r="7"/><circle cx="61" cy="38" r="7"/><path d="M30 52 Q50 72 70 52"/>', // grenouille
    // soldat
    s: 'S<path d="M28 58 A22 22 0 0 1 72 58 Z" fill="C"/><path d="M24 62 H76 M50 36 V24"/>', // casque
  };
  function glyph(id, tc) {
    const g = GLYPH[id] || '';
    const body = g.slice(1).replace(/"C"/g, `"${tc}"`);
    return g[0] === 'F'
      ? `<g fill="${tc}">${body}</g>`
      : `<g fill="none" stroke="${tc}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
  }
  function token(ti, o) {
    const t = T[ti];
    const fill = o === 0 ? 'url(#gr0)' : o === 1 ? 'url(#gr1)' : 'url(#grn)';
    const stroke = o === 0 ? '#5a3a06' : o === 1 ? '#271055' : '#4a4338';
    const tc = o === 1 ? '#fff' : '#2b1c03';
    let shape, inner;
    if (t.cat === 'M') {
      // hexagone + couronne : les dieux
      shape = `<polygon points="50,3 91,26 91,74 50,97 9,74 9,26" fill="${fill}" stroke="${stroke}" stroke-width="5"/>
        <path d="M35 22 L35 9 L43 15 L50 5 L57 15 L65 9 L65 22 Z" fill="${tc}" opacity=".85"/>`;
      inner = `<g transform="translate(50 57) scale(.9) translate(-50 -50)">${glyph(t.id, tc)}</g>`;
    } else if (t.cat === 'G') {
      // bouclier : les gardes
      shape = `<path d="M50 4 L90 17 L86 56 Q80 82 50 96 Q20 82 14 56 L10 17 Z" fill="${fill}" stroke="${stroke}" stroke-width="5"/>`;
      inner = `<g transform="translate(50 46) scale(1) translate(-50 -48)">${glyph(t.id, tc)}</g>`;
    } else {
      // rond : les soldats
      shape = `<circle cx="50" cy="50" r="44" fill="${fill}" stroke="${stroke}" stroke-width="6"/>`;
      inner = glyph('s', tc);
    }
    const badge = t.cat === 'S' ? '' : `<circle cx="81" cy="81" r="15" fill="${stroke}" stroke="${o === 1 ? '#d8c2ff' : '#ffe9a8'}" stroke-width="2.5"/><text x="81" y="88" text-anchor="middle" font-size="21" fill="#fff">${t.sym}</text>`;
    const ext = t.ext ? `<text x="86" y="24" text-anchor="middle" font-size="26" fill="#7fd3ff" stroke="#0b1a26" stroke-width="2" paint-order="stroke">✦</text>` : '';
    return `<svg class="tk" viewBox="0 0 100 100">${shape}${inner}${badge}${ext}</svg>`;
  }

  // ---------- menu ----------
  const evSel = $('evPick');
  evSel.innerHTML = E.EVENTS.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  evSel.value = cfg.pick;
  evSel.onchange = () => { cfg.pick = evSel.value; lsSet('cfg', cfg); };
  document.querySelectorAll('.seg').forEach(seg => {
    seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      cfg[seg.dataset.k] = b.dataset.v; lsSet('cfg', cfg); syncMenu(); snd('sel');
    });
  });
  function syncMenu() {
    document.querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b => b.classList.toggle('sel', cfg[seg.dataset.k] === b.dataset.v)));
    const comp = cfg.time === '45';
    $('optEvent').querySelectorAll('.seg button').forEach(b => b.disabled = comp);
    $('compNote').hidden = !comp;
    evSel.hidden = comp || cfg.event !== 'pick';
    const self = cfg.mode === 'self';
    $('firstMe').textContent = self ? 'Or' : 'Moi';
    $('firstOpp').textContent = self ? 'Améthyste' : 'Le bot';
    renderScores();
  }
  // ---------- points et records (contre les bots) ----------
  const PTS = { facile: 1, normal: 2, impossible: 5 };
  function scores() { return Object.assign({ points: 0, wins: { facile: 0, normal: 0, impossible: 0 }, best: { facile: [], normal: [], impossible: [] } }, lsGet('scores', {})); }
  function fmtDur(ms) { const t = Math.round(ms / 1000), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, sec = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0'); }
  function renderScores() {
    const sc = scores(), ad = lsGet('adapt', null);
    let h = `<h2>Tes points</h2><div class="pts">${sc.points}<small>battre le bot : facile +1 · normal +2 · impossible +5</small></div>`;
    for (const lv of ['facile', 'normal', 'impossible']) {
      const b = sc.best[lv] || [], n = sc.wins[lv] || 0;
      h += `<div class="botrec"><div class="bh">${LEVELN[lv]} <span>+${PTS[lv]}</span></div>
        <div class="wins">${n} victoire${n > 1 ? 's' : ''} · tes 3 victoires les plus rapides :</div>
        <ol>${[0, 1, 2].map(i => b[i] !== undefined ? `<li>${fmtDur(b[i])}</li>` : '<li class="none">—</li>').join('')}</ol></div>`;
    }
    if (ad && ad.games) h += `<div class="learn">Le bot impossible a étudié ${ad.games} de tes parties et s’adapte à ta façon de jouer.</div>`;
    $('scoreBox').innerHTML = h;
  }
  syncMenu();
  if (isDesktop) { $('btnQuit').hidden = false; $('btnQuit').onclick = () => window.close(); }
  function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); }

  // ---------- préparation (événement + pari) ----------
  let pre = null;
  $('btnPlay').onclick = () => {
    snd('sel');
    const comp = cfg.time === '45';
    const inf = cfg.time === 'inf';
    let ev = null;
    if (!comp) {
      if (cfg.event === 'random') ev = E.EVENTS[Math.floor(Math.random() * E.EVENTS.length)].id;
      else if (cfg.event === 'pick') ev = cfg.pick;
    }
    const humans = cfg.mode === 'self' ? [true, true] : [true, false];
    pre = { ev, humans, level: cfg.mode === 'self' ? null : cfg.mode, minutes: inf ? Infinity : +cfg.time, inf, comp, bet: [null, null], first: cfg.first, mapKind: cfg.map };
    if (!ev) return startGame(pre);
    showPre();
  };
  function showPre() {
    const e = E.EVENTS.find(x => x.id === pre.ev);
    let h = `<h2 style="font-family:Cinzel,serif;text-align:center">${cfg.event === 'random' ? 'Événement tiré au hasard' : 'Événement'}</h2>
      <div class="evcard"><b>${e.name}</b>${e.desc}</div>`;
    if (pre.ev === 'pari') {
      if (!pre.humans[1] && pre.bet[1] === null) pre.bet[1] = pre.level === 'facile' ? (Math.random() < .5 ? 0 : 1) : 0;
      for (const p of [0, 1]) {
        if (!pre.humans[p]) { h += `<p>Le bot (${PN[p]}) parie que <b>${PN[pre.bet[p]]}</b> perdra en premier.</p>`; continue; }
        h += `<div class="opt"><h3>${pre.humans[1] ? PN[p] + ' parie' : 'Tu paries'} : qui perdra en premier un Primage ou 2 Champions ?</h3>
          <div class="seg" data-bet="${p}">${[0, 1].map(v => `<button data-v="${v}" class="${pre.bet[p] === v ? 'sel' : ''}">${PN[v]}${!pre.humans[1] ? (v === 0 ? ' (toi)' : ' (le bot)') : ''}</button>`).join('')}</div></div>`;
      }
    }
    const ready = pre.ev !== 'pari' || (pre.bet[0] !== null && pre.bet[1] !== null);
    h += `<div class="menu-actions"><button class="big" id="btnGo" ${ready ? '' : 'disabled style="opacity:.4"'}>Commencer</button><button class="ghost" id="btnBack">Retour</button></div>`;
    $('preBox').innerHTML = h;
    $('preBox').querySelectorAll('[data-bet]').forEach(seg => seg.onclick = ev => {
      const b = ev.target.closest('button'); if (!b) return;
      pre.bet[+seg.dataset.bet] = +b.dataset.v; snd('sel'); showPre();
    });
    $('btnGo').onclick = () => { if (ready) startGame(pre); };
    $('btnBack').onclick = () => show('menu');
    show('pre');
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

  // ---------- partie ----------
  let G = null, gid = 0;
  function startGame(o) {
    gid++;
    const first = o.first === 'me' ? 0 : o.first === 'opp' ? 1 : (Math.random() < .5 ? 0 : 1);
    const map = E.makeMap(o.mapKind);
    const s = E.newGame({ event: o.ev, first, map });
    if (o.ev === 'pari') s.bet = o.bet.slice();
    G = {
      id: gid, o, s, humans: o.humans, level: o.level,
      times: [o.minutes * 60000, o.minutes * 60000], last: performance.now(),
      sel: null, flash: [], legal: null, ver: 0, over: false, paused: false, thinking: false,
      inf: !!o.inf, elapsed: 0, history: [], usage: {},
    };
    buildBoard(map);
    $('mapBadge').textContent = 'Carte : ' + map.name;
    $('log').innerHTML = '';
    const evo = E.EVENTS.find(x => x.id === o.ev);
    $('evBadge').hidden = !evo && !o.comp;
    $('evBadge').textContent = evo ? '★ ' + evo.name : 'Compétition';
    $('evBadge').title = evo ? evo.desc : '1 contre 1, sans événement, 45 minutes.';
    sys(o.comp ? 'Compétition : 45 minutes chacun, sans événement.' : o.inf ? 'Temps infini.' : `${o.minutes} minutes chacun pour toute la partie.`);
    sys(`Carte : ${map.name}.`);
    if (evo) sys(`Événement : ${evo.name}.`);
    sys(o.first === 'rand' ? `Tirage au sort : ${PN[first]} commence.` : `${PN[first]} commence.`);
    if (s.phase === 'draft') sys('Draft : on se partage toute la réserve, chacun son tour.');
    $('endModal').hidden = true;
    show('game');
    render();
    maybeBot();
  }

  function legal() {
    if (!G.legal || G.legalVer !== G.ver) { G.legal = E.gen(G.s, true); G.legalVer = G.ver; }
    return G.legal;
  }
  const humanTurn = () => G && !G.over && G.humans[G.s.turn];

  // horloges
  setInterval(() => {
    const now = performance.now();
    if (!G || G.over || G.paused) { if (G) G.last = now; return; }
    const p = G.s.turn, dt = now - G.last;
    G.last = now; G.elapsed += dt;
    if (G.inf) return;
    G.times[p] -= dt;
    if (G.times[p] <= 0) {
      G.times[p] = 0;
      G.s.winner = 1 - p; G.s.why = `Temps écoulé pour ${PN[p]}.`;
      endGame();
    }
    renderClocks();
  }, 100);
  function fmt(ms) {
    ms = Math.max(0, ms);
    const m = Math.floor(ms / 60000), sec = Math.floor(ms / 1000) % 60;
    if (ms < 60000) return `0:${String(sec).padStart(2, '0')}.${Math.floor(ms / 100) % 10}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }
  function renderClocks() {
    for (const p of [0, 1]) {
      const el = document.querySelector(`#pp${p} .clock`);
      if (!el) continue;
      el.textContent = G.inf ? '∞' : fmt(G.times[p]);
      el.classList.toggle('low', !G.inf && G.times[p] < 60000);
    }
  }

  // ---------- bot ----------
  function maybeBot() {
    if (!G || G.over || G.humans[G.s.turn] || G.thinking) return;
    G.thinking = true;
    const id = G.id, ver = G.ver, t0 = performance.now();
    render();
    const opt = {};
    if (G.level === 'impossible') {
      const left = G.times[G.s.turn];
      opt.budget = G.inf ? 9000 : Math.round(Math.min(7000, Math.max(1200, left / 18)));
      opt.canExtend = G.inf || left > 120000;
      const ad = lsGet('adapt', null);
      if (ad) {
        const mx = Math.max(1, ...Object.values(ad.freq || {}));
        const opp = {}; for (const k in ad.freq || {}) opp[k] = ad.freq[k] / mx;
        opt.adapt = { wG: ad.wG || 1, wM: ad.wM || 1, opp };
      }
    }
    askBot(G.s, G.level, opt, a => {
      const wait = Math.max(0, 450 - (performance.now() - t0));
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
      // pour « annuler le coup » : on garde la position d'avant chaque action d'un humain
      G.history.push({ s: before, log: $('log').innerHTML, lastA: G.lastA });
      if (G.history.length > 400) G.history.shift();
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
    if (a.k === 'pioche' && G.humans[p]) toast(`Tu as pioché : ${T[a.t].name} (${T[a.t].sym})`);
    if (s._martyr) sys(`${PN[s.turn]} gagne ${s._martyr} mana (Martyr).`);
    if (!betBefore && s.betDone) sys(`Pari : ${PN[s.betLoser]} perd en premier ! ${[0, 1].map(q => `${PN[q]} ${s.bet[q] === s.betLoser ? '+35' : '−35'} mana`).join(', ')}.`);
    if (s.phase === 'play' && before.phase === 'draft') sys('Draft terminé, la partie commence.');
    // sons + effets
    if (dead.length) snd('cap');
    else if (a.k === 'act' && T[E.tix(before.b[a.from])].cat === 'M') snd('magic');
    else if (a.k === 'rec' || a.k === 'draft' || a.k === 'pioche') snd('rec');
    else if (a.k !== 'decl') snd('move');
    G.flash = dead;
    G.lastA = a;
    if (s.winner !== null) endGame();
    render();
    if (G.flash.length) { const v = G.ver; setTimeout(() => { if (G && G.ver === v) { G.flash = []; render(); } }, 750); }
    maybeBot();
  }

  function endGame() {
    if (G.over) return;
    G.over = true; G.sel = null;
    const s = G.s, w = s.winner;
    let title;
    if (w === 2) title = 'Partie nulle';
    else if (G.humans[0] && G.humans[1]) title = `Victoire de ${PN[w]} !`;
    else title = G.humans[w] ? 'Victoire !' : `Défaite… (${LEVELN[G.level]})`;
    $('endTitle').textContent = title;
    $('endTitle').style.color = w === 2 ? '' : (w === 0 ? 'var(--gold)' : 'var(--vio)');
    $('endWhy').textContent = s.why;
    $('endScore').textContent = '';
    if (G.level && w !== 2 && !G.recorded) {
      G.recorded = true;
      const humanWon = G.humans[w];
      if (humanWon) {
        const sc = scores(), lv = G.level, ms = Math.round(G.elapsed);
        sc.points += PTS[lv];
        sc.wins[lv] = (sc.wins[lv] || 0) + 1;
        const best = (sc.best[lv] || []).concat([ms]).sort((x, y) => x - y);
        const rank = best.indexOf(ms);
        sc.best[lv] = best.slice(0, 3);
        lsSet('scores', sc);
        $('endScore').textContent = `+${PTS[lv]} point${PTS[lv] > 1 ? 's' : ''} (total ${sc.points}) · temps ${fmtDur(ms)}${rank === 0 ? ' · nouveau record !' : rank < 3 ? ` · ${rank + 1}ᵉ meilleur temps !` : ''}`;
      }
      learn(humanWon, s);
    }
    sys(`Fin : ${title} ${s.why}`);
    snd(w !== 2 && (G.humans[w]) ? 'win' : 'lose');
    setTimeout(() => { $('endModal').hidden = false; }, 500);
    render();
  }
  // apprentissage : le bot retient tes habitudes et renforce ce qui l'a fait perdre
  function learn(humanWon, s) {
    const ad = Object.assign({ wG: 1, wM: 1, games: 0, freq: {} }, lsGet('adapt', {}));
    for (const k in ad.freq) ad.freq[k] *= 0.9;
    for (const k in G.usage) ad.freq[k] = (ad.freq[k] || 0) + G.usage[k];
    if (humanWon) {
      if (/gardes|Champions/.test(s.why)) ad.wG = Math.min(1.8, ad.wG * 1.1);
      if (/mages|Primages|dieux/.test(s.why)) ad.wM = Math.min(1.8, ad.wM * 1.1);
    } else { ad.wG = 1 + (ad.wG - 1) * 0.95; ad.wM = 1 + (ad.wM - 1) * 0.95; }
    ad.games++;
    lsSet('adapt', ad);
  }
  function undo() {
    if (!G || !G.history.length) return toast('Aucun coup à annuler.');
    const h = G.history.pop();
    G.s = h.s; G.lastA = h.lastA; $('log').innerHTML = h.log;
    G.ver++; G.thinking = false; G.sel = null; G.flash = []; G.over = false;
    $('endModal').hidden = true;
    sys('Coup annulé.');
    snd('sel'); render(); maybeBot();
  }
  $('btnUndo').onclick = undo;
  $('btnAgain').onclick = () => { $('endModal').hidden = true; if (pre) { if (pre.ev && cfg.event === 'random') { $('btnPlay').click(); } else startGame(pre); } };
  $('btnEndMenu').onclick = () => { $('endModal').hidden = true; G = null; renderScores(); show('menu'); };
  $('btnEndLook').onclick = () => { $('endModal').hidden = true; };
  $('btnMenu').onclick = () => {
    if (G && !G.over && !confirm('Quitter la partie en cours ?')) return;
    G = null; renderScores(); show('menu');
  };
  $('btnSound').onclick = () => { soundOn = !soundOn; lsSet('son', soundOn); $('btnSound').textContent = soundOn ? '🔊' : '🔇'; snd('sel'); };
  $('btnSound').textContent = soundOn ? '🔊' : '🔇';

  // ---------- textes ----------
  const tname = i => `${T[i].name} (${T[i].sym}${T[i].ext ? '✦' : ''})`;
  function optLabel(x) {
    if (x === 'bord') return 'les contours';
    if (x === 'centre') return 'le centre';
    if (x === 'anneau') return 'le contour intérieur';
    if (x === 'go') return '';
    if (x[0] === 'r') return 'recrute ' + T[+x.slice(1)].name;
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
        const d = a.cl.map(x => typeof x === 'number' ? sqName(x) : optLabel(x)).filter(Boolean).join(' → ');
        return `${P} active ${tname(ti)} en ${sqName(a.from)}${d ? ' : ' + d : ''}${ds}`;
      }
      case 'pass': return `${P} passe son tour`;
      case 'decl': return `${P} annonce : ${declText(a.d, b)}`;
    }
    return '';
  }
  function logLine(html, p) {
    const li = document.createElement('li'); li.className = 'p' + p; li.innerHTML = html; $('log').prepend(li);
  }
  function sys(txt) { const li = document.createElement('li'); li.className = 'sys'; li.textContent = txt; $('log').prepend(li); }
  let toastT = 0;
  function toast(txt) { const t = $('toast'); t.textContent = txt; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }

  // ---------- sélection ----------
  const SELECT_IDX = { mb: [0, 1], mc: [0], md: [0, 2], g1: [0], pc: [0] };
  function matching() {
    const sel = G.sel;
    return sel.cands.filter(a => sel.pre.every((x, i) => a.cl[i] === x));
  }
  function selView() {
    // renvoie { sq: Map(case -> classe), strs: [...], complete: action|null }
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
      if (c > 0) {
        if ((SELECT_IDX[tid] || []).includes(n)) cls = 'tgt-ally';
        else cls = E.own(c) === s.turn ? 'tgt-ally' : 'tgt-cap';
      }
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
    snd('sel');
    if (!cands.length) {
      G.sel = null;
      const s = G.s, t = T[E.tix(s.b[q])];
      let why = 'Ce perso n’a aucune action possible pour l’instant.';
      if (s.noAct[s.turn]) why = 'Tu ne peux plus activer de perso (Silence).';
      else if (t.cost && s.mana[s.turn] < t.cost) why = `Pas assez de mana (${t.cost} nécessaires).`;
      else if (s.decl[s.turn] && legal().some(a => a.k !== 'pass')) why = 'Tu dois faire l’action que tu as annoncée.';
      toast(why);
    }
    render();
  }

  // clic sur une case
  function clickSq(q) {
    if (!G) return;
    const s = G.s, c = s.b[q];
    if (c > 0) showInfo(E.tix(c), E.own(c));
    if (!humanTurn()) return;
    if (s.phase === 'decl') {
      const a = legal().find(x => x.d.k === 'act' && x.d.from === q);
      if (a) doAction(a);
      return;
    }
    if (s.phase !== 'play') return;
    if (G.sel) {
      const v = selView();
      if (v.sq.has(q)) {
        if (G.sel.k === 'place') return doAction(legal().find(a => a.k === 'pla' && a.t === G.sel.t && a.to === q));
        G.sel.pre.push(q); snd('sel'); return stepSel();
      }
      if (G.sel.k === 'piece' && G.sel.from === q) { G.sel = null; render(); return; }
    }
    if (c > 0 && E.own(c) === s.turn) return selectPiece(q);
    if (G.sel) { G.sel = null; render(); }
  }

  // ---------- rendu ----------
  const boardEl = $('board');
  let sqEls = [];
  function buildBoard(g) {
    boardEl.innerHTML = ''; sqEls = [];
    document.documentElement.style.setProperty('--cols', g.W);
    document.documentElement.style.setProperty('--rows', g.H);
    for (let q = 0; q < g.N; q++) {
      const d = document.createElement('div');
      if (g.ex[q]) {
        d.addEventListener('click', () => clickSq(q));
        d.addEventListener('mouseenter', () => { if (G && G.s.b[q] > 0) showInfo(E.tix(G.s.b[q]), E.own(G.s.b[q])); });
      }
      boardEl.appendChild(d); sqEls.push(d);
    }
  }

  function render() {
    if (!G) return;
    const s = G.s, v = selView();
    const hum = humanTurn();
    const lastSq = new Set();
    const la = G.lastA;
    if (la) {
      if (la.from !== undefined) lastSq.add(la.from);
      if (la.to !== undefined) lastSq.add(la.to);
      if (la.cl) la.cl.forEach(x => typeof x === 'number' && lastSq.add(x));
    }
    const declSq = new Set(); for (const p of [0, 1]) if (s.decl[p] && s.decl[p].k === 'act') declSq.add(s.decl[p].from);
    const showHome = G.sel && G.sel.k === 'place';
    const g = s.g;
    // coordonnées : sous la case la plus basse de chaque colonne, à gauche de la plus à gauche de chaque ligne
    const botOf = [], leftOf = [];
    for (let q = 0; q < g.N; q++) if (g.ex[q]) { const r = (q / g.W) | 0, c = q % g.W; if (botOf[c] === undefined || r > botOf[c]) botOf[c] = r; if (leftOf[r] === undefined || c < leftOf[r]) leftOf[r] = c; }
    for (let q = 0; q < g.N; q++) {
      const el = sqEls[q], c = s.b[q];
      if (!g.ex[q]) { el.className = 'sq void'; el.innerHTML = ''; continue; }
      const r = (q / g.W) | 0, col = q % g.W;
      let cls = 'sq ' + (E.isDark(g, q) ? 'd' : 'l');
      if (g.zone[0][q]) cls += ' zone0 home0'; if (g.zone[1][q]) cls += ' zone1 home1';
      if (showHome) cls += ' showhome';
      if (c < 0) cls += ' wall';
      if (lastSq.has(q)) cls += ' last';
      if (declSq.has(q)) cls += ' decl';
      if (v.sq.has(q)) cls += ' ' + v.sq.get(q);
      if (v.path.includes(q)) cls += ' path';
      if (G.sel && G.sel.k === 'piece' && G.sel.from === q) cls += ' selp';
      if (G.flash.includes(q)) cls += ' boom';
      el.className = cls;
      let h = '';
      if (botOf[col] === r) h += `<span class="crd f">${COLS[col]}</span>`;
      if (leftOf[r] === col) h += `<span class="crd r">${g.H - r}</span>`;
      if (c > 0) { const t = T[E.tix(c)]; h += `<div class="pc ${t.cat}">${token(E.tix(c), E.own(c))}</div>`; }
      h += '<div class="mk"></div>';
      el.innerHTML = h;
    }
    // tour
    const tl = $('turnline');
    if (G.over) tl.innerHTML = s.winner === 2 ? 'Partie nulle' : `<span class="p${s.winner}">${PN[s.winner]}</span> a gagné`;
    else {
      let t = `Au tour de <span class="p${s.turn}">${PN[s.turn]}</span>`;
      if (!G.humans[s.turn]) t += ' · <span class="muted">le bot réfléchit…</span>';
      if (s.phase === 'draft') t += ' · draft';
      if (s.phase === 'decl') t += ' · annonce';
      if (s.acts > 1) t += ` · ${s.acts} actions restantes`;
      tl.innerHTML = t;
    }
    renderPlayers();
    renderPool();
    renderHint(v, hum);
    renderClocks();
  }

  function reserveVisible(p) {
    if (G.s.ev !== 'cache') return true;
    if (G.over) return true;
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
      const am = E.aliveMages(s, p);
      const gNeed = s.ev === 'illimite' ? 6 : 4;
      const mTxt = s.ev === 'illimite' ? `<span>Mages perdus <b>${s.lost[p][0]}/2</b></span>` : `<span>Mages perdus <b>${s.lost[p][0]}</b> · en vie <b>${am}</b></span>`;
      let fx = '';
      if (s.noPlace[p]) fx += `<span>Ne peut plus placer : ${s.noPlace[p]} tour${s.noPlace[p] > 1 ? 's' : ''}</span>`;
      if (s.noAct[p]) fx += `<span>Ne peut plus activer : ${s.noAct[p]} tour${s.noAct[p] > 1 ? 's' : ''}</span>`;
      if (s.pend[p]) fx += `<span class="good">Martyr : +40 mana par mort au prochain tour</span>`;
      if (s.decl[p]) fx += `<span class="info">Annonce : ${declText(s.decl[p], s)}</span>`;
      if (s.ev === 'pari' && s.bet && !s.betDone) fx += `<span class="info">Parie sur ${PN[s.bet[p]]}</span>`;
      // réserve
      let rv = '';
      let total = 0;
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
      el.innerHTML = `<div class="who"><span class="dot"></span>${PN[p]}${label}</div>
        <div class="clock">${fmt(G.times[p])}</div>
        <div class="stats"><span class="mana">Mana <b>${s.mana[p]}</b></span><span>Gardes perdus <b>${s.lost[p][1]}/${gNeed}</b></span>${mTxt}<span>Soldats perdus <b>${s.lost[p][2]}</b></span></div>
        ${fx ? `<div class="fx">${fx}</div>` : ''}
        <div class="resv"><div class="lbl">À placer</div>${rv}</div>`;
      el.querySelectorAll('[data-res]').forEach(ch => {
        const [pp, i] = ch.dataset.res.split(':').map(Number);
        ch.addEventListener('mouseenter', () => showInfo(i, pp));
        ch.addEventListener('click', () => {
          showInfo(i, pp);
          if (!humanTurn() || G.s.turn !== pp || !placeable.has(i)) return;
          G.sel = (G.sel && G.sel.k === 'place' && G.sel.t === i) ? null : { k: 'place', t: i };
          snd('sel'); render();
        });
      });
    }
  }

  function renderPool() {
    const s = G.s, el = $('pool');
    const hum = humanTurn();
    const recOk = new Set();
    if (hum) for (const a of legal()) if (a.k === 'rec' || a.k === 'draft') recOk.add(a.t);
    $('poolTitle').textContent = s.phase === 'draft' ? (s.ev === 'inverse' ? 'Draft inversé — choisis ce que reçoit l’adversaire' : 'Draft caché') : 'Réserve commune (recruter)';
    let total = 0; for (let i = 0; i < E.NT; i++) total += s.pool[i];
    if (s.phase === 'draft' && s.ev === 'cache') {
      el.innerHTML = `<div class="facedown"><span class="chip"><span class="n">🂠 × ${total} face cachée</span></span>${hum ? '<button class="ghost sm" id="btnDraw">Piocher</button>' : ''}</div>`;
      if (hum) $('btnDraw').onclick = () => doAction({ k: 'pioche' });
      return;
    }
    if (!total) { el.innerHTML = '<span class="muted">Vide — tout a été recruté.</span>'; return; }
    const unl = s.ev === 'illimite';
    let h = '';
    for (const [cat, lbl] of [['M', 'Mages'], ['G', 'Gardes'], ['S', 'Soldats']]) {
      let row = '';
      for (let i = 0; i < E.NT; i++) {
        if (T[i].cat !== cat || !s.pool[i]) continue;
        const can = recOk.has(i);
        row += `<span class="chip ${can ? 'click' : (hum ? 'off' : '')}" data-pool="${i}">${token(i, -1)}${T[i].name}<span class="n">${unl ? '∞' : '×' + s.pool[i]}</span></span>`;
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
        else if (G.s.decl[G.s.turn]) toast('Tu dois faire l’action que tu as annoncée.');
      });
    });
  }

  function renderHint(v, hum) {
    const s = G.s, hint = $('hint'), opts = $('opts');
    let h = '', o = [];
    if (G.over) {
      h = s.why;
      o.push(`<button class="main" data-o="again">Rejouer</button>`, `<button data-o="menu">Menu</button>`);
    } else if (!hum) {
      h = 'Le bot réfléchit…';
    } else if (s.phase === 'draft') {
      h = s.ev === 'inverse' ? 'Draft inversé : choisis dans la réserve commune un perso… qui ira à ton adversaire !' : 'Draft caché : pioche une pièce face cachée.';
      if (s.ev === 'cache') o.push(`<button class="main" data-o="draw">Piocher</button>`);
    } else if (s.phase === 'decl') {
      h = 'Annonce ta prochaine action : recruter, placer, ou touche un de tes persos pour annoncer que tu l’activeras.';
      o.push(`<button data-o="decl:rec">Annoncer : recruter</button>`, `<button data-o="decl:pla">Annoncer : placer</button>`);
    } else if (G.sel && G.sel.k === 'place') {
      h = `Place ${T[G.sel.t].name} dans ta zone de placement (cases encadrées de ta couleur).` + (s.ev === 'noir' ? ' Les cases vertes (noires) sont gratuites.' : '');
      o.push(`<button data-o="cancel">Annuler</button>`);
    } else if (G.sel) {
      const t = T[E.tix(s.b[G.sel.from])];
      h = `<b>${t.name}</b> : ${t.desc}`;
      if (v.sq.size) h += ' <span class="muted">— choisis une case en surbrillance.</span>';
      for (const x of v.strs) {
        if (x[0] === 'r') { const i = +x.slice(1); o.push(`<button data-o="s:${x}">${token(i, -1)} ${T[i].name}</button>`); }
        else o.push(`<button class="main" data-o="s:${x}" data-zone="${x}">${x === 'go' ? 'Activer ' + t.name : (x === 'bord' ? '⚡ Les contours' : x === 'centre' ? '⚡ Le centre' : '⚡ Le contour intérieur')}</button>`);
      }
      if (v.complete) o.push(`<button class="main" data-o="finish">Valider (s’arrêter là)</button>`);
      o.push(`<button data-o="cancel">Annuler</button>`);
    } else {
      const L = legal();
      const d = s.decl[s.turn];
      h = 'Ton action : <b>recruter</b> (réserve commune), <b>placer</b> (tes persos à placer) ou <b>activer</b> un de tes persos sur le plateau.';
      if (d && L.some(a => a.k !== 'pass')) h = `Tu as annoncé : <b>${declText(d, s)}</b>. Tu dois le faire.`;
      if (s.acts > 1) h += ` <b>(${s.acts} actions restantes)</b>`;
      if (L.some(a => a.k === 'pass')) {
        o.push(`<button class="warn" data-o="pass">Passer mon tour</button>`);
        if (L.length === 1) h = 'Aucune action possible : passe ton tour.';
      }
    }
    hint.innerHTML = h;
    opts.innerHTML = o.join('');
    opts.querySelectorAll('button').forEach(b => {
      const k = b.dataset.o;
      b.onclick = () => {
        if (k === 'again') return $('btnAgain').click();
        if (k === 'menu') return $('btnEndMenu').click();
        if (k === 'cancel') { G.sel = null; return render(); }
        if (k === 'pass') return doAction({ k: 'pass' });
        if (k === 'draw') return doAction({ k: 'pioche' });
        if (k === 'finish') return doAction(selView().complete);
        if (k.startsWith('decl:')) return doAction(legal().find(a => a.k === 'decl' && a.d.k === k.slice(5)));
        if (k.startsWith('s:')) { G.sel.pre.push(k.slice(2)); snd('sel'); return stepSel(); }
      };
      const z = b.dataset.zone;
      if (z) {
        const gg = G.s.g, zone = z === 'bord' ? gg.border : z === 'centre' ? gg.center : z === 'anneau' ? gg.ring2 : zoneAdj(G.sel.from);
        b.onmouseenter = () => zone.forEach(q => sqEls[q].classList.add('zone'));
        b.onmouseleave = () => sqEls.forEach(e => e.classList.remove('zone'));
      }
    });
  }
  function zoneAdj(q) {
    const g = G.s.g, t = T[E.tix(G.s.b[q])];
    if (t.id !== 'g6') return [];
    const out = [];
    for (let d = 0; d < 8; d++) { const x = g.mv[d * g.N + q]; if (x >= 0) out.push(x); }
    return out;
  }


  function showInfo(i, o) {
    const t = T[i];
    const who = o === 0 || o === 1 ? ` · ${PN[o]}` : ' · réserve commune';
    $('infoCard').innerHTML = `<div class="ihead">${token(i, o)}<div><div class="iname">${t.name} <span class="muted">(${t.sym})</span></div>
      <div class="icat">${CATN[t.cat]}${t.ext ? ' · extension ✦' : ''}${who}</div></div></div>
      ${t.cost ? `<div class="icost">Activation : ${t.cost} mana</div>` : ''}
      <div>${t.desc}</div>`;
  }

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && G && $('game').classList.contains('on')) { e.preventDefault(); return undo(); }
    if (e.key === 'Escape') {
      if (!$('rulesModal').hidden) return closeRules();
      if (G && G.sel) { G.sel = null; render(); }
    }
  });

  // ---------- règles ----------
  function rulesHTML() {
    const grp = (ids, title) => `<h3>${title}</h3><div class="ptable">${ids.map(id => { const i = E.TI[id], t = T[i]; return `<div class="prow">${token(i, 0)}<div><b>${t.sym} · ${t.name}${t.cost ? ` <span style="color:#7fd3ff">${t.cost} mana</span>` : ''}</b><small>${t.desc}</small></div></div>`; }).join('')}</div>`;
    return `<h2>Stratajium — règles</h2>
    <ul>
      <li>Chaque joueur a un temps pour <b>toute sa partie</b> : 15, 20, 30 minutes ou <b>infini</b> (Compétition : 45 minutes, sans événement). Temps écoulé = défaite.</li>
      <li>On choisit qui commence (ou au hasard), et on peut tirer un <b>événement</b> aléatoire avant de commencer.</li>
      <li>Chaque joueur commence avec <b>100 mana</b>. Les mages coûtent du mana pour s’activer.</li>
      <li>Pendant ton tour tu fais <b>une seule action</b> parmi : <b>recruter</b> 1 perso, <b>placer</b> 1 perso déjà recruté, ou <b>activer</b> 1 perso qui est sur la carte.</li>
      <li><b>But</b> : tuer <b>tous les dieux</b> (mages) adverses, ou <b>4 guerriers</b> (gardes) adverses.</li>
      <li><b>La carte change à chaque partie</b> : forme, taille (de 6 à 10 cases de large) et zones de placement sont tirées au hasard, mais toujours symétriques pour que ce soit juste. (Le menu permet aussi de jouer sur le plateau classique 8×8.) Or joue en bas, Améthyste en haut.</li>
      <li>On place ses persos dans <b>sa zone de placement</b> (cases encadrées de sa couleur).</li>
      <li><b>Seuls les soldats ont un sens</b> : ils avancent vers l’adversaire. Les gardes (Éclaireur compris) et tous les autres vont aussi bien vers le haut, le bas, la gauche ou la droite.</li>
      <li>La réserve commune contient <b>5 mages, 14 gardes (2 de chaque) et 8 soldats</b>. Un perso recruté est retourné du côté de ta couleur.</li>
      <li>Contre un bot, tu peux <b>annuler ton dernier coup</b> (bouton ↶ ou Ctrl+Z). Battre le bot facile rapporte 1 point, le normal 2 points, l’impossible 5 points ; tes 3 victoires les plus rapides contre chaque bot sont gardées.</li>
    </ul>
    <p class="interp">Précisions choisies pour que tout soit jouable (les règles d’origine ne le disaient pas) :<br>
    • Comme aux échecs, on prend un ennemi en arrivant sur sa case. Les attaques de zone ne tuent que les ennemis.<br>
    • Les cases manquantes de la carte sont des trous : on ne peut pas y aller, et un perso poussé dedans meurt (comme hors de la carte).<br>
    • « Le centre » = les 4 cases (ou un peu plus) les plus proches du milieu de la carte.<br>
    • « Tous les dieux » : tu gagnes quand l’adversaire a perdu au moins 1 mage et qu’il ne lui en reste aucun (ni sur la carte, ni à placer). Un mage jamais posé ne peut pas mourir !<br>
    • Le mage <b>e</b> n’avait pas de prix : il coûte 30 mana. La règle disait 4 mages mais en listait 5 : les 5 sont dans la réserve.<br>
    • Si tu n’as aucune action possible, tu passes. 150 tours sans aucune élimination = partie nulle.</p>
    ${grp(['ma', 'mb', 'mc', 'md', 'me'], 'Mages (dieux)')}
    ${grp(['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7'], 'Gardes (guerriers)')}
    ${grp(['s'], 'Soldat')}
    <h3>Événements</h3>
    <ul>${E.EVENTS.map(e => `<li><b>${e.name}</b> : ${e.desc}</li>`).join('')}</ul>
    ${grp(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'], 'Champions de l’extension ✦')}
    ${grp(['pa', 'pb', 'pc', 'pd', 'pe', 'pf', 'pg'], 'Primages de l’extension ✦')}
    <h3>Comment jouer</h3>
    <ul>
      <li><b>Recruter</b> : clique un perso dans la réserve commune (à droite).</li>
      <li><b>Placer</b> : clique un perso de ta liste « À placer », puis une case en surbrillance.</li>
      <li><b>Activer</b> : clique ton perso sur la carte, puis les cases en surbrillance (vert = déplacement, rouge = attaque, bleu pointillé = choix d’un perso). Les attaques de zone et les pouvoirs ont des boutons sous le plateau.</li>
      <li>Échap ou « Annuler » pour changer d’avis. ↶ ou Ctrl+Z pour revenir un coup en arrière. Survole un perso pour voir ce qu’il fait.</li>
    </ul>`;
  }
  function openRules() { $('rulesBody').innerHTML = rulesHTML(); $('rulesModal').hidden = false; if (G) G.paused = true; }
  function closeRules() { $('rulesModal').hidden = true; if (G) { G.paused = false; G.last = performance.now(); } }
  $('btnRules').onclick = openRules;
  $('btnRulesMenu').onclick = openRules;
  $('rulesModal').addEventListener('click', e => { if (e.target === $('rulesModal') || e.target.hasAttribute('data-close')) closeRules(); });

  // accès pour les tests
  window.STRAT_TOKEN = token;
  window.STRAT = { get G() { return G; }, E, doAction: a => doAction(a), endGame: () => endGame(), undo: () => undo() };
})();
