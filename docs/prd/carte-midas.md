# Carte Midas

## Objectif

La Légendaire évidente du butin : chaque pièce ramassée en vaut deux. Simple à lire, forte, elle double la bourse
et rend chaque visite au Comptoir plus riche.

Maquette : https://claude.ai/artifact/2Cxep6W35PtKnVL6HD15wt. Valeurs de départ, à régler en jeu.

## Socle technique

- Ramassage : `updateCoins` (`src/loop/update.js`) : +1 à `S.money`, ou à `S.coinPot` sous Tout ou rien pendant
  une vague (`potsKill`) ; son `coin`, chiffre flottant « +1 ».
- Pièces de fin de vague : `waveCoins` + `S.coinPot`, créditées dans le bloc de fin de vague.
- Légendaire : rareté `l`, poids `RAR.l.w` 9, promise par Marché du diable (`S.legendNext`).

## Comportement

- Légendaire, `max` 1. Chaque pièce ramassée crédite `MIDAS_VALUE` (2) au lieu de 1, dans la bourse ou la
  cagnotte de Tout ou rien selon le cas ; le chiffre flottant affiche « +2 ».
- Les pièces de fin de vague (`waveCoins`) et les gains du Contrat ne sont pas doublés : seules les pièces
  ramassées au sol.
- **Pièces perdues sous Cupidité** : elles valent 1, même avec Midas (sinon perdre 5 pièces en rapporterait 10).
  Elles portent une marque (`lost`) à la chute.

## Hors périmètre

- Doubler les pièces de fin de vague ou les prix.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'midas', rar: 'l', max: 1 }` ; `MIDAS_VALUE = 2`. |
| rules | `src/rules/scoring.js` | `coinWorth(mods, lost)` : valeur d'une pièce ramassée (1, ou `MIDAS_VALUE` sauf pièce perdue). |
| loop | `src/loop/update.js` | `updateCoins` : crédit de `coinWorth(S.mods, c.lost)` ; chiffre flottant « +n ». Pas de chaîne créée par pièce au-delà de l'existant (le « +1 » actuel est déjà une chaîne constante : prévoir les deux constantes). |
| render | `src/render/cardIcons.js` | Pictogramme `midas` (couronne). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.midas` : « Midas », `desc` construit depuis `MIDAS_VALUE`. |

## Critères d'acceptation

- Quand le joueur a Midas et ramasse une pièce, alors sa bourse gagne 2.
- Quand une vague se termine, alors les pièces de fin de vague ne sont pas doublées.
- Sous Tout ou rien, quand le joueur ramasse une pièce pendant la vague, alors la cagnotte gagne 2.
- Sous Cupidité, quand le joueur reprend une pièce perdue, alors elle vaut 1.

## Tests

`tests/scoring.test.js` :
- « Midas : une pièce ramassée en vaut deux »
- « Midas : une pièce perdue sous Cupidité ne vaut qu'une »
- « sans Midas, une pièce vaut une »

## Risques et questions ouvertes

- Économie : la bourse double à peu près. Avec Pillard et Avarice, la boutique peut devenir sans limite ;
  surveiller les prix croissants (relance, réassort), qui sont le frein principal.
- Promise par Marché du diable : un joueur peut viser Midas à coup sûr en prenant le pacte.
