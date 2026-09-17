'use strict';
const fs = require('fs');

async function main(){
  const bytes = fs.readFileSync(__dirname + '/build/solver.wasm');
  let lastLog = Date.now();
  const t0 = Date.now();
  const results = [];
  const MOVE_ORDER = [3, 2, 4, 1, 5, 0, 6];

  const imports = {
    env: {
      abort(){ throw new Error('abort'); },
      onProgress(nodeCount){
        const now = Date.now();
        if (now - lastLog > 3000){
          lastLog = now;
          const elapsed = (now - t0) / 1000;
          const rate = (Number(nodeCount) / elapsed / 1e6).toFixed(2);
          fs.writeFileSync(__dirname + '/status-root.txt',
            `col_en_cours=${results.length}/7 noeuds_total=${nodeCount} elapsed_s=${elapsed.toFixed(0)} rate_M=${rate}\n` +
            `resultats_deja_obtenus=${JSON.stringify(results)}`, 'utf8');
        }
      }
    }
  };
  const { instance } = await WebAssembly.instantiate(bytes, imports);
  const exp = instance.exports;

  for (const c of MOVE_ORDER){
    const r = exp.solveColumn(0n, 0n, 0, c);
    results.push([c, r]);
    fs.writeFileSync(__dirname + '/status-root.txt',
      `col_en_cours=${results.length}/7 noeuds_total=${exp.getNodeCount().toString()} elapsed_s=${((Date.now()-t0)/1000).toFixed(0)}\n` +
      `resultats_deja_obtenus=${JSON.stringify(results)}`, 'utf8');
  }

  const total = { moveCount: 0, results, nodes: exp.getNodeCount().toString(), elapsed_s: (Date.now()-t0)/1000 };
  fs.writeFileSync(__dirname + '/root-result.json', JSON.stringify(total, null, 2), 'utf8');
  fs.writeFileSync(__dirname + '/status-root.txt', 'TERMINE: ' + JSON.stringify(results), 'utf8');
  console.log('TERMINE', total);
}

main().catch(e => { fs.writeFileSync(__dirname + '/status-root.txt', 'ERREUR: ' + e.message, 'utf8'); console.error(e); process.exit(1); });
