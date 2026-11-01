# Carte Collecte

## Objectif

Une carte rare qui relie les pièces au combo : chaque pièce ramassée prolonge le combo. Aller chercher les
pièces au milieu de la horde paie deux fois, en pièces et en multiplicateur. C'est la carte qui change le plus la
façon de jouer parmi celles du butin.

Maquette : https://claude.ai/artifact/2Cxep6W35PtKnVL6HD15wt. Valeurs de départ, à régler en jeu.

## Socle technique

- Combo : `S.combo`, `S.comboT` remis à `comboTime()` à chaque kill (`killEnemy`), décompté dans `update`,
  combo cassé à 0. `comboTime(mods, buffs)` (`src/rules/modifiers.js`) : `COMBO_T` (2,6 s), Combo tenace
  (`TENACE_BONUS`), Fièvre (× `FIEVRE_COMBO_MUL`), Mèche longue et Sang-froid (Comptoir).
- Ramassage des pièces : `updateCoins` (`src/loop/update.js`), sous `PICKUP_RADIUS`, Aimant compris.
- Jauge de combo : `#comboFill` dans `updateHud` (`S.comboT / comboTime()`).

## Comportement

- Rare, `max` 2. Chaque pièce ramassée ajoute `COLLECTE_TIME × niveau` (0,3 s, puis 0,6 s) au temps de combo
  restant, **sans dépasser** `comboTime()` (la jauge ne déborde pas).
- Seulement si un combo est en cours (`S.combo > 0`) : une pièce ne relance pas un combo retombé.
- Vaut pour toutes les pièces ramassées, Aimant compris, et pour les pièces perdues sous Cupidité.
- Un Blindé (5 pièces) ramassé d'un coup rend 1,5 s de combo au niveau 1.
- Avec Fièvre (fenêtre de 1,3 s), chaque pièce compte proportionnellement plus : voulu.

## Hors périmètre

- Kills supplémentaires au compteur du combo : seul le temps est prolongé, le multiplicateur ne monte que par
  les kills.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'collecte', rar: 'r', max: 2 }` ; `COLLECTE_TIME = .3`. |
| rules | `src/rules/modifiers.js` | `comboAfterCoin(mods, combo, comboT, max)` : temps de combo après une pièce ramassée (inchangé sans la carte ou sans combo). |
| loop | `src/loop/update.js` | `updateCoins` : à chaque prise, `S.comboT = comboAfterCoin(S.mods, S.combo, S.comboT, comboTime())`. |
| render | `src/render/cardIcons.js` | Pictogramme `collecte` (pièce et éclair). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.collecte` : « Collecte » / « Collector », `desc(n)` construit depuis `COLLECTE_TIME`. |

## Critères d'acceptation

- Quand un combo est en cours et que le joueur ramasse une pièce avec Collecte, alors le temps de combo restant
  augmente de 0,3 s.
- Quand le temps restant est presque plein, alors il ne dépasse pas la fenêtre de combo.
- Quand aucun combo n'est en cours, alors ramasser une pièce ne change rien au combo.

## Tests

`tests/modifiers.test.js` :
- « Collecte : une pièce ramassée prolonge le combo de 0,3 s »
- « Collecte : le combo ne dépasse jamais sa fenêtre »
- « Collecte : une pièce ne relance pas un combo retombé »
- « sans Collecte, ramasser une pièce ne touche pas au combo »

Vérification manuelle : sensation en jeu, en particulier avec Aimant (les pièces arrivent seules et prolongent
le combo sans prise de risque).

## Risques et questions ouvertes

- **Aimant** : avec Aimant niveau 2 (10 cases), les pièces viennent seules et Collecte perd sa prise de risque.
  À surveiller ; limiter l'effet aux pièces ramassées sans Aimant serait illisible pour le joueur.
- Pas d'allocation dans `updateCoins` (chemin chaud) : l'appel ne fait qu'un calcul.
