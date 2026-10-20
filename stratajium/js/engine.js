/* Stratajium — moteur de règles + bot.
   Tout est dans une seule fonction pour pouvoir aussi tourner dans un Web Worker
   (créé depuis le texte de cette fonction : marche aussi hors serveur). */
function StratEngine() {
  'use strict';

  // ---------- Persos ----------
  // cat : M = mage (dieu / Primage), G = garde (guerrier / Champion), S = soldat (simple)
  // Seuls les soldats ont un sens (ils avancent vers l'adversaire) ; tous les autres vont dans tous les sens.
  const T = [
    // Dieux (mages) : ne bougent pas, lancent un sort qui coûte du mana
    { id: 'ma', cat: 'M', sym: 'a', name: 'Orage', cost: 80, val: 7, desc: 'Foudroie un bord de la carte au choix (haut, bas, gauche ou droite) OU le centre : les 2 ennemis les plus précieux qui s’y trouvent meurent.' },
    { id: 'mb', cat: 'M', sym: 'b', name: 'Échangeur', cost: 40, val: 6, desc: 'Fait échanger de place 2 persos de la carte (n’importe lesquels).' },
    { id: 'mc', cat: 'M', sym: 'c', name: 'Marionnettiste', cost: 45, val: 6, desc: 'Déplace un garde adverse n’importe où, sur une case vide.' },
    { id: 'md', cat: 'M', sym: 'd', name: 'Commandant', cost: 15, val: 5.5, desc: 'Fait faire un pas à 2 de tes persos (pas droit sur une case vide, ou prise en diagonale). Les soldats ne vont que vers l’avant.' },
    { id: 'me', cat: 'M', sym: 'e', name: 'Recruteur', cost: 15, val: 5.5, desc: 'Recrute 2 persos d’un coup dans la réserve commune.' },
    { id: 'pa', cat: 'M', sym: 'f', name: 'Maître du temps', cost: 60, val: 6, desc: 'Tu rejoues 2 fois : 2 actions de plus ce tour-ci.' },
    { id: 'pb', cat: 'M', sym: 'g', name: 'Séisme', cost: 70, val: 6.5, desc: 'Fait trembler la 2e ligne d’un bord au choix (haut, bas, gauche ou droite) : les 2 ennemis les plus précieux qui s’y trouvent meurent.' },
    { id: 'pc', cat: 'M', sym: 'h', name: 'Tambour de guerre', cost: 15, val: 5, desc: 'Un de tes soldats avance 2 fois (comme un pion).' },
    { id: 'pd', cat: 'M', sym: 'i', name: 'Sergent', cost: 20, val: 5, desc: 'Recrute un soldat et le pose directement dans ta zone de placement.' },
    { id: 'pe', cat: 'M', sym: 'j', name: 'Geôlier', cost: 30, val: 5.5, desc: 'L’adversaire ne peut plus placer de perso pendant ses 3 prochains tours.' },
    { id: 'pf', cat: 'M', sym: 'k', name: 'Silence', cost: 45, val: 6, desc: 'L’adversaire ne peut plus activer de perso pendant ses 2 prochains tours.' },
    { id: 'pg', cat: 'M', sym: 'l', name: 'Martyr', cost: 20, val: 5, desc: 'Au début de ton prochain tour : +40 mana pour chacun de tes persos morts.' },
    // Gardes : se déplacent dans tous les sens
    { id: 'g1', cat: 'G', sym: '1', name: 'Jumeau', val: 3.2, desc: 'Échange sa place avec n’importe quel perso de la carte (allié ou adverse, même un dieu).' },
    { id: 'g2', cat: 'G', sym: '2', name: 'Tour', val: 4.5, desc: 'Avance en ligne droite d’autant de cases que voulu (comme la tour aux échecs) ; prend en arrivant sur un ennemi.' },
    { id: 'g3', cat: 'G', sym: '3', name: 'Archer', val: 4.2, desc: 'Tire en diagonale : tue le 1er ennemi de la diagonale sans bouger. Ou fait 1 pas en diagonale.' },
    { id: 'g4', cat: 'G', sym: '4', name: 'Bélier', val: 4.2, desc: 'Avance d’1 case dans les 8 directions en poussant toute la file devant lui (un perso poussé hors de la carte ou dans un trou meurt), puis peut faire un 2e pas vers une case vide.' },
    { id: 'g5', cat: 'G', sym: '5', name: 'Éclaireur', val: 3.4, desc: '2 fois de suite : un pas droit (haut, bas, gauche, droite) sur une case vide, ou une prise en diagonale.' },
    { id: 'g6', cat: 'G', sym: '6', name: 'Tourbillon', val: 3.8, desc: 'Frappe toutes les cases autour de lui : tous les ennemis collés meurent.' },
    { id: 'g7', cat: 'G', sym: '7', name: 'Danseur', val: 3.6, desc: 'Fait 2 pas en diagonale (il peut prendre à chaque pas).' },
    { id: 'c1', cat: 'G', sym: '8', name: 'Sauteur', val: 3.6, desc: 'Saute par-dessus tout : à 2 cases en diagonale, ou à 2 ou 3 cases en ligne droite.' },
    { id: 'c2', cat: 'G', sym: '9', name: 'Fou', val: 4, desc: 'Avance en diagonale d’autant de cases que voulu (comme le fou aux échecs).' },
    { id: 'c3', cat: 'G', sym: '10', name: 'Ombre', val: 3.4, desc: 'Se téléporte sur une case collée à un soldat (n’importe lequel).' },
    { id: 'c4', cat: 'G', sym: '11', name: 'Arbalétrier', val: 4.3, desc: 'Tire en diagonale : tue le 1er ennemi de la diagonale sans bouger.' },
    { id: 'c5', cat: 'G', sym: '12', name: 'Comète', val: 3.4, desc: 'Se pose sur n’importe quelle case à plus de 5 cases (en comptant lignes + colonnes) ; elle peut y prendre un garde ou un soldat, jamais un dieu.' },
    { id: 'c6', cat: 'G', sym: '13', name: 'Alchimiste', val: 3, desc: 'Te fait gagner 40 mana, et tu rejoues tout de suite (une action de plus).' },
    { id: 'c7', cat: 'G', sym: '14', name: 'Baliste', val: 4.6, desc: 'Tire en ligne droite sans bouger : tue le 1er ennemi de la ligne, et transperce jusqu’au suivant.' },
    { id: 'c8', cat: 'G', sym: '15', name: 'Grenouille', val: 3.4, desc: 'Fait 1 pas, ou saute par-dessus toute une file de persos collés.' },
    // Soldat
    { id: 's', cat: 'S', sym: '•', name: 'Soldat', val: 1, desc: 'Avance d’1 case vers l’adversaire, prend en diagonale vers l’avant. Rien d’autre.' },
    // nouveaux
    { id: 'gu', cat: 'M', sym: 'm', name: 'Guérisseur', cost: 45, val: 5.5, desc: 'Ramène à la vie un de tes gardes morts et le pose dans ta zone de placement (il ne compte plus comme mort).' },
    { id: 'dr', cat: 'M', sym: 'n', name: 'Druide', cost: 20, val: 5, desc: 'Fait pousser des ronces sur 1 ou 2 cases vides (hors zones de placement) : elles bloquent pour toujours.' },
    { id: 'pr', cat: 'M', sym: 'o', name: 'Protecteur', cost: 25, val: 5.5, desc: 'Bénit la case d’un de tes persos : rien ne peut y mourir jusqu’à ton prochain tour.' },
    { id: 'lc', cat: 'G', sym: '16', name: 'Lancier', val: 3.8, desc: 'Frappe les 3 cases devant lui en ligne droite (haut, bas, gauche ou droite), sans bouger.' },
    { id: 'cv', cat: 'G', sym: '17', name: 'Cavalier', val: 3.6, desc: 'Saute en L comme le cavalier aux échecs, par-dessus tout.' },
    { id: 'gd', cat: 'G', sym: '18', name: 'Gardien', val: 3.2, desc: 'Fait 1 pas dans n’importe quelle direction (comme le roi aux échecs).' },
    // boss (un affrontement sur 10) : ils agissent tout seuls à la fin du tour de leur camp
    { id: 'bt', cat: 'B', sym: 'T', name: 'Titan de pierre', val: 14, hp: 4, desc: 'Boss, 4 points de vie. À la fin de chaque tour de son camp, il avance d’une case vers ton perso le plus proche ; un tour sur deux, il écrase un de tes persos collés à lui.' },
    { id: 'bn', cat: 'B', sym: 'N', name: 'Nécromancienne', val: 14, hp: 3, desc: 'Boss, 3 points de vie. À la fin de chaque tour de son camp, elle fait sortir de terre un sbire à côté d’elle (5 au plus) ; un tour sur deux, elle te vole 15 mana.' },
    { id: 'bd', cat: 'B', sym: 'D', name: 'Dragon', val: 14, hp: 4, desc: 'Boss, 4 points de vie. Un tour sur deux, il crache du feu en ligne droite : les 2 premiers de tes persos sur cette ligne (4 cases) meurent.' },
    { id: 'mi', cat: 'S', sym: 's', name: 'Sbire', val: 1.2, desc: 'Serviteur du boss : fait 1 pas dans n’importe quelle direction et prend en arrivant sur un ennemi.' },
  ];
  const BOSSES = ['bt', 'bn', 'bd'];
  const NT = T.length;
  const TI = {}; T.forEach((t, i) => { TI[t.id] = i; t.i = i; });
  const BASE_M = ['ma', 'mb', 'mc', 'md', 'me'];
  const BASE_G = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7'];
  const EXT_M = ['pa', 'pb', 'pc', 'pd', 'pe', 'pf', 'pg', 'gu', 'dr', 'pr'];
  const EXT_G = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'lc', 'cv', 'gd'];
  const ALL_M = BASE_M.concat(EXT_M), ALL_G = BASE_G.concat(EXT_G);
  // une partie commence avec ces 3 dieux et ces 4 gardes ; les autres se débloquent en gagnant
  const START_M = ['ma', 'mc', 'md'], START_G = ['g2', 'g3', 'g5', 'g7'];
  const S_I = TI.s, MA_I = TI.ma, PB_I = TI.pb;
  const IS_M = T.map(t => t.cat === 'M'), MAGE_T = T.filter(t => t.cat === 'M').map(t => t.i);
  const CATB = T.map(t => t.cat === 'B');
  const VAL = Float64Array.from(T, t => t.val), COST = Int16Array.from(T, t => t.cost || 0), CATN = Int8Array.from(T, t => t.cat === 'M' ? 0 : t.cat === 'G' ? 1 : 2);

  // ---------- Événements ----------
  const EVENTS = [
    { id: 'inverse', name: 'Draft inversé', desc: 'Avant l’affrontement, on se partage TOUTE la réserve chacun son tour… mais le perso que tu choisis va à ton adversaire. Plus de recrutement ensuite.' },
    { id: 'cache', name: 'Draft caché', desc: 'Avant l’affrontement, on pioche chacun son tour, face cachée, toute la réserve. Tu ne vois pas les persos que l’adversaire n’a pas encore posés. Plus de recrutement ensuite.' },
    { id: 'illimite', name: 'Réserve infinie', desc: 'La réserve commune ne se vide jamais. Pour gagner il faut tuer 2 dieux ou 6 gardes.' },
    { id: 'noir', name: 'Cases noires', desc: 'Placer un perso sur une case noire ne coûte pas ton action : tu joues encore après.' },
    { id: 'extension', name: 'Invités surprise', desc: '2 dieux et 2 sortes de gardes en plus, tirés au hasard, rejoignent la réserve pour cet affrontement.' },
    { id: 'pari', name: 'Le pari', desc: 'Avant l’affrontement, pariez sur le joueur qui perdra en premier un dieu ou 2 gardes. Bon pari : +35 mana, mauvais : −35.' },
    { id: 'annonce', name: 'Annonce', desc: 'À la fin de ton tour, tu dois annoncer ta prochaine action (recruter, placer, ou quel perso activer). Tu seras obligé de la faire.' },
    { id: 'murs', name: 'Murs de morts', desc: 'Un perso mort est retourné et bloque la case pour toujours. Celui qui prend en se déplaçant reste donc devant.' },
    { id: 'abondance', name: 'Mana abondant', desc: 'Chaque joueur commence avec 200 mana au lieu de 100.' },
    { id: 'avantgarde', name: 'Avant-garde', desc: 'Chaque joueur commence avec 2 soldats déjà posés dans sa zone.' },
    { id: 'maree', name: 'Marée de mana', desc: 'Au début de chacun de tes tours, tu gagnes 10 mana.' },
    { id: 'fragile', name: 'Sol fragile', desc: 'Là où un perso meurt, le sol s’effondre : la case devient un trou pour toujours.' },
    { id: 'objectif', name: 'Objectif mystère', weight: 3, desc: 'Le but de l’affrontement est tiré au sort et remplace le but habituel (voir les objectifs). Cet événement tombe 3 fois plus souvent que les autres.' },
  ];
  // buts possibles de l'« Objectif mystère » ; au bout de 60 tours chacun (30 pour l'Endurance), celui qui a perdu le moins de persos gagne
  const GOALS = [
    { id: 'colline', name: 'Roi de la colline', desc: 'Au début de ton tour, si tu es le seul à avoir un perso au centre, tu marques 1 point. Le premier à 3 points gagne.' },
    { id: 'massacre', name: 'Massacre', desc: 'Le premier à tuer 5 persos adverses (n’importe lesquels) gagne.' },
    { id: 'chasse', name: 'Chasse au dieu', desc: 'Le premier à tuer un dieu adverse gagne.' },
    { id: 'percee', name: 'Percée', desc: 'Le premier à amener un garde ou un soldat dans la zone de placement adverse gagne.' },
    { id: 'endurance', name: 'Endurance', desc: 'Après 30 tours chacun, celui qui a perdu le moins de persos gagne.' },
  ];
  const GOAL_LIMIT = { endurance: 60 }; // en demi-tours ; 120 pour les autres

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
  function buildGeo(W, H, ex, zone0, name, spec, info) {
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
    const side = [{}, {}];
    for (const k of [0, 1]) { side[k].haut = []; side[k].bas = []; side[k].gauche = []; side[k].droite = []; }
    for (let c = 0; c < W; c++) {
      const col = []; for (let r = 0; r < H; r++) if (ex[r * W + c]) col.push(r * W + c);
      for (const k of [0, 1]) { if (col.length > k) side[k].haut.push(col[k]); if (col.length > k) side[k].bas.push(col[col.length - 1 - k]); }
    }
    for (let r = 0; r < H; r++) {
      const row = []; for (let c = 0; c < W; c++) if (ex[r * W + c]) row.push(r * W + c);
      for (const k of [0, 1]) { if (row.length > k) side[k].gauche.push(row[k]); if (row.length > k) side[k].droite.push(row[row.length - 1 - k]); }
    }
    const zl = [[], []]; for (let q = 0; q < N; q++) { if (zone[0][q]) zl[0].push(q); if (zone[1][q]) zl[1].push(q); }
    return { W, H, N, ex, zone, zl, border, ring2, center, mv, name, nCells, side, spec: spec || new Uint8Array(N), info: info || null };
  }

  const SIDES = ['haut', 'bas', 'gauche', 'droite'];
  // cases touchées par un sort de zone (Orage : un côté ou le centre ; Séisme : la 2e ligne d'un côté)
  function areaOf(g, id, opt) {
    if (id === 'ma') return opt === 'centre' ? g.center : g.side[0][opt] || [];
    if (id === 'pb') return g.side[1][opt] || [];
    return [];
  }
  // les 2 ennemis les plus précieux d'une zone (dieux d'abord) : un sort de zone n'en tue pas plus
  function zoneVictims(s, sqs, p) {
    const v = sqs.filter(q => foe(s, q, p) && !cover(s, q));
    if (v.length <= 2) return v;
    v.sort((x, y) => (CATN[tix(s.b[x])] - CATN[tix(s.b[y])]) || (VAL[tix(s.b[y])] - VAL[tix(s.b[x])]));
    return v.slice(0, 2);
  }
  function classicMap() {
    const ex = new Uint8Array(64).fill(1), z = [];
    for (let q = 48; q < 64; q++) z.push(q);
    return buildGeo(8, 8, ex, z, 'Classique 8×8', null, { kinds: ['classique'], zk: 'rangees' });
  }

  // les cartes : [id, nom, niveau de sauvagerie minimum, description]
  const MAPS = [
    ['classique', 'Classique', 0, 'Le plateau 8×8 des échecs, zones sur les 2 rangées du fond.'],
    ['plaine', 'Plaine', 1, 'Un rectangle sans trou, de 6 à 10 cases de large.'],
    ['coins', 'Coins coupés', 2, 'Les 4 coins sont rognés.'],
    ['croix', 'Croix', 2, 'Des rectangles retirés aux 4 coins : la carte forme une croix.'],
    ['losange', 'Losange', 2, 'Les bords sont taillés en biais : plus large au milieu.'],
    ['dentele', 'Dentelée', 2, 'Des cases manquent au hasard le long des bords.'],
    ['arene', 'Arène', 2, 'Un octogone aux coins très coupés.'],
    ['trous', 'Trouée', 3, 'Quelques trous isolés au milieu de la carte.'],
    ['lacs', 'Lacs', 3, 'Deux petits lacs face à face.'],
    ['anneau', 'Anneau', 3, 'Le centre est un trou : on se bat autour.'],
    ['sablier', 'Sablier', 3, 'La carte se resserre au milieu.'],
    ['riviere', 'Rivière', 3, 'Une rivière coupe la carte en deux, avec deux gués pour passer.'],
    ['colonnes', 'Colonnes', 3, 'Des piliers (trous d’une case) en quadrillage.'],
    ['iles', 'Deux îles', 4, 'Deux grandes îles reliées par deux ponts.'],
    ['escalier', 'Escalier', 4, 'Des trous en diagonale, comme les marches d’un escalier.'],
    ['couloirs', 'Couloirs', 4, 'Deux longs murs de trous avec un passage chacun.'],
    ['etoile', 'Étoile', 4, 'Une étoile à 4 branches.'],
  ];
  const MAP_NAME = {}; for (const m of MAPS) MAP_NAME[m[0]] = m[1];
  const ZONES = {
    rangees: 'rangées du fond', flancs: 'flancs', eparpille: 'éparpillée', pointe: 'en pointe', damier: 'en damier', centre: 'au centre',
  };
  // cases spéciales (peu nombreuses, surtout sur les cartes sauvages)
  const SPECIALS = [
    null,
    { id: 'source', name: 'Source de mana', desc: 'Au début de ton tour, si un de tes persos est dessus : +10 mana.' },
    { id: 'bosquet', name: 'Bosquet', desc: 'Un perso dessus est à couvert : ni les tirs (Archer, Arbalétrier, Baliste, Lancier) ni les sorts de zone ne peuvent le tuer.' },
  ];
  const SHAPES = MAP_NAME;
  function randomMap(level) {
    if (level === undefined) level = 4;
    for (let tries = 0; tries < 300; tries++) {
      const W = 6 + rnd(5), H = 7 + rnd(4), N = W * H;
      const ex = new Uint8Array(N).fill(1);
      const off = (r, c) => { if (r >= 0 && r < H && c >= 0 && c < W) { ex[r * W + c] = 0; ex[N - 1 - (r * W + c)] = 0; } };
      const cr = (H - 1) / 2, cc = (W - 1) / 2;
      const kinds = MAPS.filter(m => m[2] >= 1 && m[2] <= Math.max(1, level)).map(m => m[0]);
      const shapes = [kinds[rnd(kinds.length)]];
      if (level >= 4 && Math.random() < .3) { const o = kinds.filter(k => k !== 'plaine' && k !== shapes[0]); shapes.push(o[rnd(o.length)]); }
      // bande horizontale au milieu (rivière, îles) : vide sauf deux passages face à face
      const band = (thick) => {
        const rows = H % 2 ? [] : [];
        if (H % 2) { const m = (H - 1) / 2; for (let k = -(thick >> 1); k <= (thick >> 1); k++) rows.push(m + k); }
        else { const m = H / 2; for (let k = 0; k < Math.max(1, thick >> 1); k++) { rows.push(m - 1 - k); rows.push(m + k); } }
        const f = 1 + rnd(Math.max(1, W - 2)), fords = new Set([f, W - 1 - f]);
        for (const r of rows) for (let c = 0; c < W; c++) if (!fords.has(c)) ex[r * W + c] = 0;
      };
      for (const k of shapes) {
        if (k === 'coins') { const n = 1 + rnd(2); for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (r + c < n || r + (W - 1 - c) < n) off(r, c); }
        if (k === 'arene') { const n = 2 + rnd(2); for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (r + c < n || r + (W - 1 - c) < n) off(r, c); }
        if (k === 'trous') { const n = 1 + rnd(3); for (let i = 0; i < n; i++) off(2 + rnd(Math.max(1, H - 4)), rnd(W)); }
        if (k === 'losange') { const lim = 1.2 + Math.random() * .25; for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (Math.abs(r - cr) / (H / 2) + Math.abs(c - cc) / (W / 2) > lim) off(r, c); }
        if (k === 'etoile') { for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (Math.abs(r - cr) > 1.1 && Math.abs(c - cc) > 1.1 && Math.abs(r - cr) / (H / 2) + Math.abs(c - cc) / (W / 2) > 1) off(r, c); }
        if (k === 'croix') { const a = 1 + rnd(2), b2 = 1 + rnd(2); for (let r = 0; r < a; r++) for (let c = 0; c < b2; c++) { off(r, c); off(r, W - 1 - c); } }
        if (k === 'anneau') { for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (Math.abs(r - cr) < 1 && Math.abs(c - cc) < (W > 7 ? 1.6 : 1)) off(r, c); }
        if (k === 'lacs') { const r = 2 + rnd(Math.max(1, Math.floor(cr) - 1)), c = rnd(W); off(r, c); const d = D8[rnd(8)]; off(r + d[0], c + d[1]); }
        if (k === 'dentele') { for (let c = 0; c < W; c++) if (Math.random() < .35) off(0, c); for (let r = 2; r < H - 2; r++) if (Math.random() < .25) off(r, 0); }
        if (k === 'sablier') { const kk = W > 7 ? 2 : 1; for (let r = 0; r < H; r++) if (Math.abs(r - cr) <= 1) for (let c = 0; c < kk; c++) { off(r, c); off(r, W - 1 - c); } }
        if (k === 'riviere') band(1);
        if (k === 'iles') band(H >= 9 ? 3 : 2);
        if (k === 'colonnes') { for (let r = 2; r < H - 2; r++) for (let c = 1; c < W - 1; c++) if (r % 3 === 2 && c % 3 === 1) off(r, c); }
        if (k === 'escalier') { for (let r = 2; r < H - 2; r++) for (let c = 1; c < W - 1; c++) if ((c - r + 40) % 4 === 0 && Math.random() < .7) off(r, c); }
        if (k === 'couloirs') { if (W < 8) { off(2, 1); continue; } const gap = 2 + rnd(Math.max(1, H - 4)); for (let r = 1; r < H - 1; r++) if (r !== gap) off(r, 2); }
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
      const zk = level <= 1 ? 'rangees' : level === 2 ? ['rangees', 'flancs', 'centre'][rnd(3)] : Object.keys(ZONES)[rnd(6)];
      const back = []; for (let r = H - 1; r >= 0; r--) { let any = false; for (let c = 0; c < W; c++) if (ex[r * W + c]) any = true; if (any) back.push(r); }
      const rows = back.slice(0, 4);
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
      // cases spéciales, par paires symétriques, loin des zones de placement
      const spec = new Uint8Array(N);
      const pairs = level <= 1 ? 0 : level === 2 ? rnd(2) : level === 3 ? 1 : 1 + rnd(2);
      const zs = new Set(z.concat(z.map(q => N - 1 - q)));
      for (let i = 0, t = 0; i < pairs && t < 60; t++) {
        const q = rnd(N), m = N - 1 - q, r = q / W | 0;
        if (!ex[q] || q === m || spec[q] || zs.has(q) || zs.has(m)) continue;
        if (Math.abs(r - cr) > H / 2 - 2) continue;
        spec[q] = spec[m] = 1 + rnd(2); i++;
      }
      const name = `${shapes.map(k => MAP_NAME[k]).join(' + ')} ${W}×${H}, zones ${ZONES[zk]}`;
      return buildGeo(W, H, ex, z, name, spec, { kinds: shapes, zk });
    }
    return classicMap();
  }
  function makeMap(kind, level) { if (kind === 'classique' || level === 0) return classicMap(); return randomMap(level); }
  // tirages reproductibles (défi du jour) : Math.random est remplacé le temps de fn
  function withSeed(seed, fn) {
    let v = (seed >>> 0) % 2147483647 || 1;
    const old = Math.random;
    Math.random = () => { v = (v * 16807) % 2147483647; return (v - 1) / 2147483646; };
    try { return fn(); } finally { Math.random = old; }
  }

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
      mana: ev === 'abondance' ? [200, 200] : [100, 100],
      lost: [[0, 0, 0], [0, 0, 0]], // morts par joueur : dieux, gardes, soldats
      dead: [new Int16Array(NT), new Int16Array(NT)], // morts par type (pour le Guérisseur)
      bl: [-1, -1], // case bénie par chaque joueur (Protecteur)
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
      goal: ev === 'objectif' ? (o.goal || GOALS[rnd(GOALS.length)].id) : null, hold: [0, 0],
      boss: null,
    };
    if (o.mana) s.mana = o.mana.slice();
    let mages = o.gods || BASE_M, gards = o.gards || BASE_G;
    if (ev === 'extension') {
      // invités surprise : 2 dieux et 2 sortes de gardes de plus, au hasard
      mages = mages.concat(shuffle(ALL_M.filter(x => !mages.includes(x))).slice(0, 2));
      gards = gards.concat(shuffle(ALL_G.filter(x => !gards.includes(x))).slice(0, 2));
    }
    if (ev === 'illimite') {
      for (const id of mages.concat(gards)) s.pool[TI[id]] = 99;
      s.pool[S_I] = 99;
    } else {
      for (const id of mages) s.pool[TI[id]] += 1;
      for (const id of gards) s.pool[TI[id]] += 2;
      s.pool[S_I] = 8;
    }
    if (o.boss) placeBoss(s, o.boss);
    if (ev === 'avantgarde') for (const p of [0, 1]) {
      const z = shuffle(homeEmpty(s, p)).slice(0, 2);
      for (const q of z) s.b[q] = enc(S_I, p);
    }
    return s;
  }

  function clone(s) {
    return {
      g: s.g, b: s.b.slice(), pool: s.pool.slice(), res: [s.res[0].slice(), s.res[1].slice()],
      mana: s.mana.slice(), lost: [s.lost[0].slice(), s.lost[1].slice()],
      dead: s.dead ? [s.dead[0].slice(), s.dead[1].slice()] : null, bl: s.bl ? s.bl.slice() : [-1, -1],
      turn: s.turn, acts: s.acts, noPlace: s.noPlace.slice(), noAct: s.noAct.slice(), pend: s.pend.slice(),
      decl: s.decl.slice(), ev: s.ev, declOn: s.declOn, phase: s.phase, bet: s.bet, betDone: s.betDone,
      winner: s.winner, why: s.why, ply: s.ply, quiet: s.quiet, last: s.last, first0: s.first0, betLoser: s.betLoser, goal: s.goal, hold: s.hold ? s.hold.slice() : [0, 0], boss: s.boss ? Object.assign({}, s.boss) : null,
      _k: 0, _dead: null, _martyr: 0, _newDecl: s._newDecl || null, _h: 0, // forme fixe (plus rapide pour le bot)
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

  const isBl = (s, q) => !!s.bl && (s.bl[0] === q || s.bl[1] === q);
  const isBoss = (s, q) => !!s.boss && s.boss.hp > 0 && s.boss.q === q;
  function kill(s, q, wallOk) {
    const c = s.b[q];
    if (c <= 0 || isBl(s, q)) return; // case bénie : rien n'y meurt
    if (isBoss(s, q)) {
      s.boss.hp--; s._k = (s._k || 0) + 1; s.quiet = -1;
      if (s._hits) s._hits.push(q);
      if (s.boss.hp > 0) return;
      if (s._dead) s._dead.push(q);
      s.b[q] = 0;
      return;
    }
    const p = own(c), t = T[tix(c)];
    s.lost[p][catIdx(t.cat)]++;
    if (s.dead) s.dead[p][tix(c)]++;
    s.b[q] = wallOk === false ? 0 : s.ev === 'fragile' ? VOID : s.ev === 'murs' ? -1 : 0;
    s.quiet = -1;
    s._k = (s._k || 0) + 1;
    if (s._dead) s._dead.push(q);
  }

  // déplacement simple vers une case vide ou ennemie ; renvoie la nouvelle position
  function stepTo(s, from, to) {
    if (isBoss(s, to)) { kill(s, to); return from; } // on frappe le boss sans prendre sa place
    if (s.b[to] > 0) {
      kill(s, to);
      if (s.ev === 'murs') return from; // le mort bloque : l'attaquant reste devant
    }
    s.b[to] = s.b[from]; s.b[from] = 0;
    return to;
  }

  // ---------- Générateurs de mouvements ----------
  const nx = (g, q, d) => g.mv[d * g.N + q];
  // ennemi qu'on peut tuer (pas sur une case bénie)
  const foe = (s, q, p) => { const c = s.b[q]; return c > 0 && own(c) !== p && !isBl(s, q); };
  const cover = (s, q) => s.g.spec && s.g.spec[q] === 2; // bosquet
  const canLand = (s, q, p) => s.b[q] === 0 || foe(s, q, p);
  const mini = s => ({ g: s.g, b: s.b.slice(), ev: s.ev, lost: [[0, 0, 0], [0, 0, 0]], bl: s.bl });
  const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

  // pion : les soldats avancent vers l'adversaire, tous les autres vont dans tous les sens
  function pawnTargets(s, q, p) {
    const g = s.g, b = s.b, out = [];
    const soldier = b[q] > 0 && tix(b[q]) === S_I;
    const steps = soldier ? [p === 0 ? 1 : 6] : ORTH;
    const caps = soldier ? (p === 0 ? [0, 2] : [5, 7]) : DIAG;
    for (const d of steps) { const t = nx(g, q, d); if (t >= 0 && b[t] === 0) out.push(t); }
    for (const d of caps) { const t = nx(g, q, d); if (t >= 0 && foe(s, t, p)) out.push(t); }
    return out;
  }
  function slideTargets(s, q, p, dirs) {
    const g = s.g, b = s.b, out = [];
    for (const d of dirs) {
      let t = nx(g, q, d);
      while (t >= 0) {
        const c = b[t];
        if (c === 0) out.push(t);
        else { if (foe(s, t, p)) out.push(t); break; }
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
        if (c !== 0) { if (foe(s, t, p) && k >= minD && !cover(s, t)) out.push(t); break; }
        t = nx(g, t, d); k++;
      }
    }
    return out;
  }
  function stepTargets(s, q, p, dirs) {
    const out = [];
    for (const d of dirs) { const t = nx(s.g, q, d); if (t >= 0 && canLand(s, t, p)) out.push(t); }
    return out;
  }
  // poussée façon Abalone : renvoie la nouvelle position (ou -1 si impossible) ; ne modifie s que si doIt
  function pushLine(s, pos, d, doIt) {
    const g = s.g, b = s.b;
    const first = nx(g, pos, d);
    if (first < 0 || b[first] === VOID) return -1;
    const line = [];
    let t = first;
    while (t >= 0 && b[t] !== 0 && b[t] !== VOID) {
      if (b[t] === -1 || isBl(s, t) || isBoss(s, t)) return -1; // mur, perso béni ou boss : inamovible
      line.push(t); t = nx(g, t, d);
    }
    if (!doIt) return first;
    for (let i = line.length - 1; i >= 0; i--) {
      const q = line[i], to = nx(g, q, d);
      if (to < 0 || s.b[to] === VOID) { kill(s, q, false); s.b[q] = 0; } // poussé hors de la carte ou dans un trou
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
  const enemiesIn = (s, sqs, p) => sqs.some(q => foe(s, q, p));
  function homeEmpty(s, p) { const z = s.g.zone[p], out = []; for (let q = 0; q < s.g.N; q++) if (z[q] && s.b[q] === 0) out.push(q); return out; }
  function adjOf(s, q) { const out = []; for (const d of ALL) { const t = nx(s.g, q, d); if (t >= 0) out.push(t); } return out; }

  // séquences de clics possibles pour activer le perso en `from` (clic = case, ou chaîne pour un bouton)
  function genAct(s, from, full) {
    const g = s.g, b = s.b, c0 = b[from], p = own(c0), t = T[tix(c0)], out = [];
    const opp = 1 - p;
    if (t.cost && s.mana[p] < t.cost) return out;
    switch (t.id) {
      case 's': for (const q of pawnTargets(s, from, p)) out.push([q]); break;
      case 'g1': for (let q = 0; q < g.N; q++) if (q !== from && b[q] > 0 && !isBl(s, q) && !isBoss(s, q)) out.push([q]); break;
      case 'mi': for (const q of stepTargets(s, from, p, ALL)) out.push([q]); break;
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
          // 2e pas : seulement vers une case vide (seul le 1er pas pousse)
          for (const e of ALL) { const q2 = nx(g, q1, e); if (q2 >= 0 && s2.b[q2] === 0) out.push([q1, q2]); }
        }
        break;
      case 'g5': out.push(...multiStep(s, from, p, pawnTargets, 2)); break;
      case 'g6': if (adjOf(s, from).some(q => foe(s, q, p) && !cover(s, q))) out.push(['go']); break;
      case 'g7': out.push(...multiStep(s, from, p, (st, q, pp) => stepTargets(st, q, pp, DIAG), 2)); break;
      case 'c1': {
        const r = from / g.W | 0, c = from % g.W;
        for (const [dr, dc] of D8) for (const k of (dr && dc ? [2] : [2, 3])) {
          const rr = r + k * dr, cc = c + k * dc;
          if (rr < 0 || rr >= g.H || cc < 0 || cc >= g.W) continue;
          const q = rr * g.W + cc;
          if (g.ex[q] && canLand(s, q, p)) out.push([q]);
        }
        break;
      }
      case 'c2': for (const q of slideTargets(s, from, p, DIAG)) out.push([q]); break;
      case 'c3': {
        const ok = new Set();
        for (let q = 0; q < g.N; q++) if (b[q] > 0 && tix(b[q]) === S_I) for (const z of adjOf(s, q)) if (z !== from && canLand(s, z, p)) ok.add(z);
        for (const q of ok) out.push([q]);
        break;
      }
      case 'c4': for (const q of shotTargets(s, from, p, DIAG, 1)) out.push([q]); break;
      case 'c5': {
        const r = from / g.W | 0, c = from % g.W;
        for (let q = 0; q < g.N; q++) if (g.ex[q] && Math.abs((q / g.W | 0) - r) + Math.abs(q % g.W - c) > 5 && (s.b[q] === 0 || (foe(s, q, p) && T[tix(s.b[q])].cat !== 'M'))) out.push([q]);
        break;
      }
      case 'c6': out.push(['go']); break;
      case 'c7': for (const q of shotTargets(s, from, p, ORTH, 1)) out.push([q]); break;
      case 'c8':
        for (const d of ALL) {
          let q = nx(g, from, d);
          if (q < 0) continue;
          if (canLand(s, q, p)) out.push([q]);
          if (b[q] !== 0) {
            while (q >= 0 && b[q] !== 0) q = nx(g, q, d);
            if (q >= 0) out.push([q]);
          }
        }
        break;
      // ----- mages -----
      case 'ma':
        for (const k of SIDES) if (enemiesIn(s, g.side[0][k], p)) out.push([k]);
        if (enemiesIn(s, g.center, p)) out.push(['centre']);
        break;
      case 'pb': for (const k of SIDES) if (enemiesIn(s, g.side[1][k], p)) out.push([k]); break;
      case 'mb': {
        const pcs = []; for (let q = 0; q < g.N; q++) if (b[q] > 0 && !isBoss(s, q)) pcs.push(q);
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
        const al = []; for (let q = 0; q < g.N; q++) if (b[q] > 0 && own(b[q]) === p && !isBoss(s, q)) al.push(q);
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
      case 'lc':
        for (const d of ORTH) {
          const a1 = nx(g, from, d); if (a1 < 0) continue;
          const a2 = nx(g, a1, d), a3 = a2 >= 0 ? nx(g, a2, d) : -1;
          const hitL = x => x >= 0 && foe(s, x, p) && !cover(s, x);
          if (hitL(a1) || hitL(a2) || hitL(a3)) out.push([a1]);
        }
        break;
      case 'cv': {
        const r = from / g.W | 0, c = from % g.W;
        for (const [dr, dc] of KNIGHT) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || rr >= g.H || cc < 0 || cc >= g.W) continue;
          const q = rr * g.W + cc;
          if (g.ex[q] && canLand(s, q, p)) out.push([q]);
        }
        break;
      }
      case 'gd': for (const q of stepTargets(s, from, p, ALL)) out.push([q]); break;
      case 'gu': {
        if (!s.dead) break;
        const he = homeEmpty(s, p); if (!he.length) break;
        const hs = full ? he : bestHome(s, he, 3);
        for (let i = 0; i < NT; i++) if (T[i].cat === 'G' && s.dead[p][i] > 0) for (const q of hs) out.push(['v' + i, q]);
        break;
      }
      case 'dr': {
        const cand = [];
        for (let q = 0; q < g.N; q++) {
          if (b[q] !== 0 || g.zone[0][q] || g.zone[1][q]) continue;
          // bot : seulement près d'un ennemi dangereux ou de nos dieux (bloquer un chemin)
          if (full || adjOf(s, q).some(z => b[z] > 0 && (own(b[z]) === opp ? T[tix(b[z])].cat === 'G' : T[tix(b[z])].cat === 'M'))) cand.push(q);
        }
        const cs = full ? cand : cand.slice(0, 8);
        for (let i = 0; i < cs.length; i++) {
          out.push([cs[i]]);
          for (let j = 0; j < cs.length; j++) if (j !== i && (full || j > i)) out.push([cs[i], cs[j]]);
        }
        break;
      }
      case 'pr': for (let q = 0; q < g.N; q++) if (b[q] > 0 && own(b[q]) === p && !isBl(s, q) && (full || T[tix(b[q])].cat !== 'S')) out.push([q]); break;
    }
    return out;
  }

  // applique une activation (sans fin de tour)
  function runAct(s, from, cl) {
    const g = s.g, c0 = s.b[from], p = own(c0), t = T[tix(c0)], opp = 1 - p;
    if (t.cost) s.mana[p] -= t.cost;
    switch (t.id) {
      case 's': case 'g5': case 'g7': case 'g2': case 'c1': case 'c2': case 'c3': case 'c5': case 'c8': case 'cv': case 'gd': case 'mi': {
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
      case 'c4': kill(s, cl[0]); break;
      case 'c7': { // la Baliste transperce : le 1er ennemi de la ligne, puis le suivant derrière lui
        kill(s, cl[0]);
        const d = ORTH.find(dd => { let x = nx(g, from, dd); while (x >= 0 && x !== cl[0] && s.b[x] === 0) x = nx(g, x, dd); return x === cl[0]; });
        if (d !== undefined) { let x = nx(g, cl[0], d); while (x >= 0 && s.b[x] === 0) x = nx(g, x, d); if (x >= 0 && foe(s, x, p) && !cover(s, x)) kill(s, x); }
        break;
      }
      case 'g4': {
        let pos = from;
        for (const q of cl) { const d = ALL.find(dd => nx(g, pos, dd) === q); pos = pushLine(s, pos, d, true); }
        break;
      }
      case 'g6': for (const z of adjOf(s, from)) if (s.b[z] > 0 && own(s.b[z]) === opp && !cover(s, z)) kill(s, z); break;
      case 'c6': s.mana[p] += 40; s.acts += 1; break; // +40 mana et une action de plus
      case 'ma': case 'pb': for (const z of zoneVictims(s, areaOf(g, t.id, cl[0]), p)) kill(s, z); break;
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
      case 'lc': {
        const d = ORTH.find(dd => nx(g, from, dd) === cl[0]);
        const a2 = nx(g, cl[0], d), a3 = a2 >= 0 ? nx(g, a2, d) : -1;
        for (const z of [cl[0], a2, a3]) if (z >= 0 && foe(s, z, p) && !cover(s, z)) kill(s, z);
        break;
      }
      case 'gu': { const i = +cl[0].slice(1); s.dead[p][i]--; s.lost[p][1]--; s.b[cl[1]] = enc(i, p); break; }
      case 'dr': for (const q of cl) s.b[q] = -1; break;
      case 'pr': s.bl[p] = cl[0]; break;
    }
  }

  // ---------- Actions ----------
  function placeFree(s, a) { return s.ev === 'noir' && a.k === 'pla' && isDark(s.g, a.to); }

  // bot : les `k` cases de placement les plus intéressantes (pas sous une prise adverse, proches de l'adversaire)
  function bestHome(s, he, k) {
    if (he.length <= k) return he;
    const g = s.g, b = s.b, p = s.turn, W = g.W, def = guardMap(s, 1 - p);
    const foes = []; for (let q = 0; q < g.N; q++) if (b[q] > 0 && own(b[q]) !== p) foes.push(q);
    const sc = he.map(q => {
      let md = 20; const r = q / W | 0, c = q % W;
      for (const f of foes) { const d = Math.max(Math.abs((f / W | 0) - r), Math.abs(f % W - c)); if (d < md) md = d; }
      return { q, v: (def[q] ? -10 : 0) - md };
    });
    sc.sort((x, y) => y.v - x.v);
    return sc.slice(0, k).map(x => x.q);
  }

  function gen(s, full, plaK) {
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
      let he = homeEmpty(s, p);
      if (plaK && s.ev !== 'noir') he = bestHome(s, he, plaK);
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
    if (s.boss && s.boss.hp > 0 && p === s.boss.owner) { bossAct(s); checkWin(s); }
    if (s.noPlace[p]) s.noPlace[p]--;
    if (s.noAct[p]) s.noAct[p]--;
    s.decl[p] = s._newDecl || null; s._newDecl = null;
    s.turn = 1 - p; s.acts = 1; s.ply++;
    s.quiet++;
    if (s.quiet >= 150 && s.winner === null) { s.winner = 2; s.why = '150 tours (75 chacun) sans aucune élimination : partie nulle.'; }
    const q = s.turn;
    if (s.bl) s.bl[q] = -1; // la bénédiction dure jusqu'au tour suivant de celui qui l'a lancée
    if (s.ev === 'maree') s.mana[q] += 10;
    // sources de mana
    const spec = s.g.spec;
    if (spec) for (let x = 0; x < s.g.N; x++) if (spec[x] === 1 && s.b[x] > 0 && own(s.b[x]) === q) s.mana[q] += 10;
    if (s.goal) {
      if (s.goal === 'colline') {
        let mine = 0, theirs = 0;
        for (const x of s.g.center) if (s.b[x] > 0) { if (own(s.b[x]) === q) mine++; else theirs++; }
        if (mine && !theirs) s.hold[q]++;
      }
      checkWin(s);
      const lim = GOAL_LIMIT[s.goal] || 120;
      if (s.winner === null && s.ply >= lim) {
        const t0 = s.lost[0][0] + s.lost[0][1] + s.lost[0][2], t1 = s.lost[1][0] + s.lost[1][1] + s.lost[1][2];
        s.winner = t0 < t1 ? 0 : t1 < t0 ? 1 : 2;
        s.why = s.winner === 2 ? 'Temps écoulé, autant de pertes des deux côtés : match nul.' : 'Temps écoulé : moins de pertes.';
      }
    }
    if (s.pend[q]) {
      s.pend[q] = 0;
      const dead = s.lost[q][0] + s.lost[q][1] + s.lost[q][2];
      s.mana[q] += 40 * dead;
      s._martyr = 40 * dead;
    }
  }

  // ---------- boss ----------
  function placeBoss(s, kind) {
    const g = s.g, own2 = 1, z = g.zl[own2].filter(q => s.b[q] === 0);
    if (!z.length) return;
    // le boss au milieu de sa zone, 3 sbires autour
    let cx = 0, cy = 0; for (const q of z) { cx += q % g.W; cy += q / g.W | 0; } cx /= z.length; cy /= z.length;
    z.sort((a, b2) => Math.hypot(a % g.W - cx, (a / g.W | 0) - cy) - Math.hypot(b2 % g.W - cx, (b2 / g.W | 0) - cy));
    const t = T[TI[kind]];
    s.b[z[0]] = enc(TI[kind], own2);
    s.boss = { q: z[0], hp: t.hp, max: t.hp, kind, owner: own2, cd: 0 };
    for (const q of z.slice(1, 4)) s.b[q] = enc(TI.mi, own2);
  }
  function bossAct(s) {
    const B = s.boss, g = s.g, me = B.owner, opp = 1 - me, W = g.W;
    B.cd++;
    const foes = []; for (let q = 0; q < g.N; q++) if (s.b[q] > 0 && own(s.b[q]) === opp) foes.push(q);
    const dist = (a, b2) => Math.max(Math.abs((a / W | 0) - (b2 / W | 0)), Math.abs(a % W - b2 % W));
    const bestAdj = () => {
      let best = -1, bv = -1;
      for (const z of adjOf(s, B.q)) if (s.b[z] > 0 && own(s.b[z]) === opp && !isBl(s, z)) { const v = VAL[tix(s.b[z])]; if (v > bv) { bv = v; best = z; } }
      return best;
    };
    if (B.kind === 'bt') {
      // avance d'une case vers le perso ennemi le plus proche, puis en écrase un collé à lui
      if (foes.length && bestAdj() < 0) {
        let to = -1, bd = 99;
        for (const z of adjOf(s, B.q)) if (s.b[z] === 0) { const d = Math.min(...foes.map(f => dist(z, f))); if (d < bd) { bd = d; to = z; } }
        if (to >= 0) { s.b[to] = s.b[B.q]; s.b[B.q] = 0; B.q = to; }
      }
      if (B.cd % 2 === 0) { const v = bestAdj(); if (v >= 0) { s._smash = v; kill(s, v); } } // il n'écrase qu'un tour sur deux
    } else if (B.kind === 'bn') {
      let n = 0; for (let q = 0; q < g.N; q++) if (s.b[q] > 0 && tix(s.b[q]) === TI.mi && own(s.b[q]) === me) n++;
      if (n < 5) {
        const free = adjOf(s, B.q).filter(z => s.b[z] === 0);
        if (free.length) { free.sort((a, b2) => Math.min(99, ...foes.map(f => dist(a, f))) - Math.min(99, ...foes.map(f => dist(b2, f)))); s.b[free[0]] = enc(TI.mi, me); }
      }
      if (B.cd % 2 === 0) { const d = Math.min(15, s.mana[opp]); s.mana[opp] -= d; s.mana[me] += d; }
    } else if (B.kind === 'bd') {
      if (B.cd % 2 === 0) {
        // feu dans la direction où il y a le plus d'ennemis (4 cases, 2 victimes au plus)
        let best = null, bn = 0;
        for (const d of ORTH) {
          const vic = []; let q = B.q;
          for (let k = 0; k < 4; k++) { q = nx(g, q, d); if (q < 0 || s.b[q] === -1 || s.b[q] === VOID) break; if (s.b[q] > 0 && own(s.b[q]) === opp && !cover(s, q) && !isBl(s, q)) vic.push(q); if (vic.length >= 2) break; }
          if (vic.length > bn) { bn = vic.length; best = vic; }
        }
        if (best) { s._fire = best.slice(); for (const q of best) kill(s, q); }
      }
    }
  }

  function loses(s, p) {
    if (s.ev === 'illimite') return s.lost[p][0] >= 2 || s.lost[p][1] >= 6;
    return s.lost[p][1] >= 4 || (s.lost[p][0] >= 1 && aliveMages(s, p) === 0);
  }
  function goalWinner(s) {
    const tot = p => s.lost[p][0] + s.lost[p][1] + s.lost[p][2];
    const won = [false, false];
    for (const p of [0, 1]) {
      const o = 1 - p;
      if (s.goal === 'massacre') won[p] = tot(o) >= 5;
      else if (s.goal === 'chasse') won[p] = s.lost[o][0] >= 1;
      else if (s.goal === 'colline') won[p] = s.hold[p] >= 3;
      else if (s.goal === 'percee') { const z = s.g.zl[o]; for (const x of z) { const c = s.b[x]; if (c > 0 && own(c) === p && CATN[tix(c)] > 0) { won[p] = true; break; } } }
    }
    return won;
  }
  const GOAL_WHY = { massacre: '5 persos adverses tués.', chasse: 'Un dieu adverse tué.', colline: '3 points au centre.', percee: 'Percée dans la zone adverse.' };
  function checkWin(s) {
    if (s.winner !== null) return;
    if (s.boss && s.boss.hp <= 0) { s.winner = 1 - s.boss.owner; s.why = 'Le boss est vaincu !'; return; }
    if (s.goal) {
      const w = goalWinner(s);
      if (!w[0] && !w[1]) return;
      s.winner = w[0] && w[1] ? s.turn : w[0] ? 0 : 1;
      s.why = GOAL_WHY[s.goal];
      return;
    }
    const l0 = loses(s, 0), l1 = loses(s, 1);
    if (!l0 && !l1) return;
    if (l0 && l1) s.winner = s.turn; else s.winner = l0 ? 1 : 0;
    const L = 1 - s.winner;
    s.why = (s.ev === 'illimite')
      ? (s.lost[L][0] >= 2 ? '2 dieux tués.' : '6 gardes tués.')
      : (s.lost[L][1] >= 4 ? '4 gardes tués.' : 'Tous les dieux adverses sont morts.');
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
  const SEE = 0.6; // part de la valeur du preneur comptée quand il prend sur une case défendue
  const MAGEV = 1.5; // valeur d'un mage qui n'a plus assez de mana pour lancer son sort
  const PLAK = 6; // dans l'arbre de recherche : nombre de cases de placement essayées par perso
  const GPRESS = [0, 2.5, 6, 12, 20, 30, 45, 60];
  // poids neutres : le bot n'apprend pas ta façon de jouer, il raisonne seulement sur la position
  let W8 = { wG: 1, wM: 1, opp: null };
  // caractère du bot (léger pour l'impossible, qui s'adapte surtout à la position)
  const PERSOS = {
    agressif: { name: 'l’Agressif', desc: 'Il fonce sur tes persos et cherche les prises.' },
    prudent: { name: 'le Prudent', desc: 'Il protège ses persos et garde des réserves.' },
    mage: { name: 'le Mage', desc: 'Il aime le mana et les sorts de ses dieux.' },
    batisseur: { name: 'le Bâtisseur', desc: 'Il recrute beaucoup pour priver la réserve.' },
  };
  let F = { appr: 1, mine: 1, theirs: 1, res: 1, mana: 1 };
  function setPerso(id, k) {
    F = { appr: 1, mine: 1, theirs: 1, res: 1, mana: 1 };
    if (id === 'agressif') { F.appr = 1 + .6 * k; F.mine = 1 + .15 * k; }
    if (id === 'prudent') { F.theirs = 1 + .3 * k; F.res = 1 + .08 * k; }
    if (id === 'mage') F.mana = 1 + .35 * k;
    if (id === 'batisseur') F.res = 1 + .18 * k;
  }
  let X = 1; // 1 = lecture fine du bot impossible (menaces en 2 pas, reprises, mana des mages…) ; 0 = comme avant (bot normal)

  function magesOnBoard(s, p) { let n = 0; const b = s.b; for (let q = 0; q < b.length; q++) { const c = b[q]; if (c > 0 && own(c) === p && T[tix(c)].cat === 'M') n++; } return n; }
  function danger(s, q, am, onB) {
    if (s.ev === 'illimite') return 0;
    if (am === 0 && s.lost[q][0] === 0) return 0; // aucun dieu engagé : immunisé
    if (am === 1) return onB ? 12 : 5;
    if (am === 2) return onB === 2 ? 4 : 1.5;
    return 0;
  }

  // valeur (pour l'attaquant) de tuer d'un coup l'ensemble `sqs` de persos ennemis de `q`
  function killGain(s, sqs, am) { return sqs.length ? killGainC(s, sqs.map(x => s.b[x]), am) : 0; }
  // idem, à partir des codes des persos tués (tous du même joueur)
  function killGainC(s, codes, am) {
    const q = own(codes[0]);
    if (s.boss && codes.some(c => CATB[tix(c)])) return s.boss.hp <= 1 ? WINCAP : 14;
    let v = 0, m = 0, gd = 0;
    for (const c of codes) { const t = T[tix(c)]; v += t.val; if (t.cat === 'M') m++; else if (t.cat === 'G') gd++; }
    const L = s.lost[q];
    if (s.goal) {
      const tot = L[0] + L[1] + L[2];
      if (s.goal === 'massacre') return tot + codes.length >= 5 ? WINCAP : v + codes.length * 4;
      if (s.goal === 'chasse') return m ? WINCAP : v;
      if (s.goal === 'endurance') return v + codes.length * 6;
      return v + codes.length * 1.5;
    }
    if (s.ev === 'illimite') { if (L[0] + m >= 2 || L[1] + gd >= 6) return WINCAP; v += m * 12; }
    else {
      if (L[1] + gd >= 4) return WINCAP;
      if (m && am[q] - m <= 0) return WINCAP;
      if (m) v += (am[q] - m === 1 ? 10 : 3) * W8.wM;
    }
    if (gd) v += (GPRESS[Math.min(L[1] + gd, 7)] - GPRESS[L[1]]) * W8.wG;
    return v;
  }

  // poussée du Bélier depuis pos dans la direction d : -2 impossible, -1 personne ne meurt, sinon la case du perso éjecté
  function pushKill(s, b, mv, N, pos, d) {
    let x = mv[d * N + pos];
    if (x < 0 || b[x] === VOID) return -2;
    let last = -1;
    while (x >= 0 && b[x] !== 0 && b[x] !== VOID) { if (b[x] === -1 || isBl(s, x)) return -2; last = x; x = mv[d * N + x]; }
    return (x < 0 || b[x] === VOID) && last >= 0 ? last : -1;
  }
  // cases où `side` pourrait prendre au prochain coup un perso qui s'y trouverait (pour savoir qui est défendu)
  function guardMap(s, side) {
    const g = s.g, b = s.b, N = g.N, mv = g.mv, m = new Uint8Array(N);
    if (s.noAct[side]) return m;
    const ray = (f, d) => { let x = mv[d * N + f]; while (x >= 0 && b[x] === 0) x = mv[d * N + x]; if (x >= 0) m[x] = 1; };
    const adj = (f, dirs) => { for (const d of dirs) { const x = mv[d * N + f]; if (x >= 0) m[x] = 1; } };
    for (let f = 0; f < N; f++) {
      const c = b[f]; if (c <= 0 || own(c) !== side) continue;
      const ti = tix(c), id = T[ti].id;
      if (COST[ti] && s.mana[side] < COST[ti]) continue;
      switch (id) {
        case 's': adj(f, side === 0 ? [0, 2] : [5, 7]); break;
        case 'g5': case 'g7': adj(f, DIAG); for (const d of id === 'g5' ? ORTH : DIAG) { const x = mv[d * N + f]; if (x >= 0 && b[x] === 0) adj(x, DIAG); } break;
        case 'c8': case 'g6': case 'gd': adj(f, ALL); break;
        case 'g2': case 'c7': for (const d of ORTH) ray(f, d); break;
        case 'lc': for (const d of ORTH) { let x = f; for (let k = 0; k < 3; k++) { x = mv[d * N + x]; if (x < 0) break; m[x] = 1; } } break;
        case 'cv': { const r = f / g.W | 0, cc = f % g.W; for (const [dr, dc] of KNIGHT) { const rr = r + dr, c2 = cc + dc; if (rr >= 0 && rr < g.H && c2 >= 0 && c2 < g.W) m[rr * g.W + c2] = 1; } break; }
        case 'c2': case 'g3': case 'c4': for (const d of DIAG) ray(f, d); break;
        case 'ma': for (const k of SIDES) for (const x of g.side[0][k]) m[x] = 1; for (const x of g.center) m[x] = 1; break;
        case 'pb': for (const k of SIDES) for (const x of g.side[1][k]) m[x] = 1; break;
      }
    }
    return m;
  }

  // meilleures prises immédiates de q : renvoie les 2 meilleurs gains (une prise par action), sans tout générer
  // (un perso qui prend en se déplaçant sur une case défendue risque d'être repris : on le compte en partie)
  function captureGains(s, q, am) {
    let x1 = 0, x2 = 0;
    if (s.noAct[q]) return [0, 0];
    const g = s.g, b = s.b, opp = 1 - q, N = g.N, mv = g.mv;
    const def = SEE && X ? guardMap(s, opp) : null;
    // vic : case du perso visé ; deux prises gagnantes sur le même perso ne font qu'une menace (il suffit de le déplacer)
    let v1 = -9;
    const add = (v, vic) => {
      if (X && v >= WINCAP && x1 >= WINCAP && vic !== undefined && vic === v1) return;
      if (v > x1) { x2 = x1; x1 = v; v1 = vic; } else if (v > x2) x2 = v;
    };
    // prise par un perso qui finit sur la case `at`
    const addM = (v, at, code, vic) => { if (def && def[at] && v < WINCAP) v -= SEE * killGainC(s, [code], am); add(v, vic === undefined ? at : vic); };
    const isEnemy = x => b[x] > 0 && own(b[x]) === opp && !isBl(s, x);
    const one = (x, code) => { if (isEnemy(x)) addM(killGain(s, [x], am), x, code); };
    // 1er perso rencontré dans la direction d, s'il est ennemi (mv : le tireur se déplace s'il est collé)
    const ray = (f, d, code, moves) => {
      let x = mv[d * N + f], k = 1; while (x >= 0 && b[x] === 0) { x = mv[d * N + x]; k++; }
      if (x >= 0 && isEnemy(x)) { const v = killGain(s, [x], am); if (moves === 2 || (moves === 1 && k === 1)) addM(v, x, code); else if (!cover(s, x)) add(v, x); }
    };
    const adj = (f, dirs, code) => { for (const d of dirs) { const x = mv[d * N + f]; if (x >= 0 && isEnemy(x)) addM(killGain(s, [x], am), x, code); } };
    for (let f = 0; f < N; f++) {
      const c = b[f]; if (c <= 0 || own(c) !== q) continue;
      const t = T[tix(c)];
      if (t.cost && s.mana[q] < t.cost) continue;
      switch (t.id) {
        case 's': adj(f, q === 0 ? [0, 2] : [5, 7], c); break;
        case 'g5': case 'g7': {
          // 2 pas : prise directe, prise puis prise, ou pas sur une case vide puis prise
          const steps = t.id === 'g5' ? ORTH : DIAG;
          for (const d of DIAG) {
            const x = mv[d * N + f];
            if (x < 0 || !isEnemy(x)) continue;
            addM(killGain(s, [x], am), x, c);
            if (X && s.ev !== 'murs') for (const e of DIAG) { const y = mv[e * N + x]; if (y >= 0 && isEnemy(y)) addM(killGain(s, [x, y], am), y, c, x); }
          }
          if (X) for (const d of steps) {
            const x = mv[d * N + f];
            if (x < 0 || b[x] !== 0) continue;
            adj(x, DIAG, c);
          }
          break;
        }
        case 'c8': adj(f, ALL, c); break;
        case 'g2': for (const d of ORTH) ray(f, d, c, 2); break;
        case 'c2': for (const d of DIAG) ray(f, d, c, 2); break;
        case 'g3': for (const d of DIAG) ray(f, d, c, 1); break;
        case 'c7': for (const d of ORTH) ray(f, d, c, 0); break;
        case 'c4': for (const d of DIAG) ray(f, d, c, 0); break;
        case 'g6': { const z = adjOf(s, f).filter(x => isEnemy(x) && !cover(s, x)); if (z.length) add(killGain(s, z, am), z.length === 1 ? z[0] : undefined); break; }
        case 'ma': case 'pb':
          for (const k of (t.id === 'ma' ? SIDES.concat(['centre']) : SIDES)) {
            const z = zoneVictims(s, areaOf(g, t.id, k), q);
            if (z.length) add(killGain(s, z, am), z.length === 1 ? z[0] : undefined);
          }
          break;
        case 'g4':
          // seul le 1er pas pousse
          for (const d of ALL) {
            const k1 = pushKill(s, b, mv, N, f, d);
            if (k1 >= 0 && own(b[k1]) === opp && !isBl(s, k1)) add(killGain(s, [k1], am), k1);
          }
          break;
        case 'c1': case 'c3': case 'c5': case 'cv': for (const cl of genAct(s, f, false)) one(cl[0], c); break;
        case 'gd': adj(f, ALL, c); break;
        case 'lc':
          for (const d of ORTH) {
            const x = mv[d * N + f]; if (x < 0) continue;
            const y = mv[d * N + x], y2 = y >= 0 ? mv[d * N + y] : -1, z = [];
            for (const t of [x, y, y2]) if (t >= 0 && isEnemy(t) && !cover(s, t)) z.push(t);
            if (z.length) add(killGain(s, z, am), z.length === 1 ? z[0] : undefined);
          }
          break;
        case 'md': for (let x = 0; x < N; x++) if (b[x] > 0 && own(b[x]) === q) for (const y of pawnTargets(s, x, q)) one(y, b[x]); break;
        case 'pc': for (let x = 0; x < N; x++) if (b[x] > 0 && own(b[x]) === q && tix(b[x]) === S_I) for (const y of pawnTargets(s, x, q)) one(y, b[x]); break;
      }
    }
    return [x1, x2];
  }

  // toutes les prises du joueur au trait, déjà jouées : [{ a, c }]
  const NOKILL = { g1: 1, c6: 1, mb: 1, mc: 1, me: 1, pa: 1, pd: 1, pe: 1, pf: 1, pg: 1, gu: 1, dr: 1, pr: 1 };
  function capKids(st) {
    const out = [];
    if (st.phase !== 'play' || st.noAct[st.turn]) return out;
    const p = st.turn, b = st.b, N = st.g.N;
    const decl = st.decl[p];
    for (let f = 0; f < N; f++) {
      const c = b[f]; if (c <= 0 || own(c) !== p) continue;
      const id = T[tix(c)].id;
      if (NOKILL[id]) continue;
      if (decl && (decl.k !== 'act' || decl.from !== f)) continue;
      const area = id === 'g6' || id === 'ma' || id === 'pb' || id === 'g4' || id === 'lc';
      for (const cl of genAct(st, f, false)) {
        if (!area) {
          let hit = false;
          for (const x of cl) if (typeof x === 'number' && b[x] > 0 && own(b[x]) !== p) { hit = true; break; }
          if (!hit) continue;
        }
        const a = { k: 'act', from: f, cl }, ch = apply(clone(st), a);
        if (ch._k > 0) out.push({ a, c: ch });
      }
    }
    return out;
  }

  // évaluation statique (pour p) ; `deep` ajoute la lecture des prises immédiates (menaces)
  function evalS(s, p, deep) {
    if (s.winner !== null) return s.winner === 2 ? 0 : (s.winner === p ? WIN : -WIN);
    const g = s.g, b = s.b, N = g.N;
    if (!g._row) { g._row = new Int8Array(N); g._col = new Int8Array(N); for (let q = 0; q < N; q++) { g._row[q] = q / g.W | 0; g._col[q] = q % g.W; } }
    const ROW = g._row, COL = g._col;
    let sc = 0;
    const onB = [0, 0], mpos = [[], []];
    for (let q = 0; q < N; q++) { const c = b[q]; if (c > 0 && IS_M[tix(c)]) { onB[own(c)]++; mpos[own(c)].push(q); } }
    const am = [onB[0], onB[1]];
    for (const i of MAGE_T) { am[0] += s.res[0][i]; am[1] += s.res[1][i]; }
    const mana = s.mana;
    for (let q = 0; q < N; q++) {
      const c = b[q]; if (c <= 0) continue;
      const o = (c - 1) & 1, ti = (c - 1) >> 1, cat = CATN[ti];
      let v = VAL[ti];
      // un mage posé ne vaut pas plus qu'en réserve (où il est intouchable) : on ne le pose que pour lancer un sort
      if (cat === 0) v = MAGEV && X ? (mana[o] >= COST[ti] ? v * 0.75 + 0.3 : MAGEV) : v * 0.75 + (mana[o] >= COST[ti] ? 0.3 : -0.5);
      else {
        const r = ROW[q], cc = COL[q];
        if (cat === 2) v += (o === 0 ? g.H - 1 - r : r) * 0.05;
        // se rapprocher des dieux adverses
        const mp = mpos[1 - o];
        if (mp.length) {
          let md = 9;
          for (let k = 0; k < mp.length; k++) { const m = mp[k]; const dr = Math.abs(ROW[m] - r), dc = Math.abs(COL[m] - cc); const dd = dr > dc ? dr : dc; if (dd < md) md = dd; }
          if (md < 9) v += (8 - md) * (cat === 1 ? 0.07 : 0.04) * (o === p ? F.appr : 1);
        }
      }
      sc += o === p ? v : -v;
    }
    const rp = s.res[p], ro = s.res[1 - p];
    // recrutement illimité : la réserve commune ne se vide jamais, donc garder des recrues ne prive personne ;
    // une seule recrue par type sert (elle fait gagner l'action de recruter), les suivantes ne valent rien
    if (s.ev === 'illimite') for (let i = 0; i < NT; i++) sc += ((rp[i] ? 1 : 0) - (ro[i] ? 1 : 0)) * VAL[i] * 0.4;
    else for (let i = 0; i < NT; i++) {
      const d = (rp[i] - ro[i]) * F.res;
      // un mage sans assez de mana pour son sort ne sert plus qu'à rester en vie
      if (MAGEV && X && CATN[i] === 0) { if (rp[i] || ro[i]) sc += rp[i] * (mana[p] >= COST[i] ? VAL[i] * 0.75 : MAGEV) - ro[i] * (mana[1 - p] >= COST[i] ? VAL[i] * 0.75 : MAGEV); }
      else if (d) sc += d * VAL[i] * (CATN[i] === 0 ? 0.75 : 0.8);
    }
    sc += (manaVal(s, p) - manaVal(s, 1 - p)) * F.mana;
    if (s.goal) sc += goalEval(s, p, onB);
    else {
      sc += (GPRESS[Math.min(s.lost[1 - p][1], 7)] - GPRESS[Math.min(s.lost[p][1], 7)]) * W8.wG;
      if (s.ev === 'illimite') sc += (s.lost[1 - p][0] - s.lost[p][0]) * 12;
      else sc += (danger(s, 1 - p, am[1 - p], onB[1 - p]) - danger(s, p, am[p], onB[p])) * W8.wM;
    }
    if (s.boss && s.boss.hp > 0) sc += (s.boss.owner === p ? 1 : -1) * s.boss.hp * 9;
    if (s.noAct[1 - p]) sc += 1.5 * s.noAct[1 - p];
    if (s.noAct[p]) sc -= 1.5 * s.noAct[p];
    if (s.noPlace[1 - p]) sc += 0.6 * s.noPlace[1 - p];
    if (s.noPlace[p]) sc -= 0.6 * s.noPlace[p];
    // sorts de zone gardés en réserve (Orage, Séisme) : poser puis lancer, les persos exposés sont en danger
    if (X) for (let o = 0; o < 2; o++) {
      const e = 1 - o, re = s.res[e];
      if (s.noPlace[e] || s.noAct[e] > 1 || (!re[MA_I] && !re[PB_I])) continue;
      let hit = 0;
      const zg = sqs => { const cs = zoneVictims(s, sqs, e).map(x => b[x]); return cs.length ? killGainC(s, cs, am) : 0; };
      if (re[MA_I] && mana[e] >= COST[MA_I]) { hit = zg(g.center); for (const k of SIDES) hit = Math.max(hit, zg(g.side[0][k])); }
      if (re[PB_I] && mana[e] >= COST[PB_I]) for (const k of SIDES) hit = Math.max(hit, zg(g.side[1][k]));
      if (hit) sc += (o === p ? -0.15 : 0.15) * hit;
    }
    if (deep && s.phase === 'play') {
      // celui qui joue peut prendre tout de suite ; l'autre ne pourra parer qu'une menace
      const stm = s.turn;
      const mine = captureGains(s, stm, am), theirs = captureGains(s, 1 - stm, am);
      let th = 0;
      if (mine[0] >= WINCAP) th = 3000;            // victoire au prochain coup
      else {
        th = 0.8 * mine[0] * (stm === p ? F.mine : 1);
        if (theirs[0] >= WINCAP && theirs[1] >= WINCAP) th -= 1500; // deux menaces gagnantes : imparable
        else th -= (0.45 * Math.min(theirs[0], 60) + 0.25 * Math.min(theirs[1], 60)) * (stm === p ? F.theirs : 1);
      }
      sc += stm === p ? th : -th;
    }
    // 150 tours sans élimination = nulle : plus on s'en approche, moins l'avance compte (celui qui mène cherche à prendre)
    if (X && s.quiet > 40) sc *= Math.max(0.1, (150 - s.quiet) / 110);
    return sc;
  }

  // objectifs mystère : ce qui compte vraiment pour gagner
  function goalEval(s, p, onB) {
    const o = 1 - p, tot = x => s.lost[x][0] + s.lost[x][1] + s.lost[x][2];
    let sc = 0;
    if (s.goal === 'massacre') sc += (tot(o) - tot(p)) * 5;
    else if (s.goal === 'endurance') sc += (tot(o) - tot(p)) * 7;
    else if (s.goal === 'chasse') sc += (onB[o] - onB[p]) * 9;
    else if (s.goal === 'colline') {
      sc += (s.hold[p] - s.hold[o]) * 14;
      for (const x of s.g.center) if (s.b[x] > 0) sc += own(s.b[x]) === p ? 3 : -3;
    } else if (s.goal === 'percee') {
      const g = s.g, W = g.W, best = [9, 9];
      for (let q = 0; q < g.N; q++) {
        const c = s.b[q]; if (c <= 0 || CATN[tix(c)] === 0) continue;
        const w = own(c), r = q / W | 0, cc = q % W;
        for (const z of g.zl[1 - w]) { const d = Math.max(Math.abs((z / W | 0) - r), Math.abs(z % W - cc)); if (d < best[w]) best[w] = d; }
      }
      sc += (best[o] - best[p]) * 2.2;
    }
    // le temps presse : les pertes comptent de plus en plus
    sc += (tot(o) - tot(p)) * 1.5;
    return sc;
  }

  // valeur du mana : utile jusqu'à de quoi lancer 1,5 fois le sort le plus cher de ses dieux, presque rien au-delà
  function manaVal(s, p) {
    let need = 0;
    for (let i = 0; i < NT; i++) if (CATN[i] === 0 && (s.res[p][i] || s.pool[i]) && COST[i] > need) need = COST[i];
    const b = s.b; for (let q = 0; q < b.length; q++) { const c = b[q]; if (c > 0 && own(c) === p && CATN[tix(c)] === 0 && COST[tix(c)] > need) need = COST[tix(c)]; }
    const m = s.mana[p], cap = need * 1.5;
    return m <= cap ? m * 0.05 : cap * 0.05 + (m - cap) * 0.004;
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
    mix(s.phase === 'play' ? 1 : 2); if (s.goal) mix(s.hold[0] * 7 + s.hold[1]); if (s.boss) mix(s.boss.hp * 1000 + s.boss.q * 3 + (s.boss.cd & 1)); if (s.bl) mix((s.bl[0] + 2) * 131 + s.bl[1] + 2);
    if (s.dead) { let d = 0; for (let i = 0; i < NT; i++) d = d * 3 + s.dead[0][i] * 7 + s.dead[1][i] | 0; mix(d); }
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

  // think(état, niveau, options) — options : { budget (ms), maxMs, perso, canExtend }
  function think(s0, level, opt) {
    opt = opt || {};
    W8 = { wG: 1, wM: 1, opp: null };
    X = level === 'impossible' ? 1 : 0;
    setPerso(opt.perso, level === 'impossible' ? .3 : level === 'normal' ? 1 : 1.3);
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
    // enfants d'une position, triés par évaluation rapide (`skip` : position déjà examinée)
    function expand(st, me, as, skip) {
      // coups en double (même position obtenue, ex. Bélier qui pousse puis revient) : un seul suffit
      const cs = [], seen = imp ? new Set() : null;
      if (seen && skip) seen.add(skip);
      for (let i = 0; i < as.length; i++) {
        const a = as[i], c = child(st, a);
        if (seen) { const h = hashS(c); if (seen.has(h)) continue; seen.add(h); c._h = h; }
        cs.push({ c, i, v: evalS(c, me, false), cap: c._k > 0, a });
      }
      cs.sort((x, y) => y.v - x.v);
      return cs;
    }
    // lecture des menaces pour les meilleurs et les prises (pour bien ordonner)
    function deepen(cs, st, me, nDeep) {
      let caps = 0;
      for (let k = 0; k < cs.length; k++) {
        const x = cs[k];
        if (k < nDeep || (x.cap && caps++ < 10)) x.v = evalS(x.c, me, true);
        else x.v -= 1;
        x.o = x.v + (me !== p ? oppBonus(st, x.a) : 0);
      }
    }
    // recherche de calme : seulement les prises (et reprises), le joueur au trait peut aussi s'arrêter là
    const QD = 3;
    function qs(st, alpha, beta, qd) {
      if (st.winner !== null) return st.winner === 2 ? 0 : (st.winner === st.turn ? WIN - st.ply : -WIN + st.ply);
      nodes++;
      const me = st.turn;
      const stand = evalS(st, me, true);
      if (qd <= 0 || stand >= beta) return stand;
      const ks = capKids(st);
      if (!ks.length) return stand;
      if (stand > alpha) alpha = stand;
      for (const x of ks) x.v = evalS(x.c, me, false);
      ks.sort((x, y) => y.v - x.v);
      let best = stand;
      for (let k = 0; k < ks.length && k < 4; k++) {
        const c = ks[k].c;
        const v = c.turn === me ? qs(c, alpha, beta, qd - 1) : -qs(c, -beta, -alpha, qd - 1);
        if (v > best) { best = v; if (v > alpha) alpha = v; if (alpha >= beta) break; }
      }
      return best;
    }
    // largeur d'analyse selon la distance à la racine : large juste après le coup (réponses adverses), étroite au fond
    const BEAM = [48, 22, 18, 14, 12, 10];
    const PLYBEAM = 1;
    const beamAt = (ply, depth) => !imp ? 14 : PLYBEAM ? BEAM[Math.min(ply, BEAM.length - 1)] : (depth >= 4 ? 10 : depth === 3 ? 14 : 20);
    function nega(st, depth, alpha, beta, ply) {
      if (st.winner !== null) return st.winner === 2 ? 0 : (st.winner === st.turn ? WIN - st.ply : -WIN + st.ply);
      nodes++; if (Date.now() > deadline) throw ABORT;
      const me = st.turn;
      const key = st._h || hashS(st);
      const ent = tt.get(key);
      if (ent && ent.d >= depth) {
        if (ent.f === 0) return ent.v;
        if (ent.f === 1 && ent.v >= beta) return ent.v;
        if (ent.f === -1 && ent.v <= alpha) return ent.v;
      }
      const a0 = alpha;
      const as = gen(st, false, imp ? PLAK : 0);
      if (depth === 1) {
        const cs = expand(st, me, as, 0);
        let best = -Infinity, bi = 0, caps = 0;
        for (let k = 0; k < cs.length; k++) {
          const x = cs[k];
          let v;
          // une prise en bout de recherche : on lit la suite des reprises
          if (x.cap && imp) { const lo = Math.max(alpha, best); v = x.c.turn === me ? qs(x.c, lo, beta, QD) : -qs(x.c, -beta, -lo, QD); }
          else if (k < 14 || (!imp && x.cap && caps++ < 10)) v = evalS(x.c, me, true);
          else v = x.v - 1;
          if (v > best) { best = v; bi = x.i; if (imp && best >= beta) break; }
        }
        tt.set(key, { d: 1, v: best, f: best <= a0 ? -1 : best >= beta ? 1 : 0, m: bi });
        return best;
      }
      let best = -Infinity, bi = -1, skip = 0;
      const look = (c, lo, hi) => c.turn === me ? nega(c, depth - 1, lo, hi, ply + 1) : -nega(c, depth - 1, -hi, -lo, ply + 1);
      // le meilleur coup mémorisé d'abord : s'il suffit (coupure), inutile d'examiner tous les autres
      if (imp && ent && ent.m !== undefined && as[ent.m]) {
        const c = child(st, as[ent.m]); c._h = skip = hashS(c);
        best = look(c, alpha, beta); bi = ent.m;
        if (best > alpha) alpha = best;
        if (alpha >= beta) { tt.set(key, { d: depth, v: best, f: 1, m: bi }); return best; }
      }
      let cs = expand(st, me, as, skip);
      deepen(cs, st, me, 22);
      cs.sort((x, y) => y.o - x.o);
      if (!imp && ent && ent.m !== undefined) { const k = cs.findIndex(x => x.i === ent.m); if (k > 0) cs.unshift(cs.splice(k, 1)[0]); }
      const K = beamAt(ply, depth) - (skip ? 1 : 0);
      let rest = [];
      if (cs.length > K) {
        const keep = cs.slice(0, K);
        let extra = 0;
        for (let i = K; i < cs.length; i++) { if (cs[i].cap && extra < 6) { keep.push(cs[i]); extra++; } else rest.push(cs[i]); }
        cs = keep;
      }
      const tryAll = list => {
        for (const x of list) {
          let v;
          if (best === -Infinity || !imp) v = look(x.c, alpha, beta);
          else {
            // fenêtre nulle : on vérifie seulement si ce coup fait mieux ; sinon pas besoin de sa valeur exacte
            v = look(x.c, alpha, alpha + 0.01);
            if (v > alpha && v < beta) v = look(x.c, alpha, beta);
          }
          if (v > best) { best = v; bi = x.i; if (best > alpha) alpha = best; if (alpha >= beta) return; }
        }
      };
      tryAll(cs);
      // tout semble perdu : avant d'y croire, on vérifie aussi les coups écartés (une fuite a pu être élaguée)
      if (imp && best <= -WIN / 2 && alpha < beta && rest.length) { deepen(rest, st, me, 0); tryAll(rest); }
      if (bi < 0) bi = cs.length ? cs[0].i : 0;
      tt.set(key, { d: depth, v: best, f: best <= a0 ? -1 : best >= beta ? 1 : 0, m: bi });
      return best;
    }
    let order = kids.slice(0, rootBeam);
    // toujours examiner aussi toutes les prises
    for (const k of kids.slice(rootBeam)) if (k.c._k > 0 && order.length < rootBeam + 12) order.push(k);
    let bestA = order[0].a, prevBest = null, stable = 0, extended = false;
    stats.depth = 1;
    // impossible : profondeurs impaires seulement (finir sur son propre coup rend la lecture des menaces moins optimiste)
    for (let d = imp ? 3 : 2; d <= maxD; d += imp ? 2 : 1) {
      const scored = [];
      try {
        let alpha = -Infinity;
        for (const k of order) {
          const v = k.c.turn === p ? nega(k.c, d - 1, alpha, Infinity, 1) : -nega(k.c, d - 1, -Infinity, -alpha, 1);
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
      if (scored[0].v <= -WIN / 2) {
        // tout semble perdu : on ajoute les coups écartés à la racine avant d'abandonner
        if (imp && order.length < kids.length) { const inO = new Set(order); order = order.concat(kids.filter(k => !inO.has(k))); }
        else if (d >= 4) break;
      }
      // gestion du temps : on réfléchit plus longtemps si le meilleur coup change ou si la position est tendue
      if (imp) {
        if (prevBest !== null && scored[0].k.a === bestA && Math.abs(scored[0].v - prevBest) < 0.5) stable++; else stable = 0;
        const margin = scored.length > 1 ? scored[0].v - scored[1].v : 99;
        if (!extended && stable === 0 && prevBest !== null && d >= 3 && opt.canExtend !== false) { deadline = Math.min(deadline + budget * 0.6, t0 + (opt.maxMs || Infinity)); extended = true; }
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
  // (essayé : annoncer d'après la recherche complète, ou en prévoyant la réponse adverse — nettement moins bon en test)
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
    BOSSES, T, NT, TI, EVENTS, GOALS, PERSOS, MAPS, ZONES, SPECIALS, VOID, SHAPES, ALL_M, ALL_G, START_M, START_G, isBl, areaOf, SIDES, buildGeo, withSeed,
    stats, own, tix, enc, isHome, isDark, makeMap, newGame, clone, gen, genAct, apply, think, evalS, aliveMages, placeFree, loses,
  };
}
