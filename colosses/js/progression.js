'use strict';
/* Colosses — reliques (bonus d'un palier), succès, maîtrise des espèces (étoiles) et statistiques. */

// ---------- Reliques : on en choisit une après chaque boss, elles durent jusqu'au méga boss ----------
// Chacune ÉCHANGE quelque chose contre autre chose : elles changent la façon de jouer, jamais la puissance totale.
const RELIQUES = {
  vampire: { nom: 'Vampirisme', ico: '🩸', desc: '+1 PV tous les 250 dégâts', malus: '−25 PV max' },
  colere: { nom: 'Colère', ico: '😡', desc: '+30 % de dégâts sous 40 % de vie', malus: '−15 % au-dessus' },
  precision: { nom: 'Œil du chasseur', ico: '🎯', desc: '+12 % de coups critiques', malus: '−15 % de cadence' },
  frenesie: { nom: 'Frénésie', ico: '⚡', desc: '+15 % de cadence', malus: '−15 % de dégâts' },
  batterie: { nom: 'Batterie', ico: '🔋', desc: 'Énergie 40 % plus vite', malus: 'arme −12 % de dégâts' },
  economie: { nom: 'Économie', ico: '💠', desc: 'Spéciales −25 % de coût', malus: 'rechargement +35 %' },
  plumes: { nom: 'Plumes', ico: '🪶', desc: '+12 % de vitesse de course', malus: '−15 PV max' },
  second: { nom: 'Second souffle', ico: '💖', desc: 'Une fois par salle, un coup mortel te laisse à 1 PV', malus: '−25 PV max' },
  egide: { nom: 'Égide', ico: '🛡', desc: 'Chaque salle commence avec un bouclier', malus: 'talents +30 % plus lents' },
  reserve: { nom: 'Réserve', ico: '➕', desc: '+1 charge de talent', malus: 'talents +45 % plus lents' },
  assassin: { nom: 'Assassin', ico: '🗡', desc: '+40 % dans le dos du boss', malus: '−20 % de face' },
  chasseur: { nom: 'Élan', ico: '🏹', desc: '+18 % de dégâts en courant', malus: '−20 % à l\'arrêt' },
  reflexes: { nom: 'Réflexes', ico: '💨', desc: 'Talents 25 % plus vite', malus: '−10 % de dégâts' },
  opportun: { nom: 'Opportuniste', ico: '👁', desc: '+50 % quand le boss est ouvert ou étourdi', malus: '−15 % le reste du temps' },
  epines: { nom: 'Épines', ico: '🌵', desc: 'Chaque coup reçu inflige 200 dégâts au boss', malus: 'coups reçus +20 %' },
  regen: { nom: 'Régénération', ico: '💚', desc: '+1 PV toutes les 3 s', malus: '−40 PV max' },
  verre: { nom: 'Canon de verre', ico: '🔮', desc: '+25 % de dégâts', malus: '−35 PV max' },
  brise: { nom: 'Brise-phase', ico: '💥', desc: '+20 PV à chaque nouvelle phase', malus: '−20 PV max' },
  tempete: { nom: 'Tempête', ico: '🌩', desc: 'Un éclair frappe le boss toutes les 6 s', malus: 'arme −12 % de dégâts' },
  aimant: { nom: 'Champ de force', ico: '🧲', desc: 'Les balles ennemies ralentissent près de toi', malus: '−12 % de vitesse de course' }
};
const MALUS_PV = { vampire: 25, plumes: 15, second: 25, regen: 40, verre: 35, brise: 20 };
function malusPV() { let n = 0; try { for (const k of G.reliques()) n += MALUS_PV[k] || 0; } catch (e) { } return n; }
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
  legende: { nom: 'Chasseur de légendes', ico: '✦', desc: 'Vaincre un boss légendaire' },
  abysses10: { nom: 'Plongée', ico: '🌌', desc: 'Atteindre la profondeur 10 des Abysses' },
  marathon: { nom: 'Marathon', ico: '⌛', desc: 'Jouer 10 heures', obj: () => Save.d.stats.temps / 36000 }
};
function maxPalier() { return Math.max(...Object.values(Save.d.prog).map(p => p.palier)); }
function succes(id) {
  const s = Save.d.succes = Save.d.succes || {};
  if (s[id] || !SUCCES[id]) return;
  s[id] = Date.now(); Save.write();
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
  if (apres > avant) G.annonce('Maîtrise ' + apres + '/3 : ' + ESPECES[esp].nom, '#ffd86b', 2.2);
  if (apres >= 3) succes('maitre');
}

