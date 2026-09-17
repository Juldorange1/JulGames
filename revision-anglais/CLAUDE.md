# Révision Anglais — Notes pour Claude

Application personnelle de révision d'anglais niveau Seconde (voir [../CLAUDE.md](../CLAUDE.md)
pour les règles générales du dépôt). Ce n'est **pas un jeu** — c'est un outil d'apprentissage,
mais il vit dans ce dépôt par commodité, indépendant des autres dossiers.

## Principe

On colle une leçon (texte brut, même mal organisée) dans "Nouvelle leçon" ; l'appli l'analyse
par heuristiques (pas d'IA/API externe) pour en extraire du vocabulaire, expressions, règles de
grammaire, exemples, faux amis, notes culturelles — puis génère des sessions de révision, avec un
système de répétition espacée "maison" (paliers courts au début, dynamiques selon la difficulté
du mot).

**Un seul type d'exercice : la flashcard** (demande explicite de l'utilisateur — la correction
automatique par comparaison de texte n'était pas fiable). On révèle la réponse puis on
s'auto-évalue (❌/😐/✅) ; le choix reste modifiable — cliquer une autre pastille change d'avis —
tant qu'on n'a pas cliqué "Continuer", seul moment où le résultat est vraiment enregistré (voir
`renderFlashcard` dans `js/ui.js`). Il y a eu plusieurs modes avant (rappel actif, traduction,
écoute, mémoire visuelle, association, formes de verbes irréguliers) ; tous supprimés au fil des
demandes utilisateur, ne les réintroduis pas sans qu'on te le redemande.

100 % local : aucune requête réseau, tout est stocké dans `localStorage` (voir `js/storage.js`).

## Architecture

- `js/storage.js` — persistance locale (un seul blob JSON), CRUD leçons/items/sessions.
- `js/fuzzy.js` — comparaison de mots tolérante aux fautes de frappe (Levenshtein), chargé tôt
  car utilisé par `word-families.js`, `dictionary.js` et `analyzer.js`. Volontairement prudent :
  aucune tolérance sous 6 lettres (sinon des mots anglais courants se confondent, ex:
  "want"/"went", "close"/"chose" ne sont qu'à 1 lettre d'écart), 1 faute jusqu'à 8 lettres,
  2 au-delà. Permet par ex. de reconnaître "beComme" comme "become".
- `js/srs.js` — répétition espacée par compétence (`en_fr`, `fr_en` uniquement — plus de
  compétence "écoute" séparée depuis qu'il n'y a plus qu'un seul type d'exercice), niveaux de
  maîtrise 0-3 (nouveau/reconnu/mémorisé/solide), calcul de difficulté par mot. L'intervalle
  calculé dans `applyResult()` est multiplié par `intervalMultiplier()`, qui lit
  `Store.getSettings().intervalMultiplier` (réglable dans ⚙️ Réglages, comme le "interval
  modifier" d'Anki — 1 par défaut, borné entre 0.1 et 5).
- `js/visuals.js` — dictionnaire emoji pour la mémoire visuelle + astuces pour les faux amis
  fréquents. **Pas d'astuce générique de découpage syllabique** (supprimée à la demande de
  l'utilisateur — "invente" un truc mnémotechnique sans rapport réel avec le mot) : pour un mot
  sans faux-ami connu ni emoji, `buildVisual()` retourne `mnemonic: null`, tout simplement. La
  vraie "précision" pour mieux apprendre un mot vient de `Exercises.getUsageExample()` (phrase de
  la leçon si elle existe, sinon un exemple généré clairement étiqueté comme tel) — voir
  `usageNoteHTML()` dans `js/ui.js`, affiché au dos de chaque flashcard.
- `js/word-families.js` — table de référence des verbes irréguliers (~110), comparatifs
  irréguliers et pluriels irréguliers anglais (base/prétérit/participe, base/comparatif/
  superlatif, ou singulier/pluriel + sens FR). Permet à l'analyseur de reconnaître qu'une forme
  comme "went"/"gone" ou "axes" appartient au même mot que "go"/"axis", **même si ces formes
  sont écrites à des endroits différents de la leçon** (une simple phrase d'exemple ailleurs
  suffit), et de les regrouper en un seul item `forms:[...]` + `formLabels:[...]` au lieu de
  mots isolés sans lien. Voir `WordFamilies.detect()`. `buildFamilies()` accepte une arité
  variable (2 formes pour les pluriels, 3 pour verbes/comparatifs).
- `js/dictionary.js` — dictionnaire anglais→français de secours (~250 mots courants : salle de
  classe, vie quotidienne, adjectifs, verbes réguliers fréquents), 100% local. Sert à
  `Analyzer.extractOrphanVocabulary()` pour traduire les mots que la leçon mentionne sans
  donner leur traduction (ex: "highlighter" dans une phrase, sans "= surligneur" à côté).
  `lookup()` tolère les fautes de frappe dès 5 lettres (seuil plus bas que le reste de l'appli
  car le mot est déjà confirmé comme vocabulaire de la leçon) — mais `Fuzzy.isCloseMatch` compare
  toujours sur le PLUS COURT des deux mots, jamais le plus long, sinon un mot long banal
  "corrigerait" un petit mot du dico sans rapport (bug réel rencontré : "near" → "ear").
  `extractOrphanVocabulary()` ne se limite plus aux mots du dictionnaire : TOUS les mots anglais
  restants de la leçon sont ajoutés (traduction à compléter à la main si absente du dico), sauf
  ceux déjà bien maîtrisés ailleurs dans l'appli (`masteryLevel >= 2`, toutes leçons confondues,
  via `alreadyLearnedWords()`) — demande explicite de l'utilisateur ("tous les mots sauf ceux
  déjà appris"). `ENGLISH_STOPWORDS` a été bien étoffé en conséquence (pronoms, auxiliaires,
  prépositions...) pour ne pas polluer cette extraction élargie avec des mots grammaticaux —
  SAUF `must`/`may`/`might`/`whose`/`because`, volontairement gardés hors de cette liste : ce
  sont aussi des points de vocabulaire explicitement enseignés (modaux, pronom relatif,
  connecteur), les exclure ferait perdre ces mots-là silencieusement dans une leçon qui les liste.
  `extractOrphanVocabulary()` fait 3 passes : (1) les lignes d'UN SEUL mot (ex: une liste
  "mot · mot · mot" découpée par `splitListSegments`, voir plus bas) sont extraites en priorité et
  ne seront JAMAIS supprimées ensuite, même si ce mot apparaît aussi dans une expression plus
  longue ailleurs (ex: "eagle" seul ET dans "bald eagle" = deux éléments distincts, pas un
  doublon) ; (2) les expressions du dictionnaire, dont les mots sont alors marqués "couverts" ;
  (3) les mots isolés restants (mentionnés seulement dans une phrase, jamais sur leur propre
  ligne) — c'est cette dernière passe, et seulement elle, qui respecte la couverture posée par
  l'étape 2, pour éviter qu'un fragment d'expression (ex: "bald" tout seul) ne devienne à tort un
  item séparé. Un mot composé avec tiret (ex: "green-eyed") trouvé à l'étape 1 marque aussi ses
  morceaux comme couverts, sinon la tokenisation générique de l'étape 3 (qui ignore les tirets)
  les ressortirait séparément sans traduction.
