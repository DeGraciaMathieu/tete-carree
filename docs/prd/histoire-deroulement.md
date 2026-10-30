# Étape 5 : déroulement d'une partie Histoire

Partie du [mode Histoire](mode-histoire.md). Suppose l'[étape 4](histoire-regles.md) livrée.

## Objectif

Rendre le mode Histoire jouable de bout en bout : on le lance depuis l'accueil, on traverse les quatre
chapitres en changeant d'arène toutes les cinq vagues, on recommence au chapitre 1 à la mort, et on
termine sur un tableau de fin avec son record. Les dialogues ne sont pas encore là : chaque début et
chaque fin de chapitre ont un point d'accroche, rempli à l'[étape 6](histoire-dialogues.md).

## Socle technique

- `src/game/flow.js` :
  - `newGame`, `startDemo`, `startGame` (cache les écrans, montre le HUD, `world.state = 'play'`) ;
  - `pause`, `resume` ;
  - `gameOver` (écrit `STORAGE_BEST` et `STORAGE_RUNS`, remplit `#overScreen`) ;
  - `openPick` (choix de cartes après une vague).
- `src/loop/update.js`, section « vagues » :
  - à la fin d'une vague : bonus, bannière « vague terminée », soin de fin de vague, `S.pickT`, `S.breakT` ;
  - pendant la pause : `S.pickT` puis `openPick`, puis `S.breakT` puis `startWave`.
- `src/loop/frame.js` : `update` seulement en `'play'` (et pour la démo) ; `S.time` avance sur
  `'title'` et `'over'`.
- `src/render/hud.js` : `banner(m, s, kind)`, `renderRuns()` (tableaux `#runsTitle`, `#runsOver`,
  dernière partie `#lastRun`), `resetHud`.
- `index.html` :
  - accueil : `#titleMenu` avec Jouer, « Arène : … », Commandes, Bestiaire, Arsenal, Cartes, Options ;
  - panneau des records `#records` ;
  - écrans `#pauseScreen` (bouton Recommencer) et `#overScreen` (bouton Rejouer).
- `src/input/keyboard.js`, `gamepad.js`, `buttons.js` :
  - Entrée ou Start sur l'accueil sans focus lance Jouer ;
  - sur l'écran de fin, Entrée, A ou Start relancent ;
  - P ou Échap mettent en pause pendant `'play'` ;
  - pendant une pause entre vagues, Entrée saute l'attente (`S.breakT = 0`).
- `docs/decisions.md`, « Écran titre : disposition » : menu au focus natif, Jouer en tête, records à droite.

## Comportement

### Accueil

- Une entrée **Histoire** (anglais **Story**) s'ajoute au menu, juste sous « Arène : … » : Jouer,
  Arène, Histoire, Commandes, Bestiaire, Arsenal, Cartes, Options. Elle se navigue et s'active comme
  les autres entrées (flèches, croix et stick de la manette, Entrée, A, clic, toucher).
- Entrée ou Start **sans focus** lancent toujours Jouer (mode Arène), comme aujourd'hui.
- Le sélecteur « Arène : … » ne concerne que le mode Arène.
- Le panneau des records gagne un troisième bloc, **Histoire** : les cinq meilleures parties Histoire
  (rang, chapitre atteint ou « Fin », score, vague, date). Il n'apparaît que si une partie Histoire
  est enregistrée. « Meilleures parties » reste le classement du mode Arène.
- **Dernière partie** montre la partie la plus récente, tous modes confondus : celle de `world.runs.last`
  ou de `world.storyRuns.last` dont la date (`t`) est la plus récente. Pour une partie Histoire, une
  ligne de plus au-dessus du score : « Histoire · Chapitre 2 · Camp de Sibérie », ou « Histoire terminée ».
  Le reste (score, vague, kills, combo, cartes) ne change pas.

### Lancer l'histoire

`startStory()` (nouveau `src/game/story.js`) :

