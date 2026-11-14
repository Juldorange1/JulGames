/* Phase — moteur : simulation pure et déterministe à 60 images par seconde.
   Le même code sert au jeu (navigateur) et au robot qui calcule les temps « Parfait » (Node).
   Le joueur change d'état de la matière : SOLIDE (pierre), LIQUIDE (eau), GAZ (vapeur), PLASMA (éclair). */
(function (racine) {
'use strict';

const T = 16, W = 12, H = 12;                       // taille d'une case, boîte du joueur
const S = 0, L = 1, Z = 2, P = 3;                   // solide, liquide, gaz, plasma
const NOMS_PHASES = ['Solide', 'Liquide', 'Gaz', 'Plasma'];
const E = { G: 1, D: 2, H: 4, B: 8, SAUT: 16, S: 32, L: 64, Z: 128, P: 256 };   // bits d'entrée
const EV = { SAUT: 1, MUR: 2, CHANGE: 4, MORT: 8, CASSE: 16, RESSORT: 32, BOUM: 64, CRISTAL: 128, FIN: 256,
  DRAPEAU: 512, TP: 1024, ECLAT: 2048, ECHEC: 4096, ATTERRIT: 8192, JET: 16384, FRACAS: 32768, CONVERSION: 65536,
  EVAPORE: 131072, REBOND: 262144, NAGE: 524288 };

const VIDE = 0, MUR = 1, GRILLE = 2, TAMIS = 3, FRAGILE = 4, PICS = 5, FEU = 6, EAU = 7, GLACE = 8, RESSORT = 9,
  CRISTAL = 10, BUT = 11, DRAPEAU = 12, PLATE = 13, TAPIS_G = 14, TAPIS_D = 15, VENT_D = 16, VENT_G = 17,
  VENT_H = 18, VENT_B = 19, TP1 = 20, TP1S = 21, TP2 = 22, TP2S = 23, ECLAT = 24, PANNEAU = 25;
const CH = { '.': VIDE, ' ': VIDE, '@': VIDE, '#': MUR, '=': GRILLE, '~': TAMIS, 'x': FRAGILE, '^': PICS, 'f': FEU,
  'w': EAU, 'i': GLACE, 's': RESSORT, '*': CRISTAL, 'G': BUT, '!': DRAPEAU, '-': PLATE, '[': TAPIS_G, ']': TAPIS_D,
  '>': VENT_D, '<': VENT_G, 'A': VENT_H, 'V': VENT_B, 'P': TP1, 'p': TP1S, 'Q': TP2, 'q': TP2S, 'e': ECLAT, '?': PANNEAU };

/* ---------- Réglages physiques (px et px/image) ---------- */
const K = {
  charges: 2,
  // solide
  sCourse: 3.4, sAccSol: 0.42, sAccAir: 0.3, sFrein: 0.5, sDemiTour: 0.8, sFreinAir: 0.1,
  sAuDela: 0.1, sAuDelaAir: 0.025, gMonte: 0.42, gChute: 0.75, chuteMax: 8.5, glisseMur: 2.8,
  saut: 6.4, rebond: 8.0, murVy: 5.9, murVx: 3.6, fracas: 9, fracasMax: 11,
  ressort: 9.3, ressortFracas: 12,
  // liquide
  lCourse: 4.2, lAcc: 0.2, lAccAir: 0.14, lFrein: 0.035, lAuDela: 0.012, lGrav: 0.5, lRampe: 2.4,
  lDecroit: 0.05, lConv: 0.95, lConvMax: 8, lJetVx: 4.6, lJetVy: 4.6, lGiclee: 4.1, lNage: 5.5,
  // gaz
  zDuree: 60, zGrav: 0.15, zMonteMax: 2.6, zCourse: 3.4, zAcc: 0.3, zBouffee: 1.6,
  // plasma
  pVit: 8.5, pDuree: 9, pSortie: 4.8, pRecharge: 8,
  // vent, explosions, tapis
  vent: [0.08, 0.16, 0.7, 0], ventMax: 6.2, boum: 9, tapis: 1.4
};

/* ---------- Chargement d'un niveau ---------- */
function charger(def) {
  let phases = 0;
  for (const p of (def.phases || [S])) phases |= 1 << p;
  const n = { def, phases };
  recharger(n, def.carte);
  if (!n.dep) throw new Error('Pas de départ @ dans ' + def.id);
  return n;
}
// (re)lit une carte dans un niveau existant : sert aussi au mode infini, qui s'allonge vers la droite
function recharger(n, c) {
  const h = c.length;
  let w = 0;
  for (const l of c) w = Math.max(w, l.length);
  const g = new Uint8Array(w * h);
  let aEclat = false;
  const panneaux = [], sorties = [];
  for (let y = 0; y < h; y++) {
    const l = c[y];
    for (let x = 0; x < w; x++) {
      const ch = l[x] || '.';
      const t = CH[ch];
      if (t === undefined) throw new Error('Caractère inconnu « ' + ch + ' » dans ' + n.def.id + ' (' + x + ',' + y + ')');
      g[y * w + x] = t;
      if (ch === '@' && !n.dep) n.dep = { x: x * T + (T - W) / 2, y: (y + 1) * T - H };
      if (t === PANNEAU) panneaux.push({ x, y, texte: (n.def.panneaux || [])[panneaux.length] || '' });
      if (t === TP1S || t === TP2S) sorties.push({ x, y, t });
      if (t === ECLAT) aEclat = true;
    }
  }
  // chaque entrée de téléporteur mène à la sortie de même couleur la plus proche à sa droite
  const tp = new Map();
  for (let i = 0; i < w * h; i++) {
    const t = g[i];
    if (t !== TP1 && t !== TP2) continue;
    const x = i % w, y = Math.floor(i / w), cherche = t === TP1 ? TP1S : TP2S;
    let best = null;
    for (const s of sorties) if (s.t === cherche && s.x >= x && (!best || s.x < best.x)) best = s;
    if (!best) for (const s of sorties) if (s.t === cherche && (!best || Math.abs(s.x - x) < Math.abs(best.x - x))) best = s;
    if (best) tp.set(i, best);
  }
  Object.assign(n, { w, h, g, panneaux, tp, aEclat });
  return n;
}

/* ---------- État ---------- */
function nouvelEtat(n) {
  const e = { f: 0, temps: 0, demarre: false, fini: false, eclat: false, casses: [], cristaux: [], cp: null, morts: 0,
    inpPrev: 0, ev: 0, evX: 0, evY: 0 };
  placer(e, n);
  return e;
}
function placer(e, n) {
  const d = e.cp || n.dep;
  e.x = d.x; e.y = d.y; e.vx = 0; e.vy = 0; e.phase = S; e.charges = K.charges; e.gaz = 0; e.dash = 0; e.cdP = 0;
  e.att = 0; e.slam = false; e.slamAt = 0; e.coyote = 0; e.tampon = 0; e.verrou = 0; e.jetCd = 0; e.jetSide = 0;
  e.tpCd = 0; e.sol = true; e.face = 1; e.mortT = 0; e.immun = 0; e.cristaux = []; e.dansEau = false; e.porte = 0;
}
function cloner(e) {
  const c = Object.assign({}, e);
  c.casses = e.casses.slice();
  c.cristaux = e.cristaux.slice();
  return c;
}

/* ---------- Cases ---------- */
function casse(e, i) { return e.casses.length > 0 && e.casses.indexOf(i) >= 0; }
function tuile(n, tx, ty) {
  if (tx < 0 || tx >= n.w || ty < 0) return MUR;
  if (ty >= n.h) return VIDE;
  return n.g[ty * n.w + tx];
}
function plein(n, e, tx, ty) {
  if (tx < 0 || tx >= n.w || ty < 0) return true;
  if (ty >= n.h) return false;
  const i = ty * n.w + tx, t = n.g[i];
  switch (t) {
    case MUR: case GLACE: case TAPIS_G: case TAPIS_D: return true;
    case FRAGILE: return !casse(e, tx * 1024 + ty);
    case GRILLE: return e.phase !== L;
    case TAMIS: return e.phase !== Z;
    default: return false;
  }
}
// case qui bloque le mouvement ; les fragiles cèdent sous un éclair ou un fracas
function bloque(n, e, tx, ty, brise) {
  if (!plein(n, e, tx, ty)) return false;
  if (brise && tx >= 0 && tx < n.w && ty >= 0 && ty < n.h) {
    const i = ty * n.w + tx;
    if (n.g[i] === FRAGILE) {
      e.casses.push(tx * 1024 + ty); e.ev |= EV.CASSE; e.evX = tx; e.evY = ty;
      return false;
    }
  }
  return true;
}

function bougerX(n, e, dx) {
  e.x += dx;
  const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + H - 0.001) / T);
  const brise = e.phase === P && e.dash > 0;
  let tx, hit = false;
  if (dx > 0) {
    tx = Math.floor((e.x + W - 0.001) / T);
    for (let ty = y0; ty <= y1; ty++) if (bloque(n, e, tx, ty, brise)) { hit = true; }
    if (hit) e.x = tx * T - W;
  } else if (dx < 0) {
    tx = Math.floor(e.x / T);
    for (let ty = y0; ty <= y1; ty++) if (bloque(n, e, tx, ty, brise)) { hit = true; }
    if (hit) e.x = (tx + 1) * T;
  }
  return hit;
}
function bougerY(n, e, dy) {
  const avantBas = e.y + H;
  e.y += dy;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + W - 0.001) / T);
  let ty, hit = false;
  if (dy > 0) {
    const brise = (e.phase === P && e.dash > 0) || (e.phase === S && e.slam);
    ty = Math.floor((e.y + H - 0.001) / T);
    for (let tx = x0; tx <= x1; tx++) {
      if (bloque(n, e, tx, ty, brise)) hit = true;
      else if (tuile(n, tx, ty) === PLATE && avantBas <= ty * T + 0.001) hit = true;
    }
    if (hit) e.y = ty * T - H;
  } else if (dy < 0) {
    const brise = e.phase === P && e.dash > 0;
    ty = Math.floor(e.y / T);
    for (let tx = x0; tx <= x1; tx++) if (bloque(n, e, tx, ty, brise)) hit = true;
    if (hit) e.y = (ty + 1) * T;
  }
  return hit;
}

