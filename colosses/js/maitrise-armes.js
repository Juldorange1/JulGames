'use strict';
/* Colosses — maîtrise des armes : plus tu combats avec une arme (principale, spéciale ou talent), plus sa maîtrise
   monte. Il suffit de jouer normalement : seul le temps passé en combat compte, pas la façon de jouer.
   La maîtrise ne donne aucune puissance : un rang affiché, des cristaux à chaque niveau, et le titre de Maître. */

const MAITRISE_PALIERS = [3, 8, 15, 30, 50, 80, 120, 180, 270, 400]; // minutes de combat cumulées
const MAITRISE_NOMS = ['Novice', 'Initié', 'Habitué', 'Adroit', 'Expert', 'Vétéran', 'Maître', 'Grand maître', 'Légende', 'Mythe'];
function maitriseSave() { return Save.d.maitriseArmes = Save.d.maitriseArmes || { t: {}, vus: {} }; } // (Save.d.maitrise sert déjà aux hauts faits)
function niveauMaitrise(sec) { const m = (sec || 0) / 60; let n = 0; while (n < MAITRISE_PALIERS.length && m >= MAITRISE_PALIERS[n]) n++; return n; }
function infoMaitrise(cle) {
  const sec = maitriseSave().t[cle] || 0, n = niveauMaitrise(sec), lo = n ? MAITRISE_PALIERS[n - 1] * 60 : 0, hi = n < MAITRISE_PALIERS.length ? MAITRISE_PALIERS[n] * 60 : null;
  return { sec, n, nom: n ? T2(MAITRISE_NOMS[n - 1]) : '—', k: hi ? (sec - lo) / (hi - lo) : 1, reste: hi ? hi - sec : 0 };
}
// le temps de combat s'ajoute aux trois armes équipées (seulement quand on joue vraiment : en combat, vivant)
let _maitriseEcrit = 0;
const _majMaitrise = majCombat;
majCombat = function (dt) {
  const t0 = G.t;
  _majMaitrise.apply(this, arguments);
  try {
    if (G.etat !== 'combat' || !G.p || G.p.hp <= 0 || !G.ars || !G.boss || G.boss.intro > 0) return;
    const d = Math.min(.1, Math.max(0, G.t - t0)), M = maitriseSave();
    for (const c of ['p', 's', 't']) {
      if (G.format && G.format() === 'danse' && c !== 't') continue; // sans arme en Danse
      const k = c + ':' + G.ars[c], n0 = niveauMaitrise(M.t[k]); M.t[k] = (M.t[k] || 0) + d;
      const n1 = niveauMaitrise(M.t[k]); if (n1 > n0) (M.nouveaux = M.nouveaux || []).push({ k, n: n1 });
    }
    if ((_maitriseEcrit += d) > 10) { _maitriseEcrit = 0; Save.write(); }
  } catch (e) { }
};
// les niveaux gagnés sont annoncés au menu (jamais pendant le combat) et rapportent des cristaux
const _menuMaitrise = UI.menu;
UI.menu = function () {
  const r = _menuMaitrise.apply(this, arguments);
  try {
    const M = maitriseSave();
    if (M.nouveaux && M.nouveaux.length) {
      const l = M.nouveaux; M.nouveaux = [];
      let n = 0; for (const x of l) n += x.n >= 7 ? 3 : x.n >= 4 ? 2 : 1;
      const k = gagnerEclats(n); Save.write();
      const nom = x => { const [c, id] = x.k.split(':'), a = trouveArme(c, id); return a ? sansIco(a.nom) : id; };
      if (typeof avis === 'function') avis('⚔ ' + T2('Maîtrise') + ' : ' + l.map(x => nom(x) + ' → ' + T2(MAITRISE_NOMS[x.n - 1])).join(', ') + ' · +' + (k || n) + ' ' + T2('cristaux'));
    }
    // une tuile Maîtrise avec les autres
    const g = this.el.querySelector('.accueil .tuiles');
    if (g && !g.querySelector('[data-a=maitrise]')) {
      const b = document.createElement('button'); b.className = 'tuile'; b.dataset.a = 'maitrise';
      const best = Math.max(0, ...Object.values(M.t).map(niveauMaitrise));
      b.innerHTML = `<span>⚔</span>${T2('Maîtrise')}${best ? `<small>${T2(MAITRISE_NOMS[best - 1])}</small>` : ''}`;
      b.addEventListener('click', ev => { ev.stopPropagation(); Son.init(); Son.play('clic'); UI.maitrise(); });
      const opt = g.querySelector('[data-a=options]'); if (opt) g.insertBefore(b, opt); else g.appendChild(b);
      try { if (typeof iconiser === 'function') iconiser(b); } catch (e) { }
      if (typeof ajusterAccueil === 'function') ajusterAccueil();
    }
  } catch (e) { console.warn('maîtrise', e); }
  return r;
};
UI.maitrise = function (onglet) {
  onglet = onglet || this.ongletMaitrise || 'p'; this.ongletMaitrise = onglet;
  const L = { p: [T2('Armes'), PRIM], s: [T2('Spéciales'), SPEC], t: [T2('Talents'), TAL] };
  const fmtT = s => s >= 3600 ? Math.floor(s / 3600) + ' h ' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') : Math.floor(s / 60) + ' min';
  const lignes = L[onglet][1].map(a => ({ a, i: infoMaitrise(onglet + ':' + a.id) })).sort((x, y) => y.i.sec - x.i.sec);
  const corps = lignes.map(({ a, i }) => `<div class="mt-l ${i.sec ? '' : 'vide'}"><span class="mt-ico">${a.ico}</span><span class="mt-nom"><b>${a.nom}</b><small>${i.sec ? fmtT(i.sec) + ' ' + T2('de combat') : T2('jamais jouée')}</small></span>
    <span class="mt-niv" style="--n:${i.n}">${i.n ? T2('Niv.') + ' ' + i.n + ' · ' + i.nom : '—'}</span><span class="mt-barre"><i style="width:${Math.round(i.k * 100)}%"></i></span></div>`).join('');
  this.ecran('⚔ ' + T2('Maîtrise des armes'), `
    <p class="mini">${T2('Plus tu combats avec une arme, plus sa maîtrise monte : il suffit de jouer normalement. Chaque niveau rapporte des cristaux, aucune puissance.')}</p>
    <div class="onglets">${Object.entries(L).map(([k, v]) => `<button data-a="maitriseOnglet" data-o="${k}" class="${k === onglet ? 'actif' : ''}">${v[0]}</button>`).join('')}</div>
    <div class="mt-liste">${corps}</div>`, 'large');
};
const _actMaitrise = UI.action;
UI.action = function (a, btn) {
  if (a === 'maitrise') return this.maitrise();
  if (a === 'maitriseOnglet') return this.maitrise(btn.dataset.o);
  return _actMaitrise.call(this, a, btn);
};
