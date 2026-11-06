'use strict';
/* Colosses — écran des Affinités : une toile d'araignée de probabilités par catégorie d'armes.
   On tire sur une pointe de la toile (ou sur le curseur de sa ligne) : la chance change et les autres s'adaptent pour que
   le total reste à 100 %. Les limites de chaque pointe s'achètent (voir affBornes dans progression.js). */

const Affinites = {
  cat: 'p', survol: null, prise: null, cv: null, geo: null,

  // pointes de la toile : les types déjà croisés, plus une pointe « ??? » pour tout le reste
  axes(cat) {
    const P = affProbas(cat), vu = id => Save.d.codex.arm[cat + ':' + id], l = [];
    let cachees = 0;
    for (const k of affCibles(cat)) {
      const armes = ARS[cat].filter(a => affCle(cat, a) === k), vues = armes.filter(a => vu(a.id));
      if (!vues.length) { cachees += P[k]; continue; }
      const f = cat === 'p' ? FAMILLES[k] : armes[0];
      l.push({ k, nom: f.nom, ico: f.ico, vues: cat === 'p' ? vues.map(a => a.nom).join(' · ') : '' });
    }
    return { l, cachees };
  },
  pct(x) {
    const v = x * 100, t = v > 0 && v < 10 ? v.toFixed(1) : String(Math.round(v));
    return (typeof Langue !== 'undefined' && Langue.en ? t : t.replace('.', ',')) + ' %';
  },
  ligne(cat, a) {
    const A = affSave()[cat], n = A[a.k] || 0, [lo, hi] = affBornes(cat, a.k), F = forgeSave(), P = affProbas(cat), o = n ? '' : 'disabled';
    const achat = n >= AFF_MAX ? '<button disabled>Max</button>' : `<button data-a="affNiv" data-k="${a.k}" ${F.eclats < AFF_PRIX[n] ? 'disabled' : ''}>${n ? '+' : 'Acheter'} · ${AFF_PRIX[n]} 💎</button>`;
    return `<div class="aff-l2 ${n ? 'actif' : ''}" data-k="${a.k}">
      <div class="aff-tete"><b>${a.ico} ${a.nom}</b><em class="aff-v">${this.pct(P[a.k])}</em></div>
      ${a.vues ? `<small class="vues">${a.vues}</small>` : ''}
      <div class="aff-ctl">
        <button class="petit" data-a="affPas" data-k="${a.k}" data-d="-1" ${o}>−</button>
        <input type="range" min="${Math.round(lo * 1000)}" max="${Math.round(hi * 1000)}" step="1" value="${Math.round(P[a.k] * 1000)}" data-k="${a.k}" ${o}>
        <button class="petit" data-a="affPas" data-k="${a.k}" data-d="1" ${o}>+</button>
      </div>
      <div class="aff-pied"><small>${n ? this.pct(lo) + ' – ' + this.pct(hi) : ''}</small><span class="niv">${'◆'.repeat(n)}${'◇'.repeat(AFF_MAX - n)}</span>${achat}</div>
    </div>`;
  },
  ecran() {
    const cat = this.cat, F = forgeSave(), { l, cachees } = this.axes(cat);
    const onglet = (c, t) => `<button data-a="affCat" data-c="${c}" class="${c === cat ? 'actif' : ''}">${t}</button>`;
    const vide = { p: 'Découvre des armes en jouant : une famille apparaît ici dès que tu as croisé une de ses armes.', s: 'Découvre des attaques spéciales en jouant.', t: 'Découvre des talents en jouant.' }[cat];
    const toile = l.length + (cachees > 0 ? 1 : 0) >= 3;
    const corps = `<p class="mini">Déplace les pointes de la toile. Monter une chance fait baisser les autres, baisser une chance fait monter les autres : le total reste à 100 %. Tu bouges librement chaque chance entre le minimum et le maximum achetés, et chaque niveau élargit ces deux limites. Une arme n'a jamais plus de 2 fois plus de chance que la moins probable. La puissance des armes ne change jamais.</p>
      <div class="aff-haut"><div class="eclats">💎 ${F.eclats} cristaux</div><button class="petit" data-a="affRaz">Tout remettre à égalité</button></div>
      <div class="onglets">${onglet('p', '🔫 Armes principales')}${onglet('s', '💥 Attaques spéciales')}${onglet('t', '💨 Talents')}</div>
      ${l.length ? `<div class="aff-grille ${toile ? '' : 'sans-toile'}">
        ${toile ? `<div class="aff-toile"><canvas id="aff-cv"></canvas><div class="aff-info" id="aff-info"></div></div>` : ''}
        <div class="aff-liste">${l.map(a => this.ligne(cat, a)).join('')}${cachees > 0 ? `<div class="aff-l2 aff-cachee"><div class="aff-tete"><b>??? Pas encore croisées</b><em class="aff-v" id="aff-cachees">${this.pct(cachees)}</em></div></div>` : ''}</div>
      </div>` : `<p class="mini">${vide}</p>`}`;
    UI.ecran('🎲 Affinités', corps, 'aff-panneau');
    this.brancher();
  },
  brancher() {
    const el = UI.el, cat = this.cat;
    this.survol = null; this.prise = null;
    for (const inp of el.querySelectorAll('.aff-l2 input')) {
      inp.addEventListener('input', () => { affFixer(cat, inp.dataset.k, +inp.value / 1000); this.maj(); });
      inp.addEventListener('change', () => Save.write());
    }
    for (const row of el.querySelectorAll('.aff-l2[data-k]')) {
      row.addEventListener('pointerenter', () => { this.survol = row.dataset.k; this.dessiner(); });
      row.addEventListener('pointerleave', () => { this.survol = null; this.dessiner(); });
    }
    const cv = this.cv = el.querySelector('#aff-cv');
    if (!cv) return;
    const pos = e => { const r = cv.getBoundingClientRect(), g = this.geo; return { x: (e.clientX - r.left) * g.W / r.width, y: (e.clientY - r.top) * g.W / r.height }; };
    cv.addEventListener('pointerdown', e => {
      const q = pos(e), a = this.proche(q, true);
      if (!a) return;
      e.preventDefault(); this.prise = a.k; this.survol = a.k; try { cv.setPointerCapture(e.pointerId); } catch (x) { }
      this.tirer(q);
    });
    cv.addEventListener('pointermove', e => {
      const q = pos(e);
      if (this.prise) { this.tirer(q); return; }
      const a = this.proche(q, false), k = a ? a.k : null;
      if (k !== this.survol) { this.survol = k; this.dessiner(); this.marquer(); }
    });
    const lacher = () => { if (this.prise) { this.prise = null; Save.write(); this.dessiner(); } };
    cv.addEventListener('pointerup', lacher); cv.addEventListener('pointercancel', lacher);
    cv.addEventListener('pointerleave', () => { if (!this.prise && this.survol) { this.survol = null; this.dessiner(); this.marquer(); } });
    this.dessiner();
  },
  // pointe la plus proche du pointeur (seulement celles qu'on peut bouger si « reglable »)
  proche(q, reglable) {
    const g = this.geo; if (!g) return null;
    let best = null, bd = 26;
    for (const a of g.axes) {
      if (a.k === null || (reglable && !(affSave()[this.cat][a.k] > 0))) continue;
      const dx = q.x - g.c, dy = q.y - g.c, t = dx * a.ux + dy * a.uy, d = Math.abs(dx * a.uy - dy * a.ux);
      if (t < -8 || t > g.R + 34) continue;
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  },
  tirer(q) {
    const g = this.geo, a = g.axes.find(x => x.k === this.prise); if (!a) return;
    const t = clamp((q.x - g.c) * a.ux + (q.y - g.c) * a.uy, 0, g.R);
    affFixer(this.cat, a.k, this.deR(t / g.R));
    this.maj();
  },
  // les petites chances restent lisibles : l'échelle de la toile n'est pas linéaire
  versR(p) { return Math.pow(p, .4); },
  deR(r) { return Math.pow(r, 2.5); },
  marquer() {
    for (const row of UI.el.querySelectorAll('.aff-l2[data-k]')) row.classList.toggle('vise', row.dataset.k === this.survol);
  },
  maj() {
    const cat = this.cat, P = affProbas(cat), el = UI.el;
    for (const row of el.querySelectorAll('.aff-l2[data-k]')) {
      const k = row.dataset.k; row.querySelector('.aff-v').textContent = this.pct(P[k]);
      row.querySelector('input').value = Math.round(P[k] * 1000);
    }
    const c = el.querySelector('#aff-cachees'); if (c) c.textContent = this.pct(this.axes(cat).cachees);
    this.marquer(); this.dessiner();
  },
  dessiner() {
    const cv = this.cv; if (!cv || !cv.isConnected) return;
    const cat = this.cat, { l, cachees } = this.axes(cat), P = affProbas(cat), A = affSave()[cat];
    const W = cv.clientWidth || 440, dpr = Math.min(2, window.devicePixelRatio || 1), c = cv.getContext('2d');
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, W);
    const pointes = l.map(a => Object.assign({ p: P[a.k], b: affBase(cat, a.k), n: A[a.k] || 0 }, a));
    if (cachees > 0) pointes.push({ k: null, nom: '???', ico: '', p: cachees, b: cachees, n: 0 });
    const n = pointes.length, ctr = W / 2, R = W / 2 - 36;
    pointes.forEach((a, i) => { const t = -Math.PI / 2 + i * TAU / n; a.ux = Math.cos(t); a.uy = Math.sin(t); });
    this.geo = { W, c: ctr, R, axes: pointes };
    const pt = (a, p, k) => { const r = R * (k === undefined ? this.versR(p) : k); return [ctr + a.ux * r, ctr + a.uy * r]; };
    const poly = f => { c.beginPath(); pointes.forEach((a, i) => { const [x, y] = f(a); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.closePath(); };
    // fils de la toile
    c.lineWidth = 1; c.strokeStyle = 'rgba(201,168,101,.2)';
    for (const p of [.01, .05, .15, .4, 1]) { poly(a => pt(a, p)); c.stroke(); }
    c.fillStyle = 'rgba(236,217,164,.55)'; c.font = '11px system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
    for (const p of [.05, .15, .4]) c.fillText(Math.round(p * 100) + ' %', ctr + 4, ctr - R * this.versR(p) + 7);
    for (const a of pointes) { c.beginPath(); c.moveTo(ctr, ctr); c.lineTo(...pt(a, 1)); c.stroke(); }
    // chance de départ (pointillés)
    c.setLineDash([4, 4]); c.strokeStyle = 'rgba(255,255,255,.3)'; poly(a => pt(a, a.b)); c.stroke(); c.setLineDash([]);
    // ce qui est acheté : de la limite basse à la limite haute
    c.lineCap = 'round'; c.lineWidth = 5;
    for (const a of pointes) {
      if (!a.n) continue;
      const [lo, hi] = affBornes(cat, a.k);
      c.strokeStyle = a.k === this.survol ? 'rgba(236,217,164,.75)' : 'rgba(201,168,101,.4)';
      c.beginPath(); c.moveTo(...pt(a, lo)); c.lineTo(...pt(a, hi)); c.stroke();
    }
    c.lineCap = 'butt';
    // la toile du joueur
    poly(a => pt(a, a.p));
    const gr = c.createRadialGradient(ctr, ctr, 0, ctr, ctr, R);
    gr.addColorStop(0, 'rgba(236,200,120,.5)'); gr.addColorStop(1, 'rgba(192,55,154,.32)');
    c.fillStyle = gr; c.fill(); c.lineWidth = 2; c.strokeStyle = '#ecd9a4'; c.lineJoin = 'round'; c.stroke();
    // pointes et icônes
    const tIco = clamp(Math.round(R * 5.2 / n), 13, 28);
    for (const a of pointes) {
      const [x, y] = pt(a, a.p), vise = a.k !== null && a.k === this.survol, prise = a.k !== null && a.k === this.prise;
      c.beginPath(); c.arc(x, y, a.n ? (prise ? 9 : vise ? 8 : 6) : 3.5, 0, TAU);
      c.fillStyle = a.n ? (vise || prise ? '#fff4d0' : '#ecd9a4') : '#8d8577'; c.fill();
      if (a.n) { c.lineWidth = 2; c.strokeStyle = '#201a10'; c.stroke(); }
      const [ix, iy] = pt(a, 1, (R + 8 + tIco / 2) / R);
      if (vise) { c.beginPath(); c.arc(ix, iy, tIco * .72, 0, TAU); c.fillStyle = 'rgba(236,217,164,.2)'; c.fill(); }
      if (!a.ico || typeof icoDessin !== 'function' || !icoDessin(c, a.ico, ix, iy, tIco)) { c.fillStyle = '#b8b0cc'; c.font = '700 13px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText(a.ico ? sansIco(a.nom).slice(0, 1) : '?', ix, iy); }
    }
    // nom et chance de la pointe visée, sous la toile
    const info = UI.el.querySelector('#aff-info');
    if (info) {
      const a = pointes.find(x => x.k !== null && x.k === this.survol);
      info.textContent = a ? sansIco(a.nom) + ' · ' + this.pct(a.p) : '';
    }
  }
};

const _actionAff = UI.action;
UI.action = function (a, btn) {
  const A = Affinites;
  switch (a) {
    case 'affCat': A.cat = btn.dataset.c; return A.ecran();
    case 'affNiv': { const c = A.cat, k = btn.dataset.k, n = affSave()[c][k] || 0, F = forgeSave(); if (n < AFF_MAX && F.eclats >= AFF_PRIX[n]) { F.eclats -= AFF_PRIX[n]; affSave()[c][k] = n + 1; affFixer(c, k, affProbas(c)[k]); Save.write(); Son.play('ramasse'); } return A.ecran(); }
    case 'affPas': { const c = A.cat, k = btn.dataset.k; affFixer(c, k, affProbas(c)[k] + +btn.dataset.d * .01); Save.write(); return A.maj(); }
    case 'affRaz': { const c = A.cat; for (const k of affCibles(c)) affProbas(c)[k] = affBase(c, k); Save.write(); return A.ecran(); }
  }
  return _actionAff.call(this, a, btn);
};
addEventListener('resize', () => { if (Affinites.cv && Affinites.cv.isConnected) Affinites.dessiner(); });
