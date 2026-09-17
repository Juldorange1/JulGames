// Icônes des 150 compétences/spécificités : construites au moment de l'affichage
// (ScreenParts.icon dans ui/screens.js) plutôt que 150 SVG écrits à la main. La
// FORME de base vient du premier tag pertinent (priorité ci-dessous) ; un petit
// accent + une légère rotation, dérivés d'un hash de l'id, rendent chaque compétence
// visuellement distincte même quand deux partagent le même tag principal. La COULEUR
// (passée en paramètre) vient toujours uniquement de la rareté — jamais du tag.
function regularPolygonPoints(cx, cy, r, sides, rotationDeg = 0) {
  const rot = rotationDeg * Math.PI / 180;
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (Math.PI * 2 / sides) * i;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

function starPoints(cx, cy, rOuter, rInner, points) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = -Math.PI / 2 + (Math.PI / points) * i;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const ICON_SHAPE_PRIORITY = [
  TAGS.FEU, TAGS.GLACE, TAGS.ELECTRIQUE, TAGS.POISON, TAGS.SANG, TAGS.EAU, TAGS.VENT, TAGS.OMBRE, TAGS.LUMIERE, TAGS.TERRE,
  TAGS.EXPLOSION, TAGS.INVOCATION, TAGS.BOUCLIER, TAGS.SOINS, TAGS.MARQUE, TAGS.CIBLE, TAGS.RESONANCE, TAGS.CHAOS,
  TAGS.CHAINE, TAGS.COPIE, TAGS.RUPTURE, TAGS.EXECUTION, TAGS.RISQUE, TAGS.SACRIFICE, TAGS.RESSOURCE,
  TAGS.PIEGE, TAGS.TELEPORTATION, TAGS.PARRY, TAGS.CONTRE, TAGS.ESQUIVE, TAGS.PRECISION, TAGS.TIMING,
  TAGS.CHARGE, TAGS.DASH, TAGS.MOUVEMENT, TAGS.RAPIDE, TAGS.CORPS_A_CORPS, TAGS.PROJECTILE, TAGS.DISTANCE,
  TAGS.CANALISATION, TAGS.DEFENSE, TAGS.CONTROLE, TAGS.STATUT, TAGS.ELEMENT, TAGS.REACTION, TAGS.COMBO,
  TAGS.POSITIONNEMENT, TAGS.RECUPERATION, TAGS.ZONE, TAGS.CRITIQUE, TAGS.DUREE,
];

const ICON_SHAPES = {
  [TAGS.FEU]: c => `<path d="M14 2 C8 10 6 14 8 20 C9 24 13 26 14 26 C15 26 19 24 20 20 C22 14 18 9 14 2 Z" fill="${c}"/>`,
  [TAGS.GLACE]: c => `<polygon points="${regularPolygonPoints(14, 14, 11, 6, -30)}" fill="${c}"/>`,
  [TAGS.ELECTRIQUE]: c => `<path d="M16 2 L7 16 L13 16 L11 26 L21 12 L14 12 Z" fill="${c}"/>`,
  [TAGS.POISON]: c => `<path d="M14 3 C19 12 22 16 22 19 A8 8 0 1 1 6 19 C6 16 9 12 14 3 Z" fill="${c}"/>`,
  [TAGS.SANG]: c => `<polygon points="14,2 24,14 14,26 4,14" fill="${c}"/>`,
  [TAGS.EAU]: c => `<circle cx="14" cy="14" r="9" fill="none" stroke="${c}" stroke-width="2.5"/><circle cx="14" cy="14" r="4" fill="${c}"/>`,
  [TAGS.VENT]: c => `<path d="M4 10 Q14 4 22 10 M4 16 Q16 10 24 16 M6 22 Q14 18 20 22" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`,
  [TAGS.OMBRE]: c => `<path d="M20 5 A10 10 0 1 0 20 23 A8 8 0 1 1 20 5 Z" fill="${c}"/>`,
  [TAGS.LUMIERE]: c => `<polygon points="${starPoints(14, 14, 12, 5, 8)}" fill="${c}"/>`,
  [TAGS.TERRE]: c => `<polygon points="${regularPolygonPoints(14, 14, 11, 5, -90)}" fill="${c}"/>`,
  [TAGS.EXPLOSION]: c => `<polygon points="${starPoints(14, 14, 13, 5, 8)}" fill="${c}"/>`,
  [TAGS.INVOCATION]: c => `<polygon points="${starPoints(14, 14, 11, 5, 5)}" fill="${c}"/>`,
  [TAGS.BOUCLIER]: c => `<path d="M14 2 L24 6 V14 C24 21 19 25 14 27 C9 25 4 21 4 14 V6 Z" fill="${c}"/>`,
  [TAGS.SOINS]: c => `<rect x="11" y="3" width="6" height="22" rx="2" fill="${c}"/><rect x="3" y="11" width="22" height="6" rx="2" fill="${c}"/>`,
  [TAGS.MARQUE]: c => `<circle cx="14" cy="14" r="9" fill="none" stroke="${c}" stroke-width="2.4"/><line x1="14" y1="1" x2="14" y2="8" stroke="${c}" stroke-width="2.4"/><line x1="14" y1="20" x2="14" y2="27" stroke="${c}" stroke-width="2.4"/><line x1="1" y1="14" x2="8" y2="14" stroke="${c}" stroke-width="2.4"/><line x1="20" y1="14" x2="27" y2="14" stroke="${c}" stroke-width="2.4"/>`,
  [TAGS.CIBLE]: c => ICON_SHAPES[TAGS.MARQUE](c),
  [TAGS.RESONANCE]: c => `<circle cx="14" cy="14" r="11" fill="none" stroke="${c}" stroke-width="1.8"/><circle cx="14" cy="14" r="6" fill="none" stroke="${c}" stroke-width="1.8"/><circle cx="14" cy="14" r="1.5" fill="${c}"/>`,
  [TAGS.CHAOS]: c => `<polygon points="${starPoints(14, 14, 12, 3, 7)}" fill="${c}"/>`,
  [TAGS.CHAINE]: c => `<circle cx="10" cy="14" r="7" fill="none" stroke="${c}" stroke-width="3"/><circle cx="18" cy="14" r="7" fill="none" stroke="${c}" stroke-width="3"/>`,
  [TAGS.COPIE]: c => ICON_SHAPES[TAGS.CHAINE](c),
  [TAGS.RUPTURE]: c => `<circle cx="14" cy="14" r="10" fill="none" stroke="${c}" stroke-width="2.2"/><path d="M9 6 L16 13 L11 15 L18 24" fill="none" stroke="${c}" stroke-width="2"/>`,
  [TAGS.EXECUTION]: c => `<polygon points="4,6 24,6 14,24" fill="${c}"/>`,
  [TAGS.RISQUE]: c => `<polygon points="14,3 25,24 3,24" fill="none" stroke="${c}" stroke-width="2.4"/><rect x="12.5" y="11" width="3" height="7" fill="${c}"/><rect x="12.5" y="19.5" width="3" height="3" fill="${c}"/>`,
  [TAGS.SACRIFICE]: c => `<polygon points="14,2 22,12 14,22 6,12" fill="none" stroke="${c}" stroke-width="2.2"/><circle cx="14" cy="12" r="2.4" fill="${c}"/>`,
  [TAGS.RESSOURCE]: c => `<rect x="5" y="9" width="16" height="12" rx="2" fill="none" stroke="${c}" stroke-width="2.2"/><rect x="21" y="12.5" width="2.5" height="5" fill="${c}"/><rect x="7.5" y="11.5" width="4.5" height="8" fill="${c}"/>`,
  [TAGS.PIEGE]: c => { let p = ''; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const r = i % 2 === 0 ? 11 : 6; p += `${(14 + Math.cos(a) * r).toFixed(1)},${(14 + Math.sin(a) * r).toFixed(1)} `; } return `<polygon points="${p}" fill="${c}"/>`; },
  [TAGS.TELEPORTATION]: c => `<circle cx="10" cy="16" r="7" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="3 3"/><circle cx="21" cy="9" r="4" fill="${c}"/>`,
  [TAGS.PARRY]: c => `<circle cx="14" cy="14" r="10" fill="none" stroke="${c}" stroke-width="2.2"/><line x1="14" y1="14" x2="14" y2="6" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/><line x1="14" y1="14" x2="20" y2="17" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`,
  [TAGS.CONTRE]: c => ICON_SHAPES[TAGS.PARRY](c),
  [TAGS.ESQUIVE]: c => `<path d="M6 20 Q6 8 20 8" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><polygon points="20,4 26,8 20,12" fill="${c}"/>`,
  [TAGS.PRECISION]: c => `<circle cx="14" cy="14" r="10" fill="none" stroke="${c}" stroke-width="1.8"/><circle cx="14" cy="14" r="2" fill="${c}"/><line x1="14" y1="1" x2="14" y2="6" stroke="${c}" stroke-width="1.8"/><line x1="14" y1="22" x2="14" y2="27" stroke="${c}" stroke-width="1.8"/>`,
  [TAGS.TIMING]: c => `<circle cx="14" cy="14" r="10" fill="none" stroke="${c}" stroke-width="2.2"/><line x1="14" y1="14" x2="14" y2="7" stroke="${c}" stroke-width="2"/><line x1="14" y1="14" x2="18" y2="16" stroke="${c}" stroke-width="2"/>`,
  [TAGS.CHARGE]: c => `<polygon points="14,4 24,24 4,24" fill="${c}"/>`,
  [TAGS.DASH]: c => `<path d="M6 6 L18 14 L6 22" fill="none" stroke="${c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  [TAGS.MOUVEMENT]: c => ICON_SHAPES[TAGS.DASH](c),
  [TAGS.RAPIDE]: c => ICON_SHAPES[TAGS.DASH](c),
  [TAGS.CORPS_A_CORPS]: c => `<polygon points="14,4 24,24 4,24" fill="none" stroke="${c}" stroke-width="2.4"/>`,
  [TAGS.PROJECTILE]: c => `<path d="M4 14 H20 M14 6 L22 14 L14 22" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  [TAGS.DISTANCE]: c => ICON_SHAPES[TAGS.PROJECTILE](c),
  [TAGS.CANALISATION]: c => `<path d="M2 15 Q7 7 12 15 T22 15 T26 15" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`,
  [TAGS.DEFENSE]: c => ICON_SHAPES[TAGS.BOUCLIER](c),
  [TAGS.CONTROLE]: c => `<polygon points="${regularPolygonPoints(14, 14, 11, 8, 22.5)}" fill="none" stroke="${c}" stroke-width="2.2"/>`,
  [TAGS.STATUT]: c => `<path d="M14 4 C18 11 21 15 21 18 A7 7 0 1 1 7 18 C7 15 10 11 14 4 Z" fill="none" stroke="${c}" stroke-width="2.2"/><circle cx="14" cy="18" r="2" fill="${c}"/>`,
  [TAGS.ELEMENT]: c => `<circle cx="14" cy="6" r="2.6" fill="${c}"/><circle cx="22" cy="14" r="2.6" fill="${c}" opacity="0.75"/><circle cx="14" cy="22" r="2.6" fill="${c}" opacity="0.5"/><circle cx="6" cy="14" r="2.6" fill="${c}" opacity="0.25"/>`,
  [TAGS.REACTION]: c => `<circle cx="14" cy="14" r="10" fill="none" stroke="${c}" stroke-width="2"/><path d="M15 8 L10 15 L14 15 L13 20 L18 13 L14 13 Z" fill="${c}"/>`,
  [TAGS.COMBO]: c => `<polygon points="6,10 16,10 16,4 24,14 16,24 16,18 6,18" fill="${c}"/>`,
  [TAGS.POSITIONNEMENT]: c => `<path d="M14 2 C8 2 4 6 4 11 C4 18 14 26 14 26 C14 26 24 18 24 11 C24 6 20 2 14 2 Z" fill="none" stroke="${c}" stroke-width="2.2"/><circle cx="14" cy="11" r="3.4" fill="${c}"/>`,
  [TAGS.RECUPERATION]: c => ICON_SHAPES[TAGS.SOINS](c),
  [TAGS.ZONE]: c => `<circle cx="14" cy="14" r="10" fill="none" stroke="${c}" stroke-width="3"/>`,
  [TAGS.CRITIQUE]: c => ICON_SHAPES[TAGS.INVOCATION](c),
  [TAGS.DUREE]: c => ICON_SHAPES[TAGS.ZONE](c),
  DEFAULT: c => `<circle cx="14" cy="14" r="10" fill="${c}"/>`,
};

