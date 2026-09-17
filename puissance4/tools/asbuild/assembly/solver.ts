// Solveur Puissance 4 en AssemblyScript (compile vers WASM) - meme algorithme que
// puissance4/js/main.js (bitboard 7 bits/colonne + negamax/alpha-beta + table de
// transposition + filtre "coups non perdants" + tri par menaces + narrowing par
// fenetre nulle), mais avec i64 natifs au lieu de BigInt : le but est une vitesse
// brute suffisante pour resoudre le plateau vide de Puissance 4 en quelques
// secondes au lieu de plusieurs heures en JS interprete.

// --- Bitboard --------------------------------------------------------------

function bottomMask(col: i32): i64 {
  return i64(1) << i64(col * 7);
}
function topMask(col: i32): i64 {
  return i64(1) << i64(col * 7 + 5);
}
function columnMask(col: i32): i64 {
  return i64(63) << i64(col * 7);
}
function canPlay(mask: i64, col: i32): bool {
  return (mask & topMask(col)) == 0;
}

let scratchPosition: i64 = 0;
let scratchMask: i64 = 0;
function playMove(position: i64, mask: i64, col: i32): void {
  const newBit = (mask + bottomMask(col)) & columnMask(col);
  scratchPosition = mask ^ position;
  scratchMask = mask | newBit;
}

function alignment(bb: i64): bool {
  let m: i64;
  m = bb & (bb >> 7);  if ((m & (m >> 14)) != 0) return true;
  m = bb & (bb >> 6);  if ((m & (m >> 12)) != 0) return true;
  m = bb & (bb >> 8);  if ((m & (m >> 16)) != 0) return true;
  m = bb & (bb >> 1);  if ((m & (m >> 2)) != 0) return true;
  return false;
}
function isWinningMove(position: i64, mask: i64, col: i32): bool {
  const newBit = (mask + bottomMask(col)) & columnMask(col);
  return alignment(position | newBit);
}

function mirrorBoard(bb: i64): i64 {
  let res: i64 = 0;
  for (let c = 0; c < 7; c++) {
    const col = (bb >> i64(c * 7)) & i64(127);
    res |= col << i64((6 - c) * 7);
  }
  return res;
}

function keyOf(position: i64, mask: i64): i64 {
  const k1 = position + mask;
  const k2 = mirrorBoard(position) + mirrorBoard(mask);
  return k1 < k2 ? k1 : k2;
}

const BOARD_MASK: i64 =
  columnMask(0) | columnMask(1) | columnMask(2) | columnMask(3) |
  columnMask(4) | columnMask(5) | columnMask(6);

function verticalThreats(bb: i64): i64 {
  return (bb << 1) & (bb << 2) & (bb << 3);
}
function threatsForShift(bb: i64, s: i32): i64 {
  const s1 = i64(s), s2 = i64(s * 2), s3 = i64(s * 3);
  let r = (bb << s1) & (bb << s2) & (bb << s3);
  r |= (bb << s1) & (bb << s2) & (bb >> s1);
  r |= (bb << s1) & (bb >> s1) & (bb >> s2);
  r |= (bb >> s1) & (bb >> s2) & (bb >> s3);
  return r;
}
function computeWinningPositions(bb: i64): i64 {
  let r = verticalThreats(bb);
  r |= threatsForShift(bb, 7);
  r |= threatsForShift(bb, 6);
  r |= threatsForShift(bb, 8);
  return r & BOARD_MASK;
}
function popcount64(bb: i64): i32 {
  return i32(popcnt(bb));
}

// Retourne un masque de bits (1<<col) des colonnes jouables qui ne donnent pas
// une victoire immediate a l'adversaire ; 0 si aucune (position perdue a coup sur).
function nonLosingMoveMask(position: i64, mask: i64): i32 {
  const opponentWin = computeWinningPositions(mask ^ position) & ~mask;
  let safeMask: i32 = 0;
  for (let c = 0; c < 7; c++) {
    if (!canPlay(mask, c)) continue;
    const newBit = (mask + bottomMask(c)) & columnMask(c);
    const aboveBit = (newBit << 1) & columnMask(c);
    if ((aboveBit & opponentWin) == 0) safeMask |= (1 << c);
  }
  return safeMask;
}

