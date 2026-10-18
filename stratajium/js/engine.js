/* Stratajium — moteur de règles + bot.
   Tout est dans une seule fonction pour pouvoir aussi tourner dans un Web Worker
   (créé depuis le texte de cette fonction : marche aussi en file://). */
function StratEngine() {
  'use strict';

  // ---------- Persos ----------
  // cat : M = mage (dieu / Primage), G = garde (guerrier / Champion), S = soldat (simple)
  const T = [
    { id: 'ma', cat: 'M', sym: 'a', name: 'Orage', cost: 40, val: 7, desc: 'Attaque toutes les cases du contour du plateau OU les 4 cases centrales (seuls les ennemis meurent).' },
    { id: 'mb', cat: 'M', sym: 'b', name: 'Miroir', cost: 40, val: 6, desc: 'Fait échanger de place 2 persos du plateau (n’importe lesquels).' },
    { id: 'mc', cat: 'M', sym: 'c', name: 'Marionnettiste', cost: 30, val: 6, desc: 'Déplace un garde adverse n’importe où sur une case vide.' },
    { id: 'md', cat: 'M', sym: 'd', name: 'Héraut', cost: 20, val: 5.5, desc: 'Déplace 2 alliés d’une case, comme un pion (avance d’1, ou prend en diagonale avant).' },
    { id: 'me', cat: 'M', sym: 'e', name: 'Invocateur', cost: 30, val: 5.5, desc: 'Recrute 2 persos dans la réserve commune.' },
    // Primages de l'extension
    { id: 'pa', cat: 'M', sym: 'a', ext: 1, name: 'Chronos', cost: 80, val: 6, desc: 'Rejoue 2 fois (2 actions de plus ce tour-ci).' },
    { id: 'pb', cat: 'M', sym: 'b', ext: 1, name: 'Séisme', cost: 50, val: 6.5, desc: 'Attaque le contour intérieur (le 2ᵉ anneau, juste à l’intérieur du contour). Seuls les ennemis meurent.' },
    { id: 'pc', cat: 'M', sym: 'c', ext: 1, name: 'Tambour', cost: 40, val: 5, desc: 'Déplace un de tes soldats 2 fois (comme un pion).' },
    { id: 'pd', cat: 'M', sym: 'd', ext: 1, name: 'Levée', cost: 35, val: 5, desc: 'Recrute un soldat et le place directement sur une de tes 2 rangées.' },
    { id: 'pe', cat: 'M', sym: 'e', ext: 1, name: 'Geôlier', cost: 35, val: 5.5, desc: 'L’adversaire ne peut plus placer de perso pendant ses 3 prochains tours.' },
    { id: 'pf', cat: 'M', sym: 'f', ext: 1, name: 'Silence', cost: 35, val: 6, desc: 'L’adversaire ne peut plus activer de perso pendant ses 2 prochains tours.' },
    { id: 'pg', cat: 'M', sym: 'g', ext: 1, name: 'Martyr', cost: 20, val: 5, desc: 'Au début de ton prochain tour : +40 mana pour chacun de tes persos morts.' },
    // Gardes
    { id: 'g1', cat: 'G', sym: '1', name: 'Jumeau', val: 3.2, desc: 'Échange de place avec un autre garde (allié ou adverse).' },
    { id: 'g2', cat: 'G', sym: '2', name: 'Rempart', val: 4.5, desc: 'Se déplace comme une tour aux échecs (lignes droites, prend en arrivant sur un ennemi).' },
    { id: 'g3', cat: 'G', sym: '3', name: 'Archer', val: 4.2, desc: 'Tire comme un fou à distance (tue le 1er ennemi d’une diagonale sans bouger) OU se déplace d’1 case en diagonale.' },
    { id: 'g4', cat: 'G', sym: '4', name: 'Bélier', val: 4.2, desc: 'Comme à Abalone, puissance infinie : avance d’1 case dans les 8 directions en poussant toute la file devant lui, 2 fois. Un perso poussé hors du plateau meurt.' },
    { id: 'g5', cat: 'G', sym: '5', name: 'Éclaireur', val: 3.2, desc: 'Comme un pion, mais se déplace 2 fois.' },
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
    { id: 's', cat: 'S', sym: '•', name: 'Soldat', val: 1, desc: 'Se déplace comme un pion : avance d’1 case, prend en diagonale vers l’avant. Rien d’autre.' },
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

  // ---------- Plateau ----------
  // case : 0 vide, -1 mur (perso mort retourné), sinon (type<<1 | joueur) + 1
  const own = c => c > 0 ? (c - 1) & 1 : -1;
  const tix = c => (c - 1) >> 1;
  const enc = (t, p) => (t << 1 | p) + 1;
  const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const fwd = p => p === 0 ? -1 : 1;
  const isHome = (sq, p) => { const r = sq >> 3; return p === 0 ? r >= 6 : r <= 1; };
  const isDark = sq => (((sq >> 3) + (sq & 7)) & 1) === 1;
  const D8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const BORDER = [], CENTER = [27, 28, 35, 36], RING2 = [];
  for (let sq = 0; sq < 64; sq++) {
    const r = sq >> 3, c = sq & 7;
    if (r === 0 || r === 7 || c === 0 || c === 7) BORDER.push(sq);
    else if (r === 1 || r === 6 || c === 1 || c === 6) RING2.push(sq);
  }

  // ---------- État ----------
  function newGame(o) {
    o = o || {};
    const ev = o.event || null;
    const s = {
      b: new Int8Array(64),
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
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function clone(s) {
    return {
      b: s.b.slice(), pool: s.pool.slice(), res: [s.res[0].slice(), s.res[1].slice()],
      mana: s.mana.slice(), lost: [s.lost[0].slice(), s.lost[1].slice()],
      turn: s.turn, acts: s.acts, noPlace: s.noPlace.slice(), noAct: s.noAct.slice(), pend: s.pend.slice(),
      decl: s.decl.slice(), ev: s.ev, declOn: s.declOn, phase: s.phase, bet: s.bet, betDone: s.betDone,
      winner: s.winner, why: s.why, ply: s.ply, quiet: s.quiet, last: s.last, first0: s.first0, betLoser: s.betLoser,
    };
  }
  const catIdx = c => c === 'M' ? 0 : c === 'G' ? 1 : 2;

  function aliveMages(s, p) {
    let n = 0;
    for (let sq = 0; sq < 64; sq++) { const c = s.b[sq]; if (c > 0 && own(c) === p && T[tix(c)].cat === 'M') n++; }
    for (let t = 0; t < NT; t++) if (T[t].cat === 'M') n += s.res[p][t];
    return n;
  }

  function kill(s, sq, wallOk) {
    const c = s.b[sq];
    if (c <= 0) return;
    const p = own(c), t = T[tix(c)];
    s.lost[p][catIdx(t.cat)]++;
    s.b[sq] = (s.ev === 'murs' && wallOk !== false) ? -1 : 0;
    s.quiet = -1;
    s._k = (s._k || 0) + 1;
    if (s._dead) s._dead.push(sq);
  }

  // déplacement simple vers une case vide ou ennemie ; renvoie la nouvelle position
  function stepTo(s, from, to) {
    const c = s.b[to];
    if (c > 0) {
      kill(s, to);
      if (s.ev === 'murs') return from; // le mort bloque : l'attaquant reste devant
    }
    s.b[to] = s.b[from]; s.b[from] = 0;
    return to;
  }

  // ---------- Générateurs de mouvements ----------
  const canLand = (b, sq, p) => { const c = b[sq]; return c === 0 || (c > 0 && own(c) !== p); };

  function pawnTargets(b, sq, p) {
    const r = sq >> 3, c = sq & 7, f = fwd(p), out = [];
    const r2 = r + f;
    if (!inb(r2, 0)) return out;
    if (b[r2 * 8 + c] === 0) out.push(r2 * 8 + c);
    for (const dc of [-1, 1]) {
      if (!inb(r2, c + dc)) continue;
      const t = b[r2 * 8 + c + dc];
      if (t > 0 && own(t) !== p) out.push(r2 * 8 + c + dc);
    }
    return out;
  }
  function slideTargets(b, sq, p, dirs) {
    const out = [], r = sq >> 3, c = sq & 7;
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (inb(rr, cc)) {
        const t = b[rr * 8 + cc];
        if (t === 0) out.push(rr * 8 + cc);
        else { if (t > 0 && own(t) !== p) out.push(rr * 8 + cc); break; }
        rr += dr; cc += dc;
      }
    }
    return out;
  }
  // tir : 1er perso rencontré sur la ligne, s'il est ennemi (distance >= minD)
  function shotTargets(b, sq, p, dirs, minD) {
    const out = [], r = sq >> 3, c = sq & 7;
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc, d = 1;
      while (inb(rr, cc)) {
        const t = b[rr * 8 + cc];
        if (t !== 0) { if (t > 0 && own(t) !== p && d >= minD) out.push(rr * 8 + cc); break; }
        rr += dr; cc += dc; d++;
      }
    }
    return out;
  }
  function stepTargets(b, sq, p, dirs) {
    const out = [], r = sq >> 3, c = sq & 7;
    for (const [dr, dc] of dirs) if (inb(r + dr, c + dc) && canLand(b, (r + dr) * 8 + c + dc, p)) out.push((r + dr) * 8 + c + dc);
    return out;
  }
  // poussée façon Abalone : renvoie true si possible (et l'effectue si s fourni)
  function pushLine(s, pos, dr, dc, doIt) {
    const b = s.b, r = pos >> 3, c = pos & 7;
    if (!inb(r + dr, c + dc)) return false;
    const line = [];
    let rr = r + dr, cc = c + dc;
    while (inb(rr, cc) && b[rr * 8 + cc] !== 0) {
      if (b[rr * 8 + cc] < 0) return false; // mur : inamovible
      line.push(rr * 8 + cc); rr += dr; cc += dc;
    }
    if (!doIt) return true;
    // de la fin vers le début
    for (let i = line.length - 1; i >= 0; i--) {
      const q = line[i], qr = (q >> 3) + dr, qc = (q & 7) + dc;
      if (!inb(qr, qc)) { kill(s, q, false); s.b[q] = 0; }
      else { s.b[qr * 8 + qc] = s.b[q]; s.b[q] = 0; }
    }
    const to = (r + dr) * 8 + c + dc;
    s.b[to] = s.b[pos]; s.b[pos] = 0;
    return to;
  }
  function multiStep(s, from, p, firstFn, max) {
    // renvoie toutes les séquences de 1..max étapes
    const out = [];
    const rec = (st, pos, seq) => {
      const tg = firstFn(st.b, pos, p);
      for (const t of tg) {
        const seq2 = seq.concat([t]);
        out.push(seq2);
        if (seq2.length < max) {
          const st2 = { b: st.b.slice(), ev: st.ev, lost: [[0, 0, 0], [0, 0, 0]] };
          const np = stepTo(st2, pos, t);
          rec(st2, np, seq2);
        }
      }
    };
    rec({ b: s.b, ev: s.ev }, from, []);
    return out;
  }
  const enemiesIn = (s, sqs, p) => sqs.some(q => s.b[q] > 0 && own(s.b[q]) !== p);
  function homeEmpty(s, p) { const out = []; for (let sq = 0; sq < 64; sq++) if (s.b[sq] === 0 && isHome(sq, p)) out.push(sq); return out; }

  // liste des séquences de clics possibles pour activer le perso en `from`
  // (un clic = numéro de case, ou chaîne pour un bouton)
  function genAct(s, from, full) {
    const b = s.b, c0 = b[from], p = own(c0), t = T[tix(c0)], out = [];
    const opp = 1 - p;
    if (t.cost && s.mana[p] < t.cost) return out;
    switch (t.id) {
      case 's': for (const q of pawnTargets(b, from, p)) out.push([q]); break;
      case 'g1':
        for (let q = 0; q < 64; q++) if (q !== from && b[q] > 0 && T[tix(b[q])].cat === 'G') out.push([q]);
        break;
      case 'g2': for (const q of slideTargets(b, from, p, ORTH)) out.push([q]); break;
      case 'g3':
        for (const q of stepTargets(b, from, p, DIAG)) out.push([q]);
        for (const q of shotTargets(b, from, p, DIAG, 2)) out.push([q]);
        break;
      case 'g4': {
        const r = from >> 3, c = from & 7;
        for (const [dr, dc] of D8) {
          if (!pushLine(s, from, dr, dc, false)) continue;
          const q1 = (r + dr) * 8 + c + dc;
          out.push([q1]);
          const s2 = { b: b.slice(), ev: s.ev, lost: [[0, 0, 0], [0, 0, 0]] };
          pushLine(s2, from, dr, dc, true);
          for (const [er, ec] of D8) {
            if (!pushLine(s2, q1, er, ec, false)) continue;
            out.push([q1, ((q1 >> 3) + er) * 8 + (q1 & 7) + ec]);
          }
        }
        break;
      }
      case 'g5': out.push(...multiStep(s, from, p, pawnTargets, 2)); break;
      case 'g6': {
        const adj = []; const r = from >> 3, c = from & 7;
        for (const [dr, dc] of D8) if (inb(r + dr, c + dc)) adj.push((r + dr) * 8 + c + dc);
        if (enemiesIn(s, adj, p)) out.push(['go']);
        break;
      }
      case 'g7': out.push(...multiStep(s, from, p, (bb, q, pp) => stepTargets(bb, q, pp, DIAG), 2)); break;
      case 'c1': {
        const r = from >> 3, c = from & 7;
        for (const [dr, dc] of D8) { const rr = r + 2 * dr, cc = c + 2 * dc; if (inb(rr, cc) && canLand(b, rr * 8 + cc, p)) out.push([rr * 8 + cc]); }
        break;
      }
      case 'c2': for (const q of slideTargets(b, from, p, DIAG)) out.push([q]); break;
      case 'c3': {
        const ok = new Set();
        for (let q = 0; q < 64; q++) {
          if (b[q] > 0 && tix(b[q]) === S_I) {
            const r = q >> 3, c = q & 7;
            for (const [dr, dc] of D8) { const z = (r + dr) * 8 + c + dc; if (inb(r + dr, c + dc) && z !== from && canLand(b, z, p)) ok.add(z); }
          }
        }
        for (const q of ok) out.push([q]);
        break;
      }
      case 'c4': for (const q of shotTargets(b, from, p, DIAG, 1)) out.push([q]); break;
      case 'c5': {
        const r = from >> 3, c = from & 7;
        for (let q = 0; q < 64; q++) if (Math.abs((q >> 3) - r) + Math.abs((q & 7) - c) > 5 && canLand(b, q, p)) out.push([q]);
        break;
      }
      case 'c6': out.push(['go']); break;
      case 'c7': for (const q of shotTargets(b, from, p, ORTH, 1)) out.push([q]); break;
      case 'c8': {
        const r = from >> 3, c = from & 7;
        for (const [dr, dc] of D8) {
          let rr = r + dr, cc = c + dc;
          if (!inb(rr, cc)) continue;
          const z = rr * 8 + cc;
          if (canLand(b, z, p)) out.push([z]);
          if (b[z] !== 0) {
            while (inb(rr, cc) && b[rr * 8 + cc] !== 0) { rr += dr; cc += dc; }
            if (inb(rr, cc)) out.push([rr * 8 + cc]);
          }
        }
        break;
      }
      // ----- mages -----
      case 'ma':
        if (enemiesIn(s, BORDER, p)) out.push(['bord']);
        if (enemiesIn(s, CENTER, p)) out.push(['centre']);
        break;
      case 'pb': if (enemiesIn(s, RING2, p)) out.push(['anneau']); break;
      case 'mb': {
        const pcs = []; for (let q = 0; q < 64; q++) if (b[q] > 0) pcs.push(q);
        for (const x of pcs) for (const y of pcs) {
          if (x === y || (!full && x > y)) continue;
          if (own(b[x]) === own(b[y]) && tix(b[x]) === tix(b[y])) continue; // échange inutile
          if (!full && own(b[x]) === own(b[y]) && own(b[x]) === opp) continue; // élagage bot
          out.push([x, y]);
        }
        break;
      }
      case 'mc': {
        const empt = []; for (let q = 0; q < 64; q++) if (b[q] === 0) empt.push(q);
        for (let q = 0; q < 64; q++) if (b[q] > 0 && own(b[q]) === opp && T[tix(b[q])].cat === 'G') for (const e of empt) out.push([q, e]);
        break;
      }
      case 'md': {
        const al = []; for (let q = 0; q < 64; q++) if (b[q] > 0 && own(b[q]) === p) al.push(q);
        for (const a1 of al) for (const t1 of pawnTargets(b, a1, p)) {
          out.push([a1, t1]);
          const s2 = { b: b.slice(), ev: s.ev, lost: [[0, 0, 0], [0, 0, 0]] };
          const np = stepTo(s2, a1, t1);
          for (const a2 of al) {
            if (a2 === a1 || a2 === np || s2.b[a2] <= 0 || own(s2.b[a2]) !== p) continue;
            if (!full && a2 < a1) continue;
            for (const t2 of pawnTargets(s2.b, a2, p)) out.push([a1, t1, a2, t2]);
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
      case 'pc': {
        for (let q = 0; q < 64; q++) if (b[q] > 0 && own(b[q]) === p && tix(b[q]) === S_I)
          for (const seq of multiStep(s, q, p, pawnTargets, 2)) out.push([q].concat(seq));
        break;
      }
      case 'pd': if (s.pool[S_I] > 0) for (const q of homeEmpty(s, p)) out.push([q]); break;
      case 'pe': out.push(['go']); break;
      case 'pf': out.push(['go']); break;
      case 'pg': if (!s.pend[p]) out.push(['go']); break;
    }
    return out;
  }

  // applique une activation (sans fin de tour)
  function runAct(s, from, cl) {
    const c0 = s.b[from], p = own(c0), t = T[tix(c0)], opp = 1 - p;
    if (t.cost) s.mana[p] -= t.cost;
    switch (t.id) {
      case 's': case 'g5': case 'g7': case 'g2': case 'c1': case 'c2': case 'c3': case 'c5': case 'c8': {
        let pos = from;
        for (const q of cl) pos = stepTo(s, pos, q);
        break;
      }
      case 'g1': { const x = s.b[cl[0]]; s.b[cl[0]] = s.b[from]; s.b[from] = x; break; }
      case 'g3': {
        const q = cl[0], d = Math.max(Math.abs((q >> 3) - (from >> 3)), Math.abs((q & 7) - (from & 7)));
        if (d === 1) stepTo(s, from, q); else kill(s, q);
        break;
      }
      case 'c4': case 'c7': kill(s, cl[0]); break;
      case 'g4': {
        let pos = from;
        for (const q of cl) pos = pushLine(s, pos, (q >> 3) - (pos >> 3), (q & 7) - (pos & 7), true);
        break;
      }
      case 'g6': {
        const r = from >> 3, c = from & 7;
        for (const [dr, dc] of D8) { if (!inb(r + dr, c + dc)) continue; const z = (r + dr) * 8 + c + dc; if (s.b[z] > 0 && own(s.b[z]) === opp) kill(s, z); }
        break;
      }
      case 'c6': s.mana[p] += 25; break;
      case 'ma': {
        const zone = cl[0] === 'bord' ? BORDER : CENTER;
        for (const z of zone) if (s.b[z] > 0 && own(s.b[z]) === opp) kill(s, z);
        break;
      }
      case 'pb': for (const z of RING2) if (s.b[z] > 0 && own(s.b[z]) === opp) kill(s, z); break;
      case 'mb': { const x = s.b[cl[0]]; s.b[cl[0]] = s.b[cl[1]]; s.b[cl[1]] = x; break; }
      case 'mc': s.b[cl[1]] = s.b[cl[0]]; s.b[cl[0]] = 0; break;
      case 'md': {
        stepTo(s, cl[0], cl[1]);
        if (cl.length > 2) stepTo(s, cl[2], cl[3]);
        break;
      }
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
  function placeFree(s, a) { return s.ev === 'noir' && a.k === 'pla' && isDark(a.to); }

  function gen(s, full) {
    if (s.winner !== null) return [];
    const p = s.turn, out = [];
    if (s.phase === 'draft') {
      if (s.ev === 'cache') { out.push({ k: 'pioche' }); return out; }
      for (let i = 0; i < NT; i++) if (s.pool[i] > 0) out.push({ k: 'draft', t: i });
      return out;
    }
    if (s.phase === 'decl') {
      out.push({ k: 'decl', d: { k: 'rec' } }, { k: 'decl', d: { k: 'pla' } });
      for (let q = 0; q < 64; q++) if (s.b[q] > 0 && own(s.b[q]) === p) out.push({ k: 'decl', d: { k: 'act', from: q } });
      return out;
    }
    if (s.phase !== 'draft') for (let i = 0; i < NT; i++) if (s.pool[i] > 0) out.push({ k: 'rec', t: i });
    if (!s.noPlace[p]) {
      const he = homeEmpty(s, p);
      for (let i = 0; i < NT; i++) if (s.res[p][i] > 0) for (const q of he) out.push({ k: 'pla', t: i, to: q });
    }
    if (!s.noAct[p]) for (let q = 0; q < 64; q++) {
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
      if (a.k === 'pioche') {
        if (t === undefined) {
          let n = 0; for (let i = 0; i < NT; i++) n += s.pool[i];
          let r = Math.floor(Math.random() * n);
          for (let i = 0; i < NT; i++) { r -= s.pool[i]; if (r < 0) { t = i; break; } }
          a.t = t;
        }
      }
      s.pool[t]--;
      s.res[(s.ev === 'inverse') ? 1 - p : p][t]++;
      let left = 0; for (let i = 0; i < NT; i++) left += s.pool[i];
      s.turn = 1 - p;
      if (!left) { s.phase = 'play'; s.turn = s.first0; }
      return s;
    }
    if (a.k === 'decl') {
      s._newDecl = a.d; s.phase = 'play';
      endTurn(s);
      return s;
    }
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

  // ---------- Évaluation ----------
  const WIN = 100000;
  const GPRESS = [0, 2.5, 6, 12, 20, 30, 45];
  function evalS(s, p) {
    if (s.winner !== null) return s.winner === 2 ? 0 : (s.winner === p ? WIN : -WIN);
    let sc = 0;
    const onB = [0, 0], mpos = [[], []];
    for (let q = 0; q < 64; q++) { const c = s.b[q]; if (c > 0 && T[tix(c)].cat === 'M') { onB[own(c)]++; mpos[own(c)].push(q); } }
    for (let q = 0; q < 64; q++) {
      const c = s.b[q]; if (c <= 0) continue;
      const o = own(c), t = T[tix(c)];
      let v = t.val;
      const r = q >> 3, cc = q & 7;
      if (t.cat === 'M') {
        v += Math.min(s.mana[o], 80) / 40; // un mage sans mana sert peu
      } else {
        if (t.cat === 'S') v += (o === 0 ? 7 - r : r) * 0.06;
        else v += (3.5 - Math.abs(3.5 - r)) * 0.05 + (3.5 - Math.abs(3.5 - cc)) * 0.05;
        // se rapprocher des dieux adverses
        let md = 8;
        for (const m of mpos[1 - o]) md = Math.min(md, Math.max(Math.abs((m >> 3) - r), Math.abs((m & 7) - cc)));
        if (md < 8) v += (7 - md) * (t.cat === 'G' ? 0.07 : 0.04);
      }
      sc += o === p ? v : -v;
    }
    for (let i = 0; i < NT; i++) {
      const t = T[i];
      const f = t.cat === 'M' ? 0.75 : 0.8;
      sc += (s.res[p][i] - s.res[1 - p][i]) * t.val * f;
    }
    sc += (s.mana[p] - s.mana[1 - p]) * 0.05;
    const gp = l => GPRESS[Math.min(l, 6)];
    sc += gp(s.lost[1 - p][1]) - gp(s.lost[p][1]);
    if (s.ev === 'illimite') sc += (s.lost[1 - p][0] - s.lost[p][0]) * 12;
    else {
      // danger « tous les dieux » : moins il en reste, plus chacun compte
      const danger = q => {
        const am = aliveMages(s, q);
        if (am === 0 && s.lost[q][0] === 0) return 0; // aucun dieu engagé : immunisé
        if (am === 1) return onB[q] ? 12 : 5;
        if (am === 2) return onB[q] === 2 ? 4 : 1.5;
        return 0;
      };
      sc += danger(1 - p) - danger(p);
    }
    if (s.noAct[1 - p]) sc += 1.5 * s.noAct[1 - p];
    if (s.noAct[p]) sc -= 1.5 * s.noAct[p];
    return sc;
  }

  // ---------- Bot ----------
  function child(s, a) { return apply(clone(s), a); }
  function scoreFor(c, p) { return evalS(c, p); }

  function draftPick(s, level) {
    const acts = gen(s, false);
    if (acts[0].k === 'pioche') return acts[0];
    const p = s.turn;
    const inv = s.ev === 'inverse';
    let best = null, bv = -1e9;
    for (const a of acts) {
      const t = T[a.t];
      let v = t.val + (t.cat === 'M' ? 2 : 0);
      if (inv) v = -v; // je donne le plus faible
      if (level === 'facile') v += Math.random() * 6;
      if (v > bv) { bv = v; best = a; }
    }
    return best;
  }

  function think(s0, level, budget) {
    const s = clone(s0); s.declOn = false; s.phase = s0.phase === 'decl' ? 'play' : s0.phase;
    const p = s.turn;
    if (s0.phase === 'draft') return draftPick(s0, level);
    if (s0.phase === 'decl') return chooseDecl(s0, level);
    const acts = gen(s, false);
    if (acts.length === 1) return acts[0];
    // tri statique des coups
    const kids = acts.map(a => { const c = child(s, a); return { a, c, v: scoreFor(c, p) }; });
    kids.sort((x, y) => y.v - x.v);
    if (level === 'facile') {
      if (Math.random() < 0.35) return acts[Math.floor(Math.random() * acts.length)];
      let best = null, bv = -1e9;
      for (const k of kids) { const v = k.v + (Math.random() - 0.5) * 6; if (v > bv) { bv = v; best = k.a; } }
      return best;
    }
    const deadline = Date.now() + (budget || (level === 'normal' ? 700 : 2600));
    const maxD = level === 'normal' ? 2 : 6;
    const rootBeam = level === 'normal' ? 30 : 36;
    const innerBeam = level === 'normal' ? 14 : 16;
    if (kids[0].v >= WIN / 2) return kids[0].a;
    let order = kids.slice(0, rootBeam);
    let bestA = order[0].a;
    const ABORT = {};
    function nega(st, depth, alpha, beta) {
      if (st.winner !== null) return st.winner === 2 ? 0 : (st.winner === st.turn ? WIN - st.ply : -WIN + st.ply);
      if (depth === 0) return evalS(st, st.turn);
      if (Date.now() > deadline) throw ABORT;
      const me = st.turn;
      const as = gen(st, false);
      let cs;
      if (depth >= 2) {
        cs = as.map(a => { const c = child(st, a); return { c, v: evalS(c, me) }; });
        cs.sort((x, y) => y.v - x.v);
        if (cs.length > innerBeam) cs.length = innerBeam;
      } else {
        // feuille au prochain niveau : on évalue tout
        let best = -Infinity;
        for (const a of as) {
          const c = child(st, a);
          const v = c.turn === me ? evalS(c, me) : -evalS(c, c.turn);
          if (v > best) { best = v; if (best > alpha) alpha = best; if (alpha >= beta) break; }
        }
        return best;
      }
      let best = -Infinity;
      for (const { c } of cs) {
        const v = c.turn === me ? nega(c, depth - 1, alpha, beta) : -nega(c, depth - 1, -beta, -alpha);
        if (v > best) { best = v; if (best > alpha) alpha = best; if (alpha >= beta) break; }
      }
      return best;
    }
    for (let d = 1; d <= maxD; d++) {
      const scored = [];
      try {
        let alpha = -Infinity;
        for (const k of order) {
          const v = k.c.turn === p ? nega(k.c, d - 1, alpha, Infinity) : -nega(k.c, d - 1, -Infinity, -alpha);
          scored.push({ k, v });
          if (v > alpha) alpha = v;
        }
      } catch (e) { if (e !== ABORT) throw e; break; }
      scored.sort((x, y) => y.v - x.v);
      if (level === 'normal') {
        let bv = -1e9;
        for (const x of scored) { const v = x.v + (Math.random() - 0.5) * 1.2; if (v > bv) { bv = v; bestA = x.k.a; } }
      } else bestA = scored[0].k.a;
      order = scored.map(x => x.k);
      if (scored[0].v >= WIN / 2) break;
      if (Date.now() > deadline) break;
    }
    return bestA;
  }

  // annonce : ce que le bot ferait s'il rejouait tout de suite
  function chooseDecl(s0, level) {
    const s = clone(s0); s.phase = 'play'; s.declOn = false; s.decl = [null, null]; s.acts = 1;
    const p = s.turn;
    const acts = gen(s, false);
    let best = acts[0], bv = -1e9;
    for (const a of acts) { const v = evalS(child(s, a), p) + (level === 'facile' ? Math.random() * 4 : 0); if (v > bv) { bv = v; best = a; } }
    let d;
    if (best.k === 'act') d = { k: 'act', from: best.from };
    else if (best.k === 'pla') d = { k: 'pla' };
    else d = { k: 'rec' };
    return { k: 'decl', d };
  }

  return {
    T, NT, TI, EVENTS, BORDER, CENTER, RING2,
    own, tix, enc, isHome, isDark, newGame, clone, gen, genAct, apply, think, evalS, aliveMages, placeFree, loses,
  };
}
