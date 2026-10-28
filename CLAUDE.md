# Tête Carrée

Jeu de survie en arène, en vue de 3/4, sur canvas : vagues de zombies, armes débloquées au score,
cartes de modificateurs entre les vagues. Publié sur itch.io comme jeu HTML jouable dans le navigateur.

## Stack

- JavaScript en modules ES natifs, sans framework, aucune dépendance runtime.
- Vite 8 (dev, build) et Vitest (tests) : seules dépendances de dev. Node 22 ou plus récent, npm.
- Rendu Canvas 2D, HUD et écrans en DOM (`index.html`, `src/style.css`), sons synthétisés Web Audio.

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement Vite |
| `npm test` | suite Vitest (`tests/*.test.js`) |
| `npm run build` | `dist/` avec `index.html` à la racine, chemins relatifs |
| `npm run package` | build + zip du **contenu** de `dist/` dans `tete-carree-itch.zip` (commande `zip` du système) |

Pas de linter ni de formateur : n'en ajoute pas sans qu'on le demande.
Ouvrir `index.html` par double-clic ne marche pas (ESM non servi en `file://`).

`docs/decisions.md` consigne les choix d'architecture, les comportements volontairement conservés
et les questions ouvertes : lis-le avant tout changement structurel.

## Conventions de code

### Couches

| Dossier | Contient | Peut importer |
| --- | --- | --- |
| `src/config.js` | toutes les valeurs d'équilibrage, armes `W`, cartes `MODS`, raretés `RAR`, clés de stockage | rien |
| `src/rules/` | décisions pures, testées | `config.js`, d'autres règles |
| `src/state/` | état de la partie (`world.js`) et arène (`arena.js`) | `config`, `rules`, `util` |
| `src/game/` | orchestration : règle → état → effets (sons, particules, bannières) | tout sauf `loop/` |
| `src/render/` | canvas, sprites, scène, sol, HUD, FPS | `config`, `state`, `util` (exception assumée : `hud.js` importe `sfx` pour la bannière et `selectWeapon` pour le clic sur une case d'arme) |
| `src/audio/` | sons synthétisés | `util` |
| `src/input/` | écouteurs clavier/souris, tactile, boutons, manette ; appellent directement les actions de `game/` | tout sauf `loop/` |
| `src/loop/` | `update(dt)` et boucle `requestAnimationFrame` | tout |
| `src/main.js` | point d'entrée | tout |

### Ce qu'il ne faut jamais faire

- **Dans `src/rules/`** : pas de `document`, `window`, canvas ; pas de `Math.random`, `Date.now`,
  `performance.now` ; pas de mutation des arguments ; pas d'import de `state/`, `game/`, `render/`,
  `input/`, `loop/`. L'aléatoire arrive en paramètre `rng`, le temps en `dt`.
- **Pas de valeur d'équilibrage en dur** hors de `config.js` (PV, dégâts, rayons, cadences, délais,
  portées, vitesses, composition des vagues, effets des cartes). Restent en place, par choix : couleurs,
  particules, tremblement d'écran, vibrations, sons, plan de l'arène (`buildMap`).
- **Pas de `Math.random` pour le gameplay** : utilise `rng()` / `jitter()` de `state/world.js`
  (graine tirée par `resetWorld`). `Math.random` et `rnd` (`util.js`) sont réservés au cosmétique.
- **Ne réaffecte pas une liaison importée** : un état réaffecté depuis plusieurs modules devient une
  propriété de `world` (`world.enemies = …filter(…)`). `S`, `player`, `blocks`, `unlocked`, `ammo`,
  `cam` ne sont réaffectés que par `resetWorld`.
- **Un module qui pose des écouteurs à l'import doit être importé dans `src/main.js`** — sinon il
  n'est jamais exécuté (c'est arrivé : boutons des écrans morts).
- **Ne change pas** les clés `localStorage` (`STORAGE_BEST`, `STORAGE_FPS`, `STORAGE_OUTLINE` :
  `tete-carree-best`, `tete-carree-fps`, `tete-carree-outline`), ni `base: './'` dans
  `vite.config.js`, ni les chemins relatifs (`./src/…`) de `index.html`.
- **Ne retire pas** les protections navigateur : son démarré au premier geste, pause sur `blur` et
  `visibilitychange`, `navigator.getGamepads` sous `try/catch`, accès `localStorage` sous `try/catch`.
- **Ne corrige pas en passant** un comportement listé dans « Deliberately left alone » de
  `docs/decisions.md` (bug d'arrondi du champ de distances, etc.) : c'est une décision à part.
- En dessin, n'utilise dans une fonction passée à `outlined()` que les méthodes de contexte que le
  proxy `OLP` de `render/canvas.js` connaît, ou ajoute-les au proxy.

### Style

- Commentaires, textes du jeu, noms de tests et documentation en **français**.
- Code compact du prototype conservé : fonctions courtes nommées en camelCase anglais
  (`hurtEnemy`, `spawnEnemy`), constantes de config en `SCREAMING_SNAKE_CASE`, entités en objets
  simples dans des tableaux (`world.enemies`, `world.pickups`…), types d'ennemis en une lettre
  (`z`, `b`, `r`, `s`, `a`, `d`, meute `p<n>`), cartes repérées par leur `id` (`mod('cadence')`).
- Une ligne d'en-tête en commentaire décrit le rôle de chaque module.
- Imports nommés triés par module ; les règles sont souvent importées en espace de noms
  (`import * as Waves from '../rules/waves.js'`).

## Conventions de domaine

- Unités : distances en pixels du monde, une case = `T` px ; temps en secondes ; angles en radians.
- La perspective 3/4 écrase l'axe vertical (souvent `* .55` ou `* 1.6` sur `y`) : garde ce facteur
  quand tu copies un calcul de portée au sol.
- Les textes affichés au joueur (écran titre, bestiaire, `desc`/`plus`/`minus` des cartes) sont de la
  documentation vivante : s'ils citent un nombre ou une règle, ils doivent rester vrais.

## Comportement attendu

- Ne déclare jamais une tâche terminée sans avoir lancé `npm test` et constaté qu'il passe
  (`test.fails` du champ de distances compris : il doit rester en échec attendu).
- Si une approche échoue deux fois, reviens au plan avant de continuer.
- Un changement de gameplay se teste au niveau macro dans `tests/`, dans le vocabulaire du jeu.
- Toute question que le code ne tranche pas va dans « Open questions » de `docs/decisions.md`.
- Pour vérifier le build publié : `npm run build` puis `./node_modules/.bin/vite preview`.

## Skills disponibles

| Skill | Périmètre |
| --- | --- |
| `architecture` | carte des modules et « où va le nouveau code » |
| `testing` | commande, philosophie macro, couverture par fichier de test |
| `horde` | types d'ennemis, apparitions, vagues, arène, champ de distances |
| `armes` | arsenal, tirs, constructions, explosions, déblocage au score |
| `cartes` | cartes de modificateurs et pactes, combo, multiplicateur, score |
| `rendu` | canvas et contour, sprites, scène, sol, HUD, compteur de FPS |
| `feature` | workflow d'implémentation d'une fonctionnalité (invocable) |
| `prd` | rédaction d'une spécification sans implémentation |