// --- Table de transposition (tableaux typs + somme de controle) ------------

const TT_SIZE: i32 = 67108859; // nombre premier proche de 2^26
const TT_SIZE_I64: i64 = i64(TT_SIZE);

const ttCheck = new Int32Array(TT_SIZE);
const ttValue = new Int32Array(TT_SIZE);
const ttUsed = new Uint8Array(TT_SIZE);

function ttIndex(key: i64): i32 { return i32(key % TT_SIZE_I64); }
function ttChk(key: i64): i32 { return i32(key / TT_SIZE_I64); }

let ttFoundValue: i32 = 0;
let ttFoundFlag: i32 = -1;
function ttGet(key: i64): void {
  const idx = ttIndex(key);
  if (!ttUsed[idx]) { ttFoundFlag = -1; return; }
  const chk = ttChk(key);
  if (ttCheck[idx] != chk) { ttFoundFlag = -1; return; }
  const raw = ttValue[idx];
  ttFoundValue = (raw >> 2) - 64;
  ttFoundFlag = raw & 3;
}
function ttSet(key: i64, value: i32, flag: i32): void {
  const idx = ttIndex(key);
  ttUsed[idx] = 1;
  ttCheck[idx] = ttChk(key);
  ttValue[idx] = ((value + 64) << 2) | flag;
}

// --- Solveur -----------------------------------------------------------

const TOTAL_CELLS: i32 = 42;
const WIN_SCORE: i32 = TOTAL_CELLS + 1;

// @ts-ignore: decorator
@external("env", "onProgress")
declare function onProgress(nodeCount: i64): void;

let nodeCount: i64 = 0;

// Scratch pre-alloue (une fois, au chargement), indexe par profondeur (moveCount)
// pour eviter toute allocation dans la boucle chaude de negamax : deux appels au
// meme niveau de profondeur ne s'executent jamais simultanement en recursion
// sequentielle, donc chaque niveau peut avoir sa propre zone dediee sans conflit.
const MAX_DEPTH: i32 = 43;
const colBufAll = new StaticArray<i32>(MAX_DEPTH * 7);
const threatBufAll = new StaticArray<i32>(MAX_DEPTH * 7);

export function getNodeCount(): i64 { return nodeCount; }
export function resetNodeCount(): void { nodeCount = 0; }

