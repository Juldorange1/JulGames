'use strict';
/* =========================================================
   BINÔME — interface (écrans DOM)
   ========================================================= */
const ICONS = {
  fist: '<path d="M6 10h12v6a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z M8 10V6 M12 10V5 M16 10V6"/>',
  arrow: '<path d="M4 20L20 4 M20 4h-7 M20 4v7"/>',
  arrow2: '<path d="M3 12h18 M15 6l6 6-6 6 M3 8v8"/>',
  blade: '<path d="M5 19L19 5l-1 5-9 9z M4 20l3-3"/>',
  spark: '<path d="M12 3v18 M3 12h18 M6 6l12 12 M18 6L6 18"/>',
  dash: '<path d="M4 6l6 6-6 6 M12 6l6 6-6 6"/>',
  spin: '<path d="M20 12a8 8 0 1 1-3-6.2 M20 4v5h-5"/>',
  wave: '<path d="M3 10c3-5 6 5 9 0s6 5 9 0 M3 16c3-5 6 5 9 0s6 5 9 0"/>',
  hook: '<path d="M12 3v10a4 4 0 1 1-4-4"/>',
  meteor: '<circle cx="15" cy="15" r="5"/><path d="M3 3l8 8 M8 3l5 5 M3 8l5 5"/>',
  leap: '<path d="M3 19c3-12 15-12 18 0 M17 15l4 4-5 1"/>',
  shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
  swap: '<path d="M4 8h15l-4-4 M20 16H5l4 4"/>',
  drop: '<path d="M12 3c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z"/>',
  snow: '<path d="M12 2v20 M3 7l18 10 M21 7L3 17"/>',
  skull: '<circle cx="12" cy="10" r="7"/><path d="M9 21v-4 M15 21v-4 M9 10h.01 M15 10h.01"/>',
  wall: '<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M3 12h18 M9 6v6 M15 12v6"/>',
  flag: '<path d="M5 21V3 M5 4h12l-3 4 3 4H5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  fang: '<path d="M4 5h16 M7 5l2 9 2-9 M13 5l2 9 2-9"/>',
  trap: '<circle cx="12" cy="12" r="8"/><path d="M12 4v4 M12 16v4 M4 12h4 M16 12h4"/>',
  wind: '<path d="M3 8h12a3 3 0 1 0-3-3 M3 16h15a3 3 0 1 1-3 3 M3 12h8"/>',
  fire: '<path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 3-7 1 2 2 3 3 3 0-3-1-5 0-7z"/>',
  taunt: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6 M12 16.5v.5"/>',
  ricochet: '<path d="M3 18l6-11 5 8 7-10"/>',
  bomb: '<circle cx="11" cy="14" r="7"/><path d="M15 8l3-3 M19 2.5l1.5 1.5"/>',
  repli: '<path d="M19 12H5 M10 6l-6 6 6 6 M20 5v14"/>',
  vortex: '<path d="M12 12a2 2 0 1 0 2-2 4 4 0 1 0 4 4 6 6 0 1 0-6 6"/>',
  quake: '<path d="M2 13h4l2-6 3 11 3-9 2 4h6"/>',
  plus: '<path d="M12 6v12 M6 12h12"/>',
  gold: '<path d="M12 3l7 7-7 11-7-11z M5 10h14 M9 10l3 11 3-11"/>',
  door: '<path d="M5 21V8a7 7 0 0 1 14 0v13 M3 21h18 M14 13h.01"/>',
  crown: '<path d="M3 18h18 M4 18l-1-10 5 4 4-7 4 7 5-4-1 10"/>',
  rule: '<path d="M4 4h16v16H4z M8 9h8 M8 13h8 M8 17h5"/>',
  pact: '<path d="M12 21C7 17 3 13 3 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 2.5C21 13 17 17 12 21z M12 8l-2 5h4l-2 5"/>',
  rest: '<path d="M3 18h18 M5 18v-5h14v5 M7 13V9h4v4"/>',
  hourglass: '<path d="M6 3h12 M6 21h12 M7 3c0 5 10 7 10 9s-10 4-10 9 M17 3c0 5-10 7-10 9s10 4 10 9"/>',
  mutate: '<path d="M7 3c0 6 10 6 10 12s-10 6-10 6 M17 3c0 6-10 6-10 12 M8 7h8 M8 17h8"/>',
  transfer: '<path d="M3 12h14 M13 7l5 5-5 5 M21 4v16"/>',
  up: '<path d="M12 20V5 M6 11l6-6 6 6"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4z M16 9a4 4 0 0 1 0 6 M19 6a8 8 0 0 1 0 12"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4z M17 9l5 6 M22 9l-5 6"/>',
  menu: '<path d="M4 6h16 M4 12h16 M4 18h16"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14 M12 17h.01"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  undo: '<path d="M9 14L4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3"/>',
  run: '<path d="M13 4a1.5 1.5 0 1 0 0 .01 M9 20l3-6-3-3 4-4 3 4h3 M12 14l3 6"/>',
  anvil: '<path d="M3 8h14a4 4 0 0 1-4 4H9v3h4v3H6v-3h2v-3H6a3 3 0 0 1-3-3z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
};
function icon(name, size) { return `<svg class="ico" viewBox="0 0 24 24" width="${size || 20}" height="${size || 20}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.plus}</svg>`; }
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const REWARD_ICON = { skill: 'plus', upgrade: 'up', rule: 'rule', pact: 'pact', rest: 'rest', prolong: 'hourglass', mutation: 'mutate', transfert: 'transfer' };

