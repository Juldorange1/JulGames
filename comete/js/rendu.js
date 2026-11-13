'use strict';
/* COMÈTE — affichage (canvas 2D) */

var COULEURS_COMETE = [
  { nom: 'Glace', c: '#5ef2ff', etoiles: 0 }, { nom: 'Aurore', c: '#7dffb0', etoiles: 2 }, { nom: 'Soleil', c: '#ffd34d', etoiles: 5 },
  { nom: 'Rose', c: '#ff7ad9', etoiles: 9 }, { nom: 'Lilas', c: '#b49bff', etoiles: 14 }, { nom: 'Blanc pur', c: '#ffffff', etoiles: 20 },
  { nom: 'Corail', c: '#ff9a6b', etoiles: 27 }, { nom: 'Menthe', c: '#4dffd8', etoiles: 35 }, { nom: 'Ambre', c: '#ffb13d', etoiles: 45 },
  { nom: 'Azur', c: '#4da3ff', etoiles: 60 }, { nom: 'Rubis', c: '#ff4d7a', etoiles: 80 }, { nom: 'Arc-en-ciel', c: 'arc', etoiles: 110 }
];
var TRAINEES = [
  { nom: 'Ruban', succes: null }, { nom: 'Étincelles', succes: 'premier' }, { nom: 'Double fil', succes: 'combo20' },
  { nom: 'Pointillés', succes: 'pile50' }, { nom: 'Flamme', succes: 'titan' }, { nom: 'Constellation', succes: 'odyssee10' }
];
var POLICE = '"Segoe UI", system-ui, sans-serif';

