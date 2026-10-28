---
name: prd
description: Use when the user wants a specification (PRD) for a Tête Carrée feature before any code is written; produces a document, implements nothing.
---

# Rédiger un PRD

Ce skill produit un document de spécification. **Il n'implémente rien** : aucun fichier de `src/`
ni de `tests/` n'est modifié.

## 1. Explorer l'existant

Avant de poser la moindre question, remplis toi-même le socle technique :

- invoque `architecture` et les skills de domaine concernés (`horde`, `armes`, `cartes`, `rendu`) ;
- repère les constantes de `src/config.js`, les règles de `src/rules/`, les actions de `src/game/`
  et les sections de `src/loop/update.js` que la fonctionnalité touchera ;
- relève dans `docs/decisions.md` les contraintes applicables (cible itch.io, clés `localStorage`,
  comportements volontairement conservés, questions ouvertes).

## 2. Poser les décisions produit

Ne demande que ce que le code ne peut pas dire : intention de jeu, valeurs chiffrées, rareté,
vague d'apparition, plateformes concernées, ce qui est explicitement hors périmètre. Regroupe les
questions en un seul échange.

## 3. Écrire le PRD

Format fixe, en français, dans `docs/prd/<slug>.md` (ou dans la conversation si l'utilisateur le
préfère) :

```markdown
# <Titre de la fonctionnalité>

## Objectif
Ce que le joueur gagne, en deux ou trois phrases.

## Socle technique
Ce qui existe déjà et sur quoi on s'appuie : fichiers, fonctions, constantes, collections de `world`.

## Comportement
Règles précises, chiffrées, dans le vocabulaire du jeu. Interactions avec les cartes, les ennemis,
les crevasses, les constructions, la roulade. Comportement sur clavier, manette, tactile.

## Hors périmètre
Ce qui ne sera pas fait.

## Impact par couche
| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | … |
| rules | `src/rules/…` | … |
| state | `src/state/…` | … |
| game | `src/game/…` | … |
| loop | `src/loop/update.js` | … |
| render | `src/render/…` | … |
| input | `src/input/…` | … |
| documentation vivante | `index.html`, textes de `MODS` | … |

## Critères d'acceptation
Liste vérifiable : « quand …, alors … ».

## Tests
Tests macro à écrire, fichier par fichier, formulés comme les noms de tests du projet.
Vérifications manuelles nécessaires (rendu, sensations, plateformes).

## Risques et questions ouvertes
Effets sur l'équilibrage, sur l'ordre des tirages `rng`, sur les performances (particules, champ de
distances), décisions non prises.
```
