'use strict';
/* =========================================================
   TRIADE — interface (écrans DOM)
   Principe : gros chiffres, symboles, peu de texte. Le détail est dans le Codex.
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
  music: '<path d="M9 18V5l11-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>',
  menu: '<path d="M4 6h16 M4 12h16 M4 18h16"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14 M12 17h.01"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  undo: '<path d="M9 14L4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3"/>',
  run: '<path d="M13 4a1.5 1.5 0 1 0 0 .01 M9 20l3-6-3-3 4-4 3 4h3 M12 14l3 6"/>',
  anvil: '<path d="M3 8h14a4 4 0 0 1-4 4H9v3h4v3H6v-3h2v-3H6a3 3 0 0 1-3-3z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  foot: '<path d="M8 3c2 0 3 2 3 5s-1 6-3 6-3-3-3-6 1-5 3-5z M16 10c2 0 3 2 3 5s-1 6-3 6-3-3-3-6 1-5 3-5z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  gem: '<path d="M12 3l7 7-7 11-7-11z M5 10h14"/>',
  skullx: '<path d="M12 3a7 7 0 0 0-5 12v4h10v-4a7 7 0 0 0-5-12z M9 11h.01 M15 11h.01"/>',
  spikes: '<path d="M3 20l3-8 3 8 3-8 3 8 3-8 3 8"/>',
  current: '<path d="M4 8l4-4 4 4 M4 14l4-4 4 4 M4 20l4-4 4 4 M15 6h5 M15 12h5 M15 18h5"/>',
  altar: '<path d="M12 6v12 M6 12h12"/><circle cx="12" cy="12" r="9"/>',
  ice: '<path d="M12 2v20 M3 7l18 10 M21 7L3 17 M9 3l3 3 3-3 M9 21l3-3 3 3"/>',
  rune: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  portal: '<ellipse cx="12" cy="12" rx="6" ry="9"/><ellipse cx="12" cy="12" rx="2.5" ry="5"/>',
  bush: '<circle cx="8" cy="14" r="4"/><circle cx="16" cy="14" r="4"/><circle cx="12" cy="9" r="4"/>',
  mud: '<path d="M3 16c3-3 6 3 9 0s6 3 9 0 M5 11c2-2 4 2 6 0"/>',
  pit: '<ellipse cx="12" cy="14" rx="9" ry="5"/><path d="M12 3v6 M9 6l3 3 3-3"/>',
  lava: '<path d="M3 18c3-4 6 4 9 0s6 4 9 0 M8 12c0-3 4-3 4-7 2 3 4 4 4 7"/>',
  barrel: '<rect x="6" y="3" width="12" height="18" rx="4"/><path d="M6 9h12 M6 15h12"/>',
  link: '<path d="M9 12h6 M8 8a4 4 0 0 0 0 8 M16 8a4 4 0 0 1 0 8"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  cross: '<path d="M6 6l12 12 M18 6L6 18"/>',
  minus: '<path d="M5 12h14"/>',
  anchor: '<path d="M12 4v16 M5 13a7 7 0 0 0 14 0 M8 7h8"/>',
  revive: '<path d="M20 12a8 8 0 1 1-3-6.2 M20 4v5h-5"/>',
};
function icon(name, size) { return `<svg class="ico" viewBox="0 0 24 24" width="${size || 20}" height="${size || 20}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.plus}</svg>`; }
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const REWARD_ICON = { skill: 'plus', upgrade: 'up', rule: 'rule', pact: 'pact', rest: 'rest', prolong: 'hourglass', mutation: 'mutate', transfert: 'transfer' };
const REWARD_KIND = { skill: 'Compétence', upgrade: 'Amélioration', rule: 'Règle', pact: 'Pacte', rest: 'Repos', prolong: 'Sablier', mutation: 'Mutation', transfert: 'Transfert' };
const ZONE_ICON = { piques: 'spikes', courant: 'current', autel: 'altar', glace: 'ice', rune: 'rune', portail: 'portal', buisson: 'bush', boue: 'mud' };
const CHIP_TIP = { heart: 'PV (ennemi) ou % de dégâts (héros)', blade: 'Dégâts', foot: 'Déplacement (cases)', target: 'Portée / type de ciblage', hourglass: 'Durée (salles) ou recharge (tours)', star: 'Bonus / défi', gold: 'Or', crown: 'Boss', skullx: 'Difficulté / danger', shield: 'Bouclier ou protection', up: 'Amélioration / maximum', rule: 'Règle', pact: 'Pacte', pit: 'Fosse', lava: 'Lave', barrel: 'Baril explosif', door: 'Salle', wave: 'Vagues d’ennemis', run: 'Fuite / chasse', gem: 'Cristaux du rituel', bolt: 'Bonus de salle', snow: 'Ralentissement', drop: 'Poison', taunt: 'Attention', check: 'Réussi', cross: 'Raté', plus: 'Ajout', swap: 'Échange / miroir', arrow: 'Tir / prévision', spark: 'Éclats', push: 'Repousse', hook: 'Attire', spin: 'Écho', skull: 'Exécution', fire: 'Feu', link: 'Lien' };
const chip = (ic, txt, cls, title) => { title = title || CHIP_TIP[ic] || ''; return `<span class="ch ${cls || ''}"${title ? ` title="${esc(title)}"` : ''}>${ic ? icon(ic, 16) : ''}${txt != null && txt !== '' ? `<b>${txt}</b>` : ''}</span>`; };

const UI = {
  reduceMotion: false,
  lastHtml: {},
  showPreview: true,
  autoEnd: false,
  pvPending: false,
  pickLevel: 1,
  show(id) {
    if (id !== 'scr-pick' && typeof Codex !== 'undefined') Codex.stop();
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    const tp = $('#tip'); if (tp) tp.classList.remove('on');
    if (id === 'scr-combat') { requestAnimationFrame(() => { Render.resize(); Render.start(); }); } else Render.stop();
    document.body.dataset.screen = id;
  },
  setHtml(el, html) { if (!el) return; if (el._h !== html) { el._h = html; el.innerHTML = html; } },

  /* ---------- écran titre ---------- */
  showTitle() {
    const sv = load();
    const c = $('#btn-continue');
    if (sv) { c.style.display = ''; c.innerHTML = `${icon('door', 22)} Continuer <small>Salle ${sv.depth + 1} · ${icon('skullx', 14)} ${sv.level || 1} · ${icon('gold', 14)} ${sv.money}</small>`; }
    else c.style.display = 'none';
    // héros du logo et ennemis qui flottent en arrière-plan
    const lt = document.querySelectorAll('.logo-tokens span');
    ['brann', 'lyse', 'kael'].forEach((k, i) => { if (lt[i]) { lt[i].style.backgroundImage = `url(${Render.portrait(k)})`; lt[i].classList.add('pt'); } });
    const bg = $('.title-bg');
    if (bg && !bg.dataset.ok) {
      bg.dataset.ok = '1';
      const ks = Object.keys(ENEMIES).filter(k => ENEMIES[k].w > 0);
      let h = '';
      for (let i = 0; i < 16; i++) { const k = ks[(i * 7) % ks.length], E = ENEMIES[k]; h += `<i class="tf sh-${E.shape}" style="--c:${E.color};left:${(i * 61) % 100}%;--d:${16 + (i * 5) % 14}s;--dl:-${(i * 3.7) % 20}s;--s:${0.6 + ((i * 13) % 10) / 10}"></i>`; }
      bg.innerHTML = h;
    }
    const L = lifeStats();
    $('#title-rec').innerHTML = (L.rooms ? [chip('door', L.maxDepth || 0, '', 'Salle la plus profonde atteinte'), chip('crown', L.bosses || 0, 'gold', 'Boss battus (toutes parties)'), chip('skullx', L.kills || 0, '', 'Ennemis tués (toutes parties)'), chip('skullx', 'niv. ' + unlockedLevel(), 'red', 'Difficulté maximum débloquée')].join('') : '');
    $('#title-lang').innerHTML = UI.langHtml(); UI.bindLang();
    const fd = featsDone(), nf = FEATS.filter(f => fd[f.id]).length;
    $('#btn-feats').innerHTML = `${icon('crown', 18)} Hauts faits <small>${nf}/${FEATS.length}</small>`;
    const dl = loadDaily(), rec = dailyRecords(), td = rec.days && rec.days[todayStr()];
    $('#btn-daily').innerHTML = `${icon('star', 22)} Épreuve du jour <small>${dl && !dl.daily.done ? `en cours · salle ${dl.depth + 1}/${DAILY_ROOMS}` : td != null ? `record du jour : ${td}` : 'nouvelle !'}</small>`;
    Music.play('explore');
    UI.show('scr-title');
  },

  /* ---------- Épreuve du jour ---------- */
  showDaily() {
    const date = todayStr(), d = dailySetup(date), cur = loadDaily(), rec = dailyRecords(), td = rec.days && rec.days[date];
    const heroes = d.keys.map(k => `<span class="ch" style="color:${HEROES[k].color}"><b>${HEROES[k].name}</b></span>`).join('');
    const going = cur && !cur.daily.done;
    const start = () => { newDaily(); UI.showChoice([{ t: `Épreuve du jour : ${DAILY_ROOMS} salles, fais le meilleur score !`, c: 'gold' }]); };
    UI.modal(`${icon('star', 26)} Épreuve du jour`, `<div class="daily-box">
      <p class="intro">Aujourd’hui (${date}), tout le monde joue <b>exactement la même partie</b> : mêmes héros, mêmes portes, mêmes salles.<br>
      ${DAILY_ROOMS} salles, puis le score est compté. Pas de talents ni de gravures de ta partie principale.</p>
      <div class="dh">${heroes}${chip('skullx', d.level, 'red', 'Difficulté imposée')}${chip('door', DAILY_ROOMS, '', 'Salles')}</div>
      <p>${chip('blade', '10 × ★', '', 'Salle gagnée')} ${chip('crown', '60 × ★', 'gold', 'Boss battu')} ${chip('star', '+10', 'goalc', 'Défi réussi')} ${chip('heart', '+5', 'green', 'Salle sans perdre de %')}</p>
      <p>${chip('star', td != null ? td : '—', 'gold', 'Ton record du jour')} record du jour · ${chip('crown', rec.best || 0, 'gold', 'Ton meilleur score')} record absolu · ${chip('door', rec.played || 0, '', 'Épreuves finies')} finies</p>
      ${going ? `<p class="hint">Épreuve en cours : salle ${cur.depth + 1}/${DAILY_ROOMS}, ${cur.daily.pts} points.</p>` : ''}</div>`,
      [{ label: 'Retour', cls: 'ghost' },
       going ? { label: 'Continuer', fn: () => { S = cur; if (S.pending) { startCombat(S.pending); UI.show('scr-combat'); UI.refreshCombat(); } else UI.showChoice(); } } : null,
       { label: going ? 'Recommencer' : (td != null ? 'Rejouer' : 'Commencer'), cls: going ? 'danger' : '', fn: start }].filter(Boolean), { wide: true });
  },
  showDailyEnd(rec, notes) {
    const pts = S.daily.pts, date = S.daily.date;
    (notes || []).filter(n => n.c === 'gold' && /Haut fait/.test(n.t)).forEach((n, i) => setTimeout(() => UI.toast(n.t, 'gold', 3600), i * 300));
    S = null;
    UI.modal(`${icon('crown', 26)} Épreuve terminée`, `<div class="daily-box"><div class="daily-score">${pts}</div><p>points</p>
      <p>${chip('star', rec.days[date], 'gold', 'Record du jour')} record du jour · ${chip('crown', rec.best, 'gold', 'Record absolu')} record absolu</p>
      <p class="hint">Reviens demain pour une nouvelle épreuve, ou rejoue celle-ci pour battre ton score.</p></div>`,
      [{ label: 'Écran titre', fn: () => UI.showTitle() }], { wide: true });
  },
  /* ---------- Hauts faits ---------- */
  showFeats() {
    const L = lifeStats(), done = featsDone();
    const n = FEATS.filter(f => done[f.id]).length;
    const rows = FEATS.map(f => {
      const v = Math.min(f.goal, featValue(L, f)), ok = !!done[f.id];
      return `<div class="feat ${ok ? 'ok' : ''}" title="${esc(tr(f.desc) + (ok ? ' ' + tr('Obtenu le') + ' ' + done[f.id] + '.' : ''))}"><span class="fi">${icon(ok ? 'crown' : 'star', 26)}</span><span style="flex:1"><b>${f.name}</b><small>${esc(f.desc)}</small>${ok ? '' : `<div class="fbar"><i style="width:${v / f.goal * 100}%"></i></div><small>${v} / ${f.goal}</small>`}</span></div>`;
    }).join('');
    const rec = dailyRecords();
    const life = [['door', L.maxDepth || 0, 'Salle la plus profonde'], ['door', L.rooms || 0, 'Salles jouées'], ['crown', L.bosses || 0, 'Boss battus'], ['skullx', L.kills || 0, 'Ennemis tués'], ['pit', L.falls || 0, 'Ennemis tombés'], ['heart', L.perfect || 0, 'Salles sans perte'], ['star', L.goals || 0, 'Défis réussis'], ['skullx', unlockedLevel(), 'Difficulté max débloquée'], ['star', rec.best || 0, 'Record de l’Épreuve du jour']]
      .map(([ic, v, t]) => `<div title="${esc(t)}">${icon(ic, 20)}<b>${v}</b><small>${t}</small></div>`).join('');
    UI.modal(`${icon('crown', 26)} Hauts faits <small>${n}/${FEATS.length}</small>`, `<div class="life">${life}</div><p class="intro">Des objectifs pour toute ta vie de joueur (gardés d’une partie à l’autre). Ils ne donnent aucun pouvoir : juste la gloire.</p><div class="feats">${rows}</div>`,
      [{ label: 'Fermer', cls: 'ghost' }], { huge: true });
  },

  /* ---------- difficulté (1 à l'infini) ---------- */
  levelHtml(L, locked) {
    const f = levelFx(L), max = unlockedLevel();
    if (locked) {
      const left = 10 - (S.depth % 10);
      return `<div class="lvl locked" title="On ne peut changer la difficulté que toutes les 10 salles">
        <div class="lvl-n">${icon('skullx', 20)}<b class="lvl-v">${L}</b></div>
        ${S.daily ? chip('star', 'imposée', '', 'Épreuve du jour : difficulté imposée') : chip('hourglass', left, '', `Changement possible dans ${left} salle${left > 1 ? 's' : ''}`)}
        <div class="lvl-fx">${chip('heart', '×' + f.hp.toFixed(1), 'red', 'PV des ennemis')}${chip('blade', '×' + f.dmg.toFixed(2), 'red', 'Dégâts des ennemis')}${chip('gold', '×' + f.gold, 'gold', 'Or gagné sur les boss')}</div></div>`;
    }
    return `<div class="lvl">
      <button class="btn ghost lvl-b" data-d="-1" title="Plus facile" ${L <= 1 ? 'disabled' : ''}>${icon('minus', 18)}</button>
      <div class="lvl-n" title="Niveau de difficulté">${icon('skullx', 20)}<input type="number" min="1" max="${max}" step="1" value="${L}" class="lvl-in"></div>
      <button class="btn ghost lvl-b" data-d="1" title="${L >= max ? `Niveau ${L + 1} : bats un boss au niveau ${L} pour le débloquer` : 'Plus difficile'}" ${L >= max ? 'disabled' : ''}>${icon('plus', 18)}</button>
      ${L >= max ? chip('crown', 'niv. ' + (L + 1), 'off', `Bats un boss au niveau ${L} pour débloquer le niveau ${L + 1}`) : ''}
      <div class="lvl-fx">${chip('heart', '×' + f.hp.toFixed(1), 'red', 'PV des ennemis')}${chip('blade', '×' + f.dmg.toFixed(2), 'red', 'Dégâts des ennemis')}${f.extra ? chip('plus', f.extra, 'red', 'Ennemis en plus par salle') : ''}${chip('gold', '×' + f.gold, 'gold', 'Or gagné sur les boss')}</div>
    </div>`;
  },
  bindLevel(root, get, set) {
    const apply = v => { v = Math.max(1, Math.min(unlockedLevel(), Math.round(+v || 1))); set(v); };
    root.querySelectorAll('.lvl-b').forEach(b => b.onclick = () => { Sfx.click(); apply(get() + +b.dataset.d); });
    const inp = root.querySelector('.lvl-in'); if (inp) inp.onchange = () => apply(inp.value);
  },

  /* ---------- choix des héros ---------- */
  pickSel: [],
  showPick() {
    UI.pickSel = [];
    try { UI.pickLevel = Math.max(1, Math.min(unlockedLevel(), parseInt(localStorage.getItem('binome_level')) || 1)); } catch (e) { }
    const box = $('#pick-list');
    box.innerHTML = Object.keys(HEROES).map(k => {
      const H = HEROES[k], B = SKILLS[H.basic];
      return `<button class="pick-card" data-k="${k}" style="--c:${H.color}">
        <div class="pick-token"><img src="${Render.portrait(k)}" alt=""></div>
        <b>${H.name}</b>
        <div class="pick-chips">${chip(B.icon, B.dmg, '', B.name)}${chip(B.type === 'line' && B.range > 1 ? 'arrow' : B.type === 'point' ? 'target' : 'fist', B.range, '', 'Portée')}${chip('foot', H.move, 'blue', 'Déplacement')}</div>
        <p>${H.desc}</p>
      </button>`;
    }).join('');
    box.querySelectorAll('.pick-card').forEach(b => b.onclick = () => {
      Sfx.click();
      const k = b.dataset.k, i = UI.pickSel.indexOf(k);
      showDemo(k);
      if (i >= 0) UI.pickSel.splice(i, 1); else { UI.pickSel.push(k); if (UI.pickSel.length > NB_HEROES) UI.pickSel.shift(); }
      box.querySelectorAll('.pick-card').forEach(x => { const j = UI.pickSel.indexOf(x.dataset.k); x.classList.toggle('sel', j >= 0); x.dataset.n = j >= 0 ? j + 1 : ''; });
      $('#btn-start').disabled = UI.pickSel.length !== NB_HEROES;
    });
    const showDemo = k => {
      const H = HEROES[k], B = SKILLS[H.basic];
      $('#pick-info').innerHTML = `<h3 style="color:${H.color}">${H.name} <small>${H.title}</small></h3><p>${chip(B.icon, B.name)} ${esc(B.desc)}</p><ul>${(H.tips || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
      $('#pick-demo').style.setProperty('--c', H.color);
      Codex.playHero($('#pick-canvas'), k);
    };
    box.querySelectorAll('.pick-card').forEach(b => b.addEventListener('mouseenter', () => showDemo(b.dataset.k)));
    showDemo(Object.keys(HEROES)[0]);
    const lv = $('#pick-level');
    const draw = () => { lv.innerHTML = UI.levelHtml(UI.pickLevel); UI.bindLevel(lv, () => UI.pickLevel, v => { UI.pickLevel = v; draw(); }); };
    draw();
    $('#btn-start').disabled = true;
    UI.show('scr-pick');
  },

  /* ---------- écran de choix de salle ---------- */
  showChoice(notes) {
    const era = eraData(S.depth);
    document.documentElement.style.setProperty('--accent', era.accent);
    document.documentElement.style.setProperty('--era-bg', era.bg);
    $('#ch-depth').innerHTML = S.daily ? `Épreuve · salle <span class="num">${S.depth + 1}/${DAILY_ROOMS}</span>` : `Salle <span class="num">${S.depth + 1}</span>`;
    $('#ch-era').textContent = S.daily ? `${S.daily.pts} points · ${era.name}` : era.name;
    $('#ch-era').title = era.desc;
    $('#ch-gold').innerHTML = `${icon('gold', 22)} ${S.money}`;
    $('#ch-level').innerHTML = `${icon('cog', 20)} Paramètres <span class="ch red">${icon('skullx', 15)}<b>${lvl()}</b></span>`;
    $('#ch-notes').innerHTML = '';
    (notes || []).forEach((n, i) => setTimeout(() => UI.toast(n.t, n.c === 'bad' ? 'bad' : n.c === 'gold' ? 'gold' : n.c === 'dim' ? 'dim' : 'good', 3600), i * 300));
    $('#ch-heroes').innerHTML = S.heroes.map((h, hi) => heroSummary(h, hi)).join('');
    const eff = [];
    for (const r of S.rules) eff.push(`<span class="ch rule" title="${esc(RULES[r.key].desc)}">${icon('rule', 16)}<b>${RULES[r.key].name}</b><i>${r.perm ? '∞' : r.dur}</i></span>`);
    for (const p of S.pacts) eff.push(`<span class="ch pact" title="+ ${esc(PACTS[p.key].bonus(p.v))} / − ${esc(PACTS[p.key].malus)}">${icon('pact', 16)}<b>${PACTS[p.key].name}</b><i>${p.dur}</i></span>`);
    $('#ch-effects').innerHTML = eff.join('');
    $('#ch-effects').style.display = eff.length ? '' : 'none';
    const doors = $('#ch-doors');
    doors.innerHTML = S.choices.map((c, i) => doorHtml(c, i)).join('');
    doors.querySelectorAll('.door').forEach(d => d.onclick = () => { Sfx.door(); UI.enterRoom(+d.dataset.i); });
    const bc = bossChance();
    $('#ch-bosschance').innerHTML = S.depth < 4 ? '' : `${icon('crown', 16)} ${Math.round(bc * 100)} %`;
    Music.play('explore');
    UI.show('scr-choice');
  },
  enterRoom(i) {
    const card = S.choices[i]; if (!card) return;
    startCombat(card);
    UI.lastHtml = {};
    UI.show('scr-combat');
    UI.refreshCombat(true);
    Music.play(card.boss ? 'boss' : 'combat');
    if (card.boss) UI.toast(`${tr(BOSSES[card.boss].name)} — ${tr('ne tombe pas à 40 % !')}`, 'bad', 3000);
    else if (C.kind !== 'normal') UI.toast(`${tr(ROOM_KINDS[C.kind].name)} : ${tr(ROOM_KINDS[C.kind].tip)}`, '', 3000);
  },

  /* ---------- combat ---------- */
  refreshCombat() {
    if (!C) return;
    const era = eraData(S.depth);
    document.documentElement.style.setProperty('--accent', era.accent);
    const card = C.card;
    const parts = [`<span class="stars">${'★'.repeat(card.diff)}</span>`];
    if (card.boss) parts.push(chip('gold', bossMoney(card), 'gold', 'Or si tu gagnes'));
    else {
      parts.push(roomStatusChip());
      parts.push(chip(REWARD_ICON[card.reward.type], rewardShortTitle(card.reward), '', rewardTitle(card.reward) + ' — ' + rewardDesc(card.reward)));
    }
    if (C.goal) {
      const st = goalStatus();
      parts.push(`<span class="ch goal ${st}" title="${esc(goalText(C.goal, C.goalN))} Réussi : +${GOAL_HEAL} %">${icon(st === 'ok' ? 'check' : st === 'fail' ? 'cross' : 'star', 16)}<b>${GOALS[C.goal].name}${C.goal === 'rapide' ? ` ${Math.min(C.turn, C.goalN)}/${C.goalN}` : ''}</b></span>`);
    }
    if (card.trait) parts.push(chip(TRAITS[card.trait].bad ? 'taunt' : 'star', TRAITS[card.trait].name, TRAITS[card.trait].bad ? 'red' : 'green', TRAITS[card.trait].desc));
    if (C.boost) parts.push(chip('bolt', C.boost.label, 'gold', 'Bonus de salle'));
    if (C.loot) parts.push(chip('gold', '+' + C.loot, 'gold', 'Or ramassé dans cette salle'));
    UI.setHtml($('#cb-top-mid'), parts.join(''));
    // barre du boss
    const bb = $('#boss-bar');
    const bosses = C.units.filter(u => u.boss && !u.dead);
    if (C.boss && bosses.length) {
      const B = BOSSES[bosses[0].kind];
      const hp = bosses.reduce((a, u) => a + Math.max(0, u.hp), 0), mx = bosses.reduce((a, u) => a + u.maxHp, 0);
      const ph = Math.max(...bosses.map(u => u.phase || 0));
      const marks = (B.phases || []).map(p => `<em style="left:${p.at * 100}%"></em>`).join('');
      const phName = ph > 0 && B.phases && B.phases[ph - 1] ? B.phases[ph - 1].name : '';
      const bm = (bosses[0].mods || []).map(m => chip(MODS[m].icon, MODS[m].name, 'mod', tr('Mutation') + ' : ' + tr(MODS[m].tip) + '. ' + tr(MODS[m].desc))).join('');
      UI.setHtml(bb, `<b>${icon('crown', 18)} ${B.name}</b>${bm}${phName ? `<span class="bb-ph">Phase ${ph + 1} : ${phName}</span>` : ''}<div class="bb-bar"><i style="width:${hp / mx * 100}%"></i>${marks}</div><span class="bb-hp">${Math.ceil(hp)}</span>`);
      bb.classList.add('on');
    } else bb.classList.remove('on');
    if (C.phase === 'hero' && !C.busy && !C.ended && (!C.preview || C.preview.ver !== C.ver) && !UI.pvPending) {
      UI.pvPending = true;
      // tâche à part : la simulation ne doit jamais se mêler à une animation en cours
      setTimeout(() => { computePreview().then(() => { UI.pvPending = false; UI.refreshCombat(); }, () => { UI.pvPending = false; }); }, 0);
    }
    UI.setHtml($('#cb-depth'), `<span class="cbd-room" title="Numéro de la salle">${icon('door', 16)}<b>${S.daily ? `${S.depth + 1}/${DAILY_ROOMS}` : S.depth + 1}</b></span><span class="cbd-turn" title="Tour en cours">${icon('hourglass', 15)}<b>Tour ${C.turn}</b></span>`);
    for (let hi = 0; hi < NB_HEROES; hi++) UI.setHtml($(`#hp-${hi}`), S.heroes[hi] ? heroPanel(hi) : '');
    const myTurn = C.phase === 'hero' && !C.busy && !C.ended;
    const btn = $('#btn-end');
    btn.disabled = !myTurn;
    btn.classList.toggle('pulse', myTurn && heroUnits().every(u => u.actions <= 0 && !u.hasMove));
    UI.setHtml(btn, C.phase === 'enemy' ? 'Tour ennemi…' : `Fin du tour <kbd>Espace</kbd>`);
    $('#btn-undo').disabled = !(myTurn && UNDO);
    $('#btn-danger').classList.toggle('on', !!C.danger);
    $('#btn-preview').classList.toggle('on2', !!C.showPreview);
    const pv = C.preview && C.preview.ver === C.ver ? C.preview : null;
    let warn = '';
    if (myTurn && pv) {
      if (pv.fail) warn = `${icon('crown', 18)} Le boss s’enfuirait !`;
      else if (pv.win) warn = `${icon('check', 18)} Victoire au tour ennemi`;
    }
    const w = $('#cb-warn'); UI.setHtml(w, warn); w.classList.toggle('on', !!warn); w.classList.toggle('good', !!(pv && pv.win && !pv.fail));
    UI.setHtml($('#btn-flee'), `${icon('run', 18)}<span>${C.boss ? 'Abandonner' : 'Fuir'}</span>`);
    UI.updateInfo();
  },
  updateInfo() {
    if (!C) return;
    if (UI.tipEl) return;   // une info-bulle d'interface est affichée
    if ($('#modal').classList.contains('on')) { UI.placeTip('', null); return; }
    UI.setHtml($('#cb-info'), C.phase === 'enemy' ? `<div class="inf-h">${icon('skullx', 20)} Tour ennemi…</div>`
      : `<div class="inf-keys"><span><kbd>1</kbd>-<kbd>4</kbd> attaque</span><span><kbd>Tab</kbd> héros</span><span><kbd>Z</kbd> annuler</span><span><kbd>Espace</kbd> fin</span><span>${icon('arrow', 15)} = tour ennemi prévu</span><span>survol = détails</span></div>`);
    let html = '', pos = null;
    const hv = UI.hoverSkill;
    if (hv && UI.hoverEl && UI.hoverEl.isConnected) {
      html = skillInfo(hv.hi, hv.slot);
      const r = UI.hoverEl.getBoundingClientRect(); pos = { x1: r.left, x2: r.right, y: r.top + r.height / 2 };
    } else if (C.hover) {
      html = tileInfo(C.hover[0], C.hover[1]);
      if (html) { const [cx, cy] = Render.tileCenterPx(C.hover[0], C.hover[1]); const h = Render.ts / 2; pos = { x1: cx - h, x2: cx + h, y: cy }; }
    }
    UI.placeTip(html, pos);
  },
  /* n'importe quel élément avec une description : on remplace l'info-bulle du navigateur par la nôtre */
  genericTip(el) {
    if (el.hasAttribute('title')) { el.dataset.tip = el.getAttribute('title'); el.removeAttribute('title'); }
    if (!el.dataset.tip) return;
    UI.tipEl = el;
    const r = el.getBoundingClientRect();
    UI.placeTip(`<div class="tip-t">${esc(el.dataset.tip)}</div>`, { x1: r.left, x2: r.right, y: r.top + r.height / 2 });
  },
  placeTip(html, pos) {
    const tip = $('#tip'); if (!tip) return;
    if (!html || !pos) { tip.classList.remove('on'); return; }
    UI.setHtml(tip, html); tip.classList.add('on');
    const w = tip.offsetWidth, h = tip.offsetHeight, vw = innerWidth, vh = innerHeight;
    let x = pos.x2 + 12;
    if (x + w > vw - 8) x = pos.x1 - 12 - w;
    if (x < 8) x = Math.max(8, Math.min(vw - w - 8, pos.x1));
    const y = Math.max(8, Math.min(vh - h - 8, pos.y - h / 2));
    tip.style.left = Math.round(x) + 'px'; tip.style.top = Math.round(y) + 'px';
  },
  selectSkill(hi, slot) {
    if (!C || C.busy || C.phase !== 'hero') return;
    const hu = heroUnit(hi); if (!hu) return;
    const inst = S.heroes[hi].slots[slot];
    C.sel = hi;
    if (!inst) { C.mode = null; UI.refreshCombat(); return; }
    if (C.mode === 'skill' && C.slot === slot) {
      const s = skillStats(hi, slot), tg = skillTargets(hu, s);
      const t = s.type === 'self' ? [hu.x, hu.y] : (tg.length === 1 ? tg[0] : null);
      if (t && hu.actions > 0) { useSkill(hu, slot, t[0], t[1]).then(() => UI.afterAction()); return; }
      C.mode = null; C.slot = -1; UI.refreshCombat(); return;
    }
    if (hu.actions <= 0) { UI.toast('Plus d’action', 'bad', 1200); C.mode = null; UI.refreshCombat(); return; }
    if ((inst.cdLeft || 0) > 0) { UI.toast(`Recharge : ${inst.cdLeft}`, 'bad', 1200); UI.refreshCombat(); return; }
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
    if (hu && hu.actions <= 0 && !hu.hasMove) { const o = heroUnits().find(u => u.hero !== C.sel && (u.actions > 0 || u.hasMove)); if (o) C.sel = o.hero; }
    UI.refreshCombat();
    UI.checkAutoEnd();
  },
  /* plus personne ne peut bouger ni toucher un ennemi : on passe au tour ennemi */
  checkAutoEnd() {
    if (!UI.autoEnd || !C || C.phase !== 'hero' || C.busy || C.ended) return;
    if (heroUnits().some(heroCanAct)) return;
    const c0 = C, v0 = C.ver;
    setTimeout(() => { if (C === c0 && C.ver === v0 && C.phase === 'hero' && !C.busy && !C.ended && !heroUnits().some(heroCanAct)) { UI.toast('Fin du tour automatique', '', 1000); enemyPhase(); } }, 450);
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
    if (typeof Codex !== 'undefined') Codex.stop();
    UI.placeTip('', null);
    m.innerHTML = `<div class="modal-box ${opts && opts.wide ? 'wide' : ''} ${opts && opts.huge ? 'huge' : ''}"><h2>${title}</h2><div class="modal-body">${body}</div><div class="modal-btns">${(buttons || []).map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}</div></div>`;
    m.classList.add('on');
    m.querySelectorAll('.modal-btns .btn').forEach(b => b.onclick = () => { const bt = buttons[+b.dataset.i]; if (!bt.keep) UI.closeModal(); if (bt.fn) bt.fn(); });
    return m;
  },
  closeModal() { if (typeof Codex !== 'undefined') Codex.stop(); const m = $('#modal'); m.classList.remove('on'); m.innerHTML = ''; },
  choose(title, intro, options, onPick, cancel) {
    const body = `${intro ? `<p class="intro">${intro}</p>` : ''}<div class="opt-list">${options.map((o, i) => `<button class="opt ${o.cls || ''}" data-i="${i}" ${o.disabled ? 'disabled' : ''}>${i < 9 ? `<span class="num">${i + 1}</span>` : ''}${o.html}</button>`).join('')}</div>`;
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
    const skillOpt = (o, extra) => ({ hi: o.hi, si: o.si, html: `<span class="opt-ico" style="color:${HEROES[S.heroes[o.hi].key].color}">${icon(SKILLS[o.s.key].icon, 26)}</span><span><b>${SKILLS[o.s.key].name}</b> ${chip(null, HEROES[S.heroes[o.hi].key].name)}${o.s.perm ? chip('star', '∞', 'gold') : chip('hourglass', o.s.dur)}${extra ? `<br><small>${esc(extra)}</small>` : ''}</span>` });
    const placeSkill = (hi, key, dur, mods, after) => {
      const h = S.heroes[hi];
      const empty = h.slots.findIndex((s, i) => i > 0 && !s);
      if (empty > 0) { h.slots[empty] = { key, perm: false, dur, mods: mods || [] }; after(true); return; }
      const opts = h.slots.map((s, si) => ({ s, si, hi })).filter(o => o.si > 0).map(o => skillOpt(o, 'Remplacer'));
      UI.choose(`Plus de place`, `Remplacer par <b>${SKILLS[key].name}</b> ?`, opts,
        o => { h.slots[o.si] = { key, perm: false, dur, mods: mods || [] }; after(true); },
        { label: 'Refuser', fn: () => after(false) });
    };
    switch (rw.type) {
      case 'skill': {
        const dur = DUR.skill * v;
        placeSkill(rw.hero, rw.key, dur, [], ok => fin(ok ? `${HEROES[S.heroes[rw.hero].key].name} : + ${SKILLS[rw.key].name} (${dur} salles)` : 'Compétence refusée', ok ? 'good' : 'dim'));
        return;
      }
      case 'upgrade': {
        const U = UPGRADES[rw.key];
        const el = allSkills((s, hi, si) => U.ok(skillStats(hi, si)));
        if (!el.length) { for (const h of S.heroes) h.pct = Math.min(maxPct(), h.pct + 10 * v); return fin(`+${10 * v} % à tous les héros`); }
        UI.choose(`${icon('up', 22)} ${U.name}`, `<b>${U.desc(v)}</b> · ${DUR.upgrade} salles`, el.map(o => skillOpt(o)),
          o => { S.heroes[o.hi].slots[o.si].mods.push({ key: rw.key, v, dur: DUR.upgrade, perm: false }); fin(`${U.name} sur ${SKILLS[S.heroes[o.hi].slots[o.si].key].name}`); },
          { label: 'Refuser', fn: () => fin('Amélioration refusée', 'dim') });
        return;
      }
      case 'rule': addRule(rw.key, DUR.rule * v); return fin(`Règle : ${RULES[rw.key].name} (${DUR.rule * v} salles)`);
      case 'pact': addPact(rw.key, v); return fin(`Pacte : ${PACTS[rw.key].name} (${DUR.pact} salles)`);
      case 'rest': for (const h of S.heroes) h.pct = Math.min(maxPct(), h.pct + 15 * v); return fin(`Repos : +${15 * v} %`);
      case 'prolong': prolongAll(3 * v); return fin(`Sablier : +${3 * v} salles à tout`);
      case 'mutation': {
        const el = allSkills((s, hi, si) => si > 0);
        if (!el.length) { for (const h of S.heroes) h.pct = Math.min(maxPct(), h.pct + 10 * v); return fin(`+${10 * v} % à tous les héros`); }
        UI.choose(`${icon('mutate', 22)} Mutation`, 'Quelle compétence transformer ?', el.map(o => skillOpt(o)), o => {
          const inst = S.heroes[o.hi].slots[o.si];
          const owned = new Set(S.heroes[o.hi].slots.filter(Boolean).map(s => s.key));
          const pool = shuffle(rnd, SKILL_POOL.filter(k => !owned.has(k)));
          const old = SKILLS[inst.key].name;
          if (v > 1) {
            UI.choose(`${icon('mutate', 22)} ${old} devient…`, '', pool.slice(0, 3).map(k => ({ k, html: `<span class="opt-ico">${icon(SKILLS[k].icon, 26)}</span><span><b>${SKILLS[k].name}</b><br><small>${esc(SKILLS[k].desc)}</small></span>` })),
              p => { inst.key = p.k; fin(`${old} → ${SKILLS[p.k].name}`); });
          } else { inst.key = pool[0]; fin(`${old} → ${SKILLS[pool[0]].name}`); }
        }, { label: 'Refuser', fn: () => fin('Mutation refusée', 'dim') });
        return;
      }
      case 'transfert': {
        const el = allSkills((s, hi, si) => si > 0 && S.heroes.some((h2, j) => j !== hi && !h2.slots.some(x => x && x.key === s.key)));
        if (!el.length) { for (const h of S.heroes) h.pct = Math.min(maxPct(), h.pct + 10 * v); return fin(`+${10 * v} % à tous les héros`); }
        UI.choose(`${icon('transfer', 22)} Transfert`, 'Donner quelle compétence à un autre héros ?', el.map(o => skillOpt(o)), o => {
          const inst = S.heroes[o.hi].slots[o.si];
          const targets = S.heroes.map((h2, j) => j).filter(j => j !== o.hi && !S.heroes[j].slots.some(x => x && x.key === inst.key));
          const go = to => {
          const h2 = S.heroes[to];
          const doMove = (slot) => { S.heroes[o.hi].slots[o.si] = null; if (v > 1 && !inst.perm) inst.dur += 3; h2.slots[slot] = inst; fin(`${SKILLS[inst.key].name} → ${HEROES[h2.key].name}`); };
          const empty = h2.slots.findIndex((s, i) => i > 0 && !s);
          if (empty > 0) return doMove(empty);
          UI.choose('Plus de place', 'Remplacer quelle compétence ?', h2.slots.map((s, si) => ({ s, si, hi: to })).filter(x => x.si > 0).map(x => skillOpt(x, 'Remplacer')),
            x => doMove(x.si), { label: 'Annuler', fn: () => fin('Transfert annulé', 'dim') });
          };
          if (targets.length === 1) return go(targets[0]);
          UI.choose('À qui ?', '', targets.map(j => ({ j, html: `<span class="opt-ico" style="color:${HEROES[S.heroes[j].key].color}">${icon('star', 24)}</span><b>${HEROES[S.heroes[j].key].name}</b>` })), t => go(t.j), { label: 'Annuler', fn: () => fin('Transfert annulé', 'dim') });
        }, { label: 'Refuser', fn: () => fin('Transfert refusé', 'dim') });
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
      if (!s.perm) rows.push({ kind: 'skill', html: `<span class="opt-ico" style="color:${col}">${icon(SKILLS[s.key].icon, 24)}</span><span><b>${SKILLS[s.key].name}</b> ${chip(null, hn)}${chip('hourglass', s.dur)}</span>`, fn: () => { s.perm = true; } });
      s.mods.forEach(m => {
        if (m.perm) return;
        rows.push({ kind: 'upgrade', html: `<span class="opt-ico" style="color:${col}">${icon('up', 24)}</span><span><b>${UPGRADES[m.key].name}</b> ${chip(SKILLS[s.key].icon, SKILLS[s.key].name)}${chip('hourglass', m.dur)}${s.perm ? '' : chip('taunt', 'compétence temporaire', 'red')}</span>`, fn: () => { m.perm = true; } });
      });
    }));
    for (const r of S.rules) if (!r.perm) rows.push({ kind: 'rule', html: `<span class="opt-ico">${icon('rule', 24)}</span><span><b>${RULES[r.key].name}</b> ${chip('hourglass', r.dur)}<br><small>${esc(RULES[r.key].desc)}</small></span>`, fn: () => { r.perm = true; } });
    const engr = rows.length ? rows.map((r, i) => { const c = engraveCost(r.kind); return `<div class="at-row">${r.html}<button class="btn gold" data-e="${i}" ${S.money < c ? 'disabled' : ''}>${icon('anvil', 18)} ${c}</button></div>`; }).join('')
      : `<div class="empty">${icon('hourglass', 18)} Rien à graver.</div>`;
    const tal = Object.keys(TALENTS).map(k => {
      const T = TALENTS[k], lv = S.talents[k] || 0, c = talentCost(k);
      return `<div class="at-row"><span class="opt-ico">${icon('star', 24)}</span><span><b>${T.name}</b> ${chip(null, 'niv. ' + lv, lv ? 'gold' : '')}<br><small>${esc(T.desc)}</small></span><button class="btn gold" data-t="${k}" ${S.money < c ? 'disabled' : ''}>${icon('gold', 18)} ${c}</button></div>`;
    }).join('');
    const body = `<div class="at-gold">${icon('gold', 30)} <b>${S.money}</b></div>
      <h3>${icon('anvil', 20)} Graver <small>= garder pour toujours</small></h3><div class="at-list">${engr}</div>
      <h3>${icon('star', 20)} Talents définitifs</h3><div class="at-list">${tal}</div>`;
    const m = UI.modal(`${icon('anvil', 28)} Atelier`, body, [{ label: 'Fermer', cls: 'ghost', fn: () => UI.showChoice() }], { wide: true });
    m.querySelectorAll('[data-e]').forEach(b => b.onclick = () => {
      const r = rows[+b.dataset.e], c = engraveCost(r.kind); if (S.money < c) return;
      S.money -= c; S.engraved[r.kind]++; r.fn(); Sfx.gold(); addLog('Gravure effectuée.'); save(); UI.showAtelier();
      for (const f of lifeAdd({ engraved: 1 })) UI.toast(`${tr('Haut fait')} : ${tr(f.name)} — ${tr(f.desc)}`, 'gold', 3600);
    });
    m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
      const k = b.dataset.t, c = talentCost(k); if (S.money < c) return;
      S.money -= c; S.talents[k] = (S.talents[k] || 0) + 1; Sfx.gold(); addLog(`Talent ${TALENTS[k].name} niveau ${S.talents[k]}.`); save(); UI.showAtelier();
    });
  },

  /* ---------- Codex ---------- */
  showCodex(tab) { Codex.open(tab); },

  /* ---------- paramètres (difficulté, son, vitesse) ---------- */
  showSettings() {
    const can = canChangeLevel();
    const body = `<h3>${icon('skullx', 20)} Difficulté</h3>
      <div id="set-level">${UI.levelHtml(lvl(), !can)}</div>
      <p class="hint">${S.daily ? 'Épreuve du jour : la difficulté est la même pour tout le monde.' : can ? 'Tu peux changer la difficulté maintenant (toutes les 10 salles).' : `Changement possible dans ${10 - (S.depth % 10)} salle(s) : la difficulté ne se change que toutes les 10 salles.`}
        Niveau maximum débloqué : <b>${unlockedLevel()}</b> (bats un boss au niveau ${unlockedLevel()} pour débloquer le suivant).</p>
      <h3>${icon('sound', 20)} Son</h3>
      <div class="menu-opts">
        <label class="slider" title="Volume de la musique">${icon('music', 20)}<span>Musique</span><input type="range" min="0" max="1" step="0.05" value="${Music.volume}" id="s-mvol"></label>
        <label class="slider" title="Volume des effets sonores">${icon('sound', 20)}<span>Effets</span><input type="range" min="0" max="1" step="0.05" value="${Sfx.volume}" id="s-svol"></label>
        <button class="btn ghost" id="s-mute" title="Couper ou remettre tout le son (M)">${icon(Sfx.muted ? 'mute' : 'sound', 20)} ${Sfx.muted ? 'Son coupé' : 'Son activé'}</button>
      </div>
      <h3>${icon('rule', 20)} Langue</h3>${UI.langHtml()}
      ${window.triadeNative || document.fullscreenEnabled ? `<h3>${icon('eye', 20)} Affichage</h3><div class="menu-opts"><button class="btn ghost" id="s-full">${icon('eye', 20)} Plein écran : ${UI.isFull() ? 'oui' : 'non'} <kbd>F11</kbd></button></div>` : ''}
      <h3>${icon('dash', 20)} Jeu</h3>
      <div class="menu-opts">
        <button class="btn ghost" id="s-speed" title="Vitesse des animations (V)">${icon('dash', 20)} Animations : ${ANIM >= 1 ? 'normales' : ANIM >= 0.5 ? 'rapides' : 'éclair'}</button>
        <button class="btn ghost" id="s-auto" title="Finir le tour tout seul quand plus aucun héros ne peut agir">${icon('hourglass', 20)} Fin de tour automatique : ${UI.autoEnd ? 'oui' : 'non'}</button>
      </div>`;
    const m = UI.modal(`${icon('cog', 24)} Paramètres`, body, [{ label: 'Fermer', cls: 'ghost', fn: () => UI.showChoice() }], { wide: true });
    if (can) UI.bindLevel(m.querySelector('#set-level'), () => lvl(), v => { S.level = v; try { localStorage.setItem('binome_level', String(v)); } catch (e) { } save(); UI.showSettings(); });
    $('#s-mvol').oninput = e => Music.setVolume(+e.target.value);
    $('#s-svol').oninput = e => Sfx.setVolume(+e.target.value);
    $('#s-svol').onchange = () => Sfx.select();
    $('#s-mute').onclick = () => { Sfx.setMuted(!Sfx.muted); UI.showSettings(); };
    $('#s-speed').onclick = () => { UI.cycleSpeed(); UI.showSettings(); };
    UI.bindLang();
    if ($('#s-full')) $('#s-full').onclick = () => { UI.toggleFull(); setTimeout(() => UI.showSettings(), 400); };
    $('#s-auto').onclick = () => { UI.autoEnd = !UI.autoEnd; try { localStorage.setItem('binome_auto', UI.autoEnd ? '1' : '0'); } catch (e) { } UI.showSettings(); };
  },

  /* ---------- menu & aide ---------- */
  showMenu() {
    const inCombat = !!C;
    const st = S ? `<div class="stats"><div>${icon('door', 20)}<b>${S.depth}</b></div><div>${icon('skullx', 20)}<b>${S.stats.kills}</b></div><div>${icon('crown', 20)}<b>${S.bossesKilled}</b></div><div>${icon('gold', 20)}<b>${S.stats.moneyTotal}</b></div><div>${icon('star', 20)}<b>${S.stats.perfect || 0}</b></div></div>` : '';
    UI.modal(`${icon('menu', 24)} Menu`, `${st}
      <div class="menu-opts">
        <label class="slider">${icon('music', 20)}<span>Musique</span><input type="range" min="0" max="1" step="0.05" value="${Music.volume}" id="m-mvol"></label>
        <label class="slider">${icon('sound', 20)}<span>Effets</span><input type="range" min="0" max="1" step="0.05" value="${Sfx.volume}" id="m-svol"></label>
        <button class="btn ghost" id="m-sound">${icon(Sfx.muted ? 'mute' : 'sound', 20)} ${Sfx.muted ? 'Son coupé' : 'Son activé'} <kbd>M</kbd></button>
        <button class="btn ghost" id="m-speed">${icon('dash', 20)} Animations : ${ANIM >= 1 ? 'normales' : ANIM >= 0.5 ? 'rapides' : 'éclair'} <kbd>V</kbd></button>
        <button class="btn ghost" id="m-auto">${icon('hourglass', 20)} Fin de tour automatique : ${UI.autoEnd ? 'oui' : 'non'}</button>
        <button class="btn ghost" id="m-codex">${icon('rule', 20)} Codex <kbd>K</kbd></button>
        <button class="btn ghost" id="m-help">${icon('help', 20)} Aide <kbd>H</kbd></button>
        <button class="btn ghost" id="m-feats">${icon('crown', 20)} Hauts faits</button>
        <button class="btn ghost" id="m-credits">${icon('music', 20)} Crédits musique</button>
        ${UI.langHtml()}
      </div>`, [
      { label: 'Reprendre', cls: '' },
      { label: 'Écran titre', cls: 'ghost', fn: () => { if (inCombat) { C = null; } UI.showTitle(); } },
      { label: 'Supprimer la partie', cls: 'danger', fn: () => UI.modal('Supprimer la partie ?', '<p>Toute la progression sera perdue.</p>', [{ label: 'Annuler', cls: 'ghost' }, { label: 'Supprimer', cls: 'danger', fn: () => { wipeSave(S && S.daily ? DAILY_KEY : SAVE_KEY); S = null; C = null; UI.showTitle(); } }]) },
    ]);
    $('#m-mvol').oninput = e => Music.setVolume(+e.target.value);
    $('#m-svol').oninput = e => Sfx.setVolume(+e.target.value);
    $('#m-svol').onchange = () => Sfx.select();
    $('#m-sound').onclick = () => { Sfx.setMuted(!Sfx.muted); UI.showMenu(); };
    $('#m-speed').onclick = () => { UI.cycleSpeed(); UI.showMenu(); };
    $('#m-auto').onclick = () => { UI.autoEnd = !UI.autoEnd; try { localStorage.setItem('binome_auto', UI.autoEnd ? '1' : '0'); } catch (e) { } UI.showMenu(); };
    $('#m-codex').onclick = () => UI.showCodex();
    UI.bindLang();
    $('#m-help').onclick = () => UI.showHelp();
    $('#m-feats').onclick = () => UI.showFeats();
    $('#m-credits').onclick = () => UI.modal(`${icon('music', 24)} Crédits musique`, `<p class="intro">Musiques libres de droits (CC0), trouvées sur OpenGameArt.org :</p><ul class="credits">
      <li><b>Dungeon Ambience</b> — yd (exploration)</li>
      <li><b>Heartfelt Battle</b> — request (combat)</li>
      <li><b>Fairy Battles</b> — MintoDog (combat)</li>
      <li><b>Boss Battle #2 [Symphonic Metal]</b> — nene (boss)</li>
      <li><b>Crystal Cave (song18)</b>, <b>Mysterious Ambience (song21)</b>, <b>Battle Theme A</b>, <b>Victory Fanfare Short</b> — cynicmusic / pixelsphere.org</li>
      <li><b>Creepy Forest</b> — Augmentality (Brandon Morris)</li>
      <li><b>Fast fight / battle music</b> — Ville Nousiainen (Xythe)</li>
      <li><b>Medieval: Defeat Theme</b> — RandomMind</li></ul>`, [{ label: 'Fermer', cls: 'ghost' }]);
  },
  isFull() { return window.triadeNative ? window.triadeNative.isFullscreen() : !!document.fullscreenElement; },
  toggleFull() {
    if (window.triadeNative) return window.triadeNative.setFullscreen(!window.triadeNative.isFullscreen());
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => { }); return; }
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => { try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(() => { });
  },
  langHtml() {
    return `<div class="lang-row" title="Langue du jeu"><span>${icon('rule', 18)} Langue / Language</span>${Object.keys(I18N.LANGS).map(l => `<button class="btn ghost small lang-b ${l === I18N.lang ? 'on2' : ''}" data-lang="${l}" translate="no">${I18N.LANGS[l]}</button>`).join('')}</div>`;
  },
  bindLang() { document.querySelectorAll('.lang-b').forEach(b => b.onclick = () => { if (b.dataset.lang !== I18N.lang) { save && S && save(); I18N.set(b.dataset.lang); } }); },
  cycleSpeed() {
    ANIM = ANIM >= 1 ? 0.5 : ANIM >= 0.5 ? 0.2 : 1;
    try { localStorage.setItem('binome_anim', String(ANIM)); } catch (e) { }
    UI.toast(`Animations : ${ANIM >= 1 ? 'normales' : ANIM >= 0.5 ? 'rapides' : 'éclair'}`, '', 1000);
  },
  showHelp() {
    const row = (ic, html) => `<div class="hl">${icon(ic, 26)}<div>${html}</div></div>`;
    UI.modal(`${icon('help', 24)} Comment jouer`, `<div class="help">
      ${row('heart', '<b>Pas de PV : un % de dégâts.</b> Touché = ton % baisse (et tes coups aussi). Jamais sous <b>40 %</b>.')}
      ${row('skullx', '<b>Tuer un ennemi = +5 %</b> pour le tueur.')}
      ${row('foot', 'Chaque héros : <b>1 déplacement</b> (cases bleues) + <b>1 attaque</b>, dans l’ordre voulu.')}
      ${row('arrow', '<b>Prévision :</b> les flèches rouges montrent exactement le tour ennemi à venir.')}
      ${row('hourglass', '<b>Tout est temporaire</b> (en salles). L’<b>or</b> des boss sert à <b>graver</b> pour toujours.')}
      ${row('crown', '<b>Boss</b> = seule source d’or. Si un héros tombe à 40 %, il s’enfuit.')}
      ${row('pit', 'Pousse les ennemis dans les <b>fosses</b>, contre les murs, dans la lave… (attention, toi aussi tu peux tomber !)')}
      ${row('star', '<b>Élites</b> (étoile) : elles ont des <b>pouvoirs</b> (Blindé, Vampire, Explosif…). Les <b>boss mutent</b> à chaque tour complet des boss.')}
      ${row('up', 'Chaque compétence a des <b>dégâts maximum</b> : « 40/16 » = limitée à 16. Le Plafond et les Runes le relèvent.')}
      ${row('door', '<b>Épreuve du jour</b> (écran titre) : la même partie pour tout le monde, un score à battre. Les <b>Hauts faits</b> suivent toute ta vie de joueur.')}
      ${row('rule', 'Tout le reste : <b>Codex</b> <kbd>K</kbd> ou survol d’une case.')}
      <div class="keys">
        <div><kbd>1</kbd>-<kbd>4</kbd> attaque (2× = sur soi)</div><div><kbd>Tab</kbd>/<kbd>Q</kbd> héros</div>
        <div><kbd>Espace</kbd>/<kbd>F</kbd> fin du tour</div><div><kbd>Z</kbd> annuler</div>
        <div><kbd>←↑→↓</kbd> + <kbd>E</kbd> curseur</div><div><kbd>P</kbd> prévision · <kbd>D</kbd> danger</div>
        <div><kbd>V</kbd> vitesse · <kbd>M</kbd> son</div><div>Portes : <kbd>1</kbd>-<kbd>4</kbd> · <kbd>A</kbd> Atelier</div>
      </div>
      <p class="pad-help">${icon('star', 16)} Manette : <b>A</b> valider · <b>B</b> annuler · <b>X</b> fin du tour · <b>Y</b> annuler le déplacement · <b>LB/RB</b> héros · <b>LT/RT</b> compétence · <b>Start</b> menu</p></div>`, [{ label: 'Compris', cls: '' }], { wide: true });
  },
};

