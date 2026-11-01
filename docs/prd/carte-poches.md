# Carte Poches profondes

## Objectif

Une carte commune pour le joueur prudent : les pièces restent plus longtemps au sol, il n'a plus besoin de
plonger dans la horde pour ne rien perdre. Elle adoucit la pression du butin au lieu d'en donner plus.

Maquette : https://claude.ai/artifact/2Cxep6W35PtKnVL6HD15wt. Valeurs de départ, à régler en jeu.

## Socle technique

- Durée au sol : `COIN_LIFE` (6 s), clignotement pendant les `COIN_BLINK` (2 s) dernières ; posée à la chute dans
  `dropCoins` (`src/game/combat.js`), décomptée dans `updateCoins` (`src/loop/update.js`), clignotement dessiné
  dans `drawCoins` (`src/render/scene.js`).
- Pièces collantes (Comptoir) : `SHOP_COIN_LIFE` (10 s) pour les pièces tombées pendant une vague.
- Avarice (pacte, `docs/prd/carte-avarice.md`) ramène la durée à 3 s.

## Comportement

- Commune, `max` 2. Chaque niveau ajoute `POCHES_LIFE` (3 s) à la durée au sol : 6 s → 9 s → 12 s.
- Le clignotement garde sa durée (`COIN_BLINK`, les 2 dernières secondes).
- **Avec Pièces collantes** (décision : les deux se cumulent) : la durée de base devient 10 s, puis Poches
  profondes s'ajoute (13 s au niveau 1, 16 s au niveau 2).
- **Avec Avarice** : exclusion symétrique, les deux ne sont jamais proposées ensemble (effets contraires).
- La durée se fixe à la chute de la pièce : prendre la carte ne rallonge pas les pièces déjà au sol (aucune ne
  l'est pendant l'écran des cartes de toute façon, `update` ne tourne pas).

## Hors périmètre

- Portée de ramassage, attraction (c'est Aimant).

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'poches', rar: 'c', max: 2, excl: ['avarice'] }` ; `POCHES_LIFE = 3`. |
| rules | `src/rules/scoring.js` | `coinLife(mods, buffs)` : base `COIN_LIFE`, ou `SHOP_COIN_LIFE` sous Pièces collantes, ou `AVARICE_COIN_LIFE` sous Avarice, + `POCHES_LIFE × niveau`. Remplace le calcul en place de `dropCoins`. |
| game | `src/game/combat.js` | `dropCoins` lit `coinLife(S.mods, S.buffs)`. |
| render | `src/render/cardIcons.js` | Pictogramme `poches` (poche et pièce). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.poches` : « Poches profondes » / « Deep pockets », `desc(n)` construit depuis `COIN_LIFE` et `POCHES_LIFE`. |

## Critères d'acceptation

- Quand le joueur a Poches profondes niveau 1, alors une pièce tombée reste 9 s au sol et clignote les 2 dernières.
- Quand le joueur a le niveau 2 et Pièces collantes, alors une pièce tombée pendant la vague reste 16 s.
- Quand le joueur a Avarice, alors Poches profondes n'est jamais proposée, et inversement.

## Tests

`tests/scoring.test.js` :
- « une pièce reste 6 s au sol, 9 s avec Poches profondes »
- « Poches profondes et Pièces collantes se cumulent »
- « sans carte ni Comptoir, une pièce reste 6 s » (la règle reprend l'existant)

`tests/cards.test.js` :
- « Poches profondes et Avarice ne sont jamais proposées ensemble »

## Risques et questions ouvertes

- Plus de pièces au sol en même temps : le plafond `COIN_MAX` (80) peut être atteint plus souvent ; la plus
  ancienne disparaît alors. À vérifier en fin de partie (vagues 12 et plus).
- Performances : jusqu'à `COIN_MAX` pièces dessinées, déjà mesuré à 80 (`npm run perf` du butin).
