# Carte Sang d'or

## Objectif

Une carte rare qui soigne en bougeant : chaque pièce ramassée rend un point de vie. Une régénération qui demande
d'aller chercher les pièces, en plus de la régénération normale.

Maquette : https://claude.ai/artifact/2Cxep6W35PtKnVL6HD15wt. Valeurs de départ, à régler en jeu.

## Socle technique

- Ramassage des pièces : `updateCoins` (`src/loop/update.js`), jamais quand le joueur est mort.
- Vie : `player.hp`, `player.maxHp` ; régénération `hpRate` (`REGEN_RATE` 3 PV/s après `REGEN_DELAY` 4 s sans
  dégât), coupée sous Sans armure, Vampire, Plus de soins.
- Exclusions symétriques : champ `excl` de `MODS`, lu par `excluded` (`src/rules/cards.js`) ; aujourd'hui posé
  sur les pactes majeurs, mais la règle vaut pour toute carte.

## Comportement

- Rare, `max` 1. Chaque pièce ramassée rend `SANGDOR_HEAL` (1) point de vie, sans dépasser la vie max.
- Vaut pour les pièces perdues sous Cupidité, ramassées de nouveau.
- **Exclue** (décision) de Sans armure, Vampire, Plus de soins et Une seule vie : jamais proposée avec eux, et
  eux jamais proposés avec elle. Ces pactes coupent le soin ; Sang d'or le rendrait. Une seule vie (1 PV)
  la rendrait inutile.
- Rachat d'un pacte (boutique de l'écran des cartes) : si le joueur rachète Vampire ou Sans armure, Sang d'or
  redevient proposable.

## Hors périmètre

- Soin sur les pièces de fin de vague (créditées directement, pas ramassées).

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'sangdor', rar: 'r', max: 1, excl: ['sansarmure', 'vampire', 'sanssoin', 'unevie'] }` ; `SANGDOR_HEAL = 1`. |
| rules | `src/rules/scoring.js` | `coinHeal(mods)` : PV rendus par une pièce ramassée (0 sans la carte). |
| loop | `src/loop/update.js` | `updateCoins` : à chaque prise, `player.hp = min(maxHp, hp + coinHeal(S.mods))`. |
| render | `src/render/cardIcons.js` | Pictogramme `sangdor` (goutte et pièce). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.sangdor` : « Sang d'or » / « Golden blood », `desc` construit depuis `SANGDOR_HEAL`. |

## Critères d'acceptation

- Quand le joueur a Sang d'or et ramasse les 5 pièces d'un Blindé, alors il récupère 5 PV.
- Quand sa vie est pleine, alors elle ne dépasse pas la vie max.
- Quand le joueur a Vampire, Sans armure, Plus de soins ou Une seule vie, alors Sang d'or n'est jamais proposée,
  et inversement.

## Tests

`tests/scoring.test.js` :
- « Sang d'or : chaque pièce ramassée rend 1 PV »

`tests/cards.test.js` :
- « Sang d'or n'est jamais proposée avec Vampire, Sans armure, Plus de soins ni Une seule vie »

## Risques et questions ouvertes

- `excl` sur une carte ordinaire : première fois. `excluded` le gère déjà dans les deux sens ; vérifier le volet
  « Cartes » de l'accueil, qui n'affiche pas les exclusions.
- Force réelle : environ 20 à 30 PV par vague en milieu de partie, comparable à 8 s de régénération. Faible
  seule ; à revoir si elle ne sort jamais du lot.
