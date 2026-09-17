'use strict';
const fs = require('fs');

async function main(){
  const bytes = fs.readFileSync(__dirname + '/build/solver-runtime.wasm');
  const imports = { env: { abort(){ throw new Error('abort'); }, onProgress(){} } };
  const { instance } = await WebAssembly.instantiate(bytes, imports);
  const exp = instance.exports;

  function bottomMask(col){ return 1n << BigInt(col*7); }
  function columnMask(col){ return 63n << BigInt(col*7); }
  function playMove(position, mask, col){
    const newBit = (mask + bottomMask(col)) & columnMask(col);
    return { position: mask ^ position, mask: mask | newBit };
  }

  let position = 0n, mask = 0n;
  const seq = [0,1,2,3,4,5,6, 0,1,2,3,4,5,6, 0,1,2,3,4,5,6];
  for (const c of seq){ const n = playMove(position, mask, c); position = n.position; mask = n.mask; }
  const expected = [1,-1,1,-1,1,-1,1];
  let ok = true;
  for (let c = 0; c < 7; c++){
    const r = exp.solveColumn(position, mask, 21, c);
    if (r !== expected[c]) ok = false;
    console.log(`col${c}: ${r} (attendu ${expected[c]})`);
  }
  console.log(ok ? 'OK (test 21 coups)' : 'ECHEC');

  exp.resetNodeCount();
  let position2 = 0n, mask2 = 0n;
  const seq2 = [3,3,4,2,3,4,2,5,1,3];
  for (const c of seq2){ const n = playMove(position2, mask2, c); position2 = n.position; mask2 = n.mask; }
  const t0 = Date.now();
  const results2 = [];
  for (let c = 0; c < 7; c++){
    if (exp.canPlayExport(mask2, c) === 0) continue;
    results2.push([c, exp.solveColumn(position2, mask2, 10, c)]);
  }
  console.log('Position 10 coups:', results2, 'temps:', Date.now()-t0, 'ms, noeuds:', exp.getNodeCount().toString());
}

main().catch(e => { console.error(e); process.exit(1); });