// contact dans une direction (0 bas, 1 haut, 2 gauche, 3 droite) : renvoie le type de case touchée (priorité aux non-glace), ou -1
function contact(n, e, dir) {
  let found = -1;
  const note = (t) => { if (found < 0 || found === GLACE) found = t; };
  if (dir < 2) {
    const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + W - 0.001) / T);
    if (dir === 0) {
      const yb = e.y + H, ty = Math.round(yb / T);
      if (Math.abs(ty * T - yb) > 0.01) return -1;
      for (let tx = x0; tx <= x1; tx++) {
        if (plein(n, e, tx, ty)) note(tuile(n, tx, ty));
        else if (tuile(n, tx, ty) === PLATE) note(PLATE);
      }
    } else {
      const ty = Math.round(e.y / T) - 1;
      if (Math.abs((ty + 1) * T - e.y) > 0.01) return -1;
      for (let tx = x0; tx <= x1; tx++) if (plein(n, e, tx, ty)) note(tuile(n, tx, ty));
    }
  } else {
    const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + H - 0.001) / T);
    let tx;
    if (dir === 2) { tx = Math.round(e.x / T) - 1; if (Math.abs((tx + 1) * T - e.x) > 0.01) return -1; }
    else { tx = Math.round((e.x + W) / T); if (Math.abs(tx * T - (e.x + W)) > 0.01) return -1; }
    for (let ty = y0; ty <= y1; ty++) if (plein(n, e, tx, ty)) note(tuile(n, tx, ty));
  }
  return found;
}
const collant = (t) => t >= 0 && t !== GLACE && t !== PLATE;

