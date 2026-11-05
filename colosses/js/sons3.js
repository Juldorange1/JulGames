'use strict';
/* Colosses — des sons qui collent à ce qu'on voit, doux et agréables :
   • une attaque d'éclair fait un coup de tonnerre, le feu fait un souffle de flammes, la glace tinte comme du cristal,
     le vent souffle, les rayons chantent doucement (attaques des boss ET attaques spéciales du joueur) ;
   • les bruits durs (dents de scie, carrés) sont remplacés par des sons plus ronds ;
   • le battement du Métronome (« tic tic tic tac ») ne fait plus de bruit ;
   • dans les menus, la musique reste à plein volume.
   Les flammes posées par les boss sont dessinées dans le style du jeu, et leur cercle montre exactement où elles brûlent. */

const THEMES_SON = [
  ['foudre', /eclair|éclair|foudre|orage|tonnerre|electr|élect|javelot|statique|tempete|tempête/i],
  ['feu', /feu|flamm|lave|braise|brasier|incend|meteor|météor|volcan|soleil|solaire|bombe|magma|phenix|phénix|comet|comèt/i],
  ['glace', /givre|glace|gel|blizzard|neige|cryo|froid|cristal|flocon/i],
  ['vent', /vent|tornade|bourrasque|tourbillon|souffle|cyclone/i],
  ['rayon', /laser|rayon|lance|prisme|lumi/i]
];
const _themeCache = {};
function themeSon(id) {
  if (!id) return null;
  if (_themeCache[id] !== undefined) return _themeCache[id];
  const a = (typeof ATK !== 'undefined' && ATK[id]) || null, txt = id + ' ' + (a ? a.nom : '');
  let th = null; for (const [t, re] of THEMES_SON) if (re.test(txt)) { th = t; break; }
  return (_themeCache[id] = th);
}
function sonTheme(th, fort) {
  if (!Son.c || !th) return;
  const k = fort ? 1.25 : 1;
  switch (th) {
    case 'foudre': // craquement sec puis grondement qui roule
      Son.noise(.07, .1 * k, 7000, 0, 2500); Son.noise(.05, .06 * k, 4000, .05, 1200);
      Son.noise(1.3, .075 * k, 380, .06, 55, .5); Son.tone(52, .9, 'sine', .05 * k, 34, .06, .3); break;
    case 'feu': // souffle de flammes qui monte
      Son.noise(.5, .06 * k, 420, 0, 2400, .25); Son.noise(.35, .025 * k, 3200, .12, 900); break;
    case 'glace': // tintement cristallin
      Son.tone(1760, .55, 'sine', .028 * k, null, 0, .5); Son.tone(2637, .7, 'sine', .016 * k, null, .04, .6); Son.tone(3520, .4, 'sine', .008 * k, null, .08, .6); break;
    case 'vent': // bourrasque douce
      Son.noise(.9, .045 * k, 500, 0, 1500, .3); Son.noise(.7, .03 * k, 1800, .2, 700, .3); break;
    case 'rayon': // chant doux du rayon
      Son.tone(660, .45, 'sine', .025 * k, 990, 0, .35); Son.tone(990, .4, 'triangle', .012 * k, 1320, .05, .35); break;
  }
}
const _themeT = {};
function jouerTheme(th, x, y, fort) {
  if (!th) return false;
  const now = performance.now(); if (_themeT[th] && now - _themeT[th] < (th === 'foudre' ? 220 : 140)) return true; _themeT[th] = now;
  const node = typeof panneauSon === 'function' && Number.isFinite(x) ? panneauSon(x, y) : null, avant = Son.sfx;
  if (node) Son.sfx = node;
  try { sonTheme(th, fort); } finally { Son.sfx = avant; }
  return true;
}

