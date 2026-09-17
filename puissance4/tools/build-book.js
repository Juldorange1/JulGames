'use strict';

/*
 * Construit hors-ligne un "livre d'ouverture" pour Puissance 4 : resout
 * exactement (negamax + alpha-beta + table de transposition) toutes les
 * positions atteignables jusqu'a une profondeur donnee, et enregistre pour
 * chacune le resultat exact (victoire/defaite/nul + nombre de coups) de
 * chaque colonne jouable. Le calcul est lourd (c'est la meme raison pour
 * laquelle le solveur de reference utilise un livre precalcule plutot que de
 * tout recalculer a chaque partie) mais ne tourne qu'une fois, ici, pas dans
 * le navigateur du joueur.
 *
 * Usage: node build-book.js [profondeur] [sortie.js]
 */

const fs = require('fs');
const path = require('path');

const BOOK_DEPTH = parseInt(process.argv[2] || '8', 10);
const OUT_FILE = process.argv[3] || path.join(__dirname, '..', 'js', 'book.js');
const CHECKPOINT_FILE = path.join(__dirname, 'book.checkpoint.json');
const STATUS_FILE = path.join(__dirname, 'status.txt');

function writeStatus(text){
  try { fs.writeFileSync(STATUS_FILE, text, 'utf8'); } catch (e) { /* ignore */ }
}

// --- Bitboard (identique a puissance4/js/main.js, valide par tests unitaires) ---

function bottomMask(col){ return 1n << BigInt(col * 7); }
function topMask(col){ return 1n << BigInt(col * 7 + 5); }
function columnMask(col){ return 63n << BigInt(col * 7); }

function canPlay(mask, col){
  return (mask & topMask(col)) === 0n;
}

function playMove(position, mask, col){
  const newBit = (mask + bottomMask(col)) & columnMask(col);
  return { position: mask ^ position, mask: mask | newBit };
}

function isWinningMove(position, mask, col){
  const newBit = (mask + bottomMask(col)) & columnMask(col);
  return alignment(position | newBit);
}

function alignment(bb){
  let m;
  m = bb & (bb >> 7n);  if (m & (m >> 14n)) return true;
  m = bb & (bb >> 6n);  if (m & (m >> 12n)) return true;
  m = bb & (bb >> 8n);  if (m & (m >> 16n)) return true;
  m = bb & (bb >> 1n);  if (m & (m >> 2n)) return true;
  return false;
}

function mirrorBoard(bb){
  let res = 0n;
  for (let c = 0; c < 7; c++){
    const col = (bb >> BigInt(c * 7)) & 127n;
    res |= col << BigInt((6 - c) * 7);
  }
  return res;
}

function keyOf(position, mask){
  const k1 = position + mask;
  const k2 = mirrorBoard(position) + mirrorBoard(mask);
  return Number(k1 < k2 ? k1 : k2);
}

let BOARD_MASK = 0n;
for (let c = 0; c < 7; c++) BOARD_MASK |= columnMask(c);

function verticalThreats(bb){
  return (bb << 1n) & (bb << 2n) & (bb << 3n);
}
function threatsForShift(bb, s){
  const s2 = s * 2n, s3 = s * 3n;
  let r = (bb << s) & (bb << s2) & (bb << s3);
  r |= (bb << s) & (bb << s2) & (bb >> s);
  r |= (bb << s) & (bb >> s) & (bb >> s2);
  r |= (bb >> s) & (bb >> s2) & (bb >> s3);
  return r;
}
function computeWinningPositions(bb){
  let r = verticalThreats(bb);
  r |= threatsForShift(bb, 7n);
  r |= threatsForShift(bb, 6n);
  r |= threatsForShift(bb, 8n);
  return r & BOARD_MASK;
}

function popcount(bb){
  let n = 0;
  while (bb !== 0n){ bb &= bb - 1n; n++; }
  return n;
}

function nonLosingMoveMask(position, mask){
  const opponentWin = computeWinningPositions(mask ^ position) & ~mask;
  const safe = [false, false, false, false, false, false, false];
  let any = false;
  for (let c = 0; c < 7; c++){
    if (!canPlay(mask, c)) continue;
    const newBit = (mask + bottomMask(c)) & columnMask(c);
    const aboveBit = (newBit << 1n) & columnMask(c);
    if ((aboveBit & opponentWin) === 0n){ safe[c] = true; any = true; }
  }
  return any ? safe : null;
}

// --- Table de transposition : tableau type + somme de controle -------------
// (beaucoup plus compacte et rapide qu'une Map<BigInt,...>, capacite bien plus
// grande que ce qu'on peut se permettre dans un onglet de navigateur)

const TT = new Map();

function ttGet(key){
  const raw = TT.get(key);
  if (raw === undefined) return null;
  return { value: Math.floor(raw / 4) - 64, flag: raw % 4 };
}
function ttSet(key, value, flag){
  TT.set(key, (value + 64) * 4 + flag);
}

// --- Solveur (negamax + alpha-beta + narrowing par fenetre nulle) ----------

const TOTAL_CELLS = 42;
const WIN_SCORE = TOTAL_CELLS + 1;
const MOVE_ORDER = [3, 2, 4, 1, 5, 0, 6];

let nodeCount = 0;
let lastLog = Date.now();
let currentDepth = 0;
let currentQueuePos = 0;
let currentQueueLen = 0;
const t0 = Date.now();

