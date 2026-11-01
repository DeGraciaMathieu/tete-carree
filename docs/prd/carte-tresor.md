# Carte Trésor de guerre

## Objectif

Une Légendaire qui fait de la bourse une arme : plus on garde de pièces, plus on fait de dégâts. Elle crée enfin
une raison de ne pas tout dépenser, et rend chaque achat au Comptoir ou sur l'écran des cartes plus coûteux qu'il
n'y paraît.

Maquette : https://claude.ai/artifact/2Cxep6W35PtKnVL6HD15wt. Valeurs de départ, à régler en jeu.

## Socle technique

- Dégâts des tirs du joueur : `shotDamageMul(mods, weapon, d, still, buffs)` (`src/rules/modifiers.js`), appelé
  par `shoot` (`src/game/weapons.js`) pour les tirs du joueur (`pact` vrai) ; pas pour les éclats de
  Fragmentation ni la tourelle.
- Bourse : `S.money`, `S.coinPot` (Tout ou rien, pas encore versée).
- Puces des cartes : `renderMods` (`src/render/hud.js`), redessinées quand leur signature change.

## Comportement

- Légendaire, `max` 1. Les tirs du joueur font `TRESOR_STEP` (+2 %) de dégâts en plus par tranche de
  `TRESOR_COINS` (10) pièces en bourse, jusqu'à `TRESOR_MAX` (+40 %, atteint à 200 pièces).
- Seule la bourse compte (`S.money`), pas la cagnotte de Tout ou rien.
- L'effet suit la bourse en direct : acheter au Comptoir baisse les dégâts, ramasser des pièces les monte.
- Mêmes tirs que les autres pactes de dégâts : balles, plombs, railgun ; pas les explosions, ni la tourelle, ni
  les éclats de Fragmentation.
- La puce de la carte dans le HUD affiche le bonus en cours (« Trésor +16 % »), mise à jour quand il change de
  palier (pas à chaque pièce).

## Hors périmètre

- Dégâts des explosions (barils, grenades, roquettes).

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'tresor', rar: 'l', max: 1 }` ; `TRESOR_STEP = .02`, `TRESOR_COINS = 10`, `TRESOR_MAX = .4`. |
| rules | `src/rules/modifiers.js` | `hoardMul(mods, money)` : `1 + min(TRESOR_MAX, TRESOR_STEP × floor(money / TRESOR_COINS))` sous la carte, 1 sinon. |
| game | `src/game/weapons.js` | `shoot` multiplie `mul` par `hoardMul(S.mods, S.money)` pour les tirs du joueur. |
| render | `src/render/hud.js` | `renderMods` : palier en cours dans la signature et dans la puce de la carte. |
| render | `src/render/cardIcons.js` | Pictogramme `tresor` (coffre). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.tresor` : « Trésor de guerre » / « War chest », `desc` construit depuis les trois constantes ; libellé de la puce avec le bonus. |

## Critères d'acceptation

- Quand le joueur a Trésor de guerre et 50 pièces, alors ses balles font 10 % de dégâts en plus.
- Quand il a 500 pièces, alors le bonus reste à 40 %.
- Quand il dépense 20 pièces au Comptoir, alors le bonus baisse de 4 %.
- Les explosions, la tourelle et les éclats de Fragmentation ne profitent pas du bonus.

## Tests

`tests/modifiers.test.js` :
- « Trésor de guerre : +2 % de dégâts par tranche de 10 pièces »
- « Trésor de guerre : jamais plus de 40 % »
- « sans Trésor de guerre, la bourse ne change pas les dégâts »

## Risques et questions ouvertes

- Tension voulue avec le Comptoir et la boutique : un joueur qui a la carte risque de ne plus rien acheter. À
  observer : si c'est le cas, baisser le plafond ou le pas.
- Chemin chaud : `hoardMul` est appelé pour chaque ennemi touché ; calcul simple, aucune allocation.
