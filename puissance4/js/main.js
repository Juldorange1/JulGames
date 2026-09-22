'use strict';

/*
 * Puissance 4 - plateau 7 colonnes x 6 lignes, bitboard "1 colonne = 7 bits"
 * (6 cases + 1 bit sentinelle en haut), representation relative au joueur au
 * trait : `position` = pions du joueur qui doit jouer, `mask` = toutes les
 * cases occupees. Utilise pour la logique de jeu locale (affichage, detection
 * de victoire immediate) - independant du solveur.
 *
 * Le solveur exact est le moteur de reference de Pascal Pons (Connect 4 Game
 * Solver, AGPL-3.0), compile en WebAssembly par le projet connect4-solver de
 * Khoding, avec son livre d'ouverture precalcule (js/vendor/7x6.book). Voir
 * js/vendor/README.md pour l'attribution complete.
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
`;

const core = new Function(CORE_SRC + 'return { canPlay, playMove, isWinningMove };')();

// --- Solveur externe (Pons/Khoding, WASM + livre d'ouverture) --------------

let solverMod = null;
let solverError = null;
const solverReady = (async () => {
  if (location.protocol === 'file:'){
    throw new Error(
      "Le jeu est ouvert directement (fichier local) : le navigateur bloque le " +
      "chargement du livre d'ouverture (33 Mo) dans ce mode. Double-cliquez sur " +
      "lancer-le-jeu.bat (dans le dossier puissance4) pour lancer un petit serveur " +
      "local, ou ouvrez http://localhost:5575 si un serveur tourne deja."
    );
  }
  const mod = await createC4Solver({ locateFile: (path) => 'js/vendor/' + path });
  const res = await fetch('js/vendor/7x6.book');
  if (!res.ok) throw new Error(`Impossible de charger le livre d'ouverture (HTTP ${res.status}). Verifiez que le serveur local sert bien js/vendor/7x6.book.`);
  const buf = await res.arrayBuffer();
  mod.FS.writeFile('/7x6.book', new Uint8Array(buf));
  mod.ccall('load_book', 'number', ['string'], ['/7x6.book']);
  solverMod = mod;
  return mod;
})().catch((err) => {
  solverError = err;
  throw err;
});

// Convertit le score du solveur (echelle "demi-coups" de Pons) en nombre de
// coups signe (positif = victoire dans N coups, negatif = defaite dans N,
// 0 = nul), coherent avec l'affichage du jeu. Formule derivee de Solver.cpp
// (negamax retourne une magnitude fixe tout du long de la recursion, egale a
// floor((43 - M) / 2) ou M = nb de pions juste avant le coup gagnant final ;
// on desambiguise M via la parite du joueur qui gagne) et validee par suivi
// de la ligne de jeu optimale (le compteur doit decroitre de 1 a chaque coup).
function pliesFromScore(score, moveCountBefore, isImmediate){
  if (isImmediate) return 1;
  if (score === 0) return 0;
  const sign = score > 0 ? 1 : -1;
  const abs = Math.abs(score);
  const targetParity = sign > 0 ? (moveCountBefore % 2) : ((moveCountBefore + 1) % 2);
  let m = 43 - 2 * abs;
  if (((m % 2) + 2) % 2 !== targetParity) m = 42 - 2 * abs;
  return sign * (m - moveCountBefore);
}

// --- Etat de la partie ---------------------------------------------------

let position = 0n;
let mask = 0n;
let moveCount = 0;
let board = makeEmptyBoard();
let moveSequence = [];
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
    board: board.map((col) => col.slice()),
    moveSequence: moveSequence.slice()
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
  moveSequence = s.moveSequence.slice();
}

function newGame(){
  position = 0n;
  mask = 0n;
  moveCount = 0;
  board = makeEmptyBoard();
  moveSequence = [];
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
  moveSequence.push(c);

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

async function requestAnalysisIfNeeded(){
  requestId++;
  const myId = requestId;

  if (gameOver){
    analysisStateEl.textContent = 'Partie terminee';
    analysisNodesEl.textContent = '';
    clearScoreCells();
    return;
  }
  if (!analysisEnabled){
    analysisStateEl.textContent = "Analyse desactivee";
    analysisNodesEl.textContent = '';
    resetScoreCellsToPlain();
    return;
  }

  analysisStateEl.textContent = solverMod ? 'Analyse en cours...' : 'Chargement du solveur (livre 33 Mo, une seule fois)...';
  analysisNodesEl.textContent = '';
  analysisNodesEl.classList.remove('error-msg');
  setScoreCellsPending();

  let mod;
  try {
    mod = await solverReady;
  } catch (err){
    if (myId !== requestId) return;
    analysisStateEl.textContent = 'Analyse indisponible';
    analysisNodesEl.textContent = (solverError && solverError.message) || String(err);
    analysisNodesEl.classList.add('error-msg');
    resetScoreCellsToPlain();
    return;
  }
  if (myId !== requestId) return; // une position plus recente a deja ete demandee

  const movesStr = moveSequence.map((c) => c + 1).join('');
  const startTime = performance.now();
  const ptr = mod.ccall('analyze', 'number', ['string'], [movesStr]);
  const scores = [];
  for (let i = 0; i < 7; i++) scores.push(mod.getValue(ptr + i * 4, 'i32'));
  const nodes = mod.ccall('get_node_count', 'number', [], []);
  const elapsed = performance.now() - startTime;

  if (myId !== requestId) return;

  for (let c = 0; c < 7; c++){
    if (columnHeight(c) >= 6) continue;
    const immediate = core.isWinningMove(position, mask, c);
    const plies = pliesFromScore(scores[c], moveCount, immediate);
    applySignedPlies(c, plies);
  }

  analysisStateEl.textContent = `Analyse terminee en ${elapsed.toFixed(1)} ms`;
  analysisNodesEl.textContent = `${Number(nodes).toLocaleString('fr-FR')} positions calculees`;
}

document.getElementById('btn-new').addEventListener('click', newGame);
btnUndo.addEventListener('click', undo);
toggleAnalysis.addEventListener('change', (e) => {
  analysisEnabled = e.target.checked;
  requestAnalysisIfNeeded();
});

analysisEnabled = toggleAnalysis.checked;
newGame();