// ---------- sons adoucis, Métronome silencieux, explosions thématiques ----------
const _playDoux = Son.play;
Son.play = function (n) {
  if (!this.c) return;
  if (n === 'tic' || n === 'tac') return; // plus de « tic tic tic tac »
  // une zone d'une attaque de foudre / de feu / de glace explose avec le son de son élément
  if ((n === 'explo' || n === 'gros') && this._theme) { const p = this._pos || {}; if (jouerTheme(this._theme, p.x, p.y, n === 'gros')) return; }
  const now = performance.now(), gap = { salve: 90, alerte: 200, vide: 120 }[n];
  if (gap) { if (this.last[n] && now - this.last[n] < gap) return; this.last[n] = now; }
  switch (n) {
    case 'salve': this.tone(330, .16, 'triangle', .022, 180); this.noise(.1, .025, 1400, 0, 500); return;
    case 'alerte': this.tone(520, .3, 'sine', .022, 780); return;
    case 'vide': this.tone(220, .08, 'triangle', .025, 160); return;
    case 'phase': this.play('cri'); this.noise(1.2, .12, 500, 0, 60, .5); this.tone(65, 1.4, 'triangle', .06, 32); return;
    case 'mort': this.tone(220, 1.8, 'triangle', .06, 55, 0, .6); this.noise(1.4, .1, 450, 0, 60, .5); this.ech('choc3', .5, .5, .6); return;
  }
  return _playDoux.apply(this, arguments);
};
// zones des boss : le son suit l'élément de l'attaque
if (typeof explosionZone === 'function') {
  const _ezTheme = explosionZone;
  explosionZone = function (h, cx, cy, r) { Son._theme = h ? themeSon(h.src) : null; try { return _ezTheme.apply(this, arguments); } finally { Son._theme = null; } };
}
// début d'une attaque de boss d'un élément : son de l'élément (doux, une fois)
let _atkSon = null;
const _majTheme = majCombat;
majCombat = function (dt) {
  _majTheme.apply(this, arguments);
  try { const b = G.boss, id = b && !b.mort && b.main ? b.main.id : null; if (id !== _atkSon) { _atkSon = id; const th = themeSon(id); if (th && th !== 'foudre') jouerTheme(th, b.x, b.y, false); } } catch (e) { }
};
// rayons des boss : le chant du rayon quand il frappe ; éclairs : le tonnerre
if (typeof HZ !== 'undefined' && HZ.rayon && HZ.rayon.up) {
  const _upR = HZ.rayon.up;
  HZ.rayon.up = function (h, dt) { const avant = h.t; const r = _upR.apply(this, arguments); try { if (avant < h.warn && h.t >= h.warn && !h.alerte) { const th = themeSon(h.src); jouerTheme(th === 'foudre' ? 'foudre' : 'rayon', h.x, h.y, false); } } catch (e) { } return r; };
}
// attaques spéciales du joueur : le son de leur élément
for (const s of SPEC) {
  const use = s.use; if (!use || s._son) continue; s._son = true;
  const el = (typeof ELEM_ARME !== 'undefined' && ELEM_ARME[s.id]) || '';
  const th = el === 'foudre' ? 'foudre' : el === 'feu' ? 'feu' : el === 'glace' ? 'glace' : themeSon(s.id) || (/tornade|onde|repousse/.test(s.id) ? 'vent' : null);
  if (th) s.use = function (p) { const r = use.apply(this, arguments); try { jouerTheme(th, p.x, p.y, true); } catch (e) { } return r; };
}

// ---------- menus : musique à plein volume ----------
const _menuVol = UI.menu;
UI.menu = function () { Musique.baisser(1); return _menuVol.apply(this, arguments); };
const _montrerVol = UI.montrer;
UI.montrer = function () { const r = _montrerVol.apply(this, arguments); try { if (G.etat === 'menu') Musique.baisser(1); } catch (e) { } return r; };

// ---------- flammes des boss : style du jeu, zone de brûlure lisible ----------
if (typeof HZ !== 'undefined' && HZ.flaque) {
  const _flaqueDraw = HZ.flaque.draw;
  HZ.flaque.draw = function (h, c) {
    if (!h.feu) return _flaqueDraw.call(this, h, c);
    const a = Math.min(1, (h.t + .2) / .4, (h.life - h.t) / .5), R0 = h.r * .9, t = G.t;
    c.save();
    // la zone qui brûle (exactement le cercle de collision)
    const g = c.createRadialGradient(h.x, h.y, R0 * .1, h.x, h.y, R0);
    g.addColorStop(0, 'rgba(255,200,90,.55)'); g.addColorStop(.6, 'rgba(255,110,30,.42)'); g.addColorStop(1, 'rgba(200,40,10,.3)');
    c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(h.x, h.y, R0, 0, TAU); c.fill();
    c.strokeStyle = '#ffb04a'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = 'rgba(255,240,180,.7)'; c.lineWidth = 1.5; c.setLineDash([7, 6]); c.lineDashOffset = -t * 30; c.beginPath(); c.arc(h.x, h.y, R0 - 6, 0, TAU); c.stroke(); c.setLineDash([]);
    // langues de feu dessinées (dans le cercle), qui dansent
    for (let i = 0; i < 7; i++) {
      const an = i * TAU / 7 + h.x * .01, d = i ? R0 * .5 : 0, bx = h.x + Math.cos(an) * d, by = h.y + Math.sin(an) * d * .7 + R0 * .25;
      const H0 = R0 * (.55 + .2 * Math.sin(t * 8 + i * 1.7)) * (i ? .8 : 1.1), L0 = R0 * (i ? .2 : .28);
      const gf = c.createLinearGradient(bx, by, bx, by - H0); gf.addColorStop(0, '#ff5a1a'); gf.addColorStop(.6, '#ffb030'); gf.addColorStop(1, '#fff3b0');
      c.fillStyle = gf; c.strokeStyle = 'rgba(120,20,0,.6)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(bx - L0, by); c.quadraticCurveTo(bx - L0 * .9, by - H0 * .55, bx + Math.sin(t * 6 + i) * L0 * .4, by - H0); c.quadraticCurveTo(bx + L0 * .9, by - H0 * .55, bx + L0, by); c.closePath(); c.fill(); c.stroke();
    }
    c.restore();
  };
}
