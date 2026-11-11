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
const SLOTS = { armure: 'Armure', cape: 'Cape', visiere: 'Curseur', trainee: 'Traînée', aura: 'Aura' };
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
  const dispo = SKINS.filter(s => !s.base && !possede(s.id) && (ordre.indexOf(s.rar) >= min || (s.saison && saisonOk(s.saison))) && s.rar !== 'legendaire' && (!slot || s.slot === slot));
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
const CHASSE_PALIERS = [60, 80, 95]; // en % du temps parfait
function chasseCourante() {
  const cle = cleSemaine(), r = RNG(hashStr('chasse-' + cle));
  const c = Save.d.chasseH = Save.d.chasseH && Save.d.chasseH.cle === cle ? Save.d.chasseH : { cle, esp: r.pick(ESP_ORDRE), best: 0, paliers: [] };
  if (c.v !== 6) { c.v = 6; c.bestP = 0; } // nouveau barème : l'ancien meilleur score ne compte plus
  return c;
}
// temps parfait : mesuré avec un robot qui ne rate rien (voir chasse-temps.js) ; on ne peut pas faire mieux avec ces armes
function tempsParfait(def, ars) {
  const T = typeof CHASSE_T !== 'undefined' ? CHASSE_T : { p: {}, s: {}, e: {}, q: {} };
  const p = Math.max(60, T.p[ars.p] || 160);
  let dps = p / (T.q[def.esp] || 1);
  // mesure de cette arme contre ce colosse précis : on garde la plus exigeante des deux estimations
  const P2 = typeof CHASSE_PAIRES !== 'undefined' && CHASSE_PAIRES[def.esp] && CHASSE_PAIRES[def.esp][ars.p];
  if (P2) dps = Math.max(dps, P2);
  dps *= 1 + (T.s[ars.s] || 0) / p;
  return (T.e[def.esp] === undefined ? 8 : T.e[def.esp]) + def.hpMax / dps;
}
// temps de référence de la Chasse : ce qu'une exécution sans le moindre défaut peut viser (la garde du boss est comptée)
function tempsChasse(def, ars) { const g = 1 - (GARDE_DUREE / GARDE_TOUS) * (1 - GARDE_DEGATS); return tempsParfait(def, ars) * .8 / g; }
// barème sévère : 100 % seulement au temps parfait, chaque seconde perdue coûte très cher (arrondi vers le bas)
// 100 % = le temps parfait, 50 % = deux fois plus long (arrondi vers le bas au dixième)
function scoreChasse(parfait, temps) { return Math.floor(1000 * Math.min(1, parfait / Math.max(.01, temps))) / 10; }
const fmtPct = v => (+v || 0).toFixed(1).replace('.', ',') + ' %';
const fmtPrecis = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + r.toFixed(2).padStart(5, '0').replace('.', ','); };
function noterChasse(esp, pct) {
  if (!modeOuvert('chasse')) return;
  const c = chasseCourante();
  if (c.esp !== esp) return;
  if (!c.bestP || pct > c.bestP) c.bestP = pct;
  CHASSE_PALIERS.forEach((lim, i) => {
    if (pct >= lim && !c.paliers.includes(i)) {
      c.paliers.push(i);
      const n = i === 2 ? 5 : 3, txt = txtCristaux(gagnerEclats(n));
      G.annonce('Chasse : palier ' + (i + 1) + ' réussi !', '#ffd86b', 2.2); G.texte(G.p.x, G.p.y - 70, txt, '#ffd86b', 14);
    }
  });
  Save.write();
}

