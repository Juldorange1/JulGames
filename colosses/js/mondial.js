'use strict';
/* Colosses — classement mondial : Défi du jour, Survie, Abysses, Chasse de la semaine et Affrontement
   (pas les parties Apprenti, Guerrier, Cauchemar). Les scores sont rangés sur textdb.dev, un stockage public et
   gratuit sans compte : chaque tableau est un petit texte JSON (les 100 meilleurs). Seuls ton pseudo et ton score
   y sont envoyés. Pas de serveur à nous : on ne peut pas empêcher quelqu'un de tricher, mais on nettoie ce qu'on lit. */

const MONDIAL_URL = 'https://textdb.dev/api/data/colosses-mondial-v1-';
const MONDIAL_TESTS = /[?&]muet\b/.test(location.search); // les tests automatiques n'envoient rien
const TABLEAUX = {
  jour: { nom: 'Défi du jour', ico: '📅',
    cle() { return 'jour-' + defiCourant('jour').cle; },
    F() { return FORMATS[defiCourant('jour').format]; },
    sens() { return this.F().sens || 1; }, fmt(v) { return this.F().fmt(v); },
    mien() { const x = defiCourant('jour'), r = Save.d.defis.jour; return r && r.cle === x.cle && r.format === x.format && r.best && r.best.score !== undefined && r.best.score !== null ? r.best.score : null; },
    sous() { const x = defiCourant('jour'); return FORMATS[x.format].nom + ' · ' + x.cle; } },
  survie: { nom: 'Survie', ico: '🛡', cle: () => 'survie', sens: () => 1, fmt: v => fmtTemps(v),
    mien() { const r = Save.d.defis.survie; return r && r.best && r.best.score ? r.best.score : null; } },
  abysses: { nom: 'Abysses', ico: '🌌', cle: () => 'abysses', sens: () => 1, fmt: v => T2('profondeur') + ' ' + v,
    mien() { return (Save.d.abysses || {}).best || null; } },
  chasse: { nom: 'Chasse', ico: '🎯',
    cle() { const c = chasseCourante(); return 'chasse-' + c.cle + '-' + c.esp; }, sens: () => 1, fmt: v => fmtPct(v),
    mien() { const c = chasseCourante(); return c.bestP || null; },
    sous() { const c = chasseCourante(); return ESPECES[c.esp].nom + ' · ' + c.cle; } },
  affront: { nom: 'Affrontement', ico: '⚔',
    cle() { return 'affront-' + saisonAff().cle; }, sens: () => 1, fmt: v => rangAff(v).nom + ' · ' + v + ' pts',
    mien() { const P = profilAff(); return (P.v || 0) + (P.dft || 0) > 0 ? P.pts : null; },
    sous() { return saisonAff().nom; } }
};
const Mondial = {
  cache: {}, attente: {}, bloque: MONDIAL_TESTS,
  pseudo() { return propre((Save.d.pseudo || '').trim()) || (T2('Joueur') + '-' + String(profilAff() && Save.d.idJ).slice(0, 4)); },
  async lire(t) {
    const T = TABLEAUX[t], cle = T.cle();
    try {
      const r = await fetch(MONDIAL_URL + cle + '?t=' + Date.now(), { cache: 'no-store' });
      let o = null; try { o = JSON.parse(await r.text()); } catch (e) { o = null; }
      const l = (o && Array.isArray(o.l) ? o.l : []).filter(x => x && typeof x.i === 'string' && Number.isFinite(+x.s))
        .map(x => ({ i: x.i.replace(/[^a-z0-9]/g, '').slice(0, 12), n: propre(x.n) || '?', s: +x.s, t: +x.t || 0 }));
      const s = T.sens(); l.sort((a, b) => s > 0 ? b.s - a.s : a.s - b.s);
      return (this.cache[t] = { cle, l: l.slice(0, 100), ok: r.ok });
    } catch (e) { return (this.cache[t] = { cle, l: [], ok: false }); }
  },
  // envoie ton meilleur score s'il améliore ta place (ou si ton pseudo a changé)
  async envoyer(t) {
    if (this.bloque || this.attente[t]) return;
    const T = TABLEAUX[t], s = T.mien(); if (s === null || s === undefined) return;
    this.attente[t] = true;
    try {
      profilAff();
      for (let essai = 0; essai < 3; essai++) {
        const B = await this.lire(t); if (!B.ok && B.l.length === 0 && essai === 0) { /* tableau neuf ou réseau absent */ }
        const moi = B.l.find(x => x.i === Save.d.idJ), mieux = !moi || (T.sens() > 0 ? s > moi.s : s < moi.s) || moi.n !== this.pseudo();
        if (!mieux) return;
        const l = B.l.filter(x => x.i !== Save.d.idJ); l.push({ i: Save.d.idJ, n: this.pseudo(), s, t: Date.now() });
        l.sort((a, b) => T.sens() > 0 ? b.s - a.s : a.s - b.s);
        await fetch(MONDIAL_URL + B.cle, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ v: 1, l: l.slice(0, 100) }) });
        // quelqu'un a pu écrire en même temps : on vérifie, et on recommence si notre score a été écrasé
        await new Promise(r => setTimeout(r, 1200));
        const V = await this.lire(t); if (V.l.some(x => x.i === Save.d.idJ && x.s === s)) return;
      }
    } catch (e) { } finally { this.attente[t] = false; if (UI.mondialOuvert) UI.mondial(); }
  },
  toutEnvoyer() { for (const t in TABLEAUX) this.envoyer(t); }
};
// après chaque partie de ces modes, le meilleur score part au classement mondial
const _finMondial = G.terminerDefi;
G.terminerDefi = function () {
  const r = _finMondial.apply(this, arguments);
  try { const t = this.defi && this.defi.type; if (TABLEAUX[t]) setTimeout(() => Mondial.envoyer(t), 500); } catch (e) { }
  return r;
};
const _chasseMondial = noterChasse;
noterChasse = function () { const r = _chasseMondial.apply(this, arguments); setTimeout(() => Mondial.envoyer('chasse'), 500); return r; };
setTimeout(() => { try { Mondial.toutEnvoyer(); } catch (e) { } }, 8000); // au lancement : rattraper ce qui n'a pas pu partir