- `js/analyzer.js` — analyseur heuristique du texte de leçon collé (regex + scores
  français/anglais) → liste d'items typés. Voir les commentaires de priorité dans
  `analyzeLesson()` si tu ajoutes une nouvelle règle de détection : les signaux forts
  (grammaire, culture, "Ex :", "faux ami", familles de mots) doivent être testés **avant** le
  découpage générique "mot = traduction", sinon ils se font happer par erreur. La détection de
  familles se fait en 2 temps : un pré-scan sur le texte entier (`WordFamilies.detect`, avant la
  boucle ligne par ligne) trouve les familles dont au moins une forme distincte (prétérit/
  participe/pluriel, jamais la base seule — trop ambiguë/fréquente) apparaît quelque part ; puis,
  pendant la boucle, toute ligne qui ne ferait que traduire/répéter une forme déjà détectée est
  absorbée dans la famille au lieu de créer un item redondant (cf. cas 4b/4c/5 avec
  `detectedFormsToFamily`). En fin d'analyse, `extractOrphanVocabulary()` récupère en plus le
  vocabulaire mentionné dans la leçon sans "= traduction" mais connu du dictionnaire de secours —
  uniquement dans les passages où l'anglais domine, et jamais un mot déjà utilisé comme
  traduction française ailleurs (pour ne pas confondre un mot français avec un mot anglais inconnu).
  Un texte anormalement long (paragraphe entier collé sans retour à la ligne, copié-collé abîmé)
  est découpé en phrases (`expandLongLines`/`splitIntoSentences`) ; une phrase sans traduction
  trouvée est abandonnée plutôt que de créer un item inexploitable ; `clampText()` plafonne à 180
  caractères en dernier recours. Avant ça, `splitListSegments()` découpe aussi sur "·"/"•" : une
  leçon collée depuis un document en colonnes donne souvent une longue liste "mot · mot · mot"
  sur une seule ligne sans aucune ponctuation de fin de phrase — sans ce découpage,
  `expandLongLines` ne trouve rien à couper et abandonne TOUTE la ligne (bug réel rencontré :
  une centaine de mots perdus d'un coup).
- `js/exercises.js` — très court désormais : `genFlashcard(item, direction)` (gère nativement
  les items `forms` en joignant les formes avec des flèches, ex: "go → went → gone") et
  `buildSession()` qui construit la file de flashcards en alternant la direction anglais↔français
  pour chaque mot. Plus de correction automatique de texte (Levenshtein, `checkAnswer` etc. ont
  été retirés avec les modes qui s'en servaient).
- `js/stats.js` — agrégats (compétences, mots difficiles, progression).
- `js/ui.js` — tout le reste : navigation, moteur de session générique, mode "Apprendre une
  leçon" (groupes progressifs), "Test blanc", "Contrôle demain", "Révision nulle et ennuyeuse"
  (ex-"Révision intelligente", renommée à la demande de l'utilisateur — `startSmartReview()`
  exclut désormais les mots au niveau de maîtrise max, "solide", du bouton principal et des
  boutons de durée rapide : un mot validé à répétition n'y réapparaît plus).
- `js/app.js` — bootstrap.

## Points d'attention si tu modifies l'analyseur

- Ordre des règles dans `analyzeLesson()` : du signal le plus spécifique (faux ami explicite,
  "Ex :", mots-clés de grammaire/culture) au plus générique (découpage "mot = traduction" via
  `PAIR_SEPARATOR`, puis détection de phrase anglaise isolée en attente de sa traduction).
- `splitEnFr()` détermine quel côté d'une paire est le français via un score (stopwords +
  accents) ; ça peut se tromper sur des mots courts sans signal (ex: deux mots identiques comme
  "pollution = pollution"), c'est acceptable — l'utilisateur peut corriger après coup dans l'écran
  de revue ou dans le détail de la leçon (tout est éditable).
