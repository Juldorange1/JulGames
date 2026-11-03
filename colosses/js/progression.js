'use strict';
/* Colosses — reliques (bonus d'un palier), succès, maîtrise des espèces (étoiles) et statistiques. */

// ---------- Reliques : on en choisit une après chaque boss, elles durent jusqu'au méga boss ----------
const RELIQUES = {
  vampire: { nom: 'Vampirisme', ico: '🩸', desc: '+1 PV tous les 250 dégâts infligés' },
  colere: { nom: 'Colère', ico: '😡', desc: '+30 % de dégâts sous 40 % de vie' },
  precision: { nom: 'Œil du chasseur', ico: '🎯', desc: '+12 % de coups critiques' },
  frenesie: { nom: 'Frénésie', ico: '⚡', desc: '+15 % de cadence' },
  batterie: { nom: 'Batterie', ico: '🔋', desc: 'Énergie +40 % plus vite' },
  economie: { nom: 'Économie', ico: '💠', desc: 'Spéciales −25 % de coût' },
  plumes: { nom: 'Plumes', ico: '🪶', desc: '+12 % de vitesse de course' },
  second: { nom: 'Second souffle', ico: '💖', desc: 'Une fois par salle, un coup mortel te laisse à 1 PV' },
  egide: { nom: 'Égide', ico: '🛡', desc: 'Chaque salle commence avec un bouclier' },
  reserve: { nom: 'Réserve', ico: '➕', desc: '+1 charge de talent' },
  assassin: { nom: 'Assassin', ico: '🗡', desc: '+40 % de dégâts dans le dos du boss' },
  chasseur: { nom: 'Chasseur', ico: '🏹', desc: '+60 % contre invocations, têtes et cristaux' },
  reflexes: { nom: 'Réflexes', ico: '💨', desc: 'Talents rechargés 25 % plus vite' },
  opportun: { nom: 'Opportuniste', ico: '👁', desc: '+50 % quand le boss est ouvert ou étourdi' },
  epines: { nom: 'Épines', ico: '🌵', desc: 'Chaque coup reçu inflige 200 dégâts au boss' },
  regen: { nom: 'Régénération', ico: '💚', desc: '+1 PV toutes les 3 s' },
  verre: { nom: 'Canon de verre', ico: '🔮', desc: '+35 % de dégâts, mais −30 PV max' },
  brise: { nom: 'Brise-phase', ico: '💥', desc: '+20 PV à chaque nouvelle phase du boss' },
  tempete: { nom: 'Tempête', ico: '🌩', desc: 'Un éclair frappe le boss toutes les 6 s' },
  aimant: { nom: 'Champ de force', ico: '🧲', desc: 'Les balles ennemies ralentissent près de toi' }
};
function offrirReliques(r) {
  const deja = G.reliques();
  const dispo = Object.keys(RELIQUES).filter(k => !deja.includes(k));
  return (r || R).shuffle(dispo.slice()).slice(0, 2);
}