const UI = {
  reduceMotion: false,
  lastHtml: {},
  show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    if (id === 'scr-combat') { requestAnimationFrame(() => { Render.resize(); Render.start(); }); } else Render.stop();
    document.body.dataset.screen = id;
  },
  setHtml(el, html) { if (!el) return; if (el._h !== html) { el._h = html; el.innerHTML = html; } },

  /* ---------- écran titre ---------- */
  showTitle() {
    const sv = load();
    const c = $('#btn-continue');
    if (sv) { c.style.display = ''; c.innerHTML = `${icon('door')} Continuer <small>Salle ${sv.depth + 1} · ${sv.money} or</small>`; }
    else c.style.display = 'none';
    UI.show('scr-title');
  },

  /* ---------- choix des héros ---------- */
  pickSel: [],
  showPick() {
    UI.pickSel = [];
    const box = $('#pick-list');
    box.innerHTML = Object.keys(HEROES).map(k => {
      const H = HEROES[k], B = SKILLS[H.basic];
      return `<button class="pick-card" data-k="${k}" style="--c:${H.color}">
        <div class="pick-token"><span>${H.name[0]}</span></div>
        <b>${H.name}</b><i>${H.title}</i>
        <p>${H.desc}</p>
        <div class="pick-skill">${icon(B.icon, 18)} <b>${B.name}</b> · ${B.dmg} dégâts · ${skillKindText(B)}</div>
        <div class="pick-move">Déplacement : ${H.move} cases</div>
      </button>`;
    }).join('');
    box.querySelectorAll('.pick-card').forEach(b => b.onclick = () => {
      Sfx.click();
      const k = b.dataset.k, i = UI.pickSel.indexOf(k);
      if (i >= 0) UI.pickSel.splice(i, 1); else { UI.pickSel.push(k); if (UI.pickSel.length > 2) UI.pickSel.shift(); }
      box.querySelectorAll('.pick-card').forEach(x => { const j = UI.pickSel.indexOf(x.dataset.k); x.classList.toggle('sel', j >= 0); x.dataset.n = j >= 0 ? j + 1 : ''; });
      $('#btn-start').disabled = UI.pickSel.length !== 2;
    });
    $('#btn-start').disabled = true;
    UI.show('scr-pick');
  },

  /* ---------- écran de choix de salle ---------- */
  showChoice(notes) {
    const era = eraData(S.depth);
    document.documentElement.style.setProperty('--accent', era.accent);
    document.documentElement.style.setProperty('--era-bg', era.bg);
    $('#ch-depth').textContent = `Salle ${S.depth + 1}`;
    $('#ch-era').textContent = era.name + (eraOf(S.depth) >= ERAS.length ? ` · cycle ${Math.floor(eraOf(S.depth) / ERAS.length) + 1}` : '');
    $('#ch-era').title = era.desc;
    $('#ch-gold').innerHTML = `${icon('gold', 16)} ${S.money}`;
    // notes de fin de salle
    $('#ch-notes').innerHTML = (notes || []).map(n => `<div class="note ${n.c || ''}">${esc(n.t)}</div>`).join('');
    // héros
    $('#ch-heroes').innerHTML = S.heroes.map((h, hi) => heroSummary(h, hi)).join('');
    // effets
    const eff = [];
    for (const r of S.rules) eff.push(`<div class="chip rule" title="${esc(RULES[r.key].desc)}">${icon('rule', 14)} <b>${RULES[r.key].name}</b> <span class="dur">${r.perm ? '∞' : r.dur}</span><small>${esc(RULES[r.key].desc)}</small></div>`);
    for (const p of S.pacts) eff.push(`<div class="chip pact">${icon('pact', 14)} <b>${PACTS[p.key].name}</b> <span class="dur">${p.dur}</span><small>+ ${esc(PACTS[p.key].bonus(p.v))} · − ${esc(PACTS[p.key].malus)}</small></div>`);
    $('#ch-effects').innerHTML = eff.length ? eff.join('') : '<div class="empty">Aucune règle ni pacte actif.</div>';
    // portes
    const doors = $('#ch-doors');
    doors.innerHTML = S.choices.map((c, i) => doorHtml(c, i)).join('');
    doors.querySelectorAll('.door').forEach(d => d.onclick = () => { Sfx.door(); UI.enterRoom(+d.dataset.i); });
    $('#ch-log').innerHTML = S.log.slice(0, 8).map(l => `<div><span>S${l.d + 1}</span> ${esc(l.t)}</div>`).join('');
    const bc = bossChance();
    $('#ch-bosschance').textContent = S.depth < 4 ? 'Les boss apparaissent à partir de la salle 5.' : `Chance qu’une porte mène à un boss : ${Math.round(bc * 100)} %`;
    UI.show('scr-choice');
  },
  enterRoom(i) {
    const card = S.choices[i]; if (!card) return;
    startCombat(card);
    UI.lastHtml = {};
    UI.show('scr-combat');
    UI.refreshCombat(true);
    if (card.boss) UI.toast(`${BOSSES[card.boss].name} ! Si un héros tombe à 40 %, il s’enfuit avec l’or.`, 'bad', 4200);
    else if (card.trait) UI.toast(`${TRAITS[card.trait].name} : ${TRAITS[card.trait].desc}`, '', 3200);
  },

  /* ---------- combat ---------- */
  refreshCombat() {
    if (!C) return;
    const era = eraData(S.depth);
    document.documentElement.style.setProperty('--accent', era.accent);
    const card = C.card;
    let goal;
    if (card.boss) goal = `<span class="tag boss">${icon('crown', 14)} ${BOSSES[card.boss].name}</span> <span class="tag gold">${icon('gold', 14)} ${bossMoney(card)}</span>`;
    else goal = `<span class="tag">${icon(REWARD_ICON[card.reward.type], 14)} ${esc(rewardTitle(card.reward))}</span>`;
    UI.setHtml($('#cb-top-mid'), `<span class="stars">${'★'.repeat(card.diff)}</span> ${goal}${card.trait ? ` <span class="tag trait" title="${esc(TRAITS[card.trait].desc)}">${TRAITS[card.trait].name}</span>` : ''}`);
    UI.setHtml($('#cb-depth'), `Salle ${S.depth + 1} · Tour ${C.turn}`);
    for (let hi = 0; hi < 2; hi++) UI.setHtml($(`#hp-${hi}`), heroPanel(hi));
    const myTurn = C.phase === 'hero' && !C.busy && !C.ended;
    const btn = $('#btn-end');
    btn.disabled = !myTurn;
    const allDone = myTurn && heroUnits().every(u => u.actions <= 0 && !u.hasMove);
    btn.classList.toggle('pulse', allDone);
    btn.innerHTML = C.phase === 'enemy' ? 'Tour ennemi…' : 'Fin du tour <kbd>Espace</kbd>';
    const hu = heroUnit(C.sel);
    $('#btn-undo').disabled = !(myTurn && hu && hu.preMove);
    $('#btn-danger').classList.toggle('on', !!C.danger);
    $('#btn-flee').innerHTML = `${icon('run', 16)} ${C.boss ? 'Abandonner' : 'Fuir'}`;
    UI.updateInfo();
  },
  updateInfo() {
    if (!C) return;
    let html = '';
    const hv = UI.hoverSkill;
    if (hv) html = skillInfo(hv.hi, hv.slot);
    else if (C.mode === 'skill') html = skillInfo(C.sel, C.slot);
    else if (C.hover) html = tileInfo(C.hover[0], C.hover[1]);
    if (!html) {
      if (C.phase === 'enemy') html = '<b>Tour ennemi</b><p>Les ennemis agissent…</p>';
      else {
        const hu = heroUnit(C.sel);
        html = `<b>À toi de jouer</b><p>${hu && hu.hasMove ? 'Clique une case bleue pour te déplacer. ' : ''}Choisis une compétence (1-4) puis une cible. <kbd>Tab</kbd> change de héros, <kbd>D</kbd> montre les zones de danger.</p>`;
      }
    }
    UI.setHtml($('#cb-info'), html);
  },
  selectSkill(hi, slot) {
    if (!C || C.busy || C.phase !== 'hero') return;
    const hu = heroUnit(hi); if (!hu) return;
    const inst = S.heroes[hi].slots[slot];
    C.sel = hi;
    if (!inst) { C.mode = null; UI.refreshCombat(); return; }
    if (C.mode === 'skill' && C.slot === slot) { C.mode = null; C.slot = -1; UI.refreshCombat(); return; }
    if (hu.actions <= 0) { UI.toast(`${HEROES[S.heroes[hi].key].name} n’a plus d’action ce tour.`, 'bad', 1600); C.mode = null; UI.refreshCombat(); return; }
    if ((inst.cdLeft || 0) > 0) { UI.toast(`Recharge : encore ${inst.cdLeft} tour${inst.cdLeft > 1 ? 's' : ''}.`, 'bad', 1600); UI.refreshCombat(); return; }
    Sfx.select();
    C.mode = 'skill'; C.slot = slot;
    UI.refreshCombat();
  },
  selectHero(hi) {
    if (!C || C.busy) return;
    if (!heroUnit(hi)) return;
    C.sel = hi; C.mode = null; C.slot = -1; Sfx.click(); UI.refreshCombat();
  },
  afterAction() {
    if (!C) return;
    if (C.ended) { UI.refreshCombat(); finishCombat(); return; }
    C.mode = null; C.slot = -1;
    const hu = heroUnit(C.sel);
    if (hu && hu.actions <= 0 && !hu.hasMove) { const o = heroUnit(1 - C.sel); if (o && (o.actions > 0 || o.hasMove)) C.sel = o.hero; }
    UI.refreshCombat();
  },

  /* ---------- toasts & modales ---------- */
  toast(t, cls, ms) {
    const d = document.createElement('div'); d.className = 'toast ' + (cls || ''); d.textContent = t;
    $('#toasts').appendChild(d);
    setTimeout(() => d.classList.add('out'), ms || 2200);
    setTimeout(() => d.remove(), (ms || 2200) + 400);
  },
  modal(title, body, buttons, opts) {
    const m = $('#modal');
    m.innerHTML = `<div class="modal-box ${opts && opts.wide ? 'wide' : ''}"><h2>${title}</h2><div class="modal-body">${body}</div><div class="modal-btns">${(buttons || []).map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}</div></div>`;
    m.classList.add('on');
    m.querySelectorAll('.modal-btns .btn').forEach(b => b.onclick = () => { const bt = buttons[+b.dataset.i]; if (!bt.keep) UI.closeModal(); if (bt.fn) bt.fn(); });
    return m;
  },
  closeModal() { const m = $('#modal'); m.classList.remove('on'); m.innerHTML = ''; },
  /* liste d'options cliquables */
  choose(title, intro, options, onPick, cancel) {
    const body = `<p>${intro}</p><div class="opt-list">${options.map((o, i) => `<button class="opt ${o.cls || ''}" data-i="${i}" ${o.disabled ? 'disabled' : ''}>${o.html}</button>`).join('')}</div>`;
    const m = UI.modal(title, body, cancel ? [{ label: cancel.label, cls: 'ghost', fn: cancel.fn }] : [], { wide: true });
    m.querySelectorAll('.opt').forEach(b => b.onclick = () => { UI.closeModal(); onPick(options[+b.dataset.i], +b.dataset.i); });
  },

  /* ---------- récompenses ---------- */
  applyReward(rw, notes, done) {
    const v = rw.v;
    const fin = (t, c) => { if (t) { notes.unshift({ t, c: c || 'good' }); addLog(t); } done(); };
    const allSkills = (filter) => {
      const out = [];
      S.heroes.forEach((h, hi) => h.slots.forEach((s, si) => { if (s && (!filter || filter(s, hi, si))) out.push({ hi, si, s }); }));
      return out;
    };
    const skillOpt = (o, extra) => ({ hi: o.hi, si: o.si, html: `<span class="opt-ico" style="color:${HEROES[S.heroes[o.hi].key].color}">${icon(SKILLS[o.s.key].icon, 22)}</span><span><b>${SKILLS[o.s.key].name}</b> <small>${HEROES[S.heroes[o.hi].key].name}${o.s.perm ? ' · définitive' : ` · ${o.s.dur} salles`}</small><br><small>${esc(extra || SKILLS[o.s.key].desc)}</small></span>` });
    const placeSkill = (hi, key, dur, mods, after) => {
      const h = S.heroes[hi];
      const empty = h.slots.findIndex((s, i) => i > 0 && !s);
      if (empty > 0) { h.slots[empty] = { key, perm: false, dur, mods: mods || [] }; after(true); return; }
      const opts = h.slots.map((s, si) => ({ s, si, hi })).filter(o => o.si > 0).map(o => skillOpt(o, 'Remplacer celle-ci'));
      UI.choose(`${HEROES[h.key].name} n’a plus de place`, `Remplacer quelle compétence par <b>${SKILLS[key].name}</b> ?`, opts,
        o => { h.slots[o.si] = { key, perm: false, dur, mods: mods || [] }; after(true); },
        { label: 'Refuser', fn: () => after(false) });
    };
    switch (rw.type) {
      case 'skill': {
        const dur = DUR.skill * v;
        placeSkill(rw.hero, rw.key, dur, [], ok => fin(ok ? `${HEROES[S.heroes[rw.hero].key].name} apprend ${SKILLS[rw.key].name} (${dur} salles).` : 'Compétence refusée.', ok ? 'good' : 'dim'));
        return;
      }
      case 'upgrade': {
        const U = UPGRADES[rw.key];
        const el = allSkills((s, hi, si) => U.ok(skillStats(hi, si)));
        if (!el.length) { for (const h of S.heroes) h.pct = Math.min(maxPct(), h.pct + 10 * v); return fin(`Aucune compétence compatible : +${10 * v} % aux deux héros.`); }
        UI.choose(`Amélioration : ${U.name}`, `${U.desc(v)} pendant ${DUR.upgrade} salles. Sur quelle compétence ?`, el.map(o => skillOpt(o)),
          o => { S.heroes[o.hi].slots[o.si].mods.push({ key: rw.key, v, dur: DUR.upgrade, perm: false }); fin(`${U.name} (${U.desc(v)}) sur ${SKILLS[S.heroes[o.hi].slots[o.si].key].name}.`); },
          { label: 'Refuser', fn: () => fin('Amélioration refusée.', 'dim') });
        return;
      }
      case 'rule': addRule(rw.key, DUR.rule * v); return fin(`Nouvelle règle : ${RULES[rw.key].name} (${DUR.rule * v} salles).`);
      case 'pact': addPact(rw.key, v); return fin(`Pacte : ${PACTS[rw.key].name} (${DUR.pact} salles).`);
      case 'rest': for (const h of S.heroes) h.pct = Math.min(maxPct(), h.pct + 15 * v); return fin(`Repos : +${15 * v} % aux deux héros.`);
      case 'prolong': prolongAll(3 * v); return fin(`Sablier : +${3 * v} salles à tous les effets temporaires.`);
      case 'mutation': {
        const el = allSkills((s, hi, si) => si > 0);
        if (!el.length) { for (const h of S.heroes) h.pct = Math.min(maxPct(), h.pct + 10 * v); return fin(`Rien à transformer : +${10 * v} % aux deux héros.`); }
        UI.choose('Mutation', 'Quelle compétence transformer ? (ses améliorations et sa durée sont gardées)', el.map(o => skillOpt(o)), o => {
          const inst = S.heroes[o.hi].slots[o.si];
          const owned = new Set(S.heroes[o.hi].slots.filter(Boolean).map(s => s.key));
          const pool = shuffle(rnd, SKILL_POOL.filter(k => !owned.has(k)));
          const old = SKILLS[inst.key].name;
          if (v > 1) {
            UI.choose('Mutation', `${old} devient…`, pool.slice(0, 3).map(k => ({ k, html: `<span class="opt-ico">${icon(SKILLS[k].icon, 22)}</span><span><b>${SKILLS[k].name}</b><br><small>${esc(SKILLS[k].desc)}</small></span>` })),
              p => { inst.key = p.k; fin(`Mutation : ${old} devient ${SKILLS[p.k].name}.`); });
          } else { inst.key = pool[0]; fin(`Mutation : ${old} devient ${SKILLS[pool[0]].name}.`); }
        }, { label: 'Refuser', fn: () => fin('Mutation refusée.', 'dim') });
        return;
      }
      case 'transfert': {
        const el = allSkills((s, hi, si) => si > 0 && !S.heroes[1 - hi].slots.some(x => x && x.key === s.key));
        if (!el.length) { for (const h of S.heroes) h.pct = Math.min(maxPct(), h.pct + 10 * v); return fin(`Rien à transférer : +${10 * v} % aux deux héros.`); }
        UI.choose('Transfert', 'Quelle compétence donner à l’autre héros ?', el.map(o => skillOpt(o)), o => {
          const inst = S.heroes[o.hi].slots[o.si], to = 1 - o.hi;
          const h2 = S.heroes[to];
          const doMove = (slot) => { S.heroes[o.hi].slots[o.si] = null; if (v > 1 && !inst.perm) inst.dur += 3; h2.slots[slot] = inst; fin(`${SKILLS[inst.key].name} passe à ${HEROES[h2.key].name}.`); };
          const empty = h2.slots.findIndex((s, i) => i > 0 && !s);
          if (empty > 0) return doMove(empty);
          UI.choose(`${HEROES[h2.key].name} n’a plus de place`, 'Remplacer quelle compétence ?', h2.slots.map((s, si) => ({ s, si, hi: to })).filter(x => x.si > 0).map(x => skillOpt(x, 'Remplacer celle-ci')),
            x => doMove(x.si), { label: 'Annuler', fn: () => fin('Transfert annulé.', 'dim') });
        }, { label: 'Refuser', fn: () => fin('Transfert refusé.', 'dim') });
        return;
      }
    }
    done();
  },

  /* ---------- Atelier : gravure + talents ---------- */
  showAtelier() {
    const rows = [];
    S.heroes.forEach((h, hi) => h.slots.forEach((s, si) => {
      if (!s) return;
      const hn = HEROES[h.key].name, col = HEROES[h.key].color;
      if (!s.perm) rows.push({ kind: 'skill', html: `<span class="opt-ico" style="color:${col}">${icon(SKILLS[s.key].icon, 20)}</span><span><b>${SKILLS[s.key].name}</b> <small>${hn} · encore ${s.dur} salle${s.dur > 1 ? 's' : ''}</small></span>`, fn: () => { s.perm = true; } });
      s.mods.forEach(m => {
        if (m.perm) return;
        rows.push({ kind: 'upgrade', html: `<span class="opt-ico" style="color:${col}">${icon('up', 20)}</span><span><b>${UPGRADES[m.key].name}</b> <small>sur ${SKILLS[s.key].name} (${hn}) · ${UPGRADES[m.key].desc(m.v)} · encore ${m.dur} salle${m.dur > 1 ? 's' : ''}${s.perm ? '' : ' · ⚠ la compétence elle-même est temporaire'}</small></span>`, fn: () => { m.perm = true; } });
      });
    }));
    for (const r of S.rules) if (!r.perm) rows.push({ kind: 'rule', html: `<span class="opt-ico">${icon('rule', 20)}</span><span><b>Règle : ${RULES[r.key].name}</b> <small>${esc(RULES[r.key].desc)} · encore ${r.dur} salle${r.dur > 1 ? 's' : ''}</small></span>`, fn: () => { r.perm = true; } });
    const engr = rows.length ? rows.map((r, i) => { const c = engraveCost(r.kind); return `<div class="at-row">${r.html}<button class="btn small gold" data-e="${i}" ${S.money < c ? 'disabled' : ''}>${icon('anvil', 16)} Graver · ${c}</button></div>`; }).join('')
      : '<div class="empty">Aucun effet temporaire à graver pour l’instant.</div>';
    const tal = Object.keys(TALENTS).map(k => {
      const T = TALENTS[k], lv = S.talents[k], maxed = lv >= T.max, c = talentCost(k);
      return `<div class="at-row"><span class="opt-ico">${icon('star', 20)}</span><span><b>${T.name}</b> <small>niveau ${lv}/${T.max}</small><br><small>${esc(T.desc)}</small></span><button class="btn small gold" data-t="${k}" ${maxed || S.money < c ? 'disabled' : ''}>${maxed ? 'Max' : `Acheter · ${c}`}</button></div>`;
    }).join('');
    const body = `<div class="at-gold">${icon('gold', 22)} <b>${S.money}</b> or <small>(gagné uniquement sur les boss)</small></div>
      <h3>Graver <small>— rendre un effet temporaire définitif</small></h3><div class="at-list">${engr}</div>
      <p class="hint">Les pactes ne peuvent pas être gravés. Le coût d’une gravure augmente à chaque gravure du même type.</p>
      <h3>Talents définitifs</h3><div class="at-list">${tal}</div>`;
    const m = UI.modal(`${icon('anvil', 24)} Atelier`, body, [{ label: 'Fermer', cls: 'ghost', fn: () => UI.showChoice() }], { wide: true });
    m.querySelectorAll('[data-e]').forEach(b => b.onclick = () => {
      const r = rows[+b.dataset.e], c = engraveCost(r.kind); if (S.money < c) return;
      S.money -= c; S.engraved[r.kind]++; r.fn(); Sfx.gold(); addLog('Gravure effectuée.'); save(); UI.showAtelier();
    });
    m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
      const k = b.dataset.t, c = talentCost(k); if (S.money < c || S.talents[k] >= TALENTS[k].max) return;
      S.money -= c; S.talents[k]++; Sfx.gold(); addLog(`Talent ${TALENTS[k].name} niveau ${S.talents[k]}.`); save(); UI.showAtelier();
    });
  },

  /* ---------- menu & aide ---------- */
  showMenu() {
    const inCombat = !!C;
    const st = S ? `<div class="stats"><div><b>${S.depth}</b><small>salles</small></div><div><b>${S.stats.kills}</b><small>ennemis tués</small></div><div><b>${S.bossesKilled}</b><small>boss vaincus</small></div><div><b>${S.bossesFailed}</b><small>boss enfuis</small></div><div><b>${S.stats.moneyTotal}</b><small>or gagné</small></div></div>` : '';
    UI.modal('Menu', `${st}
      <div class="menu-opts">
        <button class="btn ghost" id="m-sound">${icon(Sfx.muted ? 'mute' : 'sound', 18)} Son : ${Sfx.muted ? 'coupé' : 'activé'}</button>
        <button class="btn ghost" id="m-speed">Animations : ${ANIM < 1 ? 'rapides' : 'normales'}</button>
        <button class="btn ghost" id="m-help">${icon('help', 18)} Comment jouer</button>
      </div>`, [
      { label: 'Reprendre', cls: '' },
      { label: 'Écran titre', cls: 'ghost', fn: () => { if (inCombat) { C = null; } UI.showTitle(); } },
      { label: 'Supprimer la partie', cls: 'danger', fn: () => UI.modal('Supprimer la partie ?', '<p>Toute la progression (or, gravures, talents) sera perdue.</p>', [{ label: 'Annuler', cls: 'ghost' }, { label: 'Supprimer', cls: 'danger', fn: () => { wipeSave(); S = null; C = null; UI.showTitle(); } }]) },
    ]);
    $('#m-sound').onclick = () => { Sfx.setMuted(!Sfx.muted); UI.showMenu(); };
    $('#m-speed').onclick = () => { ANIM = ANIM < 1 ? 1 : 0.5; try { localStorage.setItem('binome_anim', String(ANIM)); } catch (e) { } UI.showMenu(); };
    $('#m-help').onclick = () => UI.showHelp();
  },
  showHelp() {
    UI.modal('Comment jouer', `
      <div class="help">
      <p><b>Deux héros, des salles sans fin.</b> Pas de points de vie : chaque héros a un <b>% de dégâts</b> (100 % au départ). Chaque coup reçu le fait baisser, et tes attaques font moins mal. Il ne descend jamais sous <b>40 %</b> : tu ne peux pas mourir, mais tu deviens faible.</p>
      <p><b>Tuer un ennemi</b> rend <b>+5 %</b> au héros qui l’a tué.</p>
      <p><b>Ton tour :</b> chaque héros peut <b>se déplacer</b> une fois (cases bleues) et utiliser <b>une compétence</b>, dans l’ordre que tu veux. Puis les ennemis jouent.</p>
      <p><b>Compétences :</b> au début, chaque héros n’a que son attaque de base. Les salles en donnent d’autres (4 emplacements), les améliorent, changent les règles…</p>
      <p><b>Tout est temporaire !</b> Chaque récompense dure un certain nombre de salles. Seul l’<b>or</b> permet de <b>graver</b> un effet pour le garder pour toujours (Atelier), ou d’acheter des talents définitifs.</p>
      <p><b>Portes :</b> après chaque salle, choisis parmi 3 portes. <span class="stars">★</span> = facile, <span class="stars">★★</span> = plus d’ennemis et d’élites, mais <b>gains ×2</b>.</p>
      <p><b>Boss :</b> parfois une porte mène à un boss. Ce sont les <b>seuls</b> à donner de l’or. Mais si un héros tombe à <b>40 %</b> pendant le combat, le boss s’enfuit et tu ne gagnes rien.</p>
      <p><b>Astuces :</b> pousse les ennemis dans les <b>fosses</b> (mort immédiate), contre les murs ou entre eux (<b>collision</b> : 5 dégâts aux deux). Les zones hachurées rouges sont des attaques annoncées : sors-en ! Touche <kbd>D</kbd> (ou l’œil) pour voir où les ennemis peuvent frapper.</p>
      <p><b>Raccourcis :</b> <kbd>1</kbd>-<kbd>4</kbd> compétences, <kbd>Tab</kbd> changer de héros, <kbd>Espace</kbd> fin du tour, <kbd>Échap</kbd>/clic droit annuler, <kbd>Z</kbd> annuler le déplacement.</p>
      </div>`, [{ label: 'Compris', cls: '' }], { wide: true });
  },
};