// Petits accents superposés (choisis par hash de l'id) pour différencier deux
// compétences qui partageraient la même forme de base.
const ICON_ACCENTS = [
  () => '',
  c => `<circle cx="23" cy="5" r="2.4" fill="${c}"/>`,
  c => `<circle cx="5" cy="23" r="2.4" fill="${c}"/>`,
  c => `<circle cx="23" cy="5" r="1.8" fill="${c}"/><circle cx="25" cy="10" r="1.4" fill="${c}"/>`,
  c => `<path d="M22 3 L26 3 L26 7" fill="none" stroke="${c}" stroke-width="1.8"/>`,
  c => `<path d="M2 25 L2 21 L6 21" fill="none" stroke="${c}" stroke-width="1.8"/>`,
  c => `<circle cx="23" cy="23" r="3" fill="none" stroke="${c}" stroke-width="1.6"/>`,
];

function buildIcon(tags, id, color) {
  const shapeKey = ICON_SHAPE_PRIORITY.find(t => tags.includes(t)) || 'DEFAULT';
  const base = (ICON_SHAPES[shapeKey] || ICON_SHAPES.DEFAULT)(color);
  const h = hashString(id);
  const accent = ICON_ACCENTS[h % ICON_ACCENTS.length](color);
  const rotation = (h % 8) * 15;
  return `<g transform="rotate(${rotation} 14 14)">${base}${accent}</g>`;
}
