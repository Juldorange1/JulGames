// Relecture des traductions par des natifs.
//
//   node tools/translations.js export          -> lang_review/<langue>.csv (une feuille par langue)
//   node tools/translations.js import de       -> applique la colonne "correction" de
//                                                 lang_review/de.csv dans js/lang/de.js
//
// Les feuilles s'ouvrent dans Excel / Google Sheets / LibreOffice. Le relecteur remplit seulement
// la colonne "correction" (vide = la traduction est bonne) et peut laisser un commentaire.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const REVIEW = path.join(ROOT, 'lang_review');
const LANGS = ['de', 'es', 'it', 'pt', 'ru', 'uk', 'pl', 'tr', 'zh', 'ja', 'ko'];
const SECTIONS = ['chars', 'terrain', 'turrets', 'bosses'];

function loadAll() {
  const sb = { console };
  vm.createContext(sb);
  // i18n.js : textes FR/EN (et tables EN des persos, tourelles, boss...)
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/i18n.js'), 'utf8') +
    ';this.__ui = UI_STRINGS; this.__packs = LANG_PACKS; this.__extra = { chars: typeof CHAR_I18N !== "undefined" ? CHAR_I18N.en : {}, turrets: typeof TURRET_INFO_EN !== "undefined" ? TURRET_INFO_EN : {}, bosses: typeof BOSS_INFO_EN !== "undefined" ? BOSS_INFO_EN : {}, terrain: typeof TERRAIN_I18N_EN !== "undefined" ? TERRAIN_I18N_EN : {} };', sb);
  for (const l of LANGS) vm.runInContext(fs.readFileSync(path.join(ROOT, `js/lang/${l}.js`), 'utf8'), sb);
  return sb;
}

// lignes [cle, francais, anglais, traduction]
function rowsFor(sb, l) {
  const pack = sb.__packs[l], fr = sb.__ui.fr, en = sb.__ui.en, rows = [];
  for (const k of Object.keys(pack.ui)) rows.push([`ui.${k}`, fr[k] || '', en[k] || '', pack.ui[k]]);
  for (const sec of SECTIONS) {
    const p = pack[sec] || {}, e = sb.__extra[sec] || {};
    for (const id of Object.keys(p)) {
      if (typeof p[id] === 'string') { rows.push([`${sec}.${id}`, '', typeof e[id] === 'string' ? e[id] : '', p[id]]); continue; }
      for (const f of Object.keys(p[id])) rows.push([`${sec}.${id}.${f}`, '', e[id] && e[id][f] ? e[id][f] : '', p[id][f]]);
    }
  }
  return rows;
}

const csvCell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function exportAll() {
  const sb = loadAll();
  fs.mkdirSync(REVIEW, { recursive: true });
  for (const l of LANGS) {
    const lines = [['key', 'french', 'english', 'translation', 'correction', 'comment'].map(csvCell).join(',')];
    for (const r of rowsFor(sb, l)) lines.push([...r, '', ''].map(csvCell).join(','));
    fs.writeFileSync(path.join(REVIEW, `${l}.csv`), '﻿' + lines.join('\r\n'), 'utf8');
    console.log(`lang_review/${l}.csv : ${lines.length - 1} textes`);
  }
}

function importLang(l) {
  if (!LANGS.includes(l)) throw new Error('langue inconnue : ' + l);
  const rows = parseCsv(fs.readFileSync(path.join(REVIEW, `${l}.csv`), 'utf8'));
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  const iKey = head.indexOf('key'), iCor = head.indexOf('correction');
  const file = path.join(ROOT, `js/lang/${l}.js`);
  let src = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const r of rows) {
    const key = (r[iKey] || '').trim(), cor = (r[iCor] || '').trim();
    if (!key || !cor) continue;
    const name = key.split('.').pop();
    const esc = cor.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    // chaque texte est ecrit  nom: "valeur"  ; pour les sections (chars.6.a2Label...) on cherche
    // dans le bloc de l'identifiant.
    const parts = key.split('.');
    let start = 0, end = src.length;
    if (parts[0] !== 'ui') {
      start = src.indexOf(`  ${parts[0]}: {`);
      if (parts.length === 3) { const idAt = src.indexOf(`${parts[1]}: {`, start); start = idAt; end = src.indexOf('}', idAt); }
    } else { start = src.indexOf('  ui: {'); end = src.indexOf('\n  },', start); }
    const block = src.slice(start, end);
    const re = new RegExp(`(\\b${name}: ")((?:\\\\.|[^"\\\\])*)(")`);
    if (!re.test(block)) { console.warn('introuvable :', key); continue; }
    src = src.slice(0, start) + block.replace(re, (m, a, b, c) => a + esc + c) + src.slice(end);
    n++;
  }
  fs.writeFileSync(file, src, 'utf8');
  try { new vm.Script(src); } catch (e) { throw new Error(`js/lang/${l}.js invalide apres import : ${e.message}`); }
  console.log(`${n} corrections appliquees dans js/lang/${l}.js`);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'export') exportAll();
else if (cmd === 'import' && arg) importLang(arg);
else console.log('usage : node tools/translations.js export | import <langue>');
