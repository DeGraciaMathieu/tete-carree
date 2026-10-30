# Étape 4 : règles et état du mode Histoire

Partie du [mode Histoire](mode-histoire.md). Suppose l'[étape 1](arenes-chapitres.md) livrée.

## Objectif

Écrire, sans écran ni DOM, tout ce qui décide du mode Histoire : quel chapitre se joue à quelle vague,
quand un chapitre et l'histoire se terminent, comment passer d'une arène à la suivante en gardant la
partie, comment classer les records. Le joueur ne voit rien de neuf à cette étape. Elle garantit
que l'[étape 5](histoire-deroulement.md) s'appuie sur des règles testées dans le vocabulaire du jeu.

## Socle technique

- `src/config.js` : `ARENAS`, `TOP_RUNS = 5`, clés `STORAGE_*`, `FIRST_BREAK`.
- `src/rules/records.js` : `rankRun(top, run, max)`, classement par score décroissant, la plus ancienne
  devant à égalité, sans muter `top`.
- `src/state/world.js` :
  - `world` : écran, collections, `best`, `runs`, `arena` ;
  - `S` : session, avec `wave`, `waveActive`, `breakT`, `mods`, `score` ;
  - `player`, `blocks` (`Map` des constructions), `unlocked`, `ammo`, `cam` ;
  - `resetWorld()`, qui appelle `buildMap(world.arena)` et ne lit `localStorage` que sous `try/catch`.
- `src/state/arena.js` : `buildMap(id)`, `mapId` (étape 2 ; à ajouter ici si l'étape 2 n'est pas encore faite).
- `src/game/flow.js` : `newGame()` appelle `resetWorld()`, `paintFloor()`, `resetHud()`, `buildSlots()`.
- `CLAUDE.md` :
  - les règles sont pures (ni DOM, ni `Math.random`, ni horloge, ni mutation des arguments) ;
  - un état réaffecté depuis plusieurs modules devient une propriété de `world` ;
  - `S`, `player`, `blocks`, `unlocked`, `ammo` et `cam` ne sont réaffectés que par `resetWorld` ;
  - les clés `localStorage` existantes ne changent pas.

## Comportement

### Constantes (`src/config.js`)

```js
/* ---------- Mode Histoire ---------- */
export const STORY_CHAPTERS = ['chinatown', 'siberie', 'egouts', 'militaire']; // arène de chaque chapitre, dans l'ordre
export const STORY_WAVES = 5;          // vagues par chapitre ; la numérotation continue d'un chapitre à l'autre
export const STORY_OUTRO_DELAY = 1.5;  // secondes entre la fin du dernier choix de cartes et la scène de fin de chapitre
export const STORAGE_STORY = 'tete-carree-story'; // classement du mode Histoire : JSON { last, top }
```

### Règles (`src/rules/story.js`, nouveau)

Numéros de chapitre de 0 à 3 dans le code, de 1 à 4 à l'écran.

| Fonction | Rôle | Exemples |
| --- | --- | --- |
| `chapterOf(wave)` | chapitre d'une vague ; la pause avant la vague 1 (`wave = 0`) appartient au chapitre 0 | 0 → 0, 1 → 0, 5 → 0, 6 → 1, 20 → 3 |
| `chapterArena(i)` | arène du chapitre `i` | 0 → `'chinatown'`, 3 → `'militaire'` |
| `endsChapter(wave)` | vrai si cette vague est la dernière de son chapitre | 5, 10, 15, 20 → vrai ; 4, 6 → faux ; 0 → faux |
| `endsStory(wave)` | vrai si cette vague est la dernière de l'histoire | 20 → vrai ; 15 → faux |

Elles se déduisent de `STORY_CHAPTERS` et `STORY_WAVES` : ajouter un chapitre ou changer le nombre de
vagues ne demande aucune autre retouche.

### Classement (`src/rules/records.js`)

`rankStoryRun(top, run, max)`, à côté de `rankRun` :

- progression d'une partie : chapitre atteint, de 1 à 4 ; une histoire terminée (`won`) compte comme 5 ;
- progression plus grande d'abord, puis score plus grand ;
- à égalité complète, la plus ancienne reste devant (comme `rankRun`) ;
- au plus `max` parties, `top` jamais modifié.

Une partie Histoire enregistrée : `{ score, wave, kills, combo, mods, t, chapter, won, time }`.
`chapter` vaut 1 à 4, `time` est la durée de jeu en secondes (`S.time`). La pause, le choix de
cartes et les dialogues n'avancent pas `S.time`.

### État (`src/state/world.js`)

- `world.mode` : `'arena'` (défaut) ou `'story'`, posé par le déroulement (étape 5).
- `world.storyRuns` : `{ last: null, top: [] }`, lu sous `STORAGE_STORY` à l'import, sous `try/catch`,
  sur le modèle de `world.runs`.
- `S.chapter` : chapitre en cours (0 à 3), 0 dans une nouvelle partie. `S.outroT` : compte à rebours
  de la scène de fin de chapitre, `-1` quand rien n'est prévu.
- `resetWorld(arenaId = world.arena)` : construit l'arène passée. Le mode Arène et la démo passent
  `world.arena` comme aujourd'hui, le mode Histoire passe `chapterArena(0)`. `world.arena` (choix de
  l'accueil, enregistré) n'est jamais modifié par le mode Histoire.