/* ---------- fragments HTML ---------- */
function skillKindText(s) {
  switch (s.type) {
    case 'line': return s.range <= 1 ? 'contact' : `ligne ${s.range}`;
    case 'point': return `zone ${s.range}`;
    case 'self': return 'autour';
    case 'dash': return `charge ${s.range}`;
    case 'leap': return `saut ${s.range}`;
    case 'swap': return `échange ${s.range}`;
    case 'place': return `pose ${s.range}`;
    case 'ally': return `allié ${s.range}`;
  }
  return '';
}
function effectChips(s) {
  const e = [];
  if (s.push) e.push(chip('push', s.push, '', 'Repousse'));
  if (s.pull) e.push(chip('hook', '', '', 'Attire'));
  if (s.pierce) e.push(chip('arrow2', '', '', 'Perçant'));
  if (s.splash) e.push(chip('spark', Math.round(s.splash * 100) + '%', '', 'Éclats autour'));
  if (s.poison) e.push(chip('drop', s.poison, 'green', 'Poison par tour'));
  if (s.stun) e.push(chip('snow', s.stun, 'blue', 'Étourdit'));
  if (s.lifesteal) e.push(chip('heart', '+' + s.lifesteal + '%', 'green', 'Soigne'));
  if (s.echo) e.push(chip('spin', Math.round(s.echo * 100) + '%', '', 'Écho'));
  if (s.chain) e.push(chip('bolt', '×' + s.chain, '', 'Rebondit'));
  if (s.exec) e.push(chip('skull', '×' + (1 + s.exec), 'red', 'Cible sous 50 %'));
  if (s.shield) e.push(chip('shield', '', 'blue', 'Bouclier'));
  if (s.fire) e.push(chip('fire', '', 'red', 'Feu'));
  if (s.ff) e.push(chip('taunt', 'allié', 'red', 'Touche aussi tes alliés'));
  return e.join('');
}
function dmgHtml(raw, cap) {
  if (!cap) return '';
  if (raw > cap) return `<span class="dmg over" title="Ferait ${raw} mais limité à ${cap} (maximum de la compétence)">${raw}/${cap}</span>`;
  return `<span class="dmg" title="Dégâts / maximum">${raw}<small>/${cap}</small></span>`;
}
function durTag(x) { return x.perm ? '<span class="dur perm" title="Définitif">∞</span>' : `<span class="dur" title="Salles restantes">${x.dur}</span>`; }
function heroSummary(h, hi) {
  const H = HEROES[h.key], g = G();
  const kills = (S.stats.heroKills || [])[hi] || 0;
  const stats = [
    chip('heart', `${Math.round(h.pct)}/${maxPct()} %`, '', '% actuel / maximum'),
    chip('foot', HEROES[h.key].move, 'blue', 'Déplacement'),
    chip('skullx', kills, '', 'Ennemis tués'),
    g.dmg !== 1 ? chip('blade', '×' + g.dmg.toFixed(2), 'red', 'Multiplicateur de dégâts (règles, pactes)') : '',
    g.taken < 1 ? chip('shield', '−' + Math.round((1 - g.taken) * 100) + ' %', 'blue', 'Dégâts subis en moins') : (g.taken > 1 ? chip('shield', '+' + Math.round((g.taken - 1) * 100) + ' %', 'red', 'Dégâts subis en plus') : ''),
    S.talents.egide ? chip('shield', S.talents.egide, 'blue', 'Boucliers au début de chaque salle') : '',
  ].join('');
  const free = h.slots.filter(s => !s).length;
  const rows = h.slots.map((sl, si) => {
    if (!sl) return '';
    const D = SKILLS[sl.key], st = skillStats(hi, si), raw = rawDmg(hi, st);
    const mods = sl.mods.map(m => chip('up', UPGRADES[m.key].name + (m.perm ? ' ∞' : ' ' + m.dur), 'gold', UPGRADES[m.key].desc(m.v))).join('');
    return `<div class="hrow" title="${esc(D.desc)}"><span class="hr-ico">${icon(D.icon, 22)}</span><b>${D.name}</b>
      ${st.dmg ? `<span class="ch red">${icon('blade', 15)}${dmgHtml(raw, st.cap)}</span>` : ''}${chip('target', skillKindText(st))}${st.cd ? chip('hourglass', st.cd, '', 'Recharge (tours)') : ''}${si > 0 ? (sl.perm ? chip('star', '∞', 'gold', 'Définitive') : chip('hourglass', sl.dur + ' salles', '', 'Durée restante')) : ''}${mods}</div>`;
  }).join('') + (free ? `<div class="hrow empty" title="Les portes « Compétence » remplissent ces emplacements">${icon('plus', 18).repeat(free)}<span>${free} emplacement${free > 1 ? 's' : ''} libre${free > 1 ? 's' : ''}</span></div>` : '');
  return `<div class="hsum" style="--c:${H.color}">
    <div class="hsum-top"><img class="tok-img" src="${Render.portrait(h.key)}" alt=""><div class="hs-name"><b>${H.name}</b><small>${H.title}</small></div>${pctBar(h)}</div>
    <div class="hs-stats">${stats}</div>
    <div class="hs-rows">${rows}</div></div>`;
}
function pctBar(h) {
  const mx = maxPct(), p = Math.round(h.pct);
  const cls = p <= FLOOR_PCT ? 'low' : p < 60 ? 'mid' : '';
  return `<div class="pct ${cls}" title="% de dégâts : ${p} % (maximum ${mx} %). Baisse quand tu es touché, jamais sous ${FLOOR_PCT} %. Tes attaques font ce % de leurs dégâts."><div class="pct-num">${p}%</div><div class="bar"><i style="width:${p / mx * 100}%"></i><em style="left:${FLOOR_PCT / mx * 100}%"></em></div></div>`;
}
function rewardShortTitle(rw) {
  switch (rw.type) {
    case 'skill': return SKILLS[rw.key].name;
    case 'upgrade': return UPGRADES[rw.key].name;
    case 'rule': return RULES[rw.key].name;
    case 'pact': return PACTS[rw.key].name;
    case 'rest': return `+${15 * rw.v} %`;
    case 'prolong': return `+${3 * rw.v} salles`;
  }
  return REWARD_KIND[rw.type];
}
function rewardLine(rw) {
  const v = rw.v;
  switch (rw.type) {
    case 'skill': return `${chip(null, HEROES[S.heroes[rw.hero].key].name)}${chip('hourglass', DUR.skill * v)}`;
    case 'upgrade': return `<span class="dl">${esc(UPGRADES[rw.key].desc(v))}</span>${chip('hourglass', DUR.upgrade)}`;
    case 'rule': return `<span class="dl">${esc(RULES[rw.key].desc)}</span>${chip('hourglass', DUR.rule * v)}`;
    case 'pact': return `<span class="dl good">+ ${esc(tr(PACTS[rw.key].bonus(v)))}</span><span class="dl bad">− ${esc(tr(PACTS[rw.key].malus))}</span>${chip('hourglass', DUR.pact)}`;
    case 'rest': return `<span class="dl">à tous les héros</span>`;
    case 'prolong': return `<span class="dl">à tous tes effets temporaires</span>`;
    case 'mutation': return `<span class="dl">Change une compétence${v > 1 ? ' (au choix parmi 3)' : ''}</span>`;
    case 'transfert': return `<span class="dl">Donne une compétence à un autre héros</span>`;
  }
  return '';
}
function miniMap(room) {
  const H = room.grid.length, W = room.grid[0].length, s = 10;
  const col = { floor: '#2c3346', rock: '#5b6480', pit: '#06070c', lava: '#e0521a' };
  const zc = { piques: '#b9bcc9', courant: '#4fa8ff', autel: '#6dffae', glace: '#bfeaff', rune: '#ffd166', portail: '#d68bff', buisson: '#4c9a52', boue: '#7a5a3a', soin: '#6dffae', foyer: '#ff7a2a', trampoline: '#ff9ad5', machoire: '#d9b55a', cercle: '#ffd166' };
  let r = '';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = room.grid[y][x]; if (t.t === 'void') continue;
    r += `<rect x="${x * s}" y="${y * s}" width="${s - 1}" height="${s - 1}" rx="1.5" fill="${col[t.t] || col.floor}"/>`;
    if (t.z && zc[t.z]) r += `<rect x="${x * s + 2.5}" y="${y * s + 2.5}" width="${s - 6}" height="${s - 6}" rx="1" fill="${zc[t.z]}" opacity="0.8"/>`;
  }
  for (const [x, y] of room.heroSpawns) r += `<circle cx="${x * s + 4.5}" cy="${y * s + 4.5}" r="3.4" fill="#6dffae" stroke="#fff" stroke-width="0.8"/>`;
  for (const o of room.objs) r += `<rect x="${o.x * s + 2}" y="${o.y * s + 2}" width="5" height="5" fill="${o.kind === 'cristal' ? '#d68bff' : o.kind === 'coffre' ? '#ffd166' : o.kind === 'orbe' ? '#7cc4ff' : '#c0392b'}"/>`;
  for (const e of room.enemies) { const c = e.boss ? BOSSES[e.kind].color : ENEMIES[e.kind].color; r += `<circle cx="${e.x * s + 4.5}" cy="${e.y * s + 4.5}" r="${e.boss ? 4.4 : 3.2}" fill="${c}" stroke="${e.elite || e.boss ? '#ffd166' : '#000'}" stroke-width="${e.elite || e.boss ? 1.4 : 0.6}"/>`; }
  return `<svg class="minimap" viewBox="-1 -1 ${W * s + 1} ${H * s + 1}" title="Aperçu de la salle : vert = tes héros, ronds de couleur = ennemis (bord doré = élite), carrés = coffres, orbes, cristaux, barils">${r}</svg>`;
}
function roomContentChips(c, room) {
  const counts = {};
  for (const e of room.enemies) if (!e.boss) counts[e.kind] = (counts[e.kind] || 0) + 1;
  const foes = Object.keys(counts).map(k => `<span class="foe" style="--c:${ENEMIES[k].color}" title="${esc(tr(ENEMIES[k].name) + ' — ' + tr(TIPS[k] || ''))}"><i class="sh-${ENEMIES[k].shape}"></i><b>${counts[k]}</b></span>`).join('');
  const elites = room.enemies.filter(e => e.elite).length;
  const ms = {}; for (const e of room.enemies) for (const m of e.mods || []) ms[m] = (ms[m] || 0) + 1;
  const modChips = Object.keys(ms).map(m => chip(MODS[m].icon, ms[m], 'mod', tr('Élite') + ' ' + tr(MODS[m].name) + ' : ' + tr(MODS[m].tip))).join('');
  const hz = [];
  let pits = 0, lava = 0; for (const row of room.grid) for (const t of row) { if (t.t === 'pit') pits++; if (t.t === 'lava') lava++; }
  if (pits) hz.push(chip('pit', pits, '', 'Fosses')); if (lava) hz.push(chip('lava', lava, 'red', 'Lave'));
  if (room.objs.some(o => o.kind === 'baril')) hz.push(chip('barrel', room.objs.filter(o => o.kind === 'baril').length, '', 'Barils explosifs'));
  const zs = {}; for (const row of room.grid) for (const t of row) if (t.z) zs[t.z] = (zs[t.z] || 0) + 1;
  for (const z in zs) hz.push(chip(ZONE_ICON[z], z === 'portail' ? zs[z] / 2 : zs[z], '', tr(ZONES[z].name) + ' — ' + tr(ZONES[z].tip)));
  return `${miniMap(room)}<div class="foes">${foes}${elites ? chip('star', elites, 'gold', 'Élites') : ''}${modChips}</div>${hz.length ? `<div class="hz">${hz.join('')}</div>` : ''}`;
}
function doorHtml(c, i) {
  const room = genRoom(c);
  const goalHtml = c.goal ? chip('star', GOALS[c.goal].name, 'goalc', goalText(c.goal, c.goalN) + ` Réussi : +${GOAL_HEAL} %`) : '';
  if (c.boss) {
    const B = BOSSES[c.boss];
    const marge = Math.max(0, Math.round(lowestPct() - FLOOR_PCT));
    return `<button class="door boss d${c.diff}" data-i="${i}" style="--c:${B.color}" title="${esc(`${tr('Boss')} : ${tr(B.name)}. ${tr(B.desc)} ${tr('Seule source d’or. Si un héros tombe à 40 %, il s’enfuit.')}`)}"><span class="door-num">${i + 1}</span>
      <div class="door-top"><span class="stars">${'★'.repeat(c.diff)}</span>${chip('crown', 'BOSS', 'gold')}</div>
      <div class="door-arch">${icon('crown', 46)}</div>
      <h3>${B.name}</h3>
      <div class="door-chips">${(c.mods || []).map(m => chip(MODS[m].icon, MODS[m].name, 'mod', tr('Mutation') + ' : ' + tr(MODS[m].tip) + '. ' + tr(MODS[m].desc))).join('')}${chip('gold', '+' + bossMoney(c), 'gold', 'Or si tu gagnes')}${chip('skullx', (B.phases || []).length + 1, 'red', 'Phases')}${chip('heart', marge + ' %', marge < 20 ? 'red' : 'green', 'Marge avant 40 % (héros le plus faible)')}${goalHtml}</div>
      ${roomContentChips(c, room)}
    </button>`;
  }
  const rw = c.reward, K = ROOM_KINDS[c.kind || 'normal'];
  return `<button class="door d${c.diff}" data-i="${i}" title="${esc(`${tr(K.name)} : ${tr(K.tip)} ${tr('Récompense')} — ${rewardTitle(rw)} : ${rewardDesc(rw)}${c.diff > 1 ? ' ' + tr('(★★ : plus dur, gains ×2)') : ''}`)}"><span class="door-num">${i + 1}</span>
    <div class="door-top"><span class="stars">${'★'.repeat(c.diff)}</span>${c.diff > 1 ? '<span class="mult">×2</span>' : ''}${chip(K.icon, K.name, c.kind && c.kind !== 'normal' ? 'kind' : '', K.tip)}</div>
    <div class="door-arch rw-${rw.type}">${icon(REWARD_ICON[rw.type], 46)}</div>
    <div class="door-kind">${REWARD_KIND[rw.type]}</div>
    <h3>${esc(rewardShortTitle(rw))}</h3>
    <div class="door-line">${rewardLine(rw)}</div>
    <div class="door-chips">${goalHtml}${c.trait ? chip(TRAITS[c.trait].bad ? 'taunt' : 'star', TRAITS[c.trait].name, TRAITS[c.trait].bad ? 'red' : 'green', TRAITS[c.trait].desc) : ''}</div>
    ${roomContentChips(c, room)}
  </button>`;
}
function roomStatusChip() {
  switch (C.kind) {
    case 'vagues': return chip('wave', `Vague ${C.waveNo}/${C.waveTotal}`, 'kind', ROOM_KINDS.vagues.tip);
    case 'survie': return chip('hourglass', `${Math.min(C.turn, C.limit)}/${C.limit}`, 'kind', ROOM_KINDS.survie.tip);
    case 'chasse': { const left = C.limit - C.turn + 1; return chip('run', `${Math.max(0, left)} tour${left > 1 ? 's' : ''}`, left <= 1 ? 'red' : 'kind', ROOM_KINDS.chasse.tip); }
    case 'rituel': { const n = C.units.filter(u => !u.dead && u.kind === 'cristal').length; return chip('gem', n, n ? 'red' : 'green', ROOM_KINDS.rituel.tip); }
  }
  return chip('blade', '', '', ROOM_KINDS.normal.tip);
}
function heroPanel(hi) {
  const h = S.heroes[hi], H = HEROES[h.key], u = heroUnit(hi);
  const sel = C.sel === hi;
  const done = u && C.phase === 'hero' && u.actions <= 0 && !u.hasMove;
  const st = u ? `${u.chain > 0 ? chip('link', u.chain, 'red', 'Enchaîné par le Geôlier : ne peut pas bouger (frappe-le avec ce héros pour briser la chaîne)') : ''}${u.frozen ? chip('snow', '−2', 'blue', 'Gardien de givre : −2 déplacement') : ''}${chip('foot', u.hasMove ? u.moveBudget : 0, u.hasMove ? 'blue' : 'off', 'Déplacement')}${chip('star', Math.max(0, u.actions), u.actions > 0 ? 'gold' : 'off', 'Actions')}${u.shield ? chip('shield', u.shield, 'blue', 'Bouclier') : ''}` : '';
  const sk = h.slots.map((s, si) => {
    if (!s) return `<button class="skb empty" disabled><span class="k">${si + 1}</span>${icon('plus', 22)}</button>`;
    const D = SKILLS[s.key], st2 = skillStats(hi, si);
    const cd = s.cdLeft || 0;
    const dm = displayDmg(hi, st2);
    const active = sel && C.mode === 'skill' && C.slot === si;
    const unusable = !u || u.actions <= 0 || cd > 0 || C.phase !== 'hero';
    return `<button class="skb ${active ? 'active' : ''} ${unusable ? 'off' : ''}" data-h="${hi}" data-s="${si}">
      <span class="k">${si + 1}</span>${icon(D.icon, 28)}
      <span class="nm">${D.name}</span>
      <span class="meta">${dm > 0 ? dmgHtml(rawDmg(hi, st2), st2.cap) : ''}${si > 0 ? (s.perm ? durTag(s) : `<span class="dur" title="Salles restantes">${icon('hourglass', 11)}${s.dur}</span>`) : ''}${s.mods.length ? `<span class="mods">+${s.mods.length}</span>` : ''}</span>
      ${cd > 0 ? `<span class="cd">${cd}</span>` : ''}</button>`;
  }).join('');
  const pv = C.preview && C.preview.ver === C.ver && C.phase === 'hero' && !C.busy ? C.preview : null;
  let fut = '';
  if (pv) {
    const after = Math.round(pv.pct[hi]), now = Math.round(h.pct);
    fut = after < now ? `<div class="fut bad" title="Ton % après le tour ennemi si tu finis ton tour maintenant">${icon('arrow', 16)} <b>${after} %</b> <small>(−${now - after})</small></div>` : `<div class="fut ok" title="Aucun dégât prévu">${icon('check', 16)} <b>intact</b></div>`;
  }
  return `<div class="hp-in ${sel ? 'sel' : ''} ${done ? 'done' : ''}" data-h="${hi}" style="--c:${H.color}">
    <div class="hp-head"><img class="tok-img" src="${Render.portrait(h.key)}" alt="" title="${esc(H.name + ' — ' + tr(H.desc))}"><b class="nm" title="Clique pour choisir ce héros (Tab)">${H.name}</b><div class="sts">${st}</div></div>
    ${pctBar(h)}${fut}
    <div class="skills">${sk}</div></div>`;
}
function skillInfo(hi, slot) {
  const inst = S.heroes[hi].slots[slot]; if (!inst) return '';
  const D = SKILLS[inst.key], s = skillStats(hi, slot);
  const dm = displayDmg(hi, s);
  const mods = inst.mods.map(m => chip('up', UPGRADES[m.key].name + (m.perm ? ' ∞' : ' ' + m.dur), 'gold', UPGRADES[m.key].desc(m.v))).join('');
  const raw = rawDmg(hi, s);
  return `<div class="inf-h">${icon(D.icon, 22)} ${D.name} ${dm > 0 ? `<span class="ch red" title="Dégâts / maximum par coup (le maximum se relève avec l’amélioration Plafond)">${icon('blade', 16)}${dmgHtml(raw, s.cap)}</span>` : ''}${chip(s.type === 'line' && s.range > 1 ? 'arrow' : 'target', skillKindText(s))}${s.cd ? chip('hourglass', s.cd, '', 'Recharge') : ''}${effectChips(s)}${mods}</div><p>${esc(D.desc)}</p>`;
}
function tileInfo(x, y) {
  const o = unitAt(x, y), t = tile(x, y);
  const parts = [];
  if (o) {
    if (o.team === 'hero') {
      const h = S.heroes[o.hero], H = HEROES[h.key];
      parts.push(`<div class="inf-h" style="color:${H.color}">${H.name} ${chip('heart', Math.round(h.pct) + '%')}${chip('foot', heroMove(o.hero), 'blue')}${o.shield ? chip('shield', o.shield, 'blue') : ''}${o.chain > 0 ? chip('link', 'enchaîné ' + o.chain, 'red', 'Ne peut pas bouger. Frappe le Geôlier avec ce héros pour briser la chaîne.') : ''}</div>`);
    } else if (o.kind === 'cristal') {
      parts.push(`<div class="inf-h">${icon('gem', 20)} Cristal ${chip('heart', Math.ceil(o.hp))}</div><p>Tant qu’il tient : ennemis +30 % et +3 PV/tour.</p>`);
    } else if (o.kind === 'coffre') {
      parts.push(`<div class="inf-h">${icon('gold', 20)} Coffre ${chip('heart', Math.ceil(o.hp))}</div><p>Casse-le : de l’or pour toi.</p>`);
    } else if (o.kind === 'orbe') {
      const O = ORBS[o.orb];
      parts.push(`<div class="inf-h" style="color:${O.color}">${icon('star', 20)} Orbe : ${O.name} ${chip('heart', Math.ceil(o.hp))}</div><p>Casse-la : ${esc(O.tip)}.</p>`);
    } else if (o.team === 'obj') {
      parts.push(`<div class="inf-h">${icon('barrel', 20)} Baril ${chip('bomb', '10', 'red')}</div><p>Explose s’il est touché.</p>`);
    } else {
      const D = o.boss ? BOSSES[o.kind] : ENEMIES[o.kind];
      const dmg = Math.round(o.dmg * enemyPower(o) * G().taken);
      const st = [];
      const ord = enemyOrder().indexOf(o); if (ord >= 0) st.push(chip(null, '#' + (ord + 1), '', 'Ordre d’action'));
      if (o.elite) st.push(chip('star', 'élite', 'gold', 'Élite : plus de PV et de dégâts'));
      for (const m of o.mods || []) st.push(chip(MODS[m].icon, MODS[m].name, 'mod', tr(MODS[m].tip) + '. ' + tr(MODS[m].desc)));
      if (o.stun) st.push(chip('snow', o.stun, 'blue', 'Étourdi'));
      else if (o.stunRes) st.push(chip('snow', '✕', 'off', 'Vient d’être étourdi : résiste au prochain étourdissement'));
      if (o.poison) st.push(chip('drop', o.poison.dmg + '×' + o.poison.turns, 'green', 'Poison'));
      if (o.shield) st.push(chip('shield', '', 'blue', 'Bouclier'));
      if (o.armed) st.push(chip('bomb', 'armée', 'red'));
      if (o.reviving) st.push(chip('spin', 'revient', 'red'));
      if (totemNear(o)) st.push(chip('shield', '½', 'gold', 'Protégé par un Totem'));
      if (bannerNear(o)) st.push(chip('flag', '+30 %', 'red', 'Près d’un Porte-étendard : frappe 30 % plus fort'));
      if (o.piece || o.noHeal) st.push(chip('heart', '0', 'off', 'Ne soigne pas'));
      if (o.boss && o.phase) st.push(chip('skullx', 'phase ' + (o.phase + 1), 'red'));
      const tip = o.boss ? D.desc : (TIPS[o.kind] || D.desc);
      const mtx = (o.mods || []).map(m => `<b>${tr(MODS[m].name)}</b> : ${esc(tr(MODS[m].tip))}`).join(' · ');
      parts.push(`<div class="inf-h">${o.kind === 'ombre' ? 'Ombre de ' + HEROES[S.heroes[o.mirror].key].name : D.name} ${chip('heart', Math.ceil(o.hp) + '/' + o.maxHp)}${dmg ? chip('blade', dmg + '%', 'red') : ''}${chip('foot', o.move, 'blue')}${st.join('')}</div><p>${esc(tip)}</p>${mtx ? `<p class="inf-mods">${mtx}</p>` : ''}`);
    }
  }
  const tz = [];
  if (t.t === 'void') return '';
  if (t.t === 'pit') tz.push(chip('pit', 'Fosse', '', 'Chute : mort pour un ennemi, −12 % pour un héros'));
  if (t.t === 'lava') tz.push(chip('lava', 'Lave', 'red', '−10 PV / −8 %'));
  if (t.t === 'rock') tz.push(chip('wall', t.ttl ? 'Rocher ' + t.ttl : 'Rocher', '', 'Bloque, sert de mur aux collisions'));
  if (t.fire) tz.push(chip('fire', 'Feu', 'red'));
  if (t.trap) tz.push(chip('trap', 'Piège ' + t.trap.dmg, 'gold'));
  if (t.z) tz.push(chip(ZONE_ICON[t.z], ZONES[t.z].name + (t.z === 'portail' ? ' ' + String.fromCharCode(65 + t.zp) : ''), '', ZONES[t.z].desc) + `<span class="tip">${esc(ZONES[t.z].tip)}</span>`);
  for (const x2 of C.telegraphs) if (x2.tiles.some(([a, b]) => a === x && b === y)) tz.push(chip('taunt', `${x2.label} −${Math.round(x2.pct * G().taken)}%`, 'red'));
  if (tz.length) parts.push(`<div class="inf-z">${tz.join('')}</div>`);
  return parts.join('');
}