// ---------- l'écran ----------
UI.mondial = function (onglet) {
  onglet = onglet || this.ongletMondial || 'jour'; this.ongletMondial = onglet;
  const T = TABLEAUX[onglet], B = Mondial.cache[onglet], moi = Save.d.idJ;
  let corps;
  if (!B || B.cle !== T.cle()) { corps = `<p class="mini">${T2('Chargement…')}</p>`; Mondial.lire(onglet).then(() => { if (this.mondialOuvert && this.ongletMondial === onglet) this.mondial(onglet); }); }
  else if (!B.l.length) corps = `<p class="mini">${B.ok ? T2('Personne n\'est encore classé : sois le premier !') : T2('Classement indisponible : vérifie Internet.')}</p>`;
  else {
    const ma = B.l.findIndex(x => x.i === moi);
    corps = `<ol class="mo-liste">${B.l.slice(0, 50).map((x, k) => `<li class="${x.i === moi ? 'moi' : ''}"><span class="mo-n">${k < 3 ? ['🥇', '🥈', '🥉'][k] : k + 1}</span><b>${x.n}</b><span class="mo-s">${T.fmt(x.s)}</span></li>`).join('')}</ol>`
      + (ma >= 50 ? `<p class="mo-moi">${T2('Ta place')} : <b>${ma + 1}</b> · ${T.fmt(B.l[ma].s)}</p>` : ma < 0 ? `<p class="mini">${T.mien() === null ? T2('Tu n\'as pas encore de score ici.') : T2('Ton score n\'est pas dans les 100 premiers.')}</p>` : '');
  }
  const onglets = Object.entries(TABLEAUX).map(([k, v]) => `<button data-a="mondialOnglet" data-o="${k}" class="${k === onglet ? 'actif' : ''}">${v.ico} ${T2(v.nom)}</button>`).join('');
  this.ecran('🌍 ' + T2('Classement mondial'), `
    <div class="onglets">${onglets}</div>
    ${T.sous ? `<p class="mini mo-sous">${T.sous()}</p>` : ''}
    ${corps}
    <div class="rang"><button data-a="mondialMaj">↻ ${T2('Actualiser')}</button></div>
    <p class="mini">${T2('Ton pseudo')} : <b>${Mondial.pseudo()}</b> · ${T2('Seuls ton pseudo et tes meilleurs scores sont envoyés. Les parties Apprenti, Guerrier et Cauchemar ne sont pas classées.')}</p>`, 'mondial');
  this.mondialOuvert = true;
};
const _menuMondial = UI.menu;
UI.menu = function () {
  this.mondialOuvert = false;
  const r = _menuMondial.apply(this, arguments);
  try {
    const g = this.el.querySelector('.accueil .tuiles');
    if (g && !g.querySelector('[data-a=mondial]')) {
      const b = document.createElement('button'); b.className = 'tuile'; b.dataset.a = 'mondial';
      b.innerHTML = `<span>🌍</span>${T2('Classement')}`;
      b.addEventListener('click', ev => { ev.stopPropagation(); Son.init(); Son.play('clic'); Mondial.toutEnvoyer(); UI.mondial(); });
      const opt = g.querySelector('[data-a=options]'); if (opt) g.insertBefore(b, opt); else g.appendChild(b);
      try { if (typeof iconiser === 'function') iconiser(b); } catch (e) { }
      if (typeof ajusterAccueil === 'function') ajusterAccueil();
    }
  } catch (e) { }
  return r;
};
const _actMondial = UI.action;
UI.action = function (a, btn) {
  if (a === 'mondialOnglet') return this.mondial(btn.dataset.o);
  if (a === 'mondialMaj') { delete Mondial.cache[this.ongletMondial]; Mondial.toutEnvoyer(); return this.mondial(); }
  return _actMondial.call(this, a, btn);
};
