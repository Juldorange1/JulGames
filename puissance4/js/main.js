'use strict';

/*
 * Puissance 4 - plateau 7 colonnes x 6 lignes, bitboard "1 colonne = 7 bits"
 * (6 cases + 1 bit sentinelle en haut), representation relative au joueur au
 * trait : `position` = pions du joueur qui doit jouer, `mask` = toutes les
 * cases occupees. Le solveur (negamax + alpha-beta + table de transposition)
 * tourne dans un Web Worker cree depuis un Blob pour rester compatible file://.
 */

const CORE_SRC = `
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

function canonicalKeyInfo(position, mask){
  const k1 = position + mask;
  const k2 = mirrorBoard(position) + mirrorBoard(mask);
  return k1 <= k2 ? { key: Number(k1), mirrored: false } : { key: Number(k2), mirrored: true };
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
`;

// Solveur compile en WebAssembly (AssemblyScript) depuis puissance4/tools/asbuild
// (meme algorithme que ci-dessus, mais en i64 natifs au lieu de BigInt : environ
// 15x plus rapide, ce qui ramene la plupart des positions bien sous 10s). Encode
// en base64 et embarque directement pour rester compatible file://.
const WASM_B64 = "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";

const WORKER_SRC = `
const MOVE_ORDER = [3, 2, 4, 1, 5, 0, 6];
const WASM_B64 = "${WASM_B64}";

function base64ToBytes(b64){
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

let wasm = null;
let currentRequestId = null;

const wasmReady = WebAssembly.instantiate(base64ToBytes(WASM_B64), {
  env: {
    abort(){ /* deja valide hors-ligne : ne devrait jamais se declencher */ },
    onProgress(nodeCount){
      self.postMessage({ type: 'progress', requestId: currentRequestId, nodes: Number(nodeCount) });
    }
  }
}).then((result) => { wasm = result.instance.exports; });

function analyzePosition(position, mask, moveCount, requestId){
  wasm.resetNodeCount();
  const startTime = Date.now();
  for (const c of MOVE_ORDER){
    if (!wasm.canPlayExport(mask, c)) continue;
    const signedPlies = wasm.solveColumn(position, mask, moveCount, c);
    let outcome, plies;
    if (signedPlies === 0){ outcome = 'draw'; plies = 0; }
    else if (signedPlies > 0){ outcome = 'win'; plies = signedPlies; }
    else { outcome = 'loss'; plies = -signedPlies; }
    self.postMessage({
      type: 'result-col', requestId, col: c, outcome, plies,
      nodes: Number(wasm.getNodeCount()), elapsed: Date.now() - startTime
    });
  }
  self.postMessage({
    type: 'done', requestId, nodes: Number(wasm.getNodeCount()),
    elapsed: Date.now() - startTime, ttSize: wasm.ttUsedCount()
  });
}

self.onmessage = async function(e){
  const msg = e.data;
  await wasmReady;
  if (msg.type === 'analyze'){
    currentRequestId = msg.requestId;
    analyzePosition(BigInt(msg.position), BigInt(msg.mask), msg.moveCount, msg.requestId);
  }
};
`;

const core = new Function(CORE_SRC + 'return { canPlay, playMove, isWinningMove, canonicalKeyInfo };')();

const book = (typeof P4_BOOK !== 'undefined') ? P4_BOOK : null;

let worker = null;
try {
  const blob = new Blob([WORKER_SRC], { type: 'text/javascript' });
  worker = new Worker(URL.createObjectURL(blob));
} catch (err) {
  worker = null;
}

// --- Etat de la partie ---------------------------------------------------

let position = 0n;
let mask = 0n;
let moveCount = 0;
let board = makeEmptyBoard();
let currentPlayer = 1;
let gameOver = false;
let winner = 0;
let winCells = [];
let history = [];
let requestId = 0;
let analysisEnabled = true;

function makeEmptyBoard(){
  return Array.from({ length: 7 }, () => Array(6).fill(0));
}

function columnHeight(c){
  let h = 0;
  while (h < 6 && board[c][h] !== 0) h++;
  return h;
}

function inBounds(c, r){
  return c >= 0 && c < 7 && r >= 0 && r < 6;
}

function findWinningCells(c, row, player){
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dc, dr] of dirs){
    const line = [[c, row]];
    let cc = c + dc, rr = row + dr;
    while (inBounds(cc, rr) && board[cc][rr] === player){ line.push([cc, rr]); cc += dc; rr += dr; }
    cc = c - dc; rr = row - dr;
    while (inBounds(cc, rr) && board[cc][rr] === player){ line.unshift([cc, rr]); cc -= dc; rr -= dr; }
    if (line.length >= 4) return line;
  }
  return [];
}