// ---------- Statistiques détaillées ----------
function statPlus(cle, sous, n) {
  const s = Save.d.stats;
  if (sous === undefined) { s[cle] = (s[cle] || 0) + (n || 1); return; }
  const o = s[cle] = s[cle] || {}; o[sous] = (o[sous] || 0) + (n || 1);
}

// ---------- Apparences : fragments à collectionner (aucun bonus de puissance) ----------
// moins de fragments pour les apparences courantes ; les mythiques en demandent beaucoup (objectif de longue haleine)
const RARETES = { commun: { nom: 'Commun', col: '#b8c4d0', frags: 2, poids: 60 }, rare: { nom: 'Rare', col: '#5aa8ff', frags: 3, poids: 30 }, epique: { nom: 'Épique', col: '#c06bff', frags: 5, poids: 10 }, mythique: { nom: 'Mythique', col: '#ff4dd2', frags: 25, poids: 6 }, legendaire: { nom: 'Légendaire', col: '#ffb43d', frags: 1, poids: 0 } };
const SLOTS = { armure: 'Armure', cape: 'Cape', visiere: 'Visière', trainee: 'Traînée', aura: 'Aura' };
const SKINS = [
  { id: 'a_acier', slot: 'armure', nom: 'Acier', rar: 'commun', c: ['#e6eef8', '#7d8fa3', '#232b36'], base: true },
  { id: 'a_bronze', slot: 'armure', nom: 'Bronze', rar: 'commun', c: ['#ffe2b8', '#b07a3c', '#3a2414'] },
  { id: 'a_jade', slot: 'armure', nom: 'Jade', rar: 'commun', c: ['#dfffe8', '#4fa07a', '#143224'] },
  { id: 'a_obsidienne', slot: 'armure', nom: 'Obsidienne', rar: 'rare', c: ['#9a8fb8', '#2c2440', '#08060e'] },
  { id: 'a_sang', slot: 'armure', nom: 'Sang', rar: 'rare', c: ['#ffc2c8', '#a02434', '#2a0610'] },
  { id: 'a_givre', slot: 'armure', nom: 'Givre', rar: 'rare', c: ['#ffffff', '#8fd0f0', '#24506a'] },
  { id: 'a_or', slot: 'armure', nom: 'Or', rar: 'epique', c: ['#fff6c8', '#e0a830', '#5a3a08'] },
  { id: 'a_neant', slot: 'armure', nom: 'Néant', rar: 'epique', c: ['#e0c8ff', '#5a2aa0', '#10041e'] },
  { id: 'a_soleil', slot: 'armure', nom: 'Soleil noir', rar: 'legendaire', c: ['#fff0a0', '#ff7a1a', '#1a0400'] },
  { id: 'c_pourpre', slot: 'cape', nom: 'Pourpre', rar: 'commun', c: ['#8a1430', '#2a0410'], base: true },
  { id: 'c_nuit', slot: 'cape', nom: 'Nuit', rar: 'commun', c: ['#1e2a5a', '#060a1a'] },
  { id: 'c_foret', slot: 'cape', nom: 'Forêt', rar: 'commun', c: ['#2a6a34', '#0a1a0c'] },
  { id: 'c_braise', slot: 'cape', nom: 'Braise', rar: 'rare', c: ['#ff6a1a', '#3a0800'], motif: 'flammes' },
  { id: 'c_azur', slot: 'cape', nom: 'Azur étoilé', rar: 'rare', c: ['#2a7aff', '#08143a'], motif: 'etoiles' },
  { id: 'c_royale', slot: 'cape', nom: 'Royale', rar: 'epique', c: ['#7a1aa0', '#1a0428'], motif: 'liseré' },
  { id: 'c_aurore', slot: 'cape', nom: 'Aurore', rar: 'epique', c: ['#3affc0', '#c040ff'], motif: 'etoiles' },
  { id: 'c_dragon', slot: 'cape', nom: 'Ailes de dragon', rar: 'legendaire', c: ['#ffb43d', '#5a0a00'], motif: 'flammes' },
  { id: 'v_cyan', slot: 'visiere', nom: 'Cyan', rar: 'commun', col: '#34d6ff', base: true },
  { id: 'v_rouge', slot: 'visiere', nom: 'Rouge', rar: 'commun', col: '#ff3a4a' },
  { id: 'v_vert', slot: 'visiere', nom: 'Émeraude', rar: 'commun', col: '#3aff8a' },
  { id: 'v_or', slot: 'visiere', nom: 'Doré', rar: 'rare', col: '#ffd24d' },
  { id: 'v_violet', slot: 'visiere', nom: 'Améthyste', rar: 'rare', col: '#c06bff' },
  { id: 'v_blanc', slot: 'visiere', nom: 'Lumière pure', rar: 'epique', col: '#ffffff' },
  { id: 't_aucune', slot: 'trainee', nom: 'Aucune', rar: 'commun', base: true },
  { id: 't_poussiere', slot: 'trainee', nom: 'Poussière', rar: 'commun', col: 'rgba(200,190,170,.6)' },
  { id: 't_braises', slot: 'trainee', nom: 'Braises', rar: 'rare', col: '#ff8a3c', add: true },
  { id: 't_givre', slot: 'trainee', nom: 'Givre', rar: 'rare', col: '#bfe9ff', add: true },
  { id: 't_ombre', slot: 'trainee', nom: 'Ombre', rar: 'epique', col: '#a070ff', add: true, gros: true },
  { id: 't_etoiles', slot: 'trainee', nom: 'Poussière d\'étoiles', rar: 'legendaire', col: '#fff2b0', add: true, gros: true },
  { id: 'r_aucune', slot: 'aura', nom: 'Aucune', rar: 'commun', base: true },
  { id: 'r_cyan', slot: 'aura', nom: 'Lueur', rar: 'rare', col: 'rgba(80,230,255,.35)' },
  { id: 'r_feu', slot: 'aura', nom: 'Flammes', rar: 'epique', col: 'rgba(255,120,40,.45)' },
  { id: 'r_couronne', slot: 'aura', nom: 'Couronne', rar: 'legendaire', col: 'rgba(255,210,80,.5)', couronne: true }
];
// apparences de plus
SKINS.push(
  { id: 'a_rouille', slot: 'armure', nom: 'Rouille', rar: 'commun', c: ['#f0c8a0', '#9a5a32', '#2e180c'] },
  { id: 'a_os', slot: 'armure', nom: 'Os', rar: 'commun', c: ['#fffaf0', '#cfc4a8', '#4a4232'] },
  { id: 'a_ardoise', slot: 'armure', nom: 'Ardoise', rar: 'commun', c: ['#c8d0dc', '#4c5462', '#14181e'] },
  { id: 'a_corail', slot: 'armure', nom: 'Corail', rar: 'rare', c: ['#ffd8cc', '#e0604a', '#4a1208'] },
  { id: 'a_saphir', slot: 'armure', nom: 'Saphir', rar: 'rare', c: ['#d8e8ff', '#2a5ad0', '#081838'] },
  { id: 'a_cendre', slot: 'armure', nom: 'Cendre', rar: 'epique', c: ['#e0dcd8', '#56504c', '#0c0a0a'] },
  { id: 'a_emeraude', slot: 'armure', nom: 'Émeraude royale', rar: 'epique', c: ['#e8fff0', '#1aa060', '#042a16'] },
  { id: 'a_aube', slot: 'armure', nom: 'Aube', rar: 'legendaire', c: ['#fffaf0', '#ffc8a0', '#a04a6a'] },
  { id: 'c_sable', slot: 'cape', nom: 'Sable', rar: 'commun', c: ['#c8a46a', '#3a2a14'] },
  { id: 'c_cendree', slot: 'cape', nom: 'Cendrée', rar: 'commun', c: ['#6a6a72', '#141418'] },
  { id: 'c_venin', slot: 'cape', nom: 'Venin', rar: 'rare', c: ['#7ae04a', '#0a2a04'], motif: 'liseré' },
  { id: 'c_givree', slot: 'cape', nom: 'Givrée', rar: 'rare', c: ['#bfe8ff', '#14304a'], motif: 'etoiles' },
  { id: 'c_sangroyal', slot: 'cape', nom: 'Sang royal', rar: 'epique', c: ['#c01830', '#1a0006'], motif: 'liseré' },
  { id: 'c_nebuleuse', slot: 'cape', nom: 'Nébuleuse', rar: 'epique', c: ['#a050ff', '#0a0430'], motif: 'etoiles' },
  { id: 'c_phenix', slot: 'cape', nom: 'Plumes de phénix', rar: 'legendaire', c: ['#ffd04a', '#a01800'], motif: 'flammes' },
  { id: 'v_ambre', slot: 'visiere', nom: 'Ambre', rar: 'commun', col: '#ffa63a' },
  { id: 'v_rose', slot: 'visiere', nom: 'Rose', rar: 'commun', col: '#ff7ac8' },
  { id: 'v_glace', slot: 'visiere', nom: 'Glace', rar: 'rare', col: '#bff4ff' },
  { id: 'v_toxique', slot: 'visiere', nom: 'Toxique', rar: 'rare', col: '#b4ff3a' },
  { id: 'v_sang', slot: 'visiere', nom: 'Sang', rar: 'epique', col: '#ff1030' },
  { id: 'v_soleil', slot: 'visiere', nom: 'Soleil', rar: 'legendaire', col: '#fff0a0' },
  { id: 't_feuilles', slot: 'trainee', nom: 'Feuilles', rar: 'commun', col: 'rgba(120,190,70,.8)' },
  { id: 't_cendres', slot: 'trainee', nom: 'Cendres', rar: 'commun', col: 'rgba(120,110,105,.7)' },
  { id: 't_sang', slot: 'trainee', nom: 'Sang', rar: 'rare', col: '#d01830' },
  { id: 't_foudre', slot: 'trainee', nom: 'Foudre', rar: 'rare', col: '#fff36a', add: true },
  { id: 't_petales', slot: 'trainee', nom: 'Pétales', rar: 'epique', col: '#ffb0d8', add: true, gros: true },
  { id: 't_aurore', slot: 'trainee', nom: 'Aurore', rar: 'legendaire', col: '#7affd0', add: true, gros: true },
  { id: 'r_brume', slot: 'aura', nom: 'Brume', rar: 'commun', col: 'rgba(200,200,220,.25)' },
  { id: 'r_givre', slot: 'aura', nom: 'Givre', rar: 'rare', col: 'rgba(170,230,255,.35)' },
  { id: 'r_venin', slot: 'aura', nom: 'Venin', rar: 'rare', col: 'rgba(140,255,80,.3)' },
  { id: 'r_sang', slot: 'aura', nom: 'Sang', rar: 'epique', col: 'rgba(255,40,60,.4)' },
  { id: 'r_divine', slot: 'aura', nom: 'Divine', rar: 'legendaire', col: 'rgba(255,245,200,.5)', couronne: true }
);
// apparences mythiques : 25 fragments chacune
SKINS.push(
  { id: 'a_eclipse', slot: 'armure', nom: 'Éclipse', rar: 'mythique', c: ['#fff8e0', '#ff4dd2', '#14001a'] },
  { id: 'a_obsidienne_doree', slot: 'armure', nom: 'Obsidienne dorée', rar: 'mythique', c: ['#fff1b0', '#c9a865', '#050403'] },
  { id: 'c_voile', slot: 'cape', nom: 'Voile céleste', rar: 'mythique', c: ['#7fd8ff', '#2a0a5a'], motif: 'etoiles' },
  { id: 'c_brasier', slot: 'cape', nom: 'Brasier éternel', rar: 'mythique', c: ['#fff06a', '#ff2a00'], motif: 'flammes' },
  { id: 'v_prisme', slot: 'visiere', nom: 'Prisme', rar: 'mythique', col: '#ff9cf0' },
  { id: 't_comete', slot: 'trainee', nom: 'Comète', rar: 'mythique', col: '#9ff0ff', add: true, gros: true },
  { id: 'r_astral', slot: 'aura', nom: 'Astrale', rar: 'mythique', col: 'rgba(255,120,230,.45)' }
);
function skin(id) { return SKINS.find(s => s.id === id); }
function skinsSave() { const s = Save.d.skins = Save.d.skins || { frag: {}, equip: {} }; for (const k in SLOTS) if (!s.equip[k]) s.equip[k] = SKINS.find(x => x.slot === k && x.base).id; return s; }
function possede(id) { const s = skin(id); return s.base || (skinsSave().frag[id] || 0) >= RARETES[s.rar].frags; }
function equipe(slot) { return skin(skinsSave().equip[slot]) || SKINS.find(x => x.slot === slot && x.base); }
// donne un fragment d'une apparence de la rareté tirée (ou au-dessus) ; renvoie le texte affiché
function donnerFragment(rarMin, slot) {
  const ordre = ['commun', 'rare', 'epique', 'mythique', 'legendaire'], min = ordre.indexOf(rarMin || 'commun');
  const dispo = SKINS.filter(s => !s.base && !possede(s.id) && ordre.indexOf(s.rar) >= min && s.rar !== 'legendaire' && (!slot || s.slot === slot));
  if (!dispo.length) { forgeSave().eclats += 2; Save.write(); return '+2 cristaux'; } // remboursement (pas un gain)
  const s = R.weighted(dispo, x => RARETES[x.rar].poids || 1), S = skinsSave();
  S.frag[s.id] = (S.frag[s.id] || 0) + 1; Save.write();
  const n = S.frag[s.id], tot = RARETES[s.rar].frags;
  return (n >= tot ? 'Débloqué : ' : '') + SLOTS[s.slot] + ' « ' + s.nom + ' » ' + Math.min(n, tot) + '/' + tot;
}
function donnerLegendaire() {
  const dispo = SKINS.filter(s => s.rar === 'legendaire' && !possede(s.id));
  if (!dispo.length) { return txtCristaux(gagnerEclats(5)); }
  const s = R.pick(dispo); skinsSave().frag[s.id] = 1; Save.write();
  return SLOTS[s.slot] + ' légendaire : « ' + s.nom + ' »';
}

