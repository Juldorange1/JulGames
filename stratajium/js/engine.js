/* Stratajium — moteur de règles + bot.
   Tout est dans une seule fonction pour pouvoir aussi tourner dans un Web Worker
   (créé depuis le texte de cette fonction : marche aussi hors serveur). */
function StratEngine() {
  'use strict';

  // ---------- Persos ----------
  // cat : M = mage (dieu / Primage), G = garde (guerrier / Champion), S = soldat (simple)
  // Seuls les soldats ont un sens (ils avancent vers l'adversaire) ; tous les autres vont dans tous les sens.
  const T = [
    { id: 'ma', cat: 'M', sym: 'a', name: 'Orage', cost: 40, val: 7, desc: 'Attaque toutes les cases du contour de la carte OU les cases du centre (seuls les ennemis meurent).' },
    { id: 'mb', cat: 'M', sym: 'b', name: 'Miroir', cost: 40, val: 6, desc: 'Fait échanger de place 2 persos de la carte (n’importe lesquels).' },
    { id: 'mc', cat: 'M', sym: 'c', name: 'Marionnettiste', cost: 30, val: 6, desc: 'Déplace un garde adverse n’importe où sur une case vide.' },
    { id: 'md', cat: 'M', sym: 'd', name: 'Héraut', cost: 20, val: 5.5, desc: 'Déplace 2 alliés d’une case, comme un pion (un pas droit sur une case vide, ou prend en diagonale). Les soldats avancent vers l’adversaire, les autres dans tous les sens.' },
    { id: 'me', cat: 'M', sym: 'e', name: 'Invocateur', cost: 30, val: 5.5, desc: 'Recrute 2 persos dans la réserve commune.' },
    // Primages de l'extension
    { id: 'pa', cat: 'M', sym: 'a', ext: 1, name: 'Chronos', cost: 80, val: 6, desc: 'Rejoue 2 fois (2 actions de plus ce tour-ci).' },
    { id: 'pb', cat: 'M', sym: 'b', ext: 1, name: 'Séisme', cost: 50, val: 6.5, desc: 'Attaque le contour intérieur (l’anneau juste à l’intérieur du contour). Seuls les ennemis meurent.' },
    { id: 'pc', cat: 'M', sym: 'c', ext: 1, name: 'Tambour', cost: 40, val: 5, desc: 'Déplace un de tes soldats 2 fois (comme un pion, vers l’avant).' },
    { id: 'pd', cat: 'M', sym: 'd', ext: 1, name: 'Levée', cost: 35, val: 5, desc: 'Recrute un soldat et le place directement dans ta zone de placement.' },
    { id: 'pe', cat: 'M', sym: 'e', ext: 1, name: 'Geôlier', cost: 35, val: 5.5, desc: 'L’adversaire ne peut plus placer de perso pendant ses 3 prochains tours.' },
    { id: 'pf', cat: 'M', sym: 'f', ext: 1, name: 'Silence', cost: 35, val: 6, desc: 'L’adversaire ne peut plus activer de perso pendant ses 2 prochains tours.' },
    { id: 'pg', cat: 'M', sym: 'g', ext: 1, name: 'Martyr', cost: 20, val: 5, desc: 'Au début de ton prochain tour : +40 mana pour chacun de tes persos morts.' },
    // Gardes
    { id: 'g1', cat: 'G', sym: '1', name: 'Jumeau', val: 3.2, desc: 'Échange de place avec un autre garde (allié ou adverse).' },
    { id: 'g2', cat: 'G', sym: '2', name: 'Rempart', val: 4.5, desc: 'Se déplace comme une tour aux échecs (lignes droites, prend en arrivant sur un ennemi).' },
    { id: 'g3', cat: 'G', sym: '3', name: 'Archer', val: 4.2, desc: 'Tire comme un fou à distance (tue le 1er ennemi d’une diagonale sans bouger) OU se déplace d’1 case en diagonale.' },
    { id: 'g4', cat: 'G', sym: '4', name: 'Bélier', val: 4.2, desc: 'Comme à Abalone, puissance infinie : avance d’1 case dans les 8 directions en poussant toute la file devant lui, 2 fois. Un perso poussé hors de la carte (ou dans un trou) meurt.' },
    { id: 'g5', cat: 'G', sym: '5', name: 'Éclaireur', val: 3.4, desc: 'Comme un pion mais dans tous les sens, et 2 fois : un pas droit (haut, bas, gauche, droite) sur une case vide, ou prend en diagonale.' },
    { id: 'g6', cat: 'G', sym: '6', name: 'Tourbillon', val: 3.8, desc: 'Attaque toutes les cases adjacentes (seuls les ennemis meurent).' },
    { id: 'g7', cat: 'G', sym: '7', name: 'Danseur', val: 3.6, desc: 'Se déplace 2 fois d’1 case en diagonale.' },
    // Champions de l'extension
    { id: 'c1', cat: 'G', sym: '1', ext: 1, name: 'Sauteur', val: 3.6, desc: 'Saut de 2 cases (droit ou en diagonale), par-dessus tout.' },
    { id: 'c2', cat: 'G', sym: '2', ext: 1, name: 'Évêque', val: 4, desc: 'Se déplace comme un fou aux échecs.' },
    { id: 'c3', cat: 'G', sym: '3', ext: 1, name: 'Ombre', val: 3.4, desc: 'Se téléporte sur une case adjacente à un soldat (n’importe lequel).' },
    { id: 'c4', cat: 'G', sym: '4', ext: 1, name: 'Arbalétrier', val: 4.3, desc: 'Joue comme un fou puis revient à sa place : tue le 1er ennemi d’une diagonale sans bouger.' },
    { id: 'c5', cat: 'G', sym: '5', ext: 1, name: 'Comète', val: 3.4, desc: 'Se déplace sur n’importe quelle case à plus de 5 cases (en comptant lignes + colonnes).' },
    { id: 'c6', cat: 'G', sym: '6', ext: 1, name: 'Alchimiste', val: 3, desc: 'Gagne 25 mana.' },
    { id: 'c7', cat: 'G', sym: '7', ext: 1, name: 'Baliste', val: 4.6, desc: 'Joue comme une tour puis revient à sa place : tue le 1er ennemi d’une ligne droite sans bouger.' },
    { id: 'c8', cat: 'G', sym: '8', ext: 1, name: 'Grenouille', val: 3.4, desc: 'Avance d’1 case, ou saute par-dessus toute une file de persos collés (comme au jeu de la grenouille).' },
    // Soldat
    { id: 's', cat: 'S', sym: '•', name: 'Soldat', val: 1, desc: 'Se déplace comme un pion : avance d’1 case vers l’adversaire, prend en diagonale vers l’avant. Rien d’autre.' },
  ];
  const NT = T.length;
  const TI = {}; T.forEach((t, i) => { TI[t.id] = i; t.i = i; });
  const BASE_M = ['ma', 'mb', 'mc', 'md', 'me'];
  const BASE_G = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7'];
  const EXT_M = ['pa', 'pb', 'pc', 'pd', 'pe', 'pf', 'pg'];
  const EXT_G = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
  const S_I = TI.s;

  // ---------- Événements ----------
  const EVENTS = [
    { id: 'inverse', name: 'Draft inversé', desc: 'Avant la partie, on se partage TOUTE la réserve chacun son tour… mais le perso que tu choisis va à ton adversaire. Plus de recrutement ensuite.' },
    { id: 'cache', name: 'Draft caché', desc: 'Avant la partie, on pioche chacun son tour, face cachée, toute la réserve. Tu ne vois pas les persos que l’adversaire n’a pas encore posés. Plus de recrutement ensuite.' },
    { id: 'illimite', name: 'Recrutement illimité', desc: 'La réserve commune ne se vide jamais. Pour gagner il faut tuer 2 Primages (mages) ou 6 Champions (gardes).' },
    { id: 'noir', name: 'Cases noires', desc: 'Placer un perso sur une case noire est une action gratuite (tu joues encore après).' },
    { id: 'extension', name: 'Extension', desc: 'La réserve est tirée au hasard parmi les Champions et Primages de base ET de l’extension.' },
    { id: 'pari', name: 'Le pari', desc: 'Avant la partie, pariez sur le joueur qui perdra en premier un Primage ou 2 Champions. Bon pari : +35 mana, mauvais : −35.' },
    { id: 'annonce', name: 'Annonce', desc: 'À la fin de ton tour, tu dois annoncer ta prochaine action (recruter, placer, ou quel perso activer). Tu seras obligé de la faire.' },
    { id: 'murs', name: 'Murs de morts', desc: 'Un perso mort est retourné et bloque la case pour toujours. Celui qui prend en se déplaçant reste donc devant.' },
  ];

  // ---------- Cases ----------
  // case : -2 trou (hors carte), -1 mur (perso mort retourné), 0 vide, sinon (type<<1 | joueur) + 1
  const VOID = -2;
  const own = c => c > 0 ? (c - 1) & 1 : -1;
  const tix = c => (c - 1) >> 1;
  const enc = (t, p) => (t << 1 | p) + 1;
  // directions : 0 ↖ 1 ↑ 2 ↗ 3 ← 4 → 5 ↙ 6 ↓ 7 ↘
  const D8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const DIAG = [0, 2, 5, 7], ORTH = [1, 3, 4, 6], ALL = [0, 1, 2, 3, 4, 5, 6, 7];
  const rnd = n => Math.floor(Math.random() * n);
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ---------- Cartes ----------
  // carte = { W, H, N, ex (case existe), zone [mask0, mask1], border, ring2, center, mv (voisins), name }
  // Toujours symétrique par rotation d'un demi-tour : les deux joueurs ont exactement la même situation.
  function buildGeo(W, H, ex, zone0, name) {
    const N = W * H;
    const at = (r, c) => (r >= 0 && r < H && c >= 0 && c < W && ex[r * W + c]) ? r * W + c : -1;
    const mv = new Int16Array(8 * N).fill(-1);
    for (let q = 0; q < N; q++) {
      if (!ex[q]) continue;
      const r = (q / W) | 0, c = q % W;
      for (let d = 0; d < 8; d++) mv[d * N + q] = at(r + D8[d][0], c + D8[d][1]);
    }
    const zone = [new Uint8Array(N), new Uint8Array(N)];
    for (const q of zone0) { zone[0][q] = 1; zone[1][N - 1 - q] = 1; }
    const border = [], ring2 = [];
    const isB = new Uint8Array(N);
    for (let q = 0; q < N; q++) if (ex[q] && ORTH.some(d => mv[d * N + q] < 0)) { border.push(q); isB[q] = 1; }
    for (let q = 0; q < N; q++) if (ex[q] && !isB[q] && ORTH.some(d => mv[d * N + q] >= 0 && isB[mv[d * N + q]])) ring2.push(q);
    // centre : les cases les plus proches du milieu (4, ou un peu plus en cas d'égalité)
    const cr = (H - 1) / 2, cc = (W - 1) / 2;
    const cells = []; for (let q = 0; q < N; q++) if (ex[q]) cells.push([q, Math.hypot((q / W | 0) - cr, q % W - cc)]);
    cells.sort((a, b) => a[1] - b[1]);
    const d4 = cells[Math.min(3, cells.length - 1)][1];
    const center = cells.filter(x => x[1] <= d4 + 1e-9).map(x => x[0]);
    let nCells = 0; for (let q = 0; q < N; q++) nCells += ex[q];
    return { W, H, N, ex, zone, border, ring2, center, mv, name, nCells };
  }

  function classicMap() {
    const ex = new Uint8Array(64).fill(1), z = [];
    for (let q = 48; q < 64; q++) z.push(q);
    return buildGeo(8, 8, ex, z, 'Classique 8×8');
  }

  const SHAPES = {
    plein: 'Pleine', coins: 'Coins coupés', trous: 'Trouée', losange: 'Losange', croix: 'Croix',
    anneau: 'Anneau', lacs: 'Lacs', dentele: 'Dentelée',
  };
  const ZONES = {
    rangees: 'rangées du fond', flancs: 'flancs', eparpille: 'éparpillée', pointe: 'en pointe', damier: 'en damier', centre: 'au centre',
  };
  function randomMap() {
    for (let tries = 0; tries < 200; tries++) {
      const W = 6 + rnd(5), H = 7 + rnd(4), N = W * H;
      const ex = new Uint8Array(N).fill(1);
      const off = (r, c) => { if (r >= 0 && r < H && c >= 0 && c < W) { ex[r * W + c] = 0; ex[N - 1 - (r * W + c)] = 0; } };
      const cr = (H - 1) / 2, cc = (W - 1) / 2;
      const kinds = Object.keys(SHAPES);
      const shapes = [kinds[rnd(kinds.length)]];
      if (Math.random() < .35) shapes.push(kinds[1 + rnd(kinds.length - 1)]);
      for (const k of shapes) {
        if (k === 'coins') { const n = 1 + rnd(2); for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (r + c < n || r + (W - 1 - c) < n) off(r, c); }
        if (k === 'trous') { const n = 1 + rnd(3); for (let i = 0; i < n; i++) off(2 + rnd(Math.max(1, H - 4)), rnd(W)); }
        if (k === 'losange') { const lim = 1.2 + Math.random() * .25; for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (Math.abs(r - cr) / (H / 2) + Math.abs(c - cc) / (W / 2) > lim) off(r, c); }
        if (k === 'croix') { const a = 1 + rnd(2), b = 1 + rnd(2); for (let r = 0; r < a; r++) for (let c = 0; c < b; c++) { off(r, c); off(r, W - 1 - c); } }
        if (k === 'anneau') { for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (Math.abs(r - cr) < 1 && Math.abs(c - cc) < (W > 7 ? 1.6 : 1)) off(r, c); }
        if (k === 'lacs') { const r = 2 + rnd(Math.max(1, Math.floor(cr) - 1)), c = rnd(W); off(r, c); const d = D8[rnd(8)]; off(r + d[0], c + d[1]); }
        if (k === 'dentele') { for (let c = 0; c < W; c++) if (Math.random() < .35) off(0, c); for (let r = 2; r < H - 2; r++) if (Math.random() < .25) off(r, 0); }
      }
      // garder la plus grande partie d'un seul tenant
      const comp = new Int16Array(N).fill(-1); let best = -1, bestN = 0, id = 0;
      for (let q = 0; q < N; q++) {
        if (!ex[q] || comp[q] >= 0) continue;
        const st = [q]; comp[q] = id; let n = 0;
        while (st.length) { const x = st.pop(); n++; const r = x / W | 0, c = x % W; for (const [dr, dc] of D8) { const rr = r + dr, cc2 = c + dc; if (rr < 0 || rr >= H || cc2 < 0 || cc2 >= W) continue; const y = rr * W + cc2; if (ex[y] && comp[y] < 0) { comp[y] = id; st.push(y); } } }
        if (n > bestN) { bestN = n; best = id; }
        id++;
      }
      for (let q = 0; q < N; q++) if (comp[q] !== best) ex[q] = 0;
      let sym = true; for (let q = 0; q < N; q++) if (ex[q] !== ex[N - 1 - q]) { sym = false; break; }
      if (!sym || bestN < 38) continue;
      // zone de placement du joueur du bas (celle d'en haut en est le reflet)
      const zk = Object.keys(ZONES)[rnd(6)];
      const back = []; for (let r = H - 1; r >= 0; r--) { let any = false; for (let c = 0; c < W; c++) if (ex[r * W + c]) any = true; if (any) back.push(r); }
      const rows = back.slice(0, 4); // les 4 rangées du fond qui existent
      const deep = r => rows.indexOf(r);
      let z = [];
      for (let q = 0; q < N; q++) {
        if (!ex[q]) continue;
        const r = q / W | 0, c = q % W, k = deep(r);
        if (k < 0 || r <= cr) continue;
        if (zk === 'rangees' && k <= 1) z.push(q);
        if (zk === 'flancs' && (c <= 1 || c >= W - 2) && k <= 3) z.push(q);
        if (zk === 'eparpille' && k <= 3) z.push(q);
        if (zk === 'pointe' && k <= 2 && Math.abs(c - cc) <= (2 - k) + 1.5) z.push(q);
        if (zk === 'damier' && k <= 2 && (r + c) % 2 === 0) z.push(q);
        if (zk === 'centre' && k <= 2 && Math.abs(c - cc) <= 2) z.push(q);
      }
      if (zk === 'eparpille') z = shuffle(z).slice(0, 10 + rnd(5));
      if (z.length < 8 || z.length > 18) continue;
      return buildGeo(W, H, ex, z, `${shapes.map(k => SHAPES[k]).join(' + ')} ${W}×${H}, zones ${ZONES[zk]}`);
    }
    return classicMap();
  }
  function makeMap(kind) { return kind === 'classique' ? classicMap() : randomMap(); }

  // ---------- État ----------
  function newGame(o) {
    o = o || {};
    const ev = o.event || null;
    const g = o.map || classicMap();
    const b = new Int8Array(g.N);
    for (let q = 0; q < g.N; q++) b[q] = g.ex[q] ? 0 : VOID;
    const s = {
      g, b,
      pool: new Int16Array(NT),
      res: [new Int16Array(NT), new Int16Array(NT)],
      mana: [100, 100],
      lost: [[0, 0, 0], [0, 0, 0]], // morts par joueur : mages, gardes, soldats
      turn: o.first || 0,
      acts: 1,
      noPlace: [0, 0], noAct: [0, 0], pend: [0, 0],
      decl: [null, null],
      ev: ev,
      declOn: ev === 'annonce',
      phase: (ev === 'inverse' || ev === 'cache') ? 'draft' : 'play',
      bet: null, betDone: false,
      winner: null, why: '',
      ply: 0, quiet: 0,
      last: null,
      first0: o.first || 0,
    };
    let mages = BASE_M, gards = BASE_G;
    if (ev === 'extension') {
      mages = shuffle(BASE_M.concat(EXT_M)).slice(0, 5);
      gards = shuffle(BASE_G.concat(EXT_G)).slice(0, 7);
    }
    if (ev === 'illimite') {
      for (const id of mages.concat(gards)) s.pool[TI[id]] = 99;
      s.pool[S_I] = 99;
    } else {
      for (const id of mages) s.pool[TI[id]] += 1;
      for (const id of gards) s.pool[TI[id]] += 2;
      s.pool[S_I] = 8;
    }
    return s;
  }

  function clone(s) {
    return {
      g: s.g, b: s.b.slice(), pool: s.pool.slice(), res: [s.res[0].slice(), s.res[1].slice()],
      mana: s.mana.slice(), lost: [s.lost[0].slice(), s.lost[1].slice()],
      turn: s.turn, acts: s.acts, noPlace: s.noPlace.slice(), noAct: s.noAct.slice(), pend: s.pend.slice(),
      decl: s.decl.slice(), ev: s.ev, declOn: s.declOn, phase: s.phase, bet: s.bet, betDone: s.betDone,
      winner: s.winner, why: s.why, ply: s.ply, quiet: s.quiet, last: s.last, first0: s.first0, betLoser: s.betLoser,
    };
  }
  const catIdx = c => c === 'M' ? 0 : c === 'G' ? 1 : 2;
  const isDark = (g, q) => ((((q / g.W) | 0) + (q % g.W)) & 1) === 1;
  const isHome = (g, q, p) => g.zone[p][q] === 1;

  function aliveMages(s, p) {
    let n = 0;
    const b = s.b;
    for (let q = 0; q < b.length; q++) { const c = b[q]; if (c > 0 && own(c) === p && T[tix(c)].cat === 'M') n++; }
    for (let t = 0; t < NT; t++) if (T[t].cat === 'M') n += s.res[p][t];
    return n;
  }

  function kill(s, q, wallOk) {
    const c = s.b[q];
    if (c <= 0) return;
    const p = own(c), t = T[tix(c)];
    s.lost[p][catIdx(t.cat)]++;
    s.b[q] = (s.ev === 'murs' && wallOk !== false) ? -1 : 0;
    s.quiet = -1;
    s._k = (s._k || 0) + 1;
    if (s._dead) s._dead.push(q);
  }

  // déplacement simple vers une case vide ou ennemie ; renvoie la nouvelle position
  function stepTo(s, from, to) {
    if (s.b[to] > 0) {
      kill(s, to);
      if (s.ev === 'murs') return from; // le mort bloque : l'attaquant reste devant
    }
    s.b[to] = s.b[from]; s.b[from] = 0;
    return to;
  }

  // ---------- Générateurs de mouvements ----------
  const nx = (g, q, d) => g.mv[d * g.N + q];
  const canLand = (b, q, p) => { const c = b[q]; return c === 0 || (c > 0 && own(c) !== p); };
  const mini = s => ({ g: s.g, b: s.b.slice(), ev: s.ev, lost: [[0, 0, 0], [0, 0, 0]] });

  // pion : les soldats avancent vers l'adversaire, tous les autres vont dans tous les sens
  function pawnTargets(s, q, p) {
    const g = s.g, b = s.b, out = [];
    const soldier = b[q] > 0 && tix(b[q]) === S_I;
    const steps = soldier ? [p === 0 ? 1 : 6] : ORTH;
    const caps = soldier ? (p === 0 ? [0, 2] : [5, 7]) : DIAG;
    for (const d of steps) { const t = nx(g, q, d); if (t >= 0 && b[t] === 0) out.push(t); }
    for (const d of caps) { const t = nx(g, q, d); if (t >= 0 && b[t] > 0 && own(b[t]) !== p) out.push(t); }
    return out;
  }
  function slideTargets(s, q, p, dirs) {
    const g = s.g, b = s.b, out = [];
    for (const d of dirs) {
      let t = nx(g, q, d);
      while (t >= 0) {
        const c = b[t];
        if (c === 0) out.push(t);
        else { if (c > 0 && own(c) !== p) out.push(t); break; }
        t = nx(g, t, d);
      }
    }
    return out;
  }
  // tir : 1er perso rencontré sur la ligne, s'il est ennemi (distance >= minD)
  function shotTargets(s, q, p, dirs, minD) {
    const g = s.g, b = s.b, out = [];
    for (const d of dirs) {
      let t = nx(g, q, d), k = 1;
      while (t >= 0) {
        const c = b[t];
        if (c !== 0) { if (c > 0 && own(c) !== p && k >= minD) out.push(t); break; }
        t = nx(g, t, d); k++;
      }
    }
    return out;
  }
  function stepTargets(s, q, p, dirs) {
    const out = [];
    for (const d of dirs) { const t = nx(s.g, q, d); if (t >= 0 && canLand(s.b, t, p)) out.push(t); }
    return out;
  }
  // poussée façon Abalone : renvoie la nouvelle position (ou -1 si impossible) ; ne modifie s que si doIt
  function pushLine(s, pos, d, doIt) {
    const g = s.g, b = s.b;
    const first = nx(g, pos, d);
    if (first < 0) return -1;
    const line = [];
    let t = first;
    while (t >= 0 && b[t] !== 0) {
      if (b[t] === -1) return -1; // mur : inamovible
      line.push(t); t = nx(g, t, d);
    }
    if (!doIt) return first;
    for (let i = line.length - 1; i >= 0; i--) {
      const q = line[i], to = nx(g, q, d);
      if (to < 0) { kill(s, q, false); s.b[q] = 0; } // poussé hors de la carte
      else { s.b[to] = s.b[q]; s.b[q] = 0; }
    }
    s.b[first] = s.b[pos]; s.b[pos] = 0;
    return first;
  }
  // toutes les suites de 1..max étapes
  function multiStep(s, from, p, fn, max) {
    const out = [];
    const rec = (st, pos, seq) => {
      for (const t of fn(st, pos, p)) {
        const seq2 = seq.concat([t]);
        out.push(seq2);
        if (seq2.length < max) { const st2 = mini(st); const np = stepTo(st2, pos, t); rec(st2, np, seq2); }
      }
    };
    rec(s, from, []);
    return out;
  }
  const enemiesIn = (s, sqs, p) => sqs.some(q => s.b[q] > 0 && own(s.b[q]) !== p);
  function homeEmpty(s, p) { const z = s.g.zone[p], out = []; for (let q = 0; q < s.g.N; q++) if (z[q] && s.b[q] === 0) out.push(q); return out; }
  function adjOf(s, q) { const out = []; for (const d of ALL) { const t = nx(s.g, q, d); if (t >= 0) out.push(t); } return out; }

  // séquences de clics possibles pour activer le perso en `from` (clic = case, ou chaîne pour un bouton)
  function genAct(s, from, full) {
    const g = s.g, b = s.b, c0 = b[from], p = own(c0), t = T[tix(c0)], out = [];
    const opp = 1 - p;
    if (t.cost && s.mana[p] < t.cost) return out;
    switch (t.id) {
      case 's': for (const q of pawnTargets(s, from, p)) out.push([q]); break;
      case 'g1': for (let q = 0; q < g.N; q++) if (q !== from && b[q] > 0 && T[tix(b[q])].cat === 'G') out.push([q]); break;
      case 'g2': for (const q of slideTargets(s, from, p, ORTH)) out.push([q]); break;
      case 'g3':
        for (const q of stepTargets(s, from, p, DIAG)) out.push([q]);
        for (const q of shotTargets(s, from, p, DIAG, 2)) out.push([q]);
        break;
      case 'g4':
        for (const d of ALL) {
          const q1 = pushLine(s, from, d, false);
          if (q1 < 0) continue;
          out.push([q1]);
          const s2 = mini(s); pushLine(s2, from, d, true);
          for (const e of ALL) { const q2 = pushLine(s2, q1, e, false); if (q2 >= 0) out.push([q1, q2]); }
        }
        break;
      case 'g5': out.push(...multiStep(s, from, p, pawnTargets, 2)); break;
      case 'g6': if (enemiesIn(s, adjOf(s, from), p)) out.push(['go']); break;
      case 'g7': out.push(...multiStep(s, from, p, (st, q, pp) => stepTargets(st, q, pp, DIAG), 2)); break;
      case 'c1': {
        const r = from / g.W | 0, c = from % g.W;
        for (const [dr, dc] of D8) {
          const rr = r + 2 * dr, cc = c + 2 * dc;
          if (rr < 0 || rr >= g.H || cc < 0 || cc >= g.W) continue;
          const q = rr * g.W + cc;
          if (g.ex[q] && canLand(b, q, p)) out.push([q]);
        }
        break;
      }
      case 'c2': for (const q of slideTargets(s, from, p, DIAG)) out.push([q]); break;
      case 'c3': {
        const ok = new Set();
        for (let q = 0; q < g.N; q++) if (b[q] > 0 && tix(b[q]) === S_I) for (const z of adjOf(s, q)) if (z !== from && canLand(b, z, p)) ok.add(z);
        for (const q of ok) out.push([q]);
        break;
      }
      case 'c4': for (const q of shotTargets(s, from, p, DIAG, 1)) out.push([q]); break;
      case 'c5': {
        const r = from / g.W | 0, c = from % g.W;
        for (let q = 0; q < g.N; q++) if (g.ex[q] && Math.abs((q / g.W | 0) - r) + Math.abs(q % g.W - c) > 5 && canLand(b, q, p)) out.push([q]);
        break;
      }
      case 'c6': out.push(['go']); break;
      case 'c7': for (const q of shotTargets(s, from, p, ORTH, 1)) out.push([q]); break;
      case 'c8':
        for (const d of ALL) {
          let q = nx(g, from, d);
          if (q < 0) continue;
          if (canLand(b, q, p)) out.push([q]);
          if (b[q] !== 0) {
            while (q >= 0 && b[q] !== 0) q = nx(g, q, d);
            if (q >= 0) out.push([q]);
          }
        }
        break;
      // ----- mages -----
      case 'ma':
        if (enemiesIn(s, g.border, p)) out.push(['bord']);
        if (enemiesIn(s, g.center, p)) out.push(['centre']);
        break;
      case 'pb': if (enemiesIn(s, g.ring2, p)) out.push(['anneau']); break;
      case 'mb': {
        const pcs = []; for (let q = 0; q < g.N; q++) if (b[q] > 0) pcs.push(q);
        for (const x of pcs) for (const y of pcs) {
          if (x === y || (!full && x > y)) continue;
          if (own(b[x]) === own(b[y]) && tix(b[x]) === tix(b[y])) continue; // échange inutile
          if (!full) { // élagage bot : seuls les échanges qui touchent un ennemi utile
            const ox = own(b[x]), oy = own(b[y]);
            if (ox === p && oy === p) continue;
            if (ox === opp && oy === opp && T[tix(b[x])].cat !== 'M' && T[tix(b[y])].cat !== 'M') continue;
          }
          out.push([x, y]);
        }
        break;
      }
      case 'mc': {
        const empt = [];
        for (let q = 0; q < g.N; q++) {
          if (b[q] !== 0) continue;
          // bot : seulement là où on peut l'attaquer (près de nos persos, ou sur le contour)
          if (full || g.border.includes(q) || adjOf(s, q).some(z => b[z] > 0 && own(b[z]) === p)) empt.push(q);
        }
        for (let q = 0; q < g.N; q++) if (b[q] > 0 && own(b[q]) === opp && T[tix(b[q])].cat === 'G') for (const e of empt) out.push([q, e]);
        break;
      }
      case 'md': {
        const al = []; for (let q = 0; q < g.N; q++) if (b[q] > 0 && own(b[q]) === p) al.push(q);
        for (const a1 of al) for (const t1 of pawnTargets(s, a1, p)) {
          out.push([a1, t1]);
          const s2 = mini(s);
          const np = stepTo(s2, a1, t1);
          for (const a2 of al) {
            if (a2 === a1 || a2 === np || s2.b[a2] <= 0 || own(s2.b[a2]) !== p) continue;
            if (!full && a2 < a1) continue;
            for (const t2 of pawnTargets(s2, a2, p)) out.push([a1, t1, a2, t2]);
          }
        }
        break;
      }
      case 'me': {
        const av = []; for (let i = 0; i < NT; i++) if (s.pool[i] > 0) av.push(i);
        for (const i of av) {
          out.push(['r' + i]);
          for (const j of av) {
            if (!full && j < i) continue;
            if (j === i && s.pool[i] < 2) continue;
            out.push(['r' + i, 'r' + j]);
          }
        }
        break;
      }
      case 'pa': out.push(['go']); break;
      case 'pc':
        for (let q = 0; q < g.N; q++) if (b[q] > 0 && own(b[q]) === p && tix(b[q]) === S_I)
          for (const seq of multiStep(s, q, p, pawnTargets, 2)) out.push([q].concat(seq));
        break;
      case 'pd': if (s.pool[S_I] > 0) for (const q of homeEmpty(s, p)) out.push([q]); break;
      case 'pe': out.push(['go']); break;
      case 'pf': out.push(['go']); break;
      case 'pg': if (!s.pend[p]) out.push(['go']); break;
    }
    return out;
  }

  // applique une activation (sans fin de tour)
  function runAct(s, from, cl) {
    const g = s.g, c0 = s.b[from], p = own(c0), t = T[tix(c0)], opp = 1 - p;
    if (t.cost) s.mana[p] -= t.cost;
    switch (t.id) {
      case 's': case 'g5': case 'g7': case 'g2': case 'c1': case 'c2': case 'c3': case 'c5': case 'c8': {
        let pos = from;
        for (const q of cl) pos = stepTo(s, pos, q);
        break;
      }
      case 'g1': { const x = s.b[cl[0]]; s.b[cl[0]] = s.b[from]; s.b[from] = x; break; }
      case 'g3': {
        const q = cl[0];
        if (DIAG.some(d => nx(g, from, d) === q)) stepTo(s, from, q); else kill(s, q);
        break;
      }
      case 'c4': case 'c7': kill(s, cl[0]); break;
      case 'g4': {
        let pos = from;
        for (const q of cl) { const d = ALL.find(dd => nx(g, pos, dd) === q); pos = pushLine(s, pos, d, true); }
        break;
      }
      case 'g6': for (const z of adjOf(s, from)) if (s.b[z] > 0 && own(s.b[z]) === opp) kill(s, z); break;
      case 'c6': s.mana[p] += 25; break;
      case 'ma': for (const z of (cl[0] === 'bord' ? g.border : g.center)) if (s.b[z] > 0 && own(s.b[z]) === opp) kill(s, z); break;
      case 'pb': for (const z of g.ring2) if (s.b[z] > 0 && own(s.b[z]) === opp) kill(s, z); break;
      case 'mb': { const x = s.b[cl[0]]; s.b[cl[0]] = s.b[cl[1]]; s.b[cl[1]] = x; break; }
      case 'mc': s.b[cl[1]] = s.b[cl[0]]; s.b[cl[0]] = 0; break;
      case 'md': stepTo(s, cl[0], cl[1]); if (cl.length > 2) stepTo(s, cl[2], cl[3]); break;
      case 'me': for (const k of cl) { const i = +k.slice(1); s.pool[i]--; s.res[p][i]++; } break;
      case 'pa': s.acts += 2; break;
      case 'pc': { let pos = cl[0]; for (let i = 1; i < cl.length; i++) pos = stepTo(s, pos, cl[i]); break; }
      case 'pd': s.pool[S_I]--; s.b[cl[0]] = enc(S_I, p); break;
      case 'pe': s.noPlace[opp] = 3; break;
      case 'pf': s.noAct[opp] = 2; break;
      case 'pg': s.pend[p] = 1; break;
    }
  }

  // ---------- Actions ----------
  function placeFree(s, a) { return s.ev === 'noir' && a.k === 'pla' && isDark(s.g, a.to); }

  function gen(s, full) {
    if (s.winner !== null) return [];
    const p = s.turn, out = [], g = s.g;
    if (s.phase === 'draft') {
      if (s.ev === 'cache') return [{ k: 'pioche' }];
      for (let i = 0; i < NT; i++) if (s.pool[i] > 0) out.push({ k: 'draft', t: i });
      return out;
    }
    if (s.phase === 'decl') {
      out.push({ k: 'decl', d: { k: 'rec' } }, { k: 'decl', d: { k: 'pla' } });
      for (let q = 0; q < g.N; q++) if (s.b[q] > 0 && own(s.b[q]) === p) out.push({ k: 'decl', d: { k: 'act', from: q } });
      return out;
    }
    for (let i = 0; i < NT; i++) if (s.pool[i] > 0) out.push({ k: 'rec', t: i });
    if (!s.noPlace[p]) {
      const he = homeEmpty(s, p);
      for (let i = 0; i < NT; i++) if (s.res[p][i] > 0) for (const q of he) out.push({ k: 'pla', t: i, to: q });
    }
    if (!s.noAct[p]) for (let q = 0; q < g.N; q++) {
      if (s.b[q] > 0 && own(s.b[q]) === p) for (const cl of genAct(s, q, full)) out.push({ k: 'act', from: q, cl });
    }
    let res = out;
    const d = s.decl[p];
    if (d) {
      const f = out.filter(a => a.k === d.k && (d.k !== 'act' || a.from === d.from));
      if (f.length) res = f.concat(out.filter(a => placeFree(s, a) && !f.includes(a)));
    }
    if (!res.some(a => !placeFree(s, a))) res.push({ k: 'pass' });
    return res;
  }

  function endTurn(s) {
    const p = s.turn;
    if (s.noPlace[p]) s.noPlace[p]--;
    if (s.noAct[p]) s.noAct[p]--;
    s.decl[p] = s._newDecl || null; s._newDecl = null;
    s.turn = 1 - p; s.acts = 1; s.ply++;
    s.quiet++;
    if (s.quiet >= 150 && s.winner === null) { s.winner = 2; s.why = '150 tours (75 chacun) sans aucune élimination : partie nulle.'; }
    const q = s.turn;
    if (s.pend[q]) {
      s.pend[q] = 0;
      const dead = s.lost[q][0] + s.lost[q][1] + s.lost[q][2];
      s.mana[q] += 40 * dead;
      s._martyr = 40 * dead;
    }
  }

  function loses(s, p) {
    if (s.ev === 'illimite') return s.lost[p][0] >= 2 || s.lost[p][1] >= 6;
    return s.lost[p][1] >= 4 || (s.lost[p][0] >= 1 && aliveMages(s, p) === 0);
  }
  function checkWin(s) {
    if (s.winner !== null) return;
    const l0 = loses(s, 0), l1 = loses(s, 1);
    if (!l0 && !l1) return;
    if (l0 && l1) s.winner = s.turn; else s.winner = l0 ? 1 : 0;
    const L = 1 - s.winner;
    s.why = (s.ev === 'illimite')
      ? (s.lost[L][0] >= 2 ? '2 Primages (mages) tués.' : '6 Champions (gardes) tués.')
      : (s.lost[L][1] >= 4 ? '4 guerriers (gardes) tués.' : 'Tous les dieux (mages) adverses sont morts.');
  }
  function checkBet(s) {
    if (s.ev !== 'pari' || s.betDone || !s.bet) return;
    const hit = p => s.lost[p][0] >= 1 || s.lost[p][1] >= 2;
    const h0 = hit(0), h1 = hit(1);
    if (!h0 && !h1) return;
    const loser = (h0 && h1) ? 1 - s.turn : (h0 ? 0 : 1);
    s.betDone = true; s.betLoser = loser;
    for (const p of [0, 1]) s.mana[p] = Math.max(0, s.mana[p] + (s.bet[p] === loser ? 35 : -35));
  }

  // applique une action (modifie s) ; renvoie s
  function apply(s, a) {
    const p = s.turn;
    s._k = 0;
    s.last = a;
    if (a.k === 'draft' || a.k === 'pioche') {
      let t = a.t;
      if (a.k === 'pioche' && t === undefined) {
        let n = 0; for (let i = 0; i < NT; i++) n += s.pool[i];
        let r = rnd(n);
        for (let i = 0; i < NT; i++) { r -= s.pool[i]; if (r < 0) { t = i; break; } }
        a.t = t;
      }
      s.pool[t]--;
      s.res[(s.ev === 'inverse') ? 1 - p : p][t]++;
      let left = 0; for (let i = 0; i < NT; i++) left += s.pool[i];
      s.turn = 1 - p;
      if (!left) { s.phase = 'play'; s.turn = s.first0; }
      return s;
    }
    if (a.k === 'decl') { s._newDecl = a.d; s.phase = 'play'; endTurn(s); return s; }
    let free = false;
    if (a.k === 'rec') { s.pool[a.t]--; s.res[p][a.t]++; }
    else if (a.k === 'pla') { s.res[p][a.t]--; s.b[a.to] = enc(a.t, p); free = placeFree(s, a); }
    else if (a.k === 'act') runAct(s, a.from, a.cl);
    if (a.k !== 'pass' && s.decl[p] && !free) s.decl[p] = null; // annonce honorée
    checkBet(s);
    checkWin(s);
    if (s.winner !== null) return s;
    if (!free) s.acts--;
    if (s.acts <= 0 || a.k === 'pass') {
      if (s.declOn) { s.phase = 'decl'; return s; }
      endTurn(s);
    }
    return s;
  }

  // =====================================================================
  //  Bot
  // =====================================================================
  const WIN = 100000, WINCAP = 400;
  const GPRESS = [0, 2.5, 6, 12, 20, 30, 45, 60];
  // poids réglés par l'apprentissage (voir UI : le bot impossible s'adapte à tes parties)
  let W8 = { wG: 1, wM: 1, opp: null };

  function magesOnBoard(s, p) { let n = 0; const b = s.b; for (let q = 0; q < b.length; q++) { const c = b[q]; if (c > 0 && own(c) === p && T[tix(c)].cat === 'M') n++; } return n; }
  function danger(s, q, am, onB) {
    if (s.ev === 'illimite') return 0;
    if (am === 0 && s.lost[q][0] === 0) return 0; // aucun dieu engagé : immunisé
    if (am === 1) return onB ? 12 : 5;
    if (am === 2) return onB === 2 ? 4 : 1.5;
    return 0;
  }

  // valeur (pour l'attaquant) de tuer d'un coup l'ensemble `sqs` de persos ennemis de `q`
  function killGain(s, sqs, am) {
    if (!sqs.length) return 0;
    const b = s.b, q = own(b[sqs[0]]);
    let v = 0, m = 0, gd = 0;
    for (const x of sqs) { const t = T[tix(b[x])]; v += t.val; if (t.cat === 'M') m++; else if (t.cat === 'G') gd++; }
    const L = s.lost[q];
    if (s.ev === 'illimite') { if (L[0] + m >= 2 || L[1] + gd >= 6) return WINCAP; v += m * 12; }
    else {
      if (L[1] + gd >= 4) return WINCAP;
      if (m && am[q] - m <= 0) return WINCAP;
      if (m) v += (am[q] - m === 1 ? 10 : 3) * W8.wM;
    }
    if (gd) v += (GPRESS[Math.min(L[1] + gd, 7)] - GPRESS[L[1]]) * W8.wG;
    return v;
  }

  // meilleures prises immédiates de q (liste des gains, une par action), sans tout générer
  function captureGains(s, q, am) {
    const out = [];
    if (s.noAct[q]) return out;
    const g = s.g, b = s.b, opp = 1 - q;
    const isEnemy = x => b[x] > 0 && own(b[x]) === opp;
    const one = x => { if (isEnemy(x)) out.push(killGain(s, [x], am)); };
    for (let f = 0; f < g.N; f++) {
      const c = b[f]; if (c <= 0 || own(c) !== q) continue;
      const t = T[tix(c)];
      if (t.cost && s.mana[q] < t.cost) continue;
      switch (t.id) {
        case 's': case 'g5': for (const x of pawnTargets(s, f, q)) one(x); break;
        case 'g2': for (const x of slideTargets(s, f, q, ORTH)) one(x); break;
        case 'c2': for (const x of slideTargets(s, f, q, DIAG)) one(x); break;
        case 'g3': for (const x of stepTargets(s, f, q, DIAG)) one(x); for (const x of shotTargets(s, f, q, DIAG, 2)) one(x); break;
        case 'c4': for (const x of shotTargets(s, f, q, DIAG, 1)) one(x); break;
        case 'c7': for (const x of shotTargets(s, f, q, ORTH, 1)) one(x); break;
        case 'g7': case 'c8': for (const x of stepTargets(s, f, q, ALL)) if (t.id === 'c8' || DIAG.some(d => nx(g, f, d) === x)) one(x); break;
        case 'g6': { const z = adjOf(s, f).filter(isEnemy); if (z.length) out.push(killGain(s, z, am)); break; }
        case 'ma': {
          const z1 = g.border.filter(isEnemy), z2 = g.center.filter(isEnemy);
          if (z1.length) out.push(killGain(s, z1, am)); if (z2.length) out.push(killGain(s, z2, am));
          break;
        }
        case 'pb': { const z = g.ring2.filter(isEnemy); if (z.length) out.push(killGain(s, z, am)); break; }
        case 'g4':
          for (const d of ALL) {
            let x = nx(g, f, d); if (x < 0) continue;
            let last = -1, wall = false;
            while (x >= 0 && b[x] !== 0) { if (b[x] === -1) { wall = true; break; } last = x; x = nx(g, x, d); }
            if (!wall && x < 0 && last >= 0 && isEnemy(last)) out.push(killGain(s, [last], am));
          }
          break;
        case 'c1': case 'c3': case 'c5': for (const cl of genAct(s, f, false)) one(cl[0]); break;
        case 'md': for (let x = 0; x < g.N; x++) if (b[x] > 0 && own(b[x]) === q) for (const y of pawnTargets(s, x, q)) one(y); break;
        case 'pc': for (let x = 0; x < g.N; x++) if (b[x] > 0 && own(b[x]) === q && tix(b[x]) === S_I) for (const y of pawnTargets(s, x, q)) one(y); break;
      }
    }
    return out;
  }
  const top2 = a => { let x = 0, y = 0; for (const v of a) { if (v > x) { y = x; x = v; } else if (v > y) y = v; } return [x, y]; };

  // évaluation statique (pour p) ; `deep` ajoute la lecture des prises immédiates (menaces)
  function evalS(s, p, deep) {
    if (s.winner !== null) return s.winner === 2 ? 0 : (s.winner === p ? WIN : -WIN);
    const g = s.g, b = s.b;
    let sc = 0;
    const onB = [0, 0], mpos = [[], []];
    for (let q = 0; q < g.N; q++) { const c = b[q]; if (c > 0 && T[tix(c)].cat === 'M') { onB[own(c)]++; mpos[own(c)].push(q); } }
    const am = [aliveMages(s, 0), aliveMages(s, 1)];
    for (let q = 0; q < g.N; q++) {
      const c = b[q]; if (c <= 0) continue;
      const o = own(c), t = T[tix(c)];
      let v = t.val;
      const r = q / g.W | 0, cc = q % g.W;
      // un mage posé ne vaut pas plus qu'en réserve (où il est intouchable) : on ne le pose que pour lancer un sort
      if (t.cat === 'M') v = t.val * 0.75 + (s.mana[o] >= (t.cost || 0) ? 0.3 : -0.5);
      else {
        if (t.cat === 'S') v += (o === 0 ? g.H - 1 - r : r) * 0.05;
        // se rapprocher des dieux adverses
        let md = 9;
        for (const m of mpos[1 - o]) md = Math.min(md, Math.max(Math.abs((m / g.W | 0) - r), Math.abs(m % g.W - cc)));
        if (md < 9) v += (8 - md) * (t.cat === 'G' ? 0.07 : 0.04);
      }
      sc += o === p ? v : -v;
    }
    for (let i = 0; i < NT; i++) {
      const d = s.res[p][i] - s.res[1 - p][i];
      if (d) sc += d * T[i].val * (T[i].cat === 'M' ? 0.75 : 0.8);
    }
    sc += (s.mana[p] - s.mana[1 - p]) * 0.05;
    sc += (GPRESS[Math.min(s.lost[1 - p][1], 7)] - GPRESS[Math.min(s.lost[p][1], 7)]) * W8.wG;
    if (s.ev === 'illimite') sc += (s.lost[1 - p][0] - s.lost[p][0]) * 12;
    else sc += (danger(s, 1 - p, am[1 - p], onB[1 - p]) - danger(s, p, am[p], onB[p])) * W8.wM;
    if (s.noAct[1 - p]) sc += 1.5 * s.noAct[1 - p];
    if (s.noAct[p]) sc -= 1.5 * s.noAct[p];
    if (s.noPlace[1 - p]) sc += 0.6 * s.noPlace[1 - p];
    if (s.noPlace[p]) sc -= 0.6 * s.noPlace[p];
    if (deep && s.phase === 'play') {
      // celui qui joue peut prendre tout de suite ; l'autre ne pourra parer qu'une menace
      const stm = s.turn;
      const mine = top2(captureGains(s, stm, am)), theirs = top2(captureGains(s, 1 - stm, am));
      let th = 0;
      if (mine[0] >= WINCAP) th = 3000;            // victoire au prochain coup
      else {
        th = 0.8 * mine[0];
        if (theirs[0] >= WINCAP && theirs[1] >= WINCAP) th -= 1500; // deux menaces gagnantes : imparable
        else th -= 0.45 * Math.min(theirs[0], 60) + 0.25 * Math.min(theirs[1], 60);
      }
      sc += stm === p ? th : -th;
    }
    return sc;
  }

  // ----- hachage de position (table de transposition) -----
  function hashS(s) {
    let h1 = 2166136261 | 0, h2 = 5381;
    const mix = v => { h1 = Math.imul(h1 ^ v, 16777619); h2 = (Math.imul(h2, 33) + v) | 0; };
    const b = s.b; for (let q = 0; q < b.length; q++) mix(b[q] + 3);
    for (let i = 0; i < NT; i++) { mix(s.pool[i]); mix(s.res[0][i]); mix(s.res[1][i]); }
    mix(s.mana[0]); mix(s.mana[1]); mix(s.turn); mix(s.acts);
    mix(s.lost[0][0] * 64 + s.lost[0][1] * 8 + s.lost[0][2]); mix(s.lost[1][0] * 64 + s.lost[1][1] * 8 + s.lost[1][2]);
    mix(s.noPlace[0] * 16 + s.noPlace[1] * 4 + s.pend[0] * 2 + s.pend[1]); mix(s.noAct[0] * 4 + s.noAct[1]);
    mix(s.phase === 'play' ? 1 : 2);
    return (h1 >>> 0) * 4194304 + ((h2 >>> 0) & 4194303);
  }

  function child(s, a) { return apply(clone(s), a); }

  function draftPick(s, level) {
    const acts = gen(s, false);
    if (acts[0].k === 'pioche') return acts[0];
    const inv = s.ev === 'inverse';
    let best = null, bv = -1e9;
    for (const a of acts) {
      const t = T[a.t];
      let v = t.val + (t.cat === 'M' ? 2 : 0) + (t.id === 'ma' ? 2 : 0);
      if (inv) v = -v; // je donne le plus faible
      if (level === 'facile') v += Math.random() * 6;
      if (v > bv) { bv = v; best = a; }
    }
    return best;
  }

  // think(état, niveau, options) — options : { budget (ms), adapt: { wG, wM, opp: {typeId: fréquence} } }
  function think(s0, level, opt) {
    opt = opt || {};
    W8 = { wG: 1, wM: 1, opp: null };
    if (level === 'impossible' && opt.adapt) W8 = Object.assign(W8, opt.adapt);
    if (s0.phase === 'draft') return draftPick(s0, level);
    if (s0.phase === 'decl') return chooseDecl(s0, level);
    const s = clone(s0); s.declOn = false;
    const p = s.turn;
    const acts = gen(s, false);
    if (acts.length === 1) return acts[0];
    const deep = level !== 'facile';
    const kids = acts.map(a => { const c = child(s, a); return { a, c, v: evalS(c, p, deep) }; });
    kids.sort((x, y) => y.v - x.v);
    if (level === 'facile') {
      if (Math.random() < 0.35) return acts[rnd(acts.length)];
      let best = null, bv = -1e9;
      for (const k of kids) { const v = k.v + (Math.random() - 0.5) * 6; if (v > bv) { bv = v; best = k.a; } }
      return best;
    }
    if (kids[0].v >= WIN / 2) return kids[0].a;
    const imp = level === 'impossible';
    let budget = opt.budget || (imp ? 6000 : 700);
    const t0 = Date.now();
    let deadline = t0 + budget;
    const maxD = imp ? 12 : 2;
    const rootBeam = imp ? 48 : 30;
    const tt = new Map();
    const ABORT = {};
    let nodes = 0;
    // modèle de l'adversaire (appris sur tes parties) : ses coups habituels sont examinés en priorité
    const oppBonus = (st, a) => {
      if (!W8.opp) return 0;
      if (a.k === 'act') return 2 * (W8.opp[T[tix(st.b[a.from])].id] || 0);
      if (a.k === 'rec') return 1.5 * (W8.opp['rec:' + T[a.t].id] || 0);
      return 0;
    };
    // enfants d'une position : tri rapide de tous les coups, puis lecture des menaces pour les meilleurs et les prises
    function expand(st, me, nDeep) {
      const as = gen(st, false);
      const cs = as.map((a, i) => { const c = child(st, a); return { c, i, v: evalS(c, me, false), cap: c._k > 0, a }; });
      cs.sort((x, y) => y.v - x.v);
      let caps = 0;
      for (let k = 0; k < cs.length; k++) {
        const x = cs[k];
        if (k < nDeep || (x.cap && caps++ < 10)) x.v = evalS(x.c, me, true);
        else x.v -= 1;
        x.o = x.v + (me !== p ? oppBonus(st, x.a) : 0);
      }
      return cs;
    }
    function beamFor(depth) { return imp ? (depth >= 4 ? 10 : depth === 3 ? 14 : 20) : 14; }
    function nega(st, depth, alpha, beta) {
      if (st.winner !== null) return st.winner === 2 ? 0 : (st.winner === st.turn ? WIN - st.ply : -WIN + st.ply);
      nodes++; if (Date.now() > deadline) throw ABORT;
      const me = st.turn;
      const key = hashS(st);
      const ent = tt.get(key);
      if (ent && ent.d >= depth) {
        if (ent.f === 0) return ent.v;
        if (ent.f === 1 && ent.v >= beta) return ent.v;
        if (ent.f === -1 && ent.v <= alpha) return ent.v;
      }
      const a0 = alpha;
      let cs = expand(st, me, depth === 1 ? 14 : 22);
      if (depth === 1) {
        let best = -Infinity, bi = 0;
        for (const x of cs) if (x.v > best) { best = x.v; bi = x.i; }
        tt.set(key, { d: 1, v: best, f: 0, m: bi });
        return best;
      }
      cs.sort((x, y) => y.o - x.o);
      if (ent && ent.m !== undefined) { const k = cs.findIndex(x => x.i === ent.m); if (k > 0) cs.unshift(cs.splice(k, 1)[0]); }
      const K = beamFor(depth);
      if (cs.length > K) {
        const keep = cs.slice(0, K);
        let extra = 0;
        for (let i = K; i < cs.length && extra < 6; i++) if (cs[i].cap) { keep.push(cs[i]); extra++; }
        cs = keep;
      }
      let best = -Infinity, bi = cs[0].i;
      for (const x of cs) {
        const v = x.c.turn === me ? nega(x.c, depth - 1, alpha, beta) : -nega(x.c, depth - 1, -beta, -alpha);
        if (v > best) { best = v; bi = x.i; if (best > alpha) alpha = best; if (alpha >= beta) break; }
      }
      tt.set(key, { d: depth, v: best, f: best <= a0 ? -1 : best >= beta ? 1 : 0, m: bi });
      return best;
    }
    let order = kids.slice(0, rootBeam);
    // toujours examiner aussi toutes les prises
    for (const k of kids.slice(rootBeam)) if (k.c._k > 0 && order.length < rootBeam + 12) order.push(k);
    let bestA = order[0].a, prevBest = null, stable = 0, extended = false;
    stats.depth = 1;
    for (let d = 2; d <= maxD; d++) {
      const scored = [];
      try {
        let alpha = -Infinity;
        for (const k of order) {
          const v = k.c.turn === p ? nega(k.c, d - 1, alpha, Infinity) : -nega(k.c, d - 1, -Infinity, -alpha);
          scored.push({ k, v });
          if (v > alpha) alpha = v;
        }
      } catch (e) {
        if (e !== ABORT) throw e;
        // profondeur non finie : on garde quand même ce qui a été vu (les meilleurs coups d'abord)
        if (scored.length && imp) { scored.sort((x, y) => y.v - x.v); bestA = scored[0].k.a; }
        break;
      }
      scored.sort((x, y) => y.v - x.v);
      stats.depth = d; stats.score = scored[0].v;
      if (!imp) {
        let bv = -1e9;
        for (const x of scored) { const v = x.v + (Math.random() - 0.5) * 1.2; if (v > bv) { bv = v; bestA = x.k.a; } }
      } else bestA = scored[0].k.a;
      // ordre de la prochaine itération : les mieux notés d'abord
      order = scored.map(x => x.k).concat(order.slice(scored.length));
      if (scored[0].v >= WIN / 2) break;
      if (scored[0].v <= -WIN / 2 && d >= 4) break; // tout perd : inutile de chercher plus loin
      // gestion du temps : on réfléchit plus longtemps si le meilleur coup change ou si la position est tendue
      if (imp) {
        if (prevBest !== null && scored[0].k.a === bestA && Math.abs(scored[0].v - prevBest) < 0.5) stable++; else stable = 0;
        const margin = scored.length > 1 ? scored[0].v - scored[1].v : 99;
        if (!extended && stable === 0 && d >= 3 && opt.canExtend !== false) { deadline += budget * 0.6; extended = true; }
        if (margin > 25 && d >= 4) break; // coup évident
        if (stable >= 3 && Date.now() - t0 > budget * 0.5) break;
      }
      prevBest = scored[0].v;
      if (Date.now() > deadline) break;
    }
    stats.nodes = nodes; stats.ms = Date.now() - t0;
    return bestA;
  }
  const stats = {};

  // annonce : ce que le bot ferait s'il rejouait tout de suite
  function chooseDecl(s0, level) {
    const s = clone(s0); s.phase = 'play'; s.declOn = false; s.decl = [null, null]; s.acts = 1;
    const p = s.turn;
    const acts = gen(s, false);
    let best = acts[0], bv = -1e9;
    for (const a of acts) { const v = evalS(child(s, a), p, level !== 'facile') + (level === 'facile' ? Math.random() * 4 : 0); if (v > bv) { bv = v; best = a; } }
    let d;
    if (best.k === 'act') d = { k: 'act', from: best.from };
    else if (best.k === 'pla') d = { k: 'pla' };
    else d = { k: 'rec' };
    return { k: 'decl', d };
  }

  return {
    T, NT, TI, EVENTS, VOID, SHAPES,
    stats, own, tix, enc, isHome, isDark, makeMap, newGame, clone, gen, genAct, apply, think, evalS, aliveMages, placeFree, loses,
  };
}
