'use strict';
/* Forge PvP — interface : menu des entraînements, configuration des parties (sets enregistrables),
   réglages, pause, résultats et test de CPS. */
(function () {
const FP = window.FP, S = FP.S, TX = FP.TX, $ = FP.$;
const UI = FP.UI = {};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------- icônes de modes
const MODE_ICON = {};
function drawIcon(fn) { const [c, g] = TX.cnv(16, 16); fn(g); const [c2, g2] = TX.cnv(32, 32); g2.drawImage(c, 0, 0, 32, 32); return c2.toDataURL(); }
MODE_ICON.target = drawIcon(g => {
  const ring = (r, col) => { for (let a = 0; a < 360; a += 4) { const x = Math.round(7.5 + Math.cos(a * FP.DEG) * r), y = Math.round(7.5 + Math.sin(a * FP.DEG) * r); g.fillStyle = col; g.fillRect(x, y, 1, 1); } };
  ring(7, '#ff4d4d'); ring(6, '#ff4d4d'); ring(4.5, '#ffffff'); ring(3, '#ff4d4d'); g.fillStyle = '#ff4d4d'; g.fillRect(6, 6, 4, 4); g.fillStyle = '#fff'; g.fillRect(7, 7, 2, 2);
});
MODE_ICON.flick = drawIcon(g => { const L = ['.......yy', '......yy.', '.....yy..', '....yyyyy', '......yy.', '.....yy..', '....yy...', '...yy....', '..y......']; L.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'y') { g.fillStyle = y < 4 ? '#fff38a' : '#ffd23f'; g.fillRect(x + 3, y * 1.6 + 1, 1, 2); } })); });
MODE_ICON.mouse = drawIcon(g => { g.fillStyle = '#d9dde6'; g.fillRect(4, 2, 8, 12); g.fillRect(3, 4, 10, 8); g.fillStyle = '#9aa1b4'; g.fillRect(7, 2, 1, 6); g.fillRect(4, 7, 8, 1); g.fillStyle = '#5dd39e'; g.fillRect(4, 2, 3, 5); });
MODE_ICON.boots = drawIcon(g => { g.fillStyle = '#4fe3d6'; g.fillRect(3, 3, 4, 8); g.fillRect(9, 3, 4, 8); g.fillRect(1, 9, 6, 4); g.fillRect(9, 9, 6, 4); g.fillStyle = '#1f8f88'; g.fillRect(1, 12, 6, 1); g.fillRect(9, 12, 6, 1); g.fillRect(3, 3, 4, 1); g.fillRect(9, 3, 4, 1); });
MODE_ICON.dodge = drawIcon(g => { // flèche qui passe à côté d'un joueur
  g.fillStyle = '#18a7a8'; g.fillRect(2, 6, 4, 5); g.fillStyle = '#c99a6b'; g.fillRect(2, 2, 4, 4); g.fillStyle = '#383f9a'; g.fillRect(2, 11, 4, 4);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(7, 9, 2, 1); g.fillRect(7, 11, 3, 1);
  for (let i = 0; i < 7; i++) { g.fillStyle = '#8a5d2e'; g.fillRect(8 + i, 10 - Math.round(i * 0.9), 1, 1); }
  g.fillStyle = '#cfcfcf'; g.fillRect(14, 3, 1, 2); g.fillRect(13, 3, 2, 1); g.fillStyle = '#f0f0f0'; g.fillRect(8, 10, 1, 2); g.fillRect(7, 10, 2, 1);
});
MODE_ICON.course = drawIcon(g => { // îles flottantes et une flèche
  const blk = (x, y, c, d) => { g.fillStyle = c; g.fillRect(x, y, 3, 3); g.fillStyle = d; g.fillRect(x, y + 2, 3, 1); };
  blk(1, 11, '#5dd39e', '#2e8a63'); blk(6, 8, '#5ad0ff', '#2a7fa8'); blk(12, 5, '#f7d03c', '#b8891c');
  g.fillStyle = '#35399d'; g.fillRect(9, 8, 3, 3);
  g.fillStyle = '#ffffff'; for (let i = 0; i < 9; i++) g.fillRect(2 + i, 7 - Math.round(Math.sin(i / 8 * Math.PI) * 4), 1, 1);
  g.fillRect(11, 2, 2, 1); g.fillRect(12, 2, 1, 2);
});
MODE_ICON.tree = drawIcon(g => { // sapin / chêne en pixel art
  g.fillStyle = '#2f7d32'; g.fillRect(4, 2, 8, 3); g.fillRect(3, 5, 10, 4); g.fillRect(5, 1, 6, 1);
  g.fillStyle = '#4caf50'; g.fillRect(5, 3, 3, 2); g.fillRect(4, 6, 3, 2);
  g.fillStyle = '#6b4a22'; g.fillRect(7, 9, 2, 6); g.fillStyle = '#3b2810'; g.fillRect(8, 9, 1, 6);
});
MODE_ICON.punch = drawIcon(g => { // pont d'un bloc et impact de coup
  g.fillStyle = '#7a7a7a'; g.fillRect(6, 12, 4, 3); g.fillStyle = '#5a5a5a'; g.fillRect(6, 14, 4, 1);
  g.fillStyle = '#ff5c4d'; [[8, 2], [8, 3], [8, 8], [8, 9], [3, 6], [4, 6], [12, 6], [13, 6], [5, 3], [11, 3], [5, 9], [11, 9]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  g.fillStyle = '#ffe14d'; g.fillRect(7, 5, 3, 3); g.fillStyle = '#fff'; g.fillRect(8, 6, 1, 1);
});
MODE_ICON.wind = drawIcon(g => { // pont d'un bloc et rafale
  g.fillStyle = '#7a7a7a'; g.fillRect(6, 12, 4, 3); g.fillStyle = '#5a5a5a'; g.fillRect(6, 14, 4, 1);
  g.fillStyle = '#dff6ff'; for (const [y, a, b] of [[3, 1, 10], [6, 3, 14], [9, 0, 8]]) g.fillRect(a, y, b - a, 1);
  g.fillStyle = '#9fd8ff'; g.fillRect(10, 2, 2, 1); g.fillRect(14, 5, 1, 1); g.fillRect(8, 8, 1, 1);
});
MODE_ICON.boat = drawIcon(g => { // bateau sur la glace
  g.fillStyle = '#a9cbff'; g.fillRect(0, 12, 16, 4); g.fillStyle = '#d6e8ff'; g.fillRect(2, 13, 5, 1); g.fillRect(10, 14, 4, 1);
  g.fillStyle = '#8a5d2e'; g.fillRect(2, 8, 12, 3); g.fillRect(1, 7, 2, 2); g.fillRect(13, 7, 2, 2); g.fillStyle = '#5a3a1c'; g.fillRect(3, 10, 10, 1);
  g.fillStyle = '#6b4a22'; g.fillRect(4, 4, 1, 5); g.fillRect(11, 4, 1, 5); g.fillStyle = '#c99a6b'; g.fillRect(7, 4, 2, 3);
});
function modeIcon(m) {
  if (m.ico === 'craft' && FP.CRAFT) return FP.CRAFT.tableIcon();
  if (m.ico === 'clutch' && FP.CRAFT) return FP.CRAFT.icon('water_bucket');
  if (m.ico === 'mine' && FP.CRAFT) return FP.CRAFT.icon('diamond_pickaxe');
  if (MODE_ICON[m.ico]) return MODE_ICON[m.ico];
  return TX.icon({ sword: 'sword', shieldsword: 'sword', bow: 'bow', crystal: 'crystal', wool: 'wool_blue', build: 'planks' }[m.ico] || 'sword');
}

// ---------------------------------------------------------------- résumé d'une configuration
function cfgSummary(id, c) {
  const parts = [];
  if (c.regarder) parts.push('👁 regarder');
  if (c.duree !== undefined && id !== 'cps') parts.push('⏱ ' + FP.fmtDur(c.duree));
  if (c.diff !== undefined) parts.push(c.diff + ' % · ' + FP.diffLabel(c.diff));
  if (id === 'duel18') parts.push((c.but === 'degats' ? 'dégâts' : 'recul') + ' · ' + c.cibles + ' cible' + (c.cibles > 1 ? 's' : '') + ' · ' + ({ attaque: 'attaquent', espace: 'gardent leurs distances', ignore: 'libres' }[c.comport] || ''));
  if (id === 'dodge') parts.push(c.tireurs + ' tireur' + (c.tireurs > 1 ? 's' : '') + ' · ' + ({ arc: 'arcs', arbalete: 'arbalètes', mix: 'arcs + arbalètes' }[c.arme] || '') + (c.vies ? ' · ' + c.vies + ' flèches max' : ''));
  if (id === 'targets') parts.push(c.cibles + ' cibles × ' + (c.manches ? c.manches : '∞') + ' manche' + (c.manches === 1 ? '' : 's') + ' · ' + c.distMin + '–' + c.distMax + ' blocs');
  if (id === 'bridge') parts.push(`arrivée ${c.gz} devant, ${c.gx ? (c.gx > 0 ? c.gx + ' à droite' : -c.gx + ' à gauche') + ', ' : ''}hauteur ${c.gy > 0 ? '+' : ''}${c.gy}`);
  if (id === 'course') parts.push(c.iles + ' îles · n°' + c.seed);
  if (id === 'foret') parts.push('aller-retour ' + c.dist + ' blocs · forêt ' + c.densite + ' % · n°' + c.seed);
  if (id === 'bateau') parts.push(c.tours + ' tour' + (c.tours > 1 ? 's' : '') + ' · ' + (c.glace === 'blue_ice' ? 'glace bleue' : 'glace compactée') + ' · piste de ' + FP.boatWidth(c) + ' blocs · circuit ' + c.taille + ' n°' + c.seed);
  if (id === 'build') parts.push(c.largeur + '×' + c.largeur + '×' + c.hauteur + ' · remplissage ' + c.remplissage + ' %');
  if (id === 'vent') parts.push((c.essais ? c.essais + ' essai' + (c.essais > 1 ? 's' : '') : '∞ essais') + ' · Recul +1 tous les ' + c.montee + ' blocs');
  if (id === 'parkour') parts.push('n°' + c.seed + ' · ' + (c.sauts ? c.sauts + ' sauts' : 'infini'));
  if (id === 'cps') parts.push(c.duree + ' s');
  if (id === 'clutch') parts.push((c.manches ? c.manches : '∞') + ' chutes · ' + (c.objet === 'auto' ? 'objets selon la difficulté' : (FP.CLUTCH && FP.CLUTCH[c.objet] ? FP.CLUTCH[c.objet][0] : '')));
  if (id === 'minage') parts.push((c.manches ? c.manches : '∞') + ' structures · outils en ' + ({ wood: 'bois', stone: 'pierre', iron: 'fer', gold: 'or', diamond: 'diamant' }[c.outils]) + (c.efficacite ? ' · Efficacité ' + c.efficacite : ''));
  if (id === 'craft') parts.push((c.crafts ? c.crafts : '∞') + ' objets · recette ' + ({ toujours: 'visible', apres: 'après 5 s', jamais: 'cachée' }[c.aide] || ''));
  return parts.join(' · ');
}

// ---------------------------------------------------------------- menu
UI.menuVisible = () => !document.body.classList.contains('in-game');
function renderMenu() {
  $('#menu-body').innerHTML = `<div class="modes">${FP.MODES.map((m, i) => `<button class="mode" data-mode="${m.id}" title="${esc(m.desc)}" style="animation-delay:${i * 40}ms">
      <div class="mico"><img src="${modeIcon(m)}" alt=""></div>
      <div class="mtxt"><h3>${m.nom}</h3><div class="comp">${m.comp}</div><p>${m.desc}</p>
      <div class="mbest">⚙️ ${esc(cfgSummary(m.id, FP.getCfg(m.id)))}</div></div>
    </button>`).join('')}</div>`;
  $('#menu-body').querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { FP.sfx('click'); UI.showConfig(b.dataset.mode); }));
  $('#sensinfo').textContent = `${S.sens} % · ${S.dpi} DPI · ${FP.cm360().toFixed(1)} cm/360°`;
}
UI.renderMenu = renderMenu;

