'use strict';
/* Colosses — deux modes de plus.
   • Marathon : tous les colosses du bestiaire à la suite, dans l'ordre, une seule vie, chronométré.
     Vie restaurée entre deux colosses ; chaque colosse a moins de vie qu'en partie normale.
   • Parties à graine : un code (ex. G7QF-2MXA) fixe une partie de 6 boss (dont 2 méga boss) avec leurs armes
     et la difficulté. Donne le code à un ami : il joue exactement la même partie, et vous comparez vos temps. */

FORMATS.marathon = { nom: 'Marathon', ico: '🏃', obj: 'Tous les colosses à la suite, une seule vie : le plus vite possible', sens: -1, score: r => r.reussi ? Math.round(r.temps * 10) / 10 : null, fmt: v => fmtTemps(v) };
FORMATS.graine = { nom: 'Partie à graine', ico: '🌱', obj: 'Une partie fixe de 6 boss, la même pour tous ceux qui ont le code : le plus vite possible', sens: -1, score: r => r.reussi ? Math.round(r.temps * 10) / 10 : null, fmt: v => fmtTemps(v) };
const MARATHON_SALLE = 10, MARATHON_PV = .5, GRAINE_SALLES = [2, 4, 5, 7, 9, 10], GRAINE_PV = .7;

// lance un mode à boss fixés (même mécanique que les défis)
G.lancerFixe = function (df) {
  this.mode = df.type; this.finDefi = null;
  this.defi = Object.assign(df, { i: 0, temps: 0, tues: 0, degats: 0, coups: 0, mut: [] });
  Save.d.defis[df.type] = df.type === 'graine' ? ((Save.d.graines || {})[df.cle] || { cle: df.cle, best: null, essais: 0 }) : (Save.d.defis[df.type] && Save.d.defis[df.type].cle === df.cle ? Save.d.defis[df.type] : { cle: df.cle, best: null, essais: 0 });
  Save.d.defis[df.type].essais++;
  Save.write();
  calcStats();
  this.p = creerJoueur(DF().pv); this.ars = null;
  this.entrerSalle();
};

// ---------- Marathon ----------
function marathonListe() { return ESP_TOUTES(); }
G.lancerMarathon = function () {
  const ids = marathonListe(), r = RNG(hashStr('marathon-' + Date.now()));
  const boss = ids.map(e => ({ salle: MARATHON_SALLE, seed: r.int(1, 2e9), mega: false, esp: e, ars: { p: r.pick(PRIM).id, s: r.pick(SPEC).id, t: r.pick(TAL).id } }));
  this.lancerFixe({ type: 'marathon', format: 'marathon', cle: 'marathon', boss });
};
function marathonSave() { return Save.d.marathon = Save.d.marathon || { best: null, loin: 0, fini: 0 }; }

// ---------- Graines ----------
const ALPHA_G = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', DIFF_G = { A: 'apprenti', G: 'guerrier', C: 'cauchemar' };
function nouvelleGraine() {
  const l = { apprenti: 'A', guerrier: 'G', cauchemar: 'C' }[Save.d.diff] || 'G';
  let s = l; for (let i = 0; i < 7; i++) s += ALPHA_G[Math.floor(Math.random() * ALPHA_G.length)];
  return s.slice(0, 4) + '-' + s.slice(4);
}
// « g7qf 2mxa » → « G7QF-2MXA » (null si le code n'est pas valable)
function lireGraine(txt) {
  const s = String(txt || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== 8 || !DIFF_G[s[0]] || [...s.slice(1)].some(ch => !ALPHA_G.includes(ch))) return null;
  return s.slice(0, 4) + '-' + s.slice(4);
}
function partieGraine(code) {
  const r = RNG(hashStr('colosses-graine-' + code));
  let prev = {};
  const boss = GRAINE_SALLES.map(salle => {
    const ars = {}; for (const [c, l] of [['p', PRIM], ['s', SPEC], ['t', TAL]]) { const ok = l.filter(a => a.id !== prev[c]); ars[c] = ok[Math.floor(r() * ok.length)].id; }
    prev = ars;
    return { salle, seed: r.int(1, 2e9), mega: salle % 5 === 0, ars };
  });
  return { type: 'graine', format: 'graine', cle: code, boss };
}
G.lancerGraine = function (code) {
  code = lireGraine(code); if (!code) return false;
  const diff = DIFF_G[code[0]];
  if (Save.d.diff !== diff) { if (!Save.d.diffAvantGraine) Save.d.diffAvantGraine = Save.d.diff; Save.d.diff = diff; }
  const G0 = Save.d.graines = Save.d.graines || {};
  if (!G0[code]) G0[code] = { cle: code, best: null, essais: 0, date: Date.now() };
  G0[code].date = Date.now();
  // on garde les 12 dernières graines jouées
  const cles = Object.keys(G0).sort((a, b) => (G0[b].date || 0) - (G0[a].date || 0));
  for (const k of cles.slice(12)) delete G0[k];
  this.lancerFixe(partieGraine(code));
  return true;
};