1. démarre le son, passe `world.mode` à `'story'`, crée la partie sur Chinatown (`newGame(chapterArena(0))`) ;
2. cache l'accueil et les écrans, montre le HUD ;
3. ouvre le chapitre 0.

### Ouvrir un chapitre

`beginChapter(i)` :

1. `S.chapter = i` ;
2. point d'accroche **début de chapitre** (étape 6 : scène d'introduction ; ici : rien) ;
3. bannière « Chapitre N » avec le nom de l'arène en sous-titre (`tr.chapterN(n)`, `tr.arenas[id]`) ;
4. `world.state = 'play'`. La pause avant la première vague du chapitre dure `FIRST_BREAK` au
   chapitre 1, `waveBreak(S.mods)` ensuite, comme entre deux vagues. Entrée la raccourcit, comme
   aujourd'hui.

### Fin d'un chapitre

- À la fin d'une vague, en mode Histoire, si `endsChapter(S.wave)` : tout se passe comme d'habitude
  (bonus, bannière, soin de fin de vague, choix de cartes si prévu). En plus, `S.outroT = STORY_OUTRO_DELAY`.
- Pendant la pause, le choix de cartes passe d'abord. Ensuite, si `S.outroT >= 0`, il décompte **à
  la place** de `S.breakT`. À zéro, la vague suivante ne démarre pas : `endChapter()` est appelé.
  Si une vague se termine sans choix de cartes (Sans pause, vague impaire), la scène suit
  `STORY_OUTRO_DELAY` secondes après la bannière.
- `endChapter()` : `world.state = 'talk'` (le monde est figé), point d'accroche **fin de chapitre**
  (étape 6 : scène de conclusion ; ici : rien), puis :
  - si `endsStory(S.wave)` : `winStory()` ;
  - sinon : `changeChapter(S.chapter + 1)`.
- `changeChapter(i)` : fondu au noir (nouveau calque `#fade`, environ 0,4 s). Au noir :
  `enterArena(chapterArena(i))`, sol repeint (`paintFloor`), bannière effacée. Puis fondu retour et
  `beginChapter(i)`.

### Chapitre dans le HUD

En mode Histoire, l'étiquette du panneau de vague (`.panel.wave .label`, aujourd'hui « Vague ») devient
« Ch. 2 · Vague » (`tr.waveLabelStory(n)`). Le numéro de vague dessous ne change pas. Elle est posée
par `resetHud` et à chaque changement de chapitre, jamais à chaque image. En mode Arène, l'étiquette
reste « Vague ».

### Nouvel état d'écran `'talk'`

- `frame.js` ne fait que dessiner : ni `update`, ni HUD, et `S.time` n'avance pas (le monde est figé
  comme en pause, et les animations d'ambiance qui suivent `S.time` aussi).
- Pendant `'talk'` : P et Échap ne mettent pas en pause, la perte de focus (`blur`,
  `visibilitychange`) ne fait rien de plus, le tir et les déplacements sont ignorés. Les touches
  propres aux dialogues arrivent à l'étape 6.
- La démo n'utilise jamais cet état.

### Mort

- Même délai qu'en Arène avant l'écran de fin. `gameOver()` regarde le mode :
  - Histoire : la partie va dans `world.storyRuns` (`last`, et `top` par `rankStoryRun`), écrite sous
    `STORAGE_STORY`. `world.best`, `STORAGE_BEST` et `world.runs` ne bougent pas.
  - Arène : rien ne change.
- L'écran de fin garde son titre « Submergé ». En Histoire, sa phrase devient « Tombé au chapitre 2,
  Camp de Sibérie, pendant la vague 8, après 212 kills » (`tr.overLineStory`). Il montre le classement
  Histoire, partie jouée surlignée.
- **Rejouer**, et Entrée, A ou Start sur cet écran, relancent **le même mode**. En Histoire, la partie
  reprend au chapitre 1, à zéro. Le bouton Recommencer de la pause fait de même (`restart()` choisit
  `startStory` ou `startGame` selon `world.mode`).