var Rendu = {
  cv: null, g: null, w: 0, h: 0, dpr: 1, k: 40, ox: 0, oy: 0,
  etoiles: [], fx: null, secousse: 0,
  init: function (cv) {
    this.cv = cv; this.g = cv.getContext('2d');
    var R = rngGraine(77);
    for (var i = 0; i < 160; i++) this.etoiles.push({ x: R(), y: R(), z: R.entre(0.2, 1), p: R() * TAU });
    this.viderFx();
    this.taille();
  },
  viderFx: function () { this.fx = { part: [], textes: [], flashs: [], anneaux: [], eclairs: [] }; this.secousse = 0; },
  taille: function () {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.cv.width = Math.round(this.w * this.dpr); this.cv.height = Math.round(this.h * this.dpr);
  },
  cadrer: function (C) {
    var haut = 54, bas = 64;   // place pour la barre du haut et les compétences en bas
    this.k = Math.min(this.w / (C.W + 0.4), (this.h - haut - bas) / (C.H + 0.3));
    this.ox = (this.w - C.W * this.k) / 2; this.oy = haut + (this.h - haut - bas - C.H * this.k) / 2;
  },
  couleurJoueur: function (t) {
    var c = COULEURS_COMETE[Sauve.d.cosmetique.couleur] || COULEURS_COMETE[0];
    if (c.c === 'arc') return 'hsl(' + ((t * 90) % 360) + ',100%,65%)';
    return c.c;
  },

  /* ---------- effets (déclenchés par les événements du combat) ---------- */
  particules: function (x, y, n, col, v, vie, taille) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, s = (0.3 + Math.random()) * (v || 3);
      this.fx.part.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vie: (vie || 0.6) * (0.5 + Math.random() * 0.7), max: vie || 0.6, col: col, t: taille || 0.06 });
    }
    if (this.fx.part.length > 900) this.fx.part.splice(0, this.fx.part.length - 900);
  },
  texte: function (x, y, txt, col, taille, vie) { this.fx.textes.push({ x: x, y: y, txt: txt, col: col || '#fff', t: taille || 0.4, vie: vie || 0.9, max: vie || 0.9 }); },
  anneau: function (x, y, r, vr, col, vie, ep) { this.fx.anneaux.push({ x: x, y: y, r: r, vr: vr, col: col, vie: vie, max: vie, ep: ep || 0.08 }); },
  secouer: function (f) { this.secousse = Math.max(this.secousse, f * Sauve.d.reglages.tremblement); },
  majFx: function (dt) {
    var f = this.fx, i;
    for (i = f.part.length - 1; i >= 0; i--) { var p = f.part[i]; p.vie -= dt; if (p.vie <= 0) { f.part.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
    for (i = f.textes.length - 1; i >= 0; i--) { var t = f.textes[i]; t.vie -= dt; t.y -= dt * 0.8; if (t.vie <= 0) f.textes.splice(i, 1); }
    for (i = f.flashs.length - 1; i >= 0; i--) { f.flashs[i].vie -= dt; if (f.flashs[i].vie <= 0) f.flashs.splice(i, 1); }
    for (i = f.anneaux.length - 1; i >= 0; i--) { var a = f.anneaux[i]; a.vie -= dt; a.r += a.vr * dt; if (a.vie <= 0) f.anneaux.splice(i, 1); }
    for (i = f.eclairs.length - 1; i >= 0; i--) { f.eclairs[i].vie -= dt; if (f.eclairs[i].vie <= 0) f.eclairs.splice(i, 1); }
    this.secousse = Math.max(0, this.secousse - dt * 2.5);
  },

  /* ---------- image complète ---------- */
  dessiner: function (C, J, tReel) {
    var g = this.g, k = this.k, dpr = this.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var def = C.def, h1 = def.teinte, h2 = def.teinte2;
    var beat = C.t > T0 ? ((C.t - T0) / C.b) % 1 : 0.5, pouls = Math.pow(1 - beat, 3);
    g.fillStyle = '#05030c'; g.fillRect(0, 0, this.w, this.h);
    var sx = 0, sy = 0;
    if (this.secousse > 0) { sx = (Math.random() - 0.5) * this.secousse * 14; sy = (Math.random() - 0.5) * this.secousse * 14; }
    g.save(); g.translate(this.ox + sx, this.oy + sy); g.scale(k, k);
    var W = C.W, H = C.H;
    var gr = g.createRadialGradient(C.corps.x, C.corps.y, 0.5, W / 2, H / 2, W * 0.75);
    gr.addColorStop(0, 'hsla(' + h1 + ',45%,' + (10 + pouls * 3) + '%,1)'); gr.addColorStop(1, 'hsla(' + h2 + ',40%,3%,1)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (var i = 0; i < this.etoiles.length; i++) {
      var e = this.etoiles[i], ex = (e.x * W + C.t * 0.08 * e.z) % W, ey = e.y * H;
      g.globalAlpha = 0.25 + 0.5 * e.z * (0.6 + 0.4 * Math.sin(tReel * 2 + e.p));
      g.fillStyle = '#fff'; g.fillRect(ex, ey, 0.03 * e.z + 0.012, 0.03 * e.z + 0.012);
    }
    g.globalAlpha = 1;
    g.strokeStyle = 'hsla(' + h1 + ',80%,70%,' + (0.05 + pouls * 0.07) + ')'; g.lineWidth = 0.025;
    for (var r = 1.6; r < 12; r += 1.6) { g.beginPath(); g.arc(C.corps.x, C.corps.y, r + pouls * 0.12, 0, TAU); g.stroke(); }
    g.strokeStyle = 'hsla(' + h2 + ',80%,70%,0.35)'; g.lineWidth = 0.04; g.strokeRect(0, 0, W, H);

    g.globalCompositeOperation = 'lighter';
    this.dessinerFlashs(g, C);
    for (i = 0; i < C.braises.length; i++) { var bz = C.braises[i]; g.fillStyle = 'rgba(255,120,40,' + (0.12 * clamp((bz.tFin - C.t) / 1.2, 0, 1)) + ')'; this.poly(g, bz.poly); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    g.save(); g.beginPath(); g.rect(-0.05, -0.05, W + 0.1, H + 0.1); g.clip();
    this.dessinerAnnonces(g, C);
    this.dessinerColosse(g, C, pouls);
    this.dessinerDangers(g, C, tReel);
    g.restore();
    if (C.fantome) this.dessinerTrace(g, C, C.fantome.tr, 'rgba(200,200,255,1)', C.fantome.x, C.fantome.y, tReel, true);
    this.dessinerTrace(g, C, C.tr, C.eff.rempart ? '#ffd34d' : this.couleurJoueur(tReel), C.j.x, C.j.y, tReel, false);
    this.dessinerJoueur(g, C, J, tReel);
    this.dessinerFx(g);
    if (C.mut.nuit) this.nuit(g, C);
    g.restore();
    if (C.eff.distorsion) { g.fillStyle = 'rgba(80,140,255,0.08)'; g.fillRect(0, 0, this.w, this.h); }
    this.dessinerHUD(g, C, J, tReel, pouls);
  },
  poly: function (g, P) { g.beginPath(); g.moveTo(P[0], P[1]); for (var i = 2; i < P.length; i += 2) g.lineTo(P[i], P[i + 1]); g.closePath(); },

  dessinerFlashs: function (g, C) {
    var f = this.fx.flashs;
    for (var i = 0; i < f.length; i++) {
      var fl = f[i], u = fl.vie / fl.max;
      g.fillStyle = fl.col.replace('A', (0.35 * u).toFixed(3)); this.poly(g, fl.poly); g.fill();
      g.strokeStyle = fl.col.replace('A', (0.9 * u).toFixed(3)); g.lineWidth = 0.05 + (1 - u) * 0.1; g.stroke();
    }
  },

  dessinerAnnonces: function (g, C) {
    var j = C.j, co = C.corps;
    for (var i = 0; i < C.annonces.length; i++) {
      var a = C.annonces[i];
      if (C.t >= a.tF) continue;
      var u = clamp((C.t - a.tA) / Math.max(0.05, a.tF - a.tA), 0, 1);
      var clign = 0.5 + 0.5 * Math.sin(C.t * 30);
      switch (a.type) {
        case 'laser': case 'croix': case 'balayage': case 'eclair':
          for (var l = 0; l < a.lasers.length; l++) {
            var L = a.lasers[l], cs = corpsDe(C, L.corps || 0), lx = L.suit ? cs.x : L.x, ly = L.suit ? cs.y : L.y, ll = L.len || 30;
            g.strokeStyle = (a.type === 'eclair' ? 'rgba(200,220,255,' : 'rgba(255,90,120,') + (0.2 + 0.5 * u) + ')'; g.lineWidth = 0.03 + (L.w || 0.34) * 0.8 * u * u;
            g.setLineDash([0.2, 0.15]); g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + Math.cos(L.a) * ll, ly + Math.sin(L.a) * ll); g.stroke(); g.setLineDash([]);
            if (L.rot) { g.strokeStyle = 'rgba(255,90,120,0.25)'; g.lineWidth = 0.04; g.beginPath(); g.arc(lx, ly, 2.5, L.a, L.a + L.rot * a.duree, L.rot < 0); g.stroke(); }
          }
          break;
        case 'meteores':
          for (var p = 0; p < a.pts.length; p += 2) {
            g.fillStyle = 'rgba(255,70,60,' + (0.08 + 0.25 * u) + ')'; g.beginPath(); g.arc(a.pts[p], a.pts[p + 1], a.r, 0, TAU); g.fill();
            g.strokeStyle = 'rgba(255,120,90,' + (0.5 + 0.4 * clign * u) + ')'; g.lineWidth = 0.04; g.beginPath(); g.arc(a.pts[p], a.pts[p + 1], a.r * u, 0, TAU); g.stroke();
            g.beginPath(); g.arc(a.pts[p], a.pts[p + 1], a.r, 0, TAU); g.stroke();
          }
          break;
        case 'mines':
          for (var m = 0; m < a.pts.length; m += 2) { g.strokeStyle = 'rgba(255,170,60,' + (0.3 + 0.5 * u) + ')'; g.lineWidth = 0.04; var rr = 0.45 * (1.4 - u); g.beginPath(); g.moveTo(a.pts[m] - rr, a.pts[m + 1]); g.lineTo(a.pts[m] + rr, a.pts[m + 1]); g.moveTo(a.pts[m], a.pts[m + 1] - rr); g.lineTo(a.pts[m], a.pts[m + 1] + rr); g.stroke(); }
          break;
        case 'onde':
          g.strokeStyle = 'rgba(230,240,255,' + (0.15 + 0.4 * u) + ')'; g.lineWidth = 0.06;
          g.beginPath(); g.arc(co.x, co.y, co.r + 0.35, a.gap + a.larg / 2, a.gap - a.larg / 2 + TAU); g.stroke();
          g.fillStyle = 'rgba(120,255,170,' + (0.5 + 0.5 * clign) + ')';
          g.beginPath(); g.arc(co.x + Math.cos(a.gap) * (co.r + 0.75), co.y + Math.sin(a.gap) * (co.r + 0.75), 0.11, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(120,255,170,0.35)'; g.lineWidth = 0.03; g.setLineDash([0.1, 0.12]);
          g.beginPath(); g.moveTo(co.x + Math.cos(a.gap) * (co.r + 0.9), co.y + Math.sin(a.gap) * (co.r + 0.9)); g.lineTo(co.x + Math.cos(a.gap) * 6, co.y + Math.sin(a.gap) * 6); g.stroke(); g.setLineDash([]);
          if (a.gap2 != null) { g.fillStyle = 'rgba(120,255,170,0.4)'; g.beginPath(); g.arc(co.x + Math.cos(a.gap2) * (co.r + 0.75), co.y + Math.sin(a.gap2) * (co.r + 0.75), 0.08, 0, TAU); g.fill(); }
          break;
        case 'murs':
          var vert = a.cote < 2, W = C.W, H = C.H, long = vert ? H : W, c0 = a.trou * long - a.tr / 2, c1 = a.trou * long + a.tr / 2;
          g.fillStyle = 'rgba(230,240,255,' + (0.15 + 0.45 * u * clign) + ')';
          var ep = 0.14;
          if (a.cote === 0) { g.fillRect(0, 0, ep, c0); g.fillRect(0, c1, ep, H - c1); }
          if (a.cote === 1) { g.fillRect(W - ep, 0, ep, c0); g.fillRect(W - ep, c1, ep, H - c1); }
          if (a.cote === 2) { g.fillRect(0, 0, c0, ep); g.fillRect(c1, 0, W - c1, ep); }
          if (a.cote === 3) { g.fillRect(0, H - ep, c0, ep); g.fillRect(c1, H - ep, W - c1, ep); }
          break;
        case 'ruee':
          if (!a.cible) break;
          g.strokeStyle = 'rgba(255,80,80,' + (0.3 + 0.5 * u) + ')'; g.lineWidth = co.r * 1.6 * u; g.globalAlpha = 0.35;
          g.beginPath(); g.moveTo(co.x, co.y); g.lineTo(a.cible.x, a.cible.y); g.stroke(); g.globalAlpha = 1;
          g.strokeStyle = 'rgba(255,80,80,0.8)'; g.lineWidth = 0.05; g.beginPath(); g.arc(a.cible.x, a.cible.y, co.r, 0, TAU); g.stroke();
          break;
        case 'cage':
          g.strokeStyle = 'rgba(255,110,140,' + (0.25 + 0.5 * u) + ')'; g.lineWidth = 0.05; g.setLineDash([0.15, 0.12]);
          var t0 = TAU * (a.trou + a.trouN) / a.n, t1 = TAU * a.trou / a.n + TAU;
          g.beginPath(); g.arc(a.cx, a.cy, a.r, t0, t1); g.stroke(); g.setLineDash([]);
          var am = TAU * (a.trou + (a.trouN - 1) / 2) / a.n;
          g.fillStyle = 'rgba(120,255,170,' + (0.5 + 0.5 * clign) + ')'; g.beginPath(); g.arc(a.cx + Math.cos(am) * a.r, a.cy + Math.sin(am) * a.r, 0.12, 0, TAU); g.fill();
          break;
        case 'faux':
          var sf = sourcePos(C, a.src);
          g.strokeStyle = 'rgba(255,110,140,' + (0.15 + 0.35 * u) + ')'; g.lineWidth = 0.22;
          for (var fb = 0; fb < a.nb; fb++) { var fa = a.a0 + TAU * fb / a.nb; g.beginPath(); g.moveTo(sf.x + Math.cos(fa) * 0.7, sf.y + Math.sin(fa) * 0.7); g.lineTo(sf.x + Math.cos(fa) * (0.7 + a.long * 0.5), sf.y + Math.sin(fa) * (0.7 + a.long * 0.5)); g.stroke(); }
          break;
        case 'trounoir':
          g.strokeStyle = 'rgba(190,140,255,' + (0.3 + 0.5 * u) + ')'; g.lineWidth = 0.05;
          g.beginPath(); g.arc(a.px, a.py, 0.3 + (1 - u) * 1.5, 0, TAU); g.stroke();
          g.fillStyle = 'rgba(40,0,70,' + (0.3 * u) + ')'; g.beginPath(); g.arc(a.px, a.py, 0.4, 0, TAU); g.fill();
          break;
        default: // rosace, salve, spirale, éclats, traqueurs, pluie, fleur, serpent : la source se charge
          var s = sourcePos(C, a.src);
          if (a.type === 'eclats' || a.type === 'fleur') {
            for (var n = 0; n < C.noyaux.length; n++) if (!C.noyaux[n].mort) { g.strokeStyle = 'rgba(255,110,140,' + (0.3 + 0.6 * u) + ')'; g.lineWidth = 0.05; g.beginPath(); g.arc(C.noyaux[n].x, C.noyaux[n].y, 0.55 - 0.25 * u, 0, TAU); g.stroke(); }
          } else if (a.type === 'pluie') {
            g.fillStyle = 'rgba(255,110,140,' + (0.2 + 0.4 * u * clign) + ')';
            for (var q = 0; q < a.cols.length; q++) g.fillRect(a.cols[q] - 0.06, a.haut ? 0 : C.H - 0.12, 0.12, 0.12);
          } else {
            var rs = (a.src && a.src.noyau != null ? 0.6 : C.corps.r + 0.5) * (1.3 - 0.4 * u);
            g.strokeStyle = 'rgba(255,110,140,' + (0.3 + 0.6 * u) + ')'; g.lineWidth = 0.06;
            g.beginPath(); g.arc(s.x, s.y, rs, 0, TAU); g.stroke();
            if (a.type === 'salve' || a.type === 'serpent') { var aa = Math.atan2(j.y - s.y, j.x - s.x); g.beginPath(); g.moveTo(s.x + Math.cos(aa) * 1.1, s.y + Math.sin(aa) * 1.1); g.lineTo(s.x + Math.cos(aa) * (1.1 + u), s.y + Math.sin(aa) * (1.1 + u)); g.stroke(); }
          }
      }
    }
  },

  dessinerCorps: function (g, C, co, pouls) {
    var def = C.def, h1 = def.teinte, h2 = def.teinte2, cp = def.corps;
    var r = co.r * (1 + pouls * 0.05);
    var ouvert = C.phase === 'coeur' || C.phase === 'transition';
    g.save(); g.translate(co.x, co.y);
    g.shadowColor = 'hsla(' + h1 + ',90%,60%,0.9)'; g.shadowBlur = 25 * this.k / 40;
    var grd = g.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
    grd.addColorStop(0, ouvert ? 'hsl(' + h1 + ',30%,12%)' : 'hsl(' + h1 + ',70%,45%)'); grd.addColorStop(1, 'hsl(' + h1 + ',70%,' + (ouvert ? 14 : 24) + '%)');
    g.fillStyle = grd;
    g.rotate(co.ang);
    this.formeCorps(g, cp, r);
    g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = 'hsla(' + h1 + ',90%,75%,0.9)'; g.lineWidth = 0.06; g.stroke();
    var dmg = pctCombat(C);
    if (dmg > 0.1) {
      g.strokeStyle = 'hsla(' + h2 + ',100%,80%,' + (0.3 + dmg * 0.6) + ')'; g.lineWidth = 0.035;
      var R = rngGraine(def.graine + co.i);
      for (var f = 0; f < Math.floor(dmg * 8); f++) { var a0 = R() * TAU; g.beginPath(); g.moveTo(Math.cos(a0) * r * 0.2, Math.sin(a0) * r * 0.2); g.lineTo(Math.cos(a0 + 0.3) * r * 0.55, Math.sin(a0 + 0.3) * r * 0.55); g.lineTo(Math.cos(a0 - 0.1) * r * 0.9, Math.sin(a0 - 0.1) * r * 0.9); g.stroke(); }
    }
    g.restore();
    if (!ouvert) {
      var ea = Math.atan2(C.j.y - co.y, C.j.x - co.x), er = r * 0.3;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(co.x, co.y, er, 0, TAU); g.fill();
      g.fillStyle = 'hsl(' + h2 + ',90%,30%)'; g.beginPath(); g.arc(co.x + Math.cos(ea) * er * 0.4, co.y + Math.sin(ea) * er * 0.4, er * 0.55, 0, TAU); g.fill();
      g.fillStyle = '#000'; g.beginPath(); g.arc(co.x + Math.cos(ea) * er * 0.5, co.y + Math.sin(ea) * er * 0.5, er * 0.25, 0, TAU); g.fill();
    } else { g.fillStyle = 'rgba(0,0,0,0.8)'; g.beginPath(); g.arc(co.x, co.y, r * 0.35, 0, TAU); g.fill(); }
  },

  dessinerColosse: function (g, C, pouls) {
    var def = C.def, co = C.corps, h1 = def.teinte, h2 = def.teinte2, i;
    // liens vers les cristaux (chaîne pour l'hydre, cordes pour le pendule)
    g.strokeStyle = 'hsla(' + h2 + ',90%,70%,0.22)'; g.lineWidth = 0.05;
    g.setLineDash([0.12, 0.12]); g.lineDashOffset = -C.t * 0.8;
    if (def.espece === 'hydre') {
      g.lineWidth = 0.09; g.strokeStyle = 'hsla(' + h1 + ',70%,55%,0.45)'; g.setLineDash([]);
      g.beginPath(); g.moveTo(co.x, co.y);
      var file = C.noyaux.filter(function (n) { return n.def.place === 'chaine' && !n.mort; }).sort(function (a, b) { return a.def.rang - b.def.rang; });
      for (i = 0; i < file.length; i++) g.lineTo(file[i].x, file[i].y);
      g.stroke();
    } else for (i = 0; i < C.noyaux.length; i++) {
      var n = C.noyaux[i]; if (n.mort) continue;
      var c = corpsDe(C, n.def.corps);
      g.beginPath();
      if (n.def.place === 'pendule') { g.lineWidth = 0.04; g.setLineDash([]); g.strokeStyle = 'hsla(' + h2 + ',60%,75%,0.4)'; g.moveTo(c.x + n.def.pivot, c.y); }
      else g.moveTo(c.x, c.y);
      g.lineTo(n.x, n.y); g.stroke();
    }
    g.setLineDash([]);
    // les cristaux liés : une chaîne d'or entre eux
    for (i = 0; i < C.noyaux.length; i++) {
      var a = C.noyaux[i]; if (a.mort || a.def.type !== 'lie' || a.def.lien == null || a.def.lien < i) continue;
      var b = C.noyaux[a.def.lien]; if (!b || b.mort) continue;
      g.strokeStyle = 'rgba(255,211,77,0.85)'; g.lineWidth = 0.06; g.setLineDash([0.08, 0.06]);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.setLineDash([]);
    }
    // rempart de la forteresse
    if (def.rempart && C.phase !== 'coeur' && C.phase !== 'transition' && C.phase !== 'fin') {
      var rp = def.rempart;
      for (var gp = 0; gp < 2; gp++) {
        var d0 = C.rempartA + gp * Math.PI + rp.larg / 2, d1 = C.rempartA + (gp + 1) * Math.PI - rp.larg / 2;
        g.strokeStyle = 'rgba(160,200,255,0.4)'; g.lineWidth = 0.4; g.beginPath(); g.arc(co.x, co.y, rp.r, d0, d1); g.stroke();
        g.strokeStyle = 'rgba(240,248,255,0.95)'; g.lineWidth = 0.14; g.beginPath(); g.arc(co.x, co.y, rp.r, d0, d1); g.stroke();
        g.fillStyle = '#7dffb0';
        g.beginPath(); g.arc(co.x + Math.cos(d0) * rp.r, co.y + Math.sin(d0) * rp.r, 0.09, 0, TAU); g.arc(co.x + Math.cos(d1) * rp.r, co.y + Math.sin(d1) * rp.r, 0.09, 0, TAU); g.fill();
      }
    }
    if (C.phase !== 'fin') { this.dessinerCorps(g, C, co, pouls); if (C.corps2) this.dessinerCorps(g, C, C.corps2, pouls); }
    // cristaux
    for (i = 0; i < C.noyaux.length; i++) {
      var nk = C.noyaux[i]; if (nk.mort) continue;
      var nd = nk.def, rn = (nd.r || 0.3) * (1 + pouls * 0.08), bientot = !nk.prot && bouclierActif(C, nk, C.b * 0.5);
      var fant = nk.intang ? 0.28 : (nd.type === 'fantome' && intangible(C, nk, C.b * 0.5) ? 0.6 : 1);
      g.globalAlpha = fant;
      g.save(); g.globalCompositeOperation = 'lighter';
      var gn = g.createRadialGradient(nk.x, nk.y, 0, nk.x, nk.y, rn * 2.4);
      gn.addColorStop(0, 'hsla(' + h2 + ',100%,70%,0.6)'); gn.addColorStop(1, 'hsla(' + h2 + ',100%,50%,0)');
      g.fillStyle = gn; g.beginPath(); g.arc(nk.x, nk.y, rn * 2.4, 0, TAU); g.fill();
      g.restore();
      // un cristal à facettes qui tourne (jamais confondu avec une balle ronde)
      var ang = C.t * 1.2 + i, rr = rn * 1.15;
      var coul = nd.type === 'vivace' ? 'hsl(120,90%,' + (50 + pouls * 15) + '%)' : nd.type === 'eclatant' ? 'hsl(32,100%,' + (55 + pouls * 15) + '%)' : 'hsl(' + h2 + ',95%,' + (55 + pouls * 15) + '%)';
      g.fillStyle = nk.flash > 0 ? '#fff' : coul;
      g.beginPath(); for (var f = 0; f < 4; f++) { var af = ang + f * Math.PI / 2, rf = f % 2 ? rr * 0.72 : rr; if (f) g.lineTo(nk.x + Math.cos(af) * rf, nk.y + Math.sin(af) * rf); else g.moveTo(nk.x + Math.cos(af) * rf, nk.y + Math.sin(af) * rf); } g.closePath(); g.fill();
      g.strokeStyle = 'hsl(' + h2 + ',100%,88%)'; g.lineWidth = 0.035; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.moveTo(nk.x + Math.cos(ang) * rr, nk.y + Math.sin(ang) * rr); g.lineTo(nk.x, nk.y); g.lineTo(nk.x + Math.cos(ang + Math.PI / 2) * rr * 0.72, nk.y + Math.sin(ang + Math.PI / 2) * rr * 0.72); g.closePath(); g.fill();
      // vie (verte quand il se répare)
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.07; g.beginPath(); g.arc(nk.x, nk.y, rn + 0.13, 0, TAU); g.stroke();
      g.strokeStyle = nk.regen ? 'rgb(120,255,150)' : '#fff'; g.lineWidth = 0.05; g.beginPath(); g.arc(nk.x, nk.y, rn + 0.13, -Math.PI / 2, -Math.PI / 2 + TAU * nk.hp / nk.hpMax); g.stroke();
      // signes des sortes de cristaux
      if (nd.type === 'sens') {
        // flèche qui tourne dans le sens demandé
        var s0 = nd.sens > 0 ? C.t * 2 : -C.t * 2, rA = rn + 0.3;
        g.strokeStyle = '#ffe27a'; g.lineWidth = 0.05;
        g.beginPath(); g.arc(nk.x, nk.y, rA, s0, s0 + nd.sens * 2.2, nd.sens < 0); g.stroke();
        var fx = nk.x + Math.cos(s0 + nd.sens * 2.2) * rA, fy = nk.y + Math.sin(s0 + nd.sens * 2.2) * rA, ta = s0 + nd.sens * 2.2 + nd.sens * Math.PI / 2;
        g.fillStyle = '#ffe27a'; g.beginPath(); g.moveTo(fx + Math.cos(ta) * 0.14, fy + Math.sin(ta) * 0.14); g.lineTo(fx + Math.cos(ta + 2.4) * 0.11, fy + Math.sin(ta + 2.4) * 0.11); g.lineTo(fx + Math.cos(ta - 2.4) * 0.11, fy + Math.sin(ta - 2.4) * 0.11); g.closePath(); g.fill();
      } else if (nd.type === 'blinde') {
        g.strokeStyle = 'rgba(200,210,230,0.95)'; g.lineWidth = 0.09;
        for (var pl = 0; pl < 4; pl++) { var pa = pl * Math.PI / 2 + C.t * 0.5; g.beginPath(); g.arc(nk.x, nk.y, rn + 0.24, pa - 0.45, pa + 0.45); g.stroke(); }
      } else if (nd.type === 'vivace' && nk.regen) {
        g.strokeStyle = 'rgba(120,255,150,' + (0.4 + 0.4 * Math.sin(C.t * 8)) + ')'; g.lineWidth = 0.03; g.beginPath(); g.arc(nk.x, nk.y, rn + 0.32, 0, TAU); g.stroke();
      }
      if (nk.prot || bientot) {
        g.strokeStyle = nk.prot ? 'rgba(160,220,255,0.95)' : 'rgba(160,220,255,' + (0.3 + 0.3 * Math.sin(C.t * 25)) + ')';
        g.lineWidth = 0.06; g.beginPath();
        for (var s = 0; s <= 6; s++) { var sa = s / 6 * TAU + C.t; var px = nk.x + Math.cos(sa) * 0.58, py = nk.y + Math.sin(sa) * 0.58; if (s) g.lineTo(px, py); else g.moveTo(px, py); }
        g.stroke();
        if (nk.prot) { g.fillStyle = 'rgba(120,200,255,0.18)'; g.fill(); }
      }
      g.globalAlpha = 1;
    }
    // cœur
    var ck = C.coeur;
    if (ck && C.phase !== 'fin') {
      var rc = 0.34 + pouls * 0.05 + (ck.souffle || 0) * 0.12;
      if (ck.souffle > 0) { g.strokeStyle = 'rgba(255,255,255,' + (ck.souffle * 0.7) + ')'; g.lineWidth = 0.05; g.beginPath(); g.arc(ck.x, ck.y, 0.75 - ck.souffle * 0.2, 0, TAU); g.stroke(); }
      g.save(); g.globalCompositeOperation = 'lighter';
      var gc = g.createRadialGradient(ck.x, ck.y, 0, ck.x, ck.y, 1.3);
      gc.addColorStop(0, 'rgba(255,255,255,0.7)'); gc.addColorStop(0.3, 'hsla(' + h1 + ',100%,65%,0.45)'); gc.addColorStop(1, 'hsla(' + h1 + ',100%,50%,0)');
      g.fillStyle = gc; g.beginPath(); g.arc(ck.x, ck.y, 1.3, 0, TAU); g.fill();
      g.restore();
      g.fillStyle = ck.flash > 0 ? '#fff' : 'hsl(' + h1 + ',100%,80%)';
      g.beginPath();
      for (var bb = 0; bb < 10; bb++) { var ra = bb % 2 ? rc * 0.5 : rc, ab = bb / 10 * TAU + C.t * 2; if (bb) g.lineTo(ck.x + Math.cos(ab) * ra, ck.y + Math.sin(ab) * ra); else g.moveTo(ck.x + Math.cos(ab) * ra, ck.y + Math.sin(ab) * ra); }
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.07; g.beginPath(); g.arc(ck.x, ck.y, rc + 0.2, 0, TAU); g.stroke();
      g.strokeStyle = ck.regen ? 'rgb(120,255,150)' : '#fff'; g.lineWidth = 0.05; g.beginPath(); g.arc(ck.x, ck.y, rc + 0.2, -Math.PI / 2, -Math.PI / 2 + TAU * ck.hp / ck.hpMax); g.stroke();
    }
  },
  formeCorps: function (g, cp, r) {
    g.beginPath();
    if (cp.forme === 'cercle') { g.arc(0, 0, r, 0, TAU); return; }
    var n = cp.cotes, i, a;
    if (cp.forme === 'etoile') { for (i = 0; i < n * 2; i++) { a = i / (n * 2) * TAU; var ra = i % 2 ? r * 0.62 : r * 1.08; if (i) g.lineTo(Math.cos(a) * ra, Math.sin(a) * ra); else g.moveTo(Math.cos(a) * ra, Math.sin(a) * ra); } g.closePath(); return; }
    if (cp.forme === 'couronne') { for (i = 0; i < n * 3; i++) { a = i / (n * 3) * TAU; var rb = i % 3 === 0 ? r * 1.1 : r * 0.9; if (i) g.lineTo(Math.cos(a) * rb, Math.sin(a) * rb); else g.moveTo(Math.cos(a) * rb, Math.sin(a) * rb); } g.closePath(); return; }
    for (i = 0; i < n; i++) { a = i / n * TAU; if (i) g.lineTo(Math.cos(a) * r, Math.sin(a) * r); else g.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath();
  },

  dessinerDangers: function (g, C, tReel) {
    var i;
    // tourbillon (compétence) et trous noirs
    if (C.vortex) {
      var vx = C.vortex;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (var sp = 0; sp < 4; sp++) { g.strokeStyle = 'rgba(120,220,255,' + (0.35 - sp * 0.07) + ')'; g.lineWidth = 0.06; g.beginPath(); g.arc(vx.x, vx.y, 0.5 + sp * 0.9 + (C.t * 2 % 0.9), C.t * 3 + sp, C.t * 3 + sp + 4); g.stroke(); }
      g.restore();
    }
    for (i = 0; i < C.trous.length; i++) {
      var tn = C.trous[i], fin = clamp((tn.tE - C.t) / 0.5, 0, 1);
      var gt = g.createRadialGradient(tn.x, tn.y, 0, tn.x, tn.y, 1.8);
      gt.addColorStop(0, 'rgba(0,0,0,' + fin + ')'); gt.addColorStop(0.25, 'rgba(60,10,110,' + 0.8 * fin + ')'); gt.addColorStop(1, 'rgba(60,10,110,0)');
      g.fillStyle = gt; g.beginPath(); g.arc(tn.x, tn.y, 1.8, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(200,150,255,' + 0.7 * fin + ')'; g.lineWidth = 0.04;
      for (var sr = 0; sr < 3; sr++) { g.beginPath(); g.arc(tn.x, tn.y, 0.45 + sr * 0.35, -C.t * 4 + sr * 2, -C.t * 4 + sr * 2 + 2.5); g.stroke(); }
      g.fillStyle = '#000'; g.beginPath(); g.arc(tn.x, tn.y, tn.r, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(230,200,255,0.9)'; g.lineWidth = 0.03; g.beginPath(); g.arc(tn.x, tn.y, tn.r, 0, TAU); g.stroke();
    }
    for (i = 0; i < C.meteores.length; i++) { var m = C.meteores[i], u = (m.tE - C.t) / 0.2; g.fillStyle = 'rgba(255,140,80,' + (0.6 * u) + ')'; g.beginPath(); g.arc(m.x, m.y, m.r, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,220,' + (0.7 * u) + ')'; g.beginPath(); g.arc(m.x, m.y, m.r * 0.5, 0, TAU); g.fill(); }
    for (i = 0; i < C.lasers.length; i++) {
      var L = C.lasers[i], ll = L.len || 40, ex = L.x + Math.cos(L.a) * ll, ey = L.y + Math.sin(L.a) * ll;
      var vieL = clamp((L.tE - C.t) / 0.1, 0, 1);
      g.save(); g.globalCompositeOperation = 'lighter';
      g.strokeStyle = 'rgba(160,200,255,' + 0.4 * vieL + ')'; g.lineWidth = L.w * 1.8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(L.x, L.y); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,' + 0.95 * vieL + ')'; g.lineWidth = L.w * 0.55;
      g.beginPath(); g.moveTo(L.x, L.y); g.lineTo(ex, ey); g.stroke();
      g.restore();
    }
    for (i = 0; i < C.ondes.length; i++) {
      var o = C.ondes[i];
      g.save(); g.globalCompositeOperation = 'lighter';
      g.strokeStyle = 'rgba(160,200,255,0.45)'; g.lineWidth = o.w * 2;
      g.beginPath(); g.arc(o.x, o.y, o.r, o.gap + o.larg / 2, o.gap - o.larg / 2 + TAU); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = o.w * 0.6; g.stroke();
      g.restore();
    }
    for (i = 0; i < C.murs.length; i++) {
      var mu = C.murs[i], mr = murRect(C, mu), W = C.W, H = C.H, ep = mu.ep;
      g.fillStyle = 'rgba(160,200,255,0.25)';
      if (mr.vert) { g.fillRect(mr.c - ep, 0, ep * 2, mr.g0); g.fillRect(mr.c - ep, mr.g1, ep * 2, H - mr.g1); }
      else { g.fillRect(0, mr.c - ep, mr.g0, ep * 2); g.fillRect(mr.g1, mr.c - ep, W - mr.g1, ep * 2); }
      g.fillStyle = 'rgba(240,248,255,0.95)';
      if (mr.vert) { g.fillRect(mr.c - ep / 2, 0, ep, mr.g0); g.fillRect(mr.c - ep / 2, mr.g1, ep, H - mr.g1); }
      else { g.fillRect(0, mr.c - ep / 2, mr.g0, ep); g.fillRect(mr.g1, mr.c - ep / 2, W - mr.g1, ep); }
      g.fillStyle = '#7dffb0';
      if (mr.vert) { g.fillRect(mr.c - ep, mr.g0 - 0.06, ep * 2, 0.06); g.fillRect(mr.c - ep, mr.g1, ep * 2, 0.06); }
      else { g.fillRect(mr.g0 - 0.06, mr.c - ep, 0.06, ep * 2); g.fillRect(mr.g1, mr.c - ep, 0.06, ep * 2); }
    }
    // faux : bras de boules qui tournent
    for (i = 0; i < C.bras.length; i++) {
      var br = C.bras[i], pts = brasPoints(br), apparition = clamp((C.t - br.nait) / 0.2, 0, 1) * clamp((br.tE - C.t) / 0.2, 0, 1);
      g.globalAlpha = apparition;
      g.strokeStyle = 'rgba(255,90,120,0.35)'; g.lineWidth = 0.08; g.beginPath(); g.moveTo(br.x, br.y); g.lineTo(pts[pts.length - 2], pts[pts.length - 1]); g.stroke();
      for (var p = 0; p < pts.length; p += 2) { g.fillStyle = '#ff5a7a'; g.beginPath(); g.arc(pts[p], pts[p + 1], br.r, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(pts[p], pts[p + 1], br.r * 0.45, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    }
    for (i = 0; i < C.mines.length; i++) {
      var mi = C.mines[i], reste = clamp((mi.tB - C.t) / mi.meche, 0, 1), cl = reste < 0.3 && Math.sin(C.t * 40) > 0;
      g.fillStyle = cl ? '#fff' : '#ffa53d'; g.beginPath();
      for (var s = 0; s < 16; s++) { var a = s / 16 * TAU + C.t, rr = s % 2 ? 0.13 : 0.24; if (s) g.lineTo(mi.x + Math.cos(a) * rr, mi.y + Math.sin(a) * rr); else g.moveTo(mi.x + Math.cos(a) * rr, mi.y + Math.sin(a) * rr); }
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,200,120,0.7)'; g.lineWidth = 0.04; g.beginPath(); g.arc(mi.x, mi.y, 0.36, -Math.PI / 2, -Math.PI / 2 + TAU * reste); g.stroke();
    }
    for (i = 0; i < C.traqueurs.length; i++) {
      var tq = C.traqueurs[i];
      g.fillStyle = '#c45cff'; g.beginPath(); g.arc(tq.x, tq.y, 0.19, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(tq.x + Math.cos(tq.a) * 0.07, tq.y + Math.sin(tq.a) * 0.07, 0.08, 0, TAU); g.fill();
      g.fillStyle = '#000'; g.beginPath(); g.arc(tq.x + Math.cos(tq.a) * 0.1, tq.y + Math.sin(tq.a) * 0.1, 0.04, 0, TAU); g.fill();
    }
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(255,60,90,0.35)';
    g.beginPath();
    for (i = 0; i < C.balles.length; i++) { var b = C.balles[i]; g.moveTo(b.x + b.r * 1.6, b.y); g.arc(b.x, b.y, b.r * 1.6, 0, TAU); }
    g.fill();
    g.restore();
    g.fillStyle = '#ff5a7a'; g.beginPath();
    for (i = 0; i < C.balles.length; i++) { var b2 = C.balles[i]; g.moveTo(b2.x + b2.r, b2.y); g.arc(b2.x, b2.y, b2.r, 0, TAU); }
    g.fill();
    g.fillStyle = '#fff'; g.beginPath();
    for (i = 0; i < C.balles.length; i++) { var b3 = C.balles[i]; g.moveTo(b3.x + b3.r * 0.5, b3.y); g.arc(b3.x, b3.y, b3.r * 0.5, 0, TAU); }
    g.fill();
  },

  dessinerTrace: function (g, C, T, col, hx, hy, tReel, fantome) {
    var n = T.tx.length; if (n < 2) { if (fantome && hx != null) { g.fillStyle = 'rgba(200,200,255,0.6)'; g.beginPath(); g.arc(hx, hy, 0.1, 0, TAU); g.fill(); } return; }
    var style = fantome ? 0 : Sauve.d.cosmetique.trainee, i;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = col; g.globalAlpha = C.eff.rempart && !fantome ? 0.4 : 0.18; g.lineWidth = C.eff.rempart && !fantome ? 0.32 : 0.22;
    g.beginPath(); g.moveTo(T.tx[0], T.ty[0]); for (i = 1; i < n; i++) g.lineTo(T.tx[i], T.ty[i]); g.lineTo(hx, hy); g.stroke();
    for (i = 1; i < n; i++) {
      var u = i / n;
      g.globalAlpha = (0.25 + 0.75 * u) * (fantome ? 0.6 : 1);
      g.lineWidth = 0.025 + 0.07 * u;
      if (style === 3 && i % 3 === 0) continue;
      g.beginPath(); g.moveTo(T.tx[i - 1], T.ty[i - 1]); g.lineTo(T.tx[i], T.ty[i]); g.stroke();
    }
    if (style === 2) {
      g.globalAlpha = 0.6; g.lineWidth = 0.02;
      g.beginPath(); for (i = 0; i < n; i++) { var off = Math.sin(i * 0.6 - tReel * 10) * 0.07; if (i) g.lineTo(T.tx[i] + off, T.ty[i] - off); else g.moveTo(T.tx[i] + off, T.ty[i] - off); } g.stroke();
    }
    if (style === 1 || style === 5) {
      g.fillStyle = '#fff';
      for (i = 0; i < n; i += style === 5 ? 6 : 3) { g.globalAlpha = (i / n) * (0.5 + 0.5 * Math.sin(i + tReel * 12)); g.fillRect(T.tx[i] - 0.03, T.ty[i] - 0.03, 0.06, 0.06); }
      if (style === 5) { g.globalAlpha = 0.25; g.lineWidth = 0.015; g.strokeStyle = '#fff'; g.beginPath(); for (i = 0; i < n; i += 6) { if (i) g.lineTo(T.tx[i], T.ty[i]); else g.moveTo(T.tx[i], T.ty[i]); } g.stroke(); }
    }
    if (style === 4) {
      for (i = 0; i < n; i += 2) { g.globalAlpha = 0.3 * (i / n); g.fillStyle = i % 4 ? '#ff8a2a' : '#ffd34d'; var fl = 0.05 + 0.08 * Math.random(); g.beginPath(); g.arc(T.tx[i] + (Math.random() - 0.5) * 0.1, T.ty[i] + (Math.random() - 0.5) * 0.1, fl, 0, TAU); g.fill(); }
    }
    g.restore();
    // le bout de la traînée (et l'ancre)
    g.fillStyle = col; g.globalAlpha = 0.6; g.beginPath(); g.arc(T.tx[0], T.ty[0], 0.05, 0, TAU); g.fill(); g.globalAlpha = 1;
    if (!fantome && C.eff.ancre) {
      var ax = T.tx[0], ay = T.ty[0];
      g.strokeStyle = '#fff'; g.lineWidth = 0.04; g.beginPath(); g.moveTo(ax, ay - 0.2); g.lineTo(ax, ay + 0.18); g.moveTo(ax - 0.14, ay + 0.06); g.quadraticCurveTo(ax, ay + 0.3, ax + 0.14, ay + 0.06); g.moveTo(ax - 0.08, ay - 0.12); g.lineTo(ax + 0.08, ay - 0.12); g.stroke();
    }
    if (fantome) { g.fillStyle = 'rgba(200,200,255,0.8)'; g.beginPath(); g.arc(hx, hy, 0.1, 0, TAU); g.fill(); }
  },

  dessinerJoueur: function (g, C, J, tReel) {
    var j = C.j, col = this.couleurJoueur(tReel);
    if (C.fini === 'defaite') return;
    var vis = !(j.invul > 0 && j.dashT <= 0 && !C.eff.filante && Math.sin(tReel * 40) > 0.2);
    var cd = 1 - j.dashCd / C.dashCdMax;
    g.strokeStyle = cd >= 1 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)'; g.lineWidth = 0.03;
    g.beginPath(); g.arc(j.x, j.y, 0.3, -Math.PI / 2, -Math.PI / 2 + TAU * cd); g.stroke();
    if (C.fracture) { g.strokeStyle = 'rgba(255,140,80,' + (0.5 + 0.5 * Math.sin(tReel * 14)) + ')'; g.lineWidth = 0.05; g.beginPath(); g.arc(j.x, j.y, 0.42, 0, TAU); g.stroke(); }
    if (C.eff.filante) {
      g.save(); g.globalCompositeOperation = 'lighter';
      g.strokeStyle = 'hsla(' + ((tReel * 400) % 360) + ',100%,70%,0.8)'; g.lineWidth = 0.08; g.beginPath(); g.arc(j.x, j.y, 0.5 + 0.05 * Math.sin(tReel * 20), 0, TAU); g.stroke();
      g.restore();
    }
    if (C.eff.orbitales) for (var l = 0; l < 3; l++) { var la = C.t * 5 + l * TAU / 3; g.fillStyle = '#e8f6ff'; g.beginPath(); g.arc(j.x + Math.cos(la) * 0.75, j.y + Math.sin(la) * 0.75, 0.12, 0, TAU); g.fill(); g.strokeStyle = 'rgba(120,200,255,0.6)'; g.lineWidth = 0.03; g.stroke(); }
    if (!vis) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    var gr = g.createRadialGradient(j.x, j.y, 0, j.x, j.y, 0.55);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.25, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.globalAlpha = 0.55; g.beginPath(); g.arc(j.x, j.y, 0.55, 0, TAU); g.fill();
    g.restore();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(j.x, j.y, 0.11, 0, TAU); g.fill();
    if (j.egide) { g.strokeStyle = 'rgba(140,220,255,0.7)'; g.lineWidth = 0.035; g.beginPath(); g.arc(j.x, j.y, 0.22, 0, TAU); g.stroke(); }
  },

  dessinerFx: function (g) {
    var f = this.fx, i;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (i = 0; i < f.anneaux.length; i++) { var a = f.anneaux[i]; g.strokeStyle = a.col; g.globalAlpha = a.vie / a.max; g.lineWidth = a.ep; g.beginPath(); g.arc(a.x, a.y, Math.max(0.01, a.r), 0, TAU); g.stroke(); }
    for (i = 0; i < f.eclairs.length; i++) {
      var e = f.eclairs[i]; g.globalAlpha = clamp(e.vie / 0.4, 0, 1); g.strokeStyle = '#fff6c8'; g.lineWidth = 0.06;
      g.beginPath(); g.moveTo(e.x0, e.y0);
      for (var z = 1; z < 6; z++) { var u = z / 6; g.lineTo(lerp(e.x0, e.x1, u) + (Math.random() - 0.5) * 0.4, lerp(e.y0, e.y1, u) + (Math.random() - 0.5) * 0.4); }
      g.lineTo(e.x1, e.y1); g.stroke();
    }
    for (i = 0; i < f.part.length; i++) { var p = f.part[i]; g.globalAlpha = clamp(p.vie / p.max, 0, 1); g.fillStyle = p.col; g.fillRect(p.x - p.t / 2, p.y - p.t / 2, p.t, p.t); }
    g.restore();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (i = 0; i < f.textes.length; i++) {
      var t = f.textes[i], v = t.vie / t.max;
      g.globalAlpha = clamp(v * 2, 0, 1);
      var sc = t.t * (1 + (v > 0.85 ? (v - 0.85) * 3 : 0));
      g.font = '900 ' + sc + 'px ' + POLICE;
      g.lineWidth = sc * 0.18; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText(t.txt, t.x, t.y);
      g.fillStyle = t.col; g.fillText(t.txt, t.x, t.y);
    }
    g.globalAlpha = 1;
  },

  nuit: function (g, C) {
    var j = C.j, co = C.corps;
    g.save();
    var gr = g.createRadialGradient(j.x, j.y, 1.2, j.x, j.y, 3.2);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.93)');
    g.fillStyle = gr; g.fillRect(-1, -1, C.W + 2, C.H + 2);
    g.restore();
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25;
    g.fillStyle = 'hsl(' + C.def.teinte + ',80%,40%)'; g.beginPath(); g.arc(co.x, co.y, co.r * 1.3, 0, TAU); g.fill();
    g.restore();
  },

  /* ---------- barre du haut, énergie et compétences ---------- */
  dessinerHUD: function (g, C, J, tReel, pouls) {
    if (!J || J.demo) return;
    var w = this.w, h = this.h, def = C.def, etroit = w < 620, i;
    g.textBaseline = 'middle';
    var bw = Math.min(520, w * 0.5), bx = (w - bw) / 2, by = 30;
    g.textAlign = 'center'; g.fillStyle = '#fff';
    g.font = '700 ' + (etroit ? 12 : 14) + 'px ' + POLICE;
    g.fillText((J.cfg.etiquette ? J.cfg.etiquette + ' · ' : '') + def.nom + ', ' + def.epithete, w / 2, 13);
    g.fillStyle = 'rgba(255,255,255,0.12)'; this.rond(g, bx, by, bw, 10, 5); g.fill();
    var hpN = 0, hpNMax = 0;
    for (i = 0; i < C.noyaux.length; i++) { hpNMax += C.noyaux[i].hpMax; if (!C.noyaux[i].mort) hpN += C.noyaux[i].hp; }
    var part = hpNMax / C.hpTotal;
    var resteN = hpN / C.hpTotal, resteC = (C.coeur ? C.coeur.hp : C.hpCoeur) / C.hpTotal;
    g.fillStyle = 'hsl(' + def.teinte2 + ',90%,62%)'; if (resteN > 0) { this.rond(g, bx, by, bw * resteN, 10, 5); g.fill(); }
    g.fillStyle = 'hsl(' + def.teinte + ',90%,75%)'; this.rond(g, bx + bw * part, by, bw * resteC, 10, 5); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(bx + bw * part - 1, by - 2, 2, 14);
    if (J.record != null && J.record > 0 && J.record < 1) { var rx = bx + bw * (1 - J.record); g.fillStyle = '#ffd34d'; g.fillRect(rx - 1, by - 4, 2, 18); }
    g.font = '600 12px ' + POLICE; g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillText(Math.floor(pctCombat(C) * 100) + ' %', bx + bw + 8, by + 5);
    g.textAlign = 'left';
    var tc = C.j.coeursMax > 4 ? 20 : 26;
    for (i = 0; i < C.j.coeursMax; i++) this.coeurIco(g, 16 + i * tc, 24, tc === 20 ? 8 : 10, i < C.j.coeurs || C.invincible);
    if (C.invincible) { g.font = '600 11px ' + POLICE; g.fillStyle = '#7dffb0'; g.fillText('Entraînement', 16, 46); }
    else { g.font = '600 11px ' + POLICE; g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillText(C.diff.ico + ' ' + C.diff.nom, 8, 46); }
    g.textAlign = 'right'; g.font = '700 15px ' + POLICE; g.fillStyle = '#fff';
    if (etroit) { g.font = '700 13px ' + POLICE; g.fillText(fmtTemps(Math.max(0, (C.fini ? C.tFin : C.t) - T0)), w - 14, 64); }
    else g.fillText(fmtTemps(Math.max(0, (C.fini ? C.tFin : C.t) - T0)), w - 66, 24);

    // énergie et compétences (en bas au centre)
    var bas = h - 14, ew = Math.min(330, w * 0.62), ex = (w - ew) / 2, slotT = 40;
    var sy = bas - slotT - 12;
    g.fillStyle = 'rgba(255,255,255,0.1)'; this.rond(g, ex, bas - 7, ew, 7, 3.5); g.fill();
    var plein = C.en >= C.enMax - 0.01;
    g.fillStyle = plein ? 'hsl(' + ((tReel * 200) % 360) + ',100%,70%)' : '#ffd34d';
    this.rond(g, ex, bas - 7, ew * clamp(C.en / C.enMax, 0, 1), 7, 3.5); g.fill();
    var tactile = Jeu.tactile, manette = Jeu.entree.mode === 'manette';
    var touchesNom = manette ? ['X', 'Y', 'B'] : ['J', 'K', 'L'];
    if (!tactile) {
      var tot = 3 * slotT + 2 * 10, sx0 = (w - tot) / 2;
      for (i = 0; i < 3; i++) {
        var id = C.slots[i], x0 = sx0 + i * (slotT + 10);
        g.fillStyle = 'rgba(10,8,26,0.75)'; this.rond(g, x0, sy, slotT, slotT, 9); g.fill();
        if (!id) { g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1; g.stroke(); continue; }
        var cp = COMPETENCES[id], cout = coutComp(id, C.niv[id]) * (C.mods.economie && !cp.ultime ? 0.75 : 1);
        var pret = C.en >= cout - 0.01 && C.cd[i] <= 0, actif = C.eff[id] || (id === 'fracture' && C.fracture) || (id === 'echo' && C.fantome);
        g.strokeStyle = actif ? '#7dffb0' : pret ? (cp.ultime ? '#ffd34d' : '#5ef2ff') : 'rgba(255,255,255,0.18)'; g.lineWidth = pret || actif ? 2 : 1; g.stroke();
        g.globalAlpha = pret || actif ? 1 : 0.4;
        g.textAlign = 'center'; g.font = '20px "Segoe UI Emoji", ' + POLICE; g.fillStyle = '#fff';
        g.fillText(cp.ico, x0 + slotT / 2, sy + slotT / 2 + 1);
        g.globalAlpha = 1;
        if (C.cd[i] > 0) { g.fillStyle = 'rgba(0,0,0,0.5)'; this.rond(g, x0, sy, slotT, slotT * clamp(C.cd[i] / cp.rech, 0, 1), 9); g.fill(); }
        g.font = '700 10px ' + POLICE; g.fillStyle = 'rgba(255,255,255,0.85)'; g.textAlign = 'left'; g.fillText(touchesNom[i], x0 + 4, sy + 8);
        g.textAlign = 'right'; g.fillStyle = cp.ultime ? '#ffd34d' : '#9fe9ff'; g.fillText(Math.round(cout), x0 + slotT - 3, sy + slotT - 7);
        // seuil de coût sur la barre d'énergie
        g.fillStyle = 'rgba(255,255,255,0.5)'; if (!cp.ultime) g.fillRect(ex + ew * cout / C.enMax - 0.5, bas - 9, 1, 11);
      }
    }
    // combo (en bas à gauche)
    var bc = etroit ? sy - 40 : bas - 12;
    if (C.combo >= 1) {
      var mult = multCombo(C);
      g.textAlign = 'left'; g.font = '900 ' + (24 + Math.min(C.combo, 30) * 0.6) + 'px ' + POLICE;
      g.fillStyle = C.combo >= 30 ? '#ffd34d' : C.combo >= 15 ? '#ff7ad9' : '#5ef2ff';
      g.fillText('×' + mult.toFixed(2).replace('.', ','), 16, bc - 24);
      g.font = '600 12px ' + POLICE; g.fillStyle = 'rgba(255,255,255,0.8)';
      g.fillText(pluriel(Math.floor(C.combo), 'boucle') + ' de suite', 16, bc - 2);
      g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(16, bc + 7, 110, 4);
      g.fillStyle = '#fff'; g.fillRect(16, bc + 7, 110 * clamp(C.comboT / C.comboMax, 0, 1), 4);
    }
    if (J.cfg.mode === 'odyssee' && !etroit) {
      g.textAlign = 'right'; g.font = '16px "Segoe UI Emoji", ' + POLICE;
      var txt = ''; for (var gk in C.mods) if (C.mods[gk] && GLYPHES[gk]) txt += GLYPHES[gk].ico + (C.mods[gk] > 1 ? '×' + C.mods[gk] : '') + ' ';
      g.fillStyle = '#fff'; g.fillText(txt, w - 16, bas - 6);
    }
    // joystick tactile
    if (Jeu.joy && tactile) {
      var jy = Jeu.joy;
      g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 2; g.beginPath(); g.arc(jy.x0, jy.y0, 50, 0, TAU); g.stroke();
      var dx = clamp(jy.x - jy.x0, -50, 50), dy = clamp(jy.y - jy.y0, -50, 50);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(jy.x0 + dx, jy.y0 + dy, 20, 0, TAU); g.fill();
    }
    if (J.message && J.message.vie > 0) {
      var m = J.message, um = clamp(m.vie / 0.4, 0, 1);
      g.globalAlpha = um; g.textAlign = 'center';
      var tl = m.taille || 34;
      g.font = '900 ' + tl + 'px ' + POLICE;
      var lg = g.measureText(m.txt).width; if (lg > w * 0.92) { tl = Math.floor(tl * w * 0.92 / lg); g.font = '900 ' + tl + 'px ' + POLICE; }
      g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.strokeText(m.txt, w / 2, h * 0.3);
      g.fillStyle = m.col || '#fff'; g.fillText(m.txt, w / 2, h * 0.3);
      if (m.sous) { g.font = '600 16px ' + POLICE; g.lineWidth = 4; g.strokeText(m.sous, w / 2, h * 0.3 + 34); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillText(m.sous, w / 2, h * 0.3 + 34); }
      g.globalAlpha = 1;
    }
    if (J.astuce) {
      g.textAlign = 'center'; g.font = '600 ' + (etroit ? 13 : 15) + 'px ' + POLICE;
      var ay = sy - 26;
      var tw = Math.min(w - 16, g.measureText(J.astuce).width + 28);
      g.fillStyle = 'rgba(10,6,24,0.85)'; this.rond(g, (w - tw) / 2, ay - 16, tw, 32, 10); g.fill();
      g.strokeStyle = 'rgba(94,242,255,0.6)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#fff'; g.fillText(J.astuce, w / 2, ay, w - 30);
    }
  },
  rond: function (g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); if (w <= 0 || h <= 0) { g.beginPath(); return; }
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  },
  coeurIco: function (g, x, y, s, plein) {
    g.beginPath();
    g.moveTo(x, y + s * 0.35);
    g.bezierCurveTo(x, y - s * 0.3, x - s, y - s * 0.3, x - s, y + s * 0.1);
    g.bezierCurveTo(x - s, y + s * 0.6, x, y + s, x, y + s * 1.1);
    g.bezierCurveTo(x, y + s, x + s, y + s * 0.6, x + s, y + s * 0.1);
    g.bezierCurveTo(x + s, y - s * 0.3, x, y - s * 0.3, x, y + s * 0.35);
    g.fillStyle = plein ? '#ff4d7a' : 'rgba(255,255,255,0.12)'; g.fill();
    g.strokeStyle = plein ? '#ffc0d0' : 'rgba(255,255,255,0.3)'; g.lineWidth = 1.5; g.stroke();
  }
};
