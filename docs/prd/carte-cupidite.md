# Pacte Cupidité

## Objectif

Un pacte qui rend chaque coup encaissé coûteux : plus de pièces sur chaque ennemi, mais un coup fait tomber des
pièces de la bourse autour du joueur. On peut les reprendre, en prenant encore un risque. Le joueur prudent y
gagne, le joueur imprudent court après son argent.

Maquette : https://claude.ai/artifact/2Cxep6W35PtKnVL6HD15wt. Valeurs de départ, à régler en jeu.

## Socle technique

- Tirage : `rollCoins` (`src/rules/scoring.js`) ; `dropCoins(x, y, n)` (`src/game/combat.js`) éparpille `n`
  pièces de `COIN_SCATTER` px autour d'un point, jamais dans un mur, une construction ou le vide.
- Coups : `hurtPlayer(dmg, soft)` (`src/game/combat.js`) ; `soft` pour l'acide et la perte du Sablier. Le Gilet
  (Comptoir) absorbe le premier vrai coup avant tout le reste ; la roulade protège (`playerProtected`).
- Bourse : `S.money` ; sous Tout ou rien, la cagnotte `S.coinPot` est déjà vidée au premier coup.

## Comportement

- Pacte ordinaire, `max` 1.
- **Avantage** : un ennemi qui lâche des pièces en lâche `CUPIDITE_BONUS` (1) de plus.
- **Contrepartie** : chaque vrai coup encaissé (pas l'acide ni le Sablier, `soft`) fait tomber
  `CUPIDITE_LOSS` (5) pièces **de la bourse** (décision, Tout ou rien compris), ou toutes si elle en a moins.
  Elles s'éparpillent autour du joueur comme des pièces d'ennemi, avec la durée au sol normale (`coinLife`).
- Un coup absorbé (roulade, Gilet, invulnérabilité de Second souffle) ne fait rien tomber.
- Ces pièces perdues portent une marque `lost` : elles valent 1 même sous Midas ; elles comptent pour Collecte et
  Sang d'or (reprendre son argent est déjà une prise de risque).
- Rien en démo (pas de pièces).
- Chiffre flottant « −5 » rouge au-dessus du joueur, en plus du son de pièce existant.

## Hors périmètre

- Pièces de fin de vague.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'cupidite', rar: 'p', max: 1 }` ; `CUPIDITE_BONUS = 1`, `CUPIDITE_LOSS = 5`. |
| rules | `src/rules/scoring.js` | `rollCoins` : +`CUPIDITE_BONUS` quand l'ennemi en lâche ; `coinsLostOnHit(mods, money)` : `min(money, CUPIDITE_LOSS)` sous le pacte, 0 sinon. |
| game | `src/game/combat.js` | `hurtPlayer` (vrai coup, après Gilet et protections) : retire `coinsLostOnHit` de `S.money` et appelle `dropCoins(player.x, player.y, n, true)` ; `dropCoins` reçoit `lost`. |
| loop | `src/loop/update.js` | `updateCoins` lit `c.lost` pour la valeur (voir Midas). |
| render | `src/render/cardIcons.js` | Pictogramme `cupidite` (pièce qui éclate). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.cupidite` : « Cupidité » / « Avidity », `plus` et `minus` construits depuis les constantes ; chiffre flottant de perte. |

## Critères d'acceptation

- Quand le joueur a Cupidité et tue un zombie qui lâche une pièce, alors 2 pièces tombent.
- Quand il encaisse un coup avec 12 pièces en bourse, alors la bourse passe à 7 et 5 pièces tombent autour de lui.
- Quand il encaisse un coup avec 3 pièces, alors la bourse passe à 0 et 3 pièces tombent.
- Quand il marche dans l'acide, alors aucune pièce ne tombe.
- Quand le Gilet absorbe le coup, alors aucune pièce ne tombe.
- Sous Midas, quand il reprend une pièce perdue, alors elle vaut 1.

## Tests

`tests/scoring.test.js` :
- « Cupidité : un ennemi qui lâche des pièces en lâche une de plus »
- « Cupidité : un coup fait perdre 5 pièces, ou toutes s'il en reste moins »
- « sans Cupidité, un coup ne fait perdre aucune pièce »

Vérification manuelle : lisibilité des pièces perdues autour du joueur au milieu de la horde.

## Risques et questions ouvertes

- Sous Tout ou rien, les pièces perdues reprises pendant la vague vont dans la cagnotte (`potsKill`), déjà vidée
  par le coup : elles ne sont sauvées qu'à la fin de la vague sans nouveau coup. Cohérent avec le pacte majeur,
  à vérifier en jeu.
- Contrat (Comptoir) : un coup annule déjà le Contrat ; la perte s'y ajoute. Voulu.
