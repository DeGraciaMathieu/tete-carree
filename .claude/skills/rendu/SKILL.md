---
name: rendu
description: Use when drawing anything in Tête Carrée — canvas, sprites, outline pass, depth sorting, floor stains, particles, HUD, banners or the FPS counter.
auto_invoke: true
---

# Rendu

Le rendu ne décide rien du gameplay : il lit l'état (`state/world.js`, `state/arena.js`) et dessine.
L'aléa cosmétique (`Math.random`, `rnd`) y est permis ; jamais `rng`, qui ferait dériver la partie.

## Concepts → implémentation

| Concept | Implémentation |
| --- | --- |
| Canvas principal | `cv`, `ctx` (`render/canvas.js`) ; `ctx` est une **liaison vivante** : importe-la, ne la copie pas |
| Taille et zoom | `resize()` : `dpr` plafonné à 2, `zoom` entre `ZOOM_MIN` et `ZOOM_MAX` (vue d'environ 22 × 14 cases) |
| Contour sombre des silhouettes | `outlined(ent, draw)` : rejoue `draw` à travers le proxy `OLP` (formes opaques en `#0f1012`, élargies), puis le vrai dessin ; réglage `outlineOn` / `setOutline` (`STORAGE_OUTLINE`) |
| Image complète | `render()` (`render/scene.js`) : caméra (`cam`, `world.shake`), sol, marqueurs, chutes, liste triée, projectiles, particules, traçantes, explosions, textes flottants, viseur de pose |
| Ordre de profondeur | liste triée par `k` (≈ `y` au sol) : `t` 0 tuile, 1 construction, 2 caisse, 3 ennemi, 4 joueur, 5 grenade, 6 roquette ; hors champ ignoré pour 2 à 4 |
| Personnages | `render/sprites.js` : `drawChar(e, kind)` (zombie, diable), `drawBloater`, `drawRunner`, `drawSpitter`, `drawArmored`, `drawPlayerState` (+ `drawGun`, `GUNS`) ; flash blanc via `C = c => fl ? '#ffffff' : c` |
| Sol | `floorC`/`fctx` (`render/floor.js`), repeint à chaque nouvelle partie par `paintFloor()` (`newGame`), puis tamponné en jeu (`stampBlood`, `stampScorch`) |
| Particules | `addPart({ t, x, y, z, vx, vy, vz, life, size, color })` (`render/effects.js`), plafond `MAX_PARTS` ; aides `blood`, `gibs`, `sparks`, `dust`, `casing`, `pop` (texte flottant) ; physique dans `update` (section « particules ») |
| Perspective 3/4 | hauteur `z` soustraite à `y` à l'affichage ; ellipses d'ombre aplaties |
| HUD (DOM) | `render/hud.js` : `buildSlots`, `updateHud` (cache `setText`/`setStyle` pour n'écrire que ce qui change), `resetHud`, `banner(m, s, kind, count)` ; portrait du héros `renderFace` (canvas `#face` de 13 × 13 : intact, blessé sous 60 % de la vie max, critique sous `LOW_HP`, mort ; redessiné seulement quand son apparence change, sursaut CSS `jolt` à chaque perte de vie) |
| Compteur de FPS | `render/fps.js` : `fpsOn` = réglage enregistré (`STORAGE_FPS`) sinon `SHOW_FPS_BY_DEFAULT` (`false`) ; `setFps`, `tickFps` |
| Mini-plan de l'accueil | `render/minimap.js` : `drawArenaMap()` (appelée par `loop/frame.js` pendant la démo), plan vu de dessus repeint au changement d'arène, joueur et horde en points ; canvas `#arenaMap` dans `#titleMenu`, masqué sous 720 px |
| Volet Arsenal | `render/arsenal.js` : `buildArsenal()` (au changement de langue), `drawArsenal()` (appelée par `loop/frame.js`, repeint une vignette seulement quand sa taille change) ; armes par `drawGun` (`sprites.js`), barricade et baril par `drawBlock` (`scene.js`) sur un faux bloc, via `drawOn` |
| Volet Bestiaire | `render/bestiary.js` : `buildBestiary()` (au changement de langue), `drawBestiary(dt)` (appelée par `loop/frame.js`, ne dessine que volet ouvert) ; portraits dessinés avec les vrais sprites via `drawOn(g, draw)` de `render/canvas.js`, qui pointe `ctx` sur un autre canvas |
| Écrans | éléments de `index.html` (`#titleScreen`, `#pickScreen`, `#pauseScreen`, `#overScreen`) montrés par `hidden`, pilotés par `game/flow.js` |

## Le proxy de contour (`OLP`)

Pendant `outlined()`, `ctx` **n'est pas** un `CanvasRenderingContext2D` : c'est `OLP`, qui ne connaît
que `fillStyle`, `strokeStyle`, `lineWidth`, `lineCap`, `globalAlpha`, `lineDashOffset`,
`setLineDash`, `save`, `restore`, `translate`, `scale`, `rotate`, `beginPath`, `closePath`, `moveTo`,
`lineTo`, `quadraticCurveTo`, `arc`, `ellipse`, `rect`, `clip`, `createLinearGradient`,
`createRadialGradient`, `fillRect`, `strokeRect`, `fill`, `stroke`.

Une fonction de dessin passée à `outlined()` qui appelle autre chose (`bezierCurveTo`, `fillText`,
`drawImage`, `globalCompositeOperation`…) lève une erreur dès que les contours sont activés.
Ajoute la méthode au proxy (en la relayant à `R`, ou en dessinant la forme en `OUT` si elle est
opaque) ou garde cet appel hors de `outlined()`.

Les couleurs `rgba(…)` d'alpha < 0,7 sont ignorées par le contour (`opaque()`) : c'est ce qui
exclut ombres et effets translucides.

## Dessiner une nouvelle entité

1. Écris `draw<Nom>(e)` dans `src/render/sprites.js`, sous un commentaire `/* … */` qui décrit le
   personnage ; repère local centré sur `(e.x, e.y)`, `C(fl, c)`, `R(fl, …)`, `E(fl, …)` du module pour le
   flash, palette en dur (les couleurs restent hors de `config.js`). Pas de fermeture ni de tableau créés
   à chaque appel : un personnage est dessiné deux fois par image (contour), une centaine en fin de partie.
2. Branche-la dans `render()` (`src/render/scene.js`) : soit dans la liste triée (nouveau `t`, ou
   aiguillage par `e.type` existant — **les deux** aiguillages, chutes et `drawEnemy`), soit dans une passe
   d'effets après la liste.
3. Si elle doit être détourée, passe-la par `outlined(ent, draw…)` (qui appelle `draw…(ent)`) et respecte le proxy.
4. Particules ou taches : `addPart`/`stampBlood` avec `Math.random`/`rnd`, jamais `rng`.
5. Vérifie à l'œil avec `npm run dev`, contours activés **et** désactivés (bouton de l'écran de pause).

## Ajouter un élément de HUD

1. Balise dans `index.html` (dans `#hud`), styles dans `src/style.css` (penser à la zone sûre
   `env(safe-area-inset-*)` et au format mobile).
2. Mise à jour dans `updateHud` via `setText`/`setStyle` ; remise à zéro dans `resetHud` si besoin.
3. Un libellé visible au joueur est de la documentation : il doit rester vrai.
