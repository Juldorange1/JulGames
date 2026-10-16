// Icones dessinees du jeu (SVG, meme style partout) : remplacent les emojis des menus, qui
// s'affichent differemment d'un ordinateur a l'autre.
// - ICONS[nom] = contenu SVG dans une grille 24x24 (traits arrondis, couleur = currentColor) ;
// - EMOJI_ICONS[emoji] = [nom, couleur] ;
// - Icons.watch(racine) remplace automatiquement tout emoji connu qui apparait dans l'interface
//   (texte des boutons, cartes, HUD...) par l'icone correspondante.

const ICONS = {
  hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/><path d="M9 18h6" stroke-width="3"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.6-1-1.6-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2 0 2.8 5.8 1.6 5.8 4.4 0 1.2-1.2 2-2.9 2-1.3 0-2.4-.5-3-1.5M12 6v1.8M12 16.2V18"/>',
  swords: '<path d="M4 4l10 10M4 4h3.5L17 13.5M4 4v3.5L13.5 17M14 20l6-6M16 22l-2-2 6-6 2 2M20 4L10 14M20 4h-3.5M20 4v3.5M10 20l-6-6M8 22l2-2-6-6-2 2"/>',
  crown: '<path d="M3 18h18M4 18L3 7l5 4 4-6 4 6 5-4-1 11z" fill="currentColor" fill-opacity=".25"/><circle cx="12" cy="5" r="1"/><circle cx="3" cy="7" r="1"/><circle cx="21" cy="7" r="1"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
  prev: '<path d="M17 4.5v15L5 12z" fill="currentColor"/>',
  skip: '<path d="M4 5v14l9-7zM13 5v14l7-7zM20 5v14"/>',
  fast: '<path d="M3 5v14l9-7zM12 5v14l9-7z" fill="currentColor" fill-opacity=".3"/>',
  boot: '<path d="M7 3h5v8l6 2c2 .7 3 2 3 4v2H4V3zM4 15h17M9 6h3M9 9h3"/>',
  cross: '<path d="M6 6l12 12M18 6L6 18" stroke-width="3"/>',
  check: '<path d="M4 12.5l5 5L20 6.5" stroke-width="3"/>',
  plus: '<path d="M12 4v16M4 12h16" stroke-width="3"/>',
  person: '<circle cx="12" cy="6" r="3.2"/><path d="M6 21v-5c0-3 2.5-5.5 6-5.5s6 2.5 6 5.5v5M9 21v-4M15 21v-4"/>',
  people: '<circle cx="8.5" cy="7" r="2.8"/><circle cx="16.5" cy="8" r="2.4"/><path d="M3 20v-3.5c0-2.8 2.3-5 5.5-5s5.5 2.2 5.5 5V20M14.5 13c.6-.3 1.3-.5 2-.5 2.6 0 4.5 1.8 4.5 4.3V20"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" fill="currentColor" fill-opacity=".2"/><path d="M12 7v10"/>',
  badge: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>',
  burst: '<path d="M12 2l2 6 5.5-3-2.5 6 5 1.5-5 2.5 3 5.5-6-2.5L12 22l-2-4.5L4 20l3-5.5L2 12.5 7 11 4.5 5l5.5 3z" fill="currentColor" fill-opacity=".25"/>',
  door: '<path d="M5 21V4.5C5 3.7 5.7 3 6.5 3h11c.8 0 1.5.7 1.5 1.5V21M3 21h18M15 12.5v.5"/><path d="M8 6h8v12H8z" fill="currentColor" fill-opacity=".15"/>',
  map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
  cart: '<path d="M2 3h3l2.4 11.2c.1.7.8 1.3 1.5 1.3h8.7c.7 0 1.3-.5 1.5-1.2L21 7H6.2"/><circle cx="9.5" cy="19.5" r="1.6"/><circle cx="17" cy="19.5" r="1.6"/>',
  infinity: '<path d="M12 12c-2-2.6-3.5-4-5.5-4a4 4 0 000 8c2 0 3.5-1.4 5.5-4zm0 0c2 2.6 3.5 4 5.5 4a4 4 0 000-8c-2 0-3.5 1.4-5.5 4z" stroke-width="2.4"/>',
  house: '<path d="M3 11l9-8 9 8M5 9.5V21h14V9.5M10 21v-6h4v6"/>',
  castle: '<path d="M3 21V9h3V6h3v3h2V5h2v4h2V6h3v3h3v12zM3 21h18M10 21v-5a2 2 0 014 0v5M6 13h2M16 13h2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>',
  speaker: '<path d="M4 9.5h4L13 5v14l-5-4.5H4z" fill="currentColor" fill-opacity=".25"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/>',
  mute: '<path d="M4 9.5h4L13 5v14l-5-4.5H4z" fill="currentColor" fill-opacity=".25"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>',
  note: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="17.5" cy="16" r="2.5" fill="currentColor"/>',
  up: '<path d="M12 20V5M5.5 11.5L12 5l6.5 6.5" stroke-width="2.6"/>',
  trophy: '<path d="M7 3h10v5a5 5 0 01-10 0zM7 5H4v1.5A3.5 3.5 0 007.3 10M17 5h3v1.5a3.5 3.5 0 01-3.3 3.5M12 13v4M8 21h8M9 21l1-4h4l1 4"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z" fill="currentColor"/><path d="M12 7V3.2M16 10l3.6-1.6M14.5 14.5l2.4 3.6M9.5 14.5l-2.4 3.6M8 10L4.4 8.4"/>',
  stopwatch: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M10 2.5h4M12 2.5V6M18.5 6.5l1.5-1.5"/>',
  drop: '<path d="M12 3c3.5 4.5 6 8 6 11a6 6 0 01-12 0c0-3 2.5-6.5 6-11z" fill="currentColor" fill-opacity=".3"/>',
  turtle: '<path d="M4 15c0-4 3.5-7 8-7s8 3 8 7zM12 8v7M7.5 10l2.5 5M16.5 10L14 15M20 13l2-1M6 15l-1 3M18 15l1 3"/>',
  snail: '<circle cx="14" cy="11.5" r="5.5"/><path d="M14 11.5a2 2 0 102-2M3 18h15c2 0 3-1 3-2.5M3 18c0-2 1-3.5 3-4M6 14V9M4.5 8.5L6 9l1.5-.5"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6-8 11-8 11z" fill="currentColor" fill-opacity=".35"/>',
  heartPlus: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6-8 11-8 11z" fill="currentColor" fill-opacity=".25"/><path d="M12 9v6M9 12h6"/>',
  fang: '<path d="M4 5h16c0 3-1 5-3 6l-2 7-1.5-5h-3L9 18l-2-7C5 10 4 8 4 5z" fill="currentColor" fill-opacity=".2"/><path d="M9 11l1 2M15 11l-1 2"/>',
  sparkles: '<path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6zM18 13l.9 2.1L21 16l-2.1.9L18 19l-.9-2.1L15 16l2.1-.9z" fill="currentColor" fill-opacity=".3"/>',
  chartUp: '<path d="M3 3v18h18M6 16l4-5 3.5 3L20 6M15 6h5v5"/>',
  down: '<path d="M12 4v15M5.5 12.5L12 19l6.5-6.5" stroke-width="2.6"/>',
  paw: '<ellipse cx="12" cy="16" rx="4.5" ry="3.5" fill="currentColor" fill-opacity=".3"/><circle cx="6" cy="10" r="1.8"/><circle cx="10" cy="6.5" r="1.8"/><circle cx="14" cy="6.5" r="1.8"/><circle cx="18" cy="10" r="1.8"/>',
  rock: '<path d="M3 18l3-8 5-4 6 2 4 6-2 4z" fill="currentColor" fill-opacity=".25"/><path d="M11 6l1 5 5-3M12 11l-2 7"/>',
  flame: '<path d="M12 21c-4 0-6.5-2.8-6.5-6.2C5.5 10 10 8 10 3c3 1.5 7 5.5 7 10 0 1-.3 2-.8 2.8.2-1.8-.8-3.6-2.2-4.3.2 2.5-1.4 3.4-2.4 4.7-.8 1-1 2.3-.4 3.4" fill="currentColor" fill-opacity=".3"/>',
  bow: '<path d="M5 3c8 2 14 8 16 16M5 3l16 16M5 3v5M5 3h5M14 14l4.5 4.5"/><path d="M15 21l4-2 2-4" />',
  hole: '<ellipse cx="12" cy="13" rx="9" ry="5" fill="currentColor" fill-opacity=".35"/><ellipse cx="12" cy="13" rx="5" ry="2.4" fill="#000" fill-opacity=".55"/>',
  radiation: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 9.5L9.5 5a7.5 7.5 0 015 0zM14.2 13.3l5 .2a7.5 7.5 0 01-2.5 4.3zM9.8 13.3l-2.5 4.5a7.5 7.5 0 01-2.5-4.3z" fill="currentColor"/>',
  ice: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M12 2l-2 2.5M12 2l2 2.5M12 22l-2-2.5M12 22l2-2.5"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  fog: '<path d="M3 8h13M6 12h15M3 16h12M8 20h10"/>',
  bandage: '<rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-35 12 12)"/><path d="M10.5 11l3 2M12.5 10l-1 4"/>',
  trash: '<path d="M4 6h16M9 6V4h6v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
  demon: '<path d="M5 3l2.5 5M19 3l-2.5 5"/><path d="M12 21c-4.5 0-7-3-7-7.5S8 6 12 6s7 3 7 7.5S16.5 21 12 21z" fill="currentColor" fill-opacity=".2"/><path d="M8.5 12l2.5 1.2M15.5 12L13 13.2M9.5 17c1.5-1 3.5-1 5 0"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/>',
  scales: '<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z"/>',
  book: '<path d="M12 6c-2-1.5-5-2-9-1.5V19c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V4.5C17 4 14 4.5 12 6zM12 6v14.5"/>',
  monitor: '<rect x="2.5" y="4" width="19" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/><circle cx="12" cy="12" r="6.3"/>',
  tower: '<path d="M7 21l1.5-11h7L17 21zM6 10h12M7 5v5M17 5v5M10 5v2M14 5v2M7 5h3M14 5h3M12 14v3M5 21h14"/>',
  puzzle: '<path d="M4 8h4a2.2 2.2 0 114 0h4v4a2.2 2.2 0 110 4v4h-4a2.2 2.2 0 10-4 0H4v-4a2.2 2.2 0 100-4z" fill="currentColor" fill-opacity=".2"/>',
  scroll: '<path d="M7 3h11a2 2 0 012 2v1h-3M7 3a2 2 0 00-2 2v12M17 6v13a2 2 0 01-2 2H5a2 2 0 01-2-2v-1h12M9 8h5M9 11h5M9 14h3"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" stroke-width="2.4"/>',
  wind: '<path d="M3 8h11a3 3 0 10-3-3M3 12h16a3 3 0 11-3 3M3 16h8"/>',
  repeat: '<path d="M4 11V9a3 3 0 013-3h12M16 3l3 3-3 3M20 13v2a3 3 0 01-3 3H5M8 21l-3-3 3-3"/>',
  skull: '<path d="M12 3c-4.7 0-8 3.2-8 7.3 0 2.7 1.4 4.4 3 5.3V19h10v-3.4c1.6-.9 3-2.6 3-5.3C20 6.2 16.7 3 12 3z" fill="currentColor" fill-opacity=".2"/><circle cx="9" cy="11" r="1.8" fill="currentColor"/><circle cx="15" cy="11" r="1.8" fill="currentColor"/><path d="M10 19v2M14 19v2M12 14v1.5"/>',
  gamepad: '<path d="M7 7h10a5 5 0 015 5.5c-.3 3-1.5 5.5-3.5 5.5-1.5 0-2.3-1.5-3.5-3h-6c-1.2 1.5-2 3-3.5 3-2 0-3.2-2.5-3.5-5.5A5 5 0 017 7z"/><path d="M7 10v4M5 12h4M15.5 11h.01M18 13h.01" stroke-width="2.4"/>',
  warning: '<path d="M12 3l10 18H2z" fill="currentColor" fill-opacity=".2"/><path d="M12 10v5M12 18h.01" stroke-width="2.6"/>',
  gem: '<path d="M6 3h12l4 6-10 12L2 9z" fill="currentColor" fill-opacity=".25"/><path d="M2 9h20M9 3l3 18 3-18"/>',
  power: '<path d="M12 3v9M6.3 6.3a8 8 0 1011.4 0"/>',
  fullscreen: '<path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/>',
  window: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 8h18"/>',
  dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
  eye: '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  textSize: '<path d="M3 19l5-14 5 14M4.8 14h6.4M14 19l3.5-9 3.5 9M15 16h5"/>',
  shake: '<path d="M8 6h8v12H8zM4 8v8M20 8v8M2 10v4M22 10v4"/>',
  palette: '<path d="M12 3a9 9 0 100 18c1.2 0 1.8-.8 1.8-1.7 0-1.3-1.3-1.7-1.3-3 0-1 .8-1.8 1.8-1.8H17a4 4 0 004-4C21 6.4 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="15" cy="7" r="1.2" fill="currentColor"/>',
  skate: '<path d="M5 4h6v7l7 2c1.5.4 2 1.3 2 2.5V17H5zM3 20h18M8 17v3M17 17v3"/>',
  tornado: '<path d="M3 4h18M5 8h14M7 12h9M9 16h5M11 20h2"/>',
  comet: '<circle cx="16.5" cy="7.5" r="3.5" fill="currentColor" fill-opacity=".35"/><path d="M14 10L4 20M13 7L5 15M17 11l-6 8"/>',
  ghost: '<path d="M5 21V10a7 7 0 0114 0v11l-2.5-2-2.3 2-2.2-2-2.2 2-2.3-2z" fill="currentColor" fill-opacity=".2"/><circle cx="9.5" cy="10.5" r="1.2" fill="currentColor"/><circle cx="14.5" cy="10.5" r="1.2" fill="currentColor"/>',
  dizzy: '<circle cx="12" cy="12" r="9"/><path d="M8 9.5l2 1.5-2 1.5M16 9.5l-2 1.5 2 1.5M8.5 16.5c1.5-1 2.5 1 3.5 0s2-1 3.5 0"/>',
  magnet: '<path d="M5 3h4v9a3 3 0 006 0V3h4v9a7 7 0 01-14 0zM5 7h4M15 7h4"/>',
  bubble: '<circle cx="11" cy="12" r="7.5" fill="currentColor" fill-opacity=".12"/><path d="M7.5 9a4 4 0 013-2.5"/><circle cx="19" cy="5" r="2"/>',
  bomb: '<circle cx="10.5" cy="14" r="7" fill="currentColor" fill-opacity=".25"/><path d="M14.5 8.5L17 6M17 6l1.5-1.5M19.5 2.5l.5 1.5M21.5 4.5L20 5"/>',
  planet: '<circle cx="12" cy="12" r="5.5" fill="currentColor" fill-opacity=".25"/><ellipse cx="12" cy="12" rx="10.5" ry="3.8" transform="rotate(-20 12 12)"/>',
  star: '<path d="M14 3l1.9 4.3 4.6.4-3.5 3 1.1 4.6-4.1-2.5-4 2.5 1-4.6-3.5-3 4.7-.4z" fill="currentColor" fill-opacity=".3"/><path d="M8 15l-5 5M10 17l-3 3"/>',
  spring: '<path d="M4 7h16M4 17h16M6 7l12 2.5L6 12l12 2.5L6 17"/>',
  feather: '<path d="M20 4C11 4 5 10 5 19l2-2c2 0 6-1 9-4 2.5-2.5 4-6 4-9zM5 19L3 21M8 16l6-6"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2" fill="currentColor" fill-opacity=".2"/><path d="M8 10.5V7.5a4 4 0 018 0v3M12 14.5v2.5"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5M12 17h.01" stroke-width="2.4"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z" fill="currentColor" fill-opacity=".2"/>',
  bug: '<rect x="7" y="7" width="10" height="13" rx="5"/><path d="M9 7a3 3 0 016 0M7 12H3M21 12h-4M7 17l-3 2M17 17l3 2M7 9L4 7M17 9l3-2M12 11v8"/>',
};

