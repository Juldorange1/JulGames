'use strict';
const fs = require('fs');

async function main(){
  const bytes = fs.readFileSync(__dirname + '/build/solver.wasm');
  let lastLog = Date.now();
  const t0 = Date.now();
  const imports = {
    env: {
      abort(){ throw new Error('abort'); },
      onProgress(nodeCount){
        const now = Date.now();
        if (now - lastLog > 2000){
          lastLog = now;
          const elapsed = (now - t0) / 1000;
          const rate = (Number(nodeCount) / elapsed / 1e6).toFixed(2);
          fs.writeFileSync(__dirname + '/status.txt', `noeuds=${nodeCount} elapsed_s=${elapsed.toFixed(0)} rate_M=${rate}`, 'utf8');
        }
      }
    }
  };
  const { instance } = await WebAssembly.instantiate(bytes, imports);
  const exp = instance.exports;

  console.log('Resolution de la colonne centrale (3) depuis le plateau vide...');
  const r = exp.solveColumn(0n, 0n, 0, 3);
  const dt = Date.now() - t0;
  const result = `Resultat colonne 3 : ${r}  (temps: ${(dt/1000).toFixed(2)}s, noeuds: ${exp.getNodeCount().toString()})`;
  console.log(result);
  fs.writeFileSync(__dirname + '/status.txt', 'TERMINE: ' + result, 'utf8');
}

main().catch(e => { console.error(e); fs.writeFileSync(__dirname + '/status.txt', 'ERREUR: ' + e.message, 'utf8'); process.exit(1); });