### Victoire : le tableau de fin

`winStory()`, après la fin du chapitre 4 :

- La partie est enregistrée en Histoire avec `won: true`, `chapter: 4`.
- Nouvel écran `#winScreen`, nouvel état `'win'` (traité comme `'over'` par `frame.js`). Il affiche :
  - un titre de victoire ;
  - une phrase de fin (voir Textes) ;
  - score, vagues jouées, kills, meilleur combo, durée (`S.time`, au format `m:ss`) ;
  - les cartes prises, en pastilles, comme « Dernière partie » ;
  - le classement Histoire, partie jouée surlignée.
- Deux boutons :
  - **Rejouer** (`startStory`), aussi avec Entrée, A ou Start ;
  - **Accueil** (`toTitle`), aussi avec Échap ou B.
- `toTitle()` cache les écrans et le HUD, montre l'accueil, repasse `world.mode` à `'arena'`, relance
  la démo (`startDemo`) et rend le focus à l'entrée Histoire du menu.

### Textes (`src/i18n/fr.js` et `en.js`)

| Clé | Français | Anglais |
| --- | --- | --- |
| `story` | Histoire | Story |
| `chapterN` | `n => 'Chapitre ' + n` | `n => 'Chapter ' + n` |
| `overLineStory` | `(n, arena, wave, kills) => …` « Tombé au chapitre 2, Camp de Sibérie, pendant la vague 8, après 212 kills. » | « Fell in chapter 2, Siberian Camp, during wave 8, after 212 kills. » |
| `winTitle` | Histoire terminée | Story complete |
| `winLine` | provisoire : « Le Dev n'avait rien prévu après. Toi non plus. » | provisoire : « The Dev didn't plan anything after this. Neither did you. » |
| `storyRuns` | Histoire | Story |
| `chapter` | Chapitre | Chapter |
| `storyDone` | Fin | End |
| `duration` | Durée | Time |
| `home` | Accueil | Home |
| `waveLabelStory` | `n => 'Ch. ' + n + ' · Vague'` | `n => 'Ch. ' + n + ' · Wave'` |
| `lastRunStory` | `(n, arena) => …` « Histoire · Chapitre 2 · Camp de Sibérie » | « Story · Chapter 2 · Siberian Camp » |

Les textes fixes de `index.html` passent par `data-i18n`.

## Hors périmètre

- Dialogues : étape 6.
- Bouton Accueil sur l'écran de mort : on ne l'ajoute pas, l'écran reste celui du mode Arène.
- Reprise d'une partie interrompue.
- Démo de l'accueil en mode Histoire.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | rien de plus que l'étape 4 |
| rules | — | aucun (étape 4) |
| state | `src/state/world.js` | lecture de `world.storyRuns` (étape 4) |
| game | `src/game/story.js` (nouveau) | `startStory`, `beginChapter`, `endChapter`, `changeChapter`, `winStory`, points d'accroche début et fin de chapitre |
| game | `src/game/flow.js` | `gameOver` selon le mode, `restart()`, `toTitle()` |
| loop | `src/loop/update.js` | fin de vague : `S.outroT` ; pause : décompte de `S.outroT` à la place de `S.breakT`, puis `endChapter` |
| loop | `src/loop/frame.js` | états `'talk'` (dessin seul) et `'win'` (comme `'over'`) |
| render | `src/render/hud.js` | classement Histoire (accueil, écran de fin, tableau de fin), dernière partie tous modes, étiquette « Ch. N · Vague », contenu de `#winScreen` |
| input | `src/input/buttons.js` | entrée Histoire, Rejouer et Accueil du tableau de fin, Recommencer selon le mode |
| input | `src/input/keyboard.js`, `src/input/gamepad.js` | `'win'` : Entrée/A/Start → Rejouer, Échap/B → Accueil ; `'over'` relance le même mode ; `'talk'` : rien |
| DOM | `index.html`, `src/style.css` | entrée `#storyBtn`, bloc Histoire de `#records`, `#winScreen`, calque `#fade` |
| i18n | `src/i18n/fr.js`, `src/i18n/en.js` | clés du tableau des textes |
| documentation | `docs/decisions.md`, skill `architecture` | section « Mode Histoire » : menu, états `'talk'` et `'win'`, records ; carte des modules (`game/story.js`) |