// ---------------------------------------------------------------- tout tient à l'écran : on réduit au lieu de faire défiler
// réduit si ça ne tient pas, agrandit (jusqu'à 135 %) sur les grands écrans pour rester lisible
function fitTo(el, aw, ah, origin, maxK) {
  if (!el) return;
  el.style.transform = 'none';
  const w = el.offsetWidth, h = el.offsetHeight; if (!w || !h) return;
  const k = Math.min(maxK || 1, aw / w, ah / h);
  el.style.transformOrigin = origin; el.style.transform = Math.abs(k - 1) > 0.002 ? `scale(${k})` : 'none';
}
let fitPending = false;
UI.fit = function () {
  if (fitPending) return; fitPending = true;
  queueMicrotask(() => {
    fitPending = false;
    const W = innerWidth, H = innerHeight;
    const up = W >= 1500 && H >= 850 ? 1.35 : W >= 1280 && H >= 760 ? 1.12 : 1;
    document.documentElement.style.setProperty('--hs', Math.max(0.75, Math.min(1.6, Math.min(W / 1366, H / 768))).toFixed(3)); // échelle du HUD de jeu
    if (UI.menuVisible()) fitTo($('#menu-inner'), W - 16, H - 8, 'top center', up);
    fitTo(document.querySelector('#msg:not([hidden]) > .panel'), W - 24, H - 24, 'center center', up);
    fitTo(document.querySelector('#settings:not([hidden]) .sbox'), W - 24, H - 24, 'center center', up);
    fitTo(document.querySelector('#ecran2d:not([hidden]) > *'), W - 24, H - 24, 'center center', up);
  });
};
addEventListener('resize', UI.fit);
{ const mo = new MutationObserver(UI.fit); ['#menu', '#msg', '#ecran2d', '#settings'].forEach(q => mo.observe($(q), { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] })); }

