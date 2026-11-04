'use strict';
/* Colosses — affichage des icônes (données dans icones-data.js). Chaque objet du jeu porte un code d'icône ⟦clé⟧ ;
   les menus le transforment en image vectorielle et le dessin du jeu le peint directement. */

function ICO(k) { return '⟦' + k + '⟧'; }
function icoCle(v) { const m = /^⟦([^⟧]+)⟧$/.exec(v || ''); return m ? m[1] : v; }
function icoSVG(k, cls) { const n = ICO_CLE[k]; return n ? `<svg class="ico-svg ${cls || ''}" viewBox="0 0 512 512" aria-hidden="true"><path d="${ICO_PATH[n]}"/></svg>` : ''; }
const _icoP2D = {};
function icoDessin(c, v, x, y, taille, col, ombre) {
  const n = ICO_CLE[icoCle(v)];
  if (!n || typeof Path2D === 'undefined') return false;
  const P = _icoP2D[n] || (_icoP2D[n] = new Path2D(ICO_PATH[n]));
  c.save(); c.translate(x - taille / 2, y - taille / 2); c.scale(taille / 512, taille / 512);
  if (ombre !== false) { c.shadowColor = 'rgba(0,0,0,.85)'; c.shadowBlur = 8; }
  c.fillStyle = col || '#ecdcb4'; c.fill(P); c.restore();
  return true;
}
// texte d'un objet sans son code d'icône (pour les infobulles et les listes déroulantes)
function sansIco(s) { return String(s || '').replace(/⟦[^⟧]*⟧\s*/g, ''); }

// ---------- chaque objet du jeu reçoit son icône ----------
for (const [cat, l] of [['p', PRIM], ['s', SPEC], ['t', TAL]]) for (const a of l) if (ICO_CLE[cat + ':' + a.id]) a.ico = ICO(cat + ':' + a.id);
for (const k in TRAITS) if (ICO_CLE['tr:' + k]) TRAITS[k].ico = ICO('tr:' + k);
for (const k in MUTATEURS) if (ICO_CLE['m:' + k]) MUTATEURS[k].ico = ICO('m:' + k);
for (const k in FORMATS) if (ICO_CLE['fmt:' + k]) FORMATS[k].ico = ICO('fmt:' + k);
for (const k in FAMILLES) if (ICO_CLE['f:' + k]) FAMILLES[k].ico = ICO('f:' + k);
Object.assign(DIFFS.apprenti, { ico: ICO('ui:apprenti') }); Object.assign(DIFFS.guerrier, { ico: ICO('ui:guerrier') }); Object.assign(DIFFS.cauchemar, { ico: ICO('ui:cauchemar') });

// ---------- dans les menus : codes et anciens emoji deviennent des icônes ----------
const EMOJI_ICO = {
  '💎': 'ui:cristal', '🎁': 'ui:cadeau', '🛒': 'ui:panier', '⚙': 'ui:options', '📖': 'ui:codex', '📊': 'ui:stats', '👕': 'ui:garderobe',
  '🎲': 'ui:affinites', '⚒': 'ui:forge', '🏆': 'ui:trophee', '🌌': 'ui:abysses', '🎯': 'ui:chasse', '▶': 'ui:jouer', '↻': 'ui:recommencer',
  '⏭': 'ui:passer', '🏠': 'ui:maison', '★': 'ui:etoile', '☆': 'ui:etoile', '✦': 'ui:legende', '🔫': 'ui:arme', '💥': 'ui:special', '💨': 'ui:talent',
  '⏸': 'ui:pause', '🔊': 'ui:son', '⛶': 'ui:plein', '🎮': 'ui:jeu', '⌨': 'ui:touches', '🖼': 'ui:image', '✔': 'ui:ok', '✕': 'ui:non', '💡': 'ui:idee',
  '⏳': 'ui:sablier', '⏻': 'ui:non', '♥': 'ui:vie', '⚡': 'ui:energie', '❔': 'ui:aide', '🔴': 'ui:vie', '🧠': 'ui:codex', '📈': 'ui:stats', '⬆': 'ui:retour', '⬇': 'ui:retour', '⬅': 'ui:retour', '➡': 'ui:retour'
};
const RE_ICO = new RegExp('⟦([^⟧]+)⟧|(' + Object.keys(EMOJI_ICO).map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')️?', 'gu');
function iconiser(racine) {
  const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT), noeuds = [];
  while (w.nextNode()) noeuds.push(w.currentNode);
  for (const t of noeuds) {
    const s = t.nodeValue; RE_ICO.lastIndex = 0;
    if (!RE_ICO.test(s)) continue;
    const parent = t.parentNode;
    if (parent && (parent.tagName === 'OPTION' || parent.tagName === 'TEXTAREA')) { t.nodeValue = s.replace(RE_ICO, ''); continue; }
    const frag = document.createDocumentFragment(); let i = 0; RE_ICO.lastIndex = 0; let m;
    while ((m = RE_ICO.exec(s))) {
      if (m.index > i) frag.append(s.slice(i, m.index));
      const cle = m[1] || EMOJI_ICO[m[2]], sp = document.createElement('span');
      sp.className = 'ico-i' + (m[2] === '☆' ? ' vide' : ''); sp.innerHTML = icoSVG(cle); frag.append(sp);
      i = m.index + m[0].length;
    }
    if (i < s.length) frag.append(s.slice(i));
    t.replaceWith(frag);
  }
  for (const el of racine.querySelectorAll('[title]')) el.title = el.title.replace(RE_ICO, '').trim();
}
const _montrerUI = UI.montrer.bind(UI);
UI.montrer = function (html, classe) { _montrerUI(html, classe); try { iconiser(this.el); } catch (e) { } };