// ---------- Succès ----------
const SUCCES = {
  premier: { nom: 'Premier sang', ico: '🩸', desc: 'Vaincre un boss' },
  dix: { nom: 'Chasseur', ico: '⚔', desc: 'Vaincre 10 boss', obj: () => Save.d.stats.boss / 10 },
  cent: { nom: 'Fléau des colosses', ico: '👑', desc: 'Vaincre 100 boss', obj: () => Save.d.stats.boss / 100 },
  mille: { nom: 'Légende', ico: '🌟', desc: 'Vaincre 1000 boss', obj: () => Save.d.stats.boss / 1000 },
  mega1: { nom: 'Tueur de géants', ico: '★', desc: 'Vaincre un méga boss' },
  mega10: { nom: 'Briseur de paliers', ico: '✪', desc: 'Vaincre 10 méga boss', obj: () => Save.d.stats.mega / 10 },
  intouchable: { nom: 'Intouchable', ico: '✨', desc: 'Vaincre un boss sans être touché' },
  eclair: { nom: 'Éclair', ico: '⏱', desc: 'Vaincre un boss en moins de 45 s' },
  fil: { nom: 'Sur le fil', ico: '❤', desc: 'Vaincre un boss avec moins de 10 PV' },
  frugal: { nom: 'Ascète', ico: '🧘', desc: 'Vaincre un boss sans spéciale ni talent' },
  revanche: { nom: 'Obstiné', ico: '🔁', desc: 'Vaincre un boss après 5 essais ou plus' },
  cauchemar: { nom: 'Cauchemar éveillé', ico: '☠', desc: 'Vaincre un boss en Cauchemar' },
  cauchMega: { nom: 'Roi du cauchemar', ico: '💀', desc: 'Vaincre un méga boss en Cauchemar' },
  palier5: { nom: 'Ascension', ico: '⛰', desc: 'Atteindre le palier 5', obj: () => maxPalier() / 5 },
  palier10: { nom: 'Sommet', ico: '🏔', desc: 'Atteindre le palier 10', obj: () => maxPalier() / 10 },
  palier20: { nom: 'Au-delà', ico: '🌌', desc: 'Atteindre le palier 20', obj: () => maxPalier() / 20 },
  parade10: { nom: 'Bretteur', ico: '⛨', desc: 'Réussir 10 parades', obj: () => Save.d.stats.parades / 10 },
  parade100: { nom: 'Mur vivant', ico: '🛡', desc: 'Réussir 100 parades', obj: () => Save.d.stats.parades / 100 },
  bestiaire: { nom: 'Naturaliste', ico: '📖', desc: 'Rencontrer toutes les espèces', obj: () => Object.keys(Save.d.codex.especes).length / (ESP_ORDRE.length + 1) },
  maitre: { nom: 'Maître', ico: '⭐', desc: '3 étoiles sur une espèce' },
  grandMaitre: { nom: 'Grand maître', ico: '🌠', desc: '3 étoiles sur toutes les espèces', obj: () => ESP_ORDRE.filter(e => etoiles(e) >= 3).length / ESP_ORDRE.length },
  arsenal: { nom: 'Collectionneur', ico: '🧰', desc: 'Utiliser 30 armes principales', obj: () => PRIM.filter(a => Save.d.codex.arm['p:' + a.id]).length / 30 },
  reliques5: { nom: 'Reliquaire', ico: '🏺', desc: 'Porter 5 reliques à la fois' },
  defiJour: { nom: 'Défi relevé', ico: '☀', desc: 'Réussir un défi du jour' },
  defiSemaine: { nom: 'Semaine parfaite', ico: '🗓', desc: 'Réussir un défi de la semaine' },
  oeuf: { nom: 'Omelette', ico: '🥚', desc: 'Casser l\'œuf du Phénix à temps' },
  carapace: { nom: 'Casse-noix', ico: '🔨', desc: 'Briser une carapace' },
  marathon: { nom: 'Marathon', ico: '⌛', desc: 'Jouer 10 heures', obj: () => Save.d.stats.temps / 36000 }
};
function maxPalier() { return Math.max(...Object.values(Save.d.prog).map(p => p.palier)); }
function succes(id) {
  const s = Save.d.succes = Save.d.succes || {};
  if (s[id] || !SUCCES[id]) return;
  s[id] = Date.now(); Save.write();
  G.succesFile = G.succesFile || []; G.succesFile.push({ id, t: 0 });
  Son.play('victoire');
}
function verifierSucces() {
  for (const [id, x] of Object.entries(SUCCES)) if (x.obj && x.obj() >= 1) succes(id);
}

// ---------- Maîtrise des espèces : ★ vaincue · ★★ sans être touché ou en moins d'une minute · ★★★ en Cauchemar ----------
function etoiles(esp) { const m = (Save.d.maitrise || {})[esp]; return m ? (m.v ? 1 : 0) + (m.pur ? 1 : 0) + (m.cauch ? 1 : 0) : 0; }
function noterMaitrise(esp, pur, cauch) {
  const M = Save.d.maitrise = Save.d.maitrise || {}, m = M[esp] = M[esp] || {};
  const avant = etoiles(esp);
  m.v = 1; if (pur) m.pur = 1; if (cauch) m.cauch = 1;
  const apres = etoiles(esp);
  if (apres > avant) G.annonce('★'.repeat(apres) + ' Maîtrise : ' + ESPECES[esp].nom, '#ffd86b', 2.2);
  if (apres >= 3) succes('maitre');
}

// ---------- Statistiques détaillées ----------
function statPlus(cle, sous, n) {
  const s = Save.d.stats;
  if (sous === undefined) { s[cle] = (s[cle] || 0) + (n || 1); return; }
  const o = s[cle] = s[cle] || {}; o[sous] = (o[sous] || 0) + (n || 1);
}