// emoji -> [icone, couleur]
const EMOJI_ICONS = {
  '⏳': ['hourglass', '#9fd8ff'], '⌛': ['hourglass', '#ff7a7a'], '💰': ['coin', '#ffd23d'], '⚔️': ['swords', '#ff9d5d'], '⚔': ['swords', '#ff9d5d'],
  '👑': ['crown', '#ffd23d'], '▶': ['play', 'currentColor'], '◀': ['prev', 'currentColor'], '⏭': ['skip', 'currentColor'], '⏩': ['fast', '#7fd8ff'],
  '👟': ['boot', '#7fff9c'], '✖': ['cross', '#ff6b6b'], '✔': ['check', '#7fff9c'], '✚': ['plus', '#7fff9c'], '➕': ['plus', '#ff8a8a'],
  '🧍': ['person', '#9fd8ff'], '👥': ['people', '#9fd8ff'], '🛡️': ['shield', '#7fd8ff'], '🛡': ['shield', '#7fd8ff'], '🔰': ['badge', '#7fff9c'],
  '🎯': ['target', '#ff6b6b'], '💥': ['burst', '#ffb347'], '🚪': ['door', '#d9a066'], '🗺️': ['map', '#9fe0a0'], '🗺': ['map', '#9fe0a0'],
  '🛒': ['cart', '#ffd23d'], '♾️': ['infinity', '#c49bff'], '♾': ['infinity', '#c49bff'], '🏠': ['house', '#ffd23d'], '🏰': ['castle', '#ffb36b'],
  '🌐': ['globe', '#7fd8ff'], '🔊': ['speaker', '#7fd8ff'], '🔇': ['mute', '#ff8a8a'], '🎵': ['note', '#c49bff'], '⤴': ['up', '#7fff9c'], '⬆️': ['up', '#7fff9c'], '⬆': ['up', '#7fff9c'],
  '🏆': ['trophy', '#ffd23d'], '⚽': ['ball', '#ffffff'], '⏱️': ['stopwatch', '#9fd8ff'], '⏱': ['stopwatch', '#9fd8ff'], '🩸': ['drop', '#ff5d5d'],
  '🐢': ['turtle', '#7fff9c'], '🐌': ['snail', '#c9e07a'], '❤️': ['heart', '#ff6b8a'], '❤': ['heart', '#ff6b8a'], '🧛': ['fang', '#ff6b8a'], '💖': ['heartPlus', '#ff8ab0'],
  '✨': ['sparkles', '#ffd23d'], '📈': ['chartUp', '#7fff9c'], '🔻': ['down', '#ff6b6b'], '🐾': ['paw', '#c9a27a'], '🪨': ['rock', '#b0a090'],
  '🔥': ['flame', '#ff7a3d'], '🏹': ['bow', '#ff9d5d'], '🕳️': ['hole', '#a08bd0'], '🕳': ['hole', '#a08bd0'], '☢️': ['radiation', '#d4ff5d'], '☢': ['radiation', '#d4ff5d'],
  '🧊': ['ice', '#8ad9ff'], '🚫': ['ban', '#ff6b6b'], '🌫️': ['fog', '#b8c0d0'], '🌫': ['fog', '#b8c0d0'], '🩹': ['bandage', '#ffb3a0'],
  '🗑️': ['trash', '#ff8a8a'], '🗑': ['trash', '#ff8a8a'], '👹': ['demon', '#ff5d5d'], '🎓': ['cap', '#9fd8ff'], '⚖️': ['scales', '#ffd23d'], '⚖': ['scales', '#ffd23d'],
  '📖': ['book', '#d9b38c'], '🖥️': ['monitor', '#9fd8ff'], '🖥': ['monitor', '#9fd8ff'], '⚙️': ['gear', '#b8c0d0'], '⚙': ['gear', '#b8c0d0'], '🗼': ['tower', '#ff9d5d'],
  '🧩': ['puzzle', '#7fff9c'], '📜': ['scroll', '#d9b38c'], '⌨️': ['keyboard', '#b8c0d0'], '⌨': ['keyboard', '#b8c0d0'], '💨': ['wind', '#cfe8ff'],
  '🔁': ['repeat', '#7fd8ff'], '💀': ['skull', '#e8e0d0'], '🎮': ['gamepad', '#c49bff'], '⚠': ['warning', '#ffd23d'], '⚠️': ['warning', '#ffd23d'],
  '💎': ['gem', '#7fd8ff'], '⏻': ['power', '#ff8a8a'], '⛶': ['fullscreen', '#9fd8ff'], '🗗': ['window', '#9fd8ff'], '🎲': ['dice', '#ffffff'],
  '👁️': ['eye', '#9fd8ff'], '👁': ['eye', '#9fd8ff'], '🔠': ['textSize', '#9fd8ff'], '📳': ['shake', '#ffb347'], '🎨': ['palette', '#ffd23d'], '🐞': ['bug', '#7fff9c'],
  '⛸️': ['skate', '#8ad9ff'], '⛸': ['skate', '#8ad9ff'], '🌪️': ['tornado', '#cfe8ff'], '🌪': ['tornado', '#cfe8ff'], '☄️': ['comet', '#ff9d5d'], '☄': ['comet', '#ff9d5d'],
  '👻': ['ghost', '#d8d8ff'], '🥴': ['dizzy', '#ffd23d'], '🧲': ['magnet', '#ff6b6b'], '🫧': ['bubble', '#9fd8ff'], '💣': ['bomb', '#ffb347'],
  '🪐': ['planet', '#c49bff'], '🌠': ['star', '#9fd8ff'], '🛝': ['spring', '#7fff9c'], '🪶': ['feather', '#e8e0d0'], '💡': ['bulb', '#ffd23d'], '❔': ['question', '#8a8a9a'], '🔒': ['lock', '#b8c0d0'],
};

