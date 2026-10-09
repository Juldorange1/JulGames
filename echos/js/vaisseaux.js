'use strict';
/* 4 mini-niveaux « vaisseau » façon Geometry Dash, un par touche, à gauche du clavier de notes.
   Comme le vaisseau de Geometry Dash : touche enfoncée = il monte, touche lâchée = il redescend
   (chaque appui donne aussi un petit élan). Le niveau de chaque bande est construit à partir de la
   partition (donc de la musique, de la difficulté et de la vitesse), y compris la durée des notes longues :
   - des pics au sol partout où le vaisseau doit voler : sans appui au bon moment, ou en lâchant
     une note longue trop tôt, il s'y écrase ;
   - un plafond qui descend là où il n'y a pas de note : une fausse note (ou une touche tenue trop
     longtemps) fait toucher le plafond.
   Avec un jeu parfait, le vaisseau suit exactement la trajectoire prévue (même calcul, même pas). */

const Vaisseaux = (() => {
  const V0 = 2.6, G = 9.0;              // élan à l'appui et gravité (hauteur d'une bande = 1, temps du morceau)
  const TAP = 0.1;                      // durée d'un appui court « normal » (s)
  const PAS = 1 / 200;                  // pas de calcul (s)
  const R = 0.045;                      // rayon du vaisseau
  const HAUT_MAX = 0.93;
  const MARGE_PLAFOND = 0.12, FEN_PLAFOND = 0.03, PLAFOND_MIN = 0.4;
  const PIC_H = 0.24, PIC_L = 0.12;     // hauteur max et largeur (s) d'un groupe de pics
  // Jeu « correct » toléré par le niveau : appui jusqu'à 0,1 s trop tôt/tard, appui court de 0,03 à 0,2 s,
  // note longue lâchée jusqu'à 0,15 s avant sa fin (ou un peu après).
  const TOL_T = 0.12, TAP_MIN = 0.03, TAP_MAX = 0.2, TOL_LONG = 0.15;
  const RECALAGE = 0.15; // un appui à moins de 0,15 s d'une note recale le vaisseau sur la trajectoire prévue
  // toutes les combinaisons (décalage, durée d'appui court, écart sur les notes longues) d'un jeu correct
  const VARIANTES = [];
  for (const d of [-TOL_T, 0, TOL_T]) for (const tap of [TAP_MIN, TAP, TAP_MAX]) for (const dl of [-TOL_LONG, 0, TOL_LONG]) VARIANTES.push([d, tap, dl]);
  let debut = 0, pistes = [];
  let relachement = true; // false : chaque appui = un saut fixe (appui court), le relâchement est ignoré

  // tenu : la touche est enfoncée (pas de gravité : le vaisseau garde son élan vers le haut)
  function voler(e) {
    if (!e.tenu) e.v -= G * PAS;
    e.y += e.v * PAS;
    if (e.y < 0) { e.y = 0; e.v = 0; }
    if (e.y > HAUT_MAX) { e.y = HAUT_MAX; if (e.v > 0) e.v = 0; }
  }
  function evenement(e, bas) { e.tenu = bas; if (bas) e.v = V0; }

  // Appuis/relâchements d'une touche : décalés de « dec », appuis courts de « tap » s, notes longues ± « dl »
  function evenements(notes, indices, dec, tap, dl) {
    const ev = [];
    indices.forEach((i, k) => {
      const n = notes[i], suiv = k + 1 < indices.length ? notes[indices[k + 1]].t : Infinity;
      ev.push({ t: n.t + dec, bas: true });
      ev.push({ t: Math.min(n.t + dec + (n.duree > 0 ? Math.max(TAP_MIN, n.duree + dl) : tap), suiv + dec - 0.01), bas: false });
    });
    return ev;
  }
  // Instant de note le plus proche de t (liste triée)
  function noteProche(liste, t) {
    let lo = 0, hi = liste.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (liste[m] < t) lo = m + 1; else hi = m; }
    let d = Infinity;
    if (lo < liste.length) d = liste[lo] - t;
    if (lo > 0 && t - liste[lo - 1] < Math.abs(d)) d = liste[lo - 1] - t;
    return d;
  }
  // ideal (facultatif) : trajectoire prévue sur laquelle on se recale à chaque bon appui
  function trajectoire(ev, t0, n, vitesses, ideal, instants) {
    const y = new Float32Array(n), e = { y: 0, v: 0, tenu: false };
    for (let i = 0, k = 0; i < n; i++) {
      const tg = t0 + i * PAS;
      while (k < ev.length && ev[k].t <= tg) {
        const x = ev[k++];
        if (x.bas && ideal && Math.abs(noteProche(instants, tg)) <= RECALAGE) e.y = ideal[i];
        evenement(e, x.bas);
      }
      y[i] = e.y;
      if (vitesses) vitesses[i] = e.v;
      voler(e);
    }
    return y;
  }

  // notes : notes de la partie ; parVoie : indices des notes de chaque touche ; [t0, t1] : temps du morceau couvert
  function preparer(notes, parVoie, t0, t1, avecRelachement) {
    debut = t0;
    relachement = avecRelachement !== false;
    const n = Math.ceil((t1 - t0) / PAS) + 2;
    pistes = parVoie.map((_, v) => {
      // trajectoire du jeu parfait (point de reprise après un crash) puis jeu correct le plus bas et le plus haut
      const idealV = new Float32Array(n);
      const ideal = trajectoire(evenements(notes, parVoie[v], 0, TAP, 0), t0, n, idealV);
      const instants = parVoie[v].map(i => notes[i].t);
      const bas = new Float32Array(n).fill(9), haut = new Float32Array(n);
      for (const [d, tap, dl] of VARIANTES) {
        const y = trajectoire(evenements(notes, parVoie[v], d, tap, dl), t0, n, null, ideal, instants);
        for (let i = 0; i < n; i++) { if (y[i] < bas[i]) bas[i] = y[i]; if (y[i] > haut[i]) haut[i] = y[i]; }
      }
      // plafond : juste au-dessus du jeu correct le plus haut (descend à PLAFOND_MIN là où il n'y a pas de note)
      const w = Math.round(FEN_PLAFOND / PAS), plafond = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        let m = 0;
        for (let j = Math.max(0, i - w); j <= Math.min(n - 1, i + w); j++) if (haut[j] > m) m = haut[j];
        plafond[i] = Math.max(PLAFOND_MIN, m + MARGE_PLAFOND);
      }
      // pics au sol sous le jeu correct le plus bas : on ne s'y écrase qu'en ratant / lâchant trop tôt
      const pics = [];
      const pasPic = Math.round(0.04 / PAS), lp = Math.round(PIC_L / PAS), mt = Math.round(0.02 / PAS);
      for (let i = mt; i + lp + mt < n; i += pasPic) {
        let m = 9;
        for (let j = i - mt; j <= i + lp + mt; j++) if (bas[j] < m) m = bas[j];
        const h = Math.min(PIC_H, m - R - 0.08);
        if (h < 0.1) continue;
        const a = t0 + i * PAS, z = a + PIC_L;
        if (pics.length && a < pics[pics.length - 1].z + 0.16) continue;
        pics.push({ a, z, h });
      }
      return { ideal, idealV, instants, plafond, pics, e: { y: 0, v: 0, tenu: false }, i: 0, file: [], invul: -1, crashs: 0, journal: [], traine: [], parts: [], pousse: -1 };
    });
  }

  // La touche v est enfoncée (bas = true) ou relâchée (bas = false) à l'instant t (temps du morceau)
  function appui(v, t, bas) {
    if (!pistes[v]) return;
    if (relachement) { pistes[v].file.push({ t, bas: bas !== false }); return; }
    if (bas === false) return; // relâchement ignoré : l'appui dure toujours TAP
    pistes[v].file.push({ t, bas: true }, { t: t + TAP, bas: false });
  }

  function crash(p, tg, cause) {
    p.crashs++;
    p.journal.push({ t: tg, cause, y: p.e.y, v: p.e.v }); // pour les tests
    if (p.journal.length > 50) p.journal.shift();
    p.invul = tg + 0.7;
    for (let k = 0; k < 18; k++) {
      const a = Math.random() * Math.PI * 2, s = 0.4 + Math.random() * 1.2;
      p.parts.push({ t: tg, y: p.e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vie: 0.6 + Math.random() * 0.4 });
    }
    // réapparition sur la trajectoire prévue (comme un point de reprise) : un crash n'en entraîne pas d'autres
    const i = Math.min(p.ideal.length - 1, p.i);
    p.e.y = p.ideal[i]; p.e.v = p.idealV[i];
  }

  // Fait avancer les 4 vaisseaux jusqu'à l'instant t (temps du morceau)
  function maj(t) {
    for (const p of pistes) {
      const n = p.plafond.length;
      let garde = 0;
      while (p.i < n - 1 && debut + p.i * PAS <= t && garde++ < 2000) {
        const tg = debut + p.i * PAS;
        p.file.sort((a, b) => a.t - b.t);
        while (p.file.length && p.file[0].t <= tg) {
          const ev = p.file.shift();
          // bon appui (près d'une note) : recalage sur la trajectoire prévue, pour que les petits écarts ne s'accumulent pas
          if (ev.bas && Math.abs(noteProche(p.instants, tg)) <= RECALAGE) p.e.y = p.ideal[p.i];
          evenement(p.e, ev.bas);
          if (ev.bas) p.pousse = tg;
        }
        if (tg > p.invul) {
          if (p.e.y + R > p.plafond[p.i]) crash(p, tg, 'plafond');
          else if (p.e.y - R < PIC_H) {
            for (const s of p.pics) {
              if (s.a > tg) break;
              if (tg <= s.z && p.e.y - R < s.h) { crash(p, tg, 'pics'); break; }
            }
          }
        }
        voler(p.e);
        if ((p.i & 3) === 0) { p.traine.push({ t: tg, y: p.e.y }); if (p.traine.length > 40) p.traine.shift(); }
        p.i++;
      }
      if (garde >= 2000) p.i = Math.min(n - 1, Math.max(p.i, Math.floor((t - debut) / PAS))); // gros saut (onglet en veille)
    }
  }

  const crashs = () => pistes.reduce((s, p) => s + p.crashs, 0);

  /* ---------- dessin ---------- */
  // zone : {x, y, w, h} ; t : temps du morceau ; rate : vitesse de lecture ; bandeDeVoie, nomsTouches : libellés ;
  // couleur(b) : couleur d'une bande
  function dessiner(g, zone, t, rate, bandeDeVoie, nomsTouches, couleur) {
    if (!pistes.length) return;
    const nb = pistes.length, ecart = nb > 12 ? 3 : nb > 5 ? 6 : 10, sh = (zone.h - ecart * (nb - 1)) / nb;
    const rgbs = {};
    const rgba = (b, a) => {
      const h = couleur(b), c = rgbs[h] || (rgbs[h] = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
      return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
    };
    const pps = zone.w / (2.4 * rate);         // pixels par seconde de morceau (vitesse réelle constante)
    for (let v = 0; v < nb; v++) {
      const p = pistes[v], b = bandeDeVoie(v);
      const x0 = zone.x, y0 = zone.y + v * (sh + ecart), w = zone.w;
      const haut = sh - 8, bas = y0 + sh - 4;  // hauteur utile, sol
      const xs = x0 + w * 0.26;                // position du vaisseau
      const X = tt => xs + (tt - t) * pps;
      const Y = yy => bas - yy * haut;
      const tG = t - (xs - x0) / pps, tD = t + (x0 + w - xs) / pps;

      g.save();
      g.beginPath(); g.rect(x0, y0, w, sh); g.clip();
      // fond + quadrillage qui défile
      const fond = g.createLinearGradient(0, y0, 0, y0 + sh);
      fond.addColorStop(0, '#0d0b1d'); fond.addColorStop(1, rgba(b, 0.16));
      g.fillStyle = fond; g.fillRect(x0, y0, w, sh);
      g.strokeStyle = rgba(b, 0.07); g.lineWidth = 1;
      const pasG = 34, dec = ((t * pps * 0.5) % pasG + pasG) % pasG;
      for (let gx = x0 - dec; gx < x0 + w; gx += pasG) { g.beginPath(); g.moveTo(gx, y0); g.lineTo(gx, y0 + sh); g.stroke(); }

      // plafond
      g.beginPath(); g.moveTo(x0, y0);
      for (let px = x0; px <= x0 + w + 4; px += 4) {
        const i = Math.round((t + (px - xs) / pps - debut) / PAS);
        const pl = i >= 0 && i < p.plafond.length ? p.plafond[i] : 1.2;
        g.lineTo(px, Math.max(y0 - 2, Y(Math.min(1.2, pl))));
      }
      g.lineTo(x0 + w + 4, y0); g.closePath();
      g.fillStyle = '#07060f'; g.fill();
      g.strokeStyle = rgba(b, 0.85); g.lineWidth = 2; g.stroke();

      // sol (blocs)
      g.fillStyle = '#07060f'; g.fillRect(x0, bas, w, 4);
      g.fillStyle = rgba(b, 0.85); g.fillRect(x0, bas, w, 2);

      // pics
      for (const s of p.pics) {
        if (s.z < tG) continue;
        if (s.a > tD) break;
        const xa = X(s.a), xz = X(s.z), hp = s.h * haut;
        const nb = Math.max(1, Math.round((xz - xa) / Math.max(6, hp * 0.75)));
        const lt = (xz - xa) / nb;
        g.beginPath();
        for (let k = 0; k < nb; k++) { g.moveTo(xa + k * lt, bas); g.lineTo(xa + (k + 0.5) * lt, bas - hp); g.lineTo(xa + (k + 1) * lt, bas); }
        g.fillStyle = '#07060f'; g.fill();
        g.strokeStyle = rgba(b, 0.95); g.lineWidth = 1.5; g.stroke();
      }

      // traînée
      g.beginPath();
      p.traine.forEach((q, k) => { const px = X(q.t), py = Y(q.y); if (k) g.lineTo(px, py); else g.moveTo(px, py); });
      g.strokeStyle = rgba(b, 0.45); g.lineWidth = 3; g.stroke();

      // éclats de crash
      for (let k = p.parts.length - 1; k >= 0; k--) {
        const q = p.parts[k], age = t - q.t;
        if (age > q.vie || age < 0) { p.parts.splice(k, 1); continue; }
        g.fillStyle = rgba(b, 1 - age / q.vie);
        g.fillRect(xs + q.vx * age * pps * 0.35 - 2, Y(q.y + q.vy * age) - 2, 4, 4);
      }

      // vaisseau (dessin original : flèche avec cockpit)
      const clignote = t < p.invul && Math.floor(t * 12) % 2 === 0;
      if (!clignote) {
        const e = p.e, k = Math.max(0.6, Math.min(1.3, haut / 60));
        const ang = Math.max(-0.7, Math.min(0.7, -Math.atan2(e.v * haut, pps)));
        g.save();
        g.translate(xs, Y(e.y)); g.rotate(ang); g.scale(k, k);
        if (e.tenu || (t - p.pousse < 0.12 && t >= p.pousse)) { // flamme : touche tenue
          g.fillStyle = 'rgba(255,210,90,.9)';
          g.beginPath(); g.moveTo(-9, -3); g.lineTo(-19 - Math.random() * 5, 0); g.lineTo(-9, 3); g.fill();
        }
        g.beginPath();
        g.moveTo(14, 0); g.lineTo(-9, -8); g.lineTo(-5, 0); g.lineTo(-9, 8); g.closePath();
        g.fillStyle = couleur(b); g.shadowColor = couleur(b); g.shadowBlur = 10; g.fill();
        g.shadowBlur = 0; g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.stroke();
        g.fillStyle = '#0b0a16'; g.fillRect(-2, -3, 6, 6);
        g.restore();
      }

      // étiquettes
      g.textBaseline = 'top'; g.textAlign = 'left';
      g.font = '800 ' + (sh < 60 ? 11 : 13) + 'px Segoe UI, system-ui, sans-serif'; g.fillStyle = couleur(b);
      g.fillText(nomsTouches[v], x0 + 8, y0 + 6);
      if (p.crashs) {
        g.textAlign = 'right'; g.fillStyle = 'rgba(255,120,140,.9)';
        g.fillText('✖ ' + p.crashs, x0 + w - 8, y0 + 6);
      }
      g.restore();
      g.strokeStyle = rgba(b, 0.35); g.lineWidth = 1; g.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, sh - 1);
    }
  }

  return { preparer, appui, maj, dessiner, crashs, TAP, _pistes: () => pistes };
})();
