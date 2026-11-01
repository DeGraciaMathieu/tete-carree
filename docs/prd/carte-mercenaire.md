# Pacte Mercenaire

## Objectif

Le seul pacte qui oppose score et argent : chaque kill rapporte une pièce de plus, mais deux fois moins de points.
Les armes arrivent plus tard, le record est plus bas, mais la boutique et le Comptoir deviennent abordables à
chaque vague.

Maquette : https://claude.ai/artifact/2Cxep6W35PtKnVL6HD15wt. Valeurs de départ, à régler en jeu.

## Socle technique

- Points d'un kill : `killPoints(type, mods, multiplier)` (`src/rules/scoring.js`), multiplicateurs de pactes
  (Prime de risque, Chair à canon, Silence…) ; ajout par `addScore` (`src/game/score.js`), seul point d'entrée,
  qui déclenche les déblocages d'armes (`W[].unlock`).
- Bonus de fin de vague : `waveBonus(wave, mods)`, à part.
- Pièces : `rollCoins` et `dropCoins` dans `killEnemy` (`src/game/combat.js`), sauf démo, crevasse et vide.

## Comportement

- Pacte ordinaire, `max` 1.
- **Avantage** : chaque ennemi abattu lâche `MERCENAIRE_COINS` (1) pièce de plus, en plus de son tirage normal
  (un zombie lâche donc toujours au moins 1 pièce). Mêmes exceptions que le butin : rien au-dessus du vide, rien
  pour un ennemi tombé dans une crevasse, rien en démo.
- **Contrepartie** (décision) : les points des kills sont multipliés par `MERCENAIRE_POINTS_MUL` (×0,5, arrondi),
  après les autres pactes. Le bonus de fin de vague garde sa valeur.
- Conséquences, à dire sur la carte : les armes se débloquent plus tard et le record est plus bas.
- Racheté (60 pièces) : les points retrouvent leur valeur ; ceux déjà marqués restent acquis.

## Hors périmètre

- Changer les seuils de déblocage des armes.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'mercenaire', rar: 'p', max: 1 }` ; `MERCENAIRE_COINS = 1`, `MERCENAIRE_POINTS_MUL = .5`. |
| rules | `src/rules/scoring.js` | `killPoints` : × `MERCENAIRE_POINTS_MUL` sous le pacte (arrondi) ; `rollCoins` : +`MERCENAIRE_COINS` pour chaque ennemi, hors vide. |
| render | `src/render/cardIcons.js` | Pictogramme `mercenaire` (écusson). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.mercenaire` : « Mercenaire » / « Mercenary », `plus` et `minus` construits depuis les constantes ; le `minus` cite les armes et le record. |

## Critères d'acceptation

- Quand le joueur a Mercenaire et tue un zombie au multiplicateur ×1, alors il marque 25 points au lieu de 50 et
  au moins 1 pièce tombe.
- Quand une vague se termine, alors son bonus de points est inchangé.
- Quand un ennemi meurt au-dessus du vide ou tombe dans une crevasse, alors aucune pièce ne tombe.
- Quand le joueur rachète Mercenaire, alors les kills suivants rapportent de nouveau tous leurs points.

## Tests

`tests/scoring.test.js` :
- « Mercenaire : un zombie rapporte 25 points au lieu de 50 »
- « Mercenaire : chaque ennemi abattu lâche au moins une pièce »
- « Mercenaire : rien ne tombe au-dessus du vide »
- « Mercenaire : le bonus de fin de vague est inchangé »

## Risques et questions ouvertes

- Contrepartie lourde : les premières armes (Uzi à 1 000 points, fusil d'assaut à 2 000) arrivent nettement plus
  tard si le pacte sort tôt. Les pactes ordinaires peuvent sortir dès la première carte : à observer en jeu,
  éventuellement réserver Mercenaire aux vagues suivantes.
- Le record (`world.best`) baisse sous ce pacte : choix assumé, annoncé sur la carte.
- Avec Prime de risque (+points) et Mercenaire (−points), les multiplicateurs se compensent ; aucun cas
  particulier.