- `enterArena(id)` : change d'arène **sans** recommencer la partie.
  - Construit `id` (`buildMap`).
  - Vide les constructions (`blocks.clear()`, sans réaffecter `blocks`) et les collections de la scène :
    ennemis, projectiles, grenades, roquettes, caisses de ravitaillement, crachats, flaques, feux,
    chutes, apparitions en attente, particules, traçantes, explosions, textes flottants.
  - Ramène le joueur au centre (comme `resetWorld`), sans roulade en cours, avec sa direction de départ.
  - Recale la caméra sur le joueur, met `world.shake` à 0 et `world.fieldDirty` à vrai.
  - Garde tout le reste : `S` entier (score, vague, cartes, combo, kills, temps, compteurs), vie et vie
    maximale, charges de roulade, armes débloquées, munitions, arme en main, graine `rng`.

`enterArena` ne touche ni au DOM ni au son. Repeindre le sol, reconstruire le mini-plan et tout effet
visible reviennent au déroulement (étape 5).

## Hors périmètre

- Écrans, menu, transitions, record affiché, scènes de dialogue : étapes 5 et 6.
- Remboursement des constructions perdues au changement d'arène (décidé : aucun).
- Déblocage progressif des armes et des cartes par chapitre.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | section « Mode Histoire » : `STORY_CHAPTERS`, `STORY_WAVES`, `STORY_OUTRO_DELAY`, `STORAGE_STORY` |
| rules | `src/rules/story.js` (nouveau) | `chapterOf`, `chapterArena`, `endsChapter`, `endsStory` |
| rules | `src/rules/records.js` | `rankStoryRun` |
| state | `src/state/world.js` | `world.mode`, `world.storyRuns`, `S.chapter`, `S.outroT`, `resetWorld(arenaId)`, `enterArena(id)` |
| state | `src/state/arena.js` | `mapId` si l'étape 2 n'est pas encore faite |
| game | `src/game/flow.js` | `newGame(arenaId)` transmet l'arène à `resetWorld` ; appels actuels inchangés en comportement |
| loop, render, input, i18n | — | aucun |
| documentation | `docs/decisions.md`, skill `architecture`, `CLAUDE.md` | clé `STORAGE_STORY` (`tete-carree-story`) ajoutée à la liste des clés à ne pas changer ; module `rules/story.js` |

## Critères d'acceptation

- Quand la vague 5 est la dernière vague jouée, alors le chapitre 1 est terminé et la vague 6 se joue
  au camp de Sibérie.
- Quand la vague 20 est terminée, alors l'histoire est terminée.
- Quand on change d'arène en cours de partie, alors cartes, score, vague, vie, armes et munitions sont
  intacts, et il ne reste aucune construction, caisse, flaque ni ennemi.
- Quand on lance une partie Arène ou la démo, alors rien ne change par rapport à avant l'étape. En
  particulier, l'ordre des tirages `rng` est le même.
- `npm test` passe.

## Tests

`tests/story.test.js` (nouveau) :

- `les vagues 1 à 5 se jouent à Chinatown, 6 à 10 au camp de Sibérie, 11 à 15 dans les égouts, 16 à 20 au camp militaire`
- `la pause avant la première vague appartient au premier chapitre`
- `seule la dernière vague d'un chapitre le termine`
- `la vingtième vague termine l'histoire, pas la quinzième`
- `changer d'arène garde les cartes, le score, la vague, la vie, les armes et les munitions`
- `changer d'arène retire barricades, tourelles, barils, caisses de ravitaillement, flaques et ennemis`
- `changer d'arène ramène le joueur au centre de la nouvelle arène`
- `une nouvelle partie Histoire commence à Chinatown sans toucher à l'arène choisie sur l'accueil`

`tests/records.test.js` :

- `en Histoire, une partie arrivée au chapitre 3 passe devant une partie restée au chapitre 2 qui a plus de points`
- `en Histoire, à chapitre égal, le score départage`
- `une histoire terminée passe devant une partie tombée au chapitre 4`
- `en Histoire, à égalité complète, la partie la plus ancienne reste devant`
- `le classement Histoire garde au plus cinq parties et ne modifie pas le précédent`

Les tests d'état importent `state/world.js`, qui lit `localStorage` sous `try/catch` : ils tournent
sous Node sans navigateur, comme `tests/arenas.test.js`.

## Risques et questions ouvertes

- **Constructions perdues** (décision) : barricades, tourelles et barils posés disparaissent au
  changement de chapitre, sans remboursement. Un joueur qui a tout misé sur ses tourelles le sentira
  passer : c'est voulu.
- **Caisses de ravitaillement au sol** : perdues de la même façon, sans remboursement.
- **Combo** : gardé. En pratique, il retombe pendant la pause d'avant la vague suivante, comme
  aujourd'hui entre deux vagues.
- **`resetWorld(arenaId)`** : l'ordre des tirages `rng` ne change pas. La graine est tirée avant
  `buildMap` et les plans n'utilisent pas `rng`.
- Équilibrage : aucune constante de jeu touchée. Les vagues 1 à 20 du mode Histoire sont celles du
  mode Arène.
