'use strict';
// Construit le livre d'ouverture (BFS jusqu'a une profondeur donnee) en utilisant
// le solveur WASM (build/solver.wasm, grande TT) au lieu du solveur JS/BigInt :
// meme algorithme que tools/build-book.js, mais ~15x plus rapide.
const fs = require('fs');
const path = require('path');

const BOOK_DEPTH = parseInt(process.argv[2] || '8', 10);
const OUT_FILE = process.argv[3] || path.join(__dirname, '..', 'js', 'book.js');
const STATUS_FILE = path.join(__dirname, 'status-book.txt');

function bottomMask(col){ return 1n << BigInt(col*7); }
function columnMask(col){ return 63n << BigInt(col*7); }
function canPlayJS(mask, col){ return (mask & (1n << BigInt(col*7+5))) === 0n; }
function playMove(position, mask, col){
  const newBit = (mask + bottomMask(col)) & columnMask(col);
  return { position: mask ^ position, mask: mask | newBit };
}
function mirrorBoard(bb){
  let res = 0n;
  for (let c = 0; c < 7; c++){
    const col = (bb >> BigInt(c*7)) & 127n;
    res |= col << BigInt((6-c)*7);
  }
  return res;
}
function keyOfStr(position, mask){
  const k1 = position + mask;
  const k2 = mirrorBoard(position) + mirrorBoard(mask);
  return String(k1 < k2 ? k1 : k2);
}

function writeStatus(text){ try { fs.writeFileSync(STATUS_FILE, text, 'utf8'); } catch(e){} }

function saveBook(book, done){
  const entries = Array.from(book.entries());
  const header = `'use strict';\n// Livre d'ouverture Puissance 4 - genere hors-ligne (WASM) par tools/build-book-wasm.js\n// ${entries.length} positions, profondeur ${BOOK_DEPTH}${done ? ' (complet)' : ' (partiel)'}\nconst P4_BOOK = {\n`;
  const body = entries.map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',\n');
  const footer = '\n};\nif (typeof module !== "undefined") module.exports = P4_BOOK;\n';
  fs.writeFileSync(OUT_FILE, header + body + footer, 'utf8');
}

function loadExistingBook(){
  const book = new Map();
  try {
    if (!fs.existsSync(OUT_FILE)) return book;
    delete require.cache[require.resolve(OUT_FILE)];
    const existing = require(OUT_FILE);
    for (const [k, v] of Object.entries(existing)) book.set(k, v);
  } catch (e){ /* pas de livre existant valide : on repart de zero */ }
  return book;
}

async function main(){
  const bytes = fs.readFileSync(__dirname + '/build/solver.wasm');
  const t0 = Date.now();
  let lastLog = Date.now();
  const imports = {
    env: {
      abort(){ throw new Error('abort'); },
      onProgress(nodeCount){
        const now = Date.now();
        if (now - lastLog > 2000){
          lastLog = now;
          writeStatus(`noeuds=${nodeCount} elapsed_s=${((now-t0)/1000).toFixed(0)}`);
        }
      }
    }
  };
  const { instance } = await WebAssembly.instantiate(bytes, imports);
  const exp = instance.exports;
  const MOVE_ORDER = [3, 2, 4, 1, 5, 0, 6];

  const book = loadExistingBook();
  const resumedCount = book.size;
  console.log(`Reprise : ${resumedCount} position(s) deja dans le livre existant.`);

  const visited = new Set();
  let queue = [{ position: 0n, mask: 0n, moveCount: 0 }];
  visited.add(keyOfStr(0n, 0n));

  let depth = 0;
  while (queue.length > 0 && depth < BOOK_DEPTH){
    console.log(`Profondeur ${depth}: ${queue.length} position(s)`);
    const nextQueue = [];
    let processed = 0;
    let skipped = 0;
    for (const pos of queue){
      const key = keyOfStr(pos.position, pos.mask);
      let results = book.get(key);
      if (results === undefined){
        results = [];
        for (const c of MOVE_ORDER){
          if (!canPlayJS(pos.mask, c)) continue;
          const plies = exp.solveColumn(pos.position, pos.mask, pos.moveCount, c);
          results.push([c, plies]);
        }
        book.set(key, results);
        saveBook(book, false); // sauvegarde apres CHAQUE position nouvellement calculee (resilience face a une interruption)
      } else {
        skipped++;
      }
      processed++;
      writeStatus(`profondeur=${depth} position=${processed}/${queue.length} (reprises=${skipped}) noeuds_total=${exp.getNodeCount()} elapsed_s=${((Date.now()-t0)/1000).toFixed(0)} livre=${book.size}`);
      if (processed % 10 === 0 || processed === queue.length){
        console.log(`  [${processed}/${queue.length}] profondeur ${depth} -- livre=${book.size} (dont ${skipped} deja connues) -- ${((Date.now()-t0)/1000).toFixed(0)}s`);
      }
      for (let c = 0; c < 7; c++){
        if (!canPlayJS(pos.mask, c)) continue;
        const next = playMove(pos.position, pos.mask, c);
        const k = keyOfStr(next.position, next.mask);
        if (visited.has(k)) continue;
        visited.add(k);
        nextQueue.push({ position: next.position, mask: next.mask, moveCount: pos.moveCount + 1 });
      }
    }
    queue = nextQueue;
    depth++;
  }

  saveBook(book, true);
  writeStatus(`TERMINE: ${book.size} positions, ${((Date.now()-t0)/1000).toFixed(0)}s`);
  console.log(`TERMINE : ${book.size} positions -> ${OUT_FILE}`);
}

main().catch(e => { writeStatus('ERREUR: ' + e.message); console.error(e); process.exit(1); });
