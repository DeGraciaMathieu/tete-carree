---
description: Revue complète des changements en cours (conventions, tests, maintenabilité, cohérence du système)
---

# /review

## 1. Contexte

1. Lis `CLAUDE.md` et, si un choix d'architecture est en jeu, `docs/decisions.md`.
2. Récupère le périmètre :
   - `git status`
   - `git diff`
   - `git diff --cached`
   - `git log --oneline -5`
3. S'il n'y a aucun changement (ni indexé, ni non indexé, ni fichier non suivi pertinent), dis-le et
   arrête-toi.
4. Invoque `architecture` et les skills de domaine des fichiers touchés (`horde`, `armes`, `cartes`,
   `rendu`).

## 2. Vérifications

Pour chaque point, statut **OK**, **VIOLATION** (avec fichier:ligne et correction attendue) ou **N/A**.

### Conventions

1. `src/rules/` : aucun `document`, `window`, canvas, `Math.random`, `Date.now`, `performance.now` ;
   aucune mutation d'argument ; imports limités à `config.js` et aux autres règles.
2. Valeurs d'équilibrage : aucune nouvelle valeur de gameplay en dur hors de `src/config.js`
   (couleurs, particules, sons et tremblement d'écran exceptés).
3. Aléatoire : `rng`/`jitter` pour le gameplay, `Math.random`/`rnd` uniquement pour le cosmétique ;
   ordre des tirages `rng` existants inchangé sauf intention explicite.
4. État : pas de réaffectation d'une liaison importée ; nouvel état initialisé dans `resetWorld` ;
   collections filtrées par `world.<x> = …filter(…)`.
5. Entrées : tout nouveau module à effets de bord importé dans `src/main.js`.
6. Rendu : fonctions passées à `outlined()` limitées aux méthodes du proxy `OLP`.
7. Invariants de publication : clés `STORAGE_*` inchangées, `base: './'` intact, chemins relatifs dans
   `index.html`, protections navigateur (`try/catch` sur `localStorage` et `getGamepads`, son au
   premier geste, pause sur `blur`/`visibilitychange`) conservées.
8. « Deliberately left alone » (`docs/decisions.md`) : aucun de ces comportements modifié sans décision
   explicite.
9. Style : commentaires et textes en français, ligne d'en-tête de module, nommage du projet.

### Tests

10. Chaque règle nouvelle ou modifiée de `src/rules/` a un test macro dans `tests/`.
11. Les tests sont formulés comme des règles du jeu, sans détail d'implémentation.
12. Une logique testable restée dans `game/` ou `loop/` aurait dû être extraite en règle pure.

### Maintenabilité

13. Couplage : pas de nouvelle dépendance montante (règle → état/rendu, rendu → game hors exception de
    `hud.js`).
14. Responsabilité unique : chaque fonction ajoutée fait une chose ; `update` ne grossit que d'une
    section commentée par entité.
15. Duplication : pas de copie d'un calcul déjà disponible (`moveCircle`, `explosion`, `hurtEnemy`,
    `los`, `walkLine`, `addPart`…).
16. Longueur et complexité des fonctions ajoutées, au regard du style compact existant.
17. Nommage : camelCase pour les fonctions, `SCREAMING_SNAKE_CASE` pour les constantes, vocabulaire du jeu.
18. Valeurs magiques : nombres non expliqués dans le code de gameplay.

### Cohérence du système

19. Intégration : le changement passe par les points d'entrée existants (`addScore`, `hurtEnemy`,
    `hurtPlayer`, `explosion`, `spawnEnemy`, `choosePick`…) plutôt que de les contourner.
20. Forme des données : nouveaux champs d'entités cohérents avec les objets existants ; nouveaux
    éléments de `W`/`MODS`/`ENEMY_STATS` complets.
21. Patterns établis : `world.fieldDirty` après une modification de grille, `banner`/`sfx`/`pop` pour le
    retour joueur, caches du HUD.
22. Documentation vivante : textes de l'écran titre et de l'écran de choix de carte dans `index.html`,
    `desc`/`plus`/`minus` des cartes, bannières de vagues toujours vrais.
23. `CLAUDE.md`, skills et `docs/decisions.md` à jour si le périmètre a bougé.

## 3. Tests

Lance `npm test` et rapporte le résultat (fichiers, tests passés, échecs attendus, échecs).

## 4. Rapport

```
## Revue — <résumé du changement>

| # | Point | Statut | Détail |
| --- | --- | --- | --- |
| 1 | Pureté de rules/ | OK | |
| … | … | … | … |

Tests : <résultat de npm test>

Verdict : ACCEPTÉ | À CORRIGER
- <violations à corriger, par ordre de gravité>
```
