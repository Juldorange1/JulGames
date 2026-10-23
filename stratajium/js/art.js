/* Panthéa — les persos sont des créatures vivantes (pas seulement des humains).
   Chaque dessin tient dans une boîte 100×100 ; les yeux sont dans <g class="eye"> (ils clignent),
   tout le corps est dans <g class="crit"> (il respire). Le cadre (hexagone = dieu, bouclier = garde,
   rond = soldat, couronne de pics = boss) porte la couleur du camp. */
const Art = (function () {
  'use strict';
  // œil : blanc, iris, reflet
  const eye = (x, y, r, iris, pup) => `<g class="eye"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.12}" fill="#fff"/><circle cx="${x}" cy="${y + r * .15}" r="${r * .62}" fill="${iris || '#2a2a2a'}"/>${pup ? `<circle cx="${x}" cy="${y + r * .15}" r="${r * .3}" fill="#111"/>` : ''}<circle cx="${x - r * .28}" cy="${y - r * .25}" r="${r * .22}" fill="#fff"/></g>`;
  const glow = (x, y, r, c) => `<g class="eye"><circle cx="${x}" cy="${y}" r="${r * 1.7}" fill="${c}" opacity=".35"/><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .8}" fill="${c}"/><circle cx="${x}" cy="${y}" r="${r * .4}" fill="#fff"/></g>`;
  const smile = (x, y, w, c) => `<path d="M${x - w} ${y} Q${x} ${y + w * .8} ${x + w} ${y}" fill="none" stroke="${c || '#3a2410'}" stroke-width="2.6" stroke-linecap="round"/>`;
  const A = {
    // ---------- dieux ----------
    ma: `<circle cx="38" cy="52" r="14" fill="#7d93ad"/><circle cx="52" cy="43" r="17" fill="#9db2cb"/><circle cx="65" cy="53" r="13" fill="#7d93ad"/><rect x="30" y="50" width="42" height="15" rx="7.5" fill="#8aa1bb"/>
      ${eye(44, 51, 5.2, '#2b3a55')}${eye(58, 51, 5.2, '#2b3a55')}<path d="M37 43 L49 46 M63 43 L52 46" stroke="#2b3a55" stroke-width="3" stroke-linecap="round"/>
      <polygon points="51,62 44,75 50,74 46,86 59,69 52,70 56,62" fill="#ffd23f" stroke="#a87a00" stroke-width="1.2"/>`,
    mb: `<circle cx="50" cy="52" r="25" fill="#f4e3a1"/><path d="M50 27 A25 25 0 0 1 50 77 Z" fill="#5a6ab8"/>
      ${eye(41, 48, 5.5, '#5a6ab8')}${eye(59, 48, 5.5, '#f0c040')}<path d="M38 62 Q50 70 62 62" fill="none" stroke="#3a2a5a" stroke-width="2.6" stroke-linecap="round"/>`,
    mc: `<g stroke="#2a1a2e" stroke-width="3" stroke-linecap="round" fill="none"><path d="M42 50 L24 38 L18 46 M42 54 L22 56 L16 66 M44 58 L28 70 L26 80 M58 50 L76 38 L82 46 M58 54 L78 56 L84 66 M56 58 L72 70 L74 80"/></g>
      <path d="M50 18 V36 M38 18 H62" stroke="#c8b8a0" stroke-width="1.6"/><ellipse cx="50" cy="56" rx="13" ry="15" fill="#3a2440"/><circle cx="50" cy="42" r="10" fill="#4a2e52"/>
      <circle cx="46" cy="40" r="2.6" fill="#ff4a5a"/><circle cx="54" cy="40" r="2.6" fill="#ff4a5a"/><circle cx="43" cy="45" r="1.8" fill="#ff4a5a"/><circle cx="57" cy="45" r="1.8" fill="#ff4a5a"/>
      <path d="M44 58 L50 64 L56 58" fill="none" stroke="#c84a6a" stroke-width="2"/>`,
    md: `<g fill="#c8742a">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => { const a = i / 10 * Math.PI * 2; return `<circle cx="${(50 + Math.cos(a) * 21).toFixed(1)}" cy="${(52 + Math.sin(a) * 21).toFixed(1)}" r="10"/>`; }).join('')}</g>
      <circle cx="50" cy="52" r="19" fill="#f0c070"/>${eye(43, 48, 4.4, '#7a4a10')}${eye(57, 48, 4.4, '#7a4a10')}
      <path d="M46 56 L54 56 L50 61 Z" fill="#6a3a1a"/><path d="M50 61 V64 M44 66 Q50 69 56 66" fill="none" stroke="#6a3a1a" stroke-width="2"/>`,
    me: `<path d="M34 34 L40 24 L44 34 M66 34 L60 24 L56 34" fill="#7a4e30"/><ellipse cx="50" cy="54" rx="22" ry="26" fill="#8a5a3a"/><ellipse cx="50" cy="62" rx="13" ry="15" fill="#d8b890"/>
      ${eye(41, 47, 8, '#f08a1a', 1)}${eye(59, 47, 8, '#f08a1a', 1)}<path d="M46 55 L54 55 L50 63 Z" fill="#f0c040"/>`,
    pa: `<path d="M24 70 Q22 60 32 60 L70 60 Q80 62 78 70 Q60 76 24 70 Z" fill="#9ad08a"/><path d="M28 62 L22 46 M34 62 L32 44" stroke="#7ab06a" stroke-width="3" stroke-linecap="round"/>
      <circle cx="22" cy="45" r="3.6" fill="#fff"/><circle cx="22" cy="45" r="1.8" fill="#222"/><circle cx="32" cy="43" r="3.6" fill="#fff"/><circle cx="32" cy="43" r="1.8" fill="#222"/>
      <circle cx="56" cy="46" r="20" fill="#c89a5a" stroke="#8a5a2a" stroke-width="2.4"/><path d="M56 46 m0 -3 a3 3 0 1 1 -3 3 a6 6 0 1 1 6 6 a10 10 0 1 1 -10 -10 a14 14 0 1 1 14 14" fill="none" stroke="#8a5a2a" stroke-width="2.2"/>`,
    pb: `<polygon points="30,34 46,24 66,28 74,44 70,66 54,78 34,74 26,56" fill="#8a8a84" stroke="#55554f" stroke-width="2"/><polygon points="34,36 46,30 58,32 50,40" fill="#a4a49c"/>
      ${glow(42, 50, 4.6, '#ff8a2a')}${glow(60, 50, 4.6, '#ff8a2a')}<path d="M40 64 L48 60 L54 66 L62 61" fill="none" stroke="#3a3a36" stroke-width="2.6"/><path d="M58 30 L54 40 L58 44" fill="none" stroke="#55554f" stroke-width="1.6"/>
      <ellipse cx="38" cy="30" rx="8" ry="3.5" fill="#6a9a4a"/>`,
    pc: `<circle cx="50" cy="50" r="25" fill="#3a3634"/><ellipse cx="50" cy="60" rx="17" ry="14" fill="#8a7a6a"/><path d="M32 44 Q50 34 68 44" fill="none" stroke="#2a2624" stroke-width="5" stroke-linecap="round"/>
      ${eye(42, 47, 4.2, '#4a2a10')}${eye(58, 47, 4.2, '#4a2a10')}<ellipse cx="46" cy="58" rx="2.4" ry="1.8" fill="#2a2018"/><ellipse cx="54" cy="58" rx="2.4" ry="1.8" fill="#2a2018"/><path d="M42 66 Q50 70 58 66" fill="none" stroke="#2a2018" stroke-width="2.2"/>`,
    pd: `<polygon points="28,40 34,18 44,34" fill="#7a7a82"/><polygon points="72,40 66,18 56,34" fill="#7a7a82"/><polygon points="31,36 34,24 40,33" fill="#c8a8a8"/><polygon points="69,36 66,24 60,33" fill="#c8a8a8"/>
      <ellipse cx="50" cy="50" rx="23" ry="22" fill="#8c8c94"/><path d="M38 56 Q50 82 62 56 Z" fill="#d8d8dc"/>${eye(41, 46, 4.6, '#e0b020', 1)}${eye(59, 46, 4.6, '#e0b020', 1)}<ellipse cx="50" cy="62" rx="4.2" ry="3" fill="#1a1a1e"/>`,
    pe: `<ellipse cx="50" cy="52" rx="24" ry="25" fill="#7aa05a"/><ellipse cx="50" cy="40" rx="20" ry="8" fill="#6a904a"/>${eye(41, 46, 4, '#8a2a1a')}${eye(59, 46, 4, '#8a2a1a')}
      <ellipse cx="50" cy="56" rx="6" ry="5" fill="#5a803a"/><path d="M36 64 Q50 74 64 64" fill="#3a2a1a"/><polygon points="40,64 43,56 46,65" fill="#fff8e0"/><polygon points="60,64 57,56 54,65" fill="#fff8e0"/>`,
    pf: `<path d="M28 76 L28 48 Q28 24 50 24 Q72 24 72 48 L72 76 L65 70 L58 77 L50 70 L42 77 L35 70 Z" fill="#eef2f8" stroke="#a8b4c8" stroke-width="1.6"/>
      <g class="eye"><ellipse cx="42" cy="46" rx="5" ry="7" fill="#2a3048"/><ellipse cx="58" cy="46" rx="5" ry="7" fill="#2a3048"/></g><path d="M42 60 H58 M45 57 V63 M50 57 V63 M55 57 V63" stroke="#6a748a" stroke-width="1.8"/>`,
    pg: `<path d="M50 14 Q56 26 50 34 Q62 22 64 34 Q70 26 66 42 Z" fill="#ffd23f"/><path d="M40 20 Q46 30 44 38 Q36 30 40 20 Z" fill="#ff8a2a"/>
      <ellipse cx="50" cy="54" rx="21" ry="22" fill="#e04a2a"/><ellipse cx="50" cy="62" rx="12" ry="11" fill="#ff8a3a"/>${eye(42, 50, 4.6, '#3a1a0a')}${eye(58, 50, 4.6, '#3a1a0a')}<path d="M45 58 L55 58 L50 68 Z" fill="#f0c040"/>`,
    gu: `<path d="M34 30 L30 18 M30 24 L24 20 M66 30 L70 18 M70 24 L76 20" stroke="#8a6a3a" stroke-width="3" stroke-linecap="round"/><ellipse cx="30" cy="40" rx="8" ry="5" fill="#b07a4a" transform="rotate(-30 30 40)"/><ellipse cx="70" cy="40" rx="8" ry="5" fill="#b07a4a" transform="rotate(30 70 40)"/>
      <ellipse cx="50" cy="52" rx="20" ry="24" fill="#c08a5a"/><ellipse cx="50" cy="66" rx="10" ry="8" fill="#f0dcc0"/>${eye(42, 47, 6, '#3a2010')}${eye(58, 47, 6, '#3a2010')}<ellipse cx="50" cy="64" rx="3.4" ry="2.4" fill="#d87a8a"/>
      <circle cx="40" cy="36" r="1.8" fill="#f8ecd8"/><circle cx="60" cy="36" r="1.8" fill="#f8ecd8"/><circle cx="50" cy="32" r="1.8" fill="#f8ecd8"/>`,
    dr: `<g fill="#4f9440"><circle cx="34" cy="30" r="10"/><circle cx="50" cy="24" r="11"/><circle cx="66" cy="30" r="10"/></g><g fill="#6ab84e"><circle cx="42" cy="26" r="6"/><circle cx="58" cy="26" r="6"/></g>
      <rect x="32" y="32" width="36" height="44" rx="14" fill="#7a5530"/><path d="M38 40 V70 M50 38 V72 M62 40 V70" stroke="#5e3f20" stroke-width="1.6"/>
      ${glow(43, 50, 3.6, '#9ae05a')}${glow(57, 50, 3.6, '#9ae05a')}<ellipse cx="50" cy="63" rx="6" ry="4" fill="#2e1e0e"/>`,
    pr: `<ellipse cx="50" cy="56" rx="25" ry="21" fill="#4a8a5a" stroke="#2e5e3a" stroke-width="2.4"/><path d="M50 38 L58 46 L58 58 L50 64 L42 58 L42 46 Z M42 46 L30 46 M58 46 L70 46 M42 58 L32 66 M58 58 L68 66 M50 64 L50 76" fill="none" stroke="#2e5e3a" stroke-width="2"/>
      <circle cx="50" cy="30" r="10" fill="#8ac07a"/>${eye(46, 29, 3.2)}${eye(54, 29, 3.2)}<ellipse cx="50" cy="16" rx="11" ry="3.4" fill="none" stroke="#ffe08a" stroke-width="2.4"/>`,
    // ---------- gardes ----------
    g1: `<path d="M50 80 Q50 62 38 52 M50 80 Q50 62 62 52" stroke="#4a9a3a" stroke-width="8" fill="none" stroke-linecap="round"/><ellipse cx="34" cy="42" rx="12" ry="10" fill="#5ab44a"/><ellipse cx="66" cy="42" rx="12" ry="10" fill="#5ab44a"/>
      ${eye(30, 39, 3.4, '#e0c020', 1)}${eye(38, 39, 3.4, '#e0c020', 1)}${eye(62, 39, 3.4, '#e0c020', 1)}${eye(70, 39, 3.4, '#e0c020', 1)}<path d="M34 51 V57 L31 60 M34 57 L37 60 M66 51 V57 L63 60 M66 57 L69 60" stroke="#e04a5a" stroke-width="1.6" fill="none"/>`,
    g2: `<ellipse cx="34" cy="34" rx="6" ry="8" fill="#8a8a92"/><ellipse cx="66" cy="34" rx="6" ry="8" fill="#8a8a92"/><ellipse cx="50" cy="54" rx="22" ry="24" fill="#9a9aa2"/>
      <polygon points="50,24 44,46 56,46" fill="#f0eadc" stroke="#b0a890" stroke-width="1.4"/>${eye(40, 50, 3.6)}${eye(60, 50, 3.6)}<ellipse cx="44" cy="68" rx="2.6" ry="2" fill="#4a4a52"/><ellipse cx="56" cy="68" rx="2.6" ry="2" fill="#4a4a52"/>`,
    g3: `<ellipse cx="50" cy="50" rx="22" ry="24" fill="#8a5a32"/><path d="M34 50 Q50 40 66 50 L62 66 Q50 72 38 66 Z" fill="#f0e6d0"/>${eye(42, 48, 5, '#d08a10', 1)}${eye(58, 48, 5, '#d08a10', 1)}
      <path d="M36 42 L47 45 M64 42 L53 45" stroke="#3a2010" stroke-width="2.6" stroke-linecap="round"/><path d="M45 56 Q50 54 55 56 L52 66 Q50 69 49 65 Z" fill="#f0b020" stroke="#a87010" stroke-width="1.2"/>`,
    g4: `<path d="M30 40 C14 34 16 62 30 58 C38 56 36 46 30 48" fill="none" stroke="#8a6a3a" stroke-width="6" stroke-linecap="round"/><path d="M70 40 C86 34 84 62 70 58 C62 56 64 46 70 48" fill="none" stroke="#8a6a3a" stroke-width="6" stroke-linecap="round"/>
      <g fill="#f4f0e6"><circle cx="40" cy="34" r="9"/><circle cx="50" cy="30" r="10"/><circle cx="60" cy="34" r="9"/></g><ellipse cx="50" cy="56" rx="15" ry="20" fill="#e8d8b8"/>
      ${eye(43, 50, 3.8, '#6a4a1a')}${eye(57, 50, 3.8, '#6a4a1a')}<ellipse cx="50" cy="68" rx="7" ry="5" fill="#c8a888"/><path d="M47 68 L50 71 L53 68" stroke="#6a4a2a" stroke-width="1.6" fill="none"/>`,
    g5: `<polygon points="28,40 30,16 46,32" fill="#e07a2a"/><polygon points="72,40 70,16 54,32" fill="#e07a2a"/><polygon points="30,22 30,16 36,24" fill="#2a1a10"/><polygon points="70,22 70,16 64,24" fill="#2a1a10"/>
      <path d="M26 40 Q50 22 74 40 L50 80 Z" fill="#ec8a32"/><path d="M30 46 Q40 52 50 80 Q60 52 70 46 Q60 62 50 62 Q40 62 30 46 Z" fill="#fff4e6"/>${eye(41, 46, 4.4, '#2a6a1a', 1)}${eye(59, 46, 4.4, '#2a6a1a', 1)}<ellipse cx="50" cy="76" rx="4" ry="3" fill="#1a1a1a"/>`,
    g6: `<g fill="#5a3e28">${Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2, r1 = 22, r2 = 33; const x1 = 50 + Math.cos(a - .18) * r1, y1 = 52 + Math.sin(a - .18) * r1, x2 = 50 + Math.cos(a) * r2, y2 = 52 + Math.sin(a) * r2, x3 = 50 + Math.cos(a + .18) * r1, y3 = 52 + Math.sin(a + .18) * r1; return `<polygon points="${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${x3.toFixed(1)},${y3.toFixed(1)}"/>`; }).join('')}</g>
      <circle cx="50" cy="52" r="23" fill="#6e4e34"/><ellipse cx="50" cy="58" rx="15" ry="13" fill="#e8c8a0"/>${eye(43, 52, 3.6)}${eye(57, 52, 3.6)}<circle cx="50" cy="61" r="3" fill="#1a1a1a"/>`,
    g7: `<polygon points="28,42 28,18 46,32" fill="#9a7ab8"/><polygon points="72,42 72,18 54,32" fill="#9a7ab8"/><polygon points="31,36 31,24 40,32" fill="#e8b8d8"/><polygon points="69,36 69,24 60,32" fill="#e8b8d8"/>
      <ellipse cx="50" cy="52" rx="24" ry="22" fill="#a888c8"/><g class="eye"><ellipse cx="41" cy="49" rx="5" ry="6" fill="#c8e86a"/><ellipse cx="41" cy="49" rx="1.6" ry="5" fill="#1a1a1a"/><ellipse cx="59" cy="49" rx="5" ry="6" fill="#c8e86a"/><ellipse cx="59" cy="49" rx="1.6" ry="5" fill="#1a1a1a"/></g>
      <path d="M47 58 L53 58 L50 61 Z" fill="#e87aa0"/><path d="M50 61 Q46 65 43 63 M50 61 Q54 65 57 63 M30 58 L42 60 M30 64 L42 62 M70 58 L58 60 M70 64 L58 62" fill="none" stroke="#4a3a5a" stroke-width="1.4"/>`,
    c1: `<ellipse cx="40" cy="26" rx="6" ry="16" fill="#e8e0d8" transform="rotate(-10 40 26)"/><ellipse cx="60" cy="26" rx="6" ry="16" fill="#e8e0d8" transform="rotate(10 60 26)"/><ellipse cx="40" cy="26" rx="3" ry="11" fill="#f0b8c8" transform="rotate(-10 40 26)"/><ellipse cx="60" cy="26" rx="3" ry="11" fill="#f0b8c8" transform="rotate(10 60 26)"/>
      <ellipse cx="50" cy="56" rx="20" ry="19" fill="#f0e8e0"/>${eye(43, 53, 4.4, '#8a2a3a')}${eye(57, 53, 4.4, '#8a2a3a')}<path d="M48 61 L52 61 L50 63.5 Z" fill="#e87a9a"/><path d="M50 64 Q47 67 45 66 M50 64 Q53 67 55 66" fill="none" stroke="#7a6a6a" stroke-width="1.4"/>`,
    c2: `<ellipse cx="50" cy="50" rx="21" ry="23" fill="#24242c"/><path d="M36 34 Q50 26 64 34" fill="none" stroke="#3a3a48" stroke-width="3"/>${eye(42, 46, 4.2, '#111')}${eye(58, 46, 4.2, '#111')}
      <path d="M44 54 L56 54 L50 74 Z" fill="#6a6a78" stroke="#3a3a48" stroke-width="1.4"/>`,
    c3: `<path d="M26 74 Q24 40 50 26 Q76 40 74 74 Q66 66 60 74 Q54 66 50 74 Q46 66 40 74 Q34 66 26 74 Z" fill="#2a1e40"/>${glow(42, 50, 4.4, '#5ae0ff')}${glow(58, 50, 4.4, '#5ae0ff')}`,
    c4: `<path d="M50 70 Q36 60 40 44 Q44 30 56 28 Q66 28 64 38" fill="none" stroke="#b84a2a" stroke-width="7" stroke-linecap="round"/><path d="M64 38 L70 32 L62 34" fill="#3a1a10" stroke="#3a1a10" stroke-width="2"/>
      <ellipse cx="50" cy="68" rx="14" ry="11" fill="#c85a32"/><path d="M38 64 L26 56 M62 64 L74 56" stroke="#b84a2a" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="54" r="5" fill="#c85a32"/><circle cx="76" cy="54" r="5" fill="#c85a32"/>
      ${eye(45, 66, 3)}${eye(55, 66, 3)}`,
    c5: `<path d="M50 52 L18 82 L30 60 L14 66 Z" fill="#ff8a2a" opacity=".85"/><circle cx="54" cy="46" r="20" fill="#ffd23f"/><circle cx="54" cy="46" r="26" fill="#ffd23f" opacity=".3"/>
      ${eye(48, 44, 4.2, '#a85a00')}${eye(61, 44, 4.2, '#a85a00')}${smile(54, 53, 6, '#a85a00')}`,
    c6: `<rect x="40" y="48" width="20" height="26" rx="8" fill="#f0e0c0"/><path d="M22 52 Q24 24 50 22 Q76 24 78 52 Z" fill="#d8322a"/><g fill="#fff"><circle cx="36" cy="40" r="4"/><circle cx="52" cy="32" r="5"/><circle cx="64" cy="44" r="3.4"/></g>
      ${eye(45, 60, 3)}${eye(55, 60, 3)}${smile(50, 67, 4)}`,
    c7: `<path d="M30 50 L18 40 Q14 30 22 30 Q28 32 26 38 M70 50 L82 40 Q86 30 78 30 Q72 32 74 38" fill="none" stroke="#d8402a" stroke-width="5" stroke-linecap="round"/><path d="M14 30 L22 26 M86 30 L78 26" stroke="#d8402a" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="50" cy="60" rx="22" ry="15" fill="#e8502e"/><path d="M42 48 V40 M58 48 V40" stroke="#c8402a" stroke-width="3"/>${eye(42, 38, 4)}${eye(58, 38, 4)}<path d="M30 68 L22 76 M70 68 L78 76 M36 72 L32 80 M64 72 L68 80" stroke="#c8402a" stroke-width="3" stroke-linecap="round"/>`,
    c8: `<ellipse cx="50" cy="58" rx="27" ry="19" fill="#5ab44a"/><circle cx="36" cy="38" r="10" fill="#5ab44a"/><circle cx="64" cy="38" r="10" fill="#5ab44a"/>${eye(36, 37, 6.4, '#1a1a1a')}${eye(64, 37, 6.4, '#1a1a1a')}
      <path d="M30 60 Q50 74 70 60" fill="none" stroke="#2a5a1a" stroke-width="3" stroke-linecap="round"/><circle cx="38" cy="66" r="2.2" fill="#e88aa0" opacity=".7"/><circle cx="62" cy="66" r="2.2" fill="#e88aa0" opacity=".7"/>`,
    lc: `<path d="M50 34 L54 6" stroke="#f0eadc" stroke-width="4" stroke-linecap="round"/><path d="M51 30 L53 26 M51.6 22 L53.4 18 M52.2 14 L53.8 11" stroke="#b0a890" stroke-width="1.4"/>
      <ellipse cx="50" cy="56" rx="24" ry="21" fill="#6a8ab0"/><ellipse cx="50" cy="64" rx="16" ry="11" fill="#b8cce0"/>${eye(41, 52, 4.2)}${eye(59, 52, 4.2)}${smile(50, 63, 6, '#2a3a5a')}`,
    cv: `<path d="M36 28 L40 14 L46 28 M64 28 L60 14 L54 28" fill="#8a5a32"/><path d="M50 22 Q36 24 36 44 Q36 70 44 80 L56 80 Q64 70 64 44 Q64 24 50 22 Z" fill="#9a6a3a"/>
      <path d="M50 20 Q44 30 46 44" fill="none" stroke="#2a1a10" stroke-width="5" stroke-linecap="round"/><ellipse cx="50" cy="74" rx="10" ry="7" fill="#c8a07a"/>${eye(41, 44, 4)}${eye(59, 44, 4)}
      <ellipse cx="46" cy="75" rx="2" ry="2.6" fill="#3a2010"/><ellipse cx="54" cy="75" rx="2" ry="2.6" fill="#3a2010"/>`,
    gd: `<circle cx="32" cy="32" r="9" fill="#6a4228"/><circle cx="68" cy="32" r="9" fill="#6a4228"/><circle cx="32" cy="32" r="4.4" fill="#c89070"/><circle cx="68" cy="32" r="4.4" fill="#c89070"/>
      <circle cx="50" cy="54" r="24" fill="#7a4e30"/><ellipse cx="50" cy="63" rx="12" ry="10" fill="#c8a07a"/>${eye(41, 49, 4)}${eye(59, 49, 4)}<ellipse cx="50" cy="59" rx="5" ry="3.6" fill="#1a100a"/><path d="M50 62 V66 M45 68 Q50 71 55 68" stroke="#3a2010" stroke-width="1.8" fill="none"/>`,
    s: `<path d="M40 30 Q34 16 26 18 M60 30 Q66 16 74 18" fill="none" stroke="#3a2210" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="50" cy="50" rx="20" ry="18" fill="#7a4a22"/>
      ${eye(42, 47, 4.4, '#1a0a00')}${eye(58, 47, 4.4, '#1a0a00')}<path d="M42 62 Q46 68 50 64 Q54 68 58 62" fill="none" stroke="#3a2210" stroke-width="3" stroke-linecap="round"/>`,
    mi: `<path d="M34 40 Q34 22 50 22 Q66 22 66 40 L66 52 L58 56 L58 64 L42 64 L42 56 L34 52 Z" fill="#e8e2d0"/>${glow(43, 42, 4.4, '#ff3a3a')}${glow(57, 42, 4.4, '#ff3a3a')}
      <path d="M48 52 L50 48 L52 52 Z" fill="#3a3028"/><path d="M45 58 V63 M50 58 V64 M55 58 V63" stroke="#8a8270" stroke-width="1.6"/>`,
    // ---------- boss ----------
    bt: `<polygon points="24,36 40,18 62,16 78,32 80,58 66,80 36,82 20,62" fill="#7a7a72" stroke="#4a4a44" stroke-width="2.4"/><path d="M28 34 Q50 24 72 34 L70 42 Q50 34 30 42 Z" fill="#5a8a3a"/>
      ${glow(39, 48, 6, '#ffb02a')}${glow(61, 48, 6, '#ffb02a')}<path d="M34 66 L42 60 L50 66 L58 60 L66 66" fill="none" stroke="#2a2a26" stroke-width="3.4"/><path d="M60 20 L56 32 L62 36" stroke="#4a4a44" stroke-width="2" fill="none"/>`,
    bn: `<path d="M20 80 Q20 26 50 16 Q80 26 80 80 Z" fill="#3a1e52"/><path d="M28 80 Q28 34 50 26 Q72 34 72 80 Z" fill="#160c22"/><ellipse cx="50" cy="52" rx="15" ry="18" fill="#d8d8c8"/>
      ${glow(44, 49, 3.6, '#7aff6a')}${glow(56, 49, 3.6, '#7aff6a')}<path d="M45 62 H55 M47 60 V64 M50 60 V65 M53 60 V64" stroke="#5a5a4a" stroke-width="1.4"/>`,
    bd: `<path d="M30 30 L22 12 L38 26 M70 30 L78 12 L62 26" fill="#8a1a1a" stroke="#5a0a0a" stroke-width="1.6"/><path d="M26 40 Q50 16 74 40 L70 66 Q50 86 30 66 Z" fill="#c8302a"/>
      <path d="M36 66 Q50 80 64 66 L60 74 Q50 82 40 74 Z" fill="#e86a3a"/>${eye(40, 46, 5.4, '#ffcc22', 1)}${eye(60, 46, 5.4, '#ffcc22', 1)}<path d="M33 38 L46 42 M67 38 L54 42" stroke="#5a0a0a" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="45" cy="66" rx="2.4" ry="1.6" fill="#3a0a0a"/><ellipse cx="55" cy="66" rx="2.4" ry="1.6" fill="#3a0a0a"/><path d="M42 74 L44 79 L46 74 M54 74 L56 79 L58 74" fill="#fff"/>`,
    // ---------- nouveaux boss ----------
    bh: `<path d="M50 84 Q26 84 30 62 L36 46" fill="none" stroke="#2f7a52" stroke-width="10" stroke-linecap="round"/><path d="M50 84 Q74 84 70 62 L64 46" fill="none" stroke="#2f7a52" stroke-width="10" stroke-linecap="round"/><path d="M50 84 L50 40" stroke="#3a9a66" stroke-width="11" stroke-linecap="round"/>
      <ellipse cx="34" cy="40" rx="11" ry="9" fill="#2f7a52"/><ellipse cx="66" cy="40" rx="11" ry="9" fill="#2f7a52"/><ellipse cx="50" cy="30" rx="13" ry="11" fill="#3a9a66"/>
      ${eye(30, 38, 3, '#ffdd33', 1)}${eye(70, 38, 3, '#ffdd33', 1)}${eye(45, 28, 3.6, '#ffdd33', 1)}${eye(55, 28, 3.6, '#ffdd33', 1)}<path d="M44 36 L50 39 L56 36" stroke="#a8242c" stroke-width="2.4" fill="none"/><path d="M32 46 l2 3 M68 46 l-2 3" stroke="#fff" stroke-width="1.6"/>`,
    bq: `<ellipse cx="50" cy="66" rx="16" ry="18" fill="#f2b724"/><path d="M36 60 H64 M35 70 H65 M38 79 H62" stroke="#2a1a08" stroke-width="5"/><ellipse cx="30" cy="48" rx="12" ry="8" fill="#dff4ff" opacity=".8" transform="rotate(-30 30 48)"/><ellipse cx="70" cy="48" rx="12" ry="8" fill="#dff4ff" opacity=".8" transform="rotate(30 70 48)"/>
      <circle cx="50" cy="40" r="14" fill="#2a1a08"/><path d="M38 24 L42 14 L46 22 L50 12 L54 22 L58 14 L62 24 Z" fill="#ffd84a" stroke="#a8781a" stroke-width="1.4"/>${eye(44, 40, 4.2, '#5a2a8a', 1)}${eye(56, 40, 4.2, '#5a2a8a', 1)}<path d="M44 26 Q40 18 36 18 M56 26 Q60 18 64 18" stroke="#2a1a08" stroke-width="2" fill="none"/>`,
    bk: `<path d="M24 62 Q10 70 16 84 M36 70 Q30 86 40 90 M64 70 Q70 86 60 90 M76 62 Q90 70 84 84" fill="none" stroke="#a83a6a" stroke-width="7" stroke-linecap="round"/><circle cx="17" cy="82" r="2" fill="#f2c4d8"/><circle cx="83" cy="82" r="2" fill="#f2c4d8"/>
      <path d="M26 58 Q24 16 50 14 Q76 16 74 58 Q62 70 50 70 Q38 70 26 58 Z" fill="#c24a80"/><circle cx="38" cy="30" r="3" fill="#e27aa8"/><circle cx="62" cy="26" r="2.4" fill="#e27aa8"/><circle cx="56" cy="36" r="2" fill="#e27aa8"/>
      ${eye(40, 50, 6, '#ffcc33', 1)}${eye(60, 50, 6, '#ffcc33', 1)}<path d="M44 62 Q50 66 56 62" stroke="#5a1030" stroke-width="2.4" fill="none"/>`,
    bg: `<path d="M18 86 L30 40 L50 30 L70 40 L82 86 Z" fill="#cfe9ff"/><path d="M30 86 L38 46 L50 40 L62 46 L70 86 Z" fill="#7fb8e8"/><circle cx="50" cy="40" r="13" fill="#eaf6ff"/>
      <path d="M34 30 L40 10 L46 26 L50 6 L54 26 L60 10 L66 30 Z" fill="#a8e4ff" stroke="#4a8ac8" stroke-width="1.6"/>${eye(45, 40, 3.8, '#2a6ad8', 1)}${eye(55, 40, 3.8, '#2a6ad8', 1)}<path d="M46 48 Q50 50 54 48" stroke="#4a6a9a" stroke-width="1.8" fill="none"/>
      <path d="M78 58 l6 -6 M81 55 l-6 0 M81 55 l0 -6" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M14 60 l6 6 M17 63 l6 0 M17 63 l0 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
    bv: `<path d="M16 84 L30 40 Q50 30 70 40 L84 84 Z" fill="#3a2a26"/><path d="M30 40 Q50 30 70 40 L64 48 Q50 40 36 48 Z" fill="#ff6a1a"/><path d="M38 84 L44 60 L50 70 L56 58 L62 84" fill="#ff8a2a"/><path d="M44 84 L48 70 L52 76 L56 84" fill="#ffd84a"/>
      ${glow(41, 56, 5, '#ffcc33')}${glow(59, 56, 5, '#ffcc33')}<path d="M40 30 Q42 18 48 22 Q50 10 56 20 Q62 16 60 30" fill="#ffb02a" opacity=".85"/><path d="M24 70 l6 -3 M76 70 l-6 -3" stroke="#ff6a1a" stroke-width="2.4"/>`,
    bw: `<path d="M50 50 L10 26 M50 50 L8 50 M50 50 L12 74 M50 50 L26 90 M50 50 L90 26 M50 50 L92 50 M50 50 L88 74 M50 50 L74 90" stroke="#2a1a2a" stroke-width="4.4" stroke-linecap="round"/><path d="M10 26 L4 34 M8 50 L2 60 M90 26 L96 34 M92 50 L98 60" stroke="#2a1a2a" stroke-width="3.4" stroke-linecap="round"/>
      <ellipse cx="50" cy="62" rx="17" ry="15" fill="#4a2a4a"/><path d="M42 58 L50 52 L58 58 L50 72 Z" fill="#d82a3a"/><circle cx="50" cy="38" r="13" fill="#5a3a5a"/>
      ${eye(44, 36, 3.2, '#ff3a5a', 1)}${eye(56, 36, 3.2, '#ff3a5a', 1)}${glow(48, 30, 1.6, '#ff7a8a')}${glow(52, 30, 1.6, '#ff7a8a')}<path d="M45 47 L44 52 M55 47 L56 52" stroke="#eee" stroke-width="2"/>`,
    bs: `<path d="M24 86 Q18 70 24 50 Q26 18 50 16 Q74 18 76 50 Q82 70 76 86 L68 78 L60 88 L50 78 L40 88 L32 78 Z" fill="#d8e8ff" opacity=".85"/><path d="M32 50 Q34 28 50 26 Q66 28 68 50" fill="#eef6ff" opacity=".7"/>
      ${glow(41, 46, 6, '#5ad8ff')}${glow(59, 46, 6, '#5ad8ff')}<ellipse cx="50" cy="64" rx="7" ry="9" fill="#1a2a4a" opacity=".8"/><path d="M18 60 Q10 54 14 44 M82 60 Q90 54 86 44" stroke="#d8e8ff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>`,
    bp: `<path d="M50 70 Q20 64 10 34 Q30 44 36 40 Q28 24 34 14 Q42 30 50 30 Q58 30 66 14 Q72 24 64 40 Q70 44 90 34 Q80 64 50 70 Z" fill="#ff7a1a"/><path d="M50 66 Q30 60 24 44 Q38 50 50 46 Q62 50 76 44 Q70 60 50 66 Z" fill="#ffcc33"/>
      <path d="M40 70 L36 90 L46 78 L50 92 L54 78 L64 90 L60 70 Z" fill="#e8401a"/><circle cx="50" cy="44" r="11" fill="#ff9a2a"/>${eye(45, 42, 3.4, '#a8240a', 1)}${eye(55, 42, 3.4, '#a8240a', 1)}<path d="M47 50 L50 56 L53 50 Z" fill="#ffd84a" stroke="#a8600a" stroke-width="1"/>`,
    bb: `<path d="M20 80 Q12 60 30 54 Q48 50 44 70 Q42 86 64 84 Q84 82 82 66" fill="none" stroke="#5a7a2a" stroke-width="11" stroke-linecap="round"/><path d="M20 80 Q12 60 30 54 Q48 50 44 70 Q42 86 64 84 Q84 82 82 66" fill="none" stroke="#a8c84a" stroke-width="3" stroke-dasharray="3 6"/>
      <ellipse cx="62" cy="40" rx="20" ry="15" fill="#6a8a2a"/><path d="M48 28 L52 16 L58 26 L64 14 L68 26 L76 18 L76 32" fill="#c8302a"/>
      ${glow(56, 38, 5, '#ffe22a')}${glow(70, 38, 5, '#ffe22a')}<path d="M54 50 L50 58 M56 50 L60 56" stroke="#c8302a" stroke-width="2" stroke-linecap="round"/><path d="M48 46 Q62 52 78 46" stroke="#3a4a1a" stroke-width="2" fill="none"/>`,
    bc: `<path d="M20 86 L26 52 Q50 40 74 52 L80 86 Z" fill="#5a3a2a"/><path d="M26 56 L74 56 L72 66 L28 66 Z" fill="#8a8a8a"/><circle cx="50" cy="40" r="17" fill="#7aa84a"/>
      <path d="M32 30 L22 20 L34 26 M68 30 L78 20 L66 26" fill="#e8e2d0" stroke="#e8e2d0" stroke-width="3"/><path d="M34 30 Q50 18 66 30 L66 36 L34 36 Z" fill="#8a8a8a" stroke="#5a5a5a" stroke-width="1.4"/>
      ${eye(43, 42, 3.4, '#ff3a1a', 1)}${eye(57, 42, 3.4, '#ff3a1a', 1)}<path d="M42 52 Q50 48 58 52" stroke="#2a3a1a" stroke-width="2.4" fill="none"/><path d="M43 52 L44 47 M57 52 L56 47" stroke="#fff" stroke-width="2.4"/><path d="M80 30 L86 88" stroke="#8a6a3a" stroke-width="4"/><path d="M76 24 L92 30 L80 40 Z" fill="#c8c8c8"/>`,
    ab: `<ellipse cx="50" cy="58" rx="16" ry="20" fill="#ffc21a"/><path d="M35 52 H65 M34 62 H66 M37 72 H63" stroke="#2a1a08" stroke-width="5"/><ellipse cx="32" cy="38" rx="13" ry="8" fill="#e8f6ff" opacity=".85" transform="rotate(-25 32 38)"/><ellipse cx="68" cy="38" rx="13" ry="8" fill="#e8f6ff" opacity=".85" transform="rotate(25 68 38)"/>
      <circle cx="50" cy="34" r="11" fill="#2a1a08"/>${eye(45, 34, 3.6, '#3a2a0a', 1)}${eye(55, 34, 3.6, '#3a2a0a', 1)}<path d="M46 24 Q42 14 38 14 M54 24 Q58 14 62 14" stroke="#2a1a08" stroke-width="2" fill="none"/><path d="M50 78 L50 86" stroke="#2a1a08" stroke-width="3"/>`,
    // ---------- DLC « Les Abysses » ----------
    rq: `<path d="M12 58 Q40 30 76 44 L90 36 L86 52 L92 64 L76 58 Q44 76 12 58 Z" fill="#5a7a9a"/><path d="M14 60 Q42 70 74 58 Q46 66 14 60 Z" fill="#e8eef4"/><path d="M44 40 L52 22 L58 42 Z" fill="#4a6a8a"/>
      ${eye(28, 52, 3.4, '#1a1a1a', 1)}<path d="M16 62 L20 58 L24 63 L28 58 L32 63 L36 59" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M38 54 L40 60 M42 53 L44 59" stroke="#3a5a7a" stroke-width="1.6"/>`,
    mz: `<path d="M24 50 Q24 18 50 18 Q76 18 76 50 Q70 56 64 50 Q58 58 50 50 Q42 58 36 50 Q30 56 24 50 Z" fill="#d88ae8" opacity=".9"/><path d="M30 46 Q32 26 50 24" stroke="#f4c8ff" stroke-width="3" fill="none"/>
      <path d="M32 54 Q28 70 34 86 M42 56 Q40 74 46 90 M58 56 Q60 74 54 90 M68 54 Q72 70 66 86" stroke="#c070e0" stroke-width="3" fill="none" stroke-linecap="round"/>${eye(42, 38, 3.6, '#5a1a7a', 1)}${eye(58, 38, 3.6, '#5a1a7a', 1)}${smile(50, 44, 4, '#7a2a9a')}`,
    pv: `<path d="M22 60 Q8 70 14 86 M34 66 Q28 84 40 92 M66 66 Q72 84 60 92 M78 60 Q92 70 86 86 M28 56 Q10 50 8 34 M72 56 Q90 50 92 34" fill="none" stroke="#c8584a" stroke-width="7" stroke-linecap="round"/>
      <path d="M26 58 Q22 14 50 12 Q78 14 74 58 Q62 70 50 70 Q38 70 26 58 Z" fill="#e06a5a"/><circle cx="40" cy="28" r="3" fill="#f2a090"/><circle cx="60" cy="24" r="2.4" fill="#f2a090"/>
      ${eye(40, 46, 5.4, '#2a1a1a', 1)}${eye(60, 46, 5.4, '#2a1a1a', 1)}${smile(50, 58, 5, '#8a2a2a')}`,
    sr: `<path d="M38 60 Q30 80 44 92 Q50 84 60 92 Q66 80 58 60 Z" fill="#2ab8a8"/><path d="M40 70 H56 M42 78 H56" stroke="#1a8a7a" stroke-width="2"/><path d="M30 60 Q26 30 50 26 Q74 30 70 60 Z" fill="#f2c8a8"/>
      <path d="M26 56 Q20 24 50 14 Q80 24 74 56 Q70 34 50 30 Q30 34 26 56 Z" fill="#e05a8a"/><circle cx="50" cy="44" r="13" fill="#f6d4b8"/>
      ${eye(45, 43, 3.4, '#1a6a8a', 1)}${eye(55, 43, 3.4, '#1a6a8a', 1)}${smile(50, 50, 3.4, '#b84a6a')}<path d="M62 30 l4 -6 l4 6 z" fill="#ffd84a"/>`,
    bl: `<path d="M10 70 Q20 30 50 26 Q80 30 90 70 Q70 84 50 82 Q30 84 10 70 Z" fill="#1e4a6a"/><path d="M18 70 Q50 92 82 70 Q50 80 18 70 Z" fill="#9ab8c8"/><path d="M30 40 L24 22 L38 34 M70 40 L76 22 L62 34" fill="#2a5a7a" stroke="#123a5a" stroke-width="2"/>
      ${glow(36, 50, 6, '#5affd8')}${glow(64, 50, 6, '#5affd8')}<path d="M26 70 L30 64 L34 71 L38 64 L42 72 L46 65 L50 72 L54 65 L58 72 L62 64 L66 71 L70 64 L74 70" fill="#fff"/>`,
    bm: `<path d="M14 86 Q18 46 50 38 Q82 46 86 86 Z" fill="#1a6a9a"/><path d="M8 86 Q22 70 34 80 Q46 66 58 80 Q70 68 92 86 Z" fill="#7fd3ff" opacity=".8"/><circle cx="50" cy="40" r="16" fill="#3a8aba"/>
      <path d="M34 28 L38 12 L44 24 L50 8 L56 24 L62 12 L66 28 Z" fill="#ffd84a" stroke="#a8781a" stroke-width="1.4"/>${glow(44, 40, 4, '#c8f4ff')}${glow(56, 40, 4, '#c8f4ff')}<path d="M40 52 Q50 46 60 52 Q56 62 50 64 Q44 62 40 52 Z" fill="#e8f4ff"/><path d="M80 24 L84 70" stroke="#c8a040" stroke-width="3"/><path d="M76 20 L80 28 L84 18 L88 28 L92 20" fill="none" stroke="#e8c050" stroke-width="2.4"/>`,
    bo: `<path d="M50 88 L50 52 M50 64 L32 44 L28 26 M32 44 L18 38 M50 60 L70 40 L72 20 M70 40 L86 34 M50 52 L50 30" stroke="#ff6a7a" stroke-width="9" stroke-linecap="round"/><path d="M50 88 L50 52 M50 64 L32 44 L28 26 M50 60 L70 40 L72 20 M50 52 L50 30" stroke="#ffa0aa" stroke-width="3" stroke-linecap="round"/>
      <circle cx="28" cy="24" r="5" fill="#ffb0b8"/><circle cx="72" cy="18" r="5" fill="#ffb0b8"/><circle cx="50" cy="28" r="6" fill="#ffb0b8"/>${eye(43, 64, 4.4, '#7a1a2a', 1)}${eye(57, 64, 4.4, '#7a1a2a', 1)}${smile(50, 74, 4, '#7a1a2a')}`,
    bj: `<path d="M18 50 Q18 12 50 12 Q82 12 82 50 Q74 58 66 50 Q58 60 50 50 Q42 60 34 50 Q26 58 18 50 Z" fill="#7a5aff" opacity=".9"/><path d="M26 44 Q28 22 50 20" stroke="#c8b8ff" stroke-width="4" fill="none"/>
      <path d="M28 56 Q22 74 30 92 M42 58 Q38 78 46 94 M58 58 Q62 78 54 94 M72 56 Q78 74 70 92" stroke="#9a7aff" stroke-width="3.4" fill="none"/><path d="M50 60 L44 72 L52 72 L46 86" stroke="#ffe85a" stroke-width="3" fill="none" stroke-linejoin="round"/>
      ${glow(40, 36, 5, '#ffe85a')}${glow(60, 36, 5, '#ffe85a')}`,
    bx: `<path d="M16 88 L26 46 Q50 34 74 46 L84 88 Z" fill="#2a1a3a"/><path d="M8 50 L26 46 L20 70 Z M92 50 L74 46 L80 70 Z" fill="#4a3a5a"/><circle cx="50" cy="38" r="17" fill="#c8b8a8"/>
      <path d="M32 26 L36 6 L44 22 L50 2 L56 22 L64 6 L68 26 Z" fill="#6a5a3a" stroke="#3a2a1a" stroke-width="1.6"/><path d="M40 6 L42 14 M58 6 L56 14" stroke="#3a2a1a" stroke-width="2"/>
      ${glow(43, 38, 4.6, '#ff3a3a')}${glow(57, 38, 4.6, '#ff3a3a')}<path d="M42 50 L46 47 L50 50 L54 47 L58 50" fill="none" stroke="#3a2a2a" stroke-width="2.4"/><path d="M50 56 L50 88" stroke="#ff3a3a" stroke-width="1.6" opacity=".6"/>`,
    // ---------- DLC « Les Ombres » ----------
    om: `<path d="M16 88 Q20 40 50 22 Q80 40 84 88 Z" fill="#1a1028"/><path d="M26 88 Q28 50 50 34 Q72 50 74 88 Z" fill="#2e1e44"/><ellipse cx="50" cy="52" rx="13" ry="15" fill="#8a7aa8"/>
      ${glow(45, 50, 3.6, '#c88aff')}${glow(55, 50, 3.6, '#c88aff')}<path d="M44 60 Q50 63 56 60" stroke="#3a2a4a" stroke-width="2" fill="none"/><circle cx="28" cy="80" r="5" fill="#120a1a"/><circle cx="72" cy="80" r="5" fill="#120a1a"/>${glow(27, 79, 1.4, '#c88aff')}${glow(71, 79, 1.4, '#c88aff')}`,
    of: `<path d="M24 88 Q24 40 50 22 Q76 40 76 88 Z" fill="#141018"/><ellipse cx="50" cy="50" rx="12" ry="14" fill="#0a080c"/>${glow(45, 48, 3.4, '#7affc8')}${glow(55, 48, 3.4, '#7affc8')}
      <path d="M80 14 L80 90" stroke="#6a5a4a" stroke-width="4"/><path d="M80 16 Q50 10 40 30 Q58 22 80 26 Z" fill="#c8ccd4" stroke="#8a8c94" stroke-width="1.4"/>`,
    oe: `<circle cx="50" cy="48" r="30" fill="#ffcc4a"/><circle cx="58" cy="44" r="28" fill="#120a1a"/><path d="M50 14 L50 6 M50 90 L50 82 M14 48 L6 48 M86 48 L94 48 M24 22 L18 16 M76 74 L82 80 M24 74 L18 80 M76 22 L82 16" stroke="#ffcc4a" stroke-width="3" stroke-linecap="round"/>
      ${glow(50, 44, 3.6, '#ffcc4a')}${glow(64, 44, 3.6, '#ffcc4a')}<path d="M50 56 Q57 60 64 56" stroke="#ffcc4a" stroke-width="2" fill="none"/>`,
    ou: `<path d="M18 70 Q14 30 50 22 Q86 30 82 70 Q70 86 50 86 Q30 86 18 70 Z" fill="#3a1a2a"/><path d="M28 56 Q50 92 72 56 Q50 70 28 56 Z" fill="#120a10"/><path d="M30 58 L34 66 L38 59 L42 67 L46 60 L50 68 L54 60 L58 67 L62 59 L66 66 L70 58" fill="#e8e0d8"/>
      ${glow(38, 40, 5.4, '#ff5a8a')}${glow(62, 40, 5.4, '#ff5a8a')}<circle cx="50" cy="24" r="4" fill="#8a4a6a" opacity=".7"/><circle cx="42" cy="14" r="3" fill="#8a4a6a" opacity=".5"/>`,
    oa: `<path d="M26 86 Q24 50 50 42 Q76 50 74 86 Z" fill="#1e1a24"/><path d="M30 30 L26 12 L40 24 M70 30 L74 12 L60 24" fill="#2a2430" stroke="#1a161e" stroke-width="2"/><circle cx="50" cy="38" r="17" fill="#2a2430"/>
      <path d="M33 34 H67 L65 42 H35 Z" fill="#5a1a2a"/>${glow(43, 38, 3.4, '#ffe85a')}${glow(57, 38, 3.4, '#ffe85a')}<path d="M66 64 L86 48" stroke="#c8ccd4" stroke-width="3.4" stroke-linecap="round"/>`,
    ob: `<path d="M20 70 Q8 54 22 42 Q22 22 44 22 Q60 12 72 28 Q92 30 86 52 Q94 70 76 76 Q60 88 44 80 Q26 84 20 70 Z" fill="#b8b4cc" opacity=".75"/><path d="M30 60 Q50 72 70 60" stroke="#e8e4f4" stroke-width="4" fill="none" opacity=".8"/>
      ${glow(42, 46, 4.4, '#ffffff')}${glow(60, 46, 4.4, '#ffffff')}`,
    oc: `<path d="M20 60 Q30 30 56 30 Q76 32 80 52 L92 56 L80 60 Q70 76 46 74 Q28 72 20 60 Z" fill="#1a1a22"/><path d="M30 56 Q14 40 10 22 Q34 30 44 48 Z" fill="#26262e"/><path d="M78 52 L94 56 L78 58 Z" fill="#c8a03a"/>
      ${glow(66, 46, 3.4, '#ff3a3a')}<path d="M40 74 L36 86 M50 74 L50 86" stroke="#c8a03a" stroke-width="2.4"/>`,
    ol: `<path d="M50 6 L58 56 L50 64 L42 56 Z" fill="#d8dce4" stroke="#8a8c94" stroke-width="1.6"/><path d="M50 10 L50 58" stroke="#ffffff" stroke-width="1.4" opacity=".7"/><path d="M30 60 H70 L66 66 H34 Z" fill="#3a2a4a"/><path d="M46 66 H54 V86 H46 Z" fill="#2a1e30"/><circle cx="50" cy="90" r="5" fill="#5a1a2a"/>
      ${glow(44, 40, 2.6, '#c88aff')}${glow(56, 40, 2.6, '#c88aff')}`,
    ox: `<path d="M50 50 Q30 20 6 30 Q16 40 12 52 Q24 48 30 58 Q40 50 50 62 Q60 50 70 58 Q76 48 88 52 Q84 40 94 30 Q70 20 50 50 Z" fill="#2a1a30"/><ellipse cx="50" cy="52" rx="11" ry="14" fill="#3a2440"/>
      <path d="M42 40 L40 30 L46 38 M58 40 L60 30 L54 38" fill="#3a2440"/>${glow(45, 48, 2.8, '#ff5a5a')}${glow(55, 48, 2.8, '#ff5a5a')}<path d="M46 58 L47 62 M54 58 L53 62" stroke="#fff" stroke-width="1.6"/>`,
    os: `<path d="M30 86 Q26 54 50 46 Q74 54 70 86 L62 78 L56 88 L50 78 L44 88 L38 78 Z" fill="#1a1422"/><circle cx="50" cy="44" r="15" fill="#241c30"/>${glow(44, 44, 3.6, '#a87aff')}${glow(56, 44, 3.6, '#a87aff')}<path d="M44 54 Q50 57 56 54" stroke="#a87aff" stroke-width="1.6" fill="none"/>`,
    // boss de la Lumière (DLC « Les Ombres »)
    sa: `<path d="M50 52 Q20 30 6 44 Q14 60 30 60 Q16 70 22 80 Q38 76 46 62 Z" fill="#fff6d8" stroke="#e8c860" stroke-width="2"/><path d="M50 52 Q80 30 94 44 Q86 60 70 60 Q84 70 78 80 Q62 76 54 62 Z" fill="#fff6d8" stroke="#e8c860" stroke-width="2"/>
      <path d="M36 92 L42 56 Q50 50 58 56 L64 92 Z" fill="#f4ecff" stroke="#c8b070" stroke-width="2"/><circle cx="50" cy="40" r="13" fill="#ffe2c4"/><ellipse cx="50" cy="20" rx="14" ry="4" fill="none" stroke="#ffd34a" stroke-width="3.5"/>
      ${glow(45, 40, 2.6, '#7fd3ff')}${glow(55, 40, 2.6, '#7fd3ff')}<path d="M70 30 L84 8" stroke="#ffd34a" stroke-width="4" stroke-linecap="round"/><path d="M80 10 L88 4 L86 14 Z" fill="#fff6c8"/>`,
    sp: `<path d="M24 92 L28 54 Q50 42 72 54 L76 92 Z" fill="#c9d3e0" stroke="#6a7a90" stroke-width="2.5"/><path d="M50 56 V88 M36 70 H64" stroke="#ffd34a" stroke-width="5"/>
      <path d="M32 46 Q32 16 50 14 Q68 16 68 46 Z" fill="#dfe6f0" stroke="#6a7a90" stroke-width="2.5"/><rect x="36" y="30" width="28" height="6" rx="2" fill="#2a3040"/>${glow(43, 33, 2.4, '#7fd3ff')}${glow(57, 33, 2.4, '#7fd3ff')}
      <path d="M50 14 Q54 4 62 6" stroke="#ff5a5a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M8 54 Q8 82 22 90 Q36 82 36 54 Q22 48 8 54 Z" fill="#f2f0e0" stroke="#b09040" stroke-width="2.5"/><path d="M22 58 V84 M12 68 H32" stroke="#d4a020" stroke-width="3.5"/>`,
    sl: `<path d="M34 92 L40 40 L60 40 L66 92 Z" fill="#f4f0e6" stroke="#8a7a6a" stroke-width="2.5"/><path d="M37 66 L63 66 M38 54 L62 54 M36 80 L64 80" stroke="#d24a3a" stroke-width="6"/>
      <rect x="36" y="26" width="28" height="14" rx="3" fill="#fff6c0" stroke="#8a7a6a" stroke-width="2.5"/><path d="M34 26 L50 12 L66 26 Z" fill="#d24a3a"/>
      <path d="M36 33 L4 22 L4 44 Z M64 33 L96 22 L96 44 Z" fill="#fff2a0" opacity=".55"/>${glow(45, 33, 2.4, '#ffb030')}${glow(55, 33, 2.4, '#ffb030')}`,
    sg: `<path d="M22 88 L18 56 L30 40 L50 32 L70 40 L82 56 L78 88 Z" fill="#9fe0ff" stroke="#3a8ab0" stroke-width="2.5"/><path d="M30 40 L40 60 L50 32 L60 60 L70 40 M18 56 L40 60 L60 60 L82 56 M40 60 L36 88 M60 60 L64 88" stroke="#e6f8ff" stroke-width="2" fill="none" opacity=".8"/>
      <path d="M36 32 L42 12 L50 22 L58 10 L64 32 Z" fill="#c8f0ff" stroke="#3a8ab0" stroke-width="2"/>${glow(42, 46, 3.4, '#ffffff')}${glow(58, 46, 3.4, '#ffffff')}
      <path d="M8 60 L18 52 L22 68 Z M92 60 L82 52 L78 68 Z" fill="#c8f0ff" stroke="#3a8ab0" stroke-width="2"/>`,
    // ---------- armée des Ombres : dieux ----------
    na: `<path d="M22 90 Q20 56 34 42 L40 20 Q44 14 48 22 L50 40 L54 16 Q58 10 62 18 L62 42 L68 26 Q73 22 75 30 L72 52 Q84 60 78 90 Z" fill="#3a2458" stroke="#1a0e2a" stroke-width="2.5"/>
      <ellipse cx="54" cy="66" rx="16" ry="11" fill="#e8dcff"/><circle cx="54" cy="66" r="7" fill="#9a4aff"/><circle cx="54" cy="66" r="3" fill="#120818"/><circle cx="51" cy="63" r="1.8" fill="#fff"/>
      <path d="M20 30 Q28 34 26 44 M84 30 Q76 36 80 46" stroke="#b48cff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>`,
    nb: `<path d="M26 54 Q26 22 50 20 Q74 22 74 54 Q74 66 64 70 L64 80 L36 80 L36 70 Q26 66 26 54 Z" fill="#d8d0c0" stroke="#5a5040" stroke-width="2.5"/>
      <ellipse cx="40" cy="50" rx="7" ry="8" fill="#1a1020"/><ellipse cx="60" cy="50" rx="7" ry="8" fill="#1a1020"/>${glow(40, 50, 2.6, '#7aff5a')}${glow(60, 50, 2.6, '#7aff5a')}
      <path d="M46 64 L50 58 L54 64 Z" fill="#1a1020"/><path d="M40 80 L40 74 M46 80 L46 74 M52 80 L52 74 M58 80 L58 74" stroke="#5a5040" stroke-width="2"/>
      <path d="M14 26 Q22 18 30 24 Q24 32 14 26 Z M86 26 Q78 18 70 24 Q76 32 86 26 Z" fill="#7aff5a" opacity=".55"/>`,
    nc: `<ellipse cx="50" cy="54" rx="34" ry="36" fill="#1a0e2a"/><ellipse cx="50" cy="54" rx="26" ry="28" fill="none" stroke="#9a6bff" stroke-width="5"/><ellipse cx="50" cy="54" rx="16" ry="18" fill="none" stroke="#5ad1ff" stroke-width="3.5" stroke-dasharray="9 6"/>
      <path d="M36 54 Q50 40 64 54 Q50 68 36 54 Z" fill="#2a1a40"/>${glow(46, 54, 2.6, '#d9c6ff')}${glow(54, 54, 2.6, '#d9c6ff')}`,
    nd: `<path d="M30 30 Q50 18 70 30 Q78 48 70 66 Q50 76 30 66 Q22 48 30 30 Z" fill="#2c2238" stroke="#120a1a" stroke-width="2.5"/><path d="M30 30 Q24 16 34 20 M70 30 Q76 16 66 20" stroke="#2c2238" stroke-width="6" stroke-linecap="round"/>
      ${glow(41, 44, 3.4, '#ff5a8a')}${glow(59, 44, 3.4, '#ff5a8a')}<path d="M40 58 Q50 64 60 58" stroke="#ff8ab0" stroke-width="2.5" fill="none"/>
      <path d="M58 76 Q72 80 76 92 Q64 90 56 84 Z" fill="#7fd3ff" opacity=".85"/><circle cx="74" cy="88" r="5" fill="#bff0ff"/>`,
    ne: `<circle cx="74" cy="20" r="11" fill="#fff6d0"/><circle cx="78" cy="17" r="10" fill="#1c1428"/>
      <path d="M28 90 L30 60 L22 44 L30 40 L36 28 L42 40 Q58 36 66 50 L60 60 L58 90 Z" fill="#4a4258" stroke="#1c1428" stroke-width="2.5"/>
      <path d="M36 28 L32 18 L40 26 Z" fill="#4a4258"/>${glow(44, 46, 2.6, '#ffe85a')}<path d="M60 50 L70 44 L66 54 Z" fill="#1c1428"/>
      <path d="M68 40 Q78 36 84 38 M70 48 Q80 48 86 52" stroke="#c8b8ff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>`,
    nf: `<path d="M16 92 L24 60 L76 60 L84 92 Z" fill="#3a3040"/><path d="M38 60 L38 30 Q38 22 50 22 Q62 22 62 30 L62 60" fill="#8a8494" stroke="#2a2430" stroke-width="2.5"/>
      <path d="M44 34 L56 34 M50 28 L50 44" stroke="#2a2430" stroke-width="3"/><path d="M26 78 Q30 66 34 76 Q38 64 42 76" stroke="#d8d0e8" stroke-width="4" fill="none" stroke-linecap="round"/>
      ${glow(32, 70, 2, '#9aff9a')}<path d="M60 74 Q64 66 68 74 Q72 66 76 76" stroke="#d8d0e8" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    ng: `<circle cx="50" cy="52" r="20" fill="#2a2234"/><g fill="none" stroke="#9a94a8" stroke-width="5"><ellipse cx="22" cy="40" rx="8" ry="5"/><ellipse cx="14" cy="54" rx="8" ry="5"/><ellipse cx="78" cy="40" rx="8" ry="5"/><ellipse cx="86" cy="54" rx="8" ry="5"/><ellipse cx="50" cy="82" rx="5" ry="8"/></g>
      ${glow(43, 48, 3, '#ff6a6a')}${glow(57, 48, 3, '#ff6a6a')}<path d="M42 60 L58 60" stroke="#120a1a" stroke-width="2.5"/>`,
    nh: `<path d="M20 92 L20 40 Q20 12 50 12 Q80 12 80 40 L80 92 Z" fill="#3a3044" stroke="#18101e" stroke-width="3"/><path d="M30 92 L30 42 Q30 22 50 22 Q70 22 70 42 L70 92 Z" fill="#0c0612"/>
      <path d="M30 92 L30 42 Q30 22 50 22 Q70 22 70 42 L70 92" fill="none" stroke="#9a6bff" stroke-width="2.5" opacity=".9"/>${glow(44, 52, 2.6, '#c88aff')}${glow(56, 52, 2.6, '#c88aff')}
      <circle cx="50" cy="16" r="3" fill="#ffd34a"/>`,
    ni: `<path d="M30 90 Q26 60 36 46 Q30 30 44 24 L50 10 L56 24 Q70 30 64 46 Q74 60 70 90 Z" fill="#26201e" stroke="#0e0a0a" stroke-width="2.5"/>
      <path d="M50 40 Q62 44 66 56 L54 54 Z" fill="#c8b890" stroke="#5a4a30" stroke-width="2"/>${glow(42, 40, 2.6, '#ffe85a')}
      <circle cx="22" cy="70" r="5" fill="#7a9a3a" opacity=".8"/><circle cx="80" cy="64" r="4" fill="#7a9a3a" opacity=".8"/><circle cx="16" cy="54" r="3" fill="#7a9a3a" opacity=".6"/>`,
    nj: `<path d="M18 90 Q22 40 50 18 Q78 40 82 90 Z" fill="#e8e2f4" stroke="#8a7ab0" stroke-width="2.5" opacity=".95"/><path d="M30 90 Q34 56 50 40 Q66 56 70 90" fill="none" stroke="#b8a8d8" stroke-width="2"/>
      ${glow(43, 44, 2.6, '#7a5aff')}${glow(57, 44, 2.6, '#7a5aff')}<path d="M44 54 Q50 57 56 54" stroke="#7a6a9a" stroke-width="2" fill="none"/>`,
    nk: `<path d="M6 70 Q20 50 34 64 Q46 44 60 62 Q74 42 94 60 L94 94 L6 94 Z" fill="#160e22"/><path d="M6 70 Q20 50 34 64 Q46 44 60 62 Q74 42 94 60" fill="none" stroke="#9a6bff" stroke-width="3"/>
      <path d="M30 60 Q34 40 44 36 Q54 40 56 58" fill="#241838"/>${glow(40, 48, 2.2, '#c88aff')}${glow(49, 48, 2.2, '#c88aff')}
      <circle cx="74" cy="30" r="9" fill="#d8d0e8"/><circle cx="78" cy="27" r="8" fill="#0c0612" opacity=".9"/>`,
    // ---------- armée des Ombres : gardes ----------
    n1: `<path d="M24 88 L24 46 Q24 18 50 18 Q76 18 76 46 L76 88 L68 80 L60 90 L50 80 L40 90 L32 80 Z" fill="#eef0ff" stroke="#9aa0c8" stroke-width="2.5" opacity=".9"/>
      <ellipse cx="41" cy="46" rx="6" ry="8" fill="#1a1a2a"/><ellipse cx="59" cy="46" rx="6" ry="8" fill="#1a1a2a"/><ellipse cx="50" cy="64" rx="6" ry="8" fill="#1a1a2a"/>`,
    n2: `<path d="M24 90 Q20 60 30 48 Q26 30 42 24 L58 24 Q74 30 70 48 Q80 60 76 90 Z" fill="#6a8a6a" stroke="#2a3a2a" stroke-width="2.5"/>
      ${glow(41, 42, 3.6, '#ffe85a')}${glow(59, 42, 3.6, '#ffe85a')}<path d="M36 58 L64 58 L60 66 L40 66 Z" fill="#2a1a1a"/><path d="M40 58 L42 63 L44 58 L46 63 L48 58 L50 63 L52 58 L54 63 L56 58 L58 63 L60 58" fill="#e8e0c8"/>
      <path d="M18 70 L28 64 M82 70 L72 64" stroke="#6a8a6a" stroke-width="6" stroke-linecap="round"/>`,
    n3: `<path d="M12 46 L30 34 L36 54 Z M88 46 L70 34 L64 54 Z" fill="#3a1020"/><path d="M28 90 Q24 56 50 44 Q76 56 72 90 Z" fill="#1c1018"/><path d="M50 44 L40 90 M50 44 L60 90" stroke="#8a1a2a" stroke-width="2"/>
      <ellipse cx="50" cy="36" rx="14" ry="16" fill="#e8e0ec"/><path d="M36 30 Q50 14 64 30 L58 24 L50 30 L42 24 Z" fill="#1c1018"/>${eye(44, 36, 3.4, '#c8102a')}${eye(56, 36, 3.4, '#c8102a')}
      <path d="M45 46 L46 50 L47 46 M53 46 L54 50 L55 46" stroke="#fff" stroke-width="1.6" fill="none"/>`,
    n4: `<g stroke="#1a1018" stroke-width="3.5" fill="none" stroke-linecap="round"><path d="M38 52 L22 40 L12 46 M38 58 L18 58 L10 66 M40 64 L24 74 L20 86 M62 52 L78 40 L88 46 M62 58 L82 58 L90 66 M60 64 L76 74 L80 86"/></g>
      <ellipse cx="50" cy="62" rx="14" ry="16" fill="#2a1a2e"/><circle cx="50" cy="42" r="11" fill="#3a2440"/>${glow(45, 40, 2, '#ff4a4a')}${glow(55, 40, 2, '#ff4a4a')}${glow(50, 46, 1.6, '#ff4a4a')}
      <path d="M44 66 L56 66 M46 72 L54 72" stroke="#ff8a3d" stroke-width="2"/><path d="M50 10 L50 31" stroke="#d8d8e8" stroke-width="1.4"/>`,
    n5: `<path d="M22 86 L34 56 L66 56 L78 86 Z" fill="#8a6a4a" stroke="#4a3420" stroke-width="2.5" transform="rotate(-14 50 70)"/><path d="M30 56 L36 30 L64 30 L70 56" fill="#a8845a" stroke="#4a3420" stroke-width="2.5" transform="rotate(-14 50 70)"/>
      <path d="M50 14 Q34 18 34 34 Q34 48 50 50 Q66 48 66 34 Q66 18 50 14 Z" fill="#dff4ff" opacity=".85"/>${glow(44, 32, 2.6, '#5ad1ff')}${glow(56, 32, 2.6, '#5ad1ff')}<ellipse cx="50" cy="42" rx="4" ry="3" fill="#1a2a3a"/>`,
    n6: `<path d="M18 84 Q30 66 46 76 Q62 86 70 70 Q78 54 60 48 Q46 44 52 32" fill="none" stroke="#3a5a2a" stroke-width="13" stroke-linecap="round"/><path d="M18 84 Q30 66 46 76 Q62 86 70 70 Q78 54 60 48 Q46 44 52 32" fill="none" stroke="#7ab84a" stroke-width="5" stroke-dasharray="3 6" stroke-linecap="round"/>
      <ellipse cx="54" cy="26" rx="12" ry="9" fill="#4a7a32" stroke="#22381a" stroke-width="2"/>${glow(50, 23, 2.2, '#ffe85a')}${glow(58, 23, 2.2, '#ffe85a')}<path d="M64 28 L72 30 L68 32 L72 34 L64 31" stroke="#ff4a6a" stroke-width="1.8" fill="none"/>`,
    n7: `<path d="M26 90 Q20 58 30 44 L24 20 L38 34 Q50 28 62 34 L76 20 L70 44 Q80 58 74 90 Z" fill="#5a4a3e" stroke="#2a2018" stroke-width="2.5"/>
      <path d="M38 56 Q50 70 62 56 L58 66 Q50 74 42 66 Z" fill="#e8dcc8"/>${glow(40, 46, 3.2, '#ffcc33')}${glow(60, 46, 3.2, '#ffcc33')}<path d="M44 66 L46 70 L48 66 M52 66 L54 70 L56 66" stroke="#fff" stroke-width="1.5" fill="none"/>
      <path d="M22 40 L30 44 M78 40 L70 44" stroke="#8a7a68" stroke-width="2"/>`,
    n8: `<path d="M20 74 Q20 56 34 54 Q36 42 50 42 Q64 42 66 54 Q80 56 80 74 Q80 88 50 88 Q20 88 20 74 Z" fill="#e8d8b0" stroke="#8a7440" stroke-width="2.5"/>
      <path d="M26 66 Q50 60 74 66 M24 76 Q50 70 76 76" stroke="#b89a5a" stroke-width="2" fill="none"/>${eye(43, 52, 3.4, '#5a2a8a')}${eye(57, 52, 3.4, '#5a2a8a')}${smile(50, 60, 4)}
      <ellipse cx="80" cy="40" rx="6" ry="8" fill="#d8c8f0" opacity=".9"/><ellipse cx="88" cy="56" rx="5" ry="7" fill="#d8c8f0" opacity=".8"/>`,
    n9: `<path d="M30 30 L22 8 L40 24 Z M70 30 L78 8 L60 24 Z" fill="#2a0a0a"/><path d="M26 90 Q22 56 32 40 Q50 26 68 40 Q78 56 74 90 Z" fill="#b0281a" stroke="#4a0a0a" stroke-width="2.5"/>
      ${glow(41, 50, 3.4, '#ffe85a')}${glow(59, 50, 3.4, '#ffe85a')}<path d="M38 66 Q50 76 62 66" stroke="#2a0a0a" stroke-width="3" fill="none"/><path d="M42 67 L44 72 L46 68 M54 68 L56 72 L58 67" stroke="#fff" stroke-width="1.5" fill="none"/>
      <path d="M74 80 Q90 76 88 60 Q86 70 76 72" fill="#4a0a0a"/>`,
    nl: `<ellipse cx="50" cy="34" rx="16" ry="17" fill="#ecebe0" stroke="#6a685a" stroke-width="2.5"/><ellipse cx="43" cy="34" rx="5" ry="6" fill="#1a1a1a"/><ellipse cx="57" cy="34" rx="5" ry="6" fill="#1a1a1a"/>${glow(43, 34, 1.6, '#7aff5a')}${glow(57, 34, 1.6, '#7aff5a')}
      <path d="M44 46 L44 50 M48 46 L48 51 M52 46 L52 51 M56 46 L56 50" stroke="#6a685a" stroke-width="2"/><path d="M50 52 L50 86 M38 60 L62 60 M40 68 L60 68 M42 76 L58 76" stroke="#ecebe0" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M70 50 L86 36" stroke="#ecebe0" stroke-width="5" stroke-linecap="round"/><circle cx="87" cy="34" r="4" fill="#ecebe0"/><circle cx="69" cy="52" r="4" fill="#ecebe0"/>`,
    nm: `<ellipse cx="50" cy="52" rx="30" ry="38" fill="#a8c8e8" stroke="#4a6a8a" stroke-width="3"/><ellipse cx="50" cy="52" rx="24" ry="32" fill="#dceeff"/>
      <path d="M50 22 L50 82" stroke="#4a6a8a" stroke-width="1.6" stroke-dasharray="3 3"/><path d="M40 46 Q34 60 44 70 M60 46 Q66 60 56 70" stroke="#7a9ab8" stroke-width="3" fill="none"/>
      ${eye(42, 44, 3.2, '#6a3ab8')}${eye(58, 44, 3.2, '#6a3ab8')}<path d="M30 30 L38 24 M64 76 L72 70" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    nn: `<path d="M24 90 Q22 54 34 40 Q30 18 50 16 Q70 18 66 40 Q78 54 76 90 Z" fill="#1a1414" stroke="#080606" stroke-width="2.5"/><path d="M36 40 Q50 32 64 40 L60 52 L40 52 Z" fill="#2a2020"/>
      ${glow(44, 44, 2.6, '#ff3a3a')}${glow(56, 44, 2.6, '#ff3a3a')}<path d="M78 18 L78 86" stroke="#6a4a2a" stroke-width="4"/><path d="M78 20 Q96 26 94 42 Q86 34 78 36 Z" fill="#b8bcc8" stroke="#5a5e6a" stroke-width="1.6"/>`,
    no: `<path d="M10 82 Q30 70 50 74 Q70 78 90 70 L90 92 L10 92 Z" fill="#160e1e"/><path d="M24 76 L30 44 Q32 36 38 42 L40 60 L44 30 Q46 22 52 30 L52 60 L58 36 Q62 30 66 38 L62 64 L70 52 Q76 50 74 58 L66 78 Z" fill="#2a1e36" stroke="#0c0612" stroke-width="2.5"/>
      ${glow(44, 66, 2.6, '#c88aff')}${glow(54, 66, 2.6, '#c88aff')}`,
  };
  return { get: id => A[id] || '' };
})();
