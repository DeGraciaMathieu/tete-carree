# Tête Carrée

> ⚠️ **Ouvrir `index.html` par double-clic ne fonctionne plus.** Le jeu est découpé en modules ES,
> que les navigateurs ne chargent pas depuis `file://`. Lance `npm run dev` à la place.

Jeu de survie en arène, en vue de 3/4 : vagues de zombies, armes à débloquer au score, cartes de
modificateurs entre les vagues. Clavier et souris, tactile ou manette.

## Prérequis

Node 22 ou plus récent.

```sh
npm install
```

## Jouer en local

```sh
npm run dev       # serveur de développement Vite, rechargement à chaud
```

## Tester

```sh
npm test          # suite Vitest (règles de jeu pures, tests/*.test.js)
npm run test:watch
```

Les tests couvrent la couche `src/rules/` : fonctions pures, sans DOM, avec l'aléatoire injecté
(`createRng(graine)`).

## Publier sur itch.io

```sh
npm run build     # produit dist/ (index.html à la racine, chemins relatifs)
npm run package   # build + zippe le contenu de dist/ dans tete-carree-itch.zip
```

Téléverse `tete-carree-itch.zip` sur itch.io comme jeu HTML jouable dans le navigateur.
`npm run package` utilise la commande `zip` du système (macOS, Linux).

Pour vérifier le build avant de publier : `npx vite preview`.

## Organisation

```
index.html          écrans, HUD, contrôles tactiles
src/config.js       constantes et équilibrage (dont SHOW_FPS_BY_DEFAULT)
src/rules/          règles pures et testées
src/state/          état de la partie et arène
src/game/           orchestration du gameplay (règle → état → effets)
src/render/         canvas, sprites, scène, HUD, compteur de FPS
src/audio/          sons synthétisés
src/input/          clavier/souris, tactile, boutons, manette
src/loop/           simulation (update) et boucle requestAnimationFrame
src/main.js         point d'entrée
tests/              tests des règles
docs/decisions.md   choix d'architecture, comportements conservés, questions ouvertes
```
