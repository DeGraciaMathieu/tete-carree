---
name: architecture
description: Use when you need to know which module does what in Tête Carrée, or where a new piece of code belongs, before touching src/.
auto_invoke: true
---

# Architecture de Tête Carrée

Cycle d'une image (`loop/frame.js`) : `pollPad()`, `tickFps()`, `dt` plafonné à `MAX_DT` ; si
`world.state === 'play'`, `update(dt)` (`loop/update.js`) puis `updateHud()` ; sur les écrans titre et
de fin, seul `S.time` avance ; dans tous les cas `render()` (`render/scene.js`).
`update` fait avancer les entités, appelle les actions de `game/`, qui consultent les règles de
`rules/` et appliquent leurs effets (état, sons, particules, bannières).

## Carte des modules

| Module | Rôle | Dépendances clés |
| --- | --- | --- |
| `index.html` | écrans (titre, choix de carte, pause, fin), HUD, contrôles tactiles, textes des contrôles et du bestiaire | `./src/style.css`, `./src/main.js` |
| `src/main.js` | point d'entrée : importe les modules d'entrée, `resize`, `setOutline`, `setFps`, `startDemo`, `renderRuns`, `buildArsenal`, lance `frame` | tout |
| `src/config.js` | constantes : arène (`T`, `MW`, `MH`), armes `W`, `SHOTS`, cartes `MODS`, raretés `RAR`, ennemis `ENEMY_STATS`…, vagues `WAVE_UNITS`…, stockage `STORAGE_*`, `SHOW_FPS_BY_DEFAULT` | — |
| `src/util.js` | `$` (getElementById), `rnd` (aléa cosmétique), `clamp`, `fmt` | — |
| `src/rules/rng.js` | `createRng(seed)` (LCG) | — |
| `src/rules/modifiers.js` | `modLevel`, `multiplier`, `frenzy`, `fireMul`, `comboTime`, `rollMax` | config |
| `src/rules/unlock.js` | `weaponsToUnlock`, `ammoOnUnlock` | config |
| `src/rules/map.js` | `tileAt`, `passable`, `openT`, `shotTile`, `isVoid`, `circleTouchesVoid`, `walkLine`, `los` (grille passée en paramètre) | config |
| `src/rules/pathfield.js` | `computeField`, `nextStep`, `UNREACHABLE` (Dijkstra de la horde) | config, map |
| `src/rules/cards.js` | `rollCards(mods, rng)` | config, modifiers |
| `src/rules/waves.js` | `waveQueue`, `queueCount`, `spawnBurst`, `spawnGap` | config, modifiers |
| `src/rules/scoring.js` | `killPoints`, `soifHeal`, `rollDrop` | config, modifiers |
| `src/rules/records.js` | `rankRun` (classement des meilleures parties) | — |
| `src/rules/damage.js` | `resolveEnemyHit`, `playerProtected`, `secondWind` | config, modifiers |
| `src/state/world.js` | `world` (écran, collections, `shake`, `fieldDirty`, `best`, `runs`), `S` (session), `player`, `blocks`, `unlocked`, `ammo`, `cam`, `rng`, `jitter`, raccourcis `mod`/`frenzy`/`fireMul`…, `resetWorld` | config, rules, arena |
| `src/state/arena.js` | `map`, `doors`, `doorSet`, `buildMap`, collisions (`moveCircle`, `unstick`), wrappers des règles de grille liés à l'état, `dist` + `computeField`/`nextStep`, `frontTile`, `clearShot` | rules/map, rules/pathfield |
| `src/game/combat.js` | `hurtEnemy`, `killEnemy`, `hurtPlayer`, `shockwave`, `explosion`, `toxicBurst` | rules/damage, rules/scoring, render/effects |
| `src/game/weapons.js` | `fireWeapon`, `selectWeapon`, `cycleWeapon`, constructions (`placeBlock`, `damageBlock`, `explodeBarrel`), `updateTurret` | combat |
| `src/game/enemies.js` | `spawnEnemy`, `startWave`, `spit`, `updateGlobs` | rules/waves |
| `src/game/player.js` | `moveInput`, `tryRoll`, `updateRoll`, `updateFires` (traînée de feu) | input, combat |
| `src/game/score.js` | `addScore` (+ déblocage des armes) | rules/unlock |
| `src/game/flow.js` | `newGame`, `startDemo`, `startGame`, `pause`, `resume`, `gameOver`, `openPick`, `choosePick`, `demoPick`, `focusCard` ; `gameOver` enregistre la partie dans `world.runs` | rules/cards, render |
| `src/game/demo.js` | partie de démo de l'écran titre : `demoControl` (pilote automatique, commandes dans `ctl`), `demoOver`, `DEMO_WAVES`, `DEMO_BREAK` | state, game/player, game/weapons |
| `src/render/canvas.js` | `cv`, `ctx` (liaison vivante), `resize`, `zoom`, passe de contour `outlined` + proxy `OLP`, `setOutline` | — |
| `src/render/floor.js` | sol peint hors écran (`floorC`, `fctx`), `paintFloor`, `stampBlood`, `stampScorch` | arena |
| `src/render/effects.js` | particules : `addPart`, `blood`, `gibs`, `sparks`, `dust`, `pop`, `casing` | world |
| `src/render/cardIcons.js` | `cardIcon(id)` : pictogramme SVG d'une carte de modificateur | rien |
| `src/render/sprites.js` | `drawChar`, `drawBloater`, `drawRunner`, `drawSpitter`, `drawArmored`, `drawPlayerState`, `GUNS`… | canvas |
| `src/render/scene.js` | `render()` : caméra, sol, tri en profondeur, entités, projectiles, effets | sprites, floor |
| `src/render/hud.js` | `buildSlots`, `updateHud`, `resetHud`, `banner`, `drawFace`, `buildArsenal`, `renderRuns` (dernière partie et meilleures parties) | world |
| `src/render/fps.js` | `fpsOn`, `setFps`, `tickFps` | config (`SHOW_FPS_BY_DEFAULT`) |
| `src/audio/sfx.js` | `audio()` (démarrage au premier geste), `sfx(name)`, bouton son | — |
| `src/input/keyboard.js` | `keys`, `mouseFire`, `releaseFire`, raccourcis, pause sur `blur`/`visibilitychange` | game |
| `src/input/touch.js` | `stick`, `aim`, boutons ROULER/ARME | game |
| `src/input/gamepad.js` | `pad`, `pollPad`, `rumble` (`getGamepads` sous `try/catch`) | game |
| `src/input/buttons.js` | boutons des écrans (Jouer, Reprendre, FPS, contours…) | game/flow |
| `src/loop/update.js` | `update(dt)` : acide, joueur, champ de distances, ennemis, séparation, projectiles, ramassage, blocs, particules, caméra | tout |
| `src/loop/frame.js` | `frame` (rAF) | update, render |