// partie mortelle d'une case de pics : seulement les pointes visibles, selon leur sens
const durs = (t) => t === MUR || t === GLACE || t === TAPIS_G || t === TAPIS_D || t === FRAGILE;
function sensPics(n, tx, ty) {
  if (durs(tuile(n, tx, ty + 1))) return 0;        // vers le haut
  if (durs(tuile(n, tx, ty - 1))) return 1;        // vers le bas
  if (durs(tuile(n, tx - 1, ty))) return 2;        // vers la droite
  if (durs(tuile(n, tx + 1, ty))) return 3;        // vers la gauche
  return 0;
}
function zonePics(n, tx, ty) {
  const bx = tx * T, by = ty * T;
  switch (sensPics(n, tx, ty)) {
    case 0: return [bx + 1.5, by + 7, bx + 14.5, by + 16];
    case 1: return [bx + 1.5, by, bx + 14.5, by + 9];
    case 2: return [bx, by + 1.5, bx + 9, by + 14.5];
    default: return [bx + 7, by + 1.5, bx + 16, by + 14.5];
  }
}

function approche(v, c, d) { return v < c ? Math.min(c, v + d) : Math.max(c, v - d); }

function mourir(e) {
  if (e.mortT > 0) return;
  e.mortT = 20; e.morts++; e.ev |= EV.MORT; e.evX = e.x + W / 2; e.evY = e.y + H / 2;
}