/* ---------- fragments HTML ---------- */
function skillKindText(s) {
  switch (s.type) {
    case 'line': return s.range <= 1 ? 'corps à corps' : `ligne, portée ${s.range}`;
    case 'point': return `case à ${s.range} max`;
    case 'self': return 'autour de soi';
    case 'dash': return `charge ${s.range} cases`;
    case 'leap': return `saut ${s.range} cases`;
    case 'swap': return `échange ${s.range} cases`;
    case 'place': return `pose à ${s.range} max`;
    case 'ally': return `allié à ${s.range} max`;
  }
  return '';
}
function effectList(s) {
  const e = [];
  if (s.push) e.push(`repousse ${s.push}`);
  if (s.pull) e.push('attire');
  if (s.pierce) e.push('perçant');
  if (s.splash) e.push(`éclats ${Math.round(s.splash * 100)} %`);
  if (s.poison) e.push(`poison ${s.poison}/tour`);
  if (s.stun) e.push(`étourdit ${s.stun}`);
  if (s.lifesteal) e.push(`soigne ${s.lifesteal} %`);
  if (s.echo) e.push(`écho ${Math.round(s.echo * 100)} %`);
  if (s.chain) e.push(`rebondit ×${s.chain}`);
  if (s.exec) e.push(`×${1 + s.exec} si cible < 50 %`);
  if (s.vif) e.push(`+${s.vif} dépl. après`);
  if (s.shield) e.push('bouclier');
  if (s.fire) e.push('feu');
  if (s.ff) e.push('touche l’allié');
  return e;
}
function durTag(x) { return x.perm ? '<span class="dur perm" title="Définitif">∞</span>' : `<span class="dur" title="Salles restantes">${x.dur}</span>`; }
function heroSummary(h, hi) {
  const H = HEROES[h.key];
  const sk = h.slots.map((s, si) => {
    if (!s) return `<div class="sk empty">${icon('plus', 16)} <span>Vide</span></div>`;
    const D = SKILLS[s.key];
    const mods = s.mods.map(m => `<span class="mod" title="${esc(UPGRADES[m.key].desc(m.v))}">${UPGRADES[m.key].name}${m.v > 1 ? ' II' : ''} ${durTag(m)}</span>`).join('');
    return `<div class="sk" title="${esc(D.desc)}">${icon(D.icon, 16)} <span><b>${D.name}</b>${si === 0 ? '' : ' ' + durTag(s)}${mods ? `<br>${mods}` : ''}</span></div>`;
  }).join('');
  return `<div class="hsum" style="--c:${H.color}">
    <div class="hsum-head"><div class="tok">${H.name[0]}</div><div><b>${H.name}</b><small>${H.title}</small></div>${pctBar(h)}</div>
    <div class="hsum-skills">${sk}</div></div>`;
}
function pctBar(h) {
  const mx = maxPct(), p = Math.round(h.pct);
  const cls = p <= FLOOR_PCT ? 'low' : p < 60 ? 'mid' : '';
  return `<div class="pct ${cls}"><div class="pct-num">${p}%</div><div class="bar"><i style="width:${p / mx * 100}%"></i><em style="left:${FLOOR_PCT / mx * 100}%"></em></div></div>`;
}
function doorHtml(c, i) {
  const room = genRoom(c);
  const counts = {};
  for (const e of room.enemies) if (!e.boss) counts[e.kind] = (counts[e.kind] || 0) + 1;
  const elites = room.enemies.filter(e => e.elite).length;
  const foes = Object.keys(counts).map(k => `<span class="foe" style="--c:${ENEMIES[k].color}" title="${esc(ENEMIES[k].name + ' : ' + ENEMIES[k].desc)}"><i class="sh-${ENEMIES[k].shape}"></i>${counts[k]}× ${ENEMIES[k].name}</span>`).join('');
  const hazards = [];
  let pits = 0, lava = 0; for (const row of room.grid) for (const t of row) { if (t.t === 'pit') pits++; if (t.t === 'lava') lava++; }
  if (pits) hazards.push(`${pits} fosse${pits > 1 ? 's' : ''}`); if (lava) hazards.push(`${lava} lave`); if (room.objs.length) hazards.push(`${room.objs.length} baril${room.objs.length > 1 ? 's' : ''}`);
  if (c.boss) {
    const B = BOSSES[c.boss];
    return `<button class="door boss d${c.diff}" data-i="${i}" style="--c:${B.color}">
      <div class="door-top"><span class="stars">${'★'.repeat(c.diff)}</span><span class="mult">${c.diff > 1 ? 'or ×2' : ''}</span></div>
      <div class="door-arch">${icon('crown', 40)}</div>
      <div class="door-kind">BOSS</div>
      <h3>${B.name}</h3>
      <p>${esc(B.desc)}</p>
      <div class="door-gold">${icon('gold', 18)} +${bossMoney(c)} or</div>
      <div class="door-warn">Si un héros tombe à 40 %, le boss s’enfuit : pas d’or.<br><b>Ta marge : ${Math.max(0, Math.round(Math.min(S.heroes[0].pct, S.heroes[1].pct) - FLOOR_PCT))} %</b> (héros le plus faible)</div>
      ${foes ? `<div class="foes">${foes}</div>` : ''}
    </button>`;
  }
  const rw = c.reward;
  return `<button class="door d${c.diff}" data-i="${i}">
    <div class="door-top"><span class="stars">${'★'.repeat(c.diff)}</span><span class="mult">${c.diff > 1 ? 'gains ×2' : ''}</span></div>
    <div class="door-arch rw-${rw.type}">${icon(REWARD_ICON[rw.type], 40)}</div>
    <div class="door-kind">${{ skill: 'Compétence', upgrade: 'Amélioration', rule: 'Règle', pact: 'Pacte', rest: 'Repos', prolong: 'Sablier', mutation: 'Mutation', transfert: 'Transfert' }[rw.type]}</div>
    <h3>${esc(rewardTitle(rw).replace(/^[^:]+: /, ''))}</h3>
    <p>${esc(rewardDesc(rw))}</p>
    ${c.trait ? `<div class="door-trait ${TRAITS[c.trait].bad ? 'bad' : 'good'}"><b>${TRAITS[c.trait].name}</b> · ${esc(TRAITS[c.trait].desc)}</div>` : ''}
    <div class="foes">${foes}${elites ? `<span class="foe elite">${elites} élite${elites > 1 ? 's' : ''}</span>` : ''}</div>
    ${hazards.length ? `<div class="door-haz">${hazards.join(' · ')}</div>` : ''}
  </button>`;
}
function heroPanel(hi) {
  const h = S.heroes[hi], H = HEROES[h.key], u = heroUnit(hi);
  const sel = C.sel === hi;
  const done = u && C.phase === 'hero' && u.actions <= 0 && !u.hasMove;
  const st = u ? `<span class="st ${u.hasMove ? 'on' : ''}" title="Déplacement">${icon('dash', 13)} ${u.hasMove ? u.moveBudget : 0}</span><span class="st act ${u.actions > 0 ? 'on' : ''}" title="Actions">${icon('star', 13)} ${Math.max(0, u.actions)}</span>${u.shield ? `<span class="st sh on">${icon('shield', 13)} ${u.shield}</span>` : ''}` : '';
  const sk = h.slots.map((s, si) => {
    if (!s) return `<button class="skb empty" disabled><span class="k">${si + 1}</span>${icon('plus', 18)}<span class="nm">Vide</span></button>`;
    const D = SKILLS[s.key], st2 = skillStats(hi, si);
    const cd = s.cdLeft || 0;
    const dm = displayDmg(hi, st2);
    const active = sel && C.mode === 'skill' && C.slot === si;
    const unusable = !u || u.actions <= 0 || cd > 0 || C.phase !== 'hero';
    return `<button class="skb ${active ? 'active' : ''} ${unusable ? 'off' : ''}" data-h="${hi}" data-s="${si}">
      <span class="k">${si + 1}</span>${icon(D.icon, 20)}<span class="nm">${D.name}</span>
      <span class="meta">${dm > 0 ? `<b title="Dégâts">${dm}</b>` : ''}${si > 0 ? (s.perm ? durTag(s) : `<span class="dur" title="Salles restantes">${icon('hourglass', 9)}${s.dur}</span>`) : ''}${s.mods.length ? `<span class="mods">+${s.mods.length}</span>` : ''}</span>
      ${cd > 0 ? `<span class="cd">${cd}</span>` : ''}</button>`;
  }).join('');
  return `<div class="hp-in ${sel ? 'sel' : ''} ${done ? 'done' : ''}" data-h="${hi}" style="--c:${H.color}">
    <div class="hp-head"><div class="tok">${H.name[0]}</div><div class="nm"><b>${H.name}</b><small>${H.title}</small></div><div class="sts">${st}</div></div>
    ${pctBar(h)}
    <div class="skills">${sk}</div></div>`;
}
function skillInfo(hi, slot) {
  const inst = S.heroes[hi].slots[slot]; if (!inst) return '';
  const D = SKILLS[inst.key], s = skillStats(hi, slot);
  const dm = displayDmg(hi, s);
  const eff = effectList(s);
  const mods = inst.mods.map(m => `<li>${UPGRADES[m.key].name} : ${esc(UPGRADES[m.key].desc(m.v))} ${m.perm ? '(définitif)' : `(${m.dur} salles)`}</li>`).join('');
  return `<b>${icon(D.icon, 16)} ${D.name}</b> <small>${HEROES[S.heroes[hi].key].name} · ${skillKindText(s)}${s.cd ? ` · recharge ${s.cd}` : ''}${slot > 0 ? (inst.perm ? ' · définitive' : ` · ${inst.dur} salles`) : ''}</small>
    <p>${esc(D.desc)}</p>
    ${dm > 0 ? `<p><b>${dm}</b> dégâts (avec ${Math.round(S.heroes[hi].pct)} %)${eff.length ? ' · ' + eff.join(' · ') : ''}</p>` : (eff.length ? `<p>${eff.join(' · ')}</p>` : '')}
    ${mods ? `<ul>${mods}</ul>` : ''}`;
}
function tileInfo(x, y) {
  const o = unitAt(x, y), t = tile(x, y);
  const parts = [];
  if (o) {
    if (o.team === 'hero') {
      const h = S.heroes[o.hero], H = HEROES[h.key];
      parts.push(`<b style="color:${H.color}">${H.name}</b> <small>${H.title}</small><p>${Math.round(h.pct)} % (max ${maxPct()} %) · déplacement ${heroMove(o.hero)}${o.shield ? ` · bouclier ×${o.shield}` : ''}</p>`);
    } else if (o.team === 'obj') {
      parts.push('<b>Baril explosif</b><p>Explose s’il est touché : 10 dégâts (8 % aux héros) sur les 8 cases autour. Se pousse.</p>');
    } else {
      const D = o.boss ? BOSSES[o.kind] : ENEMIES[o.kind];
      const dmg = Math.round(o.dmg * (o.enr || 1) * G().taken);
      const st = [];
      if (o.elite) st.push('élite'); if (o.stun) st.push(`étourdi ${o.stun}`); if (o.poison) st.push(`poison ${o.poison.dmg}×${o.poison.turns}`); if (o.shield) st.push('bouclier'); if (o.armed) st.push('ARMÉE : explose au prochain tour'); if (o.immunePush) st.push('impossible à pousser');
      parts.push(`<b>${D.name}</b> <small>${Math.ceil(o.hp)}/${o.maxHp} PV · frappe −${dmg} % · déplacement ${o.move}</small><p>${esc(D.desc)}</p>${st.length ? `<p class="warn">${st.join(' · ')}</p>` : ''}`);
    }
  }
  if (t.t === 'pit') parts.push('<p><b>Fosse</b> : un ennemi poussé ou attiré dedans meurt (le kill compte). Les héros ne tombent pas.</p>');
  if (t.t === 'lava') parts.push('<p><b>Lave</b> : 6 dégâts aux ennemis, −5 % aux héros qui y commencent leur tour.</p>');
  if (t.t === 'rock') parts.push(`<p><b>Rocher</b>${t.ttl ? ` (disparaît dans ${t.ttl} tour${t.ttl > 1 ? 's' : ''})` : ''} : bloque. Pousser une unité contre lui = collision.</p>`);
  if (t.fire) parts.push('<p><b>Feu</b> : brûle qui s’y trouve au tour suivant.</p>');
  if (t.trap) parts.push(`<p><b>Piège</b> : ${t.trap.dmg} dégâts + étourdit le prochain ennemi qui passe.</p>`);
  for (const x2 of C.telegraphs) if (x2.tiles.some(([a, b]) => a === x && b === y)) parts.push(`<p class="warn"><b>${x2.label}</b> : frappe ici au prochain tour ennemi (−${Math.round(x2.pct * G().taken)} %).</p>`);
  return parts.join('');
}