function negamax(position, mask, moveCount, alpha, beta){
  nodeCount++;
  if ((nodeCount & 0x3FFFF) === 0){
    const now = Date.now();
    if (now - lastLog > 2000){
      lastLog = now;
      writeStatus(`noeuds=${nodeCount} elapsed_s=${((now - t0) / 1000).toFixed(0)} depth=${currentDepth} queuePos=${currentQueuePos}/${currentQueueLen}`);
    }
  }
  if (moveCount === TOTAL_CELLS) return 0;

  for (let c = 0; c < 7; c++){
    if (canPlay(mask, c) && isWinningMove(position, mask, c)){
      return WIN_SCORE - (moveCount + 1);
    }
  }

  let maxScore = TOTAL_CELLS - 1 - moveCount;
  if (beta > maxScore){
    beta = maxScore;
    if (alpha >= beta) return beta;
  }

  const safe = nonLosingMoveMask(position, mask);
  if (!safe) return -maxScore;

  const key = keyOf(position, mask);
  const cached = ttGet(key);
  if (cached){
    if (cached.flag === 0) return cached.value;
    if (cached.flag === 1){ if (cached.value > alpha) alpha = cached.value; }
    else { if (cached.value < beta) beta = cached.value; }
    if (alpha >= beta) return cached.value;
  }

  const alphaOrig = alpha;
  let best = -1000;

  const candidates = [];
  for (const c of MOVE_ORDER){
    if (!safe[c]) continue;
    const next = playMove(position, mask, c);
    const moverBits = next.mask ^ next.position;
    const threatCount = popcount(computeWinningPositions(moverBits) & ~next.mask);
    candidates.push({ next, threatCount });
  }
  candidates.sort((a, b) => b.threatCount - a.threatCount);

  for (const cand of candidates){
    const score = -negamax(cand.next.position, cand.next.mask, moveCount + 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }

  let flag;
  if (best <= alphaOrig) flag = 2;
  else if (best >= beta) flag = 1;
  else flag = 0;
  ttSet(key, best, flag);

  return best;
}

function solve(position, mask, moveCount){
  let min = -(TOTAL_CELLS - moveCount);
  let max = TOTAL_CELLS - moveCount;
  while (min < max){
    let med = min + Math.floor((max - min) / 2);
    if (med <= 0 && Math.floor(min / 2) < med) med = Math.floor(min / 2);
    else if (med >= 0 && Math.floor(max / 2) > med) med = Math.floor(max / 2);
    const r = negamax(position, mask, moveCount, med, med + 1);
    if (r <= med) max = r; else min = r;
  }
  return min;
}

function analyzePosition(position, mask, moveCount){
  const results = [];
  for (let c = 0; c < 7; c++){
    if (!canPlay(mask, c)) continue;
    let plies;
    if (isWinningMove(position, mask, c)){
      plies = 1;
    } else {
      const next = playMove(position, mask, c);
      const score = solve(next.position, next.mask, moveCount + 1);
      if (score === 0) plies = 0;
      else if (score < 0) plies = (WIN_SCORE + score) - (moveCount + 1);
      else plies = -((WIN_SCORE - score) - (moveCount + 1));
    }
    results.push([c, plies]);
  }
  return results;
}

// --- Generation des positions du livre (BFS jusqu'a BOOK_DEPTH) ------------

function saveBook(book, done){
  const entries = Array.from(book.entries());
  const header = `'use strict';\n// Livre d'ouverture Puissance 4 - genere hors-ligne par tools/build-book.js\n// ${entries.length} positions, profondeur ${BOOK_DEPTH}${done ? ' (complet)' : ' (partiel, calcul en cours)'}\nconst P4_BOOK = {\n`;
  const body = entries.map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',\n');
  const footer = '\n};\nif (typeof module !== "undefined") module.exports = P4_BOOK;\n';
  fs.writeFileSync(OUT_FILE, header + body + footer, 'utf8');
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ depth: BOOK_DEPTH, count: entries.length, done }), 'utf8');
}

function main(){
  console.log(`Construction du livre d'ouverture jusqu'a profondeur ${BOOK_DEPTH}...`);
  const book = new Map();
  const visited = new Set();

  let queue = [{ position: 0n, mask: 0n, moveCount: 0 }];
  visited.add(keyOf(0n, 0n).toString());

  let depth = 0;
  while (queue.length > 0 && depth < BOOK_DEPTH){
    console.log(`Profondeur ${depth}: ${queue.length} position(s) a analyser...`);
    currentDepth = depth;
    currentQueueLen = queue.length;
    const nextQueue = [];
    let processed = 0;
    for (const pos of queue){
      currentQueuePos = processed;
      const results = analyzePosition(pos.position, pos.mask, pos.moveCount);
      book.set(keyOf(pos.position, pos.mask).toString(), results);
      processed++;
      writeStatus(`noeuds=${nodeCount} elapsed_s=${((Date.now() - t0) / 1000).toFixed(0)} depth=${depth} queuePos=${processed}/${queue.length} bookSize=${book.size}`);
      if (processed % 25 === 0 || processed === queue.length){
        console.log(`  [${processed}/${queue.length}] profondeur ${depth} -- ${nodeCount.toLocaleString('fr-FR')} noeuds cumules, ${((Date.now() - t0) / 1000).toFixed(0)} s ecoulees`);
        saveBook(book, false);
      }
      for (let c = 0; c < 7; c++){
        if (!canPlay(pos.mask, c)) continue;
        const next = playMove(pos.position, pos.mask, c);
        const k = keyOf(next.position, next.mask).toString();
        if (visited.has(k)) continue;
        visited.add(k);
        nextQueue.push({ position: next.position, mask: next.mask, moveCount: pos.moveCount + 1 });
      }
    }
    queue = nextQueue;
    depth++;
  }

  saveBook(book, true);
  console.log(`Termine : ${book.size} positions enregistrees dans ${OUT_FILE}`);
  console.log(`Total : ${nodeCount.toLocaleString('fr-FR')} noeuds, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

main();