// ---------------------------------------------------------------- configuration d'une partie
let cfgId = null, cfgDraft = null;
function fieldHtml(f, c) {
  if (f.show && !f.show(c)) return '';
  if (f.k === 'regarder') return ''; // affiché en haut, sous forme d'interrupteur
  const v = c[f.k], unit = f.unit ? `<span class="unit">${f.unit}</span>` : '';
  const help = f.help ? ` <span class="hint" title="${esc(f.help)}">?</span>` : '';
  const head = `<div class="flabel">${f.label}${help}</div>`;
  let ctl = '', cls = 'frow';
  if (f.type === 'dur' || f.type === 'count') {
    const inf = !v, isDur = f.type === 'dur';
    ctl = `<input type="number" data-f="${f.k}" data-kind="num" min="1" max="${f.max || 3600}" step="1" value="${inf ? (isDur ? 60 : (f.def || 10)) : v}" ${inf ? 'disabled' : ''} class="num">${isDur ? '<span class="unit">s</span>' : ''}
      <label class="inf ${inf ? 'on' : ''}"><input type="checkbox" data-f="${f.k}" data-kind="inf" ${inf ? 'checked' : ''}>∞ Infini</label>`;
  } else if (f.type === 'diff') {
    cls = 'frow wide diffrow';
    ctl = `<input type="range" min="0" max="100" step="1" data-f="${f.k}" data-kind="range" value="${v}" class="grow"><input type="number" min="0" max="100" step="1" data-f="${f.k}" data-kind="num" value="${v}" class="num"><span class="unit">%</span>
      <span class="difflabel" data-dl>${FP.diffLabel(v)}</span>`;
  } else if (f.type === 'int' || f.type === 'num') {
    ctl = `<input type="range" min="${f.min}" max="${f.max}" step="${f.step || 1}" data-f="${f.k}" data-kind="range" value="${v}" class="grow"><input type="number" min="${f.min}" max="${f.max}" step="${f.step || 1}" data-f="${f.k}" data-kind="num" value="${v}" class="num">${unit}`;
  } else if (f.type === 'select') {
    cls = Object.values(f.options).some(o => o.length > 26) ? 'frow wide' : 'frow';
    ctl = `<select data-f="${f.k}" data-kind="select" class="grow">${Object.entries(f.options).map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  } else if (f.type === 'bool') {
    ctl = `<label class="switch"><input type="checkbox" data-f="${f.k}" data-kind="bool" ${v ? 'checked' : ''}><span></span></label>`;
  }
  return `<div class="${cls}">${head}<div class="fctl">${ctl}</div></div>`;
}
function presetsHtml(id) {
  const builtIn = FP.PRESETS[id] || [], mine = FP.userPresets(id);
  return `<div class="presets">
    <div class="sec">Sets de partie</div>
    <div class="pchips">${builtIn.map((p, i) => `<button class="pchip" data-preset="b${i}">${esc(p.nom)}</button>`).join('')}
      ${mine.map((p, i) => `<span class="pchip mine"><button data-preset="u${i}">★ ${esc(p.nom)}</button><button class="del" data-del="${i}" title="Supprimer">×</button></span>`).join('')}
      <button class="pchip ghost" data-preset="def">↺ Réglages par défaut</button></div>
    <div class="psave"><input type="text" id="presetName" maxlength="40" placeholder="Nom du nouveau set"><button class="btn" data-act="savePreset" title="Enregistrer les réglages actuels">★</button></div>
  </div>`;
}
function renderConfig() {
  const id = cfgId, m = FP.modeById(id), c = cfgDraft, hasWatch = FP.SCHEMA[id].some(f => f.k === 'regarder');
  $('#msg').innerHTML = `<div class="panel cfg pop-in">
    <div class="cfghead"><div class="picon"><img src="${modeIcon(m)}" alt=""></div><div class="ct"><h2>${m.nom}</h2><p class="dim">${m.desc}</p></div>
      ${hasWatch ? `<label class="watch ${c.regarder ? 'on' : ''}" title="L’ordinateur joue parfaitement à ta place, mais il ne connaît pas les déplacements futurs des cibles : il les anticipe."><input type="checkbox" data-f="regarder" data-kind="bool" ${c.regarder ? 'checked' : ''}><span class="eye">👁</span><span><b>Mode regarder</b><small>l’ordinateur joue à ta place</small></span><i></i></label>` : ''}</div>
    <div class="cfgbody">
      <aside>${presetsHtml(id)}</aside>
      <div class="cfgmain"><div class="fields">${FP.SCHEMA[id].map(f => fieldHtml(f, c)).join('')}</div><div class="tips">${tips(id)}</div></div>
    </div>
    <div class="cfgfoot"><button class="btn" data-act="cancel">← Retour</button><button class="btn primary big" data-act="go">▶ Commencer</button></div></div>`;
  $('#msg').hidden = false;
}
UI.showConfig = function (id) { cfgId = id; cfgDraft = FP.getCfg(id); renderConfig(); };
function readField(el) {
  const f = FP.SCHEMA[cfgId].find(x => x.k === el.dataset.f); if (!f) return;
  const kind = el.dataset.kind;
  if (kind === 'inf') { cfgDraft[f.k] = el.checked ? 0 : (f.type === 'dur' ? 60 : (f.def || 10)); return true; }
  if (kind === 'bool') { cfgDraft[f.k] = el.checked; return true; }
  if (kind === 'select') { cfgDraft[f.k] = el.value; return true; }
  let v = Number(el.value); if (!isFinite(v)) return;
  if (f.type === 'diff') v = FP.clamp(Math.round(v), 0, 100);
  else if (f.type === 'dur' || f.type === 'count') v = FP.clamp(Math.round(v), 1, f.max || 3600);
  else v = FP.clamp(v, f.min, f.max);
  if (f.type === 'int' || f.type === 'diff') v = Math.round(v);
  cfgDraft[f.k] = v;
  // synchronise curseur + champ numérique
  $('#msg').querySelectorAll(`[data-f="${f.k}"]`).forEach(o => { if (o !== el && (o.dataset.kind === 'range' || o.dataset.kind === 'num')) o.value = v; });
  const dl = el.closest('.frow') && el.closest('.frow').querySelector('[data-dl]'); if (dl) dl.textContent = FP.diffLabel(v);
  return false;
}
$('#msg').addEventListener('input', e => { if (cfgId && e.target.dataset.f) readField(e.target); });
$('#msg').addEventListener('change', e => { if (cfgId && e.target.dataset.f) { const rerender = readField(e.target); if (rerender || e.target.dataset.kind === 'select') renderConfig(); } });
$('#msg').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !cfgId) return;
  if (b.dataset.preset) {
    const k = b.dataset.preset;
    if (k === 'def') cfgDraft = FP.defaults(cfgId);
    else { const p = k[0] === 'b' ? FP.PRESETS[cfgId][+k.slice(1)] : FP.userPresets(cfgId)[+k.slice(1)]; cfgDraft = Object.assign(FP.defaults(cfgId), k[0] === 'u' ? {} : cfgDraft, p.cfg); }
    FP.sfx('click'); renderConfig();
  } else if (b.dataset.del != null) {
    FP.userPresets(cfgId).splice(+b.dataset.del, 1); FP.save(); renderConfig();
  } else if (b.dataset.act === 'savePreset') {
    const name = ($('#presetName').value || '').trim() || 'Mon set ' + (FP.userPresets(cfgId).length + 1);
    FP.userPresets(cfgId).push({ nom: name, cfg: Object.assign({}, cfgDraft) }); FP.save(); FP.sfx('ok'); renderConfig();
  } else if (b.dataset.act === 'go') {
    const id = cfgId; FP.setCfg(id, cfgDraft); cfgId = null;
    FP.openGame(id, id !== 'cps'); // le clic sert de geste utilisateur pour capturer la souris
  } else if (b.dataset.act === 'cancel') {
    cfgId = null; $('#msg').hidden = true; renderMenu();
  }
});

// ---------------------------------------------------------------- réglages (fenêtre)
const ACTIONS = { fwd: 'Avancer', back: 'Reculer', left: 'Gauche', right: 'Droite', jump: 'Sauter', sneak: 'S’accroupir', sprint: 'Sprint (si pas automatique)' };
let waitingKey = null;
function renderSettings() {
  $('#settings-body').innerHTML = `
  <div class="setgrid">
    <section><h3>Souris & vue</h3>
      <p class="dim">Mets exactement tes réglages Minecraft.</p>
      <label class="row">Sensibilité <input type="range" min="0" max="200" id="sSens" value="${S.sens}"><output>${S.sens} %</output></label>
      <label class="row">DPI souris <input type="number" min="100" max="32000" step="50" id="sDpi" value="${S.dpi}"></label>
      <label class="row">FOV <input type="range" min="30" max="110" id="sFov" value="${S.fov}"><output>${S.fov}</output></label>
      <label class="row">Effets de FOV <input type="range" min="0" max="100" id="sFovE" value="${S.fovEffects}"><output>${S.fovEffects} %</output></label>
      <div class="calc" id="calc"></div>
      <label class="row">Calibrage <input type="number" min="0.1" max="10" step="0.01" id="sCal" value="${S.calib}"></label>
      <p class="dim small">Laisse 1, sauf si un tour complet ne fait pas la même distance que dans Minecraft.</p>
      <label class="chk"><input type="checkbox" id="sRaw" ${S.raw ? 'checked' : ''}> Entrée brute (sans accélération Windows)</label>
      <label class="chk"><input type="checkbox" id="sInv" ${S.invertY ? 'checked' : ''}> Inverser l’axe vertical</label>
      <label class="chk"><input type="checkbox" id="sBob" ${S.bobbing ? 'checked' : ''}> Balancement de la vue</label>
    </section>
    <section><h3>Jeu</h3>
      <label class="chk"><input type="checkbox" id="sTog" ${S.toggleSprint ? 'checked' : ''}> Sprint automatique (recommandé)</label>
      <label class="chk"><input type="checkbox" id="sHb" ${S.showHitbox ? 'checked' : ''}> Afficher les hitbox (F3 + B)</label>
      <label class="chk"><input type="checkbox" id="sHb18" ${S.hitbox18 ? 'checked' : ''}> Hitbox 1.8 (+0,1) en Réflexes</label>
      <h3>Graphismes & son</h3>
      <label class="row">Qualité <select id="sQ">${['haute', 'moyenne', 'basse'].map(q => `<option value="${q}" ${q === S.qualite ? 'selected' : ''}>${q[0].toUpperCase() + q.slice(1)}</option>`).join('')}</select></label>
      <label class="chk"><input type="checkbox" id="sSh" ${S.ombres ? 'checked' : ''}> Ombres</label>
      <label class="chk"><input type="checkbox" id="sSon" ${S.sons ? 'checked' : ''}> Sons</label>
      <label class="row">Volume <input type="range" min="0" max="1" step="0.05" id="sVol" value="${S.volume}"><output>${Math.round(S.volume * 100)} %</output></label>
    </section>
    <section><h3>Touches</h3>
      <div class="keys">${Object.entries(ACTIONS).map(([k, v]) => `<div class="krow"><span>${v}</span><button class="btn key ${waitingKey === k ? 'wait' : ''}" data-key="${k}">${waitingKey === k ? 'Appuie sur une touche…' : FP.keyLabel(S.keys[k])}</button></div>`).join('')}</div>
      <p class="dim small">Garde le sprint automatique : Ctrl + avancer peut fermer l’onglet du navigateur.</p>
      <button class="btn" id="sReset">Réinitialiser les réglages</button>
    </section>
  </div>`;
  const calc = () => { $('#calc').innerHTML = `${FP.degPerCount().toFixed(4)}° par mouvement · <b>${FP.cm360().toFixed(1)} cm</b> pour un tour complet`; };
  calc();
  const bind = (id, key, conv, out, after) => {
    const el = $('#' + id); if (!el) return;
    el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
      S[key] = el.type === 'checkbox' ? el.checked : conv(el.value); FP.save(); calc();
      const o = el.parentElement.querySelector('output'); if (o && out) o.textContent = out(S[key]);
      if (after) after();
    });
  };
  bind('sSens', 'sens', Number, v => v + ' %'); bind('sDpi', 'dpi', v => Math.max(100, Number(v) || 800));
  bind('sFov', 'fov', Number, v => v); bind('sFovE', 'fovEffects', Number, v => v + ' %'); bind('sCal', 'calib', v => Math.max(0.1, Number(v) || 1));
  bind('sRaw', 'raw'); bind('sInv', 'invertY'); bind('sBob', 'bobbing');
  bind('sTog', 'toggleSprint'); bind('sHb', 'showHitbox'); bind('sHb18', 'hitbox18'); bind('sSon', 'sons');
  bind('sVol', 'volume', Number, v => Math.round(v * 100) + ' %', () => FP.sfx('click'));
  bind('sQ', 'qualite', String, null, () => FP.R.applyQuality()); bind('sSh', 'ombres', null, null, () => FP.R.applyQuality());
  $('#settings-body').querySelectorAll('[data-key]').forEach(b => b.addEventListener('click', () => { waitingKey = b.dataset.key; renderSettings(); }));
  $('#sReset').addEventListener('click', () => {
    if (!confirm('Remettre tous les réglages par défaut ? (tes sets et configurations de parties sont conservés)')) return;
    Object.assign(S, JSON.parse(JSON.stringify(FP.DEF))); FP.save(); FP.R.applyQuality(); renderSettings();
  });
}
addEventListener('keydown', e => {
  if (!waitingKey) return;
  e.preventDefault(); e.stopPropagation();
  if (e.code !== 'Escape') { S.keys[waitingKey] = e.code; FP.save(); }
  waitingKey = null; renderSettings();
}, true);
UI.openSettings = () => { renderSettings(); $('#settings').hidden = false; };
UI.closeSettings = () => { $('#settings').hidden = true; waitingKey = null; renderMenu(); };

// ---------------------------------------------------------------- écrans de jeu
const msg = () => $('#msg');
function show(html) { cfgId = null; msg().innerHTML = html; msg().hidden = false; }
UI.hideOverlay = () => { msg().hidden = true; };
function tips(id) {
  const k = S.keys, L = FP.keyLabel, mv = `<kbd>${FP.moveKeys()}</kbd> se déplacer · <kbd>${L(k.jump)}</kbd> sauter · <kbd>${L(k.sneak)}</kbd> s’accroupir`;
  return {
    flick: 'Tourne-toi et <kbd>clic gauche</kbd> sur chaque cible. Les clics ratés comptent.',
    duel18: `${mv} · <kbd>clic gauche</kbd> frapper<br>Après chaque coup, <b>relâche ${L(k.fwd)} un court instant</b> (W-tap) : regarde l’indicateur « Sprint serveur ».`,
    dodge: `${mv}<br>Des archers et arbalétriers te tirent dessus : ne te fais pas toucher. Un arc bandé à fond ou une arbalète chargée = tir imminent. Les arbres arrêtent les flèches.`,
    targets: `${mv}<br><kbd>1</kbd> épée (<kbd>clic gauche</kbd>) · <kbd>2</kbd> arc (maintiens <kbd>clic droit</kbd>, relâche pour tirer) · <kbd>3</kbd> arbalète (maintiens <kbd>clic droit</kbd> 1,25 s pour la charger, puis <kbd>clic droit</kbd> pour tirer). Molette : changer d’arme.`,
    build: `${mv}<br><kbd>clic droit</kbd> poser · <kbd>clic gauche</kbd> casser · <kbd>1</kbd>–<kbd>9</kbd> ou molette : choisir le bloc. Maquette à gauche, ta parcelle à droite.`,
    bridge: `${mv}<br>Dos tourné à l’arrivée dorée, recule et pose des blocs avec le <kbd>clic droit</kbd> (maintenu = 1 bloc tous les 4 ticks). Accroupi, tu ne tombes pas du bord.`,
    bateau: `<kbd>${FP.keyLabel(k.fwd)}</kbd> avancer · <kbd>${FP.keyLabel(k.back)}</kbd> freiner · <kbd>${FP.keyLabel(k.left)}</kbd> / <kbd>${FP.keyLabel(k.right)}</kbd> tourner · souris : regarder autour (105° max).<br>Physique exacte du bateau de Minecraft : sur la glace, il garde sa vitesse de rotation (contre-braque !) et glisse longtemps.`,
    foret: `${mv}<br>Aller-retour : rejoins l’arche dorée du demi-tour, puis reviens au départ, le plus vite possible. <kbd>clic droit</kbd> poser un bloc · <kbd>clic gauche</kbd> casser tes blocs. Sprint-jump dans les zones dégagées ; sous les feuilles basses, chaque saut devient un head hitter (encore plus rapide).`,
    vent: `${mv}<br>Avance le plus loin possible. Quand un coup te projette, <kbd>clic droit</kbd> pour poser un bloc où tu vas retomber (contre le côté du pont, qui est plein jusqu’en bas : même en tombant, tu peux encore te rattraper contre lui). <kbd>clic gauche</kbd> casser tes blocs.`,
    course: `${mv}<br>Rejoins l’émeraude (repère violet) le plus vite possible, par où tu veux : les îles sont des raccourcis gratuits. <kbd>clic droit</kbd> poser un bloc n’importe où · <kbd>clic gauche</kbd> casser tes blocs. Astuce : sprint-jump sous un plafond de blocs (head hitter) = plus rapide.`,
    parkour: `${mv}<br>Atteins le bloc d’émeraude (ou va le plus loin possible en infini). Les blocs d’or sont des checkpoints.`,
    cps: 'Clique dans la zone le plus vite et le plus régulièrement possible.',
    clutch: `${mv}<br>Saute du pilier et rattrape-toi avant le sol. <kbd>clic droit</kbd> poser l’objet (eau, foin, toile, slime, lit, bateau, échafaudage, échelle contre le mur, TNT), allumer la TNT au briquet (<kbd>2</kbd>), lancer la charge de vent · <kbd>clic gauche</kbd> frapper avec la masse.`,
    minage: `${mv}<br><kbd>1</kbd> pioche · <kbd>2</kbd> hache · <kbd>3</kbd> pelle · <kbd>4</kbd> cisailles (ou molette) · <b>maintiens le clic gauche</b> pour casser. Reste au sol (en l’air : ×5 plus lent).`,
    craft: 'Fenêtre de l’établi de Minecraft : <b>clic gauche</b> prendre / poser tout · <b>clic droit</b> prendre la moitié / poser un · <b>glisser</b> clic droit = un par case · <b>Maj + clic</b> sur le résultat = en série · <b>1–9</b> échanger avec la barre.'
  }[id] || '';
}
UI.showClickToStart = function (id) {
  const m = FP.modeById(id);
  show(`<div class="panel pop-in"><div class="picon"><img src="${modeIcon(m)}" alt=""></div><h2>${m.nom}</h2><p class="dim">${esc(cfgSummary(id, FP.getCfg(id)))}</p>
    <div class="tips">${tips(id)}</div>
    <div class="btns"><button class="btn primary big" data-act="lock">▶ Clique pour commencer</button><button class="btn" data-act="config">Configurer</button><button class="btn" data-act="menu">Menu</button></div></div>`);
};
UI.showPause = function () {
  show(`<div class="panel pop-in"><h2>Pause</h2><div class="btns col"><button class="btn primary big" data-act="lock">Reprendre</button>
    <button class="btn" data-act="restart">Recommencer</button><button class="btn" data-act="config">Configurer la partie</button>
    <button class="btn" data-act="finish">Terminer la session (voir mes stats)</button><button class="btn" data-act="menu">Menu</button></div></div>`);
};
UI.lockFailed = function () {
  const g = FP._dbg(); if (!g || g.started || g.twoD) return;
  UI.showClickToStart(g.id);
  msg().querySelector('.tips').insertAdjacentHTML('afterend', '<p class="ko">Le navigateur a refusé de capturer la souris. Clique sur le bouton ; si ça persiste, ouvre la page directement dans Chrome, Edge ou Firefox.</p>');
};
UI.showResults = function (r) {
  const m = FP.modeById(r.id);
  show(`<div class="panel res pop-in ${r.win === false ? 'lose' : ''}"><div class="dim small">${m.nom} · ${esc(cfgSummary(r.id, FP.getCfg(r.id)))}</div><h2>${r.title}</h2>
    <div class="score-big">${esc(r.big)}</div>
    <div class="stats">${r.rows.map((s, i) => `<div class="stat ${s.good === true ? 'good' : s.good === false ? 'bad' : ''}" style="animation-delay:${120 + i * 60}ms"><span>${s.l}</span><b>${s.v}</b></div>`).join('')}</div>
    <div class="advice"><h3>Conseils</h3><ul>${r.advice.map(a => `<li>${a}</li>`).join('')}</ul></div>
    <div class="btns"><button class="btn primary big" data-act="replay">Rejouer</button><button class="btn" data-act="config">Configurer</button><button class="btn" data-act="menu">Menu</button></div></div>`);
};
document.addEventListener('click', e => {
  const b = e.target.closest('#msg [data-act]'); if (!b || cfgId) return;
  const a = b.dataset.act, g = FP._dbg();
  if (a === 'lock') FP.resume();
  else if (a === 'restart' && g) FP.openGame(g.id, false);
  else if (a === 'replay' && g) FP.openGame(g.id, g.id !== 'cps');
  else if (a === 'finish') FP.finishSession();
  else if (a === 'config' && g) { const id = g.id; FP.closeGame(); UI.showConfig(id); }
  else if (a === 'menu') FP.closeGame();
});
UI.enterGame = function (id) {
  document.body.classList.add('in-game');
  const twoD = id === 'cps' || id === 'craft';
  $('#hud').hidden = twoD; $('#ecran2d').hidden = !twoD; $('#cv').classList.toggle('dim2d', twoD);
  msg().hidden = true; $('#ecran2d').innerHTML = '';
};
UI.leaveGame = function () {
  document.body.classList.remove('in-game');
  $('#hud').hidden = true; $('#ecran2d').hidden = true; $('#ecran2d').innerHTML = ''; msg().hidden = true; $('#cv').classList.remove('dim2d');
  renderMenu();
};

// ================================================================ test de CPS
const Drills = FP.Drills = FP.Drills || {};
function stat(l, v, good) { return `<div class="stat ${good === true ? 'good' : good === false ? 'bad' : ''}"><span>${l}</span><b>${v}</b></div>`; }
Drills.cps = function (register, cfg) {
  // chaque clic est horodaté avec l'heure exacte de l'événement (e.timeStamp, précision sub-milliseconde)
  const C = { tech: cfg.tech, dur: FP.clamp(cfg.duree | 0, 1, 600), t0: 0, clicks: [], running: false, raf: 0, alive: true };
  const TECH = { normal: 'Normal', jitter: 'Jitter click', butterfly: 'Butterfly', drag: 'Drag click' };
  const box = $('#ecran2d');
  const sum = a => a.reduce((x, y) => x + y, 0);
  function stats(cl, now) {
    const el = Math.max(0.001, (now - C.t0) / 1000), iv = [];
    for (let i = 1; i < cl.length; i++) iv.push(cl[i] - cl[i - 1]);
    let win = 0; for (let i = cl.length - 1; i >= 0 && now - cl[i] <= 1000; i--) win++;
    const mean = iv.length ? sum(iv) / iv.length : 0;
    return { el, iv, win, mean, avg: cl.length / el, last: iv.length ? iv[iv.length - 1] : 0, min: iv.length ? Math.min(...iv) : 0, max: iv.length ? Math.max(...iv) : 0 };
  }
  let menu = function () {
    box.innerHTML = `<div class="drill">
      <div class="drill-top glass"><div><b>Test de CPS</b>${cfg.regarder ? ' · 👁 l’ordinateur clique' : ''} · ${TECH[C.tech]} · ${C.dur} s</div><div><button class="btn" data-act="cfg">Configurer</button> <button class="btn" data-act="quit">Quitter</button></div></div>
      <div class="cps-zone" id="cpsZone">
        <div class="cps-live">
          <div><span>Clics</span><b id="cClicks">0</b></div>
          <div><span>CPS (dernière seconde)</span><b id="cWin">0</b></div>
          <div><span>CPS moyen</span><b id="cAvg">0.00</b></div>
          <div><span>Dernier écart</span><b id="cLast">—</b></div>
          <div><span>Écart min / max</span><b id="cMinMax">—</b></div>
          <div><span>Temps restant</span><b id="cLeft">${C.dur.toFixed(2)} s</b></div>
        </div>
        <canvas id="cpsLive" width="900" height="150" class="cps-canvas"></canvas>
        <div class="dim" id="cpsSub">Clique dans cette zone : le chrono part au premier clic. Chaque trait = un clic.</div>
        <div class="cps-ring" id="cpsRing"></div>
      </div>
      <p class="tips"><b>Jitter</b> : contracte l’avant-bras pour faire vibrer le doigt (10–14 CPS). <b>Butterfly</b> : deux doigts alternés sur le même bouton (15–20+). <b>Drag</b> : fais glisser le doigt sur le bouton. Arrête-toi si tu as mal au poignet.</p>
    </div>`;
    const z = $('#cpsZone');
    z.addEventListener('mousedown', e => {
      if (e.button !== 0) return; e.preventDefault();
      const t = e.timeStamp || performance.now();
      if (!C.running) { if (C.finished) return; C.running = true; C.t0 = t; C.clicks = []; loop(); }
      if (t - C.t0 > C.dur * 1000) return;
      C.clicks.push(t);
      const r = document.createElement('div'); r.className = 'ripple'; const bb = z.getBoundingClientRect();
      r.style.left = (e.clientX - bb.left) + 'px'; r.style.top = (e.clientY - bb.top) + 'px'; z.appendChild(r); setTimeout(() => r.remove(), 450);
      draw(performance.now());
    });
    z.addEventListener('contextmenu', e => e.preventDefault());
    draw(0);
  };
  // frise en direct : chaque clic est un trait à sa position exacte dans le temps ; la courbe = CPS instantané (1000 / écart)
  function draw(now) {
    const c = $('#cpsLive'); if (!c) return;
    const g = c.getContext('2d'), W = c.width, H = c.height, dur = C.dur * 1000;
    g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.1)'; g.fillStyle = '#8a92a8'; g.font = '11px system-ui';
    const stepS = C.dur <= 15 ? 1 : C.dur <= 60 ? 5 : 30;
    for (let s = 0; s <= C.dur; s += stepS) { const x = s * 1000 / dur * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); if (s < C.dur) g.fillText(s + ' s', x + 3, H - 4); }
    const maxC = 30, yOf = v => H - 16 - Math.min(v, maxC) / maxC * (H - 30);
    for (const v of [10, 20]) { g.strokeStyle = 'rgba(255,210,63,0.25)'; g.beginPath(); g.moveTo(0, yOf(v)); g.lineTo(W, yOf(v)); g.stroke(); g.fillStyle = '#c9a227'; g.fillText(v + ' CPS', W - 44, yOf(v) - 2); }
    const cl = C.clicks;
    g.strokeStyle = '#7be3b4';
    for (const t of cl) { const x = (t - C.t0) / dur * W; g.beginPath(); g.moveTo(x, H - 14); g.lineTo(x, H - 2); g.stroke(); }
    g.strokeStyle = '#5ad0ff'; g.lineWidth = 1.5; g.beginPath();
    for (let i = 1; i < cl.length; i++) { const x = (cl[i] - C.t0) / dur * W, y = yOf(1000 / Math.max(1, cl[i] - cl[i - 1])); if (i === 1) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke(); g.lineWidth = 1;
    if (C.running && now) { const x = (now - C.t0) / dur * W; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  }
  function loop() {
    if (!C.alive || !C.running) return;
    const now = performance.now(), s = stats(C.clicks, now), set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
    set('cClicks', C.clicks.length); set('cWin', s.win); set('cAvg', s.avg.toFixed(2));
    set('cLast', s.last ? s.last.toFixed(1) + ' ms' : '—'); set('cMinMax', s.iv.length ? s.min.toFixed(1) + ' / ' + s.max.toFixed(1) + ' ms' : '—');
    set('cLeft', Math.max(0, C.dur - s.el).toFixed(2) + ' s');
    const ring = $('#cpsRing'); if (ring) ring.style.setProperty('--p', Math.min(1, s.el / C.dur));
    draw(now);
    if (s.el >= C.dur) { C.running = false; C.finished = true; finish(); return; }
    C.raf = requestAnimationFrame(loop);
  }
  function finish() {
    const cl = C.clicks.filter(t => t - C.t0 <= C.dur * 1000), cps = cl.length / C.dur;
    const iv = []; for (let i = 1; i < cl.length; i++) iv.push(cl[i] - cl[i - 1]);
    const mean = iv.length ? sum(iv) / iv.length : 0, sd = iv.length ? Math.sqrt(iv.reduce((a, b) => a + (b - mean) ** 2, 0) / iv.length) : 0;
    let peak = 0; for (let i = 0, j = 0; i < cl.length; i++) { while (cl[i] - cl[j] > 1000) j++; peak = Math.max(peak, i - j + 1); }
    const perSec = Array.from({ length: C.dur }, (_, s) => cl.filter(t => t - C.t0 >= s * 1000 && t - C.t0 < (s + 1) * 1000).length);
    const reg = mean ? sd / mean * 100 : 0, sorted = iv.slice().sort((a, b) => a - b), med = sorted.length ? sorted[sorted.length >> 1] : 0;
    FP.logSession('cps', cps.toFixed(2) + ' CPS (' + TECH[C.tech] + ')');
    box.innerHTML = `<div class="panel res pop-in cps-res"><div class="dim small">Test de CPS · ${C.dur} s${cfg.regarder ? ' · ordinateur' : ''}</div><h2>${TECH[C.tech]}</h2><div class="score-big">${cps.toFixed(2)} CPS</div>
      <div class="stats">${stat('Clics comptés', cl.length)}${stat('Meilleure seconde', peak + ' CPS')}${stat('Écart moyen', mean.toFixed(1) + ' ms')}${stat('Écart médian', med.toFixed(1) + ' ms')}${stat('Écart min / max', iv.length ? sorted[0].toFixed(1) + ' / ' + sorted[sorted.length - 1].toFixed(1) + ' ms' : '—')}${stat('Irrégularité', Math.round(reg) + ' %', reg < 35)}</div>
      <div class="persec">${perSec.map((n, s) => `<span title="seconde ${s + 1}"><b>${n}</b><i>${s + 1}s</i></span>`).join('')}</div>
      <canvas id="cpsChart" width="900" height="170" class="chart"></canvas>
      <div class="advice"><h3>Ce qui compte vraiment</h3><ul>
        <li>En 1.8, l’adversaire est invulnérable 0,5 s après chaque coup : un CPS <b>régulier</b> de 10–12 suffit, il sert à toucher pile quand la fenêtre se rouvre.</li>
        <li>En 1.9+, le CPS ne sert à rien à l’épée ou à la hache : un clic par cooldown.</li>
        <li>Beaucoup de serveurs sanctionnent au-delà de ~20 CPS. Autoclicker et macros = ban.</li>${reg >= 35 ? '<li>Rythme irrégulier : vise moins vite mais plus constant pendant quelques séances.</li>' : ''}</ul></div>
      <div class="btns"><button class="btn primary big" data-act="again">Rejouer</button><button class="btn" data-act="cfg">Configurer</button><button class="btn" data-act="quit">Menu</button></div></div>`;
    C.clicks = cl; C.running = false;
    const c = $('#cpsChart'); if (c) { const old = c.id; c.id = 'cpsLive'; draw(0); c.id = old; }
  }
  box.onclick = e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'quit') FP.closeGame();
    else if (b.dataset.act === 'cfg') { FP.closeGame(); UI.showConfig('cps'); }
    else { C.finished = false; C.clicks = []; menu(); }
  };
  register({ onKey: e => { if (e.code === 'Escape' && !C.running) FP.closeGame(); }, cleanup: () => { C.alive = false; C.running = false; cancelAnimationFrame(C.raf); clearInterval(C.iv); box.onclick = null; } });
  // mode regarder : clics parfaitement réguliers à 20 CPS (la limite tolérée sur la plupart des serveurs)
  const auto = () => {
    clearInterval(C.iv); let n = 0;
    C.iv = setInterval(() => {
      const z = $('#cpsZone'); if (!C.alive || !z) { clearInterval(C.iv); return; }
      if (C.finished) { clearInterval(C.iv); return; }
      const bb = z.getBoundingClientRect();
      z.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true, clientX: bb.left + bb.width / 2 + Math.sin(n) * 40, clientY: bb.top + bb.height / 2 + Math.cos(n * 1.3) * 30 })); n++;
    }, 50);
  };
  const menu0 = menu; menu = () => { menu0(); if (cfg.regarder) setTimeout(auto, 600); };
  menu();
};

// ================================================================ démarrage
FP.onKeysReady = () => { if (!$('#settings').hidden) renderSettings(); };
function start() {
  FP.R.init($('#cv'));
  FP.setupMenuScene();
  renderMenu();
  $('#btnSettings').addEventListener('click', UI.openSettings);
  $('#settings').addEventListener('click', e => { if (e.target.id === 'settings' || e.target.closest('[data-close]')) UI.closeSettings(); });
  addEventListener('keydown', e => {
    if (e.code !== 'Escape') return;
    if (!$('#settings').hidden) UI.closeSettings();
    else if (cfgId) { cfgId = null; $('#msg').hidden = true; renderMenu(); }
  });
  FP.startLoop();
}
try { start(); } catch (e) {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', '<div class="fatal">WebGL n’est pas disponible dans ce navigateur. Active l’accélération matérielle ou essaie Chrome / Edge / Firefox.</div>');
}
})();