// ---------- branchements ----------
// Marathon : l'espèce de chaque colosse est imposée, et il a moins de vie
const _genFixe = genBoss;
genBoss = function (salle, seed, mega, eviter) {
  const def = _genFixe.apply(this, arguments);
  try {
    if (def && G.defi && G.defi.boss && !G.finDefi && (G.mode === 'marathon' || G.mode === 'graine')) {
      const b = G.defi.boss[G.defi.i];
      if (b && b.seed === seed) def.hpMax = Math.round(def.hpMax * (G.mode === 'marathon' ? MARATHON_PV : GRAINE_PV));
    }
  } catch (e) { }
  return def;
};
const _entrerFixe = G.entrerSalle;
G.entrerSalle = function () {
  if (this.mode === 'marathon' && this.defi && this.defi.boss[this.defi.i]) ESP_FORCE = this.defi.boss[this.defi.i].esp;
  try { return _entrerFixe.apply(this, arguments); } finally { ESP_FORCE = null; }
};
// recommencer = toute la partie depuis le début (une seule vie)
const _recFixe = G.recommencer;
G.recommencer = function () {
  if (this.mode === 'marathon') return this.lancerMarathon();
  if (this.mode === 'graine' && this.defi) return this.lancerGraine(this.defi.cle);
  return _recFixe.apply(this, arguments);
};
const _relFixe = G.relancer;
G.relancer = function () {
  if (this.mode === 'marathon' || this.mode === 'graine') { this.finDefi = null; return this.recommencer(); }
  return _relFixe.apply(this, arguments);
};
// fin : record, plus loin, cristaux (bonus de fin de Marathon : Apprenti 8, Guerrier 15, Cauchemar 30)
const _finFixe = G.terminerDefi;
G.terminerDefi = function (reussi) {
  const deja = !!this.finDefi, df = this.defi;
  const r = _finFixe.apply(this, arguments);
  if (deja || !df || !this.finDefi) return r;
  const res = this.finDefi;
  if (df.type === 'marathon') {
    const M = marathonSave(); res.ancienLoin = M.loin; M.loin = Math.max(M.loin, res.tues);
    if (reussi) { M.fini++; if (!M.best || res.temps < M.best) M.best = Math.round(res.temps * 10) / 10; const n = { apprenti: 8, guerrier: 15, cauchemar: 30 }[Save.d.diff] || 15; gagnerEclats(n); res.cristauxBonus = (res.cristauxBonus || 0) + n; statPlus('defisReussis'); }
  }
  if (df.type === 'graine') {
    const G0 = Save.d.graines = Save.d.graines || {};
    G0[df.cle] = Object.assign(Save.d.defis.graine || {}, { cle: df.cle, date: Date.now() });
    if (reussi && !G0[df.cle].paye) { G0[df.cle].paye = 1; const n = { apprenti: 2, guerrier: 4, cauchemar: 8 }[Save.d.diff] || 4; gagnerEclats(n); res.cristauxBonus = (res.cristauxBonus || 0) + n; }
  }
  Save.write();
  return r;
};
// écran de fin : colosses vaincus (Marathon) ou code à partager (graine)
const _ecranFixe = dessinerEcranDefi;
dessinerEcranDefi = function (c) {
  _ecranFixe(c);
  const df = G.defi, f = G.finDefi; if (!df || !f) return;
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
  if (df.type === 'marathon') {
    const M = marathonSave();
    texteOmbre(c, 'Colosses vaincus : ' + f.tues + ' / ' + df.boss.length, W / 2, 440, '#e8e2f5', `800 22px ${POLICE}`, 4);
    c.font = `600 16px ${POLICE}`; c.fillStyle = '#b8b0cc'; c.fillText('Plus loin : ' + M.loin + ' / ' + df.boss.length + (M.best ? ' · meilleur temps : ' + fmtTemps(M.best) : ''), W / 2, 474);
  } else if (df.type === 'graine') {
    texteOmbre(c, 'Code : ' + df.cle, W / 2, 440, '#9dffc4', `900 26px ${POLICE}`, 5);
    c.font = `600 16px ${POLICE}`; c.fillStyle = '#b8b0cc'; c.fillText('Donne ce code à un ami : il jouera exactement la même partie.', W / 2, 476);
  }
  c.restore();
};
// revenir au menu rend la difficulté choisie avant une partie à graine
const _menuFixe = UI.menu;
UI.menu = function () {
  if (Save.d.diffAvantGraine) { Save.d.diff = Save.d.diffAvantGraine; delete Save.d.diffAvantGraine; Save.write(); calcStats(); }
  const r = _menuFixe.apply(this, arguments);
  try {
    const grille = this.el && this.el.querySelector('.defis2');
    if (grille) {
      const M = marathonSave(), nG = Object.keys(Save.d.graines || {}).length;
      const html = `<button class="defi2 d-marathon" data-a="marathon" title="${FORMATS.marathon.obj}"><span class="di">🏃</span><span class="dtx"><b>Marathon</b><span class="dm">les ${marathonListe().length} colosses à la suite · 1 vie</span></span><span class="dr">${M.best ? '🏆<small>' + fmtTemps(M.best) + '</small>' : M.loin ? M.loin + '/' + marathonListe().length : '—'}</span></button>
        <button class="defi2 d-graine" data-a="graines" title="${FORMATS.graine.obj}"><span class="di">🌱</span><span class="dtx"><b>Parties à graine</b><span class="dm">un code = la même partie qu'un ami</span></span><span class="dr">${nG ? nG + ' <small>code(s)</small>' : '—'}</span></button>`;
      const tmp = document.createElement('div'); tmp.innerHTML = html;
      const chasse = grille.querySelector('.d-chasse');
      for (const el of [...tmp.children]) { grille.insertBefore(el, chasse || null); el.addEventListener('click', ev => { ev.stopPropagation(); Son.init(); Son.play('clic'); this.action(el.dataset.a, el); }); }
      if (typeof Langue !== 'undefined' && Langue.en) Langue.dom(grille);
    }
  } catch (e) { console.warn('menu modes', e); }
  return r;
};
// écran des graines
UI.graines = function (msg) {
  const G0 = Save.d.graines || {}, cles = Object.keys(G0).sort((a, b) => (G0[b].date || 0) - (G0[a].date || 0));
  const nomD = k => { const d = DIFFS[DIFF_G[k[0]]]; return d ? d.ico + ' ' + d.nom : ''; };
  const lignes = cles.map(k => { const g = G0[k], b = g.best && g.best.score !== undefined ? fmtTemps(g.best.score) : '—'; return `<tr><td><b class="g-code">${k}</b><small>${nomD(k)}</small></td><td>${b}</td><td>${g.essais || 0}</td><td><button data-a="graineGo" data-k="${k}">▶ Jouer</button> <button data-a="graineCopie" data-k="${k}">📋 Copier</button></td></tr>`; }).join('');
  this.ecran('🌱 Parties à graine', `
    <p class="mini">Une graine fixe une partie entière : 6 boss (dont 2 méga boss), toujours les mêmes, avec les mêmes armes et la même difficulté. Donne ton code à un ami : il jouera exactement la même partie, et vous comparerez vos temps. Une graine réussie pour la première fois donne des cristaux.</p>
    <div class="bloc"><h3>Jouer un code</h3><div class="rang"><input id="g-code" maxlength="12" placeholder="ex. G7QF-2MXA" style="font-size:20px;letter-spacing:.12em;width:220px;background:rgba(0,0,0,.45);color:#f1e6c8;border:1px solid rgba(201,168,101,.4);border-radius:4px;padding:8px 10px"><button data-a="graineSaisie">▶ Jouer ce code</button></div>
    ${msg ? `<p class="mini amis-msg">${msg}</p>` : ''}</div>
    <div class="bloc"><h3>Nouvelle graine</h3><div class="rang"><button data-a="graineNew" data-def>🎲 Créer une graine (${DF().ico} ${DF().nom})</button></div><p class="mini">La difficulté du code est celle que tu as choisie au menu.</p></div>
    ${lignes ? `<div class="bloc"><h3>Tes graines</h3><table class="amis-t"><tr><th>Code</th><th>Meilleur temps</th><th>Essais</th><th></th></tr>${lignes}</table></div>` : ''}`);
  const inp = this.el.querySelector('#g-code');
  if (inp) inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); this.action('graineSaisie'); } });
  if (inp) inp.addEventListener('input', () => { const p = inp.selectionStart; inp.value = inp.value.toUpperCase(); try { inp.setSelectionRange(p, p); } catch (e) { } });
};
const _actionFixe = UI.action;
UI.action = function (a, btn) {
  switch (a) {
    case 'marathon': this.cacher(); G.lancerMarathon(); return;
    case 'graines': this.graines(); return;
    case 'graineNew': { const k = nouvelleGraine(); this.cacher(); G.lancerGraine(k); return; }
    case 'graineGo': this.cacher(); G.lancerGraine(btn.dataset.k); return;
    case 'graineSaisie': { const inp = this.el.querySelector('#g-code'), k = lireGraine(inp && inp.value); if (!k) { this.graines('Code non valable : 8 caractères, par exemple G7QF-2MXA.'); return; } this.cacher(); G.lancerGraine(k); return; }
    case 'graineCopie': { const k = btn.dataset.k; try { navigator.clipboard.writeText(k); } catch (e) { } btn.textContent = '✔ Copié'; return; }
  }
  return _actionFixe.call(this, a, btn);
};
