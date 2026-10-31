---
name: testing
description: Use when writing, running or reviewing tests in Tête Carrée, or when deciding whether a change needs a new test and where it goes.
auto_invoke: true
---

# Tests de Tête Carrée

## Commande

```sh
npm test            # vitest run : tous les tests/*.test.js
npm run test:watch  # vitest en mode surveillance
```

Résultat attendu aujourd'hui : 8 fichiers, tous les tests verts **plus un `test.fails`**
(`tests/pathfield.test.js`, bug d'arrondi Float32 documenté dans `docs/decisions.md`). Si ce test
se met à « passer », Vitest le signale en échec : c'est que le champ de distances a changé — décision à
prendre explicitement, pas un effet de bord à accepter.

Le hook Stop (`scripts/run-tests.sh`) lance `npm test` à chaque fin de tâche et bloque si la suite échoue.

## Performance

```sh
npm run perf        # 20 s de partie, budget d'allocations JS
npm run perf -- 8   # durée en secondes
```

`scripts/perf.mjs` lance Vite et Chrome sans interface (`CHROME=<chemin>` pour un autre Chromium),
démarre une partie avec un joueur immobile rendu invulnérable, puis mesure les allocations avec le
profil échantillonné de Chrome. Il affiche les Mo/s par fonction et échoue au-delà de `BUDGET_MB_S`
(10 Mo/s ; environ 2 aujourd'hui). Il ne fait pas partie de `npm test` ni du hook Stop : il exige
Chrome et dure une vingtaine de secondes. Lance-le après un changement dans un chemin chaud et avant
chaque publication.

## Philosophie

- **Tests macro** : chaque test énonce une règle que le joueur remarquerait, dans le vocabulaire du jeu
  (« un tir de face sur un blindé s'écrase sur son bouclier », « l'Uzi se débloque à 1 000 points, pas
  avant »). Pas de test sur une variable interne ou un détail d'implémentation.
- **Seule la couche `src/rules/` est testée** : fonctions pures, sans DOM ni horloge. `game/`,
  `render/`, `input/` et `loop/` touchent au DOM et au canvas ; ils se vérifient en jouant
  (`npm run dev`). Si une logique de ces couches mérite un test, extrais-la d'abord en règle pure.
- **Aléatoire maîtrisé** : `createRng(graine)` (`src/rules/rng.js`) pour un tirage reproductible, ou une
  suite de valeurs imposée (`const fixed = (...values) => () => values.shift();`, voir
  `tests/scoring.test.js`) pour viser une branche précise.
- **État construit en littéral** dans le test : `{ soif: 2 }` pour les cartes, une `Uint8Array(MW * MH)`
  pour la grille (`0` sol, `1` mur, `2` caisse, `3` crevasse), une `Map` vide pour `blocks`.
- Une ou deux assertions par règle : le cas nominal et le cas limite qui justifie la règle.

## Format

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { killPoints } from '../src/rules/scoring.js';

test('un zombie rapporte 50 points, multipliés par le combo', () => {
  assert.equal(killPoints('z', {}, 3), 150);
});
```

Noms de tests en français, phrase complète qui se lit comme la règle.

## Couverture par fichier

| Fichier de test | Règles couvertes |
| --- | --- |
| `tests/modifiers.test.js` | `rules/modifiers.js` : multiplicateur tous les 5 kills, Frénésie à ×5, cadence (Sans armure, Frénésie), Combo tenace, Double roulade |
| `tests/unlock.test.js` | `rules/unlock.js` : seuil de l'Uzi, déblocages multiples dans l'ordre, pas de double déblocage, munitions à l'arrivée |
| `tests/map.test.js` | `rules/map.js` : tir au-dessus d'une crevasse mais pas d'un mur, ligne de vue bloquée par une barricade, marche bloquée par une crevasse, case occupée, contact avec le bord d'une crevasse |
| `tests/pathfield.test.js` | `rules/pathfield.js` : suivi d'un couloir, barricade qui allonge le chemin, zone coupée qui converge vers le bord ; `test.fails` du bug connu |
| `tests/arenas.test.js` | plans de `state/arena.js`, pour chaque arène : départ sur du sol, chaque porte reliée au départ à pied, aucune case de sol enfermée (parcours case à case, pas le champ de distances) |
| `tests/cards.test.js` | `rules/cards.js` : trois cartes différentes, même graine ⇒ mêmes cartes, carte au max exclue, plus rien à proposer, cartes bannies, carte en plus hors table, garanties gardées à la relance |
| `tests/waves.test.js` | `rules/waves.js` : 13 zombies en vague 1, entrée de chaque type à sa vague, Prime de risque grossit les meutes, compteur de restants, apparition deux par deux après la vague 6 |
| `tests/scoring.test.js` | `rules/scoring.js` : points par kill et multiplicateur, Chair à canon, Prime de risque, Soif de sang, caisse lâchée par un blindé, pièces lâchées et pièces de fin de vague |
| `tests/shop.test.js` | `rules/shop.js` : prix de la relance, carte en plus (une par écran, jamais sous Pas de pause), pactes rachetables, rachat sans mutation |
| `tests/damage.test.js` | `rules/damage.js` : bouclier du blindé (face, dos, explosions et railgun, bouclier brisé), recul, invulnérabilité de roulade, Second souffle |

`rules/rng.js` n'a pas de fichier dédié : il est exercé par `cards` et `waves`.

## Où mettre un nouveau test

1. La règle vit dans `src/rules/<thème>.js` ⇒ le test va dans `tests/<thème>.test.js`.
2. Nouveau module de règles ⇒ nouveau fichier `tests/<module>.test.js`, même en-tête d'imports.
3. Un test qui dépend d'une valeur de `config.js` l'importe plutôt que de la recopier, sauf quand le
   nombre est la règle elle-même telle qu'annoncée au joueur (« 13 zombies », « 1 000 points »).
4. Un bug connu qu'on ne corrige pas se documente par `test.fails` avec un nom qui commence par
   « bug connu : », et une entrée dans « Deliberately left alone » de `docs/decisions.md`.