## Où va le nouveau code

| Changement | Emplacement |
| --- | --- |
| Nouvelle valeur d'équilibrage | `src/config.js`, dans la section commentée correspondante |
| Décision calculable sans DOM ni horloge (formule, tirage, condition) | `src/rules/<thème>.js` + test dans `tests/<thème>.test.js` |
| Nouvelle donnée de partie remise à zéro à chaque partie | `resetWorld()` dans `src/state/world.js` (`S`, `player` ou collection de `world`) |
| Action de jeu avec effets (son, particules, bannière) | `src/game/` (le fichier du sous-système) |
| Comportement par image d'une entité | `src/loop/update.js`, dans la section commentée de l'entité |
| Dessin | `src/render/sprites.js` (silhouette), `src/render/scene.js` (ordre et effets), `src/render/hud.js` (DOM) |
| Nouvelle touche, geste ou bouton | `src/input/…` ; nouveau fichier ⇒ import dans `src/main.js` |
| Nouvel écran ou élément de HUD | `index.html` + `src/style.css` + `src/render/hud.js` ou `src/game/flow.js` |
| Nouveau son | `src/audio/sfx.js` |
| Choix d'architecture ou question non tranchée | `docs/decisions.md` |

## Pièges connus

- Un module ES ne peut pas réaffecter une liaison importée : passe par `world.<x>`.
- `ctx` est une liaison vivante remplacée pendant `outlined()` : importe-la, ne la copie pas dans
  une variable locale au chargement du module.
- `computeField` (règle) renvoie un nouveau `Float32Array`, rangé dans `dist` par le wrapper de
  `state/arena.js` ; `update` le recalcule quand `world.fieldDirty` est vrai (bloc posé ou détruit)
  ou toutes les `FIELD_PERIOD` secondes.
- Les ordres d'appel à `rng()` font partie du comportement : ne les réordonne pas sans raison.
