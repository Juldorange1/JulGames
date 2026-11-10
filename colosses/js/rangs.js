'use strict';
/* Colosses — rangs de l'Affrontement et saisons de 3 mois.
   Le classement (points Elo) donne un rang : Bronze, Argent, Or, Platine, Diamant (chacun en III, II, I), puis Maître
   et Légende. Une saison dure un trimestre (janvier-mars, avril-juin, juillet-septembre, octobre-décembre).
   À la fin, ton meilleur rang de la saison te rapporte des cristaux et reste gravé dans ton palmarès ; tes points
   se rapprochent de 1000 (de moitié) pour que la nouvelle saison reparte sans tout effacer. */

const RANGS = [
  { cle: 'bronze', nom: 'Bronze', min: 0, col: '#cd8a52', gain: 1 },
  { cle: 'argent', nom: 'Argent', min: 1050, col: '#c9d3de', gain: 2 },
  { cle: 'or', nom: 'Or', min: 1150, col: '#ffd24d', gain: 3 },
  { cle: 'platine', nom: 'Platine', min: 1275, col: '#7fe3d4', gain: 5 },
  { cle: 'diamant', nom: 'Diamant', min: 1425, col: '#8ac6ff', gain: 7 },
  { cle: 'maitre', nom: 'Maître', min: 1600, col: '#d08bff', gain: 10, seul: true },
  { cle: 'legende', nom: 'Légende', min: 1800, col: '#ff8a5c', gain: 15, seul: true }
];
function rangAff(pts) {
  let i = 0; while (i < RANGS.length - 1 && pts >= RANGS[i + 1].min) i++;
  const r = RANGS[i], fin = i < RANGS.length - 1 ? RANGS[i + 1].min : null;
  let div = '';
  if (!r.seul && fin) { const k = Math.min(2, Math.floor((pts - r.min) / ((fin - r.min) / 3))); div = ['III', 'II', 'I'][k]; }
  return { i, cle: r.cle + div, nom: T2(r.nom) + (div ? ' ' + div : ''), col: r.col, gain: r.gain, prochain: fin };
}
const htmlRang = pts => { const r = rangAff(pts); return `<span class="rang-aff" style="--rc:${r.col}">◆ ${r.nom}</span>`; };
function saisonAff(d) {
  d = d || new Date();
  const t = Math.floor(d.getMonth() / 3);
  return { cle: d.getFullYear() + '-T' + (t + 1), nom: T2('Saison') + ' ' + (t + 1) + ' · ' + d.getFullYear(), fin: new Date(d.getFullYear(), t * 3 + 3, 0) };
}
// à chaque lecture du profil : nouvelle saison → récompense de la précédente, points rapprochés de 1000
const _profilRang = profilAff;
profilAff = function () {
  const P = _profilRang.apply(this, arguments), S = saisonAff();
  if (!P.saison) { P.saison = S.cle; P.meilleur = P.pts; }
  if (P.saison !== S.cle) {
    const r = rangAff(P.meilleur || P.pts), parties = (P.v || 0) + (P.dft || 0);
    (P.palmares = P.palmares || []).push({ s: P.saison, rang: r.nom, cle: r.cle, pts: P.meilleur || P.pts });
    if (parties > 0) { P.recompense = { s: P.saison, rang: r.nom, n: r.gain }; }
    P.pts = Math.round(1000 + (P.pts - 1000) * .5); P.meilleur = P.pts; P.v = 0; P.dft = 0; P.saison = S.cle;
    Save.write();
  }
  if (P.pts > (P.meilleur || 0)) P.meilleur = P.pts;
  return P;
};
// la récompense de fin de saison est donnée au menu (jamais pendant un combat)
const _menuRang = UI.menu;
UI.menu = function () {
  const r = _menuRang.apply(this, arguments);
  try {
    const P = profilAff();
    if (P.recompense) {
      const x = P.recompense; delete P.recompense; const k = gagnerEclats(x.n); Save.write();
      if (typeof avis === 'function') avis('🏆 ' + T2('Fin de saison') + ' : ' + x.rang + ' — +' + (k || x.n) + ' ' + T2('cristaux'));
    }
  } catch (e) { }
  return r;
};
// promotions et rétrogradations à la fin d'une partie classée
const _finRang = G.terminerDefi;
G.terminerDefi = function () {
  const avant = G.mode === 'affront' && !this.finDefi ? rangAff(profilAff().pts) : null;
  const r = _finRang.apply(this, arguments);
  try { if (avant && this.finDefi && this.finDefi.classe) { const apres = rangAff(profilAff().pts); this.finDefi.rangAvant = avant; this.finDefi.rangApres = apres; } } catch (e) { }
  return r;
};
// l'écran de fin : le rang à la place des simples points
const _ecranRang = dessinerEcranDefi;
dessinerEcranDefi = function (c) {
  _ecranRang.apply(this, arguments);
  const f = G.finDefi; if (!f || !f.rangApres || !G.defi || G.defi.type !== 'affront') return;
  const a = f.rangAvant, b = f.rangApres, y = 250 + f.classement.length * 62 + 52;
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
  const monte = b.i > a.i || (b.i === a.i && b.cle !== a.cle && b.cle.length < a.cle.length), change = a.cle !== b.cle;
  texteOmbre(c, change ? (monte ? '▲ ' + T2('Promotion') + ' : ' : '▼ ' + T2('Rétrogradation') + ' : ') + b.nom : '◆ ' + b.nom, W / 2, y, change ? (monte ? '#7dffb0' : '#ff8a9a') : b.col, `900 24px ${POLICE}`, 5);
  if (b.prochain) { c.font = `14px ${POLICE}`; c.fillStyle = '#b8b0cc'; c.fillText(T2('Rang suivant dans') + ' ' + Math.max(0, b.prochain - profilAff().pts) + ' pts · ' + saisonAff().nom, W / 2, y + 26); }
  c.restore();
};
