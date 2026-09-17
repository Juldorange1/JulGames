// Génération procédurale du niveau : chaque colonne (largeur = COL_WIDTH) définit un couloir
// [top, bottom]. La règle d'or : le centre du couloir ne peut bouger que de ±1 rangée par colonne,
// exactement la pente maximale atteignable par le Wave (45°, quelle que soit la vitesse). Un passage
// est donc TOUJOURS franchissable par construction, tant que le joueur reste centré.

// steps: {dCenter: -1|0|1, gap (en rangées), spikeTop, spikeBottom, perfect}
const PATTERNS = [
  // --- Palier 1 : introduction ---
  { tier: 1, steps: flat(4.6, 10) },
  { tier: 1, steps: ramp(4.4, 2.6, 8) },
  { tier: 1, steps: wave([1, 1, 0, -1, -1, 0], 3.4, 3) },
  { tier: 1, steps: slowDrift(3.8, 2) },
  { tier: 1, steps: spikeGauntlet(3.6, 8) },
  { tier: 1, steps: crenellation(4.2, 3.0, 6) },

  // --- Palier 2 : couloirs plus étroits, premiers pics ---
  { tier: 2, steps: wave([1, 0, -1, 0], 2.8, 4) },
  { tier: 2, steps: narrowGates(2.6, 1.7, 3) },
  { tier: 2, steps: spikeAlternate(2.2, 5) },
  { tier: 2, steps: funnel(3.4, 1.9, 5) },
  { tier: 2, steps: staircase(2.6, 3, 2, 1) },
  { tier: 2, steps: doubleZigzag(2.6, 8) },

  // --- Palier 3 : changements rapides, pics répétés ---
  { tier: 3, steps: zigzag(2.1, 6) },
  { tier: 3, steps: narrowGates(2.2, 1.5, 4) },
  { tier: 3, steps: spikeAlternate(1.9, 7) },
  { tier: 3, steps: twinGates(2.4, 1.6, 3) },
  { tier: 3, steps: risingStairs(2.6, 1.7, 4) },
  { tier: 3, steps: crenellation(2.4, 1.5, 8) },
  { tier: 3, steps: spikeCross(2.3, 6) },

  // --- Palier 4 : passages étroits successifs, précision ---
  { tier: 4, steps: narrowGates(2.0, 1.25, 5) },
  { tier: 4, steps: zigzag(1.6, 8) },
  { tier: 4, steps: precisionChain(1.35, 6) },
  { tier: 4, steps: funnel(2.6, 1.3, 6) },
  { tier: 4, steps: narrowSlalom(1.5, 8) },
  { tier: 4, steps: offCenterPinch(1.35, 3) },

  // --- Palier 5+ : enchaînements de timings très précis ---
  { tier: 5, steps: precisionChain(1.15, 8) },
  { tier: 5, steps: pinchGate(1.0, 2) },
  { tier: 5, steps: zigzagPrecise(1.3, 9) },
  { tier: 5, steps: twinGates(2.0, 1.1, 4) },
  { tier: 5, steps: staircase(1.4, 2, 4, -1) },
  { tier: 5, steps: spikeGauntlet(1.6, 10) },

  { tier: 6, steps: precisionChain(1.05, 10) },
  { tier: 6, steps: pinchGate(0.98, 3) },
  { tier: 6, steps: narrowSlalom(1.15, 10) },
  { tier: 6, steps: offCenterPinch(1.05, 4) },
  { tier: 6, steps: risingStairs(1.8, 1.05, 3) },

  { tier: 7, steps: precisionChain(0.98, 12) },
  { tier: 7, steps: twinGates(1.3, 0.95, 5) },
  { tier: 7, steps: doubleZigzag(1.0, 12) },
  { tier: 7, steps: spikeCross(1.1, 10) },
];

function flat(gap, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ dCenter: 0, gap });
  return out;
}

function ramp(gapStart, gapEnd, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push({ dCenter: 0, gap: gapStart + (gapEnd - gapStart) * t });
  }
  return out;
}

function wave(pattern, gap, repeats) {
  const out = [];
  for (let r = 0; r < repeats; r++) {
    for (const d of pattern) out.push({ dCenter: d, gap });
  }
  return out;
}

function zigzag(gap, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ dCenter: i % 2 === 0 ? 1 : -1, gap });
  return out;
}

function zigzagPrecise(gap, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ dCenter: i % 2 === 0 ? 1 : -1, gap, perfect: true, spikeTop: i % 2 === 0, spikeBottom: i % 2 !== 0 });
  }
  return out;
}

function narrowGates(gapWide, gapNarrow, count) {
  const out = [];
  for (let g = 0; g < count; g++) {
    out.push({ dCenter: 0, gap: gapWide });
    out.push({ dCenter: g % 2 === 0 ? 1 : -1, gap: gapNarrow, perfect: true, spikeTop: true, spikeBottom: true });
    out.push({ dCenter: 0, gap: gapWide });
  }
  return out;
}

function spikeAlternate(gap, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ dCenter: i % 3 === 1 ? (i % 2 === 0 ? 1 : -1) : 0, gap, spikeTop: i % 2 === 0, spikeBottom: i % 2 !== 0, perfect: i % 2 === 0 });
  }
  return out;
}

function precisionChain(gap, n) {
  const out = [];
  const seq = [0, 1, 0, -1, 1, -1, 0, 1, -1, 0, 1, -1];
  for (let i = 0; i < n; i++) {
    out.push({ dCenter: seq[i % seq.length], gap, perfect: true, spikeTop: i % 2 === 0, spikeBottom: i % 2 !== 0 });
  }
  return out;
}

function pinchGate(gap, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ dCenter: 0, gap: 3.4 });
    out.push({ dCenter: 0, gap, perfect: true, spikeTop: true, spikeBottom: true });
    out.push({ dCenter: 0, gap: 3.4 });
  }
  return out;
}

// --- Nouveaux types d'obstacles ---

// Escalier : le centre grimpe (ou descend) en bloc sur plusieurs colonnes, marque une pause, puis
// repart dans l'autre sens. Rythme différent d'un zigzag : mouvement soutenu plutôt qu'alterné.
function staircase(gap, stepLen, count, startDir) {
  const out = [];
  let dir = startDir || 1;
  for (let c = 0; c < count; c++) {
    for (let i = 0; i < stepLen; i++) out.push({ dCenter: dir, gap });
    out.push({ dCenter: 0, gap });
    out.push({ dCenter: 0, gap });
    dir = -dir;
  }
  return out;
}

