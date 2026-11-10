'use strict';
/* Colosses — arènes vivantes : sur certains combats (environ un sur trois, toujours les mêmes pour un même boss),
   l'arène elle-même devient un danger : le sol s'effondre par endroits, la lave monte des bords, le vent pousse,
   ou la nuit tombe. Certains colosses ont leur propre arène (le Forgeron et le Phénix font monter la lave,
   le Spectre et la Nébuleuse font tomber la nuit, le Serpent et le Titan font s'effondrer le sol).
   Pas en Chasse (le temps parfait doit rester juste) ni à l'entraînement. Tout est annoncé avant de frapper. */

const AV_TYPES = {
  effondrement: { nom: 'Sol qui s\'effondre', ico: '🕳', desc: 'Des dalles se fissurent puis tombent : ne reste pas dessus.' },
  lave: { nom: 'Lave montante', ico: '🌋', desc: 'Régulièrement, la lave monte des bords de l\'arène : reste au centre.' },
  vent: { nom: 'Vent', ico: '🌬', desc: 'Un vent violent te pousse ; les flèches annoncent sa direction.' },
  nuit: { nom: 'Nuit qui tombe', ico: '🌑', desc: 'La nuit tombe par moments : on ne voit plus que près de soi et du colosse.' }
};
const AV_ESPECE = { forgeron: 'lave', phenix: 'lave', spectre: 'nuit', nebuleuse: 'nuit', serpent: 'effondrement', titan: 'effondrement' };
function areneVivanteDe(def, mode) {
  if (!def || mode === 'chasse' || mode === 'entrainement') return null;
  const r = RNG(hashNum((def.seed >>> 0) * 7 + 3));
  const propre = AV_ESPECE[def.esp];
  if (propre && r() < .6) return propre;
  if (r() < .3) return r.pick(Object.keys(AV_TYPES));
  return null;
}
const AV = {
  type: null, t: 0, cellules: [], vent: null, lave: 0, nuit: 0,
  raz(type) { this.type = type; this.t = 0; this.cellules = []; this.vent = { a: R() * TAU, f: 0, cible: 0, prochain: 6, alerte: 0 }; this.lave = 0; this.nuit = 0; this.cycleT = 0; this.trouT = 5; },
  joueurs() { return typeof Coop !== 'undefined' && Coop.actif() ? Coop.tous() : (G.p ? [G.p] : []); },
  blesser(p, dmg, src) {
    const avant = G.atkCourante; G.atkCourante = src;
    try {
      if (p === G.p || typeof Coop === 'undefined') G.blesser(dmg, src);
      else { const j = Coop.equipiers().find(x => x.p === p); if (j) Coop.enJoueur(j, () => G.blesser(dmg, src)); }
    } finally { G.atkCourante = avant; }
  },
  bord(p) { // distance au bord de l'arène
    if (Arene.kind === 'cercle') return Arene.rad() - Math.sqrt(d2(p.x, p.y, CX, CY));
    const b = Arene.bb(); return Math.min(p.x - b.x, b.x + b.w - p.x, p.y - b.y, b.y + b.h - p.y);
  },
  maj(dt) {
    const b = G.boss; if (!this.type || G.etat !== 'combat' || !b || b.mort || b.intro > 0 || b.finale) return;
    this.t += dt;
    if (this.type === 'effondrement') {
      this.trouT -= dt;
      if (this.trouT <= 0) {
        this.trouT = 6.5; const bb = Arene.bb(), T = 110;
        for (let k = 0, n = 3 + Math.floor(R() * 3); k < n * 4 && this.cellules.length < 12; k++) {
          const x = bb.x + Math.floor(R() * (bb.w / T)) * T, y = bb.y + Math.floor(R() * (bb.h / T)) * T;
          if (this.cellules.some(c => c.x === x && c.y === y) || d2(x + T / 2, y + T / 2, b.x, b.y) < (b.r + T) ** 2 || !Arene.dedans(x + T / 2, y + T / 2, 10)) continue;
          this.cellules.push({ x, y, T, t: 0, alerte: 1.6, vie: 7 }); if (--n <= 0) break;
        }
      }
      for (const c of this.cellules) {
        c.t += dt; if (c.t < c.alerte) continue;
        for (const p of this.joueurs()) if (p.hp > 0 && !p.ko && !(p.saut > 0) && p.x > c.x && p.x < c.x + c.T && p.y > c.y && p.y < c.y + c.T) {
          if (p.iframe <= 0) this.blesser(p, DMG(1), 'Effondrement');
          // on est repoussé hors du trou, vers le bord le plus proche
          const dl = [p.x - c.x, c.x + c.T - p.x, p.y - c.y, c.y + c.T - p.y], m = Math.min(...dl), i = dl.indexOf(m);
          if (i === 0) p.x = c.x - 2; else if (i === 1) p.x = c.x + c.T + 2; else if (i === 2) p.y = c.y - 2; else p.y = c.y + c.T + 2;
        }
      }
      this.cellules = this.cellules.filter(c => c.t < c.alerte + c.vie);
    } else if (this.type === 'lave') {
      // cycle de 15 s : 1,5 s d'alerte, 2,5 s de montée, 5 s haute, 2 s de descente, puis calme
      this.cycleT = (this.cycleT + dt) % 15; const t = this.cycleT, Lm = Arene.kind === 'cercle' ? 80 : 110;
      this.alerteLave = t >= 4 && t < 5.5;
      this.lave = t < 5.5 ? 0 : t < 8 ? Lm * (t - 5.5) / 2.5 : t < 13 ? Lm : t < 15 ? Lm * (15 - t) / 2 : 0;
      if (this.lave > 8) for (const p of this.joueurs()) if (p.hp > 0 && !p.ko && !(p.saut > 0) && this.bord(p) < this.lave && p.iframe <= 0) this.blesser(p, DMG(.75), 'Lave montante');
    } else if (this.type === 'vent') {
      const V = this.vent; V.prochain -= dt;
      if (V.prochain <= 0) { V.a = R() * TAU; V.cible = 85; V.prochain = 9; V.alerte = 1.5; V.f = 0; }
      if (V.alerte > 0) V.alerte -= dt; else V.f += (V.cible - V.f) * Math.min(1, dt * 2);
      if (V.prochain < 2.5) V.f *= Math.max(0, 1 - dt * 1.5); // il retombe avant de tourner
      for (const p of this.joueurs()) if (p.hp > 0 && !p.ko && !p.dash) { p.x += Math.cos(V.a) * V.f * dt; p.y += Math.sin(V.a) * V.f * dt; Arene.contenir(p, p.r); }
    } else if (this.type === 'nuit') {
      // la nuit tombe en 10 s, dure 14 s, l'aube revient en 8 s, puis 12 s de jour
      this.cycleT = (this.cycleT + dt) % 44; const t = this.cycleT;
      this.nuit = t < 12 ? 0 : t < 22 ? (t - 12) / 10 : t < 36 ? 1 : (44 - t) / 8;
    }
  }
};
const _entrerAV = G.entrerSalle;
G.entrerSalle = function () {
  const r = _entrerAV.apply(this, arguments);
  try { AV.raz(areneVivanteDe(this.def, this.mode)); if (AV.type) { const T = AV_TYPES[AV.type]; this.annonce(T.ico + ' ' + T.nom, '#ffb36b', 2.2); } } catch (e) { AV.type = null; }
  return r;
};
const _majAV = majCombat;
majCombat = function (dt) { const t0 = G.t; _majAV.apply(this, arguments); try { AV.maj(Math.max(0, Math.min(.1, G.t - t0))); } catch (e) { } };
// au sol : fissures, trous et lave (sous les héros et le colosse)
const _areneAV = dessinerArene;
dessinerArene = function (c) {
  _areneAV.apply(this, arguments);
  if (!AV.type || !G.boss) return;
  try {
    c.save();
    if (AV.type === 'effondrement') for (const k of AV.cellules) {
      if (k.t < k.alerte) {
        const a = k.t / k.alerte; c.strokeStyle = `rgba(255,190,120,${.35 + .5 * a})`; c.lineWidth = 2 + 2 * a;
        c.strokeRect(k.x + 4, k.y + 4, k.T - 8, k.T - 8);
        const r = RNG(k.x * 13 + k.y); c.beginPath(); for (let i = 0; i < 6; i++) { const x = k.x + k.T / 2, y = k.y + k.T / 2, an = r() * TAU, L = k.T * .5 * a; c.moveTo(x, y); c.lineTo(x + Math.cos(an) * L, y + Math.sin(an) * L); } c.stroke();
      } else {
        const g = c.createRadialGradient(k.x + k.T / 2, k.y + k.T / 2, 4, k.x + k.T / 2, k.y + k.T / 2, k.T * .75);
        g.addColorStop(0, '#000'); g.addColorStop(.7, '#07040a'); g.addColorStop(1, 'rgba(20,10,8,.9)');
        c.fillStyle = g; c.fillRect(k.x, k.y, k.T, k.T);
        c.strokeStyle = 'rgba(120,90,70,.9)'; c.lineWidth = 3; c.strokeRect(k.x + 1.5, k.y + 1.5, k.T - 3, k.T - 3);
        const fin = k.alerte + k.vie - k.t; if (fin < 1) { c.fillStyle = `rgba(150,130,110,${1 - fin})`; c.fillRect(k.x, k.y, k.T, k.T); }
      }
    } else if (AV.type === 'lave' && (AV.lave > 0 || AV.alerteLave)) {
      const L = Math.max(AV.lave, AV.alerteLave ? 6 + 4 * Math.sin(G.t * 12) : 0), fl = .85 + .15 * Math.sin(G.t * 7);
      c.globalCompositeOperation = 'lighter';
      if (Arene.kind === 'cercle') {
        const R2 = Arene.rad(), g = c.createRadialGradient(CX, CY, R2 - L, CX, CY, R2);
        g.addColorStop(0, 'rgba(255,90,20,0)'); g.addColorStop(.15, `rgba(255,120,30,${.75 * fl})`); g.addColorStop(1, `rgba(255,200,80,${.95 * fl})`);
        c.fillStyle = g; c.beginPath(); c.arc(CX, CY, R2, 0, TAU); c.arc(CX, CY, Math.max(0, R2 - L), 0, TAU, true); c.fill();
      } else {
        const b = Arene.bb(), bande = (x, y, w, h, x0, y0, x1, y1) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, `rgba(255,200,80,${.95 * fl})`); g.addColorStop(.85, `rgba(255,110,30,${.75 * fl})`); g.addColorStop(1, 'rgba(255,90,20,0)'); c.fillStyle = g; c.fillRect(x, y, w, h); };
        bande(b.x, b.y, b.w, L, 0, b.y, 0, b.y + L); bande(b.x, b.y + b.h - L, b.w, L, 0, b.y + b.h, 0, b.y + b.h - L);
        bande(b.x, b.y, L, b.h, b.x, 0, b.x + L, 0); bande(b.x + b.w - L, b.y, L, b.h, b.x + b.w, 0, b.x + b.w - L, 0);
      }
    }
    c.restore();
  } catch (e) { }
};
// par-dessus : le vent (traînées et flèches) et la nuit
let _nuitCv = null;
const _hudAV = dessinerHUD;
dessinerHUD = function (c) {
  try {
    if (AV.type === 'vent' && G.boss && G.etat === 'combat') {
      const V = AV.vent; c.save();
      if (V.alerte > 0) { c.globalAlpha = .55 + .3 * Math.sin(G.t * 14); c.fillStyle = '#e8f6ff'; c.font = `900 46px ${POLICE}`; c.textAlign = 'center'; c.textBaseline = 'middle'; for (const [x, y] of [[W * .3, H * .3], [W * .7, H * .3], [W * .5, H * .7]]) { c.save(); c.translate(x, y); c.rotate(V.a); c.fillText('➜', 0, 0); c.restore(); } }
      if (V.f > 5) { c.globalAlpha = Math.min(.5, V.f / 170); c.strokeStyle = '#e8f6ff'; c.lineWidth = 1.5; const r = RNG(Math.floor(G.t * 3)); c.beginPath(); for (let i = 0; i < 40; i++) { const x = ((r() * W + G.t * V.f * 6 * Math.cos(V.a)) % W + W) % W, y = ((r() * H + G.t * V.f * 6 * Math.sin(V.a)) % H + H) % H; c.moveTo(x, y); c.lineTo(x - Math.cos(V.a) * 40, y - Math.sin(V.a) * 40); } c.stroke(); }
      c.restore();
    }
    if (AV.type === 'nuit' && AV.nuit > .01 && G.boss) {
      // un calque noir percé de lumières : autour de chaque héros et du colosse (les attaques restent visibles près de soi)
      const k = cv.width / W, w = Math.ceil(W / 2), h = Math.ceil(H / 2);
      if (!_nuitCv) { _nuitCv = document.createElement('canvas'); _nuitCv.width = w; _nuitCv.height = h; }
      const n = _nuitCv.getContext('2d'); n.setTransform(1, 0, 0, 1, 0, 0); n.globalCompositeOperation = 'source-over'; n.clearRect(0, 0, w, h);
      n.fillStyle = `rgba(4,3,12,${.82 * AV.nuit})`; n.fillRect(0, 0, w, h); n.setTransform(.5, 0, 0, .5, 0, 0);
      n.globalCompositeOperation = 'destination-out';
      const trou = (x, y, r) => { const g = n.createRadialGradient(x, y, r * .35, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); n.fillStyle = g; n.fillRect(x - r, y - r, 2 * r, 2 * r); };
      for (const p of AV.joueurs()) if (p.hp > 0) trou(p.x, p.y, 210);
      const b = G.boss; trou(b.x, b.y - (b.haut || 0), b.r * 2.2);
      for (const z of G.hz) if (z.x !== undefined && z.r) trou(z.x, z.y, z.r * 1.15); // les zones annoncées restent visibles
      c.save(); c.drawImage(_nuitCv, 0, 0, W, H); c.restore();
    }
  } catch (e) { }
  return _hudAV.apply(this, arguments);
};