function snapshot(){
  return {
    position, mask, moveCount, currentPlayer, gameOver, winner,
    winCells: winCells.slice(),
    board: board.map((col) => col.slice())
  };
}

function restoreSnapshot(s){
  position = s.position;
  mask = s.mask;
  moveCount = s.moveCount;
  currentPlayer = s.currentPlayer;
  gameOver = s.gameOver;
  winner = s.winner;
  winCells = s.winCells.slice();
  board = s.board.map((col) => col.slice());
}

function newGame(){
  position = 0n;
  mask = 0n;
  moveCount = 0;
  board = makeEmptyBoard();
  currentPlayer = 1;
  gameOver = false;
  winner = 0;
  winCells = [];
  history = [snapshot()];
  renderBoard();
  updateStatus();
  requestAnalysisIfNeeded();
}

function onColumnClick(c){
  if (gameOver) return;
  const row = columnHeight(c);
  if (row >= 6) return;

  const wins = core.isWinningMove(position, mask, c);
  board[c][row] = currentPlayer;
  const next = core.playMove(position, mask, c);
  position = next.position;
  mask = next.mask;
  moveCount++;

  if (wins){
    gameOver = true;
    winner = currentPlayer;
    winCells = findWinningCells(c, row, currentPlayer);
  } else if (moveCount === 42){
    gameOver = true;
    winner = 0;
  } else {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
  }

  history.push(snapshot());
  renderBoard();
  updateStatus();
  requestAnalysisIfNeeded();
}

function undo(){
  if (history.length <= 1) return;
  history.pop();
  restoreSnapshot(history[history.length - 1]);
  renderBoard();
  updateStatus();
  requestAnalysisIfNeeded();
}

// --- Rendu -----------------------------------------------------------------

const boardEl = document.getElementById('board');
const scoresEl = document.getElementById('scores');
const statusEl = document.getElementById('status');
const analysisStateEl = document.getElementById('analysis-state');
const analysisNodesEl = document.getElementById('analysis-nodes');
const btnUndo = document.getElementById('btn-undo');
const toggleAnalysis = document.getElementById('toggle-analysis');

const boardCells = Array.from({ length: 7 }, () => Array(6));
const scoreCells = Array(7);

function setColHover(c, on){
  for (let r = 0; r < 6; r++) boardCells[c][r].classList.toggle('col-hover', on);
}

for (let r = 0; r < 6; r++){
  for (let c = 0; c < 7; c++){
    const gameRow = 5 - r;
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.addEventListener('click', () => onColumnClick(c));
    cell.addEventListener('mouseenter', () => setColHover(c, true));
    cell.addEventListener('mouseleave', () => setColHover(c, false));
    boardEl.appendChild(cell);
    boardCells[c][gameRow] = cell;
  }
}

for (let c = 0; c < 7; c++){
  const cell = document.createElement('div');
  cell.className = 'score-cell';
  cell.addEventListener('click', () => onColumnClick(c));
  cell.addEventListener('mouseenter', () => setColHover(c, true));
  cell.addEventListener('mouseleave', () => setColHover(c, false));
  scoresEl.appendChild(cell);
  scoreCells[c] = cell;
}

function renderBoard(){
  for (let c = 0; c < 7; c++){
    for (let r = 0; r < 6; r++){
      const el = boardCells[c][r];
      el.classList.remove('red', 'yellow', 'win-cell');
      const v = board[c][r];
      if (v === 1) el.classList.add('red');
      else if (v === 2) el.classList.add('yellow');
    }
  }
  for (const [c, r] of winCells) boardCells[c][r].classList.add('win-cell');
}

function updateStatus(){
  if (gameOver){
    statusEl.className = 'status ' + (winner === 0 ? 'draw' : (winner === 1 ? 'winner-red' : 'winner-yellow'));
    statusEl.textContent = winner === 0 ? 'Match nul !' : (winner === 1 ? 'Les Rouges gagnent !' : 'Les Jaunes gagnent !');
  } else {
    statusEl.className = 'status';
    statusEl.textContent = '';
    statusEl.append('Trait aux ');
    const span = document.createElement('span');
    span.className = currentPlayer === 1 ? 'turn-red' : 'turn-yellow';
    span.textContent = currentPlayer === 1 ? 'Rouges' : 'Jaunes';
    statusEl.append(span);
  }
  btnUndo.disabled = history.length <= 1;
}