// Entonnoir : couloir droit (aucun décalage de centre) dont la largeur se resserre progressivement
// puis se rouvre — teste le placement, pas le suivi diagonal.
function funnel(gapWide, gapNarrow, halfLen) {
  const out = [];
  for (let i = 0; i < halfLen; i++) {
    const t = i / (halfLen - 1);
    out.push({ dCenter: 0, gap: gapWide + (gapNarrow - gapWide) * t });
  }
  for (let i = 1; i < halfLen; i++) {
    const t = i / (halfLen - 1);
    out.push({ dCenter: 0, gap: gapNarrow + (gapWide - gapNarrow) * t });
  }
  return out;
}

// Créneaux : la largeur alterne brutalement large/étroite sans transition ni décalage de centre —
// rythme de "battements" plutôt qu'un suivi progressif.
function crenellation(gapWide, gapNarrow, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ dCenter: 0, gap: i % 2 === 0 ? gapWide : gapNarrow });
  return out;
}

// Portes jumelles : deux portes étroites dos à dos, décalées en sens opposés, sans large couloir de
// récupération entre les deux — enchaînement plus serré que narrowGates.
function twinGates(gapWide, gapNarrow, pairs) {
  const out = [];
  for (let p = 0; p < pairs; p++) {
    out.push({ dCenter: 0, gap: gapWide });
    out.push({ dCenter: 1, gap: gapNarrow, perfect: true, spikeTop: true, spikeBottom: true });
    out.push({ dCenter: -1, gap: gapNarrow, perfect: true, spikeTop: true, spikeBottom: true });
    out.push({ dCenter: 0, gap: gapWide });
  }
  return out;
}

// Dérive lente : mouvement long et paresseux, très peu de colonnes actives par cycle — sensation
// hypnotique bien plus lente qu'un wave classique.
function slowDrift(gap, cycles) {
  const out = [];
  const seq = [1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0];
  for (let c = 0; c < cycles; c++) {
    for (const d of seq) out.push({ dCenter: d, gap });
  }
  return out;
}

// Traversée de pics : couloir large et rectiligne, mais un pic garni chaque colonne en alternance —
// aucune précision de trajectoire requise, juste ne pas paniquer face au décor menaçant.
function spikeGauntlet(gap, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ dCenter: 0, gap, spikeTop: i % 2 === 0, spikeBottom: i % 2 !== 0 });
  }
  return out;
}

// Zigzag double : période 4 (haut, haut, bas, bas) plutôt qu'alternance stricte — rythme plus ample.
function doubleZigzag(gap, n) {
  const out = [];
  const seq = [1, 1, -1, -1];
  for (let i = 0; i < n; i++) out.push({ dCenter: seq[i % seq.length], gap });
  return out;
}

// Slalom serré : gap resserré en continu (jamais de retour au large) avec un léger zigzag toutes les
// 2 colonnes — précision soutenue plutôt qu'un pic de difficulté ponctuel.
function narrowSlalom(gap, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ dCenter: (i % 4 < 2) ? 1 : -1, gap, spikeTop: i % 4 === 1, spikeBottom: i % 4 === 3 });
  }
  return out;
}

// Marches montantes : la largeur se réduit par paliers nets (pas de transition douce) — trois
// niveaux de largeur bien tranchés plutôt qu'une rampe continue.
function risingStairs(gapWide, gapNarrow, stepCols) {
  const out = [];
  const mid = (gapWide + gapNarrow) / 2;
  for (const g of [gapWide, mid, gapNarrow]) {
    for (let i = 0; i < stepCols; i++) out.push({ dCenter: 0, gap: g });
  }
  return out;
}

// Pics croisés : couloir droit, mais périodiquement les deux bords portent un pic en même temps —
// rester centré suffit, mais l'instant est visuellement intense.
function spikeCross(gap, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const hit = i % 3 === 1;
    out.push({ dCenter: 0, gap, perfect: hit, spikeTop: hit, spikeBottom: hit });
  }
  return out;
}

// Pince décentrée : la porte étroite n'est pas au centre du couloir — il faut se pencher dedans
// plutôt que de simplement rester centré, contrairement à pinchGate.
function offCenterPinch(gapNarrow, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ dCenter: 1, gap: 3.2 });
    out.push({ dCenter: 0, gap: gapNarrow, perfect: true, spikeTop: true, spikeBottom: true });
    out.push({ dCenter: -1, gap: 3.2 });
  }
  return out;
}

// Score de difficulté des patterns : dépend UNIQUEMENT du multiplicateur de difficulté choisi avant
// la partie, jamais de la distance parcourue. Une partie est donc aussi difficile au premier mètre
// qu'au dernier — seul le multiplicateur sélectionné détermine le niveau.
function scoreForMultiplier(mult) {
  if (mult <= 1) return 1;
  const ratio = Math.log2(mult) / Math.log2(MAX_DIFFICULTY_MULT);
  return Math.min(MAX_DIFFICULTY_SCORE, 1 + ratio * (MAX_DIFFICULTY_SCORE - 1));
}

