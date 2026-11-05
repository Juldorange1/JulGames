// Colosses — après l'empaquetage : retire ce dont le jeu ne se sert pas (il dessine en WebGL, pas en WebGPU).
const fs = require('fs'), path = require('path');
exports.default = async function (ctx) {
  for (const f of ['dxcompiler.dll', 'dxil.dll']) {
    const p = path.join(ctx.appOutDir, f);
    try { if (fs.existsSync(p)) { fs.rmSync(p); console.log('  • retiré', f); } } catch (e) { console.log('  • impossible de retirer', f, e.message); }
  }
};
