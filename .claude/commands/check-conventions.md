---
description: Vérification rapide des conventions, de la cohérence tests/documentation et de la suite de tests
---

# /check-conventions

## 1. Contexte

1. Lis `CLAUDE.md`.
2. Récupère le périmètre : `git status`, `git diff`, `git diff --cached`, `git log --oneline -5`.
3. S'il n'y a aucun changement, dis-le et arrête-toi.

## 2. Vérifications

Statut par point : **OK**, **VIOLATION** (fichier:ligne + correction) ou **N/A**.

1. Pureté de `src/rules/` (pas de DOM, d'horloge, de `Math.random`, de mutation d'argument,
   d'import hors `config.js` et règles).
2. Pas de valeur d'équilibrage en dur hors de `src/config.js`.
3. `rng`/`jitter` pour le gameplay, `Math.random`/`rnd` pour le cosmétique.
4. Pas de réaffectation d'une liaison importée ; nouvel état dans `resetWorld`.
5. Nouveau module d'entrée importé dans `src/main.js`.
6. Clés `STORAGE_*`, `base: './'`, chemins relatifs et protections navigateur intacts.
7. Commentaires et textes en français.
8. Règle modifiée ⇒ test correspondant dans `tests/` ajouté ou adapté.
9. Documentation vivante (`index.html`, textes de `MODS`, bannières) toujours fidèle au code.

## 3. Tests

Lance `npm test` et rapporte le résultat.

## 4. Rapport

```
## Conventions — <résumé du changement>

| # | Point | Statut | Détail |
| --- | --- | --- | --- |

Tests : <résultat>

Verdict : CONFORME | NON CONFORME
```