function setScoreCellClasses(c, extra){
  const playable = columnHeight(c) < 6;
  scoreCells[c].className = 'score-cell' + (playable ? ' playable' : '') + (extra ? ' ' + extra : '');
}

function clearScoreCells(){
  for (let c = 0; c < 7; c++){
    setScoreCellClasses(c, '');
    scoreCells[c].textContent = '';
  }
}

function resetScoreCellsToPlain(){
  for (let c = 0; c < 7; c++){
    const playable = columnHeight(c) < 6;
    setScoreCellClasses(c, '');
    scoreCells[c].textContent = playable ? '·' : '';
  }
}

function setScoreCellsPending(){
  for (let c = 0; c < 7; c++){
    const playable = columnHeight(c) < 6;
    setScoreCellClasses(c, 'pending');
    scoreCells[c].textContent = playable ? '...' : '';
  }
}

function applyColumnResult(col, outcome, plies){
  const el = scoreCells[col];
  let extra = 'playable';
  let text = '';
  if (outcome === 'win'){ extra += ' win'; text = '+' + plies; }
  else if (outcome === 'loss'){ extra += ' loss'; text = '-' + plies; }
  else { extra += ' draw'; text = '='; }
  el.className = 'score-cell ' + extra;
  el.textContent = text;
  el.title = outcome === 'win'
    ? `Victoire dans ${plies} coup(s) avec un jeu parfait`
    : outcome === 'loss'
      ? `Defaite dans ${plies} coup(s) si l'adversaire joue parfaitement`
      : 'Partie nulle avec un jeu parfait des deux cotes';
}

function applySignedPlies(col, signedPlies){
  if (signedPlies === 0) applyColumnResult(col, 'draw', 0);
  else if (signedPlies > 0) applyColumnResult(col, 'win', signedPlies);
  else applyColumnResult(col, 'loss', -signedPlies);
}

function lookupBook(){
  if (!book) return null;
  const info = core.canonicalKeyInfo(position, mask);
  const entry = book[String(info.key)];
  if (!entry) return null;
  return { entry, mirrored: info.mirrored };
}

function requestAnalysisIfNeeded(){
  requestId++;
  const myId = requestId;

  if (gameOver){
    analysisStateEl.textContent = 'Partie terminee';
    analysisNodesEl.textContent = '';
    clearScoreCells();
    return;
  }

  const hit = lookupBook();
  if (hit){
    setScoreCellsPending();
    for (const [bookCol, plies] of hit.entry){
      const realCol = hit.mirrored ? 6 - bookCol : bookCol;
      applySignedPlies(realCol, plies);
    }
    analysisStateEl.textContent = 'Analyse instantanee (livre d\'ouverture precalcule)';
    analysisNodesEl.textContent = '';
    return;
  }

  if (!worker){
    analysisStateEl.textContent = 'Web Worker indisponible : analyse desactivee';
    analysisNodesEl.textContent = '';
    resetScoreCellsToPlain();
    return;
  }
  if (!analysisEnabled){
    analysisStateEl.textContent = "Analyse desactivee";
    analysisNodesEl.textContent = '';
    resetScoreCellsToPlain();
    return;
  }

  analysisStateEl.textContent = 'Analyse en cours...';
  analysisNodesEl.textContent = '';
  setScoreCellsPending();
  worker.postMessage({
    type: 'analyze', requestId: myId,
    position: position.toString(), mask: mask.toString(), moveCount
  });
}

if (worker){
  worker.onmessage = function(e){
    const msg = e.data;
    if (msg.requestId !== undefined && msg.requestId !== requestId) return;

    if (msg.type === 'result-col'){
      applyColumnResult(msg.col, msg.outcome, msg.plies);
    } else if (msg.type === 'progress'){
      analysisNodesEl.textContent = msg.nodes.toLocaleString('fr-FR') + ' positions analysees...';
    } else if (msg.type === 'done'){
      analysisStateEl.textContent = 'Analyse terminee en ' + (msg.elapsed / 1000).toFixed(1) + ' s';
      analysisNodesEl.textContent = msg.nodes.toLocaleString('fr-FR') + ' positions calculees (cache : ' + msg.ttSize.toLocaleString('fr-FR') + ')';
    }
  };
} else {
  toggleAnalysis.checked = false;
  toggleAnalysis.disabled = true;
}

document.getElementById('btn-new').addEventListener('click', newGame);
btnUndo.addEventListener('click', undo);
toggleAnalysis.addEventListener('change', (e) => {
  analysisEnabled = e.target.checked;
  requestAnalysisIfNeeded();
});

analysisEnabled = toggleAnalysis.checked;
newGame();
