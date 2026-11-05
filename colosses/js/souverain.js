'use strict';
/* Colosses — boss de fin de cycle : toutes les 30 salles (au bout des six régions), le méga boss est remplacé par
   un Souverain des Colosses. Couronné, plus grand, il a une phase de plus (« Couronne brisée ») faite de grandes
   attaques annoncées, et une entrée en cinématique. Le vaincre donne le titre « Régicide ». */

const NOMS_SOUVERAINS = ['Azhar', 'Velkoroth', 'Ysmeraude', 'Kharaxis', 'Ombrevoile', 'Solmeth', 'Draegan', 'Nyssaris'];
function estSouverain(salle) { return salle >= 30 && salle % 30 === 0; }
const _genSouv = genBoss;
genBoss = function (salle, seed, mega, eviter) {
  const def = _genSouv.apply(this, arguments);
  // méga boss un peu moins durs : un peu plus lents, moins denses, plus de répit, annonces un peu plus longues
  if (def && def.mega && def.D && !estSouverain(salle)) { def.D.S = Math.min(1.75, def.D.S * 1.06); def.D.C *= 1.06; def.idle *= .95; } // un peu plus rapide et dense qu'un boss normal
  if (!estSouverain(salle) || !def || !def.phases) return def;
  try {
    const cycle = Math.floor(salle / 30), r = RNG(hashNum(seed * 7 + 99));
    def.souverain = cycle; def.mega = true;
    def.nom = NOMS_SOUVERAINS[(cycle - 1) % NOMS_SOUVERAINS.length]; def.titre = 'Souverain des Colosses';
    def.hpMax = Math.round(def.hpMax * 1.35); def.r = Math.round(def.r * 1.12);
    // phase en plus : de grandes attaques communes (jamais les attaques propres à une autre espèce)
    const pool = Object.keys(ATK).filter(id => !ATK[id].esp && ATK[id].cat !== 'invoc' && ATK[id].params && (POIDS[id] || 1.5) >= 2);
    const picks = r.shuffle(pool).slice(0, 4);
    const fondId = r.pick(ATK_FOND);
    const ph = { nom: 'Couronne brisée', carte: 'cercle', finale: false, cycle: picks.map(id => ({ id, p: ATK[id].params(r, def.D, false) })), fond: { id: fondId, p: ATK[fondId].params(r, def.D, true) }, tempo: 1.3 };
    def.phases.splice(Math.max(1, def.phases.length - 1), 0, ph);
  } catch (e) { console.warn('souverain', e); }
  return def;
};
// la couronne (au-dessus du corps : elle ne fait pas partie de la zone touchable)
const _bossSouv = dessinerBoss;
dessinerBoss = function (c, b) {
  _bossSouv.apply(this, arguments);
  if (!b || !b.def || !b.def.souverain) return;
  const y = b.y - (b.haut || 0) - b.r * 1.18 + Math.sin(G.t * 2) * 3, w = b.r * .95;
  c.save(); c.translate(b.x, y);
  c.globalCompositeOperation = 'lighter'; c.drawImage(glow('rgba(255,200,90,.5)', w * 1.4), -w * 1.4, -w * 1.4); c.globalCompositeOperation = 'source-over';
  const g = c.createLinearGradient(0, -w * .5, 0, w * .3); g.addColorStop(0, '#fff4c0'); g.addColorStop(.45, '#e8b44a'); g.addColorStop(1, '#7a4a10');
  c.fillStyle = g; c.strokeStyle = '#1a0e04'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-w / 2, w * .25);
  for (let i = 0; i <= 4; i++) { const x = -w / 2 + w * i / 4; c.lineTo(x, i % 2 ? -w * .2 : -w * .5); if (i < 4) c.lineTo(x + w / 8, w * .02); }
  c.lineTo(w / 2, w * .25); c.closePath(); c.fill(); c.stroke();
  for (const [gx, col] of [[-w * .25, '#ff3a5a'], [0, '#5ad8ff'], [w * .25, '#7dff9a']]) { c.fillStyle = col; c.beginPath(); c.arc(gx, w * .1, w * .07, 0, TAU); c.fill(); c.stroke(); }
  c.restore();
};
// entrée en cinématique : bandes noires, deux phrases, puis la descente du Souverain
const _entrerSouv = G.entrerSalle;
G.entrerSalle = function () {
  const r = _entrerSouv.apply(this, arguments);
  if (this.def && this.def.souverain && this.boss) { this.boss.intro = 4.8; this.souvCine = { t: 0 }; }
  else this.souvCine = null;
  return r;
};
const _hudSouv = dessinerHUD;
dessinerHUD = function (c) {
  _hudSouv(c);
  const S = G.souvCine, b = G.boss;
  if (!S || !b || b.intro <= 0) return;
  if (G.etat === 'combat') S.t += 1 / 60;
  const k = Math.min(1, S.t * 1.5, b.intro * 1.2);
  c.save();
  c.fillStyle = '#000'; c.fillRect(0, 0, W, 90 * k); c.fillRect(0, H - 90 * k, W, 90 * k);
  const ligne = (txt, t0, y) => { const a = clamp((S.t - t0) * 1.5, 0, 1) * Math.min(1, b.intro); if (a > 0) texteGrave(c, txt, W / 2, y, 26, '#e9dcc0', a, 'rgba(255,190,90,.6)'); };
  if (b.intro > 2.1) { ligne('Au bout des six régions…', .2, H * .4); ligne('…le Souverain des Colosses t\'attend.', 1.2, H * .4 + 44); }
  c.restore();
};
// le vaincre : statistique et titre
const _mortSouv = G.bossMort;
G.bossMort = function () {
  const avant = this.boss && !this.boss.mort;
  const r = _mortSouv.apply(this, arguments);
  if (avant && this.boss && this.boss.mort && this.def && this.def.souverain && this.mode === 'normal') { statPlus('souverains'); try { verifierTitres(); } catch (e) { } Save.write(); }
  return r;
};
if (typeof TITRES !== 'undefined') TITRES.splice(12, 0, { id: 'regicide', nom: 'Régicide', desc: 'Vaincre un Souverain des Colosses (salle 30).', ok: () => (Save.d.stats.souverains || 0) >= 1 });
