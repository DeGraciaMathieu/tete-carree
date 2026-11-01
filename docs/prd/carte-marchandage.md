# Carte Marchandage

## Objectif

Une carte rare qui rend les pièces plus précieuses sans en ramasser plus : tout ce qui se paie coûte moins cher,
sur l'écran des cartes comme au Comptoir. Elle récompense le joueur qui construit sa partie à coups de relances,
de bannissements et de caisses.

Maquette : https://claude.ai/artifact/2Cxep6W35PtKnVL6HD15wt. Valeurs de départ, à régler en jeu.

## Socle technique

- Boutique de l'écran des cartes (`src/game/flow.js`, `src/rules/shop.js`) : `rerollCost` (`REROLL_COST` 10,
  +`REROLL_STEP` 5), `EXTRA_CARD_COST` 25, `BAN_COST` 15, `BUYBACK_COST` 60 ; prix lus dans `renderShop`,
  `rerollPick`, `buyExtraCard`, `toggleBan`, `banCard`, `buybackPact`.
- Comptoir (`src/game/counter.js`, `src/rules/counter.js`) : `restockCost` (`RESTOCK_COST` 5, +`RESTOCK_STEP` 3),
  prix des articles `SHOP_ITEMS[].price`, lus dans `itemHtml`, `buyItem`, `restockShop`, `renderShop`.

## Comportement

- Rare, `max` 2. Chaque niveau retire `MARCHANDAGE_DISCOUNT` (15 %) à **tous** les prix en pièces : relance,
  carte en plus, bannissement, rachat d'un pacte, réassort, caisses du Comptoir.
- Arrondi au supérieur, jamais sous 1 pièce, et un article gratuit (Appât) reste gratuit.
- Exemples au niveau 1 : relance 10 → 9 (puis 15 → 13, 20 → 17), carte en plus 25 → 22, bannir 15 → 13, rachat
  60 → 51, réassort 5 → 5, Trousse complète 15 → 13. Au niveau 2 (−30 %) : relance 10 → 7, rachat 60 → 42.
- Le prix affiché sur chaque bouton et chaque caisse est le prix réduit ; c'est lui qui est débité et qui décide
  du grisé.
- La réduction s'applique dès la prise de la carte, y compris sur l'écran des cartes en cours (la carte se prend
  en sortant de l'écran : elle vaut donc au Comptoir qui suit immédiatement).

## Hors périmètre

- Les pièces gagnées (c'est Pillard, Midas).
- Une remise sur une seule boutique.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'marchandage', rar: 'r', max: 2 }` ; `MARCHANDAGE_DISCOUNT = .15`. |
| rules | `src/rules/shop.js` | `discounted(price, mods)` : `price ? max(1, ceil(price × (1 − 0,15 × niveau))) : 0`. |
| game | `src/game/flow.js`, `src/game/counter.js` | Chaque prix lu passe par `discounted(…, S.mods)` (relance, carte en plus, bannir, rachat, réassort, caisses). |
| render | `src/render/cardIcons.js` | Pictogramme `marchandage` (étiquette de prix). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.marchandage` : « Marchandage » / « Haggling », `desc(n)` construit depuis `MARCHANDAGE_DISCOUNT` et `REROLL_COST`. |

## Critères d'acceptation

- Quand le joueur a Marchandage niveau 1, alors la première relance coûte 9 pièces et le rachat d'un pacte 51.
- Quand le joueur a 9 pièces et Marchandage, alors le bouton Relancer n'est pas grisé.
- Quand le joueur a Marchandage, alors l'Appât reste gratuit et le réassort coûte au moins 1 pièce.
- Quand le joueur a le niveau 2, alors la relance coûte 7.

## Tests

`tests/shop.test.js` :
- « Marchandage : la relance coûte 9 au lieu de 10, le rachat 51 au lieu de 60 »
- « Marchandage niveau 2 : 30 % de moins »
- « Marchandage : un article gratuit reste gratuit, aucun prix ne tombe sous 1 »
- « sans Marchandage, les prix sont inchangés »

## Risques et questions ouvertes

- Effet faible sur les petits prix (le réassort à 5 ne bouge pas) : voulu, la carte paie sur les gros achats.
- Combinée à beaucoup de relances, elle rend les combinaisons visées plus faciles (Frénésie, Tourelle) : à
  surveiller avec le prix croissant de la relance.