// ---------- Forge : chaque famille d'armes peut prendre une évolution (échange, pas de bonus gratuit) ----------
const FORGE = {
  fusil: [
    { id: 'perforant', nom: 'Perforant', desc: 'Les balles traversent une cible de plus · −15 % de dégâts', mod: { pierce: 1, dmg: .85 } },
    { id: 'rafale', nom: 'Rafale', desc: '+30 % de cadence · −25 % de dégâts', mod: { cad: 1.3, dmg: .75 } },
    { id: 'calibre', nom: 'Gros calibre', desc: '−35 % de cadence · +55 % de dégâts, balles plus grosses', mod: { cad: .65, dmg: 1.55, taille: 1.5 } },
    { id: 'tete', nom: 'Tête chercheuse', desc: 'Les balles s\'orientent un peu vers la cible · −15 % de dégâts', mod: { hom: 1.6, dmg: .85 } },
    { id: 'shrapnel', nom: 'Shrapnel', desc: 'Les balles éclatent en deux à l\'impact · −22 % de dégâts', mod: { eclat: 1, dmg: .78 } }
  ],
  lame: [
    { id: 'allonge', nom: 'Allonge', desc: '+25 % de portée · −15 % de dégâts', mod: { portee: 1.25, dmg: .85 } },
    { id: 'vampire', nom: 'Vampire', desc: 'Les coups rendent 1 PV (au plus 1 par seconde) · −20 % de dégâts', mod: { dmg: .8, vampire: 1 } },
    { id: 'tempo', nom: 'Tempo', desc: '+25 % de vitesse de frappe · −20 % de dégâts', mod: { cad: 1.25, dmg: .8 } },
    { id: 'siphon', nom: 'Siphon', desc: 'Les coups rendent 60 % d\'énergie en plus · −15 % de dégâts', mod: { energie: 1.6, dmg: .85 } },
    { id: 'lente', nom: 'Lame lourde', desc: '−25 % de vitesse de frappe · +40 % de dégâts', mod: { cad: .75, dmg: 1.4 } }
  ],
  trait: [
    { id: 'chercheur', nom: 'Chercheur', desc: 'Les projectiles s\'orientent un peu vers la cible · −15 % de dégâts', mod: { hom: 2.2, dmg: .85 } },
    { id: 'lourd', nom: 'Lourd', desc: '+40 % de dégâts · projectiles 30 % plus lents, cadence −15 %', mod: { dmg: 1.4, vit: .7, cad: .85 } },
    { id: 'eclat', nom: 'Éclatement', desc: 'À l\'impact, deux éclats repartent · −20 % de dégâts', mod: { dmg: .8, eclat: 1 } },
    { id: 'perceur', nom: 'Perceur', desc: 'Traverse une cible de plus, 20 % plus rapide · −18 % de dégâts', mod: { pierce: 1, vit: 1.2, dmg: .82 } },
    { id: 'salve', nom: 'Salve', desc: '+25 % de cadence · −20 % de dégâts', mod: { cad: 1.25, dmg: .8 } }
  ],
  explosif: [
    { id: 'large', nom: 'Grande zone', desc: '+30 % de zone · −15 % de dégâts', mod: { zone: 1.3, dmg: .85 } },
    { id: 'grappe', nom: 'Grappe', desc: 'Chaque explosion en lâche trois petites · −30 % de dégâts', mod: { dmg: .7, grappe: 1 } },
    { id: 'vif', nom: 'Vif', desc: '+25 % de cadence · −20 % de dégâts', mod: { cad: 1.25, dmg: .8 } },
    { id: 'obus', nom: 'Obus', desc: '−30 % de cadence · +25 % de zone · +35 % de dégâts', mod: { cad: .7, zone: 1.25, dmg: 1.35 } },
    { id: 'recup', nom: 'Récupération', desc: 'Les explosions rendent 50 % d\'énergie en plus · −15 % de dégâts', mod: { energie: 1.5, dmg: .85 } }
  ],
  magie: [
    { id: 'echo', nom: 'Écho', desc: '15 % de chance de lancer deux fois · −10 % de dégâts', mod: { echo: .15, dmg: .9 } },
    { id: 'canal', nom: 'Canalisation', desc: '+25 % de dégâts immobile · −15 % en mouvement', mod: { canal: 1 } },
    { id: 'drain', nom: 'Drain', desc: 'Les coups rendent 50 % d\'énergie en plus · −15 % de dégâts', mod: { dmg: .85, energie: 1.5 } },
    { id: 'sang', nom: 'Magie de sang', desc: 'Les coups rendent 1 PV (au plus 1 par seconde) · −20 % de dégâts', mod: { vampire: 1, dmg: .8 } },
    { id: 'ample', nom: 'Ampleur', desc: 'Projectiles 40 % plus gros, 20 % plus lents', mod: { taille: 1.4, vit: .8 } }
  ]
};
const COUT_FORGE = 6;
function forgeSave() { return Save.d.forge = Save.d.forge || { eclats: 0, debloque: {}, actif: {} }; }
// tous les gains de cristaux sont réduits de 25 % (les fractions s'accumulent d'un gain à l'autre) ; renvoie le nombre réellement gagné
const TAUX_CRISTAUX = .75;
function gagnerEclats(n) { const F = forgeSave(); F.fracG = (F.fracG || 0) + n * TAUX_CRISTAUX; const k = Math.floor(F.fracG + 1e-9); F.fracG -= k; F.eclats += k; Save.write(); return k; }
const txtCristaux = k => '+' + k + (k > 1 ? ' cristaux' : ' cristal');
function modForge() {
  return {}; // la forge n'existe plus : aucune arme ne se construit
  try {
    const fam = FAMILLE[G.ars.p], id = forgeSave().actif[fam];
    if (!id || G.mode === 'jour' || G.mode === 'semaine') return {};
    const e = (FORGE[fam] || []).find(x => x.id === id); return e ? e.mod : {};
  } catch (e) { return {}; }
}

