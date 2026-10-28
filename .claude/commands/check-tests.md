---
description: Analyse la couverture de tests des changements en cours et propose les tests macro manquants
---

# /check-tests

## 1. Contexte

1. Lis `CLAUDE.md` et invoque le skill `testing`.
2. Récupère le périmètre : `git status`, `git diff`, `git diff --cached`, `git log --oneline -5`.
3. S'il n'y a aucun changement, dis-le et arrête-toi.

## 2. Analyse

Pour chaque fonction ajoutée ou modifiée, statut **OK** (couverte), **VIOLATION** (non couverte
alors qu'elle devrait l'être) ou **N/A** (rendu, entrées, orchestration non testable) :

1. Fonctions de `src/rules/` : chacune a-t-elle un test macro qui exerce le comportement modifié ?
2. Logique de gameplay ajoutée dans `src/game/` ou `src/loop/update.js` : est-elle extractible en règle
   pure ? Si oui, signale-le comme préalable au test.
3. Constantes de `src/config.js` modifiées : un test annonce-t-il l'ancienne valeur (« 13 zombies »,
   « 1 000 points ») ?
4. Le `test.fails` de `tests/pathfield.test.js` est-il toujours en échec attendu ?

## 3. Proposition

Liste les tests macro manquants : fichier cible, nom du test (phrase en français que le joueur
reconnaîtrait), état construit en littéral, assertion attendue.

**Attends l'accord de l'utilisateur avant d'écrire le moindre test.**

## 4. Après accord

1. Écris les tests approuvés, au format du skill `testing`.
2. Lance `npm test`.
3. Si un nouveau test échoue, ne modifie pas le code de jeu pour le faire passer sans le signaler :
   soit le test se trompe sur la règle, soit c'est un bug — demande.

## 5. Rapport

```
## Couverture — <résumé du changement>

| # | Fonction / règle | Statut | Détail |
| --- | --- | --- | --- |

Tests proposés : <n> — écrits : <n>
Tests : <résultat de npm test>

Verdict : COUVERT | TESTS MANQUANTS
```