const Icons = {
  _re: null,
  regex() {
    if (!this._re) {
      const keys = Object.keys(EMOJI_ICONS).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      this._re = new RegExp(keys.join('|'), 'g');
    }
    return this._re;
  },
  svg(name, color) {
    const body = ICONS[name] || '';
    return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" style="color:${color || 'currentColor'}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  },
  // Remplace les emojis connus d'un noeud texte par des icones.
  replaceText(node) {
    const txt = node.nodeValue;
    const re = this.regex();
    re.lastIndex = 0;
    if (!re.test(txt)) return;
    const p = node.parentNode;
    if (!p || /^(OPTION|SELECT|TEXTAREA|INPUT|SCRIPT|STYLE|TITLE)$/.test(p.nodeName) || p.closest && p.closest('svg')) return;
    const frag = document.createDocumentFragment();
    let last = 0;
    re.lastIndex = 0;
    for (const m of txt.matchAll(re)) {
      if (m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
      const [name, color] = EMOJI_ICONS[m[0]];
      const span = document.createElement('fx-ico'); // balise propre : aucune regle CSS des menus ne la vise
      span.className = 'ico-wrap';
      span.innerHTML = this.svg(name, color);
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last).replace(/^️/, '')));
    p.replaceChild(frag, node);
  },
  scan(root) {
    if (!root) return;
    if (root.nodeType === 3) { this.replaceText(root); return; }
    if (root.nodeType !== 1) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) list.push(n);
    for (const n of list) this.replaceText(n);
  },
  // Surveille une zone de l'interface : tout texte ajoute est converti automatiquement.
  watch(root) {
    if (!root || root._icoWatch) return;
    root._icoWatch = true;
    this.scan(root);
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'characterData') this.replaceText(m.target);
        else for (const n of m.addedNodes) this.scan(n);
      }
    }).observe(root, { childList: true, subtree: true, characterData: true });
  },
  // Dessin sur canvas (barres de boss, etc.) : icone vectorielle a la place d'un emoji.
  _img: {},
  draw(ctx, name, color, x, y, size) {
    const key = name + color;
    let img = this._img[key];
    if (!img) {
      img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(this.svg(name, color).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" '));
      this._img[key] = img;
    }
    if (img.complete && img.naturalWidth) ctx.drawImage(img, x, y, size, size);
  },
};

// Change le texte d'un element seulement s'il est different (evite de recreer les icones a
// chaque image dans le HUD).
function setTextOnce(el, txt) {
  if (el._txt === txt) return;
  el._txt = txt;
  el.textContent = txt;
}