`src/game/story.js` ne pose aucun écouteur à l'import. Si cela change, il doit être importé dans
`src/main.js`.

## Critères d'acceptation

- Quand on active Histoire sur l'accueil, alors la partie démarre à Chinatown avec une bannière
  « Chapitre 1 · Chinatown », même si l'arène choisie est une autre.
- Quand la vague 5 est terminée et la carte choisie, alors, 1,5 s plus tard, l'écran passe au noir et
  revient au camp de Sibérie. Le joueur est au centre, avec ses cartes, ses armes, sa vie et son score,
  et la bannière « Chapitre 2 · Camp de Sibérie » s'affiche. La vague 6 démarre après la pause habituelle.
- Quand on meurt au chapitre 3, alors l'écran de fin dit le chapitre, l'arène, la vague et les kills,
  et montre le classement Histoire. Rejouer repart à Chinatown, vague 1.
- Quand on termine la vague 20, alors le tableau de fin s'affiche avec score, vagues, kills, meilleur
  combo, durée, cartes et classement. Rejouer relance l'histoire, Accueil ramène à l'accueil avec la démo.
- Quand on rouvre le jeu, alors le classement Histoire est toujours là (`tete-carree-story`), et les
  records du mode Arène sont inchangés.
- Quand on joue la vague 8 en Histoire, alors le panneau de vague affiche « Ch. 2 · Vague » au-dessus de 8.
- Quand la dernière partie jouée est une partie Histoire, alors « Dernière partie » sur l'accueil la
  montre, avec son chapitre et son arène.
- Quand on joue en mode Arène, alors rien ne change : menu, partie, mort, meilleures parties, étiquette « Vague ».
- Au clavier, à la manette et au toucher, tout le parcours se fait sans souris.
- `npm test` passe.

## Tests

- Les règles sont testées à l'étape 4.
- `tests/i18n.test.js` : les nouvelles clés existent dans les deux langues (couvert par le test des
  clés et celui des textes `data-i18n`) ; `overLineStory` et `chapterN` se lisent sans `undefined`.
- Vérifications manuelles :
  - une histoire complète ; pour aller vite, une console qui avance `S.wave` est acceptable en
    développement, mais rien n'est livré pour ça ;
  - une mort à chaque chapitre ;
  - Sans pause pris avant la vague 5 (fin de chapitre sans choix de cartes) ;
  - Ravitaillement : un zombie de caisse présent pendant la pause de fin de chapitre ;
  - pause pendant la pause de fin de chapitre ;
  - perte de focus pendant le fondu ;
  - manette seule, téléphone seul ;
  - mode Arène complet pour la non-régression.

## Risques et questions ouvertes

- **Largeur du panneau de vague** : « Ch. 2 · Vague » est plus long que « Vague ». À vérifier sur
  téléphone étroit, en anglais comme en français.
- **Pacte majeur garanti à la fin de la vague 5** : il tombe juste avant le premier changement de
  chapitre, ce qui fait un beau moment, mais aussi une longue pause (cartes, scène, fondu, scène, pause
  d'avant-vague). À sentir en jeu.
- **Sablier, Vampire et la pause de fin de chapitre** : leur perte de vie suit le combo et la vague,
  pas la pause. Rien ne change, mais à vérifier en jeu pendant `S.outroT`.
- Équilibrage et `rng` : les vagues, cartes et tirages sont ceux du mode Arène. Aucun tirage n'est
  ajouté au changement de chapitre.