/* ---------- Changement d'état ---------- */
function changer(n, e, vers, h, v) {
  const avant = e.phase;
  if (vers === P) {
    let dx = h, dy = v;
    if (!dx && !dy) dx = e.face;
    const k = (dx && dy) ? Math.SQRT1_2 : 1;
    e.vx = dx * k * K.pVit; e.vy = dy * k * K.pVit;
    e.dash = K.pDuree; e.phase = P; e.att = 0; e.slam = false; e.gaz = 0;
  } else {
    e.phase = vers; e.dash = 0; e.slam = false;
    if (vers === Z) {
      e.gaz = K.zDuree;
      if (!e.sol && avant !== P && avant !== Z) e.vy = Math.max(-2.6, Math.min(e.vy, 0) - K.zBouffee);
    } else e.gaz = 0;
    if (vers !== L) e.att = 0;
  }
  e.ev |= EV.CHANGE;
}

/* ---------- Un pas de simulation ---------- */
function pas(n, e, inp) {
  e.ev = 0;
  if (e.fini) return;
  e.f++;
  const presse = inp & ~e.inpPrev;
  e.inpPrev = inp;
  if (!e.demarre) { if (!inp) return; e.demarre = true; }
  e.temps++;
  if (e.mortT > 0) { if (--e.mortT === 0) placer(e, n); return; }

  if (e.cristaux.length && e.cristaux[0][1] <= e.temps) e.cristaux = e.cristaux.filter(c => c[1] > e.temps);
  if (e.jetCd > 0) e.jetCd--;
  if (e.tpCd > 0) e.tpCd--;
  if (e.immun > 0) e.immun--;
  if (e.cdP > 0) e.cdP--;
  if (e.slamAt > 0) e.slamAt--;

  let h = ((inp & E.D) ? 1 : 0) - ((inp & E.G) ? 1 : 0);
  const v = ((inp & E.B) ? 1 : 0) - ((inp & E.H) ? 1 : 0);
  if (h) e.face = h;
  if (presse & E.SAUT) e.tampon = 6; else if (e.tampon > 0) e.tampon--;
  if (e.verrou > 0) { e.verrou--; h = 0; }

  // milieu : eau, vent
  const cx = Math.floor((e.x + W / 2) / T), cy = Math.floor((e.y + H / 2) / T);
  const milieu = tuile(n, cx, cy);
  const eau = milieu === EAU;
  if (eau && !e.dansEau) e.ev |= EV.NAGE;
  e.dansEau = eau;

  // changements d'état demandés
  let vers = -1;
  if (presse & E.P) vers = P; else if (presse & E.S) vers = S; else if (presse & E.L) vers = L; else if (presse & E.Z) vers = Z;
  if (vers >= 0 && (n.phases & (1 << vers)) && (vers !== e.phase || vers === P || vers === Z)) {
    if (vers === P && (e.cdP > 0 || e.dash > 0)) { /* pas deux éclairs collés */ }
    else if (e.charges > 0) { e.charges--; changer(n, e, vers, h, v); }
    else { e.ev |= EV.ECHEC; }
  }

  const sol0 = e.sol;
  let porte = 0;
  if (sol0) {
    const sous = contact(n, e, 0);
    if (sous === TAPIS_G) porte = -K.tapis; else if (sous === TAPIS_D) porte = K.tapis;
  }
  const glace = sol0 && contact(n, e, 0) === GLACE;

  /* ----- commandes selon l'état ----- */
  if (e.phase === S) {
    if (eau) {
      e.slam = false;
      e.vx = approche(e.vx, h * 1.8, 0.2);
      e.vy = Math.min(e.vy + 0.16, 2.2);
      if (e.tampon > 0) { e.vy = -3.6; e.tampon = 0; e.ev |= EV.SAUT; }
    } else {
      const max = K.sCourse;
      if (h !== 0) {
        if (Math.sign(e.vx) === h && Math.abs(e.vx) > max) e.vx -= h * (sol0 ? (glace ? 0.004 : K.sAuDela) : K.sAuDelaAir);
        else if (sol0 && e.vx !== 0 && Math.sign(e.vx) !== h) e.vx = approche(e.vx, 0, glace ? 0.05 : K.sDemiTour);
        else e.vx = approche(e.vx, h * max, sol0 ? (glace ? 0.04 : K.sAccSol) : K.sAccAir);
      } else e.vx = approche(e.vx, 0, sol0 ? (glace ? 0.02 : K.sFrein) : K.sFreinAir);
      // gravité
      const tient = (inp & E.SAUT) && e.vy < 0;
      e.vy += e.slam ? 0.9 : (tient ? K.gMonte : K.gChute);
      // mur
      const cG = sol0 ? -1 : contact(n, e, 2), cD = sol0 ? -1 : contact(n, e, 3);
      let maxChute = e.slam ? K.fracasMax : K.chuteMax;
      if (!e.slam && ((h < 0 && collant(cG)) || (h > 0 && collant(cD)))) maxChute = K.glisseMur;
      if (e.vy > maxChute) e.vy = Math.max(maxChute, e.vy - 0.9);
      if (sol0) e.coyote = 6; else if (e.coyote > 0) e.coyote--;
      if (e.tampon > 0) {
        if (sol0 || e.coyote > 0) {
          const reb = e.slamAt > 0;
          e.vy = -(reb ? K.rebond : K.saut); e.tampon = 0; e.coyote = 0; e.sol = false; e.slamAt = 0;
          e.vx += porte; e.ev |= reb ? EV.REBOND : EV.SAUT;
        } else if (cG >= 0 || cD >= 0) {
          const loin = cG >= 0 ? 1 : -1;
          e.vy = -K.murVy; e.vx = loin * Math.max(K.murVx, Math.abs(e.vx) * 0.5); e.face = loin; e.verrou = 6;
          e.tampon = 0; e.slam = false; e.ev |= EV.MUR; e.evX = loin;
        }
      }
      if (!sol0 && !e.slam && (presse & E.B)) {
        e.slam = true; e.vy = Math.max(e.vy, K.fracas); e.vx *= 0.4; e.ev |= EV.FRACAS;
      }
    }
  } else if (e.phase === L) {
    if (eau) {
      e.att = 0;
      e.vx = approche(e.vx, h * K.lNage, 0.45);
      e.vy = approche(e.vy, v * K.lNage, 0.45);
    } else if (e.att === 1 || e.att === 2) {
      const side = e.att === 1 ? -1 : 1;
      if (e.tampon > 0) {
        e.vx = -side * K.lJetVx; e.vy = -K.lJetVy; e.att = 0; e.jetCd = 10; e.jetSide = side; e.tampon = 0;
        e.face = -side; e.ev |= EV.JET;
      } else if (h === -side) {
        e.vx = -side * 1.6; e.att = 0; e.jetCd = 8; e.jetSide = side;
      } else {
        const r = K.lRampe;
        if (v !== 0 && Math.sign(e.vy) === v && Math.abs(e.vy) > r) e.vy -= v * 0.04;
        else if (v === 0 && Math.abs(e.vy) > r) e.vy -= Math.sign(e.vy) * K.lDecroit;
        else e.vy = approche(e.vy, v * r, 0.35);
        e.vx = side * 0.5;
      }
    } else if (e.att === 3) {
      if (e.tampon > 0 || v > 0) { e.att = 0; e.vy = 1.4; e.jetCd = 8; e.jetSide = 0; e.tampon = 0; }
      else {
        const r = K.lRampe;
        if (h !== 0 && Math.sign(e.vx) === h && Math.abs(e.vx) > r) e.vx -= h * 0.04;
        else if (h === 0 && Math.abs(e.vx) > r) e.vx -= Math.sign(e.vx) * K.lDecroit;
        else e.vx = approche(e.vx, h * r, 0.35);
        e.vy = -0.5;
      }
    } else {
      const max = K.lCourse;
      if (h !== 0) {
        if (Math.sign(e.vx) === h && Math.abs(e.vx) > max) e.vx -= h * K.lAuDela;
        else e.vx = approche(e.vx, h * max, sol0 ? (glace ? 0.03 : K.lAcc) : K.lAccAir);
      } else e.vx = approche(e.vx, 0, sol0 ? (glace ? 0.006 : K.lFrein) : 0.03);
      e.vy = Math.min(e.vy + K.lGrav, K.chuteMax);
      if (sol0) e.coyote = 6; else if (e.coyote > 0) e.coyote--;
      if (e.tampon > 0 && (sol0 || e.coyote > 0)) {
        e.vy = -K.lGiclee; e.tampon = 0; e.coyote = 0; e.vx += porte; e.ev |= EV.SAUT;
      }
    }
  } else if (e.phase === Z) {
    if (eau) {
      e.vy = approche(e.vy, -4.6, 0.6);
      e.vx = approche(e.vx, h * 2, 0.3);
    } else {
      e.vy += -K.zGrav + (v > 0 ? 0.38 : 0) + (v < 0 ? -0.08 : 0);
      const monte = v < 0 ? -3.2 : -K.zMonteMax;
      if (e.vy < monte) e.vy = Math.min(monte, e.vy + 0.16);
      if (e.vy > 3.4) e.vy = 3.4;
      if (e.vy < -5.5) e.vy = -5.5;
      if (h !== 0) {
        if (Math.sign(e.vx) === h && Math.abs(e.vx) > K.zCourse) e.vx -= h * 0.05;
        else e.vx = approche(e.vx, h * K.zCourse, K.zAcc);
      } else e.vx = approche(e.vx, 0, 0.07);
    }
    if (--e.gaz <= 0) { e.phase = S; e.gaz = 0; e.ev |= EV.CHANGE; }
  } else { // plasma
    if (e.tampon > 0 && sol0) {
      e.phase = S; e.dash = 0; e.cdP = K.pRecharge; e.vy = -5.8;
      e.vx = Math.sign(e.vx || e.face) * Math.min(Math.abs(e.vx) + 0.8, 8);
      e.tampon = 0; e.sol = false; e.ev |= EV.SAUT;
    } else if (--e.dash <= 0) {
      e.phase = S; e.dash = 0; e.cdP = K.pRecharge; e.ev |= EV.CHANGE;
      if (Math.abs(e.vx) > K.pSortie) e.vx = Math.sign(e.vx) * K.pSortie;
      if (e.vy < 0) e.vy *= 0.45; else e.vy = Math.min(e.vy, 4);
    }
  }

  // vent
  if (milieu >= VENT_D && milieu <= VENT_B && !(e.phase === P && e.dash > 0)) {
    const f = K.vent[e.phase] * ((e.phase === L && e.att) ? 0 : 1);
    const m = K.ventMax;
    if (milieu === VENT_D && e.vx < m) e.vx = Math.min(m, e.vx + f);
    else if (milieu === VENT_G && e.vx > -m) e.vx = Math.max(-m, e.vx - f);
    else if (milieu === VENT_H && e.vy > -m) e.vy = Math.max(-m, e.vy - f - (e.phase === Z ? 0 : 0.0));
    else if (milieu === VENT_B && e.vy < m) e.vy = Math.min(m, e.vy + f);
  }

  /* ----- déplacement ----- */
  const vxPre = e.vx, vyPre = e.vy;
  let mx = e.vx + (sol0 && e.phase !== Z ? porte : 0), my = e.vy;
  const nPas = Math.max(1, Math.ceil(Math.max(Math.abs(mx), Math.abs(my)) / 4));
  let hitX = false, hitBas = false, hitHaut = false;
  for (let i = 0; i < nPas; i++) {
    if (mx && bougerX(n, e, mx / nPas)) { hitX = true; mx = 0; }
    if (my && bougerY(n, e, my / nPas)) { if (my > 0) hitBas = true; else hitHaut = true; my = 0; }
  }
  if (hitX) e.vx = 0;
  if (hitBas || hitHaut) e.vy = 0;

  const sol = contact(n, e, 0) >= 0 && e.vy >= 0;
  e.sol = sol;
  if (sol && !sol0) {
    e.ev |= EV.ATTERRIT;
    if (e.phase === S && e.slam) { e.slam = false; e.slamAt = 7; }
  }
  if (sol && e.phase === S) e.slam = false;

  // liquide : s'accrocher aux murs et plafonds, convertir la vitesse
  if (e.phase === L && !eau) {
    const cG = contact(n, e, 2), cD = contact(n, e, 3), cH = contact(n, e, 1);
    if (sol && !sol0 && vyPre > 3.2 && h !== 0) {             // éclaboussure : la chute devient de l'élan
      const vit = Math.max(Math.sign(e.vx) === h ? Math.abs(e.vx) : 0, vyPre * 0.75);
      e.vx = h * Math.min(K.lConvMax, vit); e.ev |= EV.CONVERSION;
    }
    if ((e.att === 1 && !collant(cG)) || (e.att === 2 && !collant(cD))) {
      const side = e.att === 1 ? -1 : 1;
      e.att = 0;
      if (e.vy < -0.3 && !sol) { e.vx = side * 1.9; e.vy = Math.min(e.vy, -2.9); }
    }
    if (e.att === 3 && !collant(cH)) e.att = 0;
    if ((e.att === 1 || e.att === 2) && collant(cH) && v < 0) {   // coin intérieur : du mur au plafond
      const side = e.att === 1 ? -1 : 1;
      e.vx = -side * Math.min(K.lConvMax, Math.max(Math.abs(vyPre), K.lRampe) * K.lConv); e.vy = -0.5; e.att = 3;
      if (Math.abs(vyPre) > 2) e.ev |= EV.CONVERSION;
    } else if (e.att === 3 && hitX) {                            // du plafond au mur
      const side = vxPre < 0 ? -1 : 1;
      e.att = side < 0 ? 1 : 2; e.vy = v > 0 ? Math.abs(vxPre) * K.lConv : 0; e.vx = side * 0.5;
    }
    if (e.att === 0) {
      const libreG = !(e.jetCd > 0 && e.jetSide === -1), libreD = !(e.jetCd > 0 && e.jetSide === 1);
      const accroche = (side) => {
        const vh = Math.abs(vxPre);
        if (vh > Math.abs(e.vy)) { e.vy = (v > 0 ? 1 : -1) * Math.min(K.lConvMax, vh * K.lConv); if (vh > 2) e.ev |= EV.CONVERSION; }
        e.att = side < 0 ? 1 : 2; e.vx = side * 0.5; e.sol = false;
      };
      if (collant(cG) && libreG && (!sol || h < 0)) accroche(-1);
      else if (collant(cD) && libreD && (!sol || h > 0)) accroche(1);
      else if (collant(cH) && !sol && !(e.jetCd > 0 && e.jetSide === 0) && vyPre <= 0) {
        const vit = Math.max(Math.abs(vyPre), Math.abs(e.vx));
        const dir = h || Math.sign(e.vx) || e.face;
        if (Math.abs(vyPre) > Math.abs(e.vx)) { e.vx = dir * Math.min(K.lConvMax, vit * K.lConv); if (vit > 2) e.ev |= EV.CONVERSION; }
        e.vy = -0.5; e.att = 3;
      }
    } else if ((e.att === 1 || e.att === 2) && sol && v > 0) e.att = 0;
  } else if (e.phase !== L) e.att = 0;

  // recharge au sol
  if (e.sol && (e.phase === S || e.phase === L) && e.charges < K.charges) e.charges = K.charges;

  /* ----- cases spéciales touchées ----- */
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + W - 0.001) / T);
  const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + H - 0.001) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = tuile(n, tx, ty);
    if (t <= MUR || t === GRILLE || t === TAMIS || t === EAU || t === PLATE || (t >= VENT_D && t <= VENT_B)) continue;
    const bx = tx * T, by = ty * T;
    const dans = (m) => e.x + W > bx + m && e.x < bx + T - m && e.y + H > by + m && e.y < by + T - m;
    if (t === PICS) {
      const r = zonePics(n, tx, ty);
      if (e.x + W > r[0] && e.x < r[2] && e.y + H > r[1] && e.y < r[3]) mourir(e);
    }
    else if (t === FEU) {
      if (!dans(2) || e.immun > 0) continue;
      if (e.phase === S) mourir(e);
      else if (e.phase === L) {                               // l'eau s'évapore : elle devient gaz
        e.phase = Z; e.gaz = K.zDuree; e.vy = -3; e.att = 0; e.immun = 10; e.ev |= EV.EVAPORE; e.evX = tx; e.evY = ty;
      } else if (e.phase === Z) {                              // la vapeur explose : propulsion
        let dx = e.x + W / 2 - (bx + T / 2), dy = e.y + H / 2 - (by + T / 2);
        const d = Math.hypot(dx, dy) || 1;
        if (d < 0.5) { dx = 0; dy = -1; } else { dx /= d; dy /= d; }
        e.vx = dx * K.boum + e.vx * 0.2; e.vy = dy * K.boum - 1.2; e.phase = S; e.gaz = 0; e.immun = 12; e.sol = false;
        e.ev |= EV.BOUM; e.evX = tx; e.evY = ty;
      }
    } else if (t === RESSORT) {
      if (!(e.y + H > by + 6) || e.vy < 0 || e.dansEau) continue;
      const fort = e.phase === S && (e.slam || e.slamAt > 0);
      if (e.phase === Z) e.vy = -4.6;
      else { e.vy = -(fort ? K.ressortFracas : K.ressort); if (e.phase === P) { e.phase = S; e.dash = 0; e.cdP = K.pRecharge; } }
      e.slam = false; e.slamAt = 0; e.sol = false; e.att = 0; e.charges = K.charges; e.ev |= EV.RESSORT; e.evX = tx; e.evY = ty;
    } else if (t === CRISTAL) {
      const i = tx * 1024 + ty;
      if (e.charges < K.charges && dans(1) && !e.cristaux.some(c => c[0] === i)) {
        e.charges = K.charges; e.cristaux.push([i, e.temps + 150]); e.ev |= EV.CRISTAL; e.evX = tx; e.evY = ty;
      }
    } else if (t === BUT) { e.fini = true; e.ev |= EV.FIN; }
    else if (t === ECLAT) { if (!e.eclat) { e.eclat = true; e.ev |= EV.ECLAT; e.evX = tx; e.evY = ty; } }
    else if (t === DRAPEAU) {
      if (!e.cp || e.cp.tx !== tx || e.cp.ty !== ty) {
        e.cp = { x: tx * T + (T - W) / 2, y: (ty + 1) * T - H, tx, ty }; e.ev |= EV.DRAPEAU; e.evX = tx; e.evY = ty;
      }
    } else if ((t === TP1 || t === TP2) && e.tpCd === 0) {
      const ccx = e.x + W / 2, ccy = e.y + H / 2;
      if (ccx > bx && ccx < bx + T && ccy > by && ccy < by + T) {
        const s = n.tp.get(ty * n.w + tx);
        if (s) {
          e.evX = ccx; e.evY = ccy;
          e.x = s.x * T + (T - W) / 2; e.y = s.y * T + (T - H) / 2; e.tpCd = 20; e.ev |= EV.TP; e.att = 0;
        }
      }
    }
    if (e.fini || e.mortT > 0) break;
  }
  if (e.y > n.h * T + 8) mourir(e);
}