function pickPattern(score) {
  // les patterns d'un palier commencent à apparaître un peu avant qu'il ne soit "atteint", et leur
  // poids grandit progressivement -> transition douce entre paliers plutôt qu'un changement net.
  const pool = PATTERNS.filter(p => p.tier <= score + 0.35);
  let totalWeight = 0;
  const weights = pool.map(p => {
    const diff = Math.max(0, score - p.tier);
    const w = 1 / (1 + diff * diff);
    totalWeight += w;
    return w;
  });
  let r = Math.random() * totalWeight;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function randomPortalGap() {
  return PORTAL_MIN_GAP_COLUMNS + Math.floor(Math.random() * (PORTAL_MAX_GAP_COLUMNS - PORTAL_MIN_GAP_COLUMNS));
}

function randomPortalSegmentLength() {
  return PORTAL_SEGMENT_MIN_COLUMNS + Math.floor(Math.random() * (PORTAL_SEGMENT_MAX_COLUMNS - PORTAL_SEGMENT_MIN_COLUMNS));
}

function randomGravityGateGap() {
  return GRAVITY_GATE_MIN_GAP_COLUMNS + Math.floor(Math.random() * (GRAVITY_GATE_MAX_GAP_COLUMNS - GRAVITY_GATE_MIN_GAP_COLUMNS));
}

function randomSpeedGateGap() {
  return SPEED_GATE_MIN_GAP_COLUMNS + Math.floor(Math.random() * (SPEED_GATE_MAX_GAP_COLUMNS - SPEED_GATE_MIN_GAP_COLUMNS));
}

function makeLevelGenerator(difficultyMult, startMode) {
  const score = scoreForMultiplier(difficultyMult || 1); // constante pour toute la partie
  let columns = []; // colonnes déjà générées, indexées depuis le début de la partie
  let cursorCenter = ROWS / 2;
  let cursorGap = 4.6;
  let nextColumnIndex = 0;
  let mode = startMode || MODE_WAVE;
  let columnsUntilPortal = randomPortalGap();
  let portalColumnsLeft = 0;
  let columnsSinceCoin = COIN_MIN_SPACING_COLUMNS;
  // État dédié aux modes au sol (Cube/Robot) : hauteur du sol et du plafond, en rangées. Réinitialisé
  // à chaque nouvelle visite d'un de ces modes (voir pushPortalGate).
  let groundLevelRows = GROUND_BASELINE_ROW;
  let ceilingLevelRows = GROUND_CEILING_ROW;
  // Sol/plafond du mode Araignée : ciblent TOUJOURS GROUND_BASELINE_ROW/GROUND_CEILING_ROW (fixes),
  // mais via la même marche à pas plafonné qu'ailleurs — sans ça, la colonne-portail vers l'Araignée
  // imposerait ces valeurs fixes d'un coup, ce qui peut créer un saut de paroi impossible à anticiper
  // si le couloir entrant (Wave/OVNI/Vaisseau/Balle) n'était pas déjà positionné là.
  let spiderFloorRow = GROUND_BASELINE_ROW;
  let spiderCeilingRow = GROUND_CEILING_ROW;
  // Portails de modificateur (gravité/vitesse) : état ambiant, estampillé sur CHAQUE colonne (voir
  // finalizeColumn) quel que soit le mode/la fonction qui la génère — un simple appui à un endroit
  // (pushGravityGate/pushSpeedGate) suffit donc à faire persister l'effet à travers tout ce qui suit
  // (segment courant, retour au Wave, excursion suivante...), sans avoir à le propager partout.
  let gravityInverted = false;
  let speedMult = 1;
  let speedLabel = 'NORMALE';
  let columnsUntilGravityGate = randomGravityGateGap();
  let columnsUntilSpeedGate = randomSpeedGateGap();

  // Point de sortie commun pour toute colonne (Wave, portail, sol, araignée...) : pics décoratifs
  // ambiants, sacs d'or ramassables, construction de l'objet colonne, incrémentation de l'index.
  function finalizeColumn(top, bottom, columnMode, extra) {
    extra = extra || {};
    let spikeTop = !!extra.spikeTop;
    let spikeBottom = !!extra.spikeBottom;
    if (extra.spikeTop === undefined && extra.spikeBottom === undefined) {
      const roll = Math.random();
      if (roll < AMBIENT_SPIKE_CHANCE / 2) spikeTop = true;
      else if (roll < AMBIENT_SPIKE_CHANCE) spikeBottom = true;
    }

    // Sacs d'or : uniquement dans les modes "couloir" (Wave/OVNI/Vaisseau/Balle) — pas de sens près
    // d'un sol/plateforme ou en araignée. Jamais sur une colonne-portail, jamais si trop étroit,
    // jamais deux trop rapprochés.
    let coinSide = null;
    columnsSinceCoin++;
    const isCorridorMode = columnMode === MODE_WAVE || columnMode === MODE_UFO || columnMode === MODE_SHIP || columnMode === MODE_BALL;
    const gapRows = (bottom - top) / ROW_UNIT;
    if (isCorridorMode && !extra.portalGate && gapRows >= COIN_MIN_GAP_ROWS && columnsSinceCoin > COIN_MIN_SPACING_COLUMNS && Math.random() < COIN_CHANCE) {
      coinSide = Math.random() < 0.5 ? 'top' : 'bottom';
      columnsSinceCoin = 0;
    }

    columns.push({
      index: nextColumnIndex,
      top, bottom,
      spikeTop, spikeBottom,
      perfect: !!extra.perfect,
      perfectDone: false,
      tier: score,
      mode: columnMode,
      portalGate: extra.portalGate || null,
      coinSide,
      coinCollected: false,
      groundHazard: !!extra.groundHazard,
      isPit: !!extra.isPit,
      spiderFloorDanger: !!extra.spiderFloorDanger,
      spiderCeilingDanger: !!extra.spiderCeilingDanger,
      // Modificateurs ambiants (persistent tant qu'aucun portail dédié ne les change) + marqueur de
      // portail modificateur pour CETTE colonne précise (affichage du nom + détection de traversée).
      gravityInverted,
      speedMult,
      modifierGate: extra.modifierGate || null,
      modifierLabel: extra.modifierLabel || null,
    });
    nextColumnIndex++;
  }

  // Forme de la trajectoire-cible (valeur dans [-1,1]) — plusieurs formes possibles, pour que les
  // obstacles "sentent" différemment selon l'obstacle choisi plutôt que d'être un simple décor
  // recoloré. Chaque forme donne un rythme de jeu différent (bond isolé, double-bond, montée
  // soutenue, grand virage...).
  function portalShapeValue(shape, i, wavelength) {
    const cycle = (((i % wavelength) + wavelength) % wavelength) / wavelength;
    if (shape === 'plateau') return cycle < 0.5 ? 1 : -1; // paliers nets : monte, se pose, redescend, se pose
    if (shape === 'sweep') { // triangulaire : longue dérive continue dans un sens puis l'autre
      const t = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2;
      return t * 2 - 1;
    }
    if (shape === 'doubleBump') { // deux bonds rapprochés puis une longue vallée de récupération
      if (cycle < 0.16) return Math.sin((cycle / 0.16) * Math.PI);
      if (cycle < 0.34) return -0.25;
      if (cycle < 0.5) return Math.sin(((cycle - 0.34) / 0.16) * Math.PI);
      return -1 + ((cycle - 0.5) / 0.5) * 0.4;
    }
    if (shape === 'sawUp') { // montée régulière soutenue puis chute nette (façon tour qu'on gravit)
      return cycle < 0.75 ? (cycle / 0.75) * 2 - 1 : 1 - ((cycle - 0.75) / 0.25) * 2;
    }
    if (shape === 'asymSwoop') { // grand creux asymétrique : plonge plus loin qu'il ne remonte
      return cycle < 0.5 ? -Math.sin(cycle * Math.PI) : Math.sin((cycle - 0.5) * Math.PI) * 0.55;
    }
    return Math.sin(cycle * Math.PI * 2); // sinusoïde douce par défaut
  }

  // Bibliothèque d'obstacles par mode — chacun a son propre rythme, sa largeur de couloir et son
  // style de pics, pour que l'OVNI et le vaisseau aient chacun une vraie identité plutôt qu'un
  // simple décor recoloré autour du même mouvement.
  const UFO_OBSTACLES = [
    { name: 'hopBeat', shape: 'sine', waveMin: 10, waveMax: 16, ampMax: 1.0, gapHard: 3.6, spikeStyle: 'peaks' },
    { name: 'doubleHop', shape: 'doubleBump', waveMin: 16, waveMax: 22, ampMax: 1.05, gapHard: 3.4, spikeStyle: 'peaks' },
    { name: 'towerClimb', shape: 'sawUp', waveMin: 18, waveMax: 26, ampMax: 1.1, gapHard: 3.8, spikeStyle: 'none' },
    { name: 'groundSkim', shape: 'sine', waveMin: 12, waveMax: 18, ampMax: 0.55, gapHard: 3.2, spikeStyle: 'ceiling', centerBias: 1.3 },
    { name: 'narrowPocket', shape: 'plateau', waveMin: 14, waveMax: 20, ampMax: 0.75, gapHard: 3.0, spikeStyle: 'peaks' },
    { name: 'cleanCruise', shape: 'sine', waveMin: 18, waveMax: 26, ampMax: 0.6, gapHard: 4.2, spikeStyle: 'sparse' },
  ];
  const SHIP_OBSTACLES = [
    { name: 'longGlide', shape: 'sine', waveMin: 32, waveMax: 50, ampMax: 1.3, gapHard: 3.8, spikeStyle: 'sparse' },
    { name: 'switchback', shape: 'sweep', waveMin: 26, waveMax: 40, ampMax: 1.2, gapHard: 3.6, spikeStyle: 'sparse' },
    { name: 'threading', shape: 'sine', waveMin: 24, waveMax: 34, ampMax: 0.5, gapHard: 3.0, spikeStyle: 'edges' },
    { name: 'rollercoaster', shape: 'sine', waveMin: 14, waveMax: 20, ampMax: 1.0, gapHard: 3.4, spikeStyle: 'peaks' },
    { name: 'diveLoop', shape: 'asymSwoop', waveMin: 24, waveMax: 32, ampMax: 1.3, gapHard: 3.8, spikeStyle: 'none' },
    { name: 'squeeze', shape: 'sine', waveMin: 20, waveMax: 28, ampMax: 0.45, gapHard: 3.0, spikeStyle: 'edges' },
  ];
  const BALL_OBSTACLES = [
    { name: 'rollArc', shape: 'sine', waveMin: 12, waveMax: 20, ampMax: 1.1, gapHard: 3.6, spikeStyle: 'peaks' },
    { name: 'flipGate', shape: 'plateau', waveMin: 10, waveMax: 16, ampMax: 0.9, gapHard: 3.4, spikeStyle: 'peaks' },
    { name: 'floatLane', shape: 'sine', waveMin: 24, waveMax: 36, ampMax: 0.6, gapHard: 4.0, spikeStyle: 'sparse' },
    { name: 'zigRoll', shape: 'sweep', waveMin: 14, waveMax: 22, ampMax: 1.0, gapHard: 3.6, spikeStyle: 'sparse' },
    // Aussi étroit qu'OVNI/Vaisseau à difficulté max (avant, la Balle plafonnait à 3.4, nettement
    // plus large que les 3.0 des deux autres — un couloir toujours plus confortable à parcourir).
    { name: 'tightRoll', shape: 'doubleBump', waveMin: 14, waveMax: 20, ampMax: 0.85, gapHard: 3.0, spikeStyle: 'peaks' },
  ];
  const CALM_OBSTACLE = { name: 'calm', shape: 'sine', waveMin: 40, waveMax: 40, ampMax: 0.15, gapHard: 5.0, spikeStyle: 'none' };
  const MIN_PORTAL_HALF = 1.5; // plancher de sécurité dédié aux portails (gap >= 3.0 rangées, toujours)

  function portalObstaclePool(newMode) {
    if (newMode === MODE_UFO) return UFO_OBSTACLES;
    if (newMode === MODE_SHIP) return SHIP_OBSTACLES;
    return BALL_OBSTACLES;
  }

  // Segment OVNI/vaisseau/balle : un obstacle de la bibliothèque du mode, appliqué via une marche à
  // pas plafonné (centre ET largeur) — ça garantit qu'aucune colonne ne peut jamais sauter de plus
  // que ce plafond, quels que soient la forme choisie et le point de départ (y compris venant du
  // Wave). La difficulté choisie avant la partie (score) module largeur/amplitude/pics exactement
  // comme pour le Wave : à difficulté max, tous les modes sont aussi durs que le Wave lui-même.
  function pushPortalChunk(newMode, n, obstacleOverride) {
    const pool = portalObstaclePool(newMode);
    const def = obstacleOverride || pool[Math.floor(Math.random() * pool.length)];
    const diffT = (score - 1) / (MAX_DIFFICULTY_SCORE - 1); // 0 (facile) .. 1 (difficulté max)

    const gapEasy = Math.min(5.4, def.gapHard + 1.2);
    const targetGap = gapEasy + (def.gapHard - gapEasy) * diffT;
    const targetHalf = targetGap / 2;
    const amplitude = Math.min(def.ampMax * (0.3 + 0.7 * diffT), (ROWS - targetGap) / 2 - 0.2);
    const wavelength = def.waveMin + Math.floor(Math.random() * (def.waveMax - def.waveMin + 1));
    const centerBias = def.centerBias || 0;
    const maxDriftPerColumn = 0.07 + 0.08 * diffT;
    const maxHalfDriftPerColumn = 0.05 + 0.04 * diffT;

    let center = cursorCenter;
    let half = Math.max(MIN_PORTAL_HALF, cursorGap / 2);
    center = Math.max(half, Math.min(ROWS - half, center));

    for (let i = 0; i < n; i++) {
      // 1) largeur du couloir : marche à pas plafonné vers la largeur cible de cet obstacle.
      const halfDelta = Math.max(-maxHalfDriftPerColumn, Math.min(maxHalfDriftPerColumn, targetHalf - half));
      half = Math.max(MIN_PORTAL_HALF, half + halfDelta);

      // 2) position du couloir : marche à pas plafonné vers la forme de cet obstacle.
      const shapeVal = portalShapeValue(def.shape, i, wavelength);
      const targetCenter = ROWS / 2 + centerBias + amplitude * shapeVal;
      const clampedTarget = Math.max(half, Math.min(ROWS - half, targetCenter));
      const delta = Math.max(-maxDriftPerColumn, Math.min(maxDriftPerColumn, clampedTarget - center));
      center = Math.max(half, Math.min(ROWS - half, center + delta));

      // Pics décoratifs selon le style de l'obstacle (jamais dans la collision, juste le décor).
      let spikeTop, spikeBottom;
      const peakThreshold = 0.9 - 0.15 * diffT;
      if (def.spikeStyle === 'peaks' && Math.abs(shapeVal) > peakThreshold) {
        if (shapeVal > 0) spikeTop = true; else spikeBottom = true;
      } else if (def.spikeStyle === 'ceiling' && shapeVal > (0.65 - 0.2 * diffT)) {
        spikeTop = true;
      } else if (def.spikeStyle === 'edges' && Math.random() < (0.18 + 0.14 * diffT)) {
        spikeTop = Math.random() < 0.5; spikeBottom = !spikeTop;
      } else if (def.spikeStyle === 'sparse' && Math.random() < (0.04 + 0.1 * diffT)) {
        spikeTop = Math.random() < 0.5; spikeBottom = !spikeTop;
      } else if (def.spikeStyle === 'none') {
        spikeTop = false; spikeBottom = false;
      }

      finalizeColumn((center - half) * ROW_UNIT, (center + half) * ROW_UNIT, newMode, { spikeTop, spikeBottom });
      cursorCenter = center;
      cursorGap = half * 2;
    }
  }

  function pushPortalSegment(newMode, n) {
    let remaining = n;
    while (remaining > 0) {
      const chunkLen = Math.min(remaining, 12 + Math.floor(Math.random() * 12));
      pushPortalChunk(newMode, chunkLen);
      remaining -= chunkLen;
      maybeInsertModifierGates(newMode, chunkLen);
    }
  }

  // --- Modes au sol : Cube / Robot ---
  // Une colonne au sol garde "top"/"bottom" mais avec un sens différent : "bottom" est la hauteur du
  // sol/d'une plateforme (sûr à toucher, sauf si groundHazard), "top" est le plafond (loin, rarement
  // gênant). La hauteur du sol ET celle du plafond avancent toutes deux par pas plafonnés à
  // GROUND_MAX_STEP_ROWS — comme pour les portails, ça garantit qu'aucun changement de hauteur ne
  // peut jamais excéder ce que Cube/Robot peuvent réellement franchir, quel que soit l'obstacle.
  function pushGroundColumn(newMode, targetBottomRows, targetTopRows, hazard) {
    const maxStep = GROUND_MAX_STEP_ROWS;
    const bDelta = Math.max(-maxStep, Math.min(maxStep, targetBottomRows - groundLevelRows));
    groundLevelRows = Math.max(2.6, Math.min(ROWS - 0.3, groundLevelRows + bDelta));
    const cDelta = Math.max(-maxStep, Math.min(maxStep, targetTopRows - ceilingLevelRows));
    ceilingLevelRows = Math.max(0.3, Math.min(ROWS - 2.6, ceilingLevelRows + cDelta));
    if (groundLevelRows - ceilingLevelRows < 2.2) groundLevelRows = ceilingLevelRows + 2.2; // marge mini sol/plafond
    const bottom = groundLevelRows * ROW_UNIT;
    const top = ceilingLevelRows * ROW_UNIT;
    finalizeColumn(top, bottom, newMode, { groundHazard: hazard, spikeBottom: hazard });
    cursorCenter = (ceilingLevelRows + groundLevelRows) / 2;
    cursorGap = groundLevelRows - ceilingLevelRows;
  }

  // Trou (pas de sol du tout) : le joueur doit être en l'air (en saut) pour le traverser. Largeur
  // toujours très en dessous de la portée de saut réelle (voir GROUND_MAX_PIT_COLUMNS).
  function pushGroundPitColumn(newMode) {
    finalizeColumn(ceilingLevelRows * ROW_UNIT, FIELD_HEIGHT + ROW_UNIT * 4, newMode, { groundHazard: false, isPit: true });
    cursorCenter = ROWS / 2;
    cursorGap = ROWS - 0.4;
  }

  function groundFlat(newMode, n) {
    for (let i = 0; i < n; i++) pushGroundColumn(newMode, GROUND_BASELINE_ROW, GROUND_CEILING_ROW, false);
  }
  // Pic au sol : hauteur volontairement sous GROUND_MAX_STEP_ROWS pour rester dans le même
  // mécanisme de marche plafonnée que tout le reste — un aller-retour d'un cran, pas un cas spécial.
  function groundSpikeRow(newMode, count) {
    for (let i = 0; i < count; i++) {
      pushGroundColumn(newMode, GROUND_BASELINE_ROW - GROUND_SPIKE_HEIGHT_ROWS, GROUND_CEILING_ROW, true);
      pushGroundColumn(newMode, GROUND_BASELINE_ROW, GROUND_CEILING_ROW, false);
      if (i < count - 1) pushGroundColumn(newMode, GROUND_BASELINE_ROW, GROUND_CEILING_ROW, false);
    }
  }
  function groundPit(newMode, width) {
    for (let i = 0; i < width; i++) pushGroundPitColumn(newMode);
    pushGroundColumn(newMode, GROUND_BASELINE_ROW, GROUND_CEILING_ROW, false); // atterrissage
  }
  // Plateforme : le sol monte (ou descend) d'un cran modéré, tient sur plusieurs colonnes, puis
  // redescend en douceur. Parfois précédée d'un petit trou pour forcer un vrai saut vers le haut.
  function groundPlatform(newMode, stepRows, holdCols, viaPit) {
    const targetLevel = GROUND_BASELINE_ROW - stepRows;
    if (viaPit) pushGroundPitColumn(newMode);
    for (let i = 0; i < holdCols; i++) pushGroundColumn(newMode, targetLevel, GROUND_CEILING_ROW, false);
    for (let i = 0; i < 3; i++) pushGroundColumn(newMode, GROUND_BASELINE_ROW, GROUND_CEILING_ROW, false);
  }
  // Plafond bas : oblige à garder un saut court (ou à rester au sol) sur quelques colonnes.
  function groundLowCeiling(newMode, dropRows, holdCols) {
    const targetCeiling = GROUND_CEILING_ROW + dropRows;
    for (let i = 0; i < holdCols; i++) pushGroundColumn(newMode, GROUND_BASELINE_ROW, targetCeiling, false);
    for (let i = 0; i < 2; i++) pushGroundColumn(newMode, GROUND_BASELINE_ROW, GROUND_CEILING_ROW, false);
  }

  // Un saut (Cube/Robot) reste en l'air ~125 unités-monde avant de retoucher le sol : deux obstacles
  // exigeant un saut (pic, trou, plateforme via trou) enchaînés avec moins de marge que ça rendent le
  // second intraitable (l'instant idéal pour sauter tomberait pendant que le joueur est encore en
  // l'air sur le premier). MIN_HAZARD_GAP_COLUMNS force une marge plate large avant d'en retirer un.
  function pushGroundSegment(newMode, n) {
    // Pas de reset : la marge calme (pushCalmBuffer) a déjà ramené groundLevelRows/ceilingLevelRows
    // près du sol de base à pas plafonné ; un reset direct ici recréerait le même saut de plancher.
    const diffT = (score - 1) / (MAX_DIFFICULTY_SCORE - 1);
    const MIN_HAZARD_GAP_COLUMNS = 4;
    let remaining = n;
    let hazardCooldown = 0;
    while (remaining > 0) {
      if (hazardCooldown > 0) {
        const flatLen = Math.min(remaining, hazardCooldown);
        groundFlat(newMode, flatLen);
        remaining -= flatLen;
        hazardCooldown -= flatLen;
        continue;
      }
      const roll = Math.random();
      if (roll < 0.28) {
        groundSpikeRow(newMode, 1);
        remaining -= 2;
        hazardCooldown = MIN_HAZARD_GAP_COLUMNS;
      } else if (roll < 0.5) {
        const width = Math.min(GROUND_MAX_PIT_COLUMNS, 1 + Math.floor(diffT * 1.4));
        groundPit(newMode, width);
        remaining -= width + 1;
        hazardCooldown = MIN_HAZARD_GAP_COLUMNS;
      } else if (roll < 0.72) {
        const stepRows = 0.5 + 0.35 * diffT;
        const holdCols = 4 + Math.floor(Math.random() * 4);
        const viaPit = Math.random() < 0.5;
        groundPlatform(newMode, stepRows, holdCols, viaPit);
        remaining -= holdCols + 3 + (viaPit ? 1 : 0);
        if (viaPit) hazardCooldown = MIN_HAZARD_GAP_COLUMNS;
      } else if (roll < 0.85) {
        const dropRows = 0.8 + 0.6 * diffT;
        const holdCols = 5 + Math.floor(Math.random() * 4);
        groundLowCeiling(newMode, dropRows, holdCols);
        remaining -= holdCols + 2;
      } else {
        const flatLen = 4 + Math.floor(Math.random() * 5);
        groundFlat(newMode, flatLen);
        remaining -= flatLen;
      }
    }
  }

  // --- Mode Araignée ---
  // Le sol ET le plafond restent TOUJOURS à une position fixe (aucune dérive) — seule la surface
  // "dangereuse" change. Le joueur bascule instantanément entre les deux (aucune physique libre),
  // donc la seule règle de sécurité qui compte est : jamais les deux surfaces dangereuses en même
  // temps sur une même colonne.
  function pushSpiderColumn(newMode, floorDanger, ceilingDanger) {
    const maxStep = GROUND_MAX_STEP_ROWS;
    const fDelta = Math.max(-maxStep, Math.min(maxStep, GROUND_BASELINE_ROW - spiderFloorRow));
    spiderFloorRow += fDelta;
    const cDelta = Math.max(-maxStep, Math.min(maxStep, GROUND_CEILING_ROW - spiderCeilingRow));
    spiderCeilingRow += cDelta;
    finalizeColumn(spiderCeilingRow * ROW_UNIT, spiderFloorRow * ROW_UNIT, newMode, {
      spikeTop: ceilingDanger, spikeBottom: floorDanger,
      spiderFloorDanger: floorDanger, spiderCeilingDanger: ceilingDanger,
    });
    cursorCenter = (spiderCeilingRow + spiderFloorRow) / 2;
    cursorGap = spiderFloorRow - spiderCeilingRow;
  }

  // Comme tout autre mode, la difficulté choisie doit se ressentir : moins de répit entre deux
  // dangers et des dangers plus souvent doublés à haute difficulté (jamais les deux surfaces en même
  // temps — l'invariant de sécurité de pushSpiderColumn ne dépend d'ailleurs pas de ces longueurs).
  function pushSpiderSegment(newMode, n) {
    const diffT = (score - 1) / (MAX_DIFFICULTY_SCORE - 1);
    let remaining = n;
    while (remaining > 0) {
      const safeLen = Math.max(2, Math.round(3 + Math.random() * 4 - diffT * 2));
      for (let i = 0; i < safeLen && remaining > 0; i++, remaining--) pushSpiderColumn(newMode, false, false);
      if (remaining <= 0) break;
      const dangerOnFloor = Math.random() < 0.5;
      const dangerLen = 1 + (Math.random() < (0.4 + diffT * 0.4) ? 1 : 0);
      for (let i = 0; i < dangerLen && remaining > 0; i++, remaining--) {
        pushSpiderColumn(newMode, dangerOnFloor, !dangerOnFloor);
      }
    }
  }

  function pushModeSegment(newMode, n) {
    if (newMode === MODE_SPIDER) pushSpiderSegment(newMode, n);
    else if (newMode === MODE_CUBE || newMode === MODE_ROBOT) pushGroundSegment(newMode, n);
    else pushPortalSegment(newMode, n);
  }

  function pushCalmBuffer(newMode) {
    if (newMode === MODE_SPIDER) {
      for (let i = 0; i < PORTAL_SAFE_BUFFER_COLUMNS; i++) pushSpiderColumn(newMode, false, false);
    } else if (newMode === MODE_CUBE || newMode === MODE_ROBOT) {
      // Pas de reset ici : on part d'où la colonne-portail (pushPortalGate) a laissé
      // groundLevelRows/ceilingLevelRows, et groundFlat les ramène au sol de base en douceur, à pas
      // plafonné — un reset direct recréerait le même saut de plancher que celui corrigé côté portail.
      groundFlat(newMode, PORTAL_SAFE_BUFFER_COLUMNS);
    } else {
      pushPortalChunk(newMode, PORTAL_SAFE_BUFFER_COLUMNS, CALM_OBSTACLE);
    }
  }

  // Colonne-portail : large et sûre, sert de marqueur visuel de transition et bascule le mode actif
  // dès que le joueur l'atteint (voir game.js).
  function pushPortalGate(newMode) {
    if (newMode === MODE_SPIDER) {
      // Même logique que pour Cube/Robot ci-dessous : partir du couloir RÉEL entrant (cursorCenter),
      // pas de la géométrie fixe de l'Araignée d'un coup — sinon un Wave positionné près d'un bord de
      // terrain crée un saut de paroi que le joueur, encore en physique Wave à cet instant, ne peut
      // pas voir venir. spiderFloorRow/spiderCeilingRow reviennent ensuite au fixe en douceur.
      const half = 2.2;
      const center = Math.max(half, Math.min(ROWS - half, cursorCenter));
      spiderCeilingRow = center - half;
      spiderFloorRow = center + half;
      finalizeColumn(spiderCeilingRow * ROW_UNIT, spiderFloorRow * ROW_UNIT, newMode, {
        portalGate: newMode, spikeTop: false, spikeBottom: false, spiderFloorDanger: false, spiderCeilingDanger: false,
      });
      cursorCenter = (spiderCeilingRow + spiderFloorRow) / 2;
      cursorGap = spiderFloorRow - spiderCeilingRow;
      return;
    }
    if (newMode === MODE_CUBE || newMode === MODE_ROBOT) {
      // Comme pour le portail générique ci-dessous : on part de la position RÉELLE du couloir
      // entrant (cursorCenter/cursorGap), pas d'une constante absolue. Un reset direct au sol de
      // base créerait un saut de plancher arbitraire entre la dernière colonne du mode précédent et
      // cette colonne-portail — un saut que le joueur, encore régi par l'ancienne physique à cet
      // instant précis (le changement de mode n'a lieu qu'en atteignant physiquement la colonne),
      // ne peut pas anticiper. groundLevelRows/ceilingLevelRows partent donc d'ici, puis reviennent
      // au sol de base au fil des colonnes suivantes via la marche à pas plafonné habituelle.
      const half = 2.2;
      const center = Math.max(half, Math.min(ROWS - half, cursorCenter));
      ceilingLevelRows = center - half;
      groundLevelRows = center + half;
      finalizeColumn(ceilingLevelRows * ROW_UNIT, groundLevelRows * ROW_UNIT, newMode, {
        portalGate: newMode, spikeTop: false, spikeBottom: false, groundHazard: false,
      });
      cursorCenter = (ceilingLevelRows + groundLevelRows) / 2;
      cursorGap = groundLevelRows - ceilingLevelRows;
      return;
    }
    const half = 2.2;
    const center = Math.max(half, Math.min(ROWS - half, cursorCenter));
    finalizeColumn((center - half) * ROW_UNIT, (center + half) * ROW_UNIT, newMode, { portalGate: newMode, spikeTop: false, spikeBottom: false });
    cursorCenter = center;
    cursorGap = half * 2;
  }

  // Portail de gravité : bascule l'inversion pour Wave/OVNI/Vaisseau (jamais la géométrie du couloir,
  // qui ne dépend que de cursorCenter/cursorGap comme n'importe quelle autre colonne-portail) — donc
  // aucun nouveau risque de franchissabilité, juste un changement de sens des commandes en aval (voir
  // player.js/game.js). Colonne large et sûre comme les autres portails, avec son nom écrit dessus.
  function pushGravityGate(currentMode) {
    gravityInverted = !gravityInverted;
    const half = 2.2;
    const center = Math.max(half, Math.min(ROWS - half, cursorCenter));
    finalizeColumn((center - half) * ROW_UNIT, (center + half) * ROW_UNIT, currentMode, {
      spikeTop: false, spikeBottom: false,
      modifierGate: 'gravity', modifierLabel: gravityInverted ? 'GRAVITÉ INVERSÉE' : 'GRAVITÉ NORMALE',
    });
    cursorCenter = center;
    cursorGap = half * 2;
  }

  // Portail de vitesse : change speedMult/speedLabel (lu chaque tick par game.js pour moduler la
  // distance parcourue par seconde) — la géométrie des couloirs ne dépend que du nombre de colonnes,
  // jamais du temps, donc une vitesse différente ne change que le TEMPS passé sur chaque obstacle,
  // jamais sa forme. Toujours un niveau DIFFÉRENT du courant, pour que traverser ait un effet visible.
  function pushSpeedGate(currentMode) {
    const options = SPEED_ZONE_LEVELS.filter((l) => l.mult !== speedMult);
    const chosen = options[Math.floor(Math.random() * options.length)];
    speedMult = chosen.mult;
    speedLabel = chosen.label;
    const half = 2.2;
    const center = Math.max(half, Math.min(ROWS - half, cursorCenter));
    finalizeColumn((center - half) * ROW_UNIT, (center + half) * ROW_UNIT, currentMode, {
      spikeTop: false, spikeBottom: false,
      modifierGate: 'speed', modifierLabel: 'VITESSE ' + chosen.label,
    });
    cursorCenter = center;
    cursorGap = half * 2;
  }

  // Vérifie les comptes à rebours de portails de modificateur et en insère un si besoin — appelé
  // ponctuellement depuis les boucles de génération Wave et OVNI/Vaisseau/Balle (jamais au sol ni en
  // Araignée : voir constants.js). `n` = nombre de colonnes que la boucle appelante s'apprête à
  // générer, pour décrémenter les comptes à rebours à un rythme cohérent avec l'avancement réel.
  function maybeInsertModifierGates(currentMode, n) {
    if (currentMode === MODE_WAVE || currentMode === MODE_UFO || currentMode === MODE_SHIP) {
      columnsUntilGravityGate -= n;
      if (columnsUntilGravityGate <= 0) {
        pushGravityGate(currentMode);
        columnsUntilGravityGate = randomGravityGateGap();
      }
    }
    columnsUntilSpeedGate -= n;
    if (columnsUntilSpeedGate <= 0) {
      pushSpeedGate(currentMode);
      columnsUntilSpeedGate = randomSpeedGateGap();
    }
  }

  function pushStep(step) {
    const half0 = Math.max(MIN_GAP_ROWS_FLOOR, Math.min(ROWS - 0.4, step.gap * GAP_EASE)) / 2;
    // Fenêtre RÉELLEMENT atteignable en un pas : le maximum théorique est 1 rangée/colonne (45° à
    // vitesse constante), mais aucun pattern ne l'exploite jamais à fond — MOVEMENT_SLACK laisse
    // toujours une marge de réaction, pour qu'aucun passage ne soit "tout juste" franchissable.
    const requestedDCenter = (step.dCenter || 0) * MOVEMENT_SLACK;
    const reachLo = Math.max(0, cursorCenter - 1);
    const reachHi = Math.min(ROWS, cursorCenter + 1);
    const preferred = Math.max(reachLo, Math.min(reachHi, cursorCenter + requestedDCenter));
    const preferredHalf = Math.min(preferred, ROWS - preferred);
    let center, half;
    if (preferredHalf >= half0) {
      // Assez de place au centre "naturel" : on garde le gap demandé tel quel.
      center = preferred;
      half = half0;
    } else {
      // Pas assez de place ici (bord de terrain proche) : on glisse, dans la fenêtre atteignable,
      // vers le point qui laisse le plus de place, quitte à réduire un peu le gap — jamais en
      // dessous du plancher, et jamais en sautant de plus d'1 rangée.
      center = Math.max(reachLo, Math.min(reachHi, ROWS / 2));
      half = Math.max(MIN_GAP_ROWS_FLOOR / 2, Math.min(half0, center, ROWS - center));
    }
    let gap = half * 2;

    // --- Garde-fous explicites (défense en profondeur, ne devraient jamais se déclencher) ---
    // Condition 1 : jamais un couloir plus étroit que le plancher absolu.
    if (gap < MIN_GAP_ROWS_FLOOR) { gap = MIN_GAP_ROWS_FLOOR; half = gap / 2; }
    // Condition 2 : jamais un centre hors du terrain compte tenu du gap final.
    if (center - half < 0) center = half;
    if (center + half > ROWS) center = ROWS - half;
    // Condition 3 : jamais un saut de centre supérieur à ce que le Wave peut franchir en une colonne.
    if (Math.abs(center - cursorCenter) > 1) {
      console.warn('Correction de sécurité : saut de centre hors limite évité.');
      center = cursorCenter + Math.sign(center - cursorCenter) * 1;
      half = Math.min(half, center, ROWS - center);
      gap = half * 2;
    }
    // Condition 4 : même en visant simplement le centre de chaque colonne (stratégie "naturelle"
    // d'un joueur, pas un chemin optimal calculé), la marge par rapport au bord de la colonne
    // précédente doit rester confortable — jamais un recouvrement juste "techniquement" non-nul.
    const prevHalf = cursorGap / 2;
    const travelDelta = center - cursorCenter;
    const naiveClearance = travelDelta >= 0 ? (cursorCenter + prevHalf) - center : center - (cursorCenter - prevHalf);
    const SAFE_NAIVE_CLEARANCE = 0.3;
    if (naiveClearance < SAFE_NAIVE_CLEARANCE) {
      const extra = SAFE_NAIVE_CLEARANCE - naiveClearance;
      half = Math.min(half + extra, center, ROWS - center, (ROWS - 0.4) / 2);
      gap = half * 2;
    }

    cursorCenter = center;
    cursorGap = gap;
    const top = (center - half) * ROW_UNIT;
    const bottom = (center + half) * ROW_UNIT;
    finalizeColumn(top, bottom, MODE_WAVE, { spikeTop: step.spikeTop, spikeBottom: step.spikeBottom, perfect: step.perfect });
  }

  function ensureAhead(worldX) {
    const targetColumn = Math.floor(worldX / COL_WIDTH) + 40; // marge d'avance confortable
    while (nextColumnIndex <= targetColumn) {
      if (mode === MODE_WAVE) {
        if (columnsUntilPortal <= 0) {
          // Ouvre un portail vers un mode aléatoire parmi tous les modes jouables.
          const newMode = ALL_PORTAL_MODES[Math.floor(Math.random() * ALL_PORTAL_MODES.length)];
          pushPortalGate(newMode);
          mode = newMode;
          // Zone calme garantie juste après le portail : le temps de s'adapter à la nouvelle
          // physique avant le premier vrai obstacle.
          pushCalmBuffer(newMode);
          portalColumnsLeft = randomPortalSegmentLength();
        } else {
          const pattern = pickPattern(score);
          for (const step of pattern.steps) { pushStep(step); columnsUntilPortal--; }
          // tampon de respiration entre patterns : toujours au moins 1 colonne large
          const bufferLen = Math.max(1, Math.round(4 - (score - 1) * 0.45));
          const bufferGap = Math.min(ROWS - 0.4, cursorGap + 1.6);
          for (let i = 0; i < bufferLen; i++) { pushStep({ dCenter: 0, gap: bufferGap / GAP_EASE }); columnsUntilPortal--; }
          maybeInsertModifierGates(MODE_WAVE, pattern.steps.length + bufferLen);
        }
      } else {
        // Segment du mode en cours, puis portail de retour vers le Wave.
        pushModeSegment(mode, portalColumnsLeft);
        portalColumnsLeft = 0;
        pushPortalGate(MODE_WAVE);
        mode = MODE_WAVE;
        // Zone calme garantie juste après le portail de retour, avant que les vrais patterns Wave
        // ne reprennent — mêmes garde-fous que pushStep (pas de saut, gap toujours confortable).
        for (let i = 0; i < PORTAL_SAFE_BUFFER_COLUMNS; i++) {
          pushStep({ dCenter: 0, gap: 4.6 / GAP_EASE, spikeTop: false, spikeBottom: false });
        }
        columnsUntilPortal = randomPortalGap();
      }
    }
  }

  function trimBehind(worldX) {
    const minColumn = Math.floor(worldX / COL_WIDTH) - 8;
    if (columns.length && columns[0].index < minColumn) {
      columns = columns.filter(c => c.index >= minColumn);
    }
  }

  function getColumnAt(worldX) {
    const idx = Math.floor(worldX / COL_WIDTH);
    if (idx < 0) return null;
    ensureAhead(worldX);
    const first = columns.length ? columns[0].index : 0;
    const arrIdx = idx - first;
    return columns[arrIdx] || null;
  }

  function getColumnsInRange(fromX, toX) {
    ensureAhead(toX);
    const fromIdx = Math.floor(fromX / COL_WIDTH);
    const toIdx = Math.floor(toX / COL_WIDTH);
    const first = columns.length ? columns[0].index : 0;
    const out = [];
    for (let i = fromIdx; i <= toIdx; i++) {
      const arrIdx = i - first;
      if (columns[arrIdx]) out.push(columns[arrIdx]);
    }
    return out;
  }

  // Les toutes premières secondes de la partie sont toujours garanties sans obstacle, quelle que
  // soit la difficulté choisie ET quel que soit le mode de départ (tiré au hasard) : large espace
  // plat/sûr adapté au mode, aucun pic, pour s'orienter avant que la difficulté ne s'applique.
  const introColumns = Math.ceil(INTRO_SAFE_UNITS / COL_WIDTH);
  if (mode === MODE_SPIDER) {
    for (let i = 0; i < introColumns; i++) pushSpiderColumn(mode, false, false);
    portalColumnsLeft = randomPortalSegmentLength();
  } else if (mode === MODE_CUBE || mode === MODE_ROBOT) {
    groundFlat(mode, introColumns);
    portalColumnsLeft = randomPortalSegmentLength();
  } else if (mode === MODE_UFO || mode === MODE_SHIP || mode === MODE_BALL) {
    pushPortalChunk(mode, introColumns, CALM_OBSTACLE);
    portalColumnsLeft = randomPortalSegmentLength();
  } else {
    for (let i = 0; i < introColumns; i++) {
      pushStep({ dCenter: 0, gap: 4.6 / GAP_EASE, spikeTop: false, spikeBottom: false });
    }
  }
  ensureAhead(0);

  return { getColumnAt, getColumnsInRange, ensureAhead, trimBehind };
}
