'use strict';
/* Colosses — les anciennes visières sont devenues des apparences de CURSEUR : chacune change la forme et la couleur du
   viseur en combat et de la souris dans les menus (les plus rares tournent et brillent). Le héros garde sa visière de base.
   Le curseur de base laisse le viseur choisi dans les paramètres. */

const STYLE_CURSEUR = { bronze: 'anneau', foret: 'feuille', cendre: 'croix', marine: 'losange', givre: 'flocon', sang: 'goutte', venin: 'crocs', braise: 'flamme', foudre: 'eclair', saphir: 'gemme',
  neant: 'oeil', volcan: 'flamme', lotus: 'fleur', astral: 'orbite', prisme: 'etoile', celeste: 'etoile8', dragon: 'griffes', phenix: 'ailes', divin: 'soleil', halloween: 'citrouille', hiver: 'flocon', printemps: 'fleur', ete: 'soleil' };
const VITESSE_CURSEUR = { commun: 0, rare: .5, epique: .9, mythique: 1.3, legendaire: .7, saison: .6 };
function curseurEquipe() { try { const s = equipe('visiere'); return s && !s.base ? s : null; } catch (e) { return null; } }
function styleCurseur(s) { return STYLE_CURSEUR[SET_DE[s.id]] || 'anneau'; }
// trace la forme autour de (0,0), rayon R ; t = temps (pour ce qui bouge dans la forme)
function traceCurseur(c, st, R, t) {
  const ligne = (x0, y0, x1, y1) => { c.moveTo(x0, y0); c.lineTo(x1, y1); };
  const tour = (n, f) => { for (let i = 0; i < n; i++) { c.save(); c.rotate(i * TAU / n); f(i); c.restore(); } };
  switch (st) {
    case 'anneau': c.beginPath(); c.arc(0, 0, R, 0, TAU); tour(4, () => ligne(R - 4, 0, R + 5, 0)); break;
    case 'croix': c.beginPath(); tour(4, () => ligne(R * .35, 0, R + 2, 0)); break;
    case 'losange': c.beginPath(); c.moveTo(R + 2, 0); c.lineTo(0, R + 2); c.lineTo(-R - 2, 0); c.lineTo(0, -R - 2); c.closePath(); ligne(-4, 0, 4, 0); ligne(0, -4, 0, 4); break;
    case 'feuille': c.beginPath(); tour(4, () => { c.moveTo(R * .3, 0); c.quadraticCurveTo(R * .75, -R * .42, R * 1.2, 0); c.quadraticCurveTo(R * .75, R * .42, R * .3, 0); }); break;
    case 'flocon': c.beginPath(); tour(6, () => { ligne(R * .2, 0, R + 2, 0); ligne(R * .65, 0, R * .95, -R * .3); ligne(R * .65, 0, R * .95, R * .3); }); break;
    case 'goutte': c.beginPath(); c.arc(0, 0, R * .7, 0, TAU); tour(3, () => { c.moveTo(R * .75, 0); c.quadraticCurveTo(R * 1.1, -R * .3, R * 1.4, 0); c.quadraticCurveTo(R * 1.1, R * .3, R * .75, 0); }); break;
    case 'crocs': c.beginPath(); c.arc(0, 0, R, -2.5, -.64); c.arc(0, 0, R, .64, 2.5); for (const s of [-1, 1]) { c.moveTo(-R * .45, s * R * .85); c.quadraticCurveTo(-R * .2, s * R * .4, -R * .05, s * R * .15); c.moveTo(R * .45, s * R * .85); c.quadraticCurveTo(R * .2, s * R * .4, R * .05, s * R * .15); } break;
    case 'flamme': c.beginPath(); tour(4, () => { c.moveTo(R * .35, -R * .28); c.quadraticCurveTo(R * .8, -R * .3, R * 1.35, 0); c.quadraticCurveTo(R * .8, R * .3, R * .35, R * .28); c.quadraticCurveTo(R * .5, 0, R * .35, -R * .28); }); break;
    case 'eclair': c.beginPath(); c.arc(0, 0, R * .55, 0, TAU); tour(2, () => { c.moveTo(R * .6, -R * .1); c.lineTo(R * 1.05, -R * .45); c.lineTo(R * .95, 0); c.lineTo(R * 1.45, -R * .3); }); break;
    case 'gemme': c.beginPath(); for (let i = 0; i <= 6; i++) { const a = i * TAU / 6; c.lineTo(Math.cos(a) * (R + 1), Math.sin(a) * (R + 1)); } for (let i = 0; i < 6; i += 2) { const a = i * TAU / 6; ligne(0, 0, Math.cos(a) * (R + 1), Math.sin(a) * (R + 1)); } break;
    case 'oeil': c.beginPath(); c.moveTo(-R - 3, 0); c.quadraticCurveTo(0, -R * 1.2, R + 3, 0); c.quadraticCurveTo(0, R * 1.2, -R - 3, 0); c.moveTo(R * .4, 0); c.arc(0, 0, R * .4, 0, TAU); break;
    case 'etoile': case 'etoile8': { const n = st === 'etoile' ? 5 : 8; c.beginPath(); for (let i = 0; i <= n * 2; i++) { const rr = i % 2 ? R * .5 : R * 1.3, a = i * Math.PI / n - Math.PI / 2; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } break; }
    case 'fleur': c.beginPath(); tour(6, () => { c.moveTo(R * .25, 0); c.quadraticCurveTo(R * .7, -R * .5, R * 1.15, 0); c.quadraticCurveTo(R * .7, R * .5, R * .25, 0); }); break;
    case 'orbite': c.beginPath(); c.arc(0, 0, R * .6, 0, TAU); c.moveTo(R * 1.3, 0); c.ellipse(0, 0, R * 1.3, R * .5, 0, 0, TAU); { const a = t * 3, x = Math.cos(a) * R * 1.3, y = Math.sin(a) * R * .5; c.moveTo(x + 2.5, y); c.arc(x, y, 2.5, 0, TAU); } break;
    case 'griffes': c.beginPath(); for (const d of [-R * .6, 0, R * .6]) { c.moveTo(d + R * .35, -R * 1.1); c.quadraticCurveTo(d + R * .25, 0, d - R * .35, R * 1.1); } break;
    case 'ailes': c.beginPath(); for (const s of [-1, 1]) { c.moveTo(s * R * .25, 0); c.quadraticCurveTo(s * R * .8, -R * 1.1, s * R * 1.55, -R * .6); c.quadraticCurveTo(s * R * 1.15, -R * .1, s * R * 1.3, R * .25); c.quadraticCurveTo(s * R * .8, R * .05, s * R * .25, 0); } break;
    case 'soleil': c.beginPath(); c.arc(0, 0, R * .6, 0, TAU); tour(8, () => ligne(R * .8, 0, R * 1.35, 0)); break;
    case 'citrouille': c.beginPath(); for (const d of [-.45, .45]) c.ellipse(d * R, 0, R * .6, R * .8, 0, 0, TAU); c.moveTo(R * .75, 0); c.ellipse(0, 0, R * .75, R * .85, 0, 0, TAU); ligne(0, -R * .85, R * .15, -R * 1.2); for (const s of [-1, 1]) { c.moveTo(s * R * .4, -R * .05); c.lineTo(s * R * .15, -R * .05); c.lineTo(s * R * .28, -R * .3); c.closePath(); } break;
    default: c.beginPath(); c.arc(0, 0, R, 0, TAU);
  }
}
function dessinerCurseurSkin(c, x, y, s, t, k) {
  const R = 13 * (k || 1), st = styleCurseur(s), col = s.arc || s.id === 'v_prisme' ? `hsl(${(t * 120) % 360 | 0},100%,72%)` : s.col, v = VITESSE_CURSEUR[s.rar] || 0;
  c.save(); c.translate(x, y);
  if (['epique', 'mythique', 'legendaire'].includes(s.rar)) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = .7 + .3 * Math.sin(t * 5); c.drawImage(glow(alphaCol(s.col, .55), 30), -30, -30); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  if (st !== 'oeil' && st !== 'ailes' && st !== 'citrouille' && st !== 'griffes') c.rotate(t * v);
  c.lineJoin = 'round'; c.lineCap = 'round';
  traceCurseur(c, st, R, t); c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = 4.5; c.stroke();
  c.strokeStyle = col; c.lineWidth = 2; c.stroke();
  c.restore();
  c.fillStyle = col; c.beginPath(); c.arc(x, y, 1.8, 0, TAU); c.fill();
}
const _imgCurseur = {};
function imageCurseur(s, T) {
  const k = s.id + T; if (_imgCurseur[k]) return _imgCurseur[k];
  const cv2 = document.createElement('canvas'); cv2.width = cv2.height = T;
  const x = cv2.getContext('2d'); dessinerCurseurSkin(x, T / 2, T / 2, s, 0, T / 44);
  return (_imgCurseur[k] = cv2.toDataURL('image/png'));
}
// la souris dans les menus
function appliquerCurseurMenu() {
  try {
    let st = document.getElementById('curseur-skin'); const s = curseurEquipe();
    if (!s) { if (st) st.remove(); return; }
    if (!st) { st = document.createElement('style'); st.id = 'curseur-skin'; document.head.appendChild(st); }
    st.textContent = `html, body, button, #ecran, #ecran *, label, select { cursor: url(${imageCurseur(s, 32)}) 16 16, auto !important; }`;
  } catch (e) { }
}
addEventListener('load', appliquerCurseurMenu);
// le héros garde sa visière : plus d'effet de visière sur lui
effetVisiere = function () { };
// aperçus : la vraie forme du curseur
const _apercuRoul = apercuSkin;
apercuSkin = function (s) { return s.slot === 'visiere' && !s.base ? `<img class="rl-pastille" style="background:#14100c" src="${imageCurseur(s, 44)}" alt="">` : _apercuRoul(s); };
const _gardeCurseur = UI.garderobe;
UI.garderobe = function (slot) {
  const r = _gardeCurseur.apply(this, arguments);
  try {
    if ((slot || 'armure') === 'visiere') for (const el of this.el.querySelectorAll('.grille-skins .skin')) { const s = skin(el.dataset.k), p = el.querySelector('.pastille'); if (s && p && !s.base) { p.style.background = '#14100c'; p.innerHTML = `<img src="${imageCurseur(s, 44)}" alt="" style="width:100%;height:100%">`; } }
  } catch (e) { }
  return r;
};
const _actCurseur = UI.action;
UI.action = function (a, btn) { const r = _actCurseur.call(this, a, btn); if (a === 'skin') appliquerCurseurMenu(); return r; };
// fragments de saison : il en faut plusieurs, comme les autres (ceux déjà achetés restent obtenus)
RARETES.saison.frags = 6; RARETES.saison.poids = 8;
try { const S = Save.d.skins; if (S && S.frag && !Save.d.migSaison) { for (const s of SKINS) if (s.saison && S.frag[s.id] >= 1) S.frag[s.id] = 6; Save.d.migSaison = 1; Save.write(); } } catch (e) { }
