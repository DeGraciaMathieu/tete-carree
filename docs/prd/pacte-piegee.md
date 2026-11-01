# Pacte Monnaie piégée

## Objectif

Les pièces deviennent des mines : celles que personne ne ramasse explosent à leur disparition et blessent la horde
autour, mais aussi le joueur s'il est trop près. Laisser le butin d'un Blindé au milieu de la horde la fait sauter ;
il faut choisir entre ramasser et s'éloigner.

Maquette : https://claude.ai/artifact/Tg5S1mC6N6puESgousYf5Y. Valeurs de départ, à régler en jeu.

## Socle technique

- Pièces au sol : `world.coins` (`{ x, y, z, vz, life, ph, lost }`), durée `coinLife(mods, buffs)`, retirées à
  `life <= 0` dans `updateCoins` (`src/loop/update.js`, chemin chaud, compactage en place), clignotement
  `coinBlink` dans `drawCoins` (`src/render/scene.js`).
- Explosions : `explosion(x, y, R, dmg, own)` (`src/game/combat.js`) blesse la horde, le joueur (portée
  `BLAST_SELF_RANGE`) et les constructions ; `shockwave` pour une onde sans dégâts aux constructions.
- Avarice et Poches profondes changent la durée au sol ; Pièces collantes (Comptoir) aussi.

## Comportement

- Pacte ordinaire, `max` 1.
- **Avantage** : une pièce qui disparaît sans avoir été ramassée explose : `PIEGEE_DAMAGE` (30) dégâts aux ennemis
  dans un rayon de `PIEGEE_RADIUS` (50 px, écrasé ×0,55 en hauteur comme les autres portées au sol). Une pièce
  écrasée par le plafond `COIN_MAX` (la plus ancienne retirée) n'explose pas.
- **Contrepartie** : l'explosion blesse aussi le joueur de `PIEGEE_SELF_DAMAGE` (10 PV) s'il est à moins de
  `PIEGEE_SELF_RANGE` (40 px) ; et les pièces ne restent que `PIEGEE_COIN_LIFE` (4 s) au sol.
- Avertissement : pendant sa dernière seconde, la pièce clignote en rouge au lieu de clignoter normalement.
- Petite explosion visuelle (étincelles orange) et son court (`sfx('pop')` ou équivalent, limité en fréquence comme
  `coin`) ; pas de tremblement d'écran, sauf si le joueur est touché.
- Les explosions ne blessent pas les constructions et n'en déclenchent pas d'autres (pas de baril en chaîne).
- Les pièces perdues sous Cupidité explosent aussi.
- **Exclusions** symétriques : Avarice et Poches profondes (durée au sol), Vœu de pauvreté. Sous le pacte, le Comptoir
  ne propose plus Pièces collantes.
- **Démo** : jamais proposé.
- **Rachat** : les pièces retrouvent leur durée et n'explosent plus ; celles déjà au sol non plus.

## Hors périmètre

- Explosion de pièces ramassées.

## Impact par couche

| Couche | Fichiers | Changement |
| --- | --- | --- |
| config | `src/config.js` | `{ id: 'piegee', rar: 'p', max: 1, excl: ['avarice', 'poches', 'pauvrete'], noDemo: true }` ; `PIEGEE_DAMAGE = 30`, `PIEGEE_RADIUS = 50`, `PIEGEE_SELF_DAMAGE = 10`, `PIEGEE_SELF_RANGE = 40`, `PIEGEE_COIN_LIFE = 4`. |
| rules | `src/rules/scoring.js` | `coinLife` : 4 s sous le pacte. |
| rules | `src/rules/counter.js` | `itemAllowed` : pas de Pièces collantes sous le pacte. |
| game | `src/game/combat.js` | `coinBlast(x, y)` : dégâts à la horde dans le rayon, au joueur à portée (`hurtPlayer(…, false, 'piegee')`), étincelles. |
| loop | `src/loop/update.js` | `updateCoins` : à `life <= 0` sous le pacte, `coinBlast` avant le retrait. Aucune allocation ajoutée. |
| render | `src/render/scene.js` | `drawCoins` : clignotement rouge la dernière seconde sous le pacte. |
| render | `src/render/cardIcons.js` | Pictogramme `piegee` (pièce à mèche). |
| documentation vivante | `src/i18n/fr.js`, `src/i18n/en.js` | `cards.piegee` : « Monnaie piégée » / « Booby-trapped coins », `plus` et `minus` construits depuis les constantes. |
| outil | `scripts/balance/report.js` | Cause de mort `piegee` : « Pièce piégée ». |

## Critères d'acceptation

- Quand le joueur a Monnaie piégée et qu'une pièce reste 4 s au sol, alors elle explose et blesse les ennemis à moins
  de 50 px.
- Quand le joueur est à moins de 40 px, alors il perd 10 PV.
- Quand il ramasse la pièce avant, alors rien n'explose.
- Pendant la dernière seconde, la pièce clignote en rouge.
- Quand il a Monnaie piégée, alors Avarice et Poches profondes ne sont jamais proposées, ni Pièces collantes au Comptoir.

## Tests

`tests/scoring.test.js` :
- « Monnaie piégée : une pièce ne reste que 4 s au sol »

`tests/counter.test.js` :
- « sous Monnaie piégée, Pièces collantes n'est pas proposée »

`tests/cards.test.js` :
- « Monnaie piégée n'est jamais proposée avec Avarice ni Poches profondes »

Vérifications manuelles : lisibilité de l'avertissement rouge au milieu de la horde ; `npm run perf` avec beaucoup de
pièces au sol (jusqu'à `COIN_MAX` explosions par vague en fin de partie).

## Risques et questions ouvertes

- **Rafales** : un Blindé lâche 5 pièces au même endroit ; non ramassées, elles explosent presque ensemble
  (150 dégâts sur la zone, 50 PV au joueur s'il y reste). À surveiller ; regrouper les explosions d'un même tas est une
  option.
- **Performances** : explosions dans `updateCoins` (chemin chaud) ; une boucle sur `world.enemies` par pièce qui
  explose, sans allocation.