// ---------- Chasse de la semaine : une espèce à battre de plus en plus vite ----------
const CHASSE_PALIERS = [180, 120, 90];
function chasseCourante() {
  const cle = cleSemaine(), r = RNG(hashStr('chasse-' + cle));
  const c = Save.d.chasseH = Save.d.chasseH && Save.d.chasseH.cle === cle ? Save.d.chasseH : { cle, esp: r.pick(ESP_ORDRE), best: 0, paliers: [] };
  return c;
}
function noterChasse(esp, temps) {
  const c = chasseCourante();
  if (c.esp !== esp) return;
  if (!c.best || temps < c.best) c.best = Math.round(temps);
  CHASSE_PALIERS.forEach((lim, i) => {
    if (temps <= lim && !c.paliers.includes(i)) {
      c.paliers.push(i);
      const n = i === 2 ? 5 : 3, txt = txtCristaux(gagnerEclats(n)); // (plus de fragments gratuits : ils s'achètent)
      G.annonce('Chasse : palier ' + (i + 1) + ' réussi !', '#ffd86b', 2.2); G.texte(G.p.x, G.p.y - 70, txt, '#ffd86b', 14);
    }
  });
  Save.write();
}

// ---------- Affinités : on paie des éclats pour qu'un type d'arme tombe plus souvent (même puissance) ----------
const AFF_PRIX = [3, 6, 10], AFF_MULT = [1, 1.6, 2.2, 2.8];
function affSave() {
  let A = Save.d.affinites;
  if (!A || Array.isArray(A.p)) { const v = A || {}; A = Save.d.affinites = { p: {}, s: {}, t: {} }; for (const c of ['p', 's', 't']) for (const k of (v[c] || [])) A[c][k] = 1; }
  for (const c of ['p', 's', 't']) A[c] = A[c] || {};
  // les éléments n'existent plus : les cristaux mis dans une affinité d'élément sont rendus
  for (const c of ['p', 's', 't']) for (const k of Object.keys(A[c])) if (ELEMENTS[k]) { let n = 0; for (let i = 0; i < A[c][k]; i++) n += AFF_PRIX[i]; forgeSave().eclats += n; delete A[c][k]; }
  return A;
}
function correspond(a, cible) { return FAMILLE[a.id] === cible || a.id === cible; }
// réglage libre d'une affinité achetée : 0 = chance de base, 1 = tout ce qui a été acheté
function reglageAff(c, k) { const R = Save.d.affReglage = Save.d.affReglage || {}; R[c] = R[c] || {}; return R[c][k] === undefined ? 1 : R[c][k]; }
function multAff(cat, a) { const A = affSave()[cat]; let m = 1; for (const k in A) if (A[k] > 0 && correspond(a, k)) m = Math.max(m, 1 + (AFF_MULT[A[k]] - 1) * reglageAff(cat, k)); return m; }
function chanceReglee(cat, cible) { let tot = 0, ok = 0; for (const a of ARS[cat]) { const m = multAff(cat, a); tot += m; if (correspond(a, cible)) ok += m; } return ok / tot; }
// chance qu'une arme tirée corresponde à la cible : sans affinité, et avec le niveau donné
function chanceAff(cat, cible, niv) {
  const l = ARS[cat]; let tot = 0, ok = 0, tot0 = 0, ok0 = 0;
  for (const a of l) {
    const m = correspond(a, cible) ? AFF_MULT[niv] : multAff(cat, a), c = correspond(a, cible);
    tot += m; if (c) ok += m; tot0 += 1; if (c) ok0 += 1;
  }
  return { avant: ok0 / tot0, apres: ok / tot };
}

// prix d'un fragment d'apparence dans la garde-robe (les légendaires ne s'achètent pas)
const PRIX_FRAG = { commun: 4, rare: 5, epique: 8, mythique: 7 }, PRIX_HASARD = 5; // +30 % (arrondi)
