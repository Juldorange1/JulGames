'use strict';
const fs = require('fs');

async function main(){
  const bytes = fs.readFileSync(__dirname + '/build/solver.wasm');
  const imports = {
    env: {
      abort(msg, file, line, col){ throw new Error(`abort at ${line}:${col}`); }
    }
  };
  const { instance } = await WebAssembly.instantiate(bytes, imports);
  const exp = instance.exports;

  // Position de test (21 coups, motif "damier" 3 rangees) deja validee cote JS :
  // resultats attendus par colonne (0..6) : +1,-1,+1,-1,+1,-1,+1 (Jaune au trait)
  // reconstruite via bitboard : position = pions du joueur au trait (Jaune),
  // mask = toutes les cases occupees, sur 3 rangees completes en damier.
  function bottomMask(col){ return 1n << BigInt(col*7); }
  function columnMask(col){ return 63n << BigInt(col*7); }
  function playMove(position, mask, col){
    const newBit = (mask + bottomMask(col)) & columnMask(col);
    return { position: mask ^ position, mask: mask | newBit };
  }
  let position = 0n, mask = 0n;
  const seq = [0,1,2,3,4,5,6, 0,1,2,3,4,5,6, 0,1,2,3,4,5,6];
  for (const c of seq){
    const next = playMove(position, mask, c);
    position = next.position; mask = next.mask;
  }
  const moveCount = 21;

  console.log('Test position (21 coups) :');
  const expected = [1,-1,1,-1,1,-1,1];
  let allOk = true;
  const t0 = Date.now();
  for (let c = 0; c < 7; c++){
    const r = exp.solveColumn(position, mask, moveCount, c);
    const ok = r === expected[c];
    if (!ok) allOk = false;
    console.log(`  col${c}: wasm=${r}  attendu=${expected[c]}  ${ok ? 'OK' : 'MISMATCH'}`);
  }
  console.log('Temps:', Date.now()-t0, 'ms, noeuds:', exp.getNodeCount().toString());
  console.log(allOk ? 'TOUS LES TESTS PASSENT' : 'ECHEC');

  // Petit test de vitesse : resoudre une position a 10 coups (comme le test navigateur, 10.3s en JS/BigInt)
  exp.resetNodeCount();
  let position2 = 0n, mask2 = 0n;
  const seq2 = [3,3,4,2,3,4,2,5,1,3];
  for (const c of seq2){
    const next = playMove(position2, mask2, c);
    position2 = next.position; mask2 = next.mask;
  }
  const t1 = Date.now();
  const results2 = [];
  for (let c = 0; c < 7; c++){
    if (exp.canPlayExport(mask2, c) === 0) continue;
    results2.push([c, exp.solveColumn(position2, mask2, 10, c)]);
  }
  console.log('\nPosition 10 coups (attendu ~ -27,-29,+24,+30,+28,+30,-29 selon test navigateur precedent) :');
  console.log(results2);
  console.log('Temps:', Date.now()-t1, 'ms, noeuds:', exp.getNodeCount().toString());
}

main().catch(e => { console.error(e); process.exit(1); });
