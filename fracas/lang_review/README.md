# Fracas — translation review / relecture des traductions

## For reviewers (English)

Thank you for helping! Open **your language's file** (`de.csv` = German, `es.csv` = Spanish,
`it.csv` = Italian, `pt.csv` = Brazilian Portuguese, `ru.csv` = Russian, `uk.csv` = Ukrainian,
`pl.csv` = Polish, `tr.csv` = Turkish, `zh.csv` = Simplified Chinese, `ja.csv` = Japanese,
`ko.csv` = Korean) in Excel, Google Sheets or LibreOffice.

- Columns: `key` (do not change), `french` (original), `english`, `translation` (current text),
  **`correction`**, `comment`.
- If the translation is fine, leave **correction empty**.
- If it is wrong, unnatural or too long for a button, write the better text in **correction**.
- Keep `{step}`, `{total}`, `{move}`, `{atk}`, `{ab}`, `{n}` exactly as they are: the game replaces them.
- The `|` character separates lines shown one under the other: keep the same number of `|`.
- Menu buttons are short; titles in CAPITALS stay in capitals.
- Save the file as **CSV UTF-8** and send it back.

## Pour le créateur (français)

- Regénérer les feuilles après des changements de texte : `node tools/translations.js export`
- Appliquer une feuille corrigée (remise dans ce dossier) : `node tools/translations.js import de`
  (remplacer `de` par la langue). Seules les cases « correction » remplies sont appliquées.
- Ensuite : tester la langue dans le jeu (Paramètres > Langue), puis reconstruire le `.exe`.
- Où trouver des relecteurs : amis ou famille natifs, communautés Discord ou Reddit de joueurs,
  ou services payants de localisation de jeux (environ 0,05 à 0,12 € par mot ; le jeu compte
  environ 6 000 mots par langue).