/* ---------- Entrées compactes (fantômes) ---------- */
function compresser(liste) {          // [inp, inp, ...] -> "valeur*nombre,..." en base 36
  const out = [];
  for (let i = 0; i < liste.length;) {
    let j = i; while (j < liste.length && liste[j] === liste[i]) j++;
    out.push(liste[i].toString(36) + (j - i > 1 ? '*' + (j - i).toString(36) : ''));
    i = j;
  }
  return out.join(',');
}
function decompresser(s) {
  const out = [];
  if (!s) return out;
  for (const morceau of s.split(',')) {
    const [a, b] = morceau.split('*');
    const v = parseInt(a, 36), k = b ? parseInt(b, 36) : 1;
    for (let i = 0; i < k; i++) out.push(v);
  }
  return out;
}

const Moteur = { T, W, H, S, L, Z, P, NOMS_PHASES, E, EV, K, CH,
  VIDE, MUR, GRILLE, TAMIS, FRAGILE, PICS, FEU, EAU, GLACE, RESSORT, CRISTAL, BUT, DRAPEAU, PLATE, TAPIS_G, TAPIS_D,
  VENT_D, VENT_G, VENT_H, VENT_B, TP1, TP1S, TP2, TP2S, ECLAT, PANNEAU,
  charger, recharger, nouvelEtat, cloner, pas, tuile, plein, casse, compresser, decompresser, sensPics, zonePics };
if (typeof module !== 'undefined' && module.exports) module.exports = Moteur;
else racine.Moteur = Moteur;
})(typeof window !== 'undefined' ? window : globalThis);