function negamax(position: i64, mask: i64, moveCount: i32, alphaIn: i32, betaIn: i32): i32 {
  nodeCount++;
  if ((nodeCount & 0x3FFFFF) == 0) onProgress(nodeCount);
  let alpha = alphaIn, beta = betaIn;

  if (moveCount == TOTAL_CELLS) return 0;

  for (let c = 0; c < 7; c++) {
    if (canPlay(mask, c) && isWinningMove(position, mask, c)) {
      return WIN_SCORE - (moveCount + 1);
    }
  }

  const maxScore = TOTAL_CELLS - 1 - moveCount;
  if (beta > maxScore) {
    beta = maxScore;
    if (alpha >= beta) return beta;
  }

  const safe = nonLosingMoveMask(position, mask);
  if (safe == 0) return -maxScore;

  const key = keyOf(position, mask);
  ttGet(key);
  if (ttFoundFlag == 0) return ttFoundValue;
  if (ttFoundFlag == 1) { if (ttFoundValue > alpha) alpha = ttFoundValue; }
  else if (ttFoundFlag == 2) { if (ttFoundValue < beta) beta = ttFoundValue; }
  if (ttFoundFlag != -1 && alpha >= beta) return ttFoundValue;

  const alphaOrig = alpha;
  let best: i32 = -1000;

  // Ordre de colonnes centre d'abord, puis tri par nombre de menaces creees
  // (insertion sort manuel, au plus 7 elements, buffers pre-alloues par
  // profondeur : aucune allocation dans cette fonction).
  const base = moveCount * 7;
  let n = 0;
  if ((safe & 8) != 0) { playMove(position, mask, 3); const mb = scratchMask ^ scratchPosition; colBufAll[base+n] = 3; threatBufAll[base+n] = popcount64(computeWinningPositions(mb) & ~scratchMask); n++; }
  if ((safe & 4) != 0) { playMove(position, mask, 2); const mb = scratchMask ^ scratchPosition; colBufAll[base+n] = 2; threatBufAll[base+n] = popcount64(computeWinningPositions(mb) & ~scratchMask); n++; }
  if ((safe & 16) != 0) { playMove(position, mask, 4); const mb = scratchMask ^ scratchPosition; colBufAll[base+n] = 4; threatBufAll[base+n] = popcount64(computeWinningPositions(mb) & ~scratchMask); n++; }
  if ((safe & 2) != 0) { playMove(position, mask, 1); const mb = scratchMask ^ scratchPosition; colBufAll[base+n] = 1; threatBufAll[base+n] = popcount64(computeWinningPositions(mb) & ~scratchMask); n++; }
  if ((safe & 32) != 0) { playMove(position, mask, 5); const mb = scratchMask ^ scratchPosition; colBufAll[base+n] = 5; threatBufAll[base+n] = popcount64(computeWinningPositions(mb) & ~scratchMask); n++; }
  if ((safe & 1) != 0) { playMove(position, mask, 0); const mb = scratchMask ^ scratchPosition; colBufAll[base+n] = 0; threatBufAll[base+n] = popcount64(computeWinningPositions(mb) & ~scratchMask); n++; }
  if ((safe & 64) != 0) { playMove(position, mask, 6); const mb = scratchMask ^ scratchPosition; colBufAll[base+n] = 6; threatBufAll[base+n] = popcount64(computeWinningPositions(mb) & ~scratchMask); n++; }

  // tri par selection decroissant sur threatBufAll[base..base+n) (n <= 7)
  for (let i = 0; i < n - 1; i++) {
    let maxIdx = i;
    for (let j = i + 1; j < n; j++) {
      if (threatBufAll[base+j] > threatBufAll[base+maxIdx]) maxIdx = j;
    }
    if (maxIdx != i) {
      const tc = threatBufAll[base+i]; threatBufAll[base+i] = threatBufAll[base+maxIdx]; threatBufAll[base+maxIdx] = tc;
      const cc = colBufAll[base+i]; colBufAll[base+i] = colBufAll[base+maxIdx]; colBufAll[base+maxIdx] = cc;
    }
  }

  for (let i = 0; i < n; i++) {
    const c = colBufAll[base+i];
    playMove(position, mask, c);
    const nextPos = scratchPosition, nextMask = scratchMask;
    const score = -negamax(nextPos, nextMask, moveCount + 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }

  let flag: i32;
  if (best <= alphaOrig) flag = 2;
  else if (best >= beta) flag = 1;
  else flag = 0;
  ttSet(key, best, flag);

  return best;
}

function solve(position: i64, mask: i64, moveCount: i32): i32 {
  let min: i32 = -(TOTAL_CELLS - moveCount);
  let max: i32 = TOTAL_CELLS - moveCount;
  while (min < max) {
    let med = min + ((max - min) >> 1);
    if (med <= 0 && (min >> 1) < med) med = min >> 1;
    else if (med >= 0 && (max >> 1) > med) med = max >> 1;
    const r = negamax(position, mask, moveCount, med, med + 1);
    if (r <= med) max = r; else min = r;
  }
  return min;
}

// Resout un coup unique dans une colonne pour la position/mask donnee (position
// et mask relatifs au joueur au trait, comme dans main.js). Retourne le nombre
// de coups signe (positif = victoire, negatif = defaite, 0 = nul), ou -9999 si
// la colonne n'est pas jouable.
export function solveColumn(position: i64, mask: i64, moveCount: i32, col: i32): i32 {
  if (!canPlay(mask, col)) return -9999;
  if (isWinningMove(position, mask, col)) return 1;
  playMove(position, mask, col);
  const nextPos = scratchPosition, nextMask = scratchMask;
  const score = solve(nextPos, nextMask, moveCount + 1);
  if (score == 0) return 0;
  if (score < 0) return (WIN_SCORE + score) - (moveCount + 1);
  return -((WIN_SCORE - score) - (moveCount + 1));
}

export function canPlayExport(mask: i64, col: i32): i32 {
  return canPlay(mask, col) ? 1 : 0;
}

export function ttUsedCount(): i32 {
  let n = 0;
  for (let i = 0; i < TT_SIZE; i++) if (ttUsed[i]) n++;
  return n;
}