// ---------- Affinités : une toile de probabilités (l'écran est dans affinites.js) ----------
// Chaque type d'arme a une chance d'être tiré et le total fait toujours 100 %. Chaque niveau acheté élargit le minimum et le
// maximum qu'on peut régler. Bouger une chance déplace les autres. Jamais de puissance.
// Règle d'or : l'arme la plus probable n'a jamais plus de 2 fois plus de chance que la moins probable.
const AFF_PRIX = [3, 6, 10, 16, 24, 36], AFF_MAX = AFF_PRIX.length, AFF_PAS = Math.pow(2, 1 / 6), AFF_ECART = 2;
function affSave() {
  let A = Save.d.affinites;
  if (!A || Array.isArray(A.p)) { const v = A || {}; A = Save.d.affinites = { p: {}, s: {}, t: {} }; for (const c of ['p', 's', 't']) for (const k of (v[c] || [])) A[c][k] = 1; }
  for (const c of ['p', 's', 't']) A[c] = A[c] || {};
  // les éléments n'existent plus : les cristaux mis dans une affinité d'élément sont rendus
  for (const c of ['p', 's', 't']) for (const k of Object.keys(A[c])) if (ELEMENTS[k]) { let n = 0; for (let i = 0; i < A[c][k]; i++) n += AFF_PRIX[i]; forgeSave().eclats += n; delete A[c][k]; }
  return A;
}
function affCle(cat, a) { return cat === 'p' ? FAMILLE[a.id] || 'fusil' : a.id; }
function affCibles(cat) { return [...new Set(ARS[cat].map(a => affCle(cat, a)))]; }
function affTaille(cat, k) { return ARS[cat].filter(a => affCle(cat, a) === k).length; }
function affBase(cat, k) { return affTaille(cat, k) / ARS[cat].length; }
// première ouverture : on repart des anciennes affinités (multiplicateurs de tirage)
function affDepart(cat) {
  const A = affSave()[cat], Rg = (Save.d.affReglage || {})[cat] || {}, ANC = [1, 1.6, 2.2, 2.8], P = {};
  for (const a of ARS[cat]) { const k = affCle(cat, a), n = Math.min(3, A[k] || 0); P[k] = (P[k] || 0) + (n ? 1 + (ANC[n] - 1) * (Rg[k] === undefined ? 1 : Rg[k]) : 1); }
  return P;
}
function affProbas(cat) {
  const T = Save.d.affP = Save.d.affP || {}, P = T[cat] = T[cat] || affDepart(cat), l = affCibles(cat);
  for (const k of Object.keys(P)) if (!l.includes(k)) delete P[k];
  let s = 0;
  for (const k of l) { if (!(P[k] >= 0)) P[k] = affBase(cat, k); s += P[k]; }
  if (Math.abs(s - 1) > 1e-9) for (const k of l) P[k] = s > 0 ? P[k] / s : affBase(cat, k);
  affLimiter(cat, P, l);
  return P;
}
// garde les chances de chaque arme dans un écart de 1 à 2 : on cherche le plancher L tel que, chaque arme étant ramenée
// entre L et 2L, le total fasse toujours 100 %
function affLimiter(cat, P, l) {
  const w = k => P[k] / affTaille(cat, k), ws = l.map(w), bas = Math.min(...ws), haut = Math.max(...ws);
  if (haut <= bas * AFF_ECART * (1 + 1e-9)) return;
  const somme = L => l.reduce((t, k) => t + clamp(w(k), L, L * AFF_ECART) * affTaille(cat, k), 0);
  let a = 0, b = 1;
  for (let i = 0; i < 50; i++) { const L = (a + b) / 2; if (somme(L) < 1) a = L; else b = L; }
  const L = (a + b) / 2, N = {};
  for (const k of l) N[k] = clamp(w(k), L, L * AFF_ECART) * affTaille(cat, k);
  Object.assign(P, N);
}
// minimum et maximum achetés : chaque niveau élargit la cote dans les deux sens, jusqu'à ×2 et ÷2 au dernier niveau
function affBornes(cat, k) {
  const n = affSave()[cat][k] || 0, b = affBase(cat, k);
  const o = b / (1 - b), m = Math.pow(AFF_PAS, n);
  return [o / m / (1 + o / m), o * m / (1 + o * m)];
}
// règle une chance dans ses limites ; les autres se partagent le reste en gardant leurs proportions. Une chance achetée ne
// sort jamais de ses limites : si les autres sont bloquées, celle qu'on bouge s'arrête là. Une chance non achetée suit le mouvement.
function affFixer(cat, k, v) {
  const P = affProbas(cat), A = affSave()[cat], [lo, hi] = affBornes(cat, k), N = {};
  const bornes = x => A[x] > 0 ? affBornes(cat, x) : [0, 1];
  let libres = affCibles(cat).filter(x => x !== k), reste = 1 - clamp(v, lo, hi);
  while (libres.length) {
    const tot = libres.reduce((s, x) => s + P[x], 0), base = libres.reduce((s, x) => s + affBase(cat, x), 0);
    const part = x => tot > 1e-9 ? P[x] * reste / tot : affBase(cat, x) * reste / base;
    const bas = libres.filter(x => part(x) < bornes(x)[0] - 1e-12), haut = libres.filter(x => part(x) > bornes(x)[1] + 1e-12);
    if (!bas.length && !haut.length) { for (const x of libres) N[x] = part(x); libres = []; break; }
    const bloquees = bas.length ? bas : haut;
    for (const x of bloquees) { N[x] = bornes(x)[bas.length ? 0 : 1]; reste -= N[x]; }
    libres = libres.filter(x => !bloquees.includes(x));
  }
  Object.assign(P, N);
  P[k] = Math.max(0, 1 - Object.values(N).reduce((s, x) => s + x, 0));
  affLimiter(cat, P, affCibles(cat));
  return P[k];
}
function multAff(cat, a) { const k = affCle(cat, a); return affProbas(cat)[k] / affTaille(cat, k); }

// ---------- Modes à débloquer avec des cristaux ----------
const PRIX_MODE = { chasse: 10, abysses: 25 };
function modeOuvert(m) { return !!(Save.d.debloques || {})[m]; }
function debloquerMode(m) {
  const F = forgeSave();
  if (modeOuvert(m) || F.eclats < PRIX_MODE[m]) return false;
  F.eclats -= PRIX_MODE[m]; (Save.d.debloques = Save.d.debloques || {})[m] = 1; Save.write();
  return true;
}

// prix d'un fragment d'apparence dans la garde-robe (les légendaires ne s'achètent pas)
const PRIX_FRAG = { commun: 4, rare: 5, epique: 8, mythique: 7 }, PRIX_HASARD = 5; // +30 % (arrondi)
