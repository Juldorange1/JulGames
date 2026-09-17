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

  // Position apres 1 coup (colonne 3), on teste combien de temps prend colonne 3 (reponse adverse au centre)
  let position = 0n, mask = 0n;
  const n1 = playMove(position, mask, 3);
  exp.resetNodeCount();
  const t0 = Date.now();
  const r = exp.solveColumn(n1.position, n1.mask, 1, 3);
  console.log(`Profondeur 1 (apres 1 coup), colonne 3: resultat=${r}, temps=${((Date.now()-t0)/1000).toFixed(2)}s, noeuds=${exp.getNodeCount()}`);
}
main().catch(e => { console.error(e); process.exit(1); });
